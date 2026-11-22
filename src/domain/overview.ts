/**
 * The live graph at the top of Home (P-15): what it's for, what feeds it, and your latest logs.
 *
 * With whys (declared first, oldest mark first, then earned ones in the order of Home's headers),
 * up to three whys and, in the rest of the six slots, threads beside them (their busiest feeders by
 * all-time links, then your most active other threads). With no whys, your most active threads
 * (all-time). Links between threads (doing → to) are lines; your most recent logs are small dots
 * with a line to each thread they name, so threads you log toward together are visibly connected.
 * The newest dot is marked, so every log visibly changes the picture. Nothing here is stored.
 *
 * Positions never come from counts: a thread keeps its slot while it's in the picture, and one that
 * enters takes a free slot (`overviewLayout` takes the previous slots). No numbers are drawn.
 */
import { groupByValue, valueThreads } from './emergence';
import { STEP_ROOM, subtree } from './focus';
import { emptyHeatIndex, indexHeat, nodeHeat } from './heat';
import { declaredWhys } from './model';
import { homeThreads } from './selectors';
import { Activity, Data, Id, Thread } from './types';

/** Whys shown at most. */
export const MAX_COLUMNS = 3;
/** Threads in the picture: whys and the threads beside them, or (with no whys) the most active. */
export const MAX_THREADS = 6;
/** Recent logs shown as dots (fewer when the width has fewer free spots). */
export const MAX_DOTS = 8;
/** Two rows of threads with two rows of dots between them, 44 px each. */
export const GRAPH_H = 176;
/** A single thread: its row and one row of dots (keeps the first card's crumb clear of the toast). */
export const COMPACT_H = 88;
/** Narrower content than this (three columns don't fit, e.g. 200 % zoom): summary and "Open graph". */
export const NARROW_W = 240;
/** Native text scaled this much or more: the same. */
export const BIG_TEXT = 1.5;

export interface OverviewNode {
  thread: Thread;
}
export interface OverviewFeeder extends OverviewNode {
  /** All-time links from this thread into the why. */
  count: number;
}
export interface OverviewWhy extends OverviewNode {
  declared: boolean;
  /** Plain "to this" logs (no doing thread). Only the summary uses it ("logged to directly"). */
  direct: number;
  /** Threads in the picture that link into it, most links first. */
  feeders: OverviewFeeder[];
  /** Threads linking into it that aren't in the picture. */
  moreFeeders: number;
}
export interface OverviewLink {
  from: Id;
  to: Id;
  count: number;
}
export interface OverviewDot {
  /** The activity. */
  id: Id;
  /** The threads in the picture it names: its doing thread first, then its "to"s. */
  threads: Id[];
  /** The first of `threads` is its doing thread. */
  doing: boolean;
}
interface Shared {
  /** Doing → to links between threads in the picture (all-time). */
  links: OverviewLink[];
  /** The most recent logs that name a thread in the picture, newest first. */
  dots: OverviewDot[];
  /** Visible threads left out of the picture ("and more →"). */
  more: boolean;
  summary: string;
  /** P-48: each thread in the picture's heat (`nodeHeat`), 0–1. Empty with no wanders. */
  heat: Record<Id, number>;
}
export type Overview =
  | ({ mode: 'whys'; whys: OverviewWhy[]; moreWhys: number; /** Beside the whys, feeding none of them. */ others: OverviewNode[] } & Shared)
  | ({ mode: 'threads'; threads: OverviewNode[] } & Shared)
  /** No wanders yet (P-34): your recent logs on their own, as dots naming nothing. */
  | ({ mode: 'logs' } & Shared);

/** Ties go by name. One collator, not localeCompare per call: big histories sort hundreds of feeders. */
const collator = new Intl.Collator();
const byName = (a: Thread, b: Thread) => collator.compare(a.name, b.name) || collator.compare(a.id, b.id);
const byCreated = (a: Thread, b: Thread) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
/** Newest first. Plain string order (ISO times), not localeCompare: this runs for every activity. */
const cmp = (x: string, y: string) => (x < y ? -1 : x > y ? 1 : 0);
const newer = (a: Activity, b: Activity) => cmp(b.createdAt, a.createdAt) || cmp(b.id, a.id);

/** The threads an activity names: its doing thread, then its "to"s (each once). */
function named(a: Activity): Id[] {
  const ids = a.doingId ? [a.doingId] : [];
  for (const to of a.toIds) if (!ids.includes(to)) ids.push(to);
  return ids;
}

/** Earned whys in the order of Home's headers (the same rule, so the graph and the headers agree). */
export function headerWhys(data: Data, now = new Date(), values = valueThreads(data, now)): Id[] {
  const ids = homeThreads(data, now).current.map((c) => c.thread.id);
  return groupByValue(data, ids, now, values).groups.map((g) => g.value.id);
}

/**
 * What the graph shows. `surfacing` is the earned whys in header order (Home passes its own, so
 * nothing is computed twice). No visible threads: undefined (no graph, never an empty box).
 * `heat` (P-48) is as of `now`; with `shading` off every node is neutral.
 */
