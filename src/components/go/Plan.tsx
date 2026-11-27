/**
 * B-12 (P-90), P-96: Plan — the sequence, not the step. Its own surface, unmistakably not the runner: a
 * light band pinned at the top with the word PLAN and nothing else (P-96: Home is the bottom-left side
 * door, Done — at the edge only — the right one); the routine's name as the heading;
 * "planning · at <step>"; the steps as outlined rows with the one you were on marked HERE; "Repeat
 * from here" as a row with visible Move up / Move down; "Add a step". Everything structural is here
 * and only here, and a change made here changes the routine (the owner's decision), with an Undo that
 * stays until the next action. The ONE filled button is "Resume at <step>" (Start for something never
 * run), which goes back exactly where you were. Nothing here says Next; Done exists only at the edge,
 * in its own slot beside Home. P-96: a step's menu has Gives… (a name later steps use as {name}); names
 * in words are chips; while words are typed, a bar above the keyboard offers the names given above.
 *
 * P-101 (rulings 2, 4, 6–8): Home is back in the band, at its right edge (one fixed place); Plan is a view
 * of a run that is not running (paused, plainly — never "planning"); from inside a call it is that
 * routine's Plan (`inSeq`). Its edits say nothing (no notice): their Undo is the routine's menu, "Undo
 * <edit>", while it is the last action. A step broken down whose smaller steps give names says "gives
 * {a}, {b}" (hoisted). While words are typed, "{ } Insert" beside the field opens the names (the bar).
 * The "Add a step" box wraps, so the whole step shows.
 *
 * P-95: every step row has a grip at its left edge ("Reorder <words>"): dragged (touch or mouse) it
 * moves the row among its siblings — the row stays in place, dashed, and a line shows where it will go
 * (past an open routine: after its last step); nothing moves until it is let go, so nothing covers
 * anything and there is no reflow to animate (Reduce Motion or not).
 * Dropped, it is ONE move edit of as many rows as it crossed ("Repeat from here" counts as a row and
 * is passed alone, the P-90 rule), so one Undo. Pressed, it opens the row's menu.
 *
 * P-102 (owner, 2026-11-27): every ··· here opens a small menu anchored to it (`Menu`), not a sheet; the
 * step's reads Edit · Add a step after · Break it down · Gives… · a line · Remove (red). Nothing makes a
 * wait any more (a wait from an earlier build offers "Make it a step"). Move up / Move down left the step
 * menu (the owner's): they are a row's screen-reader actions (on its ···), Alt+↑ / Alt+↓ while focus is in
 * the row (web), the grip's own menu when pressed, and — under 340 px, with no grip — back on the step menu
 * (audit F1: nothing by gesture alone). One edit — one Undo — each.
 *
 * The route follows the data and writes nothing — but for one case: a run the build before left at
 * the edge with this-run changes is folded into its routine on arriving (`planView().unfolded`), once,
 * with its notice and Undo. That Undo, at the edge, leaves the run in Plan by the data (nothing can run
 * there) with its changes back: the rows would be the run's reading and the edits the routine's, so
 * this screen leaves for home instead (Plan opened again folds again, saying so).
 */
