/**
 * P-85 (B-11 groundwork): storage handles any kind of record. One list of collections drives the
 * backup format (2), the fallback blob, the diff/journal, undo, taking the data back and the import
 * plan. Routines and runs are checked for structure only here (P-86 owns what they mean).
 */
import { describe, expect, it } from 'vitest';

import { fromBackup, toBackup } from './backup';
import { applyUndo, diffData, isEmptyDiff, missingFrom, pendingChanges, rebase, undoEntry } from './diff';
import { heldHere, heldIncoming, planImport } from './importPlan';
import { importChanges, importHolds, importRemovesAll } from './importText';
import { defaultSettings, migrateData, parseLegacyState, toLegacyState } from './migrate';
import { Activity, COLLECTIONS, Data, emptyData, Routine, Run, Thread } from './types';

const at = '2026-03-01T10:00:00.000Z';
const at2 = '2026-03-02T08:00:00.000Z';
const thread = (id: string, name: string, extra: Partial<Thread> = {}): Thread => ({ id, name, hidden: false, createdAt: at, ...extra });
const act = (id: string, text: string, extra: Partial<Activity> = {}): Activity => ({ id, text, occurredAt: at, createdAt: at, toIds: [], ...extra });
/** A routine with everything B-11 section 8 lists: items (step, wait with a reaction, routine reference), divider, repeat number, blanks, values used. */
const routine = (id: string, extra: Record<string, unknown> = {}): Routine => ({
  id,
  words: 'Apply to ▢employer',
  named: true,
  createdAt: at,
  items: [
    { id: 'i1', text: 'Find the posting', setsGoing: true },
    { id: 'i2', wait: 'a reply', closes: 'i1', reactions: [{ name: 'They said yes', items: [{ id: 'i3', text: 'Book a call' }] }] },
    { id: 'i4', ref: 'r2' },
  ],
  repeatFrom: 1,
  repeat: 3,
  blanks: ['employer'],
  used: { employer: ['Acme', 'Initech'] },
  ...extra,
});
/** A run with frames, values, breakdowns, a parent run, ended-at, waiting-since and a pause reason. */
const run = (id: string, extra: Record<string, unknown> = {}): Run => ({
  id,
  routineId: 'r1',
  parentRunId: 'n0',
  startedAt: at,
  endedAt: at2,
  waitingSince: at2,
  values: { employer: 'Acme' },
  frames: [{ seq: 'r1', at: 'i2', round: 2 }, { seq: 'r2', at: null }],
  breakdowns: { i1: 'r9' },
  waitedOn: ['i2'],
  changes: [{ kind: 'reword', item: 'i1', text: 'Find the listing' }],
  reason: 'lunch',
  ...extra,
});
const data = (d: Partial<Data> = {}): Data => ({ ...emptyData(), ...d });
const withBoth = () => data({ threads: { t1: thread('t1', 'draw') }, activities: { a1: act('a1', 'sketched') }, routines: { r1: routine('r1') }, runs: { n1: run('n1') } });
const backup = (d: unknown) => JSON.stringify({ app: 'wanderment', exportedAt: at, data: d });
const v2 = (d: Record<string, unknown> = {}) => ({ version: 2, threads: {}, activities: {}, routines: {}, runs: {}, ...d });

describe('one list of collections', () => {
  it('every key of emptyData() other than version is in COLLECTIONS, and the other way round', () => {
    const keys = Object.keys(emptyData()).filter((k) => k !== 'version');
    expect(keys.sort()).toEqual([...COLLECTIONS].sort());
    expect(COLLECTIONS).toEqual(expect.arrayContaining(['threads', 'activities', 'routines', 'runs']));
    for (const c of COLLECTIONS) expect(emptyData()[c], c).toEqual({});
  });

  it('the data format is 2', () => {
    expect(emptyData().version).toBe(2);
  });
});

