/**
 * Runs the real persistence module against real SQLite (node:sqlite), with localStorage and
 * AsyncStorage stubbed the way they behave on web. Each test is a fresh "page load".
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(() => {
  const ls = new Map<string, string>();
  const state = { dbPath: '', openError: undefined as Error | undefined, quotaKey: undefined as string | undefined };
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
      return nodeDb(env.state.dbPath);
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
  env.state.dbPath = join(mkdtempSync(join(tmpdir(), 'wanderment-')), 'db.sqlite');
});

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
    expect(store.getState().storage).toMatchObject({ state: 'blocked', message: expect.stringMatching(/another tab/) });
  });

  it('once SQLite has opened in this browser, a later failure blocks instead of falling back', async () => {
    await load();
    env.state.openError = new Error('disk I/O error');
    const store = await load();
    expect(store.getState().storage).toMatchObject({ state: 'blocked', message: expect.stringMatching(/disk I\/O error/) });
  });
});

describe('moving from the first release’s format', () => {
  it('moves into SQLite without needing room for a second copy', async () => {
    env.ls.set('wanderment', legacyBlob({ version: 1, threads: {}, activities: { a1: act('a1', 'old') } }));
    env.state.quotaKey = 'wanderment:moved-to-sqlite';
    let store = await load();
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'sqlite' });
    logText(store, 'new');
    await settle();
    store = await load();
    expect(texts(store)).toEqual(['new', 'old']);
    expect(env.ls.has('wanderment')).toBe(false);
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
    logText(store, 'one');
    // No waiting: the page is gone.
    store = await load();
    expect(texts(store)).toEqual(['one']);
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
