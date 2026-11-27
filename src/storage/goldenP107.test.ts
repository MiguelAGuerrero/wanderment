/**
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
/** What the build before P-107 held. */

const BEFORE = JSON.parse(fixture('p107-expected.json')) as Snapshot;

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
const useDatabase = () => copyFileSync(join(GOLDEN, 'p107-schema4.sqlite'), env.state.dbPath);

beforeEach(() => {
  env.ls.clear();
  env.state.openError = undefined;
  env.state.hangWrites = false;
  env.state.dbPath = join(mkdtempSync(join(tmpdir(), 'wanderment-p107-')), 'db.sqlite');
});
afterEach(async () => (await import('./persistence')).stopPersistence());



const OLD = JSON.parse(fixture('p107-old-build.json')) as Record<string, { rows: { depth: number; kind: string; words: string; broken: boolean }[]; runner?: Record<string, unknown> }>;
const RUN = 'p107-008';
const DRAWING = 'p107-004';

describe('the frozen data itself holds what P-107 must read', () => {
  it('a block row to an unnamed sequence with `each`, kept by that build when it added a step inside; a run paused inside it with no item on its level; a list of three', () => {
    const { routines, runs, threads, activities } = BEFORE.data;
    expect([Object.keys(threads).length, Object.keys(activities).length]).toEqual([3, 5]);
    expect(routines['p107-each']).toMatchObject({ named: false, words: 'For each photo in {photos}', each: { item: 'photo', list: 'photos' } });
    expect((routines['p107-each'].items as { text?: string; ref?: string }[]).map((i) => i.text ?? i.ref)).toEqual(['p107-001', 'Note what to fix in {photo}', 'Put {photo} away']);
    expect((routines[DRAWING].items as { id: string }[])[1]).toEqual({ id: 'p107-each-row', ref: 'p107-each' });
    const run = runs[RUN] as unknown as { frames: Record<string, unknown>[]; values: { name: string; items: string[] }[]; status?: string };
    expect(run.frames.map((f) => f.seq)).toEqual([DRAWING, 'p107-each', 'p107-001']);
    for (const f of run.frames) expect('each' in f).toBe(false);
    expect(run.values).toEqual([expect.objectContaining({ name: 'photos', items: ['the dancer', 'the boxer', 'the cellist'] })]);
    expect(runs['p96-050'].status).toBe('running');
  });

  it('what that build showed: the block as a step broken down — a routine row, Step in, its item asked inside', () => {
    expect(OLD.plan.rows[1]).toMatchObject({ depth: 0, kind: 'routine', words: 'For each photo in {photos}', broken: true });
    expect(OLD.onRow.runner).toMatchObject({ step: 'routine', words: 'For each photo in {photos}', moves: { stepIn: true }, next: 'next' });
    expect(OLD.inBlock.runner).toMatchObject({ level: 'For each photo in {photos}', step: 'routine', words: 'Sketch' });
    expect(OLD.inSketch.runner).toMatchObject({ level: 'Sketch', fields: [{ name: 'photo', text: '', gives: false }] });
  });
});

describe('data written by the build before P-107 loads exactly, wherever it is', () => {
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
    env.ls.set('wanderment:journal', fixture('p107-journal.json'));
    let store = await load();
    expect(shown(store).data).toEqual(BEFORE.data);
    expect(env.ls.has('wanderment:journal')).toBe(false);
    expect(await onDisk()).toEqual(BEFORE.data);
    store = await load();
    expect(shown(store).data).toEqual(BEFORE.data);
  });

  it('the fallback blob: where SQLite can’t run it loads the same; once it can, it is moved in whole', async () => {
    env.state.openError = new Error('no OPFS');
    env.ls.set('wanderment', fixture('p107-fallback.json'));
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
    const preview = previewImport(fixture('p107-backup.json'));
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

describe('the build with for each reads that data: the block is a for each, the run on its first item', () => {
  it('Plan: "For each photo in {photos}", its steps reading {photo} (asked nowhere), and the routine asks nothing it gives', async () => {
    const { planView } = await import('@/domain/runView');
    const { callIO } = await import('@/domain/run');
    const data = json(BEFORE.data);
    const rows = planView(data, { routineId: DRAWING })!.rows;
    expect(rows[1]).toMatchObject({ kind: 'routine', broken: true, words: 'For each photo in {photos}', each: { item: 'photo', list: 'photos' }, asks: [] });
    expect(rows.filter((r) => r.reads.includes('photo')).map((r) => [r.words, r.asks])).toEqual([['Draw {photo}, big shapes first', []], ['Note what to fix in {photo}', []], ['Put {photo} away', []]]);
    expect(callIO(data, DRAWING)).toEqual({ asks: [], gives: ['photos', 'drawing'] });
  });

  it('the run that build left inside Sketch inside the block reads the first photo, "photo 1 of 3: the dancer"', async () => {
    const { runnerView } = await import('@/domain/runView');
    const data = json(BEFORE.data);
    const v = runnerView(data, RUN)!;
    expect(v.step.parts.map((p) => ('text' in p ? p.text : `{${p.name}}`)).join('')).toBe('Draw the dancer, big shapes first');
    expect(v.values.map((x) => [x.name, x.text, x.each])).toEqual([
      ['photos', 'the dancer, the boxer and the cellist', undefined],
      ['photo', 'the dancer', { n: 1, of: 3 }],
    ]);
  });

  it('through the store, against the frozen database: run on — the dancer’s drawing given, round two is the boxer — and only that run changes', async () => {
    useDatabase();
    const store = await load();
    const s = () => store.getState();
    expect(s().pauseRun('p96-050').ok).toBe(true);
    expect(s().resumeRun(RUN).ok).toBe(true);
    expect(s().nextStep(RUN).ok).toBe(true);
    expect(s().typeValue(RUN, 'p107-003', 'drawing', 'dancer sketch').ok).toBe(true);
    // Out of Sketch (it hands {drawing} back), the block's other steps, then round two.
    expect(s().nextStep(RUN).ok).toBe(true);
    expect(s().nextStep(RUN).ok).toBe(true);
    expect(s().nextStep(RUN).ok).toBe(true);
    await settle();
    const { runnerView } = await import('@/domain/runView');
    const v = runnerView(s().data, RUN)!;
    expect([v.step.words, v.values.find((x) => x.name === 'photo')]).toEqual(['Sketch', expect.objectContaining({ text: 'the boxer', each: { n: 2, of: 3 } })]);
    const disk = await onDisk();
    const frames = disk.runs[RUN].frames as Record<string, unknown>[];
    expect(frames[1]).toMatchObject({ seq: 'p107-each', each: 1, eachText: 'the boxer' });
    expect(disk.routines).toEqual(BEFORE.data.routines);
    const others = (d: Data) => ({ ...d, runs: Object.fromEntries(Object.entries(d.runs).filter(([id]) => id !== RUN && id !== 'p96-050')) });
    expect(others(disk)).toEqual(others(BEFORE.data));
  });
});
