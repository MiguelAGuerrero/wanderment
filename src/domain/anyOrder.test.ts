/**
 * P-99: In any order — parts as threads, joined. One test (or more) per clause of the roadmap's *Done when* (with the
 * owner's parked "joins that reopen" left out). Expected values come from the roadmap, B-16 ("Parts taken in any order
 * join before what follows"; "With P-99: where every part stands"), the owner's notes (2026-11-26: "a thread has
 * managed its own state … done once that single thread returns"; 2026-11-27: one name given more than once is one list,
 * "Back keeps it") and the mock-ups PlanAnyOrder / RunChoose — never from running the engine.
 *
 * The example is the mock-up's: "Get better at hands" — Warm up; In any order: Gesture practice (broken down: Draw 10
 * hands, Draw 10 feet), Study: hand anatomy, Master copy (gives {copies}); then "Compare {copies} …".
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { applyUndo, undoEntry } from './diff';
import { editRoutine, Env, Item, place, readRoutine, readRun, Result, RoutineEdit, runVerb, Verb, visibleValue } from './run';
import { homeShown, panelView, partsTree, planView, runnerView } from './runView';
import { tileLine } from './goText';
import { Data, emptyData, Id, Routine } from './types';
import { nameKey } from './values';

const T0 = Date.UTC(2026, 10, 28, 9, 0, 0);
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
const okEdit = (d: Data, routineId: Id, e: RoutineEdit): Data => {
  const r = editRoutine(d, routineId, e, env());
  expect(r.ok, `${JSON.stringify(e)} refused: ${r.reason}`).toBe(true);
  return r.data;
};
const step = (id: string, text = id): Item => {
  const m = /^(.*?)\s*>(\S.*)$/.exec(text);
  return m ? ({ id, text: m[1], out: m[2] } as Item) : { id, text };
};
const ref = (id: string, to: string): Item => ({ id, ref: to }) as Item;
const seq = (id: string, words: string, items: Item[], extra: Record<string, unknown> = {}): Routine => ({ id, words, named: true, createdAt: '2026-11-01T00:00:00.000Z', items, ...extra });
const broken = (id: string, words: string, items: Item[]) => seq(id, words, items, { named: false });
/** An In any order block as P-99 stores it: an unnamed sequence "In any order" with `any: true` (an older build: a step broken down). */
const anyOrder = (id: string, parts: Item[]) => seq(id, 'In any order', parts, { named: false, any: true });
const world = (...ss: Routine[]): Data => ({ ...emptyData(), routines: Object.fromEntries(ss.map((s) => [s.id, s])) });
const run = (d: Data, id: Id) => readRun(d, id)!;
const here = (d: Data, id: Id) => place(d, run(d, id))!.item?.id;
const depth = (d: Data, id: Id) => place(d, run(d, id))!.frames.length;
const seen = (d: Data, runId: Id, name: string) => visibleValue(d, run(d, runId), nameKey(name))?.items ?? [];
const typed = (d: Data, runId: Id, name: string, text: string) => ok(d, { kind: 'value', runId, name, text, item: here(d, runId) });
const json = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const undone = (before: Data, after: Data) => json(applyUndo(after, undoEntry(before, after)));
const part = (d: Data, runId: Id, p: Id, level = 0) => ok(d, { kind: 'part', runId, level, part: p });

const hands = (after: Item[] = [step('compare', 'Compare {copies} with this week’s gestures')]) =>
  world(
    seq('H', 'Get better at hands', [step('warm', 'Warm up'), ref('row', 'A'), ...after]),
    anyOrder('A', [ref('gesture', 'G'), step('study', 'Study: hand anatomy, chapter 3'), step('copy', 'Master copy >copies')]),
    broken('G', 'Gesture practice', [step('hands10', 'Draw 10 hands, 30 s each'), step('feet10', 'Draw 10 feet, 30 s each')]),
  );
/** Started and Next: the run is on the block's row, choosing. */
const atBlock = (d0 = hands()) => {
  const r = go(d0, { kind: 'start', routineId: 'H' });
  // (A block first in its routine: the run starts on its row.)
  return { d: here(r.data, r.runId!) === 'warm' ? ok(r.data, { kind: 'next', runId: r.runId! }) : r.data, id: r.runId! };
};

