import { useId } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { decorative } from '@/components/a11y';
import { useLoop } from '@/components/NightSky';
import { starTint } from '@/domain/sky';

/** The four-point star (mockups Sky1–4), on a 24 × 24 box. */
export const STAR_PATH = 'M12 1 L13.8 10.2 L23 12 L13.8 13.8 L12 23 L10.2 13.8 L1 12 L10.2 10.2Z';

/** Motes around a star (mockup Sky2, on a 110 box around a 40 star): x, y, radius, and which of the four loops. */
const MOTES: [x: number, y: number, r: number, loop: number][] = [
  [28, 30, 1.6, 0],
  [84, 26, 1.3, 1],
  [96, 66, 1.8, 2],
  [20, 74, 1.2, 3],
  [60, 10, 1.1, 0],
  [14, 48, 1.0, 1],
  [100, 44, 1.2, 2],
  [70, 96, 1.5, 3],
];
const MOTE_BOX = 110;
const MOTE_STAR = 40;
/** A mote's colour (the mockups' warm white). */
const MOTE = '#FFE7D3';

/**
 * The four loops every star's motes share (5 s each, staggered as in the mockup), so a screen of stars
 * runs four animations, not one per mote. Still (Reduce Motion, or the screen not in front): no loops.
 */
export function useMotes(still: boolean): Animated.Value[] {
  return [useLoop(still, 5000), useLoop(still, 5000, 1200), useLoop(still, 5000, 2500), useLoop(still, 5000, 3700)];
}

/**
 * A star (P-66): one size, its colour and glow from its heat (silver cold, amber warm), and `motes`
 * twinkling motes around it (0 with the shading off). Still: the motes hold a soft glow. Decorative:
 * the button it sits in carries the name.
 */
export function StarGlyph({ size, heat, motes, loops, still }: { size: number; heat: number; motes: number; loops: Animated.Value[]; still: boolean }) {
  const id = `glow${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const tint = starTint(heat);
  const k = size / MOTE_STAR;
  const box = MOTE_BOX * k;
  const glow = size * 1.6;
  return (
    <View style={{ width: size, height: size }} {...decorative} pointerEvents="none" testID="star-glyph">
      <View style={[styles.abs, { left: (size - glow) / 2, top: (size - glow) / 2 }]}>
        <Svg width={glow} height={glow}>
          <Defs>
            <RadialGradient id={id} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={tint.glow} stopOpacity={0.55} />
              <Stop offset="1" stopColor={tint.glow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={glow / 2} cy={glow / 2} r={glow / 2} fill={`url(#${id})`} />
        </Svg>
      </View>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d={STAR_PATH} fill={tint.fill} />
      </Svg>
      {MOTES.slice(0, motes).map(([x, y, r, loop], i) => {
        const d = Math.max(2, r * 2 * k);
        const opacity = still ? 0.6 : loops[loop].interpolate({ inputRange: [0, 1], outputRange: [0, 0.9] });
        return (
          <Animated.View
            key={i}
            testID="sky-mote"
            style={[styles.mote, { left: x * k - (box - size) / 2 - d / 2, top: y * k - (box - size) / 2 - d / 2, width: d, height: d, borderRadius: d / 2, opacity }]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  mote: { position: 'absolute', backgroundColor: MOTE },
});
