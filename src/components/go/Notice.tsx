/**
 * B-11 slice 1 (P-86): the notice — one at a time, in one slot IN THE FLOW directly above the bottom
 * zone (so it can never cover the note, the buttons or the prompt), until the next action. What
 * happened, and Undo while the store's Undo is still that action's. It is a polite live region and is
 * never the only home of Undo (the panel's "Undo <thing>" row, Ctrl/⌘+Z). The quiet "reconnecting"
 * line shows here too. Also: the sheet that shows this run's changes once, each with Keep.
 */
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ChangeRow, describeChanges } from '@/domain/runView';
import { useStore } from '@/store/useStore';

import { Btn, hard, Sheet, T, useVisibleHeight } from './ui';
import { G, SP } from './tokens';

/** Undo, if the last run action can still be taken back: its label ("Next"), else undefined. */
export function useRunUndo(): { label: string; undo: () => void } | undefined {
  const notice = useStore((s) => s.runNotice);
  const entry = useStore((s) => s.undo);
  const undoLast = useStore((s) => s.undoLast);
  if (!notice?.entry || notice.entry !== entry) return undefined;
  return { label: notice.label, undo: undoLast };
}

/** `reserve`: keep its room when there is nothing to say (the runner: the note never shifts), where the screen is tall enough. */
export function Notice({ onUndone, reserve }: { onUndone?: () => void; reserve?: boolean }) {
  const { height } = useWindowDimensions();
  const seen = useVisibleHeight();
  const tight = (seen?.height ?? height) < 600;
  const notice = useStore((s) => s.runNotice);
  const quiet = useStore((s) => (s.toast?.notice ? s.toast.message : undefined));
  const can = useRunUndo();
  const text = quiet ?? notice?.text ?? '';
  const shown = !!text || (!!can && !quiet);
  // Native: said aloud (web has the live region).
  const said = useRef('');
  useEffect(() => {
    if (Platform.OS !== 'web' && text && text !== said.current) AccessibilityInfo.announceForAccessibility(text);
    said.current = text;
  }, [text]);
  return (
    <View role="status" aria-live="polite" accessibilityLiveRegion="polite" testID="go-notice-slot" style={[styles.slot, reserve && !tight && styles.reserved]}>
      {shown && (
        <View style={[styles.notice, tight && styles.noticeTight]} testID="go-notice">
          {!!text && <T style={styles.text}>{text}</T>}
          {can && !quiet && (
            <Btn
              kind="plain"
              mark="undo"
              label={text ? 'Undo' : `Undo ${can.label}`}
              spoken={`Undo ${can.label}`}
              onPress={() => {
                can.undo();
                onUndone?.();
              }}
              style={styles.undo}
            />
          )}
        </View>
      )}
    </View>
  );
}

/** One change of this run, in words: what it is now, and (dim) what kind of change it is. */
export function changeWords(c: ChangeRow): { words: string; note: string } {
  if (c.kind === 'reword') return { words: c.words, note: c.was ? `was: ${c.was}` : '' };
  if (c.kind === 'breakdown') return { words: c.words, note: (c.steps ?? []).join(' · ') };
  if (c.kind === 'add') return { words: c.words, note: 'added' };
  if (c.kind === 'remove') return { words: c.words, note: 'removed' };
  if (c.kind === 'move') return { words: c.words, note: 'moved' };
  return { words: c.repeat === 'until' || c.repeat === undefined ? 'Repeat until I’m done' : `Repeat ${c.repeat} ${c.repeat === 1 ? 'time' : 'times'}`, note: '' };
}

/**
 * This run's changes, each with Keep, and Keep all (B-11 §9c). It never blocks: what was pressed has
 * already happened, and closing it keeps nothing. `ids`: the changes to show (the store's offer, or
 * the panel's "Keep in <routine>").
 */
export function KeepSheet({ runId, ids, onClose }: { runId: string; ids: string[]; onClose: () => void }) {
  const data = useStore((s) => s.data);
  const keepChange = useStore((s) => s.keepChange);
  const rows = describeChanges(data, runId, ids);
  const gone = rows.length === 0;
  useEffect(() => {
    if (gone) onClose();
  }, [gone, onClose]);
  if (gone) return null;
  const into = rows[0].in;
  const same = rows.every((r) => r.in === into);
  return (
    <Sheet title={same && into ? `Keep in ${into}` : 'Keep'} onClose={onClose} testID="go-keep">
      {rows.map((r) => {
        const w = changeWords(r);
        return (
          <View key={r.id} style={styles.row} testID="go-keep-row">
            <View style={styles.rowWords}>
              <T bold>{w.words}</T>
              {!!w.note && <T dim>{w.note}</T>}
              {!same && !!r.in && <T dim>{`in ${r.in}`}</T>}
            </View>
            <Btn label="Keep" spoken={`Keep ${w.words}${r.in ? ` in ${r.in}` : ''}`} onPress={() => keepChange(runId, r.id)} />
          </View>
        );
      })}
      <Btn
        kind="filled"
        label="Keep all"
        dataSet={{ first: 'true' }}
        onPress={() => {
          // The ones shown, in ONE Keep: one Undo takes all of it back.
          keepChange(runId, rows.map((r) => r.id));
          onClose();
        }}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  slot: { paddingHorizontal: SP.s3 },
  reserved: { minHeight: 64 },
  noticeTight: { marginBottom: SP.s1 + 4 },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SP.s2,
    backgroundColor: G.surf2,
    borderWidth: 2,
    borderColor: G.line,
    paddingLeft: SP.s3,
    paddingRight: SP.s1,
    marginBottom: SP.s2 + 4,
    marginRight: 4,
    ...hard(4, G.shadow),
  },
  text: { flex: 1, minWidth: 120, paddingVertical: SP.s2 },
  undo: { marginLeft: 'auto' },
  row: { flexDirection: 'row', alignItems: 'center', gap: SP.s2, borderBottomWidth: 1, borderBottomColor: G.line, paddingVertical: SP.s2 },
  rowWords: { flex: 1, minWidth: 0 },
});
