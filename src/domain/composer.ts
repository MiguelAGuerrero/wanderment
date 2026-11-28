/**
 * P-114 (B-19 slice 1, the owner: "a composer of sorts guide you through a set up of a routine … leverage the library
 * functions as a scaffold"): starting something new through a composer. Pure: the five starts on New's sheet, the mark
 * from the first words typed, the questions, and what each answer does to the routine.
 *
 * - **A start is a library template** (`libraryContent.ts`), copied by the existing Copy path (`copyFromLibrary`) under
 *   a name made from what was typed (`composedName`, values.ts). The copy is saved at once, as + New saves its empty
 *   routine; its draft is begun in the same write (P-115), and **every answer goes into that draft** (`draftEdit`), so
 *   the composer ends in Plan in Edit with its result unsaved: Save keeps it, Cancel discards the answers.
 * - **An answer replaces the template step that would have asked for it when run** (B-19 journey 4), in the person's
 *   own words; template steps not asked about stay in the library's words, and say "it" for what is fixed for this
 *   routine (its aim). An answer of several lines is a list kept in the routine (a for each's kept list: P-108).
 * - **Nothing typed leaves that part as the template has it.** Every answer on its own leaves a valid routine.
 *
 * Slice 1 composes Make it and Work it out; Learn it, Find out and Decide copy their template under the name and go
 * straight to Plan (slice 2 adds their questions and the plain follow-ups).
 */
import { beginDraft, DraftResult, draftData, draftEdit } from './draft';
import { copyFromLibrary } from './library';
import { bindingsOf, callIO, Env, isRef, isStep, Item, outOf, readRoutine, RoutineEdit, slotOf } from './run';
import { Data, Id } from './types';
import { composedName, joinItems, nameKey, parseWords, StartKey, typedLine, whatFor } from './values';

export type { StartKey } from './values';

/** One question: its words (woven from what was typed, or plain), its field's hint, and whether its answer is several lines. */
export interface Ask {
  key: 'for' | 'done' | 'ways' | 'first' | 'after';
  question: (typed: string) => string;
  placeholder: string;
  /** Several things, one per line (a multi-line field; Return is a new line). */
  lines: boolean;
}

export interface Start {
  key: StartKey;
  /** As the sheet shows it ("Make it"). */
  label: string;
  /** Its one short line (the owner's words, B-19 "Answered by the owner"). */
  line: string;
  /** The library template it copies. */
  lib: Id;
  /** A name the template's steps read that this routine fixes (its aim): they say "it" instead. */
  aim?: string;
  /** Slice 1: Make it and Work it out ask; the rest have none yet. */
  asks: Ask[];
}

const plain = (q: string) => () => q;
const ONE_PER_LINE = 'One per line';

/** The five starts, in the sheet's fixed order (B-19 journey 1; the default first). */
export const STARTS: readonly Start[] = [
  {
    key: 'work',
    label: 'Work it out',
    line: 'figure it out as you go',
    lib: 'lib-work-out',
    aim: 'aim',
    asks: [
      { key: 'first', question: plain('What’s the first small step?'), placeholder: 'Something you could do now', lines: false },
      { key: 'after', question: plain('What comes after that, if you know?'), placeholder: ONE_PER_LINE, lines: true },
    ],
  },
  {
    key: 'make',
    label: 'Make it',
    line: 'something to build or finish',
    lib: 'lib-make',
    asks: [
      { key: 'for', question: whatFor, placeholder: 'Who it’s for, and what it should do', lines: false },
      { key: 'done', question: plain('How will you know it’s done?'), placeholder: ONE_PER_LINE, lines: true },
      { key: 'ways', question: plain('What are a few ways you could make it?'), placeholder: ONE_PER_LINE, lines: true },
    ],
  },
  { key: 'learn', label: 'Learn it', line: 'something to get better at', lib: 'lib-learn', asks: [] },
  { key: 'find', label: 'Find out', line: 'a question to answer', lib: 'lib-find-out', asks: [] },
  { key: 'decide', label: 'Decide', line: 'a choice to make', lib: 'lib-decide', asks: [] },
];

export const startOf = (key: StartKey): Start => STARTS.find((s) => s.key === key)!;

/**
 * B-19 journey 1, "a little inference": the start the first words typed point to — or undefined when nothing is
 * recognised (then the sheet fills Work it out, the default: the owner's ruling). It never chooses: it only marks.
 */
export function markStart(typed: string): StartKey | undefined {
  const t = typedLine(typed).toLowerCase().replace(/^to\s+/, '');
  if (!t) return undefined;
  if (/^(learn|learning)\b/.test(t) || /^(get|getting) better at\b/.test(t)) return 'learn';
  if (/^(find|finding) out\b/.test(t) || /^(why|how)\b/.test(t)) return 'find';
  if (/^(decide|deciding|whether)\b/.test(t)) return 'decide';
  if (/^(make|making|build|building|write|writing|finish|finishing)\b/.test(t)) return 'make';
  if (/\?$/.test(t)) return 'find';
  if (/\sor\s/.test(t)) return 'decide';
  return undefined;
}

