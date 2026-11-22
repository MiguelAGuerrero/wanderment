/** P-15: the live graph at the top of Home (whys and what feeds them, or your most active threads). */
import { describe, expect, it } from 'vitest';

import { bigBlob } from '../../e2e/graphFixture';
import { groupByValue, valueThreads } from './emergence';
import { buildFlowIndex } from './graph';
import { declareThread, deleteActivity, ensureThread, logActivity, renameThread, undeclareThread, updateThread } from './model';
import { COMPACT_H, GRAPH_H, headerWhys, MAX_DOTS, MAX_FEEDERS, MAX_THREADS, NARROW_W, overview, Overview, overviewLayout, OverviewLayout } from './overview';
import { homeThreads } from './selectors';
import { Data, emptyData, Id } from './types';

const NOW = new Date(Date.UTC(2026, 10, 20, 12));
const day = (n: number) => new Date(NOW.getTime() - n * 864e5);

/** Threads created a minute apart, 100 days ago, in the order given. */
function make(...names: string[]) {
  let data: Data = emptyData();
  const id: Record<string, Id> = {};
  names.forEach((n, i) => {
    const r = ensureThread(data, n, new Date(day(100).getTime() + i * 6e4));
    data = r.data;
    id[n] = r.thread.id;
  });
  return { data, id };
}
/** A "doing from → to" log, `daysAgo` days ago (logged then too). */
const link = (data: Data, from: Id, to: Id, daysAgo = 1) =>
  logActivity(data, { text: 'x', doingId: from, toIds: [to], occurredAt: day(daysAgo) }, day(daysAgo)).data;
const links = (data: Data, from: Id, to: Id, n: number, daysAgo = 1) => {
  for (let i = 0; i < n; i++) data = link(data, from, to, daysAgo);
  return data;
};
/** A plain "x @to" log: no doing thread. */
const plain = (data: Data, to: Id, daysAgo = 1) => logActivity(data, { text: 'x', toIds: [to], occurredAt: day(daysAgo) }, day(daysAgo)).data;
const declare = (data: Data, id: Id, daysAgo: number) => {
  const r = declareThread(data, id, day(daysAgo));
  if (!r.ok) throw new Error('declare failed');
  return r.data;
};
const ov = (data: Data, now = NOW, earned?: Set<Id>) => overview(data, earned ? [...earned] : headerWhys(data, now));
const whys = (o: Overview | undefined) => (o?.mode === 'whys' ? o.whys : []);
const whyNames = (o: Overview | undefined) => whys(o).map((w) => w.thread.name);
const feederNames = (o: Overview | undefined, why: string) => whys(o).find((w) => w.thread.name === why)?.feeders.map((f) => f.thread.name);
const threadNames = (o: Overview | undefined) => (o?.mode === 'threads' ? o.threads.map((t) => t.thread.name) : []);

describe('the flow index counts plain "to Y" logs as direct', () => {
  it('counts each log with no doing thread toward every "to", and makes no link', () => {
    let { data, id } = make('draw', 'sew');
    data = plain(data, id.draw);
    data = plain(data, id.draw);
    data = logActivity(data, { text: 'both', toIds: [id.draw, id.sew] }, day(1)).data;
    data = link(data, id.sew, id.draw);
    const index = buildFlowIndex(data, NOW);
    expect(index.direct.get(id.draw)).toBe(3);
    expect(index.direct.get(id.sew)).toBe(1);
    // The one doing → to log is a link, not a direct one.
    expect(index.in.get(id.draw)?.get(id.sew)?.count).toBe(1);
    expect(index.in.get(id.sew)).toBeUndefined();
  });

  it('an undone log takes its direct count and its link with it', () => {
    let { data, id } = make('draw', 'sew');
    const a = logActivity(data, { text: 'x', toIds: [id.draw] }, day(1));
    const b = logActivity(a.data, { text: 'y', doingId: id.sew, toIds: [id.draw] }, day(1));
    data = deleteActivity(deleteActivity(b.data, b.activity.id), a.activity.id);
    const index = buildFlowIndex(data, NOW);
    expect(index.direct.get(id.draw) ?? 0).toBe(0);
    expect(index.in.get(id.draw)?.get(id.sew)).toBeUndefined();
    const o = ov(data);
    expect(o?.mode === 'threads' ? o.links : undefined).toEqual([]);
  });
});

