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
}

export interface Data {
  version: 1;
  threads: Record<Id, Thread>;
  activities: Record<Id, Activity>;
}

export const emptyData = (): Data => ({ version: 1, threads: {}, activities: {} });
