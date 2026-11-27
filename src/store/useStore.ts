import { create } from 'zustand';

import { applyUndo, sameValue, UndoEntry, undoEntry } from '@/domain/diff';
import { Settings } from '@/domain/migrate';
import { LogInput, logActivity, newId } from '@/domain/model';
import { currentRun, editRoutine, isRunning, JumpTo, readRun, Refusal, Result, RoutineEdit, runVerb, Verb } from '@/domain/run';
import { Acted, noticeFor, runnerView, whatChanged } from '@/domain/runView';
import { Data, emptyData, Id, Run } from '@/domain/types';
import { nameKey, tidyName } from '@/domain/values';

/**
 * What was in the old app's log box (P-89: the box is gone). Kept only because a page of the old app
 * may have put one in this tab's session storage before reloading itself into this version
 * (`persistence.ts` reads it back): see `toLog` and `logMarked`. Nothing sets it otherwise.
 */
export interface Draft {
  text: string;
  /** null = the person removed the doing chip. */
  doingId?: Id | null;
  toIds: Id[];
  /** Logging this line counted as that wander's next step. */
  fromNextOf?: Id;
  /** The step's text when it was staged; logging clears the step only if it still says this. */
  fromNextText?: string;
}

/** A quiet note (nothing to undo): today only "Just a moment — reconnecting." */
export interface Toast {
  message: string;
  notice?: boolean;
}

/** How the old app's Return was pressed (kept with `ToLog`): `trail` sent the line up lit, `done` settled it at once. */
export interface LogOptions {
  trail?: boolean;
  done?: boolean;
}

/** Where data lives: SQLite (normal), the first release's localStorage format (web fallback). */
export type StorageKind = 'sqlite' | 'local';

export type StorageStatus =
  | { state: 'loading' }
  /**
   * `reconnecting` (web): the page let go of the data while hidden and is taking it back. The data
   * stays on screen and typing works; changes wait (P-29).
   */
  | { state: 'ready'; kind: StorageKind; reconnecting?: boolean }
  /**
   * Couldn't open the saved data; nothing is shown so nothing can be overwritten. `waiting`:
   * another copy of the app holds it, and this page opens by itself once it's free.
   * `details`: "Details: {step} · {message}", for bug reports.
   */
  | { state: 'blocked'; message: string; details?: string; waiting?: boolean };

/**
 * Whether this page holds the data, so it may change it (P-29). A page that is taking the data
 * back ("Reconnecting…") or waiting for another copy of the app to let go of it doesn't: what it
 * shows may be out of date, and anything it changed could be overwritten or lost.
 */
export const holdsData = (s: { storage: StorageStatus }) => s.storage.state !== 'blocked' && !(s.storage.state === 'ready' && s.storage.reconnecting);

/** Shown (once, quietly) when a change is refused because the page doesn't hold the data. */
export const RECONNECTING_NOTICE = 'Just a moment — reconnecting.';

/** Every data-changing action returns this (or `false`) when it's refused. */
export type Refused = { ok: false; reason: 'reconnecting' };

/**
 * The old app's Return pressed while reconnecting (P-29), as its page kept it across a reload: this
 * version logs it once the data shows, if the line is still the one in `draft` (`logMarked`).
 */
export interface ToLog {
  draft: Draft;
  extra?: Partial<LogInput>;
  opts?: LogOptions;
}

/**
 * B-11 (P-86): what a run action answers. `runId`: the run it was about (or started). `routineId`
 * (P-90): the routine `createRoutine` made or found. Refused: why (`reconnecting`: the page doesn't
 * hold the data; the screen keeps what was typed), and for a start refused because something is
 * running, what.
 */
export type Did =
  /** `home` (P-96, ruling 7): the screen goes home — the press ended the run (finishing never opens Plan), or paused it. */
  | { ok: true; runId?: Id; routineId?: Id; home?: true }
  | { ok: false; reason: Refusal | 'reconnecting'; running?: { runId: Id; name: string } };

/**
 * The notice after a run action (one at a time, until the next action). `text` may be '' (the step
 * speaks for itself). Its Undo is offered only while `entry` is still the store's `undo` (the next
 * undoable action anywhere replaces it); `label` is what it takes back ("Undo Next"). Session only.
 */
