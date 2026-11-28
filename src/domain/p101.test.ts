/**
 * P-101 (contract rulings 1–8): moves like a debugger (Step in / Step out / Next), Pause with an optional
 * note, a calmer home (a fixed order by when each run was made, a "last" mark, no "planning"), Plan as a
 * view (mode `plan` never written, a stored one read as paused), the value sheet's trace and hoisted
 * gives. Expected values come from the contract and the owner's notes, not from running the code.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { tileLine } from './goText';
import { editRoutine, Env, Item, readRun, runVerb, Verb } from './run';
import { homeShown, homeTiles, leftOff, planView, readersOf, runnerView, valueDetail, valueTrace } from './runView';
import { Data, emptyData, Id, Routine, Run } from './types';

const T0 = Date.UTC(2026, 10, 26, 9, 0, 0);
let n = 0;
let t = 0;
beforeEach(() => {
  n = 0;
  t = 0;
});
const env = (): Env => ({ now: new Date(T0 + 1000 * t++).toISOString(), id: () => `x${++n}` });
const run = (d: Data, verb: Verb) => runVerb(d, verb, env());
const ok = (d: Data, verb: Verb): Data => {
  const r = run(d, verb);
  expect(r.ok, `${JSON.stringify(verb)} refused: ${r.reason}`).toBe(true);
  return r.data;
};
const step = (id: string, text = id): Item => {
  const m = /^(.*?)\s*>(\S.*)$/.exec(text);
  return m ? ({ id, text: m[1], out: m[2] } as Item) : { id, text };
};
const ref = (id: string, to: string): Item => ({ id, ref: to });
const seq = (id: string, words: string, items: Item[], extra: Record<string, unknown> = {}): Routine => ({ id, words, named: true, createdAt: '2026-11-01T00:00:00.000Z', home: true, items, ...extra });
const world = (...ss: Routine[]): Data => ({ ...emptyData(), routines: Object.fromEntries(ss.map((s) => [s.id, s])) });
const start = (d: Data, routineId: Id) => {
  const r = run(d, { kind: 'start', routineId });
  expect(r.ok).toBe(true);
  return { d: r.data, id: r.runId! };
};
const walk = (d: Data, runId: Id, ...kinds: ('next' | 'done' | 'stepIn')[]) => kinds.reduce((data, kind) => ok(data, { kind, runId }), d);
const typed = (d: Data, runId: Id, name: string, text: string) => {
  const r = readRun(d, runId)!;
  return ok(d, { kind: 'value', runId, name, text, item: r.frames[r.frames.length - 1].at! });
};

/** MyStack: [Vibe check (a call: [Feel, Name it]), Pick a task, Do it]. */
const stack = () =>
  world(
    seq('M', 'MyStack', [ref('vc', 'V'), step('pick', 'Pick a task'), step('do', 'Do it')]),
    seq('V', 'Vibe check', [step('feel', 'Feel'), step('name', 'Name it')], { home: false }),
  );

describe('ruling 1: the moves — Step in, Step out, Next', () => {
  it('at the top level: Step in only when the step has steps; no Step out (Next / Done covers it)', () => {
    const { d, id } = start(stack(), 'M');
    expect(runnerView(d, id)!.moves).toEqual({ stepIn: true });
    const on = walk(d, id, 'stepIn', 'done');
    expect(runnerView(on, id)).toMatchObject({ depth: 1, step: { words: 'Pick a task' }, moves: { stepIn: false } });
    expect(runnerView(on, id)!.moves.stepOut).toBeUndefined();
  });

  it('inside a call: Step out names the level it leaves, and is the engine’s Done of that level — the run goes on above it', () => {
    const { d, id } = start(stack(), 'M');
    const inside = walk(d, id, 'stepIn');
    expect(runnerView(inside, id)).toMatchObject({ depth: 2, level: 'Vibe check', moves: { stepIn: false, stepOut: { name: 'Vibe check' } } });
    const out = ok(inside, { kind: 'done', runId: id });
    expect(runnerView(out, id)).toMatchObject({ depth: 1, step: { words: 'Pick a task' }, status: 'running' });
  });
});

