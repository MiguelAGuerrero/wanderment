/**
 * B-11 slice 1 (P-86), B-12 (P-90): the runner — the step and nothing else (B-11 §3.1, §9b; B-12 v1).
 *
 * A column exactly as tall as what is visible: the context line (the level, its parent, Done) · the
 * note, centred in whatever room is left and never larger than it · the notice · the handle · Pause,
 * Plan / Step in, and Next. Nothing is positioned over anything else but the pull-up panel (over the
 * note only). The three buttons never move. Nothing is planned here: Plan is its own surface, and a
 * run with nothing next is there, not here.
 *
 * The route follows the run: in Plan → its Plan; paused → the paused screen; ended, left or gone → home.
 */
import { router, useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { NOTE_PAD, NOTE_SIZES, noteType } from '@/domain/goText';
import { panelView, routineHue, runnerView, RunnerView, sinceWords } from '@/domain/runView';
import { useStore } from '@/store/useStore';

import { Mark } from './marks';
import { Notice, useRunUndo } from './Notice';
import { decideWhere } from './session';
import { face, G, hueOf, SP, TARGET } from './tokens';
import { Btn, focusOn, focusSoon, GoScreen, hard, HiddenH1, Said, T, useBackCloses, useKeys, useVisibleHeight, ViewRef } from './ui';

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
  const act = useStore.getState;
  const v = runnerView(data, runId);
  const running = v?.status === 'running';
  const focused = useIsFocused();

  const [panel, setPanel] = useState(false);
  const note = useRef<ViewRef>(null);
  const handle = useRef<ViewRef>(null);

  // The route follows the run. Whatever is open is put away first (it would hold the screen).
  const status = v?.status;
  const planning = !!v?.planning;
  useEffect(() => {
    // Only the screen in front moves (one beneath another would move that one instead).
    if ((running && !planning) || !focused) return;
    // In Plan (the Plan button, the edge of a goal, another tab): its Plan, in this screen's place.
    if (planning && status !== 'ended') router.replace(`/go/run/${runId}/plan`);
    else if (status === 'paused') router.replace(`/go/run/${runId}/paused`);
    else goHome();
  }, [running, planning, focused, status, runId]);

  const closePanel = () => {
    setPanel(false);
    focusOn(handle);
  };
  // Open things hold the screen only while the run is running here (else the route is about to follow it).
  useBackCloses(focused && running && panel, closePanel);

  const toNote = () => later(note);
  // On arrival (a start, Resume from Plan or the paused screen, a Jump, Undo from home, a reload): the note.
  useEffect(() => {
    if (focused) later(note);
  }, [focused]);

  const next = () => {
    if (!v) return;
    act().nextStep(runId);
  };
  const plan = () => {
    setPanel(false);
    // One write: the run is paused and in Plan. The route then follows it (above).
    act().planRun(runId);
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
    focused && running,
    {
      // Return while the note has the focus is Next. No letter is a shortcut (see `useKeys`).
      Enter: next,
      'mod+z': undo,
      Escape: () => {
        if (panel) closePanel();
      },
    },
    true,
  );

  if (!v || !running || planning) return <GoScreen testID="go-runner" settled={false}>{null}</GoScreen>;

  const hue = hueOf(routineHue(data, v.routineId));

  return (
    <GoScreen testID="go-runner">
      <HiddenH1>{v.level}</HiddenH1>
      {/* Said once on arriving (from Plan, a start, a reload): running, and the step. */}
      {focused && <Said text={`Running: ${v.step.kind === 'wait' ? `Wait for: ${v.step.words}` : v.step.words}`} />}
      {/* With almost no room (large text AND the keyboard up) the column scrolls before anything goes: the note keeps a least size. */}
      <ScrollView style={styles.column} contentContainerStyle={styles.columnBody} keyboardShouldPersistTaps="handled" testID="go-column">
      <View style={styles.context}>
        {/* The level and its parent, in words. Not a control: the runner is the step and nothing else (the sequence is Plan's). */}
        <View style={styles.contextWords} testID="go-context">
          {!!v.parent && <T dim numberOfLines={1}>{v.parent}</T>}
          <T bold size={18} numberOfLines={tight || v.parent ? 1 : 2}>
            {v.level}
          </T>
        </View>
        <Btn label="Done" spoken={`Done with ${v.level}`} onPress={done} style={styles.done} testID="go-done" />
      </View>

      <NoteArea
        view={v}
        hue={hue}
        noteRef={note}
        panelOpen={panel}
        onPanel={(open) => (open ? setPanel(true) : closePanel())}
        panel={
          panel ? (
            <Panel
              runId={runId}
              onClose={closePanel}
              onUndo={undo}
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
                    label="Plan"
                    spoken={full ? 'Plan. This step is long' : undefined}
                    // The quiet mark for a long step (breaking it down is planning: the same door). In a
                    // narrow window it sits in the button's corner, so the buttons stay in view.
                    mark={full && !narrow ? 'split' : undefined}
                    style={styles.grow}
                    testID="go-middle"
                    dataSet={{ marked: full ? 'true' : 'false' }}
                    onPress={plan}
                  />
                )}
                {narrow && full && v.middle === 'plan' && (
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
 * It is never a field: words are typed in Plan.
 */
function NoteArea({ view: v, hue, noteRef, panelOpen, onPanel, panel, notice, tray }: NoteAreaProps) {
  const { fontScale } = useWindowDimensions();
  const [room, setRoom] = useState<{ w: number; h: number } | undefined>();
  const words = v.step.words;

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
  const swipe = useSwipe(!full, (up) => onPanel(up));
  const tap = (e?: { nativeEvent?: { pageX?: number; pageY?: number } }) => {
    if (swipe.justDragged() || swipe.wasDrag(e)) return;
    onPanel(!panelOpen);
  };

  const color = wait ? G.text : G.ink;
  const text = { fontSize: size * 1, lineHeight: Math.round(size * 1.25), color, fontFamily: face.words };
  const body =
    full ? (
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
      aria-label={wait ? `Wait for: ${v.step.words}` : v.step.words}
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
      {tray(full)}
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
  /** The run moved (Back to): the panel goes, the note has the focus. */
  onMoved: () => void;
}

/**
 * The pull-up panel (B-11 §3.2): where you are in this run (the round, last step of the round, then),
 * then Back to <step> and Jump to… (they move you; they do not plan). Over the note only; the three buttons stay where they are and
 * keep working. The round is said here and nowhere else.
 */
function Panel({ runId, onClose, onUndo, onMoved }: PanelProps) {
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
  const where = [round, p.lastOfRound && 'Last step of the round', p.then && `then: ${p.then}`].filter(Boolean);
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
          {where.length === 0 && !p.wait && <View style={styles.rule} />}
        </View>
        {can && <Btn kind="plain" mark="undo" label={`Undo ${can.label}`} onPress={onUndo} />}
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
      </ScrollView>
    </View>
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
  words: { fontWeight: '600' },
  corner: { position: 'absolute', right: 0, bottom: 0, width: 22, height: 22 },
  dim: { backgroundColor: 'rgba(0,0,0,0.55)' },
  handleBtn: { minHeight: TARGET, alignItems: 'center', justifyContent: 'center', borderTopWidth: 2, borderTopColor: G.surf2, backgroundColor: G.surf },
  handle: { width: 48, height: 6, backgroundColor: G.dim },
  tray: { backgroundColor: G.surf, paddingHorizontal: GUTTER, paddingBottom: SP.s3, gap: SP.s2 },
  trayTight: { paddingBottom: SP.s2 },
  cornerMark: { position: 'absolute', right: 4, top: 4 },
  trayRow: { flexDirection: 'row', gap: SP.s2 },
  next: { minHeight: 56 },
  panel: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '100%', backgroundColor: G.surf, borderTopWidth: 2, borderTopColor: G.text },
  panelBody: { paddingHorizontal: GUTTER, paddingTop: SP.s3, paddingBottom: SP.s2, gap: SP.s1 },
  where: { gap: SP.s1, paddingBottom: SP.s2, ...(WEB && ({ outlineStyle: 'none' } as object)) },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: SP.s2, minHeight: 28 },
  rule: { height: 0 },
});
