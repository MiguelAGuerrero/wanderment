/**
 * Look up, and under a star (P-66, B-07 slice 2). Nothing here is stored.
 *
 * "I'm not sure" shows your whys as stars: declared ones (oldest mark first), then earned ones (oldest
 * wander first) — a fixed order that never follows heat or recency, at most SKY_MAX. Each star sits in
 * a fixed place taken from its id and is drawn at one size; recency shows only as its warmth (silver
 * to amber) and the number of twinkling motes around it (relative, never a number on screen). Under a
 * star, the wanders feeding it (derived doing → to links) are its landmarks, each with a trail from
 * camp, its staged step and its latest note. A why with one wander (or none) opens that trail.
 */
import { emptyHeatIndex, HeatIndex, indexHeat, latestUnder, nodeHeat } from './heat';
import { declaredWhys } from './model';
import { BIG_TEXT, headerWhys, looseLogs } from './overview';
import { activitiesOf } from './selectors';
import { Data, Id, Thread } from './types';

/** Stars at most (declared whys, up to three, then earned ones). */
export const SKY_MAX = 6;
/** Motes around a star at full heat. */
export const MOTES_MAX = 8;
/** Landmarks drawn under a star; the rest go to "More wanders…". */
export const LANDMARKS_MAX = 3;
/** Footprints on a trail. */
export const FOOTPRINTS_MAX = 5;

/**
 * Where a star can sit, as fractions of the sky's width and of its band's height (minus one star's
 * height): two staggered columns, so no two overlap at any width (a star is 42 % of the width at most).
 */
export const STAR_SLOTS: readonly [x: number, y: number][] = [
  [0.27, 0.0],
  [0.73, 0.14],
  [0.27, 0.28],
  [0.73, 0.42],
  [0.27, 0.57],
  [0.73, 0.71],
  [0.27, 0.86],
  [0.73, 1.0],
];

export interface Star {
  thread: Thread;
  declared: boolean;
  /** `nodeHeat`: 0 (cold, or shading off) to 1. */
  heat: number;
  /** Twinkling motes: `moteCount(heat)`. */
  motes: number;
  /** When it (or anything feeding it) was last walked, ISO; undefined if never. */
  walked?: string;
  /** Its place in STAR_SLOTS (`starPlaces`). */
  slot: number;
}

const clamp = (h: number) => (Number.isFinite(h) ? Math.min(1, Math.max(0, h)) : 0);

/**
 * Motes for a heat: max(1, round(heat × 8)) — every star has at least one (owner, fix 15); relative to
 * recency, never shown as a number. With the shading off a star has none (`skyStars`).
 */
export const moteCount = (heat: number) => Math.max(1, Math.round(clamp(heat) * MOTES_MAX));

const byCreated = (a: { id: Id; createdAt: string }, b: { id: Id; createdAt: string }) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** FNV-1a: a small, stable hash of an id. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Each why's slot: the one its id hashes to, else the next free one. Older wanders choose first, so a
 * star keeps its place when a newer why joins. Only the whys decide it — never heat, order or activity.
 */
export function starPlaces(whys: { id: Id; createdAt: string }[]): Record<Id, number> {
  const out: Record<Id, number> = {};
  const taken = new Set<number>();
  for (const w of [...whys].sort(byCreated)) {
    if (taken.size >= STAR_SLOTS.length) break;
    let slot = hash(w.id) % STAR_SLOTS.length;
    while (taken.has(slot)) slot = (slot + 1) % STAR_SLOTS.length;
    taken.add(slot);
    out[w.id] = slot;
  }
  return out;
}

/** The sky: declared whys (oldest mark first), then earned ones (oldest wander first), at most SKY_MAX. */
export function skyStars(data: Data, opts: { now?: Date; shading?: boolean } = {}): Star[] {
  const { now = new Date(), shading = true } = opts;
  const declared = declaredWhys(data);
  const declaredIds = new Set(declared.map((t) => t.id));
  const earned = headerWhys(data, now)
    .map((id) => data.threads[id])
    .filter((t) => t && !t.hidden && !declaredIds.has(t.id))
    .sort(byCreated);
  const whys = [...declared, ...earned].slice(0, SKY_MAX);
  const index = heatIndex(data);
  const heat = nodeHeat(data, whys.map((t) => t.id), { now, shading }, index);
  const places = starPlaces(whys);
  return whys.map((thread) => ({
    thread,
    declared: declaredIds.has(thread.id),
    heat: heat[thread.id],
    motes: shading ? moteCount(heat[thread.id]) : 0,
    walked: latestUnder(index, thread.id),
    slot: places[thread.id],
  }));
}

function heatIndex(data: Data): HeatIndex {
  const index = emptyHeatIndex();
  for (const a of Object.values(data.activities)) indexHeat(index, a);
  return index;
}

