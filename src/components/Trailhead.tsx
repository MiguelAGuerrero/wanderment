import { Link, router, useIsFocused } from 'expo-router';
import { useEffect, useLayoutEffect, useMemo } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { decorative } from '@/components/a11y';
import { Composer } from '@/components/Composer';
import { useHome, useKeyboardUp } from '@/components/Home';
import { Toast } from '@/components/Toast';
import { subjectHref } from '@/domain/home';
import { GROUND_H, groundFits, promptSize } from '@/domain/trailhead';
import { LogOptions, useStore } from '@/store/useStore';
import { N } from '@/theme';

export const PROMPT = 'Where are we wandering today?';
const web = Platform.OS === 'web';
/** The big type: Space Grotesk where it's installed, else the system's sans (never the browser's serif default). */
const display = Platform.select({ web: '"Space Grotesk", SpaceGrotesk, system-ui, -apple-system, "Segoe UI", sans-serif', default: undefined });

/**
 * The trailhead (P-65, B-07 slice 1): Home is a night sky and one question. The field ("nothing yet
 * is fine") offers P-61's suggestions only once you type; Return logs exactly as typed and the line
 * rises (P-73: the camera looks up at it, `/line/<id>`), lit unless the **done** chip is on (it shows
 * once you type, and stays on — line after line — until turned off or the home is left). "I’m not sure" looks up at
 * the sky (P-66, `/sky`). P-74: this is the one home's ground at rest — the night (with your lines as
 * faint stars) is drawn by the home around it, and Map is a labelled signpost by the lantern.
 */
