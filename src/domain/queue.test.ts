/**
 * P-100 (owner, 2026-11-27: "The home view should really be a queue. Any ongoing runs would be the queue itself. And
 * the new would be enqueue"; answered "One queue"): home is one ordered list. Each run going is a row; a run started
 * goes to the bottom; rows move up, down and to the top (one write, one Undo); finishing takes a row off; the order is
 * stored on the run (`queue`) and data from before P-100 — no order stored — reads in the order home showed it: the
 * oldest started first. Expected values come from the roadmap's Done when and the owner's notes, not from the code.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { tileLine } from './goText';
import { Env, Item, queueKey, queueRuns, readRun, runVerb, Verb } from './run';
import { homeQueue, whatChanged } from './runView';
import { Data, emptyData, Id, Routine } from './types';

const T0 = Date.UTC(2026, 10, 27, 9, 0, 0);
let n = 0;
let t = 0;
beforeEach(() => {
  n = 0;
  t = 0;
});
const env = (): Env => ({ now: new Date(T0 + 60_000 * t++).toISOString(), id: () => `x${++n}` });
const run = (d: Data, verb: Verb) => runVerb(d, verb, env());
const ok = (d: Data, verb: Verb): Data => {
  const r = run(d, verb);
  expect(r.ok, `${JSON.stringify(verb)} refused: ${r.reason}`).toBe(true);
  return r.data;
};
const step = (id: string, text = id): Item => ({ id, text });
const seq = (id: string, words: string, items: Item[], extra: Record<string, unknown> = {}): Routine => ({ id, words, named: true, createdAt: '2026-11-01T00:00:00.000Z', items, ...extra });
const world = (...ss: Routine[]): Data => ({ ...emptyData(), routines: Object.fromEntries(ss.map((s) => [s.id, s])) });
/** Started, then put down (one thing runs at a time), so the next can start. */
const started = (d: Data, routineId: Id): { d: Data; id: Id } => {
  const r = run(d, { kind: 'start', routineId });
  expect(r.ok).toBe(true);
  return { d: ok(r.data, { kind: 'pause', runId: r.runId! }), id: r.runId! };
};
const names = (d: Data) => homeQueue(d).map((x) => x.name);

/** Four routines, each started in turn: A first, D last. */
function four() {
  let d = world(
    seq('A', 'Apply to Acme', [step('a1', 'Send the CV'), { id: 'a2', wait: 'a reply from Acme' }]),
    seq('B', 'Better drawer', [step('b1', 'Warm up'), { id: 'b2', ref: 'BH' }]),
    seq('BH', 'Get better at hands', [step('h1', 'Gesture practice'), step('h2', 'Read chapter 3, the wrist')], { named: false }),
    seq('C', 'Plan my day', [step('c1', 'Check the calendar'), step('c2', 'Pick three things')]),
    seq('D', 'Read a chapter', [step('d1', 'Read')]),
  );
  const ids: Record<string, Id> = {};
  for (const r of ['A', 'B', 'C', 'D']) ({ d, id: ids[r] } = started(d, r));
  return { d, ids };
}

