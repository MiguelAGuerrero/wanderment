import { Link, router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ComponentRef, useMemo, useRef } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReduceMotion } from '@/components/graph/scopeNav';
import { NightSky } from '@/components/NightSky';
import { PassageStars, usePassage, Veil } from '@/components/passage';
import { StarGlyph, useMotes } from '@/components/StarGlyph';
import { PROMPT } from '@/components/Trailhead';
import { useEscBack } from '@/components/useEscBack';
import { decorative } from '@/components/a11y';
import { footprintName, skyAsList, skyLoose, skyStars, STAR_SLOTS, starName, starTarget } from '@/domain/sky';
import { GROUND_H, groundFits } from '@/domain/trailhead';
import { useStore } from '@/store/useStore';
import { N } from '@/theme';

/** The big type, as on the trailhead. */
const display = Platform.select({ web: '"Space Grotesk", SpaceGrotesk, system-ui, -apple-system, "Segoe UI", sans-serif', default: undefined });
const STAR = 40;
/** A star and its name (two lines): the slots are this far apart at least (`STAR_SLOTS`). */
const ITEM_H = 92;
const MAX_W = 640;
const web = Platform.OS === 'web';
/** Below the stray footprints: "Back to typing" (8 + 44) and the content's bottom padding (24). */
const FOOT_H = 76;
/** The lantern's glow and path reach this high above the bottom; the strays stand just above them. */
const LANTERN_TOP = GROUND_H - 30;

/** Back to the prompt: where it came from, or the trailhead when the sky was opened first. */
const toPrompt = () => (router.canGoBack() ? router.back() : router.replace('/'));

/**
 * Look up (P-66, B-07 slice 2): "I’m not sure" opens the sky. Your whys are stars in fixed places
 * (`starPlaces`), one size; how lately each was walked shows only as warmth and twinkling motes. For a
 * screen reader the stars are a list of buttons in a fixed order (declared, then earned), each named
 * "<why>, last walked <when>". A star opens what's under it (or, with one wander, its trail).
 */
