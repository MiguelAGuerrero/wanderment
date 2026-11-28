/**
 * P-98: calls — a routine as a step, with what it asks and gives. One test (or more) per line of the roadmap's
 * *Done when* and per ruling of the batch brief. Expected values come from the roadmap, the rulings, B-16 ("A
 * called routine returns; it never writes", "A step owes what its insides give", "One name … is one list") and
 * B-15 journey 5 — never from running the engine.
 *
 * The owner's case runs through it: "Improve my workout routine" — "List out my doubts" gives {concerns}, then a
 * call to "Research" (which reads {concerns} and gives {findings}), then "Decide using {findings}".
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { applyUndo, undoEntry } from './diff';
import { callersOf, callIO, editRoutine, Env, Item, MAX_DEPTH, place, readRoutine, readRun, Result, RoutineEdit, runVerb, Verb, visibleValue } from './run';
import { planView, runnerView, valueDetail, valueTrace, whatChanged } from './runView';
import { myRoutines } from './routines';
import { Data, emptyData, Id, Routine } from './types';
import { joinItems, nameKey } from './values';

const T0 = Date.UTC(2026, 10, 27, 9, 0, 0);
let n = 0;
let t = 0;
beforeEach(() => {
  n = 0;
  t = 0;
});
const env = (): Env => ({ now: new Date(T0 + 1000 * t++).toISOString(), id: () => `x${++n}` });
const go = (d: Data, verb: Verb): Result => runVerb(d, verb, env());
const ok = (d: Data, verb: Verb): Data => {
  const r = go(d, verb);
  expect(r.ok, `${JSON.stringify(verb)} refused: ${r.reason}`).toBe(true);
  return r.data;
};
const edit = (d: Data, routineId: Id, e: RoutineEdit): Result => editRoutine(d, routineId, e, env());
const okEdit = (d: Data, routineId: Id, e: RoutineEdit): Data => {
  const r = edit(d, routineId, e);
  expect(r.ok, `${JSON.stringify(e)} refused: ${r.reason}`).toBe(true);
  return r.data;
};
const step = (id: string, text = id): Item => {
  const m = /^(.*?)\s*>(\S.*)$/.exec(text);
  return m ? ({ id, text: m[1], out: m[2] } as Item) : { id, text };
};
const call = (id: string, to: string, extra: Record<string, unknown> = {}): Item => ({ id, ref: to, ...extra }) as Item;
const seq = (id: string, words: string, items: Item[], extra: Record<string, unknown> = {}): Routine => ({ id, words, named: true, createdAt: '2026-11-01T00:00:00.000Z', items, ...extra });
const unnamed = (id: string, words: string, items: Item[]): Routine => seq(id, words, items, { named: false });
const world = (...ss: Routine[]): Data => ({ ...emptyData(), routines: Object.fromEntries(ss.map((s) => [s.id, s])) });
const run = (d: Data, id: Id) => readRun(d, id)!;
const start = (d: Data, routineId: Id) => {
  const r = go(d, { kind: 'start', routineId });
  expect(r.ok).toBe(true);
  return { d: r.data, id: r.runId! };
};
const walk = (d: Data, runId: Id, ...kinds: ('next' | 'done' | 'stepIn' | 'back')[]) => kinds.reduce((data, kind) => ok(data, { kind, runId }), d);
const here = (d: Data, id: Id) => place(d, run(d, id))!.item!.id;
const typed = (d: Data, runId: Id, name: string, text: string) => ok(d, { kind: 'value', runId, name, text, item: here(d, runId) });
const seen = (d: Data, runId: Id, name: string) => {
  const e = visibleValue(d, run(d, runId), nameKey(name));
  return e ? joinItems(e.items) : '';
};
const entries = (d: Data, runId: Id) => run(d, runId).values.map((e) => `${e.level}:${e.name}=${e.items.join('|')}@${e.item}`);
const json = (v: unknown) => JSON.parse(JSON.stringify(v));
const undone = (before: Data, after: Data) => json(applyUndo(after, undoEntry(before, after)));
const items = (d: Data, id: Id) => d.routines[id].items as Record<string, unknown>[];

/** The owner's case, with Research already a step (a call) of Improve. */
const owner = (callExtra: Record<string, unknown> = {}) =>
  world(
    seq('I', 'Improve my workout routine', [step('doubts', 'List out my doubts >concerns'), call('c', 'R', callExtra), step('decide', 'Decide using {findings}')]),
    seq('R', 'Research', [step('look', 'Look into {concerns}'), step('note', 'Note what I found >findings')]),
  );

