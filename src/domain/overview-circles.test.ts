/** P-48: Home's graph as heat circles and branch lines (B-06 revision 12, "The graph"). */
import { describe, expect, it } from 'vitest';

import { nodeHeat } from './heat';
import { declareThread, ensureThread, logActivity, updateThread } from './model';
import { BOTTOM_R, headerWhys, insideWidth, LaidLink, looseOverview, MIN_END_ANGLE, overview, Overview, overviewLayout, ROOMY_H, STEP_H, TOP_R } from './overview';
import { Data, emptyData, Id } from './types';

const NOW = new Date(Date.UTC(2026, 10, 22, 12));
const day = (n: number) => new Date(NOW.getTime() - n * 864e5);
const W = 350; // 390 px screen, 20 px padding each side

function make(...names: string[]) {
  let data: Data = emptyData();
  const id: Record<string, Id> = {};
  names.forEach((n, i) => {
    const r = ensureThread(data, n, new Date(day(300).getTime() + i * 6e4));
    data = r.data;
    id[n] = r.thread.id;
  });
  return { data, id };
}
const feed = (data: Data, from: Id | undefined, to: Id[], daysAgo: number) => logActivity(data, { text: 'x', doingId: from, toIds: to, occurredAt: day(daysAgo) }, day(daysAgo)).data;
const declare = (data: Data, id: Id) => {
  const r = declareThread(data, id, day(1));
  if (!r.ok) throw new Error('declare');
  return r.data;
};
const ov = (data: Data, shading = true) => overview(data, headerWhys(data, NOW), { now: NOW, shading })!;
const lay = (o: Overview, width = W) => overviewLayout(o, width, { roomy: true });

/** A hot chain (hands → draw → make apparel, logged today), a cooling one (sew, a month ago) and a resting why. */
function world() {
  let { data, id } = make('make apparel', 'feel productive', 'get stronger', 'draw', 'sew', 'read', 'hands');
  data = feed(data, id.draw, [id['make apparel']], 60);
  data = feed(data, id.hands, [id.draw], 0);
  data = feed(data, id.sew, [id['make apparel']], 30);
  data = feed(data, id.read, [id['feel productive']], 90);
  for (const w of ['make apparel', 'feel productive', 'get stronger']) data = declare(data, id[w]);
  data = updateThread(data, id.draw, { next: 'sketch a hand' });
  return { data, id };
}
const dist = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1);

describe('circles: biggest on top, one size smaller beneath, double ring for declared whys', () => {
  it('the whys (top row) are the biggest circles; the row beneath is one size smaller', () => {
    const { data, id } = world();
    const l = lay(ov(data));
    const r = Object.fromEntries(l.nodes.map((n) => [n.name, n.circle?.r]));
    expect(TOP_R).toBeGreaterThan(BOTTOM_R);
    for (const w of ['make apparel', 'feel productive', 'get stronger']) expect(r[w], w).toBe(TOP_R);
    for (const f of ['draw', 'sew', 'read']) expect(r[f], f).toBe(BOTTOM_R);
    expect(l.nodes.find((n) => n.id === id['make apparel'])!.kind).toBe('why');
  });

  it('declared whys get the second ring; an earned why and the wanders don’t', () => {
    let { data, id } = make('make apparel', 'feel productive', 'draw', 'sew', 'knit');
    for (let i = 0; i < 6; i++) data = feed(data, [id.draw, id.sew, id.knit][i % 3], [id['feel productive']], 2 + i);
    data = feed(data, id.draw, [id['make apparel']], 1);
    data = declare(data, id['make apparel']);
    const o = ov(data);
    expect(o.mode === 'whys' && o.whys.map((w) => [w.thread.name, w.declared])).toEqual([
      ['make apparel', true],
      ['feel productive', false],
    ]);
    const ring = Object.fromEntries(lay(o).nodes.map((n) => [n.name, n.circle!.declared]));
    expect(ring).toEqual({ 'make apparel': true, 'feel productive': false, draw: false, sew: false, knit: false });
  });

  it('targets stay at least 44 px with the circle inside; nothing overlaps; all inside the picture, at 390 px, 125 % zoom and wide', () => {
    const { data } = world();
    const o = ov(data);
    for (const width of [W, 272, 600]) {
      const l = lay(o, width);
      expect(l.height).toBe(ROOMY_H);
      expect(l.dots).toEqual([]);
      for (const n of l.nodes) {
        const c = n.circle!;
        expect(n.w, n.name).toBeGreaterThanOrEqual(44);
        expect(n.h, n.name).toBeGreaterThanOrEqual(44);
        expect(c.cx - c.r).toBeGreaterThanOrEqual(n.x);
        expect(c.cx + c.r).toBeLessThanOrEqual(n.x + n.w);
        expect(c.cy - c.r).toBeGreaterThanOrEqual(n.y);
        expect(c.cy + c.r).toBeLessThanOrEqual(n.y + n.h);
      }
      const boxes = [...l.nodes.map((n) => ({ ...n, h: n.h + STEP_H })), ...(l.more ? [l.more] : [])];
      for (const [i, a] of boxes.entries()) {
        expect(a.x).toBeGreaterThanOrEqual(0);
        expect(a.x + a.w).toBeLessThanOrEqual(width + 0.01);
        expect(a.y + a.h).toBeLessThanOrEqual(l.height);
        for (const b of boxes.slice(i + 1)) expect(a.x + a.w <= b.x + 0.01 || b.x + b.w <= a.x + 0.01 || a.y + a.h <= b.y || b.y + b.h <= a.y, `${width}: ${JSON.stringify(a)} / ${JSON.stringify(b)}`).toBe(true);
      }
    }
  });

  it('a label sits inside when it fits on two lines, else under the circle (the target grows to hold it)', () => {
    expect(insideWidth('make apparel', TOP_R)).toBeDefined();
    expect(insideWidth('draw', BOTTOM_R)).toBeDefined();
    expect(insideWidth('make apparel', BOTTOM_R)).toBeUndefined();
    expect(insideWidth('draw better hands every evening', TOP_R)).toBeUndefined();
    expect(insideWidth('Supercalifragilistic', TOP_R)).toBeUndefined();
    const { data } = world();
    const l = lay(ov(data));
    const at = (name: string) => l.nodes.find((n) => n.name === name)!;
    expect(at('make apparel').circle!.inside).toBe(true);
    expect(at('draw').circle!.inside).toBe(true);
    expect(at('feel productive').circle!.inside).toBe(false);
    // Under: the target holds two more lines than the one with its label inside, and the label is as wide as the column.
    expect(at('feel productive').h).toBeGreaterThan(at('make apparel').h);
    expect(at('feel productive').circle!.labelW).toBe(Math.floor(at('feel productive').w));
    // Inside: the text box fits within the circle.
    expect(at('make apparel').circle!.labelW).toBeLessThan(2 * TOP_R);
  });
});

