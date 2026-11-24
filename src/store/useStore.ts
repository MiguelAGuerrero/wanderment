import { create } from 'zustand';

import { applyUndo, UndoEntry, undoEntry } from '@/domain/diff';
import { attachToNewThread } from '@/domain/bridge';
import { attachMany } from '@/domain/emergence';
import {
  ActivityPatch,
  attachActivity,
  DeclareResult,
  declareThread,
  deleteActivity,
  editActivity,
  ensureThread,
  LogInput,
  logActivity,
  nextOwner,
  RenameResult,
  renameThread,
  swapWhy,
  undeclareThread,
  updateThread,
} from '@/domain/model';
import { canNarrow, FocusMap, stepFocus, validScope } from '@/domain/focus';
import { Settings } from '@/domain/migrate';
import { rememberSearch } from '@/domain/search';
import { Selection, selectToward, unselect } from '@/domain/select';
import { SheetSection } from '@/domain/sheet';
import { cardLabel, HomeFace, restingFace, whatsNextNode } from '@/domain/slot';
import { lastActivities } from '@/domain/selectors';
import { canGoToward, Choice, firstStep, riseSaid, settle, toward, undoFirstStep } from '@/domain/rise';
import { Data, emptyData, Id } from '@/domain/types';

/** What's currently in the log box. Shared so a crumb on Home can load into it. */
export interface Draft {
  text: string;
  /** null = the person removed the doing chip (overrides a screen's preset doing thread). */
  doingId?: Id | null;
  toIds: Id[];
  /** Set by a crumb's "Log this": logging this line counts as that thread's next step. */
  fromNextOf?: Id;
  /** The step's text when it was staged; logging clears the step only if it still says this. */
  fromNextText?: string;
}

export interface Toast {
  message: string;
  /** A quiet second line under the message (text only, never an action). */
  detail?: string;
  activityId?: Id;
  /** A note with nothing to undo (no Undo button). */
  notice?: boolean;
}

/** Asked (in the toast, and on Home's bridge) after a log on Home that went to no thread. */
export const BRIDGE_QUESTION = 'Toward something — or just itself?';

export interface LogOptions {
  /** Logged on Home: if the activity has no thread, Home offers the bridge for it. */
  bridge?: boolean;
  /**
   * Logged by one tap outside the log box (the ✓ on Home's "What's next" card, P-49): the box's line
   * stays, and while reconnecting it's refused out loud instead of waiting like a Return.
   */
  keepLine?: boolean;
  /** Return on the trailhead (P-65): no toast; the line rises (`kept`), lit (P-73) unless `done`. */
  trail?: boolean;
  /** P-73: the trailhead's done chip was on at Return: the line settles at once. Captured at Return. */
  done?: boolean;
}

export type { Choice };

/** The line Return just sent up (P-73's rise; P-65's billboard), and what was chosen for it. Session only. */
export interface Kept {
  activityId: Id;
  /** As logged. */
  text: string;
  did?: Choice;
  /** Opened again from the sky (fix 18), not just logged: Undo only ever takes back a choice. */
  reopened?: boolean;
}

/** Where data lives: SQLite (normal), the first release's localStorage format (web fallback). */
export type StorageKind = 'sqlite' | 'local';

export type StorageStatus =
  | { state: 'loading' }
  /**
   * `reconnecting` (web): the page let go of the data while hidden and is taking it back. The data
   * stays on screen and typing works; logging waits (P-29).
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

/** Every data-changing action returns this (or `false`, or undefined) when it's refused. */
export type Refused = { ok: false; reason: 'reconnecting' };

/** Return (or Log) pressed while reconnecting: logged once the data is back, if the line is unchanged. */
export interface ToLog {
  draft: Draft;
  extra?: Partial<LogInput>;
  opts?: LogOptions;
}

/** The same line, chips and step as when it was marked "to log". */
export const sameDraft = (a: Draft, b: Draft) => JSON.stringify(a) === JSON.stringify(b);