import { router, useIsFocused, useNavigation } from 'expo-router';
import { ComponentRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { callersOf, Refusal, routineNamed, RoutineEdit } from '@/domain/run';
import { atPick, rankRoutines, routineInWords, wordsKept } from '@/domain/atPick';
import { myRoutines } from '@/domain/routines';
import { insidesOf, namesOffered, PLAN_TOP, planAt, PlanDivider, PlanRow, planView, readersOf, routinesByAge, rowMoves, StepPart } from '@/domain/runView';
import { placesShown, placesWritable } from '@/domain/places';
import { tagsOf, tagsWritable } from '@/domain/tags';
import { isName, itemNameFor, MAX_NAME, nameKey, parseWords, suggestName, tidyName } from '@/domain/values';
import { useStore } from '@/store/useStore';

import { decorative } from '../a11y';
import { BindSheet, CallLines, copyName, CopySheet, ForEachSheet, InputsSheet, removeBody, RoutinesSheet } from './Calls';
import { Mark } from './marks';
import { rowLine } from './MyRoutines';
import { Notice, useRunUndo } from './Notice';
import { Repeat } from './Repeat';
import { goHome } from './Runner';
import { readDraft, writeDraft } from './session';
import { PlacesLine, PlacesSheet } from './Places';
import { TagsSheet, tagWords } from './Tags';
import { G, SP, TARGET } from './tokens';
import { Btn, caretToEnd, Confirm, Field, focusOn, focusSoon, GoScreen, GrowField, H1, InputRef, Menu, MenuItem, MenuSep, Said, Sheet, T, TextRef, useKeys, useVisibleHeight, ViewRef } from './ui';
import { Gives, KeptSheet, NameChip, ValueText } from './Values';
import { InsidesBtn } from './Insides';

const WEB = Platform.OS === 'web';
/** The focus ring: its own colour, with a gap (never the white of HERE). */
const RING = WEB ? ({ outlineStyle: 'solid', outlineWidth: 2, outlineColor: G.focus, outlineOffset: 3 } as object) : null;
const keyOf = (path: string[]) => path.join('/');
const parentOf = (key: string) => key.slice(0, Math.max(0, key.lastIndexOf('/')));
/** `key` is `parent` or beneath it. */
const under = (key: string, parent: string) => key === parent || key.startsWith(`${parent}/`);
const tidy = (s: string) => s.trim().replace(/\s+/g, ' ');
/** The "Add a step" row's placeholder and spoken name: one string, nothing keyed to its words (a later composer may ask a question here). */
export const ADD_PLACEHOLDER = 'Add a step';

/** P-98: why a routine was not added as a step, in words. */
export function callRefused(reason: Refusal | 'reconnecting' | undefined, routine: string, into: string): string | undefined {
  if (reason === 'self') return routine === into ? `“${routine}” can’t be a step of itself` : `“${routine}” uses “${into}”, so it can’t be a step of it`;
  if (reason === 'gone') return `“${routine}” was removed`;
  return undefined;
}

/**
 * Words being typed in place: a step's words (`words`), the routine's name (`name`), a step added
 * after a row (`after`), or the smaller steps of a row (`into`). `path` is the row's key ('' for the
 * name). Kept across a reload of this tab.
 */
interface Typing {
  mode: 'words' | 'name' | 'after' | 'into';
  path: string;
  text: string;
}

function readTyping(key: string): Typing | null {
  try {
    const had = JSON.parse(readDraft(key) || 'null') as Partial<Typing> | null;
    if (!had || typeof had.path !== 'string' || typeof had.text !== 'string') return null;
    return had.mode === 'words' || had.mode === 'name' || had.mode === 'after' || had.mode === 'into' ? { mode: had.mode, path: had.path, text: had.text } : null;
  } catch {
    return null;
  }
}

/**
 * P-111: the row whose insides were opened as a view, in the view it was opened from — so coming back (the path, the
 * browser's Back) puts the focus on it. `view`: that view (`viewOf`); `key`: the row.
 */
let backTo: { view: string; key: string } | null = null;
const setBackTo = (to: { view: string; key: string } | null) => {
  backTo = to;
};
const viewOf = (id: string, inSeq: string | undefined, key: string) => `${id}|${inSeq ?? ''}|${key}`;

type Open = { row: string } | { reorder: string } | { divider: string } | { routine: true } | { gives: string } | { removing: string } | { restart: true } | { removeRoutine: true } | { tags: true } | { addRoutine: true } | { addEach: true } | { kept: string } | { bind: string; input: string } | { inputs: string } | { copy: true } | { places: true; at?: string };

export function Plan({ runId, routineId, inSeq, fromRun, fromList, at }: { runId?: string; routineId?: string; inSeq?: string; fromRun?: boolean; fromList?: boolean; at?: string }) {
  const data = useStore((s) => s.data);
  const act = useStore.getState;
  const focused = useIsFocused();
  const navigation = useNavigation();
  const v = planView(data, runId ? { runId, ...(inSeq && { in: inSeq }) } : { routineId: routineId ?? '' });
  /**
   * P-111: with no `?at=`, where the run is — chosen once, on arriving (an edit that moves HERE into a step broken down
   * never moves this screen into it).
   */
  const [dove, setDove] = useState<string | undefined>(undefined);
  if (at === undefined && v && dove === undefined) setDove(planAt(v, undefined).key || PLAN_TOP);
  /** P-111: this view — the routine's own steps, or the insides of a step broken down or a for each (`?at=`). */
  const pv = v ? planAt(v, at ?? dove ?? PLAN_TOP) : undefined;
  const sub = pv?.row;
  // P-101 (ruling 4): Plan is a view of a run that is not running (`planning`): running, the runner is
  // where it is (a routine's address: Plan's only while it has no run).
  const route = v?.runId ? (v.planning ? 'plan' : 'runner') : undefined;
  // This screen has shown the run with nothing left to fold: this-run changes on it again can only be
  // the fold's Undo (nothing writes one any more). Then it is not a Plan to edit: home.
  const [wasFolded, setWasFolded] = useState(false);
  if (!!v?.runId && v.planning && !v.unfolded && !wasFolded) setWasFolded(true);
  const undone = wasFolded && !!v?.planning && v.unfolded;
  const here = !!v && !undone && (v.runId ? !!runId && route === 'plan' : true);
  const id = runId ?? routineId ?? '';
  const viewId = viewOf(id, inSeq, pv?.key ?? '');
  /** P-97: the routine's tags (read tolerantly: none stored = none). */
  const tags = tagsOf(v ? data.routines[v.routineId]?.tags : undefined);
  /** P-109: the routine's places (read tolerantly: none stored = none). */
  const places = placesShown(v ? data.routines[v.routineId]?.places : undefined);

  const [menu, setMenu] = useState<Open | null>(null);
  /** P-102: each ··· (by its `data-more` key: a row's key, '' for the routine's, `divider:<seq>`) — what its menu hangs from. */
  const [mores] = useState<Record<string, unknown>>(() => ({}));
  const moreRef = (k: string) => (el: unknown) => {
    mores[k] = el;
  };
  const typingKey = `plan:${id}`;
  const [typing, setTypingState] = useState<Typing | null>(() => readTyping(typingKey));
  // What is being typed, as the handlers see it (a Return and the blur it causes must not both keep it).
  const live = useRef(typing);
  const setTyping = (t: Typing | null) => {
    live.current = t;
    setTypingState(t);
    writeDraft(typingKey, t ? JSON.stringify(t) : '');
  };
  const addKey = `plan-add:${id}`;
  const [adding, setAddingState] = useState(() => readDraft(addKey));
  const setAdding = (text: string) => {
    setAddingState(text);
    writeDraft(addKey, text);
  };
  const [nameTaken, setNameTaken] = useState(false);
  /** P-98: why the last routine chosen in Add's "a routine" was refused. */
  const [routineError, setRoutineError] = useState<string | undefined>(undefined);
  const [addFocused, setAddFocused] = useState(false);
  /** P-96 audit F6: the field the names bar was entered from (by the keyboard), so a chip inserts there. */
  const lastField = useRef<HTMLInputElement | null>(null);
  /**
   * P-103 (11; the owner typed "@{concerns}"): "@" or "{" typed opens the names (as @ does in Notion and Slack) —
   * the bar shows the names that match what is typed after it; Return or a tap puts the name there. Esc closes it
   * (that one stays closed); a "}" typed, a space, or the caret moving away does too. `start`: where the "@"/"{" is.
   */
  const [picking, setPicking] = useState<{ start: number; query: string } | null>(null);
  /** P-103 audit F3: the name the person has chosen in it (↑/↓), -1 for none yet; typing part of a name chooses the first match. */
  const [lit, setLit] = useState(-1);
  /** A name just put in: where the caret goes, set as soon as the field holds the new words (before the next key). */
  const caretAfter = useRef<{ field: HTMLInputElement; text: string; at: number } | null>(null);
  useLayoutEffect(() => {
    const c = caretAfter.current;
    if (!c) return;
    // Once, at the commit that shows the name (never on a later render: by then the focus is the person's).
    caretAfter.current = null;
    if (!c.field.isConnected || c.field.value !== c.text) return;
    // Back to the field only from where the name was chosen (a chip, Insert) or from nowhere — never from elsewhere.
    const at = document.activeElement as HTMLElement | null;
    const fromBar = !at || at === document.body || !!at.closest?.('[data-testid="go-names-bar"], [data-insert]');
    if (at !== c.field && fromBar) c.field.focus();
    if (document.activeElement === c.field) c.field.setSelectionRange(c.at, c.at);
  });
  const shutAt = useRef(-1);

  const readPick = (text: string) => {
    const el = WEB ? lastField.current : null;
    const caret = el && typeof el.selectionStart === 'number' ? Math.min(el.selectionStart, text.length) : text.length;
    // P-103 audit F3: only at a word's start (after a space, or first), and only while what follows is a name's
    // letters — "me@co", "x@y.z" and a lone "{" at a word's end never insert by themselves. P-110: after "@", across
    // spaces too, while what is typed still matches a routine's name ("@Document It").
    const m = atPick(text, caret, myRoutines(useStore.getState().data).map((r) => r.name));
    setLit(-1);
    // (P-110: the "@" put away with Esc is gone — the next one opens again.)
    if (!m) {
      shutAt.current = -1;
      return setPicking(null);
    }
    if (m.start === shutAt.current) return setPicking(null);
    shutAt.current = -1;
    setPicking(m);
  };
  /** Routines opened or closed by hand (by row key); the rest follow `opened`. */
  const [folds, setFolds] = useState<Record<string, boolean>>({});
  /** A row being dragged by its grip (P-95): its key and how far the pointer has moved. */
  const [drag, setDrag] = useState<{ key: string; dy: number; line?: number } | null>(null);
  /** Where each row's box is in the list, and where its step row and its divider are inside it (laid out). */
  const boxes = useRef<Record<string, { y: number; row?: Span; div?: Span }>>({});
  /** Each row's own box and divider (web: measured when a drag begins), and the siblings as they were then. */
  const rails = useRef<Record<string, unknown>>({});
  const dividers = useRef<Record<string, unknown>>({});
  const dragFrom = useRef<{ key: string; spans: (Span & { key?: string })[] } | undefined>(undefined);

  const title = useRef<TextRef>(null);
  const addBox = useRef<ViewRef>(null);
  const addField = useRef<InputRef>(null);
  const list = useRef<ViewRef>(null);
  const hereRow = useRef<ViewRef>(null);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const hereY = useRef<number | undefined>(undefined);
  /** The Undo of the edit made by LEAVING a field typed in (not by Return), while it is the one there is. */
  const leftEdit = useRef<unknown>(undefined);

  // The route follows the data (another tab, an Undo, Resume, Start, Done): always in place, so Back never bounces.
  const runOf = v?.runId;
  const gone = !v;
  useEffect(() => {
    if (!focused || here) return;
    // (P-97: opened from My routines, a removed routine's Plan goes back there; else home.)
    if (gone && fromList && router.canGoBack()) router.back();
    else if (gone || !runOf || undone) goHome();
    // P-103 (3): opened from the runner, it is over it — back to it (the runner beneath is where you were).
    else if (route === 'runner' && fromRun && router.canGoBack()) router.back();
    else if (route === 'runner') router.replace(`/go/run/${runOf}`);
    // A routine's address while it has a run: that run's Plan.
    else router.replace(`/go/run/${runOf}/plan${at === undefined ? '' : `?at=${encodeURIComponent(at)}`}`);
  }, [focused, here, gone, runOf, route, undone, fromRun, fromList, at]);

  // The one write this route makes (ruling 4): a run from the build before, at the edge, still
  // carrying this-run changes. Once: an Undo of it is not folded again while this screen is up (it leaves).
  const folded = useRef(false);
  const unfolded = here && !!runId && !!v?.planning && v.unfolded;
  useEffect(() => {
    if (!focused || !unfolded || folded.current) return;
    folded.current = true;
    useStore.getState().planRun(runId!);
  }, [focused, unfolded, runId]);

  // On arriving: the heading ("Plan: <name>") — or, with nothing to stand on, the open row. HERE is in view.
  const openFirst = !!v && !sub && (v.edge || (!v.runId && v.rows.length === 0));
  useEffect(() => {
    if (!focused || !here) return;
    // P-111: back from a row's own view (its path, the browser's Back) — the focus is on that row again.
    const back = backTo && backTo.view === viewId ? backTo.key : undefined;
    if (back !== undefined) {
      setBackTo(null);
      toInsides(list, back, title);
    } else if (openFirst) focusSoon(addBox);
    else arrive(title, hereRow);
  }, [focused, here, openFirst, viewId]);
  // Native: HERE is in view once it has been laid out (the arrival effect runs before that), once.
  const hereShown = useRef(false);
  const hereLaid = (y: number) => {
    hereY.current = y;
    if (WEB || hereShown.current) return;
    hereShown.current = true;
    scroller.current?.scrollTo({ y: Math.max(0, y - 96), animated: false });
  };

  const can = useRunUndo();
  // P-101 (ruling 6): a Plan edit's Undo (it gives no notice) — the routine's menu row, while it is the last action.
  // P-103: a removed step's Undo is on its notice too — and still here (the notice can be put away).
  const quietEdit = useStore((s) => ((s.runNotice?.quiet || s.runNotice?.verb === 'editRoutine') && s.runNotice.entry && s.runNotice.entry === s.undo ? s.runNotice.text : undefined));
  const undo = () => {
    if (!can) return;
    can.undo();
    focusOn(title);
  };
  // A narrow window (large text): levels step in less, and HERE stands above its words, so the words keep their room.
  const narrow = useWindowDimensions().width < 340;
  const indent = (depth: number) => Math.min(Math.max(0, depth - (pv?.base ?? 0)), 6) * (narrow ? 8 : 24);
  const seen = useVisibleHeight();
  // Almost no room (large text AND the keyboard up) — or a phone's keyboard up at all (P-93): the band
  // stays; everything else scrolls, the notice and the filled button after the rows, so nothing sits
  // between the field typed in and the keyboard.
  const floor = (!!seen && seen.height < 360) || keyboardUp(seen);

  useKeys(
    focused && here && !menu,
    {
      'mod+z': undo,
      Escape: () => {
        // P-103 (11): the names opened by "@" / "{" close first; the words stay as typed.
        if (picking && typeof document !== 'undefined' && document.querySelector('[data-testid="go-names-bar"][data-picking="true"]')) {
          shutAt.current = picking.start;
          setPicking(null);
          return;
        }
        if (!live.current) return;
        const was = live.current;
        setTyping(null);
        setNameTaken(false);
        toRow(list, was.mode === 'name' ? '' : was.path, title);
      },
    },
    true,
  );

  // Web (P-93): the field typed in, and the step just above it (the one just added), stay in view —
  // after every add, as the keyboard comes up, and as the words grow.
  const rowCount = v?.rows.length;
  const typedAt = typing ? `${typing.mode}:${typing.path}:${typing.text.length}` : '';
  useEffect(() => {
    if (focused && here) keepTypingInView(scroller.current);
  }, [focused, here, rowCount, typedAt, floor, seen?.height, addFocused, adding]);

  if (!v || !here) return <GoScreen testID="go-plan" settled={false}>{null}</GoScreen>;

  const edit = (seq: string, e: RoutineEdit) => act().editRoutine(seq, e);
  const rowAt = (key: string): PlanRow | undefined => v.rows.find((r) => keyOf(r.path) === key);
  const laid = (key: string, part: 'y' | 'row' | 'div') => (e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    const b = (boxes.current[key] ??= { y: 0 });
    if (part === 'y') b.y = y;
    else b[part] = { y, h: height };
  };

  // A routine used as a step shows its steps when the run is inside it, or as it was last opened or closed by hand.
  // P-111: a step broken down and a for each open as a view of their own — in place only while smaller steps are being
  // typed into them (Break it down, Add a step inside).
  const typingInto = (row: PlanRow) => typing?.mode === 'into' && typing.path === keyOf(row.path);
  const opened = (row: PlanRow) => (insidesOf(row) === 'view' ? typingInto(row) : (folds[keyOf(row.path)] ?? row.within));
  const view = pv!;
  /** P-111: where this view's own steps are added — its sequence (the routine's, or the row's insides). */
  const ownSeq = sub?.ref ?? v.routineId;
  /** The words this view is headed by (P-110: as shown, with the values held at the run's place). */
  const headWords = sub ? (sub.shown ?? sub.words) : v.name;
  /** P-111: the address of a view of this Plan (`?at=`; the routine's own: PLAN_TOP), keeping where it was opened from. */
  const hrefAt = (key: string) => {
    const q = [inSeq && `in=${encodeURIComponent(inSeq)}`, fromRun ? 'from=run' : fromList ? 'from=routines' : '', `at=${encodeURIComponent(key || PLAN_TOP)}`].filter(Boolean).join('&');
    return `${runId ? `/go/run/${runId}/plan` : `/go/routine/${routineId}`}?${q}`;
  };
  /** P-111: a step broken down (or a for each) opened as a view of its own — pushed, so Back comes back here. */
  const openView = (row: PlanRow) => {
    if (live.current) keep(false);
    setBackTo({ view: viewId, key: keyOf(row.path) });
    router.push(hrefAt(keyOf(row.path)) as never);
  };
  /** P-111: the path back, one up — Back when that is the screen beneath (as it was pushed), else in this one's place. */
  const goUp = () => {
    if (!view.up) return;
    if (live.current) keep(false);
    const upKey = view.up.key;
    setBackTo({ view: viewOf(id, inSeq, upKey), key: view.key });
    const st = navigation.getState() as { index: number; routes: { name: string; params?: Record<string, unknown> }[] } | undefined;
    const now = st?.routes[st.index];
    const prev = st && st.index > 0 ? st.routes[st.index - 1] : undefined;
    const p = (prev?.params ?? {}) as { id?: string; in?: string; at?: string };
    const same = !!now && !!prev && prev.name === now.name && p.id === (now.params as { id?: string } | undefined)?.id && (p.in || undefined) === (inSeq || undefined);
    if (same && planAt(v, typeof p.at === 'string' ? p.at : undefined).key === upKey) router.back();
    else router.replace(hrefAt(upKey) as never);
  };
  const shownRows: PlanRow[] = [];
  const shut: string[] = [];
  for (const row of view.rows) {
    const key = keyOf(row.path);
    if (shut.some((s) => key !== s && under(key, s))) continue;
    shownRows.push(row);
    if (row.kind === 'routine' && !opened(row)) shut.push(key);
  }
  /**
   * Where a row (or its divider) is in the list, now. Web: measured from the page (RN-web's onLayout
   * fires on a size change, not when a row only moves — audit F2); elsewhere, as laid out.
   */
  const where = (k: string, part: 'row' | 'div'): Span | undefined => {
    const rect = (el: unknown) => (WEB && el && typeof (el as HTMLElement).getBoundingClientRect === 'function' ? (el as HTMLElement).getBoundingClientRect() : undefined);
    const origin = rect(list.current);
    const r = origin && rect(part === 'row' ? rails.current[k] : dividers.current[k]);
    if (origin && r) return { y: r.top - origin.top, h: r.height };
    const b = boxes.current[k];
    const at = b?.[part];
    return b && at ? { y: b.y + at.y, h: at.h } : undefined;
  };
  /** The siblings of a row as a drag sees them, in order: each row (an open routine with the steps it shows) and the divider. */
  const spansOf = (key: string): (Span & { key?: string })[] | undefined => {
    const spans: (Span & { key?: string })[] = [];
    for (const r of shownRows) {
      const k = keyOf(r.path);
      if (parentOf(k) !== parentOf(key)) continue;
      const own = where(k, 'row');
      if (!own) return undefined;
      const div = r.divider ? where(k, 'div') : undefined;
      if (div) spans.push(div);
      // An open routine is its name row AND the steps it shows (audit F2): crossing it means passing all of them.
      let bottom = own.y + own.h;
      for (const inner of shownRows) {
        const ik = keyOf(inner.path);
        const at = ik !== k && under(ik, k) ? where(ik, 'row') : undefined;
        if (at) bottom = Math.max(bottom, at.y + at.h);
      }
      spans.push({ key: k, y: own.y, h: bottom - own.y });
    }
    return spans;
  };
  /**
   * A drag let go at `dy` (P-95): how many rows it crossed among its siblings, the divider counting
   * as one (negative: up), and where the line showing that goes — by where they were when it began.
   */
  const dropOf = (key: string, dy: number): { by: number; line?: number } | undefined => {
    const spans = (dragFrom.current?.key === key ? dragFrom.current.spans : undefined) ?? spansOf(key);
    if (!spans) return undefined;
    const c = spans.findIndex((x) => x.key === key);
    if (c < 0) return undefined;
    const mid = (x: Span) => x.y + x.h / 2;
    const at = mid(spans[c]) + dy;
    let up = 0;
    let down = 0;
    while (c - up - 1 >= 0 && mid(spans[c - up - 1]) > at) up++;
    while (c + down + 1 < spans.length && mid(spans[c + down + 1]) < at) down++;
    const by = down - up;
    return { by, ...(up ? { line: spans[c - up].y - SP.s1 } : down ? { line: spans[c + down].y + spans[c + down].h + SP.s1 } : {}) };
  };
  const drop = (row: PlanRow, dy: number | undefined) => {
    const d = dy === undefined ? undefined : dropOf(keyOf(row.path), dy);
    dragFrom.current = undefined;
    setDrag(null);
    if (d?.by) edit(row.seq, { kind: 'move', item: row.itemId, by: d.by });
  };

  // Where the words typed after a row (or into it) go: beneath the last line of that row.
  const typingRow = typing && typing.mode !== 'name' ? rowAt(typing.path) : undefined;
  const typingAfter = typing && typingRow && typing.mode !== 'words' ? shownRows.reduce((last, r, i) => (under(keyOf(r.path), typing.path) ? i : last), -1) : -1;

  /** Keeps what is typed in place. `stay`: Return (the next one can be typed at once); else it was left. */
  const keep = (stay: boolean) => {
    const t = live.current;
    if (!t) return;
    const was = act().undo;
    keepTyped(t, stay);
    // Left (not Return), and that made an edit: the press on Resume / Start that caused it must not make it a silent one.
    if (!stay && act().undo && act().undo !== was) leftEdit.current = act().undo;
  };
  /** P-110: the routine words name when they are exactly "@<routine name>" (case and spacing aside) — added, they are a call to it. */
  // (P-111: same-named routines resolve as Plan's rows and Return in the "@" list do — the oldest first.)
  const calledBy = (words: string) => routineInWords(words, routinesByAge(act().data));
  /** P-110: a call refused (itself, gone): said in words; the words stay where they were typed. */
  const refusedCall = (did: { ok: boolean; reason?: Refusal | 'reconnecting' }, target: string) => {
    if (did.ok) return false;
    const words = callRefused(did.reason, myRoutines(act().data).find((r) => r.routineId === target)?.name ?? '', v.name);
    if (words) act().say(words);
    return true;
  };
  const keepTyped = (t: Typing, stay: boolean) => {
    const words = tidy(t.text);
    const target = t.mode === 'name' ? undefined : calledBy(words);
    const leave = (to?: string) => {
      setTyping(null);
      if (stay && to !== undefined) toRow(list, to, title);
    };
    if (t.mode === 'name') {
      if (!words || words === v.name) {
        setNameTaken(false);
        return leave('');
      }
      const did = edit(v.routineId, { kind: 'rename', words });
      setNameTaken(!did.ok && did.reason === 'same-name');
      if (did.ok) leave('');
      return;
    }
    const row = rowAt(t.path);
    if (!row) return leave();
    if (t.mode === 'words') {
      // P-110: changed to "@<routine name>" — a plain step that gives nothing becomes the call. (P-111, the P-110
      // investigator: only when the words changed — a step stored as "@<name>" is made a call by its ··· alone.)
      const kept = wordsKept(row.words, t.text, row.kind === 'step' && !row.gives && !row.slot ? target : undefined);
      if (kept === 'none') return leave(t.path);
      if (kept === 'call') {
        if (!refusedCall(edit(row.seq, { kind: 'toCall', item: row.itemId, routine: target! }), target!)) leave(t.path);
        return;
      }
      // A step broken down: its words are its own sequence's.
      const did = row.broken && row.ref ? edit(row.ref, { kind: 'rename', words }) : edit(row.seq, { kind: 'reword', item: row.itemId, text: words });
      if (did.ok) leave(t.path);
      return;
    }
    if (!words) return leave(t.path);
    if (t.mode === 'into') {
      // P-110: "@<routine name>" put into a for each is a call there.
      if (target && row.each && row.ref) {
        if (!refusedCall(edit(row.ref, { kind: 'addCall', routine: target }), target)) setTyping(stay ? { ...t, text: '' } : null);
        return;
      }
      // The first makes the step a sequence of its own; the rest join it.
      const did = row.kind === 'step' ? edit(row.seq, { kind: 'breakDown', item: row.itemId, steps: [words] }) : row.ref ? edit(row.ref, { kind: 'addStep', text: words }) : undefined;
      if (did?.ok) setTyping(stay ? { ...t, text: '' } : null);
      return;
    }
    // P-110: a step added as "@<routine name>" is a call to it.
    if (target ? refusedCall(edit(row.seq, { kind: 'addCall', routine: target, after: row.itemId }), target) : !edit(row.seq, { kind: 'addStep', text: words, after: row.itemId }).ok) return;
    if (!stay) return setTyping(null);
    // The next one goes after the one just added.
    const now = planView(act().data, v.runId ? { runId: v.runId } : { routineId: v.routineId });
    const siblings = (now?.rows ?? []).filter((r) => parentOf(keyOf(r.path)) === parentOf(t.path));
    const added = siblings[siblings.findIndex((r) => r.itemId === row.itemId) + 1];
    setTyping(added ? { mode: 'after', path: keyOf(added.path), text: '' } : null);
  };
  const type = (text: string) => live.current && setTyping({ ...live.current, text });

  const addIt = () => {
    // P-103 (11; audit F3): Return puts in the name chosen in the open list; with none chosen it adds, as always.
    if (chosen >= 0) return choose(chosen);
    setPicking(null);
    if (!adding.trim()) return;
    // P-110: a step added as "@<routine name>" is a call to it.
    const target = calledBy(adding);
    // Refused (reconnecting): the words stay in the field.
    // (P-111: in a row's own view, after its last step.)
    if (target ? !refusedCall(edit(ownSeq, { kind: 'addCall', routine: target }), target) : edit(ownSeq, { kind: 'addStep', text: adding }).ok) {
      setAdding('');
      shutAt.current = -1;
    }
    addField.current?.focus();
  };

  const close = () => setMenu(null);
  /** P-107: the names a for each added at the end can go through — every name given in the routine, as Add a step offers them. */
  // (P-111: in a row's own view, the names given above its end — its item, and what its steps give, too.)
  const subIndex = sub ? v.rows.indexOf(sub) : -1;
  const eachLists = subIndex >= 0 ? namesOffered(v.rows, { mode: 'into', index: subIndex }) : namesOffered(v.rows, { mode: 'end' });
  const menuRow = menu && 'row' in menu ? rowAt(menu.row) : undefined;
  const keptRow = menu && 'kept' in menu ? rowAt(menu.kept) : undefined;
  const reorderRow = menu && 'reorder' in menu ? rowAt(menu.reorder) : undefined;
  const givesRow = menu && 'gives' in menu ? rowAt(menu.gives) : undefined;
  const bindRow = menu && 'bind' in menu ? rowAt(menu.bind) : undefined;
  const inputsRow = menu && 'inputs' in menu ? rowAt(menu.inputs) : undefined;
  /** P-98: where the routine being removed is a step (the confirm names them). */
  const callers = menu && 'removeRoutine' in menu ? callersOf(data, v.routineId) : [];
  const removingRow = menu && 'removing' in menu ? rowAt(menu.removing) : undefined;
  const removing = removingRow ? readersOf(data, removingRow.scope, removingRow.itemId) : undefined;
  const menuDivider = menu && 'divider' in menu ? (menu.divider === '' ? v.divider : v.rows.find((r) => r.divider && parentOf(keyOf(r.path)) === menu.divider)?.divider) : undefined;
  const startTyping = (t: Typing) => {
    close();
    // (P-110: a new field — an "@" put away in another one does not keep this one's closed.)
    shutAt.current = -1;
    setNameTaken(false);
    setTyping(t);
  };

  // P-96 (ruling 5, journey 2): the bar above the keyboard — names given above where the words will stand.
  const typingIndex = typing && typing.mode !== 'name' ? v.rows.findIndex((r) => keyOf(r.path) === typing.path) : -1;
  const offered = typing && typing.mode !== 'name' ? (typingIndex >= 0 ? namesOffered(v.rows, { mode: typing.mode, index: typingIndex }) : []) : addFocused ? eachLists : [];
  // (P-111: as the routines are — the name typed exactly first, then those it begins: "{concern" is the item, not {concerns}.)
  const matching = picking ? rankRoutines(picking.query, offered.map((n) => ({ routineId: n, name: n }))).map((n) => n.name) : [];
  // P-98: "@" at a word's start in Add a step (or a step added after a row) lists the person's routines too — only when summoned.
  const typedNow = typing ? typing.text : adding;
  // (P-107: and a step put into a for each — a routine called for each item.)
  // (P-110: and while changing a plain step's words — the step becomes the call, or the call comes after it.)
  const wordsAt = !!typing && typing.mode === 'words' && rowAt(typing.path)?.kind === 'step' && !rowAt(typing.path)?.gives && !rowAt(typing.path)?.slot;
  const atSign = !!picking && typedNow.charAt(picking.start) === '@' && (typing ? typing.mode === 'after' || (typing.mode === 'into' && !!rowAt(typing.path)?.each) || wordsAt : addFocused);
  // P-111 (the P-110 investigator: "@Doc" then Return took "Archive doc"): the one named exactly first, then those it begins.
  const routineMatches = atSign ? rankRoutines(picking!.query, myRoutines(data), routinesByAge(data).map((r) => r.routineId)).slice(0, 6) : [];
  // P-108: after "@", the names given above as routine rows too (`▤ {name}`), before the person's routines.
  const slotMatches = atSign && !wordsAt ? matching : [];
  const picks = matching.length + slotMatches.length + routineMatches.length;
  const picked = !!picking && picks > 0;
  /** The name (or routine) Return puts in: one the person chose (↑/↓), or — once part of one is typed — the first match. */
  const chosen = !picked ? -1 : lit >= 0 ? Math.min(lit, picks - 1) : picking!.query ? 0 : -1;
  const choose = (i: number) => (i < matching.length ? insertName(matching[i]) : i < matching.length + slotMatches.length ? addRoutineHere(slotMatches[i - matching.length], true) : addRoutineHere(routineMatches[i - matching.length - slotMatches.length].routineId));
  /** The words the caret is in: the add field's or the row's being typed (the caret moved: the names may close). */
  // (Read from the field itself: a caret event can come before the words it follows are rendered.)
  const caretMoved = () => readPick(WEB && lastField.current?.isConnected ? lastField.current.value : live.current ? live.current.text : adding);

  /**
   * A name from the bar, at the caret of the field being typed in. A pointer press never takes the focus
   * from the field; from the keyboard (a chip reached by Alt+↓ or Tab) the focus goes back to the field.
   */
  const insertName = (name: string) => {
    const now = live.current ? live.current.text : adding;
    const el = (WEB && typeof document !== 'undefined' ? document.activeElement : null) as HTMLInputElement | null;
    const isField = (x: HTMLInputElement | null) => !!x && (x.tagName === 'INPUT' || x.tagName === 'TEXTAREA') && typeof x.selectionStart === 'number';
    const field = isField(el) ? el : isField(lastField.current) && lastField.current!.isConnected ? lastField.current : null;
    let from = field ? Math.min(field.selectionStart ?? now.length, now.length) : now.length;
    const to = field ? Math.min(field.selectionEnd ?? from, now.length) : from;
    // P-103 (11): picked after "@" or "{": the name takes the place of what was typed from there.
    if (picking && picking.start <= from && now.slice(picking.start, from) === now.charAt(picking.start) + picking.query) from = picking.start;
    setPicking(null);
    // P-103 (11): a space after it (unless one is there), so the next word is not run into it.
    const tail = now.slice(to);
    // P-103 audit F4: a space before it too, after a word (never at the start or after a space).
    const lead = from === 0 || /\s/.test(now.charAt(from - 1)) ? '' : ' ';
    const token = `${lead}{${name}}${/^\s/.test(tail) ? '' : ' '}`;
    const text = now.slice(0, from) + token + tail;
    if (field) caretAfter.current = { field, text, at: from + token.length };
    if (live.current) type(text);
    else setAdding(text);
    // (No later focus here: a frame later the person may have moved on — Tab to Insert — and it would take the
    // focus back. The commit that shows the name puts the focus and the caret back, once: `caretAfter`.)
  };
  /**
   * P-98: a routine chosen from "@" — added as a step where the words were going (the end, or after the row typed
   * after), the "@…" typed for it taken out; what else was typed stays in the field. Refused: said, in words.
   */
  const addRoutineHere = (target: string, slot = false) => {
    const now = live.current ? live.current.text : adding;
    const rest = picking ? (now.slice(0, picking.start) + now.slice(picking.start + 1 + picking.query.length)).replace(/\s+$/, '') : now;
    setPicking(null);
    const t = live.current;
    // P-110: while changing a step's words — the step becomes the call (what else was typed stays as its words, the call after it).
    if (t && t.mode === 'words' && !slot) {
      const step = rowAt(t.path);
      const did = step ? edit(step.seq, { kind: 'toCall', item: step.itemId, routine: target, ...(rest.trim() && { words: rest }) }) : undefined;
      if (did && !did.ok) {
        const words = callRefused(did.reason, myRoutines(data).find((r) => r.routineId === target)?.name ?? '', v.name);
        if (words) act().say(words);
        setTyping({ ...t, text: rest });
        return;
      }
      setTyping(null);
      if (step) toRow(list, t.path, title);
      return;
    }
    const row = t && t.mode === 'after' ? rowAt(t.path) : undefined;
    // P-107: into a for each — at the end of its steps; the field stays open there for the next.
    const into = t && t.mode === 'into' ? rowAt(t.path) : undefined;
    // (P-108: `slot` — a routine row whose routine is the value `{target}`.)
    const what: RoutineEdit = slot ? { kind: 'addSlot', name: target } : { kind: 'addCall', routine: target };
    const did = into?.each && into.ref ? edit(into.ref, what) : row ? edit(row.seq, { ...what, after: row.itemId }) : edit(ownSeq, what);
    if (!did.ok) {
      const words = callRefused(did.reason, myRoutines(data).find((r) => r.routineId === target)?.name ?? '', v.name);
      if (words) act().say(words);
      return;
    }
    if (into && t) {
      setTyping({ ...t, text: rest });
      return;
    }
    if (!row || !t) {
      setAdding(rest);
      return;
    }
    const now2 = planView(act().data, v.runId ? { runId: v.runId } : { routineId: v.routineId });
    const siblings = (now2?.rows ?? []).filter((r) => parentOf(keyOf(r.path)) === parentOf(t.path));
    const added = siblings[siblings.findIndex((r) => r.itemId === row.itemId) + 1];
    setTyping(added ? { mode: 'after', path: keyOf(added.path), text: rest } : null);
  };
  /** The focus left the bar for somewhere that is not the field it came from: the typing is over, as if the field had been left. */
  const leftBar = () => {
    if (live.current) keep(false);
    setAddFocused(false);
  };

  /** P-102: a row moved one place (Alt+↑ / Alt+↓, a screen reader's action) — one edit, one Undo; the focus stays where it was. */
  const moveRow = (row: PlanRow, by: -1 | 1) => {
    if (by < 0 ? !row.canUp : !row.canDown) return;
    const had = WEB && typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
    if (!edit(row.seq, { kind: 'move', item: row.itemId, by }).ok) return;
    if (had)
      requestAnimationFrame(() => {
        if (had.isConnected && document.activeElement !== had) had.focus();
      });
  };

  const layer = menuRow ? (
    <Menu anchor={() => mores[keyOf(menuRow.path)]} label={menuRow.words} onClose={close} testID="go-plan-menu" fallback={title}>
      {(menuRow.kind !== 'routine' || menuRow.broken) && !menuRow.each && !menuRow.slot && <MenuItem label="Edit" onPress={() => startTyping({ mode: 'words', path: keyOf(menuRow.path), text: menuRow.words })} />}
      {/* P-110: a step whose words are "@<routine name>" — offered as a call to it (never made one by itself). */}
      {!!menuRow.asCall && (
        <MenuItem
          label="Make it a call"
          spoken={`Make it a call to ${menuRow.asCall.name}`}
          testID="go-plan-make-call"
          onPress={() => {
            const did = edit(menuRow.seq, { kind: 'toCall', item: menuRow.itemId, routine: menuRow.asCall!.routine });
            if (!did.ok) {
              const words = callRefused(did.reason, menuRow.asCall!.name, v.name);
              if (words) act().say(words);
            }
            close();
          }}
        />
      )}
      {/* P-107: a for each — its steps are added inside it. */}
      {!!menuRow.each && <MenuItem label="Add a step inside" spoken={`Add a step inside ${menuRow.words}`} testID="go-plan-add-inside" onPress={() => startTyping({ mode: 'into', path: keyOf(menuRow.path), text: '' })} />}
      {/* P-98: a call — Open (that routine's Plan), Edit inputs. */}
      {!!menuRow.call && !menuRow.call.removed && menuRow.ref && (
        <MenuItem
          label="Open"
          spoken={`Open ${menuRow.words}`}
          testID="go-plan-open-call"
          onPress={() => {
            close();
            router.push(`/go/routine/${menuRow.ref}`);
          }}
        />
      )}
      {!!menuRow.call && menuRow.call.inputs.length > 0 && (
        <MenuItem
          label="Edit inputs"
          spoken={`Edit inputs of ${menuRow.words}`}
          testID="go-plan-edit-inputs"
          onPress={() => setMenu(menuRow.call!.inputs.length === 1 ? { bind: keyOf(menuRow.path), input: menuRow.call!.inputs[0].input } : { inputs: keyOf(menuRow.path) })}
        />
      )}
      <MenuItem label="Add a step after" onPress={() => startTyping({ mode: 'after', path: keyOf(menuRow.path), text: '' })} />
      {/* P-96: a step that gives a name is not broken down (its value would have nowhere to be typed). */}
      {menuRow.canBreakDown && <MenuItem label="Break it down" onPress={() => startTyping({ mode: 'into', path: keyOf(menuRow.path), text: '' })} />}
      {/* P-96 (journey 1): what this step gives — a name later steps use as {name}. */}
      {menuRow.kind === 'step' && !menuRow.slot && <MenuItem label="Gives…" onPress={() => setMenu({ gives: keyOf(menuRow.path) })} />}
      {/* P-102: nothing is made a wait any more; a wait from an earlier build can become a step. */}
      {menuRow.kind === 'wait' && (
        <MenuItem
          label="Make it a step"
          onPress={() => {
            edit(menuRow.seq, { kind: 'toStep', item: menuRow.itemId });
            close();
          }}
        />
      )}
      {/* P-102 audit F1: too narrow for a grip — the moves are here (nothing by gesture alone). */}
      {narrow && <MoveItems row={menuRow} onMove={(by) => { close(); moveRow(menuRow, by); }} />}
      <MenuSep />
      <MenuItem
        label="Remove"
        danger
        testID="go-plan-remove-step"
        onPress={() => {
          // P-101 amendment (ruling 11): a step whose name other steps read — asked first, naming them.
          if (readersOf(data, menuRow.scope, menuRow.itemId)) return setMenu({ removing: keyOf(menuRow.path) });
          edit(menuRow.seq, { kind: 'remove', item: menuRow.itemId });
          close();
        }}
      />
    </Menu>
  ) : reorderRow ? (
    // P-102 audit F1: the grip, pressed — its own menu, the moves without a drag (the ··· menu stays trimmed).
    <Menu anchor={() => mores[`grip:${keyOf(reorderRow.path)}`]} label={`Reorder ${reorderRow.words}`} onClose={close} testID="go-plan-reorder" fallback={title}>
      <MoveItems row={reorderRow} onMove={(by) => { close(); moveRow(reorderRow, by); }} />
    </Menu>
  ) : removingRow && removing ? (
    // P-103 (8): the one confirm — a question, its reach in one line (and the steps that read it), Cancel, Remove in red.
    <Confirm
      title={`Remove “${removingRow.words}”?`}
      body={`It gives {${removing.name}}, which ${removing.readers.length === 1 ? '1 step reads' : `${removing.readers.length} steps read`}. They’ll ask for it when run.`}
      action="Remove"
      testID="go-plan-removing"
      actionTestID="go-plan-remove"
      onCancel={close}
      onAct={() => {
        const did = edit(removingRow.seq, { kind: 'remove', item: removingRow.itemId });
        close();
        // P-111: this view's own row removed — back to the view it is in.
        if (did.ok && sub && removingRow === sub) goUp();
      }}>
      <View style={styles.gap} testID="go-plan-readers">
        {removing.readers.map((w, i) => (
          <T key={i} dim>
            <Chips words={w} asks={[removing.name]} />
          </T>
        ))}
      </View>
    </Confirm>
  ) : menu && 'removeRoutine' in menu && !v.runId ? (
    // P-103 (5): removing a routine asks first (it reaches beyond this screen: home, and every routine using it).
    <Confirm
      title={`Remove “${v.name}”?`}
      body={removeBody(callers.map((c) => c.words))}
      action="Remove"
      testID="go-remove-routine-confirm"
      onCancel={close}
      onAct={() => {
        close();
        // Its Undo is on home's notice (this screen goes with the routine).
        edit(v.routineId, { kind: 'removeRoutine' });
      }}
    />
  ) : menu && 'restart' in menu && v.runId ? (
    <Confirm
      title={`Start ${v.name} over?`}
      body="Your place and values in it go."
      action="Start over"
      testID="go-restart-confirm"
      onCancel={close}
      onAct={() => {
        close();
        if (v.runId) act().restartRun(v.runId, v.restartLevel ?? 0);
      }}
    />
  ) : menuDivider && menu && 'divider' in menu ? (
    // P-102: anchored to its ··· like every menu; a small dialog, since it holds a choice and a stepper.
    <Menu kind="dialog" anchor={() => mores[`divider:${menu.divider}`]} label="Repeat from here" onClose={close} testID="go-plan-repeat" fallback={title}>
      <Repeat repeat={menuDivider.repeat} onChange={(times) => edit(menuDivider.seq, { kind: 'repeat', ...(times !== undefined && { times }) })} />
      <Btn
        kind="plain"
        label="Remove Repeat from here"
        danger
        onPress={() => {
          edit(menuDivider.seq, { kind: 'divider' });
          close();
        }}
      />
    </Menu>
  ) : bindRow?.call && menu && 'bind' in menu ? (
    <BindSheet
      routine={bindRow.words}
      input={menu.input}
      current={bindRow.call.inputs.find((i) => nameKey(i.input) === nameKey(menu.input))}
      names={bindRow.above}
      fallback={title}
      onClose={close}
      onBind={(to) => {
        if (edit(bindRow.seq, { kind: 'bind', item: bindRow.itemId, input: menu.input, to }).ok) close();
      }}
    />
  ) : inputsRow?.call ? (
    <InputsSheet routine={inputsRow.words} inputs={inputsRow.call.inputs} fallback={title} onClose={close} onInput={(input) => setMenu({ bind: keyOf(inputsRow.path), input })} />
  ) : menu && 'addRoutine' in menu ? (
    <RoutinesSheet
      names={eachLists}
      onName={(name) => {
        if (edit(ownSeq, { kind: 'addSlot', name }).ok) close();
      }}
      routines={myRoutines(data).map((r) => ({ routineId: r.routineId, name: r.name, line: rowLine({ ...r, tags: [], going: undefined }) }))}
      error={routineError}
      fallback={addField}
      onClose={() => {
        setRoutineError(undefined);
        close();
      }}
      onPick={(target) => {
        const did = edit(ownSeq, { kind: 'addCall', routine: target });
        if (did.ok) {
          setRoutineError(undefined);
          close();
          return;
        }
        setRoutineError(callRefused(did.reason, myRoutines(data).find((r) => r.routineId === target)?.name ?? '', v.name));
      }}
    />
  ) : menu && 'addEach' in menu ? (
    // P-107: Add's "For each…" — one ready-made sentence per name given above ("photo in {photos}").
    <ForEachSheet
      lists={eachLists}
      fallback={addField}
      onClose={close}
      onPick={(list, own) => {
        const had = new Set(v.rows.map((r) => keyOf(r.path)));
        // P-108: a list of its own — asked each run, or kept in the routine.
        const did = edit(ownSeq, { kind: 'addEach', item: itemNameFor(list), list, ...(own && { own }) });
        if (!did.ok) return did;
        close();
        // Its first step is typed inside it at once.
        const now = planView(act().data, v.runId ? { runId: v.runId } : { routineId: v.routineId });
        const made = now?.rows.find((r) => r.each && parentOf(keyOf(r.path)) === view.key && !had.has(keyOf(r.path)));
        if (made) startTyping({ mode: 'into', path: keyOf(made.path), text: '' });
        return did;
      }}
    />
  ) : keptRow?.each?.kept && keptRow.ref ? (
    // P-108: + Add on a kept list — its items, a new row at the end to type in.
    <KeptSheet seq={keptRow.ref} list={keptRow.each.list} fallback={title} onClose={close} />
  ) : menu && 'copy' in menu ? (
    <CopySheet
      name={v.name}
      suggested={copyName(v.name, (w) => !!routineNamed(data, w))}
      fallback={title}
      onClose={close}
      onCopy={(words) => {
        const did = edit(v.routineId, { kind: 'copy', words });
        if (did.ok) close();
        return did;
      }}
    />
  ) : givesRow ? (
    <GivesSheet row={givesRow} edit={edit} onClose={close} fallback={title} />
  ) : menu && 'places' in menu ? (
    // P-109: the routine's places — each change one Plan edit, said in the sheet with its Undo.
    <PlacesSheet routineId={v.routineId} name={v.name} edit at={menu.at} onClose={close} fallback={title} />
  ) : menu && 'tags' in menu ? (
    // P-97: the routine's tags (a comma or Return makes a chip); Keep is one Plan edit, its Undo in this menu.
    <TagsSheet
      name={v.name}
      tags={tags}
      fallback={title}
      onClose={close}
      onKeep={(next) => {
        if (edit(v.routineId, { kind: 'tags', tags: next }).ok) close();
      }}
    />
  ) : menu && 'routine' in menu ? (
    <Menu anchor={() => mores['']} label={v.name} onClose={close} testID="go-plan-routine" fallback={title}>
      {/* P-101 (ruling 6): the last Plan edit's Undo lives here (Plan's edits give no notice). */}
      {can && quietEdit && (
        <MenuItem
          mark="undo"
          label={`Undo ${quietEdit.charAt(0).toLowerCase()}${quietEdit.slice(1)}`}
          testID="go-plan-undo"
          onPress={() => {
            close();
            can.undo();
            // After the menu has gone (the screen beneath is inert until then): the heading, as for any Undo here.
            setTimeout(() => focusOn(title), 0);
          }}
        />
      )}
      {sub ? (
        // P-111: a row's own view — its own words (a step broken down), and Remove; the routine's own items are its Plan's.
        <>
          {!sub.each && <MenuItem label="Edit" spoken={`Edit ${sub.words}`} onPress={() => startTyping({ mode: 'words', path: view.key, text: sub.words })} />}
          <MenuSep />
          <MenuItem
            label="Remove"
            spoken={`Remove ${sub.words}`}
            danger
            testID="go-plan-remove-step"
            onPress={() => {
              if (readersOf(data, sub.scope, sub.itemId)) return setMenu({ removing: view.key });
              close();
              if (edit(sub.seq, { kind: 'remove', item: sub.itemId }).ok) goUp();
            }}
          />
        </>
      ) : (
      <>
      <MenuItem label="Change the name" onPress={() => startTyping({ mode: 'name', path: '', text: v.name })} />
      {/* P-97: tags, for My routines' filter. */}
      {v.named && tagsWritable(v ? data.routines[v.routineId]?.tags : undefined) && <MenuItem label="Tags…" spoken={`Tags for ${v.name}`} testID="go-plan-tags-item" onPress={() => setMenu({ tags: true })} />}
      {/* P-109: where its work lives (B-18). */}
      {v.named && placesWritable(data.routines[v.routineId]?.places) && <MenuItem label="Places…" spoken={`Places for ${v.name}`} testID="go-plan-places-item" onPress={() => setMenu({ places: true })} />}
      {/* P-98: Copy — the same routine under a new name (to vary, copy). */}
      {v.named && <MenuItem label="Copy…" spoken={`Copy ${v.name}`} testID="go-plan-copy-item" onPress={() => setMenu({ copy: true })} />}
      {/* P-101 amendment (ruling 9): its run, from this routine's first step (asked first; Undo). */}
      {!!v.runId && <MenuItem label="Start over" spoken={`Start over: ${v.name}`} onPress={() => setMenu({ restart: true })} testID="go-plan-restart" />}
      {!v.divider && v.rows.length > 0 && (
        <MenuItem
          label="Add Repeat from here"
          onPress={() => {
            edit(v.routineId, { kind: 'divider', from: 0 });
            close();
          }}
        />
      )}
      {/* P-96: no "Ends here" — finishing never opens Plan, so it would mean nothing (the stored field is kept and read). */}
      {!v.runId && (
        <>
          <MenuSep />
          <MenuItem label={`Remove ${v.name}`} danger testID="go-plan-remove-routine" onPress={() => setMenu({ removeRoutine: true })} />
        </>
      )}
      </>
      )}
    </Menu>
  ) : null;

  /** P-108: a kept list — its items as rows under the block (no count), and + Add. (P-111: also under its own view's heading.) */
  const keptRows = (row: PlanRow) =>
    !!row.each?.kept && (
      <View style={styles.kept} testID="go-plan-kept">
        <View role="list" aria-label={row.each.list} style={styles.kept}>
          {row.each.kept.map((x, k) => (
            <View key={k} role="listitem" style={styles.keptItem} testID="go-plan-kept-item">
              {!!x.routine && (
                <View {...decorative}>
                  <Mark name="routine" size={20} color={G.dim} />
                </View>
              )}
              <T style={styles.shrink}>{x.text}</T>
            </View>
          ))}
        </View>
        <Btn kind="plain" mark="add" label="Add" spoken={`Add to ${row.each.list}`} onPress={() => setMenu({ kept: keyOf(row.path) })} testID="go-plan-kept-add" />
      </View>
    );

  /** P-101 (ruling 8): "{ } Insert" beside a field typed in — the names (the bar), from the first. */
  // Audit F7: the web only — on iOS/Android the names bar above the keyboard is the way (its chips are buttons there).
  const insertBtn = offered.length > 0 && WEB ? <InsertBtn lastField={lastField} onLeave={leftBar} /> : null;
  const typed = (label: string, placeholder?: string) =>
    typing && (
      <Typed
        key={`${typing.mode}:${typing.path}`}
        value={typing.text}
        label={label}
        placeholder={placeholder}
        onChange={(text) => {
          type(text);
          readPick(text);
        }}
        onSubmit={() => {
          // P-111 (the P-110 investigator): a step's words opened unchanged ("@Doc", the caret after it) are not a pick —
          // Return takes one only once the person has chosen it (↑/↓) or typed something new.
          const same = typing.mode === 'words' && tidy(typing.text) === rowAt(typing.path)?.words;
          if (chosen >= 0 && (lit >= 0 || !same)) return choose(chosen);
          setPicking(null);
          keep(true);
        }}
        onCaret={caretMoved}
        onBlur={() => keep(false)}
        onField={(el) => {
          lastField.current = el;
        }}
        insert={typing.mode === 'name' ? null : insertBtn}
      />
    );

  // The rows of the repeating part of each sequence carry a rail (which steps come round again).
  const repeating = new Set<string>();
  const forward = v.forward && (v.forward.kind === 'resume' || v.forward.ready) ? v.forward : undefined;
  /** The filled button: the runner, exactly where it was (the route follows the data). */
  const goForward = () => {
    if (!forward) return;
    // Words still open in a row are kept by this press (the blur it causes, or here). That edit
    // must not be silent: its notice and Undo go with you to the runner. Refused (a name that
    // is taken, reconnecting): the field is still open — nothing runs, nothing is lost.
    if (live.current) keep(false);
    if (live.current) return;
    const kept = !!act().undo && act().undo === leftEdit.current;
    if (forward.kind === 'resume') act().resumeRun(forward.runId, kept);
    else act().startRoutine(forward.routineId, kept);
  };
  /** P-103 (3): Back to the run — Resume, by another name (nothing to go back to: home). */
  const backToRun = () => (forward?.kind === 'resume' ? goForward() : goHome());
  const foot = (
    <>
      {/* P-109: the Places sheet says its own changes (its notice is in it). */}
      {menu && 'places' in menu ? <View style={!floor && styles.noticeRoom} /> : <Notice onUndone={() => focusOn(title)} reserve={!floor} />}
      {/* P-101 (ruling 2; was P-96: Home the bottom-left side door): Home is in the band. Done, at the edge only, is the right side door. */}
      {v.canDone && (
        <View style={styles.doors} testID="go-side-doors">
          <View style={styles.door} />
          <View style={styles.door}>
            <Btn label="Done" spoken={`Done with ${v.name}`} onPress={() => v.runId && act().doneLevel(v.runId)} testID="go-plan-done" />
          </View>
        </View>
      )}
      {/* The filled button's slot is kept when there is nothing forward (P-96): the side doors never move. */}
      <View style={styles.foot}>
        {forward ? (
          <Btn
            kind="filled"
            label={forward.label}
            size={18}
            style={styles.forward}
            testID="go-plan-forward"
            onPress={goForward}
          />
        ) : (
          <View style={styles.emptySlot} />
        )}
      </View>
    </>
  );

  return (
    <GoScreen testID="go-plan" layer={layer}>
      <View style={styles.band} testID="go-plan-band">
        {/* P-103 (2, 3; was P-101 ruling 2: Home at the band's right edge): the one way out, first at the top-left. Opened
            from the runner it says so and goes back there, where you were; else ⌂ Home, which changes nothing. */}
        {fromRun && v.runId ? (
          <Btn ink mark="back" label="Back to the run" spoken={`Back to the run: ${v.name}`} onPress={backToRun} testID="go-plan-back" style={styles.out} />
        ) : fromList ? (
          // P-97: opened from My routines — its way out goes back there (as the browser's Back would).
          <Btn ink mark="back" label="My routines" spoken="Back to My routines" onPress={() => (router.canGoBack() ? router.back() : router.replace('/go/routines'))} testID="go-plan-to-routines" style={styles.out} />
        ) : (
          <Btn ink mark="home" label="Home" onPress={goHome} testID="go-plan-home" style={styles.out} />
        )}
        <T title ink size={20} style={styles.word} testID="go-plan-word">
          PLAN
        </T>
      </View>
      {/* Web: the heading ("Plan: <name>") takes the focus and is read, unless the open row has it. Native: focus is not moved, so it is always said. */}
      {(openFirst || !WEB) && <Said text={`Plan: ${v.name}`} />}
      <ScrollView ref={scroller} style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" testID="go-plan-list">
        <View ref={list} style={styles.rows}>
          {/* P-111: a row's own view — the path back, one up (as the runner's path names the level it is in). */}
          {!!view.up && (
            <View style={styles.path} testID="go-plan-path">
              <Btn kind="plain" mark="back" label={view.up.words} spoken={`Back to ${view.up.words}`} onPress={goUp} testID="go-plan-up" style={styles.up} />
            </View>
          )}
          {sub && typing?.mode === 'words' && typing.path === view.key ? (
            typed(`Step: ${sub.words}`)
          ) : sub ? (
            <View style={styles.head}>
              <H1 own ref={title} spoken={`Plan: ${headWords}`} style={styles.name}>
                <Chips words={sub.words} asks={sub.asks} parts={sub.parts} />
              </H1>
              <Btn ref={moreRef('')} kind="plain" mark="more" spoken={`More for ${sub.words}`} onPress={() => setMenu({ routine: true })} dataSet={{ more: '' }} testID="go-plan-more" />
            </View>
          ) : typing?.mode === 'name' ? (
            <View style={styles.gap}>
              {typed('Name')}
              {nameTaken && (
                <T color={G.err} accessibilityRole="alert" testID="go-plan-name-error">
                  ! Another routine has this name
                </T>
              )}
            </View>
          ) : (
            <View style={styles.head}>
              <H1 own ref={title} spoken={`Plan: ${v.name}`} style={styles.name}>
                {v.name}
              </H1>
              <Btn ref={moreRef('')} kind="plain" mark="more" spoken={`More for ${v.name}`} onPress={() => setMenu({ routine: true })} dataSet={{ more: '' }} testID="go-plan-more" />
            </View>
          )}
          {!!v.line && (
            <T dim style={styles.line} testID="go-plan-line">
              {v.line}
            </T>
          )}
          {/* P-111: what its steps give (hoisted), and a kept list's items, under its own heading. */}
          {!!sub?.hoisted && <Gives names={sub.hoisted} testID="go-plan-hoisted" />}
          {!!sub?.each?.kept && keptRows(sub)}
          {/* P-97: its tags, under the heading (Tags… on its ··· changes them). */}
          {!sub && v.named && tags.length > 0 && typing?.mode !== 'name' && (
            <T dim style={styles.line} testID="go-plan-tags">
              {tagWords(tags)}
            </T>
          )}
          {/* P-109: its places, by name — an address opens; words open the Places sheet at that row. */}
          {!sub && v.named && places.length > 0 && typing?.mode !== 'name' && <PlacesLine places={places} onWords={(at) => setMenu({ places: true, at })} />}

          {shownRows.map((row, i) => {
            const key = keyOf(row.path);
            const parent = parentOf(key);
            if (row.divider) repeating.add(parent);
            const rail = repeating.has(parent);
            const open = row.kind === 'routine' && opened(row);
            // (P-110: Plan of a run says the words as shown — the values held at its place in them.)
            const shownWords = row.shown ?? row.words;
            const says = `${row.here ? 'Here, ' : row.within ? 'You are in this, ' : ''}${row.kind === 'wait' ? `Wait for: ${shownWords}` : shownWords}`;
            const moves = rowMoves(row);
            const insides = insidesOf(row);
            return (
              <View
                key={key}
                style={[styles.gap, { marginLeft: indent(row.depth) }]}
                onLayout={(e) => {
                  laid(key, 'y')(e);
                  if (row.here) hereLaid(e.nativeEvent.layout.y);
                }}>
                {row.divider && <DividerRow divider={row.divider} onMenu={() => setMenu({ divider: parent })} edit={edit} menuKey={`divider:${parent}`} moreRef={moreRef(`divider:${parent}`)} onLayout={laid(key, 'div')} viewRef={(el) => { dividers.current[key] = el; }} />}
                <View ref={(el) => { rails.current[key] = el; }} style={rail && styles.rail} onLayout={laid(key, 'row')}>
                  {typing?.mode === 'words' && typing.path === key ? (
                    typed(row.kind === 'wait' ? `Wait for: ${row.words}` : `Step: ${row.words}`)
                  ) : (
                    <View
                      ref={row.here ? hereRow : undefined}
                      style={[styles.row, row.here && styles.rowHere, drag?.key === key && styles.rowDragging]}
                      role="group"
                      aria-label={says}
                      accessibilityLabel={says}
                      testID="go-plan-row"
                      {...(WEB && ({ onKeyDown: (e: { key: string; altKey: boolean; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; target: unknown; preventDefault: () => void }) => {
                        // P-102: Alt+↑ / Alt+↓ while focus is in the row (never while typing) moves it one place.
                        if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || typingIn(e.target as Element | null)) return;
                        const by = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
                        if (!by) return;
                        e.preventDefault();
                        moveRow(row, by);
                      } }) as object)}
                      {...{ dataSet: { here: row.here ? 'true' : 'false', within: row.within ? 'true' : 'false', kind: row.kind, depth: String(row.depth - view.base), repeats: rail ? 'true' : 'false', dragging: drag?.key === key ? 'true' : 'false' } }}>
                      {/* Too narrow (large text): no grip — the words keep their room (P-102: the moves are on the step's menu there). */}
                      {!narrow && (row.canUp || row.canDown) && <Grip words={row.words} onStart={() => { const spans = spansOf(key); dragFrom.current = spans ? { key, spans } : undefined; }} onMove={(dy) => setDrag({ key, dy, line: dropOf(key, dy)?.line })} onDrop={(dy) => drop(row, dy)} onPress={() => setMenu({ reorder: key })} gripRef={moreRef(`grip:${key}`)} />}
                      {/* P-103 (10; was ▤, the routine's mark, as a button): the disclosure chevron — › shut, ⌄ open. P-111: a
                          step broken down or a for each goes into its own view (›); a routine used as a step opens in place. */}
                      {insides === 'view' && <InsidesBtn words={shownWords} onPress={() => openView(row)} testID="go-plan-insides" dataSet={{ insides: key }} />}
                      {insides === 'fold' && <InsidesBtn words={row.words} open={open} onPress={() => setFolds({ ...folds, [key]: !open })} />}
                      {row.kind === 'wait' && (
                        <View style={styles.rowMark}>
                          <Mark name="wait" color={G.dim} />
                        </View>
                      )}
                      <View style={[styles.said, narrow && styles.saidNarrow]}>
                        {row.here && (
                          <View style={styles.tag} testID="go-plan-here">
                            <T ink bold>
                              HERE
                            </T>
                          </View>
                        )}
                        <View style={narrow ? styles.wordsNarrow : styles.words}>
                          {/* P-111: a step broken down (or a for each) — a tap on its words goes in too (its chevron is the named way in). */}
                          <Pressable style={styles.callName} disabled={insides !== 'view'} onPress={() => openView(row)} accessible={false} focusable={false} testID={insides === 'view' ? 'go-plan-into' : undefined}>
                            {/* P-98: a call reads the routine's name with the routine's mark. */}
                            {(!!row.call || !!row.slot) && (
                              <View {...decorative}>
                                <Mark name="routine" color={G.dim} />
                              </View>
                            )}
                            <T testID="go-plan-words" style={styles.shrink}>
                              {row.kind === 'wait' && <T dim>Wait for </T>}
                              <Chips words={row.words} asks={row.asks} parts={row.parts} />
                            </T>
                          </Pressable>
                          {!!row.call && <CallLines name={row.words} call={row.call} onInput={(input) => setMenu({ bind: key, input })} />}
                          {!!row.gives && (
                            <T dim testID="go-plan-gives">
                              {'gives '}
                              <NameChip name={row.gives} />
                            </T>
                          )}
                          {/* P-101 (ruling 7): what its smaller steps give, hoisted. */}
                          {!!row.hoisted && <Gives names={row.hoisted} testID="go-plan-hoisted" />}
                          {/* P-108: a kept list — its items as rows under the block (no count), and + Add. */}
                          {!!row.each?.kept && keptRows(row)}
                        </View>
                      </View>
                      <Btn
                        ref={moreRef(key)}
                        kind="plain"
                        mark="more"
                        spoken={`More for ${row.words}`}
                        onPress={() => setMenu({ row: key })}
                        dataSet={{ more: key }}
                        style={styles.sq}
                        {...(moves.length > 0 && { keys: MOVE_KEYS })}
                        actions={moves}
                        onAction={(name) => {
                          const m = moves.find((x) => x.name === name);
                          if (m) moveRow(row, m.by);
                        }}
                      />
                    </View>
                  )}
                </View>
                {typing && typingAfter === i && typing.mode !== 'words' && typing.mode !== 'name' && (
                  <View style={typing.mode === 'into' ? { marginLeft: indent(typingRow!.depth + 1) - indent(row.depth) } : { marginLeft: indent(typingRow!.depth) - indent(row.depth) }}>
                    {typed(typing.mode === 'into' ? (typingRow!.each ? `Add a step inside ${typingRow!.words}` : `A smaller step of ${typingRow!.words}`) : `Add a step after ${typingRow!.words}`, typing.mode === 'into' && !typingRow!.each ? 'A smaller step' : ADD_PLACEHOLDER)}
                  </View>
                )}
              </View>
            );
          })}

          {drag?.line !== undefined && <View style={[styles.dropLine, { top: drag.line - 2 }]} testID="go-plan-drop" pointerEvents="none" />}

          <View ref={addBox} style={[styles.addRow, addFocused && RING]} {...{ dataSet: { typing: '' } }}>
            {/* P-103 (11): the field has the row's whole width and grows with its words; Insert and Add sit below it. */}
            <View style={styles.addMark}>
              <Mark name="add" color={G.dim} />
            </View>
            {/* P-101 (item 5): it wraps and grows, so the whole step shows while it is typed. */}
            <GrowField
              ref={addField}
              bare
              value={adding}
              onChangeText={(text) => {
                setAdding(text);
                readPick(text);
              }}
              onSelectionChange={caretMoved}
              onFocus={(e) => {
                setAddFocused(true);
                if (WEB) lastField.current = e.target as unknown as HTMLInputElement;
              }}
              onBlur={(e) => !toBar(e) && setAddFocused(false)}
              placeholder={ADD_PLACEHOLDER}
              accessibilityLabel={ADD_PLACEHOLDER}
              onSubmit={addIt}
              style={styles.addField}
              testID="go-plan-add"
            />
            {/* P-98: Add's "a routine" — the person's routines, only when asked for (D-24). With almost no room (the
                keyboard up, large text) it gives way to the words — nothing moves under a press — and "@" is there. */}
            {(!floor || (addFocused && !!insertBtn) || !!adding.trim()) && (
              <View style={styles.addTools}>
                {!floor && <Btn kind="plain" mark="routine" label="A routine" spoken="Add a routine as a step" onPress={() => setMenu({ addRoutine: true })} style={styles.addBtn} testID="go-plan-add-routine" />}
                {/* P-107: a loop over a name given above; P-108: or over a list of its own. */}
                {!floor && <Btn kind="plain" label="For each…" onPress={() => setMenu({ addEach: true })} style={styles.addBtn} testID="go-plan-add-each" />}
                {addFocused && insertBtn}
                {!!adding.trim() && <Btn kind="plain" label="Add" spoken="Add this step" onPress={addIt} style={styles.addBtn} testID="go-plan-add-btn" />}
              </View>
            )}
          </View>
        </View>
        {floor && foot}
      </ScrollView>
      {(offered.length > 0 || routineMatches.length > 0) && <NamesBar names={picked ? matching : offered} slots={picked ? slotMatches : []} routines={picked ? routineMatches.map((r) => ({ id: r.routineId, name: r.name })) : []} picking={picked} lit={chosen} onMove={(by) => setLit(chosen < 0 ? (by > 0 ? 0 : picks - 1) : (chosen + by + picks) % picks)} onPick={insertName} onSlot={(n) => addRoutineHere(n, true)} onRoutine={(id) => addRoutineHere(id)} asCall={wordsAt} lastField={lastField} onLeave={leftBar} />}
      {!floor && foot}
    </GoScreen>
  );
}

