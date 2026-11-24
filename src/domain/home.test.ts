/** P-74 (B-08, D-15): one home — the sky at rest (faint lines, guiding stars), and what a session is about. */
import { describe, expect, it } from 'vitest';

import { declareThread, logActivity } from './model';
import {
  endsByItself,
  REST_FLOOR,
  REST_MAX,
  REST_WINDOW_DAYS,
  restSky,
  RETURN_BEAT_MS,
  stems,
  Subject,
  subjectHref,
  subjectPlace,
} from './home';
import { skyStars } from './sky';
import { Data, emptyData } from './types';

const NOW = new Date(2026, 10, 24, 12);
const DAY = 864e5;
const ago = (d: number) => new Date(NOW.getTime() - d * DAY);

/** Lines (loose activities) `daysAgo` each, with words; ids l0, l1, … in order. */
function lines(...items: [daysAgo: number, text?: string][]): Data {
  let data = emptyData();
  items.forEach(([d, text = `line ${d}`], i) => {
    const at = ago(d).toISOString();
    data = { ...data, activities: { ...data.activities, [`l${i}`]: { id: `l${i}`, text, occurredAt: at, createdAt: at, toIds: [] } } };
  });
  return data;
}
const ids = (data: Data) => restSky(data, NOW).lines.map((l) => l.id);

describe('restSky: your recent lines as faint, unlabelled stars', () => {
  it('with no lines and no whys the sky is empty', () => {
    expect(restSky(emptyData(), NOW)).toEqual({ lines: [], links: [], guides: [] });
  });

  it('shows the last ~60 days of lines', () => {
    const data = lines(...Array.from({ length: 20 }, (_, i) => [i * 2] as [number]), [REST_WINDOW_DAYS + 5], [REST_WINDOW_DAYS + 40]);
    expect(ids(data)).toHaveLength(20);
    expect(ids(data)).not.toContain('l20');
    expect(ids(data)).not.toContain('l21');
  });

  it('or the last ~12 lines, whichever is more: a quiet spell never empties the sky (never absence)', () => {
    const data = lines(...Array.from({ length: 30 }, (_, i) => [100 + i] as [number]));
    expect(REST_FLOOR).toBe(12);
    // The newest twelve, though all are older than the window.
    expect(ids(data).sort()).toEqual(Array.from({ length: 12 }, (_, i) => `l${i}`).sort());
    // Two in the window and many older: still twelve.
    const mixed = lines([1], [3], ...Array.from({ length: 20 }, (_, i) => [200 + i] as [number]));
    expect(ids(mixed)).toHaveLength(12);
  });

  it('many lines: at most ~80 drawn, the oldest thinned first', () => {
    const data = lines(...Array.from({ length: 200 }, (_, i) => [i * 0.25] as [number]));
    const shown = ids(data);
    expect(REST_MAX).toBe(80);
    expect(shown).toHaveLength(REST_MAX);
    expect(shown).toContain('l0');
    expect(shown).toContain('l79');
    expect(shown).not.toContain('l80');
  });

  it('each star has a fixed place from its id: a new line never moves the others', () => {
    const before = restSky(lines([1], [2], [3]), NOW).lines;
    const after = restSky(lines([1], [2], [3], [0.1]), NOW).lines;
    for (const b of before) expect(after.find((a) => a.id === b.id)).toEqual(b);
    for (const s of after) {
      expect(s.x).toBeGreaterThan(0);
      expect(s.x).toBeLessThan(1);
      expect(s.y).toBeGreaterThan(0);
      expect(s.y).toBeLessThan(0.4);
    }
  });

  it('nothing dims or withers with time away: a star looks the same a month later', () => {
    const data = lines([1], [2]);
    const later = new Date(NOW.getTime() + 30 * DAY);
    expect(restSky(data, later).lines).toEqual(restSky(data, NOW).lines);
  });

  it('faint lines join stars that share a word stem, never unrelated ones', () => {
    const data = lines([5, 'sketched a hand'], [4, 'went for a swim'], [3, 'sketching hands again'], [2, 'tax forms']);
    const { links } = restSky(data, NOW);
    expect(links).toEqual([{ from: 'l0', to: 'l2' }]);
  });

  it('short words and common words never join stars', () => {
    const data = lines([5, 'with the cat'], [4, 'with the dog']);
    expect(restSky(data, NOW).links).toEqual([]);
  });

  it('each star joins at most one earlier one, so lines never knot', () => {
    const data = lines([5, 'drawing'], [4, 'drawing'], [3, 'drawing'], [2, 'drawing']);
    expect(restSky(data, NOW).links).toHaveLength(3);
  });
});

describe('restSky: whys as guiding stars', () => {
  it('the sky’s whys, each in a fixed place from its id, high in the sky', () => {
    let data = lines([1, 'sketched']);
    data = { ...data, threads: { calm: { id: 'calm', name: 'a calm space', hidden: false, createdAt: ago(100).toISOString() } } };
    const r = declareThread(data, 'calm', ago(10));
    if (!r.ok) throw new Error('declare');
    data = logActivity(r.data, { text: 'sat', toIds: ['calm'], occurredAt: ago(2) }, ago(2)).data;
    const { guides } = restSky(data, NOW);
    expect(guides.map((g) => g.id)).toEqual(skyStars(data, { now: NOW }).map((s) => s.thread.id));
    expect(guides[0].y).toBeLessThan(0.2);
    expect(restSky(data, new Date(NOW.getTime() + 20 * DAY)).guides[0]).toEqual(guides[0]);
  });
});

describe('stems', () => {
  it('folds simple endings and drops short and common words', () => {
    expect(stems('Sketched hands, sketching HAND')).toEqual(['sketch', 'hand']);
    expect(stems('with that from this')).toEqual([]);
  });
});

describe('sessions: what a session over the home is about', () => {
  it('each subject has its place (for the camera) and its link', () => {
    const cases: [Subject, string, string][] = [
      [{ kind: 'whys' }, 'sky', '/sky'],
      [{ kind: 'why', id: 'a b' }, 'star', '/star/a%20b'],
      [{ kind: 'wander', id: 'x' }, 'trail', '/trail/x'],
      [{ kind: 'wander', id: 'x', star: 'a b' }, 'trail', '/trail/x?star=a%20b'],
      // P-73: a line just sent up rises over the sky.
      [{ kind: 'line', activityId: 'l 1' }, 'sky', '/line/l%201'],
    ];
    for (const [s, place, href] of cases) {
      expect(subjectPlace(s)).toBe(place);
      expect(subjectHref(s)).toBe(href);
    }
  });

  it('a session ends by itself after a choice, but waits under a screen reader', () => {
    // Native: unless a screen reader is on.
    expect(endsByItself({ web: false, screenReader: false })).toBe(true);
    expect(endsByItself({ web: false, screenReader: true })).toBe(false);
    // Web can't tell, so only a pointer's choice ends it; a keyboard's or assistive tech's waits for you to leave.
    expect(endsByItself({ web: true, screenReader: false, input: 'pointer' })).toBe(true);
    expect(endsByItself({ web: true, screenReader: false, input: 'keyboard' })).toBe(false);
    expect(endsByItself({ web: true, screenReader: false })).toBe(false);
  });

  it('after a short beat (time to see Undo first)', () => {
    expect(RETURN_BEAT_MS).toBeGreaterThanOrEqual(1000);
    expect(RETURN_BEAT_MS).toBeLessThanOrEqual(3000);
  });
});