describe('migrateData: format 1 and format 2', () => {
  it('format 1 becomes format 2 with empty routines and runs, its records unchanged', () => {
    const d = migrateData({ version: 1, threads: { t1: thread('t1', 'draw') }, activities: { a1: act('a1', 'sketched') } });
    expect(d).toEqual({ version: 2, threads: { t1: thread('t1', 'draw') }, activities: { a1: act('a1', 'sketched') }, routines: {}, runs: {} });
  });

  it('format 2 with a routine and a run round-trips deep-equal (strict and lenient)', () => {
    const d = withBoth();
    expect(d.version).toBe(2);
    expect(migrateData(JSON.parse(JSON.stringify(d)))).toEqual(d);
    expect(migrateData(JSON.parse(JSON.stringify(d)), { skipInvalid: true })).toEqual(d);
    // The record's key counts as its id when it has none, as for wanders and activities.
    const { id: _id, ...noId } = routine('r1');
    expect(migrateData(v2({ routines: { r1: noId } })).routines.r1).toEqual(routine('r1'));
  });

  it('format 3 is refused with the “newer version” message, in both modes', () => {
    for (const opts of [{}, { skipInvalid: true }]) {
      expect(() => migrateData({ ...v2(), version: 3 }, opts)).toThrow('That Wanderment backup was made by a newer version of the app. Update Wanderment, then import it again.');
    }
    expect(() => migrateData({ ...v2(), version: 0 })).toThrow('That file isn’t a Wanderment backup.');
    expect(() => migrateData({ ...v2(), version: '2' })).toThrow('That file isn’t a Wanderment backup.');
  });

  it('strict: a format-2 file whose routines or runs are missing or null is refused (audit F3); lenient reads them as empty', () => {
    const without = (key: 'routines' | 'runs', value?: null) => {
      const { [key]: _gone, ...rest } = v2();
      return value === null ? { ...rest, [key]: null } : rest;
    };
    for (const key of ['routines', 'runs'] as const) {
      expect(() => migrateData(without(key)), key).toThrow(`The backup is missing its ${key}.`);
      expect(() => migrateData(without(key, null)), `${key}: null`).toThrow(`The backup is missing its ${key}.`);
      expect(() => fromBackup(backup(without(key, null))), `${key}: null`).toThrow(`The backup is missing its ${key}.`);
      // Saved data (the fallback, recovery) keeps reading what it can.
      expect(migrateData(without(key), { skipInvalid: true }), key).toEqual(emptyData());
      expect(migrateData(without(key, null), { skipInvalid: true }), key).toEqual(emptyData());
    }
    expect(() => migrateData({ version: 2, threads: {}, activities: {} })).toThrow('The backup is missing its routines.');
    expect(migrateData({ version: 2, threads: {}, activities: { a1: act('a1', 'kept') } }, { skipInvalid: true })).toEqual(data({ activities: { a1: act('a1', 'kept') } }));
  });

  it('a format-1 file that carries routines or runs: refused when strict (audit F4), and never read when lenient (format 1 has none)', () => {
    const v1 = (extra: Record<string, unknown>) => ({ version: 1, threads: {}, activities: { a1: act('a1', 'kept') }, ...extra });
    expect(() => migrateData(v1({ routines: { r1: routine('r1') } }))).toThrow('The backup says it’s from before routines existed, but it has routines.');
    expect(() => migrateData(v1({ runs: { n1: run('n1') } }))).toThrow('The backup says it’s from before runs existed, but it has runs.');
    expect(() => migrateData(v1({ routines: {} }))).toThrow('The backup says it’s from before routines existed, but it has routines.');
    expect(() => fromBackup(backup(v1({ runs: null })))).toThrow('The backup says it’s from before runs existed, but it has runs.');
    // Lenient: the format decides. What a format-1 blob says about routines or runs isn't read, garbage included.
    const lenient = migrateData(v1({ routines: { r1: routine('r1'), junk: 7 }, runs: 'garbage' }), { skipInvalid: true });
    expect(lenient).toEqual(data({ activities: { a1: act('a1', 'kept') } }));
    expect(parseLegacyState(JSON.stringify({ state: { data: v1({ routines: { r1: routine('r1') }, runs: { n1: run('n1') } }) }, version: 1 }))!.data).toEqual(data({ activities: { a1: act('a1', 'kept') } }));
  });

  it('a version that isn’t a whole number: above 1 it still reads as “newer version”, as before (audit F7)', () => {
    for (const version of [1.5, 2.5]) {
      expect(() => migrateData({ ...v2(), version }), String(version)).toThrow('That Wanderment backup was made by a newer version of the app. Update Wanderment, then import it again.');
    }
    expect(() => migrateData({ ...v2(), version: 0.5 })).toThrow('That file isn’t a Wanderment backup.');
  });

  it('a null in an optional field of a routine or run reads as absent, never as a bad record (audit F5)', () => {
    const nulls = v2({ routines: { r1: { ...routine('r1'), removedAt: null } }, runs: { n1: { ...run('n1'), parentRunId: null, endedAt: null, waitingSince: null } } });
    const { parentRunId: _p, endedAt: _e, waitingSince: _w, ...open } = run('n1');
    const expected = data({ routines: { r1: routine('r1') }, runs: { n1: open as Run } });
    // Through the fallback round trip: the record is kept, with the field absent.
    const blob = JSON.stringify({ state: { data: nulls, showShading: true }, version: 1 });
    const loaded = parseLegacyState(blob)!.data;
    expect(loaded).toEqual(expected);
    expect('removedAt' in loaded.routines.r1).toBe(false);
    for (const k of ['parentRunId', 'endedAt', 'waitingSince']) expect(k in loaded.runs.n1, k).toBe(false);
    expect(parseLegacyState(toLegacyState(loaded, defaultSettings()))!.data).toEqual(expected);
    // And an import of such a file is accepted the same way.
    expect(migrateData(JSON.parse(JSON.stringify(nulls)))).toEqual(expected);
    // A required field that is null is still a bad record.
    expect(() => migrateData(v2({ runs: { n1: { ...run('n1'), startedAt: null } } }))).toThrow('A run in the backup is malformed.');
  });

  it('strict: a malformed routine or run rejects the file', () => {
    const badRoutines: unknown[] = [null, 'x', 3, [], { id: 'r1' }, { ...routine('r1'), words: 7 }, { ...routine('r1'), named: 'yes' }, { ...routine('r1'), createdAt: undefined }, { ...routine('r1'), removedAt: 5 }];
    for (const bad of badRoutines) expect(() => migrateData(v2({ routines: { r1: bad } })), JSON.stringify(bad)).toThrow('A routine in the backup is malformed.');
    const badRuns: unknown[] = [null, 'x', [], { id: 'n1' }, { ...run('n1'), routineId: 4 }, { ...run('n1'), startedAt: null }, { ...run('n1'), parentRunId: 1 }, { ...run('n1'), endedAt: false }, { ...run('n1'), waitingSince: {} }];
    for (const bad of badRuns) expect(() => migrateData(v2({ runs: { n1: bad } })), JSON.stringify(bad)).toThrow('A run in the backup is malformed.');
  });

  it('strict: routines or runs given as a list, or as something that isn’t records, reject the file', () => {
    for (const bad of [[], [routine('r1')], 'x', 3, true]) {
      expect(() => migrateData(v2({ routines: bad })), JSON.stringify(bad)).toThrow('The backup’s routines aren’t in the right shape.');
      expect(() => migrateData(v2({ runs: bad })), JSON.stringify(bad)).toThrow('The backup’s runs aren’t in the right shape.');
    }
  });

  it('strict: duplicate ids and the id “__proto__” are refused', () => {
    expect(() => migrateData(v2({ routines: { a: routine('z'), b: routine('z') } }))).toThrow('Two routines in the backup have the same id (“z”).');
    expect(() => migrateData(v2({ runs: { a: run('q'), b: run('q') } }))).toThrow('Two runs in the backup have the same id (“q”).');
    const proto = (key: 'routines' | 'runs', record: unknown) => JSON.stringify({ app: 'wanderment', exportedAt: at, data: v2({ [key]: { x: record } }) });
    expect(() => fromBackup(proto('routines', routine('__proto__')))).toThrow('A routine in the backup has an id this app can’t use (“__proto__”).');
    expect(() => fromBackup(proto('runs', run('__proto__')))).toThrow('A run in the backup has an id this app can’t use (“__proto__”).');
    // Ids named like object methods are ids.
    const odd = fromBackup(backup(v2({ routines: { constructor: routine('constructor') }, runs: { toString: run('toString') } })));
    expect(Object.keys(odd.routines)).toEqual(['constructor']);
    expect(Object.keys(odd.runs)).toEqual(['toString']);
  });

  it('lenient (saved data): a malformed routine or run is skipped and the rest kept', () => {
    const d = migrateData(v2({ activities: { a1: act('a1', 'kept') }, routines: { r1: routine('r1'), bad: { id: 'bad' }, worse: null }, runs: { n1: run('n1'), bad: { id: 'bad', routineId: 3 } } }), { skipInvalid: true });
    expect(d).toEqual(data({ activities: { a1: act('a1', 'kept') }, routines: { r1: routine('r1') }, runs: { n1: run('n1') } }));
    // Something that isn't records at all reads as empty rather than hiding everything else.
    expect(migrateData(v2({ activities: { a1: act('a1', 'kept') }, routines: 'x', runs: 3 }), { skipInvalid: true })).toEqual(data({ activities: { a1: act('a1', 'kept') } }));
  });

  it('structure only: nothing a routine or run carries is dropped or rewritten', () => {
    const odd = routine('r1', { items: [{ id: 'i1', ref: 'r1' }], repeatFrom: 99, somethingNew: { deep: [1, { two: 2 }] } });
    const d = migrateData(JSON.parse(JSON.stringify(v2({ routines: { r1: odd }, runs: { n1: run('n1', { routineId: 'nowhere', frames: [{ seq: 'gone', at: 'gone' }] }) } }))));
    expect(d.routines.r1).toEqual(odd);
    expect(d.runs.n1).toEqual(run('n1', { routineId: 'nowhere', frames: [{ seq: 'gone', at: 'gone' }] }));
  });
});

