/**
 * P-114 (B-19 slice 1; the owner: "a proper on boarding process … a composer of sorts guide you through a set up of a
 * routine"): New's sheet offers five starts — the library's templates — beside "Start from scratch", and the composer
 * asks a start's questions one at a time, the routine growing beneath them.
 *
 * The New sheet (UI audit, `.polish/current/P-114/ui-audit.md`): the question is the field's visible label ("What do you
 * want to do?"), an example its placeholder; the five starts in one fixed order, each a row with its one short line; the
 * start the first words point to is THE filled button (none recognised: Work it out — the owner's ruling), and Return
 * takes it; Start from scratch is New as it was (`createRoutine`). A name in use is refused here, in Copy…'s words.
 *
 * The composer (route `/go/compose/<id>`): a planning surface in Plan's look — the light band with the way out and PLAN,
 * the routine's name, one question with its field, and "So far": the routine as it stands, read-only. Each Continue writes
 * the answer into the routine's draft at once (P-115), so ⌂ Home, the browser's Back and a reload leave what was built
 * so far; it ends in Plan, in Edit, the draft unsaved, with "Made “X”" and its one Undo. Continue is the filled button,
 * lowest; Skip the rest the right side door. It is reached from New's sheet only — never from the runner — and is not
 * remembered: opened again (a reload, a link), its address is the routine's Plan.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { addedWords, Ask, markStart, STARTS, Start, startOf, StartKey } from '@/domain/composer';
import { draftData } from '@/domain/draft';
import { libraryPreview, PreviewRow } from '@/domain/library';
import { wordsWith } from '@/domain/values';
import { readRoutine } from '@/domain/run';
import { useStore } from '@/store/useStore';

import { decorative } from '../a11y';
import { Mark } from './marks';
import { goHome } from './Runner';
import { G, SP, TARGET } from './tokens';
import { Btn, Field, focusSoon, GoScreen, GrowField, H1, InputRef, Said, Sheet, T, styles as ui } from './ui';

const WEB = Platform.OS === 'web';
const RING = WEB ? ({ outlineStyle: 'solid', outlineWidth: 2, outlineColor: G.focus, outlineOffset: 3 } as object) : null;
const NO_RING = WEB ? ({ outlineStyle: 'none' } as object) : null;

/** New's field: its visible label (and accessible name), and an example in the owner's own words. */
export const NEW_ASK = 'What do you want to do?';
export const NEW_EXAMPLE = 'learn to play piano';
/** The way to an empty routine (owner, 2026-11-28: "something that expresses you're going to start from zero"). */
export const FROM_SCRATCH = 'Start from scratch';
/** A start refused for a name in use: the app's words for it (Copy…). */
export const NAME_TAKEN = '! A routine already uses that name';
export const CONTINUE = 'Continue';
export const SKIP_REST = 'Skip the rest';
export const SO_FAR = 'So far';

/** The composers going in this page (not data: a reload forgets them, and their address opens the routine's Plan). */
const going = new Map<string, { start: StartKey; typed: string }>();

/**
 * New (P-95, P-96; P-114): its own sheet — what you want to do, then a start (the composer) or Start from scratch (the
 * routine, empty, and its Plan, as New always did). Nothing is made until one is pressed.
 */
export function NewSheet({ onMake, onClose, fallback, from }: { onMake: (words: string) => void; onClose: () => void; fallback: { current: unknown }; from?: 'routines' }) {
  const [name, setName] = useState('');
  const [taken, setTaken] = useState(false);
  const typed = name.trim();
  const marked = markStart(name) ?? 'work';
  const scratch = () => (typed ? onMake(name) : undefined);
  const start = (s: Start) => {
    if (!typed) return;
    const s0 = useStore.getState();
    const did = s0.startComposing(s.key, name);
    setTaken(!did.ok && did.reason === 'same-name');
    if (!did.ok || !did.routineId) return;
    const id = did.routineId;
    onClose();
    const q = from ? '?from=routines' : '';
    // A start with nothing to ask yet (slice 1: Learn it, Find out, Decide): straight to its Plan, in Edit.
    if (!s.asks.length) {
      s0.composed(id);
      router.push(`/go/routine/${id}${q}`);
      return;
    }
    going.set(id, { start: s.key, typed: name });
    router.push(`/go/compose/${id}${q}`);
  };
  return (
    <Sheet title="New routine" onClose={onClose} testID="go-new-sheet" fallback={fallback}>
      <T bold testID="go-new-ask">
        {NEW_ASK}
      </T>
      {/* (It wraps: what was typed is never cut off, at 200 % text too. UI audit 2: Return takes the filled button — the marked start.) */}
      <GrowField
        value={name}
        onChangeText={(t) => {
          setName(t.replace(/\n/g, ' '));
          setTaken(false);
        }}
        accessibilityLabel={NEW_ASK}
        placeholder={NEW_EXAMPLE}
        autoFocus
        maxLength={200}
        returnKeyType="go"
        onSubmit={() => start(startOf(marked))}
        testID="go-new-name"
        {...{ dataSet: { first: 'true' } }}
      />
      {taken && (
        <T color={G.err} accessibilityRole="alert" testID="go-new-taken">
          {NAME_TAKEN}
        </T>
      )}
      <View style={styles.starts} testID="go-new-starts">
        {STARTS.map((s) => (
          <StartRow key={s.key} start={s} filled={s.key === marked} disabled={!typed} onPress={() => start(s)} />
        ))}
      </View>
      <View style={styles.rule} {...decorative} />
      {/* (Its test id is New's old Plan: it does exactly what that did.) */}
      <Btn label={FROM_SCRATCH} spoken={typed ? `${FROM_SCRATCH}: ${typed}` : FROM_SCRATCH} disabled={!typed} onPress={scratch} testID="go-new-plan" />
      <Btn label="Close" onPress={onClose} />
    </Sheet>
  );
}

