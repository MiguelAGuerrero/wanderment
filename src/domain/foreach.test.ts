/**
 * P-107: For each over a list given above. One test (or more) per clause of the roadmap's *Done when*. Expected
 * values come from the roadmap, B-15 journeys 6–7 ("For each photo in {photos}", "{photo} 2 of 3: the boxer", the
 * collected list after the block), B-16 ("A for each keeps its place, carries on to items added after it, ends when
 * it passes the last item, and passes straight through an empty list"; "A for each collects") and the owner's
 * words ("each new round clears the values given inside it, so those steps ask again") — never from running the
 * engine.
 *
 * The example is B-15's: "Find reference photos" gives {photos}; for each photo, "Draw {photo}" and "Name the
 * drawing" (gives {drawing}); after the block, "Rank the {drawing}".
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { applyUndo, undoEntry } from './diff';
import { callIO, editRoutine, Env, Item, place, readRoutine, readRun, Result, RoutineEdit, runVerb, Verb, visibleValue } from './run';
import { namesOffered, panelView, planView, runnerView, valueDetail, whatChanged } from './runView';
import { Data, emptyData, Id, Routine } from './types';
import { itemNameFor, joinItems, nameKey } from './values';

const T0 = Date.UTC(2026, 10, 27, 21, 0, 0);
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
const ref = (id: string, to: string, extra: Record<string, unknown> = {}): Item => ({ id, ref: to, ...extra }) as Item;
const seq = (id: string, words: string, items: Item[], extra: Record<string, unknown> = {}): Routine => ({ id, words, named: true, createdAt: '2026-11-01T00:00:00.000Z', items, ...extra });
/** A for each block as P-107 stores it: an unnamed sequence with `each`, its words the sentence (an older build shows them). */
const block = (id: string, item: string, list: string, items: Item[]): Routine => seq(id, `For each ${item} in {${list}}`, items, { named: false, each: { item, list } });
const world = (...ss: Routine[]): Data => ({ ...emptyData(), routines: Object.fromEntries(ss.map((s) => [s.id, s])) });
const run = (d: Data, id: Id) => readRun(d, id)!;
const start = (d: Data, routineId: Id) => {
  const r = go(d, { kind: 'start', routineId });
  expect(r.ok).toBe(true);
  return { d: r.data, id: r.runId! };
};
const next = (d: Data, runId: Id, times = 1) => {
  for (let i = 0; i < times; i++) d = ok(d, { kind: 'next', runId });
  return d;
};
const here = (d: Data, id: Id) => place(d, run(d, id))!.item!.id;
const words = (d: Data, id: Id) => runnerView(d, id)!.step.parts.map((p) => (p.kind === 'blank' ? `{${p.name}}` : p.text)).join('');
const typed = (d: Data, runId: Id, name: string, text: string) => ok(d, { kind: 'value', runId, name, text, item: here(d, runId) });
const listed = (d: Data, runId: Id, name: string, items: string[]) => ok(d, { kind: 'value', runId, name, text: items.join('\n'), items, item: here(d, runId) });
const seen = (d: Data, runId: Id, name: string) => visibleValue(d, run(d, runId), nameKey(name))?.items ?? [];
const json = (v: unknown) => JSON.parse(JSON.stringify(v));
const undone = (before: Data, after: Data) => json(applyUndo(after, undoEntry(before, after)));
const items = (d: Data, id: Id) => d.routines[id].items as Record<string, unknown>[];

/** B-15's routine, with the block already made. */
const drawing = (inside: Item[] = [step('draw', 'Draw {photo}'), step('name', 'Name the drawing >drawing')], after: Item[] = [step('rank', 'Rank the {drawing}')]) =>
  world(seq('D', 'Drawing practice', [step('find', 'Find reference photos >photos'), ref('row', 'E'), ...after]), block('E', 'photo', 'photos', inside));

/** Started, the list given (three photos), and Next: the run is at the block's first step. */
const inLoop = (d0 = drawing(), photos = ['the dancer', 'the boxer', 'the cellist']) => {
  const s = start(d0, 'D');
  const d = next(listed(s.d, s.id, 'photos', photos), s.id);
  return { d, id: s.id };
};

