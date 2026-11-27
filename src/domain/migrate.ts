import { normalizeName } from './model';
import { Activity, Collection, COLLECTION_INFO, COLLECTIONS, Data, DATA_VERSION, emptyData, Id, RecordOf, Routine, Run, Thread } from './types';

/** Says a record is malformed: throws when strict (imports), does nothing when lenient (saved data). */
type Bad = (msg: string) => void;

/**
 * Reads one record of each collection from anything that claims to be one: the repaired record, or
 * undefined (after calling `bad`) when it can't be used. `key` is the record's key in the file,
 * which counts as its id when it has none.
 */
const READ: { [K in Collection]: (raw: unknown, key: string, bad: Bad) => RecordOf<K> | undefined } = {
  threads(raw, key, bad) {
    const t = raw as Partial<Thread> | undefined;
    if (!t || typeof t.name !== 'string' || !t.name.trim()) {
      bad('An item from the previous app in the backup is malformed.');
      return undefined;
    }
    return {
      id: typeof t.id === 'string' && t.id ? t.id : key,
      name: t.name.trim().replace(/\s+/g, ' '),
      next: typeof t.next === 'string' && t.next.trim() ? t.next.trim() : undefined,
      hidden: t.hidden === true,
      createdAt: isIso(t.createdAt) ? utc(t.createdAt) : new Date(0).toISOString(),
      // Never truncated: a backup with more than MAX_WHYS keeps every mark (readers cap).
      // A hidden thread is never a why (at most three, all visible), and only a real ISO timestamp
      // counts: loose strings like "1" or "March 7" parse as dates but aren't one this app wrote.
      declaredAt: t.hidden !== true && isIsoStamp(t.declaredAt) ? utc(t.declaredAt) : undefined,
    };
  },
  activities(raw, key, bad) {
    const a = raw as Partial<Activity> | undefined;
    if (!a || typeof a.text !== 'string' || !a.text.trim()) {
      bad('An activity in the backup is malformed.');
      return undefined;
    }
    const rawTo = Array.isArray(a.toIds) ? a.toIds : (bad('An activity in the backup is malformed.'), []);
    const doingId = typeof a.doingId === 'string' && a.doingId ? a.doingId : undefined;
    const createdAt = isIso(a.createdAt) ? utc(a.createdAt) : isIso(a.occurredAt) ? utc(a.occurredAt) : new Date(0).toISOString();
    return {
      id: typeof a.id === 'string' && a.id ? a.id : key,
      text: a.text,
      occurredAt: isIso(a.occurredAt) ? utc(a.occurredAt) : createdAt,
      createdAt,
      doingId,
      toIds: [...new Set(rawTo.filter((t): t is string => typeof t === 'string' && !!t && t !== doingId))],
      note: typeof a.note === 'string' && a.note.trim() ? a.note : undefined,
      // P-73: only when set (absent = settled, as older backups read); only `true` is lit, and only a
      // real ISO timestamp is a settledAt (as with declaredAt).
      ...(a.lit === true && { lit: true as const }),
      ...(isIsoStamp(a.settledAt) && { settledAt: utc(a.settledAt) }),
    };
  },
  // Routines and runs (P-85): structure only. The record must be an object whose stored columns have
  // the right types; everything else it carries is kept exactly as it is. P-86 adds the shape of what
  // the runner reads (steps, a run's place and changes) for imports; what it means (items that exist,
  // no routine inside itself, frames that point somewhere) is repaired when read, never refused.
  routines(raw, key, bad) {
    const r = raw as Partial<Routine> | null;
    if (!isRecord(r) || typeof r.words !== 'string' || typeof r.named !== 'boolean' || typeof r.createdAt !== 'string' || !textOrAbsent(r.removedAt)) {
      bad('A routine in the backup is malformed.');
      return undefined;
    }
    // P-86: its steps, when it has any, are a list of things each with an id of its own. Whether a
    // step points at a routine that exists is not checked: reading copes (run.ts), and nothing is lost.
    if (r.items !== undefined) {
      const items = Array.isArray(r.items) ? r.items : undefined;
      if (!items || !items.every((i) => isRecord(i) && typeof i.id === 'string' && !!i.id)) bad(`The routine “${clip(r.words)}” in the backup has steps that aren’t in the right shape.`);
      else {
        const ids = new Set<string>();
        for (const { id } of items as { id: string }[]) {
          if (ids.has(id)) bad(`The routine “${clip(r.words)}” in the backup has two steps with the same id (“${clip(id)}”).`);
          ids.add(id);
        }
      }
    }
    return { ...withoutNulls(r, ['removedAt']), id: typeof r.id === 'string' && r.id ? r.id : key } as Routine;
  },
  runs(raw, key, bad) {
    const r = raw as Partial<Run> | null;
    if (!isRecord(r) || typeof r.routineId !== 'string' || typeof r.startedAt !== 'string' || !textOrAbsent(r.parentRunId) || !textOrAbsent(r.endedAt) || !textOrAbsent(r.waitingSince)) {
      bad('A run in the backup is malformed.');
      return undefined;
    }
    // P-86: its place is a list of levels (a sequence, an item or none, a round), its changes a list.
    const frame = (f: unknown) => isRecord(f) && typeof f.seq === 'string' && textOrAbsent(f.at) && (f.round === undefined || typeof f.round === 'number');
    if (r.frames !== undefined && !(Array.isArray(r.frames) && r.frames.every(frame))) bad('A run in the backup has a place that isn’t in the right shape.');
    if (r.changes !== undefined && !(Array.isArray(r.changes) && r.changes.every(isRecord))) bad('A run in the backup has changes that aren’t in the right shape.');
    return { ...withoutNulls(r, ['parentRunId', 'endedAt', 'waitingSince']), id: typeof r.id === 'string' && r.id ? r.id : key } as Run;
  },
};

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
/** An optional field: a string, or not there. Null counts as not there (and is left out by `withoutNulls`). */
const textOrAbsent = (v: unknown) => v === undefined || v === null || typeof v === 'string';
/** `record` without those of `fields` that are null: an optional field is set or absent, never null. */
function withoutNulls(record: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  const out = { ...record };
  for (const f of fields) if (out[f] === null) delete out[f];
  return out;
}