export function overview(data: Data, surfacing: Iterable<Id> = headerWhys(data), opts: { now?: Date; shading?: boolean } = {}): Overview | undefined {
  const visible = (id: Id) => !!data.threads[id] && !data.threads[id].hidden;
  const all = Object.values(data.threads).filter((t) => !t.hidden);
  if (!all.length) return undefined;
  const acts = Object.values(data.activities);

  const declared = declaredWhys(data);
  const declaredIds = new Set(declared.map((t) => t.id));
  const whyList: Thread[] = [...declared];
  for (const id of surfacing) if (visible(id) && !whyList.some((t) => t.id === id)) whyList.push(data.threads[id]);
  const shownWhys = whyList.slice(0, MAX_COLUMNS);
  const whyIds = new Set(shownWhys.map((t) => t.id));
  // A why that doesn't fit is never drawn as a plain thread.
  const eligible = (t: Thread) => !whyList.includes(t);

  // One pass (a big history has thousands of logs): all-time activity per thread, the newest log
  // that names a visible thread, and links and plain "to" logs into the shown whys.
  const steps = new Map<Id, number>();
  const into = new Map<Id, Map<Id, number>>();
  const direct = new Map<Id, number>();
  let newest: Activity | undefined;
  const seen = new Set(all.map((t) => t.id));
  // P-48: heat is worked out from this same pass (not a pass of its own: Home redraws after every log).
  const heatIndex = opts.shading === false ? undefined : emptyHeatIndex();
  for (const a of acts) {
    if (heatIndex) indexHeat(heatIndex, a);
    let any = false;
    if (a.doingId) {
      steps.set(a.doingId, (steps.get(a.doingId) ?? 0) + 1);
      any = seen.has(a.doingId);
    }
    for (const to of a.toIds) {
      if (to === a.doingId) continue;
      steps.set(to, (steps.get(to) ?? 0) + 1);
      any ||= seen.has(to);
      if (!whyIds.has(to)) continue;
      if (!a.doingId) direct.set(to, (direct.get(to) ?? 0) + 1);
      else {
        const m = into.get(to) ?? into.set(to, new Map()).get(to)!;
        m.set(a.doingId, (m.get(a.doingId) ?? 0) + 1);
      }
    }
    if (any && (!newest || a.createdAt > newest.createdAt || (a.createdAt === newest.createdAt && a.id > newest.id))) newest = a;
  }
  const byActivity = (a: Thread, b: Thread) => (steps.get(b.id) ?? 0) - (steps.get(a.id) ?? 0) || byName(a, b);

  // The threads beside the whys (or, with none, all of the picture), best first: whatever slots the
  // whys leave, so declaring one never makes the picture emptier.
  const room = MAX_THREADS - whyIds.size;
  let picked: Thread[];
  if (whyIds.size) {
    // Each why's busiest feeder first, then each one's next, so every why that has one shows one.
    const queues = shownWhys.map((w) =>
      [...(into.get(w.id) ?? [])]
        .filter(([from]) => visible(from) && eligible(data.threads[from]))
        .map(([from, n]) => ({ t: data.threads[from], n }))
        .sort((a, b) => b.n - a.n || byName(a.t, b.t))
        .map(({ t }) => t),
    );
    picked = [];
    for (let grew = true; grew && picked.length < room; ) {
      grew = false;
      for (const q of queues) {
        while (q.length && picked.includes(q[0])) q.shift();
        if (q.length && picked.length < room) {
          picked.push(q.shift()!);
          grew = true;
        }
      }
    }
    // Then your most active other threads, so nothing you just said it's for empties the picture.
    for (const t of all.filter((x) => eligible(x) && !picked.includes(x)).sort(byActivity)) {
      if (picked.length >= room) break;
      picked.push(t);
    }
  } else {
    picked = all.filter(eligible).sort(byActivity).slice(0, room);
  }
  // Every log shows: if the newest one names nothing in the picture, its threads come in (in place
  // of the last picked), so its dot and lines appear.
  if (newest) {
    const inPicture = (id: Id) => whyIds.has(id) || picked.some((t) => t.id === id);
    const outside = named(newest).filter(visible).filter((id) => !inPicture(id));
    if (outside.length === named(newest).filter(visible).length && outside.every((id) => eligible(data.threads[id]))) {
      const incoming = outside.slice(0, room).map((id) => data.threads[id]);
      picked = [...picked.filter((t) => !incoming.includes(t)).slice(0, room - incoming.length), ...incoming];
    }
  }

  const shown = new Set([...whyIds, ...picked.map((t) => t.id)]);
  // Links between threads in the picture, and the most recent logs that name one of them.
  const linkCount = new Map<Id, Map<Id, number>>();
  const recent: Activity[] = [];
  for (const a of acts) {
    let any = !!a.doingId && shown.has(a.doingId);
    for (const to of a.toIds) {
      if (!shown.has(to)) continue;
      any = true;
      if (!a.doingId || to === a.doingId || !shown.has(a.doingId)) continue;
      const m = linkCount.get(a.doingId) ?? linkCount.set(a.doingId, new Map()).get(a.doingId)!;
      m.set(to, (m.get(to) ?? 0) + 1);
    }
    if (!any) continue;
    if (recent.length === MAX_DOTS && newer(a, recent[MAX_DOTS - 1]) > 0) continue;
    recent.push(a);
    recent.sort(newer);
    if (recent.length > MAX_DOTS) recent.pop();
  }
  const links: OverviewLink[] = [];
  for (const [from, m] of linkCount) for (const [to, count] of m) links.push({ from, to, count });
  links.sort((a, b) => byName(data.threads[a.from], data.threads[b.from]) || byName(data.threads[a.to], data.threads[b.to]));
  const dots: OverviewDot[] = recent.map((a) => ({ id: a.id, threads: named(a).filter((id) => shown.has(id)), doing: !!a.doingId && shown.has(a.doingId) }));
  const more = all.length > shown.size;
  const heat = nodeHeat(data, shown, opts, heatIndex);

  if (whyIds.size) {
    const whys: OverviewWhy[] = shownWhys.map((t) => {
      const feeders: OverviewFeeder[] = links
        .filter((l) => l.to === t.id)
        .map((l) => ({ thread: data.threads[l.from], count: l.count }))
        .sort((a, b) => b.count - a.count || byName(a.thread, b.thread));
      const allFeeders = [...(into.get(t.id) ?? [])].filter(([from]) => visible(from)).length;
      return { thread: t, declared: declaredIds.has(t.id), direct: direct.get(t.id) ?? 0, feeders, moreFeeders: allFeeders - feeders.length };
    });
    const feeding = new Set(links.filter((l) => whyIds.has(l.to)).map((l) => l.from));
    const others = picked.filter((t) => !feeding.has(t.id)).map((thread) => ({ thread }));
    const moreWhys = whyList.length - whys.length;
    return { mode: 'whys', whys, moreWhys, others, links, dots, more, heat, summary: whysSummary(whys, others, dots, more, data) };
  }
  const threads = picked.map((thread) => ({ thread }));
  return { mode: 'threads', threads, links, dots, more, heat, summary: threadsSummary(threads, links, dots, more, data) };
}

