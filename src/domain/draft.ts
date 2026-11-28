/**
 * P-115 (the owner, 2026-11-28: "Edit, then Save/Cancel"; "Kept as a draft"): Plan opens read-only; Edit starts a DRAFT
 * of the routine, every Plan change goes into it, and only Save makes it the routine's. A run and home keep reading the
 * saved routine until then.
 *
 * The draft is kept ON the routine's own record, as one more field of its body (`draft`), so reload, the journal, the
 * fallback, hand-over, export and import keep it with no new kind of record — and an older build, which does not know
 * the field, reads the saved routine exactly as before and keeps the field as it is (it never reads it).
 *
 * What it holds is the edits themselves, in order (`log`), each with the ids and the time it made — so it reads the same
 * every time it is replayed — and, for every routine the draft has changed (this one, a routine used as a step changed
 * inside it, a breakdown made), that routine as it was SAVED when the draft first changed it (`base`; null: the draft
 * made it). Plan in Edit shows the edits replayed over `base`: the draft as the person made it. Save replays them over
 * the saved data, in one write, so the runs it repairs and the values it renames are the runs as they are at Save.
 *
 * "Changed elsewhere" (another tab, an older build, a run's kept list): a routine in `base` that no longer reads as its
 * base. Save then says so and writes nothing; saved anyway (asked), the edits are replayed over what is saved now — the
 * other change stays wherever the draft did not change the same thing — and one Undo takes the Save back.
 */
import { copyAndAdd } from './library';
import { editRoutine, Env, Result, RoutineEdit } from './run';
import { whatChanged } from './runView';
import { sameValue } from './diff';
import { Data, Id, Routine } from './types';

/** The one shape this version writes. A draft in any other (a later version's) is kept and never written over. */
export const DRAFT_V = 1;

/** One edit in the draft: a Plan edit of sequence `seq`, or (P-105) a library method copied and added as its step. */
export type DraftStep = ({ seq: Id; edit: RoutineEdit } | { seq: Id; lib: Id; after?: Id | null }) & {
  /** The ids it made, in the order it made them, so a replay makes the same records. */
  ids: Id[];
  /** When it was made (the time it stamped on what it made). */
  now: string;
  /** What it did, in words ("Moved “Tailor the CV”"): the Undo's label inside the draft. */
  said: string;
};

export interface Draft {
  v: typeof DRAFT_V;
  /** The routine it is a draft of (an older build's Copy carries the field onto the copy: there it is not a draft). */
  of: Id;
  startedAt: string;
  /** Each routine the draft changed, as saved when it first changed it (its own `draft` left out); null: the draft made it. */
  base: Record<Id, Routine | null>;
  log: DraftStep[];
}

export type DraftRead = { kind: 'none' } | { kind: 'locked' } | { kind: 'draft'; draft: Draft };

const own = <T,>(records: Record<Id, T>, id: Id): T | undefined => (Object.prototype.hasOwnProperty.call(records, id) ? records[id] : undefined);
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isText = (v: unknown): v is string => typeof v === 'string';
const isStep = (v: unknown): v is DraftStep =>
  isObject(v) && isText(v.seq) && Array.isArray(v.ids) && v.ids.every(isText) && isText(v.now) && isText(v.said) && (isObject(v.edit) ? isText(v.edit.kind) : isText(v.lib));

/** A routine's record without its draft — what is saved. */
export function saved(r: Routine): Routine {
  if (!('draft' in r)) return r;
  const { draft: _draft, ...rest } = r;
  return rest as Routine;
}

const NONE: DraftRead = { kind: 'none' };
const LOCKED: DraftRead = { kind: 'locked' };
const reads = new WeakMap<object, { id: Id; read: DraftRead }>();

/**
 * The routine's draft, read tolerantly. No field (old data, and every routine not being edited): none. A field of
 * another routine (an older build's Copy carried it here): none — Edit starts a new one in its place. A field in a shape
 * this version cannot read (a later version's): locked — kept, never written over, and Plan offers no Edit.
 */
export function readDraft(data: Data, routineId: Id): DraftRead {
  const r = own(data.routines, routineId);
  const raw = r?.draft;
  if (!r || raw === undefined) return NONE;
  const memo = isObject(raw) ? reads.get(raw) : undefined;
  if (memo && memo.id === routineId) return memo.read;
  let out: DraftRead = LOCKED;
  if (isObject(raw) && isText(raw.of) && raw.of !== routineId && raw.v === DRAFT_V) out = NONE;
  else if (isObject(raw) && raw.v === DRAFT_V && raw.of === routineId && isText(raw.startedAt) && isObject(raw.base) && Array.isArray(raw.log) && raw.log.every(isStep) && Object.values(raw.base).every((b) => b === null || isObject(b)))
    out = { kind: 'draft', draft: raw as unknown as Draft };
  if (isObject(raw)) reads.set(raw, { id: routineId, read: out });
  return out;
}