describe('heat in the picture', () => {
  it('each circle carries its node’s heat; a hot chain, a cooling one and a resting why', () => {
    const { data, id } = world();
    const o = ov(data);
    const l = lay(o);
    const heat = Object.fromEntries(l.nodes.map((n) => [n.name, n.circle!.heat]));
    // To the hundredth (so a log a moment later redraws nothing that didn't change).
    const r2 = (h: number) => Math.round(h * 100) / 100;
    // hands → draw → make apparel, logged just now: the whole chain is hot (draw's own link is 60 days old).
    expect(heat.draw).toBe(1);
    expect(heat['make apparel']).toBe(1);
    // sew: a month ago (30 days: under half). read and the why it feeds: 90 days. get stronger: never.
    expect(heat.sew).toBe(r2(Math.pow(0.5, 30 / 14)));
    expect(heat['feel productive']).toBe(r2(Math.pow(0.5, 90 / 14)));
    expect(heat['get stronger']).toBe(0);
    expect(r2(o.heat[id.sew])).toBe(heat.sew);
    // The same as working it out on its own.
    expect(o.heat).toEqual(nodeHeat(data, Object.keys(o.heat), { now: NOW }));
  });

  it('a moment later nothing changes, so the memoised circles and branches aren’t redrawn', () => {
    const { data } = world();
    const at = (ms: number) => overviewLayout(overview(data, headerWhys(data, NOW), { now: new Date(NOW.getTime() + ms) })!, W, { roomy: true });
    const [now, later] = [at(0), at(5000)];
    expect(later.nodes.map((n) => n.circle)).toEqual(now.nodes.map((n) => n.circle));
    expect(later.links).toEqual(now.links);
  });

  it('shading off: every circle and branch is neutral', () => {
    const { data } = world();
    const l = lay(ov(data, false));
    expect(l.nodes.every((n) => n.circle!.heat === 0)).toBe(true);
    expect(l.links.every((k) => k.branch!.fromHeat === 0 && k.branch!.toHeat === 0)).toBe(true);
  });
});

/** Every end of every branch on each circle. */
function endsByNode(links: LaidLink[]) {
  const ends = new Map<Id, [number, number][]>();
  for (const k of links) {
    const b = k.branch!;
    for (const [id, p] of [
      [k.from, [b.x1, b.y1]],
      [k.to, [b.x2, b.y2]],
    ] as const)
      ends.set(id, [...(ends.get(id) ?? []), [p[0], p[1]]]);
  }
  return ends;
}

