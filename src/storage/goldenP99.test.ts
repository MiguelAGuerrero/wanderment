/**
 * P-99: data written by the build BEFORE In any order (`fixtures/golden/p99-*`, see the README there) — an In any order
 * block in the shape P-99 writes (an unnamed sequence "In any order" with `any: true`), imported there, with a part added
 * by that build's Plan; a run inside its part "Gesture practice", "Master copy" finished with {copies}; a second run
 * that build stepped into from the block's row (its record of parts kept as stored). The real persistence module,
 * against real SQLite, must load it exactly from every place it can be and write nothing by loading it; P-99 reads it
 * as In any order. `p99-old-build.json` is what that build SHOWED: the block read as a step broken down — no migration.
 *
 * Expected values are the frozen files, the roadmap's Done when and the owner's notes, never this code's output.
 */
import { copyFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Settings } from '@/domain/migrate';
import type { Data } from '@/domain/types';

const env = vi.hoisted(() => {
  const ls = new Map<string, string>();
  const state = { dbPath: '', openError: undefined as Error | undefined, hangWrites: false };
  const localStorage = {
    get length() {
      return ls.size;
    },
    key: (i: number) => [...ls.keys()][i] ?? null,
    getItem: (k: string) => (ls.has(k) ? ls.get(k)! : null),
    setItem: (k: string, v: string) => void ls.set(k, String(v)),
    removeItem: (k: string) => void ls.delete(k),
  };
  (globalThis as { localStorage?: unknown }).localStorage = localStorage;
  return { ls, state, localStorage };
});

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => env.localStorage.getItem(k),
    setItem: async (k: string, v: string) => env.localStorage.setItem(k, v),
    removeItem: async (k: string) => env.localStorage.removeItem(k),
  },
}));
vi.mock('./expoDb', async () => {
  const { nodeDb } = await import('./nodeDb');
  return {
    openExpoDb: async () => {
      if (env.state.openError) throw env.state.openError;
      const db = nodeDb(env.state.dbPath);
      // "The tab dies mid-write": transactions opened while hangWrites is on never commit.
      return { ...db, transaction: (task: () => Promise<void>) => (env.state.hangWrites ? new Promise<void>(() => {}) : db.transaction(task)) };
    },
  };
});
vi.mock('./nativeBackup', () => ({ scheduleBackup: () => {} }));

const GOLDEN = join(__dirname, 'fixtures/golden');
const fixture = (name: string) => readFileSync(join(GOLDEN, name), 'utf8');
type Snapshot = { data: Data; settings: { [K in keyof Required<Settings>]: unknown } };
/** What the build before P-99 held. */

const BEFORE = JSON.parse(fixture('p99-expected.json')) as Snapshot;

const settle = () => new Promise((r) => setTimeout(r, 30));
const json = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/** A fresh page load: new modules, new store, same storage. */
async function load() {
  vi.resetModules();
  const { startPersistence } = await import('./persistence');
  const { useStore } = await import('@/store/useStore');
  await startPersistence();
  return useStore;
}
type Store = Awaited<ReturnType<typeof load>>;

const shown = (store: Store): Snapshot => {
  const s = store.getState();
  return json({ data: s.data, settings: { showShading: s.showShading, recentSearches: s.recentSearches, leftAsIs: s.leftAsIs, whyOfferOff: s.whyOfferOff, firstRunDone: s.firstRunDone } });
};

/** What's saved, read straight from the database file (as another page would). */
async function onDisk(): Promise<Data> {
  const { nodeDb } = await import('./nodeDb');
  const { loadData } = await import('./repository');
  const db = nodeDb(env.state.dbPath);
  try {
    return json(await loadData(db));
  } finally {
    db.close();
  }
}
const useDatabase = () => copyFileSync(join(GOLDEN, 'p99-schema4.sqlite'), env.state.dbPath);

beforeEach(() => {
  env.ls.clear();
  env.state.openError = undefined;
  env.state.hangWrites = false;
  env.state.dbPath = join(mkdtempSync(join(tmpdir(), 'wanderment-p99-')), 'db.sqlite');
});
afterEach(async () => (await import('./persistence')).stopPersistence());