describe('overview with whys', () => {
  it('lists declared whys oldest mark first, then earned ones, never twice', () => {
    let { data, id } = make('get stronger', 'make apparel', 'sell prints', 'draw', 'photograph');
    data = declare(data, id['make apparel'], 5);
    data = declare(data, id['get stronger'], 3);
    // sell prints is earned (and also declared below); photograph is only earned.
    const earned = new Set([id['sell prints'], id.photograph, id['make apparel']]);
    const o = ov(data, NOW, earned);
    expect(o?.mode).toBe('whys');
    expect(whyNames(o).slice(0, 2)).toEqual(['make apparel', 'get stronger']);
    expect(whys(o).slice(0, 2).every((w) => w.declared)).toBe(true);
    expect(whyNames(o)).toHaveLength(3);
    expect(new Set(whyNames(o)).size).toBe(3);
    expect(whys(o)[2].declared).toBe(false);
  });

  it('shows earned whys (from valueThreads) when none are declared', () => {
    let { data, id } = make('draw', 'make apparel');
    data = links(data, id.draw, id['make apparel'], 4);
    expect(valueThreads(data, NOW).has(id['make apparel'])).toBe(true);
    const o = ov(data);
    expect(whyNames(o)).toEqual(['make apparel']);
    expect(whys(o)[0].declared).toBe(false);
    expect(feederNames(o, 'make apparel')).toEqual(['draw']);
  });

  it('caps feeders at three by all-time links, with the rest as +N', () => {
    let { data, id } = make('make apparel', 'a', 'b', 'c', 'd', 'e');
    data = declare(data, id['make apparel'], 1);
    data = links(data, id.a, id['make apparel'], 1);
    data = links(data, id.b, id['make apparel'], 5);
    data = links(data, id.c, id['make apparel'], 3);
    data = links(data, id.d, id['make apparel'], 4);
    data = links(data, id.e, id['make apparel'], 2);
    const w = whys(ov(data))[0];
    expect(w.feeders).toHaveLength(MAX_FEEDERS);
    expect(new Set(w.feeders.map((f) => f.thread.name))).toEqual(new Set(['b', 'd', 'c']));
    expect(w.moreFeeders).toBe(2);
  });

  it('picks feeders by all-time links, not recency, so the picture is the same 200 days later', () => {
    let { data, id } = make('make apparel', 'old', 'fresh');
    data = declare(data, id['make apparel'], 300);
    // More links than any other, but long ago (so lighter than the recent ones by weight).
    data = links(data, id.old, id['make apparel'], 4, 280);
    data = links(data, id.fresh, id['make apparel'], 1, 0);
    for (const extra of ['p', 'q', 'r']) {
      const r = ensureThread(data, extra, day(99));
      data = links(r.data, r.thread.id, id['make apparel'], 3, 1);
    }
    const now = ov(data);
    expect(feederNames(now, 'make apparel')).toContain('old');
    expect(feederNames(now, 'make apparel')).not.toContain('fresh');
    const later = new Date(NOW.getTime() + 200 * 864e5);
    const then = ov(data, later);
    expect(whyNames(then)).toEqual(['make apparel']);
    expect(feederNames(then, 'make apparel')).toEqual(feederNames(now, 'make apparel'));
    expect(whys(then)[0].moreFeeders).toBe(whys(now)[0].moreFeeders);
  });

  it('a thread feeding two whys appears under both', () => {
    let { data, id } = make('make apparel', 'sell prints', 'draw');
    data = declare(data, id['make apparel'], 2);
    data = declare(data, id['sell prints'], 1);
    data = link(data, id.draw, id['make apparel']);
    data = link(data, id.draw, id['sell prints']);
    const o = ov(data);
    expect(feederNames(o, 'make apparel')).toEqual(['draw']);
    expect(feederNames(o, 'sell prints')).toEqual(['draw']);
  });

  it('a why with no feeders is still shown; hidden threads never are', () => {
    let { data, id } = make('make apparel', 'draw', 'secret');
    data = declare(data, id['make apparel'], 1);
    data = link(data, id.secret, id['make apparel']);
    data = updateThread(data, id.secret, { hidden: true });
    const o = ov(data);
    expect(whyNames(o)).toEqual(['make apparel']);
    expect(feederNames(o, 'make apparel')).toEqual([]);
    expect(whys(o)[0].moreFeeders).toBe(0);
    // A hidden why is never shown either (hiding unmarks it).
    data = updateThread(data, id['make apparel'], { hidden: true });
    expect(ov(data)?.mode).toBe('threads');
    expect(threadNames(ov(data))).toEqual(['draw']);
  });

  it('more whys than fit (an import with four) show three, with the rest as +N', () => {
    let { data, id } = make('a', 'b', 'c', 'd');
    // Through the data directly: an import can hold more than three.
    for (const [i, n] of ['a', 'b', 'c', 'd'].entries()) data.threads[id[n]] = { ...data.threads[id[n]], declaredAt: day(10 - i).toISOString() };
    const o = ov(data);
    expect(whyNames(o)).toEqual(['a', 'b', 'c']);
    expect(o?.mode === 'whys' && o.moreWhys).toBe(1);
    // The fourth is never drawn as a plain thread either; the picture says "and more" instead (no number).
    expect(o?.mode === 'whys' && o.others).toEqual([]);
    expect(o?.more).toBe(true);
    const l = overviewLayout(o!, 350);
    expect(l.nodes.map((n) => n.id)).not.toContain(id.d);
    expect(l.more).toBeDefined();
    expect(l.more!.x + l.more!.w).toBeLessThanOrEqual(350.001);
  });

  it('a plain "to Y" log feeds Y directly, without a feeder', () => {
    let { data, id } = make('make apparel');
    data = declare(data, id['make apparel'], 1);
    data = plain(data, id['make apparel']);
    const w = whys(ov(data))[0];
    expect(w.direct).toBe(1);
    expect(w.feeders).toEqual([]);
  });

  it('a rename shows the new name; ids stay the same', () => {
    let { data, id } = make('make apparel', 'draw');
    data = declare(data, id['make apparel'], 1);
    data = link(data, id.draw, id['make apparel']);
    const r = renameThread(data, id.draw, 'sketch');
    if (!r.ok) throw new Error('rename failed');
    const w = whys(ov(r.data))[0];
    expect(w.feeders.map((f) => [f.thread.id, f.thread.name])).toEqual([[id.draw, 'sketch']]);
  });
});

