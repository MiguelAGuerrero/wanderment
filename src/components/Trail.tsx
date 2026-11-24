import { Redirect, router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ComponentRef, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { decorative } from '@/components/a11y';
import { useReduceMotion } from '@/components/graph/scopeNav';
import { BackGlyph } from '@/components/icons';
import { NightSky } from '@/components/NightSky';
import { STAR_PATH } from '@/components/StarGlyph';
import { Toast } from '@/components/Toast';
import { useEscBack } from '@/components/useEscBack';
import { footprintName, footprints, latestNote, skyStars, starTarget, starTint } from '@/domain/sky';
import { promptSize } from '@/domain/trailhead';
import { Id } from '@/domain/types';
import { useStore } from '@/store/useStore';
import { N } from '@/theme';

const display = Platform.select({ web: '"Space Grotesk", SpaceGrotesk, system-ui, -apple-system, "Segoe UI", sans-serif', default: undefined });
const hand = Platform.select({ web: 'Caveat, "Segoe Print", "Bradley Hand", cursive', default: undefined });
const MAX_W = 640;
const web = Platform.OS === 'web';

type Focusable = ComponentRef<typeof View> | null;
/** Web: moves focus to an element once it has rendered. */
const focusSoon = (el: () => Focusable) => {
  if (web) requestAnimationFrame(() => (el() as unknown as HTMLElement | null)?.focus?.());
};

/**
 * On the trail (P-66, B-07 slice 2): a wander's own screen under the night sky. Its star (when it has
 * one) and its name at the top; "Here’s where we left off" and its next step in large type (or
 * "＋ Add a next step"); its latest note on a paper tag; **Did it** logs the step as done (the Map card's
 * ✓, with Undo in the toast); and footprints, its latest activities in dated words (never counts).
 * Back goes to the star it came from (or the sky).
 */
export function Trail({ id, starId }: { id: Id; starId?: Id }) {
  const shown = useIsFocused();
  const data = useStore((st) => st.data);
  const shading = useStore((st) => st.showShading);
  const log = useStore((st) => st.log);
  const setNext = useStore((st) => st.setNext);
  const reduce = useReduceMotion();
  const { width, height, fontScale } = useWindowDimensions();
  const [adding, setAdding] = useState(false);
  const [step, setStep] = useState('');
  const addRef = useRef<ComponentRef<typeof View>>(null);
  const didRef = useRef<ComponentRef<typeof View>>(null);

  const thread = data.threads[id];
  const why = starId && data.threads[starId] && !data.threads[starId].hidden ? data.threads[starId] : undefined;
  const stars = useMemo(() => skyStars(data, { shading }), [data, shading]);
  // The star overhead: the one it came from, or itself when it's one.
  const overhead = stars.find((s) => s.thread.id === (why?.id ?? id));
  const tag = useMemo(() => latestNote(data, id), [data, id]);
  const steps = useMemo(() => footprints(data, id), [data, id]);
  // Came from a star with several wanders: back to them; else back to the sky.
  const backTo = why && starTarget(data, why.id).startsWith('/star/') ? `/star/${encodeURIComponent(why.id)}` : '/sky';
  const back = () => (router.canGoBack() ? router.back() : router.replace(backTo));
  useEscBack(shown && !!thread && !thread.hidden, back);
  if (!thread || thread.hidden) return <Redirect href="/sky" />;

  const next = thread.next?.trim();
  // The step's large type steps down at large text and on small windows, like the trailhead's prompt (P-66 fix).
  const stepSize = promptSize({ width, height, fontScale, chars: next?.length ?? 0, max: 40 });

  const did = () => {
    const t = useStore.getState().data.threads[id];
    if (!t?.next) return;
    if (log({ text: t.next, doingId: id, toIds: [], fromNextOf: id, fromNextText: t.next }, { keepLine: true })) focusSoon(() => addRef.current);
  };
  const cancel = () => {
    setStep('');
    setAdding(false);
  };
  const save = () => {
    const v = step.trim();
    if (!v) return cancel();
    if (setNext(id, v)) {
      cancel();
      focusSoon(() => didRef.current);
    }
  };

  const w = Math.min(width, MAX_W);
  const tint = starTint(overhead?.heat ?? 0);
  return (
    <View style={styles.screen} testID="trail">
      {shown && <StatusBar style="light" />}
      <NightSky still={reduce || !shown} warm={shading} />
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <ScrollView {...(web ? { tabIndex: -1 } : {})} contentContainerStyle={[styles.content, { width: w }]} keyboardShouldPersistTaps="handled">
          <View style={styles.top}>
            <Pressable onPress={back} accessibilityRole="button" accessibilityLabel={backTo === '/sky' ? 'Back to the sky' : 'Back to the wanders'} style={styles.backBtn}>
              <BackGlyph color={N.muted} />
            </Pressable>
          </View>
          <View style={styles.head}>
            {overhead && (
              <>
                <Svg width={26} height={26} viewBox="0 0 24 24" {...decorative}>
                  <Path d={STAR_PATH} fill={tint.fill} />
                </Svg>
                {overhead.thread.id !== id && <Text style={styles.why}>{overhead.thread.name}</Text>}
              </>
            )}
            <Text accessibilityRole="header" style={[styles.landmark, !shading && { color: N.ink }]}>
              {thread.name}
            </Text>
          </View>

          <View style={styles.here}>
            <Text style={styles.leftOff}>Here’s where we left off</Text>
            {next ? (
              <Text accessibilityRole="header" style={[styles.step, { fontSize: stepSize, lineHeight: Math.round(stepSize * 1.05) }]} testID="trail-step">
                {next}
              </Text>
            ) : null}
            {tag ? (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ) : null}
            {next ? (
              <View style={styles.actions}>
                <Pressable ref={didRef} onPress={did} accessibilityRole="button" style={styles.did}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" {...decorative}>
                    <Path d="M5 12l5 5L20 7" stroke={N.bg} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                  <Text style={styles.didText}>Did it</Text>
                </Pressable>
              </View>
            ) : adding ? (
              <View style={styles.adding}>
                <TextInput
                  value={step}
                  onChangeText={setStep}
                  onSubmitEditing={save}
                  autoFocus
                  placeholder="A next step"
                  placeholderTextColor={N.faint}
                  accessibilityLabel="A next step"
                  returnKeyType="done"
                  style={styles.input}
                />
                <View style={styles.actions}>
                  <Pressable onPress={save} accessibilityRole="button" style={styles.did}>
                    <Text style={styles.didText}>Save</Text>
                  </Pressable>
                  <Pressable onPress={cancel} accessibilityRole="button" style={styles.quiet}>
                    <Text style={styles.quietText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.actions}>
                <Pressable ref={addRef} onPress={() => setAdding(true)} accessibilityRole="button" style={styles.quiet}>
                  <Text style={styles.quietText}>
                    <Text {...decorative}>＋ </Text>Add a next step
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {steps.length > 0 && (
            <View style={styles.prints} role="list" aria-label="Footprints">
              {steps.map((f) => (
                <View key={f.id} role="listitem" aria-label={footprintName(f)}>
                  <Text style={styles.print}>
                    {f.text} · {f.when}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
        <View style={styles.toastSlot} pointerEvents="box-none">
          <Toast />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: N.bg },
  fill: { flex: 1 },
  content: { flexGrow: 1, alignSelf: 'center', paddingBottom: 120 },
  top: { flexDirection: 'row', paddingHorizontal: 8, paddingTop: 8 },
  backBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  head: { alignItems: 'center', gap: 6, paddingHorizontal: 28 },
  why: { color: N.muted, fontSize: 13, textAlign: 'center' },
  landmark: { color: N.lantern, fontSize: 15, fontWeight: '600', textAlign: 'center', marginTop: 10 },
  here: { paddingHorizontal: 28, paddingTop: 40, gap: 14 },
  leftOff: { fontFamily: display, fontSize: 16, fontWeight: '500', color: N.muted },
  step: { fontFamily: display, fontSize: 40, fontWeight: '700', lineHeight: 42, letterSpacing: -1, color: N.ink },
  tag: { alignSelf: 'flex-start', transform: [{ rotate: '-2deg' }], paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8, backgroundColor: N.tag, borderRadius: 3 },
  tagText: { fontFamily: hand, fontSize: 20, color: N.tagInk },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 8 },
  did: { minHeight: 44, minWidth: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: N.lantern, flexDirection: 'row', alignItems: 'center', gap: 6 },
  didText: { color: N.bg, fontSize: 15, fontWeight: '600' },
  quiet: { minHeight: 44, minWidth: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1.5, borderColor: N.line, justifyContent: 'center' },
  quietText: { color: N.ink, fontSize: 15 },
  adding: { gap: 4 },
  input: { minHeight: 48, color: N.ink, fontSize: 18, borderBottomWidth: 1, borderBottomColor: N.line },
  prints: { paddingHorizontal: 28, paddingTop: 48, gap: 6 },
  print: { color: N.faint, fontSize: 13 },
  toastSlot: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
