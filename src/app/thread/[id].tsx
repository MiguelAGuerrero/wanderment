import { router, useLocalSearchParams } from 'expo-router';
import { ComponentRef, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { candidatesForThread } from '@/domain/emergence';
import { OLD_HOME } from '@/domain/home';
import { declaredWhys, MAX_WHYS } from '@/domain/model';
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
  const declareThread = useStore((st) => st.declareThread);
  const undeclareThread = useStore((st) => st.undeclareThread);
  const swapWhy = useStore((st) => st.swapWhy);
  const setDraft = useStore((st) => st.setDraft);
  const loadNext = useStore((st) => st.loadNext);
  const dismissedPullIn = useStore((st) => st.dismissedPullIn);
  const dismissPullIn = useStore((st) => st.dismissPullIn);
  const draftHasText = useStore((st) => st.draft.text.trim() !== '');
  const [editingNext, setEditingNext] = useState(false);
  const [nextValue, setNextValue] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [nameValue, setNameValue] = useState('');
  /** The thread that already has the typed name, when a rename was refused. */
  const [nameTaken, setNameTaken] = useState<{ name: string; hidden: boolean }>();
  const takenText = nameTaken
    ? `Another wander is already called “${nameTaken.name}”.${nameTaken.hidden ? ' It’s hidden — you can unhide it in Settings.' : ''}`
    : '';
  useEffect(() => {
    // Web announces through the live region below; iOS has no live regions, so say it.
    if (takenText && Platform.OS !== 'web') AccessibilityInfo.announceForAccessibility(takenText);
  }, [takenText]);
  const cancelRename = () => (setRenaming(false), setNameTaken(undefined));

  const thread = id ? data.threads[id] : undefined;
  /** Declaring when MAX_WHYS are already marked offers a swap, inline (nothing is chosen for you). */
  const [swapOpen, setSwapOpen] = useState(false);
  const whyChip = useRef<ComponentRef<typeof View>>(null);
  const whys = declaredWhys(data);
  const swapShown = swapOpen && !!thread && !thread.declaredAt && !thread.hidden && whys.length >= MAX_WHYS;
  const swapText = swapShown
    ? `You have ${whys.length > MAX_WHYS ? 'more than three' : 'three'} things it’s all for. Swap one?`
    : '';
  useEffect(() => {
    if (swapText && Platform.OS !== 'web') AccessibilityInfo.announceForAccessibility(swapText);
  }, [swapText]);
  const closeSwap = () => {
    setSwapOpen(false);
    // The row's buttons are gone: keep keyboard focus on the control that opened it.
    if (Platform.OS === 'web') requestAnimationFrame(() => (whyChip.current as unknown as HTMLElement | null)?.focus?.());
  };
  useEffect(() => {
    if (!swapShown || Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSwap();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [swapShown]);
  if (!thread) {
    return (
      <Screen composer={false}>
        <Back />
        <Text style={s.body}>This wander doesn’t exist anymore.</Text>
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
        <View>
          <TextInput
            value={nameValue}
            onChangeText={(text) => (setNameValue(text), setNameTaken(undefined))}
            autoFocus
            onSubmitEditing={() => {
              const res = renameThread(thread.id, nameValue);
              if (res.ok) setRenaming(false);
              else if (res.reason === 'taken') setNameTaken({ name: res.other.name, hidden: res.other.hidden });
            }}
            onKeyPress={(e) => {
              if (e.nativeEvent.key === 'Escape') cancelRename();
            }}
            style={[s.h1, styles.field]}
            accessibilityLabel="Wander name"
            {...(Platform.OS === 'web' ? { 'aria-invalid': !!nameTaken, 'aria-describedby': nameTaken ? 'rename-taken' : undefined } : {})}
          />
          {/* Always mounted while renaming, so the refusal is announced when it appears. */}
          <View accessibilityLiveRegion="polite">
            {nameTaken && (
              <Text nativeID="rename-taken" style={[s.body, styles.nameTaken]}>
                {takenText}
              </Text>
            )}
          </View>
          <Pressable onPress={cancelRename} style={[s.chip, { alignSelf: 'flex-start', marginTop: 8 }]} accessibilityRole="button">
            <Text style={s.chipText}>Cancel</Text>
          </Pressable>
        </View>
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
                // Refused while reconnecting: the typed step stays in the box.
                if (setNext(thread.id, nextValue)) setEditingNext(false);
              }}
              accessibilityLabel={`Next step for ${thread.name}`}
            />
            <Pressable
              onPress={() => {
                if (setNext(thread.id, nextValue)) setEditingNext(false);
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
              accessibilityLabel={
                thread.next
                  ? `${thread.next}. Next step for ${thread.name}. ${draftHasText ? 'Double-tap to count the line in the log box as this step.' : 'Double-tap to load into the log box.'}`
                  : '+ What’s next? Set a next step'
              }>
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
        <Pressable onPress={() => (setNameValue(thread.name), setNameTaken(undefined), setSwapOpen(false), setRenaming(true))} style={s.chip} accessibilityRole="button">
          <Text style={s.chipText}>Rename</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            if (setHidden(thread.id, !thread.hidden) && !thread.hidden) router.back();
          }}
          style={s.chip}
          accessibilityRole="button">
          <Text style={s.chipText}>{thread.hidden ? 'Unhide' : 'Hide'}</Text>
        </Pressable>
        {!thread.hidden && (
          <Pressable onPress={() => router.push(`/explore?center=${encodeURIComponent(thread.id)}`)} style={s.chip} accessibilityRole="link">
            <Text style={s.chipText}>Explore</Text>
          </Pressable>
        )}
      </View>
      {/* On its own row, so its label changing never moves it (or what's below) under a finger.
          A hidden thread can't be what it's for (unhide it first), and it waits while renaming so
          a typed name is never dropped. */}
      {!thread.hidden && !renaming && (
        <View style={styles.whyRow}>
          <Pressable
            ref={whyChip}
            onPress={() => {
              if (thread.declaredAt) return undeclareThread(thread.id);
              const res = declareThread(thread.id);
              setSwapOpen(!res.ok && res.reason === 'full');
            }}
            style={[s.chip, styles.whyChip]}
            accessibilityRole="button">
            <Text style={[s.chipText, styles.whyText]}>{thread.declaredAt ? 'Not what it’s for right now' : 'What it’s for'}</Text>
          </Pressable>
        </View>
      )}

      {/* Always mounted, so the offer is announced (once, politely) when it appears. */}
      <View accessibilityLiveRegion="polite">
        {swapShown && <Text style={s.body}>{swapText}</Text>}
      </View>
      {swapShown && (
        <View style={styles.swap}>
          {whys.map((w) => (
            <Pressable key={w.id} onPress={() => swapWhy(w.id, thread.id) && closeSwap()} style={styles.swapBtn} accessibilityRole="button">
              <Text style={s.chipText}>Swap with “{w.name}”</Text>
            </Pressable>
          ))}
          <Pressable onPress={closeSwap} style={[s.chip, { alignSelf: 'flex-start' }]} accessibilityRole="button">
            <Text style={s.chipText}>Cancel</Text>
          </Pressable>
        </View>
      )}

      {pullable > 0 && (
        <View style={styles.pullInRow}>
          <Pressable onPress={() => router.push(`/pull-in/${thread.id}`)} style={styles.pullIn} accessibilityRole="button">
            <Text style={{ color: C.body, fontSize: 14 }}>
              Some earlier activities without a wander mention this · <Text style={{ color: C.accent, fontWeight: '600' }}>Review</Text>
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
    <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace(OLD_HOME))} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }} accessibilityRole="button">
      <Text style={{ color: C.accent, fontSize: 15 }}>‹ Back</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { borderBottomWidth: 1, borderColor: C.line, paddingVertical: 4 },
  nameTaken: { color: C.accentInk, marginTop: 6 },
  leftOff: { padding: 14, paddingVertical: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  crumb: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52, paddingLeft: 14, paddingRight: 4, backgroundColor: C.crumbBg, borderWidth: 1, borderTopWidth: 0, borderColor: C.line, borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
  pen: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  whyRow: { flexDirection: 'row', marginTop: -8 },
  whyChip: { maxWidth: '100%' },
  whyText: { flexShrink: 1 },
  swap: { gap: 8 },
  swapBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface },
  pullInRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, backgroundColor: C.quietBg },
  pullIn: { flex: 1, minHeight: 44, justifyContent: 'center', paddingLeft: 14 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
});
