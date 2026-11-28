/**
 * P-114 (B-19 slice 1) through the store: a start chosen is one write with one Undo ("Undo New": the routine goes whole,
 * its draft with it); each answer goes into the routine's draft and leaves that Undo where it is; the composer's end
 * shows "Made “<name>”" with it, where it lands (B-19 journey 5, under P-115). A name in use writes nothing. Expected
 * values come from B-19 and DESIGN.md's notices — never from running the code.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { draftData, draftOf } from '@/domain/draft';
import { readRoutine, routineNamed } from '@/domain/run';
import { emptyData } from '@/domain/types';

import { useStore } from './useStore';

const st = () => useStore.getState();
/** The routine a start made (it must have made one). */
const made = (did: ReturnType<ReturnType<typeof st>['startComposing']>): string => {
  expect(did.ok).toBe(true);
  return did.ok ? did.routineId! : '';
};

beforeEach(() => {
  useStore.setState({ data: emptyData(), undo: undefined, toast: undefined, runNotice: undefined, toVerb: undefined, storage: { state: 'ready', kind: 'sqlite' } });
});

describe('the composer through the store', () => {
  it('a start: its template copied under the name, in Edit — one write, one Undo, the notice kept quiet until the end', () => {
    const id = made(st().startComposing('make', 'a zine about my street'));
    expect(readRoutine(st().data, id)!.words).toBe('Make a zine about my street');
    expect(draftOf(st().data, id)).toBeDefined();
    expect(st().runNotice).toMatchObject({ verb: 'new', text: 'Made “Make a zine about my street”', label: 'New', quiet: true });
    expect(st().runNotice!.entry).toBe(st().undo);
  });

  it('answers go into the draft at once and leave the start’s Undo; the end shows “Made …” with it, carried to where it lands', () => {
    const id = made(st().startComposing('make', 'a zine about my street'));
    const undo = st().undo;
    expect(st().composeAnswer(id, 'make', 'for', 'so neighbours notice the street').ok).toBe(true);
    expect(st().composeAnswer(id, 'make', 'ways', 'photocopy\nrisograph').ok).toBe(true);
    expect(st().undo).toBe(undo);
    expect((readRoutine(draftData(st().data, id), id)!.items[0] as { text: string }).text).toBe('so neighbours notice the street');
    // Saved: still the template's words — the answers are the draft's until Save.
    expect((readRoutine(st().data, id)!.items[0] as { text: string }).text).toBe('State who it is for and what it should do for them');
    st().composed(id);
    expect(st().runNotice).toMatchObject({ text: 'Made “Make a zine about my street”', follows: true });
    expect(st().runNotice!.quiet).toBeUndefined();
    expect(st().runNotice!.entry).toBe(st().undo);
  });

  it('its one Undo takes the whole routine away — what it brought, its draft and the answers in it', () => {
    const id = made(st().startComposing('make', 'a zine'));
    st().composeAnswer(id, 'make', 'done', 'printed');
    st().composed(id);
    expect(st().undoLast()).toBe(true);
    expect(st().data.routines).toEqual({});
    expect(routineNamed(st().data, 'Make a zine')).toBeUndefined();
  });

  it('a name in use: refused, nothing written, the Undo slot as it was', () => {
    const first = st().startComposing('work', 'redo my CV');
    const data = st().data;
    const undo = st().undo;
    const again = st().startComposing('work', 'Redo my CV');
    expect(first.ok).toBe(true);
    expect(again).toMatchObject({ ok: false, reason: 'same-name' });
    expect(st().data).toBe(data);
    expect(st().undo).toBe(undo);
  });

  it('the end shows nothing once another action took the Undo slot (the notice is never stale)', () => {
    const id = made(st().startComposing('work', 'redo my CV'));
    st().createRoutine('Something else');
    const notice = st().runNotice;
    st().composed(id);
    expect(st().runNotice).toBe(notice);
  });
});
