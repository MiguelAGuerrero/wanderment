/**
 * B-11 slice 1 (P-86): the PLAIN routine editor — a list of steps and wait steps, move up / down, the
 * Repeat divider's place and "Until I'm done / A number", "Ends here" or an open edge, the name, and
 * Remove. Live, with Undo, no Save (B-11 §4). No blocks, drag, rails, blanks or reuse in this slice.
 */
import { router, useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { useSavedField } from '@/components/useSavedField';
import { RoutineEdit } from '@/domain/run';
import { routineView, RoutineView } from '@/domain/runView';
import { useStore } from '@/store/useStore';

import { Mark } from './marks';
import { Notice } from './Notice';
import { Repeat } from './Repeat';
import { goHome } from './Runner';
import { readDraft, writeDraft } from './session';
import { G, SP, TARGET } from './tokens';
import { Bar, Btn, Field, focusSoon, GoScreen, GrowField, H1, InputRef, T, TextRef } from './ui';

export function Editor({ routineId }: { routineId: string }) {
  const data = useStore((s) => s.data);
  const focused = useIsFocused();
  const r = routineView(data, routineId);
  const edit = (e: RoutineEdit) => useStore.getState().editRoutine(routineId, e);
  // What is being typed in the add row is kept across a reload.
  const draftKey = `add:${routineId}`;
  const [text, setTextState] = useState(() => readDraft(draftKey).replace(/^wait:|^step:/, ''));
  const [wait, setWaitState] = useState(() => readDraft(draftKey).startsWith('wait:'));
  const setText = (t: string, w = wait) => {
    setTextState(t);
    writeDraft(draftKey, t ? `${w ? 'wait' : 'step'}:${t}` : '');
  };
  const setWait = (w: boolean) => {
    setWaitState(w);
    setText(text, w);
  };
  const [nameError, setNameError] = useState(false);
  const { width } = useWindowDimensions();
  const title = useRef<TextRef>(null);
  const add = useRef<InputRef>(null);
  const gone = !r;
  useEffect(() => {
    if (gone && focused) goHome();
  }, [gone, focused]);
  useEffect(() => {
    if (focused) focusSoon(title);
  }, [focused]);
  const name = useSavedField(r?.name ?? '');
  if (!r) return <GoScreen testID="go-editor" settled={false}>{null}</GoScreen>;

  const rename = () => {
    const words = name.value.trim();
    if (!words || words === r.name) {
      name.setValue(r.name);
      setNameError(false);
      return;
    }
    const did = edit({ kind: 'rename', words });
    setNameError(!did.ok && did.reason === 'same-name');
  };
  const addIt = () => {
    if (!text.trim()) return;
    // Refused (reconnecting): the words stay in the field.
    if (edit(wait ? { kind: 'addWait', wait: text } : { kind: 'addStep', text }).ok) setText('');
    // The field keeps the focus: the next step can be typed at once.
    add.current?.focus();
  };
  const n = r.items.length;
  const divider = (
    <View style={styles.divider} testID="go-edit-divider">
      <View style={styles.dividerTitle}>
        <Mark name="repeat" color={G.text} />
        <T bold style={styles.grow}>
          Repeat from here
        </T>
      </View>
      <View style={styles.dividerHead}>
        <Btn mark="up" spoken="Move Repeat from here up" disabled={(r.repeatFrom ?? 0) <= 0} onPress={() => edit({ kind: 'divider', from: (r.repeatFrom ?? 0) - 1 })} />
        <Btn mark="down" spoken="Move Repeat from here down" disabled={(r.repeatFrom ?? 0) >= n - 1} onPress={() => edit({ kind: 'divider', from: (r.repeatFrom ?? 0) + 1 })} />
        <Btn mark="close" spoken="Runs once: take Repeat from here out" onPress={() => edit({ kind: 'divider' })} />
      </View>
      <Repeat repeat={r.repeat} onChange={(times) => edit({ kind: 'repeat', ...(times !== undefined && { times }) })} />
    </View>
  );

  return (
    <GoScreen testID="go-editor">
      <Bar onBack={() => (router.canGoBack() ? router.back() : router.replace('/go'))}>
        <H1 own ref={title}>
          {r.name}
        </H1>
      </Bar>
      <ScrollView style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.labelled}>
          <T dim>Name</T>
          <Field
            value={name.value}
            onChangeText={(t) => {
              name.setValue(t);
              setNameError(false);
            }}
            onFocus={name.onFocus}
            onBlur={() => {
              name.onBlur();
              rename();
            }}
            onSubmitEditing={rename}
            accessibilityLabel="Name"
            aria-invalid={nameError}
            testID="go-edit-name"
          />
          {nameError && (
            <T color={G.err} accessibilityRole="alert" testID="go-edit-name-error">
              ! Another routine has this name
            </T>
          )}
        </View>

        {r.items.map((item, i) => (
          <View key={item.id} style={styles.gap}>
            {r.repeatFrom === i && divider}
            <ItemRow item={item} first={i === 0} last={i === n - 1} edit={edit} narrow={width < 340} />
          </View>
        ))}
        {r.repeatFrom === undefined && n > 0 && <Btn kind="plain" mark="repeat" label="Repeat from here" spoken="Add Repeat from here" onPress={() => edit({ kind: 'divider', from: 0 })} testID="go-edit-add-divider" />}

        <Btn label={`Ends here: ${r.open ? 'Off' : 'On'}`} pressed={!r.open} onPress={() => edit({ kind: 'open', open: !r.open })} style={styles.left} testID="go-edit-ends" />

        <View style={styles.rule} />
        <Btn
          kind="plain"
          mark="bin"
          label={`Remove ${r.name}`}
          disabled={!!r.runId}
          testID="go-edit-remove"
          onPress={() => {
            // Undo is on home's notice; a routine with a run going can't be removed (the button says so by being unavailable).
            useStore.getState().editRoutine(routineId, { kind: 'removeRoutine' });
          }}
        />
      </ScrollView>
      <Notice />
      <View style={styles.addRow}>
        <Btn mark="wait" label="A wait" spoken="Add it as a wait" pressed={wait} onPress={() => setWait(!wait)} style={[styles.addWait, wait && styles.on]} testID="go-edit-wait" />
        <Field
          ref={add}
          bare
          value={text}
          onChangeText={setText}
          placeholder={wait ? 'Wait for…' : 'Add a step'}
          accessibilityLabel={wait ? 'Add a wait' : 'Add a step'}
          keepFocus
          onSubmitEditing={addIt}
          style={styles.addField}
          testID="go-edit-add"
        />
        <Btn kind="plain" mark="return" spoken={wait ? 'Add this wait' : 'Add this step'} disabled={!text.trim()} onPress={addIt} />
      </View>
    </GoScreen>
  );
}

