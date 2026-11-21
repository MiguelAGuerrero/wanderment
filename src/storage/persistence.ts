import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { DataChanges, diffData, isEmptyDiff, missingFrom, pendingChanges } from '@/domain/diff';
import { defaultSettings, LEGACY_STORAGE_KEY, parseLegacyState, sameSettings, Settings, toLegacyState } from '@/domain/migrate';
import { Data, emptyData } from '@/domain/types';
import { useStore } from '@/store/useStore';

import { Db } from './db';
import { openExpoDb } from './expoDb';
import { scheduleBackup } from './nativeBackup';
import { isEmpty, loadData, loadSettings, replaceAll, saveChanges, saveSettings } from './repository';
import { migrateSchema } from './schema';

/** Remembers that this browser has used SQLite, so we never silently fall back to stale data. */
const USES_SQLITE_KEY = `${LEGACY_STORAGE_KEY}:uses-sqlite`;

/**
 * Web only: SQLite writes are asynchronous (they run in a worker), so a reload or closed tab
 * right after a change could lose it. Each change is first written synchronously to this small
 * journal in localStorage, replayed on the next start, and cleared once SQLite has committed.
 */
const JOURNAL_KEY = `${LEGACY_STORAGE_KEY}:journal`;

interface Journal {
  changes: DataChanges;
  settings: Settings;
}

const webStorage = (): Storage | undefined => {
  try {
    return Platform.OS === 'web' ? globalThis.localStorage : undefined;
  } catch {
    return undefined;
  }
};

function writeJournal(journal: Journal | undefined) {
  const ls = webStorage();
  if (!ls) return;
  try {
    if (journal) ls.setItem(JOURNAL_KEY, JSON.stringify(journal));
    else ls.removeItem(JOURNAL_KEY);
  } catch {
    // Quota or privacy mode: the async write still happens, just without the safety net.
  }
}

function readJournal(): Journal | undefined {
  try {
    const raw = webStorage()?.getItem(JOURNAL_KEY);
    if (!raw) return undefined;
    const j = JSON.parse(raw) as Journal;
    // Journals written by older versions may lack newer settings.
    return { changes: j.changes, settings: { ...defaultSettings(), ...j.settings } };
  } catch {
    return undefined;
  }
}

interface Backend {
  save(prev: { data: Data; settings: Settings }, next: { data: Data; settings: Settings }): Promise<void>;
}

const sqliteBackend = (db: Db): Backend => ({
  async save(prev, next) {
    const changes = diffData(prev.data, next.data);
    if (!isEmptyDiff(changes)) await saveChanges(db, changes);
    if (!sameSettings(prev.settings, next.settings)) await saveSettings(db, next.settings);
  },
});

const localBackend: Backend = {
  save: (_prev, next) => AsyncStorage.setItem(LEGACY_STORAGE_KEY, toLegacyState(next.data, next.settings)),
};

const OPEN_TIMEOUT_MS = 15000;

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Opening the database timed out')), ms))]);

/** OPFS lets one tab hold the database; a second tab gets this kind of error. */
const isLockError = (e: unknown) => /access handle|nomodificationallowed|another open|locked/i.test(String((e as Error)?.message ?? e));

class BlockedError extends Error {}

/**
 * Data written in the first release's format after the move to SQLite — by a tab still running
 * the old version, or by an earlier fallback session. New records are added; records the
 * database already has are kept as they are (it holds the newer copy).
 */
async function absorbLegacy(db: Db): Promise<void> {
  const json = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
  if (!json) return;
  const legacy = parseLegacyState(json);
  if (!legacy) throw new BlockedError('Saved data in this browser couldn’t be read. Download it below before doing anything else.');
  if (await isEmpty(db)) {
    // Persisted format v1 → v2: the first move into SQLite.
    await replaceAll(db, legacy.data);
    await saveSettings(db, legacy.settings);
  } else {
    const missing = missingFrom(await loadData(db), legacy.data);
    if (!isEmptyDiff(missing)) await saveChanges(db, missing);
  }
  // Only after SQLite has committed. If this fails, the next start merges again (harmless).
  await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
}

async function openSqlite(): Promise<{ backend: Backend; db: Db; data: Data; settings: Settings }> {
  const db = await withTimeout(openExpoDb(), OPEN_TIMEOUT_MS);
  // From this moment this browser is a SQLite browser: never fall back to the old format again.
  await AsyncStorage.setItem(USES_SQLITE_KEY, '1').catch(() => {});
  await migrateSchema(db);
  // Finish any change that was interrupted by a reload or closed tab. Writes are whole records,
  // so replaying one that did land is harmless.
  const journal = readJournal();
  if (journal) {
    await saveChanges(db, journal.changes);
    await saveSettings(db, journal.settings);
    writeJournal(undefined);
  }
  await absorbLegacy(db);
  return { backend: sqliteBackend(db), db, data: await loadData(db), settings: await loadSettings(db) };
}

