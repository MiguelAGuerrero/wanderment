/**
 * P-96: values — the scout's values table (section 3) as the contract's rulings amend it, one test per
 * row, plus the text rules (ruling 5), scope (ruling 2: no collision, asks), rounds (ruling 3) and the
 * Plan edits (ruling 5: Gives…, rename, remove, Break it down refused). Expected values come from the
 * contract, the scout's table and B-15, never from running the engine.
 *
 * Notation: [a b | c d] = items with the Repeat divider before c; `>x` = the step gives {x}.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { applyUndo, undoEntry } from './diff';
import { editRoutine, Env, Item, outOf, place, readRun, Result, RoutineEdit, runVerb, valuesOf, Verb, visibleValue } from './run';
import { Data, emptyData, Id, Routine, Run } from './types';
import { capValue, isName, joinItems, MAX_VALUE, nameKey, namesIn, parseWords, readValues, renameIn, suggestName, ValueEntry, wordsWith } from './values';

const T0 = Date.UTC(2026, 10, 26, 9, 0, 0);
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
/** A step; `>name` at the end gives that name. */
const step = (id: string, text = id): Item => {
  const m = /^(.*?)\s*>(\S.*)$/.exec(text);
  return m ? ({ id, text: m[1], out: m[2] } as Item) : { id, text };
};
const ref = (id: string, to: string): Item => ({ id, ref: to });
const seq = (id: string, words: string, items: Item[], extra: Record<string, unknown> = {}): Routine => ({ id, words, named: true, createdAt: '2026-11-01T00:00:00.000Z', items, ...extra });
const unnamed = (id: string, words: string, items: Item[], extra: Record<string, unknown> = {}): Routine => seq(id, words, items, { named: false, ...extra });
const world = (...ss: Routine[]): Data => ({ ...emptyData(), routines: Object.fromEntries(ss.map((s) => [s.id, s])) });
const run = (d: Data, id: Id) => readRun(d, id)!;
const start = (d: Data, routineId: Id) => {
  const r = go(d, { kind: 'start', routineId });
  expect(r.ok).toBe(true);
  return { d: r.data, id: r.runId! };
};
const walk = (d: Data, runId: Id, ...kinds: ('next' | 'done' | 'stepIn' | 'back')[]) => kinds.reduce((data, kind) => ok(data, { kind, runId }), d);
const here = (d: Data, id: Id) => place(d, run(d, id))!.item!.id;
/** Typed in the field of the step the run is on. */
const typed = (d: Data, runId: Id, name: string, text: string) => ok(d, { kind: 'value', runId, name, text, item: here(d, runId) });
/** The value of a name as the step the run is on sees it, in words ('' when none). */
const seen = (d: Data, runId: Id, name: string) => {
  const e = visibleValue(d, run(d, runId), nameKey(name));
  return e ? joinItems(e.items) : '';
};
const entries = (d: Data, runId: Id) => valuesOf(d, run(d, runId)).map((e) => `${e.level}:${e.name}=${e.items.join('|')}@${e.item}`);
const json = (v: unknown) => JSON.parse(JSON.stringify(v));
const undone = (before: Data, after: Data) => json(applyUndo(after, undoEntry(before, after)));
const stored = (d: Data, id: Id, patch: Record<string, unknown>): Data => ({ ...d, runs: { ...d.runs, [id]: { ...d.runs[id], ...patch } as Run } });

describe('text rules (ruling 5)', () => {
  it('{name} is a reference: trimmed, inner spaces collapsed, case-insensitive; text around it stays as written', () => {
    expect(parseWords('Test {feature} on { Big   Screen }')).toMatchObject([
      { kind: 'text', text: 'Test ' },
      { kind: 'name', name: 'feature', key: 'feature', raw: '{feature}' },
      { kind: 'text', text: ' on ' },
      { kind: 'name', name: 'Big Screen', key: 'big screen', raw: '{ Big   Screen }' },
    ]);
    expect(nameKey('{x}'.slice(1, 2))).toBe('x');
    expect(namesIn('{Feature} and {feature} and {FEATURE}')).toEqual([{ name: 'Feature', key: 'feature' }]);
  });

  it('{{ is a literal {, }} a literal }; a lone brace, an empty or a too-long name is plain text', () => {
    expect(wordsWith('Write {{x}} and {x}', () => 'v')).toBe('Write {x} and v');
    expect(namesIn('Write {{x}}')).toEqual([]);
    expect(wordsWith('a { b } c } {} {   }')).toBe('a { b } c } {} {   }'.replace('{ b }', '{b}'));
    expect(namesIn('{}{   }')).toEqual([]);
    expect(namesIn(`{${'n'.repeat(40)}}`)).toHaveLength(1);
    expect(namesIn(`{${'n'.repeat(41)}}`)).toEqual([]);
    expect(namesIn('{a {b}')).toEqual([{ name: 'b', key: 'b' }]);
    expect(parseWords('no braces at all')).toEqual([{ kind: 'text', text: 'no braces at all' }]);
  });

  it('a name is 1–40 characters once tidied, with no brace; a value is capped at 2000 characters, never inside a character', () => {
    expect([isName('feature'), isName('  a  b '), isName(''), isName('   '), isName('n'.repeat(40)), isName('n'.repeat(41)), isName('a{b'), isName('a}b'), isName(3)]).toEqual([true, true, false, false, true, false, false, false, false]);
    expect(capValue('x'.repeat(2500))).toHaveLength(MAX_VALUE);
    const emoji = '🎨'.repeat(2001);
    expect(Array.from(capValue(emoji))).toHaveLength(MAX_VALUE);
    expect(capValue('short')).toBe('short');
  });

  it('renaming in words rewrites every spelling of that name and nothing else (literal braces, other names, spacing kept)', () => {
    expect(renameIn('Test {Feature} vs {{feature}} and { feature } and {other}', 'feature', 'journey')).toBe('Test {journey} vs {{feature}} and {journey} and {other}');
    const words = 'nothing here';
    expect(renameIn(words, 'feature', 'x')).toBe(words);
  });

  it('a value is a list: one item reads as itself, more joined in words', () => {
    expect([joinItems(['a']), joinItems(['a', 'b']), joinItems(['the dancer', 'the boxer', 'the cellist']), joinItems([' ', 'x'])]).toEqual(['a', 'a and b', 'the dancer, the boxer and the cellist', 'x']);
  });

  it('Gives… suggests a name from the step’s words (editable)', () => {
    expect(suggestName('Select the subject matter')).toBe('subject');
    expect(suggestName('Pick a feature')).toBe('feature');
    expect(suggestName('Find three reference photos of {subject}')).toBe('reference');
    expect(suggestName('Breathe')).toBe('breathe');
  });

  it('the tolerant reader: what is not an entry is not read; for one name at one level the last one counts', () => {
    const good = { name: 'x', items: ['1'], level: 0, seq: 'R', item: 'a', at: 'T' };
    expect(readValues([good, null, 'x', { ...good, items: [] }, { ...good, items: [1] }, { ...good, level: -1 }, { ...good, level: 1.5 }, { ...good, name: ' ' }, { ...good, seq: 3 }, { ...good, item: undefined }, { ...good, name: 'X', items: ['2'] }])).toEqual([{ ...good, name: 'X', items: ['2'] }]);
    expect([readValues(undefined), readValues({ x: 'Acme' }), readValues('x')]).toEqual([[], [], []]);
  });
});

