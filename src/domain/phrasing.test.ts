/**
 * P-114 (B-19 slice 1a): the composer's phrasing, run on a corpus — every routine name the owner has made (owner-notes),
 * the examples in B-19 and in the guided-composer discovery, and the rules' own hard cases. Each output was read and
 * marked: `fine` (reads as the person would write it), `plain` (the rule fell back: what was typed as it stands, or the
 * plain question — always correct, never a nicety). The bar (B-19): none `wrong`; a rule change that changes a phrase
 * fails here. Expected values come from B-19 journeys 2a and 4 and from reading each phrase — never from running the code.
 */
import { describe, expect, it } from 'vitest';

import { composedName, itemNameFor, singularOf, StartKey, whatFor } from './values';

type Verdict = 'fine' | 'plain';
/** What was typed, under which start, the routine's name it gives, and how it reads. */
const NAMES: [typed: string, start: StartKey, name: string, verdict: Verdict, source: string][] = [
  // ── B-19 (journeys 2a and 4) ──
  ['a zine about my street', 'make', 'Make a zine about my street', 'fine', 'B-19 j4'],
  ['make a zine', 'make', 'Make a zine', 'fine', 'B-19 j4: the start’s verb not repeated'],
  ['drawing hands', 'learn', 'Learn drawing hands', 'fine', 'B-19 j4'],
  ['play piano', 'learn', 'Learn to play piano', 'fine', 'B-19 j4: "to" before a plain verb'],
  ['to play piano', 'learn', 'Learn to play piano', 'fine', 'B-19 j4: kept as typed'],
  ['learn to play piano', 'learn', 'Learn to play piano', 'fine', 'owner: "learn to play piano, sounds a lot better"'],
  ['why my mixes sound thin', 'find', 'Find out why my mixes sound thin', 'fine', 'B-19 j4'],
  ['whether to take the contract job', 'decide', 'Decide whether to take the contract job', 'fine', 'B-19 j2a'],
  ['contract job or stay', 'decide', 'Contract job or stay', 'plain', 'B-19 phrasing study (the old example)'],
  // ── the guided-composer discovery ──
  ['clean the car', 'work', 'Clean the car', 'fine', 'discovery: a task'],
  ['make a zine', 'work', 'Make a zine', 'fine', 'discovery: a goal'],
  ['get better at drawing hands', 'learn', 'Get better at drawing hands', 'fine', 'discovery: an ambition'],
  ['is creatine safe long-term?', 'find', 'Is creatine safe long-term?', 'plain', 'discovery: a question'],
  ['Find out whether creatine is safe', 'find', 'Find out whether creatine is safe', 'fine', 'discovery'],
  ['start on the game', 'work', 'Start on the game', 'fine', 'discovery: not known yet'],
  // ── the owner's own routines and aims (owner-notes) ──
  ['Drawing practice', 'work', 'Drawing practice', 'fine', 'owner'],
  ['Drawing practice', 'learn', 'Learn drawing practice', 'fine', 'owner'],
  ['test out wonderment', 'work', 'Test out wonderment', 'fine', 'owner'],
  ['Testing out wanderment', 'work', 'Testing out wanderment', 'fine', 'owner'],
  ['Improve my workout routine', 'work', 'Improve my workout routine', 'fine', 'owner'],
  ['Improve my workout routine', 'learn', 'Improve my workout routine', 'fine', 'owner: its own verb'],
  ['clean my car', 'work', 'Clean my car', 'fine', 'owner'],
  ['Car wash', 'work', 'Car wash', 'fine', 'owner'],
  ['Document Iteration', 'work', 'Document Iteration', 'fine', 'owner'],
  ['Become a better drawer', 'work', 'Become a better drawer', 'fine', 'owner'],
  ['Become a better drawer', 'learn', 'Become a better drawer', 'fine', 'owner: its own verb'],
  ['Practise drawing', 'learn', 'Practise drawing', 'fine', 'owner: its own verb'],
  ['Hand studies', 'work', 'Hand studies', 'fine', 'owner'],
  ['Hand studies', 'learn', 'Learn hand studies', 'fine', 'owner: a phone’s capital lowered where it joins'],
  ['Apply to jobs', 'work', 'Apply to jobs', 'fine', 'owner'],
  ['feel productive', 'work', 'Feel productive', 'fine', 'owner'],
  ['Work nothing is waiting on', 'work', 'Work nothing is waiting on', 'fine', 'owner'],
  // ── the rules' own hard cases ──
  ['A zine about my street', 'make', 'Make a zine about my street', 'fine', 'a phone capitalises the first word'],
  ['Making a zine', 'make', 'Make a zine', 'fine', 'the start’s verb, -ing'],
  ['build a shed', 'make', 'Build a shed', 'fine', 'another verb: as typed'],
  ['zine about my street', 'make', 'Zine about my street', 'plain', 'no article: as typed'],
  ['The Zine', 'make', 'Make The Zine', 'plain', 'a title kept as typed'],
  ['my portfolio', 'make', 'Make my portfolio', 'fine', 'the routine keeps "my"'],
  ['Spanish', 'learn', 'Learn Spanish', 'fine', 'a name keeps its capital'],
  ['Piano', 'learn', 'Learn piano', 'fine', 'a phone’s capital lowered'],
  ['how to juggle', 'learn', 'Learn how to juggle', 'fine', ''],
  ['juggle', 'learn', 'Learn to juggle', 'fine', ''],
  ['dance moves', 'learn', 'Dance moves', 'plain', 'a verb or a noun: as typed (the first draft said "Learn to dance moves": wrong)'],
  ['paint landscapes', 'learn', 'Paint landscapes', 'plain', 'a verb or a noun: as typed'],
  ['code', 'learn', 'Learn to code', 'fine', 'a verb or a noun, alone: a verb'],
  ['Why do my mixes sound thin?', 'find', 'Why do my mixes sound thin?', 'plain', 'a question of its own: as typed'],
  ['how bread rises', 'find', 'Find out how bread rises', 'fine', ''],
  ['the best way to store paint', 'find', 'Find out the best way to store paint', 'fine', ''],
  ['decide between two flats', 'decide', 'Decide between two flats', 'fine', ''],
  ['which bike to buy', 'decide', 'Decide which bike to buy', 'fine', ''],
  ['Should I take the contract job', 'decide', 'Should I take the contract job', 'plain', 'a question of its own'],
  ['redo my CV', 'work', 'Redo my CV', 'fine', ''],
  ['  plan   the trip ', 'work', 'Plan the trip', 'fine', 'spaces tidied'],
];