/** The draft, if the routine has one this version can use. */
export const draftOf = (data: Data, routineId: Id): Draft | undefined => {
  const d = readDraft(data, routineId);
  return d.kind === 'draft' ? d.draft : undefined;
};

/** It holds a change (Cancel then discards something, and is undoable). */
export const hasChanges = (d: Draft | undefined): boolean => !!d && d.log.length > 0;

/** `data` with each routine in `base` as it was then (null: not there), and the draft's own routine without its field. */
function baseView(data: Data, rootId: Id, d: Draft): Data {
  const routines = { ...data.routines };
  for (const [id, b] of Object.entries(d.base)) {
    if (b === null) delete routines[id];
    else routines[id] = b;
  }
  const root = own(routines, rootId);
  if (root) routines[rootId] = saved(root);
  return { ...data, routines };
}

/** An env that hands out `ids` in order (then fresh ones from `more`) and stamps `now`. */
const replayEnv = (step: DraftStep, more: Env): Env => {
  let i = 0;
  return { now: step.now, id: () => (i < step.ids.length ? step.ids[i++] : more.id()) };
};

function apply(data: Data, step: DraftStep, env: Env): Result {
  return 'lib' in step ? copyAndAdd(data, step.lib, step.seq, step.after, env) : editRoutine(data, step.seq, step.edit, env);
}

/** The steps replayed over `data`, in order: the data after, or the first one that could not be made again. */
function replay(data: Data, log: DraftStep[], more: Env): { ok: true; data: Data } | { ok: false; at: number; data: Data } {
  let d = data;
  for (const [k, step] of log.entries()) {
    const r = apply(d, step, replayEnv(step, more));
    if (!r.ok) return { ok: false, at: k, data: d };
    d = r.data;
  }
  return { ok: true, data: d };
}

const FRESH: Env = { now: new Date(0).toISOString(), id: () => `draft-${Math.random().toString(36).slice(2)}` };
const views = new WeakMap<Draft, { routines: Data['routines']; runs: Data['runs']; root: Routine; out: Data }>();
/** Whether every routine but the draft's own is the same object in both (the draft's own differs only by its field). */
const sameOthers = (a: Data['routines'], b: Data['routines'], rootId: Id) => {
  if (a === b) return true;
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((id) => id === rootId || a[id] === own(b, id));
};

/**
 * What Plan in Edit reads: the draft as the person made it — the edits replayed over the routines as they were when the
 * draft first changed them, with every run (as it is now) kept standing in it. Without a draft (or with nothing in it
 * yet): the data as it is. Runs, home and everything else never read this.
 */
export function draftData(data: Data, rootId: Id): Data {
  const d = draftOf(data, rootId);
  if (!d || !d.log.length) return data;
  const root = own(data.routines, rootId)!;
  const had = views.get(d);
  if (had && had.runs === data.runs && sameOthers(had.routines, data.routines, rootId) && sameValue(saved(had.root), saved(root))) return had.out;
  const out = replay(baseView(data, rootId, d), d.log, FRESH).data;
  views.set(d, { routines: data.routines, runs: data.runs, root, out });
  return out;
}

export type DraftResult = { ok: true; data: Data; view: Data; routineId?: Id; said?: string; made?: string[]; used?: string[] } | { ok: false; data: Data; reason: Result['reason'] | 'changed' | 'no-draft' | 'locked'; names?: string[] };

const putRoutine = (data: Data, r: Routine): Data => ({ ...data, routines: { ...data.routines, [r.id]: r } });
const withDraft = (data: Data, rootId: Id, d: Draft | undefined): Data => {
  const r = own(data.routines, rootId)!;
  return putRoutine(data, d ? { ...r, draft: d } : saved(r));
};

/**
 * Edit: a draft of the routine, with nothing in it yet. Already one: as it is (Plan reopens in Edit with it). Refused for
 * a routine that is not there or was removed, and for a draft this version cannot read (`locked`: never written over).
 */
export function beginDraft(data: Data, rootId: Id, env: Env): DraftResult {
  const r = own(data.routines, rootId);
  if (!r || r.removedAt) return { ok: false, data, reason: 'gone' };
  const read = readDraft(data, rootId);
  if (read.kind === 'locked') return { ok: false, data, reason: 'locked' };
  if (read.kind === 'draft') return { ok: true, data, view: draftData(data, rootId) };
  const next = withDraft(data, rootId, { v: DRAFT_V, of: rootId, startedAt: env.now, base: {}, log: [] });
  return { ok: true, data: next, view: next };
}

/**
 * One Plan edit into the draft (`step`: an edit of `seq`, or a library method copied and added there). It is made on the
 * draft as shown, exactly as it would be on the routine (the same refusals); kept, with what it made, as the draft's last
 * step. Each routine it changes for the first time is kept in `base` as saved now. Nothing saved changes but the field.
 */
