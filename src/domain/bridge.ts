/**
 * The bridge after a log: when the latest activity logged on Home has no thread, Home asks
 * "Toward something — or just itself?" with a few threads to attach it to. Ignoring it leaves no trace.
 */
import { attachActivity, ensureThread, findThreadByName, normalizeName, updateThread } from './model';
import { homeThreads } from './selectors';
import { Data, Id, Thread } from './types';

/** Up to `n` visible threads, in Home's order (most recently touched first, then Earlier). */
export function bridgeThreads(data: Data, n = 3, now = new Date()): Thread[] {
  const { current, earlier } = homeThreads(data, now);
  return [...current, ...earlier].slice(0, n).map((s) => s.thread);
}

/** True while the activity exists and has neither a doing nor a "to" thread. */
export function needsBridge(data: Data, activityId: Id | undefined): boolean {
  const a = activityId ? data.activities[activityId] : undefined;
  return !!a && !a.doingId && a.toIds.length === 0;
}

/**
 * Attaches the activity "to" the thread with this name, creating it if needed (an existing name,
 * hidden or not, is reused and brought back). A blank name or a missing activity changes nothing.
 */
export function attachToNewThread(
  data: Data,
  activityId: Id,
  name: string,
  now = new Date(),
): { data: Data; thread?: Thread; created: boolean } {
  if (!normalizeName(name) || !data.activities[activityId]) return { data, created: false };
  const created = !findThreadByName(data, name);
  const ensured = ensureThread(data, name, now);
  const id = ensured.thread.id;
  const shown = ensured.thread.hidden ? updateThread(ensured.data, id, { hidden: false }) : ensured.data;
  const next = attachActivity(shown, activityId, id, 'to');
  return { data: next, thread: next.threads[id], created };
}
