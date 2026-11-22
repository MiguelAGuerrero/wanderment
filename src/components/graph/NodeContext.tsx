import { Link } from 'expo-router';
import { ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { decorative } from '@/components/a11y';
import { LogBridge } from '@/components/LogBridge';
import { Id } from '@/domain/types';
import { useStore } from '@/store/useStore';
import { C } from '@/theme';

/**
 * What sits right above Home's log box: the selected wander's context row (P-35) or, with nothing
 * selected, the bridge. One at a time, so with the keyboard up the row replaces the bridge instead
 * of stacking on it (the pull-in line also steps aside while something is selected).
 */
export function HomeAboveLog({ style }: { style?: object }) {
  const selected = useStore((st) => st.selected?.id);
  const name = useStore((st) => (selected ? st.data.threads[selected]?.name : undefined));
  const selectFocus = useStore((st) => st.selectFocus);
  const row = useRef<ComponentRef<typeof View>>(null);
  // A selection made from the list (without pointing): focus moves to the row (its first action).
  const seen = useRef(selectFocus);
  useEffect(() => {
    if (seen.current === selectFocus) return;
    seen.current = selectFocus;
    if (!name) return;
    if (Platform.OS !== 'web') return AccessibilityInfo.announceForAccessibility(`Toward ${name}`);
    const el = row.current as unknown as HTMLElement | null;
    (el?.querySelector<HTMLElement>('[data-testid="node-context-action"]') ?? el?.querySelector<HTMLElement>('[role="link"]'))?.focus();
  }, [selectFocus, name]);
  if (!selected || !name) return <LogBridge style={style} />;
  // Keyed, so a half-typed step never carries over to another wander.
  return <NodeContext key={selected} id={selected} name={name} rowRef={row} style={style} />;
}

/**
 * "Toward draw": the selected wander's quick actions at the log box. "↳ Log next step: …" loads its
 * staged step (the crumb's "Log this"), "+ next step" sets one inline, "Open" goes to its page, and
 * × (or Esc) clears the selection. Typing meanwhile logs toward it, through the "to" chip in the box.
 */
function NodeContext({ id, name, rowRef, style }: { id: Id; name: string; rowRef: React.RefObject<ComponentRef<typeof View> | null>; style?: object }) {
  const next = useStore((st) => st.data.threads[id]?.next);
  // The step is already in the log box (the box's step chip says so): nothing more to offer.
  const loaded = useStore((st) => st.draft.fromNextOf === id && st.draft.fromNextText === next && st.draft.text.trim() !== '');
  const select = useStore((st) => st.select);
  const loadNext = useStore((st) => st.loadNext);
  const setNext = useStore((st) => st.setNext);
  const [naming, setNaming] = useState(false);
  const [step, setStep] = useState('');

  // Clears the selection; if focus was in the row, it goes back to the wander in the list.
  const clear = useCallback(() => {
    const el = Platform.OS === 'web' ? (rowRef.current as unknown as HTMLElement | null) : null;
    const within = !!el && typeof document !== 'undefined' && el.contains(document.activeElement);
    select(undefined);
    if (within) requestAnimationFrame(() => document.getElementById(pickId(id))?.focus());
  }, [id, rowRef, select]);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    // Esc anywhere on Home, unless something nearer used it (the @ menu, the step field). Text inputs
    // stop key events from bubbling, so it's caught on the way down and judged once it's handled.
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setTimeout(() => !e.defaultPrevented && clear(), 0);
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [clear]);

  const submitStep = () => {
    const v = step.trim();
    if (!v) return setNaming(false);
    if (setNext(id, v)) setNaming(false);
  };

  return (
    <View ref={rowRef} style={[styles.wrap, style]} role="group" aria-label={`Toward ${name}`} testID="node-context">
      <View style={styles.top}>
        <Text style={styles.copy} numberOfLines={1}>
          Toward <Text style={styles.name}>{name}</Text>
        </Text>
        <Link href={`/thread/${id}`} asChild>
          <Pressable accessibilityRole="link" accessibilityLabel={`Open ${name}`} style={styles.quiet}>
            <Text style={styles.link}>Open</Text>
          </Pressable>
        </Link>
        <Pressable onPress={clear} accessibilityRole="button" accessibilityLabel="Clear selection" style={styles.close}>
          <Text style={{ color: C.muted, fontSize: 18 }} {...decorative}>
            ×
          </Text>
        </Pressable>
      </View>
      {next ? (
        !loaded && (
          <Pressable onPress={() => loadNext(id)} accessibilityRole="button" style={styles.action} testID="node-context-action">
            <Text style={styles.actionText} numberOfLines={2}>
              <Text {...decorative}>↳ </Text>Log next step: {next}
            </Text>
          </Pressable>
        )
      ) : naming ? (
        <TextInput
          value={step}
          onChangeText={setStep}
          autoFocus
          placeholder={`One next step toward ${name}`}
          placeholderTextColor={C.faint}
          onSubmitEditing={submitStep}
          submitBehavior="submit"
          blurOnSubmit={false}
          onBlur={() => !step.trim() && setNaming(false)}
          onKeyPress={(e) => {
            if (Platform.OS !== 'web' || e.nativeEvent.key !== 'Escape') return;
            e.preventDefault();
            setStep('');
            setNaming(false);
          }}
          returnKeyType="done"
          style={styles.input}
          accessibilityLabel={`Next step for ${name}`}
        />
      ) : (
        <Pressable onPress={() => setNaming(true)} accessibilityRole="button" style={styles.action} testID="node-context-action">
          <Text style={[styles.actionText, { color: C.accent }]}>+ next step</Text>
        </Pressable>
      )}
    </View>
  );
}

/** The id of a wander's button in Home's list ("What's in the picture"), where focus returns after a clear. */
export const pickId = (id: Id) => `pick-${id}`;

const styles = StyleSheet.create({
  wrap: { paddingLeft: 14, paddingRight: 4, paddingBottom: 4, borderRadius: 14, backgroundColor: C.quietBg },
  top: { flexDirection: 'row', alignItems: 'center' },
  copy: { flex: 1, fontSize: 15, color: C.ink },
  name: { fontWeight: '600', color: C.accentInk },
  quiet: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 },
  link: { fontSize: 14, fontWeight: '500', color: C.accent },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  action: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', maxWidth: '100%', paddingRight: 10 },
  actionText: { fontSize: 15, fontWeight: '500', color: C.accentInk },
  input: { minHeight: 44, marginRight: 10, fontSize: 15, color: C.ink, borderBottomWidth: 1, borderColor: C.line },
});
