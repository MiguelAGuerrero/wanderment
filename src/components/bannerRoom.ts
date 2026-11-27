/**
 * P-103 (12; audit F-23): the room the update banner takes at the top of the window, so every `/go` screen
 * starts below it — the banner never covers a control. 0 while there is no banner.
 */
import { useSyncExternalStore } from 'react';

let room = 0;
const listeners = new Set<() => void>();

export function setBannerRoom(px: number) {
  const next = Math.max(0, Math.ceil(px));
  if (next === room) return;
  room = next;
  for (const l of listeners) l();
}

export function useBannerRoom(): number {
  return useSyncExternalStore(
    (on) => {
      listeners.add(on);
      return () => listeners.delete(on);
    },
    () => room,
    () => 0,
  );
}