describe('Plan: Add’s "In any order" makes a block whose parts are steps or steps broken down', () => {
  it('the block is a row to an unnamed sequence "In any order" marked `any` — what an older build reads as a step broken down', () => {
    const d0 = world(seq('H', 'Get better at hands', [step('warm', 'Warm up')]));
    const d = okEdit(d0, 'H', { kind: 'addAny', parts: ['Gesture practice', ' ', 'Study'] });
    const row = (d.routines.H.items as unknown[])[1] as { id: string; ref: string };
    expect(Object.keys(row).sort()).toEqual(['id', 'ref']);
    expect(d.routines[row.ref]).toMatchObject({ words: 'In any order', named: false, any: true, items: [{ text: 'Gesture practice' }, { text: 'Study' }] });
    expect(readRoutine(d, row.ref)).toMatchObject({ any: true, words: 'In any order' });
    // Plan's row opens like a step broken down (its own view), and its words are the block's.
    expect(planView(d, { routineId: 'H' })!.rows[1]).toMatchObject({ kind: 'routine', words: 'In any order', broken: true, any: true });
    // One Undo takes it away.
    expect(undone(d0, d)).toEqual(json(d0));
  });

  it('a part is a step or a step broken down: a wait, a routine, a for each, another block, Repeat and a new name are refused inside', () => {
    const d = hands();
    for (const e of [{ kind: 'addWait', wait: 'x' }, { kind: 'addCall', routine: 'H' }, { kind: 'addEach', item: 'a', list: 'as' }, { kind: 'addAny' }, { kind: 'divider', from: 0 }, { kind: 'rename', words: 'Mine' }] as RoutineEdit[])
      expect(editRoutine(d, 'A', e, env())).toMatchObject({ ok: false, reason: 'cannot' });
    expect(editRoutine(d, 'A', { kind: 'addStep', text: 'Gesture from memory' }, env()).ok).toBe(true);
    expect(editRoutine(d, 'A', { kind: 'breakDown', item: 'study', steps: ['Read', 'Sketch the bones'] }, env()).ok).toBe(true);
    expect(editRoutine(d, 'A', { kind: 'gives', item: 'study', name: 'notes' }, env()).ok).toBe(true);
  });
});

describe('Runner: arriving at the block offers the parts; a chosen part runs as its own thread', () => {
  it('Next onto the block rests on its row (choosing): nothing is taken up by itself', () => {
    const { d, id } = atBlock();
    expect(here(d, id)).toBe('row');
    expect(run(d, id).frames).toHaveLength(1);
  });

  it('a part broken down taken up goes in at its first step; a step part stands on itself', () => {
    let { d, id } = atBlock();
    d = part(d, id, 'gesture');
    expect(here(d, id)).toBe('hands10');
    expect(depth(d, id)).toBe(3);
    d = part(d, id, 'study');
    expect(here(d, id)).toBe('study');
    expect(depth(d, id)).toBe(2);
  });

  it('Step in on the row takes up the part put down last, else the first not taken up', () => {
    let { d, id } = atBlock();
    d = ok(d, { kind: 'stepIn', runId: id });
    expect(here(d, id)).toBe('hands10');
    d = part(d, id, 'copy');
    d = ok(d, { kind: 'back', runId: id });
    expect(here(d, id)).toBe('row');
    d = ok(d, { kind: 'stepIn', runId: id });
    expect(here(d, id)).toBe('copy');
  });

  it('each part keeps its own place: put down by taking up another, taken up again where it was', () => {
    let { d, id } = atBlock();
    d = part(d, id, 'gesture');
    d = ok(d, { kind: 'next', runId: id });
    expect(here(d, id)).toBe('feet10');
    d = part(d, id, 'study');
    expect(here(d, id)).toBe('study');
    d = part(d, id, 'gesture');
    expect(here(d, id)).toBe('feet10');
  });

  it('each part keeps its own values: what one gave is not read by another (parts never reach into each other)', () => {
    let { d, id } = atBlock(
      world(
        seq('H', 'Get better at hands', [step('warm', 'Warm up'), ref('row', 'A')]),
        anyOrder('A', [step('copy', 'Master copy >copies'), step('look', 'Look at {copies} >notes')]),
      ),
    );
    d = part(d, id, 'copy');
    d = typed(d, id, 'copies', 'two Dürer hands');
    d = part(d, id, 'look');
    expect(seen(d, id, 'copies')).toEqual([]);
    expect(runnerView(d, id)!.fields.map((f) => f.name)).toEqual(['notes', 'copies']);
    d = part(d, id, 'copy');
    expect(seen(d, id, 'copies')).toEqual(['two Dürer hands']);
  });

  it('Back from a part goes to the block’s row and keeps its place and values; Back past the block and on again keeps the parts', () => {
    let { d, id } = atBlock();
    d = part(d, id, 'copy');
    d = typed(d, id, 'copies', 'a Dürer hand');
    d = ok(d, { kind: 'back', runId: id });
    expect(here(d, id)).toBe('row');
    d = ok(d, { kind: 'back', runId: id });
    expect(here(d, id)).toBe('warm');
    d = ok(d, { kind: 'next', runId: id });
    d = part(d, id, 'copy');
    expect(seen(d, id, 'copies')).toEqual(['a Dürer hand']);
  });
});

