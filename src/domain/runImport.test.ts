/**
 * P-86: what an import checks about a routine's steps and a run's place (structure only: lists of
 * the right kind of thing, ids that can be told apart), and that saved data is never refused for it.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { fromBackup, toBackup } from './backup';
import { migrateData } from './migrate';
import { editRoutine, Env, place, readRoutine, readRun, runVerb, Verb } from './run';
import { Data, emptyData } from './types';

const at = '2026-11-24T10:00:00.000Z';
const routine = (extra: Record<string, unknown> = {}) => ({ id: 'r1', words: 'Report', named: true, createdAt: at, items: [{ id: 'a', text: 'Write' }, { id: 'w', wait: 'a reply' }], ...extra });
const run = (extra: Record<string, unknown> = {}) => ({ id: 'n1', routineId: 'r1', startedAt: at, frames: [{ seq: 'r1', at: 'a', round: 1 }], changes: [], ...extra });
const v2 = (routines: Record<string, unknown>, runs: Record<string, unknown> = {}) => ({ version: 2, threads: {}, activities: {}, routines, runs });
const strict = (routines: Record<string, unknown>, runs: Record<string, unknown> = {}) => () => migrateData(JSON.parse(JSON.stringify(v2(routines, runs))));

describe('import: the structure of steps, frames and changes', () => {
  it('a routine whose steps are not a list of things with an id is refused, naming it', () => {
    for (const items of ['banana', { a: 1 }, [3], ['x'], [null], [{ text: 'no id' }], [{ id: 7, text: 'a number for an id' }], [{ id: '', text: 'an empty id' }]]) {
      expect(strict({ r1: routine({ items }) }), JSON.stringify(items)).toThrow('The routine “Report” in the backup has steps that aren’t in the right shape.');
    }
  });

  it('two steps of one routine with the same id are refused: a place in a run could mean either', () => {
    expect(strict({ r1: routine({ items: [{ id: 'a', text: 'one' }, { id: 'a', text: 'two' }] }) })).toThrow('The routine “Report” in the backup has two steps with the same id (“a”).');
    // The same id in two routines is two different steps.
    expect(strict({ r1: routine(), r2: routine({ id: 'r2', words: 'Other' }) })).not.toThrow();
  });

  it('a run whose frames or changes are not lists of the right kind of thing is refused', () => {
    for (const frames of ['banana', { seq: 'r1' }, [3], [null], [{ at: 'a' }], [{ seq: 4, at: 'a' }], [{ seq: 'r1', at: 5 }], [{ seq: 'r1', at: 'a', round: 'two' }]]) {
      expect(strict({ r1: routine() }, { n1: run({ frames }) }), JSON.stringify(frames)).toThrow('A run in the backup has a place that isn’t in the right shape.');
    }
    for (const changes of ['banana', { not: 'a list' }, [3], [null], ['x']]) {
      expect(strict({ r1: routine() }, { n1: run({ changes }) }), JSON.stringify(changes)).toThrow('A run in the backup has changes that aren’t in the right shape.');
    }
  });

  it('what is only unusual is kept as it is: no steps, frames or changes at all, fields this version does not know, a step that points at a routine that is not there', () => {
    const odd = v2(
      { r1: { id: 'r1', words: 'Bare', named: false, createdAt: at }, r2: routine({ id: 'r2', items: [{ id: 'i', ref: 'nowhere', later: { deep: [1] } }, { id: 'j', ref: 'r2' }], repeatFrom: 99 }) },
      { n1: { id: 'n1', routineId: 'r1', startedAt: at }, n2: run({ id: 'n2', routineId: 'gone', frames: [{ seq: 'gone', at: null }, { seq: 'r2', at: 'i', round: 3, from: 'x', more: true }], changes: [{ kind: 'from-the-future', x: 1 }] }) },
    );
    expect(migrateData(JSON.parse(JSON.stringify(odd)))).toEqual(odd);
  });

  it('saved data is never refused for any of it (repaired when read, as it always has been), and nothing is rewritten', () => {
    const damaged = v2({ r1: routine({ items: 'banana' }), r2: routine({ id: 'r2', items: [{ id: 'a', text: 'one' }, { id: 'a', text: 'two' }, 3] }) }, { n1: run({ frames: 'banana', changes: { not: 'a list' } }), n2: run({ id: 'n2', routineId: 'r2', frames: [3] }) });
    const d = migrateData(JSON.parse(JSON.stringify(damaged)), { skipInvalid: true });
    expect(d).toEqual(damaged);
    // …and it reads: the runs are at the start of their routines.
    expect(readRoutine(d, 'r1')!.items).toEqual([]);
    expect(place(d, readRun(d, 'n1')!)!.frames).toEqual([{ seq: 'r1', at: null, round: 1 }]);
    expect(place(d, readRun(d, 'n2')!)!.frames).toEqual([{ seq: 'r2', at: 'a', round: 1 }]);
  });

  it('everything the engine writes passes: a run with a nested level (a step broken down in Plan), left in Plan, with a reason and waiting-since, exports and imports back equal', () => {
    let n = 0;
    const env = (): Env => ({ now: at, id: () => `id${++n}` });
    let d: Data = { ...emptyData(), routines: { r1: routine({ items: [{ id: 'a', text: 'Write' }, { id: 'w', wait: 'a reply' }], repeatFrom: 0, repeat: 3, open: true, home: true }) } };
    const started = runVerb(d, { kind: 'start', routineId: 'r1' }, env());
    const id = started.runId!;
    d = started.data;
    const press = (verb: Verb) => runVerb(d, verb, env());
    const edit = (e: Parameters<typeof editRoutine>[2]) => editRoutine(d, 'r1', e, env());
    const steps = [
      () => press({ kind: 'plan', runId: id }),
      () => edit({ kind: 'breakDown', item: 'a', steps: ['outline', 'draft'] }),
      () => edit({ kind: 'addWait', wait: 'the kettle', after: 'a' }),
      () => edit({ kind: 'repeat', times: 5 }),
      () => press({ kind: 'resume', runId: id }),
      () => press({ kind: 'done', runId: id }),
      () => press({ kind: 'pause', runId: id, reason: 'lunch 🍜 “quoted”' }),
      () => press({ kind: 'plan', runId: id }),
    ];
    for (const [i, step] of steps.entries()) {
      const r = step();
      expect(r.ok, String(i)).toBe(true);
      d = r.data;
    }
    expect(readRun(d, id)).toMatchObject({ status: 'paused', mode: 'plan', reason: 'lunch 🍜 “quoted”', waitingSince: at });
    expect(Object.keys(d.routines)).toHaveLength(2);
    expect(fromBackup(toBackup(d, new Date(at)))).toEqual(d);
  });

  it('a backup from the build before P-90 passes: runs with this-run changes of every kind, breakdowns owned by a run, a run at the edge — imported exactly as exported', () => {
    const golden = join(__dirname, '../storage/fixtures/golden');
    const before = JSON.parse(readFileSync(join(golden, 'p90-expected.json'), 'utf8')).data as Data;
    expect(fromBackup(readFileSync(join(golden, 'p90-backup.json'), 'utf8'))).toEqual(before);
    expect(readRun(before, 'p90-008')!.changes).toHaveLength(7);
  });
});
