/**
 * B-11 slice 1 (P-86), B-12 (P-90): the paused screen (B-11 §3.3, §9b). The run, where it is, a reason
 * edited in place (stored as typed), Resume — the one filled button — and beneath it whatever else can
 * be resumed, each with its own Resume (or Plan, for one left in Plan). Home goes home and asks
 * nothing (P-95): the run stays paused where it is, the first tile there, with Resume. A run resting on a wait is titled "Waiting" and
 * carries "It's happened". A run left in Plan is never "paused" here: it is titled "Planning", reads
 * "planning · at <step>", and its one filled button is Plan.
 */
import { router, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, TextInputProps, View } from 'react-native';

import { tileLine } from '@/domain/goText';
import { readRun } from '@/domain/run';
import { leftOff, pausedView, routineHue, runnerView, sinceWords } from '@/domain/runView';
import { useSavedField } from '@/components/useSavedField';
import { useStore } from '@/store/useStore';

import { Mark } from './marks';
import { Notice } from './Notice';
import { goHome } from './Runner';
import { markWentHome } from './session';
import { G, hueOf, SP, TARGET } from './tokens';
import { Btn, Field, focusOn, focusSoon, GoScreen, H1, hard, T, TextRef, ViewRef } from './ui';

const WEB = Platform.OS === 'web';

