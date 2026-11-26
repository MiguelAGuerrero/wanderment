/**
 * B-11 slice 1 (P-86), B-12 (P-90), P-96: home (B-11 §9b; B-12 v8) — everything you have open is a
 * tile in its routine's colour (the name, where it is and in which mode — "at <step>" with the run's
 * values in place, or "planning · …", drawn as the Plan surface is), in a fixed order. `/go` opens
 * where you left off — the mode you were in — once per load.
 *
 * P-96 (one navigation scheme): no title in words (no "Nothing running") and no prompt. The run the
 * app is on (paused by Pause, say) is the first tile, marked; its tile carries only what is about it
 * (Plan) and the one filled button, lowest, is "Resume <name>". Above it the side doors: + New (its
 * own sheet asks for the name). The notice has its own row above them, never over a tile.
 */
import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { tileLine } from '@/domain/goText';
import { currentRun, isPlanning, place } from '@/domain/run';
import { homeShown, leftOff, opensAt, Tile } from '@/domain/runView';
import { useStore } from '@/store/useStore';

import { Mark } from './marks';
import { Notice, useRunUndo } from './Notice';
import { decideWhere, wentHome, whereDecided } from './session';
import { G, hueOf, SP, TARGET } from './tokens';
import { Btn, Field, focusOn, focusSoon, GoScreen, hard, HiddenH1, Sheet, T, TextRef, useKeys, ViewRef } from './ui';
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
  // The run the app is on, running or paused (not in Plan): the bottom bar resumes it (P-96).
  const cur = currentRun(data);
  const onIt = now.kind === 'runner' ? now.runId : cur && cur.status === 'paused' && !!place(data, cur) && !isPlanning(data, cur) ? cur.id : undefined;
  const onTile = onIt ? tiles.find((t) => t.runId === onIt && t.action === 'resume') : undefined;
  const busy = (t: Tile) => running && t.runId !== runningId && (t.action === 'resume' || t.action === 'start');

  /** A routine's Plan: its run's (the run is put in Plan first: one write), or — with no run — the routine's own. */
  const toPlan = (routineId: string, runId?: string) => {
    if (runId && !act().planRun(runId).ok) return;
    router.push(runId ? `/go/run/${runId}/plan` : `/go/routine/${routineId}`);
  };
  /** New: its own sheet asks for the name; the routine only (named, on home, no run), then its Plan with the open row focused. */
  const [naming, setNaming] = useState(false);
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
    focused && !naming,
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
    <GoScreen testID="go-home" settled={here} layer={naming ? <NewSheet onMake={create} onClose={() => setNaming(false)} fallback={newBtn} /> : null}>
      <View style={[styles.flex, !here && styles.away]}>
      {/* The top is context only (P-96): no title in words; ⚙ top right. The heading is for a screen reader and for focus. */}
      <HiddenH1 ref={title}>Home</HiddenH1>
      <View style={styles.bar}>
        <Btn kind="plain" mark="gear" spoken="Settings" onPress={() => router.push('/go/settings')} style={styles.settings} testID="go-settings-btn" />
      </View>
      <ScrollView style={styles.flex} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" testID="go-tiles">
        <View style={styles.grid}>
          {tiles.map((t) => (
            <TileBox key={t.routineId} tile={t} wide={columns === 1} onPress={() => choose(t)} onPlan={() => toPlan(t.routineId, t.runId)} resumed={t === onTile} unavailable={busy(t)} />
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
      {/* The one filled button, lowest — or its slot, empty (never filled by something else). */}
      <View style={styles.foot}>
        {onTile ? <Btn kind="filled" label={`Resume ${onTile.name}`} onPress={() => choose(onTile)} size={18} style={styles.forward} testID="go-resume" /> : <View style={styles.emptySlot} />}
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
  /** Its one button: Resume, Start, or — left in Plan — Plan. */
  onPress: () => void;
  /** Its Plan (the word, on a tile that is not in Plan already). */
  onPlan: () => void;
  /** P-96: it is the run the bottom bar resumes: the tile marks it, and carries no Resume of its own. */
  resumed: boolean;
  /** Something else is running: its Resume or Start is shown, not available until that is paused. */
  unavailable: boolean;
}

/**
 * A tile: the routine's colour, its name, where its run is (P-96: with its values in place, marked as
 * values — inverted), and Resume or Start (in words, outlined: never the filled button) with Plan beside
 * it. A run left in Plan is drawn as the Plan surface is — dark, outlined in its colour — and says
 * "planning · …" with Plan as its one button (B-12 v8).
 */
function TileBox({ tile, wide, onPress, onPlan, resumed, unavailable }: TileProps) {
  const hue = hueOf(tile.hue);
  const l = tileLine(tile);
  const planning = tile.state === 'planning';
  const ink = !planning;
  const color = planning ? G.text : G.ink;
  return (
    <View
      style={[styles.tile, wide ? styles.tileWide : styles.tileHalf, planning ? [styles.tilePlan, { borderColor: hue.c }] : { backgroundColor: hue.c }, hard(6, hue.d)]}
      testID="go-tile"
      role="group"
      aria-label={l.says}
      accessibilityLabel={l.says}
      {...{ dataSet: { state: tile.state, current: tile.current ? 'true' : 'false', resumed: resumed ? 'true' : 'false', routine: tile.routineId } }}>
      <View style={styles.tileHead}>
        {tile.current && (
          <View role="img" aria-label="You are here" accessibilityLabel="You are here" style={styles.hereMark}>
            <Mark name="here" size={20} color={color} />
          </View>
        )}
        <T ink={ink} bold size={18} style={styles.tileName}>
          {tile.name}
        </T>
      </View>
      {(!!l.line || !!l.mark) && (
        <View style={styles.tileLine}>
          {l.mark && <Mark name={l.mark === 'wait' ? 'wait' : 'pause'} size={20} color={color} />}
          {!!l.line && (
            <T ink={ink} style={styles.tileName} testID="go-tile-line">
              {l.parts ? <Parts parts={l.parts} ink={color} on={planning ? G.surf : hue.c} /> : l.line}
            </T>
          )}
        </View>
      )}
      {!!l.reason && (
        <T ink={ink} bold testID="go-tile-reason">
          {l.reason}
        </T>
      )}
      <View style={styles.tileFoot}>
        {/* Nothing to start yet (no steps): no Start — Plan is where the first step is added. Resumed by the bottom bar: no Resume here. */}
        {!tile.empty && !resumed && <Btn ink={ink} kind="outline" disabled={unavailable} label={l.button} spoken={l.spoken} onPress={onPress} style={styles.tileBtn} />}
        {!planning && <Btn ink kind="outline" label="Plan" spoken={`Plan ${tile.name}`} onPress={onPlan} style={tile.empty || resumed ? styles.tileBtn : styles.tilePlanBtn} />}
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
  hereMark: { width: 20, height: 24, justifyContent: 'center' },
  tileName: { flex: 1, minWidth: 0 },
  tileLine: { flexDirection: 'row', alignItems: 'flex-start', gap: SP.s1 },
  tileFoot: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.s2, marginTop: 'auto', paddingTop: SP.s2 },
  // Each as wide as its word needs, sharing what is left (Resume more than Plan); too narrow for both, Plan goes beneath.
  tileBtn: { flexGrow: 2, flexShrink: 0, flexBasis: 'auto', paddingHorizontal: SP.s2 },
  tilePlanBtn: { flexGrow: 1, flexShrink: 0, flexBasis: 'auto', paddingHorizontal: SP.s2 },
  tilePlan: { backgroundColor: G.surf, borderWidth: 2 },
  // The side doors: a row of two halves, left and right, always in the same places.
  doors: { flexDirection: 'row', gap: SP.s2, paddingHorizontal: SP.s3, paddingTop: SP.s1, paddingBottom: SP.s2 },
  door: { flexGrow: 1, flexShrink: 1, flexBasis: 0 },
  foot: { paddingHorizontal: SP.s3, paddingBottom: SP.s3 },
  forward: { minHeight: 56 },
  emptySlot: { minHeight: 60 },
});