interface State {
  data: Data;
  draft: Draft;
  /** Bumped when something outside the log box (a crumb's "Log this") hands focus back to it. */
  logBoxFocus: number;
  /**
   * The wander selected on Home (P-35): the log box takes its context. Session only, never stored;
   * it lasts one log, and leaving Home clears it.
   */
  selected?: Selection;
  /** Bumped when a selection made without pointing (the list on Home) moves focus to its context row. */
  selectFocus: number;
  /**
   * Home's log field (P-61): 'log' while it's open above the What's next card (raised by ＋, typing on
   * web, a crumb), 'next' while it's put away (the card is always shown). Session only. It rests open
   * only while there's no wander (`restingFace`).
   */
  homeFace: HomeFace;
  /**
   * The node Home's What's next card is on (P-50: one ink ring), once tapped, swiped to or kept by a
   * log; undefined until then (the card shows the wander last logged toward, `whatsNextNode`).
   * Session only. Focus is never an attach: only a tap attaches (`selected`).
   */
  focus?: Id;
  /** What part of Home's graph is drawn (P-50): [] is All, else the nodes narrowed to, outermost first. Session only. */
  scope: Id[];
  /** Home's picture as drawn (P-50), published by the graph: the card's path and what a swipe walks. */
  focusMap?: FocusMap;
  /** The picture's dashed ＋ (P-50) asked the What's next card to open its "＋ add one" field for this node; the card takes it. */
  addStepFor?: Id;
  /** The last focus or scope change, said politely to screen readers (P-50). */
  focusSaid: { text: string; n: number };
  /** The sheet pulled up from Home's handle (P-58): whether it's out, and the section it shows (kept for the session). */
  sheet: { open: boolean; section: SheetSection };
  /** P-84: the sheet's search (session only): while it has words, the sky above mirrors what it finds. */
  sheetSearch: string;
  /** Activity Home's bridge asks about ("Toward something — or just itself?"). Session only. */
  bridgeFor?: Id;
  /** Thread that shows the quiet "+ What's next? (optional)" line after a log. */
  promptNextFor?: Id;
  toast?: Toast;
  /** True while any visible toast is pressed, hovered or focused (pauses its timer). */
  toastHeld: boolean;
  /** Reverts the last undoable change (only the records it touched). */
  undo?: UndoEntry;
  showShading: boolean;
  recentSearches: string[];
  leftAsIs: Id[];
  /** Home's "+ What's it all for?" was put off for good ("Not now", P-34). A saved setting. */
  whyOfferOff: boolean;
  /** The first run (1-2-3, P-36) is over for good: finished, skipped or ended by a log. A saved setting. */
  firstRunDone: boolean;
  /** A thread just created from the @ menu whose name appears in earlier activities. */
  pullInOffer?: Id;
  /** Threads whose "earlier activities mention this" line was dismissed (this session only). */
  dismissedPullIn: Id[];
  storage: StorageStatus;
  /** Set when a save failed; cleared by the next successful save. */
  saveError?: string;
  /** Return pressed while reconnecting (P-29). */
  toLog?: ToLog;
  /** The line rising over the home (P-73; was P-65's billboard). */
  kept?: Kept;
  /**
   * P-82: a line that just went toward a wander from the rise (Toward…, First step, or a suggestion
   * picked before Return): it lands in that wander's node on the home and stays labelled there until
   * the next action (typing, a log, Undo, the sheet, opening a line). Session only.
   */
  landed?: { activityId: Id; threadId: Id };
  /** P-73: the trailhead's done chip — sticky until turned off or the home is left. Session only, never stored. */
  doneChip: boolean;
  /**
   * A rise that ended after a choice (audit F1): its Undo went on in the toast. Only while `undo` is
   * still `entry` does the toast's Undo take back that choice the rise's way (`undoRise`).
   */
  riseUndo?: { kept: Kept; entry: UndoEntry };

