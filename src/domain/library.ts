/**
 * P-104 (B-17 slices 1 and 4), P-105 (slice 2), P-106 (slice 3): the library — methods and templates that ship with
 * the app (`libraryContent.ts`), read through the import check, never written into the person's data until they
 * Copy. Pure: selectors for My routines' Library view, the preview sheet and Plan's "@" / Add's "a routine", and the
 * one write — a copy (and a copy added as a step) — returned as a `Result` for the store to keep with its Undo.
 *
 * - **Identity is by name** (B-17 "One version per name"): a library routine whose name is one of the person's
 *   routines is "yours"; its row offers Open yours and nothing is copied. A template ("Learn ▢") is copied per aim
 *   under a name the person types, so it is never yours.
 * - **A copy is the person's own**: new ids, the time it was copied, no mark of where it came from. What it calls
 *   comes with it, by name: a routine the person already has under that name is used; one they don't is copied
 *   too. Its steps broken down, for each blocks (with their kept lists, empty) and In any order blocks are its own.
 *   A routine that calls itself ("Find out ▢") calls its copy. An app update replaces the library and reaches into
 *   nothing: nothing in the person's data points at it.
 */
import { fromBackup } from './backup';
import { LIBRARY_BACKUP, LIBRARY_DEFS, LIBRARY_HEADINGS, LibraryDef } from './libraryContent';
import { ANY_WORDS, callIO, editRoutine, eachWords, Env, Item, isRef, outOf, readRoutine, Result, routineNamed, slotOf } from './run';
import { fold } from './tags';
import { Data, Id, Routine } from './types';
import { nameKey, tidyName } from './values';

export { LIBRARY_HEADINGS } from './libraryContent';

/** The library as shipped (or another, for tests: an app update): its routines, read as an import reads a file. */
export interface Library {
  data: Data;
  defs: readonly LibraryDef[];
}

let shipped: Library | undefined;
/** The library this build ships — read once, through the import check (it throws if the file is not a backup). */
export function library(): Library {
  if (!shipped) shipped = readLibrary(JSON.stringify(LIBRARY_BACKUP), LIBRARY_DEFS);
  return shipped;
}
/** A library file (the export format) and what each of its routines is for. */
export function readLibrary(json: string, defs: readonly LibraryDef[]): Library {
  return { data: fromBackup(json), defs };
}

/** One row of the library view. */
export interface LibraryRow {
  id: Id;
  /** As shown ("Learn ▢"). */
  name: string;
  /** Spoken: "▢" is "blank" ("Learn blank"). */
  spoken: string;
  heading: string;
  /** The one short line on what it is for. */
  for: string;
  asks: string[];
  gives: string[];
  template: boolean;
  /** Where the Name field of Copy… starts ("Learn "). */
  stem: string;
  /** The person's routine of this name: the row offers Open yours (never for a template with a blank). */
  yours?: Id;
}

const BLANK = '▢';
/** "Learn ▢" → "Learn blank": the name a screen reader says. */
export const spokenName = (name: string): string => name.replace(new RegExp(`\\s*${BLANK}\\s*`, 'g'), ' blank ').replace(/\s+/g, ' ').trim();

/** Every library routine, under its heading, in the library's order — each with what it asks and hands back. */
export function libraryRows(data: Data, lib: Library = library()): LibraryRow[] {
  const order = new Map<string, number>(LIBRARY_HEADINGS.map((h, i) => [h, i]));
  return lib.defs
    .map((d, i) => ({ d, i }))
    .sort((a, b) => (order.get(a.d.heading) ?? 99) - (order.get(b.d.heading) ?? 99) || a.i - b.i)
    .map(({ d }) => {
      const blank = d.name.includes(BLANK);
      const theirs = blank ? undefined : routineNamed(data, d.name);
      return {
        id: d.id,
        name: d.name,
        spoken: spokenName(d.name),
        heading: d.heading,
        for: d.for,
        asks: asksOf(lib.data, d.id),
        gives: [...d.gives],
        template: !!d.template,
        stem: d.template ? d.template.stem || d.name : d.name,
        ...(theirs && { yours: theirs.id }),
      };
    });
}

