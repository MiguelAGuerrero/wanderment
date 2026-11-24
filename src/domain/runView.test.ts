/**
 * P-86: what the screens read (tiles, the runner, the panel, paused, See it all, this run's changes).
 * Expected values are the scout's panel table and B-11 (3.1–3.3, 9b), not the code's output.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { editRoutine, Env, Item, readRun, runVerb, Verb } from './run';
import { describeChanges, homeTiles, leftOff, noticeFor, panelView, pausedView, routineHue, routineView, runnerView, seeItAll, sinceWords, unkeptChanges, whatChanged } from './runView';
import { Data, emptyData, Id, Routine } from './types';

const T0 = Date.UTC(2026, 10, 24, 10, 0, 0);
let n = 0;
let t = 0;
beforeEach(() => {
  n = 0;
  t = 0;
});
const env = (): Env => ({ now: new Date(T0 + 1000 * t++).toISOString(), id: () => `x${++n}` });
const ok = (d: Data, verb: Verb) => {
  const r = runVerb(d, verb, env());
  expect(r.ok, `${JSON.stringify(verb)} refused: ${r.reason}`).toBe(true);
  return r;
};
const step = (id: string, text = id): Item => ({ id, text });
const wait = (id: string, w = id): Item => ({ id, wait: w });
const ref = (id: string, to: string): Item => ({ id, ref: to });
const seq = (id: string, words: string, items: Item[], extra: Record<string, unknown> = {}): Routine => ({ id, words, named: true, createdAt: '2026-11-01T00:00:00.000Z', items, ...extra });
const world = (...ss: Routine[]): Data => ({ ...emptyData(), routines: Object.fromEntries(ss.map((s) => [s.id, s])) });
const start = (d: Data, routineId: Id) => {
  const r = ok(d, { kind: 'start', routineId });
  return { d: r.data, id: r.runId! };
};
const walk = (d: Data, runId: Id, ...kinds: ('next' | 'done' | 'stepIn' | 'back')[]) => kinds.reduce((data, kind) => ok(data, { kind, runId }).data, d);

describe('home: tiles', () => {
  const made = (day: number) => ({ createdAt: `2026-11-${String(day).padStart(2, '0')}T00:00:00.000Z` });
  const home = () =>
    world(
      seq('acme', 'Apply to Acme', [step('a', 'Tailor the CV'), wait('w', 'a reply from Acme'), step('c', 'Book the call')], { home: true, ...made(3) }),
      seq('draw', 'Practise drawing', [step('d', 'Warm-up lines')], { home: true, ...made(1) }),
      seq('spanish', 'Feel at home in Spanish', [], { home: true, open: true, ...made(2) }),
      seq('proof', 'Proofread out loud', [step('p', 'Read it aloud')], made(4)), // not on home, nothing going
      seq('gone', 'Old thing', [step('o')], { home: true, removedAt: '2026-11-20T00:00:00.000Z', ...made(5) }),
    );

  it('nothing yet: no tiles; nothing going: every routine on home, each to Start, in the order they were first made', () => {
    expect(homeTiles(emptyData())).toEqual([]);
    const tiles = homeTiles(home());
    expect(tiles.map((x) => x.name)).toEqual(['Practise drawing', 'Feel at home in Spanish', 'Apply to Acme']);
    expect(tiles.every((x) => x.state === 'idle' && x.action === 'start' && !x.current && x.runId === undefined && x.at === undefined)).toBe(true);
  });

  it('a running run: its tile says running and the step it is at, to Resume, marked as the current one; the order does not change', () => {
    const { d, id } = start(home(), 'acme');
    const tiles = homeTiles(d);
    expect(tiles.map((x) => x.name)).toEqual(['Practise drawing', 'Feel at home in Spanish', 'Apply to Acme']);
    expect(tiles[2]).toMatchObject({ routineId: 'acme', runId: id, state: 'running', at: 'Tailor the CV', action: 'resume', current: true });
    expect(tiles[0].current).toBe(false);
  });

  it('a paused run reads as unfinished: "at <step>" and its reason (tidied); left by Home it still does', () => {
    const { d, id } = start(home(), 'acme');
    const paused = ok(d, { kind: 'pause', runId: id, reason: 'need the job ad open' }).data;
    expect(homeTiles(paused)[2]).toMatchObject({ state: 'paused', at: 'Tailor the CV', reason: 'need the job ad open', action: 'resume', current: true });
    const typed = ok(paused, { kind: 'reason', runId: id, text: '  need   the ad ' }).data;
    expect(homeTiles(typed)[2].reason).toBe('need the ad');
    const left = ok(typed, { kind: 'home', runId: id }).data;
    expect(homeTiles(left)[2]).toMatchObject({ state: 'paused', at: 'Tailor the CV', reason: 'need the ad', action: 'resume' });
  });

  it('a run resting on a wait reads as waiting: for what (its words in this run) and since when', () => {
    const { d, id } = start(home(), 'acme');
    let on = walk(d, id, 'next');
    expect(homeTiles(on)[2]).toMatchObject({ state: 'waiting', waitingFor: 'a reply from Acme', since: new Date(T0 + 1000).toISOString(), action: 'resume' });
    on = ok(on, { kind: 'words', runId: id, text: 'their answer' }).data;
    on = ok(on, { kind: 'pause', runId: id, reason: 'chased on Monday' }).data;
    expect(homeTiles(on)[2]).toMatchObject({ state: 'waiting', waitingFor: 'their answer', reason: 'chased on Monday' });
  });

  it('a run asking at the edge of a goal: no step to be at, and it says so', () => {
    const { d } = start(home(), 'spanish');
    expect(homeTiles(d)[1]).toMatchObject({ state: 'running', asking: true, action: 'resume' });
    expect(homeTiles(d)[1].at).toBeUndefined();
  });

  it('a routine not on home is a tile while it has a run going, and no longer once that run has ended; an ended run leaves its tile to Start', () => {
    const p = start(home(), 'proof');
    expect(homeTiles(p.d).map((x) => x.name)).toEqual(['Practise drawing', 'Feel at home in Spanish', 'Apply to Acme', 'Proofread out loud']);
    const ended = ok(p.d, { kind: 'done', runId: p.id }).data;
    expect(homeTiles(ended).map((x) => x.name)).toEqual(['Practise drawing', 'Feel at home in Spanish', 'Apply to Acme']);
    const a = start(home(), 'draw');
    expect(homeTiles(ok(a.d, { kind: 'next', runId: a.id }).data)[0]).toMatchObject({ state: 'idle', action: 'start' });
  });

  it('with nothing running, the run left last is the one marked; twenty tiles keep their order', () => {
    const a = start(home(), 'acme');
    let d = ok(a.d, { kind: 'pause', runId: a.id }).data;
    const b = ok(d, { kind: 'start', routineId: 'draw' });
    d = ok(b.data, { kind: 'pause', runId: b.runId! }).data;
    d = ok(d, { kind: 'home', runId: b.runId! }).data;
    expect(homeTiles(d).map((x) => [x.name, x.current])).toEqual([['Practise drawing', true], ['Feel at home in Spanish', false], ['Apply to Acme', false]]);
    const many = world(...Array.from({ length: 20 }, (_, i) => seq(`r${i}`, `Routine ${i}`, [step(`s${i}`)], { home: true, ...made(20 - i) })));
    expect(homeTiles(many).map((x) => x.routineId)).toEqual(Array.from({ length: 20 }, (_, i) => `r${19 - i}`));
    const one = start(many, 'r7');
    expect(homeTiles(one.d).map((x) => x.routineId)).toEqual(homeTiles(many).map((x) => x.routineId));
  });

  it('each tile has a colour that is its own for good (from the routine, not from where it sits)', () => {
    const tiles = homeTiles(home());
    expect(tiles.every((x) => [0, 1, 2, 3].includes(x.hue))).toBe(true);
    const { d } = start(home(), 'acme');
    expect(homeTiles(d).map((x) => x.hue)).toEqual(tiles.map((x) => x.hue));
  });

  it('where you left off: the runner while one runs, the paused screen while the one the app is on is paused, home otherwise', () => {
    expect(leftOff(emptyData())).toEqual({ kind: 'home' });
    const { d, id } = start(home(), 'acme');
    expect(leftOff(d)).toEqual({ kind: 'runner', runId: id });
    const paused = ok(d, { kind: 'pause', runId: id }).data;
    expect(leftOff(paused)).toEqual({ kind: 'paused', runId: id });
    expect(leftOff(ok(paused, { kind: 'home', runId: id }).data)).toEqual({ kind: 'home' });
    expect(leftOff(ok(d, { kind: 'done', runId: id }).data)).toEqual({ kind: 'home' });
  });

  it('since when, in words only', () => {
    const now = new Date(2026, 10, 24, 15, 0, 0); // a Tuesday
    const ago = (days: number) => new Date(2026, 10, 24 - days, 9, 0, 0).toISOString();
    expect(sinceWords(ago(0), now)).toBe('today');
    expect(sinceWords(ago(1), now)).toBe('yesterday');
    expect(sinceWords(ago(4), now)).toBe('Friday');
    // After the audit (B5, the orchestrator's ruling): beyond the last week it is a date, never "last week" / "a few weeks ago".
    expect(sinceWords(ago(7), now)).toBe('17 November');
    expect(sinceWords(new Date(2026, 2, 3).toISOString(), now)).toBe('3 March');
  });
});

describe('the runner', () => {
  const w = () =>
    world(
      seq('P', 'Job hunt', [step('x', 'Find a posting'), ref('lp', 'L'), wait('w', 'a reply'), ref('e', 'E')], { repeatFrom: 0 }),
      seq('L', 'Apply', [step('a', 'Tailor the CV'), step('b', 'Send it')], { repeatFrom: 1, repeat: 2 }),
      seq('E', 'Empty', []),
    );

  it('a plain step: the context line is the level (no parent at the first layer), Break it down in the middle, Next', () => {
    const { d, id } = start(w(), 'P');
    expect(runnerView(d, id)).toMatchObject({
      runId: id,
      name: 'Job hunt',
      status: 'running',
      level: 'Job hunt',
      depth: 1,
      step: { kind: 'step', words: 'Find a posting', itemId: 'x', seq: 'P' },
      lastOfRound: false,
      canBack: false,
      middle: 'break',
      next: 'next',
      thisRunOnly: false,
    });
    expect(runnerView(d, id)!.parent).toBeUndefined();
    expect(runnerView(d, id)!.waiting).toBeUndefined();
  });

  it('a routine as the step: the middle reads Step in; inside it the context line names the level and its parent', () => {
    let { d, id } = start(w(), 'P');
    d = walk(d, id, 'next');
    expect(runnerView(d, id)).toMatchObject({ step: { kind: 'routine', words: 'Apply' }, middle: 'stepIn', next: 'next', canBack: true });
    d = walk(d, id, 'stepIn');
    expect(runnerView(d, id)).toMatchObject({ level: 'Apply', parent: 'Job hunt', depth: 2, step: { kind: 'step', words: 'Tailor the CV', seq: 'L' }, canBack: false });
  });

  it('the last step of a round: only the last item of a level with a divider (not the part above it, not a level that runs once)', () => {
    let { d, id } = start(w(), 'P');
    d = walk(d, id, 'next', 'stepIn');
    expect(runnerView(d, id)!.lastOfRound).toBe(false); // a: above the divider
    d = walk(d, id, 'next');
    expect(runnerView(d, id)!.lastOfRound).toBe(true); // b: the last item, and it repeats
    const once = start(world(seq('R', 'R', [step('a'), step('b')])), 'R');
    expect(runnerView(walk(once.d, once.id, 'next'), once.id)!.lastOfRound).toBe(false);
    const single = start(world(seq('R', 'R', [step('a')], { repeatFrom: 0 })), 'R');
    expect(runnerView(single.d, single.id)!.lastOfRound).toBe(true); // a one-step loop: every step
  });

  it('a wait step: Next reads "It’s happened", the middle is dimmed, and it says what it waits for and since when', () => {
    let { d, id } = start(w(), 'P');
    d = walk(d, id, 'next', 'next');
    expect(runnerView(d, id)).toMatchObject({ step: { kind: 'wait', words: 'a reply' }, middle: 'disabled', next: 'itsHappened', waiting: { words: 'a reply', since: new Date(T0 + 2000).toISOString() } });
  });

  it('a routine with nothing in it behaves as a plain step with nothing to break down: the middle is dimmed', () => {
    let { d, id } = start(w(), 'P');
    d = walk(d, id, 'next', 'next', 'next');
    expect(runnerView(d, id)).toMatchObject({ step: { kind: 'routine', words: 'Empty' }, middle: 'disabled', next: 'next', lastOfRound: true });
  });

  it('the edge of a goal: no step, a field instead; the middle dimmed; Done still names the level', () => {
    const g = start(world(seq('G', 'Learn Spanish', [], { open: true })), 'G');
    expect(runnerView(g.d, g.id)).toMatchObject({ level: 'Learn Spanish', step: { kind: 'edge', words: '' }, middle: 'disabled', next: 'edge', lastOfRound: false, canBack: false });
  });

  it('a step this run changed says so; paused, left and ended runs say what they are; a run or routine that is gone has no view', () => {
    let { d, id } = start(w(), 'P');
    d = ok(d, { kind: 'words', runId: id, text: 'Find two postings' }).data;
    expect(runnerView(d, id)).toMatchObject({ step: { words: 'Find two postings' }, thisRunOnly: true });
    d = ok(d, { kind: 'breakDown', runId: id, steps: ['open the site'] }).data;
    expect(runnerView(d, id)).toMatchObject({ level: 'Find two postings', parent: 'Job hunt', step: { words: 'open the site' } });
    d = ok(d, { kind: 'pause', runId: id }).data;
    expect(runnerView(d, id)!.status).toBe('paused');
    d = ok(d, { kind: 'home', runId: id }).data;
    expect(runnerView(d, id)!.status).toBe('left');
    d = walk(d, id, 'done', 'done');
    expect(runnerView(d, id)!.status).toBe('ended');
    expect(runnerView(d, 'nope')).toBeUndefined();
    expect(runnerView({ ...d, routines: {} }, id)).toBeUndefined();
  });
});

describe('the pull-up panel', () => {
  // P: [x lp y]; L: [a | b c] 3 times.
  const w = (extra: Record<string, unknown> = { repeatFrom: 1, repeat: 3 }) => world(seq('P', 'Parent', [step('x'), ref('lp', 'L'), step('y')]), seq('L', 'Loop', [step('a'), step('b'), step('c')], extra));
  const inL = (extra?: Record<string, unknown>) => {
    const s = start(w(extra), 'P');
    return { d: walk(s.d, s.id, 'next', 'stepIn'), id: s.id };
  };

  it('the round: none above the divider; "Round 2 of 3" in a counted part; "Round 4" until I’m done; none for a part that runs once', () => {
    let { d, id } = inL();
    expect(panelView(d, id)!.round).toBeUndefined(); // on a, the setup
    d = walk(d, id, 'next');
    expect(panelView(d, id)!.round).toEqual({ n: 1, of: 3 });
    d = walk(d, id, 'next', 'next');
    expect(panelView(d, id)!.round).toEqual({ n: 2, of: 3 });
    const until = inL({ repeatFrom: 0 });
    expect(panelView(walk(until.d, until.id, 'next', 'next', 'next', 'next', 'next', 'next', 'next', 'next', 'next'), until.id)!.round).toEqual({ n: 4 });
    const once = inL({});
    expect(panelView(once.d, once.id)!.round).toBeUndefined();
    expect(panelView(walk(once.d, once.id, 'done'), once.id)!.round).toBeUndefined(); // back in the parent, which runs once
  });

  it('a number set below the round you are on reads "Round 3", never "Round 3 of 2"', () => {
    let { d, id } = inL();
    d = walk(d, id, 'next', 'next', 'next', 'next', 'next'); // b round 3
    expect(panelView(d, id)!.round).toEqual({ n: 3, of: 3 });
    d = editRoutine(d, 'L', { kind: 'repeat', times: 2 }, env()).data;
    expect(panelView(d, id)!.round).toEqual({ n: 3 });
  });

  it('"Last step of the round" and "then:": the next step; at a wrap the first repeating step; on the last round the parent’s next step', () => {
    let { d, id } = inL();
    expect(panelView(d, id)).toMatchObject({ lastOfRound: false, then: 'b' });
    d = walk(d, id, 'next', 'next'); // c round 1
    expect(panelView(d, id)).toMatchObject({ lastOfRound: true, then: 'b' });
    d = walk(d, id, 'next', 'next', 'next', 'next'); // c round 3
    expect(panelView(d, id)).toMatchObject({ round: { n: 3, of: 3 }, lastOfRound: true, then: 'y' });
  });

  it('"then:" is nothing when Next would end the run or ask at the edge; it always agrees with what Next does', () => {
    const ends = start(world(seq('R', 'R', [step('a')])), 'R');
    expect(panelView(ends.d, ends.id)!.then).toBeUndefined();
    const asks = start(world(seq('G', 'G', [step('a')], { open: true })), 'G');
    expect(panelView(asks.d, asks.id)!.then).toBeUndefined();
    expect(panelView(walk(asks.d, asks.id, 'next'), asks.id)!.then).toBeUndefined(); // at the edge
    let { d, id } = inL();
    for (let i = 0; i < 7; i++) {
      const said = panelView(d, id)!.then;
      d = walk(d, id, 'next');
      expect(runnerView(d, id)!.step.words).toBe(said);
    }
  });

  it('"This run only" and Keep in <routine>: while a level in the stack has an unkept change, naming the routine it would go into', () => {
    let { d, id } = inL();
    expect(panelView(d, id)).toMatchObject({ thisRunOnly: false });
    expect(panelView(d, id)!.keepIn).toBeUndefined();
    d = ok(d, { kind: 'breakDown', runId: id, steps: ['half', 'other half'] }).data;
    const p = panelView(d, id)!;
    expect(p.thisRunOnly).toBe(true);
    expect(p.keepIn).toMatchObject({ name: 'Loop' });
    expect(p.keepIn!.changes).toMatchObject([{ kind: 'breakdown', words: 'a', steps: ['half', 'other half'] }]);
    // Left for the parent level and beyond: the change is still in the stack only while its level is.
    d = walk(d, id, 'done', 'done');
    expect(panelView(d, id)).toMatchObject({ thisRunOnly: false });
    expect(panelView(ok(d, { kind: 'keep', runId: id, change: 'all' }).data, id)!.thisRunOnly).toBe(false);
  });

  it('Back to <step>: the words of the step before, or nothing; Change the words only on a step or a wait', () => {
    let { d, id } = inL();
    expect(panelView(d, id)!.backTo).toBeUndefined();
    expect(panelView(d, id)!.canChangeWords).toBe(true);
    d = walk(d, id, 'next');
    expect(panelView(d, id)!.backTo).toBe('a');
    const fresh = start(w(), 'P');
    expect(panelView(walk(fresh.d, fresh.id, 'next'), fresh.id)).toMatchObject({ backTo: 'x', canChangeWords: false });
  });

  it('on a wait: what it waits for and since when', () => {
    const s = start(world(seq('R', 'R', [wait('w', 'the kettle'), step('b')])), 'R');
    expect(panelView(s.d, s.id)!.wait).toEqual({ words: 'the kettle', since: new Date(T0).toISOString() });
    expect(panelView(walk(s.d, s.id, 'next'), s.id)!.wait).toBeUndefined();
  });
});

describe('paused', () => {
  const w = () => world(seq('A', 'Apply to Acme', [step('a', 'Tailor the CV'), wait('w', 'a reply')]), seq('B', 'Practise drawing', [step('b', 'Warm-up lines')]), seq('C', 'Read', [step('c', 'One chapter')]));

  it('the run, its reason as typed (the field is bound to it), and whatever else can be resumed, last touched first, each to Resume', () => {
    const a = start(w(), 'A');
    let d = ok(a.d, { kind: 'pause', runId: a.id }).data;
    const b = ok(d, { kind: 'start', routineId: 'B' });
    d = ok(b.data, { kind: 'pause', runId: b.runId! }).data;
    const c = ok(d, { kind: 'start', routineId: 'C' });
    d = ok(c.data, { kind: 'pause', runId: c.runId! }).data;
    d = ok(d, { kind: 'reason', runId: c.runId!, text: 'eyes tired ' }).data;
    const v = pausedView(d, c.runId!)!;
    expect(v).toMatchObject({ runId: c.runId, name: 'Read', kind: 'paused', at: 'One chapter', reason: 'eyes tired ' });
    expect(v.others.map((x) => [x.name, x.action, x.at])).toEqual([['Practise drawing', 'resume', 'Warm-up lines'], ['Apply to Acme', 'resume', 'Tailor the CV']]);
    expect(pausedView(a.d, a.id)!.reason).toBe('');
    expect(pausedView(a.d, a.id)!.others).toEqual([]);
  });

  it('a run resting on a wait is "Waiting": what for and since when', () => {
    const a = start(w(), 'A');
    const d = ok(walk(a.d, a.id, 'next'), { kind: 'pause', runId: a.id }).data;
    expect(pausedView(d, a.id)).toMatchObject({ kind: 'waiting', at: 'a reply', waiting: { words: 'a reply', since: new Date(T0 + 1000).toISOString() } });
  });

  it('an ended run, or one that is gone, has no paused screen', () => {
    const a = start(w(), 'A');
    expect(pausedView(ok(a.d, { kind: 'done', runId: a.id }).data, a.id)).toBeUndefined();
    expect(pausedView(a.d, 'nope')).toBeUndefined();
  });
});

describe('See it all (this run) and Jump to…', () => {
  const w = () =>
    world(
      seq('P', 'Job hunt', [step('x', 'Find a posting'), ref('lp', 'L'), step('y', 'Log it')], { repeatFrom: 1, repeat: 2 }),
      seq('L', 'Apply', [step('a', 'Tailor the CV'), wait('w', 'a reply')]),
    );

  it('titled as the run; every step once, routines opened in place, each with its path for Jump here; the place marked "here", the levels on the way marked', () => {
    let { d, id } = start(w(), 'P');
    d = walk(d, id, 'next', 'stepIn', 'next');
    const v = seeItAll(d, id)!;
    expect(v.name).toBe('Job hunt');
    expect(v.rows.map((r) => [r.depth, r.kind, r.words, r.path.join('/'), r.here, r.within])).toEqual([
      [0, 'step', 'Find a posting', 'x', false, false],
      [0, 'routine', 'Apply', 'lp', false, true],
      [1, 'step', 'Tailor the CV', 'lp/a', false, false],
      [1, 'wait', 'a reply', 'lp/w', true, false],
      [0, 'step', 'Log it', 'y', false, false],
    ]);
    expect(v.levels).toEqual([{ level: 0, words: 'Job hunt', here: false }, { level: 1, words: 'Apply', here: true }]);
    // The Repeat divider is shown where it stands, with its number.
    expect(v.rows.map((r) => r.divider)).toEqual([undefined, { repeat: 2 }, undefined, undefined, undefined]);
    // Jump here takes the row's path as it is.
    const jumped = ok(d, { kind: 'jump', runId: id, to: { path: v.rows[4].path } }).data;
    expect(seeItAll(jumped, id)!.rows.filter((r) => r.here).map((r) => r.words)).toEqual(['Log it']);
  });

  it('what this run changed is marked "this run only", with the change to keep or drop: a reword, a breakdown, an addition', () => {
    let { d, id } = start(w(), 'P');
    d = ok(d, { kind: 'words', runId: id, text: 'Find two postings' }).data;
    d = ok(d, { kind: 'edit', runId: id, edit: { kind: 'add', seq: 'P', after: 'y', text: 'Tell Ana' } }).data;
    d = ok(d, { kind: 'edit', runId: id, edit: { kind: 'remove', seq: 'L', item: 'w' } }).data;
    d = ok(d, { kind: 'breakDown', runId: id, steps: ['open the site'] }).data;
    const changes = readRun(d, id)!.changes;
    const rows = seeItAll(d, id)!.rows;
    expect(rows.map((r) => [r.depth, r.words, r.thisRunOnly])).toEqual([
      [0, 'Find two postings', true],
      [1, 'open the site', false],
      [0, 'Apply', false],
      [1, 'Tailor the CV', false],
      [0, 'Log it', false],
      [0, 'Tell Ana', true],
    ]);
    expect(rows[0].changeId).toBe(changes.find((c) => c.kind === 'breakdown')!.id);
    expect(rows[5].changeId).toBe(changes.find((c) => c.kind === 'add')!.id);
    // What was taken out has no row: it is listed with the other changes.
    expect(unkeptChanges(d, id).map((c) => [c.kind, c.words, c.in])).toEqual([
      ['reword', 'Find two postings', 'Job hunt'],
      ['add', 'Tell Ana', 'Job hunt'],
      ['remove', 'a reply', 'Apply'],
      ['breakdown', 'Find two postings', 'Job hunt'],
    ]);
    expect(unkeptChanges(d, id)[0]).toMatchObject({ was: 'Find a posting' });
  });

  it('a thirty-step routine, a frame ten deep and a routine that holds itself: listed, bounded, never endless', () => {
    const big = start(world(seq('B', 'Big', Array.from({ length: 30 }, (_, i) => step(`s${i}`)))), 'B');
    expect(seeItAll(big.d, big.id)!.rows).toHaveLength(30);
    let { d, id } = start(world(seq('R', 'R', [step('a')])), 'R');
    for (let i = 0; i < 9; i++) d = ok(d, { kind: 'breakDown', runId: id, steps: ['deeper'] }).data;
    const deep = seeItAll(d, id)!;
    expect(deep.levels).toHaveLength(10);
    expect(deep.rows).toHaveLength(10);
    expect(deep.rows[9]).toMatchObject({ depth: 9, here: true });
    expect(deep.rows[9].path).toHaveLength(10);
    const self = start(world(seq('S', 'Self', [step('a'), ref('s', 'S')])), 'S');
    const rows = seeItAll(self.d, self.id)!.rows;
    expect(rows.map((r) => r.words)).toEqual(['a', 'Self']); // it is not opened inside itself
  });
});

describe('this run’s unkept changes', () => {
  it('each with what it says, what it was and where it would be kept; the ones a verb offers are described the same way; kept ones are gone', () => {
    let { d, id } = start(world(seq('R', 'Report', [step('a', 'Write report'), step('b', 'Send it')], { repeatFrom: 0, repeat: 2 })), 'R');
    expect(unkeptChanges(d, id)).toEqual([]);
    d = ok(d, { kind: 'edit', runId: id, edit: { kind: 'repeat', seq: 'R', repeat: 5 } }).data;
    d = ok(d, { kind: 'breakDown', runId: id, steps: ['outline', 'draft'] }).data;
    d = ok(d, { kind: 'words', runId: id, text: 'outline it' }).data;
    expect(unkeptChanges(d, id).map((c) => ({ kind: c.kind, words: c.words, was: c.was, steps: c.steps, repeat: c.repeat, in: c.in, offered: c.offered }))).toEqual([
      { kind: 'repeat', words: '', was: undefined, steps: undefined, repeat: 5, in: 'Report', offered: false },
      { kind: 'breakdown', words: 'Write report', was: undefined, steps: ['outline it', 'draft'], repeat: undefined, in: 'Report', offered: false },
      { kind: 'reword', words: 'outline it', was: 'outline', steps: undefined, repeat: undefined, in: 'Write report', offered: false },
    ]);
    const left = ok(d, { kind: 'done', runId: id });
    expect(describeChanges(left.data, id, left.offer.map((c) => c.id)).map((c) => c.kind)).toEqual(['breakdown', 'reword']);
    expect(unkeptChanges(left.data, id).map((c) => c.offered)).toEqual([false, true, true]);
    const kept = ok(left.data, { kind: 'keep', runId: id, change: 'all' }).data;
    expect(unkeptChanges(kept, id)).toEqual([]);
  });
});

describe('the plain routine editor reads', () => {
  it('the name, the items in order with their kind, where the divider stands, the number, ends here or open, and whether a run is going', () => {
    const d = world(seq('R', 'Report', [step('a', 'Write'), wait('w', 'a reply'), ref('k', 'K')], { repeatFrom: 1, repeat: 3, open: true }), seq('K', 'Kit', []));
    expect(routineView(d, 'R')).toEqual({
      id: 'R',
      name: 'Report',
      named: true,
      open: true,
      repeatFrom: 1,
      repeat: 3,
      items: [{ id: 'a', kind: 'step', words: 'Write' }, { id: 'w', kind: 'wait', words: 'a reply' }, { id: 'k', kind: 'routine', words: 'Kit' }],
    });
    expect(routineView(d, 'K')).toEqual({ id: 'K', name: 'Kit', named: true, open: false, items: [] });
    const s = start(d, 'R');
    expect(routineView(s.d, 'R')!.runId).toBe(s.id);
    expect(routineView(d, 'nope')).toBeUndefined();
    expect(routineView(editRoutine(d, 'R', { kind: 'removeRoutine' }, env()).data, 'R')).toBeUndefined();
  });
});

describe('the notice after an action', () => {
  it('"Finished <name>" for what finished by itself (the largest thing just completed), "Done with <name>" for what Done left, "Jumped from <step>"; otherwise the step speaks for itself', () => {
    expect(noticeFor('next', { kind: 'finished', names: ['Inner', 'Middle'] })).toEqual({ text: 'Finished Middle', label: 'Next' });
    expect(noticeFor('next', { kind: 'ended', name: 'Apply to Initech' })).toEqual({ text: 'Finished Apply to Initech', label: 'Next' });
    expect(noticeFor('done', { kind: 'finished', names: ['Inner', 'Middle'] })).toEqual({ text: 'Done with Inner', label: 'Done' });
    expect(noticeFor('done', { kind: 'ended', name: 'Job hunt' })).toEqual({ text: 'Done with Job hunt', label: 'Done' });
    expect(noticeFor('jump', { kind: 'jumped', from: 'Tailor the CV' })).toEqual({ text: 'Jumped from Tailor the CV', label: 'Jump' });
    expect(noticeFor('next', undefined)).toEqual({ text: '', label: 'Next' });
    expect(noticeFor('next', { kind: 'edge' })).toEqual({ text: '', label: 'Next' });
    expect(noticeFor('next', undefined, true)).toEqual({ text: '', label: 'It’s happened' });
    expect(noticeFor('breakDown', undefined).label).toBe('Break it down');
  });
});

// P-86 part 2 (the screens): a reason given at Pause stays readable on the runner — in the panel —
// until the first Next after Resume, then it is dropped (B-11 §3.3, §9b; J35-e).
describe('the panel: the reason, after Resume', () => {
  const world2 = () => start(world(seq('r', 'Apply', [step('a', 'Read the ad'), step('b', 'Tailor the CV'), step('c', 'Send it')])), 'r');
  it('no reason: nothing to read', () => {
    const { d, id } = world2();
    expect(panelView(d, id)!.reason).toBeUndefined();
  });
  it('paused with a reason, then resumed: the panel reads it, tidied', () => {
    const { d, id } = world2();
    const paused = ok(d, { kind: 'pause', runId: id, reason: '  need the   job ad open ' }).data;
    const resumed = ok(paused, { kind: 'resume', runId: id }).data;
    expect(panelView(resumed, id)!.reason).toBe('need the job ad open');
  });
  it('a reason typed in place on the paused screen reads the same way', () => {
    const { d, id } = world2();
    const paused = ok(d, { kind: 'pause', runId: id }).data;
    const typed = ok(paused, { kind: 'reason', runId: id, text: 'lunch  ' }).data;
    expect(panelView(ok(typed, { kind: 'resume', runId: id }).data, id)!.reason).toBe('lunch');
  });
  it('the first Next after Resume drops it', () => {
    const { d, id } = world2();
    const resumed = ok(ok(d, { kind: 'pause', runId: id, reason: 'lunch' }).data, { kind: 'resume', runId: id }).data;
    expect(panelView(walk(resumed, id, 'next'), id)!.reason).toBeUndefined();
  });
  it('a blank reason is no reason', () => {
    const { d, id } = world2();
    const paused = ok(d, { kind: 'pause', runId: id }).data;
    const typed = ok(paused, { kind: 'reason', runId: id, text: '   ' }).data;
    expect(panelView(typed, id)!.reason).toBeUndefined();
  });
});

// ───────── After the audit (P-86): B4, B5, U6, U5 ─────────

describe('after the audit: since when (B4, B5)', () => {
  const now = new Date(2026, 10, 24, 15, 0, 0); // Tuesday 24 November 2026
  const ago = (days: number) => new Date(2026, 10, 24 - days, 9, 0, 0).toISOString();
  it('within the last week: today, yesterday, then the day’s name', () => {
    expect(sinceWords(ago(0), now)).toBe('today');
    expect(sinceWords(ago(1), now)).toBe('yesterday');
    expect(sinceWords(ago(2), now)).toBe('Sunday');
    expect(sinceWords(ago(6), now)).toBe('Wednesday');
  });
  it('before that: the date — never "last week", "a few weeks ago" or "earlier this month"', () => {
    expect(sinceWords(ago(7), now)).toBe('17 November');
    expect(sinceWords(ago(13), now)).toBe('11 November');
    expect(sinceWords(ago(21), now)).toBe('3 November');
    expect(sinceWords(ago(27), now)).toBe('28 October');
    for (let days = 7; days < 400; days += 3) expect(sinceWords(ago(days), now)).toMatch(/^\d{1,2} [A-Z][a-z]+( \d{4})?$/);
  });
  it('another year says its year', () => {
    expect(sinceWords(new Date(2025, 11, 30, 9).toISOString(), now)).toBe('30 December 2025');
  });
  it('a date that is not a date reads as nothing — never "undefined NaN"', () => {
    for (const bad of ['banana', '', '2026-13-45', 'NaN']) expect(sinceWords(bad, now)).toBe('');
    expect(sinceWords(undefined as unknown as string, now)).toBe('');
  });
  it('a run whose waiting-since is damaged: the tile, the panel and the paused screen leave "since" out', () => {
    const s = start(world(seq('r', 'Apply', [wait('w', 'a reply')], { home: true })), 'r');
    const d: Data = { ...s.d, runs: { ...s.d.runs, [s.id]: { ...s.d.runs[s.id], waitingSince: 'banana' } } };
    expect(homeTiles(d)[0].since).toBeUndefined();
    expect(panelView(d, s.id)!.wait).toEqual({ words: 'a reply' });
    expect(pausedView(d, s.id)!.waiting).toEqual({ words: 'a reply' });
    expect(runnerView(d, s.id)!.waiting).toEqual({ words: 'a reply' });
  });
});

describe('after the audit: tile colours are spread (U6)', () => {
  const made = (i: number) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString();
  const many = (k: number) => world(...Array.from({ length: k }, (_, i) => seq(`r${i}`, `Routine ${i}`, [step(`s${i}`)], { home: true, createdAt: made(i) })));
  it('in the order they were made the colours go round the palette: neighbours always differ', () => {
    const hues = homeTiles(many(9)).map((x) => x.hue);
    expect(hues).toEqual([0, 1, 2, 3, 0, 1, 2, 3, 0]);
  });
  it('whatever the ids are (the four that all came out one colour)', () => {
    const d = world(...['apply', 'acme', 'draw', 'spanish'].map((id, i) => seq(id, id, [step(`s${i}`)], { home: true, createdAt: made(i) })));
    expect(new Set(homeTiles(d).map((x) => x.hue)).size).toBe(4);
  });
  it('a colour is a routine’s for good: a later routine, a removed one or a run changes no other colour', () => {
    const d = many(6);
    const was = Object.fromEntries(homeTiles(d).map((x) => [x.routineId, x.hue]));
    const more: Data = { ...d, routines: { ...d.routines, late: seq('late', 'Late', [step('l')], { home: true, createdAt: made(50) }), r2: { ...d.routines.r2, removedAt: made(60) } } };
    const run1 = start(more, 'r4').d;
    for (const t of homeTiles(run1)) if (t.routineId in was) expect(t.hue).toBe(was[t.routineId]);
    expect(homeTiles(run1).find((x) => x.routineId === 'late')!.hue).toBe(6 % 4);
  });
  it('the note and the paused screen’s rows use the same colour as the tile', () => {
    const d = many(7);
    for (const t of homeTiles(d)) expect(routineHue(d, t.routineId)).toBe(t.hue);
    expect([0, 1, 2, 3]).toContain(routineHue(d, 'not-there'));
  });
});

describe('after the audit: the notice names what was done (U5)', () => {
  const R = () => world(seq('r', 'Apply to Acme', [step('a', 'Read the ad'), wait('w', 'a reply'), step('b', 'Tailor the CV')], { home: true, repeatFrom: 0 }));
  it('the routine editor: each edit names the thing', () => {
    const d = R();
    const says = (edit: Parameters<typeof editRoutine>[2]) => whatChanged(d, { kind: 'editRoutine', routineId: 'r', edit });
    expect(says({ kind: 'remove', item: 'b' })).toBe('Removed “Tailor the CV”');
    expect(says({ kind: 'reword', item: 'b', text: 'Fix the CV' })).toBe('Changed “Tailor the CV”');
    expect(says({ kind: 'move', item: 'a', by: 1 })).toBe('Moved “Read the ad”');
    expect(says({ kind: 'addStep', text: '  Send   it ' })).toBe('Added “Send it”');
    expect(says({ kind: 'addWait', wait: 'the post' })).toBe('Added a wait for “the post”');
    expect(says({ kind: 'rename', words: 'Apply' })).toBe('Renamed “Apply to Acme”');
    expect(says({ kind: 'removeRoutine' })).toBe('Removed “Apply to Acme”');
    expect(says({ kind: 'divider' })).toBe('Changed Repeat from here');
    expect(says({ kind: 'repeat', times: 3 })).toBe('Changed Repeat from here');
    expect(says({ kind: 'open', open: false })).toBe('Changed Ends here');
  });
  it('a run: its own changes name the step, and say they are this run’s', () => {
    const s = start(R(), 'r');
    expect(whatChanged(s.d, { kind: 'words', runId: s.id, text: 'x' })).toBe('Changed “Read the ad”');
    expect(whatChanged(s.d, { kind: 'breakDown', runId: s.id, steps: ['x'] })).toBe('Broke down “Read the ad”');
    expect(whatChanged(s.d, { kind: 'breakDown', runId: s.id, steps: ['x'], at: { seq: 'r', item: 'b' } })).toBe('Broke down “Tailor the CV”');
    expect(whatChanged(s.d, { kind: 'edgeStep', runId: s.id, text: ' Send it ' })).toBe('Added “Send it”');
    expect(whatChanged(s.d, { kind: 'edit', runId: s.id, edit: { kind: 'remove', seq: 'r', item: 'b' } })).toBe('Removed “Tailor the CV”');
    expect(whatChanged(s.d, { kind: 'edit', runId: s.id, edit: { kind: 'add', seq: 'r', after: 'a', text: 'Sleep on it' } })).toBe('Added “Sleep on it”');
    expect(whatChanged(s.d, { kind: 'edit', runId: s.id, edit: { kind: 'addWait', seq: 'r', after: 'a', wait: 'Sam' } })).toBe('Added a wait for “Sam”');
    expect(whatChanged(s.d, { kind: 'edit', runId: s.id, edit: { kind: 'reword', seq: 'r', item: 'w', text: 'x' } })).toBe('Changed “a reply”');
    expect(whatChanged(s.d, { kind: 'edit', runId: s.id, edit: { kind: 'repeat', seq: 'r', repeat: 2 } })).toBe('Changed Repeat from here');
  });
  it('Keep and Drop name what was kept or dropped', () => {
    const s = start(R(), 'r');
    const d = ok(s.d, { kind: 'words', runId: s.id, text: 'Read the ad twice' }).data;
    const c = unkeptChanges(d, s.id)[0].id;
    expect(whatChanged(d, { kind: 'keep', runId: s.id, change: c })).toBe('Kept “Read the ad twice” in Apply to Acme');
    expect(whatChanged(d, { kind: 'keep', runId: s.id, change: 'all' })).toBe('Kept “Read the ad twice” in Apply to Acme');
    expect(whatChanged(d, { kind: 'drop', runId: s.id, change: c })).toBe('Dropped “Read the ad twice”');
    const two = ok(d, { kind: 'edit', runId: s.id, edit: { kind: 'reword', seq: 'r', item: 'b', text: 'Fix the CV' } }).data;
    expect(whatChanged(two, { kind: 'keep', runId: s.id, change: 'all' })).toBe('Kept in Apply to Acme');
  });
  it('what speaks for itself says nothing more (the step simply changed)', () => {
    const s = start(R(), 'r');
    for (const kind of ['next', 'done', 'pause', 'resume', 'back', 'stepIn', 'home'] as const) expect(whatChanged(s.d, { kind, runId: s.id })).toBe('');
    expect(whatChanged(s.d, { kind: 'start', routineId: 'r' })).toBe('');
  });
});
