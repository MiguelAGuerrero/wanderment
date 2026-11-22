import { Link, router, useIsFocused } from 'expo-router';
import { memo, ReactNode, useDeferredValue, useMemo, useState } from 'react';
import { LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Polygon, Stop } from 'react-native-svg';

import { decorative } from '@/components/a11y';
import { pickId } from '@/components/graph/NodeContext';
import { heatFill, heatInk, heatLabel } from '@/domain/heat';
import { BIG_TEXT, LABEL_FONT, LABEL_LINE, LaidDot, LaidDotLine, LaidLink, LaidNode, looseOverview, NARROW_W, overview, Overview, overviewLayout, OverviewLayout, pictureItems } from '@/domain/overview';
import { Data, Id } from '@/domain/types';
import { useStore } from '@/store/useStore';
import { C, s } from '@/theme';

/** Content width on Home before it's measured: Screen's padding (20 each side) inside its 640 cap. */
export const homeContentWidth = (windowWidth: number) => Math.min(windowWidth, 640) - 40;

/**
 * Narrow content (three columns don't fit, e.g. 200 % zoom) or the largest native text: the graph is
 * just its summary and the list of whys and wanders, with its own "Explore" link. Otherwise Home's
 * header carries that link (`ExploreIcon`).
 */
export function useGraphNarrow() {
  const { width, fontScale } = useWindowDimensions();
  return homeContentWidth(width) < NARROW_W || fontScale >= BIG_TEXT;
}

/** Home's header fits its title and three 44 px icons from this content width (about a 350 px window). */
const ICON_ROOM = 310;

/**
 * Whether Home's header shows the ⋔ "Explore" icon: while the picture shows, if the header has room
 * for it. Narrower (e.g. 125 % zoom), it would push Settings and backup off screen, so it goes; a
 * wander's page and "and more →" still lead there.
 */
export function useGraphIcon() {
  const { width } = useWindowDimensions();
  const narrow = useGraphNarrow();
  return !narrow && homeContentWidth(width) >= ICON_ROOM;
}

