import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { DataChanges, diffData, isEmptyDiff, missingFrom, pendingChanges } from '@/domain/diff';
import { defaultSettings, LEGACY_STORAGE_KEY, parseLegacyState, sameSettings, Settings, toLegacyState } from '@/domain/migrate';
import { classifyOpenError, detailsLine, OpenStep, retryDelay, StepError } from '@/domain/opening';
import { Data, emptyData } from '@/domain/types';
import { useStore } from '@/store/useStore';

import { Db } from './db';
import { openExpoDb } from './expoDb';
import { scheduleBackup } from './nativeBackup';
import { requestPersistence } from './persistent';
import { isEmpty, loadData, loadMeta, loadSettings, replaceAll, saveChanges, saveMeta, saveSettings } from './repository';
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

class BlockedError extends Error {
  constructor(
    message: string,
    /** The details line, when it isn't about this message (it's about the error behind it). */
    readonly details?: string,
  ) {
    super(message);
  }
}

/** Runs one step of opening; a failure carries the step's name (for the screen's details line). */
async function step<T>(name: OpenStep, task: () => Promise<T>): Promise<T> {
  try {
    return await task();
  } catch (e) {
    throw e instanceof StepError ? e : new StepError(name, e);
  }
}

/** Shown while another copy holds the data. The page opens by itself once it's free. */
const TAB_HELD = 'Wanderment is open in another tab or window. It’ll open here as soon as that one is closed or in the background.';
const FILES_HELD =
  'Wanderment is still open somewhere else in this browser — maybe an old tab, or a page in a tab’s history. Close other Wanderment tabs; if this stays, quit the browser and reopen it. Your data is safe; this page will open by itself.';

/** Ids already taken in from the first release's format — never taken in again (so deletions stick). */
const ABSORBED = 'legacyIds';

