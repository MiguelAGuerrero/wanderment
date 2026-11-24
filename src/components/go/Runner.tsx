/**
 * B-11 slice 1 (P-86): the runner — the step and nothing else (B-11 §3.1, §9b, §9c).
 *
 * A column exactly as tall as what is visible: the context line (the level, its parent, Done) · the
 * note, centred in whatever room is left and never larger than it · the notice · the handle · Pause,
 * Break it down / Step in, and Next. Nothing is positioned over anything else but the pull-up panel
 * (over the note only) and a sheet (over everything). The three buttons never move.
 *
 * The route follows the run: paused → the paused screen; ended, left or gone → home.
 */
import { router, useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { NOTE_PAD, NOTE_SIZES, noteType } from '@/domain/goText';
import { panelView, routineHue, runnerView, RunnerView, sinceWords } from '@/domain/runView';
import { useStore } from '@/store/useStore';

import { Mark } from './marks';
import { KeepSheet, Notice, useRunUndo } from './Notice';
import { decideWhere, readDraft, writeDraft } from './session';
import { face, G, hueOf, SP, TARGET } from './tokens';
import { Btn, caretToEnd, Field, focusOn, focusSoon, GoScreen, hard, HiddenH1, InputRef, Sheet, T, useBackCloses, useKeys, useVisibleHeight, ViewRef } from './ui';

const WEB = Platform.OS === 'web';
const SHADOW = 10;
const GUTTER = 16;
/** The note never gets smaller than this (the runner scrolls instead). */
const NOTE_FLOOR = 96;
/** A press this soon after a drag is the drag's own mouse-up, not a tap. */
const AFTER_DRAG_MS = 600;

/** Home, from any `/go` screen: back to it when it is beneath, else in its place. Never a redirect from there. */
export function goHome() {
  decideWhere();
  if (router.canGoBack()) router.back();
  else router.replace('/go');
}

export function Runner({ runId }: { runId: string }) {
  const data = useStore((s) => s.data);
  const offer = useStore((s) => s.runOffer);
  const act = useStore.getState;
  const v = runnerView(data, runId);
  const running = v?.status === 'running';
  const focused = useIsFocused();

  const [panel, setPanel] = useState(false);
  // Break it down is opened ON a step, and stays that step's whatever the run does meanwhile.
  const [sheet, setSheet] = useState<{ break: BreakTarget } | { keep: string[] } | null>(null);
  const stepKey = v ? `${v.step.seq}:${v.step.itemId ?? ''}` : '';
  const wordsKey = `words:${runId}:${stepKey}`;
  // Rewording that a reload interrupted is taken up again, with its words.
  const [editing, setEditing] = useState(() => !!readDraft(wordsKey));
  const note = useRef<ViewRef>(null);
  const handle = useRef<ViewRef>(null);
  const keepOffer = focused && offer && offer.runId === runId ? offer.changeIds : undefined;
  const covered = !!sheet || !!keepOffer;

  // The route follows the run. Whatever is open is put away first (it would hold the screen).
  const status = v?.status;
  useEffect(() => {
    // Only the screen in front moves (one beneath another would move that one instead).
    if (running || !focused) return;
    if (status === 'paused') router.replace(`/go/run/${runId}/paused`);
    else goHome();
  }, [running, focused, status, runId]);

  const closePanel = () => {
    setPanel(false);
    focusOn(handle);
  };
  // Open things hold the screen only while the run is running here (else the route is about to follow it).
  useBackCloses(focused && running && panel && !covered, closePanel);

  const toNote = () => later(note);
  // On arrival (a start, Resume, a Jump, Undo from home, back from See it all, a reload): the note —
  // or, when the note is a field (the edge of a goal, rewording), that field.
  const atEdge = v?.step.kind === 'edge';
  useEffect(() => {
    if (focused) later(note);
  }, [focused, atEdge]);

  // A new step: nothing is being reworded any more.
  const [seenStep, setSeenStep] = useState(stepKey);
  if (seenStep !== stepKey) {
    setSeenStep(stepKey);
    setEditing(false);
  }

  const [edge, setEdge] = useState(() => readDraft(`edge:${runId}`));
  const typeEdge = (text: string) => {
    setEdge(text);
    writeDraft(`edge:${runId}`, text);
  };

  const next = () => {
    if (!v) return;
    if (v.next === 'edge') {
      if (!edge.trim()) return;
      // Refused while reconnecting: the words stay in the field.
      if (act().addEdgeStep(runId, edge).ok) {
        typeEdge('');
        toNote();
      }
      return;
    }
    act().nextStep(runId);
  };
  const done = () => {
    setPanel(false);
    act().doneLevel(runId);
    toNote();
  };
  const pause = () => {
    setPanel(false);
    act().pauseRun(runId);
  };
  // Little room (the keyboard up, large text): everything but the note gives a little, so the note keeps more.
  const seen = useVisibleHeight();
  const tight = !!seen && seen.height < 600;
  const narrow = useWindowDimensions().width < 260;
  const can = useRunUndo();
  const undo = () => {
    if (!can) return;
    can.undo();
    toNote();
  };

  useKeys(
    focused && running && !covered,
    {
      // Return while the note has the focus is Next. No letter is a shortcut (see `useKeys`).
      Enter: next,
      'mod+z': undo,
      Escape: () => {
        if (editing) {
          writeDraft(wordsKey, '');
          setEditing(false);
          toNote();
        } else if (panel) closePanel();
      },
    },
    true,
  );

  if (!v || !running) return <GoScreen testID="go-runner" settled={false}>{null}</GoScreen>;

  const hue = hueOf(routineHue(data, v.routineId));
  const layer =
    sheet && 'break' in sheet ? (
      <BreakSheet runId={runId} target={sheet.break} hue={hue} onClose={() => setSheet(null)} onDone={toNote} />
    ) : sheet ? (
      <KeepSheet runId={runId} ids={sheet.keep} onClose={() => setSheet(null)} />
    ) : keepOffer ? (
      <KeepSheet runId={runId} ids={keepOffer} onClose={act().dismissRunOffer} />
    ) : null;

  return (
    <GoScreen testID="go-runner" layer={layer}>
      <HiddenH1>{v.level}</HiddenH1>
      {/* With almost no room (large text AND the keyboard up) the column scrolls before anything goes: the note keeps a least size. */}
      <ScrollView style={styles.column} contentContainerStyle={styles.columnBody} keyboardShouldPersistTaps="handled" testID="go-column">
      <View style={styles.context}>
        <Pressable
          onPress={() => {
            setPanel(false);
            router.push(`/go/run/${runId}/all`);
          }}
          accessibilityRole="button"
          // Web: its name is its own words (the parent, the level) and then what it does, said but not shown.
          {...(!WEB && { accessibilityLabel: `${v.parent ? `${v.parent}, ` : ''}${v.level}. See it all` })}
          testID="go-context"
          style={(state) => [styles.contextWords, (state as { focused?: boolean }).focused && RING]}>
          {!!v.parent && <T dim numberOfLines={1}>{v.parent}</T>}
          <T bold size={18} numberOfLines={tight || v.parent ? 1 : 2}>
            {v.level}
          </T>
          {WEB && <Text style={styles.said}>See it all</Text>}
        </Pressable>
        <Btn label="Done" spoken={`Done with ${v.level}`} onPress={done} style={styles.done} testID="go-done" />
      </View>

      <NoteArea
        view={v}
        hue={hue}
        noteRef={note}
        edge={edge}
        onEdge={typeEdge}
        onNext={next}
        editing={editing}
        draftKey={wordsKey}
        onEdited={(text) => {
          if (text === undefined || act().changeWords(runId, text).ok) {
            writeDraft(wordsKey, '');
            setEditing(false);
            toNote();
          }
        }}
        panelOpen={panel}
        onPanel={(open) => (open ? setPanel(true) : closePanel())}
        panel={
          panel ? (
            <Panel
              runId={runId}
              onClose={closePanel}
              onUndo={undo}
              onEdit={() => {
                setPanel(false);
                setEditing(true);
              }}
              onKeep={(ids) => {
                setPanel(false);
                if (ids.length === 1) act().keepChange(runId, ids[0]);
                else setSheet({ keep: ids });
              }}
              onMoved={() => {
                setPanel(false);
                toNote();
              }}
            />
          ) : null
        }
        notice={<Notice onUndone={toNote} reserve />}
        tray={(full) => (
          <>
            <Handle ref={handle} open={panel} onToggle={() => (panel ? closePanel() : setPanel(true))} onSwipe={(up) => (up ? setPanel(true) : closePanel())} />
            <View style={[styles.tray, tight && styles.trayTight]}>
              <View style={styles.trayRow}>
                <Btn mark="pause" spoken="Pause" onPress={pause} testID="go-pause" />
                {v.middle === 'stepIn' ? (
                  <Btn
                    label="Step in"
                    spoken={`Step in: ${v.step.words}`}
                    style={styles.grow}
                    testID="go-middle"
                    onPress={() => {
                      setPanel(false);
                      act().stepIn(runId);
                      toNote();
                    }}
                  />
                ) : (
                  <Btn
                    label="Break it down"
                    spoken={full && v.middle === 'break' ? 'Break it down. This step is long' : undefined}
                    // The quiet mark for a long step. In a narrow window it sits in the button's corner
                    // (below), so the words keep to two lines and the buttons stay in view.
                    mark={full && v.middle === 'break' && !narrow ? 'split' : undefined}
                    disabled={v.middle !== 'break'}
                    style={styles.grow}
                    testID="go-middle"
                    dataSet={{ marked: full && v.middle === 'break' ? 'true' : 'false' }}
                    onPress={() => {
                      setPanel(false);
                      if (v.step.itemId) setSheet({ break: { seq: v.step.seq, item: v.step.itemId, words: v.step.words } });
                    }}
                  />
                )}
                {narrow && full && v.middle === 'break' && (
                  <View style={styles.cornerMark} pointerEvents="none">
                    <Mark name="split" size={16} color={G.text} />
                  </View>
                )}
              </View>
              <Btn
                kind="filled"
                label={v.next === 'itsHappened' ? 'It’s happened' : 'Next'}
                spoken={v.next === 'itsHappened' ? `It’s happened: ${v.step.words}` : undefined}
                markAfter={v.next === 'itsHappened' ? undefined : 'forward'}
                disabled={v.next === 'edge' && !edge.trim()}
                onPress={next}
                size={18}
                style={styles.next}
                testID="go-next"
              />
            </View>
          </>
        )}
      />
      </ScrollView>
    </GoScreen>
  );
}

/** The step Break it down was opened on. */
interface BreakTarget {
  seq: string;
  item: string;
  words: string;
}

/** After this render: focus (what it goes to may only just be there). */
const later = (ref: { current: unknown }) => focusSoon(ref);

const RING = WEB ? ({ outlineStyle: 'solid', outlineWidth: 2, outlineColor: G.focus, outlineOffset: 3 } as object) : null;

/**
 * A vertical swipe that starts here: up opens, down closes. It claims the touch only once it has
 * moved 8 px and more down-or-up than sideways; a twitch is neither, and a press right after a drag
 * is the drag's own release, not a tap.
 */
function useSwipe(on: boolean, onSwipe: (up: boolean) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(0);
  type Touch = { nativeEvent: { pageX: number; pageY: number } };
  const moved = (e: Touch) => (start.current ? { dx: e.nativeEvent.pageX - start.current.x, dy: e.nativeEvent.pageY - start.current.y } : { dx: 0, dy: 0 });
  return {
    handlers: {
      onStartShouldSetResponderCapture: (e: Touch) => {
        start.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
        return false;
      },
      onMoveShouldSetResponder: (e: Touch) => {
        const { dx, dy } = moved(e);
        return on && Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx);
      },
      onResponderRelease: (e: Touch) => {
        const { dy } = moved(e);
        dragged.current = Date.now();
        start.current = null;
        if (Math.abs(dy) >= 24) onSwipe(dy < 0);
      },
      onResponderTerminate: () => {
        dragged.current = Date.now();
        start.current = null;
      },
    },
    justDragged: () => Date.now() - dragged.current < AFTER_DRAG_MS,
    /** A press that ended away from where it began was a drag (a scroll, a selection), not a tap. */
    wasDrag: (e?: { nativeEvent?: { pageX?: number; pageY?: number } }) => {
      const at = start.current;
      const x = e?.nativeEvent?.pageX;
      const y = e?.nativeEvent?.pageY;
      return !!at && typeof x === 'number' && typeof y === 'number' && Math.hypot(x - at.x, y - at.y) > 8;
    },
  };
}

