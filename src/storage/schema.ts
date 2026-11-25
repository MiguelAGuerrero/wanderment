import { Db } from './db';

/**
 * Schema migrations, applied in order. `PRAGMA user_version` records how many have run.
 * Never edit a released migration — append a new one.
 */
export const MIGRATIONS: string[] = [
  // 1: threads, activities and their "to" links, plus small settings.
  `
  CREATE TABLE threads (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    next TEXT,
    hidden INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE TABLE activities (
    id TEXT PRIMARY KEY NOT NULL,
    text TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    doing_id TEXT,
    note TEXT
  );
  CREATE INDEX activities_occurred_at ON activities (occurred_at);
  CREATE INDEX activities_doing_id ON activities (doing_id);
  CREATE TABLE activity_to (
    activity_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    thread_id TEXT NOT NULL,
    PRIMARY KEY (activity_id, position)
  );
  CREATE INDEX activity_to_thread_id ON activity_to (thread_id);
  CREATE TABLE settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
  // 2: when a thread was marked as what it's for (NULL: it isn't). Old rows read NULL.
  `ALTER TABLE threads ADD COLUMN declared_at TEXT;`,
  // 3 (P-73): a line sent up lit (1) — old rows, and an older copy's rewrites, read 0: settled — and
  // when it was settled (NULL: never stamped).
  `
  ALTER TABLE activities ADD COLUMN lit INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE activities ADD COLUMN settled_at TEXT;
  `,
  // 4 (P-85, B-11 groundwork): routines and runs. Added only: no existing table or row is touched, and
  // nothing is put in them here. A column for what identifies a record or may be asked about; every
  // other field of the record (still being designed) in `body`, a JSON object. `named` 0: an unnamed
  // sequence kept so its words can find it — the same table.
  `
  CREATE TABLE routines (
    id TEXT PRIMARY KEY NOT NULL,
    words TEXT NOT NULL,
    named INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    removed_at TEXT,
    body TEXT NOT NULL DEFAULT '{}'
  );
  CREATE TABLE runs (
    id TEXT PRIMARY KEY NOT NULL,
    routine_id TEXT NOT NULL,
    parent_run_id TEXT,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    waiting_since TEXT,
    body TEXT NOT NULL DEFAULT '{}'
  );
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

/** Brings the database up to the latest schema. Returns the version it started from. */
export async function migrateSchema(db: Db): Promise<number> {
  const [{ user_version: from }] = await db.all<{ user_version: number }>('PRAGMA user_version');
  if (from > SCHEMA_VERSION) {
    throw new Error(`This data was saved by a newer version of the app (schema ${from}). Reload to update.`);
  }
  for (let v = from; v < SCHEMA_VERSION; v++) {
    await db.transaction(async () => {
      await db.exec(MIGRATIONS[v]);
      await db.exec(`PRAGMA user_version = ${v + 1}`);
    });
  }
  return from;
}
