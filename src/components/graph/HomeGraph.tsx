import { Link, router } from 'expo-router';
import { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Path, Polygon } from 'react-native-svg';

import { decorative } from '@/components/a11y';
import { BIG_TEXT, GRAPH_H, LaidNode, NARROW_W, Overview, overviewLayout } from '@/domain/overview';
import { Id } from '@/domain/types';
import { useStore } from '@/store/useStore';
import { C, s } from '@/theme';

/** Plain "to it" logs deepen a node's fill in three soft steps (text stays ink: contrast holds). */
const FILL = [C.surface, '#FBF0E8', C.accentTint, '#F0D3BE'];

/** Content width on Home before it's measured: Screen's padding (20 each side) inside its 640 cap. */
const estimate = (windowWidth: number) => Math.min(windowWidth, 640) - 40;

/**
 * Narrow content (200 % zoom) or the largest native text: the graph is just its summary, with its
 * own "Open graph" link. Otherwise Home's header carries that link (`OpenGraphIcon`), which keeps
 * the first card and its crumb clear of the toast.
 */
export function useGraphNarrow() {
  const { width, fontScale } = useWindowDimensions();
  return estimate(width) < NARROW_W || fontScale >= BIG_TEXT;
}

/** The header's way to the Graph tab while the picture shows (keyboard and screen readers too). */
export function OpenGraphIcon({ style }: { style: object }) {
  return (
    <Link href="/graph" asChild>
      <Pressable accessibilityRole="link" accessibilityLabel="Open graph" style={style}>
        <Text style={{ fontSize: 22, lineHeight: 26, color: C.muted }} {...decorative}>
          ⋔
        </Text>
      </Pressable>
    </Link>
  );
}

/**
 * The live graph at the top of Home: whys and what feeds them, or (with no whys) your most active
 * threads. One accessible element: an image labelled with the summary in names. Nodes are pointer
 * shortcuts to their thread, hidden from assistive tech and the tab order (the cards below and
 * "Open graph" are the way through). Narrow screens and the largest text get the summary and an
 * "Open graph" link instead.
 */
export function HomeGraph({ ov }: { ov: Overview; /** Reserved for focusing a node (P-26). */ focusId?: Id }) {
  const { width: windowWidth, fontScale } = useWindowDimensions();
  const narrow = useGraphNarrow();
  const [measured, setMeasured] = useState<number>();
  const showShading = useStore((st) => st.showShading);
  const width = measured ?? estimate(windowWidth);
  const onLayout = (e: LayoutChangeEvent) => setMeasured(e.nativeEvent.layout.width);
  const layout = overviewLayout(ov, width, fontScale);

  return (
    <View onLayout={onLayout} testID="home-graph" style={{ gap: 4 }}>
      {layout.summaryOnly || narrow ? (
        <Text style={s.body} testID="home-graph-summary">
          {ov.summary}
        </Text>
      ) : (
        <View accessible accessibilityRole="image" accessibilityLabel={ov.summary} style={{ height: GRAPH_H }} testID="home-graph-picture">
          <Svg width={width} height={GRAPH_H} style={StyleSheet.absoluteFill} pointerEvents="none" {...decorative}>
            {layout.links.map((l) => (
              <Path key={l.key} testID={`graph-link-${l.from}-${l.to}`} d={l.path} stroke={C.accent} strokeOpacity={0.45} strokeWidth={l.width} fill="none" />
            ))}
            {layout.links.map((l) => (l.arrow ? <Polygon key={`${l.key}>`} points={l.arrow} fill={C.accent} fillOpacity={0.6} /> : null))}
          </Svg>
          <View style={StyleSheet.absoluteFill} {...decorative}>
            {layout.nodes.map((n) => (
              <Node key={n.key} node={n} shading={showShading} />
            ))}
            {layout.more.map((m) => (
              <View key={m.key} style={[styles.more, { left: m.x, top: m.y, width: m.w, height: m.h }]}>
                <Text style={styles.moreText}>{m.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      {narrow && (
        <Link href="/graph" asChild>
          <Pressable accessibilityRole="link" style={styles.open}>
            <Text style={styles.openText}>Open graph</Text>
          </Pressable>
        </Link>
      )}
    </View>
  );
}

function Node({ node: n, shading }: { node: LaidNode; shading: boolean }) {
  const why = n.kind === 'why';
  return (
    <Pressable
      onPress={() => router.push(`/thread/${n.id}`)}
      focusable={false}
      tabIndex={-1}
      testID={`graph-node-${n.id}`}
      {...({ dataSet: { fill: String(n.fill), kind: n.kind, ...(n.under && { under: n.under }) } } as object)}
      style={[styles.hit, { left: n.x, top: n.y, width: n.w, height: n.h }]}>
      <View
        style={[
          styles.node,
          why && styles.why,
          { backgroundColor: FILL[n.fill], borderColor: shading && n.recent ? C.accent : why ? C.dashed : C.line },
          why && { height: n.h },
        ]}>
        <Text style={[styles.text, why && styles.whyText]} numberOfLines={why ? 2 : 1}>
          {n.name}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { position: 'absolute', justifyContent: 'center' },
  node: { height: 36, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  why: { borderWidth: 1.5, borderRadius: 14 },
  text: { fontSize: 13, lineHeight: 16, fontWeight: '500', color: C.ink, textAlign: 'center' },
  whyText: { fontWeight: '600', color: C.accentInk },
  more: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  moreText: { fontSize: 12, fontWeight: '600', color: C.muted },
  open: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-end', paddingHorizontal: 4 },
  openText: { color: C.accent, fontSize: 14, fontWeight: '500' },
});
