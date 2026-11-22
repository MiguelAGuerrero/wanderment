import { warmth } from './selectors';
import { Data, Id, Thread } from './types';

const DAY = 864e5;
/** Days that count as "recent" for the ring around the centre node. */
export const RING_DAYS = 14;
/** Siblings shown before collapsing into "+N". */
export const MAX_SIBLINGS = 5;

export interface Edge {
  count: number;
  /** Count weighted by recency: each link is worth between 0.5 (old) and 1 (just now). */
  weight: number;
  /** When the first of these links was logged (the activity's createdAt), so new links sort last. */
  first: string;
}

/** from → to → edge, plus per-thread step counts. Build once per data change. */
export interface FlowIndex {
  out: Map<Id, Map<Id, Edge>>;
  in: Map<Id, Map<Id, Edge>>;
  steps: Map<Id, number>;
  recentSteps: Map<Id, number>;
  /** Plain "to Y" logs (no doing thread) per Y: they feed Y without linking anything. In memory only. */
  direct: Map<Id, number>;
}

export function buildFlowIndex(data: Data, now = new Date()): FlowIndex {
  const index: FlowIndex = { out: new Map(), in: new Map(), steps: new Map(), recentSteps: new Map(), direct: new Map() };
  const recentSince = now.getTime() - RING_DAYS * DAY;
  const add = (m: Map<Id, Map<Id, Edge>>, a: Id, b: Id, w: number, at: string) => {
    const inner = m.get(a) ?? m.set(a, new Map()).get(a)!;
    const e = inner.get(b) ?? { count: 0, weight: 0, first: at };
    e.count += 1;
    e.weight += w;
    if (at < e.first) e.first = at;
    inner.set(b, e);
  };
  for (const act of Object.values(data.activities)) {
    const when = new Date(act.occurredAt);
    const touched = new Set([act.doingId, ...act.toIds].filter(Boolean) as Id[]);
    for (const id of touched) {
      index.steps.set(id, (index.steps.get(id) ?? 0) + 1);
      if (when.getTime() >= recentSince) index.recentSteps.set(id, (index.recentSteps.get(id) ?? 0) + 1);
    }
    if (!act.doingId) {
      for (const to of new Set(act.toIds)) index.direct.set(to, (index.direct.get(to) ?? 0) + 1);
      continue;
    }
    const w = 0.5 + 0.5 * warmth(when, now);
    for (const to of act.toIds) {
      if (to === act.doingId) continue;
      add(index.out, act.doingId, to, w, act.createdAt);
      add(index.in, to, act.doingId, w, act.createdAt);
    }
  }
  return index;
}

export interface GraphNode {
  thread: Thread;
  /** Links between this node and the one it hangs off (its parent in the layout). */
  count: number;
  weight: number;
  /** For depth-2 nodes: the depth-1 node they connect through. */
  via?: Id;
}

export interface Neighbourhood {
  center: Thread;
  steps: number;
  recentSteps: number;
  /** What the centre flows to (shown above), strongest first. */
  up: GraphNode[];
  /** What flows into the centre (shown below). */
  down: GraphNode[];
  /** Depth 2: what the "up" nodes flow to, and what flows into the "down" nodes. */
  up2: GraphNode[];
  down2: GraphNode[];
  /** Other threads that flow to the same places as the centre (shown at the sides). */
  siblings: GraphNode[];
  moreSiblings: number;
}

const visible = (data: Data, id: Id) => !!data.threads[id] && !data.threads[id].hidden;

function ranked(data: Data, edges: Map<Id, Edge> | undefined, exclude: Set<Id>, via?: Id): GraphNode[] {
  if (!edges) return [];
  return [...edges.entries()]
    .filter(([id]) => visible(data, id) && !exclude.has(id))
    .map(([id, e]) => ({ thread: data.threads[id], count: e.count, weight: e.weight, via }))
    .sort((a, b) => b.weight - a.weight || a.thread.name.localeCompare(b.thread.name));
}

/**
 * The centre thread with what it flows to (above), what flows into it (below) and siblings that
 * flow to the same places (sides). Both directions are distinct: in a cycle A⇄B, B is both above
 * and below A. Depth 2 adds one more ring each way, never repeating the centre or a node already
 * shown on that side, so cycles can't loop.
 */
export function neighbourhood(data: Data, index: FlowIndex, threadId: Id, depth: 1 | 2 = 1): Neighbourhood | undefined {
  const center = data.threads[threadId];
  if (!center) return undefined;
  const self = new Set([threadId]);
  const up = ranked(data, index.out.get(threadId), self);
  const down = ranked(data, index.in.get(threadId), self);

  const merge = (lists: GraphNode[][]) => {
    const best = new Map<Id, GraphNode>();
    for (const n of lists.flat()) {
      const prev = best.get(n.thread.id);
      if (!prev || n.weight > prev.weight) best.set(n.thread.id, n);
    }
    return [...best.values()].sort((a, b) => b.weight - a.weight);
  };

  let up2: GraphNode[] = [];
  let down2: GraphNode[] = [];
  if (depth === 2) {
    const upSeen = new Set([threadId, ...up.map((n) => n.thread.id)]);
    up2 = merge(up.map((n) => ranked(data, index.out.get(n.thread.id), upSeen, n.thread.id)));
    const downSeen = new Set([threadId, ...down.map((n) => n.thread.id)]);
    down2 = merge(down.map((n) => ranked(data, index.in.get(n.thread.id), downSeen, n.thread.id)));
  }

  const shown = new Set([threadId, ...up.map((n) => n.thread.id), ...down.map((n) => n.thread.id)]);
  const allSiblings = merge(up.map((n) => ranked(data, index.in.get(n.thread.id), shown, n.thread.id)));

  return {
    center,
    steps: index.steps.get(threadId) ?? 0,
    recentSteps: index.recentSteps.get(threadId) ?? 0,
    up,
    down,
    up2,
    down2,
    siblings: allSiblings.slice(0, MAX_SIBLINGS),
    moreSiblings: Math.max(0, allSiblings.length - MAX_SIBLINGS),
  };
}

/** Unattached activities, oldest first, for attach mode. */
export const looseActivities = (data: Data, skip: Set<Id> = new Set()) =>
  Object.values(data.activities)
    .filter((a) => !a.doingId && a.toIds.length === 0 && !skip.has(a.id))
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
