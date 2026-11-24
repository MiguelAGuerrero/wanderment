import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { candidatesForThread } from '@/domain/emergence';
import { useStore } from '@/store/useStore';
import { themed, usePalette } from '@/components/palette';

import { decorative } from './a11y';

/**
 * After a thread is created from the @ menu: one quiet line offering to pull in earlier
 * activities that mention it. Ignoring it leaves no trace.
 */
export function PullInOffer() {
  const { C, dark } = usePalette();
  const styles = sheet(dark);
  const data = useStore((st) => st.data);
  const offer = useStore((st) => st.pullInOffer);
  const setOffer = useStore((st) => st.setPullInOffer);
  // A wander selected on Home (P-35) has the space above the log box: one row there at a time.
  const selecting = useStore((st) => !!st.selected);
  const thread = offer ? data.threads[offer] : undefined;
  if (!thread || selecting) return null;
  const n = candidatesForThread(data, thread.name, thread.id).length;
  if (!n) return null;
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => {
          setOffer(undefined);
          router.push(`/pull-in/${thread.id}`);
        }}
        style={styles.main}
        accessibilityRole="button">
        <Text style={styles.text} numberOfLines={2}>
          {n} earlier {n === 1 ? 'activity mentions' : 'activities mention'} “{thread.name}” · <Text style={styles.link}>Review</Text>
        </Text>
      </Pressable>
      <Pressable onPress={() => setOffer(undefined)} style={styles.close} accessibilityRole="button" accessibilityLabel="Dismiss">
        <Text style={{ color: C.faint, fontSize: 18 }} {...decorative}>
          ×
        </Text>
      </Pressable>
    </View>
  );
}

const sheet = themed((C) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginTop: 8, borderRadius: 14, backgroundColor: C.quietBg },
    main: { flex: 1, minHeight: 44, justifyContent: 'center', paddingLeft: 14 },
    text: { fontSize: 14, color: C.body },
    link: { color: C.accent, fontWeight: '600' },
    close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  }),
);
