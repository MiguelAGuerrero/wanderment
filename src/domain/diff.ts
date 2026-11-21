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
