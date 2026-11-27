import { heldHere, heldIncoming, ImportDiff, ImportPlan, LATER_COLLECTIONS } from './importPlan';
import { Collection, COLLECTION_INFO } from './types';

/** The sentences of the import preview (P-04): what a checked backup holds and what replacing would do here. */

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
/** "a", "a and b", "a, b and c". */
const list = (parts: string[]) => (parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts.join(''));

/**
 * P-103 (the owner: no retired-app words in Settings): the previous app's records (its activities and wanders)
 * are counted together, plainly, as "N items from the previous app" — kept and imported exactly as before.
 */
const EARLIER = (n: number) => `${count(n, 'item', 'items')} from the previous app`;
/** The two collections the previous app kept. */
const EARLIER_COLLECTIONS: Collection[] = ['activities', 'threads'];

/**
 * "3 routines and 2 runs", "3 routines, 1 run and 110 items from the previous app": every kind of record only
 * when there are any (P-89: someone who never had earlier data is not told they have none).
 */
function held(plan: ImportPlan, side: 'here' | 'incoming'): string {
  const c = plan[side];
  const later = LATER_COLLECTIONS.map((k) => [k, (side === 'here' ? heldHere : heldIncoming)(plan[k])] as const)
    .filter(([, n]) => n > 0)
    // P-109: the places the routines hold go with them ("2 routines with 3 places"), only when there are any.
    .map(([k, n]) => `${count(n, COLLECTION_INFO[k].one, COLLECTION_INFO[k].many)}${k === 'routines' && plan.places?.[side] ? ` with ${count(plan.places[side], 'place', 'places')}` : ''}`);
  const earlier = c.activities + c.wanders;
  return list([...later, ...(earlier ? [EARLIER(earlier)] : [])]);
}

/** "This backup has 3 routines and 110 items from the previous app, from 3 Jan to 9 Mar 2026." */
export function importHolds(plan: ImportPlan): string {
  if (plan.empty) return 'This backup is empty.';
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

/** An empty backup: "Replacing would remove all 3 routines and 110 items from the previous app here." */
export const importRemovesAll = (plan: ImportPlan): string => `Replacing would remove all ${held(plan, 'here')} here.`;

/** "Replacing would add 1 routine, and add 4, change 2 and remove 23 items from the previous app." */
export function importChanges(plan: ImportPlan): string {
  const parts = LATER_COLLECTIONS.map((c) => phrase(plan[c], (n) => count(n, COLLECTION_INFO[c].one, COLLECTION_INFO[c].many)));
  // P-103: the previous app's two collections as one (each diff summed).
  const sum = (k: keyof ImportDiff) => EARLIER_COLLECTIONS.reduce((n, c) => n + plan[c][k], 0);
  parts.push(phrase({ added: sum('added'), changed: sum('changed'), removed: sum('removed'), unchanged: sum('unchanged') }, EARLIER));
  return `Replacing would ${parts.filter(Boolean).join(', and ')}.`;
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
