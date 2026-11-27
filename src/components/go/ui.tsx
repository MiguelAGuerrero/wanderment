/**
 * B-11 slice 1 (P-86): the few parts every `/go` screen is made of — the screen itself (sized to what
 * is visible, so nothing sits under the keyboard), text, buttons, fields, the sheet and the confirm.
 * B-11 §6: text ≥ 16, targets ≥ 48, square corners, 2-px outlines, hard shadows, one filled button
 * per screen or layer, unavailable = dashed + lighter (and disabled), focus has its own ring.
 */
import { useNavigation, usePreventRemove } from 'expo-router';
import { ComponentRef, ReactNode, Ref, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReduceMotion } from '@/components/a11y';
import { useBannerRoom } from '@/components/bannerRoom';

import { Mark, MarkName } from './marks';
import { decideWhere } from './session';
import { BODY, face, G, SP, TARGET } from './tokens';

const WEB = Platform.OS === 'web';

export type ViewRef = ComponentRef<typeof View>;
export type TextRef = ComponentRef<typeof Text>;
export type InputRef = ComponentRef<typeof TextInput>;

/** The focus ring: its own colour, with a gap (web; native has the system's). */
const RING = WEB ? ({ outlineStyle: 'solid', outlineWidth: 2, outlineColor: G.focus, outlineOffset: 3 } as object) : null;
/** On paper or a routine's colour (an `ink` button): the lavender ring is under 3:1 there (1.85:1 on paper), ink is not. */
const RING_INK = WEB ? ({ outlineStyle: 'solid', outlineWidth: 2, outlineColor: G.ink, outlineOffset: 3 } as object) : null;
const NO_RING = WEB ? ({ outlineStyle: 'none' } as object) : null;
/** Inside a menu: the ring drawn within the row (the menu's edge would cut an outer one). */
const RING_IN = WEB ? ({ outlineStyle: 'solid', outlineWidth: 2, outlineColor: G.focus, outlineOffset: -4 } as object) : null;
/** A hard, unblurred shadow. */
export const hard = (px: number, color: string) => ({ boxShadow: `${px}px ${px}px 0px ${color}` }) as ViewStyle;

/**
 * Web: the height that is really visible (the visual viewport: an on-screen keyboard shrinks it and
 * may scroll it), so a screen laid out in it never has a control under the keyboard. Native: nothing
 * (the screen flexes; iOS pads for the keyboard).
 */
export function useVisibleHeight(): { height: number; top: number } | undefined {
  const read = () => {
    if (!WEB || typeof window === 'undefined') return undefined;
    const vv = window.visualViewport;
    return vv ? { height: Math.round(vv.height), top: Math.round(vv.offsetTop) } : { height: window.innerHeight, top: 0 };
  };
  const [seen, setSeen] = useState(read);
  useEffect(() => {
    if (!WEB || typeof window === 'undefined') return;
    const on = () => {
      const now = read();
      setSeen((was) => (was && now && was.height === now.height && was.top === now.top ? was : now));
    };
    const vv = window.visualViewport;
    vv?.addEventListener('resize', on);
    vv?.addEventListener('scroll', on);
    window.addEventListener('resize', on);
    on();
    return () => {
      vv?.removeEventListener('resize', on);
      vv?.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
    };
  }, []);
  return seen;
}

/**
 * Whether the person asked for less motion — known from the first render on the web (the shared hook
 * learns it a moment later, and a sheet would have started to slide by then).
 */
export function useReduce(): boolean {
  const later = useReduceMotion();
  const [first] = useState(() => WEB && typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  return later || first;
}

/**
 * While `open`, Back (the browser's, Android's) closes what is open instead of leaving the screen.
 * Component state, not a history entry. (The router's own hook would also ask "leave this page?" on a
 * reload while something is open: that question is kept from being asked.)
 */
export function useBackCloses(open: boolean, close: () => void) {
  const latest = useRef(close);
  useLayoutEffect(() => {
    latest.current = close;
  });
  const navigation = useNavigation();
  useEffect(() => {
    if (!open || !WEB || typeof window === 'undefined') return;
    const quiet = (e: Event) => e.stopImmediatePropagation();
    window.addEventListener('beforeunload', quiet, true);
    // P-102 (audit F3): with a screen beneath it in the app, Back is the router's and `usePreventRemove`
    // turns it into "close what is open". With none (the page was opened at this address), Back would leave
    // the page — so a guard entry (the same address) is put on top, and Back takes that instead.
    watchGuard();
    if (!navigation.canGoBack() && !onGuard) {
      window.history.pushState({ ...((window.history.state as object | null) ?? {}), [GUARD]: true }, '', window.location.href);
      onGuard = true;
      guardHref = window.location.href;
    }
    const mine = () => latest.current();
    layerBack = mine;
    return () => {
      window.removeEventListener('beforeunload', quiet, true);
      if (layerBack === mine) layerBack = null;
    };
  }, [open, navigation]);
  usePreventRemove(open, close);
}

/** Web (P-102 audit F3): the guard entry — marked in its state; whether the page is on it, and its address. */
const GUARD = '__goLayerGuard';
let onGuard = false;
let guardHref = '';
/** What Back closes while a layer is open (the newest). */
let layerBack: (() => void) | null = null;
let watching = false;
/**
 * Installed once. Back off the guard (to the same address beneath it) is ours: it closes the open layer — or,
 * with none open (it was closed another way and the guard stayed), Back goes on, as if the guard were not
 * there. The router never hears either. Anything else that writes an entry (the router) means the page is
 * no longer on the guard.
 */
function watchGuard() {
  if (watching) return;
  watching = true;
  const h = window.history;
  for (const name of ['pushState', 'replaceState'] as const) {
    const write = h[name].bind(h);
    h[name] = (state: unknown, unused: string, url?: string | URL | null) => {
      write(state, unused, url);
      onGuard = !!(state && (state as Record<string, unknown>)[GUARD]);
    };
  }
  window.addEventListener(
    'popstate',
    (e) => {
      const now = !!(h.state && (h.state as Record<string, unknown>)[GUARD]);
      const left = onGuard && !now && window.location.href === guardHref;
      onGuard = now;
      if (!left) return;
      e.stopImmediatePropagation();
      if (layerBack) layerBack();
      else h.back();
    },
    true,
  );
}

const typing = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
};