describe('Plan adds a routine as a step (a call row)', () => {
  it('Add’s "a routine": a call row is the routine by id, with its name kept beside it; after a row, or at the end; one Undo', () => {
    const d0 = world(seq('I', 'Improve', [step('doubts', 'List out my doubts >concerns'), step('decide', 'Decide')]), seq('R', 'Research', [step('look', 'Look into {concerns}')]));
    const d1 = okEdit(d0, 'I', { kind: 'addCall', routine: 'R', after: 'doubts' });
    expect(items(d1, 'I')).toEqual([{ id: 'doubts', text: 'List out my doubts', out: 'concerns' }, { id: 'x1', ref: 'R', words: 'Research' }, { id: 'decide', text: 'Decide' }]);
    const d2 = okEdit(d0, 'I', { kind: 'addCall', routine: 'R' });
    expect(items(d2, 'I').map((i) => i.id)).toEqual(['doubts', 'decide', 'x2']);
    expect(d1.routines.R).toBe(d0.routines.R);
    expect(undone(d0, d1)).toEqual(json(d0));
    expect(whatChanged(d0, { kind: 'editRoutine', routineId: 'I', edit: { kind: 'addCall', routine: 'R' } })).toBe('Added “Research”');
  });

  it('refused, in words the screen says: a routine as a step of itself, directly or through another; a removed one; a step broken down', () => {
    const d0 = world(
      seq('A', 'Alpha', [call('ab', 'B'), call('brk', 'BRK')]),
      seq('B', 'Beta', [call('bc', 'C')]),
      seq('C', 'Gamma', [step('c1')]),
      seq('X', 'Gone', [step('x1')], { removedAt: '2026-11-02T00:00:00.000Z' }),
      unnamed('BRK', 'A step broken down', [step('k1')]),
    );
    expect(edit(d0, 'A', { kind: 'addCall', routine: 'A' })).toMatchObject({ ok: false, reason: 'self', data: d0 });
    // Gamma is used by Beta, which Alpha uses: Alpha in Gamma (or Beta) would hold itself.
    expect(edit(d0, 'C', { kind: 'addCall', routine: 'A' })).toMatchObject({ ok: false, reason: 'self' });
    expect(edit(d0, 'B', { kind: 'addCall', routine: 'A' })).toMatchObject({ ok: false, reason: 'self' });
    // Inside a step broken down of Alpha: still Alpha's own steps.
    expect(edit(d0, 'BRK', { kind: 'addCall', routine: 'A' })).toMatchObject({ ok: false, reason: 'self' });
    expect(edit(d0, 'A', { kind: 'addCall', routine: 'X' })).toMatchObject({ ok: false, reason: 'gone' });
    expect(edit(d0, 'A', { kind: 'addCall', routine: 'nope' })).toMatchObject({ ok: false, reason: 'gone' });
    expect(edit(d0, 'C', { kind: 'addCall', routine: 'BRK' })).toMatchObject({ ok: false, reason: 'cannot' });
    // The other way round is fine: Gamma into Alpha again (it does not use Alpha).
    expect(edit(d0, 'A', { kind: 'addCall', routine: 'C' }).ok).toBe(true);
  });

  it('a call row reads what it asks — with {x} (by name), with {y} as x, with <words> as x, asks {x} — and what it gives', () => {
    const d0 = world(
      seq('I', 'Improve', [step('d', 'List my doubts >concerns'), step('g', 'Name a goal >goal'), call('c1', 'R'), call('c2', 'R', { with: [{ input: 'concerns', name: 'goal' }] }), call('c3', 'R', { with: [{ input: 'concerns', typed: 'my knees' }] }), call('c4', 'R', { with: [{ input: 'concerns', ask: true }] })]),
      seq('R', 'Research', [step('look', 'Look into {concerns}'), step('note', 'Note what I found >findings'), step('more', 'And {depth}')]),
    );
    const rows = planView(d0, { routineId: 'I' })!.rows.filter((r) => r.depth === 0 && r.call);
    expect(rows.map((r) => r.words)).toEqual(['Research', 'Research', 'Research', 'Research']);
    expect(rows.map((r) => r.call)).toEqual([
      { inputs: [{ input: 'concerns', mode: 'name', name: 'concerns' }, { input: 'depth', mode: 'asks' }], gives: ['findings'] },
      { inputs: [{ input: 'concerns', mode: 'name', name: 'goal' }, { input: 'depth', mode: 'asks' }], gives: ['findings'] },
      { inputs: [{ input: 'concerns', mode: 'typed', typed: 'my knees' }, { input: 'depth', mode: 'asks' }], gives: ['findings'] },
      { inputs: [{ input: 'concerns', mode: 'asks' }, { input: 'depth', mode: 'asks' }], gives: ['findings'] },
    ]);
    // A name given by the call is given in the caller: a later reader does not ask.
    const later = planView(okEdit(d0, 'I', { kind: 'addStep', text: 'Decide using {findings}' }), { routineId: 'I' })!.rows.find((r) => r.words === 'Decide using {findings}')!;
    expect(later.asks).toEqual([]);
    // My routines: what a routine asks and gives includes its calls'.
    expect(myRoutines(d0).find((r) => r.name === 'Improve')).toMatchObject({ gives: ['concerns', 'goal', 'findings'], asks: ['depth'] });
  });

  it('Edit inputs: a name given above, "as x", typed words, or Ask when it runs; each replaces the last; one Undo each; what cannot be read is kept', () => {
    const d0 = owner({ with: ['junk', { input: 'other', name: 'x' }] });
    const named = okEdit(d0, 'I', { kind: 'bind', item: 'c', input: 'concerns', to: { name: 'goal' } });
    expect(items(named, 'I')[1].with).toEqual(['junk', { input: 'other', name: 'x' }, { input: 'concerns', name: 'goal' }]);
    const typedIn = okEdit(named, 'I', { kind: 'bind', item: 'c', input: 'concerns', to: { typed: 'my knees' } });
    expect(items(typedIn, 'I')[1].with).toEqual(['junk', { input: 'other', name: 'x' }, { input: 'concerns', typed: 'my knees' }]);
    const asked = okEdit(typedIn, 'I', { kind: 'bind', item: 'c', input: 'concerns', to: { ask: true } });
    expect(items(asked, 'I')[1].with).toEqual(['junk', { input: 'other', name: 'x' }, { input: 'concerns', ask: true }]);
    // "with {concerns}": the same name, by name — nothing kept for it.
    const byName = okEdit(asked, 'I', { kind: 'bind', item: 'c', input: 'concerns', to: { name: 'Concerns' } });
    expect(items(byName, 'I')[1].with).toEqual(['junk', { input: 'other', name: 'x' }]);
    expect(undone(typedIn, asked)).toEqual(json(typedIn));
    expect(edit(d0, 'I', { kind: 'bind', item: 'c', input: 'concerns', to: { typed: '  ' } })).toMatchObject({ ok: false, reason: 'empty' });
    expect(edit(d0, 'I', { kind: 'bind', item: 'doubts', input: 'concerns' })).toMatchObject({ ok: false, reason: 'not-a-routine' });
    // `with` in a shape this version cannot read is never written over.
    expect(edit(owner({ with: { odd: true } }), 'I', { kind: 'bind', item: 'c', input: 'concerns', to: { ask: true } })).toMatchObject({ ok: false, reason: 'cannot' });
  });
});

