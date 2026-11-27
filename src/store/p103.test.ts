/**
 * P-103 (conventions audit, 2026-11-27): a paused run can be ended from its tile (the existing end verb —
 * Done — for the whole run, wherever it stands; final like every finish); removing a step shows its notice
 * with Undo (Plan's other edits stay quiet); removing a nested routine's row never strands that routine:
 * the last row using a named routine that has no tile gives it one (its existing `home` flag), in the same write.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { readRun } from '@/domain/run';
import { homeShown } from '@/domain/runView';
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

describe('P-103 (6): End this run', () => {
  it('ends a paused run where it stands — inside a call included — final, its place kept, nothing else touched', () => {
    const id = started('M');
    st().stepIn(id);
    st().pauseRun(id);
    const before = readRun(st().data, id)!;
    expect(before.frames).toHaveLength(2);
    expect(st().endRun(id)).toMatchObject({ ok: true });
    const after = readRun(st().data, id)!;
    expect(after.endedAt).toBeDefined();
    // Its place is kept as it was (the level it was in too): nothing about where it stood is lost.
    expect(after.frames).toEqual(before.frames);
    // Final, as every finish (the owner: "You should not undo a 'Done'"): a notice, × only.
    expect(st().runNotice).toMatchObject({ text: 'Done with MyStack' });
    expect(st().runNotice!.entry).toBeUndefined();
    expect(st().undo).toBeUndefined();
    // The routine stays, and can be started again.
    expect(homeShown(st().data).map((t) => [t.name, t.state])).toEqual([['MyStack', 'idle']]);
  });

  it('never stops another run that is running', () => {
    const paused = started('M');
    st().pauseRun(paused);
    const other = started('V');
    expect(st().endRun(paused)).toMatchObject({ ok: true });
    expect(readRun(st().data, other)!.endedAt).toBeUndefined();
    expect(st().data.runs[other].status).toBe('running');
  });

  it('refused while the page does not hold the data: nothing changes', () => {
    const id = started('M');
    st().pauseRun(id);
    const was = st().data;
    useStore.setState({ storage: { state: 'blocked', message: 'x', waiting: true } as never });
    expect(st().endRun(id)).toMatchObject({ ok: false, reason: 'reconnecting' });
    expect(st().data).toBe(was);
  });
});

describe('P-103 (5): removing a step says so, with Undo', () => {
  it('Remove leaves a shown notice ("Removed “<step>”") with its Undo; other Plan edits stay quiet', () => {
    st().editRoutine('V', { kind: 'reword', item: 'feel', text: 'Feel it' });
    expect(st().runNotice).toMatchObject({ quiet: true });
    st().editRoutine('V', { kind: 'remove', item: 'name' });
    expect(st().runNotice).toMatchObject({ text: 'Removed “Name it”' });
    expect(st().runNotice!.quiet).toBeUndefined();
    expect(st().runNotice!.entry).toBe(st().undo);
    st().undoLast();
    expect((st().data.routines.V.items as { id: string }[]).map((i) => i.id)).toEqual(['feel', 'name']);
  });
});

describe('P-103 (7): a routine nothing uses is never stranded', () => {
  it('removing the last row that used a routine gives that routine its tile on home, in the same write; one Undo takes both back', () => {
    expect(homeShown(st().data).map((t) => t.name)).toEqual(['MyStack']);
    st().editRoutine('M', { kind: 'remove', item: 'vc' });
    expect(homeShown(st().data).map((t) => t.name)).toEqual(['MyStack', 'Vibe check']);
    expect(st().data.routines.V).toEqual({ ...seeded().routines.V, home: true });
    st().undoLast();
    expect(st().data.routines.V).toEqual(seeded().routines.V);
    expect(homeShown(st().data).map((t) => t.name)).toEqual(['MyStack']);
  });

  it('a routine another routine still uses stays as it is; a step broken down goes with its row', () => {
    useStore.setState({
      data: {
        ...seeded(),
        routines: {
          ...seeded().routines,
          N: { id: 'N', words: 'Night', named: true, createdAt: at, home: true, items: [{ id: 'vc2', ref: 'V' }, { id: 'bd', ref: 'B' }] },
          B: { id: 'B', words: 'Small steps', named: false, createdAt: at, items: [{ id: 'b1', text: 'one' }] },
        },
      },
    });
    st().editRoutine('M', { kind: 'remove', item: 'vc' });
    expect(st().data.routines.V.home).toBeUndefined();
    st().editRoutine('N', { kind: 'remove', item: 'bd' });
    expect(st().data.routines.B.home).toBeUndefined();
    expect(homeShown(st().data).map((t) => t.name)).toEqual(['MyStack', 'Night']);
  });
});

describe('P-103 (coordinator, after build): removing a whole routine strands nothing', () => {
  it('a named routine only it used — directly or inside a step broken down — gets its tile, in the same write; one Undo restores both', () => {
    const base: Data = {
      ...seeded(),
      routines: {
        ...seeded().routines,
        M: { ...seeded().routines.M, items: [{ id: 'vc', ref: 'V' }, { id: 'bd', ref: 'B' }] },
        B: { id: 'B', words: 'Small steps', named: false, createdAt: at, items: [{ id: 'b1', ref: 'W' }] },
        W: { id: 'W', words: 'Warm up', named: true, createdAt: at, items: [{ id: 'w1', text: 'Stretch' }] },
      },
    };
    useStore.setState({ data: base });
    expect(st().editRoutine('M', { kind: 'removeRoutine' })).toMatchObject({ ok: true });
    expect(st().data.routines.M.removedAt).toBeDefined();
    expect(st().data.routines.V.home).toBe(true);
    expect(st().data.routines.W.home).toBe(true);
    expect(st().data.routines.B.home).toBeUndefined();
    expect(homeShown(st().data).map((t) => t.name).sort()).toEqual(['Vibe check', 'Warm up']);
    st().undoLast();
    expect(st().data.routines).toEqual(base.routines);
  });

  it('a routine another routine still uses is left as it is', () => {
    useStore.setState({ data: { ...seeded(), routines: { ...seeded().routines, N: { id: 'N', words: 'Night', named: true, createdAt: at, home: true, items: [{ id: 'v2', ref: 'V' }] } } } });
    st().editRoutine('M', { kind: 'removeRoutine' });
    expect(st().data.routines.V.home).toBeUndefined();
    expect(homeShown(st().data).map((t) => t.name)).toEqual(['Night']);
  });
});

describe('P-103 audit F5/F6: End this run is for a paused run only, and keeps the pause note', () => {
  it('refused for the run that is running, and for one resting on a wait; nothing changes', () => {
    const id = started('M');
    const was = st().data;
    expect(st().endRun(id)).toMatchObject({ ok: false });
    expect(st().data).toBe(was);
    useStore.setState({ data: { ...seeded(), routines: { ...seeded().routines, A: { id: 'A', words: 'Apply', named: true, createdAt: at, home: true, items: [{ id: 'w', wait: 'a reply' }, { id: 'n', text: 'Note it' }] } } } });
    const w = started('A');
    st().pauseRun(w);
    const before = st().data;
    expect(st().endRun(w)).toMatchObject({ ok: false });
    expect(st().data).toBe(before);
  });

  it('ending a paused run keeps its pause note in the ended run’s record', () => {
    const id = started('M');
    st().pauseRun(id, 'lunch');
    expect(st().endRun(id)).toMatchObject({ ok: true });
    expect(readRun(st().data, id)!.endedAt).toBeDefined();
    expect(st().data.runs[id].reason).toBe('lunch');
  });
});
