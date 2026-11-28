/**
 * P-112 (B-16, "A chunk is chosen while running, not written into the routine"): the runner's See ahead view — the step
 * in view and as many of the next ones as the person pulls into view, as one condensed list. Pure, and nothing here is
 * stored: the chunk is how the runner is being looked at, not part of the routine or the run.
 *
 * The steps in view are exactly where Next goes, press after press: each row is the place the run would be after the
 * rows above it were taken as done (`chunkStep`, the engine's own Next, with what was typed for them) — so a turn's end
 * extends into the next turn, a for each's next item comes round, and the dashed "then:" row names where Next over the
 * chunk will land. A step with insides (a call, a step broken down, a routine held by a value) opens in place as an
 * outline of its smaller steps, to any depth: read and passed over, never edited.
 *
 * Fields: a step's own (the name it gives, a name it asks for) on its row; what a row with insides owes (P-98: what its
 * insides give that something outside reads) on the smaller step that gives it when the row is open, else on the row; a
 * for each inside, whose list is already given, one field per item. Typed words are drafts (`Drafts`), held by the
 * screen until Next takes them (`moves`).
 */
import { callIO, ChunkGiven, chunkStep, eachGives, Env, Frame, Given, givenIn, heldBy, isLiveCall, isRef, isWait, ListRef, MAX_CHUNK, outOf, place, readRun, RunState, view, visibleValue, wordsOf } from './run';
import { RunnerView, runnerView, StepPart, wordsShown } from './runView';
import { Data, Id } from './types';
import { nameKey } from './values';

/** What was typed in a field of the view, by the field's key (`ChunkField.key`). */
export type Drafts = Readonly<Record<string, { text: string; items?: string[]; refs?: (ListRef | null)[] }>>;

export interface ChunkField {
  /** Its drafts key: the row's key and the name (and, for a for each's item, its place in the list). */
  key: string;
  name: string;
  /** The words typed (a draft), else the value as it is. */
  text: string;
  /** The giving step's (or what is owed), else a name the step asks for. */
  gives: boolean;
  /** P-107: a list, given in the list editor (one row per item): its items as they are. */
  list?: true;
  items?: string[];
  refs?: (ListRef | null)[];
  /** P-108: its items can be routines (the list editor offers them). */
  routines?: true;
  /** Given at Next as what its row owes (P-98), not as its own step's. */
  owed?: true;
  /** A for each's item this field is for (what the block gives, item by item). */
  item?: string;
}

export interface ChunkRow {
  /** Stable while the row is in view: the place it stands for (a step in view), or the path of smaller steps (an outline row). */
  key: string;
  /** Its indent: 0 for the shallowest step in view. */
  depth: number;
  /** The words as shown, with the values the run would see there in place. */
  words: string;
  parts: StepPart[];
  kind: 'step' | 'routine' | 'wait';
  /** It has smaller steps that can be laid out in place (Open / Close). */
  insides: boolean;
  open: boolean;
  fields: ChunkField[];
  /** A smaller step of an opened row (read and passed over with it), not a step Next stands on. */
  inner?: true;
}

export interface ChunkView {
  /** Every row drawn, steps in view and the outline rows under any that are open, in order. */
  rows: ChunkRow[];
  /** How many steps are in view (Next takes them all as done). Never more than the run has before it ends. */
  n: number;
  /** "then: <words>": where Next over the chunk lands — the step the dashed row adds. Absent: the run ends there. */
  then?: string;
  /** Next over the chunk ends the run (it reads Done). */
  ends: boolean;
  /** What Next over the chunk gives the engine (`nextStep(runId, undefined, moves)`): one entry per step in view. Empty: Next is the runner's own. */
  moves: ChunkGiven[];
}

/** A simulation's env: nothing it makes is kept. */
const SIM: Env = { now: '1970-01-01T00:00:00.000Z', id: (() => {
  let k = 0;
  return () => `p112-sim-${++k}`;
})() };

const placeKey = (frames: Frame[]) => frames.map((f) => `${f.seq}:${f.at}:${f.round}:${f.each ?? 0}`).join('/');

/** The place the chunk starts from: the view's state is reset whenever this changes (Next, Step in, Undo, a jump). */
export function chunkAt(data: Data, runId: Id): string {
  const run = readRun(data, runId);
  const at = run && place(data, run);
  return at ? placeKey(at.frames) : '';
}

