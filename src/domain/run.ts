/**
 * B-11 slice 1 (P-86), B-12 (P-90): routines being run and planned. One pure engine:
 * `runVerb(data, verb, env)` returns the data after the verb (or the very same data, refused), with
 * what the screens say for it (`said`, `folded`); `editRoutine` is every change to a routine — the
 * Plan surface's edits — and keeps every open run standing in the same write. No clock and no ids of
 * its own: `env` brings both.
 *
 * P-90: a change made in Plan changes the ROUTINE. Nothing writes a "this run only" change any more.
 * Runs stored by the build before still carry them (`changes`), and are read through them (`view`)
 * exactly as before, until Plan is first opened on such a run: then they are folded into the routine
 * in that one write (`plan`). P-101 (ruling 4): Plan is a view — a run is running or paused; nothing
 * writes `mode: 'plan'` any more (one stored by an earlier build is kept and read as paused). A run is
 * "planning" (`isPlanning`) only at the edge: nothing to stand on.
 *
 * P-85's tables keep everything here in a routine's or a run's JSON body, so there is no migration.
 * Storage does not check that body, and a damaged row loads with none of it: every read goes through
 * `readRoutine` / `readRun` / `place`, which never throw and show what can be shown. What they
 * cannot read (an item or a change of a kind this version does not know) is ignored, and kept
 * exactly where it was whenever the record is written.
 *
 * The rules are the execution table in the P-86 scout report, as the contract reads it; run.test.ts
 * has one test per row.
 */
import { normalizeName } from './model';
import { placesWritable, tidyPlaceText } from './places';
import { tagsOf, tagsWritable } from './tags';
import { Data, Id, Routine, Run } from './types';
import { capValue, isEntry, isName, MAX_ITEMS, MAX_VALUES, nameKey, namesIn, parseWords, readValues, renameIn, tidyName, ValueEntry } from './values';

/** A level is one frame; nothing goes deeper than this (a routine that holds itself can't run away). */
export const MAX_DEPTH = 64;

/** One line of a routine: a step, a plain wait ("waiting for <wait>"), or another sequence. */
export type Item = { id: Id; text: string } | { id: Id; wait: string } | { id: Id; ref: Id };

/** A routine (or an unnamed sequence) as read: only what can be used, the divider and number normalised. */
export interface Seq {
  id: Id;
  /** Its name; for an unnamed sequence the words of the step it was made from. */
  words: string;
  named: boolean;
  createdAt: string;
  removedAt?: string;
  items: Item[];
  /** The Repeat divider: absent = none (runs once through); k = before items[k] (0 = all of it repeats). */
  repeatFrom?: number;
  /** Rounds of the repeating part: absent = until I'm done. */
  repeat?: number;
  /** Its edge is open: finishing it as a first layer asks for the next small step. False = "ends here". */
  open: boolean;
  /** It has a tile on home. */
  home: boolean;
  /** An unnamed sequence made by Break it down: the run it belongs to, until it is kept. */
  ownerRunId?: Id;
  /**
   * P-107: a for each block — an unnamed sequence (an older build reads it as a step broken down) whose steps are
   * done once for each item of the list `{list}` given above, each round reading the item as `{item}`. Its words
   * are the sentence, "For each <item> in {<list>}". A level of its own for values (see `isScopeSeq`).
   */
  each?: Each;
  /**
   * P-99: an In any order block — an unnamed sequence (an older build reads it as a step broken down, "In any order")
   * whose items are its parts, each taken up as a thread of its own: its own place and values, chosen by the person,
   * joined before the step after the block. A level of its own for values (see `isScopeSeq`).
   */
  any?: true;
}

/**
 * P-99: one part of an In any order block, as the level holding the block's row records it. `ended`: it returned
 * (`finished`: Next past its last step) or was stopped (`stopped`: Step out of it). `frames`: where it was put down
 * (the block's level and those above it, as they were); `values`: what it gave there (the levels of `frames`), or, once
 * ended, what it returns at the join. `touchedAt`: when it was last taken up or put down. `since`: put down on a wait.
 */
export interface Part {
  item: Id;
  ended?: 'finished' | 'stopped';
  touchedAt?: string;
  frames?: Frame[];
  values?: ValueEntry[];
  since?: string;
}
/** P-99: the parts of the block at `row` (the item the level holding it is on, or was on before Back). */
export interface Parts {
  row: Id;
  list: Part[];
}

/**
 * P-108: a routine held by a value (or a list item, or a kept list's item) — by reference: its id, and its name when it
 * was given (the item's words begin with it; an older build reads the words). Read by `refsOf`.
 */
export interface ListRef {
  ref: Id;
  name: string;
}

/**
 * A for each block's header (P-107, P-108). `own`: the block declares its list itself — asked on arrival (`own` and no
 * `kept`), or kept in the routine (`kept`: its items, `refs` beside them for those that are routines). `locked`: a kept
 * list stored in a shape this version cannot read in full (what can be read is gone through; it is never written over).
 */
export interface Each {
  item: string;
  list: string;
  own?: true;
  kept?: string[];
  refs?: (ListRef | null)[];
  locked?: true;
}

/**
 * One level of a run. `at` is the item's id, never an index; null = nothing to stand on (only the
 * bottom level: it asks for the next small step). `round` is 1-based. `from` is the item of the
 * level below this one was entered from: leaving this level moves that level on only if it is still
 * there.
 */
export interface Frame {
  seq: Id;
  at: Id | null;
  round: number;
  from?: Id;
  /** P-107: on a for each level, the item it is on (0-based) and that item's words as the round began (its place). Absent: the first. */
  each?: number;
  eachText?: string;
  /** P-108: the list as the level last saw it (its place is found in the list as it reads now by comparing the two). */
  eachSeen?: string[];
  /** P-99: on the level holding an In any order block's row, the record of its parts (see `Parts`). */
  parts?: Parts;
}

/**
 * A change for THIS RUN ONLY, as the build before P-90 stored them. Read (through `view`), never
 * written any more; folded into the routine when Plan is first opened on the run. `offered` is that
 * build's mark and means nothing now.
 */
export type Change = { id: Id; seq: Id; offered?: true } & (
  | { kind: 'reword'; item: Id; text: string }
  | { kind: 'breakdown'; item: Id; into: Id }
  | { kind: 'add'; after: Id | null; item: Item }
  | { kind: 'remove'; item: Id }
  | { kind: 'move'; item: Id; after: Id | null }
  | { kind: 'repeat'; repeat?: number }
);

/** A run as read. Frames are bottom first. */
export interface RunState {
  id: Id;
  routineId: Id;
  startedAt: string;
  endedAt?: string;
  /** Since when it has rested on the wait step it is on. */
  waitingSince?: string;
  frames: Frame[];
  changes: Change[];
  /** Only the one run the app is on has a status (see `setStatus`); an ended run never has. */
  status?: 'running' | 'paused';
  /**
   * An earlier build left it in Plan. Never on a run that is running or ended (a stored one there is
   * ignored). P-101 (ruling 4): read and kept, never written; it no longer makes the run "planning" — it
   * reads as paused (still refusing Next, Step in, Back and Done until Resume clears it, as before).
   */
  mode?: 'plan';
  /** Why it was paused, as typed. */
  reason?: string;
  /** When a verb last moved or touched it. */
  touchedAt?: string;
  endedBy?: 'done' | 'finished';
  /** P-96: its values (what can be read of them: see `readValues`). Empty for every run from before P-96. */
  values: ValueEntry[];
  /**
   * P-100: its place in home's queue, once the queue has been reordered (lower: higher up; see `queueKey`).
   * Absent for every run from before P-100 and for a run never moved: it then stands by when it was started.
   */
  queue?: number;
}

export interface Env {
  /** ISO. */
  now: string;
  /** A new id, never used before. */
  id: () => Id;
}

export type JumpTo =
  /** The start of a level the run is in (0 = the bottom). */
  | { level: number }
  /** A step: the item ids from the bottom level down to it. */
  | { path: Id[] };

/** Plan: changes to the routine itself (a sequence: a named routine, or the unnamed one a step was broken into). */
export type RoutineEdit =
  /** `after`: absent = at the end; null = first; an item's id = right after it. */
  | { kind: 'addStep'; text: string; after?: Id | null }
  | { kind: 'addWait'; wait: string; after?: Id | null }
  | { kind: 'remove'; item: Id }
  /**
   * One row up (-1) or down (1). The Repeat divider is a row: next to it the step passes it and no other
   * step moves. P-95: a drag is `by` rows at once (negative: up) — the same one-row moves, one after
   * another, in ONE edit (one write, one Undo); refused whole if any of them would be.
   */
  | { kind: 'move'; item: Id; by: number }
  | { kind: 'reword'; item: Id; text: string }
  /** Break it down: the plain step becomes an unnamed sequence of these steps (blank ones dropped), under the same item id. */
  | { kind: 'breakDown'; item: Id; steps: string[] }
  /** Make it a wait ("Wait for: <its words>"), and back to a step. Same item, same id. */
  | { kind: 'toWait'; item: Id }
  | { kind: 'toStep'; item: Id }
  /** The Repeat divider before items[from]; absent = no divider. */
  | { kind: 'divider'; from?: number }
  /** A number of rounds; absent = until I'm done. */
  | { kind: 'repeat'; times?: number }
  /** true = the edge is open; false = "ends here". */
  | { kind: 'open'; open: boolean }
  | { kind: 'rename'; words: string }
  | { kind: 'removeRoutine' }
  /**
   * P-96, Plan's "Gives…": the step gives this name (tidied; 1–40 characters, no brace); absent = it gives
   * nothing. Only a plain step gives.
   */
  | { kind: 'gives'; item: Id; name?: string }
  /**
   * P-96: a name renamed in this routine — on the steps that give it and in every `{from}` its steps (and
   * its smaller steps) read, and on its open runs' values of it, in one write. Other routines' words are
   * left as they are (they then read it as unset and ask). Refused `same-name` for a name the routine
   * already gives or reads.
   */
  | { kind: 'renameValue'; from: string; to: string }
  /**
   * P-97: the routine's tags, as the Tags sheet keeps them — each tidied (trimmed, no "#"), once without case
   * (`routines.ts`). None at all takes the field away. Stored in the routine's body; nothing else changes.
   */
  | { kind: 'tags'; tags: string[] }
  /**
   * P-98: a routine as a step — a call row `{ id, ref, words }` (`words`: the routine's name then, read when
   * the routine itself is gone). Refused `gone` for a routine that is not there or removed, `cannot` for an
   * unnamed one, `self` when the routine is this one or uses it (directly or through another).
   */
  | { kind: 'addCall'; routine: Id; after?: Id | null }
  /**
   * P-98: what a call gives the routine it calls for one of its inputs — typed words, a name given above
   * (`{y} as x`; `y` = `x` is "with {x}"), or "Ask when it runs". `to` absent: none (by name where it runs).
   */
  | { kind: 'bind'; item: Id; input: string; to?: { typed: string } | { name: string } | { ask: true } }
  /** P-98: Copy — a new routine with this one's steps under a new name (refused `same-name` for one in use). */
  | { kind: 'copy'; words: string }
  /**
   * P-109 (B-18): the routine's places (`places.ts`) — one added at the end (a new id), one changed (its id and any
   * field this version does not know kept), moved one row, or removed (the last takes the field away). Name and
   * where are tidied and both needed (`empty`); `gone` for a place that is not there; `cannot` on an unnamed
   * sequence, past an end, or when the stored field is in a shape this version cannot keep (never overwritten).
   */
  | { kind: 'addPlace'; name: string; where: string }
  | { kind: 'changePlace'; place: Id; name: string; where: string }
  | { kind: 'movePlace'; place: Id; by: 1 | -1 }
  | { kind: 'removePlace'; place: Id }
  /**
   * P-107: Add's "For each…" — a for each block over `{list}` (a name given above), its item `{item}`: a row
   * `{ id, ref }` to a new unnamed sequence with `each` and no steps yet, after a row or at the end. Refused
   * `cannot` for a name that is not one, or an item that is the list.
   */
  | { kind: 'addEach'; item: string; list: string; after?: Id | null; own?: 'asked' | 'kept' }
  /**
   * P-108: a for each's kept list given in Plan (its rows, + Add there and on the tile) — the items (blank ones dropped,
   * capped) and the routines beside them. On the block's own sequence; `cannot` for any other, or one `locked`.
   */
  | { kind: 'keptList'; items: string[]; refs?: (ListRef | null)[] }
  /**
   * P-108: a routine row whose routine is a value (`▤ {name}`) — a step `{ id, text: '{name}', slot: true }` (an older
   * build reads the step "{name}", showing the value as words). After a row or at the end; `cannot` for no name.
   */
  | { kind: 'addSlot'; name: string; after?: Id | null }
  /**
   * P-110: a plain step made a call to a routine (its ··· "Make it a call", for words "@<routine name>"; "@" chosen while
   * changing its words) — the same item, under the same id, now `{ id, ref, words }`. `words`: other words typed there
   * stay — the step keeps them and the call is added right after it (one write). Refused as `addCall` (`gone`,
   * `cannot`, `self`), and `not-a-step` for anything but a plain step that gives no name.
   */
  | { kind: 'toCall'; item: Id; routine: Id; words?: string }
  /**
   * P-99: Add's "In any order" — a block whose parts are taken up in any order: a row `{ id, ref }` to a new unnamed
   * sequence "In any order" with `any: true`, its parts `parts` (each a plain step; blank ones dropped; none yet is
   * fine), after a row or at the end. Inside a block, a part is a step or a step broken down: a wait, a routine, a for
   * each, another In any order, Repeat from here and a new name for the block are refused there (`cannot`).
   */
  | { kind: 'addAny'; after?: Id | null; parts?: string[] };

export type Verb =
  | { kind: 'start'; routineId: Id }
  /** "New: <words>": makes the routine only (P-90): no run until Start. */
  | { kind: 'new'; words: string }
  /** Resume, and Plan's "Resume at <step>": running, the mode gone, exactly where it was. */
  | { kind: 'resume'; runId: Id }
  /** Plan: the run is in Plan (and paused, if it was the one running), in one write; this-run changes from the build before are folded into the routine in it. */
  | { kind: 'plan'; runId: Id }
  | { kind: 'pause'; runId: Id; reason?: string }
  | { kind: 'reason'; runId: Id; text: string }
  | { kind: 'home'; runId: Id }
  /**
   * P-98: `owed` — Next pressed on a call or a step broken down without stepping in, and the fields it then showed
   * for what it owes: each typed one is given by that row (where its values belong) in the same write.
   */
  | { kind: 'next'; runId: Id; owed?: Given[]; chunk?: ChunkGiven[] }
  /** P-103: `whole` — the whole run ends where it stands (a paused tile's "End this run"), at any depth; else the level it is in. */
  | { kind: 'done'; runId: Id; whole?: true; owed?: { name: string; text: string }[]; given?: Given[] }
  | { kind: 'stepIn'; runId: Id }
  | { kind: 'back'; runId: Id }
  | { kind: 'jump'; runId: Id; to: JumpTo }
  /**
   * P-101 amendment (ruling 9): Start over — the level `level` (0 = the whole run) from its first step, round
   * one; the levels above it left; the values given inside it gone. The same run record, replaced in place
   * (same id, its status kept: no new run is made); one write, so one Undo restores place and values.
   */
  | { kind: 'restart'; runId: Id; level: number }
  /**
   * P-96: a value given, changed or cleared (blank text clears it). `item`: typed in the field of that
   * step — the step the run is on, which gives the name or reads it — so it is that step's value (where it
   * came from, unless it changes a value another step gave). No `item`: the value sheet, changing the
   * value the run's step sees (refused `cannot` when there is none); it is marked changed.
   */
  | { kind: 'value'; runId: Id; name: string; text: string; item?: Id; items?: string[]; refs?: (ListRef | null)[] }
  /**
   * P-100: home's queue reordered — the run's row moved `to` rows (negative: up; a drag is several at once), or to
   * the top. One write (each row's `queue` renumbered 1…n where it changed), so one Undo. Refused `gone` for a run
   * that is not a row, `cannot` past either end; already there: nothing changes.
   */
  | { kind: 'queue'; runId: Id; to: number | 'top' }
  /**
   * P-99: take up a part of the In any order block whose row the level `level` holds (the run is on that row, or inside
   * the block): the part the run is in is put down at its place, with its values, and `part` taken up at its own (a part
   * not started: at its first step — a part broken down, inside it). Refused `ended` for a part that returned or was
   * stopped, `no-such-step` for anything else.
   */
  | { kind: 'part'; runId: Id; level: number; part: Id };

/**
 * P-112: a value typed for a step — its name and words; `items`, one per item (a list's rows; what a for each inside a
 * row gives, item by item); `refs`, the routines those items hold.
 */
export interface Given {
  name: string;
  text: string;
  items?: string[];
  refs?: (ListRef | null)[];
}
/**
 * P-112 (B-16, "A chunk is chosen while running"): one step of the chunk in view, as Next takes it as done — `given`, what
 * was typed in its own fields (the name it gives, a name it asks for); `owed`, what was typed for what its insides give
 * (a call or a step broken down passed without stepping in, as P-98's `owed`).
 */
export interface ChunkGiven {
  given?: Given[];
  owed?: Given[];
}
/** P-112: no chunk is longer than this. */
export const MAX_CHUNK = 256;

/** What a verb has to say. `finished`: the levels left by themselves or by Done, innermost first. */
export type Said = { kind: 'finished'; names: string[] } | { kind: 'ended'; name: string } | { kind: 'edge' } | { kind: 'jumped'; from: string };

export type Refusal =
  | 'gone'
  | 'ended'
  | 'running'
  | 'has-run'
  | 'asking'
  /** The run is in Plan: Next, Step in, Back — and Done, off the edge — wait for Resume. */
  | 'planning'
  | 'empty'
  | 'not-a-routine'
  | 'not-a-step'
  | 'no-steps'
  | 'too-deep'
  | 'cannot'
  | 'nothing-before'
  | 'no-such-level'
  | 'no-such-step'
  | 'same-name'
  /** P-98: a routine can't be a step of itself (directly or through another). */
  | 'self'
  /** P-99: the step after an In any order block waits until every part has returned or been stopped. */
  | 'parts';

export interface Result {
  ok: boolean;
  /** The data after the verb; the very same object when refused or when nothing changed. */
  data: Data;
  said?: Said;
  reason?: Refusal;
  /** Start: the run now running. */
  runId?: Id;
  /** New: the routine made (or, for a name there is, the routine that has it). */
  routineId?: Id;
  /** Refused because something is running: what. */
  running?: { runId: Id; name: string };
  /** This write folded the run's this-run changes (from the build before) into its routine: the routine's name. */
  folded?: string;
  /** P-110: a move cleared these values (their giving steps are no longer above the place): said, with its Undo. */
  cleared?: string[];
  /** P-99 (the P-112 investigator's repro 1): Next over the steps in view replaced these values, typed over: said ("Changed {name}"), with its Undo. */
  changed?: string[];
  /** P-99 (repro 3): Next over the steps in view was refused because the engine would not keep the value typed for this name: said. */
  refusedValue?: string;
}

// ───────── reading ─────────

const own = <T,>(records: Record<Id, T>, id: Id): T | undefined => (Object.prototype.hasOwnProperty.call(records, id) ? records[id] : undefined);
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string';
const isItem = (v: unknown): v is Item => isObject(v) && text(v.id) && !!v.id && (text(v.text) || text(v.wait) || text(v.ref));
export const isRef = (i: Item | undefined): i is { id: Id; ref: Id } => !!i && text((i as { ref?: unknown }).ref);
export const isWait = (i: Item | undefined): i is { id: Id; wait: string } => !!i && !isRef(i) && text((i as { wait?: unknown }).wait);
export const isStep = (i: Item | undefined): i is { id: Id; text: string } => !!i && !isRef(i) && !isWait(i);
const tidy = (s: unknown) => (text(s) ? s.trim().replace(/\s+/g, ' ') : '');
/** P-96: the name a step gives (as typed in Plan, tidied); undefined for a step that gives none, a wait or a routine. */
export const outOf = (i: Item | undefined): string | undefined => {
  const out = isStep(i) ? (i as { out?: unknown }).out : undefined;
  return text(out) && tidyName(out) ? tidyName(out) : undefined;
};
/** `record` with `patch` on top; a field patched to undefined is left out (never stored as a key). */
function patched<T extends object>(record: T, patch: Record<string, unknown>): T {
  const out = { ...record, ...patch } as Record<string, unknown>;
  for (const [k, v] of Object.entries(patch)) if (v === undefined) delete out[k];
  return out as T;
}
const rawItems = (r: Routine): unknown[] => (Array.isArray(r.items) ? r.items : []);
const rawChanges = (r: Run): unknown[] => (Array.isArray(r.changes) ? r.changes : []);
const dividerAt = (v: unknown, n: number): number | undefined => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < n ? v : undefined);
const countOf = (v: unknown): number | undefined => (typeof v === 'number' && Number.isInteger(v) && v >= 1 ? v : undefined);

const seqs = new WeakMap<Routine, Seq>();
/** A routine as it can be used. Never throws; undefined only when there is no such routine. */
export function readRoutine(data: Data, id: Id): Seq | undefined {
  const r = own(data.routines, id);
  if (!isObject(r)) return undefined;
  const had = seqs.get(r);
  if (had) return had;
  const seen = new Set<Id>();
  const items = rawItems(r).filter((i): i is Item => isItem(i) && !seen.has(i.id) && !!seen.add(i.id));
  const seq: Seq = {
    id: r.id,
    words: text(r.words) ? r.words : '',
    named: r.named === true,
    createdAt: text(r.createdAt) ? r.createdAt : '',
    ...(text(r.removedAt) && { removedAt: r.removedAt }),
    items,
    ...(dividerAt(r.repeatFrom, items.length) !== undefined && { repeatFrom: dividerAt(r.repeatFrom, items.length) }),
    ...(countOf(r.repeat) !== undefined && { repeat: countOf(r.repeat) }),
    open: r.open === true,
    home: r.home === true,
    ...(text(r.ownerRunId) && { ownerRunId: r.ownerRunId }),
  };
  // P-107: a for each block (an unnamed sequence with `each`); one in a shape this version can't read is a step broken down.
  const each = r.named !== true ? eachField(r.each) : undefined;
  if (each) {
    seq.each = each;
    seq.words = eachWords(each);
  }
  // P-99: an In any order block (an unnamed sequence with `any`; an older build reads it as a step broken down).
  else if (r.named !== true && r.any === true) seq.any = true;
  seqs.set(r, seq);
  return seq;
}

/** P-107: the `each` of a for each block, as stored — two names, the item not the list; undefined for anything else. */
function eachField(v: unknown): Seq['each'] {
  if (!isObject(v) || !isName(v.item) || !isName(v.list) || nameKey(v.item) === nameKey(v.list)) return undefined;
  const out: Each = { item: tidyName(v.item), list: tidyName(v.list) };
  // P-108: its own list — asked on arrival, or kept in the routine (what can't be read in full is gone through, never written over).
  if (v.own === true || v.kept !== undefined) out.own = true;
  if (v.kept !== undefined) {
    const raw = Array.isArray(v.kept) ? v.kept : [];
    // (F-1, storage F3/F4: and one this version could only write back cut — over MAX_ITEMS items, an item over MAX_VALUE
    // characters, a ref in a shape it cannot read — is gone through in full and never written over.)
    const whole =
      Array.isArray(v.kept) &&
      raw.every(text) &&
      raw.length <= MAX_ITEMS &&
      raw.every((x) => capValue(x as string) === x) &&
      (v.refs === undefined || (Array.isArray(v.refs) && v.refs.length === raw.length && v.refs.every(refShaped)));
    out.kept = raw.filter(text);
    if (whole && Array.isArray(v.refs)) {
      const refs = v.refs.map((r, i) => readRef(r, out.kept![i]));
      if (refs.some(Boolean)) out.refs = refs;
    }
    if (!whole) out.locked = true;
  }
  return out;
}

/** F-1 (storage F3): a stored ref this version can read the shape of — none, or a routine's id and name. */
const refShaped = (v: unknown): boolean => v === null || (isObject(v) && text(v.ref) && !!v.ref && text(v.name));
/** P-108: a routine an item holds, as stored — its id and name, the item's words beginning with that name; else none. */
function readRef(v: unknown, words: unknown): ListRef | null {
  if (!isObject(v) || !text(v.ref) || !v.ref || !text(v.name) || !v.name.trim() || !text(words)) return null;
  return tidy(words).toLowerCase().startsWith(tidy(v.name).toLowerCase()) ? { ref: v.ref, name: v.name } : null;
}
/**
 * P-108: the routines a value's items hold (`refs`, one per item; null for words) — what can be read: a ref whose item's
 * words no longer begin with its name (changed as words, by this build or an older one) is words.
 */
export function refsOf(e: { items: string[]; refs?: unknown } | undefined): (ListRef | null)[] {
  const raw = e?.refs;
  if (!e || !Array.isArray(raw) || raw.length !== e.items.length) return e ? e.items.map(() => null) : [];
  return raw.map((r, i) => readRef(r, e.items[i]));
}
/** P-108: a value's items and their routines, for writing: `refs` only when one of them is a routine. */
const withRefs = (items: string[], refs: (ListRef | null)[]): { items: string[]; refs?: (ListRef | null)[] } => (refs.some(Boolean) ? { items, refs } : { items });
/**
 * F-1 (engine #1, #3): who gave one item of a value that a call handed back, a for each collected or an In any order block
 * joined — `by`, the share it is part of (the call's row; `<row>#<n>`, the for each's round n; `<row>/<part>`, the part),
 * `item`, the step it was given at there, and `was`, its own giver there (a value handed back that was itself collected).
 * Stored beside the items (`givers`, one per item; null: the entry's own step gave it). A row that gives again replaces
 * its own share and no other; Back puts a share back where it was given. An older build reads the items and leaves
 * `givers` as it is: one that no longer lines up with the items is not read (each item is then the entry's step's).
 */
