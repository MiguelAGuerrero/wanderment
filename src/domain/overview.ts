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
 */
export function overview(data: Data, surfacing: Iterable<Id> = headerWhys(data)): Overview | undefined {
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
  for (const a of acts) {
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
    return { mode: 'whys', whys, moreWhys, others, links, dots, more, summary: whysSummary(whys, others, dots, more, data) };
  }
  const threads = picked.map((thread) => ({ thread }));
  return { mode: 'threads', threads, links, dots, more, summary: threadsSummary(threads, links, dots, more, data) };
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
  return { mode: 'logs', links: [], dots, more: false, summary: texts.length ? `Lately: ${texts.join('; ')}.` : '' };
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
}
export interface LaidLink {
  key: string;
  from: Id;
  to: Id;
  /** SVG path data. */
  path: string;
  width: number;
  /** Arrowhead polygon points, at the "to" end. */
  arrow: string;
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

/** Roomy (Home, P-34): node targets this tall (a 44 px chip), with a staged-step line under each row. */
export const ROOMY_NODE = 52;
export const STEP_H = 20;
const ROOMY_GAP = 12;
/** Roomy, with threads: two node rows, each with its step line, and two dot rows between them. */
export const ROOMY_H = 2 * (ROOMY_NODE + STEP_H) + 2 * ROW + 3 * ROOMY_GAP;
/** Roomy, no wanders: just the two rows of dots. */
export const LOGS_H = 2 * ROW + ROOMY_GAP;

/** Coarse on purpose: three widths, from all-time links (thickening is the only quantity shown). */
export const linkWidth = (count: number) => (count <= 1 ? 1.5 : count < 5 ? 2.5 : 3.5);

const r1 = (n: number) => Math.round(n * 10) / 10;

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
    width: linkWidth(l.count),
    arrow,
  };
}
