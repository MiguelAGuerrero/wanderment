/**
 * P-97 (owner, 2026-11-26: "maybe tags and alphabetical sorting"): a routine's Tags sheet — from Plan's routine
 * ··· and a My routines row's ···. A field where a comma or Return makes a chip; each chip, "#tag ×", removes
 * itself; **Keep** (filled) keeps them (with what is still typed), Close leaves them as they were. Tags are
 * kept trimmed, without "#" and once without case (`domain/tags.ts`); they are shown with "#".
 */
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { addTags, tagKey } from '@/domain/tags';

import { Mark } from './marks';
import { G, SP, TARGET } from './tokens';
import { Btn, Field, InputRef, Sheet, T } from './ui';

export function TagsSheet({ name, tags: had, onKeep, onClose, fallback }: { name: string; tags: readonly string[]; onKeep: (tags: string[]) => void; onClose: () => void; fallback: { current: unknown } }) {
  const [tags, setTags] = useState<string[]>(() => [...had]);
  const [typed, setTyped] = useState('');
  const field = useRef<InputRef>(null);
  /** A comma typed (or pasted): every part before the last comma is a chip; what follows it stays typed. */
  const type = (text: string) => {
    const cut = text.lastIndexOf(',');
    if (cut < 0) return setTyped(text);
    setTags((t) => addTags(t, text.slice(0, cut)));
    setTyped(text.slice(cut + 1).replace(/^\s+/, ''));
  };
  const chip = () => {
    setTags((t) => addTags(t, typed));
    setTyped('');
  };
  const remove = (tag: string) => {
    setTags((t) => t.filter((x) => tagKey(x) !== tagKey(tag)));
    field.current?.focus();
  };
  const keep = () => onKeep(addTags(tags, typed));
  return (
    <Sheet title={`Tags for ${name}`} onClose={onClose} testID="go-tags-sheet" fallback={fallback}>
      {tags.length > 0 && (
        <View style={styles.chips} testID="go-tags-chips">
          {tags.map((t) => (
            <Pressable
              key={tagKey(t)}
              onPress={() => remove(t)}
              accessibilityRole="button"
              accessibilityLabel={`Remove #${t}`}
              testID="go-tags-chip"
              style={(state) => [styles.chip, (state as { focused?: boolean }).focused && styles.ring]}>
              <T>#{t}</T>
              <Mark name="close" size={18} color={G.dim} />
            </Pressable>
          ))}
        </View>
      )}
      <Field
        ref={field}
        value={typed}
        onChangeText={type}
        accessibilityLabel="Add a tag"
        placeholder="Add a tag"
        autoCapitalize="none"
        autoCorrect={false}
        keepFocus
        returnKeyType="done"
        onSubmitEditing={chip}
        testID="go-tags-field"
        {...{ dataSet: { first: 'true' } }}
      />
      <Btn kind="filled" label="Keep" spoken={`Keep the tags for ${name}`} onPress={keep} size={18} testID="go-tags-keep" />
      <Btn label="Close" onPress={onClose} testID="go-tags-close" />
    </Sheet>
  );
}

/** A routine's tags in words, each with "#" (a row's second line, Plan's line under its heading). */
export const tagWords = (tags: readonly string[]) => tags.map((t) => `#${t}`).join(' ');

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.s2 },
  chip: { minHeight: TARGET, flexDirection: 'row', alignItems: 'center', gap: SP.s1, paddingLeft: SP.s3, paddingRight: SP.s2, borderWidth: 2, borderColor: G.line, backgroundColor: G.surf2 },
  ring: { outlineStyle: 'solid', outlineWidth: 2, outlineColor: G.text, outlineOffset: 2 } as object,
});
