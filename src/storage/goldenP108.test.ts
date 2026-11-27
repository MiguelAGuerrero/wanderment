/**
 * P-108: data written by the build BEFORE kept lists (`fixtures/golden/p108-*`, see the README there) — the shapes P-108
 * writes, brought in by that build's Import: a for each whose list is kept in the routine (`each.kept`, with a routine
 * among its items), one with its own list (`each.own`), routine rows whose routine is a value (`slot`), values that are
 * routines (`refs`), a for each level that keeps the list it last saw (`eachSeen`) — then used there: a step added
 * inside the kept block by its Plan (the fields it did not know kept), both blocks passed straight through, the rows
 * read as the step "{way}" (the value as words), two runs left paused. The real persistence module, against real
 * SQLite, must load it exactly from every place it can be and write nothing by loading it; P-108 reads all of it.
 * `p108-old-build.json` is what that build SHOWED.
 *
 * Expected values are the frozen files, the roadmap's Done when and B-16, never this code's output.
 *
 * (P-107's header, for the harness below:)
 * P-107: data written by the build BEFORE for each (`fixtures/golden/p107-*`, see the README there) — a for each
 * block in the shape P-107 writes, brought in by that build's Import, then run there as a step broken down (Step
 * in; `{photo}` asked), a step added inside it by that build's Plan (the `each` it did not know kept), a run left
 * paused inside it, and a list of three given by a later import — and everything older. The real persistence
 * module, against real SQLite, must load it exactly from every place it can be and write nothing by loading it;
 * P-107 reads the block as a for each and the run as on its first item. `p107-old-build.json` is what that build
 * SHOWED: the proof that an older build reads the block as a breakdown.
 *
 * Expected values are the frozen files, the roadmap's Done when and B-15/B-16, never this code's output.
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
/** What the build before P-108 held. */

const BEFORE = JSON.parse(fixture('p108-expected.json')) as Snapshot;

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
const useDatabase = () => copyFileSync(join(GOLDEN, 'p108-schema4.sqlite'), env.state.dbPath);

beforeEach(() => {
  env.ls.clear();
  env.state.openError = undefined;
  env.state.hangWrites = false;
  env.state.dbPath = join(mkdtempSync(join(tmpdir(), 'wanderment-p108-')), 'db.sqlite');
});
afterEach(async () => (await import('./persistence')).stopPersistence());



const OLD = JSON.parse(fixture('p108-old-build.json')) as Record<string, { rows: { depth: number; kind: string; words: string; broken: boolean; here: boolean }[]; runner?: Record<string, unknown> }>;
const GUIDE = 'p108-001';
const BETTER = 'p108-004';
const RUN = 'p108-012';
const RUN2 = 'p108-013';

describe('the frozen data itself holds what P-108 must read', () => {
  it('a kept list (a routine among its items), a list of its own, routine rows by a name, values that are routines, a level that kept its list', () => {
    const { routines, runs, threads, activities } = BEFORE.data;
    expect([Object.keys(threads).length, Object.keys(activities).length]).toEqual([3, 5]);
    expect(routines['p108-kept'].each).toEqual({ item: 'subject', list: 'subjects', kept: ['arms', 'legs', 'Draw with guidelines: eyes, slower'], refs: [null, null, { ref: GUIDE, name: 'Draw with guidelines' }] });
    // (That build's Plan added a step inside it and kept the header it did not know.)
    expect((routines['p108-kept'].items as { text: string }[]).map((i) => i.text)).toEqual(['Deliberate practice on {subject}', 'Note what improved in {subject}']);
    expect(routines['p108-own'].each).toEqual({ item: 'topic', list: 'topics', own: true });
    expect((routines[BETTER].items as Record<string, unknown>[])[4]).toEqual({ id: 'p108-slot', text: '{way}', slot: true });
    const run = runs[RUN] as unknown as { frames: { at: string }[]; values: Record<string, unknown>[] };
    expect(run.frames.map((f) => f.at)).toEqual(['p108-slot']);
    expect(run.values).toEqual([expect.objectContaining({ name: 'way', items: ['Draw with guidelines'], refs: [{ ref: GUIDE, name: 'Draw with guidelines' }] })]);
    const run2 = runs[RUN2] as unknown as { frames: Record<string, unknown>[]; values: Record<string, unknown>[] };
    expect(run2.frames[1]).toMatchObject({ seq: 'p108-ways', at: 'p108-ways-note', each: 0, eachSeen: ['Draw with guidelines: proportions held, slower', 'Freehand'] });
    expect(runs['p96-050'].status).toBe('running');
  });

  it('what that build showed: both blocks steps broken down and passed straight through; the routine row a step reading {way}, the routine as words, no Step in', () => {
    expect(OLD.planBetter.rows.map((r) => [r.depth, r.kind, r.words])).toEqual([
      [0, 'step', 'Warm up'],
      [0, 'routine', 'For each subject in {subjects}'],
      [1, 'step', 'Deliberate practice on {subject}'],
      [0, 'routine', 'For each topic in {topics}'],
      [1, 'step', 'Find a guide on {topic}'],
      [0, 'step', 'Choose a way to draw'],
      [0, 'step', '{way}'],
      [0, 'step', 'Tell Sam about {way}'],
    ]);
    expect(OLD.afterBlocks.runner).toMatchObject({ words: 'Choose a way to draw' });
    expect(OLD.onSlot.runner).toMatchObject({ step: 'step', words: '{way}', parts: [{ kind: 'value', name: 'way', text: 'Draw with guidelines' }], moves: { stepIn: false } });
    expect(OLD.waysSlot.runner).toMatchObject({ level: 'For each way', step: 'step', parts: [{ kind: 'value', name: 'way', text: 'Draw with guidelines: proportions held, slower' }], moves: { stepIn: false } });
  });
});

