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

  it('a change only in the journal when the page let go, replayed by another page that then edits the same record, isn’t put back over that edit when this page takes the data back', async () => {
    fakeLocks();
    const store = await load();
    logText(store, 'alpha');
    await tick(30);
    const id = idOf(store, 'alpha');
    writeGate = deferred();
    store.getState().updateActivity(id, { note: 'n1' });
    await tick(0);
    store.getState().updateActivity(id, { note: 'from B' }); // queued behind the write in flight
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
    store.getState().updateActivity(id, { note: 'edited' });
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
        store.getState().updateActivity(id, { note: typed });
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
      store.getState().updateActivity(id, { note: 'kept note' });
      logText(store, 'unsaved');
      await tick(30);
      page.hide();
      await tick(30);
      page.show();
      await tick(100);
      env.p29.failSql = undefined;
      expect(texts(store)).toEqual(['alpha', 'unsaved']);
      expect(store.getState().data.activities[id].note).toBe('kept note');
      store.getState().setShowShading(false); // any next change saves everything pending
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
    expect(store.getState().updateActivity(idOf(store, 'before'), { note: 'while hidden' })).toBe(false);
    await tick(1000);
    expect(store.getState().data).toBe(data);
    // Audit 2 F4: the "Logged" toast (with Undo) stays, and says why on its second line.
    expect(store.getState().toast).toEqual({ message: 'Logged', activityId: idOf(store, 'before'), detail: 'Just a moment — reconnecting.' });
    expect(env.p29.writes).toEqual([]);
    expect(env.ls.has('wanderment:journal')).toBe(false);

    page.show();
    await tick(30);
    expect(store.getState().storage).toEqual(READY);
    expect(store.getState().updateActivity(idOf(store, 'before'), { note: 'once shown' })).toBe(true);
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
    store.getState().updateActivity(idOf(store, 'before'), { note: 'while hidden' });
    await tick(30);
    // The page is gone (iOS dropped it); another one opens.
    page = fakePage();
    const next = await load();
    expect(next.getState().storage).toEqual(READY);
    expect(texts(next)).toEqual(['before']);
    expect(next.getState().data.activities[idOf(next, 'before')].note).toBeUndefined();
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
      version: 1 as const,
      threads: { t1: thread('t1', 'draw', { next: 'step', declaredAt: at }), t2: thread('t2', 'read') },
      activities: { a1: act('a1', 'unattached'), a2: { ...act('a2', 'drew'), doingId: 't1' }, a3: act('a3', 'to delete') },
    });
    const other = () => ({ version: 1 as const, threads: {}, activities: { i1: act('i1', 'imported') } });
    type S = ReturnType<Store['getState']>;
    const settingsOf = (st: S) => ({ showShading: st.showShading, recentSearches: st.recentSearches, leftAsIs: st.leftAsIs, ...(st.whyOfferOff && { whyOfferOff: true }), ...(st.firstRunDone && { firstRunDone: true }) });

    /** Every action that changes the data or the saved settings, with arguments that do change something. */
    const MUTATING: Record<string, { args: unknown[]; setup?: (store: Store) => void }> = {
      log: { args: [], setup: (store) => store.getState().setDraft({ text: 'typed' }) },
      createThread: { args: ['fresh'] },
      pullIn: { args: ['t2', ['a1']] },
      rememberSearch: { args: ['q'] },
      clearSearches: { args: [] },
      leaveAsIs: { args: ['a1'] },
      setNext: { args: ['t2', 'go'] },
      renameThread: { args: ['t2', 'renamed'] },
      setHidden: { args: ['t2', true] },
      declareThread: { args: ['t2'] },
      undeclareThread: { args: ['t1'] },
      swapWhy: { args: ['t1', 't2'] },
      attach: { args: ['a1', 't2'] },
      attachToNew: { args: ['a1', 'brand new'] },
      updateActivity: { args: ['a1', { note: 'n' }] },
      removeActivity: { args: ['a2'] },
      undoLast: { args: [], setup: (store) => store.getState().removeActivity('a3') },
      replaceData: { args: [other()] },
      refreshData: { args: [other(), { showShading: false, recentSearches: [], leftAsIs: [] }, false] },
      setShowShading: { args: [false] },
      putOffWhy: { args: [] },
      endFirstRun: { args: [] },
      // P-65: the trailhead's "Move it?" and its Undo change the data (the kept line is a1, loose).
      moveKept: { args: [{ kind: 'toward', threadId: 't2' }], setup: (store) => store.setState({ kept: { activityId: 'a1', text: 'unattached' } }) },
      undoKept: {
        args: [],
        setup: (store) => {
          store.setState({ kept: { activityId: 'a1', text: 'unattached' } });
          store.getState().moveKept({ kind: 'toward', threadId: 't2' });
        },
      },
    };
    /** The draft, and what's only on screen this session: these never change the data. */
    const NOT_DATA: Record<string, unknown[]> = {
      setDraft: [{ text: 'still typing' }],
      clearDraft: [],
      loadNext: ['t1'],
      select: ['t1'],
      setPullInOffer: ['t1'],
      dismissPullIn: ['t1'],
      dismissBridge: [],
      dismissToast: [],
      holdToast: [true],
      dismissPrompt: [],
      logMarked: [],
      // P-49: which face Home's slot shows, and handing focus to the log box.
      showHomeFace: ['next'],
      focusLogBox: [],
      // P-50: Home's focus and scope (session only; a tap's attach is the draft's chip, like select).
      tapNode: ['t1'],
      moveFocus: [1],
      scopeUp: [],
      setFocusMap: [undefined],
      askAddStep: ['t1'],
      // P-58: Home's sheet, out or away, and its section (session only).
      openSheet: ['activities'],
      closeSheet: [],
      showSheetSection: ['activities'],
      // P-65: walking away from the trailhead's kept line (session only).
      leaveKept: [],
      // Fix 18: a loose line tapped on the sky reopens the trailhead's Move it? (session only).
      keepLoose: ['a1'],
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
        store.getState().removeActivity('a3'); // an Undo to keep
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
          // Return while reconnecting is remembered instead (and logged once the data is back).
          if (name === 'log') expect(after.toLog, name).toBeDefined();
          else expect(after.toast, name).toEqual(NOTICE);
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
      expect(store.getState().updateActivity(idOf(store, 'before'), { note: 'edited while reconnecting' })).toBe(false);
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

    it('Return while reconnecting is remembered and logs exactly once when the data is back; a line changed since waits for the next Return', async () => {
      const locks = fakeLocks();
      const store = await load();
      await tick(30);
      page.hide();
      await tick(30);
      const release = locks.holdElsewhere();
      page.show();
      await tick(100);
      expect(store.getState().storage).toEqual(RECONNECTING);
      store.getState().setDraft({ text: 'pressed while away' });
      expect(store.getState().log()).toBeUndefined();
      expect(store.getState().log()).toBeUndefined(); // pressed twice
      expect(texts(store)).toEqual([]);
      expect(store.getState().draft.text).toBe('pressed while away');
      release();
      await tick(30);
      expect(store.getState().storage).toEqual(READY);
      expect(texts(store)).toEqual(['pressed while away']);
      expect(store.getState().draft.text).toBe('');
      expect(store.getState().toLog).toBeUndefined();
      expect(await diskTexts()).toEqual(['pressed while away']);

      // Changed after Return: not logged when the data is back.
      page.hide();
      await tick(30);
      const release2 = locks.holdElsewhere();
      page.show();
      await tick(100);
      store.getState().setDraft({ text: 'first try' });
      store.getState().log();
      store.getState().setDraft({ text: 'first try, then more' });
      release2();
      await tick(30);
      expect(store.getState().storage).toEqual(READY);
      expect(texts(store)).toEqual(['pressed while away']);
      expect(store.getState().draft.text).toBe('first try, then more');
      store.getState().log();
      expect(texts(store)).toEqual(['first try, then more', 'pressed while away']);
    });

    it('a transient failure taking the data back (an open that timed out) keeps the data and draft on screen and tries again by itself', async () => {
      fakeLocks();
      const store = await load();
      logText(store, 'before');
      await tick(30);
      page.hide();
      await tick(30);
      store.getState().setDraft({ text: 'a draft' });
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

    it('taking the data back that keeps failing (not held) says so over the app after 6 tries — never before — with the details; it keeps trying behind it, opens by itself, and the remembered Return logs once (audit 2 F1)', async () => {
      fakeLocks();
      const store = await load();
      logText(store, 'before');
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
      store.getState().setDraft({ text: 'pressed while it fails' });
      expect(store.getState().log()).toBeUndefined();
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
        message: 'Wanderment can’t open its data right now. It keeps trying, and this page will carry on by itself once it can; what you’ve typed is kept.',
        details: 'Details: open · Aborted(NetworkError: wasm)',
      });
      // It keeps trying (every 5 s now), without saying it again on each try; the line and the data stay.
      await tick(20_000);
      expect(env.p29.opens).toBe(opens + 10);
      expect(seen).toHaveLength(1);
      expect(store.getState().toLog?.draft.text).toBe('pressed while it fails');
      expect(texts(store)).toEqual(['before']);
      expect(env.p29.writes.filter((q) => /INSERT|UPDATE|DELETE/i.test(q))).toEqual([]);
      // Back: it opens by itself, and the line pressed meanwhile is logged once.
      env.state.openError = undefined;
      await tick(5000);
      expect(store.getState().storage).toEqual(READY);
      expect(texts(store)).toEqual(['before', 'pressed while it fails']);
      expect(store.getState().draft.text).toBe('');
      await tick(30);
      expect(await diskTexts()).toEqual(['before', 'pressed while it fails']);
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
      store.getState().setDraft({ text: 'typed before Reload', toIds: [] });
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

    it('Return pressed while reconnecting survives Reload like the draft: it’s logged once when the data shows again (audit 3 U1)', async () => {
      const session = new Map<string, string>();
      vi.stubGlobal('sessionStorage', { getItem: (k: string) => session.get(k) ?? null, setItem: (k: string, v: string) => void session.set(k, v), removeItem: (k: string) => void session.delete(k) });
      vi.stubGlobal('location', { reload: vi.fn(), href: 'http://localhost/wanderment/' });
      const locks = fakeLocks();
      let store = await load();
      await tick(30);
      page.hide();
      await tick(30);
      locks.holdElsewhere();
      page.show();
      await tick(100);
      expect(store.getState().storage).toEqual(RECONNECTING);
      store.getState().setDraft({ text: 'pressed before Reload' });
      expect(store.getState().log()).toBeUndefined();
      (await import('./persistence')).reloadKeepingDraft();
      (await import('./persistence')).stopPersistence();
      page = fakePage();
      fakeLocks();
      store = await load();
      await tick(30);
      expect(texts(store)).toEqual(['pressed before Reload']);
      expect(store.getState().draft.text).toBe('');
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
      store.getState().setShowShading(false);
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
      store.getState().removeActivity(idOf(store, 'one')); // queued behind the write in flight
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
      expect(store.getState().toast?.message).toMatch(/^Deleted/);
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
});

describe('P-34: “Not now” on “+ What’s it all for?” is kept for good', () => {
  it('survives a reload in SQLite, and is off until it’s used', async () => {
    let store = await load();
    expect(store.getState().whyOfferOff).toBe(false);
    logText(store, 'first');
    await settle();
    store = await load();
    expect(store.getState().whyOfferOff).toBe(false);
    expect(store.getState().putOffWhy()).toBe(true);
    await settle();
    store = await load();
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'sqlite' });
    expect(store.getState().whyOfferOff).toBe(true);
  });

  it('survives the tab closing before SQLite commits (journal)', async () => {
    let store = await load();
    env.state.hangWrites = true;
    store.getState().putOffWhy();
    await settle();
    env.state.hangWrites = false;
    store = await load();
    expect(store.getState().whyOfferOff).toBe(true);
  });

  it('in the old format (a browser that can’t run SQLite), and when it moves into SQLite', async () => {
    env.state.openError = new Error('no OPFS');
    let store = await load();
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'local' });
    store.getState().putOffWhy();
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
    store.getState().createThread('feel calmer');
    await settle();
    store = await load();
    expect(store.getState().firstRunDone).toBe(false);
    expect(store.getState().endFirstRun()).toBe(true);
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
    store.getState().endFirstRun();
    await settle();
    env.state.hangWrites = false;
    store = await load();
    expect(store.getState().firstRunDone).toBe(true);
  });

  it('in the old format (a browser that can’t run SQLite), and when it moves into SQLite', async () => {
    env.state.openError = new Error('no OPFS');
    let store = await load();
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'local' });
    store.getState().endFirstRun();
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
  const incoming = { version: 1 as const, threads: { t9: thread('t9', 'sew') }, activities: { i1: { ...act('i1', 'imported'), doingId: 't9' }, i2: act('i2', 'also') } };
  const journal = () => env.ls.get('wanderment:journal');
  async function withMine() {
    const store = await load();
    logText(store, 'mine');
    store.getState().createThread('draw');
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
      'a newer version': file({ version: 2, threads: {}, activities: {} }),
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
    store.getState().dismissToast(); // the "Logged" toast (with a toast up, the note goes on its second line)
    store.setState({ storage: { state: 'ready', kind: 'sqlite', reconnecting: true } });
    expect(confirmImport(preview)).toEqual({ ok: false, reason: 'reconnecting' });
    expect(store.getState().data).toBe(before);
    expect(store.getState().toast).toEqual({ message: 'Just a moment — reconnecting.', notice: true });
    store.setState({ storage: { state: 'ready', kind: 'sqlite' } });
    expect(confirmImport(preview).ok).toBe(true);
    expect(store.getState().data).toEqual(incoming);
  });
});
