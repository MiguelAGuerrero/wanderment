import { describe, expect, it } from 'vitest';

import { attachToNewThread, bridgeThreads, needsBridge } from './bridge';
import { deleteActivity, ensureThread, logActivity, updateThread } from './model';
import { Data, emptyData } from './types';

const day = (n: number) => new Date(Date.UTC(2026, 10, 20) - n * 864e5);
const now = day(0);

/** Threads created `createdDaysAgo`, each touched by one activity `touchedDaysAgo` (or never). */
function withThreads(specs: { name: string; createdDaysAgo: number; touchedDaysAgo?: number; hidden?: boolean }[]) {
  let data: Data = emptyData();
  const ids: Record<string, string> = {};
  for (const s of specs) {
    const r = ensureThread(data, s.name, day(s.createdDaysAgo));
    data = r.data;
    ids[s.name] = r.thread.id;
    if (s.touchedDaysAgo !== undefined) {
      data = logActivity(data, { text: `on ${s.name}`, doingId: r.thread.id, occurredAt: day(s.touchedDaysAgo) }, day(s.touchedDaysAgo)).data;
    }
    if (s.hidden) data = updateThread(data, r.thread.id, { hidden: true });
  }
  return { data, ids };
}

describe('bridgeThreads', () => {
  it('leaves out hidden threads', () => {
    const { data } = withThreads([
      { name: 'play guitar', createdDaysAgo: 5, touchedDaysAgo: 1 },
      { name: 'secret', createdDaysAgo: 5, touchedDaysAgo: 0, hidden: true },
    ]);
    expect(bridgeThreads(data, 3, now).map((t) => t.name)).toEqual(['play guitar']);
  });

  it('follows Home’s recency order, including a thread with nothing in it and an Earlier one', () => {
    const { data } = withThreads([
      { name: 'old one', createdDaysAgo: 60, touchedDaysAgo: 40 },
      { name: 'touched yesterday', createdDaysAgo: 10, touchedDaysAgo: 1 },
      { name: 'just named', createdDaysAgo: 0 },
    ]);
    expect(bridgeThreads(data, 3, now).map((t) => t.name)).toEqual(['just named', 'touched yesterday', 'old one']);
  });

  it('offers at most 3', () => {
    const { data } = withThreads([
      { name: 'a', createdDaysAgo: 9, touchedDaysAgo: 4 },
      { name: 'b', createdDaysAgo: 9, touchedDaysAgo: 3 },
      { name: 'c', createdDaysAgo: 9, touchedDaysAgo: 2 },
      { name: 'd', createdDaysAgo: 9, touchedDaysAgo: 1 },
    ]);
    expect(bridgeThreads(data, undefined, now).map((t) => t.name)).toEqual(['d', 'c', 'b']);
  });

  it('is empty when there are no threads', () => {
    let data = emptyData();
    data = logActivity(data, { text: 'read a novel' }).data;
    expect(bridgeThreads(data)).toEqual([]);
  });
});

describe('needsBridge', () => {
  const { data: base, ids } = withThreads([{ name: 'play guitar', createdDaysAgo: 3 }]);

  it('is true for an activity with no thread', () => {
    const { data, activity } = logActivity(base, { text: 'read a novel' });
    expect(needsBridge(data, activity.id)).toBe(true);
  });

  it('is false for an activity with only a doing', () => {
    const { data, activity } = logActivity(base, { text: 'scales', doingId: ids['play guitar'] });
    expect(needsBridge(data, activity.id)).toBe(false);
  });

  it('is false for an activity with only a "to"', () => {
    const { data, activity } = logActivity(base, { text: 'scales', toIds: [ids['play guitar']] });
    expect(needsBridge(data, activity.id)).toBe(false);
  });

  it('is false for a deleted activity, or none', () => {
    const { data, activity } = logActivity(base, { text: 'read a novel' });
    expect(needsBridge(deleteActivity(data, activity.id), activity.id)).toBe(false);
    expect(needsBridge(data, undefined)).toBe(false);
  });
});

describe('attachToNewThread', () => {
  it('creates the thread and attaches the activity to it as "to"', () => {
    const { data, activity } = logActivity(emptyData(), { text: 'read a novel' });
    const res = attachToNewThread(data, activity.id, '  reading ');
    expect(res.created).toBe(true);
    expect(res.thread?.name).toBe('reading');
    expect(Object.keys(res.data.threads)).toEqual([res.thread!.id]);
    expect(res.data.activities[activity.id].toIds).toEqual([res.thread!.id]);
    expect(res.data.activities[activity.id].doingId).toBeUndefined();
  });

  it('reuses a thread with the same normalized name instead of making a twin', () => {
    const { data: base, ids } = withThreads([{ name: 'Play Guitar', createdDaysAgo: 3 }]);
    const { data, activity } = logActivity(base, { text: 'scales' });
    const res = attachToNewThread(data, activity.id, ' play   guitar');
    expect(res.created).toBe(false);
    expect(res.thread?.id).toBe(ids['Play Guitar']);
    expect(Object.keys(res.data.threads)).toHaveLength(1);
    expect(res.data.activities[activity.id].toIds).toEqual([ids['Play Guitar']]);
  });

  it('does nothing for a blank name', () => {
    const { data, activity } = logActivity(emptyData(), { text: 'read a novel' });
    for (const name of ['', '   ', '\t']) {
      const res = attachToNewThread(data, activity.id, name);
      expect(res.data).toBe(data);
      expect(res.thread).toBeUndefined();
    }
  });

  it('does nothing for an activity that no longer exists', () => {
    const { data, activity } = logActivity(emptyData(), { text: 'read a novel' });
    const gone = deleteActivity(data, activity.id);
    expect(attachToNewThread(gone, activity.id, 'reading').data).toBe(gone);
  });

  it('brings back a hidden thread it attaches to', () => {
    const { data: base, ids } = withThreads([{ name: 'reading', createdDaysAgo: 3, hidden: true }]);
    const { data, activity } = logActivity(base, { text: 'a chapter' });
    const res = attachToNewThread(data, activity.id, 'Reading');
    expect(res.thread?.id).toBe(ids.reading);
    expect(res.data.threads[ids.reading].hidden).toBe(false);
    expect(res.data.activities[activity.id].toIds).toEqual([ids.reading]);
  });
});
