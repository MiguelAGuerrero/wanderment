import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { applyUpdate, onUpdateReady } from '@/pwa/serviceWorker';
import { C } from '@/theme';

/**
 * A non-blocking note when a new version of the web app is ready and couldn't apply by itself
 * (P-30: the person had typed, or it came later). Nothing reloads until "Update now".
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
  if (!ready || dismissed) return null;
  return (
    <View style={[styles.wrap, { top: insets.top + 6 }]} pointerEvents="box-none">
      <View style={styles.banner} accessibilityRole="alert">
        <Text style={styles.text}>A new version is ready</Text>
        <Pressable onPress={applyUpdate} style={styles.primary} accessibilityRole="button" accessibilityLabel="Update now — reload to update">
          <Text style={styles.primaryText}>Update now</Text>
        </Pressable>
        <Pressable onPress={() => setDismissed(true)} style={styles.btn} accessibilityRole="button" accessibilityLabel="Not now">
          <Text style={styles.later}>Not now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, alignItems: 'center', zIndex: 10 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 14, paddingRight: 4, paddingVertical: 4, minHeight: 44, borderRadius: 27, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, maxWidth: 616 },
  text: { fontSize: 14, color: C.ink, marginRight: 4 },
  btn: { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' },
  primary: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: C.ink, justifyContent: 'center' },
  primaryText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  later: { fontSize: 14, color: C.muted },
});
