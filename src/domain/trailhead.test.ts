/** P-65: the trailhead — its big line, its ground, and "Open <wander>" (P-73 retired "Move it?": see rise.test.ts). */
import { describe, expect, it } from 'vitest';

import { logActivity } from './model';
import { GROUND_H, groundFits, openOffer, promptSize, ROOM_ABOVE } from './trailhead';
import { Data, emptyData, Thread } from './types';

const DAY = 864e5;
const T0 = Date.parse('2026-11-01T12:00:00Z');

function thread(data: Data, name: string, extra: Partial<Thread> = {}): Data {
  const t: Thread = { id: name, name, hidden: false, createdAt: new Date(T0).toISOString(), ...extra };
  return { ...data, threads: { ...data.threads, [name]: t } };
}

function log(data: Data, text: string, daysAgo: number, links: { doingId?: string; toIds?: string[] } = {}) {
  return logActivity(data, { text, ...links, occurredAt: new Date(T0 - daysAgo * DAY) }, new Date(T0 - daysAgo * DAY));
}

/** draw better hands (no step), feel productive (staged "Clean my car"), a hidden wander, a few past logs. */
function world() {
  let d = emptyData();
  d = thread(d, 'draw better hands');
  d = thread(d, 'feel productive', { next: 'Clean my car' });
  d = thread(d, 'secret');
  d = log(d, 'cooked dinner', 4, { toIds: ['feel productive'] }).data;
  d = log(d, 'sketched a hand', 3, { doingId: 'draw better hands' }).data;
  d = log(d, 'secret stuff', 2, { doingId: 'secret' }).data;
  // Hidden after its log (a log toward a hidden wander brings it back).
  return { ...d, threads: { ...d.threads, secret: { ...d.threads.secret, hidden: true } } };
}

const RECENT = ['draw better hands', 'feel productive'];

describe('promptSize (large text keeps the field above the keyboard)', () => {
  it('is 56 on a phone at normal text size', () => {
    expect(promptSize({ width: 390, height: 844, fontScale: 1 })).toBe(56);
  });

  it('steps down as text grows, so the drawn size grows far less than the text setting', () => {
    const big = promptSize({ width: 390, height: 844, fontScale: 2 });
    expect(big * 2).toBeLessThanOrEqual(56 * 1.2);
    expect(big).toBeGreaterThanOrEqual(20);
  });

  it('steps down on short or narrow windows (200 % zoom) and for long lines', () => {
    expect(promptSize({ width: 195, height: 422, fontScale: 1 })).toBeLessThanOrEqual(30);
    expect(promptSize({ width: 390, height: 844, fontScale: 1, chars: 90 })).toBeLessThan(56);
  });
});

describe('groundFits (P-65 fix 1: the ground never sits under the controls)', () => {
  it('a phone-sized window has room for the question above the ground', () => {
    expect(groundFits({ height: 844 })).toBe(true);
    expect(groundFits({ height: 667, insets: 20 })).toBe(true);
  });

  it('a short window (keyboard up) or 200 % zoom draws no ground', () => {
    expect(groundFits({ height: 480 })).toBe(false);
    expect(groundFits({ height: 422 })).toBe(false);
    expect(groundFits({ height: 400 })).toBe(false);
  });

  it('what’s left above the ground is at least ROOM_ABOVE', () => {
    for (let h = 300; h <= 1200; h += 7) if (groundFits({ height: h })) expect(h - GROUND_H).toBeGreaterThanOrEqual(ROOM_ABOVE);
  });
});

describe('promptSize with a smaller top size (P-66 fix 13: the trail’s step steps down like the prompt)', () => {
  it('is the top size on a phone, and steps down as text grows', () => {
    expect(promptSize({ width: 390, height: 844, fontScale: 1, max: 40 })).toBe(40);
    const big = promptSize({ width: 390, height: 844, fontScale: 2, max: 40 });
    expect(big * 2).toBeLessThanOrEqual(40 * 1.2);
    expect(promptSize({ width: 390, height: 844, fontScale: 1, max: 40, chars: 90 })).toBeLessThan(40);
  });
});

describe('openOffer (fix 17: typing can open a trail; it never attaches or logs)', () => {
  it('a wander the words match (P-61’s matching) opens its trail; a why opens its star', () => {
    const w: Data = world();
    const data = { ...w, threads: { ...w.threads, 'feel productive': { ...w.threads['feel productive'], declaredAt: new Date(T0).toISOString() } } };
    expect(openOffer(data, 'dr', RECENT)).toEqual({ threadId: 'draw better hands', name: 'draw better hands', href: '/trail/draw%20better%20hands' });
    expect(openOffer(data, 'feel', RECENT)).toEqual({ threadId: 'feel productive', name: 'feel productive', href: '/star/feel%20productive' });
  });

  it('nothing typed, nothing matched, or a hidden wander: no offer; it changes no data', () => {
    const data = world();
    expect(openOffer(data, '', RECENT)).toBeUndefined();
    expect(openOffer(data, 'zzz', RECENT)).toBeUndefined();
    const before = JSON.stringify(data);
    openOffer(data, 'dr', RECENT);
    expect(JSON.stringify(data)).toBe(before);
  });
});