export interface Giver {
  by: string;
  item: Id;
  was?: Giver;
}
const isGiver = (v: unknown, depth = 0): v is Giver => isObject(v) && text(v.by) && text(v.item) && (v.was === undefined || (depth < MAX_DEPTH && isGiver(v.was, depth + 1)));
/** F-1: an entry's givers, one per item (null: its own step's) — what can be read; one that does not line up: none. */
export function giverList(e: ValueEntry): (Giver | null)[] {
  const raw = (e as { givers?: unknown }).givers;
  if (!Array.isArray(raw) || raw.length !== e.items.length || !raw.every((g) => g === null || isGiver(g))) return e.items.map(() => null);
  return raw as (Giver | null)[];
}
/** F-1: an entry's refs as stored, one per item — the stored ref where it reads for its item (fields this version does not know kept), else null. */
function rawRefs(e: ValueEntry): unknown[] {
  const read = refsOf(e);
  const raw = (e as { refs?: unknown }).refs;
  return read.map((r, i) => (r && Array.isArray(raw) ? raw[i] : null));
}
/** F-1: one giver's items, ready to be put in a list (`putShare`). */
interface Share {
  items: string[];
  refs: unknown[];
  givers: (Giver | null)[];
}
/** F-1: a value given at a level, as the share `by` of a list below it (handed back, collected, joined). */
function asShare(e: ValueEntry, by: string): Share {
  const gs = giverList(e);
  return { items: [...e.items], refs: rawRefs(e), givers: e.items.map((_, i) => ({ by, item: e.item, ...(gs[i] && { was: gs[i]! }) })) };
}
const shareOf = (e: ValueEntry, g: Giver | null) => g?.by ?? e.item;
/**
 * F-1: `values` with the entry at `at` (none: -1) given `share` in place of its items whose share is `mine` — where the
 * first of those was, else before the first that is `later`, else at the end (one name given more than once is one
 * list, in the order given). With nothing of another giver left, it is this giver's own (`base`). Nothing left: gone.
 */
function putShare(values: unknown[], at: number, base: Omit<ValueEntry, 'items' | 'refs'>, mine: (by: string) => boolean, share: Share, later?: (by: string) => boolean, inPlace?: ValueEntry): unknown[] {
  // (`inPlace`: with no value stored there, the value read in place there — a for each round's share — which this keeps.)
  const had = at >= 0 ? (values[at] as ValueEntry) : inPlace;
  const items: string[] = [];
  const refs: unknown[] = [];
  const givers: (Giver | null)[] = [];
  let pos = -1;
  let others = false;
  if (had) {
    const gs = giverList(had);
    const rs = rawRefs(had);
    had.items.forEach((x, i) => {
      const by = shareOf(had, gs[i]);
      if (pos < 0 && (mine(by) || later?.(by))) pos = items.length;
      if (mine(by)) return;
      others = true;
      items.push(x);
      refs.push(rs[i]);
      givers.push(gs[i]);
    });
  }
  if (pos < 0) pos = items.length;
  items.splice(pos, 0, ...share.items);
  refs.splice(pos, 0, ...share.refs);
  givers.splice(pos, 0, ...share.givers);
  const out = [...values];
  if (!items.length) {
    if (at >= 0) out.splice(at, 1);
    return out;
  }
  const fields = { items: items.slice(0, MAX_ITEMS), refs: refs.some(Boolean) ? refs.slice(0, MAX_ITEMS) : undefined, givers: givers.some(Boolean) ? givers.slice(0, MAX_ITEMS) : undefined };
  const entry = had ? patched(had, others ? fields : { ...base, ...fields, changedAt: undefined }) : patched(base as ValueEntry, fields);
  if (at >= 0) out[at] = entry;
  else out.push(entry);
  return out;
}
/** F-1: the share key of a for each's round, and the round a key is of that row (undefined: another share). */
const roundKey = (row: Id, n: number) => `${row}#${n}`;
const roundOf = (row: Id, by: string): number | undefined => (by.startsWith(`${row}#`) && /^\d+$/.test(by.slice(row.length + 1)) ? Number(by.slice(row.length + 1)) : undefined);
const partKey = (row: Id, part: Id) => `${row}/${part}`;

/**
 * F-1 (engine #1, #3; "Back keeps it"): the share `by` of every value at level `b` of `frames` put back at level `L`,
 * where it was given — as its giving step there gave it — unless that name has a value there already. `only`: just these
 * names. The run's values; nothing written when nothing is put back.
 */
function restoreShare(data: Data, runId: Id, frames: Frame[], b: number, L: number, by: string, only?: Set<string>): Data {
  const raw = own(data.runs, runId);
  const values: unknown[] | undefined = raw && Array.isArray(raw.values) ? raw.values : undefined;
  if (!raw || !values || !frames[b] || !frames[L]) return data;
  const add = sharesAt(values, frames[b].seq, b, L, frames[L].seq, by, only).filter((e) => !values.some((x) => isEntry(x) && x.level === L && x.seq === e.seq && nameKey(x.name) === nameKey(e.name)));
  return add.length ? putRun(data, patched(raw, { values: [...values, ...add] })) : data;
}
/** F-1: the share `by` of each value at level `b` (routine `seqB`), as given at level `L` (routine `seqL`) — one entry per name. */
function sharesAt(values: unknown[], seqB: Id, b: number, L: number, seqL: Id, by: string, only?: Set<string>): ValueEntry[] {
  const add: ValueEntry[] = [];
  for (const v of values) {
    if (!isEntry(v) || v.level !== b || v.seq !== seqB || (only && !only.has(nameKey(v.name))) || add.some((a) => nameKey(a.name) === nameKey(v.name))) continue;
    const gs = giverList(v);
    const rs = rawRefs(v);
    const at = gs.flatMap((g, i) => (g?.by === by ? [i] : []));
    if (!at.length) continue;
    const refs = at.map((i) => rs[i]);
    const was = at.map((i) => gs[i]!.was ?? null);
    add.push({ name: v.name, items: at.map((i) => v.items[i]), ...(refs.some(Boolean) && { refs: refs as ListRef[] }), ...(was.some(Boolean) && { givers: was }), level: L, seq: seqL, item: gs[at[0]]!.item, at: v.at } as ValueEntry);
  }
  return add;
}

const inPlace = new WeakMap<object, Map<string, ValueEntry | undefined>>();
/**
 * F-1 (engine #1, #12; owner: "Back keeps it"): inside a for each round gone through before — Back into it, or on into it
 * after Back — a name with no value of its own at the for each's level reads what that round gave last time: its share
 * of the list it was collected into, below, as its giving step gave it. Read in place, never stored: giving it anew
 * stores the round's own value, and the round's end collects that in place of its share.
 */
function roundValue(data: Data, run: RunState, frames: Frame[], j: number, key: string): ValueEntry | undefined {
  const f = frames[j];
  if (j <= 0 || !f?.from || !view(data, run, f.seq)?.each) return undefined;
  const b = scopeLevel(data, run, frames, j - 1);
  const src = entryAt(data, run, frames, b, key);
  if (!src) return undefined;
  let memo = inPlace.get(src);
  if (!memo) inPlace.set(src, (memo = new Map()));
  const k = `${j}|${f.seq}|${f.from}|${f.each ?? 0}`;
  if (!memo.has(k)) memo.set(k, sharesAt([src], src.seq, src.level, j, f.seq, roundKey(f.from, f.each ?? 0))[0]);
  return memo.get(k);
}
/** F-1: a name's value at level `b` of `frames`: stored there, else read in place there (`roundValue`). */
function entryAt(data: Data, run: RunState, frames: Frame[], b: number, key: string): ValueEntry | undefined {
  return run.values.find((v) => v.level === b && v.seq === frames[b]?.seq && nameKey(v.name) === key) ?? roundValue(data, run, frames, b, key);
}
/** P-108: a step that is a routine row whose routine is a value — `{name}` alone, marked `slot`. Its name; undefined for any other item. */
export function slotOf(i: Item | undefined): string | undefined {
  if (!isStep(i) || (i as { slot?: unknown }).slot !== true) return undefined;
  const parts = parseWords(i.text);
  return parts.length === 1 && parts[0].kind === 'name' ? parts[0].name : undefined;
}
/** P-107: a for each block's words — the sentence an older build shows as its step broken down. */
export const eachWords = (each: { item: string; list: string }): string => `For each ${each.item} in {${each.list}}`;
/** P-107: a level of its own for values — a named routine, or a for each block (its rounds, its item). */
export const isScopeSeq = (s: Seq | undefined): boolean => !!s && (s.named || !!s.each || !!s.any);
/** P-99: the words of an In any order block (its row, Plan's heading, the path). */
export const ANY_WORDS = 'In any order';

const KINDS = ['reword', 'breakdown', 'add', 'remove', 'move', 'repeat'];
function isChange(v: unknown): v is Change {
  if (!isObject(v) || !text(v.id) || !text(v.seq) || !text(v.kind) || !KINDS.includes(v.kind)) return false;
  const after = v.after === null || text(v.after);
  if (v.kind === 'reword') return text(v.item) && text(v.text);
  if (v.kind === 'breakdown') return text(v.item) && text(v.into);
  if (v.kind === 'add') return after && isItem(v.item);
  if (v.kind === 'remove') return text(v.item);
  if (v.kind === 'move') return after && text(v.item);
  return v.repeat === undefined || typeof v.repeat === 'number';
}

/** A run's levels as stored (P-99: a part's, too) — what can be read, bottom first. */
function readFrames(raw: unknown, depth = 0): Frame[] {
  const frames: Frame[] = [];
  for (const f of Array.isArray(raw) && depth < MAX_DEPTH ? raw.slice(0, MAX_DEPTH) : []) {
    // A level that can't be read ends the stack there: what is above it has nothing to stand on.
    if (!isObject(f) || !text(f.seq)) break;
    // P-98: fields this version does not know stay on the level (a later build's), written back as they were.
    const { seq: _s, at: _a, round: _r, from: _f, each: _e, eachText: _t, eachSeen: _n, parts: _p, ...rest } = f;
    const each = typeof f.each === 'number' && Number.isInteger(f.each) && f.each >= 0 ? f.each : undefined;
    // (P-108: a list seen that this version cannot read stays on the level, as stored.)
    const seenOk = each !== undefined && Array.isArray(f.eachSeen) && f.eachSeen.every(text);
    if (f.eachSeen !== undefined && !seenOk) (rest as Record<string, unknown>).eachSeen = f.eachSeen;
    // (P-99: and so does a record of parts it cannot read in full.)
    const parts = f.parts === undefined ? undefined : readParts(f.parts, depth);
    if (f.parts !== undefined && !parts) (rest as Record<string, unknown>).parts = f.parts;
    frames.push({
      ...rest,
      seq: f.seq,
      at: text(f.at) ? f.at : null,
      round: countOf(f.round) ?? 1,
      ...(text(f.from) && { from: f.from }),
      ...(each !== undefined && { each }),
      ...(each !== undefined && text(f.eachText) && { eachText: f.eachText }),
      ...(seenOk && { eachSeen: f.eachSeen as string[] }),
      ...(parts && { parts }),
    });
  }
  return frames;
}

const ENDS = ['finished', 'stopped'];
/** P-99: the records of parts this version can read (or made): one stored in a shape it cannot read is kept, never used. */
const readableParts = new WeakSet<Parts>();
const readable = (p: Parts): Parts => (readableParts.add(p), p);
/** P-99: a level's record of an In any order block's parts, as stored — whole, or undefined (then it is kept as it is). */
function readParts(v: unknown, depth: number): Parts | undefined {
  if (!isObject(v) || !text(v.row) || !Array.isArray(v.list)) return undefined;
  const list: Part[] = [];
  for (const p of v.list) {
    if (!isObject(p) || !text(p.item) || list.some((x) => x.item === p.item)) return undefined;
    if ((p.ended !== undefined && !ENDS.includes(p.ended as string)) || (p.frames !== undefined && !Array.isArray(p.frames)) || (p.values !== undefined && !Array.isArray(p.values))) return undefined;
    // (A part's own levels or values that cannot be read in full: the record is kept as stored, never written over.)
    const frames = p.frames === undefined ? undefined : readFrames(p.frames, depth + 1);
    if (frames && frames.length !== (p.frames as unknown[]).length) return undefined;
    const values = p.values === undefined ? undefined : readValues(p.values);
    if (values && values.length !== (p.values as unknown[]).length) return undefined;
    // (F-1, storage F1: what this version does not know stays on the part and on the record, written back as it was.)
    const { item: _i, ended: _e, touchedAt: _t, frames: _f, values: _v, since: _s, ...rest } = p;
    list.push({
      ...rest,
      item: p.item,
      ...(p.ended !== undefined && { ended: p.ended as Part['ended'] }),
      ...(text(p.touchedAt) && { touchedAt: p.touchedAt }),
      ...(frames?.length && { frames }),
      ...(values?.length && { values }),
      ...(text(p.since) && { since: p.since }),
    });
  }
  const { row: _r, list: _l, ...rest } = v;
  return readable({ ...rest, row: v.row, list });
}

const states = new WeakMap<Run, RunState>();
/** A run as it can be used. Never throws; undefined only when there is no such run. */
export function readRun(data: Data, id: Id): RunState | undefined {
  const r = own(data.runs, id);
  if (!isObject(r)) return undefined;
  const had = states.get(r);
  if (had) return had;
  const frames = readFrames(r.frames);
  const ended = text(r.endedAt);
  const run: RunState = {
    id: r.id,
    routineId: r.routineId,
    startedAt: r.startedAt,
    ...(ended && { endedAt: r.endedAt }),
    ...(text(r.waitingSince) && { waitingSince: r.waitingSince }),
    frames,
    changes: rawChanges(r).filter(isChange),
    ...(!ended && (r.status === 'running' || r.status === 'paused') && { status: r.status }),
    ...(!ended && r.mode === 'plan' && r.status !== 'running' && { mode: 'plan' as const }),
    ...(text(r.reason) && r.reason.trim() && { reason: r.reason }),
    ...(text(r.touchedAt) && { touchedAt: r.touchedAt }),
    ...((r.endedBy === 'done' || r.endedBy === 'finished') && { endedBy: r.endedBy }),
    values: readValues(r.values),
    // P-100: only a number this version can order by (anything else is left in the record as it is, and not read).
    ...(typeof r.queue === 'number' && Number.isFinite(r.queue) && { queue: r.queue }),
  };
  states.set(r, run);
  return run;
}

const views = new WeakMap<RunState, Map<Id, { base: Seq; seen: Seq }>>();
/**
 * A sequence as THIS run reads it: the routine with this run's changes folded in. With no change of
 * this run for it, it is the routine's own reading (the same object every time).
 */
export function view(data: Data, run: RunState, seqId: Id): Seq | undefined {
  const base = readRoutine(data, seqId);
  if (!base) return undefined;
  const mine = run.changes.filter((c) => c.seq === seqId);
  if (!mine.length) return base;
  let cache = views.get(run);
  if (!cache) views.set(run, (cache = new Map()));
  const had = cache.get(seqId);
  if (had?.base === base) return had.seen;
  let items = [...base.items];
  let repeat = base.repeat;
  let from = base.repeatFrom;
  const insert = (item: Item, after: Id | null) => {
    const found = after === null ? -1 : items.findIndex((i) => i.id === after);
    const at = after !== null && found < 0 ? items.length : found + 1;
    items.splice(at, 0, item);
    from = dividerAfterInsert(from, at);
  };
  const remove = (id: Id) => {
    const at = items.findIndex((i) => i.id === id);
    if (at < 0) return undefined;
    const [gone] = items.splice(at, 1);
    from = dividerAfterRemove(from, at, items.length);
    return gone;
  };
  for (const c of mine) {
    if (c.kind === 'reword') items = items.map((i) => (i.id === c.item ? reworded(i, c.text) : i));
    else if (c.kind === 'breakdown') items = items.map((i) => (i.id === c.item ? { id: i.id, ref: c.into } : i));
    else if (c.kind === 'add') {
      if (!items.some((i) => i.id === c.item.id)) insert(c.item, c.after);
    } else if (c.kind === 'remove') remove(c.item);
    else if (c.kind === 'move') {
      const moved = remove(c.item);
      if (moved) insert(moved, c.after);
    } else repeat = countOf(c.repeat);
  }
  const { repeat: _r, repeatFrom: _f, ...rest } = base;
  const divider = dividerAt(from, items.length);
  const seen: Seq = { ...rest, items, ...(divider !== undefined && { repeatFrom: divider }), ...(repeat !== undefined && { repeat }) };
  cache.set(seqId, { base, seen });
  return seen;
}

const reworded = (i: Item, words: string): Item => (isRef(i) ? i : isWait(i) ? { ...i, wait: words } : { ...i, text: words });
/** The divider stays before the item it stood before. */
const dividerAfterInsert = (from: number | undefined, at: number) => (from !== undefined && at <= from ? from + 1 : from);
/** …and one left under the last item is no divider. */
const dividerAfterRemove = (from: number | undefined, at: number, left: number) => {
  const moved = from !== undefined && at < from ? from - 1 : from;
  return moved !== undefined && moved >= left ? undefined : moved;
};

/**
 * A routine row's words: the routine's name — P-98: "<name> (removed)" for a routine that was removed (or is
 * not there at all: the name the row kept when it was added).
 */
function refWords(item: { ref: Id }, s: Seq | undefined): string {
  if (!s) {
    const kept = (item as { words?: unknown }).words;
    return text(kept) && kept.trim() ? `${kept} (removed)` : '';
  }
  return s.named && s.removedAt ? `${s.words} (removed)` : s.words;
}
/** P-98: a routine row's words, read from the routines (not a run's reading). */
export const callWords = (data: Data, item: { ref: Id }): string => refWords(item, readRoutine(data, item.ref));
/** An item's words in this run: a step's or a wait's own, a routine's name. */
export const wordsOf = (data: Data, run: RunState, item: Item | undefined): string => (!item ? '' : isRef(item) ? refWords(item, view(data, run, item.ref)) : isWait(item) ? item.wait : item.text);

/** Where a run is, repaired for showing. `repaired`: what is stored says something else. */
export interface Place {
  frames: Frame[];
  /** The level it is in (the last frame). */
  frame: Frame;
  /** That level's sequence, as this run reads it. */
  seq: Seq;
  /** The item it is on; undefined when it is asking for the next small step. */
  item?: Item;
  repaired: boolean;
}

/**
 * Where a run is. A level whose sequence is gone, and everything above it, is dropped; a place that
 * is not an item of its level is the start of that level; an inner level with nothing in it is
 * dropped; with no usable level at all the run is at the start of its routine. Undefined only when
 * the run's own routine is gone (it can't be shown).
 */
export function place(data: Data, run: RunState): Place | undefined {
  const root = view(data, run, run.routineId);
  if (!root) return undefined;
  const frames: Frame[] = [];
  if (run.frames[0]?.seq === run.routineId) {
    for (const [i, f] of run.frames.entries()) {
      const s = view(data, run, f.seq);
      if (!s || (i > 0 && !s.items.length)) break;
      const there = f.at !== null && s.items.some((it) => it.id === f.at);
      frames.push(there || (f.at === null && i === 0) ? f : { ...f, at: s.items[0]?.id ?? null });
    }
  }
  if (!frames.length) frames.push({ seq: run.routineId, at: root.items[0]?.id ?? null, round: 1 });
  const repaired = frames.length !== run.frames.length || frames.some((f, i) => f !== run.frames[i]);
  const frame = frames[frames.length - 1];
  const seq = view(data, run, frame.seq)!;
  return { frames, frame, seq, item: frame.at === null ? undefined : seq.items.find((i) => i.id === frame.at), repaired };
}

/**
 * The run is in Plan: it was left there (`mode`), or it has nothing to stand on (the edge of a goal:
 * nothing can run there, whatever is stored). Never a run that is running on a step, never an ended one.
 */
export function isPlanning(data: Data, run: RunState): boolean {
  if (run.endedAt) return false;
  // P-101 (ruling 4): Plan is a view, not a state. A stored `mode: 'plan'` (earlier builds) is read and
  // kept, never written again, and no longer makes a run "planning": it reads as paused.
  const at = place(data, run);
  return !!at && !at.item;
}

/**
 * The run is running: THE one definition, for the engine, the store and the screens. Stored as running
 * AND on a step — a run in Plan is never running, whatever is stored (the build before P-90 kept a run
 * "running" at the edge of a goal: that one is planning, and blocks nothing).
 */
export const isRunning = (data: Data, run: RunState): boolean => run.status === 'running' && !isPlanning(data, run);

const isOpen = (run: RunState | undefined): run is RunState => !!run && !run.endedAt;
/** Every run that has not ended. */
export const openRuns = (data: Data): RunState[] =>
  Object.keys(data.runs)
    .map((id) => readRun(data, id))
    .filter(isOpen);

// ───────── home's queue (P-100) ─────────

/**
 * P-100: a run's place in home's queue — lower is higher up. Its stored `queue` once the queue has been reordered;
 * otherwise when it was started (ms), so data from before P-100 reads in the order home always showed it (the
 * oldest started first) and a run started now goes to the bottom. A start that cannot be read goes last.
 */
