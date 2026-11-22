import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { nextOwner } from '@/domain/model';
import { lastTimeFor } from '@/domain/selectors';
import { Id } from '@/domain/types';
import { holdsData, recentThreadOrder, useStore } from '@/store/useStore';
import { decorative } from '@/components/a11y';
import { useSavedField } from '@/components/useSavedField';
import { C, s } from '@/theme';

const DAY = 864e5;

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

/**
 * Details for one activity: what you did, which threads, when, a note, and the owning thread's
 * next step. Everything saves as you go; Delete can be undone from the toast.
 */
export default function ActivityDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useStore((st) => st.data);
  const updateActivity = useStore((st) => st.updateActivity);
  const removeActivity = useStore((st) => st.removeActivity);
  const setNext = useStore((st) => st.setNext);
  /** While the page doesn't hold the data (P-29) the fields that save as you type are read-only. */
  const holding = useStore(holdsData);
  const a = id ? data.activities[id] : undefined;
  const owner = a ? nextOwner(a) : undefined;
  const ownerThread = owner ? data.threads[owner] : undefined;
  // Both follow edits made elsewhere (another page's, taken in when this one takes the data back).
  const title = useSavedField(a?.text ?? '');
  const text = title.value;
  /** "Today" means the day this screen was opened. */
  const [openedAt] = useState(() => new Date());
  const note = useSavedField(a?.note ?? '');
  const [next, setNextValue] = useState('');
  const [adding, setAdding] = useState<'doing' | 'to'>();

  if (!a) {
    return (
      <SafeAreaView style={[s.screen, s.content]}>
        <Text style={s.body}>This activity was removed.</Text>
        <Pressable onPress={goBack} style={styles.headerBtn} accessibilityRole="button">
          <Text style={styles.done}>Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  /** False when it couldn't be saved yet (reconnecting): the typed step stays. */
  const saveNext = () => {
    if (!owner || !next.trim()) return true;
    if (!setNext(owner, next)) return false;
    setNextValue('');
    return true;
  };
  const close = () => {
    if (saveNext()) goBack();
  };

  // Relative to today, keeping the time of day it happened at.
  const when = new Date(a.occurredAt);
  const dayAt = (daysAgo: number) => {
    const d = new Date(openedAt.getTime() - daysAgo * DAY);
    d.setHours(when.getHours(), when.getMinutes(), when.getSeconds(), 0);
    return d;
  };
  const options: [string, Date][] = [
    ['Today', dayAt(0)],
    ['Yesterday', dayAt(1)],
    ['2 days ago', dayAt(2)],
  ];
  const sameDay = (d: Date) => when.toDateString() === d.toDateString();
  // An older date stays visible (and selected) instead of none of the chips being on.
  if (!options.some(([, d]) => sameDay(d))) options.unshift([when.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), when]);
  const others = { ...data, activities: Object.fromEntries(Object.entries(data.activities).filter(([k]) => k !== a.id)) };
  const prev = lastTimeFor(others, a.doingId, a.toIds[0]);

  const attached = new Set([a.doingId, ...a.toIds]);
  const candidates: Id[] = [...new Set([...recentThreadOrder(data), ...Object.keys(data.threads)])]
    .filter((tid) => data.threads[tid] && !data.threads[tid].hidden && !attached.has(tid))
    .slice(0, 8);

  const pickThread = (tid: Id) => {
    if (adding === 'doing') updateActivity(a.id, { doingId: tid });
    else updateActivity(a.id, { toIds: [...a.toIds, tid] });
    setAdding(undefined);
  };

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={[s.content, { gap: 16 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          {/* While it can't save (P-29), the fields are read-only and this says why. */}
          <Text style={s.meta}>{holding ? 'Saved automatically' : 'Reconnecting…'}</Text>
          <Pressable onPress={close} style={styles.headerBtn} accessibilityRole="button">
            <Text style={styles.done}>Done</Text>
          </Pressable>
        </View>

        <TextInput
          value={text}
          onChangeText={(v) => {
            title.setValue(v);
            if (v.trim()) updateActivity(a.id, { text: v });
          }}
          onFocus={title.onFocus}
          onBlur={() => {
            title.onBlur();
            // Emptied by deleting key by key: put back what it said before this edit.
            if (!text.trim()) {
              title.setValue(title.restore);
              updateActivity(a.id, { text: title.restore });
            }
          }}
          multiline
          editable={holding}
          style={styles.title}
          accessibilityLabel="What you did"
        />

        <View style={styles.row}>
          {a.doingId && data.threads[a.doingId] ? (
            <Pressable
              onPress={() => updateActivity(a.id, { doingId: null })}
              style={[s.chip, styles.doing]}
              accessibilityRole="button"
              accessibilityLabel={`Doing: ${data.threads[a.doingId].name}. Remove`}>
              <Text style={[s.chipText, { color: '#fff' }]}>{data.threads[a.doingId].name} ×</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => setAdding(adding === 'doing' ? undefined : 'doing')} style={[s.chip, s.chipDashed]} accessibilityRole="button" accessibilityState={{ expanded: adding === 'doing' }}>
              <Text style={[s.chipText, { color: C.muted }]}>+ Doing…</Text>
            </Pressable>
          )}
          <Text style={styles.to} {...decorative}>
            → to
          </Text>
          {a.toIds.map((tid) =>
            data.threads[tid] ? (
              <Pressable
                key={tid}
                onPress={() => updateActivity(a.id, { toIds: a.toIds.filter((x) => x !== tid) })}
                style={[s.chip, s.chipAccent]}
                accessibilityRole="button"
                accessibilityLabel={`To: ${data.threads[tid].name}. Remove`}>
                <Text style={[s.chipText, s.chipAccentText]}>{data.threads[tid].name} ×</Text>
              </Pressable>
            ) : null,
          )}
          <Pressable onPress={() => setAdding(adding === 'to' ? undefined : 'to')} style={[s.chip, s.chipDashed]} accessibilityRole="button" accessibilityLabel="Add a thread it was to" accessibilityState={{ expanded: adding === 'to' }}>
            <Text style={[s.chipText, { color: C.muted }]}>+ To…</Text>
          </Pressable>
        </View>

        {adding && (
          <View style={[s.card, { gap: 8 }]}>
            <Text style={s.meta}>{adding === 'doing' ? 'What were you doing?' : 'What was it to?'}</Text>
            <View style={styles.row}>
              {candidates.length === 0 && <Text style={s.meta}>No other threads yet — type @name in the log box to start one.</Text>}
              {candidates.map((tid) => (
                <Pressable key={tid} onPress={() => pickThread(tid)} style={s.chip} accessibilityRole="button" accessibilityLabel={`${adding === 'doing' ? 'Doing' : 'To'} ${data.threads[tid].name}`}>
                  <Text style={s.chipText}>{data.threads[tid].name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={styles.row}>
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
              onSubmitEditing={saveNext}
              onBlur={saveNext}
              editable={holding}
              placeholder={ownerThread.next ?? 'Leave empty if nothing’s next'}
              placeholderTextColor={C.faint}
              style={styles.field}
              accessibilityLabel={`Next step for ${ownerThread.name}`}
            />
          </View>
        )}

        <View style={{ gap: 6 }}>
          <Text style={s.meta}>Note</Text>
          <TextInput
            value={note.value}
            onChangeText={(v) => {
              note.setValue(v);
              updateActivity(a.id, { note: v });
            }}
            onFocus={note.onFocus}
            onBlur={note.onBlur}
            multiline
            editable={holding}
            placeholder="How did it go?"
            placeholderTextColor={C.faint}
            style={[styles.field, { minHeight: 88, textAlignVertical: 'top', paddingTop: 10 }]}
            accessibilityLabel="Note"
          />
        </View>

        <Pressable
          onPress={() => {
            if (removeActivity(a.id)) goBack();
          }}
          style={styles.delete}
          accessibilityRole="button"
          accessibilityLabel="Delete activity (you can undo)">
          <Text style={{ color: C.accentInk, fontSize: 15 }}>Delete activity</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerBtn: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end' },
  done: { color: C.accent, fontWeight: '600', fontSize: 16 },
  title: { fontSize: 19, fontWeight: '500', color: C.ink, borderBottomWidth: 1, borderColor: C.line, paddingVertical: 6, minHeight: 44 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  doing: { backgroundColor: C.ink, borderColor: C.ink },
  to: { fontSize: 13, fontWeight: '600', color: C.accent },
  lastTime: { padding: 12, borderRadius: 12, backgroundColor: C.surface, fontSize: 14, color: C.body },
  field: { minHeight: 44, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, fontSize: 16, backgroundColor: C.surface, color: C.ink },
  delete: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', marginTop: 8 },
});
