/**
 * P-95: a row's grip (moved here from Plan.tsx by P-100, so home's queue rows can use it too).
 */
import { useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Mark } from './marks';
import { G, SP, TARGET } from './tokens';
import { ViewRef } from './ui';

const WEB = Platform.OS === 'web';
const RING = WEB ? ({ outlineStyle: 'solid', outlineWidth: 2, outlineColor: G.focus, outlineOffset: 3 } as object) : null;
const RING_INK = WEB ? ({ outlineStyle: 'solid', outlineWidth: 2, outlineColor: G.ink, outlineOffset: 3 } as object) : null;

/** A move this far (px) is a drag; a press right after one is the drag's own release, not a tap. */
const DRAG_PX = 8;
const AFTER_DRAG_MS = 600;
/** Web: the grip takes the touch itself (no page scroll, no text selected while dragging). */
const GRAB = WEB ? ({ touchAction: 'none', userSelect: 'none', cursor: 'grab' } as object) : null;

/**
 * P-95: a row's grip — the visible way to drag it. It claims the pointer once it has moved DRAG_PX up or
 * down; pressed, it is a button ("Reorder <words>") that opens its own small menu, Move up · Move down
 * (P-102 audit F1: the way to reorder without a drag).
 */
/** (P-100: home's queue rows use it too — `ink` on a routine's colour, its own `testID`, and `style` for its place.) */
export function Grip({ words, onStart, onMove, onDrop, onPress, gripRef, ink, testID = 'go-plan-grip', style, keys }: { words: string; keys?: string; onStart: () => void; onMove: (dy: number) => void; onDrop: (dy: number | undefined) => void; onPress: () => void; gripRef?: (el: unknown) => void; ink?: boolean; testID?: string; style?: object }) {
  const start = useRef<number | null>(null);
  const dragging = useRef(false);
  const ended = useRef(0);
  const box = useRef<ViewRef>(null);
  // The latest handlers, for the listeners the web path adds once.
  const calls = useRef({ onStart, onMove, onDrop });
  useEffect(() => {
    calls.current = { onStart, onMove, onDrop };
  });
  const end = (to: number | undefined) => {
    if (dragging.current) ended.current = Date.now();
    const was = dragging.current;
    dragging.current = false;
    start.current = null;
    if (was) calls.current.onDrop(to);
  };
  const pointer = useRef<number | undefined>(undefined);
  const moved = (y: number) => {
    if (start.current === null) return;
    const dy = y - start.current;
    if (!dragging.current && Math.abs(dy) > DRAG_PX) {
      dragging.current = true;
      // Web: from here on the grip has the pointer, wherever it goes (not before: a press stays a press).
      const el = box.current as unknown as HTMLElement | null;
      try {
        if (WEB && el && pointer.current !== undefined) el.setPointerCapture(pointer.current);
      } catch {
        // (A pointer that is already gone.)
      }
      calls.current.onStart();
    }
    if (dragging.current) calls.current.onMove(dy);
  };
  // Web: DOM pointer events (touch and mouse alike). Pressed on the grip, the pointer is followed on the
  // whole window until it is let go: a quick first move is already off the grip before it counts as a
  // drag (audit F2 spec), and RN-web's responder only asks the grip about moves over it.
  useEffect(() => {
    const el = box.current as unknown as HTMLElement | null;
    if (!WEB || !el || typeof el.addEventListener !== 'function') return;
    let id: number | undefined;
    const move = (e: PointerEvent) => e.pointerId === id && moved(e.clientY);
    const stop = (e: PointerEvent, to: number | undefined) => {
      if (e.pointerId !== id) return;
      id = undefined;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      end(to);
    };
    const up = (e: PointerEvent) => stop(e, start.current === null ? undefined : e.clientY - start.current);
    const cancel = (e: PointerEvent) => stop(e, undefined);
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || id !== undefined) return;
      id = e.pointerId;
      pointer.current = e.pointerId;
      start.current = e.clientY;
      dragging.current = false;
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', cancel);
    };
    el.addEventListener('pointerdown', down);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
    };
    // Once: the handlers are read through `calls`.
  }, []);
  type Touch = { nativeEvent: { pageY: number } };
  // Native: the responder system (a vertical move past DRAG_PX claims the touch).
  const native = WEB
    ? {}
    : {
        onStartShouldSetResponderCapture: (e: Touch) => {
          start.current = e.nativeEvent.pageY;
          return false;
        },
        onMoveShouldSetResponder: (e: Touch) => start.current !== null && Math.abs(e.nativeEvent.pageY - start.current) > DRAG_PX,
        onResponderMove: (e: Touch) => moved(e.nativeEvent.pageY),
        onResponderRelease: (e: Touch) => end(start.current === null ? undefined : e.nativeEvent.pageY - start.current),
        onResponderTerminationRequest: () => false,
        onResponderTerminate: () => end(undefined),
      };
  return (
    <View ref={box} style={[styles.grip, style, GRAB]} {...native} testID={testID}>
      <Pressable
        ref={gripRef}
        onPress={() => Date.now() - ended.current > AFTER_DRAG_MS && !dragging.current && onPress()}
        accessibilityRole="button"
        accessibilityLabel={`Reorder ${words}`}
        {...(WEB && keys && { 'aria-keyshortcuts': keys })}
        style={(state) => [styles.gripBtn, (state as { focused?: boolean }).focused && (ink ? RING_INK : RING)]}>
        <Mark name="grip" color={ink ? G.ink : G.dim} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  grip: { marginLeft: -(SP.s3 - 4), alignSelf: 'stretch', justifyContent: 'center' },
  gripBtn: { width: TARGET, minHeight: TARGET, alignItems: 'center', justifyContent: 'center' },
});
