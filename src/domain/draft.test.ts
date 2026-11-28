/**
 * P-115 (the owner, 2026-11-28: "all changes to a routine are final, and there's no confirmation or save step … like drag
 * a step out of place"; answered "Edit, then Save/Cancel" and "Kept as a draft"). The roadmap's Done when, one test per
 * line: Edit starts a draft; every Plan change goes into it, with Undo inside it; Save writes it as one change (one Undo
 * after); Cancel discards it; a run and home keep reading the saved routine until Save; a draft of a routine changed
 * elsewhere says so rather than overwriting; nothing converted. Expected values come from those lines and the owner's
 * words, never from running the code.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { applyUndo, undoEntry } from './diff';
import { beginDraft, cancelDraft, changedElsewhere, draftData, draftEdit, draftOf, readDraft, saveDraft, undoDraftStep } from './draft';
import { editRoutine, Env, Item, readRoutine, readRun, RoutineEdit, runVerb } from './run';
import { planView, runnerView } from './runView';
import { Data, emptyData, Id, Routine } from './types';

const T0 = Date.UTC(2026, 10, 28, 10, 0, 0);
let n = 0;
let t = 0;
beforeEach(() => {
  n = 0;
  t = 0;
});
const env = (): Env => ({ now: new Date(T0 + 1000 * t++).toISOString(), id: () => `x${++n}` });
const step = (id: string, text = id, extra: Record<string, unknown> = {}): Item => ({ id, text, ...extra }) as Item;
const routine = (id: string, words: string, items: Item[], extra: Record<string, unknown> = {}): Routine => ({ id, words, named: true, createdAt: '2026-11-01T00:00:00.000Z', items, home: true, ...extra });
const words = (d: Data, id: Id) => (readRoutine(d, id)?.items ?? []).map((i) => ('text' in i ? i.text : 'ref' in i ? `▤${i.ref}` : ''));

/** "Morning pages" (Brew, Write, Read) and a run of it on "Write", paused. */
function morning(): Data {
  let d: Data = { ...emptyData(), routines: { m: routine('m', 'Morning pages', [step('brew', 'Brew coffee'), step('write', 'Write three pages'), step('read', 'Read them back')]) } };
  const r = runVerb(d, { kind: 'start', routineId: 'm' }, env());
  d = runVerb(r.data, { kind: 'next', runId: r.runId! }, env()).data;
  return runVerb(d, { kind: 'pause', runId: r.runId! }, env()).data;
}
const runOf = (d: Data) => Object.keys(d.runs)[0];
const begun = (d: Data, id = 'm') => {
  const r = beginDraft(d, id, env());
  expect(r.ok).toBe(true);
  return r.data;
};
const into = (d: Data, e: RoutineEdit, seq = 'm', root = 'm') => {
  const r = draftEdit(d, root, { seq, edit: e }, env());
  expect(r.ok, `${JSON.stringify(e)} refused: ${!r.ok && r.reason}`).toBe(true);
  return r.data;
};

describe('Edit starts a draft of the routine', () => {
  it('Edit keeps a draft on the routine’s own record (nothing in it yet); everything saved reads the same', () => {
    const d0 = morning();
    const d = begun(d0);
    expect(d.routines.m.draft).toEqual({ v: 1, of: 'm', startedAt: expect.any(String), base: {}, log: [] });
    expect(readDraft(d, 'm').kind).toBe('draft');
    expect(words(d, 'm')).toEqual(words(d0, 'm'));
    expect(d.runs).toBe(d0.runs);
    // Edit again: as it is (Plan reopens in Edit with it).
    expect(beginDraft(d, 'm', env()).data).toBe(d);
  });

  it('old data has no draft and reads as none; nothing is converted by reading it', () => {
    const d = morning();
    const before = JSON.stringify(d);
    expect(readDraft(d, 'm')).toEqual({ kind: 'none' });
    expect(draftData(d, 'm')).toBe(d);
    expect(JSON.stringify(d)).toBe(before);
  });
});

