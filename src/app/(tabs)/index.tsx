import { Link, useFocusEffect } from 'expo-router';
import { ComponentRef, useCallback, useMemo, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { decorative } from '@/components/a11y';
import { moveFocus, useFirstRun } from '@/components/FirstRun';
import { ExploreIcon, homeContentWidth, LiveGraph, useGraphIcon } from '@/components/graph/HomeGraph';
import { HomeAboveLog } from '@/components/graph/NodeContext';
import { Screen } from '@/components/Screen';
import { headerWhys } from '@/domain/overview';
import { restingFace } from '@/domain/slot';
import { useStore } from '@/store/useStore';
import { C, s } from '@/theme';

const EXAMPLES = ['practiced guitar', 'edited a clip', 'leg day', 'sketched for fun'];

/**
 * Home is the graph (P-34): your whys, the wanders feeding them and your recent logs, with the log
 * box at the bottom. With no wanders, your logs show on their own; with nothing at all, the welcome.
 * The list of cards is the Wanders tab; the single-centre view is Explore.
 */
export default function Home() {
  const data = useStore((st) => st.data);
  const setDraft = useStore((st) => st.setDraft);
  const dismissBridge = useStore((st) => st.dismissBridge);
  const select = useStore((st) => st.select);
  const showHomeFace = useStore((st) => st.showHomeFace);
  const ready = useStore((st) => st.storage.state === 'ready');
  // The bridge and a selected wander (P-35) are one moment on Home: they go when Home is left. Home
  // stays mounted in the tabs, so this runs on blur, and on focus too (in case anything set them
  // while Home was in the background).
  useFocusEffect(
    useCallback(() => {
      const leave = () => {
        dismissBridge();
        select(undefined);
      };
      leave();
      return leave;
    }, [dismissBridge, select]),
  );
  // The slot (P-49) opens on What's next whenever Home is shown (on Log while there's no wander),
  // once the data is there to say which.
  useFocusEffect(
    useCallback(() => {
      if (ready) showHomeFace(restingFace(useStore.getState().data));
    }, [ready, showHomeFace]),
  );
  const isEmpty = Object.keys(data.activities).length === 0 && Object.keys(data.threads).length === 0;
  // Earned whys in the Wanders tab's header order, so the graph and the headers agree.
  const surfacing = useMemo(() => headerWhys(data), [data]);
  const wanders = useMemo(() => Object.values(data.threads).some((t) => !t.hidden), [data]);
  const graphIcon = useGraphIcon();
  // Search and Settings (the way to your backup) always stay on screen: on a narrow window (125 %
  // zoom and more) the ⋔ icon goes, the title steps down a size, and as a last resort it truncates.
  const { width } = useWindowDimensions();
  const tightHeader = homeContentWidth(width) < 270;
  // The first run (P-36), over the empty graph; when ③ goes, focus moves to the top of Home.
  const title = useRef<ComponentRef<typeof Text>>(null);
  const firstRun = useFirstRun(() => moveFocus(title.current));

  return (
    <Screen bridge slot aboveLog={<HomeAboveLog style={styles.bridge} />}>
      <View style={styles.header}>
        <Text ref={title} {...(Platform.OS === 'web' ? { tabIndex: -1 } : {})} style={[s.h1, styles.title, tightHeader && { fontSize: 24 }]} numberOfLines={1} accessibilityRole="header">
          Wanderment
        </Text>
        <View style={styles.icons}>
          {wanders && graphIcon && <ExploreIcon style={styles.icon} />}
          <Link href="/search" asChild>
            <Pressable accessibilityRole="button" accessibilityLabel="Search" style={styles.icon}>
              <Text style={{ fontSize: 26, lineHeight: 30, color: C.muted }} {...decorative}>
                ⌕
              </Text>
            </Pressable>
          </Link>
          <Link href="/settings" asChild>
            <Pressable accessibilityRole="button" accessibilityLabel="Settings and backup" style={styles.icon}>
              <Text style={{ fontSize: 20, color: C.muted }} {...decorative}>
                ⚙︎
              </Text>
            </Pressable>
          </Link>
        </View>
      </View>

      <LiveGraph data={data} surfacing={surfacing} firstRun={firstRun} />

      {isEmpty && (
        <View style={{ gap: 18, marginTop: 12 }}>
          <Text style={styles.hero}>Log what you just did.</Text>
          <Text style={s.body}>
            Anything counts. Connect it to what it’s <Text style={{ fontStyle: 'italic' }}>to</Text> now, later, or never — no big reasons needed. Over time you’ll see where your energy goes.
          </Text>
          <Text style={s.meta}>Try one — tap to fill the box below</Text>
          <View style={styles.wrap}>
            {EXAMPLES.map((e) => (
              <Pressable key={e} onPress={() => setDraft({ text: e })} style={s.chip} accessibilityRole="button">
                <Text style={s.chipText}>{e}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.meta}>
            Tip: type <Text style={styles.at}>@</Text> to say what it was to, e.g. “scales @play guitar”.
          </Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { flexShrink: 1 },
  icons: { flexDirection: 'row', flexShrink: 0 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  hero: { fontSize: 26, fontWeight: '600', color: C.ink, lineHeight: 32 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  at: { backgroundColor: C.accentTint, color: C.accentInk },
  bridge: { marginHorizontal: 12, marginTop: 8 },
});
