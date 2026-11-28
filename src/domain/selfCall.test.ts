/**
 * P-113: a routine can call itself. One test (or more) per line of the roadmap's *Done when* and of the batch brief:
 * a routine calls itself, directly or through another, each call its own level with its own inputs passed in (the
 * lead, not the question again); deep levels are named by the value they were called with, "…" in long paths; depth
 * stays bounded and is said; Find out ▢ works end to end; Plan adds a routine as its own step and says nothing scary.
 *
 * Expected values come from the roadmap, the owner's notes (2026-11-28: "Unpark self-calls" — "a routine calling
 * itself is to work, passing its inputs"), B-16 ("A routine can call itself", "A level is named by what it was
 * given") and DESIGN.md's Calls (inputs resolve typed → by name → asked; each the callee's own copy) — never from
 * running the engine.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { copyFromLibrary } from './library';
import { canCall, editRoutine, Env, Item, MAX_DEPTH, place, readRun, Result, RoutineEdit, runPath, runVerb, Verb, visibleValue } from './run';
import { homeShown, noticeFor, planView, runnerView, seeItAll } from './runView';
import { Data, emptyData, Id, Routine } from './types';
import { joinItems, nameKey } from './values';

const T0 = Date.UTC(2026, 10, 28, 9, 0, 0);
let n = 0;
let t = 0;
beforeEach(() => {
  n = 0;
  t = 0;
});
const env = (): Env => ({ now: new Date(T0 + 1000 * t++).toISOString(), id: () => `x${++n}` });
const go = (d: Data, verb: Verb): Result => runVerb(d, verb, env());
const ok = (d: Data, verb: Verb): Data => {
  const r = go(d, verb);
  expect(r.ok, `${JSON.stringify(verb)} refused: ${r.reason}`).toBe(true);
  return r.data;
};
const okEdit = (d: Data, routineId: Id, e: RoutineEdit): Data => {
  const r = editRoutine(d, routineId, e, env());
  expect(r.ok, `${JSON.stringify(e)} refused: ${r.reason}`).toBe(true);
  return r.data;
};
const step = (id: string, text = id): Item => {
  const m = /^(.*?)\s*>(\S.*)$/.exec(text);
  return m ? ({ id, text: m[1], out: m[2] } as Item) : { id, text };
};
const call = (id: string, to: string, extra: Record<string, unknown> = {}): Item => ({ id, ref: to, ...extra }) as Item;
const seq = (id: string, words: string, items: Item[], extra: Record<string, unknown> = {}): Routine => ({ id, words, named: true, createdAt: '2026-11-01T00:00:00.000Z', items, ...extra });
const block = (id: string, item: string, list: string, items: Item[]): Routine => seq(id, `For each ${item} in {${list}}`, items, { named: false, each: { item, list } });
const world = (...ss: Routine[]): Data => ({ ...emptyData(), routines: Object.fromEntries(ss.map((s) => [s.id, s])) });
const run = (d: Data, id: Id) => readRun(d, id)!;
const start = (d: Data, routineId: Id) => {
  const r = go(d, { kind: 'start', routineId });
  expect(r.ok).toBe(true);
  return { d: r.data, id: r.runId! };
};
const here = (d: Data, id: Id) => place(d, run(d, id))!.item!.id;
const seen = (d: Data, runId: Id, name: string) => {
  const e = visibleValue(d, run(d, runId), nameKey(name));
  return e ? joinItems(e.items) : '';
};
const asked = (d: Data, runId: Id) => runnerView(d, runId)!.fields.filter((f) => !f.text).map((f) => f.name);
const give = (d: Data, runId: Id, name: string, items: string[]) => ok(d, { kind: 'value', runId, name, text: joinItems(items), items, item: here(d, runId) });
const words = (d: Data, runId: Id) => runnerView(d, runId)!.step.words;
/** Next until the step's words are these (nothing given on the way). */
const to = (d: Data, runId: Id, w: string) => {
  for (let k = 0; k < 20 && words(d, runId) !== w; k++) d = ok(d, { kind: 'next', runId });
  expect(words(d, runId)).toBe(w);
  return d;
};

