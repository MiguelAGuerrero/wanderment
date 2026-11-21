import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { candidatesForThread } from '@/domain/emergence';
import { activitiesOf, ageLabel, flowsFrom, describeLink } from '@/domain/selectors';
import { useStore } from '@/store/useStore';
import { decorative } from '@/components/a11y';
import { C, s } from '@/theme';

export default function ThreadPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useStore((st) => st.data);
  const setNext = useStore((st) => st.setNext);
  const renameThread = useStore((st) => st.renameThread);
  const setHidden = useStore((st) => st.setHidden);
  const setDraft = useStore((st) => st.setDraft);
  const loadNext = useStore((st) => st.loadNext);
  const dismissedPullIn = useStore((st) => st.dismissedPullIn);
  const dismissPullIn = useStore((st) => st.dismissPullIn);
  const [editingNext, setEditingNext] = useState(false);
  const [nextValue, setNextValue] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [nameValue, setNameValue] = useState('');

  const thread = id ? data.threads[id] : undefined;
  if (!thread) {
    return (
      <Screen composer={false}>
        <Back />
        <Text style={s.body}>This thread doesn’t exist anymore.</Text>
      </Screen>
    );
  }
  const steps = activitiesOf(data, thread.id);
  const flows = flowsFrom(data, thread.id);
  // Only activities with no thread at all, so the line isn't a standing count to clear.
  const pullable = dismissedPullIn.includes(thread.id)
    ? 0
    : candidatesForThread(data, thread.name, thread.id).filter((a) => !a.doingId && a.toIds.length === 0).length;

  return (
    <Screen presetDoingId={thread.id} placeholder={`Log in ${thread.name}…`}>
      <Back />
      {renaming ? (
        <TextInput
          value={nameValue}
          onChangeText={setNameValue}
          autoFocus
          onSubmitEditing={() => {
            renameThread(thread.id, nameValue);
            setRenaming(false);
          }}
          style={[s.h1, styles.field]}
          accessibilityLabel="Thread name"
        />
      ) : (
        <Text style={s.h1}>{thread.name}</Text>
      )}
      {flows.length > 0 && (
        <Text style={s.meta}>Mostly → to {flows.slice(0, 3).map((f) => `${f.thread.name} (${f.count})`).join(' · ')}</Text>
      )}

      <View>
        <View style={styles.leftOff}>
          <Text style={s.meta}>
            {steps[0] ? (
              <>
                You left off · {ageLabel(steps[0].occurredAt)}: <Text style={{ color: C.ink }}>{steps[0].text}</Text>
              </>
            ) : (
              'Nothing logged here yet.'
            )}
          </Text>
        </View>
        {editingNext ? (
          <View style={[styles.crumb, { backgroundColor: C.surface }]}>
            <TextInput
              value={nextValue}
              onChangeText={setNextValue}
              autoFocus
              placeholder="Next step (leave empty to clear)"
              placeholderTextColor={C.faint}
              style={{ flex: 1, fontSize: 15, minHeight: 44 }}
              onSubmitEditing={() => {
                setNext(thread.id, nextValue);
                setEditingNext(false);
              }}
              accessibilityLabel={`Next step for ${thread.name}`}
            />
            <Pressable
              onPress={() => {
                setNext(thread.id, nextValue);
                setEditingNext(false);
              }}
              style={s.primaryBtn}>
              <Text style={s.primaryBtnText}>Save</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.crumb}>
            <Pressable
              onPress={() => (thread.next ? loadNext(thread.id) : (setNextValue(''), setEditingNext(true)))}
              style={{ flex: 1, minHeight: 48, justifyContent: 'center' }}
              accessibilityRole="button"
              accessibilityLabel={thread.next ? `${thread.next}. Next step for ${thread.name}. Double-tap to load into the log box.` : '+ What’s next? Set a next step'}>
              <Text style={{ color: thread.next ? C.accentInk : C.muted, fontSize: 15 }}>
                <Text {...decorative}>↳ </Text>
                {thread.next ?? '+ What’s next?'}
              </Text>
            </Pressable>
            {thread.next && (
              <Pressable onPress={() => (setNextValue(thread.next ?? ''), setEditingNext(true))} style={styles.pen} accessibilityRole="button" accessibilityLabel="Edit next step">
                <Text style={{ color: C.faint, fontSize: 16 }} {...decorative}>✎</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable onPress={() => (setNameValue(thread.name), setRenaming(true))} style={s.chip} accessibilityRole="button">
          <Text style={s.chipText}>Rename</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setHidden(thread.id, !thread.hidden);
            if (!thread.hidden) router.back();
          }}
          style={s.chip}
          accessibilityRole="button">
          <Text style={s.chipText}>{thread.hidden ? 'Unhide' : 'Hide'}</Text>
        </Pressable>
      </View>

      {pullable > 0 && (
        <View style={styles.pullInRow}>
          <Pressable onPress={() => router.push(`/pull-in/${thread.id}`)} style={styles.pullIn} accessibilityRole="button">
            <Text style={{ color: C.body, fontSize: 14 }}>
              Some earlier activities without a thread mention this · <Text style={{ color: C.accent, fontWeight: '600' }}>Review</Text>
            </Text>
          </Pressable>
          <Pressable onPress={() => dismissPullIn(thread.id)} style={styles.pen} accessibilityRole="button" accessibilityLabel="Dismiss">
            <Text style={{ color: C.faint, fontSize: 18 }} {...decorative}>
              ×
            </Text>
          </Pressable>
        </View>
      )}

      <Text style={s.quietLabel}>Steps</Text>
      {steps.map((a) => (
        <View key={a.id} style={[s.card, styles.step]}>
          <Pressable onPress={() => router.push(`/activity/${a.id}`)} style={{ flex: 1, gap: 2 }} accessibilityRole="button">
            <Text style={{ fontSize: 15, fontWeight: '500', color: C.ink }}>{a.text}</Text>
            <Text style={s.meta}>
              {ageLabel(a.occurredAt)}
              {describeLink(data, a) ? ` · ${describeLink(data, a)}` : ''}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setDraft({ text: a.text, doingId: a.doingId ?? thread.id, toIds: a.toIds, fromNextOf: undefined })}
            style={s.chip}
            accessibilityLabel={`Log again: ${a.text}`}>
            <Text style={s.chipText}>Again</Text>
          </Pressable>
        </View>
      ))}
    </Screen>
  );
}

function Back() {
  return (
    <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }} accessibilityRole="button">
      <Text style={{ color: C.accent, fontSize: 15 }}>‹ Back</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { borderBottomWidth: 1, borderColor: C.line, paddingVertical: 4 },
  leftOff: { padding: 14, paddingVertical: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  crumb: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52, paddingLeft: 14, paddingRight: 4, backgroundColor: C.crumbBg, borderWidth: 1, borderTopWidth: 0, borderColor: C.line, borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
  pen: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 8 },
  pullInRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, backgroundColor: C.quietBg },
  pullIn: { flex: 1, minHeight: 44, justifyContent: 'center', paddingLeft: 14 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
});
