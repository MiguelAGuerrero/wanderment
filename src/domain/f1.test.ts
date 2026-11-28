/**
 * F-1: the final review's engine and stored-data findings (`.polish/product/final-audit-engine.md` #1–#10, #12 and
 * `final-audit-storage.md` F1, F3–F8, F11, F12), each from the auditor's repro. Expected values come from the owner's
 * rulings (docs/product/owner-notes.md, 2026-11-27 and 2026-11-28) and DESIGN.md, never from running the code:
 * - "Back keeps it": Back shows the value in the step's field to keep or change.
 * - "A Plan edit never clears a run's values." Removing the for each (or In any order block) the run is inside keeps them.
 * - Values are held at or above the place: what was given above a Jump's new place stays.
 * - One name given more than once is one list (B-16); a row that gives again replaces its own share, never adds twice.
 * - What this version cannot read is kept, never written over (DESIGN.md).
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { editRoutine, Env, Item, place, readRun, Result, RoutineEdit, runVerb, Verb } from './run';
import { runnerView } from './runView';
import { Data, emptyData, Id, Routine } from './types';

const T0 = Date.UTC(2026, 10, 28, 1, 0, 0);
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
const sub = (id: string, words: string, items: Item[], extra: Record<string, unknown> = {}): Routine => seq(id, words, items, { named: false, ...extra });
const block = (id: string, item: string, list: string, items: Item[], each: Record<string, unknown> = {}): Routine => seq(id, `For each ${item} in {${list}}`, items, { named: false, each: { item, list, ...each } });
const anyB = (id: string, items: Item[]): Routine => seq(id, 'In any order', items, { named: false, any: true });
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
const give = (d: Data, runId: Id, name: string, text: string) => ok(d, { kind: 'value', runId, name, text, item: here(d, runId) });
const giveList = (d: Data, runId: Id, name: string, items: string[]) => ok(d, { kind: 'value', runId, name, text: items.join('\n'), items, item: here(d, runId) });
const field = (d: Data, id: Id, name: string) => runnerView(d, id)!.fields.find((f) => f.name === name)?.text;
const stored = (d: Data, id: Id, name: string) => run(d, id).values.filter((v) => v.name === name).map((v) => `${v.level}: ${v.items.join(', ')}`);
const raw = (d: Data, id: Id) => JSON.parse(JSON.stringify(d.runs[id]));
const withRaw = (d: Data, id: Id, r: unknown): Data => ({ ...d, runs: { ...d.runs, [id]: r as never } });

/** Drawing: List photos >photos · For each photo in {photos} [Sketch {photo} >drawing · Look at {drawing}] · Show {drawing}. */
const drawing = () => world(seq('D', 'Drawing', [step('list', 'List photos >photos'), ref('row', 'E'), step('show', 'Show {drawing}')]), block('E', 'photo', 'photos', [step('sk', 'Sketch {photo} >drawing'), step('look', 'Look at {drawing}')]));
const throughLoop = () => {
  const s = start(drawing(), 'D');
  let d = giveList(s.d, s.id, 'photos', ['a', 'b']);
  d = next(d, s.id);
  d = next(give(d, s.id, 'drawing', 'A'), s.id, 2);
  d = next(give(d, s.id, 'drawing', 'B'), s.id, 2);
  expect(words(d, s.id)).toBe('Show A and B');
  return { d, id: s.id };
};

describe('engine #1 (data-loss): Back after a for each keeps every item’s value', () => {
  it('Back from the step after the loop lands on the last item’s last step, its value in place', () => {
    const { d, id } = throughLoop();
    const b = ok(d, { kind: 'back', runId: id });
    expect(words(b, id)).toBe('Look at B');
    expect(runnerView(b, id)!.values.map((v) => `${v.name}: ${v.text}`)).toContain('drawing: B');
    // Next from there: nothing given again, nothing lost.
    expect(words(next(b, id), id)).toBe('Show A and B');
    // Step out from there too.
    expect(words(ok(b, { kind: 'done', runId: id }), id)).toBe('Show A and B');
  });

  it('Back, then Back to the first item and fixing it: the other item’s value stays (the auditor’s repro)', () => {
    const { d, id } = throughLoop();
    let e = ok(d, { kind: 'back', runId: id }); // Look at B
    e = ok(e, { kind: 'back', runId: id }); // Sketch b
    expect(field(e, id, 'drawing')).toBe('B');
    e = ok(e, { kind: 'back', runId: id }); // Look at A (#12: Back reaches the item before)
    expect(words(e, id)).toBe('Look at A');
    e = ok(e, { kind: 'back', runId: id }); // Sketch a
    expect(field(e, id, 'drawing')).toBe('A');
    e = give(e, id, 'drawing', 'A2');
    e = next(e, id, 2);
    // Item 2 again, going forward after Back: its value is shown in its field to keep or change.
    expect(words(e, id)).toBe('Sketch b');
    expect(field(e, id, 'drawing')).toBe('B');
    e = next(e, id, 2);
    expect(words(e, id)).toBe('Show A2 and B');
    expect(stored(e, id, 'drawing')).toEqual(['0: A2, B']);
  });
});

