/**
 * The live graph at the top of Home (P-15): what it's for and what feeds it, at a glance.
 *
 * With whys (declared first, oldest mark first, then earned values), each why is a column with up
 * to three feeders. With no whys, your most active threads and the links between them. Everything
 * is picked by all-time links, so the picture never shrinks because time passed; warmth only tints.
 * Positions come from when things first appeared, never from counts, so nothing moves as you log:
 * a new node is appended. Nothing here is stored.
 */
import { valueThreads } from './emergence';
import { FlowIndex } from './graph';
import { declaredWhys } from './model';
import { Data, Id, Thread } from './types';

/** Why columns shown (more become "+N" beside the last). */
export const MAX_COLUMNS = 3;
/** Feeders shown under each why (more become "+N"). */
export const MAX_FEEDERS = 3;
/** With no whys: the most active threads shown. */
export const MAX_THREADS = 6;
/** The graph's fixed height, whatever it holds. */
export const GRAPH_H = 176;
/** Narrower content than this (e.g. 200 % zoom) shows only the summary and "Open graph". */
export const NARROW_W = 300;
/** Native text scaled this much or more: the same. */
export const BIG_TEXT = 1.5;

export interface OverviewNode {
  thread: Thread;
  /** Plain "to this" logs (no doing thread): drawn as a soft fill. */
  direct: number;
  /** Touched in the last two weeks (a tint, never a reason to hide). */
  recent: boolean;
}
export interface OverviewFeeder extends OverviewNode {
  /** All-time links from this thread into the why. */
  count: number;
}
export interface OverviewWhy extends OverviewNode {
  declared: boolean;
  /** In the order they first fed it (so a new one is appended). */
  feeders: OverviewFeeder[];
  moreFeeders: number;
}
export interface OverviewLink {
  from: Id;
  to: Id;
  count: number;
}
export type Overview =
  | { mode: 'whys'; whys: OverviewWhy[]; moreWhys: number; summary: string }
  | { mode: 'threads'; threads: OverviewNode[]; links: OverviewLink[]; summary: string };

const byName = (a: Thread, b: Thread) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
const byCreated = (a: Thread, b: Thread) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);

/**
 * Whys and their busiest feeders, or (with no whys) the most active threads and their links.
 * `earned` is `valueThreads(data)`, passed in when the caller already has it. No visible threads:
 * undefined (no graph at all, never an empty box).
 */
export function overview(data: Data, index: FlowIndex, earned: Set<Id> = valueThreads(data)): Overview | undefined {
  const visible = (id: Id) => !!data.threads[id] && !data.threads[id].hidden;
  const node = (thread: Thread): OverviewNode => ({
    thread,
    direct: index.direct.get(thread.id) ?? 0,
    recent: (index.recentSteps.get(thread.id) ?? 0) > 0,
  });
  const inflow = (id: Id) => {
    let n = 0;
    for (const [from, e] of index.in.get(id) ?? []) if (visible(from)) n += e.count;
    return n;
  };

  const declared = declaredWhys(data);
  const declaredIds = new Set(declared.map((t) => t.id));
  const surfaced = [...earned]
    .filter((id) => visible(id) && !declaredIds.has(id))
    .map((id) => ({ t: data.threads[id], n: inflow(id) }))
    .sort((a, b) => b.n - a.n || byName(a.t, b.t))
    .map(({ t }) => t);

  if (declared.length || surfaced.length) {
    const shownDeclared = declared.slice(0, MAX_COLUMNS);
    // Picked by inflow, then placed by age, so a busier one never swaps places with another.
    const shownEarned = surfaced.slice(0, MAX_COLUMNS - shownDeclared.length).sort(byCreated);
    const whys: OverviewWhy[] = [...shownDeclared, ...shownEarned].map((t) => {
      const all = [...(index.in.get(t.id) ?? [])]
        .filter(([from]) => visible(from))
        .map(([from, e]) => ({ ...node(data.threads[from]), count: e.count, first: e.first }))
        .sort((a, b) => b.count - a.count || byName(a.thread, b.thread));
      const feeders = all
        .slice(0, MAX_FEEDERS)
        .sort((a, b) => a.first.localeCompare(b.first) || a.thread.id.localeCompare(b.thread.id))
        .map(({ first: _first, ...f }) => f);
      return { ...node(t), declared: declaredIds.has(t.id), feeders, moreFeeders: all.length - feeders.length };
    });
    const moreWhys = declared.length + surfaced.length - whys.length;
    return { mode: 'whys', whys, moreWhys, summary: whysSummary(whys, moreWhys) };
  }

  const ranked = Object.values(data.threads)
    .filter((t) => !t.hidden)
    .sort((a, b) => (index.steps.get(b.id) ?? 0) - (index.steps.get(a.id) ?? 0) || byName(a, b));
  if (!ranked.length) return undefined;
  const threads = ranked.slice(0, MAX_THREADS).sort(byCreated).map(node);
  const shown = new Set(threads.map((n) => n.thread.id));
  const links: OverviewLink[] = [];
  for (const { thread } of threads)
    for (const [to, e] of index.out.get(thread.id) ?? []) if (shown.has(to)) links.push({ from: thread.id, to, count: e.count });
  const slot = new Map(threads.map((n, i) => [n.thread.id, i]));
  links.sort((a, b) => slot.get(a.from)! - slot.get(b.from)! || slot.get(a.to)! - slot.get(b.to)!);
  return { mode: 'threads', threads, links, summary: threadsSummary(threads, links, data) };
}

