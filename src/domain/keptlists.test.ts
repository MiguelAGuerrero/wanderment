/**
 * P-108: kept lists, a for each's own list, and values that are routines. One test (or more) per clause of the
 * roadmap's *Done when*. Expected values come from the roadmap, B-16 ("A list can be kept in the routine … + Add
 * there and on the routine's tile"; "When an adjusted item comes round: in the next sitting"; "Its own header …
 * arriving at the block asks for the items … they belong to the block"; "A value can be a routine, and then it is a
 * call"; "Running it: a routine row whose name is a slot"; "Words stay words"; "A routine value has a face"; "By
 * reference"; "A list can hold routines"; "An item can carry words beside it"), the owner's "Edit Plan by hand", and
 * the coordinator's place-keeping repros for P-107's for each — never from running the engine.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { applyUndo, undoEntry } from './diff';
import { editRoutine, Env, Item, place, readRun, Result, RoutineEdit, runVerb, Verb, visibleValue } from './run';
import { homeTiles, planView, runnerView, valueDetail } from './runView';
import { Data, emptyData, Id, Routine } from './types';
import { nameKey } from './values';

const T0 = Date.UTC(2026, 10, 27, 23, 0, 0);
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
const ref = (id: string, to: string): Item => ({ id, ref: to }) as Item;
const slot = (id: string, name: string): Item => ({ id, text: `{${name}}`, slot: true }) as Item;
const seq = (id: string, words: string, items: Item[], extra: Record<string, unknown> = {}): Routine => ({ id, words, named: true, createdAt: '2026-11-01T00:00:00.000Z', items, ...extra });
const block = (id: string, item: string, list: string, items: Item[], each: Record<string, unknown> = {}): Routine => seq(id, `For each ${item} in {${list}}`, items, { named: false, each: { item, list, ...each } });
const world = (...ss: Routine[]): Data => ({ ...emptyData(), routines: Object.fromEntries(ss.map((s) => [s.id, s])) });
const run = (d: Data, id: Id) => readRun(d, id)!;
const start = (d: Data, routineId: Id) => {
  const r = go(d, { kind: 'start', routineId });
  expect(r.ok, `start refused: ${r.reason}`).toBe(true);
  return { d: r.data, id: r.runId! };
};
const next = (d: Data, runId: Id, times = 1) => {
  for (let i = 0; i < times; i++) d = ok(d, { kind: 'next', runId });
  return d;
};
const here = (d: Data, id: Id) => place(d, run(d, id))!.item!.id;
const words = (d: Data, id: Id) => runnerView(d, id)!.step.parts.map((p) => (p.kind === 'blank' ? `{${p.name}}` : p.text)).join('');
const listed = (d: Data, runId: Id, name: string, items: string[], refs?: ({ ref: Id; name: string } | null)[]) => ok(d, { kind: 'value', runId, name, text: items.join('\n'), items, item: here(d, runId), ...(refs && { refs }) });
const json = (v: unknown) => JSON.parse(JSON.stringify(v));
const undone = (before: Data, after: Data) => json(applyUndo(after, undoEntry(before, after)));
const itemOf = (d: Data, id: Id) => runnerView(d, id)!.values.find((v) => runnerView(d, id)!.level.startsWith('For each') && v.name === (d.routines[place(d, run(d, id))!.frame.seq].each as { item: string }).item);

// ───────── the place-keeping fix (the P-107 investigator's repros) ─────────

describe('a for each keeps its place by where it is as well as by its words', () => {
  const loop = () => world(seq('D', 'Do', [step('give', 'List them >xs'), ref('row', 'E'), step('after', 'After')]), block('E', 'x', 'xs', [step('do', 'Do {x}'), step('adjust', 'Adjust them >xs')]));
  /** Started, the list given, and Next: at the block's first step, on its first item. */
  const at = (xs: string[]) => {
    const s = start(loop(), 'D');
    return { d: next(listed(s.d, s.id, 'xs', xs), s.id), id: s.id };
  };

  it('repro 1: on the first "a" of [a, b, a], the list given again as [b, a] — Next goes to "b", never past it', () => {
    let { d, id } = at(['a', 'b', 'a']);
    expect(words(d, id)).toBe('Do a');
    d = next(d, id);
    d = listed(d, id, 'xs', ['b', 'a']);
    d = next(d, id);
    expect(words(d, id)).toBe('Do b');
  });

  it('repro 2: on "b" of [a, b, c], given again as [a, B, c] — Next goes to "c", not to "B" again', () => {
    let { d, id } = at(['a', 'b', 'c']);
    d = next(d, id, 2);
    expect(words(d, id)).toBe('Do b');
    d = next(d, id);
    d = listed(d, id, 'xs', ['a', 'B', 'c']);
    d = next(d, id);
    expect(words(d, id)).toBe('Do c');
  });

  it('items added after the place still come round; items removed before it cause no skip', () => {
    let { d, id } = at(['a', 'b', 'c']);
    d = next(d, id, 2);
    expect(words(d, id)).toBe('Do b');
    d = next(d, id);
    d = listed(d, id, 'xs', ['b', 'c', 'd']);
    d = next(d, id);
    expect(words(d, id)).toBe('Do c');
    d = next(d, id, 2);
    expect(words(d, id)).toBe('Do d');
    d = next(d, id, 2);
    expect(words(d, id)).toBe('After');
  });
});

