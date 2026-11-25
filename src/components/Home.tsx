import { router, Slot, useIsFocused, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ComponentRef, createContext, ReactNode, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, GestureResponderEvent, Keyboard, PanResponder, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { decorative } from '@/components/a11y';
import { useReduceMotion } from '@/components/graph/scopeNav';
import { lastInput, screenReaderNow } from '@/components/modality';
import { NightSky } from '@/components/NightSky';
import { PassageState, usePassage, Veil } from '@/components/passage';
import { useWhileShown } from '@/components/shown';
import { STAR_PATH } from '@/components/StarGlyph';
import { endsByItself, Guide, OLD_HOME, restGuides, RETURN_BEAT_MS, swipeLeaves, swipeStarts } from '@/domain/home';
import { Place } from '@/domain/passage';
import { groundFits, groundGlideMs } from '@/domain/trailhead';
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
  /**
   * The trailhead is starting a tilt (I'm not sure, Return): an Esc pressed before the session has
   * arrived still leaves it, as soon as it does (audit F3: the navigation lands a moment later).
   */
  tilting: () => void;
  /**
   * P-79: the home at rest says where its ground goes — drawn or not, and how far above the bottom (just
   * above the composer); `undefined` when it isn't shown.
   */
  rest: (r: RestGround | undefined) => void;
};
/** Where the ground stands at rest (P-79). */
export type RestGround = { ground: boolean; lift: number };
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

/** An Esc this soon after a tilt starts, before its session has arrived, still leaves it (audit F3). */
const TILT_ESC_MS = 1500;

/** Where the home was at rest last: `/old` (P-88: `/` is the new app's), or `/sky` while the map is lit (P-81). */
let restPath: typeof OLD_HOME | '/sky' = OLD_HOME;
/**
 * Leaving a session: back to the home at rest as it was — lit or not (P-81: it stays lit until
 * toggled) — in the history if it's there, else it replaces the session.
 */
const toRest = () => router.dismissTo(restPath);
/** A path of the home at rest: the trailhead, or the trailhead with the map lit (P-81: `/sky` is the lit state). */
export const restRoute = (path: string): typeof OLD_HOME | '/sky' | undefined => (path === OLD_HOME ? OLD_HOME : path === '/sky' ? '/sky' : undefined);

/**
 * Where a drag starts (audit F5). Web: in a field (a drag selects text), and whether anything it's in
 * is scrolled (a drag down there scrolls it). Native: the drag is only offered after the content (its
 * ScrollView) has passed on it, so it counts as at the top.
 */
function dragFrom(target: EventTarget | null): { atTop: boolean; inField: boolean } {
  if (!web || typeof document === 'undefined') return { atTop: true, inField: false };
  let el = target as HTMLElement | null;
  if (!(el instanceof HTMLElement)) return { atTop: true, inField: false };
  const inField = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
  for (; el && el !== document.body; el = el.parentElement) if (el.scrollTop > 0) return { atTop: false, inField };
  return { atTop: true, inField };
}

/**
 * One home (P-74, B-08 "One home", D-15): the trailhead, the sky, a star and a trail are one place.
 * The night is drawn once, here, and never unmounts between them; one camera value goes from the
 * ground at rest (0) to looking up (1) by P-72's passage. At rest the sky holds your whys as guiding
 * stars (decorative: nothing to read or follow; P-80: your recent lines are the trailhead's live map); a
 * session (`/sky`, `/star/…`, `/trail/…`, rendered in the Slot) is one layer over the same sky, which
 * dims behind it. Its one way out — its Back control, Esc, Back, or tapping the ground — comes back
 * down to the lantern. Map's dusk is unchanged.
 */
