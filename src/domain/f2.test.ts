/**
 * F-2 (the final review's surfaces audit, `.polish/product/final-audit-surfaces.md`): the domain half. Expected values come
 * from the roadmap's *Done when* and the audit's findings, never from running the code.
 * - F2: B-17 "One version per name": a template copied under a name the copy would bring is refused (`same-name`).
 * - F3: a copy that uses the person's own routine of a name says so ("uses your “X”").
 * - F4: a for each's own kept list is the routine's, never read as an input ("asks {topics}").
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { copiedWords, copyAndAdd, copyFromLibrary, library, usesYour } from './library';
import { LIBRARY_DEFS, Line } from './libraryContent';
import { callIO, Env, Item, routineNamed } from './run';
import { Data, emptyData, Routine } from './types';

const T0 = Date.UTC(2026, 10, 28, 12, 0, 0);
let n = 0;
beforeEach(() => {
  n = 0;
});
const env = (): Env => ({ now: new Date(T0 + 1000 * n).toISOString(), id: () => `x${++n}` });
const routine = (id: string, words: string, items: Item[] = []): Routine => ({ id, words, named: true, createdAt: '2026-11-01T00:00:00.000Z', items, open: true, home: true });
const mine = (...ss: Routine[]): Data => ({ ...emptyData(), routines: Object.fromEntries(ss.map((s) => [s.id, s])) });
const notice = (c: Parameters<typeof copiedWords>[0]) => copiedWords(c) + usesYour(c);
const countNamed = (d: Data, words: string) => Object.values(d.routines).filter((r) => r.named && r.words.toLowerCase() === words.toLowerCase()).length;

describe('F2: a template copied under the name of a routine it calls is refused, as a name in use is', () => {
  for (const [id, words] of [
    ['lib-learn', 'Practise at the edge'],
    ['lib-learn', '  practise AT the edge '],
    ['lib-make', 'Check and mend'],
    ['lib-find-out', 'Check a source'],
    ['lib-decide', 'Choose'],
  ]) {
    it(`${id} as “${words.trim()}”: same-name, nothing written`, () => {
      const d = emptyData();
      const c = copyFromLibrary(d, id, env(), { words });
      expect(c).toMatchObject({ ok: false, reason: 'same-name' });
      expect(c.data).toBe(d);
    });
  }

  it('a name nothing in it uses is copied, once per name', () => {
    const c = copyFromLibrary(emptyData(), 'lib-learn', env(), { words: 'Learn guitar' });
    expect(c.ok).toBe(true);
    expect(countNamed(c.data, 'Practise at the edge')).toBe(1);
    expect(countNamed(c.data, 'Learn guitar')).toBe(1);
  });

  it('Copy and add of a method is refused the same way when it would make two of a name (it never can: the method is named as shipped)', () => {
    const d = mine(routine('s', 'Study'));
    const c = copyAndAdd(d, 'lib-recall', 's', undefined, env());
    expect(c.ok).toBe(true);
    expect(countNamed(c.data, 'Check and mend')).toBe(1);
  });
});

describe('F3: a copy that uses the person’s own routine of a name says so', () => {
  it('Copy: “uses your “Check and mend””', () => {
    const d = mine(routine('own', 'Check and mend', [{ id: 's', text: 'Wash the car' }]));
    const c = copyFromLibrary(d, 'lib-recall', env());
    expect(c.ok).toBe(true);
    expect(c.used).toEqual(['Check and mend']);
    expect(notice(c)).toBe('Copied “Recall before you look”, which uses your “Check and mend”');
  });

  it('two of theirs, and more made: both named, after “and what it calls”', () => {
    const d = mine(routine('a', 'Gather options'), routine('b', 'Choose'));
    const c = copyFromLibrary(d, 'lib-decide', env(), { words: 'Make a decision' });
    expect(c.ok).toBe(true);
    expect(c.used).toEqual(['Gather options', 'Choose']);
    expect(notice(c)).toBe('Copied “Make a decision” and what it calls, which uses your “Gather options” and “Choose”');
  });

  it('nothing of theirs used: the notice is as before', () => {
    const c = copyFromLibrary(emptyData(), 'lib-recall', env());
    expect(c.used ?? []).toEqual([]);
    expect(notice(c)).toBe('Copied “Recall before you look” and what it calls');
  });

  it('Copy and add carries what it used', () => {
    const d = mine(routine('s', 'Study'), routine('own', 'Check and mend'));
    const c = copyAndAdd(d, 'lib-recall', 's', undefined, env());
    expect(c.ok).toBe(true);
    expect(c.used).toEqual(['Check and mend']);
  });
});

describe('F4: a for each’s own kept list is not read as an input', () => {
  it('“Learn ▢” copied asks nothing: {topics}, {parts} and {pieces} are its own kept lists', () => {
    const c = copyFromLibrary(emptyData(), 'lib-learn', env(), { words: 'Learn guitar' });
    expect(callIO(c.data, c.routineId!).asks).toEqual([]);
    expect(callIO(library().data, 'lib-learn').asks).toEqual([]);
  });

  it('a person’s own routine: a for each reading a list from outside still asks it; one with a kept list does not', () => {
    const d: Data = {
      ...emptyData(),
      routines: {
        R: routine('R', 'Sort photos', [{ id: 'row', ref: 'E' } as Item, { id: 'row2', ref: 'F' } as Item]),
        E: { id: 'E', words: 'For each photo', named: false, createdAt: '2026-11-01T00:00:00.000Z', items: [{ id: 'a', text: 'Look at {photo}' }], each: { item: 'photo', list: 'photos' } } as Routine,
        F: { id: 'F', words: 'For each tag', named: false, createdAt: '2026-11-01T00:00:00.000Z', items: [{ id: 'b', text: 'Tag {tag}' }], each: { item: 'tag', list: 'tags', kept: ['red'] } } as Routine,
      },
    };
    expect(callIO(d, 'R').asks).toEqual(['photos']);
    expect(routineNamed(d, 'Sort photos')?.id).toBe('R');
  });
});

describe('F16: a library step carries one job — none runs past about two lines at 390 px', () => {
  it('every step’s words (less what it gives) are at most 81 characters', () => {
    const long: string[] = [];
    const walk = (ls: Line[]) => {
      for (const l of ls) {
        if (typeof l === 'string') {
          const words = l.replace(/\s*>\s*\S+$/, '');
          if (words.length > 81) long.push(`${words.length}: ${words}`);
        } else if ('each' in l) walk(l.steps);
        else if ('any' in l) for (const p of l.any) walk(p.steps);
      }
    };
    for (const d of LIBRARY_DEFS) walk(d.steps);
    expect(long).toEqual([]);
  });
});