/** A star's accessible name: "Become an illustrator, last walked today". */
export const starName = (star: Pick<Star, 'thread' | 'walked'>, now = new Date()) =>
  `${star.thread.name}, ${star.walked ? `last walked ${walkedWords(star.walked, now)}` : 'not walked yet'}`;

type RGB = [number, number, number];
const mix = (a: RGB, b: RGB, t: number): RGB => a.map((v, i) => Math.round(v + (b[i] - v) * t)) as RGB;
const rgb = (c: RGB) => `rgb(${c.join(', ')})`;
const SILVER: RGB = [233, 236, 250];
const AMBER: RGB = [255, 231, 211];
const GLOW_COLD: RGB = [190, 200, 240];
const GLOW_WARM: RGB = [242, 180, 140];

/** A star's colour and the glow around it: silver when cold (or with the shading off), amber when warm. */
export function starTint(heat: number): { fill: string; glow: string } {
  const h = clamp(heat);
  return { fill: rgb(mix(SILVER, AMBER, h)), glow: rgb(mix(GLOW_COLD, GLOW_WARM, h)) };
}

// ─── Under a star ──────────────────────────────────────────────────────────

export interface Landmark {
  thread: Thread;
  /** Its own latest activity, ISO. */
  walked?: string;
  /** Its staged step, if any. */
  step?: string;
  /** The note on its latest activity that has one. */
  note?: string;
  /** The one walked most lately (shading on). */
  warm: boolean;
}

/** The note on a wander's latest activity that has one (P-68 brings a note of its own). */
export const latestNote = (data: Data, threadId: Id): string | undefined =>
  activitiesOf(data, threadId)
    .find((a) => a.note?.trim())
    ?.note?.trim();

/** Visible wanders that feed the why directly (doing → to), never the why itself. */
function feeders(data: Data, whyId: Id, index: HeatIndex): Thread[] {
  return [...(index.feeders.get(whyId) ?? [])].map((id) => data.threads[id]).filter((t): t is Thread => !!t && !t.hidden && t.id !== whyId);
}

/**
 * A why's landmarks: the wanders feeding it in a fixed order — when the wander was made, then its name
 * (P-66 fix: never by recency, like the stars) — the first LANDMARKS_MAX drawn and the rest in `more`.
 * The one walked most lately is warm (shading on); that's the only trace of recency.
 */
export function landmarks(data: Data, whyId: Id, opts: { now?: Date; shading?: boolean } = {}): { shown: Landmark[]; more: Landmark[] } {
  const { shading = true } = opts;
  const index = heatIndex(data);
  const all = feeders(data, whyId, index)
    .map((thread) => ({ thread, walked: index.latest.get(thread.id), step: thread.next?.trim() || undefined, note: latestNote(data, thread.id), warm: false }))
    .sort(
      (a, b) =>
        (a.thread.createdAt < b.thread.createdAt ? -1 : a.thread.createdAt > b.thread.createdAt ? 1 : 0) ||
        a.thread.name.localeCompare(b.thread.name) ||
        (a.thread.id < b.thread.id ? -1 : a.thread.id > b.thread.id ? 1 : 0),
    );
  const latest = all.reduce<Landmark | undefined>((m, l) => (l.walked && (!m?.walked || l.walked > m.walked) ? l : m), undefined);
  if (shading && latest) latest.warm = true;
  return { shown: all.slice(0, LANDMARKS_MAX), more: all.slice(LANDMARKS_MAX) };
}

/**
 * What a landmark's card says to a screen reader (fixes 7, 8, 14): the wander, its step (or "Add a next
 * step"), its note, and when it was last walked — "draw better hands: Sketch hands, “did ten”, last
 * walked today".
 */
export const landmarkName = (l: Landmark, now = new Date()) =>
  `${l.thread.name}: ${l.step ?? 'Add a next step'}${l.note ? `, “${l.note}”` : ''}, ${l.walked ? `last walked ${walkedWords(l.walked, now)}` : 'not walked yet'}`;

/** Where a star opens: its landmarks, or (with one wander, or none but itself) straight onto that trail. */
export function starTarget(data: Data, whyId: Id): string {
  const f = feeders(data, whyId, heatIndex(data));
  if (f.length === 0) return `/trail/${encodeURIComponent(whyId)}`;
  if (f.length === 1) return `/trail/${encodeURIComponent(f[0].id)}?star=${encodeURIComponent(whyId)}`;
  return `/star/${encodeURIComponent(whyId)}`;
}

// ─── Words for when ────────────────────────────────────────────────────────

const DAY = 864e5;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/**
 * When, in words, by calendar days where you are: today, yesterday, on Tuesday (this past week), last
 * week, a few weeks ago, earlier this month, in March, in December 2025. No counts.
 */