describe('data written by the build before P-99 loads exactly, wherever it is', () => {
  it('the database: opens and every record reads the same; nothing is rewritten by opening it', async () => {
    useDatabase();
    const before = readFileSync(env.state.dbPath);
    const store = await load();
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'sqlite' });
    expect(shown(store)).toEqual(BEFORE);
    await settle();
    expect(await onDisk()).toEqual(BEFORE.data);
    expect(readFileSync(env.state.dbPath).equals(before)).toBe(true);
  });

  it('the pending journal, over an empty database: replayed, cleared, and everything reads the same', async () => {
    env.ls.set('wanderment:journal', fixture('p99-journal.json'));
    let store = await load();
    expect(shown(store).data).toEqual(BEFORE.data);
    expect(env.ls.has('wanderment:journal')).toBe(false);
    expect(await onDisk()).toEqual(BEFORE.data);
    store = await load();
    expect(shown(store).data).toEqual(BEFORE.data);
  });

  it('the fallback blob: where SQLite can’t run it loads the same; once it can, it is moved in whole', async () => {
    env.state.openError = new Error('no OPFS');
    env.ls.set('wanderment', fixture('p99-fallback.json'));
    let store = await load();
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'local' });
    expect(shown(store).data).toEqual(BEFORE.data);
    (await import('./persistence')).stopPersistence();
    env.state.openError = undefined;
    store = await load();
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'sqlite' });
    expect(shown(store).data).toEqual(BEFORE.data);
    expect(await onDisk()).toEqual(BEFORE.data);
  });

  it('the backup: previewed, replaced, saved, the same after a reload; and exporting gives the same data back', async () => {
    let store = await load();
    const { previewImport, confirmImport } = await import('@/store/importBackup');
    const preview = previewImport(fixture('p99-backup.json'));
    expect(preview.incoming).toEqual(BEFORE.data);
    expect(confirmImport(preview).ok).toBe(true);
    await settle();
    expect(await onDisk()).toEqual(BEFORE.data);
    store = await load();
    expect(shown(store).data).toEqual(BEFORE.data);
    const { toBackup } = await import('@/domain/backup');
    expect(JSON.parse(toBackup(store.getState().data)).data).toEqual(BEFORE.data);
  });
});


type OldView = { rows: { depth: number; kind: string; words: string; broken: boolean; here: boolean; gives: string | null; hoisted: string[] }[]; runner?: { level: string; parent: string | null; step: string; words: string; moves: unknown; next: string }; tile?: { line: string; path: string[] } };
const OLD = JSON.parse(fixture('p99-old-build.json')) as Record<string, OldView>;
const HANDS = 'p99-001';
const RUN = 'p99-006';
const RUN2 = 'p99-007';

describe('the frozen data itself holds what P-99 must read', () => {
  it('the block in P-99’s shape (with the part that build’s Plan added), a run inside a part with a record of parts, a run that build stepped into', () => {
    const { routines, runs } = BEFORE.data;
    expect(routines['p99-any']).toMatchObject({ words: 'In any order', named: false, any: true, items: [{ id: 'p99-gesture' }, { id: 'p99-study' }, { id: 'p99-copy', out: 'copies' }, { text: 'Gesture from memory' }] });
    expect((routines[HANDS].items as unknown[])[1]).toEqual({ id: 'p99-any-row', ref: 'p99-any' });
    expect(runs[RUN]).toMatchObject({ frames: [{ at: 'p99-any-row', parts: { row: 'p99-any-row' } }, { seq: 'p99-any', at: 'p99-gesture' }, { seq: 'p99-gesture-seq', at: 'p99-feet' }] });
    expect(runs[RUN2]).toMatchObject({ frames: [{ at: 'p99-any2-row', parts: { row: 'p99-any2-row' } }, { seq: 'p99-any2', at: 'p99-thumb' }] });
  });

  it('what that build showed: the block as a step broken down ("In any order", Step in), its parts as smaller steps run one after another', () => {
    expect(OLD.plan.rows[1]).toMatchObject({ kind: 'routine', words: 'In any order', broken: true, hoisted: ['copies'] });
    expect(OLD.plan.rows.slice(2).map((r) => [r.depth, r.words])).toEqual([
      [1, 'Gesture practice'],
      [2, 'Draw 10 hands, 30 s each'],
      [2, 'Draw 10 feet, 30 s each'],
      [1, 'Study: hand anatomy, chapter 3'],
      [1, 'Master copy'],
      [0, 'Compare {copies} with this week’s gestures and pick one thing to work on'],
    ]);
    expect(OLD.inGesture.runner).toMatchObject({ level: 'Gesture practice', parent: 'In any order', words: 'Draw 10 feet, 30 s each', next: 'next' });
    expect(OLD.inGesture.tile).toEqual({ line: 'at Draw 10 feet, 30 s each', path: ['Get better at hands', 'In any order', 'Gesture practice'] });
    expect(OLD.choosing.runner).toMatchObject({ step: 'routine', words: 'In any order', moves: { stepIn: true }, next: 'next' });
    expect(OLD.choosing.tile!.line).toBe('at In any order');
    expect(OLD.steppedIn.runner).toMatchObject({ level: 'In any order', words: 'Thumbnail', moves: { stepIn: false, stepOut: { name: 'In any order' } } });
  });
});

