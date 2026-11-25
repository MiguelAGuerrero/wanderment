/**
 * One home (P-74, B-08 "One home", D-15): the trailhead and the sky are one place. At rest, your
 * recent lines are faint, unlabelled stars (faint lines between ones that share a word), and your whys
 * are guiding stars a little brighter. "I'm not sure", a star or a trail tilts the camera up into a
 * session over the same sky: one subject, one way out; it ends by itself after a choice. Pure: what the
 * sky at rest shows, what a session is about, and when one ends by itself. Nothing here is stored.
 */
import { Place } from './passage';
import { litGlow, looksLit } from './rise';
import { hash, skyStars } from './sky';
import { Data, Id } from './types';

/** Lines drawn at rest: the last REST_WINDOW_DAYS, or the newest REST_FLOOR, whichever is more… */
export const REST_WINDOW_DAYS = 60;
export const REST_FLOOR = 12;
/** …and never more than this many (the oldest are thinned first). */
export const REST_MAX = 80;

/** A line's star: where it sits, as fractions of the screen's width and height. */
export interface RestStar {
  id: Id;
  x: number;
  y: number;
  /** P-73: a line that still looks lit (drawn as a star in night ink), with its glow (0 with the shading off). Absent: settled. */
  lit?: { glow: number };
}
/** A guiding star (a why): where it sits. */
export interface Guide {
  id: Id;
  x: number;
  y: number;
}
export interface RestSky {
  /** Newest first. */
  lines: RestStar[];
  /** Faint lines between two lines' stars that share a word stem (older → newer). Decorative. */
  links: { from: Id; to: Id }[];
  guides: Guide[];
}

/** The lines' stars sit in the sky above the question; the guiding stars, higher still. */
const LINE_BAND = { x: [0.06, 0.94], y: [0.03, 0.36] } as const;
const GUIDE_BAND = { x: [0.1, 0.9], y: [0.03, 0.14] } as const;
const SPREAD = 9973;

/** A fixed place from an id (never from time, order or heat), inside `band`. */
function place(id: Id, band: { x: readonly [number, number]; y: readonly [number, number] }, salt: string) {
  const at = (h: number, [lo, hi]: readonly [number, number]) => lo + ((h % SPREAD) / SPREAD) * (hi - lo);
  return { x: at(hash(`${salt}x${id}`), band.x), y: at(hash(`${salt}y${id}`), band.y) };
}

/** Words that never join two stars. */
const COMMON = new Set(['with', 'from', 'that', 'this', 'have', 'some', 'them', 'into', 'about', 'just', 'then', 'what', 'were', 'been', 'more', 'also', 'again', 'there', 'their', 'when', 'your', 'today', 'tonight']);

/** A line's word stems: words of four letters or more, common ones left out, simple endings folded. */
export function stems(text: string): string[] {
  const out: string[] = [];
  for (const w of text.normalize('NFC').toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (w.length < 4 || COMMON.has(w)) continue;
    const s = w.replace(/(ing|ed|es)$/u, (m, _e, i) => (i >= 3 ? '' : m)).replace(/([^s])s$/u, '$1');
    if (!out.includes(s)) out.push(s);
  }
  return out;
}

/**
 * The sky at rest: your recent lines (the last ~60 days or the newest ~12, whichever is more; at most
 * ~80, the oldest thinned first), each in a fixed place from its id and all alike — nothing dims,
 * withers or counts with time away (P-73: a lit line is a star with a glow that fades like warmth, and
 * draws as settled about a month on); faint lines between stars that share a word stem (each joins at
 * most the latest earlier one); and the sky's whys as guiding stars, high up, each in a fixed place.
 */
