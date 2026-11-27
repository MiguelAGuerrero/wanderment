/**
 * P-109: data written by the build BEFORE places (`fixtures/golden/p109-*`, see the README there) — no `places` on
 * any routine; addresses typed in a step's words, given as a value and written in a pause note; words that only
 * look like other schemes — and everything older (P-98's set and all before it). The real persistence module,
 * against real SQLite, must load it exactly from every place it can be and write nothing by loading it; P-109
 * reads no places in it (nothing new anywhere) and offers "Open <host>" only for the http(s) addresses typed.
 *
 * Expected values are the frozen `p109-expected.json`, B-18 and the batch's rulings, never this code's output.
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
/** What the build before P-109 held. */
const BEFORE = JSON.parse(fixture('p109-expected.json')) as Snapshot;

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
const useDatabase = () => copyFileSync(join(GOLDEN, 'p109-schema4.sqlite'), env.state.dbPath);

beforeEach(() => {
  env.ls.clear();
  env.state.openError = undefined;
  env.state.hangWrites = false;
  env.state.dbPath = join(mkdtempSync(join(tmpdir(), 'wanderment-p109-')), 'db.sqlite');
});
afterEach(async () => (await import('./persistence')).stopPersistence());



describe('the frozen data itself holds what P-109 must read', () => {
  it('no `places` on any routine; a step, a value and a pause note holding addresses; words that only look like other schemes', () => {
    const { routines, runs, threads, activities } = BEFORE.data;
    expect([Object.keys(threads).length, Object.keys(activities).length]).toEqual([3, 5]);
    for (const r of Object.values(routines)) expect('places' in r, r.id).toBe(false);
    expect(routines['p109-001']).toMatchObject({ words: 'Product design', tags: ['design'] });
    expect((routines['p109-001'].items as { text: string }[]).map((i) => i.text)).toEqual([
      'Read the brief at https://docs.google.com/document/d/1AbC-dEf/edit and note where I left off',
      'Pick the page to work in',
      'Work in {page}',
      'Never open javascript:alert(1) or file:///etc/passwd',
    ]);
    expect(runs['p109-006']).toMatchObject({ reason: 'left off at https://www.figma.com/file/XyZ/Sketches section 3', values: [expect.objectContaining({ name: 'page', items: ['https://www.notion.so/team/Product-design-1a2b3c'] })] });
    expect(runs['p96-050'].status).toBe('running');
  });
});

describe('data written by the build before P-109 loads exactly, wherever it is', () => {
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
    env.ls.set('wanderment:journal', fixture('p109-journal.json'));
    let store = await load();
    expect(shown(store).data).toEqual(BEFORE.data);
    expect(env.ls.has('wanderment:journal')).toBe(false);
    expect(await onDisk()).toEqual(BEFORE.data);
    store = await load();
    expect(shown(store).data).toEqual(BEFORE.data);
  });

  it('the fallback blob: where SQLite can’t run it loads the same; once it can, it is moved in whole', async () => {
    env.state.openError = new Error('no OPFS');
    env.ls.set('wanderment', fixture('p109-fallback.json'));
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
    const preview = previewImport(fixture('p109-backup.json'));
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

describe('the build with places reads that data: no places anywhere, an Open row only for what was typed as http(s)', () => {
  it('every routine reads as having none: nothing new in Plan, on home or in the panel’s places; the import preview says no places', async () => {
    const { placesOf } = await import('@/domain/places');
    const { panelView } = await import('@/domain/runView');
    const { planImport } = await import('@/domain/importPlan');
    const { importHolds } = await import('@/domain/importText');
    const data = json(BEFORE.data);
    for (const r of Object.values(data.routines)) expect(placesOf(r.places), r.id).toEqual([]);
    for (const id of Object.keys(data.runs)) expect(panelView(data, id)?.places, id).toBeUndefined();
    expect(importHolds(planImport(data, data))).not.toMatch(/place/);
  });

  it('the run paused in Product design: "Open notion.so" (its value) and "Open figma.com" (its note) — nothing for javascript: or file:', async () => {
    const { panelView } = await import('@/domain/runView');
    const data = json(BEFORE.data);
    expect(panelView(data, 'p109-006')!.addresses).toEqual([
      { href: 'https://www.notion.so/team/Product-design-1a2b3c', host: 'notion.so' },
      { href: 'https://www.figma.com/file/XyZ/Sketches', host: 'figma.com' },
    ]);
  });

  it('through the store, against the frozen database: a place added to that routine is the only change, and it opens; the rest reads the same', async () => {
    useDatabase();
    const store = await load();
    const s = () => store.getState();
    expect(s().editRoutine('p109-001', { kind: 'addPlace', name: 'Design doc', where: 'https://www.notion.so/team/Product-design-1a2b3c' }).ok).toBe(true);
    await settle();
    const disk = await onDisk();
    const { placesShown } = await import('@/domain/places');
    expect(placesShown(disk.routines['p109-001'].places)).toEqual([expect.objectContaining({ name: 'Design doc', host: 'notion.so', href: 'https://www.notion.so/team/Product-design-1a2b3c' })]);
    const { places, ...rest } = disk.routines['p109-001'];
    expect(places).toBeDefined();
    expect(rest).toEqual(BEFORE.data.routines['p109-001']);
    expect({ ...disk, routines: { ...disk.routines, 'p109-001': BEFORE.data.routines['p109-001'] } }).toEqual(BEFORE.data);
  });
});
