/**
 * B-11 slice 1 (P-86): what the screens read about routines and runs. Pure selectors over the same
 * engine as the verbs (run.ts): nothing here writes, and nothing throws on damaged data — a run or
 * routine that can't be shown reads as undefined, and the screen goes home.
 */
import { advance, Change, currentRun, isRef, isStep, isWait, Item, MAX_DEPTH, openRuns, place, Place, previous, readRoutine, readRun, RoutineEdit, RunState, Said, Seq, Verb, view, wordsOf } from './run';
import { hash } from './sky';
import { Data, Id } from './types';

const tidy = (s: string | undefined) => (s ?? '').trim().replace(/\s+/g, ' ');
const kindOf = (item: Item): 'step' | 'wait' | 'routine' => (isRef(item) ? 'routine' : isWait(item) ? 'wait' : 'step');

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_MS = 864e5;
const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/**
 * Since when, to follow "since", by calendar days where you are: today, yesterday, the day's name
 * within the last week ("Tuesday"), before that the date ("3 November"; with its year when it is
 * another year). '' when it is not a date (leave "since" out). Never how long ago.
 */
export function sinceWords(iso: string, now = new Date()): string {
  const then = new Date(typeof iso === 'string' ? iso : NaN);
  if (Number.isNaN(then.getTime())) return '';
  const days = Math.round((midnight(now) - midnight(then)) / DAY_MS);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return WEEKDAYS[then.getDay()];
  return `${then.getDate()} ${MONTHS[then.getMonth()]}${then.getFullYear() === now.getFullYear() ? '' : ` ${then.getFullYear()}`}`;
}
/** A stored date that is one; undefined for anything else (it is then left out, never shown). */
const dated = (iso: string | undefined): string | undefined => (typeof iso === 'string' && !Number.isNaN(new Date(iso).getTime()) ? iso : undefined);

/** How many tile colours there are; a tile's `hue` is 0 … TILE_HUES - 1. */
export const TILE_HUES = 4;

/** One tile on home: a routine that is on home or has a run going. */
export interface Tile {
  routineId: Id;
  /** Its open run, if it has one. */
  runId?: Id;
  name: string;
  /**
   * running: the one run running. waiting: its run rests on a wait step (running or not). paused: its
   * run is anywhere else and not running (paused, or left by Home, Back or another start): it reads
   * "at <step>" with its reason. idle: nothing going.
   */
  state: 'running' | 'paused' | 'waiting' | 'idle';
  /** The step its run is at, in this run's words. Absent when idle or when it is asking for a step. */
  at?: string;
  /** Its run is at the edge, asking for the next small step. */
  asking?: true;
  /** Why it was paused, tidied. */
  reason?: string;
  /** On a wait: what it waits for, and since when (ISO; `sinceWords` for the words). */
  waitingFor?: string;
  since?: string;
  /** When its run was started (ISO). */
  startedAt?: string;
  /** The running run, or with none running the run left last: marked, never moved. */
  current: boolean;
  /** What its button does: Resume its run, or Start one. */
  action: 'resume' | 'start';
  /** Its colour, its own for good: the palette in the order routines were made, so neighbours differ. */
  hue: number;
}

/**
 * A routine's colour (0 … TILE_HUES - 1): its place among the named routines in the order they were
 * made (removed ones keep their place, so no other colour ever changes), round the palette. The same
 * on its tile, its note and its blocks. Something that is not a named routine: from its id.
 */
export function routineHue(data: Data, routineId: Id): number {
  const rank = hueRanks(data).get(routineId);
  return rank === undefined ? hash(routineId) % TILE_HUES : rank % TILE_HUES;
}
const ranks = new WeakMap<Data['routines'], Map<Id, number>>();
function hueRanks(data: Data): Map<Id, number> {
  const had = ranks.get(data.routines);
  if (had) return had;
  const made = new Map<Id, number>();
  Object.keys(data.routines)
    .map((id) => readRoutine(data, id))
    .filter((s): s is Seq => !!s && s.named)
    .sort(firstMade)
    .forEach((s, i) => made.set(s.id, i));
  ranks.set(data.routines, made);
  return made;
}