  setDraft: (patch: Partial<Draft>) => void;
  clearDraft: () => void;
  loadNext: (threadId: Id) => void;
  /** Opens ('log') or puts away ('next') Home's log field (P-61), without moving focus. */
  showHomeFace: (face: HomeFace) => void;
  /** Hands focus to the log box (on Home, its field opens): the ＋, typing on web, an example. */
  focusLogBox: () => void;
  /** Selects a wander on Home (its "to" chip goes on the line), or clears the selection (`undefined`). */
  select: (threadId: Id | undefined, opts?: { focus?: boolean }) => void;
  /**
   * A tap on a circle on Home, or its button in the list (P-50): focuses it; while the log field is
   * open (P-61) it also attaches it to the line (the tap is the consent). Tapped again while focused, a
   * node with something feeding it inside the scope narrows to it (focus stays on it).
   */
  tapNode: (threadId: Id) => void;
  /** A swipe on the card (P-50): focus to the next (1) or previous (-1) chain in the scope. Never attaches. False at an end. */
  moveFocus: (dir: 1 | -1) => boolean;
  /** Up one scope level (P-50): the chip, Esc, Back. */
  scopeUp: () => void;
  /** Pulls Home's sheet out (P-58), on the given section or the one it showed last. */
  openSheet: (section?: SheetSection) => void;
  /** Puts Home's sheet away; it remembers its section. */
  closeSheet: () => void;
  showSheetSection: (section: SheetSection) => void;
  setFocusMap: (map: FocusMap | undefined) => void;
  /** The picture's dashed ＋ under a node with no step: the What's next card opens its "＋ add one" (`undefined`: taken). */
  askAddStep: (threadId: Id | undefined) => void;
  /*
   * Data-changing actions (everything that touches `data` or the saved settings) go through one
   * gate: while the page doesn't hold the data (`holdsData`) they change nothing and show
   * RECONNECTING_NOTICE. Those that return nothing else return false then (true otherwise).
   */
  /** Refused while reconnecting: the line is remembered instead (`toLog`), and logged by `logMarked`. */
  log: (extra?: Partial<LogInput>, opts?: LogOptions) => Id | undefined;
  /** The data is back: logs the remembered line once, if it's still what's in the box. */
  logMarked: () => void;
  /** The thread's id; '' when refused. */
  createThread: (name: string) => Id;
  /** Attaches the chosen past activities to a thread; one Undo reverts all of them. */
  pullIn: (threadId: Id, activityIds: Id[]) => boolean;
  setPullInOffer: (threadId: Id | undefined) => void;
  rememberSearch: (query: string) => boolean;
  clearSearches: () => boolean;
  leaveAsIs: (activityId: Id) => boolean;
  dismissPullIn: (threadId: Id) => void;
  setNext: (threadId: Id, next: string) => boolean;
  /** Refused (nothing changes) when another thread already has the name. */
  renameThread: (threadId: Id, name: string) => RenameResult | Refused;
  setHidden: (threadId: Id, hidden: boolean) => boolean;
  /** Marks the thread as what it's for; when MAX_WHYS are already marked, nothing changes (offer a swap). */
  declareThread: (threadId: Id) => DeclareResult | Refused;
  undeclareThread: (threadId: Id) => boolean;
  /** Gives up `outId` as what it's for and marks `inId`; one Undo reverts both. */
  swapWhy: (outId: Id, inId: Id) => boolean;
  attach: (activityId: Id, threadId: Id) => boolean;
  /** Attaches "to" the thread with this name, creating it if needed; one Undo reverts both. */
  attachToNew: (activityId: Id, name: string) => Id | undefined;
  dismissBridge: () => void;
  updateActivity: (activityId: Id, patch: ActivityPatch) => boolean;
  removeActivity: (activityId: Id) => boolean;
  undoLast: () => boolean;
  dismissToast: () => void;
  holdToast: (held: boolean) => void;
  dismissPrompt: () => void;
  replaceData: (data: Data) => boolean;
  /**
   * Shows the saved data again after another copy of the app may have changed it (P-29), keeping
   * the draft. `keepUndo`: false when the data changed underneath, so Undo (and its toast) go.
   * Persistence calls it once the page holds the data again.
   */
  refreshData: (data: Data, settings: Settings, keepUndo: boolean) => boolean;
  setShowShading: (on: boolean) => boolean;
  /** "Not now" on Home's "+ What's it all for?": it never shows again. */
  putOffWhy: () => boolean;
  /** The first run is over (finished, skipped, or a log came in): it never shows again. */
  endFirstRun: () => boolean;
  /** P-73 Done it: the rising lit line settles. False when refused (nothing lit, or already chosen). */
  settleKept: () => boolean;
  /** P-73 ↳ First step + Return: the line becomes a wander with that step (`firstStep`). False when refused. */
  firstStepKept: (step: string) => boolean;
  /** P-73 Toward…: the rising line goes toward a visible wander. False when refused. */
  towardKept: (threadId: Id) => boolean;
  /**
   * The rise's Undo (P-73): takes back the choice (Done it, First step, Toward…), and the line is as it
   * was; for a done-chip line, the line goes and its words go back in the field. False with no choice.
   */
  undoKept: () => boolean;
  /** The rise ends (a new line, or it was left); the line stays as it is. With an id: only that line's. */
  leaveKept: (activityId?: Id) => void;
  /**
   * A loose line tapped on the sky (fix 18): it rises again, with its choices as it is now (P-73);
   * there's nothing to undo until a choice. False when it isn't there or isn't loose.
   */
  keepLoose: (activityId: Id) => boolean;
  /** P-80: a line on the live map opens again as the rise's subject (any line, loose or attached), reopened. False when it's gone. */
  reopenLine: (activityId: Id) => boolean;
  /** P-73: turns the trailhead's done chip on or off (session only). */
  setDoneChip: (on: boolean) => void;
  /** P-82: the landed line's label goes (the next action, or leaving the home). Session only. */
  clearLanded: () => void;
  /** P-84: the sheet's search query (session only). */
  setSheetSearch: (query: string) => void;
}