export function queueKey(run: RunState): number {
  if (run.queue !== undefined) return run.queue;
  const t = Date.parse(run.startedAt);
  return Number.isFinite(t) ? t : Number.MAX_VALUE;
}
const byStart = (a: RunState, b: RunState) => (a.startedAt < b.startedAt ? -1 : a.startedAt > b.startedAt ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const byQueue = (a: RunState, b: RunState) => queueKey(a) - queueKey(b) || byStart(a, b);
const byTouch = (a: RunState, b: RunState) => ((a.touchedAt ?? '') < (b.touchedAt ?? '') ? -1 : (a.touchedAt ?? '') > (b.touchedAt ?? '') ? 1 : a.id < b.id ? 1 : -1);

/**
 * P-100: home's queue — its rows, top first. Each routine with a run going is one row: its open run touched last
 * (should an import have left two), when its routine can be read and the run has a place.
 */
export function queueRuns(data: Data): RunState[] {
  const one = new Map<Id, RunState>();
  for (const r of [...openRuns(data)].sort(byTouch)) one.set(r.routineId, r);
  return [...one.values()].filter((r) => !!readRoutine(data, r.routineId) && !!place(data, r)).sort(byQueue);
}

/** P-100: a row moved in home's queue (`Verb` 'queue'). */
function requeue(data: Data, runId: Id, to: number | 'top'): Result {
  const rows = queueRuns(data);
  const i = rows.findIndex((r) => r.id === runId);
  if (i < 0) return refuse(data, 'gone');
  const j = to === 'top' ? 0 : Number.isInteger(to) ? i + to : -1;
  if (j < 0 || j >= rows.length) return refuse(data, 'cannot');
  if (j === i) return done(data);
  const order = rows.filter((r) => r.id !== runId);
  order.splice(j, 0, rows[i]);
  let next = data;
  order.forEach((r, k) => {
    const raw = own(next.runs, r.id)!;
    if (raw.queue !== k + 1) next = putRun(next, patched(raw, { queue: k + 1 }));
  });
  return done(next);
}

/**
 * The one run the app is on: the one with a status. Should damage or an import leave several, the
 * one touched last counts and the others read as left where they are (nothing is rewritten).
 */
export function currentRun(data: Data): RunState | undefined {
  let best: RunState | undefined;
  for (const r of openRuns(data)) {
    if (!r.status) continue;
    if (!best || (r.touchedAt ?? '') > (best.touchedAt ?? '') || ((r.touchedAt ?? '') === (best.touchedAt ?? '') && r.id < best.id)) best = r;
  }
  return best;
}

// ───────── values (P-96) ─────────

/**
 * The level a level's values belong to (contract ruling 2): the bottom one, or the nearest named routine
 * entered as a step at or below it. A step broken down (an unnamed sequence) is part of the routine it is
 * in, so what its smaller steps give is that routine's.
 */
export function scopeLevel(data: Data, run: RunState, frames: Frame[], i: number): number {
  // P-107: a for each block is a level of its own too (what is given inside it is that round's).
  for (let j = Math.min(i, frames.length - 1); j > 0; j--) if (isScopeSeq(view(data, run, frames[j].seq))) return j;
  return 0;
}
const isScope = (data: Data, run: RunState, frames: Frame[], i: number) => i === 0 || isScopeSeq(view(data, run, frames[i].seq));

/** A routine and its smaller steps (the unnamed sequences its steps were broken into), each once: what "inside it" means. */
function bodyOf(read: (id: Id) => Seq | undefined, seqId: Id): Seq[] {
  const out: Seq[] = [];
  const seen = new Set<Id>();
  const walk = (id: Id) => {
    const s = seen.has(id) ? undefined : read(id);
    seen.add(id);
    if (!s) return;
    out.push(s);
    for (const i of s.items) if (isRef(i) && read(i.ref)?.named === false) walk(i.ref);
  };
  walk(seqId);
  return out;
}

/** A routine and its smaller steps, as this run reads them (each once): where its values are given and read. */
export const routineBody = (data: Data, run: RunState, seqId: Id): Seq[] => bodyOf((id) => view(data, run, id), seqId);

/** The names a routine gives anywhere inside itself (key → name as given), as this run reads it. Local to it: never filled from outside. */
export function givenIn(data: Data, run: RunState | undefined, seqId: Id): Map<string, string> {
  const out = new Map<string, string>();
  const read = (id: Id) => (run ? view(data, run, id) : readRoutine(data, id));
  // P-107: a for each block gives its item (each round's), never its list — a step inside that gives the list gives
  // it where the list is (it is shown to adjust), so the block carries on to what is added.
  const each = read(seqId)?.each;
  if (each) out.set(nameKey(each.item), each.item);
  for (const s of bodyOf(read, seqId))
    for (const i of s.items) {
      // P-98: what a call gives is given here (it is handed back to this routine).
      for (const o of isRef(i) && isLiveCall(data, i) ? callIO(data, i.ref).gives : [outOf(i)]) if (o && !out.has(nameKey(o))) out.set(nameKey(o), o);
    }
  if (each) out.delete(nameKey(each.list));
  return out;
}

/** P-107: what a for each block gives the routine it is in — what its steps give, collected (never its item or its list). */
export function eachGives(data: Data, run: RunState | undefined, seqId: Id): string[] {
  const each = (run ? view(data, run, seqId) : readRoutine(data, seqId))?.each;
  return [...givenIn(data, run, seqId).values()].filter((n) => !each || nameKey(n) !== nameKey(each.item));
}

/** P-108: one item of a list a for each goes through — its words, and the routine it holds (null: words). */
interface LoopItem {
  text: string;
  ref: ListRef | null;
}

/**
 * The items a for each level (`j`) goes through. P-107: the value of its list as the level below it sees it. P-108: a
 * kept list — the routine's items, but in a sitting already going through it only those it began with (an item added
 * comes round in the next sitting; one taken out is not come round to); its own list asked on arrival — the value its
 * row was given. [] for none.
 */
function loopItems(data: Data, run: RunState, frames: Frame[], j: number): LoopItem[] {
  const each = j > 0 ? view(data, run, frames[j]?.seq)?.each : undefined;
  if (!each) return [];
  if (each.kept) {
    const live = each.kept.map((text, i) => ({ text, ref: each.refs?.[i] ?? null }));
    const seen = frames[j].eachSeen;
    if (!seen) return live;
    const kept = new Set(matched(seen, live.map((x) => x.text)).values());
    return live.filter((_, i) => kept.has(i));
  }
  const e = visibleValue(data, run, nameKey(each.list), frames.slice(0, j));
  if (!e) return [];
  const refs = refsOf(e);
  return e.items.map((text, i) => ({ text, ref: refs[i] }));
}

/** The list a for each level (`j`) goes through, as words. */
export function eachList(data: Data, run: RunState, frames: Frame[], j: number): string[] {
  return loopItems(data, run, frames, j).map((x) => x.text);
}

/** Two items are the same item when their words are, but for case and spacing. */
const loose = (s: string) => s.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
/**
 * P-108 (the place-keeping fix): which items of `was` are still in `now`, and where — the longest run of items in the
 * same order (their words compared loosely), so an item taken out, added, reworded in case or moved past others is
 * told apart from the rest. Old index → new index.
 */
function matched(was: string[], now: string[]): Map<number, number> {
  const a = was.map(loose);
  const b = now.map(loose);
  const L: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let k = b.length - 1; k >= 0; k--) L[i][k] = a[i] === b[k] ? L[i + 1][k + 1] + 1 : Math.max(L[i + 1][k], L[i][k + 1]);
  const out = new Map<number, number>();
  for (let i = 0, k = 0; i < a.length && k < b.length; ) {
    if (a[i] === b[k]) {
      out.set(i, k);
      i++;
      k++;
    } else if (L[i + 1][k] >= L[i][k + 1]) i++;
    else k++;
  }
  // (P-110, the P-108 investigator's repro 1: an item moved past others is still that item — matched by its words, in
  // order, among the ones the in-order match left — so a reorder never drops one.)
  const taken = new Set(out.values());
  for (let i = 0; i < a.length; i++) {
    if (out.has(i)) continue;
    const k = b.findIndex((w, j) => w === a[i] && !taken.has(j));
    if (k < 0) continue;
    out.set(i, k);
    taken.add(k);
  }
  return out;
}

/**
 * P-110 (the P-108 investigator's repro 1: "an item not yet done is never dropped by a reorder"): the item a for each
 * level goes to next in its list as it reads now, and the list as it then has seen it — the items done (and those added
 * before its place, which never come round), then that item, then the rest. Undefined: past the last. With nothing
 * moved, the item after its place and the list as it reads (as P-108 had it).
 */
function nextEach(list: string[], f: Frame): { k: number; seen: string[]; each: number } | undefined {
  const { at, gone } = eachAt(list, f);
  const p = f.each ?? 0;
  const seen = f.eachSeen;
  if (!seen || p >= seen.length) {
    const k = gone ? at : at + 1;
    return k < list.length ? { k, seen: [...list], each: k } : undefined;
  }
  const origin = new Map<number, number>();
  for (const [o, k] of matched(seen, list)) origin.set(k, o);
  // Still to do: an item it began with, after its place; or one added after where it is now.
  const todo = (i: number) => {
    const o = origin.get(i);
    return o === undefined ? (gone ? i >= at : i > at) : o > p;
  };
  const k = list.findIndex((_, i) => todo(i));
  if (k < 0) return undefined;
  const done = list.filter((_, i) => !todo(i));
  return { k, seen: [...done, list[k], ...list.filter((_, i) => i !== k && todo(i))], each: done.length };
}

/**
 * Where a for each level is in its list as it reads now: `at`, the item it is on — or, `gone`, that item was taken out
 * and `at` is the item after it (the next to do). P-108: by the list the level last saw (`eachSeen`), compared with
 * the list now; an older level, with only its index and its item's words: those words at (or, once only, near) its
 * index, else the index.
 */
function eachAt(list: string[], f: Frame): { at: number; gone: boolean } {
  const p = f.each ?? 0;
  const seen = f.eachSeen;
  if (seen && p < seen.length) {
    const map = matched(seen, list);
    const on = map.get(p);
    if (on !== undefined) return { at: on, gone: false };
    for (let q = p + 1; q < seen.length; q++) if (map.has(q)) return { at: map.get(q)!, gone: true };
    // (Nothing after it is left: what is there now and comes after the items before it.)
    let after = 0;
    for (let q = p - 1; q >= 0; q--)
      if (map.has(q)) {
        after = map.get(q)! + 1;
        break;
      }
    return { at: Math.min(after, list.length), gone: true };
  }
  const was = f.eachText;
  if (was === undefined) return p < list.length ? { at: p, gone: false } : { at: list.length, gone: true };
  if (p < list.length && loose(list[p]) === loose(was)) return { at: p, gone: false };
  const same = list.flatMap((x, i) => (loose(x) === loose(was) ? [i] : []));
  if (same.length === 1) return { at: same[0], gone: false };
  return { at: Math.min(p, list.length), gone: true };
}

const eachPlaces = new WeakMap<ValueEntry, { n: number; of: number }>();
/** P-107: a for each's item, as the values row reads it: "photo 2 of 3". Undefined for any other value — and (P-108) for a kept list's: no count. */
export const eachPlace = (e: ValueEntry | undefined): { n: number; of: number } | undefined => (e ? eachPlaces.get(e) : undefined);

/**
 * P-107: the item of the for each level `j` — never stored: read from the level (its item's words as the round
 * began, else the list's item at its place; an older build's level, with neither, is on the first item). As a
 * value it is the block's: given by the block's row, at that level. P-108: with the routine it holds.
 */
function eachValue(data: Data, run: RunState, frames: Frame[], j: number): ValueEntry | undefined {
  const f = frames[j];
  const s = j > 0 && f?.from ? view(data, run, f.seq) : undefined;
  if (!s?.each) return undefined;
  const list = loopItems(data, run, frames, j);
  const { at, gone } = eachAt(
    list.map((x) => x.text),
    f,
  );
  const words = f.eachText ?? list[f.each ?? 0]?.text;
  if (words === undefined || !words.trim()) return undefined;
  const held = !gone ? list[at]?.ref : null;
  const e: ValueEntry = { name: s.each.item, items: [words], ...(held && readRef(held, words) && { refs: [held] }), level: j, seq: f.seq, item: f.from!, words: s.words, at: '' };
  // (Its place: where it is in the list now; taken out, where it was. A kept list is never counted.)
  const n = gone ? (f.each ?? 0) : at;
  if (!s.each.kept) eachPlaces.set(e, { n: n + 1, of: Math.max(list.length, n + 1) });
  return e;
}

/** P-108: a kept list, as a value read inside its block (to adjust it): the routine's items. Undefined when it has none. */
function keptValue(data: Data, run: RunState, frames: Frame[], j: number): ValueEntry | undefined {
  const f = frames[j];
  const s = view(data, run, f.seq);
  if (!s?.each?.kept?.length || !f.from) return undefined;
  return { name: s.each.list, ...withRefs([...s.each.kept], s.each.refs ?? s.each.kept.map(() => null)), level: j, seq: f.seq, item: f.from, words: s.words, at: '' };
}

/**
 * P-108: a for each's own list, asked on arrival, is local to the block — the value its row was given is seen only on
 * that row and inside the block. The rows of a routine (and its smaller steps) that hold one: row id → its list's key.
 */
const ownRowsMemo = new WeakMap<Data['routines'], Map<Id, Map<Id, string>>>();
function ownRows(data: Data, seqId: Id): Map<Id, string> {
  let memo = ownRowsMemo.get(data.routines);
  if (!memo) ownRowsMemo.set(data.routines, (memo = new Map()));
  const had = memo.get(seqId);
  if (had) return had;
  const out = new Map<Id, string>();
  for (const b of bodyOf((id) => readRoutine(data, id), seqId))
    for (const i of b.items) {
      const each = isRef(i) ? readRoutine(data, i.ref)?.each : undefined;
      if (each?.own && !each.kept) out.set(i.id, nameKey(each.list));
    }
  memo.set(seqId, out);
  return out;
}
/** A value of `frames[j]` that is a for each's own list, where the place is neither on its row nor inside its block. */
const hiddenOwn = (data: Data, frames: Frame[], j: number, v: ValueEntry): boolean => ownRows(data, frames[j].seq).get(v.item) === nameKey(v.name) && !frames.slice(j).some((f) => f.at === v.item);

/** P-108: a row that is a for each with its own list asked on arrival — its block; undefined for any other row. */
export function ownBlock(data: Data, run: RunState, item: Item | undefined): Seq | undefined {
  const s = isRef(item) ? view(data, run, item.ref) : undefined;
  return s?.each?.own && !s.each.kept ? s : undefined;
}

/** P-107: the for each levels among `frames` (above the first). */
const eachLevels = (data: Data, run: RunState, frames: Frame[]): number[] => frames.map((f, j) => (j > 0 && view(data, run, f.seq)?.each ? j : -1)).filter((j) => j > 0);

/** The index of the item of `s` that is `itemId`, or holds it among its smaller steps; -1 when it is not there. */
function topIndexOf(data: Data, run: RunState, s: Seq, itemId: Id): number {
  return s.items.findIndex((i) => i.id === itemId || (isRef(i) && view(data, run, i.ref)?.named === false && bodyOf((id) => view(data, run, id), i.ref).some((b) => b.items.some((x) => x.id === itemId))));
}

/** The run's values that can be read (`readValues`); visible or not. */
export const valuesOf = (_data: Data, run: RunState): ValueEntry[] => run.values;

// ───────── values follow the place (P-110) ─────────

/**
 * P-110: where an item of the routine at level `level` stands against the place: `above` (passed), `at` (the step the run
 * is on, or a step inside the row it rests on), `inside` (the row the run is inside: Step in, a for each, a call),
 * `below` (not reached), `unknown` (not an item of that routine — an input's call row, a step removed in Plan).
 */
export type Standing = 'above' | 'at' | 'inside' | 'below' | 'unknown';
export function standingOf(data: Data, run: RunState, frames: Frame[], level: number, itemId: Id): Standing {
  for (let i = level; i < frames.length; i++) {
    const s = view(data, run, frames[i].seq);
    if (!s) return 'unknown';
    const t = topIndexOf(data, run, s, itemId);
    const idx = frames[i].at === null ? s.items.length : s.items.findIndex((x) => x.id === frames[i].at);
    if (t < 0 || idx < 0) return 'unknown';
    // (A step of a for each's block, or of a repeating part, was passed in an earlier round: what it gave a level below
    // the loop — a list given again from inside it — is above the place.)
    if (t > idx && i > level && ((s.each && (frames[i].each ?? 0) > 0) || (frames[i].round > 1 && s.repeatFrom !== undefined && t >= s.repeatFrom))) return 'above';
    if (t !== idx) return t < idx ? 'above' : 'below';
    const row = s.items[t];
    const into = frames[i + 1];
    const inner = !!into && isRef(row) && into.from === row.id && into.seq === row.ref;
    if (row.id === itemId) return inner ? 'inside' : 'at';
    if (!inner) return 'at';
  }
  return 'unknown';
}

/** P-110: an item of a routine gives this name (its own name, what a call hands back, what a step broken down or a for each gives, an own list). */
function givesKey(data: Data, run: RunState, i: Item, key: string): boolean {
  if (nameKey(outOf(i) ?? '') === key) return true;
  if (!isRef(i)) return false;
  if (isLiveCall(data, i)) return callIO(data, i.ref).gives.some((g) => nameKey(g) === key);
  const s = view(data, run, i.ref);
  if (s?.named !== false) return false;
  return givenIn(data, run, i.ref).has(key) || (!!s.each?.own && nameKey(s.each.list) === key);
}

/** P-110: the items of the routine at `seqId` (its smaller steps too) that give the name, in the routine's order. */
function giversOf(data: Data, run: RunState, seqId: Id, key: string): Item[] {
  const top = view(data, run, seqId);
  if (!top) return [];
  const all = routineBody(data, run, seqId).flatMap((b) => b.items.filter((i) => givesKey(data, run, i, key)));
  return all.map((i) => ({ i, at: topIndexOf(data, run, top, i.id) })).sort((a, b) => a.at - b.at).map((x) => x.i);
}

const giving = new WeakMap<Data['routines'], WeakMap<RunState, Map<string, Id>>>();
/**
 * P-110: the step that gives a value, as the rule reads it — the step it was given at, when that step gives the name (or
 * nothing in its routine gives it: a name asked where it is read); else the first step of its routine that gives it (a
 * value an earlier build let a reader ask for AHEAD of its giving step belongs to that giving step).
 */
function givingItem(data: Data, run: RunState, frames: Frame[], v: ValueEntry): Id {
  const f = frames[v.level];
  if (!f || f.seq !== v.seq) return v.item;
  let byRun = giving.get(data.routines);
  if (!byRun) giving.set(data.routines, (byRun = new WeakMap()));
  let memo = byRun.get(run);
  if (!memo) byRun.set(run, (memo = new Map()));
  const k = `${f.seq}|${nameKey(v.name)}|${v.item}`;
  const had = memo.get(k);
  if (had !== undefined) return had;
  let out = v.item;
  if (routineBody(data, run, f.seq).some((b) => b.items.some((i) => i.id === v.item))) {
    const gs = giversOf(data, run, f.seq, nameKey(v.name));
    if (gs.length && !gs.some((g) => g.id === v.item)) out = gs[0].id;
  }
  memo.set(k, out);
  return out;
}

/** P-110: where a stored value's giving step stands against the place `frames`. */
export const valueStanding = (data: Data, run: RunState, frames: Frame[], v: ValueEntry): Standing => standingOf(data, run, frames, v.level, givingItem(data, run, frames, v));
/** P-110: a value is held only while the step that gives it is above the place (or is the place: its own field). */
const isHeld = (data: Data, run: RunState, frames: Frame[], v: ValueEntry): boolean => valueStanding(data, run, frames, v) !== 'below';

/**
 * P-110 ("a value is asked only at its giving step, never ahead"): the routine the step at the place reads its values in
 * gives this name, and no step of it that gives it has been reached — the reader does not ask (its words show the name
 * as written); the giving step will.
 */
export function givenAhead(data: Data, run: RunState, frames: Frame[], key: string): boolean {
  if (!frames.length) return false;
  const scope = scopeLevel(data, run, frames, frames.length - 1);
  if (!givenIn(data, run, frames[scope].seq).has(key)) return false;
  const gs = giversOf(data, run, frames[scope].seq, key);
  return gs.length > 0 && gs.every((g) => standingOf(data, run, frames, scope, g.id) === 'below');
}

/**
 * P-110: after a move, the values whose giving step the move took the place back over go — now below it, and held before
 * it (P-111, owner: "A Plan edit never clears a run's values" — one a Plan edit put below the place stays stored, hidden,
 * and shows again in its step's field when the run reaches it; no later move deletes it); on it, when the move went back
 * (`back`: Jump, Start over — it asks again there); and one an earlier build gave AHEAD (at a reader) that the move went
 * past without reaching its giving step (Jump). A Next that reaches a giving step keeps the value an earlier build gave
 * ahead: it shows there, in that step's own field. (P-111, owner: "Back keeps it" — Back clears nothing: `runVerb` does
 * not settle it.) What cannot be read is kept. The names cleared, for the notice (its Undo is the whole write).
 */
function settlePlace(before: Data, after: Data, runId: Id, back: boolean): { data: Data; cleared: string[] } {
  const raw = own(after.runs, runId);
  const run = readRun(after, runId);
  const was = readRun(before, runId);
  if (!raw || !run || run.endedAt || !Array.isArray(raw.values) || !raw.values.length) return { data: after, cleared: [] };
  const now = place(after, run)?.frames;
  const then = was ? place(before, was)?.frames : undefined;
  // (Nowhere else — a Jump onto the step it is on: nothing moved back.)
  if (!now || (then && JSON.stringify(then) === JSON.stringify(now))) return { data: after, cleared: [] };
  const cleared: string[] = [];
  const kept = raw.values.filter((v) => {
    // (What cannot be read is kept — P-108: a value whose `refs` are in a shape this version cannot read too.)
    if (!isEntry(v) || ((v as { refs?: unknown }).refs !== undefined && !Array.isArray((v as { refs?: unknown }).refs))) return true;
    const b = valueStanding(after, run, now, v);
    const same = () => (was ? was.values.find((e) => e.level === v.level && e.seq === v.seq && nameKey(e.name) === nameKey(v.name) && e.item === v.item) : undefined);
    /** It was below the place before this move (an earlier build's value given ahead; one a Plan edit put below). */
    const wasBelow = () => {
      const e = same();
      return !!e && !!was && !!then && valueStanding(before, was, then, e) === 'below';
    };
    // (Given ahead: at a step that is not the one that gives it — only an earlier build stored these.)
    const ahead = () => givingItem(after, run, now, v) !== v.item;
    const goes = (b === 'below' && (!wasBelow() || ahead())) || (b === 'at' && back) || ((b === 'above' || b === 'inside') && wasBelow() && ahead());
    if (goes && !cleared.some((c) => nameKey(c) === nameKey(v.name))) cleared.push(v.name);
    return !goes;
  });
  // F-1: a Jump or Start over into a for each — onto its row, or into a round — takes the place back over that round and
  // the ones after it: what they gave the list below goes too (an earlier build's list, given by the row with no givers,
  // when it is the first round).
  let out: unknown[] = kept;
  if (back)
    for (let i = 1; i < now.length; i++) {
      const row = now[i].from;
      if (!row || !view(after, run, now[i].seq)?.each) continue;
      const k = now[i].each ?? 0;
      const b = scopeLevel(after, run, now, i - 1);
      out = out.flatMap((v) => {
        if (!isEntry(v) || v.level !== b || v.seq !== now[b].seq) return [v];
        const gs = giverList(v);
        const mine = (by: string) => (roundOf(row, by) ?? -1) >= k || (k === 0 && by === row);
        if (!v.items.some((_, j) => mine(shareOf(v, gs[j])))) return [v];
        if (!cleared.some((c) => nameKey(c) === nameKey(v.name))) cleared.push(v.name);
        const left = putShare([v], 0, v, mine, { items: [], refs: [], givers: [] });
        return left;
      });
    }
  const had: unknown[] = raw.values;
  if (out.length === had.length && out.every((v, i) => v === had[i])) return { data: after, cleared: [] };
  return { data: putRun(after, patched(raw, { values: out.length ? out : undefined })), cleared };
}

/** F-1 (engine #2): the names a run holds — its values and what its parts put down gave — by key. */
function heldNames(data: Data, runId: Id): Map<string, string> {
  const run = readRun(data, runId);
  const out = new Map<string, string>();
  for (const v of run?.values ?? []) out.set(nameKey(v.name), v.name);
  for (const f of run?.frames ?? []) for (const p of f.parts && readableParts.has(f.parts) ? f.parts.list : []) for (const v of p.values ?? []) out.set(nameKey(v.name), v.name);
  return out;
}

/**
 * The value of a name (its key) as the step the run is on sees it (ruling 2): its own routine's, if it
 * has one; a name its routine gives is its own and never read from further down, even before its giving
 * step has run; else the nearest level below that has it. Undefined: nothing — the step asks.
 */
export function visibleValue(data: Data, run: RunState, key: string, at: Frame[] | undefined = place(data, run)?.frames): ValueEntry | undefined {
  if (!at?.length || (!run.values.length && !eachLevels(data, run, at).length)) return undefined;
  for (let j = scopeLevel(data, run, at, at.length - 1); ; j = scopeLevel(data, run, at, j - 1)) {
    // (P-108: a for each's own list is seen only on its row and inside its block.)
    // (P-110: and a value only while the step that gives it is above the place.)
    const e = run.values.find((v) => v.level === j && v.seq === at[j].seq && nameKey(v.name) === key && !hiddenOwn(data, at, j, v) && isHeld(data, run, at, v));
    if (e) return e;
    // F-1: a for each round gone through before reads what it gave then (none of its own stored).
    const r = j > 0 && !run.values.some((v) => v.level === j && v.seq === at[j].seq && nameKey(v.name) === key) ? roundValue(data, run, at, j, key) : undefined;
    if (r && isHeld(data, run, at, r)) return r;
    // P-107: a for each level's item.
    const each = j > 0 ? view(data, run, at[j].seq)?.each : undefined;
    if (each && nameKey(each.item) === key) return eachValue(data, run, at, j);
    // P-108: inside a for each over a kept list, the list (to adjust it).
    if (each?.kept && nameKey(each.list) === key) return keptValue(data, run, at, j);
    if (j === 0 || givenIn(data, run, at[j].seq).has(key)) return undefined;
    // P-98: an input the call binds (typed, another name, or asked) is what the call says, never read from below by its own name.
    const bound = bindingOf(callInto(data, run, at, j), key);
    if (bound && !('name' in bound && nameKey(bound.name) === key)) return undefined;
  }
}

/**
 * P-101 amendment (ruling 10): the names given by steps the run has already passed (at every level it is in;
 * a step broken down, by its smaller steps) that have no value where the run is, each with the level its
 * value belongs to — not the step's own (it has its field). They can be given now, from the step the run is on.
 */
export function passedGives(data: Data, run: RunState, at: Place | undefined = place(data, run)): { name: string; level: number; item: Id }[] {
  if (!at?.item) return [];
  const out: { name: string; level: number; item: Id }[] = [];
  const { frames } = at;
  const own_ = outOf(at.item);
  const reads = isRef(at.item) ? [] : namesIn(wordsOf(data, run, at.item)).map((n) => n.key);
  frames.forEach((f, i) => {
    const s = view(data, run, f.seq);
    // (P-99: the other parts of an In any order block are not passed — parts never reach into each other.)
    if (!s || s.any) return;
    const idx = s.items.findIndex((it) => it.id === f.at);
    const scope = scopeLevel(data, run, frames, i);
    for (const item of s.items.slice(0, Math.max(0, idx))) {
      // Each name with the step that gives it (a step broken down: the smaller step that does).
      // (P-107: a for each passed gives what it collected — nothing is owed for an empty list.)
      const inner = isRef(item) && view(data, run, item.ref)?.named === false && !view(data, run, item.ref)?.each ? routineBody(data, run, item.ref).flatMap((b) => b.items) : [];
      if (isRef(item) && (view(data, run, item.ref)?.each || view(data, run, item.ref)?.any)) continue;
      const givers: [string | undefined, Id][] = [
        [outOf(item), item.id],
        ...inner.map((i): [string | undefined, Id] => [outOf(i), i.id]),
        // P-98: a call passed (stepped over, or left) owes what it gives.
        ...(isRef(item) && isLiveCall(data, item) ? callIO(data, item.ref).gives.map((g): [string, Id] => [g, item.id]) : []),
        ...inner.filter((i) => isRef(i) && isLiveCall(data, i)).flatMap((i) => callIO(data, (i as { ref: Id }).ref).gives.map((g): [string, Id] => [g, i.id])),
      ];
      for (const [name, giverId] of givers) {
        if (!name) continue;
        const key = nameKey(name);
        if ((own_ && nameKey(own_) === key) || reads.includes(key) || out.some((o) => nameKey(o.name) === key)) continue;
        if (visibleValue(data, run, key, frames)) continue;
        // Only where the run reads it from that routine (a nearer routine that gives it too has its own).
        let owner = -1;
        for (let j = scopeLevel(data, run, frames, frames.length - 1); ; j = scopeLevel(data, run, frames, j - 1)) {
          if (givenIn(data, run, frames[j].seq).has(key)) {
            owner = j;
            break;
          }
          if (j === 0) break;
        }
        if (owner === scope) out.push({ name, level: scope, item: giverId });
      }
    }
  });
  return out;
}

