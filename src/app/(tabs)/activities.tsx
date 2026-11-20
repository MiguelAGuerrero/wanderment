import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { suggestDoing } from '@/domain/compose';
import { ageLabel, describeLink, sortedActivities } from '@/domain/selectors';
import { Activity, Id } from '@/domain/types';
import { recentThreadOrder, useStore } from '@/store/useStore';
import { C, s } from '@/theme';

export default function Activities() {
  const data = useStore((st) => st.data);
  const [onlyLoose, setOnlyLoose] = useState(false);
  const all = sortedActivities(data);
  const list = onlyLoose ? all.filter((a) => !a.doingId && a.toIds.length === 0) : all;

  return (
    <Screen>
      <Text style={s.h1}>Activities</Text>
      <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="tablist">
        {[
          ['All', false],
          ['No thread', true],
        ].map(([label, val]) => (
          <Pressable
            key={String(label)}
            onPress={() => setOnlyLoose(val as boolean)}
            style={[s.chip, onlyLoose === val && { backgroundColor: C.ink, borderColor: C.ink }]}
            accessibilityRole="tab"
            accessibilityState={{ selected: onlyLoose === val }}>
            <Text style={[s.chipText, onlyLoose === val && { color: '#fff' }]}>{label as string}</Text>
          </Pressable>
        ))}
      </View>
      {list.length === 0 && <Text style={s.meta}>{onlyLoose ? 'Everything has a thread.' : 'Nothing logged yet.'}</Text>}
      <View style={[s.card, { padding: 0, overflow: 'hidden' }]}>
        {list.map((a, i) => (
          <Row key={a.id} a={a} first={i === 0} />
        ))}
      </View>
    </Screen>
  );
}

function Row({ a, first }: { a: Activity; first: boolean }) {
  const data = useStore((st) => st.data);
  const attach = useStore((st) => st.attach);
  const [picking, setPicking] = useState(false);
  const link = describeLink(data, a);
  const suggestion = !link ? suggestDoing(data, a.text) : undefined;
  const recent: Id[] = recentThreadOrder(data).concat(Object.keys(data.threads)).filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 8);

  return (
    <View style={[styles.row, !first && styles.rowBorder]}>
      <Link href={`/activity/${a.id}`} asChild>
        <Pressable style={styles.rowTop} accessibilityRole="button">
          <Text style={styles.text}>{a.text}</Text>
          <Text style={s.meta}>{ageLabel(a.occurredAt)}</Text>
        </Pressable>
      </Link>
      {link ? (
        <Text style={s.meta}>{link}</Text>
      ) : (
        <View style={styles.chips}>
          <Text style={s.meta}>No thread{suggestion ? ' · maybe:' : ''}</Text>
          {suggestion && (
            <Pressable onPress={() => attach(a.id, suggestion.id)} style={[styles.small, styles.dashed]} accessibilityLabel={`Attach to ${suggestion.name}`}>
              <Text style={{ color: C.accentInk, fontSize: 13, fontWeight: '500' }}>+ {suggestion.name}</Text>
            </Pressable>
          )}
          <Pressable onPress={() => setPicking((p) => !p)} style={styles.small} accessibilityRole="button" accessibilityState={{ expanded: picking }}>
            <Text style={{ fontSize: 13, fontWeight: '500', color: C.ink }}>Attach…</Text>
          </Pressable>
        </View>
      )}
      {picking && !link && (
        <View style={styles.chips}>
          {recent.length === 0 && <Text style={s.meta}>No threads yet — type @name in the log box to start one.</Text>}
          {recent.map((id) =>
            data.threads[id] ? (
              <Pressable key={id} onPress={() => attach(a.id, id)} style={styles.small} accessibilityLabel={`Attach to ${data.threads[id].name}`}>
                <Text style={{ fontSize: 13, color: C.ink }}>{data.threads[id].name}</Text>
              </Pressable>
            ) : null,
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { padding: 14, paddingVertical: 12, gap: 6 },
  rowBorder: { borderTopWidth: 1, borderTopColor: C.lineSoft },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  text: { flex: 1, fontSize: 15, fontWeight: '500', color: C.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  small: { height: 32, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, justifyContent: 'center' },
  dashed: { borderStyle: 'dashed', borderColor: C.accent, backgroundColor: 'transparent' },
});
