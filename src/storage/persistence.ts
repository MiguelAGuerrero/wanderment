import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { DataChanges, diffData, isEmptyDiff, missingFrom, pendingChanges, rebase, upsertsOf } from '@/domain/diff';
import { defaultSettings, LEGACY_STORAGE_KEY, parseLegacyState, sameSettings, Settings, toLegacyState } from '@/domain/migrate';
import { classifyOpenError, detailsLine, OpenStep, RECONNECT_GRACE_MS, retryDelay, StepError, TAKE_BACK_STUCK, takeBackStuck } from '@/domain/opening';
import { COLLECTIONS, Data, emptyData } from '@/domain/types';
import { Draft, sameDraft, ToLog, useStore } from '@/store/useStore';

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
  /** Nothing for a collection the page that wrote it didn't know (an older version's journal): `saveChanges` reads that as no change. */
  changes: DataChanges;
  /**
   * Only the settings this page changed since its last save (P-29), so replaying it never puts
   * back settings another copy of the app saved meanwhile. Older versions wrote them all.
   */
  settings?: Partial<Settings>;
}

const webStorage = (): Storage | undefined => {
  try {
    return Platform.OS === 'web' ? globalThis.localStorage : undefined;
  } catch {
    return undefined;
  }
};

/** Writes (or, with nothing, removes) the journal. True only if it now verifiably says that. */
function writeJournal(journal: Journal | undefined): boolean {
  const ls = webStorage();
  if (!ls) return false;
  try {
    if (!journal) {
      ls.removeItem(JOURNAL_KEY);
      return true;
    }
    const raw = JSON.stringify(journal);
    ls.setItem(JOURNAL_KEY, raw);
    return ls.getItem(JOURNAL_KEY) === raw;
  } catch {
    // Quota or privacy mode: the async write still happens, just without the safety net.
    return false;
  }
}

/** Whether a page that couldn't replay the journal set this text aside (`quarantineJournal`). */
function setAside(raw: string): boolean {
  const ls = webStorage();
  try {
    for (let i = 0; ls && i < ls.length; i++) {
      const key = ls.key(i);
      if (key?.startsWith(`${JOURNAL_KEY}-failed-`) && ls.getItem(key) === raw) return true;
    }
  } catch {
    // Can't tell: treat it as replayed.
  }
  return false;
}

/** The journal, and its text as read (to clear it only if nothing was added since). */
function readJournal(): { journal: Journal; raw: string } | undefined {
  try {
    const raw = webStorage()?.getItem(JOURNAL_KEY);
    if (!raw) return undefined;
    const j = JSON.parse(raw) as Journal;
    // Journals written by older versions may lack newer settings: those just aren't replayed.
    const settings = j.settings && typeof j.settings === 'object' ? j.settings : undefined;
    return { journal: { changes: j.changes, settings }, raw };
  } catch {
    return undefined;
  }
}

/** Removes the journal only if it still says `raw` (compare-and-clear): a newer entry stays. */
function clearJournal(raw: string) {
  const ls = webStorage();
  try {
    if (ls?.getItem(JOURNAL_KEY) === raw) ls.removeItem(JOURNAL_KEY);
  } catch {
    // It's replayed again next time; writes are whole records, so that's harmless.
  }
}

const SETTING_KEYS = ['showShading', 'recentSearches', 'leftAsIs', 'whyOfferOff', 'firstRunDone'] as const satisfies readonly (keyof Settings)[];