/** Every value the step the run is on can see — the values in play — the level below's first, each in the order it was given. */
export function valuesInPlay(data: Data, run: RunState): ValueEntry[] {
  const at = place(data, run)?.frames;
  if (!at) return [];
  const stored = run.values.filter((e) => visibleValue(data, run, nameKey(e.name), at) === e);
  // F-1: what a for each round gone through before gave, read in place.
  const keys = [...new Set(run.values.map((e) => nameKey(e.name)))];
  const again = eachLevels(data, run, at).flatMap((j) => keys.map((k) => roundValue(data, run, at, j, k)).filter((e): e is ValueEntry => !!e && visibleValue(data, run, nameKey(e.name), at) === e));
  stored.push(...again);
  // P-107: each for each level's item, where it is seen (never stored).
  const items = eachLevels(data, run, at)
    .map((j) => visibleValue(data, run, nameKey(view(data, run, at[j].seq)!.each!.item), at))
    .filter((e): e is ValueEntry => !!e && !run.values.includes(e));
  return [...stored, ...items].sort((a, b) => a.level - b.level);
}

/** P-107: a run's values at level `j` of `frames`, its for each item included (the value sheet's trace). */
export function valuesAtLevel(data: Data, run: RunState, frames: Frame[], j: number): ValueEntry[] {
  // (P-110: only what is held at the place.)
  const own_ = run.values.filter((v) => v.level === j && v.seq === frames[j]?.seq && isHeld(data, run, frames, v));
  // (F-1: and what a for each round gone through before gave, read in place.)
  for (const k of new Set(run.values.map((e) => nameKey(e.name)))) {
    if (own_.some((v) => nameKey(v.name) === k) || run.values.some((v) => v.level === j && v.seq === frames[j]?.seq && nameKey(v.name) === k)) continue;
    const r = roundValue(data, run, frames, j, k);
    if (r && isHeld(data, run, frames, r)) own_.push(r);
  }
  const each = j > 0 ? view(data, run, frames[j].seq)?.each : undefined;
  const item = each && !own_.some((v) => nameKey(v.name) === nameKey(each.item)) ? eachValue(data, run, frames, j) : undefined;
  return item ? [...own_, item] : own_;
}

/**
 * P-107: a name a for each in the routine the run is in reads as its list — its giving step has a list field
 * (one row per item), never one line read apart at commas.
 */
export function readByEach(data: Data, run: RunState, frames: Frame[], key: string): boolean {
  let j = frames.length - 1;
  while (j > 0 && !view(data, run, frames[j].seq)?.named) j--;
  return routineBody(data, run, frames[j].seq).some((s) => !!s.each && nameKey(s.each.list) === key);
}

/**
 * After a move (contract rulings 2, 3): values of a level the run has left — or entered afresh — go; a new
 * round of a level clears what its repeating part gave (from the Repeat divider on, the smaller steps in it
 * too), so those steps ask again; what was given before the divider stays. What cannot be read is kept.
 * Nothing is written when nothing goes.
 */
/** F-1: how many levels, from the bottom, are the same time through in both — the same routine, from the same step, on the same item of a for each. */
function sameTime(a: Frame[], b: Frame[]): number {
  let same = 0;
  while (same < a.length && same < b.length && a[same].seq === b[same].seq && (same === 0 || (a[same].from === b[same].from && (a[same].each ?? 0) === (b[same].each ?? 0)))) same++;
  return same;
}
function settleValues(data: Data, runId: Id, before: Frame[]): Data {
  const raw = own(data.runs, runId)!;
  if (!Array.isArray(raw.values) || !raw.values.length) return data;
  const run = readRun(data, runId)!;
  const after = run.frames;
  // How many levels, from the bottom, are the same time through: the same routine, entered from the same step.
  let same = 0;
  // (P-107: a for each level on another item is another time through: what was given inside it goes.)
  while (same < after.length && same < before.length && after[same].seq === before[same].seq && (same === 0 || (after[same].from === before[same].from && (after[same].each ?? 0) === (before[same].each ?? 0)))) same++;
  const kept = raw.values.filter((v) => {
    if (!isEntry(v)) return true;
    if (v.level >= same || after[v.level].seq !== v.seq || !isScope(data, run, after, v.level)) return false;
    // P-96 audit F4: a value whose step is gone from its routine (removed in Plan) has no place before or
    // after the divider any more: the next new round clears it, so its readers ask again.
    let gone: boolean | undefined;
    const isGone = () => (gone ??= !routineBody(data, run, after[v.level].seq).some((b) => b.items.some((i) => i.id === v.item)));
    for (let i = v.level; i < same && (i === v.level || !isScope(data, run, after, i)); i++) {
      if (after[i].round === before[i].round) continue;
      const s = view(data, run, after[i].seq);
      if (s?.repeatFrom !== undefined && (topIndexOf(data, run, s, v.item) >= s.repeatFrom || isGone())) return false;
    }
    return true;
  });
  return kept.length === raw.values.length ? data : putRun(data, patched(raw, { values: kept.length ? kept : undefined }));
}

// ───────── calls (P-98) ─────────

/**
 * What a call gives the routine it calls for one input: typed words; a name given where it runs (`{y} as
 * x`); or nothing, asked where it is read. An input with none is filled by name where it runs, else asked.
 */
export type Binding = { input: string; typed: string } | { input: string; name: string } | { input: string; ask: true };
type RefItem = { id: Id; ref: Id };

/** A call's bindings that can be read, one per input (the first for a name). What cannot be read stays in `with`, unread. */
export function bindingsOf(item: Item | undefined): Binding[] {
  const raw = isRef(item) ? (item as { with?: unknown }).with : undefined;
  if (!Array.isArray(raw)) return [];
  const out: Binding[] = [];
  for (const b of raw) {
    if (!isObject(b) || !isName(b.input) || out.some((o) => nameKey(o.input) === nameKey(b.input as string))) continue;
    const input = tidyName(b.input);
    if (text(b.typed) && b.typed.trim()) out.push({ input, typed: capValue(b.typed) });
    else if (isName(b.name)) out.push({ input, name: tidyName(b.name) });
    else if (b.ask === true) out.push({ input, ask: true });
  }
  return out;
}
export const bindingOf = (item: Item | undefined, key: string): Binding | undefined => bindingsOf(item).find((b) => nameKey(b.input) === key);

/** A row that calls a named routine — removed or not there any more included (it says so). A step broken down is not a call. */
export const isCall = (data: Data, item: Item | undefined): item is RefItem => isRef(item) && readRoutine(data, item.ref)?.named !== false;
/** A call whose routine is there and not removed: it can be stepped into, and it gives what that routine gives. */
export const isLiveCall = (data: Data, item: Item | undefined): boolean => {
  const t = isRef(item) ? readRoutine(data, item.ref) : undefined;
  return !!t && t.named && !t.removedAt;
};
/** P-98: the routine is removed (or not there at all): its row says so, and it can't be stepped into. */
export const isRemovedCall = (data: Data, item: Item | undefined): boolean => isCall(data, item) && !isLiveCall(data, item);

/** The row level `j` of a run was entered from, when it is a call into that level's routine. */
export function callInto(data: Data, run: RunState, frames: Frame[], j: number): Item | undefined {
  if (j <= 0 || !frames[j]?.from) return undefined;
  const item = view(data, run, frames[j - 1].seq)?.items.find((i) => i.id === frames[j].from);
  // P-108: a routine row whose routine is a value is a call into the routine it was stepped into (nothing bound).
  if (slotOf(item) && view(data, run, frames[j].seq)?.named) return { id: item!.id, ref: frames[j].seq } as Item;
  return isRef(item) && item.ref === frames[j].seq && view(data, run, item.ref)?.named ? item : undefined;
}

/**
 * P-108: what a routine row whose routine is a value holds where the run stands — the routine (by reference: as it is
 * now), a routine removed (its name then), or words. Undefined: nothing gave the name yet (the row asks).
 */
export function heldBy(data: Data, run: RunState, frames: Frame[], item: Item | undefined): { routine: Id } | { removed: string } | { words: string } | undefined {
  const name = slotOf(item);
  if (!name) return undefined;
  const e = visibleValue(data, run, nameKey(name), frames);
  if (!e) return undefined;
  const r = e.items.length === 1 ? refsOf(e)[0] : null;
  if (!r) return { words: e.items.join(', ') };
  const t = readRoutine(data, r.ref);
  return t?.named && !t.removedAt ? { routine: t.id } : { removed: r.name };
}

/** P-98: a value at a called routine's level that its call put there (an input: the routine's own copy). */
export const isInputCopy = (data: Data, run: RunState, frames: Frame[], e: ValueEntry): boolean => e.level > 0 && frames[e.level]?.seq === e.seq && frames[e.level].from === e.item && !!callInto(data, run, frames, e.level);

/** What a routine asks (the names it reads that nothing in it gives) and gives, its steps broken down and its calls included. */
export interface CallIO {
  asks: string[];
  gives: string[];
}
const ios = new WeakMap<Data['routines'], Map<Id, CallIO>>();
/**
 * P-98: what a routine asks and gives, as a call sees it. Its calls count: what they give is given here, and an
 * input of theirs this routine does not bind (or binds to a name of its own) is asked here too. A routine that
 * holds itself (only damage or an import can make one) is read once.
 */
export function callIO(data: Data, seqId: Id): CallIO {
  let memo = ios.get(data.routines);
  if (!memo) ios.set(data.routines, (memo = new Map()));
  return ioOf(data, seqId, [], memo).io;
}
function ioOf(data: Data, seqId: Id, stack: Id[], memo: Map<Id, CallIO>): { io: CallIO; cut: boolean } {
  const had = memo.get(seqId);
  if (had) return { io: had, cut: false };
  if (stack.includes(seqId)) return { io: { asks: [], gives: [] }, cut: true };
  const gives: string[] = [];
  const reads: string[] = [];
  const add = (xs: string[], n: string) => {
    if (!xs.some((x) => nameKey(x) === nameKey(n))) xs.push(n);
  };
  let cut = false;
  const seen = new Set<Id>();
  // In the order a run meets them: a step broken down's own where it stands. P-107: inside a for each block its
  // item is its own (never asked); the block reads its list.
  const walk = (id: Id, local: Set<string>) => {
    const s = seen.has(id) ? undefined : readRoutine(data, id);
    seen.add(id);
    const read = (n: string) => {
      if (!local.has(nameKey(n))) add(reads, n);
    };
    for (const i of s?.items ?? []) {
      const sub = isRef(i) ? readRoutine(data, i.ref) : undefined;
      if (sub?.named === false) {
        if (sub.each) read(sub.each.list);
        walk(sub.id, sub.each ? new Set([...local, nameKey(sub.each.item)]) : local);
        continue;
      }
      if (isRef(i)) {
        if (!isLiveCall(data, i)) continue;
        const inner = ioOf(data, i.ref, [...stack, seqId], memo);
        cut ||= inner.cut;
        for (const g of inner.io.gives) add(gives, g);
        for (const a of inner.io.asks) {
          const b = bindingOf(i, nameKey(a));
          if (!b) read(a);
          else if ('name' in b) read(b.name);
        }
        continue;
      }
      const o = outOf(i);
      if (o) add(gives, o);
      for (const n of namesIn(isWait(i) ? i.wait : isStep(i) ? i.text : '')) read(n.name);
    }
  };
  const root = readRoutine(data, seqId);
  walk(seqId, new Set(root?.each ? [nameKey(root.each.item)] : []));
  const given = new Set(gives.map(nameKey));
  const io = { asks: reads.filter((r) => !given.has(nameKey(r))), gives };
  if (!cut) memo.set(seqId, io);
  return { io, cut };
}

/** The named routines (not removed) that use `routineId` as a step — directly, or in a step broken down — A to Z by name. */
export function callersOf(data: Data, routineId: Id): Seq[] {
  const out: Seq[] = [];
  for (const id of Object.keys(data.routines)) {
    const s = readRoutine(data, id);
    if (!s || !s.named || s.removedAt || id === routineId) continue;
    if (bodyOf((x) => readRoutine(data, x), id).some((b) => b.items.some((i) => isRef(i) && i.ref === routineId))) out.push(s);
  }
  return out.sort((a, b) => (a.words.toLowerCase() < b.words.toLowerCase() ? -1 : a.words.toLowerCase() > b.words.toLowerCase() ? 1 : 0));
}

/** P-110: a routine can be made a step of the routine (or step broken down) `seqId` — named, there, not removed, and not this one or one that uses it. */
export function canCall(data: Data, seqId: Id, target: Id): boolean {
  const t = readRoutine(data, target);
  return !!t && t.named && !t.removedAt && !reaches(data, t.id, ownersOf(data, seqId));
}

/** The named routines a sequence is part of: itself when named, else those whose steps broken down hold it. */
function ownersOf(data: Data, seqId: Id): Set<Id> {
  const out = new Set<Id>([seqId]);
  if (readRoutine(data, seqId)?.named) return out;
  for (const id of Object.keys(data.routines)) if (readRoutine(data, id)?.named && bodyOf((x) => readRoutine(data, x), id).some((b) => b.id === seqId)) out.add(id);
  return out;
}

/** `from` is one of `targets`, or uses one of them as a step, at any depth (each sequence looked into once). */
function reaches(data: Data, from: Id, targets: Set<Id>): boolean {
  const seen = new Set<Id>();
  const todo = [from];
  while (todo.length) {
    const id = todo.pop()!;
    if (targets.has(id)) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const i of readRoutine(data, id)?.items ?? []) if (isRef(i)) todo.push(i.ref);
  }
  return false;
}

/** The names given inside a step broken down that something outside it, in its routine, reads. */
function readOutside(data: Data, run: RunState, scopeSeq: Id, brokenSeq: Id): Set<string> {
  const inside = new Set(routineBody(data, run, brokenSeq).flatMap((b) => b.items.map((i) => i.id)));
  const out = new Set<string>();
  for (const s of routineBody(data, run, scopeSeq))
    for (const i of s.items) {
      if (inside.has(i.id)) continue;
      if (isRef(i) && isLiveCall(data, i)) {
        for (const a of callIO(data, i.ref).asks) {
          const b = bindingOf(i, nameKey(a));
          if (!b) out.add(nameKey(a));
          else if ('name' in b) out.add(nameKey(b.name));
        }
      } else if (!isRef(i)) for (const n of namesIn(isWait(i) ? i.wait : i.text)) out.add(n.key);
    }
  return out;
}

/**
 * P-98 (B-16, "a step owes what its insides give"): what a row with insides owes where the run stands — a call:
 * what its routine gives; a step broken down: the names its smaller steps give that something outside it reads.
 * Only the names still empty there (or given at this very row: its field keeps them).
 */
export function owedBy(data: Data, run: RunState, frames: Frame[], item: Item | undefined): string[] {
  if (!isRef(item)) return [];
  // P-107: a for each owes nothing: what it gives is what each item gave, collected.
  if (view(data, run, item.ref)?.each) return [];
  // P-99: nor does an In any order block: what it gives is what its parts gave, joined.
  if (view(data, run, item.ref)?.any) return [];
  const scope = scopeLevel(data, run, frames, frames.length - 1);
  let names: string[];
  if (isLiveCall(data, item)) names = callIO(data, item.ref).gives;
  else if (view(data, run, item.ref)?.named === false) {
    const read = readOutside(data, run, frames[scope].seq, item.ref);
    names = [...givenIn(data, run, item.ref).values()].filter((n) => read.has(nameKey(n)));
  } else return [];
  return names.filter((n) => {
    const e = visibleValue(data, run, nameKey(n), frames);
    return !e || (e.item === item.id && e.level === scope);
  });
}

/**
 * P-98: Step out of a call or a step broken down before what it gives was given — the names it still owes (a call:
 * what its routine gives with no value inside it yet; a step broken down: what it owes, as `owedBy`). Empty on the
 * first layer.
 */
export function stepOutOwes(data: Data, run: RunState, at: Place | undefined = place(data, run)): string[] {
  if (!at || at.frames.length < 2) return [];
  const L = at.frames.length - 1;
  const below = at.frames.slice(0, L);
  // P-99: a part stopped returns what it gave; it owes nothing.
  if (view(data, run, below[L - 1].seq)?.any) return [];
  const item = view(data, run, below[L - 1].seq)?.items.find((i) => i.id === at.frames[L].from);
  if (!isRef(item) || item.ref !== at.frames[L].seq) return [];
  if (isLiveCall(data, item)) return callIO(data, item.ref).gives.filter((n) => !visibleValue(data, run, nameKey(n), at.frames));
  return owedBy(data, run, below, item).filter((n) => !visibleValue(data, run, nameKey(n), at.frames));
}

/** The words of the step a value was given at (as stored with it, else its step's words now). */
function givenWords(data: Data, run: RunState, frames: Frame[], e: ValueEntry): string {
  if (e.words !== undefined) return e.words;
  const giver = frames[e.level] ? routineBody(data, run, frames[e.level].seq).flatMap((b) => b.items).find((i) => i.id === e.item) : undefined;
  return giver ? wordsOf(data, run, giver) : '';
}

/**
 * P-98: Step in to a call — its inputs, each the called routine's own copy at its level: typed words; or the
 * value of the name it is bound to (by name: the same name) where the call is; an input asked, or with nothing
 * there, has none (its step asks). `from`: the item stepped in from; `before`: the levels below.
 */
function inputsFor(data: Data, run: RunState, before: Frame[], item: RefItem, env: Env): ValueEntry[] {
  const L = before.length;
  const out: ValueEntry[] = [];
  const caller = view(data, run, before[scopeLevel(data, run, before, L - 1)].seq)?.words ?? '';
  for (const input of callIO(data, item.ref).asks) {
    const key = nameKey(input);
    const b = bindingOf(item, key);
    if (b && 'ask' in b) continue;
    if (b && 'typed' in b) {
      out.push({ name: input, items: [b.typed], level: L, seq: item.ref, item: item.id, words: caller, at: env.now });
      continue;
    }
    const e = visibleValue(data, run, b && 'name' in b ? nameKey(b.name) : key, before);
    if (e) out.push({ name: input, ...withRefs([...e.items], refsOf(e)), level: L, seq: item.ref, item: item.id, words: givenWords(data, run, before, e), at: env.now });
  }
  return out;
}

/**
 * P-98: leaving a call hands back what its row gives — each such value of the called routine's level goes to the
 * level its row's values belong to, given by that row; one there already (another call's, a step's) has these
 * items added after its own (one name, given more than once, is one list); given by this same row before (it was
 * gone through again), it is replaced. The rest of the called routine's values stay its own (`settleValues` drops
 * them). `from`: the levels before the move; `popped`: the levels left, innermost first.
 */
function handBack(data: Data, runId: Id, from: Frame[], popped: Frame[], env: Env): Data {
  // P-107: level by level, innermost first — a call hands back, a for each collects — so what a level inside
  // gave is there for the level below it to hand on.
  let next = data;
  popped.forEach((f, k) => {
    const level = from.length - 1 - k;
    if (level <= 0 || from[level].seq !== f.seq) return;
    next = view(next, readRun(next, runId)!, f.seq)?.each ? collectRound(next, runId, from, level, env) : handBackLevel(next, runId, from, level, env);
  });
  return next;
}

/** P-98: one call level left (`level` of `from`) hands back what its row gives. */
function handBackLevel(data: Data, runId: Id, from: Frame[], level: number, env: Env): Data {
  const raw = own(data.runs, runId)!;
  if (!Array.isArray(raw.values) || !raw.values.length) return data;
  const run = readRun(data, runId)!;
  let values: unknown[] = [...raw.values];
  let changed = false;
  const f = from[level];
  {
    const call = callInto(data, run, from, level);
    if (!isRef(call) || !isLiveCall(data, call)) return data;
    const scope = scopeLevel(data, run, from, level - 1);
    const gives = new Set(callIO(data, f.seq).gives.map(nameKey));
    const words = wordsOf(data, run, call);
    for (const e of values.filter((v): v is ValueEntry => isEntry(v) && v.level === level && v.seq === f.seq && gives.has(nameKey(v.name)))) {
      const key = nameKey(e.name);
      const at = values.findIndex((v) => isEntry(v) && v.level === scope && v.seq === from[scope].seq && nameKey(v.name) === key);
      // (F-1, engine #3: given by this row before — it was gone through again — its own share is replaced, never added twice.)
      values = putShare(values, at, { name: e.name, level: scope, seq: from[scope].seq, item: call.id, words, at: env.now }, (by) => by === call.id, asShare(e, call.id), undefined, at < 0 ? roundValue(data, run, from, scope, key) : undefined);
      values = values.filter((v) => v !== e);
      changed = true;
    }
  }
  return changed ? putRun(data, patched(raw, { values })) : data;
}

/**
 * P-107 (B-16, "A for each collects"): a round of the for each level `level` of `from` ended (its next item, the
 * last passed, or Step out) — what was given inside it this round goes to the level its values belong to, given
 * by the block's row: after its own on a later round (one name, given more than once, is one list), in place of
 * what this row gave the last time through on its first. Never its item, never its list.
 */
function collectRound(data: Data, runId: Id, from: Frame[], level: number, env: Env): Data {
  const raw = own(data.runs, runId)!;
  if (!Array.isArray(raw.values) || !raw.values.length) return data;
  const run = readRun(data, runId)!;
  const f = from[level];
  const s = view(data, run, f.seq);
  if (!s?.each || !f.from) return data;
  const b = scopeLevel(data, run, from, level - 1);
  const skip = new Set([nameKey(s.each.item), nameKey(s.each.list)]);
  let values: unknown[] = [...raw.values];
  let changed = false;
  const row = f.from;
  const k = f.each ?? 0;
  for (const e of raw.values.filter((v): v is ValueEntry => isEntry(v) && v.level === level && v.seq === f.seq && !skip.has(nameKey(v.name)))) {
    const key = nameKey(e.name);
    const at = values.findIndex((v) => isEntry(v) && v.level === b && v.seq === from[b].seq && nameKey(v.name) === key);
    // (F-1, engine #1, #3: each round is its own share — a round gone through again replaces what it gave, in its place
    // among the others. A list collected by an earlier build, given by the row with no givers: its first round replaces
    // it, as that build had it.)
    const mine = (by: string) => roundOf(row, by) === k || (k === 0 && by === row);
    const later = (by: string) => (roundOf(row, by) ?? -1) > k;
    values = putShare(values, at, { name: e.name, level: b, seq: from[b].seq, item: row, words: s.words, at: env.now }, mine, asShare(e, roundKey(row, k)), later, at < 0 ? roundValue(data, run, from, b, key) : undefined);
    changed = true;
  }
  return changed ? putRun(data, patched(raw, { values })) : data;
}

/** Values added to a run's own (a new one past MAX_VALUES is left out: its step asks). */
function addValues(data: Data, runId: Id, add: ValueEntry[]): Data {
  if (!add.length) return data;
  const raw = own(data.runs, runId)!;
  if (raw.values !== undefined && !Array.isArray(raw.values)) return data;
  const values: unknown[] = Array.isArray(raw.values) ? [...raw.values] : [];
  let n = readValues(values).length;
  for (const e of add) if (n < MAX_VALUES && ++n) values.push(e);
  return putRun(data, patched(raw, { values }));
}

// ───────── moving ─────────

interface Advance {
  frames: Frame[];
  /** The levels left, innermost first. */
  popped: Frame[];
  ended?: true;
  asking?: true;
  /** P-99: on an In any order block's row with a part not returned or stopped — the step after it waits (nothing moved). */
  waiting?: true;
}

/**
 * What Next does to a stack of levels. Also what the panel's "then:" reads and what Done does to
 * the level below: one rule for all three.
 */
