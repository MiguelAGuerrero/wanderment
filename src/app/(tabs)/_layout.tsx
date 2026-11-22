import { TabList, Tabs, TabSlot, TabTrigger, TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, PressableProps, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { decorative } from '@/components/a11y';
import { C } from '@/theme';

/** Bottom tab bar: Home (the graph) · Wanders · Activities. Same component on web and native. */
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      <TabList style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]} accessibilityRole="tablist">
        <TabTrigger name="index" href="/" asChild>
          <TabButton glyph="◎">Home</TabButton>
        </TabTrigger>
        <TabTrigger name="wanders" href="/wanders" asChild>
          <TabButton glyph="∿">Wanders</TabButton>
        </TabTrigger>
        <TabTrigger name="activities" href="/activities" asChild>
          <TabButton glyph="≡">Activities</TabButton>
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

// React 19 passes `ref` as a regular prop, so no forwardRef is needed.
function TabButton({ children, isFocused, glyph, ...props }: TabTriggerSlotProps & { glyph: string }) {
  return (
    // expo-router's slot ref type doesn't line up with RN 0.88's Pressable ref type; runtime is fine.
    <Pressable {...(props as PressableProps)} style={styles.tab} accessibilityRole="tab" accessibilityState={{ selected: isFocused }}>
      <Text style={[styles.glyph, isFocused && styles.on]} {...decorative}>
        {glyph}
      </Text>
      <Text style={[styles.label, isFocused && styles.on]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 6 },
  tab: { flex: 1, maxWidth: 160, alignItems: 'center', justifyContent: 'center', minHeight: 44, gap: 2 },
  glyph: { fontSize: 18, color: C.muted },
  label: { fontSize: 11, fontWeight: '500', color: C.muted },
  on: { color: C.accent, fontWeight: '600' },
});