describe('engine #12: Back on the first step of a for each’s second item', () => {
  it('goes to the first item’s last step, with that item’s value', () => {
    const s = start(drawing(), 'D');
    let d = giveList(s.d, s.id, 'photos', ['a', 'b', 'c']);
    d = next(d, s.id);
    d = next(give(d, s.id, 'drawing', 'A'), s.id, 2);
    expect(words(d, s.id)).toBe('Sketch b');
    expect(runnerView(d, s.id)!.canBack).toBe(true);
    d = give(d, s.id, 'drawing', 'B');
    d = ok(d, { kind: 'back', runId: s.id });
    expect(words(d, s.id)).toBe('Look at A');
    // Forward again: item 2 shows what was typed there before Back.
    d = next(d, s.id);
    expect(words(d, s.id)).toBe('Sketch b');
    expect(field(d, s.id, 'drawing')).toBe('B');
  });
});

describe('engine #3: a row passed again after Back gives anew in place of its own share — never twice', () => {
  it('a call, when the name is also given before it: "1 and 3", not "1, 2 and 3"', () => {
    const d0 = world(seq('A', 'Main', [step('pre', 'Note >x'), ref('c', 'C'), step('use', 'Use {x}')]), seq('C', 'Callee', [step('g', 'Give >x')]));
    const s = start(d0, 'A');
    let d = next(give(s.d, s.id, 'x', '1'), s.id);
    d = ok(d, { kind: 'stepIn', runId: s.id });
    d = next(give(d, s.id, 'x', '2'), s.id);
    expect(words(d, s.id)).toBe('Use 1 and 2');
    d = ok(d, { kind: 'back', runId: s.id });
    d = ok(d, { kind: 'stepIn', runId: s.id });
    // Back keeps it: the call's own share is in its giving step's field again.
    expect(field(d, s.id, 'x')).toBe('2');
    d = next(give(d, s.id, 'x', '3'), s.id);
    expect(words(d, s.id)).toBe('Use 1 and 3');
  });

  it('a for each, when the name is also given before it: "W, A2 and B2"', () => {
    const d0 = world(seq('D', 'Drawing', [step('list', 'List photos >photos'), step('pre', 'Warm drawing >drawing'), ref('row', 'E'), step('show', 'Show {drawing}')]), block('E', 'photo', 'photos', [step('sk', 'Sketch {photo} >drawing')]));
    const s = start(d0, 'D');
    let d = giveList(s.d, s.id, 'photos', ['a', 'b']);
    d = next(d, s.id);
    d = next(give(d, s.id, 'drawing', 'W'), s.id);
    d = next(give(d, s.id, 'drawing', 'A'), s.id);
    d = next(give(d, s.id, 'drawing', 'B'), s.id);
    expect(words(d, s.id)).toBe('Show W, A and B');
    d = ok(d, { kind: 'back', runId: s.id }); // Sketch b
    d = ok(d, { kind: 'back', runId: s.id }); // Sketch a
    expect(words(d, s.id)).toBe('Sketch a');
    d = next(give(d, s.id, 'drawing', 'A2'), s.id);
    d = next(give(d, s.id, 'drawing', 'B2'), s.id);
    expect(words(d, s.id)).toBe('Show W, A2 and B2');
  });

  it('an In any order block, when the name is also given before it: Back to its row keeps each part’s value; redone, "W, X2 and Y2"', () => {
    const d0 = world(seq('A', 'Main', [step('pre', 'Note >copies'), ref('blk', 'B'), step('after', 'Show {copies}')]), anyB('B', [step('p1', 'Copy one >copies'), step('p2', 'Copy two >copies')]));
    const s = start(d0, 'A');
    let d = next(give(s.d, s.id, 'copies', 'W'), s.id);
    d = ok(d, { kind: 'stepIn', runId: s.id });
    d = next(give(d, s.id, 'copies', 'X'), s.id);
    d = ok(d, { kind: 'stepIn', runId: s.id });
    d = next(give(d, s.id, 'copies', 'Y'), s.id);
    expect(words(d, s.id)).toBe('Show W, X and Y');
    d = ok(d, { kind: 'back', runId: s.id });
    expect(here(d, s.id)).toBe('blk');
    d = ok(d, { kind: 'part', runId: s.id, level: 0, part: 'p1' });
    expect(field(d, s.id, 'copies')).toBe('X');
    d = next(give(d, s.id, 'copies', 'X2'), s.id);
    d = ok(d, { kind: 'part', runId: s.id, level: 0, part: 'p2' });
    expect(field(d, s.id, 'copies')).toBe('Y');
    d = next(give(d, s.id, 'copies', 'Y2'), s.id);
    expect(words(d, s.id)).toBe('Show W, X2 and Y2');
  });

  it('… and passed again with nothing changed, Step out on the row joins what each part gave before: "W, X and Y"', () => {
    const d0 = world(seq('A', 'Main', [step('pre', 'Note >copies'), ref('blk', 'B'), step('after', 'Show {copies}')]), anyB('B', [step('p1', 'Copy one >copies'), step('p2', 'Copy two >copies')]));
    const s = start(d0, 'A');
    let d = next(give(s.d, s.id, 'copies', 'W'), s.id);
    d = ok(d, { kind: 'stepIn', runId: s.id });
    d = next(give(d, s.id, 'copies', 'X'), s.id);
    d = ok(d, { kind: 'stepIn', runId: s.id });
    d = next(give(d, s.id, 'copies', 'Y'), s.id);
    d = ok(d, { kind: 'back', runId: s.id });
    d = ok(d, { kind: 'done', runId: s.id });
    expect(words(d, s.id)).toBe('Show W, X and Y');
  });
});