/**
 * Web keys for a screen, while `on`: 'Enter', 'Escape' and 'mod+z' ONLY. There are no bare letter
 * shortcuts in this slice (WCAG 2.1.4: they would need a switch, and there is no Settings for one
 * yet; a letter typed must never act). Never while typing in a field (Esc excepted when
 * `escInFields`). Return acts only while focus is on an element marked `data-return` (the note);
 * anywhere else it is the focused control's own, and on nothing it is nothing. Heard on the way down
 * (capture): a field keeps its own key events from going up, and Esc must still leave it.
 */
export function useKeys(on: boolean, keys: { Enter?: () => void; Escape?: () => void; 'mod+z'?: () => void }, escInFields = false) {
  const latest = useRef(keys);
  useLayoutEffect(() => {
    latest.current = keys;
  });
  useEffect(() => {
    if (!on || !WEB || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat || e.isComposing) return;
      const inField = typing(e.target);
      const mod = e.ctrlKey || e.metaKey;
      let name: string;
      if (mod && !e.altKey && e.key.toLowerCase() === 'z' && !e.shiftKey) name = 'mod+z';
      else if (mod || e.altKey) return;
      else name = e.key;
      if (inField && !(name === 'Escape' && escInFields)) return;
      // Only these three: a character key is never a shortcut here.
      if (name !== 'Enter' && name !== 'Escape' && name !== 'mod+z') return;
      if (name === 'Enter' && !(e.target as HTMLElement | null)?.hasAttribute?.('data-return')) return;
      const run = latest.current[name];
      if (!run) return;
      e.preventDefault();
      run();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [on, escInFields]);
}

/** Moves focus to a view (web: it needs a tabindex; native: accessibility focus is the screen reader's own). */
export function focusOn(ref: { current: unknown } | null | undefined) {
  if (!WEB) return;
  const el = ref?.current as HTMLElement | null | undefined;
  if (el && typeof el.focus === 'function') el.focus();
}

/** A field given the focus with words already in it (a draft restored after a reload): what is typed next goes AFTER them. */
export function caretToEnd(el: unknown) {
  const field = el as { value?: unknown; setSelectionRange?: (a: number, b: number) => void } | null;
  if (WEB && field && typeof field.value === 'string' && typeof field.setSelectionRange === 'function') field.setSelectionRange(field.value.length, field.value.length);
}

/**
 * Focus, once what it goes to is there (it may be drawn a frame or two later: the note waits for its
 * room). Gives up quietly after a few frames, and never takes focus out of a field being typed in.
 */
export function focusSoon(ref: { current: unknown } | null | undefined, tries = 30) {
  if (!WEB || typeof requestAnimationFrame === 'undefined') return;
  // P-102 (CI, P-101's red run): what had the focus when it was asked. If the person (or the app) puts the
  // focus somewhere else before it lands, it gives up — a late landing must never take the focus back.
  const from = document.activeElement;
  const go = (left: number) => {
    const outer = ref?.current as HTMLElement | null | undefined;
    // What holds a field is focused BY its field (the note at the edge of a goal: typing must type).
    const el = outer?.querySelector?.<HTMLElement>('textarea, input') ?? outer;
    const now = document.activeElement;
    if (now && now !== from && now !== document.body && now !== el && now.isConnected) return;
    const shown = !!el && el.getClientRects().length > 0;
    if (el && shown && document.activeElement !== el && typing(document.activeElement) && (document.activeElement as HTMLElement).getClientRects().length > 0) return;
    // Not there yet, or its screen is not shown yet (focus can't land on what is hidden): try the next frame.
    if (el && shown && typeof el.focus === 'function' && document.activeElement !== el) {
      el.focus();
      caretToEnd(el);
    }
    if ((!el || document.activeElement !== el) && left > 0) requestAnimationFrame(() => go(left - 1));
  };
  requestAnimationFrame(() => go(tries));
}

type TProps = TextProps & { size?: number; dim?: boolean; bold?: boolean; ink?: boolean; color?: string; title?: boolean; ref?: Ref<TextRef> };
/** Text: never under 16, in the words face (or the pixel face for an app-named title). */
export function T({ size = BODY, dim, bold, ink, color, title, style, ...rest }: TProps) {
  return (
    <Text
      {...rest}
      style={[
        { fontSize: Math.max(BODY, size), lineHeight: Math.round(Math.max(BODY, size) * 1.35), color: color ?? (ink ? G.ink : dim ? G.dim : G.text), fontFamily: title ? face.title : face.words, fontWeight: bold || title ? '600' : '400' },
        style,
      ]}
    />
  );
}

/** A screen's title: a level-1 heading (pixel face when it is the app's own words). */
export function H1({ children, own, style, ref, spoken }: { children: ReactNode; own?: boolean; style?: TextProps['style']; ref?: Ref<TextRef>; spoken?: string }) {
  return (
    <T ref={ref} role="heading" aria-level={1} accessibilityRole="header" aria-label={spoken} title={!own} bold size={own ? 20 : 22} style={[NO_RING, style]} {...(WEB && ({ tabIndex: -1 } as object))}>
      {children}
    </T>
  );
}

/** A heading that is there for a screen reader and for focus, and takes no room (the runner's level). */
export function HiddenH1({ children, ref }: { children: string; ref?: Ref<TextRef> }) {
  return (
    <Text ref={ref} role="heading" aria-level={1} accessibilityRole="header" style={styles.hidden} {...(WEB && ({ tabIndex: -1 } as object))}>
      {children}
    </Text>
  );
}

/**
 * What a screen says once on arriving, for a screen reader (P-90: "Plan: <routine>" in Plan, "Running:
 * <step>" on the runner — the two must never sound alike). It takes no room. Web: a polite live region
 * filled a moment after it is there (one filled from the start is not read); native: announced.
 */
export function Said({ text }: { text: string }) {
  const [first] = useState(text);
  const [shown, setShown] = useState('');
  useEffect(() => {
    if (!first) return;
    if (!WEB) {
      AccessibilityInfo.announceForAccessibility(first);
      return;
    }
    const timer = setTimeout(() => setShown(first), 150);
    return () => clearTimeout(timer);
  }, [first]);
  return (
    <Text role="status" aria-live="polite" accessibilityLiveRegion="polite" style={styles.hidden} testID="go-said">
      {/* Once what it said is no longer so (the next step), it says nothing: never something stale. */}
      {text === first ? shown : ''}
    </Text>
  );
}

export interface BtnProps {
  /** The visible word(s). Leave out for an icon-only button (then `spoken` is required). */
  label?: string;
  /** The spoken name, when it says more than the label (it must contain the label). */
  spoken?: string;
  /** filled: THE one per screen or layer. outline: every other. plain: a row in a sheet or the panel. */
  kind?: 'filled' | 'outline' | 'plain';
  mark?: MarkName;
  markAfter?: MarkName;
  /** Unavailable: dashed, lighter, and disabled. */
  disabled?: boolean;
  /** P-103 (1): held for a moment — presses do nothing and it says so (disabled), but it keeps its look (Done just shown). */
  hold?: boolean;
  /** Drawn on a routine's colour or on paper: ink outline, ink words, and an ink focus ring. */
  ink?: boolean;
  /** For "cannot be undone" only. */
  danger?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  ref?: Ref<ViewRef>;
  pressed?: boolean;
  expanded?: boolean;
  selected?: boolean;
  /** The label's size (≥ 16). */
  size?: number;
  /** Web: marks the button for a spec or for first focus. */
  dataSet?: Record<string, string>;
  /** P-102: the keyboard shortcuts it answers to (web: `aria-keyshortcuts`, e.g. "Alt+ArrowUp Alt+ArrowDown"). */
  keys?: string;
  /** P-102: screen-reader actions (iOS / Android) — e.g. a Plan row's Move up / Move down. */
  actions?: readonly { name: string; label: string }[];
  onAction?: (name: string) => void;
}

export function Btn({ label, spoken, kind = 'outline', mark, markAfter, disabled, hold, ink, danger, onPress, style, testID, ref, pressed, expanded, selected, size, dataSet, keys, actions, onAction }: BtnProps) {
  const filled = kind === 'filled' && !disabled;
  // Unavailable is lighter (and dashed, and disabled): on a routine's colour, lighter ink.
  const color = filled ? G.ink : disabled ? (ink ? 'rgba(17,18,22,0.6)' : G.dim) : danger ? G.err : ink ? G.ink : G.text;
  return (
    <Pressable
      ref={ref}
      testID={testID}
      onPress={disabled || hold ? undefined : onPress}
      disabled={disabled || hold}
      // (Held, it keeps the focus it has: said unavailable, not taken out of the tab order.)
      {...(hold && !disabled && WEB && ({ tabIndex: 0, onKeyDown: (e: { key: string; repeat?: boolean; preventDefault: () => void }) => {
        // A key press on it, focused, is deliberate: it is never held.
        if (e.repeat || (e.key !== 'Enter' && e.key !== ' ')) return;
        e.preventDefault();
        onPress?.();
      } } as object))}
      accessibilityRole="button"
      accessibilityLabel={spoken ?? label}
      accessibilityState={{ disabled: !!disabled || !!hold, ...(selected !== undefined && { selected }) }}
      {...(pressed !== undefined && { 'aria-pressed': pressed })}
      {...(expanded !== undefined && { 'aria-expanded': expanded })}
      {...(dataSet && { dataSet })}
      {...(keys && WEB && { 'aria-keyshortcuts': keys })}
      {...(actions && actions.length > 0 && { accessibilityActions: actions as { name: string; label: string }[], onAccessibilityAction: (e: { nativeEvent: { actionName: string } }) => onAction?.(e.nativeEvent.actionName) })}
      style={(state) => [
        styles.btn,
        kind === 'plain' ? styles.plain : { borderColor: danger ? G.err : ink ? G.ink : filled ? G.paper : G.line },
        kind === 'filled' && styles.filledRoom,
        filled && styles.filled,
        disabled && kind !== 'plain' && styles.dashed,
        !label && styles.square,
        state.pressed && !disabled && { opacity: 0.75 },
        (state as { focused?: boolean }).focused ? (ink ? RING_INK : RING) : NO_RING,
        style,
      ]}>
      {mark && <Mark name={mark} color={color} />}
      {label !== undefined && (
        <T bold={kind !== 'plain'} size={size} color={color} style={kind === 'plain' ? styles.plainLabel : styles.label}>
          {label}
        </T>
      )}
      {markAfter && <Mark name={markAfter} color={color} />}
    </Pressable>
  );
}

type FieldProps = TextInputProps & { ref?: Ref<InputRef>; ink?: boolean; bare?: boolean; size?: number; /** Return submits and the field keeps the focus (the next line can be typed at once). */ keepFocus?: boolean };
/** A text field: outlined, the words face, the focus ring. `bare`: no box (inside the note, inside a row). */
export function Field({ style, ink, bare, size = BODY, onFocus, onBlur, ref, keepFocus, ...rest }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={ink ? '#4A4633' : '#9FA4B5'}
      {...(keepFocus && ({ blurOnSubmit: false, submitBehavior: 'submit' } as object))}
      {...rest}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[
        { fontSize: Math.max(BODY, size), lineHeight: Math.round(Math.max(BODY, size) * 1.35), color: ink ? G.ink : G.text, fontFamily: face.words },
        bare ? styles.fieldBare : styles.field,
        focused && !bare ? RING : NO_RING,
        style,
      ]}
    />
  );
}