describe('overview with no whys', () => {
  it('shows the most active threads (up to six, all-time) and the links among them', () => {
    const names = ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'];
    let { data, id } = make(...names);
    // Activity: t7 busiest (long ago), t0 and t1 the quietest.
    const counts = [1, 0, 2, 3, 4, 5, 6, 9];
    names.forEach((n, i) => {
      for (let k = 0; k < counts[i]; k++) data = plain(data, id[n], 200);
    });
    // One link between two shown threads (t6 → t5) and one to a thread that isn't shown (t7 → t1).
    data = link(data, id.t6, id.t5, 200);
    data = link(data, id.t7, id.t1, 200);
    const o = ov(data);
    expect(o?.mode).toBe('threads');
    expect(threadNames(o)).toHaveLength(MAX_THREADS);
    expect(new Set(threadNames(o))).toEqual(new Set(['t7', 't6', 't5', 't4', 't3', 't2']));
    expect(o?.mode === 'threads' && o.links.map((l) => [l.from, l.to])).toEqual([[id.t6, id.t5]]);
  });

  it('one thread only is still a graph, with no links', () => {
    const { data } = make('draw');
    const o = ov(data);
    expect(threadNames(o)).toEqual(['draw']);
    expect(o?.mode === 'threads' && o.links).toEqual([]);
  });

  it('no visible threads: no graph at all', () => {
    expect(ov(emptyData())).toBeUndefined();
    let { data, id } = make('draw');
    data = plain(data, id.draw);
    data = updateThread(data, id.draw, { hidden: true });
    expect(ov(data)).toBeUndefined();
    // Loose activities alone don't make a graph either.
    expect(ov(logActivity(emptyData(), { text: 'read a novel' }).data)).toBeUndefined();
  });
});


/** A plain log naming these threads (no doing thread), `minutes` before NOW (so the order is clear). */
const plainAt = (data: Data, toIds: Id[], minutes: number) => {
  const at = new Date(NOW.getTime() - minutes * 6e4);
  return logActivity(data, { text: 'x', toIds, occurredAt: at }, at);
};
const W = 350;
/** Lays out a state the way Home does: the last layout's slots are passed back in. */
const lay = (o: Overview | undefined, prev?: OverviewLayout, width = W) => overviewLayout(o!, width, { prev: prev?.slots });
const where = (l: OverviewLayout) => new Map(l.nodes.map((n) => [n.id, `${n.x},${n.y}`]));
const dotsAt = (l: OverviewLayout) => new Map(l.dots.map((d) => [d.id, `${d.x},${d.y}`]));
/** Everything in `before` that's still shown is where it was. */
function expectStayed(before: Map<Id, string>, after: Map<Id, string>) {
  for (const [id, p] of before) if (after.has(id)) expect(after.get(id), id).toBe(p);
}

