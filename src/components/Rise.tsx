import { useIsFocused } from 'expo-router';
import { ComponentRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { decorative } from '@/components/a11y';
import { useReduceMotion } from '@/components/graph/scopeNav';
import { useHome } from '@/components/Home';
import { starIn } from '@/components/passage';
import { useWhileShown } from '@/components/shown';
import { STAR_PATH } from '@/components/StarGlyph';
import { useEscBack } from '@/components/useEscBack';
import { litGlow, looksLit } from '@/domain/rise';
import { GROUND_H, groundFits, promptSize } from '@/domain/trailhead';
import { Data, Id } from '@/domain/types';
import { Kept, recentThreadOrder, useStore } from '@/store/useStore';
import { N } from '@/theme';

const web = Platform.OS === 'web';
const display = Platform.select({ web: '"Space Grotesk", SpaceGrotesk, system-ui, -apple-system, "Segoe UI", sans-serif', default: undefined });
const MAX_W = 640;

/** A key that types a character (not a shortcut, not Space or Enter), pressed outside any field. */
const typesInto = (e: KeyboardEvent) => {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1 || e.key === ' ') return false;
  const t = e.target as HTMLElement | null;
  return !(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable));
};

type Focusable = ComponentRef<typeof View> | ComponentRef<typeof Text> | ComponentRef<typeof TextInput> | null;
/** Web: moves focus to an element once it has rendered. */
const focusSoon = (el: () => Focusable) => {
  if (web) requestAnimationFrame(() => (el() as unknown as HTMLElement | null)?.focus?.());
};

/** What the rise's status line says (announced politely); nothing while the line is just lit. */
function status(kept: Kept, data: Data): string {
  const name = (id: Id) => data.threads[id]?.name ?? '';
  const a = data.activities[kept.activityId];
  const did = kept.did;
  if (did?.kind === 'done' || did?.kind === 'settled') return 'Settled';
  if (did?.kind === 'toward') return `Toward ${name(did.threadId)}`;
  if (did?.kind === 'step') return data.threads[did.threadId]?.next ? `First step on ${name(did.threadId)}` : `Toward ${name(did.threadId)}`;
  const attached = a ? (a.doingId ?? a.toIds[0]) : undefined;
  return attached ? `Logged → ${name(attached)}` : '';
}

/**
 * The rise (P-73, B-08 slice 1; D-15's first tilt of the one home): Return sends your line up — the
 * camera looks up and the words are the session's heading (focused). A lit line has quiet choices:
 * **Done it** (✦) settles it (a twinkle, it dims, "Settled", Undo); **↳ First step** opens a step field
 * (only its Return makes the wander, named with your words; Esc or Cancel makes nothing); the corner
 * **Toward…** attaches it to a wander. Each has Undo on the line (no timer); then the session ends by
 * itself (it waits under assistive tech). A done-chip line arrives settled with its Undo. Typing
 * starts a new line; New line, Esc or the ground leave, and the line stays as it is. Opened without
 * its session (a reload, an old link), it isn't reopened: the home at rest, the line a star in its sky.
 */
