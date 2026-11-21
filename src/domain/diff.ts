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