/**
 * With no visible wanders (P-34, no threshold): your most recent logs on their own, newest first, as
 * dots (the newest marked), and a summary naming them in words. Nothing logged: undefined.
 */
export function looseOverview(data: Data): Overview | undefined {
  const recent = Object.values(data.activities).sort(newer).slice(0, MAX_DOTS);
  if (!recent.length) return undefined;
  const dots: OverviewDot[] = recent.map((a) => ({ id: a.id, threads: [], doing: false }));
  const texts = [...new Set(recent.map((a) => a.text.trim().replace(/\s+/g, ' ')).filter(Boolean))];
  return { mode: 'logs', links: [], dots, more: false, heat: {}, summary: texts.length ? `Lately: ${texts.join('; ')}.` : '' };
}

/** Longest staged step drawn under its node (P-34); longer ones end in "…". */
export const STEP_CHARS = 40;

/** A wander's staged next step as its quiet line under the node, or undefined when it has none. */
export function stagedStep(t: Thread): string | undefined {
  const next = t.next?.trim().replace(/\s+/g, ' ');
  if (!next) return undefined;
  return next.length > STEP_CHARS ? `${next.slice(0, STEP_CHARS - 1).trimEnd()}…` : next;
}

/** One entry of the list after the summary (the way through without pointing, P-34). */
export interface PictureItem {
  id: Id;
  name: string;
  why: boolean;
}

/** The whys and wanders in the picture, whys first, at most MAX_THREADS (six). */
export function pictureItems(ov: Overview): PictureItem[] {
  const threads = ov.mode === 'whys' ? [...ov.whys.map((w) => w.thread), ...feedersAndOthers(ov)] : ov.mode === 'threads' ? ov.threads.map((n) => n.thread) : [];
  const whyIds = new Set(ov.mode === 'whys' ? ov.whys.map((w) => w.thread.id) : []);
  return threads.slice(0, MAX_THREADS).map((t) => ({ id: t.id, name: t.name, why: whyIds.has(t.id) }));
}

/** "a", "a and b", "a, b and c" (and "…, c and others"). */
function list(names: string[], others = false) {
  const all = others ? [...names, 'others'] : names;
  return all.length <= 1 ? (all[0] ?? '') : `${all.slice(0, -1).join(', ')} and ${all[all.length - 1]}`;
}

/** "Lately: knit; draw with make apparel; sew toward make apparel." — each different thing the recent logs name. */
function latelySentence(dots: OverviewDot[], data: Data) {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const d of dots) {
    const names = d.threads.map((id) => data.threads[id].name);
    const part = names.length === 1 ? names[0] : `${names[0]} ${d.doing ? 'toward' : 'with'} ${list(names.slice(1))}`;
    const key = d.doing ? part : [...d.threads].sort().join('\n');
    if (seen.has(key)) continue;
    seen.add(key);
    parts.push(part);
  }
  return parts.length ? `Lately: ${parts.join('; ')}.` : '';
}

/** In names, never numbers (B-01 refinement 1); "toward", never an arrow, for screen readers. */
function whysSummary(whys: OverviewWhy[], others: OverviewNode[], dots: OverviewDot[], more: boolean, data: Data) {
  const item = (w: OverviewWhy) => {
    const fed = w.feeders.map((f) => f.thread.name);
    if (fed.length) return `${w.thread.name}, fed by ${list(fed, w.moreFeeders > 0)}`;
    return `${w.thread.name}, ${w.direct ? 'logged to directly' : 'nothing feeds it yet'}`;
  };
  const said = whys.filter((w) => w.declared).map(item);
  const surfaced = whys.filter((w) => !w.declared).map(item);
  const parts: string[] = [];
  if (said.length) parts.push(`What it’s for: ${said.join('; ')}.`);
  if (surfaced.length) parts.push(`Surfacing from what you do: ${surfaced.join('; ')}.`);
  if (others.length) parts.push(`Also: ${list(others.map((o) => o.thread.name))}.`);
  parts.push(latelySentence(dots, data));
  if (more) parts.push('And more.');
  return parts.filter(Boolean).join(' ');
}

function threadsSummary(threads: OverviewNode[], links: OverviewLink[], dots: OverviewDot[], more: boolean, data: Data) {
  const linked = new Set(links.flatMap((l) => [l.from, l.to]));
  const parts = [
    ...links.map((l) => `${data.threads[l.from].name} toward ${data.threads[l.to].name}`),
    list(threads.filter((n) => !linked.has(n.thread.id)).map((n) => n.thread.name)),
  ].filter(Boolean);
  return [`Your wanders: ${parts.join('; ')}.`, latelySentence(dots, data), more ? 'And more.' : ''].filter(Boolean).join(' ');
}

// ─── Layout ────────────────────────────────────────────────────────────────