/** The library's "Find out ▢", copied as the person's own ("Find out about bees"), and a run of it. */
const FIND = 'State what you think the answer to {question} is, and what would change your mind';
const BEARS = 'Find what bears on {question}';
const LEADS = 'List the questions this raises';
const ANSWER = 'State the answer to {question}, from {sources} and what the leads gave';
function findOut() {
  const c = copyFromLibrary(emptyData(), 'lib-find-out', env(), { words: 'Find out about bees' });
  expect(c.ok).toBe(true);
  return { ...start(c.data, c.routineId!), routineId: c.routineId! };
}

describe('Find out ▢ (the final audit’s F1): a self-call passes its inputs', () => {
  it('Step in on its call to itself: the lead is the inner {question} — it is not asked again (red before P-113)', () => {
    let { d, id } = findOut();
    d = give(d, id, 'question', ['Is honey worth it?']);
    d = to(d, id, LEADS);
    d = give(d, id, 'leads', ['pricing', 'costs']);
    d = ok(d, { kind: 'next', runId: id });
    // On the call row inside the for each: lead 1 of 2.
    expect(runnerView(d, id)!.step).toMatchObject({ kind: 'routine', words: 'Find out about bees' });
    d = ok(d, { kind: 'stepIn', runId: id });
    expect(run(d, id).frames).toHaveLength(3);
    expect(words(d, id)).toBe(FIND);
    expect(asked(d, id)).toEqual([]);
    expect(seen(d, id, 'question')).toBe('pricing');
    expect(runnerView(d, id)!.step.parts).toContainEqual({ kind: 'value', name: 'question', text: 'pricing' });
    // Stored at the inner level, the called routine's own copy, given by the call row.
    const inner = run(d, id).values.filter((v) => v.level === 2);
    expect(inner.map((v) => [v.name, v.items])).toEqual([['question', ['pricing']]]);
    // It stays read on the next steps too (it is not cleared as a value given below the place).
    d = ok(d, { kind: 'next', runId: id });
    expect(words(d, id)).toBe(BEARS);
    expect(seen(d, id, 'question')).toBe('pricing');
    expect(asked(d, id)).toEqual([]);
  });

  it('end to end: each lead is passed in as the question of its own call; one a lead raises goes a level deeper; the answers are collected; the run finishes cleanly', () => {
    let { d, id } = findOut();
    const met: [number, string][] = [];
    const raised: Record<string, string[]> = { 'Is honey worth it?': ['pricing', 'costs'], pricing: ['who sets prices'] };
    let ended: Result | undefined;
    for (let k = 0; k < 120 && !ended; k++) {
      const v = runnerView(d, id)!;
      const q = seen(d, id, 'question');
      if (v.step.words === BEARS) met.push([v.depth, q]);
      // The question is never asked inside a call: only at the first level, where nothing passed it.
      if (v.depth > 1) expect(v.fields.map((f) => f.name)).not.toContain('question');
      if (v.depth === 1 && v.step.words === FIND) d = give(d, id, 'question', ['Is honey worth it?']);
      if (v.step.words === LEADS && raised[q]) d = give(d, id, 'leads', raised[q]);
      if (v.step.words === ANSWER) {
        if (v.depth === 1) {
          // What the leads gave stands here, collected, in the order given: to adjust into one answer.
          expect(v.fields.find((f) => f.name === 'answer')!.text).toBe('pricing: by the jar and costs: dear');
          d = give(d, id, 'answer', ['Yes, from the co-op']);
        } else {
          // (Under pricing, what its own lead gave is there to adjust first.)
          expect(v.fields.find((f) => f.name === 'answer')!.text).toBe(q === 'pricing' ? 'who sets prices: the co-op' : '');
          d = give(d, id, 'answer', [`${q}: ${{ pricing: 'by the jar', 'who sets prices': 'the co-op', costs: 'dear' }[q]}`]);
        }
      }
      if (v.middle === 'stepIn' && v.step.words === 'Find out about bees') {
        d = ok(d, { kind: 'stepIn', runId: id });
        continue;
      }
      const r = go(d, { kind: v.next === 'done' ? 'done' : 'next', runId: id });
      expect(r.ok, `${v.step.words}: ${r.reason}`).toBe(true);
      d = r.data;
      if (run(d, id).endedAt) ended = r;
    }
    expect(met).toEqual([
      [1, 'Is honey worth it?'],
      [3, 'pricing'],
      [5, 'who sets prices'],
      [3, 'costs'],
    ]);
    expect(ended?.said).toEqual({ kind: 'ended', name: 'Find out about bees' });
    // The outer loop went through its own leads only; what the run ends holding is the outer level's.
    const top = run(d, id).values.filter((v) => v.level === 0);
    expect(top.find((v) => v.name === 'leads')!.items).toEqual(['pricing', 'costs']);
    expect(top.find((v) => v.name === 'answer')!.items).toEqual(['Yes, from the co-op']);
  });
});