describe('ruling 2: Plan from inside a call opens the innermost routine', () => {
  it('the runner names it ("Plan Vibe check"); on the first layer there is none to name', () => {
    const { d, id } = start(stack(), 'M');
    expect(runnerView(d, id)!.planIn).toBeUndefined();
    expect(runnerView(walk(d, id, 'stepIn'), id)!.planIn).toEqual({ seq: 'V', name: 'Vibe check' });
  });

  it('a step broken down is part of its routine: no innermost routine of its own', () => {
    const d0 = world(seq('M', 'MyStack', [ref('b', 'B'), step('z')]), seq('B', 'Break this', [step('b1'), step('b2')], { named: false, home: false }));
    const { d, id } = start(d0, 'M');
    expect(runnerView(walk(d, id, 'stepIn'), id)!.planIn).toBeUndefined();
  });

  it('Plan focused on it: its name, its rows only (one level shallower), HERE inside it, and Resume at the run’s step', () => {
    const { d, id } = start(stack(), 'M');
    const inside = ok(walk(d, id, 'stepIn', 'next'), { kind: 'plan', runId: id });
    const v = planView(inside, { runId: id, in: 'V' })!;
    expect(v).toMatchObject({ routineId: 'V', name: 'Vibe check', runId: id, forward: { kind: 'resume', label: 'Resume at Name it' } });
    expect(v.rows.map((r) => [r.words, r.depth, r.here, r.seq])).toEqual([
      ['Feel', 0, false, 'V'],
      ['Name it', 0, true, 'V'],
    ]);
    // Not a routine the run is in: the whole run's Plan.
    expect(planView(inside, { runId: id, in: 'nope' })!.name).toBe('MyStack');
  });
});

describe('ruling 3: Pause with an optional note, stored as the run’s reason', () => {
  it('a note of several lines is kept as lines (trimmed); the tile and the runner read it on the way back in', () => {
    const { d, id } = start(stack(), 'M');
    const paused = ok(d, { kind: 'pause', runId: id, reason: '  Left off at the Notion page\n  about the  budget  \n\n' });
    expect(readRun(paused, id)!.reason).toBe('Left off at the Notion page\n  about the  budget');
    expect(homeTiles(paused).find((x) => x.runId === id)!.reason).toBe('Left off at the Notion page\nabout the budget');
    const back = ok(paused, { kind: 'resume', runId: id });
    expect(runnerView(back, id)!.reason).toBe('Left off at the Notion page\nabout the budget');
    // The first move after it drops it (as before).
    expect(runnerView(walk(back, id, 'stepIn'), id)!.reason).toBeUndefined();
  });

  it('paused again with the note emptied: the stored reason goes; with no note given at all (a press kept while reconnecting) it stays', () => {
    const { d, id } = start(stack(), 'M');
    const once = ok(d, { kind: 'pause', runId: id, reason: 'why' });
    const resumed = ok(once, { kind: 'resume', runId: id });
    expect(readRun(ok(resumed, { kind: 'pause', runId: id, reason: '   ' }), id)!.reason).toBeUndefined();
    expect(readRun(ok(resumed, { kind: 'pause', runId: id }), id)!.reason).toBe('why');
  });
});

