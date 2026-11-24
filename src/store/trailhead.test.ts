/** P-65: the trailhead's Return (kept loose, no toast) and "Move it?" — each move one tap, each with Undo. */
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

/** Types a line on the trailhead and presses Return. */
function keep(text: string) {
  st().setDraft({ text });
  return st().log(undefined, { trail: true })!;
}

beforeEach(() => {
  useStore.setState({
    data: emptyData(),
    undo: undefined,
    toast: undefined,
    kept: undefined,
    draft: { text: '', toIds: [] },
    storage: { state: 'ready', kind: 'sqlite' },
  });
});

describe('Return on the trailhead', () => {
  it('logs exactly as typed, loose, with no toast; the words are kept for the billboard', () => {
    seed();
    const id = keep('want to sketch hands');
    expect(st().data.activities[id]).toMatchObject({ text: 'want to sketch hands', doingId: undefined, toIds: [] });
    expect(st().toast).toBeUndefined();
    expect(st().kept).toEqual({ activityId: id, text: 'want to sketch hands' });
    expect(st().draft.text).toBe('');
  });

  it('Undo takes the line back out and puts the words back in the field', () => {
    const id = keep('half a seam');
    expect(st().undoKept()).toBe(true);
    expect(st().data.activities[id]).toBeUndefined();
    expect(st().kept).toBeUndefined();
    expect(st().draft.text).toBe('half a seam');
  });
});

describe('Move it?', () => {
  it('toward: one tap makes it a log toward the wander; Undo makes it loose again, and Undo once more takes it out', () => {
    const { draw } = seed();
    const id = keep('sketched');
    expect(st().moveKept({ kind: 'toward', threadId: draw })).toBe(true);
    expect(st().data.activities[id].doingId).toBe(draw);
    expect(st().kept?.moved).toEqual({ kind: 'toward', threadId: draw });

    expect(st().undoKept()).toBe(true);
    expect(st().data.activities[id]).toMatchObject({ doingId: undefined, toIds: [] });
    expect(st().kept).toEqual({ activityId: id, text: 'sketched' });

    expect(st().undoKept()).toBe(true);
    expect(st().data.activities[id]).toBeUndefined();
  });

  it('next: the words become the step and the loose line goes; Undo puts the line back and the step away', () => {
    const { draw } = seed();
    const id = keep('sketch a hand');
    expect(st().moveKept({ kind: 'next', threadId: draw })).toBe(true);
    expect(st().data.threads[draw].next).toBe('sketch a hand');
    expect(st().data.activities[id]).toBeUndefined();
    expect(st().kept?.moved).toEqual({ kind: 'next', threadId: draw });

    st().undoKept();
    expect(st().data.threads[draw].next).toBeUndefined();
    expect(st().data.activities[id]).toMatchObject({ text: 'sketch a hand', toIds: [] });
    expect(st().kept?.moved).toBeUndefined();
  });

  it('next never overwrites a staged step: refused, nothing changes', () => {
    const { cook } = seed();
    const id = keep('cooked');
    const before = st().data;
    expect(st().moveKept({ kind: 'next', threadId: cook })).toBe(false);
    expect(st().data).toBe(before);
    expect(st().data.threads[cook].next).toBe('make soup');
    expect(st().data.activities[id]).toBeDefined();
  });

  it('somewhere else, a new wander: named and logged toward in one change; Undo reverts both', () => {
    const id = keep('went for a swim');
    expect(st().moveKept({ kind: 'new', name: 'get fit' })).toBe(true);
    const fit = st().data.activities[id].doingId!;
    expect(st().data.threads[fit].name).toBe('get fit');
    st().undoKept();
    expect(st().data.threads[fit]).toBeUndefined();
    expect(st().data.activities[id].doingId).toBeUndefined();
  });

  it('is refused while the page doesn’t hold the data (P-29)', () => {
    const { draw } = seed();
    const id = keep('sketched');
    useStore.setState({ storage: { state: 'ready', kind: 'sqlite', reconnecting: true } });
    expect(st().moveKept({ kind: 'toward', threadId: draw })).toBe(false);
    expect(st().data.activities[id].doingId).toBeUndefined();
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

  it('keepLoose puts it on the billboard with the same moves; before a move there is nothing to undo', () => {
    const { draw } = seed();
    const id = earlier('sketched on the bus');
    expect(st().keepLoose(id)).toBe(true);
    expect(st().kept).toEqual({ activityId: id, text: 'sketched on the bus', reopened: true });
    expect(st().undoKept()).toBe(false);
    expect(st().data.activities[id]).toBeDefined();

    // A move, and its Undo: loose again — and a second Undo never takes the earlier line out.
    expect(st().moveKept({ kind: 'toward', threadId: draw })).toBe(true);
    expect(st().data.activities[id].doingId).toBe(draw);
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
});
