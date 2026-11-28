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
 */
import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { tileLine } from '@/domain/goText';
import { placesShown } from '@/domain/places';
import { homeGroups, myRoutines } from '@/domain/routines';
import { leftOff, opensAt, Tile } from '@/domain/runView';
import { useStore } from '@/store/useStore';

import { Mark } from './marks';
import { Notice, useRunUndo } from './Notice';
import { decideWhere, wentHome, whereDecided } from './session';
import { G, hueOf, SP, TARGET } from './tokens';
import { Btn, Confirm, Field, focusOn, focusSoon, GoScreen, hard, HiddenH1, Menu, MenuItem, MenuSep, Sheet, T, TextRef, useKeys, ViewRef } from './ui';
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

  const groups = homeGroups(data);
  const tiles = [...groups.ongoing, ...groups.finishing];
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
  /** P-101 amendment (ruling 9): a paused tile's ··· (its menu), then Start over asked. */
  const [tileMenu, setTileMenu] = useState<Tile | null>(null);
  const [restarting, setRestarting] = useState<Tile | null>(null);
  /** P-103 (6): "End this run" asked, for this tile's run. */
  const [ending, setEnding] = useState<Tile | null>(null);
  /** P-109: a tile's Places door — its routine's places, to open (read-only here). */
  const [placesOf, setPlacesOf] = useState<Tile | null>(null);
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
    const did = t.action === 'resume' && t.runId ? s.resumeRun(t.runId) : s.startRoutine(t.routineId);
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
    focused && !naming && !tileMenu && !restarting && !ending && !placesOf && !keptOf,
    {
      'mod+z': () => {
        if (!can) return;
        can.undo();
        undone();
      },
    },
    true,
  );

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
            <MenuItem
              label="Start over"
              spoken={`Start over: ${tileMenu.name}`}
              testID="go-tile-restart"
              onPress={() => {
                setRestarting(tileMenu);
                setTileMenu(null);
              }}
            />
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
        {(
          [
            ['ongoing', 'Ongoing', groups.ongoing],
            ['finishing', 'Finishing', groups.finishing],
          ] as const
        ).map(
          ([key, heading, group]) =>
            group.length > 0 && (
              <View key={key} style={styles.group} testID="go-home-group" {...{ dataSet: { group: key } }}>
                <T bold dim role="heading" aria-level={2} accessibilityRole="header" testID="go-home-heading">
                  {heading}
                </T>
                <View style={styles.grid}>
                  {group.map((t) => (
                    <TileBox key={t.routineId} tile={t} wide={columns === 1} onPress={() => choose(t)} onPlan={() => toPlan(t.routineId, t.runId)} onMore={t.runId && t.state !== 'running' ? () => setTileMenu(t) : undefined} moreRef={(el) => { mores[t.routineId] = el; }} unavailable={busy(t)} onPlaces={placesShown(data.routines[t.routineId]?.places).length > 0 ? () => setPlacesOf(t) : undefined} onKept={(k) => setKeptOf(k)} />
                  ))}
                </View>
              </View>
            ),
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
      </View>
    </GoScreen>
  );
}

/**
 * New (P-95, P-96): its own sheet — the name, then Plan (the routine is made only now, and its Plan
 * opens). Return in the field is the same as Plan.
 */
export function NewSheet({ onMake, onClose, fallback }: { onMake: (words: string) => void; onClose: () => void; fallback: { current: unknown } }) {
  const [name, setName] = useState('');
  const make = () => (name.trim() ? onMake(name) : undefined);
  return (
    <Sheet title="New routine" onClose={onClose} testID="go-new-sheet" fallback={fallback}>
      <Field value={name} onChangeText={setName} accessibilityLabel="Name" placeholder="Name" autoFocus submitBehavior="submit" returnKeyType="go" onSubmitEditing={make} testID="go-new-name" {...{ dataSet: { first: 'true' } }} />
      <Btn kind="filled" label="Plan" spoken={name.trim() ? `Plan ${name.trim()}` : 'Plan'} disabled={!name.trim()} onPress={make} size={18} testID="go-new-plan" />
      <Btn label="Close" onPress={onClose} />
    </Sheet>
  );
}

interface TileProps {
  tile: Tile;
  wide: boolean;
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
function TileBox({ tile, wide, onPress, onPlan, unavailable, onMore, moreRef, onPlaces, onKept }: TileProps) {
  const hue = hueOf(tile.hue);
  const l = tileLine(tile);
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
      {!!l.reason && (
        <T ink bold testID="go-tile-reason">
          {l.reason}
        </T>
      )}
    </>
  );
  // What its body's button says: the action and the name, then what the body shows.
  const said = [l.spoken, tile.current && going ? 'Last ran' : '', l.line, l.reason].filter(Boolean).join(', ');
  return (
    <View
      style={[styles.tile, wide ? styles.tileWide : styles.tileHalf, { backgroundColor: hue.c }, hard(6, hue.d)]}
      testID="go-tile"
      role="group"
      aria-label={l.says}
      accessibilityLabel={l.says}
      {...{ dataSet: { state: tile.state, current: tile.current ? 'true' : 'false', routine: tile.routineId } }}>
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
  group: { gap: SP.s2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.s3 - 2 },
  tile: { padding: SP.s3 - 4, gap: SP.s1, minHeight: 132, marginRight: 6, marginBottom: 6 },
  tileHalf: { flexGrow: 1, flexShrink: 1, flexBasis: '40%', maxWidth: '100%' },
  tileWide: { flexBasis: '100%', flexGrow: 1 },
  tileHead: { flexDirection: 'row', alignItems: 'flex-start', gap: SP.s1 },
  last: { borderWidth: 2, borderColor: G.ink, paddingHorizontal: SP.s1, lineHeight: 22 },
  tileBody: { gap: SP.s1, minHeight: TARGET },
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
