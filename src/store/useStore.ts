import { create } from 'zustand';

import type { Drafts } from '@/domain/chunk';
import { applyUndo, sameValue, UndoEntry, undoEntry } from '@/domain/diff';
import { Settings } from '@/domain/migrate';
import { LogInput, logActivity, newId } from '@/domain/model';
import { activePart, ChunkGiven, currentRun, holdsLockedParts, place, editRoutine, Given, isRunning, JumpTo, ListRef, readRun, Refusal, Result, RoutineEdit, runVerb, Verb } from '@/domain/run';
import { copiedWords, Copied, copyAndAdd, copyFromLibrary, usesYour } from '@/domain/library';
import { beginDraft, cancelDraft, draftEdit, draftOf, DraftResult, hasChanges, saveDraft as saveTheDraft, undoDraftStep } from '@/domain/draft';
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
  | { ok: false; reason: Refusal | 'reconnecting' | DraftRefusal; running?: { runId: Id; name: string }; names?: string[] };

/**
 * P-115: why a draft action was refused — `changed`: a routine the draft changed was changed elsewhere since (`names`);
 * `locked`: the draft is in a shape this version cannot read (kept, never written over); `no-draft`: there is none.
 */
export type DraftRefusal = 'changed' | 'locked' | 'no-draft';

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
  /**
   * P-115: a change to the draft of this routine (an edit into it, Save, Cancel) — once its Undo is taken, the draft's
   * edit before it is the next Undo (Undo goes back through the draft step by step).
   */
  draft?: Id;
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
  /**
   * F-1 (engine #6): the runner's See ahead view, per run — on or off, and at each place it was looked at from, how many
   * steps were in view, which were open and what was typed (drafts). Kept here, not in the screen, so Pause, Plan and
   * home (the runner goes away) and a move elsewhere never drop what was typed: back at that place, it is there again.
   * Nothing of it is stored on disk; session only.
   */
  seeAhead: Record<Id, SeeAhead>;

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
  /** `keepUndo`: as for `startRoutine`. `into` (F-1, home's queue): resting on a call not stepped into, Resume lands on its first step. */
  resumeRun: (runId: Id, keepUndo?: boolean, into?: boolean) => Did;
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
  /**
   * P-112: `chunk` — Next over the steps in view (See ahead), each taken as done with what was typed for it, in one write.
   * Over more than one step it leaves an Undo (it is a skip, as Jump to is); over one it is Next.
   */
  nextStep: (runId: Id, owed?: Given[], chunk?: ChunkGiven[]) => Did;
  /** Done: leaves the level it is in; at the top ends the run. Undo. */
  /** P-98: `owed` — what Step out asked for (the names the level still owed), given by the row it was entered from. */
  /**
   * P-99 (the P-112 investigator's repro 4): with See ahead on, `given` — what was typed for the step the run is on, given
   * first in the same write (a value typed over is said, with the Undo); `notKept` — names typed for steps further down,
   * which Step out passes over: said in its notice, never dropped silently.
   */
  doneLevel: (runId: Id, owed?: { name: string; text: string }[], given?: Given[], notKept?: string[]) => Did;
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
  /** P-108: `refs` — the value is a routine (chosen in the field): `[{ ref, name }]`, held by reference. */
  typeValue: (runId: Id, itemId: Id, name: string, text: string, refs?: (ListRef | null)[]) => Did;
  /**
   * P-107: a list given in the list field of the runner's step (a name a for each reads) — one item per row, blank
   * rows dropped, none clears it. As `typeValue`: no notice, the Undo slot left alone (`typedOver` names a change).
   */
  /** P-108: `refs` — the routines the rows hold, one per row (null: words). */
  typeList: (runId: Id, itemId: Id, name: string, items: string[], refs?: (ListRef | null)[]) => Did;
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
  /** P-108: `wasRefs` — the routines it held: the Undo puts them back too. */
  typedOver: (runId: Id, itemId: Id, name: string, was: string, wasItems?: string[], wasRefs?: (ListRef | null)[]) => Did;
  /**
   * P-100: home's queue — a run's row moved `to` rows (negative: up; a drag is several at once) or to the top (the
   * row's ··· Move up / Move down / To the top, and its grip). One write; a notice ("Moved “X” up") and an Undo.
   */
  moveInQueue: (runId: Id, to: number | 'top') => Did;
  /**
   * P-99: a part of an In any order block taken up (the runner's parts on the block's row, the panel's and a tile's
   * tree view) — `level`, the level holding the block's row. Putting down the part the run is in leaves an Undo and its
   * notice ("Took up “Study”"): one Undo brings both parts back as they were. From the row (nothing put down): no Undo,
   * as Step in. Refused `ended` for a part that returned or was stopped.
   */
  takeUpPart: (runId: Id, level: number, part: Id) => Did;
  /**
   * P-104 / P-106 (B-17 journey 3): Copy from the library — the library routine `libId` made the person's (a template
   * under `words`), with what it calls, in one write: a notice ("Copied “X”", "… and what it calls") and one Undo for
   * all. Refused `same-name` for a name already theirs (nothing written), `empty` for no name.
   */
  copyFromLibrary: (libId: Id, words?: string) => Did;
  /**
   * P-105 (B-17 journey 4): Copy and add — the library method copied and added as a step of `seq` (after `after`; absent:
   * at the end), in one write. A Plan edit: no notice; its Undo (the routine's menu, Ctrl/⌘+Z) removes both.
   */
  copyAndAdd: (libId: Id, seq: Id, after?: Id | null) => Did;
  /**
   * P-115 (the owner: "Edit, then Save/Cancel"; "Kept as a draft"): Edit — a draft of the routine (stored on it, so a
   * reload, the journal, export and import keep it, and Plan reopens in Edit). Already one: nothing changes. No Undo
   * (the Undo slot is emptied: nothing before it can be taken back into the draft). Refused `locked` for a draft this
   * version cannot read.
   */
  beginEdit: (routineId: Id) => Did;
  /**
   * P-115: a Plan edit made in Edit — into the draft of `rootId` (the routine whose Plan it is), never the routine: a run
   * and home keep reading the saved one. Refused as the edit would be. Its notice and Undo as a Plan edit's (quiet, but
   * a removed step's, said); Undo takes back the draft's last edit, then the one before (step by step).
   */
  editDraft: (rootId: Id, seq: Id, edit: RoutineEdit) => Did;
  /** P-115: Copy and add (P-105) made in Edit — into the draft, as `editDraft`. */
  copyAndAddDraft: (rootId: Id, libId: Id, seq: Id, after?: Id | null) => Did;
  /**
   * P-115: Save — the draft made the routine's in ONE write, said ("Saved “X”") with one Undo, which brings the routine
   * (and the runs it repaired) back and the draft with it. Nothing in the draft: Edit ends, nothing to say. Refused
   * `changed` (naming them) when a routine it changed was changed elsewhere since — `anyway` saves over what is saved
   * now (asked first by the screen); `cannot` when the edits can no longer be made there.
   */
  saveDraft: (rootId: Id, anyway?: boolean) => Did;
  /** P-115: Cancel — the draft thrown away; with changes in it, said ("Discarded changes to “X”") with an Undo that brings it back. */
  cancelDraft: (rootId: Id) => Did;
  /**
   * P-115 (B-19: the composer ends in Plan, to look it over): the routine opened in Edit with these edits in its draft
   * already (each one of the draft's steps; one write). Refused whole if any is. The screen then opens its Plan.
   */
  openInEdit: (routineId: Id, edits: { seq: Id; edit: RoutineEdit }[]) => Did;
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
  /** F-1 (engine #6): See ahead turned on or off for a run, or its view at a place changed (`seeAhead`). Changes no data. */
  setSeeAhead: (runId: Id, patch: { on?: boolean; at?: string; chunk?: ChunkState }) => void;
}

