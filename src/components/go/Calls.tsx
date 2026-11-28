/**
 * P-98: calls — a routine as a step, with what it asks and gives.
 *
 * - `CallLines`: under a call row's name in Plan — a `with …` line for each input (a target: it opens what fills
 *   it), and "gives {a}, {b}".
 * - `RoutinesSheet`: Add's "a routine" — the person's routines, A–Z, each with what it asks and gives; a tap adds it
 *   as a step; a routine that would be a step of itself is refused, in words.
 * - `BindSheet`: what fills one input — a name given above (`{y} as x`), typed words, or Ask when it runs.
 * - `InputsSheet`: Edit inputs on a call with more than one.
 * - `CopySheet`: Copy… on a routine's ··· — the name (suggested "<name> (copy)"), filled Copy; a name in use is refused.
 * - `ForEachSheet` (P-107): Add's "For each…" — one ready-made sentence per name given above ("photo in {photos}"); a
 *   tap makes the block.
 * - `OwedSheet`: Next, or Step out, past a call (or a step broken down) that still owes names — a field for each,
 *   then the filled move. Left empty, the move goes on and a later step asks (the owner: nothing extra on the step).
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { CallInput, PlanCall } from '@/domain/runView';
import { isName, itemNameFor, MAX_NAME, MAX_VALUE, tidyName } from '@/domain/values';

import { Mark } from './marks';
import { G, SP } from './tokens';
import { Btn, Field, GrowField, Sheet, T } from './ui';
import { Gives } from './Values';

/** A call input as its line reads it. */
export function inputWords(i: CallInput): string {
  if (i.mode === 'typed') return `with ${i.typed} as ${i.input}`;
  if (i.mode === 'name') return i.name.toLowerCase() === i.input.toLowerCase() ? `with {${i.input}}` : `with {${i.name}} as ${i.input}`;
  return `asks {${i.input}}`;
}

/** Under a call row's name: its inputs (each opens what fills it) and what it gives. */
export function CallLines({ name, call, onInput }: { name: string; call: PlanCall; onInput: (input: string) => void }) {
  if (call.removed || (!call.inputs.length && !call.gives.length)) return null;
  return (
    <View style={styles.lines} testID="go-plan-call">
      {call.inputs.map((i) => (
        <Btn key={i.input} kind="plain" label={inputWords(i)} spoken={`${name} ${inputWords(i)}: change`} onPress={() => onInput(i.input)} style={styles.line} testID="go-plan-input" dataSet={{ input: i.input, mode: i.mode }} />
      ))}
      {call.gives.length > 0 && <Gives names={call.gives} testID="go-plan-call-gives" />}
    </View>
  );
}

export interface RoutineChoice {
  routineId: string;
  name: string;
  /** Its second line: what it asks and gives. */
  line: string;
}

/**
 * Add's "a routine": the person's routines; a tap adds one as a step. `error`: why the last one was refused. P-108: first,
 * the names given above — a routine row whose routine is that value, `▤ {name}` (`onName`).
 */
/**
 * P-105 (B-17 journey 4): and, under a "Library" heading after the person's own ("Yours"), the library's methods they
 * don't have yet — a tap opens its preview, whose filled button is Copy and add (`onLibrary`).
 */
export function RoutinesSheet({ names = [], onName, routines, library = [], onLibrary, error, onPick, onClose, fallback }: { names?: string[]; onName?: (name: string) => void; routines: RoutineChoice[]; library?: RoutineChoice[]; onLibrary?: (id: string) => void; error?: string; onPick: (routineId: string) => void; onClose: () => void; fallback: { current: unknown } }) {
  return (
    <Sheet title="Add a routine" onClose={onClose} testID="go-routines-sheet" fallback={fallback}>
      {!!error && (
        <T color={G.err} accessibilityRole="alert" testID="go-routines-sheet-error">
          {`! ${error}`}
        </T>
      )}
      {names.map((n, i) => (
        <Btn key={`{${n}}`} kind="plain" mark="routine" label={`{${n}}`} spoken={`Add as a step: the routine in {${n}}`} onPress={() => onName?.(n)} testID="go-routines-sheet-name" dataSet={{ name: n, ...(i === 0 && { first: 'true' }) }} />
      ))}
      {library.length > 0 && (
        <T bold role="heading" aria-level={3} accessibilityRole="header" testID="go-routines-sheet-heading">
          Yours
        </T>
      )}
      {routines.length === 0 && !names.length && <T dim>No routines yet.</T>}
      {routines.map((r, i) => (
        <Btn key={r.routineId} kind="plain" mark="routine" label={r.line ? `${r.name} · ${r.line}` : r.name} spoken={`Add as a step: ${r.line ? `${r.name} · ${r.line}` : r.name}`} onPress={() => onPick(r.routineId)} testID="go-routines-sheet-row" dataSet={{ routine: r.routineId, ...(i === 0 && !names.length && { first: 'true' }) }} />
      ))}
      {library.length > 0 && (
        <T bold role="heading" aria-level={3} accessibilityRole="header" testID="go-routines-sheet-heading">
          Library
        </T>
      )}
      {library.map((r) => {
        const label = r.line ? `${r.name} · ${r.line}` : r.name;
        return <Btn key={r.routineId} kind="plain" mark="routine" label={label} spoken={`${label}, in the library: look before copying`} onPress={() => onLibrary?.(r.routineId)} testID="go-routines-sheet-lib" dataSet={{ lib: r.routineId }} />;
      })}
      <Btn label="Close" onPress={onClose} />
    </Sheet>
  );
}