// ───────── 1. kept lists ─────────

/** B-16's "Work nothing is waiting on": a kept list of subjects, practised one at a time. */
const better = (kept: string[] = ['arms', 'legs', 'eyes'], inside: Item[] = [step('practise', 'Deliberate practice on {subject}')], extra: Record<string, unknown> = {}) =>
  world(seq('B', 'Become a better drawer', [step('warm', 'Warm up'), ref('row', 'K'), step('rest', 'Rest')], { home: true }), block('K', 'subject', 'subjects', inside, { kept, ...extra }));

describe('a list kept in the routine: rows under the block in Plan, + Add there and on the tile', () => {
  it('Add’s For each… makes a block with its own list kept in the routine (one edit, Undo)', () => {
    const d0 = world(seq('B', 'Become a better drawer', [step('warm', 'Warm up')]));
    const d = okEdit(d0, 'B', { kind: 'addEach', item: 'subject', list: 'subjects', own: 'kept' });
    const row = (d.routines.B.items as { ref?: string }[])[1];
    expect(d.routines[row.ref!]).toMatchObject({ named: false, words: 'For each subject in {subjects}', each: { item: 'subject', list: 'subjects', kept: [] } });
    expect(undone(d0, d)).toEqual(json(d0));
  });

  it('Plan shows its items as rows under the block, with no count; the list is the block’s and is asked nowhere', () => {
    const rows = planView(better(), { routineId: 'B' })!.rows;
    const r = rows.find((x) => x.each)!;
    expect(r.each).toMatchObject({ item: 'subject', list: 'subjects', kept: [{ text: 'arms' }, { text: 'legs' }, { text: 'eyes' }] });
    expect(r.asks).toEqual([]);
    expect(JSON.stringify(r)).not.toMatch(/\b3\b/);
  });

  it('+ Add (the kept list given in Plan) adds an item — one edit with Undo; blank rows dropped', () => {
    const d0 = better();
    const d = okEdit(d0, 'K', { kind: 'keptList', items: ['arms', 'legs', 'eyes', '  ', 'cartoons'] });
    expect((d.routines.K.each as { kept: string[] }).kept).toEqual(['arms', 'legs', 'eyes', 'cartoons']);
    expect(undone(d0, d)).toEqual(json(d0));
    // Only a kept list is given so.
    expect(edit(world(seq('B', 'B', [ref('row', 'E')]), block('E', 'x', 'xs', [step('a')])), 'E', { kind: 'keptList', items: ['a'] }).reason).toBe('cannot');
  });

  it('the routine’s tile offers + Add for each kept list it has', () => {
    const tile = homeTiles(better()).find((x) => x.routineId === 'B')!;
    expect(tile.kept).toEqual([{ seq: 'K', list: 'subjects', items: ['arms', 'legs', 'eyes'] }]);
  });

  it('running: arriving goes in at the first item; the values row shows the item with no count ("subject: arms")', () => {
    const s = start(better(), 'B');
    const d = next(s.d, s.id);
    expect(words(d, s.id)).toBe('Deliberate practice on arms');
    const v = runnerView(d, s.id)!.values.find((x) => x.name === 'subject')!;
    expect(v).toMatchObject({ text: 'arms' });
    expect(v.each).toBeUndefined();
    expect(next(d, s.id, 2) && words(next(d, s.id, 2), s.id)).toBe('Deliberate practice on eyes');
  });

  it('items stay across runs: running over the list never changes it; a second run goes through the same items', () => {
    const s = start(better(), 'B');
    let d = next(s.d, s.id, 4);
    expect(words(d, s.id)).toBe('Rest');
    expect(d.routines).toEqual(better().routines);
    expect((d.routines.K.each as { kept: string[] }).kept).toEqual(['arms', 'legs', 'eyes']);
    d = next(d, s.id);
    expect(run(d, s.id).endedAt).toBeDefined();
    const s2 = start(d, 'B');
    expect(words(next(s2.d, s2.id), s2.id)).toBe('Deliberate practice on arms');
  });

  it('an item added comes round in the next sitting — not in the one already going through the list', () => {
    const s = start(better(), 'B');
    let d = next(s.d, s.id, 2);
    expect(words(d, s.id)).toBe('Deliberate practice on legs');
    d = okEdit(d, 'K', { kind: 'keptList', items: ['arms', 'legs', 'eyes', 'cartoons'] });
    d = next(d, s.id);
    expect(words(d, s.id)).toBe('Deliberate practice on eyes');
    d = next(d, s.id);
    expect(words(d, s.id)).toBe('Rest');
    d = next(d, s.id);
    const s2 = start(d, 'B');
    d = next(s2.d, s2.id, 4);
    expect(words(d, s2.id)).toBe('Deliberate practice on cartoons');
  });

  it('an item taken out while the for each goes through it is not come round to', () => {
    const s = start(better(), 'B');
    let d = next(s.d, s.id);
    d = okEdit(d, 'K', { kind: 'keptList', items: ['arms', 'eyes'] });
    d = next(d, s.id);
    expect(words(d, s.id)).toBe('Deliberate practice on eyes');
  });

  it('a step inside that gives the list is shown it to adjust, and what it keeps is the routine’s (the list changes; the steps do not)', () => {
    const d0 = better(['arms', 'legs'], [step('practise', 'Deliberate practice on {subject}'), step('adjust', 'Adjust the subjects >subjects')]);
    const s = start(d0, 'B');
    let d = next(s.d, s.id, 2);
    const f = runnerView(d, s.id)!.fields[0];
    expect(f).toMatchObject({ name: 'subjects', gives: true, list: true, items: ['arms', 'legs'] });
    d = listed(d, s.id, 'subjects', ['arms', 'legs', 'hands']);
    expect((d.routines.K.each as { kept: string[] }).kept).toEqual(['arms', 'legs', 'hands']);
    expect(d.routines.K.items).toEqual(d0.routines.K.items);
    // (Undo of the adjustment puts the list back.)
    expect(undone(s.d, d).routines.K).toEqual(json(d0.routines.K));
    // Added in this sitting: it comes round in the next one.
    d = next(d, s.id);
    expect(words(d, s.id)).toBe('Deliberate practice on legs');
    d = next(d, s.id, 2);
    expect(words(d, s.id)).toBe('Rest');
  });

  it('an empty kept list passes straight through', () => {
    const s = start(better([]), 'B');
    expect(words(next(s.d, s.id), s.id)).toBe('Rest');
  });

  it('a kept list in a shape this version cannot read is never written over', () => {
    const d0 = better(['arms'], undefined, { kept: 'arms, legs' });
    expect(edit(d0, 'K', { kind: 'keptList', items: ['x'] }).reason).toBe('cannot');
  });
});

