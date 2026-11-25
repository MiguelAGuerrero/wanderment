/**
 * B-11 slice 1 (P-86), B-12 (P-90): home (B-11 §9b; B-12 v8) — everything you have open is a tile in
 * its routine's colour (the name, where it is and in which mode — "at <step>" with Resume, or
 * "planning · …" with Plan, drawn as the Plan surface is — or Start), in a fixed order, then a New
 * tile, and the prompt "I'm going to…" at the bottom, in thumb reach. Typing filters the tiles, then
 * lists other routines and things done before, with "New: <words>" last. Nothing starts until a row is
 * chosen; Return takes the first, which is always marked. `/go` opens where you left off — the mode
 * you were in — once per load.
 */
import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { tileLine } from '@/domain/goText';
import { leftOff, Tile } from '@/domain/runView';
import { searchStarts, StartRow } from '@/domain/starts';
import { useStore } from '@/store/useStore';

import { Mark } from './marks';
import { Notice, useRunUndo } from './Notice';
import { decideWhere, whereDecided } from './session';
import { G, hueOf, SP, TARGET } from './tokens';
import { Btn, Field, focusOn, focusSoon, GoScreen, H1, hard, InputRef, T, TextRef, useKeys } from './ui';

const WEB = Platform.OS === 'web';