describe('Plan: Add’s "For each…" makes a loop block over a name given above', () => {
  it('the sheet’s sentence "item in {list}": the item is the list’s singular', () => {
    expect(itemNameFor('photos')).toBe('photo');
    expect(itemNameFor('concerns')).toBe('concern');
    expect(itemNameFor('stories')).toBe('story');
    expect(itemNameFor('boxes')).toBe('box');
    expect(itemNameFor('Reference photos')).toBe('Reference photo');
    // Not a plural: the item can't be the list itself.
    expect(nameKey(itemNameFor('subject'))).not.toBe(nameKey('subject'));
    expect(itemNameFor('subject')).toBe('subject item');
    expect(nameKey(itemNameFor('glass'))).not.toBe('glass');
  });

  it('one edit makes the block — a row to an unnamed sequence with `each`, its words the sentence (what an older build shows) — at the end or after a row; one Undo', () => {
    const d0 = world(seq('D', 'Drawing practice', [step('find', 'Find reference photos >photos'), step('rank', 'Rank them')]));
    const d1 = okEdit(d0, 'D', { kind: 'addEach', item: 'photo', list: 'photos', after: 'find' });
    const row = items(d1, 'D')[1];
    expect(items(d1, 'D').map((i) => i.id)).toEqual(['find', row.id, 'rank']);
    expect(row).toEqual({ id: row.id, ref: expect.any(String) });
    expect(d1.routines[row.ref as string]).toEqual({ id: row.ref, words: 'For each photo in {photos}', named: false, createdAt: expect.any(String), items: [], each: { item: 'photo', list: 'photos' } });
    expect(readRoutine(d1, row.ref as string)).toMatchObject({ named: false, each: { item: 'photo', list: 'photos' } });
    const d2 = okEdit(d0, 'D', { kind: 'addEach', item: 'photo', list: 'photos' });
    expect(items(d2, 'D').map((i) => i.id)).toEqual(['find', 'rank', expect.any(String)]);
    expect(undone(d0, d1)).toEqual(json(d0));
    expect(whatChanged(d0, { kind: 'editRoutine', routineId: 'D', edit: { kind: 'addEach', item: 'photo', list: 'photos' } })).toBe('Added “For each photo in {photos}”');
  });

  it('refused: a name that is not one, or an item that is the list', () => {
    const d0 = world(seq('D', 'Drawing practice', [step('find', 'Find >photos')]));
    expect(edit(d0, 'D', { kind: 'addEach', item: '', list: 'photos' }).reason).toBe('cannot');
    expect(edit(d0, 'D', { kind: 'addEach', item: 'photo', list: 'a{b' }).reason).toBe('cannot');
    expect(edit(d0, 'D', { kind: 'addEach', item: 'Photos', list: 'photos' }).reason).toBe('cannot');
    expect(edit(d0, 'D', { kind: 'addEach', item: 'photo', list: 'photos', after: 'nope' }).reason).toBe('no-such-step');
  });

  it('Plan reads the block: "For each photo in {photos}", its steps under it read {photo} (not asked), and it gives what its steps give', () => {
    const v = planView(drawing(), { routineId: 'D' })!;
    const row = v.rows[1];
    expect(row).toMatchObject({ kind: 'routine', words: 'For each photo in {photos}', broken: true, each: { item: 'photo', list: 'photos' }, reads: ['photos'], asks: [], hoisted: ['drawing'] });
    const draw = v.rows.find((r) => r.itemId === 'draw')!;
    expect(draw).toMatchObject({ depth: 1, reads: ['photo'], asks: [] });
    expect(draw.above).toContain('photo');
    // After the block the item is not a name; what each item gave is.
    const rank = v.rows.find((r) => r.itemId === 'rank')!;
    expect(rank.above).not.toContain('photo');
    expect(rank.asks).toEqual([]);
    expect(namesOffered(v.rows, { mode: 'into', index: 1 })).toEqual(['photos', 'photo', 'drawing']);
    expect(namesOffered(v.rows, { mode: 'end' })).not.toContain('photo');
  });

  it('a block over a name nothing gives says "asks {list}"', () => {
    const d = world(seq('D', 'Drawing practice', [ref('row', 'E')]), block('E', 'photo', 'photos', [step('draw', 'Draw {photo}')]));
    expect(planView(d, { routineId: 'D' })!.rows[0].asks).toEqual(['photos']);
  });

  it('a routine with a block asks for the list (not the item), and gives what the block gives', () => {
    expect(callIO(drawing(), 'D')).toEqual({ asks: [], gives: ['photos', 'drawing'] });
    const d = world(seq('D', 'Drawing practice', [ref('row', 'E')]), block('E', 'photo', 'photos', [step('draw', 'Draw {photo} >drawing')]));
    expect(callIO(d, 'D')).toEqual({ asks: ['photos'], gives: ['drawing'] });
  });

  it('renaming the list or the item renames them in the block, in one write', () => {
    const d1 = okEdit(drawing(), 'D', { kind: 'renameValue', from: 'photos', to: 'refs' });
    expect(d1.routines.E).toMatchObject({ words: 'For each photo in {refs}', each: { item: 'photo', list: 'refs' } });
    expect(items(d1, 'D')[0]).toMatchObject({ out: 'refs' });
    const d2 = okEdit(drawing(), 'D', { kind: 'renameValue', from: 'photo', to: 'ref' });
    expect(d2.routines.E).toMatchObject({ words: 'For each ref in {photos}', each: { item: 'ref', list: 'photos' } });
    expect(items(d2, 'E')[0]).toMatchObject({ text: 'Draw {ref}' });
  });

  it('Copy copies the block (its own copy, still a for each)', () => {
    const d1 = okEdit(drawing(), 'D', { kind: 'copy', words: 'Drawing practice (copy)' });
    const copy = Object.values(d1.routines).find((r) => r.words === 'Drawing practice (copy)')!;
    const row = (copy.items as { ref?: string }[])[1];
    expect(row.ref).not.toBe('E');
    expect(d1.routines[row.ref!]).toMatchObject({ named: false, each: { item: 'photo', list: 'photos' } });
  });
});