/** "Repeat from here": a row of its own, with visible Move up / Move down and its menu (until I'm done or a number; take it out). */
function DividerRow({ divider, onMenu, edit, menuKey, moreRef, onLayout, viewRef }: { divider: PlanDivider; onMenu: () => void; edit: (seq: string, e: RoutineEdit) => { ok: boolean }; menuKey: string; moreRef?: (el: ViewRef | null) => void; onLayout?: (e: LayoutChangeEvent) => void; viewRef?: (el: ViewRef | null) => void }) {
  const times = divider.repeat;
  return (
    <View ref={viewRef} onLayout={onLayout} style={styles.divider} role="group" aria-label="Repeat from here" accessibilityLabel="Repeat from here" testID="go-plan-divider" {...{ dataSet: { from: String(divider.from) } }}>
      <View style={styles.dividerWords}>
        <Mark name="repeat" color={G.text} />
        <T bold style={styles.shrink}>
          Repeat from here
          {times !== undefined && <T dim testID="go-plan-times">{` · ${times} ${times === 1 ? 'time' : 'times'}`}</T>}
        </T>
      </View>
      <Btn mark="up" spoken="Move Repeat from here up" disabled={!divider.canUp} onPress={() => edit(divider.seq, { kind: 'divider', from: divider.from - 1 })} />
      <Btn mark="down" spoken="Move Repeat from here down" disabled={!divider.canDown} onPress={() => edit(divider.seq, { kind: 'divider', from: divider.from + 1 })} />
      <Btn ref={moreRef} kind="plain" mark="more" spoken="More for Repeat from here" onPress={onMenu} dataSet={{ more: menuKey }} style={styles.sq} />
    </View>
  );
}