/** "a", "a and b", "a, b and c" (and "…, c and others"). */
function list(names: string[], others = false) {
  const all = others ? [...names, 'others'] : names;
  return all.length <= 1 ? (all[0] ?? '') : `${all.slice(0, -1).join(', ')} and ${all[all.length - 1]}`;
}

/** In names, never numbers (B-01 refinement 1). */
function whysSummary(whys: OverviewWhy[], moreWhys: number) {
  const item = (w: OverviewWhy) => {
    const fed = [...w.feeders].sort((a, b) => b.count - a.count || byName(a.thread, b.thread)).map((f) => f.thread.name);
    if (fed.length) return `${w.thread.name}, fed by ${list(fed, w.moreFeeders > 0)}`;
    return `${w.thread.name}, ${w.direct ? 'logged to directly' : 'nothing feeds it yet'}`;
  };
  const parts: string[] = [];
  const said = whys.filter((w) => w.declared).map(item);
  const surfaced = whys.filter((w) => !w.declared).map(item);
  if (moreWhys > 0) (surfaced.length ? surfaced : said).push('and more');
  if (said.length) parts.push(`What it’s for: ${said.join('; ')}.`);
  if (surfaced.length) parts.push(`Surfacing from what you do: ${surfaced.join('; ')}.`);
  return parts.join(' ');
}

function threadsSummary(threads: OverviewNode[], links: OverviewLink[], data: Data) {
  const linked = new Set(links.flatMap((l) => [l.from, l.to]));
  const parts = [
    ...links.map((l) => `${data.threads[l.from].name} → ${data.threads[l.to].name}`),
    ...threads.filter((n) => !linked.has(n.thread.id)).map((n) => n.thread.name),
  ];
  return `Lately: ${parts.join(', ')}.`;
}

// ─── Layout ────────────────────────────────────────────────────────────────

