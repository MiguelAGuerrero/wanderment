import { Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { s } from '@/theme';

/** The graph is deliberately deferred until there's real data to show (see docs/ROADMAP.md). */
export default function Graph() {
  return (
    <Screen>
      <Text style={s.h1}>Graph</Text>
      <View style={[s.card, { gap: 8 }]}>
        <Text style={s.body}>
          This fills in once you’ve logged for a few weeks. It will show where your activity flows — what feeds what — starting from the things most of it flows toward.
        </Text>
        <Text style={s.meta}>Coming in a later milestone.</Text>
      </View>
    </Screen>
  );
}