// ───────── 2. a for each's own list, asked on arrival ─────────

const study = () =>
  world(
    seq('S', 'Study', [step('warm', 'Warm up'), ref('row', 'O'), step('close', 'Close with {topics}')]),
    block('O', 'topic', 'topics', [step('guide', 'Find a guide on {topic}'), step('more', 'What else to study >topics')], { own: true }),
  );

describe('a for each that declares its own list in its header: asked on arrival, local to the block', () => {
  it('Add’s For each… with a list of its own makes the block (one edit, Undo)', () => {
    const d0 = world(seq('S', 'Study', [step('warm', 'Warm up')]));
    const d = okEdit(d0, 'S', { kind: 'addEach', item: 'topic', list: 'topics', own: 'asked' });
    const row = (d.routines.S.items as { ref?: string }[])[1];
    expect(d.routines[row.ref!]).toMatchObject({ named: false, each: { item: 'topic', list: 'topics', own: true } });
    expect(undone(d0, d)).toEqual(json(d0));
    // A name the routine already gives is not a list of its own.
    const d1 = world(seq('S', 'Study', [step('warm', 'Warm up >topics')]));
    expect(edit(d1, 'S', { kind: 'addEach', item: 'topic', list: 'topics', own: 'asked' }).reason).toBe('same-name');
  });

  it('arriving at the block asks for its items, in the list field, on the block itself', () => {
    const s = start(study(), 'S');
    const d = next(s.d, s.id);
    expect(here(d, s.id)).toBe('row');
    const v = runnerView(d, s.id)!;
    expect(v.fields).toEqual([{ name: 'topics', text: '', gives: true, list: true }]);
    expect(v.moves.stepIn).toBe(false);
  });

  it('with items given, Next goes in at the first; with none, Next passes straight through', () => {
    const s = start(study(), 'S');
    let d = next(s.d, s.id);
    d = listed(d, s.id, 'topics', ['colour theory', 'perspective']);
    d = next(d, s.id);
    expect(words(d, s.id)).toBe('Find a guide on colour theory');
    const e = start(study(), 'S');
    let d2 = next(e.d, e.id);
    d2 = next(d2, e.id);
    expect(here(d2, e.id)).toBe('close');
  });

  it('local to the block: a step after it does not read it (it asks), and the routine does not keep it', () => {
    const s = start(study(), 'S');
    let d = next(s.d, s.id);
    d = listed(d, s.id, 'topics', ['colour theory']);
    expect(d.routines).toBe(next(s.d, s.id).routines);
    d = next(d, s.id);
    expect(visibleValue(d, run(d, s.id), nameKey('topics'))?.items).toEqual(['colour theory']);
    d = next(d, s.id, 2);
    expect(here(d, s.id)).toBe('close');
    expect(words(d, s.id)).toBe('Close with {topics}');
    expect(runnerView(d, s.id)!.fields.map((f) => f.name)).toEqual(['topics']);
  });

  it('a step inside that gives the list adjusts the block’s own list: the for each carries on to what is added', () => {
    const s = start(study(), 'S');
    let d = next(s.d, s.id);
    d = listed(d, s.id, 'topics', ['colour theory']);
    d = next(d, s.id, 2);
    expect(runnerView(d, s.id)!.fields[0]).toMatchObject({ name: 'topics', list: true, items: ['colour theory'] });
    d = listed(d, s.id, 'topics', ['colour theory', 'anatomy']);
    d = next(d, s.id);
    expect(words(d, s.id)).toBe('Find a guide on anatomy');
  });
});