describe('the summary is in names, never numbers (and never an arrow)', () => {
  it('no whys: “Your threads:”, links as “toward”, then what the latest logs named', () => {
    let { data, id } = make('draw', 'be a better drawer', 'sketching');
    data = link(data, id.draw, id['be a better drawer']);
    const s = ov(data)!.summary;
    expect(s).toBe('Your threads: draw toward be a better drawer; sketching. Lately: draw toward be a better drawer.');
    expect(s).not.toMatch(/→|\d/);
  });

  it('“Lately” names each different set of threads the recent logs went to, newest first', () => {
    let { data, id } = make('draw', 'make apparel', 'knit');
    data = plainAt(data, [id['make apparel'], id.draw], 4).data;
    data = plainAt(data, [id.draw, id['make apparel']], 3).data;
    data = plainAt(data, [id.draw], 2).data;
    data = plainAt(data, [id.knit], 1).data;
    expect(ov(data)!.summary).toBe('Your threads: draw, make apparel and knit. Lately: knit; draw; draw with make apparel.');
  });

  it('with whys: what it’s for, what feeds each, and what surfaced on its own', () => {
    let { data, id } = make('make apparel', 'get stronger', 'sell prints', 'draw', 'sew', 'a', 'b', 'c', 'photograph');
    data = declare(data, id['make apparel'], 2);
    data = declare(data, id['get stronger'], 1);
    data = links(data, id.draw, id['make apparel'], 4);
    data = links(data, id.sew, id['make apparel'], 3);
    data = links(data, id.a, id['make apparel'], 2);
    data = links(data, id.b, id['make apparel'], 1);
    data = links(data, id.photograph, id['sell prints'], 4);
    const s = ov(data, NOW, new Set([id['sell prints']]))!.summary;
    // Three threads sit beside the whys: each why's busiest feeder first (draw, photograph), then sew.
    expect(s.startsWith('What it’s for: make apparel, fed by draw, sew and others; get stronger, nothing feeds it yet. Surfacing from what you do: sell prints, fed by photograph. Lately: ')).toBe(true);
    // a, b and c aren't in the picture.
    expect(s.endsWith(' And more.')).toBe(true);
    expect(s).not.toMatch(/\d|→/);
  });

  it('a why fed only by plain logs says so; more whys than shown say “and more”', () => {
    let { data, id } = make('a', 'b', 'c', 'd');
    for (const [i, n] of ['a', 'b', 'c', 'd'].entries()) data.threads[id[n]] = { ...data.threads[id[n]], declaredAt: day(10 - i).toISOString() };
    data = plain(data, id.a);
    data = plain(data, id.a);
    const s = ov(data)!.summary;
    expect(s).toBe('What it’s for: a, logged to directly; b, nothing feeds it yet; c, nothing feeds it yet. Lately: a. And more.');
    expect(s).not.toMatch(/\d/);
  });

  it('a why that feeds another why is a link between them, and the summary says so', () => {
    let { data, id } = make('a', 'b', 'f');
    data = declare(data, id.a, 2);
    data = declare(data, id.b, 1);
    data = link(data, id.a, id.b, 2);
    data = link(data, id.f, id.a, 1);
    const o = ov(data)!;
    expect(o.summary.startsWith('What it’s for: a, fed by f; b, fed by a.')).toBe(true);
    expect(o.links.map((l) => [l.from, l.to])).toEqual([
      [id.a, id.b],
      [id.f, id.a],
    ]);
    expect(lay(o).links.map((l) => l.key)).toContain(`${id.a}>${id.b}`);
  });

  it('keeps very long names whole', () => {
    const LONG = 'learn to read sheet music well enough to sight-read a whole hymn at church without stopping';
    const { data } = make(LONG);
    expect(ov(data)!.summary).toBe(`Your threads: ${LONG}.`);
  });
});