function tileOf(data: Data, s: Seq, run: RunState | undefined, current: Id | undefined): Tile {
  const base = { routineId: s.id, name: s.words, hue: routineHue(data, s.id) };
  const at = run && place(data, run);
  if (!run || !at) return { ...base, state: 'idle', current: false, action: 'start' };
  const reason = tidy(run.reason);
  return {
    ...base,
    runId: run.id,
    state: isWait(at.item) ? 'waiting' : run.status === 'running' ? 'running' : 'paused',
    ...(at.item ? { at: wordsOf(data, run, at.item) } : { asking: true as const }),
    ...(reason && { reason }),
    ...(isWait(at.item) && { waitingFor: at.item.wait, ...(dated(run.waitingSince) && { since: run.waitingSince }) }),
    startedAt: run.startedAt,
    current: run.id === current,
    action: 'resume',
  };
}

const firstMade = (a: Seq, b: Seq) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const lastTouched = (a: RunState, b: RunState) => ((a.touchedAt ?? '') > (b.touchedAt ?? '') ? -1 : (a.touchedAt ?? '') < (b.touchedAt ?? '') ? 1 : a.id < b.id ? -1 : 1);

/** The run to mark on home: the one the app is on, else the open run touched last. */
const markedRun = (data: Data): Id | undefined => (currentRun(data) ?? [...openRuns(data)].sort(lastTouched)[0])?.id;

/**
 * Home's tiles: every routine that is on home or has a run going, in a FIXED order (when each was
 * first made; nothing is ranked). A removed routine is a tile only while a run of it is going.
 */
export function homeTiles(data: Data): Tile[] {
  const open = new Map<Id, RunState>();
  for (const r of [...openRuns(data)].sort(lastTouched).reverse()) open.set(r.routineId, r);
  const current = markedRun(data);
  return Object.keys(data.routines)
    .map((id) => readRoutine(data, id))
    .filter((s): s is Seq => !!s && (open.has(s.id) || (s.home && !s.removedAt)))
    .sort(firstMade)
    .map((s) => tileOf(data, s, open.get(s.id), current));
}

/** Where the app opens: the runner while a run is running, the paused screen while the run it is on is paused, else home. */
export function leftOff(data: Data): { kind: 'runner' | 'paused' | 'home'; runId?: Id } {
  const cur = currentRun(data);
  if (!cur || !place(data, cur)) return { kind: 'home' };
  return { kind: cur.status === 'running' ? 'runner' : 'paused', runId: cur.id };
}

/** The runner's screen for a run. */
export interface RunnerView {
  runId: Id;
  routineId: Id;
  /** The run's routine (its first layer). */
  name: string;
  /** running / paused: the run the app is on. left: open, but not the one the app is on. ended. */
  status: 'running' | 'paused' | 'left' | 'ended';
  /** The context line: the level it is in ("Done with <level>")… */
  level: string;
  /** …and the level below it, when there is one. */
  parent?: string;
  /** 1 on the first layer. */
  depth: number;
  /** The note. edge: nothing to stand on; the note is a field for the next small step. */
  step: { kind: 'step' | 'routine' | 'wait' | 'edge'; words: string; seq: Id; itemId?: Id };
  /** The corner mark: the last step of a round (spoken "Last step of this round"). */
  lastOfRound: boolean;
  /** There is a step before this one in this level (Back to <step>). */
  canBack: boolean;
  /** The middle button: Break it down, Step in, or dimmed (a wait, the edge, a routine with nothing in it, the deepest level). */
  middle: 'break' | 'stepIn' | 'disabled';
  /** The filled button: Next, "It's happened" (a wait), or at the edge the field's own (Add the step). */
  next: 'next' | 'itsHappened' | 'edge';
  /** On a wait step: what for, and since when (ISO). */
  waiting?: { words: string; since?: string };
  /** This step is this run's own: reworded, broken down or added in this run, and not kept yet. */
  thisRunOnly: boolean;
}

const lastOfRound = (at: Place) => !!at.item && at.seq.repeatFrom !== undefined && at.seq.items[at.seq.items.length - 1]?.id === at.item.id;
const waitingOf = (run: RunState, at: Place) => (isWait(at.item) ? { words: at.item.wait, ...(dated(run.waitingSince) && { since: run.waitingSince }) } : undefined);
/** The newest unkept change of this run that made this item what it reads now. */
const changeFor = (run: RunState, seq: Id, item: Id): Change | undefined =>
  [...run.changes].reverse().find((c) => c.seq === seq && ((c.kind === 'add' && c.item.id === item) || ((c.kind === 'reword' || c.kind === 'breakdown') && c.item === item)));