describe('ruling 4: "planning" is not a state — Plan is a view', () => {
  it('Plan pauses a running run, plainly: mode `plan` is never written; the tile reads paused, with Resume', () => {
    const { d, id } = start(stack(), 'M');
    const planned = ok(d, { kind: 'plan', runId: id });
    expect(readRun(planned, id)!.status).toBe('paused');
    expect('mode' in planned.runs[id]).toBe(false);
    const tile = homeTiles(planned).find((x) => x.runId === id)!;
    expect(tile).toMatchObject({ state: 'paused', action: 'resume', at: 'Vibe check' });
    expect(tileLine(tile).line).toBe('at Vibe check');
    expect(planView(planned, { runId: id })!.line).toBe('at Vibe check');
    expect(leftOff(planned)).toEqual({ kind: 'home' });
  });

  it('a stored mode `plan` from an earlier build still loads: read as paused (never shown as planning), kept as stored until Resume', () => {
    const { d, id } = start(stack(), 'M');
    const paused = ok(d, { kind: 'pause', runId: id });
    const stored: Data = { ...paused, runs: { ...paused.runs, [id]: { ...paused.runs[id], mode: 'plan', reason: 'old reason' } as Run } };
    const tile = homeTiles(stored).find((x) => x.runId === id)!;
    expect(tile).toMatchObject({ state: 'paused', action: 'resume', reason: 'old reason' });
    expect(JSON.stringify(tileLine(tile))).not.toMatch(/planning/);
    expect(planView(stored, { runId: id })!.line).toBe('at Vibe check');
    expect(leftOff(stored)).toEqual({ kind: 'home' });
    // Opening Plan writes no mode and leaves the stored one where it is.
    const planned = ok(stored, { kind: 'plan', runId: id });
    expect(planned.runs[id].mode).toBe('plan');
    // Resume runs it.
    expect(runnerView(ok(stored, { kind: 'resume', runId: id }), id)).toMatchObject({ status: 'running', step: { words: 'Vibe check' } });
  });

  it('a run left at the edge by an earlier build reads "nothing next yet", paused — never "planning" — and Plan is its way in; nothing writes a mode for it', () => {
    const d0 = world(seq('E', 'Edge', [step('e1')], { open: true }));
    const edge: Data = { ...d0, runs: { r: { id: 'r', routineId: 'E', startedAt: '2026-11-01T00:00:00.000Z', frames: [{ seq: 'E', at: null, round: 1 }], changes: [], status: 'running', touchedAt: '2026-11-01T00:00:00.000Z' } as Run } };
    const tile = homeTiles(edge)[0];
    expect(tile).toMatchObject({ state: 'paused', asking: true, action: 'plan' });
    expect(tileLine(tile).line).toBe('nothing next yet');
    expect(JSON.stringify(tileLine(tile))).not.toMatch(/planning/);
    expect(planView(edge, { runId: 'r' })!.line).toBe('nothing next yet');
    // Another start: the edge run loses its status — and gets no mode.
    const other = world(seq('E', 'Edge', [step('e1')], { open: true }), seq('O', 'Other', [step('o1')]));
    const after = ok({ ...edge, routines: other.routines }, { kind: 'start', routineId: 'O' });
    expect('mode' in after.runs.r).toBe(false);
  });
});

describe('ruling 5: home keeps its order; the run touched last is marked "last"', () => {
  const made = (day: number) => ({ createdAt: `2026-11-${String(day).padStart(2, '0')}T00:00:00.000Z` });
  const home = () => world(seq('A', 'Alpha', [step('a1'), step('a2')], made(3)), seq('B', 'Beta', [step('b1'), step('b2')], made(1)), seq('C', 'Gamma', [step('c1')], made(2)));

  it('runs in the order they were made (when started), then the routines with nothing going in the order they were made; a pause, a resume or a move never reorders', () => {
    let { d, id: a } = start(home(), 'A');
    d = ok(d, { kind: 'pause', runId: a });
    const b = start(d, 'B');
    d = b.d;
    const order = () => homeShown(d).map((x) => x.name);
    expect(order()).toEqual(['Alpha', 'Beta', 'Gamma']);
    d = ok(d, { kind: 'pause', runId: b.id });
    expect(order()).toEqual(['Alpha', 'Beta', 'Gamma']);
    d = ok(d, { kind: 'resume', runId: a });
    d = walk(d, a, 'next');
    d = ok(d, { kind: 'pause', runId: a });
    expect(order()).toEqual(['Alpha', 'Beta', 'Gamma']);
    // A routine with nothing going stays after the runs, in the order routines were made.
    expect(homeShown(d).map((x) => x.state)).toEqual(['paused', 'paused', 'idle']);
  });

  it('the run touched last carries the mark, and only it', () => {
    let { d, id: a } = start(home(), 'A');
    d = ok(d, { kind: 'pause', runId: a });
    const b = start(d, 'B');
    d = ok(b.d, { kind: 'pause', runId: b.id });
    expect(homeTiles(d).filter((x) => x.current).map((x) => x.name)).toEqual(['Beta']);
    d = ok(ok(d, { kind: 'resume', runId: a }), { kind: 'pause', runId: a });
    expect(homeTiles(d).filter((x) => x.current).map((x) => x.name)).toEqual(['Alpha']);
  });
});

