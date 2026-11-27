/**
 * P-96: what the screens read about values (contract rulings 6–8, B-15 journeys 1–4 and 8): the runner's
 * step in parts with values in place, its fields (the giving step's, a step that asks), the values row,
 * the value sheet (where from, read by), Next reading Done only when it ends the run, the panel's Finish
 * now, home's paused run first with its values in its line, Plan's rows (gives, reads, names above), and
 * where the app opens (never the paused screen). Expected values come from the contract and B-15.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { tileLine } from './goText';
import { editRoutine, Env, Item, readRun, RoutineEdit, runVerb, Verb } from './run';
import { homeShown, homeTiles, leftOff, opensAt, panelView, planView, runnerView, runRoute, valueDetail, wordsShown } from './runView';
import { Data, emptyData, Id, Routine, Run } from './types';

const T0 = Date.UTC(2026, 10, 26, 9, 0, 0);
let n = 0;
let t = 0;
beforeEach(() => {
  n = 0;
  t = 0;
});
const env = (): Env => ({ now: new Date(T0 + 1000 * t++).toISOString(), id: () => `x${++n}` });
const ok = (d: Data, verb: Verb): Data => {
  const r = runVerb(d, verb, env());
  expect(r.ok, `${JSON.stringify(verb)} refused: ${r.reason}`).toBe(true);
  return r.data;
};
const step = (id: string, text = id): Item => {
  const m = /^(.*?)\s*>(\S.*)$/.exec(text);
  return m ? ({ id, text: m[1], out: m[2] } as Item) : { id, text };
};
const ref = (id: string, to: string): Item => ({ id, ref: to });
const seq = (id: string, words: string, items: Item[], extra: Record<string, unknown> = {}): Routine => ({ id, words, named: true, createdAt: '2026-11-01T00:00:00.000Z', home: true, items, ...extra });
const world = (...ss: Routine[]): Data => ({ ...emptyData(), routines: Object.fromEntries(ss.map((s) => [s.id, s])) });
const start = (d: Data, routineId: Id) => {
  const r = runVerb(d, { kind: 'start', routineId }, env());
  return { d: r.data, id: r.runId! };
};
const walk = (d: Data, runId: Id, ...kinds: ('next' | 'done' | 'stepIn' | 'back')[]) => kinds.reduce((data, kind) => ok(data, { kind, runId }), d);
const typed = (d: Data, runId: Id, name: string, text: string) => {
  const r = readRun(d, runId)!;
  const top = r.frames[r.frames.length - 1];
  return ok(d, { kind: 'value', runId, name, text, item: top.at! });
};

/** Drawing practice (B-15): [Select the subject matter >subject, Find three reference photos of {subject}, Rank them]. */
const drawing = () => world(seq('D', 'Drawing practice', [step('sel', 'Select the subject matter >subject'), step('find', 'Find three reference photos of {subject}'), step('rank', 'Rank them')]));