describe('every Plan change goes into the draft; a run and home keep reading the saved routine', () => {
  it('the owner’s accidental drag goes into the draft: Plan in Edit shows it moved; the saved routine, its run and home do not', () => {
    const d0 = begun(morning());
    const runId = runOf(d0);
    const d = into(d0, { kind: 'move', item: 'read', by: -1 });
    expect(words(draftData(d, 'm'), 'm')).toEqual(['Brew coffee', 'Read them back', 'Write three pages']);
    expect(words(d, 'm')).toEqual(['Brew coffee', 'Write three pages', 'Read them back']);
    expect(d.runs).toBe(d0.runs);
    expect(runnerView(d, runId)!.step.words).toBe('Write three pages');
    expect(planView(d, { routineId: 'm' })!.rows.map((r) => r.words)).toEqual(['Brew coffee', 'Write three pages', 'Read them back']);
  });

  it('removing the step a run is on, in the draft: the run stays on it until Save; Save moves it on, as the edit itself would', () => {
    const d0 = begun(morning());
    const runId = runOf(d0);
    const d = into(d0, { kind: 'remove', item: 'write' });
    expect(readRun(d, runId)!.frames[0].at).toBe('write');
    expect(planView(draftData(d, 'm'), { runId })!.rows.find((r) => r.here)?.words).toBe('Read them back');
    const s = saveDraft(d, 'm', env());
    expect(s.ok).toBe(true);
    expect(readRun(s.data, runId)!.frames[0].at).toBe('read');
    // The same as making the edit on the routine directly (the one difference: the draft field is gone).
    const direct = editRoutine(morning(), 'm', { kind: 'remove', item: 'write' }, env());
    expect(words(s.data, 'm')).toEqual(words(direct.data, 'm'));
  });

  it('values are unaffected by an unsaved draft: a name renamed in the draft renames the run’s value only at Save', () => {
    let d = morning();
    d = editRoutine(d, 'm', { kind: 'gives', item: 'brew', name: 'drink' }, env()).data;
    const runId = runOf(d);
    d = { ...d, runs: { ...d.runs, [runId]: { ...d.runs[runId], values: [{ name: 'drink', items: ['tea'], level: 0, seq: 'm', item: 'brew', words: 'Brew coffee', at: new Date(T0).toISOString() }] } } };
    d = into(begun(d), { kind: 'renameValue', from: 'drink', to: 'cup' });
    expect((d.runs[runId].values as { name: string }[]).map((v) => v.name)).toEqual(['drink']);
    const s = saveDraft(d, 'm', env());
    expect((s.data.runs[runId].values as { name: string }[]).map((v) => v.name)).toEqual(['cup']);
  });

  it('a step broken down in the draft: its smaller steps are a routine only the draft has; Save writes it, with the ids Plan showed', () => {
    const d = into(begun(morning()), { kind: 'breakDown', item: 'read', steps: ['Read page one', 'Read page two'] });
    const shown = draftData(d, 'm');
    const ref = (readRoutine(shown, 'm')!.items[2] as { ref: string }).ref;
    expect(words(shown, ref)).toEqual(['Read page one', 'Read page two']);
    expect(d.routines[ref]).toBeUndefined();
    const s = saveDraft(d, 'm', env());
    expect(s.ok && s.data.routines[ref]).toMatchObject({ named: false, words: 'Read them back' });
    expect(readRoutine(s.data, ref)!.items.map((i) => i.id)).toEqual(readRoutine(shown, ref)!.items.map((i) => i.id));
  });

  it('a change inside a routine used as a step (opened in place) is the draft’s too — that routine is saved only at Save', () => {
    let d: Data = { ...emptyData(), routines: { m: routine('m', 'Morning pages', [step('brew', 'Brew coffee'), { id: 'c', ref: 'k' } as Item]), k: routine('k', 'Kettle', [step('fill', 'Fill it')]) } };
    d = into(begun(d), { kind: 'addStep', text: 'Switch it on' }, 'k');
    expect(words(d, 'k')).toEqual(['Fill it']);
    expect(words(draftData(d, 'm'), 'k')).toEqual(['Fill it', 'Switch it on']);
    expect(words(saveDraft(d, 'm', env()).data, 'k')).toEqual(['Fill it', 'Switch it on']);
  });

  it('a refused edit is refused in the draft too, and the draft is as it was', () => {
    const d = begun(morning());
    expect(draftEdit(d, 'm', { seq: 'm', edit: { kind: 'addStep', text: '   ' } }, env())).toMatchObject({ ok: false, reason: 'empty', data: d });
    expect(draftEdit(d, 'm', { seq: 'm', edit: { kind: 'removeRoutine' } }, env())).toMatchObject({ ok: false });
    expect(draftEdit(morning(), 'm', { seq: 'm', edit: { kind: 'addStep', text: 'x' } }, env())).toMatchObject({ ok: false, reason: 'no-draft' });
  });
});

