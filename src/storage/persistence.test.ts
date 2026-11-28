/**
 * Runs the real persistence module against real SQLite (node:sqlite), with localStorage and
 * AsyncStorage stubbed the way they behave on web. Each test is a fresh "page load".
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { person } from '@/test/records';

const env = vi.hoisted(() => {
  const ls = new Map<string, string>();
  const state = { dbPath: '', openError: undefined as Error | undefined, quotaKey: undefined as string | undefined, hangWrites: false };
  /** P-29: opens that fail before one succeeds, SQL that fails, and every open and write, in order. */
  const p29 = { failOpens: [] as Error[], failSql: undefined as { match: RegExp; error: Error } | undefined, opens: 0, writes: [] as string[] };
  const localStorage = {
    get length() {
      return ls.size;
    },
    key: (i: number) => [...ls.keys()][i] ?? null,
    getItem: (k: string) => (ls.has(k) ? ls.get(k)! : null),
    setItem: (k: string, v: string) => {
      if (state.quotaKey === k) throw new Error('QuotaExceededError');
      ls.set(k, String(v));
    },
    removeItem: (k: string) => void ls.delete(k),
  };
  (globalThis as { localStorage?: unknown }).localStorage = localStorage;
  return { ls, state, localStorage, p29 };
});

/** P-29 part B: lets a test wrap each opened database (to log, hold writes, or add the worker shutdown). */
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
      env.p29.opens++;
      if (env.state.openError) throw env.state.openError;
      const failure = env.p29.failOpens.shift();
      if (failure) throw failure;
      const db = nodeDb(env.state.dbPath);
      const sql = <A extends unknown[], R>(write: boolean, f: (q: string, ...rest: A) => Promise<R>) => async (q: string, ...rest: A) => {
        if (env.p29.failSql?.match.test(q)) throw env.p29.failSql.error;
        if (write) env.p29.writes.push(q);
        return f(q, ...rest);
      };
      const opened = {
        ...db,
        exec: sql(true, db.exec),
        run: sql(true, db.run),
        all: sql(false, db.all) as typeof db.all,
        // "The tab dies mid-write": transactions opened while hangWrites is on never commit.
        transaction: (task: () => Promise<void>) => (env.state.hangWrites ? new Promise<void>(() => {}) : db.transaction(task)),
      };
      return handoff.wrapDb?.(opened) ?? opened;
    },
  };
});
vi.mock('./nativeBackup', () => ({ scheduleBackup: () => {} }));

const at = '2026-11-01T10:00:00.000Z';
const act = (id: string, text: string, toIds: string[] = []) => ({ id, text, occurredAt: at, createdAt: at, toIds });
const legacyBlob = (data: unknown, extra: Record<string, unknown> = {}) => JSON.stringify({ state: { data, showShading: true, ...extra }, version: 1 });
const settle = () => new Promise((r) => setTimeout(r, 30));

/** A fresh page load: new modules, new store, same storage. */
async function load() {
  vi.resetModules();
  const { startPersistence } = await import('./persistence');
  const { useStore } = await import('@/store/useStore');
  await startPersistence();
  return useStore;
}
const texts = (store: Awaited<ReturnType<typeof load>>) => Object.values(store.getState().data.activities).map((a) => a.text).sort();
/**
 * P-89: the old app's actions are gone. Records are made and changed with the test-support builders
 * (`@/test/records`: the old app's own functions), put in the store as an action put them — so every
 * test below still goes through the real persistence module, its journal and real SQLite.
 */
const logText = (store: Awaited<ReturnType<typeof load>>, text: string) => void person(store).log(text);

beforeEach(() => {
  env.ls.clear();
  env.state.openError = undefined;
  env.state.quotaKey = undefined;
  env.state.hangWrites = false;
  env.state.dbPath = join(mkdtempSync(join(tmpdir(), 'wanderment-')), 'db.sqlite');
  env.p29.failOpens = [];
  env.p29.failSql = undefined;
  env.p29.opens = 0;
  env.p29.writes = [];
});

// A page left waiting would otherwise keep trying during later tests (a real page goes away).
afterEach(async () => (await import('./persistence')).stopPersistence());

describe('loading', () => {
  it('keeps the good records when one saved record is malformed', async () => {
    env.ls.set('wanderment', legacyBlob({ version: 1, threads: { t1: { id: 't1', name: '', hidden: false, createdAt: at } }, activities: { a1: act('a1', 'kept') } }));
    const store = await load();
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'sqlite' });
    expect(texts(store)).toEqual(['kept']);
  });

  it('blocks (with the blob untouched) instead of starting empty over data it can’t read', async () => {
    env.state.openError = new Error('no OPFS');
    env.ls.set('wanderment', '{not json');
    const store = await load();
    expect(store.getState().storage.state).toBe('blocked');
    expect(env.ls.get('wanderment')).toBe('{not json');
  });

  it('a second tab is blocked, even on the very first launch', async () => {
    env.state.openError = new Error("Failed to execute 'createSyncAccessHandle': Access Handles cannot be created if there is another open Access Handle");
    const store = await load();
    expect(store.getState().storage).toMatchObject({ state: 'blocked', message: expect.stringMatching(/another tab|somewhere else/) });
  });

  it('once SQLite has opened in this browser, a later failure blocks instead of falling back', async () => {
    await load();
    env.state.openError = new Error('disk I/O error');
    const store = await load();
    expect(store.getState().storage).toMatchObject({ state: 'blocked', message: expect.stringMatching(/disk I\/O error/) });
  });
});

describe('moving from the first release’s format', () => {
  it('moves into SQLite once, then removes the old key', async () => {
    env.ls.set('wanderment', legacyBlob({ version: 1, threads: {}, activities: { a1: act('a1', 'old') } }));
    let store = await load();
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'sqlite' });
    logText(store, 'new');
    await settle();
    store = await load();
    expect(texts(store)).toEqual(['new', 'old']);
    expect(env.ls.has('wanderment')).toBe(false);
  });

  it('records deleted here don’t come back from an old-version tab, but its new records are added', async () => {
    env.ls.set('wanderment', legacyBlob({ version: 1, threads: {}, activities: { a1: act('a1', 'one'), a2: act('a2', 'two') } }));
    let store = await load();
    person(store).removeActivity('a2');
    await settle();
    env.ls.set('wanderment', legacyBlob({ version: 1, threads: {}, activities: { a1: act('a1', 'one'), a2: act('a2', 'two'), a3: act('a3', 'three') } }));
    store = await load();
    expect(texts(store)).toEqual(['one', 'three']);
    // Even if everything is deleted, the old blob doesn't come back as a "first move".
    for (const id of Object.keys(store.getState().data.activities)) person(store).removeActivity(id);
    await settle();
    env.ls.set('wanderment', legacyBlob({ version: 1, threads: {}, activities: { a1: act('a1', 'one') } }));
    store = await load();
    expect(texts(store)).toEqual([]);
  });

  it('adds records an old-version tab wrote after the move, keeping newer copies', async () => {
    env.ls.set('wanderment', legacyBlob({ version: 1, threads: {}, activities: { a1: act('a1', 'old') } }));
    let store = await load();
    person(store).updateActivity('a1', { text: 'old, edited here' });
    await settle();
    // The old tab rewrites its whole (stale) state plus one new entry.
    env.ls.set('wanderment', legacyBlob({ version: 1, threads: {}, activities: { a1: act('a1', 'old'), a2: act('a2', 'from the old tab') } }));
    store = await load();
    expect(texts(store)).toEqual(['from the old tab', 'old, edited here']);
  });

  it('a browser that couldn’t run SQLite keeps its data and settings in the old format, then moves them once it can', async () => {
    env.state.openError = new Error('no OPFS');
    let store = await load();
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'local' });
    logText(store, 'in fallback');
    store.setState({ leftAsIs: ['x1'] });
    await settle();
    store = await load();
    expect(texts(store)).toEqual(['in fallback']);
    expect(store.getState().leftAsIs).toEqual(['x1']);

    env.state.openError = undefined;
    store = await load();
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'sqlite' });
    expect(texts(store)).toEqual(['in fallback']);
    expect(store.getState().leftAsIs).toEqual(['x1']);
  });
});

describe('saving', () => {
  it('a change survives the tab closing before SQLite commits (journal)', async () => {
    let store = await load();
    env.state.hangWrites = true;
    logText(store, 'one');
    await settle(); // the write was sent but never commits
    env.state.hangWrites = false;
    store = await load();
    expect(texts(store)).toEqual(['one']);
    expect(env.ls.has('wanderment:journal')).toBe(false);
  });

  it('a journal that can’t be replayed is set aside instead of blocking every start', async () => {
    await load();
    env.ls.set('wanderment:journal', JSON.stringify({ changes: { upsertThreads: [], deleteThreads: [], upsertActivities: [{ id: 'x', text: null }], deleteActivities: [] }, settings: {} }));
    const store = await load();
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'sqlite' });
    expect(store.getState().saveError).toMatch(/couldn’t be restored/);
    expect(env.ls.has('wanderment:journal')).toBe(false);
    expect([...env.ls.keys()].some((k) => k.startsWith('wanderment:journal-failed-'))).toBe(true);
  });

  it('undo, delete and later edits all land', async () => {
    let store = await load();
    logText(store, 'a');
    logText(store, 'b');
    await settle();
    const b = Object.values(store.getState().data.activities).find((x) => x.text === 'b')!;
    person(store).removeActivity(b.id);
    store.getState().undoLast();
    person(store).updateActivity(b.id, { note: 'kept' });
    store = await load();
    expect(texts(store)).toEqual(['a', 'b']);
    expect(store.getState().data.activities[b.id].note).toBe('kept');
  });
});

describe('asking the browser to keep the data', () => {
  /** Counts persist() calls; persisted() reports false until a call grants it. */
  function fakeStorageManager() {
    const calls = { persist: 0 };
    vi.stubGlobal('navigator', {
      userAgent: 'Chrome/140',
      storage: { persisted: async () => calls.persist > 0, persist: async () => ++calls.persist > 0 },
    });
    return calls;
  }

  it('asks once, after the first saved change, and never on load', async () => {
    const calls = fakeStorageManager();
    try {
      let store = await load();
      await settle();
      expect(calls.persist).toBe(0);
      logText(store, 'one');
      await settle();
      expect(calls.persist).toBe(1);
      logText(store, 'two');
      store.setState({ showShading: false });
      await settle();
      expect(calls.persist).toBe(1);
      // A reload without changes asks nothing.
      store = await load();
      await settle();
      expect(calls.persist).toBe(1);
      expect(texts(store)).toEqual(['one', 'two']);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('doesn’t ask before a save has committed', async () => {
    const calls = fakeStorageManager();
    try {
      const store = await load();
      env.state.hangWrites = true;
      logText(store, 'never commits');
      await settle();
      expect(calls.persist).toBe(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('a change that touches two kinds of record at once (a line attached to a wander made for it)', () => {
  it('then Undo leaves no wander on disk and the line unattached', async () => {
    let store = await load();
    const id = person(store).log('read a novel');
    person(store).attachToNew(id, 'reading');
    expect(Object.values(store.getState().data.threads).map((t) => t.name)).toEqual(['reading']);
    await settle();
    store.getState().undoLast();
    await settle();
    store = await load();
    expect(store.getState().data.threads).toEqual({});
    expect(store.getState().data.activities[id].toIds).toEqual([]);
  });
});

describe('what a thread is for (P-14)', () => {
  const marked = '2026-11-02T09:30:00.000Z';
  const thread = (extra: Record<string, unknown> = {}) => ({ id: 't1', name: 'practice drawing', hidden: false, createdAt: at, ...extra });
  const mark = (store: Awaited<ReturnType<typeof load>>, id = 't1') => store.getState().data.threads[id]?.declaredAt;
  const declared = (store: Awaited<ReturnType<typeof load>>) => {
    const id = person(store).createThread('practice drawing');
    expect(person(store).declareThread(id).ok).toBe(true);
    return { id, at: store.getState().data.threads[id].declaredAt! };
  };

  it('a mark from the first release’s format is moved into SQLite and read from there', async () => {
    env.ls.set('wanderment', legacyBlob({ version: 1, threads: { t1: thread({ declaredAt: marked }) }, activities: {} }));
    let store = await load();
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'sqlite' });
    expect(mark(store)).toBe(marked);
    store = await load();
    expect(env.ls.has('wanderment')).toBe(false);
    expect(mark(store)).toBe(marked);
  });

  it('declaring survives a reload, and so do a rename and a next step made afterwards', async () => {
    let store = await load();
    const d = declared(store);
    expect(d.at).toMatch(/^\d{4}-\d\d-\d\dT.*Z$/);
    await settle();
    store = await load();
    expect(mark(store, d.id)).toBe(d.at);

    // Every edit rewrites the whole row: none of them may drop the mark.
    expect(person(store).renameThread(d.id, 'draw').ok).toBe(true);
    await settle();
    store = await load();
    person(store).setNext(d.id, 'gesture study');
    await settle();
    store = await load();
    expect(store.getState().data.threads[d.id]).toEqual({ id: d.id, name: 'draw', next: 'gesture study', hidden: false, createdAt: expect.any(String), declaredAt: d.at });
  });

  it('Undo of a declare reads absent after a reload; Undo of an undeclare reads the original time', async () => {
    let store = await load();
    const d = declared(store);
    await settle();
    store.getState().undoLast();
    await settle();
    store = await load();
    expect(mark(store, d.id)).toBeUndefined();

    expect(person(store).declareThread(d.id).ok).toBe(true);
    const again = mark(store, d.id)!;
    await settle();
    person(store).undeclareThread(d.id);
    await settle();
    store = await load();
    expect(mark(store, d.id)).toBeUndefined();
    // Undo after the undeclare was saved puts the exact time back on disk.
    person(store).declareThread(d.id);
    const third = mark(store, d.id)!;
    expect(third >= again).toBe(true);
    await settle();
    person(store).undeclareThread(d.id);
    await settle();
    store.getState().undoLast();
    await settle();
    store = await load();
    expect(mark(store, d.id)).toBe(third);
  });

  it('hiding a declared thread unmarks it on disk; Undo restores both', async () => {
    let store = await load();
    const d = declared(store);
    await settle();
    person(store).setHidden(d.id, true);
    await settle();
    store = await load();
    expect(store.getState().data.threads[d.id]).toMatchObject({ hidden: true });
    expect(mark(store, d.id)).toBeUndefined();
    person(store).setHidden(d.id, false);
    person(store).declareThread(d.id);
    const at2 = mark(store, d.id)!;
    person(store).setHidden(d.id, true);
    store.getState().undoLast();
    await settle();
    store = await load();
    expect(store.getState().data.threads[d.id]).toMatchObject({ hidden: false, declaredAt: at2 });
  });

  it('a declare survives the tab closing before SQLite commits (journal)', async () => {
    let store = await load();
    const id = person(store).createThread('practice drawing');
    await settle();
    env.state.hangWrites = true;
    person(store).declareThread(id);
    const at2 = mark(store, id)!;
    await settle();
    env.state.hangWrites = false;
    store = await load();
    expect(mark(store, id)).toBe(at2);
    expect(env.ls.has('wanderment:journal')).toBe(false);
  });

  it('a browser that can’t run SQLite keeps the mark in the old format, then moves it once it can', async () => {
    env.state.openError = new Error('no OPFS');
    let store = await load();
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'local' });
    const d = declared(store);
    await settle();
    store = await load();
    expect(mark(store, d.id)).toBe(d.at);
    env.state.openError = undefined;
    store = await load();
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'sqlite' });
    expect(mark(store, d.id)).toBe(d.at);
  });

  it('export → import keeps the mark through a reload; a backup without one imports unmarked', async () => {
    const { toBackup, fromBackup } = await import('@/domain/backup');
    let store = await load();
    const d = declared(store);
    person(store).createThread('run');
    const json = toBackup(store.getState().data);
    person(store).undeclareThread(d.id);
    await settle();
    store.getState().replaceData(fromBackup(json));
    await settle();
    store = await load();
    expect(mark(store, d.id)).toBe(d.at);

    const bare = JSON.stringify({ app: 'wanderment', exportedAt: at, data: { version: 1, threads: { t1: thread() }, activities: {} } });
    store.getState().replaceData(fromBackup(bare));
    await settle();
    store = await load();
    expect(Object.keys(store.getState().data.threads)).toEqual(['t1']);
    expect(mark(store)).toBeUndefined();
  });
});

describe('lit and settled lines (P-73)', () => {
  /** A line sent up from the trailhead: lit, or (with the done chip) settled at once. */
  const lit = (store: Awaited<ReturnType<typeof load>>, text: string, done = false) => person(store).log(text, done ? { settled: true } : { lit: true });
  const line = (store: Awaited<ReturnType<typeof load>>, id: string) => store.getState().data.activities[id];

  it('a lit line, a done-chip line, Done it and its Undo all survive a reload in SQLite; a note edited later wipes nothing', async () => {
    let store = await load();
    const a = lit(store, 'sketch hands');
    const b = lit(store, 'read a chapter', true);
    const c = lit(store, 'went for a swim');
    person(store).settle(c); // Done it
    await settle();
    store = await load();
    expect(line(store, a)).toMatchObject({ lit: true });
    expect(line(store, a).settledAt).toBeUndefined();
    expect(line(store, b).lit).toBeUndefined();
    expect(line(store, b).settledAt).toMatch(/^\d{4}-\d\d-\d\dT.*Z$/);
    expect(line(store, c).lit).toBeUndefined();
    expect(line(store, c).settledAt).toEqual(expect.any(String));

    // Every edit rewrites the whole row: none may drop lit or settledAt.
    person(store).updateActivity(a, { note: 'with charcoal' });
    person(store).updateActivity(b, { note: 'chapter 3' });
    await settle();
    store = await load();
    expect(line(store, a)).toMatchObject({ lit: true, note: 'with charcoal' });
    expect(line(store, b)).toMatchObject({ settledAt: expect.any(String), note: 'chapter 3' });

    // Done it, then Undo, saved: lit again on disk.
    person(store).settle(a);
    await settle();
    expect(line(store, a).lit).toBeUndefined();
    store.getState().undoLast();
    await settle();
    store = await load();
    expect(line(store, a).lit).toBe(true);
    expect(line(store, a).settledAt).toBeUndefined();
  });

  it('↳ First step survives a reload (the wander, its step, the line settled toward it); a fresh page has no Undo for it', async () => {
    let store = await load();
    const a = lit(store, 'learn watercolour');
    expect(person(store).firstStep(a, 'buy a brush')).toBeDefined();
    const tid = line(store, a).doingId!;
    await settle();
    store = await load();
    expect(store.getState().data.threads[tid]).toMatchObject({ name: 'learn watercolour', next: 'buy a brush' });
    expect(line(store, a)).toMatchObject({ doingId: tid, settledAt: expect.any(String) });
    expect(line(store, a).lit).toBeUndefined();
    // A fresh page has no Undo for it: nothing changes.
    expect(store.getState().undo).toBeUndefined();
    const was = store.getState().data;
    store.getState().undoLast();
    expect(store.getState().data).toBe(was);
  });

  it('survives the tab closing before SQLite commits (journal)', async () => {
    let store = await load();
    await settle();
    env.state.hangWrites = true;
    const a = lit(store, 'sketch hands');
    const b = lit(store, 'read', true);
    await settle();
    env.state.hangWrites = false;
    store = await load();
    expect(line(store, a).lit).toBe(true);
    expect(line(store, b).settledAt).toEqual(expect.any(String));
    expect(env.ls.has('wanderment:journal')).toBe(false);
  });

  it('a browser that can’t run SQLite keeps them in the old format (localStorage), then moves them once it can', async () => {
    env.state.openError = new Error('no OPFS');
    let store = await load();
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'local' });
    const a = lit(store, 'sketch hands');
    const b = lit(store, 'read', true);
    const settledAt = line(store, b).settledAt;
    await settle();
    store = await load();
    expect(line(store, a).lit).toBe(true);
    expect(line(store, b).settledAt).toBe(settledAt);
    env.state.openError = undefined;
    store = await load();
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'sqlite' });
    expect(line(store, a).lit).toBe(true);
    expect(line(store, b).settledAt).toBe(settledAt);
  });

  it('the lenient load of a saved blob with a damaged record keeps the rest’s lit and settledAt', async () => {
    env.ls.set('wanderment', legacyBlob({ version: 1, threads: {}, activities: { a1: { ...act('a1', 'sketch'), lit: true }, a2: { ...act('a2', 'read'), settledAt: at }, bad: { id: 'bad' } } }));
    const store = await load();
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'sqlite' });
    expect(line(store, 'a1').lit).toBe(true);
    expect(line(store, 'a2').settledAt).toBe(at);
    expect(line(store, 'bad')).toBeUndefined();
  });

  it('export → import keeps both through a reload; an older export (no such fields) imports and reads settled', async () => {
    const { toBackup, fromBackup } = await import('@/domain/backup');
    let store = await load();
    const a = lit(store, 'sketch hands');
    const b = lit(store, 'read', true);
    const settledAt = line(store, b).settledAt;
    const json = toBackup(store.getState().data);
    person(store).removeActivity(a);
    await settle();
    store.getState().replaceData(fromBackup(json));
    await settle();
    store = await load();
    expect(line(store, a).lit).toBe(true);
    expect(line(store, b).settledAt).toBe(settledAt);

    const older = JSON.stringify({ app: 'wanderment', exportedAt: at, data: { version: 1, threads: {}, activities: { o1: act('o1', 'scales') } } });
    store.getState().replaceData(fromBackup(older));
    await settle();
    store = await load();
    expect(Object.keys(store.getState().data.activities)).toEqual(['o1']);
    expect(line(store, 'o1').lit).toBeUndefined();
    expect(line(store, 'o1').settledAt).toBeUndefined();
  });
});

describe('another copy of the app holds the data (P-29)', () => {
  const WEBKIT_HELD = 'The object is in an invalid state.';
  const held = () => new Error(WEBKIT_HELD);
  const ANOTHER_TAB = 'The app is open in another tab or window. It’ll open here as soon as that one is closed or in the background.';
  const ELSEWHERE =
    'The app is still open somewhere else in this browser — maybe an old tab, or a page in a tab’s history. Close its other tabs; if this stays, quit the browser and reopen it. Your data is safe; this page will open by itself.';
  type Store = Awaited<ReturnType<typeof load>>;
  const tick = (ms: number) => vi.advanceTimersByTimeAsync(ms);
  const snapshot = () => JSON.stringify([...env.ls.entries()].sort());

  /** Every storage status the page shows from now on, and the data it shows with it. */
  function watch(store: Store) {
    const seen: { storage: unknown; texts: string[] }[] = [];
    store.subscribe((s, prev) => {
      if (s.storage !== prev.storage) seen.push({ storage: s.storage, texts: Object.values(s.data.activities).map((a) => a.text) });
    });
    return seen;
  }

  /** navigator.locks with one lock that another page can hold and let go of; requests queue. */
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
    const locks = {
      request(_name: string, opts: { ifAvailable?: boolean; signal?: AbortSignal }, cb: (lock: unknown) => unknown) {
        if (!busy) return grant(cb);
        if (opts.ifAvailable) return Promise.resolve(cb(null));
        return new Promise((resolve, reject) => {
          const go = () => resolve(grant(cb));
          queue.push(go);
          opts.signal?.addEventListener('abort', () => {
            queue.splice(queue.indexOf(go), 1);
            reject(new Error('AbortError'));
          });
        });
      },
    };
    vi.stubGlobal('navigator', { locks });
    /** Another page takes the lock; call the result to let go. */
    const holdElsewhere = () => {
      let release = () => {};
      void locks.request('wanderment-data', {}, () => new Promise<void>((r) => (release = r)));
      return () => release();
    };
    return { holdElsewhere, waiting: () => queue.length };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('waits while the files are held (WebKit’s text), tries again by itself, and opens with no reload — writing nothing meanwhile', async () => {
    let store = await load();
    logText(store, 'kept');
    await tick(30);
    env.p29.opens = 0;
    env.p29.writes = [];
    env.p29.failOpens = [held(), held(), held()];
    const before = snapshot();

    store = await load();
    const seen = watch(store);
    expect(store.getState().storage).toEqual({ state: 'blocked', waiting: true, message: ELSEWHERE, details: `Details: open · ${WEBKIT_HELD}` });
    expect(store.getState().data.activities).toEqual({});
    expect(env.p29.opens).toBe(1);
    // About 0.25 s, then 0.5 s, then 1 s.
    await tick(249);
    expect(env.p29.opens).toBe(1);
    await tick(1);
    expect(env.p29.opens).toBe(2);
    await tick(500);
    expect(env.p29.opens).toBe(3);
    // Still waiting: nothing written anywhere, nothing shown, and the screen wasn't set again.
    expect(env.p29.writes).toEqual([]);
    expect(snapshot()).toBe(before);
    expect(seen).toEqual([]);

    await tick(1000);
    expect(env.p29.opens).toBe(4);
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'sqlite' });
    // Straight from waiting to the saved data: never an empty app.
    expect(seen).toEqual([{ storage: { state: 'ready', kind: 'sqlite' }, texts: ['kept'] }]);
    logText(store, 'after waiting');
    await tick(30);
    store = await load();
    expect(texts(store)).toEqual(['after waiting', 'kept']);
  });

  it('keeps waiting while the files stay held — on the very first launch too, never falling back to local storage', async () => {
    env.p29.failOpens = Array.from({ length: 100 }, held);
    const store = await load();
    const seen = watch(store);
    expect(store.getState().storage).toMatchObject({ state: 'blocked', waiting: true, message: ELSEWHERE });
    await tick(60_000);
    // 0.25 + 0.5 + 1 + 2 + 4 s, then every 5 s: 5 + 10 more tries in the first minute.
    expect(env.p29.opens).toBe(16);
    expect(store.getState().storage).toMatchObject({ state: 'blocked', waiting: true, message: ELSEWHERE });
    expect(seen).toEqual([]);
    expect(env.p29.writes).toEqual([]);
    expect([...env.ls.keys()]).toEqual([]);
  });

  it('while another tab holds the tab lock it says so, queues for the lock instead of polling, and opens when it’s let go', async () => {
    let store = await load();
    logText(store, 'from the other tab');
    await tick(30);
    const locks = fakeLocks();
    const letGo = locks.holdElsewhere();
    env.p29.opens = 0;

    store = await load();
    expect(store.getState().storage).toEqual({ state: 'blocked', waiting: true, message: ANOTHER_TAB, details: 'Details: tab lock · another page holds it' });
    await tick(60_000);
    expect(env.p29.opens).toBe(0);
    expect(locks.waiting()).toBe(1);

    letGo();
    await tick(0);
    expect(env.p29.opens).toBe(1);
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'sqlite' });
    expect(texts(store)).toEqual(['from the other tab']);
  });

  it('private browsing / no OPFS (UnknownError) keeps today’s path: local storage first, a plain blocked screen later', async () => {
    const unknown = () => new Error('The operation failed for an unknown transient reason (e.g. out of memory).');
    env.p29.failOpens = [unknown()];
    let store = await load();
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'local' });

    env.p29.failOpens = [];
    await load();
    env.p29.failOpens = [unknown(), unknown()];
    env.p29.opens = 0;
    store = await load();
    expect(store.getState().storage).toEqual({
      state: 'blocked',
      message: `The app couldn’t open its data (${unknown().message}). Reload to try again.`,
      details: `Details: open · ${unknown().message}`,
    });
    await tick(60_000);
    expect(env.p29.opens).toBe(1);
  });

  it('the plain “couldn’t open” screen says which step failed, and doesn’t loop', async () => {
    const io = () => new Error('disk I/O error');
    const legacy = legacyBlob({ version: 1, threads: {}, activities: { a1: act('a1', 'old') } });
    const cases = [
      { step: 'open', setup: () => (env.p29.failOpens = [io()]) },
      { step: 'migrate', setup: () => (env.p29.failSql = { match: /^PRAGMA user_version$/, error: io() }) },
      { step: 'absorb', setup: () => (env.ls.set('wanderment', legacy), (env.p29.failSql = { match: /INSERT OR REPLACE INTO activities/, error: io() })) },
      { step: 'load', setup: () => (env.p29.failSql = { match: /^SELECT \* FROM threads$/, error: io() }) },
    ];
    for (const { step, setup } of cases) {
      await load();
      setup();
      env.p29.opens = 0;
      const store = await load();
      expect(store.getState().storage, step).toEqual({
        state: 'blocked',
        message: 'The app couldn’t open its data (disk I/O error). Reload to try again.',
        details: `Details: ${step} · disk I/O error`,
      });
      await tick(60_000);
      expect(env.p29.opens, step).toBe(1);
      (await import('./persistence')).stopPersistence();
      env.p29.failSql = undefined;
      env.ls.delete('wanderment');
    }
  });

  it('a journal that can’t be replayed because the data is held is kept (not set aside), and lands once it’s free', async () => {
    let store = await load();
    // A journal left by an older version: its settings lack newer keys.
    env.ls.set(
      'wanderment:journal',
      JSON.stringify({ changes: { upsertThreads: [], deleteThreads: [], upsertActivities: [act('j1', 'from the journal')], deleteActivities: [] }, settings: { showShading: false } }),
    );
    const journal = env.ls.get('wanderment:journal');
    env.p29.failSql = { match: /INSERT OR REPLACE INTO activities/, error: new Error('database is locked') };

    store = await load();
    expect(store.getState().storage).toEqual({ state: 'blocked', waiting: true, message: ELSEWHERE, details: 'Details: journal · database is locked' });
    await tick(250);
    expect(env.p29.opens).toBe(3);
    expect(env.ls.get('wanderment:journal')).toBe(journal);
    expect([...env.ls.keys()].some((k) => k.startsWith('wanderment:journal-failed-'))).toBe(false);

    env.p29.failSql = undefined;
    await tick(500);
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'sqlite' });
    expect(store.getState().saveError).toBeUndefined();
    expect(texts(store)).toEqual(['from the journal']);
    expect(store.getState().showShading).toBe(false);
    expect(env.ls.has('wanderment:journal')).toBe(false);
  });
});

