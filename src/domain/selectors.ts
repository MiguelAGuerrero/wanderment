import { Activity, Data, Id, Thread } from './types';

const DAY = 24 * 60 * 60 * 1000;
/** Warmth halves every 14 days. */
export const HALF_LIFE_DAYS = 14;
/** Threads untouched for longer than this go under "Earlier". */
export const EARLIER_AFTER_DAYS = 21;

export const sortedActivities = (data: Data): Activity[] =>
  Object.values(data.activities).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

export const touches = (a: Activity, id: Id) => a.doingId === id || a.toIds.includes(id);

export function activitiesOf(data: Data, threadId: Id): Activity[] {
  return sortedActivities(data).filter((a) => touches(a, threadId));
}

export function lastActivityOf(data: Data, threadId: Id): Activity | undefined {
  return activitiesOf(data, threadId)[0];
}

/** 1 = touched just now, → 0 as time passes. */
export function warmth(lastTouched: Date | undefined, now = new Date()): number {
  if (!lastTouched) return 0;
  const days = Math.max(0, (now.getTime() - lastTouched.getTime()) / DAY);
  return Math.pow(0.5, days / HALF_LIFE_DAYS);
}

export function ageLabel(iso: string, now = new Date()): string {
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / DAY);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days}d`;
  return `${Math.floor(days / 7)} wk`;
}

export interface ThreadSummary {
  thread: Thread;
  last?: Activity;
  lastTouched?: Date;
  warmth: number;
}

/** Visible threads, most recently touched first, split into current and "Earlier". */
export function homeThreads(data: Data, now = new Date()): { current: ThreadSummary[]; earlier: ThreadSummary[] } {
  const all: ThreadSummary[] = Object.values(data.threads)
    .filter((t) => !t.hidden)
    .map((thread) => {
      const last = lastActivityOf(data, thread.id);
      const lastTouched = new Date(last?.occurredAt ?? thread.createdAt);
      return { thread, last, lastTouched, warmth: warmth(lastTouched, now) };
    })
    .sort((a, b) => (b.lastTouched?.getTime() ?? 0) - (a.lastTouched?.getTime() ?? 0));
  const cutoff = now.getTime() - EARLIER_AFTER_DAYS * DAY;
  return {
    current: all.filter((s) => (s.lastTouched?.getTime() ?? 0) >= cutoff),
    earlier: all.filter((s) => (s.lastTouched?.getTime() ?? 0) < cutoff),
  };
}

/** Where a thread's activity flows: counts of "to" threads on activities it was doing. */
export function flowsFrom(data: Data, threadId: Id): { thread: Thread; count: number }[] {
  const counts = new Map<Id, number>();
  for (const a of Object.values(data.activities)) {
    if (a.doingId !== threadId) continue;
    for (const to of a.toIds) counts.set(to, (counts.get(to) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([id]) => data.threads[id])
    .map(([id, count]) => ({ thread: data.threads[id], count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * The most recent earlier activity in the same direction (same doing → same first to),
 * falling back to the same doing thread.
 */
export function lastTimeFor(data: Data, doingId?: Id, toId?: Id): Activity | undefined {
  if (!doingId && !toId) return undefined;
  const list = sortedActivities(data);
  return (
    list.find((a) => a.doingId === doingId && (!toId || a.toIds.includes(toId))) ??
    (doingId ? list.find((a) => a.doingId === doingId) : list.find((a) => toId && a.toIds.includes(toId)))
  );
}

export const describeLink = (data: Data, a: Activity): string | undefined => {
  const doing = a.doingId ? data.threads[a.doingId]?.name : undefined;
  const tos = a.toIds.map((id) => data.threads[id]?.name).filter(Boolean) as string[];
  if (doing && tos.length) return `${doing} → to ${tos.join(', ')}`;
  if (doing) return doing;
  if (tos.length) return `→ to ${tos.join(', ')}`;
  return undefined;
};