/** One start: its name and its one line, a whole row (≥ 48 px); the marked one is the sheet's filled button. */
function StartRow({ start, filled, disabled, onPress }: { start: Start; filled: boolean; disabled: boolean; onPress: () => void }) {
  const on = filled && !disabled;
  const color = on ? G.ink : disabled ? G.dim : G.text;
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      // (Its words, as shown, then — the mark not colour alone — "suggested".)
      accessibilityLabel={`${start.label}, ${start.line}${on ? ', suggested' : ''}`}
      accessibilityState={{ disabled }}
      testID="go-new-start"
      {...{ dataSet: { start: start.key, marked: filled ? 'true' : 'false' } }}
      style={(state) => [
        ui.btn,
        styles.start,
        { borderColor: on ? G.paper : G.line },
        ui.filledRoom,
        on && ui.filled,
        disabled && ui.dashed,
        state.pressed && !disabled && { opacity: 0.75 },
        (state as { focused?: boolean }).focused ? RING : NO_RING,
      ]}>
      {/* One run of words (its name, then its line), wrapping as a sentence does. */}
      <T color={color} style={styles.startWords}>
        <Text style={styles.bold}>{start.label}</Text> <Text style={{ color: on ? G.ink : G.dim }}>{start.line}</Text>
      </T>
    </Pressable>
  );
}

/** The routine as it stands (its draft), read-only — drawn as the library's preview is, with a kept list's items. */
function SoFar({ rows }: { rows: PreviewRow[] }) {
  return (
    <View style={styles.rows} testID="go-compose-rows" role="list">
      {rows.map((r, i) => (
        <View key={i} role="listitem" style={[styles.row, { paddingLeft: r.depth * SP.s3 }]} testID="go-compose-row" {...{ dataSet: { kind: r.kind, depth: String(r.depth) } }}>
          <View style={[styles.rowWords, r.kind === 'item' && styles.item]}>
            {(r.kind === 'call' || r.kind === 'slot') && <Mark name="routine" size={18} color={G.dim} />}
            <T bold={r.kind === 'call' || r.kind === 'part'} style={styles.flexText} testID="go-compose-words">
              {/* (A step's literal braces shown single, as Plan shows them.) */}
              {r.kind === 'step' ? wordsWith(r.words) : r.words}
            </T>
          </View>
          {r.with?.map((w) => (
            <T key={w} dim>
              {w}
            </T>
          ))}
          {!!r.gives && <T dim>gives {`{${r.gives}}`}</T>}
        </View>
      ))}
    </View>
  );
}