describe('holding the data only while the page is visible (P-29 part B)', () => {
  type Store = Awaited<ReturnType<typeof load>>;
  const tick = (ms: number) => vi.advanceTimersByTimeAsync(ms);
  const TAB_HELD = 'The app is open in another tab or window. It’ll open here as soon as that one is closed or in the background.';
  const READY = { state: 'ready', kind: 'sqlite' };
  const RECONNECTING = { state: 'ready', kind: 'sqlite', reconnecting: true };
  /** What happened, in order: commits, the journal clearing, close, shutdown, the tab lock going. */
  const log: string[] = [];
  const deferred = () => {
    let open = () => {};
    const promise = new Promise<void>((r) => (open = r));
    return { promise, open };
  };
  /** While set, writes wait for it (a write in flight); and the worker's shutdown waits for its own. */
  let writeGate: ReturnType<typeof deferred> | undefined;
  let shutdownGate: ReturnType<typeof deferred> | undefined;
  /** False: the expo-sqlite worker wasn't found, so there's no shutdown. */
  let canShutdown = true;

  /** A web page's document and window: visibility, lifecycle events and other pages' storage events. */
  function fakePage() {
    const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' as 'visible' | 'hidden' });
    const win = new EventTarget();
    vi.stubGlobal('document', doc);
    vi.stubGlobal('window', win);
    const set = (v: 'visible' | 'hidden') => {
      doc.visibilityState = v;
      doc.dispatchEvent(new Event('visibilitychange'));
    };
    return {
      hide: () => set('hidden'),
      show: () => set('visible'),
      fire: (on: 'document' | 'window', type: string) => (on === 'document' ? doc : win).dispatchEvent(new Event(type)),
      storageEvent: (key: string, newValue: string | null) => win.dispatchEvent(Object.assign(new Event('storage'), { key, newValue })),
    };
  }
  let page: ReturnType<typeof fakePage>;

  /** navigator.locks with one lock; requests queue; this page's releases are logged. */
  function fakeLocks() {
    let busy = false;
    const queue: (() => void)[] = [];
    const grant = async (cb: (lock: unknown) => unknown, mine: boolean) => {
      busy = true;
      try {
        return await cb({ name: 'wanderment-data', mode: 'exclusive' });
      } finally {
        busy = false;
        if (mine) log.push('lock released');
        queue.shift()?.();
      }
    };
    const request = (opts: { ifAvailable?: boolean; signal?: AbortSignal }, cb: (lock: unknown) => unknown, mine: boolean) => {
      if (!busy) return grant(cb, mine);
      if (opts.ifAvailable) return Promise.resolve(cb(null));
      return new Promise((resolve, reject) => {
        const go = () => resolve(grant(cb, mine));
        queue.push(go);
        opts.signal?.addEventListener('abort', () => {
          if (queue.includes(go)) queue.splice(queue.indexOf(go), 1);
          reject(new Error('AbortError'));
        });
      });
    };
    vi.stubGlobal('navigator', { locks: { request: (_name: string, opts: object, cb: (lock: unknown) => unknown) => request(opts, cb, true) } });
    return {
      /** Another page takes the lock (queueing if needed); call the result to let go. */
      holdElsewhere: () => {
        let release = () => {};
        void request({}, () => new Promise<void>((r) => (release = r)), false);
        return () => release();
      },
      free: () => !busy,
      waiting: () => queue.length,
    };
  }

  /** What's saved, read straight from the database file (as another page would). */
  async function onDisk() {
    const { nodeDb } = await import('./nodeDb');
    const { loadData } = await import('./repository');
    const db = nodeDb(env.state.dbPath);
    try {
      return await loadData(db);
    } finally {
      db.close();
    }
  }
  /** Another page writes to the database while this one has let go. */
  async function writeElsewhere(text: string) {
    const { nodeDb } = await import('./nodeDb');
    const { saveChanges } = await import('./repository');
    const db = nodeDb(env.state.dbPath);
    await saveChanges(db, { upsertThreads: [], deleteThreads: [], upsertActivities: [act(`x-${text}`, text)], deleteActivities: [] });
    db.close();
  }
  const diskTexts = async () => Object.values((await onDisk()).activities).map((a) => a.text).sort();
  const idOf = (store: Store, text: string) => Object.values(store.getState().data.activities).find((a) => a.text === text)!.id;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    log.length = 0;
    writeGate = undefined;
    shutdownGate = undefined;
    canShutdown = true;
    page = fakePage();
    handoff.wrapDb = (db) => ({
      ...db,
      transaction: async (task) => {
        if (writeGate) await writeGate.promise;
        await db.transaction(task);
        log.push('commit');
      },
      close: async () => {
        log.push('close');
        await db.close?.();
      },
      ...(canShutdown && {
        shutdown: async () => {
          if (shutdownGate) await shutdownGate.promise;
          log.push('shutdown');
        },
      }),
    });
    vi.spyOn(env.localStorage, 'removeItem').mockImplementation((k: string) => {
      if (k === 'wanderment:journal' && env.ls.has(k)) log.push('journal cleared');
      env.ls.delete(k);
    });
  });
  afterEach(() => {
    handoff.wrapDb = undefined;
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('hidden with a write in flight: the write lands first and clears the journal, then close → shutdown → the tab lock goes', async () => {
    const locks = fakeLocks();
    const store = await load();
    await tick(30);
    log.length = 0;
    writeGate = deferred();
    logText(store, 'in flight');
    await tick(0);
    page.hide();
    await tick(1000);
    // Still writing: nothing closed, the change safe in the journal, the lock kept.
    expect(log).toEqual([]);
    expect(env.ls.has('wanderment:journal')).toBe(true);
    expect(locks.free()).toBe(false);

    writeGate.open();
    await tick(0);
    expect(log).toEqual(['commit', 'journal cleared', 'close', 'shutdown', 'lock released']);
    expect(locks.free()).toBe(true);
    expect(await diskTexts()).toEqual(['in flight']);
    // The data stays on screen; logging waits until it's taken back.
    expect(store.getState().storage).toEqual(RECONNECTING);
    expect(texts(store)).toEqual(['in flight']);
  });

  it('a change queued behind the write in flight isn’t started once hidden: it waits in the journal, and survives the page never coming back', async () => {
    fakeLocks();
    const store = await load();
    await tick(30);
    log.length = 0;
    writeGate = deferred();
    logText(store, 'in flight');
    await tick(0);
    logText(store, 'queued');
    await tick(0);
    page.hide();
    writeGate.open();
    await tick(30);
    // No new write started, and the journal (now holding only the queued change) wasn't cleared.
    expect(log).toEqual(['commit', 'close', 'shutdown', 'lock released']);
    expect(await diskTexts()).toEqual(['in flight']);
    expect(JSON.parse(env.ls.get('wanderment:journal')!).changes.upsertActivities).toEqual([expect.objectContaining({ text: 'queued' })]);
    page = fakePage();
    const next = await load();
    expect(texts(next)).toEqual(['in flight', 'queued']);
  });

  it('a change only in the journal when the page let go, replayed by another page that then edits the same record, isn’t put back over that edit when this page takes the data back', async () => {
    fakeLocks();
    const store = await load();
    logText(store, 'alpha');
    await tick(30);
    const id = idOf(store, 'alpha');
    writeGate = deferred();
    person(store).updateActivity(id, { note: 'n1' });
    await tick(0);
    person(store).updateActivity(id, { note: 'from B' }); // queued behind the write in flight
    await tick(0);
    page.hide();
    writeGate.open();
    await tick(30);
    // "from B" is only in the journal.
    expect((await onDisk()).activities[id].note).toBe('n1');
    expect(JSON.parse(env.ls.get('wanderment:journal')!).changes.upsertActivities).toEqual([expect.objectContaining({ note: 'from B' })]);
    // Another page opens: it replays the journal (as persistence does), then edits the same record.
    const { nodeDb } = await import('./nodeDb');
    const { saveChanges, loadData } = await import('./repository');
    const db = nodeDb(env.state.dbPath);
    await saveChanges(db, JSON.parse(env.ls.get('wanderment:journal')!).changes);
    env.ls.delete('wanderment:journal');
    const there = await loadData(db);
    await saveChanges(db, { upsertThreads: [], deleteThreads: [], upsertActivities: [{ ...there.activities[id], note: 'from B and A' }], deleteActivities: [] });
    db.close();

    page.show();
    await tick(100);
    expect(store.getState().storage).toEqual(READY);
    expect(store.getState().data.activities[id].note).toBe('from B and A');
    expect((await onDisk()).activities[id].note).toBe('from B and A');
  });

  it('a change only in the journal when the page let go, with nobody opening meanwhile: taking the data back replays it once — nothing lost, nothing twice', async () => {
    fakeLocks();
    const store = await load();
    logText(store, 'alpha');
    await tick(30);
    const id = idOf(store, 'alpha');
    writeGate = deferred();
    logText(store, 'in flight');
    await tick(0);
    logText(store, 'queued');
    person(store).updateActivity(id, { note: 'edited' });
    await tick(0);
    page.hide();
    writeGate.open();
    await tick(30);
    expect(await diskTexts()).toEqual(['alpha', 'in flight']);
    expect(env.ls.has('wanderment:journal')).toBe(true);

    page.show();
    await tick(100);
    expect(store.getState().storage).toEqual(READY);
    expect(texts(store)).toEqual(['alpha', 'in flight', 'queued']);
    expect(await diskTexts()).toEqual(['alpha', 'in flight', 'queued']);
    expect(store.getState().data.activities[id].note).toBe('edited');
    expect((await onDisk()).activities[id].note).toBe('edited');
    expect(env.ls.has('wanderment:journal')).toBe(false);
    // Its own change, so Undo (of the last change) is kept and still works.
    expect(store.getState().undo).toBeDefined();
  });

  // Audit 3 D1: letting go may count unwritten changes as saved only when the journal verifiably
  // holds them; otherwise (or when the journal is set aside) taking the data back puts them back.
  describe('unsaved changes are never dropped by letting go (audit 3 D1)', () => {
    const io = () => new Error('disk I/O error');
    const failWrites = () => (env.p29.failSql = { match: /^(INSERT|DELETE|UPDATE)/i, error: io() });
    const SAVE_FAILED = 'Your last change couldn’t be saved. Export a backup from Settings to be safe.';

    it('1. a save that keeps failing, then a tab switch: the change stays on screen with a banner, and lands once writes work', async () => {
      fakeLocks();
      const store = await load();
      logText(store, 'alpha');
      await tick(30);
      failWrites();
      logText(store, 'unsaved');
      await tick(30);
      expect(store.getState().saveError).toBe(SAVE_FAILED);
      page.hide();
      await tick(30);
      page.show();
      await tick(100);
      expect(store.getState().storage).toEqual(READY);
      // Its own replay failed the same way (set aside): the change is still on screen, and a banner says so.
      expect(texts(store)).toEqual(['alpha', 'unsaved']);
      expect(store.getState().saveError).toBeDefined();
      // Writes work again: the next save carries it.
      env.p29.failSql = undefined;
      logText(store, 'later');
      await tick(30);
      expect(await diskTexts()).toEqual(['alpha', 'later', 'unsaved']);
      expect(store.getState().saveError).toBeUndefined();
    });

    it('2. the journal can’t be written (quota) and a change is queued behind the write in flight when the page lets go: it’s kept, on screen and on disk', async () => {
      fakeLocks();
      const store = await load();
      await tick(30);
      env.state.quotaKey = 'wanderment:journal';
      writeGate = deferred();
      logText(store, 'in flight');
      await tick(0);
      logText(store, 'queued');
      await tick(0);
      page.hide();
      writeGate.open();
      writeGate = undefined;
      await tick(30);
      expect(await diskTexts()).toEqual(['in flight']);
      page.show();
      await tick(100);
      expect(store.getState().storage).toEqual(READY);
      expect(texts(store)).toEqual(['in flight', 'queued']);
      expect(await diskTexts()).toEqual(['in flight', 'queued']);
    });

    it('3. the journal can’t be written and a note is still being typed when the page lets go: every character is kept', async () => {
      fakeLocks();
      const store = await load();
      logText(store, 'alpha');
      await tick(30);
      const id = idOf(store, 'alpha');
      env.state.quotaKey = 'wanderment:journal';
      writeGate = deferred();
      let typed = '';
      for (const c of 'abcdefghijkl') {
        typed += c;
        person(store).updateActivity(id, { note: typed });
        await tick(0);
      }
      page.hide();
      writeGate.open();
      writeGate = undefined;
      await tick(30);
      page.show();
      await tick(100);
      expect(store.getState().data.activities[id].note).toBe('abcdefghijkl');
      expect((await onDisk()).activities[id].note).toBe('abcdefghijkl');
    });

    it('4. another page set this page’s journal aside (its replay failed there): taking the data back puts the change back, and saves it', async () => {
      fakeLocks();
      const store = await load();
      await tick(30);
      writeGate = deferred();
      logText(store, 'in flight');
      await tick(0);
      logText(store, 'queued');
      await tick(0);
      page.hide();
      writeGate.open();
      writeGate = undefined;
      await tick(30);
      // The other page's replay failed: it set the journal aside, as persistence does.
      const raw = env.ls.get('wanderment:journal')!;
      expect(JSON.parse(raw).changes.upsertActivities).toEqual([expect.objectContaining({ text: 'queued' })]);
      env.ls.set('wanderment:journal-failed-1', raw);
      env.ls.delete('wanderment:journal');
      page.show();
      await tick(100);
      expect(texts(store)).toEqual(['in flight', 'queued']);
      expect(await diskTexts()).toEqual(['in flight', 'queued']);
    });

    it('5. a write error that lasts across one hide/show, then heals: nothing is lost', async () => {
      fakeLocks();
      const store = await load();
      logText(store, 'alpha');
      await tick(30);
      const id = idOf(store, 'alpha');
      failWrites();
      person(store).updateActivity(id, { note: 'kept note' });
      logText(store, 'unsaved');
      await tick(30);
      page.hide();
      await tick(30);
      page.show();
      await tick(100);
      env.p29.failSql = undefined;
      expect(texts(store)).toEqual(['alpha', 'unsaved']);
      expect(store.getState().data.activities[id].note).toBe('kept note');
      store.setState({ showShading: false }); // any next change saves everything pending
      await tick(30);
      expect(await diskTexts()).toEqual(['alpha', 'unsaved']);
      expect((await onDisk()).activities[id].note).toBe('kept note');
    });

    it('a save that writes nothing (taking the data back) doesn’t clear the “couldn’t be restored” banner', async () => {
      fakeLocks();
      const store = await load();
      logText(store, 'alpha');
      await tick(30);
      page.hide();
      await tick(30);
      // Another page wrote meanwhile, and left a journal that can't be replayed: set aside when this page takes the data back.
      await writeElsewhere('from elsewhere');
      env.ls.set('wanderment:journal', JSON.stringify({ changes: { upsertThreads: [], deleteThreads: [], upsertActivities: [{ id: 'bad' }], deleteActivities: [] } }));
      page.show();
      await tick(100);
      expect(store.getState().storage).toEqual(READY);
      expect(texts(store)).toEqual(['alpha', 'from elsewhere']);
      expect(store.getState().saveError).toBe('A change from your last visit couldn’t be restored. Check your latest entries.');
    });
  });

  // Rework after audit (F1, F6): a page that doesn't hold the data can't change it. These two
  // replaced "a change made while hidden waits in the journal and lands later".
  it('a change tried while hidden is refused: nothing changes, nothing is written or journaled; shown again, it works', async () => {
    fakeLocks();
    const store = await load();
    logText(store, 'before');
    await tick(30);
    page.hide();
    await tick(30);
    expect(log.slice(-3)).toEqual(['close', 'shutdown', 'lock released']);
    env.p29.writes = [];
    const { data } = store.getState();
    expect(store.getState().createRoutine('while hidden')).toEqual({ ok: false, reason: 'reconnecting' });
    await tick(1000);
    expect(store.getState().data).toBe(data);
    expect(store.getState().toast).toEqual({ message: 'Just a moment — reconnecting.', notice: true });
    expect(env.p29.writes).toEqual([]);
    expect(env.ls.has('wanderment:journal')).toBe(false);

    page.show();
    await tick(30);
    expect(store.getState().storage).toEqual(READY);
    person(store).updateActivity(idOf(store, 'before'), { note: 'once shown' });
    await tick(30);
    expect(Object.values((await onDisk()).activities)[0].note).toBe('once shown');
    expect(env.ls.has('wanderment:journal')).toBe(false);
  });

  it('a page that never comes back leaves nothing half-done: what it refused isn’t anywhere, what it saved is', async () => {
    fakeLocks();
    const store = await load();
    logText(store, 'before');
    await tick(30);
    page.hide();
    await tick(30);
    expect(store.getState().createRoutine('while hidden').ok).toBe(false);
    await tick(30);
    // The page is gone (iOS dropped it); another one opens.
    page = fakePage();
    const next = await load();
    expect(next.getState().storage).toEqual(READY);
    expect(texts(next)).toEqual(['before']);
    expect(next.getState().data.routines).toEqual({});
    expect(next.getState().data.runs).toEqual({});
  });

  it('shown again, it shows what another page saved meanwhile, keeps the draft, and drops Undo', async () => {
    fakeLocks();
    const store = await load();
    logText(store, 'mine');
    await tick(30);
    expect(store.getState().undo).toBeDefined();
    page.hide();
    await tick(30);
    await writeElsewhere('from another tab');
    store.setState({ draft: { text: 'half-typed', toIds: [] } });

    page.show();
    await tick(30);
    expect(store.getState().storage).toEqual(READY);
    expect(texts(store)).toEqual(['from another tab', 'mine']);
    expect(store.getState().draft.text).toBe('half-typed');
    expect(store.getState().undo).toBeUndefined();
    // And it's this page's to write again.
    logText(store, 'after');
    await tick(30);
    expect(await diskTexts()).toEqual(['after', 'from another tab', 'mine']);
  });

  it('shown again with nothing changed meanwhile, it keeps Undo and what’s on screen as it was', async () => {
    fakeLocks();
    const store = await load();
    logText(store, 'mine');
    await tick(30);
    const { data, undo } = store.getState();
    page.hide();
    await tick(30);
    page.show();
    await tick(30);
    expect(store.getState().storage).toEqual(READY);
    expect(store.getState().data).toBe(data);
    expect(store.getState().undo).toBe(undo);
    store.getState().undoLast();
    await tick(30);
    expect(await diskTexts()).toEqual([]);
  });

  it('while another page holds the data it keeps showing its own, with “Reconnecting…”, then says so — once — and opens when it’s free', async () => {
    const locks = fakeLocks();
    const store = await load();
    logText(store, 'mine');
    await tick(30);
    page.hide();
    await tick(30);
    const letGo = locks.holdElsewhere();
    store.setState({ draft: { text: 'typing', toIds: [] } });
    const seen: unknown[] = [];
    store.subscribe((s, prev) => s.storage !== prev.storage && seen.push(s.storage));

    page.show();
    await tick(3990);
    expect(store.getState().storage).toEqual(RECONNECTING);
    expect(texts(store)).toEqual(['mine']);
    await tick(10);
    expect(store.getState().storage).toEqual({ state: 'blocked', waiting: true, message: TAB_HELD, details: 'Details: tab lock · another page holds it' });
    await tick(60_000);
    expect(seen).toHaveLength(1);

    letGo();
    await tick(0);
    expect(store.getState().storage).toEqual(READY);
    expect(texts(store)).toEqual(['mine']);
    expect(store.getState().draft.text).toBe('typing');
  });

  it('two visible pages don’t take turns: the one holding the data never lets go because another asks', async () => {
    const locks = fakeLocks();
    const store = await load();
    log.length = 0;
    // Another page queues for the data, and pings as if it had let go of something.
    locks.holdElsewhere();
    page.storageEvent('wanderment:released', '1');
    await tick(60_000);
    expect(log).toEqual([]);
    expect(store.getState().storage).toEqual(READY);
  });

  it('hidden while waiting: it stops queueing and lets go of the tab lock; shown again, it tries again', async () => {
    const locks = fakeLocks();
    const letGo = locks.holdElsewhere();
    const store = await load();
    expect(store.getState().storage).toMatchObject({ state: 'blocked', waiting: true, message: TAB_HELD });
    expect(locks.waiting()).toBe(1);
    page.hide();
    await tick(0);
    expect(locks.waiting()).toBe(0);
    letGo();
    await tick(60_000);
    expect(locks.free()).toBe(true);
    expect(env.p29.opens).toBe(0);
    page.show();
    await tick(0);
    expect(store.getState().storage).toEqual(READY);
    expect(env.p29.opens).toBe(1);
  });

  it('hidden while the files are busy: the tab lock it was keeping goes too', async () => {
    const locks = fakeLocks();
    env.p29.failOpens = Array.from({ length: 100 }, () => new Error('The object is in an invalid state.'));
    const store = await load();
    expect(store.getState().storage).toMatchObject({ state: 'blocked', waiting: true });
    expect(locks.free()).toBe(false);
    page.hide();
    await tick(0);
    expect(locks.free()).toBe(true);
    const opens = env.p29.opens;
    await tick(60_000);
    expect(env.p29.opens).toBe(opens);
    env.p29.failOpens = [];
    page.show();
    await tick(0);
    expect(store.getState().storage).toEqual(READY);
  });

  it('another page letting go wakes a waiting page at once', async () => {
    fakeLocks();
    env.p29.failOpens = Array.from({ length: 6 }, () => new Error('The object is in an invalid state.'));
    const store = await load();
    // Through the quick tries (0.25 + 0.5 + 1 + 2 + 4 s) into the 5 s ones.
    await tick(7750);
    expect(env.p29.opens).toBe(6);
    await tick(100);
    page.storageEvent('wanderment:released', String(Date.now()));
    await tick(0);
    expect(env.p29.opens).toBe(7);
    expect(store.getState().storage).toEqual(READY);
  });

  it('races: hidden while opening, it shows the data and lets go right after; shown while closing, it takes it back once closed', async () => {
    const locks = fakeLocks();
    vi.resetModules();
    const { startPersistence } = await import('./persistence');
    const { useStore: store } = await import('@/store/useStore');
    const starting = startPersistence();
    page.hide();
    await starting;
    await tick(30);
    expect(env.p29.opens).toBe(1);
    expect(store.getState().storage).toEqual(RECONNECTING);
    expect(log.slice(-3)).toEqual(['close', 'shutdown', 'lock released']);
    expect(locks.free()).toBe(true);

    page.show();
    await tick(30);
    expect(store.getState().storage).toEqual(READY);
    expect(env.p29.opens).toBe(2);

    shutdownGate = deferred();
    page.hide();
    await tick(30);
    page.show();
    await tick(30);
    // Still closing: it doesn't open over itself.
    expect(env.p29.opens).toBe(2);
    shutdownGate.open();
    await tick(30);
    const closed = log.lastIndexOf('shutdown');
    expect(log.slice(closed, closed + 2)).toEqual(['shutdown', 'lock released']);
    expect(env.p29.opens).toBe(3);
    expect(store.getState().storage).toEqual(READY);
    expect(locks.free()).toBe(false);
  });

  it('races: many quick hide/show toggles end with exactly what the last one asks for', async () => {
    const locks = fakeLocks();
    const store = await load();
    for (let i = 0; i < 25; i++) {
      page.hide();
      page.show();
      if (i % 5 === 0) await tick(0);
    }
    await tick(100);
    expect(store.getState().storage).toEqual(READY);
    expect(locks.free()).toBe(false);
    const shutdowns = log.filter((e) => e === 'shutdown').length;
    expect(env.p29.opens).toBe(shutdowns + 1);
    for (let i = 0; i < 25; i++) {
      page.show();
      page.hide();
    }
    await tick(100);
    expect(store.getState().storage).toEqual(RECONNECTING);
    expect(locks.free()).toBe(true);
    expect(log.filter((e) => e === 'shutdown').length).toBe(env.p29.opens);
    page.show();
    await tick(100);
    logText(store, 'still saved');
    await tick(30);
    expect(await diskTexts()).toEqual(['still saved']);
  });

  // Rework after audit (F13): a frozen page can't run its release, so `freeze` no longer counts as one.
  it('pagehide/pageshow let go and take back too; freeze doesn’t let go, and resume takes back', async () => {
    const locks = fakeLocks();
    const store = await load();
    page.fire('window', 'pagehide');
    await tick(30);
    expect(locks.free()).toBe(true);
    expect(store.getState().storage).toEqual(RECONNECTING);
    page.fire('window', 'pageshow');
    await tick(30);
    expect(locks.free()).toBe(false);
    expect(store.getState().storage).toEqual(READY);

    page.fire('document', 'freeze');
    await tick(30);
    expect(locks.free()).toBe(false);
    expect(store.getState().storage).toEqual(READY);

    // Hidden, then frozen; it comes back visible with only a `resume` (no visibilitychange).
    page.hide();
    await tick(30);
    expect(locks.free()).toBe(true);
    (document as unknown as { visibilityState: string }).visibilityState = 'visible';
    page.fire('document', 'resume');
    await tick(30);
    expect(locks.free()).toBe(false);
    expect(store.getState().storage).toEqual(READY);
  });

  it('starting hidden (a restored background tab), it waits to be shown before taking the data', async () => {
    fakeLocks();
    page.hide();
    const store = await load();
    await tick(1000);
    expect(env.p29.opens).toBe(0);
    expect(store.getState().storage).toEqual({ state: 'loading' });
    page.show();
    await tick(30);
    expect(store.getState().storage).toEqual(READY);
  });

  it('before an update reload it lets go, waiting for the worker to let go of the files', async () => {
    const locks = fakeLocks();
    const store = await load();
    log.length = 0;
    shutdownGate = deferred();
    const { releaseData } = await import('./persistence');
    let released = false;
    void releaseData().then(() => (released = true));
    await tick(0);
    expect(released).toBe(false);
    shutdownGate.open();
    await tick(0);
    expect(released).toBe(true);
    expect(log).toEqual(['close', 'shutdown', 'lock released']);
    // About to reload: it doesn't take the data back.
    page.show();
    await tick(1000);
    expect(locks.free()).toBe(true);
    expect(store.getState().storage).toEqual(RECONNECTING);
  });

  it('where the database worker wasn’t found, the page keeps the data while hidden (as before)', async () => {
    canShutdown = false;
    const locks = fakeLocks();
    const store = await load();
    log.length = 0;
    page.hide();
    await tick(1000);
    expect(log).toEqual([]);
    expect(locks.free()).toBe(false);
    expect(store.getState().storage).toEqual(READY);
    logText(store, 'still saving');
    await tick(30);
    expect(await diskTexts()).toEqual(['still saving']);
  });

  it('the localStorage fallback lets go of the tab lock when hidden, and reads other pages’ changes when shown', async () => {
    const locks = fakeLocks();
    env.state.openError = new Error('no OPFS');
    const store = await load();
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'local' });
    logText(store, 'here');
    await tick(30);
    page.hide();
    await tick(30);
    expect(locks.free()).toBe(true);
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'local', reconnecting: true });
    // Another page (the same fallback) adds an entry.
    const mine = store.getState().data.activities[idOf(store, 'here')];
    env.ls.set('wanderment', legacyBlob({ version: 1, threads: {}, activities: { [mine.id]: mine, o1: act('o1', 'from another tab') } }));
    page.show();
    await tick(30);
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'local' });
    expect(locks.free()).toBe(false);
    expect(texts(store)).toEqual(['from another tab', 'here']);
    expect(env.p29.opens).toBe(1);
  });

  // ───────── Rework after the audit: a page that doesn't hold the data can't change it ─────────
  describe('a page that doesn’t hold the data can’t change it (P-29 rework)', () => {
    const NOTICE = { message: 'Just a moment — reconnecting.', notice: true };
    const thread = (id: string, name: string, extra: Record<string, unknown> = {}) => ({ id, name, hidden: false, createdAt: at, ...extra });
    const fixture = () => ({
      version: 2 as const,
      routines: {},
      runs: {},
      threads: { t1: thread('t1', 'draw', { next: 'step', declaredAt: at }), t2: thread('t2', 'read') },
      // P-73: a1 is lit (sent up from the trailhead), so Done it has something to settle.
      activities: { a1: { ...act('a1', 'unattached'), lit: true as const }, a2: { ...act('a2', 'drew'), doingId: 't1' }, a3: act('a3', 'to delete') },
    });
    const other = () => ({ version: 2 as const, threads: {}, activities: { i1: act('i1', 'imported') }, routines: {}, runs: {} });
    type S = ReturnType<Store['getState']>;
    const settingsOf = (st: S) => ({ showShading: st.showShading, recentSearches: st.recentSearches, leftAsIs: st.leftAsIs, ...(st.whyOfferOff && { whyOfferOff: true }), ...(st.firstRunDone && { firstRunDone: true }) });

    /**
     * P-86: a routine with a run going (g1, n1: on its first step, one this-run change), for the run
     * actions. Seeded only while the page holds the data: a setup must not change the data of a page
     * that doesn't (there the action is refused at the gate before it looks at anything).
     */
    const going = (run: Record<string, unknown> = {}) => (store: Store) => {
      const held = store.getState().storage;
      if (held.state !== 'ready' || held.reconnecting) return;
      store.setState((st) => ({
        data: {
          ...st.data,
          routines: {
            g1: { id: 'g1', words: 'Report', named: true, createdAt: at, home: true, items: [{ id: 'a', text: 'Write' }, { id: 'w', wait: 'a reply' }, { id: 'k', ref: 'g2' }, { id: 'b', text: 'Send' }] },
            g2: { id: 'g2', words: 'Sketch', named: true, createdAt: at, items: [{ id: 'q', text: 'Warm up' }] },
          },
          runs: { n1: { id: 'n1', routineId: 'g1', startedAt: at, touchedAt: at, status: 'running', frames: [{ seq: 'g1', at: 'a', round: 1 }], changes: [{ id: 'c1', kind: 'reword', seq: 'g1', item: 'a', text: 'Draft' }], ...run } },
        },
      }));
    };
    /**
     * Every action that changes the data, with arguments that do change something. (P-89: the old app's
     * actions are gone; what is left is Undo, import's replace, taking the data back, and the runner's.)
     */
    const MUTATING: Record<string, { args: unknown[]; setup?: (store: Store) => void }> = {
      undoLast: { args: [], setup: (store) => person(store).removeActivity('a3') },
      replaceData: { args: [other()] },
      refreshData: { args: [other(), { showShading: false, recentSearches: [], leftAsIs: [] }, false] },
      // P-86: routines and runs. (A start is refused while something runs, so it starts from a paused run.)
      startRoutine: { args: ['g2'], setup: going({ status: 'paused' }) },
      // P-90: creating makes the routine only; Plan (here it also folds the run's this-run change from the build before).
      createRoutine: { args: ['Learn Spanish'], setup: going() },
      planRun: { args: ['n1'], setup: going() },
      resumeRun: { args: ['n1'], setup: going({ status: 'paused' }) },
      pauseRun: { args: ['n1', 'lunch'], setup: going() },
      setPauseReason: { args: ['n1', 'need the ad'], setup: going({ status: 'paused' }) },
      leaveRun: { args: ['n1'], setup: going({ status: 'paused' }) },
      nextStep: { args: ['n1'], setup: going() },
      doneLevel: { args: ['n1'], setup: going() },
      // P-103: "End this run", from a paused tile.
      endRun: { args: ['n1'], setup: going({ status: 'paused' }) },
      stepIn: { args: ['n1'], setup: going({ frames: [{ seq: 'g1', at: 'k', round: 1 }] }) },
      jumpTo: { args: ['n1', { path: ['b'] }], setup: going() },
      backTo: { args: ['n1'], setup: going({ frames: [{ seq: 'g1', at: 'b', round: 1 }] }) },
      // P-101 amendment (ruling 9): Start over.
      restartRun: { args: ['n1', 0], setup: going({ frames: [{ seq: 'g1', at: 'b', round: 1 }] }) },
      editRoutine: { args: ['g1', { kind: 'addStep', text: 'File it' }], setup: going() },
      // P-96: typed in the field of the step that gives a name, and the value sheet changing a value there is.
      typeValue: {
        args: ['n1', 'a', 'topic', 'the ad'],
        setup: (store) => {
          going()(store);
          const g1 = store.getState().data.routines.g1;
          if (g1) store.setState((st) => ({ data: { ...st.data, routines: { ...st.data.routines, g1: { ...g1, items: (g1.items as { id: string }[]).map((i) => (i.id === 'a' ? { ...i, out: 'topic' } : i)) } } } }));
        },
      },
      changeValue: { args: ['n1', 'topic', 'another ad'], setup: going({ values: [{ name: 'topic', items: ['the ad'], level: 0, seq: 'g1', item: 'a', at }] }) },
      // P-100: home's queue — a second run (of g2, started later) moved to the top.
      moveInQueue: {
        args: ['n2', 'top'],
        setup: (store) => {
          going({ status: 'paused' })(store);
          const held = store.getState().storage;
          if (held.state !== 'ready' || held.reconnecting) return;
          store.setState((st) => ({ data: { ...st.data, runs: { ...st.data.runs, n2: { id: 'n2', routineId: 'g2', startedAt: '2030-01-01T00:00:00.000Z', touchedAt: at, frames: [{ seq: 'g2', at: 'q', round: 1 }], changes: [] } } } }));
        },
      },
      // P-99: a part of an In any order block taken up (the run on the block's row).
      takeUpPart: {
        args: ['n1', 0, 'p1'],
        setup: (store) => {
          going({ frames: [{ seq: 'g1', at: 'y', round: 1 }] })(store);
          const g1 = store.getState().data.routines.g1;
          if (!g1) return;
          store.setState((st) => ({
            data: {
              ...st.data,
              routines: {
                ...st.data.routines,
                g1: { ...g1, items: [{ id: 'y', ref: 'g3' }, ...(g1.items as unknown[])] },
                g3: { id: 'g3', words: 'In any order', named: false, createdAt: at, any: true, items: [{ id: 'p1', text: 'Study' }, { id: 'p2', text: 'Practise' }] },
              },
            },
          }));
        },
      },
      // P-104 / P-106: Copy from the library (a method; a template under a name).
      copyFromLibrary: { args: ['lib-recall'] },
      // P-105: Copy and add — the library method copied and added as a step of g1.
      copyAndAdd: { args: ['lib-cue', 'g1'], setup: going() },
      // P-107: a list given in its step's list field (one item per row).
      typeList: {
        args: ['n1', 'a', 'topic', ['the ad', 'the poster']],
        setup: (store) => {
          going()(store);
          const g1 = store.getState().data.routines.g1;
          if (g1) store.setState((st) => ({ data: { ...st.data, routines: { ...st.data.routines, g1: { ...g1, items: (g1.items as { id: string }[]).map((i) => (i.id === 'a' ? { ...i, out: 'topic' } : i)) } } } }));
        },
      },
    };
    /** What's only on screen this session: these never change the data. */
    const NOT_DATA: Record<string, unknown[]> = {
      dismissToast: [],
      // P-98: a refusal said in words (the notice's row only; session only).
      say: ['“Research” can’t be a step of itself'],
      // A Return the old app kept while reconnecting (it comes only from a reload across the update):
      // nothing to log here, and it does nothing until the page holds the data.
      logMarked: [],
      // P-86: the notice put away (session only); and the press kept while reconnecting, which does
      // nothing until the page holds the data again.
      dismissRunNotice: [],
      verbMarked: [],
      // P-96 audit F3: names an edit already written by `typeValue` and makes it undoable (the Undo slot and the notice only).
      typedOver: ['n1', 'a', 'topic', 'the ad'],
      // P-101 (ruling 6): the notice put away by a screen change or a tap (session only).
      screenChanged: [],
      tapped: [],
      // P-102: the notice's × (session only: it puts the notice away, as a tap would).
      hideNotice: [],
      // F-1 (engine #6): the runner's See ahead view, kept per run and place while the runner is away (session only).
      setSeeAhead: ['r1', { on: true }],
    };
    const call = (store: Store, name: string, args: unknown[]) => (store.getState() as unknown as Record<string, (...a: unknown[]) => unknown>)[name](...args);
    const reset = (store: Store) =>
      store.setState({ data: fixture(), undo: undefined, toast: undefined, toLog: undefined, showShading: true, recentSearches: ['old'], leftAsIs: [], draft: { text: '', toIds: [] } });

    it('the store’s actions are all listed here: each data-changing one is gated, the rest only touch the draft or the screen', async () => {
      fakeLocks();
      const store = await load();
      const actions = Object.entries(store.getState()).filter(([, v]) => typeof v === 'function').map(([k]) => k);
      expect(actions.filter((k) => !(k in MUTATING) && !(k in NOT_DATA)), 'add new store actions to MUTATING or NOT_DATA').toEqual([]);
    });

    it('while it holds the data, each data-changing action does change something (so the next test means something)', async () => {
      fakeLocks();
      const store = await load();
      for (const [name, { args, setup }] of Object.entries(MUTATING)) {
        reset(store);
        setup?.(store);
        const before = store.getState();
        call(store, name, args);
        const after = store.getState();
        const changed = after.data !== before.data || JSON.stringify(settingsOf(after)) !== JSON.stringify(settingsOf(before)) || after.undo !== before.undo;
        expect(changed, name).toBe(true);
      }
      await tick(30);
    });

    for (const mode of ['reconnecting', 'waiting', 'local'] as const) {
      it(`while it doesn’t hold the data (${mode}), every data-changing action refuses: no change, no journal, no undo entry, one quiet note`, async () => {
        const locks = fakeLocks();
        if (mode === 'local') env.state.openError = new Error('no OPFS');
        const store = await load();
        reset(store);
        person(store).removeActivity('a3'); // an Undo to keep
        await tick(30);
        page.hide();
        await tick(30);
        if (mode === 'waiting') {
          // Shown again while another visible page holds the data: past the grace, the waiting screen.
          locks.holdElsewhere();
          page.show();
          await tick(5000);
          expect(store.getState().storage).toMatchObject({ state: 'blocked', waiting: true });
        } else {
          expect(store.getState().storage).toMatchObject({ state: 'ready', reconnecting: true });
        }
        env.p29.writes = [];
        const journalBefore = env.ls.get('wanderment:journal');
        const legacyBefore = env.ls.get('wanderment');
        for (const [name, { args, setup }] of Object.entries(MUTATING)) {
          if (name !== 'undoLast') setup?.(store);
          store.setState({ toast: undefined });
          const before = store.getState();
          call(store, name, args);
          const after = store.getState();
          expect(after.data, name).toBe(before.data);
          expect(settingsOf(after), name).toEqual(settingsOf(before));
          expect(after.undo, name).toBe(before.undo);
          expect(after.toast, name).toEqual(NOTICE);
        }
        for (const [name, args] of Object.entries(NOT_DATA)) {
          const before = store.getState();
          call(store, name, args);
          expect(store.getState().data, name).toBe(before.data);
          expect(settingsOf(store.getState()), name).toEqual(settingsOf(before));
          expect(store.getState().undo, name).toBe(before.undo);
        }
        await tick(1000);
        expect(env.p29.writes).toEqual([]);
        expect(env.ls.get('wanderment:journal')).toBe(journalBefore);
        expect(env.ls.get('wanderment')).toBe(legacyBefore);
      });
    }

    it('the audit’s F1: a page shown while another holds the data can’t change it, so the other page’s writes lose nothing of its', async () => {
      const locks = fakeLocks();
      const store = await load();
      logText(store, 'before');
      await tick(30);
      page.hide();
      await tick(30);
      const release = locks.holdElsewhere(); // page B takes the data
      page.show();
      await tick(100);
      expect(store.getState().storage).toEqual(RECONNECTING);
      expect(store.getState().createRoutine('made while reconnecting')).toEqual({ ok: false, reason: 'reconnecting' });
      expect(env.ls.has('wanderment:journal')).toBe(false);
      // B writes; A is reloaded from its waiting screen.
      await writeElsewhere('from B');
      (await import('./persistence')).stopPersistence();
      release();
      page = fakePage();
      fakeLocks();
      const next = await load();
      await tick(30);
      expect(texts(next)).toEqual(['before', 'from B']);
    });

    it('a transient failure taking the data back (an open that timed out) keeps the data and draft on screen and tries again by itself', async () => {
      fakeLocks();
      const store = await load();
      logText(store, 'before');
      await tick(30);
      page.hide();
      await tick(30);
      store.setState({ draft: { text: 'a draft', toIds: [] } });
      env.p29.failOpens = [new Error('Opening the database timed out'), new Error('Aborted(NetworkError: wasm)')];
      const opens = env.p29.opens;
      page.show();
      await tick(10);
      expect(store.getState().storage).toEqual(RECONNECTING);
      expect(texts(store)).toEqual(['before']);
      // About 0.25 s, then 0.5 s.
      await tick(250);
      expect(env.p29.opens).toBe(opens + 2);
      expect(store.getState().storage).toEqual(RECONNECTING);
      await tick(500);
      expect(env.p29.opens).toBe(opens + 3);
      expect(store.getState().storage).toEqual(READY);
      expect(store.getState().draft.text).toBe('a draft');
      expect(texts(store)).toEqual(['before']);
    });

    it('taking the data back that keeps failing (not held) says so over the app after 6 tries — never before — with the details; it keeps trying behind it, opens by itself, and the press kept meanwhile is applied once (audit 2 F1)', async () => {
      fakeLocks();
      const store = await load();
      logText(store, 'before');
      const { runnerView } = await import('@/domain/runView');
      const made = store.getState().createRoutine('Morning');
      if (!made.ok || !made.routineId) throw new Error('New: was refused');
      for (const text of ['Stretch', 'Shower']) store.getState().editRoutine(made.routineId, { kind: 'addStep', text });
      const started = store.getState().startRoutine(made.routineId);
      if (!started.ok || !started.runId) throw new Error('Start was refused');
      const runId = started.runId;
      const step = () => runnerView(store.getState().data, runId)!.step.words;
      await tick(30);
      page.hide();
      await tick(30);
      env.state.openError = new Error('Aborted(NetworkError: wasm)');
      const seen: unknown[] = [];
      store.subscribe((st, prev) => void (st.storage !== prev.storage && seen.push(st.storage)));
      env.p29.writes = [];
      const opens = env.p29.opens;
      page.show();
      await tick(10);
      expect(store.getState().nextStep(runId)).toEqual({ ok: false, reason: 'reconnecting' });
      // Tries at about 0, 0.25, 0.75, 1.75 and 3.75 s, then 7.75 s: five failures are still only "Reconnecting…".
      await tick(7720);
      expect(env.p29.opens).toBe(opens + 5);
      expect(store.getState().storage).toEqual(RECONNECTING);
      expect(seen).toEqual([]);
      await tick(40);
      expect(env.p29.opens).toBe(opens + 6);
      expect(store.getState().storage).toEqual({
        state: 'blocked',
        waiting: true,
        // Audit 3 U1: no advice to reload (it opens by itself; Reload stays as a second way).
        message: 'The app can’t open its data right now. It keeps trying, and this page will carry on by itself once it can; what you’ve typed is kept.',
        details: 'Details: open · Aborted(NetworkError: wasm)',
      });
      // It keeps trying (every 5 s now), without saying it again on each try; the line and the data stay.
      await tick(20_000);
      expect(env.p29.opens).toBe(opens + 10);
      expect(seen).toHaveLength(1);
      expect(store.getState().toVerb).toMatchObject({ runId, verb: 'next' });
      expect(step()).toBe('Stretch');
      expect(texts(store)).toEqual(['before']);
      expect(env.p29.writes.filter((q) => /INSERT|UPDATE|DELETE/i.test(q))).toEqual([]);
      // Back: it opens by itself, and the press made meanwhile is applied once.
      env.state.openError = undefined;
      await tick(5000);
      expect(store.getState().storage).toEqual(READY);
      expect(texts(store)).toEqual(['before']);
      expect(step()).toBe('Shower');
      expect(store.getState().toVerb).toBeUndefined();
      await tick(30);
      expect(await onDisk()).toEqual(store.getState().data);
    });

    it('taking the data back that keeps failing slowly (each open timing out) says so after about 30 s, not before (audit 2 F1)', async () => {
      fakeLocks();
      const store = await load();
      await tick(30);
      page.hide();
      await tick(30);
      // Each try fails after 15 s (the migrate step never answering, then failing).
      const wrap = handoff.wrapDb!;
      handoff.wrapDb = (db) => ({ ...wrap(db), all: (() => new Promise((_, reject) => setTimeout(() => reject(new Error('disk I/O error')), 15_000))) as typeof db.all });
      const opens = env.p29.opens;
      page.show();
      await tick(30_200);
      expect(env.p29.opens).toBe(opens + 2);
      expect(store.getState().storage).toEqual(RECONNECTING);
      await tick(100);
      expect(store.getState().storage).toMatchObject({ state: 'blocked', waiting: true, details: 'Details: migrate · disk I/O error' });
      handoff.wrapDb = wrap;
      await tick(500);
      expect(store.getState().storage).toEqual(READY);
    });

    it('taking the data back where a step never answers is told over the app 30 s on, not before, naming the step (audit 3 D4)', async () => {
      fakeLocks();
      const store = await load();
      await tick(30);
      page.hide();
      await tick(30);
      const wrap = handoff.wrapDb!;
      handoff.wrapDb = (db) => ({ ...wrap(db), all: (() => new Promise(() => {})) as typeof db.all });
      page.show();
      await tick(29_900);
      expect(store.getState().storage).toEqual(RECONNECTING);
      await tick(200);
      expect(store.getState().storage).toMatchObject({ state: 'blocked', waiting: true, details: 'Details: migrate · No answer for 30 s' });
    });

    it('stuck and shown again, the waiting screen says what fails now at the first failed try (audit 3 T1)', async () => {
      fakeLocks();
      const store = await load();
      await tick(30);
      page.hide();
      await tick(30);
      env.state.openError = new Error('Aborted(NetworkError: wasm)');
      page.show();
      await tick(8000);
      expect(store.getState().storage).toMatchObject({ state: 'blocked', details: 'Details: open · Aborted(NetworkError: wasm)' });
      page.hide();
      await tick(30);
      env.state.openError = new Error('disk I/O error');
      page.show();
      await tick(10);
      expect(store.getState().storage).toMatchObject({ state: 'blocked', waiting: true, details: 'Details: open · disk I/O error' });
    });

    it('shown again (or back online), a try that’s waiting goes at once', async () => {
      fakeLocks();
      const store = await load();
      await tick(30);
      page.hide();
      await tick(30);
      env.p29.failOpens = Array.from({ length: 6 }, () => new Error('Opening the database timed out'));
      page.show();
      await tick(8000); // into the 5 s tries
      const opens = env.p29.opens;
      env.p29.failOpens = [];
      page.storageEvent('unrelated', '1');
      page.fire('window', 'online');
      await tick(0);
      expect(env.p29.opens).toBe(opens + 1);
      expect(store.getState().storage).toEqual(READY);
    });

    it('Reload keeps the draft: it’s put back once when the data shows again', async () => {
      const session = new Map<string, string>();
      vi.stubGlobal('sessionStorage', { getItem: (k: string) => session.get(k) ?? null, setItem: (k: string, v: string) => void session.set(k, v), removeItem: (k: string) => void session.delete(k) });
      const reload = vi.fn();
      vi.stubGlobal('location', { reload, href: 'http://localhost/wanderment/' });
      fakeLocks();
      let store = await load();
      store.setState({ draft: { text: 'typed before Reload', toIds: [] } });
      (await import('./persistence')).reloadKeepingDraft();
      expect(reload).toHaveBeenCalledTimes(1);
      (await import('./persistence')).stopPersistence();
      page = fakePage();
      fakeLocks();
      store = await load();
      expect(store.getState().draft.text).toBe('typed before Reload');
      (await import('./persistence')).stopPersistence();
      page = fakePage();
      fakeLocks();
      store = await load();
      expect(store.getState().draft.text).toBe('');
    });

    it('across the update: a Return the old app kept while reconnecting (in this tab’s session storage, with its draft) is logged once by this build when the data shows — and never again', async () => {
      const session = new Map<string, string>();
      vi.stubGlobal('sessionStorage', { getItem: (k: string) => session.get(k) ?? null, setItem: (k: string, v: string) => void session.set(k, v), removeItem: (k: string) => void session.delete(k) });
      vi.stubGlobal('location', { reload: vi.fn(), href: 'http://localhost/wanderment/' });
      // What the old build's page wrote before it reloaded itself (its keys and shapes, b50ffec).
      const draft = { text: 'pressed before Reload', toIds: [] };
      session.set('wanderment:draft', JSON.stringify(draft));
      session.set('wanderment:draft:to-log', JSON.stringify({ draft, opts: { trail: true } }));
      fakeLocks();
      let store = await load();
      await tick(30);
      expect(texts(store)).toEqual(['pressed before Reload']);
      // As the old app would have logged it: sent up from the trailhead, so lit.
      expect(Object.values(store.getState().data.activities)[0]).toMatchObject({ text: 'pressed before Reload', lit: true, toIds: [] });
      expect(store.getState().toLog).toBeUndefined();
      expect(session.size).toBe(0);
      expect(await diskTexts()).toEqual(['pressed before Reload']);
      // Once: another reload logs nothing more.
      (await import('./persistence')).reloadKeepingDraft();
      (await import('./persistence')).stopPersistence();
      page = fakePage();
      fakeLocks();
      store = await load();
      await tick(30);
      expect(texts(store)).toEqual(['pressed before Reload']);
    });

    it('across the update: a draft the old app kept without a Return is not logged (nothing was asked for)', async () => {
      const session = new Map<string, string>();
      vi.stubGlobal('sessionStorage', { getItem: (k: string) => session.get(k) ?? null, setItem: (k: string, v: string) => void session.set(k, v), removeItem: (k: string) => void session.delete(k) });
      session.set('wanderment:draft', JSON.stringify({ text: 'only typed', toIds: [] }));
      // A Return kept for another line than the one in the box (it was changed since): not logged either.
      session.set('wanderment:draft:to-log', JSON.stringify({ draft: { text: 'an earlier line', toIds: [] } }));
      fakeLocks();
      const store = await load();
      await tick(30);
      expect(texts(store)).toEqual([]);
      expect(await diskTexts()).toEqual([]);
    });

    it('across the update: a damaged session key from the old tab never blocks the load — the data opens, nothing is logged, the keys are gone (audit B1)', async () => {
      fakeLocks();
      let store = await load();
      logText(store, 'kept');
      await tick(30);
      (await import('./persistence')).stopPersistence();
      const session = new Map<string, string>();
      vi.stubGlobal('sessionStorage', { getItem: (k: string) => session.get(k) ?? null, setItem: (k: string, v: string) => void session.set(k, v), removeItem: (k: string) => void session.delete(k) });
      const draft = { text: 'pressed before Reload', toIds: [] };
      session.set('wanderment:draft', JSON.stringify(draft));
      session.set('wanderment:draft:to-log', JSON.stringify({ draft, extra: { toIds: 'nope', occurredAt: 'never' } }));
      page = fakePage();
      fakeLocks();
      store = await load();
      await tick(30);
      expect(store.getState().storage).toEqual(READY);
      expect(texts(store)).toEqual(['kept']);
      expect(store.getState().toLog).toBeUndefined();
      expect(session.size).toBe(0);
      expect(await diskTexts()).toEqual(['kept']);
    });

    it('a shutdown that fails (or times out) leaves the page the holder: it keeps the tab lock, tells no one, and lets go properly the next time it’s hidden — two pages never wait on each other', async () => {
      const locks = fakeLocks();
      let fail = true;
      const base = handoff.wrapDb!;
      handoff.wrapDb = (db) => {
        const wrapped = base(db);
        return { ...wrapped, shutdown: async () => (fail ? Promise.reject(new Error('The database worker didn’t let go of its files in time')) : wrapped.shutdown!()) };
      };
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const pings = vi.spyOn(env.localStorage, 'setItem');
      const store = await load();
      logText(store, 'one');
      await tick(30);
      page.hide();
      await tick(30);
      expect(locks.free()).toBe(false);
      expect(pings.mock.calls.filter(([k]) => k === 'wanderment:released')).toEqual([]);
      expect(store.getState().storage).toEqual(RECONNECTING);
      // Another page (visible) waits for the tab lock — not for files it can't open.
      let otherGot = false;
      void navigator.locks.request('wanderment-data', {}, async () => {
        otherGot = true;
      });
      await tick(10_000);
      expect(otherGot).toBe(false);
      // Hidden again (pagehide), it still doesn't spin or let go.
      page.fire('window', 'pagehide');
      await tick(1000);
      page.fire('window', 'pageshow');
      // Shown: it opens again by itself (it still has the lock).
      page.show();
      await tick(30);
      expect(store.getState().storage).toEqual(READY);
      logText(store, 'two');
      await tick(30);
      expect(await diskTexts()).toEqual(['one', 'two']);
      // The next hide lets go properly, and the other page gets in.
      fail = false;
      page.hide();
      await tick(30);
      expect(otherGot).toBe(true);
      expect(warn.mock.calls.filter(([m]) => /didn’t let go/.test(String(m)))).toHaveLength(1);
    });

    it('a journal entry carries settings only when this page changed them, and replaying it never puts back settings another page saved', async () => {
      fakeLocks();
      const store = await load();
      await tick(30);
      writeGate = deferred();
      logText(store, 'in flight');
      await tick(0);
      expect(JSON.parse(env.ls.get('wanderment:journal')!).settings).toBeUndefined();
      store.setState({ showShading: false });
      await tick(0);
      expect(JSON.parse(env.ls.get('wanderment:journal')!).settings).toEqual({ showShading: false });
      writeGate.open();
      await tick(30);

      // A journal this page left (its write never landed); meanwhile another page saved its settings.
      const { nodeDb } = await import('./nodeDb');
      const { loadSettings, saveSettings } = await import('./repository');
      let db = nodeDb(env.state.dbPath);
      await saveSettings(db, { showShading: true, recentSearches: ['from B'], leftAsIs: ['x'] });
      db.close();
      env.ls.set('wanderment:journal', JSON.stringify({ changes: { upsertThreads: [], deleteThreads: [], upsertActivities: [act('j1', 'journaled')], deleteActivities: [] }, settings: { showShading: false } }));
      (await import('./persistence')).stopPersistence();
      page = fakePage();
      fakeLocks();
      const next = await load();
      expect(texts(next)).toEqual(['in flight', 'journaled']);
      expect(settingsOf(next.getState())).toEqual({ showShading: false, recentSearches: ['from B'], leftAsIs: ['x'] });
      db = nodeDb(env.state.dbPath);
      expect(await loadSettings(db)).toEqual({ showShading: false, recentSearches: ['from B'], leftAsIs: ['x'] });
      db.close();
    });

    it('taking the data back shows the settings another page saved meanwhile', async () => {
      fakeLocks();
      const store = await load();
      await tick(30);
      page.hide();
      await tick(30);
      const { nodeDb } = await import('./nodeDb');
      const { saveSettings } = await import('./repository');
      const db = nodeDb(env.state.dbPath);
      await saveSettings(db, { showShading: false, recentSearches: ['from B'], leftAsIs: [] });
      db.close();
      page.show();
      await tick(30);
      expect(settingsOf(store.getState())).toEqual({ showShading: false, recentSearches: ['from B'], leftAsIs: [] });
    });

    it('replaying the journal clears it only if nothing was added meanwhile (compare-and-clear)', async () => {
      fakeLocks();
      let store = await load();
      logText(store, 'saved');
      await tick(30);
      env.ls.set('wanderment:journal', JSON.stringify({ changes: { upsertThreads: [], deleteThreads: [], upsertActivities: [act('j1', 'journaled')], deleteActivities: [] } }));
      writeGate = deferred();
      (await import('./persistence')).stopPersistence();
      page = fakePage();
      fakeLocks();
      const loading = load();
      await tick(10);
      // Something else writes a newer entry while the replay is still writing.
      const newer = JSON.stringify({ changes: { upsertThreads: [], deleteThreads: [], upsertActivities: [act('j2', 'newer')], deleteActivities: [] } });
      env.ls.set('wanderment:journal', newer);
      writeGate.open();
      writeGate = undefined;
      store = await loading;
      await tick(0);
      expect(env.ls.get('wanderment:journal')).toBe(newer);
      expect(texts(store)).toEqual(['journaled', 'saved']);
    });

    it('a change of its own that the journal saved (not another page’s) keeps Undo and what’s on screen', async () => {
      fakeLocks();
      const store = await load();
      logText(store, 'one');
      await tick(30);
      writeGate = deferred();
      logText(store, 'in flight');
      await tick(0);
      person(store).removeActivity(idOf(store, 'one')); // queued behind the write in flight
      const { data, undo } = store.getState();
      page.hide();
      writeGate.open();
      writeGate = undefined;
      await tick(30);
      page.show();
      await tick(30);
      expect(store.getState().storage).toEqual(READY);
      expect(texts(store)).toEqual(['in flight']);
      expect(store.getState().data).toBe(data);
      expect(store.getState().undo).toBe(undo);
    });

    it('an old-version tab’s records wait while the page doesn’t hold the data, and are taken in once it does', async () => {
      fakeLocks();
      const store = await load();
      logText(store, 'mine');
      await tick(30);
      page.hide();
      await tick(30);
      const blob = legacyBlob({ version: 1, threads: {}, activities: { o1: act('o1', 'from the old tab') } });
      env.ls.set('wanderment', blob);
      page.storageEvent('wanderment', blob);
      await tick(30);
      expect(texts(store)).toEqual(['mine']);
      expect(await diskTexts()).toEqual(['mine']);
      expect(env.ls.get('wanderment')).toBe(blob);
      page.show();
      await tick(30);
      expect(texts(store)).toEqual(['from the old tab', 'mine']);
      expect(env.ls.has('wanderment')).toBe(false);
    });

    it('letting go tells other pages (the “released” ping), after the tab lock goes', async () => {
      fakeLocks();
      await load();
      await tick(30);
      log.length = 0;
      vi.spyOn(env.localStorage, 'setItem').mockImplementation((k: string, v: string) => {
        if (k === 'wanderment:released') log.push('ping');
        env.ls.set(k, String(v));
      });
      page.hide();
      await tick(30);
      expect(log).toEqual(['close', 'shutdown', 'lock released', 'ping']);
      expect(env.ls.has('wanderment:released')).toBe(false);
    });
  });

  // ───────── P-85: storage for any kind of record ─────────
  describe('P-85: a routine and a run survive everything that used to name two collections by hand', () => {
    const at2 = '2026-11-02T09:30:00.000Z';
    /** Everything B-11 section 8 lists: items (step, wait with a reaction, routine reference), divider, repeat number, blanks, values used. */
    const routine = (id: string, extra: Record<string, unknown> = {}) => ({
      id,
      words: 'Apply to ▢employer',
      named: true,
      createdAt: at,
      items: [
        { id: 'i1', text: 'Find the posting', setsGoing: true },
        { id: 'i2', wait: 'a reply', closes: 'i1', reactions: [{ name: 'They said yes', items: [{ id: 'i3', text: 'Book a call' }] }] },
        { id: 'i4', ref: 'r2' },
      ],
      repeatFrom: 1,
      repeat: 3,
      blanks: ['employer'],
      used: { employer: ['Acme', 'Initech'] },
      ...extra,
    });
    /** Frames, values, breakdowns, a parent run, ended-at, waiting-since and a pause reason. */
    const run = (id: string, extra: Record<string, unknown> = {}) => ({
      id,
      routineId: 'r1',
      parentRunId: 'n0',
      startedAt: at,
      endedAt: at2,
      waitingSince: at2,
      values: { employer: 'Acme' },
      frames: [{ seq: 'r1', at: 'i2', round: 2 }, { seq: 'r2', at: null }],
      breakdowns: { i1: 'r9' },
      waitedOn: ['i2'],
      changes: [{ kind: 'reword', item: 'i1', text: 'Find the listing' }],
      reason: 'lunch',
      ...extra,
    });
    type AnyData = Store extends { getState(): { data: infer D } } ? D : never;
    /** Changes the data the way an action does (P-85 adds no action that touches routines or runs). */
    const change = (store: Store, next: (d: AnyData) => Partial<AnyData>) => store.setState((s) => ({ data: { ...s.data, ...next(s.data) } }));
    const seed = (store: Store) => change(store, () => ({ routines: { r1: routine('r1') }, runs: { n1: run('n1') } }));
    const both = { routines: { r1: routine('r1') }, runs: { n1: run('n1') } };
    const file = (data: unknown) => JSON.stringify({ app: 'wanderment', exportedAt: at, data });
    /** A new page load (the old page is gone). */
    async function reload() {
      (await import('./persistence')).stopPersistence();
      page = fakePage();
      fakeLocks();
      const store = await load();
      await tick(30);
      return store;
    }

    it('journal replay: written only to the journal when the tab dies, both are there after a reload', async () => {
      fakeLocks();
      let store = await load();
      logText(store, 'before');
      await tick(30);
      env.state.hangWrites = true;
      seed(store);
      await tick(30); // the write was sent but never commits
      expect(await onDisk()).toMatchObject({ routines: {}, runs: {} });
      const journal = JSON.parse(env.ls.get('wanderment:journal')!).changes;
      expect(journal.upsertRoutines).toEqual([routine('r1')]);
      expect(journal.upsertRuns).toEqual([run('n1')]);
      // The four keys an older version reads are still there, under the same names.
      expect(journal).toMatchObject({ upsertThreads: [], deleteThreads: [], upsertActivities: [], deleteActivities: [] });
      env.state.hangWrites = false;

      store = await reload();
      expect(store.getState().storage).toEqual(READY);
      expect(store.getState().saveError).toBeUndefined();
      expect(store.getState().data).toMatchObject(both);
      expect(store.getState().data.routines).toEqual(both.routines);
      expect(store.getState().data.runs).toEqual(both.runs);
      expect(texts(store)).toEqual(['before']);
      expect(await onDisk()).toEqual(store.getState().data);
      expect(env.ls.has('wanderment:journal')).toBe(false);

      // A delete that only the journal holds lands too.
      env.state.hangWrites = true;
      change(store, () => ({ routines: {}, runs: {} }));
      await tick(30);
      env.state.hangWrites = false;
      store = await reload();
      expect(store.getState().data).toMatchObject({ routines: {}, runs: {} });
      expect(await onDisk()).toMatchObject({ routines: {}, runs: {} });
    });

    it('the localStorage fallback keeps both, writes the data as version 2, and moves them into SQLite once it can', async () => {
      env.state.openError = new Error('no OPFS');
      fakeLocks();
      let store = await load();
      expect(store.getState().storage).toEqual({ state: 'ready', kind: 'local' });
      logText(store, 'in fallback');
      seed(store);
      await tick(30);
      const blob = JSON.parse(env.ls.get('wanderment')!);
      expect(blob.version).toBe(1);
      expect(blob.state.data.version).toBe(2);
      expect(blob.state.data.routines).toEqual(both.routines);
      expect(blob.state.data.runs).toEqual(both.runs);
      const shown = store.getState().data;

      store = await reload();
      expect(store.getState().storage).toEqual({ state: 'ready', kind: 'local' });
      expect(store.getState().data).toEqual(shown);

      env.state.openError = undefined;
      store = await reload();
      expect(store.getState().storage).toEqual(READY);
      expect(store.getState().data).toEqual(shown);
      expect(env.ls.has('wanderment')).toBe(false);
      expect(await onDisk()).toEqual(shown);
      store = await reload();
      expect(store.getState().data).toEqual(shown);
    });

    it('hand-over with a take-back: another page’s routine and run are taken, this page’s own (some only in its journal) stay on top', async () => {
      fakeLocks();
      const store = await load();
      seed(store);
      change(store, (d) => ({ routines: { ...d.routines, r5: routine('r5', { words: 'Water the plants' }) } }));
      await tick(30);
      expect(await onDisk()).toMatchObject({ routines: { r1: routine('r1'), r5: routine('r5', { words: 'Water the plants' }) }, runs: both.runs });

      // A change in flight and one queued behind it when the page is hidden: the second waits in the journal.
      writeGate = deferred();
      change(store, (d) => ({ runs: { ...d.runs, n1: run('n1', { reason: 'paused here' }) } }));
      await tick(0);
      change(store, (d) => ({ routines: { ...d.routines, r3: routine('r3', { words: 'Bake bread', named: false }) } }));
      await tick(0);
      page.hide();
      writeGate.open();
      writeGate = undefined;
      await tick(30);
      expect((await onDisk()).runs.n1.reason).toBe('paused here');
      expect((await onDisk()).routines.r3).toBeUndefined();
      expect(JSON.parse(env.ls.get('wanderment:journal')!).changes.upsertRoutines).toEqual([routine('r3', { words: 'Bake bread', named: false })]);

      // Meanwhile another page rewords r1, removes r5 and starts a run.
      const { nodeDb } = await import('./nodeDb');
      const { saveChanges } = await import('./repository');
      const db = nodeDb(env.state.dbPath);
      await saveChanges(db, { upsertRoutines: [routine('r1', { words: 'Apply, reworded elsewhere' })], deleteRoutines: ['r5'], upsertRuns: [run('n2', { reason: 'started elsewhere' })] } as never);
      db.close();

      page.show();
      await tick(100);
      expect(store.getState().storage).toEqual(READY);
      expect(store.getState().saveError).toBeUndefined();
      const expected = {
        routines: { r1: routine('r1', { words: 'Apply, reworded elsewhere' }), r3: routine('r3', { words: 'Bake bread', named: false }) },
        runs: { n1: run('n1', { reason: 'paused here' }), n2: run('n2', { reason: 'started elsewhere' }) },
      };
      expect(store.getState().data.routines).toEqual(expected.routines);
      expect(store.getState().data.runs).toEqual(expected.runs);
      expect(await onDisk()).toEqual(store.getState().data);
      expect(env.ls.has('wanderment:journal')).toBe(false);
      // And it is still all there for the next page.
      const next = await reload();
      expect(next.getState().data.routines).toEqual(expected.routines);
      expect(next.getState().data.runs).toEqual(expected.runs);
    });

    it('undo: one action touching an activity, a routine and a run is taken back as one step, on screen and on disk', async () => {
      fakeLocks();
      let store = await load();
      logText(store, 'kept');
      seed(store);
      await tick(30);
      const before = store.getState().data;
      const { undoEntry } = await import('@/domain/diff');
      // One action: logs a line, rewords the routine, makes an unnamed one, and ends the run.
      const after = {
        ...before,
        activities: { ...before.activities, a9: act('a9', 'logged by the action') },
        routines: { r1: { ...before.routines.r1, words: 'Apply everywhere' }, r9: routine('r9', { named: false }) },
        runs: {},
      };
      store.setState({ data: after, undo: undoEntry(before, after) });
      await tick(30);
      expect(await onDisk()).toEqual(after);

      store.getState().undoLast();
      expect(store.getState().data).toEqual(before);
      expect(store.getState().undo).toBeUndefined();
      await tick(30);
      expect(await onDisk()).toEqual(before);
      store = await reload();
      expect(store.getState().data).toEqual(before);
    });

    it('export → import: identical when re-imported, not identical when only the routine differs; and what is imported survives a reload', async () => {
      fakeLocks();
      let store = await load();
      logText(store, 'mine');
      person(store).createThread('draw');
      seed(store);
      await tick(30);
      const exported = store.getState().data;
      const { toBackup } = await import('@/domain/backup');
      let { previewImport, confirmImport } = await import('@/store/importBackup');
      const json = toBackup(exported);
      expect(JSON.parse(json).data.version).toBe(2);
      expect(JSON.parse(json).data.routines).toEqual(both.routines);
      expect(JSON.parse(json).data.runs).toEqual(both.runs);

      // The same file again: identical, nothing replaced, nothing written.
      const writes = env.p29.writes.length;
      const same = previewImport(json);
      expect(same.plan).toMatchObject({ identical: true, empty: false, routines: { unchanged: 1 }, runs: { unchanged: 1 } });
      expect(confirmImport(same)).toEqual({ ok: false, reason: 'identical' });
      expect(store.getState().data).toBe(exported);
      await tick(30);
      expect(env.p29.writes.length).toBe(writes);

      // Only the routine differs (one step's words, inside it): not identical, and Replace takes it.
      const edited = JSON.parse(json);
      edited.data.routines.r1.items[0].text = 'Find the listing';
      const differs = previewImport(JSON.stringify(edited));
      expect(differs.plan).toMatchObject({ identical: false, routines: { added: 0, removed: 0, changed: 1, unchanged: 0 }, runs: { unchanged: 1 }, activities: { unchanged: 1 }, threads: { unchanged: 1 } });
      expect(confirmImport(differs).ok).toBe(true);
      expect(store.getState().data).toEqual(edited.data);
      await tick(30);
      expect(await onDisk()).toEqual(edited.data);
      store = await reload();
      expect(store.getState().data).toEqual(edited.data);
      expect((store.getState().data.routines.r1.items as { text: string }[])[0].text).toBe('Find the listing');

      // Only the run differs: not identical either.
      ({ previewImport, confirmImport } = await import('@/store/importBackup')); // this page load's modules
      const moved = JSON.parse(JSON.stringify(edited));
      moved.data.runs.n1.frames = [{ seq: 'r1', at: 'i4', round: 3 }];
      delete moved.data.runs.n1.reason;
      const runOnly = previewImport(JSON.stringify(moved));
      expect(runOnly.plan).toMatchObject({ identical: false, routines: { unchanged: 1 }, runs: { changed: 1 } });
      expect(confirmImport(runOnly).ok).toBe(true);
      await tick(30);
      store = await reload();
      expect(store.getState().data).toEqual(moved.data);
      expect('reason' in store.getState().data.runs.n1).toBe(false);
    });

    it('a format-1 backup imports to valid format-2 data: the routines and runs here are replaced (the plan says so), and the export brings them back', async () => {
      fakeLocks();
      let store = await load();
      logText(store, 'mine');
      seed(store);
      await tick(30);
      const { toBackup } = await import('@/domain/backup');
      const exported = toBackup(store.getState().data);
      const had = store.getState().data;
      let { previewImport, confirmImport } = await import('@/store/importBackup');

      const old = previewImport(file({ version: 1, threads: {}, activities: { o1: act('o1', 'from an old backup') } }));
      expect(old.plan).toMatchObject({ identical: false, empty: false, routines: { added: 0, removed: 1, changed: 0, unchanged: 0 }, runs: { added: 0, removed: 1, changed: 0, unchanged: 0 } });
      expect(confirmImport(old)).toEqual({ ok: true, activities: 1 });
      const expected = { version: 2, threads: {}, activities: { o1: act('o1', 'from an old backup') }, routines: {}, runs: {} };
      expect(store.getState().data).toEqual(expected);
      await tick(30);
      expect(await onDisk()).toEqual(expected);
      store = await reload();
      expect(store.getState().data).toEqual(expected);
      expect(JSON.parse(toBackup(store.getState().data)).data).toEqual(expected);

      // The export made before brings everything back.
      ({ previewImport, confirmImport } = await import('@/store/importBackup'));
      const back = previewImport(exported);
      expect(back.plan).toMatchObject({ identical: false, routines: { added: 1 }, runs: { added: 1 } });
      expect(confirmImport(back).ok).toBe(true);
      await tick(30);
      store = await reload();
      expect(store.getState().data).toEqual(had);
    });

    it('a journal written before the upgrade (four keys, schema 3) replays after it: nothing set aside, no “couldn’t be restored”', async () => {
      // The database as the previous version left it, and the journal of a change it hadn't committed.
      const { nodeDb } = await import('./nodeDb');
      const { MIGRATIONS } = await import('./schema');
      const old = nodeDb(env.state.dbPath);
      await old.exec(MIGRATIONS[0]);
      await old.exec(MIGRATIONS[1]);
      await old.exec(MIGRATIONS[2]);
      await old.exec('PRAGMA user_version = 3');
      await old.run('INSERT INTO activities (id, text, occurred_at, created_at, doing_id, note, lit, settled_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['a1', 'saved before', at, at, null, null, 0, null]);
      old.close();
      env.ls.set('wanderment:uses-sqlite', '1');
      env.ls.set(
        'wanderment:journal',
        JSON.stringify({ changes: { upsertThreads: [{ id: 't1', name: 'draw', hidden: false, createdAt: at }], deleteThreads: [], upsertActivities: [act('j1', 'only in the journal', ['t1'])], deleteActivities: [] }, settings: { showShading: false } }),
      );

      fakeLocks();
      let store = await load();
      await tick(30);
      expect(store.getState().storage).toEqual(READY);
      expect(store.getState().saveError).toBeUndefined();
      expect(texts(store)).toEqual(['only in the journal', 'saved before']);
      expect(store.getState().data.threads.t1.name).toBe('draw');
      expect(store.getState().showShading).toBe(false);
      expect(store.getState().data).toMatchObject({ version: 2, routines: {}, runs: {} });
      expect(env.ls.has('wanderment:journal')).toBe(false);
      expect([...env.ls.keys()].filter((k) => k.startsWith('wanderment:journal-failed-'))).toEqual([]);

      // The same once routines and runs exist: an old journal changes neither.
      seed(store);
      await tick(30);
      env.ls.set('wanderment:journal', JSON.stringify({ changes: { upsertThreads: [], deleteThreads: ['t1'], upsertActivities: [act('j2', 'from an old tab’s journal')], deleteActivities: ['a1'] } }));
      store = await reload();
      expect(store.getState().saveError).toBeUndefined();
      expect(texts(store)).toEqual(['from an old tab’s journal', 'only in the journal']);
      expect(store.getState().data.threads).toEqual({});
      expect(store.getState().data.routines).toEqual(both.routines);
      expect(store.getState().data.runs).toEqual(both.runs);
      expect([...env.ls.keys()].filter((k) => k.startsWith('wanderment:journal-failed-'))).toEqual([]);
    });

    it('an old-format blob taken in (at start, and from an old tab while open) adds its records and never removes a routine or a run', async () => {
      fakeLocks();
      let store = await load();
      // Only a routine and a run: no wander, no activity.
      seed(store);
      await tick(30);
      expect(await onDisk()).toEqual({ version: 2, threads: {}, activities: {}, ...both });

      // At the next start an old key is there (a tab still running the first release wrote it).
      (await import('./persistence')).stopPersistence();
      env.ls.set('wanderment', legacyBlob({ version: 1, threads: {}, activities: { o1: act('o1', 'from the old tab') } }));
      page = fakePage();
      fakeLocks();
      store = await load();
      await tick(30);
      expect(store.getState().storage).toEqual(READY);
      expect(texts(store)).toEqual(['from the old tab']);
      expect(store.getState().data.routines).toEqual(both.routines);
      expect(store.getState().data.runs).toEqual(both.runs);
      expect(env.ls.has('wanderment')).toBe(false);
      expect(await onDisk()).toEqual(store.getState().data);

      // While this page holds the data, the old tab writes again.
      const blob = legacyBlob({ version: 1, threads: {}, activities: { o1: act('o1', 'from the old tab'), o2: act('o2', 'and another') } });
      env.ls.set('wanderment', blob);
      page.storageEvent('wanderment', blob);
      await tick(30);
      expect(texts(store)).toEqual(['and another', 'from the old tab']);
      expect(store.getState().data.routines).toEqual(both.routines);
      expect(store.getState().data.runs).toEqual(both.runs);
      expect((await onDisk()).routines).toEqual(both.routines);
      expect((await onDisk()).runs).toEqual(both.runs);

      // A blob in the new format arriving the same way adds the routine it holds, too.
      const newer = legacyBlob({ version: 2, threads: {}, activities: {}, routines: { r8: routine('r8', { words: 'Pack' }) }, runs: {} });
      env.ls.set('wanderment', newer);
      page.storageEvent('wanderment', newer);
      await tick(30);
      expect(store.getState().data.routines).toEqual({ ...both.routines, r8: routine('r8', { words: 'Pack' }) });
      expect((await onDisk()).routines.r8).toEqual(routine('r8', { words: 'Pack' }));
      expect(texts(store)).toEqual(['and another', 'from the old tab']);
    });

    it('a fallback blob with routines and runs, taken in by a database that already has data, adds the ones it lacks', async () => {
      fakeLocks();
      let store = await load();
      logText(store, 'mine');
      seed(store);
      await tick(30);
      (await import('./persistence')).stopPersistence();
      // An earlier fallback session's blob (format 2): r1 again (stale words), and a routine and run this database never saw.
      env.ls.set('wanderment', legacyBlob({ version: 2, threads: {}, activities: {}, routines: { r1: routine('r1', { words: 'stale' }), r7: routine('r7', { words: 'Pack' }) }, runs: { n7: run('n7', { routineId: 'r7' }) } }));
      page = fakePage();
      fakeLocks();
      store = await load();
      await tick(30);
      expect(store.getState().data.routines).toEqual({ r1: routine('r1'), r7: routine('r7', { words: 'Pack' }) });
      expect(store.getState().data.runs).toEqual({ n1: run('n1'), n7: run('n7', { routineId: 'r7' }) });
      expect(texts(store)).toEqual(['mine']);
      expect(await onDisk()).toEqual(store.getState().data);

      // Taken in once: removed here since, it doesn't come back when the same blob shows up again.
      change(store, (d) => ({ routines: { r1: d.routines.r1 }, runs: { n1: d.runs.n1 } }));
      await tick(30);
      (await import('./persistence')).stopPersistence();
      env.ls.set('wanderment', legacyBlob({ version: 2, threads: {}, activities: {}, routines: { r7: routine('r7', { words: 'Pack' }) }, runs: { n7: run('n7', { routineId: 'r7' }) } }));
      page = fakePage();
      fakeLocks();
      store = await load();
      await tick(30);
      expect(store.getState().data.routines).toEqual({ r1: routine('r1') });
      expect(store.getState().data.runs).toEqual({ n1: run('n1') });
    });
  });

  // ───────── P-86: a run as the actions make it ─────────
  describe('P-86: a run with a nested level, a reason and waiting-since survives everything; a damaged one loads (P-90: built as the app builds it now — the step is broken down in Plan; runs with this-run changes from the build before are in goldenP90.test.ts)', () => {
    const REASON = 'lunch 🍜 “back at two”';
    type Ids = { runId: string; routineId: string; seqId: string };
    type Body = { frames: { seq: string; at: string | null; round: number; from?: string }[]; changes: { id: string; kind: string }[] } & Record<string, unknown>;
    const body = (store: Store, runId: string) => store.getState().data.runs[runId] as unknown as Body;
    const file = (data: unknown) => JSON.stringify({ app: 'wanderment', exportedAt: at, data });
    /** A new page load (the old page is gone). */
    async function reload() {
      (await import('./persistence')).stopPersistence();
      page = fakePage();
      fakeLocks();
      const store = await load();
      await tick(30);
      return store;
    }
    /**
     * Through the store's actions, as a person would: "New: Apply to Acme" and, in its Plan, its first
     * step, a wait, the divider and a number; Start; Plan; Break it down; a wait added inside it;
     * Resume; Next onto that wait; Pause with a reason.
     */
    function build(store: Store): Ids {
      const g = () => store.getState();
      const made = g().createRoutine('Apply to Acme');
      if (!made.ok || !made.routineId) throw new Error('New: was refused');
      const routineId = made.routineId;
      const all = [
        g().editRoutine(routineId, { kind: 'addStep', text: 'Tailor the CV' }),
        g().editRoutine(routineId, { kind: 'addWait', wait: 'a reply from Acme' }),
        g().editRoutine(routineId, { kind: 'divider', from: 0 }),
        g().editRoutine(routineId, { kind: 'repeat', times: 3 }),
      ];
      const started = g().startRoutine(routineId);
      if (!started.ok || !started.runId) throw new Error('Start was refused');
      const runId = started.runId;
      const first = body(store, runId).frames[0].at!;
      all.push(g().planRun(runId), g().editRoutine(routineId, { kind: 'breakDown', item: first, steps: ['Open the job ad', 'Rewrite the summary'] }));
      const inner = body(store, runId).frames[1];
      all.push(g().editRoutine(inner.seq, { kind: 'addWait', wait: 'the printer', after: inner.at }), g().resumeRun(runId), g().nextStep(runId), g().pauseRun(runId, REASON));
      expect(all.map((r) => r.ok)).toEqual(all.map(() => true));
      return { runId, routineId, seqId: inner.seq };
    }
    /** It is what the contract names: a nested level, a reason, waiting-since (and, since P-90, no this-run change: the breakdown is the routine's). */
    async function isAsBuilt(data: Store extends { getState(): { data: infer D } } ? D : never, { runId, routineId, seqId }: Ids) {
      const { runnerView, panelView } = await import('@/domain/runView');
      const run = data.runs[runId] as unknown as Body;
      expect(run.frames).toHaveLength(2);
      expect(run.frames[0]).toMatchObject({ seq: routineId, round: 1 });
      expect(run.frames[1]).toMatchObject({ seq: seqId, round: 1, from: run.frames[0].at });
      expect(run.changes).toEqual([]);
      expect('mode' in run).toBe(false);
      expect(run).toMatchObject({ status: 'paused', reason: REASON });
      expect(typeof run.waitingSince).toBe('string');
      expect(data.routines[routineId]).toMatchObject({ words: 'Apply to Acme', named: true, open: true, home: true, repeatFrom: 0, repeat: 3 });
      expect(data.routines[seqId]).toMatchObject({ words: 'Tailor the CV', named: false });
      expect('ownerRunId' in data.routines[seqId]).toBe(false);
      expect((data.routines[routineId].items as { ref?: string }[])[0].ref).toBe(seqId);
      expect(runnerView(data, runId)).toMatchObject({ status: 'paused', planning: false, level: 'Tailor the CV', parent: 'Apply to Acme', step: { kind: 'wait', words: 'the printer' }, next: 'itsHappened' });
      expect(panelView(data, runId)).toMatchObject({ then: 'Rewrite the summary', wait: { words: 'the printer', since: run.waitingSince } });
    }

    it('reload: saved to SQLite as it is made, the same after a reload, and it carries on; a verb writes the run’s row and nothing else', async () => {
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const shown = store.getState().data;
      await isAsBuilt(shown, ids);
      expect(await onDisk()).toEqual(shown);

      store = await reload();
      expect(store.getState().storage).toEqual(READY);
      expect(store.getState().data).toEqual(shown);
      await isAsBuilt(store.getState().data, ids);

      env.p29.writes = [];
      expect(store.getState().resumeRun(ids.runId).ok).toBe(true);
      expect(store.getState().nextStep(ids.runId).ok).toBe(true); // "It's happened"
      await tick(30);
      const { runnerView } = await import('@/domain/runView');
      expect(runnerView(store.getState().data, ids.runId)).toMatchObject({ status: 'running', step: { kind: 'step', words: 'Rewrite the summary' } });
      expect('waitingSince' in store.getState().data.runs[ids.runId]).toBe(false);
      expect('reason' in store.getState().data.runs[ids.runId]).toBe(false);
      expect(env.p29.writes.filter((q) => /INTO routines|FROM routines/.test(q))).toEqual([]);
      expect(env.p29.writes.filter((q) => /INTO runs/.test(q)).length).toBeGreaterThan(0);
      expect(await onDisk()).toEqual(store.getState().data);
      store = await reload();
      expect(runnerView(store.getState().data, ids.runId)).toMatchObject({ status: 'running', step: { words: 'Rewrite the summary' } });
    });

    it('journal replay: made while no write commits (the tab dies), all of it is there after a reload; so is a change that removes a record', async () => {
      fakeLocks();
      let store = await load();
      logText(store, 'before');
      await tick(30);
      env.state.hangWrites = true;
      const ids = build(store);
      await tick(30);
      expect(await onDisk()).toMatchObject({ routines: {}, runs: {} });
      const shown = store.getState().data;
      env.state.hangWrites = false;

      store = await reload();
      expect(store.getState().storage).toEqual(READY);
      expect(store.getState().saveError).toBeUndefined();
      expect(store.getState().data).toEqual(shown);
      await isAsBuilt(store.getState().data, ids);
      expect(await onDisk()).toEqual(shown);
      expect(env.ls.has('wanderment:journal')).toBe(false);

      // A reason being typed when the tab dies (each keystroke is a change): it is there, as typed.
      env.state.hangWrites = true;
      for (const typed of ['b', 'ba', 'back at two, th']) expect(store.getState().setPauseReason(ids.runId, typed).ok).toBe(true);
      await tick(30);
      env.state.hangWrites = false;
      store = await reload();
      expect(store.getState().data.runs[ids.runId].reason).toBe('back at two, th');
      expect((await onDisk()).runs[ids.runId].reason).toBe('back at two, th');

      // A step broken down (a sequence made, saved), then Undo while no write commits: the delete of that
      // sequence is only in the journal, and lands too.
      const had = Object.keys(store.getState().data.routines);
      const plain = (store.getState().data.routines[ids.seqId].items as { id: string; text?: string }[]).find((i) => i.text === 'Rewrite the summary')!;
      expect(store.getState().editRoutine(ids.seqId, { kind: 'breakDown', item: plain.id, steps: ['Find the tab'] }).ok).toBe(true);
      await tick(30);
      const [deeper] = Object.keys(store.getState().data.routines).filter((id) => !had.includes(id));
      expect((await onDisk()).routines[deeper]).toBeDefined();
      env.state.hangWrites = true;
      expect(store.getState().undoLast()).toBe(true);
      await tick(30);
      env.state.hangWrites = false;
      store = await reload();
      expect(store.getState().data.routines[deeper]).toBeUndefined();
      expect(body(store, ids.runId).frames).toHaveLength(2);
      expect((await onDisk()).routines[deeper]).toBeUndefined();
      expect(await onDisk()).toEqual(store.getState().data);
    });

    it('the localStorage fallback keeps all of it, and moves it into SQLite once it can', async () => {
      env.state.openError = new Error('no OPFS');
      fakeLocks();
      let store = await load();
      expect(store.getState().storage).toEqual({ state: 'ready', kind: 'local' });
      const ids = build(store);
      await tick(30);
      const shown = store.getState().data;
      expect(JSON.parse(env.ls.get('wanderment')!).state.data.runs[ids.runId]).toEqual(JSON.parse(JSON.stringify(shown.runs[ids.runId])));

      store = await reload();
      expect(store.getState().storage).toEqual({ state: 'ready', kind: 'local' });
      expect(store.getState().data).toEqual(shown);
      await isAsBuilt(store.getState().data, ids);

      env.state.openError = undefined;
      store = await reload();
      expect(store.getState().storage).toEqual(READY);
      expect(store.getState().data).toEqual(shown);
      expect(await onDisk()).toEqual(shown);
      await isAsBuilt((await reload()).getState().data, ids);
    });

    it('hand-over with a take-back: another page moved the run on; this page takes that, keeps its own unsaved edit to the routine, and its Undo and notice go', async () => {
      fakeLocks();
      const store = await load();
      const ids = build(store);
      await tick(30);
      // This page: a change of its own left in the journal when the page is hidden.
      writeGate = deferred();
      expect(store.getState().setPauseReason(ids.runId, 'back at three').ok).toBe(true);
      await tick(0);
      expect(store.getState().editRoutine(ids.routineId, { kind: 'addStep', text: 'Book the call' }).ok).toBe(true);
      await tick(0);
      expect(store.getState().undo).toBeDefined();
      expect(store.getState().runNotice).toBeDefined();
      page.hide();
      writeGate.open();
      writeGate = undefined;
      await tick(30);
      expect(JSON.parse(env.ls.get('wanderment:journal')!).changes.upsertRoutines.map((r: { id: string }) => r.id)).toEqual([ids.routineId]);
      const mine = store.getState().data;

      // The other page: resumes the run and says the wait has happened.
      const { runVerb } = await import('@/domain/run');
      const disk = await onDisk();
      const later = { now: '2026-11-01T12:00:00.000Z', id: () => 'other-page-id' };
      const moved = runVerb(runVerb(disk, { kind: 'resume', runId: ids.runId }, later).data, { kind: 'next', runId: ids.runId }, later);
      expect(moved.ok).toBe(true);
      const { nodeDb } = await import('./nodeDb');
      const { saveChanges } = await import('./repository');
      const db = nodeDb(env.state.dbPath);
      await saveChanges(db, { upsertRuns: [moved.data.runs[ids.runId]] } as never);
      db.close();

      page.show();
      await tick(100);
      expect(store.getState().storage).toEqual(READY);
      expect(store.getState().saveError).toBeUndefined();
      // The run is the other page's (whole record); the routine is this page's, with its added step.
      expect(store.getState().data.runs[ids.runId]).toEqual(moved.data.runs[ids.runId]);
      expect(store.getState().data.routines[ids.routineId]).toEqual(mine.routines[ids.routineId]);
      const { runnerView } = await import('@/domain/runView');
      expect(runnerView(store.getState().data, ids.runId)).toMatchObject({ status: 'running', step: { words: 'Rewrite the summary' } });
      expect(store.getState().undo).toBeUndefined();
      expect(store.getState().runNotice).toBeUndefined();
      expect(await onDisk()).toEqual(store.getState().data);
      expect(env.ls.has('wanderment:journal')).toBe(false);
      const next = await reload();
      expect(next.getState().data).toEqual(store.getState().data);
    });

    it('undo: removing the step the run is inside (the routine and the run in one step) and Break it down (a record made) are taken back on screen and on disk', async () => {
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const before = store.getState().data;
      const outer = body(store, ids.runId).frames[0].at!;
      expect(store.getState().editRoutine(ids.routineId, { kind: 'remove', item: outer }).ok).toBe(true);
      await tick(30);
      const removed = await onDisk();
      expect((removed.routines[ids.routineId].items as { id: string }[]).map((i) => i.id)).not.toContain(outer);
      // The run is out of the removed step, on the routine's next one (the wait), in the same write.
      expect((removed.runs[ids.runId] as unknown as Body).frames).toHaveLength(1);
      expect(removed).toEqual(store.getState().data);

      expect(store.getState().undoLast()).toBe(true);
      expect(store.getState().data).toEqual(before);
      await tick(30);
      expect(await onDisk()).toEqual(before);
      store = await reload();
      expect(store.getState().data).toEqual(before);
      await isAsBuilt(store.getState().data, ids);

      // Break it down again, one level deeper, then Undo: the new sequence is gone from the disk too.
      const start = store.getState().data;
      const inner = body(store, ids.runId).frames[1];
      expect(store.getState().editRoutine(inner.seq, { kind: 'breakDown', item: 'nope', steps: ['x'] }).ok).toBe(false);
      const plain = (start.routines[inner.seq].items as { id: string; text?: string }[]).find((i) => i.text !== undefined)!;
      expect(store.getState().editRoutine(inner.seq, { kind: 'breakDown', item: plain.id, steps: ['Find the tab'] }).ok).toBe(true);
      await tick(30);
      expect(Object.keys((await onDisk()).routines)).toHaveLength(3);
      store.getState().undoLast();
      await tick(30);
      expect(store.getState().data).toEqual(start);
      expect(await onDisk()).toEqual(start);
      expect(Object.keys((await onDisk()).routines)).toHaveLength(2);
    });

    it('export → import: the same file is identical; a file whose run is elsewhere replaces it and survives a reload; a file whose place or steps are not in the right shape is refused, changing nothing', async () => {
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const exported = store.getState().data;
      const { toBackup } = await import('@/domain/backup');
      let { previewImport, confirmImport } = await import('@/store/importBackup');
      const json = toBackup(exported);
      expect(JSON.parse(json).data.runs[ids.runId]).toEqual(JSON.parse(JSON.stringify(exported.runs[ids.runId])));
      const same = previewImport(json);
      expect(same.plan).toMatchObject({ identical: true, routines: { unchanged: 2 }, runs: { unchanged: 1 } });
      expect(same.incoming).toEqual(exported);
      await isAsBuilt(same.incoming, ids);

      const elsewhere = JSON.parse(json);
      elsewhere.data.runs[ids.runId].frames = [elsewhere.data.runs[ids.runId].frames[0]];
      delete elsewhere.data.runs[ids.runId].waitingSince;
      const differs = previewImport(JSON.stringify(elsewhere));
      expect(differs.plan).toMatchObject({ identical: false, routines: { unchanged: 2 }, runs: { changed: 1 } });
      expect(confirmImport(differs).ok).toBe(true);
      await tick(30);
      store = await reload();
      expect(store.getState().data).toEqual(elsewhere.data);
      const { runnerView } = await import('@/domain/runView');
      expect(runnerView(store.getState().data, ids.runId)).toMatchObject({ level: 'Apply to Acme', step: { kind: 'routine', words: 'Tailor the CV' }, middle: 'stepIn' });

      ({ previewImport, confirmImport } = await import('@/store/importBackup'));
      const here = store.getState().data;
      for (const [damage, message] of [
        [(d: typeof elsewhere.data) => (d.runs[ids.runId].frames = 'banana'), 'A run in the backup has a place that isn’t in the right shape.'],
        [(d: typeof elsewhere.data) => (d.runs[ids.runId].changes = { not: 'a list' }), 'A run in the backup has changes that aren’t in the right shape.'],
        [(d: typeof elsewhere.data) => (d.routines[ids.routineId].items = [{ text: 'no id' }]), 'The routine “Apply to Acme” in the backup has steps that aren’t in the right shape.'],
        [(d: typeof elsewhere.data) => d.routines[ids.routineId].items.push({ ...d.routines[ids.routineId].items[0] }), 'The routine “Apply to Acme” in the backup has two steps with the same id'],
      ] as const) {
        const bad = JSON.parse(json);
        damage(bad.data);
        expect(() => previewImport(file(bad.data)), message).toThrow(message);
      }
      expect(store.getState().data).toBe(here);
    });

    it('a damaged body loads without throwing: the run is shown at the start of its routine and still runs; a damaged routine reads as having no steps yet', async () => {
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      (await import('./persistence')).stopPersistence();
      const { nodeDb } = await import('./nodeDb');
      let db = nodeDb(env.state.dbPath);
      await db.run("UPDATE runs SET body = 'not json'");
      db.close();

      store = await reload();
      expect(store.getState().storage).toEqual(READY);
      const { runnerView, panelView, pausedView, seeItAll, homeTiles, leftOff, planView, runRoute } = await import('@/domain/runView');
      const { searchStarts } = await import('@/domain/starts');
      const read = () => {
        const d = store.getState().data;
        return [runnerView(d, ids.runId), panelView(d, ids.runId), pausedView(d, ids.runId), seeItAll(d, ids.runId), homeTiles(d), leftOff(d), planView(d, { runId: ids.runId }), planView(d, { routineId: ids.routineId }), runRoute(d, ids.runId), searchStarts(d, 'apply')];
      };
      expect(read).not.toThrow();
      expect(store.getState().data.runs[ids.runId].frames).toBeUndefined();
      // The columns survived (waiting-since is one), the place did not: the start of its routine.
      // (Its first step was broken down in Plan, so it reads as the routine that step became.)
      expect(runnerView(store.getState().data, ids.runId)).toMatchObject({ status: 'left', level: 'Apply to Acme', depth: 1, step: { kind: 'routine', words: 'Tailor the CV' } });
      expect(homeTiles(store.getState().data)).toMatchObject([{ name: 'Apply to Acme', state: 'paused', at: 'Tailor the CV', action: 'resume' }]);
      expect(leftOff(store.getState().data)).toEqual({ kind: 'home' });
      for (const press of [() => store.getState().resumeRun(ids.runId), () => store.getState().nextStep(ids.runId), () => store.getState().nextStep(ids.runId)]) expect(press().ok).toBe(true);
      expect(runnerView(store.getState().data, ids.runId)).toMatchObject({ status: 'running', step: { kind: 'wait', words: 'a reply from Acme' } });
      await tick(30);
      expect(await onDisk()).toEqual(store.getState().data);

      // The routines' bodies too.
      (await import('./persistence')).stopPersistence();
      db = nodeDb(env.state.dbPath);
      await db.run("UPDATE routines SET body = '{\"items\": \"banana\", \"repeatFrom\": \"x\"}'");
      db.close();
      store = await reload();
      expect(store.getState().storage).toEqual(READY);
      expect(read).not.toThrow();
      // Nothing to stand on: that is Plan, where the next step is added.
      expect(runnerView(store.getState().data, ids.runId)).toMatchObject({ step: { kind: 'edge' }, next: 'edge', planning: true });
      expect(runRoute(store.getState().data, ids.runId)).toBe('plan');
      expect(store.getState().editRoutine(ids.routineId, { kind: 'addStep', text: 'Start again from here' }).ok).toBe(true);
      // P-101 (ruling 4; was `planning: true`): on a step now, it is paused — Plan is a view, not a state.
      expect(runnerView(store.getState().data, ids.runId)).toMatchObject({ planning: false, status: 'paused', step: { kind: 'step', words: 'Start again from here' } });
      expect(store.getState().resumeRun(ids.runId).ok).toBe(true);
      expect(runnerView(store.getState().data, ids.runId)).toMatchObject({ status: 'running', planning: false, step: { words: 'Start again from here' } });
    });

    describe('a press on the runner while reconnecting', () => {
      /** A running run on the first of three steps, saved; then the page is hidden and shown while another page holds the data. */
      async function away() {
        const locks = fakeLocks();
        const store = await load();
        const g = () => store.getState();
        const made = g().createRoutine('Morning');
        if (!made.ok || !made.routineId) throw new Error('New: was refused');
        const routineId = made.routineId;
        for (const text of ['Stretch', 'Shower', 'Coffee']) g().editRoutine(routineId, { kind: 'addStep', text });
        const started = g().startRoutine(routineId);
        if (!started.ok || !started.runId) throw new Error('Start was refused');
        const runId = started.runId;
        await tick(30);
        page.hide();
        await tick(30);
        const release = locks.holdElsewhere();
        page.show();
        await tick(100);
        expect(store.getState().storage).toEqual(RECONNECTING);
        const { runnerView } = await import('@/domain/runView');
        const step = () => runnerView(store.getState().data, runId)!.step.words;
        return { store, runId, routineId, release, step };
      }

      it('Next pressed (twice, impatiently) is kept, with the quiet note, and applied exactly once when the data is back (P-95: with no Undo, as any Next that does not end the run)', async () => {
        const { store, runId, release, step } = await away();
        const before = store.getState().data;
        expect(store.getState().nextStep(runId)).toEqual({ ok: false, reason: 'reconnecting' });
        expect(store.getState().nextStep(runId)).toEqual({ ok: false, reason: 'reconnecting' });
        expect(store.getState().data).toBe(before);
        expect(store.getState().toVerb).toMatchObject({ runId, verb: 'next' });
        expect(store.getState().toast).toEqual({ message: 'Just a moment — reconnecting.', notice: true });
        expect(step()).toBe('Stretch');
        release();
        await tick(30);
        expect(store.getState().storage).toEqual(READY);
        expect(step()).toBe('Shower'); // once, not twice
        expect(store.getState().toVerb).toBeUndefined();
        expect(store.getState().toast).toBeUndefined();
        expect(store.getState().runNotice).toBeUndefined();
        expect(store.getState().undo).toBeUndefined();
        expect(await onDisk()).toEqual(store.getState().data);
      });

      it('the run was moved on by the other page meanwhile: the press is dropped, never applied on top', async () => {
        const { store, runId, release, step } = await away();
        store.getState().nextStep(runId);
        expect(store.getState().toVerb).toBeDefined();
        const { runVerb } = await import('@/domain/run');
        const moved = runVerb(await onDisk(), { kind: 'next', runId }, { now: '2026-11-01T12:00:00.000Z', id: () => 'other-page-id' });
        const { nodeDb } = await import('./nodeDb');
        const { saveChanges } = await import('./repository');
        const db = nodeDb(env.state.dbPath);
        await saveChanges(db, { upsertRuns: [moved.data.runs[runId]] } as never);
        db.close();
        release();
        await tick(30);
        expect(store.getState().storage).toEqual(READY);
        expect(step()).toBe('Shower'); // the other page's Next, and only that
        expect(store.getState().data.runs[runId]).toEqual(moved.data.runs[runId]);
        expect(store.getState().toVerb).toBeUndefined();
        expect(store.getState().undo).toBeUndefined();
      });

      it('the latest press is the one kept: Next then Pause pauses, without moving on', async () => {
        const { store, runId, release, step } = await away();
        store.getState().nextStep(runId);
        store.getState().pauseRun(runId);
        expect(store.getState().toVerb).toMatchObject({ verb: 'pause' });
        release();
        await tick(30);
        expect(step()).toBe('Stretch');
        expect(store.getState().data.runs[runId].status).toBe('paused');
      });

      it('Done, Step in, Resume and Plan are kept the same way; anything that carries typed text is refused, so the screen keeps the text', async () => {
        const { store, runId, routineId, release, step } = await away();
        const g = () => store.getState();
        for (const [verb, press] of [['done', () => g().doneLevel(runId)], ['stepIn', () => g().stepIn(runId)], ['plan', () => g().planRun(runId)], ['resume', () => g().resumeRun(runId)]] as const) {
          expect(press()).toEqual({ ok: false, reason: 'reconnecting' });
          expect(g().toVerb).toMatchObject({ verb, runId });
        }
        store.setState({ toVerb: undefined });
        const before = g().data;
        for (const press of [
          () => g().setPauseReason(runId, 'typed'),
          // Every Plan edit carries typed text or a choice made on screen: refused, never queued.
          () => g().editRoutine(routineId, { kind: 'rename', words: 'typed' }),
          () => g().editRoutine(routineId, { kind: 'addStep', text: 'typed' }),
          () => g().editRoutine(routineId, { kind: 'reword', item: 'x', text: 'typed' }),
          () => g().editRoutine(routineId, { kind: 'breakDown', item: 'x', steps: ['typed', 'steps'] }),
          () => g().editRoutine(routineId, { kind: 'remove', item: 'x' }),
          () => g().createRoutine('typed'),
          () => g().startRoutine(routineId),
          () => g().jumpTo(runId, { level: 0 }),
          () => g().backTo(runId),
          () => g().leaveRun(runId),
        ]) {
          expect(press()).toEqual({ ok: false, reason: 'reconnecting' });
        }
        expect(g().toVerb).toBeUndefined();
        expect(g().data).toBe(before);
        release();
        await tick(30);
        expect(step()).toBe('Stretch');
        expect(g().data.runs[runId].status).toBe('running');
      });
    });
  });

  describe('P-90: the run’s mode (in Plan, or not) survives everything; a press kept while reconnecting never lands on a run that went into Plan', () => {
    type Body = { frames: { seq: string; at: string | null; round: number; from?: string }[]; status?: string; mode?: string } & Record<string, unknown>;
    const body = (store: Store, runId: string) => store.getState().data.runs[runId] as unknown as Body;
    /** A new page load (the old page is gone). */
    async function reload() {
      (await import('./persistence')).stopPersistence();
      page = fakePage();
      fakeLocks();
      const store = await load();
      await tick(30);
      return store;
    }
    /**
     * Through the store's actions: two routines made in Plan and started. "Morning" is run to its second
     * step, then Plan (from the runner: paused, in Plan), with edits made there — a step added, the
     * divider put in, HERE broken down. "Evening" was started first, paused, and planned from its tile
     * (in Plan, without being the run the app is on).
     *
     * P-101 (ruling 4): nothing writes `mode: 'plan'` any more. Both runs are then stored as the build
     * before left them (Plan pressed on each: the mode in the body), so this proves a stored mode is
     * kept exactly — never deleted or converted — through every path, and read as paused.
     */
    function build(store: Store) {
      const g = () => store.getState();
      const all: { ok: boolean }[] = [];
      const make = (name: string, steps: string[]) => {
        const made = g().createRoutine(name);
        if (!made.ok || !made.routineId) throw new Error('New: was refused');
        for (const text of steps) all.push(g().editRoutine(made.routineId, { kind: 'addStep', text }));
        return made.routineId;
      };
      const start = (routineId: string) => {
        const did = g().startRoutine(routineId);
        if (!did.ok || !did.runId) throw new Error('Start was refused');
        return did.runId;
      };
      const evening = make('Evening', ['Tidy up', 'Read']);
      const morning = make('Morning', ['Stretch', 'Shower', 'Coffee']);
      const tile = start(evening);
      all.push(g().pauseRun(tile));
      const runId = start(morning);
      all.push(g().nextStep(runId), g().planRun(runId));
      const here = body(store, runId).frames[0].at!;
      all.push(g().editRoutine(morning, { kind: 'addStep', text: 'Walk' }), g().editRoutine(morning, { kind: 'divider', from: 1 }), g().editRoutine(morning, { kind: 'breakDown', item: here, steps: ['Warm water', 'Cold water'] }), g().planRun(tile));
      expect(all.map((r) => r.ok)).toEqual(all.map(() => true));
      expect(['mode' in g().data.runs[runId], 'mode' in g().data.runs[tile]]).toEqual([false, false]);
      const d = g().data;
      expect(g().replaceData({ ...d, runs: { ...d.runs, [runId]: { ...d.runs[runId], mode: 'plan' }, [tile]: { ...d.runs[tile], mode: 'plan' } } })).toBe(true);
      return { runId, tile, morning, evening };
    }
    /** P-101 (ruling 4; was: what "in Plan" is): a mode an earlier build stored — kept as stored, read as paused. */
    async function isInPlan(data: Store extends { getState(): { data: infer D } } ? D : never, { runId, tile, morning }: ReturnType<typeof build>) {
      const { planView, leftOff, homeTiles, runRoute, pausedView } = await import('@/domain/runView');
      // As stored: the mode is in the run's body; the run the app is on is paused, the other has no status.
      expect(data.runs[runId]).toMatchObject({ status: 'paused', mode: 'plan' });
      expect(data.runs[tile].mode).toBe('plan');
      expect('status' in data.runs[tile]).toBe(false);
      // As read (P-101): paused, never "planning" — home on reopening; Plan shows both, "at <step>".
      expect(leftOff(data)).toEqual({ kind: 'home' });
      expect([runRoute(data, runId), runRoute(data, tile)]).toEqual(['home', 'runner']);
      expect(planView(data, { runId })).toMatchObject({ name: 'Morning', planning: true, line: 'at Warm water', forward: { kind: 'resume', label: 'Resume at Warm water', runId } });
      expect(planView(data, { runId })!.divider).toMatchObject({ seq: morning, from: 1 });
      expect(planView(data, { runId: tile })).toMatchObject({ planning: true, line: 'at Tidy up' });
      // (Both routines were made in the same instant here, so their order is by id: compared by name.)
      expect(homeTiles(data).map((x) => [x.name, x.state, x.action]).sort()).toEqual([['Evening', 'paused', 'resume'], ['Morning', 'paused', 'resume']]);
      expect(pausedView(data, runId)).toMatchObject({ kind: 'paused', action: 'resume' });
    }

    it('reload: saved to SQLite as it is made (the mode in the run’s body), the same after a reload; Resume takes it out of Plan on disk too, exactly where it was', async () => {
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const shown = store.getState().data;
      await isInPlan(shown, ids);
      expect(await onDisk()).toEqual(shown);
      // (The mode is not a column: it is in the body, with the frames.)
      const { nodeDb } = await import('./nodeDb');
      const db = nodeDb(env.state.dbPath);
      const [row] = await db.all<{ body: string }>('SELECT body FROM runs WHERE id = ?', [ids.runId]);
      db.close();
      expect(JSON.parse(row.body)).toMatchObject({ mode: 'plan', status: 'paused' });

      store = await reload();
      expect(store.getState().storage).toEqual(READY);
      expect(store.getState().data).toEqual(shown);
      await isInPlan(store.getState().data, ids);

      expect(store.getState().resumeRun(ids.runId).ok).toBe(true);
      await tick(30);
      expect('mode' in (await onDisk()).runs[ids.runId]).toBe(false);
      expect((await onDisk()).runs[ids.runId]).toMatchObject({ status: 'running', frames: body(store, ids.runId).frames });
      store = await reload();
      const { runnerView, leftOff } = await import('@/domain/runView');
      expect(leftOff(store.getState().data)).toEqual({ kind: 'runner', runId: ids.runId });
      expect(runnerView(store.getState().data, ids.runId)).toMatchObject({ status: 'running', planning: false, step: { words: 'Warm water' } });
      // The other run is still in Plan (left there from its tile).
      expect(store.getState().data.runs[ids.tile].mode).toBe('plan');
    });

    it('after the audit (F1): a run the build before stored "running" at the edge is left as stored at load; a Start elsewhere is ONE write — that run in Plan and not running — on disk, after a reload, and from the journal alone', async () => {
      fakeLocks();
      let store = await load();
      const at = '2026-11-01T00:00:00.000Z';
      const base = store.getState().data;
      const legacy = {
        ...base,
        routines: {
          gym: { id: 'gym', words: 'Gym', named: true, createdAt: at, home: true, open: true, items: [{ id: 'a', text: 'Warm up' }] },
          house: { id: 'house', words: 'House', named: true, createdAt: at, home: true, items: [{ id: 'h', text: 'Tidy the hall' }] },
          desk: { id: 'desk', words: 'Desk', named: true, createdAt: at, home: true, items: [{ id: 'd', text: 'Clear it' }] },
        },
        runs: { edge: { id: 'edge', routineId: 'gym', startedAt: at, touchedAt: at, frames: [{ seq: 'gym', at: null, round: 1 }], changes: [], status: 'running' } },
      } as unknown as typeof base;
      expect(store.getState().replaceData(legacy)).toBe(true);
      await tick(30);
      // Nothing is rewritten at load: it is on disk as that build left it, and reads as planning.
      store = await reload();
      expect(body(store, 'edge')).toMatchObject({ status: 'running' });
      expect('mode' in body(store, 'edge')).toBe(false);
      const { leftOff } = await import('@/domain/runView');
      expect(leftOff(store.getState().data)).toEqual({ kind: 'plan', runId: 'edge' });

      // Start elsewhere: not refused; saved to SQLite in the one write.
      const first = store.getState().startRoutine('house');
      if (!first.ok || !first.runId) throw new Error(`Start was refused: ${JSON.stringify(first)}`);
      await tick(30);
      const running = (d: typeof base) => Object.values(d.runs).filter((r) => r.status === 'running').map((r) => r.id);
      for (const d of [store.getState().data, await onDisk()]) {
        expect(running(d)).toEqual([first.runId]);
        expect(d.runs.edge.status).toBeUndefined();
        // P-101 (ruling 4; was "stored in Plan"): no mode is written for it.
        expect('mode' in d.runs.edge).toBe(false);
      }
      expect(await onDisk()).toEqual(store.getState().data);
      // A start has no Undo (P-95): the edge run is put back exactly as it was stored by importing it again.
      expect(store.getState().undo).toBeUndefined();
      expect(store.getState().replaceData(legacy)).toBe(true);
      await tick(30);
      expect((await onDisk()).runs).toEqual({ edge: legacy.runs.edge });

      // The same when the tab dies before the write commits: all of it comes back from the journal.
      env.state.hangWrites = true;
      const second = store.getState().startRoutine('desk');
      if (!second.ok || !second.runId) throw new Error('Start was refused');
      await tick(30);
      expect((await onDisk()).runs.edge.status).toBe('running');
      env.state.hangWrites = false;
      store = await reload();
      expect(running(store.getState().data)).toEqual([second.runId]);
      expect(body(store, 'edge').status).toBeUndefined();
      expect('mode' in body(store, 'edge')).toBe(false);
      expect(await onDisk()).toEqual(store.getState().data);
      expect(leftOff(store.getState().data)).toEqual({ kind: 'runner', runId: second.runId });
    });

    it('journal replay: Plan and its edits made while no write commits (the tab dies) are all there after a reload — the mode too; and so is leaving Plan', async () => {
      fakeLocks();
      let store = await load();
      env.state.hangWrites = true;
      const ids = build(store);
      await tick(30);
      expect(await onDisk()).toMatchObject({ routines: {}, runs: {} });
      expect(JSON.parse(env.ls.get('wanderment:journal')!).changes.upsertRuns.find((r: { id: string }) => r.id === ids.runId)).toMatchObject({ mode: 'plan', status: 'paused' });
      const shown = store.getState().data;
      env.state.hangWrites = false;

      store = await reload();
      expect(store.getState().storage).toEqual(READY);
      expect(store.getState().saveError).toBeUndefined();
      expect(store.getState().data).toEqual(shown);
      await isInPlan(store.getState().data, ids);
      expect(await onDisk()).toEqual(shown);
      expect(env.ls.has('wanderment:journal')).toBe(false);

      // Leaving Plan (Resume) when the tab dies before the write commits: the run is running after the reload, not in Plan.
      env.state.hangWrites = true;
      expect(store.getState().resumeRun(ids.runId).ok).toBe(true);
      await tick(30);
      expect((await onDisk()).runs[ids.runId].mode).toBe('plan');
      env.state.hangWrites = false;
      store = await reload();
      expect(store.getState().data.runs[ids.runId]).toMatchObject({ status: 'running' });
      expect('mode' in store.getState().data.runs[ids.runId]).toBe(false);
      expect('mode' in (await onDisk()).runs[ids.runId]).toBe(false);
    });

    it('the localStorage fallback keeps the mode, and it moves into SQLite with the rest once it can', async () => {
      env.state.openError = new Error('no OPFS');
      fakeLocks();
      let store = await load();
      expect(store.getState().storage).toEqual({ state: 'ready', kind: 'local' });
      const ids = build(store);
      await tick(30);
      const shown = store.getState().data;
      expect(JSON.parse(env.ls.get('wanderment')!).state.data.runs[ids.runId]).toMatchObject({ mode: 'plan', status: 'paused' });
      expect(JSON.parse(env.ls.get('wanderment')!).state.data.runs[ids.tile].mode).toBe('plan');

      store = await reload();
      expect(store.getState().storage).toEqual({ state: 'ready', kind: 'local' });
      expect(store.getState().data).toEqual(shown);
      await isInPlan(store.getState().data, ids);

      env.state.openError = undefined;
      store = await reload();
      expect(store.getState().storage).toEqual(READY);
      expect(store.getState().data).toEqual(shown);
      expect(await onDisk()).toEqual(shown);
      await isInPlan((await reload()).getState().data, ids);
    });

    it('hand-over (two tabs, Plan in one, the runner in the other): the other page resumed the run — this page takes that, and is no longer in Plan; then the other page put it in Plan — this page is in Plan', async () => {
      fakeLocks();
      const store = await load();
      const ids = build(store);
      await tick(30);
      const { runVerb } = await import('@/domain/run');
      const { runRoute, leftOff } = await import('@/domain/runView');
      const { nodeDb } = await import('./nodeDb');
      const { saveChanges } = await import('./repository');
      const elsewhere = async (kind: 'resume' | 'plan', now: string) => {
        const moved = runVerb(await onDisk(), { kind, runId: ids.runId }, { now, id: () => 'other-page-id' });
        expect(moved.ok).toBe(true);
        const db = nodeDb(env.state.dbPath);
        await saveChanges(db, { upsertRuns: [moved.data.runs[ids.runId]] } as never);
        db.close();
        return moved.data.runs[ids.runId];
      };

      page.hide();
      await tick(30);
      const resumed = await elsewhere('resume', '2026-11-01T12:00:00.000Z');
      expect('mode' in resumed).toBe(false);
      page.show();
      await tick(100);
      expect(store.getState().storage).toEqual(READY);
      expect(store.getState().data.runs[ids.runId]).toEqual(resumed);
      expect(runRoute(store.getState().data, ids.runId)).toBe('runner');
      expect(leftOff(store.getState().data)).toEqual({ kind: 'runner', runId: ids.runId });
      // What this page did in Plan before is all still there (the routine, its breakdown), and the other run's mode.
      expect(Object.keys(store.getState().data.routines)).toHaveLength(3);
      expect(store.getState().data.runs[ids.tile].mode).toBe('plan');

      page.hide();
      await tick(30);
      const planned = await elsewhere('plan', '2026-11-01T12:05:00.000Z');
      page.show();
      await tick(100);
      expect(store.getState().data.runs[ids.runId]).toEqual(planned);
      // P-101 (ruling 4; was "in Plan"): Plan elsewhere pauses it, plainly — this page's runner goes home.
      expect(store.getState().data.runs[ids.runId]).toMatchObject({ status: 'paused' });
      expect('mode' in store.getState().data.runs[ids.runId]).toBe(false);
      expect(runRoute(store.getState().data, ids.runId)).toBe('home');
      expect(await onDisk()).toEqual(store.getState().data);
      const next = await reload();
      expect(next.getState().data).toEqual(store.getState().data);
    });

    it('export → import: the backup carries the mode; the same file is identical; imported into an empty browser it is the same data, in Plan, after a reload', async () => {
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const exported = store.getState().data;
      const { toBackup } = await import('@/domain/backup');
      let { previewImport, confirmImport } = await import('@/store/importBackup');
      const json = toBackup(exported);
      expect(JSON.parse(json).data.runs[ids.runId]).toMatchObject({ mode: 'plan', status: 'paused' });
      expect(JSON.parse(json).data.runs[ids.tile].mode).toBe('plan');
      expect(JSON.parse(json).data.version).toBe(2);
      expect(previewImport(json).plan).toMatchObject({ identical: true, routines: { unchanged: 3 }, runs: { unchanged: 2 } });

      // Another browser (nothing there).
      (await import('./persistence')).stopPersistence();
      env.ls.clear();
      env.state.dbPath = join(mkdtempSync(join(tmpdir(), 'wanderment-')), 'db.sqlite');
      page = fakePage();
      fakeLocks();
      store = await load();
      await tick(30);
      ({ previewImport, confirmImport } = await import('@/store/importBackup'));
      const preview = previewImport(json);
      expect(preview.incoming).toEqual(exported);
      expect(confirmImport(preview).ok).toBe(true);
      await tick(30);
      expect(await onDisk()).toEqual(exported);
      store = await reload();
      expect(store.getState().data).toEqual(exported);
      await isInPlan(store.getState().data, ids);
    });

    describe('a press while reconnecting, and Plan', () => {
      /** A running run on the first of three steps, saved; then the page is hidden and shown while another page holds the data. */
      async function away() {
        const locks = fakeLocks();
        const store = await load();
        const g = () => store.getState();
        const made = g().createRoutine('Morning');
        if (!made.ok || !made.routineId) throw new Error('New: was refused');
        for (const text of ['Stretch', 'Shower', 'Coffee']) g().editRoutine(made.routineId, { kind: 'addStep', text });
        const started = g().startRoutine(made.routineId);
        if (!started.ok || !started.runId) throw new Error('Start was refused');
        const runId = started.runId;
        await tick(30);
        page.hide();
        await tick(30);
        const release = locks.holdElsewhere();
        page.show();
        await tick(100);
        expect(store.getState().storage).toEqual(RECONNECTING);
        return { store, runId, routineId: made.routineId, release };
      }
      const elsewhere = async (runId: string, kind: 'plan' | 'next') => {
        const { runVerb } = await import('@/domain/run');
        const moved = runVerb(await onDisk(), { kind, runId }, { now: '2026-11-01T12:00:00.000Z', id: () => 'other-page-id' });
        const { nodeDb } = await import('./nodeDb');
        const { saveChanges } = await import('./repository');
        const db = nodeDb(env.state.dbPath);
        await saveChanges(db, { upsertRuns: [moved.data.runs[runId]] } as never);
        db.close();
        return moved.data.runs[runId];
      };

      it('Plan pressed (twice) is kept, with the quiet note, and applied exactly once when the data is back: paused, in Plan, saved', async () => {
        const { store, runId, release } = await away();
        const before = store.getState().data;
        expect(store.getState().planRun(runId)).toEqual({ ok: false, reason: 'reconnecting' });
        expect(store.getState().planRun(runId)).toEqual({ ok: false, reason: 'reconnecting' });
        expect(store.getState().data).toBe(before);
        expect(store.getState().toVerb).toMatchObject({ runId, verb: 'plan' });
        expect(store.getState().toast).toEqual({ message: 'Just a moment — reconnecting.', notice: true });
        release();
        await tick(30);
        expect(store.getState().storage).toEqual(READY);
        // P-101 (ruling 4; was "paused, in Plan"): paused, and no mode is written.
        expect(store.getState().data.runs[runId]).toMatchObject({ status: 'paused' });
        expect('mode' in store.getState().data.runs[runId]).toBe(false);
        expect(store.getState().toVerb).toBeUndefined();
        expect(await onDisk()).toEqual(store.getState().data);
      });

      it('Next kept here, and the other page put the run in Plan meanwhile: the press is dropped — a queued Next never moves a run that went into Plan', async () => {
        const { store, runId, release } = await away();
        store.getState().nextStep(runId);
        expect(store.getState().toVerb).toMatchObject({ verb: 'next' });
        const planned = await elsewhere(runId, 'plan');
        release();
        await tick(30);
        expect(store.getState().storage).toEqual(READY);
        expect(store.getState().data.runs[runId]).toEqual(planned);
        expect((store.getState().data.runs[runId] as unknown as Body).frames).toEqual((planned as unknown as Body).frames);
        expect(store.getState().toVerb).toBeUndefined();
        expect(store.getState().undo).toBeUndefined();
        const { runnerView } = await import('@/domain/runView');
        // P-101 (ruling 4; was `planning: true`): it is paused there — the runner goes home.
        expect(runnerView(store.getState().data, runId)).toMatchObject({ planning: false, status: 'paused', step: { words: 'Stretch' } });
      });

      it('Plan kept here, and the other page moved the run on meanwhile: the press is dropped — the run is where that page left it, running', async () => {
        const { store, runId, release } = await away();
        store.getState().planRun(runId);
        const moved = await elsewhere(runId, 'next');
        release();
        await tick(30);
        expect(store.getState().data.runs[runId]).toEqual(moved);
        expect(store.getState().data.runs[runId].status).toBe('running');
        expect(store.getState().toVerb).toBeUndefined();
      });

      it('a Plan edit while reconnecting is refused (never kept): nothing changes, and it works once the data is back', async () => {
        const { store, runId, routineId, release } = await away();
        const before = store.getState().data;
        expect(store.getState().editRoutine(routineId, { kind: 'addStep', text: 'Walk' })).toEqual({ ok: false, reason: 'reconnecting' });
        expect(store.getState().data).toBe(before);
        expect(store.getState().toVerb).toBeUndefined();
        release();
        await tick(30);
        expect(store.getState().editRoutine(routineId, { kind: 'addStep', text: 'Walk' }).ok).toBe(true);
        expect((store.getState().data.routines[routineId].items as unknown[]).length).toBe(4);
        expect(store.getState().data.runs[runId].status).toBe('running');
      });
    });
  });

  // ───────── P-96: values ─────────
  describe('P-96: values survive reload, journal replay, the fallback, hand-over, export and import; so do the names steps give', () => {
    type Ids = { runId: string; routineId: string; seqId: string; sel: string; pencil: string };
    type Entry = { name: string; items: string[]; level: number; seq: string; item: string; words?: string; at: string; changedAt?: string };
    const valuesOf = (data: { runs: Record<string, Record<string, unknown>> }, runId: string) => data.runs[runId].values as Entry[];
    async function reload() {
      (await import('./persistence')).stopPersistence();
      page = fakePage();
      fakeLocks();
      const store = await load();
      await tick(30);
      return store;
    }
    /**
     * Through the store's actions, as a person would: "Drawing practice" with a step that gives {subject},
     * one broken down whose smaller step gives {tool}, a step reading both and one that asks for {mood},
     * Repeat from there × 3; Start; typed at the giving step; Next; Step in; typed there; Next; the value
     * sheet changes {subject}; Pause.
     */
    function build(store: Store): Ids {
      const g = () => store.getState();
      const made = g().createRoutine('Drawing practice');
      if (!made.ok || !made.routineId) throw new Error('New: was refused');
      const routineId = made.routineId;
      const items = () => store.getState().data.routines[routineId].items as { id: string; text?: string; ref?: string }[];
      const all = [g().editRoutine(routineId, { kind: 'addStep', text: 'Select the subject matter' })];
      const sel = items()[0].id;
      all.push(
        g().editRoutine(routineId, { kind: 'gives', item: sel, name: 'subject' }),
        g().editRoutine(routineId, { kind: 'addStep', text: 'Get ready' }),
        g().editRoutine(routineId, { kind: 'breakDown', item: items()[1].id, steps: ['Pick a pencil'] }),
      );
      const seqId = items()[1].ref!;
      const pencil = (store.getState().data.routines[seqId].items as { id: string }[])[0].id;
      all.push(
        g().editRoutine(seqId, { kind: 'gives', item: pencil, name: 'tool' }),
        g().editRoutine(routineId, { kind: 'addStep', text: 'Find photos of {subject} to draw with {tool}' }),
        g().editRoutine(routineId, { kind: 'addStep', text: 'Note how {mood} it felt' }),
        g().editRoutine(routineId, { kind: 'divider', from: 2 }),
        g().editRoutine(routineId, { kind: 'repeat', times: 3 }),
      );
      const started = g().startRoutine(routineId);
      if (!started.ok || !started.runId) throw new Error('Start was refused');
      const runId = started.runId;
      all.push(g().typeValue(runId, sel, 'subject', 'figures in motion'), g().nextStep(runId), g().stepIn(runId), g().typeValue(runId, pencil, 'tool', '2B'), g().nextStep(runId), g().changeValue(runId, 'subject', 'hands 🖐 “quick”'), g().pauseRun(runId));
      expect(all.map((r) => r.ok)).toEqual(all.map(() => true));
      return { runId, routineId, seqId, sel, pencil };
    }
    /** What the contract names: the giving names on the steps, two values at the routine's level with where they came from, one changed; the reader shows them; the asking step asks. */
    async function isAsBuilt(data: Store extends { getState(): { data: infer D } } ? D : never, ids: Ids) {
      const { runnerView, valueDetail } = await import('@/domain/runView');
      expect((data.routines[ids.routineId].items as { out?: string }[])[0].out).toBe('subject');
      expect((data.routines[ids.seqId].items as { out?: string }[])[0].out).toBe('tool');
      const values = valuesOf(data as never, ids.runId);
      expect(values.map((e) => [e.name, e.items, e.level, e.seq, e.item, e.words])).toEqual([
        ['subject', ['hands 🖐 “quick”'], 0, ids.routineId, ids.sel, 'Select the subject matter'],
        ['tool', ['2B'], 0, ids.routineId, ids.pencil, 'Pick a pencil'],
      ]);
      expect(typeof values[0].changedAt).toBe('string');
      expect('changedAt' in values[1]).toBe(false);
      expect(runnerView(data, ids.runId)).toMatchObject({
        status: 'paused',
        step: { parts: [{ kind: 'text', text: 'Find photos of ' }, { kind: 'value', name: 'subject', text: 'hands 🖐 “quick”' }, { kind: 'text', text: ' to draw with ' }, { kind: 'value', name: 'tool', text: '2B' }] },
      });
      expect(valueDetail(data, ids.runId, 'tool')).toMatchObject({ from: 'Pick a pencil', text: '2B' });
    }

    it('P-101 amendment (rulings 9–10): a value given late (at a step after the one that gives it) and a Start over are saved as they are made, and the same after a reload; the Start over’s Undo brings place and values back, on disk too', async () => {
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const { runnerView, valueDetail } = await import('@/domain/runView');
      const g = () => store.getState();
      // Back to where {subject} was given, cleared there (the sheet), and on: the reader's place, {subject} not given yet.
      expect(g().resumeRun(ids.runId).ok).toBe(true);
      expect(g().changeValue(ids.runId, 'subject', '').ok).toBe(true);
      // (The reader asks for it where it stands; the step after it, which does not read it, offers it.)
      expect(g().nextStep(ids.runId).ok).toBe(true);
      // (P-110, rewritten: was `missing` toEqual(['subject']) — no "not given yet" placeholder; it is still given late here.)
      expect(runnerView(g().data, ids.runId)!.values.map((v) => v.name)).not.toContain('subject');
      const here = runnerView(g().data, ids.runId)!.step.itemId!;
      expect(g().typeValue(ids.runId, here, 'subject', 'given late').ok).toBe(true);
      await tick(30);
      expect(await onDisk()).toEqual(g().data);
      store = await reload();
      expect(valueDetail(store.getState().data, ids.runId, 'subject')).toMatchObject({ text: 'given late', late: true });
      const before = store.getState().data;
      expect(store.getState().restartRun(ids.runId, 0).ok).toBe(true);
      await tick(30);
      const restarted = await onDisk();
      expect(restarted.runs[ids.runId]).toMatchObject({ frames: [{ seq: ids.routineId, at: ids.sel, round: 1 }] });
      expect('values' in restarted.runs[ids.runId]).toBe(false);
      store = await reload();
      expect(store.getState().data).toEqual(restarted);
      expect(store.getState().restartRun(ids.runId, 0).ok).toBe(true);
      expect(store.getState().undoLast()).toBe(true);
      await tick(30);
      expect(await onDisk()).toEqual(restarted);
      expect(Object.keys(before.runs)).toEqual(Object.keys(restarted.runs));
    });

    it('reload: saved to SQLite as it is made, the same after a reload; a value typed writes the run’s row and nothing else; the next round asks again, and that too is saved', async () => {
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const shown = store.getState().data;
      await isAsBuilt(shown, ids);
      expect(await onDisk()).toEqual(shown);
      store = await reload();
      expect(store.getState().data).toEqual(shown);
      await isAsBuilt(store.getState().data, ids);

      env.p29.writes = [];
      expect(store.getState().resumeRun(ids.runId).ok).toBe(true);
      expect(store.getState().nextStep(ids.runId).ok).toBe(true); // onto the step that asks
      expect(store.getState().typeValue(ids.runId, (shown.routines[ids.routineId].items as { id: string }[])[3].id, 'mood', 'calm').ok).toBe(true);
      await tick(30);
      expect(env.p29.writes.filter((q) => /INTO routines|FROM routines/.test(q))).toEqual([]);
      expect(valuesOf(await onDisk(), ids.runId).map((e) => e.name)).toEqual(['subject', 'tool', 'mood']);
      // Next: round 2 — what the repeating part gave ({mood}, asked there) is cleared; what was given before it stays.
      expect(store.getState().nextStep(ids.runId).ok).toBe(true);
      await tick(30);
      store = await reload();
      expect(valuesOf(store.getState().data, ids.runId).map((e) => e.name)).toEqual(['subject', 'tool']);
      expect(await onDisk()).toEqual(store.getState().data);
    });

    it('journal replay: made while no write commits (the tab dies), all of it is there after a reload; so is a value being typed when it dies, as typed', async () => {
      fakeLocks();
      let store = await load();
      env.state.hangWrites = true;
      const ids = build(store);
      await tick(30);
      expect(await onDisk()).toMatchObject({ routines: {}, runs: {} });
      const shown = store.getState().data;
      env.state.hangWrites = false;
      store = await reload();
      expect(store.getState().data).toEqual(shown);
      await isAsBuilt(store.getState().data, ids);
      expect(env.ls.has('wanderment:journal')).toBe(false);

      env.state.hangWrites = true;
      store.getState().resumeRun(ids.runId);
      store.getState().jumpTo(ids.runId, { path: [ids.sel] });
      for (const typed of ['c', 'ca', 'cats, mid-wo']) expect(store.getState().typeValue(ids.runId, ids.sel, 'subject', typed).ok).toBe(true);
      await tick(30);
      env.state.hangWrites = false;
      store = await reload();
      expect(valuesOf(store.getState().data, ids.runId)[0].items).toEqual(['cats, mid-wo']);
      expect(valuesOf(await onDisk(), ids.runId)[0].items).toEqual(['cats, mid-wo']);
    });

    it('the localStorage fallback keeps all of it, and moves it into SQLite once it can', async () => {
      env.state.openError = new Error('no OPFS');
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const shown = store.getState().data;
      expect(JSON.parse(env.ls.get('wanderment')!).state.data.runs[ids.runId].values).toEqual(JSON.parse(JSON.stringify(shown.runs[ids.runId].values)));
      store = await reload();
      expect(store.getState().storage).toEqual({ state: 'ready', kind: 'local' });
      expect(store.getState().data).toEqual(shown);
      env.state.openError = undefined;
      store = await reload();
      expect(store.getState().storage).toEqual(READY);
      expect(store.getState().data).toEqual(shown);
      expect(await onDisk()).toEqual(shown);
      await isAsBuilt((await reload()).getState().data, ids);
    });

    it('hand-over with a take-back: a value typed here, still only in the journal when the page is hidden, stays on top of another page’s change to the routine', async () => {
      fakeLocks();
      const store = await load();
      const ids = build(store);
      await tick(30);
      writeGate = deferred();
      expect(store.getState().changeValue(ids.runId, 'tool', 'charcoal').ok).toBe(true);
      await tick(0);
      expect(store.getState().changeValue(ids.runId, 'subject', 'feet').ok).toBe(true);
      await tick(0);
      page.hide();
      writeGate.open();
      writeGate = undefined;
      await tick(30);
      expect(JSON.parse(env.ls.get('wanderment:journal')!).changes.upsertRuns.map((r: { id: string }) => r.id)).toEqual([ids.runId]);
      const mine = store.getState().data;

      // The other page rewords the step that gives {subject}.
      const { editRoutine } = await import('@/domain/run');
      const other = editRoutine(await onDisk(), ids.routineId, { kind: 'reword', item: ids.sel, text: 'Choose a subject' }, { now: '2026-11-01T12:00:00.000Z', id: () => 'other-page-id' });
      expect(other.ok).toBe(true);
      const { nodeDb } = await import('./nodeDb');
      const { saveChanges } = await import('./repository');
      const db = nodeDb(env.state.dbPath);
      await saveChanges(db, { upsertRoutines: [other.data.routines[ids.routineId]] } as never);
      db.close();

      page.show();
      await tick(100);
      expect(store.getState().storage).toEqual(READY);
      expect(store.getState().data.runs[ids.runId]).toEqual(mine.runs[ids.runId]);
      expect(valuesOf(store.getState().data, ids.runId).map((e) => e.items[0])).toEqual(['feet', 'charcoal']);
      expect(store.getState().data.routines[ids.routineId]).toEqual(other.data.routines[ids.routineId]);
      const { valueDetail } = await import('@/domain/runView');
      expect(valueDetail(store.getState().data, ids.runId, 'subject')).toMatchObject({ text: 'feet', from: 'Choose a subject' });
      expect(await onDisk()).toEqual(store.getState().data);
      expect((await reload()).getState().data).toEqual(store.getState().data);
    });

    it('undo of a value changed from the sheet is taken back on screen and on disk', async () => {
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const before = store.getState().data;
      expect(store.getState().changeValue(ids.runId, 'subject', '').ok).toBe(true);
      await tick(30);
      expect(valuesOf(await onDisk(), ids.runId).map((e) => e.name)).toEqual(['tool']);
      expect(store.getState().undoLast()).toBe(true);
      await tick(30);
      expect(await onDisk()).toEqual(before);
      store = await reload();
      await isAsBuilt(store.getState().data, ids);
    });

    it('export → import: values and given names are in the backup; the same file is identical; one whose value differs replaces it and survives a reload', async () => {
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const exported = store.getState().data;
      const { toBackup } = await import('@/domain/backup');
      const { previewImport, confirmImport } = await import('@/store/importBackup');
      const json = toBackup(exported);
      const file = JSON.parse(json);
      expect(file.data.runs[ids.runId].values).toEqual(JSON.parse(JSON.stringify(exported.runs[ids.runId].values)));
      expect(file.data.routines[ids.routineId].items[0].out).toBe('subject');
      const same = previewImport(json);
      expect(same.plan).toMatchObject({ identical: true });
      expect(same.incoming).toEqual(exported);
      await isAsBuilt(same.incoming, ids);

      file.data.runs[ids.runId].values[1].items = ['ink'];
      const differs = previewImport(JSON.stringify(file));
      expect(differs.plan).toMatchObject({ identical: false, runs: { changed: 1 }, routines: { unchanged: 2 } });
      expect(confirmImport(differs).ok).toBe(true);
      await tick(30);
      store = await reload();
      expect(store.getState().data).toEqual(file.data);
      const { valueDetail } = await import('@/domain/runView');
      expect(valueDetail(store.getState().data, ids.runId, 'tool')).toMatchObject({ text: 'ink' });
    });
  });

  describe('P-97: tags survive reload, journal replay, the fallback, hand-over, export and import — and so does a field this version does not know', () => {
    type Ids = { tagged: string; other: string };
    const tagsIn = (data: { routines: Record<string, Record<string, unknown>> }, id: string) => data.routines[id].tags;
    async function reload() {
      (await import('./persistence')).stopPersistence();
      page = fakePage();
      fakeLocks();
      const store = await load();
      await tick(30);
      return store;
    }
    /**
     * Through the store's actions, as a person would: two routines made with New, a step each, then the Tags
     * sheet's Keep on one ("#Drawing ", "daily", "drawing" typed: two tags kept), and on the other (one tag,
     * then none: the field goes).
     */
    function build(store: Store): Ids {
      const g = () => store.getState();
      const a = g().createRoutine('Drawing practice');
      const b = g().createRoutine('Make a game');
      if (!a.ok || !a.routineId || !b.ok || !b.routineId) throw new Error('New: was refused');
      const all = [
        g().editRoutine(a.routineId, { kind: 'addStep', text: 'Warm up' }),
        g().editRoutine(b.routineId, { kind: 'addStep', text: 'Sketch the HUD' }),
        g().editRoutine(a.routineId, { kind: 'tags', tags: ['#Drawing ', 'daily', 'drawing'] }),
        g().editRoutine(b.routineId, { kind: 'tags', tags: ['game'] }),
        g().editRoutine(b.routineId, { kind: 'tags', tags: [] }),
      ];
      expect(all.map((r) => r.ok)).toEqual(all.map(() => true));
      return { tagged: a.routineId, other: b.routineId };
    }
    const isAsBuilt = (data: { routines: Record<string, Record<string, unknown>> }, ids: Ids) => {
      expect(tagsIn(data, ids.tagged)).toEqual(['Drawing', 'daily']);
      expect('tags' in data.routines[ids.other]).toBe(false);
    };

    it('reload: saved to SQLite as kept (tidied, once without case), the same after a reload; a routine with none has no field', async () => {
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const shown = store.getState().data;
      isAsBuilt(shown, ids);
      expect(await onDisk()).toEqual(shown);
      store = await reload();
      expect(store.getState().data).toEqual(shown);
      const { myRoutines } = await import('@/domain/routines');
      expect(myRoutines(store.getState().data).map((r) => [r.name, r.tags])).toEqual([
        ['Drawing practice', ['Drawing', 'daily']],
        ['Make a game', []],
      ]);
    });

    it('journal replay: kept while no write commits (the tab dies), the tags are there after a reload', async () => {
      fakeLocks();
      let store = await load();
      env.state.hangWrites = true;
      const ids = build(store);
      await tick(30);
      expect(await onDisk()).toMatchObject({ routines: {} });
      const shown = store.getState().data;
      env.state.hangWrites = false;
      store = await reload();
      expect(store.getState().data).toEqual(shown);
      isAsBuilt(store.getState().data, ids);
      expect(env.ls.has('wanderment:journal')).toBe(false);
      expect(await onDisk()).toEqual(shown);
    });

    it('the localStorage fallback keeps them, and moves them into SQLite once it can', async () => {
      env.state.openError = new Error('no OPFS');
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const shown = store.getState().data;
      expect(JSON.parse(env.ls.get('wanderment')!).state.data.routines[ids.tagged].tags).toEqual(['Drawing', 'daily']);
      store = await reload();
      expect(store.getState().storage).toEqual({ state: 'ready', kind: 'local' });
      expect(store.getState().data).toEqual(shown);
      env.state.openError = undefined;
      store = await reload();
      expect(store.getState().storage).toEqual(READY);
      expect(store.getState().data).toEqual(shown);
      expect(await onDisk()).toEqual(shown);
      isAsBuilt(store.getState().data, ids);
    });

    it('hand-over with a take-back: tags kept here, still only in the journal when the page is hidden, stay on top of another page’s change to another routine; the other page’s tags are taken', async () => {
      fakeLocks();
      const store = await load();
      const ids = build(store);
      await tick(30);
      writeGate = deferred();
      expect(store.getState().editRoutine(ids.tagged, { kind: 'tags', tags: ['Drawing', 'daily', 'hand'] }).ok).toBe(true);
      await tick(0);
      expect(store.getState().editRoutine(ids.tagged, { kind: 'tags', tags: ['Drawing', 'daily', 'hands'] }).ok).toBe(true);
      await tick(0);
      page.hide();
      writeGate.open();
      writeGate = undefined;
      await tick(30);
      expect(JSON.parse(env.ls.get('wanderment:journal')!).changes.upsertRoutines.map((r: { id: string }) => r.id)).toEqual([ids.tagged]);
      const mine = store.getState().data.routines[ids.tagged];

      // The other page tags the other routine.
      const { editRoutine } = await import('@/domain/run');
      const other = editRoutine(await onDisk(), ids.other, { kind: 'tags', tags: ['game', 'side project'] }, { now: '2026-11-27T12:00:00.000Z', id: () => 'other-page-id' });
      expect(other.ok).toBe(true);
      const { nodeDb } = await import('./nodeDb');
      const { saveChanges } = await import('./repository');
      const db = nodeDb(env.state.dbPath);
      await saveChanges(db, { upsertRoutines: [other.data.routines[ids.other]] } as never);
      db.close();

      page.show();
      await tick(100);
      expect(store.getState().storage).toEqual(READY);
      expect(store.getState().data.routines[ids.tagged]).toEqual(mine);
      expect(tagsIn(store.getState().data, ids.tagged)).toEqual(['Drawing', 'daily', 'hands']);
      expect(tagsIn(store.getState().data, ids.other)).toEqual(['game', 'side project']);
      expect(await onDisk()).toEqual(store.getState().data);
      expect((await reload()).getState().data).toEqual(store.getState().data);
    });

    it('undo of a tags change is taken back on screen and on disk', async () => {
      fakeLocks();
      const store = await load();
      const ids = build(store);
      await tick(30);
      const before = store.getState().data;
      expect(store.getState().editRoutine(ids.tagged, { kind: 'tags', tags: [] }).ok).toBe(true);
      await tick(30);
      expect('tags' in (await onDisk()).routines[ids.tagged]).toBe(false);
      expect(store.getState().undoLast()).toBe(true);
      await tick(30);
      expect(await onDisk()).toEqual(before);
    });

    it('export → import: tags are in the backup; the same file is identical; one with other tags and a field this version does not know replaces it, and both survive a reload, the journal, the fallback and another export', async () => {
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const exported = store.getState().data;
      const { toBackup } = await import('@/domain/backup');
      const { previewImport, confirmImport } = await import('@/store/importBackup');
      const json = toBackup(exported);
      const file = JSON.parse(json);
      expect(file.data.routines[ids.tagged].tags).toEqual(['Drawing', 'daily']);
      const same = previewImport(json);
      expect(same.plan).toMatchObject({ identical: true });
      expect(same.incoming).toEqual(exported);

      file.data.routines[ids.other].tags = ['game'];
      file.data.routines[ids.other].later = { kept: ['as', 'is'] };
      const differs = previewImport(JSON.stringify(file));
      expect(differs.plan).toMatchObject({ identical: false, routines: { changed: 1, unchanged: 1 } });
      expect(confirmImport(differs).ok).toBe(true);
      await tick(30);
      store = await reload();
      expect(store.getState().data).toEqual(file.data);
      expect(store.getState().data.routines[ids.other]).toMatchObject({ tags: ['game'], later: { kept: ['as', 'is'] } });
      // An edit to that routine (its tags) keeps the unknown field; through the journal, the fallback and out again.
      env.state.hangWrites = true;
      expect(store.getState().editRoutine(ids.other, { kind: 'tags', tags: ['game', 'daily'] }).ok).toBe(true);
      await tick(30);
      env.state.hangWrites = false;
      store = await reload();
      expect(store.getState().data.routines[ids.other]).toMatchObject({ tags: ['game', 'daily'], later: { kept: ['as', 'is'] } });
      const held = store.getState().data;
      // Where SQLite can't run (a fresh browser): the same file imported there is kept in the fallback, as it is.
      (await import('./persistence')).stopPersistence();
      env.ls.clear();
      env.state.dbPath = join(mkdtempSync(join(tmpdir(), 'wanderment-')), 'db.sqlite');
      env.state.openError = new Error('no OPFS');
      store = await reload();
      expect(store.getState().storage).toEqual({ state: 'ready', kind: 'local' });
      const fresh = await import('@/store/importBackup');
      expect(fresh.confirmImport(fresh.previewImport(toBackup(held))).ok).toBe(true);
      await tick(30);
      expect(JSON.parse(env.ls.get('wanderment')!).state.data.routines[ids.other]).toMatchObject({ tags: ['game', 'daily'], later: { kept: ['as', 'is'] } });
      store = await reload();
      expect(store.getState().data).toEqual(held);
      expect(JSON.parse(toBackup(store.getState().data)).data.routines[ids.other]).toMatchObject({ tags: ['game', 'daily'], later: { kept: ['as', 'is'] } });
    });
  });

  // ───────── P-98: calls ─────────
  describe('P-98: calls, their inputs, what they hand back and Copy survive reload, journal replay, the fallback, hand-over, export and import', () => {
    type Ids = { research: string; improve: string; copy: string; call: string; runId: string };
    async function reload() {
      (await import('./persistence')).stopPersistence();
      page = fakePage();
      fakeLocks();
      const store = await load();
      await tick(30);
      return store;
    }
    /**
     * Through the store's actions, as a person would: Research (reads {concerns}, gives {findings}); Improve —
     * "List out my doubts" gives {concerns}, Research added as a step after it, its input bound to typed words
     * then back to by name; Improve copied; a run that gives {concerns}, steps into Research, gives {findings}
     * and finishes it (handed back), resting on "Decide using {findings}".
     */
    function build(store: Store): Ids {
      const g = () => store.getState();
      const r = g().createRoutine('Research');
      const i = g().createRoutine('Improve my workout routine');
      if (!r.ok || !r.routineId || !i.ok || !i.routineId) throw new Error('New: was refused');
      const research = r.routineId;
      const improve = i.routineId;
      const items = (id: string) => g().data.routines[id].items as { id: string; text?: string; ref?: string }[];
      const all = [
        g().editRoutine(research, { kind: 'addStep', text: 'Look into {concerns}' }),
        g().editRoutine(research, { kind: 'addStep', text: 'Note what I found' }),
        g().editRoutine(improve, { kind: 'addStep', text: 'List out my doubts' }),
        g().editRoutine(improve, { kind: 'addStep', text: 'Decide using {findings}' }),
      ];
      all.push(g().editRoutine(research, { kind: 'gives', item: items(research)[1].id, name: 'findings' }));
      all.push(g().editRoutine(improve, { kind: 'gives', item: items(improve)[0].id, name: 'concerns' }));
      all.push(g().editRoutine(improve, { kind: 'addCall', routine: research, after: items(improve)[0].id }));
      const call = items(improve)[1].id;
      all.push(g().editRoutine(improve, { kind: 'bind', item: call, input: 'concerns', to: { typed: 'my knees' } }));
      all.push(g().editRoutine(improve, { kind: 'bind', item: call, input: 'concerns', to: { name: 'concerns' } }));
      all.push(g().editRoutine(improve, { kind: 'bind', item: call, input: 'concerns', to: { ask: true } }));
      const copied = g().editRoutine(improve, { kind: 'copy', words: 'Improve my workout routine (copy)' });
      all.push(copied);
      expect(all.map((x) => x.ok)).toEqual(all.map(() => true));
      const started = g().startRoutine(improve);
      if (!started.ok || !started.runId) throw new Error('Start: was refused');
      const runId = started.runId;
      g().typeValue(runId, items(improve)[0].id, 'concerns', 'form, time');
      g().nextStep(runId);
      g().stepIn(runId);
      g().typeValue(runId, items(research)[0].id, 'concerns', 'just form');
      g().nextStep(runId);
      g().typeValue(runId, items(research)[1].id, 'findings', 'shorter sets');
      g().nextStep(runId);
      if (!copied.ok || !copied.routineId) throw new Error('Copy: was refused');
      return { research, improve, copy: copied.routineId, call, runId };
    }
    const isAsBuilt = (data: import('@/domain/types').Data, ids: Ids) => {
      const imp = data.routines[ids.improve].items as Record<string, unknown>[];
      expect(imp[1]).toEqual({ id: ids.call, ref: ids.research, words: 'Research', with: [{ input: 'concerns', ask: true }] });
      const cp = data.routines[ids.copy];
      expect(cp).toMatchObject({ words: 'Improve my workout routine (copy)', named: true });
      expect((cp.items as Record<string, unknown>[])[1]).toMatchObject({ ref: ids.research, with: [{ input: 'concerns', ask: true }] });
      const values = (data.runs[ids.runId].values as Record<string, unknown>[]).map((e) => [e.name, e.items, e.level, e.item]);
      expect(values).toEqual([
        ['concerns', ['form, time'], 0, imp[0].id],
        ['findings', ['shorter sets'], 0, ids.call],
      ]);
      expect((data.runs[ids.runId].frames as { at: string }[]).map((f) => f.at)).toEqual([imp[2].id]);
    };

    it('reload: saved to SQLite as made, the same after a reload; the run still reads what Research handed back', async () => {
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const shown = store.getState().data;
      isAsBuilt(shown, ids);
      expect(await onDisk()).toEqual(shown);
      store = await reload();
      expect(store.getState().data).toEqual(shown);
      const { runnerView } = await import('@/domain/runView');
      expect(runnerView(store.getState().data, ids.runId)!.step.parts).toContainEqual({ kind: 'value', name: 'findings', text: 'shorter sets' });
    });

    it('journal replay: kept while no write commits (the tab dies), all of it is there after a reload', async () => {
      fakeLocks();
      let store = await load();
      env.state.hangWrites = true;
      const ids = build(store);
      await tick(30);
      expect(await onDisk()).toMatchObject({ routines: {} });
      const shown = store.getState().data;
      env.state.hangWrites = false;
      store = await reload();
      expect(store.getState().data).toEqual(shown);
      isAsBuilt(store.getState().data, ids);
      expect(env.ls.has('wanderment:journal')).toBe(false);
      expect(await onDisk()).toEqual(shown);
    });

    it('the localStorage fallback keeps them, and moves them into SQLite once it can', async () => {
      env.state.openError = new Error('no OPFS');
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const shown = store.getState().data;
      isAsBuilt(JSON.parse(env.ls.get('wanderment')!).state.data, ids);
      store = await reload();
      expect(store.getState().storage).toEqual({ state: 'ready', kind: 'local' });
      expect(store.getState().data).toEqual(shown);
      env.state.openError = undefined;
      store = await reload();
      expect(store.getState().storage).toEqual(READY);
      expect(store.getState().data).toEqual(shown);
      expect(await onDisk()).toEqual(shown);
    });

    it('hand-over with a take-back: a binding kept here, still only in the journal when hidden, stays on top of another page’s Copy; the other page’s copy is taken', async () => {
      fakeLocks();
      const store = await load();
      const ids = build(store);
      await tick(30);
      writeGate = deferred();
      expect(store.getState().editRoutine(ids.improve, { kind: 'bind', item: ids.call, input: 'concerns', to: { typed: 'knees' } }).ok).toBe(true);
      await tick(0);
      expect(store.getState().editRoutine(ids.improve, { kind: 'bind', item: ids.call, input: 'concerns', to: { typed: 'hips' } }).ok).toBe(true);
      await tick(0);
      page.hide();
      writeGate.open();
      writeGate = undefined;
      await tick(30);
      expect(JSON.parse(env.ls.get('wanderment:journal')!).changes.upsertRoutines.map((r: { id: string }) => r.id)).toEqual([ids.improve]);
      const mine = store.getState().data.routines[ids.improve];

      const { editRoutine } = await import('@/domain/run');
      const other = editRoutine(await onDisk(), ids.research, { kind: 'copy', words: 'Research again' }, { now: '2026-11-27T12:00:00.000Z', id: () => 'other-page-copy' });
      expect(other.ok).toBe(true);
      const { nodeDb } = await import('./nodeDb');
      const { saveChanges } = await import('./repository');
      const db = nodeDb(env.state.dbPath);
      await saveChanges(db, { upsertRoutines: [other.data.routines['other-page-copy']] } as never);
      db.close();

      page.show();
      await tick(100);
      expect(store.getState().storage).toEqual(READY);
      expect(store.getState().data.routines[ids.improve]).toEqual(mine);
      expect((mine.items as Record<string, unknown>[])[1].with).toEqual([{ input: 'concerns', typed: 'hips' }]);
      expect(store.getState().data.routines['other-page-copy']).toMatchObject({ words: 'Research again', named: true });
      expect(await onDisk()).toEqual(store.getState().data);
      expect((await reload()).getState().data).toEqual(store.getState().data);
    });

    it('undo of Copy, of adding a call and of Step out with a value it asked for: taken back on screen and on disk', async () => {
      fakeLocks();
      const store = await load();
      const ids = build(store);
      await tick(30);
      const before = store.getState().data;
      expect(store.getState().editRoutine(ids.research, { kind: 'copy', words: 'Research 2' }).ok).toBe(true);
      await tick(30);
      expect(Object.keys(await onDisk().then((d) => d.routines))).toHaveLength(Object.keys(before.routines).length + 1);
      expect(store.getState().undoLast()).toBe(true);
      await tick(30);
      expect(await onDisk()).toEqual(before);
      expect(store.getState().editRoutine(ids.copy, { kind: 'addCall', routine: ids.research }).ok).toBe(true);
      await tick(30);
      expect(store.getState().undoLast()).toBe(true);
      await tick(30);
      expect(await onDisk()).toEqual(before);
    });

    it('export → import: calls, bindings and the run’s handed-back value are in the backup; the same file is identical; one with a field this version does not know on a call and on a level replaces it, kept through a reload, the journal and another export', async () => {
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const exported = store.getState().data;
      const { toBackup } = await import('@/domain/backup');
      const { previewImport, confirmImport } = await import('@/store/importBackup');
      const json = toBackup(exported);
      const file = JSON.parse(json);
      isAsBuilt(file.data, ids);
      expect(previewImport(json).plan).toMatchObject({ identical: true });
      file.data.routines[ids.improve].items[1].later = { kept: true };
      file.data.runs[ids.runId].frames[0].later = { i: 2 };
      expect(confirmImport(previewImport(JSON.stringify(file))).ok).toBe(true);
      await tick(30);
      store = await reload();
      expect(store.getState().data).toEqual(file.data);
      // A move and an edit keep both unknown fields; through the journal and out again.
      env.state.hangWrites = true;
      expect(store.getState().backTo(ids.runId).ok).toBe(true);
      expect(store.getState().editRoutine(ids.improve, { kind: 'bind', item: ids.call, input: 'concerns', to: { typed: 'knees' } }).ok).toBe(true);
      await tick(30);
      env.state.hangWrites = false;
      store = await reload();
      const held = store.getState().data;
      expect((held.routines[ids.improve].items as Record<string, unknown>[])[1]).toMatchObject({ later: { kept: true }, with: [{ input: 'concerns', typed: 'knees' }] });
      expect((held.runs[ids.runId].frames as Record<string, unknown>[])[0].later).toEqual({ i: 2 });
      expect(JSON.parse(toBackup(held)).data).toEqual(held);
    });
  });

  // ───────── P-104 / P-105 / P-106: the library ─────────
  describe('P-104 / P-105 / P-106: routines copied from the library — a method with what it calls, a method copied and added as a step, a template copied twice — survive reload, journal replay, the fallback, undo and export → import; nothing of the library is stored', () => {
    type Ids = { recall: string; plan: string; guitar: string; spanish: string };
    async function reload() {
      (await import('./persistence')).stopPersistence();
      page = fakePage();
      fakeLocks();
      const store = await load();
      await tick(30);
      return store;
    }
    /** Through the store, as a person would: Copy "Recall before you look"; a routine of their own with "Set a cue to start" copied and added; "Learn ▢" copied twice. */
    function build(store: Store): Ids {
      const g = () => store.getState();
      const recall = g().copyFromLibrary('lib-recall');
      const own = g().createRoutine('Study for the exam');
      if (!recall.ok || !recall.routineId || !own.ok || !own.routineId) throw new Error('refused');
      expect(g().editRoutine(own.routineId, { kind: 'addStep', text: 'Read chapter one' }).ok).toBe(true);
      expect(g().copyAndAdd('lib-cue', own.routineId).ok).toBe(true);
      const guitar = g().copyFromLibrary('lib-learn', 'Learn guitar');
      const spanish = g().copyFromLibrary('lib-learn', 'Learn Spanish');
      if (!guitar.ok || !guitar.routineId || !spanish.ok || !spanish.routineId) throw new Error('refused');
      return { recall: recall.routineId, plan: own.routineId, guitar: guitar.routineId, spanish: spanish.routineId };
    }
    const names = (data: import('@/domain/types').Data) => Object.values(data.routines).filter((r) => r.named).map((r) => r.words).sort();
    const isAsBuilt = (data: import('@/domain/types').Data, ids: Ids) => {
      expect(names(data)).toEqual(['Check and mend', 'Keep the lesson', 'Learn guitar', 'Learn Spanish', 'Practise at the edge', 'Recall before you look', 'Review after doing', 'Say what done is', 'Set a cue to start', 'Study for the exam'].sort());
      const items = data.routines[ids.plan].items as Record<string, unknown>[];
      expect(items[1]).toMatchObject({ words: 'Set a cue to start' });
      expect(data.routines[items[1].ref as string]).toMatchObject({ words: 'Set a cue to start', named: true });
      // Nothing of the library is stored: no library id anywhere.
      expect(JSON.stringify(data)).not.toMatch(/lib-/);
    };

    it('reload: saved to SQLite as copied, the same after a reload', async () => {
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const shown = store.getState().data;
      isAsBuilt(shown, ids);
      expect(await onDisk()).toEqual(shown);
      store = await reload();
      expect(store.getState().data).toEqual(shown);
    });

    it('journal replay: kept while no write commits (the tab dies), all of it is there after a reload', async () => {
      fakeLocks();
      let store = await load();
      env.state.hangWrites = true;
      const ids = build(store);
      await tick(30);
      expect(await onDisk()).toMatchObject({ routines: {} });
      const shown = store.getState().data;
      env.state.hangWrites = false;
      store = await reload();
      expect(store.getState().data).toEqual(shown);
      isAsBuilt(store.getState().data, ids);
      expect(await onDisk()).toEqual(shown);
    });

    it('the localStorage fallback keeps them, and moves them into SQLite once it can', async () => {
      env.state.openError = new Error('no OPFS');
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const shown = store.getState().data;
      isAsBuilt(JSON.parse(env.ls.get('wanderment')!).state.data, ids);
      store = await reload();
      expect(store.getState().data).toEqual(shown);
      env.state.openError = undefined;
      store = await reload();
      expect(store.getState().storage).toEqual(READY);
      expect(await onDisk()).toEqual(shown);
    });

    it('undo of a copy that brought what it calls, and of Copy and add: one Undo each, taken back on screen and on disk', async () => {
      fakeLocks();
      const store = await load();
      const ids = build(store);
      await tick(30);
      const before = store.getState().data;
      expect(store.getState().copyFromLibrary('lib-weigh').ok).toBe(true);
      await tick(30);
      expect(names(await onDisk())).toEqual(expect.arrayContaining(['Weigh the options', 'Gather options', 'Choose']));
      expect(store.getState().undoLast()).toBe(true);
      await tick(30);
      expect(await onDisk()).toEqual(before);
      expect(store.getState().copyAndAdd('lib-outside', ids.plan, null).ok).toBe(true);
      await tick(30);
      expect(store.getState().undoLast()).toBe(true);
      await tick(30);
      expect(await onDisk()).toEqual(before);
      expect(store.getState().data).toEqual(before);
    });

    it('export → import: the copies are the person’s data, in the backup as they are; the same file is identical; after an import they are still there', async () => {
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const exported = store.getState().data;
      const { toBackup } = await import('@/domain/backup');
      const { previewImport, confirmImport } = await import('@/store/importBackup');
      const json = toBackup(exported);
      isAsBuilt(JSON.parse(json).data, ids);
      expect(previewImport(json).plan).toMatchObject({ identical: true });
      expect(store.getState().copyFromLibrary('lib-source').ok).toBe(true);
      expect(confirmImport(previewImport(json)).ok).toBe(true);
      await tick(30);
      store = await reload();
      expect(store.getState().data).toEqual(exported);
      // A name copied before is still the person's: copying it again is refused, nothing written.
      expect(store.getState().copyFromLibrary('lib-recall')).toEqual({ ok: false, reason: 'same-name' });
      expect(store.getState().data).toEqual(exported);
    });
  });

  // ───────── P-109: places ─────────
  describe('P-109: places survive reload, journal replay, the fallback, hand-over, export and import — a shape this version does not know is kept, an unsafe Where stays words', () => {
    type Ids = { placed: string; other: string };
    const placesIn = (data: { routines: Record<string, Record<string, unknown>> }, id: string) => data.routines[id].places as { id: string; name: string; where: string }[] | undefined;
    async function reload() {
      (await import('./persistence')).stopPersistence();
      page = fakePage();
      fakeLocks();
      const store = await load();
      await tick(30);
      return store;
    }
    /**
     * Through the store's actions, as a person would in the Places sheet: two routines made with New, a step each;
     * on one, three places added (a Notion address, words, a Google Docs address), the words one changed, the last
     * moved up; on the other one added, then removed (the field goes).
     */
    function build(store: Store): Ids {
      const g = () => store.getState();
      const a = g().createRoutine('Product design');
      const b = g().createRoutine('Make a game');
      if (!a.ok || !a.routineId || !b.ok || !b.routineId) throw new Error('New: was refused');
      const all = [
        g().editRoutine(a.routineId, { kind: 'addStep', text: 'Sketch' }),
        g().editRoutine(b.routineId, { kind: 'addStep', text: 'Sketch the HUD' }),
        g().editRoutine(a.routineId, { kind: 'addPlace', name: 'Design doc', where: 'https://www.notion.so/team/Design-1a2b' }),
        g().editRoutine(a.routineId, { kind: 'addPlace', name: 'Sketchbook', where: 'left shelf' }),
        g().editRoutine(a.routineId, { kind: 'addPlace', name: 'Brief', where: ' https://docs.google.com/document/d/1AbC/edit ' }),
      ];
      const [, book, brief] = placesIn(store.getState().data, a.routineId)!;
      all.push(
        g().editRoutine(a.routineId, { kind: 'changePlace', place: book.id, name: 'Sketchbook', where: 'left shelf, the grey one' }),
        g().editRoutine(a.routineId, { kind: 'movePlace', place: brief.id, by: -1 }),
        g().editRoutine(b.routineId, { kind: 'addPlace', name: 'Board', where: 'https://trello.com/b/1' }),
      );
      all.push(g().editRoutine(b.routineId, { kind: 'removePlace', place: placesIn(store.getState().data, b.routineId)![0].id }));
      expect(all.map((r) => r.ok)).toEqual(all.map(() => true));
      return { placed: a.routineId, other: b.routineId };
    }
    const isAsBuilt = (data: { routines: Record<string, Record<string, unknown>> }, ids: Ids) => {
      expect(placesIn(data, ids.placed)!.map((p) => [p.name, p.where])).toEqual([
        ['Design doc', 'https://www.notion.so/team/Design-1a2b'],
        ['Brief', 'https://docs.google.com/document/d/1AbC/edit'],
        ['Sketchbook', 'left shelf, the grey one'],
      ]);
      expect('places' in data.routines[ids.other]).toBe(false);
    };

    it('reload: saved to SQLite as kept (in order, tidied), the same after a reload; a routine with none has no field', async () => {
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const shown = store.getState().data;
      isAsBuilt(shown, ids);
      expect(await onDisk()).toEqual(shown);
      store = await reload();
      expect(store.getState().data).toEqual(shown);
      const { placesShown } = await import('@/domain/places');
      expect(placesShown(store.getState().data.routines[ids.placed].places).map((p) => p.host ?? p.where)).toEqual(['notion.so', 'docs.google.com', 'left shelf, the grey one']);
    });

    it('journal replay: kept while no write commits (the tab dies), the places are there after a reload', async () => {
      fakeLocks();
      let store = await load();
      env.state.hangWrites = true;
      const ids = build(store);
      await tick(30);
      expect(await onDisk()).toMatchObject({ routines: {} });
      const shown = store.getState().data;
      env.state.hangWrites = false;
      store = await reload();
      expect(store.getState().data).toEqual(shown);
      isAsBuilt(store.getState().data, ids);
      expect(env.ls.has('wanderment:journal')).toBe(false);
      expect(await onDisk()).toEqual(shown);
    });

    it('the localStorage fallback keeps them, and moves them into SQLite once it can', async () => {
      env.state.openError = new Error('no OPFS');
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const shown = store.getState().data;
      expect(JSON.parse(env.ls.get('wanderment')!).state.data.routines[ids.placed].places).toHaveLength(3);
      store = await reload();
      expect(store.getState().storage).toEqual({ state: 'ready', kind: 'local' });
      expect(store.getState().data).toEqual(shown);
      env.state.openError = undefined;
      store = await reload();
      expect(store.getState().storage).toEqual(READY);
      expect(store.getState().data).toEqual(shown);
      expect(await onDisk()).toEqual(shown);
      isAsBuilt(store.getState().data, ids);
    });

    it('hand-over with a take-back: a place added here, still only in the journal when the page is hidden, stays on top of another page’s place on another routine; that one is taken too', async () => {
      fakeLocks();
      const store = await load();
      const ids = build(store);
      await tick(30);
      writeGate = deferred();
      expect(store.getState().editRoutine(ids.placed, { kind: 'addPlace', name: 'Figma', where: 'https://www.figma.com/file/X' }).ok).toBe(true);
      await tick(0);
      const figma = placesIn(store.getState().data, ids.placed)![3];
      expect(store.getState().editRoutine(ids.placed, { kind: 'changePlace', place: figma.id, name: 'Figma file', where: figma.where }).ok).toBe(true);
      await tick(0);
      page.hide();
      writeGate.open();
      writeGate = undefined;
      await tick(30);
      expect(JSON.parse(env.ls.get('wanderment:journal')!).changes.upsertRoutines.map((r: { id: string }) => r.id)).toEqual([ids.placed]);
      const mine = store.getState().data.routines[ids.placed];

      const { editRoutine } = await import('@/domain/run');
      const other = editRoutine(await onDisk(), ids.other, { kind: 'addPlace', name: 'Board', where: 'https://trello.com/b/2' }, { now: '2026-11-27T12:00:00.000Z', id: () => 'other-page-place' });
      expect(other.ok).toBe(true);
      const { nodeDb } = await import('./nodeDb');
      const { saveChanges } = await import('./repository');
      const db = nodeDb(env.state.dbPath);
      await saveChanges(db, { upsertRoutines: [other.data.routines[ids.other]] } as never);
      db.close();

      page.show();
      await tick(100);
      expect(store.getState().storage).toEqual(READY);
      expect(store.getState().data.routines[ids.placed]).toEqual(mine);
      expect(placesIn(store.getState().data, ids.placed)!.map((p) => p.name)).toEqual(['Design doc', 'Brief', 'Sketchbook', 'Figma file']);
      expect(placesIn(store.getState().data, ids.other)).toEqual([{ id: 'other-page-place', name: 'Board', where: 'https://trello.com/b/2' }]);
      expect(await onDisk()).toEqual(store.getState().data);
      expect((await reload()).getState().data).toEqual(store.getState().data);
    });

    it('undo of a place removed is taken back on screen and on disk', async () => {
      fakeLocks();
      const store = await load();
      const ids = build(store);
      await tick(30);
      const before = store.getState().data;
      expect(store.getState().editRoutine(ids.placed, { kind: 'removePlace', place: placesIn(before, ids.placed)![0].id }).ok).toBe(true);
      await tick(30);
      expect(placesIn(await onDisk(), ids.placed)).toHaveLength(2);
      expect(store.getState().undoLast()).toBe(true);
      await tick(30);
      expect(await onDisk()).toEqual(before);
    });

    it('export → import: places are in the backup and its preview; a file with unsafe Wheres and a shape this version does not know replaces it — kept exactly, opening nothing — through a reload, the journal, the fallback and another export', async () => {
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const exported = store.getState().data;
      const { toBackup } = await import('@/domain/backup');
      const { previewImport, confirmImport } = await import('@/store/importBackup');
      const { importHolds } = await import('@/domain/importText');
      const { placesShown, placesWritable } = await import('@/domain/places');
      const json = toBackup(exported);
      const file = JSON.parse(json);
      expect(file.data.routines[ids.placed].places).toEqual(placesIn(exported, ids.placed));
      const same = previewImport(json);
      expect(same.plan).toMatchObject({ identical: true });
      expect(same.incoming).toEqual(exported);
      expect(importHolds(same.plan)).toBe('This backup has 2 routines with 3 places.');

      // A crafted file: Wheres in every unsafe scheme on one routine, a later version's shape on the other.
      const unsafe = ['javascript:alert(document.domain)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>alert(1)</script>', 'file:///etc/passwd', 'vbscript:msgbox(1)', ' notion://www.notion.so/x'];
      file.data.routines[ids.placed].places = unsafe.map((where, i) => ({ id: `u${i}`, name: `Trap ${i}`, where }));
      const later = { version: 2, groups: [{ name: 'Docs', items: [{ url: 'javascript:alert(1)' }] }] };
      file.data.routines[ids.other].places = later;
      const differs = previewImport(JSON.stringify(file));
      expect(differs.plan).toMatchObject({ identical: false, routines: { changed: 2 } });
      expect(importHolds(differs.plan)).toBe('This backup has 2 routines with 6 places.');
      expect(confirmImport(differs).ok).toBe(true);
      await tick(30);
      store = await reload();
      expect(store.getState().data).toEqual(file.data);
      // Shown as words, every one: nothing opens.
      expect(placesShown(store.getState().data.routines[ids.placed].places).map((p) => [p.where.trim(), p.href])).toEqual(unsafe.map((w) => [w.trim(), undefined]));
      // The later shape: read as none, never overwritten — an edit is refused and it stays.
      expect(placesShown(store.getState().data.routines[ids.other].places)).toEqual([]);
      expect(placesWritable(store.getState().data.routines[ids.other].places)).toBe(false);
      expect(store.getState().editRoutine(ids.other, { kind: 'addPlace', name: 'A', where: 'a' })).toMatchObject({ ok: false, reason: 'cannot' });
      // Another edit to that routine keeps it; through the journal and out again.
      env.state.hangWrites = true;
      expect(store.getState().editRoutine(ids.other, { kind: 'rename', words: 'Make a game, v2' }).ok).toBe(true);
      await tick(30);
      env.state.hangWrites = false;
      store = await reload();
      expect(store.getState().data.routines[ids.other]).toMatchObject({ words: 'Make a game, v2', places: later });
      const held = store.getState().data;
      // Where SQLite can't run (a fresh browser): the same file imported there is kept in the fallback, as it is.
      (await import('./persistence')).stopPersistence();
      env.ls.clear();
      env.state.dbPath = join(mkdtempSync(join(tmpdir(), 'wanderment-')), 'db.sqlite');
      env.state.openError = new Error('no OPFS');
      store = await reload();
      expect(store.getState().storage).toEqual({ state: 'ready', kind: 'local' });
      const fresh = await import('@/store/importBackup');
      expect(fresh.confirmImport(fresh.previewImport(toBackup(held))).ok).toBe(true);
      await tick(30);
      expect(JSON.parse(env.ls.get('wanderment')!).state.data.routines[ids.other].places).toEqual(later);
      store = await reload();
      expect(store.getState().data).toEqual(held);
      expect(JSON.parse(toBackup(store.getState().data)).data).toEqual(held);
    });
  });

  // ───────── P-107: for each ─────────
  describe('P-107: a for each block, a list and a run inside the loop survive reload, journal replay, the fallback, hand-over, undo, export and import — an older shape of `each` is kept and read as a step broken down', () => {
    type Ids = { drawing: string; block: string; row: string; find: string; runId: string };
    const itemsOf = (data: { routines: Record<string, Record<string, unknown>> }, id: string) => data.routines[id].items as Record<string, unknown>[];
    async function reload() {
      (await import('./persistence')).stopPersistence();
      page = fakePage();
      fakeLocks();
      const store = await load();
      await tick(30);
      return store;
    }
    /**
     * Through the store's actions, as a person would: New "Drawing practice"; "Find reference photos" gives {photos};
     * Add's "For each…" makes "For each photo in {photos}"; "Draw {photo}" inside it gives {drawing}; "Rank the
     * {drawing}" after it. Started: three photos given in the list field, Next (into the loop), a drawing named, Next
     * (the second photo).
     */
    function build(store: Store): Ids {
      const g = () => store.getState();
      const made = g().createRoutine('Drawing practice');
      if (!made.ok || !made.routineId) throw new Error('New: was refused');
      const drawing = made.routineId;
      const all = [g().editRoutine(drawing, { kind: 'addStep', text: 'Find reference photos' })];
      const find = itemsOf(g().data, drawing)[0].id as string;
      all.push(g().editRoutine(drawing, { kind: 'gives', item: find, name: 'photos' }), g().editRoutine(drawing, { kind: 'addEach', item: 'photo', list: 'photos' }));
      const row = itemsOf(g().data, drawing)[1] as { id: string; ref: string };
      all.push(g().editRoutine(row.ref, { kind: 'addStep', text: 'Draw {photo}' }));
      all.push(g().editRoutine(row.ref, { kind: 'gives', item: itemsOf(g().data, row.ref)[0].id as string, name: 'drawing' }), g().editRoutine(drawing, { kind: 'addStep', text: 'Rank the {drawing}' }));
      const started = g().startRoutine(drawing);
      if (!started.ok || !started.runId) throw new Error('Start was refused');
      const runId = started.runId;
      all.push(g().typeList(runId, find, 'photos', ['the dancer', 'the boxer', 'the cellist']), g().nextStep(runId));
      all.push(g().typeValue(runId, itemsOf(g().data, row.ref)[0].id as string, 'drawing', 'dancer sketch'), g().nextStep(runId));
      expect(all.map((r) => r.ok)).toEqual(all.map(() => true));
      return { drawing, block: row.ref, row: row.id, find, runId };
    }
    const isAsBuilt = (data: { routines: Record<string, Record<string, unknown>>; runs: Record<string, Record<string, unknown>> }, ids: Ids) => {
      expect(data.routines[ids.block]).toMatchObject({ named: false, words: 'For each photo in {photos}', each: { item: 'photo', list: 'photos' } });
      expect(itemsOf(data, ids.drawing)[1]).toEqual({ id: ids.row, ref: ids.block });
      const run = data.runs[ids.runId] as { frames: Record<string, unknown>[]; values: { name: string; items: string[]; level: number; item: string }[] };
      expect(run.frames[1]).toMatchObject({ seq: ids.block, from: ids.row, each: 1, eachText: 'the boxer' });
      expect(run.values.map((v) => [v.name, v.items, v.level, v.item])).toEqual([
        ['photos', ['the dancer', 'the boxer', 'the cellist'], 0, ids.find],
        ['drawing', ['dancer sketch'], 0, ids.row],
      ]);
    };
    /** What the run shows: the item it is on, and where it is in the list. */
    const shown = async (data: Parameters<typeof isAsBuilt>[0], ids: Ids) => {
      const { runnerView } = await import('@/domain/runView');
      const v = runnerView(data as never, ids.runId)!;
      return { step: v.step.parts.map((p) => ('text' in p ? p.text : `{${p.name}}`)).join(''), item: v.values.find((x) => x.name === 'photo') };
    };

    it('reload: saved to SQLite as kept — the block, the list, the run on the second photo with what the first gave — the same after a reload', async () => {
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const data = store.getState().data;
      isAsBuilt(data as never, ids);
      expect(await onDisk()).toEqual(data);
      store = await reload();
      expect(store.getState().data).toEqual(data);
      expect(await shown(store.getState().data as never, ids)).toMatchObject({ step: 'Draw the boxer', item: { text: 'the boxer', each: { n: 2, of: 3 } } });
    });

    it('journal replay: kept while no write commits (the tab dies), all of it is there after a reload', async () => {
      fakeLocks();
      let store = await load();
      env.state.hangWrites = true;
      const ids = build(store);
      await tick(30);
      expect(await onDisk()).toMatchObject({ routines: {} });
      const data = store.getState().data;
      env.state.hangWrites = false;
      store = await reload();
      expect(store.getState().data).toEqual(data);
      isAsBuilt(store.getState().data as never, ids);
      expect(env.ls.has('wanderment:journal')).toBe(false);
      expect(await onDisk()).toEqual(data);
    });

    it('the localStorage fallback keeps it, and moves it into SQLite once it can', async () => {
      env.state.openError = new Error('no OPFS');
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const data = store.getState().data;
      isAsBuilt(JSON.parse(env.ls.get('wanderment')!).state.data, ids);
      store = await reload();
      expect(store.getState().storage).toEqual({ state: 'ready', kind: 'local' });
      expect(store.getState().data).toEqual(data);
      env.state.openError = undefined;
      store = await reload();
      expect(store.getState().storage).toEqual(READY);
      expect(store.getState().data).toEqual(data);
      expect(await onDisk()).toEqual(data);
    });

    it('hand-over with a take-back: what the second photo gave, here and still only in the journal when hidden, stays on top of another page’s step added to the block; the other page’s is taken', async () => {
      fakeLocks();
      const store = await load();
      const ids = build(store);
      await tick(30);
      const draw = itemsOf(store.getState().data as never, ids.block)[0].id as string;
      writeGate = deferred();
      expect(store.getState().typeValue(ids.runId, draw, 'drawing', 'boxer').ok).toBe(true);
      await tick(0);
      expect(store.getState().typeValue(ids.runId, draw, 'drawing', 'boxer sketch').ok).toBe(true);
      await tick(0);
      page.hide();
      writeGate.open();
      writeGate = undefined;
      await tick(30);
      expect(JSON.parse(env.ls.get('wanderment:journal')!).changes.upsertRuns.map((r: { id: string }) => r.id)).toEqual([ids.runId]);
      const mine = store.getState().data.runs[ids.runId];

      const { editRoutine } = await import('@/domain/run');
      const other = editRoutine(await onDisk(), ids.block, { kind: 'addStep', text: 'Put {photo} away' }, { now: '2026-11-27T12:00:00.000Z', id: () => 'other-page-step' });
      expect(other.ok).toBe(true);
      const { nodeDb } = await import('./nodeDb');
      const { saveChanges } = await import('./repository');
      const db = nodeDb(env.state.dbPath);
      await saveChanges(db, { upsertRoutines: [other.data.routines[ids.block]] } as never);
      db.close();

      page.show();
      await tick(100);
      expect(store.getState().storage).toEqual(READY);
      expect(store.getState().data.runs[ids.runId]).toEqual(mine);
      expect((mine.values as { name: string; items: string[]; level: number }[]).map((v) => [v.name, v.items, v.level])).toEqual([
        ['photos', ['the dancer', 'the boxer', 'the cellist'], 0],
        ['drawing', ['dancer sketch'], 0],
        ['drawing', ['boxer sketch'], 1],
      ]);
      expect(itemsOf(store.getState().data as never, ids.block).map((i) => i.text)).toEqual(['Draw {photo}', 'Put {photo} away']);
      expect(store.getState().data.routines[ids.block]).toMatchObject({ each: { item: 'photo', list: 'photos' } });
      expect(await onDisk()).toEqual(store.getState().data);
      expect((await reload()).getState().data).toEqual(store.getState().data);
    });

    it('undo of Add’s "For each…", of a list replaced and of Step out of the loop: taken back on screen and on disk', async () => {
      fakeLocks();
      const store = await load();
      const ids = build(store);
      await tick(30);
      const before = store.getState().data;
      expect(store.getState().editRoutine(ids.drawing, { kind: 'addEach', item: 'drawing item', list: 'drawing' }).ok).toBe(true);
      await tick(30);
      expect(itemsOf(await onDisk(), ids.drawing)).toHaveLength(4);
      expect(store.getState().undoLast()).toBe(true);
      await tick(30);
      expect(await onDisk()).toEqual(before);
      // A list replaced from its field (the run moved back to its giving step by Jump to, whose own Undo is then replaced).
      expect(store.getState().jumpTo(ids.runId, { path: [ids.find] }).ok).toBe(true);
      await tick(30);
      // (P-110, rewritten: was the list replaced straight after the Jump — a Jump back onto the step that gives {photos}
      // now clears it; so it is given there first, then replaced.)
      expect(store.getState().typeList(ids.runId, ids.find, 'photos', ['the dancer', 'the boxer', 'the cellist']).ok).toBe(true);
      await tick(30);
      const jumped = store.getState().data;
      expect(store.getState().typeList(ids.runId, ids.find, 'photos', ['the dancer']).ok).toBe(true);
      store.getState().typedOver(ids.runId, ids.find, 'photos', 'the dancer, the boxer and the cellist', ['the dancer', 'the boxer', 'the cellist']);
      await tick(30);
      expect(((await onDisk()).runs[ids.runId].values as { items: string[] }[])[0].items).toEqual(['the dancer']);
      expect(store.getState().undoLast()).toBe(true);
      await tick(30);
      expect(await onDisk()).toEqual(jumped);
      // Step out of the loop.
      expect(store.getState().nextStep(ids.runId).ok).toBe(true);
      await tick(30);
      const inLoop = store.getState().data;
      expect(store.getState().doneLevel(ids.runId).ok).toBe(true);
      await tick(30);
      expect(((await onDisk()).runs[ids.runId].frames as unknown[]).length).toBe(1);
      expect(store.getState().undoLast()).toBe(true);
      await tick(30);
      expect(await onDisk()).toEqual(inLoop);
    });

    it('export → import: the block, the list and the run are in the backup; the same file is identical; one whose `each` is in a shape this version does not know, and with a field it does not know on the loop’s level, replaces it — kept exactly through a move, an edit, a reload, the journal and another export, and read as a step broken down', async () => {
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const exported = store.getState().data;
      const { toBackup } = await import('@/domain/backup');
      const { previewImport, confirmImport } = await import('@/store/importBackup');
      const json = toBackup(exported);
      const file = JSON.parse(json);
      isAsBuilt(file.data, ids);
      expect(previewImport(json).plan).toMatchObject({ identical: true });
      const later = { over: 'photos', as: 'photo', kept: true };
      file.data.routines[ids.block].each = later;
      file.data.runs[ids.runId].frames[0].later = { i: 2 };
      expect(confirmImport(previewImport(JSON.stringify(file))).ok).toBe(true);
      await tick(30);
      store = await reload();
      expect(store.getState().data).toEqual(file.data);
      const { planView } = await import('@/domain/runView');
      const { readRoutine } = await import('@/domain/run');
      // Not readable as a for each: a step broken down, its words as stored.
      expect(readRoutine(store.getState().data, ids.block)!.each).toBeUndefined();
      expect(planView(store.getState().data, { runId: ids.runId })!.rows[1]).toMatchObject({ kind: 'routine', broken: true, words: 'For each photo in {photos}' });
      expect(planView(store.getState().data, { runId: ids.runId })!.rows[1].each).toBeUndefined();
      // A move and an edit keep both; through the journal and out again.
      env.state.hangWrites = true;
      expect(store.getState().nextStep(ids.runId).ok).toBe(true);
      expect(store.getState().editRoutine(ids.block, { kind: 'addStep', text: 'Put it away' }).ok).toBe(true);
      await tick(30);
      env.state.hangWrites = false;
      store = await reload();
      const held = store.getState().data;
      expect(held.routines[ids.block]).toMatchObject({ each: later });
      expect((held.runs[ids.runId].frames as Record<string, unknown>[])[0]).toMatchObject({ later: { i: 2 } });
      expect(JSON.parse(toBackup(held)).data).toEqual(held);
    });
  });

  // ───────── P-108: kept lists, a for each's own list, values that are routines ─────────
  describe('P-108: a kept list, a list of its own, a routine row by a name and a value that is a routine survive reload, journal replay, the fallback, hand-over, undo, export and import — shapes this version cannot read are kept', () => {
    type Ids = { better: string; guide: string; kept: string; own: string; adjust: string; choose: string; slot: string; ownRow: string; runId: string };
    const itemsOf = (data: { routines: Record<string, Record<string, unknown>> }, id: string) => data.routines[id].items as Record<string, unknown>[];
    async function reload() {
      (await import('./persistence')).stopPersistence();
      page = fakePage();
      fakeLocks();
      const store = await load();
      await tick(30);
      return store;
    }
    /**
     * Through the store's actions, as a person would (B-16's "Become a better drawer"): a for each over a list kept in the
     * routine ("arms", "legs" by + Add), "Practise {subject}" and "Adjust the subjects" (gives it) inside; a for each with
     * its own list ("topics"); "Choose a way to draw" gives {way}; ▤ {way}. Started: arms practised, "hands" added from the
     * adjusting step, on through legs; at the own list's row, "colour theory" given; through it; {way} chosen as the
     * routine "Draw with guidelines"; Next: on ▤ {way}.
     */
    function build(store: Store): Ids {
      const g = () => store.getState();
      const guide = (g().createRoutine('Draw with guidelines') as { routineId?: string }).routineId!;
      const made = g().createRoutine('Become a better drawer');
      if (!made.ok || !made.routineId || !guide) throw new Error('New: was refused');
      const better = made.routineId;
      const all = [g().editRoutine(guide, { kind: 'addStep', text: 'Block it in with guidelines' }), g().editRoutine(better, { kind: 'addEach', item: 'subject', list: 'subjects', own: 'kept' })];
      const kept = (itemsOf(g().data, better)[0] as { ref: string }).ref;
      all.push(g().editRoutine(kept, { kind: 'keptList', items: ['arms', 'legs'] }), g().editRoutine(kept, { kind: 'addStep', text: 'Practise {subject}' }), g().editRoutine(kept, { kind: 'addStep', text: 'Adjust the subjects' }));
      const adjust = itemsOf(g().data, kept)[1].id as string;
      all.push(g().editRoutine(kept, { kind: 'gives', item: adjust, name: 'subjects' }), g().editRoutine(better, { kind: 'addEach', item: 'topic', list: 'topics', own: 'asked' }));
      const ownRow = itemsOf(g().data, better)[1] as { id: string; ref: string };
      all.push(g().editRoutine(ownRow.ref, { kind: 'addStep', text: 'Find a guide on {topic}' }), g().editRoutine(better, { kind: 'addStep', text: 'Choose a way to draw' }));
      const choose = itemsOf(g().data, better)[2].id as string;
      all.push(g().editRoutine(better, { kind: 'gives', item: choose, name: 'way' }), g().editRoutine(better, { kind: 'addSlot', name: 'way' }));
      const slot = itemsOf(g().data, better)[3].id as string;
      const started = g().startRoutine(better);
      if (!started.ok || !started.runId) throw new Error('Start was refused');
      const runId = started.runId;
      all.push(g().nextStep(runId), g().typeList(runId, adjust, 'subjects', ['arms', 'legs', 'hands']), g().nextStep(runId), g().nextStep(runId), g().nextStep(runId));
      all.push(g().typeList(runId, ownRow.id, 'topics', ['colour theory']), g().nextStep(runId), g().nextStep(runId));
      all.push(g().typeValue(runId, choose, 'way', 'Draw with guidelines', [{ ref: guide, name: 'Draw with guidelines' }]), g().nextStep(runId));
      expect(all.map((r) => r.ok)).toEqual(all.map(() => true));
      return { better, guide, kept, own: ownRow.ref, adjust, choose, slot, ownRow: ownRow.id, runId };
    }
    const isAsBuilt = (data: { routines: Record<string, Record<string, unknown>>; runs: Record<string, Record<string, unknown>> }, ids: Ids) => {
      expect(data.routines[ids.kept]).toMatchObject({ named: false, words: 'For each subject in {subjects}', each: { item: 'subject', list: 'subjects', kept: ['arms', 'legs', 'hands'] } });
      expect(data.routines[ids.own]).toMatchObject({ named: false, each: { item: 'topic', list: 'topics', own: true } });
      expect(itemsOf(data, ids.better)[3]).toEqual({ id: ids.slot, text: '{way}', slot: true });
      const run = data.runs[ids.runId] as { frames: Record<string, unknown>[]; values: Record<string, unknown>[] };
      expect(run.frames.map((f) => f.at)).toEqual([ids.slot]);
      expect(run.values.map((v) => [v.name, v.items, v.item, v.refs])).toEqual([
        ['topics', ['colour theory'], ids.ownRow, undefined],
        ['way', ['Draw with guidelines'], ids.choose, [{ ref: ids.guide, name: 'Draw with guidelines' }]],
      ]);
    };
    const shown = async (data: Parameters<typeof isAsBuilt>[0], ids: Ids) => {
      const { runnerView } = await import('@/domain/runView');
      const v = runnerView(data as never, ids.runId)!;
      return { step: v.step, stepIn: v.moves.stepIn, way: v.values.find((x) => x.name === 'way')?.shown };
    };

    it('reload: saved to SQLite as kept — the kept list (with what the running step added), the own list, ▤ {way}, the routine chosen — the same after a reload', async () => {
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const data = store.getState().data;
      isAsBuilt(data as never, ids);
      expect(await onDisk()).toEqual(data);
      store = await reload();
      expect(store.getState().data).toEqual(data);
      expect(await shown(store.getState().data as never, ids)).toMatchObject({ step: { kind: 'routine', words: 'Draw with guidelines' }, stepIn: true, way: [{ text: 'Draw with guidelines', routine: ids.guide }] });
    });

    it('journal replay: kept while no write commits (the tab dies), all of it is there after a reload', async () => {
      fakeLocks();
      let store = await load();
      env.state.hangWrites = true;
      const ids = build(store);
      await tick(30);
      expect(await onDisk()).toMatchObject({ routines: {} });
      const data = store.getState().data;
      env.state.hangWrites = false;
      store = await reload();
      expect(store.getState().data).toEqual(data);
      isAsBuilt(store.getState().data as never, ids);
      expect(env.ls.has('wanderment:journal')).toBe(false);
      expect(await onDisk()).toEqual(data);
    });

    it('the localStorage fallback keeps it, and moves it into SQLite once it can', async () => {
      env.state.openError = new Error('no OPFS');
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const data = store.getState().data;
      isAsBuilt(JSON.parse(env.ls.get('wanderment')!).state.data, ids);
      store = await reload();
      expect(store.getState().storage).toEqual({ state: 'ready', kind: 'local' });
      expect(store.getState().data).toEqual(data);
      env.state.openError = undefined;
      store = await reload();
      expect(store.getState().storage).toEqual(READY);
      expect(store.getState().data).toEqual(data);
      expect(await onDisk()).toEqual(data);
    });

    it('hand-over with a take-back: the run’s step into the routine held, still only in the journal when hidden, stays on top of another page’s + Add on the kept list; the other page’s item is taken', async () => {
      fakeLocks();
      const store = await load();
      const ids = build(store);
      await tick(30);
      writeGate = deferred();
      expect(store.getState().stepIn(ids.runId).ok).toBe(true);
      await tick(0);
      page.hide();
      writeGate.open();
      writeGate = undefined;
      await tick(30);
      const mine = store.getState().data.runs[ids.runId];
      expect((mine.frames as { seq: string }[]).map((f) => f.seq)).toEqual([ids.better, ids.guide]);

      const { editRoutine } = await import('@/domain/run');
      const other = editRoutine(await onDisk(), ids.kept, { kind: 'keptList', items: ['arms', 'legs', 'hands', 'cartoons'] }, { now: '2026-11-27T12:00:00.000Z', id: () => 'other-page' });
      expect(other.ok).toBe(true);
      const { nodeDb } = await import('./nodeDb');
      const { saveChanges } = await import('./repository');
      const db = nodeDb(env.state.dbPath);
      await saveChanges(db, { upsertRoutines: [other.data.routines[ids.kept]] } as never);
      db.close();

      page.show();
      await tick(100);
      expect(store.getState().storage).toEqual(READY);
      expect(store.getState().data.runs[ids.runId]).toEqual(mine);
      expect(store.getState().data.routines[ids.kept]).toMatchObject({ each: { kept: ['arms', 'legs', 'hands', 'cartoons'] } });
      expect(await onDisk()).toEqual(store.getState().data);
      expect((await reload()).getState().data).toEqual(store.getState().data);
    });

    it('undo of Add’s For each… with a kept list, of + Add, of an adjustment from the running step, of ▤ {way} added, and of a routine value replaced: taken back on screen and on disk', async () => {
      fakeLocks();
      const store = await load();
      const ids = build(store);
      await tick(30);
      const g = () => store.getState();
      let before = g().data;
      for (const e of [
        [ids.better, { kind: 'addEach', item: 'pose', list: 'poses', own: 'kept' }],
        [ids.kept, { kind: 'keptList', items: ['arms', 'legs', 'hands', 'feet'] }],
        [ids.better, { kind: 'addSlot', name: 'way', after: null }],
      ] as const) {
        expect(g().editRoutine(e[0], e[1] as never).ok).toBe(true);
        await tick(30);
        expect(await onDisk()).not.toEqual(before);
        expect(g().undoLast()).toBe(true);
        await tick(30);
        expect(await onDisk()).toEqual(before);
      }
      // The routine value replaced by words in its field, then the field left: "Changed {way}", and its Undo puts the routine back.
      expect(g().jumpTo(ids.runId, { path: [ids.choose] }).ok).toBe(true);
      await tick(30);
      // (P-110, rewritten: was the value replaced straight after the Jump — a Jump back onto the step that gives {way}
      // now clears it; so the routine is given there first, then replaced by words.)
      expect(g().typeValue(ids.runId, ids.choose, 'way', 'Draw with guidelines', [{ ref: ids.guide, name: 'Draw with guidelines' }]).ok).toBe(true);
      await tick(30);
      before = g().data;
      expect(g().typeValue(ids.runId, ids.choose, 'way', 'freely').ok).toBe(true);
      g().typedOver(ids.runId, ids.choose, 'way', 'Draw with guidelines', undefined, [{ ref: ids.guide, name: 'Draw with guidelines' }]);
      await tick(30);
      expect(((await onDisk()).runs[ids.runId].values as Record<string, unknown>[]).find((v) => v.name === 'way')).not.toHaveProperty('refs');
      expect(g().undoLast()).toBe(true);
      await tick(30);
      expect(await onDisk()).toEqual(before);
      // The kept list adjusted from the running step, then left: its Undo puts the routine's list back.
      expect(g().jumpTo(ids.runId, { path: [ids.kept ? (itemsOf(g().data as never, ids.better)[0].id as string) : '', ids.adjust] }).ok).toBe(true);
      await tick(30);
      before = g().data;
      expect(g().typeList(ids.runId, ids.adjust, 'subjects', ['arms']).ok).toBe(true);
      g().typedOver(ids.runId, ids.adjust, 'subjects', 'arms, legs and hands', ['arms', 'legs', 'hands']);
      await tick(30);
      expect((await onDisk()).routines[ids.kept]).toMatchObject({ each: { kept: ['arms'] } });
      expect(g().undoLast()).toBe(true);
      await tick(30);
      expect(await onDisk()).toEqual(before);
    });

    it('export → import: all of it is in the backup; the same file is identical; one with a kept list, refs, a routine row and a level in shapes this version cannot read replaces it — kept exactly through a move, an edit, a reload, the journal and another export', async () => {
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const exported = store.getState().data;
      const { toBackup } = await import('@/domain/backup');
      const { previewImport, confirmImport } = await import('@/store/importBackup');
      const json = toBackup(exported);
      const file = JSON.parse(json);
      isAsBuilt(file.data, ids);
      expect(previewImport(json).plan).toMatchObject({ identical: true });
      file.data.routines[ids.kept].each.kept = { later: ['arms'] };
      file.data.routines[ids.kept].each.order = 'shuffled';
      file.data.runs[ids.runId].values[1].refs = 'a later shape';
      (file.data.routines[ids.better].items[3] as Record<string, unknown>).inputs = { later: true };
      file.data.runs[ids.runId].frames[0].eachSeen = { later: 1 };
      expect(confirmImport(previewImport(JSON.stringify(file))).ok).toBe(true);
      await tick(30);
      store = await reload();
      expect(store.getState().data).toEqual(file.data);
      const { readRoutine } = await import('@/domain/run');
      const { runnerView } = await import('@/domain/runView');
      // A kept list it cannot read: read as empty, never written over.
      expect(readRoutine(store.getState().data, ids.kept)!.each).toMatchObject({ kept: [], locked: true });
      expect(store.getState().editRoutine(ids.kept, { kind: 'keptList', items: ['x'] }).ok).toBe(false);
      // refs it cannot read: the value reads as its words; the row as those words, no Step in.
      expect(runnerView(store.getState().data, ids.runId)!.step).toMatchObject({ kind: 'step' });
      expect(runnerView(store.getState().data, ids.runId)!.moves.stepIn).toBe(false);
      env.state.hangWrites = true;
      expect(store.getState().backTo(ids.runId).ok).toBe(true);
      expect((store.getState().data.runs[ids.runId].frames as { at: string }[])[0].at).toBe(ids.choose);
      expect(store.getState().editRoutine(ids.better, { kind: 'addStep', text: 'Rest', after: ids.slot }).ok).toBe(true);
      expect(store.getState().editRoutine(ids.kept, { kind: 'addStep', text: 'Breathe' }).ok).toBe(true);
      await tick(30);
      env.state.hangWrites = false;
      store = await reload();
      const held = store.getState().data;
      expect(held.routines[ids.kept]).toMatchObject({ each: { kept: { later: ['arms'] }, order: 'shuffled' } });
      expect(itemsOf(held as never, ids.better)[3]).toEqual({ id: ids.slot, text: '{way}', slot: true, inputs: { later: true } });
      expect((held.runs[ids.runId].values as Record<string, unknown>[])[1]).toMatchObject({ refs: 'a later shape' });
      expect((held.runs[ids.runId].frames as Record<string, unknown>[])[0]).toMatchObject({ eachSeen: { later: 1 } });
      expect(JSON.parse(toBackup(held)).data).toEqual(held);
    });
  });

  // ───────── P-110: values follow the place; "Make it a call" ─────────

  describe('P-110: values cleared by a move back, a step made a call, and a kept list reordered mid-sitting survive reload, journal replay, the fallback, hand-over, undo, export and import — a run stored before P-110 is read without writing and kept until a move', () => {
    type Ids = { iterate: string; doc: string; env: string; pick: string; build: string; at: string; runId: string };
    const itemsOf = (data: { routines: Record<string, Record<string, unknown>> }, id: string) => data.routines[id].items as Record<string, unknown>[];
    async function reload() {
      (await import('./persistence')).stopPersistence();
      page = fakePage();
      fakeLocks();
      const store = await load();
      await tick(30);
      return store;
    }
    /**
     * Through the store's actions, as the owner did: "Document Iteration"; "Iterate on the app" — "Envision how I’d expect
     * {feature} to work", "Pick a feature" gives {feature}, "Build {feature}", "@Document Iteration" (typed as words).
     * Started: Next, {feature} given, Next — on "Build checkout".
     */
    function build(store: Store): Ids {
      const g = () => store.getState();
      const doc = g().createRoutine('Document Iteration');
      const made = g().createRoutine('Iterate on the app');
      if (!made.ok || !made.routineId || !doc.ok || !doc.routineId) throw new Error('New: was refused');
      const iterate = made.routineId;
      const all = [g().editRoutine(doc.routineId, { kind: 'addStep', text: 'Write down what changed' })];
      for (const text of ['Envision how I’d expect {feature} to work', 'Pick a feature', 'Build {feature}', '@Document Iteration']) all.push(g().editRoutine(iterate, { kind: 'addStep', text }));
      const [env_, pick, build_, at] = itemsOf(g().data, iterate).map((i) => i.id as string);
      all.push(g().editRoutine(iterate, { kind: 'gives', item: pick, name: 'feature' }));
      const started = g().startRoutine(iterate);
      if (!started.ok || !started.runId) throw new Error('Start was refused');
      all.push(g().nextStep(started.runId), g().typeValue(started.runId, pick, 'feature', 'checkout'), g().nextStep(started.runId));
      expect(all.map((r) => r.ok)).toEqual(all.map(() => true));
      return { iterate, doc: doc.routineId, env: env_, pick, build: build_, at, runId: started.runId };
    }
    const valuesOf_ = (data: { runs: Record<string, Record<string, unknown>> }, ids: Ids) => ((data.runs[ids.runId].values as { name: string; items: string[] }[] | undefined) ?? []).map((v) => `${v.name}=${v.items.join('|')}`);
    const atOf = (data: { runs: Record<string, Record<string, unknown>> }, ids: Ids) => (data.runs[ids.runId].frames as { at: string }[])[0].at;

    it('reload: a Jump back before the giving step is saved as it is made — the value gone, on disk — and its Undo brings place and value back, on disk too', async () => {
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const before = store.getState().data;
      expect(valuesOf_(before as never, ids)).toEqual(['feature=checkout']);
      expect(store.getState().jumpTo(ids.runId, { path: [ids.env] }).ok).toBe(true);
      await tick(30);
      const jumped = await onDisk();
      expect([atOf(jumped as never, ids), valuesOf_(jumped as never, ids)]).toEqual([ids.env, []]);
      store = await reload();
      expect(store.getState().data).toEqual(jumped);
      expect(store.getState().jumpTo(ids.runId, { path: [ids.build] }).ok).toBe(true);
      await tick(30);
      // (Moving on never gives it back: it was cleared.)
      expect(valuesOf_(await onDisk() as never, ids)).toEqual([]);
      store = await reload();
      expect(store.getState().jumpTo(ids.runId, { path: [ids.env] }).ok).toBe(true);
      expect(store.getState().undoLast()).toBe(true);
      await tick(30);
      expect(atOf(await onDisk() as never, ids)).toBe(ids.build);
      // The Undo of the first Jump (a fresh store: the one Undo there is is the last action's).
      (await import('./persistence')).stopPersistence();
      store = await reload();
      store.setState({ data: before });
      await tick(30);
      // (P-111, rewritten: owner ruling Back keeps it — was backTo, which no longer clears; a Jump onto the giving step does.)
      expect(store.getState().jumpTo(ids.runId, { path: [ids.pick] }).ok).toBe(true);
      await tick(30);
      expect([atOf(await onDisk() as never, ids), valuesOf_(await onDisk() as never, ids)]).toEqual([ids.pick, []]);
      expect(store.getState().undoLast()).toBe(true);
      await tick(30);
      expect(await onDisk()).toEqual(before);
    });

    // P-111 (owner rulings "Back keeps it", "A Plan edit never clears a run's values"): what Back and a Plan edit keep is on disk, across reloads and later moves.
    it('P-111: Back onto the giving step keeps {feature} on disk; a Plan edit that puts its step below the place keeps it stored across a reload and the moves before it is reached', async () => {
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      expect(store.getState().backTo(ids.runId).ok).toBe(true);
      await tick(30);
      expect([atOf(await onDisk() as never, ids), valuesOf_(await onDisk() as never, ids)]).toEqual([ids.pick, ['feature=checkout']]);
      store = await reload();
      expect(valuesOf_(store.getState().data as never, ids)).toEqual(['feature=checkout']);
      expect(store.getState().nextStep(ids.runId).ok).toBe(true);
      // Plan: "Pick a feature" dragged below "@Document Iteration" — below the place ("Build checkout").
      expect(store.getState().editRoutine(ids.iterate, { kind: 'move', item: ids.pick, by: 2 }).ok).toBe(true);
      await tick(30);
      expect(valuesOf_(await onDisk() as never, ids)).toEqual(['feature=checkout']);
      store = await reload();
      expect(store.getState().nextStep(ids.runId).ok).toBe(true);
      await tick(30);
      expect([atOf(await onDisk() as never, ids), valuesOf_(await onDisk() as never, ids)]).toEqual([ids.at, ['feature=checkout']]);
      store = await reload();
      expect(store.getState().nextStep(ids.runId).ok).toBe(true);
      await tick(30);
      expect([atOf(await onDisk() as never, ids), valuesOf_(await onDisk() as never, ids)]).toEqual([ids.pick, ['feature=checkout']]);
    });

    // (P-111, rewritten: owner ruling Back keeps it — was "a Back that clears {feature}" with backTo; a Jump onto its giving step clears it.)
    it('journal replay: a Jump that clears {feature}, kept while no write commits (the tab dies), is there after a reload', async () => {
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      env.state.hangWrites = true;
      expect(store.getState().jumpTo(ids.runId, { path: [ids.pick] }).ok).toBe(true);
      await tick(30);
      const data = store.getState().data;
      env.state.hangWrites = false;
      store = await reload();
      expect(store.getState().data).toEqual(data);
      expect([atOf(data as never, ids), valuesOf_(data as never, ids)]).toEqual([ids.pick, []]);
      expect(env.ls.has('wanderment:journal')).toBe(false);
      expect(await onDisk()).toEqual(data);
    });

    it('the localStorage fallback keeps a value cleared by a move and a step made a call, and moves them into SQLite once it can', async () => {
      env.state.openError = new Error('no OPFS');
      fakeLocks();
      let store = await load();
      const ids = build(store);
      expect(store.getState().jumpTo(ids.runId, { path: [ids.env] }).ok).toBe(true);
      expect(store.getState().editRoutine(ids.iterate, { kind: 'toCall', item: ids.at, routine: ids.doc }).ok).toBe(true);
      await tick(30);
      const data = store.getState().data;
      const blob = JSON.parse(env.ls.get('wanderment')!).state.data;
      expect(valuesOf_(blob, ids)).toEqual([]);
      expect(itemsOf(blob, ids.iterate)[3]).toEqual({ id: ids.at, ref: ids.doc, words: 'Document Iteration' });
      store = await reload();
      expect(store.getState().data).toEqual(data);
      env.state.openError = undefined;
      store = await reload();
      expect(store.getState().storage).toEqual(READY);
      expect(store.getState().data).toEqual(data);
      expect(await onDisk()).toEqual(data);
    });

    it('hand-over with a take-back: a Jump back that cleared {feature}, still only in the journal when hidden, stays on top of another page’s step added to the routine; the other page’s step is taken', async () => {
      fakeLocks();
      const store = await load();
      const ids = build(store);
      await tick(30);
      writeGate = deferred();
      expect(store.getState().jumpTo(ids.runId, { path: [ids.env] }).ok).toBe(true);
      await tick(0);
      expect(store.getState().nextStep(ids.runId).ok).toBe(true);
      await tick(0);
      page.hide();
      writeGate.open();
      writeGate = undefined;
      await tick(30);
      expect(JSON.parse(env.ls.get('wanderment:journal')!).changes.upsertRuns.map((r: { id: string }) => r.id)).toEqual([ids.runId]);
      const mine = store.getState().data.runs[ids.runId];
      const { editRoutine } = await import('@/domain/run');
      const other = editRoutine(await onDisk(), ids.iterate, { kind: 'addStep', text: 'Ship it' }, { now: '2026-11-28T12:00:00.000Z', id: () => 'other-page-step' });
      expect(other.ok).toBe(true);
      const { nodeDb } = await import('./nodeDb');
      const { saveChanges } = await import('./repository');
      const db = nodeDb(env.state.dbPath);
      await saveChanges(db, { upsertRoutines: [other.data.routines[ids.iterate]] } as never);
      db.close();
      page.show();
      await tick(100);
      expect(store.getState().storage).toEqual(READY);
      expect(store.getState().data.runs[ids.runId]).toEqual(mine);
      expect(valuesOf_(store.getState().data as never, ids)).toEqual([]);
      expect(itemsOf(store.getState().data as never, ids.iterate).map((i) => i.id)).toContain('other-page-step');
      expect(await onDisk()).toEqual(store.getState().data);
      expect((await reload()).getState().data).toEqual(store.getState().data);
    });

    it('undo of "Make it a call" and of a kept list reordered mid-sitting: taken back on screen and on disk; the reorder drops no item not yet done, after a reload too', async () => {
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      let before = store.getState().data;
      expect(store.getState().editRoutine(ids.iterate, { kind: 'toCall', item: ids.at, routine: ids.doc }).ok).toBe(true);
      await tick(30);
      expect(itemsOf(await onDisk(), ids.iterate)[3]).toEqual({ id: ids.at, ref: ids.doc, words: 'Document Iteration' });
      expect(store.getState().undoLast()).toBe(true);
      await tick(30);
      expect(await onDisk()).toEqual(before);
      // A kept list, gone through: on "c" of a, b, c, d, reordered d, c, a, b in Plan — d still comes round.
      const g = () => store.getState();
      expect(g().pauseRun(ids.runId).ok).toBe(true);
      const made = g().createRoutine('Practise');
      if (!made.ok || !made.routineId) throw new Error('New: was refused');
      const practise = made.routineId;
      expect(g().editRoutine(practise, { kind: 'addEach', item: 'x', list: 'xs', own: 'kept' }).ok).toBe(true);
      const kept = (itemsOf(g().data, practise)[0] as { ref: string }).ref;
      expect(g().editRoutine(kept, { kind: 'keptList', items: ['a', 'b', 'c', 'd'] }).ok).toBe(true);
      expect(g().editRoutine(kept, { kind: 'addStep', text: 'Practise {x}' }).ok).toBe(true);
      const started = g().startRoutine(practise);
      if (!started.ok || !started.runId) throw new Error('Start was refused');
      const run2 = started.runId;
      expect([g().nextStep(run2).ok, g().nextStep(run2).ok]).toEqual([true, true]);
      const { runnerView } = await import('@/domain/runView');
      const words = () => runnerView(store.getState().data, run2)!.step.parts.map((p) => ('text' in p ? p.text : `{${p.name}}`)).join('');
      expect(words()).toBe('Practise c');
      before = g().data;
      expect(g().editRoutine(kept, { kind: 'keptList', items: ['d', 'c', 'a', 'b'] }).ok).toBe(true);
      await tick(30);
      expect(g().undoLast()).toBe(true);
      await tick(30);
      expect(await onDisk()).toEqual(before);
      expect(g().editRoutine(kept, { kind: 'keptList', items: ['d', 'c', 'a', 'b'] }).ok).toBe(true);
      expect(g().nextStep(run2).ok).toBe(true);
      await tick(30);
      store = await reload();
      expect(words()).toBe('Practise d');
      // Past d, a and b (done before the reorder) never come round again: the sitting is over.
      expect(store.getState().nextStep(run2).ok).toBe(true);
      expect(store.getState().data.runs[run2].endedAt).toBeDefined();
    });

    it('export → import: a run stored before P-110 with a value given ahead of its giving step is imported exactly, read without writing (not shown), kept by a Next that reaches its giving step, and cleared by a Jump past it — through the journal and out again', async () => {
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const { toBackup } = await import('@/domain/backup');
      const { previewImport, confirmImport } = await import('@/store/importBackup');
      const file = JSON.parse(toBackup(store.getState().data));
      // As the build before left it (p110-old-build.json "jumpedBack"): asked at the reader, then Jumped back before both.
      file.data.runs[ids.runId].frames = [{ seq: ids.iterate, at: ids.env, round: 1 }];
      file.data.runs[ids.runId].values = [{ name: 'feature', items: ['checkout'], level: 0, seq: ids.iterate, item: ids.env, words: 'Envision how I’d expect {feature} to work', at: '2026-11-28T01:00:01.000Z', later: { x: 1 } }];
      file.data.runs[ids.runId].status = 'paused';
      expect(confirmImport(previewImport(JSON.stringify(file))).ok).toBe(true);
      await tick(30);
      store = await reload();
      expect(store.getState().data).toEqual(file.data);
      const { runnerView } = await import('@/domain/runView');
      expect(runnerView(store.getState().data, ids.runId)!.values).toEqual([]);
      expect(runnerView(store.getState().data, ids.runId)!.fields).toEqual([]);
      expect(await onDisk()).toEqual(file.data);
      env.state.hangWrites = true;
      expect(store.getState().resumeRun(ids.runId).ok).toBe(true);
      expect(store.getState().nextStep(ids.runId).ok).toBe(true);
      await tick(30);
      env.state.hangWrites = false;
      store = await reload();
      expect(runnerView(store.getState().data, ids.runId)!.fields).toEqual([{ name: 'feature', text: 'checkout', gives: true }]);
      expect((store.getState().data.runs[ids.runId].values as Record<string, unknown>[])[0]).toMatchObject({ later: { x: 1 } });
      expect(JSON.parse(toBackup(store.getState().data)).data).toEqual(store.getState().data);
      // Back again, then a Jump past it without reaching it: cleared, said.
      store.setState({ data: file.data });
      await tick(30);
      expect(store.getState().resumeRun(ids.runId).ok).toBe(true);
      expect(store.getState().jumpTo(ids.runId, { path: [ids.build] }).ok).toBe(true);
      expect(store.getState().runNotice?.text).toContain('Cleared {feature}');
      await tick(30);
      expect(valuesOf_(await onDisk() as never, ids)).toEqual([]);
    });
  });

  // ───────── P-100: home is one queue ─────────

  // ───────── P-99: In any order — parts as threads, joined ─────────

  describe('P-99: an In any order block, each part’s place and values, what ended how, and the join survive reload, journal replay, the fallback, hand-over, undo, export and import — a record of parts this version cannot read is kept', () => {
    type Ids = { hands: string; block: string; row: string; gesture: string; study: string; copy: string; sketch: string; runId: string };
    const itemsOf = (data: { routines: Record<string, Record<string, unknown>> }, id: string) => data.routines[id].items as Record<string, unknown>[];
    async function reload() {
      (await import('./persistence')).stopPersistence();
      page = fakePage();
      fakeLocks();
      const store = await load();
      await tick(30);
      return store;
    }
    /**
     * Through the store's actions, as a person would: New "Get better at hands"; "Warm up"; Add's "In any order" with the
     * parts Study, Master copy (gives {copies}), Gesture practice (broken down: Draw 10 hands, Draw 10 feet) and Sketch
     * from life (broken down: Find a model); "Compare {copies}" after it. Started; Next onto the block; Master copy taken
     * up, {copies} given, Next (it returned); Sketch taken up and Step out (stopped); Gesture taken up, Next (on Draw 10
     * feet); Study taken up (Gesture put down at Draw 10 feet).
     */
    function build(store: Store): Ids {
      const g = () => store.getState();
      const made = g().createRoutine('Get better at hands');
      if (!made.ok || !made.routineId) throw new Error('New: was refused');
      const hands = made.routineId;
      const all = [g().editRoutine(hands, { kind: 'addStep', text: 'Warm up' }), g().editRoutine(hands, { kind: 'addAny', parts: ['Study', 'Master copy', 'Gesture practice', 'Sketch from life'] })];
      const row = itemsOf(g().data, hands)[1] as { id: string; ref: string };
      const [study, copy, gesture, sketch] = itemsOf(g().data, row.ref).map((i) => i.id as string);
      all.push(g().editRoutine(row.ref, { kind: 'gives', item: copy, name: 'copies' }));
      all.push(g().editRoutine(row.ref, { kind: 'breakDown', item: gesture, steps: ['Draw 10 hands', 'Draw 10 feet'] }));
      all.push(g().editRoutine(row.ref, { kind: 'breakDown', item: sketch, steps: ['Find a model'] }));
      all.push(g().editRoutine(hands, { kind: 'addStep', text: 'Compare {copies}' }));
      const started = g().startRoutine(hands);
      if (!started.ok || !started.runId) throw new Error('Start was refused');
      const runId = started.runId;
      all.push(g().nextStep(runId), g().takeUpPart(runId, 0, copy), g().typeValue(runId, copy, 'copies', 'two Dürer hands'), g().nextStep(runId));
      all.push(g().takeUpPart(runId, 0, sketch), g().doneLevel(runId));
      all.push(g().takeUpPart(runId, 0, gesture), g().nextStep(runId), g().takeUpPart(runId, 0, study));
      expect(all.map((r) => r.ok)).toEqual(all.map(() => true));
      return { hands, block: row.ref, row: row.id, gesture, study, copy, sketch, runId };
    }
    const isAsBuilt = (data: { routines: Record<string, Record<string, unknown>>; runs: Record<string, Record<string, unknown>> }, ids: Ids) => {
      expect(data.routines[ids.block]).toMatchObject({ named: false, words: 'In any order', any: true });
      expect(itemsOf(data, ids.hands)[1]).toEqual({ id: ids.row, ref: ids.block });
      const run = data.runs[ids.runId] as { frames: { parts?: { row: string; list: Record<string, unknown>[] } }[] };
      expect(run.frames[1]).toMatchObject({ seq: ids.block, at: ids.study, from: ids.row });
      const list = run.frames[0].parts!.list;
      expect(run.frames[0].parts!.row).toBe(ids.row);
      expect(list.find((p) => p.item === ids.copy)).toMatchObject({ ended: 'finished', values: [{ name: 'copies', items: ['two Dürer hands'] }] });
      expect(list.find((p) => p.item === ids.sketch)).toMatchObject({ ended: 'stopped' });
      expect(list.find((p) => p.item === ids.gesture)).toMatchObject({ frames: [{ seq: ids.block, at: ids.gesture }, { at: expect.any(String) }] });
      expect(list.find((p) => p.item === ids.gesture)!.ended).toBeUndefined();
    };
    /** Where every part stands, as the tree view says it. */
    const tree = async (data: unknown, ids: Ids) => {
      const { partsTree } = await import('@/domain/runView');
      return partsTree(data as never, ids.runId).map((gr) => gr.parts.map((p) => [p.words, p.state, p.step?.map((x) => ('text' in x ? x.text : '')).join('') ?? null]));
    };
    const AS_BUILT = [
      [
        ['Study', 'here', 'Study'],
        ['Master copy', 'finished', null],
        ['Gesture practice', 'down', 'Draw 10 feet'],
        ['Sketch from life', 'stopped', null],
      ],
    ];

    it('reload: saved to SQLite as kept — the block, each part’s place, what ended how and what it gave — the same after a reload', async () => {
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const data = store.getState().data;
      isAsBuilt(data as never, ids);
      expect(await onDisk()).toEqual(data);
      store = await reload();
      expect(store.getState().data).toEqual(data);
      expect(await tree(store.getState().data, ids)).toEqual(AS_BUILT);
      // Each part keeps its own place, across the reload: Gesture is taken up where it was put down.
      expect(store.getState().takeUpPart(ids.runId, 0, ids.gesture).ok).toBe(true);
      await tick(30);
      store = await reload();
      const { runnerView } = await import('@/domain/runView');
      expect(runnerView(store.getState().data, ids.runId)!.step.words).toBe('Draw 10 feet');
      // Then Study puts it down again; the last two return: the step after the block reads what was joined.
      expect(store.getState().nextStep(ids.runId).ok).toBe(true);
      expect(store.getState().takeUpPart(ids.runId, 0, ids.study).ok).toBe(true);
      expect(store.getState().nextStep(ids.runId).ok).toBe(true);
      await tick(30);
      store = await reload();
      expect(runnerView(store.getState().data, ids.runId)!.step.parts.map((p) => ('text' in p ? p.text : '')).join('')).toBe('Compare two Dürer hands');
      expect(await onDisk()).toEqual(store.getState().data);
    });

    it('journal replay: kept while no write commits (the tab dies), all of it is there after a reload', async () => {
      fakeLocks();
      let store = await load();
      env.state.hangWrites = true;
      const ids = build(store);
      await tick(30);
      expect(await onDisk()).toMatchObject({ routines: {} });
      const data = store.getState().data;
      env.state.hangWrites = false;
      store = await reload();
      expect(store.getState().data).toEqual(data);
      isAsBuilt(store.getState().data as never, ids);
      expect(env.ls.has('wanderment:journal')).toBe(false);
      expect(await onDisk()).toEqual(data);
    });

    it('the localStorage fallback keeps it, and moves it into SQLite once it can', async () => {
      env.state.openError = new Error('no OPFS');
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const data = store.getState().data;
      isAsBuilt(JSON.parse(env.ls.get('wanderment')!).state.data, ids);
      store = await reload();
      expect(store.getState().storage).toEqual({ state: 'ready', kind: 'local' });
      expect(store.getState().data).toEqual(data);
      env.state.openError = undefined;
      store = await reload();
      expect(store.getState().storage).toEqual(READY);
      expect(store.getState().data).toEqual(data);
      expect(await onDisk()).toEqual(data);
    });

    it('hand-over with a take-back: a part taken up here, still only in the journal when hidden, stays on top of another page’s part added to the block; the other page’s is taken', async () => {
      fakeLocks();
      const store = await load();
      const ids = build(store);
      await tick(30);
      writeGate = deferred();
      expect(store.getState().takeUpPart(ids.runId, 0, ids.gesture).ok).toBe(true);
      await tick(0);
      expect(store.getState().takeUpPart(ids.runId, 0, ids.study).ok).toBe(true);
      await tick(0);
      page.hide();
      writeGate.open();
      writeGate = undefined;
      await tick(30);
      expect(JSON.parse(env.ls.get('wanderment:journal')!).changes.upsertRuns.map((r: { id: string }) => r.id)).toEqual([ids.runId]);
      const mine = store.getState().data.runs[ids.runId];

      const { editRoutine } = await import('@/domain/run');
      const other = editRoutine(await onDisk(), ids.block, { kind: 'addStep', text: 'Gesture from memory' }, { now: '2026-11-28T12:00:00.000Z', id: () => 'other-page-part' });
      expect(other.ok).toBe(true);
      const { nodeDb } = await import('./nodeDb');
      const { saveChanges } = await import('./repository');
      const db = nodeDb(env.state.dbPath);
      await saveChanges(db, { upsertRoutines: [other.data.routines[ids.block]] } as never);
      db.close();

      page.show();
      await tick(100);
      expect(store.getState().storage).toEqual(READY);
      expect(store.getState().data.runs[ids.runId]).toEqual(mine);
      expect(itemsOf(store.getState().data as never, ids.block).map((i) => i.text ?? i.ref)).toEqual(['Study', 'Master copy', expect.any(String), expect.any(String), 'Gesture from memory']);
      expect(store.getState().data.routines[ids.block]).toMatchObject({ any: true });
      expect((await tree(store.getState().data, ids))[0].map((p) => [p[0], p[1]])).toEqual([
        ['Study', 'here'],
        ['Master copy', 'finished'],
        ['Gesture practice', 'down'],
        ['Sketch from life', 'stopped'],
        ['Gesture from memory', 'new'],
      ]);
      expect(await onDisk()).toEqual(store.getState().data);
      expect((await reload()).getState().data).toEqual(store.getState().data);
    });

    it('undo of Add’s "In any order", of a part taken up (putting another down) and of Step out of the block: taken back on screen and on disk', async () => {
      fakeLocks();
      const store = await load();
      const ids = build(store);
      await tick(30);
      const before = store.getState().data;
      expect(store.getState().editRoutine(ids.hands, { kind: 'addAny' }).ok).toBe(true);
      await tick(30);
      expect(itemsOf(await onDisk(), ids.hands)).toHaveLength(4);
      expect(store.getState().undoLast()).toBe(true);
      await tick(30);
      expect(await onDisk()).toEqual(before);
      // Taking up Gesture puts Study down: one Undo brings both back as they were.
      expect(store.getState().takeUpPart(ids.runId, 0, ids.gesture).ok).toBe(true);
      expect(store.getState().runNotice?.text).toBe('Took up “Gesture practice”');
      await tick(30);
      expect(store.getState().undoLast()).toBe(true);
      await tick(30);
      expect(await onDisk()).toEqual(before);
      // Step out of the block from its row: the parts not returned stopped, the block passed — and taken back.
      expect(store.getState().backTo(ids.runId).ok).toBe(true);
      await tick(30);
      const onRow = store.getState().data;
      expect(store.getState().doneLevel(ids.runId).ok).toBe(true);
      expect(store.getState().runNotice?.text).toBe('Left In any order');
      await tick(30);
      expect(((await onDisk()).runs[ids.runId].frames as unknown[]).length).toBe(1);
      expect(store.getState().undoLast()).toBe(true);
      await tick(30);
      expect(await onDisk()).toEqual(onRow);
    });

    it('export → import: the block and the record of parts are in the backup, finished and stopped told apart; the same file is identical; a record this version cannot read is kept exactly through a move, a reload, the journal and another export', async () => {
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const exported = store.getState().data;
      const { toBackup } = await import('@/domain/backup');
      const { previewImport, confirmImport } = await import('@/store/importBackup');
      const json = toBackup(exported);
      const file = JSON.parse(json);
      isAsBuilt(file.data, ids);
      expect(previewImport(json).plan).toMatchObject({ identical: true });
      // As the file reads: the tree view the same, finished and stopped apart.
      expect(await tree(file.data, ids)).toEqual(AS_BUILT);
      // A later build's record (a part ended some other way): kept as stored, never written over; the run still reads.
      const later = { row: ids.row, list: [{ item: ids.copy, ended: 'merged' }] };
      file.data.runs[ids.runId].frames[0].parts = later;
      expect(confirmImport(previewImport(JSON.stringify(file))).ok).toBe(true);
      await tick(30);
      store = await reload();
      expect(store.getState().data).toEqual(file.data);
      const { readRun } = await import('@/domain/run');
      expect(readRun(store.getState().data, ids.runId)!.frames[0].parts).toEqual(later);
      // Nothing that would write over it is done: a part's end waits (said in words by the runner's refusal); a Jump keeps it.
      expect(store.getState().nextStep(ids.runId).ok).toBe(false);
      env.state.hangWrites = true;
      expect(store.getState().jumpTo(ids.runId, { path: [itemsOf(store.getState().data as never, ids.hands)[0].id as string] }).ok).toBe(true);
      await tick(30);
      env.state.hangWrites = false;
      store = await reload();
      const held = store.getState().data;
      expect((held.runs[ids.runId].frames as Record<string, unknown>[])[0]).toMatchObject({ parts: later });
      expect(JSON.parse(toBackup(held)).data).toEqual(held);
    });
  });

  describe('P-100: the queue order (a run’s `queue`) survives reload, journal replay, the fallback, hand-over, undo, export and import; runs stored with no order read oldest started first; nothing else is written', () => {
    async function reload() {
      (await import('./persistence')).stopPersistence();
      page = fakePage();
      fakeLocks();
      const store = await load();
      await tick(30);
      return store;
    }
    /** Through the store's actions: three routines, each started then paused, a few ms apart — A, B, C in that order. */
    async function build(store: Store): Promise<Record<'A' | 'B' | 'C', string>> {
      const g = () => store.getState();
      const out: Record<string, string> = {};
      for (const name of ['A', 'B', 'C']) {
        const made = g().createRoutine(`Routine ${name}`);
        if (!made.ok || !made.routineId) throw new Error('New: was refused');
        expect(g().editRoutine(made.routineId, { kind: 'addStep', text: `${name} first` }).ok).toBe(true);
        const started = g().startRoutine(made.routineId);
        if (!started.ok || !started.runId) throw new Error('Start was refused');
        expect(g().pauseRun(started.runId).ok).toBe(true);
        out[name] = started.runId;
        await tick(5);
      }
      return out as Record<'A' | 'B' | 'C', string>;
    }
    const order = async (data: Parameters<typeof import('@/domain/runView').homeQueue>[0]) => (await import('@/domain/runView')).homeQueue(data).map((t) => t.name);

    it('reload: a move is saved as it is made — only `queue` on the runs — and its Undo is taken back on disk too; a run started after it goes to the bottom', async () => {
      fakeLocks();
      let store = await load();
      const ids = await build(store);
      await tick(30);
      const before = await onDisk();
      expect(await order(before)).toEqual(['Routine A', 'Routine B', 'Routine C']);
      expect(Object.values(before.runs).some((r) => 'queue' in r)).toBe(false);
      expect(store.getState().moveInQueue(ids.C, 'top').ok).toBe(true);
      expect(store.getState().runNotice?.text).toBe('Moved “Routine C” to the top');
      await tick(30);
      const moved = await onDisk();
      expect(await order(moved)).toEqual(['Routine C', 'Routine A', 'Routine B']);
      for (const id of Object.keys(before.runs)) {
        const { queue: _q, ...rest } = moved.runs[id];
        expect(rest).toEqual(before.runs[id]);
      }
      expect(moved.routines).toEqual(before.routines);
      store = await reload();
      expect(await order(store.getState().data)).toEqual(['Routine C', 'Routine A', 'Routine B']);
      expect(store.getState().moveInQueue(ids.A, 1).ok).toBe(true);
      expect(store.getState().undoLast()).toBe(true);
      await tick(30);
      expect(await onDisk()).toEqual(moved);
      const made = store.getState().createRoutine('Routine D');
      if (!made.ok || !made.routineId) throw new Error('New: was refused');
      expect(store.getState().editRoutine(made.routineId, { kind: 'addStep', text: 'D first' }).ok).toBe(true);
      expect(store.getState().startRoutine(made.routineId).ok).toBe(true);
      await tick(30);
      store = await reload();
      expect(await order(store.getState().data)).toEqual(['Routine C', 'Routine A', 'Routine B', 'Routine D']);
    });

    it('journal replay: a move kept while no write commits (the tab dies) is there after a reload', async () => {
      fakeLocks();
      let store = await load();
      const ids = await build(store);
      await tick(30);
      env.state.hangWrites = true;
      expect(store.getState().moveInQueue(ids.B, -1).ok).toBe(true);
      await tick(30);
      const data = store.getState().data;
      env.state.hangWrites = false;
      store = await reload();
      expect(store.getState().data).toEqual(data);
      expect(await order(data)).toEqual(['Routine B', 'Routine A', 'Routine C']);
      expect(env.ls.has('wanderment:journal')).toBe(false);
      expect(await onDisk()).toEqual(data);
    });

    it('the localStorage fallback keeps the order, and moves it into SQLite once it can', async () => {
      env.state.openError = new Error('no OPFS');
      fakeLocks();
      let store = await load();
      const ids = await build(store);
      expect(store.getState().moveInQueue(ids.C, -2).ok).toBe(true);
      await tick(30);
      const data = store.getState().data;
      const blob = JSON.parse(env.ls.get('wanderment')!).state.data;
      expect(await order(blob)).toEqual(['Routine C', 'Routine A', 'Routine B']);
      store = await reload();
      expect(store.getState().data).toEqual(data);
      env.state.openError = undefined;
      store = await reload();
      expect(store.getState().storage).toEqual(READY);
      expect(store.getState().data).toEqual(data);
      expect(await onDisk()).toEqual(data);
    });

    it('hand-over with a take-back: a move still only in the journal when hidden stays on top of another page’s change; the other page’s change is taken', async () => {
      fakeLocks();
      const store = await load();
      const ids = await build(store);
      await tick(30);
      writeGate = deferred();
      expect(store.getState().moveInQueue(ids.C, 'top').ok).toBe(true);
      await tick(0);
      expect(store.getState().moveInQueue(ids.A, 1).ok).toBe(true);
      await tick(0);
      page.hide();
      writeGate.open();
      writeGate = undefined;
      await tick(30);
      expect(JSON.parse(env.ls.get('wanderment:journal')!).changes.upsertRuns.map((r: { id: string }) => r.id).sort()).toEqual([ids.A, ids.B].sort());
      const mine = store.getState().data.runs;
      const routineA = store.getState().data.runs[ids.A].routineId as string;
      const { editRoutine } = await import('@/domain/run');
      const other = editRoutine(await onDisk(), routineA, { kind: 'addStep', text: 'A second' }, { now: '2026-11-28T12:00:00.000Z', id: () => 'other-page-step' });
      expect(other.ok).toBe(true);
      const { nodeDb } = await import('./nodeDb');
      const { saveChanges } = await import('./repository');
      const db = nodeDb(env.state.dbPath);
      await saveChanges(db, { upsertRoutines: [other.data.routines[routineA]] } as never);
      db.close();
      page.show();
      await tick(100);
      expect(store.getState().storage).toEqual(READY);
      expect(store.getState().data.runs).toEqual(mine);
      expect(await order(store.getState().data)).toEqual(['Routine C', 'Routine B', 'Routine A']);
      expect((store.getState().data.routines[routineA].items as { id: string }[]).map((i) => i.id)).toContain('other-page-step');
      expect(await onDisk()).toEqual(store.getState().data);
      expect((await reload()).getState().data).toEqual(store.getState().data);
    });

    it('export → import: the order goes out and comes back exactly; a backup with no order (from before P-100) reads oldest started first and is imported without a `queue` written', async () => {
      fakeLocks();
      let store = await load();
      const ids = await build(store);
      expect(store.getState().moveInQueue(ids.C, 'top').ok).toBe(true);
      expect(store.getState().moveInQueue(ids.B, -1).ok).toBe(true);
      await tick(30);
      const { toBackup } = await import('@/domain/backup');
      const { previewImport, confirmImport } = await import('@/store/importBackup');
      const file = JSON.parse(toBackup(store.getState().data));
      expect(await order(file.data)).toEqual(['Routine C', 'Routine B', 'Routine A']);
      // From before P-100: the same runs, no order stored.
      const old = JSON.parse(JSON.stringify(file));
      for (const r of Object.values(old.data.runs) as Record<string, unknown>[]) delete r.queue;
      expect(confirmImport(previewImport(JSON.stringify(old))).ok).toBe(true);
      await tick(30);
      store = await reload();
      expect(store.getState().data).toEqual(old.data);
      expect(await order(store.getState().data)).toEqual(['Routine A', 'Routine B', 'Routine C']);
      expect(await onDisk()).toEqual(old.data);
      expect(confirmImport(previewImport(JSON.stringify(file))).ok).toBe(true);
      await tick(30);
      store = await reload();
      expect(store.getState().data).toEqual(file.data);
      expect(await order(await onDisk())).toEqual(['Routine C', 'Routine B', 'Routine A']);
      expect(JSON.parse(toBackup(store.getState().data)).data).toEqual(file.data);
    });
  });

  // ───────── F-1: who gave each item of a list ─────────
  describe('F-1: who gave each item of a list (`givers`) — collected by a for each, joined by an In any order block — and the parts Back puts down survive reload, journal replay, the fallback, undo, export and import; givers an older build left out of line are read as none and nothing is rewritten', () => {
    type Ids = { drawing: string; block: string; row: string; find: string; draw: string; runId: string };
    const itemsOf = (data: { routines: Record<string, Record<string, unknown>> }, id: string) => data.routines[id].items as Record<string, unknown>[];
    async function reload() {
      (await import('./persistence')).stopPersistence();
      page = fakePage();
      fakeLocks();
      const store = await load();
      await tick(30);
      return store;
    }
    /**
     * Through the store's actions, as a person would: New "Drawing practice"; "Find reference photos" gives {photos};
     * "Warm up the hand" gives {drawing}; Add's "For each…" makes "For each photo in {photos}", inside it "Draw {photo}"
     * gives {drawing}; "Rank the {drawing}" after it. Started: two photos, "warm-up", "dancer sketch", "boxer sketch" —
     * the run on "Rank": one list of three, given by three givers.
     */
    function build(store: Store): Ids {
      const g = () => store.getState();
      const made = g().createRoutine('Drawing practice');
      if (!made.ok || !made.routineId) throw new Error('New: was refused');
      const drawing = made.routineId;
      const all = [g().editRoutine(drawing, { kind: 'addStep', text: 'Find reference photos' }), g().editRoutine(drawing, { kind: 'addStep', text: 'Warm up the hand' })];
      const [find, warm] = itemsOf(g().data, drawing).map((i) => i.id as string);
      all.push(g().editRoutine(drawing, { kind: 'gives', item: find, name: 'photos' }), g().editRoutine(drawing, { kind: 'gives', item: warm, name: 'drawing' }), g().editRoutine(drawing, { kind: 'addEach', item: 'photo', list: 'photos' }));
      const row = itemsOf(g().data, drawing)[2] as { id: string; ref: string };
      all.push(g().editRoutine(row.ref, { kind: 'addStep', text: 'Draw {photo}' }));
      const draw = itemsOf(g().data, row.ref)[0].id as string;
      all.push(g().editRoutine(row.ref, { kind: 'gives', item: draw, name: 'drawing' }), g().editRoutine(drawing, { kind: 'addStep', text: 'Rank the {drawing}' }));
      const started = g().startRoutine(drawing);
      if (!started.ok || !started.runId) throw new Error('Start was refused');
      const runId = started.runId;
      all.push(g().typeList(runId, find, 'photos', ['the dancer', 'the boxer']), g().nextStep(runId));
      all.push(g().typeValue(runId, warm, 'drawing', 'warm-up'), g().nextStep(runId));
      all.push(g().typeValue(runId, draw, 'drawing', 'dancer sketch'), g().nextStep(runId));
      all.push(g().typeValue(runId, draw, 'drawing', 'boxer sketch'), g().nextStep(runId));
      expect(all.map((r) => r.ok)).toEqual(all.map(() => true));
      return { drawing, block: row.ref, row: row.id, find, draw, runId };
    }
    const isAsBuilt = (data: { runs: Record<string, Record<string, unknown>> }, ids: Ids) => {
      const values = data.runs[ids.runId].values as { name: string; items: string[]; level: number; givers?: unknown[] }[];
      const drawn = values.find((v) => v.name === 'drawing')!;
      expect([drawn.items, drawn.level]).toEqual([['warm-up', 'dancer sketch', 'boxer sketch'], 0]);
      expect(drawn.givers).toEqual([null, { by: `${ids.row}#0`, item: ids.draw }, { by: `${ids.row}#1`, item: ids.draw }]);
    };
    const words = async (data: unknown, ids: Ids) => {
      const { runnerView } = await import('@/domain/runView');
      const v = runnerView(data as never, ids.runId)!;
      return { step: v.step.parts.map((p) => ('text' in p ? p.text : `{${p.name}}`)).join(''), field: v.fields.find((f) => f.name === 'drawing')?.text };
    };
    /** Back into the loop, Back to the first photo, its drawing redone, on to "Rank": one list, the first photo's share replaced. */
    const redo = (store: Store, ids: Ids) => {
      const g = () => store.getState();
      const all = [g().backTo(ids.runId), g().backTo(ids.runId), g().typeValue(ids.runId, ids.draw, 'drawing', 'dancer redrawn'), g().nextStep(ids.runId), g().nextStep(ids.runId)];
      expect(all.map((r) => r.ok)).toEqual(all.map(() => true));
    };

    it('reload: saved to SQLite with who gave each item — the same after a reload, and Back into the loop reads each photo’s drawing from it', async () => {
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const data = store.getState().data;
      isAsBuilt(data as never, ids);
      expect(await words(data, ids)).toMatchObject({ step: 'Rank the warm-up, dancer sketch and boxer sketch' });
      expect(await onDisk()).toEqual(data);
      store = await reload();
      expect(store.getState().data).toEqual(data);
      expect(store.getState().backTo(ids.runId).ok).toBe(true);
      expect(await words(store.getState().data, ids)).toEqual({ step: 'Draw the boxer', field: 'boxer sketch' });
      // Back writes no value (the round's drawing is read from the list in place).
      expect(store.getState().data.runs[ids.runId].values).toEqual(data.runs[ids.runId].values);
      expect(store.getState().backTo(ids.runId).ok).toBe(true);
      expect(await words(store.getState().data, ids)).toEqual({ step: 'Draw the dancer', field: 'dancer sketch' });
      await tick(30);
      store = await reload();
      expect(await words(store.getState().data, ids)).toEqual({ step: 'Draw the dancer', field: 'dancer sketch' });
      const g = () => store.getState();
      expect([g().typeValue(ids.runId, ids.draw, 'drawing', 'dancer redrawn'), g().nextStep(ids.runId), g().nextStep(ids.runId)].map((r) => r.ok)).toEqual([true, true, true]);
      expect(await words(store.getState().data, ids)).toMatchObject({ step: 'Rank the warm-up, dancer redrawn and boxer sketch' });
      await tick(30);
      expect(await onDisk()).toEqual(store.getState().data);
      store = await reload();
      expect(await words(store.getState().data, ids)).toMatchObject({ step: 'Rank the warm-up, dancer redrawn and boxer sketch' });
    });

    it('journal replay: kept while no write commits (the tab dies), all of it is there after a reload', async () => {
      fakeLocks();
      let store = await load();
      env.state.hangWrites = true;
      const ids = build(store);
      redo(store, ids);
      await tick(30);
      expect(await onDisk()).toMatchObject({ routines: {} });
      const data = store.getState().data;
      env.state.hangWrites = false;
      store = await reload();
      expect(store.getState().data).toEqual(data);
      expect(await words(store.getState().data, ids)).toMatchObject({ step: 'Rank the warm-up, dancer redrawn and boxer sketch' });
      expect(env.ls.has('wanderment:journal')).toBe(false);
      expect(await onDisk()).toEqual(data);
    });

    it('the localStorage fallback keeps it, and moves it into SQLite once it can', async () => {
      env.state.openError = new Error('no OPFS');
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const data = store.getState().data;
      isAsBuilt(JSON.parse(env.ls.get('wanderment')!).state.data, ids);
      store = await reload();
      expect(store.getState().storage).toEqual({ state: 'ready', kind: 'local' });
      expect(store.getState().data).toEqual(data);
      env.state.openError = undefined;
      store = await reload();
      expect(store.getState().storage).toEqual(READY);
      expect(store.getState().data).toEqual(data);
      expect(await onDisk()).toEqual(data);
    });

    it('undo of a Jump forward out of the loop (it collected the round it was in): taken back on screen and on disk', async () => {
      fakeLocks();
      const store = await load();
      const ids = build(store);
      expect(store.getState().backTo(ids.runId).ok).toBe(true);
      expect(store.getState().typeValue(ids.runId, ids.draw, 'drawing', 'boxer redrawn').ok).toBe(true);
      await tick(30);
      const before = store.getState().data;
      const rank = itemsOf(before as never, ids.drawing)[3].id as string;
      expect(store.getState().jumpTo(ids.runId, { path: [rank] }).ok).toBe(true);
      expect(await words(store.getState().data, ids)).toMatchObject({ step: 'Rank the warm-up, dancer sketch and boxer redrawn' });
      await tick(30);
      expect(await onDisk()).toEqual(store.getState().data);
      expect(store.getState().undoLast()).toBe(true);
      await tick(30);
      expect(store.getState().data).toEqual(before);
      expect(await onDisk()).toEqual(before);
    });

    it('export → import: who gave each item goes out and comes back exactly, and Back reads from it after the import', async () => {
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const { toBackup } = await import('@/domain/backup');
      const { previewImport, confirmImport } = await import('@/store/importBackup');
      const json = toBackup(store.getState().data);
      const file = JSON.parse(json);
      isAsBuilt(file.data, ids);
      expect(previewImport(json).plan).toMatchObject({ identical: true });
      // Into an emptied app: the same data, after a reload.
      expect(store.getState().replaceData((await import('@/domain/types')).emptyData())).toBe(true);
      await tick(30);
      expect(confirmImport(previewImport(json)).ok).toBe(true);
      await tick(30);
      store = await reload();
      expect(store.getState().data).toEqual(file.data);
      expect(store.getState().backTo(ids.runId).ok).toBe(true);
      expect(await words(store.getState().data, ids)).toEqual({ step: 'Draw the boxer', field: 'boxer sketch' });
    });

    it('givers an older build left out of line with the items (it added one without them) load as stored, are not read, and nothing is written', async () => {
      fakeLocks();
      let store = await load();
      const ids = build(store);
      await tick(30);
      const data = JSON.parse(JSON.stringify(store.getState().data));
      const drawn = (data.runs[ids.runId].values as { name: string; items: string[] }[]).find((v) => v.name === 'drawing')!;
      drawn.items.push('an older build’s sketch');
      const { nodeDb } = await import('./nodeDb');
      const { saveChanges } = await import('./repository');
      const db = nodeDb(env.state.dbPath);
      await saveChanges(db, { upsertRuns: [data.runs[ids.runId]] } as never);
      db.close();
      store = await reload();
      expect(store.getState().data).toEqual(data);
      expect(await onDisk()).toEqual(data);
      expect(await words(store.getState().data, ids)).toMatchObject({ step: 'Rank the warm-up, dancer sketch, boxer sketch and an older build’s sketch' });
      // Back into the loop: nothing is read from them (the round's field is empty), and nothing is lost.
      expect(store.getState().backTo(ids.runId).ok).toBe(true);
      expect(await words(store.getState().data, ids)).toEqual({ step: 'Draw the boxer', field: '' });
      expect(store.getState().nextStep(ids.runId).ok).toBe(true);
      expect(await words(store.getState().data, ids)).toMatchObject({ step: 'Rank the warm-up, dancer sketch, boxer sketch and an older build’s sketch' });
    });

    it('In any order: Back onto the block’s row puts each part down with what it gave; saved, the same after a reload, and passing it again replaces the join', async () => {
      fakeLocks();
      let store = await load();
      const g = () => store.getState();
      const made = g().createRoutine('Hands');
      if (!made.ok || !made.routineId) throw new Error('New: was refused');
      const hands = made.routineId;
      const all = [g().editRoutine(hands, { kind: 'addAny', parts: ['Study', 'Master copy'] }), g().editRoutine(hands, { kind: 'addStep', text: 'Compare {copies}' })];
      const row = itemsOf(g().data, hands)[0] as { id: string; ref: string };
      const [study, copy] = itemsOf(g().data, row.ref).map((i) => i.id as string);
      all.push(g().editRoutine(row.ref, { kind: 'gives', item: study, name: 'copies' }), g().editRoutine(row.ref, { kind: 'gives', item: copy, name: 'copies' }));
      const started = g().startRoutine(hands);
      if (!started.ok || !started.runId) throw new Error('Start was refused');
      const runId = started.runId;
      all.push(g().takeUpPart(runId, 0, study), g().typeValue(runId, study, 'copies', 'a study'), g().nextStep(runId));
      all.push(g().takeUpPart(runId, 0, copy), g().typeValue(runId, copy, 'copies', 'a copy'), g().nextStep(runId));
      all.push(g().backTo(runId));
      expect(all.map((r) => r.ok)).toEqual(all.map(() => true));
      await tick(30);
      const data = g().data;
      const parts = (data.runs[runId].frames as { parts?: { list: { item: string; values?: { items: string[] }[] }[] } }[])[0].parts!;
      expect(parts.list.map((p) => [p.item, p.values?.map((v) => v.items)])).toEqual([
        [study, [['a study']]],
        [copy, [['a copy']]],
      ]);
      expect(await onDisk()).toEqual(data);
      store = await reload();
      expect(store.getState().data).toEqual(data);
      const { runnerView } = await import('@/domain/runView');
      expect(store.getState().takeUpPart(runId, 0, copy).ok).toBe(true);
      expect(runnerView(store.getState().data, runId)!.fields.find((f) => f.name === 'copies')?.text).toBe('a copy');
      expect([store.getState().typeValue(runId, copy, 'copies', 'a better copy'), store.getState().nextStep(runId), store.getState().doneLevel(runId)].map((r) => r.ok)).toEqual([true, true, true]);
      const step = runnerView(store.getState().data, runId)!.step.parts.map((p) => ('text' in p ? p.text : `{${p.name}}`)).join('');
      expect(step).toBe('Compare a study and a better copy');
      await tick(30);
      expect(await onDisk()).toEqual(store.getState().data);
    });
  });

  // ───────── F-3: the four owner-ruled fixes held by older tests ─────────
  describe('F-3: Back across a round, a call removed in Plan while inside it, a `queue` this version cannot read, and Resume into a call survive reload and export → import', () => {
    async function reload() {
      (await import('./persistence')).stopPersistence();
      page = fakePage();
      fakeLocks();
      const store = await load();
      await tick(30);
      return store;
    }
    const itemsOf = (data: { routines: Record<string, Record<string, unknown>> }, id: string) => data.routines[id].items as { id: string; ref?: string }[];
    const valuesOf = (data: { runs: Record<string, Record<string, unknown>> }, runId: string) =>
      (data.runs[runId].values as { name: string; items: string[]; level: number }[]).map((v) => `${v.level}:${v.name}=${v.items.join('|')}`).sort();
    const made = (store: Store, name: string) => {
      const r = store.getState().createRoutine(name);
      if (!r.ok || !r.routineId) throw new Error('New: was refused');
      return r.routineId;
    };
    const begun = (store: Store, routineId: string) => {
      const r = store.getState().startRoutine(routineId);
      if (!r.ok || !r.runId) throw new Error('Start was refused');
      return r.runId;
    };

    it('Back across a "Repeat from here" round (owner: "Keeps across rounds"): the new round’s value is saved and the same after a reload', async () => {
      fakeLocks();
      let store = await load();
      const g = () => store.getState();
      const loop = made(store, 'Feature loop');
      const all = [g().editRoutine(loop, { kind: 'addStep', text: 'Set up' }), g().editRoutine(loop, { kind: 'addStep', text: 'Pick a feature' }), g().editRoutine(loop, { kind: 'addStep', text: 'Test {feature}' })];
      const pick = itemsOf(g().data, loop)[1].id;
      all.push(g().editRoutine(loop, { kind: 'gives', item: pick, name: 'feature' }), g().editRoutine(loop, { kind: 'divider', from: 1 }));
      const runId = begun(store, loop);
      all.push(g().nextStep(runId), g().typeValue(runId, pick, 'feature', 'login'), g().nextStep(runId), g().nextStep(runId));
      all.push(g().typeValue(runId, pick, 'feature', 'signup'), g().backTo(runId));
      expect(all.map((r) => r.ok)).toEqual(all.map(() => true));
      expect(g().undo).toBeUndefined();
      await tick(30);
      const data = g().data;
      expect((data.runs[runId].frames as { round: number }[])[0].round).toBe(1);
      expect(valuesOf(data as never, runId)).toEqual(['0:feature=signup']);
      expect(await onDisk()).toEqual(data);
      store = await reload();
      expect(store.getState().data).toEqual(data);
    });

    it('a call removed in Plan while the run is inside it (owner: "A Plan edit never clears a run’s values"): its value is handed back, saved, and the same after a reload and export → import', async () => {
      fakeLocks();
      let store = await load();
      const g = () => store.getState();
      const callee = made(store, 'Find a reference');
      const main = made(store, 'Draw from life');
      const all = [g().editRoutine(callee, { kind: 'addStep', text: 'Find one' }), g().editRoutine(callee, { kind: 'addStep', text: 'Save it' })];
      const find = itemsOf(g().data, callee)[0].id;
      all.push(g().editRoutine(callee, { kind: 'gives', item: find, name: 'ref' }), g().editRoutine(main, { kind: 'addCall', routine: callee }), g().editRoutine(main, { kind: 'addStep', text: 'Draw {ref}' }));
      const row = itemsOf(g().data, main)[0].id;
      const runId = begun(store, main);
      all.push(g().stepIn(runId), g().typeValue(runId, find, 'ref', 'the dancer'), g().editRoutine(main, { kind: 'remove', item: row }));
      expect(all.map((r) => r.ok)).toEqual(all.map(() => true));
      await tick(30);
      const data = g().data;
      expect(valuesOf(data as never, runId)).toEqual(['0:ref=the dancer']);
      expect(await onDisk()).toEqual(data);
      store = await reload();
      expect(store.getState().data).toEqual(data);
      const { runnerView } = await import('@/domain/runView');
      expect(runnerView(store.getState().data, runId)!.step.parts.map((p) => ('text' in p ? p.text : `{${p.name}}`)).join('')).toBe('Draw the dancer');
      const { toBackup } = await import('@/domain/backup');
      const { previewImport, confirmImport } = await import('@/store/importBackup');
      const file = toBackup(store.getState().data);
      expect(store.getState().replaceData((await import('@/domain/types')).emptyData())).toBe(true);
      expect(confirmImport(previewImport(file)).ok).toBe(true);
      await tick(30);
      store = await reload();
      expect(store.getState().data).toEqual(data);
    });

    it('a `queue` this version cannot read is kept on disk when another row moves, its own move is refused with nothing written, and it goes out and comes back through export → import', async () => {
      fakeLocks();
      let store = await load();
      const ids: string[] = [];
      for (const name of ['A', 'B', 'C']) {
        const routine = made(store, `Routine ${name}`);
        expect(store.getState().editRoutine(routine, { kind: 'addStep', text: `${name} first` }).ok).toBe(true);
        const runId = begun(store, routine);
        expect(store.getState().pauseRun(runId).ok).toBe(true);
        ids.push(runId);
        await tick(5);
      }
      await tick(30);
      // A newer build stored A's place in the queue in a shape this one cannot read.
      const odd = JSON.parse(JSON.stringify(store.getState().data));
      odd.runs[ids[0]].queue = { lane: 'work', n: 2 };
      const { nodeDb } = await import('./nodeDb');
      const { saveChanges } = await import('./repository');
      const db = nodeDb(env.state.dbPath);
      await saveChanges(db, { upsertRuns: [odd.runs[ids[0]]] } as never);
      db.close();
      store = await reload();
      expect(store.getState().data).toEqual(odd);
      expect(store.getState().moveInQueue(ids[2], 'top').ok).toBe(true);
      await tick(30);
      expect((await onDisk()).runs[ids[0]].queue).toEqual({ lane: 'work', n: 2 });
      const before = await onDisk();
      expect(store.getState().moveInQueue(ids[0], 1).ok).toBe(false);
      await tick(30);
      expect(await onDisk()).toEqual(before);
      store = await reload();
      expect(store.getState().data.runs[ids[0]].queue).toEqual({ lane: 'work', n: 2 });
      const { toBackup } = await import('@/domain/backup');
      const { previewImport, confirmImport } = await import('@/store/importBackup');
      const file = toBackup(store.getState().data);
      expect(JSON.parse(file).data.runs[ids[0]].queue).toEqual({ lane: 'work', n: 2 });
      expect(store.getState().replaceData((await import('@/domain/types')).emptyData())).toBe(true);
      expect(confirmImport(previewImport(file)).ok).toBe(true);
      await tick(30);
      store = await reload();
      expect(store.getState().data.runs[ids[0]].queue).toEqual({ lane: 'work', n: 2 });
    });

    it('home’s Resume at a call not stepped into (owner: "Step into the first step"): inside the call, the pause note kept, saved and the same after a reload', async () => {
      fakeLocks();
      let store = await load();
      const g = () => store.getState();
      const callee = made(store, 'Vibe check');
      const main = made(store, 'MyStack');
      const all = [g().editRoutine(callee, { kind: 'addStep', text: 'Feel it out' }), g().editRoutine(main, { kind: 'addStep', text: 'Warm up' }), g().editRoutine(main, { kind: 'addCall', routine: callee })];
      const runId = begun(store, main);
      all.push(g().nextStep(runId), g().pauseRun(runId, 'Left off here'), g().resumeRun(runId, false, true));
      expect(all.map((r) => r.ok)).toEqual(all.map(() => true));
      await tick(30);
      const data = g().data;
      const frames = data.runs[runId].frames as { seq: string; at: string }[];
      expect([frames.length, frames[1].seq, frames[1].at]).toEqual([2, callee, itemsOf(data as never, callee)[0].id]);
      expect(data.runs[runId].reason).toBe('Left off here');
      expect(await onDisk()).toEqual(data);
      store = await reload();
      expect(store.getState().data).toEqual(data);
    });
  });
});

