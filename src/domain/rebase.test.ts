import { describe, expect, it } from 'vitest';

import { rebase } from './diff';
import { Activity, Data, emptyData, Thread } from './types';

const at = '2026-11-01T10:00:00.000Z';
const act = (id: string, text: string, extra: Partial<Activity> = {}): Activity => ({ id, text, occurredAt: at, createdAt: at, toIds: [], ...extra });
const thread = (id: string, name: string, extra: Partial<Thread> = {}): Thread => ({ id, name, hidden: false, createdAt: at, ...extra });
const data = (activities: Activity[], threads: Thread[] = []): Data => ({
  ...emptyData(),
  threads: Object.fromEntries(threads.map((t) => [t.id, t])),
  activities: Object.fromEntries(activities.map((a) => [a.id, a])),
});
/** What loading the same records from the database gives: equal values, new objects, keys in another order. */
const reloaded = (d: Data): Data => JSON.parse(JSON.stringify(d, (_k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).reverse()) : v)));

describe('taking the data back after another copy may have written to it (P-29)', () => {
  it('nothing changed underneath: the page keeps exactly what it shows (same objects), and its own changes are still to be saved', () => {
    const base = data([act('a1', 'one')], [thread('t1', 'draw', { next: 'gesture' })]);
    const current = { ...base, activities: { ...base.activities, a2: act('a2', 'typed while away') } };
    const r = rebase(base, current, reloaded(base));
    expect(r.changed).toBe(false);
    expect(r.data).toBe(current);
    expect(r.saved).toBe(base);
  });

  it('another copy’s changes replace what’s shown: added, edited and deleted records', () => {
    const base = data([act('a1', 'one'), act('a2', 'two')], [thread('t1', 'draw')]);
    const loaded = data([act('a1', 'one, edited elsewhere'), act('a3', 'new elsewhere')], [thread('t1', 'draw')]);
    const r = rebase(base, base, loaded);
    expect(r.changed).toBe(true);
    expect(r.data).toEqual(loaded);
    expect(r.saved).toEqual(loaded);
    // Unchanged records keep the page's objects, so they don't re-render or get written again.
    expect(r.data.threads.t1).toBe(base.threads.t1);
  });

  it('this page’s own changes since it let go stay on top of the other copy’s', () => {
    const base = data([act('a1', 'one'), act('a2', 'two'), act('a3', 'three')]);
    // Derived from base the way the store does it: untouched records are the same objects.
    const current = data([base.activities.a1, act('a3', 'three, edited here'), act('a4', 'added here')]); // a2 deleted here
    const loaded = data([act('a1', 'one, edited elsewhere'), act('a2', 'two'), act('a3', 'three'), act('a5', 'added elsewhere')]);
    const r = rebase(base, current, loaded);
    expect(r.changed).toBe(true);
    expect(Object.values(r.data.activities).map((a) => a.text).sort()).toEqual(['added elsewhere', 'added here', 'one, edited elsewhere', 'three, edited here']);
    // What's saved is the other copy's version; the difference is this page's to write.
    expect(r.saved).toEqual(loaded);
  });

  it('a record only removed elsewhere counts as a change', () => {
    const base = data([act('a1', 'one'), act('a2', 'two')]);
    const r = rebase(base, base, data([act('a1', 'one')]));
    expect(r.changed).toBe(true);
    expect(Object.keys(r.data.activities)).toEqual(['a1']);
  });

  it('when all that differs is this page’s own changes (saved since from its journal), what’s shown doesn’t change', () => {
    const base = data([act('a1', 'one'), act('a2', 'two')]);
    const current = data([base.activities.a1, act('a3', 'added here')]); // a2 deleted here
    const r = rebase(base, current, reloaded(current));
    expect(r.changed).toBe(false);
    expect(r.data).toBe(current);
    expect(r.saved).toEqual(current);
  });

  it('an optional field the database leaves out equals one that is undefined here', () => {
    const base = data([act('a1', 'one', { note: undefined, doingId: undefined })], [thread('t1', 'draw', { next: undefined })]);
    const loaded = data([act('a1', 'one')], [thread('t1', 'draw')]);
    expect(rebase(base, base, loaded).changed).toBe(false);
  });
});
