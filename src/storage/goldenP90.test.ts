/**
 * P-90: data written by the build BEFORE the Plan surface (`fixtures/golden/p90-*`, see the README
 * there) — runs that carry "this run only" changes, breakdowns owned by a run, a run stored at the
 * edge, two open runs of one routine. The real persistence module, against real SQLite, must load it
 * exactly, from every place it can be (the database, the journal, the fallback blob, a backup), and
 * the engine must read it as that build did. Nothing is altered by loading or reading.
 *
 * Expected values are the frozen `p90-expected.json` and what that build showed, never this code's
 * output.
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
/** What the build before P-90 held. */
const BEFORE = JSON.parse(fixture('p90-expected.json')) as Snapshot;

/** The records in it, by what they are. */
const DESK = 'p90-001';
const ENDED = 'p90-002';
const SPANISH = 'p90-005';
const AT_EDGE = 'p90-006';
const JOBS = 'p90-007';
const A = 'p90-008';
const B = 'p90-run-b';
const TAILOR = 'p90-019';
const JOB_AD = 'p90-023';

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
const useDatabase = () => copyFileSync(join(GOLDEN, 'p90-schema4.sqlite'), env.state.dbPath);

beforeEach(() => {
  env.ls.clear();
  env.state.openError = undefined;
  env.state.hangWrites = false;
  env.state.dbPath = join(mkdtempSync(join(tmpdir(), 'wanderment-p90-')), 'db.sqlite');
});
afterEach(async () => (await import('./persistence')).stopPersistence());

describe('the frozen data itself holds what P-90 must not lose', () => {
  it('this-run changes of every kind, breakdowns owned by a run (one inside the other), a counted loop mid-round, a run at the edge, an ended run with a change, two open runs of one routine', () => {
    const { routines, runs } = BEFORE.data;
    expect(Object.keys(routines)).toEqual([DESK, SPANISH, JOBS, TAILOR, JOB_AD]);
    expect(Object.keys(runs)).toEqual([ENDED, AT_EDGE, A, B]);
    expect((runs[A].changes as { kind: string }[]).map((c) => c.kind)).toEqual(['add', 'reword', 'remove', 'repeat', 'breakdown', 'breakdown', 'reword']);
    expect(runs[A].frames).toEqual([
      { seq: JOBS, at: 'p90-011', round: 2 },
      { seq: TAILOR, at: 'p90-020', round: 1, from: 'p90-011' },
      { seq: JOB_AD, at: 'p90-024', round: 1, from: 'p90-020' },
    ]);
    expect(routines[JOBS]).toMatchObject({ repeatFrom: 1, repeat: 3 });
    expect([routines[TAILOR].ownerRunId, routines[JOB_AD].ownerRunId]).toEqual([A, A]);
    expect(runs[AT_EDGE].frames).toEqual([{ seq: SPANISH, at: null, round: 1 }]);
    expect(runs[ENDED]).toMatchObject({ endedBy: 'done', changes: [{ kind: 'reword', offered: true }] });
    expect(runs[B]).toMatchObject({ routineId: JOBS, status: 'paused', frames: [{ seq: JOBS, at: 'p90-012', round: 2 }] });
    // Nothing in it knows about the mode: that build never wrote one.
    expect(Object.values(runs).filter((r) => 'mode' in r)).toEqual([]);
  });
});