describe('engine #5 (rule): a Plan Remove of the row the run is inside hands its values back', () => {
  // (Left: a call row removed while inside it still takes its level's values — values.test.ts "removing a step the run is
  // inside" pins that; see build.md.)
  it('an In any order block, removed while in a part: what the parts gave is joined', () => {
    const { d, id } = inStudy();
    const e = okEdit(d, 'A', { kind: 'remove', item: 'blk' });
    expect(here(e, id)).toBe('after');
    expect(words(e, id)).toBe('Show X');
  });

  it('a for each block during its second item: both items’ values are collected', () => {
    const s = start(drawing(), 'D');
    let d = giveList(s.d, s.id, 'photos', ['a', 'b']);
    d = next(d, s.id);
    d = next(give(d, s.id, 'drawing', 'A'), s.id, 2);
    d = next(give(d, s.id, 'drawing', 'B'), s.id);
    d = okEdit(d, 'D', { kind: 'remove', item: 'row' });
    expect(here(d, s.id)).toBe('show');
    expect(words(d, s.id)).toBe('Show A and B');
  });
});

/** Main: Warm · In any order [Copy one >copies · Study (broken down: Study a · Study b)] · Show {copies} · End. */
const anyWorld = () => world(seq('A', 'Main', [step('w', 'Warm'), ref('blk', 'B'), step('after', 'Show {copies}'), step('end', 'End')]), anyB('B', [step('p1', 'Copy one >copies'), ref('p2', 'S')]), sub('S', 'Study', [step('s1', 'Study a'), step('s2', 'Study b')]));
const inStudy = () => {
  const s = start(anyWorld(), 'A');
  let d = next(s.d, s.id);
  d = ok(d, { kind: 'stepIn', runId: s.id });
  d = next(give(d, s.id, 'copies', 'X'), s.id);
  d = ok(d, { kind: 'part', runId: s.id, level: 0, part: 'p2' });
  expect(words(d, s.id)).toBe('Study a');
  return { d, id: s.id };
};

