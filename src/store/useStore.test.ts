import { beforeEach, describe, expect, it } from 'vitest';

import { emptyData } from '@/domain/types';

import { useStore } from './useStore';

const QUESTION = 'Toward something — or just itself?';

const st = () => useStore.getState();
function logText(text: string, opts?: { bridge?: boolean }) {
  st().setDraft({ text });
  return st().log(undefined, opts)!;
}

beforeEach(() => {
  useStore.setState({ data: emptyData(), undo: undefined, toast: undefined, bridgeFor: undefined, pullInOffer: undefined, draft: { text: '', toIds: [] } });
});

describe('the bridge after a log', () => {
  it('a log from Home with no thread sets the bridge and asks the question under "Logged"', () => {
    const id = logText('read a novel', { bridge: true });
    expect(st().bridgeFor).toBe(id);
    expect(st().toast).toEqual({ message: 'Logged', detail: QUESTION, activityId: id });
  });

  it('a log without the flag sets no bridge and asks nothing', () => {
    const id = logText('read a novel');
    expect(st().bridgeFor).toBeUndefined();
    expect(st().toast).toEqual({ message: 'Logged', activityId: id });
  });

  it('a log with a thread sets no bridge, even from Home', () => {
    const thread = st().createThread('play guitar');
    st().setDraft({ text: 'scales', toIds: [thread] });
    st().log(undefined, { bridge: true });
    expect(st().bridgeFor).toBeUndefined();
    expect(st().toast?.detail).toBeUndefined();
    st().log({ text: 'more scales', doingId: thread }, { bridge: true });
    expect(st().bridgeFor).toBeUndefined();
  });

  it('the next log moves it to the newest activity, or clears it', () => {
    logText('first', { bridge: true });
    const second = logText('second', { bridge: true });
    expect(st().bridgeFor).toBe(second);
    logText('from another screen');
    expect(st().bridgeFor).toBeUndefined();
    expect(st().toast?.detail).toBeUndefined();
  });

  it('attaching clears it; dismissing clears it and writes nothing', () => {
    const thread = st().createThread('reading');
    const id = logText('a chapter', { bridge: true });
    st().attach(id, thread);
    expect(st().bridgeFor).toBeUndefined();

    const other = logText('read a novel', { bridge: true });
    const before = st().data;
    st().dismissBridge();
    expect(st().bridgeFor).toBeUndefined();
    expect(st().data).toBe(before);
    expect(st().data.activities[other].toIds).toEqual([]);
  });

  it('naming a thread attaches in one step, and one Undo removes both the attach and the new thread', () => {
    const id = logText('read a novel', { bridge: true });
    const thread = st().attachToNew(id, 'reading');
    expect(thread).toBeDefined();
    expect(st().data.activities[id].toIds).toEqual([thread]);
    expect(st().toast).toEqual({ message: 'Attached → to reading', activityId: id });
    expect(st().bridgeFor).toBeUndefined();

    st().undoLast();
    expect(st().data.threads).toEqual({});
    expect(st().data.activities[id].toIds).toEqual([]);
    expect(st().data.activities[id].text).toBe('read a novel');
    // One moment: Undo doesn't bring the bridge back.
    expect(st().bridgeFor).toBeUndefined();
  });

  it('naming a hidden thread attaches to it and brings it back; Undo hides it again', () => {
    const thread = st().createThread('reading');
    st().setHidden(thread, true);
    const id = logText('a chapter', { bridge: true });
    expect(st().attachToNew(id, ' Reading ')).toBe(thread);
    expect(Object.keys(st().data.threads)).toEqual([thread]);
    expect(st().data.threads[thread].hidden).toBe(false);
    expect(st().toast?.message).toBe('Attached → to reading');
    st().undoLast();
    expect(st().data.threads[thread].hidden).toBe(true);
    expect(st().data.activities[id].toIds).toEqual([]);
  });

  it('naming with only spaces does nothing', () => {
    const id = logText('read a novel', { bridge: true });
    const before = st().data;
    expect(st().attachToNew(id, '   ')).toBeUndefined();
    expect(st().data).toBe(before);
    expect(st().bridgeFor).toBe(id);
  });

  it('a new name offers the quiet pull-in, like the @ menu', () => {
    logText('read a novel');
    const id = logText('more reading', { bridge: true });
    const thread = st().attachToNew(id, 'reading');
    expect(st().pullInOffer).toBe(thread);
  });

  it('replacing the data (import, restore) clears it', () => {
    logText('read a novel', { bridge: true });
    st().replaceData(emptyData());
    expect(st().bridgeFor).toBeUndefined();
  });
});

describe('the bridge (audit of P-13/P-24)', () => {
  it('"Just itself" also takes the question off the toast (F4)', () => {
    logText('read a novel', { bridge: true });
    expect(st().toast?.detail).toBe(QUESTION);
    st().dismissBridge();
    expect(st().toast?.message).toBe('Logged');
    expect(st().toast?.detail).toBeUndefined();
  });

  it('naming twice (a repeated submit) keeps the real Undo, which still removes the new thread (F8)', () => {
    const id = logText('read a novel', { bridge: true });
    st().attachToNew(id, 'reading');
    st().attachToNew(id, 'reading');
    st().undoLast();
    expect(st().data.threads).toEqual({});
    expect(st().data.activities[id].toIds).toEqual([]);
  });
});
