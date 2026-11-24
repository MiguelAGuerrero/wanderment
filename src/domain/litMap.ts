/**
 * "I'm not sure" lights the map (P-81, B-09 slice 3) and attaching lands where you're looking (P-82,
 * slice 4). Pure: which nodes the live map lights, the links from its shown lines to the nodes they
 * went toward, where each node sits, and how a line lands in its node. Nothing here is stored.
 *
 * Lighting only adds: your whys and wanders as named nodes, all one size (warmth by glow only, none
 * with the shading off), in a fixed order (never by heat or recency), in a band above the feed that is
 * kept for them at rest — so the feed's lines never move or change when the map lights (fold-in 7).
 */
import { emptyHeatIndex, indexHeat, latestUnder, nodeHeat } from './heat';
import { footprintName, hash, landmarks, skyStars, walkedWords } from './sky';
import { Data, Id, Thread } from './types';

/** The live map's lines (and its nodes) start this far in from each side. */
export const FEED_SIDE = 20;
/** A node's row: one target tall (44 pt). */
export const NODE_H = 44;
/** A node's mark (a star for a why, a round light for a wander): one size for all. */
export const NODE_GLYPH = 16;
/** Between the mark and the name, and after the name. */
const NODE_GAP = 8;
const NODE_PAD = 16;
/** A generous width per character of a 15 pt name (so a name is cut short only when the estimate is off). */
const CHAR_W = 8.4;
/** The band starts this far below the top of the map. */
export const BAND_TOP = 8;
/** A line lands in its node in this long (≤ 600 ms, P-72's limit; under Reduce Motion it just appears). */
export const LAND_MS = 480;

export interface LitNode {
  id: Id;
  name: string;
  /** A why (drawn as a star); else a wander (a round light). The same size either way. */
  why: boolean;
  /** Warmth, 0…1 (`nodeHeat`): shown only as glow; 0 with the shading off. */
  heat: number;
  /** When it (or anything feeding it) was last walked, ISO. */
  walked?: string;
}

const visible = (data: Data, id: Id | undefined): Thread | undefined => (id && data.threads[id] && !data.threads[id].hidden ? data.threads[id] : undefined);
const byMade = (a: Thread, b: Thread) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0) || a.name.localeCompare(b.name) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * The nodes the map lights, in a fixed order: the sky's whys (declared, oldest mark first, then
 * earned; at most six), then every wander feeding them (each why's landmarks in their fixed order —
 * complete, never a sample), then the wanders the shown lines went toward (doing or to) that aren't
 * there yet, then `extra` (a wander a line just landed in) — by when each was made, then name. Hidden
 * wanders never light. Heat never orders anything.
 */
export function litNodes(data: Data, lineIds: Id[], { now = new Date(), shading = true, extra = [] }: { now?: Date; shading?: boolean; extra?: Id[] } = {}): LitNode[] {
  const order: Thread[] = [];
  const seen = new Set<Id>();
  const add = (t: Thread | undefined) => {
    if (!t || seen.has(t.id)) return;
    seen.add(t.id);
    order.push(t);
  };
  const whys = skyStars(data, { now, shading });
  for (const s of whys) add(s.thread);
  for (const s of whys) {
    const { shown, more } = landmarks(data, s.thread.id, { now, shading });
    for (const l of [...shown, ...more]) add(l.thread);
  }
  const went = lineIds
    .map((id) => data.activities[id])
    .filter((a) => !!a)
    .flatMap((a) => [a.doingId, ...a.toIds])
    .map((id) => visible(data, id))
    .filter((t): t is Thread => !!t && !seen.has(t.id));
  for (const t of [...new Set(went)].sort(byMade)) add(t);
  for (const id of extra) add(visible(data, id));

  const index = emptyHeatIndex();
  for (const a of Object.values(data.activities)) indexHeat(index, a);
  const heat = nodeHeat(data, order.map((t) => t.id), { now, shading }, index);
  const whyIds = new Set(whys.map((s) => s.thread.id));
  return order.map((t) => ({ id: t.id, name: t.name, why: whyIds.has(t.id), heat: heat[t.id] ?? 0, walked: latestUnder(index, t.id) }));
}