/** What a list answer holds: one item per line, each as typed (trimmed), blank lines dropped. Never split at commas. */
export const linesOf = (text: string): string[] =>
  (typeof text === 'string' ? text.split(/\r?\n/) : [])
    .map((l) => l.trim())
    .filter(Boolean);

/** Words that go into a step as they are: a brace is literal ("{{"), never a value's name. */
const literal = (s: string) => s.replace(/\{/g, '{{').replace(/\}/g, '}}');

// ───────── reading the routine as it stands (the draft) ─────────

const itemsOf = (view: Data, seq: Id): Item[] => readRoutine(view, seq)?.items ?? [];
/** The call's routine, if the row is a call (a named routine used as a step). */
const calleeOf = (view: Data, i: Item): Id | undefined => (isRef(i) && readRoutine(view, i.ref)?.named ? i.ref : undefined);
/** The row gives `name` (a step that gives it, or a call whose routine does). */
const gives = (view: Data, i: Item, name: string): boolean => {
  if (outOf(i) !== undefined) return nameKey(outOf(i)!) === nameKey(name);
  const c = calleeOf(view, i);
  return !!c && callIO(view, c).gives.some((g) => nameKey(g) === nameKey(name));
};
/** The inputs of a call that read `name` where it runs: bound to it by name, or not bound and called so. */
const inputsReading = (view: Data, i: Item, name: string): string[] => {
  const c = calleeOf(view, i);
  if (!c) return [];
  const binds = bindingsOf(i);
  return callIO(view, c).asks.filter((input) => {
    const b = binds.find((x) => nameKey(x.input) === nameKey(input));
    return b ? 'name' in b && nameKey(b.name) === nameKey(name) : nameKey(input) === nameKey(name);
  });
};
/** The for each row over `list` (given above, not kept yet), and the sequence it opens. */
const eachOver = (view: Data, seq: Id, list: string): { row: Item; block: Id } | undefined => {
  for (const i of itemsOf(view, seq)) {
    const s = isRef(i) ? readRoutine(view, i.ref) : undefined;
    if (s?.each && nameKey(s.each.list) === nameKey(list)) return { row: i, block: s.id };
  }
  return undefined;
};

/** Applies edits one after another into the draft, each reading the draft as the last left it. Refused whole if one is. */
class Into {
  constructor(
    public data: Data,
    private root: Id,
    private env: Env,
  ) {}
  failed: DraftResult | undefined;
  get view(): Data {
    return draftData(this.data, this.root);
  }
  edit(seq: Id, edit: RoutineEdit): boolean {
    if (this.failed) return false;
    const r = draftEdit(this.data, this.root, { seq, edit }, this.env);
    if (!r.ok) {
      this.failed = r;
      return false;
    }
    this.data = r.data;
    return true;
  }
}

/** The step that would have given `name` is the answer instead: its words, giving nothing; what read it is given the words. */
function answerStep(w: Into, root: Id, name: string, answer: string) {
  const step = itemsOf(w.view, root).find((i) => isStep(i) && outOf(i) !== undefined && nameKey(outOf(i)!) === nameKey(name));
  if (!step) return;
  w.edit(root, { kind: 'reword', item: step.id, text: literal(answer) });
  w.edit(root, { kind: 'gives', item: step.id });
  fixValue(w, root, name, answer, false);
}

/** `name` is fixed for this routine: what gave it (a step that would have asked, a call) goes, and each call reading it is given `words`. */
function fixValue(w: Into, root: Id, name: string, words: string, dropGivers = true) {
  for (const i of itemsOf(w.view, root)) for (const input of inputsReading(w.view, i, name)) w.edit(root, { kind: 'bind', item: i.id, input, to: { typed: words } });
  if (!dropGivers) return;
  for (const i of itemsOf(w.view, root)) if (gives(w.view, i, name)) w.edit(root, { kind: 'remove', item: i.id });
}

/**
 * The for each over `list` holds these items, kept in the routine (P-108): the list's makers (the step or call that
 * would have given it when run) go, a call that read it is given the items in words, and the block is made again as a
 * kept list with the same steps inside. Already kept: the items are added to it.
 */
