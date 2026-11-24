import { AccessibilityInfo, Platform } from 'react-native';

/**
 * P-74: how the last choice was made, so a session only ends by itself when no assistive tech is
 * waiting on it (`endsByItself`). Web: the last pointer press or key (a click with no pointer, as from
 * a keyboard or a screen reader's virtual cursor, counts as a key). Native: whether a screen reader is on.
 */
let input: 'pointer' | 'keyboard' | undefined;
let reader = false;

if (Platform.OS === 'web') {
  if (typeof document !== 'undefined') {
    document.addEventListener('pointerdown', () => (input = 'pointer'), true);
    document.addEventListener('keydown', () => (input = 'keyboard'), true);
    document.addEventListener('click', (e) => e.detail === 0 && (input = 'keyboard'), true);
  }
} else {
  void AccessibilityInfo.isScreenReaderEnabled().then((v) => (reader = v));
  AccessibilityInfo.addEventListener('screenReaderChanged', (v) => (reader = v));
}

export const lastInput = () => input;
export const screenReaderNow = () => reader;
