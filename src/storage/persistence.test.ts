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
      return {
        ...db,
        exec: sql(true, db.exec),
        run: sql(true, db.run),
        all: sql(false, db.all) as typeof db.all,
        // "The tab dies mid-write": transactions opened while hangWrites is on never commit.
        transaction: (task: () => Promise<void>) => (env.state.hangWrites ? new Promise<void>(() => {}) : db.transaction(task)),
      };
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