// P-89: the control is gone with the old app; the saved setting is still a person's data, kept as it is.
describe('P-34: “Not now” on “+ What’s it all for?” is kept for good', () => {
  it('survives a reload in SQLite, and is off until it’s used', async () => {
    let store = await load();
    expect(store.getState().whyOfferOff).toBe(false);
    logText(store, 'first');
    await settle();
    store = await load();
    expect(store.getState().whyOfferOff).toBe(false);
    store.setState({ whyOfferOff: true });
    await settle();
    store = await load();
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'sqlite' });
    expect(store.getState().whyOfferOff).toBe(true);
  });

  it('survives the tab closing before SQLite commits (journal)', async () => {
    let store = await load();
    env.state.hangWrites = true;
    store.setState({ whyOfferOff: true });
    await settle();
    env.state.hangWrites = false;
    store = await load();
    expect(store.getState().whyOfferOff).toBe(true);
  });

  it('in the old format (a browser that can’t run SQLite), and when it moves into SQLite', async () => {
    env.state.openError = new Error('no OPFS');
    let store = await load();
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'local' });
    store.setState({ whyOfferOff: true });
    await settle();
    store = await load();
    expect(store.getState().whyOfferOff).toBe(true);
    env.state.openError = undefined;
    store = await load();
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'sqlite' });
    expect(store.getState().whyOfferOff).toBe(true);
  });
});