export interface RunNotice {
  verb: Acted;
  text: string;
  label: string;
  entry?: UndoEntry;
  /**
   * P-101 (ruling 6): a Plan edit — nothing is shown; its Undo stays (the routine's menu, "Undo <edit>";
   * Ctrl/⌘+Z) while it is the last action. A tap does not put it away; a screen change does.
   */
  quiet?: true;
  /**
   * P-101 (ruling 6): the action itself goes to another screen (the run ended: home; the routine removed:
   * home) and the notice goes with it, once — the screen it lands on is where it happened.
   */
  follows?: true;
  /**
   * P-101 audit F1: put away (a tap, a screen change) — no longer shown, but its Undo (`entry`) stays for
   * the panel's row, Ctrl/⌘+Z and Plan's menu until the next change replaces or clears the slot.
   */
  hidden?: true;
}

/** A press on the runner or in Plan while reconnecting (P-86, P-90): applied once the data is back, if the run is as it was. */
export interface ToVerb {
  runId: Id;
  verb: 'next' | 'done' | 'pause' | 'resume' | 'stepIn' | 'plan';
  /** The run as it was on screen at the press. */
  base: Run;
}

/** The same line, chips and step as when it was marked "to log". */
export const sameDraft = (a: Draft, b: Draft) => JSON.stringify(a) === JSON.stringify(b);

interface State {
  data: Data;
  /** Only ever what an old-app page left for this tab (see `Draft`); empty otherwise. */
  draft: Draft;
  /** A quiet note (reconnecting). */
  toast?: Toast;
  /** Reverts the last undoable change (only the records it touched). */
  undo?: UndoEntry;
  /*
   * P-89: five settings of the old app. Nothing reads or changes them any more, but they are saved
   * data (the settings table, the journal, the fallback blob), and persistence writes them from here:
   * taking one out of the store would erase it on the next save. They stay exactly as loaded.
   */
  showShading: boolean;
  recentSearches: string[];
  leftAsIs: Id[];
  whyOfferOff: boolean;
  firstRunDone: boolean;
  storage: StorageStatus;
  /** Set when a save failed; cleared by the next successful save. */
  saveError?: string;
  /** A Return the old app kept across its reload (see `ToLog`). */
  toLog?: ToLog;
  /** B-11 (P-86): the notice after the last run action. Session only. */
  runNotice?: RunNotice;
  /** B-11 (P-86), P-90: Next, Done, Pause, Resume, Step in or Plan pressed while reconnecting. Session only. */
  toVerb?: ToVerb;

  /*
   * Data-changing actions go through one gate: while the page doesn't hold the data (`holdsData`)
   * they change nothing and show RECONNECTING_NOTICE. Those that return nothing else return false
   * then (true otherwise).
   */
  /** The data is there: logs the line an old-app page kept (`toLog`), once, if it's still the one in `draft`. */
  logMarked: () => void;
  undoLast: () => boolean;
  dismissToast: () => void;
  /** Import's Replace. */
  replaceData: (data: Data) => boolean;
  /**
   * Shows the saved data again after another copy of the app may have changed it (P-29).
   * `keepUndo`: false when the data changed underneath, so Undo (and its notice) go.
   * Persistence calls it once the page holds the data again.
   */
  refreshData: (data: Data, settings: Settings, keepUndo: boolean) => boolean;

