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
 * in that one write (`plan`). A run is in Plan when its body says `mode: 'plan'` and it is not
 * running, or when it has nothing to stand on (the edge): see `isPlanning`.
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
import { Data, Id, Routine, Run } from './types';

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
   * It was left in Plan. Never on a run that is running or ended (a stored one there is ignored).
   * Absent says nothing by itself: a run at the edge is planning too (`isPlanning`).
   */
  mode?: 'plan';
  /** Why it was paused, as typed. */
  reason?: string;
  /** When a verb last moved or touched it. */
  touchedAt?: string;
  endedBy?: 'done' | 'finished';
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
  /** One row up or down. The Repeat divider is a row: next to it the step passes it and no other step moves. */
  | { kind: 'move'; item: Id; by: -1 | 1 }
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
  | { kind: 'removeRoutine' };

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
  | { kind: 'next'; runId: Id }
  | { kind: 'done'; runId: Id }
  | { kind: 'stepIn'; runId: Id }
  | { kind: 'back'; runId: Id }
  | { kind: 'jump'; runId: Id; to: JumpTo };

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
  | 'same-name';

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
  seqs.set(r, seq);
  return seq;
}

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

const states = new WeakMap<Run, RunState>();
/** A run as it can be used. Never throws; undefined only when there is no such run. */
export function readRun(data: Data, id: Id): RunState | undefined {
  const r = own(data.runs, id);
  if (!isObject(r)) return undefined;
  const had = states.get(r);
  if (had) return had;
  const frames: Frame[] = [];
  for (const f of Array.isArray(r.frames) ? r.frames.slice(0, MAX_DEPTH) : []) {
    // A level that can't be read ends the stack there: what is above it has nothing to stand on.
    if (!isObject(f) || !text(f.seq)) break;
    frames.push({ seq: f.seq, at: text(f.at) ? f.at : null, round: countOf(f.round) ?? 1, ...(text(f.from) && { from: f.from }) });
  }
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

/** An item's words in this run: a step's or a wait's own, a routine's name. */
export const wordsOf = (data: Data, run: RunState, item: Item | undefined): string => (!item ? '' : isRef(item) ? (view(data, run, item.ref)?.words ?? '') : isWait(item) ? item.wait : item.text);

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
  if (run.mode === 'plan') return true;
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

// ───────── moving ─────────

interface Advance {
  frames: Frame[];
  /** The levels left, innermost first. */
  popped: Frame[];
  ended?: true;
  asking?: true;
}

/**
 * What Next does to a stack of levels. Also what the panel's "then:" reads and what Done does to
 * the level below: one rule for all three.
 */
export function advance(data: Data, run: RunState, from: Frame[]): Advance {
  const frames = from.map((f) => ({ ...f }));
  const popped: Frame[] = [];
  // Each turn either lands or leaves a level, so it ends within the depth.
  for (let guard = 0; guard <= MAX_DEPTH; guard++) {
    const f = frames[frames.length - 1];
    const s = view(data, run, f.seq);
    if (!s) return { frames, popped };
    const at = f.at === null ? -1 : s.items.findIndex((i) => i.id === f.at);
    if (at + 1 < s.items.length) {
      f.at = s.items[at + 1].id;
      return { frames, popped };
    }
    // The last item: round again, unless there is no divider or the number is reached.
    if (s.repeatFrom !== undefined && !(s.repeat !== undefined && f.round >= s.repeat)) {
      f.at = s.items[s.repeatFrom].id;
      f.round += 1;
      return { frames, popped };
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

/** Back to <step>: the step before this one in this level, and its round. Undefined when there is none. */
export function previous(data: Data, run: RunState): { at: Id; round: number } | undefined {
  const p = place(data, run);
  if (!p) return undefined;
  const { frame, seq } = p;
  const n = seq.items.length;
  const at = frame.at === null ? n : seq.items.findIndex((i) => i.id === frame.at);
  if (!n || at < 0) return undefined;
  // The first repeating item of a later round: the last item of the round before.
  if (at === seq.repeatFrom && frame.round > 1) return { at: seq.items[n - 1].id, round: frame.round - 1 };
  return at > 0 ? { at: seq.items[at - 1].id, round: frame.round } : undefined;
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
    // But one stored running with nothing to stand on (the edge, as the build before left it) was in Plan all along: now it is stored so.
    const read = r.status === 'running' ? readRun(data, r.id) : undefined;
    const edge = !!read && isPlanning(data, read);
    runs[r.id] = patched(r, { status: mine ? status : undefined, ...(edge ? { mode: 'plan' } : r.status === 'running' && 'mode' in r && { mode: undefined }) });
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

/** In Plan as stored: the mode, and not running (the one the app is on is paused; any other run keeps no status). */
function markPlan(data: Data, runId: Id): Data {
  const next = own(data.runs, runId)?.status === 'running' ? setStatus(data, runId, 'paused') : data;
  const raw = own(next.runs, runId)!;
  return raw.mode === 'plan' ? next : putRun(next, patched(raw, { mode: 'plan' }));
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
function moved(data: Data, l: Loaded, to: { frames: Frame[]; popped?: Frame[]; asking?: true }, env: Env, said?: Said): Result {
  const popped = to.popped ?? [];
  let next = putRun(data, patched(l.raw, { frames: to.frames, touchedAt: env.now, reason: undefined, ...(l.raw.status === 'running' && 'mode' in l.raw && { mode: undefined }) }));
  next = settleWait(next, l.run.id, l.at, env);
  const names = popped.map((f) => view(data, l.run, f.seq)?.words ?? '');
  let folded: string | undefined;
  // The edge: nothing can run there, so the run is in Plan (and its old this-run changes are folded) in this same write.
  if (!place(next, readRun(next, l.run.id)!)?.item) ({ data: next, folded } = enterPlan(next, l.run.id, env));
  return done(next, { said: said ?? (popped.length ? { kind: 'finished', names } : to.asking ? { kind: 'edge' } : undefined), ...(folded !== undefined && { folded }) });
}

/** The run ends: by Done at the top, or by itself. Its place stays as it was. */
function end(data: Data, l: Loaded, by: 'done' | 'finished', env: Env): Result {
  const record = patched(l.raw, {
    ...(l.at.repaired && { frames: l.at.frames }),
    endedAt: env.now,
    endedBy: by,
    touchedAt: env.now,
    waitingSince: undefined,
    reason: undefined,
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
  if (l.raw.mode === 'plan' && l.raw.status !== 'running' && !l.run.changes.length) return done(data);
  const { data: next, folded } = enterPlan(data, runId, env);
  return done(putRun(next, patched(own(next.runs, runId)!, { touchedAt: env.now })), { ...(folded !== undefined && { folded }) });
}

function pause(data: Data, runId: Id, why: string | undefined, env: Env): Result {
  const l = load(data, runId);
  if (typeof l === 'string') return refuse(data, l);
  const reason = tidy(why);
  return done(setStatus(putRun(data, patched(l.raw, { touchedAt: env.now, ...(reason && { reason }) })), runId, 'paused'));
}

/** The reason edited in place: kept as typed (the field is bound to it); blank deletes it. Nothing else changes. */
function setReason(data: Data, runId: Id, typed: string): Result {
  const l = load(data, runId);
  if (typeof l === 'string') return refuse(data, l);
  const reason = text(typed) && typed.trim() ? typed : undefined;
  return done(reason === l.raw.reason ? data : putRun(data, patched(l.raw, { reason })));
}

/** Home, after "Stop <name>?": no run is the one the app is on. The run stays exactly where it is. */
function home(data: Data, runId: Id): Result {
  return own(data.runs, runId) ? done(setStatus(data, undefined)) : refuse(data, 'gone');
}

function next(data: Data, runId: Id, env: Env): Result {
  const l = load(data, runId);
  if (typeof l === 'string') return refuse(data, l);
  if (l.at.item && l.run.mode === 'plan') return refuse(data, 'planning');
  // What is stored is not a place any more: the start of that level, and no further.
  if (l.at.repaired) return moved(data, l, { frames: l.at.frames }, env);
  if (l.at.frame.at === null) return refuse(data, 'asking');
  const a = advance(data, l.run, l.at.frames);
  return a.ended ? end(data, l, 'finished', env) : moved(data, l, a, env);
}

function doneWith(data: Data, runId: Id, env: Env): Result {
  const l = load(data, runId);
  if (typeof l === 'string') return refuse(data, l);
  // Done exists only when running, and at the edge.
  if (l.at.item && l.run.mode === 'plan') return refuse(data, 'planning');
  if (l.at.frames.length === 1) return end(data, l, 'done', env);
  // The level is left, for whatever reason; the one below goes on from the item this was entered from.
  const below = l.at.frames.slice(0, -1);
  const child = l.at.frame;
  if (below[below.length - 1].at !== child.from) return moved(data, l, { frames: below, popped: [child] }, env);
  const a = advance(data, l.run, below);
  if (a.ended) return end(data, l, 'finished', env);
  return moved(data, l, { ...a, popped: [child, ...a.popped] }, env);
}

function stepIn(data: Data, runId: Id, env: Env): Result {
  const l = load(data, runId);
  if (typeof l === 'string') return refuse(data, l);
  if (inPlan(l)) return refuse(data, 'planning');
  const item = l.at.item;
  if (!isRef(item)) return refuse(data, 'not-a-routine');
  const target = view(data, l.run, item.ref);
  if (!target?.items.length) return refuse(data, 'empty');
  if (l.at.frames.length >= MAX_DEPTH) return refuse(data, 'too-deep');
  return moved(data, l, { frames: [...l.at.frames, { seq: target.id, at: target.items[0].id, round: 1, from: item.id }] }, env);
}

function back(data: Data, runId: Id, env: Env): Result {
  const l = load(data, runId);
  if (typeof l === 'string') return refuse(data, l);
  if (inPlan(l)) return refuse(data, 'planning');
  const p = previous(data, l.run);
  if (!p) return refuse(data, 'nothing-before');
  return moved(data, l, { frames: [...l.at.frames.slice(0, -1), { ...l.at.frame, at: p.at, round: p.round }] }, env);
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
    frames = [...was.slice(0, to.level), { ...was[to.level], at: s.items[0]?.id ?? null, round: 1 }];
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
      frames.push({ seq: s.id, at: id, round: same ? was[i].round : 1, ...(i > 0 && { from: to.path[i - 1] }) });
      seqId = isRef(item) ? item.ref : undefined;
    }
  }
  const out = moved(data, l, { frames }, env, { kind: 'jumped', from: wordsOf(data, l.run, l.at.item) });
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
    let now = place(data, readRun(data, id)!);
    if (now?.repaired) {
      data = putRun(data, patched(own(data.runs, id)!, { frames: now.frames }));
      now = place(data, readRun(data, id)!);
    }
    if (wasAt && now && !wasAt.item !== !now.item) data = markPlan(data, id);
    data = settleWait(data, id, wasAt, env);
  }
  return data;
}

/**
 * Plan's edits (P-90): each changes the routine, and every open run is kept standing in the same
 * write, so one Undo covers the routine and the runs together.
 */
export function editRoutine(data: Data, routineId: Id, edit: RoutineEdit, env: Env): Result {
  const routine = own(data.routines, routineId);
  const s = readRoutine(data, routineId);
  if (!routine || !s || s.removedAt) return refuse(data, 'gone');
  const has = (id: Id) => s.items.some((i) => i.id === id);
  let after: Routine | undefined;
  if (edit.kind === 'addStep' || edit.kind === 'addWait') {
    const words = tidy(edit.kind === 'addStep' ? edit.text : edit.wait);
    if (!words) return refuse(data, 'empty');
    if (typeof edit.after === 'string' && !has(edit.after)) return refuse(data, 'no-such-step');
    after = editItems(routine, s, { insert: [edit.kind === 'addStep' ? { id: env.id(), text: words } : { id: env.id(), wait: words }, edit.after] });
  } else if (edit.kind === 'remove') {
    if (!has(edit.item)) return refuse(data, 'no-such-step');
    after = editItems(routine, s, { remove: edit.item });
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
  }
  if (!after) return refuse(data, 'cannot');
  return done(resettle(data, putRoutine(data, after), env));
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
  if (!isStep(item)) return refuse(data, 'not-a-step');
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
    next = settleWait(putRun(next, patched(own(next.runs, id)!, { frames })), id, at, env);
  }
  return done(next);
}

/** The engine: the data after a verb. Pure; never throws on damaged data (it refuses instead). */
export function runVerb(data: Data, verb: Verb, env: Env): Result {
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
      return next(data, verb.runId, env);
    case 'done':
      return doneWith(data, verb.runId, env);
    case 'stepIn':
      return stepIn(data, verb.runId, env);
    case 'back':
      return back(data, verb.runId, env);
    case 'jump':
      return jump(data, verb.runId, verb.to, env);
    default:
      return refuse(data, 'cannot');
  }
}
