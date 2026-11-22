import { Link, router } from 'expo-router';
import { memo, ReactNode, useDeferredValue, useMemo, useState } from 'react';
import { LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Line, Path, Polygon } from 'react-native-svg';

import { decorative } from '@/components/a11y';
import { BIG_TEXT, LaidDot, LaidDotLine, LaidLink, LaidNode, NARROW_W, overview, Overview, overviewLayout, OverviewLayout } from '@/domain/overview';
import { Data, Id } from '@/domain/types';
import { C, s } from '@/theme';

/** Content width on Home before it's measured: Screen's padding (20 each side) inside its 640 cap. */
const estimate = (windowWidth: number) => Math.min(windowWidth, 640) - 40;

/**
 * Narrow content (three columns don't fit, e.g. 200 % zoom) or the largest native text: the graph is
 * just its summary, with its own "Open graph" link. Otherwise Home's header carries that link
 * (`OpenGraphIcon`), which keeps the first card and its crumb clear of the toast.
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

/** A mouse press doesn't focus a pointer shortcut (it's hidden from assistive tech). */
const noFocus = Platform.OS === 'web' ? ({ onMouseDown: (e: { preventDefault(): void }) => e.preventDefault() } as object) : {};

/** A pointer shortcut inside the picture: not focusable, not exposed (the cards and "Open graph" are the way through). */
function Shortcut({ onPress, testID, data, style, children }: { onPress: () => void; testID: string; data?: Record<string, string>; style: object; children: ReactNode }) {
  return (
    <Pressable onPress={onPress} focusable={false} tabIndex={-1} testID={testID} {...noFocus} {...(data && ({ dataSet: data } as object))} style={style}>
      {children}
    </Pressable>
  );
}

/**
 * Home's graph, worked out from the data a moment after it changes (`useDeferredValue`): a log's
 * own update (the toast, the list) never waits for the picture, which follows on the next render.
 * `surfacing` is the earned whys in Home's header order.
 */
export const LiveGraph = memo(function LiveGraph({ data, surfacing }: { data: Data; surfacing: Id[] }) {
  const d = useDeferredValue(data);
  const sf = useDeferredValue(surfacing);
  const ov = useMemo(() => overview(d, sf), [d, sf]);
  return ov ? <HomeGraph ov={ov} /> : null;
});

/**
 * The live graph at the top of Home: whys and what feeds them, or (with no whys) your most active
 * threads, plus your latest logs as dots. One accessible element: an image labelled with the summary
 * in names; activating it does nothing (its centre is never a target). Nodes, dots and "and more →"
 * are pointer shortcuts. A thread or dot that stays keeps its place: the last layout's slots are
 * passed back in. Narrow screens and the largest text get the summary and an "Open graph" link.
 */
