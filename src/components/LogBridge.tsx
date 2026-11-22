import { ComponentRef, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { bridgeThreads, needsBridge } from '@/domain/bridge';
import { Id } from '@/domain/types';
import { BRIDGE_QUESTION, useStore } from '@/store/useStore';
import { C, s } from '@/theme';

/** Home's log box (Home passes no placeholder, so it has the Composer's default label). */
const LOG_BOX_LABEL = 'What did you just do?';

/**
 * After a log on Home that went to no thread: "Logged. Toward something — or just itself?" with up to
 * three threads, "+ name it" and "Just itself". Ignoring it leaves no trace. It isn't a live region:
 * the toast already announces the question once.
 */
export function LogBridge({ style }: { /** Home: it sits above the log box, inset like it. */ style?: object }) {
  const data = useStore((st) => st.data);
  const bridgeFor = useStore((st) => st.bridgeFor);
  if (!bridgeFor || !needsBridge(data, bridgeFor)) return null;
  // Keyed, so a half-typed name never carries over to the next activity.
  return <Bridge key={bridgeFor} activityId={bridgeFor} style={style} />;
}

function Bridge({ activityId, style }: { activityId: Id; style?: object }) {
  const data = useStore((st) => st.data);
  const attach = useStore((st) => st.attach);
  const attachToNew = useStore((st) => st.attachToNew);
  const dismiss = useStore((st) => st.dismissBridge);
  const root = useRef<ComponentRef<typeof View>>(null);
  const nameBtn = useRef<ComponentRef<typeof View>>(null);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const threads = bridgeThreads(data);

  const attachTo = (threadId: Id) => {
    // Read fresh: a second tap, or a thread hidden since this rendered, does nothing.
    const now = useStore.getState().data;
    if (!needsBridge(now, activityId) || !now.threads[threadId] || now.threads[threadId].hidden) return;
    const box = logBoxNear(root.current);
    attach(activityId, threadId);
    box?.focus();
  };

  const submitName = () => {
    if (!name.trim()) return;
    const box = logBoxNear(root.current);
    if (attachToNew(activityId, name)) box?.focus();
  };

  const cancelName = () => {
    setNaming(false);
    setName('');
    if (Platform.OS === 'web') requestAnimationFrame(() => (nameBtn.current as unknown as HTMLElement | null)?.focus?.());
  };

  return (
    <View ref={root} style={[styles.wrap, style]} role="group" aria-label="Attach what you just logged">
      <Text style={styles.copy}>Logged. {BRIDGE_QUESTION}</Text>
      <View style={styles.row}>
        {threads.map((t) => (
          <Pressable key={t.id} onPress={() => attachTo(t.id)} style={[s.chip, styles.chip]} accessibilityRole="button" accessibilityLabel={`Attach to ${t.name}`}>
            <Text style={[s.chipText, styles.chipText]}>{t.name}</Text>
          </Pressable>
        ))}
        {naming ? (
          <TextInput
            value={name}
            onChangeText={setName}
            autoFocus
            placeholder="Name it as an action…"
            placeholderTextColor={C.faint}
            onSubmitEditing={submitName}
            submitBehavior="submit"
            // react-native-web ignores submitBehavior and blurs on Enter (which would cancel a blank name).
            blurOnSubmit={false}
            onBlur={() => !name.trim() && setNaming(false)}
            onKeyPress={(e) => Platform.OS === 'web' && e.nativeEvent.key === 'Escape' && cancelName()}
            returnKeyType="done"
            style={styles.input}
            accessibilityLabel="Name the wander it was toward"
          />
        ) : (
          <Pressable ref={nameBtn} onPress={() => setNaming(true)} style={[s.chip, s.chipDashed]} accessibilityRole="button">
            <Text style={[s.chipText, { color: C.accent }]}>+ name it</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => {
            const box = logBoxNear(root.current);
            dismiss();
            box?.focus();
          }}
          style={styles.quiet}
          accessibilityRole="button">
          <Text style={styles.quietText}>Just itself</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Web with a fine pointer (no on-screen keyboard): the log box in the same screen as `from`, so
 * focus can go back to it after an attach. On touch screens (and native) focusing it would raise
 * the keyboard over Home, so focus is left alone there (owner, 2026-11-21: only "Log this" does).
 */
function logBoxNear(from: unknown): HTMLElement | null {
  if (Platform.OS !== 'web') return null;
  try {
    if (globalThis.matchMedia?.('(pointer: coarse)').matches) return null;
  } catch {
    // No matchMedia: treat as a desktop.
  }
  let el = (from as HTMLElement | null)?.parentElement;
  while (el) {
    const box = el.querySelector<HTMLElement>(`input[aria-label="${LOG_BOX_LABEL}"]`);
    if (box) return box;
    el = el.parentElement;
  }
  return null;
}

const styles = StyleSheet.create({
  wrap: { gap: 10, padding: 14, borderRadius: 14, backgroundColor: C.quietBg },
  copy: { fontSize: 15, lineHeight: 22, color: C.ink },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  chip: { maxWidth: '100%' },
  chipText: { flexShrink: 1 },
  input: { flexGrow: 1, flexBasis: 160, minWidth: 0, maxWidth: '100%', minHeight: 44, fontSize: 15, color: C.ink, borderBottomWidth: 1, borderColor: C.line },
  quiet: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  quietText: { fontSize: 14, color: C.muted, textDecorationLine: 'underline' },
});
