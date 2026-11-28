/**
 * P-110 through the store: a move that clears values says so ("Cleared {name}") with one Undo that brings the place and
 * the values back; "Make it a call" is one Plan edit with its Undo. Expected values from the roadmap's Done when.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { place, readRun } from '@/domain/run';
import { planView, runnerView } from '@/domain/runView';
import { Data, emptyData, Id } from '@/domain/types';

import { useStore } from './useStore';

const st = () => useStore.getState();
const at = '2026-11-01T00:00:00.000Z';
const seeded = (): Data => ({
  ...emptyData(),
  routines: {
    I: {
      id: 'I', words: 'Iterate on the app', named: true, createdAt: at, home: true,
      items: [{ id: 'env', text: 'Envision how I’d expect {feature} to work' }, { id: 'pick', text: 'Pick a feature', out: 'feature' }, { id: 'build', text: 'Build {feature}' }, { id: 'doc', text: '@Document Iteration' }],
    } as never,
    DOC: { id: 'DOC', words: 'Document Iteration', named: true, createdAt: at, items: [{ id: 'w', text: 'Write down what changed' }] } as never,
  },
});
const started = (r: Id) => {
  const d = st().startRoutine(r);
  if (!d.ok || !d.runId) throw new Error('no');
  return d.runId;
};
const vals = (id: Id) => readRun(st().data, id)!.values.map((e) => `${e.name}=${e.items.join('|')}`);
const here = (id: Id) => place(st().data, readRun(st().data, id)!)!.item!.id;

beforeEach(() => {
  useStore.setState({ data: seeded(), undo: undefined, toast: undefined, runNotice: undefined, toVerb: undefined, storage: { state: 'ready', kind: 'sqlite' } });
});

describe('a move back clears what was given at or below the new place — said, with one Undo', () => {
  it('Jump back before the giver: "Jumped from … · Cleared {feature}"; Undo brings the place and the value back', () => {
    const id = started('I');
    st().nextStep(id);
    st().typeValue(id, 'pick', 'feature', 'checkout');
    st().nextStep(id);
    expect(runnerView(st().data, id)!.step.parts.map((p) => (p.kind === 'value' ? p.text : p.kind === 'text' ? p.text : `{${p.name}}`)).join('')).toBe('Build checkout');
    expect(st().jumpTo(id, { path: ['env'] }).ok).toBe(true);
    expect(vals(id)).toEqual([]);
    expect(st().runNotice?.text).toBe('Jumped from Build {feature} · Cleared {feature}');
    expect(st().undoLast()).toBe(true);
    expect(here(id)).toBe('build');
    expect(vals(id)).toEqual(['feature=checkout']);
  });

  // (P-111, rewritten: owner ruling Back keeps it — was "Back onto the giving step: "Cleared {feature}" with Undo":
  // Back clears nothing, so it says nothing and leaves no Undo, and the value is kept.)
  it('Back onto the giving step keeps {feature}: no notice, no Undo (P-95: Back that clears nothing says nothing)', () => {
    const id = started('I');
    st().nextStep(id);
    st().typeValue(id, 'pick', 'feature', 'checkout');
    st().nextStep(id);
    st().backTo(id);
    expect(here(id)).toBe('pick');
    expect(st().runNotice).toBeUndefined();
    expect(st().undo).toBeUndefined();
    expect(vals(id)).toEqual(['feature=checkout']);
  });

  it('Back that clears nothing says nothing and leaves no Undo (P-95)', () => {
    const id = started('I');
    st().nextStep(id);
    st().backTo(id);
    expect(here(id)).toBe('env');
    expect(st().runNotice).toBeUndefined();
    expect(st().undo).toBeUndefined();
  });
});

describe('"Make it a call": one Plan edit, with its Undo', () => {
  it('the row "@Document Iteration" becomes a call; Undo puts the words back', () => {
    expect(planView(st().data, { routineId: 'I' })!.rows[3].asCall).toEqual({ routine: 'DOC', name: 'Document Iteration' });
    expect(st().editRoutine('I', { kind: 'toCall', item: 'doc', routine: 'DOC' }).ok).toBe(true);
    expect((st().data.routines.I.items as unknown[])[3]).toEqual({ id: 'doc', ref: 'DOC', words: 'Document Iteration' });
    expect(st().runNotice?.text).toBe('Made “@Document Iteration” a call to “Document Iteration”');
    expect(st().undoLast()).toBe(true);
    expect((st().data.routines.I.items as unknown[])[3]).toEqual({ id: 'doc', text: '@Document Iteration' });
  });
});