/**
 * A field for a line of the person's words that may be long: it wraps and grows, never cutting them
 * off; Return keeps the words (no new line in a step).
 */
export function GrowField({ onSubmit, style, ref, ...rest }: FieldProps & { onSubmit?: () => void }) {
  const [tall, setTall] = useState(0);
  // In its own box the 2-px outline is inside the height: without that room the last 4 px would scroll.
  const edge = rest.bare ? 0 : 4;
  const own = useRef<InputRef>(null);
  // Emptied (P-101: "Add a step" stays on screen after a step is added): back to one line — the web's
  // content size never reports less than the height it was given.
  const empty = !rest.value;
  if (empty && tall) setTall(0);
  return (
    <Field
      {...rest}
      ref={(el) => {
        own.current = el;
        // P-101: the caller's ref too (Plan's "Add a step" field is one of these now).
        if (typeof ref === 'function') ref(el);
        else if (ref) (ref as { current: InputRef | null }).current = el;
      }}
      multiline
      onContentSizeChange={(e) => setTall(Math.ceil(e.nativeEvent.contentSize.height))}
      // Narrower than it was (the window, larger text): the words wrap again, and it grows to hold them.
      onLayout={() => {
        const el = own.current as unknown as { scrollHeight?: number; clientHeight?: number } | null;
        if (WEB && el && typeof el.scrollHeight === 'number' && typeof el.clientHeight === 'number' && el.scrollHeight > el.clientHeight + 1) setTall(el.scrollHeight);
      }}
      onKeyPress={(e) => {
        if (e.nativeEvent.key !== 'Enter') return;
        e.preventDefault();
        onSubmit?.();
      }}
      style={[style, { height: Math.max(TARGET, tall + edge) }]}
    />
  );
}

