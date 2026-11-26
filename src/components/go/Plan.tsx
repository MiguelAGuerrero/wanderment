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
 * P-95: every step row has a grip at its left edge ("Reorder <words>"): dragged (touch or mouse) it
 * moves the row among its siblings — the row stays in place, dashed, and a line shows where it will go
 * (past an open routine: after its last step); nothing moves until it is let go, so nothing covers
 * anything and there is no reflow to animate (Reduce Motion or not).
 * Dropped, it is ONE move edit of as many rows as it crossed ("Repeat from here" counts as a row and
 * is passed alone, the P-90 rule), so one Undo. Pressed, it opens the row's menu, where Move up /
 * Move down stay for the keyboard and screen readers — and for a window too narrow for a grip (large
 * text), where the words keep the room instead.
 *
 * The route follows the data and writes nothing — but for one case: a run the build before left at
 * the edge with this-run changes is folded into its routine on arriving (`planView().unfolded`), once,
 * with its notice and Undo. That Undo, at the edge, leaves the run in Plan by the data (nothing can run
 * there) with its changes back: the rows would be the run's reading and the edits the routine's, so
 * this screen leaves for home instead (Plan opened again folds again, saying so).
 */
import { router, useIsFocused } from 'expo-router';
import { ComponentRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { RoutineEdit } from '@/domain/run';
import { namesOffered, PlanDivider, PlanRow, planView, runRoute } from '@/domain/runView';
import { isName, MAX_NAME, nameKey, parseWords, suggestName, tidyName } from '@/domain/values';
import { useStore } from '@/store/useStore';

import { decorative } from '../a11y';
import { Mark } from './marks';
import { Notice, useRunUndo } from './Notice';
import { Repeat } from './Repeat';
import { goHome } from './Runner';
import { readDraft, writeDraft } from './session';
import { G, SP, TARGET } from './tokens';
import { Btn, caretToEnd, Field, focusOn, focusSoon, GoScreen, GrowField, H1, InputRef, Said, Sheet, T, TextRef, useKeys, useVisibleHeight, ViewRef } from './ui';
import { NameChip } from './Values';

const WEB = Platform.OS === 'web';
/** The focus ring: its own colour, with a gap (never the white of HERE). */
const RING = WEB ? ({ outlineStyle: 'solid', outlineWidth: 2, outlineColor: G.focus, outlineOffset: 3 } as object) : null;
const keyOf = (path: string[]) => path.join('/');
const parentOf = (key: string) => key.slice(0, Math.max(0, key.lastIndexOf('/')));
/** `key` is `parent` or beneath it. */
const under = (key: string, parent: string) => key === parent || key.startsWith(`${parent}/`);
const tidy = (s: string) => s.trim().replace(/\s+/g, ' ');

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

type Menu = { row: string } | { divider: string } | { routine: true } | { gives: string };

export function Plan({ runId, routineId }: { runId?: string; routineId?: string }) {
  const data = useStore((s) => s.data);
  const act = useStore.getState;
  const focused = useIsFocused();
  const v = planView(data, runId ? { runId } : { routineId: routineId ?? '' });
  // Where the data says this run's screens are. This address is Plan's only while it says Plan
  // (a routine's address: only while it has no run).
  const route = v?.runId ? runRoute(data, v.runId) : undefined;
  // This screen has shown the run with nothing left to fold: this-run changes on it again can only be
  // the fold's Undo (nothing writes one any more). Then it is not a Plan to edit: home.
  const [wasFolded, setWasFolded] = useState(false);
  if (!!v?.runId && v.planning && !v.unfolded && !wasFolded) setWasFolded(true);
  const undone = wasFolded && !!v?.planning && v.unfolded;
  const here = !!v && !undone && (v.runId ? !!runId && route === 'plan' : true);
  const id = runId ?? routineId ?? '';

  const [menu, setMenu] = useState<Menu | null>(null);
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
  const [addFocused, setAddFocused] = useState(false);
  /** P-96 audit F6: the field the names bar was entered from (by the keyboard), so a chip inserts there. */
  const lastField = useRef<HTMLInputElement | null>(null);
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
    if (gone || !runOf || route === 'home' || undone) goHome();
    else if (route === 'runner') router.replace(`/go/run/${runOf}`);
    // P-96: `runRoute` has no paused screen any more (a paused run is home).
    else router.replace(`/go/run/${runOf}/plan`);
  }, [focused, here, gone, runOf, route, undone]);

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
  const openFirst = !!v && (v.edge || (!v.runId && v.rows.length === 0));
  useEffect(() => {
    if (!focused || !here) return;
    if (openFirst) focusSoon(addBox);
    else arrive(title, hereRow);
  }, [focused, here, openFirst]);
  // Native: HERE is in view once it has been laid out (the arrival effect runs before that), once.
  const hereShown = useRef(false);
  const hereLaid = (y: number) => {
    hereY.current = y;
    if (WEB || hereShown.current) return;
    hereShown.current = true;
    scroller.current?.scrollTo({ y: Math.max(0, y - 96), animated: false });
  };

  const can = useRunUndo();
  const undo = () => {
    if (!can) return;
    can.undo();
    focusOn(title);
  };
  // A narrow window (large text): levels step in less, and HERE stands above its words, so the words keep their room.
  const narrow = useWindowDimensions().width < 340;
  const indent = (depth: number) => Math.min(depth, 6) * (narrow ? 8 : 24);
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

  // A routine row shows its steps when the run is inside it, when it is a step broken down, while
  // smaller steps are being typed into it — or as it was last opened or closed by hand.
  const opened = (row: PlanRow) => folds[keyOf(row.path)] ?? (row.within || !!row.broken || (typing?.mode === 'into' && typing.path === keyOf(row.path)));
  const shownRows: PlanRow[] = [];
  const shut: string[] = [];
  for (const row of v.rows) {
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
  const keepTyped = (t: Typing, stay: boolean) => {
    const words = tidy(t.text);
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
      if (!words || words === row.words) return leave(t.path);
      // A step broken down: its words are its own sequence's.
      const did = row.broken && row.ref ? edit(row.ref, { kind: 'rename', words }) : edit(row.seq, { kind: 'reword', item: row.itemId, text: words });
      if (did.ok) leave(t.path);
      return;
    }
    if (!words) return leave(t.path);
    if (t.mode === 'into') {
      // The first makes the step a sequence of its own; the rest join it.
      const did = row.kind === 'step' ? edit(row.seq, { kind: 'breakDown', item: row.itemId, steps: [words] }) : row.ref ? edit(row.ref, { kind: 'addStep', text: words }) : undefined;
      if (did?.ok) setTyping(stay ? { ...t, text: '' } : null);
      return;
    }
    if (!edit(row.seq, { kind: 'addStep', text: words, after: row.itemId }).ok) return;
    if (!stay) return setTyping(null);
    // The next one goes after the one just added.
    const now = planView(act().data, v.runId ? { runId: v.runId } : { routineId: v.routineId });
    const siblings = (now?.rows ?? []).filter((r) => parentOf(keyOf(r.path)) === parentOf(t.path));
    const added = siblings[siblings.findIndex((r) => r.itemId === row.itemId) + 1];
    setTyping(added ? { mode: 'after', path: keyOf(added.path), text: '' } : null);
  };
  const type = (text: string) => live.current && setTyping({ ...live.current, text });

  const addIt = () => {
    if (!adding.trim()) return;
    // Refused (reconnecting): the words stay in the field.
    if (edit(v.routineId, { kind: 'addStep', text: adding }).ok) setAdding('');
    addField.current?.focus();
  };

  const close = () => setMenu(null);
  const menuRow = menu && 'row' in menu ? rowAt(menu.row) : undefined;
  const givesRow = menu && 'gives' in menu ? rowAt(menu.gives) : undefined;
  const menuDivider = menu && 'divider' in menu ? (menu.divider === '' ? v.divider : v.rows.find((r) => r.divider && parentOf(keyOf(r.path)) === menu.divider)?.divider) : undefined;
  const startTyping = (t: Typing) => {
    close();
    setNameTaken(false);
    setTyping(t);
  };

  // P-96 (ruling 5, journey 2): the bar above the keyboard — names given above where the words will stand.
  const typingIndex = typing && typing.mode !== 'name' ? v.rows.findIndex((r) => keyOf(r.path) === typing.path) : -1;
  const offered = typing && typing.mode !== 'name' ? (typingIndex >= 0 ? namesOffered(v.rows, { mode: typing.mode, index: typingIndex }) : []) : addFocused ? namesOffered(v.rows, { mode: 'end' }) : [];
  /**
   * A name from the bar, at the caret of the field being typed in. A pointer press never takes the focus
   * from the field; from the keyboard (a chip reached by Alt+↓ or Tab) the focus goes back to the field.
   */
  const insertName = (name: string) => {
    const token = `{${name}}`;
    const now = live.current ? live.current.text : adding;
    const el = (WEB && typeof document !== 'undefined' ? document.activeElement : null) as HTMLInputElement | null;
    const isField = (x: HTMLInputElement | null) => !!x && (x.tagName === 'INPUT' || x.tagName === 'TEXTAREA') && typeof x.selectionStart === 'number';
    const field = isField(el) ? el : isField(lastField.current) && lastField.current!.isConnected ? lastField.current : null;
    const from = field ? Math.min(field.selectionStart ?? now.length, now.length) : now.length;
    const to = field ? Math.min(field.selectionEnd ?? from, now.length) : from;
    const text = now.slice(0, from) + token + now.slice(to);
    if (live.current) type(text);
    else setAdding(text);
    if (field)
      requestAnimationFrame(() => {
        if (document.activeElement !== field) field.focus();
        field.setSelectionRange(from + token.length, from + token.length);
      });
  };
  /** The focus left the bar for somewhere that is not the field it came from: the typing is over, as if the field had been left. */
  const leftBar = () => {
    if (live.current) keep(false);
    setAddFocused(false);
  };

  const layer = menuRow ? (
    <Sheet title={menuRow.words} onClose={close} testID="go-plan-menu" fallback={title}>
      {(menuRow.kind !== 'routine' || menuRow.broken) && <Btn kind="plain" label="Change the words" onPress={() => startTyping({ mode: 'words', path: keyOf(menuRow.path), text: menuRow.words })} />}
      <Btn kind="plain" label="Add a step after" onPress={() => startTyping({ mode: 'after', path: keyOf(menuRow.path), text: '' })} />
      {/* P-96: a step that gives a name is not broken down (its value would have nowhere to be typed). */}
      {menuRow.canBreakDown && <Btn kind="plain" label="Break it down" onPress={() => startTyping({ mode: 'into', path: keyOf(menuRow.path), text: '' })} />}
      {/* P-96 (journey 1): what this step gives — a name later steps use as {name}. */}
      {menuRow.kind === 'step' && <Btn kind="plain" label="Gives…" onPress={() => setMenu({ gives: keyOf(menuRow.path) })} />}
      {menuRow.kind === 'step' && (
        <Btn
          kind="plain"
          label="Make it a wait"
          onPress={() => {
            edit(menuRow.seq, { kind: 'toWait', item: menuRow.itemId });
            close();
          }}
        />
      )}
      {menuRow.kind === 'wait' && (
        <Btn
          kind="plain"
          label="Make it a step"
          onPress={() => {
            edit(menuRow.seq, { kind: 'toStep', item: menuRow.itemId });
            close();
          }}
        />
      )}
      <Btn
        kind="plain"
        label="Move up"
        disabled={!menuRow.canUp}
        onPress={() => {
          edit(menuRow.seq, { kind: 'move', item: menuRow.itemId, by: -1 });
          close();
        }}
      />
      <Btn
        kind="plain"
        label="Move down"
        disabled={!menuRow.canDown}
        onPress={() => {
          edit(menuRow.seq, { kind: 'move', item: menuRow.itemId, by: 1 });
          close();
        }}
      />
      <Btn
        kind="plain"
        label="Remove this step"
        onPress={() => {
          edit(menuRow.seq, { kind: 'remove', item: menuRow.itemId });
          close();
        }}
      />
      <Btn label="Close" onPress={close} />
    </Sheet>
  ) : menuDivider ? (
    <Sheet title="Repeat from here" onClose={close} testID="go-plan-repeat" fallback={title}>
      <Repeat repeat={menuDivider.repeat} onChange={(times) => edit(menuDivider.seq, { kind: 'repeat', ...(times !== undefined && { times }) })} />
      <Btn
        kind="plain"
        label="Remove Repeat from here"
        onPress={() => {
          edit(menuDivider.seq, { kind: 'divider' });
          close();
        }}
      />
      <Btn label="Close" onPress={close} />
    </Sheet>
  ) : givesRow ? (
    <GivesSheet row={givesRow} edit={edit} onClose={close} fallback={title} />
  ) : menu && 'routine' in menu ? (
    <Sheet title={v.name} onClose={close} testID="go-plan-routine" fallback={title}>
      <Btn kind="plain" label="Change the name" onPress={() => startTyping({ mode: 'name', path: '', text: v.name })} />
      {!v.divider && v.rows.length > 0 && (
        <Btn
          kind="plain"
          label="Add Repeat from here"
          onPress={() => {
            edit(v.routineId, { kind: 'divider', from: 0 });
            close();
          }}
        />
      )}
      {/* P-96: no "Ends here" — finishing never opens Plan, so it would mean nothing (the stored field is kept and read). */}
      {!v.runId && (
        <Btn
          kind="plain"
          label={`Remove ${v.name}`}
          onPress={() => {
            // Its Undo is on home's notice (this screen goes with the routine).
            edit(v.routineId, { kind: 'removeRoutine' });
            close();
          }}
        />
      )}
      <Btn label="Close" onPress={close} />
    </Sheet>
  ) : null;

  const typed = (label: string, placeholder?: string) =>
    typing && (
      <Typed
        key={`${typing.mode}:${typing.path}`}
        value={typing.text}
        label={label}
        placeholder={placeholder}
        onChange={type}
        onSubmit={() => keep(true)}
        onBlur={() => keep(false)}
      />
    );

  // The rows of the repeating part of each sequence carry a rail (which steps come round again).
  const repeating = new Set<string>();
  const forward = v.forward && (v.forward.kind === 'resume' || v.forward.ready) ? v.forward : undefined;
  const foot = (
    <>
      <Notice onUndone={() => focusOn(title)} reserve={!floor} />
      {/* P-96 (the amendment): the side doors — left, Home (the run stays in Plan); right, Done at the edge only. */}
      <View style={styles.doors} testID="go-side-doors">
        <View style={styles.door}>
          <Btn mark="home" label="Home" onPress={goHome} testID="go-plan-home" />
        </View>
        <View style={styles.door}>{v.canDone && <Btn label="Done" spoken={`Done with ${v.name}`} onPress={() => v.runId && act().doneLevel(v.runId)} testID="go-plan-done" />}</View>
      </View>
      {/* The filled button's slot is kept when there is nothing forward (P-96): the side doors never move. */}
      <View style={styles.foot}>
        {forward ? (
          <Btn
            kind="filled"
            label={forward.label}
            size={18}
            style={styles.forward}
            testID="go-plan-forward"
            onPress={() => {
              // The route follows the data: the runner, exactly where it was. Refused: nothing changes.
              // Words still open in a row are kept by this press (the blur it causes, or here). That edit
              // must not be silent: its notice and Undo go with you to the runner. Refused (a name that
              // is taken, reconnecting): the field is still open — nothing runs, nothing is lost.
              if (live.current) keep(false);
              if (live.current) return;
              const kept = !!act().undo && act().undo === leftEdit.current;
              if (forward.kind === 'resume') act().resumeRun(forward.runId, kept);
              else act().startRoutine(forward.routineId, kept);
            }}
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
        <T title ink size={20} style={styles.word} testID="go-plan-word">
          PLAN
        </T>
      </View>
      {/* Web: the heading ("Plan: <name>") takes the focus and is read, unless the open row has it. Native: focus is not moved, so it is always said. */}
      {(openFirst || !WEB) && <Said text={`Plan: ${v.name}`} />}
      <ScrollView ref={scroller} style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" testID="go-plan-list">
        <View ref={list} style={styles.rows}>
          {typing?.mode === 'name' ? (
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
              <Btn kind="plain" mark="more" spoken={`More for ${v.name}`} onPress={() => setMenu({ routine: true })} dataSet={{ more: '' }} testID="go-plan-more" />
            </View>
          )}
          {!!v.line && (
            <T dim style={styles.line} testID="go-plan-line">
              {v.line}
            </T>
          )}

          {shownRows.map((row, i) => {
            const key = keyOf(row.path);
            const parent = parentOf(key);
            if (row.divider) repeating.add(parent);
            const rail = repeating.has(parent);
            const open = row.kind === 'routine' && opened(row);
            const says = `${row.here ? 'Here, ' : row.within ? 'You are in this, ' : ''}${row.kind === 'wait' ? `Wait for: ${row.words}` : row.words}`;
            return (
              <View
                key={key}
                style={[styles.gap, { marginLeft: indent(row.depth) }]}
                onLayout={(e) => {
                  laid(key, 'y')(e);
                  if (row.here) hereLaid(e.nativeEvent.layout.y);
                }}>
                {row.divider && <DividerRow divider={row.divider} onMenu={() => setMenu({ divider: parent })} edit={edit} menuKey={`divider:${parent}`} onLayout={laid(key, 'div')} viewRef={(el) => { dividers.current[key] = el; }} />}
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
                      {...{ dataSet: { here: row.here ? 'true' : 'false', within: row.within ? 'true' : 'false', kind: row.kind, depth: String(row.depth), repeats: rail ? 'true' : 'false', dragging: drag?.key === key ? 'true' : 'false' } }}>
                      {/* Too narrow (large text): no grip — the words keep their room; Move up / Move down are on the menu. */}
                      {!narrow && (row.canUp || row.canDown) && <Grip words={row.words} onStart={() => { const spans = spansOf(key); dragFrom.current = spans ? { key, spans } : undefined; }} onMove={(dy) => setDrag({ key, dy, line: dropOf(key, dy)?.line })} onDrop={(dy) => drop(row, dy)} onPress={() => setMenu({ row: key })} />}
                      {row.kind === 'routine' && (
                        <Btn
                          kind="plain"
                          mark="routine"
                          spoken={`${open ? 'Close' : 'Open'} ${row.words}`}
                          expanded={open}
                          onPress={() => setFolds({ ...folds, [key]: !open })}
                          style={styles.sq}
                        />
                      )}
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
                          <T testID="go-plan-words">
                            {row.kind === 'wait' && <T dim>Wait for </T>}
                            <Chips words={row.words} />
                          </T>
                          {!!row.gives && (
                            <T dim testID="go-plan-gives">
                              {'gives '}
                              <NameChip name={row.gives} />
                            </T>
                          )}
                        </View>
                      </View>
                      <Btn kind="plain" mark="more" spoken={`More for ${row.words}`} onPress={() => setMenu({ row: key })} dataSet={{ more: key }} style={styles.sq} />
                    </View>
                  )}
                </View>
                {typing && typingAfter === i && typing.mode !== 'words' && typing.mode !== 'name' && (
                  <View style={typing.mode === 'into' ? { marginLeft: indent(typingRow!.depth + 1) - indent(row.depth) } : { marginLeft: indent(typingRow!.depth) - indent(row.depth) }}>
                    {typed(typing.mode === 'into' ? `A smaller step of ${typingRow!.words}` : `Add a step after ${typingRow!.words}`, typing.mode === 'into' ? 'A smaller step' : 'Add a step')}
                  </View>
                )}
              </View>
            );
          })}

          {drag?.line !== undefined && <View style={[styles.dropLine, { top: drag.line - 2 }]} testID="go-plan-drop" pointerEvents="none" />}

          <View ref={addBox} style={[styles.addRow, addFocused && RING]} {...{ dataSet: { typing: '' } }}>
            <View style={styles.addMark}>
              <Mark name="add" color={G.dim} />
            </View>
            <Field
              ref={addField}
              bare
              value={adding}
              onChangeText={setAdding}
              onFocus={() => setAddFocused(true)}
              onBlur={(e) => !toBar(e) && setAddFocused(false)}
              placeholder="Add a step"
              accessibilityLabel="Add a step"
              keepFocus
              onSubmitEditing={addIt}
              style={styles.addField}
              testID="go-plan-add"
            />
            {!!adding.trim() && <Btn kind="plain" label="Add" spoken="Add this step" onPress={addIt} style={styles.addBtn} />}
          </View>
        </View>
        {floor && foot}
      </ScrollView>
      {offered.length > 0 && <NamesBar names={offered} onPick={insertName} lastField={lastField} onLeave={leftBar} />}
      {!floor && foot}
    </GoScreen>
  );
}

