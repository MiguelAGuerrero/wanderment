import { Link } from 'expo-router';
import { memo, useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { decorative } from '@/components/a11y';
import { suggestDoing } from '@/domain/compose';
import { nightHeatInk } from '@/domain/heat';
import { LooseLog, PictureItem } from '@/domain/overview';
import { Id } from '@/domain/types';
import { useStore } from '@/store/useStore';
import { M, sm } from '@/theme'; // dark Map: the night palette

/** A log this fresh when its row appears has just landed: it glows once. */
const FRESH_MS = 5000;
const GLOW_MS = 1400;
/** Nodes offered to attach to, at most. */
const CHOICES = 4;

/**
 * P-60: with wanders present, your last few logs that name no wander, as a quiet strip under the
 * graph: P-57's rows (a heat-coloured dot and the log's words, cut short; the full words are its
 * name), newest first. A tap opens a tiny chooser under the row: "→ to <node>" attaches it (as the
 * Activities section's "Attach…" does), "Open" opens the log. With none, nothing is drawn.
 */
export function LooseLogs({ logs, nodes }: { logs: LooseLog[]; nodes: PictureItem[] }) {
  const [open, setOpen] = useState<Id>();
  const toggle = useCallback((id: Id) => setOpen((o) => (o === id ? undefined : id)), []);
  if (!logs.length) return null;
  return (
    <View role="list" aria-label="Logs without a wander" testID="loose-logs" style={styles.strip}>
      {logs.map((l) => (
        <LooseRow key={l.id} log={l} nodes={nodes} open={open === l.id} toggle={toggle} />
      ))}
    </View>
  );
}

// Memoised by value: a log re-renders only the row it adds (Home must not get slower); the nodes only matter while its chooser is open.
const LooseRow = memo(
  function LooseRow({ log: l, nodes, open, toggle }: { log: LooseLog; nodes: PictureItem[]; open: boolean; toggle: (id: Id) => void }) {
    const glow = useGlow(l.createdAt);
    return (
      <View role="listitem">
        <Pressable
          onPress={() => toggle(l.id)}
          accessibilityRole="button"
          accessibilityLabel={l.text}
          aria-expanded={open}
          testID={`loose-${l.id}`}
          {...({ dataSet: { heat: l.heat.toFixed(2), ...(glow.on && { glow: 'true' }) } } as object)}
          style={styles.row}>
          <View style={styles.dotCol} {...decorative}>
            {glow.on &&
              (Platform.OS === 'web' ? (
                <View style={[styles.halo, styles.haloWeb]} />
              ) : (
                <Animated.View style={[styles.halo, { opacity: glow.v.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }), transform: [{ scale: glow.v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }] }]} />
              ))}
            <View style={[styles.dot, { backgroundColor: nightHeatInk(l.heat) }]} />
          </View>
          <Text style={styles.text} numberOfLines={1}>
            {l.text}
          </Text>
        </Pressable>
        {open && <Chooser log={l} nodes={nodes} />}
      </View>
    );
  },
  (a, b) => a.log.id === b.log.id && a.log.text === b.log.text && a.log.heat === b.log.heat && a.open === b.open && a.toggle === b.toggle && (!b.open || a.nodes === b.nodes),
);

/** The tiny chooser: the nodes to attach to (a word-based guess first, then the picture's whys and wanders), and Open. */
function Chooser({ log, nodes }: { log: LooseLog; nodes: PictureItem[] }) {
  const data = useStore((st) => st.data);
  const attach = useStore((st) => st.attach);
  const guess = suggestDoing(data, log.text)?.id;
  const ids = [...new Set([guess, ...nodes.map((n) => n.id)].filter((id): id is Id => !!id && !!data.threads[id] && !data.threads[id].hidden))].slice(0, CHOICES);
  return (
    <View style={styles.chooser} role="group" aria-label={`Attach “${log.text}”`}>
      {ids.map((id) => (
        <Pressable key={id} onPress={() => attach(log.id, id)} style={[sm.chip, sm.chipAccent]} accessibilityRole="button" accessibilityLabel={`→ to ${data.threads[id].name}: attach`}>
          <Text style={[sm.chipText, sm.chipAccentText]} numberOfLines={1}>
            → to {data.threads[id].name}
          </Text>
        </Pressable>
      ))}
      <Link href={`/activity/${log.id}`} asChild>
        <Pressable style={sm.chip} accessibilityRole="link">
          <Text style={sm.chipText}>Open</Text>
        </Pressable>
      </Link>
    </View>
  );
}

/** A row whose log has just landed glows once (a halo round its dot), never under Reduce Motion. */
function useGlow(createdAt: string) {
  const [v] = useState(() => new Animated.Value(0));
  const [on, setOn] = useState(false);
  useEffect(() => {
    // Checked once, when the row appears: only a log that has just landed glows.
    if (Date.now() - Date.parse(createdAt) >= FRESH_MS) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Asked here, not from a hook's first (false) value, so it never starts before the answer.
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!live || reduce) return;
      setOn(true);
      // On the web a CSS animation (no work on the main thread per frame); natively, the native driver.
      if (Platform.OS === 'web') {
        timer = setTimeout(() => live && setOn(false), GLOW_MS);
        return;
      }
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: GLOW_MS / 2, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: GLOW_MS / 2, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start(() => live && setOn(false));
    });
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [createdAt, v]);
  return { v, on };
}

const styles = StyleSheet.create({
  strip: { marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  // The dot in a fixed 14 px column (as P-57's rows), the halo centred on it.
  dotCol: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  halo: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: M.accent },
  haloWeb: {
    opacity: 0,
    ...({
      animationKeyframes: [{ '0%': { opacity: 0, transform: 'scale(1)' }, '50%': { opacity: 0.45, transform: 'scale(2.4)' }, '100%': { opacity: 0, transform: 'scale(2.4)' } }],
      animationDuration: `${GLOW_MS}ms`,
      animationTimingFunction: 'ease-out',
    } as object),
  },
  text: { flex: 1, fontSize: 15, color: M.ink },
  chooser: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingLeft: 24, paddingBottom: 8 },
});
