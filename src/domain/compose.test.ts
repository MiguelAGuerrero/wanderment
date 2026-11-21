import { describe, expect, it } from 'vitest';

import { activeMention, caretAfterEdit, mentionAt, mentionEnd, removeActiveMention, replaceActiveMention } from './compose';

// "sketched for @ma and then more": the @ is at 13, the caret after "@ma" is 16.
const MID = 'sketched for @ma and then more';

describe('the @mention at the caret', () => {
  it('with the caret at the end, finds the same mention as before', () => {
    const text = 'sketched @make app';
    expect(mentionAt(text)).toEqual({ start: 9, end: 18, query: 'make app' });
    expect(mentionAt(text, text.length)).toEqual({ start: 9, end: 18, query: 'make app' });
    expect(activeMention(text, text.length)).toEqual(activeMention(text));
    expect(mentionAt('mail me@x.com')).toBeUndefined();
    // Today's rules at the end: the last @ wins, an email after a mention hides it, a bare @ opens.
    expect(activeMention('for @ma and @mu then')).toEqual({ start: 12, query: 'mu then' });
    expect(activeMention('@ma then a@b')).toBeUndefined();
    expect(activeMention('@')).toEqual({ start: 0, query: '' });
  });

  it('mid-query, the query is the text between the @ and the caret', () => {
    expect(mentionAt(MID, 16)).toEqual({ start: 13, end: 16, query: 'ma' });
    expect(activeMention(MID, 16)).toEqual({ start: 13, query: 'ma' });
  });

  it('directly after the @, the query is empty and the mention is just the @', () => {
    // A bare @ may have been typed in front of a word the person wrote: picking must keep that word.
    expect(mentionAt(MID, 14)).toEqual({ start: 13, end: 14, query: '' });
  });

  it('before the @, there is no mention', () => {
    expect(mentionAt(MID, 13)).toBeUndefined();
    expect(mentionAt(MID, 5)).toBeUndefined();
    expect(mentionAt(MID, 0)).toBeUndefined();
  });

  it('inside an email in the middle of the text, there is no mention', () => {
    const text = 'mail a@b.com and more';
    expect(mentionAt(text, 8)).toBeUndefined(); // after "a@b"
    expect(mentionAt(text, 12)).toBeUndefined(); // after the whole address
  });

  it('a newline between the @ and the caret ends the mention', () => {
    const text = 'one @ma\ntwo';
    expect(mentionAt(text, text.length)).toBeUndefined();
    expect(mentionAt(text, 7)).toEqual({ start: 4, end: 7, query: 'ma' });
  });

  it('a query longer than 40 characters is no mention', () => {
    const forty = 'x'.repeat(40);
    expect(mentionAt(`go @${forty} tail`, 4 + 40)).toEqual({ start: 3, end: 44, query: forty });
    expect(mentionAt(`go @${forty}x tail`, 4 + 41)).toBeUndefined();
  });

  it('with two mentions, the caret picks the one it is in', () => {
    const text = 'for @ma and @mu then';
    expect(mentionAt(text, 7)).toEqual({ start: 4, end: 7, query: 'ma' });
    expect(mentionAt(text, 15)).toEqual({ start: 12, end: 15, query: 'mu' });
    expect(mentionAt(text, 13)).toEqual({ start: 12, end: 13, query: '' });
  });

  it('a caret beyond the text is clamped to its end', () => {
    expect(mentionAt('sketched @make app', 99)).toEqual({ start: 9, end: 18, query: 'make app' });
    expect(mentionAt('sketched @make app', -3)).toBeUndefined();
  });

  it('the mention ends at the end of the word the caret is in', () => {
    // "@ma|ke more": picking replaces "@make", so no "ke" is left behind.
    expect(mentionAt('sketched @make more', 12)).toEqual({ start: 9, end: 14, query: 'ma' });
    // After a space, the caret is not in a word of the mention: the next word is never swallowed.
    expect(mentionAt('sketched @make and then more', 15)).toEqual({ start: 9, end: 15, query: 'make ' });
  });
});

