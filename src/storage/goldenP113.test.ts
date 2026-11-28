/**
 * P-113: data written by the build BEFORE a routine can call itself (`fixtures/golden/p113-*`, see the README there) —
 * "Research a question" calling itself for each lead (its question bound to `{lead}`, with fields this version does not
 * know on the row and on the binding), "Ping" → "Pong" → "Ping", as only an import could make there, and a run of
 * Research a question that build took three levels deep through its own Step in, and paused. The real persistence
 * module, against real SQLite, must load it exactly from every place it can be and write nothing by loading it (no
 * migration); P-113 then reads and runs it by its rules. `p113-old-build.json` is what that build SHOWED: its Plan
 * refused a routine as a step of itself, and its Step in on the self-call went in but asked {question} again.
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
/** What the build before P-113 held. */
const BEFORE = JSON.parse(fixture('p113-expected.json')) as Snapshot;

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
const useDatabase = () => copyFileSync(join(GOLDEN, 'p113-schema4.sqlite'), env.state.dbPath);

beforeEach(() => {
  env.ls.clear();
  env.state.openError = undefined;
  env.state.hangWrites = false;
  env.state.dbPath = join(mkdtempSync(join(tmpdir(), 'wanderment-p113-')), 'db.sqlite');
});
afterEach(async () => (await import('./persistence')).stopPersistence());