export function restSky(data: Data, now = new Date(), { shading = true }: { shading?: boolean } = {}): RestSky {
  const since = new Date(now.getTime() - REST_WINDOW_DAYS * 864e5).toISOString();
  const all = Object.values(data.activities).sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : a.id < b.id ? -1 : 1));
  const recent = all.findIndex((a) => a.occurredAt < since);
  const n = Math.min(REST_MAX, Math.max(recent < 0 ? all.length : recent, REST_FLOOR));
  const shown = all.slice(0, n);
  const lines = shown.map((a): RestStar => ({ id: a.id, ...place(a.id, LINE_BAND, 'line'), ...(looksLit(a, now) && { lit: { glow: litGlow(a, now, shading) } }) }));

  const links: RestSky['links'] = [];
  const seen: { id: Id; stems: string[] }[] = [];
  for (const a of [...shown].reverse()) {
    const mine = stems(a.text);
    const to = [...seen].reverse().find((s) => s.stems.some((w) => mine.includes(w)));
    if (to) links.push({ from: to.id, to: a.id });
    seen.push({ id: a.id, stems: mine });
  }

  return { lines, links, guides: restGuides(data, now) };
}

/** The sky's whys as guiding stars, high up, each in a fixed place from its id (P-74; still drawn at rest by P-80's home). */
export function restGuides(data: Data, now = new Date()): Guide[] {
  return skyStars(data, { now }).map((s) => ({ id: s.thread.id, ...place(s.thread.id, GUIDE_BAND, 'guide') }));
}

/** The guiding stars' band ends this far down the window (P-80: the live map's lines start below it). */
export const GUIDE_BAND_END = GUIDE_BAND.y[1];

// ─── Sessions ──────────────────────────────────────────────────────────────

/**
 * What a session over the home is about: the whys (look up), one why (its wanders), or one wander (its
 * trail; `star` is the why it was opened from), or a line just sent up (P-73: the rise).
 */
export type Subject = { kind: 'whys' } | { kind: 'why'; id: Id } | { kind: 'wander'; id: Id; star?: Id } | { kind: 'line'; activityId: Id };

/** Where the camera is for a subject (P-72's places: the passage between them). */
export function subjectPlace(s: Subject): Exclude<Place, 'trailhead' | 'map'> {
  return s.kind === 'whys' || s.kind === 'line' ? 'sky' : s.kind === 'why' ? 'star' : 'trail';
}

/**
 * The old home's own address (P-88): `/` opens the new app (`/go`), so everything in the old app that
 * means "the home at rest" goes here, and never throws you into the new one.
 */
export const OLD_HOME = '/old';

/** A session's link: the home, already tilted to it. */
export function subjectHref(s: Subject): string {
  if (s.kind === 'whys') return '/sky';
  if (s.kind === 'why') return `/star/${encodeURIComponent(s.id)}`;
  if (s.kind === 'line') return `/line/${encodeURIComponent(s.activityId)}`;
  return `/trail/${encodeURIComponent(s.id)}${s.star ? `?star=${encodeURIComponent(s.star)}` : ''}`;
}

/** After a choice (Did it), the beat before the session ends by itself: long enough to see Undo. */
export const RETURN_BEAT_MS = 1600;

/**
 * Whether a session ends by itself after a choice. Under a screen reader it waits for you to leave:
 * native knows when one is on; web can't tell, so only a choice made with a pointer ends it (a
 * keyboard's, or assistive tech's, waits).
 */
export function endsByItself({ web, screenReader, input }: { web: boolean; screenReader: boolean; input?: 'pointer' | 'keyboard' }): boolean {
  return web ? input === 'pointer' : !screenReader;
}

/** A downward drag on a session this long (px) leaves it, like tapping the ground (audit F5). */
export const SWIPE_LEAVE_PX = 60;
/** …or a fling this fast (px/ms) over at least half of it. */
const FLING = 0.8;

type Swipe = { dx: number; dy: number; vy?: number; atTop: boolean; inField?: boolean };
/** Mostly downward: the drag is clearly vertical. */
const downward = ({ dx, dy }: Swipe) => dy > 0 && dy > 2 * Math.abs(dx);

/**
 * Whether a drag on a session may become the swipe out: it's going down, from content that isn't
 * scrolled (there a drag down scrolls it) and not from a field (a drag there selects text).
 */
export const swipeStarts = (s: Swipe): boolean => s.atTop && !s.inField && s.dy >= 8 && downward(s);

/** Whether the swipe, let go, leaves the session: far enough down, or a fling. */
export const swipeLeaves = (s: Swipe): boolean =>
  s.atTop && !s.inField && downward(s) && (s.dy >= SWIPE_LEAVE_PX || (s.dy >= SWIPE_LEAVE_PX / 2 && (s.vy ?? 0) >= FLING));