describe('each call its own level, with its own inputs passed in — directly, and through another', () => {
  /** "Count down": says {n}, names the next, calls itself with it. */
  const countdown = () => world(seq('C', 'Count down', [step('say', 'Say {n}'), step('nm', 'Name the next >m'), call('again', 'C', { with: [{ input: 'n', name: 'm' }] }), step('close', 'Close {n}')]));

  it('directly: an input passed by name is the inner level’s own copy; changed inside, the caller’s stays', () => {
    let { d, id } = start(countdown(), 'C');
    expect(asked(d, id)).toEqual(['n']);
    d = give(d, id, 'n', ['three']);
    d = ok(d, { kind: 'next', runId: id });
    d = give(d, id, 'm', ['two']);
    d = ok(d, { kind: 'next', runId: id });
    d = ok(d, { kind: 'stepIn', runId: id });
    expect(words(d, id)).toBe('Say {n}');
    expect(seen(d, id, 'n')).toBe('two');
    expect(asked(d, id)).toEqual([]);
    // Changed inside: the inner copy only.
    d = ok(d, { kind: 'value', runId: id, name: 'n', text: 'deux', item: 'say' });
    expect(seen(d, id, 'n')).toBe('deux');
    d = ok(d, { kind: 'next', runId: id });
    d = give(d, id, 'm', ['one']);
    d = ok(d, { kind: 'next', runId: id });
    // Two levels in: its own again.
    d = ok(d, { kind: 'stepIn', runId: id });
    expect(seen(d, id, 'n')).toBe('one');
    // Out of both (Step out twice): the caller's {n} is as it was.
    d = ok(d, { kind: 'done', runId: id });
    expect(seen(d, id, 'n')).toBe('deux');
    d = ok(d, { kind: 'done', runId: id });
    expect(run(d, id).frames).toHaveLength(1);
    expect(seen(d, id, 'n')).toBe('three');
  });

  it('through another: Ping calls Pong, Pong calls Ping — typed words, then by name, reach the third level', () => {
    const d0 = world(seq('PI', 'Ping', [step('hit', 'Hit {ball}'), call('pong', 'PO', { with: [{ input: 'ball', typed: 'red' }] })]), seq('PO', 'Pong', [step('ret', 'Return {ball}'), call('ping', 'PI')]));
    let { d, id } = start(d0, 'PI');
    d = give(d, id, 'ball', ['white']);
    d = ok(d, { kind: 'next', runId: id });
    d = ok(d, { kind: 'stepIn', runId: id });
    expect(seen(d, id, 'ball')).toBe('red');
    d = ok(d, { kind: 'next', runId: id });
    d = ok(d, { kind: 'stepIn', runId: id });
    expect(run(d, id).frames.map((f) => f.seq)).toEqual(['PI', 'PO', 'PI']);
    expect(words(d, id)).toBe('Hit {ball}');
    expect(seen(d, id, 'ball')).toBe('red');
    expect(asked(d, id)).toEqual([]);
    // Named by the value it was called with (Ping is open below it): "ball: red".
    expect(runnerView(d, id)).toMatchObject({ level: 'ball: red', parent: 'Pong', trail: ['Ping'] });
  });
});

