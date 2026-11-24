import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { diffData } from '@/domain/diff';
import { parseLegacyState } from '@/domain/migrate';
import { attachActivity, declareThread, editActivity, ensureThread, logActivity, undeclareThread, updateThread } from '@/domain/model';
import { settle } from '@/domain/rise';
import { COLLECTIONS, Data, emptyData, Routine, Run } from '@/domain/types';

import { nodeDb } from './nodeDb';
import { Db } from './db';
import { isEmpty, loadData, loadSettings, replaceAll, REPOSITORY, saveChanges, saveSettings } from './repository';
import { MIGRATIONS, migrateSchema, SCHEMA_VERSION } from './schema';

const at = '2026-11-01T10:00:00.000Z';
const at2 = '2026-11-02T09:30:00.000Z';
const legacyJson = readFileSync(join(__dirname, 'fixtures/legacy-v1.json'), 'utf8');
let current: ReturnType<typeof nodeDb> | undefined;
afterEach(() => {
  current?.close();
  current = undefined;
});

async function freshDb() {
  const fresh = nodeDb();
  current = fresh;
  await migrateSchema(fresh);
  return fresh;
}

describe('schema', () => {
  it('migrates a new database to the latest version, and is a no-op the second time', async () => {
    const fresh = (current = nodeDb());
    expect(await migrateSchema(fresh)).toBe(0);
    expect(await migrateSchema(fresh)).toBe(SCHEMA_VERSION);
    const [{ user_version }] = await fresh.all<{ user_version: number }>('PRAGMA user_version');
    expect(user_version).toBe(SCHEMA_VERSION);
    expect(await isEmpty(fresh)).toBe(true);
  });

  it('refuses data written by a newer schema instead of corrupting it', async () => {
    const fresh = (current = nodeDb());
    await fresh.exec(`PRAGMA user_version = ${SCHEMA_VERSION + 1}`);
    await expect(migrateSchema(fresh)).rejects.toThrow(/newer version/);
  });
});

describe('persisted format v1 (JSON blob) → v2 (SQLite)', () => {
  it('parses and repairs the first release’s saved state', () => {
    const legacy = parseLegacyState(legacyJson)!;
    expect(legacy.settings.showShading).toBe(false);
    expect(legacy.data.threads['t-gym'].name).toBe('get stronger');
    // The doing thread is dropped from "to", duplicates go, blank notes go.
    expect(legacy.data.activities.a2).toMatchObject({ doingId: 't-gym', toIds: ['t-guitar'], note: undefined });
    expect(parseLegacyState(null)).toBeUndefined();
    expect(parseLegacyState('not json')).toBeUndefined();
  });

  it('moves everything into SQLite and reads back the same data', async () => {
    const db = await freshDb();
    const legacy = parseLegacyState(legacyJson)!;
    await replaceAll(db, legacy.data);
    await saveSettings(db, legacy.settings);
    expect(await loadData(db)).toEqual(legacy.data);
    expect(await loadSettings(db)).toEqual({ showShading: false, recentSearches: [], leftAsIs: [] });
    const settings = { showShading: true, recentSearches: ['guitar', 'run'], leftAsIs: ['a3'] };
    await saveSettings(db, settings);
    expect(await loadSettings(db)).toEqual(settings);
  });
});

describe('saving changes', () => {
  it('writes only diffs and round-trips logs, renames, attaches and deletes, keeping "to" order', async () => {
    const db = await freshDb();
    let data = emptyData();
    const a = ensureThread(data, 'practice drawing');
    const b = ensureThread(a.data, 'make apparel');
    const c = ensureThread(b.data, 'sell prints');
    let prev = data;
    data = c.data;
    const logged = logActivity(data, { text: 'gestures', doingId: a.thread.id, toIds: [c.thread.id, b.thread.id] });
    data = logged.data;
    await saveChanges(db, diffData(prev, data));
    expect(await loadData(db)).toEqual(data);

    prev = data;
    data = updateThread(data, a.thread.id, { name: 'draw', next: 'hands' });
    const loose = logActivity(data, { text: 'loose' });
    data = attachActivity(loose.data, loose.activity.id, b.thread.id);
    const { [logged.activity.id]: _removed, ...rest } = data.activities;
    data = { ...data, activities: rest };
    const changes = diffData(prev, data);
    expect(changes.upsertThreads.map((t) => t.name)).toEqual(['draw']);
    expect(changes.deleteActivities).toEqual([logged.activity.id]);
    await saveChanges(db, changes);
    expect(await loadData(db)).toEqual(data);
    const [{ n }] = await db.all<{ n: number }>('SELECT COUNT(*) AS n FROM activity_to');
    expect(n).toBe(1);
  });

  it('rolls back a failed write completely', async () => {
    const db = await freshDb();
    const { data } = ensureThread(emptyData(), 'x');
    const broken = { ...diffData(emptyData(), data), upsertActivities: [{ id: 'a', text: null } as never] };
    await expect(saveChanges(db, broken)).rejects.toThrow();
    expect(await isEmpty(db)).toBe(true);
  });
});

