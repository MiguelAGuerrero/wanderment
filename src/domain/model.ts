import { Activity, Data, Id, Thread } from './types';

export const newId = (): Id =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

export function findThreadByName(data: Data, name: string): Thread | undefined {
  const n = normalizeName(name);
  return Object.values(data.threads).find((t) => normalizeName(t.name) === n);
}

/** Creates a thread, or returns the existing one with the same normalized name. */
export function ensureThread(data: Data, name: string, now = new Date()): { data: Data; thread: Thread } {
  const existing = findThreadByName(data, name);
  if (existing) return { data, thread: existing };
  const thread: Thread = {
    id: newId(),
    name: name.trim().replace(/\s+/g, ' '),
    hidden: false,
    createdAt: now.toISOString(),
  };
  return { data: { ...data, threads: { ...data.threads, [thread.id]: thread } }, thread };
}

export interface LogInput {
  text: string;
  doingId?: Id;
  toIds?: Id[];
  occurredAt?: Date;
  note?: string;
  /** If this log came from a thread's next step, that thread's next is cleared. */
  fromNextOf?: Id;
}

/** The thread that owns the "next" for an activity: its doing thread, else its first "to". */
export const nextOwner = (a: Pick<Activity, 'doingId' | 'toIds'>): Id | undefined =>
  a.doingId ?? a.toIds[0];

export function logActivity(data: Data, input: LogInput, now = new Date()): { data: Data; activity: Activity } {
  const text = input.text.trim();
  if (!text) throw new Error('Activity text is required');
  const toIds = [...new Set((input.toIds ?? []).filter((id) => id !== input.doingId))];
  const activity: Activity = {
    id: newId(),
    text,
    occurredAt: (input.occurredAt ?? now).toISOString(),
    createdAt: now.toISOString(),
    doingId: input.doingId,
    toIds,
    note: input.note?.trim() || undefined,
  };
  const threads = { ...data.threads };
  // Logging to a hidden thread brings it back.
  for (const id of [activity.doingId, ...toIds]) {
    if (id && threads[id]?.hidden) threads[id] = { ...threads[id], hidden: false };
  }
  if (input.fromNextOf && threads[input.fromNextOf]) {
    threads[input.fromNextOf] = { ...threads[input.fromNextOf], next: undefined };
  }
  return { data: { ...data, threads, activities: { ...data.activities, [activity.id]: activity } }, activity };
}

export function updateThread(data: Data, id: Id, patch: Partial<Pick<Thread, 'name' | 'next' | 'hidden'>>): Data {
  const t = data.threads[id];
  if (!t) return data;
  const next = patch.next !== undefined ? patch.next.trim() || undefined : t.next;
  const name = patch.name !== undefined ? patch.name.trim().replace(/\s+/g, ' ') || t.name : t.name;
  return { ...data, threads: { ...data.threads, [id]: { ...t, ...patch, name, next } } };
}

export function attachActivity(data: Data, activityId: Id, threadId: Id, as: 'doing' | 'to' = 'to'): Data {
  const a = data.activities[activityId];
  if (!a || !data.threads[threadId]) return data;
  const updated: Activity =
    as === 'doing'
      ? { ...a, doingId: threadId, toIds: a.toIds.filter((id) => id !== threadId) }
      : { ...a, toIds: a.doingId === threadId || a.toIds.includes(threadId) ? a.toIds : [...a.toIds, threadId] };
  return { ...data, activities: { ...data.activities, [activityId]: updated } };
}

export interface ActivityPatch {
  text?: string;
  note?: string;
  occurredAt?: string;
  /** null removes the doing thread. */
  doingId?: Id | null;
  toIds?: Id[];
}

/** Edits an activity. Text can't become empty; "to" never repeats the doing thread. */
export function editActivity(data: Data, id: Id, patch: ActivityPatch): Data {
  const a = data.activities[id];
  if (!a) return data;
  const text = patch.text !== undefined ? patch.text.trim() || a.text : a.text;
  const doingId = patch.doingId === null ? undefined : patch.doingId !== undefined && data.threads[patch.doingId] ? patch.doingId : a.doingId;
  const toIds = [...new Set((patch.toIds ?? a.toIds).filter((t) => t !== doingId && (data.threads[t] || a.toIds.includes(t))))];
  const note = patch.note !== undefined ? patch.note.trim() || undefined : a.note;
  const occurredAt = patch.occurredAt ?? a.occurredAt;
  return { ...data, activities: { ...data.activities, [id]: { ...a, text, doingId, toIds, note, occurredAt } } };
}

export function deleteActivity(data: Data, id: Id): Data {
  if (!data.activities[id]) return data;
  const { [id]: _gone, ...activities } = data.activities;
  return { ...data, activities };
}