describe('one list, no sections, in an order', () => {
  it('with no order stored (every run from before P-100), the rows read as home always showed them: the oldest started first', () => {
    const { d } = four();
    expect(names(d)).toEqual(['Apply to Acme', 'Better drawer', 'Plan my day', 'Read a chapter']);
    expect(Object.values(d.runs).every((r) => !('queue' in r))).toBe(true);
  });

  it('a run started goes to the bottom — also after the queue was reordered', () => {
    let { d, ids } = four();
    d = ok(d, { kind: 'queue', runId: ids.D, to: 'top' });
    d = ok(d, { kind: 'done', runId: ids.C, whole: true });
    const again = started(d, 'C');
    expect(names(again.d)).toEqual(['Read a chapter', 'Apply to Acme', 'Better drawer', 'Plan my day']);
    expect(homeQueue(again.d)[3].runId).toBe(again.id);
  });

  it('each row shows its routine, its step (the deepest level the run is in) and where it sits; a paused run its note; a waiting run what it waits for', () => {
    let { d, ids } = four();
    d = ok(d, { kind: 'resume', runId: ids.B });
    d = ok(d, { kind: 'next', runId: ids.B });
    d = ok(d, { kind: 'stepIn', runId: ids.B });
    d = ok(d, { kind: 'pause', runId: ids.B, reason: 'hands are tired' });
    d = ok(d, { kind: 'resume', runId: ids.A });
    d = ok(d, { kind: 'next', runId: ids.A });
    d = ok(d, { kind: 'pause', runId: ids.A });
    const [a, b, c] = homeQueue(d);
    expect(b).toMatchObject({ name: 'Better drawer', at: 'Gesture practice', path: ['Better drawer', 'Get better at hands'], reason: 'hands are tired', state: 'paused' });
    expect(tileLine(b).line).toBe('at Gesture practice');
    expect(a).toMatchObject({ name: 'Apply to Acme', state: 'waiting', waitingFor: 'a reply from Acme', path: ['Apply to Acme'] });
    expect(tileLine(a).line).toMatch(/^waiting for a reply from Acme/);
    expect(c).toMatchObject({ name: 'Plan my day', at: 'Check the calendar', path: ['Plan my day'] });
  });

  it('a run that finishes leaves the list; the others keep their order', () => {
    let { d, ids } = four();
    d = ok(d, { kind: 'queue', runId: ids.C, to: 'top' });
    d = ok(d, { kind: 'resume', runId: ids.D });
    d = ok(d, { kind: 'next', runId: ids.D });
    expect(readRun(d, ids.D)!.endedAt).toBeDefined();
    expect(names(d)).toEqual(['Plan my day', 'Apply to Acme', 'Better drawer']);
  });

  it('a pause, a resume or a step never reorders', () => {
    let { d, ids } = four();
    d = ok(d, { kind: 'resume', runId: ids.C });
    d = ok(d, { kind: 'next', runId: ids.C });
    d = ok(d, { kind: 'pause', runId: ids.C, reason: 'later' });
    expect(names(d)).toEqual(['Apply to Acme', 'Better drawer', 'Plan my day', 'Read a chapter']);
  });
});

