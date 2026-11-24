import { router, Slot, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ComponentRef, createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Path } from 'react-native-svg';

import { decorative } from '@/components/a11y';
import { useReduceMotion } from '@/components/graph/scopeNav';
import { lastInput, screenReaderNow } from '@/components/modality';
import { NightSky } from '@/components/NightSky';
import { PassageState, usePassage, Veil } from '@/components/passage';
import { useWhileShown } from '@/components/shown';
import { STAR_PATH } from '@/components/StarGlyph';
import { endsByItself, RestSky, restSky, RETURN_BEAT_MS } from '@/domain/home';
import { Place } from '@/domain/passage';
import { groundFits } from '@/domain/trailhead';
import { useStore } from '@/store/useStore';
import { N } from '@/theme';

const web = Platform.OS === 'web';
const native = !web;

/** The places in the one home: the ground at rest, or a session's subject (P-74). */
export type HomePlace = Exclude<Place, 'map'>;
type Focusable = ComponentRef<typeof View> | ComponentRef<typeof Text> | null;

type HomeContext = {
  /** The camera's passage (P-72): the picture's decorative layers read it. */
  passage: PassageState;
  /** The route in the home says what it is (the camera's place) and what takes focus on arrival. */
  arrive: (place: HomePlace, focus?: () => Focusable) => void;
  /** Ends the session: back down to the trailhead at rest. */
  leave: () => void;
  /** After a choice: the session ends by itself after a short beat, unless assistive tech may be waiting. */
  endSoon: () => void;
};
const Ctx = createContext<HomeContext | null>(null);

/**
 * In a route of the one home: says which place it is (so the camera moves there) and what takes focus
 * when it's arrived at from another place (P-72: its heading; the trailhead focuses its own field).
 */
export function useHome(place: HomePlace, focus?: () => Focusable): HomeContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useHome: outside the home');
  const { arrive } = ctx;
  // Before paint, so the first frame is already the passage's start.
  // `focus` is read when it's arrived at, not followed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => arrive(place, focus), [arrive, place]);
  return ctx;
}

