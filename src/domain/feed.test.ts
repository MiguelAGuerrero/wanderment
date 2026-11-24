/**
 * P-80 (B-09 slice 2, D-16): the live map at rest — a random few of the last three weeks' lines, drawn
 * once a day (the seed is the local date), each in a place from its id, held while on screen; age in
 * words (and glow), never a count; beyond three weeks a calm sky.
 */
import { describe, expect, it } from 'vitest';

import { dayKey, FEED_DAYS, FEED_MAX, FEED_ROWS, feedLines, feedName, feedPlaces, pickFeed } from './feed';
import { Activity, Data, emptyData } from './types';

const DAY = 864e5;
const NOW = new Date(2026, 10, 24, 15, 0); // local: Tuesday 24 November 2026, 3 pm

function withLines(lines: { id: string; daysAgo: number; text?: string; lit?: boolean; doingId?: string; toIds?: string[]; note?: string }[]): Data {
  const d = emptyData();
  for (const l of lines) {
    const at = new Date(NOW.getTime() - l.daysAgo * DAY).toISOString();
    const a: Activity = { id: l.id, text: l.text ?? `line ${l.id}`, occurredAt: at, createdAt: at, toIds: l.toIds ?? [], ...(l.doingId && { doingId: l.doingId }), ...(l.lit && { lit: true as const }), ...(l.note && { note: l.note }) };
    d.activities[l.id] = a;
  }
  return d;
}
const many = (n: number, step = 1) => withLines(Array.from({ length: n }, (_, i) => ({ id: `a${i}`, daysAgo: i * step })));

describe('pickFeed: a random few of the last three weeks, drawn once a day', () => {
  it('never more than FEED_MAX, all from the last FEED_DAYS days (attached or loose alike)', () => {
    const data = many(40, 1); // 0…39 days ago
    const ids = pickFeed(data, NOW);
    expect(ids).toHaveLength(FEED_MAX);
    for (const id of ids) expect(NOW.getTime() - Date.parse(data.activities[id].occurredAt)).toBeLessThanOrEqual(FEED_DAYS * DAY);
  });

  it('with only a few recent lines, shows them all', () => {
    const data = withLines([
      { id: 'x', daysAgo: 0, doingId: 'draw' },
      { id: 'y', daysAgo: 2, toIds: ['cook'] },
      { id: 'z', daysAgo: 30 },
    ]);
    expect(new Set(pickFeed(data, NOW))).toEqual(new Set(['x', 'y']));
  });

  it('beyond three weeks: a calm sky (nothing)', () => {
    expect(pickFeed(withLines([{ id: 'old', daysAgo: 22 }, { id: 'older', daysAgo: 90 }]), NOW)).toEqual([]);
    expect(pickFeed(emptyData(), NOW)).toEqual([]);
  });

  it('is the same all day (the seed is the local date), and another day draws another few', () => {
    const data = many(21, 1);
    const morning = new Date(2026, 10, 24, 0, 5);
    const night = new Date(2026, 10, 24, 23, 55);
    expect(pickFeed(data, morning)).toEqual(pickFeed(data, night));
    // Over a fortnight of days, the pick isn't always the same set (it's random per day).
    const sets = new Set(Array.from({ length: 14 }, (_, i) => [...pickFeed(data, new Date(2026, 10, 10 + i, 12))].sort().join()));
    expect(sets.size).toBeGreaterThan(1);
  });

  it('is not simply the newest (nothing highlighted, not a recency list)', () => {
    const data = many(21, 1);
    const newest = ['a0', 'a1', 'a2', 'a3', 'a4'];
    const days = Array.from({ length: 14 }, (_, i) => new Date(2026, 10, 10 + i, 12));
    expect(days.some((d) => [...pickFeed(data, d)].sort().join() !== newest.join())).toBe(true);
  });

  it('a new line displaces at most one of the day’s few', () => {
    const data = many(20, 1);
    const before = pickFeed(data, NOW);
    const after = pickFeed({ ...data, activities: { ...data.activities, fresh: { ...data.activities.a0, id: 'fresh' } } }, NOW);
    expect(after.filter((id) => !before.includes(id)).length).toBeLessThanOrEqual(1);
  });

  it('dayKey is the local calendar date', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(dayKey(new Date(2026, 0, 6, 0, 0))).toBe('2026-01-06');
  });
});