/** The handle bar: the visible, keyboard-reachable way to the panel (nothing by gesture alone). */
function Handle({ open, onToggle, onSwipe, ref }: { open: boolean; onToggle: () => void; onSwipe: (up: boolean) => void; ref: React.Ref<ViewRef> }) {
  const swipe = useSwipe(true, onSwipe);
  return (
    <View {...swipe.handlers}>
      <Pressable
        ref={ref}
        onPress={() => !swipe.justDragged() && onToggle()}
        accessibilityRole="button"
        accessibilityLabel="More about this step"
        aria-expanded={open}
        accessibilityState={{ expanded: open }}
        testID="go-handle"
        style={(state) => [styles.handleBtn, (state as { focused?: boolean }).focused && RING]}>
        <View style={styles.handle} />
      </Pressable>
    </View>
  );
}

interface NoteAreaProps {
  view: RunnerView;
  hue: { c: string; d: string };
  noteRef: React.RefObject<ViewRef | null>;
  edge: string;
  onEdge: (text: string) => void;
  onNext: () => void;
  editing: boolean;
  /** Where the words being retyped are kept across a reload. */
  draftKey: string;
  /** The reworded step, or undefined when rewording was left. */
  onEdited: (text?: string) => void;
  panelOpen: boolean;
  onPanel: (open: boolean) => void;
  panel: React.ReactNode;
  /** The notice's slot: in the flow under the note (the panel, when open, is over both). */
  notice: React.ReactNode;
  /** What stands under the note; it is told whether the note is full. */
  tray: (full: boolean) => React.ReactNode;
}