describe('schema 2: what a thread is for (P-14)', () => {
  it('a version-1 database with rows migrates to 2; old rows read back unchanged, with no mark', async () => {
    const db = (current = nodeDb());
    await db.exec(MIGRATIONS[0]);
    await db.exec('PRAGMA user_version = 1');
    await db.run('INSERT INTO threads (id, name, next, hidden, created_at) VALUES (?, ?, ?, ?, ?)', ['t1', 'play guitar', 'learn the F chord', 0, at]);
    await db.run('INSERT INTO threads (id, name, next, hidden, created_at) VALUES (?, ?, ?, ?, ?)', ['t2', 'get stronger', null, 1, at]);
    await db.run('INSERT INTO activities (id, text, occurred_at, created_at, doing_id, note) VALUES (?, ?, ?, ?, ?, ?)', ['a1', 'scales', at, at, 't2', 'slow']);
    await db.run('INSERT INTO activity_to (activity_id, position, thread_id) VALUES (?, ?, ?)', ['a1', 0, 't1']);

    expect(await migrateSchema(db)).toBe(1);
    const [{ user_version }] = await db.all<{ user_version: number }>('PRAGMA user_version');
    // Every later migration runs too (P-73: 3; P-85: 4).
    expect(user_version).toBe(SCHEMA_VERSION);
    const loaded = await loadData(db);
    expect(loaded).toEqual({
      version: 2,
      routines: {},
      runs: {},
      threads: {
        t1: { id: 't1', name: 'play guitar', next: 'learn the F chord', hidden: false, createdAt: at },
        t2: { id: 't2', name: 'get stronger', hidden: true, createdAt: at },
      },
      activities: { a1: { id: 'a1', text: 'scales', occurredAt: at, createdAt: at, doingId: 't2', toIds: ['t1'], note: 'slow' } },
    });
    expect(Object.values(loaded.threads).map((t) => t.declaredAt)).toEqual([undefined, undefined]);
    // Running again is a no-op (it starts from the latest now).
    expect(await migrateSchema(db)).toBe(SCHEMA_VERSION);

    // The migrated database keeps a mark, and an edit to the thread doesn't wipe it.
    const declared = declareThread(loaded, 't1', new Date(at2));
    if (!declared.ok) throw new Error('declare refused');
    await saveChanges(db, diffData(loaded, declared.data));
    const renamed = updateThread(declared.data, 't1', { name: 'guitar' });
    await saveChanges(db, diffData(declared.data, renamed));
    expect((await loadData(db)).threads.t1).toEqual({ id: 't1', name: 'guitar', next: 'learn the F chord', hidden: false, createdAt: at, declaredAt: at2 });
    const off = undeclareThread(renamed, 't1');
    await saveChanges(db, diffData(renamed, off));
    expect((await loadData(db)).threads.t1.declaredAt).toBeUndefined();
  });
});