export function Trailhead() {
  const shown = useIsFocused();
  const keptId = useStore((st) => st.kept?.activityId);
  const focusLogBox = useStore((st) => st.focusLogBox);
  const doneChip = useStore((st) => st.doneChip);
  const setDoneChip = useStore((st) => st.setDoneChip);
  const typed = useStore((st) => !!st.draft.text.trim());
  // Captured at Return (and kept with a Return made while reconnecting).
  const logOptions = useMemo<LogOptions>(() => ({ trail: true, done: doneChip }), [doneChip]);
  const warm = useStore((st) => st.showShading);
  // P-72/P-74: coming back down from the sky (or Map), the camera comes down to the lantern; the field keeps its focus.
  const { passage, tilting } = useHome('trailhead');
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const keyboardUp = useKeyboardUp();
  // The ground (hills, path, lantern) only where it fits below the content, which then scrolls above it (P-65 fix).
  const ground = groundFits({ height, insets: insets.top + insets.bottom }) && !keyboardUp;
  // Return sent a line up (or one logged once the data was back): it rises, a session over the home (P-73).
  // Read from the store, not the render: a rise just left has ended its session by now. In the same
  // commit as the Return, so a key pressed right after it reaches the rise (audit F3).
  useLayoutEffect(() => {
    const id = useStore.getState().kept?.activityId;
    if (shown && id) router.push(subjectHref({ kind: 'line', activityId: id }));
  }, [shown, keptId]);
  // Focus is in the field on open and on coming back down (web: a keyboard is there already; native
  // would raise one unasked).
  useEffect(() => {
    if (shown && web) focusLogBox();
  }, [shown, focusLogBox]);

  const size = promptSize({ width, height, fontScale });
  return (
    <View style={styles.screen} testID="trailhead" {...passage.mark}>
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            testID="trailhead-scroll"
            // Not a Tab stop of its own (P-65 fix): Map, the field and the buttons are.
            {...(web ? { tabIndex: -1 } : {})}
            style={ground && { marginBottom: Math.max(0, GROUND_H - insets.bottom) }}
            contentContainerStyle={[styles.content, width < 360 && styles.narrow]}
            keyboardShouldPersistTaps="handled">
            {/* Where Map was (P-74: it's a signpost by the lantern now), so the question stays where it was. */}
            <View style={styles.top} />
            <View style={styles.ask}>
              <Text accessibilityRole="header" style={[styles.prompt, { fontSize: size, lineHeight: size }]}>
                {PROMPT}
              </Text>
              <Composer night autocomplete arrow openWanders placeholder="nothing yet is fine" label={PROMPT} logOptions={logOptions}
                onLogged={() => {
                  // The line rises: an Esc before it lands still comes back down (audit F3).
                  tilting();
                  return true;
                }}
              />
              {/* P-73: the done chip, by the field — once you've typed, and while it's on (sticky). */}
              {/* Its room is kept before you type, so nothing below moves on the first key (audit F7). */}
              {!(typed || doneChip) && <View style={styles.chipRoom} testID="done-chip-room" />}
              {(typed || doneChip) && (
                <Pressable
                  onPress={() => setDoneChip(!doneChip)}
                  role="switch"
                  aria-checked={doneChip}
                  accessibilityState={{ checked: doneChip }}
                  accessibilityLabel="done"
                  testID="done-chip"
                  style={[styles.chip, doneChip && styles.chipOn]}>
                  <Text style={[styles.chipText, doneChip && styles.chipTextOn]}>
                    <Text {...decorative}>✓ </Text>done
                  </Text>
                </Pressable>
              )}
              <Link href="/sky" asChild>
                <Pressable style={styles.unsure} onPressIn={tilting}>
                  <Svg width={14} height={14} viewBox="0 0 24 24" {...decorative}>
                    <Path d="M12 2 L13.6 10.4 L22 12 L13.6 13.6 L12 22 L10.4 13.6 L2 12 L10.4 10.4Z" fill={warm ? N.lantern : N.silver} />
                  </Svg>
                  <Text style={styles.unsureText}>I’m not sure</Text>
                </Pressable>
              </Link>
            </View>
            {/* P-74: Map is a labelled signpost by the lantern, after the field and I’m not sure (Tab order). */}
            <View style={styles.post}>
              <Link href="/map" asChild>
                <Pressable style={styles.mapLink} testID="map-signpost">
                  <Svg width={14} height={18} viewBox="0 0 14 18" {...decorative}>
                    <Path d="M2 1 V17 M2 2 H12 L9.5 5 L12 8 H2" fill="none" stroke={N.faint} strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round" />
                  </Svg>
                  <Text style={styles.mapText}>Map</Text>
                </Pressable>
              </Link>
            </View>
          </ScrollView>
          <View style={styles.toastSlot} pointerEvents="box-none">
            <Toast />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  // The home draws the night behind it (P-74).
  screen: { flex: 1 },
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 32, maxWidth: 640, width: '100%', alignSelf: 'center' },
  // 200 % zoom: room for the placeholder.
  narrow: { paddingHorizontal: 16 },
  top: { height: 12 + 44 },
  post: { marginTop: 'auto', paddingTop: 24, flexDirection: 'row', justifyContent: 'flex-end' },
  mapLink: { minHeight: 44, minWidth: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  mapText: { color: N.muted, fontSize: 15 },
  ask: { marginTop: '18%', gap: 24 },
  prompt: { fontFamily: display, fontWeight: '700', color: N.ink, letterSpacing: -1.5 },
  unsure: { alignSelf: 'flex-start', maxWidth: '100%', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, borderRadius: 22, borderWidth: 1.5, borderColor: N.line },
  unsureText: { color: N.ink, fontSize: 15, fontWeight: '500', flexShrink: 1 },
  // The done chip (P-73): quiet off, ink on; one tap toggles.
  chip: { alignSelf: 'flex-start', minHeight: 44, minWidth: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderRadius: 22, borderWidth: 1.5, borderColor: N.line, borderStyle: 'dashed' },
  chipOn: { borderStyle: 'solid', borderColor: N.ink },
  chipRoom: { height: 44 },
  chipText: { color: N.muted, fontSize: 15 },
  chipTextOn: { color: N.ink, fontWeight: '600' },
  toastSlot: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