/** Where things were last time, so nothing that stays moves. Thread slots 0–2 are the top row, 3–5 the bottom. */
export interface Slots {
  threads: Record<Id, number>;
  dots: Record<Id, number>;
}
export interface LaidNode {
  key: string;
  id: Id;
  /** Roomy layout only: its staged next step, as one quiet line under it (`stagedStep`). */
  step?: string;
  /** feeder = beside the whys and linking into one of them. */
  kind: 'why' | 'feeder' | 'thread';
  /** For a feeder: the whys it links into. */
  under?: Id[];
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Home with wanders (P-48): the node drawn as a circle at the top of its target. */
  circle?: LaidCircle;
}
export interface LaidCircle {
  /** Its centre, in the picture's coordinates. */
  cx: number;
  cy: number;
  r: number;
  /** 0–1 (`nodeHeat`, to the hundredth): the fill. */
  heat: number;
  /** A declared why: a second, thin ring. */
  declared: boolean;
  /** The label fits inside (in a text box `labelW` wide, one or two lines), or goes under the circle. */
  inside: boolean;
  labelW: number;
}
export interface LaidLink {
  key: string;
  from: Id;
  to: Id;
  /** SVG path data: the curve (on Home, its centre line). */
  path: string;
  /** The same for every link: never from a count (P-48). On Home, the branch's width at the parent end. */
  width: number;
  /** Arrowhead polygon points, at the "to" end ('' on Home, where the branch's taper shows the way). */
  arrow: string;
  /** Home with wanders (P-48): the tapered branch, a filled polygon coloured from the child's heat at (x1, y1) to the parent's at (x2, y2). */
  branch?: { points: string; x1: number; y1: number; x2: number; y2: number; fromHeat: number; toHeat: number };
}
export interface LaidDot {
  key: string;
  /** The activity. */
  id: Id;
  threads: Id[];
  /** Your latest log in the picture: drawn larger, in the accent colour, until the next log. */
  newest: boolean;
  /** The pointer target (44 × 44); the dot is drawn at its centre. */
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface LaidDotLine {
  key: string;
  dot: Id;
  thread: Id;
  /** A line of the newest dot: a little stronger. */
  newest: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
export interface LaidBox {
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
  dots: LaidDot[];
  dotLines: LaidDotLine[];
  /** Roomy layout only: where a node's staged-step line goes (under its chip), `STEP_H` tall. */
  stepH: number;
  /** "and more →" (opens Explore). */
  more?: LaidBox;
  /** Pass back as `prev` next time. */
  slots: Slots;
}

const GAP = 8;
const ROW = 44;
/** The visible chip inside its 44 px row. */
const CHIP_INSET = 4;
const SLOTS = MAX_THREADS;
/** With no whys, threads fill the slots top-left, bottom-middle, top-right…, so the dots between them use the whole box. */
const ZIGZAG = [0, 4, 2, 3, 1, 5];
const MORE_SLOTS = 2;

/** Home's circles (P-48): the top row (the whys) biggest, the row beneath one size smaller. */
export const TOP_R = 34;
export const BOTTOM_R = 24;
/** Room above a top-row circle for its rings (a why's second ring, the selection). */
const RING_PAD = 8;
/** Labels: 12 px text in 14 px lines, at most two, inside the circle or (when they don't fit) under it. */
export const LABEL_FONT = 12;
export const LABEL_LINE = 14;
const LABEL_H = 2 + 2 * LABEL_LINE;
/** Roomy (Home, P-34): a top-row node's target with its label inside (taller than 44 px); a staged-step line goes under each node. */
export const ROOMY_NODE = RING_PAD + 2 * TOP_R;
export const STEP_H = 20;
const ROOMY_GAP = 12;
/** Where "and more →" goes on Home: under the top row, its label and its step line. */
const MORE_Y = ROOMY_NODE + LABEL_H + STEP_H;
/** Home's bottom row of circles. */
const BOTTOM_Y = MORE_Y + ROW;
/** Roomy, with wanders: the top row, a 44 px band, the bottom row, each row with its labels and step line. */
export const ROOMY_H = BOTTOM_Y + 2 * BOTTOM_R + LABEL_H + STEP_H;
/** Roomy, no wanders: just the two rows of dots. */
export const LOGS_H = 2 * ROW + ROOMY_GAP;
/** Compact layout: every link the same width (P-48: no width comes from a count). */
const LINK_W = 1.5;

const r1 = (n: number) => Math.round(n * 10) / 10;

/** A conservative guess at a label's width (bold-ish sans): wide enough that a label said to fit, fits. */
export function textWidth(text: string, size: number): number {
  let em = 0;
  for (const ch of text) {
    if (ch === ' ') em += 0.3;
    else if (/[ijlftrI.,:;'’!|()[\]]/.test(ch)) em += 0.38;
    else if (/[mwMW@%&]/.test(ch)) em += 1.05;
    else if (/[A-Z]/.test(ch)) em += 0.75;
    else if (/[a-z0-9-]/.test(ch)) em += 0.62;
    else em += ch.codePointAt(0)! < 0x2e80 ? 0.75 : 1.25;
  }
  return em * size;
}

/**
 * Whether `name` fits inside a circle of radius `r` (P-48): on one line, or on two (wrapped at
 * spaces), within the circle's chord at the line's outer edge. The text box's width, or undefined
 * when it doesn't fit (the label goes under the circle).
 */
export function insideWidth(name: string, r: number, fontScale = 1): number | undefined {
  const size = LABEL_FONT * fontScale;
  const line = LABEL_LINE * fontScale;
  // Inside the outline (1 px) with a little air.
  const inner = r - 3;
  const chord = (edge: number) => (edge >= inner ? 0 : 2 * Math.sqrt(inner * inner - edge * edge));
  const one = chord(line / 2);
  if (textWidth(name, size) <= one) return Math.floor(one);
  const two = chord(line);
  const words = name.trim().split(/\s+/);
  const lines: string[] = [];
  for (const w of words) {
    const last = lines.length ? `${lines[lines.length - 1]} ${w}` : w;
    if (lines.length && textWidth(last, size) <= two) lines[lines.length - 1] = last;
    else lines.push(w);
  }
  return lines.length <= 2 && lines.every((l) => textWidth(l, size) <= two) ? Math.floor(two) : undefined;
}

/**
 * Where everything goes, `width` wide. Pure. Given `prev` (the last layout's `slots`), every thread
 * and dot still shown keeps its slot; one that enters takes a free slot (a why prefers the top row,
 * a thread beside the whys the bottom one, and with no whys they alternate rows); a dot takes the
 * free spot nearest the threads it names. The newest dot is marked: once the dots are full, a new
 * log to the same thread can land in the spot the oldest one just left, and the mark (which moves
 * from the dot before it, still shown elsewhere) is what makes that log visible.
 * The picture's centre is never a target, so a screen reader activating it opens nothing.
 * `focusId` is reserved for focusing a node (P-26) and does nothing yet.
 * `roomy` (Home, P-34): bigger targets and more space, always full height (it never shrinks), each
 * node's staged step as a line under it, and with no wanders just the dots (same caps either way).
 */
export function overviewLayout(ov: Overview, width: number, opts: { fontScale?: number; prev?: Slots; focusId?: Id; roomy?: boolean } = {}): OverviewLayout {
  const { fontScale = 1, prev, roomy = false } = opts;
  if (width < NARROW_W || fontScale >= BIG_TEXT) return { summaryOnly: true, height: 0, nodes: [], links: [], dots: [], dotLines: [], stepH: 0, slots: prev ?? { threads: {}, dots: {} } };

  // Threads: whys first, then the rest by when they were made (first appearance).
  const whyIds = new Set(ov.mode === 'whys' ? ov.whys.map((w) => w.thread.id) : []);
  const members = ov.mode === 'whys' ? [...ov.whys.map((w) => w.thread), ...[...feedersAndOthers(ov)].sort(byCreated)] : ov.mode === 'threads' ? ov.threads.map((n) => n.thread).sort(byCreated) : [];
  const slot: Record<Id, number> = {};
  const taken = new Set<number>();
  for (const t of members) {
    const p = prev?.threads[t.id];
    if (p !== undefined && p >= 0 && p < SLOTS && !taken.has(p)) {
      slot[t.id] = p;
      taken.add(p);
    }
  }
  for (const t of members) {
    if (slot[t.id] !== undefined) continue;
    const order = ov.mode === 'threads' ? ZIGZAG : whyIds.has(t.id) ? [0, 1, 2, 3, 4, 5] : [3, 4, 5, 0, 1, 2];
    const p = order.find((i) => !taken.has(i))!;
    slot[t.id] = p;
    taken.add(p);
  }
  const compact = !roomy && members.length === 1 && slot[members[0].id] < MAX_COLUMNS;
  const logsOnly = roomy && !members.length;
  // Home with wanders (P-48): circles and branches, no dots.
  if (roomy && !logsOnly) return circleLayout(ov, width, members, slot, fontScale);
  // Vertical geometry: node rows (each with its step line when roomy) and the two rows of dots.
  const nodeH = roomy ? ROOMY_NODE : ROW;
  const stepH = roomy ? STEP_H : 0;
  const rowGap = roomy ? ROOMY_GAP : 0;
  const dotTop = logsOnly ? 0 : nodeH + stepH + rowGap;
  const dotY = (r: number) => dotTop + r * (ROW + rowGap);
  const bottomY = dotY(2);
  const height = logsOnly ? LOGS_H : roomy ? ROOMY_H : compact ? COMPACT_H : GRAPH_H;
  const steps = new Map<Id, string>();
  if (roomy) for (const t of members) if (stagedStep(t)) steps.set(t.id, stagedStep(t)!);

  const colW = (width - GAP * (MAX_COLUMNS - 1)) / MAX_COLUMNS;
  const box = (i: number) => ({ x: (i % MAX_COLUMNS) * (colW + GAP), y: i < MAX_COLUMNS ? 0 : bottomY });
  /** Where lines meet a node: the middle of its chip's edge facing the dots (below a top node's step line). */
  const anchor = (id: Id) => {
    const b = box(slot[id]);
    const top = slot[id] < MAX_COLUMNS;
    return { x: b.x + colW / 2, y: top ? (steps.has(id) ? b.y + nodeH + stepH : b.y + nodeH - CHIP_INSET) : b.y + CHIP_INSET, top };
  };

  const feeds = new Map<Id, Id[]>();
  if (ov.mode === 'whys') for (const l of ov.links) if (whyIds.has(l.to) && !whyIds.has(l.from)) feeds.set(l.from, [...(feeds.get(l.from) ?? []), l.to]);
  const nodes: LaidNode[] = members
    .map((t) => {
      const b = box(slot[t.id]);
      const kind: LaidNode['kind'] = whyIds.has(t.id) ? 'why' : feeds.has(t.id) ? 'feeder' : 'thread';
      return { key: t.id, id: t.id, kind, ...(feeds.has(t.id) && { under: feeds.get(t.id) }), ...(steps.has(t.id) && { step: steps.get(t.id) }), name: t.name, x: b.x, y: b.y, w: colW, h: nodeH };
    })
    .sort((a, b) => slot[a.id] - slot[b.id]);

  const links = ov.links.map((l) => linkPath(l, anchor(l.from), anchor(l.to)));

  // Dots: one or two rows of 44 px spots between the thread rows, never at the centre, and the
  // bottom row's right end kept for "and more →".
  const perRow = Math.max(1, Math.floor(width / ROW));
  const pitch = width / perRow;
  const mid = width / 2;
  const centre = (c: number) => c * pitch < mid + 0.5 && (c + 1) * pitch > mid - 0.5;
  const rows = compact ? 1 : 2;
  const more = ov.more && !compact;
  const spots = new Map<number, { x: number; y: number }>();
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < perRow; c++) {
      if (centre(c) || (more && r === 1 && c >= perRow - MORE_SLOTS)) continue;
      spots.set(r * perRow + c, { x: c * pitch + (pitch - ROW) / 2, y: roomy ? dotY(r) : ROW * (r + 1) });
    }
  const shownDots = ov.dots.slice(0, Math.min(MAX_DOTS, spots.size));
  const dotSlot: Record<Id, number> = {};
  const used = new Set<number>();
  for (const d of shownDots) {
    const p = prev?.dots[d.id];
    if (p !== undefined && spots.has(p) && !used.has(p)) {
      dotSlot[d.id] = p;
      used.add(p);
    }
  }
  for (const d of shownDots) {
    if (dotSlot[d.id] !== undefined) continue;
    // Naming nothing (no wanders yet): the first free spot in reading order.
    if (!d.threads.length) {
      const free = [...spots.keys()].find((i) => !used.has(i))!;
      dotSlot[d.id] = free;
      used.add(free);
      continue;
    }
    const pts = d.threads.map(anchor);
    const want = { x: pts.reduce((n, p) => n + p.x, 0) / pts.length, y: pts.reduce((n, p) => n + p.y, 0) / pts.length };
    let best = -1;
    let bestD = Infinity;
    for (const [i, s] of spots) {
      if (used.has(i)) continue;
      const dd = (s.x + ROW / 2 - want.x) ** 2 + (s.y + ROW / 2 - want.y) ** 2;
      if (dd < bestD - 0.01) {
        best = i;
        bestD = dd;
      }
    }
    dotSlot[d.id] = best;
    used.add(best);
  }
  const dots: LaidDot[] = shownDots.map((d, i) => ({ key: d.id, id: d.id, threads: d.threads, newest: i === 0, ...spots.get(dotSlot[d.id])!, w: ROW, h: ROW }));
  const dotLines: LaidDotLine[] = dots.flatMap((d) =>
    d.threads.map((t) => {
      const a = anchor(t);
      return { key: `${d.id}>${t}`, dot: d.id, thread: t, newest: d.newest, x1: r1(d.x + ROW / 2), y1: r1(d.y + ROW / 2), x2: r1(a.x), y2: r1(a.y) };
    }),
  );
  return {
    summaryOnly: false,
    height,
    nodes,
    links,
    dots,
    dotLines,
    stepH,
    ...(more && { more: { x: width - MORE_SLOTS * pitch, y: roomy ? dotY(1) : ROW * 2, w: MORE_SLOTS * pitch, h: ROW } }),
    slots: { threads: slot, dots: dotSlot },
  };
}

function feedersAndOthers(ov: Extract<Overview, { mode: 'whys' }>): Thread[] {
  const whyIds = new Set(ov.whys.map((w) => w.thread.id));
  const seen = new Map<Id, Thread>();
  for (const w of ov.whys) for (const f of w.feeders) if (!whyIds.has(f.thread.id)) seen.set(f.thread.id, f.thread);
  for (const o of ov.others) seen.set(o.thread.id, o.thread);
  return [...seen.values()];
}

/** A curve from one node to another, bowing into the band between the rows, with an arrowhead. */
function linkPath(l: OverviewLink, p0: { x: number; y: number; top: boolean }, p1: { x: number; y: number; top: boolean }): LaidLink {
  let c: { x: number; y: number };
  if (p0.top === p1.top) {
    // Same row: bow into the band; the way back bows deeper, so A → B and B → A stay apart.
    const bow = 0.15 * Math.abs(p1.x - p0.x) + (p0.x < p1.x ? 0 : 14);
    c = { x: (p0.x + p1.x) / 2, y: p0.y + (p0.top ? bow : -bow) };
  } else {
    // Across: bend to the left of the direction of travel, so the two directions stay apart.
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy) || 1;
    c = { x: (p0.x + p1.x) / 2 + (dy / len) * 14, y: (p0.y + p1.y) / 2 - (dx / len) * 14 };
  }
  const tx = p1.x - c.x;
  const ty = p1.y - c.y;
  const tl = Math.hypot(tx, ty) || 1;
  const ux = tx / tl;
  const uy = ty / tl;
  const back = { x: p1.x - ux * 7, y: p1.y - uy * 7 };
  const arrow = [p1, { x: back.x - uy * 4, y: back.y + ux * 4 }, { x: back.x + uy * 4, y: back.y - ux * 4 }].map((p) => `${r1(p.x)},${r1(p.y)}`).join(' ');
  return {
    key: `${l.from}>${l.to}`,
    from: l.from,
    to: l.to,
    path: `M${r1(p0.x)} ${r1(p0.y)}Q${r1(c.x)} ${r1(c.y)} ${r1(p1.x)} ${r1(p1.y)}`,
    width: LINK_W,
    arrow,
  };
}

/**
 * Home with wanders (P-48): each node a circle at the top of its target, keeping its slot (the same
 * columns and rows as before). The top row (the whys) is biggest, the row beneath one size smaller.
 * A label sits inside when it fits on two lines, else under the circle. Links are tapered branches;
 * there are no dots (they stay for logs on their own).
 */
function circleLayout(ov: Overview, width: number, members: Thread[], slot: Record<Id, number>, fontScale: number): OverviewLayout {
  const whyIds = new Set(ov.mode === 'whys' ? ov.whys.map((w) => w.thread.id) : []);
  const declared = new Set(ov.mode === 'whys' ? ov.whys.filter((w) => w.declared).map((w) => w.thread.id) : []);
  const feeds = new Map<Id, Id[]>();
  if (ov.mode === 'whys') for (const l of ov.links) if (whyIds.has(l.to) && !whyIds.has(l.from)) feeds.set(l.from, [...(feeds.get(l.from) ?? []), l.to]);
  const colW = (width - GAP * (MAX_COLUMNS - 1)) / MAX_COLUMNS;
  const nodes: LaidNode[] = members
    .map((t) => {
      const i = slot[t.id];
      const top = i < MAX_COLUMNS;
      const r = top ? TOP_R : BOTTOM_R;
      const x = (i % MAX_COLUMNS) * (colW + GAP);
      const y = top ? 0 : BOTTOM_Y;
      const pad = top ? RING_PAD : 0;
      const fit = insideWidth(t.name, r, fontScale);
      const step = stagedStep(t);
      const kind: LaidNode['kind'] = whyIds.has(t.id) ? 'why' : feeds.has(t.id) ? 'feeder' : 'thread';
      // Heat to the hundredth: a log a moment later doesn't redraw every circle and branch.
      const circle: LaidCircle = { cx: r1(x + colW / 2), cy: y + pad + r, r, heat: Math.round((ov.heat[t.id] ?? 0) * 100) / 100, declared: declared.has(t.id), inside: fit !== undefined, labelW: fit ?? Math.floor(colW) };
      return { key: t.id, id: t.id, kind, ...(feeds.has(t.id) && { under: feeds.get(t.id) }), ...(step && { step }), name: t.name, x, y, w: colW, h: pad + 2 * r + (fit === undefined ? LABEL_H : 0), circle };
    })
    .sort((a, b) => slot[a.id] - slot[b.id]);
  const perRow = Math.max(1, Math.floor(width / ROW));
  const pitch = width / perRow;
  return {
    summaryOnly: false,
    height: ROOMY_H,
    nodes,
    links: branches(ov.links, nodes),
    dots: [],
    dotLines: [],
    stepH: STEP_H,
    ...(ov.more && { more: { x: width - MORE_SLOTS * pitch, y: MORE_Y, w: MORE_SLOTS * pitch, h: ROW } }),
    slots: { threads: slot, dots: {} },
  };
}

/** P-50, narrowed: the scope's node, then each row down (by how many steps it is from it); deeper rows use the last. */
export const SCOPE_R = [44, 30, 22];
/** Between a row's targets and the next row's, room for the branches to curve. */
const SCOPE_GAP = 28;

/**
 * Home narrowed to a node (P-50): only that node and everything feeding it, the node on top and
 * centred as the biggest circle, the rest in rows by depth (the fewest links from it), each row
 * smaller, left to right as at All. Heat, roles and steps are All's (`all`), never re-worked; the
 * branches are drawn the same way. Never shorter than All, and with room under the lowest row for
 * the step mark. All's slots are kept, so going back up moves nothing. A node not in the picture:
 * All as it is.
 */
export function scopeLayout(ov: Overview, all: OverviewLayout, rootId: Id, width: number, fontScale = 1): OverviewLayout {
  const byId = new Map(all.nodes.map((n) => [n.id, n]));
  if (!byId.has(rootId) || all.summaryOnly) return all;
  const links = ov.links.filter((l) => byId.has(l.from) && byId.has(l.to));
  const inside = subtree({ nodes: all.nodes.map((n) => ({ id: n.id, name: n.name, x: 0, y: 0, why: false })), links }, rootId);
  const depth = new Map<Id, number>([[rootId, 0]]);
  for (let frontier = [rootId]; frontier.length; ) {
    const next: Id[] = [];
    for (const p of frontier)
      for (const l of links)
        if (l.to === p && inside.has(l.from) && !depth.has(l.from)) {
          depth.set(l.from, depth.get(p)! + 1);
          next.push(l.from);
        }
    frontier = next;
  }
  const rows: LaidNode[][] = [];
  for (const [id, d] of depth) (rows[d] ??= []).push(byId.get(id)!);
  const colW = (width - GAP * (MAX_COLUMNS - 1)) / MAX_COLUMNS;
  const nodes: LaidNode[] = [];
  let top = 0;
  let room = 0;
  rows.forEach((row, d) => {
    row.sort((a, b) => a.circle!.cx - b.circle!.cx || a.circle!.cy - b.circle!.cy);
    const r = SCOPE_R[Math.min(d, SCOPE_R.length - 1)];
    const slotW = width / row.length;
    let rowH = 0;
    row.forEach((n, i) => {
      const cx = slotW * (i + 0.5);
      const w = Math.max(44, Math.min(slotW, Math.max(colW, 2 * r + 16)));
      const fit = insideWidth(n.name, r, fontScale);
      const h = RING_PAD + 2 * r + (fit === undefined ? LABEL_H : 0);
      rowH = Math.max(rowH, h);
      const circle: LaidCircle = { ...n.circle!, cx: r1(cx), cy: top + RING_PAD + r, r, inside: fit !== undefined, labelW: fit ?? Math.floor(w) };
      room = Math.max(room, circle.cy + STEP_ROOM);
      nodes.push({ ...n, x: r1(cx - w / 2), y: top, w: r1(w), h, circle });
    });
    top += rowH + SCOPE_GAP;
  });
  return {
    summaryOnly: false,
    height: Math.max(ROOMY_H, Math.ceil(room), top - SCOPE_GAP),
    nodes,
    links: branches(links.filter((l) => inside.has(l.from) && inside.has(l.to)), nodes),
    dots: [],
    dotLines: [],
    stepH: STEP_H,
    slots: all.slots,
  };
}

const TAU = 2 * Math.PI;
/** Each branch leans a little to the left of its direction of travel, so A → B and B → A stay apart. */
const SIDE = 0.18;
/** The least angle between two branch ends on one circle, so no two share an end point. */
export const MIN_END_ANGLE = 0.32;

/**
 * Spreads angles (radians) on a circle to at least `min` apart, each run of too-close ones centred on
 * where it wanted to be. Returns them in the order given.
 */
function spread(angles: number[], min: number): number[] {
  const n = angles.length;
  if (n < 2) return angles;
  const norm = (a: number) => ((a % TAU) + TAU) % TAU;
  const sorted = angles.map((a, i) => ({ a: norm(a), i })).sort((x, y) => x.a - y.a || x.i - y.i);
  // Start just after the widest gap, so no run wraps around.
  let cut = 0;
  let widest = -1;
  for (let k = 0; k < n; k++) {
    const gap = (k === n - 1 ? sorted[0].a + TAU : sorted[k + 1].a) - sorted[k].a;
    if (gap > widest) [widest, cut] = [gap, (k + 1) % n];
  }
  const order = [...sorted.slice(cut), ...sorted.slice(0, cut).map((x) => ({ a: x.a + TAU, i: x.i }))];
  const runs: { sum: number; n: number; first: number }[] = [];
  const start = (r: { sum: number; n: number }) => r.sum / r.n - ((r.n - 1) * min) / 2;
  order.forEach((x, k) => {
    runs.push({ sum: x.a, n: 1, first: k });
    while (runs.length > 1) {
      const [p, c] = [runs[runs.length - 2], runs[runs.length - 1]];
      if (start(p) + p.n * min <= start(c) + 1e-9) break;
      p.sum += c.sum;
      p.n += c.n;
      runs.pop();
    }
  });
  const out = new Array<number>(n);
  for (const r of runs) for (let j = 0; j < r.n; j++) out[order[r.first + j].i] = start(r) + j * min;
  return out;
}

/**
 * Tapered branches (P-48), child (doing) → parent (to). Each leaves its circle along its own
 * direction toward the other and ends at the other's edge along that direction; branches on the same
 * row bow into the band between the rows (clear of the circle between them). Ends on one circle are
 * spread apart, so no two share a point. Thin at the child, a little wider at the parent (wider still
 * the hotter the child): never a width from a count.
 */
function branches(links: OverviewLink[], nodes: LaidNode[]): LaidLink[] {
  const at = new Map(nodes.map((n) => [n.id, n.circle!]));
  const geo = links.flatMap((l) => {
    const a = at.get(l.from);
    const b = at.get(l.to);
    if (!a || !b) return [];
    const dx = b.cx - a.cx;
    const dy = b.cy - a.cy;
    const d = Math.hypot(dx, dy) || 1;
    const base = Math.atan2(dy, dx);
    let bend = 0;
    if (Math.abs(dy) < 1) {
      // Same row: toward the band (down from the top row, up from the bottom one), more the further.
      const band = a.cy < BOTTOM_Y ? 1 : -1;
      bend = (Math.sign(dx * band) || 1) * Math.min(1.1, 0.4 + d / 400);
    }
    return [{ l, a, b, ends: [base + bend - SIDE, base + Math.PI - bend + SIDE] }];
  });
  // Every end on a circle, spread apart.
  const onNode = new Map<Id, { g: (typeof geo)[number]; end: 0 | 1 }[]>();
  for (const g of geo)
    for (const [end, id] of [g.l.from, g.l.to].entries()) {
      const list = onNode.get(id) ?? onNode.set(id, []).get(id)!;
      list.push({ g, end: end as 0 | 1 });
    }
  for (const list of onNode.values()) {
    const spreadOut = spread(
      list.map(({ g, end }) => g.ends[end]),
      MIN_END_ANGLE,
    );
    list.forEach(({ g, end }, k) => (g.ends[end] = spreadOut[k]));
  }
  return geo.map(({ l, a, b, ends: [a0, a1] }) => {
    const u0 = [Math.cos(a0), Math.sin(a0)];
    const u1 = [Math.cos(a1), Math.sin(a1)];
    const p0 = [a.cx + u0[0] * (a.r - 0.5), a.cy + u0[1] * (a.r - 0.5)];
    const p3 = [b.cx + u1[0] * (b.r - 0.5), b.cy + u1[1] * (b.r - 0.5)];
    const k = Math.min(80, Math.max(10, 0.4 * Math.hypot(p3[0] - p0[0], p3[1] - p0[1])));
    const c1 = [p0[0] + u0[0] * k, p0[1] + u0[1] * k];
    const c2 = [p3[0] + u1[0] * k, p3[1] + u1[1] * k];
    const w0 = 1.5;
    const w1 = 2.2 + 1.8 * a.heat;
    const P = (t: number, i: number) => (1 - t) ** 3 * p0[i] + 3 * (1 - t) ** 2 * t * c1[i] + 3 * (1 - t) * t * t * c2[i] + t ** 3 * p3[i];
    const D = (t: number, i: number) => 3 * (1 - t) ** 2 * (c1[i] - p0[i]) + 6 * (1 - t) * t * (c2[i] - c1[i]) + 3 * t * t * (p3[i] - c2[i]);
    const left: string[] = [];
    const right: string[] = [];
    const N = 20;
    for (let s = 0; s <= N; s++) {
      const t = s / N;
      const [x, y] = [P(t, 0), P(t, 1)];
      const [tx, ty] = [D(t, 0), D(t, 1)];
      const m = Math.hypot(tx, ty) || 1;
      const half = (w0 + (w1 - w0) * t * t * (3 - 2 * t)) / 2;
      left.push(`${r1(x - (ty / m) * half)},${r1(y + (tx / m) * half)}`);
      right.push(`${r1(x + (ty / m) * half)},${r1(y - (tx / m) * half)}`);
    }
    const pt = (p: number[]) => `${r1(p[0])} ${r1(p[1])}`;
    return {
      key: `${l.from}>${l.to}`,
      from: l.from,
      to: l.to,
      path: `M${pt(p0)}C${pt(c1)} ${pt(c2)} ${pt(p3)}`,
      width: r1(w1),
      arrow: '',
      branch: { points: [...left, ...right.reverse()].join(' '), x1: r1(p0[0]), y1: r1(p0[1]), x2: r1(p3[0]), y2: r1(p3[1]), fromHeat: a.heat, toHeat: b.heat },
    };
  });
}
