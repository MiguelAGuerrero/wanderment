import { beforeEach, describe, expect, it } from 'vitest';

import { emptyData } from '@/domain/types';

import { useStore } from './useStore';

const st = () => useStore.getState();

beforeEach(() => {
  useStore.setState({ data: emptyData(), undo: undefined, toast: undefined, bridgeFor: undefined, selected: undefined, draft: { text: '', toIds: [] } });
});

describe('acting from a node (P-35)', () => {
  it('typing after a selection logs toward it, as typed; the toast says where; the selection lasts one log', () => {
    const draw = st().createThread('draw');
    st().select(draw);
    st().setDraft({ text: 'sketched a hand ' });
    const id = st().log()!;
    expect(st().data.activities[id]).toMatchObject({ text: 'sketched a hand', toIds: [draw] });
    expect(st().toast?.message).toBe('Logged → draw'); // P-61 (was “Logged → to draw”)
    expect(st().selected).toBeUndefined();
    // The next line goes nowhere unless chosen.
    st().setDraft({ text: 'cooked dinner' });
    const next = st().log()!;
    expect(st().data.activities[next].toIds).toEqual([]);
  });

  it('clearing keeps the typed line, without the chip; removing the chip leaves the line going nowhere', () => {
    const draw = st().createThread('draw');
    st().setDraft({ text: 'half a page' });
    st().select(draw);
    expect(st().draft.toIds).toEqual([draw]);
    st().select(undefined);
    expect(st().draft).toEqual({ text: 'half a page', toIds: [] });
    expect(st().selected).toBeUndefined();
  });

  it('"Log next step" (loadNext) on the selection makes it the doing wander with its step, and logging clears the step', () => {
    const draw = st().createThread('draw');
    st().setNext(draw, 'sketch a hand');
    st().select(draw);
    st().loadNext(draw);
    expect(st().draft).toEqual({ text: 'sketch a hand', toIds: [], doingId: draw, fromNextOf: draw, fromNextText: 'sketch a hand' });
    st().log({ doingId: draw });
    expect(st().data.threads[draw].next).toBeUndefined();
    expect(st().toast?.message).toBe('Logged → draw'); // P-61 (was “Logged in draw”)
    expect(st().selected).toBeUndefined();
  });

  it('a list selection asks for focus; a tap doesn’t; an unknown wander selects nothing', () => {
    const draw = st().createThread('draw');
    const before = st().selectFocus;
    st().select(draw);
    expect(st().selectFocus).toBe(before);
    st().select(undefined);
    st().select(draw, { focus: true });
    expect(st().selectFocus).toBe(before + 1);
    st().select(undefined);
    st().select('nope');
    expect(st().selected).toBeUndefined();
  });

  it('replacing the data clears the selection', () => {
    const draw = st().createThread('draw');
    st().select(draw);
    st().replaceData(emptyData());
    expect(st().selected).toBeUndefined();
  });
});
