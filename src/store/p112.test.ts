/**
 * P-112 through the store: Next over the steps in view is one move with one Undo (it is a skip, as Jump to is), keeping
 * the values typed; over one step it is Next (P-95: no Undo). Expected values from the roadmap's Done when.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { chunkView } from '@/domain/chunk';
import { place, readRun } from '@/domain/run';
import { Data, emptyData, Id } from '@/domain/types';

import { useStore } from './useStore';

const st = () => useStore.getState();
const at = '2026-11-01T00:00:00.000Z';
const seeded = (): Data => ({
  ...emptyData(),
  routines: {
    P: {
      id: 'P', words: 'Write the post', named: true, createdAt: at, home: true,
      items: [{ id: 'warm', text: 'Warm up' }, { id: 'choose', text: 'Choose a subject', out: 'subject' }, { id: 'draft', text: 'Draft {subject}' }, { id: 'edit', text: 'Edit {subject}' }],
    } as never,
  },
});
const started = (r: Id) => {
  const d = st().startRoutine(r);
  if (!d.ok || !d.runId) throw new Error('no');
  return d.runId;
};
const here = (id: Id) => place(st().data, readRun(st().data, id)!)!.item!.id;
const vals = (id: Id) => readRun(st().data, id)!.values.map((e) => `${e.name}=${e.items.join('|')}`);

beforeEach(() => {
  useStore.setState({ data: seeded(), undo: undefined, toast: undefined, runNotice: undefined, toVerb: undefined, storage: { state: 'ready', kind: 'sqlite' } });
});

describe('Next over the chunk', () => {
  it('three steps in view, a value typed in the second: one move, said, with one Undo that brings the place back', () => {
    const id = started('P');
    const key = chunkView(st().data, id, 3, new Set(), {})!.rows[1].fields[0].key;
    const v = chunkView(st().data, id, 3, new Set(), { [key]: { text: 'tides' } })!;
    expect(st().nextStep(id, undefined, v.moves).ok).toBe(true);
    expect(here(id)).toBe('edit');
    expect(vals(id)).toEqual(['subject=tides']);
    expect(st().runNotice?.text).toBe('Took 3 steps as done');
    expect(st().runNotice?.label).toBe('Next');
    expect(st().undoLast()).toBe(true);
    expect(here(id)).toBe('warm');
    expect(vals(id)).toEqual([]);
  });

  it('one step in view: Next as ever — no Undo', () => {
    const id = started('P');
    const v = chunkView(st().data, id, 1, new Set(), {})!;
    expect(st().nextStep(id, undefined, v.moves).ok).toBe(true);
    expect(here(id)).toBe('choose');
    expect(st().undo).toBeUndefined();
  });
});
