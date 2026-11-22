import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { decorative } from '@/components/a11y';
import { HomeGraph, OpenGraphIcon, useGraphNarrow } from '@/components/graph/HomeGraph';
import { LogBridge } from '@/components/LogBridge';
import { Screen } from '@/components/Screen';
import { ThreadCard } from '@/components/ThreadCard';
import { candidatesForThread, groupByValue, valueHeader, valueThreads, whyValue } from '@/domain/emergence';
import { buildFlowIndex } from '@/domain/graph';
import { findThreadByName } from '@/domain/model';
import { overview } from '@/domain/overview';
import { ageLabel, homeThreads, ThreadSummary } from '@/domain/selectors';
import { Id } from '@/domain/types';
import { useStore } from '@/store/useStore';
import { C, s } from '@/theme';

const EXAMPLES = ['practiced guitar', 'edited a clip', 'leg day', 'sketched for fun'];

export default function Home() {
  // Brings the bridge into view when it appears, even if Home was scrolled.
  const bridgeFor = useStore((st) => st.bridgeFor);
  const data = useStore((st) => st.data);
  const setDraft = useStore((st) => st.setDraft);
  const dismissBridge = useStore((st) => st.dismissBridge);
  // The bridge is one moment on Home: it goes when Home is left. Home stays mounted in the tabs, so
  // this runs on blur, and on focus too (in case anything set it while Home was in the background).
  useFocusEffect(
    useCallback(() => {
      dismissBridge();
      return dismissBridge;
    }, [dismissBridge]),
  );
  const { current, earlier } = useMemo(() => homeThreads(data), [data]);
  const isEmpty = Object.keys(data.activities).length === 0 && Object.keys(data.threads).length === 0;
  const firstThread = Object.keys(data.activities).length <= 2 && current.length === 1 ? current[0] : undefined;

  // Earned values, computed once: the headers and the graph at the top both use them.
  const earned = useMemo(() => valueThreads(data), [data]);
  // The live graph: a pure function of the data, so it simply re-renders as you declare or log.
  const graph = useMemo(() => overview(data, buildFlowIndex(data), earned), [data, earned]);
  const graphNarrow = useGraphNarrow();

  // Plain "YOUR THREADS" until a value has clearly emerged; then group under "TO …" headers.
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
      <View style={styles.header}>
        <Text style={s.h1} accessibilityRole="header">
          Wanderment
        </Text>
        <View style={{ flexDirection: 'row' }}>
          {graph && !graphNarrow && <OpenGraphIcon style={styles.icon} />}
          <Link href="/search" asChild>
            <Pressable accessibilityRole="button" accessibilityLabel="Search" style={styles.icon}>
              <Text style={{ fontSize: 26, lineHeight: 30, color: C.muted }} {...decorative}>
                ⌕
              </Text>
            </Pressable>
          </Link>
          <Link href="/settings" asChild>
            <Pressable accessibilityRole="button" accessibilityLabel="Settings and backup" style={styles.icon}>
              <Text style={{ fontSize: 20, color: C.muted }} {...decorative}>
                ⚙︎
              </Text>
            </Pressable>
          </Link>
        </View>
      </View>

      {graph && <HomeGraph ov={graph} />}

      <LogBridge />

      {isEmpty ? (
        <View style={{ gap: 18, marginTop: 24 }}>
          <Text style={styles.hero}>Log what you just did.</Text>
          <Text style={s.body}>
            Anything counts. Connect it to what it’s <Text style={{ fontStyle: 'italic' }}>to</Text> now, later, or never — no big reasons needed. Over time you’ll see where your energy goes.
          </Text>
          <Text style={s.meta}>Try one — tap to fill the box below</Text>
          <View style={styles.wrap}>
            {EXAMPLES.map((e) => (
              <Pressable key={e} onPress={() => setDraft({ text: e })} style={s.chip} accessibilityRole="button">
                <Text style={s.chipText}>{e}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.meta}>
            Tip: type <Text style={styles.at}>@</Text> to say what it was to, e.g. “scales @play guitar”.
          </Text>
        </View>
      ) : (
        <>
          {firstThread && (
            <View style={styles.banner}>
              <Text style={{ color: C.accentInk, fontSize: 15, lineHeight: 22 }}>
                <Text style={{ fontWeight: '600' }}>Your first thread.</Text> Everything you log to “{firstThread.thread.name}” gathers here. Give it a next step if you like.
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
                {groups.length ? 'OTHER THREADS' : 'YOUR THREADS'}
              </Text>
              <NewThread />
            </View>
          )}
          {rest.map((id) => {
            const sum = byId.get(id);
            return sum ? <ThreadCard key={id} summary={sum} /> : null;
          })}
          {current.length === 0 && <Text style={s.meta}>Nothing attached to a thread yet — that’s fine. Your activities are in the Activities tab.</Text>}
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
        </>
      )}
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

/** "+ New thread": name it, then see earlier activities that might belong. */
function NewThread() {
  const data = useStore((st) => st.data);
  const createThread = useStore((st) => st.createThread);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');

  const submit = () => {
    const n = name.trim();
    setNaming(false);
    setName('');
    if (!n) return;
    const existed = findThreadByName(data, n);
    const id = createThread(n);
    if (existed) router.push(`/thread/${id}`);
    else if (candidatesForThread(data, n).length) router.push(`/pull-in/${id}`);
  };

  if (!naming) {
    return (
      <Pressable onPress={() => setNaming(true)} style={styles.newBtn} accessibilityRole="button">
        <Text style={{ color: C.accent, fontSize: 14, fontWeight: '500' }}>+ New thread</Text>
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
      accessibilityLabel="New thread name"
    />
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  hero: { fontSize: 26, fontWeight: '600', color: C.ink, lineHeight: 32 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  at: { backgroundColor: C.accentTint, color: C.accentInk },
  banner: { padding: 14, borderRadius: 14, backgroundColor: C.accentTint },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 44, marginTop: 4 },
  why: { fontSize: 12, color: C.muted, textDecorationLine: 'underline' },
  explain: { fontSize: 14, lineHeight: 20, color: C.body, padding: 12, borderRadius: 12, backgroundColor: C.quietBg },
  newBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  newInput: { flex: 1, maxWidth: 240, minHeight: 44, fontSize: 15, color: C.ink, borderBottomWidth: 1, borderColor: C.line },
  earlier: { flexDirection: 'row', gap: 12, minHeight: 44, alignItems: 'center', paddingHorizontal: 14, borderRadius: 12, backgroundColor: C.quietBg },
});