/**
 * A `/go` screen: dark, inside the safe area, exactly as tall as what is visible. `layer`: a sheet or
 * a confirm over it — while there is one, the screen beneath can't be reached (inert) and isn't read.
 * `data-settled` is "true" once there is nothing left to load or move, for specs.
 */
export function GoScreen({ children, layer, testID, settled = true }: { children: ReactNode; layer?: ReactNode; testID: string; settled?: boolean }) {
  const seen = useVisibleHeight();
  const insets = useSafeAreaInsets();
  // P-103 (12): the update banner's room — the screen starts below it.
  const banner = useBannerRoom();
  const under = useRef<ViewRef>(null);
  const covered = !!layer;
  // Any `/go` screen shown: from now on `/go` itself is home, never a redirect (Back from here must land there).
  useEffect(() => decideWhere(), []);
  useLayoutEffect(() => {
    if (!WEB) return;
    const el = under.current as unknown as HTMLElement | null;
    if (!el) return;
    if (covered) el.setAttribute('inert', '');
    else el.removeAttribute('inert');
  }, [covered]);
  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        testID={testID}
        {...{ dataSet: { settled: settled ? 'true' : 'false' } }}
        style={[styles.screen, { paddingTop: Math.max(insets.top, banner), paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }, seen ? { height: seen.height, transform: [{ translateY: seen.top }] } : styles.flex]}>
        <View ref={under} style={styles.flex} importantForAccessibility={covered ? 'no-hide-descendants' : 'auto'} accessibilityElementsHidden={covered}>
          {children}
        </View>
        {layer}
      </KeyboardAvoidingView>
    </View>
  );
}

