/**
 * P-96 (B-15 journeys 1–4; contract rulings 5–6): the parts of the screens that show values.
 *
 * - `Parts`: words with the values in place, each value inverted (display only: it is the words' own
 *   colours swapped, so it reads as the value and not as a control). A blank — a name nothing gave —
 *   reads `{name}`.
 * - `ValuesRow`: the runner's row under the top line, one target per value ("{ } subject: figures in
 *   motion", ≥ 48 px, wrapping — never cut down to bare names); a press opens the value sheet.
 * - `ValueFields`: the fields under the step's words — the giving step's, labelled with its name, and
 *   one for each name the step asks for ("asks { } name"). Kept as typed, no notice (ruling 4).
 * - `ValueSheet`: the value, where it came from and when, what reads it; filled Keep keeps a change
 *   (with Undo when it replaced or cleared the value), Close leaves it as it was.
 * - `NameChip`: a name in Plan's words (`{subject}` shown as a chip).
 */
import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { MAX_VALUE } from '@/domain/values';
import { partsText, StepPart, valueDetail, ValueField, valueFrom, ValueShown, wordsShown } from '@/domain/runView';
import { useSavedField } from '@/components/useSavedField';
import { useStore } from '@/store/useStore';

import { decorative } from '../a11y';
import { Mark } from './marks';
import { G, SP, TARGET } from './tokens';
import { Btn, Field, focusOn, GrowField, Sheet, T, ViewRef } from './ui';

const WEB = Platform.OS === 'web';
const RING = WEB ? ({ outlineStyle: 'solid', outlineWidth: 2, outlineColor: G.focus, outlineOffset: 3 } as object) : null;

/** Words with values in place: a value is the words' colours swapped (`on` the background, `ink` the words). */
export function Parts({ parts, ink, on }: { parts: StepPart[]; ink: string; on: string }) {
  return (
    <>
      {parts.map((p, i) =>
        p.kind === 'text' ? (
          p.text
        ) : p.kind === 'value' ? (
          <Text key={i} style={[styles.inverted, { backgroundColor: ink, color: on }]} testID="go-value-in-place" {...{ dataSet: { name: p.name } }}>
            {p.text}
          </Text>
        ) : (
          <Text key={i} style={[styles.blank, { color: ink, borderColor: ink }]} testID="go-value-blank" {...{ dataSet: { name: p.name } }}>
            {`{${p.name}}`}
          </Text>
        ),
      )}
    </>
  );
}

/** The values in play, under the runner's top line: each opens its sheet. Nothing in play: no row. */
export function ValuesRow({ values, onOpen }: { values: ValueShown[]; onOpen: (name: string) => void }) {
  if (!values.length) return null;
  return (
    <View style={styles.row} testID="go-values">
      {values.map((v) => (
        <Pressable
          key={`${v.level}:${v.name}`}
          onPress={() => onOpen(v.name)}
          accessibilityRole="button"
          accessibilityLabel={`${v.name}: ${v.text}`}
          testID="go-value"
          {...{ dataSet: { name: v.name } }}
          style={(state) => [styles.value, (state as { focused?: boolean }).focused && RING]}>
          <Mark name="braces" size={20} color={G.dim} />
          <T style={styles.shrink}>
            <T dim>{`${v.name}: `}</T>
            {v.text}
          </T>
        </Pressable>
      ))}
    </View>
  );
}

/** The step's fields (ruling 6): a labelled field, never a placeholder alone. Return goes on to Next (`onDone`). */
export function ValueFields({ runId, itemId, fields, onDone }: { runId: string; itemId: string; fields: { name: string; text: string; gives: boolean }[]; onDone: () => void }) {
  if (!fields.length) return null;
  return (
    <View style={styles.fields} testID="go-value-fields">
      {fields.map((f) => (
        <OneField key={`${itemId}:${f.name}`} runId={runId} itemId={itemId} field={f} onDone={onDone} />
      ))}
    </View>
  );
}

