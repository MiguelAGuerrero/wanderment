/**
 * P-98: random walks with calls. Routines that read and give a few names; Plan adds calls (P-113: one that makes a
 * routine call itself too), binds inputs, copies, removes routines; runs step in and out, give values, press
 * Next and Step out with what they owe. After every accepted verb or edit: nothing throws, a refused one returns
 * the very same data, what is stored survives JSON as it is, no run is deeper than the depth limit, every value is
 * in scope, a called routine's input is never written below it, and one Undo restores the data exactly. Seeded.
 * (P-113, rewritten: was "no routine holds itself" — the self-call was parked; now the walks must make some and run
 * them, and the depth bound holds.)
 */
import { describe, expect, it } from 'vitest';

import { applyUndo, undoEntry } from './diff';
import { editRoutine, Env, isRef, MAX_DEPTH, place, readRoutine, readRun, Result, RoutineEdit, runVerb, Verb } from './run';
import { runnerView } from './runView';
import { Data, emptyData, Id, Routine } from './types';
import { isEntry } from './values';

let n = 0;
let clock = 0;
const env = (): Env => ({ now: new Date(Date.parse('2026-11-27T10:00:00.000Z') + 1000 * ++clock).toISOString(), id: () => `f${++n}` });
let seed = 7;
const rnd = (k: number) => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return Math.floor(seed / 65536) % k;
};
const pick = <T,>(xs: T[]): T | undefined => (xs.length ? xs[rnd(xs.length)] : undefined);
const NAMES = ['a', 'b', 'c'];
const saved = (d: Data) => JSON.parse(JSON.stringify(d));

function world(): Data {
  const routines: Record<Id, Routine> = {};
  for (let r = 0; r < 4; r++) {
    const id = `R${r}`;
    const items = Array.from({ length: 1 + rnd(3) }, (_, i) => {
      const kind = rnd(3);
      const name = NAMES[rnd(NAMES.length)];
      return kind === 0 ? { id: `${id}s${i}`, text: `Give ${name}`, out: name } : kind === 1 ? { id: `${id}s${i}`, text: `Use {${name}}` } : { id: `${id}s${i}`, text: 'Plain' };
    });
    routines[id] = { id, words: `Routine ${r}`, named: true, createdAt: `2026-11-0${r + 1}T00:00:00.000Z`, items };
  }
  return { ...emptyData(), routines };
}

/** P-113: the routines that reach themselves through their rows (a call, a step broken down) — counted, so the walks are seen to make some. */
function selfHolding(d: Data): number {
  let n = 0;
  for (const id of Object.keys(d.routines)) {
    const seen = new Set<Id>();
    const todo = (readRoutine(d, id)?.items ?? []).filter(isRef).map((i) => i.ref);
    while (todo.length) {
      const x = todo.pop()!;
      if (x === id) {
        n++;
        break;
      }
      if (seen.has(x)) continue;
      seen.add(x);
      for (const i of readRoutine(d, x)?.items ?? []) if (isRef(i)) todo.push(i.ref);
    }
  }
  return n;
}
let selfMade = 0;
/** P-113: runs stood inside a routine already open below them (a self-call stepped into). */
let selfRun = 0;

function invariants(prev: Data, d: Data, label: string) {
  expect(saved(d), `${label}: survives JSON`).toEqual(d);
  if (selfHolding(d)) selfMade++;
  for (const id of Object.keys(d.runs)) {
    const r = readRun(d, id)!;
    if (r.endedAt) continue;
    expect(r.frames.length).toBeLessThanOrEqual(MAX_DEPTH);
    if (r.frames.some((f, i) => r.frames.slice(0, i).some((g) => g.seq === f.seq))) selfRun++;
    expect(place(d, r)!.repaired, `${label}: nothing to repair`).toBe(false);
    for (const raw of (d.runs[id].values as unknown[]) ?? []) expect(isEntry(raw), `${label}: a readable value`).toBe(true);
    for (const e of r.values) expect(e.level < r.frames.length && r.frames[e.level].seq === e.seq, `${label}: ${e.name}@${e.level} in scope`).toBe(true);
    // An input copy changed inside the called routine never reaches below it: values below are only ever added or kept, or the run moved down.
    const was = readRun(prev, id);
    if (was && !was.endedAt && was.frames.length === r.frames.length && was.frames.every((f, i) => f.seq === r.frames[i].seq && f.at === r.frames[i].at)) {
      const top = r.frames.length - 1;
      if (top > 0)
        for (const e of was.values.filter((v) => v.level < top)) {
          const now = r.values.find((v) => v.level === e.level && v.name === e.name);
          if (now) expect(now.items, `${label}: {${e.name}} below the called routine is untouched`).toEqual(e.items);
        }
    }
  }
}