describe('P-36: the first run, once over, is over for good', () => {
  it('survives a reload in SQLite, and is not over until it’s ended', async () => {
    let store = await load();
    expect(store.getState().firstRunDone).toBe(false);
    person(store).createThread('feel calmer');
    await settle();
    store = await load();
    expect(store.getState().firstRunDone).toBe(false);
    store.setState({ firstRunDone: true });
    await settle();
    store = await load();
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'sqlite' });
    expect(store.getState().firstRunDone).toBe(true);
    // Its own setting: "+ What’s it all for?" isn't put off by it.
    expect(store.getState().whyOfferOff).toBe(false);
  });

  it('survives the tab closing before SQLite commits (journal)', async () => {
    let store = await load();
    env.state.hangWrites = true;
    store.setState({ firstRunDone: true });
    await settle();
    env.state.hangWrites = false;
    store = await load();
    expect(store.getState().firstRunDone).toBe(true);
  });

  it('in the old format (a browser that can’t run SQLite), and when it moves into SQLite', async () => {
    env.state.openError = new Error('no OPFS');
    let store = await load();
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'local' });
    store.setState({ firstRunDone: true });
    await settle();
    store = await load();
    expect(store.getState().firstRunDone).toBe(true);
    env.state.openError = undefined;
    store = await load();
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'sqlite' });
    expect(store.getState().firstRunDone).toBe(true);
  });
});

