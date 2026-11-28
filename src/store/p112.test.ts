/**
 * P-112 through the store: Next over the steps in view is one move with one Undo (it is a skip, as Jump to is), keeping
 * the values typed; over one step it is Next (P-95: no Undo) — unless a value held was typed over (P-99: then said, with
 * P-96's Undo). Expected values from the roadmap's Done when and the P-112 investigator's repros.
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

  // (P-99, rewritten: "one step in view: Next as ever — no Undo" held only while nothing held was typed over; the P-112
  // investigator's repro 1 showed it read as "never an Undo" — a value typed over now keeps P-96's Undo, below.)
  it('one step in view, nothing typed over: Next as ever — no Undo', () => {
    const id = started('P');
    const v = chunkView(st().data, id, 1, new Set(), {})!;
    expect(st().nextStep(id, undefined, v.moves).ok).toBe(true);
    expect(here(id)).toBe('choose');
    expect(st().undo).toBeUndefined();
  });
});

/** At "Choose a subject" with {subject} given as "tides" (Back onto it: "Back keeps it", in its field). */
const holding = () => {
  const id = started('P');
  expect(st().nextStep(id).ok).toBe(true);
  expect(st().typeValue(id, 'choose', 'subject', 'tides').ok).toBe(true);
  expect(st().nextStep(id).ok).toBe(true);
  expect(st().backTo(id).ok).toBe(true);
  expect(here(id)).toBe('choose');
  expect(vals(id)).toEqual(['subject=tides']);
  useStore.setState({ undo: undefined, runNotice: undefined });
  return id;
};
const fieldKey = (id: Id) => chunkView(st().data, id, 1, new Set(), {})!.rows[0].fields[0].key;

describe('P-99: See ahead never loses a value (the P-112 investigator’s repros)', () => {
  it('repro 1: typing over a held value and Next, one step in view — "Changed {subject}" with an Undo that brings “tides” back', () => {
    const id = holding();
    const v = chunkView(st().data, id, 1, new Set(), { [fieldKey(id)]: { text: 'waves' } })!;
    expect(st().nextStep(id, undefined, v.moves).ok).toBe(true);
    expect(vals(id)).toEqual(['subject=waves']);
    expect(st().runNotice?.text).toBe('Changed {subject}');
    expect(st().undo).toBeDefined();
    expect(st().undoLast()).toBe(true);
    expect(vals(id)).toEqual(['subject=tides']);
    expect(here(id)).toBe('choose');
  });

  it('repro 1, over two steps: said with the skip — "Took 2 steps as done · Changed {subject}"', () => {
    const id = holding();
    const key = chunkView(st().data, id, 2, new Set(), {})!.rows[0].fields[0].key;
    const v = chunkView(st().data, id, 2, new Set(), { [key]: { text: 'waves' } })!;
    expect(st().nextStep(id, undefined, v.moves).ok).toBe(true);
    expect(st().runNotice?.text).toBe('Took 2 steps as done · Changed {subject}');
    expect(st().undoLast()).toBe(true);
    expect(vals(id)).toEqual(['subject=tides']);
  });

  it('repro 2: an empty draft means "unchanged", never "clear"', () => {
    const id = holding();
    const v = chunkView(st().data, id, 1, new Set(), { [fieldKey(id)]: { text: '' } })!;
    expect(v.moves).toEqual([{}]);
    expect(st().nextStep(id, undefined, [{ given: [{ name: 'subject', text: '' }] }]).ok).toBe(true);
    expect(vals(id)).toEqual(['subject=tides']);
    expect(st().undo).toBeUndefined();
  });

  it('repro 3: a draft the engine will not keep is said at Next, and nothing moves', () => {
    const id = holding();
    // (A name with a brace is no name: the engine refuses it, as the entry sheet would be refused.)
    const r = st().nextStep(id, undefined, [{ given: [{ name: 'sub{ject', text: 'waves' }] }]);
    expect(r.ok).toBe(false);
    expect(here(id)).toBe('choose');
    expect(st().runNotice?.text).toBe('Couldn’t keep {sub{ject}');
  });

  it('repro 4: Step out with See ahead on gives what was typed for the step it is on, and says what it passes over', () => {
    useStore.setState({
      data: {
        ...st().data,
        routines: {
          ...st().data.routines,
          Q: { id: 'Q', words: 'Morning', named: true, createdAt: at, home: true, items: [{ id: 'q1', ref: 'B' }, { id: 'q2', text: 'Coffee' }] } as never,
          B: { id: 'B', words: 'Stretch', named: false, createdAt: at, items: [{ id: 'b1', text: 'Pick a stretch', out: 'stretch' }, { id: 'b2', text: 'Note how {stretch} felt', out: 'felt' }] } as never,
        },
      },
    });
    const id = started('Q');
    expect(st().stepIn(id).ok).toBe(true);
    expect(st().doneLevel(id, undefined, [{ name: 'stretch', text: 'cat-cow' }], ['felt']).ok).toBe(true);
    expect(here(id)).toBe('q2');
    expect(vals(id)).toEqual(['stretch=cat-cow']);
    expect(st().runNotice?.text).toBe('Left Stretch · Not kept: {felt}');
    expect(st().undoLast()).toBe(true);
    expect(here(id)).toBe('b1');
    expect(vals(id)).toEqual([]);
  });
});