describe('schema 3: lit and settled lines (P-73)', () => {
  /** A version-2 database (as every installed app has before P-73) with a few activities. */
  async function v2Db() {
    const db = (current = nodeDb());
    await db.exec(MIGRATIONS[0]);
    await db.exec(MIGRATIONS[1]);
    await db.exec('PRAGMA user_version = 2');
    await db.run('INSERT INTO threads (id, name, next, hidden, created_at, declared_at) VALUES (?, ?, ?, ?, ?, ?)', ['t1', 'play guitar', null, 0, at, at2]);
    await db.run('INSERT INTO activities (id, text, occurred_at, created_at, doing_id, note) VALUES (?, ?, ?, ?, ?, ?)', ['a1', 'scales', at, at, 't1', 'slow']);
    await db.run('INSERT INTO activities (id, text, occurred_at, created_at, doing_id, note) VALUES (?, ?, ?, ?, ?, ?)', ['a2', 'loose line', at2, at2, null, null]);
    await db.run('INSERT INTO activity_to (activity_id, position, thread_id) VALUES (?, ?, ?)', ['a2', 0, 't1']);
    return db;
  }

  it('a version-2 database with rows migrates to 3: every activity is kept, and all read as settled', async () => {
    const db = await v2Db();
    expect(await migrateSchema(db)).toBe(2);
    const [{ user_version }] = await db.all<{ user_version: number }>('PRAGMA user_version');
    expect(user_version).toBe(SCHEMA_VERSION);
    const loaded = await loadData(db);
    expect(loaded.activities).toEqual({
      a1: { id: 'a1', text: 'scales', occurredAt: at, createdAt: at, doingId: 't1', toIds: [], note: 'slow' },
      a2: { id: 'a2', text: 'loose line', occurredAt: at2, createdAt: at2, toIds: ['t1'] },
    });
    for (const a of Object.values(loaded.activities)) {
      expect('lit' in a, a.id).toBe(false);
      expect('settledAt' in a, a.id).toBe(false);
    }
    expect(loaded.threads.t1.declaredAt).toBe(at2);
    expect(await migrateSchema(db)).toBe(SCHEMA_VERSION);
  });

  it('lit and settledAt round-trip through saveChanges, and an edit (a note, an attach) never wipes them', async () => {
    const db = await freshDb();
    const base = ensureThread(emptyData(), 'draw');
    const one = logActivity(base.data, { text: 'sketch hands', lit: true }, new Date(at));
    const two = logActivity(one.data, { text: 'cooked dinner', settled: true }, new Date(at2));
    await saveChanges(db, diffData(emptyData(), two.data));
    let loaded = await loadData(db);
    expect(loaded.activities[one.activity.id].lit).toBe(true);
    expect(loaded.activities[two.activity.id].settledAt).toBe(at2);
    expect(loaded.activities[two.activity.id].lit).toBeUndefined();
    expect(loaded).toEqual(two.data);

    // Every edit rewrites the whole row: none may drop lit or settledAt.
    const noted = editActivity(two.data, one.activity.id, { note: 'with charcoal' });
    const attached = attachActivity(noted, two.activity.id, base.thread.id);
    await saveChanges(db, diffData(two.data, attached));
    loaded = await loadData(db);
    expect(loaded.activities[one.activity.id]).toMatchObject({ lit: true, note: 'with charcoal' });
    expect(loaded.activities[two.activity.id]).toMatchObject({ settledAt: at2, toIds: [base.thread.id] });

    // Done it, and its Undo, reach the disk.
    const settled = settle(attached, one.activity.id, new Date(at2));
    await saveChanges(db, diffData(attached, settled));
    loaded = await loadData(db);
    expect(loaded.activities[one.activity.id].lit).toBeUndefined();
    expect(loaded.activities[one.activity.id].settledAt).toBe(at2);
    await saveChanges(db, diffData(settled, attached));
    loaded = await loadData(db);
    expect(loaded.activities[one.activity.id].lit).toBe(true);
    expect(loaded.activities[one.activity.id].settledAt).toBeUndefined();
  });

  it('an older copy of the app (its INSERT without the new columns) rewrites a lit line as settled, never the other way', async () => {
    const db = await freshDb();
    const one = logActivity(emptyData(), { text: 'sketch hands', lit: true }, new Date(at));
    await saveChanges(db, diffData(emptyData(), one.data));
    await db.run('INSERT OR REPLACE INTO activities (id, text, occurred_at, created_at, doing_id, note) VALUES (?, ?, ?, ?, ?, ?)', [one.activity.id, 'sketch hands', at, at, null, 'old tab']);
    const a = (await loadData(db)).activities[one.activity.id];
    expect(a.lit).toBeUndefined();
    expect(a.note).toBe('old tab');
  });
});