describe('P-04: import checks, then previews; only Replace changes the data', () => {
  const thread = (id: string, name: string, extra: Record<string, unknown> = {}) => ({ id, name, hidden: false, createdAt: at, ...extra });
  const file = (data: unknown) => JSON.stringify({ app: 'wanderment', exportedAt: at, data });
  const incoming = { version: 2 as const, threads: { t9: thread('t9', 'sew') }, activities: { i1: { ...act('i1', 'imported'), doingId: 't9' }, i2: act('i2', 'also') }, routines: {}, runs: {} };
  const journal = () => env.ls.get('wanderment:journal');
  async function withMine() {
    const store = await load();
    logText(store, 'mine');
    person(store).createThread('draw');
    await settle();
    return store;
  }
  const helpers = () => import('@/store/importBackup');

  it('a damaged or refused file throws before anything is shown: the data stays the same object, nothing is saved', async () => {
    let store = await withMine();
    const { previewImport } = await helpers();
    const before = store.getState().data;
    const writes = env.p29.writes.length;
    const refused = {
      'not JSON': '{not json',
      'not a backup': JSON.stringify({ hello: 1 }),
      'a newer version': file({ version: 3, threads: {}, activities: {} }),
      'a malformed record': file({ version: 1, threads: {}, activities: { a: { text: 1 } } }),
      'lists for records': file({ version: 1, threads: [], activities: [] }),
      'a duplicate id': file({ version: 1, threads: {}, activities: { a: act('q', 'one'), b: act('q', 'two') } }),
      'a duplicate name': file({ version: 1, threads: { t1: thread('t1', 'draw'), t2: thread('t2', 'Draw', { hidden: true }) }, activities: {} }),
    };
    for (const [what, json] of Object.entries(refused)) {
      expect(() => previewImport(json), what).toThrow();
      expect(store.getState().data, what).toBe(before);
    }
    await settle();
    expect(env.p29.writes.length).toBe(writes);
    expect(journal()).toBeUndefined();
    store = await load();
    expect(texts(store)).toEqual(['mine']);
  });

  it('a preview that’s cancelled (never confirmed) changes nothing and saves nothing', async () => {
    let store = await withMine();
    const { previewImport } = await helpers();
    const before = store.getState().data;
    const writes = env.p29.writes.length;
    const preview = previewImport(file(incoming));
    expect(preview.plan.activities).toEqual({ added: 2, removed: 1, changed: 0, unchanged: 0 });
    expect(preview.plan.threads).toEqual({ added: 1, removed: 1, changed: 0, unchanged: 0 });
    expect(store.getState().data).toBe(before);
    await settle();
    expect(env.p29.writes.length).toBe(writes);
    expect(journal()).toBeUndefined();
    store = await load();
    expect(texts(store)).toEqual(['mine']);
  });

  it('Replace saves the backup, and it survives a reload (and the tab closing before SQLite commits)', async () => {
    let store = await withMine();
    const { previewImport, confirmImport } = await helpers();
    expect(confirmImport(previewImport(file(incoming)))).toEqual({ ok: true, activities: 2 });
    expect(store.getState().data).toEqual(incoming);
    await settle();
    store = await load();
    expect(store.getState().data).toEqual(incoming);

    // Again with a tab that dies mid-write: the journal brings it back.
    store = await withMine();
    const again = await helpers(); // this page load's modules
    env.state.hangWrites = true;
    expect(again.confirmImport(again.previewImport(file({ version: 1, threads: {}, activities: { j1: act('j1', 'journaled') } }))).ok).toBe(true);
    await settle();
    env.state.hangWrites = false;
    store = await load();
    expect(texts(store)).toEqual(['journaled']);
  });

  it('the same file again says it’s identical and changes nothing', async () => {
    const store = await withMine();
    const { previewImport, confirmImport } = await helpers();
    const { toBackup } = await import('@/domain/backup');
    const before = store.getState().data;
    const writes = env.p29.writes.length;
    const preview = previewImport(toBackup(before));
    expect(preview.plan.identical).toBe(true);
    expect(confirmImport(preview)).toEqual({ ok: false, reason: 'identical' });
    expect(store.getState().data).toBe(before);
    await settle();
    expect(env.p29.writes.length).toBe(writes);
  });

  it('never replaces from a stale preview: a change since then shows the new comparison first', async () => {
    let store = await withMine();
    const { previewImport, confirmImport } = await helpers();
    const preview = previewImport(file(incoming));
    logText(store, 'later');
    const result = confirmImport(preview);
    expect(result).toMatchObject({ ok: false, reason: 'changed' });
    expect(texts(store)).toEqual(['later', 'mine']);
    const fresh = (result as { preview: typeof preview }).preview;
    expect(fresh.plan.activities.removed).toBe(2);
    expect(fresh.basis).toBe(store.getState().data);
    expect(confirmImport(fresh).ok).toBe(true);
    await settle();
    store = await load();
    expect(store.getState().data).toEqual(incoming);
  });

  it('while reconnecting, Replace is refused with the quiet note and nothing changes; it works once the data is back', async () => {
    const store = await withMine();
    const { previewImport, confirmImport } = await helpers();
    const before = store.getState().data;
    const preview = previewImport(file(incoming));
    store.setState({ storage: { state: 'ready', kind: 'sqlite', reconnecting: true } });
    expect(confirmImport(preview)).toEqual({ ok: false, reason: 'reconnecting' });
    expect(store.getState().data).toBe(before);
    expect(store.getState().toast).toEqual({ message: 'Just a moment — reconnecting.', notice: true });
    store.setState({ storage: { state: 'ready', kind: 'sqlite' } });
    expect(confirmImport(preview).ok).toBe(true);
    expect(store.getState().data).toEqual(incoming);
  });
});
