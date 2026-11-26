import { Collection, COLLECTIONS, Data, Id, RecordOf } from './types';
import { isEntry, nameKey } from './values';

/**
 * What to write: per collection, the records to put and the ids to remove. This is also the
 * journal's stored shape (persistence.ts), so the key names never change: `upsertThreads`,
 * `deleteThreads`, `upsertActivities`, … one pair per entry of `COLLECTIONS`. A journal written
 * before a collection existed simply lacks its pair: read it with `upsertsOf` / `deletesOf`.
 */
export type DataChanges = { [K in Collection as `upsert${Capitalize<K>}`]: RecordOf<K>[] } & { [K in Collection as `delete${Capitalize<K>}`]: Id[] };

type AnyRecord = { id: Id };
const capital = (c: Collection) => `${c[0].toUpperCase()}${c.slice(1)}`;
const upsertKey = (c: Collection) => `upsert${capital(c)}` as keyof DataChanges;
const deleteKey = (c: Collection) => `delete${capital(c)}` as keyof DataChanges;
/** A collection's records, whatever their kind (every record has an id). */
const of = (data: Data, c: Collection) => data[c] as Record<Id, AnyRecord>;
/**
 * A record by id, own records only: ids like "constructor" or "toString" are ids, not what every
 * object inherits (a plain lookup finds a function there, so the record could never be deleted).
 */
const get = <T,>(records: Record<Id, T>, id: Id): T | undefined => (Object.prototype.hasOwnProperty.call(records, id) ? records[id] : undefined);
/** `data` with one collection replaced. */
const withRecords = (data: Data, c: Collection, records: Record<Id, AnyRecord>): Data => ({ ...data, [c]: records });

/** The records a set of changes puts into a collection (none when it doesn't mention the collection). */
export const upsertsOf = <K extends Collection>(changes: Partial<DataChanges>, c: K) => ((changes[upsertKey(c)] as RecordOf<K>[] | undefined) ?? []) as RecordOf<K>[];
/** The ids a set of changes removes from a collection (none when it doesn't mention the collection). */
export const deletesOf = (changes: Partial<DataChanges>, c: Collection) => (changes[deleteKey(c)] as Id[] | undefined) ?? [];

export const emptyChanges = (): DataChanges => Object.fromEntries(COLLECTIONS.flatMap((c) => [[upsertKey(c), []], [deleteKey(c), []]])) as unknown as DataChanges;

const put = (changes: DataChanges, c: Collection, record: AnyRecord) => void (changes[upsertKey(c)] as AnyRecord[]).push(record);
const drop = (changes: DataChanges, c: Collection, id: Id) => void (changes[deleteKey(c)] as Id[]).push(id);

/**
 * What changed between two versions of the data. Records are immutable, so a record that is
 * a different object is a changed record — no deep comparison needed.
 */
export function diffData(prev: Data, next: Data): DataChanges {
  const changes = emptyChanges();
  for (const c of COLLECTIONS) {
    const before = of(prev, c);
    const after = of(next, c);
    for (const [id, r] of Object.entries(after)) if (get(before, id) !== r) put(changes, c, r);
    for (const id of Object.keys(before)) if (!get(after, id)) drop(changes, c, id);
  }
  return changes;
}

export const isEmptyDiff = (changes: DataChanges) => COLLECTIONS.every((c) => !upsertsOf(changes, c).length && !deletesOf(changes, c).length);

/**
 * Everything that must be written so the database ends up equal to `current`, whether or not
 * a write of `inflight` (already sent, not yet confirmed) lands. Every record touched since
 * `committed` is written with its current value, or deleted if it's gone.
 */
export function pendingChanges(committed: Data, inflight: Data | undefined, current: Data): DataChanges {
  const diffs = [diffData(committed, current), ...(inflight ? [diffData(committed, inflight), diffData(inflight, current)] : [])];
  const changes = emptyChanges();
  for (const c of COLLECTIONS) {
    const ids = new Set<Id>();
    for (const d of diffs) {
      upsertsOf(d, c).forEach((r) => ids.add(r.id));
      deletesOf(d, c).forEach((id) => ids.add(id));
    }
    const now = of(current, c);
    for (const id of ids) {
      const record = get(now, id);
      if (record) put(changes, c, record);
      else drop(changes, c, id);
    }
  }
  return changes;
}

/**
 * What Undo needs: each touched record before and after the action (null = didn't exist).
 * Undo puts back only the fields that are still exactly as the action left them, so edits made
 * afterwards — a new next step, a rename, a note — survive.
 */
export type UndoEntry = { [K in Collection]: Record<Id, { before: RecordOf<K> | null; after: RecordOf<K> | null }> };

type AnyUndo = Record<Id, { before: AnyRecord | null; after: AnyRecord | null }>;

export function undoEntry(prev: Data, next: Data): UndoEntry {
  const changes = diffData(prev, next);
  const entry = Object.fromEntries(COLLECTIONS.map((c) => [c, {}])) as UndoEntry;
  for (const c of COLLECTIONS) {
    const touched = entry[c] as AnyUndo;
    const before = of(prev, c);
    for (const r of upsertsOf(changes, c)) touched[r.id] = { before: get(before, r.id) ?? null, after: r };
    for (const id of deletesOf(changes, c)) touched[id] = { before: get(before, id) ?? null, after: null };
  }
  return entry;
}

const same = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);