/**
 * What a library routine asks: what it reads that nothing in it gives (`callIO`) — less the lists its for each blocks keep
 * in the routine (a template's {topics}: they are the routine's own, + Add in Plan, never asked).
 */
function asksOf(data: Data, id: Id): string[] {
  const kept = new Set<string>();
  const seen = new Set<Id>();
  const walk = (x: Id) => {
    if (seen.has(x)) return;
    seen.add(x);
    const s = readRoutine(data, x);
    if (s?.each?.own) kept.add(nameKey(s.each.list));
    for (const i of s?.items ?? []) if (isRef(i) && readRoutine(data, i.ref)?.named === false) walk(i.ref);
  };
  walk(id);
  return callIO(data, id).asks.filter((a) => !kept.has(nameKey(a)));
}

/** The rows under their headings, in order (a heading with none left out). */
export function librarySections(rows: readonly LibraryRow[]): { heading: string; rows: LibraryRow[] }[] {
  const out: { heading: string; rows: LibraryRow[] }[] = [];
  for (const r of rows) {
    const had = out.find((s) => s.heading === r.heading);
    if (had) had.rows.push(r);
    else out.push({ heading: r.heading, rows: [r] });
  }
  return out;
}

/** Find: part of a name (without case or accents). Nothing typed: every row. */
export function findLibrary(rows: readonly LibraryRow[], find: string): LibraryRow[] {
  const q = fold(find.trim()).replace(/\s+/g, ' ');
  return q ? rows.filter((r) => fold(r.name).replace(/\s+/g, ' ').includes(q)) : [...rows];
}

/**
 * P-105: what "@" offers from the library for what is typed after it — methods only (a template is copied per aim, from
 * My routines), none the person already has (theirs is under Yours), the one named exactly first, then those it begins,
 * then those that hold it; at most three.
 */
export function libraryMatches(data: Data, query: string, lib: Library = library()): LibraryRow[] {
  const q = fold(query.trim()).replace(/\s+/g, ' ');
  const rank = (r: LibraryRow) => (fold(r.name) === q ? 0 : fold(r.name).startsWith(q) ? 1 : 2);
  return libraryRows(data, lib)
    .filter((r) => !r.template && !r.yours && fold(r.name).includes(q))
    .map((r, i) => ({ r, i }))
    .sort((a, b) => rank(a.r) - rank(b.r) || a.i - b.i)
    .map(({ r }) => r)
    .slice(0, 3);
}

/** P-105: Add's "a routine" — the library's methods the person does not have yet, in the library's order. */
export const libraryToAdd = (data: Data, lib: Library = library()): LibraryRow[] => libraryRows(data, lib).filter((r) => !r.template && !r.yours);

/** One row of the preview sheet: read-only, indented by `depth`. */
export interface PreviewRow {
  depth: number;
  kind: 'step' | 'call' | 'each' | 'any' | 'part' | 'slot';
  words: string;
  /** A step: the name it gives. */
  gives?: string;
  /** A call: what fills its inputs ("with {material} as standard", "with what I recalled as work"). */
  with?: string[];
}

/** The library routine's steps as the preview sheet shows them — its smaller steps, blocks and parts under it. A call is one row. */
export function libraryPreview(id: Id, lib: Library = library()): PreviewRow[] {
  const out: PreviewRow[] = [];
  const walk = (seqId: Id, depth: number) => {
    for (const i of readRoutine(lib.data, seqId)?.items ?? []) {
      const sub = isRef(i) ? readRoutine(lib.data, i.ref) : undefined;
      if (isRef(i) && sub?.named) {
        const binds = ((i as { with?: unknown }).with as { input: string; typed?: string; name?: string }[] | undefined) ?? [];
        out.push({ depth, kind: 'call', words: sub.words, with: binds.map((b) => (b.name !== undefined ? (b.name === b.input ? `with {${b.input}}` : `with {${b.name}} as ${b.input}`) : `with ${b.typed} as ${b.input}`)) });
      } else if (sub?.each) {
        out.push({ depth, kind: 'each', words: eachWords(sub.each) });
        walk(sub.id, depth + 1);
      } else if (sub?.any) {
        out.push({ depth, kind: 'any', words: ANY_WORDS });
        for (const p of sub.items) {
          const part = isRef(p) ? readRoutine(lib.data, p.ref) : undefined;
          out.push({ depth: depth + 1, kind: 'part', words: part ? part.words : (p as { text?: string }).text ?? '' });
          if (part) walk(part.id, depth + 2);
        }
      } else if (sub) {
        out.push({ depth, kind: 'part', words: sub.words });
        walk(sub.id, depth + 1);
      } else if (slotOf(i)) out.push({ depth, kind: 'slot', words: `{${slotOf(i)}}` });
      else {
        const g = outOf(i);
        out.push({ depth, kind: 'step', words: (i as { text: string }).text, ...(g && { gives: g }) });
      }
    }
  };
  walk(id, 0);
  return out;
}