/** "Repeat from here": a row of its own, with visible Move up / Move down and its menu (until I'm done or a number; take it out). */
function DividerRow({ divider, onMenu, edit, menuKey, onLayout, viewRef }: { divider: PlanDivider; onMenu: () => void; edit: (seq: string, e: RoutineEdit) => { ok: boolean }; menuKey: string; onLayout?: (e: LayoutChangeEvent) => void; viewRef?: (el: ViewRef | null) => void }) {
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
      <Btn kind="plain" mark="more" spoken="More for Repeat from here" onPress={onMenu} dataSet={{ more: menuKey }} style={styles.sq} />
    </View>
  );
}

interface Span {
  y: number;
  h: number;
}

/** A move this far (px) is a drag; a press right after one is the drag's own release, not a tap. */
const DRAG_PX = 8;
const AFTER_DRAG_MS = 600;
/** Web: the grip takes the touch itself (no page scroll, no text selected while dragging). */
const GRAB = WEB ? ({ touchAction: 'none', userSelect: 'none', cursor: 'grab' } as object) : null;

/**
 * P-95: a row's grip — the visible way to drag it (nothing by gesture alone). It claims the pointer
 * once it has moved DRAG_PX up or down; pressed, it is a button ("Reorder <words>") that opens the
 * row's menu, where Move up / Move down are.
 */
