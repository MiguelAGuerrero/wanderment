import { describe, expect, it } from 'vitest';

import { syncField } from './field';

describe('a field that saves as you type, when the saved value changes elsewhere (audit 2 F2)', () => {
  it('shows another page’s edit, so typing adds to it — focused or not, when nothing typed is unsaved', () => {
    for (const focused of [false, true]) {
      const next = syncField({ saved: 'from B', seen: 'from A', shown: 'from A', focused });
      expect(next).toEqual({ seen: 'from B', shown: 'from B' });
      // The next keystroke goes on the end of B's note.
      expect(next.shown + ' and A').toBe('from B and A');
    }
  });

  it('its own keystrokes, once saved, change nothing on screen', () => {
    expect(syncField({ saved: 'abc', seen: 'ab', shown: 'abc', focused: true })).toEqual({ seen: 'abc', shown: 'abc' });
  });

  it('nothing changed in the store: nothing changes on screen', () => {
    const f = { saved: 'x', seen: 'x', shown: 'typing', focused: true };
    expect(syncField(f)).toBe(f);
  });

  it('never replaces unsaved typing in the field that has focus', () => {
    // An emptied title isn't saved until it has text again.
    expect(syncField({ saved: 'from B', seen: 'from A', shown: '', focused: true })).toEqual({ seen: 'from B', shown: '' });
  });

  it('a field without focus shows what’s saved', () => {
    expect(syncField({ saved: 'from B', seen: 'from A', shown: 'refused keystroke', focused: false })).toEqual({ seen: 'from B', shown: 'from B' });
  });
});
