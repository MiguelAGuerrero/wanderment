/**
 * P-90: Plan. The mode table and the repair table in .polish/current/P-90/scout.md (sections 2 and 3),
 * as the contract's rulings read them, one test per row; the fold of this-run changes on first opening
 * Plan (ruling 3), on data frozen from the build before (storage/fixtures/golden/p90-expected.json).
 * Expected values come from those tables and rulings, never from running the engine. Notation:
 * [a b | c d] = items with the Repeat divider before c; places are seq:at:round, bottom frame first.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

import { applyUndo, undoEntry } from './diff';
import { editRoutine, Env, isPlanning, isRunning, Item, MAX_DEPTH, place, readRoutine, readRun, Result, RoutineEdit, runVerb, Verb, view, wordsOf } from './run';
import { Data, emptyData, Id, Routine, Run } from './types';

const T0 = Date.UTC(2026, 10, 25, 10, 0, 0);
const NOW = new Date(T0).toISOString();
let n = 0;
let t = 0;
beforeEach(() => {
  n = 0;
  t = 0;
});
/** A clock that moves a second per verb, and ids x1, x2, … */
const env = (): Env => ({ now: new Date(T0 + 1000 * t++).toISOString(), id: () => `x${++n}` });
const go = (d: Data, verb: Verb): Result => runVerb(d, verb, env());
const ok = (d: Data, verb: Verb): Result => {
  const r = go(d, verb);
  expect(r.ok, `${JSON.stringify(verb)} refused: ${r.reason}`).toBe(true);
  return r;
};
const edit = (d: Data, routineId: Id, e: RoutineEdit): Data => {
  const r = editRoutine(d, routineId, e, env());
  expect(r.ok, `${JSON.stringify(e)} refused: ${r.reason}`).toBe(true);
  return r.data;
};
const step = (id: string, text = id): Item => ({ id, text });
const wait = (id: string, w = id): Item => ({ id, wait: w });
const ref = (id: string, to: string): Item => ({ id, ref: to });
const seq = (id: string, words: string, items: Item[], extra: Record<string, unknown> = {}): Routine => ({ id, words, named: true, createdAt: '2026-11-01T00:00:00.000Z', items, ...extra });
const aRun = (id: Id, routineId: Id, frames: unknown[], extra: Record<string, unknown> = {}): Run => ({ id, routineId, startedAt: '2026-11-24T10:00:00.000Z', touchedAt: '2026-11-24T10:00:00.000Z', frames, changes: [], ...extra });
const world = (routines: Routine[], runs: Run[] = []): Data => ({ ...emptyData(), routines: Object.fromEntries(routines.map((s) => [s.id, s])), runs: Object.fromEntries(runs.map((r) => [r.id, r])) });
const run = (d: Data, id: Id) => readRun(d, id)!;
const at = (d: Data, id: Id) => run(d, id).frames.map((f) => `${f.seq}:${f.at}:${f.round}`);
const here = (d: Data, id: Id) => wordsOf(d, run(d, id), place(d, run(d, id))!.item);
const json = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const undone = (before: Data, after: Data) => json(applyUndo(after, undoEntry(before, after)));
const unnamed = (d: Data) => Object.values(d.routines).filter((r) => !r.named);
/** A routine as it stands: "a b | c d" (w: a wait, >: a routine). */
const shape = (d: Data, id: Id) => {
  const s = readRoutine(d, id)!;
  return s.items.map((i, k) => `${s.repeatFrom === k ? '| ' : ''}${'ref' in i ? '>' : 'wait' in i ? 'w:' : ''}${i.id}`).join(' ');
};

/** The scout's reproduction: G = [a b | c d]; A running at b, round 1 (the run the app is on); B, a second run of G, left at c, round 2. */
const G = (extra: Record<string, unknown> = {}) => seq('G', 'Gym', [step('a'), step('b'), step('c'), step('d')], { repeatFrom: 2, open: true, home: true, ...extra });
const base = (extra: Record<string, unknown> = {}) => world([G(extra)], [aRun('A', 'G', [{ seq: 'G', at: 'b', round: 1 }], { status: 'running' }), aRun('B', 'G', [{ seq: 'G', at: 'c', round: 2 }])]);
/** The same with A in Plan (entered from the runner: paused, mode plan). */
const planning = (extra: Record<string, unknown> = {}) => ok(base(extra), { kind: 'plan', runId: 'A' }).data;

describe('the repair bug (ruling 6): a run never sits inside a removed step', () => {
  const U = () => seq('U', 'b', [step('u1'), step('u2')], { named: false });
  const nested = () => world([seq('G', 'Gym', [step('a'), ref('b', 'U'), step('c')]), U()], [aRun('A', 'G', [{ seq: 'G', at: 'b', round: 1 }, { seq: 'U', at: 'u1', round: 1, from: 'b' }], { status: 'running' })]);

  it('removing the step whose breakdown the run is inside: the inner level goes; the run stands on the next surviving step of that level', () => {
    const d = edit(nested(), 'G', { kind: 'remove', item: 'b' });
    expect(at(d, 'A')).toEqual(['G:c:1']);
    expect(place(d, run(d, 'A'))!.repaired).toBe(false);
    // Next from there is the next step of G (here its end), never a step of the removed breakdown.
    expect(here(d, 'A')).toBe('c');
    expect(undone(nested(), d)).toEqual(json(nested()));
  });

  it('several levels inside it: all of them go', () => {
    const deep = world(
      [seq('G', 'Gym', [ref('b', 'U'), step('c')]), seq('U', 'b', [ref('u1', 'V')], { named: false }), seq('V', 'u1', [step('v1')], { named: false })],
      [aRun('A', 'G', [{ seq: 'G', at: 'b', round: 1 }, { seq: 'U', at: 'u1', round: 1, from: 'b' }, { seq: 'V', at: 'v1', round: 1, from: 'u1' }], { status: 'running' })],
    );
    expect(at(edit(deep, 'G', { kind: 'remove', item: 'b' }), 'A')).toEqual(['G:c:1']);
  });

  it('a second run inside the same removed step is taken out of it in the same write', () => {
    const two = world(
      [seq('G', 'Gym', [step('a'), ref('b', 'U'), step('c')]), U(), seq('H', 'Other', [ref('h', 'G')])],
      [
        aRun('A', 'G', [{ seq: 'G', at: 'b', round: 1 }, { seq: 'U', at: 'u2', round: 1, from: 'b' }], { status: 'running' }),
        aRun('X', 'H', [{ seq: 'H', at: 'h', round: 1 }, { seq: 'G', at: 'b', round: 3, from: 'h' }, { seq: 'U', at: 'u1', round: 1, from: 'b' }]),
      ],
    );
    const d = edit(two, 'G', { kind: 'remove', item: 'b' });
    expect(at(d, 'A')).toEqual(['G:c:1']);
    expect(at(d, 'X')).toEqual(['H:h:1', 'G:c:3']);
  });

  it('the other nested cases stay right: removing HERE inside the breakdown moves on inside it; emptying it leaves the run on the step it was entered from; a run of the breakdown itself is repaired alike', () => {
    const inside = edit(nested(), 'U', { kind: 'remove', item: 'u1' });
    expect(at(inside, 'A')).toEqual(['G:b:1', 'U:u2:1']);
    expect(at(edit(inside, 'U', { kind: 'remove', item: 'u2' }), 'A')).toEqual(['G:b:1']);
    const shared = world(
      [seq('G', 'Gym', [step('a'), ref('b', 'U')]), U()],
      [aRun('A', 'G', [{ seq: 'G', at: 'b', round: 1 }, { seq: 'U', at: 'u2', round: 1, from: 'b' }], { status: 'running' }), aRun('Y', 'U', [{ seq: 'U', at: 'u2', round: 1 }])],
    );
    const d = edit(shared, 'U', { kind: 'remove', item: 'u2' });
    expect([at(d, 'A'), at(d, 'Y')]).toEqual([['G:b:1', 'U:u1:1'], ['U:u1:1']]);
  });

  it('a run stored inside a removed step by the build before (the bug’s leftovers) still reads, and leaves it by Next or Done without moving the level below again', () => {
    const stale = world([seq('G', 'Gym', [step('a'), step('c')]), U()], [aRun('A', 'G', [{ seq: 'G', at: 'c', round: 1 }, { seq: 'U', at: 'u2', round: 1, from: 'b' }], { status: 'running' })]);
    expect(here(stale, 'A')).toBe('u2');
    const next = ok(stale, { kind: 'next', runId: 'A' });
    expect(at(next.data, 'A')).toEqual(['G:c:1']);
    expect(at(ok(stale, { kind: 'done', runId: 'A' }).data, 'A')).toEqual(['G:c:1']);
  });
});

