import { Pressable, StyleSheet, Text, View } from 'react-native';

import { suggestDoing } from '@/domain/compose';
import { ageLabel } from '@/domain/selectors';
import { Activity, Id } from '@/domain/types';
import { recentThreadOrder, useStore } from '@/store/useStore';
import { C, s } from '@/theme';

/** Chips offered for an activity: a word-based suggestion first, then recent threads. */
export function attachSuggestions(data: ReturnType<typeof useStore.getState>['data'], a: Activity): Id[] {
  const guess = suggestDoing(data, a.text)?.id;
  return [...new Set([guess, ...recentThreadOrder(data)].filter((id): id is Id => !!id && !!data.threads[id] && !data.threads[id].hidden))].slice(0, 4);
}

/** Attach mode's bottom card: one unattached activity at a time. Tapping is the only way to attach. */
export function AttachCard({
  activity,
  remaining,
  onAttach,
  onLeave,
  onSkip,
  onDone,
}: {
  activity?: Activity;
  remaining: number;
  onAttach: (threadId: Id) => void;
  onLeave: () => void;
  onSkip: () => void;
  onDone: () => void;
}) {
  const data = useStore((st) => st.data);
  if (!activity) {
    return (
      <View style={styles.card}>
        <Text style={s.body}>Nothing left to attach.</Text>
        <Pressable onPress={onDone} style={s.primaryBtn} accessibilityRole="button">
          <Text style={s.primaryBtnText}>Done</Text>
        </Pressable>
      </View>
    );
  }
  const chips = attachSuggestions(data, activity);
  return (
    <View style={styles.card} accessibilityLabel="Attach mode">
      <View style={styles.head}>
        <Text style={s.meta}>
          {remaining} without a thread · {ageLabel(activity.occurredAt)}
        </Text>
        <Pressable onPress={onDone} style={styles.small} accessibilityRole="button" accessibilityLabel="Done attaching">
          <Text style={{ color: C.accent, fontWeight: '600', fontSize: 15 }}>Done</Text>
        </Pressable>
      </View>
      <Text style={styles.text}>{activity.text}</Text>
      <Text style={s.meta}>Tap a highlighted thread above, or:</Text>
      <View style={styles.chips}>
        {chips.map((id) => (
          <Pressable key={id} onPress={() => onAttach(id)} style={[s.chip, s.chipAccent]} accessibilityRole="button" accessibilityLabel={`→ to ${data.threads[id].name}: attach`}>
            <Text style={[s.chipText, s.chipAccentText]}>→ to {data.threads[id].name}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.chips}>
        <Pressable onPress={onLeave} style={s.chip} accessibilityRole="button">
          <Text style={s.chipText}>Leave as is</Text>
        </Pressable>
        <Pressable onPress={onSkip} style={s.chip} accessibilityRole="button">
          <Text style={s.chipText}>Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { margin: 12, padding: 14, gap: 10, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  small: { minHeight: 44, justifyContent: 'center' },
  text: { fontSize: 17, fontWeight: '500', color: C.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
