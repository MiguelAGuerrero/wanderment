/**
 * B-11 slice 1 (P-86), B-12 (P-90): what the screens read about routines and runs — the runner, Plan,
 * home, the paused screen. Pure selectors over the same engine as the verbs (run.ts): nothing here
 * writes, and nothing throws on damaged data — a run or routine that can't be shown reads as
 * undefined, and the screen goes home.
 */
import { advance, bindingOf, callIO, callWords, currentRun, Frame, givenIn, isCall, isInputCopy, isLiveCall, isPlanning, isRemovedCall, owedBy, passedGives, isRef, isRunning, isStep, isWait, Item, MAX_DEPTH, openRuns, outOf, place, Place, previous, readRoutine, readRun, RoutineEdit, routineBody, runVerb, RunState, Said, scopeLevel, Seq, stepOutOwes, Verb, view, valuesInPlay, visibleValue, wordsOf } from './run';
import { hash } from './hash';
import { addressesIn, PlaceShown, placesOf, placesShown, tidyPlaceText } from './places';
import { Data, Id } from './types';
import { joinItems, nameKey, namesIn, parseWords, tidyName, ValueEntry, valueText } from './values';

const tidy = (s: string | undefined) => (s ?? '').trim().replace(/\s+/g, ' ');
/** P-101 (ruling 3): a pause note as read — each line tidied, blank lines dropped (one or more lines). */
const tidyLines = (s: string | undefined) =>
  (s ?? '')
    .split('\n')
    .map((l) => tidy(l))
    .filter(Boolean)
    .join('\n');
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

// ───────── values (P-96) ─────────

/** A piece of words as shown: plain text; a value in place (shown inverted, read "name: value"); a blank — a name with no value (read "name, empty"). */
export type StepPart = { kind: 'text'; text: string } | { kind: 'value'; name: string; text: string } | { kind: 'blank'; name: string };
/** A value the runner shows (the values row, a tile): its name as given, its items joined in words. `mine`: given (or asked) in the level the run is in. */
export interface ValueShown {
  name: string;
  text: string;
  items: string[];
  level: number;
  mine: boolean;
  /** P-98: an input of the routine the run is in, handed to it by its call — "from <the caller's step>". */
  from?: string;
}
/**
 * A field on the runner's step (ruling 6): the giving step's — labelled with its name — or one for a name
 * the step reads that has no value (the step asks). `text`: the value as typed ('' when none): the field
 * is bound to it (`typeValue` keystroke by keystroke).
 */
export interface ValueField {
  name: string;
  text: string;
  gives: boolean;
}

const asTyped = (e: ValueEntry) => (e.items.length === 1 ? e.items[0] : joinItems(e.items));
const shownOf = (e: ValueEntry, mine: number, from?: string): ValueShown => ({ name: e.name, text: valueText(e), items: e.items, level: e.level, mine: e.level === mine && from === undefined, ...(from !== undefined && { from }) });
/** The words of the step a value was given at (as stored with it, else its step's words now). */
function givenAt(data: Data, run: RunState, frames: Frame[], e: ValueEntry): string {
  if (e.words !== undefined) return e.words;
  const giver = frames[e.level] ? routineBody(data, run, frames[e.level].seq).flatMap((b) => b.items).find((i) => i.id === e.item) : undefined;
  return giver ? wordsOf(data, run, giver) : '';
}
/**
 * P-98 (ruling 4): where an input of the routine the run is in came from — its call's copy, or (a run stepped in
 * before calls handed copies) a value it reads from below — as "from <step>". Undefined for anything else.
 */
function inputFrom(data: Data, run: RunState, frames: Frame[], e: ValueEntry): string | undefined {
  if (isInputCopy(data, run, frames, e)) return e.words ?? '';
  const scope = topScope(data, run, frames);
  if (scope > 0 && e.level < scope && callIO(data, frames[scope].seq).asks.some((a) => nameKey(a) === nameKey(e.name))) return givenAt(data, run, frames, e);
  return undefined;
}
const topScope = (data: Data, run: RunState, frames: Frame[]) => scopeLevel(data, run, frames, frames.length - 1);
/** Words with the values a run's step sees, in place (literal braces single). */
function partsFor(data: Data, run: RunState, words: string, frames: Frame[] | undefined): StepPart[] {
  return parseWords(words).map((p) => {
    if (p.kind === 'text') return { kind: 'text', text: p.text };
    const e = visibleValue(data, run, p.key, frames);
    return e ? { kind: 'value', name: p.name, text: valueText(e) } : { kind: 'blank', name: p.name };
  });
}
/** Parts as plain words: values in place, blanks as their name in braces. */
export const partsText = (parts: StepPart[]): string => parts.map((p) => (p.kind === 'blank' ? `{${p.name}}` : p.text)).join('');

/** Any words (the panel's "then" and "Back to", a reader in the value sheet) with the values the run's step sees. [] when the run cannot be shown. */
export function wordsShown(data: Data, runId: Id, words: string): StepPart[] {
  const run = readRun(data, runId);
  const at = run && place(data, run);
  return run && at ? partsFor(data, run, words, at.frames) : [];
}