describe('Undo works step by step inside the draft', () => {
  it('each Undo takes back the draft’s last edit; the saved routine never moves', () => {
    let d = begun(morning());
    d = into(d, { kind: 'move', item: 'read', by: -1 });
    d = into(d, { kind: 'addStep', text: 'Underline one line' });
    expect(draftOf(d, 'm')!.log.map((s) => s.said)).toEqual(['Moved “Read them back”', 'Added “Underline one line”']);
    d = undoDraftStep(d, 'm').data;
    expect(words(draftData(d, 'm'), 'm')).toEqual(['Brew coffee', 'Read them back', 'Write three pages']);
    d = undoDraftStep(d, 'm').data;
    expect(words(draftData(d, 'm'), 'm')).toEqual(['Brew coffee', 'Write three pages', 'Read them back']);
    expect(draftOf(d, 'm')).toMatchObject({ log: [], base: {} });
    expect(undoDraftStep(d, 'm').ok).toBe(false);
    expect(words(d, 'm')).toEqual(['Brew coffee', 'Write three pages', 'Read them back']);
  });
});

describe('Save writes the draft as one change, with one Undo after; Cancel discards it', () => {
  it('Save: the draft’s steps saved and the field gone, in one change; its one Undo brings the saved routine and the draft back', () => {
    let d = begun(morning());
    d = into(d, { kind: 'move', item: 'read', by: -1 });
    d = into(d, { kind: 'addStep', text: 'Underline one line' });
    const s = saveDraft(d, 'm', env());
    expect(s.ok).toBe(true);
    expect(words(s.data, 'm')).toEqual(['Brew coffee', 'Read them back', 'Write three pages', 'Underline one line']);
    expect('draft' in s.data.routines.m).toBe(false);
    const back = applyUndo(s.data, undoEntry(d, s.data));
    expect(back.routines.m).toEqual(d.routines.m);
  });

  it('Save with nothing in the draft: the field just goes; the routine is as it was', () => {
    const d0 = morning();
    const s = saveDraft(begun(d0), 'm', env());
    expect(s.ok && s.data.routines.m).toEqual(d0.routines.m);
  });

  it('Cancel: the draft thrown away — the saved routine is exactly as it was; nothing to cancel without a draft', () => {
    const d0 = morning();
    const d = into(begun(d0), { kind: 'remove', item: 'brew' });
    const c = cancelDraft(d, 'm');
    expect(c.ok && c.data.routines.m).toEqual(d0.routines.m);
    expect(cancelDraft(d0, 'm').ok).toBe(false);
  });

  it('Copy never carries a draft to the copy', () => {
    const d = into(begun(morning()), { kind: 'addStep', text: 'Underline one line' });
    const c = editRoutine(d, 'm', { kind: 'copy', words: 'Evening pages' }, env());
    expect(c.ok).toBe(true);
    expect('draft' in c.data.routines[c.routineId!]).toBe(false);
  });
});

