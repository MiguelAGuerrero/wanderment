/**
 * What is left of the old app's model (P-89): ids and names (used everywhere), what an import
 * preview counts, a field's saved form, and logging one line — only for a Return the old app kept
 * across its reload into this version (`useStore.logMarked`). The rest moved to test support
 * (`src/test/records.ts`): the storage tests still build wanders and activities with it.
 */
import { Activity, Data, Id, Thread } from './types';

export const newId = (): Id =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const normalizeName = (name: string) => name.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();

export interface LogInput {
  text: string;
  doingId?: Id;
  toIds?: Id[];
  occurredAt?: Date;
  note?: string;
  /** If this log came from a thread's next step, that thread's next is cleared. */
  fromNextOf?: Id;
  /** The step as it was when it was loaded: if given, a step edited since then is left alone. */
  fromNextText?: string;
  /** P-73: sent up from the trailhead without the done chip — a lit line (nothing else is ever lit). */
  lit?: boolean;
  /** P-73: sent up with the done chip — settled at once (`settledAt` now). */
  settled?: boolean;
}

export function logActivity(data: Data, input: LogInput, now = new Date()): { data: Data; activity: Activity } {
  const text = input.text.trim();
  if (!text) throw new Error('Activity text is required');
  // Only threads that exist: a stale id (e.g. a draft chip whose thread was undone) is dropped.
  const doingId = input.doingId && data.threads[input.doingId] ? input.doingId : undefined;
  const toIds = [...new Set((input.toIds ?? []).filter((id) => id !== doingId && data.threads[id]))];
  const activity: Activity = {
    id: newId(),
    text,
    occurredAt: (input.occurredAt ?? now).toISOString(),
    createdAt: now.toISOString(),
    doingId,
    toIds,
    note: input.note?.trim() || undefined,
    // Only present when set, so every other log reads exactly as before (absent = settled).
    ...(input.lit && !input.settled && { lit: true as const }),
    ...(input.settled && { settledAt: now.toISOString() }),
  };
  const threads = { ...data.threads };
  // Logging to a hidden thread brings it back.
  for (const id of [activity.doingId, ...toIds]) {
    if (id && threads[id]?.hidden) threads[id] = { ...threads[id], hidden: false };
  }
  const staged = input.fromNextOf ? threads[input.fromNextOf] : undefined;
  if (staged?.next && (input.fromNextText === undefined || staged.next === input.fromNextText)) {
    threads[staged.id] = { ...staged, next: undefined };
  }
  return { data: { ...data, threads, activities: { ...data.activities, [activity.id]: activity } }, activity };
}

/**
 * Threads marked as what it's for ("whys"): visible ones only, oldest mark first (id breaks ties).
 * Not capped: an imported backup can hold more than MAX_WHYS, and every one stays undeclarable.
 */
export function declaredWhys(data: Data): Thread[] {
  return Object.values(data.threads)
    .filter((t) => t.declaredAt && !t.hidden)
    .sort((a, b) => a.declaredAt!.localeCompare(b.declaredAt!) || a.id.localeCompare(b.id));
}

/** An activity's text or note as it's saved (empty: no change to the text, no note). */
export const savedForm = (typed: string) => typed.trim();
