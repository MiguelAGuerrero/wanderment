import { ComponentRef, useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { ImportCounts, ImportDiff, ImportPlan } from '@/domain/importPlan';
import { C, s } from '@/theme';

import { moveFocus } from './FirstRun';

/**
 * What a checked backup holds and what replacing would do here (P-04): Replace or Cancel, or only
 * Close when it matches what's here. Focus moves to it as it appears, so it's announced.
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
      <Text style={styles.body}>{holds(plan)}</Text>
      {plan.identical ? (
        <Text style={styles.body}>Nothing would change.</Text>
      ) : plan.empty ? (
        <Text style={styles.body}>Replacing would remove all {both(plan.here)} here.</Text>
      ) : (
        <Text style={styles.body}>{changes(plan)}</Text>
      )}
      <View style={styles.row}>
        {!plan.identical && (
          <Pressable onPress={onReplace} style={s.primaryBtn} accessibilityRole="button">
            <Text style={s.primaryBtnText}>Replace</Text>
          </Pressable>
        )}
        <Pressable onPress={onCancel} style={s.chip} accessibilityRole="button">
          <Text style={s.chipText}>{plan.identical ? 'Close' : 'Cancel'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const activities = (n: number) => count(n, 'activity', 'activities');
const wanders = (n: number) => count(n, 'wander', 'wanders');
const both = (c: ImportCounts) => `${activities(c.activities)} and ${wanders(c.wanders)}`;

/** "This backup has 98 activities and 12 wanders (2 hidden), from 3 Jan to 9 Mar 2026." */
function holds(plan: ImportPlan): string {
  const c = plan.incoming;
  if (plan.empty) return 'This backup has no activities and no wanders.';
  const hidden = c.hidden ? ` (${c.hidden} hidden)` : '';
  return `This backup has ${activities(c.activities)} and ${wanders(c.wanders)}${hidden}${when(plan.dateRange)}.`;
}

function when(range: ImportPlan['dateRange']): string {
  if (!range) return '';
  const from = new Date(range.from);
  const to = new Date(range.to);
  const day = { day: 'numeric', month: 'short' } as const;
  const full = { ...day, year: 'numeric' } as const;
  if (from.toDateString() === to.toDateString()) return `, on ${to.toLocaleDateString(undefined, full)}`;
  const sameYear = from.getFullYear() === to.getFullYear();
  return `, from ${from.toLocaleDateString(undefined, sameYear ? day : full)} to ${to.toLocaleDateString(undefined, full)}`;
}

/** "Replacing would add 4, change 2 and remove 22 activities, and add 1 wander." */
function changes(plan: ImportPlan): string {
  const parts = [phrase(plan.activities, activities), phrase(plan.threads, wanders)].filter(Boolean);
  return `Replacing would ${parts.join(', and ')}.`;
}

function phrase(d: ImportDiff, noun: (n: number) => string): string {
  const verbs = (
    [
      ['add', d.added],
      ['change', d.changed],
      ['remove', d.removed],
    ] as const
  ).filter(([, n]) => n > 0);
  if (!verbs.length) return '';
  const last = verbs[verbs.length - 1];
  const head = verbs.slice(0, -1).map(([v, n]) => `${v} ${n}`);
  const tail = `${last[0]} ${noun(last[1])}`;
  return head.length ? `${head.join(', ')} and ${tail}` : tail;
}

const styles = StyleSheet.create({
  card: { gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.bg },
  title: { fontSize: 15, fontWeight: '600', color: C.ink },
  body: { fontSize: 14, color: C.ink, lineHeight: 20 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
