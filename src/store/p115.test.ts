/**
 * P-115 through the store (the owner: "Edit, then Save/Cancel"; "Kept as a draft"): Edit begins a draft; each Plan edit
 * in Edit goes into it with a Plan edit's notice (quiet, a removed step said) and an Undo that goes back through the
 * draft step by step; Save is one change, said "Saved “<name>”", with one Undo; Cancel with changes is said, with an Undo
 * that brings the draft back, and without changes says nothing; + New opens straight into Edit; the composer (B-19) can
 * open a routine in Edit with a draft already in it. Expected values come from the roadmap's Done when and the brief.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { draftData, draftOf } from '@/domain/draft';
import { readRoutine } from '@/domain/run';
import { Data, emptyData } from '@/domain/types';

import { useStore } from './useStore';

const st = () => useStore.getState();
const at = '2026-11-01T00:00:00.000Z';
const seeded = (): Data => ({
  ...emptyData(),
  routines: { M: { id: 'M', words: 'Morning pages', named: true, createdAt: at, home: true, items: [{ id: 'a', text: 'Brew coffee' }, { id: 'b', text: 'Write three pages' }, { id: 'c', text: 'Read them back' }] } },
});
const saved = () => (readRoutine(st().data, 'M')?.items ?? []).map((i) => ('text' in i ? i.text : ''));
const shown = () => (readRoutine(draftData(st().data, 'M'), 'M')?.items ?? []).map((i) => ('text' in i ? i.text : ''));

beforeEach(() => {
  useStore.setState({ data: seeded(), undo: undefined, toast: undefined, runNotice: undefined, toVerb: undefined, storage: { state: 'ready', kind: 'sqlite' } });
});

describe('Edit, then Save or Cancel', () => {
  it('Edit begins a draft (no Undo); an edit in it is quiet, its Undo the draft’s; the saved routine does not change', () => {
    expect(st().beginEdit('M')).toEqual({ ok: true, routineId: 'M' });
    expect(st().undo).toBeUndefined();
    expect(st().editDraft('M', 'M', { kind: 'move', item: 'c', by: -1 }).ok).toBe(true);
    expect(st().runNotice).toMatchObject({ text: 'Moved “Read them back”', quiet: true, draft: 'M' });
    expect(st().runNotice!.entry).toBe(st().undo);
    expect(saved()).toEqual(['Brew coffee', 'Write three pages', 'Read them back']);
    expect(shown()).toEqual(['Brew coffee', 'Read them back', 'Write three pages']);
  });

  it('a removed step is said, with its Undo (as every Remove); Undo goes back through the draft step by step, each named', () => {
    st().beginEdit('M');
    st().editDraft('M', 'M', { kind: 'move', item: 'c', by: -1 });
    st().editDraft('M', 'M', { kind: 'addStep', text: 'Underline one line' });
    st().editDraft('M', 'M', { kind: 'remove', item: 'a' });
    expect(st().runNotice).toMatchObject({ text: 'Removed “Brew coffee”', draft: 'M' });
    expect(st().runNotice!.quiet).toBeUndefined();
    expect(st().undoLast()).toBe(true);
    expect(shown()).toEqual(['Brew coffee', 'Read them back', 'Write three pages', 'Underline one line']);
    expect(st().runNotice).toMatchObject({ text: 'Added “Underline one line”', quiet: true });
    expect(st().undoLast()).toBe(true);
    expect(st().runNotice).toMatchObject({ text: 'Moved “Read them back”', quiet: true });
    expect(st().undoLast()).toBe(true);
    expect(shown()).toEqual(['Brew coffee', 'Write three pages', 'Read them back']);
    expect(st().undo).toBeUndefined();
    expect(draftOf(st().data, 'M')!.log).toEqual([]);
    expect(saved()).toEqual(['Brew coffee', 'Write three pages', 'Read them back']);
  });

  it('Save: one change, said “Saved “Morning pages”” with one Undo — which brings the saved routine back and the draft with it', () => {
    st().beginEdit('M');
    st().editDraft('M', 'M', { kind: 'move', item: 'c', by: -1 });
    const withDraft = st().data;
    expect(st().saveDraft('M').ok).toBe(true);
    expect(saved()).toEqual(['Brew coffee', 'Read them back', 'Write three pages']);
    expect(draftOf(st().data, 'M')).toBeUndefined();
    expect(st().runNotice).toMatchObject({ text: 'Saved “Morning pages”', label: 'Save' });
    expect(st().runNotice!.quiet).toBeUndefined();
    expect(st().undoLast()).toBe(true);
    expect(st().data.routines.M).toEqual(withDraft.routines.M);
    // …and then back through the draft, as before Save.
    expect(st().runNotice).toMatchObject({ text: 'Moved “Read them back”' });
  });

  it('Save or Cancel with nothing in the draft: Edit ends, nothing said, nothing to undo', () => {
    st().beginEdit('M');
    expect(st().saveDraft('M').ok).toBe(true);
    expect([st().runNotice, st().undo, 'draft' in st().data.routines.M]).toEqual([undefined, undefined, false]);
    st().beginEdit('M');
    expect(st().cancelDraft('M').ok).toBe(true);
    expect([st().runNotice, st().undo, 'draft' in st().data.routines.M]).toEqual([undefined, undefined, false]);
  });

  it('Cancel with changes: the draft thrown away, said with an Undo that brings it back', () => {
    st().beginEdit('M');
    st().editDraft('M', 'M', { kind: 'move', item: 'c', by: -1 });
    const withDraft = st().data;
    expect(st().cancelDraft('M').ok).toBe(true);
    expect(st().data.routines.M).toEqual(seeded().routines.M);
    expect(st().runNotice).toMatchObject({ text: 'Discarded changes to “Morning pages”', label: 'Cancel' });
    expect(st().undoLast()).toBe(true);
    expect(st().data.routines.M).toEqual(withDraft.routines.M);
  });

  it('Save of a draft changed elsewhere: refused, naming it, nothing written; anyway: saved over it', () => {
    st().beginEdit('M');
    st().editDraft('M', 'M', { kind: 'reword', item: 'a', text: 'Brew tea' });
    st().editRoutine('M', { kind: 'addStep', text: 'Close the notebook' });
    const before = st().data;
    expect(st().saveDraft('M')).toEqual({ ok: false, reason: 'changed', names: ['Morning pages'] });
    expect(st().data).toBe(before);
    expect(st().saveDraft('M', true).ok).toBe(true);
    expect(saved()).toEqual(['Brew tea', 'Write three pages', 'Read them back', 'Close the notebook']);
  });

  it('while reconnecting, every draft action is refused and nothing changes', () => {
    st().beginEdit('M');
    useStore.setState({ storage: { state: 'ready', kind: 'sqlite', reconnecting: true } });
    const before = st().data;
    expect(st().editDraft('M', 'M', { kind: 'remove', item: 'a' })).toEqual({ ok: false, reason: 'reconnecting' });
    expect(st().saveDraft('M')).toEqual({ ok: false, reason: 'reconnecting' });
    expect(st().cancelDraft('M')).toEqual({ ok: false, reason: 'reconnecting' });
    expect(st().data).toBe(before);
  });

  it('+ New opens straight into Edit: the routine is made with its draft begun; Undo New takes it away whole', () => {
    const did = st().createRoutine('Evening pages');
    expect(did.ok).toBe(true);
    const id = (did as { routineId: string }).routineId;
    expect(draftOf(st().data, id)).toMatchObject({ of: id, log: [] });
    expect(st().runNotice).toMatchObject({ verb: 'new' });
    expect(st().undoLast()).toBe(true);
    expect(st().data.routines[id]).toBeUndefined();
    // A name there is: that routine, as it is — no draft begun.
    expect(st().createRoutine('Morning pages')).toMatchObject({ ok: true, routineId: 'M' });
    expect(draftOf(st().data, 'M')).toBeUndefined();
  });

  it('B-19’s entry point: a routine opened in Edit with edits already in its draft (one write, nothing saved); refused whole if one is', () => {
    const before = st().data;
    expect(st().openInEdit('M', [{ seq: 'M', edit: { kind: 'addStep', text: 'Underline one line' } }, { seq: 'M', edit: { kind: 'addStep', text: '  ' } }]).ok).toBe(false);
    expect(st().data).toBe(before);
    expect(st().openInEdit('M', [{ seq: 'M', edit: { kind: 'addStep', text: 'Underline one line' } }]).ok).toBe(true);
    expect(saved()).toEqual(['Brew coffee', 'Write three pages', 'Read them back']);
    expect(shown()).toEqual(['Brew coffee', 'Write three pages', 'Read them back', 'Underline one line']);
  });
});
