/**
 * P-86: what an import checks about a routine's steps and a run's place (structure only: lists of
 * the right kind of thing, ids that can be told apart), and that saved data is never refused for it.
 */
import { describe, expect, it } from 'vitest';

import { fromBackup, toBackup } from './backup';
import { migrateData } from './migrate';
import { Env, place, readRoutine, readRun, runVerb, Verb } from './run';
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

  it('everything the engine writes passes: a run with a nested level, this-run changes, a reason and waiting-since exports and imports back equal', () => {
    let n = 0;
    const env = (): Env => ({ now: at, id: () => `id${++n}` });
    let d: Data = { ...emptyData(), routines: { r1: routine({ items: [{ id: 'a', text: 'Write' }, { id: 'w', wait: 'a reply' }], repeatFrom: 0, repeat: 3, open: true, home: true }) } };
    const started = runVerb(d, { kind: 'start', routineId: 'r1' }, env());
    const id = started.runId!;
    d = started.data;
    const verbs: Verb[] = [
      { kind: 'breakDown', runId: id, steps: ['outline', 'draft'] },
      { kind: 'words', runId: id, text: 'outline it' },
      { kind: 'edit', runId: id, edit: { kind: 'addWait', seq: 'r1', after: 'a', wait: 'the kettle' } },
      { kind: 'edit', runId: id, edit: { kind: 'remove', seq: 'r1', item: 'w' } },
      { kind: 'edit', runId: id, edit: { kind: 'repeat', seq: 'r1', repeat: 5 } },
      { kind: 'done', runId: id },
      { kind: 'pause', runId: id, reason: 'lunch 🍜 “quoted”' },
    ];
    for (const verb of verbs) {
      const r = runVerb(d, verb, env());
      expect(r.ok, verb.kind).toBe(true);
      d = r.data;
    }
    expect(readRun(d, id)).toMatchObject({ status: 'paused', reason: 'lunch 🍜 “quoted”', waitingSince: at });
    expect(readRun(d, id)!.changes).toHaveLength(5);
    expect(fromBackup(toBackup(d, new Date(at)))).toEqual(d);
  });
});
