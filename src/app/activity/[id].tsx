import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { describeLink, lastTimeFor } from '@/domain/selectors';
import { nextOwner } from '@/domain/model';
import { useStore } from '@/store/useStore';
import { C, s } from '@/theme';

const DAY = 864e5;

/** Details for one activity: when it happened, a note, and the owning thread's next step. */
export default function ActivityDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useStore((st) => st.data);
  const updateActivity = useStore((st) => st.updateActivity);
  const setNext = useStore((st) => st.setNext);
  const a = id ? data.activities[id] : undefined;
  const owner = a ? nextOwner(a) : undefined;
  const ownerThread = owner ? data.threads[owner] : undefined;
  const [note, setNote] = useState(a?.note ?? '');
  const [next, setNextValue] = useState('');

  const close = () => {
    if (a) {
      updateActivity(a.id, { note: note.trim() || undefined });
      if (owner && next.trim()) setNext(owner, next);
    }
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  if (!a) {
    return (
      <SafeAreaView style={[s.screen, s.content]}>
        <Text style={s.body}>This activity was removed.</Text>
      </SafeAreaView>
    );
  }

  const created = new Date(a.createdAt);
  const options: [string, Date][] = [
    ['Today', created],
    ['Yesterday', new Date(created.getTime() - DAY)],
    ['2 days ago', new Date(created.getTime() - 2 * DAY)],
  ];
  const sameDay = (d: Date) => new Date(a.occurredAt).toDateString() === d.toDateString();
  const prev = lastTimeFor({ ...data, activities: Object.fromEntries(Object.entries(data.activities).filter(([k]) => k !== a.id)) }, a.doingId, a.toIds[0]);

  return (
    <SafeAreaView style={[s.screen]}>
      <View style={[s.content, { gap: 16 }]}>
        <View style={styles.header}>
          <Text style={s.meta}>Saved automatically</Text>
          <Pressable onPress={close} style={{ minHeight: 44, justifyContent: 'center' }} accessibilityRole="button">
            <Text style={{ color: C.accent, fontWeight: '600', fontSize: 16 }}>Done</Text>
          </Pressable>
        </View>
        <Text style={{ fontSize: 19, fontWeight: '500', color: C.ink }}>{a.text}</Text>
        <Text style={s.meta}>{describeLink(data, a) ?? 'Not attached to a thread — you can attach it from Activities.'}</Text>

        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Text style={s.meta}>When</Text>
          {options.map(([label, d]) => (
            <Pressable
              key={label}
              onPress={() => updateActivity(a.id, { occurredAt: d.toISOString() })}
              style={[s.chip, sameDay(d) && { backgroundColor: C.ink, borderColor: C.ink }]}
              accessibilityRole="button"
              accessibilityState={{ selected: sameDay(d) }}>
              <Text style={[s.chipText, sameDay(d) && { color: '#fff' }]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {prev && (
          <Text style={styles.lastTime}>
            <Text style={{ color: C.muted }}>Last time: </Text>
            {prev.text}
          </Text>
        )}

        {ownerThread && (
          <View style={{ gap: 6 }}>
            <Text style={s.meta}>
              Next for {ownerThread.name} <Text style={{ fontWeight: '400' }}>(optional)</Text>
            </Text>
            <TextInput
              value={next}
              onChangeText={setNextValue}
              placeholder={ownerThread.next ?? 'Leave empty if nothing’s next'}
              placeholderTextColor={C.faint}
              style={styles.field}
              accessibilityLabel={`Next step for ${ownerThread.name}`}
            />
          </View>
        )}

        <View style={{ gap: 6 }}>
          <Text style={s.meta}>Note</Text>
          <TextInput value={note} onChangeText={setNote} multiline placeholder="How did it go?" placeholderTextColor={C.faint} style={[styles.field, { minHeight: 88, textAlignVertical: 'top', paddingTop: 10 }]} accessibilityLabel="Note" />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastTime: { padding: 12, borderRadius: 12, backgroundColor: C.surface, fontSize: 14, color: C.body },
  field: { minHeight: 44, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, fontSize: 16, backgroundColor: C.surface, color: C.ink },
});
