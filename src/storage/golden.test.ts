/**
 * P-89: the retirement's safety net. The fixtures in `fixtures/golden/` were written by the builds
 * BEFORE the old app was removed (see the README there). Here the real persistence module, against
 * real SQLite, loads, migrates, replays, hands over, exports and imports them, and the result must
 * deep-equal what the build that wrote them held: nothing stored is deleted, converted or dropped —
 * wanders, activities, lit and settled lines, notes, links, routines, runs and the five settings.
 *
 * Expected values are the frozen `expected-*.json` snapshots, never the output of this code.
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
/** Lets a test give the opened database the web worker's `shutdown` (so the page can let go of it). */
const handoff = vi.hoisted(() => ({ wrapDb: undefined as undefined | ((db: import('./db').Db) => import('./db').Db) }));

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
      const opened = { ...db, transaction: (task: () => Promise<void>) => (env.state.hangWrites ? new Promise<void>(() => {}) : db.transaction(task)) };
      return handoff.wrapDb?.(opened) ?? opened;
    },
  };
});
vi.mock('./nativeBackup', () => ({ scheduleBackup: () => {} }));

const GOLDEN = join(__dirname, 'fixtures/golden');
const fixture = (name: string) => readFileSync(join(GOLDEN, name), 'utf8');
type Snapshot = { data: Data; settings: Required<Settings> };
const frozenOld = JSON.parse(fixture('expected-old.json')) as { data: Pick<Data, 'threads' | 'activities'>; settings: Required<Settings> };
/** What the pre-P-85 build held, as today's format reads it: the same records, and no routines or runs. */
const OLD: Snapshot = { data: { version: 2, threads: frozenOld.data.threads, activities: frozenOld.data.activities, routines: {}, runs: {} }, settings: frozenOld.settings };
/** What the last build before the retirement held. */
const NEW = JSON.parse(fixture('expected-new.json')) as Snapshot;

const settle = () => new Promise((r) => setTimeout(r, 30));

/** A fresh page load: new modules, new store, same storage. */
async function load() {
  vi.resetModules();
  const { startPersistence } = await import('./persistence');
  const { useStore } = await import('@/store/useStore');
  await startPersistence();
  return useStore;
}
type Store = Awaited<ReturnType<typeof load>>;

/** What the page shows: the data and the five saved settings, as plain values. */
const shown = (store: Store): Snapshot => {
  const s = store.getState();
  return JSON.parse(JSON.stringify({ data: s.data, settings: { showShading: s.showShading, recentSearches: s.recentSearches, leftAsIs: s.leftAsIs, whyOfferOff: s.whyOfferOff, firstRunDone: s.firstRunDone } }));
};

/** What's saved, read straight from the database file (as another page would). */
async function onDisk(): Promise<{ data: Data; settings: Settings; schema: number }> {
  const { nodeDb } = await import('./nodeDb');
  const { loadData, loadSettings } = await import('./repository');
  const db = nodeDb(env.state.dbPath);
  try {
    const [{ user_version: schema }] = await db.all<{ user_version: number }>('PRAGMA user_version');
    return JSON.parse(JSON.stringify({ data: await loadData(db), settings: await loadSettings(db), schema }));
  } finally {
    db.close();
  }
}
const useDatabase = (name: string) => copyFileSync(join(GOLDEN, name), env.state.dbPath);

beforeEach(() => {
  env.ls.clear();
  env.state.openError = undefined;
  env.state.hangWrites = false;
  env.state.dbPath = join(mkdtempSync(join(tmpdir(), 'wanderment-golden-')), 'db.sqlite');
  handoff.wrapDb = undefined;
});
afterEach(async () => (await import('./persistence')).stopPersistence());