describe('random walks with calls', () => {
  it('never throws; refusals change nothing; invariants hold; one Undo restores', () => {
    for (let walkNo = 0; walkNo < 60; walkNo++) {
      let d = world();
      for (let stepNo = 0; stepNo < 80; stepNo++) {
        const label = `walk ${walkNo} step ${stepNo}`;
        const routines = Object.keys(d.routines).filter((id) => readRoutine(d, id)?.named);
        const runs = Object.keys(d.runs).filter((id) => !readRun(d, id)!.endedAt);
        const runId = pick(runs);
        const v = runId ? runnerView(d, runId) : undefined;
        let r: Result;
        const choice = rnd(14);
        if (choice < 3) {
          const into = pick(Object.keys(d.routines))!;
          const items = readRoutine(d, into)?.items ?? [];
          const e: RoutineEdit = { kind: 'addCall', routine: pick(routines)!, ...(rnd(2) && items.length ? { after: pick(items)!.id } : {}) };
          r = editRoutine(d, into, e, env());
        } else if (choice === 3) {
          const into = pick(routines)!;
          const call = pick((readRoutine(d, into)?.items ?? []).filter(isRef));
          const kinds = [{ typed: `t${rnd(9)}` }, { name: NAMES[rnd(3)] }, { ask: true as const }, undefined];
          r = call ? editRoutine(d, into, { kind: 'bind', item: call.id, input: NAMES[rnd(3)], to: kinds[rnd(4)] }, env()) : { ok: false, data: d };
        } else if (choice === 4) r = editRoutine(d, pick(routines)!, { kind: 'copy', words: `Copy ${rnd(5)}` }, env());
        else if (choice === 5) r = editRoutine(d, pick(routines)!, rnd(4) ? { kind: 'renameValue', from: NAMES[rnd(3)], to: NAMES[rnd(3)] } : { kind: 'removeRoutine' }, env());
        else if (choice === 6 || !runId) {
          r = runVerb(d, { kind: 'start', routineId: pick(routines)! }, env());
          if (!r.ok && r.reason === 'running' && runId) r = runVerb(d, { kind: 'pause', runId }, env());
        } else if (choice <= 8) r = runVerb(d, { kind: 'stepIn', runId }, env());
        else if (choice === 9) r = runVerb(d, { kind: 'next', runId, ...(v?.nextOwes.length && { owed: v.nextOwes.map((name) => ({ name, text: `o${rnd(9)}` })) }) }, env());
        else if (choice === 10) r = runVerb(d, { kind: 'done', runId, ...(v?.stepOutOwes.length && { owed: v.stepOutOwes.map((name) => ({ name, text: `s${rnd(9)}` })) }) }, env());
        else if (choice === 11) r = runVerb(d, { kind: 'value', runId, name: NAMES[rnd(3)], text: rnd(5) ? `v${rnd(9)}` : '', ...(rnd(2) && v?.step.itemId && { item: v.step.itemId }) }, env());
        else {
          const verbs: Verb[] = [{ kind: 'back', runId }, { kind: 'resume', runId }, { kind: 'restart', runId, level: 0 }, { kind: 'next', runId }];
          r = runVerb(d, verbs[rnd(verbs.length)], env());
        }
        if (!r.ok) {
          expect(r.data, `${label}: refused, the same data`).toBe(d);
          continue;
        }
        invariants(d, r.data, label);
        expect(saved(applyUndo(r.data, undoEntry(d, r.data))), `${label}: one Undo restores`).toEqual(saved(d));
        d = r.data;
      }
    }
    // (P-113: the walks made routines that call themselves, and ran them.)
    expect(selfMade).toBeGreaterThan(0);
    expect(selfRun).toBeGreaterThan(0);
  });
});