/** [pick>feature, test {feature}, note {feature}] */
const feature = () => world(seq('R', 'Feature loop', [step('pick', 'Pick a feature >feature'), step('test', 'Test {feature}'), step('note', 'Note what {Feature} did')]));

describe('giving and reading (rows 1, 2, 13)', () => {
  it('row 1: typed at the giving step, then Next: the value is the run’s, at its level, with where it came from; later steps read it', () => {
    const d0 = feature();
    let { d, id } = start(d0, 'R');
    expect(outOf(readRun(d, id) && (d.routines.R.items as Item[])[0])).toBe('feature');
    d = typed(d, id, 'feature', 'login');
    d = walk(d, id, 'next');
    expect(valuesOf(d, run(d, id))).toEqual([{ name: 'feature', items: ['login'], level: 0, seq: 'R', item: 'pick', words: 'Pick a feature', at: new Date(T0 + 1000).toISOString() }]);
    expect(seen(d, id, 'feature')).toBe('login');
    d = walk(d, id, 'next');
    expect(seen(d, id, 'FEATURE')).toBe('login');
    // Values belong to the run: the routine is not written by giving one.
    expect(d.routines.R).toBe(d0.routines.R);
  });

  it('row 1: typing replaces as typed (kept exactly, like the reason); typed again at the same step it stays its first time and has no "changed"', () => {
    let { d, id } = start(feature(), 'R');
    for (const s of ['l', 'lo', ' login ']) d = typed(d, id, 'feature', s);
    expect(valuesOf(d, run(d, id))).toEqual([expect.objectContaining({ items: [' login '], at: new Date(T0 + 1000).toISOString() })]);
    expect('changedAt' in valuesOf(d, run(d, id))[0]).toBe(false);
    expect(seen(d, id, 'feature')).toBe('login');
  });

  it('row 2: left empty and Next: nothing is written; a blank typed is no value (and clears one)', () => {
    let { d, id } = start(feature(), 'R');
    const before = d;
    d = walk(d, id, 'next');
    expect(d.runs[id].values).toBeUndefined();
    expect(seen(d, id, 'feature')).toBe('');
    expect(go(before, { kind: 'value', runId: id, name: 'feature', text: '   ', item: 'pick' }).data).toBe(before);
    d = typed(before, id, 'feature', 'x');
    d = typed(d, id, 'feature', '  ');
    expect(valuesOf(d, run(d, id))).toEqual([]);
  });

  it('row 13: rewording adds or removes {name}: nothing stored changes in the run; what is read follows the words', () => {
    let { d, id } = start(feature(), 'R');
    d = typed(d, id, 'feature', 'login');
    d = walk(d, id, 'next');
    const runBefore = d.runs[id];
    d = okEdit(d, 'R', { kind: 'reword', item: 'test', text: 'Test it' });
    expect(d.runs[id]).toBe(runBefore);
    expect(namesIn((d.routines.R.items as { text: string }[])[1].text)).toEqual([]);
    d = okEdit(d, 'R', { kind: 'reword', item: 'test', text: 'Test {feature} twice' });
    expect(d.runs[id]).toBe(runBefore);
    expect(seen(d, id, 'feature')).toBe('login');
  });

  it('the value verb: only on an open run, at the step it is on, for a name that step gives or reads; refused, nothing changes', () => {
    let { d, id } = start(feature(), 'R');
    expect(go(d, { kind: 'value', runId: 'nope', name: 'feature', text: 'x' }).reason).toBe('gone');
    expect(go(d, { kind: 'value', runId: id, name: 'feature', text: 'x', item: 'test' })).toMatchObject({ ok: false, reason: 'no-such-step', data: d });
    expect(go(d, { kind: 'value', runId: id, name: 'other', text: 'x', item: 'pick' })).toMatchObject({ ok: false, reason: 'cannot', data: d });
    expect(go(d, { kind: 'value', runId: id, name: 'a{b', text: 'x', item: 'pick' })).toMatchObject({ ok: false, reason: 'cannot', data: d });
    // The value sheet changes a value there is; with none, there is nothing to change.
    expect(go(d, { kind: 'value', runId: id, name: 'feature', text: 'x' })).toMatchObject({ ok: false, reason: 'cannot', data: d });
    d = typed(d, id, 'feature', 'x');
    d = ok(d, { kind: 'done', runId: id });
    expect(go(d, { kind: 'value', runId: id, name: 'feature', text: 'y' }).reason).toBe('ended');
  });

  it('a value is capped at 2000 characters as stored; at most 100 values on one run', () => {
    let { d, id } = start(feature(), 'R');
    d = typed(d, id, 'feature', 'x'.repeat(2400));
    expect(valuesOf(d, run(d, id))[0].items[0]).toHaveLength(2000);
    const many: ValueEntry[] = Array.from({ length: 100 }, (_, i) => ({ name: `n${i}`, items: ['v'], level: 0, seq: 'R', item: 'pick', at: 'T' }));
    const fresh = start(feature(), 'R');
    const full = stored(fresh.d, fresh.id, { values: many });
    expect(go(full, { kind: 'value', runId: fresh.id, name: 'feature', text: 'x', item: 'pick' })).toMatchObject({ ok: false, reason: 'cannot', data: full });
  });

  it('a run whose stored `values` this version cannot read (not a list): the verb is refused and moving never touches it', () => {
    const { d: d0, id } = start(feature(), 'R');
    const d = stored(d0, id, { values: { employer: 'Acme' } });
    expect(go(d, { kind: 'value', runId: id, name: 'feature', text: 'x', item: 'pick' })).toMatchObject({ ok: false, reason: 'cannot', data: d });
    const moved = walk(d, id, 'next', 'next');
    expect(moved.runs[id].values).toEqual({ employer: 'Acme' });
  });

  it('what cannot be read in `values` is kept exactly where it was through every write', () => {
    let { d, id } = start(feature(), 'R');
    d = stored(d, id, { values: [{ later: true, name: 'photos' }, 'junk'] });
    d = typed(d, id, 'feature', 'login');
    d = walk(d, id, 'next', 'next');
    expect(d.runs[id].values).toEqual([{ later: true, name: 'photos' }, 'junk', expect.objectContaining({ name: 'feature', items: ['login'] })]);
  });
});

