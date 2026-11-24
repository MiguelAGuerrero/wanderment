import { Link, router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ComponentRef, useCallback, useMemo, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { decorative } from '@/components/a11y';
import { moveFocus, useFirstRun } from '@/components/FirstRun';
import { DarkProvider } from '@/components/palette';
import { usePassage, Veil } from '@/components/passage';
import { ExploreIcon, homeContentWidth, LiveGraph, useGraphIcon } from '@/components/graph/HomeGraph';
import { useScopeNav } from '@/components/graph/scopeNav';
import { Screen } from '@/components/Screen';
import { BackGlyph, SearchGlyph, SettingsGlyph } from '@/components/icons';
import { HomeSheet, SheetHandle, useHomeSheet } from '@/components/sheet/HomeSheet';
import { ShownProvider, useWhileShown } from '@/components/shown';
import { headerWhys } from '@/domain/overview';
import { restingFace } from '@/domain/slot';
import { useStore } from '@/store/useStore';
import { M, sm } from '@/theme'; // dark Map: the night palette

const EXAMPLES = ['practiced guitar', 'edited a clip', 'leg day', 'sketched for fun'];

/** Back to the prompt (P-65): back where it came from, or to the trailhead when Map was opened first. */
const toPrompt = () => (router.canGoBack() ? router.back() : router.replace('/'));

/**
 * Map (P-65: was Home, moved as it was): the graph (P-34) — your whys, the wanders feeding them and
 * your recent logs, with the log box at the bottom. With no wanders, your logs show on their own; with
 * nothing at all, the welcome. The handle at its bottom pulls up one sheet with the list of cards
 * (Wanders) and everything logged (Activities) (P-58). The single-centre view is Explore. Home is the
 * trailhead (`index.tsx`); ‹ (or Esc with nothing else to do) goes back to it.
 */
export default function Map() {
  const data = useStore((st) => st.data);
  const setDraft = useStore((st) => st.setDraft);
  const focusLogBox = useStore((st) => st.focusLogBox);
  const select = useStore((st) => st.select);
  const showHomeFace = useStore((st) => st.showHomeFace);
  const ready = useStore((st) => st.storage.state === 'ready');
  // P-58: Home is in front while it's focused and its sheet is away.
  const { sheet, homeRef, handleRef, tabRefs } = useHomeSheet();
  const focused = useIsFocused();
  const shown = focused && !sheet.open;
  // P-72: Map dims in like dusk (its own focus is as it was).
  const passage = usePassage('map', focused);
  // An attached wander (P-35's selection) is one moment on Home: it goes when Home is left (focus and
  // scope stay, P-50): another screen, or its sheet pulled out. Home stays mounted, so this runs when
  // it's left, and when it's back too (in case anything set it meanwhile). P-61: no bridge any more.
  useWhileShown(
    shown,
    useCallback(() => {
      const leave = () => select(undefined);
      leave();
      return leave;
    }, [select]),
  );
  // The log field (P-61) is away whenever Home is shown (open while there's no wander), once the data
  // is there to say which.
  useWhileShown(
    shown,
    useCallback(() => {
      if (ready) showHomeFace(restingFace(useStore.getState().data));
    }, [ready, showHomeFace]),
  );
  const isEmpty = Object.keys(data.activities).length === 0 && Object.keys(data.threads).length === 0;
  // Earned whys in the Wanders list's header order, so the graph and the headers agree.
  const surfacing = useMemo(() => headerWhys(data), [data]);
  const wanders = useMemo(() => Object.values(data.threads).some((t) => !t.hidden), [data]);
  const graphIcon = useGraphIcon();
  // Search and Settings (the way to your backup) always stay on screen: on a narrow window (125 %
  // zoom and more) the ⋔ icon goes, the title steps down a size, and as a last resort it truncates.
  const { width } = useWindowDimensions();
  // P-65: the ‹ back to the prompt takes 44 more, so the title steps down below a phone's 390 px too.
  const tightHeader = homeContentWidth(width) < 360;
  // The first run (P-36), over the empty graph; when ③ goes, focus moves to the top of Home.
  const title = useRef<ComponentRef<typeof Text>>(null);
  const firstRun = useFirstRun(() => moveFocus(title.current));
  // P-50: Esc, Back and the browser's Back go up a scope level (Esc at All clears an attach).
  useScopeNav(shown, toPrompt);

  return (
    // Dark Map (owner, 2026-11-24): Map, its sheet and the shared parts on it take the night palette.
    <DarkProvider value>
      <View style={styles.home} testID="map" {...passage.mark}>
        {focused && <StatusBar style="light" />}
        {/* Under the open sheet (a modal dialog), Home is out of reach of assistive tech and the keyboard. */}
        <View ref={homeRef} style={styles.home} {...(sheet.open ? decorative : {})}>
          <ShownProvider value={!sheet.open}>
            <Screen slot below={<SheetHandle sheet={sheet} handleRef={handleRef} />} bottomHidden={sheet.settled}>
              <View style={styles.header}>
                <Pressable onPress={toPrompt} accessibilityRole="button" accessibilityLabel="Back to the prompt" style={styles.icon}>
                  <BackGlyph />
                </Pressable>
                <Text ref={title} {...(Platform.OS === 'web' ? { tabIndex: -1 } : {})} style={[sm.h1, styles.title, tightHeader && { fontSize: 24 }]} numberOfLines={1} accessibilityRole="header">
                  Wanderment
                </Text>
                <View style={styles.icons}>
                  {wanders && graphIcon && <ExploreIcon style={styles.icon} />}
                  <Link href="/search" asChild>
                    <Pressable accessibilityRole="button" accessibilityLabel="Search" style={styles.icon}>
                      <SearchGlyph />
                    </Pressable>
                  </Link>
                  <Link href="/settings" asChild>
                    <Pressable accessibilityRole="button" accessibilityLabel="Settings and backup" style={styles.icon}>
                      <SettingsGlyph />
                    </Pressable>
                  </Link>
                </View>
              </View>

              {/* P-58: out of sight under the sheet once it's out (as a hidden tab was); the header stays above it. */}
              <View style={[styles.body, sheet.settled && styles.gone]}>
                <LiveGraph data={data} surfacing={surfacing} firstRun={firstRun} />

                {isEmpty && (
                  <View style={{ gap: 18, marginTop: 12 }}>
                    <Text style={styles.hero}>Log what you just did.</Text>
                    <Text style={sm.body}>
                      Anything counts. Connect it to what it’s <Text style={{ fontStyle: 'italic' }}>to</Text> now, later, or never — no big reasons needed. Over time you’ll see where your energy goes.
                    </Text>
                    <Text style={sm.meta}>Try one — tap to fill the box below</Text>
                    <View style={styles.wrap}>
                      {EXAMPLES.map((e) => (
                        <Pressable key={e} onPress={() => {
                            // P-61: the example goes in the log field, which opens.
                            setDraft({ text: e });
                            focusLogBox();
                          }} style={sm.chip} accessibilityRole="button">
                          <Text style={sm.chipText}>{e}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <Text style={sm.meta}>
                      Tip: type <Text style={styles.at}>@</Text> to say what it was to, e.g. “scales @play guitar”.
                    </Text>
                  </View>
                )}
              </View>
            </Screen>
          </ShownProvider>
        </View>
        <HomeSheet sheet={sheet} tabRefs={tabRefs} />
        <Veil s={passage} />
      </View>
    </DarkProvider>
  );
}

const styles = StyleSheet.create({
  home: { flex: 1 },
  body: { gap: 12 },
  gone: { display: 'none' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { flexShrink: 1, marginRight: 'auto' },
  icons: { flexDirection: 'row', flexShrink: 0 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  hero: { fontSize: 26, fontWeight: '600', color: M.ink, lineHeight: 32 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  at: { backgroundColor: M.accentTint, color: M.accentInk },
});