/** The bar of a sub-screen: Back (one screen) and the title. */
export function Bar({ onBack, children, right }: { onBack?: () => void; children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.bar}>
      {onBack && <Btn kind="plain" mark="back" spoken="Back" onPress={onBack} style={styles.square} />}
      <View style={styles.barTitle}>{children}</View>
      {right}
    </View>
  );
}

/** A choice between two values, in words (the one chosen is pressed). */
export function Seg<V extends string>({ value, options, onChange, spoken }: { value: V; options: readonly (readonly [V, string])[]; onChange: (v: V) => void; spoken: string }) {
  return (
    <View style={styles.seg} accessibilityRole="radiogroup" accessibilityLabel={spoken}>
      {options.map(([v, label]) => (
        <Pressable
          key={v}
          onPress={() => onChange(v)}
          accessibilityRole="radio"
          accessibilityState={{ checked: v === value }}
          aria-checked={v === value}
          style={(state) => [styles.segItem, v === value && styles.segOn, (state as { focused?: boolean }).focused ? RING : NO_RING]}>
          <T bold={v === value} dim={v !== value}>
            {label}
          </T>
        </Pressable>
      ))}
    </View>
  );
}

interface SheetProps {
  /** Its heading (level 2) and its name. */
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** A confirm: centred, an alert, no handle; Esc and Back cancel. */
  confirm?: boolean;
  testID?: string;
  /** Web: where focus goes when it closes, if what opened it is gone. */
  fallback?: { current: unknown };
  /** P-109: a menu of its own is open over it — Esc and Back are the menu's, and nothing in the sheet can be reached until it closes. */
  inert?: boolean;
}

/**
 * A layer over a screen (pass it as `GoScreen`'s `layer`): a bottom sheet, or a centred confirm. It
 * has a heading, a visible Close (the handle bar), takes focus and gives it back to what opened it;
 * Esc, Back and the scrim close it. It slides up in under 200 ms; under Reduce Motion it is just there.
 * `data-moving` says whether it is still arriving.
 */
