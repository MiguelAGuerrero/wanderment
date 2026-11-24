/**
 * P-84: the sheet's search lights the stars above — every matching line a star (placed from its id,
 * with its words and when in words); as the query changes the stars that stay never move; no counts.
 */
import { describe, expect, it } from 'vitest';

import { placeStars, searchLineIds, searchSaid, searchSheetHeight, starWords } from './searchSky';
import { Data, emptyData } from './types';

const DAY = 864e5;
const NOW = new Date(2026, 10, 24, 15, 0);
const ago = (d: number) => new Date(NOW.getTime() - d * DAY).toISOString();

function world(): Data {
  const d = emptyData();
  const add = (id: string, text: string, days: number, note?: string) => (d.activities[id] = { id, text, occurredAt: ago(days), createdAt: ago(days), toIds: [], ...(note && { note }) });
  add('a', 'sketched hands', 0.1);
  add('b', 'sketched a café', 3);
  add('c', 'read on the bus', 1, 'a sketch of a plan');
  add('d', 'called mum', 40);
  return d;
}

describe('searchLineIds: every matching line, newest first', () => {
  it('matches words or notes (every word, any order, accents folded), from any time', () => {
    expect(searchLineIds(world(), 'sketch')).toEqual(['a', 'c', 'b']);
    expect(searchLineIds(world(), 'cafe sketched')).toEqual(['b']);
    expect(searchLineIds(world(), 'mum')).toEqual(['d']);
  });
  it('an empty query matches nothing (the sky at rest)', () => {
    expect(searchLineIds(world(), '  ')).toEqual([]);
  });
});

describe('placeStars: placed from ids, and sticky', () => {
  const ids = ['a', 'b', 'c', 'd', 'e'];
  it('each in its own row (never a taken one), indent from its id; the order given never matters', () => {
    const p = placeStars({}, ids, { rows: 6, taken: [2] });
    const rows = Object.values(p).map((s) => s.row);
    expect(new Set(rows).size).toBe(5);
    expect(rows).not.toContain(2);
    for (const s of Object.values(p)) expect(s.x).toBeGreaterThanOrEqual(0);
    expect(placeStars({}, [...ids].reverse(), { rows: 6, taken: [2] })).toEqual(p);
  });

  it('as the query changes, the stars that stay never move; one that goes frees its row', () => {
    const first = placeStars({}, ['a', 'b', 'c'], { rows: 4 });
    const next = placeStars(first, ['a', 'c', 'x', 'y'], { rows: 4 });
    expect(next.a).toEqual(first.a);
    expect(next.c).toEqual(first.c);
    expect(next.b).toBeUndefined();
    const rows = Object.values(next).filter((s) => s.row !== undefined).map((s) => s.row);
    expect(new Set(rows).size).toBe(rows.length);
  });

  it('a star keeps the place it was given, even where a fresh placing would put it elsewhere', () => {
    const prev = { a: { row: 3, x: 0.5 }, p: { x: 0.25, y: 0.75 } };
    const next = placeStars(prev, ['a', 'b', 'p', 'q'], { rows: 4 });
    expect(next.a).toEqual({ row: 3, x: 0.5 });
    expect(next.p).toEqual({ x: 0.25, y: 0.75 });
    expect(next.b.row).not.toBe(3);
  });

  it('with no row free, a star is a point without words (from its id), and stays one', () => {
    const p = placeStars({}, ['a', 'b', 'c'], { rows: 1 });
    const points = Object.values(p).filter((s) => s.row === undefined);
    expect(points).toHaveLength(2);
    for (const s of points) expect(s.y).toBeGreaterThanOrEqual(0);
    const again = placeStars(p, ['a', 'b', 'c', 'z'], { rows: 1 });
    for (const id of ['a', 'b', 'c']) expect(again[id]).toEqual(p[id]);
  });
});

describe('words, never numbers', () => {
  it('a star has its words and when in words', () => {
    expect(starWords(world(), 'a', NOW)).toEqual({ text: 'sketched hands', when: 'today' });
  });
  it('the result is said in words, with no count', () => {
    expect(searchSaid('sketch', true)).toBe('Found in your lines.');
    expect(searchSaid('zzz', false)).toBe('Nothing found.');
    expect(searchSaid('', false)).toBe('');
    for (const s of [searchSaid('a', true), searchSaid('a', false)]) expect(s).not.toMatch(/\d/);
  });
  it('while searching the sheet is low enough to leave the sky in view', () => {
    expect(searchSheetHeight(733, 844)).toBe(422);
    expect(searchSheetHeight(300, 844)).toBe(300);
  });
});
