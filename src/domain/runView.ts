/**
 * B-11 slice 1 (P-86), B-12 (P-90): what the screens read about routines and runs — the runner, Plan,
 * home, the paused screen. Pure selectors over the same engine as the verbs (run.ts): nothing here
 * writes, and nothing throws on damaged data — a run or routine that can't be shown reads as
 * undefined, and the screen goes home.
 */
import { advance, currentRun, isPlanning, isRef, isRunning, isWait, Item, MAX_DEPTH, openRuns, place, Place, previous, readRoutine, readRun, RoutineEdit, RunState, Said, Seq, Verb, view, wordsOf } from './run';
import { hash } from './hash';
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
   * "at <step>" with its reason. planning (P-90): its run was left in Plan, or is at the edge: it reads
   * "planning · at <step>" ("planning" alone at the edge), whatever step that is. idle: nothing going.
   */
  state: 'running' | 'paused' | 'waiting' | 'planning' | 'idle';
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
  /** What its one button does: Resume its run; Start one; or, for a run in Plan, Plan (`planRun(runId)`, then its Plan). */
  action: 'resume' | 'start' | 'plan';
  /** Nothing going and no steps yet: there is nothing to start (Start is refused `empty`); its Plan is where the first step is added. */
  empty?: true;
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
  if (!run || !at) return { ...base, state: 'idle', current: false, action: 'start', ...(!s.items.length && { empty: true as const }) };
  const reason = tidy(run.reason);
  const planning = isPlanning(data, run);
  return {
    ...base,
    runId: run.id,
    state: planning ? 'planning' : isWait(at.item) ? 'waiting' : isRunning(data, run) ? 'running' : 'paused',
    ...(at.item ? { at: wordsOf(data, run, at.item) } : { asking: true as const }),
    ...(reason && { reason }),
    ...(isWait(at.item) && { waitingFor: at.item.wait, ...(dated(run.waitingSince) && { since: run.waitingSince }) }),
    startedAt: run.startedAt,
    current: run.id === current,
    action: planning ? 'plan' : 'resume',
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

/**
 * P-95: home's tiles as shown — the run the app is on (running, paused or in Plan) first, so the way
 * back to it is the first thing on home; every other tile keeps `homeTiles`' fixed order.
 */
export function homeShown(data: Data, tiles: Tile[] = homeTiles(data)): Tile[] {
  const on = currentRun(data)?.id;
  const i = on === undefined ? -1 : tiles.findIndex((t) => t.runId === on);
  return i <= 0 ? tiles : [tiles[i], ...tiles.slice(0, i), ...tiles.slice(i + 1)];
}

/**
 * Where the app opens — the mode you were in: Plan while the run the app is on is in Plan, the runner
 * while it is running, the paused screen while it is paused, else home.
 */
export function leftOff(data: Data): { kind: 'runner' | 'paused' | 'plan' | 'home'; runId?: Id } {
  const cur = currentRun(data);
  if (!cur || !place(data, cur)) return { kind: 'home' };
  return { kind: isPlanning(data, cur) ? 'plan' : isRunning(data, cur) ? 'runner' : 'paused', runId: cur.id };
}

/**
 * P-95 audit F3: where the app opens. As `leftOff` — but home when the run it is on was put down by
 * Home (`wentHome`: that run and its `touchedAt` then) and nothing has touched it since: the person
 * chose home. Pause alone still reopens on the paused screen.
 */
export function opensAt(data: Data, wentHome?: { runId: Id; touchedAt?: string }): ReturnType<typeof leftOff> {
  const at = leftOff(data);
  if (!wentHome || at.kind !== 'paused' || at.runId !== wentHome.runId) return at;
  return readRun(data, at.runId)?.touchedAt === wentHome.touchedAt ? { kind: 'home' } : at;
}

/**
 * Which screen a run's routes show, by the data alone (a route never writes): Plan for a run in Plan
 * or at the edge; the paused screen for the run the app is on, paused; the runner for a run that is
 * running, or open and left on a step; home for an ended run or none.
 */
export function runRoute(data: Data, runId: Id): 'plan' | 'runner' | 'paused' | 'home' {
  const run = readRun(data, runId);
  if (!run || run.endedAt || !place(data, run)) return 'home';
  return isPlanning(data, run) ? 'plan' : run.status === 'paused' ? 'paused' : 'runner';
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
  /** In Plan (left there, or at the edge): the runner does not show it — its route goes to Plan (`runRoute`). */
  planning: boolean;
  /** The note. edge: nothing to stand on (the run is in Plan; the runner never shows this). */
  step: { kind: 'step' | 'routine' | 'wait' | 'edge'; words: string; seq: Id; itemId?: Id };
  /** The corner mark: the last step of a round (spoken "Last step of this round"). */
  lastOfRound: boolean;
  /** There is a step before this one in this level (Back to <step>). */
  canBack: boolean;
  /** The middle button: Plan — or Step in when the step is a routine with steps in it (and there is room to go deeper). Never dimmed. */
  middle: 'plan' | 'stepIn';
  /** The filled button: Next, or "It's happened" (a wait). edge: there is none (the run is in Plan). */
  next: 'next' | 'itsHappened' | 'edge';
  /** On a wait step: what for, and since when (ISO). */
  waiting?: { words: string; since?: string };
}

const lastOfRound = (at: Place) => !!at.item && at.seq.repeatFrom !== undefined && at.seq.items[at.seq.items.length - 1]?.id === at.item.id;
const waitingOf = (run: RunState, at: Place) => (isWait(at.item) ? { words: at.item.wait, ...(dated(run.waitingSince) && { since: run.waitingSince }) } : undefined);
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
    planning: isPlanning(data, run),
    step: item ? { kind: kindOf(item), words: wordsOf(data, run, item), seq: seq.id, itemId: item.id } : { kind: 'edge', words: '', seq: seq.id },
    lastOfRound: lastOfRound(at),
    canBack: !!previous(data, run),
    middle: target?.items.length && frames.length < MAX_DEPTH ? 'stepIn' : 'plan',
    next: !item ? 'edge' : isWait(item) ? 'itsHappened' : 'next',
    ...(waiting && { waiting }),
  };
}