/** The composer: one of the start's questions at a time, above the routine as it stands. */
export function Composer({ routineId }: { routineId: string }) {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const fromList = from === 'routines';
  const data = useStore((s) => s.data);
  const act = useStore.getState;
  const [session] = useState(() => going.get(routineId));
  const [at, setAt] = useState(0);
  const [text, setText] = useState('');
  const [said, setSaid] = useState('');
  /** A list's field grows with what is typed (one item per line), never cutting it off. */
  const [tall, setTall] = useState(0);
  const field = useRef<InputRef>(null);
  const routine = readRoutine(data, routineId);
  const gone = !routine || !!routine.removedAt;
  const start = session ? startOf(session.start) : undefined;
  const ask: Ask | undefined = start?.asks[at];
  const plan = `/go/routine/${routineId}${fromList ? '?from=routines' : ''}`;

  // Not going in this page (a reload, a link) or nothing to ask: its Plan (in Edit, the draft kept). Taken back
  // (its Undo) while here: home.
  useEffect(() => {
    if (gone) goHome();
    else if (!session || !ask) router.replace(plan);
  }, [gone, session, ask, plan]);
  useEffect(() => {
    if (ask) focusSoon(field);
  }, [ask]);
  if (gone || !session || !start || !ask) return <GoScreen testID="go-compose" settled={false}>{null}</GoScreen>;

  /** What is typed now, into the routine (as Continue writes it); false if refused (the words stay in the field). */
  const keep = (): boolean => {
    if (!text.trim()) return true;
    const did = act().composeAnswer(routineId, start.key, ask.key, ask.lines ? text : text.trim());
    if (did.ok) setSaid(addedWords(ask, text));
    return did.ok;
  };
  const end = (to: 'plan' | 'out') => {
    going.delete(routineId);
    act().composed(routineId);
    if (to === 'plan') router.replace(plan);
    else if (!fromList) goHome();
    else if (router.canGoBack()) router.back();
    else router.replace('/go/routines');
  };
  const next = () => {
    if (!keep()) return;
    setText('');
    setTall(0);
    if (at + 1 < start.asks.length) setAt(at + 1);
    else end('plan');
  };
  const skip = () => keep() && end('plan');
  const out = () => keep() && end('out');

  const view = draftData(data, routineId);
  const rows = libraryPreview(routineId, { data: view, defs: [] });
  const question = ask.question(session.typed);
  return (
    <GoScreen testID="go-compose">
      <View style={styles.band} testID="go-compose-band">
        {fromList ? (
          <Btn ink mark="back" label="My routines" spoken="Back to My routines" onPress={out} testID="go-compose-out" style={styles.out} />
        ) : (
          <Btn ink mark="home" label="Home" onPress={out} testID="go-compose-out" style={styles.out} />
        )}
        <T title ink size={20} style={styles.word}>
          PLAN
        </T>
      </View>
      <Said text={`Plan: ${routine.words}`} />
      {!!said && <Said key={said + at} text={said} testID="go-compose-said" />}
      <ScrollView style={ui.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" testID="go-compose-list">
        <H1 own spoken={`Plan: ${routine.words}`} style={styles.name}>
          {routine.words}
        </H1>
        <View style={styles.ask}>
          <T bold size={20} testID="go-compose-question">
            {question}
          </T>
          {ask.lines ? (
            <Field
              key={ask.key}
              ref={field}
              value={text}
              onChangeText={setText}
              accessibilityLabel={question}
              placeholder={ask.placeholder}
              multiline
              maxLength={4000}
              onContentSizeChange={(e) => setTall(Math.ceil(e.nativeEvent.contentSize.height))}
              style={[styles.lines, { height: Math.max(TARGET * 2, tall + 4) }]}
              testID="go-compose-field"
            />
          ) : (
            <GrowField key={ask.key} ref={field} value={text} onChangeText={(t) => setText(t.replace(/\n/g, ' '))} accessibilityLabel={question} placeholder={ask.placeholder} maxLength={2000} onSubmit={next} style={styles.one} testID="go-compose-field" />
          )}
        </View>
        <T role="heading" aria-level={2} accessibilityRole="header" bold style={styles.soFar} testID="go-compose-sofar">
          {SO_FAR}
        </T>
        <SoFar rows={rows} />
      </ScrollView>
      {/* The right side door (UI audit 4: not the left, where Plan's Cancel is), as wide as its words. */}
      <View style={styles.doors}>
        <Btn label={SKIP_REST} onPress={skip} testID="go-compose-skip" />
      </View>
      <View style={styles.foot}>
        <Btn kind="filled" label={CONTINUE} size={18} style={styles.forward} onPress={next} testID="go-compose-continue" />
      </View>
    </GoScreen>
  );
}

const styles = StyleSheet.create({
  starts: { gap: SP.s2 },
  start: { flexWrap: 'wrap', justifyContent: 'flex-start', columnGap: SP.s2, rowGap: 0 },
  startWords: { flexShrink: 1 },
  bold: { fontWeight: '600' },
  rule: { height: 2, backgroundColor: G.line, marginVertical: SP.s1 },
  // As Plan's band.
  band: { minHeight: 64, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SP.s3, paddingHorizontal: SP.s2, paddingVertical: SP.s2, backgroundColor: G.paper },
  out: { flexShrink: 1, paddingHorizontal: SP.s2 },
  word: { flexGrow: 1, letterSpacing: 1 },
  body: { flexGrow: 1, padding: SP.s3, paddingBottom: SP.s2, gap: SP.s3 },
  name: { paddingVertical: SP.s2 },
  ask: { gap: SP.s2 },
  // (Room for a placeholder that wraps, at 200 % text: never cut.)
  one: { minHeight: TARGET * 2 },
  lines: { textAlignVertical: 'top' },
  soFar: { paddingTop: SP.s2, borderTopWidth: 2, borderTopColor: G.line },
  rows: { gap: SP.s2 },
  row: { gap: 0 },
  rowWords: { flexDirection: 'row', alignItems: 'center', gap: SP.s1 },
  item: { borderLeftWidth: 2, borderColor: G.line, paddingLeft: SP.s2 },
  flexText: { flexShrink: 1 },
  doors: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: SP.s3, paddingTop: SP.s1, paddingBottom: SP.s2 },
  foot: { paddingHorizontal: SP.s3, paddingBottom: SP.s3, paddingTop: SP.s1 },
  forward: { minHeight: 56 },
});