export interface LaidNode {
  /** Unique per drawn node: a thread feeding two whys is drawn under both. */
  key: string;
  id: Id;
  kind: 'why' | 'feeder' | 'thread';
  /** For a feeder: the why it hangs under. */
  under?: Id;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** 0 = no plain "to it" logs; 1–3 = a softly deeper fill (never a number). */
  fill: 0 | 1 | 2 | 3;
  recent: boolean;
}
export interface LaidLink {
  key: string;
  from: Id;
  to: Id;
  /** SVG path data. */
  path: string;
  width: number;
  /** Arrowhead polygon points (no whys: links can point either way). */
  arrow?: string;
}
export interface LaidMore {
  key: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface OverviewLayout {
  /** Too narrow or text too large: show the summary and "Open graph" instead. */
  summaryOnly: boolean;
  height: number;
  nodes: LaidNode[];
  links: LaidLink[];
  more: LaidMore[];
}

const GAP = 8;
const ROW = 44;
/** Feeders sit right of a spine that runs down the column's left edge. */
const INDENT = 14;
const SPINE = 6;
const MORE_W = 34;
/** No whys: two rows of three; links curve through the band between them. */
const TOP_Y = 8;
const BOTTOM_Y = GRAPH_H - 8 - ROW;

export const fillLevel = (direct: number): LaidNode['fill'] => (direct <= 0 ? 0 : direct === 1 ? 1 : direct < 5 ? 2 : 3);
/** Coarse on purpose: three widths, from all-time links (thickening is the only quantity shown). */
export const linkWidth = (count: number) => (count <= 1 ? 1.5 : count < 5 ? 2.5 : 3.5);

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Where everything goes, in a box `width` wide and GRAPH_H tall. Pure, and it only depends on the
 * overview's order, so counts never move anything. `focusId` is reserved for focusing a node
 * (P-26) and does nothing yet.
 */
export function overviewLayout(ov: Overview, width: number, fontScale = 1, focusId?: Id): OverviewLayout {
  void focusId;
  if (width < NARROW_W || fontScale >= BIG_TEXT) return { summaryOnly: true, height: 0, nodes: [], links: [], more: [] };
  const colW = (width - GAP * (MAX_COLUMNS - 1)) / MAX_COLUMNS;
  const colX = (i: number) => i * (colW + GAP);
  const nodes: LaidNode[] = [];
  const links: LaidLink[] = [];
  const more: LaidMore[] = [];
  const base = (n: OverviewNode) => ({ id: n.thread.id, name: n.thread.name, fill: fillLevel(n.direct), recent: n.recent });

  if (ov.mode === 'whys') {
    ov.whys.forEach((w, c) => {
      const x = colX(c);
      // More whys than columns: a "+N" right of the last one (the summary says "and more").
      const lastWhy = c === ov.whys.length - 1 && ov.moreWhys > 0;
      nodes.push({ ...base(w), key: w.thread.id, kind: 'why', x, y: 0, w: colW - (lastWhy ? MORE_W : 0), h: ROW });
      if (lastWhy) more.push({ key: 'more-whys', label: `+${ov.moreWhys}`, x: x + colW - MORE_W, y: 0, w: MORE_W, h: ROW });
      w.feeders.forEach((f, r) => {
        const y = ROW * (r + 1);
        const last = r === w.feeders.length - 1 && w.moreFeeders > 0;
        nodes.push({ ...base(f), key: `${w.thread.id}>${f.thread.id}`, kind: 'feeder', under: w.thread.id, x: x + INDENT, y, w: colW - INDENT - (last ? MORE_W : 0), h: ROW });
        links.push({
          key: `${f.thread.id}>${w.thread.id}`,
          from: f.thread.id,
          to: w.thread.id,
          path: `M${r1(x + INDENT)} ${r1(y + ROW / 2)}H${r1(x + SPINE)}V${ROW}`,
          width: linkWidth(f.count),
        });
        if (last) more.push({ key: `more>${w.thread.id}`, label: `+${w.moreFeeders}`, x: x + colW - MORE_W, y, w: MORE_W, h: ROW });
      });
    });
    return { summaryOnly: false, height: GRAPH_H, nodes, links, more };
  }

  const slot = new Map<Id, { x: number; row: 0 | 1; col: number }>();
  ov.threads.forEach((n, i) => {
    const row = i < MAX_COLUMNS ? 0 : 1;
    const col = i % MAX_COLUMNS;
    slot.set(n.thread.id, { x: colX(col) + colW / 2, row, col });
    nodes.push({ ...base(n), key: n.thread.id, kind: 'thread', x: colX(col), y: row ? BOTTOM_Y : TOP_Y, w: colW, h: ROW });
  });
  const anchorY = (row: 0 | 1) => (row ? BOTTOM_Y : TOP_Y + ROW);
  for (const l of ov.links) {
    const a = slot.get(l.from)!;
    const b = slot.get(l.to)!;
    const p0 = { x: a.x, y: anchorY(a.row) };
    const p1 = { x: b.x, y: anchorY(b.row) };
    let c: { x: number; y: number };
    if (a.row === b.row) {
      // Same row: bow into the band; the way back bows deeper, so A → B and B → A stay apart.
      const bow = 18 * Math.abs(a.col - b.col) + (a.col < b.col ? 0 : 14);
      c = { x: (p0.x + p1.x) / 2, y: p0.y + (a.row ? -bow : bow) };
    } else {
      // Across: bend to the left of the direction of travel, so the two directions stay apart.
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const len = Math.hypot(dx, dy) || 1;
      c = { x: (p0.x + p1.x) / 2 + (dy / len) * 14, y: (p0.y + p1.y) / 2 - (dx / len) * 14 };
    }
    // Arrowhead at the "to" end, along the curve's last tangent.
    const tx = p1.x - c.x;
    const ty = p1.y - c.y;
    const tl = Math.hypot(tx, ty) || 1;
    const ux = tx / tl;
    const uy = ty / tl;
    const back = { x: p1.x - ux * 7, y: p1.y - uy * 7 };
    const arrow = [p1, { x: back.x - uy * 4, y: back.y + ux * 4 }, { x: back.x + uy * 4, y: back.y - ux * 4 }].map((p) => `${r1(p.x)},${r1(p.y)}`).join(' ');
    links.push({
      key: `${l.from}>${l.to}`,
      from: l.from,
      to: l.to,
      path: `M${r1(p0.x)} ${r1(p0.y)}Q${r1(c.x)} ${r1(c.y)} ${r1(p1.x)} ${r1(p1.y)}`,
      width: linkWidth(l.count),
      arrow,
    });
  }
  return { summaryOnly: false, height: GRAPH_H, nodes, links, more };
}
