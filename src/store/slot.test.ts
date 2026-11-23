import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { emptyData } from '@/domain/types';

import { useStore } from './useStore';

const st = () => useStore.getState();

beforeEach(() => {
  useStore.setState({
    data: emptyData(),
    undo: undefined,
    toast: undefined,
    bridgeFor: undefined,
    selected: undefined,
    toLog: undefined,
    homeFace: 'log',
    draft: { text: '', toIds: [] },
  });
});
afterEach(() => useStore.setState({ storage: { state: 'loading' } }));

describe('Home’s slot (P-49)', () => {
  it('✓ on the card logs the step as typed, with its wander as doing, clears the step, and keeps a typed line', () => {
    const draw = st().createThread('draw');
    st().setNext(draw, 'sketch a hand');
    st().select(draw);
    st().setDraft({ text: 'half a thought' });
    const id = st().log({ text: 'sketch a hand', doingId: draw, toIds: [], fromNextOf: draw, fromNextText: 'sketch a hand' }, { keepLine: true })!;
    expect(st().data.activities[id]).toMatchObject({ text: 'sketch a hand', doingId: draw, toIds: [] });
    expect(st().data.threads[draw].next).toBeUndefined();
    expect(st().toast).toMatchObject({ message: 'Logged → draw', activityId: id }); // P-61 (was “Logged in draw”)
    // Typed text is never dropped; the selection lasted one log, and its "to" chip went with it.
    expect(st().draft).toEqual({ text: 'half a thought', toIds: [] });
    expect(st().selected).toBeUndefined();
    // Undo puts the step back.
    st().undoLast();
    expect(st().data.threads[draw].next).toBe('sketch a hand');
  });

  it('a log flips the slot back to What’s next once a wander exists; with none it stays on Log', () => {
    st().setDraft({ text: 'read a novel' });
    st().log();
    expect(st().homeFace).toBe('log');
    st().createThread('draw');
    st().setDraft({ text: 'sketched' });
    st().log();
    expect(st().homeFace).toBe('next');
  });

  it('handing focus to the log box (a tap on the toggle, a crumb, typing) shows the Log face', () => {
    const draw = st().createThread('draw');
    st().showHomeFace('next');
    const before = st().logBoxFocus;
    st().focusLogBox();
    expect(st().homeFace).toBe('log');
    expect(st().logBoxFocus).toBe(before + 1);
    st().showHomeFace('next');
    st().setNext(draw, 'sketch a hand');
    st().loadNext(draw);
    expect(st().homeFace).toBe('log');
    // Showing a face by itself never asks for focus.
    st().showHomeFace('next');
    expect(st().logBoxFocus).toBe(before + 2);
  });

  it('✓ while reconnecting is refused out loud and isn’t queued like a Return in the box', () => {
    const draw = st().createThread('draw');
    st().setNext(draw, 'sketch a hand');
    useStore.setState({ storage: { state: 'ready', kind: 'sqlite', reconnecting: true } });
    const id = st().log({ text: 'sketch a hand', doingId: draw, toIds: [], fromNextOf: draw, fromNextText: 'sketch a hand' }, { keepLine: true });
    expect(id).toBeUndefined();
    expect(st().toLog).toBeUndefined();
    expect(st().toast).toMatchObject({ message: 'Just a moment — reconnecting.', notice: true });
    expect(st().data.threads[draw].next).toBe('sketch a hand');
  });
});
