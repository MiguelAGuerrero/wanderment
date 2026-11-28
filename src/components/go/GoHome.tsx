/**
 * B-11 slice 1 (P-86), B-12 (P-90), P-96: home (B-11 §9b; B-12 v8) — everything you have open is a
 * tile in its routine's colour (the name, where it is and in which mode — "at <step>" with the run's
 * values in place, or "planning · …", drawn as the Plan surface is), in a fixed order. `/go` opens
 * where you left off — the mode you were in — once per load.
 *
 * P-96 (one navigation scheme): no title in words (no "Nothing running") and no prompt. The side
 * doors: + New (its own sheet asks for the name). The notice has its own row above them, never over a tile.
 *
 * P-101 (ruling 5): the order never changes because of a pause (runs by when each was started, then the
 * routines with nothing going); the run touched last carries a small "Last ran" mark, in words (P-110; was "last"). A run's tile
 * body is the way back in — "Resume <name>" — and its Plan button stays; the filled Resume bar is gone.
 * Nothing reads "planning": a run is running or paused.
 *
 * P-97 (owner, 2026-11-26: home "populated with a whole bunch of disparate types of routines"): home shows only
 * what is in motion — the runs running, paused or waiting — under **Ongoing** (the routine has no end: it repeats
 * until I'm done at its top) and **Finishing** (it has an end); each keeps its tile. A routine with nothing going
 * is on My routines (the left side door), with Start there and in its Plan.
 *
 * P-100 (owner, 2026-11-27: "The home view should really be a queue … And the new would be enqueue"; "One queue"):
 * home is ONE ordered list — no sections, no headings. Each run going is a row: its routine's name, the step it is on
 * (the deepest level it is in, with its values in place), where it sits (a short path, below the first level), its
 * pause note or what it waits for. The top row is what the filled Resume at the bottom resumes. A run started goes
 * to the bottom; a run that finishes leaves the list. Rows move by their grip (a drag) and by their ··· (Move up,
 * Move down, To the top), each with Undo; the order is stored on the runs (`queueRuns`).
 */
import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { tileLine } from '@/domain/goText';
import { placesShown } from '@/domain/places';
import { myRoutines } from '@/domain/routines';
import { homeQueue, leftOff, opensAt, partsText, partsTree, Tile } from '@/domain/runView';
import { useStore } from '@/store/useStore';

import { NewSheet } from './Composer';
import { Grip } from './Grip';
import { Mark } from './marks';
import { Notice, useRunUndo } from './Notice';
import { decideWhere, wentHome, whereDecided } from './session';
import { G, hueOf, SP, TARGET } from './tokens';
import { Btn, Confirm, focusOn, focusSoon, GoScreen, hard, HiddenH1, Menu, MenuItem, MenuSep, Sheet, T, TextRef, useKeys, ViewRef } from './ui';
import { PartsList } from './Parts';
import { PlacesSheet } from './Places';
import { KeptSheet, Parts } from './Values';

