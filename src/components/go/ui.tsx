/**
 * B-11 slice 1 (P-86): the few parts every `/go` screen is made of — the screen itself (sized to what
 * is visible, so nothing sits under the keyboard), text, buttons, fields, the sheet and the confirm.
 * B-11 §6: text ≥ 16, targets ≥ 48, square corners, 2-px outlines, hard shadows, one filled button
 * per screen or layer, unavailable = dashed + lighter (and disabled), focus has its own ring.
 */
import { usePreventRemove } from 'expo-router';
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
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReduceMotion } from '@/components/a11y';

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
  useEffect(() => {
    if (!open || !WEB || typeof window === 'undefined') return;
    const quiet = (e: Event) => e.stopImmediatePropagation();
    window.addEventListener('beforeunload', quiet, true);
    return () => window.removeEventListener('beforeunload', quiet, true);
  }, [open]);
  usePreventRemove(open, close);
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
  const go = (left: number) => {
    const outer = ref?.current as HTMLElement | null | undefined;
    // What holds a field is focused BY its field (the note at the edge of a goal: typing must type).
    const el = outer?.querySelector?.<HTMLElement>('textarea, input') ?? outer;
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
}

export function Btn({ label, spoken, kind = 'outline', mark, markAfter, disabled, ink, danger, onPress, style, testID, ref, pressed, expanded, selected, size, dataSet }: BtnProps) {
  const filled = kind === 'filled' && !disabled;
  // Unavailable is lighter (and dashed, and disabled): on a routine's colour, lighter ink.
  const color = filled ? G.ink : disabled ? (ink ? 'rgba(17,18,22,0.6)' : G.dim) : danger ? G.err : ink ? G.ink : G.text;
  return (
    <Pressable
      ref={ref}
      testID={testID}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={spoken ?? label}
      accessibilityState={{ disabled: !!disabled, ...(selected !== undefined && { selected }) }}
      {...(pressed !== undefined && { 'aria-pressed': pressed })}
      {...(expanded !== undefined && { 'aria-expanded': expanded })}
      {...(dataSet && { dataSet })}
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
export function GrowField({ onSubmit, style, ...rest }: FieldProps & { onSubmit?: () => void }) {
  const [tall, setTall] = useState(0);
  // In its own box the 2-px outline is inside the height: without that room the last 4 px would scroll.
  const edge = rest.bare ? 0 : 4;
  const own = useRef<InputRef>(null);
  return (
    <Field
      {...rest}
      ref={own}
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
        style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }, seen ? { height: seen.height, transform: [{ translateY: seen.top }] } : styles.flex]}>
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
}

/**
 * A layer over a screen (pass it as `GoScreen`'s `layer`): a bottom sheet, or a centred confirm. It
 * has a heading, a visible Close (the handle bar), takes focus and gives it back to what opened it;
 * Esc, Back and the scrim close it. It slides up in under 200 ms; under Reduce Motion it is just there.
 * `data-moving` says whether it is still arriving.
 */
export function Sheet({ title, onClose, children, confirm, testID, fallback }: SheetProps) {
  const reduce = useReduce();
  const [arrived, setArrived] = useState(false);
  const moving = !reduce && !arrived;
  const [slide] = useState(() => new Animated.Value(reduce ? 1 : 0));
  const box = useRef<ViewRef>(null);
  const heading = useRef<TextRef>(null);
  useBackCloses(true, onClose);
  useKeys(true, { Escape: onClose }, true);

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

/**
 * A confirm (B-11 §9b): the act and the thing as its title, Cancel filled and first, the action
 * beside it. Focus lands on Cancel; Esc, Back and the scrim cancel.
 */
export function Confirm({ title, action, onAct, onCancel, testID }: { title: string; action: string; onAct: () => void; onCancel: () => void; testID?: string }) {
  return (
    <Sheet title={title} onClose={onCancel} confirm testID={testID}>
      <View style={styles.pair}>
        <Btn kind="filled" label="Cancel" onPress={onCancel} style={styles.grow} dataSet={{ first: 'true' }} />
        <Btn label={action} onPress={onAct} style={styles.grow} />
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
});
