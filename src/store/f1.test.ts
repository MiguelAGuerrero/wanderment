/**
 * F-1 through the store: what the final review's engine and storage findings need from it (expected values from the audit's
 * repros and the owner's rulings, never from running the code):
 * - engine #8: a record of parts this version cannot read refuses taking a part up and going past the block — said.
 * - storage F7: a value typed after a part was taken up never ends up in another part's thread through that Undo.
 * - owner 2026-11-28: home's Resume of a run resting on a call not stepped into lands on the call's first step.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { place, readRun, visibleValue } from '@/domain/run';
import { homeQueue } from '@/domain/runView';
import { Data, emptyData, Id } from '@/domain/types';

import { PARTS_NEWER, useStore } from './useStore';

const st = () => useStore.getState();
const at = '2026-11-01T00:00:00.000Z';
const seeded = (): Data => ({
  ...emptyData(),
  routines: {
    H: { id: 'H', words: 'Hands', named: true, createdAt: at, home: true, items: [{ id: 'warm', text: 'Warm up' }, { id: 'row', ref: 'A' }, { id: 'after', text: 'Compare {copies} {notes}' }] } as never,
    A: { id: 'A', words: 'In any order', named: false, any: true, createdAt: at, items: [{ id: 'p1', text: 'Study', out: 'notes' }, { id: 'p2', text: 'Copy', out: 'copies' }] } as never,
    M: { id: 'M', words: 'Main', named: true, createdAt: at, home: true, items: [{ id: 'w', text: 'Warm' }, { id: 'c', ref: 'C', words: 'Callee' }, { id: 'end', text: 'After' }] } as never,
    C: { id: 'C', words: 'Callee', named: true, createdAt: at, items: [{ id: 'c1', text: 'Open the doc' }, { id: 'c2', text: 'Read it' }] } as never,
  },
});
const started = (r: Id) => {
  const d = st().startRoutine(r);
  if (!d.ok || !d.runId) throw new Error('no');
  return d.runId;
};
const here = (id: Id) => place(st().data, readRun(st().data, id)!)!.item!.id;

beforeEach(() => {
  useStore.setState({ data: seeded(), undo: undefined, toast: undefined, runNotice: undefined, toVerb: undefined, seeAhead: {}, storage: { state: 'ready', kind: 'sqlite' } });
});

describe('engine #8: parts started in a newer version', () => {
  it('Next on the block’s row is refused, and the notice says why', () => {
    const id = started('H');
    st().nextStep(id);
    expect(here(id)).toBe('row');
    const raw = JSON.parse(JSON.stringify(st().data.runs[id]));
    raw.frames[0].parts = { row: 'row', list: 'future-shape' };
    useStore.setState({ data: { ...st().data, runs: { ...st().data.runs, [id]: raw } } });
    const did = st().nextStep(id);
    expect(did.ok).toBe(false);
    expect(st().runNotice?.text).toBe('These parts were started in a newer version of the app');
    expect(PARTS_NEWER).toBe('These parts were started in a newer version of the app');
    expect(st().takeUpPart(id, 0, 'p1').ok).toBe(false);
    expect(st().runNotice?.text).toBe(PARTS_NEWER);
  });
});

describe('storage F7: Undo of a take-up, after a value typed in the part taken up', () => {
  it('typing there takes that Undo away, so the value stays in the part it was typed in', () => {
    const id = started('H');
    st().nextStep(id);
    st().takeUpPart(id, 0, 'p2');
    // Copy put down by taking up Study: an Undo.
    expect(st().takeUpPart(id, 0, 'p1').ok).toBe(true);
    expect(st().undo).toBeDefined();
    st().typeValue(id, 'p1', 'notes', 'typed in Study');
    expect(st().undo).toBeUndefined();
    st().undoLast();
    expect(here(id)).toBe('p1');
    expect(visibleValue(st().data, readRun(st().data, id)!, 'notes')?.items).toEqual(['typed in Study']);
  });
});

describe('owner 2026-11-28: home’s queue at a call not stepped into', () => {
  it('the row reads the call’s first step, and its Resume lands there, inside the call', () => {
    const id = started('M');
    st().nextStep(id);
    st().pauseRun(id);
    expect(here(id)).toBe('c');
    const row = homeQueue(st().data).find((t) => t.runId === id)!;
    expect(row).toMatchObject({ at: 'Open the doc', into: true });
    expect(st().resumeRun(id, false, row.into).ok).toBe(true);
    expect(here(id)).toBe('c1');
  });
});