function fieldsFor(data: Data, run: RunState, at: Place): ValueField[] {
  const item = at.item;
  if (!item) return [];
  // P-98 (the owner: no options while running a step): a row with insides has no fields — what it owes is asked only once Next is pressed (`nextOwes`).
  if (isRef(item)) return [];
  const scope = topScope(data, run, at.frames);
  const out: ValueField[] = [];
  const gives = outOf(item);
  if (gives) {
    const e = visibleValue(data, run, nameKey(gives), at.frames);
    out.push({ name: gives, text: e ? asTyped(e) : '', gives: true });
  }
  for (const n of namesIn(wordsOf(data, run, item))) {
    if (gives && n.key === nameKey(gives)) continue;
    const e = visibleValue(data, run, n.key, at.frames);
    // It asks while nothing gave it — and keeps its field while the value is the one typed here.
    if (!e || (e.item === item.id && e.level === scope)) out.push({ name: n.name, text: e ? asTyped(e) : '', gives: false });
  }
  return out;
}

/** The value sheet (ruling 6, journey 4): the value, where it came from, when, and what reads it. */
export interface ValueDetail {
  name: string;
  /** In words (items joined). */
  text: string;
  items: string[];
  /** The step it was given (or asked for) at: its words now, or its words then once it is gone ('' if unknown). */
  from: string;
  /** The routine it belongs to, when that is not the level the run is in. */
  routine?: string;
  /** When it was first given, and last changed from this sheet (ISO). */
  at: string;
  changedAt?: string;
  /** The steps of its routine (and their smaller steps) that read it. */
  readBy: { itemId: Id; words: string }[];
  level: number;
  mine: boolean;
  /** P-101 amendment (ruling 10): given late — at a step that neither gives nor reads it ("given at <step>"). */
  late?: true;
}

/** The value of `name` as the run's step sees it, for its sheet; undefined when there is none. */
export function valueDetail(data: Data, runId: Id, name: string): ValueDetail | undefined {
  const run = readRun(data, runId);
  const at = run && place(data, run);
  if (!run || !at) return undefined;
  const key = nameKey(name);
  const e = visibleValue(data, run, key, at.frames);
  if (!e) return undefined;
  const scope = topScope(data, run, at.frames);
  const body = routineBody(data, run, at.frames[e.level].seq);
  const items = body.flatMap((s) => s.items);
  // P-98: an input — the called routine's copy, from the routine that called it.
  const input = isInputCopy(data, run, at.frames, e);
  const giver = input ? undefined : items.find((i) => i.id === e.item);
  const readBy = items.filter((i) => !isRef(i) && namesIn(wordsOf(data, run, i)).some((n) => n.key === key)).map((i) => ({ itemId: i.id, words: wordsOf(data, run, i) }));
  // Audit F2/F3: given late — stored as the giving step's, with the words of the step it was given at.
  const late = !!giver && isLate(data, run, e, wordsOf(data, run, giver));
  return {
    name: e.name,
    text: valueText(e),
    items: e.items,
    from: late ? e.words! : giver ? wordsOf(data, run, giver) : (e.words ?? ''),
    ...(input ? { routine: view(data, run, at.frames[scopeLevel(data, run, at.frames, e.level - 1)].seq)?.words ?? '' } : e.level !== scope && !late && { routine: body[0]?.words ?? '' }),
    at: typeof e.at === 'string' ? e.at : '',
    ...(typeof e.changedAt === 'string' && { changedAt: e.changedAt }),
    readBy,
    level: e.level,
    mine: e.level === scope && !input,
    ...(late && { late: true as const }),
  };
}

/**
 * P-101 amendment (ruling 10, audit F2/F3): a value given late keeps, in its `words`, the step it was given
 * at — another step's words (a step the run reads). A value whose giving step was reworded after it was
 * given also has other words, but no step has them any more: that one is not "given at".
 */
function isLate(data: Data, run: RunState, e: ValueEntry, giverWords: string): boolean {
  if (e.words === undefined || tidy(e.words) === tidy(giverWords)) return false;
  for (const id of Object.keys(data.routines)) {
    const s = view(data, run, id);
    if (s?.items.some((i) => !isRef(i) && tidy(wordsOf(data, run, i)) === tidy(e.words!))) return true;
  }
  return false;
}

/** P-101 (ruling 7): one line of a value's trace — a routine on the way, the step in it that led on, its values. */
export interface TraceLevel {
  routine: string;
  step: string;
  values: ValueShown[];
}

/**
 * P-101 (ruling 7): the value sheet's trace — from the run's root to the step that gave `name` (as the
 * run's step sees it), one line per routine on the way (the first layer and each named routine entered):
 * the routine, the step it was left through (the giving step, on the last), and that routine's values.
 * Undefined when there is no such value.
 */
