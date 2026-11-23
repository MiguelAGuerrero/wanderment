import { useIsFocused } from 'expo-router';
import { createContext, useContext, useEffect } from 'react';

/**
 * Whether this part of the screen is the one in front (P-58). Home's sheet sits over Home in the same
 * route, so a screen being focused isn't enough: Home is "shown" while the sheet is away, and a
 * section of the sheet while the sheet is out on it — as when they were tabs.
 */
const Shown = createContext(true);
export const ShownProvider = Shown.Provider;

/** True when the route is focused and nothing of the same route covers this part of it. */
export function useShown() {
  const focused = useIsFocused();
  return useContext(Shown) && focused;
}

/** Like `useFocusEffect`, for `shown`: runs when it becomes true, and its cleanup when it stops being so. */
export function useWhileShown(shown: boolean, effect: () => void | (() => void)) {
  useEffect(() => {
    if (!shown) return;
    return effect();
  }, [shown, effect]);
}