describe('reordering', () => {
  it('Move up, Move down, To the top, and a drag of several rows', () => {
    let { d, ids } = four();
    d = ok(d, { kind: 'queue', runId: ids.C, to: -1 });
    expect(names(d)).toEqual(['Apply to Acme', 'Plan my day', 'Better drawer', 'Read a chapter']);
    d = ok(d, { kind: 'queue', runId: ids.A, to: 1 });
    expect(names(d)).toEqual(['Plan my day', 'Apply to Acme', 'Better drawer', 'Read a chapter']);
    d = ok(d, { kind: 'queue', runId: ids.D, to: 'top' });
    expect(names(d)).toEqual(['Read a chapter', 'Plan my day', 'Apply to Acme', 'Better drawer']);
    d = ok(d, { kind: 'queue', runId: ids.D, to: 3 });
    expect(names(d)).toEqual(['Plan my day', 'Apply to Acme', 'Better drawer', 'Read a chapter']);
    d = ok(d, { kind: 'queue', runId: ids.B, to: -2 });
    expect(names(d)).toEqual(['Better drawer', 'Plan my day', 'Apply to Acme', 'Read a chapter']);
    d = ok(d, { kind: 'queue', runId: ids.B, to: 1 });
    expect(names(d)).toEqual(['Plan my day', 'Better drawer', 'Apply to Acme', 'Read a chapter']);
  });

  it('past either end is refused and nothing changes; already at the top, To the top changes nothing', () => {
    const { d, ids } = four();
    expect(run(d, { kind: 'queue', runId: ids.A, to: -1 })).toMatchObject({ ok: false, reason: 'cannot', data: d });
    expect(run(d, { kind: 'queue', runId: ids.D, to: 1 })).toMatchObject({ ok: false, reason: 'cannot', data: d });
    expect(run(d, { kind: 'queue', runId: ids.B, to: 0.5 })).toMatchObject({ ok: false, reason: 'cannot', data: d });
    expect(run(d, { kind: 'queue', runId: ids.A, to: 'top' })).toMatchObject({ ok: true, data: d });
    expect(run(d, { kind: 'queue', runId: 'nope', to: 'top' })).toMatchObject({ ok: false, reason: 'gone', data: d });
  });

  it('an ended run is not a row: moving it is refused', () => {
    let { d, ids } = four();
    d = ok(d, { kind: 'done', runId: ids.B, whole: true });
    expect(run(d, { kind: 'queue', runId: ids.B, to: 'top' })).toMatchObject({ ok: false, reason: 'gone' });
  });

  it('one write: only `queue` changes, on the rows whose place changed; nothing else (not when it was touched, not "Last ran")', () => {
    const { d, ids } = four();
    const next = ok(d, { kind: 'queue', runId: ids.C, to: -1 });
    for (const id of Object.keys(d.runs)) {
      const { queue: _q, ...rest } = next.runs[id];
      expect(rest).toEqual(d.runs[id]);
    }
    expect(Object.fromEntries(Object.entries(next.runs).map(([id, r]) => [id, r.queue]))).toEqual({ [ids.A]: 1, [ids.C]: 2, [ids.B]: 3, [ids.D]: 4 });
    // A second move rewrites only the rows it changes.
    const again = ok(next, { kind: 'queue', runId: ids.B, to: 1 });
    expect(again.runs[ids.A]).toBe(next.runs[ids.A]);
    expect(again.runs[ids.C]).toBe(next.runs[ids.C]);
  });

  it('the notice names it: "Moved “Plan my day” up / down / to the top"', () => {
    const { d, ids } = four();
    expect(whatChanged(d, { kind: 'queue', runId: ids.C, to: -1 })).toBe('Moved “Plan my day” up');
    expect(whatChanged(d, { kind: 'queue', runId: ids.C, to: 1 })).toBe('Moved “Plan my day” down');
    expect(whatChanged(d, { kind: 'queue', runId: ids.C, to: 'top' })).toBe('Moved “Plan my day” to the top');
  });
});

describe('the stored order, read', () => {
  // (F-3, rewritten: owner ruling 2026-11-28 (F-3 authorised; the repo's rule for unknown data, DESIGN.md): "kept, never
  // written over" — this test used to pin that a move renumbered an unreadable `queue` ('first' became 4).)
  it('a run without `queue` stands by when it was started; one with it, by its number; a `queue` this version cannot read is ignored, and kept as stored when another row moves', () => {
    const { d, ids } = four();
    const odd = { ...d, runs: { ...d.runs, [ids.D]: { ...d.runs[ids.D], queue: 'first' } } };
    expect(readRun(odd, ids.D)!.queue).toBeUndefined();
    expect(names(odd)).toEqual(['Apply to Acme', 'Better drawer', 'Plan my day', 'Read a chapter']);
    expect(queueKey(readRun(d, ids.A)!)).toBe(Date.parse(d.runs[ids.A].startedAt));
    expect(homeQueue(odd).length).toBe(4);
    expect(odd.runs[ids.D].queue).toBe('first');
    const moved = ok(odd, { kind: 'queue', runId: ids.A, to: 1 });
    expect(names(moved)).toEqual(['Better drawer', 'Apply to Acme', 'Plan my day', 'Read a chapter']);
    expect(moved.runs[ids.D].queue).toBe('first');
  });

  it('two open runs of one routine (only an import makes them): one row, the one touched last', () => {
    const { d, ids } = four();
    const twin = { ...d.runs[ids.A], id: 'twin', touchedAt: '2020-01-01T00:00:00.000Z' };
    const both = { ...d, runs: { ...d.runs, twin } };
    expect(queueRuns(both).map((r) => r.id)).toEqual([ids.A, ids.B, ids.C, ids.D]);
  });
});