export function draftEdit(data: Data, rootId: Id, step: { seq: Id; edit: RoutineEdit } | { seq: Id; lib: Id; after?: Id | null }, env: Env): DraftResult {
  const d = draftOf(data, rootId);
  if (!d) return { ok: false, data, reason: readDraft(data, rootId).kind === 'locked' ? 'locked' : 'no-draft' };
  // (Removing the routine is not a draft's: it is asked first and goes at once, with its own Undo.)
  if ('edit' in step && step.edit.kind === 'removeRoutine') return { ok: false, data, reason: 'cannot' };
  const view = draftData(data, rootId);
  const ids: Id[] = [];
  const rec: Env = { now: env.now, id: () => {
    const x = env.id();
    ids.push(x);
    return x;
  } };
  const said = 'edit' in step ? whatChanged(view, { kind: 'editRoutine', routineId: step.seq, edit: step.edit }) : '';
  const r = 'edit' in step ? editRoutine(view, step.seq, step.edit, rec) : copyAndAdd(view, step.lib, step.seq, step.after, rec);
  if (!r.ok) return { ok: false, data, reason: r.reason ?? 'cannot' };
  if (r.data === view) return { ok: true, data, view };
  const base = d.log.length ? { ...d.base } : {};
  for (const id of new Set([...Object.keys(view.routines), ...Object.keys(r.data.routines)])) {
    if (own(view.routines, id) === own(r.data.routines, id) || Object.prototype.hasOwnProperty.call(base, id)) continue;
    const now = own(data.routines, id);
    base[id] = now ? saved(now) : null;
  }
  const made = r as Result & { made?: string[]; used?: string[] };
  const next: Draft = { ...d, base, log: [...d.log, { ...step, ids, now: env.now, said: said || (made.made?.[0] ? `Added “${made.made[0]}” from the library` : '') }] };
  const out = withDraft(data, rootId, next);
  views.set(next, { routines: out.routines, runs: out.runs, root: own(out.routines, rootId)!, out: r.data });
  return { ok: true, data: out, view: r.data, ...(r.routineId !== undefined && { routineId: r.routineId }), said: next.log[next.log.length - 1].said, ...(made.made && { made: made.made }), ...(made.used && { used: made.used }) };
}

/** The draft's last edit taken back (Undo inside the draft): the draft one step shorter. */
export function undoDraftStep(data: Data, rootId: Id): DraftResult {
  const d = draftOf(data, rootId);
  if (!d || !d.log.length) return { ok: false, data, reason: 'no-draft' };
  const log = d.log.slice(0, -1);
  return { ok: true, data: withDraft(data, rootId, { ...d, log, base: log.length ? d.base : {} }), view: data };
}

/** The names of the routines the draft changed that were changed elsewhere since (saved no longer as their base). */
export function changedElsewhere(data: Data, rootId: Id): string[] {
  const d = draftOf(data, rootId);
  if (!d || !d.log.length) return [];
  const names: string[] = [];
  for (const [id, b] of Object.entries(d.base)) {
    const now = own(data.routines, id);
    const same = b === null ? !now : !!now && sameValue(saved(now), b);
    if (!same) names.push((now ?? b)?.named === false ? (own(data.routines, rootId)?.words ?? '') : ((now ?? b)?.words ?? ''));
  }
  return [...new Set(names)];
}

/**
 * Save: the draft made the routine's, in ONE write — its edits replayed over what is saved now, every run kept standing
 * as each edit keeps them, the field gone. Nothing in it: the field just goes. Changed elsewhere since: refused
 * (`changed`, naming the routines) unless `anyway` — then the edits go over what is saved now; one that cannot be made
 * there any more (its step was removed elsewhere) refuses the whole Save (`cannot`), and nothing is written.
 */
export function saveDraft(data: Data, rootId: Id, env: Env, anyway = false): DraftResult {
  const d = draftOf(data, rootId);
  if (!d) return { ok: false, data, reason: readDraft(data, rootId).kind === 'locked' ? 'locked' : 'no-draft' };
  const start = withDraft(data, rootId, undefined);
  if (!d.log.length) return { ok: true, data: start, view: start };
  const elsewhere = changedElsewhere(data, rootId);
  if (elsewhere.length && !anyway) return { ok: false, data, reason: 'changed', names: elsewhere };
  const r = replay(start, d.log, env);
  if (!r.ok) return { ok: false, data, reason: 'cannot' };
  return { ok: true, data: r.data, view: r.data };
}

/** Cancel: the draft thrown away (the field gone); the saved routine is as it was. */
export function cancelDraft(data: Data, rootId: Id): DraftResult {
  if (!own(data.routines, rootId) || !('draft' in own(data.routines, rootId)!)) return { ok: false, data, reason: 'no-draft' };
  if (readDraft(data, rootId).kind === 'locked') return { ok: false, data, reason: 'locked' };
  const out = withDraft(data, rootId, undefined);
  return { ok: true, data: out, view: out };
}
