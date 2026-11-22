import { Activity, Data, Id, Thread } from './types';

export const newId = (): Id =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const normalizeName = (name: string) => name.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();

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
  /** The step as it was when it was loaded: if given, a step edited since then is left alone. */
  fromNextText?: string;
}

/** The thread that owns the "next" for an activity: its doing thread, else its first "to". */
export const nextOwner = (a: Pick<Activity, 'doingId' | 'toIds'>): Id | undefined =>
  a.doingId ?? a.toIds[0];

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

/** Another thread (hidden ones too) whose normalized name equals `name`; blank names match none. */
function nameTakenBy(data: Data, id: Id, name: string): Thread | undefined {
  const n = normalizeName(name);
  if (!n) return undefined;
  return Object.values(data.threads).find((t) => t.id !== id && normalizeName(t.name) === n);
}

/**
 * A name another thread already has keeps the old name, like a blank one (merging is cut).
 * Hiding a thread also unmarks it as what it's for, in the same change (so one Undo restores
 * both): every declared why is a visible one.
 */
export function updateThread(data: Data, id: Id, patch: Partial<Pick<Thread, 'name' | 'next' | 'hidden'>>): Data {
  const t = data.threads[id];
  if (!t) return data;
  const next = patch.next !== undefined ? patch.next.trim() || undefined : t.next;
  const name =
    patch.name !== undefined && !nameTakenBy(data, id, patch.name) ? patch.name.trim().replace(/\s+/g, ' ') || t.name : t.name;
  const updated: Thread = { ...t, ...patch, name, next };
  if (patch.hidden) delete updated.declaredAt;
  return { ...data, threads: { ...data.threads, [id]: updated } };
}

/** At most this many threads are marked as what it's for at once (D-4). */
export const MAX_WHYS = 3;

/**
 * Threads marked as what it's for ("whys"): visible ones only, oldest mark first (id breaks ties).
 * Not capped: an imported backup can hold more than MAX_WHYS, and every one stays undeclarable.
 */
export function declaredWhys(data: Data): Thread[] {
  return Object.values(data.threads)
    .filter((t) => t.declaredAt && !t.hidden)
    .sort((a, b) => a.declaredAt!.localeCompare(b.declaredAt!) || a.id.localeCompare(b.id));
}

export type DeclareResult =
  | { ok: true; data: Data }
  /** Already MAX_WHYS whys: nothing changes, and these are the ones a swap can give up. */
  | { ok: false; reason: 'full'; declared: Thread[] }
  /** A hidden thread can't be what it's for (unhide it first). */
  | { ok: false; reason: 'hidden' };

/** Marks a thread as what it's for. Already marked (or gone): the same data, untouched. */
export function declareThread(data: Data, id: Id, now = new Date()): DeclareResult {
  const t = data.threads[id];
  if (!t || t.declaredAt) return { ok: true, data };
  if (t.hidden) return { ok: false, reason: 'hidden' };
  const declared = declaredWhys(data);
  if (declared.length >= MAX_WHYS) return { ok: false, reason: 'full', declared };
  return { ok: true, data: { ...data, threads: { ...data.threads, [id]: { ...t, declaredAt: now.toISOString() } } } };
}

/** Unmarks a thread, leaving nothing behind but the thread. Not marked: the same data. */
export function undeclareThread(data: Data, id: Id): Data {
  const t = data.threads[id];
  if (!t?.declaredAt) return data;
  const { declaredAt: _gone, ...rest } = t;
  return { ...data, threads: { ...data.threads, [id]: rest } };
}

/** Gives up one why for another in a single change (so one Undo reverts both). */
export function swapWhy(data: Data, outId: Id, inId: Id, now = new Date()): Data {
  const out = data.threads[outId];
  const into = data.threads[inId];
  if (!out?.declaredAt || !into || into.declaredAt || into.hidden) return data;
  // Not through declareThread: a swap never grows the set, even when an import left it over the cap.
  const swapped = undeclareThread(data, outId);
  return { ...swapped, threads: { ...swapped.threads, [inId]: { ...into, declaredAt: now.toISOString() } } };
}

export type RenameResult = { ok: true; data: Data } | { ok: false; reason: 'taken'; other: Thread };

/** Renames a thread, or refuses (data untouched) when another thread already has that name. */
export function renameThread(data: Data, id: Id, name: string): RenameResult {
  const own = data.threads[id];
  // Keeping its own name (or recasing it) is never refused, even beside an imported twin.
  if (own && normalizeName(name) === normalizeName(own.name)) {
    const trimmed = name.normalize('NFC').trim().replace(/\s+/g, ' ');
    return { ok: true, data: trimmed && trimmed !== own.name ? { ...data, threads: { ...data.threads, [id]: { ...own, name: trimmed } } } : data };
  }
  const other = nameTakenBy(data, id, name);
  if (other) return { ok: false, reason: 'taken', other };
  return { ok: true, data: updateThread(data, id, { name }) };
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

/** An activity's text or note as it's saved (empty: no change to the text, no note). */
export const savedForm = (typed: string) => typed.trim();

/** Edits an activity. Text can't become empty; "to" never repeats the doing thread. */
export function editActivity(data: Data, id: Id, patch: ActivityPatch): Data {
  const a = data.activities[id];
  if (!a) return data;
  const text = patch.text !== undefined ? savedForm(patch.text) || a.text : a.text;
  const doingId = patch.doingId === null ? undefined : patch.doingId !== undefined && data.threads[patch.doingId] ? patch.doingId : a.doingId;
  const toIds = [...new Set((patch.toIds ?? a.toIds).filter((t) => t !== doingId && (data.threads[t] || a.toIds.includes(t))))];
  const note = patch.note !== undefined ? savedForm(patch.note) || undefined : a.note;
  const occurredAt = patch.occurredAt ?? a.occurredAt;
  return { ...data, activities: { ...data.activities, [id]: { ...a, text, doingId, toIds, note, occurredAt } } };
}

export function deleteActivity(data: Data, id: Id): Data {
  if (!data.activities[id]) return data;
  const { [id]: _gone, ...activities } = data.activities;
  return { ...data, activities };
}