describe('backups are written in format 2', () => {
  it('export → import keeps a routine and a run, and says version 2', () => {
    const d = withBoth();
    const json = toBackup(d);
    expect(JSON.parse(json).data.version).toBe(2);
    expect(JSON.parse(json).data.routines.r1).toEqual(routine('r1'));
    expect(fromBackup(json)).toEqual(d);
    // With nothing in the new collections it is still format 2.
    expect(JSON.parse(toBackup(emptyData())).data).toEqual({ version: 2, threads: {}, activities: {}, routines: {}, runs: {} });
  });

  it('a format-1 backup imports to valid format-2 data', () => {
    const old = fromBackup(backup({ version: 1, threads: { t1: thread('t1', 'draw') }, activities: { a1: act('a1', 'scales') } }));
    expect(old).toEqual(data({ threads: { t1: thread('t1', 'draw') }, activities: { a1: act('a1', 'scales') } }));
    expect(fromBackup(toBackup(old))).toEqual(old);
  });
});

describe('the fallback blob (localStorage)', () => {
  it('a round trip keeps routines and runs, and the data inside says version 2', () => {
    const d = withBoth();
    const blob = toLegacyState(d, defaultSettings());
    expect(parseLegacyState(blob)!.data).toEqual(d);
    const parsed = JSON.parse(blob);
    // Inside: 2, so a copy of the app from before P-85 refuses it ("newer version") instead of rewriting it without them.
    expect(parsed.state.data.version).toBe(2);
    // Outside: the persist wrapper's own version, unchanged.
    expect(parsed.version).toBe(1);
  });

  it('a version-1 blob (the first release, an old tab) still parses, with empty routines and runs', () => {
    const blob = JSON.stringify({ state: { data: { version: 1, threads: { t1: thread('t1', 'draw') }, activities: { a1: act('a1', 'x') } }, showShading: false }, version: 1 });
    const parsed = parseLegacyState(blob)!;
    expect(parsed.data).toEqual(data({ threads: { t1: thread('t1', 'draw') }, activities: { a1: act('a1', 'x') } }));
    expect(parsed.settings.showShading).toBe(false);
  });

  it('a blob from a newer format is not read (so it is never overwritten)', () => {
    expect(parseLegacyState(JSON.stringify({ state: { data: { ...v2(), version: 3 } }, version: 1 }))).toBeUndefined();
  });
});

