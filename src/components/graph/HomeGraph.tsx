import { Link, router } from 'expo-router';
import { memo, ReactNode, useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Path, Polygon, Stop } from 'react-native-svg';

import { decorative } from '@/components/a11y';
import { ExploreGlyph } from '@/components/icons';
import { goUp, useReduceMotion } from '@/components/graph/scopeNav';
import { useShown } from '@/components/shown';
import { FocusMap, scopeIds, STEP_ADD_R, STEP_DOT_R, stepMark, validScope } from '@/domain/focus';
import { heatFill, heatInk, heatLabel } from '@/domain/heat';
import { LooseLogs } from '@/components/graph/LooseLogs';
import { BIG_TEXT, LABEL_FONT, LABEL_LINE, LaidDot, LaidDotLine, LaidLink, LaidNode, looseLogs, looseOverview, NARROW_W, RING_OUT, overview, Overview, overviewLayout, OverviewLayout, pictureItems, scopeLayout } from '@/domain/overview';
import { whatsNextNode } from '@/domain/slot';
import { Data, Id } from '@/domain/types';
import { useStore } from '@/store/useStore';
import { C } from '@/theme';

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
        <ExploreGlyph />
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
  const ov = useMemo(() => overview(d, sf, { shading }) ?? looseOverview(d, { shading }), [d, sf, shading]);
  const offerOff = useStore((st) => st.whyOfferOff);
  const offer = !offerOff && ov?.mode !== 'whys';
  // P-50: the node the What's next card is on carries the ring (the default too: shown, never attached).
  const focus = useStore((st) => st.focus);
  const focusId = useMemo(() => whatsNextNode(d, focus), [d, focus]);
  // P-60: with wanders, the last few logs that name none, under the graph.
  const loose = useMemo(() => (ov && ov.mode !== 'logs' ? looseLogs(d, { shading }) : []), [ov, d, shading]);
  const nodes = useMemo(() => (ov ? pictureItems(ov) : []), [ov]);
  const shown = useShown();
  // Below the picture: when it goes (a why is named), nothing above it moves. It keeps one place in
  // the tree whether or not there's a picture yet, so the first run's step isn't mounted again (its
  // typed words and focus lost) when the deferred picture catches up with the data. Nothing logged
  // yet (the welcome is showing): no "Not now" — there's nothing to put it off for.
  return (
    <>
      {ov && <HomeGraph ov={ov} focusId={focusId} />}
      {shown && <LooseLogs logs={loose} nodes={nodes} />}
      {firstRun || (offer && <WhyOffer canPutOff={!!ov} />)}
    </>
  );
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
 * alone as dots, given room to breathe (`roomy`). The picture is a group named by its summary (P-60:
 * no longer shown as a line), holding each circle as a button ("feel productive, what it's for") in
 * reading order; "and more →" and the step mark are pointer shortcuts (the card is their way through).
 * A wander that stays keeps its place: the last layout's slots are passed back in. Narrow screens
 * (200 % zoom) and the largest text get "Explore" and the list of whys and wanders as buttons, without
 * the picture.
 */
