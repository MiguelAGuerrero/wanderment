/** P-48: heat flows upward — the warmth of the most recent activity on a node or anything feeding it. */
import { describe, expect, it } from 'vitest';

import { HEAT_LABEL_DARK, HEAT_LABEL_LIGHT, contrast, heatFill, heatInk, heatLabel, NIGHT_DARK_FROM, NIGHT_LABEL_DARK, NIGHT_LABEL_LIGHT, nightHeatFill, nightHeatInk, nightHeatLabel, nodeHeat } from './heat';
import { logActivity } from './model';
import { Data, emptyData, Id } from './types';

const NOW = new Date(Date.UTC(2026, 10, 22, 12));
const day = (n: number) => new Date(NOW.getTime() - n * 864e5);

function make(...names: string[]) {
  const data: Data = emptyData();
  for (const n of names) data.threads[n] = { id: n, name: n, hidden: false, createdAt: day(200).toISOString() };
  return data;
}
/** "doing from → to", `daysAgo` days ago. */
const feed = (data: Data, from: Id | undefined, to: Id[], daysAgo: number) =>
  logActivity(data, { text: 'x', doingId: from, toIds: to, occurredAt: day(daysAgo) }, day(daysAgo)).data;
const heat = (data: Data, ids: Id[], shading = true) => nodeHeat(data, ids, { now: NOW, shading });

describe('nodeHeat: the most recent activity on a node or beneath it, halving every 14 days', () => {
  it('a node logged just now is fully hot; 14 days ago half; 28 days ago a quarter', () => {
    let data = make('a', 'b', 'c');
    data = feed(data, undefined, ['a'], 0);
    data = feed(data, 'b', [], 14);
    data = feed(data, undefined, ['c'], 28);
    const h = heat(data, ['a', 'b', 'c']);
    expect(h.a).toBeCloseTo(1, 5);
    expect(h.b).toBeCloseTo(0.5, 5);
    expect(h.c).toBeCloseTo(0.25, 5);
  });

  it('an unlogged node is cold (0)', () => {
    const data = make('lonely');
    expect(heat(data, ['lonely'])).toEqual({ lonely: 0 });
  });

  it('flows upward through doing → to, transitively: a parent is as hot as its hottest descendant', () => {
    // hands → draw → make apparel; only hands was logged recently (doing hands → to draw).
    let data = make('hands', 'draw', 'make apparel');
    data = feed(data, 'draw', ['make apparel'], 56);
    data = feed(data, 'hands', ['draw'], 14);
    const h = heat(data, ['hands', 'draw', 'make apparel']);
    expect(h.hands).toBeCloseTo(0.5, 5);
    expect(h.draw).toBeCloseTo(0.5, 5);
    expect(h['make apparel']).toBeCloseTo(0.5, 5);
  });

  it('never flows downward: a child stays as cool as its own activity', () => {
    let data = make('draw', 'make apparel');
    data = feed(data, 'draw', ['make apparel'], 28);
    data = feed(data, undefined, ['make apparel'], 0);
    const h = heat(data, ['draw', 'make apparel']);
    expect(h['make apparel']).toBeCloseTo(1, 5);
    expect(h.draw).toBeCloseTo(0.25, 5);
  });

  it('is never a sum or a count: many old logs are no hotter than one', () => {
    let many = make('sew', 'make apparel');
    for (let i = 0; i < 30; i++) many = feed(many, 'sew', ['make apparel'], 14);
    let one = make('sew', 'make apparel');
    one = feed(one, 'sew', ['make apparel'], 14);
    expect(heat(many, ['make apparel'])['make apparel']).toBeCloseTo(0.5, 5);
    expect(heat(many, ['make apparel'])).toEqual(heat(one, ['make apparel']));
  });

  it('a diamond: two feeders of the same age give the parent that warmth, not more', () => {
    // a → b, a → c, b → d, c → d; the logs into d are 14 days old, a's own one 28.
    let data = make('a', 'b', 'c', 'd');
    data = feed(data, 'a', ['b', 'c'], 28);
    data = feed(data, 'b', ['d'], 14);
    data = feed(data, 'c', ['d'], 14);
    const h = heat(data, ['a', 'b', 'c', 'd']);
    expect(h.d).toBeCloseTo(0.5, 5);
    expect(h.b).toBeCloseTo(0.5, 5);
    expect(h.a).toBeCloseTo(0.25, 5);
  });

  it('a cycle (A → B and B → A, which DESIGN allows) ends, and both carry the newest', () => {
    let data = make('a', 'b', 'c');
    data = feed(data, 'a', ['b'], 28);
    data = feed(data, 'b', ['a'], 42);
    data = feed(data, 'c', ['a'], 14);
    const h = heat(data, ['a', 'b', 'c']);
    expect(h.a).toBeCloseTo(0.5, 5);
    expect(h.b).toBeCloseTo(0.5, 5);
    expect(h.c).toBeCloseTo(0.5, 5);
  });

  it('shading off: every node is neutral (0), whatever its activity', () => {
    let data = make('a', 'b');
    data = feed(data, 'a', ['b'], 0);
    expect(heat(data, ['a', 'b'], false)).toEqual({ a: 0, b: 0 });
  });
});

/** The page (theme C.bg). */
const BG = '#F5F3EE';