describe('P-85: storage for any kind of record', () => {
  /** A routine and a run carrying everything B-11 section 8 lists. */
  const routine = (id: string, extra: Record<string, unknown> = {}): Routine => ({
    id,
    words: 'Apply to ▢employer',
    named: true,
    createdAt: at,
    items: [
      { id: 'i1', text: 'Find the posting', setsGoing: true },
      { id: 'i2', wait: 'a reply', closes: 'i1', reactions: [{ name: 'They said yes', items: [{ id: 'i3', text: 'Book a call' }] }] },
      { id: 'i4', ref: 'r2' },
    ],
    repeatFrom: 1,
    repeat: 3,
    blanks: ['employer'],
    used: { employer: ['Acme', 'Initech'] },
    ...extra,
  });
  const run = (id: string, extra: Record<string, unknown> = {}): Run => ({
    id,
    routineId: 'r1',
    parentRunId: 'n0',
    startedAt: at,
    endedAt: at2,
    waitingSince: at2,
    values: { employer: 'Acme' },
    frames: [{ seq: 'r1', at: 'i2', round: 2 }, { seq: 'r2', at: null }],
    breakdowns: { i1: 'r9' },
    waitedOn: ['i2'],
    changes: [{ kind: 'reword', item: 'i1', text: 'Find the listing' }],
    reason: 'lunch',
    ...extra,
  });
  const tables = async (db: Db) => (await db.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")).map((r) => r.name);
  const version = async (db: Db) => (await db.all<{ user_version: number }>('PRAGMA user_version'))[0].user_version;
  const OLD_TABLES = ['activities', 'activity_to', 'settings', 'threads'];
  /** Every row of every table that existed before migration 4, as stored. */
  const rows = async (db: Db) => Object.fromEntries(await Promise.all(OLD_TABLES.map(async (t) => [t, await db.all(`SELECT * FROM ${t} ORDER BY 1, 2`)] as const)));

  /** A schema-3 database, as every installed app has before P-85, with rows of every kind. */
  async function v3Db() {
    const db = (current = nodeDb());
    await db.exec(MIGRATIONS[0]);
    await db.exec(MIGRATIONS[1]);
    await db.exec(MIGRATIONS[2]);
    await db.exec('PRAGMA user_version = 3');
    await db.run('INSERT INTO threads (id, name, next, hidden, created_at, declared_at) VALUES (?, ?, ?, ?, ?, ?)', ['t1', 'play guitar', 'learn the F chord', 0, at, at2]);
    await db.run('INSERT INTO threads (id, name, next, hidden, created_at, declared_at) VALUES (?, ?, ?, ?, ?, ?)', ['t2', 'get stronger', null, 1, at, null]);
    await db.run('INSERT INTO activities (id, text, occurred_at, created_at, doing_id, note, lit, settled_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['a1', 'scales', at, at, 't1', 'slow', 1, null]);
    await db.run('INSERT INTO activities (id, text, occurred_at, created_at, doing_id, note, lit, settled_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['a2', 'loose line', at2, at2, null, null, 0, at2]);
    await db.run('INSERT INTO activity_to (activity_id, position, thread_id) VALUES (?, ?, ?)', ['a2', 0, 't1']);
    await db.run('INSERT INTO activity_to (activity_id, position, thread_id) VALUES (?, ?, ?)', ['a2', 1, 't2']);
    await db.run('INSERT INTO settings (key, value) VALUES (?, ?)', ['showShading', 'false']);
    await db.run('INSERT INTO settings (key, value) VALUES (?, ?)', ['meta:legacyIds', '["a1"]']);
    return db;
  }
  const v3Data = (): Data => ({
    ...emptyData(),
    threads: {
      t1: { id: 't1', name: 'play guitar', next: 'learn the F chord', hidden: false, createdAt: at, declaredAt: at2 },
      t2: { id: 't2', name: 'get stronger', hidden: true, createdAt: at },
    },
    activities: {
      a1: { id: 'a1', text: 'scales', occurredAt: at, createdAt: at, doingId: 't1', toIds: [], note: 'slow', lit: true },
      a2: { id: 'a2', text: 'loose line', occurredAt: at2, createdAt: at2, toIds: ['t1', 't2'], settledAt: at2 },
    },
  });

  describe('the one list', () => {
    it('every collection has a repository entry (and nothing else has one), each with tables the schema creates', async () => {
      const db = await freshDb();
      expect(Object.keys(REPOSITORY).sort()).toEqual([...COLLECTIONS].sort());
      const existing = await tables(db);
      for (const c of COLLECTIONS) {
        const entry = REPOSITORY[c];
        expect(typeof entry.load, c).toBe('function');
        expect(typeof entry.upsert, c).toBe('function');
        expect(typeof entry.remove, c).toBe('function');
        expect(entry.tables.length, c).toBeGreaterThan(0);
        for (const t of entry.tables) expect(existing, `${c}: ${t}`).toContain(t);
      }
      // Every table but settings belongs to exactly one collection: none is left out of "replace everything".
      const owned = COLLECTIONS.flatMap((c) => [...REPOSITORY[c].tables]);
      expect(owned.sort()).toEqual(existing.filter((t) => t !== 'settings').sort());
    });
  });

  describe('schema 4: tables for routines and runs, added only', () => {
    it('a schema-3 database with rows migrates to 4: every row unchanged, the new tables empty, nothing else created', async () => {
      const db = await v3Db();
      const before = await rows(db);
      expect(await tables(db)).toEqual(OLD_TABLES);

      expect(await migrateSchema(db)).toBe(3);
      expect(await version(db)).toBe(4);
      expect(SCHEMA_VERSION).toBe(4);
      expect(await rows(db)).toEqual(before);
      expect(await tables(db)).toEqual(['activities', 'activity_to', 'routines', 'runs', 'settings', 'threads']);
      expect(await db.all('SELECT * FROM routines')).toEqual([]);
      expect(await db.all('SELECT * FROM runs')).toEqual([]);
      expect(await loadData(db)).toEqual(v3Data());
      expect(await loadSettings(db)).toEqual({ showShading: false, recentSearches: [], leftAsIs: [] });
      // Running again is a no-op.
      expect(await migrateSchema(db)).toBe(4);
      expect(await rows(db)).toEqual(before);
    });

    it('the migration only creates: no ALTER, DROP, INSERT, UPDATE or DELETE, and the released ones are as they were', () => {
      expect(MIGRATIONS).toHaveLength(4);
      expect(MIGRATIONS[3]).toMatch(/CREATE TABLE routines/);
      expect(MIGRATIONS[3]).toMatch(/CREATE TABLE runs/);
      expect(MIGRATIONS[3]).not.toMatch(/\b(ALTER|DROP|INSERT|UPDATE|DELETE|REPLACE)\b/i);
      expect(MIGRATIONS[1].trim()).toBe('ALTER TABLE threads ADD COLUMN declared_at TEXT;');
      expect(MIGRATIONS[2]).toMatch(/ALTER TABLE activities ADD COLUMN lit INTEGER NOT NULL DEFAULT 0;\s+ALTER TABLE activities ADD COLUMN settled_at TEXT;/);
    });

    it('is atomic: a migration that fails part-way (a reload mid-migration) leaves schema 3, no new tables and every row, and the next start finishes it', async () => {
      const db = await v3Db();
      const before = await rows(db);
      // The tables are created, then recording the new version fails: all of it must roll back.
      const failing: Db = { ...db, exec: async (sql) => (/PRAGMA user_version = 4/.test(sql) ? Promise.reject(new Error('disk I/O error')) : db.exec(sql)) };
      await expect(migrateSchema(failing)).rejects.toThrow('disk I/O error');
      expect(await version(db)).toBe(3);
      expect(await tables(db)).toEqual(OLD_TABLES);
      expect(await rows(db)).toEqual(before);

      expect(await migrateSchema(db)).toBe(3);
      expect(await version(db)).toBe(4);
      expect(await rows(db)).toEqual(before);
      expect(await loadData(db)).toEqual(v3Data());
    });

    it('a database from a newer schema (5) is refused, untouched', async () => {
      const db = await v3Db();
      await migrateSchema(db);
      const routines = { r1: routine('r1') };
      await saveChanges(db, diffData(emptyData(), { ...emptyData(), routines }));
      await db.exec('PRAGMA user_version = 5');
      const before = await rows(db);
      await expect(migrateSchema(db)).rejects.toThrow('This data was saved by a newer version of Wanderment (schema 5). Reload to update.');
      expect(await version(db)).toBe(5);
      expect(await rows(db)).toEqual(before);
      expect((await loadData(db)).routines).toEqual(routines);
    });
  });

  describe('loading and saving each collection', () => {
    it('a routine and a run round-trip through saveChanges and loadData, deep-equal, with everything they carry', async () => {
      const db = await freshDb();
      const data: Data = { ...v3Data(), routines: { r1: routine('r1'), r9: routine('r9', { named: false, words: 'Find the posting', removedAt: at2, items: [] }) }, runs: { n1: run('n1'), n2: { id: 'n2', routineId: 'r1', startedAt: at } } };
      await saveChanges(db, diffData(emptyData(), data));
      const loaded = await loadData(db);
      expect(loaded).toEqual(data);
      expect(loaded.routines.r9.named).toBe(false);
      expect(loaded.routines.r9.removedAt).toBe(at2);
      // Only when set: absent fields stay absent (as an activity's lit does).
      expect('removedAt' in loaded.routines.r1).toBe(false);
      for (const k of ['parentRunId', 'endedAt', 'waitingSince']) expect(k in loaded.runs.n2, k).toBe(false);
      // What the database can ask about is in columns; the rest is one JSON body.
      expect(await db.all('SELECT id, words, named, created_at, removed_at FROM routines ORDER BY id')).toEqual([
        { id: 'r1', words: 'Apply to ▢employer', named: 1, created_at: at, removed_at: null },
        { id: 'r9', words: 'Find the posting', named: 0, created_at: at, removed_at: at2 },
      ]);
      expect(await db.all('SELECT id, routine_id, parent_run_id, started_at, ended_at, waiting_since FROM runs ORDER BY id')).toEqual([
        { id: 'n1', routine_id: 'r1', parent_run_id: 'n0', started_at: at, ended_at: at2, waiting_since: at2 },
        { id: 'n2', routine_id: 'r1', parent_run_id: null, started_at: at, ended_at: null, waiting_since: null },
      ]);
      const [{ body }] = await db.all<{ body: string }>('SELECT body FROM runs WHERE id = ?', ['n1']);
      expect(JSON.parse(body)).toEqual({ values: { employer: 'Acme' }, frames: [{ seq: 'r1', at: 'i2', round: 2 }, { seq: 'r2', at: null }], breakdowns: { i1: 'r9' }, waitedOn: ['i2'], changes: [{ kind: 'reword', item: 'i1', text: 'Find the listing' }], reason: 'lunch' });
    });

    it('an edit rewrites the whole record (a field taken away is gone), and a delete removes only that record', async () => {
      const db = await freshDb();
      const one: Data = { ...emptyData(), routines: { r1: routine('r1'), r2: routine('r2') }, runs: { n1: run('n1'), n2: run('n2') } };
      await saveChanges(db, diffData(emptyData(), one));
      const { reason: _reason, endedAt: _endedAt, ...resumed } = run('n1');
      const two: Data = { ...one, routines: { r1: routine('r1', { words: 'Apply', repeat: undefined }) }, runs: { n1: { ...resumed, frames: [{ seq: 'r1', at: 'i4', round: 3 }] } as Run, n2: one.runs.n2 } };
      const changes = diffData(one, two);
      expect(changes).toMatchObject({ deleteRoutines: ['r2'], deleteRuns: [], upsertThreads: [], upsertActivities: [] });
      await saveChanges(db, changes);
      const loaded = await loadData(db);
      expect(loaded).toEqual(two);
      expect('reason' in loaded.runs.n1 || 'endedAt' in loaded.runs.n1 || 'repeat' in loaded.routines.r1).toBe(false);
      expect(loaded.runs.n2).toEqual(run('n2'));
    });

    it('changes that don’t mention routines or runs (a journal from before P-85) are written, and touch neither', async () => {
      const db = await freshDb();
      const kept: Data = { ...emptyData(), routines: { r1: routine('r1') }, runs: { n1: run('n1') } };
      await saveChanges(db, diffData(emptyData(), kept));
      const old = { upsertThreads: [v3Data().threads.t1], deleteThreads: [], upsertActivities: [v3Data().activities.a1], deleteActivities: [] };
      await saveChanges(db, old);
      expect(await loadData(db)).toEqual({ ...kept, threads: { t1: v3Data().threads.t1 }, activities: { a1: v3Data().activities.a1 } });
    });

    it('a database holding only a routine, or only a run, is not empty', async () => {
      const db = await freshDb();
      expect(await isEmpty(db)).toBe(true);
      await saveChanges(db, diffData(emptyData(), { ...emptyData(), routines: { r1: routine('r1') } }));
      expect(await isEmpty(db)).toBe(false);
      await saveChanges(db, { deleteRoutines: ['r1'] });
      expect(await isEmpty(db)).toBe(true);
      await saveChanges(db, diffData(emptyData(), { ...emptyData(), runs: { n1: run('n1') } }));
      expect(await isEmpty(db)).toBe(false);
    });

    it('replaceAll removes the routines and runs that were there, and writes the new ones', async () => {
      const db = await freshDb();
      await saveChanges(db, diffData(emptyData(), { ...v3Data(), routines: { r1: routine('r1'), r2: routine('r2') }, runs: { n1: run('n1') } }));
      const next: Data = { ...emptyData(), activities: { a2: v3Data().activities.a2 }, routines: { r3: routine('r3', { words: 'Bake' }) }, runs: { n7: run('n7', { routineId: 'r3' }) } };
      await replaceAll(db, next);
      expect(await loadData(db)).toEqual(next);
      // With a backup from before P-85 (no routines, no runs), none are left behind.
      await replaceAll(db, v3Data());
      expect(await loadData(db)).toEqual(v3Data());
      expect(await db.all('SELECT id FROM routines')).toEqual([]);
      expect(await db.all('SELECT id FROM runs')).toEqual([]);
    });

    it('a failed write rolls back every collection: nothing of the thread, activity or routine written before the bad run stays', async () => {
      const db = await freshDb();
      const data: Data = { ...v3Data(), routines: { r1: routine('r1') } };
      const broken = { ...diffData(emptyData(), data), upsertRuns: [{ id: 'n1', routineId: null } as never] };
      await expect(saveChanges(db, broken)).rejects.toThrow();
      expect(await isEmpty(db)).toBe(true);
      expect(await loadData(db)).toEqual(emptyData());
      // And the other way round: a bad routine takes the run with it.
      await expect(saveChanges(db, { upsertRuns: [run('n1')], upsertRoutines: [{ id: 'r1', words: null } as never] })).rejects.toThrow();
      await expect(replaceAll(db, { ...data, runs: { n1: { id: 'n1', routineId: null } as never } })).rejects.toThrow();
      expect(await isEmpty(db)).toBe(true);
    });

    it('a body that can’t be read costs only what it held: the record and everything else still load', async () => {
      const db = await freshDb();
      const data: Data = { ...emptyData(), routines: { r1: routine('r1'), r2: routine('r2') } };
      await saveChanges(db, diffData(emptyData(), data));
      await db.run('UPDATE routines SET body = ? WHERE id = ?', ['{not json', 'r1']);
      const loaded = await loadData(db);
      expect(loaded.routines.r1).toEqual({ id: 'r1', words: 'Apply to ▢employer', named: true, createdAt: at });
      expect(loaded.routines.r2).toEqual(routine('r2'));
    });

    it('a record whose id is an object method’s name (“constructor”, “toString”) is deleted like any other, in every collection (audit F1)', async () => {
      const db = await freshDb();
      const odd: Data = {
        ...emptyData(),
        threads: { constructor: { id: 'constructor', name: 'draw', hidden: false, createdAt: at } },
        activities: { toString: { id: 'toString', text: 'sketched', occurredAt: at, createdAt: at, toIds: ['constructor'] } },
        routines: { constructor: routine('constructor') },
        runs: { toString: run('toString') },
      };
      await saveChanges(db, diffData(emptyData(), odd));
      expect(await loadData(db)).toEqual(odd);
      const changes = diffData(odd, emptyData());
      expect(changes).toMatchObject({ deleteThreads: ['constructor'], deleteActivities: ['toString'], deleteRoutines: ['constructor'], deleteRuns: ['toString'] });
      await saveChanges(db, changes);
      expect(await loadData(db)).toEqual(emptyData());
      expect(await isEmpty(db)).toBe(true);
    });

    it('loading asks once per table, however many records there are', async () => {
      const db = await freshDb();
      const many: Data = { ...emptyData() };
      for (let i = 0; i < 300; i++) many.activities[`a${i}`] = { id: `a${i}`, text: `step ${i}`, occurredAt: at, createdAt: at, toIds: [] };
      for (let i = 0; i < 20; i++) many.routines[`r${i}`] = routine(`r${i}`);
      for (let i = 0; i < 20; i++) many.runs[`n${i}`] = run(`n${i}`);
      await replaceAll(db, many);
      const queries: string[] = [];
      const counting: Db = { ...db, all: (sql, params) => (queries.push(sql), db.all(sql, params)) };
      expect(await loadData(counting)).toEqual(many);
      expect(queries).toHaveLength(COLLECTIONS.flatMap((c) => [...REPOSITORY[c].tables]).length);
    });
  });
});