describe('planImport sees every collection', () => {
  const here = withBoth();

  it('a backup differing only in a routine is not identical and not empty: added, changed (even deep inside), removed', () => {
    expect(planImport(here, JSON.parse(JSON.stringify(here)))).toMatchObject({ identical: true, routines: { unchanged: 1 }, runs: { unchanged: 1 } });
    const added = data({ ...here, routines: { ...here.routines, r2: routine('r2') } });
    expect(planImport(here, added)).toMatchObject({ identical: false, empty: false, routines: { added: 1, removed: 0, changed: 0, unchanged: 1 } });
    const renamed = data({ ...here, routines: { r1: routine('r1', { words: 'Apply' }) } });
    expect(planImport(here, renamed)).toMatchObject({ identical: false, routines: { added: 0, removed: 0, changed: 1, unchanged: 0 } });
    // Only a step's text, two levels down.
    const deep = JSON.parse(JSON.stringify(here)) as Data;
    (deep.routines.r1.items as { reactions?: { items: { text: string }[] }[] }[])[1].reactions![0].items[0].text = 'Book a call tomorrow';
    expect(planImport(here, deep)).toMatchObject({ identical: false, routines: { changed: 1, unchanged: 0 } });
    const removed = data({ ...here, routines: {} });
    expect(planImport(here, removed)).toMatchObject({ identical: false, routines: { added: 0, removed: 1, changed: 0, unchanged: 0 } });
  });

  it('a backup differing only in a run is not identical', () => {
    const moved = data({ ...here, runs: { n1: run('n1', { frames: [{ seq: 'r1', at: 'i4', round: 2 }] }) } });
    expect(planImport(here, moved)).toMatchObject({ identical: false, empty: false, runs: { added: 0, removed: 0, changed: 1, unchanged: 0 }, routines: { unchanged: 1 } });
    expect(planImport(data(), data({ runs: { n1: run('n1') } }))).toMatchObject({ identical: false, empty: false, runs: { added: 1 } });
  });

  it('a backup holding only a routine is not “identical” to nothing, and not “empty”', () => {
    const plan = planImport(emptyData(), data({ routines: { r1: routine('r1') } }));
    expect(plan.identical).toBe(false);
    expect(plan.empty).toBe(false);
    expect(plan.incoming).toMatchObject({ activities: 0, wanders: 0 });
    expect([heldIncoming(plan.routines), heldIncoming(plan.runs)]).toEqual([1, 0]);
  });

  it('a format-1 backup against data with routines and runs reports them as removed', () => {
    const old = fromBackup(backup({ version: 1, threads: { t1: thread('t1', 'draw') }, activities: { a1: act('a1', 'sketched') } }));
    const plan = planImport(here, old);
    expect(plan).toMatchObject({ identical: false, routines: { added: 0, removed: 1, changed: 0, unchanged: 0 }, runs: { added: 0, removed: 1, changed: 0, unchanged: 0 }, activities: { unchanged: 1 }, threads: { unchanged: 1 } });
    expect([heldHere(plan.routines), heldHere(plan.runs)]).toEqual([1, 1]);
    expect([heldIncoming(plan.routines), heldIncoming(plan.runs)]).toEqual([0, 0]);
  });

  it('key order never makes two records differ, at any depth', () => {
    const reversed = JSON.parse(JSON.stringify(here, (_k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).reverse()) : v)));
    expect(planImport(here, reversed).identical).toBe(true);
  });
});

