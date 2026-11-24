/**
 * P-86: random walks over the engine (the scout's fuzz, kept). After every accepted verb the
 * invariants below hold, a refused verb returns the very same data, and one Undo of any single verb
 * restores the data exactly as it is saved. Seeded: the same walks every run.
 */
import { describe, expect, it } from 'vitest';

import { applyUndo, undoEntry } from './diff';
import { editRoutine, Env, MAX_DEPTH, place, readRoutine, readRun, Result, RoutineEdit, runVerb, RunState, Verb, view } from './run';
import { Data, emptyData, Id, Routine } from './types';

const NOW = '2026-11-24T10:00:00.000Z';
let n = 0;
let clock = 0;
const env = (): Env => ({ now: new Date(Date.parse(NOW) + 1000 * ++clock).toISOString(), id: () => `z${++n}` });
let seed = 1;
const rnd = (k: number) => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed % k;
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
    if (r.endedAt) {
      expect(d.runs[r.id].status, `${label}: an ended run is not current`).toBeUndefined();
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
    });
    // What is stored is what is read: nothing left for the reader to repair.
    const p = place(d, r)!;
    expect(p.repaired, `${label}: nothing to repair`).toBe(false);
    expect(!!r.waitingSince, `${label}: waiting-since exactly on a wait`).toBe(!!p.item && 'wait' in p.item);
  }
  // An unnamed sequence a run owns belongs to a run that is there.
  for (const s of Object.values(d.routines)) if (typeof s.ownerRunId === 'string') expect(d.runs[s.ownerRunId], `${label}: owner`).toBeDefined();
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

