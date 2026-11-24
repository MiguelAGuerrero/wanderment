/**
 * P-86: the execution table (.polish/current/P-86/scout-domain.md, section 2), one test per row, as
 * the contract reads it. Expected values come from the table and B-11 (9b, 9c first), never from
 * running the engine. Notation in the names: [a b | c d] = items with the Repeat divider before c;
 * places are written seq:at:round, bottom frame first.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { applyUndo, undoEntry } from './diff';
import { Change, editRoutine, Env, Item, MAX_DEPTH, place, previous, readRoutine, readRun, Result, runVerb, Verb, view, wordsOf } from './run';
import { Data, emptyData, Id, Routine, Run } from './types';

const T0 = Date.UTC(2026, 10, 24, 10, 0, 0);
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
const step = (id: string, text = id): Item => ({ id, text });
const wait = (id: string, w = id): Item => ({ id, wait: w });
const ref = (id: string, to: string): Item => ({ id, ref: to });
const seq = (id: string, words: string, items: Item[], extra: Record<string, unknown> = {}): Routine => ({ id, words, named: true, createdAt: '2026-11-01T00:00:00.000Z', items, ...extra });
const world = (...ss: Routine[]): Data => ({ ...emptyData(), routines: Object.fromEntries(ss.map((s) => [s.id, s])) });
const run = (d: Data, id: Id) => readRun(d, id)!;
const at = (d: Data, id: Id) => run(d, id).frames.map((f) => `${f.seq}:${f.at}:${f.round}`);
const start = (d: Data, routineId: Id) => {
  const r = ok(d, { kind: 'start', routineId });
  return { d: r.data, id: r.runId! };
};
type Simple = 'next' | 'done' | 'stepIn' | 'back';
/** Several plain verbs in a row, each of which must be accepted. */
const walk = (d: Data, runId: Id, ...kinds: Simple[]) => kinds.reduce((data, kind) => ok(data, { kind, runId }).data, d);
const texts = (d: Data, routineId: Id) => readRoutine(d, routineId)!.items.map((i) => ('text' in i ? i.text : 'wait' in i ? `wait:${i.wait}` : `ref:${i.ref}`));
const here = (d: Data, id: Id) => wordsOf(d, run(d, id), place(d, run(d, id))!.item);
const json = (v: unknown) => JSON.parse(JSON.stringify(v));
const undone = (before: Data, after: Data) => json(applyUndo(after, undoEntry(before, after)));
const unnamed = (d: Data) => Object.values(d.routines).filter((r) => !r.named);