describe('data written by the build before P-90 loads exactly, wherever it is', () => {
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
    env.ls.set('wanderment:journal', fixture('p90-journal.json'));
    let store = await load();
    expect(shown(store).data).toEqual(BEFORE.data);
    expect(env.ls.has('wanderment:journal')).toBe(false);
    expect([...env.ls.keys()].filter((k) => k.startsWith('wanderment:journal-failed-'))).toEqual([]);
    expect(await onDisk()).toEqual(BEFORE.data);
    store = await load();
    expect(shown(store).data).toEqual(BEFORE.data);
  });

  it('the fallback blob: where SQLite can’t run it loads the same; once it can, it is moved in whole', async () => {
    env.state.openError = new Error('no OPFS');
    env.ls.set('wanderment', fixture('p90-fallback.json'));
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
    const preview = previewImport(fixture('p90-backup.json'));
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

describe('the engine reads it as the build that wrote it did (the tolerant reader keeps the old shape)', () => {
  const words = async (data: Data, runId: string, seqId: string) => {
    const { readRun, view, wordsOf } = await import('@/domain/run');
    const run = readRun(data, runId)!;
    return view(data, run, seqId)!.items.map((i) => wordsOf(data, run, i));
  };

  it('the run with changes reads its own sequence: the step added, reworded, removed, the breakdowns, its number; and stands three levels deep', async () => {
    const { readRun, view, place, wordsOf } = await import('@/domain/run');
    const data = json(BEFORE.data);
    const run = readRun(data, A)!;
    expect(run.changes).toHaveLength(7);
    expect(await words(data, A, JOBS)).toEqual(['Open the tracker', 'Tailor the CV', 'Ask Sam to proofread', 'a reply', 'Log it in the sheet']);
    expect(view(data, run, JOBS)).toMatchObject({ repeatFrom: 1, repeat: 5 });
    expect(view(data, run, JOBS)!.items[1]).toEqual({ id: 'p90-011', ref: TAILOR });
    expect(await words(data, A, TAILOR)).toEqual(['Open the job ad', 'Rewrite the summary']);
    expect(await words(data, A, JOB_AD)).toEqual(['Find the right tab', 'Copy the requirements']);
    const at = place(data, run)!;
    expect(at.repaired).toBe(false);
    expect(at.frames.map((f) => `${f.seq}:${f.at}:${f.round}`)).toEqual([`${JOBS}:p90-011:2`, `${TAILOR}:p90-020:1`, `${JOB_AD}:p90-024:1`]);
    expect(wordsOf(data, run, at.item)).toBe('Find the right tab');
    expect(run.reason).toBe('lunch');
  });

  it('the other run of that routine reads the routine’s own steps (none of the first run’s changes), waiting, round 2', async () => {
    const { readRun, place, wordsOf } = await import('@/domain/run');
    const data = json(BEFORE.data);
    expect(await words(data, B, JOBS)).toEqual(['Open the tracker', 'Find a posting', 'Tailor the CV', 'a reply', 'Log it']);
    const run = readRun(data, B)!;
    expect(run).toMatchObject({ status: 'paused', waitingSince: '2026-11-24T17:20:00.000Z', reason: 'chased the recruiter' });
    expect(wordsOf(data, run, place(data, run)!.item)).toBe('a reply');
    expect(place(data, run)!.frame.round).toBe(2);
  });

  it('the run at the edge has nothing to stand on, and the ended run keeps its change and its end', async () => {
    const { readRun, place } = await import('@/domain/run');
    const data = json(BEFORE.data);
    expect(place(data, readRun(data, AT_EDGE)!)!.item).toBeUndefined();
    expect(readRun(data, ENDED)).toMatchObject({ endedAt: '2026-11-25T08:09:00.000Z', endedBy: 'done', changes: [{ kind: 'reword', text: 'Clear the cups and the plates' }] });
    expect(await words(data, ENDED, DESK)).toEqual(['Clear the cups and the plates']);
  });

  it('reading writes nothing: every selector over it leaves the data the same', async () => {
    const data = json(BEFORE.data);
    const { homeTiles, leftOff, runnerView, panelView, pausedView } = await import('@/domain/runView');
    const { searchStarts } = await import('@/domain/starts');
    for (const id of Object.keys(data.runs)) expect(() => [runnerView(data, id), panelView(data, id), pausedView(data, id)]).not.toThrow();
    expect(() => [homeTiles(data), leftOff(data), searchStarts(data, 'apply')]).not.toThrow();
    expect(data).toEqual(BEFORE.data);
  });
});

describe('Plan first opened on a run from the build before (ruling 3): its this-run changes are folded into the routine', () => {
  it('never at load: opening the app, and using it around that run, leaves the frozen run and its routine exactly as they were, on disk too', async () => {
    useDatabase();
    let store = await load();
    // Another run is used (resumed, moved on, paused), a routine is made: the run with changes is not touched.
    expect(store.getState().resumeRun(B).ok).toBe(true);
    expect(store.getState().nextStep(B).ok).toBe(true);
    expect(store.getState().pauseRun(B).ok).toBe(true);
    expect(store.getState().createRoutine('Water the plants').ok).toBe(true);
    await settle();
    store = await load();
    const now = shown(store).data;
    expect(now.runs[A]).toEqual(BEFORE.data.runs[A]);
    for (const id of [JOBS, TAILOR, JOB_AD]) expect(now.routines[id]).toEqual(BEFORE.data.routines[id]);
    expect((await onDisk()).runs[A]).toEqual(BEFORE.data.runs[A]);
  });

  it('Plan: ONE write — the routine, both breakdowns and the run saved together — with a notice that names it; the run reads what it read; the same after a reload', async () => {
    useDatabase();
    let store = await load();
    const { readRun, view, wordsOf } = await import('@/domain/run');
    const reads = (data: Data) => [JOBS, TAILOR, JOB_AD].map((id) => view(data, readRun(data, A)!, id)!.items.map((i) => wordsOf(data, readRun(data, A)!, i)));
    const was = reads(store.getState().data);
    const before = store.getState().data;
    expect(store.getState().planRun(A)).toEqual({ ok: true, runId: A });
    // One change of the store's data: one save.
    const after = store.getState().data;
    expect(Object.keys(after.routines).filter((id) => after.routines[id] !== before.routines[id])).toEqual([JOBS, TAILOR, JOB_AD]);
    expect(Object.keys(after.runs).filter((id) => after.runs[id] !== before.runs[id])).toEqual([A]);
    expect(store.getState().runNotice).toMatchObject({ text: 'Kept this run’s changes in Apply for jobs', label: 'Plan' });
    expect(store.getState().runNotice!.entry).toBe(store.getState().undo);
    await settle();
    const disk = await onDisk();
    expect(disk).toEqual(json(after));
    // P-101 (ruling 4; was `mode: 'plan'`): the fold writes no mode; the stored reason is kept.
    expect(disk.runs[A]).toMatchObject({ changes: [], frames: BEFORE.data.runs[A].frames, reason: 'lunch' });
    expect('mode' in disk.runs[A]).toBe(false);
    expect(disk.routines[JOBS]).toMatchObject({ repeatFrom: 1, repeat: 5 });
    expect((disk.routines[JOBS].items as { id: string }[]).map((i) => i.id)).toEqual(['p90-009', 'p90-011', 'p90-014', 'p90-012', 'p90-013']);
    expect('ownerRunId' in disk.routines[TAILOR] || 'ownerRunId' in disk.routines[JOB_AD]).toBe(false);
    expect(reads(after)).toEqual(was);
    // Nothing else changed on disk: the other runs, the other routines.
    for (const id of [ENDED, AT_EDGE, B]) expect(disk.runs[id]).toEqual(BEFORE.data.runs[id]);
    for (const id of [DESK, SPANISH]) expect(disk.routines[id]).toEqual(BEFORE.data.routines[id]);
    store = await load();
    expect(shown(store).data).toEqual(json(after));
    const { planView } = await import('@/domain/runView');
    expect(planView(store.getState().data, { runId: A })).toMatchObject({ planning: true, unfolded: false, line: 'at Find the right tab' });
  });

  it('Undo of it restores EVERY record exactly as the build before left it — on screen and on disk, and after a reload', async () => {
    useDatabase();
    let store = await load();
    expect(store.getState().planRun(A).ok).toBe(true);
    await settle();
    expect(await onDisk()).not.toEqual(BEFORE.data);
    expect(store.getState().undoLast()).toBe(true);
    expect(shown(store).data).toEqual(BEFORE.data);
    await settle();
    expect(await onDisk()).toEqual(BEFORE.data);
    store = await load();
    expect(shown(store).data).toEqual(BEFORE.data);
  });

  it('the fold made while no write commits (the tab dies): it is all there after a reload, from the journal — never half of it', async () => {
    useDatabase();
    let store = await load();
    env.state.hangWrites = true;
    expect(store.getState().planRun(A).ok).toBe(true);
    await settle();
    const after = json(store.getState().data);
    expect(await onDisk()).toEqual(BEFORE.data);
    env.state.hangWrites = false;
    (await import('./persistence')).stopPersistence();
    store = await load();
    expect(shown(store).data).toEqual(after);
    expect(await onDisk()).toEqual(after);
    expect(env.ls.has('wanderment:journal')).toBe(false);
  });

  it('the run at the edge, stored with no mode, opens in Plan with nothing written; its first step added there is where it stands, paused (P-101, ruling 4: no mode written), and Resume runs it', async () => {
    useDatabase();
    const before = readFileSync(env.state.dbPath);
    let store = await load();
    const { planView, runRoute, homeTiles } = await import('@/domain/runView');
    expect(runRoute(store.getState().data, AT_EDGE)).toBe('plan');
    expect(planView(store.getState().data, { runId: AT_EDGE })).toMatchObject({ name: 'Learn Spanish', planning: true, edge: true, line: 'nothing next yet', rows: [] });
    expect(homeTiles(store.getState().data).find((x) => x.routineId === SPANISH)).toMatchObject({ state: 'paused', action: 'plan' });
    await settle();
    expect(readFileSync(env.state.dbPath).equals(before)).toBe(true);
    expect(store.getState().editRoutine(SPANISH, { kind: 'addStep', text: 'Find a tutor' }).ok).toBe(true);
    await settle();
    expect('mode' in (await onDisk()).runs[AT_EDGE]).toBe(false);
    expect(planView(store.getState().data, { runId: AT_EDGE })).toMatchObject({ planning: true, edge: false, forward: { label: 'Resume at Find a tutor' } });
    store = await load();
    // (The other run is the one the app is on, paused: Resume of this one is allowed.)
    expect(store.getState().resumeRun(AT_EDGE).ok).toBe(true);
    await settle();
    const disk = await onDisk();
    expect(disk.runs[AT_EDGE]).toMatchObject({ status: 'running' });
    expect('mode' in disk.runs[AT_EDGE]).toBe(false);
  });
});