/**
 * Turns anything that claims to be Wanderment data (a backup, an old persisted store) into a
 * valid `Data`, repairing what can be repaired. Throws with a readable message otherwise.
 *
 * `Data.version` is the export format (`DATA_VERSION`). When it changes, add a step here so older
 * backups keep importing. Every collection in `COLLECTIONS` is rebuilt, so none can be dropped.
 */
export function migrateData(raw: unknown, opts: { skipInvalid?: boolean } = {}): Data {
  /** Strict (imports): one bad record rejects the file. Lenient (saved data): skip it, keep the rest. */
  const strict = !opts.skipInvalid;
  const bad: Bad = (msg) => {
    if (strict) throw new Error(msg);
  };
  const d = raw as (Partial<Record<Collection, unknown>> & { version?: unknown }) | undefined;
  if (!d || typeof d !== 'object') throw new Error('The backup is missing its data.');
  // (A version that isn't a whole number was never written; above 1 it has always read as newer.)
  if (typeof d.version === 'number' && (d.version > DATA_VERSION || (d.version > 1 && !Number.isInteger(d.version)))) {
    throw new Error('That backup was made by a newer version of the app. Update the app, then import it again.');
  }
  if (typeof d.version !== 'number' || !Number.isInteger(d.version) || d.version < 1) throw new Error('That file isn’t a backup from this app.');
  const version = d.version;
  if (!d.threads || typeof d.threads !== 'object' || !d.activities || typeof d.activities !== 'object') {
    throw new Error('The backup is missing the previous app’s items.');
  }
  // The checks below are for imports only: saved data loads as it always has (P-04).
  if (strict && (Array.isArray(d.threads) || Array.isArray(d.activities))) {
    throw new Error('The backup’s items from the previous app aren’t in the right shape.');
  }

  const data = emptyData();
  for (const c of COLLECTIONS) {
    const { a, many, since } = COLLECTION_INFO[c];
    if (since > version) {
      // A format from before this collection existed has none of it. A file that says otherwise is
      // mislabelled or damaged: an import refuses it; saved data is read as its format says.
      if (d[c] !== undefined) bad(`The backup says it’s from before ${many} existed, but it has ${many}.`);
      continue;
    }
    const source = d[c];
    if (source === undefined || source === null) {
      // The app always writes every collection: an import without one is a partial file (wanders
      // and activities were refused above). Saved data keeps what it has.
      bad(`The backup is missing its ${many}.`);
      continue;
    }
    if (typeof source !== 'object' || (strict && Array.isArray(source))) {
      bad(`The backup’s ${many} aren’t in the right shape.`);
      continue;
    }
    const records = data[c] as Record<Id, { id: Id }>;
    for (const [key, value] of Object.entries(source)) {
      const record = READ[c](value, key, bad);
      if (!record) continue;
      const { id } = record;
      if (strict && id === UNUSABLE_ID) throw new Error(`${a} in the backup has an id this app can’t use (“${id}”).`);
      if (strict && hasOwn(records, id)) throw new Error(`Two ${many} in the backup have the same id (“${id}”).`);
      records[id] = record;
    }
  }
  if (strict) refuseSameNames(data.threads);
  return data;
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
  throw new Error(one ? `Two items from the previous app have the same name: ${shown}. Rename one ${fix}` : `Some items from the previous app have the same name: ${shown}${more}. Rename them ${fix}`);
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
export const toLegacyState = (data: Data, settings: Settings): string => JSON.stringify({ state: { data: { ...data, version: DATA_VERSION }, ...settings }, version: 1 });