describe('random walks', () => {
  it('400 walks of 60 verbs: the invariants hold, refusals change nothing, and every verb is undone exactly', () => {
    // So the walks mean something: every kind of verb and edit must have been accepted, runs must have gone deep and ended.
    const accepted: Record<string, number> = {};
    let deepest = 0;
    let endings = 0;
    for (let w = 0; w < 400; w++) {
      seed = w + 1;
      const items = Array.from({ length: 1 + rnd(5) }, (_, i) => (rnd(4) === 0 ? { id: `w${i}`, wait: `w${i}` } : { id: `s${i}`, text: `s${i}` }));
      const R: Routine = { id: 'R', words: 'R', named: true, createdAt: NOW, items, ...(rnd(2) ? { repeatFrom: rnd(items.length) } : {}), ...(rnd(2) ? { repeat: 1 + rnd(3) } : {}), ...(rnd(2) ? { open: true } : {}), home: true };
      const S: Routine = { id: 'S', words: 'S', named: true, createdAt: NOW, items: [{ id: 'q', text: 'q' }, { id: 'v', wait: 'v' }], repeatFrom: 0 };
      let d: Data = { ...emptyData(), routines: { R, S } };
      const first = runVerb(d, { kind: 'start', routineId: 'R' }, env());
      d = first.data;
      let id: Id = first.runId!;
      invariants(d, `walk ${w} start`);
      for (let step = 0; step < 60; step++) {
        const prev = d;
        const run = readRun(d, id)!;
        const top = run.frames[run.frames.length - 1];
        const seen = view(d, run, top.seq)!;
        const anyItem = (s = seen) => s.items[rnd(s.items.length || 1)]?.id ?? 'none';
        const root = readRoutine(d, 'R')!;
        const changes = run.changes;
        const verbs: Verb[] = [
          { kind: 'next', runId: id },
          { kind: 'next', runId: id },
          { kind: 'next', runId: id },
          { kind: 'next', runId: id },
          { kind: 'done', runId: id },
          { kind: 'stepIn', runId: id },
          { kind: 'breakDown', runId: id, steps: ['a', 'b'].slice(0, 1 + rnd(2)) },
          { kind: 'back', runId: id },
          { kind: 'pause', runId: id, ...(rnd(2) ? { reason: 'why' } : {}) },
          { kind: 'resume', runId: id },
          { kind: 'home', runId: id },
          { kind: 'reason', runId: id, text: rnd(2) ? 'because' : '' },
          { kind: 'words', runId: id, text: `r${rnd(3)}` },
          { kind: 'keep', runId: id, change: rnd(2) ? 'all' : (changes[rnd(changes.length || 1)]?.id ?? 'none') },
          { kind: 'drop', runId: id, change: changes[rnd(changes.length || 1)]?.id ?? 'none' },
          { kind: 'jump', runId: id, to: { level: rnd(run.frames.length) } },
          { kind: 'jump', runId: id, to: { path: [anyItem(view(d, run, 'R')!)] } },
          { kind: 'edgeStep', runId: id, text: `edge${rnd(9)}` },
          { kind: 'edit', runId: id, edit: { kind: 'add', seq: top.seq, after: rnd(3) ? anyItem() : null, text: `plus${rnd(9)}` } },
          { kind: 'edit', runId: id, edit: { kind: 'addWait', seq: top.seq, after: anyItem(), wait: 'kettle' } },
          { kind: 'edit', runId: id, edit: { kind: 'remove', seq: top.seq, item: anyItem() } },
          { kind: 'edit', runId: id, edit: { kind: 'reword', seq: top.seq, item: anyItem(), text: `e${rnd(3)}` } },
          { kind: 'edit', runId: id, edit: { kind: 'repeat', seq: top.seq, ...(rnd(2) ? { repeat: 1 + rnd(3) } : {}) } },
          { kind: 'start', routineId: rnd(2) ? 'S' : 'R' },
          { kind: 'new', words: `goal ${rnd(3)}` },
        ];
        const edits: RoutineEdit[] = [
          { kind: 'remove', item: anyItem(root) },
          { kind: 'addStep', text: 'n' },
          { kind: 'addWait', wait: 'post', after: rnd(2) ? anyItem(root) : null },
          { kind: 'move', item: anyItem(root), by: rnd(2) ? 1 : -1 },
          { kind: 'divider', ...(rnd(3) ? { from: rnd(root.items.length || 1) } : {}) },
          { kind: 'repeat', ...(rnd(2) ? { times: 1 + rnd(3) } : {}) },
          { kind: 'open', open: !!rnd(2) },
          { kind: 'reword', item: anyItem(root), text: `w${rnd(3)}` },
        ];
        const k = rnd(verbs.length + edits.length);
        const verb = verbs[k];
        const out: Result = verb ? runVerb(d, verb, env()) : editRoutine(d, 'R', edits[k - verbs.length], env());
        const label = `walk ${w} step ${step} ${JSON.stringify(verb ?? edits[k - verbs.length])}`;
        if (!out.ok) {
          expect(out.data, `${label}: refused, so untouched`).toBe(prev);
          continue;
        }
        d = out.data;
        const edit = edits[k - verbs.length];
        const what = !verb ? `routine:${edit.kind}` : verb.kind === 'edit' ? `edit:${verb.edit.kind}` : verb.kind === 'jump' ? `jump:${'level' in verb.to ? 'level' : 'path'}` : verb.kind;
        accepted[what] = (accepted[what] ?? 0) + 1;
        deepest = Math.max(deepest, readRun(d, id)!.frames.length);
        if (readRun(d, id)!.endedAt) endings++;
        invariants(d, label);
        if (verb && (verb.kind === 'next' || verb.kind === 'done')) roundsDidNotSkip(run, readRun(d, id)!, label);
        // After the audit (D3): Keep changes where a change lives, never what the run reads.
        if (verb && verb.kind === 'keep') {
          const after = readRun(d, id)!;
          for (const seqId of Object.keys(prev.routines)) {
            const was = view(prev, run, seqId);
            const now = view(d, after, seqId);
            if (was && now) expect(now.items.map((i) => i.id), `${label}: Keep left ${seqId} reading the same`).toEqual(was.items.map((i) => i.id));
          }
        }
        // After the audit (B6): a Jump offers the unkept, not-yet-offered changes of every level it leaves.
        if (verb && verb.kind === 'jump') {
          const after = readRun(d, id)!;
          const stays = new Set(after.frames.map((f, i) => (run.frames[i]?.seq === f.seq ? f.seq : '')));
          const left = new Set(run.frames.filter((f) => !stays.has(f.seq)).map((f) => f.seq));
          const due = run.changes.filter((c) => !c.offered && (c.kind === 'breakdown' ? left.has(c.into) : left.has(c.seq))).map((c) => c.id);
          expect(out.offer.map((c) => c.id).sort(), `${label}: the Jump offers what it leaves`).toEqual(due.sort());
        }
        // What a verb offers to keep is this run's, and is marked offered in the same write.
        for (const c of out.offer) expect(readRun(d, id)!.changes.find((x) => x.id === c.id)?.offered, `${label}: offered`).toBe(true);
        expect(saved(applyUndo(d, undoEntry(prev, d))), `${label}: undone`).toEqual(saved(prev));
        // A start may have made another run the one to follow; an ended one is followed by a new start.
        if (out.runId) id = out.runId;
        if (readRun(d, id)!.endedAt) {
          const others = openRuns(d);
          if (others.length) id = others[rnd(others.length)].id;
          else {
            const again = runVerb(d, { kind: 'start', routineId: 'R' }, env());
            expect(again.ok, `${label}: start again`).toBe(true);
            d = again.data;
            id = again.runId!;
            invariants(d, `${label}: started again`);
          }
        }
      }
    }
    const kinds = ['next', 'done', 'stepIn', 'breakDown', 'back', 'pause', 'resume', 'home', 'reason', 'words', 'keep', 'drop', 'jump:level', 'jump:path', 'edgeStep', 'start', 'new'];
    const runEdits = ['add', 'addWait', 'remove', 'reword', 'repeat'].map((e) => `edit:${e}`);
    const routineEdits = ['remove', 'addStep', 'addWait', 'move', 'divider', 'repeat', 'open', 'reword'].map((e) => `routine:${e}`);
    for (const what of [...kinds, ...runEdits, ...routineEdits]) expect(accepted[what] ?? 0, `accepted ${what} (of ${JSON.stringify(accepted)})`).toBeGreaterThanOrEqual(10);
    expect(deepest, JSON.stringify(accepted)).toBeGreaterThanOrEqual(4);
    expect(endings).toBeGreaterThan(100);
  });
});
