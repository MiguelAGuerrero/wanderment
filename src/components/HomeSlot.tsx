import { Link } from 'expo-router';
import { ComponentRef, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityActionEvent, AccessibilityInfo, Animated, BackHandler, PanResponder, PanResponderGestureState, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { decorative } from '@/components/a11y';
import { useShown } from '@/components/shown';
import { Composer } from '@/components/Composer';
import { useGraphNarrow } from '@/components/graph/HomeGraph';
import { stepFocus, validScope } from '@/domain/focus';
import { cardLabel, whatsNextNode } from '@/domain/slot';
import { Id } from '@/domain/types';
import { holdsData, useStore } from '@/store/useStore';
import { C } from '@/theme';

type Focusable = ComponentRef<typeof View> | null;

/** Web only: moves focus to an element once it has rendered. */
const focusSoon = (ref: { current: Focusable }) => {
  if (Platform.OS === 'web') requestAnimationFrame(() => (ref.current as unknown as HTMLElement | null)?.focus?.());
};

/** A swipe this far (px) moves focus; a quick flick needs less. */
const SWIPE = 40;
const native = Platform.OS !== 'web';

/** When the last swipe ended, so the press it started on (✓) doesn't count. */
interface Swiped {
  recently(): boolean;
}

/**
 * The card's swipe (P-50): a horizontal drag nudges the card and, far or fast enough, moves focus to
 * the next (leftward) or previous chain. It wins over the press under it, and ✓ ignores a press that
 * ends one.
 */
function swipe() {
  let at = 0;
  const drag = new Animated.Value(0);
  const horizontal = (_: unknown, g: PanResponderGestureState) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > 1.5 * Math.abs(g.dy) && !typing();
  const settle = () => Animated.spring(drag, { toValue: 0, useNativeDriver: native, bounciness: 0 }).start();
  const pan = PanResponder.create({
    onMoveShouldSetPanResponderCapture: horizontal,
    onMoveShouldSetPanResponder: horizontal,
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => drag.setValue(Math.max(-48, Math.min(48, g.dx * 0.4))),
    onPanResponderRelease: (_, g) => {
      at = Date.now();
      if (Math.abs(g.dx) >= SWIPE || (Math.abs(g.vx) > 0.4 && Math.abs(g.dx) > 16)) useStore.getState().moveFocus(g.dx < 0 ? 1 : -1);
      settle();
    },
    onPanResponderTerminate: settle,
  });
  const swiped: Swiped = { recently: () => Date.now() - at < 600 };
  return { pan, drag, swiped };
}

/** Web only: whether a text field has focus (a drag there selects text; arrows move the caret). */
const typing = () => {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return false;
  const el = document.activeElement as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
};

/**
 * Home's bottom (P-61, D-11): the What's next card, always shown, and a round ＋ beside its corner
 * that raises the log field above it (focus goes in: the person asked). "What's next · <node>" shows
 * that wander's staged step with ✓ (one tap logs it), or "＋ add one". Esc or a tap outside with an
 * empty line, or Android's Back, put the field away; so does a log (while there's no wander it rests
 * open). On web, typing while nothing editable has focus opens it, starting the line.
 * The card's node is the focus (P-50): it's only shown, never attached to a log by itself. Swiping the
 * card (or ‹ › on web, the arrow keys in it, a screen reader's actions) moves it between the scope's
 * chains; slim peeks at the edges show there's more.
 */
export function HomeSlot() {
  const open = useStore((st) => st.homeFace === 'log');
  const showHomeFace = useStore((st) => st.showHomeFace);
  const focusLogBox = useStore((st) => st.focusLogBox);
  const data = useStore((st) => st.data);
  const focus = useStore((st) => st.focus);
  const node = useMemo(() => whatsNextNode(data, focus), [data, focus]);
  // Where a swipe can go from here (P-50), from the picture as drawn.
  const map = useStore((st) => st.focusMap);
  const scope = useStore((st) => st.scope);
  const [canPrev, canNext] = useMemo(() => {
    if (!map) return [false, false];
    const sc = validScope(map, scope);
    return ([-1, 1] as const).map((d) => {
      const to = stepFocus(map, sc, node, d);
      return !!to && to !== node;
    });
  }, [map, scope, node]);
  const screenFocused = useShown();
  const [{ pan, drag, swiped }] = useState(swipe);
  const plus = useRef<Focusable>(null);
  /** The page is taking the data back (P-29): the field says so over its box; the card, over itself. */
  const reconnecting = !useStore(holdsData);

  // Web: a printable key while nothing editable has focus opens the field and starts the line. Space
  // still presses a focused button; shortcuts (Ctrl, ⌘, Alt) and IME composition are left alone.
  useEffect(() => {
    if (Platform.OS !== 'web' || !screenFocused || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.isComposing || [...e.key].length !== 1) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (e.key === ' ' && el && el !== document.body) return;
      e.preventDefault();
      const st = useStore.getState();
      st.setDraft({ text: st.draft.text + e.key });
      st.focusLogBox();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [screenFocused]);

  // Android's Back puts the open field away first.
  useEffect(() => {
    if (Platform.OS !== 'android' || !screenFocused || !open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      showHomeFace('next');
      return true;
    });
    return () => sub.remove();
  }, [screenFocused, open, showHomeFace]);

  // Esc in the empty field: it goes away, and focus goes back to ＋.
  const onEmptyEscape = () => {
    showHomeFace('next');
    focusSoon(plus);
  };
  // A tap outside with nothing in it: it goes away (focus is where the tap put it).
  const onEmptyBlur = () => {
    if (useStore.getState().homeFace === 'log') showHomeFace('next');
  };
  // After a log the field goes away (focus back on ＋), unless it rests open (no wanders).
  const onLogged = () => {
    if (useStore.getState().homeFace !== 'next') return false;
    focusSoon(plus);
    return true;
  };

  return (
    <View testID="home-slot">
      <FocusSaid screenFocused={screenFocused} />
      {/* Kept mounted (its line, caret and chips stay) and out of sight and reach while it's away. */}
      <View style={open ? undefined : styles.gone} testID="home-log-field">
        <Composer arrow autocomplete onEmptyEscape={onEmptyEscape} onEmptyBlur={onEmptyBlur} onLogged={onLogged} />
      </View>
      <View style={styles.face}>
        <View style={styles.cardSlot} {...pan.panHandlers}>
          {/* Slim peeks: there's another chain that way. */}
          {canPrev && <View style={[styles.peek, styles.peekL]} testID="whats-next-peek-prev" {...decorative} />}
          {canNext && <View style={[styles.peek, styles.peekR]} testID="whats-next-peek-next" {...decorative} />}
          <Animated.View style={{ transform: [{ translateX: drag }] }}>
            {reconnecting && !open && (
              // As over the log box: over the space above the card, so nothing moves while it shows.
              <Text style={styles.reconnecting} numberOfLines={1}>
                Reconnecting…
              </Text>
            )}
            {node ? <NextCard id={node} canPrev={canPrev} canNext={canNext} swiped={swiped} /> : <EmptyCard />}
          </Animated.View>
        </View>
        {!open && (
          <Pressable ref={plus} onPress={focusLogBox} accessibilityRole="button" accessibilityLabel="Log something" style={styles.plus} testID="log-plus">
            <Text style={styles.plusText} {...decorative}>
              ＋
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** Says a focus or scope change (P-50) politely: a live region on web, an announcement on native. */
function FocusSaid({ screenFocused }: { screenFocused: boolean }) {
  const said = useStore((st) => st.focusSaid);
  const announced = useRef(said.n);
  useEffect(() => {
    if (said.n === announced.current || Platform.OS === 'web') return;
    announced.current = said.n;
    if (screenFocused) AccessibilityInfo.announceForAccessibility(said.text);
  }, [said, screenFocused]);
  if (Platform.OS !== 'web') return null;
  return (
    <View style={styles.srOnly} accessibilityLiveRegion="polite" testID="home-focus-said">
      <Text>{said.text}</Text>
    </View>
  );
}

/**
 * "What's next · <node>": its step with ✓, or "＋ add one" (an inline field). The node's name opens its
 * page. A labelled region named with the node's path (P-50), with "Next chain" / "Previous chain".
 */
function NextCard({ id, canPrev, canNext, swiped }: { id: Id; canPrev: boolean; canNext: boolean; swiped: Swiped }) {
  const name = useStore((st) => st.data.threads[id]?.name ?? '');
  const next = useStore((st) => st.data.threads[id]?.next);
  const label = useStore((st) => cardLabel(st.data, st.focusMap, id));
  const log = useStore((st) => st.log);
  const setNext = useStore((st) => st.setNext);
  const moveFocus = useStore((st) => st.moveFocus);
  // Narrow (200 % zoom, the largest text): just the name, so it and ‹ › keep one line (the card's name says the rest).
  const narrow = useGraphNarrow();
  const [adding, setAdding] = useState(false);
  const [step, setStep] = useState('');
  // Another node: a half-typed step never carries over (the card itself stays, so focus on ‹ › does).
  const [shown, setShown] = useState(id);
  if (shown !== id) {
    setShown(id);
    setAdding(false);
    setStep('');
  }
  const addRef = useRef<Focusable>(null);
  const checkRef = useRef<Focusable>(null);
  const cardRef = useRef<Focusable>(null);
  // The picture's dashed ＋ (P-50): opens "＋ add one" here (from either face), then the ask is taken.
  const askedFor = useStore((st) => st.addStepFor);
  const askAddStep = useStore((st) => st.askAddStep);
  if (askedFor === id && !next && !adding) setAdding(true);
  useEffect(() => {
    if (askedFor) askAddStep(undefined);
  }, [askedFor, askAddStep]);

  /** Moves focus to the next (1) or previous (-1) chain; if what had focus went with the old node, the card takes it. */
  const move = (dir: 1 | -1) => {
    if (!moveFocus(dir) || Platform.OS !== 'web') return;
    requestAnimationFrame(() => {
      const el = cardRef.current as unknown as HTMLElement | null;
      if (el && (!document.activeElement || document.activeElement === document.body)) el.focus();
    });
  };
  const onAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'next') move(1);
    else if (e.nativeEvent.actionName === 'previous') move(-1);
  };
  const onKeyDown = (e: { key: string; preventDefault(): void }) => {
    if ((e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') || typing()) return;
    e.preventDefault();
    move(e.key === 'ArrowRight' ? 1 : -1);
  };

  // ✓: logs the step as typed, with this wander as doing, and clears it (Undo is in the toast) — the
  // one-tap "Log next step" of P-35. A line in the log box stays where it is. Only a clean tap: not
  // the end of a swipe (P-50).
  const did = () => {
    if (swiped.recently()) return;
    const t = useStore.getState().data.threads[id];
    if (!t?.next) return;
    const hadFocus = Platform.OS === 'web' && typeof document !== 'undefined' && document.activeElement === (checkRef.current as unknown as Element | null);
    if (log({ text: t.next, doingId: id, toIds: [], fromNextOf: id, fromNextText: t.next }, { keepLine: true }) && hadFocus) focusSoon(addRef);
  };
  const cancel = () => {
    setStep('');
    setAdding(false);
  };
  const save = () => {
    const v = step.trim();
    if (!v) return cancel();
    if (setNext(id, v)) cancel();
  };

  return (
    <View
      ref={cardRef}
      style={styles.card}
      role="region"
      aria-label={label}
      testID="whats-next"
      nativeID="whats-next"
      accessibilityActions={[
        { name: 'next', label: 'Next chain' },
        { name: 'previous', label: 'Previous chain' },
      ]}
      onAccessibilityAction={onAction}
      {...(Platform.OS === 'web' && ({ tabIndex: -1, onKeyDown } as object))}>
      <View style={styles.labelRow}>
        {!narrow && (
          <Text style={styles.label} numberOfLines={1}>
            What’s next ·{'\u00A0'}
          </Text>
        )}
        <Link href={`/thread/${id}`} asChild>
          <Pressable accessibilityRole="link" accessibilityLabel={`Open ${name}`} style={styles.nameLink}>
            <Text style={[styles.label, styles.labelName]} numberOfLines={1}>
              {name}
            </Text>
          </Pressable>
        </Link>
        {Platform.OS === 'web' && (canPrev || canNext) && (
          <View style={styles.nav}>
            <NavButton label="Previous chain" glyph="‹" enabled={canPrev} onPress={() => move(-1)} />
            <NavButton label="Next chain" glyph="›" enabled={canNext} onPress={() => move(1)} />
          </View>
        )}
      </View>
      {next ? (
        <View style={styles.row}>
          <Text style={styles.step} numberOfLines={2}>
            {next}
          </Text>
          <Pressable ref={checkRef} onPress={did} accessibilityRole="button" accessibilityLabel={`Did it: ${next}`} style={styles.check}>
            <Text style={styles.checkText} {...decorative}>
              ✓
            </Text>
          </Pressable>
        </View>
      ) : adding ? (
        <TextInput
          value={step}
          onChangeText={setStep}
          autoFocus
          placeholder={`One next step toward ${name}`}
          placeholderTextColor={C.faint}
          onSubmitEditing={save}
          submitBehavior="submit"
          // react-native-web ignores submitBehavior and blurs on Enter (which would cancel a blank step).
          blurOnSubmit={false}
          onBlur={() => !step.trim() && cancel()}
          onKeyPress={(e) => {
            if (Platform.OS !== 'web' || e.nativeEvent.key !== 'Escape') return;
            // Only the field: a selection stays.
            e.preventDefault();
            cancel();
            focusSoon(addRef);
          }}
          returnKeyType="done"
          style={styles.field}
          accessibilityLabel={`What’s next for ${name}`}
        />
      ) : (
        <Pressable ref={addRef} onPress={() => setAdding(true)} accessibilityRole="button" accessibilityLabel={`add one: a next step for ${name}`} style={styles.add}>
          <Text style={styles.addText}>
            <Text {...decorative}>＋ </Text>add one
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/** ‹ or › on web (P-50): the card's previous and next chain, for a mouse and the keyboard. */
function NavButton({ label, glyph, enabled, onPress }: { label: string; glyph: string; enabled: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!enabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !enabled }} style={styles.navBtn}>
      <Text style={[styles.navText, !enabled && styles.navOff]} {...decorative}>
        {glyph}
      </Text>
    </Pressable>
  );
}

/** No wander to stage a step for (Home's log field rests open then). */
function EmptyCard() {
  return (
    <View style={styles.card} role="region" aria-label="What’s next: nothing staged" testID="whats-next">
      <Text style={[styles.label, styles.emptyLabel]}>What’s next</Text>
      <Text style={[styles.step, styles.empty]}>Nothing staged</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // P-50: a drag here is a swipe, never a text selection (which would turn the next drag into a text drag).
  face: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8, userSelect: 'none', flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  cardSlot: { flex: 1, minWidth: 0 },
  // P-61: the round ＋ at the card's bottom-right corner (56 pt), clear of ✓.
  plus: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  plusText: { fontSize: 30, lineHeight: 34, color: '#FFFFFF', fontWeight: '500' },
  gone: { display: 'none' },
  card: { backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.ink, borderRadius: 16, paddingTop: 7, paddingBottom: 6, paddingLeft: 16, paddingRight: 6, gap: 2 },
  // P-50: the name is the way to its page (a 44 px target), with ‹ › beside it on web.
  // One line; its 44 px targets reach into the card's padding (and a little past it) rather than making it taller.
  labelRow: { flexDirection: 'row', alignItems: 'center', minHeight: 30 },
  label: { fontSize: 13, fontWeight: '600', color: C.muted, flexShrink: 0 },
  labelName: { color: C.ink, textDecorationLine: 'underline', textDecorationColor: C.line },
  nameLink: { minHeight: 44, marginVertical: -7, justifyContent: 'center', flexShrink: 1, minWidth: 0, paddingRight: 10 },
  nav: { flexDirection: 'row', marginLeft: 'auto', flexShrink: 0 },
  navBtn: { width: 44, height: 44, marginVertical: -7, alignItems: 'center', justifyContent: 'center' },
  navText: { fontSize: 22, lineHeight: 26, color: C.ink },
  navOff: { color: C.dashed },
  peek: { position: 'absolute', top: 22, height: 48, width: 7, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  // In the face's padding (left) and the gap before ＋ (right), outside the card.
  peekL: { left: -10, borderLeftWidth: 0, borderTopRightRadius: 6, borderBottomRightRadius: 6 },
  peekR: { right: -8, borderRightWidth: 0, borderTopLeftRadius: 6, borderBottomLeftRadius: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
  step: { flex: 1, fontSize: 18, lineHeight: 24, fontWeight: '600', color: C.ink },
  empty: { fontWeight: '500', color: C.muted, paddingVertical: 12 },
  emptyLabel: { paddingTop: 3 },
  check: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  checkText: { fontSize: 18, color: C.ink },
  add: { minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start', paddingRight: 12 },
  addText: { fontSize: 17, fontWeight: '500', color: C.accent },
  field: { minHeight: 48, marginRight: 10, fontSize: 17, color: C.ink, borderBottomWidth: 1.5, borderColor: C.ink },
  reconnecting: { position: 'absolute', left: 16, right: 16, bottom: '100%', marginBottom: 2, fontSize: 12, color: C.muted },
  srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
});
