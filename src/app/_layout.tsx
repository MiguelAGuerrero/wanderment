import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';

import { useStore } from '@/store/useStore';
import { C } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Hide the splash once saved data has loaded from storage.
  useEffect(() => {
    const done = () => SplashScreen.hideAsync();
    if (useStore.persist.hasHydrated()) done();
    return useStore.persist.onFinishHydration(done);
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="thread/[id]" />
        <Stack.Screen name="activity/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" />
      </Stack>
    </>
  );
}
