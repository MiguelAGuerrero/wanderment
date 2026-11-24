/** P-04: a backup is checked strictly before anything is shown, then previewed against what's here. */
import { describe, expect, it } from 'vitest';

import { fromBackup } from './backup';
import { planImport } from './importPlan';
import { migrateData, parseLegacyState } from './migrate';
import { Activity, Data, emptyData, Thread } from './types';

const at = '2026-03-01T10:00:00.000Z';
const thread = (id: string, name: string, extra: Partial<Thread> = {}): Thread => ({ id, name, hidden: false, createdAt: at, ...extra });
const act = (id: string, text: string, extra: Partial<Activity> = {}): Activity => ({ id, text, occurredAt: at, createdAt: at, toIds: [], ...extra });
const backup = (data: unknown) => JSON.stringify({ app: 'wanderment', exportedAt: at, data });
const data = (threads: Thread[] = [], activities: Activity[] = []): Data => ({
  ...emptyData(),
  threads: Object.fromEntries(threads.map((t) => [t.id, t])),
  activities: Object.fromEntries(activities.map((a) => [a.id, a])),
});
const legacy = (d: unknown) => JSON.stringify({ state: { data: d, showShading: true }, version: 1 });

describe('the strict check (imports)', () => {
  it('refuses wanders or activities given as a list instead of records', () => {
    expect(() => fromBackup(backup({ version: 1, threads: [], activities: {} }))).toThrow('The backup’s wanders or activities aren’t in the right shape.');
    expect(() => fromBackup(backup({ version: 1, threads: {}, activities: [act('a1', 'x')] }))).toThrow('The backup’s wanders or activities aren’t in the right shape.');
  });

  it('refuses wanders or activities that aren’t records at all', () => {
    for (const bad of ['x', 3, null, true]) {
      expect(() => fromBackup(backup({ version: 1, threads: bad, activities: {} })), String(bad)).toThrow('The backup is missing wanders or activities.');
      expect(() => fromBackup(backup({ version: 1, threads: {}, activities: bad })), String(bad)).toThrow('The backup is missing wanders or activities.');
    }
  });

  it('refuses two wanders, or two activities, with the same id (today the later one would silently win)', () => {
    const twoThreads = { version: 1, threads: { a: thread('z', 'draw'), b: thread('z', 'run') }, activities: {} };
    expect(() => fromBackup(backup(twoThreads))).toThrow('Two wanders in the backup have the same id (“z”).');
    // The record's key counts as its id when it has none.
    const keyAndId = { version: 1, threads: { z: { name: 'draw', createdAt: at }, b: thread('z', 'run') }, activities: {} };
    expect(() => fromBackup(backup(keyAndId))).toThrow('Two wanders in the backup have the same id (“z”).');
    const twoActs = { version: 1, threads: {}, activities: { a: act('q', 'one'), b: act('q', 'two') } };
    expect(() => fromBackup(backup(twoActs))).toThrow('Two activities in the backup have the same id (“q”).');
  });

  it('refuses a backup from a newer version, saying so (not that it isn’t a backup)', () => {
    let message = '';
    try {
      fromBackup(backup({ version: 3, threads: {}, activities: {} }));
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toMatch(/newer version/);
    expect(message).not.toMatch(/isn’t a Wanderment backup/);
    // Not a backup at all still says so.
    expect(() => fromBackup(backup({ version: 'one', threads: {}, activities: {} }))).toThrow('That file isn’t a Wanderment backup.');
    expect(() => fromBackup(backup({ version: 0, threads: {}, activities: {} }))).toThrow('That file isn’t a Wanderment backup.');
  });

  it('refuses two wanders whose names match as `@` matches them, naming both', () => {
    const named = (...ts: Thread[]) => backup(data(ts));
    // Case.
    expect(() => fromBackup(named(thread('t1', 'draw'), thread('t2', 'Draw')))).toThrow(
      'Two wanders have the same name: “draw” and “Draw”. Rename one in the file, or in the app the backup came from and export it again.',
    );
    // An NFC pair: "Café" composed vs "Cafe" + combining acute.
    const composed = 'Café';
    const decomposed = 'Café';
    expect(composed).not.toBe(decomposed);
    expect(() => fromBackup(named(thread('t1', composed), thread('t2', decomposed)))).toThrow(`“${composed}” and “${decomposed}”`);
    // Spaces, as `@` trims and collapses them.
    expect(() => fromBackup(named(thread('t1', 'play  guitar'), thread('t2', ' play guitar')))).toThrow(/same name/);
    // A hidden one counts too, and says it's hidden so it can be found.
    expect(() => fromBackup(named(thread('t1', 'draw'), thread('t2', 'DRAW', { hidden: true })))).toThrow(
      'Two wanders have the same name: “draw” and “DRAW” (hidden). Rename one in the file, or in the app the backup came from and export it again.',
    );
  });

  it('names every clash, or the first few and how many more', () => {
    const three = backup(data([thread('t1', 'draw'), thread('t2', 'Draw'), thread('t3', 'DRAW'), thread('t4', 'run'), thread('t5', 'Run')]));
    expect(() => fromBackup(three)).toThrow('Some wanders have the same name: “draw”, “Draw” and “DRAW”; “run” and “Run”. Rename them in the file, or in the app the backup came from and export it again.');
    const many = backup(data(['a', 'b', 'c', 'd', 'e'].flatMap((n) => [thread(`${n}1`, n), thread(`${n}2`, n.toUpperCase())])));
    expect(() => fromBackup(many)).toThrow('Some wanders have the same name: “a” and “A”; “b” and “B”; “c” and “C”; and 2 more. Rename them in the file, or in the app the backup came from and export it again.');
  });

  it('caps the message: at most three names a group, each clipped to 40 characters (audit F5)', () => {
    const thirty = backup(data(Array.from({ length: 30 }, (_, i) => thread(`t${i}`, i % 2 ? 'draw' : 'DRAW'))));
    expect(() => fromBackup(thirty)).toThrow('Some wanders have the same name: “DRAW”, “draw”, “DRAW” and 27 more. Rename them in the file, or in the app the backup came from and export it again.');
    const long = 'a'.repeat(5000);
    let message = '';
    try {
      fromBackup(backup(data([thread('t1', long), thread('t2', long.toUpperCase())])));
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toBe(`Two wanders have the same name: “${'a'.repeat(39)}…” and “${'A'.repeat(39)}…”. Rename one in the file, or in the app the backup came from and export it again.`);
    // Clipped by characters, never through one: an emoji at the cut stays whole.
    const emoji = `${'b'.repeat(38)}🎨🎨🎨`;
    expect(() => fromBackup(backup(data([thread('t1', emoji), thread('t2', emoji.toUpperCase())])))).toThrow(`“${'b'.repeat(38)}🎨…” and “${'B'.repeat(38)}🎨…”`);
  });

  it('ids that are also names of object methods are ordinary ids (audit F4)', () => {
    const odd = ['constructor', 'toString', 'valueOf', 'hasOwnProperty'];
    const threads = Object.fromEntries(odd.map((id, i) => [id, thread(id, `wander ${i}`)]));
    const activities = Object.fromEntries(odd.map((id) => [id, act(id, `did ${id}`, { doingId: id })]));
    const d = fromBackup(backup({ version: 1, threads, activities }));
    expect(Object.keys(d.threads)).toEqual(odd);
    expect(Object.keys(d.activities)).toEqual(odd);
    expect(d.threads.constructor).toMatchObject({ id: 'constructor', name: 'wander 0' });
    // Two of them are still two of the same id.
    const twice = { version: 1, threads: { a: thread('constructor', 'draw'), b: thread('constructor', 'run') }, activities: {} };
    expect(() => fromBackup(backup(twice))).toThrow('Two wanders in the backup have the same id (“constructor”).');
  });

  it('“__proto__” as an id is refused, plainly: the app’s storage can’t keep it, so it would be lost on reload', () => {
    const asThread = JSON.stringify({ app: 'wanderment', exportedAt: at, data: { version: 1, threads: { ['__proto__']: thread('__proto__', 'draw') }, activities: {} } });
    expect(asThread).toContain('"__proto__"');
    expect(() => fromBackup(asThread)).toThrow('A wander in the backup has an id this app can’t use (“__proto__”).');
    const asActivity = backup({ version: 1, threads: {}, activities: { a1: act('__proto__', 'x') } });
    expect(() => fromBackup(asActivity)).toThrow('An activity in the backup has an id this app can’t use (“__proto__”).');
  });

  it('still accepts a good backup as before', () => {
    const d = data([thread('t1', 'draw'), thread('t2', 'run', { hidden: true })], [act('a1', 'sketched', { doingId: 't1' })]);
    expect(fromBackup(backup(d))).toEqual(d);
    // Dangling references are accepted as today (not part of this check).
    expect(fromBackup(backup(data([], [act('a1', 'x', { doingId: 'nope', toIds: ['zz'] })]))).activities.a1).toMatchObject({ doingId: 'nope', toIds: ['zz'] });
  });
});

describe('the lenient loader (saved data) behaves as before', () => {
  it('a duplicate-name blob still loads with both wanders', () => {
    const d = data([thread('t1', 'draw'), thread('t2', 'Draw'), thread('t3', 'DRAW', { hidden: true })]);
    expect(parseLegacyState(legacy(d))?.data).toEqual(d);
    expect(migrateData(d, { skipInvalid: true })).toEqual(d);
  });

  it('duplicate ids: the later one wins, as before', () => {
    const blob = { version: 1, threads: { a: thread('z', 'draw'), b: thread('z', 'run') }, activities: { a: act('q', 'one'), b: act('q', 'two') } };
    const loaded = parseLegacyState(legacy(blob))!.data;
    expect(Object.values(loaded.threads).map((t) => t.name)).toEqual(['run']);
    expect(Object.values(loaded.activities).map((a) => a.text)).toEqual(['two']);
  });

  it('lists where records belong load as before (by index)', () => {
    const blob = { version: 1, threads: [{ name: 'draw', createdAt: at }], activities: {} };
    expect(parseLegacyState(legacy(blob))!.data.threads).toEqual({ '0': { id: '0', name: 'draw', hidden: false, createdAt: at } });
  });
});

describe('planImport: what a backup holds and how it differs from what’s here', () => {
  const here = data(
    [thread('t1', 'draw', { declaredAt: at }), thread('t2', 'run'), thread('t3', 'old', { hidden: true })],
    [act('a1', 'sketched', { doingId: 't1' }), act('a2', 'jogged', { doingId: 't2' }), act('a3', 'gone')],
  );

  it('counts each side: activities, wanders (visible and hidden) and declared whys', () => {
    const incoming = data([thread('t1', 'draw'), thread('t9', 'sew', { hidden: true }), thread('t8', 'cook', { hidden: true })], [act('a1', 'sketched', { doingId: 't1' })]);
    const plan = planImport(here, incoming);
    expect(plan.here).toEqual({ activities: 3, wanders: 3, visible: 2, hidden: 1, whys: 1 });
    expect(plan.incoming).toEqual({ activities: 1, wanders: 3, visible: 1, hidden: 2, whys: 0 });
  });

  it('diffs each collection by id: added, removed, changed, unchanged', () => {
    const incoming = data(
      // t1 changed (no longer declared), t2 unchanged, t3 removed, t4 added.
      [thread('t1', 'draw'), thread('t2', 'run'), thread('t4', 'sew')],
      // a1 unchanged, a2 changed (note), a3 removed, a4 and a5 added.
      [act('a1', 'sketched', { doingId: 't1' }), act('a2', 'jogged', { doingId: 't2', note: 'far' }), act('a4', 'hemmed'), act('a5', 'more')],
    );
    const plan = planImport(here, incoming);
    expect(plan.activities).toEqual({ added: 2, removed: 1, changed: 1, unchanged: 1 });
    expect(plan.threads).toEqual({ added: 1, removed: 1, changed: 1, unchanged: 1 });
    expect(plan.identical).toBe(false);
    expect(plan.empty).toBe(false);
  });

  it('a change anywhere in a record counts: a "to" list, a next step, hidden', () => {
    const base = data([thread('t1', 'draw'), thread('t2', 'run')], [act('a1', 'x', { toIds: ['t1', 't2'] })]);
    expect(planImport(base, data([thread('t1', 'draw'), thread('t2', 'run')], [act('a1', 'x', { toIds: ['t2', 't1'] })])).activities.changed).toBe(1);
    expect(planImport(base, data([thread('t1', 'draw', { next: 'ink' }), thread('t2', 'run')], [act('a1', 'x', { toIds: ['t1', 't2'] })])).threads.changed).toBe(1);
    expect(planImport(base, data([thread('t1', 'draw'), thread('t2', 'run', { hidden: true })], [act('a1', 'x', { toIds: ['t1', 't2'] })])).threads.changed).toBe(1);
  });

  it('the same data again is identical: nothing added, removed or changed', () => {
    const copy = fromBackup(backup(here));
    expect(copy).not.toBe(here);
    const plan = planImport(here, copy);
    expect(plan.identical).toBe(true);
    expect(plan.activities).toEqual({ added: 0, removed: 0, changed: 0, unchanged: 3 });
    expect(plan.threads).toEqual({ added: 0, removed: 0, changed: 0, unchanged: 3 });
    // A field that's absent equals one that's undefined.
    expect(planImport(data([thread('t1', 'draw', { next: undefined })]), data([thread('t1', 'draw')])).identical).toBe(true);
  });

  it('the date range spans the incoming activities, ignoring missing (epoch-0) dates', () => {
    const incoming = data(
      [],
      [
        act('a1', 'x', { occurredAt: '2026-01-03T09:00:00.000Z' }),
        act('a2', 'y', { occurredAt: '2026-03-09T18:00:00.000Z' }),
        act('a3', 'z', { occurredAt: '2026-02-01T00:00:00.000Z' }),
        act('a4', 'undated', { occurredAt: new Date(0).toISOString() }),
      ],
    );
    expect(planImport(emptyData(), incoming).dateRange).toEqual({ from: '2026-01-03T09:00:00.000Z', to: '2026-03-09T18:00:00.000Z' });
    // A backup made from a file with no dates goes through migrate: the dates become epoch 0.
    const undated = fromBackup(backup({ version: 1, threads: {}, activities: { a1: { text: 'no date', toIds: [] } } }));
    expect(undated.activities.a1.occurredAt).toBe(new Date(0).toISOString());
    expect(planImport(emptyData(), undated).dateRange).toBeUndefined();
    // No activities: no range.
    expect(planImport(here, data([thread('t1', 'draw')])).dateRange).toBeUndefined();
  });

  it('empty: no activities and no wanders', () => {
    expect(planImport(here, emptyData())).toMatchObject({ empty: true, identical: false, activities: { removed: 3 }, threads: { removed: 3 } });
    // Empty over empty is identical: nothing changes.
    expect(planImport(emptyData(), emptyData())).toMatchObject({ empty: true, identical: true });
    // Only hidden wanders isn't empty.
    expect(planImport(emptyData(), data([thread('t1', 'draw', { hidden: true })]))).toMatchObject({ empty: false, incoming: { wanders: 1, visible: 0, hidden: 1 } });
  });

  it('ids named like object methods are compared as ids: added, removed, unchanged (audit F4)', () => {
    const odd = data([thread('constructor', 'draw'), thread('hasOwnProperty', 'run')]);
    expect(planImport(emptyData(), odd).threads).toEqual({ added: 2, removed: 0, changed: 0, unchanged: 0 });
    expect(planImport(odd, emptyData()).threads).toEqual({ added: 0, removed: 2, changed: 0, unchanged: 0 });
    expect(planImport(odd, fromBackup(backup(odd)))).toMatchObject({ identical: true, threads: { unchanged: 2 } });
    expect(planImport(data([thread('toString', 'draw')]), data([thread('valueOf', 'draw')])).threads).toEqual({ added: 1, removed: 1, changed: 0, unchanged: 0 });
  });

  it('stays fast on a big backup (linear)', () => {
    const big = (n: number) =>
      data(
        Array.from({ length: 220 }, (_, i) => thread(`t${i}`, `thread ${i}`)),
        Array.from({ length: n }, (_, i) => act(`a${i}`, `step ${i}`, { doingId: `t${i % 220}`, occurredAt: new Date(Date.UTC(2026, 0, 1) + i * 6e4).toISOString() })),
      );
    const t0 = performance.now();
    const plan = planImport(big(40000), big(40000));
    expect(plan.identical).toBe(true);
    expect(performance.now() - t0).toBeLessThan(1000);
  });
});

describe('P-73: lit and settled lines in backups and saved data', () => {
  const settledAt = '2026-03-02T08:00:00.000Z';
  const both = data([thread('t1', 'draw')], [act('a1', 'sketch hands', { lit: true }), act('a2', 'cooked dinner', { settledAt }), act('a3', 'ran')]);

  it('export → import keeps lit and settledAt', async () => {
    const { toBackup } = await import('./backup');
    const back = fromBackup(toBackup(both));
    expect(back.activities.a1.lit).toBe(true);
    expect(back.activities.a2.settledAt).toBe(settledAt);
    expect(back).toEqual(both);
    expect('lit' in back.activities.a3 || 'settledAt' in back.activities.a3).toBe(false);
  });

  it('an older export (no such fields) imports unchanged and reads settled; a format-1 file reads as format 2 (P-85)', () => {
    const old = fromBackup(backup({ version: 1, threads: {}, activities: { a1: act('a1', 'scales') } }));
    expect(old.version).toBe(2);
    expect(old.activities.a1).toEqual(act('a1', 'scales'));
    expect(old.activities.a1.lit).toBeUndefined();
  });

  it('junk is repaired, never trusted: lit only when exactly true, settledAt only a real ISO stamp (as UTC)', () => {
    const d = migrateData({
      version: 1,
      threads: {},
      activities: {
        a1: { ...act('a1', 'x'), lit: 'yes', settledAt: '1' },
        a2: { ...act('a2', 'y'), lit: 1, settledAt: 'March 7' },
        a3: { ...act('a3', 'z'), lit: true, settledAt: '2026-03-02T09:00:00+01:00' },
      },
    });
    expect(d.activities.a1).toEqual(act('a1', 'x'));
    expect(d.activities.a2).toEqual(act('a2', 'y'));
    expect(d.activities.a3).toEqual({ ...act('a3', 'z'), lit: true, settledAt: settledAt });
  });

  it('the localStorage format (fallback) and the lenient load keep them', () => {
    const legacyState = parseLegacyState(legacy(both))!;
    expect(legacyState.data.activities.a1.lit).toBe(true);
    expect(legacyState.data.activities.a2.settledAt).toBe(settledAt);
    const lenient = migrateData({ ...both, activities: { ...both.activities, bad: { id: 'bad' } } }, { skipInvalid: true });
    expect(lenient).toEqual(both);
  });
});
