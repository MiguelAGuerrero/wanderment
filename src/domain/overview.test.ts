/** P-15: the live graph at the top of Home (whys and what feeds them, or your most active threads). */
import { describe, expect, it } from 'vitest';

import { bigBlob } from '../../e2e/graphFixture';
import { valueThreads } from './emergence';
import { buildFlowIndex } from './graph';
import { declareThread, deleteActivity, ensureThread, logActivity, renameThread, updateThread } from './model';
import { GRAPH_H, MAX_FEEDERS, MAX_THREADS, NARROW_W, overview, Overview, overviewLayout } from './overview';
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
const ov = (data: Data, now = NOW, earned?: Set<Id>) => overview(data, buildFlowIndex(data, now), earned ?? valueThreads(data, now));
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
    // Drawn as a "+N" beside the last why, inside the width.
    const l = overviewLayout(o!, 350);
    expect(l.more).toEqual([expect.objectContaining({ label: '+1', y: 0 })]);
    const last = l.nodes.find((n) => n.id === id.c)!;
    expect(last.x + last.w).toBeLessThanOrEqual(l.more[0].x);
    expect(l.more[0].x + l.more[0].w).toBeLessThanOrEqual(350.001);
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

describe('the summary is in names, never numbers', () => {
  it('no whys: “Lately:” then each link and the other threads', () => {
    let { data, id } = make('draw', 'be a better drawer', 'sketching');
    data = link(data, id.draw, id['be a better drawer']);
    expect(ov(data)!.summary).toBe('Lately: draw → be a better drawer, sketching.');
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
    const o = ov(data, NOW, new Set([id['sell prints']]));
    expect(o!.summary).toBe(
      'What it’s for: make apparel, fed by draw, sew, a and others; get stronger, nothing feeds it yet. Surfacing from what you do: sell prints, fed by photograph.',
    );
    expect(o!.summary).not.toMatch(/\d/);
  });

  it('a why fed only by plain logs says so; more whys than shown say “and more”', () => {
    let { data, id } = make('a', 'b', 'c', 'd');
    for (const [i, n] of ['a', 'b', 'c', 'd'].entries()) data.threads[id[n]] = { ...data.threads[id[n]], declaredAt: day(10 - i).toISOString() };
    data = plain(data, id.a);
    data = plain(data, id.a);
    const s = ov(data)!.summary;
    expect(s).toBe('What it’s for: a, logged to directly; b, nothing feeds it yet; c, nothing feeds it yet; and more.');
    expect(s).not.toMatch(/\d/);
  });

  it('keeps very long names whole', () => {
    const LONG = 'learn to read sheet music well enough to sight-read a whole hymn at church without stopping';
    const { data } = make(LONG);
    expect(ov(data)!.summary).toBe(`Lately: ${LONG}.`);
  });
});