export function LookUp() {
  const shown = useIsFocused();
  const data = useStore((st) => st.data);
  const shading = useStore((st) => st.showShading);
  const reduce = useReduceMotion();
  const still = reduce || !shown;
  const loops = useMotes(still);
  // P-72: looking up, the hills sink and the stars fade in (back from a star, the hills come back up); focus to the question.
  const heading = useRef<ComponentRef<typeof Text>>(null);
  const passage = usePassage('sky', shown, () => heading.current);
  const { width, height, fontScale } = useWindowDimensions();
  // The largest text sizes: a plain list of the stars, in the same order (P-66 fix).
  const asList = skyAsList(fontScale);
  useEscBack(shown, toPrompt);
  const stars = useMemo(() => skyStars(data, { shading }), [data, shading]);
  const now = new Date();
  const insets = useSafeAreaInsets();
  // As on the trailhead: the ground only where it fits (fix 18 puts the strays just above it).
  const ground = groundFits({ height, insets: insets.top + insets.bottom });
  const keepLoose = useStore((st) => st.keepLoose);
  const loose = useMemo(() => skyLoose(data), [data]);
  // A stray footprint opens the trailhead's "Move it?" for that line (fix 18).
  const reopen = (id: string) => keepLoose(id) && toPrompt();

  const w = Math.min(width, MAX_W);
  const itemW = Math.min(150, w * 0.42);
  // Room for the slots; a short window scrolls rather than overlapping stars.
  const strayLift = ground ? Math.max(0, LANTERN_TOP - FOOT_H - insets.bottom) : 0;
  // The stray footprints take their room from the stars' band (it never goes below 440: then it scrolls).
  const strays = loose.length ? 24 + loose.length * 44 + strayLift : 0;
  const band = Math.max(440, height - 330 - strays);

  return (
    <View style={styles.screen} testID="look-up" {...passage.mark}>
      {shown && <StatusBar style="light" />}
      <NightSky still={still} warm={shading} ground={ground} passage={passage} />
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <ScrollView {...(web ? { tabIndex: -1 } : {})} contentContainerStyle={[styles.content, { width: w }]}>
          <View style={styles.head}>
            {/* Only the small question (fix 16: no "Not sure."). */}
            <Text ref={heading} accessibilityRole="header" {...(web ? { tabIndex: -1 } : {})} style={styles.asked}>
              {PROMPT}
            </Text>
          </View>
          {stars.length && asList ? (
            <View role="list" aria-label="What it’s for" style={styles.list}>
              {stars.map((st) => (
                <View key={st.thread.id} role="listitem">
                  <Pressable
                    onPress={() => router.push(starTarget(useStore.getState().data, st.thread.id))}
                    accessibilityRole="button"
                    accessibilityLabel={starName(st, now)}
                    testID={`star-${st.thread.id}`}
                    style={styles.row}>
                    <PassageStars s={passage}>
                      <StarGlyph size={STAR} heat={st.heat} motes={st.motes} loops={loops} still={still} />
                    </PassageStars>
                    <Text style={[styles.name, styles.rowName]}>{st.thread.name}</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : stars.length ? (
            <View role="list" aria-label="What it’s for" style={{ height: band }}>
              {stars.map((st) => {
                const [x, y] = STAR_SLOTS[st.slot];
                return (
                  <View key={st.thread.id} role="listitem" style={[styles.place, { left: x * w - itemW / 2, top: y * (band - ITEM_H), width: itemW }]}>
                    <Pressable
                      onPress={() => router.push(starTarget(useStore.getState().data, st.thread.id))}
                      accessibilityRole="button"
                      accessibilityLabel={starName(st, now)}
                      testID={`star-${st.thread.id}`}
                      style={styles.star}>
                      <PassageStars s={passage}>
                        <StarGlyph size={STAR} heat={st.heat} motes={st.motes} loops={loops} still={still} />
                      </PassageStars>
                      <Text style={styles.name} numberOfLines={2}>
                        {st.thread.name}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : (
            // An action, not an explanation (P-66 fix): a why is named on Map.
            <View style={styles.emptyRow}>
              <Text style={styles.empty}>No stars yet.</Text>
              <Link href="/map" asChild>
                <Pressable style={styles.footBtn}>
                  <Text style={styles.mapText}>Map</Text>
                </Pressable>
              </Link>
            </View>
          )}
          {loose.length > 0 && (
            // Stray footprints near the ground: your recent loose lines (fix 18), after the stars.
            <View role="group" aria-label="Loose" style={[styles.loose, { marginBottom: strayLift }]}>
              {loose.map((l) => (
                <Pressable key={l.id} onPress={() => reopen(l.id)} accessibilityRole="button" accessibilityLabel={footprintName(l)} style={styles.stray}>
                  <Text style={styles.strayMark} {...decorative}>
                    ··
                  </Text>
                  <Text style={styles.strayText} numberOfLines={1}>
                    {l.text}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          <View style={[styles.foot, loose.length > 0 && styles.footAfterLoose]}>
            <Pressable onPress={toPrompt} accessibilityRole="button" style={styles.footBtn}>
              <Text style={styles.footText}>Back to typing</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
      <Veil s={passage} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: N.bg },
  fill: { flex: 1 },
  content: { flexGrow: 1, alignSelf: 'center', paddingBottom: 24 },
  head: { paddingHorizontal: 28, paddingTop: 40, paddingBottom: 28, gap: 6 },
  // Focused on arrival only so a screen reader starts there (never by Tab): no focus box.
  asked: { fontFamily: display, fontSize: 16, fontWeight: '500', color: N.faint, ...(web && ({ outlineStyle: 'none' } as object)) },
  place: { position: 'absolute' },
  star: { alignItems: 'center', gap: 8, minHeight: 44, paddingVertical: 2 },
  name: { color: N.ink, fontSize: 15, fontWeight: '500', textAlign: 'center' },
  emptyRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 16, paddingHorizontal: 28 },
  empty: { color: N.muted, fontSize: 15 },
  mapText: { color: N.ink, fontSize: 15, fontWeight: '500', textDecorationLine: 'underline' },
  list: { paddingHorizontal: 28, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 56 },
  rowName: { textAlign: 'left', flexShrink: 1 },
  loose: { marginTop: 'auto', paddingTop: 24, paddingHorizontal: 28, alignItems: 'flex-start' },
  stray: { minHeight: 44, maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 6 },
  strayMark: { color: N.faint, fontSize: 14, letterSpacing: 1 },
  strayText: { color: N.muted, fontSize: 13, fontStyle: 'italic', flexShrink: 1 },
  footAfterLoose: { marginTop: 0, paddingTop: 8 },
  foot: { flexDirection: 'row', gap: 20, paddingHorizontal: 28, marginTop: 'auto', paddingTop: 24 },
  footBtn: { minHeight: 44, minWidth: 44, justifyContent: 'center' },
  footText: { color: N.muted, fontSize: 14 },
});