describe('the frozen data itself holds what the retirement must not lose', () => {
  it('a declared wander, a hidden one, next steps, a lit line, settled lines, notes, links, all five settings, routines and runs', () => {
    const { threads, activities, routines, runs } = NEW.data;
    expect(Object.values(threads).filter((t) => t.declaredAt)).toHaveLength(1);
    expect(Object.values(threads).filter((t) => t.hidden)).toHaveLength(1);
    expect(Object.values(threads).filter((t) => t.next)).toHaveLength(2);
    expect(Object.values(activities).filter((a) => a.lit === true)).toHaveLength(1);
    expect(Object.values(activities).filter((a) => a.settledAt)).toHaveLength(2);
    expect(Object.values(activities).filter((a) => a.note)).toHaveLength(2);
    expect(Object.values(activities).filter((a) => a.doingId)).toHaveLength(2);
    expect(Object.values(activities).filter((a) => a.toIds.length)).toHaveLength(2);
    expect(Object.keys(activities)).toHaveLength(5);
    expect(Object.keys(threads)).toHaveLength(3);
    expect(Object.keys(routines)).toHaveLength(3);
    expect(Object.keys(runs)).toHaveLength(2);
    expect(NEW.settings).toEqual({ showShading: false, recentSearches: ['river', 'drawing'], leftAsIs: ['old-008'], whyOfferOff: true, firstRunDone: true });
    // The new app was used on top of the old data: the old records are the same ones.
    expect({ threads, activities }).toEqual({ threads: OLD.data.threads, activities: OLD.data.activities });
    expect(NEW.settings).toEqual(OLD.settings);
  });
});

describe('a database written by an earlier build', () => {
  it('schema 3 (before routines and runs): opens, is migrated in place, and every record and setting reads the same — now and after a reload', async () => {
    useDatabase('schema3.sqlite');
    expect((await onDisk().catch((e: Error) => e.message)) as unknown).toMatch(/no such table: routines/);
    let store = await load();
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'sqlite' });
    expect(shown(store)).toEqual(OLD);
    await settle();
    expect(await onDisk()).toEqual({ ...OLD, schema: 4 });
    store = await load();
    expect(shown(store)).toEqual(OLD);
  });

  it('schema 4: opens and every record and setting reads the same; nothing is rewritten by opening it', async () => {
    useDatabase('schema4.sqlite');
    const before = readFileSync(env.state.dbPath);
    const store = await load();
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'sqlite' });
    expect(shown(store)).toEqual(NEW);
    await settle();
    expect(await onDisk()).toEqual({ ...NEW, schema: 4 });
    expect(readFileSync(env.state.dbPath).equals(before)).toBe(true);
  });

  it('using the app afterwards keeps every earlier record and all five settings (a save writes only what changed)', async () => {
    useDatabase('schema4.sqlite');
    let store = await load();
    // (P-90: "New" makes the routine only; no run until Start.)
    const made = store.getState().createRoutine('Water the plants');
    expect(made.ok).toBe(true);
    await settle();
    store = await load();
    const now = shown(store);
    expect(now.settings).toEqual(NEW.settings);
    expect(now.data.threads).toEqual(NEW.data.threads);
    expect(now.data.activities).toEqual(NEW.data.activities);
    expect(now.data.routines).toMatchObject(NEW.data.routines);
    expect(now.data.runs).toMatchObject(NEW.data.runs);
    expect(Object.keys(now.data.routines)).toHaveLength(4);
    expect(Object.keys(now.data.runs)).toHaveLength(2);
    // And Undo of a change leaves exactly what was there.
    const routine = Object.keys(now.data.routines).find((id) => !NEW.data.routines[id])!;
    expect(store.getState().editRoutine(routine, { kind: 'addStep', text: 'fill the can' }).ok).toBe(true);
    await settle();
    expect(store.getState().undoLast()).toBe(true);
    await settle();
    expect(shown(await load())).toEqual(now);
  });
});

describe('a pending journal written by an earlier build', () => {
  it('four keys (before routines and runs), over an empty database: replayed, cleared, and everything reads the same', async () => {
    env.ls.set('wanderment:journal', fixture('journal-four-key.json'));
    let store = await load();
    expect(shown(store)).toEqual(OLD);
    expect(env.ls.has('wanderment:journal')).toBe(false);
    expect([...env.ls.keys()].filter((k) => k.startsWith('wanderment:journal-failed-'))).toEqual([]);
    expect(await onDisk()).toEqual({ ...OLD, schema: 4 });
    store = await load();
    expect(shown(store)).toEqual(OLD);
  });

  it('four keys, over the schema-3 database: replayed during the migration’s own open, nothing lost or doubled', async () => {
    useDatabase('schema3.sqlite');
    env.ls.set('wanderment:journal', fixture('journal-four-key.json'));
    const store = await load();
    expect(shown(store)).toEqual(OLD);
    expect(env.ls.has('wanderment:journal')).toBe(false);
    expect(await onDisk()).toEqual({ ...OLD, schema: 4 });
  });

  it('four keys, over the schema-4 database: the old records are written again and the routines and runs it never knew are left alone', async () => {
    useDatabase('schema4.sqlite');
    env.ls.set('wanderment:journal', fixture('journal-four-key.json'));
    const store = await load();
    expect(shown(store)).toEqual(NEW);
    expect(await onDisk()).toEqual({ ...NEW, schema: 4 });
  });

  it('eight keys, over an empty database: replayed, cleared, and everything reads the same', async () => {
    env.ls.set('wanderment:journal', fixture('journal-eight-key.json'));
    let store = await load();
    expect(shown(store)).toEqual(NEW);
    expect(env.ls.has('wanderment:journal')).toBe(false);
    expect([...env.ls.keys()].filter((k) => k.startsWith('wanderment:journal-failed-'))).toEqual([]);
    expect(await onDisk()).toEqual({ ...NEW, schema: 4 });
    store = await load();
    expect(shown(store)).toEqual(NEW);
  });
});