describe('Joining: the block finishes when every part has returned or been stopped', () => {
  it('stated as a test: the step after the block cannot be reached while any part has not returned or been stopped', () => {
    let { d, id } = atBlock();
    const refused = (dd: Data) => {
      expect(go(dd, { kind: 'next', runId: id })).toMatchObject({ ok: false, reason: 'parts' });
      expect(go(dd, { kind: 'next', runId: id, chunk: [{}, {}] }).ok).toBe(false);
    };
    refused(d);
    // Gesture finished (Next past its last step), Study finished: Master copy has not returned — still refused.
    d = part(d, id, 'gesture');
    d = ok(d, { kind: 'next', runId: id });
    d = ok(d, { kind: 'next', runId: id });
    expect(here(d, id)).toBe('row');
    refused(d);
    d = part(d, id, 'study');
    d = ok(d, { kind: 'next', runId: id });
    expect(here(d, id)).toBe('row');
    refused(d);
    expect(runnerView(d, id)!.next).not.toBe('done');
    // The last one returns: the run goes on after the block by itself.
    d = part(d, id, 'copy');
    d = ok(d, { kind: 'next', runId: id });
    expect(here(d, id)).toBe('compare');
  });

  it('a block with no parts yet holds nothing back: Next passes it', () => {
    let { d, id } = atBlock(world(seq('H', 'Hands', [step('warm', 'Warm up'), ref('row', 'A'), step('after', 'After')]), anyOrder('A', [])));
    expect(here(d, id)).toBe('row');
    expect(runnerView(d, id)!.next).toBe('next');
    d = ok(d, { kind: 'next', runId: id });
    expect(here(d, id)).toBe('after');
  });

  it('a part left by Step out is stopped, and counts as returned: the block finishes when the rest have', () => {
    let { d, id } = atBlock();
    d = part(d, id, 'gesture');
    d = ok(d, { kind: 'done', runId: id });
    expect(here(d, id)).toBe('row');
    expect(run(d, id).frames[0].parts!.list.find((p) => p.item === 'gesture')).toMatchObject({ ended: 'stopped' });
    d = part(d, id, 'study');
    d = ok(d, { kind: 'next', runId: id });
    expect(run(d, id).frames[0].parts!.list.find((p) => p.item === 'study')).toMatchObject({ ended: 'finished' });
    expect(go(d, { kind: 'part', runId: id, level: 0, part: 'study' })).toMatchObject({ ok: false, reason: 'ended' });
    d = part(d, id, 'copy');
    d = ok(d, { kind: 'next', runId: id });
    expect(here(d, id)).toBe('compare');
  });

  it('Step out on the block’s row stops the parts not returned (they cannot outlive it) and goes on after it, on the first layer too', () => {
    let { d, id } = atBlock();
    d = part(d, id, 'copy');
    d = typed(d, id, 'copies', 'a Dürer hand');
    d = ok(d, { kind: 'back', runId: id });
    expect(runnerView(d, id)!.moves.stepOut).toEqual({ name: 'In any order' });
    const r = go(d, { kind: 'done', runId: id });
    expect(r.ok).toBe(true);
    expect(here(r.data, id)).toBe('compare');
    expect(run(r.data, id).frames[0].parts).toBeUndefined();
    // What was given is joined: the step after reads it.
    expect(seen(r.data, id, 'copies')).toEqual(['a Dürer hand']);
    // Its Undo brings the block back as it was.
    expect(undone(d, r.data)).toEqual(json(d));
  });

  it('what the parts give under one name is collected into one list, in the order given', () => {
    let { d, id } = atBlock(
      world(
        seq('H', 'Get better at hands', [step('warm', 'Warm up'), ref('row', 'A'), step('compare', 'Compare {copies}')]),
        anyOrder('A', [step('a', 'Copy a Dürer hand >copies'), step('b', 'Copy a Rubens hand >copies'), step('c', 'Copy a Michelangelo hand >copies')]),
      ),
    );
    d = part(d, id, 'c');
    d = typed(d, id, 'copies', 'Michelangelo');
    d = part(d, id, 'a');
    d = typed(d, id, 'copies', 'Dürer');
    d = ok(d, { kind: 'next', runId: id });
    d = part(d, id, 'c');
    d = ok(d, { kind: 'next', runId: id });
    d = part(d, id, 'b');
    d = typed(d, id, 'copies', 'Rubens');
    d = ok(d, { kind: 'next', runId: id });
    expect(here(d, id)).toBe('compare');
    expect(seen(d, id, 'copies')).toEqual(['Michelangelo', 'Dürer', 'Rubens']);
    expect(runnerView(d, id)!.step.parts.map((p) => ('text' in p ? p.text : '')).join('')).toBe('Compare Michelangelo, Dürer and Rubens');
  });
});

