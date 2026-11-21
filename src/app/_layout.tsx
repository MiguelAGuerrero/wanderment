import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { UpdateBanner } from '@/components/UpdateBanner';
import { registerServiceWorker } from '@/pwa/serviceWorker';
import { startPersistence } from '@/storage/persistence';
import { useStore } from '@/store/useStore';
import { C, s } from '@/theme';

SplashScreen.preventAutoHideAsync();
registerServiceWorker();
void startPersistence();

export default function RootLayout() {
  const storage = useStore((st) => st.storage);
  const saveError = useStore((st) => st.saveError);

  // Hide the splash once saved data has loaded (or failed to).
  useEffect(() => {
    if (storage.state !== 'loading') SplashScreen.hideAsync();
  }, [storage.state]);

  // Nothing renders until data is loaded, so nothing typed early can be lost or overwrite it.
  if (storage.state === 'loading') return <View style={s.screen} />;
  if (storage.state === 'blocked') {
    return (
      <View style={[s.screen, styles.center]}>
        <Text style={s.h1}>Wanderment</Text>
        <Text style={[s.body, { textAlign: 'center' }]} accessibilityRole="alert">
          {storage.message}
        </Text>
        {Platform.OS === 'web' && (
          <Pressable onPress={() => window.location.reload()} style={s.primaryBtn} accessibilityRole="button">
            <Text style={s.primaryBtnText}>Reload</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="thread/[id]" />
        <Stack.Screen name="activity/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" />
      </Stack>
      <UpdateBanner />
      {saveError && (
        <View style={styles.error} accessibilityRole="alert">
          <Text style={{ color: C.accentInk, fontSize: 14 }}>{saveError}</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  error: { position: 'absolute', left: 12, right: 12, top: 12, padding: 12, borderRadius: 12, backgroundColor: C.accentTint },
});
