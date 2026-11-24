/**
 * P-73 (B-08 slice 1): the trailhead's Return sends the line up as a star — lit by default, settled at
 * once with the done chip — and the rise's choices: Done it, ↳ First step, Toward…, each with Undo.
 * (P-65's "Kept, loose · Undo" and "Move it?" are retired.)
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { emptyData } from '@/domain/types';

import { useStore } from './useStore';

const st = () => useStore.getState();

/** draw (no step) and cook (staged "make soup"). */
function seed() {
  const draw = st().createThread('draw');
  const cook = st().createThread('cook');
  st().setNext(cook, 'make soup');
  return { draw, cook };
}

/** Types a line on the trailhead and presses Return (with the done chip as it is). */
function send(text: string) {
  st().setDraft({ text });
  return st().log(undefined, { trail: true, done: st().doneChip })!;
}

beforeEach(() => {
  useStore.setState({
    data: emptyData(),
    undo: undefined,
    toast: undefined,
    kept: undefined,
    doneChip: false,
    draft: { text: '', toIds: [] },
    storage: { state: 'ready', kind: 'sqlite' },
  });
});

describe('Return on the trailhead', () => {
  it('logs exactly as typed, lit, with no toast; the line is the rise’s subject', () => {
    seed();
    const id = send('want to sketch hands');
    expect(st().data.activities[id]).toMatchObject({ text: 'want to sketch hands', doingId: undefined, toIds: [], lit: true });
    expect(st().data.activities[id].settledAt).toBeUndefined();
    expect(st().toast).toBeUndefined();
    expect(st().kept).toEqual({ activityId: id, text: 'want to sketch hands' });
    expect(st().draft.text).toBe('');
  });

  it('an empty line logs nothing', () => {
    st().setDraft({ text: '   ' });
    expect(st().log(undefined, { trail: true })).toBeUndefined();
    expect(st().data.activities).toEqual({});
    expect(st().kept).toBeUndefined();
  });

  it('lines logged anywhere else (Map’s ＋, a trail’s Did it, the thread page) are never lit', () => {
    const { cook } = seed();
    st().setDraft({ text: 'from Map' });
    const a = st().log()!;
    const b = st().log({ text: 'make soup', doingId: cook, toIds: [], fromNextOf: cook, fromNextText: 'make soup' }, { keepLine: true })!;
    for (const id of [a, b]) {
      expect(st().data.activities[id].lit, id).toBeUndefined();
      expect(st().data.activities[id].settledAt, id).toBeUndefined();
    }
  });
});

describe('Undo of the Return itself (audit F4: as the retired “Kept, loose · Undo” did)', () => {
  it('before any choice, Undo takes the line back out and puts the words back in the field', () => {
    const id = send('half a seam');
    expect(st().undoKept()).toBe(true);
    expect(st().data.activities[id]).toBeUndefined();
    expect(st().kept).toBeUndefined();
    expect(st().draft.text).toBe('half a seam');
  });

  it('words typed since stay in the field', () => {
    send('half a seam');
    st().setDraft({ text: 'something else' });
    st().undoKept();
    expect(st().draft.text).toBe('something else');
  });

  it('a line opened again from the sky has no Return of its own to undo', () => {
    st().setDraft({ text: 'earlier' });
    const id = st().log()!;
    st().keepLoose(id);
    expect(st().undoKept()).toBe(false);
    expect(st().data.activities[id]).toBeDefined();
  });
});

describe('the session ends after a choice: Undo goes on in the home’s toast (audit F1)', () => {
  it('Done it, then the session ends (leaveKept): the toast says “Settled” with Undo, which lights it again', () => {
    const id = send('sketch hands');
    st().settleKept();
    st().leaveKept(id);
    expect(st().kept).toBeUndefined();
    expect(st().toast).toEqual({ message: 'Settled', activityId: id });
    expect(st().undoLast()).toBe(true);
    expect(st().data.activities[id].lit).toBe(true);
    expect(st().data.activities[id].settledAt).toBeUndefined();
    expect(st().toast).toBeUndefined();
  });

  it('Toward…: “Toward draw”, Undo detaches', () => {
    const { draw } = seed();
    const id = send('sketched');
    st().towardKept(draw);
    st().leaveKept(id);
    expect(st().toast?.message).toBe('Toward draw');
    st().undoLast();
    expect(st().data.activities[id].doingId).toBeUndefined();
  });

  it('↳ First step: Undo removes what it made (a wander used since stays, without the step)', () => {
    const id = send('learn watercolour');
    st().firstStepKept('buy a brush');
    const tid = st().data.activities[id].doingId!;
    st().leaveKept(id);
    expect(st().toast?.message).toBe('First step on learn watercolour');
    st().undoLast();
    expect(st().data.threads[tid]).toBeUndefined();
    expect(st().data.activities[id]).toMatchObject({ doingId: undefined, lit: true });

    const again = send('learn oils');
    st().firstStepKept('buy oils');
    const oils = st().data.activities[again].doingId!;
    st().leaveKept(again);
    // Something else goes toward it meanwhile (the toast's Undo is still for the first step).
    const undo = st().undo;
    useStore.setState({ data: { ...st().data, activities: { ...st().data.activities, x: { id: 'x', text: 'x', occurredAt: '2026-01-01T00:00:00.000Z', createdAt: '2026-01-01T00:00:00.000Z', doingId: oils, toIds: [] } } } });
    expect(st().undo).toBe(undo);
    st().undoLast();
    expect(st().data.threads[oils]).toMatchObject({ name: 'learn oils', next: undefined });
  });

  it('a done-chip line: “Settled”, Undo takes it back out and puts its words in an empty field', () => {
    st().setDoneChip(true);
    const id = send('read a chapter');
    st().leaveKept(id);
    expect(st().toast).toEqual({ message: 'Settled', activityId: id });
    st().undoLast();
    expect(st().data.activities[id]).toBeUndefined();
    expect(st().draft.text).toBe('read a chapter');
  });

  it('leaving with no choice made leaves no toast; a later change’s Undo is never mistaken for the choice’s', () => {
    const { draw } = seed();
    const id = send('a');
    st().leaveKept(id);
    expect(st().toast).toBeUndefined();
    const b = send('b');
    st().towardKept(draw);
    st().leaveKept(b);
    st().removeActivity(id);
    st().undoLast();
    expect(st().data.activities[id]).toBeDefined();
    expect(st().data.activities[b].doingId).toBe(draw);
  });
});