export function advance(data: Data, run: RunState, from: Frame[], opts: { how?: 'stopped'; force?: true } = {}): Advance {
  const frames = from.map((f) => ({ ...f }));
  const popped: Frame[] = [];
  let { how, force } = opts;
  // Each turn either lands or leaves a level, so it ends within the depth.
  for (let guard = 0; guard <= MAX_DEPTH; guard++) {
    const f = frames[frames.length - 1];
    const s = view(data, run, f.seq);
    if (!s) return { frames, popped };
    const at = f.at === null ? -1 : s.items.findIndex((i) => i.id === f.at);
    // P-99 (B-16 rule 3): from an In any order block's row only once every part has returned or been stopped (`force`:
    // Step out of the block, which stops the rest — parts cannot outlive it).
    if (!force && at >= 0 && anyBlock(data, run, s.items[at]) && !partsJoined(data, run, frames, frames.length - 1)) return { frames: from, popped: [], waiting: true };
    force = undefined;
    // P-99: a part returned (Next past its last step; Step out of it: stopped) — back on the block's row, the part's end
    // recorded there; when every part has, the block is passed, as Next from its row.
    if (s.any && frames.length > 1) {
      const child = frames.pop()!;
      popped.push(child);
      const below = frames[frames.length - 1];
      if (below.at !== child.from || below.at === null || child.at === null) return { frames, popped };
      if (lockedParts(below)) return { frames: from, popped: [], waiting: true };
      const ended: Part['ended'] = how ?? 'finished';
      const rec = withPart(partsOf(below) ?? { row: below.at, list: [] }, child.at, (p) => patched(p, { ended, frames: undefined, values: undefined, since: undefined }));
      below.parts = rec;
      how = undefined;
      if (!s.items.every((p) => rec.list.some((x) => x.item === p.id && x.ended))) return { frames, popped };
      continue;
    }
    // (A level that moves off the row its record of parts is for drops it: the block was passed or left. One kept for
    // another row — the run went Back from the block's row — stays, for when the run is on that row again.)
    if (partsOf(f)) delete f.parts;
    if (at + 1 < s.items.length) {
      f.at = s.items[at + 1].id;
      return { frames, popped };
    }
    // The last item: round again, unless there is no divider or the number is reached.
    if (s.repeatFrom !== undefined && !(s.repeat !== undefined && f.round >= s.repeat)) {
      f.at = s.items[s.repeatFrom].id;
      f.round += 1;
      delete f.parts;
      return { frames, popped };
    }
    // P-107: a for each goes on to its next item — the one after the item it is on, in the list as it reads now
    // (an item added comes round; one taken out, the next in its place) — and ends past the last.
    if (s.each && frames.length > 1) {
      const list = eachList(data, run, frames, frames.length - 1);
      const to = nextEach(list, f);
      if (to && s.items.length) {
        f.each = to.each;
        f.eachText = list[to.k];
        f.eachSeen = to.seen;
        f.at = s.items[0].id;
        delete f.parts;
        f.round = 1;
        return { frames, popped };
      }
    }
    if (frames.length === 1) {
      if (!s.open && s.items.length) return { frames: from, popped, ended: true };
      f.at = null;
      return { frames, popped, asking: true };
    }
    const child = frames.pop()!;
    popped.push(child);
    // The level below was moved meanwhile (an edit): land where it is.
    if (frames[frames.length - 1].at !== child.from) return { frames, popped };
  }
  return { frames, popped };
}

// ───────── In any order (P-99) ─────────

/** P-99: the In any order block a row is (its sequence); undefined for any other row. */
export function anyBlock(data: Data, run: RunState, item: Item | undefined): Seq | undefined {
  const s = isRef(item) ? view(data, run, item.ref) : undefined;
  return s?.any ? s : undefined;
}
/** P-99: the record of parts a level holds for the row it is on (one kept for another row, after Back, is not this one's). */
export const partsOf = (f: Frame | undefined): Parts | undefined => (f?.parts && readableParts.has(f.parts) && f.at !== null && f.parts.row === f.at ? f.parts : undefined);
/** P-99: the level holds a record of parts this version cannot read (a later build's): it is kept as it is — nothing that would write one is done. */
export const lockedParts = (f: Frame | undefined): boolean => !!f && f.parts !== undefined && !readableParts.has(f.parts);
/** F-1 (engine #8): a level the run is in holds a record of parts this version cannot read — what it refuses there is said. */
export function holdsLockedParts(data: Data, runId: Id): boolean {
  const run = readRun(data, runId);
  const at = run && !run.endedAt ? place(data, run) : undefined;
  return !!at && at.frames.some(lockedParts);
}
/** P-99: the part the run is in, of the block whose row `frames[i]` is on; undefined on the row itself (choosing). */
export function activePart(data: Data, run: RunState, frames: Frame[], i: number): Id | undefined {
  const into = frames[i + 1];
  const row = frames[i]?.at;
  if (!into || !row || into.from !== row || into.at === null) return undefined;
  return view(data, run, into.seq)?.any ? into.at : undefined;
}
/** P-99: every part of the block whose row `frames[i]` is on has returned or been stopped (a block with none, too). */
export function partsJoined(data: Data, run: RunState, frames: Frame[], i: number): boolean {
  const f = frames[i];
  const block = anyBlock(data, run, view(data, run, f?.seq)?.items.find((x) => x.id === f?.at));
  if (!block) return true;
  const rec = partsOf(f);
  const active = activePart(data, run, frames, i);
  return block.items.every((p) => p.id !== active && !!rec?.list.find((x) => x.item === p.id)?.ended);
}
/** P-99: a record of parts with one part's entry changed (added at the end when it has none). */
function withPart(rec: Parts, item: Id, change: (p: Part) => Part): Parts {
  const had = rec.list.some((p) => p.item === item);
  return readable({ ...rec, list: had ? rec.list.map((p) => (p.item === item ? change(p) : p)) : [...rec.list, change({ item })] });
}
/** P-99: the part Step in takes up from the block's row — the one put down last, else the first not taken up. */
export function partToTakeUp(data: Data, run: RunState, frames: Frame[], i: number): Id | undefined {
  const f = frames[i];
  const block = anyBlock(data, run, view(data, run, f?.seq)?.items.find((x) => x.id === f?.at));
  if (!block) return undefined;
  const rec = partsOf(f);
  const open = block.items.filter((p) => !rec?.list.find((x) => x.item === p.id)?.ended);
  const down = open.map((p) => rec?.list.find((x) => x.item === p.id)).filter((x): x is Part => !!x?.frames).sort((a, b) => ((a.touchedAt ?? '') < (b.touchedAt ?? '') ? 1 : (a.touchedAt ?? '') > (b.touchedAt ?? '') ? -1 : 0));
  return down[0]?.item ?? open.find((p) => !rec?.list.some((x) => x.item === p.id))?.id ?? open[0]?.id;
}

/**
 * P-99, after a move: each In any order block the run was at (on its row, or inside a part) and still is — the part it
 * was in and is not now is put down: its place (unless it ended) and the values it gave (the levels above the row's) kept
 * in the record, and taken out of the run's own. A block the move passed (Next, Step out: not `discard`) is joined: what
 * every part gave, in the order given, collected below it — one list per name, given by the block's row. A block left by
 * Jump or Start over takes its record with it.
 */
function settleParts(data: Data, runId: Id, before: Frame[], since: string | undefined, env: Env, discard: boolean): Data {
  const raw = own(data.runs, runId)!;
  const run = readRun(data, runId)!;
  const frames = [...run.frames];
  let values: unknown[] = Array.isArray(raw.values) ? [...raw.values] : [];
  let changed = false;
  for (let i = 0; i < before.length; i++) {
    const rowB = before[i].at;
    const row = rowB === null ? undefined : view(data, run, before[i].seq)?.items.find((x) => x.id === rowB);
    if (!row || !anyBlock(data, run, row)) continue;
    const recB = partsOf(before[i]);
    const activeB = activePart(data, run, before, i);
    if ((!recB && !activeB) || lockedParts(before[i]) || lockedParts(frames[i])) continue;
    const same = i < frames.length && frames[i].seq === before[i].seq && (i === 0 || frames[i].from === before[i].from) && (frames[i].each ?? 0) === (before[i].each ?? 0) && frames[i].round === before[i].round;
    const mine = (v: unknown) => isEntry(v) && v.level > i;
    if (same && frames[i].at === rowB) {
      // Still at the block: the part it was in, if it is not in it now, is put down.
      const activeA = activePart(data, run, frames, i);
      if (!activeB || activeB === activeA) continue;
      const gave = values.filter(mine) as ValueEntry[];
      values = values.filter((v) => !mine(v));
      const rec = withPart(partsOf(frames[i]) ?? { row: rowB!, list: [] }, activeB, (p) =>
        p.ended
          ? { ...p, ...(gave.length ? { values: gave } : {}) }
          : patched(p, { ended: undefined, touchedAt: env.now, frames: before.slice(i + 1), values: gave.length ? gave : undefined, since: since !== undefined && before.length - 1 > i ? since : undefined }),
      );
      frames[i] = { ...frames[i], parts: rec };
      changed = true;
      continue;
    }
    // (F-1, engine #2: a Jump forward past the block joins, as Step out does — what the parts gave is above the place.)
    if (!same || (discard && standingOf(data, run, frames, i, rowB!) !== 'above')) continue;
    // Passed: joined — every part's values, in the order given, one list per name below the block.
    const all = [...(recB?.list ?? []).flatMap((p) => (p.values ?? []).map((e) => ({ e, part: p.item }))), ...(values.filter(mine) as ValueEntry[]).map((e) => ({ e, part: activeB ?? '' }))]
      .map((x, k) => ({ ...x, k }))
      .sort((a, b) => (a.e.at < b.e.at ? -1 : a.e.at > b.e.at ? 1 : a.k - b.k));
    values = values.filter((v) => !mine(v));
    const b = scopeLevel(data, run, before, i);
    // (F-1, engine #3: the block passed again — Back, then on — gives anew in place of what it gave last time, each part
    // its own share: never added twice. A list joined by an earlier build, given by the row with no givers, is replaced.)
    const names = [...new Set(all.map((x) => nameKey(x.e.name)))];
    for (const key of names) {
      const these = all.filter((x) => nameKey(x.e.name) === key);
      const share: Share = { items: [], refs: [], givers: [] };
      for (const x of these) {
        const one = asShare(x.e, partKey(row.id, x.part));
        share.items.push(...one.items);
        share.refs.push(...one.refs);
        share.givers.push(...one.givers);
      }
      const at = values.findIndex((v) => isEntry(v) && v.level === b && v.seq === before[b].seq && nameKey(v.name) === key);
      values = putShare(values, at, { name: these[0].e.name, level: b, seq: before[b].seq, item: row.id, words: ANY_WORDS, at: env.now }, (by) => by === row.id || by.startsWith(`${row.id}/`), share, undefined, at < 0 ? roundValue(data, run, before, b, key) : undefined);
    }
    changed = true;
  }
  return changed ? putRun(data, patched(raw, { frames, values: values.length ? values : undefined })) : data;
}

/**
 * P-99: the part `part` taken up (after the move that put the run in it): its record says when, and holds no place or
 * values any more — what it gave is the run's again, and a wait it was put down on is waited on since then.
 */
function tookUp(data: Data, runId: Id, level: number, part: Part | undefined, partId: Id, env: Env): Data {
  const raw = own(data.runs, runId)!;
  const run = readRun(data, runId)!;
  const f = run.frames[level];
  if (!f || f.at === null) return data;
  const frames = [...run.frames];
  frames[level] = { ...f, parts: withPart(partsOf(f) ?? { row: f.at, list: [] }, partId, (p) => patched(p, { ended: undefined, touchedAt: env.now, frames: undefined, values: undefined, since: undefined })) };
  let next = putRun(data, patched(raw, { frames }));
  if (part?.values?.length) next = addValues(next, runId, part.values);
  const now = place(next, readRun(next, runId)!);
  if (part?.since && isWait(now?.item)) next = putRun(next, patched(own(next.runs, runId)!, { waitingSince: part.since }));
  return next;
}

function takeUp(data: Data, runId: Id, level: number, partId: Id, env: Env): Result {
  const l = load(data, runId);
  if (typeof l === 'string') return refuse(data, l);
  if (inPlan(l)) return refuse(data, 'planning');
  const frames = l.at.frames;
  const f = frames[level];
  const row = f && Number.isInteger(level) ? view(data, l.run, f.seq)?.items.find((x) => x.id === f.at) : undefined;
  const block = anyBlock(data, l.run, row);
  const item = block?.items.find((x) => x.id === partId);
  if (!row || !block || !item) return refuse(data, 'no-such-step');
  if (lockedParts(f)) return refuse(data, 'cannot');
  const rec = partsOf(f)?.list.find((x) => x.item === partId);
  if (rec?.ended) return refuse(data, 'ended');
  if (activePart(data, l.run, frames, level) === partId) return done(data);
  if (level + 2 > MAX_DEPTH) return refuse(data, 'too-deep');
  const saved = rec?.frames && rec.frames[0].seq === block.id && rec.frames[0].at === partId && rec.frames[0].from === row.id && level + 1 + rec.frames.length <= MAX_DEPTH ? rec.frames : undefined;
  // A part not taken up yet: at itself — a part broken down, inside it, at its first step (it runs as its own thread).
  const inner = isRef(item) ? view(data, l.run, item.ref) : undefined;
  const into = inner && !inner.named && !inner.any && !inner.each && inner.items.length && level + 3 <= MAX_DEPTH ? inner : undefined;
  const fresh: Frame[] = [{ seq: block.id, at: partId, round: 1, from: row.id }, ...(into ? [{ seq: into.id, at: into.items[0].id, round: 1, from: partId }] : [])];
  const out = moved(data, l, { frames: [...frames.slice(0, level + 1), ...(saved ?? fresh)] }, env);
  return { ...out, data: tookUp(out.data, runId, level, rec, partId, env) };
}

/**
 * P-99: where Back goes from a part — the block's row (choosing), when the run is on a part at the block's level, or on
 * the first step of a part broken down; undefined anywhere else. Its level and the row.
 */
export function backUp(data: Data, run: RunState): { level: number; row: Item } | undefined {
  const p = place(data, run);
  if (!p) return undefined;
  const L = p.frames.length - 1;
  const k = L > 0 && p.seq.any ? L - 1 : L > 1 && !previous(data, run) && view(data, run, p.frames[L - 1].seq)?.any ? L - 2 : -1;
  const row = k < 0 ? undefined : view(data, run, p.frames[k].seq)?.items.find((i) => i.id === p.frames[k].at);
  return row ? { level: k, row } : undefined;
}

/** Back to <step>: the step before this one in this level, and its round. Undefined when there is none. */
export function previous(data: Data, run: RunState): { at: Id; round: number; each?: number; eachText?: string } | undefined {
  const p = place(data, run);
  if (!p) return undefined;
  const { frame, seq } = p;
  const n = seq.items.length;
  const at = frame.at === null ? n : seq.items.findIndex((i) => i.id === frame.at);
  if (!n || at < 0) return undefined;
  // The first repeating item of a later round: the last item of the round before.
  if (at === seq.repeatFrom && frame.round > 1) return { at: seq.items[n - 1].id, round: frame.round - 1 };
  if (at > 0) return { at: seq.items[at - 1].id, round: frame.round };
  // F-1 (engine #12): the first step of a for each's later item — the last step of the item before, in its last round.
  const k = (frame.each ?? 0) - 1;
  if (seq.each && frame.from && k >= 0) {
    const words = frame.eachSeen?.[k] ?? eachList(data, run, p.frames, p.frames.length - 1)[k];
    if (words !== undefined) return { at: seq.items[n - 1].id, round: lastRound(seq), each: k, eachText: words };
  }
  return undefined;
}
/** F-1: the round a sequence's last step is in, gone through to its end (a number of rounds: the last; else the first). */
const lastRound = (s: Seq): number => (s.repeatFrom !== undefined && s.repeat !== undefined ? s.repeat : 1);
/**
 * F-1 (engine #1; "Back keeps it"): Back onto a for each row goes in — onto its last item's last step, in that item's
 * round (its values are put back there by `moved`) — and so on, for a for each that is that step. A for each with
 * nothing to go through is its row, as before.
 */
function intoLast(data: Data, run: RunState, frames: Frame[]): Frame[] {
  const out = [...frames];
  while (out.length < MAX_DEPTH) {
    const f = out[out.length - 1];
    const row = view(data, run, f.seq)?.items.find((i) => i.id === f.at);
    const block = isRef(row) ? view(data, run, row.ref) : undefined;
    if (!block?.each || !block.items.length) break;
    const list = eachList(data, run, [...out, { seq: block.id, at: null, round: 1, from: row!.id }], out.length);
    if (!list.length) break;
    out.push({ seq: block.id, at: block.items[block.items.length - 1].id, round: lastRound(block), from: row!.id, each: list.length - 1, eachText: list[list.length - 1], eachSeen: [...list] });
  }
  return out;
}

// ───────── writing ─────────

const refuse = (data: Data, reason: Refusal, extra: Partial<Result> = {}): Result => ({ ok: false, data, reason, ...extra });
const done = (data: Data, extra: Partial<Result> = {}): Result => ({ ok: true, data, ...extra });
const putRun = (data: Data, run: Run): Data => ({ ...data, runs: { ...data.runs, [run.id]: run } });
const putRoutine = (data: Data, routine: Routine): Data => ({ ...data, routines: { ...data.routines, [routine.id]: routine } });

/**
 * The ONE place a run's status is written. Giving a run a status makes it the run the app is on:
 * every other run loses its own (so at most one is ever running). `status` undefined: this run
 * stops being it. `id` undefined: no run is.
 */
function setStatus(data: Data, id: Id | undefined, status?: 'running' | 'paused'): Data {
  let runs = data.runs;
  for (const r of Object.values(data.runs)) {
    const mine = r.id === id;
    if (mine ? r.status === status : r.status === undefined || (id !== undefined && !status)) continue;
    if (runs === data.runs) runs = { ...data.runs };
    // A running run has no mode: one stored there (an old tab's Resume) goes when it stops running, so it can't come back as planning.
    // P-101 (ruling 4): one stored running at the edge (as the build before left it) is the edge by itself: no mode is written for it.
    const read = r.status === 'running' ? readRun(data, r.id) : undefined;
    const edge = !!read && isPlanning(data, read);
    runs[r.id] = patched(r, { status: mine ? status : undefined, ...(!edge && r.status === 'running' && 'mode' in r && { mode: undefined }) });
  }
  return runs === data.runs ? data : { ...data, runs };
}

const placeKey = (p: Place | undefined) => (p ? `${p.frames.length}:${p.frame.seq}:${p.frame.at}:${p.frame.round}` : '');
/** Waiting-since is set exactly while the run is on a wait step: now on arriving, kept while there, gone otherwise. */
function settleWait(data: Data, runId: Id, was: Place | undefined, env: Env): Data {
  const raw = own(data.runs, runId)!;
  const run = readRun(data, runId)!;
  const now = place(data, run);
  const since = isWait(now?.item) ? (placeKey(was) === placeKey(now) && run.waitingSince ? run.waitingSince : env.now) : undefined;
  return since === raw.waitingSince ? data : putRun(data, patched(raw, { waitingSince: since }));
}

interface Loaded {
  raw: Run;
  run: RunState;
  at: Place;
}
/** In Plan: left there, or at the edge. */
const inPlan = (l: Loaded) => l.run.mode === 'plan' || !l.at.item;
/** An open run and where it is, or why not. */
function load(data: Data, runId: Id): Loaded | Refusal {
  const raw = own(data.runs, runId);
  const run = readRun(data, runId);
  if (!raw || !run) return 'gone';
  if (run.endedAt) return 'ended';
  const at = place(data, run);
  return at ? { raw, run, at } : 'gone';
}

/**
 * Plan is opened on it: not running (the one the app is on is paused, plainly; any other run keeps no
 * status). P-101 (ruling 4): no mode is written — Plan is a view, and a run is running or paused.
 */
function markPlan(data: Data, runId: Id): Data {
  return own(data.runs, runId)?.status === 'running' ? setStatus(data, runId, 'paused') : data;
}

/**
 * Plan is opened on a run: this-run changes it still carries from the build before are folded into
 * the routine (ruling 3), and it is in Plan — one piece of data, so one write and one Undo.
 */
function enterPlan(data: Data, runId: Id, env: Env): { data: Data; folded?: string } {
  const run = readRun(data, runId)!;
  if (!run.changes.length) return { data: markPlan(data, runId) };
  return { data: markPlan(resettle(data, fold(data, runId), env), runId), folded: readRoutine(data, run.routineId)?.words ?? '' };
}

/** The run is somewhere else now: the frames, the reason gone, waiting-since settled, what is said. Nothing to stand on there: it is in Plan. */
function moved(data: Data, l: Loaded, to: { frames: Frame[]; popped?: Frame[]; asking?: true; discard?: true; fresh?: true }, env: Env, said?: Said): Result {
  const popped = to.popped ?? [];
  let next = putRun(data, patched(l.raw, { frames: to.frames, touchedAt: env.now, reason: undefined, ...(l.raw.status === 'running' && 'mode' in l.raw && { mode: undefined }) }));
  next = settleWait(next, l.run.id, l.at, env);
  // P-98: a call left (by Next past its last step, or Step out) hands back what its row gives.
  if (popped.length) next = handBack(next, l.run.id, l.at.frames, popped, env);
  // F-1 (engine #2): a Jump forward out of a for each — past its row — collects the round it was in, as Step out does
  // (what was given above the new place is held). A call left by a Jump still hands back nothing (values.test row 6).
  if (to.discard && !to.fresh) {
    const m = sameTime(l.at.frames, to.frames);
    if (m >= 1 && m < l.at.frames.length && standingOf(next, readRun(next, l.run.id)!, to.frames, m - 1, l.at.frames[m].from ?? '') === 'above')
      for (let level = l.at.frames.length - 1; level >= m; level--) if (view(next, readRun(next, l.run.id)!, l.at.frames[level].seq)?.each) next = collectRound(next, l.run.id, l.at.frames, level, env);
  }
  // P-99: a part put down keeps its place and values; a block passed joins what its parts gave.
  // (`fresh`: Start over — the block's parts start afresh, nothing put down.)
  if (!to.fresh) next = settleParts(next, l.run.id, l.at.frames, isWait(l.at.item) ? l.run.waitingSince : undefined, env, !!to.discard);
  // P-107: a for each gone on to its next item — what the round it leaves gave is collected.
  for (let i = 1; i < Math.min(l.at.frames.length, to.frames.length); i++) {
    const [a, b] = [l.at.frames[i], to.frames[i]];
    if (a.seq === b.seq && a.from === b.from && (a.each ?? 0) !== (b.each ?? 0)) next = collectRound(next, l.run.id, l.at.frames, i, env);
  }
  next = settleValues(next, l.run.id, l.run.frames);
  // (P-107: a for each is named by its item, as on the runner's path: "Left For each photo".)
  // (P-99: a block whose part returned is named only once it is passed: a part's own end is not the block's.)
  const live = (f: Frame) => to.frames.some((g) => g.at === f.from && partsOf(g));
  const names = popped
    .filter((f) => !(view(data, l.run, f.seq)?.any && live(f)))
    .map((f) => {
      const s = view(data, l.run, f.seq);
      return s?.each ? `For each ${s.each.item}` : (s?.words ?? '');
    });
  let folded: string | undefined;
  // The edge: nothing can run there, so the run is in Plan (and its old this-run changes are folded) in this same write.
  if (!place(next, readRun(next, l.run.id)!)?.item) ({ data: next, folded } = enterPlan(next, l.run.id, env));
  return done(next, { said: said ?? (names.length ? { kind: 'finished', names } : to.asking ? { kind: 'edge' } : undefined), ...(folded !== undefined && { folded }) });
}

/** The run ends: by Done at the top, or by itself. Its place stays as it was. */
function end(data: Data, l: Loaded, by: 'done' | 'finished', env: Env, keepNote = false): Result {
  const record = patched(l.raw, {
    ...(l.at.repaired && { frames: l.at.frames }),
    endedAt: env.now,
    endedBy: by,
    touchedAt: env.now,
    waitingSince: undefined,
    // P-103 audit F6: "End this run" keeps the person's pause note in the record.
    ...(!keepNote && { reason: undefined }),
    mode: undefined,
  });
  const next = setStatus(putRun(data, record), l.run.id, undefined);
  return done(next, { said: { kind: 'ended', name: readRoutine(data, l.run.routineId)?.words ?? '' } });
}

function start(data: Data, routineId: Id, env: Env): Result {
  const s = readRoutine(data, routineId);
  if (!s || s.removedAt) return refuse(data, 'gone');
  // Its tile reads Resume (or it was a double tap): one run of a routine at a time in this slice.
  const had = openRuns(data).find((r) => r.routineId === routineId);
  if (had) return { ...resume(data, had.id, env), runId: had.id };
  // Nothing to run yet (P-90): its Plan is where the first step is added; no run is made at the edge.
  const first = s.items[0];
  if (!first) return refuse(data, 'empty');
  const busy = runningElsewhere(data);
  if (busy) return refuse(data, 'running', { running: busy });
  const run: Run = {
    id: env.id(),
    routineId,
    startedAt: env.now,
    ...(isWait(first) && { waitingSince: env.now }),
    frames: [{ seq: routineId, at: first.id, round: 1 }],
    changes: [],
    touchedAt: env.now,
  };
  return done(setStatus(putRun(data, run), run.id, 'running'), { runId: run.id });
}

/** One thing runs at a time: what is running, for a start that is refused because of it. */
function runningElsewhere(data: Data, but?: Id): { runId: Id; name: string } | undefined {
  const cur = currentRun(data);
  return cur && isRunning(data, cur) && cur.id !== but ? { runId: cur.id, name: readRoutine(data, cur.routineId)?.words ?? '' } : undefined;
}

/** A named routine in the lists with this name (one version per name). */
export const routineNamed = (data: Data, words: string, but?: Id): Seq | undefined => {
  const n = normalizeName(words);
  for (const id of Object.keys(data.routines)) {
    const s = readRoutine(data, id);
    if (s && s.named && !s.removedAt && s.id !== but && normalizeName(s.words) === n) return s;
  }
  return undefined;
};

/**
 * "New: <words>" (P-90, ruling 5): a first layer with an open edge, on home — the routine ONLY. No run
 * until Start is pressed in its Plan. A name there is (one version per name): that routine, nothing written.
 */
function create(data: Data, typed: string, env: Env): Result {
  const words = tidy(typed);
  if (!words) return refuse(data, 'empty');
  const same = routineNamed(data, words);
  if (same) return done(data, { routineId: same.id });
  const routine: Routine = { id: env.id(), words, named: true, createdAt: env.now, items: [], open: true, home: true };
  return done(putRoutine(data, routine), { routineId: routine.id });
}

