import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { diffData } from '@/domain/diff';
import { parseLegacyState } from '@/domain/migrate';
import { attachActivity, declareThread, editActivity, ensureThread, logActivity, undeclareThread, updateThread } from '@/domain/model';
import { settle } from '@/domain/rise';
import { emptyData } from '@/domain/types';

import { nodeDb } from './nodeDb';
import { isEmpty, loadData, loadSettings, replaceAll, saveChanges, saveSettings } from './repository';
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
    // P-73: migration 3 runs too (was 2).
    expect(user_version).toBe(3);
    const loaded = await loadData(db);
    expect(loaded).toEqual({
      version: 1,
      threads: {
        t1: { id: 't1', name: 'play guitar', next: 'learn the F chord', hidden: false, createdAt: at },
        t2: { id: 't2', name: 'get stronger', hidden: true, createdAt: at },
      },
      activities: { a1: { id: 'a1', text: 'scales', occurredAt: at, createdAt: at, doingId: 't2', toIds: ['t1'], note: 'slow' } },
    });
    expect(Object.values(loaded.threads).map((t) => t.declaredAt)).toEqual([undefined, undefined]);
    // Running again is a no-op (P-73: it starts from 3 now; was 2).
    expect(await migrateSchema(db)).toBe(3);

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
    expect(user_version).toBe(3);
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
    expect(await migrateSchema(db)).toBe(3);
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