function Grip({ words, onStart, onMove, onDrop, onPress }: { words: string; onStart: () => void; onMove: (dy: number) => void; onDrop: (dy: number | undefined) => void; onPress: () => void }) {
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
        onPress={() => Date.now() - ended.current > AFTER_DRAG_MS && !dragging.current && onPress()}
        accessibilityRole="button"
        accessibilityLabel={`Reorder ${words}`}
        style={(state) => [styles.gripBtn, (state as { focused?: boolean }).focused && RING]}>
        <Mark name="grip" color={G.dim} />
      </Pressable>
    </View>
  );
}

/** A field typed in, in place: it has the focus from the start; Return keeps the words, leaving it keeps them too. */
function Typed({ value, label, placeholder, onChange, onSubmit, onBlur }: { value: string; label: string; placeholder?: string; onChange: (text: string) => void; onSubmit: () => void; onBlur: () => void }) {
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
    <View ref={box} {...{ dataSet: { typing: '' } }}>
      <GrowField value={value} onChangeText={onChange} onSubmit={onSubmit} onBlur={(e) => !gone.current && !toBar(e) && onBlur()} accessibilityLabel={label} placeholder={placeholder} autoFocus={!WEB} testID="go-plan-typed" />
    </View>
  );
}

/** P-96: a row's words, each `{name}` in them a chip. */
function Chips({ words }: { words: string }) {
  const parts = parseWords(words);
  if (!parts.some((p) => p.kind === 'name')) return <>{words}</>;
  return <>{parts.map((p, i) => (p.kind === 'text' ? p.text : <NameChip key={i} name={p.name} />))}</>;
}