// ───────── The mode table (scout §2; rulings 1 and 5) ─────────

describe('mode: set by Plan', () => {
  it('from the runner (the run that is running): paused in ONE write — P-101 (ruling 4; was "paused and in Plan"): plainly, no mode written; its place, round, reason and waiting-since untouched; nothing said; no other record touched', () => {
    const w = world([seq('R', 'Report', [wait('w', 'a reply'), step('b')])], [aRun('A', 'R', [{ seq: 'R', at: 'w', round: 1 }], { status: 'running', reason: 'why', waitingSince: '2026-11-24T10:00:00.000Z' })]);
    const r = ok(w, { kind: 'plan', runId: 'A' });
    expect(json(r.data.runs.A)).toEqual({ ...json(w.runs.A), status: 'paused', touchedAt: NOW });
    expect(run(r.data, 'A').mode).toBeUndefined();
    expect(isRunning(r.data, run(r.data, 'A'))).toBe(false);
    expect(r.data.routines).toBe(w.routines);
    expect([r.said, r.folded]).toEqual([undefined, undefined]);
  });

  it('from home (the run the app is on, paused): P-101 (ruling 4; was "in Plan, still paused"): still paused, and nothing is written', () => {
    const w = world([seq('R', 'Report', [step('a')])], [aRun('A', 'R', [{ seq: 'R', at: 'a', round: 1 }], { status: 'paused', reason: 'lunch' })]);
    const r = ok(w, { kind: 'plan', runId: 'A' });
    expect(r.data).toBe(w);
    expect(run(r.data, 'A')).toMatchObject({ status: 'paused', reason: 'lunch' });
  });

  it('from a home tile (a run that is not the one the app is on): P-101 (ruling 4; was "the mode only"): nothing is written — it does not take the slot, and the run that is running goes on running', () => {
    const d = base();
    const r = ok(d, { kind: 'plan', runId: 'B' });
    expect(r.data).toBe(d);
    expect('status' in r.data.runs.B).toBe(false);
    expect(run(r.data, 'A').status).toBe('running');
    expect(isPlanning(r.data, run(r.data, 'B'))).toBe(false);
    expect(isPlanning(r.data, run(r.data, 'A'))).toBe(false);
  });

  it('already in Plan: nothing is written (the same data)', () => {
    const d = planning();
    const again = ok(d, { kind: 'plan', runId: 'A' });
    expect(again.data).toBe(d);
  });

  it('refused for a run that has ended or is not there; nothing changes', () => {
    const d = base();
    const ended = ok(d, { kind: 'done', runId: 'A' }).data;
    expect(go(ended, { kind: 'plan', runId: 'A' })).toMatchObject({ ok: false, reason: 'ended', data: ended });
    expect(go(d, { kind: 'plan', runId: 'nope' })).toMatchObject({ ok: false, reason: 'gone', data: d });
  });

  it('a run in Plan is never running — and a running run is never in Plan (as stored)', () => {
    const d = planning();
    expect(d.runs.A.status).toBe('paused');
    const back = ok(d, { kind: 'resume', runId: 'A' }).data;
    expect(back.runs.A.status).toBe('running');
    expect('mode' in back.runs.A).toBe(false);
  });
});

describe('mode: derived at the edge (nothing next)', () => {
  const goal = (status?: string) => world([seq('E', 'Learn Spanish', [step('a')], { open: true })], [aRun('A', 'E', [{ seq: 'E', at: 'a', round: 1 }], { ...(status && { status }) })]);

  it('a run stored at the edge reads as planning whatever is stored — running, paused or left, with no mode — and reading writes nothing', () => {
    for (const status of ['running', 'paused', undefined]) {
      const d = world([seq('E', 'E', [], { open: true })], [aRun('A', 'E', [{ seq: 'E', at: null, round: 1 }], { ...(status && { status }) })]);
      const before = json(d);
      expect(isPlanning(d, run(d, 'A')), String(status)).toBe(true);
      expect(json(d)).toEqual(before);
    }
  });

  it('P-96 (ruling 7; was P-90: "Next reaching the edge … paused and in Plan"): Next on the last step of an open goal ENDS the run in one write — never Plan, no mode; it says "ended"; one Undo takes all of it back', () => {
    const d = goal('running');
    const r = ok(d, { kind: 'next', runId: 'A' });
    expect(at(r.data, 'A')).toEqual(['E:a:1']);
    expect(run(r.data, 'A')).toMatchObject({ endedAt: expect.any(String), endedBy: 'finished' });
    expect(Object.keys(r.data.runs.A).filter((k) => k === 'mode' || k === 'status')).toEqual([]);
    expect(r.said).toEqual({ kind: 'ended', name: 'Learn Spanish' });
    expect(undone(d, r.data)).toEqual(json(d));
  });

  it('P-96 (ruling 7; was: "in Plan, and still not the one the app is on"): on a run that is not the one the app is on, the same — it ends, never in Plan', () => {
    const r = ok(goal(), { kind: 'next', runId: 'A' });
    expect('mode' in r.data.runs.A).toBe(false);
    expect('status' in r.data.runs.A).toBe(false);
    expect(run(r.data, 'A').endedBy).toBe('finished');
  });

  it('P-96 (ruling 7; was: "reaches the edge the same way"): Done on an inner level that finishes the goal’s last step ends the run the same way', () => {
    const d = world([seq('E', 'Goal', [ref('lp', 'L')], { open: true }), seq('L', 'Inner', [step('a'), step('b')])], [aRun('A', 'E', [{ seq: 'E', at: 'lp', round: 1 }, { seq: 'L', at: 'a', round: 1, from: 'lp' }], { status: 'running' })]);
    const r = ok(d, { kind: 'done', runId: 'A' });
    expect(run(r.data, 'A')).toMatchObject({ endedAt: expect.any(String), endedBy: 'finished' });
    expect('mode' in r.data.runs.A).toBe(false);
    expect(r.said).toEqual({ kind: 'ended', name: 'Goal' });
  });

  it('a run stored at the edge as running by the build before: Plan normalises it (paused — P-101, ruling 4: no mode written); so does the first Plan edit, in the edit’s own write', () => {
    const legacy = world([seq('E', 'E', [], { open: true })], [aRun('A', 'E', [{ seq: 'E', at: null, round: 1 }], { status: 'running' })]);
    const planned = ok(legacy, { kind: 'plan', runId: 'A' }).data.runs.A;
    expect(planned).toMatchObject({ status: 'paused' });
    expect('mode' in planned).toBe(false);
    const added = edit(legacy, 'E', { kind: 'addStep', text: 'Find a tutor' });
    const made = readRoutine(added, 'E')!.items[0].id;
    // The step added at the edge is where the run stands — paused: Resume is a tap of its own.
    expect(at(added, 'A')).toEqual([`E:${made}:1`]);
    expect(added.runs.A).toMatchObject({ status: 'paused' });
    expect('mode' in added.runs.A).toBe(false);
    expect(isRunning(added, run(added, 'A'))).toBe(false);
    expect(undone(legacy, added)).toEqual(json(legacy));
  });
});

