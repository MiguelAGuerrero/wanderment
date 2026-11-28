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
 *
 * P-101 (ruling 7): the step's fields are no longer typed in place — each reads its label and its value
 * and opens `EntrySheet` (label, a field that wraps, the filled Keep, Close), which rises with the
 * keyboard. The value sheet shows the trace: routine › step from the run's root to the giving step,
 * each routine's values under it, then "read by". `Gives`: hoisted "gives {a}, {b}".
 *
 * P-107: a for each's item reads "photo 2 of 3: the boxer" in the values row. A name a for each reads is a list: its
 * giving step's field opens `ListSheet` — one row per item (each with its ×), + Add another, the filled Keep — never
 * one line read apart at commas; several lines pasted into a row offer Split into rows / Keep as one. Its value sheet
 * shows the items as rows: a list changes only by being given again.
 */
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { addressesIn } from '@/domain/places';
import { ListRef, readRoutine } from '@/domain/run';
import { myRoutines } from '@/domain/routines';
import { MAX_ITEMS, MAX_VALUE } from '@/domain/values';
import { partsText, ShownItem, StepPart, valueDetail, ValueField, valueFrom, ValueShown, valueTrace, wordsShown } from '@/domain/runView';
import { useStore } from '@/store/useStore';

import { decorative } from '../a11y';
import { Mark } from './marks';
import { OpenRows } from './Places';
import { G, SP, TARGET } from './tokens';
import { Btn, focusOn, focusSoon, GrowField, Sheet, T, ViewRef } from './ui';

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
            {p.shown ? <ValueText shown={p.shown} color={on} /> : p.text}
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

/**
 * P-108: a value's words — each item that is a routine drawn with the routine mark before its name ("▤ Draw with
 * guidelines: slower"); items joined as in words ("a, b and c"). The mark is drawn, never spoken (the words are).
 */
export function ValueText({ shown, color = G.text }: { shown: ShownItem[]; color?: string }) {
  return (
    <>
      {shown.map((x, i) => (
        <Text key={i}>
          {i > 0 && (i === shown.length - 1 ? ' and ' : ', ')}
          {!!(x.routine || x.removed) && (
            <Text {...decorative} testID="go-value-routine">
              <Mark name="routine" size={18} color={color} />{' '}
            </Text>
          )}
          {x.text}
        </Text>
      ))}
    </>
  );
}

/**
 * The values in play, under the runner's top line: each opens its sheet. None: no row. P-110 (the owner: "not
 * displaying placeholders if those values aren't supplied … It should only show the active state of declaration at
 * that point"): only the values held at the place — P-101's "{ } name: not given yet" is gone.
 */
