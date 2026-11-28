/**
 * B-11 slice 1 (P-86), B-12 (P-90), P-96: the runner — the step (P-112: and the next ones pulled into view, `Chunk.tsx`) (B-11 §3.1, §9b; B-12 v1).
 *
 * A column exactly as tall as what is visible. P-96 (one navigation scheme): the TOP is context only —
 * the path (the level, after its parent), then the values in play (a row of their own, each opening its
 * sheet) · the note, centred in whatever room is left and never larger than it, the values it reads in
 * place · the step's value fields · the notice, in its own row · the handle · the side doors (❚❚ Pause,
 * which goes home; Plan / Step in) · Next, the one filled button, lowest — Done only when that press
 * ends the whole run. Finishing early, Back to and Jump to are the pull-up panel's. Nothing is
 * positioned over anything else but the pull-up panel (over the note only) and the value sheet.
 *
 * The route follows the run: in Plan → its Plan; paused, ended, left or gone → home (there is no
 * paused screen: the paused run is on home, with Resume).
 *
 * P-101 (rulings 1–3, 7): moves like a debugger. The TOP line is the path (it wraps) and, at its right,
 * the doors: ❚❚ (spoken "Pause and go home": a small sheet, "Pausing <name>", with an optional note kept
 * as the run's pause reason) and Plan — "Plan <routine>" inside a call, opening that routine's Plan. The
 * BOTTOM row is the moves: Step in (the step has steps) · Step out (leave this level, go up one; never on
 * the first layer) · the filled Next (Done only on the press that ends the run). Finish-now left the
 * panel. A giving step's value (and a name it asks for) is typed in a sheet of its own, which rises with
 * the keyboard; under the note the field reads the label and the value, and a tap opens the sheet.
 */
import { router, useIsFocused } from 'expo-router';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { chunkAt, ChunkField, chunkView, Drafts } from '@/domain/chunk';
import { NOTE_PAD, NOTE_SIZES, noteType } from '@/domain/goText';
import { panelView, partsText, routineHue, runnerView, RunnerView, sinceWords, StepPart, ValueField, wordsShown } from '@/domain/runView';
import { useStore } from '@/store/useStore';

import { OwedSheet } from './Calls';
import { ChunkSheet, SeeAhead } from './Chunk';
import { Mark } from './marks';
import { Notice, useRunUndo } from './Notice';
import { PartsList } from './Parts';
import { OpenRows, PlaceRow } from './Places';
import { decideWhere } from './session';
import { face, G, hueOf, SP, TARGET } from './tokens';
import { DraftListSheet, EntrySheet, Gives, Parts, ValueFields, ValueSheet, ValuesRow } from './Values';
import { Btn, Confirm, Field, focusOn, focusSoon, GoScreen, hard, HiddenH1, Said, Sheet, T, useBackCloses, useKeys, useVisibleHeight, ViewRef } from './ui';

const WEB = Platform.OS === 'web';
/** P-112: the chunk at a place it has not been changed at — one step in view, nothing open, nothing typed. */
const FRESH: { n: number; open: string[]; drafts: Drafts } = { n: 1, open: [], drafts: {} };
const SHADOW = 10;
const GUTTER = 16;
/** The note never gets smaller than this (the runner scrolls instead). */
const NOTE_FLOOR = 96;
/** A press this soon after a drag is the drag's own mouse-up, not a tap. */
const AFTER_DRAG_MS = 600;
/**
 * P-103 (audit F-1, the blocker): Done takes Next's place when the next press would end the run — and a
 * quick second tap on Next must never land on it. For this long after Done appears in Next's place, a press
 * on it does nothing (finishing is final: there is no Undo to catch it).
 */
export const DONE_GUARD_MS = 600;

/** Home, from any `/go` screen: back to it when it is beneath, else in its place. Never a redirect from there. */
export function goHome() {
  decideWhere();
  // P-97 audit F2: home, whatever came before (My routines, Plan opened from it): back down to it when it is
  // beneath, else in this screen's place — never just one screen back.
  if (router.canGoBack()) router.dismissTo('/go');
  else router.replace('/go');
}