export function Paused({ runId }: { runId: string }) {
  const data = useStore((s) => s.data);
  const act = useStore.getState;
  const focused = useIsFocused();
  const p = pausedView(data, runId);
  const status = runnerView(data, runId)?.status;
  const paused = !!p && status === 'paused';
  const title = useRef<TextRef>(null);
  const forward = useRef<ViewRef>(null);
  const [tall, setTall] = useState(0);
  // The same function on every render, by hand: the field measures itself again whenever this changes
  // (with a new function each time that never ends: React error #185).
  const sized = useCallback<NonNullable<TextInputProps['onContentSizeChange']>>((e) => setTall(Math.ceil(e.nativeEvent.contentSize.height)), []);

  // The route follows the run: resumed → its runner; another resumed → that one; left or gone → home.
  useEffect(() => {
    if (paused || !focused) return;
    const now = leftOff(useStore.getState().data);
    if (now.kind === 'runner') router.replace(`/go/run/${now.runId}`);
    else goHome();
  }, [paused, focused]);

  useEffect(() => {
    if (focused) focusSoon(title);
  }, [focused]);

  const reason = useSavedField(p?.reason ?? '');
  /** A run's Plan, in this screen's place (Home from there is home). The run is put in Plan first: one write. */
  const toPlan = (id: string) => {
    if (act().planRun(id).ok) router.replace(`/go/run/${id}/plan`);
  };
  if (!p || !paused) return <GoScreen testID="go-paused" settled={false}>{null}</GoScreen>;

  const hue = hueOf(routineHue(data, runnerView(data, runId)?.routineId ?? ''));
  const planning = p.kind === 'planning';
  // (Left in Plan on a wait step: it is planning, not waiting.)
  const waiting = planning ? undefined : p.waiting;
  const type = (text: string) => {
    // Refused (reconnecting): the words stay in the field.
    reason.setValue(text);
    act().setPauseReason(runId, text);
    // Emptied (the Clear button too, which is no typing): one line again.
    if (!text) setTall(0);
  };
  /**
   * Web: what is measured is `scrollHeight`, which has the padding in it (so only the 4 px of outline
   * are added — adding the padding again grew the field 16 px with every key) and is never less than
   * the field is tall (so it could not get shorter): after each change the words are measured with the
   * height out of the way. Native measures the words alone: the padding and the outline are added.
   */
  const measure: NonNullable<TextInputProps['onChange']> = (e) => {
    const el = e.target as unknown as { scrollHeight?: number; style?: { height: string } } | null;
    if (!WEB || !el?.style || typeof el.scrollHeight !== 'number') return;
    const was = el.style.height;
    el.style.height = '0px';
    const need = el.scrollHeight;
    el.style.height = was;
    setTall(need);
  };
  return (
    <GoScreen testID="go-paused">
      <View style={styles.bar}>
        <H1 ref={title}>{planning ? 'Planning' : waiting ? 'Waiting' : 'Paused'}</H1>
      </View>
      <ScrollView style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { borderColor: hue.c }, hard(6, hue.d)]} testID="go-paused-run">
          <T bold size={18}>
            {p.name}
          </T>
          {planning ? (
            <T style={styles.shrink} testID="go-paused-line">
              <T dim>{p.asking ? 'planning · nothing next yet' : 'planning · at '}</T>
              {p.asking ? '' : p.at}
            </T>
          ) : waiting ? (
            <View style={styles.line}>
              <Mark name="wait" size={20} color={G.dim} />
              <T style={styles.shrink} testID="go-paused-line">
                <T dim>waiting for </T>
                {waiting.words}
                {waiting.since ? <T dim>{` · since ${sinceWords(waiting.since)}`}</T> : null}
              </T>
            </View>
          ) : (
            <View style={styles.line}>
              <Mark name="pause" size={20} color={G.dim} />
              {!p.asking && (
                <T style={styles.shrink} testID="go-paused-line">
                  <T dim>at </T>
                  {p.at}
                </T>
              )}
            </View>
          )}
          {waiting && (
            <Btn
              // On a wait this is the forward choice: the screen's one filled button (Resume is outlined here).
              kind="filled"
              ref={forward}
              label="It’s happened"
              spoken={`It’s happened: ${waiting.words}`}
              style={styles.happened}
              onPress={() => {
                // Resume, then Next: the Undo left is the Next's.
                if (act().resumeRun(runId).ok) act().nextStep(runId);
              }}
            />
          )}
        </View>

        {!planning && (
        <View style={styles.reason}>
          <T dim nativeID="go-reason-label">
            Reason
          </T>
          <View style={styles.reasonRow}>
            <Field
              value={reason.value}
              onChangeText={type}
              onFocus={reason.onFocus}
              onBlur={reason.onBlur}
              accessibilityLabel="Reason"
              multiline
              onContentSizeChange={sized}
              onChange={measure}
              onKeyPress={(e) => {
                // Return keeps it (it is saved as typed already): no new line in a reason.
                // Focus goes on to the screen's forward button (never to nothing).
                if (e.nativeEvent.key === 'Enter') {
                  e.preventDefault();
                  focusOn(forward);
                }
              }}
              style={[styles.reasonField, { height: Math.max(TARGET, tall + (WEB ? 4 : 20)) }]}
              testID="go-reason"
            />
            {!!reason.value && <Btn mark="close" spoken="Clear the reason" onPress={() => type('')} />}
          </View>
        </View>
        )}

        <Btn kind="plain" mark="jump" label="Jump to…" onPress={() => router.push(`/go/run/${runId}/jump`)} />
        {!planning && <Btn kind="plain" mark="lines" label="Plan" onPress={() => toPlan(runId)} testID="go-paused-plan" />}

        {p.others.length > 0 && (
          <View style={styles.others} testID="go-others">
            {p.others.map((t) => {
              const l = tileLine(t);
              const h = hueOf(t.hue);
              return (
                <View key={t.runId} style={styles.other} testID="go-other">
                  <View style={[styles.swatch, { backgroundColor: h.c }]} />
                  <View style={styles.otherWords}>
                    <T bold>{t.name}</T>
                    {(!!l.line || !!l.mark) && (
                      <View style={styles.line}>
                        {l.mark && <Mark name={l.mark === 'wait' ? 'wait' : 'pause'} size={20} color={G.dim} />}
                        <T dim style={styles.shrink}>
                          {l.line}
                        </T>
                      </View>
                    )}
                    {!!l.reason && <T>{l.reason}</T>}
                  </View>
                  <Btn label={l.button} spoken={l.spoken} onPress={() => t.runId && (t.action === 'plan' ? toPlan(t.runId) : act().resumeRun(t.runId))} />
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
      <Notice />
      <View style={styles.foot}>
        <Btn
          label="Home"
          onPress={() => {
            markWentHome(runId, readRun(data, runId)?.touchedAt);
            goHome();
          }}
          testID="go-home-btn"
        />
        {planning ? (
          <Btn kind="filled" ref={forward} label="Plan" spoken={`Plan ${p.name}`} onPress={() => toPlan(runId)} style={styles.grow} size={18} testID="go-paused-plan" />
        ) : (
          <Btn kind={waiting ? 'outline' : 'filled'} ref={waiting ? undefined : forward} label="Resume" spoken={`Resume ${p.name}`} onPress={() => act().resumeRun(runId)} style={styles.grow} size={18} testID="go-resume" />
        )}
      </View>
    </GoScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minHeight: 0 },
  grow: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minHeight: 56 },
  shrink: { flexShrink: 1 },
  bar: { minHeight: 56, justifyContent: 'center', paddingHorizontal: SP.s3 },
  body: { paddingHorizontal: SP.s3, paddingBottom: SP.s3, gap: SP.s2 },
  card: { borderWidth: 2, backgroundColor: G.surf, padding: SP.s3, gap: SP.s1, marginRight: 6, marginBottom: SP.s2 + 6 },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: SP.s1 },
  happened: { alignSelf: 'flex-start', marginTop: SP.s2 },
  reason: { gap: SP.s1 },
  reasonRow: { flexDirection: 'row', gap: SP.s2, alignItems: 'flex-start' },
  reasonField: { flex: 1, minWidth: 0, minHeight: TARGET },
  others: { borderTopWidth: 1, borderTopColor: G.line, marginTop: SP.s2 },
  other: { flexDirection: 'row', alignItems: 'center', gap: SP.s2, paddingVertical: SP.s2, borderBottomWidth: 1, borderBottomColor: G.line },
  swatch: { width: 16, height: 16, alignSelf: 'flex-start', marginTop: 4 },
  otherWords: { flex: 1, minWidth: 0 },
  foot: { flexDirection: 'row', gap: SP.s2, paddingHorizontal: SP.s3, paddingBottom: SP.s3, paddingTop: SP.s2, backgroundColor: G.bg },
});