describe('inputs resolve typed → by name where it runs → asked; each is the called routine’s own copy', () => {
  it('the owner’s case: {concerns} given above reaches Research by name, from “List out my doubts”', () => {
    let { d, id } = start(owner(), 'I');
    d = typed(d, id, 'concerns', 'form, time');
    d = walk(d, id, 'next');
    expect(runnerView(d, id)!.moves.stepIn).toBe(true);
    d = walk(d, id, 'stepIn');
    expect(seen(d, id, 'concerns')).toBe('form, time');
    const v = runnerView(d, id)!;
    expect(v).toMatchObject({ parent: 'Improve my workout routine', level: 'Research' });
    expect(v.step.parts).toContainEqual({ kind: 'value', name: 'concerns', text: 'form, time' });
    expect(v.values).toEqual([{ name: 'concerns', text: 'form, time', items: ['form, time'], level: 1, mine: false, from: 'List out my doubts' }]);
    expect(valueDetail(d, id, 'concerns')).toMatchObject({ from: 'List out my doubts', routine: 'Improve my workout routine' });
    // Its trace goes to where it was given.
    expect(valueTrace(d, id, 'concerns')!.map((l) => [l.routine, l.step])).toEqual([['Improve my workout routine', 'List out my doubts']]);
  });

  it('typed words win over a name there is; {y} as x copies y; Ask when it runs asks even with the name there', () => {
    const typedRun = start(owner({ with: [{ input: 'concerns', typed: 'my knees' }] }), 'I');
    let d = walk(typed(typedRun.d, typedRun.id, 'concerns', 'form'), typedRun.id, 'next', 'stepIn');
    expect(seen(d, typedRun.id, 'concerns')).toBe('my knees');
    expect(runnerView(d, typedRun.id)!.values[0]).toMatchObject({ name: 'concerns', from: 'Improve my workout routine' });

    const d0 = world(
      seq('I', 'Improve', [step('g', 'Name a goal >goal'), step('doubts', 'List >concerns'), call('c', 'R', { with: [{ input: 'concerns', name: 'goal' }] })]),
      seq('R', 'Research', [step('look', 'Look into {concerns}')]),
    );
    const asName = start(d0, 'I');
    d = typed(asName.d, asName.id, 'goal', 'run a 10k');
    d = walk(d, asName.id, 'next');
    d = typed(d, asName.id, 'concerns', 'not this');
    d = walk(d, asName.id, 'next', 'stepIn');
    expect(seen(d, asName.id, 'concerns')).toBe('run a 10k');

    const asked = start(owner({ with: [{ input: 'concerns', ask: true }] }), 'I');
    d = walk(typed(asked.d, asked.id, 'concerns', 'form'), asked.id, 'next', 'stepIn');
    expect(seen(d, asked.id, 'concerns')).toBe('');
    expect(runnerView(d, asked.id)!.fields).toEqual([{ name: 'concerns', text: '', gives: false }]);
    // {y} as x with nothing given for y: asked, never read from below as x.
    const none = start(owner({ with: [{ input: 'concerns', name: 'nothing' }] }), 'I');
    d = walk(typed(none.d, none.id, 'concerns', 'form'), none.id, 'next', 'stepIn');
    expect(seen(d, none.id, 'concerns')).toBe('');
  });

  it('an input is the callee’s own copy: changed inside (its field, the value sheet), the caller’s stays; only what the call row gives comes back', () => {
    let { d, id } = start(owner(), 'I');
    d = typed(d, id, 'concerns', 'form, time');
    d = walk(d, id, 'next', 'stepIn');
    // The value sheet, inside Research.
    d = ok(d, { kind: 'value', runId: id, name: 'concerns', text: 'only form' });
    expect(seen(d, id, 'concerns')).toBe('only form');
    expect(entries(d, id)).toEqual(['0:concerns=form, time@doubts', '1:concerns=only form@c']);
    // Its own field, as a reader: the copy again, never the caller’s.
    d = ok(d, { kind: 'value', runId: id, name: 'concerns', text: 'only time', item: 'look' });
    expect(entries(d, id)).toEqual(['0:concerns=form, time@doubts', '1:concerns=only time@c']);
    d = walk(d, id, 'next');
    d = typed(d, id, 'findings', 'shorter sets');
    d = walk(d, id, 'next');
    expect(here(d, id)).toBe('decide');
    expect(entries(d, id)).toEqual(['0:concerns=form, time@doubts', '0:findings=shorter sets@c']);
    expect(runnerView(d, id)!.step.parts).toContainEqual({ kind: 'value', name: 'findings', text: 'shorter sets' });
    // Handed back: given by the call row (its trace names it).
    expect(valueDetail(d, id, 'findings')).toMatchObject({ from: 'Research', mine: true });
  });

  it('a run stepped in before calls copied inputs (it reads the caller’s value from below): a change inside is still its own copy', () => {
    let { d, id } = start(owner(), 'I');
    d = typed(d, id, 'concerns', 'form, time');
    d = walk(d, id, 'next', 'stepIn');
    // As the build before stored it: no copy at Research's level.
    d = { ...d, runs: { ...d.runs, [id]: { ...d.runs[id], values: (d.runs[id].values as { level: number }[]).filter((v) => v.level === 0) } } };
    expect(entries(d, id)).toEqual(['0:concerns=form, time@doubts']);
    expect(seen(d, id, 'concerns')).toBe('form, time');
    d = ok(d, { kind: 'value', runId: id, name: 'concerns', text: 'only form' });
    expect(entries(d, id)).toEqual(['0:concerns=form, time@doubts', '1:concerns=only form@doubts']);
    d = ok(d, { kind: 'value', runId: id, name: 'concerns', text: 'only time', item: 'look' });
    expect(entries(d, id)).toEqual(['0:concerns=form, time@doubts', '1:concerns=only time@doubts']);
  });

  it('a routine’s own other names never leak: what it uses inside a breakdown of its own and its inputs stay with it', () => {
    const d0 = world(
      seq('I', 'Improve', [step('doubts', 'List >concerns'), call('c', 'R'), step('decide', 'Use {findings} and {concerns}')]),
      seq('R', 'Research', [step('look', 'Look into {concerns}'), step('note', 'Note >findings')]),
    );
    let { d, id } = start(d0, 'I');
    d = walk(typed(d, id, 'concerns', 'form'), id, 'next', 'stepIn');
    d = ok(d, { kind: 'value', runId: id, name: 'concerns', text: 'changed inside' });
    d = walk(typed(walk(d, id, 'next'), id, 'findings', 'f'), id, 'next');
    expect([seen(d, id, 'concerns'), seen(d, id, 'findings')]).toEqual(['form', 'f']);
  });
});

