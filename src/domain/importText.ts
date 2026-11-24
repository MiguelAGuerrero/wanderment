import { heldHere, heldIncoming, ImportDiff, ImportPlan, LATER_COLLECTIONS } from './importPlan';
import { Collection, COLLECTION_INFO } from './types';

/** The sentences of the import preview (P-04): what a checked backup holds and what replacing would do here. */

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
/** "a", "a and b", "a, b and c". */
const list = (parts: string[]) => (parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts.join(''));

/**
 * "98 activities and 12 wanders (2 hidden)": activities and wanders always; every later kind of
 * record (routines, runs) only when there are any, as "…, 12 wanders, 3 routines and 1 run".
 */
function held(plan: ImportPlan, side: 'here' | 'incoming'): string {
  const c = plan[side];
  const hidden = side === 'incoming' && c.hidden ? ` (${c.hidden} hidden)` : '';
  const later = LATER_COLLECTIONS.map((k) => [k, (side === 'here' ? heldHere : heldIncoming)(plan[k])] as const)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => count(n, COLLECTION_INFO[k].one, COLLECTION_INFO[k].many));
  return list([count(c.activities, 'activity', 'activities'), `${count(c.wanders, 'wander', 'wanders')}${hidden}`, ...later]);
}

/** "This backup has 98 activities and 12 wanders (2 hidden), from 3 Jan to 9 Mar 2026." */
export function importHolds(plan: ImportPlan): string {
  if (plan.empty) return 'This backup has no activities and no wanders.';
  return `This backup has ${held(plan, 'incoming')}${when(plan.dateRange)}.`;
}

function when(range: ImportPlan['dateRange']): string {
  if (!range) return '';
  const from = new Date(range.from);
  const to = new Date(range.to);
  const day = { day: 'numeric', month: 'short' } as const;
  const full = { ...day, year: 'numeric' } as const;
  if (from.toDateString() === to.toDateString()) return `, on ${to.toLocaleDateString(undefined, full)}`;
  const sameYear = from.getFullYear() === to.getFullYear();
  return `, from ${from.toLocaleDateString(undefined, sameYear ? day : full)} to ${to.toLocaleDateString(undefined, full)}`;
}

/** An empty backup: "Replacing would remove all 98 activities and 12 wanders here." */
export const importRemovesAll = (plan: ImportPlan): string => `Replacing would remove all ${held(plan, 'here')} here.`;

/** "Replacing would add 4, change 2 and remove 22 activities, and add 1 wander." */
export function importChanges(plan: ImportPlan): string {
  // Activities first, then wanders, as the sentence always read; then every other collection.
  const order: Collection[] = ['activities', 'threads', ...LATER_COLLECTIONS];
  const parts = order.map((c) => phrase(plan[c], (n) => count(n, COLLECTION_INFO[c].one, COLLECTION_INFO[c].many))).filter(Boolean);
  return `Replacing would ${parts.join(', and ')}.`;
}

function phrase(d: ImportDiff, noun: (n: number) => string): string {
  const verbs = (
    [
      ['add', d.added],
      ['change', d.changed],
      ['remove', d.removed],
    ] as const
  ).filter(([, n]) => n > 0);
  if (!verbs.length) return '';
  const last = verbs[verbs.length - 1];
  const head = verbs.slice(0, -1).map(([v, n]) => `${v} ${n}`);
  const tail = `${last[0]} ${noun(last[1])}`;
  return head.length ? `${head.join(', ')} and ${tail}` : tail;
}