describe('data written by the build before P-113 loads exactly, wherever it is', () => {
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
    env.ls.set('wanderment:journal', fixture('p113-journal.json'));
    let store = await load();
    expect(shown(store).data).toEqual(BEFORE.data);
    expect(env.ls.has('wanderment:journal')).toBe(false);
    expect(await onDisk()).toEqual(BEFORE.data);
    store = await load();
    expect(shown(store).data).toEqual(BEFORE.data);
  });

  it('the fallback blob: where SQLite can’t run it loads the same; once it can, it is moved in whole', async () => {
    env.state.openError = new Error('no OPFS');
    env.ls.set('wanderment', fixture('p113-fallback.json'));
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
    const preview = previewImport(fixture('p113-backup.json'));
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

type OldView = {
  rows?: { depth: number; kind: string; words: string; here: boolean; within: boolean; call: { inputs: unknown[] } | null }[];
  runner?: { level: string; parent: string | null; depth: number; words: string; middle: string; fields: { name: string; text: string }[]; moves: { stepIn: boolean } };
  tile?: { line: string; path: string[] };
};
const OLD = JSON.parse(fixture('p113-old-build.json')) as Record<string, OldView> & { refusedSelf: { reason: string }; refusedThrough: { reason: string } };
const RESEARCH = 'p113-001';
const BLOCK = 'p113-004';
const PING = 'p113-007';
const PONG = 'p113-009';
const RUN = 'p113-012';
const SELF_ROW = { id: 'p113-self', ref: RESEARCH, words: 'Research a question', with: [{ input: 'question', name: 'lead', later: 'kept' }], later: { kept: true } };

describe('the frozen data itself holds what P-113 must read', () => {
  it('the self-call rows (with fields this version does not know), and a run three levels deep in Research a question, paused', () => {
    const { routines, runs } = BEFORE.data;
    expect(routines[BLOCK]).toMatchObject({ named: false, each: { item: 'lead', list: 'leads' }, items: [SELF_ROW] });
    expect((routines[PONG].items as unknown[]).at(-1)).toEqual({ id: 'p113-back', ref: PING, words: 'Ping' });
    const run = runs[RUN] as unknown as { frames: { seq: string; from?: string }[]; values: { name: string; level: number; items: string[] }[]; reason: string };
    expect(run.frames.map((f) => f.seq)).toEqual([RESEARCH, BLOCK, RESEARCH, BLOCK, RESEARCH]);
    expect(run.reason).toBe('reading the dose studies');
    // That build passed no input: nothing is stored for {question} inside either call.
    expect(run.values.map((v) => [v.level, v.name, v.items])).toEqual([
      [0, 'question', ['Is creatine safe long-term?']],
      [0, 'leads', ['What doses were studied?', 'Who funded the studies?']],
      [2, 'leads', ['What dose sizes?']],
    ]);
  });

  it('what that build showed: its Plan refused a routine as a step of itself, directly and through another; its Step in went in but asked {question} again', () => {
    expect(OLD.refusedSelf.reason).toBe('self');
    expect(OLD.refusedThrough.reason).toBe('self');
    expect(OLD.runnerOnSelfCall.runner).toMatchObject({ level: 'For each lead', words: 'Research a question', middle: 'stepIn', moves: { stepIn: true } });
    expect(OLD.runnerLevel2.runner).toMatchObject({ level: 'Research a question', parent: 'For each lead', depth: 3, words: 'Find what bears on {question}', fields: [{ name: 'question', text: '' }] });
    expect(OLD.runnerLevel3.runner).toMatchObject({ depth: 5, fields: [{ name: 'question', text: '' }] });
    expect(OLD.pausedDeep.tile!.path).toEqual(['Research a question', 'For each lead', 'Research a question', 'For each lead', 'Research a question']);
  });
});

describe('the build where a routine can call itself reads and runs that data', () => {
  it('Plan reads the self-call as a closed row, “this routine”, its question by name from {lead} — and now adds a routine as its own step', async () => {
    const { planView } = await import('@/domain/runView');
    const { editRoutine } = await import('@/domain/run');
    const data = json(BEFORE.data);
    const rows = planView(data, { routineId: RESEARCH })!.rows;
    expect(rows.map((r) => r.words)).toEqual(OLD.planResearch.rows!.map((r) => r.words));
    expect(rows[3]).toMatchObject({ depth: 1, words: 'Research a question', closed: 'this', call: { inputs: [{ input: 'question', mode: 'name', name: 'lead' }] } });
    expect(planView(data, { routineId: PING })!.rows.map((r) => [r.depth, r.words, r.closed ?? null])).toEqual([
      [0, 'Ping {ball}', null],
      [0, 'Pong', null],
      [1, 'Pong {ball}', null],
      [1, 'Ping', 'this'],
    ]);
    // What that build refused: now a call like any other. The frozen row, with what this version does not know, is kept.
    const added = editRoutine(data, BLOCK, { kind: 'addCall', routine: RESEARCH }, { now: '2026-11-28T15:00:00.000Z', id: () => 'p113-new' });
    expect(added.ok).toBe(true);
    expect((added.data.routines[BLOCK].items as unknown[])[0]).toEqual(SELF_ROW);
  });

  it('the paused run: its levels named by the value they were called with; a level that build entered without its input asks it, as it did; the next Step in passes the lead', async () => {
    const { runnerView, homeShown } = await import('@/domain/runView');
    const { runVerb } = await import('@/domain/run');
    let data = json(BEFORE.data);
    let k = 0;
    const env = () => ({ now: `2026-11-28T15:${String(k).padStart(2, '0')}:00.000Z`, id: () => `p113-x${++k}` });
    const go = (verb: Parameters<typeof runVerb>[1]) => {
      const r = runVerb(data, verb, env());
      expect(r.ok, `${verb.kind}: ${r.reason}`).toBe(true);
      data = r.data;
    };
    const v0 = runnerView(data, RUN)!;
    expect(v0).toMatchObject({ level: 'lead: What dose sizes?', parent: 'lead: What doses were studied?', trail: ['Research a question'], depth: 5 });
    expect(v0.step.words).toBe('Find what bears on {question}');
    expect(v0.fields).toEqual([{ name: 'question', text: '', gives: false }]);
    expect(homeShown(data).find((t) => t.runId === RUN)!.path).toEqual(['Research a question', 'lead: What doses were studied?', 'lead: What dose sizes?']);
    // Resumed and carried on: the next self-call passes its lead.
    go({ kind: 'resume', runId: RUN });
    go({ kind: 'next', runId: RUN });
    expect(runnerView(data, RUN)!.step.words).toBe('List the questions this raises');
    go({ kind: 'value', runId: RUN, name: 'leads', text: 'Who measured them?', items: ['Who measured them?'], item: 'p113-003' });
    go({ kind: 'next', runId: RUN });
    go({ kind: 'stepIn', runId: RUN });
    const v = runnerView(data, RUN)!;
    expect(v.depth).toBe(7);
    expect(v.fields).toEqual([]);
    expect(v.step.parts).toContainEqual({ kind: 'value', name: 'question', text: 'Who measured them?' });
    expect(v).toMatchObject({ level: 'lead: Who measured them?', parent: 'lead: What dose sizes?', trail: ['Research a question', '…'] });
    // Nothing of the routines was written by running.
    expect(data.routines).toEqual(BEFORE.data.routines);
  });

  it('Ping → Pong → Ping: the ball is passed by name to each level', async () => {
    const { runnerView } = await import('@/domain/runView');
    const { runVerb } = await import('@/domain/run');
    let data = json(BEFORE.data);
    let k = 0;
    const env = () => ({ now: `2026-11-28T16:${String(k).padStart(2, '0')}:00.000Z`, id: () => `p113-y${++k}` });
    const go = (verb: Parameters<typeof runVerb>[1]) => {
      const r = runVerb(data, verb, env());
      expect(r.ok, `${verb.kind}: ${r.reason}`).toBe(true);
      data = r.data;
      return r;
    };
    go({ kind: 'pause', runId: 'p96-050' });
    const runId = go({ kind: 'start', routineId: PING }).runId!;
    go({ kind: 'value', runId, name: 'ball', text: 'white', item: 'p113-008' });
    go({ kind: 'next', runId });
    go({ kind: 'stepIn', runId });
    go({ kind: 'next', runId });
    go({ kind: 'stepIn', runId });
    const v = runnerView(data, runId)!;
    expect(v.step.words).toBe('Ping {ball}');
    expect(v.fields).toEqual([]);
    expect(v.step.parts).toContainEqual({ kind: 'value', name: 'ball', text: 'white' });
    expect(v).toMatchObject({ level: 'ball: white', parent: 'Pong', trail: ['Ping'] });
  });

  it('through the store, against the frozen database: resumed, carried a level deeper, it is saved as it is and reads the same after a reload', async () => {
    useDatabase();
    let store = await load();
    const s = () => store.getState();
    const { runnerView } = await import('@/domain/runView');
    expect(s().pauseRun('p96-050').ok).toBe(true);
    expect(s().resumeRun(RUN).ok).toBe(true);
    expect(s().nextStep(RUN).ok).toBe(true);
    expect(s().typeList(RUN, 'p113-003', 'leads', ['Who measured them?']).ok).toBe(true);
    expect(s().nextStep(RUN).ok).toBe(true);
    expect(s().stepIn(RUN).ok).toBe(true);
    expect(s().pauseRun(RUN, 'seven levels in').ok).toBe(true);
    const held = json(s().data);
    await settle();
    expect(await onDisk()).toEqual(held);
    store = await load();
    expect(json(s().data)).toEqual(held);
    const v = runnerView(s().data, RUN)!;
    expect(v).toMatchObject({ depth: 7, level: 'lead: Who measured them?', fields: [] });
    expect(s().data.routines).toEqual(BEFORE.data.routines);
  });
});
