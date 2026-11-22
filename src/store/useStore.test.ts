import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { emptyData } from '@/domain/types';

import { rememberSearchQuietly, useStore } from './useStore';

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

describe('what it’s for (P-14)', () => {
  it('declaring toasts with Undo; a double tap writes nothing more, and the one Undo still reverts it', () => {
    const t = st().createThread('practice drawing');
    expect(st().declareThread(t).ok).toBe(true);
    expect(st().toast).toEqual({ message: '“practice drawing” is what it’s for' });
    const after = { data: st().data, undo: st().undo, toast: st().toast };
    st().declareThread(t);
    expect({ data: st().data, undo: st().undo, toast: st().toast }).toEqual(after);
    expect(st().data).toBe(after.data);
    st().undoLast();
    expect(st().data.threads[t].declaredAt).toBeUndefined();
  });

  it('undeclaring says "Not what it’s for right now" and Undo restores the mark; undeclaring an unmarked thread is a no-op', () => {
    const t = st().createThread('draw');
    st().declareThread(t);
    const mark = st().data.threads[t].declaredAt;
    st().undeclareThread(t);
    expect(st().toast).toEqual({ message: 'Not what it’s for right now' });
    expect(st().data.threads[t].declaredAt).toBeUndefined();
    st().undoLast();
    expect(st().data.threads[t].declaredAt).toBe(mark);

    st().undeclareThread(t);
    st().dismissToast();
    const before = { data: st().data, undo: st().undo };
    st().undeclareThread(t);
    expect(st().data).toBe(before.data);
    expect(st().undo).toBe(before.undo);
    expect(st().toast).toBeUndefined();
  });

  it('a 4th is refused (nothing written, no toast) with the 3 listed; a swap toasts both and one Undo restores both', () => {
    const [a, b, c, d] = ['a', 'b', 'c', 'd'].map((n) => st().createThread(n));
    for (const id of [a, b, c]) st().declareThread(id);
    st().dismissToast();
    const before = { data: st().data, undo: st().undo };
    const res = st().declareThread(d);
    expect(res).toMatchObject({ ok: false, reason: 'full' });
    if (res.ok || res.reason !== 'full') throw new Error('expected full');
    // Declared in the same millisecond here, so compare as a set (domain tests cover the order).
    expect(res.declared.map((t) => t.name).sort()).toEqual(['a', 'b', 'c']);
    expect(st().data).toBe(before.data);
    expect(st().undo).toBe(before.undo);
    expect(st().toast).toBeUndefined();

    st().swapWhy(b, d);
    expect(st().toast).toEqual({ message: '“d” is what it’s for · “b” isn’t right now' });
    expect(st().data.threads[b].declaredAt).toBeUndefined();
    expect(st().data.threads[d].declaredAt).toBeDefined();
    st().undoLast();
    expect(st().data).toEqual(before.data);
  });

  it('hiding a declared thread says so and unmarks it; one Undo restores both. Hiding another says "Hid"', () => {
    const t = st().createThread('draw');
    const other = st().createThread('run');
    st().declareThread(t);
    const declared = st().data.threads[t];
    st().setHidden(t, true);
    expect(st().toast).toEqual({ message: 'Hidden · not what it’s for right now' });
    expect(st().data.threads[t]).toMatchObject({ hidden: true });
    expect(st().data.threads[t].declaredAt).toBeUndefined();
    st().undoLast();
    expect(st().data.threads[t]).toEqual(declared);

    st().setHidden(other, true);
    expect(st().toast).toEqual({ message: 'Hid “run”' });
  });

  it('a hidden thread can’t be declared', () => {
    const t = st().createThread('draw');
    st().setHidden(t, true);
    st().dismissToast();
    expect(st().declareThread(t)).toEqual({ ok: false, reason: 'hidden' });
    expect(st().data.threads[t].declaredAt).toBeUndefined();
    expect(st().toast).toBeUndefined();
  });
});

describe('while the page doesn’t hold the data (audit 2 F3, F4)', () => {
  const NOTICE = 'Just a moment — reconnecting.';
  const back = () => useStore.setState({ storage: { state: 'ready', kind: 'sqlite' } });
  /** Taking the data back with nothing changed underneath (as persistence does). */
  const takeBack = () => {
    back();
    expect(st().refreshData(st().data, { showShading: st().showShading, recentSearches: st().recentSearches, leftAsIs: st().leftAsIs }, true)).toBe(true);
  };
  const reconnect = () => useStore.setState({ storage: { state: 'ready', kind: 'sqlite', reconnecting: true } });
  afterEach(() => useStore.setState({ storage: { state: 'loading' }, recentSearches: [] }));

  it('remembering a search is quietly skipped: no toast, nothing changes; holding the data, it’s remembered (F3)', () => {
    useStore.setState({ recentSearches: ['old'] });
    reconnect();
    expect(rememberSearchQuietly('plants')).toBe(false);
    expect(st().recentSearches).toEqual(['old']);
    expect(st().toast).toBeUndefined();
    useStore.setState({ storage: { state: 'ready', kind: 'sqlite' } });
    expect(rememberSearchQuietly('plants')).toBe(true);
    expect(st().recentSearches).toEqual(['plants', 'old']);
  });

  it('a refusal keeps a toast with Undo, saying why on its second line; after taking the data back, its Undo still works (F4)', () => {
    const id = logText('watered the plants');
    expect(st().toast).toEqual({ message: 'Logged', activityId: id });
    reconnect();
    expect(st().setNext('none', 'x')).toBe(false);
    expect(st().toast).toEqual({ message: 'Logged', activityId: id, detail: NOTICE });
    expect(st().undo).toBeDefined();
    takeBack();
    expect(st().toast).toEqual({ message: 'Logged', activityId: id });
    expect(st().undoLast()).toBe(true);
    expect(st().data.activities[id]).toBeUndefined();
  });

  it('tapping Undo itself while reconnecting: the toast and its Undo stay, with the reconnecting line (F4)', () => {
    const id = logText('read a novel');
    reconnect();
    expect(st().undoLast()).toBe(false);
    expect(st().data.activities[id]).toBeDefined();
    expect(st().toast).toEqual({ message: 'Logged', activityId: id, detail: NOTICE });
    expect(st().undo).toBeDefined();
  });

  it('with no toast with Undo up, the notice shows on its own (F4)', () => {
    reconnect();
    expect(st().setNext('none', 'x')).toBe(false);
    expect(st().toast).toEqual({ message: NOTICE, notice: true });
  });
});
