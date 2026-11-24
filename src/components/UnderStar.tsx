import { Redirect, router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { decorative } from '@/components/a11y';
import { useReduceMotion } from '@/components/graph/scopeNav';
import { BackGlyph } from '@/components/icons';
import { NightSky } from '@/components/NightSky';
import { StarGlyph, useMotes } from '@/components/StarGlyph';
import { useEscBack } from '@/components/useEscBack';
import { landmarkName, landmarks, SCENE_H, skyStars, starScene, starTarget } from '@/domain/sky';
import { Id } from '@/domain/types';
import { useStore } from '@/store/useStore';
import { N } from '@/theme';

const display = Platform.select({ web: '"Space Grotesk", SpaceGrotesk, system-ui, -apple-system, "Segoe UI", sans-serif', default: undefined });
const MAX_W = 640;
const web = Platform.OS === 'web';

/** Back to the sky: where it came from, or the sky when this was opened first. */
const toSky = () => (router.canGoBack() ? router.back() : router.replace('/sky'));
const openTrail = (threadId: Id, starId: Id) => router.push(`/trail/${encodeURIComponent(threadId)}?star=${encodeURIComponent(starId)}`);

/**
 * Under a star (P-66, B-07 slice 2): the star at the top with its motes; on the hills its landmarks
 * (the wanders feeding it), each with a flag and a dotted trail from camp, their names in a row above
 * every flag (clear of the trails); under them a card per landmark: its name, its next step (or a small
 * "＋ Add a next step") and latest note. The order is fixed (when each was made, then name); the one
 * walked lately is only warm (not with the shading off) and says so in its card's name. Beyond three,
 * "More wanders…" lists the rest. A why with one wander (or none) opens that trail instead (`starTarget`).
 */
export function UnderStar({ id }: { id: Id }) {
  const shown = useIsFocused();
  const data = useStore((st) => st.data);
  const shading = useStore((st) => st.showShading);
  const reduce = useReduceMotion();
  const still = reduce || !shown;
  const loops = useMotes(still);
  const { width } = useWindowDimensions();
  const [moreOpen, setMoreOpen] = useState(false);
  useEscBack(shown, toSky);

  const why = data.threads[id];
  const star = useMemo(() => skyStars(data, { shading }).find((s) => s.thread.id === id), [data, shading, id]);
  const lm = useMemo(() => landmarks(data, id, { shading }), [data, id, shading]);
  const target = why && !why.hidden ? starTarget(data, id) : '/sky';
  // Gone, or one wander or none: the sky, or straight onto the trail.
  if (!target.startsWith('/star/')) return <Redirect href={target} />;

  const w = Math.min(width, MAX_W);
  const scene = starScene(lm.shown.length, w);
  const heat = star?.heat ?? 0;
  const motes = star?.motes ?? 0;

  return (
    <View style={styles.screen} testID="under-star">
      {shown && <StatusBar style="light" />}
      <NightSky still={still} warm={shading} ground={false} />
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <ScrollView {...(web ? { tabIndex: -1 } : {})} contentContainerStyle={[styles.content, { width: w }]}>
          <View style={styles.top}>
            <Pressable onPress={toSky} accessibilityRole="button" accessibilityLabel="Back to the sky" style={styles.back}>
              <BackGlyph color={N.muted} />
            </Pressable>
          </View>
          <View style={styles.head}>
            <StarGlyph size={52} heat={heat} motes={motes} loops={loops} still={still} />
            <Text accessibilityRole="header" style={styles.title}>
              {why.name}
            </Text>
          </View>

          <View style={{ height: SCENE_H }} {...decorative} testID="star-scene">
            <Svg width={w} height={SCENE_H} style={StyleSheet.absoluteFill}>
              <Defs>
                <RadialGradient id="camp" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={shading ? N.lantern : N.silver} stopOpacity={0.5} />
                  <Stop offset="1" stopColor={shading ? N.lantern : N.silver} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Path d={scene.ridge} fill={N.hillFar} />
              {scene.trails.map((t, i) => (
                <Path key={i} d={t.d} fill="none" stroke={lm.shown[i].warm ? N.lantern : N.trail} strokeWidth={2.5} strokeDasharray="2 7" strokeLinecap="round" testID="star-trail" />
              ))}
              {scene.flags.map((f, i) => (
                <Path key={i} d={`M${f.x} ${f.y} v-16 l9 4 -9 4`} fill={lm.shown[i].warm ? N.lantern : N.faint} testID="landmark-flag" />
              ))}
              <Circle cx={scene.camp.x} cy={scene.camp.y} r={34} fill="url(#camp)" />
              <Circle cx={scene.camp.x} cy={scene.camp.y + 2} r={6} fill={N.lanternCore} />
            </Svg>
            {scene.labels.map((l, i) => (
              <Text
                key={i}
                numberOfLines={2}
                testID="landmark-label"
                style={[styles.label, { left: l.x, top: l.y, width: l.w, height: l.h }, lm.shown[i].warm && { color: N.lantern }]}>
                {lm.shown[i].thread.name}
              </Text>
            ))}
          </View>

          <View style={styles.cards} role="list" aria-label="Wanders">
            {lm.shown.map((l) => (
              <View key={l.thread.id} role="listitem" style={styles.cardSlot}>
                <Pressable
                  onPress={() => openTrail(l.thread.id, id)}
                  accessibilityRole="button"
                  accessibilityLabel={landmarkName(l)}
                  testID={`landmark-${l.thread.id}`}
                  style={[styles.card, l.warm && styles.cardWarm]}>
                  {/* Its wander, so a card never relies on its column (P-66 fix). */}
                  <Text style={[styles.cardName, l.warm && { color: N.lantern }]} numberOfLines={2}>
                    {/* The trailing space keeps the visible text's words apart (the name starts with it, in order). */}
                    {`${l.thread.name} `}
                  </Text>
                  {l.step ? (
                    <Text style={styles.step}>{`${l.step} `}</Text>
                  ) : (
                    // A small line in the card, not a card of its own (P-66 fix).
                    <Text style={styles.noStep}>
                      <Text {...decorative}>＋ </Text>Add a next step
                    </Text>
                  )}
                  {l.note && <Text style={styles.note}>“{l.note}”</Text>}
                </Pressable>
              </View>
            ))}
          </View>

          {lm.more.length > 0 && (
            <View style={styles.more}>
              <Pressable onPress={() => setMoreOpen((o) => !o)} accessibilityRole="button" aria-expanded={moreOpen} style={styles.moreBtn}>
                <Text style={styles.moreText}>More wanders…</Text>
              </Pressable>
              {moreOpen && (
                <View role="list" aria-label="More wanders">
                  {lm.more.map((l) => (
                    <View key={l.thread.id} role="listitem">
                      <Pressable onPress={() => openTrail(l.thread.id, id)} accessibilityRole="button" style={styles.moreItem}>
                        <Text style={styles.moreName}>{l.thread.name}</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: N.bg },
  fill: { flex: 1 },
  content: { flexGrow: 1, alignSelf: 'center', paddingBottom: 32 },
  top: { flexDirection: 'row', paddingHorizontal: 8, paddingTop: 8 },
  back: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  head: { alignItems: 'center', gap: 14, paddingHorizontal: 28, paddingBottom: 12 },
  title: { fontFamily: display, fontSize: 24, fontWeight: '700', color: N.ink, textAlign: 'center', letterSpacing: -0.3 },
  // A halo in the sky's colour keeps a background dot from reading as part of a word (P-66 fix).
  label: { position: 'absolute', textAlign: 'center', fontSize: 13, lineHeight: 18, color: N.muted, textShadowColor: N.bg, textShadowRadius: 6, textShadowOffset: { width: 0, height: 0 } },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12 },
  cardSlot: { flexGrow: 1, flexBasis: 0, minWidth: 100 },
  card: { minHeight: 44, padding: 10, borderRadius: 14, backgroundColor: N.card, borderWidth: 1, borderColor: N.line, gap: 4 },
  cardWarm: { borderColor: N.lantern, borderWidth: 1.5 },
  step: { color: N.ink, fontSize: 14, fontWeight: '600', lineHeight: 18 },
  cardName: { color: N.muted, fontSize: 12, lineHeight: 16 },
  noStep: { color: N.muted, fontSize: 12, lineHeight: 16 },
  note: { color: N.muted, fontSize: 12 },
  more: { paddingHorizontal: 20, paddingTop: 16 },
  moreBtn: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  moreText: { color: N.muted, fontSize: 14 },
  moreItem: { minHeight: 44, justifyContent: 'center' },
  moreName: { color: N.ink, fontSize: 15 },
});
