/**
 * P-111: two owner rulings that correct P-110's engine (relayed by the coordinator, 2026-11-27), and the for each tie
 * the P-110 investigator reproduced:
 * 1. "Back keeps it." Back onto the step that gives a value keeps it, shown in that step's field to keep or change.
 *    Only Jump, Repeat from here, Start over and a new round clear the value on the step they land on.
 * 2. "A Plan edit never clears a run's values." A Plan edit (drag, move, remove) that puts the giving step below the
 *    place leaves the value stored: hidden while its step is below the place, shown again in that step's field when the
 *    run reaches it. No later move deletes it; only moves of the place itself clear values, per rule 1.
 * Expected values are the rulings' words, not the engine's output.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { editRoutine, Env, Item, place, readRun, Result, RoutineEdit, runVerb, Verb } from './run';
import { runnerView } from './runView';
import { Data, emptyData, Id, Routine } from './types';

const T0 = Date.UTC(2026, 10, 28, 1, 0, 0);
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
const step = (id: string, text = id): Item => {
  const m = /^(.*?)\s*>(\S.*)$/.exec(text);
  return m ? ({ id, text: m[1], out: m[2] } as Item) : { id, text };
};
const ref = (id: string, to: string): Item => ({ id, ref: to }) as Item;
const seq = (id: string, words: string, items: Item[], extra: Record<string, unknown> = {}): Routine => ({ id, words, named: true, createdAt: '2026-11-01T00:00:00.000Z', items, ...extra });
const block = (id: string, item: string, list: string, items: Item[], each: Record<string, unknown> = {}): Routine => seq(id, `For each ${item} in {${list}}`, items, { named: false, each: { item, list, ...each } });
const world = (...ss: Routine[]): Data => ({ ...emptyData(), routines: Object.fromEntries(ss.map((s) => [s.id, s])) });
const run = (d: Data, id: Id) => readRun(d, id)!;
const start = (d: Data, routineId: Id) => {
  const r = go(d, { kind: 'start', routineId });
  expect(r.ok, `start refused: ${r.reason}`).toBe(true);
  return { d: r.data, id: r.runId! };
};
const next = (d: Data, runId: Id, times = 1) => {
  for (let i = 0; i < times; i++) d = ok(d, { kind: 'next', runId });
  return d;
};
const here = (d: Data, id: Id) => place(d, run(d, id))!.item!.id;
const words = (d: Data, id: Id) => runnerView(d, id)!.step.parts.map((p) => (p.kind === 'blank' ? `{${p.name}}` : p.text)).join('');
const give = (d: Data, runId: Id, name: string, text: string) => ok(d, { kind: 'value', runId, name, text, item: here(d, runId) });
const shown = (d: Data, id: Id) => runnerView(d, id)!.values.map((v) => `${v.name}: ${v.text}`);
const stored = (d: Data, id: Id) => run(d, id).values.map((v) => `${v.name}: ${v.items.join(', ')}`);


/** "Write the post": the giver first. */
const post = () => world(seq('P', 'Write the post', [step('choose', 'Choose a subject >subject'), step('draft', 'Draft {subject}'), step('edit', 'Edit {subject}')]));
const field = (d: Data, id: Id) => runnerView(d, id)!.fields.map((f) => `${f.name}: ${f.text}`);

