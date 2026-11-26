/**
 * P-96: data written by the build BEFORE values (`fixtures/golden/p96-*`, see the README there) — no `out`
 * on any step, no `values` on any run, no brace in any words — with runs at every kind of place: in round 2
 * of a counted loop one level deep, round 3 of an until-done loop, two levels deep, in Plan, on a wait, at
 * the edge, ended both ways, and the run the app is on; and everything older (P-94's set, the retired app's
 * wanders and activities). The real persistence module, against real SQLite, must load it exactly from
 * every place it can be, write nothing by loading it, and read no values in it.
 *
 * Expected values are the frozen `p96-expected.json` and the contract's rulings, never this code's output.
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
/** What the build before P-96 held. */
const BEFORE = JSON.parse(fixture('p96-expected.json')) as Snapshot;

/** The runs it made, by where they are. */
const RUN = {
  loop: 'p96-008', // round 2 of [Pick a feature | Try it (broken down), Note what broke] x 3, inside the breakdown
  scales: 'p96-012', // round 3 of an until-done loop
  move: 'p96-022', // two levels deep
  garden: 'p96-026', // in Plan
  parcel: 'p96-031', // on a wait, with a reason
  guitar: 'p96-034', // at the edge (in Plan)
  tidy: 'p96-038', // finished by Next off the end
  bake: 'p96-045', // ended by Done
  read: 'p96-050', // the run the app is on, running
};

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
const useDatabase = () => copyFileSync(join(GOLDEN, 'p96-schema4.sqlite'), env.state.dbPath);

beforeEach(() => {
  env.ls.clear();
  env.state.openError = undefined;
  env.state.hangWrites = false;
  env.state.dbPath = join(mkdtempSync(join(tmpdir(), 'wanderment-p96-')), 'db.sqlite');
});
afterEach(async () => (await import('./persistence')).stopPersistence());

describe('the frozen data itself holds what P-96 must read', () => {
  it('runs at every kind of place, the retired app’s data, and nothing of values: no `out`, no `values`, no brace in any words', () => {
    const { routines, runs, threads, activities } = BEFORE.data;
    expect([Object.keys(threads).length, Object.keys(activities).length]).toEqual([3, 5]);
    expect(Object.keys(runs)).toEqual(expect.arrayContaining(Object.values(RUN)));
    expect(runs[RUN.loop].frames).toEqual([expect.objectContaining({ round: 2 }), expect.objectContaining({ round: 1 })]);
    expect(routines[runs[RUN.loop].routineId as string]).toMatchObject({ repeatFrom: 1, repeat: 3 });
    expect((runs[RUN.scales].frames as { round: number }[])[0].round).toBe(3);
    expect(runs[RUN.move].frames).toHaveLength(3);
    expect(runs[RUN.garden].mode).toBe('plan');
    expect(runs[RUN.parcel]).toMatchObject({ reason: 'out until five' });
    expect(runs[RUN.parcel].waitingSince).toBeDefined();
    expect(runs[RUN.guitar]).toMatchObject({ mode: 'plan', frames: [{ at: null }] });
    expect([runs[RUN.tidy].endedBy, runs[RUN.bake].endedBy]).toEqual(['finished', 'done']);
    expect(Object.values(runs).filter((r) => r.status).map((r) => [r.id, r.status])).toEqual([[RUN.read, 'running']]);
    for (const r of Object.values(runs)) expect('values' in r, r.id).toBe(false);
    for (const r of Object.values(routines)) {
      for (const i of (r.items ?? []) as Record<string, unknown>[]) expect('out' in i, `${r.id} ${String(i.id)}`).toBe(false);
    }
    for (const r of Object.values(routines)) for (const i of (r.items ?? []) as { text?: string; wait?: string }[]) expect(`${i.text ?? ''}${i.wait ?? ''}${r.words}`).not.toMatch(/[{}]/);
  });
});

describe('data written by the build before P-96 loads exactly, wherever it is', () => {
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
    env.ls.set('wanderment:journal', fixture('p96-journal.json'));
    let store = await load();
    expect(shown(store).data).toEqual(BEFORE.data);
    expect(env.ls.has('wanderment:journal')).toBe(false);
    expect(await onDisk()).toEqual(BEFORE.data);
    store = await load();
    expect(shown(store).data).toEqual(BEFORE.data);
  });

  it('the fallback blob: where SQLite can’t run it loads the same; once it can, it is moved in whole', async () => {
    env.state.openError = new Error('no OPFS');
    env.ls.set('wanderment', fixture('p96-fallback.json'));
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
    const preview = previewImport(fixture('p96-backup.json'));
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

describe('the build with values reads that data as before: no values anywhere, and moving it writes none', () => {
  it('every run reads no values; every step reads as its words alone — no field, no blank, no values row; home’s lines are the words', async () => {
    const { readRun } = await import('@/domain/run');
    const { homeShown, runnerView, planView } = await import('@/domain/runView');
    const { tileLine } = await import('@/domain/goText');
    const data = json(BEFORE.data);
    for (const id of Object.keys(data.runs)) {
      expect(readRun(data, id)!.values, id).toEqual([]);
      const v = runnerView(data, id);
      if (!v) continue;
      expect([v.fields, v.values], id).toEqual([[], []]);
      expect(v.step.parts, id).toEqual(v.step.words ? [{ kind: 'text', text: v.step.words }] : []);
    }
    for (const t of homeShown(data)) {
      expect('values' in t, t.name).toBe(false);
      const line = tileLine(t);
      expect('parts' in line, t.name).toBe(false);
      if (t.at && t.state !== 'waiting') expect(line.line, t.name).toContain(t.at);
    }
    for (const r of Object.keys(data.routines)) for (const row of planView(data, { routineId: r })?.rows ?? []) expect([row.gives, row.reads, row.above], `${r} ${row.itemId}`).toEqual([undefined, [], []]);
  });

  it('through the store, against the frozen database: moving the runs (round 2 inside a breakdown, two levels deep, a wait) writes no `values` and no `out`; the edge run is still Plan', async () => {
    useDatabase();
    const store = await load();
    const s = () => store.getState();
    const { runnerView, planView } = await import('@/domain/runView');
    expect(s().pauseRun(RUN.read).ok).toBe(true);
    for (const [run, presses] of [
      [RUN.loop, ['next', 'next']],
      [RUN.move, ['next', 'next']],
      [RUN.parcel, ['next']],
      [RUN.scales, ['next', 'back']],
    ] as const) {
      expect(s().resumeRun(run).ok, run).toBe(true);
      for (const p of presses) expect((p === 'next' ? s().nextStep(run) : s().backTo(run)).ok, `${run} ${p}`).toBe(true);
      expect('values' in s().data.runs[run], run).toBe(false);
      expect(s().pauseRun(run)).toEqual({ ok: true, runId: run, home: true });
    }
    // Round 2 of the counted loop, inside the breakdown: off its last smaller step, then the loop's last step — round 3.
    // (The divider stands before "Try it": round 3 starts there.)
    expect(runnerView(s().data, RUN.loop)).toMatchObject({ step: { words: 'Try it', kind: 'routine' }, depth: 1, fields: [], values: [] });
    expect(s().data.runs[RUN.loop].frames).toEqual([{ seq: 'p96-001', at: 'p96-003', round: 3 }]);
    expect(planView(s().data, { runId: RUN.guitar })).toMatchObject({ planning: true, edge: true, canDone: true });
    for (const r of Object.values(s().data.routines)) for (const i of (r.items ?? []) as Record<string, unknown>[]) expect('out' in i).toBe(false);
    await settle();
    expect(await onDisk()).toEqual(json(s().data));
  });
});
