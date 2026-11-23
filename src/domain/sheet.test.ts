import { describe, expect, it } from 'vitest';

import { dragEndsOpen, SHEET_SECTIONS } from './sheet';

describe('the Home sheet (P-58)', () => {
  it('has two sections, Wanders then Activities', () => {
    expect(SHEET_SECTIONS.map((s) => s.label)).toEqual(['Wanders', 'Activities']);
  });

  it('a drag up from the handle opens it once it has gone far enough; a short one falls back', () => {
    expect(dragEndsOpen('closed', -200, 0, 780)).toBe(true);
    expect(dragEndsOpen('closed', -30, 0, 780)).toBe(false);
    // A drag down from closed goes nowhere.
    expect(dragEndsOpen('closed', 200, 0, 780)).toBe(false);
  });

  it('a drag down puts it away once it has gone far enough; a short one springs back', () => {
    expect(dragEndsOpen('open', 200, 0, 780)).toBe(false);
    expect(dragEndsOpen('open', 30, 0, 780)).toBe(true);
    expect(dragEndsOpen('open', -100, 0, 780)).toBe(true);
  });

  it('a quick flick decides by its direction, however short', () => {
    expect(dragEndsOpen('closed', -20, -1.2, 780)).toBe(true);
    expect(dragEndsOpen('open', 20, 1.2, 780)).toBe(false);
    // Flicked back the way it came: stays where it started.
    expect(dragEndsOpen('closed', -150, 1.2, 780)).toBe(false);
    expect(dragEndsOpen('open', 150, -1.2, 780)).toBe(true);
  });

  it('on a short screen it still needs a real drag, not a twitch', () => {
    expect(dragEndsOpen('closed', -40, 0, 200)).toBe(false);
    expect(dragEndsOpen('closed', -61, 0, 200)).toBe(true);
  });
});