interface Span {
  y: number;
  h: number;
}

/** P-102 audit F1: Move up · Move down as menu items, each unavailable at its end. */
function MoveItems({ row, onMove }: { row: PlanRow; onMove: (by: -1 | 1) => void }) {
  return (
    <>
      <MenuItem label="Move up" disabled={!row.canUp} onPress={() => onMove(-1)} />
      <MenuItem label="Move down" disabled={!row.canDown} onPress={() => onMove(1)} />
    </>
  );
}

/** P-102: the keys that move a row (web), as `aria-keyshortcuts` says them. */
const MOVE_KEYS = 'Alt+ArrowUp Alt+ArrowDown';

/** A move this far (px) is a drag; a press right after one is the drag's own release, not a tap. */
const DRAG_PX = 8;
const AFTER_DRAG_MS = 600;
/** Web: the grip takes the touch itself (no page scroll, no text selected while dragging). */
const GRAB = WEB ? ({ touchAction: 'none', userSelect: 'none', cursor: 'grab' } as object) : null;

/**
 * P-95: a row's grip — the visible way to drag it. It claims the pointer once it has moved DRAG_PX up or
 * down; pressed, it is a button ("Reorder <words>") that opens its own small menu, Move up · Move down
 * (P-102 audit F1: the way to reorder without a drag).
 */