export function Runner({ runId }: { runId: string }) {
  const data = useStore((s) => s.data);
  const act = useStore.getState;
  const v = runnerView(data, runId);
  const running = v?.status === 'running';
  const focused = useIsFocused();

  const [panel, setPanel] = useState(false);
  /** P-96: the value sheet open on this name. */
  const [sheet, setSheet] = useState<string | null>(null);
  /** P-101 amendment (ruling 9): Start over asked for this level (0: the whole run). */
  const [restarting, setRestarting] = useState<number | null>(null);
  /** P-101 (ruling 3): the Pause sheet is open. */
  const [pausing, setPausing] = useState(false);
  /** P-101 (ruling 7): a value field's entry sheet is open on this field (it holds the screen like the value sheet). */
  const [entry, setEntry] = useState<ValueField | null>(null);
  /** P-98: Next or Step out pressed past what still owes names — its fields first. */
  const [owing, setOwing] = useState<'next' | 'out' | null>(null);
  /** P-112: a list typed in the See ahead view, for a step not reached yet: its editor is open on this field. */
  const [listing, setListing] = useState<ChunkField | null>(null);
  const typing = !!entry || !!owing || !!listing;
  /** P-101 (ruling 2): Plan was pressed here — once the run is paused, its Plan (this address), in this screen's place. */
  const toPlan = useRef<string | null>(null);
  /** P-103 (3): Plan was opened from here, over this screen — coming back (its Back, the browser's) resumes where you were. */
  const fromHere = useRef(false);
  const pauseBtn = useRef<ViewRef>(null);
  /** The note is full (its words scroll inside it): Plan carries the quiet mark (breaking a step down is planning). */
  const [full, setFull] = useState(false);
  const note = useRef<ViewRef>(null);
  const handle = useRef<ViewRef>(null);
  const nextBtn = useRef<ViewRef>(null);
  /**
   * P-112: See ahead is on (it stays on after Next until turned off). The chunk — how many steps are in view, which
   * are open, what was typed — belongs to the place it was chosen at: a move (Next, Step in, Undo) resets it to one step.
   * Nothing of it is stored.
   */
  // (F-1, engine #6: kept in the store, per run and per place — Pause, Plan and home take the runner away, and a move
  // elsewhere goes on from another place, but what was typed stays at the place it was typed at, there again on return.)
  const seen_ = useStore((s) => s.seeAhead[runId]);
  const ahead = !!seen_?.on;
  const setAhead = (on: boolean) => act().setSeeAhead(runId, { on });
  const here = chunkAt(data, runId);
  const chunk = { at: here, ...(seen_?.at[here] ?? FRESH) };
  const setChunk = (c: { at: string; n: number; open: string[]; drafts: Drafts }) => act().setSeeAhead(runId, { at: c.at, chunk: { n: c.n, open: c.open, drafts: c.drafts } });
  // (P-99: not on an In any order block's row — the parts to choose are the runner's there.)
  const choosing = !!v?.choose;
  const cv = useMemo(() => (ahead && running && !v?.planning && !choosing ? chunkView(data, runId, chunk.n, new Set(chunk.open), chunk.drafts) : undefined), [ahead, running, v?.planning, choosing, data, runId, chunk.n, chunk.open, chunk.drafts]);
  const setChunkOf = (f: (c: typeof chunk) => Partial<typeof chunk>) => setChunk({ ...chunk, ...f(chunk) });

  // The route follows the run. Whatever is open is put away first (it would hold the screen).
  const status = v?.status;
  const planning = !!v?.planning;
  useEffect(() => {
    // Only the screen in front moves (one beneath another would move that one instead).
    if (running && !planning && focused) fromHere.current = false;
    if ((running && !planning) || !focused) return;
    // P-103 (3; was P-101: in this screen's place): Plan, pressed here, opens over the runner — Back returns here.
    if (toPlan.current && status !== 'ended') {
      const to = toPlan.current;
      toPlan.current = null;
      fromHere.current = true;
      router.push(to as never);
      return;
    }
    // Back from that Plan (its own Back, or the browser's): the run is taken up again exactly where it was.
    if (fromHere.current && status === 'paused' && !planning) {
      fromHere.current = false;
      if (act().resumeRun(runId).ok) return;
    }
    // At the edge (an earlier build's run): its Plan, in this screen's place.
    else if (planning && status !== 'ended') router.replace(`/go/run/${runId}/plan`);
    // P-96 (ruling 7): paused (Pause), ended (the last Next, Finish now), left or gone: home — where the
    // paused run is first, or the notice says what finished, with Undo.
    else goHome();
  }, [running, planning, focused, status, runId, act]);

  const closePanel = () => {
    setPanel(false);
    focusOn(handle);
  };
  // Open things hold the screen only while the run is running here (else the route is about to follow it).
  useBackCloses(focused && running && panel && !sheet && !pausing && !typing && restarting === null, closePanel);

  const toNote = () => later(note);
  // On arrival (a start, Resume from Plan or home, a Jump, Undo from home, a reload): the note.
  useEffect(() => {
    if (focused) later(note);
  }, [focused]);

  // P-103 (1; audit F1): Done is held — a press on it does nothing — for DONE_GUARD_MS after it takes Next's place,
  // and after the runner appears or comes back (a second tap on Plan's "Resume at <last step>", or a tile's Resume,
  // lands right here): whichever is later. A key press on it (focused, deliberate) still works; so does Return on the note.
  const doneKey = (cv ? cv.ends : v?.next === 'done') ? `${v?.step.itemId}|${v?.depth}|${cv ? cv.n : 0}` : '';
  const [held, setHeld] = useState(false);
  useLayoutEffect(() => {
    if (!doneKey || !focused) return;
    // Before the frame is painted, so no press can land between Done appearing and its hold.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHeld(true);
    const t = setTimeout(() => setHeld(false), DONE_GUARD_MS);
    return () => {
      clearTimeout(t);
      setHeld(false);
    };
  }, [doneKey, focused]);
  /** P-99: a part of the block taken up (the parts on its row; the filled button there). */
  const take = (level: number, part: string) => {
    setPanel(false);
    act().takeUpPart(runId, level, part);
    toNote();
  };
  const next = () => {
    if (!v) return;
    if (v.next === 'take' && v.choose?.take) return take(v.choose.level, v.choose.take.part);
    // P-112: with See ahead on, Next takes every step in view as done (one move), with what was typed for them.
    if (cv?.moves.length) {
      act().nextStep(runId, undefined, cv.moves);
      return;
    }
    // P-98: past a call (or a step broken down) not stepped into, what it still owes is asked first — as a consequence of the press, never on the step.
    if (v.nextOwes.length && !v.ends) return setOwing('next');
    act().nextStep(runId);
  };
  const plan = () => {
    setPanel(false);
    // P-101 (ruling 2): inside a call, the innermost routine's Plan; else the run's.
    toPlan.current = v?.planIn ? `/go/run/${runId}/plan?in=${encodeURIComponent(v.planIn.seq)}&from=run` : `/go/run/${runId}/plan?from=run`;
    // One write: the run is paused (plainly, ruling 4). The route then follows it (above) — also when the
    // press is kept while reconnecting and applied once the data is back.
    act().planRun(runId);
  };
  // P-101 (ruling 1): Step out — the level the run is in ends and the run carries on above it (an Undo: it can skip steps).
  const stepOut = () => {
    setPanel(false);
    // P-98: leaving before what this level owes was given — its fields first.
    if (v?.stepOutOwes.length) return setOwing('out');
    // P-99 (the P-112 investigator's repro 4): with See ahead on, what was typed for the step it is on is given as it
    // leaves; what was typed for steps further down (passed over) is said, never dropped silently.
    const given = cv?.moves[0]?.given;
    const notKept = [...new Set((cv?.moves.slice(1) ?? []).flatMap((m) => [...(m.given ?? []), ...(m.owed ?? [])]).filter((g) => g.text.trim()).map((g) => g.name))];
    act().doneLevel(runId, undefined, given, notKept);
    toNote();
  };
  // P-101 (ruling 3): ❚❚ opens the Pause sheet; its Pause puts the run down where it is, with the note, and goes home.
  const pause = (note: string) => {
    // The note as it was (the stored reason, untouched): a bare Pause — kept while reconnecting. A changed
    // note is refused then, and the sheet stays with the words.
    const same = note === (v?.reason ?? '');
    if (act().pauseRun(runId, same ? undefined : note).ok || same) setPausing(false);
  };
  // Little room (the keyboard up, large text): everything but the note gives a little, so the note keeps more.
  const seen = useVisibleHeight();
  const tight = !!seen && seen.height < 600;
  const { width } = useWindowDimensions();
  const narrow = width < 260;
  /** P-101: under 340 px (a 320 px phone, large text) the Plan door says only "Plan" — the routine is the path's. */
  const compact = width < 340;
  const can = useRunUndo();
  const undo = () => {
    if (!can) return;
    can.undo();
    toNote();
  };

  useKeys(
    focused && running && !sheet && !pausing && !typing && restarting === null,
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
  const shown = partsText(v.step.parts) || v.step.words;
  const done = cv ? cv.ends : v.next === 'done';
  // (P-112: over more than one step in view, Next is Next — a wait among them is taken as done with the rest.)
  const happened = v.next === 'itsHappened' && !done && !(cv && cv.n > 1);
  const taking = v.next === 'take' ? v.choose?.take : undefined;
  const valueSheet = sheet ? <ValueSheet runId={runId} name={sheet} onClose={() => setSheet(null)} fallback={note} /> : null;
  const entrySheet = entry && v.step.itemId ? <EntrySheet key={`${v.step.itemId}:${entry.name}`} runId={runId} itemId={v.step.itemId} field={entry} onClose={() => setEntry(null)} fallback={nextBtn} /> : null;
  const restartSheet =
    restarting !== null ? (
      <Confirm
        title={`Start ${restarting === 0 ? v.name : v.level} over?`}
        body="Your place and values in it go."
        action="Start over"
        testID="go-restart-confirm"
        onCancel={() => setRestarting(null)}
        onAct={() => {
          const level = restarting;
          setRestarting(null);
          act().restartRun(runId, level);
          toNote();
        }}
      />
    ) : null;
  const owedSheet = owing ? (
    <OwedSheet
      title={owing === 'next' ? v.step.words : v.level}
      names={owing === 'next' ? v.nextOwes : v.stepOutOwes}
      move={owing === 'next' ? 'Next' : 'Step out'}
      fallback={nextBtn}
      onClose={() => setOwing(null)}
      onMove={(owed) => {
        const did = owing === 'next' ? act().nextStep(runId, owed) : act().doneLevel(runId, owed);
        // Refused (reconnecting): the sheet stays, with what was typed.
        if (!did.ok && did.reason === 'reconnecting') return;
        setOwing(null);
        toNote();
      }}
    />
  ) : null;
  const listSheet = listing ? (
    <DraftListSheet
      title={listing.name}
      items={listing.items ?? []}
      refs={listing.refs}
      runId={runId}
      routines={listing.routines}
      fallback={note}
      onClose={() => setListing(null)}
      onKeep={(items, refs) => {
        const key = listing.key;
        setChunkOf((c) => ({ drafts: { ...c.drafts, [key]: { text: items.join('\n'), items, ...(refs.some(Boolean) && { refs }) } } }));
      }}
    />
  ) : null;
  const layer = listSheet ?? owedSheet ?? restartSheet ?? (pausing ? <PauseSheet name={v.name} reason={v.reason ?? ''} onPause={pause} onClose={() => setPausing(false)} fallback={pauseBtn} /> : (entrySheet ?? valueSheet));
  // P-101 (ruling 2): "Plan <routine>" inside a call. In a window too narrow for it beside the path (200 %
  // text) the button says "Plan" and its spoken name keeps the routine (the path beside it names it too).
  const planSpoken = v.planIn ? `Plan ${v.planIn.name}` : 'Plan';
  const planLabel = v.planIn && !compact ? planSpoken : 'Plan';
  // (P-112: the note's mark — with See ahead on there is no note.)
  const long = full && !cv;
  const pathWords = (
    <View style={[styles.contextWords, compact && styles.contextWordsAlone]} testID="go-context">
      {!!v.parent && <T dim>{`${v.parent} ›`}</T>}
      <T bold size={18}>
        {v.level}
      </T>
      {/* P-101 (ruling 7): what this step's (or this level's) smaller steps give, hoisted. */}
      {v.gives.length > 0 && <Gives names={v.gives} testID="go-context-gives" />}
    </View>
  );
  const planDoor = (
    <Btn
      label={planLabel}
      spoken={long ? `${planSpoken}. This step is long` : planSpoken !== planLabel ? planSpoken : undefined}
      mark={long && !narrow ? 'split' : undefined}
      testID="go-plan-door"
      dataSet={{ marked: long ? 'true' : 'false' }}
      onPress={plan}
      style={styles.planDoor}
    />
  );
  /* P-103 (2; was P-101 ruling 2: both doors at its right): the top line — ❚❚ Pause, the one way out, first at
   its left; the path (it wraps; not a control); Plan at its right. Under 340 px the path has a line of its own, beneath.
   Pinned above the column (as an app bar is), so the way out never scrolls away — but with almost no room
   (under 360 px tall: large text AND the keyboard up) it scrolls with the column, so the note keeps its room. */
  const topLine = (
    <View style={styles.context}>
      <Btn ref={pauseBtn} mark="pause" label="Pause" spoken="Pause and go home" onPress={() => { setPanel(false); setPausing(true); }} testID="go-pause" style={styles.pauseDoor} />
      {compact && <View style={styles.contextGap} />}
      {!compact && pathWords}
      {planDoor}
      {compact && pathWords}
    </View>
  );
  const pinTop = !seen || seen.height >= 360;
  const panelEl = (
    <Panel
      runId={runId}
      restart={{ name: v.name, level: v.depth > 1 ? v.level : undefined }}
      onRestart={(level) => {
        setPanel(false);
        setRestarting(level === 'level' ? v.depth - 1 : 0);
      }}
      onClose={closePanel}
      onUndo={undo}
      onMoved={() => {
        setPanel(false);
        toNote();
      }}
    />
  );

  return (
    <GoScreen testID="go-runner" layer={layer}>
      <HiddenH1>{v.level}</HiddenH1>
      {/* Said once on arriving (from Plan, a start, a reload): running, and the step. */}
      {focused && <Said text={`Running: ${v.step.kind === 'wait' ? `Wait for: ${shown}` : shown}`} />}
      {/* With almost no room (large text AND the keyboard up) the column scrolls before anything goes: the note keeps a least size. */}
      {pinTop && topLine}
      <ScrollView style={styles.column} contentContainerStyle={styles.columnBody} keyboardShouldPersistTaps="handled" testID="go-column">
      {!pinTop && topLine}
      {/* Audit F6: with little room the values and the note on them are one row high and scroll inside it. */}
      <ScrollView style={[tight && styles.valuesTight, cv && styles.valuesAhead]} contentContainerStyle={tight && styles.valuesTightBody} nestedScrollEnabled keyboardShouldPersistTaps="handled" testID="go-values-area">
        {/* P-110 (the owner: "not displaying placeholders if those values aren't supplied"): only the values held at the place. */}
        <ValuesRow values={v.values} onOpen={(name) => { setPanel(false); setSheet(name); }} />
        {/* P-101 (ruling 3): the pause note, read on the way back in (until the first move drops it). */}
        {!!v.reason && (
          <View style={styles.reason} testID="go-runner-reason">
            {/* P-103 (10): the note's own mark — ❚❚ is the Pause button's alone. */}
            <Mark name="note" size={20} color={G.dim} />
            <T style={styles.shrink}>{v.reason}</T>
          </View>
        )}
      </ScrollView>

      {cv ? (
        <View style={styles.upper}>
          <ChunkSheet
            view={cv}
            hue={hue}
            sheetRef={note}
            onOpen={(key) => setChunkOf((c) => ({ open: c.open.includes(key) ? c.open.filter((k) => k !== key && !k.startsWith(`${key}/`)) : [...c.open, key] }))}
            onDraft={(key, text) => setChunkOf((c) => ({ drafts: { ...c.drafts, [key]: { text } } }))}
            onList={(f) => {
              setPanel(false);
              setListing(f);
            }}
            onMore={() => setChunkOf(() => ({ n: cv.n + 1 }))}
            onFewer={() => setChunkOf(() => ({ n: Math.max(1, cv.n - 1) }))}
          />
          <Notice onUndone={toNote} reserve />
          {panel && (
            <>
              <Pressable style={[StyleSheet.absoluteFill, styles.dim]} onPress={closePanel} accessible={false} focusable={false} {...(WEB && ({ tabIndex: -1, 'aria-hidden': true } as object))} />
              {panelEl}
            </>
          )}
        </View>
      ) : (
      <NoteArea
        view={v}
        hue={hue}
        noteRef={note}
        panelOpen={panel}
        onPanel={(open) => (open ? setPanel(true) : closePanel())}
        panel={panel ? panelEl : null}
        notice={<Notice onUndone={toNote} reserve />}
        fields={v.choose ? <PartsList groups={[{ level: v.choose.level, within: v.level, parts: v.choose.parts }]} onTake={take} testID="go-choose" /> : v.step.itemId ? <ValueFields fields={v.fields} onOpen={(f) => { setPanel(false); setEntry(f); }} /> : null}
        onFull={setFull}
      />
      )}
      </ScrollView>
      {/* Audit F6: the handle, the moves and Next are pinned below the column — always whole on screen; the column above (the notice's row with it) scrolls. */}
          <>
            {/* P-112: the bottom bar's top row — the handle, and at its right See ahead (pressed while the view is on). */}
            <View style={styles.handleRow}>
              <View style={styles.handleGrow}>
                <Handle ref={handle} open={panel} onToggle={() => (panel ? closePanel() : setPanel(true))} onSwipe={(up) => (up ? setPanel(true) : closePanel())} />
              </View>
              {/* (P-99: not on an In any order block's row — what is ahead there is the parts, listed.) */}
              {!choosing && <SeeAhead
                on={ahead}
                onPress={() => {
                  // Off: back to one step (what was typed stays with the place until a move).
                  if (ahead) setChunkOf(() => ({ n: 1, open: [] }));
                  setAhead(!ahead);
                }}
              />}
            </View>
            <View style={[styles.tray, tight && styles.trayTight]}>
              {/* P-101 (ruling 1): the moves — Step in · Step out · the filled Next, lowest; it wraps (large text), Next last and full width. */}
              <View style={styles.moves} testID="go-moves">
                {v.moves.stepIn && (
                  <Btn
                    label="Step in"
                    spoken={`Step in: ${shown}`}
                    style={styles.move}
                    testID="go-step-in"
                    onPress={() => {
                      setPanel(false);
                      act().stepIn(runId);
                      toNote();
                    }}
                  />
                )}
                {v.moves.stepOut && <Btn label="Step out" spoken={`Step out of ${v.moves.stepOut.name}`} style={styles.move} testID="go-step-out" onPress={stepOut} />}
                {/* Next — Done only when this press ends the whole run (P-96, ruling 7). */}
                <Btn
                  kind="filled"
                  ref={nextBtn}
                  // (P-99: on an In any order block's row, the part to take up — "Resume <part>" put down, "Start <part>" not taken up.)
                  label={taking ? `${taking.resume ? 'Resume' : 'Start'} ${taking.words}` : happened ? 'It’s happened' : done ? 'Done' : 'Next'}
                  spoken={taking ? undefined : happened ? `It’s happened: ${shown}` : done ? `Done with ${v.name}` : undefined}
                  // P-103 (1): Done has its own mark, the check — never Next's arrow.
                  mark={done && !taking ? 'check' : undefined}
                  markAfter={happened || (done && !taking) ? undefined : 'forward'}
                  onPress={next}
                  hold={done && held}
                  size={18}
                  style={styles.next}
                  testID="go-next"
                  dataSet={{ ends: v.ends ? 'true' : 'false' }}
                />
              </View>
            </View>
          </>

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
  /** P-96: the step's value fields, under its words (in the flow, above the notice). */
  fields: React.ReactNode;
  /** The notice's slot: in the flow under the note (the panel, when open, is over both). */
  notice: React.ReactNode;
  /** Told whether the note is full (P-101: the Plan door, in the top line, carries its mark). */
  onFull: (full: boolean) => void;
}

/**
 * The note in the room it has. It is a square, as large as the room allows up to its own size, with
 * a margin; the type steps down with the words (`noteType`), and if what is drawn is still taller
 * than the note the type steps down again, to "full": edge to edge, scrolling inside, never clipped.
 * It is never a field: words are typed in Plan.
 */
function NoteArea({ view: v, hue, noteRef, panelOpen, onPanel, panel, fields, notice, onFull }: NoteAreaProps) {
  const { fontScale } = useWindowDimensions();
  const [room, setRoom] = useState<{ w: number; h: number } | undefined>();
  // What is shown: the words with the values the step reads in place (P-96).
  const words = partsText(v.step.parts) || v.step.words;

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
  useEffect(() => onFull(full), [full, onFull]);
  const size = NOTE_SIZES[Math.min(level, NOTE_SIZES.length - 1)];
  const pad = full ? SP.s2 : side < 160 ? SP.s2 + 4 : NOTE_PAD;
  const inner = side - pad * 2 - (v.step.kind === 'wait' ? 4 : 0);
  const wait = v.step.kind === 'wait';
  const head = wait || v.step.kind === 'routine' ? 28 : 0;

  const seen = useVisibleHeight();
  // Audit F6: with little room (200 % text, the keyboard up) the note keeps a usable floor; the column scrolls.
  const floor = !!seen && seen.height < 600;
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
        <NoteWords style={text} selectable parts={v.step.parts} hue={hue.c} ink={color}>
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
        <NoteWords style={text} parts={v.step.parts} hue={wait ? G.bg : hue.c} ink={color}>
          {v.step.words}
        </NoteWords>
      </View>
    );

  const noteBox = (
    <View
      ref={noteRef}
      testID="go-note"
      role="group"
      aria-label={wait ? `Wait for: ${words}` : words}
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
        {fields}
        {notice}
        {panel && (
          <>
            <Pressable style={[StyleSheet.absoluteFill, styles.dim]} onPress={() => onPanel(false)} accessible={false} focusable={false} {...(WEB && ({ tabIndex: -1, 'aria-hidden': true } as object))} />
            {panel}
          </>
        )}
      </View>
    </>
  );
}

/**
 * The step's words — P-96: with the values it reads in place, inverted (display only: the note keeps its
 * own tap). Not selectable unless the note scrolls: a drag over them is the swipe that opens the panel.
 */
function NoteWords({ children, style, selectable = false, parts, hue, ink }: { children: string; style: object; selectable?: boolean; parts: StepPart[]; hue: string; ink: string }) {
  const valued = parts.some((p) => p.kind !== 'text');
  return (
    <Text selectable={selectable} style={[styles.words, style, WEB && ({ overflowWrap: 'anywhere' } as object)]} testID="go-note-words">
      {valued ? <Parts parts={parts} ink={ink} on={hue} /> : children}
    </Text>
  );
}

interface PanelProps {
  runId: string;
  /** P-101 amendment (ruling 9): "Start <routine> over"; and, inside a call or a breakdown, "Start <level> over". */
  restart: { name: string; level?: string };
  onRestart: (which: 'run' | 'level') => void;
  onClose: () => void;
  onUndo: () => void;
  /** The run moved (Back to): the panel goes, the note has the focus. */
  onMoved: () => void;
}

/**
 * The pull-up panel (B-11 §3.2): where you are in this run (the round, last step of the round, then),
 * then Back to <step> and Jump to… (they move you; they do not plan). P-101: Finish now is Step out, on the surface. Over the note only; the three buttons stay where they are and
 * keep working. The round is said here and nowhere else.
 */
function Panel({ runId, restart, onRestart, onClose, onUndo, onMoved }: PanelProps) {
  const data = useStore((s) => s.data);
  const p = panelView(data, runId);
  // The notice (and its Undo) is under the panel while it is open: the same Undo is a row here.
  const can = useRunUndo();
  const first = useRef<ViewRef>(null);
  useEffect(() => {
    setTimeout(() => focusOn(first), 0);
  }, []);
  if (!p) return null;
  // P-96: the steps named here read with the run's values in place.
  const said = (words: string) => partsText(wordsShown(data, runId, words)) || words;
  const then = p.then && said(p.then);
  const backTo = p.backTo !== undefined ? said(p.backTo) : undefined;
  const round = p.round ? `Round ${p.round.n}${p.round.of ? ` of ${p.round.of}` : ''}` : undefined;
  const where = [round, p.lastOfRound && 'Last step of the round', then && `then: ${then}`].filter(Boolean);
  return (
    <View style={styles.panel} role="region" aria-label="More about this step" testID="go-panel" {...{ dataSet: { moving: 'false' } }}>
      <ScrollView contentContainerStyle={styles.panelBody} keyboardShouldPersistTaps="handled">
        <View ref={first} style={styles.where} {...(WEB && ({ tabIndex: -1 } as object))} testID="go-where">
          {!!p.reason && (
            <View style={styles.line} testID="go-panel-reason">
              <Mark name="note" color={G.dim} />
              <T style={[styles.shrink, styles.anywhere]}>{p.reason}</T>
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
          {!!then && (
            <View style={styles.line}>
              <Mark name="forward" color={G.dim} />
              <T style={styles.shrink}>
                <T dim>then: </T>
                {then}
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
        {/* P-99 (B-16, "where every part stands"): every part of every In any order block the run is in; a tap takes one up. */}
        {p.parts && (
          <View style={styles.places} testID="go-panel-parts">
            <T bold dim role="heading" aria-level={3} accessibilityRole="header">
              In any order
            </T>
            <PartsList
              groups={p.parts}
              onTake={(level, part) => {
                useStore.getState().takeUpPart(runId, level, part);
                onMoved();
              }}
              testID="go-tree"
            />
          </View>
        )}
        {/* P-109 (B-18 journey 3): the routine's places, under what the panel already holds — the run began in, then the one you are in. */}
        {p.places?.map((g) => (
          <View key={`${g.inner ? 'in' : 'root'}:${g.routine}`} style={styles.places} testID="go-panel-places">
            <T bold dim role="heading" aria-level={3} accessibilityRole="header">
              {g.inner ? `Places in ${g.routine}` : 'Places'}
            </T>
            <View role="list" aria-label={g.inner ? `Places in ${g.routine}` : 'Places'}>
              {g.places.map((pl) => (
                <View key={pl.id} role="listitem">
                  <PlaceRow place={pl} />
                </View>
              ))}
            </View>
          </View>
        ))}
        {/* P-109 (journey 4): an address typed in the step, a value or the pause note. */}
        {p.addresses && <OpenRows addresses={p.addresses} />}
        {can && <Btn kind="plain" mark="undo" label={`Undo ${can.label}`} onPress={onUndo} />}
        {backTo !== undefined && (
          <Btn
            kind="plain"
            mark="backStep"
            label={`Back to ${backTo}`}
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
        {/* P-101 (ruling 1): finishing early is Step out, beside Next — no longer here. */}
        {/* P-101 amendment (ruling 9): Start over — the level it is in (and below), or the whole run; asked first. */}
        {restart.level !== undefined && <Btn kind="plain" label={`Start ${restart.level} over`} onPress={() => onRestart('level')} testID="go-restart-level" />}
        <Btn kind="plain" label={`Start ${restart.name} over`} onPress={() => onRestart('run')} testID="go-restart-run" />
      </ScrollView>
    </View>
  );
}

/**
 * P-101 (ruling 3): Pause's sheet — "Pausing <name>", an optional note of one or more lines (prefilled with
 * the reason stored, if any; it is kept as the run's pause reason and shown on the way back in), the
 * filled Pause (the run is put down where it is and home opens), Close (stay running).
 */
function PauseSheet({ name, reason, onPause, onClose, fallback }: { name: string; reason: string; onPause: (note: string) => void; onClose: () => void; fallback: { current: unknown } }) {
  const [note, setNote] = useState(reason);
  return (
    <Sheet title={`Pausing ${name}`} onClose={onClose} testID="go-pause-sheet" fallback={fallback}>
      <Field value={note} onChangeText={setNote} multiline accessibilityLabel="Note" placeholder="Where you left off, what’s next (optional)" style={styles.noteField} testID="go-pause-note" {...{ dataSet: { first: 'true' } }} />
      <Btn kind="filled" label="Pause" spoken={`Pause ${name}`} onPress={() => onPause(note)} size={18} testID="go-pause-confirm" />
      <Btn label="Close" onPress={onClose} testID="go-pause-close" />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  shrink: { flexShrink: 1 },
  // P-101 (ruling 2): the path (it wraps) and, at its right, the doors; with too little room the doors go beneath, at the right.
  context: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: SP.s2, marginHorizontal: GUTTER, marginTop: SP.s2, borderWidth: 2, borderColor: G.line, paddingHorizontal: SP.s1, paddingVertical: SP.s1 },
  // Tall enough for a parent and a level, always: the note does not move when a level is entered.
  contextWords: { flexGrow: 1, flexShrink: 1, flexBasis: 96, minWidth: 0, minHeight: 56, justifyContent: 'center', paddingHorizontal: SP.s3 - 4, paddingVertical: SP.s1 },
  planDoor: { flexShrink: 1, maxWidth: '100%' },
  pauseDoor: { flexShrink: 0, paddingHorizontal: SP.s2 },
  contextGap: { flexGrow: 1 },
  valuesTight: { flexGrow: 0, flexShrink: 0, maxHeight: 64 },
  // P-112: with See ahead on, the sheet starts right under the values (the note is centred in its room; the sheet is not).
  valuesAhead: { flexGrow: 0 },
  valuesTightBody: { paddingBottom: SP.s1 },
  // Under 340 px (large text): the path has the line to itself, the doors beneath it at the right.
  contextWordsAlone: { flexBasis: '100%', minHeight: 0 },
  reason: { flexDirection: 'row', alignItems: 'flex-start', gap: SP.s2, marginHorizontal: GUTTER, marginTop: SP.s2 },
  noteField: { minHeight: 96, textAlignVertical: 'top' },
  // …below that (large text AND the keyboard up) the note keeps a 96 px floor and the column scrolls instead.
  areaFloor: { minHeight: NOTE_FLOOR + SHADOW + SP.s1 * 2 },
  column: { flex: 1, minHeight: 0 },
  columnBody: { flexGrow: 1 },
  // It grows into the room left, and never shrinks below what it holds (the note's least room, the
  // fields, the notice): with too little room the column scrolls — the notice never slides under the tray.
  upper: { flexGrow: 1, flexShrink: 0, flexBasis: 'auto' },
  // Down to a 195×422 window everything fits without scrolling and the note takes what is left (never nothing)…
  area: { flex: 1, minHeight: 64, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  note: { justifyContent: 'center', marginRight: SHADOW, marginBottom: SHADOW },
  noteHead: { flexDirection: 'row', alignItems: 'center', gap: SP.s2, height: 28 },
  noteBody: { flex: 1, minHeight: 0, justifyContent: 'center' },
  noteWords: { alignSelf: 'stretch' },
  words: { fontWeight: '600' },
  corner: { position: 'absolute', right: 0, bottom: 0, width: 22, height: 22 },
  dim: { backgroundColor: 'rgba(0,0,0,0.55)' },
  handleRow: { flexDirection: 'row', alignItems: 'stretch' },
  handleGrow: { flexGrow: 1, flexShrink: 1, minWidth: 0 },
  handleBtn: { minHeight: TARGET, alignItems: 'center', justifyContent: 'center', borderTopWidth: 2, borderTopColor: G.surf2, backgroundColor: G.surf },
  handle: { width: 48, height: 6, backgroundColor: G.dim },
  tray: { backgroundColor: G.surf, paddingHorizontal: GUTTER, paddingBottom: SP.s3, gap: SP.s2 },
  trayTight: { paddingBottom: SP.s2 },
  moves: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.s2 },
  move: { flexGrow: 1, flexShrink: 0, flexBasis: 'auto' },
  // Next takes what is left; with too little room for it beside the moves it is a row of its own, lowest.
  next: { minHeight: 56, flexGrow: 2, flexShrink: 1, flexBasis: 160 },
  panel: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '100%', backgroundColor: G.surf, borderTopWidth: 2, borderTopColor: G.text },
  panelBody: { paddingHorizontal: GUTTER, paddingTop: SP.s3, paddingBottom: SP.s2, gap: SP.s1 },
  where: { gap: SP.s1, paddingBottom: SP.s2, ...(WEB && ({ outlineStyle: 'none' } as object)) },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: SP.s2, minHeight: 28 },
  rule: { height: 0 },
  places: { gap: SP.s1, paddingBottom: SP.s2 },
  // P-109: an address typed in the note is one long word — it breaks where it must (never cut at 200 % text).
  anywhere: WEB ? ({ overflowWrap: 'anywhere' } as object) : {},
});
