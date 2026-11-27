/**
 * P-86, P-90: random walks over the engine. After every accepted verb or edit the invariants below
 * hold, a refused one returns the very same data, and one Undo of any single one restores the data
 * exactly as it is saved. Seeded: the same walks every run.
 *
 * P-90 added: Plan (the mode), every Plan edit on any sequence there is (break down, make a wait, the
 * move that crosses alone…), creating, a second open run of the same routine and a routine that holds
 * another (so a run can be inside a step that an edit removes), and runs that carry this-run changes
 * as the build before stored them (put in by hand: nothing writes them any more) until Plan folds them.
 */
import { describe, expect, it } from 'vitest';

import { applyUndo, undoEntry } from './diff';
import { editRoutine, Env, Frame, givenIn, isPlanning, isRef, isRunning, MAX_DEPTH, place, readRoutine, readRun, Result, RoutineEdit, routineBody, runVerb, RunState, scopeLevel, Verb, view, visibleValue, wordsOf } from './run';
import { Data, emptyData, Id, Routine, Run } from './types';

const NOW = '2026-11-24T10:00:00.000Z';
let n = 0;
let clock = 0;
const env = (): Env => ({ now: new Date(Date.parse(NOW) + 1000 * ++clock).toISOString(), id: () => `z${++n}` });
let seed = 1;
const rnd = (k: number) => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  // The high bits: the low ones of this generator repeat with a short period (an even number of choices would only ever take every other one).
  return Math.floor(seed / 65536) % k;
};
const saved = (d: Data) => JSON.parse(JSON.stringify(d));
const openRuns = (d: Data) => Object.keys(d.runs).map((id) => readRun(d, id)!).filter((r) => !r.endedAt);

function invariants(d: Data, label: string) {
  const runs = Object.keys(d.runs).map((id) => readRun(d, id)!);
  // At most one run is the one the app is on, so at most one is running.
  // (As stored, not only as read: the reader hides the status of an ended run.)
  expect(Object.values(d.runs).filter((r) => r.status !== undefined).length, `${label}: one stored status`).toBeLessThanOrEqual(1);
  expect(runs.filter((r) => r.status).length, `${label}: one current run`).toBeLessThanOrEqual(1);
  expect(runs.filter((r) => r.status === 'running').length, `${label}: one running`).toBeLessThanOrEqual(1);
  for (const r of runs) {
    const raw = d.runs[r.id];
    // P-90: a running run has no mode (as stored).
    if (raw.status === 'running') expect('mode' in raw, `${label}: a running run has no mode`).toBe(false);
    if (r.endedAt) {
      expect(raw.status, `${label}: an ended run is not current`).toBeUndefined();
      expect('mode' in raw, `${label}: an ended run has no mode`).toBe(false);
      expect(r.waitingSince, `${label}: an ended run is not waiting`).toBeUndefined();
      expect(r.reason, `${label}: an ended run has no reason`).toBeUndefined();
      continue;
    }
    expect(r.frames.length, `${label}: frames`).toBeGreaterThan(0);
    expect(r.frames.length, `${label}: depth`).toBeLessThanOrEqual(MAX_DEPTH);
    expect(r.frames[0].seq, `${label}: the bottom level is the run's routine`).toBe(r.routineId);
    r.frames.forEach((f, i) => {
      const s = view(d, r, f.seq);
      expect(s, `${label}: level ${f.seq} exists`).toBeDefined();
      if (f.at === null) expect(i, `${label}: only the bottom level may be asking`).toBe(0);
      else expect(s!.items.some((it) => it.id === f.at), `${label}: ${f.at} is an item of ${f.seq}`).toBe(true);
      expect(Number.isInteger(f.round) && f.round >= 1, `${label}: round`).toBe(true);
      // P-90: a run never sits inside a removed step — every level above the bottom was entered from
      // the step the level below is ON, and that step is the routine this level runs.
      if (i > 0) {
        const below = r.frames[i - 1];
        const entered = view(d, r, below.seq)!.items.find((it) => it.id === below.at);
        expect(f.from, `${label}: level ${i} was entered from where level ${i - 1} is`).toBe(below.at);
        expect(isRef(entered) && entered.ref, `${label}: level ${i} is the routine of the step below`).toBe(f.seq);
      }
    });
    // What is stored is what is read: nothing left for the reader to repair.
    const p = place(d, r)!;
    expect(p.repaired, `${label}: nothing to repair`).toBe(false);
    expect(!!r.waitingSince, `${label}: waiting-since exactly on a wait`).toBe(!!p.item && 'wait' in p.item);
    // P-90: a run in Plan is never running; and at the edge (nothing to stand on) it is in Plan as stored.
    if (isPlanning(d, r)) expect(r.status, `${label}: a run in Plan is not running`).not.toBe('running');
    // P-101 (ruling 4; was P-90 "at the edge it is in Plan as stored"): nothing writes a mode any more.
    expect(raw.mode, `${label}: no mode is written`).toBeUndefined();
  }
  // After the audit (F1): "running" has one definition — stored running and not in Plan — and it agrees with what is stored.
  expect(runs.filter((r) => isRunning(d, r)).map((r) => r.id), `${label}: running as the engine defines it is running as stored`).toEqual(Object.values(d.runs).filter((r) => r.status === 'running' && !r.endedAt).map((r) => r.id));
}