function Grip({ words, onStart, onMove, onDrop, onPress, gripRef }: { words: string; onStart: () => void; onMove: (dy: number) => void; onDrop: (dy: number | undefined) => void; onPress: () => void; gripRef?: (el: unknown) => void }) {
  const start = useRef<number | null>(null);
  const dragging = useRef(false);
  const ended = useRef(0);
  const box = useRef<ViewRef>(null);
  // The latest handlers, for the listeners the web path adds once.
  const calls = useRef({ onStart, onMove, onDrop });
  useEffect(() => {
    calls.current = { onStart, onMove, onDrop };
  });
  const end = (to: number | undefined) => {
    if (dragging.current) ended.current = Date.now();
    const was = dragging.current;
    dragging.current = false;
    start.current = null;
    if (was) calls.current.onDrop(to);
  };
  const pointer = useRef<number | undefined>(undefined);
  const moved = (y: number) => {
    if (start.current === null) return;
    const dy = y - start.current;
    if (!dragging.current && Math.abs(dy) > DRAG_PX) {
      dragging.current = true;
      // Web: from here on the grip has the pointer, wherever it goes (not before: a press stays a press).
      const el = box.current as unknown as HTMLElement | null;
      try {
        if (WEB && el && pointer.current !== undefined) el.setPointerCapture(pointer.current);
      } catch {
        // (A pointer that is already gone.)
      }
      calls.current.onStart();
    }
    if (dragging.current) calls.current.onMove(dy);
  };
  // Web: DOM pointer events (touch and mouse alike). Pressed on the grip, the pointer is followed on the
  // whole window until it is let go: a quick first move is already off the grip before it counts as a
  // drag (audit F2 spec), and RN-web's responder only asks the grip about moves over it.
  useEffect(() => {
    const el = box.current as unknown as HTMLElement | null;
    if (!WEB || !el || typeof el.addEventListener !== 'function') return;
    let id: number | undefined;
    const move = (e: PointerEvent) => e.pointerId === id && moved(e.clientY);
    const stop = (e: PointerEvent, to: number | undefined) => {
      if (e.pointerId !== id) return;
      id = undefined;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      end(to);
    };
    const up = (e: PointerEvent) => stop(e, start.current === null ? undefined : e.clientY - start.current);
    const cancel = (e: PointerEvent) => stop(e, undefined);
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || id !== undefined) return;
      id = e.pointerId;
      pointer.current = e.pointerId;
      start.current = e.clientY;
      dragging.current = false;
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', cancel);
    };
    el.addEventListener('pointerdown', down);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
    };
    // Once: the handlers are read through `calls`.
  }, []);
  type Touch = { nativeEvent: { pageY: number } };
  // Native: the responder system (a vertical move past DRAG_PX claims the touch).
  const native = WEB
    ? {}
    : {
        onStartShouldSetResponderCapture: (e: Touch) => {
          start.current = e.nativeEvent.pageY;
          return false;
        },
        onMoveShouldSetResponder: (e: Touch) => start.current !== null && Math.abs(e.nativeEvent.pageY - start.current) > DRAG_PX,
        onResponderMove: (e: Touch) => moved(e.nativeEvent.pageY),
        onResponderRelease: (e: Touch) => end(start.current === null ? undefined : e.nativeEvent.pageY - start.current),
        onResponderTerminationRequest: () => false,
        onResponderTerminate: () => end(undefined),
      };
  return (
    <View ref={box} style={[styles.grip, GRAB]} {...native} testID="go-plan-grip">
      <Pressable
        ref={gripRef}
        onPress={() => Date.now() - ended.current > AFTER_DRAG_MS && !dragging.current && onPress()}
        accessibilityRole="button"
        accessibilityLabel={`Reorder ${words}`}
        {...(WEB && { 'aria-keyshortcuts': MOVE_KEYS })}
        style={(state) => [styles.gripBtn, (state as { focused?: boolean }).focused && RING]}>
        <Mark name="grip" color={G.dim} />
      </Pressable>
    </View>
  );
}