/** A link from a shown line to a node it went toward (its doing wander, or one it was to). */
export interface LitLink {
  from: Id;
  to: Id;
}

/** The links: each shown line to every lit node it went toward (doing first, then its "to"s), once each. */
export function litLinks(data: Data, lineIds: Id[], nodeIds: Id[]): LitLink[] {
  const lit = new Set(nodeIds);
  const out: LitLink[] = [];
  for (const id of lineIds) {
    const a = data.activities[id];
    if (!a) continue;
    for (const to of new Set([a.doingId, ...a.toIds])) if (to && lit.has(to)) out.push({ from: id, to });
  }
  return out;
}

/** A node's width in the band: its mark, its name (estimated), and room around them; never wider than `max`. */
export const nodeWidth = (name: string, max: number) => Math.min(max, Math.ceil(NODE_GLYPH + NODE_GAP + name.length * CHAR_W + NODE_PAD));

/** Clear space between two nodes' boxes, side by side (and above/below a label inside its 44 pt row). */
export const NODE_CLEAR = 24;
/** A slot is never narrower than this (narrower windows get fewer columns, down to one). */
const SLOT_MIN = 132;
/** Nothing in the band comes nearer the screen's edge than this. */
export const EDGE = 16;

/** Where a node sits in the band: its row (top down), how far in from the band's left edge, its width, and its column. */
export interface NodePlace {
  row: number;
  x: number;
  w: number;
  col: number;
}

/**
 * The band's layout (P-81 rework): fixed slots across the band's full width — columns of equal width
 * with NODE_CLEAR between them, rows one target tall — and each node in the slot its id hashes to,
 * else the next free one (ids taken in their own order, so the order they come in never matters, as the
 * feed places its lines). Never two nodes in one slot; a name longer than its slot is cut short (its
 * full words stay in its accessible name). Pure arithmetic, so it's known at rest — before anything is
 * lit — and the band can be kept for it. `span` is the band's width (the screen less its sides).
 */
export function nodePlaces(nodes: Pick<LitNode, 'id' | 'name'>[], span: number): { places: Record<Id, NodePlace>; rows: number } {
  const places: Record<Id, NodePlace> = {};
  if (!nodes.length) return { places, rows: 0 };
  const cols = Math.max(1, Math.floor((span + NODE_CLEAR) / (SLOT_MIN + NODE_CLEAR)));
  const w = Math.max(0, (span + NODE_CLEAR) / cols - NODE_CLEAR);
  const rows = Math.ceil(nodes.length / cols);
  const slots = rows * cols;
  const taken = new Set<number>();
  for (const n of [...nodes].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    let slot = hash(`node:${n.id}`) % slots;
    while (taken.has(slot)) slot = (slot + 1) % slots;
    taken.add(slot);
    const row = Math.floor(slot / cols);
    const col = slot % cols;
    places[n.id] = { row, col, x: col * (w + NODE_CLEAR), w };
  }
  return { places, rows };
}

/** A point on screen (in the map's own coordinates). */
export type Pt = { x: number; y: number };
/** A box on screen (a label, a node). */
export type Box = { x: number; y: number; w: number; h: number };

/**
 * A link's route (P-81 rework): never across a line's words. From the line's light it goes left into
 * the gutter (`gutter`, left of every line, which start further in), up the gutter to the gap under
 * its node's row (between rows, clear of every node's name), along that gap to the node's mark, and up
 * into it. Returned as the polyline's points.
 */
export function linkRoute(light: Pt, node: { x: number; y: number; rowBottom: number }, gutter: number): Pt[] {
  return [light, { x: gutter, y: light.y }, { x: gutter, y: node.rowBottom }, { x: node.x, y: node.rowBottom }, { x: node.x, y: node.y }];
}

/** Whether the segment a–b passes through the box (touching its edge counts). */
export function segmentHitsBox(a: Pt, b: Pt, box: Box): boolean {
  // Liang–Barsky clipping of the segment against the box.
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const edges: [number, number][] = [
    [-dx, a.x - box.x],
    [dx, box.x + box.w - a.x],
    [-dy, a.y - box.y],
    [dy, box.y + box.h - a.y],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const r = q / p;
      if (p < 0) t0 = Math.max(t0, r);
      else t1 = Math.min(t1, r);
      if (t0 > t1) return false;
    }
  }
  return true;
}

