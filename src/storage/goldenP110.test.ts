/**
 * P-110: data written by the build BEFORE values follow the place (`fixtures/golden/p110-*`, see the README there) —
 * runs that break P-110's rule as that build let a person make them: "Iterate on the app" with {feature} asked AHEAD at
 * "Envision how I’d expect {feature} to work" (before "Pick a feature", which gives it), the run moved past both and
 * Jumped back to the first step, paused; "Write the post" with {subject} given at its step, then Jumped back onto
 * that step, paused; and a row "@Document Iteration" typed as words. The real persistence module, against real
 * SQLite, must load it exactly from every place it can be and write nothing by loading it; P-110 reads it by its
 * rule — a value held only while its giving step is above the place — without deleting anything until a move.
 * `p110-old-build.json` is what that build SHOWED.
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
/** What the build before P-110 held. */

const BEFORE = JSON.parse(fixture('p110-expected.json')) as Snapshot;

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
const useDatabase = () => copyFileSync(join(GOLDEN, 'p110-schema4.sqlite'), env.state.dbPath);

beforeEach(() => {
  env.ls.clear();
  env.state.openError = undefined;
  env.state.hangWrites = false;
  env.state.dbPath = join(mkdtempSync(join(tmpdir(), 'wanderment-p110-')), 'db.sqlite');
});
afterEach(async () => (await import('./persistence')).stopPersistence());



const OLD = JSON.parse(fixture('p110-old-build.json')) as Record<string, { line?: string; forward?: string; rows: { words: string; here: boolean }[]; runner?: { words: string; fields: unknown[]; values: { name: string; items: string[] }[] } }>;
const ITERATE = 'p110-004';
const ENVISION = 'p110-005';
const AT_DOC = 'p110-008';
const DOC = 'p110-001';
const RUN = 'p110-009';
const POST = 'p110-010';
const CHOOSE = 'p110-011';
const RUN2 = 'p110-014';

describe('the frozen data itself holds what P-110 must read', () => {
  it('a value given ahead of its giving step and Jumped back before both; a value Jumped back onto its step; "@Document Iteration" as words', () => {
    const { routines, runs } = BEFORE.data;
    expect((routines[ITERATE].items as Record<string, unknown>[])[3]).toEqual({ id: AT_DOC, text: '@Document Iteration' });
    expect(runs[RUN]).toMatchObject({ frames: [{ seq: ITERATE, at: ENVISION, round: 1 }], values: [{ name: 'feature', items: ['checkout'], level: 0, item: ENVISION }] });
    expect(runs[RUN2]).toMatchObject({ frames: [{ seq: POST, at: CHOOSE, round: 1 }], values: [{ name: 'subject', items: ['tides'], item: CHOOSE }] });
    expect(runs['p96-050'].status).toBe('running');
  });

  it('what that build showed: asked ahead at the reader, kept after the Jump back, and "Resume at …" with {feature} as written', () => {
    expect(OLD.onEnvision.runner).toMatchObject({ fields: [{ name: 'feature', text: '', gives: false }], values: [] });
    expect(OLD.jumpedBack.runner).toMatchObject({ fields: [{ name: 'feature', text: 'checkout', gives: false }], values: [{ name: 'feature', items: ['checkout'] }] });
    expect(OLD.onBuild.forward).toBe('Resume at Build {feature}');
    expect(OLD.planPaused.line).toBe('at Envision how I’d expect {feature} to work');
    expect(OLD.jumpedOntoGiver.runner).toMatchObject({ values: [{ name: 'subject', items: ['tides'] }] });
  });
});

describe('data written by the build before P-110 loads exactly, wherever it is', () => {
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
    env.ls.set('wanderment:journal', fixture('p110-journal.json'));
    let store = await load();
    expect(shown(store).data).toEqual(BEFORE.data);
    expect(env.ls.has('wanderment:journal')).toBe(false);
    expect(await onDisk()).toEqual(BEFORE.data);
    store = await load();
    expect(shown(store).data).toEqual(BEFORE.data);
  });

  it('the fallback blob: where SQLite can’t run it loads the same; once it can, it is moved in whole', async () => {
    env.state.openError = new Error('no OPFS');
    env.ls.set('wanderment', fixture('p110-fallback.json'));
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
    const preview = previewImport(fixture('p110-backup.json'));
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

describe('the build where values follow the place reads that data', () => {
  it('the run Jumped back before both: nothing held — no value in the values row, no field asking ahead, the words as written; and the value is still stored', async () => {
    const { runnerView, planView } = await import('@/domain/runView');
    const data = json(BEFORE.data);
    const v = runnerView(data, RUN)!;
    expect(v.values).toEqual([]);
    expect(v.fields).toEqual([]);
    expect(v.step.parts).toEqual([{ kind: 'text', text: 'Envision how I’d expect ' }, { kind: 'blank', name: 'feature' }, { kind: 'text', text: ' to work' }]);
    expect(planView(data, { runId: RUN })!.forward).toMatchObject({ label: 'Resume at Envision how I’d expect {feature} to work' });
    expect(data.runs[RUN].values).toEqual(BEFORE.data.runs[RUN].values);
  });

  it('the run Jumped back onto "Choose a subject": its value shows in that step’s own field (held at the place)', async () => {
    const { runnerView } = await import('@/domain/runView');
    const v = runnerView(json(BEFORE.data), RUN2)!;
    expect(v.fields).toEqual([{ name: 'subject', text: 'tides', gives: true }]);
  });

  it('Plan: "@Document Iteration" is offered as a call to "Document Iteration" — never made one by reading', async () => {
    const { planView } = await import('@/domain/runView');
    const data = json(BEFORE.data);
    expect(planView(data, { runId: RUN })!.rows[3]).toMatchObject({ kind: 'step', words: '@Document Iteration', asCall: { routine: DOC, name: 'Document Iteration' } });
    expect(data.routines[ITERATE]).toEqual(BEFORE.data.routines[ITERATE]);
  });

  it('through the store, against the frozen database: Next reaches "Pick a feature" and shows the stored value there; on to "Build checkout", then a Jump back before both clears it — said, with Undo; nothing else changes', async () => {
    useDatabase();
    const store = await load();
    const s = () => store.getState();
    const { runnerView, planView } = await import('@/domain/runView');
    expect(s().pauseRun('p96-050').ok).toBe(true);
    expect(s().resumeRun(RUN).ok).toBe(true);
    expect(s().nextStep(RUN).ok).toBe(true);
    expect(runnerView(s().data, RUN)!.fields).toEqual([{ name: 'feature', text: 'checkout', gives: true }]);
    expect(s().nextStep(RUN).ok).toBe(true);
    expect(s().pauseRun(RUN).ok).toBe(true);
    expect(planView(s().data, { runId: RUN })!.forward).toMatchObject({ label: 'Resume at Build checkout' });
    expect(s().jumpTo(RUN, { path: [ENVISION] }).ok).toBe(true);
    expect(s().runNotice?.text).toBe('Jumped from Build {feature} · Cleared {feature}');
    await settle();
    const disk = await onDisk();
    expect(disk.runs[RUN].values).toBeUndefined();
    expect(disk.routines).toEqual(BEFORE.data.routines);
    const others = (d: Data) => ({ ...d, runs: Object.fromEntries(Object.entries(d.runs).filter(([id]) => id !== RUN && id !== 'p96-050')) });
    expect(others(disk)).toEqual(others(BEFORE.data));
    expect(s().undoLast()).toBe(true);
    await settle();
    expect(((await onDisk()).runs[RUN].values as { items: string[] }[])[0].items).toEqual(['checkout']);
  });
});
