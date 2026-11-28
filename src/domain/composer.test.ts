/**
 * P-114 (B-19 slice 1): the composer's domain — the starts, the mark, and what each answer does to the routine. One test
 * (or more) per *Done when* line that the domain decides; the screens' lines are in e2e/go-composer.spec.ts. Expected
 * values come from B-19 (journeys 1, 2, 2a, 4, 5) and the library's own words — never from running the code.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { fromBackup, toBackup } from './backup';
import { addedWords, beginCompose, composeAnswer, linesOf, markStart, STARTS, startOf, StartKey } from './composer';
import { cancelDraft, draftData, draftOf, saveDraft } from './draft';
import { libraryPreview } from './library';
import { bindingsOf, Env, isRef, Item, readRoutine, readRun, routineNamed, runVerb } from './run';
import { runnerView } from './runView';
import { Data, emptyData, Id } from './types';

const T0 = Date.UTC(2026, 10, 28, 12, 0, 0);
let n = 0;
beforeEach(() => {
  n = 0;
});
const env = (): Env => ({ now: new Date(T0 + 1000 * n).toISOString(), id: () => `c${++n}` });

/** A start chosen with these words, then these answers, in order; the data, the routine's id and its name. */
function compose(start: StartKey, typed: string, answers: [key: string, text: string][] = [], data: Data = emptyData()) {
  const b = beginCompose(data, start, typed, env());
  expect(b.ok, `begin refused: ${!b.ok && b.reason}`).toBe(true);
  if (!b.ok) throw new Error('refused');
  let d = b.data;
  for (const [key, text] of answers) {
    const r = composeAnswer(d, b.routineId, start, key as never, text, env());
    expect(r.ok, `${key} refused: ${!r.ok && r.reason}`).toBe(true);
    d = r.data;
  }
  return { d, id: b.routineId, name: b.name };
}
/** The routine as its draft shows it: one line per row (as the composer's "So far" and the library preview draw it). */
const lines = (d: Data, id: Id) =>
  libraryPreview(id, { data: draftData(d, id), defs: [] }).map((r) => `${'  '.repeat(r.depth)}${r.kind === 'item' ? '· ' : ''}${r.words}${r.gives ? ` >${r.gives}` : ''}${r.with?.length ? ` [${r.with.join('; ')}]` : ''}`);
/** Saved (Save), the routine as a backup reads it back: the import check passes and nothing is lost. */
const savedAndValid = (d: Data, id: Id): Data => {
  const s = saveDraft(d, id, env());
  expect(s.ok, `save refused: ${!s.ok && s.reason}`).toBe(true);
  const back = fromBackup(toBackup(s.data));
  expect(back.routines[id]).toEqual(JSON.parse(JSON.stringify(s.data.routines[id])));
  return s.data;
};
let ended = false;
/** Started and taken Next by Next (at most `max` presses): the steps it showed; `ended` says whether it reached its end. */
const runThrough = (d: Data, id: Id, max = 200): string[] => {
  const s = runVerb(d, { kind: 'start', routineId: id }, env());
  expect(s.ok, `start refused: ${s.reason}`).toBe(true);
  let data = s.data;
  const seen: string[] = [];
  for (let k = 0; k < max; k++) {
    const v = runnerView(data, s.runId!);
    if (!v || v.status === undefined) break;
    seen.push(v.step.parts.map((p) => ('text' in p ? p.text : `{${(p as { name: string }).name}}`)).join(''));
    const nx = runVerb(data, { kind: 'next', runId: s.runId! }, env());
    if (!nx.ok) break;
    data = nx.data;
  }
  ended = !!readRun(data, s.runId!)?.endedAt;
  return seen;
};

const ZINE: [string, string][] = [
  ['for', 'so neighbours notice the street'],
  ['done', '12 pages\nprinted\nleft at five doors'],
  ['ways', 'photocopy\nrisograph\nhand-drawn'],
];