describe('deep levels are named by the value they were called with; long paths are first › … › the last two', () => {
  /** Find out about bees, three levels of leads in: pricing › who sets prices › the co-op board. */
  function deep(levels: string[]) {
    let { d, id } = findOut();
    d = give(d, id, 'question', ['Is honey worth it?']);
    for (const lead of levels) {
      d = to(d, id, LEADS);
      d = give(d, id, 'leads', [lead]);
      d = ok(d, { kind: 'next', runId: id });
      d = ok(d, { kind: 'stepIn', runId: id });
    }
    return { d, id };
  }

  it('one level in: "Find out about bees › lead: pricing" — the for each holding the call is not named again', () => {
    const { d, id } = deep(['pricing']);
    expect(runPath(d, run(d, id), run(d, id).frames)).toEqual(['Find out about bees', 'lead: pricing']);
    const v = runnerView(d, id)!;
    expect(v).toMatchObject({ level: 'lead: pricing', parent: 'Find out about bees', moves: { stepOut: { name: 'lead: pricing' } } });
    expect(v.trail).toBeUndefined();
    // Not inside a routine calling itself: the path is as it always was.
    const top = findOut();
    expect(runnerView(top.d, top.id)).toMatchObject({ level: 'Find out about bees' });
    expect(runnerView(top.d, top.id)!.parent).toBeUndefined();
  });

  it('two in: the first, then the last two; three in: first › … › the last two (the "…" plain text); the tile, Jump to… and Step out’s notice name them the same', () => {
    const two = deep(['pricing', 'who sets prices']);
    expect(runnerView(two.d, two.id)).toMatchObject({ level: 'lead: who sets prices', parent: 'lead: pricing', trail: ['Find out about bees'] });
    const three = deep(['pricing', 'who sets prices', 'the co-op board']);
    const v = runnerView(three.d, three.id)!;
    expect(v).toMatchObject({ level: 'lead: the co-op board', parent: 'lead: who sets prices', trail: ['Find out about bees', '…'] });
    expect(v.depth).toBe(7);
    const tile = homeShown(three.d).find((x) => x.runId === three.id)!;
    expect(tile.path).toEqual(['Find out about bees', 'lead: pricing', 'lead: who sets prices', 'lead: the co-op board']);
    expect(seeItAll(three.d, three.id)!.levels.map((l) => l.words)).toEqual(['Find out about bees', 'For each lead in {leads}', 'lead: pricing', 'For each lead in {leads}', 'lead: who sets prices', 'For each lead in {leads}', 'lead: the co-op board']);
    const out = go(three.d, { kind: 'done', runId: three.id });
    expect(noticeFor('done', out.said).text).toBe('Left lead: the co-op board');
  });

  it('a long value is cut to 60 characters with "…"; spaces and line breaks read as one space', () => {
    const long = 'what the beekeepers’ association\nsays about   the price of raw honey this year';
    const { d, id } = deep([long]);
    const level = runnerView(d, id)!.level;
    expect(level.startsWith('lead: what the beekeepers’ association says about the price')).toBe(true);
    expect(level.endsWith('…')).toBe(true);
    expect(level.length).toBeLessThanOrEqual('lead: '.length + 60);
  });

  it('the values row shows the for each’s item once, the nearest (it is in the run at two levels)', () => {
    const { d, id } = deep(['pricing']);
    let e = to(d, id, LEADS);
    e = give(e, id, 'leads', ['who sets prices']);
    e = ok(e, { kind: 'next', runId: id });
    const leads = runnerView(e, id)!.values.filter((x) => x.name === 'lead');
    expect(leads.map((x) => x.items)).toEqual([['who sets prices']]);
  });
});

