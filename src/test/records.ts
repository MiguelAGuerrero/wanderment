/**
 * TEST SUPPORT ONLY (P-89) — never imported by app code (`src/test/guard.test.ts` checks).
 *
 * The old app is retired, and with it the functions that made and changed wanders and activities.
 * The storage tests still need such records — a declared wander, a hidden one, lit and settled
 * lines, notes, links — and need to change them the way a page does, so the REAL persistence module
 * journals, saves, hands over and undoes them. So the record builders below are the old app's own,
 * moved here word for word from `domain/model.ts` and `domain/rise.ts` (b50ffec; `logActivity` stays
 * in model.ts, which the store still needs for one case), and `edit` /
 * `person` put their results in the store exactly as the old actions did: `data` (and, for the
 * actions that had one, the Undo entry) through `setState`, which is what persistence subscribes to.
 */
import { UndoEntry, undoEntry } from '@/domain/diff';
import { declaredWhys, LogInput, logActivity, newId, normalizeName, savedForm } from '@/domain/model';
import { Activity, Data, Id, Thread } from '@/domain/types';

// ───────── the old app's record builders, verbatim ─────────

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

/** The thread that owns the "next" for an activity: its doing thread, else its first "to". */
export const nextOwner = (a: Pick<Activity, 'doingId' | 'toIds'>): Id | undefined =>
  a.doingId ?? a.toIds[0];

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

// ───────── from domain/rise.ts ─────────

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

/** Toward…: the line goes toward a visible wander (as its doing one). Undefined when refused. */
export function toward(data: Data, activityId: Id, threadId: Id): Data | undefined {
  const t = data.threads[threadId];
  if (!data.activities[activityId] || !t || t.hidden) return undefined;
  return attachActivity(data, activityId, threadId, 'doing');
}

// ───────── putting them in the store, as an action did ─────────

/** The part of the store these helpers touch (the real `useStore` of a page load). */
export interface DataStore {
  getState(): { data: Data; undo?: UndoEntry; storage: { state: string; reconnecting?: boolean } };
  setState(patch: { data: Data; undo?: UndoEntry }): void;
}

/**
 * One change to the data, made the way a store action makes it: the new data is set on the store, and
 * the persistence module — subscribed to the store — journals and saves it. `undoable`: it leaves an
 * Undo entry (as log, hide, declare, attach and delete did; edits such as a note or a rename did not).
 *
 * A page that doesn't hold the data can't change it (the store's gate refuses every action there), so
 * a test must not either: this throws instead of quietly going behind the gate.
 */
export function edit(store: DataStore, change: (data: Data) => Data, opts: { undoable?: boolean } = {}): void {
  const { data, storage } = store.getState();
  if (storage.state === 'blocked' || (storage.state === 'ready' && storage.reconnecting)) throw new Error('test support: `edit` on a page that does not hold the data — use a real (gated) store action to test a refusal');
  const next = change(data);
  if (next === data) return;
  store.setState(opts.undoable ? { data: next, undo: undoEntry(data, next) } : { data: next });
}

/**
 * What a person did in the old app, by the names its store actions had, each with the old action's
 * effect on the data and on Undo. For seeding and changing records in storage tests only.
 */
export function person(store: DataStore) {
  const data = () => store.getState().data;
  return {
    /** Return in a log box: a new activity (Undo takes it away). `lit`: sent up from the trailhead; `settled`: with the done chip. */
    log(text: string, input: Omit<LogInput, 'text'> = {}): Id {
      const res = logActivity(data(), { ...input, text });
      edit(store, () => res.data, { undoable: true });
      return res.activity.id;
    },
    /** A wander by this name: made, or the one there is. No Undo. */
    createThread(name: string): Id {
      const res = ensureThread(data(), name);
      edit(store, () => res.data);
      return res.thread.id;
    },
    setNext: (threadId: Id, next: string) => edit(store, (d) => updateThread(d, threadId, { next })),
    renameThread(threadId: Id, name: string): RenameResult {
      const res = renameThread(data(), threadId, name);
      if (res.ok) edit(store, () => res.data);
      return res;
    },
    setHidden: (threadId: Id, hidden: boolean) => edit(store, (d) => updateThread(d, threadId, { hidden }), { undoable: true }),
    declareThread(threadId: Id): DeclareResult {
      const res = declareThread(data(), threadId);
      if (res.ok) edit(store, () => res.data, { undoable: true });
      return res;
    },
    undeclareThread: (threadId: Id) => edit(store, (d) => undeclareThread(d, threadId), { undoable: true }),
    swapWhy: (outId: Id, inId: Id) => edit(store, (d) => swapWhy(d, outId, inId), { undoable: true }),
    attach: (activityId: Id, threadId: Id) => edit(store, (d) => attachActivity(d, activityId, threadId), { undoable: true }),
    /** Attaches "to" the wander with this name, making it if needed; one Undo takes back both. */
    attachToNew(activityId: Id, name: string): Id {
      const made = ensureThread(data(), name);
      edit(store, () => attachActivity(made.data, activityId, made.thread.id), { undoable: true });
      return made.thread.id;
    },
    updateActivity: (activityId: Id, patch: ActivityPatch) => edit(store, (d) => editActivity(d, activityId, patch)),
    removeActivity: (activityId: Id) => edit(store, (d) => deleteActivity(d, activityId), { undoable: true }),
    /** Done it: a lit line settles (Undo makes it lit again). */
    settle: (activityId: Id) => edit(store, (d) => settle(d, activityId), { undoable: true }),
    /** ↳ First step: the line becomes a wander with that step. */
    firstStep(activityId: Id, step: string): Id | undefined {
      const res = firstStep(data(), activityId, step);
      if (res) edit(store, () => res.data, { undoable: true });
      return res?.threadId;
    },
    /** Toward…: the line goes toward a visible wander. */
    toward(activityId: Id, threadId: Id) {
      const next = toward(data(), activityId, threadId);
      if (next) edit(store, () => next, { undoable: true });
    },
  };
}