describe('mode: what is refused while planning, and what clears it', () => {
  it('Next, Step in and Back are refused ("planning") on a run an earlier build stored in Plan (P-101, ruling 4: the stored mode is still read; nothing writes it now); nothing changes', () => {
    const d = world([seq('R', 'R', [step('a'), ref('k', 'K'), step('c')]), seq('K', 'Kit', [step('k1')])], [aRun('A', 'R', [{ seq: 'R', at: 'k', round: 1 }], { status: 'paused', mode: 'plan' })]);
    for (const kind of ['next', 'stepIn', 'back'] as const) expect(go(d, { kind, runId: 'A' }), kind).toMatchObject({ ok: false, reason: 'planning', data: d });
  });

  it('at the edge Next is refused as before ("asking"), Step in and Back as planning', () => {
    const d = world([seq('E', 'E', [step('a')], { open: true })], [aRun('A', 'E', [{ seq: 'E', at: null, round: 1 }], { status: 'paused', mode: 'plan' })]);
    expect(go(d, { kind: 'next', runId: 'A' })).toMatchObject({ ok: false, reason: 'asking', data: d });
    expect(go(d, { kind: 'back', runId: 'A' })).toMatchObject({ ok: false, reason: 'planning', data: d });
    expect(go(d, { kind: 'stepIn', runId: 'A' })).toMatchObject({ ok: false, reason: 'planning', data: d });
  });

  it('Done is refused ("planning") on a step of a run an earlier build stored in Plan (P-101, ruling 4: read, never written now); at the edge it ends the run, and the mode goes with it', () => {
    const d = world([G()], [aRun('A', 'G', [{ seq: 'G', at: 'b', round: 1 }], { status: 'paused', mode: 'plan' })]);
    expect(go(d, { kind: 'done', runId: 'A' })).toMatchObject({ ok: false, reason: 'planning', data: d });
    const edge = world([seq('E', 'Goal', [step('a')], { open: true })], [aRun('A', 'E', [{ seq: 'E', at: null, round: 1 }], { status: 'paused', mode: 'plan' })]);
    const r = ok(edge, { kind: 'done', runId: 'A' });
    // (The second verb of this test: the clock moves a second per verb.)
    expect(run(r.data, 'A')).toMatchObject({ endedAt: new Date(T0 + 1000).toISOString(), endedBy: 'done' });
    expect(Object.keys(r.data.runs.A).filter((k) => k === 'mode' || k === 'status')).toEqual([]);
    expect(r.said).toEqual({ kind: 'ended', name: 'Goal' });
    expect(undone(edge, r.data)).toEqual(json(edge));
  });

  it('Resume ("Resume at <step>"): running, the mode gone as stored, exactly where it was — place, round and waiting-since', () => {
    const w = world([seq('R', 'R', [step('a'), wait('w')], { repeatFrom: 0 })], [aRun('A', 'R', [{ seq: 'R', at: 'w', round: 3 }], { status: 'running', waitingSince: '2026-11-24T09:00:00.000Z' })]);
    const d = ok(w, { kind: 'plan', runId: 'A' }).data;
    const r = ok(d, { kind: 'resume', runId: 'A' });
    expect(at(r.data, 'A')).toEqual(['R:w:3']);
    expect(json(r.data.runs.A)).toEqual({ ...json(w.runs.A), touchedAt: new Date(T0 + 1000).toISOString() });
  });

  it('Resume at the edge is refused ("asking"): there is nothing to resume at', () => {
    const d = world([seq('E', 'E', [], { open: true })], [aRun('A', 'E', [{ seq: 'E', at: null, round: 1 }], { status: 'paused', mode: 'plan' })]);
    expect(go(d, { kind: 'resume', runId: 'A' })).toMatchObject({ ok: false, reason: 'asking', data: d });
  });

  it('Resume of a run planned from a tile takes the slot like any Resume; the run that held it paused stops being the one', () => {
    let d = ok(base(), { kind: 'pause', runId: 'A' }).data;
    d = ok(d, { kind: 'plan', runId: 'B' }).data;
    const r = ok(d, { kind: 'resume', runId: 'B' });
    expect(r.data.runs.B.status).toBe('running');
    expect('mode' in r.data.runs.B).toBe(false);
    expect('status' in r.data.runs.A).toBe(false);
  });

  it('Start on the routine of a run opened in Plan resumes that run; Start of ANOTHER routine while a run is opened in Plan is allowed — it is not running — P-101 (ruling 4; was "and that run keeps its mode"): no mode was written', () => {
    const w = world([G(), seq('S', 'Sketch', [step('q')])], [aRun('A', 'G', [{ seq: 'G', at: 'b', round: 1 }], { status: 'running' })]);
    const d = ok(w, { kind: 'plan', runId: 'A' }).data;
    const same = ok(d, { kind: 'start', routineId: 'G' });
    expect(same.runId).toBe('A');
    expect(same.data.runs.A.status).toBe('running');
    expect('mode' in same.data.runs.A).toBe(false);
    const other = ok(d, { kind: 'start', routineId: 'S' });
    expect(run(other.data, other.runId!).status).toBe('running');
    expect('status' in other.data.runs.A).toBe(false);
    expect('mode' in other.data.runs.A).toBe(false);
    expect(isRunning(other.data, run(other.data, 'A'))).toBe(false);
  });

  it('Home keeps a stored mode (an earlier build left it in Plan); so does Pause — P-101 (ruling 4): read and kept, never converted', () => {
    const d = world([G()], [aRun('A', 'G', [{ seq: 'G', at: 'b', round: 1 }], { status: 'paused', mode: 'plan' })]);
    const left = ok(d, { kind: 'home', runId: 'A' }).data;
    expect('status' in left.runs.A).toBe(false);
    expect(left.runs.A.mode).toBe('plan');
    expect(ok(d, { kind: 'pause', runId: 'A', reason: 'x' }).data.runs.A).toMatchObject({ status: 'paused', mode: 'plan', reason: 'x' });
  });

  it('Jump (it sets the run going where the person really is) clears the mode', () => {
    const d = planning();
    const r = ok(d, { kind: 'jump', runId: 'A', to: { path: ['d'] } });
    expect(at(r.data, 'A')).toEqual(['G:d:1']);
    expect(r.data.runs.A.status).toBe('running');
    expect('mode' in r.data.runs.A).toBe(false);
  });

  it('a Jump that lands on nothing (the start of a routine with no steps) is the edge: in Plan, not running', () => {
    const d = world([seq('E', 'E', [], { open: true })], [aRun('A', 'E', [{ seq: 'E', at: null, round: 1 }], { status: 'paused', mode: 'plan' })]);
    const r = go(d, { kind: 'jump', runId: 'A', to: { level: 0 } });
    expect(r.ok).toBe(true);
    expect(run(r.data, 'A').status).not.toBe('running');
    expect(isPlanning(r.data, run(r.data, 'A'))).toBe(true);
  });
});