describe('the runner (ruling 6)', () => {
  it('the giving step: a labelled field for its name (empty, then as typed); its words as they are', () => {
    let { d, id } = start(drawing(), 'D');
    expect(runnerView(d, id)).toMatchObject({ step: { words: 'Select the subject matter', parts: [{ kind: 'text', text: 'Select the subject matter' }] }, fields: [{ name: 'subject', text: '', gives: true }], values: [] });
    d = typed(d, id, 'subject', 'figures in motion');
    expect(runnerView(d, id)!.fields).toEqual([{ name: 'subject', text: 'figures in motion', gives: true }]);
  });

  it('a later step: the value in place (no field), and the values row says what is in play', () => {
    let { d, id } = start(drawing(), 'D');
    d = typed(d, id, 'subject', 'figures in motion');
    d = walk(d, id, 'next');
    const v = runnerView(d, id)!;
    expect(v.step.parts).toEqual([{ kind: 'text', text: 'Find three reference photos of ' }, { kind: 'value', name: 'subject', text: 'figures in motion' }]);
    expect(v.step.words).toBe('Find three reference photos of {subject}');
    expect(v.fields).toEqual([]);
    expect(v.values).toEqual([{ name: 'subject', text: 'figures in motion', items: ['figures in motion'], level: 0, mine: true }]);
  });

  it('a step reading a name with no value asks: a blank in its words and a field for it (kept while it is being typed there)', () => {
    let { d, id } = start(drawing(), 'D');
    d = walk(d, id, 'next');
    expect(runnerView(d, id)).toMatchObject({ step: { parts: [{ kind: 'text' }, { kind: 'blank', name: 'subject' }] }, fields: [{ name: 'subject', text: '', gives: false }] });
    d = typed(d, id, 'subject', 'hands');
    expect(runnerView(d, id)).toMatchObject({ step: { parts: [{ kind: 'text' }, { kind: 'value', name: 'subject', text: 'hands' }] }, fields: [{ name: 'subject', text: 'hands', gives: false }] });
  });

  it('values as lists read joined in words; literal braces show single', () => {
    let { d, id } = start(world(seq('R', 'R', [step('a', 'Use {{this}} for {x}')])), 'R');
    d = { ...d, runs: { ...d.runs, [id]: { ...d.runs[id], values: [{ name: 'x', items: ['the dancer', 'the boxer', 'the cellist'], level: 0, seq: 'R', item: 'a', at: 'T' }] } as Run } };
    expect(runnerView(d, id)!.step.parts).toEqual([{ kind: 'text', text: 'Use {this} for ' }, { kind: 'value', name: 'x', text: 'the dancer, the boxer and the cellist' }]);
  });

  it('a routine entered as a step: values from below are in play but not its own; its own name shadows nothing', () => {
    const d0 = world(seq('P', 'Practice', [step('a', 'Choose >subject'), ref('call', 'S')]), seq('S', 'Sketch', [step('s1', 'Draw {subject}')]));
    let { d, id } = start(d0, 'P');
    d = typed(d, id, 'subject', 'hands');
    d = walk(d, id, 'next', 'stepIn');
    expect(runnerView(d, id)!.values).toEqual([{ name: 'subject', text: 'hands', items: ['hands'], level: 0, mine: false }]);
  });

  it('Next reads Done only when that press ends the whole run (B-15 journey 8)', () => {
    let { d, id } = start(drawing(), 'D');
    expect(runnerView(d, id)).toMatchObject({ next: 'next', ends: false });
    d = walk(d, id, 'next', 'next');
    expect(runnerView(d, id)).toMatchObject({ next: 'done', ends: true });
    // An open goal too (it used to go to Plan); a loop's last step does not end (it rounds again).
    const open = start(world(seq('G', 'G', [step('a')], { open: true })), 'G');
    expect(runnerView(open.d, open.id)).toMatchObject({ next: 'done', ends: true });
    const loop = start(world(seq('L', 'L', [step('a')], { repeatFrom: 0 })), 'L');
    expect(runnerView(loop.d, loop.id)).toMatchObject({ next: 'next', ends: false });
    // Inside a routine entered as the last step: its last step ends everything.
    const deep = start(world(seq('P', 'P', [ref('c', 'C')]), seq('C', 'C', [step('c1')])), 'P');
    expect(runnerView(walk(deep.d, deep.id, 'stepIn'), deep.id)).toMatchObject({ next: 'done', ends: true });
    // A wait that ends it reads Done too (P-96 audit F5; was: it stayed "It's happened"), and says it ends.
    const w = start(world(seq('W', 'W', [{ id: 'w', wait: 'a reply' }])), 'W');
    expect(runnerView(w.d, w.id)).toMatchObject({ next: 'done', ends: true });
  });

  it('the panel: Finish <level> now — and whether it ends the whole run (on the runner’s view: the panel shows it)', () => {
    const d0 = world(seq('P', 'Practice', [ref('c', 'C'), step('z')]), seq('C', 'Sketch', [step('c1'), step('c2')]));
    let { d, id } = start(d0, 'P');
    expect(runnerView(d, id)!.finish).toEqual({ name: 'Practice', ends: true });
    d = walk(d, id, 'stepIn');
    expect(runnerView(d, id)!.finish).toEqual({ name: 'Sketch', ends: false });
    expect(panelView(d, id)).toBeDefined();
  });

  it('words shown for the run: any words (the panel’s then / Back to, a reader), with the values the run’s step sees', () => {
    let { d, id } = start(drawing(), 'D');
    d = typed(d, id, 'subject', 'hands');
    expect(wordsShown(d, id, 'Draw {subject} and {other}')).toEqual([{ kind: 'text', text: 'Draw ' }, { kind: 'value', name: 'subject', text: 'hands' }, { kind: 'text', text: ' and ' }, { kind: 'blank', name: 'other' }]);
  });
});

describe('the value sheet (ruling 6, journey 4)', () => {
  it('the value, from <step>, when, what reads it; "changed" only after a change; the routine named when it is not this level’s', () => {
    const d0 = world(seq('P', 'Practice', [step('a', 'Choose the subject >subject'), ref('call', 'S'), step('z', 'Review {subject}')]), seq('S', 'Sketch', [step('s1', 'Draw {subject}')]));
    let { d, id } = start(d0, 'P');
    d = typed(d, id, 'subject', 'hands');
    expect(valueDetail(d, id, 'Subject')).toEqual({ name: 'subject', text: 'hands', items: ['hands'], from: 'Choose the subject', at: new Date(T0 + 1000).toISOString(), readBy: [{ itemId: 'z', words: 'Review {subject}' }], level: 0, mine: true });
    d = walk(d, id, 'next', 'stepIn');
    expect(valueDetail(d, id, 'subject')).toMatchObject({ routine: 'Practice', mine: false });
    d = ok(d, { kind: 'value', runId: id, name: 'subject', text: 'feet' });
    expect(valueDetail(d, id, 'subject')).toMatchObject({ text: 'feet', changedAt: expect.any(String) });
    expect(valueDetail(d, id, 'nothing')).toBeUndefined();
  });

  it('from <step> reads the step’s words now; once the step is gone, its words when the value was given', () => {
    let { d, id } = start(drawing(), 'D');
    d = typed(d, id, 'subject', 'hands');
    d = walk(d, id, 'next');
    const reworded = runVerbEdit(d, 'D', { kind: 'reword', item: 'sel', text: 'Pick the subject' });
    expect(valueDetail(reworded, id, 'subject')!.from).toBe('Pick the subject');
    const removed = runVerbEdit(d, 'D', { kind: 'remove', item: 'sel' });
    expect(valueDetail(removed, id, 'subject')!.from).toBe('Select the subject matter');
  });
});

