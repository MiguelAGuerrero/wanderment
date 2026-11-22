/** P-36: the first run, 1-2-3 (B-04 refinement 6). */
import { describe, expect, it } from 'vitest';

import { firstRunStep, isEmptyApp, STEP_EXAMPLE, WHY_EXAMPLES } from './firstRun';
import { ensureThread, logActivity, updateThread } from './model';
import { emptyData } from './types';

describe('the first run', () => {
  it('① shows only on an empty app (no activities, no wanders — hidden ones count), until it’s over', () => {
    const empty = emptyData();
    expect(isEmptyApp(empty)).toBe(true);
    expect(firstRunStep(empty, false)).toEqual({ step: 1 });
    expect(firstRunStep(empty, true)).toBeUndefined();

    const logged = logActivity(empty, { text: 'stretched', toIds: [] }).data;
    expect(firstRunStep(logged, false)).toBeUndefined();

    const { data: withWander, thread } = ensureThread(empty, 'draw');
    expect(firstRunStep(withWander, false)).toBeUndefined();
    expect(firstRunStep(updateThread(withWander, thread.id, { hidden: true }), false)).toBeUndefined();
  });

  it('② and ③ last while their why is there and nothing is logged; a log ends them', () => {
    const { data, thread } = ensureThread(emptyData(), 'feel calmer');
    // Over for good once ① was answered: ② and ③ are this session's.
    expect(firstRunStep(data, true, { step: 2, why: thread.id })).toEqual({ step: 2, why: thread.id });
    expect(firstRunStep(data, true, { step: 3, why: thread.id })).toEqual({ step: 3, why: thread.id });
    const logged = logActivity(data, { text: 'read a book', doingId: thread.id, toIds: [] }).data;
    expect(firstRunStep(logged, true, { step: 3, why: thread.id })).toBeUndefined();
    expect(firstRunStep(emptyData(), true, { step: 2, why: thread.id })).toBeUndefined();
  });

  it('its examples are feelings and reasons in plain words: no targets, dates, numbers or “goal”', () => {
    expect(WHY_EXAMPLES).toEqual(['feel productive', 'feel calmer', 'be a better drawer']);
    expect(STEP_EXAMPLE).toBe('read a book');
    for (const e of [...WHY_EXAMPLES, STEP_EXAMPLE]) expect(e).not.toMatch(/\d|goal|target|by |daily|week|month|day/i);
  });
});
