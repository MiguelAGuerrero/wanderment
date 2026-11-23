import { ComponentRef, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useShown } from '@/components/shown';
import { caretAfterEdit, mentionAt, mentionEnd, replaceActiveMention, suggestDoing, suggestThreads } from '@/domain/compose';
import { findThreadByName } from '@/domain/model';
import { Id } from '@/domain/types';
import { holdsData, recentThreadOrder, sameDraft, useStore } from '@/store/useStore';
import { decorative } from '@/components/a11y';
import { C, s } from '@/theme';

/**
 * The one-line log box. Return always logs, exactly as typed.
 * "@" opens up to 3 thread suggestions for the @word at the caret; a tap (or Tab on web) picks one,
 * replacing only that @word. On web, ↑/↓ move through them and Esc closes them. An @word that isn't
 * picked stays plain text — it never creates a thread.
 */
export function Composer({
  presetDoingId,
  placeholder = 'What did you just do?',
  bridge,
  arrow,
  onEmptyEscape,
  onLogged,
}: {
  presetDoingId?: Id;
  placeholder?: string;
  bridge?: boolean;
  /** Home's Log face (P-49): the send button is one ↑ (still named "Log"; the toggle says "Log"). */
  arrow?: boolean;
  /** Web: Esc in an empty box (Home: back to What's next). */
  onEmptyEscape?: () => void;
  /** After a log: true when focus was taken care of (Home: the box went away with its face). */
  onLogged?: () => boolean;
}) {
  const data = useStore((st) => st.data);
  const draft = useStore((st) => st.draft);
  const setDraft = useStore((st) => st.setDraft);
  const log = useStore((st) => st.log);
  /** The page is taking the data back after being hidden (P-29): typing works, logging waits. */
  const reconnecting = !useStore(holdsData);
  /** Return was pressed meanwhile, and the line is still the same: it logs once the data is back. */
  const marked = useStore((st) => !!st.toLog && sameDraft(st.toLog.draft, st.draft));
  const createThread = useStore((st) => st.createThread);
  const setPullInOffer = useStore((st) => st.setPullInOffer);
  const logBoxFocus = useStore((st) => st.logBoxFocus);
  const selected = useStore((st) => st.selected?.id);
  const select = useStore((st) => st.select);
  const screenFocused = useShown();
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  /** Highlighted suggestion, remembered per query so a new query starts at the top. */
  const [active, setActive] = useState<{ query?: string; index: number }>({ index: 0 });
  /** The @mention closed with Esc (its position and the text before it); a new @ reopens. */
  const [closed, setClosed] = useState<string>();
  const [fits, setFits] = useState(true);
  /** The input's selection and the text it was seen with. When the text was changed from outside
   * (a chip, "Again", a crumb, logging), it doesn't match and the caret counts as at the end. */
  const [sel, setSel] = useState<{ start: number; end: number; text: string }>();
  /** Set once after a pick to put the caret where the @word was; cleared on the next selection or
   * edit. Never kept controlled: that fights IME composition and Android's own caret. */
  const [placeCaret, setPlaceCaret] = useState<{ start: number; end: number }>();
  // One-shot: once the pick has rendered, let go, so a later value change (Log, a crumb) never
  // re-applies a stale caret (RN re-sends `selection` with every value change while it's set).
  useEffect(() => {
    if (!placeCaret) return;
    const t = setTimeout(() => setPlaceCaret(undefined), 0);
    return () => clearTimeout(t);
  }, [placeCaret]);

  // A crumb's "Log this" was tapped: take focus back (only on the screen in front), with the caret
  // where it was, or at the end if the text was replaced.
  const seenFocus = useRef(logBoxFocus);
  useEffect(() => {
    if (seenFocus.current === logBoxFocus) return;
    seenFocus.current = logBoxFocus;
    if (!screenFocused) return;
    inputRef.current?.focus();
    const el = Platform.OS === 'web' ? (inputRef.current as unknown as HTMLInputElement | null) : null;
    const at = sel?.text === draft.text ? sel : { start: draft.text.length, end: draft.text.length };
    el?.setSelectionRange?.(at.start, at.end);
  }, [logBoxFocus, screenFocused, sel, draft.text]);

  const doingId = draft.doingId === null ? undefined : (draft.doingId ?? presetDoingId);
  // A selected range has no caret, so no mention (and no menu).
  const caret = sel?.text !== draft.text ? draft.text.length : sel.start === sel.end ? sel.start : undefined;
  const mention = caret === undefined ? undefined : mentionAt(draft.text, caret);
  const query = mention?.query;
  const suggestions = query !== undefined ? suggestThreads(data, query, recentThreadOrder(data)) : [];
  // In the middle of the text, an unmatched "@word and more" is just a sentence going on: offer to
  // create only a single word there (at the end, multi-word names still work as before).
  const midText = caret !== undefined && caret < draft.text.length;
  const canCreate =
    !!mention && mention.query.trim().length > 0 && !(midText && /\s/.test(mention.query.trim())) && !findThreadByName(data, mention.query);
  const mentionKey = mention ? `${mention.start}:${draft.text.slice(0, mention.start)}` : undefined;
  const open = !!mention && mentionKey !== closed && (suggestions.length > 0 || canCreate);
  const activeIndex = active.query === query ? Math.min(active.index, Math.max(suggestions.length - 1, 0)) : 0;
  // The highlight covers what a pick of the highlighted suggestion would take out.
  const highlightEnd = mention ? (mentionEnd(draft.text, caret!, suggestions[activeIndex]?.name ?? mention.query) ?? mention.end) : 0;
  const suggestedDoing = !doingId && !mention ? suggestDoing(data, draft.text, draft.toIds) : undefined;


  const announcement = open
    ? suggestions.length
      ? `${suggestions.length} ${suggestions.length === 1 ? 'wander matches' : 'wanders match'}, ${suggestions[activeIndex].name} selected`
      : 'No wanders match'
    : '';
  useEffect(() => {
    // Web uses the live region below; native screen readers get an announcement.
    if (announcement && Platform.OS !== 'web') AccessibilityInfo.announceForAccessibility(announcement);
  }, [announcement]);

  const onChangeText = (text: string) => {
    // The web input already has its new selection; native may report it after the text, so until
    // then assume the caret is just after what changed.
    const el = Platform.OS === 'web' ? (inputRef.current as unknown as HTMLInputElement | null) : null;
    const start = typeof el?.selectionStart === 'number' ? el.selectionStart : caretAfterEdit(useStore.getState().draft.text, text);
    const end = typeof el?.selectionEnd === 'number' ? el.selectionEnd : start;
    setSel({ start, end, text });
    setPlaceCaret(undefined);
    setDraft({ text });
    // A removed @ forgets that it was closed with Esc.
    if (start !== end || !mentionAt(text, start)) setClosed(undefined);
    // The inline @highlight is a layer behind the input; hide it if the text scrolls sideways.
    // Native re-measures through onTextLayout, so give the layer a chance to render again.
    if (Platform.OS !== 'web') setFits(true);
    else {
      requestAnimationFrame(() => {
        const el = inputRef.current as unknown as HTMLInputElement | null;
        if (el && typeof el.scrollWidth === 'number') setFits(el.scrollWidth <= el.clientWidth + 1);
      });
    }
  };

  const onSelectionChange = (e: { nativeEvent: { selection: { start: number; end: number } } }) => {
    const { start, end } = e.nativeEvent.selection;
    setSel({ start, end, text: useStore.getState().draft.text });
    setPlaceCaret(undefined);
  };

  const pick = (id: Id, name = data.threads[id]?.name) => {
    const next = replaceActiveMention(draft.text, caret ?? draft.text.length, name);
    setSel({ start: next.caret, end: next.caret, text: next.text });
    setPlaceCaret({ start: next.caret, end: next.caret });
    setDraft({ text: next.text, toIds: draft.toIds.includes(id) ? draft.toIds : [...draft.toIds, id] });
    inputRef.current?.focus();
  };
  const createAndPick = () => {
    if (!mention) return;
    const id = createThread(mention.query);
    if (!id) return;
    pick(id, mention.query);
    // Offer (quietly, after logging) to pull in earlier activities that mention it.
    setPullInOffer(id);
  };
  // While reconnecting, the store remembers the line and logs it once the data is back.
  const submit = () => {
    if (!log({ doingId }, { bridge })) return;
    if (onLogged?.()) inputRef.current?.blur();
    else inputRef.current?.focus();
  };

  const onKeyPress = (e: { nativeEvent: { key?: string }; preventDefault?: () => void }) => {
    if (Platform.OS !== 'web') return;
    const key = e.nativeEvent.key;
    if (!open) {
      // Handled here, so Home's Esc (which clears a selection) leaves it be.
      if (key === 'Escape' && onEmptyEscape && !draft.text.trim()) {
        e.preventDefault?.();
        onEmptyEscape();
      }
      return;
    }
    if ((key === 'ArrowDown' || key === 'ArrowUp') && suggestions.length) {
      e.preventDefault?.();
      setActive({ query, index: (activeIndex + (key === 'ArrowDown' ? 1 : suggestions.length - 1)) % suggestions.length });
    } else if (key === 'Tab' && suggestions[activeIndex]) {
      e.preventDefault?.();
      pick(suggestions[activeIndex].id);
    } else if (key === 'Escape') {
      e.preventDefault?.();
      setClosed(mentionKey);
    }
  };

  const chips = [
    doingId && data.threads[doingId] ? { id: doingId, label: data.threads[doingId].name, kind: 'doing' as const } : undefined,
    ...draft.toIds.filter((id) => data.threads[id]).map((id) => ({ id, label: data.threads[id].name, kind: 'to' as const })),
  ].filter(Boolean) as { id: Id; label: string; kind: 'doing' | 'to' }[];
  // The thread's step this line counts as, while that step still says what was staged.
  const stepThread = draft.fromNextOf ? data.threads[draft.fromNextOf] : undefined;
  const step = stepThread?.next && stepThread.next === draft.fromNextText ? { name: stepThread.name, text: stepThread.next } : undefined;

  return (
    <View style={styles.wrap}>
      {Platform.OS === 'web' && (
        <View style={styles.srOnly} accessibilityLiveRegion="polite">
          <Text>{announcement}</Text>
        </View>
      )}
      {open && (
        // RN's Role type has no "listbox"; react-native-web passes any ARIA role through.
        <View style={styles.suggestions} role={'listbox' as 'list'} aria-label="Wander suggestions">
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
              <Text style={[styles.suggestionText, { color: C.accent }]}>+ New wander “{mention!.query.trim()}”</Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.box}>
        {reconnecting && (
          // Over the space above the box, so nothing moves while it shows.
          <Text style={styles.reconnecting} numberOfLines={1}>
            {marked ? 'Reconnecting… it’ll log as soon as it’s back' : 'Reconnecting…'}
          </Text>
        )}
        {(chips.length > 0 || step || suggestedDoing) && (
          <View style={styles.chipRow}>
            {chips.map((c, i) => (
              <View key={c.id + c.kind} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {c.kind === 'to' && (i === 0 || chips[i - 1].kind === 'doing') && (
                  <Text style={styles.to} {...decorative}>
                    → to
                  </Text>
                )}
                <Pressable
                  onPress={() => {
                    if (c.kind === 'doing') setDraft({ doingId: null, fromNextOf: undefined, fromNextText: undefined });
                    else {
                      setDraft({ toIds: draft.toIds.filter((x) => x !== c.id) });
                      // The selected wander's chip (P-35): removing it clears the selection too.
                      if (c.id === selected) select(undefined);
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.kind === 'doing' ? 'Doing' : 'To'}: ${c.label}. Remove`}
                  style={styles.hit}>
                  <View style={[styles.smallChip, c.kind === 'doing' ? styles.doingChip : s.chipAccent]}>
                    <Text style={[styles.smallChipText, c.kind === 'doing' ? { color: '#fff' } : s.chipAccentText]}>{c.label} ×</Text>
                  </View>
                </Pressable>
              </View>
            ))}
            {step && (
              <Pressable
                onPress={() => setDraft({ fromNextOf: undefined, fromNextText: undefined })}
                accessibilityRole="button"
                accessibilityLabel={`${step.text}, next step in ${step.name}. This line counts as it. Remove`}
                style={[styles.hit, styles.stepHit]}>
                <View style={[styles.smallChip, styles.stepChip]}>
                  <Text style={[styles.smallChipText, s.chipAccentText]}>
                    <Text {...decorative}>↳ </Text>
                    {step.text} ×
                  </Text>
                </View>
              </Pressable>
            )}
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
                pointerEvents="none"
                numberOfLines={Platform.OS === 'web' ? 1 : undefined}
                {...decorative}
                onTextLayout={(e) => Platform.OS !== 'web' && setFits(e.nativeEvent.lines.length <= 1)}>
                {draft.text.slice(0, mention.start)}
                <Text style={styles.mentionMark} testID="mention-highlight">
                  {draft.text.slice(mention.start, highlightEnd)}
                </Text>
                {draft.text.slice(highlightEnd)}
              </Text>
            )}
            <TextInput
              ref={inputRef}
              value={draft.text}
              onChangeText={onChangeText}
              onSelectionChange={onSelectionChange}
              selection={placeCaret}
              placeholder={placeholder}
              placeholderTextColor={C.faint}
              style={[styles.input, styles.field]}
              returnKeyType="done"
              submitBehavior="submit"
              // react-native-web ignores submitBehavior and blurs on Enter, a moment later (a 0 ms
              // timer): that took focus from the box after a log, even once it was back in it and
              // a new line had begun. Where focus goes after a log is `submit`'s call alone.
              blurOnSubmit={false}
              onSubmitEditing={submit}
              onKeyPress={onKeyPress as never}
              accessibilityLabel={placeholder}
            />
          </View>
          {/* The same "Log" (and width) while reconnecting, dimmed; pressing it still counts. */}
          <Pressable
            onPress={submit}
            style={[s.primaryBtn, arrow && styles.arrow, !draft.text.trim() ? { opacity: 0.4 } : reconnecting && styles.logWaiting]}
            disabled={!draft.text.trim()}
            accessibilityRole="button"
            accessibilityLabel={reconnecting ? 'Log, reconnecting' : arrow ? 'Log' : undefined}
          >
            {arrow ? (
              <Text style={[s.primaryBtnText, styles.arrowText]} {...decorative}>
                ↑
              </Text>
            ) : (
              <Text style={s.primaryBtnText}>Log</Text>
            )}
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
  // The input sits above the highlight layer (and stays transparent) so the @word stays readable and
  // taps reach the input; on web an absolutely positioned layer would otherwise paint over it.
  field: { color: C.ink, backgroundColor: 'transparent', position: 'relative', zIndex: 1 },
  mirror: { position: 'absolute', left: 0, right: 0, color: 'transparent', zIndex: 0 },
  mentionMark: { backgroundColor: C.accentTint, borderRadius: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 6, paddingTop: 2, paddingRight: 8 },
  /** 44 px tall touch target around a smaller visual chip. */
  hit: { minHeight: 44, justifyContent: 'center' },
  smallChip: { minHeight: 30, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 15, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  smallChipText: { fontSize: 13, fontWeight: '500', color: C.ink },
  doingChip: { backgroundColor: C.ink, borderColor: C.ink },
  /** Long steps wrap inside the chip instead of running off the box. */
  stepHit: { flexShrink: 1, maxWidth: '100%' },
  stepChip: { backgroundColor: C.crumbBg, borderColor: C.dashed, alignItems: 'flex-start' },
  to: { fontSize: 13, fontWeight: '600', color: C.accent },
  suggestions: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 16, overflow: 'hidden' },
  suggestion: { minHeight: 48, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.lineSoft },
  suggestionActive: { backgroundColor: C.accentTint },
  suggestionText: { fontSize: 16, color: C.ink },
  hint: { fontSize: 12, color: C.accentInk },
  srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
  /** Dimmed, but still readable (it can be pressed: the line logs once the data is back). */
  logWaiting: { backgroundColor: C.muted },
  arrow: { width: 44, paddingHorizontal: 0 },
  arrowText: { fontSize: 20, lineHeight: 24 },
  reconnecting: { position: 'absolute', left: 16, right: 16, bottom: '100%', marginBottom: 2, fontSize: 12, color: C.muted },
});
