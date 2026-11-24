/** P-66 (B-07 slice 2): look up (whys as stars) and under a star (its wanders as landmarks and trails). */
import { describe, expect, it } from 'vitest';

import { declareThread, logActivity, updateThread } from './model';
import {
  footprintName,
  FOOTPRINTS_MAX,
  footprints,
  landmarkName,
  LABEL_H,
  landmarks,
  LANDMARKS_MAX,
  moteCount,
  MOTES_MAX,
  SKY_LOOSE_MAX,
  SKY_MAX,
  skyAsList,
  skyLoose,
  skyStars,
  STAR_SLOTS,
  starName,
  starPlaces,
  starScene,
  starTarget,
  starTint,
  walkedWords,
} from './sky';
import { Data, emptyData, Id } from './types';

// A Monday, midday local time (the words go by calendar days where you are).
const NOW = new Date(2026, 10, 23, 12);
const day = (n: number) => new Date(NOW.getTime() - n * 864e5);

function make(...names: string[]) {
  const data: Data = emptyData();
  names.forEach((n, i) => (data.threads[n] = { id: n, name: n, hidden: false, createdAt: day(300 - i).toISOString() }));
  return data;
}
const feed = (data: Data, from: Id | undefined, to: Id[], daysAgo: number, text = 'x', note?: string) =>
  logActivity(data, { text, doingId: from, toIds: to, occurredAt: day(daysAgo), note }, day(daysAgo)).data;
const declare = (data: Data, id: Id, daysAgo: number) => {
  const r = declareThread(data, id, day(daysAgo));
  if (!r.ok) throw new Error('full');
  return r.data;
};
const stars = (data: Data, shading = true) => skyStars(data, { now: NOW, shading });

/** "illustrate" earned (three links in from "hands"), "calm" and "abuela" declared. */
function world() {
  let data = make('illustrate', 'hands', 'calm', 'abuela', 'color');
  data = declare(data, 'abuela', 40);
  data = declare(data, 'calm', 60);
  for (const d of [30, 20, 1]) data = feed(data, 'hands', ['illustrate'], d);
  data = feed(data, 'color', ['illustrate'], 5);
  data = feed(data, undefined, ['abuela'], 50);
  return data;
}

describe('skyStars: the whys, in a fixed order, each with its warmth and motes', () => {
  it('declared whys first (oldest mark first), then earned ones; never a plain wander or a hidden one', () => {
    const data = world();
    expect(stars(data).map((s) => s.thread.id)).toEqual(['calm', 'abuela', 'illustrate']);
    expect(stars(data).map((s) => s.declared)).toEqual([true, true, false]);
    const hidden = updateThread(data, 'calm', { hidden: true });
    expect(stars(hidden).map((s) => s.thread.id)).toEqual(['abuela', 'illustrate']);
  });

  it('the order never follows heat or recency: walking one star warms it but moves nothing', () => {
    const before = stars(world());
    const after = stars(feed(world(), undefined, ['abuela'], 0));
    expect(after.map((s) => s.thread.id)).toEqual(before.map((s) => s.thread.id));
    expect(after.map((s) => s.slot)).toEqual(before.map((s) => s.slot));
    expect(after.find((s) => s.thread.id === 'abuela')!.heat).toBeGreaterThan(before.find((s) => s.thread.id === 'abuela')!.heat);
  });

  it('shows at most SKY_MAX stars', () => {
    let data = make(...Array.from({ length: 12 }, (_, i) => `why ${i}`), 'src');
    for (let i = 0; i < 3; i++) data = declare(data, `why ${i}`, 10 + i);
    for (let i = 3; i < 12; i++) for (const d of [3, 2, 1]) data = feed(data, 'src', [`why ${i}`], d);
    expect(stars(data).length).toBeLessThanOrEqual(SKY_MAX);
    expect(stars(data).slice(0, 3).every((s) => s.declared)).toBe(true);
  });

  it('heat is the latest walk on the star or anything feeding it; motes follow it, and shading off takes both away', () => {
    const s = stars(world());
    const illustrate = s.find((x) => x.thread.id === 'illustrate')!;
    expect(illustrate.walked).toBe(day(1).toISOString());
    expect(illustrate.motes).toBe(moteCount(illustrate.heat));
    expect(illustrate.motes).toBeGreaterThan(0);
    // Fix 15: a mote floor — even a never-walked star has one (was 0).
    expect(s.find((x) => x.thread.id === 'calm')!.motes).toBe(1);
    const off = stars(world(), false);
    expect(off.map((x) => [x.heat, x.motes])).toEqual(off.map(() => [0, 0]));
    // "last walked" is a date, not warmth: still said with the shading off.
    expect(off.find((x) => x.thread.id === 'illustrate')!.walked).toBe(day(1).toISOString());
  });

  it('a screen reader hears the name and when it was last walked, in words', () => {
    const s = stars(world());
    expect(starName(s.find((x) => x.thread.id === 'illustrate')!, NOW)).toBe('illustrate, last walked yesterday');
    expect(starName(s.find((x) => x.thread.id === 'calm')!, NOW)).toBe('calm, not walked yet');
  });
});