function keepList(w: Into, root: Id, list: string, items: string[]) {
  if (!items.length) return;
  const had = eachOver(w.view, root, list);
  if (!had) return;
  const block = readRoutine(w.view, had.block)!;
  if (block.each?.kept) {
    w.edit(had.block, { kind: 'keptList', items: [...block.each.kept, ...items] });
    return;
  }
  const inside = itemsOf(w.view, had.block);
  // (Only plain steps, routine rows and calls are made again; anything else and the block is left as the template has it.)
  if (inside.some((i) => !isStep(i) && !calleeOf(w.view, i))) return;
  const each = block.each!;
  const rows = itemsOf(w.view, root);
  /** The rows that stood before it, nearest first: the new block goes after the first of them still there. */
  const before = rows.slice(0, rows.findIndex((i) => i.id === had.row.id)).reverse();
  w.edit(root, { kind: 'remove', item: had.row.id });
  for (const i of itemsOf(w.view, root)) for (const input of inputsReading(w.view, i, list)) w.edit(root, { kind: 'bind', item: i.id, input, to: { typed: joinItems(items) } });
  for (const i of itemsOf(w.view, root)) if (gives(w.view, i, list)) w.edit(root, { kind: 'remove', item: i.id });
  const at = before.find((b) => itemsOf(w.view, root).some((i) => i.id === b.id))?.id ?? null;
  if (!w.edit(root, { kind: 'addEach', item: each.item, list: each.list, own: 'kept', after: at })) return;
  const made = eachOver(w.view, root, list);
  if (!made) return;
  w.edit(made.block, { kind: 'keptList', items });
  for (const i of inside) {
    const last = () => itemsOf(w.view, made.block).at(-1)!;
    const slot = slotOf(i);
    const callee = calleeOf(w.view, i);
    if (slot) w.edit(made.block, { kind: 'addSlot', name: slot });
    else if (callee) {
      if (!w.edit(made.block, { kind: 'addCall', routine: callee })) continue;
      const row = last();
      for (const b of bindingsOf(i)) w.edit(made.block, { kind: 'bind', item: row.id, input: b.input, to: 'typed' in b ? { typed: b.typed } : 'name' in b ? { name: b.name } : { ask: true } });
    } else if (isStep(i)) {
      if (!w.edit(made.block, { kind: 'addStep', text: i.text })) continue;
      const out = outOf(i);
      if (out) w.edit(made.block, { kind: 'gives', item: last().id, name: out });
    }
  }
}

/** A start's own aim, fixed for this routine: the steps that read it say "it" (B-19 journey 4: never a name in braces). */
function sayIt(w: Into, root: Id, aim: string) {
  for (const i of itemsOf(w.view, root)) {
    if (!isStep(i) || !parseWords(i.text).some((p) => p.kind === 'name' && p.key === nameKey(aim))) continue;
    const text = parseWords(i.text)
      .map((p) => (p.kind === 'text' ? literal(p.text) : p.key === nameKey(aim) ? 'it' : p.raw))
      .join('');
    w.edit(root, { kind: 'reword', item: i.id, text });
  }
}

export type Composed = (DraftResult & { ok: true; routineId: Id; name: string }) | (DraftResult & { ok: false });

/**
 * A start chosen: its template copied under the name made from what was typed, its draft begun, and what is fixed for
 * this routine said ("it") — one write, for the store to keep with one Undo. Refused as Copy is (`same-name`: a name in
 * use, nothing written; `empty`: nothing typed).
 */
export function beginCompose(data: Data, start: StartKey, typed: string, env: Env): Composed {
  const s = startOf(start);
  const name = composedName(start, typed);
  if (!name) return { ok: false, data, reason: 'empty' };
  const c = copyFromLibrary(data, s.lib, env, { words: name });
  if (!c.ok || !c.routineId) return { ok: false, data, reason: c.reason ?? 'cannot' };
  const b = beginDraft(c.data, c.routineId, env);
  if (!b.ok) return b;
  const w = new Into(b.data, c.routineId, env);
  if (s.aim) sayIt(w, c.routineId, s.aim);
  if (w.failed) return w.failed as DraftResult & { ok: false };
  return { ok: true, data: w.data, view: w.view, routineId: c.routineId, name };
}

/**
 * One answer into the routine's draft (B-19 journey 4): the template step that would have asked for it replaced by the
 * person's words, a list kept in the routine. Nothing typed: nothing changes. Refused whole if any edit is (then nothing
 * is written).
 */
export function composeAnswer(data: Data, rootId: Id, start: StartKey, ask: Ask['key'], text: string, env: Env): DraftResult {
  const w = new Into(data, rootId, env);
  const one = typedLine(text);
  const lines = linesOf(text);
  if (start === 'make') {
    if (ask === 'for' && one) answerStep(w, rootId, 'brief', one);
    if (ask === 'done' && lines.length) fixValue(w, rootId, 'standard', joinItems(lines));
    if (ask === 'ways' && lines.length) keepList(w, rootId, 'options', lines);
  }
  if (start === 'work' && (ask === 'first' || ask === 'after')) keepList(w, rootId, 'steps', ask === 'first' ? (one ? [one] : []) : lines);
  if (w.failed) return w.failed;
  return { ok: true, data: w.data, view: w.view, routineId: rootId };
}

/** What Continue says it added, for a screen reader (B-19 edges: "Added 3 parts"). '' for nothing. */
export function addedWords(ask: Ask, text: string): string {
  if (!ask.lines) return typedLine(text) ? `Added “${typedLine(text)}”` : '';
  const n = linesOf(text).length;
  const what = ask.key === 'done' ? (n === 1 ? 'thing done means' : 'things done means') : ask.key === 'ways' ? (n === 1 ? 'way' : 'ways') : n === 1 ? 'step' : 'steps';
  return n ? `Added ${n} ${what}` : '';
}
