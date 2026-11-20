import { describe, expect, it } from 'vitest';

import { fromBackup, toBackup } from './backup';
import { activeMention, removeActiveMention, suggestDoing, suggestThreads } from './compose';
import { attachActivity, ensureThread, logActivity, nextOwner, updateThread } from './model';
import { flowsFrom, homeThreads, lastTimeFor, warmth } from './selectors';
import { Data, emptyData } from './types';

const day = (n: number) => new Date(Date.UTC(2026, 10, 20) - n * 864e5);

function seed() {
  let data: Data = emptyData();
  const drawing = ensureThread(data, 'practice drawing', day(30));
  data = drawing.data;
  const apparel = ensureThread(data, 'make apparel', day(30));
  data = apparel.data;
  return { data, drawing: drawing.thread, apparel: apparel.thread };
}

describe('threads', () => {
  it('reuses a thread with the same name regardless of case and spacing', () => {
    const { data, drawing } = seed();
    expect(ensureThread(data, '  Practice   Drawing ').thread.id).toBe(drawing.id);
  });
});

describe('logging', () => {
  it('requires text', () => {
    expect(() => logActivity(emptyData(), { text: '   ' })).toThrow();
  });

  it('drops a "to" that equals the doing thread and de-duplicates', () => {
    const { data, drawing, apparel } = seed();
    const { activity } = logActivity(data, {
      text: 'gestures',
      doingId: drawing.id,
      toIds: [apparel.id, drawing.id, apparel.id],
    });
    expect(activity.toIds).toEqual([apparel.id]);
  });

  it('clears the next step it came from and unhides touched threads', () => {
    let { data, drawing } = seed();
    data = updateThread(data, drawing.id, { next: 'try 2-minute poses', hidden: true });
    const res = logActivity(data, { text: '90-second poses', doingId: drawing.id, fromNextOf: drawing.id });
    expect(res.data.threads[drawing.id].next).toBeUndefined();
    expect(res.data.threads[drawing.id].hidden).toBe(false);
  });

  it('gives "next" to the doing thread, else the first "to"', () => {
    expect(nextOwner({ doingId: 'a', toIds: ['b'] })).toBe('a');
    expect(nextOwner({ toIds: ['b', 'c'] })).toBe('b');
    expect(nextOwner({ toIds: [] })).toBeUndefined();
  });

  it('attaches an unattached activity later', () => {
    let { data, apparel } = seed();
    const res = logActivity(data, { text: 'slogan sketch' });
    data = attachActivity(res.data, res.activity.id, apparel.id);
    expect(data.activities[res.activity.id].toIds).toEqual([apparel.id]);
  });
});

describe('selectors', () => {
  it('warmth halves every 14 days', () => {
    expect(warmth(day(14), day(0))).toBeCloseTo(0.5, 5);
    expect(warmth(undefined)).toBe(0);
  });

  it('splits current and earlier threads by last touch', () => {
    let { data, drawing, apparel } = seed();
    data = logActivity(data, { text: 'old', doingId: apparel.id, occurredAt: day(40) }, day(40)).data;
    data = logActivity(data, { text: 'new', doingId: drawing.id, occurredAt: day(1) }, day(1)).data;
    const { current, earlier } = homeThreads(data, day(0));
    expect(current.map((s) => s.thread.id)).toEqual([drawing.id]);
    expect(earlier.map((s) => s.thread.id)).toEqual([apparel.id]);
  });

  it('derives links from activities, both directions kept apart', () => {
    let { data, drawing, apparel } = seed();
    data = logActivity(data, { text: 'a', doingId: drawing.id, toIds: [apparel.id] }).data;
    data = logActivity(data, { text: 'b', doingId: drawing.id, toIds: [apparel.id] }).data;
    data = logActivity(data, { text: 'c', doingId: apparel.id, toIds: [drawing.id] }).data;
    expect(flowsFrom(data, drawing.id)).toEqual([{ thread: data.threads[apparel.id], count: 2 }]);
    expect(flowsFrom(data, apparel.id)).toEqual([{ thread: data.threads[drawing.id], count: 1 }]);
  });

  it('"last time" prefers the same direction', () => {
    let { data, drawing, apparel } = seed();
    data = logActivity(data, { text: 'plain', doingId: drawing.id, occurredAt: day(1) }, day(1)).data;
    data = logActivity(data, { text: 'for apparel', doingId: drawing.id, toIds: [apparel.id], occurredAt: day(3) }, day(3)).data;
    expect(lastTimeFor(data, drawing.id, apparel.id)?.text).toBe('for apparel');
    expect(lastTimeFor(data, drawing.id)?.text).toBe('plain');
  });
});

describe('composing', () => {
  it('finds the active @query, including spaces, but not emails', () => {
    expect(activeMention('sketched @make app')).toEqual({ start: 9, query: 'make app' });
    expect(activeMention('mail me@x.com')).toBeUndefined();
    expect(removeActiveMention('sketched @make app')).toBe('sketched ');
  });

  it('ranks prefix matches first, then recency', () => {
    let { data, drawing, apparel } = seed();
    const videos = ensureThread(data, 'make short videos');
    data = videos.data;
    const out = suggestThreads(data, 'make', [videos.thread.id, apparel.id]);
    expect(out.map((t) => t.name)).toEqual(['make short videos', 'make apparel']);
    expect(suggestThreads(data, 'draw', []).map((t) => t.id)).toEqual([drawing.id]);
  });

  it('suggests a doing thread from words, never from short or stop words', () => {
    const { data, drawing } = seed();
    expect(suggestDoing(data, 'more drawing tonight')?.id).toBe(drawing.id);
    expect(suggestDoing(data, 'went to the gym')).toBeUndefined();
  });
});

describe('backup', () => {
  it('round-trips and rejects foreign files', () => {
    const { data } = seed();
    expect(fromBackup(toBackup(data))).toEqual(data);
    expect(() => fromBackup('{"hello":1}')).toThrow(/Wanderment backup/);
    expect(() => fromBackup('nope')).toThrow(/valid JSON/);
  });
});
