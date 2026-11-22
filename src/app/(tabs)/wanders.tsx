import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { LogBridge } from '@/components/LogBridge';
import { Screen } from '@/components/Screen';
import { ThreadCard } from '@/components/ThreadCard';
import { candidatesForThread, groupByValue, valueHeader, valueThreads, whyValue } from '@/domain/emergence';
import { findThreadByName } from '@/domain/model';
import { ageLabel, homeThreads, ThreadSummary } from '@/domain/selectors';
import { Id } from '@/domain/types';
import { useStore } from '@/store/useStore';
import { C, s } from '@/theme';

/**
 * The Wanders tab (P-34): what Home was before the graph became Home — your wanders as cards with
 * their crumbs, under "TO …" headers once a value has emerged, and the bridge after a plain log.
 */
export default function Wanders() {
  // Brings the bridge into view when it appears, even if the list was scrolled.
  const bridgeFor = useStore((st) => st.bridgeFor);
  const data = useStore((st) => st.data);
  const dismissBridge = useStore((st) => st.dismissBridge);
  // The bridge is one moment where you logged: it goes when the tab is left. Tabs stay mounted, so
  // this runs on blur, and on focus too (in case anything set it while it was in the background).
  useFocusEffect(
    useCallback(() => {
      dismissBridge();
      return dismissBridge;
    }, [dismissBridge]),
  );
  const { current, earlier } = useMemo(() => homeThreads(data), [data]);
  const firstThread = Object.keys(data.activities).length <= 2 && current.length === 1 ? current[0] : undefined;

  // Earned values, computed once for the headers.
  const earned = useMemo(() => valueThreads(data), [data]);

  // Plain "YOUR WANDERS" until a value has clearly emerged; then group under "TO …" headers.
  const byId = new Map(current.map((c) => [c.thread.id, c]));
  const { groups, rest } = useMemo(
    () =>
      groupByValue(
        data,
        current.map((c) => c.thread.id),
        undefined,
        earned,
      ),
    [data, current, earned],
  );

  return (
    <Screen bridge scrollToTopOn={bridgeFor}>
      <Text style={s.h1} accessibilityRole="header">
        Wanders
      </Text>

      <LogBridge />

      {firstThread && (
        <View style={styles.banner}>
          <Text style={{ color: C.accentInk, fontSize: 15, lineHeight: 22 }}>
            <Text style={{ fontWeight: '600' }}>Your first wander.</Text> Everything you log to “{firstThread.thread.name}” gathers here. Give it a next step if you like.
          </Text>
        </View>
      )}

      {groups.map((g) => (
        <View key={g.value.id} style={{ gap: 12 }}>
          <ValueHeader valueId={g.value.id} label={valueHeader(g.value)} />
          {[g.value.id, ...g.members].map((id) => {
            const sum: ThreadSummary | undefined = byId.get(id);
            return sum ? <ThreadCard key={id} summary={sum} /> : null;
          })}
        </View>
      ))}

      {(rest.length > 0 || groups.length === 0) && (
        <View style={styles.labelRow}>
          <Text style={[s.sectionLabel, { marginTop: 0 }]} accessibilityRole="header" aria-level={2}>
            {groups.length ? 'OTHER WANDERS' : 'YOUR WANDERS'}
          </Text>
          <NewThread />
        </View>
      )}
      {rest.map((id) => {
        const sum = byId.get(id);
        return sum ? <ThreadCard key={id} summary={sum} /> : null;
      })}
      {current.length === 0 && <Text style={s.meta}>Nothing attached to a wander yet — that’s fine. Your activities are in the Activities tab.</Text>}
      {groups.length > 0 && rest.length === 0 && (
        <View style={[styles.labelRow, { justifyContent: 'flex-end' }]}>
          <NewThread />
        </View>
      )}

      {earlier.length > 0 && (
        <Text style={s.quietLabel} accessibilityRole="header" aria-level={2}>
          Earlier
        </Text>
      )}
      {earlier.map(({ thread, last }) => (
        <Link key={thread.id} href={`/thread/${thread.id}`} asChild>
          <Pressable style={styles.earlier} accessibilityRole="button">
            <Text style={{ flex: 1, color: C.muted, fontSize: 14 }} numberOfLines={1}>
              {thread.name}
              {thread.next ? ` · “${thread.next}”` : ''}
            </Text>
            <Text style={{ color: C.muted, fontSize: 14 }}>{last ? ageLabel(last.occurredAt) : ''}</Text>
          </Pressable>
        </Link>
      ))}
    </Screen>
  );
}

/** "TO MAKE APPAREL", with a small explainer of why it's there. */
function ValueHeader({ valueId, label }: { valueId: Id; label: string }) {
  const data = useStore((st) => st.data);
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Pressable onPress={() => setOpen((o) => !o)} style={styles.labelRow} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityHint="Explains why this header is here">
        <Text style={[s.sectionLabel, { marginTop: 0 }]} accessibilityRole="header" aria-level={2}>
          {label}
        </Text>
        <Text style={styles.why}>why here?</Text>
      </Pressable>
      {open && <Text style={styles.explain}>{whyValue(data, valueId)}</Text>}
    </View>
  );
}

/** "+ New wander": name it, then see earlier activities that might belong. */
function NewThread() {
  const data = useStore((st) => st.data);
  const createThread = useStore((st) => st.createThread);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');

  const submit = () => {
    const n = name.trim();
    const existed = n ? findThreadByName(data, n) : undefined;
    const id = n ? createThread(n) : '';
    // Refused while reconnecting (it says so): the typed name stays.
    if (n && !id) return;
    setNaming(false);
    setName('');
    if (!n) return;
    if (existed) router.push(`/thread/${id}`);
    else if (candidatesForThread(data, n).length) router.push(`/pull-in/${id}`);
  };

  if (!naming) {
    return (
      <Pressable onPress={() => setNaming(true)} style={styles.newBtn} accessibilityRole="button">
        <Text style={{ color: C.accent, fontSize: 14, fontWeight: '500' }}>+ New wander</Text>
      </Pressable>
    );
  }
  return (
    <TextInput
      value={name}
      onChangeText={setName}
      autoFocus
      placeholder="Name it as an action…"
      placeholderTextColor={C.faint}
      onSubmitEditing={submit}
      onBlur={() => !name.trim() && setNaming(false)}
      returnKeyType="done"
      style={styles.newInput}
      accessibilityLabel="New wander name"
    />
  );
}

const styles = StyleSheet.create({
  banner: { padding: 14, borderRadius: 14, backgroundColor: C.accentTint },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 44,
    marginTop: 4,
  },
  why: { fontSize: 12, color: C.muted, textDecorationLine: 'underline' },
  explain: {
    fontSize: 14,
    lineHeight: 20,
    color: C.body,
    padding: 12,
    borderRadius: 12,
    backgroundColor: C.quietBg,
  },
  newBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  newInput: {
    flex: 1,
    maxWidth: 240,
    minHeight: 44,
    fontSize: 15,
    color: C.ink,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  earlier: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 44,
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: C.quietBg,
  },
});
