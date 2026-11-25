/**
 * B-12 (P-90): Plan — the sequence, not the step. Its own surface, unmistakably not the runner: a light
 * band pinned at the top with the word and Home in one fixed place; the routine's name as the heading;
 * "planning · at <step>"; the steps as outlined rows with the one you were on marked HERE; "Repeat
 * from here" as a row with visible Move up / Move down; "Add a step". Everything structural is here
 * and only here, and a change made here changes the routine (the owner's decision), with an Undo that
 * stays until the next action. The ONE filled button is "Resume at <step>" (Start for something never
 * run), which goes back exactly where you were. Nothing here says Next; Done exists only at the edge,
 * in its own slot beside Home.
 *
 * The route follows the data and writes nothing — but for one case: a run the build before left at
 * the edge with this-run changes is folded into its routine on arriving (`planView().unfolded`), once,
 * with its notice and Undo. That Undo, at the edge, leaves the run in Plan by the data (nothing can run
 * there) with its changes back: the rows would be the run's reading and the edits the routine's, so
 * this screen leaves for home instead (Plan opened again folds again, saying so).
 */
import { router, useIsFocused } from 'expo-router';
import { ComponentRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { RoutineEdit } from '@/domain/run';
import { PlanDivider, PlanRow, planView, runRoute } from '@/domain/runView';
import { useStore } from '@/store/useStore';

import { Mark } from './marks';
import { Notice, useRunUndo } from './Notice';
import { Repeat } from './Repeat';
import { goHome } from './Runner';
import { readDraft, writeDraft } from './session';
import { G, SP, TARGET } from './tokens';
import { Btn, caretToEnd, Field, focusOn, focusSoon, GoScreen, GrowField, H1, InputRef, Said, Sheet, T, TextRef, useKeys, useVisibleHeight, ViewRef } from './ui';

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

type Menu = { row: string } | { divider: string } | { routine: true };

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
  /** Routines opened or closed by hand (by row key); the rest follow `opened`. */
  const [folds, setFolds] = useState<Record<string, boolean>>({});

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
    else if (route === 'paused') router.replace(`/go/run/${runOf}/paused`);
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
  const menuDivider = menu && 'divider' in menu ? (menu.divider === '' ? v.divider : v.rows.find((r) => r.divider && parentOf(keyOf(r.path)) === menu.divider)?.divider) : undefined;
  const startTyping = (t: Typing) => {
    close();
    setNameTaken(false);
    setTyping(t);
  };

  const layer = menuRow ? (
    <Sheet title={menuRow.words} onClose={close} testID="go-plan-menu" fallback={title}>
      {(menuRow.kind !== 'routine' || menuRow.broken) && <Btn kind="plain" label="Change the words" onPress={() => startTyping({ mode: 'words', path: keyOf(menuRow.path), text: menuRow.words })} />}
      <Btn kind="plain" label="Add a step after" onPress={() => startTyping({ mode: 'after', path: keyOf(menuRow.path), text: '' })} />
      {menuRow.kind === 'step' && <Btn kind="plain" label="Break it down" onPress={() => startTyping({ mode: 'into', path: keyOf(menuRow.path), text: '' })} />}
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
      <Btn kind="plain" label={`Ends here: ${v.open ? 'Off' : 'On'}`} pressed={!v.open} onPress={() => edit(v.routineId, { kind: 'open', open: !v.open })} />
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
      {forward && (
        <View style={styles.foot}>
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
        </View>
      )}
    </>
  );

  return (
    <GoScreen testID="go-plan" layer={layer}>
      <View style={styles.band} testID="go-plan-band">
        <T title ink size={20} style={styles.word} testID="go-plan-word">
          PLAN
        </T>
        {v.canDone && <Btn ink label="Done" spoken={`Done with ${v.name}`} onPress={() => v.runId && act().doneLevel(v.runId)} testID="go-plan-done" />}
        <Btn ink label="Home" onPress={goHome} testID="go-plan-home" />
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
                onLayout={row.here ? (e) => hereLaid(e.nativeEvent.layout.y) : undefined}>
                {row.divider && <DividerRow divider={row.divider} onMenu={() => setMenu({ divider: parent })} edit={edit} menuKey={`divider:${parent}`} />}
                <View style={rail && styles.rail}>
                  {typing?.mode === 'words' && typing.path === key ? (
                    typed(row.kind === 'wait' ? `Wait for: ${row.words}` : `Step: ${row.words}`)
                  ) : (
                    <View
                      ref={row.here ? hereRow : undefined}
                      style={[styles.row, row.here && styles.rowHere]}
                      role="group"
                      aria-label={says}
                      accessibilityLabel={says}
                      testID="go-plan-row"
                      {...{ dataSet: { here: row.here ? 'true' : 'false', within: row.within ? 'true' : 'false', kind: row.kind, depth: String(row.depth), repeats: rail ? 'true' : 'false' } }}>
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
                        <T style={narrow ? styles.wordsNarrow : styles.words} testID="go-plan-words">
                          {row.kind === 'wait' && <T dim>Wait for </T>}
                          {row.words}
                        </T>
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
              onBlur={() => setAddFocused(false)}
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
      {!floor && foot}
    </GoScreen>
  );
}

/** "Repeat from here": a row of its own, with visible Move up / Move down and its menu (until I'm done or a number; take it out). */
function DividerRow({ divider, onMenu, edit, menuKey }: { divider: PlanDivider; onMenu: () => void; edit: (seq: string, e: RoutineEdit) => { ok: boolean }; menuKey: string }) {
  const times = divider.repeat;
  return (
    <View style={styles.divider} role="group" aria-label="Repeat from here" accessibilityLabel="Repeat from here" testID="go-plan-divider" {...{ dataSet: { from: String(divider.from) } }}>
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
      <GrowField value={value} onChangeText={onChange} onSubmit={onSubmit} onBlur={() => !gone.current && onBlur()} accessibilityLabel={label} placeholder={placeholder} autoFocus={!WEB} testID="go-plan-typed" />
    </View>
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
  forward: { minHeight: 56 },
});
