/**
 * P-94: data written by the build BEFORE the queue (`fixtures/golden/p94-*`, see the README there) —
 * home as tiles, open runs of every kind (left on a step, waiting, in Plan, at the edge, the one the app
 * is on, one with this-run changes from before P-90), ended runs, a removed routine, unnamed sequences
 * and the retired app's wanders and activities. The real persistence module, against real SQLite, must
 * load it exactly from every place it can be, and nothing is written by loading or reading it.
 *
 * Expected values are the frozen `p94-expected.json` and the contract's rulings, never this code's output.
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
/** What the build before P-94 held. */
const BEFORE = JSON.parse(fixture('p94-expected.json')) as Snapshot;

/** The records in it, by what they are. */
const DINNER = 'new-001'; // its run (new-002) carries this-run changes from before P-90, left on a step
const DESK = 'new-010'; // its run ended (before the retirement)
const WATER = 'p94-001'; // never started
const REVIEW = 'p94-004'; // left on a step, three days before the rest
const BANK = 'p94-008'; // resting on a wait step
const REPORT = 'p94-013'; // left in Plan
const EDIT = 'p94-018'; // the unnamed sequence a step of REPORT was broken into
const SPANISH = 'p94-021'; // at the edge (in Plan)
const SHED = 'p94-024'; // its run ended
const HABIT = 'p94-027'; // removed
const TEA = 'p94-029'; // the run the app is on, paused with a reason
const RUN = { dinner: 'new-002', desk: 'new-011', review: 'p94-007', bank: 'p94-012', report: 'p94-017', spanish: 'p94-023', shed: 'p94-026', tea: 'p94-032' };

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
const useDatabase = () => copyFileSync(join(GOLDEN, 'p94-schema4.sqlite'), env.state.dbPath);

beforeEach(() => {
  env.ls.clear();
  env.state.openError = undefined;
  env.state.hangWrites = false;
  env.state.dbPath = join(mkdtempSync(join(tmpdir(), 'wanderment-p94-')), 'db.sqlite');
});
afterEach(async () => (await import('./persistence')).stopPersistence());

describe('the frozen data itself holds what P-94 must read', () => {
  it('open runs of every kind, ended runs, a removed routine, unnamed sequences, the retired app’s data; no queue anywhere', () => {
    const { routines, runs, threads, activities } = BEFORE.data;
    expect(Object.keys(routines)).toEqual([DINNER, 'new-005', DESK, WATER, REVIEW, BANK, REPORT, EDIT, SPANISH, SHED, HABIT, TEA]);
    expect(Object.keys(runs)).toEqual([RUN.dinner, RUN.desk, RUN.review, RUN.bank, RUN.report, RUN.spanish, RUN.shed, RUN.tea]);
    expect([Object.keys(threads).length, Object.keys(activities).length]).toEqual([3, 5]);
    expect(runs[RUN.tea]).toMatchObject({ status: 'paused', reason: 'the phone rang' });
    expect(runs[RUN.bank].waitingSince).toBeDefined();
    expect(runs[RUN.report].mode).toBe('plan');
    expect(runs[RUN.spanish]).toMatchObject({ mode: 'plan', frames: [{ seq: SPANISH, at: null, round: 1 }] });
    expect([runs[RUN.desk].endedBy, runs[RUN.shed].endedBy]).toEqual(['done', 'done']);
    expect((runs[RUN.dinner].changes as unknown[]).length).toBeGreaterThan(0);
    expect(routines[HABIT].removedAt).toBeDefined();
    expect([routines[EDIT].named, routines['new-005'].named, routines['new-005'].ownerRunId]).toEqual([false, false, RUN.dinner]);
    // Three days between the run left first and the rest.
    expect(Date.parse(runs[RUN.bank].touchedAt as string) - Date.parse(runs[RUN.review].touchedAt as string)).toBeGreaterThan(2 * 864e5);
    expect(Object.values(routines).filter((r) => 'queue' in r)).toEqual([]);
  });
});

describe('data written by the build before P-94 loads exactly, wherever it is', () => {
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
    env.ls.set('wanderment:journal', fixture('p94-journal.json'));
    let store = await load();
    expect(shown(store).data).toEqual(BEFORE.data);
    expect(env.ls.has('wanderment:journal')).toBe(false);
    expect(await onDisk()).toEqual(BEFORE.data);
    store = await load();
    expect(shown(store).data).toEqual(BEFORE.data);
  });

  it('the fallback blob: where SQLite can’t run it loads the same; once it can, it is moved in whole', async () => {
    env.state.openError = new Error('no OPFS');
    env.ls.set('wanderment', fixture('p94-fallback.json'));
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
    const preview = previewImport(fixture('p94-backup.json'));
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
