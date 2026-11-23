import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { suggestDoing } from '@/domain/compose';
import { ageLabel, describeLink, sortedActivities } from '@/domain/selectors';
import { Activity, Data, Id } from '@/domain/types';
import { recentThreadOrder, useStore } from '@/store/useStore';
import { C, s } from '@/theme';

/** The Activities section of Home's sheet (P-58; the Activities tab before): everything logged, newest first. */
export function ActivitiesSection() {
  const data = useStore((st) => st.data);
  const [onlyLoose, setOnlyLoose] = useState(false);
  /** Long histories render in pages, so logging stays instant with thousands of entries. */
  const [shown, setShown] = useState(PAGE);
  const all = useMemo(() => sortedActivities(data), [data]);
  const list = onlyLoose ? all.filter((a) => !a.doingId && a.toIds.length === 0) : all;
  // Worked out once per change, not once per row.
  const recent = useMemo(() => [...new Set([...recentThreadOrder(data), ...Object.keys(data.threads)])].slice(0, 8), [data]);

  return (
    <Screen edges={['bottom']}>
      <Text style={s.h1}>Activities</Text>
      <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="tablist">
        {[
          ['All', false],
          ['No wander', true],
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
      {list.length === 0 && <Text style={s.meta}>{onlyLoose ? 'Everything has a wander.' : 'Nothing logged yet.'}</Text>}
      <View style={[s.card, { padding: 0, overflow: 'hidden' }]}>
        {list.slice(0, shown).map((a, i) => (
          <Row key={a.id} a={a} first={i === 0} data={data} recent={recent} />
        ))}
      </View>
      {list.length > shown && (
        <Pressable onPress={() => setShown((n) => n + PAGE)} style={[s.chip, { alignSelf: 'center' }]} accessibilityRole="button">
          <Text style={s.chipText}>Show {Math.min(PAGE, list.length - shown)} more</Text>
        </Pressable>
      )}
    </Screen>
  );
}

const PAGE = 100;

function Row({ a, first, data, recent }: { a: Activity; first: boolean; data: Data; recent: Id[] }) {
  const attach = useStore((st) => st.attach);
  const [picking, setPicking] = useState(false);
  const link = describeLink(data, a);
  const suggestion = !link ? suggestDoing(data, a.text) : undefined;

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
          <Text style={s.meta}>No wander{suggestion ? ' · maybe:' : ''}</Text>
          {suggestion && (
            <Pressable onPress={() => attach(a.id, suggestion.id)} style={styles.hit} accessibilityRole="button" accessibilityLabel={`+ ${suggestion.name}: attach to ${suggestion.name}`}>
              <View style={[styles.small, styles.dashed]}>
                <Text style={{ color: C.accentInk, fontSize: 13, fontWeight: '500' }}>+ {suggestion.name}</Text>
              </View>
            </Pressable>
          )}
          <Pressable onPress={() => setPicking((p) => !p)} style={styles.hit} accessibilityRole="button" accessibilityState={{ expanded: picking }}>
            <View style={styles.small}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: C.ink }}>Attach…</Text>
            </View>
          </Pressable>
        </View>
      )}
      {picking && !link && (
        <View style={styles.chips}>
          {recent.length === 0 && <Text style={s.meta}>No wanders yet — type @name in the log box to start one.</Text>}
          {recent.map((id) =>
            data.threads[id] ? (
              <Pressable key={id} onPress={() => attach(a.id, id)} style={styles.hit} accessibilityRole="button" accessibilityLabel={`${data.threads[id].name}: attach`}>
                <View style={styles.small}>
                  <Text style={{ fontSize: 13, color: C.ink }}>{data.threads[id].name}</Text>
                </View>
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
  hit: { minHeight: 44, justifyContent: 'center' },
  small: { minHeight: 32, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, justifyContent: 'center' },
  dashed: { borderStyle: 'dashed', borderColor: C.accent, backgroundColor: 'transparent' },
});