describe('changing a value later (rows 3, 3b, 4)', () => {
  it('row 3: from the value sheet (no step): the text is replaced and `changedAt` set; where it came from and when are kept', () => {
    let { d, id } = start(feature(), 'R');
    d = typed(d, id, 'feature', 'login');
    d = walk(d, id, 'next');
    const was = valuesOf(d, run(d, id))[0];
    const before = d;
    d = ok(d, { kind: 'value', runId: id, name: 'Feature', text: 'signup' });
    const now = valuesOf(d, run(d, id))[0];
    expect(now).toEqual({ ...was, items: ['signup'], changedAt: expect.any(String) });
    // Row 4: one Undo restores it exactly.
    expect(undone(before, d)).toEqual(json(before));
  });

  it('row 3b: cleared from the sheet: the value is gone; the steps that read it ask again; Undo brings it back', () => {
    let { d, id } = start(feature(), 'R');
    d = typed(d, id, 'feature', 'login');
    d = walk(d, id, 'next');
    const before = d;
    d = ok(d, { kind: 'value', runId: id, name: 'feature', text: '' });
    expect(valuesOf(d, run(d, id))).toEqual([]);
    expect('values' in d.runs[id]).toBe(false);
    expect(seen(d, id, 'feature')).toBe('');
    expect(undone(before, d)).toEqual(json(before));
  });

  it('the same value again changes nothing (the very same data)', () => {
    let { d, id } = start(feature(), 'R');
    d = typed(d, id, 'feature', 'login');
    expect(go(d, { kind: 'value', runId: id, name: 'feature', text: 'login', item: 'pick' }).data).toBe(d);
  });
});