describe('the fallback blob (a browser that couldn’t run SQLite)', () => {
  for (const [name, expected] of [
    ['fallback-old-build.json', OLD],
    ['fallback.json', NEW],
  ] as const) {
    it(`${name}: once SQLite runs it is moved in whole, settings too, and the old key goes`, async () => {
      env.ls.set('wanderment', fixture(name));
      let store = await load();
      expect(store.getState().storage).toEqual({ state: 'ready', kind: 'sqlite' });
      expect(shown(store)).toEqual(expected);
      expect(env.ls.has('wanderment')).toBe(false);
      expect(await onDisk()).toEqual({ ...expected, schema: 4 });
      store = await load();
      expect(shown(store)).toEqual(expected);
    });

    it(`${name}: where SQLite still can’t run it loads the same, and a later change rewrites the blob with everything still in it`, async () => {
      env.state.openError = new Error('no OPFS');
      env.ls.set('wanderment', fixture(name));
      let store = await load();
      expect(store.getState().storage).toEqual({ state: 'ready', kind: 'local' });
      expect(shown(store)).toEqual(expected);
      expect(store.getState().createRoutine('Water the plants').ok).toBe(true);
      await settle();
      const blob = JSON.parse(env.ls.get('wanderment')!) as { state: Data & Record<string, unknown> & { data: Data }; version: number };
      expect(blob.version).toBe(1);
      expect(blob.state.data.threads).toEqual(expected.data.threads);
      expect(blob.state.data.activities).toEqual(expected.data.activities);
      expect(blob.state.data.routines).toMatchObject(expected.data.routines);
      expect(blob.state.data.runs).toMatchObject(expected.data.runs);
      const { data: _data, ...settings } = blob.state;
      expect(settings).toEqual(expected.settings);
      store = await load();
      expect(shown(store).settings).toEqual(expected.settings);
      expect(shown(store).data.activities).toEqual(expected.data.activities);
      expect(shown(store).data.threads).toEqual(expected.data.threads);
    });
  }
});