export function GoHome() {
  const data = useStore((s) => s.data);
  const focused = useIsFocused();
  const act = useStore.getState;
  const { width } = useWindowDimensions();

  // Where you left off, decided once per load: the runner, Plan, or here (a paused run is here, first).
  const [first] = useState(() => (whereDecided() ? { kind: 'home' as const, runId: undefined } : opensAt(data, wentHome())));
  useEffect(() => {
    decideWhere();
    if (first.kind === 'runner') router.push(`/go/run/${first.runId}`);
    else if (first.kind === 'plan') router.push(`/go/run/${first.runId}/plan`);
  }, [first]);
  // Until it has gone there (and come back), this screen shows nothing: no flash of tiles on the way to a run.
  const [back, setBack] = useState(false);
  useFocusEffect(useCallback(() => () => setBack(true), []));
  const here = first.kind === 'home' || back;
  // On every arrival the heading has the focus (never nothing).
  const title = useRef<TextRef>(null);
  useEffect(() => {
    if (focused && here) focusSoon(title);
  }, [focused, here]);

  /** P-100: the queue, top first. */
  const tiles = homeQueue(data);
  const top = tiles[0];
  /** P-97: there are routines to find on My routines (named, not removed). */
  const any = myRoutines(data).length > 0;
  // One thing at a time: while a run is running it is the only thing home lets you resume or start.
  // Every other Resume and Start is shown, unavailable, until you pause it — never a silent switch.
  // Plan and New run nothing (New makes the routine only), so they stay.
  const now = leftOff(data);
  const runningId = now.kind === 'runner' ? now.runId : undefined;
  const running = !!runningId;
  const busy = (t: Tile) => running && t.runId !== runningId && (t.action === 'resume' || t.action === 'start');

  /** A routine's Plan: its run's (the run is put in Plan first: one write), or — with no run — the routine's own. */
  const toPlan = (routineId: string, runId?: string) => {
    if (runId && !act().planRun(runId).ok) return;
    router.push(runId ? `/go/run/${runId}/plan` : `/go/routine/${routineId}`);
  };
  /** New: its own sheet asks for the name; the routine only (named, on home, no run), then its Plan with the open row focused. */
  const [naming, setNaming] = useState(false);
  /** P-101 amendment (ruling 9): a tile's ··· (its menu), then Start over asked. P-100: and its moves in the queue. */
  const [tileMenu, setTileMenu] = useState<Tile | null>(null);
  const menuAt = tileMenu ? tiles.findIndex((t) => t.runId === tileMenu.runId) : -1;
  const move = (t: Tile, to: number | 'top') => {
    if (t.runId) act().moveInQueue(t.runId, to);
  };
  /** P-100: a row dragged by its grip — which, how far the pointer has moved, and where the line showing the drop goes. */
  const [drag, setDrag] = useState<{ runId: string; line?: number } | null>(null);
  /** Each row's box in the list (by run), and the rows as they were when the drag began. */
  const boxes = useRef<Record<string, { y: number; h: number }>>({});
  const dragFrom = useRef<{ runId: string; spans: { runId: string; y: number; h: number }[] } | undefined>(undefined);
  const spansNow = () => tiles.flatMap((t) => (t.runId && boxes.current[t.runId] ? [{ runId: t.runId, ...boxes.current[t.runId] }] : []));
  /** How many rows a drag let go at `dy` crossed (negative: up), and where its line goes — by where they were when it began. */
  const dropOf = (runId: string, dy: number): { by: number; line?: number } | undefined => {
    const spans = dragFrom.current?.runId === runId ? dragFrom.current.spans : spansNow();
    const c = spans.findIndex((x) => x.runId === runId);
    if (c < 0) return undefined;
    const mid = (x: { y: number; h: number }) => x.y + x.h / 2;
    // Where the pointer is: the grip sits at the row's top-left corner, so its middle is half a target below the row's top.
    const at = spans[c].y + TARGET / 2 + dy;
    let up = 0;
    let down = 0;
    while (c - up - 1 >= 0 && mid(spans[c - up - 1]) > at) up++;
    while (c + down + 1 < spans.length && mid(spans[c + down + 1]) < at) down++;
    return { by: down - up, ...(up ? { line: spans[c - up].y - SP.s1 } : down ? { line: spans[c + down].y + spans[c + down].h + SP.s1 } : {}) };
  };
  const dropped = (t: Tile, dy: number | undefined) => {
    const d = dy === undefined || !t.runId ? undefined : dropOf(t.runId, dy);
    dragFrom.current = undefined;
    setDrag(null);
    // After the click the release makes (web): that click puts a shown notice away, and the move's own notice must stay.
    if (d?.by) setTimeout(() => move(t, d.by), 0);
  };
  const [restarting, setRestarting] = useState<Tile | null>(null);
  /** P-103 (6): "End this run" asked, for this tile's run. */
  const [ending, setEnding] = useState<Tile | null>(null);
  /** P-109: a tile's Places door — its routine's places, to open (read-only here). */
  const [placesOf, setPlacesOf] = useState<Tile | null>(null);
  /** P-99 (B-16, "the same view opens from the routine's tile"): where every part of a run's In any order blocks stands. */
  const [partsOf, setPartsOf] = useState<Tile | null>(null);
  /** P-108: + Add on a tile's kept list. */
  const [keptOf, setKeptOf] = useState<{ seq: string; list: string } | null>(null);
  /** P-102 audit F5: each tile's ··· (by routine), what its menu hangs from. */
  const [mores] = useState<Record<string, unknown>>(() => ({}));
  const newBtn = useRef<ViewRef>(null);
  const create = (words: string) => {
    const did = act().createRoutine(words);
    if (!did.ok || !did.routineId) return;
    setNaming(false);
    toPlan(did.routineId);
  };
  /** A tile's own button: only now does anything start. Refused: nothing changes. */
  const choose = (t: Tile) => {
    const s = act();
    if (t.action === 'plan') return toPlan(t.routineId, t.runId);
    // Nothing to start yet (no steps): its Plan is where the first is added.
    if (t.empty) return toPlan(t.routineId);
    // (F-1: a run resting on a call not stepped into is resumed at the call's first step, where its row says it is.)
    const did = t.action === 'resume' && t.runId ? s.resumeRun(t.runId, false, !!t.into) : s.startRoutine(t.routineId);
    if (!did.ok && did.reason === 'empty') return toPlan(t.routineId);
    if (!did.ok || !did.runId) return;
    router.push(`/go/run/${did.runId}`);
  };

  const can = useRunUndo();
  /** After Undo here: what came back (a run that had ended is running again: its runner; one in Plan: its Plan). */
  const undone = () => {
    const back = leftOff(useStore.getState().data);
    // Only what the Undo brought back: a run that was here all along (left in Plan, say) is not gone to.
    const came = back.kind !== now.kind || back.runId !== now.runId;
    if (came && back.kind === 'runner') router.push(`/go/run/${back.runId}`);
    else if (came && back.kind === 'plan') router.push(`/go/run/${back.runId}/plan`);
    else focusOn(title);
  };
  useKeys(
    focused && !naming && !tileMenu && !restarting && !ending && !placesOf && !keptOf && !partsOf,
    {
      'mod+z': () => {
        if (!can) return;
        can.undo();
        undone();
      },
    },
    true,
  );

  /** Narrower than this, a row has no grip (its ··· has the moves), as Plan's rows. */
  const columns = width >= 340 ? 2 : 1;
  return (
    <GoScreen
      testID="go-home"
      settled={here}
      layer={
        naming ? (
          <NewSheet onMake={create} onClose={() => setNaming(false)} fallback={newBtn} />
        ) : keptOf ? (
          <KeptSheet seq={keptOf.seq} list={keptOf.list} onClose={() => setKeptOf(null)} fallback={title} />
        ) : partsOf?.runId ? (
          <Sheet title={`In any order, in ${partsOf.name}`} onClose={() => setPartsOf(null)} testID="go-parts-sheet" fallback={title}>
            <PartsList
              groups={partsTree(data, partsOf.runId)}
              onTake={(level, part) => {
                const s = act();
                const runId = partsOf.runId!;
                if (!s.takeUpPart(runId, level, part).ok) return;
                setPartsOf(null);
                // Taken up, it is resumed there: the runner, at that part's place.
                if (s.resumeRun(runId).ok) router.push(`/go/run/${runId}`);
              }}
              testID="go-tile-tree"
            />
            <Btn label="Close" onPress={() => setPartsOf(null)} testID="go-parts-close" />
          </Sheet>
        ) : placesOf ? (
          <PlacesSheet routineId={placesOf.routineId} name={placesOf.name} onClose={() => setPlacesOf(null)} fallback={title} />
        ) : restarting?.runId ? (
          <Confirm
            title={`Start ${restarting.name} over?`}
            body="Your place and values in it go."
            action="Start over"
            testID="go-restart-confirm"
            onCancel={() => setRestarting(null)}
            onAct={() => {
              act().restartRun(restarting.runId!, 0);
              setRestarting(null);
              focusOn(title);
            }}
          />
        ) : ending?.runId ? (
          // P-103 (6): ending a paused run — the existing end verb for the whole run; final, like every finish.
          <Confirm
            title={`End this run of ${ending.name}?`}
            body="It ends where it is, with its pause note kept; the routine stays to start again."
            action="End this run"
            testID="go-end-confirm"
            onCancel={() => setEnding(null)}
            onAct={() => {
              act().endRun(ending.runId!);
              setEnding(null);
              focusOn(title);
            }}
          />
        ) : tileMenu ? (
          // P-102 audit F5 (was: a bottom sheet): the same small menu as Plan's, anchored to the tile's ···.
          <Menu anchor={() => mores[tileMenu.routineId]} label={tileMenu.name} onClose={() => setTileMenu(null)} testID="go-tile-menu" fallback={title}>
            {/* P-100: its moves in the queue — the way to reorder without a drag. Only those it can make. */}
            {menuAt > 0 && <MenuItem label="Move up" spoken={`Move up: ${tileMenu.name}`} testID="go-tile-up" onPress={() => { move(tileMenu, -1); setTileMenu(null); }} />}
            {menuAt >= 0 && menuAt < tiles.length - 1 && <MenuItem label="Move down" spoken={`Move down: ${tileMenu.name}`} testID="go-tile-down" onPress={() => { move(tileMenu, 1); setTileMenu(null); }} />}
            {menuAt > 1 && <MenuItem label="To the top" spoken={`To the top: ${tileMenu.name}`} testID="go-tile-top" onPress={() => { move(tileMenu, 'top'); setTileMenu(null); }} />}
            {/* P-99: a run inside an In any order block — where every part stands (a tap takes one up). */}
            {!!tileMenu.runId && partsTree(data, tileMenu.runId).length > 0 && (
              <MenuItem
                label="In any order…"
                spoken={`In any order: where every part of ${tileMenu.name} stands`}
                testID="go-tile-parts"
                onPress={() => {
                  setPartsOf(tileMenu);
                  setTileMenu(null);
                }}
              />
            )}
            {tiles.length > 1 && tileMenu.state !== 'running' && <MenuSep />}
            {tileMenu.state !== 'running' && (
            <MenuItem
              label="Start over"
              spoken={`Start over: ${tileMenu.name}`}
              testID="go-tile-restart"
              onPress={() => {
                setRestarting(tileMenu);
                setTileMenu(null);
              }}
            />
            )}
{/* P-103 audit F5: only a paused run is ended here — one resting on a wait is waited for, not put down. */}
            {tileMenu.state === 'paused' && (
              <>
            <MenuSep />
                <MenuItem
                  label="End this run"
                  spoken={`End this run of ${tileMenu.name}`}
                  danger
                  testID="go-tile-end"
                  onPress={() => {
                    setEnding(tileMenu);
                    setTileMenu(null);
                  }}
                />
              </>
            )}
          </Menu>
        ) : null
      }>
      <View style={[styles.flex, !here && styles.away]}>
      {/* The top is context only (P-96): no title in words; ⚙ top right. The heading is for a screen reader and for focus. */}
      <HiddenH1 ref={title}>Home</HiddenH1>
      <View style={styles.bar}>
        <Btn kind="plain" mark="gear" spoken="Settings" onPress={() => router.push('/go/settings')} style={styles.settings} testID="go-settings-btn" />
      </View>
      <ScrollView style={styles.flex} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" testID="go-tiles">
        {/* P-103 (9; audit F-10): with no routines, one line says what will be here; + New, below, is its one action. */}
        {tiles.length === 0 && !any && (
          <View style={styles.empty}>
            <T dim size={18} style={styles.emptyWords} testID="go-home-empty">
              Your routines will be here.
            </T>
          </View>
        )}
        {/* P-97: routines, but nothing going — they are on My routines. */}
        {tiles.length === 0 && any && (
          <View style={styles.empty}>
            <T dim size={18} style={styles.emptyWords} testID="go-home-idle">
              Nothing going.
            </T>
          </View>
        )}
        {/* P-100: one queue — no sections, no headings; top first. */}
        {tiles.length > 0 && (
          <View role="list" style={styles.queue} testID="go-queue">
            {tiles.map((t, i) => (
              <View
                key={t.routineId}
                role="listitem"
                // (F-2, audit F13: as Plan's rows — Alt+↑ / Alt+↓ while the focus is in a row moves it one place, never past an end.)
                {...(WEB && tiles.length > 1 && t.runId && ({ onKeyDown: (e: { key: string; altKey: boolean; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; preventDefault: () => void }) => {
                  if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
                  const by = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
                  if (!by) return;
                  e.preventDefault();
                  if (i + by < 0 || i + by >= tiles.length) return;
                  const had = document.activeElement as HTMLElement | null;
                  move(t, by);
                  // (The row is moved in the page: the focus stays where it was.)
                  requestAnimationFrame(() => {
                    if (had?.isConnected && document.activeElement !== had) had.focus();
                  });
                } } as object))}
                onLayout={(e) => {
                  if (t.runId) boxes.current[t.runId] = { y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height };
                }}>
                <TileBox
                  tile={t}
                  first={i === 0}
                  dragging={drag?.runId === t.runId}
                  grip={
                    tiles.length > 1 && columns > 1 && t.runId ? (
                      <Grip
                        ink
                        words={t.name}
                        keys="Alt+ArrowUp Alt+ArrowDown"
                        testID="go-tile-grip"
                        style={styles.grip}
                        onStart={() => {
                          dragFrom.current = { runId: t.runId!, spans: spansNow() };
                        }}
                        onMove={(dy) => setDrag({ runId: t.runId!, line: dropOf(t.runId!, dy)?.line })}
                        onDrop={(dy) => dropped(t, dy)}
                        onPress={() => setTileMenu(t)}
                      />
                    ) : undefined
                  }
                  onPress={() => choose(t)}
                  onPlan={() => toPlan(t.routineId, t.runId)}
                  onMore={t.runId && (tiles.length > 1 || t.state !== 'running') ? () => setTileMenu(t) : undefined}
                  moreRef={(el) => {
                    mores[t.routineId] = el;
                  }}
                  unavailable={busy(t)}
                  onPlaces={placesShown(data.routines[t.routineId]?.places).length > 0 ? () => setPlacesOf(t) : undefined}
                  onKept={(k) => setKeptOf(k)}
                />
              </View>
            ))}
            {drag?.line !== undefined && <View style={[styles.dropLine, { top: drag.line - 2 }]} testID="go-queue-drop" pointerEvents="none" />}
          </View>
        )}
      </ScrollView>
      {/* Its own row, in the flow above the side doors: never over a tile (ruling 8). */}
      <Notice onUndone={undone} />
      <View style={styles.doors} testID="go-side-doors">
        {/* Left: another place (P-97: My routines, once there is a routine). Right: + New. */}
        <View style={styles.door}>{any && <Btn label="My routines" onPress={() => router.push('/go/routines')} testID="go-my-routines" />}</View>
        <View style={styles.door}>
          <Btn ref={newBtn} mark="add" label="New" onPress={() => setNaming(true)} testID="go-new" />
        </View>
      </View>
      {/* P-100: the one filled button — the top row's way back in. */}
      {top && (
        <View style={styles.resume}>
          {/* (F-2, audit F8: off while another run is running — said in one line, next to it.) */}
          {busy(top) && (
            <T dim nativeID="go-resume-why" testID="go-resume-why">
              {offWhy(tiles.find((t) => t.runId === runningId)?.name)}
            </T>
          )}
          {/* (F-2, audit F7: the routine it resumes, said after its name — never shown: the row above says it.) */}
          {!!resumeFor(top) && (
            <T nativeID="go-resume-for" style={styles.unseen} testID="go-resume-for">
              {resumeFor(top)}
            </T>
          )}
          <Btn kind="filled" size={18} label={resumeLabel(top)} describedBy={[resumeFor(top) && 'go-resume-for', busy(top) && 'go-resume-why'].filter(Boolean).join(' ') || undefined} disabled={busy(top)} onPress={() => choose(top)} testID="go-resume" />
        </View>
      )}
      </View>
    </GoScreen>
  );
}

