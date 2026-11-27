/**
 * P-97: data written by the build BEFORE tags and My routines (`fixtures/golden/p97-*`, see the README there) —
 * no `tags` on any routine; its home was a tile for every routine — with an until-done loop at the top (a value
 * given, paused with a note), one only inside a step broken down, a counted loop started over, a run ended with
 * End this run, names with accents and in lower case, a routine with no steps, a removed one, and everything
 * older (P-96's set, P-94's, the retired app's wanders and activities). The real persistence module, against
 * real SQLite, must load it exactly from every place it can be and write nothing by loading it; P-97 reads no
 * tags in it, lists every named routine A–Z and puts only the runs going on home.
 *
 * Expected values are the frozen `p97-expected.json` and the batch's rulings, never this code's output.
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
/** What the build before P-97 held. */
const BEFORE = JSON.parse(fixture('p97-expected.json')) as Snapshot;

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
const useDatabase = () => copyFileSync(join(GOLDEN, 'p97-schema4.sqlite'), env.state.dbPath);

beforeEach(() => {
  env.ls.clear();
  env.state.openError = undefined;
  env.state.hangWrites = false;
  env.state.dbPath = join(mkdtempSync(join(tmpdir(), 'wanderment-p97-')), 'db.sqlite');
});
afterEach(async () => (await import('./persistence')).stopPersistence());


describe('the frozen data itself holds what P-97 must read', () => {
  it('no `tags` on any routine; runs going at the top of an until-done loop, inside one, in a counted loop; the retired app’s data', () => {
    const { routines, runs, threads, activities } = BEFORE.data;
    expect([Object.keys(threads).length, Object.keys(activities).length]).toEqual([3, 5]);
    for (const r of Object.values(routines)) expect('tags' in r, r.id).toBe(false);
    expect(routines['p97-001']).toMatchObject({ words: 'Draw every day', repeatFrom: 0 });
    expect('repeat' in routines['p97-001']).toBe(false);
    expect(routines['p97-008']).toMatchObject({ named: false, repeatFrom: 0 });
    expect(routines['p97-012']).toMatchObject({ repeatFrom: 0, repeat: 4 });
    expect(runs['p97-019']).toMatchObject({ endedBy: 'done', reason: 'closed today' });
    expect(runs['p97-004'].values).toEqual([expect.objectContaining({ name: 'subject', items: ['hands'] })]);
  });
});

describe('data written by the build before P-97 loads exactly, wherever it is', () => {
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
    env.ls.set('wanderment:journal', fixture('p97-journal.json'));
    let store = await load();
    expect(shown(store).data).toEqual(BEFORE.data);
    expect(env.ls.has('wanderment:journal')).toBe(false);
    expect(await onDisk()).toEqual(BEFORE.data);
    store = await load();
    expect(shown(store).data).toEqual(BEFORE.data);
  });

  it('the fallback blob: where SQLite can’t run it loads the same; once it can, it is moved in whole', async () => {
    env.state.openError = new Error('no OPFS');
    env.ls.set('wanderment', fixture('p97-fallback.json'));
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
    const preview = previewImport(fixture('p97-backup.json'));
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

describe('the build with My routines reads that data: no tags, every named routine A–Z, only the runs going on home', () => {
  it('My routines: the 25 named routines that are not removed, A–Z by letter alone, none with a tag; no step broken down, nothing removed', async () => {
    const { myRoutines, routineSections } = await import('@/domain/routines');
    const rows = myRoutines(json(BEFORE.data));
    expect(rows.map((r) => r.name)).toEqual([
      'apple pie', 'Bake bread', 'Call the bank', 'Draw every day', 'Éclair practice', 'Écrire un poème', 'Errands', 'Feature loop', 'Garden',
      'Learn guitar', 'Learn Spanish', 'Make dinner', 'Make tea', 'Move house', 'practise piano', 'Read a chapter', 'Return the parcel', 'Scales',
      'Tidy the desk', 'Tidy the shed', 'Tidy up', 'Water the plants', 'Weekly review', 'Write the report', 'Zine issue',
    ]);
    for (const r of rows) expect(r.tags, r.name).toEqual([]);
    expect(routineSections(rows).map((s) => s.letter)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'L', 'M', 'P', 'R', 'S', 'T', 'W', 'Z']);
    expect(rows.find((r) => r.name === 'Draw every day')).toMatchObject({ gives: ['subject'], asks: [] });
    expect(rows.find((r) => r.name === 'Éclair practice')!.empty).toBe(true);
    expect(rows.find((r) => r.name === 'Read a chapter')).toMatchObject({ runId: 'p96-050', running: true });
  });

  it('home: only the 16 runs going — Ongoing the two whose routine repeats until done at its top, Finishing the rest (a loop inside a step, a counted one) — in the order they were started; no routine with nothing going', async () => {
    const { homeGroups } = await import('@/domain/routines');
    const g = homeGroups(json(BEFORE.data));
    expect(g.ongoing.map((t) => t.name)).toEqual(['Scales', 'Draw every day']);
    expect(g.finishing.map((t) => t.name)).toEqual([
      'Make dinner', 'Weekly review', 'Call the bank', 'Write the report', 'Learn Spanish', 'Make tea', 'Feature loop', 'Move house', 'Garden',
      'Return the parcel', 'Learn guitar', 'Read a chapter', 'practise piano', 'Zine issue',
    ]);
    expect(g.ongoing[1]).toMatchObject({ state: 'paused', reason: 'after dinner', at: 'Draw {subject} for ten minutes' });
    expect(g.ongoing[1].atParts).toContainEqual({ kind: 'value', name: 'subject', text: 'hands' });
    expect(g.finishing.find((t) => t.name === 'Read a chapter')).toMatchObject({ state: 'running', current: true });
    expect(g.finishing.find((t) => t.name === 'Return the parcel')!.state).toBe('waiting');
  });

  it('through the store, against the frozen database: tags kept on a frozen routine write that routine alone, with nothing else in it changed', async () => {
    useDatabase();
    const store = await load();
    env.ls.clear();
    const before = json(store.getState().data);
    expect(store.getState().editRoutine('p96-009', { kind: 'tags', tags: ['music', '#Daily'] }).ok).toBe(true);
    await settle();
    const after = await onDisk();
    expect(after.routines['p96-009']).toEqual({ ...before.routines['p96-009'], tags: ['music', 'Daily'] });
    expect({ ...after, routines: { ...after.routines, 'p96-009': before.routines['p96-009'] } }).toEqual(before);
  });
});
