/**
 * P-96: the store's side of values and of rulings 7–8. Undo (ruling 4) only when an existing value is
 * replaced or cleared (the value sheet) and for Plan's Gives… / rename / remove — first giving and typing
 * in a step's own field leave no notice and leave the Undo slot alone. Finishing ends the run and says
 * "go home" with "Done with <name>" and Undo (never Plan); Pause says "go home" too. Typing while
 * reconnecting is refused and changes nothing (the screen keeps the text).
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { readRun } from '@/domain/run';
import { homeShown, runnerView } from '@/domain/runView';
import { Data, emptyData, Id } from '@/domain/types';

import { useStore } from './useStore';

const st = () => useStore.getState();
const json = (v: unknown) => JSON.parse(JSON.stringify(v));
const at = '2026-11-01T00:00:00.000Z';
const seeded = (): Data => ({
  ...emptyData(),
  routines: {
    D: {
      id: 'D',
      words: 'Drawing practice',
      named: true,
      createdAt: at,
      home: true,
      open: true,
      items: [{ id: 'sel', text: 'Select the subject matter', out: 'subject' }, { id: 'find', text: 'Find photos of {subject}' }, { id: 'rank', text: 'Rank them' }],
    },
    P: { id: 'P', words: 'Practice', named: true, createdAt: at, home: true, items: [{ id: 'p1', text: 'Warm up' }, { id: 'call', ref: 'S' }, { id: 'p2', text: 'Rest' }] },
    S: { id: 'S', words: 'Sketch', named: true, createdAt: at, items: [{ id: 's1', text: 'Draw' }] },
  },
});
const started = (routineId: Id) => {
  const r = st().startRoutine(routineId);
  if (!r.ok || !r.runId) throw new Error('not started');
  return r.runId;
};
const value = (id: Id) => readRun(st().data, id)!.values.map((e) => e.items.join('|'));

beforeEach(() => {
  useStore.setState({ data: seeded(), undo: undefined, toast: undefined, runNotice: undefined, toVerb: undefined, storage: { state: 'ready', kind: 'sqlite' } });
});

describe('giving and changing a value', () => {
  it('typing in the step’s own field: kept keystroke by keystroke, no notice, and the Undo slot is left as it was', () => {
    const id = started('D');
    st().editRoutine('S', { kind: 'reword', item: 's1', text: 'Draw it' });
    const slot = st().undo;
    const notice = st().runNotice;
    expect(slot).toBeDefined();
    for (const s of ['f', 'fi', 'figures']) expect(st().typeValue(id, 'sel', 'subject', s)).toEqual({ ok: true, runId: id });
    expect(value(id)).toEqual(['figures']);
    expect([st().undo, st().runNotice]).toEqual([slot, notice]);
    // Next leaves no Undo either (P-95), and the value is read on the next step.
    st().nextStep(id);
    expect(runnerView(st().data, id)!.step.parts).toEqual([{ kind: 'text', text: 'Find photos of ' }, { kind: 'value', name: 'subject', text: 'figures' }]);
  });

  it('a step that asks: typing there is the same (no notice)', () => {
    const id = started('D');
    st().nextStep(id);
    expect(st().typeValue(id, 'find', 'subject', 'hands').ok).toBe(true);
    expect([value(id), st().runNotice]).toEqual([['hands'], undefined]);
  });

  it('the value sheet: replacing a value says "Changed {name}" with an Undo that brings the old one back', () => {
    const id = started('D');
    st().typeValue(id, 'sel', 'subject', 'hands');
    st().nextStep(id);
    const before = st().data;
    expect(st().changeValue(id, 'subject', 'feet')).toEqual({ ok: true, runId: id });
    expect(value(id)).toEqual(['feet']);
    expect(st().runNotice).toMatchObject({ verb: 'value', text: 'Changed {subject}', label: 'Change' });
    expect(st().runNotice!.entry).toBe(st().undo);
    st().undoLast();
    expect(json(st().data)).toEqual(json(before));
  });

  it('the value sheet: clearing says "Cleared {name}", with Undo', () => {
    const id = started('D');
    st().typeValue(id, 'sel', 'subject', 'hands');
    const before = st().data;
    st().changeValue(id, 'subject', '  ');
    expect(value(id)).toEqual([]);
    expect(st().runNotice).toMatchObject({ text: 'Cleared {subject}' });
    st().undoLast();
    expect(json(st().data)).toEqual(json(before));
  });

  it('the sheet with nothing to change, or the same text: refused or nothing written — no notice, the Undo slot kept', () => {
    const id = started('D');
    expect(st().changeValue(id, 'subject', 'x')).toEqual({ ok: false, reason: 'cannot' });
    st().typeValue(id, 'sel', 'subject', 'x');
    const was = st();
    expect(st().changeValue(id, 'subject', 'x')).toEqual({ ok: true, runId: id });
    expect([st().data, st().undo, st().runNotice]).toEqual([was.data, was.undo, was.runNotice]);
  });

  it('while reconnecting, typing and the sheet are refused and nothing changes (the screen keeps the text)', () => {
    const id = started('D');
    useStore.setState({ storage: { state: 'ready', kind: 'sqlite', reconnecting: true } });
    const was = st().data;
    expect(st().typeValue(id, 'sel', 'subject', 'x')).toEqual({ ok: false, reason: 'reconnecting' });
    expect(st().changeValue(id, 'subject', 'x')).toEqual({ ok: false, reason: 'reconnecting' });
    expect(st().data).toBe(was);
  });
});

describe('Plan: Gives…, rename, remove — each with Undo (ruling 4)', () => {
  it('Gives… names itself and its Undo takes it back; renaming a name takes the routine and its run back together', () => {
    const id = started('D');
    st().typeValue(id, 'sel', 'subject', 'hands');
    st().planRun(id);
    const before = st().data;
    expect(st().editRoutine('D', { kind: 'gives', item: 'rank', name: 'best' }).ok).toBe(true);
    expect(st().runNotice).toMatchObject({ text: '“Rank them” gives {best}', label: 'Change' });
    st().undoLast();
    expect(json(st().data)).toEqual(json(before));
    expect(st().editRoutine('D', { kind: 'renameValue', from: 'subject', to: 'topic' }).ok).toBe(true);
    expect(st().runNotice).toMatchObject({ text: 'Renamed {subject} to {topic}' });
    expect(readRun(st().data, id)!.values[0].name).toBe('topic');
    st().undoLast();
    expect(json(st().data)).toEqual(json(before));
    expect(st().editRoutine('D', { kind: 'gives', item: 'sel' }).ok).toBe(true);
    expect(st().runNotice).toMatchObject({ text: '“Select the subject matter” gives nothing' });
  });
});

describe('finishing and pausing go home (ruling 7)', () => {
  it('Next on the last step ends the run: "go home", "Done with <name>" — P-102: with no Undo (was: with Undo) — never Plan', () => {
    const id = started('D');
    st().nextStep(id);
    st().nextStep(id);
    expect(st().nextStep(id)).toEqual({ ok: true, runId: id, home: true });
    expect(readRun(st().data, id)!.endedAt).toBeDefined();
    expect(st().runNotice).toMatchObject({ verb: 'next', text: 'Done with Drawing practice' });
    expect(st().undo).toBeUndefined();
    const ended = st().data;
    st().undoLast();
    expect(st().data).toBe(ended);
  });

  it('Finish now (Done) at the top: "go home"; on a routine entered as a step it goes on, not home', () => {
    const id = started('P');
    st().nextStep(id);
    st().stepIn(id);
    expect(st().doneLevel(id)).toEqual({ ok: true, runId: id });
    expect(runnerView(st().data, id)!.step.words).toBe('Rest');
    expect(st().doneLevel(id)).toEqual({ ok: true, runId: id, home: true });
    expect(st().runNotice).toMatchObject({ text: 'Done with Practice' });
  });

  it('Pause: "go home"; P-101 (ruling 5; was "the paused run is first on home"): the paused run keeps its place and is the one marked "last"', () => {
    const other = started('P');
    st().pauseRun(other);
    const id = started('D');
    const order = homeShown(st().data).map((x) => x.runId);
    expect(st().pauseRun(id)).toEqual({ ok: true, runId: id, home: true });
    expect(homeShown(st().data).map((x) => x.runId)).toEqual(order);
    expect(homeShown(st().data).find((x) => x.runId === id)).toMatchObject({ state: 'paused', action: 'resume', current: true });
  });
});