/** F-1 (engine #6): the See ahead view at one place — how many steps are in view, which are open, what was typed. */
export interface ChunkState {
  n: number;
  open: string[];
  drafts: Drafts;
}
/** F-1 (engine #6): a run's See ahead view (`State.seeAhead`). */
export interface SeeAhead {
  on: boolean;
  /** By place (`chunkAt`). */
  at: Record<string, ChunkState>;
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
function act(verb: Verb | { kind: 'editRoutine'; routineId: Id; edit: RoutineEdit }, mode: 'set' | 'clear' | 'keep' | 'ends', notKept: string[] = []): Did {
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
  // P-110: and any move that clears values whose giving step is no longer above the place (Back, Jump, Start over;
  // a value an earlier build let a step give ahead) — named, with the move's Undo.
  const cleared = r.ok ? namesOnce([...(verb.kind === 'back' ? clearedNames(s.data, r.data, verb.runId) : []), ...(r.cleared ?? [])]) : [];
  if (cleared.length) undo = 'set';
  // P-99 (the P-112 investigator's repro 1): a value typed over in See ahead's fields is said, with its Undo, as P-96's own field has it.
  const typedOver = r.ok ? (r.changed ?? []) : [];
  if (typedOver.length) undo = 'set';
  const extra = [...typedOver.map((n) => `Changed {${n}}`), ...(r.ok && notKept.length ? [`Not kept: ${notKept.map((n) => `{${n}}`).join(', ')}`] : [])];
  const more = (n: { text: string; label: string }) => (extra.length ? { ...n, text: [n.text, ...extra].filter(Boolean).join(' · ') } : n);
  // P-96 audit F3: a value typed over in the step's own field keeps its Undo through the move that follows.
  if (undo === 'clear' && (verb.kind === 'next' || verb.kind === 'stepIn') && s.runNotice?.verb === 'value' && s.runNotice.entry && s.runNotice.entry === s.undo) undo = 'keep';
  if (!r.ok) {
    // One thing runs at a time: say what is running.
    if (r.running) useStore.setState({ runNotice: { verb: verb.kind, text: `${r.running.name} is running`, label: '' } });
    // P-98: the depth refusal, and a removed routine, in words.
    else if (verb.kind === 'stepIn' && (r.reason === 'too-deep' || r.reason === 'gone')) useStore.setState({ runNotice: { verb: 'stepIn', text: r.reason === 'too-deep' ? STEP_IN_TOO_DEEP : 'That routine was removed', label: '' } });
    // F-1 (engine #8): parts started in a newer version — taking one up, or going past the block, is refused: said.
    else if ((r.reason === 'cannot' || r.reason === 'parts') && runId !== undefined && holdsLockedParts(s.data, runId)) useStore.setState({ runNotice: { verb: verb.kind, text: PARTS_NEWER, label: '' } });
    // P-99 (repro 3): a value typed in See ahead's fields that the engine will not keep — said; nothing moved, the words stay.
    else if (r.refusedValue) useStore.setState({ runNotice: { verb: verb.kind, text: `Couldn’t keep {${r.refusedValue}}`, label: '' } });
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
      ? { verb: verb.kind, ...more(said(noticeFor(verb.kind, r.said, onWait, r.folded), what)), follows: true as const }
      : entry
      ? {
          verb: verb.kind,
          ...more(clearedSaid(noticeFor(verb.kind, r.said, onWait, r.folded), what, cleared)),
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

const envNow = () => ({ now: new Date().toISOString(), id: newId });

/**
 * P-104 / P-105: a copy from the library kept — the data, its one Undo, and its notice: said ("Copied “X”") from the
 * library; `quiet` (Copy and add, a Plan edit) says nothing and its Undo is the routine's menu ("Undo added “X” …").
 */
function copied(r: Copied, quiet: boolean): Did {
  if (!r.ok) return { ok: false, reason: r.reason ?? 'cannot' };
  const s = useStore.getState();
  const entry = undoEntry(s.data, r.data);
  const name = r.made?.[0] ?? '';
  // (F-2, audit F3: a copy that calls the person's own routine of a name says so — Copy and add too, then not quiet.)
  const uses = usesYour(r);
  const said = quiet ? `Added “${name}” from the library${uses}` : copiedWords(r) + uses;
  const hush = quiet && !uses;
  useStore.setState({
    data: r.data,
    undo: entry,
    runNotice: { verb: 'editRoutine', text: said, label: LABEL_COPY, entry, ...(hush && { quiet: true as const }) },
    toVerb: undefined,
    toast: undefined,
  });
  return { ok: true, ...(r.routineId !== undefined && { routineId: r.routineId }) };
}
/** P-115: what a Plan edit's Undo is labelled (as `act` labels it). */
const EDIT_LABEL = noticeFor('editRoutine', undefined).label;

/**
 * P-115: a change to a routine's draft kept — the data, and (with `notice`) its Undo and notice, marked as the draft's so
 * that Undo, once taken, goes on to the draft's edit before it. Without `notice` the Undo slot is left as it is.
 */
function drafted(rootId: Id, r: DraftResult, notice?: { text: string; label: string; quiet: boolean }): Did {
  if (!r.ok) return { ok: false, reason: r.reason ?? 'cannot', ...(r.names && { names: r.names }) };
  const s = useStore.getState();
  const did: Did = { ok: true, routineId: r.routineId ?? rootId };
  if (r.data === s.data) return did;
  // (Nothing to say — Edit begun by the composer, Save or Cancel of a draft with nothing in it: only the field changed, and
  // the Undo there is, if any, still takes back what it did.)
  if (!notice) {
    useStore.setState({ data: r.data, toVerb: undefined, toast: undefined });
    return did;
  }
  const entry = undoEntry(s.data, r.data);
  useStore.setState({
    data: r.data,
    undo: entry,
    runNotice: { verb: 'editRoutine', text: notice.text, label: notice.label, entry, draft: rootId, ...(notice.quiet && { quiet: true as const }) },
    toVerb: undefined,
    toast: undefined,
  });
  return did;
}

/** What a copy's Undo takes back ("Undo Copy"). */
const LABEL_COPY = 'Copy';

/** P-109: the Places sheet's edits (each said, with its Undo, in the sheet). */
// (P-108: and + Add on a kept list — from Plan or a tile, said with its Undo.)
const PLACE_EDITS = new Set<RoutineEdit['kind']>(['addPlace', 'changePlace', 'movePlace', 'removePlace', 'keptList']);

/** F-1 (engine #8): what a refusal by a record of parts this version cannot read says. */
export const PARTS_NEWER = 'These parts were started in a newer version of the app';
/**
 * F-1 (storage F7): a value typed leaves the Undo slot alone ('keep') — unless the Undo there puts back this run's record
 * of In any order parts (a part taken up, put down, joined): that Undo puts the parts' places back whole but the values
 * entry by entry, so what was typed since would land in another part's thread. Typing then empties the slot.
 */
function typingKeeps(runId: Id): 'keep' | 'clear' {
  const u = useStore.getState().undo?.runs?.[runId];
  const parts = (r: Run | null | undefined) => Array.isArray(r?.frames) && (r!.frames as { parts?: unknown }[]).some((f) => f && typeof f === 'object' && f.parts !== undefined);
  return u && (parts(u.before) || parts(u.after)) && JSON.stringify(u.before?.frames) !== JSON.stringify(u.after?.frames) ? 'clear' : 'keep';
}

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
function typedOverValue(runId: Id, itemId: Id, name: string, was: string, wasItems?: string[], wasRefs?: (ListRef | null)[]): Did {
  const s = useStore.getState();
  const now = runnerView(s.data, runId)?.fields.find((f) => nameKey(f.name) === nameKey(name));
  const run = readRun(s.data, runId);
  if (!run || !was.trim()) return { ok: true, runId };
  const current = now?.text ?? '';
  // (P-107: a list is the same only item for item.)
  const sameRefs = JSON.stringify(now?.refs ?? null) === JSON.stringify(wasRefs?.some(Boolean) ? wasRefs : null);
  if ((wasItems ? JSON.stringify(now?.items ?? []) === JSON.stringify(wasItems) : current === was) && sameRefs) return { ok: true, runId };
  const back = runVerb(s.data, { kind: 'value', runId, name, text: was, item: itemId, ...(wasItems && { items: wasItems }), ...(wasRefs && { refs: wasRefs }) }, { now: new Date().toISOString(), id: newId });
  if (!back.ok || back.data === s.data) return { ok: true, runId };
  const entry = undoEntry(back.data, s.data);
  useStore.setState({ undo: entry, runNotice: { verb: 'value', text: `${current.trim() ? 'Changed' : 'Cleared'} {${tidyName(name)}}`, label: 'Change', entry } });
  return { ok: true, runId };
}

/** P-110: each name once (compared as names are). */
const namesOnce = (names: string[]): string[] => names.filter((n, i) => names.findIndex((m) => nameKey(m) === nameKey(n)) === i);
/** P-110: the notice's words, with what the move cleared after them ("Jumped from … · Cleared {feature}"). */
const clearedSaid = (n: { text: string; label: string }, what: string, cleared: string[]) =>
  cleared.length ? { text: [n.text, `Cleared ${cleared.map((c) => `{${c}}`).join(', ')}`].filter(Boolean).join(' · '), label: n.label } : said(n, what);

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
  seeAhead: {},

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
    const { undo, data, runNotice } = get();
    if (!undo) return true;
    const back = applyUndo(data, undo);
    // P-115: inside a draft, Undo goes back step by step — the draft's edit before this one is the next Undo.
    const root = runNotice?.entry === undo ? runNotice.draft : undefined;
    const d = root !== undefined ? draftOf(back, root) : undefined;
    if (root !== undefined && d && d.log.length) {
      // (An Undo puts back its `before`: here, the draft one edit shorter.)
      const entry = undoEntry(undoDraftStep(back, root).data, back);
      set({ data: back, undo: entry, toast: undefined, runNotice: { verb: 'editRoutine', text: d.log[d.log.length - 1].said, label: EDIT_LABEL, entry, quiet: true, draft: root } });
      return true;
    }
    set({ data: back, undo: undefined, toast: undefined, runNotice: undefined });
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
  createRoutine: gated<State['createRoutine']>(refused, (words) => {
    const had = get().data.routines;
    const did = act({ kind: 'new', words }, 'set');
    // P-115: a new routine opens straight into Edit — its draft begun in the same change (its Undo still takes it away whole).
    if (did.ok && did.routineId && !Object.prototype.hasOwnProperty.call(had, did.routineId)) {
      const b = beginDraft(get().data, did.routineId, envNow());
      if (b.ok) set({ data: b.data });
    }
    return did;
  }),
  resumeRun: gated<State['resumeRun']>(
    refused,
    (runId, keepUndo, into) => {
      const run = readRun(get().data, runId);
      return run && isRunning(get().data, run) ? { ok: true, runId } : (busyWith(runId) ?? act({ kind: 'resume', runId, ...(into && { into: true as const }) }, keepUndo ? 'keep' : 'clear'));
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
    (runId, owed, chunk) => act({ kind: 'next', runId, ...(owed?.length && { owed }), ...(chunk && { chunk }) }, chunk && chunk.length > 1 ? 'set' : 'ends'),
    // P-98: a press that carries typed values is refused like any typed text (the sheet keeps them); a bare one is kept.
    // (P-112: so is one over a chunk — kept, it would be replayed as one Next.)
    (runId, owed, chunk) => (owed?.length || chunk ? sayReconnecting() : keepPress('next', runId)),
  ),
  doneLevel: gated<State['doneLevel']>(
    refused,
    (runId, owed, given, notKept) => act({ kind: 'done', runId, ...(owed?.length && { owed }), ...(given?.length && { given }) }, 'set', notKept),
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
  typeValue: gated<State['typeValue']>(refused, (runId, itemId, name, text, refs) => act({ kind: 'value', runId, name, text, item: itemId, ...(refs && { refs }) }, typingKeeps(runId))),
  typeList: gated<State['typeList']>(refused, (runId, itemId, name, items, refs) => act({ kind: 'value', runId, name, text: items.join('\n'), items, item: itemId, ...(refs && { refs }) }, typingKeeps(runId))),
  changeValue: gated<State['changeValue']>(refused, (runId, name, text) => act({ kind: 'value', runId, name, text }, 'set')),
  typedOver: gated<State['typedOver']>(refused, typedOverValue),
  moveInQueue: gated<State['moveInQueue']>(refused, (runId, to) => act({ kind: 'queue', runId, to }, 'set')),
  takeUpPart: gated<State['takeUpPart']>(refused, (runId, level, part) => {
    const d = get().data;
    const run = readRun(d, runId);
    const at = run && place(d, run);
    // (Inside a part of that block: it is put down — an Undo, as Jump to has.)
    const putsDown = !!run && !!at && activePart(d, run, at.frames, level) !== undefined;
    return act({ kind: 'part', runId, level, part }, putsDown ? 'set' : 'clear');
  }),
  copyFromLibrary: gated<State['copyFromLibrary']>(refused, (libId, words) => copied(copyFromLibrary(get().data, libId, envNow(), words === undefined ? {} : { words }), false)),
  copyAndAdd: gated<State['copyAndAdd']>(refused, (libId, seq, after) => copied(copyAndAdd(get().data, libId, seq, after, envNow()), true)),
  beginEdit: gated<State['beginEdit']>(refused, (routineId) => {
    const r = beginDraft(get().data, routineId, envNow());
    if (!r.ok) return { ok: false, reason: r.reason ?? 'cannot' };
    if (r.data !== get().data) set({ data: r.data, undo: undefined, runNotice: undefined, toVerb: undefined, toast: undefined });
    return { ok: true, routineId };
  }),
  editDraft: gated<State['editDraft']>(refused, (rootId, seq, edit) => {
    const r = draftEdit(get().data, rootId, { seq, edit }, envNow());
    // As Plan's edits on the routine: quiet, but a removed step (and Copy, and the Places sheet's) is said.
    const loud = edit.kind === 'remove' || edit.kind === 'copy' || PLACE_EDITS.has(edit.kind);
    return drafted(rootId, r, r.ok ? { text: r.said ?? '', label: edit.kind === 'copy' ? LABEL_COPY : EDIT_LABEL, quiet: !loud } : undefined);
  }),
  copyAndAddDraft: gated<State['copyAndAddDraft']>(refused, (rootId, libId, seq, after) => {
    const r = draftEdit(get().data, rootId, { seq, lib: libId, ...(after !== undefined && { after }) }, envNow());
    const uses = r.ok ? usesYour({ ok: true, data: r.data, ...(r.used && { used: r.used }) }) : '';
    return drafted(rootId, r, r.ok ? { text: `${r.said ?? ''}${uses}`, label: LABEL_COPY, quiet: !uses } : undefined);
  }),
  saveDraft: gated<State['saveDraft']>(refused, (rootId, anyway) => {
    const had = draftOf(get().data, rootId);
    const r = saveTheDraft(get().data, rootId, envNow(), !!anyway);
    if (!r.ok || hasChanges(had)) return drafted(rootId, r, { text: `Saved “${r.data.routines[rootId]?.words ?? ''}”`, label: 'Save', quiet: false });
    // Nothing in it: Edit ends, and there is nothing to take back.
    return drafted(rootId, r);
  }),
  cancelDraft: gated<State['cancelDraft']>(refused, (rootId) => {
    const had = draftOf(get().data, rootId);
    const r = cancelDraft(get().data, rootId);
    return hasChanges(had) ? drafted(rootId, r, { text: `Discarded changes to “${get().data.routines[rootId]?.words ?? ''}”`, label: 'Cancel', quiet: false }) : drafted(rootId, r);
  }),
  openInEdit: gated<State['openInEdit']>(refused, (routineId, edits) => {
    let r: DraftResult = beginDraft(get().data, routineId, envNow());
    for (const e of edits) if (r.ok) r = draftEdit(r.data, routineId, e, envNow());
    if (!r.ok) return { ok: false, reason: r.reason ?? 'cannot' };
    return drafted(routineId, { ...r, routineId });
  }),
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

  setSeeAhead: (runId, patch) =>
    set((s) => {
      const had = s.seeAhead[runId] ?? { on: false, at: {} };
      const next: SeeAhead = { on: patch.on ?? had.on, at: patch.at !== undefined && patch.chunk ? { ...had.at, [patch.at]: patch.chunk } : had.at };
      return { seeAhead: { ...s.seeAhead, [runId]: next } };
    }),

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
