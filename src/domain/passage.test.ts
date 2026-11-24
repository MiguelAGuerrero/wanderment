/** P-72: transitions that move through the picture — which one for which pair of screens, how long, and Reduce Motion. */
import { describe, expect, it } from 'vitest';

import { motionFor, Passage, PASSAGE_MAX_MS, passageFor, Place, PLACES, REST, STILL } from './passage';

const go = (from: Place | undefined, to: Place, reduce = false) => passageFor(from, to, { reduce });
const pairs = PLACES.flatMap((a) => PLACES.filter((b) => b !== a).map((b) => [a, b] as const));

describe('passageFor: which transition', () => {
  it('looking up (trailhead → sky) is look-up; going back reverses it', () => {
    expect(go('trailhead', 'sky')).toMatchObject({ kind: 'look-up', reverse: false });
    expect(go('sky', 'trailhead')).toMatchObject({ kind: 'look-up', reverse: true });
  });

  it('a star (from the sky, or straight from the trailhead) is landmarks rising; back reverses it', () => {
    expect(go('sky', 'star')).toMatchObject({ kind: 'landmarks', reverse: false });
    expect(go('trailhead', 'star')).toMatchObject({ kind: 'landmarks', reverse: false });
    expect(go('star', 'sky')).toMatchObject({ kind: 'landmarks', reverse: true });
    expect(go('star', 'trailhead')).toMatchObject({ kind: 'landmarks', reverse: true });
  });

  it('a trail (from a star, the sky or the trailhead) is the wanderer walking up; back reverses it', () => {
    for (const from of ['star', 'sky', 'trailhead'] as const) {
      expect(go(from, 'trail')).toMatchObject({ kind: 'walk-up', reverse: false });
      expect(go('trail', from)).toMatchObject({ kind: 'walk-up', reverse: true });
    }
  });

  it('Map dims in like dusk from anywhere; leaving it reverses it', () => {
    for (const from of ['trailhead', 'sky', 'star', 'trail'] as const) {
      expect(go(from, 'map')).toMatchObject({ kind: 'dusk', reverse: false });
      expect(go('map', from)).toMatchObject({ kind: 'dusk', reverse: true });
    }
  });

  it('every way there and back is the same transition, reversed', () => {
    for (const [a, b] of pairs) {
      const there = go(a, b);
      const back = go(b, a);
      expect(back.kind, `${a} ⇄ ${b}`).toBe(there.kind);
      expect(back.reverse, `${a} ⇄ ${b}`).toBe(!there.reverse);
    }
  });

  it('nothing moves on the first screen opened, or staying on the same place', () => {
    for (const p of PLACES) {
      expect(go(undefined, p)).toEqual(STILL);
      expect(go(p, p)).toEqual(STILL);
    }
  });
});

describe('passageFor: durations', () => {
  it('each is short: at most ~600 ms, and more than nothing when it moves', () => {
    expect(PASSAGE_MAX_MS).toBeLessThanOrEqual(600);
    for (const [a, b] of pairs) {
      const t = go(a, b);
      expect(t.ms, `${a} → ${b}`).toBeGreaterThan(0);
      expect(t.ms, `${a} → ${b}`).toBeLessThanOrEqual(PASSAGE_MAX_MS);
    }
  });

  it('going back is no slower than going forward', () => {
    for (const [a, b] of pairs) {
      const t = go(a, b);
      if (t.reverse) expect(t.ms).toBeLessThanOrEqual(go(b, a).ms);
    }
  });
});

describe('Reduce Motion', () => {
  it('stills every transition: none, zero length, the picture at rest', () => {
    for (const [a, b] of pairs) {
      const t = go(a, b, true);
      expect(t, `${a} → ${b}`).toEqual(STILL);
      expect(motionFor(t, b)).toEqual(REST);
    }
  });
});

describe('motionFor: where the picture starts (it always ends at rest)', () => {
  const m = (from: Place, to: Place) => motionFor(go(from, to), to);

  it('looking up sinks the hills (they start above their place) and fades the stars in', () => {
    expect(m('trailhead', 'sky').hills).toBeLessThan(0);
    expect(m('trailhead', 'sky').stars).toBeLessThan(1);
  });

  it('looking back down raises the hills (they start below their place)', () => {
    expect(m('sky', 'trailhead').hills).toBeGreaterThan(0);
  });

  it('under a star the landmarks rise and the wanderer walks to camp', () => {
    expect(m('sky', 'star').scene).toBeGreaterThan(0);
    expect(m('sky', 'star').walk).toBe('to-camp');
  });

  it('on a trail the wanderer walks up the path; back under the star, down to camp', () => {
    expect(m('star', 'trail').walk).toBe('up');
    expect(m('trail', 'star').walk).toBe('back-to-camp');
  });

  it('back to the sky from a star or a trail, the hills come back up and the stars brighten', () => {
    for (const from of ['star', 'trail'] as const) {
      expect(m(from, 'sky').hills).toBeGreaterThan(0);
      expect(m(from, 'sky').stars).toBeLessThan(1);
    }
  });

  it('Map dims in under a dusk veil; leaving it, the night lifts', () => {
    expect(m('trailhead', 'map').veil).toMatchObject({ tone: 'dusk' });
    expect(m('map', 'trailhead').veil).toMatchObject({ tone: 'night' });
  });

  it('the lantern never moves (it would cross what stands above it): it only fades', () => {
    for (const [a, b] of pairs) expect(Object.keys(m(a, b))).not.toContain('lantern');
  });

  it('starting values are sane: opacities within 0–1, offsets small, no veil darker than 0.6', () => {
    for (const [a, b] of pairs) {
      const x = m(a, b);
      for (const o of [x.stars, x.lamp]) expect(o >= 0 && o <= 1, `${a} → ${b}`).toBe(true);
      for (const d of [x.hills, x.scene]) expect(Math.abs(d)).toBeLessThanOrEqual(60);
      if (x.veil) expect(x.veil.from).toBeLessThanOrEqual(0.6);
    }
  });

  it('a still transition is the picture at rest', () => {
    expect(motionFor(STILL as Passage, 'sky')).toEqual(REST);
  });
});