describe('heat colours: cool stone → amber → ember, readable at every heat', () => {
  const steps = Array.from({ length: 101 }, (_, i) => i / 100);

  it('a label inside a circle is 4.5:1 or more against its fill at every heat', () => {
    for (const h of steps) expect(contrast(heatLabel(h), heatFill(h)), `${h}`).toBeGreaterThanOrEqual(4.5);
  });

  it('dark text on a cool circle, white text on a hot one', () => {
    expect(heatLabel(0)).toBe(HEAT_LABEL_DARK);
    expect(heatLabel(1)).toBe(HEAT_LABEL_LIGHT);
    expect(contrast(heatLabel(0), heatFill(0))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(heatLabel(1), heatFill(1))).toBeGreaterThanOrEqual(4.5);
  });

  it('a label under a circle (dark, on the page) is 4.5:1 or more', () => {
    expect(contrast(HEAT_LABEL_DARK, BG)).toBeGreaterThanOrEqual(4.5);
  });

  it('every mark (outline, ring, branch) is 3:1 or more against the page at every heat', () => {
    for (const h of steps) expect(contrast(heatInk(h), BG), `${h}`).toBeGreaterThanOrEqual(3);
  });

  it('warmer is warmer: the fill darkens toward ember as heat rises', () => {
    const lum = (c: string) => 1 / contrast(c, '#FFFFFF');
    for (let i = 1; i < steps.length; i++) expect(lum(heatFill(steps[i])), `${steps[i]}`).toBeLessThanOrEqual(lum(heatFill(steps[i - 1])) + 1e-9);
    expect(heatFill(0)).not.toBe(heatFill(1));
  });
});

/** Map's night page and cards (dark Map: theme M.bg, M.surface). */
const NIGHT_BG = '#0E1020';
const NIGHT_SURFACE = '#1A1830';
const NIGHT_INK = '#F5F3EE';

describe('night heat colours (dark Map): dim and cool when cold, warm amber when hot, readable at every heat', () => {
  const steps = Array.from({ length: 101 }, (_, i) => i / 100);
  const channels = (c: string) => (c.match(/\d+/g) ?? []).slice(0, 3).map(Number);

  it('a label inside a circle is 4.5:1 or more against its fill at every heat', () => {
    for (const h of steps) expect(contrast(nightHeatLabel(h), nightHeatFill(h)), `${h}`).toBeGreaterThanOrEqual(4.5);
  });

  it('light words on a cold circle, dark words on a hot one', () => {
    expect(nightHeatLabel(0)).toBe(NIGHT_INK);
    expect(nightHeatLabel(1)).toBe(NIGHT_BG);
  });

  it('a label under a circle (light, on the night page) is 4.5:1 or more', () => {
    expect(contrast(NIGHT_INK, NIGHT_BG)).toBeGreaterThanOrEqual(4.5);
  });

  it('every mark (outline, ring, branch, log dot) is 3:1 or more against the night page and cards at every heat', () => {
    for (const h of steps) {
      expect(contrast(nightHeatInk(h), NIGHT_BG), `${h}`).toBeGreaterThanOrEqual(3);
      expect(contrast(nightHeatInk(h), NIGHT_SURFACE), `${h} on a card`).toBeGreaterThanOrEqual(3);
    }
  });

  it('cold is dim and cool (blue at least red), hot is a bright warm amber', () => {
    const [cr, , cb] = channels(nightHeatFill(0));
    expect(cb).toBeGreaterThanOrEqual(cr);
    const [hr, hg, hb] = channels(nightHeatFill(1));
    expect(hr).toBeGreaterThan(hg);
    expect(hg).toBeGreaterThan(hb);
    // Brighter as heat rises (the opposite of the day ramp, which darkens toward ember).
    const lum = (c: string) => 1 / contrast(c, '#000000');
    for (let i = 1; i < steps.length; i++) expect(lum(nightHeatFill(steps[i])), `${steps[i]}`).toBeLessThanOrEqual(lum(nightHeatFill(steps[i - 1])) + 1e-9);
    expect(contrast(nightHeatFill(1), nightHeatFill(0))).toBeGreaterThanOrEqual(3);
    expect(contrast(nightHeatInk(1), nightHeatInk(0))).toBeGreaterThan(1.5);
  });

  it('out-of-range heat is clamped, as by day', () => {
    expect(nightHeatFill(-1)).toBe(nightHeatFill(0));
    expect(nightHeatFill(2)).toBe(nightHeatFill(1));
    expect(nightHeatFill(Number.NaN)).toBe(nightHeatFill(0));
  });
});

describe('night heat colours at the light/dark crossover (dark Map)', () => {
  it('either side of NIGHT_DARK_FROM, the label is 4.5:1 or more on its own fill, and the label changes with the fill', () => {
    for (const h of [0, NIGHT_DARK_FROM - 1e-6, NIGHT_DARK_FROM - 0.001, NIGHT_DARK_FROM, NIGHT_DARK_FROM + 1e-6, 1]) {
      expect(contrast(nightHeatLabel(h), nightHeatFill(h)), `${h}`).toBeGreaterThanOrEqual(4.5);
    }
    expect(nightHeatLabel(NIGHT_DARK_FROM - 1e-6)).toBe(NIGHT_LABEL_LIGHT);
    expect(nightHeatLabel(NIGHT_DARK_FROM)).toBe(NIGHT_LABEL_DARK);
  });

  it('shading off (heat 0): light words on the cold fill, 4.5:1 or more', () => {
    expect(contrast(nightHeatLabel(0), nightHeatFill(0))).toBeGreaterThanOrEqual(4.5);
  });
});
