import { ComponentRef, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { activeMention, removeActiveMention, suggestDoing, suggestThreads } from '@/domain/compose';
import { findThreadByName } from '@/domain/model';
import { Id } from '@/domain/types';
import { recentThreadOrder, useStore } from '@/store/useStore';
import { decorative } from '@/components/a11y';
import { C, s } from '@/theme';

/**
 * The one-line log box. Return always logs, exactly as typed.
 * "@" opens up to 3 thread suggestions; a tap (or Tab on web) picks one. On web, ↑/↓ move
 * through them and Esc closes them. An @word that isn't picked stays plain text — it never
 * creates a thread.
 */
export function Composer({ presetDoingId, placeholder = 'What did you just do?' }: { presetDoingId?: Id; placeholder?: string }) {
  const data = useStore((st) => st.data);
  const draft = useStore((st) => st.draft);
  const setDraft = useStore((st) => st.setDraft);
  const log = useStore((st) => st.log);
  const createThread = useStore((st) => st.createThread);
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  /** Highlighted suggestion, remembered per query so a new query starts at the top. */
  const [active, setActive] = useState<{ query?: string; index: number }>({ index: 0 });
  /** Start index of an @mention the person closed with Esc; it stays closed until a new @. */
  const [closedAt, setClosedAt] = useState<number>();
  const [fits, setFits] = useState(true);

  const doingId = draft.doingId ?? presetDoingId;
  const mention = activeMention(draft.text);
  const query = mention?.query;
  const suggestions = query !== undefined ? suggestThreads(data, query, recentThreadOrder(data)) : [];
  const canCreate = !!mention && mention.query.trim().length > 0 && !findThreadByName(data, mention.query);
  const open = !!mention && mention.start !== closedAt && (suggestions.length > 0 || canCreate);
  const activeIndex = active.query === query ? Math.min(active.index, Math.max(suggestions.length - 1, 0)) : 0;
  const suggestedDoing = !doingId && !mention ? suggestDoing(data, draft.text, draft.toIds) : undefined;


  const announcement = open
    ? suggestions.length
      ? `${suggestions.length} ${suggestions.length === 1 ? 'thread matches' : 'threads match'}, ${suggestions[activeIndex].name} selected`
      : 'No threads match'
    : '';
  useEffect(() => {
    // Web uses the live region below; native screen readers get an announcement.
    if (announcement && Platform.OS !== 'web') AccessibilityInfo.announceForAccessibility(announcement);
  }, [announcement]);

  const onChangeText = (text: string) => {
    setDraft({ text });
    // A removed @ forgets that it was closed with Esc.
    if (!activeMention(text)) setClosedAt(undefined);
    // The inline @highlight is a layer behind the input; hide it if the text scrolls sideways.
    if (Platform.OS === 'web') {
      requestAnimationFrame(() => {
        const el = inputRef.current as unknown as HTMLInputElement | null;
        if (el && typeof el.scrollWidth === 'number') setFits(el.scrollWidth <= el.clientWidth + 1);
      });
    }
  };

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

  const onKeyPress = (e: { nativeEvent: { key?: string }; preventDefault?: () => void }) => {
    if (Platform.OS !== 'web' || !open) return;
    const key = e.nativeEvent.key;
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      e.preventDefault?.();
      if (suggestions.length) setActive({ query, index: (activeIndex + (key === 'ArrowDown' ? 1 : suggestions.length - 1)) % suggestions.length });
    } else if (key === 'Tab' && suggestions[activeIndex]) {
      e.preventDefault?.();
      pick(suggestions[activeIndex].id);
    } else if (key === 'Escape') {
      e.preventDefault?.();
      setClosedAt(mention?.start);
    }
  };

  const chips = [
    doingId && data.threads[doingId] ? { id: doingId, label: data.threads[doingId].name, kind: 'doing' as const } : undefined,
    ...draft.toIds.filter((id) => data.threads[id]).map((id) => ({ id, label: data.threads[id].name, kind: 'to' as const })),
  ].filter(Boolean) as { id: Id; label: string; kind: 'doing' | 'to' }[];

  return (
    <View style={styles.wrap}>
      {Platform.OS === 'web' && (
        <View style={styles.srOnly} accessibilityLiveRegion="polite">
          <Text>{announcement}</Text>
        </View>
      )}
      {open && (
        // RN's Role type has no "listbox"; react-native-web passes any ARIA role through.
        <View style={styles.suggestions} role={'listbox' as 'list'} aria-label="Thread suggestions">
          {suggestions.map((t, i) => (
            <Pressable
              key={t.id}
              onPress={() => pick(t.id)}
              style={[styles.suggestion, i === 0 && { borderTopWidth: 0 }, i === activeIndex && styles.suggestionActive]}
              role="option"
              aria-selected={i === activeIndex}>
              <Text style={[styles.suggestionText, i === activeIndex && { color: C.accentInk, fontWeight: '600' }]}>{t.name}</Text>
              {i === activeIndex && (
                <Text style={styles.hint}>
                  {Platform.OS === 'web' ? 'tab or tap' : 'tap to pick'}
                </Text>
              )}
            </Pressable>
          ))}
          {canCreate && (
            <Pressable onPress={createAndPick} style={[styles.suggestion, suggestions.length === 0 && { borderTopWidth: 0 }]} role="option" aria-selected={false}>
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
                {c.kind === 'to' && (i === 0 || chips[i - 1].kind === 'doing') && (
                  <Text style={styles.to} {...decorative}>
                    → to
                  </Text>
                )}
                <Pressable
                  onPress={() =>
                    c.kind === 'doing'
                      ? setDraft({ doingId: undefined, fromNextOf: undefined })
                      : setDraft({ toIds: draft.toIds.filter((x) => x !== c.id) })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`${c.kind === 'doing' ? 'Doing' : 'To'}: ${c.label}. Remove`}
                  style={styles.hit}>
                  <View style={[styles.smallChip, c.kind === 'doing' ? styles.doingChip : s.chipAccent]}>
                    <Text style={[styles.smallChipText, c.kind === 'doing' ? { color: '#fff' } : s.chipAccentText]}>{c.label} ×</Text>
                  </View>
                </Pressable>
              </View>
            ))}
            {suggestedDoing && (
              <Pressable onPress={() => setDraft({ doingId: suggestedDoing.id })} style={styles.hit} accessibilityRole="button" accessibilityLabel={`Suggested: doing ${suggestedDoing.name}. Tap to accept.`}>
                <View style={[styles.smallChip, s.chipDashed]}>
                  <Text style={[styles.smallChipText, { color: C.muted }]}>{suggestedDoing.name}?</Text>
                </View>
              </Pressable>
            )}
          </View>
        )}
        <View style={styles.inputRow}>
          <View style={styles.inputWrap}>
            {mention && fits && (
              <Text
                style={[styles.input, styles.mirror]}
                numberOfLines={Platform.OS === 'web' ? 1 : undefined}
                {...decorative}
                onTextLayout={(e) => Platform.OS !== 'web' && setFits(e.nativeEvent.lines.length <= 1)}>
                {draft.text.slice(0, mention.start)}
                <Text style={styles.mentionMark} testID="mention-highlight">
                  {draft.text.slice(mention.start)}
                </Text>
              </Text>
            )}
            <TextInput
              ref={inputRef}
              value={draft.text}
              onChangeText={onChangeText}
              placeholder={placeholder}
              placeholderTextColor={C.faint}
              style={[styles.input, styles.field]}
              returnKeyType="done"
              submitBehavior="submit"
              onSubmitEditing={submit}
              onKeyPress={onKeyPress as never}
              accessibilityLabel={placeholder}
            />
          </View>
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
  box: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.dashed, borderRadius: 24, padding: 4, paddingLeft: 16, gap: 2 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inputWrap: { flex: 1, justifyContent: 'center' },
  input: { fontSize: 16, lineHeight: 22, paddingVertical: 11, paddingHorizontal: 0, minHeight: 44 },
  field: { color: C.ink, backgroundColor: 'transparent' },
  mirror: { position: 'absolute', left: 0, right: 0, color: 'transparent' },
  mentionMark: { backgroundColor: C.accentTint, borderRadius: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 6, paddingTop: 2, paddingRight: 8 },
  /** 44 px tall touch target around a smaller visual chip. */
  hit: { minHeight: 44, justifyContent: 'center' },
  smallChip: { minHeight: 30, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 15, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  smallChipText: { fontSize: 13, fontWeight: '500', color: C.ink },
  doingChip: { backgroundColor: C.ink, borderColor: C.ink },
  to: { fontSize: 13, fontWeight: '600', color: C.accent },
  suggestions: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 16, overflow: 'hidden' },
  suggestion: { minHeight: 48, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.lineSoft },
  suggestionActive: { backgroundColor: C.accentTint },
  suggestionText: { fontSize: 16, color: C.ink },
  hint: { fontSize: 12, color: C.accentInk },
  srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
});