describe('Start', () => {
  it('a routine with nothing open: a new run on its first step, round 1, running, started and touched now, no changes', () => {
    const d0 = world(seq('R', 'Report', [step('a'), step('b')]));
    const r = go(d0, { kind: 'start', routineId: 'R' });
    expect(r.ok).toBe(true);
    const x = run(r.data, r.runId!);
    expect(at(r.data, r.runId!)).toEqual(['R:a:1']);
    expect(x.changes).toEqual([]);
    expect(x.status).toBe('running');
    expect(x.routineId).toBe('R');
    expect(x.startedAt).toBe(new Date(T0).toISOString());
    expect(x.touchedAt).toBe(new Date(T0).toISOString());
    expect(x.waitingSince).toBeUndefined();
    expect(x.endedAt).toBeUndefined();
    expect(r.data.routines.R).toBe(d0.routines.R); // the routine is not rewritten by running it
  });

  it('a routine whose first item is a wait: waiting since the start', () => {
    const { d, id } = start(world(seq('R', 'R', [wait('w', 'a reply')])), 'R');
    expect(run(d, id).waitingSince).toBe(new Date(T0).toISOString());
  });

  it('a routine with no items (ends here or open): the run asks for a step (R:null:1), it cannot run nothing', () => {
    for (const extra of [{}, { open: true }]) {
      const { d, id } = start(world(seq('R', 'R', [], extra)), 'R');
      expect(at(d, id)).toEqual(['R:null:1']);
      expect(run(d, id).status).toBe('running');
    }
  });

  it('a routine that already has an open run (a double tap; its tile reads Resume): that run is resumed, no second run', () => {
    const a = start(world(seq('R', 'R', [step('a'), step('b')])), 'R');
    const paused = ok(a.d, { kind: 'pause', runId: a.id }).data;
    const again = go(paused, { kind: 'start', routineId: 'R' });
    expect(again.ok).toBe(true);
    expect(again.runId).toBe(a.id);
    expect(Object.keys(again.data.runs)).toEqual([a.id]);
    expect(run(again.data, a.id).status).toBe('running');
  });

  it('while another run is running: refused, saying what is running; nothing changes', () => {
    const a = start(world(seq('R', 'Report', [step('a')]), seq('S', 'Sketch', [step('c')])), 'R');
    const r = go(a.d, { kind: 'start', routineId: 'S' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('running');
    expect(r.running).toEqual({ runId: a.id, name: 'Report' });
    expect(r.data).toBe(a.d);
    // "New: …" is a start too.
    const fresh = go(a.d, { kind: 'new', words: 'Learn Spanish' });
    expect([fresh.ok, fresh.reason, fresh.running]).toEqual([false, 'running', { runId: a.id, name: 'Report' }]);
    expect(fresh.data).toBe(a.d);
  });

  it('while another run is paused: it stops being the one the app is on (its reason and place stay); one Undo restores both', () => {
    const a = start(world(seq('R', 'R', [step('a'), step('b')]), seq('S', 'S', [step('c')])), 'R');
    const paused = ok(a.d, { kind: 'pause', runId: a.id, reason: 'later' }).data;
    const b = ok(paused, { kind: 'start', routineId: 'S' });
    expect(run(b.data, a.id).status).toBeUndefined();
    expect(run(b.data, a.id).reason).toBe('later');
    expect(at(b.data, a.id)).toEqual(['R:a:1']);
    expect(run(b.data, b.runId!).status).toBe('running');
    expect(undone(paused, b.data)).toEqual(json(paused));
  });

  it('New: "<words>": tidied; a named routine with an open edge, on home, and a run asking for its first small step; one Undo removes both', () => {
    const r = go(emptyData(), { kind: 'new', words: '  Learn   Spanish ' });
    expect(r.ok).toBe(true);
    const made = Object.values(r.data.routines);
    expect(made).toHaveLength(1);
    expect(made[0]).toMatchObject({ words: 'Learn Spanish', named: true, items: [], open: true, home: true, createdAt: new Date(T0).toISOString() });
    expect(at(r.data, r.runId!)).toEqual([`${made[0].id}:null:1`]);
    expect(run(r.data, r.runId!).status).toBe('running');
    expect(undone(emptyData(), r.data)).toEqual(json(emptyData()));
  });

  it('New: with no words is refused; with the name of a routine there is (one version per name) starts that routine instead', () => {
    const none = go(emptyData(), { kind: 'new', words: '   ' });
    expect([none.ok, none.reason]).toEqual([false, 'empty']);
    const d0 = world(seq('R', 'Learn Spanish', [step('a')]));
    const r = go(d0, { kind: 'new', words: ' learn  SPANISH' });
    expect(r.ok).toBe(true);
    expect(Object.keys(r.data.routines)).toEqual(['R']);
    expect(at(r.data, r.runId!)).toEqual(['R:a:1']);
  });

  it('Resume: running, any other no longer current, touched; its reason and place untouched; refused once ended or gone', () => {
    const a = start(world(seq('R', 'R', [step('a'), step('b')]), seq('S', 'S', [step('c')])), 'R');
    let d = ok(a.d, { kind: 'pause', runId: a.id, reason: 'lunch' }).data;
    const b = ok(d, { kind: 'start', routineId: 'S' });
    d = ok(b.data, { kind: 'pause', runId: b.runId! }).data;
    const r = ok(d, { kind: 'resume', runId: a.id });
    expect(run(r.data, a.id)).toMatchObject({ status: 'running', reason: 'lunch', touchedAt: new Date(T0 + 4000).toISOString() });
    expect(at(r.data, a.id)).toEqual(['R:a:1']);
    expect(run(r.data, b.runId!).status).toBeUndefined();
    expect(r.said).toBeUndefined();
    const ended = ok(r.data, { kind: 'done', runId: a.id }).data;
    expect(go(ended, { kind: 'resume', runId: a.id })).toMatchObject({ ok: false, reason: 'ended' });
    expect(go(ended, { kind: 'resume', runId: 'nope' })).toMatchObject({ ok: false, reason: 'gone' });
  });
});

describe('Next', () => {
  it('a plain step, not the last: the next item, same round, touched', () => {
    const { d, id } = start(world(seq('R', 'R', [step('a'), step('b')])), 'R');
    const r = ok(d, { kind: 'next', runId: id });
    expect(at(r.data, id)).toEqual(['R:b:1']);
    expect(run(r.data, id).touchedAt).toBe(new Date(T0 + 1000).toISOString());
    expect(r.said).toBeUndefined();
    expect(r.offer).toEqual([]);
  });

  it('on a wait step ("It’s happened"): as a step; waiting-since set on arriving at a wait, kept while there, gone on leaving, set anew on the next wait', () => {
    let { d, id } = start(world(seq('R', 'R', [step('a'), wait('w', 'a reply'), wait('v', 'the post'), step('b')])), 'R');
    expect(run(d, id).waitingSince).toBeUndefined();
    d = walk(d, id, 'next');
    expect(run(d, id).waitingSince).toBe(new Date(T0 + 1000).toISOString());
    d = ok(d, { kind: 'pause', runId: id }).data;
    d = ok(d, { kind: 'resume', runId: id }).data;
    expect(run(d, id).waitingSince).toBe(new Date(T0 + 1000).toISOString());
    d = walk(d, id, 'next'); // onto the second wait
    expect(at(d, id)).toEqual(['R:v:1']);
    expect(run(d, id).waitingSince).toBe(new Date(T0 + 4000).toISOString());
    d = walk(d, id, 'next');
    expect(at(d, id)).toEqual(['R:b:1']);
    expect(run(d, id).waitingSince).toBeUndefined();
  });

  it('[| a b] until I’m done: the last item comes round to the first, round + 1, saying nothing', () => {
    const { d, id } = start(world(seq('R', 'R', [step('a'), step('b')], { repeatFrom: 0 })), 'R');
    const r = ok(walk(d, id, 'next'), { kind: 'next', runId: id });
    expect(at(r.data, id)).toEqual(['R:a:2']);
    expect(r.said).toBeUndefined();
  });

  it('[s | a b]: the part above the divider runs once; the last item comes round to the divider', () => {
    const { d, id } = start(world(seq('R', 'R', [step('s'), step('a'), step('b')], { repeatFrom: 1 })), 'R');
    expect(at(walk(d, id, 'next', 'next', 'next'), id)).toEqual(['R:a:2']);
    expect(at(walk(d, id, 'next', 'next', 'next', 'next', 'next'), id)).toEqual(['R:a:3']);
  });

  it('[| a b] 2 times: round 1 comes round; the last item of round 2 finishes the level by itself', () => {
    let { d, id } = start(world(seq('R', 'R', [step('a'), step('b')], { repeatFrom: 0, repeat: 2 })), 'R');
    d = walk(d, id, 'next', 'next');
    expect(at(d, id)).toEqual(['R:a:2']);
    d = walk(d, id, 'next');
    const r = ok(d, { kind: 'next', runId: id });
    expect(run(r.data, id).endedAt).toBeDefined();
  });

  it('a number at or below the round finishes (>=, so a number lowered under the round you are on still ends); a number of 1 runs once', () => {
    let { d, id } = start(world(seq('R', 'R', [step('a')], { repeatFrom: 0, repeat: 5 })), 'R');
    d = walk(d, id, 'next', 'next', 'next');
    expect(at(d, id)).toEqual(['R:a:4']);
    const lowered = editRoutine(d, 'R', { kind: 'repeat', times: 2 }, env());
    expect(lowered.ok).toBe(true);
    expect(run(ok(lowered.data, { kind: 'next', runId: id }).data, id).endedAt).toBeDefined();
    const one = start(world(seq('R', 'R', [step('a')], { repeatFrom: 0, repeat: 1 })), 'R');
    expect(run(ok(one.d, { kind: 'next', runId: one.id }).data, one.id).endedAt).toBeDefined();
  });

  it('a number that is not a whole number of at least 1 reads as until I’m done: never a silent end, never a crash', () => {
    for (const bad of [0, -1, 1.5, Number.NaN, '3', null, {}]) {
      const s = start(world(seq('R', 'R', [step('a')], { repeatFrom: 0, repeat: bad })), 'R');
      const r = ok(s.d, { kind: 'next', runId: s.id });
      expect(run(r.data, s.id).endedAt, String(bad)).toBeUndefined();
      expect(at(r.data, s.id), String(bad)).toEqual(['R:a:2']);
    }
  });

  it('no divider, or one that is not a place in the list (at or past the end, negative, not a whole number): the last item finishes the level', () => {
    for (const repeatFrom of [undefined, 1, 2, 5, -1, 0.5, 'x']) {
      const s = start(world(seq('R', 'R', [step('a')], { repeatFrom })), 'R');
      expect(run(ok(s.d, { kind: 'next', runId: s.id }).data, s.id).endedAt, String(repeatFrom)).toBeDefined();
    }
  });

  it('finishing a level above the bottom: it is left, the parent goes on to its next step, and it says "Finished <name>"', () => {
    const w = world(seq('P', 'Parent', [step('x'), ref('lp', 'L'), step('y')]), seq('L', 'Loop', [step('a'), step('b')], { repeatFrom: 0, repeat: 2 }));
    let { d, id } = start(w, 'P');
    d = walk(d, id, 'next', 'stepIn', 'next', 'next', 'next');
    expect(at(d, id)).toEqual(['P:lp:1', 'L:b:2']);
    const r = ok(d, { kind: 'next', runId: id });
    expect(at(r.data, id)).toEqual(['P:y:1']);
    expect(r.said).toEqual({ kind: 'finished', names: ['Loop'] });
  });

  it('finishing cascades: an inner level whose parent is on ITS last item leaves both (names innermost first); the parent’s own loop comes round', () => {
    const w = world(
      seq('P', 'Parent', [step('x'), ref('m', 'M')], { repeatFrom: 0 }),
      seq('M', 'Middle', [step('m1'), ref('l', 'L')]),
      seq('L', 'Inner', [step('a')]),
    );
    let { d, id } = start(w, 'P');
    d = walk(d, id, 'next', 'stepIn', 'next', 'stepIn');
    expect(at(d, id)).toEqual(['P:m:1', 'M:l:1', 'L:a:1']);
    const r = ok(d, { kind: 'next', runId: id });
    expect(at(r.data, id)).toEqual(['P:x:2']);
    expect(r.said).toEqual({ kind: 'finished', names: ['Inner', 'Middle'] });
  });

  it('finishing an inner level whose parent was moved meanwhile (an edit removed the step it was entered from): it lands where the parent is, no further', () => {
    const w = world(seq('P', 'Parent', [step('x'), ref('lp', 'L'), step('y')]), seq('L', 'Inner', [step('a')]));
    let { d, id } = start(w, 'P');
    d = walk(d, id, 'next', 'stepIn');
    d = editRoutine(d, 'P', { kind: 'remove', item: 'lp' }, env()).data;
    expect(at(d, id)).toEqual(['P:y:1', 'L:a:1']);
    const r = ok(d, { kind: 'next', runId: id });
    expect(at(r.data, id)).toEqual(['P:y:1']);
    expect(run(r.data, id).endedAt).toBeUndefined();
    expect(r.said).toEqual({ kind: 'finished', names: ['Inner'] });
  });

  it('finishing cascades to the end: every level on its last item, bottom "ends here": the run ends', () => {
    const w = world(seq('P', 'Parent', [step('x'), ref('lp', 'L')]), seq('L', 'Inner', [step('a')]));
    let { d, id } = start(w, 'P');
    d = walk(d, id, 'next', 'stepIn');
    const r = ok(d, { kind: 'next', runId: id });
    expect(run(r.data, id).endedAt).toBeDefined();
    expect(r.said).toEqual({ kind: 'ended', name: 'Parent' });
  });

  it('finishing the bottom level of an open goal: the run does NOT end; it asks for the next small step (at: null, round kept)', () => {
    const { d, id } = start(world(seq('G', 'Goal', [step('a')], { open: true })), 'G');
    const r = ok(d, { kind: 'next', runId: id });
    expect(run(r.data, id).endedAt).toBeUndefined();
    expect(at(r.data, id)).toEqual(['G:null:1']);
    expect(run(r.data, id).status).toBe('running');
    expect(r.said).toEqual({ kind: 'edge' });
  });

  it('finishing the bottom level of an "ends here" routine: ended now by "finished"; status, waiting-since and reason gone; the place left as it was; "Finished <name>"', () => {
    let { d, id } = start(world(seq('R', 'Report', [step('a'), wait('w')])), 'R');
    d = ok(d, { kind: 'pause', runId: id, reason: 'lunch' }).data;
    d = ok(d, { kind: 'resume', runId: id }).data;
    d = walk(d, id, 'next');
    expect(run(d, id).waitingSince).toBeDefined();
    const r = ok(d, { kind: 'next', runId: id });
    const x = run(r.data, id);
    expect(x.endedAt).toBe(new Date(T0 + 4000).toISOString());
    expect(x.endedBy).toBe('finished');
    expect([x.status, x.waitingSince, x.reason]).toEqual([undefined, undefined, undefined]);
    expect(Object.keys(r.data.runs[id]).filter((k) => ['status', 'waitingSince', 'reason'].includes(k))).toEqual([]); // as stored, not only as read
    expect(at(r.data, id)).toEqual(['R:w:1']);
    expect(r.said).toEqual({ kind: 'ended', name: 'Report' });
    expect(undone(d, r.data)).toEqual(json(d));
  });

  it('at the edge (asking): Next is refused, there is no step to move past', () => {
    const { d, id } = start(world(seq('G', 'G', [], { open: true })), 'G');
    const r = go(d, { kind: 'next', runId: id });
    expect([r.ok, r.reason]).toEqual([false, 'asking']);
    expect(r.data).toBe(d);
  });

  it('an ended run refuses; a run that is paused, or not the one the app is on, moves all the same', () => {
    const a = start(world(seq('R', 'R', [step('a'), step('b')]), seq('S', 'S', [step('c')])), 'R');
    let d = ok(a.d, { kind: 'pause', runId: a.id }).data;
    expect(at(ok(d, { kind: 'next', runId: a.id }).data, a.id)).toEqual(['R:b:1']);
    d = ok(d, { kind: 'start', routineId: 'S' }).data; // a is no longer current
    d = ok(d, { kind: 'next', runId: a.id }).data;
    expect(at(d, a.id)).toEqual(['R:b:1']);
    d = ok(d, { kind: 'next', runId: a.id }).data;
    expect(go(d, { kind: 'next', runId: a.id })).toMatchObject({ ok: false, reason: 'ended' });
    expect(go(d, { kind: 'next', runId: 'nope' })).toMatchObject({ ok: false, reason: 'gone' });
  });

  it('a place that no longer exists (damaged data): the start of that level, never a throw or an endless loop', () => {
    const s = start(world(seq('R', 'R', [step('a'), step('b')])), 'R');
    const d: Data = { ...s.d, runs: { ...s.d.runs, [s.id]: { ...s.d.runs[s.id], frames: [{ seq: 'R', at: 'zzz', round: 1 }] } } };
    expect(at(ok(d, { kind: 'next', runId: s.id }).data, s.id)).toEqual(['R:a:1']);
  });
});

describe('Add the next small step (the edge)', () => {
  it('at the edge: the tidied step is appended to the ROUTINE (not a this-run change) and is the place, round kept; the reason goes; one Undo reverts both', () => {
    let { d, id } = start(world(seq('G', 'Goal', [step('a')], { open: true })), 'G');
    d = walk(d, id, 'next');
    d = ok(d, { kind: 'pause', runId: id, reason: 'thinking' }).data;
    const r = ok(d, { kind: 'edgeStep', runId: id, text: '  call   Ana ' });
    expect(texts(r.data, 'G')).toEqual(['a', 'call Ana']);
    const added = readRoutine(r.data, 'G')!.items[1];
    expect(at(r.data, id)).toEqual([`G:${added.id}:1`]);
    expect(run(r.data, id).changes).toEqual([]);
    expect(run(r.data, id).reason).toBeUndefined();
    expect(undone(d, r.data)).toEqual(json(d));
    // Finishing it asks again: the path is laid one step at a time.
    const again = ok(r.data, { kind: 'next', runId: id });
    expect(at(again.data, id)).toEqual(['G:null:1']);
    expect(again.said).toEqual({ kind: 'edge' });
  });

  it('a first step on something new: the empty goal gets its first item', () => {
    const made = ok(emptyData(), { kind: 'new', words: 'Learn Spanish' });
    const r = ok(made.data, { kind: 'edgeStep', runId: made.runId!, text: 'Find a tutor' });
    const g = Object.values(r.data.routines)[0];
    expect(texts(r.data, g.id)).toEqual(['Find a tutor']);
    expect(here(r.data, made.runId!)).toBe('Find a tutor');
  });

  it('in a goal with a counted loop already complete: the step is appended in the looped part, runs once, and finishing it asks again', () => {
    let { d, id } = start(world(seq('G', 'Goal', [step('a')], { open: true, repeatFrom: 0, repeat: 1 })), 'G');
    d = walk(d, id, 'next');
    expect(at(d, id)).toEqual(['G:null:1']);
    d = ok(d, { kind: 'edgeStep', runId: id, text: 'b' }).data;
    expect(texts(d, 'G')).toEqual(['a', 'b']);
    expect(readRoutine(d, 'G')!.repeatFrom).toBe(0);
    expect(run(d, id).frames[0].round).toBe(1);
    expect(at(walk(d, id, 'next'), id)).toEqual(['G:null:1']);
  });

  it('refused when not at the edge, not on the bottom level, or with no words; nothing changes', () => {
    const a = start(world(seq('R', 'R', [step('a')])), 'R');
    expect(go(a.d, { kind: 'edgeStep', runId: a.id, text: 'x' })).toMatchObject({ ok: false, reason: 'not-at-edge', data: a.d });
    const g = start(world(seq('G', 'G', [], { open: true })), 'G');
    expect(go(g.d, { kind: 'edgeStep', runId: g.id, text: '   ' })).toMatchObject({ ok: false, reason: 'empty', data: g.d });
    const w = world(seq('P', 'P', [ref('lp', 'L')]), seq('L', 'L', [step('a')]));
    const p = start(w, 'P');
    const inner = walk(p.d, p.id, 'stepIn');
    expect(go(inner, { kind: 'edgeStep', runId: p.id, text: 'x' })).toMatchObject({ ok: false, reason: 'not-at-edge' });
  });

  it('the routine edited elsewhere (the plain editor appends a step) while a run is at its edge: the run moves to that step', () => {
    let { d, id } = start(world(seq('G', 'G', [step('a')], { open: true })), 'G');
    d = walk(d, id, 'next');
    const e = editRoutine(d, 'G', { kind: 'addStep', text: 'new' }, env());
    expect(e.ok).toBe(true);
    const added = readRoutine(e.data, 'G')!.items[1];
    expect(at(e.data, id)).toEqual([`G:${added.id}:1`]);
    // Inserting anywhere else does not wake it.
    const first = editRoutine(d, 'G', { kind: 'addStep', text: 'first', after: null }, env());
    expect(at(first.data, id)).toEqual(['G:null:1']);
  });
});

describe('Step in / Break it down', () => {
  const report = () => world(seq('R', 'Report', [step('a', 'Write report'), step('b', 'Send it')]));

  it('Step in on a routine with items: a new level on its first item, round 1, entered from that item', () => {
    const w = world(seq('P', 'P', [ref('lp', 'L'), step('y')]), seq('L', 'L', [step('a'), step('b')]));
    const { d, id } = start(w, 'P');
    const r = ok(d, { kind: 'stepIn', runId: id });
    expect(run(r.data, id).frames).toEqual([{ seq: 'P', at: 'lp', round: 1 }, { seq: 'L', at: 'a', round: 1, from: 'lp' }]);
  });

  it('Step in is refused on an empty routine (it behaves as a plain step: Next passes it), on one that is gone, and past 64 levels', () => {
    const w = world(seq('P', 'P', [ref('e', 'E'), ref('g', 'gone'), step('y')]), seq('E', 'Empty', []));
    const { d, id } = start(w, 'P');
    expect(go(d, { kind: 'stepIn', runId: id })).toMatchObject({ ok: false, reason: 'empty', data: d });
    const onGone = walk(d, id, 'next');
    expect(at(onGone, id)).toEqual(['P:g:1']);
    expect(go(onGone, { kind: 'stepIn', runId: id })).toMatchObject({ ok: false, reason: 'empty' });
    expect(at(walk(onGone, id, 'next'), id)).toEqual(['P:y:1']);
    // A routine that holds itself (hand-made data): every Step in goes one deeper, and the 64th level is the last.
    const self = start(world(seq('S', 'Self', [ref('s', 'S')])), 'S');
    let deep = self.d;
    for (let i = 1; i < MAX_DEPTH; i++) deep = ok(deep, { kind: 'stepIn', runId: self.id }).data;
    expect(run(deep, self.id).frames).toHaveLength(64);
    expect(go(deep, { kind: 'stepIn', runId: self.id })).toMatchObject({ ok: false, reason: 'too-deep' });
  });

  it('Step in on a plain step or on a wait is refused', () => {
    const { d, id } = start(world(seq('R', 'R', [step('a'), wait('w')])), 'R');
    expect(go(d, { kind: 'stepIn', runId: id })).toMatchObject({ ok: false, reason: 'not-a-routine' });
    expect(go(walk(d, id, 'next'), { kind: 'stepIn', runId: id })).toMatchObject({ ok: false, reason: 'not-a-routine' });
  });

  it('Break it down on a plain step: an unnamed sequence named by the step’s words, owned by the run; a this-run change; a level on its first step; the routine untouched; one Undo removes all three', () => {
    let { d, id } = start(report(), 'R');
    d = ok(d, { kind: 'pause', runId: id, reason: 'stuck' }).data;
    const r = ok(d, { kind: 'breakDown', runId: id, steps: [' outline ', '', '  ', 'first   draft'] });
    const [u] = unnamed(r.data);
    expect(unnamed(r.data)).toHaveLength(1);
    expect(u).toMatchObject({ named: false, words: 'Write report', ownerRunId: id, createdAt: new Date(T0 + 2000).toISOString() });
    expect(texts(r.data, u.id)).toEqual(['outline', 'first draft']);
    const x = run(r.data, id);
    expect(x.changes).toMatchObject([{ kind: 'breakdown', seq: 'R', item: 'a', into: u.id }]);
    expect(x.frames).toEqual([{ seq: 'R', at: 'a', round: 1 }, { seq: u.id, at: readRoutine(r.data, u.id)!.items[0].id, round: 1, from: 'a' }]);
    expect(x.reason).toBeUndefined();
    expect(r.data.routines.R).toBe(d.routines.R);
    expect(r.offer).toEqual([]);
    // In this run the step now reads as a routine.
    expect(view(r.data, x, 'R')!.items[0]).toEqual({ id: 'a', ref: u.id });
    expect(undone(d, r.data)).toEqual(json(d));
  });

  it('a step already broken down reads Step in: Break it down is refused there, Step in goes back in; a plain step INSIDE the breakdown can be broken down again', () => {
    let { d, id } = start(report(), 'R');
    d = ok(d, { kind: 'breakDown', runId: id, steps: ['one', 'two'] }).data;
    const nested = ok(d, { kind: 'breakDown', runId: id, steps: ['half'] });
    expect(run(nested.data, id).frames).toHaveLength(3);
    expect(unnamed(nested.data)).toHaveLength(2);
    expect(run(nested.data, id).changes.map((c) => c.seq)).toEqual(['R', unnamed(d)[0].id]);
    d = walk(d, id, 'done', 'back');
    expect(at(d, id)).toEqual(['R:a:1']);
    expect(go(d, { kind: 'breakDown', runId: id, steps: ['x'] })).toMatchObject({ ok: false, reason: 'not-a-step' });
    expect(run(ok(d, { kind: 'stepIn', runId: id }).data, id).frames).toHaveLength(2);
  });

  it('Break it down is refused on a wait step, at the edge, and with no steps typed', () => {
    const w = start(world(seq('R', 'R', [wait('w')])), 'R');
    expect(go(w.d, { kind: 'breakDown', runId: w.id, steps: ['a'] })).toMatchObject({ ok: false, reason: 'not-a-step', data: w.d });
    const g = start(world(seq('G', 'G', [], { open: true })), 'G');
    expect(go(g.d, { kind: 'breakDown', runId: g.id, steps: ['a'] })).toMatchObject({ ok: false, reason: 'not-a-step' });
    const p = start(report(), 'R');
    expect(go(p.d, { kind: 'breakDown', runId: p.id, steps: ['  ', ''] })).toMatchObject({ ok: false, reason: 'no-steps', data: p.d });
  });

  it('a step reworded earlier in this run, then broken down: the sequence is named by the reworded words; the reword stays', () => {
    let { d, id } = start(report(), 'R');
    d = ok(d, { kind: 'words', runId: id, text: 'Draft the report' }).data;
    d = ok(d, { kind: 'breakDown', runId: id, steps: ['one'] }).data;
    expect(unnamed(d)[0].words).toBe('Draft the report');
    expect(run(d, id).changes.map((c) => c.kind)).toEqual(['reword', 'breakdown']);
  });

  it('depth: 63 breakdowns inside each other make 64 levels; one more is refused', () => {
    let { d, id } = start(report(), 'R');
    for (let i = 0; i < 63; i++) d = ok(d, { kind: 'breakDown', runId: id, steps: ['s'] }).data;
    expect(run(d, id).frames).toHaveLength(64);
    expect(go(d, { kind: 'breakDown', runId: id, steps: ['s'] })).toMatchObject({ ok: false, reason: 'too-deep', data: d });
  });
});

describe('Done', () => {
  const w = () => world(seq('P', 'Parent', [step('x'), ref('lp', 'L'), step('y')]), seq('L', 'Loop', [step('a'), step('b')], { repeatFrom: 0 }));

  it('on a level above the bottom, inside a loop: the WHOLE level is left (never just the round); the parent goes on from the item it was entered from', () => {
    let { d, id } = start(w(), 'P');
    d = walk(d, id, 'next', 'stepIn', 'next', 'next');
    expect(at(d, id)).toEqual(['P:lp:1', 'L:a:2']);
    const r = ok(d, { kind: 'done', runId: id });
    expect(at(r.data, id)).toEqual(['P:y:1']);
    expect(r.said).toEqual({ kind: 'finished', names: ['Loop'] });
    expect(run(r.data, id).endedAt).toBeUndefined();
    expect(undone(d, r.data)).toEqual(json(d));
  });

  it('on an inner level whose parent is on its last item: the parent finishes as Next would (cascade; here the bottom is an open goal, so it asks)', () => {
    const g = world(seq('G', 'Goal', [ref('lp', 'L')], { open: true }), seq('L', 'Inner', [step('a'), step('b')]));
    let { d, id } = start(g, 'G');
    d = walk(d, id, 'stepIn');
    const r = ok(d, { kind: 'done', runId: id });
    expect(at(r.data, id)).toEqual(['G:null:1']);
    expect(r.said).toEqual({ kind: 'finished', names: ['Inner'] });
  });

  it('a parent already moved by an edit is not advanced again: Done lands where the parent is', () => {
    let { d, id } = start(w(), 'P');
    d = walk(d, id, 'next', 'stepIn');
    const e = editRoutine(d, 'P', { kind: 'remove', item: 'lp' }, env());
    expect(at(e.data, id)).toEqual(['P:y:1', 'L:a:1']);
    const r = ok(e.data, { kind: 'done', runId: id });
    expect(at(r.data, id)).toEqual(['P:y:1']);
    expect(run(r.data, id).endedAt).toBeUndefined();
  });

  it('on the bottom level: the run ends by "done": mid-way, in a loop, at an open edge, on a wait; the place kept, status, waiting-since and reason gone; Undo brings all of it back', () => {
    let { d, id } = start(world(seq('G', 'Goal', [step('a'), wait('w')], { open: true, repeatFrom: 0 })), 'G');
    d = walk(d, id, 'next');
    d = ok(d, { kind: 'pause', runId: id, reason: 'lunch' }).data;
    const r = ok(d, { kind: 'done', runId: id });
    const x = run(r.data, id);
    expect(x.endedAt).toBe(new Date(T0 + 3000).toISOString());
    expect([x.endedBy, x.status, x.waitingSince, x.reason]).toEqual(['done', undefined, undefined, undefined]);
    expect(Object.keys(r.data.runs[id]).filter((k) => ['status', 'waitingSince', 'reason'].includes(k))).toEqual([]);
    expect(at(r.data, id)).toEqual(['G:w:1']);
    expect(r.said).toEqual({ kind: 'ended', name: 'Goal' });
    const back = undone(d, r.data);
    expect(back).toEqual(json(d));
    expect(back.runs[id]).toMatchObject({ status: 'paused', reason: 'lunch', waitingSince: new Date(T0 + 1000).toISOString() });
    // At an open edge too.
    const e = start(world(seq('E', 'E', [], { open: true })), 'E');
    expect(run(ok(e.d, { kind: 'done', runId: e.id }).data, e.id).endedBy).toBe('done');
  });

  it('on a run already ended: refused', () => {
    const { d, id } = start(world(seq('R', 'R', [step('a')])), 'R');
    const ended = ok(d, { kind: 'done', runId: id }).data;
    expect(go(ended, { kind: 'done', runId: id })).toMatchObject({ ok: false, reason: 'ended', data: ended });
  });
});

describe('Pause / Resume / Home', () => {
  const w = () => world(seq('R', 'R', [step('a'), wait('w'), step('b')]), seq('S', 'S', [step('c')]));

  it('Pause with no reason: paused, touched; an earlier reason is kept', () => {
    let { d, id } = start(w(), 'R');
    d = ok(d, { kind: 'pause', runId: id, reason: 'lunch' }).data;
    d = ok(d, { kind: 'resume', runId: id }).data;
    const r = ok(d, { kind: 'pause', runId: id });
    expect(run(r.data, id)).toMatchObject({ status: 'paused', reason: 'lunch', touchedAt: new Date(T0 + 3000).toISOString() });
    expect(at(r.data, id)).toEqual(['R:a:1']);
    expect(r.said).toBeUndefined();
  });

  it('Pause with a reason: trimmed; blank is none; a new one replaces an older one', () => {
    let { d, id } = start(w(), 'R');
    d = ok(d, { kind: 'pause', runId: id, reason: '   ' }).data;
    expect(run(d, id).status).toBe('paused');
    expect(run(d, id).reason).toBeUndefined();
    d = ok(d, { kind: 'pause', runId: id, reason: ' lunch ' }).data;
    expect(run(d, id).reason).toBe('lunch');
    d = ok(d, { kind: 'pause', runId: id, reason: 'need the job ad open' }).data;
    expect(run(d, id).reason).toBe('need the job ad open');
  });

  it('the reason edited in place: only the reason changes (not the place, the status or when it was touched); blank deletes it', () => {
    let { d, id } = start(w(), 'R');
    d = ok(d, { kind: 'pause', runId: id }).data;
    const touched = run(d, id).touchedAt;
    d = ok(d, { kind: 'reason', runId: id, text: 'a' }).data;
    d = ok(d, { kind: 'reason', runId: id, text: 'ab' }).data;
    expect(run(d, id)).toMatchObject({ reason: 'ab', status: 'paused', touchedAt: touched });
    expect(at(d, id)).toEqual(['R:a:1']);
    const cleared = ok(d, { kind: 'reason', runId: id, text: '  ' }).data;
    expect('reason' in cleared.runs[id]).toBe(false);
    expect(json(cleared.runs[id])).toEqual(json({ ...d.runs[id], reason: undefined }));
  });

  it('the reason lives through Resume until the first verb that moves the place, and each such verb drops it', () => {
    const deep = world(seq('P', 'P', [ref('lp', 'L'), step('x'), step('y')], { repeatFrom: 0 }), seq('L', 'L', [step('a'), step('b')]));
    const paused = (prep: (d: Data, id: Id) => Data) => {
      const s = start(deep, 'P');
      let d = prep(s.d, s.id);
      d = ok(d, { kind: 'pause', runId: s.id, reason: 'why' }).data;
      d = ok(d, { kind: 'resume', runId: s.id }).data;
      expect(run(d, s.id).reason).toBe('why');
      return { d, id: s.id };
    };
    const moving: [string, (d: Data, id: Id) => Data, Verb['kind'], Record<string, unknown>][] = [
      ['next', (d) => d, 'next', {}],
      ['stepIn', (d) => d, 'stepIn', {}],
      ['done (inner)', (d, id) => walk(d, id, 'stepIn'), 'done', {}],
      ['back', (d, id) => walk(d, id, 'next'), 'back', {}],
      ['jump', (d) => d, 'jump', { to: { path: ['y'] } }],
      ['breakDown', (d, id) => walk(d, id, 'next'), 'breakDown', { steps: ['s'] }],
    ];
    for (const [name, prep, kind, extra] of moving) {
      const s = paused(prep);
      const r = ok(s.d, { kind, runId: s.id, ...extra } as unknown as Verb);
      expect(run(r.data, s.id).reason, name).toBeUndefined();
      expect(json(undone(s.d, r.data)).runs[s.id].reason, `${name}: Undo brings the reason back`).toBe('why');
    }
    // (Add step is in "the edge" above.) A verb that does not move the place keeps it.
    const s = paused((d, id) => walk(d, id, 'next'));
    expect(run(ok(s.d, { kind: 'words', runId: s.id, text: 'reworded' }).data, s.id).reason).toBe('why');
  });

  it('Home ("Stop <name>?" confirmed): no run is the one the app is on; the run keeps its place, changes, reason and waiting-since', () => {
    let { d, id } = start(w(), 'R');
    d = walk(d, id, 'next');
    d = ok(d, { kind: 'words', runId: id, text: 'the reply' }).data;
    d = ok(d, { kind: 'pause', runId: id, reason: 'x' }).data;
    const before = json(d.runs[id]);
    const r = ok(d, { kind: 'home', runId: id });
    expect(Object.values(r.data.runs).filter((x) => x.status)).toEqual([]);
    expect(json(r.data.runs[id])).toEqual({ ...before, status: undefined });
    expect(run(r.data, id)).toMatchObject({ reason: 'x', waitingSince: before.waitingSince });
    expect(run(r.data, id).changes).toHaveLength(1);
    expect(run(r.data, id).endedAt).toBeUndefined();
  });
});

describe('Jump to… / Back to <step>', () => {
  // P: [| x lp y] until done; L: [a | b c] 3 times.
  const w = () => world(seq('P', 'Parent', [step('x'), ref('lp', 'L'), step('y')], { repeatFrom: 0 }), seq('L', 'Loop', [step('a'), step('b'), step('c')], { repeatFrom: 1, repeat: 3 }));
  const into = () => {
    const s = start(w(), 'P');
    return { d: walk(s.d, s.id, 'next', 'stepIn', 'next', 'next', 'next'), id: s.id };
  };

  it('the start of the level you are in: its first item, round ONE; the levels below untouched; "Jumped from <step>"', () => {
    const { d, id } = into();
    expect(at(d, id)).toEqual(['P:lp:1', 'L:b:2']);
    const r = ok(d, { kind: 'jump', runId: id, to: { level: 1 } });
    expect(at(r.data, id)).toEqual(['P:lp:1', 'L:a:1']);
    expect(r.said).toEqual({ kind: 'jumped', from: 'b' });
    expect(undone(d, r.data)).toEqual(json(d));
  });

  it('the start of an outer level: the levels above it are dropped, it is on its first item, round one', () => {
    let { d, id } = into();
    d = walk(d, id, 'done', 'next', 'next', 'stepIn'); // y, x round 2, lp round 2, into L
    expect(at(d, id)).toEqual(['P:lp:2', 'L:a:1']);
    expect(at(ok(d, { kind: 'jump', runId: id, to: { level: 0 } }).data, id)).toEqual(['P:x:1']);
  });

  it('a jump KEEPS this run’s changes, to a level’s start and to a step alike', () => {
    let { d, id } = into();
    d = ok(d, { kind: 'words', runId: id, text: 'bee' }).data;
    expect(run(ok(d, { kind: 'jump', runId: id, to: { level: 0 } }).data, id).changes).toHaveLength(1);
    expect(run(ok(d, { kind: 'jump', runId: id, to: { level: 1 } }).data, id).changes).toHaveLength(1);
    expect(run(ok(d, { kind: 'jump', runId: id, to: { path: ['y'] } }).data, id).changes).toHaveLength(1);
  });

  it('a step in the level you are in: that step, the round KEPT', () => {
    const { d, id } = into();
    expect(at(ok(d, { kind: 'jump', runId: id, to: { path: ['lp', 'c'] } }).data, id)).toEqual(['P:lp:1', 'L:c:2']);
  });

  it('a step in an outer level: the levels above it are dropped, its round kept', () => {
    let { d, id } = into();
    d = walk(d, id, 'done', 'next', 'next', 'stepIn');
    expect(at(d, id)).toEqual(['P:lp:2', 'L:a:1']);
    expect(at(ok(d, { kind: 'jump', runId: id, to: { path: ['y'] } }).data, id)).toEqual(['P:y:2']);
  });

  it('a step inside a routine not entered: levels are pushed along the way, each new one round 1 and entered from its parent’s item; levels already there keep their round', () => {
    let { d, id } = start(w(), 'P');
    d = walk(d, id, 'next', 'next', 'next'); // x round 2
    expect(at(d, id)).toEqual(['P:x:2']);
    const r = ok(d, { kind: 'jump', runId: id, to: { path: ['lp', 'c'] } });
    expect(run(r.data, id).frames).toEqual([{ seq: 'P', at: 'lp', round: 2 }, { seq: 'L', at: 'c', round: 1, from: 'lp' }]);
  });

  it('from the paused screen: the run is running again at the new place (and no other is)', () => {
    let { d, id } = start(world(seq('R', 'R', [step('a'), step('b')])), 'R');
    d = ok(d, { kind: 'pause', runId: id, reason: 'x' }).data;
    const r = ok(d, { kind: 'jump', runId: id, to: { path: ['b'] } });
    expect(run(r.data, id).status).toBe('running');
    expect(run(r.data, id).reason).toBeUndefined();
    expect(at(r.data, id)).toEqual(['R:b:1']);
  });

  it('a target that is not there, or a level out of range: refused, nothing changes', () => {
    const { d, id } = into();
    for (const to of [{ path: ['nope'] }, { path: [] }, { path: ['x', 'a'] }, { path: ['lp', 'nope'] }, { level: 2 }, { level: -1 }, { level: 0.5 }]) {
      const r = go(d, { kind: 'jump', runId: id, to });
      expect(r.ok, JSON.stringify(to)).toBe(false);
      expect(r.data).toBe(d);
    }
  });

  it('onto a wait step: waiting since now; off it: not waiting', () => {
    let { d, id } = start(world(seq('R', 'R', [step('a'), wait('w', 'x')])), 'R');
    d = ok(d, { kind: 'jump', runId: id, to: { path: ['w'] } }).data;
    expect(run(d, id).waitingSince).toBe(new Date(T0 + 1000).toISOString());
    d = ok(d, { kind: 'jump', runId: id, to: { level: 0 } }).data;
    expect(run(d, id).waitingSince).toBeUndefined();
  });

  it('Back to: the step before in this level, same round', () => {
    let { d, id } = start(world(seq('R', 'R', [step('a'), step('b'), step('c')])), 'R');
    d = walk(d, id, 'next', 'next');
    expect(previous(d, run(d, id))).toEqual({ at: 'b', round: 1 });
    const r = ok(d, { kind: 'back', runId: id });
    expect(at(r.data, id)).toEqual(['R:b:1']);
    expect(undone(d, r.data)).toEqual(json(d));
  });

  it('Back to, across a round: from the first looped item of round 2 to the last item of round 1 (divider between, and at the top)', () => {
    const { d, id } = into(); // L:b round 2, b is the first looped item
    expect(previous(d, run(d, id))).toEqual({ at: 'c', round: 1 });
    expect(at(walk(d, id, 'back'), id)).toEqual(['P:lp:1', 'L:c:1']);
    const top = start(world(seq('R', 'R', [step('a'), step('b')], { repeatFrom: 0 })), 'R');
    const round2 = walk(top.d, top.id, 'next', 'next');
    expect(at(round2, top.id)).toEqual(['R:a:2']);
    expect(previous(round2, run(round2, top.id))).toEqual({ at: 'b', round: 1 });
  });

  it('Back to: none at the very start (round 1, first item), none on a nested level’s first step, and none above the divider’s first round start; refused then', () => {
    const top = start(world(seq('R', 'R', [step('a'), step('b')], { repeatFrom: 0 })), 'R');
    expect(previous(top.d, run(top.d, top.id))).toBeUndefined();
    expect(go(top.d, { kind: 'back', runId: top.id })).toMatchObject({ ok: false, reason: 'nothing-before', data: top.d });
    const s = start(w(), 'P');
    const nested = walk(s.d, s.id, 'next', 'stepIn');
    expect(at(nested, s.id)).toEqual(['P:lp:1', 'L:a:1']);
    expect(previous(nested, run(nested, s.id))).toBeUndefined();
    // In round 1 the first looped item's "before" is the setup step, same round.
    const b1 = walk(nested, s.id, 'next');
    expect(previous(b1, run(b1, s.id))).toEqual({ at: 'a', round: 1 });
  });

  it('Back to at the edge: the last step; and Back onto a wait waits since now, dropping the reason', () => {
    let { d, id } = start(world(seq('G', 'G', [step('a'), wait('w')], { open: true })), 'G');
    d = walk(d, id, 'next', 'next');
    expect(at(d, id)).toEqual(['G:null:1']);
    expect(previous(d, run(d, id))).toEqual({ at: 'w', round: 1 });
    d = ok(d, { kind: 'pause', runId: id, reason: 'r' }).data;
    const r = ok(d, { kind: 'back', runId: id });
    expect(at(r.data, id)).toEqual(['G:w:1']);
    expect(run(r.data, id).waitingSince).toBe(new Date(T0 + 4000).toISOString());
    expect(run(r.data, id).reason).toBeUndefined();
  });
});

describe('Change the words (this run only) / Keep', () => {
  const w = () => world(seq('R', 'Report', [step('a', 'Write report'), wait('w', 'a reply'), ref('k', 'K')]), seq('K', 'Kit', [step('k1')]));

  it('rewording the current step or wait is a change of THIS run: the run reads the new words, the routine keeps its own', () => {
    let { d, id } = start(w(), 'R');
    const r = ok(d, { kind: 'words', runId: id, text: '  Draft   report ' });
    expect(run(r.data, id).changes).toMatchObject([{ kind: 'reword', seq: 'R', item: 'a', text: 'Draft report' }]);
    expect(here(r.data, id)).toBe('Draft report');
    expect(r.data.routines.R).toBe(d.routines.R);
    expect(undone(d, r.data)).toEqual(json(d));
    d = walk(r.data, id, 'next');
    const since = run(d, id).waitingSince;
    d = ok(d, { kind: 'words', runId: id, text: 'her reply' }).data;
    expect(here(d, id)).toBe('her reply');
    expect(view(d, run(d, id), 'R')!.items[1]).toEqual({ id: 'w', wait: 'her reply' });
    expect(run(d, id).waitingSince).toBe(since); // still the same wait
  });

  it('a second reword of the same step replaces the first (same change id); rewording back to the routine’s words removes the change', () => {
    let { d, id } = start(w(), 'R');
    d = ok(d, { kind: 'words', runId: id, text: 'Draft report' }).data;
    const first = run(d, id).changes[0].id;
    d = ok(d, { kind: 'words', runId: id, text: 'Sketch report' }).data;
    expect(run(d, id).changes).toMatchObject([{ id: first, kind: 'reword', text: 'Sketch report' }]);
    d = ok(d, { kind: 'words', runId: id, text: 'Write report' }).data;
    expect(run(d, id).changes).toEqual([]);
  });

  it('empty words are refused; a routine as the step is not reworded here (its words are the routine’s name); nor is the edge', () => {
    const { d, id } = start(w(), 'R');
    expect(go(d, { kind: 'words', runId: id, text: '  ' })).toMatchObject({ ok: false, reason: 'empty', data: d });
    const onRef = walk(d, id, 'next', 'next');
    expect(go(onRef, { kind: 'words', runId: id, text: 'x' })).toMatchObject({ ok: false, reason: 'cannot' });
    const g = start(world(seq('G', 'G', [], { open: true })), 'G');
    expect(go(g.d, { kind: 'words', runId: g.id, text: 'x' })).toMatchObject({ ok: false, reason: 'cannot' });
  });

  it('Keep one reword: the routine takes the words, the change leaves the run, and the run reads exactly what it read before', () => {
    let { d, id } = start(w(), 'R');
    d = ok(d, { kind: 'words', runId: id, text: 'Draft report' }).data;
    d = walk(d, id, 'next');
    d = ok(d, { kind: 'words', runId: id, text: 'her reply' }).data;
    const seen = view(d, run(d, id), 'R')!.items;
    const one = run(d, id).changes[0];
    const k = ok(d, { kind: 'keep', runId: id, change: one.id });
    expect(texts(k.data, 'R')).toEqual(['Draft report', 'wait:a reply', 'ref:K']);
    expect(run(k.data, id).changes.map((c) => ('item' in c ? c.item : ''))).toEqual(['w']);
    expect(view(k.data, run(k.data, id), 'R')!.items).toEqual(seen);
    expect(k.kept).toEqual([one.id]);
    expect(undone(d, k.data)).toEqual(json(d));
  });

  it('Keep a breakdown: the routine’s step becomes that sequence (same item id, so the place stays valid) and the sequence stops being the run’s own; Undo restores routine, sequence and run', () => {
    let { d, id } = start(w(), 'R');
    d = ok(d, { kind: 'breakDown', runId: id, steps: ['one', 'two'] }).data;
    const [u] = unnamed(d);
    const place0 = at(d, id);
    const seen = view(d, run(d, id), 'R')!.items;
    const k = ok(d, { kind: 'keep', runId: id, change: 'all' });
    expect(readRoutine(k.data, 'R')!.items[0]).toEqual({ id: 'a', ref: u.id });
    expect('ownerRunId' in k.data.routines[u.id]).toBe(false);
    expect(k.data.routines[u.id].named).toBe(false);
    expect(at(k.data, id)).toEqual(place0);
    expect(run(k.data, id).changes).toEqual([]);
    expect(view(k.data, run(k.data, id), 'R')!.items).toEqual(seen);
    const back = undone(d, k.data);
    expect(back).toEqual(json(d));
    expect(back.routines[u.id].ownerRunId).toBe(id);
  });

  it('Keep a number changed for this run only: the routine takes the number', () => {
    let { d, id } = start(world(seq('R', 'R', [step('a')], { repeatFrom: 0, repeat: 3 })), 'R');
    d = ok(d, { kind: 'edit', runId: id, edit: { kind: 'repeat', seq: 'R', repeat: 5 } }).data;
    expect(readRoutine(d, 'R')!.repeat).toBe(3);
    expect(view(d, run(d, id), 'R')!.repeat).toBe(5);
    const k = ok(d, { kind: 'keep', runId: id, change: 'all' });
    expect(readRoutine(k.data, 'R')!.repeat).toBe(5);
    expect(run(k.data, id).changes).toEqual([]);
  });

  it('Keep all keeps every change; a change whose step is no longer in the routine is dropped quietly (and not reported as kept)', () => {
    let { d, id } = start(w(), 'R');
    d = ok(d, { kind: 'words', runId: id, text: 'Draft report' }).data;
    d = walk(d, id, 'next');
    d = ok(d, { kind: 'words', runId: id, text: 'her reply' }).data;
    const [first, second] = run(d, id).changes;
    d = editRoutine(d, 'R', { kind: 'remove', item: 'a' }, env()).data;
    const k = ok(d, { kind: 'keep', runId: id, change: 'all' });
    expect(texts(k.data, 'R')).toEqual(['wait:her reply', 'ref:K']);
    expect(run(k.data, id).changes).toEqual([]);
    expect(k.kept).toEqual([second.id]);
    expect(k.kept).not.toContain(first.id);
  });

  it('Keep works on an ENDED run (the sheet shown at the end calls it after the run has ended)', () => {
    let { d, id } = start(w(), 'R');
    d = ok(d, { kind: 'words', runId: id, text: 'Draft report' }).data;
    const ended = ok(d, { kind: 'done', runId: id });
    expect(ended.offer).toHaveLength(1);
    const k = ok(ended.data, { kind: 'keep', runId: id, change: ended.offer[0].id });
    expect(texts(k.data, 'R')[0]).toBe('Draft report');
    expect(run(k.data, id).changes).toEqual([]);
  });

  it('the offer on leaving a level: that level’s own changes and its breakdown, once, marked offered in the same write; never blocks (the verb has happened)', () => {
    let { d, id } = start(w(), 'R');
    d = ok(d, { kind: 'words', runId: id, text: 'Draft report' }).data; // a change of the PARENT level
    d = ok(d, { kind: 'breakDown', runId: id, steps: ['one'] }).data;
    d = ok(d, { kind: 'words', runId: id, text: 'uno' }).data; // inside the breakdown
    const r = ok(d, { kind: 'next', runId: id }); // finishes the breakdown
    expect(at(r.data, id)).toEqual(['R:w:1']);
    expect(r.offer.map((c: Change) => c.kind).sort()).toEqual(['breakdown', 'reword']);
    expect(r.offer.find((c) => c.kind === 'reword')).toMatchObject({ text: 'uno' });
    const marks = run(r.data, id).changes.map((c) => [c.kind, c.kind === 'reword' ? c.text : '', c.offered ?? false]);
    expect(marks).toEqual([['reword', 'Draft report', false], ['breakdown', '', true], ['reword', 'uno', true]]);
    // Ending the run offers what was not offered yet, and only that.
    const end = ok(r.data, { kind: 'done', runId: id });
    expect(end.offer.map((c) => (c.kind === 'reword' ? c.text : c.kind))).toEqual(['Draft report']);
    expect(run(end.data, id).changes.every((c) => c.offered)).toBe(true);
    // Offered is a mark, not a removal: all three are still there to keep.
    expect(run(end.data, id).changes).toHaveLength(3);
  });

  it('Done on a level offers the same way; a run that ends by itself offers everything not yet offered; nothing to keep offers nothing', () => {
    let { d, id } = start(world(seq('R', 'R', [step('a'), step('b')])), 'R');
    d = ok(d, { kind: 'breakDown', runId: id, steps: ['one', 'two'] }).data;
    const left = ok(d, { kind: 'done', runId: id });
    expect(left.offer.map((c) => c.kind)).toEqual(['breakdown']);
    d = ok(left.data, { kind: 'words', runId: id, text: 'bee' }).data;
    const end = ok(d, { kind: 'next', runId: id });
    expect(run(end.data, id).endedAt).toBeDefined();
    expect(end.offer.map((c) => c.kind)).toEqual(['reword']);
    const plain = start(world(seq('R', 'R', [step('a')])), 'R');
    expect(ok(plain.d, { kind: 'next', runId: plain.id }).offer).toEqual([]);
  });

  it('changes inside a breakdown last across the rounds of a loop (the breakdown belongs to the run)', () => {
    let { d, id } = start(world(seq('R', 'R', [step('a'), step('b')], { repeatFrom: 0 })), 'R');
    d = ok(d, { kind: 'breakDown', runId: id, steps: ['one'] }).data;
    d = ok(d, { kind: 'words', runId: id, text: 'uno' }).data;
    d = walk(d, id, 'next', 'next'); // out of the breakdown to b, then round 2 on a
    expect(at(d, id)).toEqual(['R:a:2']);
    d = walk(d, id, 'stepIn');
    expect(here(d, id)).toBe('uno');
  });

  it('dropping a this-run change: a reword just goes; a breakdown you are inside takes you back out to its step, and its sequence goes with it', () => {
    let { d, id } = start(w(), 'R');
    d = ok(d, { kind: 'words', runId: id, text: 'Draft report' }).data;
    const dropped = ok(d, { kind: 'drop', runId: id, change: run(d, id).changes[0].id });
    expect(run(dropped.data, id).changes).toEqual([]);
    expect(here(dropped.data, id)).toBe('Write report');
    const broken = ok(dropped.data, { kind: 'breakDown', runId: id, steps: ['one', 'two'] }).data;
    const out = ok(broken, { kind: 'drop', runId: id, change: run(broken, id).changes[0].id });
    expect(at(out.data, id)).toEqual(['R:a:1']);
    expect(unnamed(out.data)).toEqual([]);
    expect(undone(broken, out.data)).toEqual(json(broken));
    expect(go(out.data, { kind: 'drop', runId: id, change: 'nope' })).toMatchObject({ ok: false, reason: 'gone' });
  });
});

describe('an unnamed thing done again', () => {
  it('a breakdown left unkept can be started as a run of its own later; dropping the old change then does not take it from under that run', () => {
    let { d, id } = start(world(seq('R', 'R', [step('a', 'Tidy the desk')])), 'R');
    d = ok(d, { kind: 'breakDown', runId: id, steps: ['clear it', 'wipe it'] }).data;
    const [u] = unnamed(d);
    d = ok(ok(d, { kind: 'jump', runId: id, to: { level: 0 } }).data, { kind: 'done', runId: id }).data;
    const again = ok(d, { kind: 'start', routineId: u.id });
    expect(at(again.data, again.runId!)).toEqual([`${u.id}:${readRoutine(d, u.id)!.items[0].id}:1`]);
    const dropped = ok(again.data, { kind: 'drop', runId: id, change: run(d, id).changes[0].id });
    expect(dropped.data.routines[u.id]).toBe(again.data.routines[u.id]);
    expect(here(dropped.data, again.runId!)).toBe('clear it');
  });
});

describe('See it all: add, reword, remove and the number, for this run only', () => {
  const w = () => world(seq('R', 'Report', [step('a'), step('b'), step('c')], { repeatFrom: 0, repeat: 2 }));

  it('a step or a wait added for this run: in this run’s reading after the step named, not in the routine; Keep puts it in the routine at that place', () => {
    let { d, id } = start(w(), 'R');
    d = ok(d, { kind: 'edit', runId: id, edit: { kind: 'add', seq: 'R', after: 'a', text: ' a  half ' } }).data;
    d = ok(d, { kind: 'edit', runId: id, edit: { kind: 'addWait', seq: 'R', after: null, wait: 'the kettle' } }).data;
    const seen = view(d, run(d, id), 'R')!.items.map((i) => ('text' in i ? i.text : 'wait' in i ? `wait:${i.wait}` : ''));
    expect(seen).toEqual(['wait:the kettle', 'a', 'a half', 'b', 'c']);
    expect(texts(d, 'R')).toEqual(['a', 'b', 'c']);
    expect(at(d, id)).toEqual(['R:a:1']); // adding never moves the place
    const k = ok(d, { kind: 'keep', runId: id, change: 'all' });
    expect(texts(k.data, 'R')).toEqual(['wait:the kettle', 'a', 'a half', 'b', 'c']);
    // The divider still stands before the item it stood before.
    expect(readRoutine(k.data, 'R')!.repeatFrom).toBe(1);
    expect(view(k.data, run(k.data, id), 'R')!.items.map((i) => i.id)).toEqual(view(d, run(d, id), 'R')!.items.map((i) => i.id));
  });

  it('a step reworded from See it all (not the one you are on) is the same kind of change as Change the words', () => {
    let { d, id } = start(w(), 'R');
    d = ok(d, { kind: 'edit', runId: id, edit: { kind: 'reword', seq: 'R', item: 'c', text: 'sea' } }).data;
    expect(run(d, id).changes).toMatchObject([{ kind: 'reword', seq: 'R', item: 'c', text: 'sea' }]);
    expect(texts(d, 'R')).toEqual(['a', 'b', 'c']);
  });

  it('removing, for this run, the step the run is on: it moves to the next surviving step, else the previous; never ends, never a new round; waiting-since recomputed', () => {
    const ww = world(seq('R', 'R', [step('a'), wait('w'), step('c')], { repeatFrom: 0 }));
    let { d, id } = start(ww, 'R');
    const onNext = ok(d, { kind: 'edit', runId: id, edit: { kind: 'remove', seq: 'R', item: 'a' } });
    expect(at(onNext.data, id)).toEqual(['R:w:1']);
    expect(run(onNext.data, id).waitingSince).toBe(new Date(T0 + 1000).toISOString());
    expect(texts(onNext.data, 'R')).toEqual(['a', 'wait:w', 'c']); // the routine is untouched
    d = walk(d, id, 'next', 'next'); // on c, the last
    const onPrev = ok(d, { kind: 'edit', runId: id, edit: { kind: 'remove', seq: 'R', item: 'c' } });
    expect(at(onPrev.data, id)).toEqual(['R:w:1']);
    expect(run(onPrev.data, id).endedAt).toBeUndefined();
    expect(run(onPrev.data, id).waitingSince).toBe(new Date(T0 + 4000).toISOString()); // the fifth verb here
    expect(undone(d, onPrev.data)).toEqual(json(d));
    // Keep takes it out of the routine; the run reads the same.
    const k = ok(onPrev.data, { kind: 'keep', runId: id, change: 'all' });
    expect(texts(k.data, 'R')).toEqual(['a', 'wait:w']);
    expect(at(k.data, id)).toEqual(['R:w:1']);
  });

  it('removing a step that was added in this run just takes the addition back', () => {
    let { d, id } = start(w(), 'R');
    d = ok(d, { kind: 'edit', runId: id, edit: { kind: 'add', seq: 'R', after: 'a', text: 'extra' } }).data;
    const added = view(d, run(d, id), 'R')!.items[1].id;
    d = ok(d, { kind: 'edit', runId: id, edit: { kind: 'remove', seq: 'R', item: added } }).data;
    expect(run(d, id).changes).toEqual([]);
  });

  it('the number changed for this run only; set below the round you are on, the next last step finishes', () => {
    let { d, id } = start(w(), 'R');
    d = walk(d, id, 'next', 'next', 'next'); // a round 2
    d = ok(d, { kind: 'edit', runId: id, edit: { kind: 'repeat', seq: 'R', repeat: 1 } }).data;
    expect(readRoutine(d, 'R')!.repeat).toBe(2);
    d = walk(d, id, 'next', 'next');
    expect(at(d, id)).toEqual(['R:c:2']);
    expect(run(walk(d, id, 'next'), id).endedAt).toBeDefined();
  });

  it('refused: a sequence the run does not reach, a step that is not there, empty words', () => {
    const { d, id } = start(w(), 'R');
    expect(go(d, { kind: 'edit', runId: id, edit: { kind: 'add', seq: 'nope', after: null, text: 'x' } }).ok).toBe(false);
    expect(go(d, { kind: 'edit', runId: id, edit: { kind: 'remove', seq: 'R', item: 'nope' } }).ok).toBe(false);
    expect(go(d, { kind: 'edit', runId: id, edit: { kind: 'reword', seq: 'R', item: 'a', text: ' ' } }).ok).toBe(false);
    expect(go(d, { kind: 'edit', runId: id, edit: { kind: 'add', seq: 'R', after: 'a', text: ' ' } }).ok).toBe(false);
  });
});

describe('the plain routine editor, under open runs', () => {
  const w = () => world(seq('R', 'R', [step('a'), step('b'), step('c')], { repeatFrom: 0 }));

  it('removing the step a run is on: forward if there is one, else back; never ended, never a new round; the last one gone: it asks', () => {
    let { d, id } = start(w(), 'R');
    d = walk(d, id, 'next');
    const fwd = editRoutine(d, 'R', { kind: 'remove', item: 'b' }, env());
    expect(at(fwd.data, id)).toEqual(['R:c:1']);
    expect(undone(d, fwd.data)).toEqual(json(d)); // one Undo: the routine and the run
    d = walk(d, id, 'next');
    const back = editRoutine(d, 'R', { kind: 'remove', item: 'c' }, env());
    expect(at(back.data, id)).toEqual(['R:b:1']);
    expect(run(back.data, id).endedAt).toBeUndefined();
    const one = start(world(seq('R', 'R', [step('a')])), 'R');
    expect(at(editRoutine(one.d, 'R', { kind: 'remove', item: 'a' }, env()).data, one.id)).toEqual(['R:null:1']);
  });

  it('removal recomputes waiting-since: landing on a wait waits since now, leaving one stops waiting; ended runs are not touched', () => {
    const ww = world(seq('R', 'R', [step('a'), wait('w'), step('c')]));
    const s = start(ww, 'R');
    const onto = editRoutine(s.d, 'R', { kind: 'remove', item: 'a' }, env());
    expect(at(onto.data, s.id)).toEqual(['R:w:1']);
    expect(run(onto.data, s.id).waitingSince).toBe(new Date(T0 + 1000).toISOString());
    const off = editRoutine(onto.data, 'R', { kind: 'remove', item: 'w' }, env());
    expect(at(off.data, s.id)).toEqual(['R:c:1']);
    expect(run(off.data, s.id).waitingSince).toBeUndefined();
    const ended = ok(s.d, { kind: 'done', runId: s.id }).data;
    const after = editRoutine(ended, 'R', { kind: 'remove', item: 'a' }, env());
    expect(after.data.runs[s.id]).toBe(ended.runs[s.id]);
  });

  it('an edit that does not strand a run leaves it the same object: a run resting on a wait keeps its since, whatever is edited around it', () => {
    const ww = world(seq('R', 'R', [step('a'), wait('w'), step('c')]), seq('S', 'S', [step('q')]));
    let { d, id } = start(ww, 'R');
    d = walk(d, id, 'next');
    const since = run(d, id).waitingSince;
    for (const [routineId, e] of [['R', { kind: 'remove', item: 'c' }], ['R', { kind: 'addStep', text: 'z' }], ['R', { kind: 'reword', item: 'w', text: 'the post' }], ['S', { kind: 'rename', words: 'T' }]] as const) {
      const r = editRoutine(d, routineId, e, env());
      expect(r.ok, JSON.stringify(e)).toBe(true);
      expect(r.data.runs[id], JSON.stringify(e)).toBe(d.runs[id]);
    }
    const here_ = ok(d, { kind: 'edit', runId: id, edit: { kind: 'add', seq: 'R', after: 'w', text: 'extra' } });
    expect(run(here_.data, id).waitingSince).toBe(since);
  });

  it('the divider stays before the item it stood before, and one left under the last item reads as none (written as none)', () => {
    const d0 = world(seq('R', 'R', [step('a'), step('b'), step('c')], { repeatFrom: 2 }));
    expect(readRoutine(editRoutine(d0, 'R', { kind: 'remove', item: 'a' }, env()).data, 'R')!.repeatFrom).toBe(1);
    const gone = editRoutine(d0, 'R', { kind: 'remove', item: 'c' }, env()).data;
    expect('repeatFrom' in gone.routines.R).toBe(false);
    expect(readRoutine(editRoutine(d0, 'R', { kind: 'addStep', text: 'first', after: null }, env()).data, 'R')!.repeatFrom).toBe(3);
  });

  it('add a step, add a wait, reword, move up and down, the divider, the number, ends here / open, rename: each changes the routine and nothing else', () => {
    let d = world(seq('R', 'Report', [step('a'), step('b')]), seq('S', 'Sketch', []));
    const edit = (e: Parameters<typeof editRoutine>[2]) => {
      const r = editRoutine(d, 'R', e, env());
      expect(r.ok, JSON.stringify(e)).toBe(true);
      expect(r.data.routines.S).toBe(d.routines.S);
      d = r.data;
    };
    edit({ kind: 'addStep', text: '  c  c ' });
    edit({ kind: 'addWait', wait: 'a reply', after: 'a' });
    expect(texts(d, 'R')).toEqual(['a', 'wait:a reply', 'b', 'c c']);
    edit({ kind: 'reword', item: 'b', text: 'bee' });
    edit({ kind: 'move', item: 'b', by: -1 });
    expect(texts(d, 'R')).toEqual(['a', 'bee', 'wait:a reply', 'c c']);
    edit({ kind: 'move', item: 'a', by: 1 });
    expect(texts(d, 'R')).toEqual(['bee', 'a', 'wait:a reply', 'c c']);
    edit({ kind: 'divider', from: 2 });
    edit({ kind: 'repeat', times: 3 });
    expect(readRoutine(d, 'R')).toMatchObject({ repeatFrom: 2, repeat: 3 });
    edit({ kind: 'repeat' });
    edit({ kind: 'divider' });
    expect('repeat' in d.routines.R || 'repeatFrom' in d.routines.R).toBe(false);
    edit({ kind: 'open', open: true });
    expect(d.routines.R.open).toBe(true);
    edit({ kind: 'open', open: false });
    expect('open' in d.routines.R).toBe(false);
    edit({ kind: 'rename', words: '  Weekly   report ' });
    expect(d.routines.R.words).toBe('Weekly report');
  });

  it('refused, changing nothing: a move off either end, a divider that is not a place, a number below 1, empty words, a name another routine has, a step that is not there', () => {
    const d = world(seq('R', 'Report', [step('a'), step('b')]), seq('S', 'Sketch', []));
    const bad: Parameters<typeof editRoutine>[2][] = [
      { kind: 'move', item: 'a', by: -1 },
      { kind: 'move', item: 'b', by: 1 },
      { kind: 'divider', from: 2 },
      { kind: 'divider', from: -1 },
      { kind: 'repeat', times: 0 },
      { kind: 'repeat', times: 1.5 },
      { kind: 'addStep', text: '  ' },
      { kind: 'addWait', wait: '' },
      { kind: 'reword', item: 'a', text: ' ' },
      { kind: 'reword', item: 'nope', text: 'x' },
      { kind: 'remove', item: 'nope' },
      { kind: 'rename', words: ' ' },
      { kind: 'rename', words: 'sketch' },
    ];
    for (const e of bad) {
      const r = editRoutine(d, 'R', e, env());
      expect(r.ok, JSON.stringify(e)).toBe(false);
      expect(r.data).toBe(d);
    }
    expect(editRoutine(d, 'nope', { kind: 'rename', words: 'x' }, env()).ok).toBe(false);
  });

  it('removing a routine takes it out of the lists (removed-at); refused while it has an open run', () => {
    const d = world(seq('R', 'Report', [step('a')]));
    const r = editRoutine(d, 'R', { kind: 'removeRoutine' }, env());
    expect(r.data.routines.R.removedAt).toBe(new Date(T0).toISOString());
    expect(go(r.data, { kind: 'start', routineId: 'R' })).toMatchObject({ ok: false, reason: 'gone' });
    const s = start(d, 'R');
    expect(editRoutine(s.d, 'R', { kind: 'removeRoutine' }, env())).toMatchObject({ ok: false, reason: 'has-run', data: s.d });
  });
});

describe('the tolerant reader: a damaged routine or run never throws and is shown as it can be', () => {
  const d0 = () => world(seq('R', 'Report', [step('a'), step('b')]), seq('L', 'L', [step('x')]));
  const damaged = (body: Record<string, unknown>, routines: Data = d0()): Data => ({ ...routines, runs: { n1: { id: 'n1', routineId: 'R', startedAt: 'x', ...body } as Run } });
  const every: Verb[] = [
    { kind: 'next', runId: 'n1' },
    { kind: 'done', runId: 'n1' },
    { kind: 'stepIn', runId: 'n1' },
    { kind: 'back', runId: 'n1' },
    { kind: 'pause', runId: 'n1', reason: 'r' },
    { kind: 'resume', runId: 'n1' },
    { kind: 'home', runId: 'n1' },
    { kind: 'reason', runId: 'n1', text: 't' },
    { kind: 'breakDown', runId: 'n1', steps: ['s'] },
    { kind: 'edgeStep', runId: 'n1', text: 's' },
    { kind: 'words', runId: 'n1', text: 's' },
    { kind: 'jump', runId: 'n1', to: { level: 0 } },
    { kind: 'jump', runId: 'n1', to: { path: ['b'] } },
    { kind: 'keep', runId: 'n1', change: 'all' },
    { kind: 'start', routineId: 'R' },
  ];

  it('a run with no body at all (a damaged row loads so): it is at the start of its routine; every verb answers without throwing', () => {
    const d = damaged({});
    expect(readRun(d, 'n1')).toMatchObject({ frames: [], changes: [] });
    expect(place(d, readRun(d, 'n1')!)!.frames).toEqual([{ seq: 'R', at: 'a', round: 1 }]);
    for (const verb of every) expect(() => go(d, verb), verb.kind).not.toThrow();
    expect(at(ok(d, { kind: 'next', runId: 'n1' }).data, 'n1')).toEqual(['R:a:1']);
  });

  it('frames and changes of the wrong type, frames that are not frames, rounds that are not rounds', () => {
    for (const body of [
      { frames: 'banana', changes: { not: 'a list' } },
      { frames: [null, 3, 'x', { seq: 4 }], changes: [null, 'x', { kind: 'reword' }, { kind: 'who-knows', id: 'c9', seq: 'R' }] },
      { frames: [{ seq: 'R', at: 'b', round: 'two' }], changes: [] },
      { frames: [{ seq: 'R', at: 'b', round: -3 }, { seq: 'gone', at: 'q', round: 1 }] },
      { frames: [{ seq: 'L', at: 'x', round: 1 }] }, // not this run's routine at the bottom
    ]) {
      const d = damaged(body);
      const p = place(d, readRun(d, 'n1')!)!;
      expect(p.frames[0].seq, JSON.stringify(body)).toBe('R');
      expect(p.frames.every((f) => Number.isInteger(f.round) && f.round >= 1)).toBe(true);
      for (const verb of every) expect(() => go(d, verb), `${verb.kind} ${JSON.stringify(body)}`).not.toThrow();
    }
    // A usable bottom frame is kept where it is; only what is unusable above it is dropped.
    const kept = damaged({ frames: [{ seq: 'R', at: 'b', round: -3 }, { seq: 'gone', at: 'q', round: 1 }] });
    expect(place(kept, readRun(kept, 'n1')!)!.frames).toEqual([{ seq: 'R', at: 'b', round: 1 }]);
  });

  it('changes it does not understand are ignored when reading and kept, untouched, when it writes', () => {
    const odd = [{ kind: 'reword', item: 'a', text: 'no id, no seq' }, { kind: 'who-knows', id: 'c9', seq: 'R', x: 1 }, 7];
    const d = damaged({ frames: [{ seq: 'R', at: 'a', round: 1 }], changes: odd });
    expect(wordsOf(d, readRun(d, 'n1')!, place(d, readRun(d, 'n1')!)!.item)).toBe('a');
    const r = ok(d, { kind: 'words', runId: 'n1', text: 'ay' });
    expect((r.data.runs.n1.changes as unknown[]).slice(0, 3)).toEqual(odd);
    expect(r.data.runs.n1.changes).toHaveLength(4);
    const k = ok(r.data, { kind: 'keep', runId: 'n1', change: 'all' });
    expect(k.data.runs.n1.changes).toEqual(odd);
  });

  it('a run whose routine is gone cannot be shown: no place, and every verb refuses rather than throws', () => {
    const d = damaged({ frames: [{ seq: 'R', at: 'a', round: 1 }] }, emptyData());
    expect(place(d, readRun(d, 'n1')!)).toBeUndefined();
    for (const verb of every) expect(() => go(d, verb), verb.kind).not.toThrow();
    expect(go(d, { kind: 'next', runId: 'n1' })).toMatchObject({ ok: false, reason: 'gone' });
  });

  it('a routine with items that are not a list, not items, or share an id: read as the items that can be used, the first of each id', () => {
    const d = world(
      seq('A', 'A', 'banana' as never),
      seq('B', 'B', [null, 3, { id: 'x' }, { id: 5, text: 't' }, step('a'), step('a', 'again'), wait('w'), ref('r', 'A'), { id: 'k', text: 'kept', setsGoing: true }] as never),
      { id: 'C', words: 'C', named: true, createdAt: 'x' },
    );
    expect(readRoutine(d, 'A')!.items).toEqual([]);
    expect(readRoutine(d, 'C')!.items).toEqual([]);
    expect(readRoutine(d, 'B')!.items).toEqual([step('a'), wait('w'), ref('r', 'A'), { id: 'k', text: 'kept', setsGoing: true }]);
    expect(readRoutine(d, 'nope')).toBeUndefined();
    const s = start(d, 'B');
    expect(at(s.d, s.id)).toEqual(['B:a:1']);
    // An edit keeps what it could not read exactly where it was.
    const e = editRoutine(d, 'B', { kind: 'reword', item: 'w', text: 'the post' }, env());
    expect((e.data.routines.B.items as unknown[]).slice(0, 4)).toEqual([null, 3, { id: 'x' }, { id: 5, text: 't' }]);
    expect((e.data.routines.B.items as unknown[])[6]).toEqual({ id: 'w', wait: 'the post' });
  });

  it('a level whose item is gone is repaired when read: an inner level to its start, an emptied inner level dropped', () => {
    const base = world(seq('P', 'P', [ref('lp', 'L'), step('y')]), seq('L', 'L', [step('a'), step('b')]), seq('E', 'E', []));
    const stale: Data = { ...base, runs: { n1: { id: 'n1', routineId: 'P', startedAt: 'x', frames: [{ seq: 'P', at: 'lp', round: 1 }, { seq: 'L', at: 'zzz', round: 2, from: 'lp' }] } } };
    const p = place(stale, readRun(stale, 'n1')!)!;
    expect(p.frames).toEqual([{ seq: 'P', at: 'lp', round: 1 }, { seq: 'L', at: 'a', round: 2, from: 'lp' }]);
    expect(p.repaired).toBe(true);
    const empty: Data = { ...base, runs: { n1: { id: 'n1', routineId: 'P', startedAt: 'x', frames: [{ seq: 'P', at: 'lp', round: 1 }, { seq: 'E', at: null, round: 1, from: 'lp' }] } } };
    expect(place(empty, readRun(empty, 'n1')!)!.frames).toEqual([{ seq: 'P', at: 'lp', round: 1 }]);
  });

  it('more than 64 frames are read as 64', () => {
    const self = world(seq('S', 'Self', [ref('s', 'S')]));
    const frames = Array.from({ length: 500 }, (_, i) => ({ seq: 'S', at: 's', round: 1, ...(i && { from: 's' }) }));
    const d: Data = { ...self, runs: { n1: { id: 'n1', routineId: 'S', startedAt: 'x', frames } } };
    expect(place(d, readRun(d, 'n1')!)!.frames).toHaveLength(64);
  });
});

describe('the run’s reading of a sequence', () => {
  it('with no change of this run for it, it is the very same object each time (cheap, and nothing re-renders)', () => {
    const { d, id } = start(world(seq('R', 'R', [step('a'), step('b')]), seq('S', 'S', [step('c')])), 'R');
    expect(view(d, run(d, id), 'R')).toBe(view(d, run(d, id), 'R'));
    expect(readRoutine(d, 'R')).toBe(readRoutine(d, 'R'));
    const reworded = ok(d, { kind: 'words', runId: id, text: 'ay' }).data;
    expect(view(reworded, run(reworded, id), 'S')).toBe(readRoutine(reworded, 'S'));
    expect(view(reworded, run(reworded, id), 'R')).not.toBe(readRoutine(reworded, 'R'));
  });

  it('a verb rewrites only the records it changes: Next leaves every routine, and every other run, the same objects', () => {
    const a = start(world(seq('R', 'R', [step('a'), step('b')]), seq('S', 'S', [step('c')])), 'R');
    const paused = ok(a.d, { kind: 'home', runId: a.id }).data;
    const b = start(paused, 'S');
    const r = ok(b.d, { kind: 'next', runId: a.id });
    expect(r.data.routines).toBe(b.d.routines);
    expect(r.data.runs[b.id]).toBe(b.d.runs[b.id]);
    expect(r.data.threads).toBe(b.d.threads);
    expect(r.data.activities).toBe(b.d.activities);
  });
});

describe('one Undo covers the routine and the run together', () => {
  it('New: with another run paused: the routine and the run go, and the paused run is the one the app is on again', () => {
    const a = start(world(seq('S', 'S', [step('c')])), 'S');
    const prev = ok(a.d, { kind: 'pause', runId: a.id }).data;
    const r = ok(prev, { kind: 'new', words: 'Learn Spanish' });
    const u = undone(prev, r.data);
    expect(u).toEqual(json(prev));
    expect(u.runs[a.id].status).toBe('paused');
    expect(Object.keys(u.routines)).toEqual(['S']);
  });

  it('after Undo a field the verb added is gone when the data is saved (JSON), even though the object keeps the key', () => {
    const { d, id } = start(world(seq('R', 'R', [step('a')])), 'R');
    const p = ok(d, { kind: 'pause', runId: id, reason: 'why' });
    const u = applyUndo(p.data, undoEntry(d, p.data));
    expect(u.runs[id].reason).toBeUndefined();
    expect(json(u)).toEqual(json(d));
  });
});

// ───────── After the audit (P-86): D1, D2, D3, B6 ─────────

describe('after the audit', () => {
  const ids = (d: Data, runId: Id, seqId: Id) => view(d, run(d, runId), seqId)!.items.map((i) => i.id);
  const R = () => world(seq('R', 'Report', [step('a'), step('b'), step('c')]));

  describe('D1: Keep several is ONE verb, so one Undo', () => {
    const three = () => {
      const s = start(R(), 'R');
      let d = ok(s.d, { kind: 'words', runId: s.id, text: 'A!' }).data;
      d = ok(d, { kind: 'edit', runId: s.id, edit: { kind: 'reword', seq: 'R', item: 'b', text: 'B!' } }).data;
      d = ok(d, { kind: 'edit', runId: s.id, edit: { kind: 'reword', seq: 'R', item: 'c', text: 'C!' } }).data;
      return { d, id: s.id, changes: run(d, s.id).changes.map((c) => c.id) };
    };
    it('a list of changes is kept in one write: those go into the routine, the others stay this run’s own', () => {
      const { d, id, changes } = three();
      const r = ok(d, { kind: 'keep', runId: id, change: [changes[0], changes[2]] });
      expect(texts(r.data, 'R')).toEqual(['A!', 'b', 'C!']);
      expect(run(r.data, id).changes.map((c) => c.id)).toEqual([changes[1]]);
      expect(r.kept).toEqual([changes[0], changes[2]]);
    });
    it('one Undo of it puts back the routine and every one of the changes', () => {
      const { d, id, changes } = three();
      const r = ok(d, { kind: 'keep', runId: id, change: [changes[0], changes[1]] });
      expect(undone(d, r.data)).toEqual(json(d));
    });
    it('a list with nothing of this run in it is refused, and an unknown id in a list is just left out', () => {
      const { d, id, changes } = three();
      expect(go(d, { kind: 'keep', runId: id, change: [] }).ok).toBe(false);
      expect(go(d, { kind: 'keep', runId: id, change: ['nope'] }).ok).toBe(false);
      expect(texts(ok(d, { kind: 'keep', runId: id, change: ['nope', changes[1]] }).data, 'R')).toEqual(['a', 'B!', 'c']);
    });
  });

  describe('D2: Break it down goes to the step it was opened on', () => {
    it('opened on the step the run is on: as before, the run steps in', () => {
      const s = start(R(), 'R');
      const r = ok(s.d, { kind: 'breakDown', runId: s.id, steps: ['one', 'two'], at: { seq: 'R', item: 'a' } });
      expect(run(r.data, s.id).frames).toHaveLength(2);
      expect(here(r.data, s.id)).toBe('one');
    });
    it('the run has moved on since (another tab, a kept Next): the sub-steps still go to the step they were typed for, and the run stays where it is', () => {
      const s = start(R(), 'R');
      const moved = walk(s.d, s.id, 'next'); // now on b
      const r = ok(moved, { kind: 'breakDown', runId: s.id, steps: ['one', 'two'], at: { seq: 'R', item: 'a' } });
      expect(at(r.data, s.id)).toEqual(at(moved, s.id));
      expect(here(r.data, s.id)).toBe('b');
      const change = run(r.data, s.id).changes[0];
      expect(change).toMatchObject({ kind: 'breakdown', seq: 'R', item: 'a' });
      const into = (change as Extract<Change, { kind: 'breakdown' }>).into;
      expect(texts(r.data, into)).toEqual(['one', 'two']);
      // "b" is untouched: it is still a plain step with its own words.
      expect(view(r.data, run(r.data, s.id), 'R')!.items.map((i) => ('ref' in i ? 'ref' : 'text' in i ? i.text : 'wait'))).toEqual(['ref', 'b', 'c']);
      expect(undone(moved, r.data)).toEqual(json(moved));
    });
    it('the run has LEFT that level since: the same — nothing lands on the step it is on now', () => {
      const d0 = world(seq('R', 'Report', [ref('i', 'S'), step('z')]), seq('S', 'Inner', [step('p'), step('q')]));
      const s = start(d0, 'R');
      const inside = walk(s.d, s.id, 'stepIn'); // on p, inside S
      const out = walk(inside, s.id, 'done'); // on z, in R
      const r = ok(out, { kind: 'breakDown', runId: s.id, steps: ['one'], at: { seq: 'S', item: 'p' } });
      expect(at(r.data, s.id)).toEqual(at(out, s.id));
      expect(run(r.data, s.id).changes[0]).toMatchObject({ kind: 'breakdown', seq: 'S', item: 'p' });
    });
    it('a step that is no longer there, or is not a plain step, is refused and nothing changes', () => {
      const d0 = world(seq('R', 'Report', [step('a'), wait('w'), step('c')]));
      const s = start(d0, 'R');
      const moved = walk(s.d, s.id, 'next', 'next');
      for (const item of ['gone', 'w']) {
        const r = go(moved, { kind: 'breakDown', runId: s.id, steps: ['one'], at: { seq: 'R', item } });
        expect(r.ok).toBe(false);
        expect(r.data).toBe(moved);
      }
      expect(go(moved, { kind: 'breakDown', runId: s.id, steps: ['one'], at: { seq: 'nope', item: 'a' } }).ok).toBe(false);
    });
  });

  describe('D3: Keep one never reorders what the run reads', () => {
    const add = (d: Data, runId: Id, after: Id | null, text: string) => {
      const r = ok(d, { kind: 'edit', runId, edit: { kind: 'add', seq: 'R', after, text } });
      const made = run(r.data, runId).changes[run(r.data, runId).changes.length - 1] as Extract<Change, { kind: 'add' }>;
      return { d: r.data, change: made.id, item: made.item.id };
    };
    it('a step added after another step added in this run: keeping the second leaves the order (the auditor’s case)', () => {
      const s = start(world(seq('R', 'Report', [step('a'), step('b')])), 'R');
      const x = add(s.d, s.id, 'a', 'X');
      const y = add(x.d, s.id, x.item, 'Y');
      expect(ids(y.d, s.id, 'R')).toEqual(['a', x.item, y.item, 'b']);
      const kept = ok(y.d, { kind: 'keep', runId: s.id, change: y.change }).data;
      expect(ids(kept, s.id, 'R')).toEqual(['a', x.item, y.item, 'b']);
      expect(texts(kept, 'R')).toEqual(['a', 'Y', 'b']);
      // …and keeping the other afterwards ends with the routine in that same order.
      expect(texts(ok(kept, { kind: 'keep', runId: s.id, change: x.change }).data, 'R')).toEqual(['a', 'X', 'Y', 'b']);
    });
    it('two steps added after the same step: keeping either leaves the order', () => {
      const s = start(world(seq('R', 'Report', [step('a'), step('b')])), 'R');
      const x = add(s.d, s.id, 'a', 'X');
      const y = add(x.d, s.id, 'a', 'Y');
      const before = ids(y.d, s.id, 'R');
      for (const change of [x.change, y.change]) expect(ids(ok(y.d, { kind: 'keep', runId: s.id, change }).data, s.id, 'R')).toEqual(before);
    });
    it('a step added first of all, then another before it: the same', () => {
      const s = start(world(seq('R', 'Report', [step('a'), step('b')])), 'R');
      const x = add(s.d, s.id, null, 'X');
      const y = add(x.d, s.id, null, 'Y');
      const before = ids(y.d, s.id, 'R');
      for (const change of [x.change, y.change]) expect(ids(ok(y.d, { kind: 'keep', runId: s.id, change }).data, s.id, 'R')).toEqual(before);
    });
  });

  describe('B6: a Jump out of a level offers that level’s changes, like leaving it by Done', () => {
    const nested = () => {
      const d0 = world(seq('R', 'Report', [step('a'), ref('i', 'S'), step('z')]), seq('S', 'Inner', [step('p'), step('q')]));
      const s = start(d0, 'R');
      const inside = walk(s.d, s.id, 'next', 'stepIn'); // on p
      const d = ok(inside, { kind: 'words', runId: s.id, text: 'P!' }).data;
      return { d, id: s.id, change: run(d, s.id).changes[0].id };
    };
    it('to a step of a level below: the changes of the level left are offered, marked offered, and the run has gone', () => {
      const { d, id, change } = nested();
      const r = ok(d, { kind: 'jump', runId: id, to: { path: ['z'] } });
      expect(here(r.data, id)).toBe('z');
      expect(r.offer.map((c) => c.id)).toEqual([change]);
      expect(run(r.data, id).changes[0].offered).toBe(true);
      expect(r.said).toEqual({ kind: 'jumped', from: 'P!' });
      expect(undone(d, r.data)).toEqual(json(d));
    });
    it('to the start of a level below: the same', () => {
      const { d, id, change } = nested();
      expect(ok(d, { kind: 'jump', runId: id, to: { level: 0 } }).offer.map((c) => c.id)).toEqual([change]);
    });
    it('within the level it is in, or deeper: nothing is left, nothing is offered', () => {
      const { d, id } = nested();
      expect(ok(d, { kind: 'jump', runId: id, to: { path: ['i', 'q'] } }).offer).toEqual([]);
      expect(ok(d, { kind: 'jump', runId: id, to: { level: 1 } }).offer).toEqual([]);
    });
    it('shown once: a change already offered is not offered again', () => {
      const { d, id } = nested();
      const first = ok(d, { kind: 'jump', runId: id, to: { path: ['z'] } }).data;
      const again = ok(first, { kind: 'jump', runId: id, to: { path: ['i', 'p'] } }).data;
      expect(ok(again, { kind: 'jump', runId: id, to: { path: ['z'] } }).offer).toEqual([]);
    });
  });
});
