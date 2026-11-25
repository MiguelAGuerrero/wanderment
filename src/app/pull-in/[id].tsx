import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { decorative } from '@/components/a11y';
import { candidatesForThread, pullInRole } from '@/domain/emergence';
import { OLD_HOME } from '@/domain/home';
import { ageLabel } from '@/domain/selectors';
import { Id } from '@/domain/types';
import { useStore } from '@/store/useStore';
import { C, s } from '@/theme';

const goBack = () => (router.canGoBack() ? router.back() : router.replace(OLD_HOME));

/**
 * After naming a thread: earlier activities that mention it, to pull in with one tap.
 * Nothing is pre-selected; one Undo reverts the whole batch.
 */
export default function PullIn() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useStore((st) => st.data);
  const pullIn = useStore((st) => st.pullIn);
  const setPullInOffer = useStore((st) => st.setPullInOffer);
  const thread = id ? data.threads[id] : undefined;
  // Computed once, so rows don't vanish as they're attached elsewhere meanwhile.
  const [candidates] = useState(() => (thread ? candidatesForThread(data, thread.name, thread.id) : []));
  const [picked, setPicked] = useState<Set<Id>>(new Set());
  const all = useMemo(() => candidates.map((a) => a.id), [candidates]);

  if (!thread) {
    return (
      <SafeAreaView style={[s.screen, s.content]}>
        <Text style={s.body}>This wander doesn’t exist anymore.</Text>
      </SafeAreaView>
    );
  }

  const toggle = (aid: Id) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(aid)) n.delete(aid);
      else n.add(aid);
      return n;
    });
  const allPicked = picked.size === all.length && all.length > 0;

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={[s.content, { gap: 14 }]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              setPullInOffer(undefined);
              goBack();
            }}
            style={styles.headerBtn}
            accessibilityRole="button">
            <Text style={{ color: C.accent, fontSize: 16 }}>Not now</Text>
          </Pressable>
        </View>
        <Text style={s.h1} accessibilityRole="header">
          Pull into {thread.name}?
        </Text>
        <Text style={s.body}>
          {candidates.length
            ? `${candidates.length === 1 ? 'This earlier activity mentions' : 'These earlier activities mention'} it. Pick any that belong — or none.`
            : 'Nothing earlier mentions it. Things you log to it from now on will gather here.'}
        </Text>

        {candidates.length > 1 && (
          <Pressable
            onPress={() => setPicked(allPicked ? new Set() : new Set(all))}
            style={[s.chip, { alignSelf: 'flex-start' }]}
            accessibilityRole="button">
            <Text style={s.chipText}>{allPicked ? 'Clear all' : 'Select all'}</Text>
          </Pressable>
        )}

        {candidates.length > 0 && (
          <View style={[s.card, { padding: 0, overflow: 'hidden' }]}>
            {candidates.map((a, i) => {
              const on = picked.has(a.id);
              return (
                <Pressable
                  key={a.id}
                  onPress={() => toggle(a.id)}
                  style={[styles.row, i > 0 && styles.rowBorder]}
                  role="checkbox"
                  aria-checked={on}>
                  <View style={[styles.box, on && styles.boxOn]} {...decorative}>
                    {on && <Text style={styles.tick}>✓</Text>}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.text}>{a.text}</Text>
                    <Text style={s.meta}>
                      {ageLabel(a.occurredAt)} · {pullInRole(a) === 'doing' ? `as ${thread.name}` : `→ to ${thread.name}`}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {candidates.length > 0 ? (
          <Pressable
            onPress={() => {
              if (pullIn(thread.id, [...picked])) goBack();
            }}
            disabled={!picked.size}
            style={[s.primaryBtn, !picked.size && { opacity: 0.4 }]}
            accessibilityRole="button">
            <Text style={s.primaryBtnText}>{picked.size ? `Attach ${picked.size}` : 'Attach'}</Text>
          </Pressable>
        ) : (
          <Pressable onPress={goBack} style={s.primaryBtn} accessibilityRole="button">
            <Text style={s.primaryBtnText}>Done</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'flex-end' },
  headerBtn: { minHeight: 44, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 56 },
  rowBorder: { borderTopWidth: 1, borderTopColor: C.lineSoft },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: C.faint, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: C.accent, borderColor: C.accent },
  tick: { color: '#fff', fontSize: 14, fontWeight: '700' },
  text: { fontSize: 15, fontWeight: '500', color: C.ink },
});