describe('Running: the giving step, the list, and the loop', () => {
  it('the giving step of a name a for each reads has a list field: one item per row, kept as rows', () => {
    const s = start(drawing(), 'D');
    expect(runnerView(s.d, s.id)!.fields).toEqual([{ name: 'photos', text: '', gives: true, list: true }]);
    const d = listed(s.d, s.id, 'photos', ['the dancer', 'the boxer', '  ', 'the cellist']);
    expect(seen(d, s.id, 'photos')).toEqual(['the dancer', 'the boxer', 'the cellist']);
    expect(runnerView(d, s.id)!.fields[0]).toMatchObject({ name: 'photos', items: ['the dancer', 'the boxer', 'the cellist'], list: true });
    // Never comma parsing: one item with commas stays one item.
    const d2 = listed(s.d, s.id, 'photos', ['the dancer, the boxer']);
    expect(seen(d2, s.id, 'photos')).toEqual(['the dancer, the boxer']);
    // A plain step's field is not a list.
    const plain = start(world(seq('P', 'Plain', [step('a', 'Pick one >thing'), step('b', 'Use {thing}')])), 'P');
    expect(runnerView(plain.d, plain.id)!.fields[0].list).toBeUndefined();
  });

  it('Next goes into the block at the first item: the values row reads "photo 1 of 3: the dancer", and the item reads in the step', () => {
    const { d, id } = inLoop();
    expect(here(d, id)).toBe('draw');
    expect(words(d, id)).toBe('Draw the dancer');
    const v = runnerView(d, id)!;
    expect(v.values.map((x) => [x.name, x.text, x.each])).toEqual([
      ['photos', 'the dancer, the boxer and the cellist', undefined],
      ['photo', 'the dancer', { n: 1, of: 3 }],
    ]);
    expect(v.level).toBe('For each photo');
    expect(v.parent).toBe('Drawing practice');
    expect(v.moves.stepOut).toEqual({ name: 'For each photo' });
  });

  it('each round: the next item, and the values given inside the loop cleared (those steps ask again); after the last, the collected list', () => {
    let { d, id } = inLoop();
    d = next(d, id);
    expect(runnerView(d, id)!.fields).toEqual([{ name: 'drawing', text: '', gives: true }]);
    d = typed(d, id, 'drawing', 'dancer sketch');
    d = next(d, id);
    // Round 2: "photo 2 of 3: the boxer"; {drawing} is asked again.
    expect(here(d, id)).toBe('draw');
    expect(words(d, id)).toBe('Draw the boxer');
    expect(runnerView(d, id)!.values.find((x) => x.name === 'photo')).toMatchObject({ text: 'the boxer', each: { n: 2, of: 3 } });
    expect(seen(d, id, 'drawing')).toEqual([]);
    d = next(d, id);
    expect(runnerView(d, id)!.fields).toEqual([{ name: 'drawing', text: '', gives: true }]);
    d = next(typed(d, id, 'drawing', 'boxer sketch'), id);
    d = next(typed(next(d, id), id, 'drawing', 'cellist sketch'), id);
    // Past the last: after the block, what each item gave, in order.
    expect(here(d, id)).toBe('rank');
    expect(seen(d, id, 'drawing')).toEqual(['dancer sketch', 'boxer sketch', 'cellist sketch']);
    expect(words(d, id)).toBe('Rank the dancer sketch, boxer sketch and cellist sketch');
    expect(seen(d, id, 'photo')).toEqual([]);
    expect(seen(d, id, 'photos')).toEqual(['the dancer', 'the boxer', 'the cellist']);
  });

  it('a call inside receives the item; what it gives is collected after the block', () => {
    const d0 = world(
      seq('D', 'Drawing practice', [step('find', 'Find reference photos >photos'), ref('row', 'E'), step('rank', 'Rank the {drawing}')]),
      block('E', 'photo', 'photos', [ref('sk', 'S')]),
      seq('S', 'Sketch', [step('draw', 'Draw {photo}'), step('name', 'Name the drawing >drawing')]),
    );
    let { d, id } = inLoop(d0, ['the dancer', 'the boxer']);
    expect(here(d, id)).toBe('sk');
    d = ok(d, { kind: 'stepIn', runId: id });
    expect(words(d, id)).toBe('Draw the dancer');
    d = next(typed(next(d, id), id, 'drawing', 'dancer sketch'), id);
    // Out of Sketch, round 2 of the block: on the call again.
    expect(here(d, id)).toBe('sk');
    d = ok(d, { kind: 'stepIn', runId: id });
    expect(words(d, id)).toBe('Draw the boxer');
    d = next(typed(next(d, id), id, 'drawing', 'boxer sketch'), id);
    expect(here(d, id)).toBe('rank');
    expect(seen(d, id, 'drawing')).toEqual(['dancer sketch', 'boxer sketch']);
  });

  it('giving the list again (a step inside) shows it to adjust — and the for each keeps its place and carries on to an item added', () => {
    const d0 = drawing([step('draw', 'Draw {photo}'), step('adjust', 'Adjust the photos >photos')]);
    let { d, id } = inLoop(d0, ['a', 'b']);
    d = next(d, id);
    // The adjusting step shows the list as it is.
    expect(runnerView(d, id)!.fields).toEqual([{ name: 'photos', text: 'a and b', items: ['a', 'b'], gives: true, list: true }]);
    d = listed(d, id, 'photos', ['a', 'b', 'c']);
    expect(seen(d, id, 'photos')).toEqual(['a', 'b', 'c']);
    d = next(d, id);
    expect(words(d, id)).toBe('Draw b');
    expect(runnerView(d, id)!.values.find((x) => x.name === 'photo')!.each).toEqual({ n: 2, of: 3 });
    // An item before its place removed: it still goes on to the one after the item it is on.
    d = listed(next(d, id), id, 'photos', ['b', 'c']);
    d = next(d, id);
    expect(words(d, id)).toBe('Draw c');
    d = next(next(d, id), id);
    // Past the last item: it ends.
    expect(here(d, id)).toBe('rank');
  });

  it('passes straight through an empty list — or one never given', () => {
    const s = start(drawing(), 'D');
    expect(here(next(s.d, s.id), s.id)).toBe('rank');
    const e = start(drawing(), 'D');
    expect(here(next(listed(e.d, e.id, 'photos', ['', ' ']), e.id), e.id)).toBe('rank');
    // As the last item of the routine: Next is Done, and ends the run.
    const end = start(drawing(undefined, []), 'D');
    expect(runnerView(end.d, end.id)!.next).toBe('done');
    const r = go(end.d, { kind: 'next', runId: end.id });
    expect(r.said).toMatchObject({ kind: 'ended' });
    // A block with no steps: straight through too.
    const empty = start(drawing([]), 'D');
    expect(here(next(listed(empty.d, empty.id, 'photos', ['a']), empty.id), empty.id)).toBe('rank');
  });

  it('a block as the routine’s first step: Start goes into it (the list given above, in the routine that calls it)', () => {
    const d0 = world(
      seq('O', 'Outer', [step('find', 'Find >photos'), ref('c', 'D')]),
      seq('D', 'Each photo', [ref('row', 'E')]),
      block('E', 'photo', 'photos', [step('draw', 'Draw {photo}')]),
    );
    const s = start(d0, 'O');
    let d = next(listed(s.d, s.id, 'photos', ['x', 'y']), s.id);
    d = ok(d, { kind: 'stepIn', runId: s.id });
    expect(words(d, s.id)).toBe('Draw x');
  });

  it('Step out of the loop: what this item gave is collected, and the run goes on after the block (Undo puts it back)', () => {
    let { d, id } = inLoop();
    d = typed(next(d, id), id, 'drawing', 'dancer sketch');
    const before = d;
    const r = go(d, { kind: 'done', runId: id });
    expect(r.ok).toBe(true);
    d = r.data;
    expect(here(d, id)).toBe('rank');
    expect(seen(d, id, 'drawing')).toEqual(['dancer sketch']);
    expect(undone(before, d)).toEqual(json(before));
  });

  it('the values row’s item opens its sheet: the item, from the block', () => {
    const { d, id } = inLoop();
    expect(valueDetail(d, id, 'photo')).toMatchObject({ name: 'photo', items: ['the dancer'], from: 'For each photo in {photos}' });
    // The list read by the for each: its rows (it changes only by being given again).
    expect(valueDetail(d, id, 'photos')).toMatchObject({ items: ['the dancer', 'the boxer', 'the cellist'], list: true });
  });

  it('the panel’s "then:" names the step Next goes to', () => {
    const { d, id } = inLoop();
    expect(panelView(d, id)!.then).toBe('Name the drawing');
  });

  it('a list value is kept as its items, through the value verb; blank rows dropped; none clears it', () => {
    const s = start(drawing(), 'D');
    const d1 = listed(s.d, s.id, 'photos', ['a', 'b']);
    expect(run(d1, s.id).values).toEqual([expect.objectContaining({ name: 'photos', items: ['a', 'b'], level: 0, item: 'find' })]);
    const d2 = listed(d1, s.id, 'photos', ['', '  ']);
    expect(run(d2, s.id).values).toEqual([]);
  });

  it('an older build’s run inside the block (no item on its level) reads as the first item', () => {
    const { d, id } = inLoop();
    const raw = d.runs[id] as unknown as { frames: Record<string, unknown>[] };
    const old = { ...d, runs: { ...d.runs, [id]: { ...raw, frames: raw.frames.map(({ each: _e, eachText: _t, ...f }) => f) } } } as Data;
    expect(words(old, id)).toBe('Draw the dancer');
    expect(runnerView(old, id)!.values.find((x) => x.name === 'photo')!.each).toEqual({ n: 1, of: 3 });
  });

  it('Start over the loop: from its first item, what it gave gone', () => {
    let { d, id } = inLoop();
    d = next(typed(next(d, id), id, 'drawing', 'dancer sketch'), id);
    expect(words(d, id)).toBe('Draw the boxer');
    d = ok(d, { kind: 'restart', runId: id, level: 1 });
    expect(words(d, id)).toBe('Draw the dancer');
    expect(seen(d, id, 'drawing')).toEqual([]);
  });
});

describe('what an older build reads', () => {
  it('the block is a step broken down: a row to an unnamed sequence, its words the sentence — nothing else', () => {
    const d1 = okEdit(world(seq('D', 'D', [step('find', 'Find >photos')])), 'D', { kind: 'addEach', item: 'photo', list: 'photos' });
    const row = items(d1, 'D')[1] as { id: string; ref: string };
    // An older build knows `{ id, ref }` rows to unnamed sequences as steps broken down, and reads `words`.
    expect(Object.keys(row).sort()).toEqual(['id', 'ref']);
    expect(d1.routines[row.ref]).toMatchObject({ named: false, words: 'For each photo in {photos}' });
    expect(joinItems([])).toBe('');
  });
});