export function valueTrace(data: Data, runId: Id, name: string): TraceLevel[] | undefined {
  const run = readRun(data, runId);
  const at = run && place(data, run);
  if (!run || !at) return undefined;
  const seen = visibleValue(data, run, nameKey(name), at.frames);
  if (!seen) return undefined;
  // P-98: an input not changed inside is traced to where it was given, below.
  const copy = (v: ValueEntry) => isInputCopy(data, run, at.frames, v) && v.changedAt === undefined;
  const call = copy(seen) ? at.frames[seen.level] && view(data, run, at.frames[seen.level - 1].seq)?.items.find((i) => i.id === seen.item) : undefined;
  const b = call ? bindingOf(call, nameKey(seen.name)) : undefined;
  const source = call && !(b && 'typed' in b) ? visibleValue(data, run, b && 'name' in b ? nameKey(b.name) : nameKey(seen.name), at.frames.slice(0, seen.level)) : undefined;
  const e = source ?? seen;
  const scope = topScope(data, run, at.frames);
  const giver = routineBody(data, run, at.frames[e.level].seq)
    .flatMap((s) => s.items)
    .find((i) => i.id === e.item);
  const trace: TraceLevel[] = [];
  for (let j = 0; j <= e.level && j < at.frames.length; ) {
    const next = j === e.level ? -1 : nextScope(data, run, at.frames, j);
    const through = next < 0 ? undefined : at.frames[next - 1];
    const by = through ? view(data, run, through.seq)?.items.find((i) => i.id === through.at) : giver;
    trace.push({
      routine: view(data, run, at.frames[j].seq)?.words ?? '',
      step: by ? wordsOf(data, run, by) : (e.words ?? ''),
      values: run.values.filter((v) => v.level === j && v.seq === at.frames[j].seq && !copy(v)).map((v) => shownOf(v, scope)),
    });
    if (next < 0) break;
    j = next;
  }
  return trace;
}

/** The next level above `j` that is a routine of its own (a named routine entered as a step); frames.length when none. */
function nextScope(data: Data, run: RunState, frames: Frame[], j: number): number {
  for (let i = j + 1; i < frames.length; i++) if (view(data, run, frames[i].seq)?.named) return i;
  return frames.length;
}