describe('Moves inside a block', () => {
  it('Jump to a step of another part puts the one the run is in down where it is', () => {
    let { d, id } = atBlock();
    d = part(d, id, 'gesture');
    d = ok(d, { kind: 'next', runId: id });
    d = ok(d, { kind: 'jump', runId: id, to: { path: ['row', 'study'] } });
    expect(here(d, id)).toBe('study');
    d = part(d, id, 'gesture');
    expect(here(d, id)).toBe('feet10');
  });

  it('Start over on the block’s level puts it back on its row with no part taken up', () => {
    let { d, id } = atBlock();
    d = part(d, id, 'study');
    d = ok(d, { kind: 'next', runId: id });
    d = part(d, id, 'gesture');
    d = ok(d, { kind: 'restart', runId: id, level: 1 });
    expect(here(d, id)).toBe('row');
    expect(run(d, id).frames[0].parts).toBeUndefined();
  });

  it('an In any order block inside a for each keeps each part’s place per item, and each item starts its parts afresh', () => {
    const d0 = world(
      seq('P', 'Make a piece', [step('list', 'List what you can’t draw yet >gaps'), ref('loop', 'E'), step('line', 'Line art')]),
      seq('E', 'For each gap in {gaps}', [ref('row', 'A')], { named: false, each: { item: 'gap', list: 'gaps' } }),
      anyOrder('A', [step('practise', 'Practise {gap}'), ref('study', 'S')]),
      broken('S', 'Study {gap}', [step('find', 'Find a guide on {gap}'), step('notes', 'Write two lines on {gap}')]),
    );
    const r = go(d0, { kind: 'start', routineId: 'P' });
    const id = r.runId!;
    let d = ok(r.data, { kind: 'value', runId: id, name: 'gaps', text: 'hands\nlegs', items: ['hands', 'legs'], item: 'list' });
    d = ok(d, { kind: 'next', runId: id });
    expect(here(d, id)).toBe('row');
    d = part(d, id, 'study', 1);
    d = ok(d, { kind: 'next', runId: id });
    expect(here(d, id)).toBe('notes');
    d = part(d, id, 'practise', 1);
    d = part(d, id, 'study', 1);
    expect(here(d, id)).toBe('notes');
    d = ok(d, { kind: 'next', runId: id });
    d = part(d, id, 'practise', 1);
    d = ok(d, { kind: 'next', runId: id });
    // The next item: its own parts, none taken up.
    expect(here(d, id)).toBe('row');
    expect(seen(d, id, 'gap')).toEqual(['legs']);
    expect(run(d, id).frames[1].parts).toBeUndefined();
  });
});