/**
 * The note in the room it has. It is a square, as large as the room allows up to its own size, with
 * a margin; the type steps down with the words (`noteType`), and if what is drawn is still taller
 * than the note the type steps down again, to "full": edge to edge, scrolling inside, never clipped.
 */
function NoteArea({ view: v, hue, noteRef, edge, onEdge, onNext, editing, draftKey, onEdited, panelOpen, onPanel, panel, notice, tray }: NoteAreaProps) {
  const { fontScale } = useWindowDimensions();
  const [room, setRoom] = useState<{ w: number; h: number } | undefined>();
  const [draft, setDraftText] = useState(() => readDraft(draftKey) || v.step.words);
  const setDraft = (text: string) => {
    setDraftText(text);
    writeDraft(draftKey, text);
  };
  const field = useRef<InputRef>(null);
  const atEdge = v.step.kind === 'edge';
  const typed = atEdge ? edge : editing ? draft : undefined;
  // As on first run: "A first small step"; after that, the next one.
  const ask = v.canBack ? 'The next small step' : 'A first small step';
  const words = typed !== undefined ? typed || ask : v.step.words;

  // A margin above and below, as much as the room affords (the keyboard up, large text: less, never none).
  const margin = !room || room.h >= 300 ? SP.s4 : room.h >= 180 ? SP.s3 - 4 : SP.s1;
  const side = room ? Math.max(0, Math.floor(Math.min(256, room.w - GUTTER * 2 - SHADOW, room.h - margin * 2 - SHADOW))) : 0;
  const guess = noteType(words, side, fontScale);
  // What was drawn was taller than the note: one step smaller, for these words in this room.
  const key = `${words}|${side}`;
  const [bump, setBump] = useState({ key, n: 0 });
  const n = bump.key === key ? bump.n : 0;
  const level = Math.min(NOTE_SIZES.length, (guess.full ? NOTE_SIZES.length : NOTE_SIZES.indexOf(guess.size)) + n);
  const full = level >= NOTE_SIZES.length;
  const size = NOTE_SIZES[Math.min(level, NOTE_SIZES.length - 1)];
  const pad = full ? SP.s2 : side < 160 ? SP.s2 + 4 : NOTE_PAD;
  const inner = side - pad * 2 - (v.step.kind === 'wait' ? 4 : 0);
  const wait = v.step.kind === 'wait';
  const head = wait || v.step.kind === 'routine' ? 28 : 0;

  const seen = useVisibleHeight();
  const floor = !!seen && seen.height < 400;
  const swipe = useSwipe(!full && typed === undefined, (up) => onPanel(up));
  const tap = (e?: { nativeEvent?: { pageX?: number; pageY?: number } }) => {
    if (typed !== undefined || swipe.justDragged() || swipe.wasDrag(e)) return;
    onPanel(!panelOpen);
  };

  // The edge asks at once: the field has the focus (and, on a phone, the keyboard).
  // (The field is only drawn once the note's room is known: the focus waits for that.)
  const ready = !!room && side > 0;
  useEffect(() => {
    if (!(atEdge || editing) || !ready) return;
    setTimeout(() => {
      const el = field.current as unknown as HTMLElement | null;
      // Already there (and maybe being typed in): the caret is left where the person has it.
      if (!el || (WEB && document.activeElement === el)) return;
      field.current?.focus();
      caretToEnd(el);
    }, 0);
  }, [atEdge, editing, ready]);
  const [wasEditing, setWasEditing] = useState(editing);
  if (wasEditing !== editing) {
    setWasEditing(editing);
    if (editing) setDraftText(readDraft(draftKey) || v.step.words);
  }

  const color = wait ? G.text : G.ink;
  const text = { fontSize: size * 1, lineHeight: Math.round(size * 1.25), color, fontFamily: face.words };
  const body =
    typed !== undefined ? (
      <Field
        ref={field}
        bare
        ink={!wait}
        multiline
        size={size}
        value={typed}
        onChangeText={atEdge ? onEdge : setDraft}
        placeholder={ask}
        accessibilityLabel={atEdge ? ask : 'Change the words'}
        submitBehavior="submit"
        onSubmitEditing={() => (atEdge ? onNext() : onEdited(draft))}
        onKeyPress={(e) => {
          // Return adds or keeps (never a new line in a step).
          if (e.nativeEvent.key === 'Enter') {
            e.preventDefault();
            if (atEdge) onNext();
            else onEdited(draft);
          }
        }}
        onBlur={() => !atEdge && editing && draft.trim() && draft.trim() !== v.step.words && onEdited(draft)}
        testID="go-note-field"
        style={[styles.noteField, { height: Math.max(TARGET, inner - head) }]}
      />
    ) : full ? (
      // It scrolls, so it can be reached and scrolled from the keyboard; Return there is still Next.
      <ScrollView style={{ maxHeight: inner - head }} testID="go-note-scroll" {...(WEB && ({ tabIndex: 0, dataSet: { return: 'true' } } as object))}>
        <NoteWords style={text} selectable>
          {v.step.words}
        </NoteWords>
      </ScrollView>
    ) : (
      <View
        style={styles.noteWords}
        onLayout={(e) => {
          // Taller than the room inside the note: step the type down (bounded: at most to "full").
          if (inner > 0 && e.nativeEvent.layout.height > inner - head + 1) setBump({ key, n: n + 1 });
        }}>
        <NoteWords style={text}>{v.step.words}</NoteWords>
      </View>
    );

  const noteBox = (
    <View
      ref={noteRef}
      testID="go-note"
      role="group"
      aria-label={wait ? `Wait for: ${v.step.words}` : atEdge ? ask : v.step.words}
      {...(WEB && ({ tabIndex: 0, onClick: tap } as object))}
      {...{ dataSet: { size: String(size), full: full ? 'true' : 'false', kind: v.step.kind, moving: 'false', return: 'true' } }}
      style={[
        styles.note,
        { width: side, height: side, padding: pad },
        wait ? { backgroundColor: G.bg, borderWidth: 2, borderColor: hue.c } : { backgroundColor: hue.c },
        hard(SHADOW, hue.d),
        WEB && ({ outlineColor: G.focus, outlineOffset: 3 } as object),
      ]}>
      {wait && (
        <View style={styles.noteHead}>
          <Mark name="wait" color={hue.c} />
          <T bold color={hue.c}>
            Wait for
          </T>
        </View>
      )}
      {v.step.kind === 'routine' && (
        <View style={styles.noteHead}>
          <Mark name="routine" color={G.ink} />
        </View>
      )}
      <View style={styles.noteBody} aria-live="polite">
        {body}
      </View>
      {v.lastOfRound && (
        <View style={styles.corner} role="img" aria-label="Last step of this round" accessibilityRole="image" accessibilityLabel="Last step of this round" testID="go-last">
          <Mark name="corner" size={22} color={wait ? hue.c : G.ink} />
        </View>
      )}
    </View>
  );

  return (
    <>
      <View style={styles.upper}>
        <View style={[styles.area, floor && styles.areaFloor]} onLayout={(e) => setRoom({ w: Math.round(e.nativeEvent.layout.width), h: Math.round(e.nativeEvent.layout.height) })} testID="go-note-area" {...swipe.handlers}>
          {room && side > 0 && (WEB ? noteBox : <Pressable onPress={() => tap()} accessible={false}>{noteBox}</Pressable>)}
        </View>
        {notice}
        {panel && (
          <>
            <Pressable style={[StyleSheet.absoluteFill, styles.dim]} onPress={() => onPanel(false)} accessible={false} focusable={false} {...(WEB && ({ tabIndex: -1, 'aria-hidden': true } as object))} />
            {panel}
          </>
        )}
      </View>
      {tray(full && typed === undefined)}
    </>
  );
}