describe('branches: tapered, each leaving along its own direction', () => {
  it('no dots or dot lines once wanders exist; logs on their own are unchanged (dots)', () => {
    const { data } = world();
    const l = lay(ov(data));
    expect(l.dots).toEqual([]);
    expect(l.dotLines).toEqual([]);
    let loose = emptyData();
    loose = feed(loose, undefined, [], 1);
    expect(lay(looseOverview(loose)!).dots).toHaveLength(1);
  });

  it('a branch runs from the child’s edge to the parent’s, leaving toward the parent, coloured from the child’s heat to the parent’s', () => {
    const { data, id } = world();
    const l = lay(ov(data));
    const c = (i: Id) => l.nodes.find((n) => n.id === i)!.circle!;
    const k = l.links.find((x) => x.from === id.sew && x.to === id['make apparel'])!;
    const b = k.branch!;
    const [child, parent] = [c(id.sew), c(id['make apparel'])];
    expect(dist(child.cx, child.cy, b.x1, b.y1)).toBeCloseTo(child.r - 0.5, 0);
    expect(dist(parent.cx, parent.cy, b.x2, b.y2)).toBeCloseTo(parent.r - 0.5, 0);
    // Leaves along its own direction toward the parent; arrives from the child's side.
    expect((b.x1 - child.cx) * (parent.cx - child.cx) + (b.y1 - child.cy) * (parent.cy - child.cy)).toBeGreaterThan(0);
    expect((b.x2 - parent.cx) * (child.cx - parent.cx) + (b.y2 - parent.cy) * (child.cy - parent.cy)).toBeGreaterThan(0);
    expect([b.fromHeat, b.toHeat]).toEqual([child.heat, parent.heat]);
    // A filled, tapered shape (no arrowhead).
    expect(k.arrow).toBe('');
    expect(b.points.split(' ').length).toBeGreaterThan(20);
  });

  it('siblings never share an end point, even in a line (two in the top row into the first)', () => {
    let { data, id } = make('a', 'b', 'c', 'd', 'e', 'f');
    // a, b and c are declared (the top row, left to right); b and c both feed a, and d, e, f do too.
    for (const x of ['b', 'c', 'd', 'e', 'f']) data = feed(data, id[x], [id.a], 3);
    for (const x of ['a', 'b', 'c']) data = declare(data, id[x]);
    const l = lay(ov(data));
    expect(l.links).toHaveLength(5);
    for (const [node, pts] of endsByNode(l.links))
      for (const [i, p] of pts.entries())
        for (const q of pts.slice(i + 1)) expect(dist(p[0], p[1], q[0], q[1]), node).toBeGreaterThanOrEqual(MIN_END_ANGLE * BOTTOM_R * 0.9);
  });

  it('A → B and B → A are two branches with four different ends', () => {
    let { data, id } = make('draw', 'make apparel');
    data = feed(data, id.draw, [id['make apparel']], 2);
    data = feed(data, id['make apparel'], [id.draw], 1);
    const l = lay(ov(data));
    expect(l.links.map((k) => k.key).sort()).toEqual([`${id.draw}>${id['make apparel']}`, `${id['make apparel']}>${id.draw}`].sort());
    const [x, y] = l.links.map((k) => k.branch!);
    expect(dist(x.x1, x.y1, y.x2, y.y2)).toBeGreaterThan(4);
    expect(dist(x.x2, x.y2, y.x1, y.y1)).toBeGreaterThan(4);
    expect(x.points).not.toBe(y.points);
  });

  it('a branch along the top row bows under the circle between its ends', () => {
    let { data, id } = make('a', 'b', 'c');
    data = feed(data, id.c, [id.a], 3);
    for (const x of ['a', 'b', 'c']) data = declare(data, id[x]);
    const l = lay(ov(data));
    const mid = l.nodes.find((n) => n.id === id.b)!.circle!;
    const pts = l.links[0].branch!.points.split(' ').map((p) => p.split(',').map(Number));
    for (const [x, y] of pts) expect(dist(x, y, mid.cx, mid.cy)).toBeGreaterThan(mid.r);
  });

  it('no width from a count: one link and twenty draw the same branch; wider at the parent than at the child', () => {
    const shape = (n: number) => {
      let { data, id } = make('draw', 'make apparel');
      for (let i = 0; i < n; i++) data = feed(data, id.draw, [id['make apparel']], 3);
      // Declared either way, so only the count differs.
      return lay(ov(declare(data, id['make apparel']))).links[0];
    };
    expect(shape(20).branch).toEqual(shape(1).branch);
    expect(shape(20).width).toBe(shape(1).width);
    const pts = shape(1).branch!.points.split(' ').map((p) => p.split(',').map(Number));
    const n = pts.length / 2;
    const widthAt = (i: number) => dist(pts[i][0], pts[i][1], pts[pts.length - 1 - i][0], pts[pts.length - 1 - i][1]);
    expect(widthAt(n - 1)).toBeGreaterThan(widthAt(0));
  });
});