describe('what calls give under one name in the same routine is one list, in the order given', () => {
  it('two calls giving {findings}: collected in order under one name; a step that gives it too is part of the list', () => {
    const d0 = world(
      seq('I', 'Improve', [step('own', 'My own note >findings'), call('c1', 'R'), call('c2', 'S'), step('decide', 'Decide using {findings}')]),
      seq('R', 'Research', [step('r1', 'Note >findings')]),
      seq('S', 'Survey', [step('s1', 'Ask around >findings')]),
    );
    let { d, id } = start(d0, 'I');
    d = walk(typed(d, id, 'findings', 'mine'), id, 'next', 'stepIn');
    d = walk(typed(d, id, 'findings', 'from research'), id, 'next', 'stepIn');
    d = walk(typed(d, id, 'findings', 'from the survey'), id, 'next');
    expect(here(d, id)).toBe('decide');
    expect(entries(d, id)).toEqual(['0:findings=mine|from research|from the survey@own']);
    expect(seen(d, id, 'findings')).toBe('mine, from research and from the survey');
  });
});

describe('a step owes what its insides give (Next or Step out past it without stepping in)', () => {
  it('Next on a call without stepping in: nothing extra on the step; Next asks for each name it gives still empty; typed, the trace names the call; left empty, a later reader asks', () => {
    let { d, id } = start(owner(), 'I');
    d = walk(typed(d, id, 'concerns', 'form'), id, 'next');
    // (The owner, "A guided composer": no options while running a step — the fields come with the press.)
    expect(runnerView(d, id)!.fields).toEqual([]);
    expect(runnerView(d, id)!.nextOwes).toEqual(['findings']);
    const past = ok(d, { kind: 'next', runId: id, owed: [{ name: 'findings', text: 'rest more' }, { name: 'other', text: 'x' }] });
    expect(here(past, id)).toBe('decide');
    expect(entries(past, id)).toEqual(['0:concerns=form@doubts', '0:findings=rest more@c']);
    expect(undone(d, past)).toEqual(json(d));
    expect(valueDetail(past, id, 'findings')).toMatchObject({ from: 'Research', text: 'rest more' });
    expect(valueTrace(past, id, 'findings')!.map((l) => [l.routine, l.step])).toEqual([['Improve my workout routine', 'Research']]);
    // Left empty: nothing stored; the reader asks, and the values row lists only what is held.
    const empty = walk(d, id, 'next');
    expect(entries(empty, id)).toEqual(['0:concerns=form@doubts']);
    expect(runnerView(empty, id)!.fields).toEqual([{ name: 'findings', text: '', gives: false }]);
    // (P-110, rewritten: was `missing` toEqual([]) — the "not given yet" placeholders are gone; the values row holds {concerns} only.)
    expect(runnerView(empty, id)!.values.map((v) => v.name)).toEqual(['concerns']);
  });

  it('a step broken down: only the names its smaller steps give that something outside it reads', () => {
    const d0 = world(
      seq('P', 'Prep', [call('b', 'B'), step('use', 'Use {tool}')]),
      unnamed('B', 'Set up', [step('b1', 'Pick a pencil >tool'), step('b2', 'Pick a scrap >scrap'), step('b3', 'Use {scrap}')]),
    );
    let { d, id } = start(d0, 'P');
    expect(runnerView(d, id)!).toMatchObject({ fields: [], nextOwes: ['tool'] });
    d = ok(d, { kind: 'next', runId: id, owed: [{ name: 'tool', text: 'HB' }, { name: 'scrap', text: 'no' }] });
    expect(here(d, id)).toBe('use');
    expect(entries(d, id)).toEqual(['0:tool=HB@b']);
    expect(seen(d, id, 'tool')).toBe('HB');
    expect(valueDetail(d, id, 'tool')).toMatchObject({ from: 'Set up' });
  });

  it('Step out before its giving steps were reached: the names still owed; typed, given by the call row; left empty, nothing', () => {
    let { d, id } = start(owner(), 'I');
    d = walk(typed(d, id, 'concerns', 'form'), id, 'next', 'stepIn');
    expect(runnerView(d, id)!.stepOutOwes).toEqual(['findings']);
    const out = ok(d, { kind: 'done', runId: id, owed: [{ name: 'findings', text: 'skip it' }, { name: 'nope', text: 'x' }] });
    expect(here(out, id)).toBe('decide');
    expect(entries(out, id)).toEqual(['0:concerns=form@doubts', '0:findings=skip it@c']);
    expect(valueDetail(out, id, 'findings')).toMatchObject({ from: 'Research' });
    const bare = ok(d, { kind: 'done', runId: id });
    expect(entries(bare, id)).toEqual(['0:concerns=form@doubts']);
    // Once given inside, nothing is owed: Step out hands it back.
    const inside = typed(walk(d, id, 'next'), id, 'findings', 'given');
    expect(runnerView(inside, id)!.stepOutOwes).toEqual([]);
    expect(entries(ok(inside, { kind: 'done', runId: id, owed: [{ name: 'findings', text: 'ignored' }] }), id)).toEqual(['0:concerns=form@doubts', '0:findings=given@c']);
    // A Step out that is one write: one Undo takes the move and the value back.
    expect(undone(d, out)).toEqual(json(d));
  });
});