const emptyDraft = (): Draft => ({ text: '', toIds: [] });

/**
 * App state. Saving to disk is handled by src/storage/persistence.ts, which loads the data,
 * then writes every change to SQLite in the background.
 */
/**
 * The one gate for data-changing actions (P-29). A page that doesn't hold the data refuses: nothing
 * changes (so nothing is journaled or written, and there's nothing to undo), and one quiet note
 * says why — or `onRefused` does something else instead. The draft isn't data: typing and chips
 * keep working.
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
  const s = useStore.getState();
  // A toast with Undo stays (its Undo works again once the data is back), saying why on its second
  // line — unless that line already says something (the bridge question): the Log button's
  // "Reconnecting…" line says it then.
  if (s.toast && !s.toast.notice) {
    if (!s.toast.detail) useStore.setState({ toast: { ...s.toast, detail: RECONNECTING_NOTICE } });
  } else if (s.toast?.message !== RECONNECTING_NOTICE) useStore.setState({ toast: { message: RECONNECTING_NOTICE, notice: true } });
}

/**
 * Remembers a search (Search's results and Return). Not a change worth refusing out loud: while the
 * page doesn't hold the data it's quietly skipped, and the result still opens (audit 2 F3).
 */
export const rememberSearchQuietly = (query: string): boolean => holdsData(useStore.getState()) && useStore.getState().rememberSearch(query);

const refused: Refused = { ok: false, reason: 'reconnecting' };

/** `set`, for the gated actions that return whether they ran (always, once past the gate). */
function change(patch: Partial<State> | ((s: State) => Partial<State>)): true {
  useStore.setState(patch);
  return true;
}

/**
 * Takes back what the rise did for `kept` (P-73): its choice (First step: only what it made), or with
 * none — or the done chip's, whose choice was the Return — the Return itself (the line goes, and its
 * words go back in an empty field). What's left to undo after a choice is that Return, unless the
 * line was opened again from the sky (logged long before).
 */
function undoRise(s: Pick<State, 'data' | 'draft'>, kept: Kept, undo: UndoEntry): Partial<State> {
  const { did, ...was } = kept;
  if (!did || did.kind === 'done') {
    return { data: applyUndo(s.data, undo), undo: undefined, kept: undefined, draft: s.draft.text.trim() ? s.draft : { ...emptyDraft(), text: kept.text } };
  }
  const data = did.kind === 'step' ? undoFirstStep(s.data, undo, did.threadId) : applyUndo(s.data, undo);
  const line = data.activities[kept.activityId];
  return { data, undo: line && !kept.reopened ? undoEntry(deleteActivity(data, line.id), data) : undefined, kept: was };
}