// ───────── 3. values that are routines, and ▤ {name} ─────────

const GUIDE = { ref: 'G', name: 'Draw with guidelines' };
/** "Choose a way to draw" gives {way}; then the routine row ▤ {way}; then words that read it. */
const ways = (extra: Routine[] = []) =>
  world(
    seq('G', 'Draw with guidelines', [step('block', 'Block in {subject} with guidelines'), step('held', 'Note what held >held')]),
    seq('F', 'Freehand', [step('free', 'Draw it freehand')]),
    seq('W', 'Try a way', [step('subj', 'Pick a subject >subject'), step('choose', 'Choose a way to draw >way'), slot('slot', 'way'), step('tell', 'Tell Sam about {way}'), step('after', 'Write down {held}')]),
    ...extra,
  );
/** At the slot row, {subject} given and {way} given as `refs` says (a routine) or as words. */
const atSlot = (refs?: { ref: Id; name: string }[], text = 'Draw with guidelines', d0 = ways()) => {
  const s = start(d0, 'W');
  let d = ok(s.d, { kind: 'value', runId: s.id, name: 'subject', text: 'hands', item: 'subj' });
  d = next(d, s.id);
  d = ok(d, { kind: 'value', runId: s.id, name: 'way', text, item: 'choose', ...(refs && { refs }) });
  return { d: next(d, s.id), id: s.id };
};

