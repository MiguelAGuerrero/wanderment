import { describe, expect, it } from 'vitest';

import { changedElsewhere, syncField } from './field';

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

  it('a trailing space or newline (the saved text is trimmed) isn’t unsaved typing: another page’s edit still shows (audit 3 D2)', () => {
    for (const shown of ['went well ', 'went well\n', ' went well']) {
      expect(syncField({ saved: 'B wrote a long careful note', seen: 'went well', shown, focused: true })).toEqual({ seen: 'B wrote a long careful note', shown: 'B wrote a long careful note' });
    }
  });

  it('typing a space, or deleting back to one, keeps it on screen (the saved text has no trailing space)', () => {
    expect(syncField({ saved: 'abc', seen: 'abc d', shown: 'abc ', focused: true })).toEqual({ seen: 'abc', shown: 'abc ' });
    expect(syncField({ saved: 'went well', seen: 'went wel', shown: 'went well ', focused: true })).toEqual({ seen: 'went well', shown: 'went well ' });
  });

  it('tells a change made elsewhere from the field’s own saved typing (what an emptied title goes back to, audit 3 D3)', () => {
    expect(changedElsewhere({ saved: 'alpha, edited in B', seen: 'alpha', shown: '' })).toBe(true);
    expect(changedElsewhere({ saved: 'a', seen: 'al', shown: 'a' })).toBe(false);
    expect(changedElsewhere({ saved: 'abc', seen: 'abc d', shown: 'abc ' })).toBe(false);
    expect(changedElsewhere({ saved: 'x', seen: 'x', shown: '' })).toBe(false);
  });
});
