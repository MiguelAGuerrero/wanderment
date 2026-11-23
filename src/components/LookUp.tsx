import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useReduceMotion } from '@/components/graph/scopeNav';
import { NightSky } from '@/components/NightSky';
import { StarGlyph, useMotes } from '@/components/StarGlyph';
import { PROMPT } from '@/components/Trailhead';
import { skyStars, STAR_SLOTS, starName, starTarget } from '@/domain/sky';
import { useStore } from '@/store/useStore';
import { N } from '@/theme';

/** The big type, as on the trailhead. */
const display = Platform.select({ web: '"Space Grotesk", SpaceGrotesk, system-ui, -apple-system, "Segoe UI", sans-serif', default: undefined });
const STAR = 40;
/** A star and its name (two lines): the slots are this far apart at least (`STAR_SLOTS`). */
const ITEM_H = 92;
const MAX_W = 640;

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
  const { width, height } = useWindowDimensions();
  const stars = useMemo(() => skyStars(data, { shading }), [data, shading]);
  const now = new Date();

  const w = Math.min(width, MAX_W);
  const itemW = Math.min(150, w * 0.42);
  // Room for the slots; a short window scrolls rather than overlapping stars.
  const band = Math.max(440, height - 330);

  return (
    <View style={styles.screen} testID="look-up">
      {shown && <StatusBar style="light" />}
      <NightSky still={still} warm={shading} />
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={[styles.content, { width: w }]}>
          <View style={styles.head}>
            <Text style={styles.asked}>{PROMPT}</Text>
            <Text accessibilityRole="header" style={styles.title}>
              Not sure.
            </Text>
          </View>
          {stars.length ? (
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
                      <StarGlyph size={STAR} heat={st.heat} motes={st.motes} loops={loops} still={still} />
                      <Text style={styles.name} numberOfLines={2}>
                        {st.thread.name}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.empty}>No stars yet.</Text>
          )}
          <View style={styles.foot}>
            <Pressable onPress={toPrompt} accessibilityRole="button" style={styles.footBtn}>
              <Text style={styles.footText}>Back to typing</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: N.bg },
  fill: { flex: 1 },
  content: { flexGrow: 1, alignSelf: 'center', paddingBottom: 24 },
  head: { paddingHorizontal: 28, paddingTop: 40, paddingBottom: 28, gap: 6 },
  asked: { fontFamily: display, fontSize: 16, fontWeight: '500', color: N.faint },
  title: { fontFamily: display, fontSize: 34, fontWeight: '700', color: N.ink, letterSpacing: -0.7 },
  place: { position: 'absolute' },
  star: { alignItems: 'center', gap: 8, minHeight: 44, paddingVertical: 2 },
  name: { color: N.ink, fontSize: 15, fontWeight: '500', textAlign: 'center' },
  empty: { color: N.muted, fontSize: 15, paddingHorizontal: 28 },
  foot: { flexDirection: 'row', gap: 20, paddingHorizontal: 28, marginTop: 'auto', paddingTop: 24 },
  footBtn: { minHeight: 44, minWidth: 44, justifyContent: 'center' },
  footText: { color: N.muted, fontSize: 14 },
});
