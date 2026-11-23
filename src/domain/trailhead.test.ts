/** P-65: the trailhead's "Move it?" after a Return — the guess, the options (never overwriting a step) and the moves. */
import { describe, expect, it } from 'vitest';

import { logActivity } from './model';
import { applyMove, guessWander, moveOffer, promptSize } from './trailhead';
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

/** The line just kept by Return: logged loose, as typed. */
function kept(text: string, data = world()) {
  const res = log(data, text, 0);
  return { data: res.data, id: res.activity.id };
}

describe('guessWander (P-61 matching, on the line just kept)', () => {
  it('a past entry with the same words guesses where it went, even though the kept line is newer and loose', () => {
    const { data, id } = kept('cooked dinner');
    expect(guessWander(data, id, RECENT)?.id).toBe('feel productive');
  });

  it('a staged step that the line matches guesses its wander', () => {
    const { data, id } = kept('clean my car');
    expect(guessWander(data, id, RECENT)?.id).toBe('feel productive');
  });

  it('a wander whose name starts with the line guesses it', () => {
    const { data, id } = kept('draw');
    expect(guessWander(data, id, RECENT)?.id).toBe('draw better hands');
  });

  it('falls back to the line’s longer words: “want to sketch hands tonight” guesses draw better hands', () => {
    const { data, id } = kept('want to sketch hands tonight');
    expect(guessWander(data, id, RECENT)?.id).toBe('draw better hands');
  });

  it('no match: no guess; hidden wanders are never guessed', () => {
    expect(guessWander(kept('went for a swim').data, kept('went for a swim').id, RECENT)).toBeUndefined();
    const s = kept('secret stuff');
    expect(guessWander(s.data, s.id, RECENT)).toBeUndefined();
  });

  it('a line that isn’t there (undone, or gone) has no guess', () => {
    expect(guessWander(world(), 'gone', RECENT)).toBeUndefined();
  });
});

describe('moveOffer', () => {
  it('offers Next on the guess only when it has no staged step (never overwrites one)', () => {
    const free = kept('want to sketch hands tonight');
    expect(moveOffer(free.data, free.id, RECENT)).toEqual({ guess: free.data.threads['draw better hands'], canNext: true });
    const staged = kept('cooked dinner');
    expect(moveOffer(staged.data, staged.id, RECENT)).toEqual({ guess: staged.data.threads['feel productive'], canNext: false });
  });

  it('with no guess, only Somewhere else (no guess, no Next)', () => {
    const k = kept('went for a swim');
    expect(moveOffer(k.data, k.id, RECENT)).toEqual({ guess: undefined, canNext: false });
  });
});

describe('applyMove', () => {
  it('toward: the line’s doing wander becomes the one picked; nothing else changes', () => {
    const k = kept('want to sketch hands tonight');
    const res = applyMove(k.data, k.id, { kind: 'toward', threadId: 'draw better hands' })!;
    expect(res.threadId).toBe('draw better hands');
    expect(res.data.activities[k.id]).toEqual({ ...k.data.activities[k.id], doingId: 'draw better hands', toIds: [] });
    expect(res.data.threads).toBe(k.data.threads);
  });

  it('next: the words become the wander’s next step and the loose line goes', () => {
    const k = kept('  want to sketch hands tonight ');
    const res = applyMove(k.data, k.id, { kind: 'next', threadId: 'draw better hands' })!;
    expect(res.data.threads['draw better hands'].next).toBe('want to sketch hands tonight');
    expect(res.data.activities[k.id]).toBeUndefined();
    expect(Object.keys(res.data.activities)).toHaveLength(Object.keys(k.data.activities).length - 1);
  });

  it('next is refused (nothing changes) when the wander already has a step', () => {
    const k = kept('cooked dinner');
    expect(applyMove(k.data, k.id, { kind: 'next', threadId: 'feel productive' })).toBeUndefined();
    expect(k.data.threads['feel productive'].next).toBe('Clean my car');
  });

  it('new: names a wander (or finds it by name) and logs toward it', () => {
    const k = kept('went for a swim');
    const res = applyMove(k.data, k.id, { kind: 'new', name: '  get fit ' })!;
    expect(res.data.threads[res.threadId].name).toBe('get fit');
    expect(res.data.activities[k.id].doingId).toBe(res.threadId);
    const again = applyMove(k.data, k.id, { kind: 'new', name: 'Draw Better Hands' })!;
    expect(again.threadId).toBe('draw better hands');
    expect(applyMove(k.data, k.id, { kind: 'new', name: '   ' })).toBeUndefined();
  });

  it('refuses a line that isn’t there, a wander that isn’t, or a hidden one', () => {
    const k = kept('went for a swim');
    expect(applyMove(k.data, 'gone', { kind: 'toward', threadId: 'draw better hands' })).toBeUndefined();
    expect(applyMove(k.data, k.id, { kind: 'toward', threadId: 'nope' })).toBeUndefined();
    expect(applyMove(k.data, k.id, { kind: 'toward', threadId: 'secret' })).toBeUndefined();
    expect(applyMove(k.data, k.id, { kind: 'next', threadId: 'secret' })).toBeUndefined();
  });
});

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
