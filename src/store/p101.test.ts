/**
 * P-101 (contract rulings 1, 3, 6): the store's side of the moves (Step out keeps an Undo; Next and Step in
 * do not), Pause with its note, and calmer notices — a Plan edit gives none (its Undo stays, for the
 * routine's menu), a notice goes at the next tap or screen change and is never shown on another screen,
 * except the one an action itself carries to the screen it lands on (Done home, Remove home).
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { readRun } from '@/domain/run';
import { Data, emptyData, Id } from '@/domain/types';

import { useStore } from './useStore';

const st = () => useStore.getState();
const at = '2026-11-01T00:00:00.000Z';
const seeded = (): Data => ({
  ...emptyData(),
  routines: {
    M: { id: 'M', words: 'MyStack', named: true, createdAt: at, home: true, items: [{ id: 'vc', ref: 'V' }, { id: 'pick', text: 'Pick a task' }] },
    V: { id: 'V', words: 'Vibe check', named: true, createdAt: at, items: [{ id: 'feel', text: 'Feel' }, { id: 'name', text: 'Name it' }] },
  },
});
const started = (routineId: Id) => {
  const r = st().startRoutine(routineId);
  if (!r.ok || !r.runId) throw new Error('not started');
  return r.runId;
};

beforeEach(() => {
  useStore.setState({ data: seeded(), undo: undefined, toast: undefined, runNotice: undefined, toVerb: undefined, storage: { state: 'ready', kind: 'sqlite' } });
});

describe('ruling 1: the moves', () => {
  it('Step in and Next leave no Undo; Step out (it can skip steps) leaves one, named, and it puts the run back inside', () => {
    const id = started('M');
    st().stepIn(id);
    expect([st().undo, st().runNotice]).toEqual([undefined, undefined]);
    st().nextStep(id);
    expect([st().undo, st().runNotice]).toEqual([undefined, undefined]);
    const inside = st().data;
    st().doneLevel(id);
    expect(readRun(st().data, id)!.frames).toHaveLength(1);
    expect(st().runNotice).toMatchObject({ verb: 'done', text: 'Done with Vibe check' });
    expect(st().runNotice!.entry).toBe(st().undo);
    st().undoLast();
    expect(st().data.runs[id]).toEqual(inside.runs[id]);
  });
});

describe('ruling 3: Pause with a note', () => {
  it('the note is stored as the run’s reason (lines kept), no Undo; emptied on the next Pause, it goes', () => {
    const id = started('M');
    expect(st().pauseRun(id, 'Notion page: budget\nsecond tab')).toEqual({ ok: true, runId: id, home: true });
    expect(readRun(st().data, id)!.reason).toBe('Notion page: budget\nsecond tab');
    expect(st().undo).toBeUndefined();
    st().resumeRun(id);
    st().pauseRun(id, '');
    expect(readRun(st().data, id)!.reason).toBeUndefined();
  });
});

describe('ruling 3, while the page does not hold the data (P-29)', () => {
  it('a bare Pause is kept and applied once the data is back; one with a note is refused — nothing kept, nothing changed', () => {
    const id = started('M');
    const before = st().data;
    useStore.setState({ storage: { state: 'ready', kind: 'sqlite', reconnecting: true } });
    expect(st().pauseRun(id, 'a note')).toEqual({ ok: false, reason: 'reconnecting' });
    expect(st().toVerb).toBeUndefined();
    expect(st().data).toBe(before);
    expect(st().pauseRun(id)).toEqual({ ok: false, reason: 'reconnecting' });
    expect(st().toVerb).toMatchObject({ runId: id, verb: 'pause' });
    useStore.setState({ storage: { state: 'ready', kind: 'sqlite' } });
    st().verbMarked();
    expect(readRun(st().data, id)!.status).toBe('paused');
  });
});

describe('amendment, rulings 9–10: Start over, and a value given late', () => {
  it('Start over: the place and the values go, with a notice and one Undo that brings both back; inside a call, only that level', () => {
    const id = started('M');
    st().stepIn(id);
    const inside = st().data;
    expect(st().restartRun(id, 0)).toEqual({ ok: true, runId: id });
    expect(readRun(st().data, id)!.frames).toEqual([{ seq: 'M', at: 'vc', round: 1 }]);
    expect(st().runNotice).toMatchObject({ verb: 'restart', text: 'Started MyStack over', label: 'Start over' });
    expect(st().runNotice!.entry).toBe(st().undo);
    st().undoLast();
    expect(st().data.runs[id]).toEqual(inside.runs[id]);
    st().nextStep(id);
    expect(st().restartRun(id, 1).ok).toBe(true);
    expect(readRun(st().data, id)!.frames.map((f) => f.at)).toEqual(['vc', 'feel']);
    expect(st().runNotice).toMatchObject({ text: 'Started Vibe check over' });
  });

  it('a name given by a step already passed, given now from the step the run is on: no notice (a first value), kept on the run', () => {
    useStore.setState({ data: { ...seeded(), routines: { ...seeded().routines, M: { ...seeded().routines.M, items: [{ id: 'g', text: 'Choose', out: 'topic' }, { id: 'pick', text: 'Pick a task' }] } } } as Data });
    const id = started('M');
    st().nextStep(id);
    expect(st().typeValue(id, 'pick', 'topic', 'maths')).toEqual({ ok: true, runId: id });
    expect(st().runNotice).toBeUndefined();
    // (Audit F2: the giving step's value; `words` is the step it was given at.)
    expect(readRun(st().data, id)!.values).toMatchObject([{ name: 'topic', items: ['maths'], level: 0, item: 'g', words: 'Pick a task' }]);
  });
});

describe('after the audit, F1/F8: Undo outlives the notice — until the next change', () => {
  it('Start over → a tap → Undo still restores place and values; a Plan edit’s Undo survives screen changes; the next change ends both', () => {
    useStore.setState({ data: { ...seeded(), routines: { ...seeded().routines, M: { ...seeded().routines.M, items: [{ id: 'g', text: 'Choose', out: 'topic' }, { id: 'pick', text: 'Pick a task' }] } } } as Data });
    const id = started('M');
    st().typeValue(id, 'g', 'topic', 'maths');
    st().nextStep(id);
    const before = st().data.runs[id];
    st().restartRun(id, 0);
    st().tapped();
    st().screenChanged();
    expect(st().undoLast()).toBe(true);
    expect(st().data.runs[id]).toEqual(before);
    st().editRoutine('M', { kind: 'addStep', text: 'Do it' });
    st().screenChanged();
    st().screenChanged();
    expect(st().runNotice).toMatchObject({ quiet: true });
    expect(st().runNotice!.entry).toBe(st().undo);
    st().pauseRun(id);
    expect(st().undo).toBeUndefined();
  });
});

describe('ruling 6: notices', () => {
  it('a Plan edit gives no notice to show (`quiet`) — its Undo is still there, the last action’s, and takes it back', () => {
    const before = st().data;
    st().editRoutine('M', { kind: 'addStep', text: 'Do it' });
    expect(st().runNotice).toMatchObject({ verb: 'editRoutine', text: 'Added “Do it”', quiet: true });
    expect(st().runNotice!.entry).toBe(st().undo);
    expect(st().undoLast()).toBe(true);
    expect(st().data).toEqual(before);
  });

  it('removing a routine (its screen goes) is not quiet: the notice goes with it to home, once', () => {
    st().editRoutine('V', { kind: 'removeRoutine' });
    expect(st().runNotice).toMatchObject({ text: 'Removed “Vibe check”', follows: true });
    expect(st().runNotice!.quiet).toBeUndefined();
    st().screenChanged();
    expect(st().runNotice).toMatchObject({ text: 'Removed “Vibe check”' });
    expect(st().runNotice!.follows).toBeUndefined();
    expect(st().runNotice!.hidden).toBeUndefined();
    st().screenChanged();
    // Audit F1: hidden, its Undo kept until the next change.
    expect(st().runNotice).toMatchObject({ hidden: true });
    expect(st().runNotice!.entry).toBe(st().undo);
  });

  it('the Next that ends the run carries "Done with <name>" home; Step out’s notice stays on the runner — and goes at the next screen change', () => {
    const id = started('M');
    st().stepIn(id);
    st().doneLevel(id);
    expect(st().runNotice!.follows).toBeUndefined();
    st().screenChanged();
    expect(st().runNotice).toMatchObject({ hidden: true });
    st().nextStep(id);
    expect(st().runNotice).toMatchObject({ text: 'Done with MyStack', follows: true });
    st().screenChanged();
    expect(st().runNotice).toMatchObject({ text: 'Done with MyStack' });
  });

  it('a tap anywhere puts a shown notice away — audit F1: its Undo stays (the panel’s row, Ctrl/⌘+Z) until the next change; a quiet one (a Plan edit) stays, for the routine’s menu', () => {
    const id = started('M');
    st().stepIn(id);
    const inside = st().data;
    st().doneLevel(id);
    st().tapped();
    expect(st().runNotice).toMatchObject({ hidden: true });
    expect(st().runNotice!.entry).toBe(st().undo);
    expect(st().undoLast()).toBe(true);
    expect(st().data.runs[id]).toEqual(inside.runs[id]);
    st().editRoutine('M', { kind: 'addStep', text: 'Do it' });
    st().tapped();
    expect(st().runNotice).toMatchObject({ quiet: true });
    expect(st().runNotice!.entry).toBe(st().undo);
  });
});