describe('The tree view: where every part stands, in the app’s existing wordings', () => {
  const lines = (d: Data, id: Id) =>
    partsTree(d, id).map((g) => ({
      within: g.within,
      parts: g.parts.map((p) => [p.words, p.state, p.step?.map((x) => ('text' in x ? x.text : `{${x.name}}`)).join('') ?? null]),
    }));

  it('lists every part with where it stands: the one the run is in, one put down at its step, one not taken up (its first step), finished and stopped told apart', () => {
    let { d, id } = atBlock(
      world(
        seq('H', 'Get better at hands', [step('warm', 'Warm up'), ref('row', 'A'), step('compare', 'Compare {copies}')]),
        anyOrder('A', [ref('gesture', 'G'), step('study', 'Study: hand anatomy, chapter 3'), step('copy', 'Master copy >copies'), ref('sketch', 'K'), ref('memory', 'M')]),
        broken('G', 'Gesture practice', [step('hands10', 'Draw 10 hands, 30 s each'), step('feet10', 'Draw 10 feet, 30 s each')]),
        broken('K', 'Sketch from life', [step('k1', 'Find a model'), step('k2', 'Draw {copies}')]),
        broken('M', 'Gesture from memory', [step('m1', 'Draw a hand from memory')]),
      ),
    );
    d = part(d, id, 'copy');
    d = typed(d, id, 'copies', 'two Dürer hands');
    d = ok(d, { kind: 'next', runId: id });
    d = part(d, id, 'memory');
    d = ok(d, { kind: 'done', runId: id });
    d = part(d, id, 'gesture');
    d = ok(d, { kind: 'next', runId: id });
    d = part(d, id, 'study');
    expect(lines(d, id)).toEqual([
      {
        within: 'Get better at hands',
        parts: [
          ['Gesture practice', 'down', 'Draw 10 feet, 30 s each'],
          ['Study: hand anatomy, chapter 3', 'here', 'Study: hand anatomy, chapter 3'],
          ['Master copy', 'finished', null],
          ['Sketch from life', 'new', 'Find a model'],
          ['Gesture from memory', 'stopped', null],
        ],
      },
    ]);
    // The same in the pull-up panel.
    expect(panelView(d, id)!.parts).toEqual(partsTree(d, id));
  });

  it('a part put down on a step reads it with the values that part sees, in place', () => {
    let { d, id } = atBlock(world(seq('H', 'Hands', [ref('row', 'A')]), anyOrder('A', [ref('g', 'G'), step('s', 'Study')]), broken('G', 'Copy', [step('g1', 'Pick a master >master'), step('g2', 'Copy {master}')])));
    d = part(d, id, 'g');
    d = typed(d, id, 'master', 'Dürer');
    d = ok(d, { kind: 'next', runId: id });
    d = part(d, id, 's');
    expect(partsTree(d, id)[0].parts[0]).toMatchObject({ state: 'down', step: [{ kind: 'text', text: 'Copy ' }, { kind: 'value', name: 'master', text: 'Dürer' }] });
  });

  it('every level the run is in: a block inside a part lists its own parts under it', () => {
    let { d, id } = atBlock(
      world(
        seq('H', 'Become a better drawer', [ref('row', 'A')]),
        anyOrder('A', [ref('practise', 'P'), step('study', 'Study')]),
        broken('P', 'Practise', [ref('row2', 'B')]),
        anyOrder('B', [step('hands', 'Hands'), step('feet', 'Feet')]),
      ),
    );
    d = part(d, id, 'practise');
    expect(here(d, id)).toBe('row2');
    d = part(d, id, 'feet', 2);
    expect(lines(d, id)).toEqual([
      { within: 'Become a better drawer', parts: [['Practise', 'here', 'Feet'], ['Study', 'new', null]] },
      { within: 'Practise', parts: [['Hands', 'new', null], ['Feet', 'here', 'Feet']] },
    ]);
    // Taking up a part at the outer level puts the whole inner block down with Practise; taking Practise up again brings it back.
    d = part(d, id, 'study');
    expect(lines(d, id)).toEqual([{ within: 'Become a better drawer', parts: [['Practise', 'down', 'Feet'], ['Study', 'here', 'Study']] }]);
    d = part(d, id, 'practise');
    expect(here(d, id)).toBe('feet');
  });

  it('no count, percentage or "left" anywhere in it', () => {
    let { d, id } = atBlock();
    d = part(d, id, 'study');
    d = ok(d, { kind: 'next', runId: id });
    d = part(d, id, 'gesture');
    const said = JSON.stringify([partsTree(d, id), runnerView(d, id), panelView(d, id)]);
    expect(said).not.toMatch(/\d+ of \d+|%|\bleft\b/i);
  });
});