describe('mode: the tolerant reader', () => {
  const one = (extra: Record<string, unknown>) => world([seq('R', 'R', [step('a'), step('b')])], [aRun('A', 'R', [{ seq: 'R', at: 'a', round: 1 }], extra)]);

  it('a mode that is not "plan" (another word, a number, an object) is no mode; it is kept as stored when the run is written', () => {
    for (const mode of ['run', 'PLAN', 7, true, null, { plan: true }]) {
      const d = one({ status: 'paused', mode });
      expect(run(d, 'A').mode, JSON.stringify(mode)).toBeUndefined();
      expect(isPlanning(d, run(d, 'A'))).toBe(false);
      expect(ok(d, { kind: 'reason', runId: 'A', text: 'x' }).data.runs.A.mode).toEqual(mode);
    }
  });

  it('mode "plan" on a run stored as running (an old tab’s Resume): reads as running, the field ignored — and gone at the next write, so it can never come back as planning', () => {
    const d = one({ status: 'running', mode: 'plan' });
    expect(run(d, 'A').mode).toBeUndefined();
    expect(isPlanning(d, run(d, 'A'))).toBe(false);
    const next = ok(d, { kind: 'next', runId: 'A' }).data;
    expect(at(next, 'A')).toEqual(['R:b:1']);
    expect('mode' in next.runs.A).toBe(false);
    for (const verb of [{ kind: 'pause', runId: 'A' }, { kind: 'home', runId: 'A' }] as const) {
      const after = ok(d, verb).data;
      expect('mode' in after.runs.A, verb.kind).toBe(false);
      expect(isPlanning(after, run(after, 'A')), verb.kind).toBe(false);
    }
  });

  it('mode on an ended run is ignored; an ended run is never planning — not even one that ended at the edge', () => {
    const d = one({ mode: 'plan', endedAt: '2026-11-24T11:00:00.000Z' });
    expect(run(d, 'A').mode).toBeUndefined();
    expect(isPlanning(d, run(d, 'A'))).toBe(false);
    const edge = world([seq('E', 'E', [], { open: true })], [aRun('A', 'E', [{ seq: 'E', at: null, round: 1 }], { endedAt: '2026-11-24T11:00:00.000Z', endedBy: 'done' })]);
    expect(isPlanning(edge, run(edge, 'A'))).toBe(false);
  });

  it('a left run with mode "plan" reads its mode — P-101 (ruling 4; was "reads as planning"): it is not planning; it reads as paused', () => {
    const d = one({ mode: 'plan' });
    expect(run(d, 'A')).toMatchObject({ mode: 'plan' });
    expect(isPlanning(d, run(d, 'A'))).toBe(false);
  });
});

describe('creating (ruling 5): the routine only', () => {
  it('New: "<words>": tidied; a named routine with an open edge, on home, no steps — and NO run; it answers with the routine; one Undo removes it', () => {
    const r = go(emptyData(), { kind: 'new', words: '  Learn   Spanish ' });
    expect(r.ok).toBe(true);
    expect(Object.values(r.data.routines)).toEqual([{ id: r.routineId, words: 'Learn Spanish', named: true, createdAt: NOW, items: [], open: true, home: true }]);
    expect(r.data.runs).toEqual({});
    expect(r.runId).toBeUndefined();
    expect(undone(emptyData(), r.data)).toEqual(json(emptyData()));
  });

  it('with no words it is refused; with the name of a routine there is (one version per name) it answers with THAT routine and writes nothing; it never starts anything', () => {
    expect(go(emptyData(), { kind: 'new', words: '   ' })).toMatchObject({ ok: false, reason: 'empty' });
    const d = world([seq('R', 'Learn Spanish', [step('a')])]);
    const r = go(d, { kind: 'new', words: ' learn  SPANISH' });
    expect([r.ok, r.routineId, r.runId]).toEqual([true, 'R', undefined]);
    expect(r.data).toBe(d);
  });

  it('creating is not starting: allowed while another run is running, which goes on running', () => {
    const d = base();
    const r = ok(d, { kind: 'new', words: 'Learn Spanish' });
    expect(r.data.runs).toBe(d.runs);
    expect(Object.keys(r.data.routines)).toHaveLength(2);
  });

  it('Start on a routine with no steps is refused ("empty"): there is nothing to run, and no run is made; with a step it starts on it, running, with no mode', () => {
    for (const extra of [{}, { open: true }]) {
      const d = world([seq('R', 'R', [], extra)]);
      expect(go(d, { kind: 'start', routineId: 'R' })).toMatchObject({ ok: false, reason: 'empty', data: d });
    }
    const made = ok(emptyData(), { kind: 'new', words: 'Learn Spanish' });
    const withStep = edit(made.data, made.routineId!, { kind: 'addStep', text: 'Find a tutor' });
    const s = ok(withStep, { kind: 'start', routineId: made.routineId! });
    expect(here(s.data, s.runId!)).toBe('Find a tutor');
    expect(s.data.runs[s.runId!].status).toBe('running');
    expect('mode' in s.data.runs[s.runId!]).toBe(false);
  });
});

// ───────── The repair table (scout §3; ruling 7) ─────────