describe('ruling 7: the value sheet’s trace, and hoisted gives', () => {
  /** Drawing practice: [Select >subject, Vibe (a call: [Feel >mood, Note {subject} in {mood}]), Rank]. */
  const drawing = () =>
    world(
      seq('D', 'Drawing practice', [step('sel', 'Select the subject >subject'), ref('vibe', 'V'), step('rank', 'Rank them')]),
      seq('V', 'Vibe check', [step('feel', 'Feel >mood'), step('note', 'Note {subject} in {mood}')], { home: false }),
    );

  it('the chain from the run’s root to the giving step — routine › step at each level, that level’s values under it — then read by', () => {
    let { d, id } = start(drawing(), 'D');
    d = typed(d, id, 'subject', 'hands');
    d = walk(d, id, 'next', 'stepIn');
    d = typed(d, id, 'mood', 'calm');
    d = walk(d, id, 'next');
    const mood = valueDetail(d, id, 'mood')!;
    expect(valueTrace(d, id, 'mood')!.map((l) => [l.routine, l.step, l.values.map((v) => `${v.name}=${v.text}`)])).toEqual([
      ['Drawing practice', 'Vibe check', ['subject=hands']],
      ['Vibe check', 'Feel', ['mood=calm']],
    ]);
    expect(mood.readBy.map((r) => r.words)).toEqual(['Note {subject} in {mood}']);
    expect(valueTrace(d, id, 'nothing')).toBeUndefined();
    expect(valueTrace(d, id, 'subject')!.map((l) => [l.routine, l.step])).toEqual([['Drawing practice', 'Select the subject']]);
  });

  it('a step broken down whose smaller steps give names says "gives" them — on its Plan row and on the runner’s context line', () => {
    const d0 = world(
      seq('D', 'Drawing practice', [ref('b', 'B'), step('use', 'Use {subject} and {tool}')]),
      seq('B', 'Set up', [step('b1', 'Choose >subject'), ref('bb', 'BB')], { named: false, home: false }),
      seq('BB', 'Get a tool', [step('b2', 'Pick >tool')], { named: false, home: false }),
    );
    const rows = planView(d0, { routineId: 'D' })!.rows;
    expect(rows.find((r) => r.itemId === 'b')!.hoisted).toEqual(['subject', 'tool']);
    expect(rows.find((r) => r.itemId === 'bb')!.hoisted).toEqual(['tool']);
    expect(rows.find((r) => r.itemId === 'use')!.hoisted).toBeUndefined();
    const { d, id } = start(d0, 'D');
    expect(runnerView(d, id)!.gives).toEqual(['subject', 'tool']);
    expect(runnerView(walk(d, id, 'stepIn'), id)!.gives).toEqual(['subject', 'tool']);
    expect(runnerView(walk(d, id, 'next'), id)!.gives).toEqual([]);
  });
});