describe('engine #2, storage F12 (data-loss): a Jump forward out of a block keeps what was given in it', () => {
  it('past an In any order block: what the parts gave is joined, as Step out joins it', () => {
    const { d, id } = inStudy();
    const r = go(d, { kind: 'jump', runId: id, to: { path: ['after'] } });
    expect(r.ok).toBe(true);
    expect(words(r.data, id)).toBe('Show X');
    expect(r.cleared ?? []).toEqual([]);
  });

  it('out of a for each mid-round: the round is collected, as Step out collects it', () => {
    const s = start(drawing(), 'D');
    let d = giveList(s.d, s.id, 'photos', ['a', 'b']);
    d = next(d, s.id);
    d = next(give(d, s.id, 'drawing', 'A'), s.id, 2);
    d = give(d, s.id, 'drawing', 'B');
    const r = go(d, { kind: 'jump', runId: s.id, to: { path: ['show'] } });
    expect(r.ok).toBe(true);
    expect(words(r.data, s.id)).toBe('Show A and B');
  });

  it('a Jump back past the block, before it: what is dropped is said', () => {
    const { d, id } = inStudy();
    const r = go(d, { kind: 'jump', runId: id, to: { path: ['w'] } });
    expect(r.ok).toBe(true);
    expect(r.cleared).toContain('copies');
  });
});

describe('engine #7: Step out of a call that is a part’s last step', () => {
  it('leaves the call, and the part is finished, not stopped', () => {
    const d0 = world(seq('A', 'Main', [ref('blk', 'B'), step('after', 'After')]), anyB('B', [ref('p1', 'S'), step('p2', 'Other')]), sub('S', 'Part one', [step('s1', 'One'), ref('call', 'C')]), seq('C', 'Callee', [step('c1', 'c one'), step('c2', 'c two')]));
    const s = start(d0, 'A');
    let d = ok(s.d, { kind: 'stepIn', runId: s.id });
    d = next(d, s.id);
    d = ok(d, { kind: 'stepIn', runId: s.id });
    expect(words(d, s.id)).toBe('c one');
    d = ok(d, { kind: 'done', runId: s.id });
    const parts = run(d, s.id).frames[0].parts!;
    expect(parts.list.find((p) => p.item === 'p1')?.ended).toBe('finished');
  });
});

describe('engine #8: a record of parts this version cannot read', () => {
  it('offers no part to take up on the row', () => {
    const s = start(anyWorld(), 'A');
    let d = next(s.d, s.id);
    const r = raw(d, s.id);
    r.frames[0].parts = { row: 'blk', list: 'future-shape' };
    d = withRaw(d, s.id, r);
    const v = runnerView(d, s.id)!;
    expect(v.choose?.take).toBeUndefined();
    expect(v.next).not.toBe('take');
  });
});

describe('engine #9, storage F8: Copy of a routine with two rows to one breakdown', () => {
  it('the copy shares nothing with the original', () => {
    const d0 = world(seq('R', 'Morning', [ref('a', 'S'), step('mid'), ref('b', 'S')]), sub('S', 'Stretch', [step('s1', 'one')]));
    const d = okEdit(d0, 'R', { kind: 'copy', words: 'Evening' });
    const copy = Object.values(d.routines).find((r) => r.words === 'Evening')!;
    const refs = (copy.items as { ref?: string }[]).filter((i) => i.ref).map((i) => i.ref);
    expect(refs).toHaveLength(2);
    expect(refs).not.toContain('S');
    expect(refs[0]).toBe(refs[1]);
  });
});

describe('engine #10, storage F3/F4: a kept list edited keeps what it cannot read or rewrite', () => {
  const week = (each: Record<string, unknown>, extra: Routine[] = []) => world(seq('W', 'Week', [ref('row', 'E')]), block('E', 'way', 'ways', [step('do', 'Do {way}')], each), seq('G', 'Gym', [step('g', 'Lift')]), ...extra);
  const header = (d: Data) => (d.routines.E as unknown as { each: { kept: string[]; refs?: unknown[] } }).each;

  it('a row holding a routine since removed keeps its ref ("Gym (removed)")', () => {
    const d0 = week({ kept: ['Gym', 'Run'], refs: [{ ref: 'G', name: 'Gym' }, null] });
    const d1 = { ...d0, routines: { ...d0.routines, G: { ...d0.routines.G, removedAt: '2026-11-20T00:00:00.000Z' } } };
    const d = okEdit(d1, 'E', { kind: 'keptList', items: ['Gym', 'Run', 'Swim'] });
    expect(header(d).kept).toEqual(['Gym', 'Run', 'Swim']);
    expect(header(d).refs).toEqual([{ ref: 'G', name: 'Gym' }, null, null]);
  });

  it('a ref with a field this version does not know keeps it', () => {
    const d0 = week({ kept: ['Gym 3x', 'Swim'], refs: [{ ref: 'G', name: 'Gym', since: 'future' }, null] });
    const d = okEdit(d0, 'E', { kind: 'keptList', items: ['Gym 3x', 'Swim', 'Run'] });
    expect(header(d).refs?.[0]).toEqual({ ref: 'G', name: 'Gym', since: 'future' });
  });

  it('a ref in a shape this version cannot read: the list is kept as stored, never written over', () => {
    const d0 = week({ kept: ['Gym 3x', 'Swim'], refs: [{ template: 'lib-x' }, null] });
    const r = edit(d0, 'E', { kind: 'keptList', items: ['Gym 3x', 'Swim', 'Run'] });
    expect(r.ok).toBe(false);
    expect(r.data).toBe(d0);
  });

  it('a list of 150 items (an import) is never cut to 100 by an edit', () => {
    const kept = Array.from({ length: 150 }, (_, i) => `item ${i}`);
    const d0 = week({ kept });
    const r = edit(d0, 'E', { kind: 'keptList', items: [...kept, 'new one'] });
    expect(header(r.data).kept.length).toBeGreaterThanOrEqual(150);
  });

  it('an item of 3,000 characters is never cut by an edit of another row', () => {
    const long = 'x'.repeat(3000);
    const d0 = week({ kept: [long, 'Swim'] });
    const r = edit(d0, 'E', { kind: 'keptList', items: [long, 'Swim', 'Run'] });
    expect(header(r.data).kept[0].length).toBe(3000);
  });
});