/** What a step in view owes keeps one key wherever its field is drawn (on the row, or on a smaller step once it is open). */
const owedKey = (row: string, name: string) => `${row}|owes|${nameKey(name)}`;

const typed = (drafts: Drafts, key: string) => (Object.prototype.hasOwnProperty.call(drafts, key) ? drafts[key] : undefined);

/** The names a smaller step gives the routine it is in: its own; a call's; a step broken down's (its insides'). */
function givesOf(data: Data, run: RunState, item: Parameters<typeof wordsOf>[2]): string[] {
  if (!item) return [];
  const own = outOf(item);
  if (own) return [own];
  if (!isRef(item)) return [];
  if (isLiveCall(data, item)) return callIO(data, item.ref).gives;
  const s = view(data, run, item.ref);
  return s && !s.named ? (s.each ? eachGives(data, run, s.id) : [...givenIn(data, run, s.id).values()]) : [];
}

/**
 * The view of a run with `want` steps in view (at least one), the rows keyed in `open` laid out, and `drafts` typed.
 * Undefined when the runner shows nothing (no run, nothing to stand on).
 */
export function chunkView(data: Data, runId: Id, want: number, open: ReadonlySet<string>, drafts: Drafts): ChunkView | undefined {
  let d = data;
  const rows: ChunkRow[] = [];
  const moves: ChunkGiven[] = [];
  let ends = false;
  let blocked = false;
  const givenAbove = new Set<string>();
  const limit = Math.max(1, Math.min(MAX_CHUNK, Math.floor(want) || 1));
  for (let i = 0; i < limit; i++) {
    const run = readRun(d, runId);
    const at = run && !run.endedAt ? place(d, run) : undefined;
    const v: RunnerView | undefined = at?.item ? runnerView(d, runId) : undefined;
    if (!run || !at?.item || !v || v.step.kind === 'edge') break;
    const key = placeKey(at.frames);
    const item = at.item;
    const held = heldBy(d, run, at.frames, item);
    const inside = held && 'routine' in held ? held.routine : isRef(item) ? item.ref : undefined;
    const insides = !!inside && !!view(d, run, inside)?.items.length;
    const isOpen = insides && open.has(key);
    const row: ChunkRow = { key, depth: at.frames.length, words: v.step.words, parts: v.step.parts, kind: v.step.kind, insides, open: isOpen, fields: [] };
    // Its own fields: the name it gives, the names it asks for (a list's in the list editor) — but not a name a step
    // above it in view gives: that is typed there (P-110: never ahead).
    for (const f of v.fields) {
      if (!f.gives && givenAbove.has(nameKey(f.name))) continue;
      if (f.gives) givenAbove.add(nameKey(f.name));
      const k = `${key}|${f.name}`;
      const t = typed(drafts, k);
      row.fields.push({ key: k, name: f.name, text: t ? t.text : f.text, gives: f.gives, ...(f.list && { list: true as const }), ...((t?.items ?? f.items) && { items: [...(t?.items ?? f.items!)] }), ...((t?.refs ?? f.refs) && { refs: t?.refs ?? f.refs }), ...(f.routines && { routines: true as const }) });
    }
    // What its insides owe: on the smaller step that gives it when open, else here.
    const owed = new Map(v.nextOwes.map((n) => [nameKey(n), n]));
    for (const k of owed.keys()) givenAbove.add(k);
    const outlineRows: ChunkRow[] = [];
    if (isOpen && inside) outline(d, run, at.frames, inside, key, key, at.frames.length + 1, open, drafts, owed, outlineRows, new Set([inside]), runId);
    for (const n of owed.values()) {
      const k = owedKey(key, n);
      row.fields.push({ key: k, name: n, text: typed(drafts, k)?.text ?? '', gives: true, owed: true });
    }
    // What Next gives the engine for this step: what was typed in its fields.
    const step = movesOf([row, ...outlineRows], drafts);
    const r = chunkStep(d, runId, step, SIM);
    // (Next would be refused here: the step in view is shown alone and Next is Next; a later one is not added.)
    if (!r.ok) {
      if (!rows.length) return { rows: [{ ...row, depth: 0 }, ...outlineRows.map((o) => ({ ...o, depth: o.depth - row.depth }))], n: 1, ends: false, moves: [] };
      blocked = true;
      break;
    }
    rows.push(row, ...outlineRows);
    moves.push(step);
    d = r.data;
    if (readRun(d, runId)?.endedAt) {
      ends = true;
      break;
    }
  }
  if (!rows.length) return undefined;
  // Where Next over the chunk lands: the step the dashed row would add.
  const after = ends || blocked ? undefined : runnerView(d, runId);
  const then = after && after.step.kind !== 'edge' && !readRun(d, runId)?.endedAt ? after.step.parts.map((p) => (p.kind === 'blank' ? `{${p.name}}` : p.text)).join('') || after.step.words : undefined;
  const least = Math.min(...rows.map((r) => r.depth));
  return { rows: rows.map((r) => ({ ...r, depth: r.depth - least })), n: moves.length, ...(then !== undefined && { then }), ends: ends || (!blocked && then === undefined), moves };
}

