import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ageLabel, ThreadSummary } from '@/domain/selectors';
import { useStore } from '@/store/useStore';
import { C } from '@/theme';

/** Interpolates from faint to accent by warmth (0..1). */
function warmColor(w: number) {
  const from = [0xe8, 0xd5, 0xc6];
  const to = [0xa8, 0x46, 0x0f];
  const c = from.map((f, i) => Math.round(f + (to[i] - f) * w));
  return `rgb(${c.join(',')})`;
}

/** A thread card with its next-step crumb attached underneath. */
export function ThreadCard({ summary }: { summary: ThreadSummary }) {
  const { thread, last, warmth } = summary;
  const showShading = useStore((s) => s.showShading);
  const draft = useStore((s) => s.draft);
  const promptNextFor = useStore((s) => s.promptNextFor);
  const loadNext = useStore((s) => s.loadNext);
  const setNext = useStore((s) => s.setNext);

  const loaded = draft.fromNextOf === thread.id;
  const meta = last ? `${last.text} · last touched ${ageLabel(last.occurredAt)}` : 'nothing logged yet';

  return (
    <View>
      <Pressable
        onPress={() => router.push(`/thread/${thread.id}`)}
        style={styles.card}
        accessibilityRole="button"
        accessibilityLabel={`${thread.name}. ${meta}. Opens thread.`}>
        {showShading && <View style={[styles.bar, { backgroundColor: warmColor(warmth) }]} />}
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.name}>{thread.name}</Text>
          <Text style={styles.meta} numberOfLines={1}>{meta}</Text>
        </View>
        <Text style={styles.chev} accessibilityElementsHidden importantForAccessibility="no">›</Text>
      </Pressable>

      {thread.next ? (
        loaded ? (
          <View style={[styles.crumb, styles.crumbLoaded]} accessibilityLabel={`${thread.next} is in the log box`}>
            <Text style={[styles.crumbText, styles.loadedText]}>{thread.next}</Text>
            <Text style={styles.loadedHint}>in the log box</Text>
          </View>
        ) : (
          <View style={styles.crumb}>
            <Pressable
              onPress={() => loadNext(thread.id)}
              style={styles.crumbMain}
              accessibilityRole="button"
              accessibilityLabel={`Next step for ${thread.name}: ${thread.next}. Double-tap to load into the log box.`}>
              <Text style={styles.arrow}>↳</Text>
              <Text style={styles.crumbText}>{thread.next}</Text>
              <Text style={styles.logThis}>Log this</Text>
            </Pressable>
            <Pressable onPress={() => router.push(`/thread/${thread.id}`)} style={styles.pen} accessibilityLabel={`Edit next step for ${thread.name}`}>
              <Text style={{ color: C.faint, fontSize: 16 }}>✎</Text>
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
      <Pressable onPress={() => setOpen(true)} style={[styles.crumb, styles.crumbEmpty]} accessibilityRole="button" accessibilityLabel={`Set a next step for ${name}`}>
        <Text style={styles.arrow}>↳</Text>
        <Text style={styles.emptyText}>+ What’s next?</Text>
      </Pressable>
    );
  }
  return (
    <View style={[styles.crumb, styles.crumbEmpty]}>
      <Text style={styles.arrow}>↳</Text>
      <TextInput
        value={value}
        onChangeText={setValue}
        autoFocus={open}
        placeholder={quiet ? '+ What’s next? (optional)' : `What’s next for ${name}?`}
        placeholderTextColor={C.faint}
        style={styles.nextInput}
        returnKeyType="done"
        onSubmitEditing={() => value.trim() && onSet(threadId, value)}
        accessibilityLabel={`Optional next step for ${name}`}
      />
      {value.trim() ? (
        <Pressable onPress={() => onSet(threadId, value)} style={styles.setBtn} accessibilityRole="button">
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Set</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, paddingVertical: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  bar: { width: 4, height: 34, borderRadius: 2 },
  name: { fontSize: 16, fontWeight: '600', color: C.ink },
  meta: { fontSize: 13, color: C.muted },
  chev: { color: C.faint, fontSize: 18 },
  crumb: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingLeft: 14, paddingRight: 4, backgroundColor: C.crumbBg, borderWidth: 1, borderTopWidth: 0, borderColor: C.line, borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
  crumbMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  crumbText: { flex: 1, fontSize: 15, color: C.accentInk },
  arrow: { color: C.dashed, marginRight: 4 },
  logThis: { fontSize: 12, fontWeight: '600', color: C.accent },
  pen: { width: 44, height: 44, marginLeft: 8, alignItems: 'center', justifyContent: 'center' },
  crumbLoaded: { gap: 10, paddingRight: 14 },
  loadedText: { color: C.faint, textDecorationLine: 'line-through' },
  loadedHint: { fontSize: 12, fontWeight: '500', color: C.faint },
  crumbEmpty: { backgroundColor: 'transparent', borderStyle: 'dashed', borderColor: C.dashed, minHeight: 44, gap: 6 },
  emptyText: { fontSize: 14, color: C.muted },
  nextInput: { flex: 1, fontSize: 15, color: C.ink, minHeight: 40 },
  setBtn: { height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
});