describe('the import preview’s words name routines and runs', () => {
  const here = withBoth();

  it('what a backup holds: routines and runs are named when it has any, and the sentence is unchanged when it has none', () => {
    expect(importHolds(planImport(emptyData(), data({ threads: { t1: thread('t1', 'draw') }, activities: { a1: act('a1', 'x', { occurredAt: new Date(0).toISOString() }), a2: act('a2', 'y', { occurredAt: new Date(0).toISOString() }) } })))).toBe(
      'This backup has 2 activities and 1 wander.',
    );
    const both = data({ routines: { r1: routine('r1'), r2: routine('r2') }, runs: { n1: run('n1') } });
    expect(importHolds(planImport(emptyData(), both))).toBe('This backup has 0 activities, 0 wanders, 2 routines and 1 run.');
    expect(importHolds(planImport(emptyData(), data({ routines: { r1: routine('r1') } })))).toBe('This backup has 0 activities, 0 wanders and 1 routine.');
    expect(importHolds(planImport(here, emptyData()))).toBe('This backup has no activities and no wanders.');
  });

  it('what replacing would do: a format-1 backup says the routines and runs here would be removed', () => {
    const old = fromBackup(backup({ version: 1, threads: { t1: thread('t1', 'draw') }, activities: { a1: act('a1', 'sketched'), a2: act('a2', 'new') } }));
    expect(importChanges(planImport(here, old))).toBe('Replacing would add 1 activity, and remove 1 routine, and remove 1 run.');
    const more = data({ ...here, routines: { r1: routine('r1', { words: 'Apply' }), r2: routine('r2'), r3: routine('r3') } });
    expect(importChanges(planImport(here, more))).toBe('Replacing would add 2 and change 1 routine.');
    // Unchanged from before P-85 when no routine or run is involved.
    const plain = data({ threads: { t2: thread('t2', 'run') }, activities: { a1: act('a1', 'sketched'), a3: act('a3', 'z') } });
    expect(importChanges(planImport(data({ threads: here.threads, activities: here.activities }), plain))).toBe('Replacing would add 1 activity, and add 1 and remove 1 wander.');
  });

  it('an empty backup: everything here would go, routines and runs named when there are any', () => {
    expect(importRemovesAll(planImport(here, emptyData()))).toBe('Replacing would remove all 1 activity, 1 wander, 1 routine and 1 run here.');
    expect(importRemovesAll(planImport(data({ threads: here.threads, activities: here.activities }), emptyData()))).toBe('Replacing would remove all 1 activity and 1 wander here.');
  });
});