describe('depth stays bounded and is said; never a lockout', () => {
  it(`at ${MAX_DEPTH} levels (no more than 64) Step in is refused, the run unmoved; Next passes the call and Step out leaves the level`, () => {
    expect(MAX_DEPTH).toBeLessThanOrEqual(64);
    const d0 = world(seq('S', 'Say it again', [call('s', 'S', { with: [{ input: 'w', name: 'w' }] }), step('z', 'Say {w}')]));
    let { d, id } = start(d0, 'S');
    for (let i = 1; i < MAX_DEPTH; i++) d = ok(d, { kind: 'stepIn', runId: id });
    expect(run(d, id).frames).toHaveLength(MAX_DEPTH);
    expect(go(d, { kind: 'stepIn', runId: id })).toMatchObject({ ok: false, reason: 'too-deep', data: d });
    // The middle reads Plan there (Step in can't go deeper); Next and Step out are offered and work.
    expect(runnerView(d, id)!.middle).toBe('plan');
    const passed = ok(d, { kind: 'next', runId: id });
    expect(words(passed, id)).toBe('Say {w}');
    expect(run(passed, id).frames).toHaveLength(MAX_DEPTH);
    expect(run(ok(d, { kind: 'done', runId: id }), id).frames).toHaveLength(MAX_DEPTH - 1);
  });
});

describe('Plan adds a routine as its own step, and says nothing scary', () => {
  it('directly and through another: added as any call, offered by "@"; the row is closed (never opened in place), said "this routine"', () => {
    const d0 = world(seq('R', 'Research a question', [step('f', 'Find what bears on {question}')]), seq('PI', 'Ping', [step('hit', 'Hit {ball}'), call('pong', 'PO')]), seq('PO', 'Pong', [step('ret', 'Return {ball}')]));
    expect(canCall(d0, 'R', 'R')).toBe(true);
    const r = editRoutine(d0, 'R', { kind: 'addCall', routine: 'R' }, env());
    expect(r).toMatchObject({ ok: true });
    expect(r.said).toBeUndefined();
    const rows = planView(r.data, { routineId: 'R' })!.rows;
    expect(rows.map((x) => [x.depth, x.words, x.closed ?? null])).toEqual([
      [0, 'Find what bears on {question}', null],
      [0, 'Research a question', 'this'],
    ]);
    expect(rows[1].call).toMatchObject({ inputs: [{ input: 'question', mode: 'asks' }] });
    // Pong calls Ping: Plan of Ping opens Pong in place, and Ping inside it is closed.
    const d1 = okEdit(d0, 'PO', { kind: 'addCall', routine: 'PI' });
    expect(planView(d1, { routineId: 'PI' })!.rows.map((x) => [x.depth, x.words, x.closed ?? null])).toEqual([
      [0, 'Hit {ball}', null],
      [0, 'Pong', null],
      [1, 'Return {ball}', null],
      [1, 'Ping', 'this'],
    ]);
    // Planning another routine that calls one of them: the closed row is one open above, not this one.
    const d2 = world(...Object.values(d1.routines), seq('X', 'Practice', [call('px', 'PI')]));
    expect(planView(d2, { routineId: 'X' })!.rows.filter((x) => x.closed).map((x) => [x.depth, x.words, x.closed])).toEqual([[2, 'Ping', 'above']]);
  });

  it('a self-call inside a for each binds the item by name, as the library’s does', () => {
    const d0 = world(seq('R', 'Research a question', [step('f', 'Find what bears on {question}'), step('l', 'List the questions this raises >leads'), call('e', 'E')]), block('E', 'lead', 'leads', []));
    let d = okEdit(d0, 'E', { kind: 'addCall', routine: 'R' });
    const row = (d.routines.E.items as Item[])[0];
    d = okEdit(d, 'E', { kind: 'bind', item: row.id, input: 'question', to: { name: 'lead' } });
    expect(planView(d, { routineId: 'R' })!.rows.find((x) => x.closed)!.call).toMatchObject({ inputs: [{ input: 'question', mode: 'name', name: 'lead' }] });
  });
});