describe('amendment, ruling 9: Start over — the whole run, or the level it is in and the levels below', () => {
  /** Drawing practice: [Select >subject, Vibe (a call: [Feel >mood, Name it]), Rank]. */
  const drawing = () =>
    world(
      seq('D', 'Drawing practice', [step('sel', 'Select the subject >subject'), ref('vibe', 'V'), step('rank', 'Rank them')]),
      seq('V', 'Vibe check', [step('feel', 'Feel >mood'), step('name', 'Name it')], { home: false }),
    );
  const inside = () => {
    let { d, id } = start(drawing(), 'D');
    d = typed(d, id, 'subject', 'hands');
    d = walk(d, id, 'next', 'stepIn');
    d = typed(d, id, 'mood', 'calm');
    d = walk(d, id, 'next');
    return { d: ok(d, { kind: 'pause', runId: id, reason: 'lunch' }), id };
  };

  it('the whole run: back to its first step, round one, every value gone — the same run (same id), still paused; audit F4 (was: "its reason gone"): its pause note is kept — not a value given inside', () => {
    const { d, id } = inside();
    const out = ok(d, { kind: 'restart', runId: id, level: 0 });
    const r = readRun(out, id)!;
    expect(r.frames).toEqual([{ seq: 'D', at: 'sel', round: 1 }]);
    expect(r.values).toEqual([]);
    expect(r.status).toBe('paused');
    expect(r.reason).toBe('lunch');
    expect(Object.keys(out.runs)).toEqual([id]);
  });

  it('the level it is in (a call): only that level, from its first step; what was given outside it stays', () => {
    const { d, id } = inside();
    const out = ok(d, { kind: 'restart', runId: id, level: 1 });
    const r = readRun(out, id)!;
    expect(r.frames.map((f) => [f.seq, f.at])).toEqual([
      ['D', 'vibe'],
      ['V', 'feel'],
    ]);
    expect(r.values.map((v) => v.name)).toEqual(['subject']);
  });

  it('a step broken down: only what its smaller steps gave goes; refused for a level the run is not in, changing nothing', () => {
    const d0 = world(seq('D', 'Drawing practice', [step('sel', 'Select >subject'), ref('b', 'B'), step('z')]), seq('B', 'Set up', [step('b1', 'Pick >tool'), step('b2')], { named: false, home: false }));
    let { d, id } = start(d0, 'D');
    d = typed(d, id, 'subject', 'hands');
    d = walk(d, id, 'next', 'stepIn');
    d = typed(d, id, 'tool', '2B');
    d = walk(d, id, 'next');
    const out = ok(d, { kind: 'restart', runId: id, level: 1 });
    expect(readRun(out, id)!.frames.map((f) => f.at)).toEqual(['b', 'b1']);
    expect(readRun(out, id)!.values.map((v) => v.name)).toEqual(['subject']);
    const no = run(d, { kind: 'restart', runId: id, level: 5 });
    expect(no).toMatchObject({ ok: false, reason: 'no-such-level' });
    expect(no.data).toBe(d);
  });
});

describe('amendment, ruling 10: a name given by a step already passed can be given now', () => {
  const drawing = () => world(seq('D', 'Drawing practice', [step('sel', 'Select the subject >subject'), step('warm', 'Warm up'), step('find', 'Find photos of {subject}'), step('late', 'Rank them >best')]));

  // (P-110, rewritten: was "the values row offers it, 'not given yet'" — the owner: no placeholders for values not given;
  // the values row lists only what is held. Giving it late from the step the run is on still works.)
  it('passed with it empty: the values row shows nothing for it; given now from the step the run is on, readers read it, and it says where it was given', () => {
    let { d, id } = start(drawing(), 'D');
    d = walk(d, id, 'next');
    expect(runnerView(d, id)!.values).toEqual([]);
    d = ok(d, { kind: 'value', runId: id, name: 'subject', text: 'hands', item: 'warm' });
    expect(runnerView(d, id)!.values.map((v) => [v.name, v.text])).toEqual([['subject', 'hands']]);
    expect(valueDetail(d, id, 'subject')).toMatchObject({ from: 'Warm up', late: true });
    d = walk(d, id, 'next');
    expect(runnerView(d, id)!.step.parts).toEqual([{ kind: 'text', text: 'Find photos of ' }, { kind: 'value', name: 'subject', text: 'hands' }]);
  });

  // (P-110, rewritten: was "offered too" in the values row as "not given yet" — the owner: no placeholders. Gives… added
  // in Plan to a passed step: nothing stands in for it; the step reading it asks for it where it is read.)
  it('Gives… added in Plan to a step before where the run is: no placeholder; the step reading it asks there', () => {
    const d0 = world(seq('D', 'Drawing practice', [step('sel', 'Select the subject'), step('warm', 'Warm up'), step('find', 'Find photos of {subject}'), step('late', 'Rank them >best')]));
    let { d, id } = start(d0, 'D');
    d = walk(d, id, 'next');
    const r = runVerb(d, { kind: 'pause', runId: id }, env());
    const edited = (r.data.routines.D.items as Item[]).map((i) => (i.id === 'sel' ? { ...i, out: 'subject' } : i));
    d = { ...r.data, routines: { ...r.data.routines, D: { ...r.data.routines.D, items: edited } } };
    expect(runnerView(d, id)!.values).toEqual([]);
    d = walk(ok(d, { kind: 'resume', runId: id }), id, 'next');
    expect(runnerView(d, id)!.fields).toEqual([{ name: 'subject', text: '', gives: false }]);
  });

  it('a step that neither gives nor reads it cannot give a name nobody passed', () => {
    const { d, id } = start(drawing(), 'D');
    expect(run(d, { kind: 'value', runId: id, name: 'best', text: 'x', item: 'sel' })).toMatchObject({ ok: false, reason: 'cannot' });
  });
});