  /*
   * B-11 slice 1 (P-86), B-12 (P-90): routines and runs. Every one goes through the engine
   * (domain/run.ts) and the gate; each either leaves an Undo (with `runNotice`) or clears the Undo
   * slot, never a stale one. Next, Done, Pause, Resume, Step in and Plan pressed while reconnecting
   * are kept (`toVerb`) and applied by `verbMarked` once the data is back, if the run is unchanged;
   * the ones that carry typed text are refused (`reconnecting`) and the screen keeps the text.
   */
  /** Start (a tile, a row, Plan's Start for a routine with no run). A routine with a run going: that run is resumed. Refused `running` (saying what) while another run is running; `empty` for a routine with no steps. No Undo (P-95). */
  /** `keepUndo`: the press also kept words still open in Plan — that edit's notice and Undo stay (never a silent edit). */
  startRoutine: (routineId: Id, keepUndo?: boolean) => Did;
  /** "New: <words>", the New tile (P-90): makes the routine only — named, on home, open edge, no steps, NO run — and answers with `routineId` (for a name there is: that routine, nothing written). Undo removes it. */
  createRoutine: (words: string) => Did;
  /** Resume (a tile, the paused screen, a row under it) and Plan's "Resume at <step>": running exactly where it was, out of Plan. Refused `asking` at the edge, `running` while another run is running. No Undo. */
  /** `keepUndo`: as for `startRoutine`. */
  resumeRun: (runId: Id, keepUndo?: boolean) => Did;
  /**
   * Plan (the runner's button, the paused screen's, a tile's): the run is in Plan — and paused, in the
   * same write, if it was the one running; planned from a tile it does not become the run the app is on.
   * A run from the build before that still carries this-run changes: they are folded into the routine in
   * that write, with a notice naming it and an Undo (which takes the run out of Plan again, as it was).
   * Otherwise no Undo. Already in Plan: nothing changes. Kept while reconnecting.
   */
  planRun: (runId: Id) => Did;
  /** Pause, with a reason or none (P-101: the Pause sheet's note; blank takes a stored one away; none leaves it). No Undo. While reconnecting a bare press is kept; one with a note is refused (the sheet keeps the words). */
  pauseRun: (runId: Id, reason?: string) => Did;
  /** The reason edited in place (each keystroke): only the reason changes; the Undo slot is left alone. */
  setPauseReason: (runId: Id, text: string) => Did;
  /** Home, after "Stop <name>?": nothing is running; the run stays where it is. No Undo. */
  leaveRun: (runId: Id) => Did;
  /** Next ("It's happened" on a wait). An Undo only when it ended the run (P-95). */
  /** P-98: `owed` — what Next asked for, on a call or a step broken down not stepped into (given by that row, in the same write). */
  nextStep: (runId: Id, owed?: { name: string; text: string }[]) => Did;
  /** Done: leaves the level it is in; at the top ends the run. Undo. */
  /** P-98: `owed` — what Step out asked for (the names the level still owed), given by the row it was entered from. */
  doneLevel: (runId: Id, owed?: { name: string; text: string }[]) => Did;
  /** P-103: "End this run" (a paused tile's ···, asked first): the existing end verb, Done, for the whole run where it stands. Final, as every finish: × only. */
  endRun: (runId: Id) => Did;
  /** Step in. No Undo (P-95). P-98: refused past the depth it can go, or into a removed routine — said in words (a notice). */
  stepIn: (runId: Id) => Did;
  /** Jump to…: `{ level }` the start of a level it is in; `{ path }` a step (a Jump row's path). The run is running afterwards (out of Plan). Undo: it can leave levels and reset the round (P-95 audit F4). */
  jumpTo: (runId: Id, to: JumpTo) => Did;
  /** Back to <step>. No Undo (P-95). */
  backTo: (runId: Id) => Did;
  /**
   * P-101 amendment (ruling 9): Start over — `level` of the run (0: the whole run) from its first step, the
   * values given inside it gone; the same run, its status kept. Asked first by the screen; a notice and an Undo.
   */
  restartRun: (runId: Id, level: number) => Did;
  /**
   * Every Plan edit (P-90): it changes the ROUTINE (`routineId` is the row's sequence — the routine,
   * or the one a step was broken into). Open runs are kept standing in the same write, so the one
   * Undo restores the routine and every run together; the notice names the edit.
   */
  editRoutine: (routineId: Id, edit: RoutineEdit) => Did;
  /**
   * P-96: typed in a field of the runner's step (`RunnerView.fields`): `itemId` is the step the run is on,
   * which gives the name or asks for it. Kept as typed, keystroke by keystroke; blank clears it. No notice,
   * and the Undo slot is left alone (ruling 4). Refused while reconnecting: the screen keeps the text.
   */
  typeValue: (runId: Id, itemId: Id, name: string, text: string) => Did;
  /**
   * P-107: a list given in the list field of the runner's step (a name a for each reads) — one item per row, blank
   * rows dropped, none clears it. As `typeValue`: no notice, the Undo slot left alone (`typedOver` names a change).
   */
  typeList: (runId: Id, itemId: Id, name: string, items: string[]) => Did;
  /**
   * P-96: the value sheet — call once, on Close, with what is in its field. Replacing or clearing the value
   * the run's step sees leaves "Changed {name}" / "Cleared {name}" with an Undo (ruling 4); the same text
   * writes nothing. Refused `cannot` when there is no such value.
   */
  changeValue: (runId: Id, name: string, text: string) => Did;
  /**
   * P-96 audit F3: the step's own field was left after an edit that began with the value `was` (the
   * keystrokes were kept by `typeValue`). Replaced or cleared: "Changed / Cleared {name}" with Undo, once.
   * First giving (`was` empty) and an edit that ends where it began leave nothing.
   */
  /** P-107: `wasItems` — the list it began with (a list field): the Undo puts those items back, one per row. */
  typedOver: (runId: Id, itemId: Id, name: string, was: string, wasItems?: string[]) => Did;
  /** P-98: a refusal said in words, in the notice's row (nothing changed, nothing to undo): Plan's "a routine as a step of itself". */
  say: (text: string) => void;
  /** The notice was put away. Session only. */
  dismissRunNotice: () => void;
  /** P-102: the notice's × — put away, as a tap elsewhere would (an Undo it had stays in the panel and Ctrl/⌘+Z); the quiet line goes too. */
  hideNotice: () => void;
  /**
   * P-101 (ruling 6): the screen changed — the notice is put away (it is never shown on another screen;
   * audit F1: its Undo stays), unless the action that made it is what changed the screen (`follows`):
   * then it is shown there, this once.
   */
  screenChanged: () => void;
  /** P-101 (ruling 6): a tap anywhere but on the notice puts a shown notice away (a quiet one stays). */
  tapped: () => void;
  /** The data is back: applies the press kept while reconnecting, once, if its run is as it was. */
  verbMarked: () => void;
}

