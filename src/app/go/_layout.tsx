import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';

import { FAMILY, G } from '@/components/go/tokens';

/**
 * B-11 slice 1 (P-86): the `/go` screens — since P-89 the whole app. Dark, with their own faces,
 * loaded here; the first frame
 * waits until they are in or have failed (the note is sized from its words: a late face would move
 * it), and a failure just means the system face.
 */
const faces = () =>
  // The files are woff2: the web only. Native shows the system face in this slice.
  Platform.OS === 'web'
    ? [
        {
          fontFamily: FAMILY.words,
          // One file holds every weight used (400 and 600). Asked for here, when the layout first
          // renders: nothing of `/go` runs at import (one shared bundle).
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          fontDefinitions: [{ path: require('../../../assets/fonts/IBMPlexSans.woff2'), weight: '400 600' }],
        },
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        { fontFamily: FAMILY.title, fontDefinitions: [{ path: require('../../../assets/fonts/PixelifySans-600.woff2'), weight: 600 }] },
      ]
    : [];

export default function GoLayout() {
  const [loaded, error] = useFonts(faces());
  if (!loaded && !error) return null;
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: G.bg } }} />
    </>
  );
}