/** The step's words. Not selectable unless the note scrolls: a drag over them is the swipe that opens the panel. */
function NoteWords({ children, style, selectable = false }: { children: string; style: object; selectable?: boolean }) {
  return (
    <Text selectable={selectable} style={[styles.words, style, WEB && ({ overflowWrap: 'anywhere' } as object)]} testID="go-note-words">
      {children}
    </Text>
  );
}

interface PanelProps {
  runId: string;
  onClose: () => void;
  onUndo: () => void;
  onEdit: () => void;
  onKeep: (ids: string[]) => void;
  /** The run moved (Back to): the panel goes, the note has the focus. */
  onMoved: () => void;
}

/**
 * The pull-up panel (B-11 §3.2): where you are in this run (the round, last step of the round, then,
 * this run only), then the actions. Over the note only; the three buttons stay where they are and
 * keep working. The round is said here and nowhere else.
 */
function Panel({ runId, onClose, onUndo, onEdit, onKeep, onMoved }: PanelProps) {
  const data = useStore((s) => s.data);
  const p = panelView(data, runId);
  // The notice (and its Undo) is under the panel while it is open: the same Undo is a row here.
  const can = useRunUndo();
  const first = useRef<ViewRef>(null);
  useEffect(() => {
    setTimeout(() => focusOn(first), 0);
  }, []);
  if (!p) return null;
  const round = p.round ? `Round ${p.round.n}${p.round.of ? ` of ${p.round.of}` : ''}` : undefined;
  const where = [round, p.lastOfRound && 'Last step of the round', p.then && `then: ${p.then}`, p.thisRunOnly && 'This run only'].filter(Boolean);
  return (
    <View style={styles.panel} role="region" aria-label="More about this step" testID="go-panel" {...{ dataSet: { moving: 'false' } }}>
      <ScrollView contentContainerStyle={styles.panelBody} keyboardShouldPersistTaps="handled">
        <View ref={first} style={styles.where} {...(WEB && ({ tabIndex: -1 } as object))} testID="go-where">
          {!!p.reason && (
            <View style={styles.line} testID="go-panel-reason">
              <Mark name="pause" color={G.dim} />
              <T style={styles.shrink}>{p.reason}</T>
            </View>
          )}
          {round && (
            <View style={styles.line}>
              <Mark name="repeat" color={G.text} />
              <T bold>{round}</T>
            </View>
          )}
          {p.lastOfRound && (
            <View style={styles.line}>
              <Mark name="corner" size={20} color={G.text} />
              <T>Last step of the round</T>
            </View>
          )}
          {!!p.then && (
            <View style={styles.line}>
              <Mark name="forward" color={G.dim} />
              <T style={styles.shrink}>
                <T dim>then: </T>
                {p.then}
              </T>
            </View>
          )}
          {p.wait && (
            <View style={styles.line}>
              <Mark name="wait" color={G.dim} />
              <T style={styles.shrink}>
                <T dim>waiting for </T>
                {p.wait.words}
                {p.wait.since ? <T dim>{` · since ${sinceWords(p.wait.since)}`}</T> : null}
              </T>
            </View>
          )}
          {p.thisRunOnly && <T style={styles.only}>This run only</T>}
          {where.length === 0 && !p.wait && <View style={styles.rule} />}
        </View>
        {p.keepIn && <Btn label={`Keep in ${p.keepIn.name}`} onPress={() => onKeep(p.keepIn!.changes.map((c) => c.id))} testID="go-keep-in" />}
        {can && <Btn kind="plain" mark="undo" label={`Undo ${can.label}`} onPress={onUndo} />}
        {p.canChangeWords && <Btn kind="plain" mark="pencil" label="Change the words" onPress={onEdit} />}
        {p.backTo !== undefined && (
          <Btn
            kind="plain"
            mark="backStep"
            label={`Back to ${p.backTo}`}
            onPress={() => {
              useStore.getState().backTo(runId);
              onMoved();
            }}
          />
        )}
        <Btn
          kind="plain"
          mark="jump"
          label="Jump to…"
          onPress={() => {
            onClose();
            router.push(`/go/run/${runId}/jump`);
          }}
        />
        <Btn
          kind="plain"
          mark="lines"
          label="See it all"
          onPress={() => {
            onClose();
            router.push(`/go/run/${runId}/all`);
          }}
        />
      </ScrollView>
    </View>
  );
}