/** The band's height for `rows` rows of nodes (nothing when there are none). */
export const bandHeight = (rows: number) => (rows > 0 ? BAND_TOP + rows * NODE_H : 0);

/** A node's accessible name: "feel productive, last walked today" (no counts). */
export const nodeName = (n: Pick<LitNode, 'name' | 'walked'>, now = new Date()) => `${n.name}, ${n.walked ? `last walked ${walkedWords(n.walked, now)}` : 'not walked yet'}`;

/**
 * A shown line's accessible name while the map is lit: its words and when (as at rest), then where it
 * went — "cleaned the kitchen, on Sunday, toward feel productive". The words shown never change.
 */
export const litLineName = (line: { text: string; when: string }, toward: string[]) =>
  `${footprintName(line)}${toward.length ? `, toward ${toward.join(' and ')}` : ''}`;

/** A line that landed in its node (P-82): what it says there, in words — "washed the car → tidy". */
export const landedWords = (text: string, node: string) => `${text.trim().replace(/\s+/g, ' ')} → ${node}`;

/** The feed's geometry, as the trailhead draws it (P-80): its lines' lights start this far in, over this share of the room. */
const LIGHT = 16;
const LIGHT_GAP = 10;
const INDENT = 0.4;
const LINE_H = 20;
/** The link gutter: left of every line (they start at FEED_SIDE or further in), clear of every node. */
export const LINK_GUTTER = 12;

/**
 * Where everything on the lit map goes (P-81 rework; the trailhead draws from this): each shown line's
 * light and the box its words take, each node's 44 pt box and its name's box, and each link's route.
 * Pure, so the rules can be checked: no node's name within NODE_CLEAR of another's, nothing nearer the
 * screen's edge than EDGE, and no link across any words.
 */
export function litGeometry({
  lines,
  places,
  links,
  width,
  top,
  rowH,
}: {
  lines: { id: Id; row: number; x: number; text: string; when: string }[];
  places: Record<Id, NodePlace>;
  links: LitLink[];
  width: number;
  top: number;
  rowH: number;
}) {
  const span = Math.max(0, width - 2 * FEED_SIDE);
  const light: Record<Id, Pt> = {};
  const lineBoxes: Record<Id, Box> = {};
  for (const l of lines) {
    const left = FEED_SIDE + l.x * span * INDENT;
    const cy = top + l.row * rowH + rowH / 2;
    light[l.id] = { x: left + LIGHT / 2, y: cy };
    const x = left + LIGHT + LIGHT_GAP;
    lineBoxes[l.id] = { x, y: cy - LINE_H / 2, w: Math.max(0, Math.min(`${l.text} · ${l.when}`.length * CHAR_W, width - FEED_SIDE - x)), h: LINE_H };
  }
  const nodeBoxes: Record<Id, Box> = {};
  const nameBoxes: Record<Id, Box> = {};
  const marks: Record<Id, Pt & { rowBottom: number }> = {};
  for (const [id, p] of Object.entries(places)) {
    const y = BAND_TOP + p.row * NODE_H;
    nodeBoxes[id] = { x: FEED_SIDE + p.x, y, w: p.w, h: NODE_H };
    nameBoxes[id] = { x: FEED_SIDE + p.x + NODE_GLYPH + NODE_GAP, y: y + (NODE_H - LINE_H) / 2, w: Math.max(0, p.w - NODE_GLYPH - NODE_GAP), h: LINE_H };
    marks[id] = { x: FEED_SIDE + p.x + NODE_GLYPH / 2, y: y + NODE_H / 2, rowBottom: y + NODE_H };
  }
  const routes = links.filter((k) => light[k.from] && marks[k.to]).map((k) => ({ ...k, points: linkRoute(light[k.from], marks[k.to], LINK_GUTTER) }));
  return { light, lineBoxes, nodeBoxes, nameBoxes, marks, routes };
}
