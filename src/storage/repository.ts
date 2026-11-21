import { DataChanges } from '@/domain/diff';
import { defaultSettings, Settings } from '@/domain/migrate';
import { Activity, Data, emptyData, Thread } from '@/domain/types';

import { Db } from './db';

interface ThreadRow {
  id: string;
  name: string;
  next: string | null;
  hidden: number;
  created_at: string;
}
interface ActivityRow {
  id: string;
  text: string;
  occurred_at: string;
  created_at: string;
  doing_id: string | null;
  note: string | null;
}
interface ToRow {
  activity_id: string;
  thread_id: string;
}

export async function loadData(db: Db): Promise<Data> {
  const data = emptyData();
  for (const r of await db.all<ThreadRow>('SELECT * FROM threads')) {
    data.threads[r.id] = { id: r.id, name: r.name, next: r.next ?? undefined, hidden: r.hidden === 1, createdAt: r.created_at };
  }
  for (const r of await db.all<ActivityRow>('SELECT * FROM activities')) {
    data.activities[r.id] = {
      id: r.id,
      text: r.text,
      occurredAt: r.occurred_at,
      createdAt: r.created_at,
      doingId: r.doing_id ?? undefined,
      toIds: [],
      note: r.note ?? undefined,
    };
  }
  for (const r of await db.all<ToRow>('SELECT activity_id, thread_id FROM activity_to ORDER BY activity_id, position')) {
    data.activities[r.activity_id]?.toIds.push(r.thread_id);
  }
  return data;
}

const upsertThread = (db: Db, t: Thread) =>
  db.run('INSERT OR REPLACE INTO threads (id, name, next, hidden, created_at) VALUES (?, ?, ?, ?, ?)', [
    t.id,
    t.name,
    t.next ?? null,
    t.hidden ? 1 : 0,
    t.createdAt,
  ]);

async function upsertActivity(db: Db, a: Activity) {
  await db.run('INSERT OR REPLACE INTO activities (id, text, occurred_at, created_at, doing_id, note) VALUES (?, ?, ?, ?, ?, ?)', [
    a.id,
    a.text,
    a.occurredAt,
    a.createdAt,
    a.doingId ?? null,
    a.note ?? null,
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

/** Writes one diff in a single transaction, so a crash never leaves half a change. */
export async function saveChanges(db: Db, changes: DataChanges): Promise<void> {
  await db.transaction(async () => {
    for (const t of changes.upsertThreads) await upsertThread(db, t);
    for (const id of changes.deleteThreads) await db.run('DELETE FROM threads WHERE id = ?', [id]);
    for (const a of changes.upsertActivities) await upsertActivity(db, a);
    for (const id of changes.deleteActivities) await deleteActivity(db, id);
  });
}

/** Replaces everything (used for the one-time move from the legacy store). */
export async function replaceAll(db: Db, data: Data): Promise<void> {
  await db.transaction(async () => {
    await db.exec('DELETE FROM activity_to; DELETE FROM activities; DELETE FROM threads;');
    for (const t of Object.values(data.threads)) await upsertThread(db, t);
    for (const a of Object.values(data.activities)) await upsertActivity(db, a);
  });
}

export async function loadSettings(db: Db): Promise<Settings> {
  const settings = defaultSettings();
  for (const r of await db.all<{ key: string; value: string }>('SELECT key, value FROM settings')) {
    if (r.key === 'showShading') settings.showShading = r.value !== 'false';
    if (r.key === 'recentSearches') {
      try {
        const list = JSON.parse(r.value);
        if (Array.isArray(list)) settings.recentSearches = list.filter((x): x is string => typeof x === 'string');
      } catch {
        // Ignore a damaged value; it's only convenience.
      }
    }
  }
  return settings;
}

export async function saveSettings(db: Db, settings: Settings): Promise<void> {
  await db.transaction(async () => {
    await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['showShading', String(settings.showShading)]);
    await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['recentSearches', JSON.stringify(settings.recentSearches)]);
  });
}

export async function isEmpty(db: Db): Promise<boolean> {
  const [{ n }] = await db.all<{ n: number }>('SELECT (SELECT COUNT(*) FROM threads) + (SELECT COUNT(*) FROM activities) AS n');
  return n === 0;
}
