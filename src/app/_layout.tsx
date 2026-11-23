import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { ComponentRef, RefObject, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { ToastTimer } from '@/components/Toast';
import { shownDetails } from '@/domain/opening';
import { UpdateBanner } from '@/components/UpdateBanner';
import { registerServiceWorker } from '@/pwa/serviceWorker';
import { reloadKeepingDraft, startPersistence } from '@/storage/persistence';
import { StorageStatus, useStore } from '@/store/useStore';
import { C, s } from '@/theme';

SplashScreen.preventAutoHideAsync();
registerServiceWorker();
void startPersistence();

export default function RootLayout() {
  const storage = useStore((st) => st.storage);
  const saveError = useStore((st) => st.saveError);
  /** The data has been on screen: from then on the app stays mounted, under any waiting screen. */
  const [appShown, setAppShown] = useState(false);
  if (storage.state === 'ready' && !appShown) setAppShown(true);
  const over = storage.state === 'blocked';
  const app = useRef<ComponentRef<typeof View>>(null);
  const message = useRef<ComponentRef<typeof Text>>(null);

  // Hide the splash once saved data has loaded (or failed to).
  useEffect(() => {
    if (storage.state !== 'loading') SplashScreen.hideAsync();
  }, [storage.state]);

  // Web, while the waiting screen is over the app: the app can't be reached (inert), focus goes to
  // the message, and back to where it was once the app is reachable again.
  useEffect(() => {
    if (!over || !appShown || Platform.OS !== 'web') return;
    const was = document.activeElement as HTMLElement | null;
    const el = app.current as unknown as HTMLElement | null;
    el?.setAttribute('inert', '');
    const msg = message.current as unknown as HTMLElement | null;
    msg?.setAttribute('tabindex', '-1');
    msg?.focus();
    return () => {
      el?.removeAttribute('inert');
      if (was?.isConnected && was !== document.body) was.focus();
    };
  }, [over, appShown]);

  // Nothing renders until data is loaded, so nothing typed early can be lost or overwrite it.
  if (storage.state === 'loading') return <Opening />;
  // Before the data has been shown, the screen is all there is.
  if (storage.state === 'blocked' && !appShown) return <Blocked storage={storage} />;

  return (
    <>
      <View ref={app} style={styles.app} pointerEvents={over ? 'none' : 'auto'} importantForAccessibility={over ? 'no-hide-descendants' : 'auto'}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
          {/* Home is the trailhead (P-65); Map is the graph, whose sheet holds Wanders and Activities (P-58). */}
          <Stack.Screen name="index" />
          <Stack.Screen name="map" />
          <Stack.Screen name="wanders" />
          <Stack.Screen name="activities" />
          <Stack.Screen name="thread/[id]" />
          <Stack.Screen name="activity/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="settings" />
          <Stack.Screen name="search" />
          <Stack.Screen name="explore" />
          <Stack.Screen name="pull-in/[id]" options={{ presentation: 'modal' }} />
        </Stack>
        <ToastTimer />
        <UpdateBanner />
        {saveError && (
          <View style={styles.error} accessibilityRole="alert">
            <Text style={{ color: C.accentInk, fontSize: 14 }}>{saveError}</Text>
          </View>
        )}
      </View>
      {/* Drawn over the app, which stays as it was: the screen, open sheets, what's typed (P-29). */}
      {storage.state === 'blocked' && (
        <View style={[StyleSheet.absoluteFill, styles.over]}>
          <Blocked storage={storage} messageRef={message} />
        </View>
      )}
    </>
  );
}

/** Opening the data. A page that starts in the background waits here until it's shown. */
function Opening() {
  // Blank at first, so a normal start doesn't flash; then it says what's happening.
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 500);
    return () => clearTimeout(t);
  }, []);
  return (
    <View style={[s.screen, styles.center]}>
      {slow && (
        <>
          <Text style={s.h1}>Wanderment</Text>
          <Text style={s.meta}>Opening…</Text>
        </>
      )}
    </View>
  );
}

/** Couldn't open the data, or waiting for another copy of the app to let go of it. */
function Blocked({ storage, messageRef }: { storage: Extract<StorageStatus, { state: 'blocked' }>; messageRef?: RefObject<ComponentRef<typeof Text> | null> }) {
  return (
    <View style={[s.screen, styles.center]}>
      <Text style={s.h1}>Wanderment</Text>
      <Text ref={messageRef} style={[s.body, { textAlign: 'center' }]} accessibilityRole="alert">
        {storage.message}
      </Text>
      {Platform.OS === 'web' && (
        <>
          {/* While waiting the page opens by itself, so Reload is only a second way. It keeps the draft. */}
          <Pressable onPress={reloadKeepingDraft} style={storage.waiting ? s.chip : s.primaryBtn} accessibilityRole="button">
            <Text style={storage.waiting ? s.chipText : s.primaryBtnText}>Reload</Text>
          </Pressable>
          <Pressable onPress={downloadRawData} style={s.chip} accessibilityRole="button">
            <Text style={s.chipText}>Download this browser’s local copy</Text>
          </Pressable>
          <Text style={[s.meta, { textAlign: 'center' }]}>
            That file holds what’s kept in local storage (older-format data and unsaved changes). Data already in the database stays safe in this
            browser and shows up again once Wanderment can open it.
          </Text>
        </>
      )}
      {/* Small print for bug reports: which step failed, and the browser's own words. */}
      {storage.details && (
        <Text selectable style={[s.meta, styles.details]}>
          {shownDetails(storage.details)}
        </Text>
      )}
    </View>
  );
}

/** Last resort on web: everything Wanderment keeps in localStorage, as a file, untouched. */
function downloadRawData() {
  const raw: Record<string, string | null> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('wanderment')) raw[key] = localStorage.getItem(key);
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(raw, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `wanderment-raw-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

const styles = StyleSheet.create({
  app: { flex: 1 },
  over: { zIndex: 20 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  // A browser's message can hold one long unbroken word (a URL): it wraps anywhere, inside the screen.
  details: { textAlign: 'center', maxWidth: '100%', ...(Platform.OS === 'web' && ({ wordBreak: 'break-all' } as object)) },
  error: { position: 'absolute', left: 12, right: 12, top: 12, padding: 12, borderRadius: 12, backgroundColor: C.accentTint },
});