describe('moving keeps values in their round (rows 5, 6, 7, 8, 10)', () => {
  // (P-110, rewritten: was "the value stays (the step’s field shows it)"; the owner — moving the place back clears the
  // values given at or below it: Back onto the giving step clears its value, and it asks again there.)
  it('row 5: Back to the giving step: its value is cleared (the step asks again)', () => {
    let { d, id } = start(feature(), 'R');
    d = typed(d, id, 'feature', 'login');
    d = walk(d, id, 'next', 'back');
    expect(here(d, id)).toBe('pick');
    expect(seen(d, id, 'feature')).toBe('');
  });

  it('row 6: Jump to a step of the same round keeps it; Jump to the start of a level that resets its round clears what the repeating part gave', () => {
    const d0 = world(seq('R', 'R', [step('s', 'Setup >base'), step('pick', 'Pick >feature'), step('test', 'Test {feature} on {base}')], { repeatFrom: 1 }));
    let { d, id } = start(d0, 'R');
    d = typed(d, id, 'base', 'web');
    d = walk(d, id, 'next');
    d = typed(d, id, 'feature', 'login');
    d = walk(d, id, 'next');
    d = ok(d, { kind: 'jump', runId: id, to: { path: ['pick'] } });
    // (P-110, rewritten: was ['login', 'web'] — a Jump back onto the step that gives {feature} clears it; {base}, given above, stays.)
    expect([seen(d, id, 'feature'), seen(d, id, 'base')]).toEqual(['', 'web']);
    // Round 2, then the start of the level: round 1 again — a new time through the repeating part.
    d = walk(d, id, 'next', 'next');
    expect(run(d, id).frames[0].round).toBe(2);
    d = typed(d, id, 'feature', 'signup');
    d = ok(d, { kind: 'jump', runId: id, to: { level: 0 } });
    expect(run(d, id).frames[0].round).toBe(1);
    // (P-110, rewritten: was ['', 'web'] — the start of the level is "Setup", the step that gives {base}: moving the
    // place back onto it clears {base} too.)
    expect([seen(d, id, 'feature'), seen(d, id, 'base')]).toEqual(['', '']);
  });

  // P-98 (rewritten; was: what it gave goes with it): Step out of a call hands back what its row gives.
  it('row 7: Done on a routine entered as a step: what it gave is handed back, given by the call row; what the level below gave stays', () => {
    const d0 = world(
      seq('P', 'Practice', [step('a', 'Choose >subject'), ref('call', 'S'), step('z', 'Review {subject} and {ref}')]),
      seq('S', 'Sketch', [step('s1', 'Find >ref'), step('s2', 'Draw {subject} from {ref}')]),
    );
    let { d, id } = start(d0, 'P');
    d = typed(d, id, 'subject', 'hands');
    d = walk(d, id, 'next', 'stepIn');
    d = typed(d, id, 'ref', 'photo 1');
    d = walk(d, id, 'next');
    expect([seen(d, id, 'subject'), seen(d, id, 'ref')]).toEqual(['hands', 'photo 1']);
    const before = d;
    d = ok(d, { kind: 'done', runId: id });
    expect(here(d, id)).toBe('z');
    expect(entries(d, id)).toEqual(['0:subject=hands@a', '0:ref=photo 1@call']);
    expect([seen(d, id, 'subject'), seen(d, id, 'ref')]).toEqual(['hands', 'photo 1']);
    // Done's Undo (the whole record) brings them back.
    expect(undone(before, d)).toEqual(json(before));
  });

  // P-98 (rewritten; was: nothing left after it): Next off the end hands back too; a second call giving the name adds to it (one list).
  it('row 7: Next off the end of a routine entered as a step does the same; entered again it starts empty', () => {
    const d0 = world(seq('P', 'P', [ref('call', 'S'), step('b'), ref('again', 'S'), step('c')]), seq('S', 'S', [step('s1', 'Find >ref')]));
    let { d, id } = start(d0, 'P');
    d = walk(d, id, 'stepIn');
    d = typed(d, id, 'ref', 'one');
    d = walk(d, id, 'next');
    expect(here(d, id)).toBe('b');
    expect(entries(d, id)).toEqual(['0:ref=one@call']);
    d = walk(d, id, 'next', 'stepIn');
    expect(seen(d, id, 'ref')).toBe('');
    d = typed(d, id, 'ref', 'two');
    d = walk(d, id, 'next');
    expect(entries(d, id)).toEqual(['0:ref=one|two@call']);
  });

  it('row 6: a Jump into the same routine entered from another step is a new time through it (its values go); within the same one they stay', () => {
    const d0 = world(seq('P', 'P', [ref('c1', 'S'), ref('c2', 'S')]), seq('S', 'S', [step('s1', 'Find >ref'), step('s2', 'Use {ref}')]));
    let { d, id } = start(d0, 'P');
    d = walk(d, id, 'stepIn');
    d = typed(d, id, 'ref', 'one');
    const same = ok(d, { kind: 'jump', runId: id, to: { path: ['c1', 's2'] } });
    expect(seen(same, id, 'ref')).toBe('one');
    const other = ok(d, { kind: 'jump', runId: id, to: { path: ['c2', 's2'] } });
    expect(run(other, id).frames.map((f) => f.seq)).toEqual(['P', 'S']);
    expect([seen(other, id, 'ref'), entries(other, id)]).toEqual(['', []]);
  });

  it('a step broken down is part of the routine it is in: what a smaller step gives is read after it, by the routine’s later steps', () => {
    const d0 = world(seq('R', 'R', [ref('b', 'B'), step('z', 'Use {pick}')]), unnamed('B', 'Choose', [step('b1', 'Look'), step('b2', 'Pick one >pick')]));
    let { d, id } = start(d0, 'R');
    d = walk(d, id, 'stepIn', 'next');
    d = typed(d, id, 'pick', 'blue');
    expect(entries(d, id)).toEqual(['0:pick=blue@b2']);
    d = walk(d, id, 'next');
    expect(here(d, id)).toBe('z');
    expect(seen(d, id, 'pick')).toBe('blue');
  });

  it('row 8: the run ends (Next off the end, or Done at the top): its values stay on the ended record, untouched', () => {
    for (const how of ['next', 'done'] as const) {
      const d0 = world(seq('R', 'R', [step('pick', 'Pick >feature')]));
      let { d, id } = start(d0, 'R');
      d = typed(d, id, 'feature', 'login');
      const values = d.runs[id].values;
      d = walk(d, id, how);
      expect(run(d, id).endedAt).toBeDefined();
      expect(d.runs[id].values).toBe(values);
    }
  });

  it('row 10: starting the routine again starts empty (the ended run keeps its own)', () => {
    const d0 = world(seq('R', 'R', [step('pick', 'Pick >feature'), step('b', 'Test {feature}')]));
    let { d, id } = start(d0, 'R');
    d = typed(d, id, 'feature', 'login');
    d = ok(d, { kind: 'done', runId: id });
    const again = start(d, 'R');
    expect(again.id).not.toBe(id);
    expect(again.d.runs[again.id].values).toBeUndefined();
    expect(seen(again.d, again.id, 'feature')).toBe('');
    expect(entries(again.d, id)).toEqual(['0:feature=login@pick']);
  });

  it('Pause, Resume, Plan, the reason and Home never touch values', () => {
    let { d, id } = start(feature(), 'R');
    d = typed(d, id, 'feature', 'login');
    const values = d.runs[id].values;
    for (const v of [{ kind: 'pause', runId: id, reason: 'tea' }, { kind: 'reason', runId: id, text: 'later' }, { kind: 'resume', runId: id }, { kind: 'plan', runId: id }, { kind: 'resume', runId: id }, { kind: 'home', runId: id }] as Verb[]) {
      d = ok(d, v);
      expect(d.runs[id].values, v.kind).toBe(values);
    }
  });
});

