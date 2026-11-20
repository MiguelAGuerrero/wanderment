import { ComponentRef, useMemo, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { activeMention, removeActiveMention, suggestDoing, suggestThreads } from '@/domain/compose';
import { findThreadByName } from '@/domain/model';
import { Id } from '@/domain/types';
import { recentThreadOrder, useStore } from '@/store/useStore';
import { C, s } from '@/theme';

/**
 * The one-line log box. Return always logs, exactly as typed.
 * "@" opens up to 3 thread suggestions; a tap (or Tab on web) picks one.
 * An @word that isn't picked stays plain text — it never creates a thread.
 */
export function Composer({ presetDoingId, placeholder = 'What did you just do?' }: { presetDoingId?: Id; placeholder?: string }) {
  const data = useStore((st) => st.data);
  const draft = useStore((st) => st.draft);
  const setDraft = useStore((st) => st.setDraft);
  const log = useStore((st) => st.log);
  const createThread = useStore((st) => st.createThread);
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);

  const doingId = draft.doingId ?? presetDoingId;
  const mention = activeMention(draft.text);
  const suggestions = useMemo(
    () => (mention ? suggestThreads(data, mention.query, recentThreadOrder(data)) : []),
    [data, mention],
  );
  const canCreate = !!mention && mention.query.trim().length > 0 && !findThreadByName(data, mention.query);
  const suggestedDoing = !doingId && !mention ? suggestDoing(data, draft.text, draft.toIds) : undefined;

  const pick = (id: Id) => {
    setDraft({ text: removeActiveMention(draft.text), toIds: draft.toIds.includes(id) ? draft.toIds : [...draft.toIds, id] });
    inputRef.current?.focus();
  };
  const createAndPick = () => {
    if (!mention) return;
    pick(createThread(mention.query));
  };
  const submit = () => {
    if (log({ doingId })) inputRef.current?.focus();
  };

  const chips = [
    doingId && data.threads[doingId] ? { id: doingId, label: data.threads[doingId].name, kind: 'doing' as const } : undefined,
    ...draft.toIds.filter((id) => data.threads[id]).map((id) => ({ id, label: data.threads[id].name, kind: 'to' as const })),
  ].filter(Boolean) as { id: Id; label: string; kind: 'doing' | 'to' }[];

  return (
    <View style={styles.wrap}>
      {mention && (suggestions.length > 0 || canCreate) && (
        <View style={styles.suggestions} accessibilityRole="list" accessibilityLabel={`${suggestions.length} threads match`}>
          {suggestions.map((t, i) => (
            <Pressable key={t.id} onPress={() => pick(t.id)} style={[styles.suggestion, i === 0 && styles.suggestionTop]} accessibilityRole="button" accessibilityLabel={`Pick ${t.name}`}>
              <Text style={[styles.suggestionText, i === 0 && { color: C.accentInk, fontWeight: '600' }]}>{t.name}</Text>
              {i === 0 && <Text style={styles.hint}>{Platform.OS === 'web' ? 'tab or tap' : 'tap to pick'}</Text>}
            </Pressable>
          ))}
          {canCreate && (
            <Pressable onPress={createAndPick} style={styles.suggestion} accessibilityRole="button">
              <Text style={[styles.suggestionText, { color: C.accent }]}>+ New thread “{mention!.query.trim()}”</Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.box}>
        {(chips.length > 0 || suggestedDoing) && (
          <View style={styles.chipRow}>
            {chips.map((c, i) => (
              <View key={c.id + c.kind} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {c.kind === 'to' && (i === 0 || chips[i - 1].kind === 'doing') && <Text style={styles.to}>→ to</Text>}
                <Pressable
                  onPress={() =>
                    c.kind === 'doing'
                      ? setDraft({ doingId: undefined, fromNextOf: undefined })
                      : setDraft({ toIds: draft.toIds.filter((x) => x !== c.id) })
                  }
                  accessibilityLabel={`${c.kind === 'doing' ? 'Doing' : 'To'}: ${c.label}. Remove`}
                  style={[styles.smallChip, c.kind === 'doing' ? styles.doingChip : s.chipAccent]}>
                  <Text style={[styles.smallChipText, c.kind === 'doing' ? { color: '#fff' } : s.chipAccentText]}>{c.label} ×</Text>
                </Pressable>
              </View>
            ))}
            {suggestedDoing && (
              <Pressable onPress={() => setDraft({ doingId: suggestedDoing.id })} style={[styles.smallChip, s.chipDashed]} accessibilityLabel={`Suggested: doing ${suggestedDoing.name}. Tap to accept.`}>
                <Text style={[styles.smallChipText, { color: C.muted }]}>{suggestedDoing.name}?</Text>
              </Pressable>
            )}
          </View>
        )}
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            value={draft.text}
            onChangeText={(text) => setDraft({ text })}
            placeholder={placeholder}
            placeholderTextColor={C.faint}
            style={styles.input}
            returnKeyType="done"
            submitBehavior="submit"
            onSubmitEditing={submit}
            onKeyPress={(e) => {
              const key = (e.nativeEvent as { key?: string }).key;
              if (Platform.OS === 'web' && key === 'Tab' && suggestions[0]) {
                (e as unknown as { preventDefault?: () => void }).preventDefault?.();
                pick(suggestions[0].id);
              }
            }}
            accessibilityLabel={placeholder}
          />
          <Pressable onPress={submit} style={[s.primaryBtn, !draft.text.trim() && { opacity: 0.4 }]} disabled={!draft.text.trim()} accessibilityRole="button">
            <Text style={s.primaryBtnText}>Log</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, backgroundColor: C.bg },
  box: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.dashed, borderRadius: 24, padding: 4, paddingLeft: 16, gap: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: { flex: 1, fontSize: 16, color: C.ink, minHeight: 44, paddingVertical: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, paddingTop: 8, paddingRight: 8 },
  smallChip: { height: 30, paddingHorizontal: 10, borderRadius: 15, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  smallChipText: { fontSize: 13, fontWeight: '500', color: C.ink },
  doingChip: { backgroundColor: C.ink, borderColor: C.ink },
  to: { fontSize: 13, fontWeight: '600', color: C.accent },
  suggestions: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 16, overflow: 'hidden' },
  suggestion: { minHeight: 48, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.lineSoft },
  suggestionTop: { backgroundColor: C.accentTint, borderTopWidth: 0 },
  suggestionText: { fontSize: 16, color: C.ink },
  hint: { fontSize: 12, color: C.accentInk },
});