/** A field typed in, in place: it has the focus from the start; Return keeps the words, leaving it keeps them too. P-101: "{ } Insert" beside it. */
function Typed({ value, label, placeholder, onChange, onSubmit, onBlur, onField, onCaret, insert }: { value: string; label: string; placeholder?: string; onChange: (text: string) => void; onSubmit: () => void; onBlur: () => void; onField: (el: HTMLInputElement) => void; onCaret?: () => void; insert: React.ReactNode }) {
  const box = useRef<ViewRef>(null);
  // Taken off the screen while it has the focus (its words were kept, or it moved beneath a new row):
  // the blur that causes is not the person leaving it.
  const gone = useRef(false);
  useLayoutEffect(() => {
    gone.current = false;
    return () => {
      gone.current = true;
    };
  }, []);
  useEffect(() => {
    if (!WEB) return;
    const el = (box.current as unknown as HTMLElement | null)?.querySelector<HTMLElement>('textarea, input');
    if (!el || document.activeElement === el) return;
    el.focus();
    caretToEnd(el);
  }, []);
  return (
    <View ref={box} style={styles.typedRow} {...{ dataSet: { typing: '' } }}>
      <GrowField
        value={value}
        onChangeText={onChange}
        onSubmit={onSubmit}
        onSelectionChange={onCaret}
        onFocus={(e) => {
          if (WEB) onField(e.target as unknown as HTMLInputElement);
        }}
        onBlur={(e) => !gone.current && !toBar(e) && onBlur()}
        accessibilityLabel={label}
        placeholder={placeholder}
        autoFocus={!WEB}
        style={styles.typedField}
        testID="go-plan-typed"
      />
      {insert}
    </View>
  );
}