describe('diff, pending changes, undo, rebase and missing-from handle routines and runs', () => {
  it('diffData: upserts and deletes for each, by identity; the four old keys keep their names', () => {
    const base = withBoth();
    expect(isEmptyDiff(diffData(base, base))).toBe(true);
    const r2 = routine('r2');
    const n1 = run('n1', { reason: 'phone' });
    const next = data({ ...base, routines: { r2 }, runs: { n1, n2: run('n2') } });
    const d = diffData(base, next);
    expect(d).toEqual({
      upsertThreads: [],
      deleteThreads: [],
      upsertActivities: [],
      deleteActivities: [],
      upsertRoutines: [r2],
      deleteRoutines: ['r1'],
      upsertRuns: [n1, next.runs.n2],
      deleteRuns: [],
    });
    expect(isEmptyDiff(d)).toBe(false);
    expect(isEmptyDiff(diffData(base, data({ ...base, runs: {} })))).toBe(false);
    expect(diffData(base, data({ ...base, runs: {} })).deleteRuns).toEqual(['n1']);
  });

  it('pendingChanges (the journal): a routine and a run touched since the last save are written, an undone delete in flight included', () => {
    const committed = withBoth();
    const current = data({ ...committed, routines: { r1: routine('r1', { words: 'Apply' }) }, runs: {} });
    const pending = pendingChanges(committed, undefined, current);
    expect(pending.upsertRoutines).toEqual([current.routines.r1]);
    expect(pending.deleteRuns).toEqual(['n1']);
    expect(pending).toEqual(diffData(committed, current));
    // A delete being written, then undone: the naive diff is empty, the journal still holds the record.
    const inflight = data({ ...committed, routines: {}, runs: {} });
    const back = pendingChanges(committed, inflight, committed);
    expect(back.upsertRoutines).toEqual([committed.routines.r1]);
    expect(back.upsertRuns).toEqual([committed.runs.n1]);
    expect(back.deleteRoutines).toEqual([]);
  });

  it('one action touching an activity, a routine and a run undoes as one step, keeping later edits', () => {
    const before = withBoth();
    const after = data({
      ...before,
      activities: { ...before.activities, a2: act('a2', 'logged by the action') },
      routines: { r1: { ...before.routines.r1, words: 'Apply everywhere' }, r9: routine('r9', { named: false }) },
      runs: {},
    });
    const entry = undoEntry(before, after);
    expect(Object.keys(entry.activities)).toEqual(['a2']);
    expect(entry.routines.r1).toEqual({ before: before.routines.r1, after: after.routines.r1 });
    expect(entry.routines.r9).toEqual({ before: null, after: after.routines.r9 });
    expect(entry.runs.n1).toEqual({ before: before.runs.n1, after: null });
    expect(entry.threads).toEqual({});
    expect(applyUndo(after, entry)).toEqual(before);
    // An edit made afterwards to another field of the routine survives the undo.
    const later = data({ ...after, routines: { ...after.routines, r1: { ...after.routines.r1, repeat: 5 } } });
    const undone = applyUndo(later, entry);
    expect(undone.routines.r1).toEqual({ ...before.routines.r1, repeat: 5 });
    expect(undone.routines.r9).toBeUndefined();
    expect(undone.runs.n1).toEqual(before.runs.n1);
    expect(undone.activities.a2).toBeUndefined();
    expect(undone.activities.a1).toBe(before.activities.a1);
  });

  it('missingFrom finds routines and runs the base lacks, and only those', () => {
    const base = withBoth();
    const incoming = data({ ...base, routines: { r1: routine('r1', { words: 'stale copy' }), r2: routine('r2') }, runs: { n2: run('n2') } });
    const c = missingFrom(base, incoming);
    expect(c.upsertRoutines).toEqual([incoming.routines.r2]);
    expect(c.upsertRuns).toEqual([incoming.runs.n2]);
    expect(c.deleteRoutines).toEqual([]);
    expect(c.deleteRuns).toEqual([]);
    expect(c.upsertThreads).toEqual([]);
    expect(c.upsertActivities).toEqual([]);
  });

  it('rebase takes another copy’s routine and run, and keeps this page’s own on top', () => {
    const base = withBoth();
    // Nothing changed here; another copy added a routine and moved the run.
    const loaded = data({ ...JSON.parse(JSON.stringify(base)), routines: { r1: routine('r1'), r2: routine('r2', { words: 'Bake' }) }, runs: { n1: run('n1', { reason: 'elsewhere' }) } });
    const r = rebase(base, base, loaded);
    expect(r.changed).toBe(true);
    expect(r.data.routines.r2).toEqual(routine('r2', { words: 'Bake' }));
    expect(r.data.runs.n1.reason).toBe('elsewhere');
    expect(r.saved).toEqual(loaded);
    // Unchanged records keep this page's objects.
    expect(r.data.routines.r1).toBe(base.routines.r1);
    expect(r.data.threads.t1).toBe(base.threads.t1);

    // This page changed a run and removed nothing; the other copy removed the routine r1 and added r3.
    const current = data({ ...base, runs: { n1: run('n1', { reason: 'here' }), n2: run('n2') } });
    const elsewhere = data({ ...JSON.parse(JSON.stringify(base)), routines: { r3: routine('r3') } });
    const both = rebase(base, current, elsewhere);
    expect(both.changed).toBe(true);
    expect(Object.keys(both.data.routines)).toEqual(['r3']);
    expect(both.data.runs.n1.reason).toBe('here');
    expect(both.data.runs.n2).toBe(current.runs.n2);
    expect(both.saved).toEqual(elsewhere);
  });

  it('rebase: when only routines and runs were reloaded unchanged, the page keeps exactly what it shows', () => {
    const base = withBoth();
    const r = rebase(base, base, JSON.parse(JSON.stringify(base)));
    expect(r).toEqual({ data: base, saved: base, changed: false });
    expect(r.data).toBe(base);
  });
});

