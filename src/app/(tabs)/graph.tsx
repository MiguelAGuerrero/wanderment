import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { decorative } from '@/components/a11y';
import { AttachCard, attachSuggestions } from '@/components/graph/AttachCard';
import { GraphCanvas } from '@/components/graph/GraphCanvas';
import { GraphList } from '@/components/graph/GraphList';
import { Screen } from '@/components/Screen';
import { valueThreads } from '@/domain/emergence';
import { buildFlowIndex, looseActivities, neighbourhood } from '@/domain/graph';
import { homeThreads } from '@/domain/selectors';
import { Id } from '@/domain/types';
import { useStore } from '@/store/useStore';
import { C, s } from '@/theme';

/**
 * Where activity flows: a centre thread, what it flows to above, what feeds it below,
 * siblings at the sides. Tap to re-centre. Attach mode works through unattached activities.
 */
export default function Graph() {
  const data = useStore((st) => st.data);
  const attach = useStore((st) => st.attach);
  const leftAsIs = useStore((st) => st.leftAsIs);
  const leaveAsIs = useStore((st) => st.leaveAsIs);
  const index = useMemo(() => buildFlowIndex(data), [data]);

  // Opens on the top value (the thread most activity flows toward), else the most recent thread.
  const start = useMemo(() => {
    const values = [...valueThreads(data)];
    if (values.length) return values.sort((a, b) => (index.steps.get(b) ?? 0) - (index.steps.get(a) ?? 0))[0];
    const { current, earlier } = homeThreads(data);
    return (current[0] ?? earlier[0])?.thread.id;
  }, [data, index]);

  const [path, setPath] = useState<Id[]>([]);
  const [depth, setDepth] = useState<1 | 2>(1);
  const [view, setView] = useState<'graph' | 'list'>('graph');
  const [attaching, setAttaching] = useState(false);
  const [skipped, setSkipped] = useState<Set<Id>>(new Set());

  // Screen-reader users on iOS/Android start in the list. (Browsers can't tell.)
  useEffect(() => {
    if (Platform.OS !== 'web') AccessibilityInfo.isScreenReaderEnabled().then((on) => on && setView('list')).catch(() => {});
  }, []);

  const valid = path.filter((id) => data.threads[id] && !data.threads[id].hidden);
  const centerId = valid[valid.length - 1] ?? start;
  const hood = centerId ? neighbourhood(data, index, centerId, depth) : undefined;

  const loose = looseActivities(data, new Set([...leftAsIs, ...skipped]));
  const current = attaching ? loose[0] : undefined;
  const suggested = new Set(current ? attachSuggestions(data, current).slice(0, 1) : []);

  const recenter = (id: Id) => {
    if (id === centerId) return;
    const base = valid.length ? valid : centerId ? [centerId] : [];
    // Going back to somewhere already on the path cuts it there, so cycles don't grow it forever.
    const at = base.indexOf(id);
    setPath(at >= 0 ? base.slice(0, at + 1) : [...base, id].slice(-6));
  };
  const pick = (id: Id) => {
    // Attach mode holds the graph still: a tap attaches instead of re-centring.
    if (attaching && current) attach(current.id, id);
    else recenter(id);
  };

  if (!hood) {
    return (
      <Screen>
        <Text style={s.h1} accessibilityRole="header">
          Graph
        </Text>
        <View style={[s.card, { gap: 8 }]}>
          <Text style={s.body}>This fills in once you’ve logged for a while. It shows where your activity flows — what feeds what — starting from the thing most of it flows toward.</Text>
          <Text style={s.meta}>Start a thread by typing @name in the log box.</Text>
        </View>
      </Screen>
    );
  }

  const trail = valid.length ? valid : [hood.center.id];

  return (
    <Screen
      composer={!attaching}
      footer={
        attaching ? (
          <AttachCard
            activity={current}
            remaining={loose.length}
            onAttach={(id) => current && attach(current.id, id)}
            onLeave={() => current && leaveAsIs(current.id)}
            onSkip={() => current && setSkipped((sk) => new Set(sk).add(current.id))}
            onDone={() => {
              setAttaching(false);
              setSkipped(new Set());
            }}
          />
        ) : undefined
      }>
      <View style={styles.header}>
        <Text style={s.h1} accessibilityRole="header">
          Graph
        </Text>
        <View style={styles.segment} accessibilityRole="tablist">
          {(['graph', 'list'] as const).map((v) => (
            <Pressable
              key={v}
              onPress={() => setView(v)}
              style={[styles.seg, view === v && styles.segOn]}
              accessibilityRole="tab"
              accessibilityState={{ selected: view === v }}
              accessibilityLabel={v === 'graph' ? 'Graph view' : 'List view'}>
              <Text style={[styles.segText, view === v && { color: '#fff' }]}>{v === 'graph' ? 'Graph' : 'List'}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {trail.length > 1 && (
        <View style={styles.trail} accessibilityRole="toolbar" aria-label="Path">
          {trail.map((id, i) => (
            <View key={`${id}-${i}`} style={styles.trailItem}>
              {i > 0 && (
                <Text style={s.meta} {...decorative}>
                  ›
                </Text>
              )}
              <Pressable onPress={() => setPath(trail.slice(0, i + 1))} style={styles.crumb} accessibilityRole="button" accessibilityState={{ selected: i === trail.length - 1 }}>
                <Text style={[s.meta, i === trail.length - 1 && { color: C.ink, fontWeight: '600' }]}>{data.threads[id].name}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View style={styles.controls}>
        <Pressable onPress={() => setDepth(depth === 1 ? 2 : 1)} style={s.chip} role="switch" aria-checked={depth === 2} accessibilityState={{ checked: depth === 2 }} accessibilityLabel="Show two steps out">
          <Text style={s.chipText}>Two steps out: {depth === 2 ? 'on' : 'off'}</Text>
        </Pressable>
        {!attaching && loose.length > 0 && (
          <Pressable
            onPress={() => {
              // Pin the current centre so attaching (which changes recency) can't move the graph.
              setPath(trail);
              setAttaching(true);
            }}
            style={[s.chip, s.chipAccent]}
            accessibilityRole="button">
            <Text style={[s.chipText, s.chipAccentText]}>Attach loose ({loose.length})</Text>
          </Pressable>
        )}
      </View>

      {view === 'graph' ? (
        <>
          <Text style={[s.meta, { textAlign: 'center' }]}>↑ flows to</Text>
          <GraphCanvas
            hood={hood}
            depth={depth}
            onPick={pick}
            onCenter={() => (attaching && current ? attach(current.id, hood.center.id) : router.push(`/thread/${hood.center.id}`))}
            onMore={() => setView('list')}
            highlight={attaching && current ? { all: true, suggested } : undefined}
          />
          <Text style={[s.meta, { textAlign: 'center' }]}>↑ flows in</Text>
        </>
      ) : (
        <GraphList hood={hood} onPick={pick} attaching={attaching && !!current} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  segment: { flexDirection: 'row', borderRadius: 22, borderWidth: 1, borderColor: C.line, overflow: 'hidden' },
  seg: { minHeight: 44, minWidth: 64, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface },
  segOn: { backgroundColor: C.ink },
  segText: { fontSize: 14, fontWeight: '500', color: C.ink },
  trail: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  trailItem: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  crumb: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
