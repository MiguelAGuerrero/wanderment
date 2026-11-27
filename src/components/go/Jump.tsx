/**
 * B-11 slice 1 (P-86): Jump to… (B-11 §3.5) — sets the run to where the person really is: the start of
 * a level they are in, or a particular step. (P-90: See it all, which shared this file, is folded into
 * Plan; Jump stays with the runner's panel: it moves you, it does not plan.)
 */
import { router, useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { runnerView, seeItAll } from '@/domain/runView';
import { useStore } from '@/store/useStore';

import { Mark } from './marks';
import { Notice } from './Notice';
import { goHome } from './Runner';
import { G, SP } from './tokens';
import { Bar, Btn, focusSoon, GoScreen, H1, T, TextRef } from './ui';

const indent = (depth: number) => Math.min(depth, 6) * 12;
const back = () => (router.canGoBack() ? router.back() : router.replace('/go'));

/** A run that can't be shown any more (ended, gone): home. */
function useGone(gone: boolean, focused: boolean) {
  useEffect(() => {
    if (gone && focused) goHome();
  }, [gone, focused]);
}

type Pick = { level: number } | { path: string[] };
const same = (a: Pick | undefined, b: Pick) => !!a && ('level' in a ? 'level' in b && a.level === b.level : 'path' in b && a.path.join('/') === b.path.join('/'));

export function Jump({ runId }: { runId: string }) {
  const data = useStore((s) => s.data);
  const focused = useIsFocused();
  const all = seeItAll(data, runId);
  const run = runnerView(data, runId);
  const gone = !all || !run || run.status === 'ended';
  const [pick, setPick] = useState<Pick | undefined>();
  const title = useRef<TextRef>(null);
  // P-103 (12; audit F-21) — the WAI-ARIA radio group: ↓/→ and ↑/← move to the next or previous row and choose it.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined' || !focused) return;
    const onKey = (e: KeyboardEvent) => {
      const by = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
      if (!by || e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      if (!t?.closest?.('[data-testid="go-jump-row"]')) return;
      const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="go-jump"] [data-testid="go-jump-row"]')).filter((r) => r.getClientRects().length > 0);
      const i = rows.indexOf(t.closest('[data-testid="go-jump-row"]') as HTMLElement);
      const to = rows[(i + by + rows.length) % rows.length];
      // A row's choice, from its key: "level:<n>" or a step's path.
      const key = to?.dataset.key ?? '';
      const pick: Pick | undefined = !key ? undefined : key.startsWith('level:') ? { level: Number(key.slice(6)) } : { path: key.split('/') };
      if (!to || !pick) return;
      e.preventDefault();
      to.focus();
      setPick(pick);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [focused]);
  useGone(gone, focused);
  useEffect(() => {
    if (focused) focusSoon(title);
  }, [focused]);
  if (gone || !all) return <GoScreen testID="go-jump" settled={false}>{null}</GoScreen>;

  const row = (to: Pick, key: string, depth: number, children: React.ReactNode, here: boolean, spoken: string) => {
    const on = same(pick, to);
    return (
      <Pressable
        key={key}
        onPress={() => setPick(on ? undefined : to)}
        accessibilityRole="radio"
        accessibilityLabel={`${spoken}${here ? ', you are here' : ''}`}
        accessibilityState={{ checked: on }}
        aria-checked={on}
        testID="go-jump-row"
        {...{ dataSet: { here: here ? 'true' : 'false', picked: on ? 'true' : 'false', key } }}
        style={[styles.jumpRow, { paddingLeft: SP.s3 + indent(depth) }, on && styles.jumpOn]}>
        {children}
        {here && (
          <View style={styles.here}>
            <Mark name="here" size={20} color={G.dim} />
            <T dim>here</T>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <GoScreen testID="go-jump">
      <Bar onBack={back}>
        <H1 ref={title}>Jump to…</H1>
      </Bar>
      <ScrollView style={styles.flex} contentContainerStyle={styles.jumpBody} accessibilityRole="radiogroup" aria-label="Jump to…">
        {all.levels.map((l) =>
          row(
            { level: l.level },
            `level:${l.level}`,
            l.level,
            <>
              <Mark name="routine" color={G.text} />
              <T style={styles.blockWords}>
                <T dim>Start of </T>
                <T bold>{l.words}</T>
              </T>
            </>,
            false,
            `Start of ${l.words}`,
          ),
        )}
        <View style={styles.rule} />
        {all.rows.map((r) =>
          row(
            { path: r.path },
            r.path.join('/'),
            r.depth,
            <>
              {r.kind !== 'step' && <Mark name={r.kind === 'wait' ? 'wait' : 'routine'} color={G.dim} />}
              <T style={styles.blockWords}>{r.words}</T>
            </>,
            r.here,
            r.words,
          ),
        )}
      </ScrollView>
      <Notice />
      <View style={styles.foot}>
        <Btn
          kind="filled"
          mark="jump"
          label="Jump here"
          disabled={!pick}
          size={18}
          style={styles.jumpBtn}
          testID="go-jump-here"
          onPress={() => {
            // Refused (reconnecting): nothing moves, the pick stays.
            if (!pick || !useStore.getState().jumpTo(runId, pick).ok) return;
            back();
          }}
        />
      </View>
    </GoScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minHeight: 0 },
  blockWords: { flex: 1, minWidth: 0, paddingVertical: SP.s2 },
  rule: { height: 1, backgroundColor: G.line, marginVertical: SP.s2 },
  jumpBody: { paddingVertical: SP.s2 },
  jumpRow: { flexDirection: 'row', alignItems: 'center', gap: SP.s3, minHeight: 52, paddingRight: SP.s3, borderLeftWidth: 4, borderLeftColor: 'transparent' },
  jumpOn: { backgroundColor: G.surf2, borderLeftColor: G.text },
  here: { flexDirection: 'row', alignItems: 'center', gap: SP.s1 },
  foot: { paddingHorizontal: SP.s3, paddingBottom: SP.s3, paddingTop: SP.s2 },
  jumpBtn: { minHeight: 56 },
});
