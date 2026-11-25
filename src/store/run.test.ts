/**
 * P-86: the store's run actions. Each goes through the engine; each leaves an Undo with its notice or
 * clears the Undo slot (never a stale one); one Undo restores the routine and the run together; a
 * start is refused, saying what is running, while something is.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { readRoutine, readRun } from '@/domain/run';
import { describeChanges, homeTiles, runnerView } from '@/domain/runView';
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
  useStore.setState({ data: seeded(), undo: undefined, toast: undefined, runNotice: undefined, runOffer: undefined, toVerb: undefined, draft: { text: '', toIds: [] } });
});

describe('starting', () => {
  it('Start from a tile: the run is running; Undo takes the run away again; a second tap changes nothing and keeps that Undo', () => {
    const before = st().data;
    const id = started('report');
    expect(runnerView(st().data, id)).toMatchObject({ status: 'running', step: { words: 'Write report' } });
    expect(st().runNotice).toMatchObject({ verb: 'start', text: '', label: 'Start' });
    expect(st().runNotice!.entry).toBe(st().undo);
    const once = st();
    expect(st().startRoutine('report')).toEqual({ ok: true, runId: id });
    expect(st().data).toBe(once.data);
    expect(st().undo).toBe(once.undo);
    st().undoLast();
    expect(json(st().data)).toEqual(json(before));
    expect(st().runNotice).toBeUndefined();
  });

  it('New: <words>: a routine with an open edge and a run asking for its first step; the step typed is kept in the routine; one Undo each', () => {
    const made = st().startNew('  Learn   Spanish ');
    if (!made.ok || !made.runId) throw new Error('not started');
    const routineId = readRun(st().data, made.runId)!.routineId;
    expect(readRoutine(st().data, routineId)).toMatchObject({ words: 'Learn Spanish', open: true, home: true, items: [] });
    expect(runnerView(st().data, made.runId)!.step.kind).toBe('edge');
    const asked = st().data;
    expect(st().addEdgeStep(made.runId, 'Find a tutor')).toEqual({ ok: true, runId: made.runId });
    expect(readRoutine(st().data, routineId)!.items.map((i) => ('text' in i ? i.text : ''))).toEqual(['Find a tutor']);
    expect(runnerView(st().data, made.runId)!.step.words).toBe('Find a tutor');
    // One Undo: the step leaves the routine AND the run is asking again.
    st().undoLast();
    expect(json(st().data)).toEqual(json(asked));
    // And the start itself: one Undo takes the routine and its run away together.
    useStore.setState({ data: seeded(), undo: undefined });
    const fresh = st().data;
    st().startNew('Learn Spanish');
    expect(Object.keys(st().data.routines)).toHaveLength(3);
    expect(Object.keys(st().data.runs)).toHaveLength(1);
    st().undoLast();
    expect(json(st().data)).toEqual(json(fresh));
  });

  it('while something is running a start is refused, saying what is; nothing changes and the Undo there is stays', () => {
    const id = started('report');
    const was = st();
    expect(st().startRoutine('sketch')).toEqual({ ok: false, reason: 'running', running: { runId: id, name: 'Report' } });
    expect(st().data).toBe(was.data);
    expect(st().undo).toBe(was.undo);
    expect(st().runNotice).toEqual({ verb: 'start', text: 'Report is running', label: '' });
    expect(st().startNew('Learn Spanish')).toMatchObject({ ok: false, reason: 'running', running: { name: 'Report' } });
    expect(st().data).toBe(was.data);
    // Paused, the other may start.
    st().pauseRun(id);
    expect(st().startRoutine('sketch').ok).toBe(true);
    expect(homeTiles(st().data).map((x) => [x.name, x.state])).toEqual([['Report', 'paused'], ['Sketch', 'running']]);
  });
});

describe('Undo after every reversible action, and never a stale one', () => {
  it('each of these leaves an Undo that is the notice’s own, and it restores exactly what was there', () => {
    const id = started('report');
    const steps: [string, () => { ok: boolean }][] = [
      ['changeWords', () => st().changeWords(id, 'Draft report')],
      ['breakDown', () => st().breakDown(id, ['outline', ' ', 'draft'])],
      ['editRun', () => st().editRun(id, { kind: 'add', seq: 'report', after: 'b', text: 'File it' })],
      ['nextStep', () => st().nextStep(id)],
      ['backTo', () => st().backTo(id)],
      ['doneLevel', () => st().doneLevel(id)],
      ['jumpTo', () => st().jumpTo(id, { path: ['b'] })],
      ['keepChange', () => st().keepChange(id, 'all')],
      ['editRoutine', () => st().editRoutine('report', { kind: 'remove', item: 'b' })],
      ['dropChange', () => (st().changeWords(id, 'again'), st().dropChange(id, readRun(st().data, id)!.changes[0].id))],
      ['stepIn', () => (st().jumpTo(id, { path: ['a'] }), st().stepIn(id))],
    ];
    for (const [name, press] of steps) {
      const before = st().data;
      expect(press().ok, name).toBe(true);
      const after = st().data;
      expect(after, name).not.toBe(before);
      expect(st().undo, name).toBeDefined();
      expect(st().runNotice?.entry, name).toBe(st().undo);
      if (name === 'dropChange' || name === 'stepIn') continue; // (two actions in one press here: the Undo is the second's)
      st().undoLast();
      expect(json(st().data), `${name} undone`).toEqual(json(before));
      expect(st().undo, name).toBeUndefined();
      expect(st().runNotice, name).toBeUndefined();
      useStore.setState({ data: after }); // carry on from after the action
    }
  });

  it('Keep: one Undo puts back the routine, the unnamed sequence and the run together', () => {
    const id = started('report');
    st().breakDown(id, ['outline', 'draft']);
    const before = st().data;
    const u = Object.values(before.routines).find((r) => !r.named)!;
    expect(st().keepChange(id, 'all').ok).toBe(true);
    expect(readRoutine(st().data, 'report')!.items[0]).toEqual({ id: 'a', ref: u.id });
    expect('ownerRunId' in st().data.routines[u.id]).toBe(false);
    expect(readRun(st().data, id)!.changes).toEqual([]);
    st().undoLast();
    expect(json(st().data)).toEqual(json(before));
  });

  it('Pause, Resume and Home leave no Undo and clear the one there was: Next → Pause → Resume → Undo does nothing', () => {
    const id = started('report');
    st().nextStep(id);
    expect(st().undo).toBeDefined();
    st().pauseRun(id, 'lunch');
    expect(st().undo).toBeUndefined();
    expect(st().runNotice).toBeUndefined();
    st().resumeRun(id);
    const now = st().data;
    st().undoLast();
    expect(st().data).toBe(now);
    st().nextStep(id);
    expect(st().undo).toBeDefined();
    st().leaveRun(id);
    expect(st().undo).toBeUndefined();
  });

  it('the reason typed in place changes only the reason, keystroke by keystroke, and leaves the Undo slot alone', () => {
    const id = started('report');
    st().pauseRun(id);
    st().changeWords(id, 'Draft report');
    const slot = st().undo;
    for (const typed of ['n', 'ne', 'need ', 'need the ad']) expect(st().setPauseReason(id, typed)).toEqual({ ok: true, runId: id });
    expect(readRun(st().data, id)!.reason).toBe('need the ad');
    expect(st().undo).toBe(slot);
    st().setPauseReason(id, '');
    expect(readRun(st().data, id)!.reason).toBeUndefined();
    expect(st().undo).toBe(slot);
  });

  it('a change elsewhere replaces the slot: the notice’s Undo is no longer its own; and a run action puts a quiet note away', () => {
    const id = started('report');
    st().nextStep(id);
    const notice = st().runNotice!;
    // Something else took the Undo slot (P-89: nothing in the app does today; the screen still checks).
    person(useStore).log('a line from before');
    useStore.setState({ toast: { message: 'Just a moment — reconnecting.', notice: true } });
    expect(st().undo).toBeDefined();
    expect(notice.entry).not.toBe(st().undo);
    expect(st().runNotice).toBe(notice); // still there to read; the screen offers Undo only while entry === undo
    st().nextStep(id);
    expect(st().toast).toBeUndefined();
    expect(st().runNotice!.entry).toBe(st().undo);
  });

  it('a refused action changes nothing: not the data, not the Undo slot, not the notice', () => {
    const id = started('report');
    st().nextStep(id); // on the wait
    const was = st();
    expect(st().breakDown(id, ['x'])).toEqual({ ok: false, reason: 'not-a-step' });
    expect(st().stepIn(id)).toEqual({ ok: false, reason: 'not-a-routine' });
    expect(st().addEdgeStep(id, 'x')).toEqual({ ok: false, reason: 'not-at-edge' });
    expect(st().changeWords(id, '  ')).toEqual({ ok: false, reason: 'empty' });
    expect(st().nextStep('nope')).toEqual({ ok: false, reason: 'gone' });
    expect([st().data, st().undo, st().runNotice]).toEqual([was.data, was.undo, was.runNotice]);
    expect(st().data).toBe(was.data);
  });
});

describe('what the notice says, and what is offered to keep', () => {
  it('Next on a wait is "It’s happened"; a run that finishes says "Finished <name>"; Done says "Done with <name>"; a jump says where from', () => {
    const id = started('report');
    st().nextStep(id);
    expect(st().runNotice).toMatchObject({ verb: 'next', text: '', label: 'Next' });
    st().nextStep(id);
    expect(st().runNotice).toMatchObject({ verb: 'next', text: '', label: 'It’s happened' });
    st().jumpTo(id, { level: 0 });
    expect(st().runNotice).toMatchObject({ verb: 'jump', text: 'Jumped from Send it', label: 'Jump' });
    st().breakDown(id, ['outline']);
    st().doneLevel(id);
    expect(st().runNotice).toMatchObject({ verb: 'done', text: 'Done with Write report', label: 'Done' });
    st().jumpTo(id, { path: ['b'] });
    st().nextStep(id);
    expect(st().runNotice).toMatchObject({ verb: 'next', text: 'Finished Report' });
    expect(readRun(st().data, id)!.endedAt).toBeDefined();
    st().undoLast();
    expect(readRun(st().data, id)!.endedAt).toBeUndefined();
    expect(runnerView(st().data, id)).toMatchObject({ status: 'running', step: { words: 'Send it' } });
  });

  it('leaving a level with this run’s changes offers them once, each to keep; keeping one leaves the others offered; the next action puts the offer away', () => {
    const id = started('report');
    st().breakDown(id, ['outline', 'draft']);
    st().changeWords(id, 'outline it');
    expect(st().runOffer).toBeUndefined();
    st().doneLevel(id);
    const offer = st().runOffer!;
    expect(offer.runId).toBe(id);
    expect(describeChanges(st().data, id, offer.changeIds).map((c) => [c.kind, c.words])).toEqual([['breakdown', 'Write report'], ['reword', 'outline it']]);
    st().keepChange(id, offer.changeIds[1]);
    expect(describeChanges(st().data, id, st().runOffer!.changeIds).map((c) => c.kind)).toEqual(['breakdown']);
    st().keepChange(id, offer.changeIds[0]);
    expect(st().runOffer).toBeUndefined();
    // Offered again? Never: leaving the run ends with nothing new to show.
    st().doneLevel(id);
    expect(st().runOffer).toBeUndefined();
  });

  it('the offer never blocks: the run has already moved on; it can be put away, and a later action puts it away too', () => {
    const id = started('report');
    st().breakDown(id, ['outline']);
    st().nextStep(id); // finishes the breakdown by itself
    expect(runnerView(st().data, id)!.step.words).toBe('a reply');
    expect(st().runOffer!.changeIds).toHaveLength(1);
    st().dismissRunOffer();
    expect(st().runOffer).toBeUndefined();
    st().backTo(id);
    st().stepIn(id);
    st().changeWords(id, 'outline it');
    st().doneLevel(id);
    expect(st().runOffer!.changeIds).toHaveLength(1); // only the new one: the breakdown was shown once already
    st().nextStep(id);
    expect(st().runOffer).toBeUndefined();
    st().dismissRunNotice();
    expect(st().runNotice).toBeUndefined();
    expect(st().undo).toBeDefined(); // putting the notice away is not Undo
  });
});

// ───────── After the audit (P-86): D1, D2, B2, B6, U5 ─────────

describe('after the audit', () => {
  const twoChanges = () => {
    const id = started('report');
    st().changeWords(id, 'Write the report');
    st().editRun(id, { kind: 'reword', seq: 'report', item: 'b', text: 'Send it off' });
    st().editRun(id, { kind: 'add', seq: 'report', after: 'b', text: 'File it' });
    return { id, changes: readRun(st().data, id)!.changes.map((c) => c.id) };
  };

  it('D1: Keep all of the changes shown is ONE Undo — taking it back leaves nothing kept', () => {
    const { id, changes } = twoChanges();
    const before = st().data;
    expect(st().keepChange(id, [changes[0], changes[1]]).ok).toBe(true);
    expect(readRoutine(st().data, 'report')!.items.map((i) => ('text' in i ? i.text : ''))).toEqual(['Write the report', '', 'Send it off']);
    expect(readRun(st().data, id)!.changes.map((c) => c.id)).toEqual([changes[2]]);
    expect(st().runNotice!.entry).toBe(st().undo);
    st().undoLast();
    expect(json(st().data)).toEqual(json(before));
    expect(st().undo).toBeUndefined();
  });

  it('D1: with the Keep sheet up, keeping some of what it offers leaves the rest offered', () => {
    const { id, changes } = twoChanges();
    useStore.setState({ runOffer: { runId: id, changeIds: changes } });
    st().keepChange(id, [changes[0], changes[2]]);
    expect(st().runOffer).toEqual({ runId: id, changeIds: [changes[1]] });
  });

  it('D2 (two tabs): the step moved on under the open sheet — the sub-steps go to the step they were typed for, the run stays', () => {
    const id = started('report'); // the sheet is opened on "a"
    // Another copy pressed Next twice; this one takes that in.
    st().nextStep(id);
    st().nextStep(id);
    expect(runnerView(st().data, id)!.step.words).toBe('Send it');
    expect(st().breakDown(id, ['Outline', 'Draft'], { seq: 'report', item: 'a' }).ok).toBe(true);
    expect(runnerView(st().data, id)).toMatchObject({ depth: 1, step: { words: 'Send it', kind: 'step' } });
    const mine = describeChanges(st().data, id, readRun(st().data, id)!.changes);
    expect(mine).toMatchObject([{ kind: 'breakdown', words: 'Write report', steps: ['Outline', 'Draft'] }]);
    expect(st().runNotice).toMatchObject({ text: 'Broke down “Write report”' });
  });

  it('D2 (a kept Next): Next pressed while reconnecting comes in under the open sheet; Step in still breaks down the step the sheet was opened on', () => {
    const id = started('report');
    useStore.setState({ toVerb: { runId: id, verb: 'next', base: st().data.runs[id] } });
    st().verbMarked(); // the data is back: the kept Next is applied, the sheet still open on "a"
    expect(runnerView(st().data, id)!.step.kind).toBe('wait');
    expect(st().breakDown(id, ['Outline'], { seq: 'report', item: 'a' }).ok).toBe(true);
    expect(runnerView(st().data, id)!.step).toMatchObject({ kind: 'wait', words: 'a reply' });
    expect(describeChanges(st().data, id, readRun(st().data, id)!.changes)).toMatchObject([{ kind: 'breakdown', words: 'Write report' }]);
  });

  it('D2: opened on the step it is still on, it steps in as before', () => {
    const id = started('report');
    expect(st().breakDown(id, ['Outline'], { seq: 'report', item: 'a' }).ok).toBe(true);
    expect(runnerView(st().data, id)).toMatchObject({ depth: 2, step: { words: 'Outline' } });
  });

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
    expect(st().startNew('Report')).toMatchObject({ ok: false, reason: 'running' });
    expect(st().data).toBe(before);
    expect(runnerView(st().data, second)!.status).toBe('running');
    // Its own Resume is still itself; and once it is paused, the other can be resumed.
    expect(st().resumeRun(second)).toEqual({ ok: true, runId: second });
    st().pauseRun(second);
    expect(st().resumeRun(first).ok).toBe(true);
    expect(runnerView(st().data, first)!.status).toBe('running');
  });

  it('B6: a Jump out of a level with a change of this run sets the Keep offer, once, and blocks nothing', () => {
    const id = started('report');
    st().breakDown(id, ['Outline', 'Draft'], { seq: 'report', item: 'a' });
    st().changeWords(id, 'Outline it');
    st().dismissRunOffer();
    expect(st().jumpTo(id, { path: ['b'] }).ok).toBe(true);
    expect(runnerView(st().data, id)!.step.words).toBe('Send it');
    expect(st().runOffer?.runId).toBe(id);
    expect(describeChanges(st().data, id, st().runOffer!.changeIds).map((c) => c.kind).sort()).toEqual(['breakdown', 'reword']);
    expect(st().runNotice).toMatchObject({ text: 'Jumped from Outline it' });
  });

  it('U5: the notice names what was done, not "Change"', () => {
    const id = started('report');
    st().editRun(id, { kind: 'remove', seq: 'report', item: 'b' });
    expect(st().runNotice).toMatchObject({ text: 'Removed “Send it”' });
    st().editRoutine('sketch', { kind: 'addStep', text: 'Shade' });
    expect(st().runNotice).toMatchObject({ text: 'Added “Shade”' });
    st().editRoutine('sketch', { kind: 'removeRoutine' });
    expect(st().runNotice).toMatchObject({ text: 'Removed “Sketch”' });
    // What speaks for itself still says nothing.
    st().undoLast();
    st().nextStep(id);
    expect(st().runNotice).toMatchObject({ text: '', label: 'Next' });
  });
});
