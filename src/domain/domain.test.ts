import { describe, expect, it } from 'vitest';

import { fromBackup, toBackup } from './backup';
import { applyUndo, diffData, isEmptyDiff, missingFrom, pendingChanges, undoEntry } from './diff';
import { migrateData } from './migrate';
import { activeMention, removeActiveMention, suggestDoing, suggestThreads } from './compose';
import { attachActivity, deleteActivity, editActivity, ensureThread, logActivity, nextOwner, updateThread } from './model';
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

describe('migrating data', () => {
  it('repairs what it can and rejects what it can’t', () => {
    const repaired = migrateData({
      version: 1,
      threads: { t1: { name: ' run ', createdAt: 'nope' } },
      activities: { a1: { text: 'x', occurredAt: '2026-01-01T00:00:00.000Z', doingId: 't1', toIds: ['t1', 't2', 't2', 3] } },
    });
    expect(repaired.threads.t1).toMatchObject({ id: 't1', name: 'run', hidden: false, createdAt: new Date(0).toISOString() });
    expect(repaired.activities.a1).toMatchObject({ id: 'a1', toIds: ['t2'], createdAt: '2026-01-01T00:00:00.000Z' });
    expect(() => migrateData({ version: 2, threads: {}, activities: {} })).toThrow(/Wanderment backup/);
    expect(() => migrateData({ version: 1, threads: {}, activities: { a: { text: 1 } } })).toThrow(/malformed/);
  });
});

describe('diffing data', () => {
  it('finds changed and removed records by identity', () => {
    const { data, drawing } = seed();
    const renamed = updateThread(data, drawing.id, { name: 'draw' });
    const logged = logActivity(renamed, { text: 'x' });
    const d = diffData(data, logged.data);
    expect(d.upsertThreads.map((t) => t.id)).toEqual([drawing.id]);
    expect(d.upsertActivities.map((a) => a.id)).toEqual([logged.activity.id]);
    expect(diffData(logged.data, data)).toMatchObject({ deleteActivities: [logged.activity.id], deleteThreads: [] });
    expect(isEmptyDiff(diffData(data, data))).toBe(true);
  });
});

describe('editing activities', () => {
  it('edits text, threads and note but never empties the text or repeats doing in "to"', () => {
    const { data, drawing, apparel } = seed();
    const res = logActivity(data, { text: 'gestures', toIds: [apparel.id] });
    let d = editActivity(res.data, res.activity.id, { text: '  ', note: ' good ', doingId: apparel.id });
    expect(d.activities[res.activity.id]).toMatchObject({ text: 'gestures', note: 'good', doingId: apparel.id, toIds: [] });
    d = editActivity(d, res.activity.id, { doingId: null, toIds: [drawing.id, drawing.id, 'missing'], note: '' });
    expect(d.activities[res.activity.id]).toMatchObject({ doingId: undefined, toIds: [drawing.id], note: undefined });
    expect(editActivity(d, 'nope', { text: 'x' })).toBe(d);
  });

  it('deletes an activity, and only that one', () => {
    const { data } = seed();
    const a = logActivity(data, { text: 'a' });
    const b = logActivity(a.data, { text: 'b' });
    const d = deleteActivity(b.data, a.activity.id);
    expect(Object.keys(d.activities)).toEqual([b.activity.id]);
    expect(deleteActivity(d, 'nope')).toBe(d);
  });
});

describe('pending changes for the write-ahead journal', () => {
  it('covers an undo made while a delete is still being written', () => {
    const { data } = seed();
    const logged = logActivity(data, { text: 'keep me' });
    const committed = logged.data;
    const inflight = deleteActivity(committed, logged.activity.id); // being written
    const current = committed; // undo restored it
    expect(diffData(committed, current).upsertActivities).toEqual([]); // the naive journal would be empty
    const pending = pendingChanges(committed, inflight, current);
    expect(pending.upsertActivities.map((a) => a.text)).toEqual(['keep me']);
    expect(pending.deleteActivities).toEqual([]);
  });

  it('is the plain diff when nothing is in flight', () => {
    const { data, drawing } = seed();
    const next = updateThread(data, drawing.id, { next: 'hands' });
    expect(pendingChanges(data, undefined, next)).toEqual(diffData(data, next));
  });
});

describe('undo', () => {
  it('reverts only what the action touched, keeping later edits', () => {
    const { data, drawing } = seed();
    const logged = logActivity(data, { text: 'gestures', doingId: drawing.id });
    const entry = undoEntry(data, logged.data);
    // Later, unrelated changes: a next step and a rename.
    const later = updateThread(logged.data, drawing.id, { next: 'hands', name: 'draw' });
    const undone = applyUndo(later, entry);
    expect(undone.activities[logged.activity.id]).toBeUndefined();
    expect(undone.threads[drawing.id]).toMatchObject({ next: 'hands', name: 'draw' });
  });

  it('brings back a deleted activity without removing a thread created afterwards', () => {
    const { data } = seed();
    const logged = logActivity(data, { text: 'keep' });
    const deleted = deleteActivity(logged.data, logged.activity.id);
    const entry = undoEntry(logged.data, deleted);
    const withThread = ensureThread(deleted, 'new thing');
    const undone = applyUndo(withThread.data, entry);
    expect(undone.activities[logged.activity.id].text).toBe('keep');
    expect(undone.threads[withThread.thread.id]).toBeDefined();
  });

  it('logging drops thread ids that no longer exist', () => {
    const { data, drawing } = seed();
    const { activity } = logActivity(data, { text: 'x', doingId: 'gone', toIds: ['gone2', drawing.id] });
    expect(activity).toMatchObject({ doingId: undefined, toIds: [drawing.id] });
  });

  it('missingFrom finds only records the base lacks', () => {
    const { data } = seed();
    const more = logActivity(data, { text: 'new' });
    const c = missingFrom(data, more.data);
    expect(c.upsertActivities.map((a) => a.text)).toEqual(['new']);
    expect(c.upsertThreads).toEqual([]);
  });
});

describe('undo keeps edits made after the action', () => {
  it('logging a crumb then setting a new next step or renaming: Undo removes the log only', () => {
    let { data, drawing } = seed();
    data = updateThread(data, drawing.id, { next: 'A' });
    const logged = logActivity(data, { text: 'did A', doingId: drawing.id, fromNextOf: drawing.id });
    const entry = undoEntry(data, logged.data);
    const later = updateThread(logged.data, drawing.id, { next: 'B', name: 'draw' });
    const undone = applyUndo(later, entry);
    expect(undone.activities[logged.activity.id]).toBeUndefined();
    expect(undone.threads[drawing.id]).toMatchObject({ next: 'B', name: 'draw' });
  });

  it('puts back a cleared next step if nothing replaced it', () => {
    let { data, drawing } = seed();
    data = updateThread(data, drawing.id, { next: 'A' });
    const logged = logActivity(data, { text: 'did A', doingId: drawing.id, fromNextOf: drawing.id });
    const undone = applyUndo(updateThread(logged.data, drawing.id, { name: 'draw' }), undoEntry(data, logged.data));
    expect(undone.threads[drawing.id]).toMatchObject({ next: 'A', name: 'draw' });
  });
});