function OneField({ runId, itemId, field, onDone }: { runId: string; itemId: string; field: ValueField; onDone: () => void }) {
  const saved = useSavedField(field.text);
  // P-96 audit F3: what the field held when it was entered — typed over and left, the edit is named, with Undo.
  const began = useRef<string | null>(null);
  const label = field.gives ? field.name : `asks ${field.name}`;
  const id = `go-value-label-${itemId}-${field.name}`;
  return (
    <View style={styles.field}>
      <View style={styles.label} nativeID={id}>
        {!field.gives && <T dim>asks</T>}
        <Mark name="braces" size={20} color={G.dim} />
        <T bold>{field.name}</T>
      </View>
      <Field
        value={saved.value}
        onChangeText={(text) => {
          // Refused (reconnecting): the words stay in the field.
          saved.setValue(text);
          useStore.getState().typeValue(runId, itemId, field.name, text);
        }}
        onFocus={() => {
          began.current = saved.value;
          saved.onFocus();
        }}
        onBlur={() => {
          saved.onBlur();
          const was = began.current;
          began.current = null;
          if (was) useStore.getState().typedOver(runId, itemId, field.name, was);
        }}
        accessibilityLabel={label}
        maxLength={MAX_VALUE}
        submitBehavior="blurAndSubmit"
        onSubmitEditing={onDone}
        testID="go-value-field"
        {...{ dataSet: { name: field.name, gives: field.gives ? 'true' : 'false' } }}
      />
    </View>
  );
}

/**
 * The value sheet (journey 4): the value (editable), "from <step> · <routine> · <when>", "read by"
 * the steps that read it, filled Keep, Close. Keep is the one write (`changeValue`); Close — the
 * handle, Esc, Back, the scrim — leaves the value as it was.
 */
export function ValueSheet({ runId, name, onClose, fallback }: { runId: string; name: string; onClose: () => void; fallback: { current: unknown } }) {
  const data = useStore((s) => s.data);
  const d = valueDetail(data, runId, name);
  const [text, setText] = useState(() => d?.text ?? '');
  const keepBtn = useRef<ViewRef>(null);
  if (!d) return null;
  const keep = () => {
    // Refused (reconnecting): the sheet stays, with what was typed.
    if (text !== d.text && !useStore.getState().changeValue(runId, d.name, text).ok) return;
    onClose();
  };
  return (
    <Sheet title={d.name} onClose={onClose} testID="go-value-sheet" fallback={fallback}>
      <GrowField value={text} onChangeText={setText} accessibilityLabel={d.name} maxLength={MAX_VALUE} onSubmit={() => focusOn(keepBtn)} testID="go-value-sheet-field" {...{ dataSet: { first: 'true' } }} />
      <T dim testID="go-value-from">
        {valueFrom({ ...d, from: d.from && (partsText(wordsShown(data, runId, d.from)) || d.from) })}
      </T>
      {d.readBy.length > 0 && (
        <View style={styles.readBy} testID="go-value-read-by">
          <T dim>read by</T>
          {d.readBy.map((r) => (
            <T key={r.itemId} style={styles.reader}>
              {partsText(wordsShown(data, runId, r.words)) || r.words}
            </T>
          ))}
        </View>
      )}
      <Btn kind="filled" ref={keepBtn} label="Keep" spoken={`Keep ${d.name}`} onPress={keep} size={18} testID="go-value-keep" />
      <Btn label="Close" onPress={onClose} testID="go-value-close" />
    </Sheet>
  );
}

/** A name in Plan's words: `{name}` as a chip. */
export function NameChip({ name }: { name: string }) {
  return (
    <T bold style={styles.chip} testID="go-name-chip" {...{ dataSet: { name } }}>
      <T {...decorative} dim>
        {'{'}
      </T>
      {name}
      <T {...decorative} dim>
        {'}'}
      </T>
    </T>
  );
}

const styles = StyleSheet.create({
  shrink: { flexShrink: 1, minWidth: 0 },
  inverted: { paddingHorizontal: 2 },
  blank: { borderBottomWidth: 2, borderStyle: 'dashed' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.s2, marginHorizontal: 16, marginTop: SP.s2 },
  value: { minHeight: TARGET, maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: SP.s1, borderWidth: 2, borderColor: G.line, backgroundColor: G.surf, paddingHorizontal: SP.s2, paddingVertical: SP.s1 },
  fields: { gap: SP.s2, paddingHorizontal: 16, paddingBottom: SP.s2 },
  field: { gap: SP.s1 },
  label: { flexDirection: 'row', alignItems: 'center', gap: SP.s1 },
  readBy: { gap: SP.s1 },
  reader: { paddingLeft: SP.s3 },
  chip: { backgroundColor: G.surf2, paddingHorizontal: 4 },
});
