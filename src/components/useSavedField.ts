import { useState } from 'react';

import { syncField } from '@/domain/field';

/**
 * The text of a field that saves as you type. It follows the saved value when that changes from
 * elsewhere (another page's edit taken in, an Undo), but never replaces unsaved typing in the
 * field that has focus (`syncField`, audit 2 F2).
 */
export function useSavedField(saved: string) {
  const [focused, setFocused] = useState(false);
  const [field, setField] = useState({ seen: saved, shown: saved });
  const next = syncField({ saved, ...field, focused });
  // Adjusted while rendering (no effect), so the old text is never on screen for a frame.
  if (next.seen !== field.seen || next.shown !== field.shown) setField({ seen: next.seen, shown: next.shown });
  return {
    value: next.shown,
    setValue: (shown: string) => setField((f) => ({ ...f, shown })),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  };
}