/**
 * P-96: values. Every value of an open run is in scope (its level is there, is that routine, and is a level
 * values belong to); no collision — a name a routine gives is never seen from below it; no value outlives
 * its round — a level that went to another round keeps nothing its repeating part gave.
 */
function valueInvariants(prev: Data, d: Data, label: string) {
  for (const id of Object.keys(d.runs)) {
    const r = readRun(d, id)!;
    if (r.endedAt) continue;
    const frames = r.frames;
    for (const e of r.values) {
      expect(e.level < frames.length && frames[e.level].seq === e.seq, `${label}: ${id} value ${e.name}@${e.level} in scope`).toBe(true);
      expect(scopeLevel(d, r, frames, e.level), `${label}: ${id} value ${e.name} at a routine's level`).toBe(e.level);
    }
    for (let top = 0; top < frames.length; top++) {
      const base = scopeLevel(d, r, frames, top);
      for (const key of givenIn(d, r, frames[base].seq).keys()) {
        const seen = visibleValue(d, r, key, frames.slice(0, top + 1));
        if (seen) expect(seen.level, `${label}: ${id} {${key}} given by level ${base} is never read from below it`).toBe(base);
      }
    }
    const was = readRun(prev, id);
    if (!was || was.endedAt) continue;
    const continuing = (i: number) => frames.slice(0, i + 1).every((f, j) => was.frames[j]?.seq === f.seq && (j === 0 || was.frames[j].from === f.from));
    // A level left, or entered afresh (from another step), is a new time through: nothing it had is carried in.
    const had = new Set(was.values.map((e) => JSON.stringify(e)));
    for (const e of r.values) if (!continuing(e.level)) expect(had.has(JSON.stringify(e)), `${label}: ${id} {${e.name}} carried into a new time through level ${e.level}`).toBe(false);
    frames.forEach((f: Frame, i) => {
      if (!continuing(i) || was.frames[i].round === f.round) return;
      const s = view(d, r, f.seq);
      if (s?.repeatFrom === undefined) return;
      const looped = new Set<Id>();
      for (const item of s.items.slice(s.repeatFrom)) {
        looped.add(item.id);
        if (isRef(item) && readRoutine(d, item.ref)?.named === false) for (const b of routineBody(d, r, item.ref)) for (const x of b.items) looped.add(x.id);
      }
      const base = scopeLevel(d, r, frames, i);
      for (const e of r.values) if (e.level === base) expect(looped.has(e.item), `${label}: ${id} {${e.name}} outlived round ${was.frames[i].round} of level ${i}`).toBe(false);
    });
  }
}

/** Rounds never skip: a level that is still there after Next or Done is in the same round or the next one. */
function roundsDidNotSkip(before: RunState, after: RunState, label: string) {
  after.frames.forEach((f, i) => {
    const was = before.frames[i];
    if (!was || was.seq !== f.seq) return;
    expect(f.round - was.round, `${label}: level ${i} round ${was.round} -> ${f.round}`).toBeGreaterThanOrEqual(0);
    expect(f.round - was.round, `${label}: level ${i} round ${was.round} -> ${f.round}`).toBeLessThanOrEqual(1);
  });
}

/** Every sequence as a run reads it: the steps (ids and words), where the divider stands, the number. */
const reading = (d: Data, run: RunState) =>
  Object.keys(d.routines).map((id) => {
    const s = view(d, run, id)!;
    return { id, items: s.items.map((i) => [i.id, wordsOf(d, run, i)]), repeatFrom: s.repeatFrom, repeat: s.repeat };
  });