describe('a routine row can take a value’s name (▤ {name})', () => {
  it('Plan: Add’s routine row by a name makes ▤ {way} — an ordinary routine row, closed; "asks" when nothing gives the name', () => {
    const d0 = world(seq('W', 'Try a way', [step('choose', 'Choose a way to draw >way')]));
    const d = okEdit(d0, 'W', { kind: 'addSlot', name: 'way' });
    expect((d.routines.W.items as Record<string, unknown>[])[1]).toMatchObject({ text: '{way}', slot: true });
    expect(undone(d0, d)).toEqual(json(d0));
    const rows = planView(d, { routineId: 'W' })!.rows;
    expect(rows[1]).toMatchObject({ slot: 'way', asks: [] });
    const lone = okEdit(world(seq('W', 'Try a way', [step('a')])), 'W', { kind: 'addSlot', name: 'way' });
    expect(planView(lone, { routineId: 'W' })!.rows[1]).toMatchObject({ slot: 'way', asks: ['way'] });
  });

  it('on the runner the row shows the routine held, with Step in; stepping in runs it, reading names by name where it runs', () => {
    let { d, id } = atSlot([GUIDE]);
    const v = runnerView(d, id)!;
    expect(v.step).toMatchObject({ kind: 'routine', words: 'Draw with guidelines' });
    expect(v.moves.stepIn).toBe(true);
    expect(v.middle).toBe('stepIn');
    d = ok(d, { kind: 'stepIn', runId: id });
    expect(words(d, id)).toBe('Block in hands with guidelines');
    expect(runnerView(d, id)!.level).toBe('Draw with guidelines');
  });

  it('what the routine held gives is handed back when it is left (as any call)', () => {
    let { d, id } = atSlot([GUIDE]);
    d = ok(d, { kind: 'stepIn', runId: id });
    d = next(d, id);
    d = ok(d, { kind: 'value', runId: id, name: 'held', text: 'proportions', item: 'held' });
    d = next(d, id, 2);
    expect(here(d, id)).toBe('after');
    expect(words(d, id)).toBe('Write down proportions');
  });

  it('held by reference: a change in Plan follows it — renamed, the row and the value read the new name; a new step is run', () => {
    let { d, id } = atSlot([GUIDE]);
    d = okEdit(d, 'G', { kind: 'rename', words: 'Guidelines, then shading' });
    d = okEdit(d, 'G', { kind: 'addStep', text: 'Shade it', after: null });
    expect(runnerView(d, id)!.step.words).toBe('Guidelines, then shading');
    expect(runnerView(d, id)!.values.find((x) => x.name === 'way')).toMatchObject({ text: 'Guidelines, then shading', shown: [{ text: 'Guidelines, then shading', routine: 'G' }] });
    d = ok(d, { kind: 'stepIn', runId: id });
    expect(words(d, id)).toBe('Shade it');
  });

  it('a removed routine says so: "<name> (removed)", and no Step in', () => {
    let { d, id } = atSlot([GUIDE]);
    d = okEdit(d, 'G', { kind: 'removeRoutine' });
    const v = runnerView(d, id)!;
    expect(v.step.words).toBe('Draw with guidelines (removed)');
    expect(v.moves.stepIn).toBe(false);
    expect(go(d, { kind: 'stepIn', runId: id }).ok).toBe(false);
  });

  it('held words read as words, with no Step in', () => {
    const { d, id } = atSlot(undefined, 'sketch it loosely');
    const v = runnerView(d, id)!;
    expect(v.step).toMatchObject({ kind: 'step' });
    expect(words(d, id)).toBe('sketch it loosely');
    expect(v.moves.stepIn).toBe(false);
    expect(go(d, { kind: 'stepIn', runId: id }).reason).toBe('not-a-routine');
  });

  it('a step typed as words never steps in: "Tell Sam about {way}" shows the routine’s name in place and runs nothing', () => {
    let { d, id } = atSlot([GUIDE]);
    d = next(d, id);
    expect(here(d, id)).toBe('tell');
    expect(words(d, id)).toBe('Tell Sam about Draw with guidelines');
    const part = runnerView(d, id)!.step.parts.find((p) => p.kind === 'value')!;
    expect(part).toMatchObject({ shown: [{ text: 'Draw with guidelines', routine: 'G' }] });
    expect(runnerView(d, id)!.moves.stepIn).toBe(false);
    expect(go(d, { kind: 'stepIn', runId: id }).ok).toBe(false);
  });

  it('a routine value is drawn with the routine mark wherever values show: the values row, the value sheet, the tile', () => {
    const { d, id } = atSlot([GUIDE]);
    const mark = [{ text: 'Draw with guidelines', routine: 'G' }];
    expect(runnerView(d, id)!.values.find((x) => x.name === 'way')!.shown).toEqual(mark);
    expect(valueDetail(d, id, 'way')!.shown).toEqual(mark);
    const tile = homeTiles(d).find((x) => x.routineId === 'W')!;
    expect(tile.values!.find((x) => x.name === 'way')!.shown).toEqual(mark);
    expect(tile.atParts!.find((p) => p.kind === 'value')).toMatchObject({ shown: mark });
  });

  it('what an experiment chooses is never stored on the routine by itself: choosing, stepping in and out change only the run', () => {
    const d0 = ways();
    let { d, id } = atSlot([GUIDE], undefined, d0);
    d = ok(d, { kind: 'stepIn', runId: id });
    d = next(d, id, 3);
    expect(d.routines).toEqual(d0.routines);
  });

  it('a value given as words after a routine drops the routine (the words are words)', () => {
    let { d, id } = atSlot([GUIDE]);
    d = ok(d, { kind: 'value', runId: id, name: 'way', text: 'freely' });
    expect(runnerView(d, id)!.step).toMatchObject({ kind: 'step' });
    expect(runnerView(d, id)!.values.find((x) => x.name === 'way')!.shown).toBeUndefined();
  });
});

