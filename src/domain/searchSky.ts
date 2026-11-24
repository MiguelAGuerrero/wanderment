/**
 * The sheet's search lights the stars above (P-84, owner 2026-11-24: "the search should reflect the
 * state of the stars above so you get to see the movement of your energy"). Pure: which lines match,
 * where each matching line's star sits in the sky left visible above the lowered sheet, and what's said.
 *
 * Each matching line is a star with its words and when (in words), placed as the live map places
 * lines — its row and indent from its id. Placement is sticky: as the query changes, a star that stays
 * keeps its place; new ones take free rows; when no row is free a star is drawn without words, at a
 * point from its id. The results list in the sheet is the accessible source; the sky only mirrors it.
 * No counts, anywhere.
 */
import { matches } from './search';
import { hash, walkedWords } from './sky';
import { Data, Id } from './types';

/** A star's row is one target tall. */
export const STAR_ROW_H = 44;
const SPREAD = 9973;

/** The lines a query matches (in their words or their note), newest first. */
export function searchLineIds(data: Data, query: string): Id[] {
  if (!query.trim()) return [];
  return Object.values(data.activities)
    .filter((a) => matches(a.text, query) || matches(a.note, query))
    .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : a.id < b.id ? -1 : 1))
    .map((a) => a.id);
}

/** Where a search star sits: in a row with its words (`row`), or, with no row free, at a point without words (`y`, 0…1). `x` 0…1 from its id. */
export interface StarPlace {
  row?: number;
  x: number;
  y?: number;
}

const unit = (s: string) => (hash(s) % SPREAD) / SPREAD;

/**
 * Places the stars for `ids` in `rows` rows (`taken` are rows something else already uses — a bright
 * line of the feed), keeping `prev`'s place for every id still there. A new id takes the row its id
 * hashes to, else the next free one (new ids taken in their own order, so the order they come in never
 * matters); with none free it's a point without words. Its indent always comes from its id.
 */
export function placeStars(prev: Record<Id, StarPlace>, ids: Id[], { rows, taken = [] }: { rows: number; taken?: number[] }): Record<Id, StarPlace> {
  const out: Record<Id, StarPlace> = {};
  const used = new Set<number>(taken);
  const want = new Set(ids);
  // Those that stay keep their places (a row now out of range or taken loses its words, never moves).
  for (const id of Object.keys(prev).sort()) {
    if (!want.has(id)) continue;
    const p = prev[id];
    if (p.row !== undefined && p.row < rows && !used.has(p.row)) {
      used.add(p.row);
      out[id] = p;
    } else out[id] = { x: p.x, y: p.y ?? unit(`y:${id}`) };
  }
  for (const id of [...ids].sort()) {
    if (out[id]) continue;
    const x = unit(`x:${id}`);
    let row = rows > 0 ? hash(`row:${id}`) % rows : -1;
    for (let i = 0; i < rows && used.has(row); i++) row = (row + 1) % rows;
    if (row >= 0 && !used.has(row)) {
      used.add(row);
      out[id] = { row, x };
    } else out[id] = { x, y: unit(`y:${id}`) };
  }
  return out;
}

/** A search star: its words and when, in words. */
export function starWords(data: Data, id: Id, now = new Date()): { text: string; when: string } | undefined {
  const a = data.activities[id];
  return a ? { text: a.text.trim().replace(/\s+/g, ' '), when: walkedWords(a.occurredAt, now) } : undefined;
}

/** What a screen reader hears about a query's result: in words, never a number. */
export const searchSaid = (query: string, found: boolean): string => (!query.trim() ? '' : found ? 'Found in your lines.' : 'Nothing found.');

/** The sheet's height while a search shows results: low enough to leave the sky above it in view. */
export const SEARCH_DETENT = 0.5;
export const searchSheetHeight = (full: number, windowHeight: number) => Math.min(full, Math.round(windowHeight * SEARCH_DETENT));