describe('random walks', () => {
  it('400 walks of 60 verbs and edits: the invariants hold, refusals change nothing, and every one is undone exactly', () => {
    // So the walks mean something: every kind of verb and edit must have been accepted, runs must have gone deep and ended.
    const accepted: Record<string, number> = {};
    const count = (what: string) => (accepted[what] = (accepted[what] ?? 0) + 1);
    let deepest = 0;
    let endings = 0;
    for (let w = 0; w < 400; w++) {
      seed = w + 1;
      const NAMES = ['a', 'b', 'c'];
      // P-96: some steps give a name, some read one.
      const items = Array.from({ length: 1 + rnd(5) }, (_, i) => (rnd(4) === 0 ? { id: `w${i}`, wait: `w${i}` } : { id: `s${i}`, text: `s${i}${rnd(3) === 0 ? ` {${NAMES[rnd(3)]}}` : ''}`, ...(rnd(3) === 0 && { out: NAMES[rnd(2)] }) }));
      const R: Routine = { id: 'R', words: 'R', named: true, createdAt: NOW, items, ...(rnd(2) ? { repeatFrom: rnd(items.length) } : {}), ...(rnd(2) ? { repeat: 1 + rnd(3) } : {}), ...(rnd(2) ? { open: true } : {}), home: true };
      // S holds R as a step: a run of S can be inside R (a sequence shared by two runs).
      // (S gives {a} and reads {b}: R inside it may give {a} too — the collision the owner ruled out.)
      // (And it holds R twice: a Jump can leave R and enter it again from the other step, a new time through.)
      const S: Routine = { id: 'S', words: 'S', named: true, createdAt: NOW, items: [{ id: 'q', text: 'q {b}', out: 'a' }, { id: 'v', wait: 'v' }, { id: 'in', ref: 'R' }, { id: 'in2', ref: 'R' }], repeatFrom: 0 };
      let d: Data = { ...emptyData(), routines: { R, S } };
      const first = runVerb(d, { kind: 'start', routineId: rnd(2) ? 'R' : 'S' }, env());
      d = first.data;
      let id: Id = first.runId!;
      // A second open run of the same routine (the app never makes one; an import can): left on a step, in some round.
      if (rnd(3) === 0) {
        const on = items[rnd(items.length)];
        const second: Run = { id: `second${w}`, routineId: 'R', startedAt: NOW, touchedAt: NOW, frames: [{ seq: 'R', at: on.id, round: 1 + rnd(3) }], changes: [], ...('wait' in on && { waitingSince: NOW }) };
        d = { ...d, runs: { ...d.runs, [second.id]: second } };
        count('a second run of the routine');
      }
      invariants(d, `walk ${w} start`);
      for (let step = 0; step < 60; step++) {
        const prev = d;
        const run = readRun(d, id)!;
        const top = run.frames[run.frames.length - 1];
        const seen = view(d, run, top.seq)!;
        const anyItem = (s = seen) => s.items[rnd(s.items.length || 1)]?.id ?? 'none';
        // A Jump two levels down: a step of the routine one of the first layer's steps is.
        const deepPath = (): Id[] => {
          const root = view(d, run, run.routineId)!;
          const it = root.items[rnd(root.items.length || 1)];
          const inner = isRef(it) ? view(d, run, it.ref) : undefined;
          const x = inner?.items[rnd(inner.items.length || 1)];
          return !it ? ['none'] : x ? [it.id, x.id] : [it.id];
        };
        // Any sequence there is: the routines, and the unnamed ones steps were broken into.
        const seqIds = Object.keys(d.routines);
        const target = rnd(3) ? top.seq : seqIds[rnd(seqIds.length)];
        const targetSeq = readRoutine(d, target)!;
        const label0 = `walk ${w} step ${step}`;

        // A this-run change as the build before stored them, put in by hand (nothing writes one any
        // more). Only ones that leave the run standing where it is: never the removal of a step it is on.
        if (rnd(14) === 0 && !run.endedAt) {
          const onIds = new Set(run.frames.map((f) => f.at));
          const free = seen.items.filter((i) => !onIds.has(i.id));
          const plain = seen.items.filter((i) => !isRef(i));
          const made = [
            plain.length ? { kind: 'reword', item: plain[rnd(plain.length)].id, text: `mine${rnd(3)}` } : undefined,
            { kind: 'add', after: rnd(3) ? anyItem() : null, item: { id: `zz${++n}`, text: `added${rnd(9)}` } },
            free.length && seen.items.length > 1 ? { kind: 'remove', item: free[rnd(free.length)].id } : undefined,
            rnd(2) ? { kind: 'repeat', repeat: 1 + rnd(3) } : { kind: 'repeat' },
          ][rnd(4)];
          if (made) {
            const raw = d.runs[id];
            d = { ...d, runs: { ...d.runs, [id]: { ...raw, changes: [...(raw.changes as unknown[]), { id: `c${++n}`, seq: top.seq, ...made }] } } };
            count(`legacy:${made.kind}`);
            invariants(d, `${label0} a this-run change from before (${made.kind})`);
          }
          continue;
        }

        // After the audit (F1): the run as the build before left it at the edge — stored "running" on
        // nothing, no mode — and then something else is started. It blocks nothing, and that same
        // write stores it in Plan, not running (every invariant holds again, and one Undo is exact).
        if (rnd(6) === 0 && d.runs[id].status === 'paused' && !place(d, run)?.item) {
          const { mode: _mode, ...asLeft } = d.runs[id];
          const legacy: Data = { ...d, runs: { ...d.runs, [id]: { ...asLeft, status: 'running' } } };
          expect(isRunning(legacy, readRun(legacy, id)!), `${label0}: stored running at the edge is not running`).toBe(false);
          const out = runVerb(legacy, { kind: 'start', routineId: run.routineId === 'S' ? 'R' : 'S' }, env());
          expect(out.reason, `${label0}: a run at the edge never makes a start "running"-refused`).not.toBe('running');
          if (out.ok) {
            count('legacy:running at the edge');
            expect(out.data.runs[id].status, `${label0}: the edge run is not stored running`).toBeUndefined();
            // P-101 (ruling 4; was "the edge run is stored in Plan"): it is the edge by itself — no mode is written.
            expect(out.data.runs[id].mode, `${label0}: no mode is written for the edge run`).toBeUndefined();
            invariants(out.data, `${label0} a start past a run stored running at the edge`);
            expect(saved(applyUndo(out.data, undoEntry(legacy, out.data))), `${label0}: undone`).toEqual(saved(legacy));
            d = out.data;
            id = out.runId!;
          }
          continue;
        }

        const verbs: Verb[] = [
          { kind: 'next', runId: id },
          { kind: 'next', runId: id },
          { kind: 'next', runId: id },
          { kind: 'next', runId: id },
          { kind: 'next', runId: id },
          { kind: 'done', runId: id },
          { kind: 'stepIn', runId: id },
          { kind: 'stepIn', runId: id },
          { kind: 'back', runId: id },
          { kind: 'pause', runId: id, ...(rnd(2) ? { reason: 'why' } : {}) },
          { kind: 'resume', runId: id },
          { kind: 'resume', runId: id },
          { kind: 'home', runId: id },
          { kind: 'reason', runId: id, text: rnd(2) ? 'because' : '' },
          { kind: 'plan', runId: id },
          { kind: 'plan', runId: id },
          { kind: 'jump', runId: id, to: { level: rnd(run.frames.length) } },
          { kind: 'jump', runId: id, to: { path: [anyItem(view(d, run, run.routineId)!)] } },
          { kind: 'start', routineId: rnd(2) ? 'S' : 'R' },
          { kind: 'new', words: `goal ${rnd(3)}` },
          // P-96: typed at the step (its own field), and the value sheet.
          { kind: 'value', runId: id, name: NAMES[rnd(3)], text: rnd(4) ? `v${rnd(9)}` : '', item: top.at ?? 'none' },
          { kind: 'value', runId: id, name: NAMES[rnd(3)], text: rnd(4) ? `v${rnd(9)}` : '', item: top.at ?? 'none' },
          { kind: 'value', runId: id, name: NAMES[rnd(3)], text: rnd(4) ? `v${rnd(9)}` : '' },
          { kind: 'value', runId: id, name: NAMES[rnd(3)], text: `v${rnd(9)}`, item: top.at ?? 'none' },
          { kind: 'value', runId: id, name: NAMES[rnd(3)], text: `v${rnd(9)}`, item: top.at ?? 'none' },
          { kind: 'stepIn', runId: id },
          { kind: 'jump', runId: id, to: { path: deepPath() } },
          { kind: 'jump', runId: id, to: { path: deepPath() } },
        ];
        const edits: RoutineEdit[] = [
          { kind: 'remove', item: anyItem(targetSeq) },
          { kind: 'remove', item: top.at ?? 'none' },
          { kind: 'addStep', text: 'n' },
          { kind: 'addStep', text: 'n', after: rnd(2) ? anyItem(targetSeq) : null },
          { kind: 'addWait', wait: 'post', after: rnd(2) ? anyItem(targetSeq) : null },
          { kind: 'move', item: anyItem(targetSeq), by: rnd(2) ? 1 : -1 },
          { kind: 'divider', ...(rnd(3) ? { from: rnd(targetSeq.items.length || 1) } : {}) },
          { kind: 'repeat', ...(rnd(2) ? { times: 1 + rnd(3) } : {}) },
          { kind: 'open', open: !!rnd(2) },
          { kind: 'reword', item: anyItem(targetSeq), text: `w${rnd(3)}` },
          { kind: 'breakDown', item: rnd(2) ? (top.at ?? 'none') : anyItem(targetSeq), steps: ['a', 'b'].slice(0, 1 + rnd(2)) },
          { kind: 'toWait', item: anyItem(targetSeq) },
          { kind: 'toStep', item: anyItem(targetSeq) },
          { kind: 'rename', words: `name ${rnd(50)}` },
          { kind: 'gives', item: anyItem(targetSeq), ...(rnd(3) ? { name: NAMES[rnd(3)] } : {}) },
          { kind: 'renameValue', from: NAMES[rnd(3)], to: ['a', 'b', 'c', 'd'][rnd(4)] },
          // P-96: the step the bottom level is on (a routine the run may be inside) removed from the bottom routine.
          { kind: 'remove', item: run.frames[0]?.at ?? 'none' },
        ];
        const k = rnd(verbs.length + edits.length);
        const verb = verbs[k];
        const edit = edits[k - verbs.length];
        const onBottom = edit === edits[edits.length - 1];
        const out: Result = verb ? runVerb(d, verb, env()) : editRoutine(d, onBottom ? run.routineId : target, edit, env());
        const label = `${label0} ${JSON.stringify(verb ?? { on: onBottom ? run.routineId : target, ...edit })}`;
        if (!out.ok) {
          expect(out.data, `${label}: refused, so untouched`).toBe(prev);
          // One thing at a time: refused as "running" only by a run that IS running (never by one in Plan), and it is named.
          if (out.reason === 'running') expect(openRuns(prev).filter((r) => isRunning(prev, r)).map((r) => r.id), `${label}: refused by what is running`).toEqual([out.running?.runId]);
          continue;
        }
        d = out.data;
        const what = !verb ? `routine:${edit.kind}` : verb.kind === 'jump' ? `jump:${'level' in verb.to ? 'level' : 'path'}` : verb.kind;
        count(what);
        deepest = Math.max(deepest, ...openRuns(d).map((r) => r.frames.length));
        if (readRun(d, id)!.endedAt) endings++;
        invariants(d, label);
        valueInvariants(prev, d, label);
        // P-96: nothing but the value verb and a rename touches a run's values unless the run moved (or ended).
        for (const r of Object.keys(prev.runs)) {
          const touched = (verb?.kind === 'value' && verb.runId === r) || edit?.kind === 'renameValue';
          if (!touched && d.runs[r] && JSON.stringify(d.runs[r].frames) === JSON.stringify(prev.runs[r].frames)) expect(d.runs[r].values, `${label}: ${r} values untouched`).toEqual(prev.runs[r].values);
        }
        if (verb?.kind === 'value') count(verb.item === undefined ? 'value:sheet' : 'value:field');
        if (readRun(d, id)!.values.length) count('a run with values');
        for (const r of openRuns(d)) {
          if (r.values.some((e) => e.level > 0)) count('a value inside a routine entered as a step');
          // The collision the owner ruled out: inside R (from S), S has {a}, and R gives {a} itself.
          if (r.frames.length > 1 && r.frames[1].seq === 'R' && r.values.some((e) => e.level === 0 && e.name === 'a') && givenIn(d, r, 'R').has('a')) count('a name given both above and inside');
        }
        if (verb?.kind === 'jump' && 'path' in verb.to && verb.to.path.length > 1) count('jump:deep');
        if (verb && (verb.kind === 'next' || verb.kind === 'done')) roundsDidNotSkip(run, readRun(d, id)!, label);
        // P-90: an edit never changes a round — every level a run was in and is still in is in the round it was in.
        if (!verb) {
          for (const was of openRuns(prev)) {
            readRun(d, was.id)!.frames.forEach((f, i) => {
              if (was.frames[i]?.seq === f.seq) expect(f.round, `${label}: run ${was.id} level ${i} keeps its round`).toBe(was.frames[i].round);
            });
            expect(readRun(d, was.id)!.endedAt, `${label}: an edit never ends a run`).toBeUndefined();
          }
          // …and never sets a run running (P-101, ruling 4; was "never takes a run in Plan out of Plan": Plan is a view, not a state).
          for (const was of openRuns(prev)) if (!isRunning(prev, was)) expect(isRunning(d, readRun(d, was.id)!), `${label}: run ${was.id} is still not running`).toBe(false);
        }
        // P-90: nothing writes a this-run change any more.
        for (const r of Object.keys(d.runs)) expect(readRun(d, r)!.changes.length, `${label}: no new this-run change`).toBeLessThanOrEqual(readRun(prev, r)?.changes.length ?? 0);
        // P-90 (ruling 3): opening Plan — by Plan, or by reaching the edge — folds the run's this-run
        // changes into the routine, and the run reads exactly what it read before.
        if (out.folded !== undefined) {
          count('the fold');
          const after = readRun(d, id)!;
          expect(run.changes.length, `${label}: there was something to fold`).toBeGreaterThan(0);
          expect(after.changes, `${label}: nothing left to fold`).toEqual([]);
          expect(reading(d, after), `${label}: the fold left the run reading the same`).toEqual(reading(prev, run));
          // P-101 (ruling 4; was "folded, so in Plan"): Plan pauses it, plainly.
          expect(isRunning(d, after), `${label}: folded by Plan, so not running`).toBe(false);
        } else if (verb?.kind === 'plan') {
          expect(run.changes, `${label}: Plan with changes folds`).toEqual([]);
        }
        // P-101 (ruling 4; was "in Plan"): Plan leaves the run not running (paused if it was running).
        if (verb?.kind === 'plan') expect(isRunning(d, readRun(d, id)!), `${label}: not running after Plan`).toBe(false);
        if (verb?.kind === 'resume' || verb?.kind === 'jump') expect(isPlanning(d, readRun(d, id)!) ? readRun(d, id)!.frames[0].at : null, `${label}: out of Plan (unless at the edge)`).toBeNull();
        // New makes the routine only: never a run.
        if (verb?.kind === 'new') expect(d.runs, `${label}: no run`).toBe(prev.runs);
        expect(saved(applyUndo(d, undoEntry(prev, d))), `${label}: undone`).toEqual(saved(prev));
        // A start may have made another run the one to follow; an ended one is followed by another open run, or a new start.
        if (out.runId) id = out.runId;
        if (readRun(d, id)!.endedAt) {
          const others = openRuns(d);
          if (others.length) id = others[rnd(others.length)].id;
          else {
            // (R may have been emptied by the edits: then there is nothing to run until a step is added.)
            if (!readRoutine(d, 'R')!.items.length) d = editRoutine(d, 'R', { kind: 'addStep', text: 'again' }, env()).data;
            const again = runVerb(d, { kind: 'start', routineId: 'R' }, env());
            expect(again.ok, `${label}: start again`).toBe(true);
            d = again.data;
            id = again.runId!;
            invariants(d, `${label}: started again`);
          }
        } else if (rnd(12) === 0) {
          // Sometimes another open run is the one followed (the second run, a run of S…).
          const others = openRuns(d);
          id = others[rnd(others.length)].id;
        }
      }
    }
    const kinds = ['next', 'done', 'stepIn', 'back', 'pause', 'resume', 'home', 'reason', 'plan', 'jump:level', 'jump:path', 'start', 'new'];
    const routineEdits = ['remove', 'addStep', 'addWait', 'move', 'divider', 'repeat', 'open', 'reword', 'breakDown', 'toWait', 'toStep', 'rename', 'gives', 'renameValue'].map((e) => `routine:${e}`);
    const legacy = ['reword', 'add', 'remove', 'repeat', 'running at the edge'].map((e) => `legacy:${e}`);
    for (const what of [...kinds, ...routineEdits, ...legacy, 'the fold', 'a second run of the routine', 'value:field', 'value:sheet', 'a run with values', 'a value inside a routine entered as a step', 'a name given both above and inside', 'jump:deep']) expect(accepted[what] ?? 0, `accepted ${what} (of ${JSON.stringify(accepted)})`).toBeGreaterThanOrEqual(10);
    expect(deepest, JSON.stringify(accepted)).toBeGreaterThanOrEqual(4);
    expect(endings).toBeGreaterThan(100);
    // About 4 s alone on this machine; with the whole suite running beside it, more than vitest's default 5 s.
  }, 30_000);
});