const emptyDraft = (): Draft => ({ text: '', toIds: [] });
/** A value read back from session storage, if it is text. */
const text_ = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

/**
 * App state. Saving to disk is handled by src/storage/persistence.ts, which loads the data,
 * then writes every change to SQLite in the background.
 */
/**
 * The one gate for data-changing actions (P-29). A page that doesn't hold the data refuses: nothing
 * changes (so nothing is journaled or written, and there's nothing to undo), and one quiet note
 * says why — or `onRefused` does something else instead (a press on the runner is kept).
 */
function gated<F extends (...args: never[]) => unknown>(refused: ReturnType<F>, action: F, onRefused?: (...args: Parameters<F>) => void): F {
  return ((...args: Parameters<F>) => {
    const s = useStore.getState();
    if (holdsData(s)) return action(...args);
    if (onRefused) onRefused(...args);
    else sayReconnecting();
    return refused;
  }) as F;
}

/** The one quiet "Just a moment — reconnecting." for a refused change. */
function sayReconnecting() {
  if (useStore.getState().toast?.message !== RECONNECTING_NOTICE) useStore.setState({ toast: { message: RECONNECTING_NOTICE, notice: true } });
}

const refused: Refused = { ok: false, reason: 'reconnecting' };

/** `set`, for the gated actions that return whether they ran (always, once past the gate). */
function change(patch: Partial<State> | ((s: State) => Partial<State>)): true {
  useStore.setState(patch);
  return true;
}

/**
 * One run action (P-86): the engine's answer put in the store. `undo`: 'set' leaves an Undo and its
 * notice; 'clear' empties the Undo slot (nothing stale to take back later); 'keep' leaves it alone
 * (the reason, typed; a Resume or Start whose press also kept words open in Plan); 'ends' (Next) is
 * 'set' only when it ended the run, else 'clear'. A quiet note (reconnecting) goes with any but 'keep'.
 *
 * P-95 (the owner: "Why would I want to undo an execution"): an Undo and its notice follow only what
 * loses or reshapes something — a Plan edit, New, Done, Jump to (it can leave levels and reset the
 * round), a run ended, this-run changes folded (by any verb). Moving through a run (Start, Next, Step
 * in, Back to, Pause, Resume, Plan) leaves none.
 */