/**
 * P-107: Add's "For each…" — a sentence per name given above, "photo in {photos}"; a tap makes the block (`onPick(list)`).
 * P-108: or a list of its own, named here — asked each run, or kept in the routine (`onPick(list, own)`); a name the
 * routine already uses is refused, in words.
 */
export function ForEachSheet({ lists, onPick, onClose, fallback }: { lists: string[]; onPick: (list: string, own?: 'asked' | 'kept') => { ok: boolean; reason?: string } | void; onClose: () => void; fallback: { current: unknown } }) {
  const [name, setName] = useState('');
  const [taken, setTaken] = useState(false);
  const own = isName(name) ? tidyName(name) : '';
  const make = (kind: 'asked' | 'kept') => {
    if (!own) return;
    const did = onPick(own, kind);
    setTaken(!!did && !did.ok && did.reason === 'same-name');
  };
  const sentence = own ? `For each ${itemNameFor(own)} in {${own}}` : '';
  return (
    <Sheet title="For each…" onClose={onClose} testID="go-each-sheet" fallback={fallback}>
      {lists.map((list, i) => {
        const words = `${itemNameFor(list)} in {${list}}`;
        return <Btn key={list} kind="plain" label={words} spoken={`For each ${words}`} onPress={() => onPick(list)} testID="go-each-sheet-row" dataSet={{ list, ...(i === 0 && { first: 'true' }) }} />;
      })}
      <Field
        value={name}
        onChangeText={(t) => {
          setName(t);
          setTaken(false);
        }}
        accessibilityLabel="A list of its own"
        placeholder="A list of its own"
        maxLength={MAX_NAME}
        testID="go-each-own-name"
        {...(!lists.length && { dataSet: { first: 'true' } })}
      />
      {taken && (
        <T color={G.err} accessibilityRole="alert" testID="go-each-own-error">
          {`! {${own}} is already a name here`}
        </T>
      )}
      <View style={styles.own}>
        <Btn label="Ask each run" spoken={sentence ? `Ask each run: ${sentence}` : 'Ask each run'} disabled={!own} onPress={() => make('asked')} testID="go-each-own-asked" />
        <Btn label="Keep it here" spoken={sentence ? `Keep it here: ${sentence}` : 'Keep it here'} disabled={!own} onPress={() => make('kept')} testID="go-each-own-kept" />
      </View>
      <Btn label="Close" onPress={onClose} testID="go-each-sheet-close" />
    </Sheet>
  );
}

/** What fills one input of a call: a name given above, typed words, or Ask when it runs. */
export function BindSheet({ routine, input, current, names, onBind, onClose, fallback }: { routine: string; input: string; current?: CallInput; names: string[]; onBind: (to: { typed: string } | { name: string } | { ask: true }) => void; onClose: () => void; fallback: { current: unknown } }) {
  const [words, setWords] = useState(current?.mode === 'typed' ? current.typed : '');
  const keep = () => words.trim() && onBind({ typed: words });
  const on = (n: string) => current?.mode === 'name' && current.name.toLowerCase() === n.toLowerCase();
  return (
    <Sheet title={`${routine} with {${input}}`} onClose={onClose} testID="go-bind-sheet" fallback={fallback}>
      {names.map((n, i) => (
        <Btn key={n} kind="plain" mark="braces" label={n.toLowerCase() === input.toLowerCase() ? `{${n}}` : `{${n}} as ${input}`} spoken={`Use {${n}} as ${input}`} pressed={on(n)} onPress={() => onBind({ name: n })} testID="go-bind-name" dataSet={{ name: n, ...(i === 0 && { first: 'true' }) }} />
      ))}
      <Btn kind="plain" label="Ask when it runs" pressed={current?.mode === 'asks'} onPress={() => onBind({ ask: true })} testID="go-bind-ask" />
      <Field value={words} onChangeText={setWords} accessibilityLabel={`Words for ${input}`} placeholder="Words" maxLength={MAX_VALUE} submitBehavior="submit" returnKeyType="done" onSubmitEditing={keep} testID="go-bind-words" {...(!names.length && { dataSet: { first: 'true' } })} />
      <Btn kind="filled" label="Keep" spoken={words.trim() ? `Keep ${words.trim()} as ${input}` : 'Keep'} disabled={!words.trim()} onPress={keep} size={18} testID="go-bind-keep" />
      <Btn label="Close" onPress={onClose} testID="go-bind-close" />
    </Sheet>
  );
}

