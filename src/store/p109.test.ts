/**
 * P-109 through the store: every change in the Places sheet (add, change, reorder, remove) is one edit of the
 * routine, said in the sheet with its Undo ("Added “X”", "Changed “X”", "Moved “X”", "Removed “X”" — not a quiet
 * Plan edit: the routine's menu is under the sheet), and Undo takes exactly that change back. Opening a place
 * changes nothing (B-18: the run stays exactly where it is) — the screens open it; the store is not asked.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { placesOf } from '@/domain/places';
import { Data, emptyData } from '@/domain/types';

import { useStore } from './useStore';

const st = () => useStore.getState();
const at = '2026-11-01T00:00:00.000Z';
const seeded = (): Data => ({
  ...emptyData(),
  routines: { R: { id: 'R', words: 'Drawing practice', named: true, createdAt: at, items: [{ id: 'a', text: 'Warm up' }] } },
});
const names = () => placesOf(st().data.routines.R.places).map((p) => p.name);

beforeEach(() => {
  useStore.setState({ data: seeded(), undo: undefined, toast: undefined, runNotice: undefined, toVerb: undefined, storage: { state: 'ready', kind: 'sqlite' } });
});

describe('the Places sheet’s changes, each with Undo', () => {
  it('add, change, move, remove: each said with its Undo, and Undo takes back that one change only', () => {
    const steps: [Parameters<ReturnType<typeof st>['editRoutine']>[1], string, string[]][] = [
      [{ kind: 'addPlace', name: 'Product design', where: 'https://www.notion.so/x' }, 'Added “Product design”', ['Product design']],
      [{ kind: 'addPlace', name: 'Sketchbook', where: 'left shelf' }, 'Added “Sketchbook”', ['Product design', 'Sketchbook']],
    ];
    for (const [edit, text, after] of steps) {
      const before = st().data;
      expect(st().editRoutine('R', edit).ok).toBe(true);
      expect(names()).toEqual(after);
      expect(st().runNotice).toMatchObject({ text, verb: 'editRoutine' });
      expect(st().runNotice!.quiet).toBeUndefined();
      expect(st().runNotice!.entry).toBe(st().undo);
      expect(st().undoLast()).toBe(true);
      expect(st().data).toEqual(before);
      expect(st().editRoutine('R', edit).ok).toBe(true);
    }
    const [doc, book] = placesOf(st().data.routines.R.places);
    for (const [edit, text, after] of [
      [{ kind: 'changePlace', place: doc.id, name: 'Design doc', where: 'https://www.notion.so/y' }, 'Changed “Product design”', ['Design doc', 'Sketchbook']],
      [{ kind: 'movePlace', place: book.id, by: -1 }, 'Moved “Sketchbook”', ['Sketchbook', 'Design doc']],
      [{ kind: 'removePlace', place: doc.id }, 'Removed “Design doc”', ['Sketchbook']],
    ] as const) {
      const before = st().data;
      expect(st().editRoutine('R', edit).ok).toBe(true);
      expect(names()).toEqual(after);
      expect(st().runNotice).toMatchObject({ text });
      expect(st().runNotice!.quiet).toBeUndefined();
      expect(st().undoLast()).toBe(true);
      expect(st().data).toEqual(before);
      expect(st().editRoutine('R', edit).ok).toBe(true);
    }
  });

  it('refused (no name, a place that is gone): nothing changes and the Undo slot is left as it was', () => {
    expect(st().editRoutine('R', { kind: 'addPlace', name: 'A', where: 'a' }).ok).toBe(true);
    const before = st().data;
    const undo = st().undo;
    expect(st().editRoutine('R', { kind: 'addPlace', name: ' ', where: 'a' })).toMatchObject({ ok: false, reason: 'empty' });
    expect(st().editRoutine('R', { kind: 'removePlace', place: 'nope' })).toMatchObject({ ok: false, reason: 'gone' });
    expect(st().data).toBe(before);
    expect(st().undo).toBe(undo);
  });
});
