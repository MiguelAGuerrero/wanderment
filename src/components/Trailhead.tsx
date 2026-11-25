import { router, useIsFocused } from 'expo-router';
import { ReactNode, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';

import { decorative } from '@/components/a11y';
import { Composer } from '@/components/Composer';
import { useReduceMotion } from '@/components/graph/scopeNav';
import { useHome, useKeyboardUp } from '@/components/Home';
import { DarkProvider } from '@/components/palette';
import { GRAB_ID, HomeSheet, SHEET_NAME, useHomeSheet } from '@/components/sheet/HomeSheet';
import { ShownProvider } from '@/components/shown';
import { STAR_PATH } from '@/components/StarGlyph';
import { Toast } from '@/components/Toast';
import { FEED_ROWS, FeedLine, feedLines, feedName, pickFeed } from '@/domain/feed';
import { GUIDE_BAND_END, OLD_HOME, restGuides, subjectHref } from '@/domain/home';
import { BAND_TOP, bandHeight, FEED_SIDE, LAND_MS, landedWords, litGeometry, LitLink, litLineName, litLinks, LitNode, litNodes, NODE_GLYPH, NODE_H, nodeName, NodePlace, nodePlaces, nodeWidth } from '@/domain/litMap';
import { placeStars, searchLineIds, searchSheetHeight, STAR_ROW_H, StarPlace, starWords } from '@/domain/searchSky';
import { starTarget } from '@/domain/sky';
import { feedRowShown, GROUND_H, headingCollapses, mapTop, restLayout, UNSURE_NAME, unsureChip } from '@/domain/trailhead';
import { Id } from '@/domain/types';
import { LogOptions, useStore } from '@/store/useStore';
import { N } from '@/theme';

export const PROMPT = 'Where are we wandering today?';
const web = Platform.OS === 'web';
/** The heading's type: Space Grotesk where it's installed, else the system's sans (never the browser's serif default). */
const display = Platform.select({ web: '"Space Grotesk", SpaceGrotesk, system-ui, -apple-system, "Segoe UI", sans-serif', default: undefined });
/** The live map's lines start this far in from each side; an indent from its id takes up to INDENT of the rest. */
const SIDE = FEED_SIDE;
const INDENT = 0.4;

/** Lighting goes back to rest: the trailhead in the history if it's there (Back), else it replaces `/sky` (P-88: the old home is `/old`). */
const dim = () => router.dismissTo(OLD_HOME);

/**
 * The home at rest (P-65 → B-09). P-79: the composer is at the bottom, in thumb reach, like messaging
 * (never chat-bubble styled): a grabber (P-83: the sheet), the question as a small heading (it collapses
 * with the keyboard up, in a short window or at large text), "I'm not sure" as a chip right above the
 * field, the done chip once you've typed, and the field with its send ↑. As you type, P-61's
 * suggestions open above the field: the composer grows, the map yields. Return logs exactly as typed
 * and the line rises (P-73, `/line/<id>`).
 * P-80: above the composer, the live map — a random few of the last three weeks' lines, drawn once a
 * day, each in a place from its id, held while it's on screen; a tap opens one (the rise, reopened).
 * P-81: "I'm not sure" lights the map in place (`/sky`): your whys and wanders as named nodes in the
 * band kept for them above the lines, links from the lines to where they went; the lines never move.
 * P-82: a line that just went toward a wander lands in its node and stays labelled there until the next
 * action. P-83: the grabber (tap, or a swipe up that starts on it) pulls up the sheet — Wanders,
 * Activities, Explore, Search, Settings, Export.
 */
export function Trailhead({ lit = false }: { lit?: boolean }) {
  const shown = useIsFocused();
  const keptId = useStore((st) => st.kept?.activityId);
  const focusLogBox = useStore((st) => st.focusLogBox);
  const doneChip = useStore((st) => st.doneChip);
  const setDoneChip = useStore((st) => st.setDoneChip);
  const reopenLine = useStore((st) => st.reopenLine);
  const clearLanded = useStore((st) => st.clearLanded);
  const landed = useStore((st) => st.landed);
  const typed = useStore((st) => !!st.draft.text.trim());
  const data = useStore((st) => st.data);
  const ready = useStore((st) => st.storage.state === 'ready');
  // Captured at Return (and kept with a Return made while reconnecting).
  const logOptions = useMemo<LogOptions>(() => ({ trail: true, done: doneChip }), [doneChip]);
  const warm = useStore((st) => st.showShading);
  // P-72/P-74: coming back down from a session, the camera comes down to the lantern; the field keeps its focus.
  const { passage, tilting, rest } = useHome('trailhead');
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const keyboardUp = useKeyboardUp();
  const collapsed = headingCollapses({ height, fontScale, keyboardUp });
  // P-83: the sheet, pulled up from the grabber.
  const { sheet, homeRef, handleRef, tabRefs } = useHomeSheet();

  // The composer's height (the ground stands on it; the toast sits above it) and the map's room above it.
  const [composerH, setComposerH] = useState(0);
  const [room, setRoom] = useState(0);
  // The rows are laid out from the room at rest (the most seen in this window), so they never move as the composer grows.
  const shape = `${width}x${height}:${collapsed}`;
  const [restRoom, setRestRoom] = useState({ shape: '', room: 0 });
  const onRoom = (r: number) => {
    setRoom(r);
    setRestRoom((was) => (was.shape !== shape || r > was.room ? { shape, room: r } : was));
  };

  // P-80: the day's few, picked on arrival and held while it's on screen (a line that's gone, by Undo, leaves).
  const [arrived] = useState(() => new Date());
  const [held, setHeld] = useState<Id[]>();
  const fresh = useMemo(() => (held ? undefined : pickFeed(data, arrived)), [held, data, arrived]);
  if (!held && ready && fresh) setHeld(fresh);
  const ids = held ?? fresh ?? EMPTY;
  const lines = useMemo(() => feedLines(data, ids, arrived, { shading: warm }), [data, ids, arrived, warm]);

  // P-81: the nodes lighting would show (and P-82's landed one), laid out at rest, so the band above the
  // lines is kept for them before anything lights: lighting never moves a line (fold-in 7).
  const span = Math.max(0, width - 2 * SIDE);
  const landedTo = landed && data.activities[landed.activityId] && data.threads[landed.threadId] ? landed : undefined;
  const nodes = useMemo(() => litNodes(data, ids, { now: arrived, shading: warm, extra: landedTo ? [landedTo.threadId] : [] }), [data, ids, arrived, warm, landedTo]);
  const band = useMemo(() => nodePlaces(nodes, span), [nodes, span]);
  // The band only grows while it's on screen (a node that goes leaves a gap rather than moving the lines).
  const [bandRows, setBandRows] = useState({ shape: '', rows: 0 });
  if (bandRows.shape !== shape || band.rows > bandRows.rows) {
    const rows = Math.max(band.rows, bandRows.shape === shape ? bandRows.rows : 0);
    if (rows !== bandRows.rows || bandRows.shape !== shape) setBandRows({ shape, rows });
  }
  const guides = useMemo(() => restGuides(data).length > 0, [data]);
  // Clear of the guiding stars (drawn by the home, high up) and of the band.
  const top = mapTop({ guideTop: guides ? Math.max(8, Math.ceil(GUIDE_BAND_END * height) + 12 - insets.top) : undefined, band: bandHeight(Math.max(band.rows, bandRows.rows)) });
  const layout = restLayout({ room: restRoom.shape === shape ? Math.max(restRoom.room, room) : room, top, fontScale });
  // The ground stands below the rows while it still fits there (typing's suggestions take its place).
  // While suggestions are open the composer grows over where the ground stood: it hides in the same frame
  // (said by the composer before paint; the room measured after would leave it a frame under the grabber).
  const [suggesting, setSuggesting] = useState(false);
  const ground = room > 0 && layout.ground && room - (top + layout.rowH * FEED_ROWS) >= GROUND_H - 0.5 && !keyboardUp && !suggesting;
  useLayoutEffect(() => rest({ ground, lift: composerH }), [rest, ground, composerH]);

  // P-84: the sheet's search lights the stars above. Every matching line is a star in the sky left in
  // view over the lowered sheet, placed from its id; a bright line of the feed that matches stays where
  // it is, and the rest of the feed dims to its light; the nodes the matches went toward light. Placing
  // is sticky: as the query changes, a star that stays never moves. Decorative: the sheet's results are
  // what a screen reader reads.
  const query = useDeferredValue(useStore((st) => st.sheetSearch));
  const searching = sheet.open && !!query.trim() && !layout.list;
  const matchIds = useMemo(() => (searching ? searchLineIds(data, query) : EMPTY), [searching, data, query]);
  const skyBottom = Math.max(0, height - searchSheetHeight(sheet.height, height) - insets.top);
  const searchSky = useMemo(() => {
    if (!searching) return undefined;
    const match = new Set(matchIds);
    const bright = lines.filter((l) => match.has(l.id) && feedRowShown(l.row, { top, rowH: layout.rowH, room: Math.min(room, skyBottom) }));
    const rows = Math.max(0, Math.floor((skyBottom - top) / STAR_ROW_H));
    const taken: number[] = [];
    for (let r = 0; r < rows; r++) {
      const y = top + r * STAR_ROW_H;
      if (bright.some((l) => top + l.row * layout.rowH < y + STAR_ROW_H && y < top + (l.row + 1) * layout.rowH)) taken.push(r);
    }
    const feedIds = new Set(bright.map((l) => l.id));
    const nodeIds = new Set(litLinks(data, matchIds, nodes.map((n) => n.id)).map((k) => k.to));
    return { match, rows, taken, starIds: matchIds.filter((id) => !feedIds.has(id)), nodes: nodeIds };
  }, [searching, matchIds, lines, top, layout.rowH, room, skyBottom, data, nodes]);
  // Sticky: each placing starts from the last (React's "adjust state while rendering" pattern).
  const starKey = searchSky ? `${searchSky.rows}|${searchSky.taken.join(',')}|${searchSky.starIds.join(',')}` : '';
  const [placed, setPlaced] = useState<{ key: string; stars: Record<Id, StarPlace> }>({ key: '', stars: {} });
  if (placed.key !== starKey) setPlaced({ key: starKey, stars: searchSky ? placeStars(placed.stars, searchSky.starIds, { rows: searchSky.rows, taken: searchSky.taken }) : {} });
  const stars = placed.stars;
  // The sheet out and at rest covers the composer (both detents) and, unless its search shows the sky, the map.
  const covered = sheet.settled;
  const [fieldH, setFieldH] = useState(0);
  useEffect(() => () => rest(undefined), [rest]);

  // Return sent a line up (or one logged once the data was back), or a line on the map was tapped:
  // it rises, a session over the home (P-73). Read from the store, not the render: a rise just left has
  // ended its session by now. In the same commit as the Return, so a key pressed right after it
  // reaches the rise (audit F3).
  useLayoutEffect(() => {
    const id = useStore.getState().kept?.activityId;
    if (shown && id) router.push(subjectHref({ kind: 'line', activityId: id }));
  }, [shown, keptId]);
  // Focus is in the field on open and on coming back down (web: a keyboard is there already; native
  // would raise one unasked). Lighting the map (`/` ↔ `/sky`) doesn't move it: the chip keeps it.
  useEffect(() => {
    if (shown && web) focusLogBox();
  }, [shown, focusLogBox]);

  // P-81: "I'm not sure" lights the map (`/sky`), and again dims it; Esc and Back dim it too (the sheet first).
  // Lighting is a navigation that lands a moment later: an Esc pressed before it has still dims it (as audit F3's tilt).
  const lighting = useRef<false | 'asked' | 'esc'>(false);
  const toggle = () => {
    clearLanded();
    if (lit) dim();
    else {
      lighting.current = 'asked';
      router.push(subjectHref({ kind: 'whys' }));
      // Only while it's on its way (it lands within a frame or two).
      setTimeout(() => (lighting.current = false), 1500);
    }
  };
  const litNow = useRef(lit);
  useLayoutEffect(() => {
    litNow.current = lit;
    if (!lit) return;
    const esc = lighting.current === 'esc';
    lighting.current = false;
    if (esc) dim();
  }, [lit]);
  useEffect(() => {
    if (!shown || !web || typeof document === 'undefined') return;
    // Something nearer (the suggestions, the @ menu, the sheet) handles its own Esc first; judged once it has.
    const onKey = (e: KeyboardEvent) =>
      e.key === 'Escape' &&
      setTimeout(() => {
        if (e.defaultPrevented || useStore.getState().sheet.open) return;
        if (litNow.current) dim();
        else if (lighting.current) lighting.current = 'esc';
      }, 0);
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [shown]);

  const open = (id: Id) => {
    tilting();
    reopenLine(id);
  };
  // A lit node opens its session (B-08's camera): a why its star (or, with one wander, its trail); a wander its trail, with What's next.
  const openNode = (n: LitNode) => {
    clearLanded();
    tilting();
    router.push(n.why ? starTarget(useStore.getState().data, n.id) : subjectHref({ kind: 'wander', id: n.id }));
  };

  // P-79: "I'm not sure" — a toggle (fold-in 6): pressed while the map is lit.
  const chip = unsureChip(lit);
  const chips: ReactNode = (
    <View style={styles.chips}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={UNSURE_NAME}
        {...(web ? ({ 'aria-pressed': chip.pressed } as object) : { accessibilityState: { checked: chip.pressed } })}
        testID="unsure"
        style={[styles.unsure, chip.pressed && styles.unsureOn]}>
        <Svg width={14} height={14} viewBox="0 0 24 24" {...decorative}>
          <Path
            d="M12 2 L13.6 10.4 L22 12 L13.6 13.6 L12 22 L10.4 13.6 L2 12 L10.4 10.4Z"
            {...(chip.mark === 'filled' ? { fill: N.bg } : { fill: 'none', stroke: warm ? N.lantern : N.silver, strokeWidth: 1.8, strokeLinejoin: 'round' as const })}
          />
        </Svg>
        <Text style={[styles.unsureText, chip.pressed && styles.unsureTextOn]}>I’m not sure</Text>
      </Pressable>
      {/* P-73: the done chip, beside it — once you've typed, and while it's on (sticky). Nothing moves when it comes. */}
      {(typed || doneChip) && (
        <Pressable
          onPress={() => setDoneChip(!doneChip)}
          role="switch"
          aria-checked={doneChip}
          accessibilityState={{ checked: doneChip }}
          accessibilityLabel="done"
          testID="done-chip"
          style={[styles.chip, doneChip && styles.chipOn]}>
          <Text style={[styles.chipText, doneChip && styles.chipTextOn]}>
            <Text {...decorative}>✓ </Text>done
          </Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <View style={styles.screen} testID="trailhead" {...{ dataSet: { ...passage.mark.dataSet, lit: lit ? 'on' : 'off' } }}>
      {/* Under the open sheet (a modal dialog), the home is out of reach of assistive tech and the keyboard. */}
      <View ref={homeRef} style={styles.fill} {...(sheet.open ? decorative : {})}>
        <ShownProvider value={!sheet.open}>
          <SafeAreaView style={styles.fill} edges={['top']}>
            <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              {/* Drawn bottom up: the composer at the foot, the live map above it. Read top down: the composer, then "Recent". */}
              <View style={styles.stack}>
                <ScrollView
                  testID="trailhead-scroll"
                  // Not a Tab stop of its own (P-65 fix): the field and the buttons are.
                  {...(web ? { tabIndex: -1 } : {})}
                  style={styles.composerScroll}
                  contentContainerStyle={[styles.panel, width < 360 && styles.panelNarrow, { paddingBottom: 12 + insets.bottom }]}
                  onLayout={(e) => setComposerH(Math.round(e.nativeEvent.layout.height))}
                  keyboardShouldPersistTaps="handled">
                  <View style={styles.inner} testID="composer">
                    <Text accessibilityRole="header" style={collapsed ? styles.collapsed : styles.prompt} testID="composer-heading">
                      {PROMPT}
                    </Text>
                    {/* Under the settled sheet the field isn't drawn (as Map's slot wasn't): the sheet's own log box shares the
                        line, so its words, @ highlight and chips exist once. Its room is kept, so nothing above it moves. */}
                    <View onLayout={(e) => !covered && setFieldH(Math.round(e.nativeEvent.layout.height))} style={covered ? { height: fieldH } : undefined}>
                      {!covered && (
                        <Composer night autocomplete arrow openWanders placeholder="nothing yet is fine" label={PROMPT} logOptions={logOptions} chips={chips} onSuggesting={setSuggesting}
                          onLogged={() => {
                            // The line rises: an Esc before it lands still comes back down (audit F3).
                            tilting();
                            return true;
                          }}
                        />
                      )}
                    </View>
                  </View>
                  {/* P-83: the grabber, drawn at the composer's top edge, read after its controls: a 44 pt button (tap, Enter)
                      with an expanded state; a swipe up that starts on it pulls the sheet out (never one over the field). */}
                  <View nativeID={GRAB_ID} {...sheet.handlePan.panHandlers} style={styles.grabWrap}>
                    <Pressable
                      ref={handleRef}
                      testID="home-sheet-handle"
                      onPress={sheet.tapOpen}
                      accessibilityRole="button"
                      accessibilityLabel={SHEET_NAME}
                      aria-expanded={sheet.open}
                      accessibilityState={{ expanded: sheet.open }}
                      style={styles.grabber}>
                      <View style={styles.grabBar} {...decorative} />
                    </Pressable>
                  </View>
                </ScrollView>
                <View style={styles.map} onLayout={(e) => onRoom(Math.round(e.nativeEvent.layout.height))} testID="live-map" {...{ dataSet: { mode: layout.list ? 'list' : 'picture' } }}>
                  {room > 0 && !(covered && !searchSky) && (
                    <Feed
                      lines={lines}
                      list={layout.list}
                      top={top}
                      rowH={layout.rowH}
                      room={room}
                      width={width}
                      onOpen={open}
                      lit={lit}
                      nodes={nodes}
                      places={band.places}
                      landed={landedTo}
                      onNode={openNode}
                      search={searchSky && { match: searchSky.match, nodes: searchSky.nodes }}
                    />
                  )}
                  {searchSky && <SearchStars stars={stars} top={top} bottom={skyBottom} width={width} />}
                </View>
              </View>
              {/* The toast sits above the composer (and so above the keyboard); the sheet has its own. */}
              {!sheet.settled && (
                <View style={[styles.toastSlot, { bottom: composerH }]} pointerEvents="box-none">
                  <Toast />
                </View>
              )}
            </KeyboardAvoidingView>
          </SafeAreaView>
          {/* "Map lit" is said once it lights (no count); the chip's pressed state says it from then on. */}
          {web && (
            <View style={styles.srOnly} role="status" aria-live="polite" testID="lit-said">
              <Text>{lit ? 'Map lit' : ''}</Text>
            </View>
          )}
        </ShownProvider>
      </View>
      {/* The sheet, in the night palette (P-83). */}
      <DarkProvider value>
        <HomeSheet sheet={sheet} tabRefs={tabRefs} />
      </DarkProvider>
    </View>
  );
}

const EMPTY: Id[] = [];

type FeedProps = {
  lines: FeedLine[];
  list: boolean;
  top: number;
  rowH: number;
  room: number;
  width: number;
  onOpen: (id: Id) => void;
  lit: boolean;
  nodes: LitNode[];
  places: Record<Id, NodePlace>;
  landed?: { activityId: Id; threadId: Id };
  onNode: (n: LitNode) => void;
  /** P-84: the sheet's search — the lines it matches (the rest dim to their lights) and the nodes they went toward (lit). */
  search?: { match: Set<Id>; nodes: Set<Id> };
};

/**
 * The live map (P-80): each line a small light (its glow is its warmth: age, never faded text) with its
 * words and when, in words. A "Recent" group of buttons, newest first; a tap opens the line. In the
 * picture each sits in its row and indent from its id; at the largest text (or with too little room) a
 * plain list. P-81: lit, the whys and wanders are named nodes in the band above (a "Whys and wanders"
 * group after "Recent"), links drawn from each line to the nodes it went toward (and said in its
 * name); the lines stay exactly as they were. P-82: a landed line is drawn in its node, not in its row.
 * Nothing moves but a landing (≤ 600 ms, picture only; under Reduce Motion it just appears there).
 */
function Feed({ lines, list, top, rowH, room, width, onOpen, lit, nodes, places, landed, onNode, search }: FeedProps) {
  const span = Math.max(0, width - 2 * SIDE);
  const now = new Date();
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const data = useStore((st) => st.data);
  // At rest the landed line is drawn in its node (P-82), not in its row; the others keep their places.
  // Lit, it stays in its row, linked to the node like every line.
  const landing = !lit ? landed : undefined;
  const shown = (list ? lines : lines.filter((l) => feedRowShown(l.row, { top, rowH, room }))).filter((l) => l.id !== landing?.activityId);
  const litNodesShown = search ? nodes.filter((n) => places[n.id] && search.nodes.has(n.id)) : lit ? nodes.filter((n) => places[n.id]) : [];
  const links: LitLink[] = lit && !search ? litLinks(data, shown.map((l) => l.id), litNodesShown.map((n) => n.id)) : [];
  const toward = (id: Id) => links.filter((k) => k.from === id).map((k) => byId.get(k.to)?.name ?? '');

  const items = shown.map((l) => {
    const left = SIDE + l.x * span * INDENT;
    // P-84: a line the search doesn't match dims to its light (its row is free for the search's stars).
    if (search && !search.match.has(l.id) && !list) {
      return (
        <View key={l.id} testID="dim-line" style={[styles.line, styles.dim, { top: top + l.row * rowH, height: rowH, left }]} {...decorative}>
          <View style={styles.light}>
            <View style={styles.dot} />
          </View>
        </View>
      );
    }
    return (
      <Pressable
        key={l.id}
        onPress={() => onOpen(l.id)}
        accessibilityRole="button"
        accessibilityLabel={lit ? litLineName(l, toward(l.id)) : feedName(l)}
        testID="rest-line"
        {...{ dataSet: { state: l.lit ? 'lit' : 'settled' } }}
        style={list ? styles.listLine : [styles.line, { top: top + l.row * rowH, height: rowH, left, maxWidth: width - left - SIDE }]}>
        <View style={styles.light} {...decorative}>
          {l.glow > 0 && <View testID="rest-glow" style={[styles.halo, { opacity: 0.45 * l.glow }]} />}
          <View style={styles.dot} />
        </View>
        <Text style={styles.words} numberOfLines={list ? undefined : 1}>
          {l.text}
          <Text style={styles.when}>
            <Text {...decorative}> · </Text>
            {l.when}
          </Text>
        </Text>
      </Pressable>
    );
  });

  const nodeItems = litNodesShown.map((n) => (
    <Pressable
      key={n.id}
      onPress={() => onNode(n)}
      accessibilityRole="button"
      accessibilityLabel={nodeName(n, now)}
      testID="lit-node"
      {...{ dataSet: { kind: n.why ? 'why' : 'wander', id: n.id } }}
      style={list ? styles.listLine : [styles.node, { left: SIDE + places[n.id].x, top: BAND_TOP + places[n.id].row * NODE_H, width: places[n.id].w }]}>
      <NodeMark why={n.why} heat={n.heat} />
      <Text style={styles.nodeName} numberOfLines={list ? undefined : 1}>
        {n.name}
      </Text>
    </Pressable>
  ));

  const landedNode = landing ? byId.get(landing.threadId) : undefined;
  const landedLine = landing ? data.activities[landing.activityId] : undefined;
  const landed_ =
    landedNode && landedLine ? (
      <Landing key={landing!.activityId} list={list} node={landedNode} text={landedWords(landedLine.text, landedNode.name)} at={places[landedNode.id]} from={room} span={span} />
    ) : null;

  if (list) {
    return (
      <ScrollView {...(web ? { tabIndex: -1 } : {})} style={styles.fill} contentContainerStyle={[styles.list, { paddingTop: Math.min(top, 8) }]}>
        {items.length > 0 && (
          <View role="group" aria-label="Recent">
            {items}
          </View>
        )}
        {/* Landed, or lit at the largest text: after the lines (nothing above them moves). */}
        {landed_}
        {nodeItems.length > 0 && (
          <View role="group" aria-label="Whys and wanders" testID="lit-nodes">
            {nodeItems}
          </View>
        )}
      </ScrollView>
    );
  }
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* The links: behind the words, decorative (each line's name says where it went), ≥ 3:1 on the sky. */}
      {links.length > 0 && (
        <Svg width={width} height={room} style={StyleSheet.absoluteFill} pointerEvents="none" {...decorative} testID="lit-links">
          {/* Routed round the words (P-81 rework): along the left gutter and the gaps between rows, never across a name (`litGeometry`). */}
          {litGeometry({ lines: shown, places, links, width, top, rowH }).routes.map((r) => (
            <Polyline
              key={`${r.from}>${r.to}`}
              points={r.points.map((pt) => `${pt.x},${pt.y}`).join(' ')}
              fill="none"
              stroke={N.faint}
              strokeWidth={1.5}
              strokeDasharray="3 4"
              strokeLinecap="round"
              strokeLinejoin="round"
              testID="lit-link"
            />
          ))}
        </Svg>
      )}
      {items.length > 0 && (
        <View role="group" aria-label="Recent" style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {items}
        </View>
      )}
      {nodeItems.length > 0 && (
        <View role="group" aria-label="Whys and wanders" style={StyleSheet.absoluteFill} pointerEvents="box-none" testID="lit-nodes">
          {nodeItems}
        </View>
      )}
      {landed_}
    </View>
  );
}

/**
 * P-84: the search's stars, in the sky above the lowered sheet — each a small star with its words and
 * when, in its row and indent from its id; one with no free row is a star without words. Decorative
 * (the sheet's results are the accessible source); nothing moves, so Reduce Motion has nothing to still.
 */
function SearchStars({ stars, top, bottom, width }: { stars: Record<Id, StarPlace>; top: number; bottom: number; width: number }) {
  const data = useStore((st) => st.data);
  const span = Math.max(0, width - 2 * SIDE);
  const now = new Date();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" {...decorative} testID="search-sky">
      {Object.entries(stars).map(([id, p]) => {
        const words = starWords(data, id, now);
        if (!words) return null;
        if (p.row === undefined) {
          return <View key={id} testID="search-point" style={[styles.point, { left: SIDE + p.x * span, top: top + (p.y ?? 0) * Math.max(0, bottom - top - 8) }]} />;
        }
        const left = SIDE + p.x * span * INDENT;
        return (
          <View key={id} testID="search-star" {...{ dataSet: { id } }} style={[styles.line, { top: top + p.row * STAR_ROW_H, height: STAR_ROW_H, left, maxWidth: width - left - SIDE }]}>
            <Svg width={LIGHT} height={LIGHT} viewBox="0 0 24 24">
              <Path d={STAR_PATH} fill={N.lantern} />
            </Svg>
            <Text style={styles.words} numberOfLines={1}>
              {words.text}
              <Text style={styles.when}> · {words.when}</Text>
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** A node's mark: a star for a why, a round light for a wander — one size; warmth only as its glow (none with the shading off). */
function NodeMark({ why, heat }: { why: boolean; heat: number }) {
  return (
    <View style={styles.mark} {...decorative}>
      {heat > 0 && <View testID="node-glow" style={[styles.markGlow, { opacity: 0.55 * heat }]} />}
      <Svg width={NODE_GLYPH} height={NODE_GLYPH} viewBox="0 0 24 24">
        {why ? <Path d={STAR_PATH} fill={N.ink} /> : <Circle cx={12} cy={12} r={7} fill={N.ink} />}
      </Svg>
    </View>
  );
}

/**
 * P-82: a line that just went toward a wander, in its node — its mark (warm: just walked) and
 * "washed the car → tidy" in its place in the band. It travels up from the composer into place
 * (≤ 600 ms, picture only: it never takes a tap); under Reduce Motion it's simply there.
 */
function Landing({ list, node, text, at, from, span }: { list: boolean; node: LitNode; text: string; at?: NodePlace; from: number; span: number }) {
  const reduce = useReduceMotion();
  const top = at ? BAND_TOP + at.row * NODE_H : 0;
  // In its node's row, from its node's place — or as far in as its words need, so "→ <wander>" is never cut off.
  const left = at ? SIDE + Math.max(0, Math.min(at.x, span - nodeWidth(text, span))) : 0;
  const [rise] = useState(() => new Animated.Value(list || !at ? 0 : Math.max(0, from - top)));
  useEffect(() => {
    if (reduce) return rise.setValue(0);
    const t = Animated.timing(rise, { toValue: 0, duration: LAND_MS, easing: Easing.out(Easing.cubic), useNativeDriver: !web });
    t.start();
    return () => t.stop();
  }, [rise, reduce]);
  const words = (
    <Text style={styles.landedWords} numberOfLines={list ? undefined : 1}>
      {text}
    </Text>
  );
  if (list || !at) {
    return (
      <View style={styles.listLine} testID="landed" {...{ dataSet: { node: node.id } }}>
        <NodeMark why={node.why} heat={node.heat} />
        {words}
      </View>
    );
  }
  return (
    <Animated.View
      pointerEvents="none"
      testID="landed"
      {...{ dataSet: { node: node.id } }}
      style={[styles.landed, { left, top, transform: [{ translateY: rise }] }]}>
      <NodeMark why={node.why} heat={node.heat} />
      {words}
    </Animated.View>
  );
}

const LIGHT = 16;
const styles = StyleSheet.create({
  // The home draws the night behind it (P-74).
  screen: { flex: 1 },
  fill: { flex: 1 },
  stack: { flex: 1, flexDirection: 'column-reverse' },
  map: { flex: 1, minHeight: 0 },
  // The composer: its own panel at the foot, never taller than the screen (then it scrolls).
  composerScroll: { flexGrow: 0, flexShrink: 1 },
  panel: {
    // Room at the top for the grabber's bar (its 44 pt target reaches into the heading's row).
    paddingTop: 30,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(14, 16, 32, 0.94)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: N.line,
  },
  // 200 % zoom: room for the field's placeholder beside the send ↑.
  panelNarrow: { paddingHorizontal: 8 },
  inner: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: 6 },
  prompt: { fontFamily: display, fontWeight: '700', fontSize: 22, lineHeight: 28, color: N.ink, letterSpacing: -0.4, paddingHorizontal: 4 },
  // Collapsed (keyboard up, short window, large text): out of sight, still the page's heading for a screen reader.
  collapsed: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
  grabWrap: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', userSelect: 'none' },
  grabber: { minHeight: 44, minWidth: 88, paddingTop: 10, alignItems: 'center' },
  grabBar: { width: 40, height: 5, borderRadius: 3, backgroundColor: N.faint },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8 },
  unsure: { maxWidth: '100%', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1.5, borderColor: N.line },
  // Pressed: a filled chip with a filled star and dark words (not colour alone).
  unsureOn: { backgroundColor: N.ink, borderColor: N.ink },
  unsureText: { color: N.ink, fontSize: 15, fontWeight: '500', flexShrink: 1 },
  unsureTextOn: { color: N.bg, fontWeight: '600' },
  // The done chip (P-73): quiet off, ink on; one tap toggles.
  chip: { minHeight: 44, minWidth: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderRadius: 22, borderWidth: 1.5, borderColor: N.line, borderStyle: 'dashed' },
  chipOn: { borderStyle: 'solid', borderColor: N.ink },
  chipText: { color: N.muted, fontSize: 15 },
  chipTextOn: { color: N.ink, fontWeight: '600' },
  toastSlot: { position: 'absolute', left: 0, right: 0 },
  srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
  // The live map's lines: a light and words, no box (nothing chat-like); 44 pt tall at least.
  line: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  list: { paddingHorizontal: SIDE, paddingBottom: 8 },
  listLine: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingVertical: 6 },
  light: { width: LIGHT, height: LIGHT, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: LIGHT, height: LIGHT, borderRadius: LIGHT / 2, backgroundColor: N.lantern },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: N.ink },
  words: { flexShrink: 1, color: N.ink, fontSize: 15, lineHeight: 20 },
  when: { color: N.muted },
  // P-84: a line the search doesn't match: only its light, dimmed.
  dim: { opacity: 0.35 },
  point: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: N.lantern, opacity: 0.8 },
  // P-81: a node — its mark and its name, one size for all, a 44 pt row.
  node: { position: 'absolute', height: NODE_H, flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 },
  mark: { width: NODE_GLYPH, height: NODE_GLYPH, alignItems: 'center', justifyContent: 'center' },
  markGlow: { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: N.lantern },
  nodeName: { flexShrink: 1, color: N.ink, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  // P-82: the landed line, in its node (lantern words: 4.5:1 and more on the sky).
  landed: { position: 'absolute', right: SIDE, height: NODE_H, flexDirection: 'row', alignItems: 'center', gap: 8 },
  landedWords: { flexShrink: 1, color: N.lantern, fontSize: 15, lineHeight: 20, fontWeight: '500' },
});