function act(verb: Verb | { kind: 'editRoutine'; routineId: Id; edit: RoutineEdit }, mode: 'set' | 'clear' | 'keep' | 'ends'): Did {
  let undo = mode;
  const s = useStore.getState();
  const env = { now: new Date().toISOString(), id: newId };
  const runId = 'runId' in verb ? verb.runId : undefined;
  const onWait = verb.kind === 'next' && runnerView(s.data, verb.runId)?.step.kind === 'wait';
  // What it did, naming the thing (read before it is done).
  const what = whatChanged(s.data, verb);
  const r: Result = verb.kind === 'editRoutine' ? editRoutine(s.data, verb.routineId, verb.edit, env) : runVerb(s.data, verb, env);
  // Plan leaves an Undo only when it folded this-run changes into the routine (ruling 3); otherwise, like Pause, it clears the slot.
  if (verb.kind === 'plan') undo = r.folded !== undefined ? 'set' : 'clear';
  // Next leaves an Undo only when it finished the run (P-95): that loses the run's place.
  if (undo === 'ends') undo = r.said?.kind === 'ended' ? 'set' : 'clear';
  // Whatever the verb, a write that folded this-run changes into the routine is named, with its Undo (audit F1).
  if (r.folded !== undefined) undo = 'set';
  // P-96 audit F2: Back to across a round boundary can clear values typed in the round it leaves — never
  // silently: it is named, with an Undo.
  const cleared = verb.kind === 'back' && r.ok ? clearedNames(s.data, r.data, verb.runId) : [];
  if (cleared.length) undo = 'set';
  // P-96 audit F3: a value typed over in the step's own field keeps its Undo through the move that follows.
  if (undo === 'clear' && (verb.kind === 'next' || verb.kind === 'stepIn') && s.runNotice?.verb === 'value' && s.runNotice.entry && s.runNotice.entry === s.undo) undo = 'keep';
  if (!r.ok) {
    // One thing runs at a time: say what is running.
    if (r.running) useStore.setState({ runNotice: { verb: verb.kind, text: `${r.running.name} is running`, label: '' } });
    // P-98: the depth refusal, and a removed routine, in words.
    else if (verb.kind === 'stepIn' && (r.reason === 'too-deep' || r.reason === 'gone')) useStore.setState({ runNotice: { verb: 'stepIn', text: r.reason === 'too-deep' ? STEP_IN_TOO_DEEP : 'That routine was removed', label: '' } });
    return { ok: false, reason: r.reason ?? 'cannot', ...(r.running && { running: r.running }) };
  }
  // P-96 (ruling 7): finishing ends the run and Pause puts it down — either way the screen goes home.
  const home = r.said?.kind === 'ended' || verb.kind === 'pause';
  const did: Did = { ok: true, ...((r.runId ?? runId) !== undefined && { runId: r.runId ?? runId }), ...(r.routineId !== undefined && { routineId: r.routineId }), ...(home && { home: true as const }) };
  if (r.data === s.data) return did;
  if (undo === 'keep') {
    useStore.setState({ data: r.data });
    return did;
  }
  // P-102 (owner, 2026-11-27: "You should not undo a 'Done'"): finishing a run is final — "Done with <name>",
  // dismissed with ×, and nothing to take back (no Undo on the notice, the panel or Ctrl/⌘+Z).
  const ended = r.said?.kind === 'ended';
  // A start that found a run to resume made nothing to take back.
  const entry = undo === 'set' && !ended && !(r.runId && s.data.runs[r.runId]) ? undoEntry(s.data, r.data) : undefined;
  useStore.setState({
    data: r.data,
    undo: entry,
    runNotice: ended
      ? { verb: verb.kind, ...said(noticeFor(verb.kind, r.said, onWait, r.folded), what), follows: true as const }
      : entry
      ? {
          verb: verb.kind,
          ...said(noticeFor(verb.kind, r.said, onWait, r.folded), cleared.length ? `Cleared ${cleared.map((n) => `{${n}}`).join(', ')}` : what),
          entry,
          // P-101 (ruling 6): Plan's edits say nothing. What changes the screen itself (the run ended: home; New, and
          // Plan's fold of an earlier build's changes: its Plan; Jump to…: the runner; the routine removed: home)
          // carries its notice there, once.
          // P-103 (audit F-4): removing a step is said, with its Undo, as every Remove (the conventional snackbar).
          // P-98: Copy is said too ("Copied “X” as “Y”" with its Undo): it makes a routine that is not on this screen.
          // P-109: the Places sheet's changes are said in the sheet, each with its Undo (the routine's menu is under it).
          ...(verb.kind === 'editRoutine' && verb.edit.kind !== 'removeRoutine' && verb.edit.kind !== 'remove' && verb.edit.kind !== 'copy' && !PLACE_EDITS.has(verb.edit.kind) && { quiet: true as const }),
          ...((r.said?.kind === 'ended' || verb.kind === 'new' || verb.kind === 'plan' || verb.kind === 'jump' || (verb.kind === 'editRoutine' && verb.edit.kind === 'removeRoutine')) && { follows: true as const }),
        }
      : undefined,
    toVerb: undefined,
    toast: undefined,
  });
  return did;
}