describe('Runner: the block’s row offers the parts to choose', () => {
  it('on the row: the note is the block, its parts listed, the filled button takes up a part ("Start" one not taken up, "Resume" one put down), Step out leaves the block', () => {
    let { d, id } = atBlock();
    let v = runnerView(d, id)!;
    expect(v.step).toMatchObject({ kind: 'step', words: 'In any order' });
    expect(v.choose!.parts.map((p) => [p.words, p.state])).toEqual([
      ['Gesture practice', 'new'],
      ['Study: hand anatomy, chapter 3', 'new'],
      ['Master copy', 'new'],
    ]);
    expect(v.next).toBe('take');
    expect(v.choose!.take).toEqual({ part: 'gesture', words: 'Gesture practice', resume: false });
    expect(v.moves).toEqual({ stepIn: false, stepOut: { name: 'In any order' } });
    d = ok(d, { kind: 'stepIn', runId: id });
    expect(runnerView(d, id)).toMatchObject({ level: 'Gesture practice', parent: 'In any order', canBack: true });
    expect(panelView(d, id)!.backTo).toBe('In any order');
    d = ok(d, { kind: 'back', runId: id });
    v = runnerView(d, id)!;
    expect(v.choose!.take).toEqual({ part: 'gesture', words: 'Gesture practice', resume: true });
  });

  it('once every part has returned or been stopped, the filled button is Next again (Done when that ends the run)', () => {
    let { d, id } = atBlock(world(seq('H', 'Hands', [ref('row', 'A'), step('after', 'After')]), anyOrder('A', [step('a', 'A part')])));
    d = part(d, id, 'a');
    expect(runnerView(d, id)!.next).toBe('next');
    d = ok(d, { kind: 'next', runId: id });
    expect(here(d, id)).toBe('after');
  });
});

describe('Home: the tile reads the part last touched', () => {
  const line = (d: Data, id: Id) => tileLine(homeShown(d).find((x) => x.runId === id)!).line;
  it('inside a part: "<part> · at <step>"; choosing: the part put down last, where it was put down', () => {
    let { d, id } = atBlock();
    expect(line(d, id)).toBe('at In any order');
    d = part(d, id, 'gesture');
    d = ok(d, { kind: 'next', runId: id });
    expect(line(d, id)).toBe('Gesture practice · at Draw 10 feet, 30 s each');
    d = part(d, id, 'study');
    expect(line(d, id)).toBe('Study: hand anatomy, chapter 3 · at Study: hand anatomy, chapter 3');
    d = ok(d, { kind: 'back', runId: id });
    expect(line(d, id)).toBe('Study: hand anatomy, chapter 3 · at Study: hand anatomy, chapter 3');
    d = part(d, id, 'gesture');
    // (Back inside it first goes back a step; from its first step, to the row.)
    d = ok(d, { kind: 'back', runId: id });
    d = ok(d, { kind: 'back', runId: id });
    expect(here(d, id)).toBe('row');
    expect(line(d, id)).toBe('Gesture practice · at Draw 10 hands, 30 s each');
  });
});