/**
 * Break it down (B-11 §3.1, J05): a sheet over an untouched runner. Each line typed is a smaller
 * step; Return adds it; Step in makes them this run's own sequence and runs the first. What is typed
 * stays if the sheet is closed, or the tab reloaded.
 */
function BreakSheet({ runId, target, hue, onClose, onDone }: { runId: string; target: BreakTarget; hue: { c: string; d: string }; onClose: () => void; onDone: () => void }) {
  const key = `break:${runId}:${target.item}`;
  const [steps, setSteps] = useState<string[]>(() => {
    try {
      const had: unknown = JSON.parse(readDraft(key) || '[]');
      return Array.isArray(had) ? had.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  });
  const [text, setText] = useState(() => readDraft(`${key}:typing`));
  const field = useRef<InputRef>(null);
  const keep = (list: string[], typing: string) => {
    setSteps(list);
    setText(typing);
    writeDraft(key, list.length ? JSON.stringify(list) : '');
    writeDraft(`${key}:typing`, typing);
  };
  const add = () => {
    const words = text.trim().replace(/\s+/g, ' ');
    if (words) keep([...steps, words], '');
    field.current?.focus();
  };
  const all = [...steps, text].map((x) => x.trim()).filter(Boolean);
  return (
    <Sheet title={target.words} onClose={onClose} testID="go-break">
      {steps.map((words, i) => (
        <View key={`${i}:${words}`} style={[styles.block, { backgroundColor: hue.c }, hard(4, hue.d)]} testID="go-break-step">
          <T ink bold style={styles.blockWords}>
            {words}
          </T>
          <Btn kind="plain" ink mark="close" spoken={`Remove ${words}`} onPress={() => keep(steps.filter((_, j) => j !== i), text)} />
        </View>
      ))}
      <View style={styles.addRow}>
        <View style={styles.addMark}>
          <Mark name="add" color={G.dim} />
        </View>
        <Field
          ref={field}
          bare
          value={text}
          onChangeText={(t) => keep(steps, t)}
          placeholder="A smaller step"
          accessibilityLabel="A smaller step"
          keepFocus
          onSubmitEditing={add}
          returnKeyType="next"
          style={styles.addField}
          {...{ dataSet: { first: 'true' } }}
        />
        <Btn kind="plain" mark="return" spoken="Add this step" disabled={!text.trim()} onPress={add} />
      </View>
      <Btn
        kind="filled"
        label="Step in"
        disabled={!all.length}
        testID="go-break-in"
        onPress={() => {
          // To the step it was opened on, wherever the run is by now. Refused (reconnecting): the sheet and what is typed stay.
          if (!useStore.getState().breakDown(runId, all, { seq: target.seq, item: target.item }).ok) return;
          keep([], '');
          onClose();
          onDone();
        }}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  grow: { flexGrow: 1, flexShrink: 1, flexBasis: 0 },
  shrink: { flexShrink: 1 },
  context: { flexDirection: 'row', alignItems: 'stretch', marginHorizontal: GUTTER, marginTop: SP.s2, borderWidth: 2, borderColor: G.line },
  // Tall enough for a parent and a level, always: the note does not move when a level is entered.
  contextWords: { flex: 1, minWidth: 0, minHeight: 56, justifyContent: 'center', paddingHorizontal: SP.s3 - 4, paddingVertical: SP.s1 },
  done: { borderWidth: 0, borderLeftWidth: 2, minWidth: 64 },
  // …below that (large text AND the keyboard up) the note keeps a 96 px floor and the column scrolls instead.
  areaFloor: { minHeight: NOTE_FLOOR + SHADOW + SP.s1 * 2 },
  column: { flex: 1, minHeight: 0 },
  columnBody: { flexGrow: 1 },
  upper: { flex: 1 },
  // Down to a 195×422 window everything fits without scrolling and the note takes what is left (never nothing)…
  area: { flex: 1, minHeight: 64, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  note: { justifyContent: 'center', marginRight: SHADOW, marginBottom: SHADOW },
  noteHead: { flexDirection: 'row', alignItems: 'center', gap: SP.s2, height: 28 },
  noteBody: { flex: 1, minHeight: 0, justifyContent: 'center' },
  noteWords: { alignSelf: 'stretch' },
  noteField: { alignSelf: 'stretch', paddingVertical: 0, minHeight: 0, textAlignVertical: 'center', fontWeight: '600' },
  words: { fontWeight: '600' },
  corner: { position: 'absolute', right: 0, bottom: 0, width: 22, height: 22 },
  dim: { backgroundColor: 'rgba(0,0,0,0.55)' },
  handleBtn: { minHeight: TARGET, alignItems: 'center', justifyContent: 'center', borderTopWidth: 2, borderTopColor: G.surf2, backgroundColor: G.surf },
  handle: { width: 48, height: 6, backgroundColor: G.dim },
  tray: { backgroundColor: G.surf, paddingHorizontal: GUTTER, paddingBottom: SP.s3, gap: SP.s2 },
  trayTight: { paddingBottom: SP.s2 },
  cornerMark: { position: 'absolute', right: 4, top: 4 },
  said: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0, fontSize: 16 },
  trayRow: { flexDirection: 'row', gap: SP.s2 },
  next: { minHeight: 56 },
  panel: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '100%', backgroundColor: G.surf, borderTopWidth: 2, borderTopColor: G.text },
  panelBody: { paddingHorizontal: GUTTER, paddingTop: SP.s3, paddingBottom: SP.s2, gap: SP.s1 },
  where: { gap: SP.s1, paddingBottom: SP.s2, ...(WEB && ({ outlineStyle: 'none' } as object)) },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: SP.s2, minHeight: 28 },
  only: { paddingLeft: 32 },
  rule: { height: 0 },
  block: { flexDirection: 'row', alignItems: 'center', minHeight: TARGET, paddingLeft: SP.s3, marginRight: 4, marginBottom: 4 },
  blockWords: { flex: 1, minWidth: 0, paddingVertical: SP.s2 },
  addRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: G.line, backgroundColor: G.bg },
  addMark: { width: TARGET, height: TARGET, alignItems: 'center', justifyContent: 'center', borderRightWidth: 2, borderRightColor: G.line },
  addField: { flex: 1, minWidth: 0, paddingHorizontal: SP.s3 },
});