describe('an old-build tab beside this build (one browser, across the update)', () => {
  it('this build has the database and has been used; the old tab left its blob and a kept Return: everything of both is there, once, and nothing of this build’s is overwritten', async () => {
    useDatabase('schema4.sqlite');
    let store = await load();
    // This build's own writes: a new routine, and an old line edited here.
    expect(store.getState().createRoutine('Water the plants').ok).toBe(true);
    const { person } = await import('@/test/records');
    person(store).updateActivity('old-008', { note: 'edited in this build' });
    await settle();
    const mine = shown(store);
    (await import('./persistence')).stopPersistence();

    // The old build's tab (still running its JavaScript) wrote the first release's key with its stale
    // copy of the old records plus one line of its own, and kept a Return before reloading itself.
    const blob = JSON.parse(fixture('fallback-old-build.json')) as { state: { data: { activities: Record<string, unknown> } } };
    blob.state.data.activities['from-old-tab'] = { id: 'from-old-tab', text: 'logged in the old tab', occurredAt: '2026-11-25T09:00:00.000Z', createdAt: '2026-11-25T09:00:00.000Z', toIds: ['old-001'] };
    env.ls.set('wanderment', JSON.stringify(blob));
    const session = new Map<string, string>();
    vi.stubGlobal('sessionStorage', { getItem: (k: string) => session.get(k) ?? null, setItem: (k: string, v: string) => void session.set(k, v), removeItem: (k: string) => void session.delete(k) });
    const draft = { text: 'pressed in the old tab', toIds: ['old-003'] };
    session.set('wanderment:draft', JSON.stringify(draft));
    session.set('wanderment:draft:to-log', JSON.stringify({ draft }));
    try {
      store = await load();
      await settle();
      const now = shown(store);
      // Settings, wanders, routines and runs: exactly this build's.
      expect(now.settings).toEqual(mine.settings);
      expect(now.data.threads).toEqual(mine.data.threads);
      expect(now.data.routines).toEqual(mine.data.routines);
      expect(now.data.runs).toEqual(mine.data.runs);
      // Lines: this build's (its edit NOT put back by the old tab's stale copy), the old tab's new one, and the kept Return, once.
      const kept = Object.values(now.data.activities).filter((a) => a.text === 'pressed in the old tab');
      expect(kept).toHaveLength(1);
      expect(kept[0]).toMatchObject({ toIds: ['old-003'] });
      const { [kept[0].id]: _kept, 'from-old-tab': fromOldTab, ...rest } = now.data.activities;
      expect(rest).toEqual(mine.data.activities);
      expect(rest['old-008'].note).toBe('edited in this build');
      expect(fromOldTab).toEqual({ id: 'from-old-tab', text: 'logged in the old tab', occurredAt: '2026-11-25T09:00:00.000Z', createdAt: '2026-11-25T09:00:00.000Z', toIds: ['old-001'] });
      expect(env.ls.has('wanderment')).toBe(false);
      expect(session.size).toBe(0);
      // Saved that way, and the same after another reload: nothing logged or taken in twice.
      expect((await onDisk()).data).toEqual(now.data);
      store = await load();
      await settle();
      expect(shown(store)).toEqual(now);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('export and import', () => {
  const exported = async (store: Store) => {
    const { toBackup } = await import('@/domain/backup');
    return JSON.parse(toBackup(store.getState().data, new Date('2026-11-25T00:00:00.000Z'))) as { app: string; exportedAt: string; data: Data };
  };

  it('an export still contains the wanders and activities, with lit, settledAt, declaredAt, hidden, next, notes and links — the same file the last build wrote', async () => {
    useDatabase('schema4.sqlite');
    const backup = await exported(await load());
    expect(backup.app).toBe('wanderment');
    expect(backup.data).toEqual(NEW.data);
    expect(backup.data).toEqual(JSON.parse(fixture('backup-format2.json')).data);
    expect(Object.keys(backup.data).sort()).toEqual(['activities', 'routines', 'runs', 'threads', 'version']);
    expect(backup.data.threads['old-001']).toEqual({ id: 'old-001', name: 'practice drawing', hidden: false, createdAt: '2026-10-03T08:00:00.000Z', declaredAt: '2026-10-03T08:21:00.000Z', next: 'sketch hands for ten minutes' });
    expect(backup.data.threads['old-002'].hidden).toBe(true);
    expect(backup.data.activities['old-005']).toEqual({ id: 'old-005', text: 'drew for an hour', occurredAt: '2026-10-03T08:42:00.000Z', createdAt: '2026-10-03T08:42:00.000Z', toIds: ['old-001'], lit: true });
    expect(backup.data.activities['old-006']).toEqual({ id: 'old-006', text: 'sewed a hem', occurredAt: '2026-10-03T08:49:00.000Z', createdAt: '2026-10-03T08:49:00.000Z', doingId: 'old-003', toIds: [], note: 'blue thread — the machine jams on denim', settledAt: '2026-10-03T08:52:00.000Z' });
    // A backup holds the data only; the settings stay in the browser (as before).
    expect(Object.keys(backup).sort()).toEqual(['app', 'data', 'exportedAt']);
  });

  it('an export from a schema-3 person who never used the new app: the same wanders and activities, in today’s format', async () => {
    useDatabase('schema3.sqlite');
    const backup = await exported(await load());
    expect(backup.data).toEqual(OLD.data);
  });

  for (const [name, expected, counts] of [
    ['backup-format1.json', OLD, { activities: 5, threads: 3, routines: 0, runs: 0 }],
    ['backup-format2.json', NEW, { activities: 5, threads: 3, routines: 3, runs: 2 }],
  ] as const) {
    it(`${name} (made before the retirement) still imports: previewed with its counts, replaced, saved, and the same after a reload`, async () => {
      let store = await load();
      const { previewImport, confirmImport } = await import('@/store/importBackup');
      const { heldIncoming } = await import('@/domain/importPlan');
      const preview = previewImport(fixture(name));
      expect({ activities: heldIncoming(preview.plan.activities), threads: heldIncoming(preview.plan.threads), routines: heldIncoming(preview.plan.routines), runs: heldIncoming(preview.plan.runs) }).toEqual(counts);
      expect(preview.plan.incoming).toEqual({ activities: 5, wanders: 3, visible: 2, hidden: 1, whys: 1 });
      expect(shown(store).data).toEqual({ version: 2, threads: {}, activities: {}, routines: {}, runs: {} });
      expect(confirmImport(preview)).toEqual({ ok: true, activities: 5 });
      expect(shown(store).data).toEqual(expected.data);
      await settle();
      expect((await onDisk()).data).toEqual(expected.data);
      store = await load();
      expect(shown(store).data).toEqual(expected.data);
    });
  }

  it('importing the format-1 backup over the newer data replaces it: exactly the backup, nothing left behind, and the five settings untouched', async () => {
    useDatabase('schema4.sqlite');
    let store = await load();
    const { previewImport, confirmImport } = await import('@/store/importBackup');
    const preview = previewImport(fixture('backup-format1.json'));
    expect(preview.plan.routines).toEqual({ added: 0, removed: 3, changed: 0, unchanged: 0 });
    expect(preview.plan.activities).toEqual({ added: 0, removed: 0, changed: 0, unchanged: 5 });
    expect(confirmImport(preview).ok).toBe(true);
    await settle();
    store = await load();
    expect(shown(store)).toEqual({ data: OLD.data, settings: NEW.settings });
  });

  it('export, then import of that export into an empty browser, round-trips to the same data', async () => {
    useDatabase('schema4.sqlite');
    const { toBackup } = await import('@/domain/backup');
    const json = toBackup((await load()).getState().data);
    env.state.dbPath = join(mkdtempSync(join(tmpdir(), 'wanderment-golden-')), 'db.sqlite');
    env.ls.clear();
    let store = await load();
    const { previewImport, confirmImport } = await import('@/store/importBackup');
    expect(confirmImport(previewImport(json)).ok).toBe(true);
    await settle();
    store = await load();
    expect(shown(store).data).toEqual(NEW.data);
  });
});

describe('handing the data over to another tab and taking it back', () => {
  const tick = (ms: number) => vi.advanceTimersByTimeAsync(ms);

  /** A web page's document and window: visibility and lifecycle events. */
  function fakePage() {
    const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' as 'visible' | 'hidden' });
    vi.stubGlobal('document', doc);
    vi.stubGlobal('window', new EventTarget());
    const set = (v: 'visible' | 'hidden') => {
      doc.visibilityState = v;
      doc.dispatchEvent(new Event('visibilitychange'));
    };
    return { hide: () => set('hidden'), show: () => set('visible') };
  }

  /** navigator.locks with one lock; requests queue. */
  function fakeLocks() {
    let busy = false;
    const queue: (() => void)[] = [];
    const grant = async (cb: (lock: unknown) => unknown) => {
      busy = true;
      try {
        return await cb({ name: 'wanderment-data', mode: 'exclusive' });
      } finally {
        busy = false;
        queue.shift()?.();
      }
    };
    const request = (opts: { ifAvailable?: boolean; signal?: AbortSignal }, cb: (lock: unknown) => unknown) => {
      if (!busy) return grant(cb);
      if (opts.ifAvailable) return Promise.resolve(cb(null));
      return new Promise((resolve) => queue.push(() => resolve(grant(cb))));
    };
    vi.stubGlobal('navigator', { locks: { request: (_name: string, opts: object, cb: (lock: unknown) => unknown) => request(opts, cb) } });
    return { free: () => !busy };
  }

  let writeGate: { promise: Promise<void>; open: () => void } | undefined;
  beforeEach(() => {
    vi.useFakeTimers();
    writeGate = undefined;
    handoff.wrapDb = (db) => ({
      ...db,
      transaction: async (task) => {
        if (writeGate) await writeGate.promise;
        await db.transaction(task);
      },
      shutdown: async () => {},
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  /** Another tab, holding the data meanwhile, edits one old record, removes one and adds one. */
  async function editElsewhere() {
    const { nodeDb } = await import('./nodeDb');
    const { saveChanges } = await import('./repository');
    const db = nodeDb(env.state.dbPath);
    await saveChanges(db, {
      upsertThreads: [],
      deleteThreads: [],
      upsertActivities: [
        { ...NEW.data.activities['old-008'], note: 'added in the other tab' },
        { id: 'x-1', text: 'made in the other tab', occurredAt: '2026-11-24T10:00:00.000Z', createdAt: '2026-11-24T10:00:00.000Z', toIds: ['old-001'] },
      ],
      deleteActivities: ['old-007'],
    });
    db.close();
  }
  /** The golden data with the other tab's three changes. */
  const afterElsewhere = (): Data => {
    const { 'old-007': _gone, ...activities } = NEW.data.activities;
    return {
      ...NEW.data,
      activities: {
        ...activities,
        'old-008': { ...NEW.data.activities['old-008'], note: 'added in the other tab' },
        'x-1': { id: 'x-1', text: 'made in the other tab', occurredAt: '2026-11-24T10:00:00.000Z', createdAt: '2026-11-24T10:00:00.000Z', toIds: ['old-001'] },
      },
    };
  };

  it('hidden: the page lets go and nothing changes on disk; shown again with nothing changed elsewhere: the same data, the same objects', async () => {
    const locks = fakeLocks();
    const page = fakePage();
    useDatabase('schema4.sqlite');
    const store = await load();
    await tick(30);
    const before = store.getState().data;
    page.hide();
    await tick(100);
    expect(locks.free()).toBe(true);
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'sqlite', reconnecting: true });
    expect(await onDisk()).toEqual({ ...NEW, schema: 4 });
    page.show();
    await tick(100);
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'sqlite' });
    expect(store.getState().data).toBe(before);
    expect(shown(store)).toEqual(NEW);
  });

  it('another tab changed three records meanwhile: taking the data back shows its changes and every other record exactly as it was, settings too', async () => {
    fakeLocks();
    const page = fakePage();
    useDatabase('schema4.sqlite');
    const store = await load();
    await tick(30);
    page.hide();
    await tick(100);
    await editElsewhere();
    page.show();
    await tick(100);
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'sqlite' });
    expect(shown(store)).toEqual({ data: afterElsewhere(), settings: NEW.settings });
    expect((await onDisk()).data).toEqual(afterElsewhere());
  });

  it('this page’s own change was only in the journal when it let go, and another tab changed other records: taking the data back keeps both, and loses nothing old', async () => {
    fakeLocks();
    const page = fakePage();
    useDatabase('schema4.sqlite');
    const store = await load();
    await tick(30);
    let open = () => {};
    writeGate = { promise: new Promise<void>((r) => (open = r)), open: () => open() };
    // A write in flight, and behind it a change that only the journal holds: the paused run's reason.
    expect(store.getState().createRoutine('Water the plants').ok).toBe(true);
    await tick(0);
    expect(store.getState().setPauseReason('new-002', 'the doorbell').ok).toBe(true);
    await tick(0);
    page.hide();
    writeGate.open();
    writeGate = undefined;
    await tick(30);
    expect((await onDisk()).data.runs['new-002'].reason).toBe('the phone rang');
    expect(JSON.parse(env.ls.get('wanderment:journal')!).changes.upsertRuns).toEqual([expect.objectContaining({ id: 'new-002', reason: 'the doorbell' })]);
    await editElsewhere();
    page.show();
    await tick(100);
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'sqlite' });
    const now = shown(store);
    const there = afterElsewhere();
    expect(now.settings).toEqual(NEW.settings);
    expect(now.data.threads).toEqual(there.threads);
    expect(now.data.activities).toEqual(there.activities);
    expect(now.data.runs['new-002']).toEqual({ ...NEW.data.runs['new-002'], reason: 'the doorbell' });
    expect(now.data.runs['new-011']).toEqual(NEW.data.runs['new-011']);
    expect(now.data.routines).toMatchObject(NEW.data.routines);
    expect(Object.keys(now.data.routines)).toHaveLength(4);
    expect(env.ls.has('wanderment:journal')).toBe(false);
    expect((await onDisk()).data).toEqual(now.data);
  });
});