/** The pull-up panel for a run. */
export interface PanelView {
  /** "Round 2 of 3" (n, of); "Round 4" (n only: until I'm done, or the number is below the round); absent: nothing to show. */
  round?: { n: number; of?: number };
  /** "Last step of the round". */
  lastOfRound: boolean;
  /** "then: <words>": what Next goes to. Absent when Next ends the run or asks at the edge. */
  then?: string;
  /** "Back to <words>": the step before, when there is one. */
  backTo?: string;
  /** On a wait step: what for, since when (ISO). */
  wait?: { words: string; since?: string };
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
  const wait = waitingOf(run, at);
  return {
    ...(looping && { round: { n: frame.round, ...(seq.repeat !== undefined && frame.round <= seq.repeat && { of: seq.repeat }) } }),
    lastOfRound: lastOfRound(at),
    ...(to?.item && { then: wordsOf(data, run, to.item) }),
    ...(back && { backTo: wordsOf(data, run, seq.items.find((i) => i.id === back.at)) }),
    ...(wait && { wait }),
    ...(tidy(run.reason) && { reason: tidy(run.reason) }),
  };
}

/**
 * The paused screen for a run (titled "Waiting" when it rests on a wait step). A run left in Plan
 * (P-90) is shown as planning, never as paused, with Plan as its action.
 */
export interface PausedView {
  runId: Id;
  name: string;
  kind: 'paused' | 'waiting' | 'planning';
  /** Its one action: Resume, or — in Plan — Plan (`planRun(runId)`, then its Plan). */
  action: 'resume' | 'plan';
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
    kind: isPlanning(data, run) ? 'planning' : waiting ? 'waiting' : 'paused',
    action: isPlanning(data, run) ? 'plan' : 'resume',
    at: wordsOf(data, run, at.item),
    asking: !at.item,
    reason: run.reason ?? '',
    ...(waiting && { waiting }),
    others,
  };
}

