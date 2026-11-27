/**
 * P-107 through the store: Add's "For each…" is a Plan edit (quiet, its Undo in the routine's menu); a list is given
 * from its list field with no notice; replacing one says "Changed {name}" with an Undo that puts the items back, one
 * per row; Step out of a for each says "Left For each <item>" with its Undo; while reconnecting a list is refused
 * (the sheet keeps it). Expected values from the roadmap's Done when and DESIGN.md's Safeguards.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { place, readRun, visibleValue } from '@/domain/run';
import { Data, emptyData, Id } from '@/domain/types';
import { nameKey } from '@/domain/values';

import { useStore } from './useStore';

const st = () => useStore.getState();
const at = '2026-11-01T00:00:00.000Z';
const seeded = (): Data => ({
  ...emptyData(),
  routines: {
    D: { id: 'D', words: 'Drawing practice', named: true, createdAt: at, items: [{ id: 'find', text: 'Find reference photos', out: 'photos' }, { id: 'row', ref: 'E' }, { id: 'rank', text: 'Rank the {drawing}' }] },
    E: { id: 'E', words: 'For each photo in {photos}', named: false, createdAt: at, items: [{ id: 'draw', text: 'Draw {photo}', out: 'drawing' }], each: { item: 'photo', list: 'photos' } },
    P: { id: 'P', words: 'Plain', named: true, createdAt: at, items: [{ id: 'p1', text: 'Pick', out: 'thing' }] },
  },
});
const started = (routineId: Id) => {
  const r = st().startRoutine(routineId);
  if (!r.ok || !r.runId) throw new Error('not started');
  return r.runId;
};
const list = (id: Id, name: string) => visibleValue(st().data, readRun(st().data, id)!, nameKey(name))?.items ?? [];
const here = (id: Id) => place(st().data, readRun(st().data, id)!)?.item?.id;

beforeEach(() => {
  useStore.setState({ data: seeded(), undo: undefined, toast: undefined, runNotice: undefined, toVerb: undefined, storage: { state: 'ready', kind: 'sqlite' } });
});

describe('Add’s "For each…" is a Plan edit', () => {
  it('quiet, its Undo the routine menu’s "Undo added …" — and Undo takes the block away', () => {
    const before = st().data;
    expect(st().editRoutine('P', { kind: 'addEach', item: 'thing item', list: 'thing' })).toMatchObject({ ok: true });
    expect(st().runNotice).toMatchObject({ text: 'Added “For each thing item in {thing}”', quiet: true });
    expect(st().runNotice!.entry).toBe(st().undo);
    expect(st().undoLast()).toBe(true);
    expect(st().data).toEqual(before);
  });
});

describe('the list field', () => {
  it('giving a list leaves no notice and keeps the Undo slot as it was', () => {
    const id = started('D');
    expect(st().typeList(id, 'find', 'photos', ['a', 'b', 'c'])).toMatchObject({ ok: true });
    expect(list(id, 'photos')).toEqual(['a', 'b', 'c']);
    expect(st().runNotice).toBeUndefined();
    expect(st().undo).toBeUndefined();
  });

  it('replacing a list: "Changed {photos}" with an Undo that puts the items back, one per row', () => {
    const id = started('D');
    st().typeList(id, 'find', 'photos', ['a', 'b', 'c']);
    st().typeList(id, 'find', 'photos', ['a', 'c']);
    st().typedOver(id, 'find', 'photos', 'a, b and c', ['a', 'b', 'c']);
    expect(st().runNotice).toMatchObject({ text: 'Changed {photos}', label: 'Change' });
    expect(st().undoLast()).toBe(true);
    expect(list(id, 'photos')).toEqual(['a', 'b', 'c']);
    // Cleared: "Cleared {photos}".
    st().typeList(id, 'find', 'photos', []);
    st().typedOver(id, 'find', 'photos', 'a, b and c', ['a', 'b', 'c']);
    expect(st().runNotice).toMatchObject({ text: 'Cleared {photos}' });
    // The same items again: nothing to say.
    useStore.setState({ runNotice: undefined, undo: undefined });
    st().typeList(id, 'find', 'photos', ['x']);
    st().typedOver(id, 'find', 'photos', 'x', ['x']);
    expect(st().runNotice).toBeUndefined();
  });

  it('refused while reconnecting: nothing changes (the sheet keeps the rows)', () => {
    const id = started('D');
    useStore.setState({ storage: { state: 'ready', kind: 'sqlite', reconnecting: true } });
    const before = st().data;
    expect(st().typeList(id, 'find', 'photos', ['a'])).toEqual({ ok: false, reason: 'reconnecting' });
    expect(st().data).toBe(before);
  });
});

describe('the loop through the store', () => {
  it('Next goes in; Step out leaves it with "Left For each photo" and an Undo', () => {
    const id = started('D');
    st().typeList(id, 'find', 'photos', ['a', 'b']);
    st().nextStep(id);
    expect(here(id)).toBe('draw');
    const before = st().data;
    expect(st().doneLevel(id)).toMatchObject({ ok: true });
    expect(here(id)).toBe('rank');
    expect(st().runNotice).toMatchObject({ text: 'Left For each photo', label: 'Step out' });
    expect(st().undoLast()).toBe(true);
    expect(st().data).toEqual(before);
  });
});