/** What a copy did, for its notice: the routine copied (its name), and how many more it brought with it. */
export interface Copied extends Result {
  /** The names of the routines it made, the one asked for first. */
  made?: string[];
}

/**
 * Copy (P-104) and Copy… (P-106): the library routine `id` becomes the person's — named `words` (a template; else its
 * own name) — with what it calls, by name. Refused `same-name` for a name already theirs (nothing is written: the row
 * offers Open yours, the sheet says so), `empty` for no name, `gone` for no such library routine. One write.
 */
export function copyFromLibrary(data: Data, id: Id, env: Env, opts: { words?: string } = {}, lib: Library = library()): Copied {
  const root = readRoutine(lib.data, id);
  if (!root || !root.named) return { ok: false, data, reason: 'gone' };
  const words = tidyName(opts.words ?? root.words);
  if (!words) return { ok: false, data, reason: 'empty' };
  if (routineNamed(data, words)) return { ok: false, data, reason: 'same-name' };
  const made: string[] = [];
  const routines: Record<Id, Routine> = { ...data.routines };
  /** Library id → the person's routine it became (copied here, or theirs by name). */
  const to = new Map<Id, { id: Id; words: string }>();
  const copy = (libId: Id, name?: string): { id: Id; words: string } => {
    const had = to.get(libId);
    if (had) return had;
    const src = lib.data.routines[libId];
    const seq = readRoutine(lib.data, libId)!;
    if (seq.named && name === undefined) {
      const theirs = routineNamed({ ...data, routines }, seq.words);
      if (theirs) {
        const t = { id: theirs.id, words: theirs.words };
        to.set(libId, t);
        return t;
      }
    }
    const made1 = { id: env.id(), words: seq.named ? (name ?? seq.words) : seq.words };
    to.set(libId, made1);
    if (seq.named) made.push(made1.words);
    const items = seq.items.map((i: Item) => {
      if (!isRef(i)) return { ...i, id: env.id() };
      const target = copy(i.ref);
      const named = readRoutine(lib.data, i.ref)?.named;
      return { ...i, id: env.id(), ref: target.id, ...(named && { words: target.words }) };
    });
    // (Its own fields as the library has them — `each`, `any`, `open`… — never shared with the library's record.)
    const own = JSON.parse(JSON.stringify(src)) as Routine;
    routines[made1.id] = { ...own, id: made1.id, words: made1.words, createdAt: env.now, items };
    return made1;
  };
  const top = copy(id, words);
  return { ok: true, data: { ...data, routines }, routineId: top.id, made };
}

/**
 * P-105: Copy and add — the library method copied (as `copyFromLibrary`) and added as a step of `seq` (after `after`;
 * absent: at the end), in ONE write, so one Undo takes both away. Refused as either would be (nothing written).
 */
export function copyAndAdd(data: Data, id: Id, seq: Id, after: Id | null | undefined, env: Env, lib: Library = library()): Copied {
  const c = copyFromLibrary(data, id, env, {}, lib);
  if (!c.ok || !c.routineId) return c;
  const added = editRoutine(c.data, seq, { kind: 'addCall', routine: c.routineId, ...(after !== undefined && { after }) }, env);
  if (!added.ok) return { ok: false, data, reason: added.reason ?? 'cannot' };
  return { ...added, routineId: c.routineId, made: c.made };
}

/** The notice after a copy: "Copied “X”", or "Copied “X” and what it calls" when it brought more. */
export function copiedWords(c: Copied): string {
  const [first, ...more] = c.made ?? [];
  return first === undefined ? '' : `Copied “${first}”${more.length ? ' and what it calls' : ''}`;
}
