import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { ThreadCard } from '@/components/ThreadCard';
import { ageLabel, homeThreads } from '@/domain/selectors';
import { useStore } from '@/store/useStore';
import { C, s } from '@/theme';

const EXAMPLES = ['practiced guitar', 'edited a clip', 'leg day', 'sketched for fun'];

export default function Home() {
  const data = useStore((st) => st.data);
  const setDraft = useStore((st) => st.setDraft);
  const { current, earlier } = homeThreads(data);
  const isEmpty = Object.keys(data.activities).length === 0 && Object.keys(data.threads).length === 0;
  const firstThread = Object.keys(data.activities).length <= 2 && current.length === 1 ? current[0] : undefined;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={s.h1}>Wanderment</Text>
        <Link href="/settings" asChild>
          <Pressable accessibilityLabel="Settings and backup" style={styles.icon}>
            <Text style={{ fontSize: 20, color: C.muted }}>⚙︎</Text>
          </Pressable>
        </Link>
      </View>

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
          {current.length > 0 && <Text style={s.sectionLabel}>YOUR THREADS</Text>}
          {current.map((sum) => (
            <ThreadCard key={sum.thread.id} summary={sum} />
          ))}
          {current.length === 0 && <Text style={s.meta}>Nothing attached to a thread yet — that’s fine. Your activities are in the Activities tab.</Text>}
          {earlier.length > 0 && <Text style={s.quietLabel}>Earlier</Text>}
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

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  hero: { fontSize: 26, fontWeight: '600', color: C.ink, lineHeight: 32 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  at: { backgroundColor: C.accentTint, color: C.accentInk },
  banner: { padding: 14, borderRadius: 14, backgroundColor: C.accentTint },
  earlier: { flexDirection: 'row', gap: 12, minHeight: 44, alignItems: 'center', paddingHorizontal: 14, borderRadius: 12, backgroundColor: C.quietBg },
});
