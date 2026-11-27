/**
 * P-97: My routines (A–Z, Find, tags) and home in motion (Ongoing / Finishing). Expected values come from the
 * roadmap item's Done when and the batch's rulings (tags: trimmed, no "#" stored, compared without case; A–Z
 * with letter headings; Ongoing = an "until I'm done" repeat at the routine's top level; home shows runs going
 * only), never from this code's output.
 */
import { describe, expect, it } from 'vitest';

import { editRoutine, Env, Item, runVerb, Verb } from './run';
import { addTags, allTags, findRows, hasNoEnd, homeGroups, letterOf, myRoutines, routineSections, tagKey, tagsOf, tagsWritable, tidyTag } from './routines';
import { Data, emptyData, Id, Routine } from './types';

let n = 0;
const env = (): Env => ({ now: new Date(Date.UTC(2026, 10, 27, 10, 0, n)).toISOString(), id: () => `x${++n}` });
const ok = (d: Data, verb: Verb) => {
  const r = runVerb(d, verb, env());
  expect(r.ok, `${JSON.stringify(verb)} refused: ${r.reason}`).toBe(true);
  return r;
};
const step = (id: string, text = id, out?: string): Item => ({ id, text, ...(out && { out }) });
const ref = (id: string, to: string): Item => ({ id, ref: to });
const seq = (id: string, words: string, items: Item[], extra: Record<string, unknown> = {}): Routine => ({ id, words, named: true, createdAt: `2026-11-01T00:00:${String(id.length).padStart(2, '0')}.000Z`, items, home: true, ...extra });
const world = (...ss: Routine[]): Data => ({ ...emptyData(), routines: Object.fromEntries(ss.map((s) => [s.id, s])) });
const start = (d: Data, routineId: Id) => {
  const r = ok(d, { kind: 'start', routineId });
  return { d: r.data, id: r.runId! };
};

describe('tags: typed on a routine, trimmed, no "#" stored, compared without case', () => {
  it('a tag is tidied: spaces trimmed and joined, the leading "#"s dropped; nothing left is no tag', () => {
    expect(tidyTag('  #Drawing ')).toBe('Drawing');
    expect(tidyTag('##deep   work')).toBe('deep work');
    expect(tidyTag(' # ')).toBe('');
    expect(tidyTag('')).toBe('');
    expect(tagKey('Drawing')).toBe(tagKey('#drawing '));
  });

  it('typing: a comma makes a chip of each part; one already there (in any case) is not added twice; blanks are dropped', () => {
    expect(addTags([], 'drawing, #Game,, ')).toEqual(['drawing', 'Game']);
    expect(addTags(['drawing'], 'DRAWING, music')).toEqual(['drawing', 'music']);
    expect(addTags(['a'], '   ')).toEqual(['a']);
  });

  it('read tolerantly from a routine’s body: missing, not a list or holding junk reads as none or what is good in it', () => {
    expect(tagsOf(undefined)).toEqual([]);
    expect(tagsOf('drawing')).toEqual([]);
    expect(tagsOf({ 0: 'x' })).toEqual([]);
    expect(tagsOf(['drawing', 3, null, '#Game', ' ', 'Drawing', { t: 'x' }])).toEqual(['drawing', 'Game']);
  });

  it('the engine keeps them on the routine (one edit, tidied; none at all removes the field) and leaves every other field as it was', () => {
    const d = world(seq('r', 'Draw', [step('a')], { future: { kept: true } }));
    const put = editRoutine(d, 'r', { kind: 'tags', tags: ['#drawing ', 'Drawing', 'game'] }, env());
    expect(put.ok).toBe(true);
    expect(put.data.routines.r).toEqual({ ...d.routines.r, tags: ['drawing', 'game'] });
    const none = editRoutine(put.data, 'r', { kind: 'tags', tags: [] }, env());
    expect(none.data.routines.r).toEqual(d.routines.r);
    expect('tags' in none.data.routines.r).toBe(false);
    // The same tags again writes nothing.
    expect(editRoutine(put.data, 'r', { kind: 'tags', tags: ['drawing', 'game'] }, env()).data).toBe(put.data);
    expect(editRoutine(d, 'nope', { kind: 'tags', tags: ['x'] }, env()).ok).toBe(false);
  });
});