/** P-109: the Places sheet's edits (each said, with its Undo, in the sheet). */
const PLACE_EDITS = new Set<RoutineEdit['kind']>(['addPlace', 'changePlace', 'movePlace', 'removePlace']);

/** P-98: what Step in says when the run is as deep as it can go. */
export const STEP_IN_TOO_DEEP = 'Can’t step in any deeper';

/** P-96 audit F2: the names of the run's values a write took away (one name at one level each, as given). */
function clearedNames(before: Data, after: Data, runId: Id): string[] {
  const was = readRun(before, runId)?.values ?? [];
  const now = readRun(after, runId)?.values ?? [];
  const has = new Set(now.map((e) => `${e.level}|${nameKey(e.name)}`));
  return was.filter((e) => !has.has(`${e.level}|${nameKey(e.name)}`)).map((e) => e.name);
}

/**
 * P-96 audit F3 (ruling 4): the step's own field was left after typing over a value it opened with
 * (`was`): one notice, "Changed {x}" / "Cleared {x}", with an Undo that puts `was` back. The keystrokes
 * themselves wrote as they went ('keep'); this only names the edit and makes it undoable, once.
 */
function typedOverValue(runId: Id, itemId: Id, name: string, was: string, wasItems?: string[]): Did {
  const s = useStore.getState();
  const now = runnerView(s.data, runId)?.fields.find((f) => nameKey(f.name) === nameKey(name));
  const run = readRun(s.data, runId);
  if (!run || !was.trim()) return { ok: true, runId };
  const current = now?.text ?? '';
  // (P-107: a list is the same only item for item.)
  if (wasItems ? JSON.stringify(now?.items ?? []) === JSON.stringify(wasItems) : current === was) return { ok: true, runId };
  const back = runVerb(s.data, { kind: 'value', runId, name, text: was, item: itemId, ...(wasItems && { items: wasItems }) }, { now: new Date().toISOString(), id: newId });
  if (!back.ok || back.data === s.data) return { ok: true, runId };
  const entry = undoEntry(back.data, s.data);
  useStore.setState({ undo: entry, runNotice: { verb: 'value', text: `${current.trim() ? 'Changed' : 'Cleared'} {${tidyName(name)}}`, label: 'Change', entry } });
  return { ok: true, runId };
}

/** The notice's words: what the engine says happened ("Finished …"), else the thing the action was done to. */
const said = (n: { text: string; label: string }, what: string) => ({ text: n.text || what, label: n.label });

/**
 * One thing at a time (the owner: to switch, you must pause first): while a DIFFERENT run is running
 * nothing else is resumed or started — refused, saying what is running. Never a silent demotion.
 */
function busyWith(but?: Id): Did | undefined {
  const cur = currentRun(useStore.getState().data);
  if (!cur || !isRunning(useStore.getState().data, cur) || cur.id === but) return undefined;
  const name = runnerView(useStore.getState().data, cur.id)?.name ?? '';
  useStore.setState({ runNotice: { verb: 'resume', text: `${name} is running`, label: '' } });
  return { ok: false, reason: 'running', running: { runId: cur.id, name } };
}

/** A press on the runner while reconnecting (P-86): kept, the latest one; pressed again, it is still one press. */
function keepPress(verb: ToVerb['verb'], runId: Id) {
  const s = useStore.getState();
  const base = Object.prototype.hasOwnProperty.call(s.data.runs, runId) ? s.data.runs[runId] : undefined;
  if (base && !(s.toVerb?.verb === verb && s.toVerb.runId === runId)) useStore.setState({ toVerb: { runId, verb, base } });
  sayReconnecting();
}

