import { describe, expect, it } from 'vitest';

import { buildFlowIndex, looseActivities, MAX_SIBLINGS, neighbourhood } from './graph';
import { ensureThread, logActivity, updateThread } from './model';
import { Data, emptyData, Id } from './types';

const NOW = new Date(Date.UTC(2026, 10, 20, 12));
const day = (n: number) => new Date(NOW.getTime() - n * 864e5);

function make(...names: string[]) {
  let data: Data = emptyData();
  const id: Record<string, Id> = {};
  for (const n of names) {
    const r = ensureThread(data, n, day(100));
    data = r.data;
    id[n] = r.thread.id;
  }
  return { data, id };
}
const link = (data: Data, from: Id, to: Id, daysAgo = 1) =>
  logActivity(data, { text: 'x', doingId: from, toIds: [to], occurredAt: day(daysAgo) }, day(daysAgo)).data;
const names = (ns: { thread: { name: string } }[]) => ns.map((n) => n.thread.name);

describe('neighbourhood', () => {
  it('puts what the centre flows to above and what flows in below, strongest first', () => {
    let { data, id } = make('draw', 'make apparel', 'sell prints', 'doodle');
    data = link(data, id.draw, id['make apparel']);
    data = link(data, id.draw, id['make apparel']);
    data = link(data, id.draw, id['sell prints']);
    data = link(data, id.doodle, id.draw);
    const n = neighbourhood(data, buildFlowIndex(data, NOW), id.draw)!;
    expect(names(n.up)).toEqual(['make apparel', 'sell prints']);
    expect(n.up[0].count).toBe(2);
    expect(names(n.down)).toEqual(['doodle']);
    expect(n.steps).toBe(4);
    expect(n.recentSteps).toBe(4);
  });

  it('weights recent links above old ones with the same count', () => {
    let { data, id } = make('draw', 'old', 'new');
    data = link(data, id.draw, id.old, 80);
    data = link(data, id.draw, id.new, 1);
    expect(names(neighbourhood(data, buildFlowIndex(data, NOW), id.draw)!.up)).toEqual(['new', 'old']);
  });

  it('handles cycles: A⇄B shows B both above and below, never A itself, and depth 2 terminates', () => {
    let { data, id } = make('a', 'b', 'c');
    data = link(data, id.a, id.b);
    data = link(data, id.b, id.a);
    data = link(data, id.b, id.c);
    data = link(data, id.c, id.a);
    const n = neighbourhood(data, buildFlowIndex(data, NOW), id.a, 2)!;
    expect(names(n.up)).toEqual(['b']);
    expect(names(n.down).sort()).toEqual(['b', 'c']);
    expect(names(n.up2)).toEqual(['c']);
    expect(n.up2[0].via).toBe(id.b);
    expect(names(n.down2)).toEqual([]); // c's and b's inflows are already shown below or are the centre
    for (const list of [n.up, n.down, n.up2, n.down2, n.siblings]) expect(list.map((x) => x.thread.id)).not.toContain(id.a);
  });

  it('shows siblings that flow to the same places, capped with a "+N"', () => {
    const extra = Array.from({ length: MAX_SIBLINGS + 2 }, (_, i) => `s${i}`);
    let { data, id } = make('draw', 'make apparel', ...extra);
    data = link(data, id.draw, id['make apparel']);
    for (const s of extra) data = link(data, id[s], id['make apparel']);
    const n = neighbourhood(data, buildFlowIndex(data, NOW), id.draw)!;
    expect(n.siblings).toHaveLength(MAX_SIBLINGS);
    expect(n.moreSiblings).toBe(2);
  });

  it('leaves out hidden threads and unknown ids', () => {
    let { data, id } = make('a', 'b');
    data = link(data, id.a, id.b);
    data = updateThread(data, id.b, { hidden: true });
    expect(neighbourhood(data, buildFlowIndex(data, NOW), id.a)!.up).toEqual([]);
    expect(neighbourhood(data, buildFlowIndex(data, NOW), 'nope')).toBeUndefined();
  });

  it('stays fast with 250 threads and 6000 activities', () => {
    const many = Array.from({ length: 250 }, (_, i) => `t${i}`);
    let { data } = make(...many);
    const ids = Object.values(data.threads).map((t) => t.id);
    const acts = { ...data.activities };
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 6000; i++) {
      const at = day(Math.floor(rnd() * 120)).toISOString();
      const from = ids[Math.floor(rnd() * ids.length)];
      const to = ids[Math.floor(Math.pow(rnd(), 3) * ids.length)]; // a few popular targets
      acts[`a${i}`] = { id: `a${i}`, text: 'x', occurredAt: at, createdAt: at, doingId: from, toIds: from === to ? [] : [to] };
    }
    data = { ...data, activities: acts };
    const t0 = performance.now();
    const index = buildFlowIndex(data, NOW);
    for (const tid of ids.slice(0, 50)) neighbourhood(data, index, tid, 2);
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(500);
  });
});

describe('attach mode', () => {
  it('lists unattached activities oldest first, minus skipped ones', () => {
    let { data, id } = make('a');
    const first = logActivity(data, { text: 'first', occurredAt: day(3) }, day(3));
    const second = logActivity(first.data, { text: 'second', occurredAt: day(1) }, day(1));
    data = logActivity(second.data, { text: 'attached', toIds: [id.a] }).data;
    expect(looseActivities(data).map((a) => a.text)).toEqual(['first', 'second']);
    expect(looseActivities(data, new Set([first.activity.id])).map((a) => a.text)).toEqual(['second']);
  });
});