describe('the starts (B-19 journey 1, "Answered by the owner")', () => {
  it('five, in one fixed order with the owner’s lines; each is a library template', () => {
    expect(STARTS.map((s) => [s.label, s.line])).toEqual([
      ['Work it out', 'figure it out as you go'],
      ['Make it', 'something to build or finish'],
      ['Learn it', 'something to get better at'],
      ['Find out', 'a question to answer'],
      ['Decide', 'a choice to make'],
    ]);
    expect(STARTS.map((s) => s.lib)).toEqual(['lib-work-out', 'lib-make', 'lib-learn', 'lib-find-out', 'lib-decide']);
  });
  it('slice 1 asks for Make it (at most four) and Work it out; the other three ask nothing yet', () => {
    expect(startOf('make').asks.map((a) => a.question('a zine'))).toEqual(['What is the zine for?', 'How will you know it’s done?', 'What are a few ways you could make it?']);
    expect(startOf('work').asks.map((a) => a.question('x'))).toEqual(['What’s the first small step?', 'What comes after that, if you know?']);
    for (const s of STARTS) expect(s.asks.length).toBeLessThanOrEqual(4);
    expect(['learn', 'find', 'decide'].map((k) => startOf(k as StartKey).asks.length)).toEqual([0, 0, 0]);
  });
});

describe('the mark from the first words (B-19 journey 1)', () => {
  it.each([
    ['learn to play piano', 'learn'],
    ['get better at drawing hands', 'learn'],
    ['why my mixes sound thin', 'find'],
    ['how bread rises', 'find'],
    ['find out whether creatine is safe', 'find'],
    ['is creatine safe long-term?', 'find'],
    ['decide on a flat', 'decide'],
    ['whether to take the contract job', 'decide'],
    ['contract job or stay', 'decide'],
    ['make a zine', 'make'],
    ['build a shed', 'make'],
    ['write my CV', 'make'],
    ['finish the quilt', 'make'],
    ['To build a shed', 'make'],
  ])('"%s" marks %s', (typed, key) => {
    expect(markStart(typed)).toBe(key);
  });
  it('words it does not recognise mark nothing (the sheet then fills Work it out)', () => {
    for (const t of ['a zine about my street', 'clean the car', 'Drawing practice', 'makeup routine', 'learner driver forms', 'origami', '']) expect(markStart(t), t).toBeUndefined();
  });
});

describe('a sentence and a start make a routine named from it, its lists holding the answers verbatim (Done when 1)', () => {
  it('Make it: the name, the first step in the person’s words, done and the ways kept as typed', () => {
    const { d, id, name } = compose('make', 'a zine about my street', ZINE);
    expect(name).toBe('Make a zine about my street');
    expect(readRoutine(d, id)!.words).toBe('Make a zine about my street');
    expect(lines(d, id)).toEqual([
      'so neighbours notice the street',
      'For each option in {options}',
      '  · photocopy',
      '  · risograph',
      '  · hand-drawn',
      '  Make the cheapest version of this that can be tried: {option}',
      '  Try it on someone, or on yourself',
      '  Mark the option with what it showed >options',
      'Choose [with 12 pages, printed and left at five doors as tests; with photocopy, risograph and hand-drawn as options]',
      'Find how it fails [with {choice} as plan]',
      'Build the first whole version of: {revised}',
      'Check and mend [with the first version as work; with show it to someone after each change as rule; with 12 pages, printed and left at five doors as standard]',
      'Review after doing [with the whole project as work]',
    ]);
    // The list holds each line exactly as typed.
    const block = (readRoutine(draftData(d, id), id)!.items as Item[]).map((i) => (isRef(i) ? readRoutine(draftData(d, id), i.ref) : undefined)).find((s) => s?.each)!;
    expect(block.each!.kept).toEqual(['photocopy', 'risograph', 'hand-drawn']);
  });

  it('Work it out: the first step and those after it are the list it works through, kept; its aim says "it"', () => {
    const { d, id, name } = compose('work', 'redo my CV', [
      ['first', 'list my last three jobs'],
      ['after', 'pick a template\n\n  ask Sam to read it  '],
    ]);
    expect(name).toBe('Redo my CV');
    expect(lines(d, id)).toEqual(['For each step in {steps}', '  · list my last three jobs', '  · pick a template', '  · ask Sam to read it', '  {step}', '  Adjust the list: what does that make possible >steps']);
  });

  it('the person’s words are never rewritten: braces stay words (stored as literal braces), "my" stays "my"', () => {
    const { d, id } = compose('make', 'a zine about my street', [['for', 'for my {street} friends']]);
    expect(lines(d, id)[0]).toBe('for my {{street}} friends');
    expect(runThrough(savedAndValid(d, id), id)[0]).toBe('for my {street} friends');
  });

  it('a start’s aim, fixed for this routine, says "it" before anything is answered (never a name in braces)', () => {
    const { d, id } = compose('work', 'redo my CV');
    expect(lines(d, id)[0]).toBe('List the first steps toward it >steps');
  });
});

