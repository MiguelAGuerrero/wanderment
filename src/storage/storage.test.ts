import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { diffData } from '@/domain/diff';
import { parseLegacyState } from '@/domain/migrate';
import { attachActivity, ensureThread, logActivity, updateThread } from '@/domain/model';
import { emptyData } from '@/domain/types';

import { nodeDb } from './nodeDb';
import { isEmpty, loadData, loadSettings, replaceAll, saveChanges, saveSettings } from './repository';
import { migrateSchema, SCHEMA_VERSION } from './schema';

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