export function Rise({ id }: { id: Id }) {
  const shown = useIsFocused();
  const data = useStore((st) => st.data);
  const shading = useStore((st) => st.showShading);
  const stored = useStore((st) => st.kept);
  const kept = stored?.activityId === id ? stored : undefined;
  const leaveKept = useStore((st) => st.leaveKept);
  const settleKept = useStore((st) => st.settleKept);
  const firstStepKept = useStore((st) => st.firstStepKept);
  const towardKept = useStore((st) => st.towardKept);
  const undoKept = useStore((st) => st.undoKept);
  const reduce = useReduceMotion();
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // As on the trailhead (P-65 fix 1): where the ground is drawn, the content scrolls above it, never under it.
  const ground = groundFits({ height, insets: insets.top + insets.bottom });
  const heading = useRef<ComponentRef<typeof Text>>(null);
  const undoRef = useRef<ComponentRef<typeof View>>(null);
  const stepRef = useRef<ComponentRef<typeof TextInput>>(null);
  const firstRef = useRef<ComponentRef<typeof View>>(null);
  const towardRef = useRef<ComponentRef<typeof View>>(null);
  const { passage, leave, endSoon } = useHome('sky', () => heading.current);
  const [stepping, setStepping] = useState(false);
  const [step, setStep] = useState('');
  const [towardOpen, setTowardOpen] = useState(false);

  // The session is this line's while it's shown; leaving ends it (the line stays as it is).
  useWhileShown(
    shown,
    useCallback(() => () => leaveKept(id), [leaveKept, id]),
  );
  // Not (or no longer) this line's session — a reload, an old link, or a done-chip line undone: the home at rest.
  useEffect(() => {
    if (shown && !kept) leave();
  }, [shown, kept, leave]);
  useEscBack(shown && !!kept, leave);
  // The words take focus (P-72 does it arriving from the trailhead; opened again from the sky it's the same place).
  useEffect(() => focusSoon(() => heading.current), [id]);
  // A done-chip line arrives settled: its Undo shows, then the session ends by itself.
  const arrivedDone = kept?.did?.kind === 'done';
  useEffect(() => {
    if (arrivedDone) endSoon();
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  // Web: typing (outside a field) starts the next line with what's typed (B-08: the rise never blocks typing).
  useEffect(() => {
    if (!web || !shown || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (!typesInto(e)) return;
      e.preventDefault();
      const st = useStore.getState();
      st.setDraft({ text: st.draft.text + e.key });
      leave();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [shown, leave]);

  const a = data.activities[id];
  const wanders = useMemo(() => {
    const order = recentThreadOrder(data);
    const rank = (t: Id) => (order.indexOf(t) < 0 ? Number.MAX_SAFE_INTEGER : order.indexOf(t));
    return Object.values(data.threads)
      .filter((t) => !t.hidden)
      .sort((x, y) => rank(x.id) - rank(y.id) || x.name.localeCompare(y.name));
  }, [data]);

  // The twinkle when it settles (not under Reduce Motion: it simply dims).
  const twinkle = useMemo(() => new Animated.Value(1), []);
  const settledNow = kept?.did?.kind === 'settled' || kept?.did?.kind === 'done';
  useEffect(() => {
    if (!settledNow || reduce) return;
    twinkle.setValue(1.6);
    const t = Animated.spring(twinkle, { toValue: 1, friction: 3, useNativeDriver: !web });
    t.start();
    return () => t.stop();
  }, [settledNow, reduce, twinkle]);

  if (!kept || !a) return null;

  const now = new Date();
  const lit = looksLit(a, now);
  const glow = litGlow(a, now, shading);
  const free = !kept.did && !a.doingId;
  const canSettle = !kept.did && a.lit === true;
  const canToward = free && wanders.length > 0;
  const said = status(kept, data);

  const chose = (ok: boolean) => {
    if (!ok) return;
    setStepping(false);
    setStep('');
    setTowardOpen(false);
    focusSoon(() => undoRef.current);
    // A choice: Undo shows, then the session ends by itself (it waits under assistive tech).
    endSoon();
  };
  const undo = () => {
    if (undoKept()) focusSoon(() => heading.current);
  };
  const cancelStep = () => {
    setStepping(false);
    setStep('');
    focusSoon(() => firstRef.current);
  };
  const cancelToward = () => {
    setTowardOpen(false);
    focusSoon(() => towardRef.current);
  };

  const w = Math.min(width, MAX_W);
  const size = promptSize({ width, height, fontScale, chars: kept.text.length });
  return (
    <View style={styles.screen} testID="rise" {...passage.mark}>
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <ScrollView
          testID="rise-scroll"
          {...(web ? { tabIndex: -1 } : {})}
          style={ground && { marginBottom: Math.max(0, GROUND_H - insets.bottom) }}
          contentContainerStyle={[styles.content, { width: w }, width < 360 && styles.narrow]} keyboardShouldPersistTaps="handled">
          <View style={styles.top}>
            <Pressable onPress={leave} accessibilityRole="button" style={styles.again}>
              <Text style={styles.againText}>New line</Text>
            </Pressable>
            {canToward && !towardOpen && (
              <Pressable ref={towardRef} onPress={() => setTowardOpen(true)} accessibilityRole="button" style={styles.corner}>
                <Text style={styles.quietText}>Toward…</Text>
              </Pressable>
            )}
          </View>

          {/* The star: lit, a star in night ink with its glow (never the accent colour); settled, a dim point. */}
          {/* It rises from below as the camera looks up (P-72's passage; still under Reduce Motion), and twinkles as it settles. */}
          <Animated.View style={[styles.star, starIn(passage.p)]} {...decorative}>
            <Animated.View testID="rise-star" style={{ transform: [{ scale: twinkle }] }} {...{ dataSet: { state: lit ? 'lit' : 'settled' } }}>
              <Svg width={44} height={44} viewBox="0 0 44 44">
                {lit && glow > 0 && <Circle cx={22} cy={22} r={20} fill={N.ink} opacity={0.22 * glow} testID="rise-glow" />}
                {lit ? (
                  <Path d={STAR_PATH} transform="translate(10 10)" fill={N.ink} />
                ) : (
                  <Circle cx={22} cy={22} r={4} fill={N.ink} opacity={0.55} />
                )}
              </Svg>
            </Animated.View>
          </Animated.View>

          <Text ref={heading} accessibilityRole="header" {...(web ? { tabIndex: -1 } : {})} style={[styles.words, { fontSize: size, lineHeight: Math.round(size * 1.05) }]} testID="trail-words">
            {kept.text}
          </Text>

          <View style={styles.status}>
            <View style={styles.statusText} accessibilityLiveRegion="polite" role="status">
              <Text style={styles.statusWords}>{said}</Text>
            </View>
            {/* Undo takes back the choice; it waits (no timer). */}
            {kept.did && (
              <Pressable ref={undoRef} onPress={undo} accessibilityRole="button" style={styles.undo}>
                <Text style={styles.undoText}>Undo</Text>
              </Pressable>
            )}
          </View>

          {stepping ? (
            <View style={styles.stepRow}>
              <TextInput
                ref={stepRef}
                value={step}
                onChangeText={setStep}
                onSubmitEditing={() => chose(firstStepKept(step))}
                onKeyPress={(e) => {
                  if (web && e.nativeEvent.key === 'Escape') cancelStep();
                }}
                autoFocus
                placeholder="First step"
                placeholderTextColor={N.faint}
                accessibilityLabel="First step"
                returnKeyType="done"
                style={styles.stepField}
              />
              <Pressable onPress={cancelStep} accessibilityRole="button" style={styles.choice}>
                <Text style={styles.quietText}>Cancel</Text>
              </Pressable>
            </View>
          ) : towardOpen ? (
            <View style={styles.choices} role="group" aria-label="Toward…">
              {wanders.map((t) => (
                <Pressable key={t.id} onPress={() => chose(towardKept(t.id))} accessibilityRole="button" style={styles.choice}>
                  <Text style={styles.quietText}>{t.name}</Text>
                </Pressable>
              ))}
              <Pressable onPress={cancelToward} accessibilityRole="button" style={styles.choice}>
                <Text style={styles.quietText}>Cancel</Text>
              </Pressable>
            </View>
          ) : (
            (canSettle || free) && (
              <View style={styles.row}>
                {canSettle && (
                  <Pressable onPress={() => chose(settleKept())} accessibilityRole="button" style={styles.choice}>
                    <Text style={styles.quietText}>
                      <Text {...decorative}>✦ </Text>Done it
                    </Text>
                  </Pressable>
                )}
                {free && a.lit === true && (
                  <Pressable ref={firstRef} onPress={() => setStepping(true)} accessibilityRole="button" style={styles.choice}>
                    <Text style={styles.quietText}>
                      <Text {...decorative}>↳ </Text>First step
                    </Text>
                  </Pressable>
                )}
              </View>
            )
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  // The home draws the night behind it (P-74).
  screen: { flex: 1 },
  fill: { flex: 1 },
  content: { flexGrow: 1, alignSelf: 'center', paddingHorizontal: 28, paddingBottom: 32, gap: 16 },
  // 200 % zoom: room for the words.
  narrow: { paddingHorizontal: 16 },
  top: { minHeight: 12 + 44, paddingTop: 12, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  again: { minHeight: 44, justifyContent: 'center' },
  againText: { fontFamily: display, fontSize: 18, fontWeight: '500', color: N.muted },
  corner: { minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: 4 },
  star: { alignSelf: 'flex-start', marginTop: 16 },
  // Focused only so a screen reader starts there (never by Tab): no focus box.
  words: { fontFamily: display, fontWeight: '700', color: N.ink, letterSpacing: -1.2, ...(web && ({ outlineStyle: 'none' } as object)) },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  statusText: { flex: 1 },
  statusWords: { color: N.muted, fontSize: 15 },
  undo: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  undoText: { color: N.ink, fontWeight: '600', fontSize: 14 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choices: { gap: 2 },
  // Quiet: the line is kept lit whether or not you choose.
  choice: { minHeight: 44, minWidth: 44, justifyContent: 'center', paddingRight: 16 },
  quietText: { color: N.muted, fontSize: 15 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  stepField: { flexGrow: 1, flexBasis: 160, minWidth: 0, minHeight: 48, color: N.ink, fontSize: 18, borderBottomWidth: 1, borderBottomColor: N.line },
});
