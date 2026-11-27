/**
 * P-96 part 2: the two pieces of words the screens need that part 1 left to them — the names Plan's bar
 * above the keyboard offers to the field being typed in (ruling 5: names given ABOVE it, in its own
 * routine), and the value sheet's provenance line (ruling 6: "from <step> · <routine if not this one> ·
 * <when>"). Expected values come from the contract and B-15 journeys 2 and 4.
 */
import { describe, expect, it } from 'vitest';

import { Item } from './run';
import { namesOffered, planView, valueFrom, whenWords } from './runView';
import { Data, emptyData, Routine } from './types';

const step = (id: string, text = id): Item => {
  const m = /^(.*?)\s*>(\S.*)$/.exec(text);
  return m ? ({ id, text: m[1], out: m[2] } as Item) : { id, text };
};
const ref = (id: string, to: string): Item => ({ id, ref: to });
const seq = (id: string, words: string, items: Item[], extra: Record<string, unknown> = {}): Routine => ({ id, words, named: true, createdAt: '2026-11-01T00:00:00.000Z', home: true, items, ...extra });
const world = (...ss: Routine[]): Data => ({ ...emptyData(), routines: Object.fromEntries(ss.map((s) => [s.id, s])) });

describe('the bar above the keyboard (ruling 5, journey 2): names given above the field typed in, in its routine', () => {
  const d = world(
    seq('D', 'Drawing practice', [step('sel', 'Select the subject matter >subject'), ref('b', 'B'), step('find', 'Find photos of {subject}'), ref('call', 'S'), step('last', 'Rank them >rank')]),
    seq('B', 'Get ready', [step('b1', 'Pick a pencil >tool')], { named: false }),
    seq('S', 'Sketch', [step('s1', 'Draw {subject}'), step('s2', 'Look >ref'), step('s3', 'Compare')]),
  );
  const rows = planView(d, { routineId: 'D' })!.rows;
  const at = (id: string) => rows.findIndex((r) => r.itemId === id);

  it('changing a step’s words: what is given above it — never its own name, never a name given below', () => {
    expect(namesOffered(rows, { mode: 'words', index: at('sel') })).toEqual([]);
    expect(namesOffered(rows, { mode: 'words', index: at('find') })).toEqual(['subject', 'tool']);
    // P-98 (rewritten; was ['subject', 'tool']): the call above hands back what Sketch gives, {ref}.
    expect(namesOffered(rows, { mode: 'words', index: at('last') })).toEqual(['subject', 'tool', 'ref']);
  });

  it('a step added after a row: that row’s own name and its smaller steps’ too; a named routine’s names stay its own', () => {
    expect(namesOffered(rows, { mode: 'after', index: at('sel') })).toEqual(['subject']);
    expect(namesOffered(rows, { mode: 'after', index: at('b') })).toEqual(['subject', 'tool']);
    // P-98 (rewritten; was: Sketch's {ref} stays Sketch's): the call row gives what Sketch gives — handed back, it is offered after it.
    expect(namesOffered(rows, { mode: 'after', index: at('call') })).toEqual(['subject', 'tool', 'ref']);
    // Inside Sketch: only what Sketch gives above (it reads {subject} from outside, but gives only {ref}).
    expect(namesOffered(rows, { mode: 'after', index: at('s2') })).toEqual(['ref']);
    expect(namesOffered(rows, { mode: 'words', index: at('s3') })).toEqual(['ref']);
  });

  it('a smaller step typed into a row: what is given above the row (and inside it)', () => {
    expect(namesOffered(rows, { mode: 'into', index: at('find') })).toEqual(['subject', 'tool']);
  });

  it('"Add a step" at the end: every name the routine gives, in order', () => {
    // P-98 (rewritten; was without 'ref'): the call's {ref}, in its place.
    expect(namesOffered(rows, { mode: 'end' })).toEqual(['subject', 'tool', 'ref', 'rank']);
    expect(namesOffered([], { mode: 'end' })).toEqual([]);
  });

  it('a name given twice is offered once', () => {
    const twice = planView(world(seq('D', 'D', [step('a', 'A >x'), step('b', 'B >X'), step('c', 'C')])), { routineId: 'D' })!.rows;
    expect(namesOffered(twice, { mode: 'end' })).toEqual(['x']);
  });
});

describe('the value sheet’s provenance (ruling 6, journey 4)', () => {
  const now = new Date(2026, 10, 26, 15, 30);
  it('when, in words: today with the time; another day by its name or date, with the time', () => {
    expect(whenWords(new Date(2026, 10, 26, 9, 2).toISOString(), now)).toBe('today 9:02');
    expect(whenWords(new Date(2026, 10, 25, 21, 45).toISOString(), now)).toBe('yesterday 21:45');
    expect(whenWords(new Date(2026, 10, 3, 8, 0).toISOString(), now)).toBe('3 November 8:00');
    expect(whenWords('', now)).toBe('');
    expect(whenWords('not a date', now)).toBe('');
  });

  it('"from <step> · <routine if not this one> · <when>"; a part that is not known is left out', () => {
    const at = new Date(2026, 10, 26, 9, 2).toISOString();
    expect(valueFrom({ from: 'Select the subject matter', at }, now)).toBe('from Select the subject matter · today 9:02');
    expect(valueFrom({ from: 'Select the subject matter', routine: 'Drawing practice', at }, now)).toBe('from Select the subject matter · Drawing practice · today 9:02');
    expect(valueFrom({ from: '', at }, now)).toBe('from today 9:02');
    expect(valueFrom({ from: 'Pick', at: '' }, now)).toBe('from Pick');
  });
});
