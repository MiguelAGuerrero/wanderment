import { router } from 'expo-router';
import { useDeferredValue, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { decorative } from '@/components/a11y';
import { search, SearchHit } from '@/domain/search';
import { ageLabel } from '@/domain/selectors';
import { rememberSearchQuietly, useStore } from '@/store/useStore';
import { C, s } from '@/theme';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/map'));

/** Search across activities, notes and next steps, grouped by thread. */
export default function Search() {
  const data = useStore((st) => st.data);
  const recent = useStore((st) => st.recentSearches);
  const clearSearches = useStore((st) => st.clearSearches);
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const groups = search(data, deferred);
  const count = groups.reduce((n, g) => n + g.hits.length, 0);

  const open = (path: string) => {
    rememberSearchQuietly(query);
    router.push(path as never);
  };
  const label = (h: SearchHit) => (h.kind === 'next' ? 'Next step' : h.kind === 'note' ? 'In a note' : h.occurredAt ? ageLabel(h.occurredAt) : '');

  return (
    <SafeAreaView style={s.screen}>
      <View style={[s.content, { paddingBottom: 0 }]}>
        <View style={styles.bar}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            autoFocus
            placeholder="Search activities, notes, next steps"
            placeholderTextColor={C.faint}
            returnKeyType="search"
            onSubmitEditing={() => rememberSearchQuietly(query)}
            style={styles.input}
            accessibilityLabel="Search"
          />
          <Pressable onPress={goBack} style={styles.done} accessibilityRole="button">
            <Text style={{ color: C.accent, fontWeight: '600', fontSize: 16 }}>Done</Text>
          </Pressable>
        </View>
      </View>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {!query.trim() && recent.length > 0 && (
          <View style={{ gap: 8 }}>
            <View style={styles.row}>
              <Text style={s.quietLabel}>Recent</Text>
              <Pressable onPress={clearSearches} style={styles.done} accessibilityRole="button" accessibilityLabel="Clear recent searches">
                <Text style={s.meta}>Clear</Text>
              </Pressable>
            </View>
            <View style={styles.chips}>
              {recent.map((r) => (
                <Pressable key={r} onPress={() => setQuery(r)} style={s.chip} accessibilityRole="button">
                  <Text style={s.chipText}>{r}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        {!!query.trim() && (
          <Text style={s.meta} accessibilityLiveRegion="polite">
            {count === 0 ? 'Nothing found.' : `${count} ${count === 1 ? 'result' : 'results'}`}
          </Text>
        )}
        {groups.map((g) => (
          <View key={g.threadId ?? 'none'} style={{ gap: 6 }}>
            {g.threadId ? (
              <Pressable onPress={() => open(`/thread/${g.threadId}`)} style={styles.groupHead} accessibilityRole="button">
                <Text style={s.sectionLabel}>{g.title}</Text>
                <Text style={{ color: C.faint }} {...decorative}>
                  ›
                </Text>
              </Pressable>
            ) : (
              <Text style={[s.quietLabel, styles.groupHead]}>{g.title}</Text>
            )}
            <View style={[s.card, { padding: 0, overflow: 'hidden' }]}>
              {g.hits.map((h, i) => (
                <Pressable
                  key={`${h.kind}-${h.activityId ?? i}`}
                  onPress={() => open(h.activityId ? `/activity/${h.activityId}` : `/thread/${g.threadId}`)}
                  style={[styles.hit, i > 0 && styles.hitBorder]}
                  accessibilityRole="button">
                  <Text style={styles.hitText}>{h.text}</Text>
                  <Text style={s.meta}>{label(h)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: C.line, borderRadius: 22, paddingHorizontal: 16, fontSize: 16, color: C.ink, backgroundColor: C.surface },
  done: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  hit: { padding: 14, paddingVertical: 10, gap: 2, minHeight: 44 },
  hitBorder: { borderTopWidth: 1, borderTopColor: C.lineSoft },
  hitText: { fontSize: 15, color: C.ink },
});