/** What Next over one step gives: its own fields typed (as given), what was typed for what it owes (one list per name over a for each's items). */
function movesOf(rows: ChunkRow[], drafts: Drafts): ChunkGiven {
  const given: Given[] = [];
  const owed = new Map<string, { name: string; text?: string; items: string[] }>();
  for (const r of rows)
    for (const f of r.fields) {
      const t = typed(drafts, f.key);
      if (!t) continue;
      if (!f.owed) {
        given.push({ name: f.name, text: t.text, ...(t.items && { items: t.items }), ...(t.refs && { refs: t.refs }) });
        continue;
      }
      const o = owed.get(nameKey(f.name)) ?? { name: f.name, items: [] };
      if (f.item !== undefined) {
        if (t.text.trim()) o.items.push(t.text);
      } else o.text = t.text;
      owed.set(nameKey(f.name), o);
    }
  const out = [...owed.values()]
    .map((o) => (o.items.length ? { name: o.name, text: o.items.join('\n'), items: o.items } : { name: o.name, text: o.text ?? '' }))
    .filter((o) => o.text.trim());
  return { ...(given.length && { given }), ...(out.length && { owed: out }) };
}

/**
 * The smaller steps of `seqId`, laid out under the row keyed `base` (depth `depth`), those keyed in `open` laid out in
 * turn. Each name still `owed` is given a field on the first smaller step that gives it (a for each's, one per item
 * of its list when the list is already given), and is then taken off `owed`.
 */
function outline(data: Data, run: RunState, frames: Frame[], seqId: Id, top: string, base: string, depth: number, open: ReadonlySet<string>, drafts: Drafts, owed: Map<string, string>, out: ChunkRow[], seen: Set<Id>, runId: Id) {
  const s = view(data, run, seqId);
  if (!s || out.length > MAX_CHUNK * 4) return;
  for (const i of s.items) {
    const key = `${base}/${i.id}`;
    const words = wordsOf(data, run, i);
    const inside = isRef(i) ? view(data, run, i.ref) : undefined;
    const insides = !!inside?.items.length && !seen.has(inside.id);
    const isOpen = insides && open.has(key);
    const row: ChunkRow = { key, depth, words: inside?.each ? `For each ${inside.each.item}` : words, parts: wordsShown(data, runId, inside?.each ? `For each ${inside.each.item}` : words), kind: isWait(i) ? 'wait' : isRef(i) && inside?.named ? 'routine' : 'step', insides, open: isOpen, fields: [], inner: true };
    const children: ChunkRow[] = [];
    // A for each: what it gives, one field per item of its list (when its list is already given).
    if (inside?.each) {
      const list = inside.each.kept ?? visibleValue(data, run, nameKey(inside.each.list), frames)?.items ?? [];
      for (const n of eachGives(data, run, inside.id)) {
        if (!owed.has(nameKey(n)) || !list.length) continue;
        list.forEach((item, k) => {
          const fk = `${owedKey(top, n)}|${k}`;
          row.fields.push({ key: fk, name: n, text: typed(drafts, fk)?.text ?? '', gives: true, owed: true, item });
        });
        owed.delete(nameKey(n));
      }
    }
    if (isOpen && inside) outline(data, run, frames, inside.id, top, key, depth + 1, open, drafts, owed, children, new Set([...seen, inside.id]), runId);
    // Its own name, or (closed) what its insides give.
    for (const n of isOpen ? (outOf(i) ? [outOf(i)!] : []) : givesOf(data, run, i)) {
      if (!owed.has(nameKey(n))) continue;
      const fk = owedKey(top, n);
      row.fields.push({ key: fk, name: owed.get(nameKey(n))!, text: typed(drafts, fk)?.text ?? '', gives: true, owed: true });
      owed.delete(nameKey(n));
    }
    out.push(row, ...children);
  }
}