describe('the done chip', () => {
  it('three Returns in a row: three settled lines (never lit), each the rise’s subject in turn, with the chip still on', () => {
    st().setDoneChip(true);
    const ids = ['read a chapter', 'went for a walk', 'called mum'].map((t) => {
      const id = send(t);
      expect(st().kept).toEqual({ activityId: id, text: t, did: { kind: 'done' } });
      expect(st().doneChip).toBe(true);
      return id;
    });
    for (const id of ids) {
      expect(st().data.activities[id].lit).toBeUndefined();
      expect(st().data.activities[id].settledAt).toEqual(expect.any(String));
    }
  });

  it('its Undo takes the line back out and puts the words back in the field', () => {
    st().setDoneChip(true);
    const id = send('half a seam');
    expect(st().undoKept()).toBe(true);
    expect(st().data.activities[id]).toBeUndefined();
    expect(st().kept).toBeUndefined();
    expect(st().draft.text).toBe('half a seam');
    expect(st().undoKept()).toBe(false);
  });

  it('is captured at Return: a Return while reconnecting logs settled once the data is back, even if the chip was turned off since', () => {
    st().setDoneChip(true);
    useStore.setState({ storage: { state: 'ready', kind: 'sqlite', reconnecting: true } });
    st().setDraft({ text: 'caught up' });
    expect(st().log(undefined, { trail: true, done: true })).toBeUndefined();
    expect(st().toLog?.opts).toEqual({ trail: true, done: true });
    st().setDoneChip(false);
    useStore.setState({ storage: { state: 'ready', kind: 'sqlite' } });
    st().logMarked();
    const a = Object.values(st().data.activities)[0];
    expect(a.text).toBe('caught up');
    expect(a.lit).toBeUndefined();
    expect(a.settledAt).toEqual(expect.any(String));
  });

  it('is session state only: setDoneChip never touches the data', () => {
    const before = st().data;
    st().setDoneChip(true);
    expect(st().data).toBe(before);
    expect(st().undo).toBeUndefined();
  });
});

describe('Done it', () => {
  it('settles the lit line (lit dropped, settledAt set); Undo lights it again; Undo once more takes the Return back (audit F4)', () => {
    const id = send('sketch hands');
    expect(st().settleKept()).toBe(true);
    expect(st().data.activities[id].lit).toBeUndefined();
    expect(st().data.activities[id].settledAt).toEqual(expect.any(String));
    expect(st().kept?.did).toEqual({ kind: 'settled' });
    expect(st().settleKept()).toBe(false);

    expect(st().undoKept()).toBe(true);
    expect(st().data.activities[id].lit).toBe(true);
    expect(st().data.activities[id].settledAt).toBeUndefined();
    expect(st().kept).toEqual({ activityId: id, text: 'sketch hands' });
    // And again.
    expect(st().settleKept()).toBe(true);
    expect(st().undoKept()).toBe(true);
    expect(st().data.activities[id].lit).toBe(true);
    // Then the Return itself: the line goes, its words back in the field.
    expect(st().undoKept()).toBe(true);
    expect(st().data.activities[id]).toBeUndefined();
    expect(st().kept).toBeUndefined();
    expect(st().draft.text).toBe('sketch hands');
    expect(st().undoKept()).toBe(false);
  });

  it('a line that isn’t lit (the done chip’s) can’t be settled again', () => {
    st().setDoneChip(true);
    send('read');
    expect(st().settleKept()).toBe(false);
  });
});