export function Sheet({ title, onClose, children, confirm, testID, fallback, inert }: SheetProps) {
  const reduce = useReduce();
  const [arrived, setArrived] = useState(false);
  const moving = !reduce && !arrived;
  const [slide] = useState(() => new Animated.Value(reduce ? 1 : 0));
  const box = useRef<ViewRef>(null);
  const heading = useRef<TextRef>(null);
  useBackCloses(!inert, onClose);
  useKeys(!inert, { Escape: onClose }, true);
  // P-109: under its own menu, the sheet can't be reached (web: `inert`, set before the menu gives focus back).
  useLayoutEffect(() => {
    const el = box.current as unknown as HTMLElement | null;
    if (!WEB || !el || typeof el.setAttribute !== 'function') return;
    if (inert) el.setAttribute('inert', '');
    else el.removeAttribute('inert');
  }, [inert]);

  // P-103 (8; audit F-28): a confirm keeps the focus inside it — Tab past its last control comes round to its first.
  useEffect(() => {
    if (!WEB || !confirm || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || e.altKey || e.ctrlKey || e.metaKey) return;
      const el = box.current as unknown as HTMLElement | null;
      if (!el) return;
      const stops = Array.from(el.querySelectorAll<HTMLElement>('[tabindex="0"], input, textarea, button')).filter((x) => x.getClientRects().length > 0 && x.getAttribute('aria-disabled') !== 'true');
      if (!stops.length) return;
      const i = stops.indexOf(document.activeElement as HTMLElement);
      e.preventDefault();
      stops[i < 0 ? 0 : (i + (e.shiftKey ? stops.length - 1 : 1)) % stops.length].focus();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [confirm]);

  useEffect(() => {
    if (reduce) {
      slide.setValue(1);
      return;
    }
    const run = Animated.timing(slide, { toValue: 1, duration: 160, useNativeDriver: false });
    run.start(() => setArrived(true));
    return () => run.stop();
  }, [reduce, slide]);

  // Focus comes in (the control marked for it, else the heading) and goes back to what opened it.
  useEffect(() => {
    if (!WEB) return;
    const opener = document.activeElement as HTMLElement | null;
    const el = box.current as unknown as HTMLElement | null;
    const first = el?.querySelector<HTMLElement>('[data-first="true"]');
    (first ?? (heading.current as unknown as HTMLElement | null))?.focus();
    return () => {
      setTimeout(() => {
        if (document.activeElement && document.activeElement !== document.body && document.activeElement.isConnected) return;
        if (opener?.isConnected && opener !== document.body) opener.focus();
        else focusOn(fallback);
      }, 0);
    };
    // Once, for the life of the sheet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, styles.layer, confirm && styles.layerCentre]}>
      <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onClose} accessible={false} focusable={false} {...(WEB && ({ tabIndex: -1, 'aria-hidden': true } as object))} />
      <Animated.View
        ref={box}
        testID={testID}
        role={confirm ? 'alertdialog' : 'dialog'}
        aria-modal
        aria-label={title}
        accessibilityViewIsModal
        {...{ dataSet: { moving: moving ? 'true' : 'false' } }}
        style={[confirm ? styles.confirm : styles.sheet, { opacity: slide, transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }]}>
        {!confirm && (
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={(state) => [styles.handleBtn, (state as { focused?: boolean }).focused ? RING : NO_RING]}>
            <View style={styles.handle} />
          </Pressable>
        )}
        <T ref={heading} role="heading" aria-level={2} accessibilityRole="header" bold size={20} style={[styles.sheetTitle, NO_RING]} {...(WEB && ({ tabIndex: -1 } as object))}>
          {title}
        </T>
        <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

type Box = { x: number; y: number; width: number; height: number };
/** Where a view is in the window (web and native alike: RN-web's host refs measure too). */
const measure = (el: unknown) =>
  new Promise<Box | undefined>((done) => {
    const m = (el as { measureInWindow?: (cb: (x: number, y: number, width: number, height: number) => void) => void } | null)?.measureInWindow;
    if (typeof m !== 'function') return done(undefined);
    m.call(el, (x, y, width, height) => done({ x, y, width, height }));
  });
/** The room a menu keeps from the window's edges, and from its button. */
const EDGE = SP.s2;
const GAP = SP.s1;
/** Narrower than this, a menu spans the window (still under or over its row). */
const SPAN_UNDER = 360;
const MENU_WIDTH = 288;

interface MenuProps {
  /** What it hangs from: the ··· that opened it (its host ref, read when it opens). Gone: it stands at the top right. */
  anchor: () => unknown;
  /** Its spoken name. */
  label: string;
  onClose: () => void;
  children: ReactNode;
  /**
   * menu: `MenuItem`s and `MenuSep`s (role="menu"; ↑/↓, Home/End move between items; Tab closes). dialog: the
   * same small layer holding other controls (a choice, a stepper), which a menu may not.
   */
  kind?: 'menu' | 'dialog';
  testID?: string;
  /** Where focus goes when it closes, if what opened it is gone. */
  fallback?: { current: unknown };
}

/**
 * P-102 (owner, 2026-11-27: "A (...) usually brings up a menu not a drawer"): a small menu anchored to
 * the ··· that opened it — under it, or over it when there is no room beneath; never off-screen (in a
 * narrow window it spans the width, still at its row). It dims the screen only lightly; a tap outside,
 * Esc and Back close it. Focus goes to its first item and back to what opened it. It never moves: it is
 * just there (Reduce Motion or not); `data-moving` is "true" only until it has been placed.
 */
export function Menu({ anchor: anchorOf, label, onClose, children, kind = 'menu', testID, fallback }: MenuProps) {
  const [anchor] = useState(anchorOf);
  const layer = useRef<ViewRef>(null);
  const box = useRef<ViewRef>(null);
  const [room, setRoom] = useState<{ width: number; height: number; at?: Box }>();
  const [tall, setTall] = useState(0);
  const win = useWindowDimensions();
  useBackCloses(true, onClose);
  useKeys(true, { Escape: onClose }, true);

  // Where its button is, in this layer — again when the window changes.
  useEffect(() => {
    let live = true;
    void Promise.all([measure(layer.current), measure(anchor)]).then(([l, a]) => {
      if (!live || !l) return;
      setRoom({ width: l.width, height: l.height, ...(a && a.width + a.height > 0 && { at: { x: a.x - l.x, y: a.y - l.y, width: a.width, height: a.height } }) });
    });
    return () => {
      live = false;
    };
  }, [anchor, win.width, win.height]);

  const placed = !!room && tall > 0;
  let where: ViewStyle = { left: 0, top: 0, width: MENU_WIDTH, opacity: 0 };
  if (room) {
    const spans = room.width < SPAN_UNDER;
    const width = spans ? room.width - 2 * EDGE : Math.min(MENU_WIDTH, room.width - 2 * EDGE);
    const a = room.at ?? { x: room.width - EDGE, y: EDGE, width: 0, height: 0 };
    const left = spans ? EDGE : Math.max(EDGE, Math.min(a.x + a.width - width, room.width - width - EDGE));
    const below = room.height - (a.y + a.height) - GAP - EDGE;
    const above = a.y - GAP - EDGE;
    // Under its button when it fits there (or there is more room there); else over it.
    const under = tall <= below || below >= above;
    const maxHeight = Math.max(TARGET, under ? below : above);
    const top = under ? a.y + a.height + GAP : a.y - GAP - Math.min(tall, maxHeight);
    where = { left, top: Math.max(EDGE, top), width, maxHeight, opacity: placed ? 1 : 0 };
  }

  // What opened it (focus goes back there), read as it opens.
  const [opener] = useState(() => (WEB && typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null));
  const focusedIn = useRef(false);
  useEffect(() => {
    if (!WEB || !placed || focusedIn.current) return;
    focusedIn.current = true;
    const el = box.current as unknown as HTMLElement | null;
    const first = el?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"]):not([data-sr-close])') ?? el?.querySelector<HTMLElement>('[tabindex="0"]:not([data-sr-close])');
    first?.focus({ preventScroll: true });
  }, [placed]);
  useEffect(
    () => () => {
      if (!WEB) return;
      const back = () => {
        // Something it opened took the focus (a field, a sheet): it stays there.
        if (document.activeElement && document.activeElement !== document.body && document.activeElement.isConnected) return;
        const button = anchor as HTMLElement | null;
        if (opener?.isConnected && opener !== document.body) opener.focus();
        else if (button?.isConnected && typeof button.focus === 'function') button.focus();
        else focusOn(fallback);
      };
      // At once (the screen beneath is no longer inert by now), so focus is never on nothing, even for a
      // moment — its row removed, it goes to the heading; and once more after this frame, if that could not land.
      back();
      setTimeout(back, 0);
    },
    // Once, for the life of the menu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Web: the menu keys (WAI-ARIA menu pattern).
  const onKeyDown = (e: { key: string; altKey: boolean; ctrlKey: boolean; metaKey: boolean; preventDefault: () => void }) => {
    if (kind !== 'menu' || e.altKey || e.ctrlKey || e.metaKey) return;
    const el = box.current as unknown as HTMLElement | null;
    // (Not the screen-reader Close, and not what is unavailable.)
    const items = Array.from(el?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([data-sr-close])') ?? []).filter((i) => i.getAttribute('aria-disabled') !== 'true');
    if (!items.length) return;
    const i = items.indexOf(document.activeElement as HTMLElement);
    const to = e.key === 'ArrowDown' ? (i + 1) % items.length : e.key === 'ArrowUp' ? (i - 1 + items.length) % items.length : e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : undefined;
    if (e.key === 'Tab') {
      e.preventDefault();
      onClose();
      return;
    }
    if (to === undefined) return;
    e.preventDefault();
    items[to].focus();
  };

  return (
    <View ref={layer} style={[StyleSheet.absoluteFill, styles.menuLayer]}>
      <Pressable style={[StyleSheet.absoluteFill, styles.menuScrim]} onPress={onClose} accessible={false} focusable={false} testID="go-menu-outside" {...(WEB && ({ tabIndex: -1, 'aria-hidden': true } as object))} />
      <View
        ref={box}
        testID={testID}
        role={kind}
        aria-label={label}
        accessibilityLabel={label}
        accessibilityViewIsModal
        // P-102 (audit F2): VoiceOver's escape (the two-finger scrub) closes it, as Esc and Back do.
        onAccessibilityEscape={onClose}
        {...(kind === 'dialog' && { 'aria-modal': true })}
        {...{ dataSet: { moving: placed ? 'false' : 'true', anchored: room?.at ? 'true' : 'false' } }}
        {...(WEB && ({ onKeyDown } as object))}
        style={[styles.menu, where]}>
        <ScrollView style={styles.menuScroll} contentContainerStyle={kind === 'menu' ? styles.menuBody : styles.menuDialog} onContentSizeChange={(_w, h) => setTall(Math.ceil(h) + 4)} keyboardShouldPersistTaps="handled">
          {children}
          {/* P-102 (audit F2): a Close for screen readers, last — not drawn (a tap outside, Esc and Back are the rest's). */}
          <Pressable
            {...(kind === 'menu' ? { role: 'menuitem' as const, accessibilityRole: 'menuitem' as const } : { accessibilityRole: 'button' as const })}
            accessibilityLabel="Close"
            onPress={onClose}
            testID="go-menu-close"
            {...{ dataSet: { srClose: 'true' } }}
            {...(WEB && ({ tabIndex: -1 } as object))}
            style={styles.srOnly}>
            <Text style={styles.srOnlyText}>Close</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

/** A row of a `Menu`: its words (≥ 16 px), a full row ≥ 48 px tall. `danger`: Remove (red, ≥ 4.5:1 on the menu). */
export function MenuItem({ label, spoken, danger, disabled, mark, onPress, testID }: { label: string; spoken?: string; danger?: boolean; disabled?: boolean; mark?: MarkName; onPress: () => void; testID?: string }) {
  const color = disabled ? G.dim : danger ? G.err : G.text;
  return (
    <Pressable
      role="menuitem"
      accessibilityRole="menuitem"
      accessibilityLabel={spoken ?? label}
      accessibilityState={{ disabled: !!disabled }}
      {...(disabled && { 'aria-disabled': true })}
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      testID={testID}
      {...(danger && { dataSet: { danger: 'true' } })}
      style={(state) => [styles.item, (state.pressed || (state as { hovered?: boolean }).hovered) && !disabled && styles.itemOn, (state as { focused?: boolean }).focused ? RING_IN : NO_RING]}>
      {mark && <Mark name={mark} color={color} />}
      <T color={color} style={styles.plainLabel}>
        {label}
      </T>
    </Pressable>
  );
}

/** The line between a menu's groups (before Remove). */
export function MenuSep() {
  return <View role="separator" style={styles.sep} />;
}

/**
 * P-103 (8; audit F-8, F-28): the one confirm, for everything destructive — modelled on the import preview. A
 * question as its title, the consequence in one line (`body`; `children` may name what it reaches), Cancel —
 * filled, first, with the focus — and the destructive verb in red (never the filled paper button). Focus stays
 * inside it (Tab and Shift+Tab go round); Esc, Back and the scrim cancel.
 */
export function Confirm({ title, body, action, spoken, onAct, onCancel, testID, actionTestID, children }: { title: string; body: string; action: string; spoken?: string; onAct: () => void; onCancel: () => void; testID?: string; actionTestID?: string; children?: ReactNode }) {
  return (
    <Sheet title={title} onClose={onCancel} confirm testID={testID}>
      <T testID="go-confirm-body">{body}</T>
      {children}
      <View style={styles.pair}>
        <Btn kind="filled" label="Cancel" onPress={onCancel} style={styles.grow} dataSet={{ first: 'true' }} />
        <Btn danger label={action} spoken={spoken} onPress={onAct} style={styles.grow} testID={actionTestID} />
      </View>
    </Sheet>
  );
}

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: G.bg, overflow: 'hidden' },
  screen: { backgroundColor: G.bg },
  flex: { flex: 1, minHeight: 0 },
  grow: { flexGrow: 1, flexShrink: 1, flexBasis: 0 },
  hidden: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0, fontSize: BODY, ...(NO_RING ?? {}) },
  btn: {
    minHeight: TARGET,
    minWidth: TARGET,
    borderWidth: 2,
    borderColor: G.line,
    paddingHorizontal: SP.s3,
    paddingVertical: SP.s2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SP.s2,
  },
  square: { paddingHorizontal: 0, width: TARGET, flexGrow: 0 },
  // The room its shadow takes is kept whether or not it is available: nothing shifts when it becomes so.
  filledRoom: { marginRight: 4, marginBottom: 4 },
  filled: { backgroundColor: G.paper, ...hard(4, G.line) },
  dashed: { borderStyle: 'dashed' },
  plain: { borderColor: 'transparent', justifyContent: 'flex-start', paddingHorizontal: SP.s2, gap: SP.s3 },
  label: { textAlign: 'center', flexShrink: 1 },
  plainLabel: { flexShrink: 1 },
  field: { minHeight: TARGET, borderWidth: 2, borderColor: G.line, backgroundColor: G.surf, paddingHorizontal: SP.s3, paddingVertical: SP.s2 },
  fieldBare: { minHeight: TARGET, paddingVertical: SP.s2, ...(NO_RING ?? {}) },
  bar: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: SP.s2, paddingHorizontal: SP.s2 },
  barTitle: { flex: 1, minWidth: 0, paddingHorizontal: SP.s2, paddingVertical: SP.s2 },
  seg: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 2, borderColor: G.line, alignSelf: 'flex-start' },
  segItem: { minHeight: TARGET, minWidth: TARGET, paddingHorizontal: SP.s3, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: G.surf2, borderBottomWidth: 2, borderBottomColor: G.text },
  layer: { justifyContent: 'flex-end', zIndex: 10 },
  layerCentre: { justifyContent: 'center', padding: SP.s3 },
  scrim: { backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: G.surf, borderTopWidth: 2, borderTopColor: G.text, maxHeight: '92%', paddingBottom: SP.s3 },
  confirm: { backgroundColor: G.surf, borderWidth: 2, borderColor: G.text, paddingTop: SP.s3, paddingBottom: SP.s3, maxHeight: '100%', ...hard(6, G.shadow) },
  handleBtn: { minHeight: TARGET, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 48, height: 6, backgroundColor: G.dim },
  sheetTitle: { paddingHorizontal: SP.s3, paddingBottom: SP.s2 },
  sheetScroll: { flexGrow: 0, flexShrink: 1 },
  sheetBody: { paddingHorizontal: SP.s3, paddingTop: SP.s2, paddingBottom: SP.s2, gap: SP.s2 },
  pair: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.s2 },
  // P-102: the anchored menu — barely dimmed beneath; a box with the hard shadow, at its button.
  menuLayer: { zIndex: 10 },
  menuScrim: { backgroundColor: 'rgba(0,0,0,0.2)' },
  menu: { position: 'absolute', backgroundColor: G.surf, borderWidth: 2, borderColor: G.text, ...hard(4, G.shadow) },
  menuScroll: { flexGrow: 0, flexShrink: 1 },
  menuBody: { paddingVertical: SP.s1 },
  menuDialog: { padding: SP.s3, gap: SP.s2 },
  item: { minHeight: TARGET, flexDirection: 'row', alignItems: 'center', gap: SP.s3, paddingHorizontal: SP.s3, paddingVertical: SP.s2 },
  itemOn: { backgroundColor: G.surf2 },
  sep: { height: 2, backgroundColor: G.line, marginVertical: SP.s1 },
  // Drawn as nothing, still read (the visually-hidden pattern): clipped to a 1-px box out of the flow.
  srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0, bottom: 0, left: 0 },
  srOnlyText: { fontSize: BODY },
});