function ItemRow({ item, first, last, edit, narrow }: { narrow: boolean; item: RoutineView['items'][number]; first: boolean; last: boolean; edit: (e: RoutineEdit) => { ok: boolean } }) {
  const words = useSavedField(item.words);
  const keep = () => {
    const now = words.value.trim();
    if (!now || now === item.words) {
      words.setValue(item.words);
      return;
    }
    if (!edit({ kind: 'reword', item: item.id, text: now }).ok) return;
  };
  return (
    <View style={[styles.item, narrow && styles.itemNarrow]} testID="go-edit-item" {...{ dataSet: { kind: item.kind } }}>
      {item.kind !== 'step' && (
        <View style={styles.itemMark}>
          <Mark name={item.kind === 'wait' ? 'wait' : 'routine'} color={G.text} />
        </View>
      )}
      {item.kind === 'routine' ? (
        <T style={[styles.itemWords, narrow && styles.fieldNarrow]}>{item.words}</T>
      ) : (
        // A long step is shown whole: it wraps and the row grows (the person's words are never cut).
        <GrowField
          bare
          value={words.value}
          onChangeText={words.setValue}
          onFocus={words.onFocus}
          onBlur={() => {
            words.onBlur();
            keep();
          }}
          onSubmit={keep}
          accessibilityLabel={item.kind === 'wait' ? `Wait for: ${item.words}` : `Step: ${item.words}`}
          style={[styles.itemField, narrow && styles.fieldNarrow]}
        />
      )}
      <Btn kind="plain" mark="up" spoken={`Move ${item.words} up`} disabled={first} onPress={() => edit({ kind: 'move', item: item.id, by: -1 })} style={styles.sq} />
      <Btn kind="plain" mark="down" spoken={`Move ${item.words} down`} disabled={last} onPress={() => edit({ kind: 'move', item: item.id, by: 1 })} style={styles.sq} />
      <Btn kind="plain" mark="bin" spoken={`Remove ${item.words}`} onPress={() => edit({ kind: 'remove', item: item.id })} style={styles.sq} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minHeight: 0 },
  grow: { flex: 1, minWidth: 0 },
  gap: { gap: SP.s2 },
  left: { alignSelf: 'flex-start' },
  body: { padding: SP.s3, gap: SP.s2 },
  labelled: { gap: SP.s1, marginBottom: SP.s2 },
  item: { flexDirection: 'row', alignItems: 'flex-start', minHeight: TARGET, borderWidth: 2, borderColor: G.line, backgroundColor: G.surf },
  itemNarrow: { flexWrap: 'wrap', justifyContent: 'flex-end' },
  fieldNarrow: { flexBasis: '70%' },
  itemMark: { width: 40, alignItems: 'center' },
  itemField: { flex: 1, minWidth: 0, paddingHorizontal: SP.s3 - 4 },
  itemWords: { flex: 1, minWidth: 0, paddingHorizontal: SP.s3 - 4, paddingVertical: SP.s2 },
  sq: { width: TARGET, paddingHorizontal: 0, justifyContent: 'center' },
  divider: { borderTopWidth: 2, borderTopColor: G.text, paddingTop: SP.s2, paddingBottom: SP.s2, gap: SP.s2 },
  dividerTitle: { flexDirection: 'row', alignItems: 'center', gap: SP.s2 },
  dividerHead: { flexDirection: 'row', alignItems: 'center', gap: SP.s2, flexWrap: 'wrap' },
  rule: { height: 1, backgroundColor: G.line, marginVertical: SP.s2 },
  addRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginHorizontal: SP.s3, marginBottom: SP.s3, borderWidth: 2, borderColor: G.text, backgroundColor: G.surf },
  addWait: { borderWidth: 0, borderRightWidth: 2 },
  on: { backgroundColor: G.surf2 },
  // Wide enough to type in, always: at large text the row wraps instead.
  addField: { flex: 1, minWidth: 96, paddingHorizontal: SP.s3 },
});