export function Home({ trailhead }: { trailhead: (lit: boolean) => ReactNode }) {
  const shown = useIsFocused();
  // P-81: the trailhead is drawn here, not by its route, so `/` ↔ `/sky` (lighting the map) keeps it as it is:
  // the feed's lines, the field and its focus never move or remount.
  // A page outside the home (a wander's, an activity's, Settings) pushed over it keeps the trailhead as it
  // was, mounted under it (as its route kept it before P-81): coming back never remounts it, so its sheet,
  // held lines and history entry stay. Only a session of the home (`/star`, `/trail`, `/line`) replaces it.
  const path = usePathname();
  const here = restRoute(path);
  const ofHome = !!here || /^\/(star|trail|line)\//.test(path);
  const [kept, setKept] = useState(here);
  if (ofHome && kept !== here) setKept(here);
  const resting = ofHome ? here : kept;
  useLayoutEffect(() => {
    if (resting) restPath = resting;
  }, [resting]);
  const data = useStore((st) => st.data);
  const shading = useStore((st) => st.showShading);
  const reduce = useReduceMotion();
  const setDoneChip = useStore((st) => st.setDoneChip);
  // P-84: while the sheet's search shows in the sky, its nodes take the whys' places.
  const searching = useStore((st) => st.sheet.open && !!st.sheetSearch.trim());
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const keyboardUp = useKeyboardUp();
  const [place, setPlace] = useState<HomePlace>();
  // P-79: at rest the trailhead says whether its ground fits above the composer, and how high it stands.
  const [restGround, setRestGround] = useState<RestGround>();
  const rest = useCallback((r: RestGround | undefined) => setRestGround((was) => (was?.ground === r?.ground && was?.lift === r?.lift ? was : r)), []);
  const focusRef = useRef<() => Focusable>(undefined);
  const passage = usePassage(place, shown, () => focusRef.current?.() ?? null);
  const up = !!place && place !== 'trailhead';

  // The ground as each place always drew it: only where it fits, never under a star (its own
  // landscape), always on a trail; at rest (P-79) just above the composer, where the trailhead says it
  // fits (never under the keyboard).
  const fits = groundFits({ height, insets: insets.top + insets.bottom });
  const atRest = place === 'trailhead';
  const ground = place === 'star' ? false : place === 'trail' ? true : atRest ? !!restGround?.ground && !keyboardUp : fits;
  const lift = atRest && restGround?.ground ? restGround.lift : 0;
  // Fix d (after P-80): the hills glide between rest (on the composer) and a session (at the foot) with
  // the camera, never jumping; a change at rest (the composer's height arriving) is a cut, as is Reduce Motion.
  const hillsLift = useMemo(() => new Animated.Value(lift), []); // eslint-disable-line react-hooks/exhaustive-deps
  const liftWas = useRef({ lift, place });

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
  useLayoutEffect(() => {
    const was = liftWas.current;
    liftWas.current = { lift, place };
    const ms = was.place !== place && was.place ? groundGlideMs({ from: was.lift, to: lift, ms: run.kind === 'none' ? 0 : run.ms, reduce }) : 0;
    if (!ms) return hillsLift.setValue(lift);
    const t = Animated.timing(hillsLift, { toValue: lift, duration: ms, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    t.start();
    return () => t.stop();
  }, [hillsLift, lift, place, run, reduce]);

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

  // An Esc during a tilt that hasn't landed yet (audit F3): remembered, and the session leaves on arrival.
  const tilt = useRef<{ since: number; esc: boolean }>(undefined);
  const tilting = useCallback(() => {
    tilt.current = { since: Date.now(), esc: false };
  }, []);
  useEffect(() => {
    if (!web || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && tilt.current && Date.now() - tilt.current.since < TILT_ESC_MS) tilt.current.esc = true;
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, []);

  const arrive = useCallback((p: HomePlace, focus?: () => Focusable) => {
    const pending = tilt.current;
    tilt.current = undefined;
    focusRef.current = focus;
    setEnding(0);
    setPlace(p);
    if (pending?.esc && p !== 'trailhead' && Date.now() - pending.since < TILT_ESC_MS) setTimeout(toRest, 0);
  }, []);
  // P-73: the trailhead's done chip lasts while you're in the home; leaving it (Map, Settings…) turns it off.
  useWhileShown(
    shown,
    useCallback(() => () => setDoneChip(false), [setDoneChip]),
  );
  // The swipe down (audit F5): a downward drag on a session leaves it, as tapping the ground does. Never
  // from scrolled content or a field; nothing moves with it, so Reduce Motion changes nothing.
  // Native: a responder, offered the drag only once the content (its ScrollView) passes it on.
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e: GestureResponderEvent, g) => up && swipeStarts({ dx: g.dx, dy: g.dy, atTop: true }),
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_e, g) => {
          if (swipeLeaves({ dx: g.dx, dy: g.dy, vy: g.vy, atTop: true })) toRest();
        },
      }),
    [up],
  );
  // Web: the pointer, from press to release (a browser that scrolls instead cancels it). A drag that
  // leaves isn't also a tap on what it started on.
  useEffect(() => {
    if (!web || !up || !shown || typeof document === 'undefined') return;
    let start: { x: number; y: number; t: number; atTop: boolean; inField: boolean } | undefined;
    const down = (e: PointerEvent) => {
      start = e.button === 0 ? { x: e.clientX, y: e.clientY, t: e.timeStamp, ...dragFrom(e.target) } : undefined;
    };
    const cancel = () => (start = undefined);
    const release = (e: PointerEvent) => {
      const s = start;
      start = undefined;
      if (!s) return;
      const dy = e.clientY - s.y;
      if (!swipeLeaves({ dx: e.clientX - s.x, dy, vy: dy / Math.max(1, e.timeStamp - s.t), atTop: s.atTop, inField: s.inField })) return;
      const eat = (c: MouseEvent) => {
        c.preventDefault();
        c.stopPropagation();
      };
      document.addEventListener('click', eat, { capture: true, once: true });
      setTimeout(() => document.removeEventListener('click', eat, true), 0);
      toRest();
    };
    // Selected words would be dragged away instead (and the pointer cancelled): a session drags nothing out.
    const noDrag = (e: DragEvent) => e.preventDefault();
    document.addEventListener('pointerdown', down, true);
    document.addEventListener('pointerup', release, true);
    document.addEventListener('pointercancel', cancel, true);
    document.addEventListener('dragstart', noDrag, true);
    return () => {
      document.removeEventListener('dragstart', noDrag, true);
      document.removeEventListener('pointerdown', down, true);
      document.removeEventListener('pointerup', release, true);
      document.removeEventListener('pointercancel', cancel, true);
    };
  }, [up, shown]);
  const ctx = useMemo<HomeContext>(() => ({ passage, arrive, leave: toRest, endSoon, tilting, rest }), [passage, arrive, endSoon, tilting, rest]);
  // Only while it's in front (Map over it logs without redrawing the home's sky). P-80: your recent
  // lines are the live map's now (the trailhead draws them, labelled); the whys stay as guiding stars.
  const guides = useMemo(() => (shown ? restGuides(data, new Date()) : undefined), [shown, data]);

  return (
    <View style={styles.home} testID="home" {...{ dataSet: { camera: up ? 'up' : 'rest' } }}>
      {shown && <StatusBar style="light" />}
      <NightSky still={reduce || !shown} warm={shading} ground={!!place && ground} passage={place ? passage : undefined} lift={lift} hillsLift={hillsLift} />
      {/* P-81/P-84: lit (or mirroring the sheet's search), the whys are the map's named nodes (the trailhead draws them), not guiding stars. */}
      {guides && guides.length > 0 && resting !== '/sky' && !searching && <Stars guides={guides} camera={camera} />}
      <View style={styles.layer} testID="home-layer" {...(up && !web ? swipe.panHandlers : {})}>
        <Ctx.Provider value={ctx}>
          <Slot />
          {resting && <View style={StyleSheet.absoluteFill}>{trailhead(resting === '/sky')}</View>}
        </Ctx.Provider>
      </View>
      {/* Tapping the ground (the lantern) leaves a session: for a pointer only; its Back control and Esc are the named ways. */}
      {up && ground && fits && (
        <View onStartShouldSetResponder={() => true} onResponderRelease={toRest} {...decorative} style={styles.groundTap} testID="home-ground" />
      )}
      <Veil s={passage} />
    </View>
  );
}

/** A guiding star's size. */
const GUIDE = 13;

/**
 * The sky at rest: your whys as guiding stars, in the accent colour (theirs alone), each in a fixed
 * place high up. Decorative: hidden from screen readers, never in the way of a tap. When a session is
 * up it dims behind it. (P-74's faint unlabelled stars for your lines gave way to P-80's live map.)
 */
function Stars({ guides, camera }: { guides: Guide[]; camera: Animated.Value }) {
  const { width, height } = useWindowDimensions();
  const opacity = camera.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none" {...decorative} testID="rest-sky">
      {guides.map((g) => (
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
  layer: { flex: 1 },
  guide: { position: 'absolute', width: GUIDE, height: GUIDE, opacity: 0.85 },
  // Over the lantern's core (96 above the bottom), 64 square.
  groundTap: { position: 'absolute', bottom: 96 - 32, left: '50%', marginLeft: -32, width: 64, height: 64 },
});
