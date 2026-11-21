import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GraphNode, Neighbourhood } from '@/domain/graph';
import { Id } from '@/domain/types';
import { C, s } from '@/theme';

/** The same neighbourhood as a plain list — for screen readers, or anyone who prefers it. */
export function GraphList({ hood, onPick, attaching }: { hood: Neighbourhood; onPick: (id: Id) => void; attaching?: boolean }) {
  const section = (title: string, nodes: GraphNode[], extra = 0) =>
    nodes.length > 0 && (
      <View style={{ gap: 6 }} key={title}>
        <Text style={s.quietLabel} accessibilityRole="header" aria-level={2}>
          {title}
        </Text>
        <View style={[s.card, { padding: 0, overflow: 'hidden' }]}>
          {nodes.map((n, i) => (
            <Pressable key={`${title}-${n.thread.id}`} onPress={() => onPick(n.thread.id)} style={[styles.row, i > 0 && styles.border]} accessibilityRole="button">
              <Text style={styles.name}>{n.thread.name}</Text>
              <Text style={s.meta}>
                {n.count} {n.count === 1 ? 'link' : 'links'}
                {attaching ? ' · attach here' : ''}
              </Text>
            </Pressable>
          ))}
        </View>
        {extra > 0 && <Text style={s.meta}>and {extra} more</Text>}
      </View>
    );
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.body}>
        <Text style={{ fontWeight: '600' }}>{hood.center.name}</Text> · {hood.steps} steps
        {hood.recentSteps ? `, ${hood.recentSteps} in the last two weeks` : ''}
      </Text>
      {section(`${hood.center.name} flows to`, hood.up)}
      {section(`Flows into ${hood.center.name}`, hood.down)}
      {section('Also flows to the same places', hood.siblings, hood.moreSiblings)}
      {section('Further: where those flow', hood.up2)}
      {section('Further: what feeds those', hood.down2)}
      {!hood.up.length && !hood.down.length && !hood.siblings.length && (
        <Text style={s.meta}>Nothing links here yet. Log something “doing” this thread and → to another, and it’ll show up.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { padding: 14, paddingVertical: 10, minHeight: 44, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  border: { borderTopWidth: 1, borderTopColor: C.lineSoft },
  name: { fontSize: 15, color: C.ink, flex: 1 },
});
