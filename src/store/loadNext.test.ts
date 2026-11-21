import { beforeEach, describe, expect, it } from 'vitest';

import { emptyData, Id } from '@/domain/types';

import { useStore } from './useStore';

const st = () => useStore.getState();

/** Three threads; Y ("play guitar") has the next step "learn the F chord". */
function seed() {
  const y = st().createThread('play guitar');
  const x = st().createThread('practice drawing');
  const z = st().createThread('make apparel');
  st().setNext(y, 'learn the F chord');
  return { x, y, z };
}

const nextOf = (id: Id) => st().data.threads[id].next;

beforeEach(() => {
  useStore.setState({ data: emptyData(), undo: undefined, toast: undefined, bridgeFor: undefined, promptNextFor: undefined, draft: { text: '', toIds: [] } });
});

describe('"Log this" with text in the box keeps it (D-6)', () => {
  it('keeps the text and other "to" chips, makes Y the doing thread, stages its step and drops a "to" Y', () => {
    const { x, y, z } = seed();
    st().setDraft({ text: 'half a page of sketches', doingId: x, toIds: [z, y] });
    st().loadNext(y);
    expect(st().draft).toEqual({
      text: 'half a page of sketches',
      doingId: y,
      toIds: [z],
      fromNextOf: y,
      fromNextText: 'learn the F chord',
    });
  });

  it('tapping it twice is the same as once', () => {
    const { y, z } = seed();
    st().setDraft({ text: 'half a page of sketches', toIds: [z] });
    st().loadNext(y);
    const once = st().draft;
    st().loadNext(y);
    expect(st().draft).toEqual(once);
  });

  it('a second thread’s crumb moves doing and the step there; the text stays', () => {
    const { x, y } = seed();
    st().setNext(x, 'ink a page');
    st().setDraft({ text: 'half a page of sketches' });
    st().loadNext(y);
    st().loadNext(x);
    expect(st().draft).toMatchObject({ text: 'half a page of sketches', doingId: x, fromNextOf: x, fromNextText: 'ink a page' });
  });

  it('an @mention being typed is left untouched', () => {
    const { y } = seed();
    st().setDraft({ text: 'tuned up @pla' });
    st().loadNext(y);
    expect(st().draft.text).toBe('tuned up @pla');
  });

  it.each(['', '   '])('an empty or whitespace box (%j) loads the step as today', (text) => {
    const { x, y, z } = seed();
    st().setDraft({ text, doingId: x, toIds: [z] });
    st().loadNext(y);
    expect(st().draft).toEqual({ text: 'learn the F chord', doingId: y, toIds: [], fromNextOf: y, fromNextText: 'learn the F chord' });
  });

  it('logging logs the line as typed in Y and clears the step (unchanged since it was loaded)', () => {
    const { y } = seed();
    st().setDraft({ text: 'half a page of sketches' });
    st().loadNext(y);
    const id = st().log()!;
    expect(st().data.activities[id]).toMatchObject({ text: 'half a page of sketches', doingId: y, toIds: [] });
    expect(nextOf(y)).toBeUndefined();
    expect(st().toast).toEqual({ message: 'Logged in play guitar', activityId: id });
  });

  it('logging does not clear a step that was edited after it was loaded', () => {
    const { y } = seed();
    st().setDraft({ text: 'half a page of sketches' });
    st().loadNext(y);
    st().setNext(y, 'a different step');
    st().log();
    expect(nextOf(y)).toBe('a different step');
  });

  it('the empty-box path is guarded the same way', () => {
    const { y } = seed();
    st().loadNext(y);
    st().setNext(y, 'a different step');
    st().log();
    expect(nextOf(y)).toBe('a different step');
  });

  it('a step cleared before logging stays cleared, and the line still logs in Y', () => {
    const { y } = seed();
    st().setDraft({ text: 'half a page of sketches' });
    st().loadNext(y);
    st().setNext(y, '');
    const id = st().log()!;
    expect(nextOf(y)).toBeUndefined();
    expect(st().data.activities[id]).toMatchObject({ text: 'half a page of sketches', doingId: y });
  });

  it('removing the step chip, then logging: the line logs as typed in Y and the step is untouched', () => {
    const { y } = seed();
    st().setDraft({ text: 'half a page of sketches' });
    st().loadNext(y);
    st().setDraft({ fromNextOf: undefined, fromNextText: undefined });
    const id = st().log()!;
    expect(st().data.activities[id]).toMatchObject({ text: 'half a page of sketches', doingId: y });
    expect(nextOf(y)).toBe('learn the F chord');
  });

  it('a hidden thread: logs as typed, brings the thread back and clears its step', () => {
    const { y } = seed();
    st().setDraft({ text: 'half a page of sketches' });
    st().loadNext(y);
    st().setHidden(y, true);
    const id = st().log()!;
    expect(st().data.activities[id]).toMatchObject({ text: 'half a page of sketches', doingId: y });
    expect(st().data.threads[y]).toMatchObject({ hidden: false, next: undefined });
  });

  it('a thread that no longer exists: logs as typed with no thread and no crash', () => {
    const { y } = seed();
    st().setDraft({ text: 'half a page of sketches' });
    st().loadNext(y);
    const { [y]: _gone, ...threads } = st().data.threads;
    useStore.setState({ data: { ...st().data, threads } });
    const id = st().log()!;
    expect(st().data.activities[id]).toMatchObject({ text: 'half a page of sketches', doingId: undefined, toIds: [] });
  });

  it('Undo of the log removes the activity and restores the step', () => {
    const { y } = seed();
    st().setDraft({ text: 'half a page of sketches' });
    st().loadNext(y);
    const id = st().log()!;
    st().undoLast();
    expect(st().data.activities[id]).toBeUndefined();
    expect(nextOf(y)).toBe('learn the F chord');
  });
});

describe('a second crumb after an untouched first one (audit F1)', () => {
  it('replaces the first step in the box, so the line is the second step and only that one is used', () => {
    const { x, y } = seed();
    st().setNext(x, 'sketch a hand');
    st().loadNext(y); // empty box: "learn the F chord"
    st().loadNext(x); // the box only holds y's untouched step
    expect(st().draft).toEqual({ text: 'sketch a hand', doingId: x, toIds: [], fromNextOf: x, fromNextText: 'sketch a hand' });
    st().log();
    expect(nextOf(x)).toBeUndefined();
    expect(nextOf(y)).toBe('learn the F chord');
    const logged = Object.values(st().data.activities);
    expect(logged.map((a) => [a.text, a.doingId])).toEqual([['sketch a hand', x]]);
  });

  it('once the person edits the loaded step, it is their line and is kept', () => {
    const { x, y } = seed();
    st().setNext(x, 'sketch a hand');
    st().loadNext(y);
    st().setDraft({ text: 'learn the F chord slowly' });
    st().loadNext(x);
    expect(st().draft.text).toBe('learn the F chord slowly');
    expect(st().draft.fromNextOf).toBe(x);
  });
});