export const useStore = create<State>()((set, get) => ({
  data: emptyData(),
  draft: emptyDraft(),
  showShading: true,
  recentSearches: [],
  leftAsIs: [],
  whyOfferOff: false,
  firstRunDone: false,
  storage: { state: 'loading' },

  logMarked: () => {
    const { toLog, draft, data } = get();
    if (!toLog || !holdsData(get())) return;
    // Whatever happens it is tried once: a kept Return is never left to be tried again.
    set({ toLog: undefined });
    try {
      // Changed since Return was pressed (or nothing to log): the old app would have waited for the next Return.
      const text = String(toLog.extra?.text ?? draft.text).trim();
      if (!sameDraft(toLog.draft, draft) || !text) return;
      // As the old app's Return logged it: its words, its chips, and lit or settled if it was sent up.
      const { extra, opts } = toLog;
      // (Across the reload a date is text.)
      const occurredAt = extra?.occurredAt ? new Date(extra.occurredAt) : undefined;
      const toIds = extra?.toIds ?? draft.toIds;
      // Session storage is only text another page wrote: anything not in the old app's shape is not logged.
      if ((occurredAt && Number.isNaN(occurredAt.getTime())) || !Array.isArray(toIds) || !toIds.every((id) => typeof id === 'string')) return;
      const res = logActivity(data, {
        text,
        doingId: text_(extra?.doingId ?? draft.doingId),
        toIds,
        fromNextOf: text_(extra?.fromNextOf ?? draft.fromNextOf),
        fromNextText: text_(extra?.fromNextOf ? extra.fromNextText : draft.fromNextText),
        occurredAt,
        note: text_(extra?.note),
        lit: !!opts?.trail && !opts.done,
        settled: !!opts?.trail && !!opts.done,
      });
      set({ data: res.data, draft: emptyDraft() });
    } catch {
      // Not a line the old app could have kept: dropped, and the data opens as it is (audit B1).
    }
  },

  undoLast: gated<State['undoLast']>(false, () => {
    const { undo, data } = get();
    if (undo) set({ data: applyUndo(data, undo), undo: undefined, toast: undefined, runNotice: undefined });
    return true;
  }),

  dismissToast: () => set({ toast: undefined }),
  replaceData: gated<State['replaceData']>(false, (data) => change({ data, undo: undefined, toast: undefined, draft: emptyDraft(), runNotice: undefined, toVerb: undefined })),
  refreshData: gated<State['refreshData']>(false, (data, settings, keepUndo) =>
    change({
      data,
      ...settings,
      ...(!keepUndo && { undo: undefined, toast: undefined, runNotice: undefined }),
    }),
  ),

  startRoutine: gated<State['startRoutine']>(refused, (routineId, keepUndo) => {
    // A second tap on Start: the run it made is running already, and its Undo stays.
    const cur = currentRun(get().data);
    if (cur && isRunning(get().data, cur) && cur.routineId === routineId) return { ok: true, runId: cur.id };
    // A routine whose run was left: its Start is a Resume, and that needs nothing else running.
    const had = Object.keys(get().data.runs).map((id) => readRun(get().data, id)).find((r) => r && !r.endedAt && r.routineId === routineId);
    return (had && busyWith(had.id)) ?? act({ kind: 'start', routineId }, keepUndo ? 'keep' : 'clear');
  }),
  createRoutine: gated<State['createRoutine']>(refused, (words) => act({ kind: 'new', words }, 'set')),
  resumeRun: gated<State['resumeRun']>(
    refused,
    (runId, keepUndo) => {
      const run = readRun(get().data, runId);
      return run && isRunning(get().data, run) ? { ok: true, runId } : (busyWith(runId) ?? act({ kind: 'resume', runId }, keepUndo ? 'keep' : 'clear'));
    },
    (runId) => keepPress('resume', runId),
  ),
  planRun: gated<State['planRun']>(
    refused,
    (runId) => act({ kind: 'plan', runId }, 'clear'),
    (runId) => keepPress('plan', runId),
  ),
  pauseRun: gated<State['pauseRun']>(
    refused,
    (runId, reason) => act({ kind: 'pause', runId, ...(reason !== undefined && { reason }) }, 'clear'),
    // P-101 (ruling 3): a press that carries a note is refused like any typed text (the sheet keeps it); a bare one is kept.
    (runId, reason) => (reason !== undefined ? sayReconnecting() : keepPress('pause', runId)),
  ),
  setPauseReason: gated<State['setPauseReason']>(refused, (runId, text) => act({ kind: 'reason', runId, text }, 'keep')),
  leaveRun: gated<State['leaveRun']>(refused, (runId) => act({ kind: 'home', runId }, 'clear')),
  nextStep: gated<State['nextStep']>(
    refused,
    (runId, owed) => act({ kind: 'next', runId, ...(owed?.length && { owed }) }, 'ends'),
    // P-98: a press that carries typed values is refused like any typed text (the sheet keeps them); a bare one is kept.
    (runId, owed) => (owed?.length ? sayReconnecting() : keepPress('next', runId)),
  ),
  doneLevel: gated<State['doneLevel']>(
    refused,
    (runId, owed) => act({ kind: 'done', runId, ...(owed?.length && { owed }) }, 'set'),
    // P-98: a press that carries typed values is refused like any typed text (the sheet keeps them); a bare one is kept.
    (runId, owed) => (owed?.length ? sayReconnecting() : keepPress('done', runId)),
  ),
  endRun: gated<State['endRun']>(refused, (runId) => act({ kind: 'done', runId, whole: true }, 'set')),
  stepIn: gated<State['stepIn']>(
    refused,
    (runId) => act({ kind: 'stepIn', runId }, 'clear'),
    (runId) => keepPress('stepIn', runId),
  ),
  // A jump makes its run the one that is running: like Resume, refused while a different run is (F7).
  jumpTo: gated<State['jumpTo']>(refused, (runId, to) => busyWith(runId) ?? act({ kind: 'jump', runId, to }, 'set')),
  backTo: gated<State['backTo']>(refused, (runId) => act({ kind: 'back', runId }, 'clear')),
  restartRun: gated<State['restartRun']>(refused, (runId, level) => act({ kind: 'restart', runId, level }, 'set')),
  editRoutine: gated<State['editRoutine']>(refused, (routineId, edit) => act({ kind: 'editRoutine', routineId, edit }, 'set')),
  typeValue: gated<State['typeValue']>(refused, (runId, itemId, name, text) => act({ kind: 'value', runId, name, text, item: itemId }, 'keep')),
  typeList: gated<State['typeList']>(refused, (runId, itemId, name, items) => act({ kind: 'value', runId, name, text: items.join('\n'), items, item: itemId }, 'keep')),
  changeValue: gated<State['changeValue']>(refused, (runId, name, text) => act({ kind: 'value', runId, name, text }, 'set')),
  typedOver: gated<State['typedOver']>(refused, typedOverValue),
  say: (text) => set({ runNotice: { verb: 'editRoutine', text, label: '' } }),
  dismissRunNotice: () => set((s) => (s.runNotice ? { runNotice: undefined } : {})),
  hideNotice: () => set((s) => ({ ...(s.runNotice && !s.runNotice.hidden && { runNotice: { ...s.runNotice, hidden: true as const } }), ...(s.toast?.notice && { toast: undefined }) })),
  screenChanged: () =>
    set((s) => {
      if (!s.runNotice) return {};
      if (!s.runNotice.follows) return s.runNotice.hidden ? {} : { runNotice: { ...s.runNotice, hidden: true } };
      const { follows: _carried, ...stays } = s.runNotice;
      return { runNotice: stays };
    }),
  // Audit F1: the notice is put away, never its Undo (that goes only with the next change).
  tapped: () => set((s) => (s.runNotice && !s.runNotice.quiet && !s.runNotice.hidden ? { runNotice: { ...s.runNotice, hidden: true } } : {})),

  verbMarked: () => {
    const { toVerb, data } = get();
    if (!toVerb || !holdsData(get())) return;
    set({ toVerb: undefined });
    // Changed since the press (another copy of the app moved it on): the press is dropped, never applied twice.
    const now = Object.prototype.hasOwnProperty.call(data.runs, toVerb.runId) ? data.runs[toVerb.runId] : undefined;
    if (!now || !sameValue(now, toVerb.base)) return;
    const s = get();
    if (toVerb.verb === 'next') s.nextStep(toVerb.runId);
    else if (toVerb.verb === 'done') s.doneLevel(toVerb.runId);
    else if (toVerb.verb === 'stepIn') s.stepIn(toVerb.runId);
    else if (toVerb.verb === 'pause') s.pauseRun(toVerb.runId);
    else if (toVerb.verb === 'plan') s.planRun(toVerb.runId);
    else s.resumeRun(toVerb.runId);
  },
}));