/** Resume, and Plan's "Resume at <step>": running where it was, the mode gone. At the edge there is nothing to resume at. */
function resume(data: Data, runId: Id, env: Env): Result {
  const l = load(data, runId);
  if (typeof l === 'string') return refuse(data, l);
  if (!l.at.item) return refuse(data, 'asking');
  return done(setStatus(putRun(data, patched(l.raw, { touchedAt: env.now, mode: undefined })), runId, 'running'));
}

/** Plan (the runner's button, the paused screen's, a tile's). Already there with nothing to fold: nothing is written. */
function plan(data: Data, runId: Id, env: Env): Result {
  const l = load(data, runId);
  if (typeof l === 'string') return refuse(data, l);
  if (l.raw.status !== 'running' && !l.run.changes.length) return done(data);
  const { data: next, folded } = enterPlan(data, runId, env);
  return done(putRun(next, patched(own(next.runs, runId)!, { touchedAt: env.now })), { ...(folded !== undefined && { folded }) });
}

/**
 * Pause. P-101 (ruling 3): `why` is the Pause sheet's note, prefilled with the stored reason — kept as
 * typed but trimmed (one or more lines); blank takes the stored reason away. No `why` at all (a press
 * kept while reconnecting): the reason is left as it is.
 */
function pause(data: Data, runId: Id, why: string | undefined, env: Env): Result {
  const l = load(data, runId);
  if (typeof l === 'string') return refuse(data, l);
  const reason = text(why) ? why.trim() || undefined : l.raw.reason;
  return done(setStatus(putRun(data, patched(l.raw, { touchedAt: env.now, reason })), runId, 'paused'));
}

/** The reason edited in place: kept as typed (the field is bound to it); blank deletes it. Nothing else changes. */
function setReason(data: Data, runId: Id, typed: string): Result {
  const l = load(data, runId);
  if (typeof l === 'string') return refuse(data, l);
  const reason = text(typed) && typed.trim() ? typed : undefined;
  return done(reason === l.raw.reason ? data : putRun(data, patched(l.raw, { reason })));
}

/** P-101 amendment (ruling 9): Start over at `level`. Its place: `moved` (as Jump to the start of a level), then the values inside it go. */
function restart(data: Data, runId: Id, level: number, env: Env): Result {
  const l = load(data, runId);
  if (typeof l === 'string') return refuse(data, l);
  const was = l.at.frames;
  if (!Number.isInteger(level) || level < 0 || level >= was.length) return refuse(data, 'no-such-level');
  const s = view(data, l.run, was[level].seq)!;
  // (P-107: a for each from its first item.)
  // (F-1, storage F11: a record of parts this version cannot read is kept as it is, never written over.)
  const { each: _e, eachText: _t, eachSeen: _n, parts: _p, ...level_ } = was[level];
  const keepOwn = lockedParts(was[level]) ? { parts: was[level].parts } : {};
  // P-99: an In any order block's level from the start is its row, every part not taken up yet (the record goes).
  const { parts: _q, ...rowLevel } = was[level - 1] ?? was[level];
  const keepRow = lockedParts(was[level - 1] ?? was[level]) ? { parts: (was[level - 1] ?? was[level]).parts } : {};
  const frames: Frame[] = s.any && level > 0 ? [...was.slice(0, level - 1), { ...rowLevel, ...keepRow }] : [...was.slice(0, level), { ...level_, ...keepOwn, at: s.items[0]?.id ?? null, round: 1 }];
  const moved_ = moved(data, l, { frames, discard: true, fresh: true }, env);
  // Audit F4: the pause note is the person's own words, not a value given inside the level: it stays.
  const out = l.raw.reason === undefined ? moved_ : { ...moved_, data: putRun(moved_.data, patched(own(moved_.data.runs, runId)!, { reason: l.raw.reason })) };
  const raw = own(out.data.runs, runId)!;
  if (!Array.isArray(raw.values)) return out;
  // Inside it: every value of a routine entered at or above it; and, for a step broken down (part of the routine
  // below), what its own smaller steps gave.
  const scope = scopeLevel(data, l.run, was, level);
  const body = scope === level ? undefined : new Set(routineBody(data, l.run, was[level].seq).flatMap((b) => b.items.map((i) => i.id)));
  // P-107: a for each started over — what its rounds gave (collected below it, given by its row) goes too.
  const below = s.each && level > 0 ? scopeLevel(data, l.run, was, level - 1) : -1;
  // (P-108: but not the block's own list, given on its row: the for each goes through it again from its first item.)
  const ownKey = below >= 0 && s.each?.own ? nameKey(s.each.list) : undefined;
  const kept = raw.values.filter((v) => !isEntry(v) || (v.level < level && !(body && v.level === scope && body.has(v.item)) && !(v.level === below && v.item === was[level].from && nameKey(v.name) !== ownKey)));
  return kept.length === raw.values.length ? out : { ...out, data: putRun(out.data, patched(raw, { values: kept.length ? kept : undefined })) };
}

/** Home, after "Stop <name>?": no run is the one the app is on. The run stays exactly where it is. */
function home(data: Data, runId: Id): Result {
  return own(data.runs, runId) ? done(setStatus(data, undefined)) : refuse(data, 'gone');
}

function next(data: Data, runId: Id, env: Env, owed?: Given[]): Result {
  const l = load(data, runId);
  if (typeof l === 'string') return refuse(data, l);
  // P-98: what a row with insides owes, typed in the fields Next showed: given by the row, then Next as ever (one write).
  if (Array.isArray(owed) && owed.length && isRef(l.at.item) && !anyBlock(data, l.run, l.at.item) && !l.at.repaired && l.run.mode !== 'plan') {
    const item = l.at.item;
    const owes = owedBy(data, l.run, l.at.frames, item);
    const scope = scopeLevel(data, l.run, l.at.frames, l.at.frames.length - 1);
    const add: ValueEntry[] = [];
    for (const o of owed) {
      const name = owes.find((n) => isName(o?.name) && nameKey(n) === nameKey(o.name));
      if (!name || !text(o.text) || !o.text.trim() || add.some((a) => nameKey(a.name) === nameKey(name)) || visibleValue(data, l.run, nameKey(name), l.at.frames)) continue;
      // P-112: what a for each inside it gives, item by item — one list, in the order of its items.
      const each = Array.isArray(o.items) ? o.items.filter((x): x is string => text(x) && !!x.trim()).slice(0, MAX_ITEMS).map(capValue) : [];
      add.push({ name, items: each.length ? each : [capValue(o.text)], level: scope, seq: l.at.frames[scope].seq, item: item.id, words: wordsOf(data, l.run, item), at: env.now });
    }
    if (add.length) {
      const given = addValues(data, runId, add);
      const r = next(given, runId, env);
      return r.ok ? r : refuse(data, r.reason ?? 'cannot');
    }
  }
  if (l.at.item && l.run.mode === 'plan') return refuse(data, 'planning');
  // What is stored is not a place any more: the start of that level, and no further.
  if (l.at.repaired) return moved(data, l, { frames: l.at.frames }, env);
  if (l.at.frame.at === null) return refuse(data, 'asking');
  // P-108: Next on a for each that asked for its own list — into it, at its first item; with none given, past it.
  const own_ = ownBlock(data, l.run, l.at.item);
  if (own_ && own_.items.length && l.at.frames.length < MAX_DEPTH) {
    const into: Frame = { seq: own_.id, at: own_.items[0].id, round: 1, from: l.at.item!.id };
    const list = eachList(data, l.run, [...l.at.frames, into], l.at.frames.length);
    if (list.length) return moved(data, l, { frames: [...l.at.frames, { ...into, each: 0, eachText: list[0], eachSeen: list }] }, env);
  }
  const a = advance(data, l.run, l.at.frames);
  // P-99: on an In any order block's row, the step after it waits until every part has returned or been stopped.
  if (a.waiting) return refuse(data, 'parts');
  // P-96 (ruling 7): finishing ends the run — nothing next, open goal or not, never opens Plan.
  return a.ended || a.asking ? end(data, l, 'finished', env) : moved(data, l, a, env);
}

function doneWith(data: Data, runId: Id, env: Env, whole?: true, owed?: { name: string; text: string }[]): Result {
  const r = leaveLevel(data, runId, env, whole);
  if (!r.ok || whole || !Array.isArray(owed) || !owed.length || r.said?.kind === 'ended') return r;
  // P-98: Step out before what the level owes was given — what was typed for it, given by the row it was entered from.
  const l = load(data, runId);
  if (typeof l === 'string' || l.at.frames.length < 2) return r;
  const owes = stepOutOwes(data, l.run, l.at);
  const L = l.at.frames.length - 1;
  const below = l.at.frames.slice(0, L);
  const scope = scopeLevel(data, l.run, below, L - 1);
  const row = view(data, l.run, below[L - 1].seq)?.items.find((i) => i.id === l.at.frames[L].from);
  if (!row) return r;
  const after = readRun(r.data, runId)!;
  const add: ValueEntry[] = [];
  for (const o of owed) {
    const name = owes.find((n) => isName(o?.name) && nameKey(n) === nameKey(o.name));
    if (!name || !text(o.text) || !o.text.trim() || after.frames[scope]?.seq !== below[scope].seq) continue;
    if (after.values.some((v) => v.level === scope && v.seq === below[scope].seq && nameKey(v.name) === nameKey(name)) || add.some((a) => nameKey(a.name) === nameKey(name))) continue;
    add.push({ name, items: [capValue(o.text)], level: scope, seq: below[scope].seq, item: row.id, words: wordsOf(data, l.run, row), at: env.now });
  }
  return { ...r, data: addValues(r.data, runId, add) };
}

function leaveLevel(data: Data, runId: Id, env: Env, whole?: true): Result {
  const l = load(data, runId);
  if (typeof l === 'string') return refuse(data, l);
  // P-103: the whole run, from a paused tile — ended where it stands (its place and its pause note kept). Only a
  // paused run (audit F5): never the one running, never one resting on a wait (it is waited for, not put down).
  if (whole) {
    if (l.raw.status === 'running') return refuse(data, 'running');
    if (l.at.item && isWait(l.at.item)) return refuse(data, 'cannot');
    return end(data, l, 'done', env, true);
  }
  // Done exists only when running, and at the edge.
  if (l.at.item && l.run.mode === 'plan') return refuse(data, 'planning');
  // P-99: Step out on an In any order block's row leaves the block — the parts not returned are stopped (they cannot
  // outlive it) and what every part gave is joined — and the run goes on after it, on the first layer too.
  if (anyBlock(data, l.run, l.at.item)) {
    const a = advance(data, l.run, l.at.frames, { force: true });
    if (a.ended || a.asking) return end(data, l, 'finished', env);
    return moved(data, l, a, env, { kind: 'finished', names: [ANY_WORDS] });
  }
  if (l.at.frames.length === 1) return end(data, l, 'done', env);
  // The level is left, for whatever reason; the one below goes on from the item this was entered from.
  const below = l.at.frames.slice(0, -1);
  const child = l.at.frame;
  if (below[below.length - 1].at !== child.from) return moved(data, l, { frames: below, popped: [child] }, env);
  // (P-99: a part left by Step out is stopped; the block left from its own level stops the rest. F-1, engine #7: only the
  // part's own level — Step out of a call inside a part leaves the call; past the part's last step it finished.)
  const ownPart = !!view(data, l.run, below[below.length - 1].seq)?.any;
  const a = advance(data, l.run, below, { ...(ownPart && { how: 'stopped' as const }), force: true });
  if (a.ended || a.asking) return end(data, l, 'finished', env);
  return moved(data, l, { ...a, popped: [child, ...a.popped] }, env);
}

function stepIn(data: Data, runId: Id, env: Env): Result {
  const l = load(data, runId);
  if (typeof l === 'string') return refuse(data, l);
  if (inPlan(l)) return refuse(data, 'planning');
  const item = l.at.item;
  // P-99: Step in on an In any order block's row takes up a part — the one put down last, else the first not taken up.
  if (anyBlock(data, l.run, item)) {
    const level = l.at.frames.length - 1;
    const part = partToTakeUp(data, l.run, l.at.frames, level);
    return part ? takeUp(data, runId, level, part, env) : refuse(data, 'empty');
  }
  // P-108: a routine row whose routine is a value — into the routine it holds, as a call with nothing bound.
  if (slotOf(item)) {
    const held = heldBy(data, l.run, l.at.frames, item);
    if (!held || !('routine' in held)) return refuse(data, held && 'removed' in held ? 'gone' : 'not-a-routine');
    const t = view(data, l.run, held.routine)!;
    if (!t.items.length) return refuse(data, 'empty');
    if (l.at.frames.length >= MAX_DEPTH) return refuse(data, 'too-deep');
    // (A routine already open in this run is not stepped into again: the self-call is parked.)
    if (l.at.frames.some((f) => f.seq === t.id)) return refuse(data, 'self');
    const out = moved(data, l, { frames: [...l.at.frames, { seq: t.id, at: t.items[0].id, round: 1, from: item!.id }] }, env);
    return { ...out, data: addValues(out.data, runId, inputsFor(data, l.run, l.at.frames, { id: item!.id, ref: t.id }, env)) };
  }
  if (!isRef(item)) return refuse(data, 'not-a-routine');
  // P-98: a call to a routine that was removed says so and is not stepped into (one not there at all has nothing to step into).
  if (isRemovedCall(data, item) && readRoutine(data, item.ref)) return refuse(data, 'gone');
  const target = view(data, l.run, item.ref);
  if (!target?.items.length) return refuse(data, 'empty');
  if (l.at.frames.length >= MAX_DEPTH) return refuse(data, 'too-deep');
  // P-107: into a for each — at its first item; with nothing in its list there is nothing to step into.
  if (target.each) {
    const list = eachList(data, l.run, [...l.at.frames, { seq: target.id, at: null, round: 1, from: item.id }], l.at.frames.length);
    if (!list.length) return refuse(data, 'empty');
    return moved(data, l, { frames: [...l.at.frames, { seq: target.id, at: target.items[0].id, round: 1, from: item.id, each: 0, eachText: list[0], eachSeen: list }] }, env);
  }
  const frames = [...l.at.frames, { seq: target.id, at: target.items[0].id, round: 1, from: item.id }];
  const out = moved(data, l, { frames }, env);
  if (!target.named) return out;
  // P-98: its inputs, each the called routine's own copy (after the move: entering a level afresh starts it empty).
  const given = addValues(out.data, runId, inputsFor(data, l.run, l.at.frames, item, env));
  // F-1 (engine #3; "Back keeps it"): stepped into again after Back — what it handed back then is in its giving steps'
  // fields, to keep or change; leaving hands back anew in place of it.
  const gives = new Set(callIO(data, target.id).gives.map(nameKey));
  return { ...out, data: restoreShare(given, runId, frames, scopeLevel(data, l.run, l.at.frames, l.at.frames.length - 1), frames.length - 1, item.id, gives) };
}

function back(data: Data, runId: Id, env: Env): Result {
  const l = load(data, runId);
  if (typeof l === 'string') return refuse(data, l);
  if (inPlan(l)) return refuse(data, 'planning');
  // P-99: Back from a part, at the block's level — to the block's row, the part put down where it is (its place, its values).
  // (From the first step of a part broken down, too.)
  const up = backUp(data, l.run);
  if (up && lockedParts(l.at.frames[up.level])) return refuse(data, 'cannot');
  if (up) return moved(data, l, { frames: l.at.frames.slice(0, up.level + 1) }, env);
  const p = previous(data, l.run);
  if (!p) return refuse(data, 'nothing-before');
  const frames = intoLast(data, l.run, [...l.at.frames.slice(0, -1), { ...l.at.frame, at: p.at, round: p.round, ...(p.each !== undefined && { each: p.each, eachText: p.eachText }) }]);
  const out = moved(data, l, { frames }, env);
  // (F-1, engine #3: onto an In any order block's row from the step after it — each part is put down with what it gave.)
  return { ...out, data: restoreParts(out.data, runId, frames.length - 1, env) };
}

/**
 * F-1 (engine #3; "Back keeps it"): Back onto an In any order block's row from the step after it — each part that gave
 * something is put down at its first step with what it gave (its share of the join), to keep or change; passing the
 * block again joins anew in place of it. A level holding a record of its parts already (or one this version cannot read)
 * is left as it is.
 */
function restoreParts(data: Data, runId: Id, level: number, env: Env): Data {
  const raw = own(data.runs, runId)!;
  const run = readRun(data, runId)!;
  const frames = place(data, run)?.frames;
  const f = frames?.[level];
  const row = f ? view(data, run, f.seq)?.items.find((i) => i.id === f.at) : undefined;
  const block = anyBlock(data, run, row);
  if (!frames || !f || !row || !block || f.parts !== undefined || !Array.isArray(raw.values)) return data;
  const b = scopeLevel(data, run, frames, level);
  const list: Part[] = [];
  for (const part of block.items) {
    const gave = sharesAt(raw.values, frames[b].seq, b, level + 1, block.id, partKey(row.id, part.id));
    if (!gave.length) continue;
    const inner = isRef(part) ? view(data, run, part.ref) : undefined;
    const into = inner && !inner.named && !inner.any && !inner.each && inner.items.length && level + 3 <= MAX_DEPTH ? inner : undefined;
    list.push({ item: part.id, touchedAt: env.now, frames: [{ seq: block.id, at: part.id, round: 1, from: row.id }, ...(into ? [{ seq: into.id, at: into.items[0].id, round: 1, from: part.id }] : [])], values: gave });
  }
  if (!list.length) return data;
  const out = [...run.frames];
  out[level] = { ...out[level], parts: readable({ row: row.id, list }) };
  return putRun(data, patched(raw, { frames: out }));
}

function jump(data: Data, runId: Id, to: JumpTo, env: Env): Result {
  const l = load(data, runId);
  if (typeof l === 'string') return refuse(data, l);
  const was = l.at.frames;
  let frames: Frame[] = [];
  if ('level' in to) {
    // The start of a level: its first item, round one; this run's changes stay.
    if (!Number.isInteger(to.level) || to.level < 0 || to.level >= was.length) return refuse(data, 'no-such-level');
    const s = view(data, l.run, was[to.level].seq)!;
    // P-99: the start of an In any order block's level is its row (choosing); its parts keep their places.
    const { parts: _p, ...lv } = was[to.level];
    const first = s.items[0]?.id ?? null;
    frames = s.any && to.level > 0 ? was.slice(0, to.level) : [...was.slice(0, to.level), { ...(partsOf(was[to.level]) && was[to.level].at !== first ? lv : was[to.level]), at: first, round: 1 }];
  } else {
    if (!Array.isArray(to.path) || !to.path.length || to.path.length > MAX_DEPTH) return refuse(data, 'no-such-step');
    let seqId: Id | undefined = l.run.routineId;
    let same = true;
    for (const [i, id] of to.path.entries()) {
      const s: Seq | undefined = seqId === undefined ? undefined : view(data, l.run, seqId);
      const item: Item | undefined = s?.items.find((it) => it.id === id);
      if (!s || !item) return refuse(data, 'no-such-step');
      // A level the run is already in keeps its round; one entered by the jump starts at round 1.
      same = same && was[i]?.seq === s.id;
      // (P-107: and a for each level the run is in, its item.)
      // (F-1, storage F6: a level it stays in keeps the fields this version does not know, as every other move does.)
      const { seq: _s, at: _a, round: _r, from: _f, each: _e, eachText: _t, eachSeen: _n, parts: _p, ...rest } = same ? was[i] : ({} as Frame);
      frames.push({ ...rest, seq: s.id, at: id, round: same ? was[i].round : 1, ...(i > 0 && { from: to.path[i - 1] }), ...(same && was[i].each !== undefined && { each: was[i].each, ...(was[i].eachText !== undefined && { eachText: was[i].eachText }), ...(was[i].eachSeen !== undefined && { eachSeen: was[i].eachSeen }) }), ...(same && was[i].parts && (partsOf(was[i]) ? was[i].at === id : true) && { parts: was[i].parts }) });
      seqId = isRef(item) ? item.ref : undefined;
    }
  }
  // P-99: into a part of an In any order block other than the one the run is in — that one is put down (`moved`), and
  // this one's record gives up its place and its values (the jump's place is its place now; its values settle on it).
  const into = frames.findIndex((f, i) => i + 1 < frames.length && !!anyBlock(data, l.run, view(data, l.run, f.seq)?.items.find((x) => x.id === f.at)) && activePart(data, l.run, frames, i) !== activePart(data, l.run, was, i) && was[i]?.at === f.at);
  const target = into >= 0 ? activePart(data, l.run, frames, into) : undefined;
  let out = moved(data, l, { frames, discard: true }, env, { kind: 'jumped', from: wordsOf(data, l.run, l.at.item) });
  if (target !== undefined) out = { ...out, data: tookUp(out.data, runId, into, partsOf(frames[into])?.list.find((p) => p.item === target), target, env) };
  // F-1 (engine #2): what the Jump dropped — a block's parts, a round left behind, back past it — is said, with its Undo.
  const after = heldNames(out.data, runId);
  const gone = [...heldNames(data, runId)].filter(([k]) => !after.has(k)).map(([, name]) => name);
  if (gone.length) out = { ...out, cleared: gone };
  // Onto nothing (the start of a routine with no steps): that is the edge, and `moved` left it in Plan.
  if (!place(out.data, readRun(out.data, runId)!)?.item) return out;
  // From the paused screen, and from Plan, too: the runner opens at the new place (a running run has no mode).
  const raw = own(out.data.runs, runId)!;
  return { ...out, data: setStatus('mode' in raw ? putRun(out.data, patched(raw, { mode: undefined })) : out.data, runId, 'running') };
}

/** The items of a routine with one of them changed, added or taken out; what could not be read stays where it was. */
function editItems(routine: Routine, s: Seq, edit: { set?: [Id, unknown]; remove?: Id; insert?: [Item, Id | null | undefined] }): Routine | undefined {
  const raw = [...rawItems(routine)];
  const index = (id: Id) => raw.indexOf(s.items.find((i) => i.id === id));
  let from = s.repeatFrom;
  if (edit.set) {
    const at = index(edit.set[0]);
    if (at < 0) return undefined;
    raw[at] = edit.set[1];
  }
  if (edit.remove !== undefined) {
    const at = index(edit.remove);
    if (at < 0) return undefined;
    raw.splice(at, 1);
    from = dividerAfterRemove(from, s.items.findIndex((i) => i.id === edit.remove), s.items.length - 1);
  }
  if (edit.insert) {
    const [item, after] = edit.insert;
    const found = typeof after === 'string' ? s.items.findIndex((i) => i.id === after) : -1;
    // After a step that is gone: at the end (keeping an addition whose neighbour was removed).
    const at = after === null ? 0 : found < 0 ? s.items.length : found + 1;
    raw.splice(at >= s.items.length ? raw.length : raw.indexOf(s.items[at]), 0, item);
    from = dividerAfterInsert(from, at);
  }
  return patched(routine, { items: raw, repeatFrom: from });
}

/**
 * The fold (P-90, ruling 3): every this-run change a run still carries from the build before becomes
 * the routine's — each sequence it changed is written as the run READS it (its steps, their order and
 * words, where the divider stands, the number), so the run reads exactly what it read before. A change
 * whose step is no longer there changed nothing in that reading and just goes; one this version cannot
 * read stays in the run, untouched; so does whatever the routine holds that cannot be read. A sequence
 * a step was broken into stops being the run's own. The caller resettles.
 */
function fold(data: Data, runId: Id): Data {
  const raw = own(data.runs, runId)!;
  const run = readRun(data, runId)!;
  let next = data;
  for (const seqId of new Set(run.changes.map((c) => c.seq))) {
    const routine = own(data.routines, seqId);
    const base = readRoutine(data, seqId);
    const seen = view(data, run, seqId);
    if (!routine || !base || !seen || seen === base) continue;
    const patch: Record<string, unknown> = {};
    if (seen.items.length !== base.items.length || seen.items.some((item, i) => item !== base.items[i])) {
      // What could not be read keeps its place: right after the step it followed (at the end if that step is gone).
      const read = new Set<unknown>(base.items);
      const strays = new Map<Id | null, unknown[]>();
      let last: Id | null = null;
      for (const entry of rawItems(routine)) {
        if (read.has(entry)) last = (entry as Item).id;
        else strays.set(last, [...(strays.get(last) ?? []), entry]);
      }
      const items: unknown[] = [...(strays.get(null) ?? [])];
      strays.delete(null);
      // A breakdown whose sequence is not there (damage): the step keeps its own words rather than point at nothing.
      const lost = new Set(run.changes.filter((c) => c.kind === 'breakdown' && c.seq === seqId && !own(data.routines, c.into)).map((c) => (c as { item: Id }).item));
      for (const item of seen.items) {
        items.push((lost.has(item.id) && base.items.find((i) => i.id === item.id)) || item, ...(strays.get(item.id) ?? []));
        strays.delete(item.id);
      }
      for (const left of strays.values()) items.push(...left);
      patch.items = items;
    }
    if (seen.repeatFrom !== base.repeatFrom) patch.repeatFrom = seen.repeatFrom;
    if (seen.repeat !== base.repeat) patch.repeat = seen.repeat;
    if (Object.keys(patch).length) next = putRoutine(next, patched(routine, patch));
  }
  for (const c of run.changes) {
    if (c.kind !== 'breakdown') continue;
    const item = view(data, run, c.seq)?.items.find((i) => i.id === c.item);
    const into = own(next.routines, c.into);
    // Part of the routine now, no longer this run's own.
    if (into && 'ownerRunId' in into && isRef(item) && item.ref === c.into) next = putRoutine(next, patched(into, { ownerRunId: undefined }));
  }
  return putRun(next, patched(raw, { changes: rawChanges(raw).filter((c) => !isChange(c)) }));
}

