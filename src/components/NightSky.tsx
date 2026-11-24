import { useEffect, useMemo } from 'react';
import { Animated, Easing, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { decorative } from '@/components/a11y';
import { fadeIn, hillsY, PassageState, Wanderer } from '@/components/passage';
import { GROUND_H } from '@/domain/trailhead';
import { N } from '@/theme';

/** Stars as fractions of the screen (from mockup Sky1 at 390 × 844), their radius, and whether they twinkle. */
const STARS: [x: number, y: number, r: number, twinkle?: 1 | 2][] = [
  [0.087, 0.073, 1.2, 1], [0.226, 0.152, 0.9], [0.364, 0.052, 1.4, 2], [0.549, 0.114, 0.8], [0.687, 0.045, 1.1, 1],
  [0.846, 0.1, 1.5, 2], [0.928, 0.178, 0.9], [0.051, 0.249, 0.8], [0.769, 0.225, 1], [0.954, 0.308, 1.2, 1],
  [0.154, 0.355, 1, 2], [0.631, 0.296, 0.7], [0.308, 0.664, 0.8], [0.872, 0.616, 1, 1], [0.077, 0.569, 0.9], [0.708, 0.699, 0.7],
];
/** The hills, drawn 390 wide and 220 tall, stretched across the bottom. */
const HILLS_H = GROUND_H;
/**
 * The dots are dimmer than any text (P-66 fix), so one that happens to sit behind a word never reads
 * as part of it: still ones at DOT, twinkling ones between TWINKLE (still: their middle).
 */
const DOT = 0.5;
const TWINKLE = [0.25, 0.6] as const;
const native = Platform.OS !== 'web';

/** A loop between two values (twinkle: opacity; the lantern: opacity and size), or nothing when still. */
export function useLoop(still: boolean, ms: number, delay = 0) {
  const v = useMemo(() => new Animated.Value(0), []);
  useEffect(() => {
    v.setValue(0);
    if (still) return;
    const half = { duration: ms / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: native };
    const loop = Animated.loop(Animated.sequence([Animated.delay(delay), Animated.timing(v, { toValue: 1, ...half }), Animated.timing(v, { toValue: 0, ...half })]));
    loop.start();
    return () => loop.stop();
  }, [still, ms, delay, v]);
  return v;
}

/**
 * The trailhead's night (P-65, B-07): a sky over two dark hills, a few stars and the lantern glow where
 * the path starts. Purely decorative (hidden from screen readers, never in the way of a tap). A few
 * stars twinkle and the lantern breathes, only while `still` is false (Reduce Motion, or the screen
 * isn't in front, stills them: twinkling stars hold a soft middle glow). Every dot is dimmer than text.
 * The trailhead leaves out the ground where it would reach its controls (`groundFits`). With shading off (`warm`
 * false) the lantern's glow is silver. Without `ground` (P-66, under a star) it's only the sky: no
 * hills, path or lantern. With a `passage` (P-72) the hills sink or rise into place, the stars and the
 * lantern fade in, and the wanderer can walk up the path; under Reduce Motion the passage is still.
 * `lift` (P-79): the ground stands that far above the bottom — at rest, just above the composer.
 */
export function NightSky({ still, warm, ground = true, passage, lift = 0 }: { still: boolean; warm: boolean; ground?: boolean; passage?: PassageState; lift?: number }) {
  const { width } = useWindowDimensions();
  const tw1 = useLoop(still, 4000);
  const tw2 = useLoop(still, 6000, 1500);
  const lamp = useLoop(still, 2600);
  const glow = warm ? N.lantern : N.silver;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" {...decorative} testID="night-sky">
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={N.skyTop} />
            <Stop offset="0.62" stopColor={N.skyMid} />
            <Stop offset="1" stopColor={N.skyLow} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#sky)" />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, passage && { opacity: fadeIn(passage.p, passage.motion.stars) }]}>
        {STARS.map(([x, y, r, t], i) => {
          const size = Math.max(2, r * 2);
          const style = [styles.star, { left: `${x * 100}%`, top: `${y * 100}%`, width: size, height: size, borderRadius: size / 2 }] as const;
          if (!t) return <View key={i} style={[style, { opacity: DOT }]} testID="sky-dot" />;
          // Still: a soft middle glow (the loop's 0 maps to it then).
          const v = t === 1 ? tw1 : tw2;
          const opacity = still ? (TWINKLE[0] + TWINKLE[1]) / 2 : v.interpolate({ inputRange: [0, 1], outputRange: [...TWINKLE] });
          return <Animated.View key={i} style={[style, { opacity }]} testID="sky-twinkle" />;
        })}
      </Animated.View>
      {ground && (
        <>
          <Animated.View style={[styles.hills, lift > 0 && { bottom: lift }, passage && { transform: [{ translateY: hillsY(passage) }] }]} testID="sky-ground">
            <Svg width="100%" height={HILLS_H} viewBox={`0 0 390 ${HILLS_H}`} preserveAspectRatio="none">
              <Path d="M0 48 C 60 16 120 38 170 22 S 280 -14 330 6 S 380 26 390 16 V220 H0 Z" fill={N.hillFar} />
              <Path d="M0 100 C 90 76 170 104 250 84 S 360 76 390 88 V220 H0 Z" fill={N.hillNear} />
              <Path d="M195 132 C 190 106 214 92 206 76 S 178 56 192 40" fill="none" stroke={N.path} strokeWidth={2} strokeDasharray="2 6" strokeLinecap="round" />
            </Svg>
            {/* P-72: on a trail the wanderer walks up the path, from the lantern to the ridge. */}
            {passage?.motion.walk === 'up' && <Wanderer s={passage} a={{ x: (width * 195) / 390, y: HILLS_H - 96 }} b={{ x: (width * 192) / 390, y: 40 }} />}
          </Animated.View>
          {/* The lantern only fades (P-72): moved, it would cross what stands just above it. */}
          <Animated.View style={[StyleSheet.absoluteFill, passage && { opacity: fadeIn(passage.p, passage.motion.lamp) }]}>
            <Animated.View
              testID="sky-lantern"
              style={[
                styles.lamp,
                lift > 0 && { bottom: LAMP_BOTTOM + lift },
                still
                  ? { opacity: 0.9 }
                  : { opacity: lamp.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }), transform: [{ scale: lamp.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] },
              ]}>
              <Svg width={140} height={140}>
                <Defs>
                  <RadialGradient id="lamp" cx="50%" cy="50%" r="50%">
                    <Stop offset="0" stopColor={glow} stopOpacity={0.55} />
                    <Stop offset="1" stopColor={glow} stopOpacity={0} />
                  </RadialGradient>
                </Defs>
                <Circle cx={70} cy={70} r={70} fill="url(#lamp)" />
              </Svg>
            </Animated.View>
            <View style={[styles.core, lift > 0 && { bottom: CORE_BOTTOM + lift }]} testID="sky-core" />
          </Animated.View>
        </>
      )}
    </View>
  );
}

const LAMP_BOTTOM = 102 - 70;
const CORE_BOTTOM = 96 - 6;

const styles = StyleSheet.create({
  star: { position: 'absolute', backgroundColor: N.ink },
  hills: { position: 'absolute', left: 0, right: 0, bottom: 0, height: HILLS_H },
  // The lantern sits where the path starts: 102 above the bottom (742 of 844 in the mockup).
  lamp: { position: 'absolute', bottom: LAMP_BOTTOM, left: '50%', marginLeft: -70, width: 140, height: 140 },
  core: { position: 'absolute', bottom: CORE_BOTTOM, left: '50%', marginLeft: -6, width: 12, height: 12, borderRadius: 6, backgroundColor: N.lanternCore },
});