/** The settings in `now` that differ from `saved`. */
function changedSettings(saved: Settings, now: Settings): Partial<Settings> | undefined {
  const changed: Partial<Settings> = {};
  for (const k of SETTING_KEYS) if (JSON.stringify(saved[k]) !== JSON.stringify(now[k])) Object.assign(changed, { [k]: now[k] });
  return Object.keys(changed).length ? changed : undefined;
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
/** The step of opening running now (a step that never answers is named by the details line). */
let currentStep: OpenStep = 'open';

async function step<T>(name: OpenStep, task: () => Promise<T>): Promise<T> {
  currentStep = name;
  try {
    return await task();
  } catch (e) {
    throw e instanceof StepError ? e : new StepError(name, e);
  }
}

/** Shown while another copy holds the data. The page opens by itself once it's free. */
const TAB_HELD = 'The app is open in another tab or window. It’ll open here as soon as that one is closed or in the background.';
/** Taking the data back keeps failing for another reason (audit 2 F1). It still opens by itself once it can. */
const CANT_TAKE_BACK =
  'The app can’t open its data right now. It keeps trying, and this page will carry on by itself once it can; what you’ve typed is kept.';
const FILES_HELD =
  'The app is still open somewhere else in this browser — maybe an old tab, or a page in a tab’s history. Close its other tabs; if this stays, quit the browser and reopen it. Your data is safe; this page will open by itself.';

/** Ids already taken in from the first release's format — never taken in again (so deletions stick). */
const ABSORBED = 'legacyIds';

async function loadAbsorbed(db: Db): Promise<Set<string>> {
  try {
    return new Set(JSON.parse((await loadMeta(db, ABSORBED)) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

const idsOf = (data: Data) => COLLECTIONS.flatMap((c) => Object.keys(data[c]));

/**
 * Records in the first release's format that this database has never seen: written by a tab
 * still running the old version, or by an earlier fallback session. Records already taken in
 * once are ignored — even if deleted since — and the old format's copies of existing records
 * never overwrite the database's.
 */
function unseen(legacy: Data, base: Data, absorbed: Set<string>): Data {
  const missing = missingFrom(base, legacy);
  const fresh = emptyData();
  for (const c of COLLECTIONS) {
    Object.assign(fresh, { [c]: Object.fromEntries(upsertsOf(missing, c).filter((r) => !absorbed.has(r.id)).map((r) => [r.id, r])) });
  }
  return fresh;
}

/** `data` with `more`'s records added to (or put over) its own, in every collection. */
function withRecords(data: Data, more: Data): Data {
  const merged = { ...data };
  for (const c of COLLECTIONS) Object.assign(merged, { [c]: { ...data[c], ...more[c] } });
  return merged;
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
  /** Settles once the lock is free for others. */
  release(): Promise<void> | void;
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
    const done = locks
      .request('wanderment-data', opts.wait ? { signal: opts.signal } : { ifAvailable: true }, (lock) => {
        resolve(lock ? { release: () => (release(), done) } : null);
        return lock ? held : undefined;
      })
      .then(
        () => {},
        () => resolve(opts.signal?.aborted ? null : none),
      );
  });
}

/** Finishes changes interrupted by a reload or closed tab. Writes are whole records, so replaying one that did land is harmless. */
async function replayJournal(db: Db): Promise<void> {
  const read = readJournal();
  if (!read) return;
  const { journal, raw } = read;
  try {
    await saveChanges(db, journal.changes);
    // Only what this page changed, over what's saved now.
    if (journal.settings) await saveSettings(db, { ...(await loadSettings(db)), ...journal.settings });
    clearJournal(raw);
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
  kind: 'sqlite' | 'local';
  backend: Backend;
  db?: Db;
  /** Ids already taken in from the first release's format (sqlite only). */
  absorbed?: Set<string>;
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
    const loaded = await step('load', async () => ({ data: await loadData(db), settings: await loadSettings(db), absorbed: await loadAbsorbed(db) }));
    return { kind: 'sqlite', backend: sqliteBackend(db), db, ...loaded };
  } catch (e) {
    // The next try opens it again.
    await Promise.resolve(db.close?.()).catch(() => {});
    throw e;
  }
}

/** This page's hold on the tab lock, once it has it. */
let tabLock: TabLock | null = null;

type Attempt = { ok: true; opened: Opened } | { ok: false; error: StepError; held?: 'tab' | 'files' };

const tabHeld = (): Attempt => ({ ok: false, held: 'tab', error: new StepError('tab lock', new Error('another page holds it')) });

/**
 * One try at taking the data: the tab lock (unless this page has it), then SQLite — open,
 * migrate, replay the journal, take in old data, load. Shows nothing and never falls back:
 * a failure names its step and says whether another copy of the app holds the data.
 */
async function tryOpenSqlite(): Promise<Attempt> {
  if (!tabLock) tabLock = await takeTabLock();
  if (!tabLock) return tabHeld();
  try {
    return { ok: true, opened: await openSqlite() };
  } catch (e) {
    const error = e instanceof StepError ? e : new StepError('open', e);
    return { ok: false, error, held: Platform.OS === 'web' && classifyOpenError(error.cause, error.step) === 'held' ? 'files' : undefined };
  }
}

/** The same for a page in the localStorage fallback taking the data back. */
async function tryOpenLocal(): Promise<Attempt> {
  if (!tabLock) tabLock = await takeTabLock();
  if (!tabLock) return tabHeld();
  try {
    return { ok: true, opened: await step('load', openLocal) };
  } catch (e) {
    return { ok: false, error: e instanceof StepError ? e : new StepError('load', e) };
  }
}

async function openLocal(): Promise<Opened> {
  const json = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
  const legacy = parseLegacyState(json);
  // Never start empty on top of data we couldn't read: the first save would overwrite it.
  if (json && !legacy) throw new BlockedError('Saved data in this browser couldn’t be read. Download it below before doing anything else.');
  return { kind: 'local', backend: localBackend, data: legacy?.data ?? emptyData(), settings: legacy?.settings ?? defaultSettings() };
}

/**
 * Web: the draft, kept across a reload this page starts itself (Reload on the waiting screen, an
 * update), and put back once when the data shows again (P-29).
 */
const DRAFT_KEY = `${LEGACY_STORAGE_KEY}:draft`;

const sessionStore = (): Storage | undefined => {
  try {
    return Platform.OS === 'web' ? globalThis.sessionStorage : undefined;
  } catch {
    return undefined;
  }
};

/** Return pressed while reconnecting, kept with the draft: it's logged once the data shows again. */
const TO_LOG_KEY = `${DRAFT_KEY}:to-log`;

function keepDraft() {
  const { draft, toLog } = useStore.getState();
  try {
    if (draft.text.trim() || draft.toIds.length || draft.doingId) sessionStore()?.setItem(DRAFT_KEY, JSON.stringify(draft));
    if (toLog) sessionStore()?.setItem(TO_LOG_KEY, JSON.stringify(toLog));
  } catch {
    // Nothing more we can do.
  }
}

function takeKeptDraft(): { draft: Draft; toLog?: ToLog } | undefined {
  try {
    const raw = sessionStore()?.getItem(DRAFT_KEY);
    const rawToLog = sessionStore()?.getItem(TO_LOG_KEY);
    sessionStore()?.removeItem(DRAFT_KEY);
    sessionStore()?.removeItem(TO_LOG_KEY);
    if (!raw) return undefined;
    const d = JSON.parse(raw) as Draft;
    if (typeof d?.text !== 'string' || !Array.isArray(d.toIds)) return undefined;
    const toLog = rawToLog ? (JSON.parse(rawToLog) as ToLog) : undefined;
    // Only if it's still that line (`logMarked` checks again).
    return { draft: d, ...(toLog?.draft && sameDraft(toLog.draft, d) && { toLog }) };
  } catch {
    return undefined;
  }
}

/** Reloads the page, keeping what's in the log box. */
export function reloadKeepingDraft(): void {
  keepDraft();
  globalThis.location?.reload();
}

let started = false;
/** Stops a waiting page's tries (`stopPersistence`). */
const stop = new AbortController();
/** Called the first time the waiting screen shows. */
let onWaiting = () => {};

const block = (message: string, details: string) => useStore.setState({ storage: { state: 'blocked', message, details } });

/** The waiting screen. Set only when its text changes, so a screen reader hears it once, not on every try. */
function showWaiting(message: string, error: StepError) {
  const details = detailsLine(error);
  const now = useStore.getState().storage;
  if (now.state !== 'blocked' || !now.waiting || now.message !== message || now.details !== details) {
    useStore.setState({ storage: { state: 'blocked', waiting: true, message, details } });
  }
  onWaiting();
}

/** Woken when another page lets go of the data (its "released" ping). */
const wakers = new Set<() => void>();

/** Waits `ms`, or less if `signal` aborts or another page lets go of the data meanwhile. */
const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', done);
      wakers.delete(done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal.addEventListener('abort', done, { once: true });
    wakers.add(done);
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
  watching = watchLifecycle();
  await Promise.race([reconcile(), waiting]);
}

/** Stops a waiting page from trying again (a page going away; tests). */
export function stopPersistence(): void {
  stop.abort();
  acquiring?.abort();
}

/** Whatever happens, end in a state the person can act on — never an endless blank screen. */
function fail(e: unknown) {
  console.warn('Could not load data', e);
  const cause = e instanceof StepError ? e.cause : e;
  if (cause instanceof BlockedError) block(cause.message, cause.details ?? detailsLine(e));
  else block(`The app couldn’t load its data (${(cause as Error)?.message ?? cause}).`, detailsLine(e));
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

const RESTORE_FAILED = 'A change from your last visit couldn’t be restored. Check your latest entries.';

/*
 * Web: the page holds the data only while it's visible (P-29). OPFS files can be open in one
 * page at a time, and a page the browser suspends or keeps in a tab's history holds them for as
 * long as it lives — so a page lets go when it's hidden and takes the data back when it's shown.
 * It never lets go because another page asks: of two visible windows, the second waits.
 */

/** Set, then removed at once, when a page lets go of the data: a waiting page tries again right away. */
const RELEASED_KEY = `${LEGACY_STORAGE_KEY}:released`;

/** True where the page's visibility is known (web); elsewhere the data is always held. */
let watching = false;
let pageGone = false;
/** The page is about to reload itself (an update). */
let leaving = false;
const wanted = () => !leaving && !pageGone && !(watching && document.visibilityState === 'hidden');

function watchLifecycle(): boolean {
  if (Platform.OS !== 'web' || typeof document === 'undefined' || typeof window === 'undefined' || !document.addEventListener) return false;
  const wake = () => wakers.forEach((w) => w());
  const changed = () => {
    // Back on screen: a try that's waiting goes again now.
    if (wanted()) wake();
    void reconcile();
  };
  document.addEventListener('visibilitychange', changed);
  // A frozen page can't run anything, so `freeze` can't let go of the data; `resume` takes it back.
  document.addEventListener('resume', changed);
  // A backup for when visibilitychange doesn't come (or comes late).
  window.addEventListener('pagehide', () => ((pageGone = true), changed()));
  window.addEventListener('pageshow', () => ((pageGone = false), changed()));
  window.addEventListener('online', wake);
  window.addEventListener('storage', (e) => {
    if (e.key === RELEASED_KEY && e.newValue) wake();
  });
  return true;
}

/** What this page has open, while it holds the data. */
let held: Opened | undefined;
/** The storage this page settled on when it first opened; it takes back the same kind. */
let kind: 'sqlite' | 'local' = 'sqlite';
/** The data has been on screen (so a page taking it back keeps showing it meanwhile). */
let shown = false;
/** What's saved, as far as this page knows. */
let saved: { data: Data; settings: Settings } = { data: emptyData(), settings: defaultSettings() };
/** The data a write has been sent for but not yet confirmed. */
let inflight: Data | undefined;
/** Letting go: no new writes start (changes go to the journal), the one in flight finishes. */
let letting = false;
/**
 * The worker didn't confirm it let go of the files (its shutdown failed or timed out): the page
 * stays the holder — it keeps the tab lock, so another page waits for that rather than for files
 * it can't open — and lets go properly the next time it's hidden.
 */
let filesKept = false;
let warnedKept = false;

const settingsOf = (s: ReturnType<typeof useStore.getState>): Settings => ({
  showShading: s.showShading,
  recentSearches: s.recentSearches,
  leftAsIs: s.leftAsIs,
  ...(s.whyOfferOff && { whyOfferOff: true as const }),
  ...(s.firstRunDone && { firstRunDone: true as const }),
});
const journal = (data: Data, settings: Settings) =>
  kind === 'sqlite' && writeJournal({ changes: pendingChanges(saved.data, inflight, data), settings: changedSettings(saved.settings, settings) });
/**
 * Set when the page let go with changes only its journal holds: what was saved before them, and
 * the journal's text. If that journal is set aside (its replay failed, here or in another page),
 * taking the data back puts the changes back on screen from this base, and the next save retries.
 */
let unwritten: { base: { data: Data; settings: Settings }; raw: string } | undefined;

// One write at a time; changes made meanwhile are folded into the next write.
let running = false;
let again = false;
/** Settles when the current run of writes is over. */
let flushed: Promise<void> = Promise.resolve();

function flush(): Promise<void> {
  if (running) {
    again = true;
    return flushed;
  }
  running = true;
  flushed = (async () => {
    try {
      do {
        again = false;
        // Not holding the data (hidden, or taking it back): the journal keeps the change until then.
        const backend = held && !letting ? held.backend : undefined;
        if (!backend) return;
        const s = useStore.getState();
        const target = { data: s.data, settings: settingsOf(s) };
        if (target.data === saved.data && sameSettings(target.settings, saved.settings)) continue;
        // A save that writes nothing (equal values, new objects) says nothing about earlier failures.
        const writes = !isEmptyDiff(diffData(saved.data, target.data)) || !sameSettings(saved.settings, target.settings);
        try {
          inflight = target.data;
          await backend.save(saved, target);
          saved = target;
          inflight = undefined;
          // The journal now only needs what changed after this write (if anything).
          const now = useStore.getState();
          if (now.data === target.data && sameSettings(settingsOf(now), target.settings)) writeJournal(undefined);
          else journal(now.data, settingsOf(now));
          if (writes && useStore.getState().saveError) useStore.setState({ saveError: undefined });
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
  })();
  return flushed;
}

/** Saves changes and takes in old-version tabs' records. Once, the first time the data is shown. */
function wire() {
  useStore.subscribe((s, prev) => {
    if (s.data === prev.data && s.showShading === prev.showShading && s.recentSearches === prev.recentSearches && s.leftAsIs === prev.leftAsIs && s.whyOfferOff === prev.whyOfferOff && s.firstRunDone === prev.firstRunDone) return;
    journal(s.data, settingsOf(s));
    void flush();
  });

  // A tab still running the first release keeps writing the old key. Take in records it creates
  // (once), and say plainly that its edits to existing records won't carry over. While this page
  // doesn't hold the data, they wait in the old key for whichever page opens it next.
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key !== LEGACY_STORAGE_KEY || !e.newValue) return;
      const opened = held;
      if (!opened?.db || !opened.absorbed || letting) return;
      const legacy = parseLegacyState(e.newValue);
      if (!legacy) return;
      const { data } = useStore.getState();
      const fresh = unseen(legacy.data, data, opened.absorbed);
      for (const id of idsOf(legacy.data)) opened.absorbed.add(id);
      void saveMeta(opened.db, ABSORBED, JSON.stringify([...opened.absorbed])).catch(() => {});
      useStore.setState({
        data: withRecords(data, fresh),
        saveError:
          'An older version of the app is open in another tab. Close it — new entries made there are added here, but edits and deletions there aren’t.',
      });
    });
  }
}

/** The data is this page's now: show it (the first time), or take it back keeping what's on screen. */
function publish(opened: Opened) {
  held = opened;
  kind = opened.kind;
  filesKept = false;
  const restoreFailed = journalFailed;
  journalFailed = false;
  if (!shown) {
    shown = true;
    saved = { data: opened.data, settings: opened.settings };
    const kept = takeKeptDraft();
    useStore.setState({
      data: opened.data,
      ...opened.settings,
      storage: { state: 'ready', kind },
      saveError: restoreFailed ? RESTORE_FAILED : undefined,
      ...(kept && !useStore.getState().draft.text && { draft: kept.draft, toLog: kept.toLog }),
    });
    wire();
    // Return pressed before the reload, while reconnecting.
    useStore.getState().logMarked();
    useStore.getState().verbMarked();
    return;
  }
  // The page can change the data again. Other pages' changes replace what's shown, and so do the
  // saved settings (this page couldn't change either while it didn't hold the data; what it
  // changed before letting go was in the journal it just replayed). The draft is kept.
  useStore.setState({ storage: { state: 'ready', kind }, ...(restoreFailed && { saveError: RESTORE_FAILED }) });
  const s = useStore.getState();
  // Changes only the journal held, and that journal was set aside rather than replayed: they go
  // back on screen (from what was saved before them), and the next save retries them.
  const base = unwritten && setAside(unwritten.raw) ? unwritten.base : saved;
  unwritten = undefined;
  const r = rebase(base.data, s.data, opened.data);
  saved = { data: r.saved, settings: opened.settings };
  const own = settingsOf(s);
  const ownSettings = changedSettings(base.settings, own);
  // The same objects if equal, so nothing re-renders or re-saves.
  const settings = sameSettings(own, opened.settings) ? own : { ...opened.settings, ...(base !== saved && ownSettings) };
  s.refreshData(r.data, settings, !r.changed);
  // Return pressed while reconnecting; and (P-86) a press on the runner, if its run is unchanged.
  useStore.getState().logMarked();
  useStore.getState().verbMarked();
  void flush();
}

/**
 * Takes the data: the Part A tries (waiting while another copy holds it), then shows it. Ends
 * early when the page is hidden meanwhile (`signal`). With data already on screen it stays
 * there, with "Reconnecting…" on Log, for the first few tries before the waiting screen shows.
 */
async function acquire(signal: AbortSignal): Promise<void> {
  const since = Date.now();
  let later: (() => void) | undefined;
  let graceTimer: ReturnType<typeof setTimeout> | undefined;
  /**
   * A try at taking the data back that neither succeeds nor fails (a step that never answers) is
   * told too, 30 s into it, unless something else is already on screen. It ends when the try does.
   */
  const watchTry = () =>
    shown
      ? setTimeout(() => {
          if (signal.aborted || stop.signal.aborted || useStore.getState().storage.state !== 'ready') return;
          showWaiting(CANT_TAKE_BACK, new StepError(currentStep, new Error('No answer for 30 s')));
        }, TAKE_BACK_STUCK.ms)
      : undefined;
  const wait = (message: string, error: StepError) => {
    if (useStore.getState().storage.state === 'ready' && Date.now() - since < RECONNECT_GRACE_MS) {
      later = () => showWaiting(message, error);
      graceTimer ??= setTimeout(() => later?.(), since + RECONNECT_GRACE_MS - Date.now());
      return;
    }
    showWaiting(message, error);
  };
  try {
    for (let failures = 0; ; ) {
      if (stop.signal.aborted || signal.aborted) return;
      const stuck = watchTry();
      const attempt = await (shown && kind === 'local' ? tryOpenLocal() : tryOpenSqlite()).finally(() => clearTimeout(stuck));
      if (stop.signal.aborted) return;
      // Even if hidden meanwhile: show it, then the loop lets go again.
      if (attempt.ok) return publish(attempt.opened);
      if (signal.aborted) return;
      const { error, held: holder } = attempt;
      if (holder === 'tab') {
        // Queue for the lock rather than polling: it's granted the moment the other page lets go.
        wait(TAB_HELD, error);
        tabLock = await takeTabLock({ wait: true, signal });
        failures = 0;
        continue;
      }
      if (holder === 'files') {
        // Nothing is shown or written meanwhile; the same worker can simply try again.
        wait(FILES_HELD, error);
        await sleep(retryDelay(failures++), signal);
        continue;
      }
      if (error.cause instanceof BlockedError) throw error;
      if (shown) {
        // Taking the data back failed for another reason (an open that timed out, the wasm out of
        // reach): the data stays on screen with "Reconnecting…", and it tries again (sooner when
        // the network is back, or the page is shown again). If it keeps failing, the person is
        // told, over the app, with Reload and the details; it keeps trying behind that.
        if (failures === 0) console.warn('Could not take the data back; trying again', error);
        failures++;
        if (takeBackStuck(failures, Date.now() - since) || useStore.getState().storage.state === 'blocked') showWaiting(CANT_TAKE_BACK, error);
        await sleep(retryDelay(failures - 1), signal);
        continue;
      }
      const usedSqliteBefore = (await AsyncStorage.getItem(USES_SQLITE_KEY).catch(() => null)) === '1';
      if (Platform.OS !== 'web' || usedSqliteBefore) {
        // Showing an empty or stale app here could overwrite real data, so stop and explain.
        const message = (error.cause as Error)?.message ?? error.cause;
        throw new StepError(
          error.step,
          new BlockedError(
            `The app couldn’t open its data (${message}). ${Platform.OS === 'web' ? 'Reload to try again.' : 'Close the app and open it again to retry.'}`,
            detailsLine(error),
          ),
        );
      }
      // This browser can't run SQLite at all (e.g. no OPFS in a private window): keep the first release's format.
      console.warn('SQLite unavailable, using localStorage', error.cause);
      return publish(await step('load', openLocal));
    }
  } finally {
    clearTimeout(graceTimer);
    later = undefined;
  }
}

/**
 * Lets go of the data, in this order: no new writes; the write in flight finishes (its commit
 * clears the journal); the database closes and its worker lets go of the files; the tab lock is
 * released; other pages hear about it. Changes made from here on wait in the journal.
 */
async function letGo(): Promise<void> {
  const opened = held!;
  letting = true;
  // From now on the page doesn't change the data (the store's gate), so nothing new is journaled.
  const now = useStore.getState().storage;
  if (now.state === 'ready') useStore.setState({ storage: { state: 'ready', kind, reconnecting: true } });
  let kept = false;
  try {
    await flushed;
    // What isn't written yet goes in the journal, which whoever opens next (this page or another)
    // replays: once the journal verifiably holds it, it counts as saved, so taking the data back
    // never puts it back over a later edit made elsewhere. If the journal can't hold it, the base
    // stays, and taking the data back puts this page's changes back and saves them. (The gate is
    // closed: nothing changes after this.)
    if (opened.kind === 'sqlite') {
      const s = useStore.getState();
      const now = { data: s.data, settings: settingsOf(s) };
      const pending: Journal = { changes: pendingChanges(saved.data, undefined, now.data), settings: changedSettings(saved.settings, now.settings) };
      if (isEmptyDiff(pending.changes) && !pending.settings) saved = now;
      else if (writeJournal(pending)) {
        unwritten = { base: saved, raw: JSON.stringify(pending) };
        saved = now;
      }
    }
    if (opened.db) {
      await Promise.resolve(opened.db.close?.()).catch((e) => console.warn('Could not close the database', e));
      await opened.db.shutdown?.().catch((e) => {
        kept = true;
        if (!warnedKept) console.warn('The database worker didn’t let go of the files; this page keeps the data until it’s hidden again', e);
        warnedKept = true;
      });
    }
  } finally {
    held = undefined;
    letting = false;
    filesKept = kept;
  }
  if (!kept) await releaseTabLock();
}

/** Lets go of the tab lock, and once it's free tells other pages (a waiting page tries again at once). */
async function releaseTabLock() {
  const released = tabLock?.release();
  tabLock = null;
  await released;
  try {
    webStorage()?.setItem(RELEASED_KEY, String(Date.now()));
    webStorage()?.removeItem(RELEASED_KEY);
  } catch {
    // The other page still tries again by itself.
  }
}

/** SQLite on web can let go only if its worker was found (expoDb.ts); otherwise it keeps the data, as before. */
const canLetGo = (o: Opened) => o.kind === 'local' || !!o.db?.shutdown;

let failed = false;
let looping = false;
let recheck = false;
/** Settles when the current run of the loop is over. */
let reconciled: Promise<void> = Promise.resolve();
/** Aborted when the page is hidden while it's still trying to take the data. */
let acquiring: AbortController | undefined;

/** Whether the page holds what it should: the data while wanted, nothing (not even the tab lock) while hidden. */
function settled(): boolean {
  if (stop.signal.aborted) return true;
  if (!wanted()) return held ? !canLetGo(held) : filesKept || !tabLock;
  return failed || !!held;
}

/** Steps one run of the loop may take before it gives up (and tries again a little later). */
const MAX_STEPS = 100;
let warnedSteps = false;
/** Lets the page run (events, rendering) before the next step: a task of its own, not a timer. */
const nextTurn = () =>
  new Promise<void>((resolve) => {
    if (typeof MessageChannel !== 'function') return void setTimeout(resolve, 0);
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      resolve();
    };
    channel.port2.postMessage(null);
  });

/**
 * The one place that takes and lets go of the data, one step at a time. After each step it looks
 * again at what's wanted, so a page hidden while opening lets go right after, and a page shown
 * while closing takes the data back once it's closed. Rapid toggling just re-runs it.
 */
function reconcile(): Promise<void> {
  if (!wanted()) acquiring?.abort();
  if (looping) {
    recheck = true;
    return reconciled;
  }
  looping = true;
  // (A run with nothing to do ends synchronously, so the flag is set before it starts.)
  reconciled = (async () => {
    try {
      for (let steps = 0; recheck || !settled(); ) {
        recheck = false;
        if (settled()) continue;
        // Between steps, let the page (and its events) run.
        if (steps > 0) {
          await nextTurn();
          if (settled()) continue;
        }
        if (++steps > MAX_STEPS) {
          // Something keeps it from settling: don't spin; look again in a while.
          if (!warnedSteps) console.warn('Wanderment: taking and letting go of the data didn’t settle; trying again shortly');
          warnedSteps = true;
          setTimeout(() => void reconcile(), retryDelay(5));
          break;
        }
        if (!wanted()) {
          if (held) await letGo();
          else {
            // Waiting, or stuck on a blocked screen: don't keep other pages out meanwhile.
            tabLock?.release();
            tabLock = null;
          }
        } else {
          acquiring = new AbortController();
          try {
            await acquire(acquiring.signal);
          } finally {
            acquiring = undefined;
          }
        }
      }
    } catch (e) {
      failed = true;
      fail(e);
    } finally {
      looping = false;
    }
  })();
  return reconciled;
}

/** Lets go of the data before the page reloads itself (an update), so the new page opens at once. */
export async function releaseData(): Promise<void> {
  keepDraft();
  leaving = true;
  await Promise.race([reconcile(), new Promise((resolve) => setTimeout(resolve, 3000))]);
}