/** New (P-95, P-96; P-114: with the starts and the composer): its own sheet — see `Composer.tsx`. */
export { NewSheet };

/** P-100: what the filled Resume says — the top row's step (its values in place); on a wait, its routine (the wait's words are not a step to do); at the edge, its Plan. */
export function resumeLabel(t: Tile): string {
  if (t.action === 'plan') return `Plan ${t.name}`;
  if (t.state === 'waiting') return `Resume ${t.name}`;
  const step = t.atParts ? partsText(t.atParts) : (t.at ?? '');
  return step ? `Resume ${step}` : `Resume ${t.name}`;
}

/** F-2 (audit F7): what the filled Resume resumes, said after its name when its words are a step's ("In Make tea"); '' when they name it already. */
export function resumeFor(t: Tile): string {
  const label = resumeLabel(t);
  return label === `Resume ${t.name}` || label === `Plan ${t.name}` ? '' : `In ${t.name}`;
}

/** F-2 (audit F8): why the filled Resume is off — another run is running (named, when it is on home). */
export function offWhy(running: string | undefined): string {
  return running ? `“${running}” is running. Pause it first.` : 'Another routine is running. Pause it first.';
}

/** P-100: where a row's run sits — its levels, its routine first; past three, the first and the last two. */
export function shortPath(path: string[] | undefined): string {
  const p = path ?? [];
  if (p.length < 2) return '';
  return (p.length > 3 ? [p[0], '…', ...p.slice(-2)] : p).join(' › ');
}

