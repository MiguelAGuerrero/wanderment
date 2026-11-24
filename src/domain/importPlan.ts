import { hasOwn } from './migrate';
import { declaredWhys } from './model';
import { Collection, COLLECTIONS, Data, Id } from './types';

/** The collections added after wanders and activities (P-85): counted under their own names. */
export type LaterCollection = Exclude<Collection, 'threads' | 'activities'>;
export const LATER_COLLECTIONS = COLLECTIONS.filter((c): c is LaterCollection => c !== 'threads' && c !== 'activities');

/** How many activities and wanders a side holds (for any collection, `heldHere` / `heldIncoming` count from its diff). */
export interface ImportCounts {
  activities: number;
  wanders: number;
  visible: number;
  hidden: number;
  /** Declared whys (visible wanders marked as what it's for). */
  whys: number;
}

/** One collection compared by id: in the backup only, here only, in both but different, in both the same. */
export interface ImportDiff {
  added: number;
  removed: number;
  changed: number;
  unchanged: number;
}

/** How many records of a collection are here, and how many the backup holds. */
export const heldHere = (d: ImportDiff) => d.removed + d.changed + d.unchanged;
export const heldIncoming = (d: ImportDiff) => d.added + d.changed + d.unchanged;

export interface ImportSummary {
  here: ImportCounts;
  incoming: ImportCounts;
  /** When the backup's activities happened (ISO, earliest and latest); none when none has a real date. */
  dateRange?: { from: string; to: string };
  /** Nothing added, removed or changed in any collection: replacing would change nothing. */
  identical: boolean;
  /** The backup has no records of any kind. */
  empty: boolean;
}

/** What replacing what's here with a backup would do (P-04), collection by collection. Computing it changes nothing. */
export type ImportPlan = ImportSummary & Record<Collection, ImportDiff>;

/** Compares what's here with a checked backup (`fromBackup`). Linear in the number of records. */
export function planImport(current: Data, incoming: Data): ImportPlan {
  const diffs = Object.fromEntries(COLLECTIONS.map((c) => [c, diff<object>(current[c], incoming[c])])) as Record<Collection, ImportDiff>;
  return {
    here: counts(current),
    incoming: counts(incoming),
    dateRange: dateRange(incoming),
    ...diffs,
    identical: COLLECTIONS.every((c) => !diffs[c].added && !diffs[c].removed && !diffs[c].changed),
    empty: COLLECTIONS.every((c) => !Object.keys(incoming[c]).length),
  };
}

function counts(data: Data): ImportCounts {
  const threads = Object.values(data.threads);
  const hidden = threads.filter((t) => t.hidden).length;
  return { activities: Object.keys(data.activities).length, wanders: threads.length, visible: threads.length - hidden, hidden, whys: declaredWhys(data).length };
}

function diff<T extends object>(here: Record<Id, T>, incoming: Record<Id, T>): ImportDiff {
  const out: ImportDiff = { added: 0, removed: 0, changed: 0, unchanged: 0 };
  for (const [id, record] of Object.entries(incoming)) {
    if (!hasOwn(here, id)) out.added++;
    else if (same(here[id], record)) out.unchanged++;
    else out.changed++;
  }
  for (const id of Object.keys(here)) if (!hasOwn(incoming, id)) out.removed++;
  return out;
}

/** The same content, whatever the key order at any depth; an absent field equals an undefined one. */
const same = (a: object, b: object) => canonical(a) === canonical(b);
const canonical = (r: object) => JSON.stringify(r, sortedKeys);
/** (A list of the record's own keys would do for flat records, but it also filters every object inside: a routine's steps would compare equal whatever they said.) */
const sortedKeys = (_key: string, v: unknown) =>
  v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : v;

/** A missing date was stored as the epoch (see migrate.ts): it says nothing about when. */
function dateRange(data: Data): ImportPlan['dateRange'] {
  let from = Infinity;
  let to = -Infinity;
  for (const a of Object.values(data.activities)) {
    const t = Date.parse(a.occurredAt);
    if (!t || Number.isNaN(t)) continue;
    if (t < from) from = t;
    if (t > to) to = t;
  }
  return from === Infinity ? undefined : { from: new Date(from).toISOString(), to: new Date(to).toISOString() };
}