/**
 * After an edit to a routine (or the fold): every open run still stands on something. A run on a step
 * that is gone moves to the next surviving step, else the previous, else it asks; it is never ended
 * and never starts a round; whatever it was inside of that step goes with the step. A run asking at
 * the edge moves to a step appended there. Waiting-since follows the new place. A run the edit took
 * to the edge, or off it, is in Plan as stored (never running there; off it, Resume is a tap of its
 * own). Runs the edit did not strand are left as the same objects.
 */
function resettle(before: Data, after: Data, env: Env): Data {
  let data = after;
  for (const id of Object.keys(after.runs)) {
    const run = readRun(after, id);
    if (!isOpen(run)) continue;
    const was = readRun(before, id);
    const wasAt = was && place(before, was);
    let frames: Frame[] | undefined;
    if (run.frames[0]?.seq === run.routineId) {
      const kept: Frame[] = [];
      let moved_ = false;
      for (const [i, f] of run.frames.entries()) {
        const s = view(after, run, f.seq);
        if (!s) break;
        const old = was && view(before, was, f.seq);
        let at = f.at;
        if (at !== null && !s.items.some((x) => x.id === at)) {
          const gone = old ? old.items.findIndex((x) => x.id === at) : -1;
          const alive = (x: Item) => s.items.some((y) => y.id === x.id);
          at = gone < 0 ? (s.items[0]?.id ?? null) : ((old!.items.slice(gone + 1).find(alive) ?? old!.items.slice(0, gone).reverse().find(alive))?.id ?? null);
        } else if (at === null && i === 0 && run.frames.length === 1 && old && s !== old) {
          // It was asking for exactly this: a step appended at the end.
          const last = s.items[s.items.length - 1];
          if (last && !old.items.some((x) => x.id === last.id)) at = last.id;
        }
        if (at !== f.at) moved_ = true;
        // An inner level with nothing left in it is left: the run is on the step it was entered from.
        if (at === null && i > 0) break;
        kept.push(at === f.at ? f : { ...f, at });
        // The step this level stood on is gone, and with it whatever was entered from it: the run
        // stands on the step it was moved to, never inside the removed one (P-90, ruling 6).
        if (at !== f.at) break;
      }
      if (moved_ || kept.length !== run.frames.length) frames = kept;
    }
    if (frames) data = putRun(data, patched(own(data.runs, id)!, { frames }));
    // F-1 (engine #5; owner: "A Plan edit never clears a run's values"): the levels the edit took the run out of — a for
    // each or an In any order block it was inside, removed — collect and join what was given in them, as Step out does,
    // read through the routines as they were. Given by the row removed, they are held (its step is gone, not below).
    // (A call removed still takes its level's values with it: values.test.ts row "removing a step the run is inside"
    // pins that, against the owner's ruling — left for the owner, see .polish/current/F-1/build.md.)
    if (frames && was && frames.length < was.frames.length) {
      let then: Data = { ...before, runs: { ...before.runs, [id]: own(data.runs, id)! } };
      for (let level = was.frames.length - 1; level >= frames.length; level--) if (view(then, readRun(then, id)!, was.frames[level].seq)?.each) then = collectRound(then, id, was.frames, level, env);
      then = settleParts(then, id, was.frames, undefined, env, false);
      const r = own(then.runs, id)!;
      data = putRun(data, patched(own(data.runs, id)!, { values: r.values, frames: r.frames }));
    }
    let now = place(data, readRun(data, id)!);
    if (now?.repaired) {
      data = putRun(data, patched(own(data.runs, id)!, { frames: now.frames }));
      now = place(data, readRun(data, id)!);
    }
    if (wasAt && now && !wasAt.item !== !now.item) data = markPlan(data, id);
    data = settleWait(data, id, wasAt, env);
    if (was) data = settleValues(data, id, was.frames);
  }
  return data;
}

/**
 * Plan's edits (P-90): each changes the routine, and every open run is kept standing in the same
 * write, so one Undo covers the routine and the runs together.
 */
export function editRoutine(data: Data, routineId: Id, edit: RoutineEdit, env: Env): Result {
  // A drag (P-95): one row at a time, as Move up / Move down would, in one result.
  if (edit.kind === 'move' && edit.by !== 1 && edit.by !== -1) {
    const n = Math.trunc(Math.abs(edit.by));
    if (!Number.isFinite(edit.by) || n === 0) return refuse(data, 'cannot');
    let r: Result = done(data);
    for (let i = 0; i < n; i++) {
      r = editRoutine(r.data, routineId, { kind: 'move', item: edit.item, by: edit.by < 0 ? -1 : 1 }, env);
      if (!r.ok) return refuse(data, r.reason ?? 'cannot');
    }
    return r;
  }
  const routine = own(data.routines, routineId);
  const s = readRoutine(data, routineId);
  if (!routine || !s || s.removedAt) return refuse(data, 'gone');
  const has = (id: Id) => s.items.some((i) => i.id === id);
  // P-99: a block's parts are steps, or steps broken down.
  if (s.any && ['addWait', 'addCall', 'addEach', 'addSlot', 'addAny', 'toCall', 'toWait', 'divider', 'repeat', 'rename', 'keptList'].includes(edit.kind)) return refuse(data, 'cannot');
  let after: Routine | undefined;
  /** P-103: the named routines this edit leaves nothing using — each gets its tile on home, in the same write. */
  let freed: Routine[] = [];
  if (edit.kind === 'addStep' || edit.kind === 'addWait') {
    const words = tidy(edit.kind === 'addStep' ? edit.text : edit.wait);
    if (!words) return refuse(data, 'empty');
    if (typeof edit.after === 'string' && !has(edit.after)) return refuse(data, 'no-such-step');
    after = editItems(routine, s, { insert: [edit.kind === 'addStep' ? { id: env.id(), text: words } : { id: env.id(), wait: words }, edit.after] });
  } else if (edit.kind === 'addCall') {
    const t = typeof edit.routine === 'string' ? readRoutine(data, edit.routine) : undefined;
    if (!t || t.removedAt) return refuse(data, 'gone');
    if (!t.named) return refuse(data, 'cannot');
    // The self-call is parked (B-16): never this routine, nor one that uses it, at any depth.
    if (reaches(data, t.id, ownersOf(data, routineId))) return refuse(data, 'self');
    if (typeof edit.after === 'string' && !has(edit.after)) return refuse(data, 'no-such-step');
    after = editItems(routine, s, { insert: [{ id: env.id(), ref: t.id, words: t.words } as Item, edit.after] });
  } else if (edit.kind === 'toCall') {
    const item = s.items.find((i) => i.id === edit.item);
    if (!item) return refuse(data, 'no-such-step');
    if (!isStep(item) || slotOf(item) || outOf(item)) return refuse(data, 'not-a-step');
    const t = typeof edit.routine === 'string' ? readRoutine(data, edit.routine) : undefined;
    if (!t || t.removedAt) return refuse(data, 'gone');
    if (!t.named) return refuse(data, 'cannot');
    if (reaches(data, t.id, ownersOf(data, routineId))) return refuse(data, 'self');
    const keep = edit.words === undefined ? '' : tidy(edit.words);
    if (keep) {
      const first = editItems(routine, s, { set: [item.id, reworded(item, keep)] });
      const s1 = first && readRoutine(putRoutine(data, first), routineId);
      after = first && s1 ? editItems(first, s1, { insert: [{ id: env.id(), ref: t.id, words: t.words } as Item, item.id] }) : undefined;
    } else {
      // (The same id: a run standing on it stays on it. Fields this version does not know stay on it.)
      const { text: _words, ...rest } = item;
      after = editItems(routine, s, { set: [item.id, { ...rest, ref: t.id, words: t.words } as Item] });
    }
  } else if (edit.kind === 'addEach') {
    const each = eachField({ item: edit.item, list: edit.list });
    if (!each || (edit.own !== undefined && edit.own !== 'asked' && edit.own !== 'kept')) return refuse(data, 'cannot');
    if (typeof edit.after === 'string' && !has(edit.after)) return refuse(data, 'no-such-step');
    // P-108: a list of its own — a name the routine does not give or read already (it is the block's, local to it).
    if (edit.own && [...ownersOf(data, routineId)].some((id) => renameUses(data, id).has(nameKey(each.list)))) return refuse(data, 'same-name');
    const header = edit.own === 'kept' ? { ...each, kept: [] } : edit.own === 'asked' ? { ...each, own: true } : each;
    // An unnamed sequence (an older build reads it as a step broken down), its words the sentence, no steps yet.
    const into: Routine = { id: env.id(), words: eachWords(each), named: false, createdAt: env.now, items: [], each: header };
    const row = editItems(routine, s, { insert: [{ id: env.id(), ref: into.id }, edit.after] });
    if (!row) return refuse(data, 'cannot');
    return done(resettle(data, putRoutine(putRoutine(data, into), row), env));
  } else if (edit.kind === 'addAny') {
    if (typeof edit.after === 'string' && !has(edit.after)) return refuse(data, 'no-such-step');
    const parts = (Array.isArray(edit.parts) ? edit.parts : []).map(tidy).filter(Boolean);
    // An unnamed sequence (an older build reads it as a step broken down, "In any order"), its parts its items.
    const into: Routine = { id: env.id(), words: ANY_WORDS, named: false, createdAt: env.now, items: parts.map((text) => ({ id: env.id(), text })), any: true };
    const row = editItems(routine, s, { insert: [{ id: env.id(), ref: into.id }, edit.after] });
    if (!row) return refuse(data, 'cannot');
    return done(resettle(data, putRoutine(putRoutine(data, into), row), env));
  } else if (edit.kind === 'keptList') {
    const r = setKept(data, routineId, edit.items, edit.refs);
    return r.ok && r.data !== data ? done(resettle(data, r.data, env)) : r;
  } else if (edit.kind === 'addSlot') {
    if (!isName(edit.name)) return refuse(data, 'cannot');
    if (typeof edit.after === 'string' && !has(edit.after)) return refuse(data, 'no-such-step');
    after = editItems(routine, s, { insert: [{ id: env.id(), text: `{${tidyName(edit.name)}}`, slot: true } as Item, edit.after] });
  } else if (edit.kind === 'bind') {
    const item = s.items.find((i) => i.id === edit.item);
    if (!item) return refuse(data, 'no-such-step');
    if (!isCall(data, item)) return refuse(data, 'not-a-routine');
    if (!isName(edit.input)) return refuse(data, 'cannot');
    const raw = (item as { with?: unknown }).with;
    // What this version cannot read is never written over.
    if (raw !== undefined && !Array.isArray(raw)) return refuse(data, 'cannot');
    const input = tidyName(edit.input);
    const key = nameKey(input);
    const to = edit.to;
    let binding: Binding | undefined;
    if (to && 'typed' in to) {
      if (!text(to.typed) || !to.typed.trim()) return refuse(data, 'empty');
      binding = { input, typed: capValue(to.typed) };
    } else if (to && 'name' in to) {
      if (!isName(to.name)) return refuse(data, 'cannot');
      // "with {x}": the same name, by name — nothing to keep.
      binding = nameKey(to.name) === key ? undefined : { input, name: tidyName(to.name) };
    } else if (to && 'ask' in to) {
      if (to.ask !== true) return refuse(data, 'cannot');
      binding = { input, ask: true };
    } else if (to !== undefined) return refuse(data, 'cannot');
    const had = Array.isArray(raw) ? raw : [];
    const kept = had.filter((b) => !(isObject(b) && isName(b.input) && nameKey(b.input) === key));
    const withs = binding ? [...kept, binding] : kept;
    if (JSON.stringify(withs) === JSON.stringify(had)) return done(data);
    after = editItems(routine, s, { set: [item.id, patched(item, { with: withs.length ? withs : undefined })] });
  } else if (edit.kind === 'copy') {
    return copyRoutine(data, routine, s, edit.words, env);
  } else if (edit.kind === 'remove') {
    if (!has(edit.item)) return refuse(data, 'no-such-step');
    after = editItems(routine, s, { remove: edit.item });
    const item = s.items.find((i) => i.id === edit.item)!;
    // (A step broken down is the row's own, and goes with it — so does what it used.)
    freed = isRef(item) ? strandedBy(data, ownedFrom(data, item.ref, readRoutine(data, item.ref)?.named === false), { routineId, itemId: item.id }) : [];
  } else if (edit.kind === 'reword') {
    const item = s.items.find((i) => i.id === edit.item);
    if (!item) return refuse(data, 'no-such-step');
    if (isRef(item)) return refuse(data, 'cannot');
    const words = tidy(edit.text);
    if (!words) return refuse(data, 'empty');
    after = editItems(routine, s, { set: [item.id, reworded(item, words)] });
  } else if (edit.kind === 'move') {
    const at = s.items.findIndex((i) => i.id === edit.item);
    const to = at + (edit.by === 1 ? 1 : -1);
    if (at < 0) return refuse(data, 'no-such-step');
    // One press moves one row, and in the list the divider is a row (the orchestrator's ruling on
    // ruling 7). Next to the divider the step passes it and NOTHING else moves: it changes side, no
    // step changes place. With nothing left to repeat there is no divider.
    const from = s.repeatFrom;
    if (from !== undefined && (edit.by === 1 ? from === at + 1 : from === at)) {
      const moved = edit.by === 1 ? from - 1 : from + 1;
      after = patched(routine, { repeatFrom: moved < s.items.length ? moved : undefined });
    } else {
      if (to < 0 || to >= s.items.length) return refuse(data, 'cannot');
      const raw = [...rawItems(routine)];
      const [a, b] = [raw.indexOf(s.items[at]), raw.indexOf(s.items[to])];
      [raw[a], raw[b]] = [raw[b], raw[a]];
      after = patched(routine, { items: raw });
    }
  } else if (edit.kind === 'toWait' || edit.kind === 'toStep') {
    const item = s.items.find((i) => i.id === edit.item);
    if (!item) return refuse(data, 'no-such-step');
    // The same item under the same id (fields this version does not know stay on it): only what it is changes.
    if (edit.kind === 'toWait') {
      if (!isStep(item)) return refuse(data, 'not-a-step');
      const { text: words, ...rest } = item;
      after = editItems(routine, s, { set: [item.id, { ...rest, wait: words }] });
    } else {
      if (!isWait(item)) return refuse(data, 'cannot');
      const { wait: words, ...rest } = item;
      after = editItems(routine, s, { set: [item.id, { ...rest, text: words }] });
    }
  } else if (edit.kind === 'breakDown') {
    return breakDown(data, routine, s, edit.item, edit.steps, env);
  } else if (edit.kind === 'gives') {
    const item = s.items.find((i) => i.id === edit.item);
    if (!item) return refuse(data, 'no-such-step');
    if (!isStep(item) || slotOf(item)) return refuse(data, 'not-a-step');
    if (edit.name !== undefined && !isName(edit.name)) return refuse(data, String(edit.name).trim() ? 'cannot' : 'empty');
    const name = edit.name === undefined ? undefined : tidyName(edit.name);
    const { out: had, ...rest } = item as Item & { out?: unknown };
    if (had === name) return done(data);
    after = editItems(routine, s, { set: [item.id, name === undefined ? rest : { ...rest, out: name }] });
  } else if (edit.kind === 'renameValue') {
    return renameValue(data, routineId, edit.from, edit.to, env);
  } else if (edit.kind === 'tags') {
    // P-97 audit F4: what this version cannot read is never overwritten.
    if (!tagsWritable(routine.tags)) return refuse(data, 'cannot');
    const tags = tagsOf(edit.tags);
    const had = Array.isArray(routine.tags) ? routine.tags : undefined;
    if (had ? had.length === tags.length && had.every((t, i) => t === tags[i]) : !tags.length) return done(data);
    after = patched(routine, { tags: tags.length ? tags : undefined });
  } else if (edit.kind === 'addPlace' || edit.kind === 'changePlace' || edit.kind === 'movePlace' || edit.kind === 'removePlace') {
    if (!s.named || !placesWritable(routine.places)) return refuse(data, 'cannot');
    const list = [...((routine.places as Record<string, unknown>[] | undefined) ?? [])];
    const at = edit.kind === 'addPlace' ? -1 : list.findIndex((p) => p.id === edit.place);
    if (edit.kind !== 'addPlace' && at < 0) return refuse(data, 'gone');
    if (edit.kind === 'addPlace' || edit.kind === 'changePlace') {
      const name = tidyPlaceText(String(edit.name ?? ''));
      const where = tidyPlaceText(String(edit.where ?? ''));
      if (!name || !where) return refuse(data, 'empty');
      if (edit.kind === 'addPlace') list.push({ id: env.id(), name, where });
      else if (list[at].name === name && list[at].where === where) return done(data);
      else list[at] = { ...list[at], name, where };
    } else if (edit.kind === 'movePlace') {
      const to = at + (edit.by === 1 ? 1 : -1);
      if (to < 0 || to >= list.length) return refuse(data, 'cannot');
      [list[at], list[to]] = [list[to], list[at]];
    } else list.splice(at, 1);
    after = patched(routine, { places: list.length ? list : undefined });
  } else if (edit.kind === 'divider') {
    if (edit.from !== undefined && dividerAt(edit.from, s.items.length) === undefined) return refuse(data, 'cannot');
    after = patched(routine, { repeatFrom: edit.from });
  } else if (edit.kind === 'repeat') {
    if (edit.times !== undefined && countOf(edit.times) === undefined) return refuse(data, 'cannot');
    after = patched(routine, { repeat: edit.times });
  } else if (edit.kind === 'open') after = patched(routine, { open: edit.open ? true : undefined });
  else if (edit.kind === 'rename') {
    const words = tidy(edit.words);
    if (!words) return refuse(data, 'empty');
    if (s.named && routineNamed(data, words, routineId)) return refuse(data, 'same-name');
    after = patched(routine, { words });
  } else {
    // Out of the lists. A run of it is ended or kept first (the confirm that reaches open runs is a later slice).
    if (openRuns(data).some((r) => r.routineId === routineId)) return refuse(data, 'has-run');
    after = patched(routine, { removedAt: env.now });
    // P-103: what only this routine (and its steps broken down) used is not left unreachable.
    freed = strandedBy(data, ownedFrom(data, routineId, true));
  }
  if (!after) return refuse(data, 'cannot');
  const next = putRoutine(data, after);
  return done(resettle(data, freed.reduce((d, r) => putRoutine(d, patched(r, { home: true })), next), env));
}

/**
 * P-103 (audit F-7): what goes with a removal — `id` itself when `own` (the routine removed, or a step broken
 * down), and every unnamed sequence (step broken down) inside what goes — and the named routines it uses.
 */
function ownedFrom(data: Data, id: Id, own: boolean): { gone: Set<Id>; used: Set<Id> } {
  const gone = new Set<Id>();
  const used = new Set<Id>();
  if (!own) {
    used.add(id);
    return { gone, used };
  }
  const walk = (seq: Id) => {
    if (gone.has(seq)) return;
    gone.add(seq);
    for (const i of readRoutine(data, seq)?.items ?? []) {
      if (!isRef(i)) continue;
      if (readRoutine(data, i.ref)?.named === false) walk(i.ref);
      else used.add(i.ref);
    }
  };
  walk(id);
  return { gone, used };
}

/**
 * P-103 (audit F-7): the routines a removal leaves unreachable — named, not on home, not removed, and used by
 * nothing that stays (`row`: the one row being removed). Without a tile nothing could reach them again.
 */
function strandedBy(data: Data, what: { gone: Set<Id>; used: Set<Id> }, row?: { routineId: Id; itemId: Id }): Routine[] {
  const out: Routine[] = [];
  for (const ref of what.used) {
    const target = own(data.routines, ref);
    const t = readRoutine(data, ref);
    if (!target || !t || !t.named || t.home || t.removedAt || t.ownerRunId || what.gone.has(ref)) continue;
    const stillUsed = Object.keys(data.routines).some((id) => {
      const other = readRoutine(data, id);
      if (!other || other.removedAt || what.gone.has(id)) return false;
      return other.items.some((i) => isRef(i) && i.ref === ref && !(row && id === row.routineId && i.id === row.itemId));
    });
    if (!stillUsed) out.push(target);
  }
  return out;
}

/**
 * P-98: Copy — a new named routine with this one's name changed and everything else as it is: its steps (each
 * a new id), its steps broken down (each a copy of its own, so changing one never changes the other), what it
 * calls (the same routines), its divider, number, tags and fields this version does not know. Nothing of its
 * runs. Refused `same-name` for a name in use, `empty` for none.
 */
function copyRoutine(data: Data, routine: Routine, s: Seq, typed: string, env: Env): Result {
  if (!s.named) return refuse(data, 'cannot');
  const words = tidy(typed);
  if (!words) return refuse(data, 'empty');
  if (routineNamed(data, words)) return refuse(data, 'same-name');
  let next = data;
  // (F-1, engine #9: a breakdown two rows share — only an import or an older build makes one — is copied once, and both
  // rows of the copy hold the copy.)
  const made = new Map<Id, Id>();
  const dup = (r: Routine, sq: Seq, patch: Record<string, unknown>, id: Id = env.id()): Routine => {
    const read = new Set<unknown>(sq.items);
    const items = rawItems(r).map((raw) => {
      if (!read.has(raw)) return raw;
      const i = raw as Item;
      const inner = isRef(i) ? readRoutine(data, i.ref) : undefined;
      if (isRef(i) && inner && !inner.named && made.has(i.ref)) return { ...i, id: env.id(), ref: made.get(i.ref)! };
      if (isRef(i) && inner && !inner.named) {
        const copyId = env.id();
        made.set(i.ref, copyId);
        const c = dup(own(data.routines, i.ref)!, inner, { createdAt: env.now, ownerRunId: undefined, removedAt: undefined }, copyId);
        next = putRoutine(next, c);
        return { ...i, id: env.id(), ref: c.id };
      }
      return { ...i, id: env.id() };
    });
    return patched({ ...r, id, items }, patch);
  };
  const copy = dup(routine, s, { words, createdAt: env.now, removedAt: undefined, ownerRunId: undefined, home: true });
  return done(putRoutine(next, copy), { routineId: copy.id });
}

/**
 * Break it down, in Plan: the plain step becomes an unnamed sequence named by its words — the kind of
 * record a kept breakdown always was (not owned by any run) — under the SAME item id, so every place
 * stays valid. A run standing exactly on that step stands on the first small step, in the same write;
 * a run anywhere else is not moved.
 */
function breakDown(data: Data, routine: Routine, s: Seq, itemId: Id, steps: string[], env: Env): Result {
  const item = s.items.find((i) => i.id === itemId);
  if (!item) return refuse(data, 'no-such-step');
  if (!isStep(item) || slotOf(item)) return refuse(data, 'not-a-step');
  // P-96 (scout row 20): a step that gives a name is not broken down — the runner never rests on a routine row, so its value would vanish.
  if (outOf(item)) return refuse(data, 'cannot');
  const lines = (Array.isArray(steps) ? steps : []).map(tidy).filter(Boolean);
  if (!lines.length) return refuse(data, 'no-steps');
  const into: Routine = { id: env.id(), words: item.text, named: false, createdAt: env.now, items: lines.map((line) => ({ id: env.id(), text: line })) };
  const { text: _words, ...rest } = item;
  const after = editItems(routine, s, { set: [item.id, { ...rest, ref: into.id }] });
  if (!after) return refuse(data, 'cannot');
  let next = resettle(data, putRoutine(putRoutine(data, into), after), env);
  for (const id of Object.keys(next.runs)) {
    const run = readRun(next, id);
    const at = isOpen(run) ? place(next, run) : undefined;
    if (!at || at.frame.seq !== s.id || !isRef(at.item) || at.item.id !== item.id || at.item.ref !== into.id || at.frames.length >= MAX_DEPTH) continue;
    const frames = [...at.frames, { seq: into.id, at: (into.items as Item[])[0].id, round: 1, from: item.id }];
    next = settleValues(settleWait(putRun(next, patched(own(next.runs, id)!, { frames })), id, at, env), id, run!.frames);
  }
  return done(next);
}

/** The names a routine (and its smaller steps) gives, reads, binds or goes through — its names. */
function renameUses(data: Data, routineId: Id): Set<string> {
  const body = bodyOf((id) => readRoutine(data, id), routineId);
  const uses = new Set<string>();
  for (const s of body)
    for (const i of s.items) {
      const o = outOf(i);
      if (o) uses.add(nameKey(o));
      if (!isRef(i)) for (const n of namesIn(isWait(i) ? i.wait : i.text)) uses.add(n.key);
      // P-98: a name a call here is bound to, or hands back, is this routine's too.
      for (const b of bindingsOf(i)) if ('name' in b) uses.add(nameKey(b.name));
      if (isRef(i) && isLiveCall(data, i)) for (const g of callIO(data, i.ref).gives) uses.add(nameKey(g));
    }
  // P-107: a for each block's item and list are names of this routine too.
  for (const s of body) if (s.each) for (const n of [s.each.item, s.each.list]) uses.add(nameKey(n));
  return uses;
}