/** One line of Jump to… (the whole run as it reads; Plan has its own rows: `planView`). */
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
  /** The Repeat divider stands before this line: `repeat` rounds, or until I'm done when absent. */
  divider?: { repeat?: number };
}

export interface SeeItAll {
  runId: Id;
  /** The run's routine. */
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

/** The Repeat divider of one sequence in Plan: "Repeat from here", standing before items[from]. */
export interface PlanDivider {
  /** The sequence it belongs to: `editRoutine(seq, { kind: 'divider', from: from ± 1 })` moves it (only it: no step changes place); `{ kind: 'divider' }` takes it out; `{ kind: 'repeat', times? }` sets the count. */
  seq: Id;
  from: number;
  /** A number of rounds; absent: until I'm done. */
  repeat?: number;
  /** It can move up (from - 1) / down (from + 1). */
  canUp: boolean;
  canDown: boolean;
}

/** One row of Plan: a step, a wait or a routine of the sequence, routines opened in place beneath their row. */
export interface PlanRow {
  /** The item ids from the first layer down to this one (unique per row: a key). */
  path: Id[];
  /** 0 on the first layer. */
  depth: number;
  /** The sequence this row is an item of: every edit of the row is `editRoutine(seq, { …, item: itemId })`. */
  seq: Id;
  itemId: Id;
  /** step: reword, break down, make a wait. wait: reword, make a step. routine: its rows follow, one deeper (editing them edits that routine). */
  kind: 'step' | 'wait' | 'routine';
  words: string;
  /** A routine row: the sequence it is (its rows have this as their `seq`). */
  ref?: Id;
  /**
   * A routine row that is a step broken down — the unnamed sequence is this step's own. Its words are
   * changed with `editRoutine(ref, { kind: 'rename', words })`, and Remove takes its smaller steps with it.
   */
  broken?: true;
  /** HERE: the step the run is on (the one "Resume at <step>" names). At most one row. */
  here: boolean;
  /** A routine the run is inside (on the way to HERE). */
  within: boolean;
  /** Move up / Move down within its own sequence (`{ kind: 'move', item, by: -1 | 1 }`): one row, the divider being a row. */
  canUp: boolean;
  canDown: boolean;
  /** The Repeat divider stands before this row. */
  divider?: PlanDivider;
}

/** The Plan surface, for a run or for a routine with no run. */
export interface PlanView {
  routineId: Id;
  /** Its open run, if it has one: then this is that run's Plan, whichever way it was asked for. */
  runId?: Id;
  /** The heading: the routine's name. */
  name: string;
  named: boolean;
  /** The run is in Plan. False for a routine with no run — and for a run the data says is NOT in Plan (the route then goes where `runRoute` says). */
  planning: boolean;
  /** Beneath the heading: "planning · at <step>", "planning · nothing next yet" at the edge, '' with no run (or a run not in Plan). */
  line: string;
  /** The HERE step's words, and what it is. */
  at?: string;
  hereKind?: 'step' | 'wait' | 'routine';
  /** The edge: the run has nothing next. The open row is the forward action; there is no filled button. */
  edge: boolean;
  /** Done has its own slot: only at the edge (`doneLevel(runId)` ends the run). */
  canDone: boolean;
  rows: PlanRow[];
  /** The first layer's divider (also on its row). */
  divider?: PlanDivider;
  /** The first layer's edge is open (false: "ends here"). */
  open: boolean;
  /**
   * The ONE filled button. resume: "Resume at <step>" → `resumeRun(runId)`, back exactly where it was.
   * start: "Start" → `startRoutine(routineId)`; not `ready` while there is no step. Absent at the edge.
   */
  forward?: { kind: 'resume'; label: string; runId: Id } | { kind: 'start'; label: 'Start'; routineId: Id; ready: boolean };
  /** The run still carries this-run changes from the build before: `planRun(runId)` folds them into the routine (once, with its notice and Undo). */
  unfolded: boolean;
}

/**
 * Plan (P-90). `{ runId }`: that run's Plan (undefined once it has ended or is gone). `{ routineId }`:
 * the routine's — which is its open run's Plan when it has one (one surface per run). Reads only.
 */
export function planView(data: Data, of: { runId: Id } | { routineId: Id }): PlanView | undefined {
  const run = 'runId' in of ? readRun(data, of.runId) : openRuns(data).filter((r) => r.routineId === of.routineId && !!place(data, r)).sort(lastTouched)[0];
  if ('runId' in of && (!run || run.endedAt)) return undefined;
  const at = run && place(data, run);
  if (run && !at) return undefined;
  const root = readRoutine(data, run ? run.routineId : (of as { routineId: Id }).routineId);
  if (!root || (!run && root.removedAt)) return undefined;
  const read = (seqId: Id) => (run ? view(data, run, seqId) : readRoutine(data, seqId));
  const words = (item: Item) => (run ? wordsOf(data, run, item) : isRef(item) ? (readRoutine(data, item.ref)?.words ?? '') : isWait(item) ? item.wait : item.text);
  const frames = at?.frames ?? [];
  const rows: PlanRow[] = [];
  const dividerOf = (s: Seq): PlanDivider | undefined =>
    s.repeatFrom === undefined ? undefined : { seq: s.id, from: s.repeatFrom, ...(s.repeat !== undefined && { repeat: s.repeat }), canUp: s.repeatFrom > 0, canDown: s.repeatFrom < s.items.length - 1 };
  const walk = (seqId: Id, path: Id[], open: Id[], onWay: boolean) => {
    const s = read(seqId);
    if (!s) return;
    const depth = path.length;
    const frame = onWay ? frames[depth] : undefined;
    const divider = dividerOf(s);
    s.items.forEach((item, i) => {
      if (rows.length >= MAX_ROWS) return;
      const on = frame?.at === item.id;
      // Inside it only if the next level is this routine.
      const within = on && isRef(item) && frames[depth + 1]?.seq === item.ref;
      rows.push({
        path: [...path, item.id],
        depth,
        seq: s.id,
        itemId: item.id,
        kind: kindOf(item),
        words: words(item),
        ...(isRef(item) && { ref: item.ref, ...(read(item.ref)?.named === false && { broken: true as const }) }),
        here: on && depth === frames.length - 1,
        within,
        // (The divider is a row: the first step under a divider at the very top can still move up, past it.)
        canUp: i > 0 || divider?.from === 0,
        canDown: i < s.items.length - 1,
        ...(divider && divider.from === i && { divider }),
      });
      if (isRef(item) && !open.includes(item.ref) && depth + 1 < MAX_DEPTH) walk(item.ref, [...path, item.id], [...open, item.ref], within);
    });
  };
  walk(root.id, [], [root.id], true);
  const first = read(root.id) ?? root;
  const divider = dividerOf(first);
  const base = { routineId: root.id, name: root.words, named: root.named, rows, ...(divider && { divider }), open: first.open };
  if (!run || !at) {
    return { ...base, planning: false, line: '', edge: false, canDone: false, forward: { kind: 'start', label: 'Start', routineId: root.id, ready: root.items.length > 0 }, unfolded: false };
  }
  const planning = isPlanning(data, run);
  const here = at.item ? wordsOf(data, run, at.item) : undefined;
  return {
    ...base,
    runId: run.id,
    planning,
    line: !planning ? '' : here === undefined ? 'planning · nothing next yet' : `planning · at ${here}`,
    ...(at.item && { at: here, hereKind: kindOf(at.item) }),
    edge: !at.item,
    canDone: !at.item,
    ...(at.item && { forward: { kind: 'resume' as const, label: `Resume at ${here}`, runId: run.id } }),
    unfolded: run.changes.length > 0,
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
  new: 'New',
  resume: 'Resume',
  plan: 'Plan',
  pause: 'Pause',
  reason: 'Reason',
  home: 'Home',
  next: 'Next',
  done: 'Done',
  stepIn: 'Step in',
  back: 'Back',
  jump: 'Jump',
  editRoutine: 'Change',
};

/**
 * The notice after an action. `text`: what it says, '' when the action speaks for itself (the step
 * simply changed) — "Finished <name>" for what finished by itself (the outermost level left), "Done
 * with <name>" for what Done left, "Jumped from <step>". `label`: what its Undo takes back ("Undo
 * Next"); on a wait step Next is "It's happened". `folded` (P-90): the write also folded the run's
 * this-run changes from the build before into its routine (`Result.folded`, the routine's name): the
 * notice names that too — "Kept this run's changes in <routine>" — and its Undo takes it back.
 */
export function noticeFor(verb: Acted, said: Said | undefined, onWait = false, folded?: string): { text: string; label: string } {
  const label = verb === 'next' && onWait ? 'It’s happened' : LABELS[verb];
  const kept = folded === undefined ? '' : `Kept this run’s changes in ${folded}`;
  const text =
    said?.kind === 'ended'
      ? `${verb === 'done' ? 'Done with' : 'Finished'} ${said.name}`
      : said?.kind === 'finished'
        ? verb === 'done'
          ? `Done with ${said.names[0]}`
          : `Finished ${said.names[said.names.length - 1]}`
        : said?.kind === 'jumped'
          ? `Jumped from ${said.from}`
          : '';
  return { text: [text, kept].filter(Boolean).join(' · '), label };
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
    const index = (id: Id) => (s ? s.items.findIndex((x) => x.id === id) : -1);
    const from = s?.repeatFrom;
    // The last step left in the repeating part: with it gone (or moved out) there is nothing to repeat, so the divider goes too.
    const lastRepeating = (id: Id) => from !== undefined && !!s && from === s.items.length - 1 && index(id) === from;
    const WENT = ' — Repeat from here went with it';
    if (e.kind === 'addStep') return `Added ${quoted(e.text)}`;
    if (e.kind === 'addWait') return `Added a wait for ${quoted(e.wait)}`;
    if (e.kind === 'remove') {
      // Its reach: a step broken down takes its smaller steps (the unnamed sequence is this step's own; a named routine is not).
      const i = s?.items.find((x) => x.id === e.item);
      const own = isRef(i) && readRoutine(data, i.ref)?.named === false;
      return `Removed ${item(e.item)}${own ? ' and its smaller steps' : ''}${lastRepeating(e.item) ? WENT : ''}`;
    }
    if (e.kind === 'move') return `Moved ${item(e.item)}${e.by < 0 && lastRepeating(e.item) ? WENT : ''}`;
    if (e.kind === 'reword') return `Changed ${item(e.item)}`;
    if (e.kind === 'breakDown') return `Broke down ${item(e.item)}`;
    if (e.kind === 'toWait') return `Made ${item(e.item)} a wait`;
    if (e.kind === 'toStep') return `Made ${item(e.item)} a step`;
    if (e.kind === 'divider' && e.from !== undefined && s?.items[e.from]) return `Repeat from here ${from === undefined ? 'added' : 'moved'} above ${item(s.items[e.from].id)}`;
    // (An unnamed sequence is a step that was broken down: its words are that step's, and they were changed.)
    if (e.kind === 'rename') return `${s && !s.named ? 'Changed' : 'Renamed'} ${quoted(s?.words ?? '')}`;
    if (e.kind === 'removeRoutine') return `Removed ${quoted(s?.words ?? '')}`;
    if (e.kind === 'open') return 'Changed Ends here';
    return 'Changed Repeat from here';
  }
  if (verb.kind === 'new') return `Made ${quoted(verb.words)}`;
  return '';
}
