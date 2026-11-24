/**
 * P-72: transitions that move through the picture. Moving between the trailhead, the sky, a star, a
 * trail and Map is moving through one night: looking up sinks the hills and fades the stars in; under
 * a star the landmarks rise and the wanderer walks to camp; on a trail the wanderer walks up the path;
 * going back reverses it; Map dims in like dusk. The screen you arrive on plays it (it's interactive at
 * once: only decorative layers move, by transform and opacity, so nothing jumps). Under Reduce Motion
 * nothing moves. Pure: which transition for which pair, how long, and where the picture starts.
 */

export type Place = 'trailhead' | 'sky' | 'star' | 'trail' | 'map';
export const PLACES: readonly Place[] = ['trailhead', 'sky', 'star', 'trail', 'map'];
export type PassageKind = 'look-up' | 'landmarks' | 'walk-up' | 'dusk' | 'none';
export type Passage = { kind: PassageKind; reverse: boolean; ms: number };

/** The longest any transition runs. */
export const PASSAGE_MAX_MS = 600;
const FORWARD_MS = 600;
const BACK_MS = 450;
const DUSK_MS = 500;
const DAWN_MS = 400;

/** No transition: the first screen opened, the same place again, or Reduce Motion. */
export const STILL: Passage = { kind: 'none', reverse: false, ms: 0 };

/** How far up the night each place is: going deeper is forward, coming back is the reverse. */
const DEPTH: Record<Place, number> = { trailhead: 0, sky: 1, map: 1, star: 2, trail: 3 };
/** The transition that belongs to the deeper place of a pair. */
const KIND: Record<Exclude<Place, 'map'>, PassageKind> = { trailhead: 'none', sky: 'look-up', star: 'landmarks', trail: 'walk-up' };

export function passageFor(from: Place | undefined, to: Place, { reduce }: { reduce: boolean }): Passage {
  if (reduce || !from || from === to) return STILL;
  if (to === 'map' || from === 'map') {
    const reverse = from === 'map';
    return { kind: 'dusk', reverse, ms: reverse ? DAWN_MS : DUSK_MS };
  }
  const reverse = DEPTH[to] < DEPTH[from];
  const deeper = reverse ? from : to;
  return { kind: KIND[deeper], reverse, ms: reverse ? BACK_MS : FORWARD_MS };
}

/**
 * Where the picture starts on the screen arrived at; it always ends at `REST`. Only decorative layers
 * move: the hills (px, + below their place, − above), the lantern's and the stars' opacity, the
 * landmarks under a star (px below their place), a walk of the wanderer, and a veil over the screen.
 * The lantern only fades (moved, it would cross what stands just above it).
 */
export type Walk = 'up' | 'to-camp' | 'back-to-camp';
export type Motion = {
  hills: number;
  lamp: number;
  stars: number;
  scene: number;
  walk?: Walk;
  veil?: { tone: 'dusk' | 'night'; from: number };
};
export const REST: Motion = { hills: 0, lamp: 1, stars: 1, scene: 0 };

/** Coming back up to the sky or the trailhead from deeper in: the hills come back up, the stars brighten. */
const SURFACE: Motion = { ...REST, hills: 48, lamp: 0, stars: 0.35 };

export function motionFor(p: Passage, to: Place): Motion {
  switch (p.kind) {
    case 'none':
      return REST;
    case 'dusk':
      return p.reverse ? { ...REST, veil: { tone: 'night', from: 0.6 } } : { ...REST, veil: { tone: 'dusk', from: 0.55 } };
    case 'look-up':
      return p.reverse ? { ...REST, hills: 48, lamp: 0 } : { ...REST, hills: -40, lamp: 0, stars: 0 };
    case 'landmarks':
      return p.reverse ? SURFACE : { ...REST, scene: 36, stars: 0.5, walk: 'to-camp' };
    case 'walk-up':
      if (!p.reverse) return { ...REST, walk: 'up' };
      return to === 'star' ? { ...REST, walk: 'back-to-camp' } : SURFACE;
  }
}