/**
 * P-96: a row's words, each `{name}` in them a chip. P-110: Plan of a run — a value held at the run's place in place of
 * its `{name}` (inverted, as on the runner); a name not given stays as written (its chip).
 */
function Chips({ words, asks = [], parts: shown }: { words: string; asks?: string[]; parts?: StepPart[] }) {
  // P-101 amendment (ruling 11): a name no step here gives — dashed, "asks {name}" (it asks when run).
  const asking = new Set(asks.map((n) => nameKey(n)));
  if (shown)
    return (
      <>
        {shown.map((p, i) =>
          p.kind === 'text' ? (
            p.text
          ) : p.kind === 'value' ? (
            <T key={i} style={styles.valueInPlace} testID="go-plan-value" {...{ dataSet: { name: p.name } }}>
              {p.shown ? <ValueText shown={p.shown} color={G.ink} /> : p.text}
            </T>
          ) : (
            <NameChip key={i} name={p.name} asks={asking.has(nameKey(p.name))} />
          ),
        )}
      </>
    );
  const parts = parseWords(words);
  if (!parts.some((p) => p.kind === 'name')) return <>{words}</>;
  return <>{parts.map((p, i) => (p.kind === 'text' ? p.text : <NameChip key={i} name={p.name} asks={asking.has(nameKey(p.name))} />))}</>;
}

/** P-96 audit F6: the focus is going into the names bar (a field left for it is not left). */
function toBar(e: unknown): boolean {
  const ev = e as { relatedTarget?: unknown; nativeEvent?: { relatedTarget?: unknown } } | undefined;
  const t = (ev?.relatedTarget ?? ev?.nativeEvent?.relatedTarget) as Element | null | undefined;
  return !!t && typeof t.closest === 'function' && !!t.closest('[data-testid="go-names-bar"], [data-insert]');
}

/**
 * P-101 (ruling 8): "{ } Insert" beside the field being typed in — the visible way to the names (the bar
 * above the keyboard; Alt+↓ from the field is the same). A pointer press never takes the focus from the
 * field; pressed, the first name has the focus (Return inserts it and goes back to the field; Esc goes
 * back without inserting). Leaving it for anywhere but the field or the names ends the typing, as
 * leaving the field does.
 */
function InsertBtn({ lastField, onLeave }: { lastField: { current: HTMLInputElement | null }; onLeave: () => void }) {
  const box = useRef<ViewRef>(null);
  const leave = useRef(onLeave);
  useEffect(() => {
    leave.current = onLeave;
  });
  useEffect(() => {
    const el = box.current as unknown as HTMLElement | null;
    if (!WEB || !el || typeof el.addEventListener !== 'function') return;
    const keep = (e: Event) => e.preventDefault();
    const out = (e: FocusEvent) => {
      const next = e.relatedTarget as Element | null;
      if (next && (el.contains(next) || next === lastField.current || (typeof next.closest === 'function' && next.closest('[data-testid="go-names-bar"]')))) return;
      leave.current();
    };
    el.addEventListener('mousedown', keep);
    el.addEventListener('focusout', out);
    return () => {
      el.removeEventListener('mousedown', keep);
      el.removeEventListener('focusout', out);
    };
  }, [lastField]);
  const open = () => {
    if (!WEB || typeof document === 'undefined') return;
    document.querySelector<HTMLElement>('[data-testid="go-names-bar"] [data-testid="go-names-chip"]')?.focus();
  };
  return (
    <View ref={box} {...{ dataSet: { insert: '' } }} style={styles.insert}>
      <Btn kind="plain" mark="braces" label="Insert" spoken="Insert a name" onPress={open} testID="go-insert" />
    </View>
  );
}

/**
 * P-96 (ruling 5, journey 2): the bar above the keyboard while words are typed — the names given above,
 * each inserting `{name}` at the caret. A pointer press never takes the focus from the field. From the
 * keyboard (audit F6): Alt+↓ in the field goes to the first name (Tab reaches them too); ←/→ move
 * between them; Return or Space inserts and goes back to the field; Esc goes back without inserting.
 */
function NamesBar({ names, slots = [], routines = [], picking, lit = -1, onMove, onPick, onSlot, onRoutine, asCall = false, lastField, onLeave }: { names: string[]; slots?: string[]; routines?: { id: string; name: string }[]; picking?: boolean; lit?: number; onMove?: (by: 1 | -1) => void; onPick: (name: string) => void; onSlot?: (name: string) => void; onRoutine?: (routineId: string) => void; /** P-110: typed while changing a step's words — a routine chosen makes the step a call to it. */ asCall?: boolean; lastField: { current: HTMLInputElement | null }; onLeave: () => void }) {
  const box = useRef<ViewRef>(null);
  const leave = useRef(onLeave);
  const move = useRef<{ picking?: boolean; onMove?: (by: 1 | -1) => void }>({});
  useEffect(() => {
    leave.current = onLeave;
    move.current = { picking, onMove };
  });
  useEffect(() => {
    const el = box.current as unknown as HTMLElement | null;
    if (!WEB || !el || typeof el.addEventListener !== 'function') return;
    const isField = (t: EventTarget | null): t is HTMLInputElement => !!t && ((t as Element).tagName === 'INPUT' || (t as Element).tagName === 'TEXTAREA');
    const chips = () => Array.from(el.querySelectorAll<HTMLElement>('[data-testid="go-names-chip"], [data-testid="go-names-routine"]'));
    const keep = (e: Event) => e.preventDefault();
    const into = (e: FocusEvent) => {
      if (isField(e.relatedTarget)) lastField.current = e.relatedTarget;
    };
    const out = (e: FocusEvent) => {
      const next = e.relatedTarget as Node | null;
      if (next && (el.contains(next) || next === lastField.current)) return;
      leave.current();
    };
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      // P-103 audit F3: while "@" / "{" has the names open, ↑/↓ in the field choose one (Return then puts it in).
      if (!e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && isField(t) && !el.contains(t) && move.current.picking) {
        e.preventDefault();
        e.stopImmediatePropagation();
        move.current.onMove?.(e.key === 'ArrowDown' ? 1 : -1);
        return;
      }
      if (e.altKey && e.key === 'ArrowDown' && isField(t) && !el.contains(t)) {
        lastField.current = t;
        e.preventDefault();
        e.stopImmediatePropagation();
        chips()[0]?.focus();
        return;
      }
      if (!t || !el.contains(t)) return;
      const list = chips();
      const i = list.indexOf(t);
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        lastField.current?.focus();
      } else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && i >= 0) {
        e.preventDefault();
        list[(i + (e.key === 'ArrowRight' ? 1 : list.length - 1)) % list.length]?.focus();
      }
    };
    el.addEventListener('mousedown', keep);
    el.addEventListener('focusin', into);
    el.addEventListener('focusout', out);
    window.addEventListener('keydown', key, true);
    return () => {
      el.removeEventListener('mousedown', keep);
      el.removeEventListener('focusin', into);
      el.removeEventListener('focusout', out);
      window.removeEventListener('keydown', key, true);
    };
  }, [lastField]);
  return (
    // P-103 (11): opened by "@" / "{" (`picking`), it shows the names that match, the first marked: Return puts it in.
    <View ref={box} style={styles.bar} testID="go-names-bar" role="toolbar" aria-label="Names" {...{ dataSet: { picking: picking ? 'true' : 'false' } }}>
      {names.map((n, i) => (
        <Pressable key={n} onPress={() => onPick(n)} accessibilityRole="button" accessibilityLabel={`Insert {${n}}`} style={(state) => [styles.chip, picking && i === lit && styles.chipFirst, (state as { focused?: boolean }).focused && RING]} testID="go-names-chip" {...{ dataSet: { lit: picking && i === lit ? 'true' : 'false' } }}>
          <T bold>
            <T dim {...decorative}>
              {'{'}
            </T>
            {n}
            <T dim {...decorative}>
              {'}'}
            </T>
          </T>
        </Pressable>
      ))}
      {/* P-108: after "@", a name given above as a routine row (`▤ {name}`). */}
      {slots.map((n, j) => (
        <Pressable key={`slot:${n}`} onPress={() => onSlot?.(n)} accessibilityRole="button" accessibilityLabel={`Add the routine in {${n}} as a step`} style={(state) => [styles.chip, styles.routineChip, picking && names.length + j === lit && styles.chipFirst, (state as { focused?: boolean }).focused && RING]} testID="go-names-slot" {...{ dataSet: { lit: picking && names.length + j === lit ? 'true' : 'false', name: n } }}>
          <View {...decorative}>
            <Mark name="routine" color={G.dim} />
          </View>
          <T bold>
            <T dim {...decorative}>
              {'{'}
            </T>
            {n}
            <T dim {...decorative}>
              {'}'}
            </T>
          </T>
        </Pressable>
      ))}
      {/* P-98: after "@", the person's routines that match — a tap adds one as a step. */}
      {routines.map((r, j) => (
        <Pressable key={r.id} onPress={() => onRoutine?.(r.id)} accessibilityRole="button" accessibilityLabel={asCall ? `Make it a call to ${r.name}` : `Add ${r.name} as a step`} style={(state) => [styles.chip, styles.routineChip, picking && names.length + slots.length + j === lit && styles.chipFirst, (state as { focused?: boolean }).focused && RING]} testID="go-names-routine" {...{ dataSet: { lit: picking && names.length + slots.length + j === lit ? 'true' : 'false', routine: r.id } }}>
          <View {...decorative}>
            <Mark name="routine" color={G.dim} />
          </View>
          <T bold>{r.name}</T>
        </Pressable>
      ))}
    </View>
  );
}