describe('renaming a value renames it in call bindings', () => {
  it('in the caller: a binding to it, and a call that took it by its name (it keeps getting it)', () => {
    const d0 = world(
      seq('I', 'Improve', [step('doubts', 'List >concerns'), call('c1', 'R'), call('c2', 'R', { with: [{ input: 'concerns', name: 'concerns' }] }), call('c3', 'S', { with: [{ input: 'topic', name: 'concerns' }] })]),
      seq('R', 'Research', [step('look', 'Look into {concerns}')]),
      seq('S', 'Survey', [step('s', 'Ask about {topic}')]),
    );
    const d1 = okEdit(d0, 'I', { kind: 'renameValue', from: 'concerns', to: 'doubts' });
    expect(items(d1, 'I').map((i) => i.with)).toEqual([undefined, [{ input: 'concerns', name: 'doubts' }], [{ input: 'concerns', name: 'doubts' }], [{ input: 'topic', name: 'doubts' }]]);
    expect(d1.routines.R).toBe(d0.routines.R);
    let { d, id } = start(d1, 'I');
    d = walk(typed(d, id, 'doubts', 'form'), id, 'next', 'stepIn');
    expect(seen(d, id, 'concerns')).toBe('form');
    expect(undone(d0, d1)).toEqual(json(d0));
  });

  it('in the routine called: an input renamed — every call to it binds the new name, keeping what it was given', () => {
    const d0 = world(
      seq('I', 'Improve', [step('doubts', 'List >concerns'), call('c1', 'R'), call('c2', 'R', { with: [{ input: 'concerns', typed: 'knees' }] })]),
      seq('R', 'Research', [step('look', 'Look into {concerns}')]),
    );
    const d1 = okEdit(d0, 'R', { kind: 'renameValue', from: 'concerns', to: 'topic' });
    expect(items(d1, 'R')[0].text).toBe('Look into {topic}');
    expect(items(d1, 'I').map((i) => i.with)).toEqual([undefined, [{ input: 'topic', name: 'concerns' }], [{ input: 'topic', typed: 'knees' }]]);
    let { d, id } = start(d1, 'I');
    d = walk(typed(d, id, 'concerns', 'form'), id, 'next', 'stepIn');
    expect(seen(d, id, 'topic')).toBe('form');
  });
});