/** P-96 (scout row 11): a name renamed inside one routine and on its open runs' values, in one write. */
function renameValue(data: Data, routineId: Id, from: string, to: string, env: Env): Result {
  if (!isName(to)) return refuse(data, String(to ?? '').trim() ? 'cannot' : 'empty');
  const fromKey = nameKey(text(from) ? from : '');
  const name = tidyName(to);
  const body = bodyOf((id) => readRoutine(data, id), routineId);
  const uses = renameUses(data, routineId);
  const asked = callIO(data, routineId).asks.find((a) => nameKey(a) === fromKey);
  if (!fromKey || !uses.has(fromKey)) return refuse(data, 'cannot');
  if (nameKey(name) !== fromKey && uses.has(nameKey(name))) return refuse(data, 'same-name');
  let next = data;
  for (const s of body) {
    const routine = own(data.routines, s.id)!;
    const read = new Set<unknown>(s.items);
    let changed = false;
    const items = rawItems(routine).map((raw) => {
      if (!read.has(raw)) return raw;
      const i = raw as Item;
      if (isRef(i)) {
        // P-98: renamed in the calls' bindings — a call bound to it by name, and one that took it by its name (it keeps it).
        const next_ = rebind(data, i, (b) => ('name' in b && nameKey(b.name) === fromKey ? { ...b, name } : b), (input) => (nameKey(input) === fromKey ? { input, name } : undefined));
        if (next_ !== i) changed = true;
        return next_;
      }
      const words = isWait(i) ? i.wait : i.text;
      const now = renameIn(words, fromKey, name);
      const o = outOf(i);
      const out = o && nameKey(o) === fromKey ? name : undefined;
      if (now === words && (out === undefined || out === (i as { out?: unknown }).out)) return i;
      changed = true;
      return { ...i, ...(isWait(i) ? { wait: now } : { text: now }), ...(out !== undefined && { out }) };
    });
    // P-107: a for each over it, or whose item it is: the block (and its sentence) renamed with it.
    const each = s.each && (nameKey(s.each.item) === fromKey || nameKey(s.each.list) === fromKey) ? { item: nameKey(s.each.item) === fromKey ? name : s.each.item, list: nameKey(s.each.list) === fromKey ? name : s.each.list } : undefined;
    if (each && eachField(each)) next = putRoutine(next, patched(own(next.routines, s.id)!, { ...(changed ? { items } : {}), each: { ...(isObject(routine.each) ? routine.each : {}), ...each }, words: eachWords(each) }));
    else if (changed) next = putRoutine(next, patched(routine, { items }));
  }
  // P-98: an input this routine asks, renamed — every call to it (in any routine) binds the new name, keeping what it was given.
  if (asked)
    for (const id of Object.keys(data.routines)) {
      const caller = own(next.routines, id);
      const cs = readRoutine(next, id);
      if (!caller || !cs || cs.removedAt) continue;
      const read = new Set<unknown>(cs.items);
      let changed = false;
      const items = rawItems(caller).map((raw) => {
        if (!read.has(raw) || !isRef(raw as Item) || (raw as { ref: Id }).ref !== routineId) return raw;
        const i = raw as Item;
        const out = rebind(data, i, (b) => (nameKey(b.input) === fromKey ? { ...b, input: name } : b), (input) => (nameKey(input) === fromKey ? { input: name, name: input } : undefined), true);
        if (out !== i) changed = true;
        return out;
      });
      if (changed) next = putRoutine(next, patched(caller, { items }));
    }
  for (const id of Object.keys(data.runs)) {
    const raw = own(data.runs, id)!;
    const run = readRun(data, id);
    if (!isOpen(run) || !Array.isArray(raw.values)) continue;
    let changed = false;
    const values = raw.values.map((v) => {
      if (!isEntry(v) || v.seq !== routineId || run.frames[v.level]?.seq !== routineId || nameKey(v.name) !== fromKey || v.name === name) return v;
      changed = true;
      return { ...v, name };
    });
    if (changed) next = putRun(next, patched(raw, { values }));
  }
  return next === data ? done(data) : done(resettle(data, next, env));
}

/**
 * P-98: a call row with its bindings changed by `map`; an input it takes by name (no binding) that `unbound`
 * names gets that binding. `any`: for every input that name could be (the routine's own renaming). The same row
 * when nothing changes, or when `with` is in a shape this version cannot read (never written over).
 */
function rebind(data: Data, i: Item, map: (b: Binding) => Binding, unbound: (input: string) => Binding | undefined, any = false): Item {
  if (!isCall(data, i)) return i;
  const raw = (i as { with?: unknown }).with;
  if (raw !== undefined && !Array.isArray(raw)) return i;
  const had = Array.isArray(raw) ? raw : [];
  let changed = false;
  const withs: unknown[] = had.map((b) => {
    const read = bindingsOf({ ...i, with: [b] } as Item)[0];
    if (!read) return b;
    const m = map(read);
    if (m === read) return b;
    changed = true;
    return { ...(b as object), ...m };
  });
  const inputs = any ? [...callIO(data, i.ref).asks] : isLiveCall(data, i) ? callIO(data, i.ref).asks : [];
  for (const input of inputs) {
    if (bindingOf(i, nameKey(input))) continue;
    const b = unbound(input);
    if (b) {
      withs.push(b);
      changed = true;
    }
  }
  return changed ? patched(i, { with: withs }) : i;
}

/**
 * P-107: the level a for each's list is held at, for a step inside it (at any depth of for each) that gives that
 * list: where the list is seen from below the block, else the level below it. Undefined for any other name.
 */
function listHolder(data: Data, run: RunState, frames: Frame[], key: string): { level: number; row?: { id: Id; words: string; name: string } } | { kept: Id } | undefined {
  for (let j = scopeLevel(data, run, frames, frames.length - 1); j > 0; j = scopeLevel(data, run, frames, j - 1)) {
    const s = view(data, run, frames[j].seq);
    const each = s?.each;
    if (!each) return undefined;
    if (nameKey(each.list) !== key) continue;
    // P-108: a kept list is the routine's — adjusted there; a block's own list stays given by its row (local to it).
    if (each.kept) return { kept: frames[j].seq };
    const level = visibleValue(data, run, key, frames.slice(0, j))?.level ?? scopeLevel(data, run, frames, j - 1);
    return each.own && frames[j].from ? { level, row: { id: frames[j].from!, words: s!.words, name: each.list } } : { level };
  }
  return undefined;
}

/** P-108: a routine that can be held — named, there and not removed — with its name now; null for anything else. */
function liveRef(data: Data, r: ListRef | null | undefined, words: string): ListRef | null {
  const t = r && text(r.ref) ? readRoutine(data, r.ref) : undefined;
  if (!t?.named || t.removedAt) return null;
  return readRef({ ref: t.id, name: text(r!.name) && r!.name.trim() ? r!.name : t.words }, words);
}

/**
 * P-108: a kept list given — its items (blank ones dropped, capped, as typed) and the routines beside them; none left
 * keeps the list, empty. Refused `cannot` for a block that has no kept list, or one this version cannot read in full.
 */
function setKept(data: Data, seqId: Id, items: unknown, refs: unknown): Result {
  const routine = own(data.routines, seqId);
  const s = readRoutine(data, seqId);
  if (!routine || !s?.each?.kept || s.each.locked || !Array.isArray(items) || (refs !== undefined && !Array.isArray(refs))) return refuse(data, 'cannot');
  // (P-110, the P-108 investigator's repro 2: given without refs, an item keeps the ref of the kept item it is — at its
  // own place when the words are the same there, else the first unused one with the same words — never another's.)
  const was = s.each.kept;
  const header = isObject(routine.each) ? routine.each : {};
  // (F-1, engine #10 / storage F3: a kept item's ref is written back as stored — a routine removed since still reads
  // "(removed)", and fields this version does not know stay on it. Only a ref newly given is checked as a live routine.)
  const storedRefs: unknown[] = Array.isArray(header.refs) ? header.refs : [];
  const used = new Set<number>();
  const keptAt = (x: unknown, i: number): number => {
    const k = was[i] === x && !used.has(i) ? i : was.findIndex((w, j) => w === x && !used.has(j));
    if (k >= 0) used.add(k);
    return k;
  };
  const pairs = items
    .map((x, i) => {
      const k = keptAt(x, i);
      const had = k >= 0 ? (s.each!.refs?.[k] ?? null) : null;
      const given = Array.isArray(refs) ? (refs[i] as ListRef | null) : had;
      const same = !!had && !!given && isObject(given) && given.ref === had.ref;
      return { text: x, ref: same ? (storedRefs[k] as ListRef) : given, keep: same };
    })
    .filter((p): p is { text: string; ref: ListRef | null; keep: boolean } => text(p.text) && !!p.text.trim())
    .slice(0, MAX_ITEMS)
    .map((p) => ({ text: capValue(p.text), ref: p.keep && readRef(p.ref, p.text) ? p.ref : liveRef(data, p.ref, p.text) }));
  const kept = pairs.map((p) => p.text);
  const r = pairs.map((p) => p.ref);
  if (JSON.stringify(kept) === JSON.stringify(s.each.kept) && JSON.stringify(r) === JSON.stringify(Array.isArray(header.refs) ? header.refs : s.each.kept.map(() => null))) return done(data);
  return done(putRoutine(data, patched(routine, { each: patched({ ...header }, { kept, refs: r.some(Boolean) ? r : undefined }) })));
}

/** P-96: a value given, changed or cleared at the run's place (see the `value` verb). Kept as typed, capped; blank clears it. */
function setValue(data: Data, runId: Id, typedName: string, typedText: string, itemId: Id | undefined, env: Env, list?: string[], refsIn?: (ListRef | null)[]): Result {
  const l = load(data, runId);
  if (typeof l === 'string') return refuse(data, l);
  // P-107: a list, as its field gives it — one item per row, kept as typed (capped); blank rows dropped; none clears it.
  // P-108: each with the routine it holds, if any (held by reference: a routine that is there and not removed).
  const rows = Array.isArray(list)
    ? list
        .map((x, i) => ({ text: x, ref: Array.isArray(refsIn) ? refsIn[i] : null }))
        .filter((p): p is { text: string; ref: ListRef | null } => text(p.text) && !!p.text.trim())
        .slice(0, MAX_ITEMS)
        .map((p) => ({ text: capValue(p.text), ref: liveRef(data, p.ref, p.text) }))
    : undefined;
  const listed = rows?.map((p) => p.text);
  if (list !== undefined && !Array.isArray(list)) return refuse(data, 'cannot');
  const typed = listed ? (listed.length ? listed.join('\n') : '') : typedText;
  // A name that is not one; or values stored in a shape this version cannot read (it is never written over).
  if (!isName(typedName) || !text(typed) || (l.raw.values !== undefined && !Array.isArray(l.raw.values))) return refuse(data, 'cannot');
  const key = nameKey(typedName);
  const frames = l.at.frames;
  const visible = visibleValue(data, l.run, key, frames);
  let level: number;
  let from: { item: Id; words: string; name: string } | undefined;
  if (itemId !== undefined) {
    const item = l.at.item;
    if (!item || item.id !== itemId) return refuse(data, 'no-such-step');
    const words = wordsOf(data, l.run, item);
    // P-98: a call, or a step broken down, gives what it owes in its own field (Next past it without stepping in).
    const owes = isRef(item) ? owedBy(data, l.run, frames, item).find((n) => nameKey(n) === key) : undefined;
    // P-108: a for each that asks for its own list gives it on its row.
    const gives = outOf(item) ?? ownBlock(data, l.run, item)?.each?.list ?? owes;
    const reads = isRef(item) ? undefined : namesIn(words).find((x) => x.key === key);
    // P-101 amendment (ruling 10): a name a step already passed gives, with no value yet — given now, here.
    const passed = !(gives && nameKey(gives) === key) && !reads ? passedGives(data, l.run, l.at).find((p) => nameKey(p.name) === key) : undefined;
    if (!(gives && nameKey(gives) === key) && !reads && !passed) return refuse(data, 'cannot');
    // P-110: never ahead — a reader before every step that gives the name does not give it.
    if (!(gives && nameKey(gives) === key) && !passed && !visible && givenAhead(data, l.run, frames, key)) return refuse(data, 'cannot');
    // The step that gives it, or asks for it (nothing visible): its own level's value, from it. A step reading a value there is: that value.
    const own_ = (gives && nameKey(gives) === key) || !visible;
    level = passed ? passed.level : own_ ? scopeLevel(data, l.run, frames, frames.length - 1) : visible!.level;
    // Audit F2: a value given late is the giving step's (it is scoped, and cleared by a new round, exactly
    // as one given there); `words` keeps the step it was given at ("given at <step>").
    if (own_) from = { item: passed ? passed.item : item.id, words, name: passed ? passed.name : gives && nameKey(gives) === key ? gives : reads!.name };
    // P-107 (B-16): a step inside a for each that gives its list gives it where the list is — shown to adjust there,
    // so the for each carries on to what is added.
    if (own_ && gives && nameKey(gives) === key) {
      const held = listHolder(data, l.run, frames, key);
      // P-108: a kept list adjusted from a step inside its block is the routine's (it comes round in the next sitting).
      if (held && 'kept' in held) return setKept(data, held.kept, listed ?? (typed.trim() ? [typed] : []), rows ? rows.map((p) => p.ref) : [refsIn?.[0] ?? null]);
      if (held) {
        level = held.level;
        if (held.row) from = held.row && { item: held.row.id, words: held.row.words, name: held.row.name };
      }
    }
  } else {
    if (!visible) return refuse(data, 'cannot');
    level = visible.level;
  }
  // P-98: inside a call, a value read from below is the called routine's own copy — changed there, never below.
  const scope = scopeLevel(data, l.run, frames, frames.length - 1);
  const copied = level < scope && !from ? visible : undefined;
  if (copied) level = scope;
  const stored: unknown[] = Array.isArray(l.raw.values) ? l.raw.values : [];
  const mine = (v: unknown): v is ValueEntry => isEntry(v) && v.level === level && v.seq === frames[level].seq && nameKey(v.name) === key;
  let had: ValueEntry | undefined;
  for (const v of stored) if (mine(v)) had = v;
  // (A copy not made yet: the value below, written at this level.)
  const fresh = !had;
  had ??= copied && { ...copied, level, seq: frames[level].seq };
  let values: unknown[];
  if (!typed.trim()) {
    if (fresh) return done(data);
    values = stored.filter((v) => !mine(v));
  } else {
    if (fresh && readValues(stored).length >= MAX_VALUES) return refuse(data, 'cannot');
    const items = listed ?? [capValue(typed)];
    const refs = rows ? rows.map((p) => p.ref) : [liveRef(data, refsIn?.[0], items[0])];
    const moves = !!had && !!from && had.item !== from.item;
    const changedAt = itemId === undefined ? env.now : moves ? undefined : had?.changedAt;
    const { changedAt: _c, words: _w, refs: _f, ...base } = had ?? ({} as Partial<ValueEntry>);
    const words = from ? from.words : had?.words;
    const entry: ValueEntry = {
      ...base,
      name: from?.name ?? had!.name,
      ...withRefs(items, refs),
      level,
      seq: frames[level].seq,
      item: from?.item ?? had!.item,
      ...(words !== undefined && { words }),
      at: had && !moves ? had.at : env.now,
      ...(changedAt !== undefined && { changedAt }),
    };
    if (had && had.items.length === items.length && had.items.every((x, i) => x === items[i]) && had.item === entry.item && had.name === entry.name && JSON.stringify(refsOf(had)) === JSON.stringify(refs)) return done(data);
    let put = false;
    values = [];
    for (const v of stored) {
      if (!mine(v)) values.push(v);
      else if (v === had) {
        values.push(entry);
        put = true;
      }
    }
    if (!put) values.push(entry);
  }
  return done(putRun(data, patched(l.raw, { values: values.length ? values : undefined })));
}

/**
 * P-107: a run that has moved onto a for each row goes in — at its first item — or, with nothing in its list (or
 * nothing in the block), straight past it, as Next would (B-16: "an empty list is 'no'"). A for each is never a
 * step to rest on. Nothing changes for a run anywhere else.
 */
function landEach(r: Result, runId: Id | undefined, env: Env): Result {
  if (!r.ok || runId === undefined) return r;
  let out = r;
  for (let guard = 0; guard <= 4 * MAX_DEPTH; guard++) {
    const l = load(out.data, runId);
    if (typeof l === 'string' || l.run.mode === 'plan' || l.at.repaired || !isRef(l.at.item)) return out;
    const row = l.at.item;
    const block = view(out.data, l.run, row.ref);
    if (!block?.each) return out;
    // P-108: a for each with its own list, not given yet, asks for it on its row: the run rests there.
    if (ownBlock(out.data, l.run, row) && !visibleValue(out.data, l.run, nameKey(block.each.list), l.at.frames)) return out;
    const into: Frame = { seq: block.id, at: block.items[0]?.id ?? null, round: 1, from: row.id };
    const list = eachList(out.data, l.run, [...l.at.frames, into], l.at.frames.length);
    if (list.length && block.items.length && l.at.frames.length < MAX_DEPTH) {
      const frames = [...l.at.frames, { ...into, each: 0, eachText: list[0], eachSeen: list }];
      out = { ...out, data: settleWait(putRun(out.data, patched(l.raw, { frames })), runId, l.at, env) };
      continue;
    }
    const a = advance(out.data, l.run, l.at.frames);
    if (a.ended || a.asking) {
      const e = end(out.data, l, 'finished', env);
      return { ...out, data: e.data, said: e.said };
    }
    const m = moved(out.data, l, a, env);
    out = { ...out, data: m.data, ...(m.folded !== undefined && { folded: m.folded }), ...(!out.said && m.said && { said: m.said }) };
  }
  return out;
}

/**
 * P-112: one step of a chunk taken as done — what was typed in its fields given at the place (as its own field gives it;
 * one the engine refuses is left out, and the step that reads it asks, as ever), then Next with what its insides owe.
 * Refused when the run has no step to stand on.
 */
export function chunkStep(data: Data, runId: Id, row: ChunkGiven | undefined, env: Env): Result {
  const run = readRun(data, runId);
  const at = run && !run.endedAt ? place(data, run) : undefined;
  if (!at?.item) return refuse(data, 'cannot');
  const g = givenAt(data, runId, row?.given, env);
  if (!g.ok) return g;
  const owed = typedGiven(row?.owed);
  const out = runVerb(g.data, { kind: 'next', runId, ...(owed.length && { owed }) }, env);
  return out.ok && g.changed?.length ? { ...out, changed: g.changed } : out;
}

const typedGiven = (gs: unknown): Given[] => (Array.isArray(gs) ? gs.filter((g): g is Given => isObject(g) && text(g.name) && text(g.text)) : []);
/** P-112, P-99: values typed for the step the run is on, given there (each as its own field gives it). */
function givenAt(data: Data, runId: Id, given: unknown, env: Env): Result {
  const run = readRun(data, runId);
  const at = run && !run.endedAt ? place(data, run) : undefined;
  if (!at?.item) return refuse(data, 'cannot');
  let d = data;
  const changed: string[] = [];
  for (const g of typedGiven(given)) {
    // P-99 (repro 2): an empty draft is "unchanged", never "clear".
    if (!g.text.trim() && !(Array.isArray(g.items) && g.items.some((x) => text(x) && x.trim()))) continue;
    const had = visibleValue(d, readRun(d, runId)!, nameKey(g.name), place(d, readRun(d, runId)!)?.frames);
    const r = runVerb(d, { kind: 'value', runId, name: g.name, text: g.text, item: at.item.id, ...(Array.isArray(g.items) && { items: g.items }), ...(Array.isArray(g.refs) && { refs: g.refs }) }, env);
    // P-99 (repro 3): a value the engine will not keep is said, and nothing moves (the words stay where they were typed).
    if (!r.ok) return refuse(data, r.reason ?? 'cannot', { refusedValue: tidyName(g.name) });
    // P-99 (repro 1): a value typed over is said, with its Undo — as P-96's field has it.
    const now = visibleValue(r.data, readRun(r.data, runId)!, nameKey(g.name), place(r.data, readRun(r.data, runId)!)?.frames);
    if (had && had.items.length && JSON.stringify(had.items) !== JSON.stringify(now?.items ?? [])) changed.push(tidyName(g.name));
    d = r.data;
  }
  return done(d, changed.length ? { changed } : {});
}

/**
 * P-112: Next over the chunk in view — each step in it taken as done, in order (`chunkStep`), in one write: so one Undo.
 * It goes to the step after the last one shown. Refused as a whole (nothing changes) when any step is, or when the run
 * would end before its last step.
 */
function chunkNext(data: Data, runId: Id, rows: unknown, env: Env): Result {
  if (!Array.isArray(rows) || !rows.length || rows.length > MAX_CHUNK) return refuse(data, 'cannot');
  let d = data;
  let said: Said | undefined;
  let folded: string | undefined;
  const cleared: string[] = [];
  const changed: string[] = [];
  for (const [i, row] of rows.entries()) {
    const r = chunkStep(d, runId, isObject(row) ? (row as ChunkGiven) : undefined, env);
    if (!r.ok) return refuse(data, r.reason ?? 'cannot', r.refusedValue ? { refusedValue: r.refusedValue } : {});
    for (const c of r.changed ?? []) if (!changed.includes(c)) changed.push(c);
    if (r.said?.kind === 'ended' && i < rows.length - 1) return refuse(data, 'cannot');
    d = r.data;
    // What it says: the run ended, else the last level it finished on the way.
    if (r.said?.kind === 'ended' || r.said?.kind === 'finished' || (r.said && !said)) said = r.said;
    if (r.folded !== undefined) folded = r.folded;
    for (const c of r.cleared ?? []) if (!cleared.includes(c)) cleared.push(c);
  }
  return done(d, { ...(said && { said }), ...(folded !== undefined && { folded }), ...(cleared.length && { cleared }), ...(changed.length && { changed }) });
}

/** The engine: the data after a verb. Pure; never throws on damaged data (it refuses instead). */
export function runVerb(data: Data, verb: Verb, env: Env): Result {
  // P-112: Next over a chunk is Next, step by step — each with its own arrival and settling.
  if (verb.kind === 'next' && verb.chunk !== undefined) return chunkNext(data, verb.runId, verb.chunk, env);
  const r = verbOf(data, verb, env);
  // P-107: every move that can arrive on a for each row.
  if (verb.kind === 'start' || verb.kind === 'next' || (verb.kind === 'done' && !verb.whole) || verb.kind === 'stepIn' || verb.kind === 'back' || verb.kind === 'jump' || verb.kind === 'restart' || verb.kind === 'part') {
    const landed = landEach(r, verb.kind === 'start' ? r.runId : verb.runId, env);
    // P-110: and a value is held only while the step that gives it is above the place.
    if (verb.kind === 'start' || !landed.ok || landed.data === data) return landed;
    // (P-111, owner: "Back keeps it" — Back clears nothing; what it passes back over is hidden until it is reached again.)
    if (verb.kind === 'back') return landed;
    // (P-99: nor does taking up a part — it is where it was put down, with what it gave.)
    if (verb.kind === 'part' || (verb.kind === 'stepIn' && anyBlock(data, readRun(data, verb.runId)!, place(data, readRun(data, verb.runId)!)?.item))) return landed;
    const { data: next, cleared } = settlePlace(data, landed.data, verb.runId, verb.kind === 'jump' || verb.kind === 'restart');
    const all = [...(landed.cleared ?? []), ...cleared].filter((c, i, xs) => xs.findIndex((x) => nameKey(x) === nameKey(c)) === i);
    return all.length ? { ...landed, data: next, cleared: all } : landed;
  }
  return r;
}

function verbOf(data: Data, verb: Verb, env: Env): Result {
  switch (verb.kind) {
    case 'start':
      return start(data, verb.routineId, env);
    case 'new':
      return create(data, verb.words, env);
    case 'resume':
      return resume(data, verb.runId, env);
    case 'plan':
      return plan(data, verb.runId, env);
    case 'pause':
      return pause(data, verb.runId, verb.reason, env);
    case 'reason':
      return setReason(data, verb.runId, verb.text);
    case 'home':
      return home(data, verb.runId);
    case 'next':
      return next(data, verb.runId, env, verb.owed);
    case 'done':
      // P-99 (the P-112 investigator's repro 4): what was typed in See ahead's fields for the step it is on is given first, as Next gives it.
      if (Array.isArray(verb.given) && verb.given.length && !verb.whole) {
        const g = givenAt(data, verb.runId, verb.given, env);
        if (!g.ok) return g;
        const r = doneWith(g.data, verb.runId, env, undefined, verb.owed);
        return r.ok ? { ...r, ...(g.changed?.length && { changed: g.changed }) } : refuse(data, r.reason ?? 'cannot');
      }
      return doneWith(data, verb.runId, env, verb.whole, verb.owed);
    case 'stepIn':
      return stepIn(data, verb.runId, env);
    case 'back':
      return back(data, verb.runId, env);
    case 'restart':
      return restart(data, verb.runId, verb.level, env);
    case 'jump':
      return jump(data, verb.runId, verb.to, env);
    case 'value':
      return setValue(data, verb.runId, verb.name, verb.text, verb.item, env, verb.items, verb.refs);
    case 'queue':
      return requeue(data, verb.runId, verb.to);
    case 'part':
      return takeUp(data, verb.runId, verb.level, verb.part, env);
    default:
      return refuse(data, 'cannot');
  }
}