describe('what the picture shows over time', () => {
  it('declared whys and their links never change because time passed', () => {
    let { data, id } = make('make apparel', 'draw', 'sew');
    data = declare(data, id['make apparel'], 300);
    data = links(data, id.draw, id['make apparel'], 2, 280);
    data = plain(data, id.sew, 250);
    const now = ov(data)!;
    const later = ov(data, new Date(NOW.getTime() + 400 * 864e5))!;
    expect(later).toEqual(now);
    expect(lay(later)).toEqual(lay(now));
  });

  it('earned whys follow Home’s headers exactly (the same rule, in the same order)', () => {
    let { data, id } = make('e1', 'e2', 'e3', 'e4', 'f1', 'f2', 'f3', 'f4');
    // Each value is fed four times; e3 was touched last, then e1, e4, e2.
    for (const [n, daysAgo] of [
      ['1', 2],
      ['2', 4],
      ['3', 1],
      ['4', 3],
    ] as const)
      data = links(data, id[`f${n}`], id[`e${n}`], 4, daysAgo);
    const headers = groupByValue(data, homeThreads(data, NOW).current.map((c) => c.thread.id), NOW).groups.map((g) => g.value.name);
    expect(headers).toEqual(['e3', 'e1', 'e4', 'e2']);
    expect(whyNames(ov(data))).toEqual(['e3', 'e1', 'e4']);
    expect(ov(data)!.more).toBe(true);
    // When a value stops being one (90 days on), it leaves the headers and the graph together.
    const later = new Date(NOW.getTime() + 100 * 864e5);
    expect(headerWhys(data, later)).toEqual([]);
    expect(ov(data, later)?.mode).toBe('threads');
  });

  it('the newest log always shows: if it names nothing in the picture, its thread comes in', () => {
    const names = ['t1', 't2', 't3', 't4', 't5', 't6', 'quiet'];
    let { data, id } = make(...names);
    names.slice(0, 6).forEach((n, i) => {
      for (let k = 0; k < 5; k++) data = plainAt(data, [id[n]], 100 + i * 10 + k).data;
    });
    expect(threadNames(ov(data))).not.toContain('quiet');
    const r = plainAt(data, [id.quiet], 0);
    const o = ov(r.data)!;
    expect(threadNames(o)).toContain('quiet');
    expect(threadNames(o)).toHaveLength(MAX_THREADS);
    expect(o.dots[0]).toEqual({ id: r.activity.id, threads: [id.quiet], doing: false });
  });
});