/** Edit inputs, on a call with more than one: each input's line, opening what fills it. */
export function InputsSheet({ routine, inputs, onInput, onClose, fallback }: { routine: string; inputs: CallInput[]; onInput: (input: string) => void; onClose: () => void; fallback: { current: unknown } }) {
  return (
    <Sheet title={`Inputs of ${routine}`} onClose={onClose} testID="go-inputs-sheet" fallback={fallback}>
      {inputs.map((i, n) => (
        <Btn key={i.input} kind="plain" label={inputWords(i)} spoken={`${inputWords(i)}: change`} onPress={() => onInput(i.input)} testID="go-inputs-row" dataSet={n === 0 ? { first: 'true' } : undefined} />
      ))}
      <Btn label="Close" onPress={onClose} />
    </Sheet>
  );
}

/** Copy… : the copy's name (suggested), filled Copy; a name in use is refused, in words. */
export function CopySheet({ name, suggested, onCopy, onClose, fallback }: { name: string; suggested: string; onCopy: (words: string) => { ok: boolean; reason?: string }; onClose: () => void; fallback: { current: unknown } }) {
  const [words, setWords] = useState(suggested);
  const [taken, setTaken] = useState(false);
  const copy = () => {
    if (!words.trim()) return;
    const did = onCopy(words);
    setTaken(!did.ok && did.reason === 'same-name');
  };
  return (
    <Sheet title={`Copy ${name}`} onClose={onClose} testID="go-copy-sheet" fallback={fallback}>
      <Field
        value={words}
        onChangeText={(t) => {
          setWords(t);
          setTaken(false);
        }}
        accessibilityLabel="Name"
        placeholder="Name"
        submitBehavior="submit"
        returnKeyType="done"
        onSubmitEditing={copy}
        testID="go-copy-name"
        {...{ dataSet: { first: 'true' } }}
      />
      {taken && (
        <T color={G.err} accessibilityRole="alert" testID="go-copy-error">
          ! Another routine has this name
        </T>
      )}
      <Btn kind="filled" label="Copy" spoken={words.trim() ? `Copy as ${words.trim()}` : 'Copy'} disabled={!words.trim()} onPress={copy} size={18} testID="go-copy-confirm" />
      <Btn label="Close" onPress={onClose} />
    </Sheet>
  );
}

/** The suggested name for a copy: "<name> (copy)", or "(copy 2)", "(copy 3)"… when that is in use. */
export function copyName(name: string, taken: (words: string) => boolean): string {
  for (let i = 1; i < 1000; i++) {
    const words = `${name} (copy${i === 1 ? '' : ` ${i}`})`;
    if (!taken(words)) return words;
  }
  return `${name} (copy)`;
}

/**
 * Next, or Step out, past what still owes names: a field for each (labelled with the name), then the filled move.
 * Close stays where the run is.
 */
export function OwedSheet({ title, names, move, onMove, onClose, fallback }: { title: string; names: string[]; move: 'Next' | 'Step out'; onMove: (owed: { name: string; text: string }[]) => void; onClose: () => void; fallback: { current: unknown } }) {
  const [texts, setTexts] = useState<Record<string, string>>({});
  const go = () => onMove(names.map((name) => ({ name, text: texts[name] ?? '' })).filter((o) => o.text.trim()));
  return (
    <Sheet title={title} onClose={onClose} testID="go-owed-sheet" fallback={fallback}>
      {names.map((name, i) => (
        <View key={name} style={styles.owed}>
          <View style={styles.label}>
            <Mark name="braces" size={20} color={G.dim} />
            <T bold>{name}</T>
          </View>
          <GrowField value={texts[name] ?? ''} onChangeText={(t) => setTexts((x) => ({ ...x, [name]: t }))} accessibilityLabel={name} maxLength={MAX_VALUE} testID="go-owed-field" {...{ dataSet: { name, ...(i === 0 && { first: 'true' }) } }} />
        </View>
      ))}
      <Btn kind="filled" label={move} spoken={move === 'Next' ? `Next, past ${title}` : `Step out of ${title}`} onPress={go} size={18} testID="go-owed-move" />
      <Btn label="Close" onPress={onClose} testID="go-owed-close" />
    </Sheet>
  );
}

/** P-98: removing a routine — its reach, in one line: where it is a step too. */
export function removeBody(callers: string[]): string {
  const base = 'It goes from My routines, with its steps.';
  if (!callers.length) return base;
  const named = callers.map((c) => `“${c}”`);
  const list = named.length === 1 ? named[0] : `${named.slice(0, -1).join(', ')} and ${named[named.length - 1]}`;
  return `${base} ${list} ${callers.length === 1 ? 'uses' : 'use'} it as a step; there it will read “(removed)”.`;
}

const styles = StyleSheet.create({
  lines: { gap: 0, alignSelf: 'stretch', alignItems: 'flex-start' },
  line: { alignSelf: 'flex-start', justifyContent: 'flex-start', paddingHorizontal: 0, minHeight: 48 },
  owed: { gap: SP.s1 },
  label: { flexDirection: 'row', alignItems: 'center', gap: SP.s1 },
  own: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.s2 },
});