const runVerbEdit = (d: Data, routineId: Id, e: RoutineEdit) => {
  const r = editRoutine(d, routineId, e, env());
  expect(r.ok).toBe(true);
  return r.data;
};

describe('home (ruling 8)', () => {
  it('the paused run is first, its line has its values in place (marked as values), and its tile lists them', () => {
    const d0 = world(seq('A', 'Water the plants', [step('w')]), drawing().routines.D);
    let { d, id } = start(d0, 'D');
    d = typed(d, id, 'subject', 'figures in motion');
    d = walk(d, id, 'next');
    d = ok(d, { kind: 'pause', runId: id });
    const tiles = homeShown(d);
    expect(tiles.map((t) => t.name)).toEqual(['Drawing practice', 'Water the plants']);
    expect(tiles[0]).toMatchObject({ state: 'paused', action: 'resume', at: 'Find three reference photos of {subject}', atParts: [{ kind: 'text', text: 'Find three reference photos of ' }, { kind: 'value', name: 'subject', text: 'figures in motion' }], values: [{ name: 'subject', text: 'figures in motion' }] });
    const line = tileLine(tiles[0]);
    expect(line.line).toBe('at Find three reference photos of figures in motion');
    expect(line.parts).toEqual([{ kind: 'text', text: 'at ' }, { kind: 'text', text: 'Find three reference photos of ' }, { kind: 'value', name: 'subject', text: 'figures in motion' }]);
    expect(line.says).toBe('Drawing practice, paused at Find three reference photos of figures in motion');
  });

  it('a run with no values reads exactly as before', () => {
    let { d, id } = start(world(seq('R', 'Report', [step('a', 'Write it'), step('b')])), 'R');
    d = ok(d, { kind: 'pause', runId: id });
    const [tile] = homeTiles(d);
    expect('values' in tile).toBe(false);
    expect(tileLine(tile)).toMatchObject({ line: 'at Write it', says: 'Report, paused at Write it' });
  });

  it('where the app opens: never the paused screen — a paused run is home; running: the runner — P-101 (ruling 4; was "in Plan: Plan"): opened in Plan it is paused, so home', () => {
    let { d, id } = start(drawing(), 'D');
    expect(leftOff(d)).toEqual({ kind: 'runner', runId: id });
    d = ok(d, { kind: 'pause', runId: id });
    expect(leftOff(d)).toEqual({ kind: 'home' });
    expect(opensAt(d)).toEqual({ kind: 'home' });
    expect(runRoute(d, id)).toBe('home');
    d = ok(d, { kind: 'plan', runId: id });
    expect(leftOff(d)).toEqual({ kind: 'home' });
  });
});

describe('Plan rows (ruling 5)', () => {
  it('each row says what it gives and reads; the names given above it (for the bar over the keyboard); a giving step cannot be broken down', () => {
    const d0 = world(
      seq('D', 'Drawing practice', [step('sel', 'Select the subject matter >subject'), ref('b', 'B'), step('find', 'Find photos of {subject} and {tool}'), ref('call', 'S')]),
      seq('B', 'Get ready', [step('b1', 'Pick a pencil >tool')], { named: false }),
      seq('S', 'Sketch', [step('s1', 'Draw {subject}'), step('s2', 'Look >ref')]),
    );
    const rows = planView(d0, { routineId: 'D' })!.rows.map((r) => ({ id: r.itemId, gives: r.gives, reads: r.reads, above: r.above, scope: r.scope, canBreakDown: r.canBreakDown }));
    expect(rows).toEqual([
      { id: 'sel', gives: 'subject', reads: [], above: [], scope: 'D', canBreakDown: false },
      { id: 'b', gives: undefined, reads: [], above: ['subject'], scope: 'D', canBreakDown: false },
      { id: 'b1', gives: 'tool', reads: [], above: ['subject'], scope: 'D', canBreakDown: false },
      { id: 'find', gives: undefined, reads: ['subject', 'tool'], above: ['subject', 'tool'], scope: 'D', canBreakDown: true },
      { id: 'call', gives: undefined, reads: [], above: ['subject', 'tool'], scope: 'D', canBreakDown: false },
      { id: 's1', gives: undefined, reads: ['subject'], above: [], scope: 'S', canBreakDown: true },
      { id: 's2', gives: 'ref', reads: [], above: [], scope: 'S', canBreakDown: false },
    ]);
  });
});