describe('Plan edits under live runs: the repair table', () => {
  const places = (d: Data) => [at(d, 'A'), at(d, 'B')];
  const HOME = [['G:b:1'], ['G:c:2']];

  it('add before / after HERE, and at the end: both runs unchanged (the same objects); the routine has the step', () => {
    const d = base();
    for (const e of [{ kind: 'addStep', text: 'x', after: 'a' }, { kind: 'addStep', text: 'x', after: 'b' }, { kind: 'addStep', text: 'x' }, { kind: 'addWait', wait: 'x', after: null }] as RoutineEdit[]) {
      const r = edit(d, 'G', e);
      expect(places(r), JSON.stringify(e)).toEqual(HOME);
      expect([r.runs.A, r.runs.B]).toEqual([d.runs.A, d.runs.B]);
      expect(r.runs.A).toBe(d.runs.A);
      expect(readRoutine(r, 'G')!.items).toHaveLength(5);
    }
    // After HERE, which is the last step above the divider: it joins the part that runs once.
    const added = (e: RoutineEdit) => ((n = 0), shape(edit(d, 'G', e), 'G'));
    expect(added({ kind: 'addStep', text: 'x', after: 'b' })).toBe('a b x1 | c d');
    expect(added({ kind: 'addStep', text: 'x', after: 'a' })).toBe('a x1 b | c d');
    expect(added({ kind: 'addStep', text: 'x' })).toBe('a b | c d x1');
  });

  it('reword HERE: the runs unchanged; the run reads the new words (what Resume will name)', () => {
    const d = base();
    const r = edit(d, 'G', { kind: 'reword', item: 'b', text: '  bench   press ' });
    expect(places(r)).toEqual(HOME);
    expect(r.runs.A).toBe(d.runs.A);
    expect(here(r, 'A')).toBe('bench press');
  });

  it('move a step up or down on its own side of the divider: the two swap, the divider stays where it stands, the runs unchanged', () => {
    const d = base();
    expect(shape(edit(d, 'G', { kind: 'move', item: 'a', by: 1 }), 'G')).toBe('b a | c d');
    expect(shape(edit(d, 'G', { kind: 'move', item: 'b', by: -1 }), 'G')).toBe('b a | c d');
    expect(shape(edit(d, 'G', { kind: 'move', item: 'd', by: -1 }), 'G')).toBe('a b | d c');
    expect(shape(edit(d, 'G', { kind: 'move', item: 'c', by: 1 }), 'G')).toBe('a b | d c');
    for (const [item, by] of [['a', 1], ['b', -1], ['d', -1], ['c', 1]] as const) expect(places(edit(d, 'G', { kind: 'move', item, by }))).toEqual(HOME);
  });

  // The orchestrator's ruling on "crosses alone" (P-90 part 2): in the list the divider is a row, and one
  // press moves one row. Across the divider nothing else moves: no step changes place, only the side.
  it('move HERE down across the divider: one press, one row — b passes the divider and nothing else moves (a | b c d)', () => {
    const d = base();
    const r = edit(d, 'G', { kind: 'move', item: 'b', by: 1 });
    expect(shape(r, 'G')).toBe('a | b c d');
    expect(readRoutine(r, 'G')!.items.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(places(r)).toEqual(HOME);
    expect(r.runs.A).toBe(d.runs.A);
    expect(undone(d, r)).toEqual(json(d));
    // The next press is an ordinary swap inside the repeating part.
    expect(shape(edit(r, 'G', { kind: 'move', item: 'b', by: 1 }), 'G')).toBe('a | c b d');
  });

  it('move the first repeating step up across the divider: it passes the divider and nothing else moves (a b c | d); the run on it keeps its round', () => {
    const d = base();
    const r = edit(d, 'G', { kind: 'move', item: 'c', by: -1 });
    expect(shape(r, 'G')).toBe('a b c | d');
    expect(readRoutine(r, 'G')!.items.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(places(r)).toEqual(HOME);
    expect(undone(d, r)).toEqual(json(d));
    expect(shape(edit(r, 'G', { kind: 'move', item: 'c', by: -1 }), 'G')).toBe('a c b | d');
  });

  it('the first step under a divider at the very top moves up past it (| a b → a | b); the last step cannot move down', () => {
    const d = world([seq('G', 'Gym', [step('a'), step('b')], { repeatFrom: 0 })], [aRun('A', 'G', [{ seq: 'G', at: 'a', round: 2 }], { status: 'running' })]);
    const r = edit(d, 'G', { kind: 'move', item: 'a', by: -1 });
    expect(shape(r, 'G')).toBe('a | b');
    expect(at(r, 'A')).toEqual(['G:a:2']);
    expect(editRoutine(d, 'G', { kind: 'move', item: 'b', by: 1 }, env())).toMatchObject({ ok: false, reason: 'cannot', data: d });
    expect(editRoutine(r, 'G', { kind: 'move', item: 'a', by: -1 }, env())).toMatchObject({ ok: false, reason: 'cannot' });
  });

  it('moving the only repeating step up out of the repeating part leaves nothing to repeat: the divider goes (written as none) and no step changes place', () => {
    const d = world([seq('G', 'Gym', [step('a'), step('b'), step('c')], { repeatFrom: 2, repeat: 3 })], [aRun('B', 'G', [{ seq: 'G', at: 'c', round: 2 }])]);
    const r = edit(d, 'G', { kind: 'move', item: 'c', by: -1 });
    expect(shape(r, 'G')).toBe('a b c');
    expect('repeatFrom' in r.routines.G).toBe(false);
    expect(at(r, 'B')).toEqual(['G:c:2']);
    expect(undone(d, r)).toEqual(json(d));
  });

  it('move the divider — across HERE too: only the divider moves (no step changes place); places and rounds unchanged; past the last step is refused', () => {
    const d = base();
    for (const from of [0, 1, 3]) {
      const r = edit(d, 'G', { kind: 'divider', from });
      expect(readRoutine(r, 'G')!.items.map((i) => i.id), String(from)).toEqual(['a', 'b', 'c', 'd']);
      expect(readRoutine(r, 'G')!.repeatFrom).toBe(from);
      expect(places(r), String(from)).toEqual(HOME);
      expect([r.runs.A, r.runs.B]).toEqual([d.runs.A, d.runs.B]);
    }
    // Up across HERE (b): b now repeats; the run on it is still on it, round 1.
    expect(shape(edit(d, 'G', { kind: 'divider', from: 1 }), 'G')).toBe('a | b c d');
    // Down across B's step (c): c now runs once; B is still on it, in the round it was in.
    expect(shape(edit(d, 'G', { kind: 'divider', from: 3 }), 'G')).toBe('a b c | d');
    const r = editRoutine(d, 'G', { kind: 'divider', from: 4 }, env());
    expect(r).toMatchObject({ ok: false, reason: 'cannot', data: d });
  });

  it('take the divider out: places and rounds unchanged', () => {
    const d = base();
    const r = edit(d, 'G', { kind: 'divider' });
    expect('repeatFrom' in r.routines.G).toBe(false);
    expect(places(r)).toEqual(HOME);
  });

  it('remove HERE (a middle step): the run stands on the next surviving step, same round; the other run untouched — and the same for the other run’s step', () => {
    const d = base();
    const r = edit(d, 'G', { kind: 'remove', item: 'b' });
    expect(places(r)).toEqual([['G:c:1'], ['G:c:2']]);
    expect(r.runs.B).toBe(d.runs.B);
    const r2 = edit(d, 'G', { kind: 'remove', item: 'c' });
    expect(places(r2)).toEqual([['G:b:1'], ['G:d:2']]);
    expect(shape(r2, 'G')).toBe('a b | d');
    expect([run(r, 'A').endedAt, run(r2, 'B').endedAt]).toEqual([undefined, undefined]);
  });

  it('remove HERE when it is the last step: the previous surviving step, same round; never ended, never a new round', () => {
    const d = world([G()], [aRun('A', 'G', [{ seq: 'G', at: 'd', round: 4 }], { status: 'running' })]);
    const r = edit(d, 'G', { kind: 'remove', item: 'd' });
    expect(at(r, 'A')).toEqual(['G:c:4']);
    expect(run(r, 'A').endedAt).toBeUndefined();
  });

  it('remove d then c (the only repeating steps): the run that was on them stands on b, its round kept; the divider falls off (written as none), the number stays; never ended', () => {
    const d = base({ repeat: 3 });
    const r = edit(edit(d, 'G', { kind: 'remove', item: 'd' }), 'G', { kind: 'remove', item: 'c' });
    expect(places(r)).toEqual([['G:b:1'], ['G:b:2']]);
    expect(shape(r, 'G')).toBe('a b');
    expect('repeatFrom' in r.routines.G).toBe(false);
    expect(r.routines.G.repeat).toBe(3);
    expect(run(r, 'B').endedAt).toBeUndefined();
  });

  it('remove every step: both runs are at the edge, rounds kept, never ended — which is planning: the one that was running is paused, the other without the slot (P-101, ruling 4: no mode written)', () => {
    let d = base();
    for (const item of ['a', 'b', 'c', 'd']) d = edit(d, 'G', { kind: 'remove', item });
    expect(places(d)).toEqual([['G:null:1'], ['G:null:2']]);
    expect([run(d, 'A').endedAt, run(d, 'B').endedAt]).toEqual([undefined, undefined]);
    expect(d.runs.A).toMatchObject({ status: 'paused' });
    expect(['mode' in d.runs.A, 'mode' in d.runs.B]).toEqual([false, false]);
    expect('status' in d.runs.B).toBe(false);
    expect([isPlanning(d, run(d, 'A')), isPlanning(d, run(d, 'B'))]).toEqual([true, true]);
  });

  it('make HERE a wait (same item, same id): the run on it waits since now; the other run untouched. And back to a step: it stops waiting', () => {
    const d = base();
    const r = edit(d, 'G', { kind: 'toWait', item: 'b' });
    expect(readRoutine(r, 'G')!.items[1]).toEqual({ id: 'b', wait: 'b' });
    expect(places(r)).toEqual(HOME);
    expect(run(r, 'A').waitingSince).toBe(NOW);
    expect(r.runs.B).toBe(d.runs.B);
    expect(undone(d, r)).toEqual(json(d));
    const back = edit(r, 'G', { kind: 'toStep', item: 'b' });
    expect(readRoutine(back, 'G')!.items[1]).toEqual({ id: 'b', text: 'b' });
    expect('waitingSince' in back.runs.A).toBe(false);
    expect(at(back, 'A')).toEqual(['G:b:1']);
  });

  it('make a wait / back to a step: refused on the wrong kind, on a routine, on a step that is not there; a field the app does not know stays on the item', () => {
    const d = world([seq('R', 'R', [step('a'), wait('w'), ref('k', 'K'), { id: 'x', text: 'kept', setsGoing: true } as Item]), seq('K', 'K', [])]);
    const no = (e: RoutineEdit) => editRoutine(d, 'R', e, env());
    expect(no({ kind: 'toWait', item: 'w' })).toMatchObject({ ok: false, data: d });
    expect(no({ kind: 'toStep', item: 'a' })).toMatchObject({ ok: false, data: d });
    expect(no({ kind: 'toWait', item: 'k' })).toMatchObject({ ok: false, data: d });
    expect(no({ kind: 'toStep', item: 'k' })).toMatchObject({ ok: false, data: d });
    expect(no({ kind: 'toWait', item: 'nope' })).toMatchObject({ ok: false, reason: 'no-such-step', data: d });
    expect(readRoutine(edit(d, 'R', { kind: 'toWait', item: 'x' }), 'R')!.items[3]).toEqual({ id: 'x', wait: 'kept', setsGoing: true });
  });

  it('break down HERE: the step becomes an unnamed sequence of its own words (same item id; not owned by any run), and the run on it stands on the first small step; the other run is not moved', () => {
    const d = base();
    const r = edit(d, 'G', { kind: 'breakDown', item: 'b', steps: [' warm  up ', '', '  ', 'three sets'] });
    const [u] = unnamed(r);
    expect(unnamed(r)).toHaveLength(1);
    expect(u).toEqual({ id: u.id, words: 'b', named: false, createdAt: NOW, items: [{ id: expect.any(String), text: 'warm up' }, { id: expect.any(String), text: 'three sets' }] });
    expect('ownerRunId' in u).toBe(false);
    expect(readRoutine(r, 'G')!.items[1]).toEqual({ id: 'b', ref: u.id });
    expect(shape(r, 'G')).toBe('a >b | c d');
    const first = readRoutine(r, u.id)!.items[0].id;
    expect(run(r, 'A').frames).toEqual([{ seq: 'G', at: 'b', round: 1 }, { seq: u.id, at: first, round: 1, from: 'b' }]);
    expect(here(r, 'A')).toBe('warm up');
    expect(r.runs.A.status).toBe('running');
    expect(r.runs.B).toBe(d.runs.B);
    expect(undone(d, r)).toEqual(json(d));
  });

  it('break down a step no run is on: the routine changes and no run is moved; a run deeper inside another step is not moved either', () => {
    const d = base();
    const r = edit(d, 'G', { kind: 'breakDown', item: 'd', steps: ['one'] });
    expect([r.runs.A, r.runs.B]).toEqual([d.runs.A, d.runs.B]);
    expect(r.runs.A).toBe(d.runs.A);
    expect(shape(r, 'G')).toBe('a b | c >d');
  });

  it('break down in Plan: the run stays paused (P-101, ruling 4; was "planning"), on the first small step ("Resume at <first small step>"); breaking that one down again goes one deeper', () => {
    const d = planning();
    const r = edit(d, 'G', { kind: 'breakDown', item: 'b', steps: ['one', 'two'] });
    expect(r.runs.A).toMatchObject({ status: 'paused' });
    expect('mode' in r.runs.A).toBe(false);
    expect(here(r, 'A')).toBe('one');
    const [u] = unnamed(r);
    const again = edit(r, u.id, { kind: 'breakDown', item: readRoutine(r, u.id)!.items[0].id, steps: ['half'] });
    expect(run(again, 'A').frames).toHaveLength(3);
    expect(here(again, 'A')).toBe('half');
    expect(unnamed(again)).toHaveLength(2);
  });

  it('break down: refused on a wait, on a routine, with no steps typed, on a step that is not there; nothing changes', () => {
    const d = world([seq('R', 'R', [step('a'), wait('w'), ref('k', 'K')]), seq('K', 'K', [])]);
    const no = (e: RoutineEdit) => editRoutine(d, 'R', e, env());
    expect(no({ kind: 'breakDown', item: 'w', steps: ['x'] })).toMatchObject({ ok: false, reason: 'not-a-step', data: d });
    expect(no({ kind: 'breakDown', item: 'k', steps: ['x'] })).toMatchObject({ ok: false, reason: 'not-a-step', data: d });
    expect(no({ kind: 'breakDown', item: 'a', steps: [' ', ''] })).toMatchObject({ ok: false, reason: 'no-steps', data: d });
    expect(no({ kind: 'breakDown', item: 'nope', steps: ['x'] })).toMatchObject({ ok: false, reason: 'no-such-step', data: d });
  });

  it('break down at the deepest level a run can be in (64): the routine still changes; the run is not pushed deeper', () => {
    const self = world([seq('S', 'Self', [ref('s', 'S'), step('z')])], [aRun('A', 'S', [...Array.from({ length: MAX_DEPTH - 1 }, (_, i) => ({ seq: 'S', at: 's', round: 1, ...(i && { from: 's' }) })), { seq: 'S', at: 'z', round: 1, from: 's' }], { status: 'running' })]);
    expect(run(self, 'A').frames).toHaveLength(MAX_DEPTH);
    const r = edit(self, 'S', { kind: 'breakDown', item: 'z', steps: ['x'] });
    // (As stored: the reader would hide a 65th level.)
    expect(r.runs.A.frames).toHaveLength(MAX_DEPTH);
    expect(r.runs.A).toBe(self.runs.A);
    expect(shape(r, 'S')).toBe('>s >z');
  });

  it('the number: to 3, and to 1 below the round a run is in — places and rounds unchanged; that run’s Next goes on in its round, and the loop ends at the next last step', () => {
    const d = base();
    for (const times of [3, 1, undefined]) {
      const r = edit(d, 'G', { kind: 'repeat', ...(times !== undefined && { times }) });
      expect(places(r), String(times)).toEqual(HOME);
      expect([r.runs.A, r.runs.B]).toEqual([d.runs.A, d.runs.B]);
    }
    const one = edit(d, 'G', { kind: 'repeat', times: 1 });
    const onD = ok(one, { kind: 'next', runId: 'B' }).data;
    expect(at(onD, 'B')).toEqual(['G:d:2']);
    // d is the last step and round 2 is past the number: the level is finished (an open goal: since P-96, ruling 7, the run ends — it used to reach the edge).
    expect(run(ok(onD, { kind: 'next', runId: 'B' }).data, 'B')).toMatchObject({ endedBy: 'finished', frames: [{ seq: 'G', at: 'd', round: 2 }] });
  });

  it('rename: places unchanged; the runs are the same objects', () => {
    const d = base();
    const r = edit(d, 'G', { kind: 'rename', words: 'Gym day' });
    expect(r.routines.G.words).toBe('Gym day');
    expect([r.runs.A, r.runs.B]).toEqual([d.runs.A, d.runs.B]);
    expect(r.runs.A).toBe(d.runs.A);
  });

  it('ONE Undo restores the routine and every repaired run together, for each edit', () => {
    const d = planning();
    const edits: RoutineEdit[] = [
      { kind: 'addStep', text: 'x', after: 'a' },
      { kind: 'addStep', text: 'x' },
      { kind: 'addWait', wait: 'x', after: 'b' },
      { kind: 'reword', item: 'b', text: 'bee' },
      { kind: 'move', item: 'b', by: 1 },
      { kind: 'move', item: 'c', by: -1 },
      { kind: 'remove', item: 'b' },
      { kind: 'remove', item: 'c' },
      { kind: 'breakDown', item: 'b', steps: ['one', 'two'] },
      { kind: 'toWait', item: 'b' },
      { kind: 'divider', from: 1 },
      { kind: 'divider' },
      { kind: 'repeat', times: 2 },
      { kind: 'open', open: false },
      { kind: 'rename', words: 'Gym day' },
    ];
    for (const e of edits) {
      const after = edit(d, 'G', e);
      expect(after, JSON.stringify(e)).not.toBe(d);
      expect(undone(d, after), JSON.stringify(e)).toEqual(json(d));
    }
    // …and removing every step, one Undo at a time, back to the start.
    let cur = d;
    const trail: Data[] = [];
    for (const item of ['a', 'b', 'c', 'd']) {
      trail.push(cur);
      cur = edit(cur, 'G', { kind: 'remove', item });
    }
    for (const was of trail.reverse()) cur = undone(was, cur);
    expect(cur).toEqual(json(d));
  });

  it('an edit in Plan never sets the run going (P-101, ruling 4; was "never takes the run out of Plan"): after each, it is still paused, not running, on a step that is there', () => {
    const d = planning();
    for (const e of [{ kind: 'remove', item: 'b' }, { kind: 'move', item: 'b', by: 1 }, { kind: 'toWait', item: 'b' }, { kind: 'breakDown', item: 'b', steps: ['x'] }, { kind: 'addStep', text: 'x' }, { kind: 'divider', from: 0 }] as RoutineEdit[]) {
      const r = edit(d, 'G', e);
      expect(r.runs.A, JSON.stringify(e)).toMatchObject({ status: 'paused' });
      expect(isRunning(r, run(r, 'A'))).toBe(false);
      expect(place(r, run(r, 'A'))!.repaired).toBe(false);
    }
  });

  it('at the edge in Plan, a step added at the end is where the run stands (still planning); a step added anywhere else does not move it', () => {
    const d = world([seq('E', 'Goal', [step('a')], { open: true })], [aRun('A', 'E', [{ seq: 'E', at: null, round: 2 }], { status: 'paused', mode: 'plan' })]);
    const r = edit(d, 'E', { kind: 'addStep', text: 'next' });
    expect(at(r, 'A')).toEqual([`E:${readRoutine(r, 'E')!.items[1].id}:2`]);
    expect(r.runs.A).toMatchObject({ status: 'paused', mode: 'plan' });
    expect(at(edit(d, 'E', { kind: 'addStep', text: 'first', after: null }), 'A')).toEqual(['E:null:2']);
  });

  it('thirty steps: removing HERE in the middle, and every step after it, keeps the run standing', () => {
    const many = world([seq('B', 'Big', Array.from({ length: 30 }, (_, i) => step(`s${i}`)))], [aRun('A', 'B', [{ seq: 'B', at: 's15', round: 1 }], { status: 'paused', mode: 'plan' })]);
    let d = edit(many, 'B', { kind: 'remove', item: 's15' });
    expect(at(d, 'A')).toEqual(['B:s16:1']);
    for (let i = 16; i < 30; i++) d = edit(d, 'B', { kind: 'remove', item: `s${i}` });
    expect(at(d, 'A')).toEqual(['B:s14:1']);
  });
});

// ───────── The fold (ruling 3), on data frozen from the build before ─────────

describe('runs that carry this-run changes from the build before: folded into the routine when Plan is first opened', () => {
  const BEFORE = JSON.parse(readFileSync(join(__dirname, '../storage/fixtures/golden/p90-expected.json'), 'utf8')).data as Data;
  const [DESK, ENDED, AT_EDGE, JOBS, A, B, TAILOR, JOB_AD] = ['p90-001', 'p90-002', 'p90-006', 'p90-007', 'p90-008', 'p90-run-b', 'p90-019', 'p90-023'];
  const frozen = () => json(BEFORE);
  /** Every sequence a run reads, as it reads it: the steps’ ids and words, the divider and the number. */
  const reading = (d: Data, runId: Id) =>
    Object.keys(d.routines).map((id) => {
      const r = run(d, runId);
      const s = view(d, r, id)!;
      return { id, items: s.items.map((i) => [i.id, wordsOf(d, r, i)]), repeatFrom: s.repeatFrom, repeat: s.repeat };
    });

  it('Plan from its tile: the routine takes every change — the step added, reworded, removed, the number, both breakdowns, the reword inside — and the run reads EXACTLY what it read before', () => {
    const d = frozen();
    const was = reading(d, A);
    const r = ok(d, { kind: 'plan', runId: A });
    // What the routine now holds, from the frozen changes by hand.
    expect(r.data.routines[JOBS]).toEqual({
      ...BEFORE.routines[JOBS],
      items: [{ id: 'p90-009', text: 'Open the tracker' }, { id: 'p90-011', ref: TAILOR }, { id: 'p90-014', text: 'Ask Sam to proofread' }, { id: 'p90-012', wait: 'a reply' }, { id: 'p90-013', text: 'Log it in the sheet' }],
      repeatFrom: 1,
      repeat: 5,
    });
    const { ownerRunId: _o1, ...tailor } = BEFORE.routines[TAILOR];
    const { ownerRunId: _o2, ...jobAd } = BEFORE.routines[JOB_AD];
    expect(r.data.routines[TAILOR]).toEqual({ ...tailor, items: [{ id: 'p90-020', ref: JOB_AD }, { id: 'p90-021', text: 'Rewrite the summary' }] });
    expect(r.data.routines[JOB_AD]).toEqual({ ...jobAd, items: [{ id: 'p90-024', text: 'Find the right tab' }, { id: 'p90-025', text: 'Copy the requirements' }] });
    // The run: no changes left, exactly where it was; not the one the app is on (it was not). P-101 (ruling 4): no mode written.
    expect(r.data.runs[A]).toEqual({ ...BEFORE.runs[A], changes: [], touchedAt: NOW });
    expect(reading(r.data, A)).toEqual(was);
    expect(r.folded).toBe('Apply for jobs');
    expect(place(r.data, run(r.data, A))!.repaired).toBe(false);
  });

  it('it is ONE write, and one Undo restores every record exactly: the routine, both breakdowns (owned by the run again) and the run with its changes', () => {
    const d = frozen();
    const r = ok(d, { kind: 'plan', runId: A });
    expect(undone(d, r.data)).toEqual(BEFORE);
  });

  it('nothing else is touched: the other run of that routine (still on its step, still paused, the one the app is on), the ended run and its change, the run at the edge, the other routines', () => {
    const d = frozen();
    const r = ok(d, { kind: 'plan', runId: A });
    for (const id of [B, ENDED, AT_EDGE]) expect(r.data.runs[id], id).toBe(d.runs[id]);
    for (const id of [DESK, 'p90-005']) expect(r.data.routines[id], id).toBe(d.routines[id]);
    expect(here(r.data, B)).toBe('a reply');
    expect(run(r.data, B)).toMatchObject({ status: 'paused', waitingSince: '2026-11-24T17:20:00.000Z' });
  });

  it('never at load, never by reading: until Plan is opened on it the run keeps its changes and reads as before (it can be resumed and run on as it was)', () => {
    const d = frozen();
    const was = reading(d, A);
    const paused = ok(d, { kind: 'pause', runId: B }).data;
    const on = ok(ok(ok(paused, { kind: 'home', runId: B }).data, { kind: 'resume', runId: A }).data, { kind: 'next', runId: A }).data;
    expect(run(on, A).changes).toHaveLength(7);
    expect(reading(on, A)).toEqual(was);
    expect(here(on, A)).toBe('Copy the requirements');
    expect(on.routines).toBe(d.routines);
  });

  it('opened again, there is nothing left to fold: nothing is written', () => {
    const once = ok(frozen(), { kind: 'plan', runId: A }).data;
    const again = ok(once, { kind: 'plan', runId: A });
    expect(again.data).toBe(once);
    expect(again.folded).toBeUndefined();
  });

  it('from the runner (the run running, with changes): the fold and the pause are one write and one Undo (P-101, ruling 4: no mode)', () => {
    const d = frozen();
    delete d.runs[B].status;
    d.runs[A].status = 'running';
    const r = ok(d, { kind: 'plan', runId: A });
    expect(r.data.runs[A]).toMatchObject({ status: 'paused', changes: [] });
    expect('mode' in r.data.runs[A]).toBe(false);
    expect(r.folded).toBe('Apply for jobs');
    expect(undone(d, r.data)).toEqual(json(d));
  });

  it('a change whose step is no longer in the routine is dropped quietly; a change this version does not understand stays in the run, untouched', () => {
    const d = frozen();
    const odd = { id: 'c-odd', kind: 'who-knows', seq: JOBS, x: 1 };
    (d.runs[A].changes as unknown[]).push({ id: 'c-gone', kind: 'reword', seq: JOBS, item: 'not-there', text: 'nothing to change' }, odd, 7);
    const r = ok(d, { kind: 'plan', runId: A });
    expect(r.data.runs[A].changes).toEqual([odd, 7]);
    expect(run(r.data, A).changes).toEqual([]);
    expect(texts(r.data, JOBS)).toEqual(['Open the tracker', 'ref', 'Ask Sam to proofread', 'wait:a reply', 'Log it in the sheet']);
    expect(undone(d, r.data)).toEqual(json(d));
  });

  it('the divider stands exactly where the run read it — also when a step was added after one that was then removed, right at the divider (replaying the changes one by one would move it)', () => {
    // [a | b c]; for this run: X added after b, then b removed. The run reads [a | X c].
    const d = world([seq('R', 'R', [step('a'), step('b'), step('c')], { repeatFrom: 1 })], [aRun('A', 'R', [{ seq: 'R', at: 'c', round: 1 }], { changes: [{ id: 'c1', kind: 'add', seq: 'R', after: 'b', item: { id: 'X', text: 'X' } }, { id: 'c2', kind: 'remove', seq: 'R', item: 'b' }] })]);
    expect(reading(d, 'A')).toEqual([{ id: 'R', items: [['a', 'a'], ['X', 'X'], ['c', 'c']], repeatFrom: 1, repeat: undefined }]);
    const r = ok(d, { kind: 'plan', runId: 'A' });
    expect(shape(r.data, 'R')).toBe('a | X c');
    expect(reading(r.data, 'A')).toEqual(reading(d, 'A'));
    expect(undone(d, r.data)).toEqual(json(d));
  });

  it('what the routine holds that this version cannot read (an item of no kind, a number it does not understand) stays in it through the fold', () => {
    const odd = { id: 'q', later: true };
    const d = world([seq('R', 'R', [step('a'), odd as unknown as Item, step('b'), 7 as unknown as Item], { repeatFrom: 'x', repeat: 'many' })], [aRun('A', 'R', [{ seq: 'R', at: 'a', round: 1 }], { changes: [{ id: 'c1', kind: 'reword', seq: 'R', item: 'b', text: 'bee' }] })]);
    const r = ok(d, { kind: 'plan', runId: 'A' });
    expect(r.data.routines.R).toEqual({ ...d.routines.R, items: [step('a'), odd, step('b', 'bee'), 7] });
  });

  it('a breakdown whose sequence is gone (damaged data): the step keeps its own words in the routine — never a step pointing at nothing', () => {
    const d = world([seq('R', 'R', [step('a', 'Write the report'), step('b')])], [aRun('A', 'R', [{ seq: 'R', at: 'b', round: 1 }], { changes: [{ id: 'c1', kind: 'breakdown', seq: 'R', item: 'a', into: 'not-there' }, { id: 'c2', kind: 'reword', seq: 'R', item: 'b', text: 'bee' }] })]);
    const r = ok(d, { kind: 'plan', runId: 'A' });
    expect(readRoutine(r.data, 'R')!.items).toEqual([step('a', 'Write the report'), step('b', 'bee')]);
    expect(run(r.data, 'A').changes).toEqual([]);
  });

  it('an ENDED run’s leftover changes are never folded and never asked about: Plan is refused, the routine keeps its own words', () => {
    const d = frozen();
    expect(go(d, { kind: 'plan', runId: ENDED })).toMatchObject({ ok: false, reason: 'ended', data: d });
    expect(texts(d, DESK)).toEqual(['Clear the cups']);
  });

  it('P-96 (ruling 7; was: "reaching the edge is opening Plan … folds"): Next off an open goal’s last step ENDS the run instead — and an ended run’s changes are never folded: the routine keeps its words; Undo takes the Next back', () => {
    const d = world([seq('E', 'Goal', [step('a', 'Write')], { open: true })], [aRun('A', 'E', [{ seq: 'E', at: 'a', round: 1 }], { status: 'running', changes: [{ id: 'c1', kind: 'reword', seq: 'E', item: 'a', text: 'Draft' }] })]);
    const r = ok(d, { kind: 'next', runId: 'A' });
    expect(run(r.data, 'A')).toMatchObject({ endedBy: 'finished', changes: [expect.objectContaining({ id: 'c1' })] });
    expect(texts(r.data, 'E')).toEqual(['Write']);
    expect(r.folded).toBeUndefined();
    expect(undone(d, r.data)).toEqual(json(d));
  });

  it('after the fold, a Plan edit is the routine’s and the run reads it (the reason for folding): the reworded step can be reworded, the added one removed', () => {
    const folded = ok(frozen(), { kind: 'plan', runId: A }).data;
    const reworded = edit(folded, JOBS, { kind: 'reword', item: 'p90-013', text: 'Log it' });
    expect(view(reworded, run(reworded, A), JOBS)!.items[4]).toEqual({ id: 'p90-013', text: 'Log it' });
    const removed = edit(reworded, JOBS, { kind: 'remove', item: 'p90-014' });
    expect(texts(removed, JOBS)).toEqual(['Open the tracker', 'ref', 'wait:a reply', 'Log it']);
    // Removing the step it is inside (three levels deep): it stands on the next step of the routine, round kept.
    const out = edit(removed, JOBS, { kind: 'remove', item: 'p90-011' });
    expect(at(out, A)).toEqual([`${JOBS}:p90-012:2`]);
    expect(run(out, A).waitingSince).toBeDefined();
  });

  function texts(d: Data, routineId: Id) {
    return readRoutine(d, routineId)!.items.map((i) => ('text' in i ? i.text : 'wait' in i ? `wait:${i.wait}` : 'ref'));
  }
});

describe('after the audit, F1: a run the build before left at the edge stored "running" is planning — it is not what is running', () => {
  // Gym [a b], open; A finished its steps and the build before kept it "running" on its blank note.
  // House has nothing going; Other has a run left on a step.
  const legacy = () =>
    world(
      [seq('G', 'Gym', [step('a'), step('b')], { open: true, home: true }), seq('H', 'House', [step('h1')], { home: true }), seq('O', 'Other', [step('o1'), step('o2')], { home: true })],
      [aRun('A', 'G', [{ seq: 'G', at: null, round: 1 }], { status: 'running' }), aRun('B', 'O', [{ seq: 'O', at: 'o1', round: 1 }])],
    );
  const storedRunning = (d: Data) => Object.values(d.runs).filter((r) => r.status === 'running').map((r) => r.id);

  it('one definition of running: stored running AND not in Plan', () => {
    const d = legacy();
    expect(isPlanning(d, run(d, 'A'))).toBe(true);
    expect(isRunning(d, run(d, 'A'))).toBe(false);
    expect(isRunning(base(), run(base(), 'A'))).toBe(true);
    expect(isRunning(base(), run(base(), 'B'))).toBe(false);
    expect(isRunning(planning(), run(planning(), 'A'))).toBe(false);
  });

  it('Start on another routine is not refused; in that same write the edge run is stored not running (P-101, ruling 4: and no mode) — one running run', () => {
    const d = legacy();
    const r = go(d, { kind: 'start', routineId: 'H' });
    expect(r.ok, r.reason).toBe(true);
    expect(storedRunning(r.data)).toEqual([r.runId]);
    expect(r.data.runs.A.status).toBeUndefined();
    expect('mode' in r.data.runs.A).toBe(false);
    expect(at(r.data, 'A')).toEqual(['G:null:1']);
    expect(isPlanning(r.data, run(r.data, 'A'))).toBe(true);
    expect(undone(d, r.data)).toEqual(json(d));
  });

  it('Resume on another run is not refused; the edge run is stored not running in that write (P-101, ruling 4: and no mode)', () => {
    const d = legacy();
    const r = go(d, { kind: 'resume', runId: 'B' });
    expect(r.ok, r.reason).toBe(true);
    expect(storedRunning(r.data)).toEqual(['B']);
    expect(r.data.runs.A.status).toBeUndefined();
    expect('mode' in r.data.runs.A).toBe(false);
    expect(undone(d, r.data)).toEqual(json(d));
  });

  it('Pause and Home on that run itself leave it not running — P-101 (ruling 4; was "stored in Plan"): no mode is written; it is still the edge (Plan is its way in)', () => {
    for (const verb of [{ kind: 'pause', runId: 'A' }, { kind: 'home', runId: 'A' }] as const) {
      const after = ok(legacy(), verb).data;
      expect(after.runs.A.status, verb.kind).not.toBe('running');
      expect('mode' in after.runs.A, verb.kind).toBe(false);
      expect(isPlanning(after, run(after, 'A')), verb.kind).toBe(true);
    }
  });

  it('a run that really is running on a step still refuses a Start elsewhere, saying what is running', () => {
    const d = world([G(), seq('H', 'House', [step('h1')])], [aRun('A', 'G', [{ seq: 'G', at: 'b', round: 1 }], { status: 'running' })]);
    expect(go(d, { kind: 'start', routineId: 'H' })).toMatchObject({ ok: false, reason: 'running', running: { runId: 'A', name: 'Gym' }, data: d });
  });
});