describe('rounds (row 9, ruling 3)', () => {
  /** [Setup >base | pick >feature, test {feature} {base}] × 3 */
  const looped = () => world(seq('R', 'R', [step('s', 'Setup >base'), step('pick', 'Pick >feature'), step('test', 'Test {feature} on {base}')], { repeatFrom: 1, repeat: 3 }));

  it('a new round clears the values given at or after the divider (those steps ask again); values given before it stay', () => {
    let { d, id } = start(looped(), 'R');
    d = typed(d, id, 'base', 'web');
    d = walk(d, id, 'next');
    d = typed(d, id, 'feature', 'login');
    d = walk(d, id, 'next');
    expect(seen(d, id, 'feature')).toBe('login');
    d = walk(d, id, 'next');
    expect([here(d, id), run(d, id).frames[0].round]).toEqual(['pick', 2]);
    expect(entries(d, id)).toEqual(['0:base=web@s']);
    expect([seen(d, id, 'feature'), seen(d, id, 'base')]).toEqual(['', 'web']);
  });

  it('the divider at the very top: every value the routine gave is cleared each round', () => {
    const d0 = world(seq('R', 'R', [step('pick', 'Pick >feature'), step('test', 'Test {feature}')], { repeatFrom: 0 }));
    let { d, id } = start(d0, 'R');
    d = typed(d, id, 'feature', 'login');
    d = walk(d, id, 'next', 'next');
    expect(run(d, id).frames[0].round).toBe(2);
    expect(entries(d, id)).toEqual([]);
  });

  it('a value asked for in the repeating part is cleared too (the step that asked asks again)', () => {
    const d0 = world(seq('R', 'R', [step('s', 'Setup'), step('test', 'Test {feature}')], { repeatFrom: 1 }));
    let { d, id } = start(d0, 'R');
    d = walk(d, id, 'next');
    d = typed(d, id, 'feature', 'login');
    expect(entries(d, id)).toEqual(['0:feature=login@test']);
    d = walk(d, id, 'next');
    expect(run(d, id).frames[0].round).toBe(2);
    expect(entries(d, id)).toEqual([]);
  });

  it('a value given inside a step broken down in the repeating part is cleared with it; one given in the part before stays', () => {
    const d0 = world(seq('R', 'R', [ref('b0', 'B0'), ref('b1', 'B1'), step('z', '{a} {b}')], { repeatFrom: 1 }), unnamed('B0', 'Set up', [step('x', 'Get >a')]), unnamed('B1', 'Each', [step('y', 'Pick >b')]));
    let { d, id } = start(d0, 'R');
    d = walk(d, id, 'stepIn');
    d = typed(d, id, 'a', '1');
    d = walk(d, id, 'next', 'stepIn');
    d = typed(d, id, 'b', '2');
    d = walk(d, id, 'next');
    expect(seen(d, id, 'b')).toBe('2');
    d = walk(d, id, 'next');
    expect([here(d, id), run(d, id).frames[0].round]).toEqual(['b1', 2]);
    expect(entries(d, id)).toEqual(['0:a=1@x']);
  });

  it('a round of a step broken down that repeats on its own: what its repeating part gave is cleared (the values are its routine’s); what its first part gave stays', () => {
    const d0 = world(seq('R', 'R', [ref('b', 'B'), step('z', '{a} {b}')]), unnamed('B', 'Each', [step('x', 'Get >a'), step('y', 'Pick >b')], { repeatFrom: 1 }));
    let { d, id } = start(d0, 'R');
    d = walk(d, id, 'stepIn');
    d = typed(d, id, 'a', '1');
    d = walk(d, id, 'next');
    d = typed(d, id, 'b', '2');
    expect(entries(d, id)).toEqual(['0:a=1@x', '0:b=2@y']);
    d = walk(d, id, 'next');
    expect([here(d, id), run(d, id).frames[1].round]).toEqual(['y', 2]);
    expect(entries(d, id)).toEqual(['0:a=1@x']);
  });

  it('a round of an inner level: only what that level’s repeating part gave is cleared; what the level below gave stays', () => {
    const d0 = world(seq('P', 'P', [step('a', 'Choose >subject'), ref('call', 'S')]), seq('S', 'S', [step('s0', 'Once >tool'), step('s1', 'Find >ref'), step('s2', 'Draw {subject} {ref} {tool}')], { repeatFrom: 1 }));
    let { d, id } = start(d0, 'P');
    d = typed(d, id, 'subject', 'hands');
    d = walk(d, id, 'next', 'stepIn');
    d = typed(d, id, 'tool', 'pen');
    d = walk(d, id, 'next');
    d = typed(d, id, 'ref', 'photo 1');
    d = walk(d, id, 'next', 'next');
    expect(run(d, id).frames[1].round).toBe(2);
    expect(entries(d, id)).toEqual(['0:subject=hands@a', '1:tool=pen@s0']);
  });

  it('Back across a round boundary does not bring the old round’s values back', () => {
    let { d, id } = start(looped(), 'R');
    d = walk(d, id, 'next');
    d = typed(d, id, 'feature', 'login');
    d = walk(d, id, 'next', 'next', 'back');
    expect([here(d, id), run(d, id).frames[0].round]).toEqual(['test', 1]);
    expect(seen(d, id, 'feature')).toBe('');
  });
});