describe('My routines: every named routine, A–Z, with letter headings', () => {
  const d = () =>
    world(
      seq('z', 'zine issue', [step('z1')]),
      seq('e', 'Écrire un poème', [step('e1')]),
      seq('a', 'apple pie', [step('a1')]),
      seq('b', 'Bake bread', [step('b1')]),
      seq('ec', 'Éclair practice', []),
      seq('A', 'Apply to Acme', [step('A1')]),
      seq('n', '3 things', [step('n1')]),
      seq('u', 'boil the pasta', [step('u1')], { named: false }), // a step broken down: not listed
      seq('g', 'Gone', [step('g1')], { removedAt: '2026-11-20T00:00:00.000Z' }), // removed: not listed
      seq('p', 'Proofread', [step('p1')], { home: false }), // used inside another, never on home: listed
    );

  it('sorted A–Z by letter alone: case and accents do not move a name (É with E, a with A)', () => {
    expect(myRoutines(d()).map((r) => r.name)).toEqual(['3 things', 'apple pie', 'Apply to Acme', 'Bake bread', 'Éclair practice', 'Écrire un poème', 'Proofread', 'zine issue']);
  });

  it('the headings: each name’s first letter, without its accent, in capitals; anything else under "#"', () => {
    expect(letterOf('Écrire')).toBe('E');
    expect(letterOf('apple')).toBe('A');
    expect(letterOf('  zine')).toBe('Z');
    expect(letterOf('3 things')).toBe('#');
    expect(routineSections(myRoutines(d())).map((s) => [s.letter, s.rows.map((r) => r.name)])).toEqual([
      ['#', ['3 things']],
      ['A', ['apple pie', 'Apply to Acme']],
      ['B', ['Bake bread']],
      ['E', ['Éclair practice', 'Écrire un poème']],
      ['P', ['Proofread']],
      ['Z', ['zine issue']],
    ]);
  });

  it('each row: its colour, its tags, what it gives and what it asks (its steps broken down included), whether it has steps', () => {
    const data = world(
      seq('draw', 'Drawing practice', [step('s', 'Select the subject', 'subject'), ref('b', 'brk'), step('r', 'Draw {subject} from {reference} with {tool}')], { tags: ['drawing', 'Art'] }),
      seq('brk', 'Get ready', [step('t', 'Pick a pencil', 'tool')], { named: false }),
      seq('empty', 'Empty one', []),
    );
    const [draw, empty] = myRoutines(data);
    expect(draw).toMatchObject({ routineId: 'draw', name: 'Drawing practice', tags: ['drawing', 'Art'], gives: ['subject', 'tool'], asks: ['reference'] });
    expect(typeof draw.hue).toBe('number');
    expect(draw.empty).toBeUndefined();
    expect(empty).toMatchObject({ routineId: 'empty', tags: [], gives: [], asks: [], empty: true });
  });

  it('a routine with a run going says so (its run, and whether it is the one running)', () => {
    const s = start(world(seq('a', 'Alpha', [step('a1')]), seq('b', 'Beta', [step('b1')])), 'a');
    const rows = myRoutines(s.d);
    expect(rows[0]).toMatchObject({ routineId: 'a', runId: s.id, running: true });
    expect(rows[1].runId).toBeUndefined();
  });
});

describe('My routines: Find and tags filter', () => {
  const d = () =>
    world(
      seq('a', 'Drawing practice', [step('a1')], { tags: ['drawing', 'daily'] }),
      seq('b', 'Gesture drawing', [step('b1')], { tags: ['Drawing'] }),
      seq('c', 'Make a game', [step('c1')], { tags: ['game', 'daily'] }),
      seq('d', 'Café visit', [step('d1')]),
    );

  it('the tags offered: every tag on a listed routine, once (without case), A–Z', () => {
    expect(allTags(myRoutines(d()))).toEqual(['daily', 'drawing', 'game']);
  });

  it('one tag chosen: the routines carrying it (without case); two: only those carrying both', () => {
    const rows = myRoutines(d());
    expect(findRows(rows, '', ['DRAWING']).map((r) => r.name)).toEqual(['Drawing practice', 'Gesture drawing']);
    expect(findRows(rows, '', ['drawing', 'daily']).map((r) => r.name)).toEqual(['Drawing practice']);
    expect(findRows(rows, '', ['drawing', 'game'])).toEqual([]);
  });

  it('Find: part of a name or a tag, without case or accents; with tags chosen too, both must hold; blank finds all', () => {
    const rows = myRoutines(d());
    expect(findRows(rows, '  ', []).length).toBe(4);
    expect(findRows(rows, 'GESTURE', []).map((r) => r.name)).toEqual(['Gesture drawing']);
    expect(findRows(rows, 'cafe', []).map((r) => r.name)).toEqual(['Café visit']);
    expect(findRows(rows, '#game', []).map((r) => r.name)).toEqual(['Make a game']);
    expect(findRows(rows, 'dai', []).map((r) => r.name)).toEqual(['Drawing practice', 'Make a game']);
    expect(findRows(rows, 'make', ['daily']).map((r) => r.name)).toEqual(['Make a game']);
    expect(findRows(rows, 'zzz', [])).toEqual([]);
  });
});