export function HomeGraph({ ov }: { ov: Overview; /** Reserved for focusing a node (P-26). */ focusId?: Id }) {
  const { width: windowWidth, fontScale } = useWindowDimensions();
  const narrow = useGraphNarrow();
  const [measured, setMeasured] = useState<number>();
  const width = measured ?? estimate(windowWidth);
  const onLayout = (e: LayoutChangeEvent) => setMeasured(e.nativeEvent.layout.width);
  // Laid out again only when something changes, from where things were last time (kept while Home
  // is mounted, never stored): React's "adjust state while rendering" pattern.
  const [laid, setLaid] = useState<{ ov: Overview; width: number; fontScale: number; layout: OverviewLayout }>();
  let layout = laid?.layout;
  if (!laid || laid.ov !== ov || laid.width !== width || laid.fontScale !== fontScale) {
    layout = overviewLayout(ov, width, { fontScale, prev: laid?.layout.slots });
    setLaid({ ov, width, fontScale, layout });
  }
  if (!layout) return null;

  return (
    <View onLayout={onLayout} testID="home-graph" style={{ gap: 4 }}>
      {layout.summaryOnly || narrow ? (
        <Text style={s.body} numberOfLines={3} testID="home-graph-summary">
          {ov.summary}
        </Text>
      ) : (
        <View accessible accessibilityRole="image" accessibilityLabel={ov.summary} onAccessibilityTap={() => {}} style={{ height: layout.height }} testID="home-graph-picture">
          <Svg width={width} height={layout.height} style={StyleSheet.absoluteFill} pointerEvents="none" {...decorative}>
            {layout.dotLines.map((l) => (
              <DotLine key={l.key} line={l} />
            ))}
            {layout.links.map((l) => (
              <LinkLine key={l.key} link={l} />
            ))}
          </Svg>
          <View style={StyleSheet.absoluteFill} {...decorative}>
            {layout.nodes.map((n) => (
              <Node key={n.key} node={n} />
            ))}
            {layout.dots.map((d) => (
              <Dot key={d.key} dot={d} />
            ))}
            {layout.more && (
              <Shortcut
                onPress={() => router.navigate('/graph')}
                testID="graph-more"
                style={[styles.hit, styles.center, { left: layout.more.x, top: layout.more.y, width: layout.more.w, height: layout.more.h }]}>
                <Text style={styles.moreText}>and more →</Text>
              </Shortcut>
            )}
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

// Memoised by value: a log re-renders only the dot and lines it adds (Home must not get slower).
const DotLine = memo(
  function DotLine({ line: l }: { line: LaidDotLine }) {
    return <Line testID={`graph-dotline-${l.dot}-${l.thread}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={C.faint} strokeWidth={1} />;
  },
  ({ line: a }, { line: b }) => a.key === b.key && a.x1 === b.x1 && a.y1 === b.y1 && a.x2 === b.x2 && a.y2 === b.y2,
);

const LinkLine = memo(
  function LinkLine({ link: l }: { link: LaidLink }) {
    return (
      <>
        <Path testID={`graph-link-${l.from}-${l.to}`} d={l.path} stroke={C.accent} strokeWidth={l.width} fill="none" />
        <Polygon points={l.arrow} fill={C.accent} />
      </>
    );
  },
  ({ link: a }, { link: b }) => a.key === b.key && a.path === b.path && a.width === b.width && a.arrow === b.arrow,
);

const Dot = memo(
  function Dot({ dot: d }: { dot: LaidDot }) {
    return (
      <Shortcut
        onPress={() => router.push(`/activity/${d.id}`)}
        testID={`graph-dot-${d.id}`}
        data={{ threads: d.threads.join('|') }}
        style={[styles.hit, styles.center, { left: d.x, top: d.y, width: d.w, height: d.h }]}>
        <View style={styles.dot} />
      </Shortcut>
    );
  },
  ({ dot: a }, { dot: b }) => a.id === b.id && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h && a.threads.join('|') === b.threads.join('|'),
);

const Node = memo(
  function Node({ node: n }: { node: LaidNode }) {
    return <NodeView node={n} />;
  },
  ({ node: a }, { node: b }) => a.id === b.id && a.kind === b.kind && a.name === b.name && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h && a.under?.join('|') === b.under?.join('|'),
);

function NodeView({ node: n }: { node: LaidNode }) {
  const why = n.kind === 'why';
  return (
    <Shortcut
      onPress={() => router.push(`/thread/${n.id}`)}
      testID={`graph-node-${n.id}`}
      data={{ kind: n.kind, ...(n.under && { under: n.under.join('|') }) }}
      style={[styles.hit, { left: n.x, top: n.y, width: n.w, height: n.h }]}>
      <View style={[styles.node, why && styles.why]}>
        <Text style={[styles.text, why && styles.whyText]} numberOfLines={why ? 2 : 1}>
          {n.name}
        </Text>
      </View>
    </Shortcut>
  );
}

const styles = StyleSheet.create({
  hit: { position: 'absolute', justifyContent: 'center' },
  center: { alignItems: 'center' },
  // Borders, lines and dots are at least 3:1 against the page (WCAG 1.4.11).
  node: { height: 36, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1, borderColor: C.faint, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  why: { borderWidth: 1.5, borderRadius: 14, borderColor: C.accent },
  text: { fontSize: 13, lineHeight: 16, fontWeight: '500', color: C.ink, textAlign: 'center' },
  whyText: { fontWeight: '600', color: C.accentInk },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.muted },
  moreText: { fontSize: 13, fontWeight: '500', color: C.accent },
  open: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-end', paddingHorizontal: 4 },
  openText: { color: C.accent, fontSize: 14, fontWeight: '500' },
});