/** What was typed, and Make it's first question (B-19 journey 2a): woven, or the plain "What is it for?". */
const WHAT_FOR: [typed: string, question: string, verdict: Verdict, source: string][] = [
  ['a zine about my street', 'What is the zine about your street for?', 'fine', 'B-19 j2a: "my" reads "your"'],
  ['make a zine', 'What is the zine for?', 'fine', 'the start’s verb dropped'],
  ['A zine about my street', 'What is the zine about your street for?', 'fine', 'a phone’s capital'],
  ['an album of my songs', 'What is the album of your songs for?', 'fine', ''],
  ['my portfolio', 'What is your portfolio for?', 'fine', ''],
  ['the garden shed', 'What is the garden shed for?', 'fine', ''],
  ['the posters about my street', 'What are the posters about your street for?', 'fine', 'a plural head'],
  ['a series of prints', 'What is the series of prints for?', 'fine', '"a" is one thing'],
  ['the new lens', 'What is the new lens for?', 'fine', 'an -s word that is not a plural'],
  ['this quilt', 'What is this quilt for?', 'fine', ''],
  ['a website for my band', 'What is it for?', 'plain', 'its own "for"'],
  ['a birthday card and a cake', 'What is it for?', 'plain', 'a list'],
  ['a zine, maybe two', 'What is it for?', 'plain', 'its own punctuation'],
  ['a really long zine about everything on my street', 'What is it for?', 'plain', 'long'],
  ['a gift I can give', 'What is it for?', 'plain', '"I"'],
  ['build a shed', 'What is it for?', 'plain', 'another verb'],
  ['zine about my street', 'What is it for?', 'plain', 'no article'],
  ['a zine\nabout my street', 'What is the zine about your street for?', 'fine', 'lines are one line'],
  ['', 'What is it for?', 'plain', 'nothing typed'],
];

describe('B-19 1a: the corpus — none reads wrong', () => {
  for (const [typed, start, name, , source] of NAMES)
    it(`${start}: "${typed.trim()}" → "${name}"${source ? ` (${source})` : ''}`, () => {
      expect(composedName(start, typed)).toBe(name);
    });
  for (const [typed, question, , source] of WHAT_FOR)
    it(`what for: "${typed.replace(/\n/g, '⏎')}" → "${question}"${source ? ` (${source})` : ''}`, () => {
      expect(whatFor(typed)).toBe(question);
    });

  it('the tally the build notes report: how many read fine and how many fell back to plain', () => {
    const tally = (vs: Verdict[]) => ({ fine: vs.filter((v) => v === 'fine').length, plain: vs.filter((v) => v === 'plain').length });
    expect(tally(NAMES.map((n) => n[3]))).toEqual({ fine: 45, plain: 8 });
    expect(tally(WHAT_FOR.map((n) => n[2]))).toEqual({ fine: 11, plain: 8 });
  });
});

describe('the joins are small and fixed (B-19 journey 2a)', () => {
  it('"my" reads "your" only in the question; the routine’s name keeps "my"', () => {
    expect(whatFor('a zine about my street')).toContain('your street');
    expect(composedName('make', 'a zine about my street')).toBe('Make a zine about my street');
  });
  it('a short answer is woven in; a long one, a list or one with its own punctuation is "it"', () => {
    expect(whatFor('a zine')).toBe('What is the zine for?');
    for (const t of ['a zine about every single house on my long street', 'a zine and a poster', 'a zine (maybe)', 'a zine\nand a poster']) expect(whatFor(t)).toBe('What is it for?');
  });
  it('nothing typed makes no name', () => {
    expect(composedName('make', '   ')).toBe('');
  });
});

describe('the singular helper (values.ts), shared with For each', () => {
  it('reads a plural as before, and says when a word is not one', () => {
    expect(singularOf('stories')).toBe('story');
    expect(singularOf('boxes')).toBe('box');
    expect(singularOf('photos')).toBe('photo');
    expect(singularOf('glass')).toBeUndefined();
    expect(singularOf('status')).toBeUndefined();
    // For each's item, unchanged by the refactor.
    expect(itemNameFor('concerns')).toBe('concern');
    expect(itemNameFor('subject')).toBe('subject item');
  });
});