describe('overviewLayout: a thread that stays never moves', () => {
  it('P1: a busier feeder that first linked long ago takes the place of the one that left; the others stay', () => {
    let { data, id } = make('W', 'A', 'B', 'C', 'D');
    data = declare(data, id.W, 30);
    data = link(data, id.D, id.W, 20);
    data = links(data, id.A, id.W, 3, 10);
    data = links(data, id.B, id.W, 3, 9);
    data = links(data, id.C, id.W, 3, 8);
    const before = lay(ov(data));
    expect(feederNames(ov(data), 'W')).toEqual(['A', 'B', 'C']);
    data = links(data, id.D, id.W, 5, 0);
    const after = lay(ov(data), before);
    expect(feederNames(ov(data), 'W')).toEqual(['D', 'A', 'B']);
    expectStayed(where(before), where(after));
    expect(where(after).get(id.D)).toBe(where(before).get(id.C));
  });

  it('P2: no whys, a quiet older thread overtaking another takes its place; nothing else moves', () => {
    const names = ['t1', 't2', 't3', 't4', 't5', 't6', 't7'];
    let { data, id } = make(...names);
    data = plain(data, id.t1, 3);
    for (const n of names.slice(1)) for (let k = 0; k < (n === 't7' ? 3 : 5); k++) data = plain(data, id[n], 2);
    const before = lay(ov(data));
    expect(threadNames(ov(data))).not.toContain('t1');
    for (let k = 0; k < 3; k++) data = plain(data, id.t1, 0);
    const after = lay(ov(data), before);
    expect(threadNames(ov(data))).not.toContain('t7');
    expectStayed(where(before), where(after));
    expect(where(after).get(id.t1)).toBe(where(before).get(id.t7));
  });

  it('P3: declaring a why next to an earned one moves nothing (the new why stays where it was)', () => {
    let { data, id } = make('E', 'D', 'f');
    data = links(data, id.f, id.E, 5, 1);
    const before = lay(ov(data));
    expect(before.nodes.map((n) => [n.id, n.kind])).toEqual([
      [id.E, 'why'],
      [id.D, 'thread'],
      [id.f, 'feeder'],
    ]);
    data = declare(data, id.D, 0);
    const after = lay(ov(data), before);
    expect(where(after)).toEqual(where(before));
    expect(after.nodes.find((n) => n.id === id.D)?.kind).toBe('why');
    // And back: undeclaring moves nothing either.
    expect(where(lay(ov(undeclareThread(data, id.D)), after))).toEqual(where(before));
  });

  it('an earned why entering takes a free top-row slot; the thread it brings takes the one that left', () => {
    let { data, id } = make('w', 'a', 'b', 'c', 'e', 'g');
    data = declare(data, id.w, 30);
    data = link(data, id.a, id.w, 20);
    for (const n of ['b', 'c']) data = plain(data, id[n], 20);
    data = plain(data, id.b, 19);
    const before = lay(ov(data));
    expect(before.nodes.map((n) => n.id)).toEqual([id.w, id.a, id.b, id.c]);
    data = links(data, id.g, id.e, 5, 0);
    const o = ov(data)!;
    expect(whyNames(o)).toEqual(['w', 'e']);
    const after = lay(o, before);
    expectStayed(where(before), where(after));
    expect(after.nodes.find((n) => n.id === id.e)).toMatchObject({ kind: 'why', y: 0 });
    expect(where(after).has(id.c)).toBe(false);
    expect(where(after).get(id.g)).toBe(where(before).get(id.c));
  });

  it('more links, or a new feeder that fits, move nothing; the height stays fixed', () => {
    let { data, id } = make('make apparel', 'sell prints', 'old', 'draw', 'sew');
    data = declare(data, id['make apparel'], 3);
    data = declare(data, id['sell prints'], 2);
    data = link(data, id.draw, id['make apparel'], 2);
    data = link(data, id.sew, id['make apparel'], 1);
    const before = lay(ov(data));
    data = links(data, id.sew, id['make apparel'], 6, 0);
    const busier = lay(ov(data), before);
    expect(where(busier)).toEqual(where(before));
    data = link(data, id.old, id['sell prints'], 0);
    const after = lay(ov(data), busier);
    expect(where(after)).toEqual(where(before));
    expect(after.nodes.find((n) => n.id === id.old)?.kind).toBe('feeder');
    expect(new Set([before.height, busier.height, after.height])).toEqual(new Set([GRAPH_H]));
  });

  it('a new why appears in a free slot; the existing ones stay put', () => {
    let { data, id } = make('make apparel', 'sell prints', 'draw');
    data = declare(data, id['make apparel'], 3);
    data = link(data, id.draw, id['make apparel']);
    const before = lay(ov(data));
    data = declare(data, id['sell prints'], 0);
    const after = lay(ov(data), before);
    expectStayed(where(before), where(after));
    expect(after.nodes.find((n) => n.id === id['sell prints'])?.kind).toBe('why');
  });

  it('no whys: a new thread is appended; more activity moves nothing', () => {
    let { data, id } = make('draw', 'sew');
    data = plain(data, id.draw);
    const before = lay(ov(data));
    data = links(data, id.sew, id.draw, 2); // not enough to earn a why
    for (let i = 0; i < 3; i++) data = plain(data, id.sew); // sew is now busier than draw
    const busier = lay(ov(data), before);
    expect(where(busier)).toEqual(where(before));
    const r = ensureThread(data, 'be a better drawer', day(0));
    data = link(r.data, id.draw, r.thread.id, 0);
    const after = lay(ov(data), busier);
    expectStayed(where(before), where(after));
    expect(after.nodes.map((n) => n.id).sort()).toEqual([id.draw, id.sew, r.thread.id].sort());
    expect(after.links.map((l) => l.key)).toEqual(expect.arrayContaining([`${id.sew}>${id.draw}`, `${id.draw}>${r.thread.id}`]));
  });

  it('one thread is compact (it keeps the first card’s crumb clear of the toast); a second makes it full height and moves nothing', () => {
    let { data, id } = make('draw');
    data = plain(data, id.draw);
    const one = lay(ov(data));
    expect(one.height).toBe(COMPACT_H);
    const r = ensureThread(data, 'sew', day(0));
    const two = lay(ov(plain(r.data, r.thread.id, 0)), one);
    expect(two.height).toBe(GRAPH_H);
    // With no whys the rows alternate, so the dots between them use the whole box.
    expect(two.nodes.find((n) => n.id === r.thread.id)?.y).toBe(GRAPH_H - 44);
    expectStayed(where(one), where(two));
    expectStayed(dotsAt(one), dotsAt(two));
  });
});

