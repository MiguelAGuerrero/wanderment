import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { applyUpdate, onUpdateReady } from '@/pwa/serviceWorker';

import { setBannerRoom } from './bannerRoom';
import { BODY, face, G, SP, TARGET } from './go/tokens';

/**
 * A non-blocking note when a new version of the web app is ready and couldn't apply by itself
 * (P-30: the person had typed, or it came later). Nothing reloads until "Update now".
 * P-103 (12; audit F-23: it was a light pill drawn over Plan's band): a strip at the top, in the app's dark look;
 * the screen beneath starts below it (`bannerRoom`), so it never covers a control.
 */
export function UpdateBanner() {
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const insets = useSafeAreaInsets();
  useEffect(
    () =>
      onUpdateReady((waiting) => {
        setReady(waiting);
        // Told again (Settings → "Check for updates"): show it again even if it was put off.
        if (waiting) setDismissed(false);
      }),
    [],
  );
  const shown = ready && !dismissed;
  useEffect(() => {
    if (!shown) setBannerRoom(0);
    return () => setBannerRoom(0);
  }, [shown]);
  if (!shown) return null;
  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]} onLayout={(e) => setBannerRoom(e.nativeEvent.layout.height)} testID="update-banner">
      <View style={styles.banner} accessibilityRole="alert">
        <Text style={styles.text}>A new version is ready</Text>
        <View style={styles.actions}>
          <Pressable onPress={applyUpdate} style={styles.primary} accessibilityRole="button" accessibilityLabel="Update now — reload to update">
            <Text style={styles.primaryText}>Update now</Text>
          </Pressable>
          <Pressable onPress={() => setDismissed(true)} style={styles.btn} accessibilityRole="button" accessibilityLabel="Not now">
            <Text style={styles.later}>Not now</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, backgroundColor: G.surf2, borderBottomWidth: 2, borderBottomColor: G.line },
  banner: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: SP.s2, paddingHorizontal: SP.s3, paddingVertical: SP.s1 },
  text: { fontSize: BODY, lineHeight: 22, color: G.text, fontFamily: face.words, flexShrink: 1, paddingVertical: SP.s1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: SP.s1 },
  btn: { minHeight: TARGET, minWidth: TARGET, paddingHorizontal: SP.s2, justifyContent: 'center' },
  primary: { minHeight: TARGET, paddingHorizontal: SP.s3, backgroundColor: G.paper, justifyContent: 'center' },
  primaryText: { fontSize: BODY, fontWeight: '600', color: G.ink, fontFamily: face.words },
  later: { fontSize: BODY, color: G.text, fontFamily: face.words },
});