export function ValuesRow({ values, onOpen }: { values: ValueShown[]; onOpen: (name: string) => void }) {
  if (!values.length) return null;
  return (
    <View style={styles.row} testID="go-values">
      {values.map((v) => {
        // P-107 (B-15 journey 7): a for each's item says where it is in its list — "photo 2 of 3".
        const label = v.each ? `${v.name} ${v.each.n} of ${v.each.of}` : v.name;
        return (
        <Pressable
          key={`${v.level}:${v.name}`}
          onPress={() => onOpen(v.name)}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${v.text}${v.from !== undefined ? ` · from ${v.from}` : ''}`}
          testID="go-value"
          {...{ dataSet: { name: v.name } }}
          style={(state) => [styles.value, (state as { focused?: boolean }).focused && RING]}>
          <Mark name="braces" size={20} color={G.dim} />
          <T style={styles.shrink}>
            <T dim>{`${label}: `}</T>
            {v.shown ? <ValueText shown={v.shown} /> : v.text}
            {/* P-98 (ruling 4): an input of the routine the run is in — where it came from. */}
            {v.from !== undefined && <T dim testID="go-value-from-step">{` · from ${v.from}`}</T>}
          </T>
        </Pressable>
        );
      })}
    </View>
  );
}

/**
 * The step's fields (ruling 6; P-101 ruling 7): each a target that reads its label and its value — "{ }
 * subject: figures in motion", or "asks { } subject" — and opens the entry sheet (`onOpen`).
 */
export function ValueFields({ fields, onOpen }: { fields: ValueField[]; onOpen: (field: ValueField) => void }) {
  if (!fields.length) return null;
  return (
    <View style={styles.fields} testID="go-value-fields">
      {fields.map((f) => {
        const label = f.gives ? f.name : `asks ${f.name}`;
        return (
          <Pressable
            key={f.name}
            onPress={() => onOpen(f)}
            accessibilityRole="button"
            accessibilityLabel={f.text ? `${label}: ${f.text}` : label}
            testID="go-value-field"
            {...{ dataSet: { name: f.name, gives: f.gives ? 'true' : 'false' } }}
            style={(state) => [styles.field, (state as { focused?: boolean }).focused && RING]}>
            <View style={styles.label}>
              {!f.gives && <T dim>asks</T>}
              <Mark name="braces" size={20} color={G.dim} />
              <T bold>{f.name}</T>
            </View>
            {!!f.text && (
              <T style={styles.shrink} testID="go-value-field-text">
                {f.text}
              </T>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * P-101 (ruling 7): typing a value — a sheet of its own over the runner (it rises with the keyboard): the
 * label, a field that wraps, the filled Keep, Close (leaves it as it was). Keep is the field's own write,
 * as typing in place was (P-96 ruling 4): giving a value for the first time leaves no notice; replacing or
 * clearing one says "Changed / Cleared {name}", with an Undo (audit F3). Return keeps it.
 */
export function EntrySheet(props: { runId: string; itemId: string; field: ValueField; onClose: () => void; fallback: { current: unknown } }) {
  return props.field.list ? <ListSheet {...props} /> : <TextSheet {...props} />;
}

/** P-108: one row of a giving field — words, or a routine it holds (by reference) with the words beside it. */
type Row = { text: string; ref: ListRef | null };
/** A row's routine is gone once its words no longer begin with the routine's name (they are words then). */
const rowAfter = (r: Row, text: string): Row => ({ text, ref: r.ref && text.trim().toLowerCase().startsWith(r.ref.name.toLowerCase()) ? r.ref : null });

/**
 * P-108 (B-16, "Giving a routine"): the person's routines a giving field offers as they type — those whose name has
 * the words in it; with nothing typed, only where the name is read by a routine row (`all`). The run's own routine is
 * left out. A tap makes the row that routine (a call, not text).
 */
function RoutineOffers({ typed, all, runId, onPick }: { typed: string; all?: boolean; runId?: string; onPick: (ref: ListRef) => void }) {
  const data = useStore((s) => s.data);
  const q = typed.trim().toLowerCase();
  if (!all && q.length < 2) return null;
  const own = runId ? data.runs[runId]?.routineId : undefined;
  const found = myRoutines(data)
    .filter((r) => r.routineId !== own && (!q || r.name.toLowerCase().includes(q)) && r.name.toLowerCase() !== q)
    .slice(0, 5);
  if (!found.length) return null;
  return (
    <View style={styles.offers} testID="go-routine-offers">
      {found.map((r) => (
        <Btn key={r.routineId} kind="plain" mark="routine" label={r.name} spoken={`Use the routine ${r.name}`} onPress={() => onPick({ ref: r.routineId, name: r.name })} testID="go-routine-offer" dataSet={{ routine: r.routineId }} />
      ))}
    </View>
  );
}

function TextSheet({ runId, itemId, field, onClose, fallback }: { runId: string; itemId: string; field: ValueField; onClose: () => void; fallback: { current: unknown } }) {
  const was: Row = { text: field.text, ref: field.refs?.[0] ?? null };
  const [row, setRow] = useState<Row>(was);
  const label = field.gives ? field.name : `asks ${field.name}`;
  const fieldRef = useRef<unknown>(null);
  const keep = () => {
    const s = useStore.getState();
    if (row.text !== was.text || row.ref?.ref !== was.ref?.ref) {
      // Refused (reconnecting): the sheet stays, with what was typed.
      if (!s.typeValue(runId, itemId, field.name, row.text, row.ref ? [row.ref] : undefined).ok) return;
      if (field.text) s.typedOver(runId, itemId, field.name, field.text, undefined, field.refs);
    }
    onClose();
  };
  return (
    <Sheet title={label} onClose={onClose} testID="go-entry-sheet" fallback={fallback}>
      <View style={styles.listRow}>
        {!!row.ref && (
          <View style={styles.rowMark} testID="go-entry-routine">
            <Mark name="routine" color={G.dim} />
          </View>
        )}
        <GrowField ref={fieldRef as never} value={row.text} onChangeText={(t) => setRow((r) => rowAfter(r, t))} accessibilityLabel={label} placeholder="Any words, or a routine’s name" maxLength={MAX_VALUE} onSubmit={keep} style={styles.listField} testID="go-entry-field" {...{ dataSet: { first: 'true', name: field.name } }} />
      </View>
      {!row.ref && (
        <RoutineOffers
          typed={row.text}
          all={field.routines}
          runId={runId}
          onPick={(ref) => {
            setRow({ text: ref.name, ref });
            focusSoon(fieldRef);
          }}
        />
      )}
      <Btn kind="filled" label="Keep" spoken={`Keep ${field.name}`} onPress={keep} size={18} testID="go-entry-keep" />
      <Btn label="Close" onPress={onClose} testID="go-entry-close" />
    </Sheet>
  );
}

/** P-107: the lines of words pasted into one row (blank ones dropped). */
const linesOf = (text: string) => text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

/**
 * P-107 (B-15 journey 7): a list given at its step — one row per item, each with its × (Remove), + Add another; Return
 * in a row opens the next. Several lines pasted into a row offer **Split into rows** (one item per line) or **Keep
 * as one** (the lines joined by spaces) — nothing is split by itself, and never at commas. Keep is the field's own
 * write, as `TextSheet`'s: a first list says nothing; replacing or clearing one says "Changed / Cleared {name}",
 * with an Undo that puts its items back. P-108: a row can be a routine (offered as it is typed), drawn with its mark,
 * with words after its name.
 */
function ListSheet({ runId, itemId, field, onClose, fallback }: { runId: string; itemId: string; field: ValueField; onClose: () => void; fallback: { current: unknown } }) {
  const was = field.items ?? [];
  const wasRefs = field.refs ?? was.map(() => null);
  return (
    <ListEditor
      title={field.name}
      testID="go-list-sheet"
      rows={was.map((text, i) => ({ text, ref: wasRefs[i] ?? null }))}
      offerAll={field.routines}
      runId={runId}
      fallback={fallback}
      onClose={onClose}
      onKeep={(items, refs) => {
        const s = useStore.getState();
        if (JSON.stringify(items) === JSON.stringify(was) && JSON.stringify(refs) === JSON.stringify(wasRefs)) return true;
        // Refused (reconnecting): the sheet stays, with its rows.
        if (!s.typeList(runId, itemId, field.name, items, refs.some(Boolean) ? refs : undefined).ok) return false;
        if (was.length) s.typedOver(runId, itemId, field.name, field.text, was, field.refs);
        return true;
      }}
    />
  );
}

/**
 * P-112: a list typed in the runner's See ahead view, for a step not reached yet — the same list editor, its rows held
 * by the view (a draft) until Next takes the steps in view as done. Nothing is written here.
 */
export function DraftListSheet({ title, items, refs, runId, routines, onKeep, onClose, fallback }: { title: string; items: string[]; refs?: (ListRef | null)[]; runId: string; routines?: boolean; onKeep: (items: string[], refs: (ListRef | null)[]) => void; onClose: () => void; fallback: { current: unknown } }) {
  return (
    <ListEditor
      title={title}
      testID="go-list-sheet"
      rows={items.map((text, i) => ({ text, ref: refs?.[i] ?? null }))}
      offerAll={routines}
      runId={runId}
      fallback={fallback}
      onClose={onClose}
      onKeep={(kept, r) => {
        onKeep(kept, r);
        return true;
      }}
    />
  );
}

/**
 * P-108: + Add on a kept list (in Plan, under its block; on the routine's tile) — its items as rows, a new one at the end
 * with the focus; the filled Keep keeps the list in the routine (one change, said, with its Undo). No count anywhere.
 */
export function KeptSheet({ seq, list, onClose, fallback }: { seq: string; list: string; onClose: () => void; fallback: { current: unknown } }) {
  const data = useStore((s) => s.data);
  const each = readRoutine(data, seq)?.each;
  const kept = each?.kept ?? [];
  const refs = each?.refs ?? kept.map(() => null);
  return (
    <ListEditor
      title={list}
      testID="go-kept-sheet"
      rows={[...kept.map((text, i) => ({ text, ref: refs[i] ?? null })), { text: '', ref: null }]}
      focusLast
      fallback={fallback}
      onClose={onClose}
      onKeep={(items, r) => {
        if (JSON.stringify(items) === JSON.stringify(kept) && JSON.stringify(r) === JSON.stringify(refs)) return true;
        return useStore.getState().editRoutine(seq, { kind: 'keptList', items, refs: r }).ok;
      }}
    />
  );
}

function ListEditor({ title, testID, rows: start, offerAll, runId, focusLast, onKeep, onClose, fallback }: { title: string; testID: string; rows: Row[]; offerAll?: boolean; runId?: string; focusLast?: boolean; onKeep: (items: string[], refs: (ListRef | null)[]) => boolean; onClose: () => void; fallback: { current: unknown } }) {
  const [rows, setRows] = useState<Row[]>(() => (start.length ? start : [{ text: '', ref: null }]));
  /** The row that holds several pasted lines, offering to split them. */
  const [pasted, setPasted] = useState<number | null>(null);
  /** The row being typed in (its routines are offered under it). */
  const [active, setActive] = useState<number | null>(null);
  /**
   * The row to give the focus to once it is drawn (a new one, or the one after a row removed). It is the person's
   * own move from the row they were typing in, so it is moved at once after the render that draws it (`focusSoon`
   * never takes the focus out of a field); not there yet, `focusSoon` waits for it.
   */
  const focusAt = useRef<number | null>(focusLast ? Math.max(0, start.length - 1) : null);
  const setFocusAt = (i: number) => {
    focusAt.current = i;
  };
  const fields = useRef<Record<number, unknown>>({});
  useEffect(() => {
    const i = focusAt.current;
    if (i === null) return;
    focusAt.current = null;
    const el = fields.current[i] as HTMLElement | null | undefined;
    if (WEB && el?.isConnected && typeof el.focus === 'function') el.focus();
    else focusSoon({ current: el });
  });
  const set = (i: number, text: string) => {
    setRows((r) => r.map((x, j) => (j === i ? rowAfter(x, text) : x)));
    setPasted(linesOf(text).length > 1 ? i : pasted === i ? null : pasted);
  };
  const addAfter = (i: number) => {
    if (rows.length >= MAX_ITEMS) return;
    setRows((r) => [...r.slice(0, i + 1), { text: '', ref: null }, ...r.slice(i + 1)]);
    setPasted(null);
    setFocusAt(i + 1);
  };
  const remove = (i: number) => {
    setRows((r) => (r.length === 1 ? [{ text: '', ref: null }] : r.filter((_, j) => j !== i)));
    setPasted(null);
    setFocusAt(Math.max(0, Math.min(i, rows.length - 2)));
  };
  const split = (i: number) => {
    const lines = linesOf(rows[i].text);
    setRows((r) => [...r.slice(0, i), ...lines.map((text) => ({ text, ref: null })), ...r.slice(i + 1)].slice(0, MAX_ITEMS));
    setPasted(null);
    setFocusAt(Math.min(i + lines.length - 1, MAX_ITEMS - 1));
  };
  const asOne = (i: number) => {
    set(i, linesOf(rows[i].text).join(' '));
    setPasted(null);
    setFocusAt(i);
  };
  const keep = () => {
    const kept = rows.flatMap((r) => (r.text.trim() ? [{ text: linesOf(r.text).join(' '), ref: r.ref }] : []));
    if (onKeep(
      kept.map((r) => r.text),
      kept.map((r) => r.ref),
    ))
      onClose();
  };
  return (
    <Sheet title={title} onClose={onClose} testID={testID} fallback={fallback}>
      <View style={styles.list} role="list" aria-label={title}>
        {rows.map((row, i) => {
          const text = row.text;
          const spoken = `${title} ${i + 1}`;
          const n = linesOf(text).length;
          return (
            <View key={i} role="listitem" style={styles.listItem} testID="go-list-row">
              <View style={styles.listRow}>
                {!!row.ref && (
                  <View style={styles.rowMark} testID="go-list-routine">
                    <Mark name="routine" color={G.dim} />
                  </View>
                )}
                <GrowField
                  ref={(el) => {
                    fields.current[i] = el;
                  }}
                  value={text}
                  onChangeText={(t) => set(i, t)}
                  onSubmit={() => addAfter(i)}
                  onFocus={() => setActive(i)}
                  accessibilityLabel={spoken}
                  placeholder="One item per row"
                  maxLength={MAX_VALUE}
                  style={styles.listField}
                  testID="go-list-field"
                  {...(i === 0 && { dataSet: { first: 'true' } })}
                />
                <Btn kind="plain" mark="close" spoken={`Remove ${text.trim() ? linesOf(text).join(' ') : spoken}`} onPress={() => remove(i)} testID="go-list-remove" />
              </View>
              {pasted === i && n > 1 && (
                <View style={styles.pasted} testID="go-list-pasted">
                  <Btn kind="plain" label={`Split into ${n} rows`} onPress={() => split(i)} testID="go-list-split" />
                  <Btn kind="plain" label="Keep as one" onPress={() => asOne(i)} testID="go-list-one" />
                </View>
              )}
              {active === i && !row.ref && n <= 1 && (
                <RoutineOffers
                  typed={text}
                  all={offerAll}
                  runId={runId}
                  onPick={(ref) => {
                    setRows((r) => r.map((x, j) => (j === i ? { text: ref.name, ref } : x)));
                    setFocusAt(i);
                  }}
                />
              )}
            </View>
          );
        })}
      </View>
      {rows.length < MAX_ITEMS && <Btn kind="plain" mark="add" label="Add another" spoken={`Add another to ${title}`} onPress={() => addAfter(rows.length - 1)} testID="go-list-add" />}
      <Btn kind="filled" label="Keep" spoken={`Keep ${title}`} onPress={keep} size={18} testID="go-list-keep" />
      <Btn label="Close" onPress={onClose} testID="go-list-close" />
    </Sheet>
  );
}

/** P-101 (ruling 7): hoisted gives — "gives {a}, {b}". */
export function Gives({ names, testID }: { names: string[]; testID?: string }) {
  return (
    <T dim testID={testID}>
      {'gives '}
      {names.map((n, i) => (
        <Text key={n}>
          {i > 0 && ', '}
          <NameChip name={n} />
        </Text>
      ))}
    </T>
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
  const trace = valueTrace(data, runId, name) ?? [];
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
      {/* P-107: a list a for each reads — its items, one per row; it changes only by being given again (its step's list). */}
      {d.list ? (
        <View style={styles.list} role="list" aria-label={d.name} testID="go-value-sheet-list">
          {(d.shown ?? d.items.map((text) => ({ text }))).map((x, i) => (
            <T key={i} role="listitem" style={styles.listShown}>
              {d.shown ? <ValueText shown={[x]} /> : x.text}
            </T>
          ))}
        </View>
      ) : (
        <>
          {/* P-108: a value that is a routine — the routine, drawn with its mark (it changes as words here). */}
          {!!d.shown && (
            <T testID="go-value-sheet-routine">
              <ValueText shown={d.shown} />
            </T>
          )}
          <GrowField value={text} onChangeText={setText} accessibilityLabel={d.name} placeholder="Any words; empty clears it" maxLength={MAX_VALUE} onSubmit={() => focusOn(keepBtn)} testID="go-value-sheet-field" {...{ dataSet: { first: 'true' } }} />
        </>
      )}
      <T dim testID="go-value-from">
        {valueFrom({ ...d, from: d.from && (partsText(wordsShown(data, runId, d.from)) || d.from) })}
      </T>
      {/* P-101 (ruling 7): the trace — routine › step from the run's root to the giving step, each routine's values under it. */}
      {trace.length > 0 && (
        <View style={styles.trace} testID="go-value-trace" role="list" aria-label="Trace">
          {trace.map((l, i) => (
            <View key={i} style={[styles.traceLevel, { paddingLeft: Math.min(i, 4) * SP.s2 }]} role="listitem" testID="go-trace-level">
              <T>
                <T dim>{`${l.routine} › `}</T>
                {partsText(wordsShown(data, runId, l.step)) || l.step}
              </T>
              {l.values.map((x) => (
                <View key={x.name} style={styles.traceValue}>
                  <Mark name="braces" size={20} color={G.dim} />
                  <T style={styles.shrink}>
                    <T dim>{`${x.name}: `}</T>
                    {x.shown ? <ValueText shown={x.shown} /> : x.text}
                  </T>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
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
      {/* P-109 (B-18 journey 4): an address in the value — "Open <host>" (the words stay words). */}
      <OpenRows addresses={addressesIn(d.text)} />
      {!d.list && <Btn kind="filled" ref={keepBtn} label="Keep" spoken={`Keep ${d.name}`} onPress={keep} size={18} testID="go-value-keep" />}
      <Btn label="Close" onPress={onClose} testID="go-value-close" {...(d.list && { dataSet: { first: 'true' } })} />
    </Sheet>
  );
}

/** A name in Plan's words: `{name}` as a chip. */
export function NameChip({ name, asks = false }: { name: string; asks?: boolean }) {
  return (
    <T bold style={[styles.chip, asks && styles.chipAsks]} testID="go-name-chip" {...{ dataSet: { name, asks: asks ? 'true' : 'false' } }}>
      {asks && <T dim>{'asks '}</T>}
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
  field: { minHeight: TARGET, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SP.s2, borderWidth: 2, borderColor: G.line, backgroundColor: G.surf, paddingHorizontal: SP.s3 - 4, paddingVertical: SP.s1 },
  trace: { gap: SP.s2 },
  traceLevel: { gap: SP.s1 },
  traceValue: { flexDirection: 'row', alignItems: 'flex-start', gap: SP.s1, paddingLeft: SP.s3 },
  label: { flexDirection: 'row', alignItems: 'center', gap: SP.s1 },
  readBy: { gap: SP.s1 },
  reader: { paddingLeft: SP.s3 },
  chip: { backgroundColor: G.surf2, paddingHorizontal: 4 },
  // P-107: the list editor's rows, and a list shown in the value sheet.
  list: { gap: SP.s2 },
  listItem: { gap: SP.s1 },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SP.s1 },
  listField: { flex: 1, minWidth: 0 },
  pasted: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.s2 },
  // P-108: a row that is a routine (its mark), and the routines offered under a row.
  rowMark: { minHeight: TARGET, justifyContent: 'center' },
  offers: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.s1 },
  listShown: { borderLeftWidth: 2, borderColor: G.line, paddingLeft: SP.s2, flexShrink: 1 },
  // P-101 amendment (ruling 11): the fallback — dashed, on no fill.
  chipAsks: { backgroundColor: 'transparent', borderWidth: 1, borderStyle: 'dashed', borderColor: G.dim },
});