describe('a call to a removed routine says so and can’t be stepped into', () => {
  it('Plan and the runner read “<name> (removed)”; Step in is refused and not offered; Next passes it; its Undo brings it back', () => {
    const d0 = owner();
    const removed = okEdit(d0, 'R', { kind: 'removeRoutine' });
    expect(planView(removed, { routineId: 'I' })!.rows.map((r) => [r.words, r.call])).toEqual([
      ['List out my doubts', undefined],
      ['Research (removed)', { inputs: [], gives: [], removed: true }],
      ['Decide using {findings}', undefined],
    ]);
    let { d, id } = start(removed, 'I');
    d = walk(d, id, 'next');
    expect(runnerView(d, id)!).toMatchObject({ step: { words: 'Research (removed)', removed: true }, moves: { stepIn: false }, fields: [] });
    expect(go(d, { kind: 'stepIn', runId: id })).toMatchObject({ ok: false, reason: 'gone', data: d });
    expect(here(walk(d, id, 'next'), id)).toBe('decide');
    // A routine not there at all reads by the name its row kept.
    const lost = { ...d0, routines: { I: { ...d0.routines.I, items: [call('c', 'R', { words: 'Research' })] } } };
    expect(planView(lost, { routineId: 'I' })!.rows[0].words).toBe('Research (removed)');
    // Removing a routine that is called elsewhere: where it is called (for the confirm).
    expect(callersOf(d0, 'R').map((s) => s.words)).toEqual(['Improve my workout routine']);
    expect(callersOf(removed, 'R').map((s) => s.words)).toEqual(['Improve my workout routine']);
  });
});