describe('scope: no collision, asks (ruling 2)', () => {
  /** Practice [Choose >subject, (Sketch), Review {subject}]; Sketch [Draw {subject} from {ref}, Find >ref, Draw {ref}] — it gives ref, reads subject. */
  const calls = (extra: Item[] = []) =>
    world(
      seq('P', 'Practice', [step('a', 'Choose >subject'), step('pr', 'Find a photo >ref'), ...extra, ref('call', 'S'), step('z', 'Review {subject} and {ref}')]),
      seq('S', 'Sketch', [step('s0', 'Draw {subject} from {ref}'), step('s1', 'Find >ref'), step('s2', 'Draw {ref}')]),
    );

  it('a routine reads a name it does not give from the level below it (passed in by name)', () => {
    let { d, id } = start(calls(), 'P');
    d = typed(d, id, 'subject', 'hands');
    d = walk(d, id, 'next');
    d = typed(d, id, 'ref', 'the parent’s photo');
    d = walk(d, id, 'next', 'stepIn');
    expect(seen(d, id, 'subject')).toBe('hands');
  });

  it('no collision: a name a routine gives is its own — never read from the level below, even before its giving step has run', () => {
    let { d, id } = start(calls(), 'P');
    d = typed(d, id, 'subject', 'hands');
    d = walk(d, id, 'next');
    d = typed(d, id, 'ref', 'the parent’s photo');
    d = walk(d, id, 'next', 'stepIn');
    // On Sketch's first step: it reads {ref} before its own "Find" has run — the parent's is NOT it.
    expect(here(d, id)).toBe('s0');
    expect(seen(d, id, 'ref')).toBe('');
  });

  // P-98 (rewritten; was: after it, the level below reads only its own): what the call hands back joins the caller's own under that name.
  it('no collision: what the routine gives never overwrites the level below’s; after it, the level below reads its own and what was handed back, as one list', () => {
    let { d, id } = start(calls(), 'P');
    d = typed(d, id, 'subject', 'hands');
    d = walk(d, id, 'next');
    d = typed(d, id, 'ref', 'mine');
    d = walk(d, id, 'next', 'stepIn', 'next');
    d = typed(d, id, 'ref', 'theirs');
    // (P-98: Sketch's input {subject} is its own copy, put there by the call.)
    expect(entries(d, id)).toEqual(['0:subject=hands@a', '0:ref=mine@pr', '1:subject=hands@call', '1:ref=theirs@s1']);
    d = walk(d, id, 'next');
    expect(seen(d, id, 'ref')).toBe('theirs');
    d = walk(d, id, 'next');
    expect(here(d, id)).toBe('z');
    expect(seen(d, id, 'ref')).toBe('mine and theirs');
  });

  it('asks: a step reading a name nothing above gives — the step asks; typed there it is that level’s value, from that step', () => {
    const d0 = world(seq('P', 'P', [ref('call', 'S')]), seq('S', 'S', [step('s0', 'Draw {subject}'), step('s1', 'Shade {subject}')]));
    let { d, id } = start(d0, 'P');
    d = walk(d, id, 'stepIn');
    expect(seen(d, id, 'subject')).toBe('');
    d = typed(d, id, 'subject', 'a pear');
    expect(valuesOf(d, run(d, id))).toEqual([expect.objectContaining({ name: 'subject', level: 1, seq: 'S', item: 's0', words: 'Draw {subject}' })]);
    d = walk(d, id, 'next');
    expect(seen(d, id, 'subject')).toBe('a pear');
  });

  // (P-110, rewritten: was "the reading step asks, and the giving step then shows it"; the owner — a value is asked only
  // at its giving step, never ahead: the reader does not ask, and the giving step does.)
  it('asks: a name the routine gives further down, read before it is given — the reading step does not ask; the giving step does', () => {
    const d0 = world(seq('R', 'R', [step('r', 'Plan {feature}'), step('g', 'Pick >feature')]));
    let { d, id } = start(d0, 'R');
    expect(go(d, { kind: 'value', runId: id, name: 'feature', text: 'login', item: 'r' }).reason).toBe('cannot');
    expect(entries(d, id)).toEqual([]);
    d = walk(d, id, 'next');
    d = typed(d, id, 'feature', 'signup');
    expect(entries(d, id)).toEqual(['0:feature=signup@g']);
  });

  it('a step reading a name that has a value does not ask: the value verb there changes that value (from the sheet, not the step)', () => {
    let { d, id } = start(feature(), 'R');
    d = typed(d, id, 'feature', 'login');
    d = walk(d, id, 'next');
    // At a reader: changing goes to the value where it lives, keeping where it came from.
    d = ok(d, { kind: 'value', runId: id, name: 'feature', text: 'signup', item: 'test' });
    expect(entries(d, id)).toEqual(['0:feature=signup@pick']);
  });

  // P-98 (rewritten; was: the outer level reads only its own after it): leaving the inner time through hands back its {x}.
  it('the same routine inside itself (recursion): each time through is its own level', () => {
    const d0 = world(seq('R', 'R', [step('g', 'Give >x'), ref('self', 'R'), step('u', 'Use {x}')]));
    let { d, id } = start(d0, 'R');
    d = typed(d, id, 'x', 'outer');
    d = walk(d, id, 'next', 'stepIn');
    expect(seen(d, id, 'x')).toBe('');
    d = typed(d, id, 'x', 'inner');
    expect(entries(d, id)).toEqual(['0:x=outer@g', '1:x=inner@g']);
    d = ok(d, { kind: 'done', runId: id });
    expect(seen(d, id, 'x')).toBe('outer and inner');
  });
});

