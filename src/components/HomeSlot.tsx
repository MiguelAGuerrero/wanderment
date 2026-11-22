import { useIsFocused } from 'expo-router';
import { ComponentRef, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { decorative } from '@/components/a11y';
import { Composer } from '@/components/Composer';
import { HomeFace, whatsNextNode } from '@/domain/slot';
import { Id } from '@/domain/types';
import { holdsData, useStore } from '@/store/useStore';
import { C } from '@/theme';

type Focusable = ComponentRef<typeof View> | null;

/** Web only: moves focus to an element once it has rendered. */
const focusSoon = (ref: { current: Focusable }) => {
  if (Platform.OS === 'web') requestAnimationFrame(() => (ref.current as unknown as HTMLElement | null)?.focus?.());
};

/**
 * Home's bottom (P-49): one slot, two faces, and the toggle under it. "What's next · <node>" shows that
 * wander's staged step with ✓ (one tap logs it), or "＋ add one"; "Log" is the log box. Only one face
 * shows at a time. Home opens on What's next (on Log while there's no wander) and goes back to it
 * after a log. On web, typing while nothing editable has focus switches to Log, starting the line.
 * The card's node is only shown: it never attaches anything to a log.
 */
export function HomeSlot({ bridge }: { bridge?: boolean }) {
  const face = useStore((st) => st.homeFace);
  const showHomeFace = useStore((st) => st.showHomeFace);
  const focusLogBox = useStore((st) => st.focusLogBox);
  const data = useStore((st) => st.data);
  const selected = useStore((st) => st.selected?.id);
  const node = useMemo(() => whatsNextNode(data, selected), [data, selected]);
  const screenFocused = useIsFocused();
  const nextTab = useRef<Focusable>(null);
  /** The page is taking the data back (P-29): the Log face says so over its box; What's next, over its card. */
  const reconnecting = !useStore(holdsData);

  // Web: a printable key while nothing editable has focus starts the line on the Log face. Space
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

  // Switching faces is announced (not the face Home opens on).
  const [seenFace, setSeenFace] = useState(face);
  const [said, setSaid] = useState({ text: '', n: 0 });
  if (seenFace !== face) {
    setSeenFace(face);
    setSaid({ text: face === 'log' ? 'Log' : 'What’s next', n: said.n + 1 });
  }
  const announced = useRef(0);
  useEffect(() => {
    // Web uses the live region below.
    if (said.n === announced.current || Platform.OS === 'web') return;
    announced.current = said.n;
    if (screenFocused) AccessibilityInfo.announceForAccessibility(said.text);
  }, [said, screenFocused]);

  // Esc in the empty box: back to What's next, focus on its tab.
  const onEmptyEscape = () => {
    showHomeFace('next');
    focusSoon(nextTab);
  };
  // A log from the box: back on What's next (focus on its tab), unless it stays on Log (no wanders).
  const onLogged = () => {
    if (useStore.getState().homeFace !== 'next') return false;
    focusSoon(nextTab);
    return true;
  };

  return (
    <View testID="home-slot">
      {Platform.OS === 'web' && (
        <View style={styles.srOnly} accessibilityLiveRegion="polite" testID="home-slot-said">
          <Text>{said.text}</Text>
        </View>
      )}
      {face === 'next' && (
        <View style={styles.face}>
          <View>
            {reconnecting && (
              // As over the log box: over the space above the card, so nothing moves while it shows.
              <Text style={styles.reconnecting} numberOfLines={1}>
                Reconnecting…
              </Text>
            )}
            {node ? <NextCard key={node} id={node} /> : <EmptyCard />}
          </View>
        </View>
      )}
      {/* Kept mounted (its line, caret and menu state stay) and out of sight and reach on What's next. */}
      <View style={face === 'log' ? undefined : styles.gone}>
        <Composer bridge={bridge} arrow onEmptyEscape={onEmptyEscape} onLogged={onLogged} />
      </View>
      <View style={styles.seg} role="tablist" aria-label="What’s next or Log">
        <SegTab label="What’s next" face="next" current={face} tabRef={nextTab} onPress={() => showHomeFace('next')} />
        <SegTab label="Log" face="log" current={face} onPress={focusLogBox} />
      </View>
    </View>
  );
}

function SegTab({ label, face, current, tabRef, onPress }: { label: string; face: HomeFace; current: HomeFace; tabRef?: React.Ref<Focusable>; onPress: () => void }) {
  const on = face === current;
  return (
    <Pressable ref={tabRef} onPress={onPress} role="tab" aria-selected={on} accessibilityState={{ selected: on }} style={[styles.tab, on && styles.tabOn]}>
      <Text style={[styles.tabText, on && styles.tabTextOn]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** "What's next · <node>": its step with ✓, or "＋ add one" (an inline field). Keyed by node. */
function NextCard({ id }: { id: Id }) {
  const name = useStore((st) => st.data.threads[id]?.name ?? '');
  const next = useStore((st) => st.data.threads[id]?.next);
  const log = useStore((st) => st.log);
  const setNext = useStore((st) => st.setNext);
  const [adding, setAdding] = useState(false);
  const [step, setStep] = useState('');
  const addRef = useRef<Focusable>(null);
  const checkRef = useRef<Focusable>(null);

  // ✓: logs the step as typed, with this wander as doing, and clears it (Undo is in the toast) — the
  // one-tap "Log next step" of P-35. A line in the log box stays where it is.
  const did = () => {
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
    <View style={styles.card} role="region" aria-label={next ? `What’s next, ${name}: ${next}` : `What’s next, ${name}`} testID="whats-next">
      <Text style={styles.label} numberOfLines={1}>
        What’s next · <Text style={styles.labelName}>{name}</Text>
      </Text>
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

/** No wander to stage a step for (Home's slot rests on Log then). */
function EmptyCard() {
  return (
    <View style={styles.card} role="region" aria-label="What’s next: nothing staged" testID="whats-next">
      <Text style={styles.label}>What’s next</Text>
      <Text style={[styles.step, styles.empty]}>Nothing staged</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  face: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 },
  gone: { display: 'none' },
  card: { backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.ink, borderRadius: 16, paddingTop: 10, paddingBottom: 6, paddingLeft: 16, paddingRight: 6, gap: 2 },
  label: { fontSize: 13, fontWeight: '600', color: C.muted, paddingRight: 10 },
  labelName: { color: C.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
  step: { flex: 1, fontSize: 18, lineHeight: 24, fontWeight: '600', color: C.ink },
  empty: { fontWeight: '500', color: C.muted, paddingVertical: 12 },
  check: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  checkText: { fontSize: 18, color: C.ink },
  add: { minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start', paddingRight: 12 },
  addText: { fontSize: 17, fontWeight: '500', color: C.accent },
  field: { minHeight: 48, marginRight: 10, fontSize: 17, color: C.ink, borderBottomWidth: 1.5, borderColor: C.ink },
  seg: { flexDirection: 'row', marginHorizontal: 12, marginBottom: 8, borderWidth: 1, borderColor: C.line, borderRadius: 14, overflow: 'hidden', backgroundColor: C.surface },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  tabOn: { backgroundColor: C.ink },
  tabText: { fontSize: 15, fontWeight: '500', color: C.muted },
  tabTextOn: { color: '#FFFFFF', fontWeight: '600' },
  reconnecting: { position: 'absolute', left: 16, right: 16, bottom: '100%', marginBottom: 2, fontSize: 12, color: C.muted },
  srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
});
