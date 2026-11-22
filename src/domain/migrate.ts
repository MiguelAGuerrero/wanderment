import { normalizeName } from './model';
import { Activity, Data, Id, Thread } from './types';

/**
 * Turns anything that claims to be Wanderment data (a backup, an old persisted store) into a
 * valid `Data`, repairing what can be repaired. Throws with a readable message otherwise.
 *
 * `Data.version` is the export format. It is still 1; when it changes, add a step here so
 * older backups keep importing.
 */
export function migrateData(raw: unknown, opts: { skipInvalid?: boolean } = {}): Data {
  /** Strict (imports): one bad record rejects the file. Lenient (saved data): skip it, keep the rest. */
  const strict = !opts.skipInvalid;
  const bad = (msg: string) => {
    if (strict) throw new Error(msg);
  };
  const d = raw as Partial<Data> | undefined;
  if (!d || typeof d !== 'object') throw new Error('The backup is missing its data.');
  if (typeof d.version === 'number' && d.version > 1) {
    throw new Error('That Wanderment backup was made by a newer version of the app. Update Wanderment, then import it again.');
  }
  if (d.version !== 1) throw new Error('That file isn’t a Wanderment backup.');
  if (!d.threads || typeof d.threads !== 'object' || !d.activities || typeof d.activities !== 'object') {
    throw new Error('The backup is missing wanders or activities.');
  }
  // The checks below are for imports only: saved data loads as it always has (P-04).
  if (strict && (Array.isArray(d.threads) || Array.isArray(d.activities))) {
    throw new Error('The backup’s wanders or activities aren’t in the right shape.');
  }

  const threads: Record<Id, Thread> = {};
  for (const [key, t] of Object.entries(d.threads as Record<string, Partial<Thread>>)) {
    if (!t || typeof t.name !== 'string' || !t.name.trim()) {
      bad('A wander in the backup is malformed.');
      continue;
    }
    const id = typeof t.id === 'string' && t.id ? t.id : key;
    if (strict && id === UNUSABLE_ID) throw new Error(`A wander in the backup has an id this app can’t use (“${id}”).`);
    if (strict && hasOwn(threads, id)) throw new Error(`Two wanders in the backup have the same id (“${id}”).`);
    threads[id] = {
      id,
      name: t.name.trim().replace(/\s+/g, ' '),
      next: typeof t.next === 'string' && t.next.trim() ? t.next.trim() : undefined,
      hidden: t.hidden === true,
      createdAt: isIso(t.createdAt) ? utc(t.createdAt) : new Date(0).toISOString(),
      // Never truncated: a backup with more than MAX_WHYS keeps every mark (readers cap).
      // A hidden thread is never a why (at most three, all visible), and only a real ISO timestamp
      // counts: loose strings like "1" or "March 7" parse as dates but aren't one this app wrote.
      declaredAt: t.hidden !== true && isIsoStamp(t.declaredAt) ? utc(t.declaredAt) : undefined,
    };
  }

  const activities: Record<Id, Activity> = {};
  for (const [key, a] of Object.entries(d.activities as Record<string, Partial<Activity>>)) {
    if (!a || typeof a.text !== 'string' || !a.text.trim()) {
      bad('An activity in the backup is malformed.');
      continue;
    }
    const rawTo = Array.isArray(a.toIds) ? a.toIds : (bad('An activity in the backup is malformed.'), []);
    const id = typeof a.id === 'string' && a.id ? a.id : key;
    if (strict && id === UNUSABLE_ID) throw new Error(`An activity in the backup has an id this app can’t use (“${id}”).`);
    if (strict && hasOwn(activities, id)) throw new Error(`Two activities in the backup have the same id (“${id}”).`);
    const doingId = typeof a.doingId === 'string' && a.doingId ? a.doingId : undefined;
    const createdAt = isIso(a.createdAt) ? utc(a.createdAt) : isIso(a.occurredAt) ? utc(a.occurredAt) : new Date(0).toISOString();
    activities[id] = {
      id,
      text: a.text,
      occurredAt: isIso(a.occurredAt) ? utc(a.occurredAt) : createdAt,
      createdAt,
      doingId,
      toIds: [...new Set(rawTo.filter((t): t is string => typeof t === 'string' && !!t && t !== doingId))],
      note: typeof a.note === 'string' && a.note.trim() ? a.note : undefined,
    };
  }
  if (strict) refuseSameNames(threads);
  return { version: 1, threads, activities };
}

/**
 * Assigning a record under this key sets an object's prototype instead (the storage loader does
 * exactly that), so it would vanish on the next load: an import refuses it rather than lose it.
 */
const UNUSABLE_ID = '__proto__';
/** Own records only: ids like "constructor" or "toString" are ids, not Object.prototype's. */
export const hasOwn = (records: object, id: string) => Object.prototype.hasOwnProperty.call(records, id);