describe('overviewLayout: recent logs are dots', () => {
  it('every log adds a dot with a line to each thread it names; the oldest leaves and nothing else moves', () => {
    let { data, id } = make('draw', 'make apparel', 'knit');
    const logged: Id[] = [];
    const log = (to: Id[], minutes: number) => {
      const r = plainAt(data, to, minutes);
      data = r.data;
      logged.push(r.activity.id);
    };
    log([id.draw, id['make apparel']], 30);
    log([id.draw], 29);
    log([id.knit], 28);
    let l = lay(ov(data));
    expect(l.dots.map((d) => d.id)).toEqual([...logged].reverse());
    expect(l.dotLines.map((x) => x.key).sort()).toEqual(
      [`${logged[0]}>${id.draw}`, `${logged[0]}>${id['make apparel']}`, `${logged[1]}>${id.draw}`, `${logged[2]}>${id.knit}`].sort(),
    );
    // Each line runs from its dot to its thread.
    for (const x of l.dotLines) {
      const d = l.dots.find((dd) => dd.id === x.dot)!;
      const n = l.nodes.find((nn) => nn.id === x.thread)!;
      expect(x.x1).toBeCloseTo(d.x + d.w / 2, 0);
      expect(x.y1).toBeCloseTo(d.y + d.h / 2, 0);
      expect(x.x2).toBeCloseTo(n.x + n.w / 2, 0);
      expect(x.y2 === n.y + 4 || x.y2 === n.y + n.h - 4).toBe(true);
    }
    // Logs keep coming: each one adds its dot; past eight, the oldest leaves; nothing else moves.
    for (let k = 0; k < 7; k++) {
      const prev = l;
      log([[id.draw], [id.knit], [id['make apparel'], id.knit]][k % 3], 20 - k);
      l = lay(ov(data), prev);
      expect(l.dots[0].id).toBe(logged[logged.length - 1]);
      expect(l.dots.length).toBe(Math.min(MAX_DOTS, logged.length));
      expect(where(l)).toEqual(where(prev));
      expectStayed(dotsAt(prev), dotsAt(l));
    }
    expect(l.dots.map((d) => d.id)).not.toContain(logged[0]);
  });

  it('up to eight at 390 px, fewer where there’s less room; dots, nodes and “and more” never overlap, never at the centre', () => {
    const names = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    let { data, id } = make(...names);
    for (let k = 0; k < 14; k++) data = plainAt(data, [id[names[k % 6]], id[names[(k + 1) % 6]]], 100 - k).data;
    const o = ov(data)!;
    expect(o.more).toBe(true); // g isn't in the picture
    for (const [width, most] of [
      [W, MAX_DOTS],
      [600, MAX_DOTS],
      [NARROW_W, 6],
    ] as const) {
      const l = lay(o, undefined, width);
      expect(l.dots.length, `${width}`).toBe(most);
      const boxes = [...l.nodes, ...l.dots, l.more!];
      for (const b of boxes) {
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x + b.w).toBeLessThanOrEqual(width + 0.001);
        expect(b.y + b.h).toBeLessThanOrEqual(l.height);
        expect(b.h).toBeGreaterThanOrEqual(44);
        expect(b.w).toBeGreaterThanOrEqual(44);
        // The centre is where a screen reader "taps" the picture: nothing opens from there.
        const [cx, cy] = [width / 2, l.height / 2];
        expect(cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h, `centre in ${JSON.stringify(b)}`).toBe(false);
      }
      for (const a of boxes)
        for (const b of boxes) {
          if (a === b) continue;
          expect(a.x + a.w <= b.x + 0.001 || b.x + b.w <= a.x + 0.001 || a.y + a.h <= b.y || b.y + b.h <= a.y, `${JSON.stringify(a)} overlaps ${JSON.stringify(b)}`).toBe(true);
        }
    }
    // Compact (one thread): its centre is clear too.
    const one = make('solo');
    const c = lay(ov(plain(one.data, one.id.solo)));
    for (const b of [...c.nodes, ...c.dots]) expect(W / 2 >= b.x && W / 2 <= b.x + b.w && c.height / 2 >= b.y && c.height / 2 <= b.y + b.h).toBe(false);
  });

  it('a plain "to Y" log is a dot with a line to Y (no fill); links get a width from all-time links', () => {
    let { data, id } = make('draw', 'sew');
    expect(lay(ov(data)).dots).toEqual([]);
    const r = plainAt(data, [id.draw], 10);
    data = r.data;
    expect(lay(ov(data)).dotLines.map((x) => [x.dot, x.thread])).toEqual([[r.activity.id, id.draw]]);
    data = link(data, id.sew, id.draw);
    const thin = lay(ov(data)).links[0].width;
    data = links(data, id.sew, id.draw, 9, 300);
    expect(lay(ov(data)).links[0].width).toBeGreaterThan(thin);
  });

  it('hiding a thread takes its node and the dots that only named it; an undone log takes its dot', () => {
    let { data, id } = make('draw', 'sew');
    const a = plainAt(data, [id.draw], 3);
    const b = plainAt(a.data, [id.sew], 2);
    const c = plainAt(b.data, [id.sew, id.draw], 1);
    data = c.data;
    const hidden = lay(ov(updateThread(data, id.sew, { hidden: true })));
    expect(hidden.nodes.map((n) => n.id)).toEqual([id.draw]);
    expect(hidden.dots.map((d) => d.id)).toEqual([c.activity.id, a.activity.id]);
    expect(hidden.dotLines.map((x) => x.thread)).toEqual([id.draw, id.draw]);
    expect(lay(ov(deleteActivity(data, c.activity.id))).dots.map((d) => d.id)).toEqual([b.activity.id, a.activity.id]);
  });
});

