/**
 * P-102: Move up / Move down left the step menu on normal phones (owner, 2026-11-27); they stay as a row's
 * screen-reader actions, its keys (Alt+↑ / Alt+↓), the grip's own menu and — under 340 px, with no grip — the
 * step menu. What each row of a real Plan offers, and that taking an offered move does what it says: one
 * place, "Repeat from here" passed alone (P-90), nothing else moved. Expected values come from DESIGN.md
 * (Plan: "One press moves one row: next to Repeat from here a step passes it and nothing else moves").
 */
import { describe, expect, it } from 'vitest';

import { editRoutine, Item } from './run';
import { planView, rowMoves } from './runView';
import { Data, emptyData, Routine } from './types';

const env = () => ({ now: '2026-11-27T10:00:00.000Z', id: () => 'x' });
const step = (id: string): Item => ({ id, text: id });
const seq = (id: string, items: Item[], extra: Partial<Routine> = {}): Routine => ({ id, words: id, named: true, createdAt: '2026-11-01T00:00:00.000Z', items, ...extra });
/** Three steps, "Repeat from here" before the second. */
const data = (): Data => ({ ...emptyData(), routines: { r: seq('r', [step('a'), step('b'), step('c')], { repeatFrom: 1 }) } });
const rows = (d: Data) => planView(d, { routineId: 'r' })!.rows;
const order = (d: Data) => {
  const r = d.routines.r as Routine;
  return { steps: (r.items as Item[]).map((i) => i.id), from: r.repeatFrom };
};

describe('P-102: a Plan row’s moves', () => {
  it('each row offers only the moves it can make, named in words: the first can only go down, the last only up', () => {
    const [a, b, c] = rows(data());
    expect(rowMoves(a).map((m) => m.label)).toEqual(['Move down']);
    expect(rowMoves(b).map((m) => m.label)).toEqual(['Move up', 'Move down']);
    expect(rowMoves(c).map((m) => m.label)).toEqual(['Move up']);
    // A routine of one step: nothing to move.
    const one: Data = { ...emptyData(), routines: { r: seq('r', [step('a')]) } };
    expect(rowMoves(rows(one)[0])).toEqual([]);
  });

  it('a move taken is one place: next to "Repeat from here" the step passes it alone; otherwise it swaps with its neighbour', () => {
    let d = data();
    // b stands just under the divider: up, it passes the divider only (steps unchanged, divider one lower).
    const up = rowMoves(rows(d)[1]).find((m) => m.name === 'moveUp')!;
    let r = editRoutine(d, 'r', { kind: 'move', item: 'b', by: up.by }, env());
    expect(r.ok).toBe(true);
    d = r.data;
    expect(order(d)).toEqual({ steps: ['a', 'b', 'c'], from: 2 });
    // Up again: now it swaps with a.
    r = editRoutine(d, 'r', { kind: 'move', item: 'b', by: rowMoves(rows(d)[1]).find((m) => m.name === 'moveUp')!.by }, env());
    expect(order(r.data)).toEqual({ steps: ['b', 'a', 'c'], from: 2 });
    // And it is now first: no Move up is offered.
    expect(rowMoves(rows(r.data)[0]).map((m) => m.name)).toEqual(['moveDown']);
  });
});
