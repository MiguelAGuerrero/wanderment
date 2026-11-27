/**
 * P-90: what the screens read about Plan — Plan's own view, the runner without planning, home tiles
 * and the prompt with the mode, where the app opens, the paused screen for a run left in Plan, and
 * the notices. Expected values are the contract's ("planning · at <step>", "Resume at <step>", Start,
 * HERE, the divider's position and count), B-12's frames v2 / v5 / v8 and the scout's mode table —
 * not the code's output.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

import { tileLine } from './goText';
import { editRoutine, Env, Item, RoutineEdit, runVerb, Verb } from './run';
import { homeTiles, leftOff, noticeFor, panelView, pausedView, planView, runnerView, runRoute, seeItAll, whatChanged } from './runView';
import { searchStarts } from './starts';
import { Data, emptyData, Id, Routine, Run } from './types';

const T0 = Date.UTC(2026, 10, 25, 10, 0, 0);
let n = 0;
let t = 0;
beforeEach(() => {
  n = 0;
  t = 0;
});
const env = (): Env => ({ now: new Date(T0 + 1000 * t++).toISOString(), id: () => `x${++n}` });
const ok = (d: Data, verb: Verb) => {
  const r = runVerb(d, verb, env());
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

// Apply to Acme = [Read the ad, Tailor the CV | >Send it off, wait: a reply] × 3; Send it off = [Attach the CV, Press send].
const acme = (extra: Record<string, unknown> = {}) =>
  seq('acme', 'Apply to Acme', [step('a', 'Read the ad'), step('b', 'Tailor the CV'), ref('s', 'send'), wait('w', 'a reply')], { home: true, open: true, repeatFrom: 2, repeat: 3, ...extra });
const send = () => seq('send', 'Send it off', [step('s1', 'Attach the CV'), step('s2', 'Press send')]);
const draw = () => seq('draw', 'Practise drawing', [step('d', 'Warm-up lines')], { home: true, createdAt: '2026-11-02T00:00:00.000Z' });
const running = (frames: unknown[] = [{ seq: 'acme', at: 'b', round: 1 }], extra: Record<string, unknown> = {}) => world([acme(), send(), draw()], [aRun('A', 'acme', frames, { status: 'running', ...extra })]);
const inPlan = (frames?: unknown[], extra?: Record<string, unknown>) => ok(running(frames, extra), { kind: 'plan', runId: 'A' }).data;

describe('Plan’s view of a run', () => {
  it('the heading is the routine’s name; beneath it "planning · at <step>"; the one filled button will say "Resume at <step>" and resume that run', () => {
    const v = planView(inPlan(), { runId: 'A' })!;
    expect(v).toMatchObject({ routineId: 'acme', runId: 'A', name: 'Apply to Acme', named: true, planning: true, line: 'at Tailor the CV', at: 'Tailor the CV', edge: false, canDone: false, unfolded: false });
    expect(v.forward).toEqual({ kind: 'resume', label: 'Resume at Tailor the CV', runId: 'A' });
  });

  it('the sequence as rows, routines opened in place, with HERE on the step the run is on — and on no other', () => {
    const v = planView(inPlan(), { runId: 'A' })!;
    expect(v.rows.map((r) => [r.depth, r.seq, r.itemId, r.kind, r.words, r.here, r.within])).toEqual([
      [0, 'acme', 'a', 'step', 'Read the ad', false, false],
      [0, 'acme', 'b', 'step', 'Tailor the CV', true, false],
      [0, 'acme', 's', 'routine', 'Send it off', false, false],
      [1, 'send', 's1', 'step', 'Attach the CV', false, false],
      [1, 'send', 's2', 'step', 'Press send', false, false],
      [0, 'acme', 'w', 'wait', 'a reply', false, false],
    ]);
    expect(v.rows.map((r) => r.path.join('/'))).toEqual(['a', 'b', 's', 's/s1', 's/s2', 'w']);
  });

  it('HERE and the resume label name the same step, wherever the run is — inside a routine too (the routine it is inside is marked "within")', () => {
    const v = planView(inPlan([{ seq: 'acme', at: 's', round: 2 }, { seq: 'send', at: 's2', round: 1, from: 's' }]), { runId: 'A' })!;
    expect(v.rows.filter((r) => r.here).map((r) => r.words)).toEqual(['Press send']);
    expect(v.rows.filter((r) => r.within).map((r) => r.words)).toEqual(['Send it off']);
    expect([v.line, v.forward]).toEqual(['at Press send', { kind: 'resume', label: 'Resume at Press send', runId: 'A' }]);
  });

  it('the divider: where it stands (before which row), its count, and whether it can move up or down; "until I’m done" has no count', () => {
    const v = planView(inPlan(), { runId: 'A' })!;
    expect(v.rows.map((r) => r.divider)).toEqual([undefined, undefined, { seq: 'acme', from: 2, repeat: 3, canUp: true, canDown: true }, undefined, undefined, undefined]);
    expect(v.divider).toEqual({ seq: 'acme', from: 2, repeat: 3, canUp: true, canDown: true });
    const top = planView(edit(inPlan(), 'acme', { kind: 'divider', from: 0 }), { runId: 'A' })!;
    expect(top.rows[0].divider).toMatchObject({ from: 0, canUp: false, canDown: true });
    const last = planView(edit(edit(inPlan(), 'acme', { kind: 'divider', from: 3 }), 'acme', { kind: 'repeat' }), { runId: 'A' })!;
    expect(last.rows[5].divider).toEqual({ seq: 'acme', from: 3, canUp: true, canDown: false });
    const none = planView(edit(inPlan(), 'acme', { kind: 'divider' }), { runId: 'A' })!;
    expect([none.divider, none.rows.some((r) => r.divider)]).toEqual([undefined, false]);
    // A routine inside has its own divider, on its own rows.
    const inner = planView(edit(inPlan(), 'send', { kind: 'divider', from: 1 }), { runId: 'A' })!;
    expect(inner.rows[4].divider).toEqual({ seq: 'send', from: 1, canUp: true, canDown: false });
    expect(inner.divider).toMatchObject({ seq: 'acme', from: 2 });
  });

  it('each row says what its menu can do: move up / down within its own sequence, and by kind — a step is reworded, broken down, made a wait; a wait is reworded, made a step; a routine opens', () => {
    const v = planView(inPlan(), { runId: 'A' })!;
    expect(v.rows.map((r) => [r.words, r.canUp, r.canDown])).toEqual([
      ['Read the ad', false, true],
      ['Tailor the CV', true, true],
      ['Send it off', true, true],
      ['Attach the CV', false, true],
      ['Press send', true, false],
      ['a reply', true, false],
    ]);
    expect(v.rows.map((r) => r.kind)).toEqual(['step', 'step', 'routine', 'step', 'step', 'wait']);
  });

  it('a step broken down in Plan is a row that is its own sequence (`broken`, with that sequence’s id): its words are changed there (`rename`), and they are the step’s words; a named routine used as a step is not `broken`', () => {
    const d = edit(inPlan(), 'acme', { kind: 'breakDown', item: 'a', steps: ['Open the page'] });
    const v = planView(d, { runId: 'A' })!;
    const row = v.rows[0];
    expect(row).toMatchObject({ kind: 'routine', words: 'Read the ad', broken: true });
    expect(d.routines[row.ref!]).toMatchObject({ named: false, words: 'Read the ad' });
    expect(v.rows.find((r) => r.itemId === 's')).toMatchObject({ kind: 'routine', ref: 'send' });
    expect(v.rows.find((r) => r.itemId === 's')!.broken).toBeUndefined();
    expect(v.rows.find((r) => r.itemId === 'b')!.ref).toBeUndefined();
    // Change the words of the broken-down step: the row reads them; nothing else moves.
    expect(whatChanged(d, { kind: 'editRoutine', routineId: row.ref!, edit: { kind: 'rename', words: 'Read the advert' } })).toBe('Changed “Read the ad”');
    const renamed = edit(d, row.ref!, { kind: 'rename', words: '  Read the   advert ' });
    expect(planView(renamed, { runId: 'A' })!.rows[0]).toMatchObject({ words: 'Read the advert', broken: true });
    expect(renamed.runs.A).toBe(d.runs.A);
  });

  it('a wait as HERE is still "planning · at <its words>" and "Resume at <its words>" (one wording); `hereKind` says it is a wait', () => {
    const v = planView(inPlan([{ seq: 'acme', at: 'w', round: 1 }]), { runId: 'A' })!;
    expect([v.line, v.forward?.label, v.hereKind]).toEqual(['at a reply', 'Resume at a reply', 'wait']);
  });

  it('the edge: "planning · nothing next yet"; no filled button (nothing to resume at); Done has its slot; no row is HERE', () => {
    const d = world([seq('g', 'Learn Spanish', [step('a', 'Find a tutor')], { open: true, home: true })], [aRun('A', 'g', [{ seq: 'g', at: null, round: 1 }], { status: 'paused', mode: 'plan' })]);
    const v = planView(d, { runId: 'A' })!;
    expect(v).toMatchObject({ planning: true, line: 'nothing next yet', edge: true, canDone: true });
    expect([v.at, v.forward, v.hereKind]).toEqual([undefined, undefined, undefined]);
    expect(v.rows.map((r) => [r.words, r.here])).toEqual([['Find a tutor', false]]);
    // The same for a run the build before left at the edge with nothing stored about a mode.
    const legacy = world([seq('g', 'Learn Spanish', [], { open: true })], [aRun('A', 'g', [{ seq: 'g', at: null, round: 1 }], { status: 'running' })]);
    expect(planView(legacy, { runId: 'A' })).toMatchObject({ planning: true, line: 'nothing next yet', edge: true, rows: [] });
  });

  it('after each Plan edit the view follows: removing HERE moves HERE and the label to the next step; breaking HERE down puts HERE on the first small step', () => {
    const removed = planView(edit(inPlan(), 'acme', { kind: 'remove', item: 'b' }), { runId: 'A' })!;
    expect([removed.line, removed.forward?.label]).toEqual(['at Send it off', 'Resume at Send it off']);
    expect(removed.rows.filter((r) => r.here).map((r) => r.words)).toEqual(['Send it off']);
    const broken = planView(edit(inPlan(), 'acme', { kind: 'breakDown', item: 'b', steps: ['Open the CV', 'Cut a page'] }), { runId: 'A' })!;
    expect(broken.rows.slice(1, 4).map((r) => [r.depth, r.kind, r.words, r.here, r.within])).toEqual([
      [0, 'routine', 'Tailor the CV', false, true],
      [1, 'step', 'Open the CV', true, false],
      [1, 'step', 'Cut a page', false, false],
    ]);
    expect(broken.forward?.label).toBe('Resume at Open the CV');
  });

  it('P-101 (ruling 4; was "paused or left: `planning` is false"): Plan is a view — a running run is not Plan’s to show (`planning` false, the route follows the data); a paused one is, "at <step>"; an ended run or one that is gone has no Plan', () => {
    expect(planView(running(), { runId: 'A' })).toMatchObject({ planning: false, line: '', runId: 'A' });
    expect(planView(ok(running(), { kind: 'pause', runId: 'A' }).data, { runId: 'A' })).toMatchObject({ planning: true, line: 'at Tailor the CV' });
    expect(planView(ok(running(), { kind: 'done', runId: 'A' }).data, { runId: 'A' })).toBeUndefined();
    expect(planView(running(), { runId: 'nope' })).toBeUndefined();
  });

  it('thirty steps with HERE in the middle, a routine that holds itself, and a frame ten deep: listed, bounded, exactly one HERE', () => {
    const big = world([seq('B', 'Big', Array.from({ length: 30 }, (_, i) => step(`s${i}`)))], [aRun('A', 'B', [{ seq: 'B', at: 's17', round: 1 }], { status: 'paused', mode: 'plan' })]);
    const v = planView(big, { runId: 'A' })!;
    expect(v.rows).toHaveLength(30);
    expect(v.rows.findIndex((r) => r.here)).toBe(17);
    const self = world([seq('S', 'Self', [step('a'), ref('s', 'S')])], [aRun('A', 'S', [{ seq: 'S', at: 'a', round: 1 }], { status: 'paused', mode: 'plan' })]);
    expect(planView(self, { runId: 'A' })!.rows.map((r) => r.words)).toEqual(['a', 'Self']);
    let d = world([seq('R', 'R', [step('a')])], [aRun('A', 'R', [{ seq: 'R', at: 'a', round: 1 }], { status: 'paused', mode: 'plan' })]);
    for (let i = 0; i < 9; i++) {
      const here = planView(d, { runId: 'A' })!.rows.find((r) => r.here)!;
      d = edit(d, here.seq, { kind: 'breakDown', item: here.itemId, steps: ['deeper'] });
    }
    const deep = planView(d, { runId: 'A' })!;
    expect(deep.rows).toHaveLength(10);
    expect(deep.rows.filter((r) => r.here)).toHaveLength(1);
    expect(deep.rows[9]).toMatchObject({ depth: 9, here: true, words: 'deeper' });
  });

  it('a run from the build before that still carries this-run changes says so (`unfolded`): Plan reads what the run reads until `plan` folds them', () => {
    const BEFORE = JSON.parse(readFileSync(join(__dirname, '../storage/fixtures/golden/p90-expected.json'), 'utf8')).data as Data;
    const v = planView(BEFORE, { runId: 'p90-008' })!;
    // P-101 (ruling 4; was `planning: false`): a run left on a step, not running, is Plan's to show.
    expect(v).toMatchObject({ planning: true, unfolded: true, name: 'Apply for jobs' });
    expect(v.rows.filter((r) => r.depth === 0).map((r) => r.words)).toEqual(['Open the tracker', 'Tailor the CV', 'Ask Sam to proofread', 'a reply', 'Log it in the sheet']);
    const folded = ok(BEFORE, { kind: 'plan', runId: 'p90-008' }).data;
    const after = planView(folded, { runId: 'p90-008' })!;
    expect(after).toMatchObject({ planning: true, unfolded: false, line: 'at Find the right tab' });
    expect(after.rows.map((r) => [r.depth, r.words])).toEqual(v.rows.map((r) => [r.depth, r.words]));
    expect(after.divider).toEqual({ seq: 'p90-007', from: 1, repeat: 5, canUp: true, canDown: true });
  });
});

describe('a row’s Move up / Move down, the divider being a row (one press, one row)', () => {
  it('every row its selector says can move does move, by exactly one row — the first step under a divider at the very top included — and one it says cannot is refused', () => {
    // The rows as the list shows them: "|" is Repeat from here.
    const shape = (d: Data) => {
      const s = d.routines.G as Routine;
      const ids = (s.items as Item[]).map((i) => i.id);
      if (typeof s.repeatFrom === 'number') ids.splice(s.repeatFrom, 0, '|');
      return ids;
    };
    for (const from of [undefined, 0, 1, 2]) {
      const d = world([seq('G', 'Gym', [step('a'), step('b'), step('c')], from === undefined ? {} : { repeatFrom: from })]);
      const v = planView(d, { routineId: 'G' })!;
      for (const row of v.rows) {
        for (const by of [-1, 1] as const) {
          const can = by === -1 ? row.canUp : row.canDown;
          const r = editRoutine(d, 'G', { kind: 'move', item: row.itemId, by }, env());
          expect(r.ok, `from ${from}: ${row.itemId} by ${by}`).toBe(can);
          if (!can) continue;
          const before = shape(d);
          const at = before.indexOf(row.itemId);
          const moved = [...before];
          [moved[at], moved[at + by]] = [moved[at + by], moved[at]];
          // (A divider left with nothing beneath it is gone.)
          expect(shape(r.data), `from ${from}: ${row.itemId} by ${by}`).toEqual(moved[moved.length - 1] === '|' ? moved.slice(0, -1) : moved);
        }
      }
    }
    // The case the flag exists for: | a b c — a can move up, past the divider.
    const top = planView(world([seq('G', 'Gym', [step('a'), step('b'), step('c')], { repeatFrom: 0 })]), { routineId: 'G' })!;
    expect(top.rows.map((r) => [r.itemId, r.canUp, r.canDown])).toEqual([['a', true, true], ['b', true, true], ['c', true, false]]);
  });
});

describe('Plan’s view of a routine with no run', () => {
  it('the name, the rows with no HERE, the divider; the filled button is Start, ready when there is a step', () => {
    const v = planView(world([acme(), send()]), { routineId: 'acme' })!;
    expect(v).toMatchObject({ routineId: 'acme', name: 'Apply to Acme', planning: false, line: '', edge: false, canDone: false, unfolded: false });
    expect(v.runId).toBeUndefined();
    expect(v.forward).toEqual({ kind: 'start', label: 'Start', routineId: 'acme', ready: true });
    expect(v.rows.map((r) => [r.depth, r.words, r.here])).toEqual([[0, 'Read the ad', false], [0, 'Tailor the CV', false], [0, 'Send it off', false], [1, 'Attach the CV', false], [1, 'Press send', false], [0, 'a reply', false]]);
    expect(v.divider).toEqual({ seq: 'acme', from: 2, repeat: 3, canUp: true, canDown: true });
  });

  it('an empty routine (just made by "New"): no rows; Start is not ready until a step exists', () => {
    const made = ok(emptyData(), { kind: 'new', words: 'Learn Spanish' });
    const v = planView(made.data, { routineId: made.routineId! })!;
    expect(v).toMatchObject({ name: 'Learn Spanish', rows: [], open: true });
    expect(v.forward).toEqual({ kind: 'start', label: 'Start', routineId: made.routineId, ready: false });
    const withStep = edit(made.data, made.routineId!, { kind: 'addStep', text: 'Find a tutor' });
    expect(planView(withStep, { routineId: made.routineId! })!.forward).toMatchObject({ kind: 'start', ready: true });
  });

  it('a routine that has an open run reads as that run’s Plan (one surface per run): the route goes to the run', () => {
    const v = planView(inPlan(), { routineId: 'acme' })!;
    expect(v).toMatchObject({ runId: 'A', planning: true, line: 'at Tailor the CV' });
  });

  it('a removed routine, or one that is not there, has no Plan', () => {
    const d = world([acme(), send()]);
    expect(planView(d, { routineId: 'nope' })).toBeUndefined();
    expect(planView(edit(d, 'acme', { kind: 'removeRoutine' }), { routineId: 'acme' })).toBeUndefined();
  });
});

describe('the runner’s view, without planning', () => {
  it('the middle button is Plan on a step, on a wait and on a routine with nothing in it; Step in when the step is a routine with steps', () => {
    const d = world([seq('R', 'R', [step('a'), wait('w'), ref('k', 'send'), ref('e', 'E')]), send(), seq('E', 'Empty', [])], [aRun('A', 'R', [{ seq: 'R', at: 'a', round: 1 }], { status: 'running' })]);
    const on = (item: string) => runnerView({ ...d, runs: { A: { ...d.runs.A, frames: [{ seq: 'R', at: item, round: 1 }] } } }, 'A')!;
    expect([on('a').middle, on('w').middle, on('k').middle, on('e').middle]).toEqual(['plan', 'plan', 'stepIn', 'plan']);
    expect(on('a')).toMatchObject({ planning: false, next: 'next' });
    expect(on('w').next).toBe('itsHappened');
    expect('thisRunOnly' in on('a')).toBe(false);
  });

  it('P-101 (ruling 4; was "a run in Plan says `planning`"): Plan pauses it, plainly — `planning` is the edge only; a run at the edge says `planning`: the runner never shows it (the route goes to Plan)', () => {
    expect(runnerView(inPlan(), 'A')).toMatchObject({ planning: false, status: 'paused' });
    const edge = world([seq('g', 'Goal', [], { open: true })], [aRun('A', 'g', [{ seq: 'g', at: null, round: 1 }], { status: 'running' })]);
    expect(runnerView(edge, 'A')).toMatchObject({ planning: true, step: { kind: 'edge' }, middle: 'plan' });
  });

  it('the panel has the round, "then:", Back to <step>, the wait and the reason — and nothing of planning (no "This run only", no Keep, no Change the words)', () => {
    const p = panelView(running([{ seq: 'acme', at: 'w', round: 2 }], { waitingSince: '2026-11-24T10:00:00.000Z', reason: 'lunch' }), 'A')!;
    expect(p).toEqual({ round: { n: 2, of: 3 }, lastOfRound: true, then: 'Send it off', backTo: 'Send it off', wait: { words: 'a reply', since: '2026-11-24T10:00:00.000Z' }, reason: 'lunch' });
  });

  it('Jump to… still lists every step with its path and where the run is', () => {
    const v = seeItAll(running(), 'A')!;
    expect(v.rows.map((r) => [r.path.join('/'), r.here])).toEqual([['a', false], ['b', true], ['s', false], ['s/s1', false], ['s/s2', false], ['w', false]]);
    expect(v.rows.some((r) => 'thisRunOnly' in r)).toBe(false);
  });
});

describe('where a run’s screen is (routes follow the data and write nothing)', () => {
  it('Plan for a run in Plan or at the edge; the runner for one running or left on a step; home for the one paused (P-96, ruling 7; was: the paused screen), for an ended one or none', () => {
    expect(runRoute(running(), 'A')).toBe('runner');
    // P-101 (ruling 4; was 'plan'): opened in Plan it is paused — the runner's address sends it home.
    expect(runRoute(inPlan(), 'A')).toBe('home');
    const paused = ok(running(), { kind: 'pause', runId: 'A' }).data;
    expect(runRoute(paused, 'A')).toBe('home');
    expect(runRoute(ok(paused, { kind: 'home', runId: 'A' }).data, 'A')).toBe('runner');
    expect(runRoute(ok(inPlan(), { kind: 'home', runId: 'A' }).data, 'A')).toBe('runner');
    expect(runRoute(ok(inPlan(), { kind: 'resume', runId: 'A' }).data, 'A')).toBe('runner');
    expect(runRoute(ok(running(), { kind: 'done', runId: 'A' }).data, 'A')).toBe('home');
    expect(runRoute(running(), 'nope')).toBe('home');
    const edge = world([seq('g', 'Goal', [], { open: true })], [aRun('A', 'g', [{ seq: 'g', at: null, round: 1 }], { status: 'running' })]);
    expect(runRoute(edge, 'A')).toBe('plan');
  });

  it('reopening the app: the runner while running; P-101 (ruling 4; was "Plan for the run the app is on when it is in Plan"): opened in Plan it is paused, so home; Plan only for a run at the edge', () => {
    expect(leftOff(running())).toEqual({ kind: 'runner', runId: 'A' });
    expect(leftOff(inPlan())).toEqual({ kind: 'home' });
    // P-96 (ruling 7; was: the paused screen): a paused run reopens home.
    expect(leftOff(ok(running(), { kind: 'pause', runId: 'A' }).data)).toEqual({ kind: 'home' });
    expect(leftOff(ok(inPlan(), { kind: 'home', runId: 'A' }).data)).toEqual({ kind: 'home' });
    const edge = world([seq('g', 'Goal', [], { open: true })], [aRun('A', 'g', [{ seq: 'g', at: null, round: 1 }], { status: 'running' })]);
    expect(leftOff(edge)).toEqual({ kind: 'plan', runId: 'A' });
  });
});

describe('home tiles and the prompt show the mode', () => {
  const tile = (d: Data, routineId = 'acme') => homeTiles(d).find((x) => x.routineId === routineId)!;

  it('P-101 (ruling 4; was "a run left in Plan: planning · at <step> with Plan"): opened in Plan it reads paused — "at <step>" with Resume; its screen-reader line says paused, never planning', () => {
    const t1 = tile(inPlan());
    expect(t1).toMatchObject({ state: 'paused', action: 'resume', at: 'Tailor the CV', runId: 'A', current: true });
    expect(tileLine(t1)).toEqual({ mark: 'paused', line: 'at Tailor the CV', button: 'Resume', spoken: 'Resume Apply to Acme', says: 'Apply to Acme, paused at Tailor the CV' });
    // Left by Home, or demoted by another start, it still says so.
    const left = ok(inPlan(), { kind: 'home', runId: 'A' }).data;
    expect(tileLine(tile(left)).line).toBe('at Tailor the CV');
    const other = ok(inPlan(), { kind: 'start', routineId: 'draw' }).data;
    expect(tile(other)).toMatchObject({ state: 'paused', action: 'resume', current: false });
    expect(tile(other, 'draw')).toMatchObject({ state: 'running', action: 'resume', current: true });
  });

  it('P-101 (ruling 4; was "still reads planning · at <step>"): opened in Plan resting on a wait, with a pause reason, it reads as any waiting run does — the wait, and the reason', () => {
    const t1 = tile(inPlan([{ seq: 'acme', at: 'w', round: 1 }], { waitingSince: '2026-11-24T10:00:00.000Z', reason: 'lunch' }));
    expect(t1).toMatchObject({ state: 'waiting', action: 'resume', reason: 'lunch' });
    expect(tileLine(t1, new Date('2026-11-25T10:00:00.000Z'))).toMatchObject({ mark: 'wait', line: 'waiting for a reply · since yesterday', button: 'Resume', reason: 'lunch' });
  });

  it('a run at the edge: "nothing next yet" (the same words as Plan), with Plan — P-101 (ruling 4; was "planning · nothing next yet"): it reads paused', () => {
    const d = world([seq('g', 'Learn Spanish', [], { open: true, home: true })], [aRun('A', 'g', [{ seq: 'g', at: null, round: 1 }])]);
    const t1 = homeTiles(d)[0];
    expect(t1).toMatchObject({ state: 'paused', action: 'plan', asking: true });
    expect(tileLine(t1)).toEqual({ mark: 'paused', line: 'nothing next yet', button: 'Plan', spoken: 'Plan Learn Spanish', says: 'Learn Spanish, paused, nothing next yet' });
    // One wording per meaning: the tile, Plan's line and the paused screen's read the same.
    expect(planView(d, { runId: 'A' })!.line).toBe(tileLine(t1).line);
  });

  it('a run that is running or paused reads as before — "at <step>" with Resume (paused: the pause mark)', () => {
    expect(tileLine(tile(running()))).toMatchObject({ line: 'at Tailor the CV', button: 'Resume' });
    const paused = tile(ok(running(), { kind: 'pause', runId: 'A' }).data);
    expect(paused).toMatchObject({ state: 'paused', action: 'resume' });
    expect(tileLine(paused)).toMatchObject({ mark: 'paused', line: 'at Tailor the CV', button: 'Resume' });
  });

  it('a routine with nothing going: Start, as before; one with no steps yet says so (`empty`: there is nothing to start — its Plan is where the first step is added)', () => {
    const d = world([acme(), send(), seq('new', 'Learn Spanish', [], { home: true, open: true })]);
    expect(tile(d)).toMatchObject({ state: 'idle', action: 'start' });
    expect(tile(d).empty).toBeUndefined();
    expect(tile(d, 'new')).toMatchObject({ state: 'idle', action: 'start', empty: true });
    expect(tileLine(tile(d, 'new'))).toEqual({ line: '', button: 'Start', spoken: 'Start Learn Spanish', says: 'Learn Spanish' });
  });

  it('the prompt: P-101 (ruling 4; was "a planning run’s row takes you into its Plan"): a run opened in Plan is paused — its row resumes it; P-95: no "New: <words>" row', () => {
    const rows = searchStarts(inPlan(), 'apply');
    expect(rows.map((r) => [r.kind, r.words, r.action, r.runId])).toEqual([['tile', 'Apply to Acme', 'resume', 'A']]);
    expect(searchStarts(inPlan(), '').map((r) => r.action)).toEqual(['resume', 'start']);
  });
});

describe('the paused screen for a run left in Plan', () => {
  it('P-101 (ruling 4; was "shows it as planning, with Plan"): a run opened in Plan is paused, with Resume; the others under it show their own state', () => {
    let d = inPlan();
    expect(pausedView(d, 'A')).toMatchObject({ kind: 'paused', action: 'resume', at: 'Tailor the CV', name: 'Apply to Acme' });
    d = ok(d, { kind: 'start', routineId: 'draw' }).data;
    const other = Object.keys(d.runs).find((id) => id !== 'A')!;
    d = ok(d, { kind: 'pause', runId: other }).data;
    const v = pausedView(d, other)!;
    expect(v).toMatchObject({ kind: 'paused', action: 'resume' });
    expect(v.others.map((x) => [x.name, x.state, x.action])).toEqual([['Apply to Acme', 'paused', 'resume']]);
  });

  it('a paused run that is not in Plan is "paused" (or "waiting") with Resume, as before', () => {
    expect(pausedView(ok(running(), { kind: 'pause', runId: 'A' }).data, 'A')).toMatchObject({ kind: 'paused', action: 'resume' });
    expect(pausedView(ok(running([{ seq: 'acme', at: 'w', round: 1 }], { waitingSince: '2026-11-24T10:00:00.000Z' }), { kind: 'pause', runId: 'A' }).data, 'A')).toMatchObject({ kind: 'waiting', action: 'resume' });
  });
});

describe('the notice after a Plan edit names it (its Undo lasts until the next action)', () => {
  const d = () => world([acme(), send(), seq('one', 'One loop', [step('p'), step('q')], { repeatFrom: 1 })], [aRun('A', 'acme', [{ seq: 'acme', at: 'b', round: 1 }], { status: 'paused', mode: 'plan' })]);
  const says = (e: RoutineEdit, routineId = 'acme') => whatChanged(d(), { kind: 'editRoutine', routineId, edit: e });

  it('break down, make a wait, back to a step', () => {
    expect(says({ kind: 'breakDown', item: 'b', steps: ['x'] })).toBe('Broke down “Tailor the CV”');
    expect(says({ kind: 'toWait', item: 'b' })).toBe('Made “Tailor the CV” a wait');
    expect(says({ kind: 'toStep', item: 'w' })).toBe('Made “a reply” a step');
  });

  it('the divider moved says above which step; put in where there was none it says so; taken out and the number as before', () => {
    expect(says({ kind: 'divider', from: 1 })).toBe('Repeat from here moved above “Tailor the CV”');
    expect(says({ kind: 'divider', from: 0 }, 'send')).toBe('Repeat from here added above “Attach the CV”');
    expect(says({ kind: 'divider' })).toBe('Changed Repeat from here');
    expect(says({ kind: 'repeat', times: 2 })).toBe('Changed Repeat from here');
  });

  it('Remove names its reach: a broken-down step’s smaller steps go with it; the last repeating step takes Repeat from here with it', () => {
    expect(says({ kind: 'remove', item: 'b' })).toBe('Removed “Tailor the CV”');
    const broken = edit(d(), 'acme', { kind: 'breakDown', item: 'b', steps: ['x', 'y'] });
    expect(whatChanged(broken, { kind: 'editRoutine', routineId: 'acme', edit: { kind: 'remove', item: 'b' } })).toBe('Removed “Tailor the CV” and its smaller steps');
    // A named routine used as a step is not this step's own: removing the step does not reach into it.
    expect(says({ kind: 'remove', item: 's' })).toBe('Removed “Send it off”');
    expect(says({ kind: 'remove', item: 'q' }, 'one')).toBe('Removed “q” — Repeat from here went with it');
    expect(says({ kind: 'remove', item: 'p' }, 'one')).toBe('Removed “p”');
    // Moving the only repeating step out of the repeating part does the same.
    expect(says({ kind: 'move', item: 'q', by: -1 }, 'one')).toBe('Moved “q” — Repeat from here went with it');
    expect(says({ kind: 'move', item: 'b', by: 1 })).toBe('Moved “Tailor the CV”');
  });

  it('Plan, Resume and creating: Plan and Resume say nothing by themselves; the fold says what it did; New names what was made', () => {
    expect(whatChanged(d(), { kind: 'plan', runId: 'A' })).toBe('');
    expect(whatChanged(d(), { kind: 'resume', runId: 'A' })).toBe('');
    expect(whatChanged(d(), { kind: 'new', words: '  Learn   Spanish ' })).toBe('Made “Learn Spanish”');
    expect(noticeFor('plan', undefined)).toEqual({ text: '', label: 'Plan' });
    expect(noticeFor('plan', undefined, false, 'Apply for jobs')).toEqual({ text: 'Kept this run’s changes in Apply for jobs', label: 'Plan' });
    expect(noticeFor('next', { kind: 'edge' }, false, 'Goal')).toEqual({ text: 'Kept this run’s changes in Goal', label: 'Next' });
    expect(noticeFor('done', { kind: 'finished', names: ['Inner'] }, false, 'Goal')).toEqual({ text: 'Left Inner · Kept this run’s changes in Goal', label: 'Step out' });
    expect(noticeFor('new', undefined)).toEqual({ text: '', label: 'New' });
  });
});
