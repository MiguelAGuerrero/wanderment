/**
 * B-11 slice 1 (P-86): the paused screen (B-11 §3.3, §9b). The run, where it is, a reason edited in
 * place (stored as typed), Resume — the one filled button — and beneath it whatever else can be
 * resumed, each with its own Resume. Home asks first ("Stop <name>?", Cancel filled); the run stays
 * where it is. A run resting on a wait is titled "Waiting" and carries "It's happened".
 */
import { router, useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { tileLine } from '@/domain/goText';
import { leftOff, pausedView, routineHue, runnerView, sinceWords } from '@/domain/runView';
import { useSavedField } from '@/components/useSavedField';
import { useStore } from '@/store/useStore';

import { Mark } from './marks';
import { Notice } from './Notice';
import { goHome } from './Runner';
import { G, hueOf, SP, TARGET } from './tokens';
import { Btn, Confirm, Field, focusOn, focusSoon, GoScreen, H1, hard, T, TextRef, ViewRef } from './ui';

export function Paused({ runId }: { runId: string }) {
  const data = useStore((s) => s.data);
  const act = useStore.getState;
  const focused = useIsFocused();
  const p = pausedView(data, runId);
  const status = runnerView(data, runId)?.status;
  const paused = !!p && status === 'paused';
  const [asking, setAsking] = useState(false);
  const title = useRef<TextRef>(null);
  const forward = useRef<ViewRef>(null);
  const [tall, setTall] = useState(0);

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
  if (!p || !paused) return <GoScreen testID="go-paused" settled={false}>{null}</GoScreen>;

  const hue = hueOf(routineHue(data, runnerView(data, runId)?.routineId ?? ''));
  const type = (text: string) => {
    // Refused (reconnecting): the words stay in the field.
    reason.setValue(text);
    act().setPauseReason(runId, text);
  };
  return (
    <GoScreen testID="go-paused" layer={asking ? <Confirm title={`Stop ${p.name}?`} action="Home" onCancel={() => setAsking(false)} onAct={() => act().leaveRun(runId)} testID="go-stop" /> : null}>
      <View style={styles.bar}>
        <H1 ref={title}>{p.kind === 'waiting' ? 'Waiting' : 'Paused'}</H1>
      </View>
      <ScrollView style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { borderColor: hue.c }, hard(6, hue.d)]} testID="go-paused-run">
          <T bold size={18}>
            {p.name}
          </T>
          {p.waiting ? (
            <View style={styles.line}>
              <Mark name="wait" size={20} color={G.dim} />
              <T style={styles.shrink} testID="go-paused-line">
                <T dim>waiting for </T>
                {p.waiting.words}
                {p.waiting.since ? <T dim>{` · since ${sinceWords(p.waiting.since)}`}</T> : null}
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
          {p.waiting && (
            <Btn
              // On a wait this is the forward choice: the screen's one filled button (Resume is outlined here).
              kind="filled"
              ref={forward}
              label="It’s happened"
              spoken={`It’s happened: ${p.waiting.words}`}
              style={styles.happened}
              onPress={() => {
                // Resume, then Next: the Undo left is the Next's.
                if (act().resumeRun(runId).ok) act().nextStep(runId);
              }}
            />
          )}
        </View>

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
              onContentSizeChange={(e) => setTall(Math.ceil(e.nativeEvent.contentSize.height))}
              onKeyPress={(e) => {
                // Return keeps it (it is saved as typed already): no new line in a reason.
                // Focus goes on to the screen's forward button (never to nothing).
                if (e.nativeEvent.key === 'Enter') {
                  e.preventDefault();
                  focusOn(forward);
                }
              }}
              style={[styles.reasonField, { height: Math.max(TARGET, tall + 20) }]}
              testID="go-reason"
            />
            {!!reason.value && <Btn mark="close" spoken="Clear the reason" onPress={() => type('')} />}
          </View>
        </View>

        <Btn kind="plain" mark="jump" label="Jump to…" onPress={() => router.push(`/go/run/${runId}/jump`)} />
        <Btn kind="plain" mark="lines" label="See it all" onPress={() => router.push(`/go/run/${runId}/all`)} />

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
                  <Btn label="Resume" spoken={`Resume ${t.name}`} onPress={() => t.runId && act().resumeRun(t.runId)} />
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
      <Notice />
      <View style={styles.foot}>
        <Btn label="Home" onPress={() => setAsking(true)} testID="go-home-btn" />
        <Btn kind={p.waiting ? 'outline' : 'filled'} ref={p.waiting ? undefined : forward} label="Resume" spoken={`Resume ${p.name}`} onPress={() => act().resumeRun(runId)} style={styles.grow} size={18} testID="go-resume" />
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