describe('moteCount: relative to heat, at least one, never more than MOTES_MAX', () => {
  it('max(1, round(heat × 8)), clamped (fix 15: a floor of one mote; shading off is skyStars’ zero)', () => {
    expect(moteCount(0)).toBe(1);
    expect(moteCount(1)).toBe(MOTES_MAX);
    expect(moteCount(0.5)).toBe(4);
    expect(moteCount(0.04)).toBe(1);
    expect(moteCount(0.07)).toBe(1);
    expect(moteCount(0.2)).toBe(2);
    expect(moteCount(3)).toBe(MOTES_MAX);
    expect(moteCount(-1)).toBe(1);
    expect(moteCount(NaN)).toBe(1);
  });
});

describe('starTint: silver when cold (or shading off), amber when warm', () => {
  it('moves from silver to amber with heat', () => {
    expect(starTint(0).fill).toBe('rgb(233, 236, 250)');
    expect(starTint(1).fill).toBe('rgb(255, 231, 211)');
    expect(starTint(0).glow).not.toBe(starTint(1).glow);
  });
});

describe('starPlaces: fixed places from the ids, never from heat; never overlapping', () => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `why-${i}`, createdAt: day(100 - i).toISOString() }));

  it('the same whys always get the same places, whatever order they come in', () => {
    const a = starPlaces(ids(6));
    const b = starPlaces([...ids(6)].reverse());
    expect(b).toEqual(a);
    expect(starPlaces(ids(6))).toEqual(a);
  });

  it('each why takes its own slot (up to the number of slots)', () => {
    for (const n of [1, 2, 3, 6]) {
      const p = starPlaces(ids(n));
      expect(new Set(Object.values(p)).size).toBe(n);
      for (const v of Object.values(p)) expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it('a star keeps its place when a newer why joins', () => {
    const before = starPlaces(ids(3));
    const after = starPlaces(ids(4));
    for (const [id, slot] of Object.entries(before)) expect(after[id]).toBe(slot);
  });

  it('no two slots overlap: a star and its two-line name (42 % of the width, 92 pt tall) fit anywhere from 195 to 640 wide', () => {
    for (const width of [195, 390, 640]) {
      const w = Math.min(150, width * 0.42);
      const band = 440;
      for (let i = 0; i < STAR_SLOTS.length; i++)
        for (let j = i + 1; j < STAR_SLOTS.length; j++) {
          const [xi, yi] = STAR_SLOTS[i];
          const [xj, yj] = STAR_SLOTS[j];
          const apartX = Math.abs(xi - xj) * width >= w;
          const apartY = Math.abs(yi - yj) * (band - 92) >= 92;
          expect(apartX || apartY, `slots ${i} and ${j} at ${width}`).toBe(true);
        }
      for (const [x] of STAR_SLOTS) {
        expect(x * width - w / 2).toBeGreaterThanOrEqual(0);
        expect(x * width + w / 2).toBeLessThanOrEqual(width);
      }
    }
  });

  it('placements come from the whys alone: heat, shading and new activity change no place', () => {
    const data = world();
    const warm = stars(feed(data, 'hands', ['illustrate'], 0));
    const cold = stars(data, false);
    expect(warm.map((s) => [s.thread.id, s.slot])).toEqual(cold.map((s) => [s.thread.id, s.slot]));
  });
});

describe('landmarks: the wanders feeding a why, the one walked lately warm', () => {
  it('direct feeders (doing → to), in the order they were made (fix 7; here also the most recently walked first); the walked-lately one is warm; each with its step and its latest note', () => {
    let data = world();
    data = updateThread(data, 'hands', { next: 'Sketch hands from photo refs' });
    data = feed(data, 'hands', [], 0.5, 'sketched', 'did 10 from the ref sheet');
    const { shown, more } = landmarks(data, 'illustrate', { now: NOW });
    expect(shown.map((l) => l.thread.id)).toEqual(['hands', 'color']);
    expect(shown.map((l) => l.warm)).toEqual([true, false]);
    expect(shown[0].step).toBe('Sketch hands from photo refs');
    expect(shown[0].note).toBe('did 10 from the ref sheet');
    expect(shown[1].step).toBeUndefined();
    expect(more).toEqual([]);
  });

  it('nothing is warm with the shading off', () => {
    const { shown } = landmarks(world(), 'illustrate', { now: NOW, shading: false });
    expect(shown.some((l) => l.warm)).toBe(false);
  });

  it('beyond LANDMARKS_MAX the rest go to "More wanders…", in the same order; hidden wanders never show', () => {
    let data = make('why', 'a', 'b', 'c', 'd', 'e');
    ['a', 'b', 'c', 'd', 'e'].forEach((w, i) => (data = feed(data, w, ['why'], i + 1)));
    data = updateThread(data, 'c', { hidden: true });
    const { shown, more } = landmarks(data, 'why', { now: NOW });
    expect(shown.length).toBe(LANDMARKS_MAX);
    expect(shown.map((l) => l.thread.id)).toEqual(['a', 'b', 'd']);
    expect(more.map((l) => l.thread.id)).toEqual(['e']);
  });

  it('a "to" log with no doing wander and the why itself are not landmarks', () => {
    let data = make('why', 'a');
    data = feed(data, undefined, ['why'], 1);
    data = feed(data, 'why', ['why'], 1);
    data = feed(data, 'a', ['why'], 2);
    expect(landmarks(data, 'why', { now: NOW }).shown.map((l) => l.thread.id)).toEqual(['a']);
  });
});

describe('starTarget: a why with one wander opens its trail', () => {
  it('two or more wanders: the star; one: that wander’s trail; none: the why’s own trail', () => {
    const data = world();
    expect(starTarget(data, 'illustrate')).toBe('/star/illustrate');
    let one = make('why', 'a');
    one = feed(one, 'a', ['why'], 1);
    expect(starTarget(one, 'why')).toBe('/trail/a?star=why');
    expect(starTarget(data, 'calm')).toBe('/trail/calm');
  });

  it('a hidden feeder does not count', () => {
    let data = make('why', 'a', 'b');
    data = feed(data, 'a', ['why'], 1);
    data = feed(data, 'b', ['why'], 2);
    expect(starTarget(data, 'why')).toBe('/star/why');
    expect(starTarget(updateThread(data, 'b', { hidden: true }), 'why')).toBe('/trail/a?star=why');
  });
});

describe('walkedWords: when, in words (no counts)', () => {
  it('today, yesterday, a weekday, last week, a few weeks ago, then the month', () => {
    expect(walkedWords(day(0).toISOString(), NOW)).toBe('today');
    expect(walkedWords(day(1).toISOString(), NOW)).toBe('yesterday');
    expect(walkedWords(day(2).toISOString(), NOW)).toBe('on Saturday');
    expect(walkedWords(day(6).toISOString(), NOW)).toBe('on Tuesday');
    expect(walkedWords(day(8).toISOString(), NOW)).toBe('last week');
    expect(walkedWords(day(20).toISOString(), NOW)).toBe('a few weeks ago');
    expect(walkedWords(new Date(2026, 2, 3).toISOString(), NOW)).toBe('in March');
    expect(walkedWords(new Date(2025, 11, 3).toISOString(), NOW)).toBe('in December 2025');
    expect(walkedWords(new Date(2026, 10, 24).toISOString(), NOW)).toBe('today');
  });

  it('goes by calendar days: late last night is yesterday', () => {
    const lateLastNight = new Date(2026, 10, 22, 23, 30);
    const early = new Date(2026, 10, 23, 0, 30);
    expect(walkedWords(lateLastNight.toISOString(), early)).toBe('yesterday');
  });

  it('never a digit within the last month', () => {
    for (let d = 0; d < 28; d++) expect(walkedWords(day(d).toISOString(), NOW)).not.toMatch(/\d/);
  });
});

describe('footprints: the wander’s latest activities, as dated words', () => {
  it('newest first, at most FOOTPRINTS_MAX, words and when', () => {
    let data = make('hands');
    for (let i = 0; i < 8; i++) data = feed(data, 'hands', [], i + 1, `step ${i}`);
    const f = footprints(data, 'hands', NOW);
    expect(f.length).toBe(FOOTPRINTS_MAX);
    expect(f[0]).toMatchObject({ text: 'step 0', when: 'yesterday' });
    expect(f.map((x) => x.text)).toEqual(['step 0', 'step 1', 'step 2', 'step 3', 'step 4']);
  });
});

describe('starScene: flags on the ridge, labels above them and clear of every trail', () => {
  for (const width of [195, 320, 390, 640])
    for (const n of [1, 2, 3])
      it(`${n} landmark(s) at ${width} wide`, () => {
        const sc = starScene(n, width);
        expect(sc.flags.length).toBe(n);
        expect(sc.labels.length).toBe(n);
        expect(sc.trails.length).toBe(n);
        const trailTop = Math.min(...sc.trails.flatMap((t) => t.points.map(([, y]) => y)));
        sc.labels.forEach((l, i) => {
          expect(l.h).toBe(LABEL_H);
          // Above the trails (a bezier stays inside its control points' hull), and above its flag.
          expect(l.y + l.h).toBeLessThan(trailTop);
          expect(l.y + l.h).toBeLessThan(sc.flags[i].y - 12);
          expect(l.y).toBeGreaterThanOrEqual(0);
          expect(l.x).toBeGreaterThanOrEqual(0);
          expect(l.x + l.w).toBeLessThanOrEqual(width);
          for (let j = i + 1; j < sc.labels.length; j++) {
            const m = sc.labels[j];
            const overlap = l.x < m.x + m.w && m.x < l.x + l.w && l.y < m.y + m.h && m.y < l.y + l.h;
            expect(overlap, `labels ${i} and ${j}`).toBe(false);
          }
        });
        // Every trail starts at camp and ends at its flag.
        sc.trails.forEach((t, i) => {
          expect(t.points[0]).toEqual([sc.camp.x, sc.camp.y]);
          expect(t.points.at(-1)).toEqual([sc.flags[i].x, sc.flags[i].y]);
        });
      });
});

describe('landmarks in a fixed order (P-66 fix 7): by when the wander was made, then name — never by recency', () => {
  it('walking one warms it and moves nothing', () => {
    let data = make('why', 'old', 'mid', 'new');
    data = feed(data, 'new', ['why'], 0);
    data = feed(data, 'mid', ['why'], 5);
    data = feed(data, 'old', ['why'], 10);
    const before = landmarks(data, 'why', { now: NOW });
    expect(before.shown.map((l) => l.thread.id)).toEqual(['old', 'mid', 'new']);
    expect(before.shown.map((l) => l.warm)).toEqual([false, false, true]);
    // Walk the oldest today (later than "new"): it's warm now, and the order is the same.
    data = feed(data, 'old', ['why'], 0, 'again');
    const after = landmarks(data, 'why', { now: new Date(NOW.getTime() + 1000) });
    expect(after.shown.map((l) => l.thread.id)).toEqual(['old', 'mid', 'new']);
    expect(after.shown.map((l) => l.warm)).toEqual([true, false, false]);
  });

  it('made at the same time: by name; the warm one can sit under More wanders…', () => {
    let data = make('why');
    for (const n of ['d', 'c', 'b', 'a']) data.threads[n] = { id: n, name: n, hidden: false, createdAt: day(100).toISOString() };
    data = feed(data, 'd', ['why'], 0);
    for (const n of ['a', 'b', 'c']) data = feed(data, n, ['why'], 9);
    const { shown, more } = landmarks(data, 'why', { now: NOW });
    expect(shown.map((l) => l.thread.id)).toEqual(['a', 'b', 'c']);
    expect(more.map((l) => [l.thread.id, l.warm])).toEqual([['d', true]]);
  });

  it('“More wanders…” only beyond LANDMARKS_MAX (fix 10): exactly three leaves nothing more', () => {
    let data = make('why', 'a', 'b', 'c');
    ['a', 'b', 'c'].forEach((w, i) => (data = feed(data, w, ['why'], i + 1)));
    expect(landmarks(data, 'why', { now: NOW }).more).toEqual([]);
  });
});

describe('landmarkName (fixes 7, 8, 14): what a card under a star says to a screen reader', () => {
  it('the wander, its step (or "Add a next step"), the note, and when it was last walked — commas, no "·"', () => {
    let data = make('why', 'hands', 'folio');
    data = updateThread(data, 'hands', { next: 'Sketch hands' });
    data = feed(data, 'hands', ['why'], 0, 'sketched', 'did ten');
    data = feed(data, 'folio', ['why'], 8);
    const [hands, folio] = landmarks(data, 'why', { now: NOW }).shown;
    expect(landmarkName(hands, NOW)).toBe('hands: Sketch hands, “did ten”, last walked today');
    expect(landmarkName(folio, NOW)).toBe('folio: Add a next step, last walked last week');
  });
});

describe('footprintName (fix 14): a footprint is spoken with a comma, not "·"', () => {
  it('words, then when', () => {
    expect(footprintName({ text: 'sketched a hand', when: 'today' })).toBe('sketched a hand, today');
  });
});

describe('skyAsList (fix 13): at the largest text sizes the sky is a plain list', () => {
  it('from BIG_TEXT up', () => {
    expect(skyAsList(1)).toBe(false);
    expect(skyAsList(1.3)).toBe(false);
    expect(skyAsList(1.5)).toBe(true);
    expect(skyAsList(2)).toBe(true);
  });
});

describe('skyLoose (fix 18): your recent loose lines, as stray footprints on the sky', () => {
  it('the last three weeks’ lines that name no wander, newest first, at most SKY_LOOSE_MAX, each with when in words', () => {
    let data = make('draw');
    data = feed(data, undefined, [], 1, 'old one');
    data = feed(data, undefined, [], 30, 'too old');
    data = feed(data, 'draw', [], 0, 'attached');
    for (const [d, t] of [[0, 'today line'], [2, 'saturday line'], [8, 'last week line']] as const) data = feed(data, undefined, [], d, t);
    const loose = skyLoose(data, NOW);
    expect(SKY_LOOSE_MAX).toBe(3);
    expect(loose.map((l) => [l.text, l.when])).toEqual([
      ['today line', 'today'],
      ['old one', 'yesterday'],
      ['saturday line', 'on Saturday'],
    ]);
  });

  it('nothing loose: nothing on the sky', () => {
    expect(skyLoose(make('a'), NOW)).toEqual([]);
  });
});

describe('P-73: a loose line on the sky says when it’s still lit (the state is in its spoken name)', () => {
  it('a lit line that still looks lit says “lit”; settled ones don’t (a month on it looks settled: rise.test.ts)', () => {
    let data = make('draw');
    data = logActivity(data, { text: 'old pursuit', lit: true }, new Date(NOW.getTime() - 20 * 864e5)).data;
    data = logActivity(data, { text: 'sketch hands', lit: true }, new Date(NOW.getTime() - 864e5)).data;
    data = logActivity(data, { text: 'ran' }, NOW).data;
    const loose = skyLoose(data, NOW);
    expect(loose.map((l) => [l.text, l.lit])).toEqual([
      ['ran', false],
      ['sketch hands', true],
      ['old pursuit', true],
    ]);
    expect(footprintName(loose[1])).toBe('sketch hands, yesterday, lit');
    expect(footprintName(loose[0])).toBe('ran, today');
  });
});
