/**
 * P-89: `hash` moved out of the old app's sky.ts. A tile's colour comes from it (runView), so its
 * output must never change. Expected values: the published FNV-1a (32-bit) test vectors, and the
 * outputs of the build before the move (b50ffec).
 */
import { expect, it } from 'vitest';

import { hash } from './hash';

it('is FNV-1a, 32 bits, unsigned (the published vectors)', () => {
  expect(hash('')).toBe(0x811c9dc5);
  expect(hash('a')).toBe(0xe40c292c);
  expect(hash('foobar')).toBe(0xbf9cf968);
});

it('gives what the build before the retirement gave (ids, names, accents, non-Latin)', () => {
  expect(hash('Make dinner')).toBe(2026524581);
  expect(hash('new-001')).toBe(917555615);
  expect(hash('practice drawing')).toBe(1632559662);
  expect(hash('Señor café')).toBe(686264834);
  expect(hash('日本語')).toBe(1409693518);
});
