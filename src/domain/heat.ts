/**
 * Heat (P-48, B-06 revision 12): the energy a node carries, drawn as its circle's colour on Home.
 *
 * A node's heat is the warmth (halving every 14 days) of the most recent activity on it or on anything
 * that feeds it through the derived doing → to links, transitively. It flows upward only, it's never a
 * sum or a count, and cycles (A → B and B → A, which DESIGN allows) are fine. With the recency shading
 * turned off every node is neutral (0). Nothing here is stored.
 */
import { warmth } from './selectors';
import { Activity, Data, Id } from './types';

/** The newest activity on each node, and who feeds whom (to ← doing): what heat is worked out from. */
export interface HeatIndex {
  latest: Map<Id, string>;
  feeders: Map<Id, Set<Id>>;
}
export const emptyHeatIndex = (): HeatIndex => ({ latest: new Map(), feeders: new Map() });

/** Adds one activity to the index (`overview` does this in the pass it already makes). */
export function indexHeat(index: HeatIndex, a: Activity) {
  const { latest, feeders } = index;
  const at = a.occurredAt;
  if (a.doingId) {
    const prev = latest.get(a.doingId);
    if (prev === undefined || at > prev) latest.set(a.doingId, at);
  }
  for (const to of a.toIds) {
    const prev = latest.get(to);
    if (prev === undefined || at > prev) latest.set(to, at);
    if (!a.doingId || to === a.doingId) continue;
    const f = feeders.get(to);
    if (f) f.add(a.doingId);
    else feeders.set(to, new Set([a.doingId]));
  }
}

/**
 * Heat per node in `ids`, 0 (cold, or shading off) to 1 (logged just now). Pass `index` when the
 * activities have already been indexed (`indexHeat`); otherwise one pass over them.
 */
export function nodeHeat(data: Data, ids: Iterable<Id>, opts: { now?: Date; shading?: boolean } = {}, index?: HeatIndex): Record<Id, number> {
  const { now = new Date(), shading = true } = opts;
  const out: Record<Id, number> = {};
  const wanted = [...ids];
  if (!shading) {
    for (const id of wanted) out[id] = 0;
    return out;
  }
  if (!index) {
    index = emptyHeatIndex();
    for (const a of Object.values(data.activities)) indexHeat(index, a);
  }
  for (const id of wanted) {
    const best = latestUnder(index, id);
    out[id] = best === undefined ? 0 : warmth(new Date(best), now);
  }
  return out;
}

/** When the most recent activity on a node or anything feeding it happened (ISO), transitively; undefined if never. */
export function latestUnder({ latest, feeders }: HeatIndex, id: Id): string | undefined {
  // Everything beneath it, each once (so a cycle ends).
  let best: string | undefined;
  const seen = new Set<Id>([id]);
  const stack = [id];
  while (stack.length) {
    const n = stack.pop()!;
    const at = latest.get(n);
    if (at !== undefined && (best === undefined || at > best)) best = at;
    for (const f of feeders.get(n) ?? []) {
      if (seen.has(f)) continue;
      seen.add(f);
      stack.push(f);
    }
  }
  return best;
}

// ─── Colours ───────────────────────────────────────────────────────────────

type RGB = [number, number, number];
const mix = (a: RGB, b: RGB, t: number): RGB => a.map((v, i) => Math.round(v + (b[i] - v) * t)) as RGB;
const rgb = (c: RGB) => `rgb(${c.join(', ')})`;

/**
 * The fill ramp: cool stone → amber → ember. It steps once, where the label turns white, so every
 * fill is either light enough for dark text or dark enough for white text (4.5:1 either way).
 */
const COLD: RGB = [238, 234, 226];
const WARM: RGB = [244, 196, 140];
const AMBER: RGB = [214, 120, 56];
const EMBER: RGB = [188, 82, 24];
const HOT: RGB = [150, 56, 10];
/** From here up, labels inside the circle are white. */
export const WHITE_FROM = 0.72;
/** Labels inside a circle: dark (theme C.ink) on cool fills, white on hot ones. */
export const HEAT_LABEL_DARK = '#18181B';
export const HEAT_LABEL_LIGHT = '#FFFFFF';
/** Outlines, rings and branches: a warm grey to a deep ember, 3:1 or more on the page throughout. */
const INK_COLD: RGB = [122, 116, 108];
const INK_HOT: RGB = [150, 56, 10];

const clamp = (h: number) => (Number.isFinite(h) ? Math.min(1, Math.max(0, h)) : 0);

export function heatFill(heat: number): string {
  const h = clamp(heat);
  if (h < 0.5) return rgb(mix(COLD, WARM, h / 0.5));
  if (h < WHITE_FROM) return rgb(mix(WARM, AMBER, (h - 0.5) / (WHITE_FROM - 0.5)));
  return rgb(mix(EMBER, HOT, (h - WHITE_FROM) / (1 - WHITE_FROM)));
}

export const heatLabel = (heat: number) => (clamp(heat) < WHITE_FROM ? HEAT_LABEL_DARK : HEAT_LABEL_LIGHT);

export const heatInk = (heat: number) => rgb(mix(INK_COLD, INK_HOT, clamp(heat)));

/** WCAG contrast ratio between two colours ("#rrggbb" or "rgb(r, g, b)"). */
export function contrast(a: string, b: string): number {
  const lum = (c: string) => {
    const v = c.startsWith('#') ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : (c.match(/\d+/g) ?? []).slice(0, 3).map(Number);
    const [r, g, bl] = v.map((x) => x / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

// ─── Night colours (dark Map) ──────────────────────────────────────────────

/**
 * Map on the night palette (theme M): cold is a dim, cool slate, rising to a dusky ember; from
 * NIGHT_DARK_FROM it steps to a warm amber, brightening toward the lantern. Light words (M.ink) on the
 * dim fills, the night page's colour (M.bg) on the amber ones: 4.5:1 or more either way.
 */
const COLD_N: RGB = [40, 40, 66];
const DUSK_N: RGB = [104, 66, 58];
const AMBER_N: RGB = [214, 140, 82];
const HOT_N: RGB = [246, 186, 128];
/** From here up, labels inside the circle are dark. */
export const NIGHT_DARK_FROM = 0.5;
export const NIGHT_LABEL_LIGHT = '#F5F3EE';
export const NIGHT_LABEL_DARK = '#0E1020';
/** Outlines, rings, branches and log dots: the sky's trail violet to the lantern, 3:1 or more on the night page and cards. */
const INK_COLD_N: RGB = [110, 104, 144];
const INK_HOT_N: RGB = [242, 180, 140];

export function nightHeatFill(heat: number): string {
  const h = clamp(heat);
  if (h < NIGHT_DARK_FROM) return rgb(mix(COLD_N, DUSK_N, h / NIGHT_DARK_FROM));
  return rgb(mix(AMBER_N, HOT_N, (h - NIGHT_DARK_FROM) / (1 - NIGHT_DARK_FROM)));
}

export const nightHeatLabel = (heat: number) => (clamp(heat) < NIGHT_DARK_FROM ? NIGHT_LABEL_LIGHT : NIGHT_LABEL_DARK);

export const nightHeatInk = (heat: number) => rgb(mix(INK_COLD_N, INK_HOT_N, clamp(heat)));