/** Native: whether the keyboard is up (it covers the ground then, so there's none). Web: never known. */
export function useKeyboardUp() {
  const [up, setUp] = useState(false);
  useEffect(() => {
    if (web) return;
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', () => setUp(true));
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return up;
}

/** Leaving a session: back to the trailhead in the history if it's there, else it replaces the session. */
const toRest = () => router.dismissTo('/');

/**
 * One home (P-74, B-08 "One home", D-15): the trailhead, the sky, a star and a trail are one place.
 * The night is drawn once, here, and never unmounts between them; one camera value goes from the
 * ground at rest (0) to looking up (1) by P-72's passage. At rest the sky holds your recent lines as
 * faint unlabelled stars and your whys as guiding stars (decorative: nothing to read or follow); a
 * session (`/sky`, `/star/…`, `/trail/…`, rendered in the Slot) is one layer over the same sky, which
 * dims behind it. Its one way out — its Back control, Esc, Back, or tapping the ground — comes back
 * down to the lantern. Map's dusk is unchanged.
 */
export function Home() {
  const shown = useIsFocused();
  const data = useStore((st) => st.data);
  const shading = useStore((st) => st.showShading);
  const reduce = useReduceMotion();
  const setDoneChip = useStore((st) => st.setDoneChip);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const keyboardUp = useKeyboardUp();
  const [place, setPlace] = useState<HomePlace>();
  const focusRef = useRef<() => Focusable>(undefined);
  const passage = usePassage(place, shown, () => focusRef.current?.() ?? null);
  const up = !!place && place !== 'trailhead';

  // The ground as each place always drew it: only where it fits (the trailhead: not under the
  // keyboard), never under a star (its own landscape), always on a trail.
  const fits = groundFits({ height, insets: insets.top + insets.bottom });
  const ground = place === 'star' ? false : place === 'trail' ? true : fits && !(place === 'trailhead' && keyboardUp);

  // The camera: 0 at rest, 1 looking up; it moves with the passage (a cut when that's still).
  const camera = useMemo(() => new Animated.Value(0), []);
  const { passage: run } = passage;
  useLayoutEffect(() => {
    if (!place) return;
    const to = up ? 1 : 0;
    if (run.kind === 'none' || run.kind === 'dusk') return camera.setValue(to);
    const t = Animated.timing(camera, { toValue: to, duration: run.ms, easing: Easing.out(Easing.cubic), useNativeDriver: native });
    t.start();
    return () => t.stop();
  }, [camera, place, up, run]);

  // Ending by itself after a choice: a short beat (Undo shows first), then down. Anything you do
  // meanwhile keeps you there, and arriving anywhere else forgets it.
  const [ending, setEnding] = useState(0);
  const endSoon = useCallback(() => {
    if (endsByItself({ web, screenReader: screenReaderNow(), input: lastInput() })) setEnding((n) => n + 1);
  }, []);
  useEffect(() => {
    if (!ending || !shown) return;
    const timer = setTimeout(() => {
      setEnding(0);
      toRest();
    }, RETURN_BEAT_MS);
    const stay = () => {
      clearTimeout(timer);
      setEnding(0);
    };
    if (web) {
      document.addEventListener('pointerdown', stay, true);
      document.addEventListener('keydown', stay, true);
    }
    return () => {
      clearTimeout(timer);
      if (web) {
        document.removeEventListener('pointerdown', stay, true);
        document.removeEventListener('keydown', stay, true);
      }
    };
  }, [ending, shown]);

  const arrive = useCallback((p: HomePlace, focus?: () => Focusable) => {
    focusRef.current = focus;
    setEnding(0);
    setPlace(p);
  }, []);
  // P-73: the trailhead's done chip lasts while you're in the home; leaving it (Map, Settings…) turns it off.
  useWhileShown(
    shown,
    useCallback(() => () => setDoneChip(false), [setDoneChip]),
  );
  const ctx = useMemo<HomeContext>(() => ({ passage, arrive, leave: toRest, endSoon }), [passage, arrive, endSoon]);
  // Only while it's in front (Map over it logs without redrawing the home's sky).
  const sky = useMemo(() => (shown ? restSky(data, new Date(), { shading }) : undefined), [shown, data, shading]);

  return (
    <View style={styles.home} testID="home" {...{ dataSet: { camera: up ? 'up' : 'rest' } }}>
      {shown && <StatusBar style="light" />}
      <NightSky still={reduce || !shown} warm={shading} ground={!!place && ground} passage={place ? passage : undefined} />
      {sky && <Stars sky={sky} camera={camera} />}
      <Ctx.Provider value={ctx}>
        <Slot />
      </Ctx.Provider>
      {/* Tapping the ground (the lantern) leaves a session: for a pointer only; its Back control and Esc are the named ways. */}
      {up && ground && fits && (
        <View onStartShouldSetResponder={() => true} onResponderRelease={toRest} {...decorative} style={styles.groundTap} testID="home-ground" />
      )}
      <Veil s={passage} />
    </View>
  );
}

/** A line's star (px) and a guiding star's size. */
const DOT = 3;
const GUIDE = 13;
/** A lit line's star, and the room its glow takes. */
const LIT_STAR = 8;
const LIT = 18;

/**
 * The sky at rest (P-74): your recent lines as faint, unlabelled stars (each in a fixed place, all
 * alike, dimmer than any text), faint lines between ones that share a word, and your whys as guiding
 * stars a little brighter, in the accent colour (theirs alone). Decorative: hidden from screen
 * readers, never in the way of a tap. When a session is up it dims behind it.
 */
function Stars({ sky, camera }: { sky: RestSky; camera: Animated.Value }) {
  const { width, height } = useWindowDimensions();
  const at = useMemo(() => new Map(sky.lines.map((l) => [l.id, l])), [sky]);
  const opacity = camera.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none" {...decorative} testID="rest-sky">
      {sky.links.length > 0 && (
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          {sky.links.map(({ from, to }) => {
            const a = at.get(from)!;
            const b = at.get(to)!;
            return <Line key={`${from}-${to}`} x1={a.x * width} y1={a.y * height} x2={b.x * width} y2={b.y * height} stroke={N.ink} strokeOpacity={0.16} strokeWidth={0.8} />;
          })}
        </Svg>
      )}
      {sky.lines.map((l) =>
        l.lit ? (
          // P-73: a lit line is a small star in night ink (never the accent), its glow fading like warmth.
          <View key={l.id} testID="rest-line" {...{ dataSet: { state: 'lit' } }} style={[styles.lit, { left: l.x * width - LIT / 2, top: l.y * height - LIT / 2 }]}>
            {l.lit.glow > 0 && <View testID="rest-glow" style={[styles.glow, { opacity: 0.3 * l.lit.glow }]} />}
            <Svg width={LIT_STAR} height={LIT_STAR} viewBox="0 0 24 24">
              <Path d={STAR_PATH} fill={N.ink} />
            </Svg>
          </View>
        ) : (
          <View key={l.id} testID="rest-line" {...{ dataSet: { state: 'settled' } }} style={[styles.line, { left: l.x * width - DOT / 2, top: l.y * height - DOT / 2 }]} />
        ),
      )}
      {sky.guides.map((g) => (
        <View key={g.id} testID="rest-guide" style={[styles.guide, { left: g.x * width - GUIDE / 2, top: g.y * height - GUIDE / 2 }]}>
          <Svg width={GUIDE} height={GUIDE} viewBox="0 0 24 24">
            <Path d={STAR_PATH} fill={N.lantern} />
          </Svg>
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  home: { flex: 1, backgroundColor: N.bg },
  // Dimmer than any text (P-66's rule for the sky's dots).
  line: { position: 'absolute', width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: N.ink, opacity: 0.45 },
  guide: { position: 'absolute', width: GUIDE, height: GUIDE, opacity: 0.85 },
  lit: { position: 'absolute', width: LIT, height: LIT, alignItems: 'center', justifyContent: 'center', opacity: 0.8 },
  glow: { position: 'absolute', width: LIT, height: LIT, borderRadius: LIT / 2, backgroundColor: N.ink },
  // Over the lantern's core (96 above the bottom), 64 square.
  groundTap: { position: 'absolute', bottom: 96 - 32, left: '50%', marginLeft: -32, width: 64, height: 64 },
});