describe('replacing the @mention at the caret', () => {
  it('keeps the text after the mention', () => {
    expect(replaceActiveMention('sketched @make and then more', 14)).toEqual({ text: 'sketched and then more', caret: 9 });
    expect(replaceActiveMention(MID, 16)).toEqual({ text: 'sketched for and then more', caret: 13 });
  });

  it('replaces the rest of the word under the caret', () => {
    expect(replaceActiveMention('sketched @make more', 12)).toEqual({ text: 'sketched more', caret: 9 });
  });

  it('joins the two sides with exactly one space, never a leading one', () => {
    expect(replaceActiveMention('@ma rest', 3)).toEqual({ text: 'rest', caret: 0 });
    expect(replaceActiveMention('sketched   @ma   rest', 14)).toEqual({ text: 'sketched rest', caret: 9 });
    expect(replaceActiveMention('sketched @make  and', 15)).toEqual({ text: 'sketched and', caret: 9 });
    expect(replaceActiveMention('  @ma', 5)).toEqual({ text: '', caret: 0 });
  });

  it('with nothing after the mention, gives exactly today’s result', () => {
    // Today: the text before the @, trailing whitespace collapsed to one space, leading trimmed.
    const today: [string, string][] = [
      ['sketched @make app', 'sketched '],
      ['sketched   @ma', 'sketched '],
      ['@ma', ''],
      ['  lead @x', 'lead '],
      ['tab\t@x', 'tab '],
      ['mail me@x.com', 'mail me@x.com'],
      ['no mention', 'no mention'],
    ];
    for (const [text, expected] of today) {
      expect(replaceActiveMention(text, text.length)).toEqual({ text: expected, caret: expected.length });
      expect(removeActiveMention(text)).toBe(expected);
    }
  });

  it('without a mention at the caret, leaves the text alone', () => {
    expect(replaceActiveMention(MID, 5)).toEqual({ text: MID, caret: 5 });
    expect(replaceActiveMention('plain', 99)).toEqual({ text: 'plain', caret: 5 });
  });
});

describe('the caret after an edit (when the platform reports the text before the selection)', () => {
  it('sits after what was inserted or where something was deleted', () => {
    expect(caretAfterEdit('sketched  and', 'sketched @ and')).toBe(10);
    expect(caretAfterEdit('abc', 'abcd')).toBe(4);
    expect(caretAfterEdit('abcdef', 'abdef')).toBe(2);
    expect(caretAfterEdit('sketched and', 'sketched pasted and')).toBe(16);
    expect(caretAfterEdit('', 'x')).toBe(1);
    expect(caretAfterEdit('same', 'same')).toBe(4);
  });
});

describe('picking never deletes words the person typed (audit B, finding 1)', () => {
  it('an @ typed in front of a word keeps the word', () => {
    expect(replaceActiveMention('finished the @hem', 14)).toEqual({ text: 'finished the hem', caret: 13 });
    expect(replaceActiveMention('sketched @and then more', 10).text).toBe('sketched and then more');
  });

  it('punctuation after the @word stays', () => {
    expect(mentionAt('did @make, then left', 7)).toEqual({ start: 4, end: 9, query: 'ma' });
    expect(replaceActiveMention('did @make, then left', 7).text).toBe('did, then left');
    expect(replaceActiveMention('did @make, then left', 9).text).toBe('did, then left');
  });

  it('the rest of a word with accents, digits or an apostrophe is still taken in', () => {
    expect(mentionAt('at @caf\u00e9s now', 7)).toEqual({ start: 3, end: 9, query: 'caf' });
    expect(mentionAt('at @v2-beta now', 5)).toEqual({ start: 3, end: 11, query: 'v' });
    expect(mentionAt("at @mum's place", 6)).toEqual({ start: 3, end: 9, query: 'mu' });
  });
});

describe('the rest of the word goes only if it continues the picked name', () => {
  it('"@make" typed in front of "and" keeps "and" (the contract\'s own keystrokes)', () => {
    const text = 'sketched @makeand then more';
    expect(mentionEnd(text, 14, 'make apparel')).toBe(14);
    expect(replaceActiveMention(text, 14, 'make apparel')).toEqual({ text: 'sketched and then more', caret: 9 });
  });

  it('"@ma|ke" picking "make music" takes the whole word', () => {
    expect(mentionEnd('sketched @make more', 12, 'make music')).toBe(14);
    expect(replaceActiveMention('sketched @make more', 12, 'Make Music').text).toBe('sketched more');
  });

  it('without a name, the whole word goes (as before)', () => {
    expect(replaceActiveMention('sketched @makeand then more', 14).text).toBe('sketched then more');
  });
});
