import { useIsFocused } from 'expo-router';
import { ComponentRef, RefObject, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, BackHandler, Easing, PanResponder, PanResponderGestureState, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { decorative } from '@/components/a11y';
import { useReduceMotion } from '@/components/graph/scopeNav';
import { ShownProvider } from '@/components/shown';
import { dragEndsOpen, SHEET_SECTIONS, SheetSection } from '@/domain/sheet';
import { useStore } from '@/store/useStore';
import { M } from '@/theme'; // dark Map: the night palette

import { ActivitiesSection } from './ActivitiesSection';
import { WandersSection } from './WandersSection';

/** The handle's and the sheet's accessible name (P-58). */
export const SHEET_NAME = 'Wanders and activities';
/** Marks the browser history entry opening the sheet pushed, so Back puts it away first. */
const KEY = 'wandermentSheet';
/** Room left above the sheet for Home's header (and the scrim a tap on it closes). */
const TOP_GAP = 64;
const DURATION = 260;
/** A press this soon after a drag ended was the drag's own mouse-up, not a tap. */
const AFTER_DRAG_MS = 600;

const native = Platform.OS !== 'web';
const web = () => Platform.OS === 'web' && typeof window !== 'undefined';
const ours = () => web() && !!(window.history.state as Record<string, unknown> | null)?.[KEY];

type Focusable = ComponentRef<typeof View> | null;

/** Moves focus (web) or the screen reader (native) to an element. */
function focusOn(el: Focusable) {
  if (!el) return;
  if (Platform.OS === 'web') (el as unknown as HTMLElement).focus?.();
  else AccessibilityInfo.sendAccessibilityEvent(el, 'focus');
}

/**
 * The sheet's motion (P-58): its position (0 = out, `height` = away), the drags on the handle and on
 * the sheet's top, and putting it away. Made once per Home, like the card's swipe in HomeSlot.
 * `setLayer`: whether the sheet is drawn; `setSettled`: out and at rest.
 */
function motion(height: number, open: boolean, setLayer: (v: boolean) => void, setSettled: (v: boolean) => void) {
  const pos = new Animated.Value(open ? 0 : height);
  const live = { height, reduce: false, layer: open, draggedAt: 0 };
  const show = (v: boolean) => {
    live.layer = v;
    setLayer(v);
  };
  /** Slides to `to` (0 = out), or jumps there under Reduce Motion. */
  const moveTo = (to: number, done?: () => void) => {
    if (live.reduce) {
      pos.stopAnimation();
      pos.setValue(to);
      done?.();
      return;
    }
    Animated.timing(pos, { toValue: to, duration: DURATION, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start(({ finished }) => finished && done?.());
  };
  const isOpen = () => useStore.getState().sheet.open;
  const rest = () => isOpen() && setSettled(true);
  const away = () => !isOpen() && show(false);
  /** Puts it away from the sheet (Esc, the scrim, Close, a drag down, Back): through history when opening it pushed an entry. */
  const close = () => {
    if (ours()) window.history.back();
    else useStore.getState().closeSheet();
  };
  const dragged = () => Date.now() - live.draggedAt < AFTER_DRAG_MS;
  const vertical = (g: PanResponderGestureState) => Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx);
  const clamp = (y: number) => Math.max(0, Math.min(live.height, y));

  /**
   * A vertical drag on `from` ('closed': the handle; 'open': the sheet's top). Native claims it once
   * it moves; web claims the pointer at once (a mouse's moves go to whatever is under it, and the
   * handle is only 44 pt tall) and starts dragging once it moves, so a click is still a tap (web's
   * Pressable presses on the native click).
   */
  const pan = (from: 'open' | 'closed', begin: () => void, to: (g: PanResponderGestureState) => number, end: (g: PanResponderGestureState) => void, cancel: () => void) => {
    let dragging = false;
    const claim = (_: unknown, g: PanResponderGestureState) => vertical(g);
    const stop = () => {
      if (!dragging) return false;
      dragging = false;
      live.draggedAt = Date.now();
      return true;
    };
    return PanResponder.create({
      onStartShouldSetPanResponderCapture: () => !native,
      onMoveShouldSetPanResponderCapture: claim,
      onMoveShouldSetPanResponder: claim,
      onPanResponderTerminationRequest: () => !dragging,
      onPanResponderGrant: () => {
        dragging = false;
      },
      onPanResponderMove: (_, g) => {
        if (!dragging) {
          if (!vertical(g)) return;
          dragging = true;
          pos.stopAnimation();
          begin();
        }
        pos.setValue(clamp(to(g)));
      },
      onPanResponderRelease: (_, g) => stop() && (dragEndsOpen(from, g.dy, g.vy, live.height) === (from === 'open') ? cancel() : end(g)),
      onPanResponderTerminate: () => stop() && cancel(),
    });
  };

  /** The handle: a drag up pulls the sheet out with the finger. */
  const handlePan = pan(
    'closed',
    () => {
      if (!live.layer) pos.setValue(live.height);
      show(true);
    },
    (g) => live.height + g.dy,
    () => useStore.getState().openSheet(),
    () => moveTo(live.height, away),
  );

  /** The sheet's top (its grab bar and tabs): a drag down puts it away. */
  const sheetPan = pan(
    'open',
    () => setSettled(false),
    (g) => g.dy,
    close,
    () => moveTo(0, rest),
  );

  return {
    pos,
    close,
    handlePan,
    sheetPan,
    dragged,
    /** A tap on the handle (not the end of a drag on it). */
    tapOpen: () => !dragged() && useStore.getState().openSheet(),
    /** A tap on the grab bar or the scrim (not the end of a drag). */
    tapClose: () => !dragged() && close(),
    /** Keeps up with the screen's size and the Reduce Motion setting. */
    sync: (h: number, reduce: boolean) => {
      live.height = h;
      live.reduce = reduce;
    },
    /** The store said out or away (a tap, a drag let go, a deep link, Back): slide there, from wherever a drag left it. */
    follow: (out: boolean) => {
      if (out) {
        if (!live.layer) pos.setValue(live.height);
        live.layer = true;
        moveTo(0, rest);
      } else moveTo(live.height, away);
    },
  };
}

/**
 * Home's sheet (P-58, owner D-10): made once on Home, shared by the handle and the sheet. `layer`:
 * the sheet is drawn (out, moving or being dragged). `settled`: out and at rest, so Home's bottom can
 * go out of sight under it. On web, Home behind the open sheet is out of reach (inert); focus goes
 * into the sheet once it's drawn and back to the handle once that's in sight again; Esc, Back and
 * the browser's Back put it away first.
 */
export function useHomeSheet() {
  const open = useStore((st) => st.sheet.open);
  const focused = useIsFocused();
  const reduce = useReduceMotion();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const height = Math.max(windowHeight - insets.top - TOP_GAP, 0);

  const [layer, setLayer] = useState(open);
  const [settled, setSettled] = useState(open);
  const [ctl] = useState(() => motion(height, open, setLayer, setSettled));
  useEffect(() => ctl.sync(height, reduce), [ctl, height, reduce]);

  const homeRef = useRef<Focusable>(null);
  const handleRef = useRef<Focusable>(null);
  const tabRefs = useRef<Record<SheetSection, Focusable>>({ wanders: null, activities: null });

  // Out or away: drawn at once when it comes out (and no longer at rest when it goes); focus follows.
  const [seen, setSeen] = useState({ open, n: 0 });
  if (seen.open !== open) {
    setSeen({ open, n: seen.n + 1 });
    if (open) setLayer(true);
    else setSettled(false);
  }
  useEffect(() => {
    if (seen.n) ctl.follow(seen.open);
  }, [seen, ctl]);

  useEffect(() => {
    const el = web() ? (homeRef.current as unknown as HTMLElement | null) : null;
    if (open) el?.setAttribute('inert', '');
    else el?.removeAttribute('inert');
  }, [open]);
  const focusDone = useRef(-1);
  useEffect(() => {
    if (focusDone.current === seen.n) return;
    if (seen.open && open && layer) {
      focusDone.current = seen.n;
      focusOn(tabRefs.current[useStore.getState().sheet.section]);
    } else if (!seen.open && !open && !settled && seen.n) {
      focusDone.current = seen.n;
      const home = web() ? (homeRef.current as unknown as HTMLElement | null) : null;
      const active = web() ? document.activeElement : null;
      if (!home || !active || active === document.body || !home.contains(active)) focusOn(handleRef.current);
    }
  }, [seen, open, layer, settled]);

  // On web, bringing it out pushes a history entry (keeping the router's own state, so the router
  // stays put) that Back pops. Only when it comes out (or Home opens with it out), never when Home
  // is back in front with it still out: the router's own Back is still landing on that entry then.
  // A tick later, so a redirect's own history change (a deep link) lands first.
  const pushed = useRef(-1);
  useEffect(() => {
    if (!web() || !focused || !open || pushed.current === seen.n) return;
    pushed.current = seen.n;
    const t = setTimeout(() => {
      if (useStore.getState().sheet.open && !ours()) window.history.pushState({ ...(window.history.state as object | null), [KEY]: true }, '');
    }, 0);
    return () => clearTimeout(t);
  }, [focused, open, seen]);
  // Back in front with it still out (Back from a wander's page): the router lands on that entry and
  // rewrites it with its own state only; once it has (it waits up to 100 ms for the browser), mark it
  // ours again, so putting the sheet away steps back over it.
  useEffect(() => {
    if (!web() || !focused || !open) return;
    const t = setTimeout(() => {
      if (useStore.getState().sheet.open && !ours()) window.history.replaceState({ ...(window.history.state as object | null), [KEY]: true }, '');
    }, 150);
    return () => clearTimeout(t);
  }, [focused, open]);

  // While Home is in front with the sheet out: Esc and Back put it away first.
  useEffect(() => {
    if (!focused || !open) return;
    if (web()) {
      // Something nearer (the @ menu, a field) handles its own Esc first; judged once it has.
      const onKey = (e: KeyboardEvent) =>
        e.key === 'Escape' &&
        setTimeout(() => {
          if (!e.defaultPrevented && useStore.getState().sheet.open) ctl.close();
        }, 0);
      const onPop = () => {
        if (!ours()) useStore.getState().closeSheet();
      };
      document.addEventListener('keydown', onKey, true);
      window.addEventListener('popstate', onPop);
      return () => {
        document.removeEventListener('keydown', onKey, true);
        window.removeEventListener('popstate', onPop);
      };
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      useStore.getState().closeSheet();
      return true;
    });
    return () => sub.remove();
  }, [focused, open, ctl]);

  return { sheet: { ...ctl, open, height, layer, settled }, homeRef, handleRef, tabRefs };
}

export type HomeSheetCtl = ReturnType<typeof useHomeSheet>['sheet'];
type Ref = RefObject<Focusable>;

/**
 * The handle at Home's bottom (P-58): a grab bar and its words, a 44 pt button. A tap (Enter on
 * web) or a drag up pulls the sheet out.
 */
export function SheetHandle({ sheet, handleRef }: { sheet: HomeSheetCtl; handleRef: Ref }) {
  const insets = useSafeAreaInsets();
  return (
    <View {...sheet.handlePan.panHandlers} style={styles.handleWrap}>
      <Pressable
        ref={handleRef}
        testID="home-sheet-handle"
        onPress={sheet.tapOpen}
        accessibilityRole="button"
        accessibilityLabel={SHEET_NAME}
        aria-expanded={sheet.open}
        accessibilityState={{ expanded: sheet.open }}
        style={[styles.handle, { paddingBottom: 6 + insets.bottom }]}>
        <View style={styles.grab} {...decorative} />
        <Text style={styles.handleText} numberOfLines={1}>
          Wanders and activities
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * The sheet itself (P-58): a modal dialog over most of Home, its two sections (today's Wanders and
 * Activities, each with its own log box) switched by the tabs at its top. A section is first drawn
 * when first shown, and kept (its list, filter and line stay) for the session, as the tabs were.
 */
export function HomeSheet({ sheet, tabRefs }: { sheet: HomeSheetCtl; tabRefs: RefObject<Record<SheetSection, Focusable>> }) {
  const section = useStore((st) => st.sheet.section);
  const showSheetSection = useStore((st) => st.showSheetSection);
  const [mounted, setMounted] = useState<Record<SheetSection, boolean>>({ wanders: false, activities: false });
  if (sheet.layer && !mounted[section]) setMounted({ ...mounted, [section]: true });
  const scrim = sheet.pos.interpolate({ inputRange: [0, Math.max(sheet.height, 1)], outputRange: [0.32, 0], extrapolate: 'clamp' });

  return (
    <View style={[StyleSheet.absoluteFill, !sheet.layer && styles.gone]} pointerEvents="box-none">
      {/* The scrim: a tap on it (over Home's header) puts the sheet away. Pointer only; Esc, Back and Close are the other ways. */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.scrim, { opacity: scrim }]}
        onStartShouldSetResponder={() => true}
        onResponderRelease={sheet.tapClose}
        testID="home-sheet-scrim"
        {...decorative}
      />
      <Animated.View
        testID="home-sheet"
        role="dialog"
        aria-modal
        aria-label={SHEET_NAME}
        accessibilityViewIsModal
        onAccessibilityEscape={sheet.close}
        style={[styles.sheet, { height: sheet.height, transform: [{ translateY: sheet.pos }] }]}>
        <View {...sheet.sheetPan.panHandlers} style={styles.top}>
          <Pressable onPress={sheet.tapClose} accessibilityRole="button" accessibilityLabel="Close" style={styles.grabHit}>
            <View style={styles.grab} {...decorative} />
          </Pressable>
          <View style={styles.seg} role="tablist" aria-label="Wanders or Activities">
            {SHEET_SECTIONS.map(({ key, label }) => {
              const on = key === section;
              return (
                <Pressable
                  key={key}
                  ref={(el) => {
                    tabRefs.current[key] = el;
                  }}
                  onPress={() => !sheet.dragged() && showSheetSection(key)}
                  role="tab"
                  aria-selected={on}
                  accessibilityState={{ selected: on }}
                  style={[styles.tab, on && styles.tabOn]}>
                  <Text style={[styles.tabText, on && styles.tabTextOn]} numberOfLines={1}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.body}>
          {SHEET_SECTIONS.map(({ key, label }) =>
            mounted[key] ? (
              <View key={key} role="tabpanel" aria-label={label} style={[styles.body, key !== section && styles.gone]}>
                <ShownProvider value={sheet.open && key === section}>{key === 'wanders' ? <WandersSection /> : <ActivitiesSection />}</ShownProvider>
              </View>
            ) : null,
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  gone: { display: 'none' },
  handleWrap: { alignSelf: 'stretch', userSelect: 'none' },
  handle: { minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: 4, paddingBottom: 6 },
  grab: { width: 36, height: 4, borderRadius: 2, backgroundColor: M.dashed },
  handleText: { fontSize: 12, fontWeight: '600', color: M.muted },
  // Dark Map: the scrim darkens (the ink is light on the night palette).
  scrim: { backgroundColor: '#000000' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: M.bg,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: M.line,
  },
  top: { userSelect: 'none', paddingBottom: 4, paddingHorizontal: 12 },
  grabHit: { minHeight: 44, alignSelf: 'center', minWidth: 88, alignItems: 'center', justifyContent: 'center' },
  seg: { flexDirection: 'row', width: '100%', maxWidth: 616, alignSelf: 'center', borderWidth: 1, borderColor: M.line, borderRadius: 14, overflow: 'hidden', backgroundColor: M.surface },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  tabOn: { backgroundColor: M.ink },
  tabText: { fontSize: 15, fontWeight: '500', color: M.muted },
  tabTextOn: { color: M.onInk, fontWeight: '600' },
  body: { flex: 1 },
});