/**
 * P-96 audit F1: a run's `values` is one field holding every value, so a value typed after an action
 * would stop that action's Undo from touching it at all (or, reverted whole, drop what was typed).
 * Undone entry by entry instead (an entry is one name at one level): what the action added goes if it
 * is still as the action left it; what it changed goes back if untouched since; what it removed comes
 * back unless that name at that level was typed again since — a value typed since is never dropped.
 * Anything that is not an entry is left as it is now.
 */
function revertValues(current: unknown[], before: unknown[], after: unknown[]): unknown[] {
  const key = (e: unknown) => (isEntry(e) ? `${e.level}|${nameKey(e.name)}` : `raw:${JSON.stringify(e)}`);
  const byKey = (list: unknown[]) => new Map(list.map((e) => [key(e), e] as const));
  const b = byKey(before);
  const a = byKey(after);
  const now = new Set(current.map(key));
  const out: unknown[] = [];
  for (const e of current) {
    const k = key(e);
    const was = b.get(k);
    const left = a.get(k);
    if (isEntry(e) && left !== undefined && same(e, left) && !same(left, was)) {
      if (was !== undefined) out.push(was);
    } else out.push(e);
  }
  for (const [k, e] of b) if (isEntry(e) && !a.has(k) && !now.has(k)) out.push(e);
  return out;
}

/** Reverts one record: created → removed, removed → back, changed → only untouched-since fields. */
function revert<T extends object>(current: T | undefined, before: T | null, after: T | null): T | undefined {
  if (!before) return undefined; // the action created it
  if (!after || !current) return current ?? before; // the action removed it (or it's gone again)
  const out = { ...current } as Record<string, unknown>;
  const b = before as Record<string, unknown>;
  const a = after as Record<string, unknown>;
  for (const key of new Set([...Object.keys(b), ...Object.keys(a)])) {
    if (same(b[key], a[key])) continue;
    if (same(out[key], a[key])) out[key] = b[key];
    else if (key === 'values' && Array.isArray(out[key]) && (Array.isArray(b[key]) || b[key] === undefined) && (Array.isArray(a[key]) || a[key] === undefined)) {
      const merged = revertValues(out[key] as unknown[], (b[key] as unknown[] | undefined) ?? [], (a[key] as unknown[] | undefined) ?? []);
      out[key] = merged.length ? merged : undefined;
    }
  }
  return out as T;
}

export function applyUndo(current: Data, entry: UndoEntry): Data {
  let data = current;
  for (const c of COLLECTIONS) {
    const records = { ...of(current, c) };
    for (const [id, { before, after }] of Object.entries((entry[c] ?? {}) as AnyUndo)) {
      const r = revert(get(records, id), before, after);
      if (r) records[id] = r;
      else delete records[id];
    }
    data = withRecords(data, c, records);
  }
  return data;
}

/** Records in `incoming` that `base` doesn't have at all (used to rescue writes from old tabs). */
export function missingFrom(base: Data, incoming: Data): DataChanges {
  const changes = emptyChanges();
  for (const c of COLLECTIONS) {
    const has = of(base, c);
    for (const r of Object.values(of(incoming, c))) if (!get(has, r.id)) put(changes, c, r);
  }
  return changes;
}

/** A record's value, whatever its key order, with undefined fields left out (as loading drops them). */
const valueOf = (record: object) =>
  JSON.stringify(Object.entries(record).filter(([, v]) => v !== undefined).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

/** Whether two records hold the same value (P-86: a press kept while reconnecting is applied only if its run is unchanged). */
export const sameValue = (a: object, b: object) => a === b || valueOf(a) === valueOf(b);

/** `loaded`, but with `base`'s object wherever the value is the same; and whether any record differs. */
function keepSame<T extends object>(base: Record<Id, T>, loaded: Record<Id, T>): { records: Record<Id, T>; changed: boolean } {
  let changed = Object.keys(base).some((id) => !get(loaded, id));
  const records: Record<Id, T> = {};
  for (const [id, r] of Object.entries(loaded)) {
    const mine = get(base, id);
    const same = mine !== undefined && valueOf(mine) === valueOf(r);
    records[id] = same ? mine : r;
    if (!same) changed = true;
  }
  return { records, changed };
}

/**
 * Taking the data back after another copy of the app may have written to it (P-29). `base`: what
 * this page last saved; `current`: what it shows (base plus its own changes since); `loaded`: what
 * is saved now. Returns what to show — the saved data with this page's own changes on top — what
 * is saved (`saved`, so the difference is this page's to write), and whether what's shown changes
 * (not when all that differs is this page's own changes, saved since by its journal). Records whose
 * value didn't change keep this page's objects (no re-render, no rewrite).
 */
export function rebase(base: Data, current: Data, loaded: Data): { data: Data; saved: Data; changed: boolean } {
  const kept = COLLECTIONS.map((c) => keepSame(of(base, c), of(loaded, c)));
  if (!kept.some((k) => k.changed)) return { data: current, saved: base, changed: false };
  let saved: Data = { ...loaded };
  COLLECTIONS.forEach((c, i) => (saved = withRecords(saved, c, kept[i].records)));
  const own = diffData(base, current);
  let data: Data = { ...saved };
  for (const c of COLLECTIONS) {
    const records = { ...of(saved, c) };
    for (const r of upsertsOf(own, c)) records[r.id] = r;
    for (const id of deletesOf(own, c)) delete records[id];
    data = withRecords(data, c, records);
  }
  if (!COLLECTIONS.some((c) => keepSame(of(current, c), of(data, c)).changed)) return { data: current, saved, changed: false };
  return { data, saved, changed: true };
}
