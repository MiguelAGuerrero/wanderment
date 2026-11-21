import { Activity, Data, Id, Thread } from './types';

/**
 * Turns anything that claims to be Wanderment data (a backup, an old persisted store) into a
 * valid `Data`, repairing what can be repaired. Throws with a readable message otherwise.
 *
 * `Data.version` is the export format. It is still 1; when it changes, add a step here so
 * older backups keep importing.
 */
export function migrateData(raw: unknown): Data {
  const d = raw as Partial<Data> | undefined;
  if (!d || typeof d !== 'object') throw new Error('The backup is missing its data.');
  if (d.version !== 1) throw new Error('That file isn’t a Wanderment backup.');
  if (!d.threads || typeof d.threads !== 'object' || !d.activities || typeof d.activities !== 'object') {
    throw new Error('The backup is missing threads or activities.');
  }

  const threads: Record<Id, Thread> = {};
  for (const [key, t] of Object.entries(d.threads as Record<string, Partial<Thread>>)) {
    if (!t || typeof t.name !== 'string' || !t.name.trim()) throw new Error('A thread in the backup is malformed.');
    const id = typeof t.id === 'string' && t.id ? t.id : key;
    threads[id] = {
      id,
      name: t.name.trim().replace(/\s+/g, ' '),
      next: typeof t.next === 'string' && t.next.trim() ? t.next.trim() : undefined,
      hidden: t.hidden === true,
      createdAt: isIso(t.createdAt) ? t.createdAt : new Date(0).toISOString(),
    };
  }

  const activities: Record<Id, Activity> = {};
  for (const [key, a] of Object.entries(d.activities as Record<string, Partial<Activity>>)) {
    if (!a || typeof a.text !== 'string' || !Array.isArray(a.toIds)) throw new Error('An activity in the backup is malformed.');
    const id = typeof a.id === 'string' && a.id ? a.id : key;
    const doingId = typeof a.doingId === 'string' && a.doingId ? a.doingId : undefined;
    const createdAt = isIso(a.createdAt) ? a.createdAt : isIso(a.occurredAt) ? a.occurredAt : new Date(0).toISOString();
    activities[id] = {
      id,
      text: a.text,
      occurredAt: isIso(a.occurredAt) ? a.occurredAt : createdAt,
      createdAt,
      doingId,
      toIds: [...new Set(a.toIds.filter((t): t is string => typeof t === 'string' && !!t && t !== doingId))],
      note: typeof a.note === 'string' && a.note.trim() ? a.note : undefined,
    };
  }
  return { version: 1, threads, activities };
}

const isIso = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v));

/** What the first release saved (zustand `persist`, format version 1) under the key "wanderment". */
export const LEGACY_STORAGE_KEY = 'wanderment';

export interface Settings {
  showShading: boolean;
  /** Last few searches, newest first. */
  recentSearches: string[];
  /** Unattached activities the person chose to leave as they are (attach mode won't ask again). */
  leftAsIs: Id[];
}

export const defaultSettings = (): Settings => ({ showShading: true, recentSearches: [], leftAsIs: [] });

export const sameSettings = (a: Settings, b: Settings) =>
  a.showShading === b.showShading &&
  a.recentSearches.join('\n') === b.recentSearches.join('\n') &&
  a.leftAsIs.join('\n') === b.leftAsIs.join('\n');

/**
 * Persisted format v1 → v2: reads the JSON blob the first release kept in AsyncStorage
 * (localStorage on web) so it can be moved into SQLite. Returns undefined if there's nothing usable.
 */
export function parseLegacyState(json: string | null | undefined): { data: Data; settings: Settings } | undefined {
  if (!json) return undefined;
  let parsed: { state?: { data?: unknown; showShading?: unknown }; version?: number };
  try {
    parsed = JSON.parse(json);
  } catch {
    return undefined;
  }
  if (!parsed?.state?.data) return undefined;
  const data = migrateData(parsed.state.data);
  return { data, settings: { ...defaultSettings(), showShading: parsed.state.showShading !== false } };
}

/** The legacy format, still used on web when SQLite can't run (e.g. no OPFS in a private window). */
export const toLegacyState = (data: Data, settings: Settings): string =>
  JSON.stringify({ state: { data, showShading: settings.showShading }, version: 1 });
