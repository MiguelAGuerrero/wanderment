import { ComponentRef, useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { ImportPlan } from '@/domain/importPlan';
import { importChanges, importHolds, importRemovesAll } from '@/domain/importText';
import { C, s } from '@/theme';

import { moveFocus } from './FirstRun';

/**
 * What a checked backup holds and what replacing would do here (P-04): Replace or Cancel, or only
 * Close when it matches what's here. Focus moves to it as it appears, so it's announced. An empty
 * backup (it would remove everything) puts Cancel first and Replace plain, never the obvious step.
 */
export function ImportPreviewCard({ plan, onReplace, onCancel }: { plan: ImportPlan; onReplace: () => void; onCancel: () => void }) {
  const ref = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => moveFocus(ref.current), []);
  const title = plan.identical ? 'This backup matches what’s here.' : 'Replace what’s here with this backup?';
  return (
    <View ref={ref} role="group" aria-label={title} {...(Platform.OS === 'web' ? { tabIndex: -1 } : {})} style={styles.card} testID="import-preview">
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.body}>{importHolds(plan)}</Text>
      {plan.identical ? (
        <Text style={styles.body}>Nothing would change.</Text>
      ) : plan.empty ? (
        <Text style={styles.body}>{importRemovesAll(plan)}</Text>
      ) : (
        <Text style={styles.body}>{importChanges(plan)}</Text>
      )}
      {/* Until there's a way back (P-39). */}
      {!plan.identical && <Text style={styles.body}>Replacing can’t be undone yet. Export first if unsure.</Text>}
      <View style={styles.row}>
        {plan.identical ? (
          <Pressable onPress={onCancel} style={s.chip} accessibilityRole="button">
            <Text style={s.chipText}>Close</Text>
          </Pressable>
        ) : plan.empty ? (
          <>
            <Pressable onPress={onCancel} style={s.chip} accessibilityRole="button">
              <Text style={s.chipText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={onReplace} style={s.chip} accessibilityRole="button">
              <Text style={s.chipText}>Replace</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable onPress={onReplace} style={s.primaryBtn} accessibilityRole="button">
              <Text style={s.primaryBtnText}>Replace</Text>
            </Pressable>
            <Pressable onPress={onCancel} style={s.chip} accessibilityRole="button">
              <Text style={s.chipText}>Cancel</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.bg },
  title: { fontSize: 15, fontWeight: '600', color: C.ink },
  body: { fontSize: 14, color: C.ink, lineHeight: 20 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