export function GoHome() {
  const data = useStore((s) => s.data);
  const focused = useIsFocused();
  const act = useStore.getState;
  const [query, setQuery] = useState('');
  const field = useRef<InputRef>(null);
  const { width } = useWindowDimensions();

  // Where you left off, decided once per load: the runner, Plan, the paused screen, or here.
  const [first] = useState(() => (whereDecided() ? { kind: 'home' as const, runId: undefined } : leftOff(data)));
  useEffect(() => {
    decideWhere();
    if (first.kind === 'runner') router.push(`/go/run/${first.runId}`);
    else if (first.kind === 'plan') router.push(`/go/run/${first.runId}/plan`);
    else if (first.kind === 'paused') router.push(`/go/run/${first.runId}/paused`);
  }, [first]);
  // Until it has gone there (and come back), this screen shows nothing: no flash of tiles on the way to a run.
  const [back, setBack] = useState(false);
  useFocusEffect(useCallback(() => () => setBack(true), []));
  const here = first.kind === 'home' || back;
  // On every arrival the title has the focus (never nothing; not the prompt: that would raise the keyboard).
  const title = useRef<TextRef>(null);
  useEffect(() => {
    if (focused && here) focusSoon(title);
  }, [focused, here]);

  const typed = query.trim();
  const rows = searchStarts(data, query);
  const tiles = rows.filter((r): r is StartRow & { tile: Tile } => r.kind === 'tile' && !!r.tile);
  const others = typed ? rows.filter((r) => r.kind !== 'tile') : [];
  // One thing at a time: while a run is running it is the only thing home lets you resume or start
  // (its tile's Resume, filled). Every other Resume and Start is shown, unavailable, until you pause
  // it — never a silent switch. Plan and New run nothing (New makes the routine only), so they stay.
  const now = leftOff(data);
  const runningId = now.kind === 'runner' ? now.runId : undefined;
  const running = !!runningId;
  const busy = (row: StartRow) => running && row.runId !== runningId && (row.action === 'resume' || row.action === 'start');

  /** A routine's Plan: its run's (the run is put in Plan first: one write), or — with no run — the routine's own. */
  const toPlan = (routineId: string, runId?: string) => {
    if (runId && !act().planRun(runId).ok) return;
    setQuery('');
    router.push(runId ? `/go/run/${runId}/plan` : `/go/routine/${routineId}`);
  };
  /** New: the routine only (named, on home, no run), then its Plan with the open row focused. Nothing typed: the prompt, to say what. */
  const create = (words: string) => {
    if (!words.trim()) return focusOn(field);
    const did = act().createRoutine(words);
    if (did.ok && did.routineId) toPlan(did.routineId);
  };
  /** A row is chosen: only now does anything start. Refused: nothing changes, the words stay. */
  const choose = (row: StartRow) => {
    const s = act();
    if (row.action === 'new') return create(row.words);
    if (row.action === 'plan') return row.routineId && toPlan(row.routineId, row.runId);
    // Nothing to start yet (no steps): its Plan is where the first is added.
    if (row.tile?.empty && row.routineId) return toPlan(row.routineId);
    const did = row.action === 'resume' && row.runId ? s.resumeRun(row.runId) : row.routineId ? s.startRoutine(row.routineId) : undefined;
    if (did && !did.ok && did.reason === 'empty' && row.routineId) return toPlan(row.routineId);
    if (!did?.ok || !did.runId) return;
    setQuery('');
    router.push(`/go/run/${did.runId}`);
  };

  const can = useRunUndo();
  /** After Undo here: what came back (a run that had ended is running again: its runner; one ended at the edge: its Plan). */
  const undone = () => {
    const back = leftOff(useStore.getState().data);
    // Only what the Undo brought back: a run that was here all along (left in Plan, say) is not gone to.
    const came = back.kind !== now.kind || back.runId !== now.runId;
    if (came && back.kind === 'runner') router.push(`/go/run/${back.runId}`);
    else if (came && back.kind === 'plan') router.push(`/go/run/${back.runId}/plan`);
    else focusOn(field);
  };
  useKeys(
    focused,
    {
      'mod+z': () => {
        if (!can) return;
        can.undo();
        undone();
      },
      Escape: () => setQuery(''),
    },
    true,
  );

  const columns = width >= 340 ? 2 : 1;
  return (
    <GoScreen testID="go-home" settled={here}>
      <View style={[styles.flex, !here && styles.away]}>
      <View style={styles.bar}>
        <H1 ref={title} style={styles.title}>{running ? 'Running' : 'Nothing running'}</H1>
        <Btn kind="plain" mark="gear" spoken="Settings" onPress={() => router.push('/go/settings')} style={styles.settings} testID="go-settings-btn" />
      </View>
      <ScrollView style={styles.flex} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" testID="go-tiles">
        <View style={styles.grid}>
          {tiles.map((r) => (
            <TileBox key={r.tile.routineId} tile={r.tile} first={!!typed && r.first} wide={columns === 1} onPress={() => choose(r)} onPlan={() => toPlan(r.tile.routineId, r.tile.runId)} only={running && r.runId === runningId} unavailable={busy(r)} />
          ))}
          <Pressable
            onPress={() => create(typed)}
            accessibilityRole="button"
            accessibilityLabel={typed ? `New: ${typed}` : 'New'}
            testID="go-new"
            style={(state) => [styles.tile, styles.newTile, columns === 1 ? styles.tileWide : [styles.tileHalf, styles.newHalf], (state as { focused?: boolean }).focused && RING]}>
            <T bold size={18}>
              New
            </T>
          </Pressable>
        </View>
        {others.length > 0 && (
          <View style={styles.rows} testID="go-rows">
            {others.map((r) => (
              <Pressable
                key={`${r.kind}:${r.routineId ?? r.words}`}
                onPress={() => choose(r)}
                disabled={busy(r)}
                accessibilityRole="button"
                accessibilityState={{ disabled: busy(r) }}
                accessibilityLabel={r.kind === 'new' ? `New: ${r.words}` : `Start ${r.words}`}
                testID={`go-row-${r.kind}`}
                {...{ dataSet: { first: r.first ? 'true' : 'false' } }}
                style={(state) => [styles.row, r.first && styles.rowFirst, busy(r) && styles.rowOff, (state as { focused?: boolean }).focused && RING]}>
                <Mark name={r.kind === 'new' ? 'add' : r.kind === 'routine' ? 'routine' : 'lines'} color={busy(r) ? G.dim : G.text} />
                <T style={styles.rowWords} dim={busy(r)}>
                  {r.kind === 'new' ? (
                    <>
                      <T dim>New: </T>
                      {r.words}
                    </>
                  ) : (
                    <>
                      <T dim>Start </T>
                      {r.words}
                    </>
                  )}
                </T>
                {r.first && <Mark name="return" color={G.text} />}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
      <Notice onUndone={undone} />
      <View style={styles.prompt}>
        <T dim style={styles.lead} accessible={false} aria-hidden>
          I’m going to
        </T>
        <Field
          ref={field}
          bare
          value={query}
          onChangeText={setQuery}
          placeholder="…"
          accessibilityLabel="I’m going to…"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          submitBehavior="submit"
          onSubmitEditing={() => {
            // Return takes the first, marked row; with nothing typed it takes nothing.
            const top = typed ? rows.find((r) => r.first) : undefined;
            if (top) choose(top);
          }}
          style={styles.promptField}
          testID="go-prompt"
        />
      </View>
      </View>
    </GoScreen>
  );
}

const RING = WEB ? ({ outlineStyle: 'solid', outlineWidth: 2, outlineColor: G.focus, outlineOffset: 3 } as object) : null;

interface TileProps {
  tile: Tile;
  first: boolean;
  wide: boolean;
  /** Its one button: Resume, Start, or — left in Plan — Plan. */
  onPress: () => void;
  /** Its Plan (the word, on a tile that is not in Plan already). */
  onPlan: () => void;
  /** It is the run that is running: its Resume is the one filled action. */
  only: boolean;
  /** Something else is running: its Resume or Start is shown, not available until that is paused. */
  unavailable: boolean;
}

/**
 * A tile: the routine's colour, its name, where its run is, and Resume or Start (in words, outlined:
 * never the filled button) with Plan beside it. A run left in Plan is drawn as the Plan surface is —
 * dark, outlined in its colour — and says "planning · …" with Plan as its one button (B-12 v8).
 */
function TileBox({ tile, first, wide, onPress, onPlan, only, unavailable }: TileProps) {
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
      {...{ dataSet: { state: tile.state, current: tile.current ? 'true' : 'false', first: first ? 'true' : 'false', routine: tile.routineId } }}>
      <View style={styles.tileHead}>
        {tile.current && (
          <View role="img" aria-label="You are here" accessibilityLabel="You are here" style={styles.hereMark}>
            <Mark name="here" size={20} color={color} />
          </View>
        )}
        <T ink={ink} bold size={18} style={styles.tileName}>
          {tile.name}
        </T>
        {first && <Mark name="return" color={color} />}
      </View>
      {(!!l.line || !!l.mark) && (
        <View style={styles.tileLine}>
          {l.mark && <Mark name={l.mark === 'wait' ? 'wait' : 'pause'} size={20} color={color} />}
          {!!l.line && (
            <T ink={ink} style={styles.tileName} testID="go-tile-line">
              {l.line}
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
        {/* Nothing to start yet (no steps): no Start, dimmed or otherwise — Plan is where the first step is added. */}
        {!tile.empty && <Btn ink={ink} kind={only ? 'filled' : 'outline'} disabled={unavailable} label={l.button} spoken={l.spoken} onPress={onPress} style={styles.tileBtn} />}
        {!planning && <Btn ink kind="outline" label="Plan" spoken={`Plan ${tile.name}`} onPress={onPlan} style={tile.empty ? styles.tileBtn : styles.tilePlanBtn} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minHeight: 0 },
  away: { opacity: 0 },
  bar: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingLeft: SP.s3, paddingRight: SP.s2, gap: SP.s1 },
  settings: { width: TARGET, paddingHorizontal: 0, justifyContent: 'center' },
  title: { flex: 1, minWidth: 0 },
  list: { paddingHorizontal: SP.s3, paddingTop: SP.s2, paddingBottom: SP.s3, gap: SP.s3 },
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
  // Tile-shaped, outlined (it has no colour of its own yet); never wider than a tile.
  newTile: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: G.line },
  newHalf: { flexGrow: 0, flexBasis: '47%' },
  rows: { borderWidth: 2, borderColor: G.line, backgroundColor: G.surf },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: SP.s3, paddingHorizontal: SP.s3, paddingVertical: SP.s2, borderBottomWidth: 1, borderBottomColor: G.line },
  rowFirst: { backgroundColor: G.surf2, borderLeftWidth: 4, borderLeftColor: G.text },
  rowWords: { flex: 1, minWidth: 0 },
  rowOff: { borderStyle: 'dashed', borderWidth: 2, borderColor: G.line },
  prompt: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginHorizontal: SP.s3,
    marginBottom: SP.s3 + 4,
    marginRight: SP.s3 + 4,
    borderWidth: 2,
    borderColor: G.text,
    backgroundColor: G.surf,
    paddingHorizontal: SP.s3,
    ...hard(4, G.line),
  },
  lead: { paddingRight: SP.s2 },
  promptField: { flex: 1, minWidth: 96 },
});
