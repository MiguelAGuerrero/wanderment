/**
 * The rise (P-73, B-08 slice 1): Return on the trailhead sends your line up as a star. By default it's
 * **lit** — something you're pursuing now (`Activity.lit`); with the done chip it settles at once.
 * Lit lines get quiet choices: **Done it** settles them, **↳ First step** turns the line into a wander
 * (named with your words) with its first step, **Toward…** attaches it to a wander. A lit star's glow
 * fades like warmth; about a month on it looks settled, and it never nags or counts. Pure.
 */
import { applyUndo, UndoEntry } from './diff';
import { attachActivity, ensureThread, findThreadByName, updateThread } from './model';
import { warmth } from './selectors';
import { Activity, Data, Id } from './types';

/** Below this warmth (≈ one month, at the 14-day half-life) a lit line draws as settled. */
export const LIT_FLOOR = 0.25;

/** Whether a lit line still looks lit: its warmth hasn't faded below LIT_FLOOR. Settled lines never do. */
export const looksLit = (a: Pick<Activity, 'lit' | 'occurredAt'>, now = new Date()): boolean =>
  a.lit === true && warmth(new Date(a.occurredAt), now) >= LIT_FLOOR;

/**
 * A lit line's extra glow, 0…1: its warmth while it looks lit, else 0. With the shading off there's no
 * glow (lit and settled still differ by shape and in the spoken name).
 */
export const litGlow = (a: Pick<Activity, 'lit' | 'occurredAt'>, now = new Date(), shading = true): number =>
  shading && looksLit(a, now) ? warmth(new Date(a.occurredAt), now) : 0;

/** Done it: the lit line settles (lit dropped, `settledAt` now). A line that isn't lit is left as it is. */
export function settle(data: Data, activityId: Id, now = new Date()): Data {
  const a = data.activities[activityId];
  if (!a || a.lit !== true) return data;
  const { lit: _lit, ...rest } = a;
  return { ...data, activities: { ...data.activities, [activityId]: { ...rest, settledAt: now.toISOString() } } };
}

/**
 * ↳ First step + Return: the line becomes a wander named with its words — a new one, or the wander
 * that already has that name (a hidden one comes back, as logging to it would) — whose staged step is
 * set to `step` only when it has none (a step is never overwritten); the line is attached to it as
 * doing and settled (the pursuit lives on as the wander). Undefined when the line is gone, or when a
 * step is needed and none was typed (nothing is created).
 */
export function firstStep(data: Data, activityId: Id, step: string, now = new Date()): { data: Data; threadId: Id; created: boolean; stepSet: boolean } | undefined {
  const a = data.activities[activityId];
  if (!a) return undefined;
  const found = findThreadByName(data, a.text);
  const stepSet = !found?.next?.trim();
  if (stepSet && !step.trim()) return undefined;
  let d = data;
  let threadId: Id;
  if (found) {
    threadId = found.id;
    if (found.hidden) d = updateThread(d, threadId, { hidden: false });
  } else {
    const made = ensureThread(d, a.text, now);
    d = made.data;
    threadId = made.thread.id;
  }
  if (stepSet) d = updateThread(d, threadId, { next: step });
  d = settle(attachActivity(d, activityId, threadId, 'doing'), activityId, now);
  return { data: d, threadId, created: !found, stepSet };
}

/**
 * Undo of ↳ First step: takes back exactly what it did (the step, the attach, the settle, and the
 * wander if it made one). If something else has been attached to the wander it made since, the wander
 * stays (nothing may point at a wander that's gone), without the step it set.
 */
export function undoFirstStep(current: Data, entry: UndoEntry, threadId: Id): Data {
  const back = applyUndo(current, entry);
  const t = current.threads[threadId];
  if (back.threads[threadId] || !t) return back;
  const used = Object.values(back.activities).some((a) => a.doingId === threadId || a.toIds.includes(threadId));
  if (!used) return back;
  const set = entry.threads[threadId]?.after?.next;
  return { ...back, threads: { ...back.threads, [threadId]: t.next === set ? { ...t, next: undefined } : t } };
}

/** Toward…: the line goes toward a visible wander (as its doing one). Undefined when refused. */
export function toward(data: Data, activityId: Id, threadId: Id): Data | undefined {
  const t = data.threads[threadId];
  if (!data.activities[activityId] || !t || t.hidden) return undefined;
  return attachActivity(data, activityId, threadId, 'doing');
}

/** What was chosen in the rise; its Undo takes it back. */
export type Choice =
  /** Sent up with the done chip: settled at once; Undo takes the line back out. */
  | { kind: 'done' }
  /** Done it. */
  | { kind: 'settled' }
  /** ↳ First step: the line went toward this wander (made, or found by name). */
  | { kind: 'step'; threadId: Id }
  /** Toward… */
  | { kind: 'toward'; threadId: Id };

/**
 * What the rise's status line says (announced politely), and the toast once the session has ended
 * with Undo still to hand (audit F1): nothing while a line is just lit (no hint lines).
 */
export function riseSaid(data: Data, activityId: Id, did?: Choice): string {
  const name = (id: Id) => data.threads[id]?.name ?? '';
  if (did?.kind === 'done' || did?.kind === 'settled') return 'Settled';
  if (did?.kind === 'toward') return `Toward ${name(did.threadId)}`;
  if (did?.kind === 'step') return data.threads[did.threadId]?.next ? `First step on ${name(did.threadId)}` : `Toward ${name(did.threadId)}`;
  const a = data.activities[activityId];
  const attached = a ? (a.doingId ?? a.toIds[0]) : undefined;
  return attached ? `Logged → ${name(attached)}` : '';
}
