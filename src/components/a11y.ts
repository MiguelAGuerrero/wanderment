import { ComponentRef, useEffect, useState } from 'react';
import { AccessibilityInfo, findNodeHandle, Platform, Text, View } from 'react-native';

/**
 * Spread onto purely decorative elements (glyphs like ↳ › ✎) so no screen reader reads them:
 * aria-hidden for web, the other two for iOS and Android.
 */
export const decorative = {
  'aria-hidden': true,
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

/** Moves focus to an element (something as it appears): never to a field, so no keyboard comes up. */
export function moveFocus(el: ComponentRef<typeof View> | ComponentRef<typeof Text> | null) {
  if (!el) return;
  if (Platform.OS === 'web') (el as unknown as HTMLElement).focus?.();
  else {
    const handle = findNodeHandle(el);
    if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
  }
}

/** Whether the person asked for less motion. */
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