async function openLocal(): Promise<{ backend: Backend; data: Data; settings: Settings }> {
  const json = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
  const legacy = parseLegacyState(json);
  // Never start empty on top of data we couldn't read: the first save would overwrite it.
  if (json && !legacy) throw new BlockedError('Saved data in this browser couldn’t be read. Download it below before doing anything else.');
  return { backend: localBackend, data: legacy?.data ?? emptyData(), settings: legacy?.settings ?? defaultSettings() };
}

let started = false;

const block = (message: string) => useStore.setState({ storage: { state: 'blocked', message } });

/** Loads saved data into the store, then saves every change in the background. Call once. */
export async function startPersistence(): Promise<void> {
  if (started) return;
  started = true;
  try {
    await start();
  } catch (e) {
    // Whatever happens, end in a state the person can act on — never an endless blank screen.
    console.warn('Could not load data', e);
    block(e instanceof BlockedError ? e.message : `Wanderment couldn’t load its data (${(e as Error)?.message ?? e}).`);
  }
}

async function start(): Promise<void> {
  let opened: { backend: Backend; db?: Db; data: Data; settings: Settings };
  let kind: 'sqlite' | 'local' = 'sqlite';
  try {
    opened = await openSqlite();
  } catch (e) {
    if (e instanceof BlockedError) throw e;
    const usedSqliteBefore = (await AsyncStorage.getItem(USES_SQLITE_KEY).catch(() => null)) === '1';
    if (Platform.OS === 'web' && isLockError(e)) {
      throw new BlockedError('Wanderment is open in another tab or window. Close it, then reload this one.');
    }
    if (Platform.OS !== 'web' || usedSqliteBefore) {
      // Showing an empty or stale app here could overwrite real data, so stop and explain.
      throw new BlockedError(`Wanderment couldn’t open its data (${(e as Error)?.message ?? e}). Reload to try again.`);
    }
    // This browser can't run SQLite at all (e.g. no OPFS in a private window): keep the first release's format.
    console.warn('SQLite unavailable, using localStorage', e);
    opened = await openLocal();
    kind = 'local';
  }

  let saved = { data: opened.data, settings: opened.settings };
  /** The data a write has been sent for but not yet confirmed. */
  let inflight: Data | undefined;
  const journal = (data: Data, settings: Settings) =>
    kind === 'sqlite' && writeJournal({ changes: pendingChanges(saved.data, inflight, data), settings });
  const settingsOf = (s: ReturnType<typeof useStore.getState>): Settings => ({
    showShading: s.showShading,
    recentSearches: s.recentSearches,
    leftAsIs: s.leftAsIs,
  });
  useStore.setState({ data: opened.data, ...opened.settings, storage: { state: 'ready', kind } });

  // One write at a time; changes made meanwhile are folded into the next write.
  let running = false;
  let again = false;
  const flush = async () => {
    if (running) {
      again = true;
      return;
    }
    running = true;
    try {
      do {
        again = false;
        const s = useStore.getState();
        const target = { data: s.data, settings: settingsOf(s) };
        if (target.data === saved.data && sameSettings(target.settings, saved.settings)) continue;
        try {
          inflight = target.data;
          await opened.backend.save(saved, target);
          saved = target;
          inflight = undefined;
          // The journal now only needs what changed after this write (if anything).
          const now = useStore.getState();
          if (now.data === target.data && sameSettings(settingsOf(now), target.settings)) writeJournal(undefined);
          else journal(now.data, settingsOf(now));
          if (useStore.getState().saveError) useStore.setState({ saveError: undefined });
          scheduleBackup(target.data);
        } catch (e) {
          inflight = undefined;
          console.warn('Save failed', e);
          useStore.setState({ saveError: 'Your last change couldn’t be saved. Export a backup from Settings to be safe.' });
          return;
        }
      } while (again);
    } finally {
      running = false;
    }
  };

  useStore.subscribe((s, prev) => {
    if (s.data === prev.data && s.showShading === prev.showShading && s.recentSearches === prev.recentSearches && s.leftAsIs === prev.leftAsIs) return;
    journal(s.data, settingsOf(s));
    void flush();
  });

  // A tab still running the first release keeps writing the old key; fold its new records in.
  if (kind === 'sqlite' && Platform.OS === 'web' && typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key !== LEGACY_STORAGE_KEY || !e.newValue) return;
      const legacy = parseLegacyState(e.newValue);
      if (!legacy) return;
      const { data } = useStore.getState();
      const missing = missingFrom(data, legacy.data);
      if (isEmptyDiff(missing)) return;
      const threads = { ...data.threads };
      const activities = { ...data.activities };
      for (const t of missing.upsertThreads) threads[t.id] = t;
      for (const a of missing.upsertActivities) activities[a.id] = a;
      useStore.setState({ data: { ...data, threads, activities } });
    });
  }
}
