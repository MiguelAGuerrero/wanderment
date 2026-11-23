import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, BackHandler, Platform } from 'react-native';

import { useStore } from '@/store/useStore';

/** Marks the browser history entries narrowing pushed (P-50), with the scope's depth. */
const KEY = 'wandermentScope';

const web = () => Platform.OS === 'web' && typeof window !== 'undefined';

/**
 * Up one scope level on Home (P-50: the chip, Esc). On web, when the browser's current entry is the
 * one narrowing pushed, it goes back through history, so the chip and the browser's Back agree.
 */
export function goUp() {
  const depth = useStore.getState().scope.length;
  if (!depth) return;
  if (web() && (window.history.state as Record<string, unknown> | null)?.[KEY] === depth) window.history.back();
  else useStore.getState().scopeUp();
}

/**
 * Home's ways up (P-50) while Home is shown: Esc (in a scope, up one level; at All, it clears an
 * attach, keeping the line), the browser's Back on web (narrowing pushes an entry that keeps the
 * router's own state, so the router stays where it is) and Android's Back.
 * P-65: on Map, Esc at All with nothing attached and nothing focused calls `onTop` (back to the prompt).
 */
export function useScopeNav(focused: boolean, onTop?: () => void) {
  const top = useRef(onTop);
  useEffect(() => {
    top.current = onTop;
  }, [onTop]);
  const depth = useStore((st) => st.scope.length);
  const was = useRef(depth);
  useEffect(() => {
    if (web() && depth > was.current) window.history.pushState({ ...(window.history.state as object | null), [KEY]: depth }, '');
    was.current = depth;
  }, [depth]);

  useEffect(() => {
    if (!focused) return;
    const subs: (() => void)[] = [];
    if (web()) {
      // Something nearer (the @ menu, a field, the empty log box) handles its own Esc first. Text
      // inputs stop key events from bubbling, so it's caught on the way down and judged once handled.
      const onKey = (e: KeyboardEvent) =>
        e.key === 'Escape' &&
        setTimeout(() => {
          if (e.defaultPrevented) return;
          const st = useStore.getState();
          if (st.scope.length) goUp();
          else if (st.selected) st.select(undefined);
          else if (document.activeElement === document.body || !document.activeElement) top.current?.();
        }, 0);
      const onPop = () => useStore.getState().scope.length && useStore.getState().scopeUp();
      document.addEventListener('keydown', onKey, true);
      window.addEventListener('popstate', onPop);
      subs.push(
        () => document.removeEventListener('keydown', onKey, true),
        () => window.removeEventListener('popstate', onPop),
      );
    } else {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (!useStore.getState().scope.length) return false;
        useStore.getState().scopeUp();
        return true;
      });
      subs.push(() => sub.remove());
    }
    return () => subs.forEach((f) => f());
  }, [focused]);
}

/** Whether the person asked for less motion (the zoom on narrowing is skipped then). */
export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => live && setReduce(v));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduce(v));
    return () => {
      live = false;
      sub?.remove();
    };
  }, []);
  return reduce;
}