// ───────── 4. lists of routines ─────────

describe('a list may hold routines, with words beside them', () => {
  const tryWays = () =>
    world(...Object.values(ways().routines).filter((r) => r.id !== 'W'), seq('T', 'Try ways', [step('subj', 'Pick a subject >subject'), step('list', 'List the ways to try >ways'), ref('row', 'L'), step('pick', 'Pick the one to keep')]), block('L', 'way', 'ways', [slot('slot', 'way'), step('note', 'Note how {way} went')]));

  it('a for each over such a list steps into each routine in turn; words read as words; the words beside it are kept', () => {
    const s = start(tryWays(), 'T');
    let d = ok(s.d, { kind: 'value', runId: s.id, name: 'subject', text: 'hands', item: 'subj' });
    d = next(d, s.id);
    d = listed(d, s.id, 'ways', ['Draw with guidelines: proportions held, slower', 'Freehand', 'just look'], [GUIDE, { ref: 'F', name: 'Freehand' }, null]);
    d = next(d, s.id);
    expect(here(d, s.id)).toBe('slot');
    expect(runnerView(d, s.id)!.step).toMatchObject({ kind: 'routine', words: 'Draw with guidelines' });
    expect(itemOf(d, s.id)).toMatchObject({ text: 'Draw with guidelines: proportions held, slower', shown: [{ text: 'Draw with guidelines: proportions held, slower', routine: 'G' }] });
    d = ok(d, { kind: 'stepIn', runId: s.id });
    expect(words(d, s.id)).toBe('Block in hands with guidelines');
    d = ok(d, { kind: 'done', runId: s.id });
    expect(here(d, s.id)).toBe('note');
    d = next(d, s.id);
    expect(runnerView(d, s.id)!.step).toMatchObject({ kind: 'routine', words: 'Freehand' });
    d = next(d, s.id, 2);
    expect(runnerView(d, s.id)!.step.kind).toBe('step');
    expect(words(d, s.id)).toBe('just look');
  });

  it('the list keeps its routines across the values row and the value sheet (each drawn with the mark)', () => {
    const s = start(tryWays(), 'T');
    let d = next(s.d, s.id);
    d = listed(d, s.id, 'ways', ['Draw with guidelines: slower', 'just look'], [GUIDE, null]);
    expect(valueDetail(d, s.id, 'ways')!.shown).toEqual([{ text: 'Draw with guidelines: slower', routine: 'G' }, { text: 'just look' }]);
    // A field that gives the list again keeps them (its items and their routines).
    expect(runnerView(d, s.id)!.fields[0]).toMatchObject({ items: ['Draw with guidelines: slower', 'just look'], refs: [GUIDE, null] });
  });

  it('a kept list may hold routines too', () => {
    const d0 = world(...Object.values(ways().routines), seq('B', 'Better', [ref('row', 'K')]), block('K', 'way', 'ways', [slot('s2', 'way')], { kept: ['Freehand'], refs: [{ ref: 'F', name: 'Freehand' }] }));
    const s = start(d0, 'B');
    expect(runnerView(s.d, s.id)!.step).toMatchObject({ kind: 'routine', words: 'Freehand' });
    expect(planView(d0, { routineId: 'B' })!.rows[0].each!.kept).toEqual([{ text: 'Freehand', routine: 'F' }]);
  });
});
