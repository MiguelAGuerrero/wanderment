import { Link, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ComponentRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { decorative } from '@/components/a11y';
import { Composer } from '@/components/Composer';
import { useReduceMotion } from '@/components/graph/scopeNav';
import { NightSky } from '@/components/NightSky';
import { useWhileShown } from '@/components/shown';
import { Toast } from '@/components/Toast';
import { moveOffer, promptSize } from '@/domain/trailhead';
import { Id } from '@/domain/types';
import { Kept, LogOptions, recentThreadOrder, useStore } from '@/store/useStore';
import { N } from '@/theme';

export const PROMPT = 'Where are we wandering today?';
const TRAIL: LogOptions = { trail: true };
const web = Platform.OS === 'web';
/** The big type: Space Grotesk where it's installed, else the system's sans (never the browser's serif default). */
const display = Platform.select({ web: '"Space Grotesk", SpaceGrotesk, system-ui, -apple-system, "Segoe UI", sans-serif', default: undefined });

type Focusable = ComponentRef<typeof View> | ComponentRef<typeof Text> | null;
/** Web: moves focus to an element once it has rendered. */
const focusSoon = (el: () => Focusable) => {
  if (web) requestAnimationFrame(() => (el() as unknown as HTMLElement | null)?.focus?.());
};

/**
 * The trailhead (P-65, B-07 slice 1): Home is a night sky and one question. The field ("nothing yet
 * is fine") offers P-61's suggestions only once you type; Return logs exactly as typed, loose, and
 * the words become the billboard ("Kept, loose · Undo", then "Move it?"). "I’m not sure" and "Map"
 * open the graph (Map; P-66 gives "I’m not sure" its own look up).
 */
export function Trailhead() {
  const shown = useIsFocused();
  const data = useStore((st) => st.data);
  const kept = useStore((st) => st.kept);
  const leaveKept = useStore((st) => st.leaveKept);
  const focusLogBox = useStore((st) => st.focusLogBox);
  const warm = useStore((st) => st.showShading);
  const reduce = useReduceMotion();
  const { width, height, fontScale } = useWindowDimensions();
  // The billboard shows while its line is there (after "Next on", its words: the line became the step).
  const board = kept && (kept.moved?.kind === 'next' || !!data.activities[kept.activityId]) ? kept : undefined;

  // Leaving keeps the line as it is (P-65): the billboard goes, and coming back is the question again.
  useWhileShown(
    shown,
    useCallback(() => leaveKept, [leaveKept]),
  );
  // Focus is in the field on open (web: a keyboard is there already; native would raise one unasked),
  // and whenever the billboard gives way to the question again.
  const hadBoard = useRef(false);
  useEffect(() => {
    if (!shown || board) {
      hadBoard.current = !!board;
      return;
    }
    if (web || hadBoard.current) focusLogBox();
    hadBoard.current = false;
  }, [shown, board, focusLogBox]);

  const size = promptSize({ width, height, fontScale });
  return (
    <View style={styles.screen} testID="trailhead">
      {shown && <StatusBar style="light" />}
      <NightSky still={reduce || !shown} warm={warm} />
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.top}>
              <Link href="/map" asChild>
                <Pressable style={styles.mapLink}>
                  <Text style={styles.mapText}>Map</Text>
                </Pressable>
              </Link>
            </View>
            {board ? (
              <Billboard kept={board} />
            ) : (
              <View style={styles.ask}>
                <Text accessibilityRole="header" style={[styles.prompt, { fontSize: size, lineHeight: size }]}>
                  {PROMPT}
                </Text>
                <Composer night autocomplete arrow placeholder="nothing yet is fine" label={PROMPT} logOptions={TRAIL} onLogged={() => true} />
                <Link href="/map" asChild>
                  <Pressable style={styles.unsure}>
                    <Svg width={14} height={14} viewBox="0 0 24 24" {...decorative}>
                      <Path d="M12 2 L13.6 10.4 L22 12 L13.6 13.6 L12 22 L10.4 13.6 L2 12 L10.4 10.4Z" fill={warm ? N.lantern : N.silver} />
                    </Svg>
                    <Text style={styles.unsureText}>I’m not sure</Text>
                  </Pressable>
                </Link>
              </View>
            )}
          </ScrollView>
          <View style={styles.toastSlot} pointerEvents="box-none">
            <Toast />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

/** What the billboard's status says about the kept line. */
function status(kept: Kept, name: (id: Id) => string, attached?: Id) {
  if (kept.moved) return kept.moved.kind === 'next' ? `Next on ${name(kept.moved.threadId)}` : `Logged toward ${name(kept.moved.threadId)}`;
  return attached ? `Logged → ${name(attached)}` : 'Kept, loose';
}

/**
 * After Return (P-65): the words, big; "Kept, loose · Undo"; and quietly below, "Move it?": Next on the
 * guessed wander (only while it has no step), Log toward it, or Somewhere else… (any wander, or a new
 * one). Each is one tap with Undo; leaving without a tap keeps the line as it is.
 */
function Billboard({ kept }: { kept: Kept }) {
  const data = useStore((st) => st.data);
  const leaveKept = useStore((st) => st.leaveKept);
  const moveKept = useStore((st) => st.moveKept);
  const undoKept = useStore((st) => st.undoKept);
  const { width, height, fontScale } = useWindowDimensions();
  const words = useRef<ComponentRef<typeof Text>>(null);
  const undoRef = useRef<ComponentRef<typeof View>>(null);
  const [elsewhere, setElsewhere] = useState(false);
  const [name, setName] = useState('');

  const a = data.activities[kept.activityId];
  const attached = a ? (a.doingId ?? a.toIds[0]) : undefined;
  const loose = !!a && !attached && !kept.moved;
  // Guessed once for the line (not again as moves change the data).
  const offer = useMemo(
    () => (loose ? moveOffer(useStore.getState().data, kept.activityId, recentThreadOrder(useStore.getState().data)) : { canNext: false }),
    [loose, kept.activityId],
  );
  const guess = offer.guess && !data.threads[offer.guess.id]?.hidden ? data.threads[offer.guess.id] : undefined;
  const canNext = !!guess && !guess.next?.trim();
  const others = useMemo(() => {
    const order = recentThreadOrder(data);
    const rank = (id: Id) => (order.indexOf(id) < 0 ? Number.MAX_SAFE_INTEGER : order.indexOf(id));
    return Object.values(data.threads)
      .filter((t) => !t.hidden)
      .sort((x, y) => rank(x.id) - rank(y.id) || x.name.localeCompare(y.name));
  }, [data]);
  const threadName = (id: Id) => data.threads[id]?.name ?? '';

  // The words take focus when they appear (so a screen reader starts there), then Tab reaches Undo and the moves.
  useEffect(() => focusSoon(() => words.current), [kept.activityId]);
  const move = (m: Parameters<typeof moveKept>[0]) => {
    if (!moveKept(m)) return;
    setElsewhere(false);
    setName('');
    focusSoon(() => undoRef.current);
  };

  const size = promptSize({ width, height, fontScale, chars: kept.text.length });
  return (
    <View style={styles.board}>
      <Pressable onPress={leaveKept} accessibilityRole="button" accessibilityHint="Starts a new line" style={styles.again}>
        <Text style={styles.againText}>{PROMPT}</Text>
      </Pressable>
      <Text ref={words} {...(web ? { tabIndex: -1 } : {})} style={[styles.words, { fontSize: size, lineHeight: Math.round(size * 1.05) }]} testID="trail-words">
        {kept.text}
      </Text>
      <View style={styles.status}>
        <View style={styles.statusText} accessibilityLiveRegion="polite" role="status">
          <Text style={styles.statusWords}>
            <Text {...decorative}>✓ </Text>
            {status(kept, threadName, attached)}
          </Text>
        </View>
        <Pressable ref={undoRef} onPress={undoKept} accessibilityRole="button" style={styles.undo}>
          <Text style={styles.undoText}>Undo</Text>
        </Pressable>
      </View>

      {loose && !elsewhere && (
        <View style={styles.moves} role="group" aria-label="Move it?">
          <Text style={styles.moveLabel}>Move it?</Text>
          {guess && canNext && <MoveButton label={`Next on ${guess.name}`} onPress={() => move({ kind: 'next', threadId: guess.id })} />}
          {guess && <MoveButton label={`Log toward ${guess.name}`} onPress={() => move({ kind: 'toward', threadId: guess.id })} />}
          <MoveButton label="Somewhere else…" quiet onPress={() => setElsewhere(true)} />
        </View>
      )}
      {loose && elsewhere && (
        <View style={styles.moves} role="group" aria-label="Somewhere else">
          <Text style={styles.moveLabel}>Somewhere else</Text>
          {others.map((t) => (
            <MoveButton key={t.id} label={t.name} onPress={() => move({ kind: 'toward', threadId: t.id })} />
          ))}
          <TextInput
            value={name}
            onChangeText={setName}
            onSubmitEditing={() => move({ kind: 'new', name })}
            placeholder="＋ A new wander"
            placeholderTextColor={N.faint}
            accessibilityLabel="A new wander"
            returnKeyType="done"
            style={styles.newWander}
          />
          <MoveButton label="Cancel" quiet onPress={() => setElsewhere(false)} />
        </View>
      )}
    </View>
  );
}

function MoveButton({ label, quiet, onPress }: { label: string; quiet?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.move}>
      <Text style={[styles.moveText, quiet && { color: N.muted }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: N.bg },
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 140, maxWidth: 640, width: '100%', alignSelf: 'center' },
  top: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 12 },
  mapLink: { minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
  mapText: { color: N.muted, fontSize: 15 },
  ask: { marginTop: '18%', gap: 24 },
  prompt: { fontFamily: display, fontWeight: '700', color: N.ink, letterSpacing: -1.5 },
  unsure: { alignSelf: 'flex-start', maxWidth: '100%', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, borderRadius: 22, borderWidth: 1.5, borderColor: N.line },
  unsureText: { color: N.ink, fontSize: 15, fontWeight: '500', flexShrink: 1 },
  board: { marginTop: '10%', gap: 20 },
  again: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  againText: { fontFamily: display, fontSize: 18, fontWeight: '500', color: N.muted },
  // Focused only so a screen reader starts there (never by Tab): no focus box.
  words: { fontFamily: display, fontWeight: '700', color: N.ink, letterSpacing: -1.2, ...(web && ({ outlineStyle: 'none' } as object)) },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 2, borderTopColor: N.line, paddingTop: 4 },
  statusText: { flex: 1 },
  statusWords: { color: N.muted, fontSize: 14 },
  undo: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  undoText: { color: N.ink, fontWeight: '600', fontSize: 14 },
  moves: { gap: 2, marginTop: 8 },
  moveLabel: { color: N.muted, fontSize: 13, paddingBottom: 4 },
  move: { minHeight: 48, justifyContent: 'center' },
  moveText: { color: N.lantern, fontSize: 16 },
  newWander: { minHeight: 48, color: N.ink, fontSize: 16, borderBottomWidth: 1, borderBottomColor: N.line },
  toastSlot: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
