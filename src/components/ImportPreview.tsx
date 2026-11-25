import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { ImportPlan } from '@/domain/importPlan';
import { importChanges, importHolds, importRemovesAll } from '@/domain/importText';

import { moveFocus } from './a11y';
import { G, SP } from './go/tokens';
import { Btn, hard, T, ViewRef } from './go/ui';

/**
 * What a checked backup holds and what replacing would do here (P-04): Cancel or Replace, or only
 * Close when it matches what's here. Focus moves to it as it appears, so it's announced.
 * It is a confirm that reaches beyond the screen and has no Undo yet (P-39), so — whatever the backup
 * holds — Cancel is the filled button and the first stop, and Replace is outlined in the colour kept
 * for what can't be undone (DESIGN.md; audit of P-89, D1). Return on the preview itself does nothing.
 */
export function ImportPreviewCard({ plan, onReplace, onCancel }: { plan: ImportPlan; onReplace: () => void; onCancel: () => void }) {
  const ref = useRef<ViewRef>(null);
  useEffect(() => moveFocus(ref.current), []);
  const title = plan.identical ? 'This backup matches what’s here.' : 'Replace what’s here with this backup?';
  return (
    <View ref={ref} role="group" aria-label={title} {...(Platform.OS === 'web' ? { tabIndex: -1 } : {})} style={styles.card} testID="import-preview">
      <T bold accessibilityRole="header" role="heading" aria-level={3}>
        {title}
      </T>
      <T>{importHolds(plan)}</T>
      {plan.identical ? <T>Nothing would change.</T> : plan.empty ? <T>{importRemovesAll(plan)}</T> : <T>{importChanges(plan)}</T>}
      {/* Until there's a way back (P-39). */}
      {!plan.identical && <T>Replacing can’t be undone yet. Export first if unsure.</T>}
      <View style={styles.row}>
        {plan.identical ? (
          <Btn label="Close" onPress={onCancel} />
        ) : (
          <>
            <Btn kind="filled" label="Cancel" onPress={onCancel} />
            <Btn danger label="Replace" onPress={onReplace} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: SP.s2, padding: SP.s3, borderWidth: 2, borderColor: G.text, backgroundColor: G.surf, marginRight: 6, marginBottom: 6, ...hard(6, G.shadow), ...(Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)) },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.s2, paddingTop: SP.s1 },
});
