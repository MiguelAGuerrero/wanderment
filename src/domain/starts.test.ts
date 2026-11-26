/**
 * P-86: "I'm going to…" searches the tiles as you type, then routines, then unnamed things you've
 * done, each distinct thing once (B-11 9b; scout report section 6). P-95: it only finds what exists —
 * there is no "New: <your words>" row (making something new is the New tile's).
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { editRoutine, Env, Item, runVerb, Verb } from './run';
import { searchStarts } from './starts';
import { Data, emptyData, Routine } from './types';

let n = 0;
let t = 0;
beforeEach(() => {
  n = 0;
  t = 0;
});
const env = (): Env => ({ now: new Date(Date.UTC(2026, 10, 24, 10, 0, t++)).toISOString(), id: () => `x${++n}` });
const ok = (d: Data, verb: Verb) => {
  const r = runVerb(d, verb, env());
  expect(r.ok, `${JSON.stringify(verb)} refused: ${r.reason}`).toBe(true);
  return r;
};
const step = (id: string, text = id): Item => ({ id, text });
const wait = (id: string, w = id): Item => ({ id, wait: w });
const made = (day: number) => `2026-11-${String(day).padStart(2, '0')}T00:00:00.000Z`;
const seq = (id: string, words: string, day: number, items: Item[] = [step(`${id}-1`)], extra: Record<string, unknown> = {}): Routine => ({ id, words, named: true, createdAt: made(day), items, ...extra });
const world = (...ss: Routine[]): Data => ({ ...emptyData(), routines: Object.fromEntries(ss.map((s) => [s.id, s])) });
const rows = (d: Data, q: string) => searchStarts(d, q).map((r) => `${r.kind}:${r.words}`);

const maya = () =>
  world(
    seq('acme', 'Apply to Acme', 3, [step('cv', 'Tailor the CV'), wait('w', 'a reply from Acme')], { home: true }),
    seq('draw', 'Practise drawing', 1, [step('d', 'Warm-up lines')], { home: true }),
    seq('spanish', 'Feel at home in Spanish', 2, [], { home: true, open: true }),
    seq('proof', 'Proofread out loud', 4),
    seq('apply', 'Apply for a grant', 5),
    seq('old', 'Apply to Oldco', 6, undefined, { removedAt: made(7) }),
  );

describe('“I’m going to…”', () => {
  it('nothing typed: the tiles, as on home, and no "New:"; with nothing at all, no rows', () => {
    expect(rows(maya(), '')).toEqual(['tile:Practise drawing', 'tile:Feel at home in Spanish', 'tile:Apply to Acme']);
    expect(rows(maya(), '   ')).toEqual(rows(maya(), ''));
    expect(searchStarts(emptyData(), '')).toEqual([]);
  });

  it('typing filters the tiles first, then the other routines — and nothing else (P-95: no "New: <your words>"); the first row is the marked one', () => {
    const found = searchStarts(maya(), 'apply');
    expect(found.map((r) => `${r.kind}:${r.words}`)).toEqual(['tile:Apply to Acme', 'routine:Apply for a grant']);
    expect(found.map((r) => r.first)).toEqual([true, false]);
    expect(found.map((r) => r.action)).toEqual(['start', 'start']);
    expect(found[0].routineId).toBe('acme');
    expect(found[1].routineId).toBe('apply');
  });

  it('every word must start a word of the name, in any order, whatever the case or accents: "acm app" finds Apply to Acme, "art" does not find "start"', () => {
    const d = world(seq('a', 'Apply to Acme', 1, undefined, { home: true }), seq('s', 'Start the café list', 2));
    expect(rows(d, 'acm app')).toEqual(['tile:Apply to Acme']);
    expect(rows(d, 'art')).toEqual([]);
    expect(rows(d, 'CAFE')).toEqual(['routine:Start the café list']);
    expect(rows(d, 'apply zebra')).toEqual([]);
  });

  it('nothing matching: no rows at all — no create offer (P-95)', () => {
    expect(searchStarts(maya(), '  learn   to juggle ')).toEqual([]);
  });

  it('a routine with exactly that name is its one row; a removed routine is never a row', () => {
    expect(rows(maya(), 'practise  DRAWING')).toEqual(['tile:Practise drawing']);
    expect(rows(maya(), 'Proofread out loud')).toEqual(['routine:Proofread out loud']);
    expect(rows(maya(), 'apply to oldco')).toEqual([]);
  });

  it('a tile with a run going is one row, to Resume (never also a Start row), and is found by the step it is at, its reason and what it waits for', () => {
    const a = ok(maya(), { kind: 'start', routineId: 'acme' });
    let d = ok(a.data, { kind: 'pause', runId: a.runId!, reason: 'need the job ad open' }).data;
    expect(searchStarts(d, 'apply')[0]).toMatchObject({ kind: 'tile', words: 'Apply to Acme', action: 'resume', routineId: 'acme', runId: a.runId, first: true });
    expect(rows(d, 'tailor')).toEqual(['tile:Apply to Acme']);
    expect(rows(d, 'job ad')).toEqual(['tile:Apply to Acme']);
    d = ok(d, { kind: 'next', runId: a.runId! }).data;
    expect(rows(d, 'reply')).toEqual(['tile:Apply to Acme']);
    expect(rows(d, 'tailor')).toEqual([]); // no longer the step it is at
    // A routine not on home with a run going is a tile, not a routine row.
    const p = ok(ok(d, { kind: 'home', runId: a.runId! }).data, { kind: 'start', routineId: 'proof' });
    expect(rows(p.data, 'proof')).toEqual(['tile:Proofread out loud']);
  });

  it('unnamed things you have done come after routines: found by their words, each distinct thing once (the newest), to start again', () => {
    const u = (id: string, words: string, day: number, extra: Record<string, unknown> = {}): Routine => ({ id, words, named: false, createdAt: made(day), items: [step(`${id}-1`, 'part one')], ...extra });
    const d: Data = { ...maya(), routines: { ...maya().routines, u1: u('u1', 'Tidy the desk', 8), u2: u('u2', 'tidy  the DESK', 9), u3: u('u3', 'Tidy the shed', 10) } };
    const found = searchStarts(d, 'tidy');
    expect(found.map((r) => `${r.kind}:${r.words}:${r.routineId ?? ''}`)).toEqual(['unnamed:tidy  the DESK:u2', 'unnamed:Tidy the shed:u3']);
    expect(found[0].action).toBe('start');
    // Starting one makes it a tile like any other.
    const going = ok(d, { kind: 'start', routineId: 'u3' }).data;
    expect(rows(going, 'tidy')).toEqual(['tile:Tidy the shed', 'unnamed:tidy  the DESK']);
  });

  it('an unnamed thing is not a row while it belongs to a run still going (as the build before P-90 stored a breakdown), once it is part of a routine (a step broken down in Plan), or when a routine has its name', () => {
    const base = world(seq('r', 'Report', 1, [step('a', 'Write the summary'), step('b', 'Send it')], { home: true }), seq('s', 'Sort the post', 2));
    const run = ok(base, { kind: 'start', routineId: 'r' });
    // The build before: Break it down made a sequence owned by the run, and a this-run change.
    const u: Routine = { id: 'u', words: 'Write the summary', named: false, createdAt: made(8), ownerRunId: run.runId!, items: [step('u1', 'outline')] };
    const broken: Data = {
      ...run.data,
      routines: { ...run.data.routines, u },
      runs: { [run.runId!]: { ...run.data.runs[run.runId!], frames: [{ seq: 'r', at: 'a', round: 1 }, { seq: 'u', at: 'u1', round: 1, from: 'a' }], changes: [{ id: 'c1', kind: 'breakdown', seq: 'r', item: 'a', into: 'u' }] } },
    };
    expect(rows(broken, 'summary')).toEqual([]); // (the tile is at "outline" now)
    // Folded into the routine (Plan opened on the run), or broken down in Plan to begin with: part of Report, for good.
    const folded = ok(broken, { kind: 'plan', runId: run.runId! }).data;
    const ended = ok(ok(folded, { kind: 'jump', runId: run.runId!, to: { level: 0 } }).data, { kind: 'done', runId: run.runId! }).data;
    expect(rows(ended, 'summary')).toEqual([]);
    const inPlan = editRoutine(base, 'r', { kind: 'breakDown', item: 'a', steps: ['outline'] }, env()).data;
    expect(rows(inPlan, 'summary')).toEqual([]);
    // Never folded, and its run has ended: it is found by its words.
    const left = ok(ok(broken, { kind: 'jump', runId: run.runId!, to: { level: 0 } }).data, { kind: 'done', runId: run.runId! }).data;
    expect(rows(left, 'summary')).toEqual(['unnamed:Write the summary']);
    // A routine has the same name: the routine is the one row.
    const named: Data = { ...left, routines: { ...left.routines, w: seq('w', 'write the Summary', 3) } };
    expect(rows(named, 'summary')).toEqual(['routine:write the Summary']);
  });

  it('rows do not jump about as you type: within each group they stay in the order the things were first made', () => {
    const d = world(seq('b', 'Bake bread', 2, undefined, { home: true }), seq('a', 'Bake a cake', 1, undefined, { home: true }), seq('c', 'Bake biscuits', 3), seq('e', 'Batch cook', 4));
    expect(rows(d, 'b')).toEqual(['tile:Bake a cake', 'tile:Bake bread', 'routine:Bake biscuits', 'routine:Batch cook']);
    expect(rows(d, 'ba')).toEqual(['tile:Bake a cake', 'tile:Bake bread', 'routine:Bake biscuits', 'routine:Batch cook']);
    expect(rows(d, 'bak')).toEqual(['tile:Bake a cake', 'tile:Bake bread', 'routine:Bake biscuits']);
    expect(rows(d, 'bake br')).toEqual(['tile:Bake bread']);
  });
});
