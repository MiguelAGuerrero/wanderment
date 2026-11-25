import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

import { useStore } from '@/store/useStore';

const SHOW_MS = 6000;

/**
 * The one timer for the toast (the quiet notes the store raises, such as “reconnecting”): the timing lives
 * here, once, at the root. Announces on iOS/Android and never auto-dismisses while
 * a screen reader is on there; browsers can't tell, so on web the toast's live region announces
 * it.
 */
export function ToastTimer() {
  const toast = useStore((s) => s.toast);
  const dismiss = useStore((s) => s.dismissToast);
  const [screenReader, setScreenReader] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    // react-native-web always reports a screen reader, which would keep every toast up forever.
    if (Platform.OS === 'web') return;
    AccessibilityInfo.isScreenReaderEnabled().then(setScreenReader).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (toast && Platform.OS !== 'web') AccessibilityInfo.announceForAccessibility?.(toast.message);
  }, [toast]);

  useEffect(() => {
    clearTimeout(timer.current);
    if (toast && !screenReader) timer.current = setTimeout(dismiss, SHOW_MS);
    return () => clearTimeout(timer.current);
  }, [toast, screenReader, dismiss]);

  return null;
}