interface TileProps {
  tile: Tile;
  /** P-100: the top row of the queue (what the filled Resume resumes). */
  first: boolean;
  /** P-100: its grip (none when there is nothing to reorder, or too narrow). */
  grip?: React.ReactNode;
  /** P-100: it is being dragged. */
  dragging: boolean;
  /** Its one action: Resume (its body, for a run), Start, or — at the edge — Plan. */
  onPress: () => void;
  /** Its Plan (the word). */
  onPlan: () => void;
  /** Something else is running: its Resume or Start is shown, not available until that is paused. */
  unavailable: boolean;
  /** P-101 amendment (ruling 9): a paused run's ··· (Start over). */
  onMore?: () => void;
  /** P-102 audit F5: the ··· itself (its menu is anchored to it). */
  moreRef?: (el: ViewRef | null) => void;
  /** P-109: its routine has places — the one door beside the name (none without). */
  onPlaces?: () => void;
  /** P-108: + Add on one of its kept lists. */
  onKept?: (kept: { seq: string; list: string }) => void;
}

const WEB = Platform.OS === 'web';
const RING_INK = WEB ? ({ outlineStyle: 'solid', outlineWidth: 2, outlineColor: G.ink, outlineOffset: 3 } as object) : null;

/**
 * A tile: the routine's colour, its name, where its run is (P-96: with its values in place, marked as
 * values — inverted). P-101 (ruling 5): a run's tile BODY is its way back in — a button, "Resume <name>"
 * (at the edge: "Plan <name>") — with Plan beside it; the run touched last says "Last ran" (P-110). A routine with
 * nothing going has Start (outlined, never filled) and Plan.
 */