describe('ruling 1: Back keeps it', () => {
  it('Back onto the giving step keeps the value, in its field to keep or change; nothing is said cleared', () => {
    const s = start(post(), 'P');
    const d = next(give(s.d, s.id, 'subject', 'tides'), s.id);
    const r = go(d, { kind: 'back', runId: s.id });
    expect(here(r.data, s.id)).toBe('choose');
    expect(field(r.data, s.id)).toEqual(['subject: tides']);
    expect(stored(r.data, s.id)).toEqual(['subject: tides']);
    expect(r.cleared ?? []).toEqual([]);
    // Kept as it is, Next goes on with it.
    expect(words(next(r.data, s.id), s.id)).toBe('Draft tides');
  });

  it('Back twice, past the giving step: still stored (hidden above nothing), and it shows again when the run reaches it', () => {
    const d0 = world(seq('Q', 'Q', [step('a', 'Warm up'), step('choose', 'Choose a subject >subject'), step('draft', 'Draft {subject}')]));
    const s = start(d0, 'Q');
    let d = next(give(next(s.d, s.id), s.id, 'subject', 'tides'), s.id);
    d = ok(ok(d, { kind: 'back', runId: s.id }), { kind: 'back', runId: s.id });
    expect(here(d, s.id)).toBe('a');
    expect(shown(d, s.id)).toEqual([]);
    expect(stored(d, s.id)).toEqual(['subject: tides']);
    d = next(d, s.id);
    expect(field(d, s.id)).toEqual(['subject: tides']);
    expect(words(next(d, s.id), s.id)).toBe('Draft tides');
  });

  it('Jump and Start over still clear the value on the step they land on (with the move’s Undo)', () => {
    const s = start(post(), 'P');
    const d = next(give(s.d, s.id, 'subject', 'tides'), s.id, 2);
    const jumped = go(d, { kind: 'jump', runId: s.id, to: { path: ['choose'] } });
    expect(stored(jumped.data, s.id)).toEqual([]);
    expect(jumped.cleared).toEqual(['subject']);
    const over = go(d, { kind: 'restart', runId: s.id, level: 0 } as Verb);
    expect(over.ok).toBe(true);
    expect(stored(over.data, s.id)).toEqual([]);
  });

  it('a for each: Back inside round 2 onto the giving step keeps round 2’s value; Back from after the loop onto its last round keeps it too', () => {
    const d0 = world(seq('D', 'Drawing', [step('list', 'List photos >photos'), ref('row', 'E'), step('show', 'Show {drawing}')]), block('E', 'photo', 'photos', [step('sk', 'Sketch {photo} >drawing'), step('look', 'Look at {drawing}')]));
    const s = start(d0, 'D');
    let d = ok(s.d, { kind: 'value', runId: s.id, name: 'photos', text: 'a\nb', items: ['a', 'b'], item: 'list' });
    d = next(d, s.id);
    d = next(give(d, s.id, 'drawing', 'A'), s.id, 2);
    d = next(give(d, s.id, 'drawing', 'B'), s.id);
    expect(here(d, s.id)).toBe('look');
    expect(words(d, s.id)).toBe('Look at B');
    const inside = go(d, { kind: 'back', runId: s.id });
    expect(here(inside.data, s.id)).toBe('sk');
    expect(field(inside.data, s.id)).toEqual(['drawing: B']);
    expect(inside.cleared ?? []).toEqual([]);
    const past = next(d, s.id);
    expect(here(past, s.id)).toBe('show');
    const out = go(past, { kind: 'back', runId: s.id });
    expect(out.cleared ?? []).toEqual([]);
    expect(stored(out.data, s.id)).toEqual(stored(past, s.id));
  });
});

describe('ruling 2: a Plan edit never clears a run’s values', () => {
  it('the giving step moved below the place: stored, hidden; Next past steps before it keeps it; reached, it shows in its field', () => {
    const s = start(post(), 'P');
    let d = next(give(s.d, s.id, 'subject', 'tides'), s.id);
    expect(here(d, s.id)).toBe('draft');
    // Plan: "Choose a subject" dragged to the end — below the place.
    d = okEdit(d, 'P', { kind: 'move', item: 'choose', by: 2 });
    expect(stored(d, s.id)).toEqual(['subject: tides']);
    expect(shown(d, s.id)).toEqual([]);
    d = next(d, s.id);
    expect(here(d, s.id)).toBe('edit');
    expect(stored(d, s.id)).toEqual(['subject: tides']);
    expect(shown(d, s.id)).toEqual([]);
    d = next(d, s.id);
    expect(here(d, s.id)).toBe('choose');
    expect(field(d, s.id)).toEqual(['subject: tides']);
  });

  it('a later Jump (not onto it) keeps it too; a Jump onto it clears it (ruling 1)', () => {
    const d0 = world(seq('Q', 'Q', [step('choose', 'Choose a subject >subject'), step('draft', 'Draft {subject}'), step('edit', 'Edit {subject}'), step('ship', 'Ship it')]));
    const s = start(d0, 'Q');
    let d = next(give(s.d, s.id, 'subject', 'tides'), s.id);
    d = okEdit(d, 'Q', { kind: 'move', item: 'choose', by: 3 });
    d = ok(d, { kind: 'jump', runId: s.id, to: { path: ['edit'] } });
    expect(stored(d, s.id)).toEqual(['subject: tides']);
    const onto = go(d, { kind: 'jump', runId: s.id, to: { path: ['choose'] } });
    expect(stored(onto.data, s.id)).toEqual([]);
  });

  it('Back after the edit keeps it (Back clears nothing)', () => {
    const s = start(post(), 'P');
    let d = next(give(s.d, s.id, 'subject', 'tides'), s.id, 2);
    d = okEdit(d, 'P', { kind: 'move', item: 'choose', by: 2 });
    d = ok(d, { kind: 'back', runId: s.id });
    expect(stored(d, s.id)).toEqual(['subject: tides']);
  });
});
