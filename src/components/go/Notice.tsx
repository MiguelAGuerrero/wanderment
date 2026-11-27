/**
 * B-11 slice 1 (P-86): the notice — one at a time, in one slot IN THE FLOW directly above the bottom
 * zone (so it can never cover the note, the buttons or the prompt), until the next action. What
 * happened, and Undo while the store's Undo is still that action's. It is a polite live region and is
 * never the only home of Undo (the panel's "Undo <thing>" row, Ctrl/⌘+Z). The quiet "reconnecting"
 * line shows here too. (P-90: the Keep sheet that lived here is gone with the Keep offer.)
 *
 * P-101 (ruling 6): a Plan edit's notice is quiet — nothing is shown (its Undo is the routine's menu
 * row, "Undo <edit>"). A shown notice goes at the next tap anywhere but on it, and at a screen change
 * (`NoticeWatch`), so it is never seen on a screen other than the one where it happened.
 */
import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

import { useStore } from '@/store/useStore';

import { Btn, hard, T, useVisibleHeight } from './ui';
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
  // A Plan edit's (quiet), or one put away by a tap or a screen change (audit F1: its Undo stays — the panel, Ctrl/⌘+Z).
  const hush = (!!notice?.quiet || !!notice?.hidden) && !quiet;
  const text = quiet ?? (hush ? '' : (notice?.text ?? ''));
  const shown = !!text || (!!can && !quiet && !hush);
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
          {can && !quiet && !hush && (
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

const styles = StyleSheet.create({
  watch: { flex: 1 },
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

/**
 * P-101 (ruling 6): mounted once, around every `/go` screen. A tap anywhere but on the notice puts it
 * away (`tapped`); a screen change does too, unless the action that made it changed the screen
 * (`screenChanged`). Web: the click, captured before anything handles it (after the press, so nothing
 * pressed moves under the pointer). Native: the touch, observed (never claimed) at the root.
 */
export function NoticeWatch({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    useStore.getState().screenChanged();
  }, [path]);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    // On the click, not the press: the notice's row going away must not move what is being pressed.
    const tap = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (t && typeof t.closest === 'function' && t.closest('[data-testid="go-notice"]')) return;
      useStore.getState().tapped();
    };
    document.addEventListener('click', tap, true);
    return () => document.removeEventListener('click', tap, true);
  }, []);
  // Native: when the touch ends, after the press it was has run (a press on the notice's own Undo is never lost).
  return (
    <View style={styles.watch} {...(Platform.OS !== 'web' && { onTouchEnd: () => setTimeout(() => useStore.getState().tapped(), 0) })}>
      {children}
    </View>
  );
}