export function runnerView(data: Data, runId: Id): RunnerView | undefined {
  const run = readRun(data, runId);
  const at = run && place(data, run);
  if (!run || !at) return undefined;
  const { item, seq, frames } = at;
  const below = frames.length > 1 ? view(data, run, frames[frames.length - 2].seq) : undefined;
  const target = isRef(item) ? view(data, run, item.ref) : undefined;
  const waiting = waitingOf(run, at);
  return {
    runId,
    routineId: run.routineId,
    name: readRoutine(data, run.routineId)?.words ?? '',
    status: run.endedAt ? 'ended' : (run.status ?? 'left'),
    level: seq.words,
    ...(below && { parent: below.words }),
    depth: frames.length,
    step: item ? { kind: kindOf(item), words: wordsOf(data, run, item), seq: seq.id, itemId: item.id } : { kind: 'edge', words: '', seq: seq.id },
    lastOfRound: lastOfRound(at),
    canBack: !!previous(data, run),
    middle: frames.length >= MAX_DEPTH ? 'disabled' : isStep(item) ? 'break' : target?.items.length ? 'stepIn' : 'disabled',
    next: !item ? 'edge' : isWait(item) ? 'itsHappened' : 'next',
    ...(waiting && { waiting }),
    thisRunOnly: !!item && !!changeFor(run, seq.id, item.id),
  };
}

/** One of this run's changes, for a Keep row. */
export interface ChangeRow {
  id: Id;
  kind: Change['kind'];
  seq: Id;
  /** The name of the sequence it would be kept in. */
  in: string;
  /** reword: the new words. breakdown: the step broken down. add, remove, move: the step. repeat: ''. */
  words: string;
  /** reword: the routine's own words. */
  was?: string;
  /** breakdown: the steps it was broken into, as this run reads them. */
  steps?: string[];
  /** repeat: the number for this run, or 'until' (until I'm done). */
  repeat?: number | 'until';
  /** Already shown once on leaving its level. */
  offered: boolean;
}

function changeRow(data: Data, run: RunState, c: Change): ChangeRow {
  const own = readRoutine(data, c.seq);
  const base = { id: c.id, kind: c.kind, seq: c.seq, in: own?.words ?? '', offered: !!c.offered };
  const plain: RunState = { ...run, changes: [] };
  const ownWords = (id: Id) => wordsOf(data, plain, own?.items.find((i) => i.id === id));
  if (c.kind === 'reword') return { ...base, words: c.text, was: ownWords(c.item) };
  if (c.kind === 'breakdown') return { ...base, words: readRoutine(data, c.into)?.words ?? '', steps: (view(data, run, c.into)?.items ?? []).map((i) => wordsOf(data, run, i)) };
  if (c.kind === 'add') return { ...base, words: wordsOf(data, run, c.item) };
  if (c.kind === 'repeat') return { ...base, words: '', repeat: c.repeat ?? 'until' };
  return { ...base, words: ownWords(c.item) };
}

/** This run's changes that are not kept yet, oldest first (an ended run's too: Keep still works there). */
export function unkeptChanges(data: Data, runId: Id): ChangeRow[] {
  const run = readRun(data, runId);
  return run ? run.changes.map((c) => changeRow(data, run, c)) : [];
}

/** The changes a verb offered (`Result.offer`, or their ids), as Keep rows; the ones kept or dropped since are left out. */
export function describeChanges(data: Data, runId: Id, changes: (Change | Id)[]): ChangeRow[] {
  const ids = new Set(changes.map((c) => (typeof c === 'string' ? c : c.id)));
  return unkeptChanges(data, runId).filter((c) => ids.has(c.id));
}

/** The pull-up panel for a run. */
export interface PanelView {
  /** "Round 2 of 3" (n, of); "Round 4" (n only: until I'm done, or the number is below the round); absent: nothing to show. */
  round?: { n: number; of?: number };
  /** "Last step of the round". */
  lastOfRound: boolean;
  /** "then: <words>": what Next goes to. Absent when Next ends the run or asks at the edge. */
  then?: string;
  /** "This run only": a level it is in has an unkept change. */
  thisRunOnly: boolean;
  /** "Back to <words>": the step before, when there is one. */
  backTo?: string;
  /** On a wait step: what for, since when (ISO). */
  wait?: { words: string; since?: string };
  /** "Keep in <name>": the unkept changes of the levels it is in. */
  keepIn?: { name: string; changes: ChangeRow[] };
  /** Change the words is for a step or a wait (not a routine's name, not the edge). */
  canChangeWords: boolean;
  /** Why it was paused, tidied: readable here until the first Next after Resume drops it (P-86 part 2). */
  reason?: string;
}

