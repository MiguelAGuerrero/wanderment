/**
 * P-100: data written by the build BEFORE home is one queue (`fixtures/golden/p100-*`, see the README there) — no order
 * stored on any run; that build showed the runs going by when each was started (oldest first) under Ongoing and
 * Finishing. The real persistence module, against real SQLite, must load it exactly from every place it can be and
 * write nothing by loading it; P-100 reads it as one queue in the very order that build showed
 * (`p100-old-build.json`), and a move writes only the runs' `queue`.
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
/** What the build before P-100 held. */

const BEFORE = JSON.parse(fixture('p100-expected.json')) as Snapshot;

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
const useDatabase = () => copyFileSync(join(GOLDEN, 'p100-schema4.sqlite'), env.state.dbPath);

beforeEach(() => {
  env.ls.clear();
  env.state.openError = undefined;
  env.state.hangWrites = false;
  env.state.dbPath = join(mkdtempSync(join(tmpdir(), 'wanderment-p100-')), 'db.sqlite');
});
afterEach(async () => (await import('./persistence')).stopPersistence());



const OLD = JSON.parse(fixture('p100-old-build.json')) as { home: { order: { name: string; runId: string; state: string; line: string; reason: string | null }[]; ongoing: string[]; finishing: string[] } };

describe('the frozen data itself holds what P-100 must read', () => {
  it('no run has an order stored; that build showed them under two headings, by when each was started', () => {
    expect(Object.values(BEFORE.data.runs).some((r) => 'queue' in r)).toBe(false);
    expect(OLD.home.ongoing.length).toBeGreaterThan(0);
    expect(OLD.home.finishing.length).toBeGreaterThan(0);
    expect(OLD.home.order.map((o) => o.name).slice(-3)).toEqual(['Plan my day', 'Apply to Acme', 'Better drawer']);
    // (The retired app's wanders and activities are there, untouched.)
    expect(Object.keys(BEFORE.data.threads).length).toBe(3);
    expect(Object.keys(BEFORE.data.activities).length).toBe(5);
  });
});

describe('data written by the build before P-100 loads exactly, wherever it is', () => {
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
    env.ls.set('wanderment:journal', fixture('p100-journal.json'));
    let store = await load();
    expect(shown(store).data).toEqual(BEFORE.data);
    expect(env.ls.has('wanderment:journal')).toBe(false);
    expect(await onDisk()).toEqual(BEFORE.data);
    store = await load();
    expect(shown(store).data).toEqual(BEFORE.data);
  });

  it('the fallback blob: where SQLite can’t run it loads the same; once it can, it is moved in whole', async () => {
    env.state.openError = new Error('no OPFS');
    env.ls.set('wanderment', fixture('p100-fallback.json'));
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
    const preview = previewImport(fixture('p100-backup.json'));
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

describe('home as one queue reads that data', () => {
  it('one list, in the very order that build showed (by when each was started — Ongoing and Finishing merged back into it); each row its step, its note, what it waits for', async () => {
    const { homeQueue } = await import('@/domain/runView');
    const { tileLine } = await import('@/domain/goText');
    const rows = homeQueue(json(BEFORE.data));
    expect(rows.map((t) => t.runId)).toEqual(OLD.home.order.map((o) => o.runId));
    expect(rows.map((t) => t.state)).toEqual(OLD.home.order.map((o) => o.state));
    expect(rows.map((t) => t.reason ?? null)).toEqual(OLD.home.order.map((o) => o.reason));
    // (A wait's "since" is said from today, so only what it waits for is compared.)
    expect(rows.map((t) => tileLine(t).line.replace(/ · since .*$/, ''))).toEqual(OLD.home.order.map((o) => o.line.replace(/ · since .*$/, '')));
    const drawer = rows.find((t) => t.name === 'Better drawer')!;
    expect(drawer).toMatchObject({ at: 'Gesture practice', path: ['Better drawer', 'Get better at hands'], reason: 'hands are tired' });
  });

  it('through the store, against the frozen database: To the top writes only `queue` on the runs it renumbers — nothing converted or deleted — and its Undo puts the database back as it was', async () => {
    useDatabase();
    const store = await load();
    const { homeQueue } = await import('@/domain/runView');
    const last = OLD.home.order[OLD.home.order.length - 1].runId;
    expect(store.getState().moveInQueue(last, 'top').ok).toBe(true);
    await settle();
    const disk = await onDisk();
    expect(homeQueue(disk).map((t) => t.runId)).toEqual([last, ...OLD.home.order.slice(0, -1).map((o) => o.runId)]);
    const { threads, activities, routines } = BEFORE.data;
    expect({ threads: disk.threads, activities: disk.activities, routines: disk.routines }).toEqual({ threads, activities, routines });
    expect(Object.keys(disk.runs).sort()).toEqual(Object.keys(BEFORE.data.runs).sort());
    for (const id of Object.keys(BEFORE.data.runs)) {
      const { queue: _q, ...rest } = disk.runs[id];
      expect(rest).toEqual(BEFORE.data.runs[id]);
    }
    expect(store.getState().undoLast()).toBe(true);
    await settle();
    expect(await onDisk()).toEqual(BEFORE.data);
  });
});
