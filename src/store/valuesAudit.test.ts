/**
 * P-96, fixes after the audit (.polish/current/P-96/audit.md), each from the auditor's probes:
 * F1 Undo of a Jump / Done brings its values back even after a value was typed since — and keeps that
 *    typed value (Undo merges values entry by entry: nothing typed is ever dropped by an Undo);
 * F2 Back to across a round boundary that clears a value says so, with Undo (never a silent loss);
 * F3 replacing or clearing an already-filled value in the step's own field leaves "Changed / Cleared
 *    {x}" with Undo, once per edit (ruling 4) — and that Undo survives the Next that follows;
 * F4 a value whose giving step was removed in Plan is cleared by the next new round (readers ask again);
 * F5 on a last step that is a wait, the forward button reads Done when pressing it ends the run.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { place, readRun } from '@/domain/run';
import { runnerView } from '@/domain/runView';
import { Data, emptyData, Id } from '@/domain/types';

import { useStore } from './useStore';

const st = () => useStore.getState();
const at = '2026-11-01T00:00:00.000Z';
const seeded = (): Data => ({
  ...emptyData(),
  routines: {
    R: {
      id: 'R', words: 'Loop', named: true, createdAt: at, home: true, repeatFrom: 1,
      items: [{ id: 's', text: 'Setup', out: 'base' }, { id: 'pick', text: 'Pick', out: 'feature' }, { id: 'test', text: 'Test {feature} on {base}' }],
    } as never,
    Q: { id: 'Q', words: 'Outer', named: true, createdAt: at, home: true, items: [{ id: 'a', text: 'A', out: 'x' }, { id: 'call', ref: 'T' }, { id: 'b', text: 'B', out: 'y' }, { id: 'z', text: 'Z {x} {y}' }] } as never,
    T: { id: 'T', words: 'Inner', named: true, createdAt: at, items: [{ id: 't1', text: 'T1', out: 'inner' }, { id: 't2', text: 'T2 {inner}' }] } as never,
    W: { id: 'W', words: 'Wait last', named: true, createdAt: at, home: true, items: [{ id: 'w0', text: 'Send it' }, { id: 'w1', wait: 'a reply' }] } as never,
  },
});
const started = (r: Id) => {
  const d = st().startRoutine(r);
  if (!d.ok || !d.runId) throw new Error('no');
  return d.runId;
};
const vals = (id: Id) => readRun(st().data, id)!.values.map((e) => `${e.level}:${e.name}=${e.items.join('|')}`).sort();
const here = (id: Id) => place(st().data, readRun(st().data, id)!)!.item!.id;
const round = (id: Id) => readRun(st().data, id)!.frames[0].round;

beforeEach(() => {
  useStore.setState({ data: seeded(), undo: undefined, toast: undefined, runNotice: undefined, toVerb: undefined, storage: { state: 'ready', kind: 'sqlite' } });
});

describe('F1: Undo never drops a typed value, and brings back what the action cleared', () => {
  it('Jump to the start (round 2 → 1, {feature} cleared), then a value typed, then Undo: back in round 2 with signup — and the typed base kept', () => {
    const id = started('R');
    st().typeValue(id, 's', 'base', 'web');
    st().nextStep(id);
    st().typeValue(id, 'pick', 'feature', 'login');
    st().nextStep(id);
    st().nextStep(id);
    st().typeValue(id, 'pick', 'feature', 'signup');
    st().jumpTo(id, { level: 0 } as never);
    // (P-110, rewritten: was ['0:base=web'] — the start of the level is "Setup", which gives {base}: moving the place
    // back onto it clears {base} too. The rest of F1 stands: the Undo keeps what was typed since.)
    expect(vals(id)).toEqual([]);
    st().typeValue(id, 's', 'base', 'mobile');
    expect(st().undoLast()).toBe(true);
    expect([here(id), round(id)]).toEqual(['pick', 2]);
    expect(vals(id)).toEqual(['0:base=mobile', '0:feature=signup']);
  });

  it('Done (Finish now) on a routine entered as a step, a value typed above, then Undo: back inside with its value', () => {
    const id = started('Q');
    st().typeValue(id, 'a', 'x', 'one');
    st().nextStep(id);
    st().stepIn(id);
    st().typeValue(id, 't1', 'inner', 'deep');
    st().doneLevel(id);
    expect(here(id)).toBe('b');
    st().typeValue(id, 'b', 'y', 'two');
    expect(st().undoLast()).toBe(true);
    expect(here(id)).toBe('t1');
    expect(vals(id)).toEqual(['0:x=one', '0:y=two', '1:inner=deep']);
  });
});

describe('F2: Back to across a round boundary', () => {
  // (F-3, rewritten: owner ruling 2026-11-28: "Keeps across rounds" — Back never clears; only a new round, going forward,
  // clears. This test used to pin "Cleared {feature}" with an Undo.)
  it('a value typed in the new round, then Back into the round before: kept, no notice and no Undo', () => {
    const id = started('R');
    st().typeValue(id, 's', 'base', 'web');
    st().nextStep(id);
    st().typeValue(id, 'pick', 'feature', 'login');
    st().nextStep(id);
    st().nextStep(id);
    st().typeValue(id, 'pick', 'feature', 'signup');
    st().backTo(id);
    expect([here(id), round(id)]).toEqual(['test', 1]);
    expect(st().runNotice).toBeUndefined();
    expect(st().undo).toBeUndefined();
    expect(vals(id)).toEqual(['0:base=web', '0:feature=signup']);
  });

  // (P-111, restored: owner ruling Back keeps it — P-110 had moved this to a Back from "Test" to "Pick".)
  it('Back to that clears nothing still leaves no notice and no Undo (P-95)', () => {
    const id = started('R');
    st().typeValue(id, 's', 'base', 'web');
    st().nextStep(id);
    st().backTo(id);
    expect(st().runNotice).toBeUndefined();
    expect(st().undo).toBeUndefined();
  });
});

describe('F3: typing over a filled value in the step’s own field (ruling 4)', () => {
  // (P-111, restored: owner ruling Back keeps it — P-110 had dropped the Next then Back to "Setup" before reopening its field.)
  it('cleared: "Cleared {base}" with Undo, once; Undo brings it back', () => {
    const id = started('R');
    st().typeValue(id, 's', 'base', 'web');
    st().nextStep(id);
    st().backTo(id);
    for (const t of ['we', 'w', '']) st().typeValue(id, 's', 'base', t);
    // Per keystroke: nothing. Once the edit is over (the field is left): one notice.
    expect(st().runNotice).toBeUndefined();
    st().typedOver(id, 's', 'base', 'web');
    expect(st().runNotice?.text).toBe('Cleared {base}');
    expect(st().undoLast()).toBe(true);
    expect(vals(id)).toEqual(['0:base=web']);
  });

  it('replaced: "Changed {base}"; the Next that follows keeps its Undo, and Undo restores the value where the run now is', () => {
    const id = started('R');
    st().typeValue(id, 's', 'base', 'web');
    st().nextStep(id);
    st().backTo(id);
    st().typeValue(id, 's', 'base', 'mobile');
    st().typedOver(id, 's', 'base', 'web');
    expect(st().runNotice?.text).toBe('Changed {base}');
    st().nextStep(id);
    expect(here(id)).toBe('pick');
    expect(st().runNotice?.text).toBe('Changed {base}');
    expect(st().undoLast()).toBe(true);
    expect(here(id)).toBe('pick');
    expect(vals(id)).toEqual(['0:base=web']);
  });

  it('first giving and an edit that ends where it began leave nothing', () => {
    const id = started('R');
    st().typeValue(id, 's', 'base', 'web');
    st().typedOver(id, 's', 'base', '');
    expect(st().runNotice).toBeUndefined();
    st().typeValue(id, 's', 'base', 'webx');
    st().typeValue(id, 's', 'base', 'web');
    st().typedOver(id, 's', 'base', 'web');
    expect(st().runNotice).toBeUndefined();
  });
});

describe('F4: a value whose giving step was removed in Plan', () => {
  it('is cleared by the next new round: its readers ask again', () => {
    const id = started('R');
    st().typeValue(id, 's', 'base', 'web');
    st().nextStep(id);
    st().typeValue(id, 'pick', 'feature', 'login');
    st().nextStep(id);
    st().editRoutine('R', { kind: 'remove', item: 'pick' } as never);
    // This round it still reads (nothing is taken mid-round).
    expect(runnerView(st().data, id)!.step.parts.map((p) => p.kind)).toContain('value');
    st().nextStep(id);
    expect(round(id)).toBe(2);
    expect(vals(id)).toEqual(['0:base=web']);
    expect(runnerView(st().data, id)!.fields.map((f) => f.name)).toEqual(['feature']);
  });
});

describe('F5: a wait that is the last step', () => {
  it('the forward button reads Done when pressing it ends the run', () => {
    const id = started('W');
    st().nextStep(id);
    expect(runnerView(st().data, id)!.step.kind).toBe('wait');
    expect(runnerView(st().data, id)!.next).toBe('done');
  });

  it('a wait that is not last still reads "It’s happened"', () => {
    useStore.setState({ data: { ...seeded(), routines: { ...seeded().routines, W: { id: 'W', words: 'Wait', named: true, createdAt: at, home: true, items: [{ id: 'w1', wait: 'a reply' }, { id: 'w2', text: 'Log it' }] } as never } } });
    const id = started('W');
    expect(runnerView(st().data, id)!.next).toBe('itsHappened');
  });
});
