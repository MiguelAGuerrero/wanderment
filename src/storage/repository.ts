import { DataChanges, deletesOf, upsertsOf } from '@/domain/diff';
import { defaultSettings, Settings } from '@/domain/migrate';
import { Activity, Collection, COLLECTIONS, Data, emptyData, Id, RecordOf, Routine, Run, Thread } from '@/domain/types';

import { Db } from './db';

interface ThreadRow {
  id: string;
  name: string;
  next: string | null;
  hidden: number;
  created_at: string;
  declared_at: string | null;
}
interface ActivityRow {
  id: string;
  text: string;
  occurred_at: string;
  created_at: string;
  doing_id: string | null;
  note: string | null;
  lit: number;
  settled_at: string | null;
}
interface ToRow {
  activity_id: string;
  thread_id: string;
}

async function loadThreads(db: Db, threads: Record<Id, Thread>) {
  for (const r of await db.all<ThreadRow>('SELECT * FROM threads')) {
    threads[r.id] = {
      id: r.id,
      name: r.name,
      next: r.next ?? undefined,
      hidden: r.hidden === 1,
      createdAt: r.created_at,
      declaredAt: r.declared_at ?? undefined,
    };
  }
}

async function loadActivities(db: Db, activities: Record<Id, Activity>) {
  for (const r of await db.all<ActivityRow>('SELECT * FROM activities')) {
    activities[r.id] = {
      id: r.id,
      text: r.text,
      occurredAt: r.occurred_at,
      createdAt: r.created_at,
      doingId: r.doing_id ?? undefined,
      toIds: [],
      note: r.note ?? undefined,
      // Only when set (P-73): absent = settled, as every older activity reads.
      ...(r.lit === 1 && { lit: true as const }),
      ...(r.settled_at && { settledAt: r.settled_at }),
    };
  }
  for (const r of await db.all<ToRow>('SELECT activity_id, thread_id FROM activity_to ORDER BY activity_id, position')) {
    activities[r.activity_id]?.toIds.push(r.thread_id);
  }
}

/** A whole-record write: a column left out here would be wiped by every edit to the thread. */
const upsertThread = (db: Db, t: Thread) =>
  db.run('INSERT OR REPLACE INTO threads (id, name, next, hidden, created_at, declared_at) VALUES (?, ?, ?, ?, ?, ?)', [
    t.id,
    t.name,
    t.next ?? null,
    t.hidden ? 1 : 0,
    t.createdAt,
    t.declaredAt ?? null,
  ]);

/** A whole-record write, too: a column left out here (P-73's lit, settled_at) would be wiped by every edit. */
async function upsertActivity(db: Db, a: Activity) {
  await db.run('INSERT OR REPLACE INTO activities (id, text, occurred_at, created_at, doing_id, note, lit, settled_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
    a.id,
    a.text,
    a.occurredAt,
    a.createdAt,
    a.doingId ?? null,
    a.note ?? null,
    a.lit === true ? 1 : 0,
    a.settledAt ?? null,
  ]);
  await db.run('DELETE FROM activity_to WHERE activity_id = ?', [a.id]);
  for (const [position, threadId] of a.toIds.entries()) {
    await db.run('INSERT INTO activity_to (activity_id, position, thread_id) VALUES (?, ?, ?)', [a.id, position, threadId]);
  }
}

async function deleteActivity(db: Db, id: string) {
  await db.run('DELETE FROM activity_to WHERE activity_id = ?', [id]);
  await db.run('DELETE FROM activities WHERE id = ?', [id]);
}

interface RoutineRow {
  id: string;
  words: string;
  named: number;
  created_at: string;
  removed_at: string | null;
  body: string;
}
interface RunRow {
  id: string;
  routine_id: string;
  parent_run_id: string | null;
  started_at: string;
  ended_at: string | null;
  waiting_since: string | null;
  body: string;
}

/**
 * The fields of a routine or run that have no column, as one JSON object. Damaged, it reads as no
 * such fields: the record and everything else still load.
 */
