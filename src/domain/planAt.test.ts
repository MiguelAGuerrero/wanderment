/**
 * P-111 (owner, 2026-11-27: "the breakdown step be its own view … more screen space"; answered "Opens its own view"):
 * a step broken down and a for each open as a view of their own in Plan — their own steps, the path back one up — and a
 * routine used as a step stays a call (it opens in place; it has its own Plan). Plus two "@" fixes the P-110
 * investigator found: Return on an exact name, and a step reading "@<routine>" left unchanged. Expected values are the
 * roadmap's and the coordinator's words, not the code's output.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { rankRoutines, routineInWords, wordsKept } from './atPick';
import { editRoutine, Env, Item, RoutineEdit } from './run';
import { insidesOf, PLAN_TOP, planAt, planKey, planView, routinesByAge } from './runView';
import { Data, emptyData, Id, Routine, Run } from './types';

const T0 = Date.UTC(2026, 10, 27, 10, 0, 0);
let n = 0;
beforeEach(() => {
  n = 0;
});
const env = (): Env => ({ now: new Date(T0 + 1000 * n).toISOString(), id: () => `x${++n}` });
const edit = (d: Data, routineId: Id, e: RoutineEdit): Data => {
  const r = editRoutine(d, routineId, e, env());
  expect(r.ok, `${JSON.stringify(e)} refused: ${r.reason}`).toBe(true);
  return r.data;
};
const step = (id: string, text = id): Item => ({ id, text });
const ref = (id: string, to: string): Item => ({ id, ref: to });
const seq = (id: string, words: string, items: Item[], extra: Record<string, unknown> = {}): Routine => ({ id, words, named: true, createdAt: '2026-11-01T00:00:00.000Z', items, ...extra });
const aRun = (id: Id, routineId: Id, frames: unknown[]): Run => ({ id, routineId, startedAt: '2026-11-27T09:00:00.000Z', touchedAt: '2026-11-27T09:00:00.000Z', frames, changes: [], status: 'paused' } as Run);
const world = (routines: Routine[], runs: Run[] = []): Data => ({ ...emptyData(), routines: Object.fromEntries(routines.map((s) => [s.id, s])), runs: Object.fromEntries(runs.map((r) => [r.id, r])) });

// Test the app = [Pick a feature, Vibe check ▸ (Open it, Poke ▸ (Tap, Swipe)), For each concern in {concerns} ▸ (Note it), ▤ Hands]
// Hands = [Find a photo, Sketch ▸ (Block in)]
const app = () =>
  world([
    seq('app', 'Test the app', [step('a', 'Pick a feature'), ref('b', 'vibe'), ref('c', 'loop'), ref('d', 'hands')], { home: true }),
    seq('vibe', 'Vibe check', [step('v1', 'Open it'), ref('v2', 'poke')], { named: false }),
    seq('poke', 'Poke', [step('p1', 'Tap'), step('p2', 'Swipe')], { named: false }),
    seq('loop', 'For each concern in {concerns}', [step('l1', 'Note it')], { named: false, each: { item: 'concern', list: 'concerns' } }),
    seq('hands', 'Hands', [step('h1', 'Find a photo'), ref('h2', 'sketch')]),
    seq('sketch', 'Sketch', [step('s1', 'Block in')], { named: false }),
  ]);
const words = (rows: { words: string }[]) => rows.map((r) => r.words);

describe('P-111: which rows open as a view of their own', () => {
  it('a step broken down and a for each open as a view; a routine used as a step stays a call (in place); a step has no insides', () => {
    const v = planView(app(), { routineId: 'app' })!;
    const kind = (w: string) => insidesOf(v.rows.find((r) => r.words === w)!);
    expect(kind('Vibe check')).toBe('view');
    expect(kind('For each concern in {concerns}')).toBe('view');
    expect(kind('Hands')).toBe('fold');
    expect(kind('Pick a feature')).toBeUndefined();
  });
});

describe('P-111: a view of Plan', () => {
  it('the routine’s own: every row, nothing up', () => {
    const v = planView(app(), { routineId: 'app' })!;
    for (const at of [undefined, PLAN_TOP, '']) {
      const p = planAt(v, at);
      expect(p).toMatchObject({ key: '', base: 0 });
      expect(p.up).toBeUndefined();
      expect(p.rows).toBe(v.rows);
    }
  });

  it('a step broken down: its own steps (its own breakdowns’ too), drawn from depth 0, and the path back to the routine', () => {
    const v = planView(app(), { routineId: 'app' })!;
    const p = planAt(v, 'b');
    expect(p.row?.words).toBe('Vibe check');
    expect(words(p.rows)).toEqual(['Open it', 'Poke', 'Tap', 'Swipe']);
    expect(p.rows.map((r) => r.depth - p.base)).toEqual([0, 0, 1, 1]);
    expect(p.up).toEqual({ key: '', words: 'Test the app' });
  });

  it('a breakdown inside a breakdown: the path back is the one it is in', () => {
    const v = planView(app(), { routineId: 'app' })!;
    const p = planAt(v, 'b/v2');
    expect(words(p.rows)).toEqual(['Tap', 'Swipe']);
    expect(p.up).toEqual({ key: 'b', words: 'Vibe check' });
  });

  it('a for each: its own steps; up is the routine', () => {
    const v = planView(app(), { routineId: 'app' })!;
    const p = planAt(v, 'c');
    expect(p.row?.each).toMatchObject({ item: 'concern', list: 'concerns' });
    expect(words(p.rows)).toEqual(['Note it']);
    expect(p.up?.words).toBe('Test the app');
  });

  it('a breakdown inside a call opens as a view; its way back passes the call (a call is not a view) to the routine', () => {
    const v = planView(app(), { routineId: 'app' })!;
    const p = planAt(v, 'd/h2');
    expect(words(p.rows)).toEqual(['Block in']);
    expect(p.up).toEqual({ key: '', words: 'Test the app' });
  });

  it('a call is never a view: its key reads as the view it is in', () => {
    const v = planView(app(), { routineId: 'app' })!;
    expect(planAt(v, 'd').key).toBe('');
  });

  it('a key that is no longer a view (removed, or undone) reads as the nearest view above it', () => {
    let d = app();
    const v0 = planView(d, { routineId: 'app' })!;
    expect(planAt(v0, 'b/v2').key).toBe('b/v2');
    d = edit(d, 'vibe', { kind: 'remove', item: 'v2' });
    expect(planAt(planView(d, { routineId: 'app' })!, 'b/v2')).toMatchObject({ key: 'b', up: { key: '' } });
    d = edit(d, 'app', { kind: 'remove', item: 'b' });
    expect(planAt(planView(d, { routineId: 'app' })!, 'b/v2').key).toBe('');
    expect(planAt(planView(d, { routineId: 'app' })!, 'nothing/at/all').key).toBe('');
  });

  it('with a run and no `at`: where the run is — the innermost breakdown it is in (HERE among its rows)', () => {
    const d = { ...app(), runs: { R: aRun('R', 'app', [{ seq: 'app', at: 'b', round: 1 }, { seq: 'vibe', at: 'v2', round: 1, from: 'b' }, { seq: 'poke', at: 'p2', round: 1, from: 'v2' }]) } };
    const v = planView(d, { runId: 'R' })!;
    const p = planAt(v, undefined);
    expect(p.key).toBe(planKey(['b', 'v2']));
    expect(p.rows.find((r) => r.here)?.words).toBe('Swipe');
    // `?at=top` is the routine's own steps, even then.
    expect(planAt(v, PLAN_TOP).key).toBe('');
  });

  it('with a run inside a call (not a breakdown): the routine’s own view, the call open in place', () => {
    const d = { ...app(), runs: { R: aRun('R', 'app', [{ seq: 'app', at: 'd', round: 1 }, { seq: 'hands', at: 'h1', round: 1, from: 'd' }]) } };
    expect(planAt(planView(d, { runId: 'R' })!, undefined).key).toBe('');
  });

  it('adding at the end of a view adds after its last step (a step broken down, a for each)', () => {
    let d = app();
    d = edit(d, 'vibe', { kind: 'addStep', text: 'Write it up' });
    d = edit(d, 'loop', { kind: 'addStep', text: 'Rate it' });
    const v = planView(d, { routineId: 'app' })!;
    expect(words(planAt(v, 'b').rows)).toEqual(['Open it', 'Poke', 'Tap', 'Swipe', 'Write it up']);
    expect(words(planAt(v, 'c').rows)).toEqual(['Note it', 'Rate it']);
  });
});

describe('P-111: "@" fixes (the P-110 investigator)', () => {
  const rs = [
    { routineId: 'r1', name: 'Archive doc' },
    { routineId: 'r2', name: 'Doc' },
    { routineId: 'r3', name: 'Docs to read' },
    { routineId: 'r4', name: 'My docs' },
  ];
  it('Return takes the routine named exactly, then those it begins, then those that hold it', () => {
    expect(rankRoutines('Doc', rs).map((r) => r.name)).toEqual(['Doc', 'Docs to read', 'Archive doc', 'My docs']);
    expect(rankRoutines('  doc ', rs)[0].name).toBe('Doc');
    expect(rankRoutines('arch', rs).map((r) => r.name)).toEqual(['Archive doc']);
    expect(rankRoutines('zzz', rs)).toEqual([]);
    // (The names "{" lists rank the same way: "{concern" is the item, not {concerns}.)
    expect(rankRoutines('concern', [{ routineId: 'concerns', name: 'concerns' }, { routineId: 'concern', name: 'concern' }])[0].name).toBe('concern');
  });

  it('same-named routines (an import) resolve to the same one by Return and by words typed whole: the oldest', () => {
    const d = world([
      seq('new', 'Doc', [], { createdAt: '2026-11-20T00:00:00.000Z' }),
      seq('old', 'doc', [], { createdAt: '2026-11-02T00:00:00.000Z' }),
      seq('arch', 'Archive doc', [], { createdAt: '2026-11-01T00:00:00.000Z' }),
    ]);
    const age = routinesByAge(d);
    const shown = [
      { routineId: 'arch', name: 'Archive doc' },
      { routineId: 'new', name: 'Doc' },
      { routineId: 'old', name: 'doc' },
    ];
    expect(rankRoutines('Doc', shown, age.map((r) => r.routineId))[0].routineId).toBe('old');
    expect(routineInWords('@Doc', age)).toBe('old');
  });

  it('a step’s words kept unchanged do nothing — even "@<routine>"; changed to "@<routine>" they make the call; else they are its words', () => {
    expect(wordsKept('@Doc', '@Doc', 'r2')).toBe('none');
    expect(wordsKept('@Doc', '  @Doc ', 'r2')).toBe('none');
    expect(wordsKept('Write it', '@Doc', 'r2')).toBe('call');
    expect(wordsKept('Write it', 'Write it up', undefined)).toBe('reword');
    expect(wordsKept('Write it', '', undefined)).toBe('none');
  });
});
