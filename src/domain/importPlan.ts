import { hasOwn } from './migrate';
import { declaredWhys } from './model';
import { Data, Id } from './types';

/** How many of each a side holds. */
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

/** What replacing what's here with a backup would do (P-04). Computing it changes nothing. */
export interface ImportPlan {
  here: ImportCounts;
  incoming: ImportCounts;
  /** When the backup's activities happened (ISO, earliest and latest); none when none has a real date. */
  dateRange?: { from: string; to: string };
  activities: ImportDiff;
  threads: ImportDiff;
  /** Nothing added, removed or changed: replacing would change nothing. */
  identical: boolean;
  /** The backup has no activities and no wanders. */
  empty: boolean;
}

/** Compares what's here with a checked backup (`fromBackup`). Linear in the number of records. */
export function planImport(current: Data, incoming: Data): ImportPlan {
  const activities = diff(current.activities, incoming.activities);
  const threads = diff(current.threads, incoming.threads);
  const inc = counts(incoming);
  return {
    here: counts(current),
    incoming: inc,
    dateRange: dateRange(incoming),
    activities,
    threads,
    identical: !activities.added && !activities.removed && !activities.changed && !threads.added && !threads.removed && !threads.changed,
    empty: !inc.activities && !inc.wanders,
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

/** The same content, whatever the key order; an absent field equals an undefined one. */
const same = (a: object, b: object) => canonical(a) === canonical(b);
const canonical = (r: object) => JSON.stringify(r, Object.keys(r).sort());

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