function bodyOf(json: string): Record<string, unknown> {
  try {
    const body: unknown = JSON.parse(json);
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

async function loadRoutines(db: Db, routines: Record<Id, Routine>) {
  for (const r of await db.all<RoutineRow>('SELECT * FROM routines')) {
    // The columns last: they are the record's own, whatever the body says.
    routines[r.id] = { ...bodyOf(r.body), id: r.id, words: r.words, named: r.named === 1, createdAt: r.created_at, ...(r.removed_at !== null && { removedAt: r.removed_at }) };
  }
}

/** A whole-record write: the fields with a column go there, every other field goes in the body. */
const upsertRoutine = (db: Db, routine: Routine) => {
  const { id, words, named, createdAt, removedAt, ...body } = routine;
  return db.run('INSERT OR REPLACE INTO routines (id, words, named, created_at, removed_at, body) VALUES (?, ?, ?, ?, ?, ?)', [id, words, named ? 1 : 0, createdAt, removedAt ?? null, JSON.stringify(body)]);
};

async function loadRuns(db: Db, runs: Record<Id, Run>) {
  for (const r of await db.all<RunRow>('SELECT * FROM runs')) {
    runs[r.id] = {
      ...bodyOf(r.body),
      id: r.id,
      routineId: r.routine_id,
      ...(r.parent_run_id !== null && { parentRunId: r.parent_run_id }),
      startedAt: r.started_at,
      ...(r.ended_at !== null && { endedAt: r.ended_at }),
      ...(r.waiting_since !== null && { waitingSince: r.waiting_since }),
    };
  }
}

/** A whole-record write, as for a routine. */
const upsertRun = (db: Db, run: Run) => {
  const { id, routineId, parentRunId, startedAt, endedAt, waitingSince, ...body } = run;
  return db.run('INSERT OR REPLACE INTO runs (id, routine_id, parent_run_id, started_at, ended_at, waiting_since, body) VALUES (?, ?, ?, ?, ?, ?, ?)', [
    id,
    routineId,
    parentRunId ?? null,
    startedAt,
    endedAt ?? null,
    waitingSince ?? null,
    JSON.stringify(body),
  ]);
};

/** How one collection is kept in the database. */
interface Stored<T> {
  /** Every table holding it, the one with a row per record first. */
  tables: [string, ...string[]];
  /** Reads every record into `records`: one query per table, never one per row. */
  load(db: Db, records: Record<Id, T>): Promise<void>;
  /** A whole-record write. */
  upsert(db: Db, record: T): Promise<unknown>;
  remove(db: Db, id: Id): Promise<unknown>;
}

/**
 * The database side of `COLLECTIONS` (P-85): loading, saving, replacing and "is it empty" all go
 * through this, so a collection can't be loaded but not saved, or saved but not cleared.
 */
export const REPOSITORY: { [K in Collection]: Stored<RecordOf<K>> } = {
  threads: { tables: ['threads'], load: loadThreads, upsert: upsertThread, remove: (db, id) => db.run('DELETE FROM threads WHERE id = ?', [id]) },
  activities: { tables: ['activities', 'activity_to'], load: loadActivities, upsert: upsertActivity, remove: deleteActivity },
  routines: { tables: ['routines'], load: loadRoutines, upsert: upsertRoutine, remove: (db, id) => db.run('DELETE FROM routines WHERE id = ?', [id]) },
  runs: { tables: ['runs'], load: loadRuns, upsert: upsertRun, remove: (db, id) => db.run('DELETE FROM runs WHERE id = ?', [id]) },
};

const stored = (c: Collection) => REPOSITORY[c] as unknown as Stored<{ id: Id }>;

export async function loadData(db: Db): Promise<Data> {
  const data = emptyData();
  for (const c of COLLECTIONS) await stored(c).load(db, data[c]);
  return data;
}

/**
 * Writes one diff in a single transaction, so a crash never leaves half a change. A diff that
 * doesn't mention a collection (a journal written before it existed) changes nothing in it.
 */
export async function saveChanges(db: Db, changes: Partial<DataChanges>): Promise<void> {
  await db.transaction(async () => {
    for (const c of COLLECTIONS) {
      for (const r of upsertsOf(changes, c)) await stored(c).upsert(db, r);
      for (const id of deletesOf(changes, c)) await stored(c).remove(db, id);
    }
  });
}

/** Replaces everything (used for the one-time move from the legacy store). */
export async function replaceAll(db: Db, data: Data): Promise<void> {
  await db.transaction(async () => {
    // Tables that point at others first.
    const tables = [...COLLECTIONS].reverse().flatMap((c) => [...stored(c).tables].reverse());
    await db.exec(tables.map((t) => `DELETE FROM ${t};`).join(' '));
    for (const c of COLLECTIONS) for (const r of Object.values(data[c])) await stored(c).upsert(db, r);
  });
}

/** A JSON list of strings; anything damaged reads as empty (these are conveniences, not data). */
function stringList(json: string): string[] {
  try {
    const list = JSON.parse(json);
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export async function loadSettings(db: Db): Promise<Settings> {
  const settings = defaultSettings();
  for (const r of await db.all<{ key: string; value: string }>('SELECT key, value FROM settings')) {
    if (r.key === 'showShading') settings.showShading = r.value !== 'false';
    if (r.key === 'recentSearches') settings.recentSearches = stringList(r.value);
    if (r.key === 'leftAsIs') settings.leftAsIs = stringList(r.value);
    if (r.key === 'whyOfferOff' && r.value === 'true') settings.whyOfferOff = true;
    if (r.key === 'firstRunDone' && r.value === 'true') settings.firstRunDone = true;
  }
  return settings;
}

export async function saveSettings(db: Db, settings: Settings): Promise<void> {
  await db.transaction(async () => {
    await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['showShading', String(settings.showShading)]);
    await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['recentSearches', JSON.stringify(settings.recentSearches)]);
    await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['leftAsIs', JSON.stringify(settings.leftAsIs)]);
    // Additive (P-34): only ever turned on, so it's written once it is.
    if (settings.whyOfferOff) await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['whyOfferOff', 'true']);
    // Additive (P-36), the same way.
    if (settings.firstRunDone) await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['firstRunDone', 'true']);
  });
}

/** Small bookkeeping values that aren't settings (kept in the settings table under "meta:"). */
export async function loadMeta(db: Db, key: string): Promise<string | undefined> {
  const rows = await db.all<{ value: string }>('SELECT value FROM settings WHERE key = ?', [`meta:${key}`]);
  return rows[0]?.value;
}

export async function saveMeta(db: Db, key: string, value: string): Promise<void> {
  await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [`meta:${key}`, value]);
}

/** No record of any kind. */
export async function isEmpty(db: Db): Promise<boolean> {
  const [{ n }] = await db.all<{ n: number }>(`SELECT ${COLLECTIONS.map((c) => `(SELECT COUNT(*) FROM ${stored(c).tables[0]})`).join(' + ')} AS n`);
  return n === 0;
}