describe('stale values (rows 18, 19)', () => {
  it('row 19: a value whose level is not there, or is another routine now, is never read, and goes at the next move', () => {
    let { d, id } = start(feature(), 'R');
    const ghost = (level: number, s: string) => ({ name: 'feature', items: ['ghost'], level, seq: s, item: 'pick', at: 'T' });
    d = stored(d, id, { values: [ghost(3, 'R'), ghost(0, 'OTHER')] });
    d = walk(d, id, 'next');
    expect(seen(d, id, 'feature')).toBe('');
    expect(d.runs[id].values).toBeUndefined();
  });

  it('row 18: a run whose routine is gone: nothing to read, nothing written', () => {
    let { d, id } = start(feature(), 'R');
    d = typed(d, id, 'feature', 'x');
    const { R: _gone, ...routines } = d.routines;
    const without = { ...d, routines };
    expect(go(without, { kind: 'value', runId: id, name: 'feature', text: 'y' })).toMatchObject({ ok: false, reason: 'gone', data: without });
  });
});

describe('Plan: Gives…, rename, remove (rows 11, 12, 14, 20; ruling 5)', () => {
  it('Gives…: a step gives a name (tidied); another name replaces it; none takes it away; words untouched', () => {
    let d = world(seq('R', 'R', [step('a', 'Select the subject matter'), step('b', 'Find photos of {subject}')]));
    d = okEdit(d, 'R', { kind: 'gives', item: 'a', name: '  Subject  ' });
    expect(d.routines.R.items).toEqual([{ id: 'a', text: 'Select the subject matter', out: 'Subject' }, { id: 'b', text: 'Find photos of {subject}' }]);
    d = okEdit(d, 'R', { kind: 'gives', item: 'a', name: 'topic' });
    expect((d.routines.R.items as Item[])[0]).toEqual({ id: 'a', text: 'Select the subject matter', out: 'topic' });
    const same = d;
    expect(edit(same, 'R', { kind: 'gives', item: 'a', name: 'topic' }).data).toBe(same);
    d = okEdit(d, 'R', { kind: 'gives', item: 'a' });
    expect((d.routines.R.items as Item[])[0]).toEqual({ id: 'a', text: 'Select the subject matter' });
  });

  it('Gives… is refused for a name that is not one, for a wait or a routine, and for a step that is not there', () => {
    const d = world(seq('R', 'R', [step('a'), { id: 'w', wait: 'w' }, ref('r', 'S')]), seq('S', 'S', [step('s')]));
    for (const name of ['', '  ', 'n'.repeat(41), 'a{b', 'a}b']) expect(edit(d, 'R', { kind: 'gives', item: 'a', name }), name).toMatchObject({ ok: false, data: d });
    expect(edit(d, 'R', { kind: 'gives', item: 'w', name: 'x' })).toMatchObject({ ok: false, reason: 'not-a-step' });
    expect(edit(d, 'R', { kind: 'gives', item: 'r', name: 'x' })).toMatchObject({ ok: false, reason: 'not-a-step' });
    expect(edit(d, 'R', { kind: 'gives', item: 'zz', name: 'x' })).toMatchObject({ ok: false, reason: 'no-such-step' });
  });

  it('row 20: Break it down on a giving step is refused (the value would vanish); without the name it is allowed', () => {
    let d = world(seq('R', 'R', [step('a', 'Pick >feature'), step('b')]));
    expect(edit(d, 'R', { kind: 'breakDown', item: 'a', steps: ['x', 'y'] })).toMatchObject({ ok: false, reason: 'cannot', data: d });
    d = okEdit(d, 'R', { kind: 'gives', item: 'a' });
    expect(edit(d, 'R', { kind: 'breakDown', item: 'a', steps: ['x'] }).ok).toBe(true);
  });

  it('reword, move, make a wait and back keep the name on the step (a wait gives nothing, but keeps it)', () => {
    let d = world(seq('R', 'R', [step('a', 'Pick >feature'), step('b')]));
    d = okEdit(d, 'R', { kind: 'reword', item: 'a', text: 'Choose' });
    d = okEdit(d, 'R', { kind: 'move', item: 'a', by: 1 });
    expect((d.routines.R.items as Item[])[1]).toEqual({ id: 'a', text: 'Choose', out: 'feature' });
    d = okEdit(d, 'R', { kind: 'toWait', item: 'a' });
    expect(outOf((d.routines.R.items as Item[])[1])).toBeUndefined();
    d = okEdit(d, 'R', { kind: 'toStep', item: 'a' });
    expect(outOf((d.routines.R.items as Item[])[1])).toBe('feature');
  });

  it('row 11: renaming a name renames it on the giving step, in every step that reads it in that routine (and its smaller steps), and in its open runs’ values — one write, one Undo', () => {
    const d0 = world(
      seq('R', 'R', [step('a', 'Pick >Feature'), step('b', 'Test {feature}, not {{feature}}'), ref('br', 'B'), { id: 'w', wait: 'a reply on {FEATURE}' }]),
      unnamed('B', 'Check', [step('b1', 'Check {feature}')]),
      seq('O', 'Other', [step('o', 'Read {feature}')]),
    );
    let { d, id } = start(d0, 'R');
    d = typed(d, id, 'feature', 'login');
    d = walk(d, id, 'next');
    const before = d;
    d = okEdit(d, 'R', { kind: 'renameValue', from: 'FEATURE', to: 'journey' });
    expect(d.routines.R.items).toEqual([{ id: 'a', text: 'Pick', out: 'journey' }, { id: 'b', text: 'Test {journey}, not {{feature}}' }, { id: 'br', ref: 'B' }, { id: 'w', wait: 'a reply on {journey}' }]);
    expect(d.routines.B.items).toEqual([{ id: 'b1', text: 'Check {journey}' }]);
    // Another routine's readers are not rewritten (they read it as unset and ask).
    expect(d.routines.O).toBe(before.routines.O);
    expect(entries(d, id)).toEqual(['0:journey=login@a']);
    expect(seen(d, id, 'journey')).toBe('login');
    expect(undone(before, d)).toEqual(json(before));
  });

  it('row 11: renaming to a name the routine already uses, to no name, or a name it does not use, is refused', () => {
    const d = world(seq('R', 'R', [step('a', 'Pick >feature'), step('b', 'Test {feature} {other}')]));
    expect(edit(d, 'R', { kind: 'renameValue', from: 'feature', to: 'Other' })).toMatchObject({ ok: false, reason: 'same-name', data: d });
    expect(edit(d, 'R', { kind: 'renameValue', from: 'feature', to: ' ' })).toMatchObject({ ok: false, data: d });
    expect(edit(d, 'R', { kind: 'renameValue', from: 'nothing', to: 'x' })).toMatchObject({ ok: false, reason: 'cannot', data: d });
    // Only its spelling: allowed.
    expect((okEdit(d, 'R', { kind: 'renameValue', from: 'feature', to: 'Feature' }).routines.R.items as Item[])[0]).toEqual({ id: 'a', text: 'Pick', out: 'Feature' });
  });

  it('row 12: removing the giving step keeps the run valid: the value stays the run’s (from the step’s words then), readers’ words are untouched; cleared, they ask', () => {
    const d0 = world(seq('R', 'R', [step('a', 'Pick a feature >feature'), step('b', 'Test {feature}'), step('c', 'Note {feature}')]));
    let { d, id } = start(d0, 'R');
    d = typed(d, id, 'feature', 'login');
    d = walk(d, id, 'next');
    const before = d;
    d = okEdit(d, 'R', { kind: 'remove', item: 'a' });
    expect(texts(d)).toEqual(['Test {feature}', 'Note {feature}']);
    expect(valuesOf(d, run(d, id))).toEqual([expect.objectContaining({ name: 'feature', items: ['login'], item: 'a', words: 'Pick a feature' })]);
    expect(seen(d, id, 'feature')).toBe('login');
    d = walk(d, id, 'next');
    expect(seen(d, id, 'feature')).toBe('login');
    d = ok(d, { kind: 'value', runId: id, name: 'feature', text: '' });
    expect(seen(d, id, 'feature')).toBe('');
    expect(undone(before, okEdit(before, 'R', { kind: 'remove', item: 'a' }))).toEqual(json(before));
  });

  it('removing a step the run is inside (a routine entered from it) takes that level’s values with it', () => {
    const d0 = world(seq('P', 'P', [ref('call', 'S'), step('b')]), seq('S', 'S', [step('s1', 'Find >ref'), step('s2')]));
    let { d, id } = start(d0, 'P');
    d = walk(d, id, 'stepIn');
    d = typed(d, id, 'ref', 'one');
    d = okEdit(d, 'P', { kind: 'remove', item: 'call' });
    expect(here(d, id)).toBe('b');
    expect(entries(d, id)).toEqual([]);
  });

  it('row 14: Plan opened on a run with this-run changes from the build before folds them and leaves its values exactly as they were', () => {
    let { d, id } = start(feature(), 'R');
    d = typed(d, id, 'feature', 'login');
    d = stored(d, id, { changes: [{ id: 'c1', seq: 'R', kind: 'reword', item: 'test', text: 'Test {feature} well' }] });
    const values = d.runs[id].values;
    const r = go(d, { kind: 'plan', runId: id });
    expect(r.folded).toBe('Feature loop');
    expect(r.data.runs[id].values).toBe(values);
    expect((r.data.routines.R.items as Item[])[0]).toEqual({ id: 'pick', text: 'Pick a feature', out: 'feature' });
  });
});