describe('Skip at any question leaves a valid routine (Done when 2)', () => {
  const cases: [StartKey, string, [string, string][]][] = [
    ['make', 'a zine about my street', ZINE],
    ['work', 'redo my CV', [
      ['first', 'list my last three jobs'],
      ['after', 'pick a template\nask Sam to read it'],
    ]],
  ];
  for (const [start, typed, answers] of cases)
    for (let k = 0; k <= answers.length; k++)
      it(`${start}, skipped after ${k} answer(s): it saves, reads back through the import check, and runs to its end`, () => {
        const { d, id } = compose(start, typed, answers.slice(0, k));
        const saved = savedAndValid(d, id);
        const steps = runThrough(saved, id);
        expect(steps.length).toBeGreaterThan(0);
        expect(ended, 'the run reached its end').toBe(true);
      });

  it('an empty answer (Continue with nothing typed) changes nothing: the part stays as the template has it', () => {
    const a = compose('make', 'a zine');
    const b = composeAnswer(a.d, a.id, 'make', 'done', '  \n ', env());
    expect(b.ok && b.data).toBe(a.d);
  });

  it('Learn it, Find out and Decide (no questions yet) are their template under the name, in Edit', () => {
    for (const [start, typed, name] of [
      ['learn', 'play piano', 'Learn to play piano'],
      ['find', 'why my mixes sound thin', 'Find out why my mixes sound thin'],
      ['decide', 'whether to take the contract job', 'Decide whether to take the contract job'],
    ] as const) {
      const { d, id } = compose(start, typed);
      expect(readRoutine(d, id)!.words).toBe(name);
      expect(draftOf(d, id)).toBeDefined();
      savedAndValid(d, id);
    }
  });
});

describe('it ends in Plan, in Edit, the answers an unsaved draft (P-115)', () => {
  it('the copy is saved; every answer is the draft’s — Cancel leaves the template’s steps, Save keeps the answers', () => {
    const { d, id } = compose('make', 'a zine about my street', ZINE);
    // Saved: the template as copied, in the library's words.
    expect((readRoutine(d, id)!.items[0] as { text: string }).text).toBe('State who it is for and what it should do for them');
    expect(draftOf(d, id)!.log.length).toBeGreaterThan(0);
    const cancelled = cancelDraft(d, id);
    expect(cancelled.ok && (readRoutine(cancelled.data, id)!.items[0] as { text: string }).text).toBe('State who it is for and what it should do for them');
    const saved = saveDraft(d, id, env());
    expect(saved.ok && (readRoutine(saved.data, id)!.items[0] as { text: string }).text).toBe('so neighbours notice the street');
  });

  it('a name in use is refused before anything is made (nothing written)', () => {
    const first = compose('make', 'a zine');
    const again = beginCompose(first.d, 'make', 'make a zine', env());
    expect(again.ok).toBe(false);
    expect(!again.ok && again.reason).toBe('same-name');
    expect(again.data).toBe(first.d);
    expect(beginCompose(emptyData(), 'make', '   ', env())).toMatchObject({ ok: false, reason: 'empty' });
  });

  it('it is made through Copy: what the template calls comes too, the person’s own by name used', () => {
    const { d } = compose('make', 'a zine');
    for (const n of ['Say what done is', 'Gather options', 'Choose', 'Check and mend']) expect(routineNamed(d, n), n).toBeDefined();
  });

  it('a call the answer fixed is given the words, by name nowhere (it asks nothing when run)', () => {
    const { d, id } = compose('make', 'a zine', [['done', 'printed']]);
    const view = draftData(d, id);
    const check = (readRoutine(view, id)!.items as Item[]).find((i) => isRef(i) && readRoutine(view, i.ref)?.words === 'Check and mend')!;
    expect(bindingsOf(check)).toContainEqual({ input: 'standard', typed: 'printed' });
  });
});

describe('Continue says what it added (B-19 edges)', () => {
  it('a count for a list, the words for one thing, nothing for nothing', () => {
    const [, done, ways] = startOf('make').asks;
    expect(addedWords(ways, 'a\nb\nc')).toBe('Added 3 ways');
    expect(addedWords(done, 'printed')).toBe('Added 1 thing done means');
    expect(addedWords(startOf('make').asks[0], ' for the street ')).toBe('Added “for the street”');
    expect(addedWords(startOf('work').asks[1], '')).toBe('');
    expect(linesOf('a\r\n\n b ,c\n')).toEqual(['a', 'b ,c']);
  });
});
