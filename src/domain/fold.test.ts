/**
 * P-89: `fold` moved out of the old app's search.ts. The prompt's search compares words with it
 * (starts.ts), so what it folds must not change: lower case, compatibility forms apart, accents off.
 * Expected values: the outputs of the build before the move (b50ffec).
 */
import { expect, it } from 'vitest';

import { fold } from './fold';

it('lower-cases and takes accents off, as before the retirement', () => {
  expect(fold('plain')).toBe('plain');
  expect(fold('Señor CAFÉ')).toBe('senor cafe');
  expect(fold('Ünïcödé')).toBe('unicode');
  expect(fold('ÅNGSTRÖM')).toBe('angstrom');
  expect(fold('İstanbul')).toBe('istanbul');
});

it('takes compatibility forms apart (a ligature, a circled digit) and leaves letters that are not accents (ß)', () => {
  expect(fold('ﬁne ①')).toBe('fine 1');
  expect(fold('Straße')).toBe('straße');
});

it('removes exactly the combining marks U+0300 to U+036F', () => {
  const c = String.fromCharCode;
  expect(fold(`e${c(0x300)}e${c(0x36f)}`)).toBe('ee');
  // The neighbours on either side stay (0x371 is already lower case).
  expect(fold(`e${c(0x2ff)}e${c(0x371)}`)).toBe(`e${c(0x2ff)}e${c(0x371)}`);
});
