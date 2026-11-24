/**
 * The live map at rest (P-80, B-09 slice 2; owner D-16): the area above the composer shows a random few
 * of the last three weeks' lines — what's been done, nothing highlighted, no counts. The few are drawn
 * once a day (the seed is the local date), each sits in a place from its id, and the home holds them
 * while it's on screen (WCAG 2.2.2: nothing changes by itself while you look). Age is in words and in
 * the light's glow (warmth), never in faded text. Beyond three weeks: a calm sky, with no copy. Pure.
 */
import { looksLit } from './rise';
import { warmth } from './selectors';
import { footprintName, hash, walkedWords } from './sky';
import { Data, Id } from './types';

/** The window: lines from the last three weeks. */
export const FEED_DAYS = 21;
/** A few: at most this many lines at once. */
export const FEED_MAX = 5;
/** The picture's rows (one line per row, so no two labels collide); more rows than lines leaves gaps. */
export const FEED_ROWS = 6;
/** A row is never shorter than a target (44 pt). */
export const FEED_ROW_MIN = 44;

const DAY = 864e5;
const SPREAD = 9973;

/** The local calendar date, `YYYY-MM-DD`: the day's seed. */
export function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * The day's few: lines from the last FEED_DAYS days (loose or attached, lit or settled), ordered by a
 * hash of the day and their id, the first FEED_MAX. The same all day; another day, another few. A new
 * line displaces at most one. Not newest-first: nothing is singled out.
 */
export function pickFeed(data: Data, now = new Date()): Id[] {
  const since = now.getTime() - FEED_DAYS * DAY;
  const day = dayKey(now);
  return Object.values(data.activities)
    .filter((a) => Date.parse(a.occurredAt) >= since)
    .map((a) => ({ id: a.id, k: hash(`${day}:${a.id}`) }))
    .sort((a, b) => a.k - b.k || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, FEED_MAX)
    .map((a) => a.id);
}

/** A line's place: its row (0…FEED_ROWS−1, top down) and how far in it starts (0…1 of the room for that). */
export interface FeedPlace {
  row: number;
  x: number;
}

/**
 * Places from ids: each line's row is the one its id hashes to, else the next free one (ids taken in
 * their own order, so the order they come in never matters); its indent comes from its id alone.
 */
export function feedPlaces(ids: Id[]): Record<Id, FeedPlace> {
  const out: Record<Id, FeedPlace> = {};
  const taken = new Set<number>();
  for (const id of [...ids].sort()) {
    let row = hash(`row:${id}`) % FEED_ROWS;
    for (let i = 0; i < FEED_ROWS && taken.has(row); i++) row = (row + 1) % FEED_ROWS;
    taken.add(row);
    out[id] = { row, x: (hash(`x:${id}`) % SPREAD) / SPREAD };
  }
  return out;
}

/** A line on the live map. */
export interface FeedLine extends FeedPlace {
  id: Id;
  /** Its words, spaces tidied. */
  text: string;
  /** When, in words ("today", "on Tuesday", "last week"). */
  when: string;
  /** Its light's glow, 0…1: warmth (age); 0 with the shading off. Lit and settled alike. */
  glow: number;
  /** Known (it opens with its choices), never drawn differently. */
  lit: boolean;
}

/**
 * The held few, as drawn: newest first (the reading order), places from all the held ids (so a line
 * that's gone, by Undo, leaves the others where they were), when in words as of `now` (the arrival).
 */
export function feedLines(data: Data, ids: Id[], now = new Date(), { shading = true }: { shading?: boolean } = {}): FeedLine[] {
  const places = feedPlaces(ids);
  return ids
    .map((id) => data.activities[id])
    .filter((a) => !!a)
    .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : a.id < b.id ? -1 : 1))
    .map((a) => ({
      id: a.id,
      ...places[a.id],
      text: a.text.trim().replace(/\s+/g, ' '),
      when: walkedWords(a.occurredAt, now),
      glow: shading ? warmth(new Date(a.occurredAt), now) : 0,
      lit: looksLit(a, now),
    }));
}

/** Its accessible name: "read on the bus, yesterday" (lit or not, alike). */
export const feedName = (l: Pick<FeedLine, 'text' | 'when'>) => footprintName({ text: l.text, when: l.when });
