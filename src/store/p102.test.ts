/**
 * P-102 (owner, 2026-11-27: "You should not undo a 'Done' … the button should be an x to dismiss"): finishing
 * a run is final — "Done with <name>" and nothing to take back; every notice has a × that puts it away (as a
 * tap elsewhere would) and changes no data; Step out keeps its Undo, and × leaves that Undo in the panel.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { readRun } from '@/domain/run';
import { Data, emptyData, Id } from '@/domain/types';

import { useStore } from './useStore';

const st = () => useStore.getState();
const at = '2026-11-01T00:00:00.000Z';
const seeded = (): Data => ({
  ...emptyData(),
  routines: {
    M: { id: 'M', words: 'MyStack', named: true, createdAt: at, home: true, items: [{ id: 'vc', ref: 'V' }, { id: 'pick', text: 'Pick a task' }] },
    V: { id: 'V', words: 'Vibe check', named: true, createdAt: at, items: [{ id: 'feel', text: 'Feel' }, { id: 'name', text: 'Name it' }] },
  },
});
const started = (routineId: Id) => {
  const r = st().startRoutine(routineId);
  if (!r.ok || !r.runId) throw new Error('not started');
  return r.runId;
};

beforeEach(() => {
  useStore.setState({ data: seeded(), undo: undefined, toast: undefined, runNotice: undefined, toVerb: undefined, storage: { state: 'ready', kind: 'sqlite' } });
});

describe('P-102: finishing is final; × dismisses', () => {
  it('the Next that ends the run: "Done with <name>", carried home, with no Undo anywhere (notice, panel, Ctrl/⌘+Z)', () => {
    const id = started('M');
    st().nextStep(id);
    expect(st().nextStep(id)).toMatchObject({ ok: true, home: true });
    expect(readRun(st().data, id)!.endedAt).toBeDefined();
    expect(st().runNotice).toMatchObject({ text: 'Done with MyStack', follows: true });
    expect(st().runNotice!.entry).toBeUndefined();
    expect(st().undo).toBeUndefined();
    const ended = st().data;
    st().undoLast();
    expect(st().data).toBe(ended);
  });

  it('Done at the top (the run’s own) is final too', () => {
    const id = started('M');
    st().nextStep(id);
    expect(st().doneLevel(id)).toMatchObject({ ok: true, home: true });
    expect(st().runNotice).toMatchObject({ verb: 'done', text: 'Done with MyStack' });
    expect(st().undo).toBeUndefined();
  });

  it('× puts the Done notice away and changes no data', () => {
    const id = started('M');
    st().nextStep(id);
    st().nextStep(id);
    const ended = st().data;
    st().hideNotice();
    expect(st().runNotice).toMatchObject({ hidden: true });
    expect(st().data).toBe(ended);
  });

  it('Step out keeps its Undo; × puts its notice away and the Undo stays (the panel, Ctrl/⌘+Z)', () => {
    const id = started('M');
    st().stepIn(id);
    const inside = st().data;
    st().doneLevel(id);
    const entry = st().undo;
    expect(entry).toBeDefined();
    expect(st().runNotice!.entry).toBe(entry);
    st().hideNotice();
    expect(st().runNotice).toMatchObject({ hidden: true, entry });
    expect(st().undo).toBe(entry);
    st().undoLast();
    expect(readRun(st().data, id)!.frames).toEqual(readRun(inside, id)!.frames);
  });

  it('× takes the quiet line ("reconnecting") away too', () => {
    useStore.setState({ toast: { message: 'Reconnecting…', notice: true } as never });
    st().hideNotice();
    expect(st().toast).toBeUndefined();
  });
});