describe('the build with In any order reads that data', () => {
  const lines = async (data: Data, runId: string) => {
    const { partsTree } = await import('@/domain/runView');
    return partsTree(data, runId).map((g) => g.parts.map((p) => [p.words, p.state, p.step?.map((x) => ('text' in x ? x.text : '')).join('') ?? null]));
  };

  it('Plan: the block is In any order — it opens as a view of its own, its parts as its rows', async () => {
    const { planView } = await import('@/domain/runView');
    const v = planView(json(BEFORE.data), { routineId: HANDS })!;
    expect(v.rows[1]).toMatchObject({ kind: 'routine', words: 'In any order', broken: true, any: true });
  });

  it('the run inside Gesture practice: the tree view lists every part with where it stands; the tile reads the part', async () => {
    const data = json(BEFORE.data);
    expect(await lines(data, RUN)).toEqual([
      [
        ['Gesture practice', 'here', 'Draw 10 feet, 30 s each'],
        ['Study: hand anatomy, chapter 3', 'new', null],
        ['Master copy', 'finished', null],
        ['Gesture from memory', 'new', null],
      ],
    ]);
    const { homeShown } = await import('@/domain/runView');
    const { tileLine } = await import('@/domain/goText');
    expect(tileLine(homeShown(data).find((t) => t.runId === RUN)!).line).toBe('Gesture practice · at Draw 10 feet, 30 s each');
  });

  it('the run that build stepped into: inside Thumbnail (its stale place set aside), Pick a palette still stopped', async () => {
    expect(await lines(json(BEFORE.data), RUN2)).toEqual([
      [
        ['Thumbnail', 'here', 'Thumbnail'],
        ['Pick a palette', 'stopped', null],
      ],
    ]);
  });

  it('through the store, against the frozen database: Gesture returns, the step after waits; Study and the added part return; it reads the joined {copies}', async () => {
    useDatabase();
    const store = await load();
    const s = () => store.getState();
    const { runnerView } = await import('@/domain/runView');
    expect(s().pauseRun('p96-050').ok).toBe(true);
    expect(s().resumeRun(RUN).ok).toBe(true);
    expect(s().nextStep(RUN).ok).toBe(true);
    expect(runnerView(s().data, RUN)!.choose!.take).toMatchObject({ words: 'Study: hand anatomy, chapter 3', resume: false });
    expect(s().nextStep(RUN).ok).toBe(false);
    expect(s().stepIn(RUN).ok).toBe(true);
    expect(s().nextStep(RUN).ok).toBe(true);
    expect(s().stepIn(RUN).ok).toBe(true);
    expect(runnerView(s().data, RUN)!.step.words).toBe('Gesture from memory');
    expect(s().nextStep(RUN).ok).toBe(true);
    expect(runnerView(s().data, RUN)!.step.parts.map((p) => ('text' in p ? p.text : '')).join('')).toBe('Compare two Dürer hands with this week’s gestures and pick one thing to work on');
    await settle();
    const disk = await onDisk();
    expect(disk.routines).toEqual(BEFORE.data.routines);
    expect(disk.runs[RUN].frames).toEqual([{ seq: HANDS, at: (BEFORE.data.routines[HANDS].items as { id: string }[])[2].id, round: 1 }]);
  });
});
