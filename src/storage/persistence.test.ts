/**
 * Runs the real persistence module against real SQLite (node:sqlite), with localStorage and
 * AsyncStorage stubbed the way they behave on web. Each test is a fresh "page load".
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
const logText = (store: Awaited<ReturnType<typeof load>>, text: string) => {
  store.getState().setDraft({ text });
  store.getState().log();
};

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
    store.getState().removeActivity('a2');
    await settle();
    env.ls.set('wanderment', legacyBlob({ version: 1, threads: {}, activities: { a1: act('a1', 'one'), a2: act('a2', 'two'), a3: act('a3', 'three') } }));
    store = await load();
    expect(texts(store)).toEqual(['one', 'three']);
    // Even if everything is deleted, the old blob doesn't come back as a "first move".
    for (const id of Object.keys(store.getState().data.activities)) store.getState().removeActivity(id);
    await settle();
    env.ls.set('wanderment', legacyBlob({ version: 1, threads: {}, activities: { a1: act('a1', 'one') } }));
    store = await load();
    expect(texts(store)).toEqual([]);
  });

  it('adds records an old-version tab wrote after the move, keeping newer copies', async () => {
    env.ls.set('wanderment', legacyBlob({ version: 1, threads: {}, activities: { a1: act('a1', 'old') } }));
    let store = await load();
    store.getState().updateActivity('a1', { text: 'old, edited here' });
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
    store.getState().leaveAsIs('x1');
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
    store.getState().removeActivity(b.id);
    store.getState().undoLast();
    store.getState().updateActivity(b.id, { note: 'kept' });
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
      store.getState().setShowShading(false);
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

describe('the bridge after a log', () => {
  it('is never saved: a reload drops it and keeps the activity, with nothing attached', async () => {
    let store = await load();
    store.getState().setDraft({ text: 'read a novel' });
    const id = store.getState().log(undefined, { bridge: true })!;
    expect(store.getState().bridgeFor).toBe(id);
    await settle();
    store = await load();
    expect(store.getState().bridgeFor).toBeUndefined();
    expect(store.getState().data.activities[id].toIds).toEqual([]);
    expect(store.getState().data.threads).toEqual({});
  });

  it('naming a thread then Undo leaves no thread on disk and the activity unattached', async () => {
    let store = await load();
    store.getState().setDraft({ text: 'read a novel' });
    const id = store.getState().log(undefined, { bridge: true })!;
    store.getState().attachToNew(id, 'reading');
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
    const id = store.getState().createThread('practice drawing');
    expect(store.getState().declareThread(id).ok).toBe(true);
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
    expect(store.getState().renameThread(d.id, 'draw').ok).toBe(true);
    await settle();
    store = await load();
    store.getState().setNext(d.id, 'gesture study');
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

    expect(store.getState().declareThread(d.id).ok).toBe(true);
    const again = mark(store, d.id)!;
    await settle();
    store.getState().undeclareThread(d.id);
    await settle();
    store = await load();
    expect(mark(store, d.id)).toBeUndefined();
    // Undo after the undeclare was saved puts the exact time back on disk.
    store.getState().declareThread(d.id);
    const third = mark(store, d.id)!;
    expect(third >= again).toBe(true);
    await settle();
    store.getState().undeclareThread(d.id);
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
    store.getState().setHidden(d.id, true);
    await settle();
    store = await load();
    expect(store.getState().data.threads[d.id]).toMatchObject({ hidden: true });
    expect(mark(store, d.id)).toBeUndefined();
    store.getState().setHidden(d.id, false);
    store.getState().declareThread(d.id);
    const at2 = mark(store, d.id)!;
    store.getState().setHidden(d.id, true);
    store.getState().undoLast();
    await settle();
    store = await load();
    expect(store.getState().data.threads[d.id]).toMatchObject({ hidden: false, declaredAt: at2 });
  });

  it('a declare survives the tab closing before SQLite commits (journal)', async () => {
    let store = await load();
    const id = store.getState().createThread('practice drawing');
    await settle();
    env.state.hangWrites = true;
    store.getState().declareThread(id);
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
    store.getState().createThread('run');
    const json = toBackup(store.getState().data);
    store.getState().undeclareThread(d.id);
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

describe('another copy of the app holds the data (P-29)', () => {
  const WEBKIT_HELD = 'The object is in an invalid state.';
  const held = () => new Error(WEBKIT_HELD);
  const ANOTHER_TAB = 'Wanderment is open in another tab or window. It’ll open here as soon as that one is closed or in the background.';
  const ELSEWHERE =
    'Wanderment is still open somewhere else in this browser — maybe an old tab, or a page in a tab’s history. Close other Wanderment tabs; if this stays, quit the browser and reopen it. Your data is safe; this page will open by itself.';
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
      message: `Wanderment couldn’t open its data (${unknown().message}). Reload to try again.`,
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
        message: 'Wanderment couldn’t open its data (disk I/O error). Reload to try again.',
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
  const TAB_HELD = 'Wanderment is open in another tab or window. It’ll open here as soon as that one is closed or in the background.';
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

  it('a change made while hidden writes nothing, waits in the journal, and lands when the page is shown again', async () => {
    fakeLocks();
    const store = await load();
    logText(store, 'before');
    await tick(30);
    page.hide();
    await tick(30);
    expect(log.slice(-3)).toEqual(['close', 'shutdown', 'lock released']);
    env.p29.writes = [];
    store.getState().updateActivity(idOf(store, 'before'), { note: 'while hidden' });
    await tick(1000);
    expect(env.p29.writes).toEqual([]);
    expect(JSON.parse(env.ls.get('wanderment:journal')!).changes.upsertActivities).toEqual([expect.objectContaining({ text: 'before', note: 'while hidden' })]);

    page.show();
    await tick(30);
    expect(store.getState().storage).toEqual(READY);
    expect(store.getState().data.activities[idOf(store, 'before')].note).toBe('while hidden');
    expect(Object.values((await onDisk()).activities)[0].note).toBe('while hidden');
    expect(env.ls.has('wanderment:journal')).toBe(false);
  });

  it('a change made while hidden survives the page never coming back (the journal)', async () => {
    fakeLocks();
    const store = await load();
    logText(store, 'before');
    await tick(30);
    page.hide();
    await tick(30);
    store.getState().updateActivity(idOf(store, 'before'), { note: 'while hidden' });
    await tick(30);
    // The page is gone (iOS dropped it); another one opens.
    page = fakePage();
    const next = await load();
    expect(next.getState().storage).toEqual(READY);
    expect(next.getState().data.activities[idOf(next, 'before')].note).toBe('while hidden');
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
    store.getState().setDraft({ text: 'half-typed' });

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
    store.getState().setDraft({ text: 'typing' });
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
    logText(store, 'still saved');
    page.show();
    await tick(100);
    expect(await diskTexts()).toEqual(['still saved']);
  });

  it('pagehide/pageshow and freeze/resume let go and take back too', async () => {
    const locks = fakeLocks();
    const store = await load();
    for (const [away, back, on] of [
      ['pagehide', 'pageshow', 'window'],
      ['freeze', 'resume', 'document'],
    ] as const) {
      page.fire(on, away);
      await tick(30);
      expect(locks.free(), away).toBe(true);
      expect(store.getState().storage, away).toEqual(RECONNECTING);
      page.fire(on, back);
      await tick(30);
      expect(locks.free(), back).toBe(false);
      expect(store.getState().storage, back).toEqual(READY);
    }
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
});
