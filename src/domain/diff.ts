import { Activity, Data, Id, Thread } from './types';

export interface DataChanges {
  upsertThreads: Thread[];
  deleteThreads: Id[];
  upsertActivities: Activity[];
  deleteActivities: Id[];
}

/**
 * What changed between two versions of the data. Records are immutable, so a record that is
 * a different object is a changed record — no deep comparison needed.
 */
export function diffData(prev: Data, next: Data): DataChanges {
  const changes: DataChanges = { upsertThreads: [], deleteThreads: [], upsertActivities: [], deleteActivities: [] };
  for (const [id, t] of Object.entries(next.threads)) if (prev.threads[id] !== t) changes.upsertThreads.push(t);
  for (const id of Object.keys(prev.threads)) if (!next.threads[id]) changes.deleteThreads.push(id);
  for (const [id, a] of Object.entries(next.activities)) if (prev.activities[id] !== a) changes.upsertActivities.push(a);
  for (const id of Object.keys(prev.activities)) if (!next.activities[id]) changes.deleteActivities.push(id);
  return changes;
}

export const isEmptyDiff = (c: DataChanges) =>
  !c.upsertThreads.length && !c.deleteThreads.length && !c.upsertActivities.length && !c.deleteActivities.length;

/**
 * Everything that must be written so the database ends up equal to `current`, whether or not
 * a write of `inflight` (already sent, not yet confirmed) lands. Every record touched since
 * `committed` is written with its current value, or deleted if it's gone.
 */
export function pendingChanges(committed: Data, inflight: Data | undefined, current: Data): DataChanges {
  const threadIds = new Set<Id>();
  const activityIds = new Set<Id>();
  const collect = (c: DataChanges) => {
    c.upsertThreads.forEach((t) => threadIds.add(t.id));
    c.deleteThreads.forEach((id) => threadIds.add(id));
    c.upsertActivities.forEach((a) => activityIds.add(a.id));
    c.deleteActivities.forEach((id) => activityIds.add(id));
  };
  collect(diffData(committed, current));
  if (inflight) {
    collect(diffData(committed, inflight));
    collect(diffData(inflight, current));
  }
  const changes: DataChanges = { upsertThreads: [], deleteThreads: [], upsertActivities: [], deleteActivities: [] };
  for (const id of threadIds) {
    if (current.threads[id]) changes.upsertThreads.push(current.threads[id]);
    else changes.deleteThreads.push(id);
  }
  for (const id of activityIds) {
    if (current.activities[id]) changes.upsertActivities.push(current.activities[id]);
    else changes.deleteActivities.push(id);
  }
  return changes;
}

/**
 * What Undo needs: each touched record before and after the action (null = didn't exist).
 * Undo puts back only the fields that are still exactly as the action left them, so edits made
 * afterwards — a new next step, a rename, a note — survive.
 */
export interface UndoEntry {
  threads: Record<Id, { before: Thread | null; after: Thread | null }>;
  activities: Record<Id, { before: Activity | null; after: Activity | null }>;
}

export function undoEntry(prev: Data, next: Data): UndoEntry {
  const c = diffData(prev, next);
  const entry: UndoEntry = { threads: {}, activities: {} };
  for (const t of c.upsertThreads) entry.threads[t.id] = { before: prev.threads[t.id] ?? null, after: t };
  for (const id of c.deleteThreads) entry.threads[id] = { before: prev.threads[id], after: null };
  for (const a of c.upsertActivities) entry.activities[a.id] = { before: prev.activities[a.id] ?? null, after: a };
  for (const id of c.deleteActivities) entry.activities[id] = { before: prev.activities[id], after: null };
  return entry;
}

const same = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);

/** Reverts one record: created → removed, removed → back, changed → only untouched-since fields. */
function revert<T extends object>(current: T | undefined, before: T | null, after: T | null): T | undefined {
  if (!before) return undefined; // the action created it
  if (!after || !current) return current ?? before; // the action removed it (or it's gone again)
  const out = { ...current } as Record<string, unknown>;
  const b = before as Record<string, unknown>;
  const a = after as Record<string, unknown>;
  for (const key of new Set([...Object.keys(b), ...Object.keys(a)])) {
    if (!same(b[key], a[key]) && same(out[key], a[key])) out[key] = b[key];
  }
  return out as T;
}

export function applyUndo(current: Data, entry: UndoEntry): Data {
  const threads = { ...current.threads };
  const activities = { ...current.activities };
  for (const [id, { before, after }] of Object.entries(entry.threads)) {
    const t = revert(threads[id], before, after);
    if (t) threads[id] = t;
    else delete threads[id];
  }
  for (const [id, { before, after }] of Object.entries(entry.activities)) {
    const a = revert(activities[id], before, after);
    if (a) activities[id] = a;
    else delete activities[id];
  }
  return { ...current, threads, activities };
}

/** Records in `incoming` that `base` doesn't have at all (used to rescue writes from old tabs). */
export function missingFrom(base: Data, incoming: Data): DataChanges {
  return {
    upsertThreads: Object.values(incoming.threads).filter((t) => !base.threads[t.id]),
    deleteThreads: [],
    upsertActivities: Object.values(incoming.activities).filter((a) => !base.activities[a.id]),
    deleteActivities: [],
  };
}

/** A record's value, whatever its key order, with undefined fields left out (as loading drops them). */
const valueOf = (record: object) =>
  JSON.stringify(Object.entries(record).filter(([, v]) => v !== undefined).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

/** `loaded`, but with `base`'s object wherever the value is the same; and whether any record differs. */
function keepSame<T extends object>(base: Record<Id, T>, loaded: Record<Id, T>): { records: Record<Id, T>; changed: boolean } {
  let changed = Object.keys(base).some((id) => !loaded[id]);
  const records: Record<Id, T> = {};
  for (const [id, r] of Object.entries(loaded)) {
    const same = base[id] !== undefined && valueOf(base[id]) === valueOf(r);
    records[id] = same ? base[id] : r;
    if (!same) changed = true;
  }
  return { records, changed };
}

/**
 * Taking the data back after another copy of the app may have written to it (P-29). `base`: what
 * this page last saved; `current`: what it shows (base plus its own changes since); `loaded`: what
 * is saved now. Returns what to show — the saved data with this page's own changes on top — what
 * is saved (`saved`, so the difference is this page's to write), and whether what's shown changes
 * (not when all that differs is this page's own changes, saved since by its journal). Records whose
 * value didn't change keep this page's objects (no re-render, no rewrite).
 */
export function rebase(base: Data, current: Data, loaded: Data): { data: Data; saved: Data; changed: boolean } {
  const threads = keepSame(base.threads, loaded.threads);
  const activities = keepSame(base.activities, loaded.activities);
  if (!threads.changed && !activities.changed) return { data: current, saved: base, changed: false };
  const saved: Data = { ...loaded, threads: threads.records, activities: activities.records };
  const own = diffData(base, current);
  const data: Data = { ...saved, threads: { ...saved.threads }, activities: { ...saved.activities } };
  for (const t of own.upsertThreads) data.threads[t.id] = t;
  for (const id of own.deleteThreads) delete data.threads[id];
  for (const a of own.upsertActivities) data.activities[a.id] = a;
  for (const id of own.deleteActivities) delete data.activities[id];
  const shownThreads = keepSame(current.threads, data.threads);
  const shownActivities = keepSame(current.activities, data.activities);
  if (!shownThreads.changed && !shownActivities.changed) return { data: current, saved, changed: false };
  return { data, saved, changed: true };
}
