import { ComponentRef, ReactNode, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import { decorative } from '@/components/a11y';
import { Motion, motionFor, Passage, passageFor, Place, STILL, Walk } from '@/domain/passage';
import { N } from '@/theme';

const web = Platform.OS === 'web';
const native = !web;

/** The place in front before this one (P-72): the screen arrived at plays the transition between them. */
let last: Place | undefined;

/**
 * Whether Reduce Motion is on, read at once (a screen's own `useReduceMotion` only knows after its
 * first render, too late for the first frame of a transition). Web: the media query; native: kept
 * from AccessibilityInfo since the app started.
 */
let reduceNative = false;
if (native) {
  void AccessibilityInfo.isReduceMotionEnabled().then((v) => (reduceNative = v));
  AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => (reduceNative = v));
}
export function reduceMotionNow() {
  if (web) return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return reduceNative;
}

type Focusable = ComponentRef<typeof View> | null;

export type PassageState = {
  passage: Passage;
  motion: Motion;
  /** 0 at the start of the transition, 1 at rest (where it stays). */
  p: Animated.Value;
  moving: boolean;
  /** For the screen's root: what it played (`data-passage`, `data-reverse`) and whether it's still moving. */
  mark: object;
};

/**
 * P-72: plays the transition into `place` each time it comes in front (`shown`), from the place in
 * front before it. Nothing waits for it: only decorative layers read `p`, by transform and opacity.
 * Arriving from another place, focus moves to `focus()` (web; the screen's heading), the same under
 * Reduce Motion, when nothing moves.
 */
export function usePassage(place: Place, shown: boolean, focus?: () => Focusable): PassageState {
  const p = useMemo(() => new Animated.Value(1), []);
  // `n` counts arrivals, so the same transition twice in a row still runs.
  const [run, setRun] = useState({ passage: STILL, moving: false, n: 0 });
  // Before paint, so the first frame drawn is already the transition's start.
  useLayoutEffect(() => {
    if (!shown) return;
    const from = last;
    last = place;
    const t = passageFor(from, place, { reduce: reduceMotionNow() });
    p.setValue(t.kind === 'none' ? 1 : 0);
    // Coming in front is navigation (outside React), and its start must be drawn before the first paint.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRun((r) => ({ passage: t, moving: t.kind !== 'none', n: r.n + 1 }));
    if (from && from !== place && focus && web) requestAnimationFrame(() => (focus() as unknown as HTMLElement | null)?.focus?.());
    // Leaving mid-way: the picture is at rest when it's back.
    return () => p.setValue(1);
    // `focus` is read when the screen comes in front, not followed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, place, p]);
  // Once its start has been drawn (two frames: the clock starts after the screen's first paint, not
  // during a slow mount), the transition runs to rest.
  const { passage, moving, n } = run;
  useEffect(() => {
    if (!moving) return;
    const timing = Animated.timing(p, { toValue: 1, duration: passage.ms, easing: Easing.out(Easing.cubic), useNativeDriver: native });
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => timing.start(() => setRun((r) => (r.n === n ? { ...r, moving: false } : r))));
    });
    return () => {
      cancelAnimationFrame(frame);
      timing.stop();
    };
  }, [moving, n, passage.ms, p]);
  const motion = motionFor(passage, place);
  const mark = { dataSet: { passage: passage.kind, reverse: String(passage.reverse), moving: String(moving) } };
  return { passage, motion, p, moving, mark };
}

/** From a starting value to `to` (its rest) as the transition runs. */
export const from = (p: Animated.Value, start: number, to: number) => (start === to ? to : p.interpolate({ inputRange: [0, 1], outputRange: [start, to] }));

/** The hills' offset (px) from their place: they sink (start above) or rise (start below) into it. */
export const hillsY = (s: Pick<PassageState, 'p' | 'motion'>) => from(s.p, s.motion.hills, 0);
/** A layer that fades in from `start` (the stars, the lantern): reusable for a star rising or twinkling in. */
export const fadeIn = (p: Animated.Value, start: number) => from(p, start, 1);
/** A star rising and twinkling in (for B-08's landing): fades in, grows from small, rises a little. */
export const starIn = (p: Animated.Value) => ({
  opacity: p.interpolate({ inputRange: [0, 0.4, 0.7, 1], outputRange: [0, 1, 0.7, 1] }),
  transform: [{ translateY: from(p, 12, 0) }, { scale: from(p, 0.6, 1) }],
});

/** The stars' layer: a star's glyph (or the sky's dots) fades in as the transition says. */
export function PassageStars({ s, children }: { s?: Pick<PassageState, 'p' | 'motion'>; children: ReactNode }) {
  if (!s) return <>{children}</>;
  return (
    <Animated.View style={{ opacity: fadeIn(s.p, s.motion.stars) }} pointerEvents="none" testID="passage-stars">
      {children}
    </Animated.View>
  );
}

/** Dusk (Map coming in) and night (leaving Map): a veil over the screen that lifts. It never takes a tap. */
const VEIL = { dusk: '#4A3B5E', night: N.bg };
export function Veil({ s }: { s: PassageState }) {
  const v = s.motion.veil;
  if (!v || !s.moving) return null;
  return (
    <Animated.View
      testID="passage-veil"
      pointerEvents="none"
      {...decorative}
      style={[StyleSheet.absoluteFill, { backgroundColor: VEIL[v.tone], opacity: from(s.p, v.from, 0) }]}
    />
  );
}

/** The wanderer: a small warm light with a glow, there only while it walks. */
const SIZE = 10;
const HALO = 28;
/**
 * Walks from `a` to `b` (each the centre, px within its parent) while the transition runs, swaying a
 * little, and fades into where it arrives. Decorative.
 */
export function Wanderer({ s, a, b }: { s: PassageState; a: { x: number; y: number }; b: { x: number; y: number } }) {
  if (!s.moving) return null;
  const { p } = s;
  const [dx, dy] = [b.x - a.x, b.y - a.y];
  return (
    <Animated.View
      testID="passage-wanderer"
      pointerEvents="none"
      {...decorative}
      style={[
        styles.wanderer,
        {
          left: a.x - HALO / 2,
          top: a.y - HALO / 2,
          opacity: p.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 1, 0] }),
          // A little sway as it goes.
          transform: [{ translateX: p.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, dx * 0.25 + 4, dx * 0.5, dx * 0.75 - 4, dx] }) }, { translateY: from(p, 0, dy) }],
        },
      ]}>
      <View style={styles.halo} />
      <View style={styles.light} />
    </Animated.View>
  );
}

/** Where the wanderer walks under a star: from the hills' foot to camp, or back down a trail to camp. */
export function campWalk(walk: Walk | undefined, camp: { x: number; y: number }, height: number) {
  if (walk === 'to-camp') return { a: { x: camp.x - 70, y: height + 4 }, b: camp };
  if (walk === 'back-to-camp') return { a: { x: camp.x + 40, y: camp.y - 80 }, b: camp };
  return undefined;
}

const styles = StyleSheet.create({
  wanderer: { position: 'absolute', width: HALO, height: HALO, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: HALO, height: HALO, borderRadius: HALO / 2, backgroundColor: N.lantern, opacity: 0.25 },
  light: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: N.lanternCore },
});