export function panelView(data: Data, runId: Id): PanelView | undefined {
  const run = readRun(data, runId);
  const at = run && place(data, run);
  if (!run || !at) return undefined;
  const { item, seq, frame, frames } = at;
  const index = item ? seq.items.findIndex((i) => i.id === item.id) : -1;
  const looping = seq.repeatFrom !== undefined && index >= seq.repeatFrom;
  const next = item && !run.endedAt ? advance(data, run, frames) : undefined;
  const to = next && !next.ended && !next.asking ? place(data, { ...run, frames: next.frames }) : undefined;
  const back = previous(data, run);
  const inStack = new Set(frames.map((f) => f.seq));
  const mine = run.changes.filter((c) => inStack.has(c.seq));
  // Kept in the nearest named routine it is in (a breakdown has no name of its own).
  const named = [...frames].reverse().map((f) => view(data, run, f.seq)).find((s) => s?.named) ?? view(data, run, run.routineId);
  const wait = waitingOf(run, at);
  return {
    ...(looping && { round: { n: frame.round, ...(seq.repeat !== undefined && frame.round <= seq.repeat && { of: seq.repeat }) } }),
    lastOfRound: lastOfRound(at),
    ...(to?.item && { then: wordsOf(data, run, to.item) }),
    thisRunOnly: mine.length > 0,
    ...(back && { backTo: wordsOf(data, run, seq.items.find((i) => i.id === back.at)) }),
    ...(wait && { wait }),
    ...(mine.length && { keepIn: { name: named?.words ?? '', changes: mine.map((c) => changeRow(data, run, c)) } }),
    canChangeWords: !!item && !isRef(item) && !run.endedAt,
    ...(tidy(run.reason) && { reason: tidy(run.reason) }),
  };
}

/** The paused screen for a run (titled "Waiting" when it rests on a wait step). */
export interface PausedView {
  runId: Id;
  name: string;
  kind: 'paused' | 'waiting';
  /** The step it is at ('' when it is asking for one). */
  at: string;
  asking: boolean;
  /** The reason exactly as typed ('' when none): the field is bound to it. */
  reason: string;
  waiting?: { words: string; since?: string };
  /** What else can be resumed, last touched first, each with its own Resume. (No levels in this slice: one list.) */
  others: Tile[];
}

export function pausedView(data: Data, runId: Id): PausedView | undefined {
  const run = readRun(data, runId);
  const at = run && !run.endedAt ? place(data, run) : undefined;
  if (!run || !at) return undefined;
  const waiting = waitingOf(run, at);
  const current = markedRun(data);
  const others = openRuns(data)
    .filter((r) => r.id !== runId && !!place(data, r))
    .sort(lastTouched)
    .map((r) => tileOf(data, readRoutine(data, r.routineId)!, r, current));
  return {
    runId,
    name: readRoutine(data, run.routineId)?.words ?? '',
    kind: waiting ? 'waiting' : 'paused',
    at: wordsOf(data, run, at.item),
    asking: !at.item,
    reason: run.reason ?? '',
    ...(waiting && { waiting }),
    others,
  };
}

/** One line of See it all / Jump to…. */
export interface SeeRow {
  /** The item ids from the first layer down to this one: what Jump here takes (`{ path }`). */
  path: Id[];
  /** 0 on the first layer. */
  depth: number;
  seq: Id;
  itemId: Id;
  kind: 'step' | 'wait' | 'routine';
  words: string;
  /** The run is on this step. */
  here: boolean;
  /** A routine the run is inside (on the way to "here"). */
  within: boolean;
  /** This run's own (reworded, broken down or added in this run, not kept), and the change that made it so. */
  thisRunOnly: boolean;
  changeId?: Id;
  /** The Repeat divider stands before this line: `repeat` rounds, or until I'm done when absent. */
  divider?: { repeat?: number };
}