/** A press probed, never written: what Next (or Done) would say. */
const PROBE = { now: '', id: () => '' };
const wouldEnd = (data: Data, verb: Verb) => runVerb(data, verb, PROBE).said?.kind === 'ended';

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
   * run is anywhere else and not running (paused, opened in Plan, or left by Home, Back or another
   * start): it reads "at <step>" with its reason — or, at the edge an earlier build left it at, "nothing
   * next yet" (`asking`). P-101 (ruling 4): there is no "planning" — Plan is a view. idle: nothing going.
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
  /** P-101 (ruling 5): the run touched last (the running one, else the one left last) — marked "last", never moved. */
  current: boolean;
  /** What its one button does: Resume its run; Start one; or, for a run at the edge (nothing to resume at), Plan (`planRun(runId)`, then its Plan). */
  action: 'resume' | 'start' | 'plan';
  /** Nothing going and no steps yet: there is nothing to start (Start is refused `empty`); its Plan is where the first step is added. */
  empty?: true;
  /** Its colour, its own for good: the palette in the order routines were made, so neighbours differ. */
  hue: number;
  /** P-96: the step it is at (`at`) with its values in place, for its line (ruling 8). */
  atParts?: StepPart[];
  /** P-96: the values in play where its run is; absent when none. */
  values?: ValueShown[];
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
  const reason = tidyLines(run.reason);
  const planning = isPlanning(data, run);
  const values = valuesInPlay(data, run);
  const scope = topScope(data, run, at.frames);
  return {
    ...base,
    ...(at.item && { atParts: partsFor(data, run, wordsOf(data, run, at.item), at.frames) }),
    ...(values.length && { values: values.map((e) => shownOf(e, scope)) }),
    runId: run.id,
    state: isWait(at.item) ? 'waiting' : isRunning(data, run) ? 'running' : 'paused',
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

/** P-101 (ruling 5): runs by when each was made (started), stable. */
const firstStarted = (a: RunState, b: RunState) => (a.startedAt < b.startedAt ? -1 : a.startedAt > b.startedAt ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

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
 * Home's tiles as shown. P-101 (ruling 5; was P-95: the run the app is on first): the runs going, by when
 * each was made (started), then the routines with nothing going in `homeTiles`' order. Nothing is ranked:
 * a pause, a resume or a step never reorders; the run touched last is marked "last" (`Tile.current`).
 */
export function homeShown(data: Data, tiles: Tile[] = homeTiles(data)): Tile[] {
  const started = new Map<Id, RunState>();
  for (const t of tiles) {
    const r = t.runId === undefined ? undefined : readRun(data, t.runId);
    if (r) started.set(t.routineId, r);
  }
  const going = tiles.filter((t) => started.has(t.routineId)).sort((a, b) => firstStarted(started.get(a.routineId)!, started.get(b.routineId)!));
  return [...going, ...tiles.filter((t) => !started.has(t.routineId))];
}

/**
 * Where the app opens — the mode you were in: Plan while the run the app is on is in Plan, the runner
 * while it is running, else home. P-96 (ruling 7): a paused run is home — Pause goes home, and the paused
 * run is first there (`homeShown`); there is no paused screen to open on.
 */
export function leftOff(data: Data): { kind: 'runner' | 'plan' | 'home'; runId?: Id } {
  const cur = currentRun(data);
  if (!cur || !place(data, cur)) return { kind: 'home' };
  if (isPlanning(data, cur)) return { kind: 'plan', runId: cur.id };
  return isRunning(data, cur) ? { kind: 'runner', runId: cur.id } : { kind: 'home' };
}

/**
 * Where the app opens: `leftOff`. (P-95 audit F3's "Home put the run down" hint no longer changes
 * anything since P-96: a paused run opens home anyway. The argument is still taken so callers compile.)
 */
export function opensAt(data: Data, _wentHome?: { runId: Id; touchedAt?: string }): ReturnType<typeof leftOff> {
  return leftOff(data);
}

/**
 * Which screen a run's routes show, by the data alone (a route never writes): Plan for a run in Plan
 * or at the edge; home for the run the app is on, paused (P-96: Pause goes home), an ended run or none;
 * the runner for a run that is running, or open and left on a step.
 */
export function runRoute(data: Data, runId: Id): 'plan' | 'runner' | 'home' {
  const run = readRun(data, runId);
  if (!run || run.endedAt || !place(data, run)) return 'home';
  return isPlanning(data, run) ? 'plan' : run.status === 'paused' ? 'home' : 'runner';
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
  /**
   * The note. edge: nothing to stand on (the run is in Plan; the runner never shows this). `words` as
   * written; `parts` (P-96) as shown, with the values the step reads in place (and blanks it asks for).
   */
  step: { kind: 'step' | 'routine' | 'wait' | 'edge'; words: string; seq: Id; itemId?: Id; parts: StepPart[]; removed?: true };
  /** P-96: the fields under the words — the giving step's first, then each name it asks for. `typeValue(runId, step.itemId, name, text)`. */
  fields: ValueField[];
  /** P-96: the values row under the top line — the values in play, the level below's first. Empty: no row. */
  values: ValueShown[];
  /** The corner mark: the last step of a round (spoken "Last step of this round"). */
  lastOfRound: boolean;
  /** There is a step before this one in this level (Back to <step>). */
  canBack: boolean;
  /** The middle button: Plan — or Step in when the step is a routine with steps in it (and there is room to go deeper). Never dimmed. */
  middle: 'plan' | 'stepIn';
  /**
   * The filled button: Next; Done (P-96, ruling 7) when that press ends the whole run; or "It's happened"
   * (a wait). edge: there is none (the run is in Plan).
   */
  next: 'next' | 'done' | 'itsHappened' | 'edge';
  /** P-96: pressing it ends the whole run (`nextStep` then answers `home: true`). */
  ends: boolean;
  /**
   * P-96 (ruling 7): the pull-up panel's "Finish <name> now" — `doneLevel(runId)` leaves the level the run
   * is in (`name`); `ends`: that ends the whole run (then home). Absent for an ended run.
   */
  finish?: { name: string; ends: boolean };
  /** On a wait step: what for, and since when (ISO). */
  waiting?: { words: string; since?: string };
  /**
   * P-101 (ruling 1): the moves under the note, beside Next. `stepIn`: the step has steps (`stepIn`).
   * `stepOut`: inside a level above the first — leaves it (`doneLevel`), named; absent on the first layer
   * (Next, or Done, covers it).
   */
  moves: { stepIn: boolean; stepOut?: { name: string } };
  /** P-101 (ruling 2): inside a call, the innermost named routine — "Plan <name>" opens its Plan (`planView({ runId, in: seq })`). */
  planIn?: { seq: Id; name: string };
  /**
   * P-101 (ruling 7): hoisted gives for the context line — what the step's smaller steps give when it is a
   * step broken down, else what the level's do when the level is one. Empty: nothing to say.
   */
  gives: string[];
  /** P-101 (ruling 3): the pause note, read on the way back in (lines tidied) until the first move drops it. */
  reason?: string;
  /**
   * P-101 amendment (ruling 10): names given by steps already passed, with no value yet — the values row's
   * "{ } name: not given yet", each given now from the step the run is on (`typeValue(runId, step.itemId, name, text)`).
   */
  missing: string[];
  /**
   * P-98: Step out of a call or a step broken down before what it owes was given — the names still empty: Step out
   * first shows a field for each (`doneLevel(runId, owed)`). Empty: Step out leaves at once.
   */
  stepOutOwes: string[];
  /**
   * P-98: Next on a call or a step broken down (not stepped into) — the names it owes still empty: pressing Next
   * first shows a field for each (`nextStep(runId, owed)`; left empty, Next moves on and a later reader asks).
   */
  nextOwes: string[];
}

/** P-101 (ruling 7): the names a step broken down gives through its smaller steps (theirs, and theirs in turn), in order. */
const hoistedOf = (data: Data, run: RunState | undefined, seqId: Id): string[] => [...givenIn(data, run, seqId).values()];

const lastOfRound = (at: Place) => !!at.item && at.seq.repeatFrom !== undefined && at.seq.items[at.seq.items.length - 1]?.id === at.item.id;
const waitingOf = (run: RunState, at: Place) => (isWait(at.item) ? { words: at.item.wait, ...(dated(run.waitingSince) && { since: run.waitingSince }) } : undefined);
export function runnerView(data: Data, runId: Id): RunnerView | undefined {
  const run = readRun(data, runId);
  const at = run && place(data, run);
  if (!run || !at) return undefined;
  const { item, seq, frames } = at;
  const below = frames.length > 1 ? view(data, run, frames[frames.length - 2].seq) : undefined;
  // P-98: a call to a removed routine says so (its words) and is not stepped into.
  const removed = isRemovedCall(data, item);
  const target = isRef(item) && !removed ? view(data, run, item.ref) : undefined;
  const waiting = waitingOf(run, at);
  const ends = !!item && !run.endedAt && wouldEnd(data, { kind: 'next', runId });
  const words = item ? wordsOf(data, run, item) : '';
  const middle = target?.items.length && frames.length < MAX_DEPTH ? 'stepIn' : 'plan';
  let inner: Seq | undefined;
  for (let j = frames.length - 1; j > 0 && !inner; j--) {
    const s = view(data, run, frames[j].seq);
    if (s?.named) inner = s;
  }
  const gives = target && !target.named ? hoistedOf(data, run, target.id) : frames.length > 1 && !seq.named ? hoistedOf(data, run, seq.id) : [];
  const reason = tidyLines(run.reason);
  return {
    runId,
    routineId: run.routineId,
    name: readRoutine(data, run.routineId)?.words ?? '',
    status: run.endedAt ? 'ended' : (run.status ?? 'left'),
    level: seq.words,
    ...(below && { parent: below.words }),
    depth: frames.length,
    planning: isPlanning(data, run),
    step: item ? { kind: kindOf(item), words, seq: seq.id, itemId: item.id, parts: partsFor(data, run, words, frames), ...(removed && { removed: true as const }) } : { kind: 'edge', words: '', seq: seq.id, parts: [] },
    fields: fieldsFor(data, run, at),
    values: valuesInPlay(data, run).map((e) => shownOf(e, topScope(data, run, frames), inputFrom(data, run, frames, e))),
    lastOfRound: lastOfRound(at),
    canBack: !!previous(data, run),
    middle,
    // P-96 audit F5: Done wherever the press ends the run — a last step that is a wait included.
    next: !item ? 'edge' : ends ? 'done' : isWait(item) ? 'itsHappened' : 'next',
    ends,
    ...(!run.endedAt && { finish: { name: seq.words, ends: wouldEnd(data, { kind: 'done', runId }) } }),
    ...(waiting && { waiting }),
    // P-98: past the depth it can go, Step in is still there — and says, in words, why it goes no deeper.
    moves: { stepIn: !!target?.items.length, ...(frames.length > 1 && { stepOut: { name: seq.words } }) },
    ...(inner && { planIn: { seq: inner.id, name: inner.words } }),
    gives,
    ...(reason && { reason }),
    missing: run.endedAt ? [] : passedGives(data, run, at).map((p) => p.name),
    stepOutOwes: run.endedAt ? [] : stepOutOwes(data, run, at),
    nextOwes: run.endedAt || !isRef(item) ? [] : owedBy(data, run, frames, item).filter((n) => !visibleValue(data, run, nameKey(n), frames)),
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
  /**
   * P-109 (B-18 journey 3): the places of the routine the run began in, then — inside a routine used as a step —
   * those of the (named) routine the run is in, if it has any. Absent: nothing to show (a routine with none: nothing new).
   */
  places?: { routine: string; places: PlaceShown[]; inner?: true }[];
  /** P-109 (journey 4): "Open <host>" — each http(s) address typed in the step's words, a value in play or the pause note, once. */
  addresses?: { href: string; host: string }[];
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
  const places = placesOfRun(data, run.routineId, frames);
  const addresses = addressesIn(item && (isStep(item) ? item.text : isWait(item) ? item.wait : undefined), ...(runnerView(data, runId)?.values.map((x) => x.text) ?? []), run.reason);
  return {
    ...(looping && { round: { n: frame.round, ...(seq.repeat !== undefined && frame.round <= seq.repeat && { of: seq.repeat }) } }),
    lastOfRound: lastOfRound(at),
    ...(to?.item && { then: wordsOf(data, run, to.item) }),
    ...(back && { backTo: wordsOf(data, run, seq.items.find((i) => i.id === back.at)) }),
    ...(wait && { wait }),
    ...(tidy(run.reason) && { reason: tidy(run.reason) }),
    ...(places.length > 0 && { places }),
    ...(addresses.length > 0 && { addresses }),
  };
}

/** P-109: the root routine's places, then the innermost named routine's (when it is another and has some). */
function placesOfRun(data: Data, root: Id, frames: Frame[]): NonNullable<PanelView['places']> {
  const group = (id: Id, inner?: true) => {
    const r = readRoutine(data, id);
    const places = placesShown(data.routines[id]?.places);
    return r && places.length ? { routine: r.words, places, ...(inner && { inner }) } : undefined;
  };
  const inner = [...frames].reverse().find((f) => readRoutine(data, f.seq)?.named)?.seq;
  return [group(root), inner && inner !== root ? group(inner, true) : undefined].filter((g): g is NonNullable<typeof g> => !!g);
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

/**
 * P-96 part 2 (ruling 5, journey 2): the names Plan's bar above the keyboard offers to the field typed
 * in — the names given ABOVE where the words will stand, in that routine only (a named routine's names
 * are its own). `words`: a row's own words (its `above`); `after` / `into`: a step added after a row or
 * into it (what is above it, its own name, its smaller steps'); `end`: "Add a step" at the bottom (every
 * name the routine gives). Each name once, as first given.
 */
export function namesOffered(rows: PlanRow[], at: { mode: 'words' | 'after' | 'into'; index: number } | { mode: 'end' }): string[] {
  const out: string[] = [];
  const add = (name: string | undefined) => {
    if (name && !out.some((n) => nameKey(n) === nameKey(name))) out.push(name);
  };
  if (at.mode === 'end') {
    const top = rows.find((r) => r.depth === 0)?.scope;
    for (const r of rows) if (r.scope === top) rowGives(r).forEach(add);
    return out;
  }
  const row = rows[at.index];
  if (!row) return out;
  row.above.forEach(add);
  if (at.mode === 'words') return out;
  const inside = (r: PlanRow) => r.path.length >= row.path.length && row.path.every((id, i) => r.path[i] === id);
  for (let i = at.index; i < rows.length && inside(rows[i]); i++) if (rows[i].scope === row.scope) rowGives(rows[i]).forEach(add);
  return out;
}

/** P-96 part 2: when a value was given, for its sheet: "today 9:02", "yesterday 21:45", "3 November 8:00"; '' when it is not a date. */
export function whenWords(iso: string, now = new Date()): string {
  const day = sinceWords(iso, now);
  if (!day) return '';
  const t = new Date(iso);
  return `${day} ${t.getHours()}:${String(t.getMinutes()).padStart(2, '0')}`;
}

/** P-96 part 2 (ruling 6): the value sheet's line "from <step> · <routine if not this one> · <when>"; what is not known is left out. */
export function valueFrom(d: Pick<ValueDetail, 'from' | 'routine' | 'at' | 'late'>, now = new Date()): string {
  return `${d.late ? 'given at' : 'from'} ${[d.from, d.routine, whenWords(d.at, now)].filter(Boolean).join(' · ')}`;
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
  /** P-96: the name this step gives ("gives {name}"; "Gives…" sets it: `editRoutine(seq, { kind: 'gives', item, name? })`). */
  gives?: string;
  /** P-96: the names its words read (`{name}`), each once, as written. */
  reads: string[];
  /** P-96: the names given above it in its routine (its smaller steps' too), in order: the bar above the keyboard. */
  above: string[];
  /** P-96: the routine its values belong to (a step broken down is its routine's): renaming a name is `editRoutine(scope, { kind: 'renameValue', from, to })`. */
  scope: Id;
  /** P-96: Break it down is offered (a plain step that gives no name). */
  canBreakDown: boolean;
  /** P-101 (ruling 7): a step broken down whose smaller steps give names: "gives {a}, {b}" on its row (hoisted). */
  hoisted?: string[];
  /**
   * P-101 amendment (ruling 11): the names its words read that no step in this Plan gives — each shown as a
   * dashed "asks {name}" (the fallback: it asks when run). Empty: nothing to revise.
   */
  asks: string[];
  /** P-98: a routine used as a step (a call): what it asks — each input and what fills it — and what it gives. */
  call?: PlanCall;
}

/**
 * P-98: one input of a call as its row reads it — `with {x}` (`name` is the input: by name), `with {y} as x`,
 * `with <words> as x`, or `asks {x}` (asked where it runs).
 */
export type CallInput = { input: string } & ({ mode: 'name'; name: string } | { mode: 'typed'; typed: string } | { mode: 'asks' });
/** P-98: a call row: its inputs, what it gives (handed back), and whether its routine was removed (it then reads "<name> (removed)"). */
export interface PlanCall {
  inputs: CallInput[];
  gives: string[];
  removed?: true;
}
/** What a Plan row gives: its own name and, for a call, what it hands back. */
export const rowGives = (r: Pick<PlanRow, 'gives' | 'call'>): string[] => [...(r.gives ? [r.gives] : []), ...(r.call?.gives ?? [])];

/** P-102: one of a Plan row's moves, as a screen reader offers it (an accessibility action): its name, its words, the move. */
export interface RowMove {
  name: 'moveUp' | 'moveDown';
  label: 'Move up' | 'Move down';
  by: -1 | 1;
}

/**
 * P-102 (owner, 2026-11-27: "Move up and move down can be removed" from the menu): a row's moves, kept for
 * screen readers (and Alt+↑ / Alt+↓ on the web) — each only when the row can make it.
 */
export function rowMoves(row: Pick<PlanRow, 'canUp' | 'canDown'>): RowMove[] {
  return [...(row.canUp ? [{ name: 'moveUp', label: 'Move up', by: -1 } as const] : []), ...(row.canDown ? [{ name: 'moveDown', label: 'Move down', by: 1 } as const] : [])];
}

/**
 * P-101 amendment (ruling 11): what removing the step `itemId` of the routine `scopeId` (or of one of its
 * smaller steps) would leave asking — the name it gives and the steps that read it, in Plan's order (smaller
 * steps included). Undefined when it gives nothing, nothing reads it, or another step gives it too.
 */
export function readersOf(data: Data, scopeId: Id, itemId: Id): { name: string; readers: string[] } | undefined {
  const items: Item[] = [];
  const seen = new Set<Id>();
  const walk = (id: Id) => {
    const s = seen.has(id) ? undefined : readRoutine(data, id);
    seen.add(id);
    for (const i of s?.items ?? []) {
      items.push(i);
      if (isRef(i) && readRoutine(data, i.ref)?.named === false) walk(i.ref);
    }
  };
  walk(scopeId);
  const item = items.find((i) => i.id === itemId);
  const name = outOf(item);
  if (!item || !name) return undefined;
  const key = nameKey(name);
  if (items.some((i) => i.id !== itemId && nameKey(outOf(i) ?? '') === key)) return undefined;
  const words = (i: Item) => (isWait(i) ? i.wait : isStep(i) ? i.text : '');
  const readers = items.filter((i) => i.id !== itemId && !isRef(i) && namesIn(words(i)).some((n) => n.key === key)).map(words);
  return readers.length ? { name, readers } : undefined;
}

/** The Plan surface, for a run or for a routine with no run. */
export interface PlanView {
  routineId: Id;
  /** Its open run, if it has one: then this is that run's Plan, whichever way it was asked for. */
  runId?: Id;
  /** The heading: the routine's name. */
  name: string;
  named: boolean;
  /**
   * Plan shows the run: P-101 (ruling 4) — Plan is a view, so that is any open run that is not running
   * (paused, left, or at the edge). False for a routine with no run, and for a running run (the route then
   * goes to the runner).
   */
  planning: boolean;
  /** Beneath the heading: "at <step>", "nothing next yet" at the edge (P-101, ruling 4: never "planning"), '' with no run. */
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
  /** P-101 amendment (ruling 9): with a run — the run's level this Plan's routine is (0: the whole run), for Start over (`restartRun(runId, level)`). */
  restartLevel?: number;
}

/**
 * Plan (P-90). `{ runId }`: that run's Plan (undefined once it has ended or is gone). `{ routineId }`:
 * the routine's — which is its open run's Plan when it has one (one surface per run). Reads only.
 */
export function planView(data: Data, of: { runId: Id; in?: Id } | { routineId: Id }): PlanView | undefined {
  const run = 'runId' in of ? readRun(data, of.runId) : openRuns(data).filter((r) => r.routineId === of.routineId && !!place(data, r)).sort(lastTouched)[0];
  if ('runId' in of && (!run || run.endedAt)) return undefined;
  const at = run && place(data, run);
  if (run && !at) return undefined;
  const read = (seqId: Id) => (run ? view(data, run, seqId) : readRoutine(data, seqId));
  // P-101 (ruling 2): "Plan <routine>" from inside a call — the innermost named routine the run is in, as
  // the Plan's routine (its rows, its name, the run's HERE in it). Not a routine the run is in: the whole run's.
  const inAt = run && at && 'in' in of && of.in ? at.frames.findIndex((f, i) => i > 0 && f.seq === of.in && read(f.seq)?.named === true) : -1;
  const root = inAt > 0 ? read(at!.frames[inAt].seq) : readRoutine(data, run ? run.routineId : (of as { routineId: Id }).routineId);
  if (!root || (!run && root.removedAt)) return undefined;
  const words = (item: Item) => (run ? wordsOf(data, run, item) : isRef(item) ? callWords(data, item) : isWait(item) ? item.wait : item.text);
  const frames = (inAt > 0 ? at!.frames.slice(inAt) : at?.frames) ?? [];
  const rows: PlanRow[] = [];
  const dividerOf = (s: Seq): PlanDivider | undefined =>
    s.repeatFrom === undefined ? undefined : { seq: s.id, from: s.repeatFrom, ...(s.repeat !== undefined && { repeat: s.repeat }), canUp: s.repeatFrom > 0, canDown: s.repeatFrom < s.items.length - 1 };
  const walk = (seqId: Id, path: Id[], open: Id[], onWay: boolean, scope: Id, given: string[]) => {
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
      const gives = outOf(item);
      const call = isCall(data, item) ? callOf(item, given) : undefined;
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
        ...(gives && { gives }),
        reads: isRef(item) ? [] : namesIn(words(item)).map((x) => x.name),
        above: [...given],
        scope,
        canBreakDown: isStep(item) && !gives,
        ...(isRef(item) && read(item.ref)?.named === false && hoisted(item.ref)),
        asks: [],
        ...(call && { call }),
      });
      for (const g of [gives, ...(call?.gives ?? [])]) if (g && !given.some((x) => nameKey(x) === nameKey(g))) given.push(g);
      // (A removed routine is not opened: its row says so, and that is all.)
      if (isRef(item) && !call?.removed && !open.includes(item.ref) && depth + 1 < MAX_DEPTH) {
        const named = read(item.ref)?.named !== false;
        walk(item.ref, [...path, item.id], [...open, item.ref], within, named ? item.ref : scope, named ? [] : given);
      }
    });
  };
  const hoisted = (seqId: Id) => {
    const names = hoistedOf(data, run, seqId);
    return names.length ? { hoisted: names } : {};
  };
  /** P-98: a call row — each input of its routine, filled as the row says (by name when a name above has it), and what it gives. */
  const callOf = (item: Item & { ref: Id }, given: string[]): PlanCall => {
    if (!isLiveCall(data, item)) return { inputs: [], gives: [], removed: true };
    const io = callIO(data, item.ref);
    const inputs = io.asks.map((input): CallInput => {
      const b = bindingOf(item, nameKey(input));
      if (b && 'typed' in b) return { input, mode: 'typed', typed: b.typed };
      if (b && 'name' in b) return { input, mode: 'name', name: b.name };
      if (b && 'ask' in b) return { input, mode: 'asks' };
      return given.some((g) => nameKey(g) === nameKey(input)) ? { input, mode: 'name', name: input } : { input, mode: 'asks' };
    });
    return { inputs, gives: io.gives };
  };
  walk(root.id, [], [root.id], true, root.id, []);
  // Audit F9: a name is given for a step only by a step above it (before it, in run order).
  const given = new Set<string>();
  for (const r of rows) {
    r.asks = r.reads.filter((n) => !given.has(nameKey(n)));
    for (const g of rowGives(r)) given.add(nameKey(g));
  }
  const first = read(root.id) ?? root;
  const divider = dividerOf(first);
  const base = { routineId: root.id, name: root.words, named: root.named, rows, ...(divider && { divider }), open: first.open };
  if (!run || !at) {
    return { ...base, planning: false, line: '', edge: false, canDone: false, forward: { kind: 'start', label: 'Start', routineId: root.id, ready: root.items.length > 0 }, unfolded: false };
  }
  const planning = !isRunning(data, run);
  const here = at.item ? wordsOf(data, run, at.item) : undefined;
  return {
    ...base,
    runId: run.id,
    planning,
    line: !planning ? '' : here === undefined ? 'nothing next yet' : `at ${here}`,
    ...(at.item && { at: here, hereKind: kindOf(at.item) }),
    edge: !at.item,
    canDone: !at.item,
    ...(at.item && { forward: { kind: 'resume' as const, label: `Resume at ${here}`, runId: run.id } }),
    unfolded: run.changes.length > 0,
    restartLevel: inAt > 0 ? inAt : 0,
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
    items: s.items.map((i) => ({ id: i.id, kind: kindOf(i), words: isRef(i) ? callWords(data, i) : isWait(i) ? i.wait : i.text })),
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
  restart: 'Start over',
  value: 'Change',
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
  // P-96 (ruling 7): finishing — Next that ends the run, or Done — says "Done with <name>", and its Undo is Done's.
  // P-102 audit F6: a level left (Step out) is not finishing — "Left <level>", its Undo Step out's.
  const left = verb === 'done' && said?.kind === 'finished';
  const label = said?.kind === 'ended' ? LABELS.done : left ? 'Step out' : verb === 'next' && onWait ? 'It’s happened' : LABELS[verb];
  const kept = folded === undefined ? '' : `Kept this run’s changes in ${folded}`;
  const text =
    said?.kind === 'ended'
      ? `Done with ${said.name}`
      : said?.kind === 'finished'
        ? verb === 'done'
          ? `Left ${said.names[0]}`
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
    // P-98: a call added, an input's binding, Copy.
    if (e.kind === 'addCall') return `Added ${quoted(readRoutine(data, e.routine)?.words ?? '')}`;
    if (e.kind === 'bind') return `Changed {${tidyName(e.input)}} for ${item(e.item)}`;
    if (e.kind === 'copy') return `Copied ${quoted(s?.words ?? '')} as ${quoted(e.words)}`;
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
    if (e.kind === 'gives') return `${item(e.item)} gives ${e.name !== undefined ? `{${tidyName(e.name)}}` : 'nothing'}`;
    if (e.kind === 'renameValue') return `Renamed {${tidyName(e.from)}} to {${tidyName(e.to)}}`;
    // P-97: the Tags sheet's Keep.
    if (e.kind === 'tags') return `Changed the tags of ${quoted(s?.words ?? '')}`;
    // P-109: the Places sheet — each change named by the place.
    if (e.kind === 'addPlace') return `Added ${quoted(tidyPlaceText(e.name))}`;
    if (e.kind === 'changePlace' || e.kind === 'movePlace' || e.kind === 'removePlace') {
      const p = placesOf(data.routines[verb.routineId]?.places).find((x) => x.id === e.place);
      return `${e.kind === 'changePlace' ? 'Changed' : e.kind === 'movePlace' ? 'Moved' : 'Removed'} ${quoted(p?.name ?? '')}`;
    }
    return 'Changed Repeat from here';
  }
  if (verb.kind === 'new') return `Made ${quoted(verb.words)}`;
  if (verb.kind === 'restart') {
    const r = readRun(data, verb.runId);
    const f = r?.frames[verb.level];
    return f ? `Started ${view(data, r!, f.seq)?.words ?? ''} over` : '';
  }
  if (verb.kind === 'value') return `${verb.text.trim() ? 'Changed' : 'Cleared'} {${tidyName(verb.name)}}`;
  return '';
}
