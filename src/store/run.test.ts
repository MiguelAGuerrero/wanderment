/**
 * P-86, P-90: the store's run actions. Each goes through the engine; each leaves an Undo with its
 * notice or clears the Undo slot (never a stale one); one Undo restores the routine and the run
 * together; a start is refused, saying what is running, while something is. P-90: Plan (`planRun`),
 * every Plan edit through `editRoutine`, creating (`createRoutine`), and the fold of this-run changes
 * from the build before, with its notice and Undo.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

import { isPlanning, isRunning, readRoutine, readRun } from '@/domain/run';
import { homeTiles, leftOff, planView, runnerView } from '@/domain/runView';
import { Data, emptyData, Id } from '@/domain/types';

import { person } from '@/test/records';

import { useStore } from './useStore';

const st = () => useStore.getState();
const json = (v: unknown) => JSON.parse(JSON.stringify(v));
const at = '2026-11-01T00:00:00.000Z';
const seeded = (): Data => ({
  ...emptyData(),
  routines: {
    report: { id: 'report', words: 'Report', named: true, createdAt: at, home: true, items: [{ id: 'a', text: 'Write report' }, { id: 'w', wait: 'a reply' }, { id: 'b', text: 'Send it' }] },
    sketch: { id: 'sketch', words: 'Sketch', named: true, createdAt: at, home: true, items: [{ id: 'q', text: 'Warm up' }] },
  },
});
const started = (routineId: Id) => {
  const r = st().startRoutine(routineId);
  if (!r.ok || !r.runId) throw new Error('not started');
  return r.runId;
};

beforeEach(() => {
  useStore.setState({ data: seeded(), undo: undefined, toast: undefined, runNotice: undefined, toVerb: undefined, draft: { text: '', toIds: [] } });
});

describe('starting', () => {
  it('Start from a tile: the run is running, with no Undo and no notice (P-95: a start is not undone), and the Undo there was is gone; a second tap changes nothing', () => {
    st().editRoutine('sketch', { kind: 'addStep', text: 'Shade' });
    expect(st().undo).toBeDefined();
    const id = started('report');
    expect(runnerView(st().data, id)).toMatchObject({ status: 'running', step: { words: 'Write report' } });
    expect([st().undo, st().runNotice]).toEqual([undefined, undefined]);
    const once = st();
    expect(st().startRoutine('report')).toEqual({ ok: true, runId: id });
    expect(st().data).toBe(once.data);
    expect(st().undo).toBeUndefined();
  });

  it('New: <words> (P-90): the routine only — open edge, on home, no steps, no run; its first step is added in its Plan, then Start; one Undo each for the routine and the step, none for the start (P-95)', () => {
    const fresh = st().data;
    const made = st().createRoutine('  Learn   Spanish ');
    if (!made.ok || !made.routineId) throw new Error('not made');
    const routineId = made.routineId;
    expect(made.runId).toBeUndefined();
    expect(readRoutine(st().data, routineId)).toMatchObject({ words: 'Learn Spanish', open: true, home: true, items: [] });
    expect(st().data.runs).toEqual({});
    expect(st().runNotice).toMatchObject({ verb: 'new', text: 'Made “Learn Spanish”', label: 'New' });
    expect(planView(st().data, { routineId })!.forward).toEqual({ kind: 'start', label: 'Start', routineId, ready: false });
    // Nothing to start yet: refused, nothing made.
    expect(st().startRoutine(routineId)).toEqual({ ok: false, reason: 'empty' });
    const empty = st().data;
    expect(st().editRoutine(routineId, { kind: 'addStep', text: 'Find a tutor' })).toEqual({ ok: true });
    expect(readRoutine(st().data, routineId)!.items.map((i) => ('text' in i ? i.text : ''))).toEqual(['Find a tutor']);
    const run = started(routineId);
    expect(runnerView(st().data, run)).toMatchObject({ status: 'running', step: { words: 'Find a tutor' } });
    // The start has no Undo (P-95); the step and the routine have one each.
    expect(st().undo).toBeUndefined();
    useStore.setState({ data: empty, undo: undefined });
    st().editRoutine(routineId, { kind: 'addStep', text: 'Find a tutor' });
    st().undoLast();
    expect(json(st().data)).toEqual(json(empty));
    useStore.setState({ data: fresh, undo: undefined });
    st().createRoutine('Learn Spanish');
    expect(Object.keys(st().data.routines)).toHaveLength(3);
    st().undoLast();
    expect(json(st().data)).toEqual(json(fresh));
  });

  it('New: with a name there is (one version per name): that routine is the answer, and nothing is made or started; the Undo there is stays', () => {
    const id = started('report');
    const was = st();
    expect(st().createRoutine(' sketch ')).toEqual({ ok: true, routineId: 'sketch' });
    expect(st().data).toBe(was.data);
    expect(st().undo).toBe(was.undo);
    expect(readRun(st().data, id)!.status).toBe('running');
  });

  it('while something is running a start is refused, saying what is; nothing changes and the Undo there is stays', () => {
    const id = started('report');
    const was = st();
    expect(st().startRoutine('sketch')).toEqual({ ok: false, reason: 'running', running: { runId: id, name: 'Report' } });
    expect(st().data).toBe(was.data);
    expect(st().undo).toBe(was.undo);
    expect(st().runNotice).toEqual({ verb: 'start', text: 'Report is running', label: '' });
    // Paused, the other may start.
    st().pauseRun(id);
    expect(st().startRoutine('sketch').ok).toBe(true);
    expect(homeTiles(st().data).map((x) => [x.name, x.state])).toEqual([['Report', 'paused'], ['Sketch', 'running']]);
  });
});

describe('Undo after every reversible action, and never a stale one', () => {
  it('each of these leaves an Undo that is the notice’s own, and it restores exactly what was there (P-95: what loses or reshapes something)', () => {
    const id = started('report');
    const steps: [string, () => { ok: boolean }][] = [
      ['editRoutine reword', () => st().editRoutine('report', { kind: 'reword', item: 'a', text: 'Draft report' })],
      ['editRoutine breakDown', () => st().editRoutine('report', { kind: 'breakDown', item: 'a', steps: ['outline', ' ', 'draft'] })],
      ['editRoutine addStep', () => st().editRoutine('report', { kind: 'addStep', text: 'File it', after: 'b' })],
      ['doneLevel', () => st().doneLevel(id)],
      ['jumpTo (P-95 audit F4: it can drop levels and reset the round)', () => st().jumpTo(id, { path: ['b'] })],
      ['editRoutine toWait', () => st().editRoutine('report', { kind: 'toWait', item: 'b' })],
      ['editRoutine move', () => st().editRoutine('report', { kind: 'move', item: 'b', by: -1 })],
      ['editRoutine move (a drag)', () => st().editRoutine('report', { kind: 'move', item: 'b', by: 2 })],
      ['editRoutine divider', () => st().editRoutine('report', { kind: 'divider', from: 1 })],
      ['editRoutine remove', () => st().editRoutine('report', { kind: 'remove', item: 'b' })],
      ['createRoutine', () => st().createRoutine('Learn Spanish')],
    ];
    for (const [name, press] of steps) {
      const before = st().data;
      expect(press().ok, name).toBe(true);
      const after = st().data;
      expect(after, name).not.toBe(before);
      expect(st().undo, name).toBeDefined();
      expect(st().runNotice?.entry, name).toBe(st().undo);
      st().undoLast();
      expect(json(st().data), `${name} undone`).toEqual(json(before));
      expect(st().undo, name).toBeUndefined();
      expect(st().runNotice, name).toBeUndefined();
      useStore.setState({ data: after }); // carry on from after the action
    }
  });

  it('P-102 (owner, 2026-11-27: "You should not undo a \'Done\'"; was P-95/P-96: it left Done’s Undo): Next that ends the run says "Done with <name>" and leaves NO Undo — finishing is final', () => {
    const id = started('report'); // (Report ends here: it has no open edge)
    st().jumpTo(id, { path: ['b'] });
    expect(st().nextStep(id).ok).toBe(true);
    expect(readRun(st().data, id)!.endedAt).toBeDefined();
    expect(st().runNotice).toMatchObject({ verb: 'next', text: 'Done with Report', follows: true });
    expect(st().runNotice!.entry).toBeUndefined();
    expect(st().undo).toBeUndefined();
    const ended = st().data;
    st().undoLast();
    expect(st().data).toBe(ended);
  });

  it('P-95: moving through a run leaves no Undo and no notice, and clears the Undo there was — Start, Next (not the last), Back to, Step in, Pause, Resume, Plan, "It’s happened"', () => {
    const id = started('report');
    const steps: [string, () => { ok: boolean }][] = [
      ['nextStep', () => st().nextStep(id)],
      ['nextStep on a wait (It’s happened)', () => st().nextStep(id)],
      ['backTo', () => st().backTo(id)],
      ['pauseRun', () => st().pauseRun(id)],
      ['resumeRun', () => st().resumeRun(id)],
      ['planRun', () => st().planRun(id)],
      ['resumeRun from Plan', () => st().resumeRun(id)],
    ];
    for (const [name, press] of steps) {
      // An Undo to be cleared: a Plan edit just before.
      st().editRoutine('sketch', { kind: 'reword', item: 'q', text: `Warm up ${name}` });
      expect(st().undo, name).toBeDefined();
      const before = st().data;
      expect(press().ok, name).toBe(true);
      expect(st().data, name).not.toBe(before);
      expect([st().undo, st().runNotice], name).toEqual([undefined, undefined]);
    }
    // Step in: a step broken down first (that edit has its Undo), then Step in clears it.
    st().jumpTo(id, { path: ['a'] });
    st().editRoutine('report', { kind: 'breakDown', item: 'a', steps: ['outline'] });
    st().jumpTo(id, { level: 0 });
    st().editRoutine('sketch', { kind: 'reword', item: 'q', text: 'Warm up again' });
    expect(st().stepIn(id).ok).toBe(true);
    expect([st().undo, st().runNotice]).toEqual([undefined, undefined]);
    // A start (of another, with this one paused).
    st().pauseRun(id);
    st().editRoutine('report', { kind: 'reword', item: 'b', text: 'Send it now' });
    started('sketch');
    expect([st().undo, st().runNotice]).toEqual([undefined, undefined]);
  });

  it('a step broken down in Plan: one Undo puts back the routine and the run together, and the sequence made is gone', () => {
    const id = started('report');
    const before = st().data;
    expect(st().editRoutine('report', { kind: 'breakDown', item: 'a', steps: ['outline', 'draft'] }).ok).toBe(true);
    const u = Object.values(st().data.routines).find((r) => !r.named)!;
    expect(readRoutine(st().data, 'report')!.items[0]).toEqual({ id: 'a', ref: u.id });
    expect('ownerRunId' in u).toBe(false);
    expect(readRun(st().data, id)!.changes).toEqual([]);
    expect(runnerView(st().data, id)).toMatchObject({ depth: 2, step: { words: 'outline' } });
    st().undoLast();
    expect(json(st().data)).toEqual(json(before));
  });

  it('Pause, Resume and Home leave no Undo and clear the one there was: an edit → Pause → Resume → Undo does nothing', () => {
    const id = started('report');
    st().editRoutine('sketch', { kind: 'addStep', text: 'Shade' });
    expect(st().undo).toBeDefined();
    st().pauseRun(id, 'lunch');
    expect(st().undo).toBeUndefined();
    expect(st().runNotice).toBeUndefined();
    st().resumeRun(id);
    const now = st().data;
    st().undoLast();
    expect(st().data).toBe(now);
    st().editRoutine('sketch', { kind: 'addStep', text: 'Blend' });
    expect(st().undo).toBeDefined();
    st().leaveRun(id);
    expect(st().undo).toBeUndefined();
  });

  it('the reason typed in place changes only the reason, keystroke by keystroke, and leaves the Undo slot alone', () => {
    const id = started('report');
    st().pauseRun(id);
    st().editRoutine('report', { kind: 'reword', item: 'a', text: 'Draft report' });
    const slot = st().undo;
    expect(slot).toBeDefined();
    for (const typed of ['n', 'ne', 'need ', 'need the ad']) expect(st().setPauseReason(id, typed)).toEqual({ ok: true, runId: id });
    expect(readRun(st().data, id)!.reason).toBe('need the ad');
    expect(st().undo).toBe(slot);
    st().setPauseReason(id, '');
    expect(readRun(st().data, id)!.reason).toBeUndefined();
    expect(st().undo).toBe(slot);
  });

  it('a change elsewhere replaces the slot: the notice’s Undo is no longer its own; and a run action puts a quiet note away', () => {
    const id = started('report');
    st().editRoutine('sketch', { kind: 'addStep', text: 'Shade' });
    const notice = st().runNotice!;
    // Something else took the Undo slot (P-89: nothing in the app does today; the screen still checks).
    person(useStore).log('a line from before');
    useStore.setState({ toast: { message: 'Just a moment — reconnecting.', notice: true } });
    expect(st().undo).toBeDefined();
    expect(notice.entry).not.toBe(st().undo);
    expect(st().runNotice).toBe(notice); // still there to read; the screen offers Undo only while entry === undo
    st().doneLevel(id);
    expect(st().toast).toBeUndefined();
    expect(st().runNotice!.entry).toBe(st().undo);
  });

  it('a refused action changes nothing: not the data, not the Undo slot, not the notice', () => {
    const id = started('report');
    st().nextStep(id); // on the wait
    const was = st();
    expect(st().editRoutine('report', { kind: 'breakDown', item: 'w', steps: ['x'] })).toEqual({ ok: false, reason: 'not-a-step' });
    expect(st().stepIn(id)).toEqual({ ok: false, reason: 'not-a-routine' });
    expect(st().editRoutine('report', { kind: 'reword', item: 'a', text: '  ' })).toEqual({ ok: false, reason: 'empty' });
    expect(st().editRoutine('report', { kind: 'divider', from: 9 })).toEqual({ ok: false, reason: 'cannot' });
    expect(st().nextStep('nope')).toEqual({ ok: false, reason: 'gone' });
    expect(st().planRun('nope')).toEqual({ ok: false, reason: 'gone' });
    expect([st().data, st().undo, st().runNotice]).toEqual([was.data, was.undo, was.runNotice]);
    expect(st().data).toBe(was.data);
  });
});

describe('what the notice says', () => {
  it('a run that finishes says "Done with <name>" (P-96, ruling 7; was "Finished <name>"); Done says "Done with <name>"; a jump says where from (P-95: Next and "It’s happened" say nothing — no notice)', () => {
    const id = started('report');
    st().nextStep(id);
    expect(st().runNotice).toBeUndefined();
    st().nextStep(id);
    expect(st().runNotice).toBeUndefined();
    st().jumpTo(id, { level: 0 });
    expect(st().runNotice).toMatchObject({ verb: 'jump', text: 'Jumped from Send it', label: 'Jump' });
    st().editRoutine('report', { kind: 'breakDown', item: 'a', steps: ['outline'] });
    st().doneLevel(id);
    // (P-102 audit F6; was "Done with Write report": leaving a level is Step out, not finishing.)
    expect(st().runNotice).toMatchObject({ verb: 'done', text: 'Left Write report', label: 'Step out' });
    st().jumpTo(id, { path: ['b'] });
    st().nextStep(id);
    expect(st().runNotice).toMatchObject({ verb: 'next', text: 'Done with Report' });
    expect(readRun(st().data, id)!.endedAt).toBeDefined();
    // P-102 (was: Undo brought the run back on "Send it"): finishing is final — nothing to take back.
    st().undoLast();
    expect(readRun(st().data, id)!.endedAt).toBeDefined();
  });

  it('the notice can be put away; that is not Undo', () => {
    started('report');
    st().editRoutine('sketch', { kind: 'addStep', text: 'Shade' });
    st().dismissRunNotice();
    expect(st().runNotice).toBeUndefined();
    expect(st().undo).toBeDefined();
  });
});

// ───────── After the audit (P-86): B2, U5 ─────────

describe('after the audit', () => {
  it('B2: while a run is running, another run cannot be resumed or started — it says what is running and changes nothing', () => {
    const first = started('report');
    st().pauseRun(first);
    const second = started('sketch'); // allowed: nothing was running
    expect(runnerView(st().data, second)!.status).toBe('running');
    const before = st().data;
    const did = st().resumeRun(first);
    expect(did).toMatchObject({ ok: false, reason: 'running', running: { runId: second, name: 'Sketch' } });
    expect(st().data).toBe(before);
    expect(st().runNotice).toMatchObject({ text: 'Sketch is running' });
    // Start on the tile of a routine whose run was left is a Resume: refused the same way.
    expect(st().startRoutine('report')).toMatchObject({ ok: false, reason: 'running' });
    expect(st().data).toBe(before);
    expect(runnerView(st().data, second)!.status).toBe('running');
    // Its own Resume is still itself; and once it is paused, the other can be resumed.
    expect(st().resumeRun(second)).toEqual({ ok: true, runId: second });
    st().pauseRun(second);
    expect(st().resumeRun(first).ok).toBe(true);
    expect(runnerView(st().data, first)!.status).toBe('running');
  });

  it('U5: the notice names what was done, not "Change"', () => {
    const id = started('report');
    st().editRoutine('report', { kind: 'remove', item: 'b' });
    expect(st().runNotice).toMatchObject({ text: 'Removed “Send it”' });
    st().editRoutine('sketch', { kind: 'addStep', text: 'Shade' });
    expect(st().runNotice).toMatchObject({ text: 'Added “Shade”' });
    st().editRoutine('sketch', { kind: 'removeRoutine' });
    expect(st().runNotice).toMatchObject({ text: 'Removed “Sketch”' });
    // What speaks for itself still says nothing (P-95: Next has no notice at all).
    st().undoLast();
    st().nextStep(id);
    expect(st().runNotice).toBeUndefined();
  });
});


// ───────── P-90: Plan ─────────

describe('Plan (P-90)', () => {
  it('from the runner: the run is paused in one change; nothing is running; no Undo (like Pause) and the Undo there was is gone — P-101 (ruling 4; was "in Plan … the app reopens in Plan"): no mode; it reads paused, and the app reopens home', () => {
    const id = started('report');
    st().nextStep(id);
    st().editRoutine('sketch', { kind: 'addStep', text: 'Shade' });
    expect(st().undo).toBeDefined();
    expect(st().planRun(id)).toEqual({ ok: true, runId: id });
    expect(st().data.runs[id]).toMatchObject({ status: 'paused' });
    expect('mode' in st().data.runs[id]).toBe(false);
    expect([st().undo, st().runNotice]).toEqual([undefined, undefined]);
    expect(leftOff(st().data)).toEqual({ kind: 'home' });
    expect(homeTiles(st().data).map((x) => [x.name, x.state, x.action])).toEqual([['Report', 'waiting', 'resume'], ['Sketch', 'idle', 'start']]);
    expect(planView(st().data, { runId: id })).toMatchObject({ planning: true, line: 'at a reply', forward: { kind: 'resume', label: 'Resume at a reply', runId: id } });
  });

  it('already in Plan: nothing changes — not the data, and not the Undo of the edit just made there', () => {
    const id = started('report');
    st().planRun(id);
    st().editRoutine('report', { kind: 'addStep', text: 'File it' });
    const was = st();
    expect(st().planRun(id)).toEqual({ ok: true, runId: id });
    expect([st().data, st().undo, st().runNotice]).toEqual([was.data, was.undo, was.runNotice]);
    expect(st().data).toBe(was.data);
  });

  it('every Plan edit changes the ROUTINE, names itself in the notice, and its Undo lasts until the next action — the run stays paused (P-101, ruling 4; was "in Plan") through the edit and through its Undo', () => {
    const id = started('report');
    st().planRun(id);
    const edits: [Parameters<ReturnType<typeof st>['editRoutine']>[1], string][] = [
      [{ kind: 'addStep', text: 'File it' }, 'Added “File it”'],
      [{ kind: 'addStep', text: 'Read it back', after: 'a' }, 'Added “Read it back”'],
      [{ kind: 'reword', item: 'a', text: 'Draft the report' }, 'Changed “Write report”'],
      [{ kind: 'move', item: 'b', by: -1 }, 'Moved “Send it”'],
      [{ kind: 'toStep', item: 'w' }, 'Made “a reply” a step'],
      [{ kind: 'toWait', item: 'b' }, 'Made “Send it” a wait'],
      [{ kind: 'divider', from: 1 }, 'Repeat from here added above “a reply”'],
      [{ kind: 'repeat', times: 3 }, 'Changed Repeat from here'],
      [{ kind: 'rename', words: 'Weekly report' }, 'Renamed “Report”'],
      [{ kind: 'breakDown', item: 'b', steps: ['Attach it', 'Press send'] }, 'Broke down “Send it”'],
      [{ kind: 'remove', item: 'a' }, 'Removed “Write report”'],
    ];
    for (const [edit, text] of edits) {
      const before = st().data;
      expect(st().editRoutine('report', edit), text).toEqual({ ok: true });
      expect(st().data.routines.report, text).not.toBe(before.routines.report);
      expect(st().runNotice, text).toMatchObject({ verb: 'editRoutine', text, label: 'Change' });
      expect(st().runNotice!.entry, text).toBe(st().undo);
      expect(isRunning(st().data, readRun(st().data, id)!), text).toBe(false);
      // Nothing puts the notice or its Undo away by itself: only the next action does.
      st().undoLast();
      expect(json(st().data), `${text} undone`).toEqual(json(before));
      expect(isRunning(st().data, readRun(st().data, id)!), `${text} undone`).toBe(false);
    }
    // No change was made for this run only.
    expect(readRun(st().data, id)!.changes).toEqual([]);
  });

  it('the next action replaces the notice and its Undo: one slot, the last edit’s', () => {
    const id = started('report');
    st().planRun(id);
    st().editRoutine('report', { kind: 'addStep', text: 'File it' });
    const first = st().runNotice!;
    st().editRoutine('report', { kind: 'remove', item: 'b' });
    expect(st().runNotice).toMatchObject({ text: 'Removed “Send it”' });
    expect(first.entry).not.toBe(st().undo);
    st().undoLast();
    expect(readRoutine(st().data, 'report')!.items.map((i) => i.id)).toHaveLength(4); // the removal is back; the added step stays
  });

  it('removing the HERE step in Plan: HERE is the next step, the run still in Plan; Undo puts the step and the place back together', () => {
    const id = started('report');
    st().planRun(id);
    const before = st().data;
    st().editRoutine('report', { kind: 'remove', item: 'a' });
    expect(planView(st().data, { runId: id })).toMatchObject({ planning: true, at: 'a reply', forward: { label: 'Resume at a reply' } });
    st().undoLast();
    expect(json(st().data)).toEqual(json(before));
    expect(planView(st().data, { runId: id })!.at).toBe('Write report');
  });

  it('Resume at <step>: running again exactly where it was, out of Plan; the last edit stays made but its Undo is gone (Resume is an action)', () => {
    const id = started('report');
    st().nextStep(id);
    st().planRun(id);
    st().editRoutine('report', { kind: 'addStep', text: 'File it' });
    expect(st().resumeRun(id)).toEqual({ ok: true, runId: id });
    expect(st().data.runs[id].status).toBe('running');
    expect('mode' in st().data.runs[id]).toBe(false);
    expect(runnerView(st().data, id)).toMatchObject({ planning: false, step: { kind: 'wait', words: 'a reply' } });
    expect(st().undo).toBeUndefined();
    expect(readRoutine(st().data, 'report')!.items).toHaveLength(4);
  });

  it('from a tile, for a run that is not the one the app is on: P-101 (ruling 4; was "in Plan"): nothing written, the slot not taken — what is running goes on; its Resume is refused while that runs, saying what', () => {
    const first = started('report');
    st().pauseRun(first);
    const second = started('sketch');
    const was = st().data;
    expect(st().planRun(first)).toEqual({ ok: true, runId: first });
    expect(st().data).toBe(was);
    expect('mode' in st().data.runs[first]).toBe(false);
    expect('status' in st().data.runs[first]).toBe(false);
    expect(st().data.runs[second].status).toBe('running');
    expect(leftOff(st().data)).toEqual({ kind: 'runner', runId: second });
    const before = st().data;
    expect(st().resumeRun(first)).toMatchObject({ ok: false, reason: 'running', running: { runId: second, name: 'Sketch' } });
    expect(st().data).toBe(before);
    expect(st().runNotice).toMatchObject({ text: 'Sketch is running' });
    st().pauseRun(second);
    expect(st().resumeRun(first).ok).toBe(true);
    expect('mode' in st().data.runs[first]).toBe(false);
  });

  it('P-96 (ruling 7; was: "Next on the last step of an open goal lands in Plan"): that Next ENDS the run and goes home, "Done with <name>" — P-102: with no Undo (was: with Undo); the edge the build before left a run at is still Plan — a step added there is where Resume goes; Done ends it from there, finally (P-102; was: with Undo)', () => {
    const goal = st().createRoutine('Learn Spanish');
    if (!goal.ok || !goal.routineId) throw new Error('not made');
    st().editRoutine(goal.routineId, { kind: 'addStep', text: 'Find a tutor' });
    const id = started(goal.routineId);
    const running = st().data;
    expect(st().nextStep(id)).toEqual({ ok: true, runId: id, home: true });
    expect(readRun(st().data, id)).toMatchObject({ endedBy: 'finished' });
    expect(st().runNotice).toMatchObject({ verb: 'next', text: 'Done with Learn Spanish' });
    expect(st().undo).toBeUndefined();
    st().undoLast();
    // (The edge below is built from the run as it was before that Next.)
    useStore.setState({ data: running, undo: undefined, runNotice: undefined });
    // A run at the edge, as the build before left it (Next off the last step).
    const f = readRun(st().data, id)!.frames[0];
    useStore.setState({ data: { ...st().data, runs: { ...st().data.runs, [id]: { ...st().data.runs[id], frames: [{ ...f, at: null }], status: 'paused', mode: 'plan' } } }, undo: undefined, runNotice: undefined });
    expect(st().data.runs[id]).toMatchObject({ status: 'paused', mode: 'plan' });
    expect(planView(st().data, { runId: id })).toMatchObject({ planning: true, edge: true, canDone: true, line: 'nothing next yet' });
    expect(planView(st().data, { runId: id })!.forward).toBeUndefined();
    expect(st().resumeRun(id)).toEqual({ ok: false, reason: 'asking' });
    expect(st().nextStep(id)).toEqual({ ok: false, reason: 'asking' });
    const edge = st().data;
    st().editRoutine(goal.routineId, { kind: 'addStep', text: 'Book a lesson' });
    expect(planView(st().data, { runId: id })).toMatchObject({ planning: true, edge: false, forward: { label: 'Resume at Book a lesson' } });
    st().undoLast();
    expect(json(st().data)).toEqual(json(edge));
    expect(st().doneLevel(id)).toEqual({ ok: true, runId: id, home: true });
    expect(readRun(st().data, id)!.endedAt).toBeDefined();
    expect(st().runNotice).toMatchObject({ verb: 'done', text: 'Done with Learn Spanish' });
    expect(st().runNotice!.entry).toBeUndefined();
    const done = st().data;
    st().undoLast();
    expect(st().data).toBe(done);
  });

  it('on a run an earlier build stored in Plan (P-101, ruling 4: the stored mode is read, never written now), Next, Step in, Back and (off the edge) Done are refused, and change nothing', () => {
    const id = started('report');
    st().planRun(id);
    useStore.setState({ data: { ...st().data, runs: { ...st().data.runs, [id]: { ...st().data.runs[id], mode: 'plan' } } } });
    const was = st();
    for (const press of [() => st().nextStep(id), () => st().stepIn(id), () => st().backTo(id), () => st().doneLevel(id)]) expect(press()).toEqual({ ok: false, reason: 'planning' });
    expect([st().data, st().undo, st().runNotice]).toEqual([was.data, was.undo, was.runNotice]);
  });

  describe('a run from the build before, with this-run changes (ruling 3)', () => {
    const BEFORE = JSON.parse(readFileSync(join(__dirname, '../storage/fixtures/golden/p90-expected.json'), 'utf8')).data as Data;
    const A = 'p90-008';
    const frozen = () => useStore.setState({ data: json(BEFORE), undo: undefined, runNotice: undefined });

    it('P-96 (ruling 7; was P-95 audit F1: "a Next that reaches the edge folds them too"): Next no longer reaches the edge — the Next that finishes the run ends it, its changes stay on the ended record unfolded (an ended run’s are never folded), with "Done with <name>" — P-102: and no Undo (was: an Undo that put every record back)', () => {
      frozen();
      expect(st().resumeRun(A).ok).toBe(true);
      let before = st().data;
      let n = 0;
      while (!readRun(st().data, A)!.endedAt && n++ < 60) {
        before = st().data;
        expect(st().nextStep(A).ok).toBe(true);
        expect(isPlanning(st().data, readRun(st().data, A)!)).toBe(false);
      }
      expect(readRun(st().data, A)!.changes).toHaveLength(7);
      expect(st().data.routines).toEqual(before.routines);
      expect(st().runNotice).toMatchObject({ verb: 'next', text: 'Done with Apply for jobs' });
      expect(st().runNotice!.entry).toBeUndefined();
      expect(st().undo).toBeUndefined();
      st().undoLast();
    });

    it('P-95 audit F1/F4: a Jump that lands where the run reaches the edge, folding them, keeps its notice and Undo too', () => {
      frozen();
      expect(st().resumeRun(A).ok).toBe(true);
      // Back to the first layer, on its last step; one Next then reaches the edge.
      const last = readRoutine(st().data, 'p90-007')!.items.at(-1)!.id;
      expect(st().jumpTo(A, { path: [last] }).ok).toBe(true);
      expect(st().runNotice?.entry).toBe(st().undo);
      expect(st().undo).toBeDefined();
    });

    it('Plan folds them into the routine in ONE change, with a notice that names it and an Undo; the Undo puts every record back exactly — and the run is no longer in Plan (it is as it was)', () => {
      frozen();
      expect(planView(st().data, { runId: A })!.unfolded).toBe(true);
      expect(st().planRun(A)).toEqual({ ok: true, runId: A });
      expect(st().runNotice).toMatchObject({ verb: 'plan', text: 'Kept this run’s changes in Apply for jobs', label: 'Plan' });
      expect(st().runNotice!.entry).toBe(st().undo);
      expect(readRun(st().data, A)!.changes).toEqual([]);
      expect(st().data.routines['p90-007']).toMatchObject({ repeat: 5 });
      expect(planView(st().data, { runId: A })).toMatchObject({ planning: true, unfolded: false, line: 'at Find the right tab' });
      expect(st().undoLast()).toBe(true);
      expect(json(st().data)).toEqual(BEFORE);
      // P-101 (ruling 4; was `planning: false`): it is not running, so Plan's to show — with its changes back.
      expect(planView(st().data, { runId: A })).toMatchObject({ planning: true, unfolded: true });
    });

    it('opened again after the fold: nothing more happens, and the fold’s Undo is still there', () => {
      frozen();
      st().planRun(A);
      const was = st();
      st().planRun(A);
      expect([st().data, st().undo, st().runNotice]).toEqual([was.data, was.undo, was.runNotice]);
    });

    it('until Plan is opened on it, nothing is folded: starting, pausing and resuming around it leave its changes and the routine as they were', () => {
      frozen();
      st().resumeRun('p90-run-b');
      st().pauseRun('p90-run-b', 'x');
      st().leaveRun('p90-run-b');
      expect(st().resumeRun(A).ok).toBe(true);
      expect(st().nextStep(A).ok).toBe(true);
      expect(readRun(st().data, A)!.changes).toHaveLength(7);
      expect(json(st().data.routines)).toEqual(BEFORE.routines);
    });
  });
});

describe('after the P-90 audit', () => {
  /** As the build before left it: Report's run finished its steps and is stored "running" at the open edge. */
  const legacyEdge = (): Data => {
    const d = seeded();
    return {
      ...d,
      routines: { ...d.routines, report: { ...d.routines.report, open: true }, notes: { id: 'notes', words: 'Notes', named: true, createdAt: at, home: true, items: [{ id: 'n1', text: 'Read them' }, { id: 'n2', text: 'File them' }] } },
      runs: {
        edge: { id: 'edge', routineId: 'report', startedAt: at, touchedAt: '2026-11-20T00:00:00.000Z', frames: [{ seq: 'report', at: null, round: 1 }], changes: [], status: 'running' },
        left: { id: 'left', routineId: 'notes', startedAt: at, touchedAt: '2026-11-19T00:00:00.000Z', frames: [{ seq: 'notes', at: 'n1', round: 1 }], changes: [] },
      },
    };
  };
  const runningIds = () => Object.values(st().data.runs).filter((r) => r.status === 'running').map((r) => r.id);

  it('F1: a run stored "running" at the edge reads as planning and blocks nothing — Start elsewhere starts, and that run is stored not running (P-101, ruling 4: no mode; it reads paused)', () => {
    useStore.setState({ data: legacyEdge() });
    expect(leftOff(st().data)).toEqual({ kind: 'plan', runId: 'edge' });
    const did = st().startRoutine('sketch');
    if (!did.ok) throw new Error(`refused: ${did.reason}`);
    expect(st().runNotice?.text ?? '').not.toContain('is running');
    expect(runningIds()).toEqual([did.runId]);
    expect(st().data.runs.edge.status).toBeUndefined();
    expect('mode' in st().data.runs.edge).toBe(false);
    expect(homeTiles(st().data).map((x) => [x.name, x.state])).toEqual([['Notes', 'paused'], ['Report', 'paused'], ['Sketch', 'running']]);
    // A start has no Undo (P-95).
    expect(st().undo).toBeUndefined();
  });

  it('F1: Resume on another run’s tile resumes it; Resume on the edge run itself is refused (nothing to resume at), never "already running"', () => {
    useStore.setState({ data: legacyEdge() });
    expect(st().resumeRun('edge')).toEqual({ ok: false, reason: 'asking' });
    expect(st().resumeRun('left')).toEqual({ ok: true, runId: 'left' });
    expect(runningIds()).toEqual(['left']);
    expect('mode' in st().data.runs.edge).toBe(false);
    expect(st().data.runs.edge.status).toBeUndefined();
  });

  it('F8: Resume pressed with words still open in Plan — the edit made by that press keeps its notice and its Undo across the Resume; Undo then takes the words back and the run goes on running', () => {
    const id = started('report');
    st().planRun(id);
    expect(st().editRoutine('report', { kind: 'reword', item: 'b', text: 'Post it' })).toEqual({ ok: true });
    const edited = st();
    expect(edited.runNotice).toMatchObject({ text: 'Changed “Send it”' });
    expect(st().resumeRun(id, true)).toEqual({ ok: true, runId: id });
    expect(st().data.runs[id].status).toBe('running');
    expect('mode' in st().data.runs[id]).toBe(false);
    // Not a silent commit: the same notice, the same Undo.
    expect(st().runNotice).toBe(edited.runNotice);
    expect(st().undo).toBe(edited.undo);
    expect(st().runNotice!.entry).toBe(st().undo);
    st().undoLast();
    expect(readRoutine(st().data, 'report')!.items.map((i) => ('text' in i ? i.text : 'wait'))).toEqual(['Write report', 'wait', 'Send it']);
    expect(runnerView(st().data, id)).toMatchObject({ status: 'running', step: { words: 'Write report' } });
    // Without it (any other Resume) the slot is cleared, as before.
    st().planRun(id);
    st().editRoutine('report', { kind: 'reword', item: 'b', text: 'Post it' });
    st().resumeRun(id);
    expect(st().undo).toBeUndefined();
    expect(st().runNotice).toBeUndefined();
  });

  it('F8: Start pressed with words still open in Plan — the edit keeps its notice and its Undo across the Start; Undo takes the words back and the run stays', () => {
    expect(st().editRoutine('sketch', { kind: 'addStep', text: 'Breathe', after: 'q' })).toEqual({ ok: true });
    const edited = st();
    expect(edited.runNotice).toMatchObject({ text: 'Added “Breathe”' });
    const did = st().startRoutine('sketch', true);
    if (!did.ok || !did.runId) throw new Error('not started');
    expect(st().runNotice).toBe(edited.runNotice);
    expect(st().undo).toBe(edited.undo);
    st().undoLast();
    expect(readRoutine(st().data, 'sketch')!.items.map((i) => ('text' in i ? i.text : ''))).toEqual(['Warm up']);
    expect(runnerView(st().data, did.runId)).toMatchObject({ status: 'running', step: { words: 'Warm up' } });
  });

  it('F7: Jump on a run that was left, while another run is running, is refused saying what is running — never a silent demotion', () => {
    const first = started('report');
    st().pauseRun(first);
    const second = started('sketch');
    const before = st().data;
    expect(st().jumpTo(first, { path: ['b'] })).toEqual({ ok: false, reason: 'running', running: { runId: second, name: 'Sketch' } });
    expect(st().data).toBe(before);
    expect(st().runNotice).toMatchObject({ text: 'Sketch is running' });
    // The run that is running may jump; and once it is paused, so may the other.
    expect(st().jumpTo(second, { level: 0 }).ok).toBe(true);
    st().pauseRun(second);
    expect(st().jumpTo(first, { path: ['b'] }).ok).toBe(true);
    expect(runningIds()).toEqual([first]);
  });
});
