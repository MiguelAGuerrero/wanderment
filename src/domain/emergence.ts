import { meaningfulStems } from './compose';
import { normalizeName } from './model';
import { sortedActivities } from './selectors';
import { Activity, Data, Id, Thread } from './types';

const DAY = 864e5;

// ─── Pulling past activities into a new thread ─────────────────────────────

/**
 * Past activities whose text shares a meaningful word with `name`, most recent first,
 * excluding ones already in that thread. Never attaches anything itself.
 */
export function candidatesForThread(data: Data, name: string, threadId?: Id): Activity[] {
  const words = meaningfulStems(name);
  if (!words.size) return [];
  return sortedActivities(data).filter((a) => {
    if (threadId && (a.doingId === threadId || a.toIds.includes(threadId))) return false;
    for (const w of meaningfulStems(a.text)) if (words.has(w)) return true;
    return false;
  });
}

/** How a pulled-in activity joins the thread: as what you were doing, unless it already says. */
export const pullInRole = (a: Activity): 'doing' | 'to' => (a.doingId ? 'to' : 'doing');

/** Attaches many activities to one thread in one step (so one Undo covers all of them). */
export function attachMany(data: Data, activityIds: Id[], threadId: Id): Data {
  if (!data.threads[threadId]) return data;
  const activities = { ...data.activities };
  for (const id of activityIds) {
    const a = activities[id];
    if (!a || a.doingId === threadId || a.toIds.includes(threadId)) continue;
    activities[id] = pullInRole(a) === 'doing' ? { ...a, doingId: threadId } : { ...a, toIds: [...a.toIds, threadId] };
  }
  return { ...data, activities };
}

// ─── Values: threads most activity flows toward ────────────────────────────

/** Links count over this window. */
export const VALUE_WINDOW_DAYS = 90;
/** Become a value: at least this many more links in than out… */
export const VALUE_MIN_NET_INFLOW = 3;
/** …and at least this share of the thread's links coming in. */
export const VALUE_ENTER_SHARE = 0.6;
/** Stay a value until the incoming share drops below this (so one log can't flip headers). */
export const VALUE_EXIT_SHARE = 0.4;

interface Flow {
  in: number;
  out: number;
}

/**
 * Links an activity creates between two threads (doing → to): an inflow for the "to", an
 * outflow for the doing thread. A plain "@thread" log with no doing thread links nothing.
 */
function applyLinks(flows: Map<Id, Flow>, a: Activity, sign: 1 | -1) {
  if (!a.doingId) return;
  for (const to of a.toIds) {
    const t = flows.get(to) ?? { in: 0, out: 0 };
    t.in += sign;
    flows.set(to, t);
    const d = flows.get(a.doingId) ?? { in: 0, out: 0 };
    d.out += sign;
    flows.set(a.doingId, d);
  }
}

function step(values: Set<Id>, flows: Map<Id, Flow>) {
  for (const [id, f] of flows) {
    const total = f.in + f.out;
    const share = total ? f.in / total : 0;
    if (values.has(id)) {
      if (share < VALUE_EXIT_SHARE) values.delete(id);
    } else if (f.in - f.out >= VALUE_MIN_NET_INFLOW && share >= VALUE_ENTER_SHARE) {
      values.add(id);
    }
  }
}

/**
 * Threads that have become "values": most of the links touching them flow in, over the last
 * 90 days. Hysteresis comes from replaying history in order, so the result depends only on the
 * data and the date — nothing extra is stored.
 */
export function valueThreads(data: Data, now = new Date()): Set<Id> {
  const acts = sortedActivities(data)
    .filter((a) => a.doingId && a.toIds.length && new Date(a.occurredAt).getTime() <= now.getTime())
    .reverse(); // oldest first
  const window = VALUE_WINDOW_DAYS * DAY;
  const flows = new Map<Id, Flow>();
  const values = new Set<Id>();
  let start = 0;
  const expireBefore = (t: number) => {
    while (start < acts.length && new Date(acts[start].occurredAt).getTime() < t - window) applyLinks(flows, acts[start++], -1);
  };
  for (const a of acts) {
    const t = new Date(a.occurredAt).getTime();
    expireBefore(t);
    applyLinks(flows, a, 1);
    step(values, flows);
  }
  expireBefore(now.getTime());
  step(values, flows);
  for (const id of values) if (!data.threads[id] || data.threads[id].hidden) values.delete(id);
  return values;
}

export interface ValueGroup {
  value: Thread;
  /** Threads (other than the value itself) that flow mostly into it. */
  members: Id[];
}

/**
 * Groups thread ids (already in display order) under the value they most often flow to.
 * Values lead their own group; threads that flow to no value are returned as `rest`.
 * Pass `values` when the caller already has `valueThreads(data, now)` (Home shares it with the graph).
 */
export function groupByValue(data: Data, threadIds: Id[], now = new Date(), values = valueThreads(data, now)): { groups: ValueGroup[]; rest: Id[] } {
  if (!values.size) return { groups: [], rest: threadIds };
  // How often each thread sent links to each value in the window — one pass.
  const since = now.getTime() - VALUE_WINDOW_DAYS * DAY;
  const toValue = new Map<Id, Map<Id, number>>();
  for (const a of Object.values(data.activities)) {
    if (!a.doingId || new Date(a.occurredAt).getTime() < since) continue;
    for (const to of a.toIds) {
      if (!values.has(to)) continue;
      const m = toValue.get(a.doingId) ?? toValue.set(a.doingId, new Map()).get(a.doingId)!;
      m.set(to, (m.get(to) ?? 0) + 1);
    }
  }
  const best = (id: Id) => {
    let pick: Id | undefined;
    for (const [v, n] of toValue.get(id) ?? []) if (!pick || n > toValue.get(id)!.get(pick)!) pick = v;
    return pick;
  };
  const groups = new Map<Id, ValueGroup>();
  const rest: Id[] = [];
  const ensure = (v: Id) => groups.get(v) ?? groups.set(v, { value: data.threads[v], members: [] }).get(v)!;
  for (const id of threadIds) {
    if (values.has(id)) ensure(id);
    else {
      const to = best(id);
      if (to) ensure(to).members.push(id);
      else rest.push(id);
    }
  }
  // Values not in the visible list (e.g. under "Earlier") still head their members' group.
  return { groups: [...groups.values()], rest };
}

export const valueHeader = (t: Thread) => `TO ${normalizeName(t.name).toUpperCase()}`;

/** Plain-language "why is this a header?" */
export function whyValue(data: Data, id: Id, now = new Date()): string {
  const since = now.getTime() - VALUE_WINDOW_DAYS * DAY;
  let inflow = 0;
  let outflow = 0;
  for (const a of Object.values(data.activities)) {
    if (new Date(a.occurredAt).getTime() < since || !a.doingId) continue;
    if (a.toIds.includes(id)) inflow++;
    if (a.doingId === id) outflow += a.toIds.length;
  }
  const name = data.threads[id]?.name ?? 'this';
  return `In the last ${VALUE_WINDOW_DAYS} days, ${inflow} ${inflow === 1 ? 'thing' : 'things'} you logged went from another thread → to ${name}, and ${outflow} went from it to something else. When most of what you do flows toward a thread, it gets a header, and the threads that feed it gather underneath.`;
}