describe('overviewLayout: narrow screens', () => {
  it('summary only when three columns don’t fit (200 % zoom) or at the largest text; 125 % zoom keeps the picture', () => {
    const { data } = make('draw');
    const o = ov(data)!;
    expect(overviewLayout(o, 155).summaryOnly).toBe(true);
    expect(overviewLayout(o, NARROW_W - 1).summaryOnly).toBe(true);
    // 125 % zoom on a 390 px phone: 312 px wide, 272 px of content.
    expect(overviewLayout(o, 272).summaryOnly).toBe(false);
    expect(overviewLayout(o, W).summaryOnly).toBe(false);
    expect(overviewLayout(o, W, { fontScale: 1.5 }).summaryOnly).toBe(true);
    expect(overviewLayout(o, W, { fontScale: 1.3 }).summaryOnly).toBe(false);
    expect(overviewLayout(o, 155).nodes).toEqual([]);
  });

  it('keeps every node inside the width, without overlaps, at 390 px and on a wide screen', () => {
    const names = ['w1', 'w2', 'w3', 'f1', 'f2', 'f3', 'f4'];
    let { data, id } = make(...names);
    for (const w of ['w1', 'w2', 'w3']) data = declare(data, id[w], 1);
    for (const f of ['f1', 'f2', 'f3', 'f4']) for (const w of ['w1', 'w2', 'w3']) data = link(data, id[f], id[w]);
    for (const width of [W, 600]) {
      const l = lay(ov(data), undefined, width);
      expect(l.summaryOnly).toBe(false);
      const boxes = [...l.nodes, ...l.dots, l.more!];
      for (const b of boxes) {
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x + b.w).toBeLessThanOrEqual(width + 0.001);
        expect(b.y + b.h).toBeLessThanOrEqual(GRAPH_H);
        expect(b.h).toBeGreaterThanOrEqual(44);
      }
      for (const a of boxes)
        for (const b of boxes) {
          if (a === b) continue;
          const apart = a.x + a.w <= b.x + 0.001 || b.x + b.w <= a.x + 0.001 || a.y + a.h <= b.y || b.y + b.h <= a.y;
          expect(apart).toBe(true);
        }
      expect(l.nodes.filter((n) => n.kind === 'why')).toHaveLength(3);
      expect(l.nodes.filter((n) => n.kind === 'feeder')).toHaveLength(MAX_FEEDERS);
    }
  });
});

describe('with a big history', () => {
  it('overview and layout take under 16 ms with bigBlob (everything the graph adds to Home)', () => {
    const data = JSON.parse(bigBlob(220, 4000)).state.data as Data;
    const now = new Date();
    const surfacing = headerWhys(data, now);
    // A declared why too, so both modes are timed.
    const declared = { ...data, threads: { ...data.threads, 'thread 3': { ...data.threads['thread 3'], declaredAt: now.toISOString() } } };
    lay(overview(data, surfacing)); // warm up
    const runs: number[] = [];
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now();
      lay(overview(data, surfacing));
      lay(overview(declared, surfacing));
      lay(overview(data, []));
      runs.push((performance.now() - t0) / 3);
    }
    runs.sort((a, b) => a - b);
    expect(runs[2]).toBeLessThan(16);
  });
});
