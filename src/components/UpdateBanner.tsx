import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { applyUpdate, onUpdateReady } from '@/pwa/serviceWorker';
import { C } from '@/theme';

/** A small, non-blocking note when a new version of the web app is ready. Never reloads by itself. */
export function UpdateBanner() {
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const insets = useSafeAreaInsets();
  useEffect(() => onUpdateReady(setReady), []);
  if (!ready || dismissed) return null;
  return (
    <View style={[styles.wrap, { top: insets.top + 6 }]} pointerEvents="box-none">
      <View style={styles.banner} accessibilityRole="alert">
        <Text style={styles.text}>A new version is ready</Text>
        <Pressable onPress={applyUpdate} style={styles.btn} accessibilityRole="button" accessibilityLabel="Reload to update">
          <Text style={styles.reload}>Reload</Text>
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
  banner: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 14, paddingRight: 4, minHeight: 44, borderRadius: 22, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, maxWidth: 616 },
  text: { fontSize: 14, color: C.ink, marginRight: 4 },
  btn: { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' },
  reload: { fontSize: 14, fontWeight: '600', color: C.accent },
  later: { fontSize: 14, color: C.muted },
});
