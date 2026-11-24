/**
 * Core data model.
 *
 * An Activity is a one-off thing you did. A Thread is an ongoing pursuit,
 * named as an action ("practice drawing"). Links between threads are never
 * stored directly: they are derived from activities (doing → to).
 * All references are by id, so renaming a thread never rewrites history.
 */

export type Id = string;

export interface Thread {
  id: Id;
  name: string;
  /** The single visible "next step" for this thread, if any. */
  next?: string;
  hidden: boolean;
  createdAt: string; // ISO
  /** When it was marked as what it’s for (a declared "why"); absent when it isn’t one. */
  declaredAt?: string; // ISO
}

export interface Activity {
  id: Id;
  text: string;
  /** When it happened (can be backdated). */
  occurredAt: string; // ISO
  createdAt: string; // ISO
  /** The thread you were doing, if any. */
  doingId?: Id;
  /** What it was to (zero or more threads). */
  toIds: Id[];
  note?: string;
  /**
   * P-73 (B-08): a line sent up from the trailhead without the done chip is **lit** — something
   * you're pursuing now. Absent = settled (every other log, and everything older). Only ever `true`.
   */
  lit?: true;
  /** When it was settled (Done it, or at once with the done chip); absent for older data. */
  settledAt?: string; // ISO
}

/**
 * B-11 groundwork (P-85): a routine — a sequence of steps kept to be run again — or, with `named`
 * false, an unnamed sequence kept so its words can find it. Only its identity and what the database
 * keeps in columns is fixed here. Everything still being designed (items, the divider and repeat
 * number, blanks and the values used for them, waits, reactions) is carried as further fields:
 * stored whole, exported whole, never interpreted or checked by storage. P-86 gives them types.
 */
export interface Routine {
  id: Id;
  /** Its name, or for an unnamed one the words it was made from. */
  words: string;
  named: boolean;
  createdAt: string; // ISO
  /** When it was taken out of the lists; absent while it's there. */
  removedAt?: string; // ISO
  [field: string]: unknown;
}

/**
 * B-11 groundwork (P-85): a routine being carried out. As with `Routine`, only identity and the
 * database's columns are fixed; frames, the place and round, blank values, what is waited on,
 * this-run-only changes and a pause reason are carried as further fields.
 */
export interface Run {
  id: Id;
  /** The routine it runs. */
  routineId: Id;
  /** The run it was started inside, for a child run. */
  parentRunId?: Id;
  startedAt: string; // ISO
  endedAt?: string; // ISO
  waitingSince?: string; // ISO
  [field: string]: unknown;
}

/**
 * Every kind of record the app stores, in the order they are read and written (P-85). This is the one
 * list: the backup format, the fallback blob, the journal, undo, hand-over, import and the database
 * layer all go through it, so a kind added here can't be silently left out of one of them. Each of
 * those keeps what it needs per collection in a `Record<Collection, …>`, which won't compile until
 * the new kind is there too.
 */
export const COLLECTIONS = ['threads', 'activities', 'routines', 'runs'] as const;
export type Collection = (typeof COLLECTIONS)[number];
/** One record of a collection. */
export type RecordOf<K extends Collection> = Data[K][Id];

/** What each collection is called in messages, and the data format that first had it. */
export const COLLECTION_INFO = {
  threads: { a: 'A wander', one: 'wander', many: 'wanders', since: 1 },
  activities: { a: 'An activity', one: 'activity', many: 'activities', since: 1 },
  routines: { a: 'A routine', one: 'routine', many: 'routines', since: 2 },
  runs: { a: 'A run', one: 'run', many: 'runs', since: 2 },
} as const satisfies Record<Collection, { a: string; one: string; many: string; since: number }>;

/**
 * The data (and backup) format written now, always, whatever the data holds. 1: wanders and
 * activities. 2 (P-85): routines and runs too. `migrateData` reads both and refuses anything newer.
 */
export const DATA_VERSION = 2;

export interface Data {
  version: typeof DATA_VERSION;
  threads: Record<Id, Thread>;
  activities: Record<Id, Activity>;
  routines: Record<Id, Routine>;
  runs: Record<Id, Run>;
}

export const emptyData = (): Data => ({ version: DATA_VERSION, threads: {}, activities: {}, routines: {}, runs: {} });
