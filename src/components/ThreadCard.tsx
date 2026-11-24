import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { nightHeatInk } from '@/domain/heat';
import { ageLabel, ThreadSummary } from '@/domain/selectors';
import { useStore } from '@/store/useStore';
import { decorative } from '@/components/a11y';
import { M } from '@/theme'; // dark Map: the night palette

/** Dim violet to lantern amber by warmth (0..1): Map's night heat marks (dark Map). */
const warmColor = nightHeatInk;

/** A thread card with its next-step crumb attached underneath. */
export function ThreadCard({ summary }: { summary: ThreadSummary }) {
  const { thread, last, warmth } = summary;
  const showShading = useStore((s) => s.showShading);
  const draft = useStore((s) => s.draft);
  const promptNextFor = useStore((s) => s.promptNextFor);
  const loadNext = useStore((s) => s.loadNext);
  const setNext = useStore((s) => s.setNext);

  // Staged in the log box (the Composer shows the same step chip while this holds).
  // Only while the box has a line: with an empty box, "Log this" is offered again (it refills it).
  const loaded = draft.fromNextOf === thread.id && draft.fromNextText === thread.next && draft.text.trim() !== '';
  // Either the step's own text is in the box, or the person's own line counts as it.
  const where = draft.text.trim() === thread.next ? 'in the log box' : 'attached to your line';
  const meta = last ? `${last.text} · last touched ${ageLabel(last.occurredAt)}` : 'nothing logged yet';

  return (
    <View>
      <Pressable
        onPress={() => router.push(`/thread/${thread.id}`)}
        style={styles.card}
        accessibilityRole="button"
        accessibilityHint="Opens the wander">
        {showShading && <View style={[styles.bar, { backgroundColor: warmColor(warmth) }]} />}
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.name}>{thread.name}</Text>
          <Text style={styles.meta} numberOfLines={1}>{meta}</Text>
        </View>
        <Text style={styles.chev} {...decorative}>›</Text>
      </Pressable>

      {thread.next ? (
        loaded ? (
          <View style={[styles.crumb, styles.crumbLoaded]} accessibilityLabel={`${thread.next} is ${where}`}>
            <Text style={[styles.crumbText, styles.loadedText]}>{thread.next}</Text>
            <Text style={styles.loadedHint}>{where}</Text>
          </View>
        ) : (
          <View style={styles.crumb}>
            <Pressable
              onPress={() => loadNext(thread.id)}
              style={styles.crumbMain}
              accessibilityRole="button"
              // Native screen readers get the full sentence, starting with what's on screen (WCAG 2.5.3).
              // On web the name comes from the visible text, so voice control matches it exactly.
              accessibilityLabel={
                Platform.OS === 'web'
                  ? undefined
                  : `${thread.next}, Log this. Next step for ${thread.name}. ${
                      draft.text.trim() ? 'Double-tap to count the line in the log box as this step.' : 'Double-tap to load into the log box.'
                    }`
              }>
              <Text style={styles.arrow} {...decorative}>↳</Text>
              <Text style={styles.crumbText}>{thread.next}</Text>
              <Text style={styles.logThis}>Log this</Text>
            </Pressable>
            <Pressable onPress={() => router.push(`/thread/${thread.id}`)} style={styles.pen} accessibilityRole="button" accessibilityLabel={`Edit next step for ${thread.name}`}>
              <Text style={{ color: M.faint, fontSize: 16 }} {...decorative}>✎</Text>
            </Pressable>
          </View>
        )
      ) : (
        <NextInput threadId={thread.id} name={thread.name} quiet={promptNextFor === thread.id} onSet={setNext} />
      )}
    </View>
  );
}

function NextInput({ threadId, name, quiet, onSet }: { threadId: string; name: string; quiet: boolean; onSet: (id: string, v: string) => void }) {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  if (!open && !quiet) {
    return (
      <Pressable onPress={() => setOpen(true)} style={[styles.crumb, styles.crumbEmpty]} accessibilityRole="button" accessibilityLabel={`What’s next? Set a next step for ${name}`}>
        <Text style={styles.arrow} {...decorative}>↳</Text>
        <Text style={styles.emptyText}>+ What’s next?</Text>
      </Pressable>
    );
  }
  return (
    <View style={[styles.crumb, styles.crumbEmpty]}>
      <Text style={styles.arrow} {...decorative}>↳</Text>
      <TextInput
        value={value}
        onChangeText={setValue}
        autoFocus={open}
        placeholder={quiet ? '+ What’s next? (optional)' : `What’s next for ${name}?`}
        placeholderTextColor={M.faint}
        style={styles.nextInput}
        returnKeyType="done"
        onSubmitEditing={() => value.trim() && onSet(threadId, value)}
        accessibilityLabel={`Optional next step for ${name}`}
      />
      {value.trim() ? (
        <Pressable onPress={() => onSet(threadId, value)} style={styles.setBtn} accessibilityRole="button" accessibilityLabel={`Set next step for ${name}`}>
          <Text style={{ color: M.onInk, fontWeight: '600', fontSize: 14 }}>Set</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, paddingVertical: 12, backgroundColor: M.surface, borderWidth: 1, borderColor: M.line, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  bar: { width: 4, height: 34, borderRadius: 2 },
  name: { fontSize: 16, fontWeight: '600', color: M.ink },
  meta: { fontSize: 13, color: M.muted },
  chev: { color: M.faint, fontSize: 18 },
  crumb: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingLeft: 14, paddingRight: 4, backgroundColor: M.crumbBg, borderWidth: 1, borderTopWidth: 0, borderColor: M.line, borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
  crumbMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  crumbText: { flex: 1, fontSize: 15, color: M.accentInk },
  arrow: { color: M.dashed, marginRight: 4 },
  logThis: { fontSize: 12, fontWeight: '600', color: M.accent },
  pen: { width: 44, height: 44, marginLeft: 8, alignItems: 'center', justifyContent: 'center' },
  crumbLoaded: { gap: 10, paddingRight: 14 },
  loadedText: { color: M.muted, textDecorationLine: 'line-through' },
  loadedHint: { fontSize: 12, fontWeight: '500', color: M.muted, flexShrink: 1, maxWidth: '40%', textAlign: 'right' },
  crumbEmpty: { backgroundColor: 'transparent', borderStyle: 'dashed', borderColor: M.dashed, minHeight: 44, gap: 6 },
  emptyText: { fontSize: 14, color: M.muted },
  nextInput: { flex: 1, fontSize: 15, color: M.ink, minHeight: 40 },
  setBtn: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: M.ink, alignItems: 'center', justifyContent: 'center' },
});
