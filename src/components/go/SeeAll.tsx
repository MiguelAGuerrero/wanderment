/**
 * B-11 slice 1 (P-86): See it all — THE RUN, not the routine (B-11 §3.6): titled "This run of <name>"
 * on an inverted header (the routine editor has none), every step as this run reads it, where you
 * are, and "this run only" on what this run changed. Each step's ⋯: Jump here, and add / reword /
 * remove for this run only. Also Jump to… (B-11 §3.5): the start of a level you are in, or a step.
 */
import { router, useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { routineHue, runnerView, seeItAll, SeeRow, unkeptChanges } from '@/domain/runView';
import { useStore } from '@/store/useStore';

import { Mark } from './marks';
import { Notice } from './Notice';
import { Repeat } from './Repeat';
import { goHome } from './Runner';
import { readDraft, writeDraft } from './session';
import { G, hueOf, SP, TARGET } from './tokens';
import { Bar, Btn, Field, focusSoon, GoScreen, H1, hard, Sheet, T, TextRef } from './ui';

const indent = (depth: number) => Math.min(depth, 6) * 12;
const back = () => (router.canGoBack() ? router.back() : router.replace('/go'));

/** A run that can't be shown any more (ended, gone): home. */
function useGone(gone: boolean, focused: boolean) {
  useEffect(() => {
    if (gone && focused) goHome();
  }, [gone, focused]);
}

type Menu = { row: SeeRow; mode?: 'reword' | 'add' | 'addWait' } | { divider: SeeRow };

export function SeeAll({ runId }: { runId: string }) {
  const data = useStore((s) => s.data);
  const act = useStore.getState;
  const focused = useIsFocused();
  const all = seeItAll(data, runId);
  const run = runnerView(data, runId);
  const gone = !all || !run || run.status === 'ended';
  // What is being typed in a step's menu (and for which step) is kept across a reload.
  const draftKey = `all:${runId}`;
  const [menu, setMenuState] = useState<Menu | null>(() => {
    try {
      const had = JSON.parse(readDraft(draftKey) || 'null') as { path?: string[]; mode?: 'reword' | 'add' | 'addWait' } | null;
      const row = had?.path && all?.rows.find((r) => r.path.join('/') === had.path!.join('/'));
      return row && had?.mode ? { row, mode: had.mode } : null;
    } catch {
      return null;
    }
  });
  const [text, setTextState] = useState(() => {
    try {
      return menu ? ((JSON.parse(readDraft(draftKey) || 'null') as { text?: string } | null)?.text ?? '') : '';
    } catch {
      return '';
    }
  });
  const remember = (m: Menu | null, t: string) => writeDraft(draftKey, m && 'row' in m && m.mode ? JSON.stringify({ path: m.row.path, mode: m.mode, text: t }) : '');
  const setMenu = (m: Menu | null, t = '') => {
    setMenuState(m);
    setTextState(t);
    remember(m, t);
  };
  const setText = (t: string) => {
    setTextState(t);
    remember(menu, t);
  };
  const title = useRef<TextRef>(null);
  // Jumped: back to the run, once the sheet is away (an open sheet holds the screen).
  const [jumped, setJumped] = useState(false);
  const left = useRef(false);
  const open = !!menu && !gone;
  useEffect(() => {
    if (!focused || open || left.current || !(gone || jumped)) return;
    left.current = true;
    if (gone) goHome();
    else back();
  }, [gone, jumped, focused, open]);
  useEffect(() => {
    if (focused) focusSoon(title);
  }, [focused]);
  if (gone || !all || !run) return <GoScreen testID="go-all" settled={false}>{null}</GoScreen>;

  const hue = hueOf(routineHue(data, run.routineId));
  const changes = unkeptChanges(data, runId);
  const close = () => setMenu(null);
  /** A change was made: the sheet goes (its notice, with Undo, is on the screen). Refused: it stays, with the words. */
  const did = (ok: boolean) => ok && close();

  let layer = null;
  if (!open || !menu) layer = null;
  else if ('divider' in menu) {
    // The row as it reads now (the number may just have been changed).
    const now = all.rows.find((r) => r.seq === menu.divider.seq && r.divider);
    const mine = changes.find((c) => c.kind === 'repeat' && c.seq === menu.divider.seq);
    layer = (
      <Sheet title="Repeat from here" onClose={close} testID="go-all-repeat" fallback={title}>
        <Repeat repeat={now?.divider?.repeat} onChange={(repeat) => act().editRun(runId, { kind: 'repeat', seq: menu.divider.seq, ...(repeat !== undefined && { repeat }) })} />
        {mine && <T dim>This run only</T>}
        {mine && <Btn label={`Keep in ${mine.in}`} onPress={() => did(act().keepChange(runId, mine.id).ok)} />}
      </Sheet>
    );
  } else {
    const { row, mode } = menu;
    const mine = row.changeId ? changes.find((c) => c.id === row.changeId) : undefined;
    const label = mode === 'reword' ? 'Change the words' : mode === 'add' ? 'Add a step after' : 'Add a wait after';
    const commit = () => {
      if (!text.trim()) return;
      if (mode === 'reword') did(act().editRun(runId, { kind: 'reword', seq: row.seq, item: row.itemId, text }).ok);
      else if (mode === 'add') did(act().editRun(runId, { kind: 'add', seq: row.seq, after: row.itemId, text }).ok);
      else did(act().editRun(runId, { kind: 'addWait', seq: row.seq, after: row.itemId, wait: text }).ok);
    };
    layer = (
      <Sheet title={row.words} onClose={close} testID="go-all-menu" fallback={title}>
        {mode ? (
          <>
            {/* The field takes the focus as it appears (the rows it replaced had it). */}
            <Field autoFocus value={text} onChangeText={setText} accessibilityLabel={label} placeholder={mode === 'addWait' ? 'Wait for…' : mode === 'add' ? 'A step' : undefined} onSubmitEditing={commit} keepFocus {...{ dataSet: { first: 'true' } }} />
            <T dim>This run only</T>
            <Btn kind="filled" label={label} disabled={!text.trim()} onPress={commit} />
          </>
        ) : (
          <>
            <Btn
              kind="filled"
              mark="jump"
              label="Jump here"
              dataSet={{ first: 'true' }}
              onPress={() => {
                if (!act().jumpTo(runId, { path: row.path }).ok) return;
                close();
                setJumped(true);
              }}
            />
            {row.kind !== 'routine' && (
              <Btn
                kind="plain"
                mark="pencil"
                label="Change the words"
                onPress={() => setMenu({ row, mode: 'reword' }, row.words)}
              />
            )}
            <Btn kind="plain" mark="add" label="Add a step after" onPress={() => setMenu({ row, mode: 'add' })} />
            <Btn kind="plain" mark="wait" label="Add a wait after" onPress={() => setMenu({ row, mode: 'addWait' })} />
            {mine && <Btn kind="plain" mark="undo" label="Drop this change" onPress={() => did(act().dropChange(runId, mine.id).ok)} />}
            {mine && <Btn label={`Keep in ${mine.in}`} onPress={() => did(act().keepChange(runId, mine.id).ok)} />}
            <View style={styles.rule} />
            <Btn kind="plain" mark="bin" label="Remove" spoken={`Remove ${row.words} from this run`} onPress={() => did(act().editRun(runId, { kind: 'remove', seq: row.seq, item: row.itemId }).ok)} />
          </>
        )}
      </Sheet>
    );
  }

  return (
    <GoScreen testID="go-all" layer={layer}>
      <View style={styles.header}>
        <Btn kind="plain" ink mark="back" spoken="Back" onPress={back} style={styles.square} />
        <H1 own ref={title} style={styles.headerTitle}>
          <T ink>This run of </T>
          <T ink bold size={20}>
            {all.name}
          </T>
        </H1>
      </View>
      <ScrollView style={styles.flex} contentContainerStyle={styles.body}>
        {all.rows.map((row) => {
          const solid = row.kind === 'step';
          const ink = solid ? G.ink : G.text;
          return (
            <View key={row.path.join('/')} style={{ marginLeft: indent(row.depth) }}>
              {row.divider && <DividerLine row={row} mine={changes.some((c) => c.kind === 'repeat' && c.seq === row.seq)} onPress={() => setMenu({ divider: row })} />}
              <View
                style={[styles.block, solid ? [{ backgroundColor: hue.c }, hard(4, hue.d)] : { borderWidth: 2, borderColor: hue.c }]}
                testID="go-all-row"
                {...{ dataSet: { here: row.here ? 'true' : 'false', kind: row.kind, mine: row.thisRunOnly ? 'true' : 'false' } }}>
                {row.kind !== 'step' && <Mark name={row.kind === 'wait' ? 'wait' : 'routine'} color={hue.c} />}
                <View style={styles.blockWords}>
                  <T bold color={ink}>
                    {row.words}
                  </T>
                  {row.thisRunOnly && <T color={ink}>this run only</T>}
                </View>
                {(row.here || row.within) && (
                  <View role="img" aria-label={row.here ? 'You are here' : 'You are in this'} accessibilityLabel={row.here ? 'You are here' : 'You are in this'} style={styles.hereMark}>
                    <Mark name="here" size={20} color={ink} />
                  </View>
                )}
                <Btn kind="plain" mark="more" ink={solid} spoken={`More for ${row.words}`} onPress={() => setMenu({ row })} />
              </View>
            </View>
          );
        })}
      </ScrollView>
      <Notice />
    </GoScreen>
  );
}

function DividerLine({ row, mine, onPress }: { row: SeeRow; mine: boolean; onPress: () => void }) {
  const times = row.divider?.repeat;
  const words = `Repeat from here${times !== undefined ? ` · ${times} ${times === 1 ? 'time' : 'times'}` : ''}`;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${words}${mine ? ', this run only' : ''}`} style={styles.divider} testID="go-all-divider">
      <Mark name="repeat" color={G.text} />
      <T style={styles.blockWords}>
        {words}
        {mine ? <T dim> · this run only</T> : null}
      </T>
    </Pressable>
  );
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
        {...{ dataSet: { here: here ? 'true' : 'false', picked: on ? 'true' : 'false' } }}
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
  square: { width: TARGET, paddingHorizontal: 0, justifyContent: 'center' },
  header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: SP.s2, paddingHorizontal: SP.s2, paddingVertical: SP.s2, backgroundColor: G.paper },
  headerTitle: { flex: 1, minWidth: 0, color: G.ink },
  body: { padding: SP.s3, gap: SP.s2 },
  block: { flexDirection: 'row', alignItems: 'center', gap: SP.s2, minHeight: TARGET, paddingLeft: SP.s3, marginRight: 4, marginBottom: 4 },
  blockWords: { flex: 1, minWidth: 0, paddingVertical: SP.s2 },
  hereMark: { width: 20, height: 24, justifyContent: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: SP.s2, minHeight: TARGET, borderTopWidth: 2, borderTopColor: G.line, marginBottom: SP.s2 },
  rule: { height: 1, backgroundColor: G.line, marginVertical: SP.s2 },
  jumpBody: { paddingVertical: SP.s2 },
  jumpRow: { flexDirection: 'row', alignItems: 'center', gap: SP.s3, minHeight: 52, paddingRight: SP.s3, borderLeftWidth: 4, borderLeftColor: 'transparent' },
  jumpOn: { backgroundColor: G.surf2, borderLeftColor: G.text },
  here: { flexDirection: 'row', alignItems: 'center', gap: SP.s1 },
  foot: { paddingHorizontal: SP.s3, paddingBottom: SP.s3, paddingTop: SP.s2 },
  jumpBtn: { minHeight: 56 },
});