describe('ids named like object methods are ids in every collection (audit F1)', () => {
  const ODD = ['constructor', 'toString', 'hasOwnProperty', 'valueOf'];
  const make: { [K in (typeof COLLECTIONS)[number]]: (id: string, n?: number) => Data[K][string] } = {
    threads: (id, n = 0) => thread(id, `wander ${id} ${n}`),
    activities: (id, n = 0) => act(id, `did ${id} ${n}`),
    routines: (id, n = 0) => routine(id, { words: `routine ${id} ${n}` }),
    runs: (id, n = 0) => run(id, { reason: `reason ${n}` }),
  };
  const key = (c: string, verb: 'upsert' | 'delete') => `${verb}${c[0].toUpperCase()}${c.slice(1)}` as keyof ReturnType<typeof diffData>;
  const only = (c: (typeof COLLECTIONS)[number], ids: string[], n = 0): Data => data({ [c]: Object.fromEntries(ids.map((id) => [id, make[c](id, n)])) });

  for (const c of COLLECTIONS) {
    it(`${c}: a removed record is a delete in the diff and in the journal, and a new one is new`, () => {
      const full = only(c, ODD);
      const none = data();
      expect(diffData(full, none)[key(c, 'delete')]).toEqual(ODD);
      expect(isEmptyDiff(diffData(full, none))).toBe(false);
      expect(diffData(none, full)[key(c, 'upsert')]).toEqual(Object.values(full[c]));
      expect(pendingChanges(full, undefined, none)[key(c, 'delete')]).toEqual(ODD);
      expect(pendingChanges(full, undefined, none)[key(c, 'upsert')]).toEqual([]);
      // A delete in flight, then undone: written back, not deleted.
      expect(pendingChanges(full, none, full)[key(c, 'upsert')]).toEqual(Object.values(full[c]));
      expect(pendingChanges(full, none, full)[key(c, 'delete')]).toEqual([]);
    });

    it(`${c}: missingFrom, undo and rebase treat them as records`, () => {
      const full = only(c, ODD);
      const none = data();
      expect(missingFrom(none, full)[key(c, 'upsert')]).toEqual(Object.values(full[c]));
      expect(missingFrom(full, full)[key(c, 'upsert')]).toEqual([]);
      // Created by the action: before is null (not something inherited), and Undo removes it.
      const made = undoEntry(none, full);
      for (const id of ODD) expect((made[c] as Record<string, { before: unknown }>)[id].before, id).toBeNull();
      expect(applyUndo(full, made)).toEqual(none);
      // Removed by the action: Undo brings it back.
      expect(applyUndo(none, undoEntry(full, none))).toEqual(full);
      // Removed by another copy: taken as a change, and gone from what's shown.
      const gone = rebase(full, full, JSON.parse(JSON.stringify(none)));
      expect(gone.changed).toBe(true);
      expect(gone.data[c]).toEqual({});
      // Added by another copy: taken, too; reloaded unchanged: nothing changes.
      const added = rebase(none, none, JSON.parse(JSON.stringify(full)));
      expect(added.changed).toBe(true);
      expect(added.data[c]).toEqual(full[c]);
      expect(rebase(full, full, JSON.parse(JSON.stringify(full)))).toEqual({ data: full, saved: full, changed: false });
      // This page removed them while away, the other copy changed nothing: they stay removed.
      const mine = rebase(full, none, JSON.parse(JSON.stringify(only(c, ODD, 0))));
      expect(mine.data[c]).toEqual({});
    });
  }
});