const texts = (d: Data) => (d.routines.R.items as { text?: string }[]).map((i) => i.text);

describe('finishing (ruling 7)', () => {
  it('Next on the last step of an open goal ends the run (said: ended) — it never opens Plan', () => {
    const d0 = world(seq('R', 'Learn guitar', [step('a'), step('b')], { open: true }));
    let { d, id } = start(d0, 'R');
    d = walk(d, id, 'next');
    const r = go(d, { kind: 'next', runId: id });
    expect(r.said).toEqual({ kind: 'ended', name: 'Learn guitar' });
    expect(run(r.data, id)).toMatchObject({ endedAt: expect.any(String), endedBy: 'finished' });
    expect(r.data.runs[id].mode).toBeUndefined();
  });

  it('Done on a routine entered as the last step of an open goal ends the whole run too', () => {
    const d0 = world(seq('R', 'R', [step('a'), ref('call', 'S')], { open: true }), seq('S', 'S', [step('s1'), step('s2')]));
    let { d, id } = start(d0, 'R');
    d = walk(d, id, 'next', 'stepIn');
    const r = go(d, { kind: 'done', runId: id });
    expect(r.said?.kind).toBe('ended');
    expect(run(r.data, id).endedAt).toBeDefined();
  });

  it('a run already at the edge (the build before left it there) stays in Plan, as before', () => {
    const d0 = world(seq('R', 'R', [step('a')], { open: true }));
    let { d, id } = start(d0, 'R');
    d = stored(d, id, { frames: [{ seq: 'R', at: null, round: 1 }], status: 'paused', mode: 'plan' });
    expect(go(d, { kind: 'next', runId: id }).reason).toBe('asking');
    expect(ok(d, { kind: 'done', runId: id }) && go(d, { kind: 'done', runId: id }).said?.kind).toBe('ended');
  });
});