describe('a draft of a routine changed elsewhere says so rather than overwriting', () => {
  it('changed elsewhere (another tab, a run’s kept-list write) since the draft changed it: Save is refused, naming it, and writes nothing', () => {
    let d = into(begun(morning()), { kind: 'reword', item: 'brew', text: 'Brew tea' });
    d = editRoutine(d, 'm', { kind: 'addStep', text: 'Close the notebook' }, env()).data;
    expect(changedElsewhere(d, 'm')).toEqual(['Morning pages']);
    expect(saveDraft(d, 'm', env())).toMatchObject({ ok: false, reason: 'changed', names: ['Morning pages'], data: d });
  });

  it('saved anyway: the draft’s edits go over what is saved now — the other change stays where the draft did not change the same thing', () => {
    let d = into(begun(morning()), { kind: 'reword', item: 'brew', text: 'Brew tea' });
    d = editRoutine(d, 'm', { kind: 'addStep', text: 'Close the notebook' }, env()).data;
    const s = saveDraft(d, 'm', env(), true);
    expect(s.ok && words(s.data, 'm')).toEqual(['Brew tea', 'Write three pages', 'Read them back', 'Close the notebook']);
  });

  it('a draft edit that cannot be made over what is saved now (its step removed elsewhere): Save is refused whole, nothing written', () => {
    let d = into(begun(morning()), { kind: 'reword', item: 'brew', text: 'Brew tea' });
    d = editRoutine(d, 'm', { kind: 'remove', item: 'brew' }, env()).data;
    expect(saveDraft(d, 'm', env(), true)).toMatchObject({ ok: false, reason: 'cannot', data: d });
  });

  it('a change elsewhere before the draft holds anything is not a conflict: the draft starts from what is saved then', () => {
    let d = begun(morning());
    d = editRoutine(d, 'm', { kind: 'addStep', text: 'Close the notebook' }, env()).data;
    expect(changedElsewhere(d, 'm')).toEqual([]);
    d = into(d, { kind: 'reword', item: 'brew', text: 'Brew tea' });
    expect(words(saveDraft(d, 'm', env()).data, 'm')).toEqual(['Brew tea', 'Write three pages', 'Read them back', 'Close the notebook']);
  });
});

describe('nothing is converted: a draft this version cannot read is kept, never written over', () => {
  it('a later shape: locked — Edit, an edit into it, Save and Cancel are refused, and the routine still reads its saved steps', () => {
    const d0 = morning();
    const later = { v: 2, of: 'm', newer: true };
    const d: Data = { ...d0, routines: { ...d0.routines, m: { ...d0.routines.m, draft: later } } };
    expect(readDraft(d, 'm').kind).toBe('locked');
    expect(beginDraft(d, 'm', env())).toMatchObject({ ok: false, reason: 'locked' });
    expect(draftEdit(d, 'm', { seq: 'm', edit: { kind: 'addStep', text: 'x' } }, env())).toMatchObject({ ok: false, reason: 'locked' });
    expect(saveDraft(d, 'm', env())).toMatchObject({ ok: false, reason: 'locked' });
    expect(cancelDraft(d, 'm')).toMatchObject({ ok: false, reason: 'locked' });
    // An edit to the routine itself (elsewhere) keeps the field as it is.
    expect(editRoutine(d, 'm', { kind: 'addStep', text: 'x' }, env()).data.routines.m.draft).toBe(later);
  });

  it('another routine’s draft (an older build’s Copy carried it here) reads as none; Edit starts this routine’s own', () => {
    const d0 = morning();
    const carried = { v: 1, of: 'other', startedAt: 'x', base: {}, log: [] };
    const d: Data = { ...d0, routines: { ...d0.routines, m: { ...d0.routines.m, draft: carried } } };
    expect(readDraft(d, 'm').kind).toBe('none');
    expect(begun(d).routines.m.draft).toMatchObject({ of: 'm' });
  });
});