function TileBox({ tile, first, grip, dragging, onPress, onPlan, unavailable, onMore, moreRef, onPlaces, onKept }: TileProps) {
  const hue = hueOf(tile.hue);
  const l = tileLine(tile);
  const where = shortPath(tile.path);
  const color = G.ink;
  const going = tile.state !== 'idle';
  const body = (
    <>
      <View style={styles.tileHead}>
        <T ink bold size={18} style={styles.tileName}>
          {tile.name}
        </T>
        {/* The run touched last: a small mark in words (not colour alone). P-110 (the owner: "last is relative … ambiguous"): "Last ran". */}
        {tile.current && going && (
          <T ink bold style={styles.last} testID="go-tile-last">
            Last ran
          </T>
        )}
      </View>
      {(!!l.line || !!l.mark) && (
        <View style={styles.tileLine}>
          {/* P-103 (10): ⧗ for waiting; a paused tile has no mark (❚❚ is the runner's Pause alone) — its Resume says it. */}
          {l.mark === 'wait' && <Mark name="wait" size={20} color={color} />}
          {!!l.line && (
            <T ink style={styles.tileName} testID="go-tile-line">
              {l.parts ? <Parts parts={l.parts} ink={color} on={hue.c} /> : l.line}
            </T>
          )}
        </View>
      )}
      {!!where && (
        <T ink style={styles.tileName} testID="go-tile-path">
          {where}
        </T>
      )}
      {!!l.reason && (
        <T ink bold testID="go-tile-reason">
          {l.reason}
        </T>
      )}
    </>
  );
  // What its body's button says: the action and the name, then what the body shows.
  const said = [l.spoken, tile.current && going ? 'Last ran' : '', l.line, where, l.reason].filter(Boolean).join(', ');
  return (
    <View
      style={[styles.tile, { backgroundColor: hue.c }, hard(6, hue.d), dragging && styles.tileDragging]}
      testID="go-tile"
      role="group"
      aria-label={[l.says, where].filter(Boolean).join(', ')}
      accessibilityLabel={[l.says, where].filter(Boolean).join(', ')}
      {...{ dataSet: { state: tile.state, current: tile.current ? 'true' : 'false', routine: tile.routineId, run: tile.runId ?? '', first: first ? 'true' : 'false', dragging: dragging ? 'true' : 'false' } }}>
      <View style={styles.tileTop}>
      {grip}
      <View style={[styles.tileBody, going && unavailable && styles.tileOff]}>
        {body}
        {/* The body's own button, over it (the whole body is the target): its name is what it does and what the body shows. */}
        {going && (
          <Pressable
            onPress={onPress}
            disabled={unavailable}
            accessibilityRole="button"
            accessibilityLabel={said}
            accessibilityState={{ disabled: unavailable }}
            testID="go-tile-body"
            style={(state) => [StyleSheet.absoluteFill, (state as { focused?: boolean }).focused && RING_INK]}
          />
        )}
      </View>
      </View>
      <View style={styles.tileFoot}>
        {/* Nothing going: Start (none with no steps yet — Plan is where the first step is added). */}
        {!going && !tile.empty && <Btn ink kind="outline" disabled={unavailable} label={l.button} spoken={l.spoken} onPress={onPress} style={styles.tileBtn} />}
        {/* P-103 (4; audit F-3): a run's way back in, in words, where Start sits — its body still resumes too. */}
        {going && tile.action === 'resume' && <Btn ink kind="outline" disabled={unavailable} label="Resume" spoken={l.spoken} onPress={onPress} style={styles.tileBtn} testID="go-tile-resume" />}
        {tile.action !== 'plan' && <Btn ink kind="outline" label="Plan" spoken={`Plan ${tile.name}`} onPress={onPlan} style={going || tile.empty ? styles.tileBtn : styles.tilePlanBtn} />}
        {/* P-109 (B-18; the UI audit: beside the name it broke the name in a half tile): one door, after Plan and before ···,
            only when the routine has places — a mark-only button about this routine alone. */}
        {onPlaces && <Btn ink kind="plain" mark="places" spoken={`Places for ${tile.name}`} onPress={onPlaces} testID="go-tile-places" />}
        {/* P-108 (B-16): + Add on each kept list, from home — no count. */}
        {tile.kept?.map((k) => (
          <Btn key={k.seq} ink kind="plain" mark="add" label={k.list} spoken={`Add to ${k.list} in ${tile.name}`} onPress={() => onKept?.(k)} testID="go-tile-kept-add" dataSet={{ list: k.list }} />
        ))}
        {onMore && <Btn ref={moreRef} ink kind="plain" mark="more" spoken={`More for ${tile.name}`} onPress={onMore} testID="go-tile-more" />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minHeight: 0 },
  empty: { paddingVertical: SP.s6, alignItems: 'center' },
  emptyWords: { textAlign: 'center' },
  away: { opacity: 0 },
  bar: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingLeft: SP.s3, paddingRight: SP.s2, gap: SP.s1 },
  settings: { width: TARGET, paddingHorizontal: 0, justifyContent: 'center' },
  list: { paddingHorizontal: SP.s3, paddingTop: SP.s1, paddingBottom: SP.s3, gap: SP.s3 },
  queue: { gap: SP.s3 - 2 },
  tile: { padding: SP.s3 - 4, gap: SP.s1, marginRight: 6, marginBottom: 6 },
  tileTop: { flexDirection: 'row', alignItems: 'stretch' },
  // The row being dragged stays where it is, dashed; the line shows where it goes (as Plan's rows).
  tileDragging: { borderWidth: 2, borderStyle: 'dashed', borderColor: G.ink },
  grip: { marginLeft: -(SP.s3 - 4), marginTop: -(SP.s3 - 4), alignSelf: 'flex-start' },
  dropLine: { position: 'absolute', left: 0, right: 0, height: 4, backgroundColor: G.text },
  resume: { paddingHorizontal: SP.s3, paddingBottom: SP.s3, gap: SP.s1 },
  // (A description's words: read by a screen reader through `aria-describedby`, never laid out.)
  unseen: { display: 'none' },
  tileHead: { flexDirection: 'row', alignItems: 'flex-start', gap: SP.s1 },
  last: { borderWidth: 2, borderColor: G.ink, paddingHorizontal: SP.s1, lineHeight: 22 },
  tileBody: { flex: 1, minWidth: 0, gap: SP.s1, minHeight: TARGET },
  tileOff: { opacity: 0.6 },
  tileName: { flex: 1, minWidth: 0 },
  tileLine: { flexDirection: 'row', alignItems: 'flex-start', gap: SP.s1 },
  tileFoot: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.s2, marginTop: 'auto', paddingTop: SP.s2 },
  // Each as wide as its word needs, sharing what is left (Resume more than Plan); too narrow for both, Plan goes beneath.
  tileBtn: { flexGrow: 2, flexShrink: 0, flexBasis: 'auto', paddingHorizontal: SP.s2 },
  tilePlanBtn: { flexGrow: 1, flexShrink: 0, flexBasis: 'auto', paddingHorizontal: SP.s2 },
  // The side doors: a row of two halves, left and right, always in the same places.
  doors: { flexDirection: 'row', gap: SP.s2, paddingHorizontal: SP.s3, paddingTop: SP.s1, paddingBottom: SP.s3 },
  door: { flexGrow: 1, flexShrink: 1, flexBasis: 0 },
});
