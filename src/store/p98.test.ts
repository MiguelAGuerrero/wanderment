/**
 * P-98 through the store: Copy says what it did, with Undo (it makes a routine that is not on the screen); a call
 * added, an input bound, are Plan edits (quiet, their Undo in the routine's menu); Next and Step out carry what
 * they asked for in one write (Step out's Undo takes both back); Step in refused past the depth, or into a removed
 * routine, says so in words; while reconnecting a press carrying typed values is refused (the sheet keeps them).
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { MAX_DEPTH, readRun } from '@/domain/run';
import { myRoutines } from '@/domain/routines';
import { Data, emptyData, Id } from '@/domain/types';

import { STEP_IN_TOO_DEEP, useStore } from './useStore';

const st = () => useStore.getState();
const at = '2026-11-01T00:00:00.000Z';
const seeded = (): Data => ({
  ...emptyData(),
  routines: {
    I: { id: 'I', words: 'Improve my workout routine', named: true, createdAt: at, items: [{ id: 'doubts', text: 'List out my doubts', out: 'concerns' }, { id: 'c', ref: 'R', words: 'Research' }, { id: 'decide', text: 'Decide using {findings}' }] },
    R: { id: 'R', words: 'Research', named: true, createdAt: at, items: [{ id: 'look', text: 'Look into {concerns}' }, { id: 'note', text: 'Note what I found', out: 'findings' }] },
    S: { id: 'S', words: 'Self', named: true, createdAt: at, items: [{ id: 's', ref: 'S' }, { id: 'z', text: 'z' }] },
  },
});
const started = (routineId: Id) => {
  const r = st().startRoutine(routineId);
  if (!r.ok || !r.runId) throw new Error('not started');
  return r.runId;
};
const values = (id: Id) => readRun(st().data, id)!.values.map((e) => `${e.level}:${e.name}=${e.items.join('|')}@${e.item}`);

beforeEach(() => {
  useStore.setState({ data: seeded(), undo: undefined, toast: undefined, runNotice: undefined, toVerb: undefined, storage: { state: 'ready', kind: 'sqlite' } });
});

describe('Copy', () => {
  it('“Copied “X” as “Y”” with an Undo, shown (not a quiet Plan edit); Undo takes the copy away', () => {
    const before = st().data;
    const did = st().editRoutine('R', { kind: 'copy', words: 'Research (copy)' });
    expect(did).toMatchObject({ ok: true, routineId: expect.any(String) });
    expect(myRoutines(st().data).map((r) => r.name)).toContain('Research (copy)');
    expect(st().runNotice).toMatchObject({ text: 'Copied “Research” as “Research (copy)”', label: 'Change' });
    expect(st().runNotice!.quiet).toBeUndefined();
    expect(st().runNotice!.entry).toBe(st().undo);
    expect(st().undoLast()).toBe(true);
    expect(st().data).toEqual(before);
  });

  it('a name in use is refused, nothing changes', () => {
    const before = st().data;
    expect(st().editRoutine('R', { kind: 'copy', words: 'improve my workout routine' })).toMatchObject({ ok: false, reason: 'same-name' });
    expect(st().data).toBe(before);
  });
});

describe('a call and its inputs are Plan edits: quiet, with the routine’s Undo', () => {
  it('Add a routine, then bind an input: each its own Undo', () => {
    const before = st().data;
    // (P-113, rewritten; was: refused `self` — Research is used by Improve, so it called itself through another. Now added
    // as any call, a quiet Plan edit with its Undo.)
    expect(st().editRoutine('R', { kind: 'addCall', routine: 'I' })).toMatchObject({ ok: true });
    expect(st().runNotice).toMatchObject({ text: 'Added “Improve my workout routine”', quiet: true });
    expect(st().undoLast()).toBe(true);
    expect(st().data).toEqual(before);
    useStore.setState({ data: { ...before, routines: { ...before.routines, T: { id: 'T', words: 'Train', named: true, createdAt: at, items: [] } } } });
    const base = st().data;
    expect(st().editRoutine('T', { kind: 'addCall', routine: 'R' }).ok).toBe(true);
    expect(st().runNotice).toMatchObject({ text: 'Added “Research”', quiet: true });
    const added = st().data;
    const item = (added.routines.T.items as { id: string }[])[0].id;
    expect(st().editRoutine('T', { kind: 'bind', item, input: 'concerns', to: { typed: 'knees' } }).ok).toBe(true);
    expect(st().runNotice).toMatchObject({ text: 'Changed {concerns} for “Research”', quiet: true });
    st().undoLast();
    expect(st().data).toEqual(added);
    useStore.setState({ data: base });
  });
});

describe('Next and Step out carry what they asked for', () => {
  it('Next past the call with {findings} typed: given by the call row, then on; no Undo (moving through a run)', () => {
    const id = started('I');
    st().typeValue(id, 'doubts', 'concerns', 'form');
    st().nextStep(id);
    expect(st().nextStep(id, [{ name: 'findings', text: 'rest more' }]).ok).toBe(true);
    expect(values(id)).toEqual(['0:concerns=form@doubts', '0:findings=rest more@c']);
    expect(st().undo).toBeUndefined();
  });

  it('Step out of Research before its giving step: the value typed, given by the call row; one Undo takes the move and it back', () => {
    const id = started('I');
    st().typeValue(id, 'doubts', 'concerns', 'form');
    st().nextStep(id);
    st().stepIn(id);
    const inside = st().data;
    expect(st().doneLevel(id, [{ name: 'findings', text: 'skip' }]).ok).toBe(true);
    expect(values(id)).toEqual(['0:concerns=form@doubts', '0:findings=skip@c']);
    expect(st().runNotice).toMatchObject({ text: 'Left Research', label: 'Step out' });
    st().undoLast();
    expect(st().data).toEqual(inside);
  });

  it('while reconnecting: a press carrying typed values is refused (nothing kept to replay); a bare one is kept', () => {
    const id = started('I');
    st().nextStep(id);
    useStore.setState({ storage: { state: 'ready', kind: 'sqlite', reconnecting: true } });
    expect(st().nextStep(id, [{ name: 'findings', text: 'x' }])).toEqual({ ok: false, reason: 'reconnecting' });
    expect(st().toVerb).toBeUndefined();
    st().nextStep(id);
    expect(st().toVerb).toMatchObject({ verb: 'next', runId: id });
  });
});

describe('Step in refused, in words', () => {
  it('past the depth it can go: “Can’t step in any deeper”, the run unmoved; into a removed routine: says it was removed', () => {
    const id = started('S');
    for (let i = 1; i < MAX_DEPTH; i++) expect(st().stepIn(id).ok).toBe(true);
    const deep = st().data;
    expect(st().stepIn(id)).toMatchObject({ ok: false, reason: 'too-deep' });
    expect(st().data).toBe(deep);
    expect(st().runNotice).toMatchObject({ text: STEP_IN_TOO_DEEP });
    expect(STEP_IN_TOO_DEEP).toBe('Can’t step in any deeper');

    useStore.setState({ data: seeded(), runNotice: undefined });
    expect(st().editRoutine('R', { kind: 'removeRoutine' }).ok).toBe(true);
    const run = started('I');
    st().nextStep(run);
    expect(st().stepIn(run)).toMatchObject({ ok: false, reason: 'gone' });
    expect(st().runNotice).toMatchObject({ text: 'That routine was removed' });
  });
});