/** The header's way to Explore (the single-centre view) while the picture shows (keyboard and screen readers too). */
export function ExploreIcon({ style }: { style: object }) {
  return (
    <Link href="/explore" asChild>
      <Pressable accessibilityRole="link" accessibilityLabel="Explore" style={style}>
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
 * Home's graph (P-34: the graph is Home), worked out from the data a moment after it changes
 * (`useDeferredValue`): a log's own update (the toast) never waits for the picture, which follows on
 * the next render. `surfacing` is the earned whys, in the order the Wanders tab's headers use. With
 * no wanders it's your recent logs on their own; while there are no whys it offers
 * "+ What's it all for?" (until "Not now"). Nothing at all logged: just the offer.
 */
export const LiveGraph = memo(function LiveGraph({ data, surfacing, firstRun }: { data: Data; surfacing: Id[]; /** The first run's step (P-36): in the offer's place, instead of it. */ firstRun?: ReactNode }) {
  const d = useDeferredValue(data);
  const sf = useDeferredValue(surfacing);
  // Heat (P-48) follows the recency shading setting: off, every circle is neutral.
  const shading = useStore((st) => st.showShading);
  const ov = useMemo(() => overview(d, sf, { shading }) ?? looseOverview(d), [d, sf, shading]);
  const offerOff = useStore((st) => st.whyOfferOff);
  const offer = !offerOff && ov?.mode !== 'whys';
  // Nothing logged yet (the welcome is showing): no "Not now" — there's nothing to put it off for.
  if (!ov) return firstRun || (offer ? <WhyOffer canPutOff={false} /> : null);
  return <HomeGraph ov={ov} offer={firstRun || (offer && <WhyOffer canPutOff />)} />;
});

/**
 * "+ What's it all for?": a gentle node while there are no whys. A tap names a wander and marks it as
 * what it's for (P-14's declare) in a small inline field; "Not now" puts it off for good.
 */
function WhyOffer({ canPutOff }: { canPutOff: boolean }) {
  const createThread = useStore((st) => st.createThread);
  const declareThread = useStore((st) => st.declareThread);
  const putOffWhy = useStore((st) => st.putOffWhy);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const submit = () => {
    const n = name.trim();
    if (!n) return setNaming(false);
    // Named (or found by its name), then P-14's declare. Refused while reconnecting: the name stays.
    const id = createThread(n);
    if (!id) return;
    const res = declareThread(id);
    // A hidden wander already has the name: its page is where it's unhidden.
    if (!res.ok && res.reason === 'hidden') router.push(`/thread/${id}`);
  };
  return (
    <View style={styles.offerRow} testID="why-offer">
      {naming ? (
        <TextInput
          value={name}
          onChangeText={setName}
          autoFocus
          placeholder="A feeling or a reason, e.g. feel calmer"
          placeholderTextColor={C.faint}
          onSubmitEditing={submit}
          submitBehavior="submit"
          blurOnSubmit={false}
          onBlur={() => !name.trim() && setNaming(false)}
          onKeyPress={(e) => Platform.OS === 'web' && e.nativeEvent.key === 'Escape' && (setName(''), setNaming(false))}
          returnKeyType="done"
          style={styles.offerInput}
          accessibilityLabel="What it’s all for"
        />
      ) : (
        <Pressable onPress={() => setNaming(true)} style={[styles.offerNode]} accessibilityRole="button">
          <Text style={styles.offerText}>+ What’s it all for?</Text>
        </Pressable>
      )}
      {canPutOff && (
        <Pressable onPress={putOffWhy} style={styles.notNow} accessibilityRole="button">
          <Text style={styles.notNowText}>Not now</Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * Home's graph: whys and what feeds them, or (with no whys) your most active wanders, drawn as circles
 * coloured by heat with tapered branches between them (P-48); or, with no wanders, your recent logs
 * alone as dots, given room to breathe (`roomy`). The picture
 * is one accessible element: an image labelled with the summary in names; activating it does nothing
 * (its centre is never a target). Nodes, dots and "and more →" are pointer shortcuts. Under it, the
 * summary as one visible line, then the whys and wanders as buttons (the way through without
 * pointing). A wander or dot that stays keeps its place: the last layout's slots are passed back in.
 * Narrow screens and the largest text get the summary, "Explore" and the list, without the picture.
 */
export function HomeGraph({ ov, offer }: { ov: Overview; /** "+ What's it all for?", over the picture. */ offer?: ReactNode; /** Reserved for focusing a node (P-26). */ focusId?: Id }) {
  const { width: windowWidth, fontScale } = useWindowDimensions();
  const narrow = useGraphNarrow();
  const icon = useGraphIcon();
  // Home stays mounted behind the other tabs: its words (which name your logs) are only there while it's shown.
  const focused = useIsFocused();
  const [measured, setMeasured] = useState<number>();
  const width = measured ?? homeContentWidth(windowWidth);
  // A hidden tab measures 0 wide: keep the last width (and the picture) for when Home is back.
  const onLayout = (e: LayoutChangeEvent) => e.nativeEvent.layout.width > 0 && setMeasured(e.nativeEvent.layout.width);
  // Laid out again only when something changes, from where things were last time (kept while Home
  // is mounted, never stored): React's "adjust state while rendering" pattern.
  const select = useStore((st) => st.select);
  const selected = useStore((st) => st.selected?.id);
  const [laid, setLaid] = useState<{ ov: Overview; width: number; fontScale: number; layout: OverviewLayout }>();
  let layout = laid?.layout;
  if (!laid || laid.ov !== ov || laid.width !== width || laid.fontScale !== fontScale) {
    layout = overviewLayout(ov, width, { fontScale, prev: laid?.layout.slots, roomy: true });
    setLaid({ ov, width, fontScale, layout });
  }
  if (!layout) return null;
  const summaryOnly = layout.summaryOnly || narrow;
  const items = pictureItems(ov);

  return (
    <View onLayout={onLayout} testID="home-graph" style={styles.graph}>
      {!summaryOnly && (
        <View accessible accessibilityRole="image" accessibilityLabel={ov.summary} onAccessibilityTap={() => {}} style={{ height: layout.height }} testID="home-graph-picture">
          <Svg width={width} height={layout.height} style={StyleSheet.absoluteFill} pointerEvents="none" {...decorative}>
            {/* Newest first in the layout; drawn last, so its lines are on top. */}
            {[...layout.dotLines].reverse().map((l) => (
              <DotLine key={l.key} line={l} />
            ))}
            {layout.links.map((l) => (
              <LinkLine key={l.key} link={l} />
            ))}
          </Svg>
          {/* A tap on empty canvas clears the selection (P-35); nodes and dots take their own taps. */}
          <Pressable onPress={() => select(undefined)} focusable={false} tabIndex={-1} {...noFocus} style={StyleSheet.absoluteFill} {...decorative}>
            {layout.nodes.map((n) => (
              <Node key={n.key} node={n} stepH={layout.stepH} selected={n.id === selected} />
            ))}
            {layout.dots.map((d) => (
              <Dot key={d.key} dot={d} />
            ))}
            {layout.more && (
              <Shortcut
                onPress={() => router.navigate('/explore')}
                testID="graph-more"
                style={[styles.hit, styles.center, { left: layout.more.x, top: layout.more.y, width: layout.more.w, height: layout.more.h }]}>
                <Text style={[styles.moreText, styles.mask]}>and more →</Text>
              </Shortcut>
            )}
          </Pressable>
        </View>
      )}
      {/* The summary in one line (two where the picture is hidden), with "Explore" beside it whenever
          the header has no room for its icon: at 200 % zoom the first item stays above the log box. */}
      {focused && (
        <View style={styles.summaryRow}>
          <Text style={[s.body, styles.summary, !summaryOnly && styles.line]} numberOfLines={summaryOnly ? 2 : 1} testID={summaryOnly ? 'home-graph-summary' : 'home-graph-line'}>
            {ov.summary}
          </Text>
          {!icon && ov.mode !== 'logs' && (
            <Link href="/explore" asChild>
              <Pressable accessibilityRole="link" style={styles.open}>
                <Text style={styles.openText}>Explore</Text>
              </Pressable>
            </Link>
          )}
        </View>
      )}
      {focused && items.length > 0 && (
        <View style={styles.items} role="list" aria-label="What’s in the picture">
          {items.map((it) => (
            <View key={it.id} role="listitem" style={styles.listItem}>
              {/* Selects, like a node, and focus moves to the context row above the log box (P-35). */}
              <Pressable nativeID={pickId(it.id)} onPress={() => select(it.id, { focus: true })} style={[styles.item, it.why && styles.itemWhy, it.id === selected && styles.itemSelected]} accessibilityRole="button">
                <Text style={styles.itemText} numberOfLines={2}>
                  <Text style={[styles.itemName, it.why && styles.whyText]}>{it.name}</Text>
                  <Text style={styles.itemRole}>{it.why ? ', what it’s for' : ', a wander'}</Text>
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
      {/* Below everything else: when it goes (a why is named), nothing above it moves. */}
      {offer}
    </View>
  );
}

// Memoised by value: a log re-renders only the dot and lines it adds (Home must not get slower).
const DotLine = memo(
  function DotLine({ line: l }: { line: LaidDotLine }) {
    return <Line testID={`graph-dotline-${l.dot}-${l.thread}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.newest ? C.muted : C.faint} strokeWidth={l.newest ? 1.5 : 1} />;
  },
  ({ line: a }, { line: b }) => a.key === b.key && a.newest === b.newest && a.x1 === b.x1 && a.y1 === b.y1 && a.x2 === b.x2 && a.y2 === b.y2,
);

/** A gradient id that's safe in `url(#…)` whatever the wander ids are (they can hold spaces). */
function gradientId(key: string) {
  let h = 5381;
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h + key.charCodeAt(i)) | 0;
  return `heat-${(h >>> 0).toString(36)}`;
}

/** A tapered branch (P-48), coloured from the child's heat to the parent's. Memoised by value. */
const LinkLine = memo(
  function LinkLine({ link: l }: { link: LaidLink }) {
    const b = l.branch;
    if (!b) return null;
    const id = gradientId(l.key);
    return (
      <>
        <Defs>
          <LinearGradient id={id} gradientUnits="userSpaceOnUse" x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2}>
            <Stop offset="0" stopColor={heatInk(b.fromHeat)} />
            <Stop offset="1" stopColor={heatInk(b.toHeat)} />
          </LinearGradient>
        </Defs>
        <Polygon testID={`graph-link-${l.from}-${l.to}`} points={b.points} fill={`url(#${id})`} />
      </>
    );
  },
  ({ link: a }, { link: b }) =>
    a.key === b.key &&
    a.branch?.points === b.branch?.points &&
    a.branch?.fromHeat === b.branch?.fromHeat &&
    a.branch?.toHeat === b.branch?.toHeat &&
    a.branch?.x1 === b.branch?.x1 &&
    a.branch?.y1 === b.branch?.y1 &&
    a.branch?.x2 === b.branch?.x2 &&
    a.branch?.y2 === b.branch?.y2,
);

const Dot = memo(
  function Dot({ dot: d }: { dot: LaidDot }) {
    return (
      <Shortcut
        onPress={() => router.push(`/activity/${d.id}`)}
        testID={`graph-dot-${d.id}`}
        data={{ threads: d.threads.join('|'), ...(d.newest && { newest: 'true' }) }}
        style={[styles.hit, styles.center, { left: d.x, top: d.y, width: d.w, height: d.h }]}>
        <View style={[styles.dot, d.newest && styles.newest]} />
      </Shortcut>
    );
  },
  ({ dot: a }, { dot: b }) => a.id === b.id && a.newest === b.newest && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h && a.threads.join('|') === b.threads.join('|'),
);

const Node = memo(
  function Node({ node: n, stepH, selected }: { node: LaidNode; stepH: number; selected: boolean }) {
    return <NodeView node={n} stepH={stepH} selected={selected} />;
  },
  ({ node: a, stepH: sa, selected: xa }, { node: b, stepH: sb, selected: xb }) =>
    sa === sb &&
    xa === xb &&
    a.id === b.id &&
    a.kind === b.kind &&
    a.name === b.name &&
    a.step === b.step &&
    a.x === b.x &&
    a.y === b.y &&
    a.w === b.w &&
    a.h === b.h &&
    a.under?.join('|') === b.under?.join('|') &&
    a.circle?.cx === b.circle?.cx &&
    a.circle?.cy === b.circle?.cy &&
    a.circle?.r === b.circle?.r &&
    a.circle?.heat === b.circle?.heat &&
    a.circle?.declared === b.circle?.declared &&
    a.circle?.inside === b.circle?.inside &&
    a.circle?.labelW === b.circle?.labelW,
);

/** A ring around a circle, `gap` px beyond its edge (P-48: a declared why's second ring, the selection). */
function Ring({ n, gap, width, color, testID }: { n: LaidNode; gap: number; width: number; color: string; testID: string }) {
  const c = n.circle!;
  const R = c.r + gap;
  return <View testID={testID} pointerEvents="none" style={[styles.ring, { left: n.w / 2 - R, top: c.cy - n.y - R, width: 2 * R, height: 2 * R, borderRadius: R, borderWidth: width, borderColor: color }]} />;
}

/**
 * A node as a circle coloured by its heat (P-48), its label inside when it fits, else under it. A
 * declared why has a second thin ring; the selection (P-35) is one ink ring. A tap selects the wander
 * (P-35): the log box takes its context. "Open" in that row opens its page.
 */
function NodeView({ node: n, stepH, selected }: { node: LaidNode; stepH: number; selected: boolean }) {
  const c = n.circle;
  if (!c) return null;
  const why = n.kind === 'why';
  return (
    <>
      <Shortcut
        onPress={() => useStore.getState().select(n.id)}
        testID={`graph-node-${n.id}`}
        data={{ kind: n.kind, ...(n.under && { under: n.under.join('|') }), ...(selected && { selected: 'true' }), heat: c.heat.toFixed(2), label: c.inside ? 'inside' : 'under' }}
        style={[styles.hit, styles.nodeHit, { left: n.x, top: n.y, width: n.w, height: n.h }]}>
        <View style={[styles.circle, { marginTop: c.cy - n.y - c.r, width: 2 * c.r, height: 2 * c.r, borderRadius: c.r, backgroundColor: heatFill(c.heat), borderColor: heatInk(c.heat) }]}>
          {c.inside && (
            <Text style={[styles.label, styles.inside, { width: c.labelW, color: heatLabel(c.heat) }]} numberOfLines={2}>
              {n.name}
            </Text>
          )}
        </View>
        {!c.inside && (
          <Text style={[styles.label, styles.under, why && styles.underWhy, { maxWidth: c.labelW }]} numberOfLines={2}>
            {n.name}
          </Text>
        )}
        {c.declared && <Ring n={n} gap={4} width={1} color={heatInk(c.heat)} testID={`graph-why-ring-${n.id}`} />}
        {selected && <Ring n={n} gap={c.declared ? 8 : 5} width={2} color={C.ink} testID={`graph-selected-${n.id}`} />}
      </Shortcut>
      {/* Its staged next step: one quiet line, no age, no count (P-50 changes it). */}
      {n.step && (
        <View pointerEvents="none" style={[styles.stepRow, { left: n.x, top: n.y + n.h, width: n.w, height: stepH }]}>
          <Text testID={`graph-step-${n.id}`} style={[styles.step, styles.mask, { lineHeight: stepH }]} numberOfLines={1}>
            ↳ {n.step}
          </Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  hit: { position: 'absolute', justifyContent: 'center' },
  center: { alignItems: 'center' },
  // Outlines, rings, branches and dots are at least 3:1 against the page (WCAG 1.4.11); labels 4.5:1 (`heat` tests).
  // Home (P-48): a circle at the top of its target, its label inside or under it.
  nodeHit: { justifyContent: 'flex-start', alignItems: 'center' },
  circle: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute' },
  label: { fontSize: LABEL_FONT, lineHeight: LABEL_LINE, textAlign: 'center' },
  inside: { fontWeight: '600' },
  under: { marginTop: 2, fontWeight: '500', color: C.ink, paddingHorizontal: 2 },
  underWhy: { fontWeight: '600' },
  // Text the branches pass behind: the page colour under it, so a line never runs through words.
  mask: { backgroundColor: C.bg },
  stepRow: { position: 'absolute', alignItems: 'center' },
  step: { fontSize: 12, color: C.muted, textAlign: 'center', paddingHorizontal: 4, maxWidth: '100%' },
  whyText: { fontWeight: '600', color: C.accentInk },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.muted },
  // Your latest log: larger, in the accent colour, until the next one (so every log visibly lands).
  newest: { width: 14, height: 14, borderRadius: 7, backgroundColor: C.accent },
  moreText: { fontSize: 13, fontWeight: '500', color: C.accent },
  graph: { gap: 12, marginTop: 8 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summary: { flex: 1 },
  line: { color: C.muted },
  open: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  openText: { color: C.accent, fontSize: 14, fontWeight: '500' },
  items: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  listItem: { maxWidth: '100%' },
  item: { minHeight: 44, maxWidth: '100%', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 22, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, justifyContent: 'center' },
  itemWhy: { borderColor: C.accent },
  itemSelected: { borderWidth: 2, borderColor: C.accent, backgroundColor: C.accentTint },
  itemText: { fontSize: 14, flexShrink: 1 },
  itemName: { fontWeight: '500', color: C.ink },
  itemRole: { color: C.muted },
  offerRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8 },
  offerNode: { minHeight: 44, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  offerText: { fontSize: 15, fontWeight: '600', color: C.accentInk },
  offerInput: { flexGrow: 1, flexBasis: 200, minHeight: 44, fontSize: 15, color: C.ink, borderBottomWidth: 1, borderColor: C.line },
  notNow: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  notNowText: { fontSize: 14, color: C.muted, textDecorationLine: 'underline' },
});
