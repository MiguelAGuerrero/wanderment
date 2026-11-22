import { ComponentRef, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, findNodeHandle, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { FirstRun, firstRunStep, STEP_EXAMPLE, WHY_EXAMPLES } from '@/domain/firstRun';
import { headerWhys, overview } from '@/domain/overview';
import { Id } from '@/domain/types';
import { useStore } from '@/store/useStore';
import { C, s } from '@/theme';

type Going = Exclude<FirstRun, { step: 1 }>;

/**
 * The first run on Home (P-36): ① "What's it all for?" → ② "One next step toward it?" → ③ the graph
 * with both. It returns the step to show (where "+ What's it all for?" would be), or undefined.
 * Only on an empty app; once ① is answered or skipped, or a log comes in while it shows, it's over
 * for good (`endFirstRun`). ② and ③ are this session's, and a log at any point ends them. The log
 * box stays live throughout and no field takes focus by itself (so the keyboard never comes up).
 * `onDone`: ③'s "Got it" was pressed (Home moves focus on from the step that goes).
 */
export function useFirstRun(onDone: () => void): ReactNode {
  const data = useStore((st) => st.data);
  const done = useStore((st) => st.firstRunDone);
  const ready = useStore((st) => st.storage.state === 'ready');
  const endFirstRun = useStore((st) => st.endFirstRun);
  const [going, setGoing] = useState<Going>();
  const run = ready ? firstRunStep(data, done, going) : undefined;

  // A log while ① shows ends it for good (a log during ② or ③ ends them by itself: see firstRunStep).
  const shownOne = useRef(false);
  const logged = Object.keys(data.activities).length > 0;
  useEffect(() => {
    if (run?.step === 1) shownOne.current = true;
    else if (shownOne.current && logged) {
      shownOne.current = false;
      if (!done) endFirstRun();
    }
  }, [run, logged, done, endFirstRun]);
  // Ended (a log): forget this session's step, so an Undo never brings it back (React's "adjust
  // state while rendering" pattern).
  if (going && !run) setGoing(undefined);

  if (!run) return null;
  if (run.step === 1) return <StepWhy key="1" onWhy={(why) => (endFirstRun(), setGoing({ step: 2, why }))} onSkip={endFirstRun} />;
  if (run.step === 2) return <StepNext key="2" why={run.why} onNext={() => setGoing({ step: 3, why: run.why })} />;
  return <StepSee key="3" why={run.why} onDone={() => (setGoing(undefined), onDone())} />;
}

/** Moves focus to an element (a step as it appears): never to a field, so no keyboard comes up. */
export function moveFocus(el: ComponentRef<typeof View> | ComponentRef<typeof Text> | null) {
  if (!el) return;
  if (Platform.OS === 'web') (el as unknown as HTMLElement).focus?.();
  else {
    const handle = findNodeHandle(el);
    if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
  }
}

/** One step: a labelled (non-modal) dialog, its name the visible heading. `focus`: focus moves to it as it appears. */
function Step({ label, title, focus, children }: { label: string; title: string; focus?: boolean; children: ReactNode }) {
  const ref = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => {
    if (focus) moveFocus(ref.current);
  }, [focus]);
  return (
    <View ref={ref} role="dialog" aria-label={label} {...(Platform.OS === 'web' ? { tabIndex: -1 } : {})} style={styles.card} testID="first-run">
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

/** A field that never takes focus by itself. Return (or "Next") goes on once something's typed. */
function Field({ value, onChange, onSubmit, label, placeholder }: { value: string; onChange: (t: string) => void; onSubmit: () => void; label: string; placeholder: string }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={C.faint}
      onSubmitEditing={onSubmit}
      submitBehavior="submit"
      returnKeyType="next"
      style={styles.input}
      accessibilityLabel={label}
    />
  );
}

function Buttons({ next, onNext, skip, onSkip }: { next: boolean; onNext: () => void; skip: ReactNode; onSkip: () => void }) {
  return (
    <View style={styles.buttons}>
      {next && (
        <Pressable onPress={onNext} style={s.primaryBtn} accessibilityRole="button">
          <Text style={s.primaryBtnText}>Next</Text>
        </Pressable>
      )}
      <Pressable onPress={onSkip} style={styles.skip} accessibilityRole="button">
        <Text style={styles.skipText}>{skip}</Text>
      </Pressable>
    </View>
  );
}

/** ① A feeling or a reason, in your own words: named, and marked as what it's for (P-14's declare). */
function StepWhy({ onWhy, onSkip }: { onWhy: (why: Id) => void; onSkip: () => void }) {
  const createThread = useStore((st) => st.createThread);
  const declareThread = useStore((st) => st.declareThread);
  const [name, setName] = useState('');
  const submit = () => {
    const n = name.trim();
    if (!n) return;
    // Refused while reconnecting: the name stays.
    const id = createThread(n);
    if (!id) return;
    const res = declareThread(id);
    if (res.ok) onWhy(id);
  };
  return (
    <Step label="What’s it all for?" title="What’s it all for?">
      <Text style={s.body}>A feeling or a reason, in your own words.</Text>
      <View style={styles.examples}>
        {WHY_EXAMPLES.map((e) => (
          <Pressable key={e} onPress={() => setName(e)} style={s.chip} accessibilityRole="button">
            <Text style={s.chipText}>{e}</Text>
          </Pressable>
        ))}
      </View>
      <Field value={name} onChange={setName} onSubmit={submit} label="What it’s all for" placeholder={`e.g. ${WHY_EXAMPLES[0]}`} />
      <Buttons
        next={!!name.trim()}
        onNext={submit}
        onSkip={onSkip}
        skip={
          <>
            Not sure yet? <Text style={styles.skipWord}>Skip</Text> — it can surface from what you do.
          </>
        }
      />
    </Step>
  );
}

/** ② One next step toward it: it can wait, and mundane is welcome. */
function StepNext({ why, onNext }: { why: Id; onNext: () => void }) {
  const setNext = useStore((st) => st.setNext);
  const name = useStore((st) => st.data.threads[why]?.name ?? '');
  const [step, setStep] = useState('');
  const submit = () => {
    const t = step.trim();
    if (t && setNext(why, t)) onNext();
  };
  return (
    <Step label="One next step toward it?" title="One next step toward it?" focus>
      <Text style={s.body}>
        Toward <Text style={styles.why}>{name}</Text>. It can wait — and it can be anything, like “{STEP_EXAMPLE}”.
      </Text>
      <Field value={step} onChange={setStep} onSubmit={submit} label={`One next step toward ${name}`} placeholder={`e.g. ${STEP_EXAMPLE}`} />
      <Buttons next={!!step.trim()} onNext={submit} onSkip={onNext} skip={<Text style={styles.skipWord}>Skip</Text>} />
    </Step>
  );
}

/** ③ The graph with both, the log box ready. It says what the picture shows (its summary). */
function StepSee({ why, onDone }: { why: Id; onDone: () => void }) {
  const data = useStore((st) => st.data);
  const staged = !!data.threads[why]?.next;
  const summary = useMemo(() => overview(data, headerWhys(data))?.summary ?? '', [data]);
  const line = staged ? 'It’s here whenever you get to it. Log it in the box below when you do.' : 'It’s here whenever you get to it. Whatever you log shows up here.';
  // The picture's summary is spoken as the step appears (focus lands on it: its name says it, and
  // iOS and Android are told too).
  useEffect(() => {
    if (summary && Platform.OS !== 'web') AccessibilityInfo.announceForAccessibility(summary);
    // Once, as it appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Step label={`There it is. ${summary}`} title="There it is." focus>
      <Text style={s.body}>{line}</Text>
      <View style={styles.buttons}>
        <Pressable onPress={onDone} style={s.primaryBtn} accessibilityRole="button">
          <Text style={s.primaryBtnText}>Got it</Text>
        </Pressable>
      </View>
    </Step>
  );
}

const styles = StyleSheet.create({
  card: { ...StyleSheet.flatten(s.card), gap: 12, borderColor: C.accent, borderStyle: 'dashed', borderWidth: 1.5, alignSelf: 'stretch' },
  title: { fontSize: 20, fontWeight: '600', color: C.ink },
  why: { fontWeight: '600', color: C.accentInk },
  examples: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { minHeight: 44, fontSize: 15, color: C.ink, borderBottomWidth: 1, borderColor: C.line },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  skip: { minHeight: 44, justifyContent: 'center', flexShrink: 1 },
  skipText: { fontSize: 14, color: C.muted },
  skipWord: { textDecorationLine: 'underline', color: C.ink },
});
