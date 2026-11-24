import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * Web: Esc goes back on the night screens (/sky, /star, /trail; P-66 fix), as it does on Map — while
 * the screen is `shown`, unless something nearer handled it or focus is in a field (Esc there is the
 * field's).
 */
export function useEscBack(shown: boolean, back: () => void) {
  const latest = useRef(back);
  useEffect(() => {
    latest.current = back;
  }, [back]);
  useEffect(() => {
    if (!shown || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      latest.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [shown]);
}