describe('amendment, ruling 11: removing a giving step that has readers', () => {
  const routine = () =>
    world(seq('D', 'Drawing practice', [step('sel', 'Select the subject matter >subject'), ref('b', 'B'), step('find', 'Find photos of {subject}'), step('rank', 'Rank {subject} and {other}')]), seq('B', 'Set up', [step('b1', 'Sharpen for {subject}')], { named: false, home: false }));

  it('its readers, named (its smaller steps’ too); none when another step gives the name as well, or for a step that gives nothing', () => {
    const d = routine();
    expect(readersOf(d, 'D', 'sel')).toEqual({ name: 'subject', readers: ['Sharpen for {subject}', 'Find photos of {subject}', 'Rank {subject} and {other}'] });
    expect(readersOf(d, 'D', 'find')).toBeUndefined();
    const twice = world(seq('D', 'Drawing practice', [step('sel', 'Select >subject'), step('again', 'Again >subject'), step('find', 'Find {subject}')]));
    expect(readersOf(twice, 'D', 'sel')).toBeUndefined();
  });

  it('after it goes, each reader’s row says what it asks for; Gives… on another step turns them back; a name nothing ever gave asks too', () => {
    const asks = (d: Data) => Object.fromEntries(planView(d, { routineId: 'D' })!.rows.map((r) => [r.itemId, r.asks]));
    expect(asks(routine())).toMatchObject({ find: [], rank: ['other'], b1: [] });
    const removed = editRoutine(routine(), 'D', { kind: 'remove', item: 'sel' }, env()).data;
    expect(asks(removed)).toMatchObject({ find: ['subject'], rank: ['subject', 'other'], b1: ['subject'] });
    // Audit F9: a step BELOW the readers giving it does not turn them back — they still ask when run.
    const below = editRoutine(removed, 'D', { kind: 'gives', item: 'rank', name: 'subject' }, env()).data;
    expect(asks(below)).toMatchObject({ find: ['subject'], b1: ['subject'] });
    // A step above them does.
    const above = editRoutine(removed, 'B', { kind: 'gives', item: 'b1', name: 'subject' }, env()).data;
    expect(asks(above)).toMatchObject({ find: [], rank: ['other'] });
  });
});