export interface SeeItAll {
  runId: Id;
  /** "This run of <name>". */
  name: string;
  /** The levels the run is in, bottom first, for "start again" (`{ level }`); the last is where it is. */
  levels: { level: number; words: string; here: boolean }[];
  rows: SeeRow[];
}

/** No list is longer than this (hand-made data with routines inside routines many times over). */
const MAX_ROWS = 2000;

/** The whole run as it reads now: every step, routines opened in place (never inside themselves), bounded. */
export function seeItAll(data: Data, runId: Id): SeeItAll | undefined {
  const run = readRun(data, runId);
  const at = run && place(data, run);
  if (!run || !at) return undefined;
  const { frames } = at;
  const rows: SeeRow[] = [];
  const walk = (seqId: Id, path: Id[], open: Id[], onWay: boolean) => {
    const s = view(data, run, seqId);
    if (!s) return;
    const depth = path.length;
    const frame = onWay ? frames[depth] : undefined;
    s.items.forEach((item, i) => {
      if (rows.length >= MAX_ROWS) return;
      const mine = changeFor(run, s.id, item.id);
      const on = frame?.at === item.id;
      // Inside it only if the next level is this routine (an edit can leave a level whose step moved on).
      const within = on && isRef(item) && frames[depth + 1]?.seq === item.ref;
      rows.push({
        path: [...path, item.id],
        depth,
        seq: s.id,
        itemId: item.id,
        kind: kindOf(item),
        words: wordsOf(data, run, item),
        here: on && depth === frames.length - 1,
        within,
        thisRunOnly: !!mine,
        ...(mine && { changeId: mine.id }),
        ...(s.repeatFrom === i && { divider: { ...(s.repeat !== undefined && { repeat: s.repeat }) } }),
      });
      if (isRef(item) && !open.includes(item.ref) && depth + 1 < MAX_DEPTH) walk(item.ref, [...path, item.id], [...open, item.ref], within);
    });
  };
  walk(run.routineId, [], [run.routineId], true);
  return {
    runId,
    name: readRoutine(data, run.routineId)?.words ?? '',
    levels: frames.map((f, level) => ({ level, words: view(data, run, f.seq)?.words ?? '', here: level === frames.length - 1 })),
    rows,
  };
}

/** A routine for the plain editor. Undefined when it is gone or removed. */
export interface RoutineView {
  id: Id;
  name: string;
  named: boolean;
  /** true: the edge is open; false: "ends here". */
  open: boolean;
  /** The Repeat divider stands before items[repeatFrom]; absent: no divider. */
  repeatFrom?: number;
  /** A number of rounds; absent: until I'm done. */
  repeat?: number;
  items: { id: Id; kind: 'step' | 'wait' | 'routine'; words: string }[];
  /** Its open run, if one is going (Remove is refused then). */
  runId?: Id;
}

export function routineView(data: Data, routineId: Id): RoutineView | undefined {
  const s = readRoutine(data, routineId);
  if (!s || s.removedAt) return undefined;
  const going = openRuns(data).find((r) => r.routineId === routineId);
  return {
    id: s.id,
    name: s.words,
    named: s.named,
    open: s.open,
    ...(s.repeatFrom !== undefined && { repeatFrom: s.repeatFrom }),
    ...(s.repeat !== undefined && { repeat: s.repeat }),
    items: s.items.map((i) => ({ id: i.id, kind: kindOf(i), words: isRef(i) ? (readRoutine(data, i.ref)?.words ?? '') : isWait(i) ? i.wait : i.text })),
    ...(going && { runId: going.id }),
  };
}

/** What an action was, for its notice and its Undo: a verb of the engine, or an edit in the routine editor. */
export type Acted = Verb['kind'] | 'editRoutine';

const LABELS: Record<Acted, string> = {
  start: 'Start',
  new: 'Start',
  resume: 'Resume',
  pause: 'Pause',
  reason: 'Reason',
  home: 'Home',
  next: 'Next',
  done: 'Done',
  stepIn: 'Step in',
  breakDown: 'Break it down',
  edgeStep: 'Add a step',
  words: 'Change the words',
  back: 'Back',
  jump: 'Jump',
  keep: 'Keep',
  drop: 'Drop',
  edit: 'Change',
  editRoutine: 'Change',
};