describe('home: only what is in motion, Ongoing (no end) and Finishing (an end)', () => {
  it('no end: an "until I’m done" repeat at the top level; a counted repeat, none, or one only inside a step broken down or a routine used as a step has an end', () => {
    expect(hasNoEnd(seq('a', 'A', [step('1'), step('2')], { repeatFrom: 0 }))).toBe(true);
    expect(hasNoEnd(seq('a', 'A', [step('1'), step('2')], { repeatFrom: 1 }))).toBe(true);
    expect(hasNoEnd(seq('a', 'A', [step('1')], { repeatFrom: 0, repeat: 3 }))).toBe(false);
    expect(hasNoEnd(seq('a', 'A', [step('1')]))).toBe(false);
    // A divider past the last step is no divider (nothing repeats).
    expect(hasNoEnd(seq('a', 'A', [step('1')], { repeatFrom: 5 }))).toBe(false);
    const nested = world(seq('top', 'Top', [ref('x', 'inner'), step('t2')]), seq('inner', 'Inner', [step('i1')], { repeatFrom: 0, named: false }));
    expect(homeGroups(start(nested, 'top').d).finishing.map((t) => t.name)).toEqual(['Top']);
  });

  it('nothing going: home is empty, whatever routines there are (they are on My routines); the "home" flag does not keep one there', () => {
    const d = world(seq('a', 'Alpha', [step('a1')], { home: true }), seq('b', 'Beta', [step('b1')], { repeatFrom: 0 }));
    expect(homeGroups(d)).toEqual({ ongoing: [], finishing: [] });
    expect(homeGroups(emptyData())).toEqual({ ongoing: [], finishing: [] });
  });

  it('runs going — running, paused, waiting — each in its group, in the order they were started; an ended run is not there', () => {
    let d = world(
      seq('draw', 'Draw every day', [step('d1'), step('d2')], { repeatFrom: 0 }),
      seq('apply', 'Apply to Acme', [step('a1'), { id: 'w', wait: 'a reply' }, step('a3')]),
      seq('zine', 'Zine', [step('z1')], { repeatFrom: 0, repeat: 4 }),
      seq('tea', 'Make tea', [step('t1')]),
      seq('idle', 'Never started', [step('i1')], { repeatFrom: 0 }),
    );
    const a = start(d, 'apply');
    d = ok(ok(a.d, { kind: 'next', runId: a.id }).data, { kind: 'pause', runId: a.id }).data; // waiting
    const z = start(d, 'zine');
    d = ok(z.d, { kind: 'pause', runId: z.id }).data; // paused
    const t = start(d, 'tea');
    d = ok(t.d, { kind: 'done', runId: t.id }).data; // ended
    const w = start(d, 'draw');
    d = w.d; // running
    const g = homeGroups(d);
    expect(g.ongoing.map((x) => [x.name, x.state])).toEqual([['Draw every day', 'running']]);
    expect(g.finishing.map((x) => [x.name, x.state])).toEqual([
      ['Apply to Acme', 'waiting'],
      ['Zine', 'paused'],
    ]);
    // Each keeps its tile: where it is, its run, the "last" mark.
    expect(g.ongoing[0]).toMatchObject({ runId: w.id, at: 'd1', current: true, action: 'resume' });
  });

  it('a removed routine whose run is still going stays on home until that run ends', () => {
    const s = start(world(seq('a', 'Alpha', [step('a1')])), 'a');
    const paused = ok(s.d, { kind: 'pause', runId: s.id }).data;
    const removed: Data = { ...paused, routines: { a: { ...paused.routines.a, removedAt: '2026-11-27T00:00:00.000Z' } } };
    expect(homeGroups(removed).finishing.map((x) => x.name)).toEqual(['Alpha']);
    expect(myRoutines(removed)).toEqual([]);
  });
});

