/**
 * P-98: data written by the build BEFORE calls (`fixtures/golden/p98-*`, see the README there) — a routine used as
 * a step that only an import could make there ("Research" in "Improve my workout routine", its row carrying fields
 * that build did not know: `with`, `words`, `later`), a run paused inside it with a value at each level (its level
 * and a value carrying unknown fields), a removed routine still used as a step with a run resting on its row, a
 * step with an unknown field, and everything older (P-97's set and before, the retired app's wanders and
 * activities). The real persistence module, against real SQLite, must load it exactly from every place it can be
 * and write nothing by loading it; P-98 reads the call, hands back what it gives, and refuses to step into the
 * removed routine.
 *
 * (Was, for P-97:) data written by the build BEFORE tags and My routines (`fixtures/golden/p97-*`, see the README there) —
 * no `tags` on any routine; its home was a tile for every routine — with an until-done loop at the top (a value
 * given, paused with a note), one only inside a step broken down, a counted loop started over, a run ended with
 * End this run, names with accents and in lower case, a routine with no steps, a removed one, and everything
 * older (P-96's set, P-94's, the retired app's wanders and activities). The real persistence module, against
 * real SQLite, must load it exactly from every place it can be and write nothing by loading it; P-97 reads no
 * tags in it, lists every named routine A–Z and puts only the runs going on home.
 *
 * Expected values are the frozen `p98-expected.json` and the batch's rulings, never this code's output.
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
/** What the build before P-98 held. */
const BEFORE = JSON.parse(fixture('p98-expected.json')) as Snapshot;

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
const useDatabase = () => copyFileSync(join(GOLDEN, 'p98-schema4.sqlite'), env.state.dbPath);

beforeEach(() => {
  env.ls.clear();
  env.state.openError = undefined;
  env.state.hangWrites = false;
  env.state.dbPath = join(mkdtempSync(join(tmpdir(), 'wanderment-p98-')), 'db.sqlite');
});
afterEach(async () => (await import('./persistence')).stopPersistence());



describe('the frozen data itself holds what P-98 must read', () => {
  it('a call row with fields that build did not know; a run inside it; a removed routine used as a step; unknown fields on a step, a level and a value', () => {
    const { routines, runs, threads, activities } = BEFORE.data;
    expect([Object.keys(threads).length, Object.keys(activities).length]).toEqual([3, 5]);
    expect(routines['p98-004'].items).toContainEqual({ id: 'p98-call-research', ref: 'p98-001', with: [{ input: 'concerns', name: 'concerns' }], words: 'Research', later: { kept: true } });
    expect(routines['p98-007']).toMatchObject({ words: 'Old helper', removedAt: expect.any(String) });
    expect(routines['p98-009'].items).toContainEqual({ id: 'p98-stretch', text: 'Stretch', future: { x: 1 } });
    expect(runs['p98-011']).toMatchObject({ reason: 'mid research', frames: [{ seq: 'p98-004', at: 'p98-call-research' }, { seq: 'p98-001', at: 'p98-003', from: 'p98-call-research', later: { i: 0 } }] });
    expect(runs['p98-012'].frames).toEqual([{ seq: 'p98-009', at: 'p98-call-helper', round: 1 }]);
  });
});

describe('data written by the build before P-98 loads exactly, wherever it is', () => {
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
    env.ls.set('wanderment:journal', fixture('p98-journal.json'));
    let store = await load();
    expect(shown(store).data).toEqual(BEFORE.data);
    expect(env.ls.has('wanderment:journal')).toBe(false);
    expect(await onDisk()).toEqual(BEFORE.data);
    store = await load();
    expect(shown(store).data).toEqual(BEFORE.data);
  });

  it('the fallback blob: where SQLite can’t run it loads the same; once it can, it is moved in whole', async () => {
    env.state.openError = new Error('no OPFS');
    env.ls.set('wanderment', fixture('p98-fallback.json'));
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
    const preview = previewImport(fixture('p98-backup.json'));
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

describe('the build with calls reads that data: the call, what it gives back, the removed routine', () => {
  it('Plan: the row reads Research, with {concerns}, gives {findings}; the removed one reads “Old helper (removed)”; My routines counts the call', async () => {
    const { planView } = await import('@/domain/runView');
    const { myRoutines } = await import('@/domain/routines');
    const data = json(BEFORE.data);
    const rows = planView(data, { routineId: 'p98-004' })!.rows.filter((r) => r.depth === 0);
    expect(rows.map((r) => [r.words, r.call])).toEqual([
      ['List out my doubts', undefined],
      ['Research', { inputs: [{ input: 'concerns', mode: 'name', name: 'concerns' }], gives: ['findings'] }],
      ['Decide using {findings}', undefined],
    ]);
    expect(rows[2].asks).toEqual([]);
    expect(planView(data, { routineId: 'p98-009' })!.rows.map((r) => [r.words, !!r.call?.removed])).toEqual([['Clean up', false], ['Stretch', false], ['Old helper (removed)', true]]);
    expect(myRoutines(data).find((r) => r.name === 'Improve my workout routine')).toMatchObject({ gives: ['concerns', 'findings'], asks: [] });
  });

  it('through the store, against the frozen database: the run inside Research hands {findings} back at its end, and keeps its unknown fields; the removed one is not stepped into', async () => {
    useDatabase();
    const store = await load();
    const s = () => store.getState();
    const { runnerView } = await import('@/domain/runView');
    // The one running is put down; the run inside the call taken up.
    expect(s().pauseRun('p96-050').ok).toBe(true);
    expect(s().resumeRun('p98-011').ok).toBe(true);
    const v = runnerView(s().data, 'p98-011')!;
    expect(v).toMatchObject({ parent: 'Improve my workout routine', level: 'Research', step: { words: 'Note what I found' } });
    expect(v.values.map((x) => [x.name, x.text, x.from])).toEqual([['concerns', 'form, time', 'List out my doubts'], ['findings', 'shorter sets', undefined]]);
    expect(s().backTo('p98-011').ok).toBe(true);
    expect(s().data.runs['p98-011'].frames).toEqual([(BEFORE.data.runs['p98-011'].frames as unknown[])[0], { ...(BEFORE.data.runs['p98-011'].frames as Record<string, unknown>[])[1], at: 'p98-002' }]);
    expect(s().nextStep('p98-011').ok).toBe(true);
    // (P-111, restored: owner ruling Back keeps it — P-110 had given {findings} again here after the Back that cleared it.)
    expect(s().nextStep('p98-011').ok).toBe(true);
    const after = runnerView(s().data, 'p98-011')!;
    expect(after.step.words).toBe('Decide using {findings}');
    expect(after.step.parts).toContainEqual({ kind: 'value', name: 'findings', text: 'shorter sets' });
    // The value with an unknown field keeps it.
    expect((s().data.runs['p98-011'].values as Record<string, unknown>[])[0]).toMatchObject({ name: 'concerns', later: ['kept'] });
    expect(s().pauseRun('p98-011').ok).toBe(true);
    expect(s().resumeRun('p98-012').ok).toBe(true);
    expect(runnerView(s().data, 'p98-012')!).toMatchObject({ step: { words: 'Old helper (removed)', removed: true }, moves: { stepIn: false } });
    expect(s().stepIn('p98-012')).toMatchObject({ ok: false, reason: 'gone' });
    await settle();
    const disk = await onDisk();
    expect(disk.runs['p98-011'].values).toEqual(s().data.runs['p98-011'].values);
    expect(disk.routines).toEqual(BEFORE.data.routines);
  });
});