/**
 * The notice after an action. `text`: what it says, '' when the action speaks for itself (the step
 * simply changed) — "Finished <name>" for what finished by itself (the outermost level left), "Done
 * with <name>" for what Done left, "Jumped from <step>". `label`: what its Undo takes back ("Undo
 * Next"); on a wait step Next is "It's happened".
 */
export function noticeFor(verb: Acted, said: Said | undefined, onWait = false): { text: string; label: string } {
  const label = verb === 'next' && onWait ? 'It’s happened' : LABELS[verb];
  if (said?.kind === 'ended') return { text: `${verb === 'done' ? 'Done with' : 'Finished'} ${said.name}`, label };
  if (said?.kind === 'finished') return { text: verb === 'done' ? `Done with ${said.names[0]}` : `Finished ${said.names[said.names.length - 1]}`, label };
  if (said?.kind === 'jumped') return { text: `Jumped from ${said.from}`, label };
  return { text: '', label };
}

const quoted = (words: string) => `“${tidy(words)}”`;

/**
 * What an action did, naming the thing it did it to, for its notice ("Removed “Tailor the CV”" beside
 * Undo): read from the data BEFORE the action. '' for what speaks for itself (Next, Done, Pause…:
 * the step simply changed, or `noticeFor` says it).
 */
export function whatChanged(data: Data, verb: Verb | { kind: 'editRoutine'; routineId: Id; edit: RoutineEdit }): string {
  if (verb.kind === 'editRoutine') {
    const s = readRoutine(data, verb.routineId);
    const e = verb.edit;
    const item = (id: Id) => {
      const i = s?.items.find((x) => x.id === id);
      return quoted(!i ? '' : isRef(i) ? (readRoutine(data, i.ref)?.words ?? '') : isWait(i) ? i.wait : i.text);
    };
    if (e.kind === 'addStep') return `Added ${quoted(e.text)}`;
    if (e.kind === 'addWait') return `Added a wait for ${quoted(e.wait)}`;
    if (e.kind === 'remove') return `Removed ${item(e.item)}`;
    if (e.kind === 'move') return `Moved ${item(e.item)}`;
    if (e.kind === 'reword') return `Changed ${item(e.item)}`;
    if (e.kind === 'rename') return `Renamed ${quoted(s?.words ?? '')}`;
    if (e.kind === 'removeRoutine') return `Removed ${quoted(s?.words ?? '')}`;
    if (e.kind === 'open') return 'Changed Ends here';
    return 'Changed Repeat from here';
  }
  if (!('runId' in verb)) return '';
  const run = readRun(data, verb.runId);
  if (!run) return '';
  const at = place(data, run);
  const words = (seqId: Id, id: Id) => quoted(wordsOf(data, run, view(data, run, seqId)?.items.find((x) => x.id === id)));
  if (verb.kind === 'words') return at?.item ? `Changed ${quoted(wordsOf(data, run, at.item))}` : '';
  if (verb.kind === 'edgeStep') return `Added ${quoted(verb.text)}`;
  if (verb.kind === 'breakDown') return verb.at ? `Broke down ${words(verb.at.seq, verb.at.item)}` : at?.item ? `Broke down ${quoted(wordsOf(data, run, at.item))}` : '';
  if (verb.kind === 'keep' || verb.kind === 'drop') {
    const which = verb.change;
    const rows = unkeptChanges(data, verb.runId).filter((c) => which === 'all' || (Array.isArray(which) ? which.includes(c.id) : c.id === which));
    if (!rows.length) return '';
    const name = (c: ChangeRow) => (c.kind === 'repeat' ? 'Repeat from here' : quoted(c.words));
    if (verb.kind === 'drop') return `Dropped ${name(rows[0])}`;
    const into = rows.every((c) => c.in === rows[0].in) && rows[0].in ? ` in ${rows[0].in}` : '';
    return rows.length === 1 ? `Kept ${name(rows[0])}${into}` : `Kept${into}`;
  }
  if (verb.kind === 'edit') {
    const e = verb.edit;
    if (e.kind === 'add') return `Added ${quoted(e.text)}`;
    if (e.kind === 'addWait') return `Added a wait for ${quoted(e.wait)}`;
    if (e.kind === 'remove') return `Removed ${words(e.seq, e.item)}`;
    if (e.kind === 'reword') return `Changed ${words(e.seq, e.item)}`;
    return 'Changed Repeat from here';
  }
  return '';
}