describe('the tags edit, named for its Undo', () => {
  it('“Changed the tags of “<name>”” (the routine menu’s Undo reads it)', async () => {
    const { whatChanged } = await import('./runView');
    expect(whatChanged(world(seq('r', 'Draw', [step('a')])), { kind: 'editRoutine', routineId: 'r', edit: { kind: 'tags', tags: ['x'] } })).toBe('Changed the tags of “Draw”');
  });
});

describe('fixes after the audit (P-97 F1, F4, F5)', () => {
  const FOLDS = ['Ad copy', 'Æble cake', 'Af plan', 'Oak walk', 'Øresund ride', 'Owl watch', 'Łódź trip', 'Lake', 'Straße', 'Sun', 'Đak', 'Dog', 'Þing', 'Tea', 'Œuvre', 'Oat'];
  const d = () => world(...FOLDS.map((name, i) => seq(`r${String(i).padStart(2, '0')}`, name, [step(`s${i}`)])));

  it('F1: letters that do not split into a letter and an accent (Æ Ø Ł ß Đ Þ Œ) sort and head with their base letter — each heading once, in order', () => {
    const rows = myRoutines(d());
    expect(rows.map((r) => r.name)).toEqual(['Ad copy', 'Æble cake', 'Af plan', 'Đak', 'Dog', 'Lake', 'Łódź trip', 'Oak walk', 'Oat', 'Œuvre', 'Øresund ride', 'Owl watch', 'Straße', 'Sun', 'Tea', 'Þing']);
    expect(routineSections(rows).map((s) => [s.letter, s.rows.length])).toEqual([
      ['A', 3],
      ['D', 2],
      ['L', 2],
      ['O', 5],
      ['S', 2],
      ['T', 2],
    ]);
    for (const [name, letter] of [['Æble', 'A'], ['Øresund', 'O'], ['Łódź', 'L'], ['ßig', 'S'], ['Đak', 'D'], ['Þing', 'T'], ['Œuvre', 'O']]) expect(letterOf(name), name).toBe(letter);
  });

  it('F1: Find folds them too — "o" finds Øresund, "strasse" finds Straße, "aeble" finds Æble', () => {
    const rows = myRoutines(d());
    expect(findRows(rows, 'resund', []).map((r) => r.name)).toEqual(['Øresund ride']);
    expect(findRows(rows, 'ore', []).map((r) => r.name)).toEqual(['Øresund ride']);
    expect(findRows(rows, 'strasse', []).map((r) => r.name)).toEqual(['Straße']);
    expect(findRows(rows, 'aeble', []).map((r) => r.name)).toEqual(['Æble cake']);
    expect(findRows(rows, 'lodz', []).map((r) => r.name)).toEqual(['Łódź trip']);
  });

  it('F4: tags stored in a shape this version cannot read are never overwritten — Keep is refused and the field is left as it was', () => {
    const later = [{ name: 'drawing', colour: 'red' }];
    const data = world(seq('r', 'Draw', [step('a')], { tags: later }), seq('m', 'Mixed', [step('b')], { tags: ['ok', 7] }), seq('s', 'Plain', [step('c')], { tags: 'drawing' }));
    for (const id of ['r', 'm', 's']) {
      const r = editRoutine(data, id, { kind: 'tags', tags: ['new'] }, env());
      expect(r.ok, id).toBe(false);
      expect(r.data, id).toBe(data);
    }
    expect(tagsWritable(later)).toBe(false);
    expect(tagsWritable(undefined)).toBe(true);
    expect(tagsWritable(['a', 'b'])).toBe(true);
    expect(myRoutines(data).find((x) => x.routineId === 'r')).toMatchObject({ tags: [], tagsLocked: true });
  });

  it('F5: a row says when its routine has a run going — running, paused or waiting, where it is', () => {
    let data = world(seq('a', 'Alpha', [step('a1', 'Boil water')]), seq('b', 'Beta', [step('b1', 'Send it'), { id: 'w', wait: 'a reply' }]), seq('c', 'Gamma', [step('c1')]));
    const b = start(data, 'b');
    data = ok(ok(b.d, { kind: 'next', runId: b.id }).data, { kind: 'pause', runId: b.id }).data;
    const a = start(data, 'a');
    const rows = myRoutines(a.d);
    expect(rows.map((r) => [r.name, r.going])).toEqual([
      ['Alpha', 'running, at Boil water'],
      ['Beta', expect.stringMatching(/^waiting for a reply/)],
      ['Gamma', undefined],
    ]);
    const p = ok(a.d, { kind: 'pause', runId: a.id }).data;
    expect(myRoutines(p)[0].going).toBe('paused at Boil water');
  });
});