export function HomeGraph({ ov, focusId }: { ov: Overview; /** P-50: the What's next card's node: one ink ring, and its step. */ focusId?: Id }) {
  const { width: windowWidth, fontScale } = useWindowDimensions();
  const narrow = useGraphNarrow();
  const icon = useGraphIcon();
  // Home stays mounted behind its sheet and other screens (P-58): its words (which name your logs) are only there while it's shown.
  const focused = useShown();
  const [measured, setMeasured] = useState<number>();
  const width = measured ?? homeContentWidth(windowWidth);
  // A hidden screen measures 0 wide: keep the last width (and the picture) for when Home is back.
  const onLayout = (e: LayoutChangeEvent) => e.nativeEvent.layout.width > 0 && setMeasured(e.nativeEvent.layout.width);
  // Laid out again only when something changes, from where things were last time (kept while Home
  // is mounted, never stored): React's "adjust state while rendering" pattern.
  const select = useStore((st) => st.select);
  const tapCanvas = useCallback(() => {
    select(undefined);
    const st = useStore.getState();
    if (st.homeFace === 'log' && !st.draft.text.trim()) st.showHomeFace('next');
  }, [select]);
  const tapNode = useStore((st) => st.tapNode);
  const storedScope = useStore((st) => st.scope);
  const [laid, setLaid] = useState<{ ov: Overview; width: number; fontScale: number; layout: OverviewLayout }>();
  let all = laid?.layout;
  if (!laid || laid.ov !== ov || laid.width !== width || laid.fontScale !== fontScale) {
    all = overviewLayout(ov, width, { fontScale, prev: laid?.layout.slots, roomy: true });
    setLaid({ ov, width, fontScale, layout: all });
  }
  // P-50: what's drawn is the scope (All, or a node and what feeds it, narrowed and zoomed).
  const items = useMemo(() => pictureItems(ov), [ov]);
  const allMap = useMemo(() => all && focusMap(ov, all, items), [ov, all, items]);
  const scope = useMemo(() => (allMap ? validScope(allMap, storedScope) : []), [allMap, storedScope]);
  const root = scope[scope.length - 1];
  const layout = useMemo(() => all && (root ? scopeLayout(ov, all, root, width, fontScale) : all), [ov, all, root, width, fontScale]);
  // With no picture, the list's order is the order a swipe walks.
  const hidden = narrow || !!layout?.summaryOnly;
  const map = useMemo(() => layout && allMap && (hidden ? listOrder(allMap) : withPlaces(allMap, layout)), [allMap, layout, hidden]);
  // Published for the card (its path, what a swipe walks), only when it changes; gone with the graph.
  const setFocusMap = useStore((st) => st.setFocusMap);
  const published = useRef('');
  useEffect(() => {
    const key = JSON.stringify(map);
    if (key === published.current) return;
    published.current = key;
    setFocusMap(map);
  }, [map, setFocusMap]);
  useEffect(() => () => setFocusMap(undefined), [setFocusMap]);
  const zoom = useZoom(root, layout, width);
  if (!layout || !allMap) return null;
  const summaryOnly = layout.summaryOnly || narrow;
  const inScope = scopeIds(allMap, scope);
  const listed = items.filter((it) => inScope.has(it.id));
  const ringed = layout.nodes.find((n) => n.id === focusId);

  return (
    <View onLayout={onLayout} testID="home-graph" style={styles.graph}>
      {ov.mode !== 'logs' && <ScopeChip scope={scope} names={allMap} />}
      {/* No wanders (P-57): each recent log a dot with its words, at any width; the rows say what the
          "Lately" line did, so there's none. Its words (your logs) only while Home is shown. */}
      {ov.mode === 'logs' && focused && (
        <View role="list" aria-label={ov.summary} testID="home-graph-picture">
          {layout.dots.map((d) => (
            <LogRow key={d.key} dot={d} />
          ))}
        </View>
      )}
      {ov.mode !== 'logs' && !summaryOnly && (
        <View role="group" aria-label={ov.summary} style={{ height: layout.height }} testID="home-graph-picture">
          <Animated.View style={[StyleSheet.absoluteFill, zoom]} {...({ dataSet: { zoom: 'true' } } as object)}>
          <Svg width={width} height={layout.height} style={StyleSheet.absoluteFill} pointerEvents="none" {...decorative}>
            {/* Newest first in the layout; drawn last, so its lines are on top. */}
            {[...layout.dotLines].reverse().map((l) => (
              <DotLine key={l.key} line={l} />
            ))}
            {layout.links.map((l) => (
              <LinkLine key={l.key} link={l} />
            ))}
            {ringed?.circle && <StepBranch node={ringed} width={width} height={layout.height} />}
          </Svg>
          {/* A tap on empty canvas clears the attach (P-35; focus stays, P-50) and, with nothing typed, puts the log field away (P-61); nodes take their own taps. */}
          <Pressable onPress={tapCanvas} focusable={false} tabIndex={-1} {...noFocus} style={StyleSheet.absoluteFill} {...decorative} />
          {/* P-60: the circles are the way through for screen readers and the keyboard, in reading order. */}
          <View role="list" aria-label="What’s in the picture" style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {layout.nodes.map((n) => (
              <Node key={n.key} node={n} focused={n.id === focusId} />
            ))}
          </View>
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {ringed?.circle && <StepMarkView node={ringed} width={width} height={layout.height} />}
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
          </View>
          </Animated.View>
        </View>
      )}
      {/* P-60: no summary line (it names the picture). "Explore" whenever the header has no room for its icon. */}
      {focused && ov.mode !== 'logs' && !icon && (
        <View style={styles.summaryRow}>
          <Link href="/explore" asChild>
            <Pressable accessibilityRole="link" style={styles.open}>
              <Text style={styles.openText}>Explore</Text>
            </Pressable>
          </Link>
        </View>
      )}
      {/* With no picture (200 % zoom, the largest text), the whys and wanders as buttons, named by the summary. */}
      {focused && summaryOnly && listed.length > 0 && (
        <View role="group" aria-label={ov.summary} testID="home-graph-list">
          <View style={styles.items} role="list" aria-label="What’s in the picture">
            {listed.map((it) => (
              <View key={it.id} role="listitem" style={styles.listItem}>
                {/* Like a tap on its circle (P-50): focuses it (and with the log field open attaches it, P-61), or (focused, with something feeding it) narrows to it. */}
                <Pressable
                  onPress={() => tapNode(it.id)}
                  style={[styles.item, it.why && styles.itemWhy, it.id === focusId && styles.itemSelected]}
                  accessibilityRole="button"
                  {...(it.id === focusId && ({ 'aria-current': true } as object))}>
                  <Text style={styles.itemText} numberOfLines={2}>
                    <Text style={[styles.itemName, it.why && styles.whyText]}>{it.name}</Text>
                    <Text style={styles.itemRole}>{it.why ? ', what it’s for' : ', a wander'}</Text>
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      )}
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

/**
 * No wanders (P-57): a log as a 44 px row, its dot coloured by recency (P-48's ramp; neutral with the
 * shading off), the newest marked as before (larger, in the accent colour), and its words on one line
 * (ellipsised; the full words are its accessible name). A tap opens the log, as a dot did.
 */
const LogRow = memo(
  function LogRow({ dot: d }: { dot: LaidDot }) {
    const heat = d.heat ?? 0;
    return (
      <View role="listitem">
        <Link href={`/activity/${d.id}`} asChild>
          <Pressable
            accessibilityRole="link"
            testID={`graph-dot-${d.id}`}
            {...({ dataSet: { heat: heat.toFixed(2), ...(d.newest && { newest: 'true' }) } } as object)}
            style={styles.logRow}>
            <View style={d.newest ? styles.newest : [styles.dot, styles.logDot, { backgroundColor: heatInk(heat) }]} {...decorative} />
            <Text style={[styles.logText, d.newest && styles.logNewest]} numberOfLines={1}>
              {d.text}
            </Text>
          </Pressable>
        </Link>
      </View>
    );
  },
  ({ dot: a }, { dot: b }) => a.id === b.id && a.newest === b.newest && a.text === b.text && a.heat === b.heat,
);

const Node = memo(
  function Node({ node: n, focused }: { node: LaidNode; focused: boolean }) {
    return <NodeView node={n} focused={focused} />;
  },
  ({ node: a, focused: xa }, { node: b, focused: xb }) =>
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
    a.circle?.labelW === b.circle?.labelW &&
    a.circle?.labelY === b.circle?.labelY &&
    a.circle?.labelH === b.circle?.labelH,
);

/** A ring around a circle, `gap` px beyond its edge (P-48: a declared why's second ring; P-50: the focus). */
function Ring({ n, gap, width, color, testID }: { n: LaidNode; gap: number; width: number; color: string; testID: string }) {
  const c = n.circle!;
  const R = c.r + gap;
  return <View testID={testID} pointerEvents="none" style={[styles.ring, { left: n.w / 2 - R, top: c.cy - n.y - R, width: 2 * R, height: 2 * R, borderRadius: R, borderWidth: width, borderColor: color }]} />;
}

/**
 * A node as a circle coloured by its heat (P-48), its label inside when it fits, else under it. A
 * declared why has a second thin ring; the focus (P-50: the What's next card's node) is one ink ring.
 * A tap focuses it (and, while the log field is open, attaches it: P-61), or, focused already, narrows
 * to it (`tapNode`). Its page opens from
 * the card's name.
 */
function NodeView({ node: n, focused }: { node: LaidNode; focused: boolean }) {
  const c = n.circle;
  if (!c) return null;
  const why = n.kind === 'why';
  return (
    <View role="listitem" style={[styles.hit, { left: n.x, top: n.y, width: n.w, height: n.h }]}>
      {/* P-60: a button named as the list under the picture named it; the focused one is current. */}
      <Pressable
        onPress={() => useStore.getState().tapNode(n.id)}
        accessibilityRole="button"
        accessibilityLabel={`${n.name}${why ? ', what it’s for' : ', a wander'}`}
        {...(focused && ({ 'aria-current': true } as object))}
        {...noFocus}
        testID={`graph-node-${n.id}`}
        {...({ dataSet: { kind: n.kind, ...(n.under && { under: n.under.join('|') }), ...(focused && { focused: 'true' }), heat: c.heat.toFixed(2), label: c.inside ? 'inside' : 'under' } } as object)}
        style={[StyleSheet.absoluteFill, styles.nodeHit]}>
        <View testID={`graph-circle-${n.id}`} style={[styles.circle, { marginTop: c.cy - n.y - c.r, width: 2 * c.r, height: 2 * c.r, borderRadius: c.r, backgroundColor: heatFill(c.heat), borderColor: heatInk(c.heat) }]}>
          {c.inside && (
            <Text style={[styles.label, styles.inside, { width: c.labelW, color: heatLabel(c.heat) }]} numberOfLines={2}>
              {n.name}
            </Text>
          )}
        </View>
        {/* P-60: under the circle, wholly below its outermost ring, in the box the layout keeps clear. */}
        {!c.inside && (
          <View pointerEvents="none" style={[styles.underBox, { top: c.labelY - n.y, maxHeight: c.labelH }]}>
            <Text testID={`graph-label-${n.id}`} style={[styles.label, styles.under, styles.mask, why && styles.underWhy, { maxWidth: c.labelW }]} numberOfLines={2}>
              {n.name}
            </Text>
          </View>
        )}
        {c.declared && <Ring n={n} gap={4} width={1} color={heatInk(c.heat)} testID={`graph-why-ring-${n.id}`} />}
        {focused && <Ring n={n} gap={c.declared ? RING_OUT : 5} width={2} color={C.ink} testID={`graph-selected-${n.id}`} />}
      </Pressable>
    </View>
  );
}

/** The focused node's step branch (P-50), under the circles: tapered to the dot, or dashed to the ＋. */
function StepBranch({ node: n, width, height }: { node: LaidNode; width: number; height: number }) {
  const m = stepMark(n.circle!, width, height);
  return n.step ? <Polygon points={m.branch} fill={C.body} /> : <Path d={m.path} fill="none" stroke={C.faint} strokeWidth={1.2} strokeDasharray="2 3" />;
}

/**
 * Only the focused node's staged step is drawn (P-50): a small filled ink dot beside and below it
 * with the step's words, or, with none, a dashed ＋ that opens the card's "＋ add one". The card is
 * the way to both without pointing.
 */
function StepMarkView({ node: n, width, height }: { node: LaidNode; width: number; height: number }) {
  const m = stepMark(n.circle!, width, height);
  if (!n.step) {
    return (
      <Shortcut onPress={() => useStore.getState().askAddStep(n.id)} testID={`graph-add-step-${n.id}`} style={[styles.hit, styles.center, { left: m.x - 22, top: m.y - 22, width: 44, height: 44 }]}>
        <View style={styles.addStep}>
          <Text style={styles.addStepText}>＋</Text>
        </View>
      </Shortcut>
    );
  }
  return (
    <>
      <View pointerEvents="none" testID={`graph-step-dot-${n.id}`} style={[styles.stepDot, { left: m.x - STEP_DOT_R, top: m.y - STEP_DOT_R }]} />
      <View pointerEvents="none" style={[styles.stepLabel, { left: m.label.x, top: m.y - LABEL_LINE / 2 - 1, width: m.label.w, alignItems: m.label.align === 'left' ? 'flex-start' : 'flex-end' }]}>
        <Text testID={`graph-step-${n.id}`} style={[styles.step, styles.mask]} numberOfLines={1}>
          {n.step}
        </Text>
      </View>
    </>
  );
}

/**
 * P-50: the scope as a chip above the picture: in a scope, "‹ <where up goes> · <here>", which goes up
 * one level (as do Esc and Back). At All, nothing (P-60).
 */
function ScopeChip({ scope, names }: { scope: Id[]; names: FocusMap }) {
  const name = (id: Id) => names.nodes.find((n) => n.id === id)?.name ?? '';
  if (!scope.length) return null;
  const here = name(scope[scope.length - 1]);
  const up = scope.length > 1 ? name(scope[scope.length - 2]) : 'All';
  return (
    <View style={styles.chipRow}>
      <Pressable onPress={goUp} accessibilityRole="button" accessibilityLabel={`${up} · ${here}, back to ${up}`} style={styles.chip} testID="scope-chip">
        <Text style={styles.chipText} numberOfLines={1}>
          <Text {...decorative}>‹ </Text>
          {up} · {here}
        </Text>
      </Pressable>
    </View>
  );
}

/** The picture as the card needs it (P-50): every node in it, its circle's centre (or, with no picture, its place in the list), and the links. */
function focusMap(ov: Overview, layout: OverviewLayout, items: ReturnType<typeof pictureItems>): FocusMap {
  const at = new Map(layout.nodes.map((n) => [n.id, n.circle]));
  const why = new Set(ov.mode === 'whys' ? ov.whys.map((w) => w.thread.id) : []);
  const nodes = items.map((it, i) => {
    const c = at.get(it.id);
    return { id: it.id, name: it.name, x: c ? c.cx : i, y: c ? c.cy : 0, why: why.has(it.id) };
  });
  return { nodes, links: ov.links.filter((l) => l.from !== l.to && nodes.some((n) => n.id === l.from) && nodes.some((n) => n.id === l.to)).map((l) => ({ from: l.from, to: l.to })) };
}

/** The map in the list's order (no picture). */
const listOrder = (map: FocusMap): FocusMap => ({ ...map, nodes: map.nodes.map((n, i) => ({ ...n, x: i, y: 0 })) });

/** The map with each drawn node where it's drawn now (the narrowed layout's places, for a swipe's order). */
function withPlaces(map: FocusMap, layout: OverviewLayout): FocusMap {
  if (layout.summaryOnly) return map;
  const at = new Map(layout.nodes.map((n) => [n.id, n.circle]));
  return { ...map, nodes: map.nodes.map((n) => (at.get(n.id) ? { ...n, x: at.get(n.id)!.cx, y: at.get(n.id)!.cy } : n)) };
}

/**
 * Narrowing zooms (P-50): when the scope changes, the picture starts with the node it turns on (the
 * one narrowed to, or the one left) where and how big it was, and eases to the new layout in 250 ms.
 * Under Reduce Motion it just changes.
 */
function useZoom(root: Id | undefined, layout: OverviewLayout | undefined, width: number) {
  const reduce = useReduceMotion();
  const [z] = useState(() => ({ s: new Animated.Value(1), x: new Animated.Value(0), y: new Animated.Value(0) }));
  const last = useRef<{ root?: Id; layout?: OverviewLayout }>({ root, layout });
  useLayoutEffect(() => {
    const prev = last.current;
    last.current = { root, layout };
    if (prev.root === root || reduce || !prev.layout || !layout || prev.layout.summaryOnly || layout.summaryOnly) return;
    // Narrowing turns on the new scope's node; going up, on the one left.
    const pivot = root && prev.layout.nodes.some((n) => n.id === root) ? root : prev.root;
    const a = prev.layout.nodes.find((n) => n.id === pivot)?.circle;
    const b = layout.nodes.find((n) => n.id === pivot)?.circle;
    if (!a || !b) return;
    const s = a.r / b.r;
    const [cx, cy] = [width / 2, layout.height / 2];
    z.s.setValue(s);
    z.x.setValue(a.cx - cx - s * (b.cx - cx));
    z.y.setValue(a.cy - cy - s * (b.cy - cy));
    const to = (v: Animated.Value, value: number) => Animated.timing(v, { toValue: value, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' });
    Animated.parallel([to(z.s, 1), to(z.x, 0), to(z.y, 0)]).start();
  }, [root, layout, width, reduce, z]);
  return { transform: [{ translateX: z.x }, { translateY: z.y }, { scale: z.s }] };
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
  under: { fontWeight: '500', color: C.ink, paddingHorizontal: 2, ...(Platform.OS === 'web' && ({ overflowWrap: 'anywhere' } as object)) },
  // P-60: the label's box under the circle (the layout's `labelY`), as wide as the target.
  underBox: { position: 'absolute', left: 0, right: 0, alignItems: 'center', overflow: 'hidden' },
  underWhy: { fontWeight: '600' },
  // Text the branches pass behind: the page colour under it, so a line never runs through words.
  mask: { backgroundColor: C.bg },
  // P-50: the focused node's step, as a filled ink dot with its words, or a dashed ＋.
  stepDot: { position: 'absolute', width: 2 * STEP_DOT_R, height: 2 * STEP_DOT_R, borderRadius: STEP_DOT_R, backgroundColor: C.ink },
  stepLabel: { position: 'absolute' },
  step: { fontSize: LABEL_FONT, lineHeight: LABEL_LINE + 2, fontWeight: '600', color: C.ink, paddingHorizontal: 2, maxWidth: '100%' },
  addStep: { width: 2 * STEP_ADD_R, height: 2 * STEP_ADD_R, borderRadius: STEP_ADD_R, borderWidth: 1.2, borderStyle: 'dashed', borderColor: C.faint, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  addStepText: { fontSize: 12, lineHeight: 14, color: C.muted },
  // P-50: the scope chip.
  chipRow: { flexDirection: 'row', alignItems: 'center', minHeight: 28 },
  chip: { minHeight: 44, marginVertical: -8, paddingHorizontal: 12, borderRadius: 22, borderWidth: 1, borderColor: C.ink, justifyContent: 'center', maxWidth: '100%', backgroundColor: C.surface },
  chipText: { fontSize: 14, fontWeight: '600', color: C.ink },
  whyText: { fontWeight: '600', color: C.accentInk },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.muted },
  // Your latest log: larger, in the accent colour, until the next one (so every log visibly lands).
  newest: { width: 14, height: 14, borderRadius: 7, backgroundColor: C.accent },
  // P-57: a log's row (no wanders): its dot in a fixed column, its words beside it on one line.
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  // Centred in the newest dot's 14 px column, so every row's words start at the same place.
  logDot: { marginHorizontal: 2 },
  logText: { flex: 1, fontSize: 15, color: C.ink },
  logNewest: { fontWeight: '500' },
  moreText: { fontSize: 13, fontWeight: '500', color: C.accent },
  graph: { gap: 12, marginTop: 8 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  open: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  openText: { color: C.accent, fontSize: 14, fontWeight: '500' },
  items: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  listItem: { maxWidth: '100%' },
  item: { minHeight: 44, maxWidth: '100%', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 22, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, justifyContent: 'center' },
  itemWhy: { borderColor: C.accent },
  // P-50: the focused node's button carries the focus as the ring does: ink.
  itemSelected: { borderWidth: 2, borderColor: C.ink },
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
