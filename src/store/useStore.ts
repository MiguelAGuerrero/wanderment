import { create } from 'zustand';

import { applyUndo, sameValue, UndoEntry, undoEntry } from '@/domain/diff';
import { Settings } from '@/domain/migrate';
import { LogInput, logActivity, newId } from '@/domain/model';
import { currentRun, editRoutine, JumpTo, readRun, Refusal, Result, routineNamed, RoutineEdit, RunEdit, runVerb, Verb } from '@/domain/run';
import { Acted, noticeFor, runnerView, whatChanged } from '@/domain/runView';
import { Data, emptyData, Id, Run } from '@/domain/types';

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
 * B-11 (P-86): what a run action answers. Refused: why (`reconnecting`: the page doesn't hold the
 * data; the screen keeps what was typed), and for a start refused because something is running, what.
 */
export type Did = { ok: true; runId?: Id } | { ok: false; reason: Refusal | 'reconnecting'; running?: { runId: Id; name: string } };

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
}

/** A press on the runner while reconnecting (P-86): applied once the data is back, if the run is as it was. */
export interface ToVerb {
  runId: Id;
  verb: 'next' | 'done' | 'pause' | 'resume' | 'stepIn';
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
  /**
   * B-11 (P-86): this run's changes to show once, each with Keep, after leaving a level or ending the
   * run (`describeChanges(data, runId, changeIds)` for the rows). It never blocks: the verb has
   * happened. Session only; the next run action puts it away.
   */
  runOffer?: { runId: Id; changeIds: Id[] };
  /** B-11 (P-86): Next, Done, Pause, Resume or Step in pressed while reconnecting. Session only. */
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
   * B-11 slice 1 (P-86): routines and runs. Every one goes through the engine (domain/run.ts) and the
   * gate; each either leaves an Undo (with `runNotice`) or clears the Undo slot, never a stale one.
   * Next, Done, Pause, Resume and Step in pressed while reconnecting are kept (`toVerb`) and applied
   * by `verbMarked` once the data is back, if the run is unchanged; the ones that carry typed text
   * are refused (`reconnecting`) and the screen keeps the text.
   */
  /** Start from a tile or a row. A routine with a run going: that run is resumed. Refused (`running`, saying what) while another run is running. Undo: the new run goes. */
  startRoutine: (routineId: Id) => Did;
  /** "New: <words>": a first layer with an open edge and a run asking for its first small step (or, for a name there is, that routine). Undo removes both. */
  startNew: (words: string) => Did;
  /** Resume (a tile, the paused screen, a row under it). No Undo. */
  resumeRun: (runId: Id) => Did;
  /** Pause, with a reason or none. No Undo. */
  pauseRun: (runId: Id, reason?: string) => Did;
  /** The reason edited in place (each keystroke): only the reason changes; the Undo slot is left alone. */
  setPauseReason: (runId: Id, text: string) => Did;
  /** Home, after "Stop <name>?": nothing is running; the run stays where it is. No Undo. */
  leaveRun: (runId: Id) => Did;
  /** Next ("It's happened" on a wait). */
  nextStep: (runId: Id) => Did;
  /** Done: leaves the level it is in; at the top ends the run. */
  doneLevel: (runId: Id) => Did;
  stepIn: (runId: Id) => Did;
  /** Break it down: the steps typed (blank ones dropped) become this run's own sequence, and the run steps in. */
  /** `at`: the step the sheet was opened on — the sub-steps go to THAT step even if the run has moved on since (it then stays where it is). */
  breakDown: (runId: Id, steps: string[], at?: { seq: Id; item: Id }) => Did;
  /** The edge of a goal: the next small step, kept in the routine. */
  addEdgeStep: (runId: Id, text: string) => Did;
  /** Change the words of the step it is on, this run only. */
  changeWords: (runId: Id, text: string) => Did;
  /** Jump to…: `{ level }` the start of a level it is in; `{ path }` a step (a See it all row's path). The run is running afterwards. */
  jumpTo: (runId: Id, to: JumpTo) => Did;
  /** Back to <step>. */
  backTo: (runId: Id) => Did;
  /** Keep one of this run's changes (or 'all') in the routine. Works on an ended run. */
  keepChange: (runId: Id, changeId: Id | 'all' | Id[]) => Did;
  /** Takes back one of this run's changes. */
  dropChange: (runId: Id, changeId: Id) => Did;
  /** See it all: add, reword, remove, or the number, for this run only. */
  editRun: (runId: Id, edit: RunEdit) => Did;
  /** The plain routine editor. Open runs are kept standing in the same Undo. */
  editRoutine: (routineId: Id, edit: RoutineEdit) => Did;
  /** The Keep sheet was closed. Session only. */
  dismissRunOffer: () => void;
  /** The notice was put away. Session only. */
  dismissRunNotice: () => void;
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
 * notice; 'clear' empties the Undo slot (Pause, Resume, Home: nothing stale to take back later);
 * 'keep' leaves it alone (the reason, typed). A quiet note (reconnecting) goes with any of the first two.
 */
function act(verb: Verb | { kind: 'editRoutine'; routineId: Id; edit: RoutineEdit }, undo: 'set' | 'clear' | 'keep'): Did {
  const s = useStore.getState();
  const env = { now: new Date().toISOString(), id: newId };
  const runId = 'runId' in verb ? verb.runId : undefined;
  const onWait = verb.kind === 'next' && runnerView(s.data, verb.runId)?.step.kind === 'wait';
  // What it did, naming the thing (read before it is done).
  const what = whatChanged(s.data, verb);
  const r: Result = verb.kind === 'editRoutine' ? editRoutine(s.data, verb.routineId, verb.edit, env) : runVerb(s.data, verb, env);
  if (!r.ok) {
    // One thing runs at a time: say what is running.
    if (r.running) useStore.setState({ runNotice: { verb: verb.kind, text: `${r.running.name} is running`, label: '' } });
    return { ok: false, reason: r.reason ?? 'cannot', ...(r.running && { running: r.running }) };
  }
  const did: Did = { ok: true, ...((r.runId ?? runId) !== undefined && { runId: r.runId ?? runId }) };
  if (r.data === s.data) return did;
  if (undo === 'keep') {
    useStore.setState({ data: r.data });
    return did;
  }
  // A start that found a run to resume made nothing to take back.
  const entry = undo === 'set' && !(r.runId && s.data.runs[r.runId]) ? undoEntry(s.data, r.data) : undefined;
  const left = verb.kind === 'keep' || verb.kind === 'drop' ? (s.runOffer?.changeIds ?? []).filter((id) => readRun(r.data, verb.runId)?.changes.some((c) => c.id === id)) : [];
  useStore.setState({
    data: r.data,
    undo: entry,
    runNotice: entry ? { verb: verb.kind, ...said(noticeFor(verb.kind, r.said, onWait), what), entry } : undefined,
    runOffer: r.offer.length && runId ? { runId, changeIds: r.offer.map((c) => c.id) } : left.length && s.runOffer ? { ...s.runOffer, changeIds: left } : undefined,
    toVerb: undefined,
    toast: undefined,
  });
  return did;
}

/** The notice's words: what the engine says happened ("Finished …"), else the thing the action was done to. */
const said = (n: { text: string; label: string }, what: string) => ({ text: n.text || what, label: n.label });

/**
 * One thing at a time (the owner: to switch, you must pause first): while a DIFFERENT run is running
 * nothing else is resumed or started — refused, saying what is running. Never a silent demotion.
 */
function busyWith(but?: Id): Did | undefined {
  const cur = currentRun(useStore.getState().data);
  if (!cur || cur.status !== 'running' || cur.id === but) return undefined;
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
    if (undo) set({ data: applyUndo(data, undo), undo: undefined, toast: undefined, runNotice: undefined, runOffer: undefined });
    return true;
  }),

  dismissToast: () => set({ toast: undefined }),
  replaceData: gated<State['replaceData']>(false, (data) => change({ data, undo: undefined, toast: undefined, draft: emptyDraft(), runNotice: undefined, runOffer: undefined, toVerb: undefined })),
  refreshData: gated<State['refreshData']>(false, (data, settings, keepUndo) =>
    change({
      data,
      ...settings,
      ...(!keepUndo && { undo: undefined, toast: undefined, runNotice: undefined, runOffer: undefined }),
    }),
  ),

  startRoutine: gated<State['startRoutine']>(refused, (routineId) => {
    // A second tap on Start: the run it made is running already, and its Undo stays.
    const cur = currentRun(get().data);
    if (cur?.status === 'running' && cur.routineId === routineId) return { ok: true, runId: cur.id };
    // A routine whose run was left: its Start is a Resume, and that needs nothing else running.
    const had = Object.keys(get().data.runs).map((id) => readRun(get().data, id)).find((r) => r && !r.endedAt && r.routineId === routineId);
    return (had && busyWith(had.id)) ?? act({ kind: 'start', routineId }, 'set');
  }),
  startNew: gated<State['startNew']>(refused, (words) => {
    // The words name a routine there is, whose run was left: that is a Resume too.
    const same = routineNamed(get().data, words.trim().replace(/\s+/g, ' '));
    const had = same && Object.keys(get().data.runs).map((id) => readRun(get().data, id)).find((r) => r && !r.endedAt && r.routineId === same.id);
    return (had && busyWith(had.id)) ?? act({ kind: 'new', words }, 'set');
  }),
  resumeRun: gated<State['resumeRun']>(
    refused,
    (runId) => (readRun(get().data, runId)?.status === 'running' ? { ok: true, runId } : (busyWith(runId) ?? act({ kind: 'resume', runId }, 'clear'))),
    (runId) => keepPress('resume', runId),
  ),
  pauseRun: gated<State['pauseRun']>(
    refused,
    (runId, reason) => act({ kind: 'pause', runId, ...(reason !== undefined && { reason }) }, 'clear'),
    (runId) => keepPress('pause', runId),
  ),
  setPauseReason: gated<State['setPauseReason']>(refused, (runId, text) => act({ kind: 'reason', runId, text }, 'keep')),
  leaveRun: gated<State['leaveRun']>(refused, (runId) => act({ kind: 'home', runId }, 'clear')),
  nextStep: gated<State['nextStep']>(
    refused,
    (runId) => act({ kind: 'next', runId }, 'set'),
    (runId) => keepPress('next', runId),
  ),
  doneLevel: gated<State['doneLevel']>(
    refused,
    (runId) => act({ kind: 'done', runId }, 'set'),
    (runId) => keepPress('done', runId),
  ),
  stepIn: gated<State['stepIn']>(
    refused,
    (runId) => act({ kind: 'stepIn', runId }, 'set'),
    (runId) => keepPress('stepIn', runId),
  ),
  breakDown: gated<State['breakDown']>(refused, (runId, steps, at) => act({ kind: 'breakDown', runId, steps, ...(at && { at }) }, 'set')),
  addEdgeStep: gated<State['addEdgeStep']>(refused, (runId, text) => act({ kind: 'edgeStep', runId, text }, 'set')),
  changeWords: gated<State['changeWords']>(refused, (runId, text) => act({ kind: 'words', runId, text }, 'set')),
  jumpTo: gated<State['jumpTo']>(refused, (runId, to) => act({ kind: 'jump', runId, to }, 'set')),
  backTo: gated<State['backTo']>(refused, (runId) => act({ kind: 'back', runId }, 'set')),
  keepChange: gated<State['keepChange']>(refused, (runId, changeId) => act({ kind: 'keep', runId, change: changeId }, 'set')),
  dropChange: gated<State['dropChange']>(refused, (runId, changeId) => act({ kind: 'drop', runId, change: changeId }, 'set')),
  editRun: gated<State['editRun']>(refused, (runId, edit) => act({ kind: 'edit', runId, edit }, 'set')),
  editRoutine: gated<State['editRoutine']>(refused, (routineId, edit) => act({ kind: 'editRoutine', routineId, edit }, 'set')),
  dismissRunOffer: () => set((s) => (s.runOffer ? { runOffer: undefined } : {})),
  dismissRunNotice: () => set((s) => (s.runNotice ? { runNotice: undefined } : {})),

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
    else s.resumeRun(toVerb.runId);
  },
}));