/** P-96 audit F6: the focus is going into the names bar (a field left for it is not left). */
function toBar(e: unknown): boolean {
  const ev = e as { relatedTarget?: unknown; nativeEvent?: { relatedTarget?: unknown } } | undefined;
  const t = (ev?.relatedTarget ?? ev?.nativeEvent?.relatedTarget) as Element | null | undefined;
  return !!t && typeof t.closest === 'function' && !!t.closest('[data-testid="go-names-bar"]');
}

/**
 * P-96 (ruling 5, journey 2): the bar above the keyboard while words are typed — the names given above,
 * each inserting `{name}` at the caret. A pointer press never takes the focus from the field. From the
 * keyboard (audit F6): Alt+↓ in the field goes to the first name (Tab reaches them too); ←/→ move
 * between them; Return or Space inserts and goes back to the field; Esc goes back without inserting.
 */
function NamesBar({ names, onPick, lastField, onLeave }: { names: string[]; onPick: (name: string) => void; lastField: { current: HTMLInputElement | null }; onLeave: () => void }) {
  const box = useRef<ViewRef>(null);
  const leave = useRef(onLeave);
  useEffect(() => {
    leave.current = onLeave;
  });
  useEffect(() => {
    const el = box.current as unknown as HTMLElement | null;
    if (!WEB || !el || typeof el.addEventListener !== 'function') return;
    const isField = (t: EventTarget | null): t is HTMLInputElement => !!t && ((t as Element).tagName === 'INPUT' || (t as Element).tagName === 'TEXTAREA');
    const chips = () => Array.from(el.querySelectorAll<HTMLElement>('[data-testid="go-names-chip"]'));
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
    <View ref={box} style={styles.bar} testID="go-names-bar" role="toolbar" aria-label="Names">
      {names.map((n) => (
        <Pressable key={n} onPress={() => onPick(n)} accessibilityRole="button" accessibilityLabel={`Insert {${n}}`} style={(state) => [styles.chip, (state as { focused?: boolean }).focused && RING]} testID="go-names-chip">
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

const styles = StyleSheet.create({
  flex: { flex: 1, minHeight: 0 },
  shrink: { flexShrink: 1 },
  gap: { gap: SP.s2 },
  // The band: light, one line, in one place on every Plan screen. Home is always its last control
  // (top right); Done, at the edge only, has the slot before it. In a window too narrow for both,
  // the word goes beneath — Home does not move.
  band: { minHeight: 64, flexDirection: 'row', flexWrap: 'wrap-reverse', alignItems: 'center', justifyContent: 'flex-end', gap: SP.s2, paddingHorizontal: SP.s3, paddingVertical: SP.s2, backgroundColor: G.paper },
  word: { flexGrow: 1, letterSpacing: 1 },
  body: { flexGrow: 1, padding: SP.s3, paddingBottom: SP.s2 },
  rows: { gap: SP.s2 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: SP.s2 },
  name: { flex: 1, minWidth: 0, paddingVertical: SP.s2 + 2 },
  line: { marginBottom: SP.s2 },
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
  addMark: { width: 24, marginLeft: SP.s3 - 4, alignItems: 'center' },
  // Too narrow for the words and Add on one line (large text): Add goes beneath, at the end.
  addBtn: { minWidth: TARGET + SP.s3, justifyContent: 'center', marginLeft: 'auto' },
  addField: { flex: 1, minWidth: 96, paddingHorizontal: SP.s2 },
  foot: { paddingHorizontal: SP.s3, paddingBottom: SP.s3, paddingTop: SP.s1 },
  // The side doors: two halves, left and right, always in the same places (P-96).
  doors: { flexDirection: 'row', gap: SP.s2, paddingHorizontal: SP.s3, paddingTop: SP.s1, paddingBottom: SP.s2 },
  door: { flexGrow: 1, flexShrink: 1, flexBasis: 0 },
  bar: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.s2, paddingHorizontal: SP.s3, paddingVertical: SP.s2, backgroundColor: G.surf, borderTopWidth: 2, borderTopColor: G.line },
  chip: { minHeight: TARGET, minWidth: TARGET, justifyContent: 'center', paddingHorizontal: SP.s3, borderWidth: 2, borderColor: G.line, backgroundColor: G.surf2 },
  forward: { minHeight: 56 },
  // As tall as the filled button and the room its shadow keeps.
  emptySlot: { minHeight: 60 },
});
