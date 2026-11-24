import { Link, router, useIsFocused } from 'expo-router';
import { ReactNode, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { decorative } from '@/components/a11y';
import { Composer } from '@/components/Composer';
import { useHome, useKeyboardUp } from '@/components/Home';
import { Toast } from '@/components/Toast';
import { FEED_ROWS, FeedLine, feedLines, feedName, pickFeed } from '@/domain/feed';
import { GUIDE_BAND_END, restGuides, subjectHref } from '@/domain/home';
import { feedRowShown, GROUND_H, headingCollapses, restLayout, UNSURE_NAME, unsureChip } from '@/domain/trailhead';
import { Id } from '@/domain/types';
import { LogOptions, useStore } from '@/store/useStore';
import { N } from '@/theme';

export const PROMPT = 'Where are we wandering today?';
const web = Platform.OS === 'web';
/** The heading's type: Space Grotesk where it's installed, else the system's sans (never the browser's serif default). */
const display = Platform.select({ web: '"Space Grotesk", SpaceGrotesk, system-ui, -apple-system, "Segoe UI", sans-serif', default: undefined });
/** The live map's lines start this far in from each side; an indent from its id takes up to INDENT of the rest. */
const SIDE = 20;
const INDENT = 0.4;

/**
 * The home at rest (P-65 → B-09). P-79: the composer is at the bottom, in thumb reach, like messaging
 * (never chat-bubble styled): the question as a small heading (it collapses with the keyboard up, in a
 * short window or at large text), "I'm not sure" as a chip right above the field (a toggle, P-81 makes
 * it light the map; for now it looks up, `/sky`), the done chip once you've typed, Map (until P-83's
 * sheet), and the field with its send ↑. As you type, P-61's suggestions open above the field: the
 * composer grows, the map yields. Return logs exactly as typed and the line rises (P-73, `/line/<id>`).
 * P-80: above the composer, the live map — a random few of the last three weeks' lines, drawn once a
 * day, each in a place from its id, held while it's on screen; a tap opens one (the rise, reopened).
 * Beyond three weeks, a calm sky. The ground (hills, path, lantern) stands just above the composer
 * where it fits; the night itself is the home's (P-74).
 */
export function Trailhead() {
  const shown = useIsFocused();
  const keptId = useStore((st) => st.kept?.activityId);
  const focusLogBox = useStore((st) => st.focusLogBox);
  const doneChip = useStore((st) => st.doneChip);
  const setDoneChip = useStore((st) => st.setDoneChip);
  const reopenLine = useStore((st) => st.reopenLine);
  const typed = useStore((st) => !!st.draft.text.trim());
  const data = useStore((st) => st.data);
  const ready = useStore((st) => st.storage.state === 'ready');
  // Captured at Return (and kept with a Return made while reconnecting).
  const logOptions = useMemo<LogOptions>(() => ({ trail: true, done: doneChip }), [doneChip]);
  const warm = useStore((st) => st.showShading);
  // P-72/P-74: coming back down from the sky (or Map), the camera comes down to the lantern; the field keeps its focus.
  const { passage, tilting, rest } = useHome('trailhead');
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const keyboardUp = useKeyboardUp();
  const collapsed = headingCollapses({ height, fontScale, keyboardUp });

  // The composer's height (the ground stands on it; the toast sits above it) and the map's room above it.
  const [composerH, setComposerH] = useState(0);
  const [room, setRoom] = useState(0);
  // The rows are laid out from the room at rest (the most seen in this window), so they never move as the composer grows.
  const shape = `${width}x${height}:${collapsed}`;
  const [restRoom, setRestRoom] = useState({ shape: '', room: 0 });
  const onRoom = (r: number) => {
    setRoom(r);
    setRestRoom((was) => (was.shape !== shape || r > was.room ? { shape, room: r } : was));
  };
  const guides = useMemo(() => restGuides(data).length > 0, [data]);
  // Clear of the guiding stars (drawn by the home, high up).
  const top = guides ? Math.max(8, Math.ceil(GUIDE_BAND_END * height) + 12 - insets.top) : 8;
  const layout = restLayout({ room: restRoom.shape === shape ? Math.max(restRoom.room, room) : room, top, fontScale });
  // The ground stands below the rows while it still fits there (typing's suggestions take its place).
  const ground = room > 0 && layout.ground && room - (top + layout.rowH * FEED_ROWS) >= GROUND_H - 0.5 && !keyboardUp;
  useEffect(() => rest({ ground, lift: composerH }), [rest, ground, composerH]);
  useEffect(() => () => rest(undefined), [rest]);

  // P-80: the day's few, picked on arrival and held while it's on screen (a line that's gone, by Undo, leaves).
  const [arrived] = useState(() => new Date());
  const [held, setHeld] = useState<Id[]>();
  const fresh = useMemo(() => (held ? undefined : pickFeed(data, arrived)), [held, data, arrived]);
  if (!held && ready && fresh) setHeld(fresh);
  const lines = useMemo(() => feedLines(data, held ?? fresh ?? [], arrived, { shading: warm }), [data, held, fresh, arrived, warm]);

  // Return sent a line up (or one logged once the data was back), or a line on the map was tapped:
  // it rises, a session over the home (P-73). Read from the store, not the render: a rise just left has
  // ended its session by now. In the same commit as the Return, so a key pressed right after it
  // reaches the rise (audit F3).
  useLayoutEffect(() => {
    const id = useStore.getState().kept?.activityId;
    if (shown && id) router.push(subjectHref({ kind: 'line', activityId: id }));
  }, [shown, keptId]);
  // Focus is in the field on open and on coming back down (web: a keyboard is there already; native
  // would raise one unasked).
  useEffect(() => {
    if (shown && web) focusLogBox();
  }, [shown, focusLogBox]);

  const open = (id: Id) => {
    tilting();
    reopenLine(id);
  };

  // P-79: "I'm not sure" — a toggle (P-81 lights the map with it); for now it looks up, as before.
  const chip = unsureChip(false);
  const chips: ReactNode = (
    <View style={styles.chips}>
      <Pressable
        onPress={() => {
          tilting();
          router.push(subjectHref({ kind: 'whys' }));
        }}
        accessibilityRole="button"
        accessibilityLabel={UNSURE_NAME}
        {...(web ? ({ 'aria-pressed': chip.pressed } as object) : { accessibilityState: { checked: chip.pressed } })}
        testID="unsure"
        style={[styles.unsure, chip.pressed && styles.unsureOn]}>
        <Svg width={14} height={14} viewBox="0 0 24 24" {...decorative}>
          <Path
            d="M12 2 L13.6 10.4 L22 12 L13.6 13.6 L12 22 L10.4 13.6 L2 12 L10.4 10.4Z"
            {...(chip.mark === 'filled' ? { fill: N.bg } : { fill: 'none', stroke: warm ? N.lantern : N.silver, strokeWidth: 1.8, strokeLinejoin: 'round' as const })}
          />
        </Svg>
        <Text style={[styles.unsureText, chip.pressed && styles.unsureTextOn]}>I’m not sure</Text>
      </Pressable>
      {/* P-73: the done chip, beside it — once you've typed, and while it's on (sticky). Nothing moves when it comes. */}
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
      {/* Map, until the sheet takes its place (P-83): at the row's end, after the chips in Tab order. */}
      <Link href="/map" asChild>
        <Pressable style={styles.mapLink} testID="map-signpost">
          <Svg width={14} height={18} viewBox="0 0 14 18" {...decorative}>
            <Path d="M2 1 V17 M2 2 H12 L9.5 5 L12 8 H2" fill="none" stroke={N.faint} strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round" />
          </Svg>
          <Text style={styles.mapText}>Map</Text>
        </Pressable>
      </Link>
    </View>
  );

  return (
    <View style={styles.screen} testID="trailhead" {...passage.mark}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* Drawn bottom up: the composer at the foot, the live map above it. Read top down: the composer, then "Recent". */}
          <View style={styles.stack}>
            <ScrollView
              testID="trailhead-scroll"
              // Not a Tab stop of its own (P-65 fix): the field and the buttons are.
              {...(web ? { tabIndex: -1 } : {})}
              style={styles.composerScroll}
              contentContainerStyle={[styles.panel, width < 360 && styles.panelNarrow, { paddingBottom: 12 + insets.bottom }]}
              onLayout={(e) => setComposerH(Math.round(e.nativeEvent.layout.height))}
              keyboardShouldPersistTaps="handled">
              <View style={styles.inner} testID="composer">
                <Text accessibilityRole="header" style={collapsed ? styles.collapsed : styles.prompt} testID="composer-heading">
                  {PROMPT}
                </Text>
                <Composer night autocomplete arrow openWanders placeholder="nothing yet is fine" label={PROMPT} logOptions={logOptions} chips={chips}
                  onLogged={() => {
                    // The line rises: an Esc before it lands still comes back down (audit F3).
                    tilting();
                    return true;
                  }}
                />
              </View>
            </ScrollView>
            <View style={styles.map} onLayout={(e) => onRoom(Math.round(e.nativeEvent.layout.height))} testID="live-map" {...{ dataSet: { mode: layout.list ? 'list' : 'picture' } }}>
              {lines.length > 0 && room > 0 && <Feed lines={lines} list={layout.list} top={top} rowH={layout.rowH} room={room} width={width} onOpen={open} />}
            </View>
          </View>
          <View style={[styles.toastSlot, { bottom: composerH }]} pointerEvents="box-none">
            <Toast />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

/**
 * The live map's lines (P-80): each a small light (its glow is its warmth: age, never faded text) with
 * its words and when, in words. A "Recent" group of buttons, newest first; a tap opens the line. In the
 * picture each sits in its row and indent from its id; at the largest text (or with too little room) a
 * plain list. Nothing moves, so Reduce Motion has nothing to still.
 */
function Feed({ lines, list, top, rowH, room, width, onOpen }: { lines: FeedLine[]; list: boolean; top: number; rowH: number; room: number; width: number; onOpen: (id: Id) => void }) {
  const span = Math.max(0, width - 2 * SIDE);
  const shown = list ? lines : lines.filter((l) => feedRowShown(l.row, { top, rowH, room }));
  const items = shown.map((l) => {
    const left = SIDE + l.x * span * INDENT;
    return (
      <Pressable
        key={l.id}
        onPress={() => onOpen(l.id)}
        accessibilityRole="button"
        accessibilityLabel={feedName(l)}
        testID="rest-line"
        {...{ dataSet: { state: l.lit ? 'lit' : 'settled' } }}
        style={list ? styles.listLine : [styles.line, { top: top + l.row * rowH, height: rowH, left, maxWidth: width - left - SIDE }]}>
        <View style={styles.light} {...decorative}>
          {l.glow > 0 && <View testID="rest-glow" style={[styles.halo, { opacity: 0.45 * l.glow }]} />}
          <View style={styles.dot} />
        </View>
        <Text style={styles.words} numberOfLines={list ? undefined : 1}>
          {l.text}
          <Text style={styles.when}>
            <Text {...decorative}> · </Text>
            {l.when}
          </Text>
        </Text>
      </Pressable>
    );
  });
  return list ? (
    <ScrollView role="group" aria-label="Recent" {...(web ? { tabIndex: -1 } : {})} style={styles.fill} contentContainerStyle={[styles.list, { paddingTop: top }]}>
      {items}
    </ScrollView>
  ) : (
    <View role="group" aria-label="Recent" style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {items}
    </View>
  );
}

const LIGHT = 16;
const styles = StyleSheet.create({
  // The home draws the night behind it (P-74).
  screen: { flex: 1 },
  fill: { flex: 1 },
  stack: { flex: 1, flexDirection: 'column-reverse' },
  map: { flex: 1, minHeight: 0 },
  // The composer: its own panel at the foot, never taller than the screen (then it scrolls).
  composerScroll: { flexGrow: 0, flexShrink: 1 },
  panel: {
    paddingTop: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(14, 16, 32, 0.94)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: N.line,
  },
  // 200 % zoom: room for the field's placeholder beside the send ↑.
  panelNarrow: { paddingHorizontal: 8 },
  inner: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: 6 },
  prompt: { fontFamily: display, fontWeight: '700', fontSize: 22, lineHeight: 28, color: N.ink, letterSpacing: -0.4, paddingHorizontal: 4 },
  // Collapsed (keyboard up, short window, large text): out of sight, still the page's heading for a screen reader.
  collapsed: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8 },
  unsure: { maxWidth: '100%', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1.5, borderColor: N.line },
  // Pressed: a filled chip with a filled star and dark words (not colour alone).
  unsureOn: { backgroundColor: N.ink, borderColor: N.ink },
  unsureText: { color: N.ink, fontSize: 15, fontWeight: '500', flexShrink: 1 },
  unsureTextOn: { color: N.bg, fontWeight: '600' },
  mapLink: { minHeight: 44, minWidth: 44, marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8 },
  mapText: { color: N.muted, fontSize: 15 },
  // The done chip (P-73): quiet off, ink on; one tap toggles.
  chip: { minHeight: 44, minWidth: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderRadius: 22, borderWidth: 1.5, borderColor: N.line, borderStyle: 'dashed' },
  chipOn: { borderStyle: 'solid', borderColor: N.ink },
  chipText: { color: N.muted, fontSize: 15 },
  chipTextOn: { color: N.ink, fontWeight: '600' },
  toastSlot: { position: 'absolute', left: 0, right: 0 },
  // The live map's lines: a light and words, no box (nothing chat-like); 44 pt tall at least.
  line: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  list: { paddingHorizontal: SIDE, paddingVertical: 8 },
  listLine: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingVertical: 6 },
  light: { width: LIGHT, height: LIGHT, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: LIGHT, height: LIGHT, borderRadius: LIGHT / 2, backgroundColor: N.lantern },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: N.ink },
  words: { flexShrink: 1, color: N.ink, fontSize: 15, lineHeight: 20 },
  when: { color: N.muted },
});