describe('↳ First step', () => {
  it('makes a wander named with the line, with the step; the line goes toward it as doing, settled; Undo removes exactly that', () => {
    seed();
    const id = send('learn watercolour');
    const threadsBefore = st().data.threads;
    expect(st().firstStepKept('buy a brush')).toBe(true);
    const tid = st().data.activities[id].doingId!;
    expect(st().data.threads[tid]).toMatchObject({ name: 'learn watercolour', next: 'buy a brush' });
    expect(st().data.activities[id].lit).toBeUndefined();
    expect(st().kept?.did).toEqual({ kind: 'step', threadId: tid });

    expect(st().undoKept()).toBe(true);
    expect(st().data.threads).toEqual(threadsBefore);
    expect(st().data.activities[id]).toMatchObject({ doingId: undefined, lit: true });
    expect(st().kept?.did).toBeUndefined();
  });

  it('an existing wander with that name: its staged step is never overwritten', () => {
    const { cook } = seed();
    const id = send('Cook');
    expect(st().firstStepKept('chop onions')).toBe(true);
    expect(st().data.threads[cook].next).toBe('make soup');
    expect(st().data.activities[id].doingId).toBe(cook);
    st().undoKept();
    expect(st().data.threads[cook]).toMatchObject({ name: 'cook', next: 'make soup' });
    expect(st().data.activities[id].doingId).toBeUndefined();
  });

  it('a blank step creates nothing (the line stays lit)', () => {
    const id = send('learn watercolour');
    const before = st().data;
    expect(st().firstStepKept('  ')).toBe(false);
    expect(st().data).toBe(before);
    expect(st().data.activities[id].lit).toBe(true);
  });
});

describe('Toward…', () => {
  it('attaches the line to a visible wander; Undo detaches', () => {
    const { draw } = seed();
    const id = send('sketched');
    expect(st().towardKept(draw)).toBe(true);
    expect(st().data.activities[id].doingId).toBe(draw);
    expect(st().kept?.did).toEqual({ kind: 'toward', threadId: draw });
    expect(st().undoKept()).toBe(true);
    expect(st().data.activities[id]).toMatchObject({ doingId: undefined, toIds: [] });
    expect(st().data.activities[id]).toBeDefined();
  });

  it('refuses a hidden wander', () => {
    const { draw } = seed();
    st().setHidden(draw, true);
    send('sketched');
    expect(st().towardKept(draw)).toBe(false);
  });
});

describe('gated (P-29): a page that doesn’t hold the data can’t settle, first-step or toward', () => {
  it('each is refused and changes nothing', () => {
    const { draw } = seed();
    const id = send('sketched');
    useStore.setState({ storage: { state: 'ready', kind: 'sqlite', reconnecting: true } });
    const before = st().data;
    expect(st().settleKept()).toBe(false);
    expect(st().firstStepKept('go')).toBe(false);
    expect(st().towardKept(draw)).toBe(false);
    expect(st().data).toBe(before);
    expect(st().data.activities[id].lit).toBe(true);
  });
});

describe('a loose line opened from the sky (fix 18)', () => {
  /** A line logged loose earlier (not by this Return). */
  function earlier(text: string) {
    st().setDraft({ text });
    const id = st().log(undefined)!;
    useStore.setState({ toast: undefined });
    return id;
  }

  it('keepLoose makes it the rise’s subject; before a choice there is nothing to undo; Toward… and its Undo', () => {
    const { draw } = seed();
    const id = earlier('sketched on the bus');
    const pending = st().undo;
    expect(st().keepLoose(id)).toBe(true);
    // Reopening is session only: whatever Undo was pending stays as it was.
    expect(st().undo).toBe(pending);
    expect(st().kept).toEqual({ activityId: id, text: 'sketched on the bus', reopened: true });
    expect(st().undoKept()).toBe(false);
    // It was logged settled: no Done it.
    expect(st().settleKept()).toBe(false);

    expect(st().towardKept(draw)).toBe(true);
    expect(st().undoKept()).toBe(true);
    expect(st().data.activities[id]).toMatchObject({ doingId: undefined, toIds: [] });
    expect(st().kept).toEqual({ activityId: id, text: 'sketched on the bus', reopened: true });
    expect(st().undoKept()).toBe(false);
    expect(st().data.activities[id]).toBeDefined();
  });

  it('refuses a line that isn’t there or isn’t loose', () => {
    const { draw } = seed();
    expect(st().keepLoose('nope')).toBe(false);
    const id = earlier('drew');
    useStore.setState({ data: { ...st().data, activities: { ...st().data.activities, [id]: { ...st().data.activities[id], doingId: draw } } } });
    expect(st().keepLoose(id)).toBe(false);
    expect(st().kept).toBeUndefined();
  });

  it('leaveKept(id) only ends that line’s session', () => {
    const id = earlier('a');
    st().keepLoose(id);
    st().leaveKept('someone else');
    expect(st().kept?.activityId).toBe(id);
    st().leaveKept(id);
    expect(st().kept).toBeUndefined();
  });
});