describe('feedPlaces: each line’s place comes from its id', () => {
  it('a line keeps its place whatever else is drawn (unless two want the same row)', () => {
    const alone = feedPlaces(['k']);
    const withOthers = feedPlaces(['q', 'k', 'zz']);
    expect(withOthers.k.x).toBe(alone.k.x);
    // The order the ids come in never matters.
    expect(feedPlaces(['zz', 'k', 'q'])).toEqual(withOthers);
  });

  it('every line has its own row (no two labels on one row), inside the rows, x in 0…1', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const places = feedPlaces(ids);
    const rows = ids.map((id) => places[id].row);
    expect(new Set(rows).size).toBe(ids.length);
    for (const id of ids) {
      expect(places[id].row).toBeGreaterThanOrEqual(0);
      expect(places[id].row).toBeLessThan(FEED_ROWS);
      expect(places[id].x).toBeGreaterThanOrEqual(0);
      expect(places[id].x).toBeLessThan(1);
    }
  });
});

describe('feedLines: what is drawn, held while on screen', () => {
  const data = withLines([
    { id: 'p', daysAgo: 0, text: '  sketched   hands ', lit: true },
    { id: 'q', daysAgo: 1, text: 'read on the bus', note: 'chapter 3' },
    { id: 'r', daysAgo: 9, text: 'called mum' },
  ]);

  it('newest first, words tidied, age in words (never a number)', () => {
    const lines = feedLines(data, ['r', 'p', 'q'], NOW);
    expect(lines.map((l) => [l.id, l.text, l.when])).toEqual([
      ['p', 'sketched hands', 'today'],
      ['q', 'read on the bus', 'yesterday'],
      ['r', 'called mum', 'last week'],
    ]);
    for (const l of lines) expect(l.when).not.toMatch(/\d/);
  });

  it('age shows as glow too (warmer when newer); with the shading off there is none', () => {
    const [p, q, r] = feedLines(data, ['p', 'q', 'r'], NOW);
    expect(p.glow).toBeGreaterThan(q.glow);
    expect(q.glow).toBeGreaterThan(r.glow);
    expect(r.glow).toBeGreaterThan(0);
    for (const l of feedLines(data, ['p', 'q', 'r'], NOW, { shading: false })) expect(l.glow).toBe(0);
  });

  it('lit and settled look alike: the same glow for the same age (lit is only known, not drawn)', () => {
    const twins = withLines([
      { id: 'lit', daysAgo: 2, lit: true },
      { id: 'set', daysAgo: 2 },
    ]);
    const [a, b] = feedLines(twins, ['lit', 'set'], NOW);
    expect(a.glow).toBe(b.glow);
    expect([a.lit, b.lit].sort()).toEqual([false, true]);
  });

  it('a held line that’s gone (Undo) is left out, and the others keep their places', () => {
    const held = ['p', 'q', 'r'];
    const before = feedLines(data, held, NOW);
    const { r: _gone, ...rest } = data.activities;
    const after = feedLines({ ...data, activities: rest }, held, NOW);
    expect(after.map((l) => l.id)).toEqual(['p', 'q']);
    for (const l of after) expect(l).toEqual(before.find((b) => b.id === l.id));
  });

  it('its spoken name starts with its words, then when (the “·” shown is a comma)', () => {
    expect(feedName(feedLines(data, ['q'], NOW)[0])).toBe('read on the bus, yesterday');
  });
});