describe('storage F6: a Jump by path keeps fields this version does not know on the levels it stays in', () => {
  it('on the bottom level, and on an inner level the Jump stays in', () => {
    const d0 = world(seq('H', 'Hands', [step('s1', 'one'), step('s2', 'two'), ref('b', 'B'), step('s3', 'three')]), sub('B', 'Sub', [step('b1', 'b one'), step('b2', 'b two')]));
    const s = start(d0, 'H');
    let d = next(s.d, s.id);
    const r0 = raw(d, s.id);
    r0.frames[0].future = 'keep me';
    d = withRaw(d, s.id, r0);
    const j = ok(d, { kind: 'jump', runId: s.id, to: { path: ['s3'] } });
    expect((j.runs[s.id] as unknown as { frames: Record<string, unknown>[] }).frames[0].future).toBe('keep me');
    let y = ok(next(d, s.id), { kind: 'stepIn', runId: s.id });
    const r1 = raw(y, s.id);
    r1.frames[1].future = 'inner';
    y = withRaw(y, s.id, r1);
    const z = ok(y, { kind: 'jump', runId: s.id, to: { path: ['b', 'b2'] } });
    const frames = (z.runs[s.id] as unknown as { frames: Record<string, unknown>[] }).frames;
    expect(frames[0].future).toBe('keep me');
    expect(frames[1].future).toBe('inner');
  });
});

describe('storage F1: a part’s and a record of parts’ fields this version does not know survive', () => {
  it('a take-up and a Next', () => {
    const d0 = world(seq('H', 'Hands', [step('warm'), ref('row', 'A'), step('after')]), anyB('A', [step('p1'), step('p2'), step('p3')]));
    const s = start(d0, 'H');
    let d = next(s.d, s.id);
    d = ok(d, { kind: 'part', runId: s.id, level: 0, part: 'p1' });
    d = ok(d, { kind: 'part', runId: s.id, level: 0, part: 'p2' });
    const r = raw(d, s.id);
    r.frames[0].parts.future = { keep: 'me' };
    r.frames[0].parts.list[0].note = 'newer field on part';
    d = withRaw(d, s.id, r);
    d = next(d, s.id);
    d = ok(d, { kind: 'part', runId: s.id, level: 0, part: 'p3' });
    const after = (d.runs[s.id] as unknown as { frames: { parts?: { future?: unknown; list: Record<string, unknown>[] } }[] }).frames[0].parts!;
    expect(after.future).toEqual({ keep: 'me' });
    expect(after.list.find((p) => p.item === 'p1')!.note).toBe('newer field on part');
  });
});

describe('storage F11: Start over keeps a record of parts this version cannot read', () => {
  it('restart of the whole run', () => {
    const s = start(anyWorld(), 'A');
    let d = next(s.d, s.id);
    const r = raw(d, s.id);
    r.frames[0].parts = { row: 'blk', list: 'v9-shape' };
    d = withRaw(d, s.id, r);
    const x = go(d, { kind: 'restart', runId: s.id, level: 0 });
    if (x.ok) expect((x.data.runs[s.id] as unknown as { frames: { parts?: unknown }[] }).frames.map((f) => f.parts).filter(Boolean)).toEqual([{ row: 'blk', list: 'v9-shape' }]);
    else expect(x.data).toBe(d);
  });
});