export function walkedWords(iso: string, now = new Date()): string {
  const then = new Date(iso);
  const days = Math.round((midnight(now) - midnight(then)) / DAY);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `on ${WEEKDAYS[then.getDay()]}`;
  if (days < 14) return 'last week';
  if (days < 28) return 'a few weeks ago';
  if (then.getFullYear() === now.getFullYear() && then.getMonth() === now.getMonth()) return 'earlier this month';
  return then.getFullYear() === now.getFullYear() ? `in ${MONTHS[then.getMonth()]}` : `in ${MONTHS[then.getMonth()]} ${then.getFullYear()}`;
}

/** A trail's footprints: the wander's latest activities (at most FOOTPRINTS_MAX), newest first, in dated words. */
export function footprints(data: Data, threadId: Id, now = new Date()): { id: Id; text: string; when: string }[] {
  return activitiesOf(data, threadId)
    .slice(0, FOOTPRINTS_MAX)
    .map((a) => ({ id: a.id, text: a.text.trim().replace(/\s+/g, ' '), when: walkedWords(a.occurredAt, now) }));
}

/** A footprint's accessible name: "sketched a hand, today" (the "·" shown between them is spoken as a comma). */
export const footprintName = (f: { text: string; when: string }) => `${f.text}, ${f.when}`;

/** Loose lines drawn on the sky at most (fix 18; Map's rule, LOOSE_MAX). */
export const SKY_LOOSE_MAX = 3;

/**
 * Your recent loose lines on the sky (fix 18): Map's loose logs (no doing, no to, the last three weeks,
 * newest first), at most SKY_LOOSE_MAX, each with its words and when it happened in words.
 */
export function skyLoose(data: Data, now = new Date()): { id: Id; text: string; when: string }[] {
  return looseLogs(data, { now })
    .slice(0, SKY_LOOSE_MAX)
    .map((l) => ({ id: l.id, text: l.text, when: walkedWords(data.activities[l.id].occurredAt, now) }));
}

/** At the largest text sizes (BIG_TEXT, as on Map) the sky is a plain list of its stars, not a picture. */
export const skyAsList = (fontScale: number) => fontScale >= BIG_TEXT;

// ─── The scene under a star ────────────────────────────────────────────────

/** The landscape under a star, drawn this tall. */
export const SCENE_H = 230;
/** A landmark's name: two lines of 13 pt. */
export const LABEL_H = 36;
/** A flag's height above where its trail ends. */
export const FLAG_H = 16;
const LABEL_GAP = 6;
/** Where the flags stand (fractions of the width) and how high (the trail's end, from the top). */
const FLAGS: Record<number, [x: number, y: number][]> = {
  1: [[0.5, 84]],
  2: [
    [0.25, 88],
    [0.75, 100],
  ],
  3: [
    [1 / 6, 96],
    [0.5, 82],
    [5 / 6, 104],
  ],
};

export interface Scene {
  camp: { x: number; y: number };
  /** Where each trail ends: the foot of its flag. */
  flags: { x: number; y: number }[];
  /** Each landmark's name, in one row above every flag (so above every trail). */
  labels: { x: number; y: number; w: number; h: number }[];
  /** From camp to each flag: a cubic curve and its control points (it never rises above its flag). */
  trails: { d: string; points: [number, number][] }[];
  /** The hills' outline through the flags, closed along the bottom. */
  ridge: string;
}

/** Where things go under a star with `n` landmarks (1–3) at `width`. */
export function starScene(n: number, width: number): Scene {
  const spots = FLAGS[Math.min(3, Math.max(1, n))];
  const flags = spots.map(([fx, y]) => ({ x: Math.round(fx * width), y }));
  const top = Math.min(...flags.map((f) => f.y));
  const w = Math.floor(width / spots.length) - 8;
  const labels = flags.map((f) => ({ x: Math.min(Math.max(4, f.x - w / 2), width - 4 - w), y: top - FLAG_H - LABEL_GAP - LABEL_H, w, h: LABEL_H }));
  const camp = { x: Math.round(width / 2), y: SCENE_H - 24 };
  const trails = flags.map((f) => {
    const points: [number, number][] = [
      [camp.x, camp.y],
      [camp.x + (f.x - camp.x) * 0.2, camp.y - 40],
      [f.x, f.y + 50],
      [f.x, f.y],
    ];
    const [p0, c1, c2, p1] = points;
    return { d: `M${p0[0]} ${p0[1]} C ${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${p1[0]} ${p1[1]}`, points };
  });
  const edge = (y: number) => y + 22;
  const ridge = [`M0 ${edge(flags[0].y)}`, ...flags.map((f) => `L${f.x} ${f.y}`), `L${width} ${edge(flags.at(-1)!.y)}`, `V${SCENE_H} H0 Z`].join(' ');
  return { camp, flags, labels, trails, ridge };
}
