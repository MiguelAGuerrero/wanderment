import { createContext, useContext } from 'react';

import { C, M, Palette, s, Shared, sm } from '@/theme';

/**
 * Dark Map (owner, 2026-11-24): Map provides `true`, so the shared parts drawn on it (Screen, the log
 * box, the pull-in offer, the first run, the header icons) take the night palette there and the day
 * palette everywhere else.
 */
const Dark = createContext(false);
export const DarkProvider = Dark.Provider;
export const useDark = () => useContext(Dark);

/** The palette and shared styles for where this is drawn. */
export function usePalette(): { C: Palette; s: Shared; dark: boolean } {
  return useDark() ? { C: M, s: sm, dark: true } : { C, s, dark: false };
}

/** A style sheet made in both palettes once; `pick(dark)` returns the one to use. */
export function themed<T>(make: (C: Palette, s: Shared) => T) {
  const day = make(C, s);
  const dark = make(M, sm);
  return (isDark: boolean) => (isDark ? dark : day);
}