describe('depth', () => {
  it('a routine holding itself (only an import can make one): Step in stays offered and is refused past the depth limit, the run unmoved', () => {
    const d0 = world(seq('S', 'Self', [call('s', 'S'), step('z')]));
    let { d, id } = start(d0, 'S');
    for (let i = 1; i < MAX_DEPTH; i++) d = ok(d, { kind: 'stepIn', runId: id });
    expect(run(d, id).frames).toHaveLength(MAX_DEPTH);
    expect(runnerView(d, id)!.moves.stepIn).toBe(true);
    expect(go(d, { kind: 'stepIn', runId: id })).toMatchObject({ ok: false, reason: 'too-deep', data: d });
    expect(callIO(d0, 'S')).toEqual({ asks: [], gives: [] });
  });
});

describe('Copy', () => {
  it('a copy under a new name: the same steps (new ids), its steps broken down copied too, the same calls, its divider and tags; one Undo', () => {
    const d0 = world(
      seq('D', 'Drawing', [step('a', 'Pick >subject'), call('b', 'B'), call('c', 'R', { with: [{ input: 'x', typed: 'y' }] }), step('z', 'Shade {subject}')], { repeatFrom: 1, repeat: 3, tags: ['art'], open: true, home: false, later: { kept: 1 } }),
      unnamed('B', 'Warm up', [step('b1', 'Lines')]),
      seq('R', 'Research', [step('r1', 'Look')]),
    );
    const r = edit(d0, 'D', { kind: 'copy', words: '  Drawing  (copy) ' });
    expect(r.ok).toBe(true);
    const copy = r.data.routines[r.routineId!];
    expect(copy).toMatchObject({ words: 'Drawing (copy)', named: true, repeatFrom: 1, repeat: 3, tags: ['art'], open: true, home: true, later: { kept: 1 } });
    const ci = copy.items as Record<string, unknown>[];
    expect(ci.map((i) => i.text ?? i.ref)).toEqual(['Pick', expect.not.stringMatching(/^B$/), 'R', 'Shade {subject}']);
    expect(ci.every((i) => !['a', 'b', 'c', 'z'].includes(i.id as string))).toBe(true);
    expect(ci[0].out).toBe('subject');
    expect(ci[2].with).toEqual([{ input: 'x', typed: 'y' }]);
    const brk = readRoutine(r.data, ci[1].ref as string)!;
    expect(brk).toMatchObject({ named: false, words: 'Warm up' });
    expect(brk.items.map((i) => ('text' in i ? i.text : ''))).toEqual(['Lines']);
    expect(r.data.routines.D).toBe(d0.routines.D);
    expect(r.data.routines.B).toBe(d0.routines.B);
    expect(myRoutines(r.data).map((x) => x.name)).toEqual(['Drawing', 'Drawing (copy)', 'Research']);
    expect(undone(d0, r.data)).toEqual(json(d0));
    expect(whatChanged(d0, { kind: 'editRoutine', routineId: 'D', edit: { kind: 'copy', words: 'Drawing (copy)' } })).toBe('Copied “Drawing” as “Drawing (copy)”');
  });

  it('refused: a name in use (any case), no name, a step broken down', () => {
    const d0 = world(seq('D', 'Drawing', [step('a')]), seq('E', 'Errands', [step('e')]), unnamed('B', 'Warm up', [step('b')]));
    expect(edit(d0, 'D', { kind: 'copy', words: 'errands' })).toMatchObject({ ok: false, reason: 'same-name', data: d0 });
    expect(edit(d0, 'D', { kind: 'copy', words: 'Drawing' })).toMatchObject({ ok: false, reason: 'same-name' });
    expect(edit(d0, 'D', { kind: 'copy', words: '   ' })).toMatchObject({ ok: false, reason: 'empty' });
    expect(edit(d0, 'B', { kind: 'copy', words: 'New' })).toMatchObject({ ok: false, reason: 'cannot' });
  });
});

describe('tolerant: what this version cannot read is kept', () => {
  it('a level’s unknown fields stay through moves; bad bindings are ignored and kept; a call with fields this version does not know still runs', () => {
    const d0 = owner({ with: [{ input: 'concerns' }, 7, { input: '{bad}', typed: 'x' }], later: { kept: true } });
    let { d, id } = start(d0, 'I');
    d = walk(typed(d, id, 'concerns', 'form'), id, 'next', 'stepIn');
    expect(seen(d, id, 'concerns')).toBe('form');
    d = { ...d, runs: { ...d.runs, [id]: { ...d.runs[id], frames: (d.runs[id].frames as object[]).map((f, i) => (i === 1 ? { ...f, later: { i: 0 } } : f)) } } };
    d = walk(d, id, 'next', 'back');
    expect((d.runs[id].frames as Record<string, unknown>[])[1].later).toEqual({ i: 0 });
    expect(items(d, 'I')[1]).toMatchObject({ with: [{ input: 'concerns' }, 7, { input: '{bad}', typed: 'x' }], later: { kept: true } });
  });
});