export const useStore = create<State>()((set, get) => ({
  data: emptyData(),
  draft: emptyDraft(),
  logBoxFocus: 0,
  selectFocus: 0,
  homeFace: 'log',
  scope: [],
  sheet: { open: false, section: 'wanders' },
  sheetSearch: '',
  focusSaid: { text: '', n: 0 },
  showShading: true,
  toastHeld: false,
  recentSearches: [],
  leftAsIs: [],
  whyOfferOff: false,
  firstRunDone: false,
  dismissedPullIn: [],
  storage: { state: 'loading' },
  doneChip: false,

  // P-82: typing is the next action — a landed line's label goes.
  setDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch }, ...(s.landed && patch.text !== undefined && patch.text !== s.draft.text && { landed: undefined }) })),
  clearDraft: () => set({ draft: emptyDraft() }),

  loadNext: (threadId) => {
    const t = get().data.threads[threadId];
    if (!t?.next) return;
    const { draft, logBoxFocus } = get();
    const staged = { doingId: threadId, fromNextOf: threadId, fromNextText: t.next };
    set({
      // A line already started is kept (with its "to" chips) and counts as the step; an empty box
      // takes the step's text.
      // A box holding only another crumb's untouched step isn't the person's own line: replace it.
      draft:
        draft.text.trim() && !(draft.fromNextOf && draft.text.trim() === draft.fromNextText?.trim())
          ? { ...draft, ...staged, toIds: draft.toIds.filter((id) => id !== threadId) }
          : { text: t.next, toIds: [], ...staged },
      logBoxFocus: logBoxFocus + 1,
      homeFace: 'log',
    });
  },

  showHomeFace: (face) => set((s) => (s.homeFace === face ? {} : { homeFace: face })),
  focusLogBox: () => set((s) => ({ homeFace: 'log', logBoxFocus: s.logBoxFocus + 1 })),

  select: (threadId, opts) =>
    set((s) => {
      if (!threadId) return s.selected ? { selected: undefined, draft: unselect(s.draft, s.selected) } : {};
      if (!s.data.threads[threadId]) return {};
      const { draft, selection } = selectToward(s.draft, s.selected, threadId);
      return { draft, selected: selection, ...(opts?.focus && { selectFocus: s.selectFocus + 1 }) };
    }),

  tapNode: (threadId) =>
    set((s) => {
      const t = s.data.threads[threadId];
      if (!t || t.hidden) return {};
      const current = whatsNextNode(s.data, s.focus);
      const map = s.focusMap;
      const scope = map ? validScope(map, s.scope) : [];
      const narrow = current === threadId && !!map && canNarrow(map, scope, threadId);
      // P-61: only while the log field is open does a tap attach; otherwise it only focuses.
      const attach = s.homeFace === 'log';
      const chosen = attach ? selectToward(s.draft, s.selected, threadId) : undefined;
      // Said either way, so a press always answers (the card's name, or the new scope, and the attach).
      const said = narrow ? `Showing ${t.name}` : attach ? '' : cardLabel(s.data, map, threadId);
      const text = attach ? `${said ? `${said}. ` : ''}Attached to ${t.name}` : said;
      return {
        focus: threadId,
        ...(chosen && { draft: chosen.draft, selected: chosen.selection }),
        ...(narrow && { scope: [...scope, threadId] }),
        focusSaid: { text, n: s.focusSaid.n + 1 },
      };
    }),

  moveFocus: (dir) => {
    const s = get();
    if (!s.focusMap) return false;
    const current = whatsNextNode(s.data, s.focus);
    const to = stepFocus(s.focusMap, validScope(s.focusMap, s.scope), current, dir);
    if (!to || to === current || !s.data.threads[to] || s.data.threads[to].hidden) return false;
    set({ focus: to, focusSaid: { text: cardLabel(s.data, s.focusMap, to), n: s.focusSaid.n + 1 } });
    return true;
  },

  scopeUp: () =>
    set((s) => {
      const scope = s.focusMap ? validScope(s.focusMap, s.scope) : s.scope;
      if (!scope.length) return s.scope.length ? { scope: [] } : {};
      const up = scope.slice(0, -1);
      const name = up.length ? s.data.threads[up[up.length - 1]]?.name : undefined;
      return { scope: up, focusSaid: { text: name ? `Showing ${name}` : 'Showing all', n: s.focusSaid.n + 1 } };
    }),

  openSheet: (section) => set((s) => ({ sheet: { open: true, section: section ?? s.sheet.section }, landed: undefined })),
  closeSheet: () => set((s) => (s.sheet.open || s.sheetSearch ? { sheet: { ...s.sheet, open: false }, sheetSearch: '' } : {})),
  showSheetSection: (section) => set((s) => (s.sheet.section === section ? {} : { sheet: { ...s.sheet, section } })),

  setFocusMap: (map) => set({ focusMap: map }),
  askAddStep: (threadId) => set(threadId ? { focus: threadId, homeFace: 'next', addStepFor: threadId } : { addStepFor: undefined }),

  log: gated<State['log']>(
    undefined,
    (extra, opts) => {
      const { data, draft, selected, focus } = get();
      const text = (extra?.text ?? draft.text).trim();
      if (!text) return undefined;
      const res = logActivity(data, {
        text,
        doingId: extra?.doingId ?? draft.doingId ?? undefined,
        toIds: extra?.toIds ?? draft.toIds,
        fromNextOf: extra?.fromNextOf ?? draft.fromNextOf,
        fromNextText: extra?.fromNextOf ? extra.fromNextText : draft.fromNextText,
        occurredAt: extra?.occurredAt,
        note: extra?.note,
        // P-73: only the trailhead's Return sends a line up lit (settled at once with the done chip).
        lit: !!opts?.trail && !opts.done,
        settled: !!opts?.trail && !!opts.done,
      });
      const owner = nextOwner(res.activity);
      const ownerName = owner ? res.data.threads[owner]?.name : undefined;
      const firstTo = res.activity.toIds[0] ? res.data.threads[res.activity.toIds[0]]?.name : undefined;
      const bridge = !!opts?.bridge && !owner;
      // P-61: "Logged", and where it went when it went somewhere (no question).
      const where = firstTo ?? ownerName;
      set({
        bridgeFor: bridge ? res.activity.id : undefined,
        // A selection (the attach) lasts one log; focus stays where it was (P-50), even when it was
        // only the default: the log never moves it.
        selected: undefined,
        focus: whatsNextNode(data, focus),
        data: res.data,
        undo: undoEntry(data, res.data),
        // A one-tap log from outside the box keeps its line (without the selection's chip).
        draft: opts?.keepLine ? unselect(draft, selected) : emptyDraft(),
        // Home's log field goes away (P-61; it stays open while there's no wander).
        homeFace: restingFace(res.data) === 'next' ? 'next' : get().homeFace,
        promptNextFor: owner && !res.data.threads[owner]?.next ? owner : undefined,
        // P-65: the trailhead says it on its billboard instead.
        toast: opts?.trail
          ? undefined
          : {
              message: where ? `Logged → ${where}` : 'Logged',
              ...(bridge && { detail: BRIDGE_QUESTION }),
              activityId: res.activity.id,
            },
        kept: opts?.trail ? { activityId: res.activity.id, text: res.activity.text, ...(opts.done && { did: { kind: 'done' as const } }) } : get().kept,
        toLog: undefined,
        landed: undefined,
      });
      return res.activity.id;
    },
    // Return pressed while reconnecting: remembered, and logged once the data is back. A one-tap log
    // from outside the box isn't a Return: it's refused like any other change.
    (extra, opts) => {
      if (opts?.keepLine) sayReconnecting();
      else if ((extra?.text ?? get().draft.text).trim()) set({ toLog: { draft: get().draft, extra, opts } });
    },
  ),

  logMarked: () => {
    const { toLog, draft } = get();
    if (!toLog || !holdsData(get())) return;
    set({ toLog: undefined });
    // Changed since Return was pressed: it waits for the next Return.
    if (sameDraft(toLog.draft, draft)) get().log(toLog.extra, toLog.opts);
  },

  createThread: gated<State['createThread']>('', (name) => {
    const res = ensureThread(get().data, name);
    set({ data: res.data });
    return res.thread.id;
  }),

  pullIn: gated<State['pullIn']>(false, (threadId, activityIds) =>
    change((s) => {
      const name = s.data.threads[threadId]?.name;
      if (!name || !activityIds.length) return {};
      const n = activityIds.length;
      const data = attachMany(s.data, activityIds, threadId);
      return {
        undo: undoEntry(s.data, data),
        data,
        pullInOffer: undefined,
        toast: { message: `Pulled ${n} ${n === 1 ? 'activity' : 'activities'} into ${name}` },
      };
    }),
  ),

  setPullInOffer: (threadId) => set({ pullInOffer: threadId }),
  rememberSearch: gated<State['rememberSearch']>(false, (query) => change((s) => ({ recentSearches: rememberSearch(s.recentSearches, query) }))),
  clearSearches: gated<State['clearSearches']>(false, () => change({ recentSearches: [] })),
  dismissPullIn: (threadId) => set((s) => ({ dismissedPullIn: [...s.dismissedPullIn, threadId] })),
  leaveAsIs: gated<State['leaveAsIs']>(false, (activityId) => change((s) => (s.leftAsIs.includes(activityId) ? {} : { leftAsIs: [...s.leftAsIs, activityId] }))),

  setNext: gated<State['setNext']>(false, (threadId, next) =>
    change((s) => ({
      data: updateThread(s.data, threadId, { next }),
      promptNextFor: s.promptNextFor === threadId ? undefined : s.promptNextFor,
    })),
  ),

  renameThread: gated<State['renameThread']>(refused, (threadId, name) => {
    const res = renameThread(get().data, threadId, name);
    if (res.ok) set({ data: res.data });
    return res;
  }),

  setHidden: gated<State['setHidden']>(false, (threadId, hidden) =>
    change((s) => {
      const t = s.data.threads[threadId];
      if (!t) return {};
      const data = updateThread(s.data, threadId, { hidden });
      // Every undoable change shows its own toast, so Undo always means the change it names.
      // Hiding a why unmarks it too (one Undo restores both), so the toast says so.
      const message = hidden ? (t.declaredAt ? 'Hidden · not what it’s for right now' : `Hid “${t.name}”`) : `“${t.name}” is back`;
      return { undo: undoEntry(s.data, data), data, toast: { message } };
    }),
  ),

  declareThread: gated<State['declareThread']>(refused, (threadId) => {
    const s = get();
    const res = declareThread(s.data, threadId);
    // Already marked (a double tap): keep the real Undo entry and toast instead of a no-op one.
    if (res.ok && res.data !== s.data) {
      set({ data: res.data, undo: undoEntry(s.data, res.data), toast: { message: `“${s.data.threads[threadId].name}” is what it’s for` } });
    }
    return res;
  }),

  undeclareThread: gated<State['undeclareThread']>(false, (threadId) =>
    change((s) => {
      const data = undeclareThread(s.data, threadId);
      if (data === s.data) return {};
      return { data, undo: undoEntry(s.data, data), toast: { message: 'Not what it’s for right now' } };
    }),
  ),

  swapWhy: gated<State['swapWhy']>(false, (outId, inId) =>
    change((s) => {
      const data = swapWhy(s.data, outId, inId);
      if (data === s.data) return {};
      const message = `“${data.threads[inId].name}” is what it’s for · “${data.threads[outId].name}” isn’t right now`;
      return { data, undo: undoEntry(s.data, data), toast: { message } };
    }),
  ),

  attach: gated<State['attach']>(false, (activityId, threadId) =>
    change((s) => {
      const a = s.data.activities[activityId];
      const t = s.data.threads[threadId];
      if (!a || !t) return {};
      const data = attachActivity(s.data, activityId, threadId);
      return { undo: undoEntry(s.data, data), data, bridgeFor: undefined, toast: { message: `Attached → to ${t.name}`, activityId } };
    }),
  ),

  attachToNew: gated<State['attachToNew']>(undefined, (activityId, name) => {
    const s = get();
    const res = attachToNewThread(s.data, activityId, name);
    if (!res.thread) return undefined;
    // Already done (a repeated submit): keep the real Undo entry instead of a no-op one.
    if (res.data === s.data) return res.thread.id;
    set({
      data: res.data,
      undo: undoEntry(s.data, res.data),
      bridgeFor: undefined,
      // Like a thread made from the @ menu: quietly offer earlier activities that mention it.
      pullInOffer: res.created ? res.thread.id : s.pullInOffer,
      toast: { message: `Attached → to ${res.thread.name}`, activityId },
    });
    return res.thread.id;
  }),

  // The toast's question line goes with it: it was asking about the bridge.
  dismissBridge: () =>
    set((s) =>
      s.bridgeFor || s.toast?.detail
        ? { bridgeFor: undefined, toast: s.toast?.detail ? { ...s.toast, detail: undefined } : s.toast }
        : {},
    ),

  updateActivity: gated<State['updateActivity']>(false, (activityId, patch) => change((s) => ({ data: editActivity(s.data, activityId, patch) }))),

  removeActivity: gated<State['removeActivity']>(false, (activityId) =>
    change((s) => {
      const a = s.data.activities[activityId];
      if (!a) return {};
      const data = deleteActivity(s.data, activityId);
      return { undo: undoEntry(s.data, data), data, toast: { message: `Deleted “${a.text}”` } };
    }),
  ),

  undoLast: gated<State['undoLast']>(false, () => {
    const s = get();
    const { undo, data, riseUndo } = s;
    if (undo && riseUndo?.entry === undo) {
      // A rise's choice, in the toast once its session ended (audit F1): taken back as the rise would.
      const { kept: _kept, undo: _undo, ...back } = undoRise(s, riseUndo.kept, undo);
      set({ ...back, undo: undefined, riseUndo: undefined, toast: undefined, promptNextFor: undefined, landed: undefined });
    } else if (undo) set({ data: applyUndo(data, undo), undo: undefined, riseUndo: undefined, toast: undefined, promptNextFor: undefined, landed: undefined });
    return true;
  }),

  dismissToast: () => set({ toast: undefined, toastHeld: false }),
  holdToast: (held) => set({ toastHeld: held }),
  dismissPrompt: () => set({ promptNextFor: undefined }),
  replaceData: gated<State['replaceData']>(false, (data) => change({ data, undo: undefined, toast: undefined, draft: emptyDraft(), bridgeFor: undefined, selected: undefined, focus: undefined, scope: [] })),
  refreshData: gated<State['refreshData']>(false, (data, settings, keepUndo) =>
    change((s) => ({
      data,
      ...settings,
      ...(!keepUndo && { undo: undefined, toast: undefined }),
      // Back: a toast kept through a refusal no longer says it's reconnecting.
      ...(keepUndo && s.toast?.detail === RECONNECTING_NOTICE && { toast: { ...s.toast, detail: undefined } }),
      // Anything pointing at a record that's gone now goes too.
      ...(s.bridgeFor && !data.activities[s.bridgeFor] ? { bridgeFor: undefined } : {}),
      ...(s.promptNextFor && !data.threads[s.promptNextFor] ? { promptNextFor: undefined } : {}),
      ...(s.pullInOffer && !data.threads[s.pullInOffer] ? { pullInOffer: undefined } : {}),
      ...(s.selected && !data.threads[s.selected.id] ? { selected: undefined } : {}),
    })),
  ),
  setShowShading: gated<State['setShowShading']>(false, (on) => change({ showShading: on })),
  putOffWhy: gated<State['putOffWhy']>(false, () => change({ whyOfferOff: true })),
  endFirstRun: gated<State['endFirstRun']>(false, () => change({ firstRunDone: true })),

  settleKept: gated<State['settleKept']>(false, () => {
    const { kept, data } = get();
    if (!kept || kept.did) return false;
    const next = settle(data, kept.activityId);
    if (next === data) return false;
    set({ data: next, undo: undoEntry(data, next), kept: { ...kept, did: { kind: 'settled' } } });
    return true;
  }),

  firstStepKept: gated<State['firstStepKept']>(false, (step) => {
    const { kept, data } = get();
    if (!kept || kept.did || data.activities[kept.activityId]?.doingId) return false;
    const res = firstStep(data, kept.activityId, step);
    if (!res) return false;
    set({ data: res.data, undo: undoEntry(data, res.data), kept: { ...kept, did: { kind: 'step', threadId: res.threadId } } });
    return true;
  }),

  towardKept: gated<State['towardKept']>(false, (threadId) => {
    const { kept, data } = get();
    // Fix c (after P-80): a line that already went somewhere (doing or "to") isn't sent toward another.
    const line = data.activities[kept?.activityId ?? ''];
    if (!kept || kept.did || !line || !canGoToward(line)) return false;
    const next = toward(data, kept.activityId, threadId);
    if (!next) return false;
    set({ data: next, undo: undoEntry(data, next), kept: { ...kept, did: { kind: 'toward', threadId } } });
    return true;
  }),

  undoKept: gated<State['undoKept']>(false, () => {
    const s = get();
    const { kept, undo } = s;
    // A line opened again from the sky has nothing of its own to undo until a choice.
    if (!kept || !undo || (kept.reopened && !kept.did)) return false;
    set(undoRise(s, kept, undo));
    return true;
  }),

  leaveKept: (activityId) =>
    set((s) => {
      if (!s.kept || (activityId && s.kept.activityId !== activityId)) return {};
      const { kept, undo, data } = s;
      // P-82: where the line went from here (Toward…, First step, or a suggestion picked before Return) — it lands there.
      const line = data.activities[kept.activityId];
      const went = kept.did?.kind === 'toward' || kept.did?.kind === 'step' ? kept.did.threadId : !kept.did && !kept.reopened && line ? (line.doingId ?? line.toIds[0]) : undefined;
      const landed = went && line && data.threads[went] ? { activityId: line.id, threadId: went } : undefined;
      // After a choice its Undo goes on in the home's toast (audit F1: ≥ 6 s, held, waits under a screen reader);
      // P-82: so does an attached line's Return (its Undo takes the Return back, as the rise's did).
      if (undo && (kept.did || landed)) {
        return { kept: undefined, landed, riseUndo: { kept, entry: undo }, toast: { message: riseSaid(data, kept.activityId, kept.did), activityId: kept.activityId } };
      }
      return { kept: undefined, landed };
    }),

  keepLoose: (activityId) => {
    const a = get().data.activities[activityId];
    if (!a || a.doingId || a.toIds.length) return false;
    // Session only: a pending Undo (of whatever came before) is left as it is.
    set({ kept: { activityId, text: a.text, reopened: true } });
    return true;
  },

  reopenLine: (activityId) => {
    const a = get().data.activities[activityId];
    if (!a) return false;
    // Session only, as keepLoose: a pending Undo stays as it is. Opening a line is the next action (P-82).
    set({ kept: { activityId, text: a.text, reopened: true }, landed: undefined });
    return true;
  },

  setDoneChip: (on) => set((s) => (s.doneChip === on ? {} : { doneChip: on })),
  clearLanded: () => set((s) => (s.landed ? { landed: undefined } : {})),
  setSheetSearch: (query) => set((s) => (s.sheetSearch === query ? {} : { sheetSearch: query })),
}));

/** Threads ordered by most recent use, for autocomplete ranking. */
export function recentThreadOrder(data: Data): Id[] {
  const last = lastActivities(data);
  return [...last.keys()].sort((a, b) => last.get(b)!.occurredAt.localeCompare(last.get(a)!.occurredAt));
}
