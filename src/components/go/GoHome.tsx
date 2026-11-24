/**
 * B-11 slice 1 (P-86): the new home (B-11 §9b) — everything you have open is a tile in its routine's
 * colour (the name, where it is, Resume or Start), in a fixed order, and the prompt "I'm going to…"
 * at the bottom, in thumb reach. Typing filters the tiles, then lists other routines and things done
 * before, with "New: <words>" last. Nothing starts until a row is chosen; Return takes the first,
 * which is always marked. `/go` opens where you left off, once per load.
 */
import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { tileLine } from '@/domain/goText';
import { leftOff, Tile } from '@/domain/runView';
import { searchStarts, StartRow } from '@/domain/starts';
import { useStore } from '@/store/useStore';

import { Mark } from './marks';
import { KeepSheet, Notice, useRunUndo } from './Notice';
import { decideWhere, whereDecided } from './session';
import { G, hueOf, SP, TARGET } from './tokens';
import { Btn, Field, focusOn, focusSoon, GoScreen, H1, hard, InputRef, T, TextRef, useKeys } from './ui';

const WEB = Platform.OS === 'web';

export function GoHome() {
  const data = useStore((s) => s.data);
  const focused = useIsFocused();
  const offer = useStore((s) => (focused ? s.runOffer : undefined));
  const act = useStore.getState;
  const [query, setQuery] = useState('');
  const field = useRef<InputRef>(null);
  const { width } = useWindowDimensions();

  // Where you left off, decided once per load: the runner, the paused screen, or here.
  const [first] = useState(() => (whereDecided() ? { kind: 'home' as const, runId: undefined } : leftOff(data)));
  useEffect(() => {
    decideWhere();
    if (first.kind === 'runner') router.push(`/go/run/${first.runId}`);
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
  // One thing at a time: while a run is running it is the only thing home lets you go to (its tile's
  // Resume, filled). Everything else is shown, unavailable, until you pause it — never a silent switch.
  const now = leftOff(data);
  const runningId = now.kind === 'runner' ? now.runId : undefined;
  const running = !!runningId;
  const busy = (row: StartRow) => running && row.runId !== runningId;

  /** A row is chosen: only now does anything start. Refused: nothing changes, the words stay. */
  const choose = (row: StartRow) => {
    const s = act();
    const did = row.action === 'new' ? s.startNew(row.words) : row.action === 'resume' && row.runId ? s.resumeRun(row.runId) : row.routineId ? s.startRoutine(row.routineId) : undefined;
    if (!did?.ok || !did.runId) return;
    setQuery('');
    router.push(`/go/run/${did.runId}`);
  };

  const can = useRunUndo();
  /** After Undo here: what came back (a run that had ended is running again: its runner). */
  const undone = () => {
    const now = leftOff(useStore.getState().data);
    if (now.kind === 'runner') router.push(`/go/run/${now.runId}`);
    else focusOn(field);
  };
  useKeys(
    focused && !offer,
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
    <GoScreen testID="go-home" settled={here} layer={offer ? <KeepSheet runId={offer.runId} ids={offer.changeIds} onClose={act().dismissRunOffer} /> : null}>
      <View style={[styles.flex, !here && styles.away]}>
      <View style={styles.bar}>
        <Btn kind="plain" mark="back" spoken="Back to Wanderment" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.back} />
        <H1 ref={title} style={styles.title}>{running ? 'Running' : 'Nothing running'}</H1>
      </View>
      <ScrollView style={styles.flex} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" testID="go-tiles">
        <View style={styles.grid}>
          {tiles.map((r) => (
            <TileBox key={r.tile.routineId} tile={r.tile} first={!!typed && r.first} wide={columns === 1} onPress={() => choose(r)} only={running && !busy(r)} unavailable={busy(r)} />
          ))}
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

/** A tile: the routine's colour, its name, where its run is, and Resume or Start (in words, outlined: never the filled button). */
function TileBox({ tile, first, wide, onPress, only, unavailable }: { tile: Tile; first: boolean; wide: boolean; onPress: () => void; /** It is the run that is running: its Resume is the one filled action. */ only: boolean; /** Something else is running: shown, not available until that is paused. */ unavailable: boolean }) {
  const hue = hueOf(tile.hue);
  const l = tileLine(tile);
  return (
    <View
      style={[styles.tile, wide ? styles.tileWide : styles.tileHalf, { backgroundColor: hue.c }, hard(6, hue.d)]}
      testID="go-tile"
      role="group"
      aria-label={l.says}
      accessibilityLabel={l.says}
      {...{ dataSet: { state: tile.state, current: tile.current ? 'true' : 'false', first: first ? 'true' : 'false', routine: tile.routineId } }}>
      <View style={styles.tileHead}>
        {tile.current && (
          <View role="img" aria-label="You are here" accessibilityLabel="You are here" style={styles.hereMark}>
            <Mark name="here" size={20} color={G.ink} />
          </View>
        )}
        <T ink bold size={18} style={styles.tileName}>
          {tile.name}
        </T>
        {first && <Mark name="return" color={G.ink} />}
      </View>
      {(!!l.line || !!l.mark) && (
        <View style={styles.tileLine}>
          {l.mark && <Mark name={l.mark === 'wait' ? 'wait' : 'pause'} size={20} color={G.ink} />}
          {!!l.line && (
            <T ink style={styles.tileName} testID="go-tile-line">
              {l.line}
            </T>
          )}
        </View>
      )}
      {!!l.reason && (
        <T ink bold testID="go-tile-reason">
          {l.reason}
        </T>
      )}
      <View style={styles.tileFoot}>
        <Btn ink kind={only ? 'filled' : 'outline'} disabled={unavailable} label={l.button} spoken={l.spoken} onPress={onPress} style={styles.tileBtn} />
        <Btn ink kind="outline" mark="more" spoken={`More for ${tile.name}`} onPress={() => router.push(`/go/routine/${tile.routineId}`)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minHeight: 0 },
  away: { opacity: 0 },
  bar: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: SP.s2, gap: SP.s1 },
  back: { width: TARGET, paddingHorizontal: 0, justifyContent: 'center' },
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
  tileFoot: { flexDirection: 'row', gap: SP.s2, marginTop: 'auto', paddingTop: SP.s2 },
  tileBtn: { flexGrow: 1, flexShrink: 1, flexBasis: 0, paddingHorizontal: SP.s2 },
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
