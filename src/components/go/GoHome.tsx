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
 * routines with nothing going); the run touched last carries a small "last" mark, in words. A run's tile
 * body is the way back in — "Resume <name>" — and its Plan button stays; the filled Resume bar is gone.
 * Nothing reads "planning": a run is running or paused.
 */
import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { tileLine } from '@/domain/goText';
import { homeShown, leftOff, opensAt, Tile } from '@/domain/runView';
import { useStore } from '@/store/useStore';

import { Mark } from './marks';
import { Notice, useRunUndo } from './Notice';
import { decideWhere, wentHome, whereDecided } from './session';
import { G, hueOf, SP, TARGET } from './tokens';
import { Btn, Confirm, Field, focusOn, focusSoon, GoScreen, hard, HiddenH1, Sheet, T, TextRef, useKeys, ViewRef } from './ui';
import { Parts } from './Values';

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

  const tiles = homeShown(data);
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
    focused && !naming && !tileMenu && !restarting,
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
        ) : restarting?.runId ? (
          <Confirm
            title={`Start ${restarting.name} over? Your place and values in it go.`}
            action="Start over"
            testID="go-restart-confirm"
            onCancel={() => setRestarting(null)}
            onAct={() => {
              act().restartRun(restarting.runId!, 0);
              setRestarting(null);
              focusOn(title);
            }}
          />
        ) : tileMenu ? (
          <Sheet title={tileMenu.name} onClose={() => setTileMenu(null)} testID="go-tile-menu" fallback={title}>
            <Btn
              kind="plain"
              label="Start over"
              spoken={`Start over: ${tileMenu.name}`}
              testID="go-tile-restart"
              onPress={() => {
                setRestarting(tileMenu);
                setTileMenu(null);
              }}
            />
            <Btn label="Close" onPress={() => setTileMenu(null)} />
          </Sheet>
        ) : null
      }>
      <View style={[styles.flex, !here && styles.away]}>
      {/* The top is context only (P-96): no title in words; ⚙ top right. The heading is for a screen reader and for focus. */}
      <HiddenH1 ref={title}>Home</HiddenH1>
      <View style={styles.bar}>
        <Btn kind="plain" mark="gear" spoken="Settings" onPress={() => router.push('/go/settings')} style={styles.settings} testID="go-settings-btn" />
      </View>
      <ScrollView style={styles.flex} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" testID="go-tiles">
        <View style={styles.grid}>
          {tiles.map((t) => (
            <TileBox key={t.routineId} tile={t} wide={columns === 1} onPress={() => choose(t)} onPlan={() => toPlan(t.routineId, t.runId)} onMore={t.runId && t.state !== 'running' ? () => setTileMenu(t) : undefined} unavailable={busy(t)} />
          ))}
        </View>
      </ScrollView>
      {/* Its own row, in the flow above the side doors: never over a tile (ruling 8). */}
      <Notice onUndone={undone} />
      <View style={styles.doors} testID="go-side-doors">
        {/* Left: another place (My routines, once it exists). Right: + New. */}
        <View style={styles.door} />
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
function NewSheet({ onMake, onClose, fallback }: { onMake: (words: string) => void; onClose: () => void; fallback: { current: unknown } }) {
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
}

const WEB = Platform.OS === 'web';
const RING_INK = WEB ? ({ outlineStyle: 'solid', outlineWidth: 2, outlineColor: G.ink, outlineOffset: 3 } as object) : null;

/**
 * A tile: the routine's colour, its name, where its run is (P-96: with its values in place, marked as
 * values — inverted). P-101 (ruling 5): a run's tile BODY is its way back in — a button, "Resume <name>"
 * (at the edge: "Plan <name>") — with Plan beside it; the run touched last says "last". A routine with
 * nothing going has Start (outlined, never filled) and Plan.
 */
function TileBox({ tile, wide, onPress, onPlan, unavailable, onMore }: TileProps) {
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
        {/* The run touched last: a small mark in words (not colour alone). */}
        {tile.current && going && (
          <T ink bold style={styles.last} testID="go-tile-last">
            last
          </T>
        )}
      </View>
      {(!!l.line || !!l.mark) && (
        <View style={styles.tileLine}>
          {l.mark && <Mark name={l.mark === 'wait' ? 'wait' : 'pause'} size={20} color={color} />}
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
  const said = [l.spoken, tile.current && going ? 'last' : '', l.line, l.reason].filter(Boolean).join(', ');
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
        {tile.action !== 'plan' && <Btn ink kind="outline" label="Plan" spoken={`Plan ${tile.name}`} onPress={onPlan} style={going || tile.empty ? styles.tileBtn : styles.tilePlanBtn} />}
        {onMore && <Btn ink kind="plain" mark="more" spoken={`More for ${tile.name}`} onPress={onMore} testID="go-tile-more" />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minHeight: 0 },
  away: { opacity: 0 },
  bar: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingLeft: SP.s3, paddingRight: SP.s2, gap: SP.s1 },
  settings: { width: TARGET, paddingHorizontal: 0, justifyContent: 'center' },
  list: { paddingHorizontal: SP.s3, paddingTop: SP.s1, paddingBottom: SP.s3, gap: SP.s3 },
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