/**
 * An import may not bring two wanders (hidden ones too) whose names `@` can't tell apart: refused,
 * naming them, so nothing is renamed behind the person's back (owner, 2026-11-22).
 */
function refuseSameNames(threads: Record<Id, Thread>) {
  const byName = new Map<string, Thread[]>();
  for (const t of Object.values(threads)) {
    const n = normalizeName(t.name);
    byName.set(n, [...(byName.get(n) ?? []), t]);
  }
  const groups = [...byName.values()].filter((g) => g.length > 1);
  if (!groups.length) return;
  // Short enough to read (audit F5): three groups, three names each, each name clipped.
  const SHOWN = 3;
  const named = (t: Thread) => `“${clip(t.name)}”${t.hidden ? ' (hidden)' : ''}`;
  const list = (g: Thread[]) => {
    const names = g.slice(0, SHOWN).map(named);
    if (g.length > SHOWN) return `${names.join(', ')} and ${g.length - SHOWN} more`;
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  };
  const one = groups.length === 1 && groups[0].length === 2;
  const shown = groups.slice(0, SHOWN).map(list).join('; ');
  const more = groups.length > SHOWN ? `; and ${groups.length - SHOWN} more` : '';
  const fix = 'in the file, or in the app the backup came from and export it again.';
  throw new Error(one ? `Two wanders have the same name: ${shown}. Rename one ${fix}` : `Some wanders have the same name: ${shown}${more}. Rename them ${fix}`);
}

/** At most this many characters of a name in a message; longer ones end in "…" (never cut through a character). */
const NAME_CHARS = 40;
function clip(name: string): string {
  const chars = Array.from(name);
  return chars.length > NAME_CHARS ? `${chars.slice(0, NAME_CHARS - 1).join('').trimEnd()}…` : name;
}

const isIso = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v));
const isIsoStamp = (v: unknown): v is string => isIso(v) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v);
/** Dates are compared as strings elsewhere, so store them all as UTC ("…Z"). */
const utc = (v: string) => new Date(v).toISOString();

/** What the first release saved (zustand `persist`, format version 1) under the key "wanderment". */
export const LEGACY_STORAGE_KEY = 'wanderment';

export interface Settings {
  showShading: boolean;
  /** Last few searches, newest first. */
  recentSearches: string[];
  /** Unattached activities the person chose to leave as they are (attach mode won't ask again). */
  leftAsIs: Id[];
  /** Home's "+ What's it all for?" was put off with "Not now": it never shows again (P-34). Absent until then. */
  whyOfferOff?: true;
  /** The first run (1-2-3, P-36) was finished, skipped or ended by a log: it never shows again. Absent until then. */
  firstRunDone?: true;
}

export const defaultSettings = (): Settings => ({ showShading: true, recentSearches: [], leftAsIs: [] });

export const sameSettings = (a: Settings, b: Settings) =>
  a.showShading === b.showShading &&
  a.recentSearches.join('\n') === b.recentSearches.join('\n') &&
  a.leftAsIs.join('\n') === b.leftAsIs.join('\n') &&
  !!a.whyOfferOff === !!b.whyOfferOff &&
  !!a.firstRunDone === !!b.firstRunDone;

/**
 * Persisted format v1 → v2: reads the JSON blob the first release kept in AsyncStorage
 * (localStorage on web) so it can be moved into SQLite. Returns undefined if there's nothing usable.
 */
export function parseLegacyState(json: string | null | undefined): { data: Data; settings: Settings } | undefined {
  if (!json) return undefined;
  let parsed: { state?: { data?: unknown; showShading?: unknown; recentSearches?: unknown; leftAsIs?: unknown; whyOfferOff?: unknown; firstRunDone?: unknown }; version?: number };
  try {
    parsed = JSON.parse(json);
  } catch {
    return undefined;
  }
  if (!parsed?.state?.data) return undefined;
  let data: Data;
  try {
    // Saved data is repaired, never rejected: one bad record must not hide all the others.
    data = migrateData(parsed.state.data, { skipInvalid: true });
  } catch {
    return undefined;
  }
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  return {
    data,
    settings: {
      showShading: parsed.state.showShading !== false,
      recentSearches: strings(parsed.state.recentSearches),
      leftAsIs: strings(parsed.state.leftAsIs),
      ...(parsed.state.whyOfferOff === true && { whyOfferOff: true as const }),
      ...(parsed.state.firstRunDone === true && { firstRunDone: true as const }),
    },
  };
}

/** The legacy format, still used on web when SQLite can't run (e.g. no OPFS in a private window). */
export const toLegacyState = (data: Data, settings: Settings): string => JSON.stringify({ state: { data, ...settings }, version: 1 });