describe('overviewLayout', () => {
  const W = 350;
  const rect = (n: { x: number; y: number; w: number; h: number }) => [n.x, n.y, n.w, n.h];
  const byKey = (l: ReturnType<typeof overviewLayout>) => new Map(l.nodes.map((n) => [n.key, rect(n)]));

  it('adding a feeder (or more links) never moves the others, and the height stays fixed', () => {
    let { data, id } = make('make apparel', 'sell prints', 'old', 'draw', 'sew');
    data = declare(data, id['make apparel'], 3);
    data = declare(data, id['sell prints'], 2);
    // The newest feeder is the oldest thread: it still goes last.
    data = link(data, id.draw, id['make apparel'], 2);
    data = link(data, id.sew, id['make apparel'], 1);
    const before = overviewLayout(ov(data)!, W);
    data = links(data, id.sew, id['make apparel'], 6, 0);
    const busier = overviewLayout(ov(data)!, W);
    expect(byKey(busier)).toEqual(byKey(before));
    data = link(data, id.old, id['make apparel'], 0);
    const after = overviewLayout(ov(data)!, W);
    for (const [key, r] of byKey(before)) expect(byKey(after).get(key)).toEqual(r);
    expect(after.nodes.length).toBe(before.nodes.length + 1);
    expect(new Set([before.height, busier.height, after.height])).toEqual(new Set([GRAPH_H]));
    // A why with no feeders has the same height too.
    const bare = make('x');
    expect(overviewLayout(ov(declare(bare.data, bare.id.x, 1))!, W).height).toBe(GRAPH_H);
  });

  it('a new why is a new column; the existing ones stay put', () => {
    let { data, id } = make('make apparel', 'sell prints', 'draw');
    data = declare(data, id['make apparel'], 3);
    data = link(data, id.draw, id['make apparel']);
    const before = overviewLayout(ov(data)!, W);
    data = declare(data, id['sell prints'], 0);
    const after = overviewLayout(ov(data)!, W);
    for (const [key, r] of byKey(before)) expect(byKey(after).get(key)).toEqual(r);
    expect(after.nodes.find((n) => n.id === id['sell prints'])?.kind).toBe('why');
  });

  it('no whys: a new thread is appended; more activity moves nothing', () => {
    let { data, id } = make('draw', 'sew');
    data = plain(data, id.draw);
    const before = overviewLayout(ov(data)!, W);
    data = links(data, id.sew, id.draw, 2); // not enough to earn a why
    for (let i = 0; i < 3; i++) data = plain(data, id.sew); // sew is now busier than draw
    const busier = overviewLayout(ov(data)!, W);
    expect(byKey(busier)).toEqual(byKey(before));
    const r = ensureThread(data, 'be a better drawer', day(0));
    data = link(r.data, id.draw, r.thread.id, 0);
    const after = overviewLayout(ov(data)!, W);
    for (const [key, rr] of byKey(before)) expect(byKey(after).get(key)).toEqual(rr);
    expect(after.nodes.map((n) => n.id)).toEqual([id.draw, id.sew, r.thread.id]);
    expect(after.height).toBe(GRAPH_H);
    expect(after.links.map((l) => l.key)).toEqual(expect.arrayContaining([`${id.sew}>${id.draw}`, `${id.draw}>${r.thread.id}`]));
  });

  it('keeps every node inside the width, without overlaps, at 390 px and on a wide screen', () => {
    const names = ['w1', 'w2', 'w3', 'f1', 'f2', 'f3', 'f4'];
    let { data, id } = make(...names);
    for (const w of ['w1', 'w2', 'w3']) data = declare(data, id[w], 1);
    for (const f of ['f1', 'f2', 'f3', 'f4']) for (const w of ['w1', 'w2', 'w3']) data = link(data, id[f], id[w]);
    for (const width of [W, 600]) {
      const l = overviewLayout(ov(data)!, width);
      expect(l.summaryOnly).toBe(false);
      const boxes = [...l.nodes, ...l.more];
      for (const b of boxes) {
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x + b.w).toBeLessThanOrEqual(width + 0.001);
        expect(b.y + b.h).toBeLessThanOrEqual(GRAPH_H);
        expect(b.h).toBeGreaterThanOrEqual(44);
      }
      for (const a of boxes)
        for (const b of boxes) {
          if (a === b) continue;
          const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
          expect(apart, `${a.key} overlaps ${b.key}`).toBe(true);
        }
      expect(l.nodes.filter((n) => n.kind === 'why')).toHaveLength(3);
      expect(l.more.map((m) => m.label)).toEqual(['+1', '+1', '+1']);
    }
  });

  it('a plain "to Y" log gives Y a fill; links get a width from all-time links', () => {
    let { data, id } = make('draw', 'sew');
    let l = overviewLayout(ov(data)!, W);
    expect(l.nodes.map((n) => n.fill)).toEqual([0, 0]);
    data = plain(data, id.draw);
    l = overviewLayout(ov(data)!, W);
    expect(l.nodes.find((n) => n.id === id.draw)!.fill).toBeGreaterThan(0);
    expect(l.nodes.find((n) => n.id === id.sew)!.fill).toBe(0);
    data = link(data, id.sew, id.draw);
    const thin = overviewLayout(ov(data)!, W).links[0].width;
    data = links(data, id.sew, id.draw, 9, 300);
    expect(overviewLayout(ov(data)!, W).links[0].width).toBeGreaterThan(thin);
  });

  it('narrow content (200 % zoom) or the largest text: summary only', () => {
    const { data } = make('draw');
    expect(overviewLayout(ov(data)!, 155).summaryOnly).toBe(true);
    expect(overviewLayout(ov(data)!, NARROW_W - 1).summaryOnly).toBe(true);
    expect(overviewLayout(ov(data)!, W).summaryOnly).toBe(false);
    expect(overviewLayout(ov(data)!, W, 1.5).summaryOnly).toBe(true);
    expect(overviewLayout(ov(data)!, W, 1.3).summaryOnly).toBe(false);
    expect(overviewLayout(ov(data)!, 155).nodes).toEqual([]);
  });
});

describe('with a big history', () => {
  it('overview and layout take under 16 ms with bigBlob', () => {
    const data = JSON.parse(bigBlob(220, 4000)).state.data as Data;
    const now = new Date();
    const index = buildFlowIndex(data, now);
    const earned = valueThreads(data, now);
    // A declared why too, so both modes are timed.
    const declared = { ...data, threads: { ...data.threads, 'thread 3': { ...data.threads['thread 3'], declaredAt: now.toISOString() } } };
    overviewLayout(overview(data, index, earned)!, 350); // warm up
    const runs: number[] = [];
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now();
      overviewLayout(overview(data, index, earned)!, 350);
      overviewLayout(overview(declared, index, earned)!, 350);
      overviewLayout(overview(data, index, new Set())!, 350);
      runs.push((performance.now() - t0) / 3);
    }
    runs.sort((a, b) => a - b);
    expect(runs[2]).toBeLessThan(16);
  });
});