async function loadAbsorbed(db: Db): Promise<Set<string>> {
  try {
    return new Set(JSON.parse((await loadMeta(db, ABSORBED)) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

const idsOf = (data: Data) => [...Object.keys(data.threads), ...Object.keys(data.activities)];

/**
 * Records in the first release's format that this database has never seen: written by a tab
 * still running the old version, or by an earlier fallback session. Records already taken in
 * once are ignored — even if deleted since — and the old format's copies of existing records
 * never overwrite the database's.
 */
function unseen(legacy: Data, base: Data, absorbed: Set<string>): Data {
  const missing = missingFrom(base, legacy);
  return {
    version: 1,
    threads: Object.fromEntries(missing.upsertThreads.filter((t) => !absorbed.has(t.id)).map((t) => [t.id, t])),
    activities: Object.fromEntries(missing.upsertActivities.filter((a) => !absorbed.has(a.id)).map((a) => [a.id, a])),
  };
}

async function absorbLegacy(db: Db): Promise<void> {
  const json = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
  if (!json) return;
  const legacy = parseLegacyState(json);
  if (!legacy) throw new BlockedError('Saved data in this browser couldn’t be read. Download it below before doing anything else.');
  const absorbed = await loadAbsorbed(db);
  if (absorbed.size === 0 && (await isEmpty(db))) {
    // Persisted format v1 → v2: the first move into SQLite.
    await replaceAll(db, legacy.data);
    await saveSettings(db, legacy.settings);
  } else {
    const fresh = unseen(legacy.data, await loadData(db), absorbed);
    await saveChanges(db, diffData(emptyData(), fresh));
  }
  for (const id of idsOf(legacy.data)) absorbed.add(id);
  await saveMeta(db, ABSORBED, JSON.stringify([...absorbed]));
  // Only after SQLite has committed. If this fails, the next start skips what it already took.
  await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
}

interface TabLock {
  release(): void;
}

/**
 * One tab at a time, in every storage mode (the database lock alone doesn't cover the
 * localStorage fallback). Held until released or the page goes away. Browsers without Web
 * Locks skip this. `wait`: queue for the lock instead of giving up (null only if aborted).
 */
async function takeTabLock(opts: { wait?: boolean; signal?: AbortSignal } = {}): Promise<TabLock | null> {
  const locks = Platform.OS === 'web' ? (globalThis.navigator as Navigator | undefined)?.locks : undefined;
  const none: TabLock = { release() {} };
  if (!locks?.request) return none;
  return new Promise<TabLock | null>((resolve) => {
    let release = () => {};
    const held = new Promise<void>((r) => (release = r));
    locks
      .request('wanderment-data', opts.wait ? { signal: opts.signal } : { ifAvailable: true }, (lock) => {
        resolve(lock ? { release } : null);
        return lock ? held : undefined;
      })
      .catch(() => resolve(opts.signal?.aborted ? null : none));
  });
}

/** Finishes changes interrupted by a reload or closed tab. Writes are whole records, so replaying one that did land is harmless. */
async function replayJournal(db: Db): Promise<void> {
  const journal = readJournal();
  if (!journal) return;
  try {
    await saveChanges(db, journal.changes);
    await saveSettings(db, journal.settings);
    writeJournal(undefined);
  } catch (e) {
    // Busy because another copy has the data: keep the journal and replay it once this page gets in.
    if (classifyOpenError(e, 'journal') === 'held') throw e;
    // Don't block every start on it: set it aside (still downloadable) and carry on.
    console.warn('Could not replay the journal', e);
    quarantineJournal();
    journalFailed = true;
  }
}

interface Opened {
  backend: Backend;
  db?: Db;
  data: Data;
  settings: Settings;
}

async function openSqlite(): Promise<Opened> {
  const db = await step('open', () => withTimeout(openExpoDb(), OPEN_TIMEOUT_MS));
  try {
    // From this moment this browser is a SQLite browser: never fall back to the old format again.
    await AsyncStorage.setItem(USES_SQLITE_KEY, '1').catch(() => {});
    await step('migrate', () => migrateSchema(db));
    await step('journal', () => replayJournal(db));
    await step('absorb', () => absorbLegacy(db));
    return { backend: sqliteBackend(db), db, ...(await step('load', async () => ({ data: await loadData(db), settings: await loadSettings(db) }))) };
  } catch (e) {
    // The next try opens it again.
    await Promise.resolve(db.close?.()).catch(() => {});
    throw e;
  }
}

/** This page's hold on the tab lock, once it has it. */
let tabLock: TabLock | null = null;

type Attempt = { ok: true; opened: Opened } | { ok: false; error: StepError; held?: 'tab' | 'files' };

/**
 * One try at taking the data: the tab lock (unless this page has it), then SQLite — open,
 * migrate, replay the journal, take in old data, load. Shows nothing and never falls back:
 * a failure names its step and says whether another copy of the app holds the data.
 */
async function tryOpenSqlite(): Promise<Attempt> {
  if (!tabLock) tabLock = await takeTabLock();
  if (!tabLock) return { ok: false, held: 'tab', error: new StepError('tab lock', new Error('another page holds it')) };
  try {
    return { ok: true, opened: await openSqlite() };
  } catch (e) {
    const error = e instanceof StepError ? e : new StepError('open', e);
    return { ok: false, error, held: Platform.OS === 'web' && classifyOpenError(error.cause, error.step) === 'held' ? 'files' : undefined };
  }
}

async function openLocal(): Promise<{ backend: Backend; data: Data; settings: Settings }> {
  const json = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
  const legacy = parseLegacyState(json);
  // Never start empty on top of data we couldn't read: the first save would overwrite it.
  if (json && !legacy) throw new BlockedError('Saved data in this browser couldn’t be read. Download it below before doing anything else.');
  return { backend: localBackend, data: legacy?.data ?? emptyData(), settings: legacy?.settings ?? defaultSettings() };
}

let started = false;
/** Stops a waiting page's tries (`stopPersistence`). */
const stop = new AbortController();
/** Called the first time the waiting screen shows. */
let onWaiting = () => {};

const block = (message: string, details: string) => useStore.setState({ storage: { state: 'blocked', message, details } });

/** The waiting screen. Set only when its text changes, so a screen reader hears it once, not on every try. */
function wait(message: string, error: StepError) {
  const details = detailsLine(error);
  const now = useStore.getState().storage;
  if (now.state !== 'blocked' || !now.waiting || now.message !== message || now.details !== details) {
    useStore.setState({ storage: { state: 'blocked', waiting: true, message, details } });
  }
  onWaiting();
}

/** Never resolves once stopped. */
const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    const cancel = () => clearTimeout(timer);
    const timer = setTimeout(() => {
      stop.signal.removeEventListener('abort', cancel);
      resolve();
    }, ms);
    stop.signal.addEventListener('abort', cancel, { once: true });
  });

/**
 * Loads saved data into the store, then saves every change in the background. Call once.
 * Resolves once there's something to show: the data, a blocked screen, or the waiting screen
 * (which keeps trying by itself and opens as soon as the data is free).
 */
export async function startPersistence(): Promise<void> {
  if (started) return;
  started = true;
  const waiting = new Promise<void>((resolve) => (onWaiting = resolve));
  const run = start().catch((e) => {
    // Whatever happens, end in a state the person can act on — never an endless blank screen.
    console.warn('Could not load data', e);
    const cause = e instanceof StepError ? e.cause : e;
    if (cause instanceof BlockedError) block(cause.message, cause.details ?? detailsLine(e));
    else block(`Wanderment couldn’t load its data (${(cause as Error)?.message ?? cause}).`, detailsLine(e));
  });
  await Promise.race([run, waiting]);
}

/** Stops a waiting page from trying again (a page going away; tests). */
export function stopPersistence(): void {
  stop.abort();
}

let journalFailed = false;

function quarantineJournal() {
  const ls = webStorage();
  try {
    const raw = ls?.getItem(JOURNAL_KEY);
    if (raw) ls?.setItem(`${JOURNAL_KEY}-failed-${Date.now()}`, raw);
    ls?.removeItem(JOURNAL_KEY);
  } catch {
    // Nothing more we can do.
  }
}

async function start(): Promise<void> {
  let opened: Opened;
  let kind: 'sqlite' | 'local' = 'sqlite';
  for (let failures = 0; ; ) {
    if (stop.signal.aborted) return;
    const attempt = await tryOpenSqlite();
    if (stop.signal.aborted) return;
    if (attempt.ok) {
      opened = attempt.opened;
      break;
    }
    const { error, held } = attempt;
    if (held === 'tab') {
      // Queue for the lock rather than polling: it's granted the moment the other page lets go.
      wait(TAB_HELD, error);
      tabLock = await takeTabLock({ wait: true, signal: stop.signal });
      failures = 0;
      continue;
    }
    if (held === 'files') {
      // Nothing is shown or written meanwhile; the same worker can simply try again.
      wait(FILES_HELD, error);
      await sleep(retryDelay(failures++));
      continue;
    }
    if (error.cause instanceof BlockedError) throw error;
    const usedSqliteBefore = (await AsyncStorage.getItem(USES_SQLITE_KEY).catch(() => null)) === '1';
    if (Platform.OS !== 'web' || usedSqliteBefore) {
      // Showing an empty or stale app here could overwrite real data, so stop and explain.
      const message = (error.cause as Error)?.message ?? error.cause;
      throw new StepError(
        error.step,
        new BlockedError(
          `Wanderment couldn’t open its data (${message}). ${Platform.OS === 'web' ? 'Reload to try again.' : 'Close the app and open it again to retry.'}`,
          detailsLine(error),
        ),
      );
    }
    // This browser can't run SQLite at all (e.g. no OPFS in a private window): keep the first release's format.
    console.warn('SQLite unavailable, using localStorage', error.cause);
    opened = await step('load', openLocal);
    kind = 'local';
    break;
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
  useStore.setState({
    data: opened.data,
    ...opened.settings,
    storage: { state: 'ready', kind },
    saveError: journalFailed ? 'A change from your last visit couldn’t be restored. Check your latest entries.' : undefined,
  });

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
          // Something worth keeping now exists: ask the browser not to evict it (once, silently).
          void requestPersistence();
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

  // A tab still running the first release keeps writing the old key. Take in records it creates
  // (once), and say plainly that its edits to existing records won't carry over.
  const db = opened.db;
  if (kind === 'sqlite' && db && Platform.OS === 'web' && typeof window !== 'undefined') {
    let absorbed = await loadAbsorbed(db);
    window.addEventListener('storage', (e) => {
      if (e.key !== LEGACY_STORAGE_KEY || !e.newValue) return;
      const legacy = parseLegacyState(e.newValue);
      if (!legacy) return;
      const { data } = useStore.getState();
      const fresh = unseen(legacy.data, data, absorbed);
      absorbed = new Set([...absorbed, ...idsOf(legacy.data)]);
      void saveMeta(db, ABSORBED, JSON.stringify([...absorbed])).catch(() => {});
      useStore.setState({
        data: { ...data, threads: { ...data.threads, ...fresh.threads }, activities: { ...data.activities, ...fresh.activities } },
        saveError:
          'An older version of Wanderment is open in another tab. Close it — new entries made there are added here, but edits and deletions there aren’t.',
      });
    });
  }
}