describe('data written by the build before P-108 loads exactly, wherever it is', () => {
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
    env.ls.set('wanderment:journal', fixture('p108-journal.json'));
    let store = await load();
    expect(shown(store).data).toEqual(BEFORE.data);
    expect(env.ls.has('wanderment:journal')).toBe(false);
    expect(await onDisk()).toEqual(BEFORE.data);
    store = await load();
    expect(shown(store).data).toEqual(BEFORE.data);
  });

  it('the fallback blob: where SQLite can’t run it loads the same; once it can, it is moved in whole', async () => {
    env.state.openError = new Error('no OPFS');
    env.ls.set('wanderment', fixture('p108-fallback.json'));
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
    const preview = previewImport(fixture('p108-backup.json'));
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

describe('the build with kept lists reads that data', () => {
  it('Plan: the kept list as rows under its block (the routine drawn with its mark), the list of its own, ▤ {way}', async () => {
    const { planView } = await import('@/domain/runView');
    const rows = planView(json(BEFORE.data), { routineId: BETTER })!.rows;
    expect(rows[1].each).toEqual({ item: 'subject', list: 'subjects', own: true, kept: [{ text: 'arms' }, { text: 'legs' }, { text: 'Draw with guidelines: eyes, slower', routine: GUIDE }] });
    expect(rows.find((r) => r.each?.list === 'topics')!.each).toEqual({ item: 'topic', list: 'topics', own: true });
    expect(rows.find((r) => r.itemId === 'p108-slot')).toMatchObject({ slot: 'way', asks: [] });
  });

  it('the run left on ▤ {way} shows the routine it holds, with Step in; the value drawn with the routine mark', async () => {
    const { runnerView } = await import('@/domain/runView');
    const v = runnerView(json(BEFORE.data), RUN)!;
    expect(v.step).toMatchObject({ kind: 'routine', words: 'Draw with guidelines' });
    expect(v.moves.stepIn).toBe(true);
    expect(v.values).toEqual([expect.objectContaining({ name: 'way', shown: [{ text: 'Draw with guidelines', routine: GUIDE }] })]);
  });

  it('the run left inside the for each over a list of routines: on its first item (the routine with its words), Next goes on to "Freehand", as words', async () => {
    const { runnerView } = await import('@/domain/runView');
    const { runVerb } = await import('@/domain/run');
    const data = json(BEFORE.data);
    expect(runnerView(data, RUN2)!.values.find((x) => x.name === 'way')).toMatchObject({ text: 'Draw with guidelines: proportions held, slower', shown: [{ text: 'Draw with guidelines: proportions held, slower', routine: GUIDE }] });
    const r = runVerb(data, { kind: 'next', runId: RUN2 }, { now: '2026-11-28T01:00:00.000Z', id: () => 'n1' });
    expect(r.ok).toBe(true);
    expect(runnerView(r.data, RUN2)!.step).toMatchObject({ kind: 'step', words: '{way}', parts: [{ kind: 'value', name: 'way', text: 'Freehand' }] });
  });

  it('through the store, against the frozen database: Step in to the routine held and out again — only that run changes, never a routine', async () => {
    useDatabase();
    const store = await load();
    const s = () => store.getState();
    expect(s().pauseRun('p96-050').ok).toBe(true);
    expect(s().resumeRun(RUN).ok).toBe(true);
    expect(s().stepIn(RUN).ok).toBe(true);
    const { runnerView } = await import('@/domain/runView');
    expect(runnerView(s().data, RUN)!.level).toBe('Draw with guidelines');
    expect(s().doneLevel(RUN).ok).toBe(true);
    await settle();
    expect(runnerView(s().data, RUN)!.step.words).toBe('Tell Sam about {way}');
    const disk = await onDisk();
    expect(disk.routines).toEqual(BEFORE.data.routines);
    const others = (d: Data) => ({ ...d, runs: Object.fromEntries(Object.entries(d.runs).filter(([id]) => id !== RUN && id !== 'p96-050')) });
    expect(others(disk)).toEqual(others(BEFORE.data));
  });
});