describe('after the audit (P-101 amendment, rulings 9–10)', () => {
  const vals = (d: Data, id: Id) => readRun(d, id)!.values.map((v) => `${v.name}=${v.items.join(',')}@${v.level}/${v.item}`);

  it('F2 (probe P1): a value given late for a step before "Repeat from here" survives the next round, as one given at the step does — stored as the giving step’s', () => {
    const R = () => world(seq('D', 'Drawing', [step('sel', 'Select >subject'), step('warm', 'Warm up'), step('find', 'Find {subject}')], { repeatFrom: 1 }));
    let { d, id } = start(R(), 'D');
    d = walk(d, id, 'next');
    d = ok(d, { kind: 'value', runId: id, name: 'subject', text: 'hands', item: 'warm' });
    expect(vals(d, id)).toEqual(['subject=hands@0/sel']);
    d = walk(d, id, 'next', 'next');
    expect(readRun(d, id)!.frames[0]).toMatchObject({ at: 'warm', round: 2 });
    expect(vals(d, id)).toEqual(['subject=hands@0/sel']);
  });

  it('F2/F3 (probe P2): given late from inside a call — survives the outer routine’s next round; its sheet says "given at" the step it was given at', () => {
    const R = () => world(seq('D', 'Drawing', [step('sel', 'Select >subject'), ref('vc', 'V'), step('find', 'Find {subject}')], { repeatFrom: 1 }), seq('V', 'Vibe', [step('feel', 'Feel'), step('nm', 'Name')], { home: false }));
    let { d, id } = start(R(), 'D');
    d = walk(d, id, 'next', 'stepIn');
    d = ok(d, { kind: 'value', runId: id, name: 'subject', text: 'hands', item: 'feel' });
    expect(valueDetail(d, id, 'subject')).toMatchObject({ from: 'Feel', late: true });
    d = walk(d, id, 'done', 'next');
    expect(readRun(d, id)!.frames[0]).toMatchObject({ round: 2 });
    expect(vals(d, id)).toEqual(['subject=hands@0/sel']);
  });

  it('a value given at its own step is never "given at"', () => {
    const R = () => world(seq('D', 'Drawing', [step('sel', 'Select >subject'), step('find', 'Find {subject}')]));
    let { d, id } = start(R(), 'D');
    d = ok(d, { kind: 'value', runId: id, name: 'subject', text: 'hands', item: 'sel' });
    expect(valueDetail(d, id, 'subject')!.late).toBeUndefined();
  });

  it('F5 (probe P4): Start over of a step broken down keeps a value whose giving step is outside it, even one given late from inside — as Start over of a call does (P3)', () => {
    const R = () => world(seq('D', 'Drawing', [step('sel', 'Select >subject'), ref('b', 'B'), step('find', 'Find {subject}')]), seq('B', 'Set up', [step('b1', 'Pick >tool'), step('b2', 'b2')], { named: false, home: false }));
    let { d, id } = start(R(), 'D');
    d = walk(d, id, 'next', 'stepIn');
    d = ok(d, { kind: 'value', runId: id, name: 'subject', text: 'hands', item: 'b1' });
    d = ok(d, { kind: 'value', runId: id, name: 'tool', text: '2B', item: 'b1' });
    d = walk(d, id, 'next');
    const out = ok(d, { kind: 'restart', runId: id, level: 1 });
    expect(vals(out, id)).toEqual(['subject=hands@0/sel']);
    const C = () => world(seq('D', 'Drawing', [step('sel', 'Select >subject'), ref('vc', 'V'), step('find', 'Find {subject}')]), seq('V', 'Vibe', [step('feel', 'Feel >mood'), step('nm', 'Name')], { home: false }));
    ({ d, id } = start(C(), 'D'));
    d = walk(d, id, 'next', 'stepIn');
    d = ok(d, { kind: 'value', runId: id, name: 'subject', text: 'hands', item: 'feel' });
    d = ok(d, { kind: 'value', runId: id, name: 'mood', text: 'calm', item: 'feel' });
    expect(vals(ok(d, { kind: 'restart', runId: id, level: 1 }), id)).toEqual(['subject=hands@0/sel']);
  });

  it('F4 (probe P5): Start over of a level keeps the pause note too', () => {
    const C = () => world(seq('D', 'Drawing', [ref('vc', 'V'), step('find', 'Find')]), seq('V', 'Vibe', [step('feel', 'Feel'), step('nm', 'Name')], { home: false }));
    let { d, id } = start(C(), 'D');
    d = walk(d, id, 'stepIn', 'next');
    d = ok(d, { kind: 'pause', runId: id, reason: 'need a 2B pencil' });
    expect(readRun(ok(d, { kind: 'restart', runId: id, level: 1 }), id)!.reason).toBe('need a 2B pencil');
  });
});