/**
 * P-96 (journey 1): "Gives…" — one thing, the name (suggested from the step's words, editable). Gives
 * <name> keeps it; on a step that gives one already, a new name renames it in this routine's steps and
 * in open runs (one write), and "Gives nothing" takes it off (readers keep their words: they ask when
 * run). Every one has its notice and Undo. Close leaves it as it was.
 */
function GivesSheet({ row, edit, onClose, fallback }: { row: PlanRow; edit: (seq: string, e: RoutineEdit) => { ok: boolean; reason?: string }; onClose: () => void; fallback: { current: unknown } }) {
  const [name, setName] = useState(() => row.gives ?? suggestName(row.words));
  const [taken, setTaken] = useState(false);
  const good = isName(name);
  const shown = tidyName(name);
  const apply = () => {
    if (!good) return;
    if (row.gives && shown === row.gives) return onClose();
    const did = row.gives && nameKey(row.gives) ? edit(row.scope, { kind: 'renameValue', from: row.gives, to: name }) : edit(row.seq, { kind: 'gives', item: row.itemId, name });
    setTaken(!did.ok && did.reason === 'same-name');
    if (did.ok) onClose();
  };
  return (
    <Sheet title={row.words} onClose={onClose} testID="go-gives-sheet" fallback={fallback}>
      <T dim nativeID="go-gives-label">
        Gives
      </T>
      <Field
        value={name}
        onChangeText={(t) => {
          setName(t);
          setTaken(false);
        }}
        accessibilityLabel="Gives"
        maxLength={MAX_NAME}
        autoCapitalize="none"
        autoCorrect={false}
        submitBehavior="submit"
        returnKeyType="done"
        onSubmitEditing={apply}
        testID="go-gives-name"
        {...{ dataSet: { first: 'true' } }}
      />
      {taken && (
        <T color={G.err} accessibilityRole="alert" testID="go-gives-error">
          ! This routine already uses that name
        </T>
      )}
      <Btn kind="filled" label={good ? `Gives ${shown}` : 'Gives'} disabled={!good} onPress={apply} size={18} testID="go-gives-apply" />
      {!!row.gives && (
        <Btn
          kind="plain"
          label="Gives nothing"
          onPress={() => {
            if (edit(row.seq, { kind: 'gives', item: row.itemId }).ok) onClose();
          }}
        />
      )}
      <Btn label="Close" onPress={onClose} />
    </Sheet>
  );
}

const typingIn = (el: Element | null) => !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.getClientRects().length > 0;

/**
 * A phone's on-screen keyboard is up (web): the visible part of the page is well short of the page
 * (iOS keeps the page's height and shrinks the visual viewport). Not a pinch-zoom (that scales it).
 */
function keyboardUp(seen: { height: number } | undefined): boolean {
  if (!WEB || !seen || typeof window === 'undefined') return false;
  return window.innerHeight - seen.height * (window.visualViewport?.scale ?? 1) > 120;
}

/**
 * Web: when a field in the list has the focus, scrolls the list (only as far as needed) so that field
 * is whole in what can be seen of it, with the row just above it (the step just added) too when there
 * is room. The field comes first.
 */
function keepTypingInView(scroller: unknown) {
  if (!WEB || typeof document === 'undefined') return;
  const box = (scroller as { getScrollableNode?: () => HTMLElement } | null)?.getScrollableNode?.();
  const el = document.activeElement;
  if (!box || !typingIn(el) || !box.contains(el)) return;
  const field = el!.closest('[data-typing]') ?? el!;
  const rows = Array.from(box.querySelectorAll('[data-testid="go-plan-row"]'));
  const above = rows.filter((r) => r.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING).pop();
  const b = box.getBoundingClientRect();
  const vv = window.visualViewport;
  const top = b.top + 4;
  const bottom = Math.min(b.bottom, vv ? vv.offsetTop + vv.height : window.innerHeight) - 4;
  const f = field.getBoundingClientRect();
  const from = above ? Math.min(above.getBoundingClientRect().top, f.top) : f.top;
  // The least scroll that shows [from, to] whole, if any does.
  const least = (from: number, to: number) => {
    const lo = to - bottom;
    const hi = from - top;
    return lo > hi ? undefined : lo > 0 ? lo : hi < 0 ? hi : 0;
  };
  const by = least(from, f.bottom) ?? least(f.top, f.bottom) ?? f.bottom - bottom;
  if (Math.abs(by) >= 1) box.scrollTop += by;
}

/** On arriving: the heading has the focus (never taken from a field being typed in) and the HERE row is in view. */
function arrive(title: { current: unknown }, here: { current: unknown }, tries = 30) {
  if (!WEB || typeof requestAnimationFrame === 'undefined') return;
  const go = (left: number) => {
    const head = title.current as HTMLElement | null;
    if (!head || head.getClientRects().length === 0) {
      if (left > 0) requestAnimationFrame(() => go(left - 1));
      return;
    }
    if (!typingIn(document.activeElement)) head.focus({ preventScroll: true });
    (here.current as HTMLElement | null)?.scrollIntoView?.({ block: 'center' });
  };
  requestAnimationFrame(() => go(tries));
}

/** After typing in place is over: the row's own menu button (the heading's, for the name), else the heading. */
function toRow(list: { current: unknown }, key: string, title: { current: unknown }) {
  if (!WEB || typeof requestAnimationFrame === 'undefined') return;
  requestAnimationFrame(() => {
    const within = list.current as HTMLElement | null;
    const el = Array.from(within?.querySelectorAll<HTMLElement>('[data-more]') ?? []).find((b) => b.getAttribute('data-more') === key);
    if (el) el.focus();
    else focusOn(title);
  });
}

/** P-111: back in a view from a row's own view — the focus on that row's way in (else its ···, else the heading). */
function toInsides(list: { current: unknown }, key: string, title: { current: unknown }, tries = 30) {
  if (!WEB || typeof requestAnimationFrame === 'undefined') return;
  const go = (left: number) => {
    const within = list.current as HTMLElement | null;
    const all = Array.from(within?.querySelectorAll<HTMLElement>('[data-insides], [data-more]') ?? []);
    const el = all.find((b) => b.getAttribute('data-insides') === key) ?? all.find((b) => b.getAttribute('data-more') === key);
    if (el && el.getClientRects().length > 0) return el.focus();
    if (left > 0) return requestAnimationFrame(() => go(left - 1));
    focusOn(title);
  };
  requestAnimationFrame(() => go(tries));
}

const styles = StyleSheet.create({
  // P-110: a value held at the run's place, in a Plan row's words — inverted, as on the runner's note.
  valueInPlace: { backgroundColor: G.text, color: G.ink, paddingHorizontal: 2 },
  // P-109: the notice's room kept while the Places sheet holds the notice (nothing beneath moves).
  noticeRoom: { minHeight: 64 },
  flex: { flex: 1, minHeight: 0 },
  shrink: { flexShrink: 1 },
  callName: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap: SP.s1 },
  // P-108: a kept list's rows under its block.
  kept: { gap: SP.s1, paddingTop: SP.s1 },
  keptItem: { flexDirection: 'row', alignItems: 'center', gap: SP.s1, borderLeftWidth: 2, borderColor: G.line, paddingLeft: SP.s2, minHeight: 32 },
  gap: { gap: SP.s2 },
  // The band: light, one line, in one place on every Plan screen. Home is always its last control
  // (top right); Done, at the edge only, has the slot before it. In a window too narrow for both,
  // the word goes beneath — Home does not move.
  band: { minHeight: 64, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SP.s3, paddingHorizontal: SP.s2, paddingVertical: SP.s2, backgroundColor: G.paper },
  out: { flexShrink: 1, paddingHorizontal: SP.s2 },
  word: { flexGrow: 1, letterSpacing: 1 },
  body: { flexGrow: 1, padding: SP.s3, paddingBottom: SP.s2 },
  rows: { gap: SP.s2 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: SP.s2 },
  name: { flex: 1, minWidth: 0, paddingVertical: SP.s2 + 2 },
  line: { marginBottom: SP.s2 },
  // P-111: the path back, one up, above a row's own view's heading (its words wrap; a full target).
  path: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  up: { flexShrink: 1, marginLeft: -SP.s2 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, borderWidth: 2, borderColor: G.line, backgroundColor: G.surf, paddingLeft: SP.s3 - 4, gap: SP.s2 },
  // P-95: the grip, at the row's left edge (the row's own padding is its left half), a full target tall.
  grip: { marginLeft: -(SP.s3 - 4), alignSelf: 'stretch', justifyContent: 'center' },
  gripBtn: { width: TARGET, minHeight: TARGET, alignItems: 'center', justifyContent: 'center' },
  // The row being dragged stays where it is, dashed (audit F2: nothing is covered — HERE included); the line shows where it goes.
  rowDragging: { borderStyle: 'dashed', borderColor: G.dim },
  dropLine: { position: 'absolute', left: 0, right: 0, height: 4, backgroundColor: G.paper, zIndex: 3 },
  // The white outline means HERE, and only HERE (focus has its own ring, in its own colour).
  rowHere: { borderColor: G.text, borderWidth: 3 },
  rowMark: { width: 24, alignItems: 'center' },
  tag: { backgroundColor: G.paper, paddingHorizontal: SP.s2, paddingVertical: 2 },
  said: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: SP.s2, paddingVertical: SP.s2 },
  saidNarrow: { flexDirection: 'column', alignItems: 'flex-start', gap: SP.s1 },
  words: { flex: 1, minWidth: 0 },
  wordsNarrow: { alignSelf: 'stretch' },
  sq: { width: TARGET, paddingHorizontal: 0, justifyContent: 'center' },
  rail: { borderLeftWidth: 4, borderLeftColor: G.line, paddingLeft: SP.s2 },
  divider: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: SP.s2, borderTopWidth: 2, borderTopColor: G.dim, borderStyle: 'dashed', paddingTop: SP.s2 },
  dividerWords: { flexDirection: 'row', alignItems: 'center', gap: SP.s2, flexGrow: 1, flexShrink: 1, flexBasis: 120, minHeight: TARGET },
  addRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', borderWidth: 2, borderColor: G.line, backgroundColor: G.surf },
  // A line of their own, below the field (`flexBasis` 100 %), at its end.
  addTools: { flexBasis: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: SP.s1 },
  addMark: { width: 24, marginLeft: SP.s3 - 4, alignItems: 'center' },
  // Too narrow for the words and Add on one line (large text): Add goes beneath, at the end.
  addBtn: { minWidth: TARGET + SP.s3, justifyContent: 'center' },
  addField: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, paddingHorizontal: SP.s2 },
  // P-101 (ruling 8): the field and "{ } Insert" beside it; with too little room, Insert goes beneath, at the end.
  // P-103 (11): the field its whole width; Insert below it, at the end.
  typedRow: { gap: SP.s1 },
  typedField: { alignSelf: 'stretch', minWidth: 0 },
  insert: { alignSelf: 'flex-end' },
  foot: { paddingHorizontal: SP.s3, paddingBottom: SP.s3, paddingTop: SP.s1 },
  // The side doors: two halves, left and right, always in the same places (P-96).
  doors: { flexDirection: 'row', gap: SP.s2, paddingHorizontal: SP.s3, paddingTop: SP.s1, paddingBottom: SP.s2 },
  door: { flexGrow: 1, flexShrink: 1, flexBasis: 0 },
  bar: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.s2, paddingHorizontal: SP.s3, paddingVertical: SP.s2, backgroundColor: G.surf, borderTopWidth: 2, borderTopColor: G.line },
  chipFirst: { borderColor: G.text },
  routineChip: { flexDirection: 'row', alignItems: 'center', gap: SP.s1 },
  chip: { minHeight: TARGET, minWidth: TARGET, justifyContent: 'center', paddingHorizontal: SP.s3, borderWidth: 2, borderColor: G.line, backgroundColor: G.surf2 },
  forward: { minHeight: 56 },
  // As tall as the filled button and the room its shadow keeps.
  emptySlot: { minHeight: 60 },
});
