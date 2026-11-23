/** P-60: a calmer Home — labels clear of every circle and ring, and the strip of loose logs. */
import { describe, expect, it } from 'vitest';

import { STEP_ADD_R, stepMark } from './focus';
import { declareThread, ensureThread, logActivity, updateThread } from './model';
import { headerWhys, LABEL_LINE, LOOSE_DAYS, LOOSE_MAX, looseLogs, overview, Overview, overviewLayout, OverviewLayout, RING_OUT, scopeLayout } from './overview';
import { Data, emptyData, Id } from './types';

const NOW = new Date(Date.UTC(2026, 10, 23, 12));
const day = (n: number) => new Date(NOW.getTime() - n * 864e5);

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
const feed = (data: Data, from: Id | undefined, to: Id[], daysAgo: number, text = 'x') => logActivity(data, { text, doingId: from, toIds: to, occurredAt: day(daysAgo) }, day(daysAgo)).data;
const declare = (data: Data, id: Id) => {
  const r = declareThread(data, id, day(1));
  if (!r.ok) throw new Error('declare');
  return r.data;
};
const ov = (data: Data) => overview(data, headerWhys(data, NOW), { now: NOW })!;

type Box = { x: number; y: number; w: number; h: number };
const overlap = (a: Box, b: Box) => a.x < b.x + b.w - 0.01 && b.x < a.x + a.w - 0.01 && a.y < b.y + b.h - 0.01 && b.y < a.y + a.h - 0.01;
/** Whether a box comes within `R` of a point (a circle with its rings). */
const touchesDisc = (b: Box, cx: number, cy: number, R: number) => {
  const dx = Math.max(b.x - cx, 0, cx - (b.x + b.w));
  const dy = Math.max(b.y - cy, 0, cy - (b.y + b.h));
  return dx * dx + dy * dy < R * R;
};
const inBox = (b: Box, x: number, y: number) => x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h;

/** The box an under-the-circle label can take: its width, two lines. */
function labelBox(l: OverviewLayout['nodes'][number]): Box {
  const c = l.circle!;
  return { x: c.cx - c.labelW / 2, y: c.labelY, w: c.labelW, h: c.labelH };
}

/** Every circle with its rings, every branch end, the step mark (for whichever node is focused) and "and more →" stay clear of every label. */
function expectClear(l: OverviewLayout, width: number, what: string) {
  const under = l.nodes.filter((n) => !n.circle!.inside);
  expect(under.length, `${what}: some labels go under`).toBeGreaterThan(0);
  for (const n of under) {
    const c = n.circle!;
    const lb = labelBox(n);
    // Fully below its own outermost ring (the focus ring round a declared why), with a gap.
    expect(lb.y - (c.cy + c.r + RING_OUT), `${what}: ${n.name} gap`).toBeGreaterThanOrEqual(4);
    // At most two lines, inside its own target and the picture.
    expect(c.labelH, n.name).toBeLessThanOrEqual(2 * LABEL_LINE + 0.01);
    expect(lb.x).toBeGreaterThanOrEqual(n.x - 0.01);
    expect(lb.x + lb.w).toBeLessThanOrEqual(n.x + n.w + 0.01);
    expect(lb.y + lb.h).toBeLessThanOrEqual(n.y + n.h + 0.01);
    expect(lb.y + lb.h).toBeLessThanOrEqual(l.height);
    for (const m of l.nodes) {
      const mc = m.circle!;
      expect(touchesDisc(lb, mc.cx, mc.cy, mc.r + RING_OUT), `${what}: ${n.name}'s label / ${m.name}'s rings`).toBe(false);
      if (m !== n && !mc.inside) expect(overlap(lb, labelBox(m)), `${what}: ${n.name} / ${m.name} labels`).toBe(false);
      // The focused node's step mark (dot or ＋, with its 44 px target) and its words.
      const s = stepMark(mc, width, l.height);
      const mark = { x: s.x - 22, y: s.y - 22, w: 44, h: 44 };
      const words = { x: s.label.x, y: s.y - LABEL_LINE / 2 - 1, w: s.label.w, h: LABEL_LINE + 2 };
      expect(overlap(lb, mark), `${what}: ${n.name}'s label / ${m.name}'s step mark`).toBe(false);
      expect(overlap(lb, words), `${what}: ${n.name}'s label / ${m.name}'s step words`).toBe(false);
      expect(s.y + STEP_ADD_R).toBeLessThanOrEqual(l.height);
    }
    for (const k of l.links) {
      const b = k.branch!;
      expect(inBox(lb, b.x1, b.y1) || inBox(lb, b.x2, b.y2), `${what}: ${n.name}'s label / branch end ${k.key}`).toBe(false);
    }
    if (l.more) expect(overlap(lb, l.more), `${what}: ${n.name}'s label / and more`).toBe(false);
  }
  // A step mark's target never covers a circle either, nor "and more →".
  for (const m of l.nodes) {
    const s = stepMark(m.circle!, width, l.height);
    const mark = { x: s.x - 22, y: s.y - 22, w: 44, h: 44 };
    for (const o of l.nodes) expect(touchesDisc(mark, o.circle!.cx, o.circle!.cy, o.circle!.r + RING_OUT), `${what}: ${m.name}'s step mark / ${o.name}`).toBe(false);
    if (l.more) expect(overlap(mark, l.more), `${what}: ${m.name}'s step mark / and more`).toBe(false);
  }
}

/** Three declared whys with long names (the owner's "feel productive" among them), long-named wanders feeding them, more than fit. */
function longWorld() {
  const names = ['feel productive', 'make apparel for the spring market', 'Supercalifragilisticexpialidocious', 'draw better hands every evening', 'sew', 'read philosophy slowly', 'knit', 'lift'];
  let { data, id } = make(...names);
  data = feed(data, id['draw better hands every evening'], [id['make apparel for the spring market']], 2);
  data = feed(data, id.sew, [id['make apparel for the spring market']], 3);
  data = feed(data, id['read philosophy slowly'], [id['feel productive']], 4);
  data = feed(data, id.knit, [id.Supercalifragilisticexpialidocious], 5);
  data = feed(data, id.lift, [], 6);
  for (const w of ['feel productive', 'make apparel for the spring market', 'Supercalifragilisticexpialidocious']) data = declare(data, id[w]);
  data = updateThread(data, id['feel productive'], { next: 'Clean my car' });
  return { data, id };
}

describe('P-60: labels never overlap a circle or its rings', () => {
  it('the owner’s Home: one declared why, “feel productive”, its label wholly below its rings', () => {
    let { data, id } = make('feel productive');
    data = declare(data, id['feel productive']);
    data = updateThread(data, id['feel productive'], { next: 'Clean my car' });
    for (const width of [350, 390, 600]) {
      const l = overviewLayout(ov(data), width, { roomy: true });
      const n = l.nodes[0];
      expect(n.circle!.inside).toBe(false);
      expect(n.circle!.labelY).toBeGreaterThanOrEqual(n.circle!.cy + n.circle!.r + RING_OUT + 4);
      expectClear(l, width, `one why at ${width}`);
    }
  });

  it('long names at 350, 390 and 600 px: every label below its rings, clear of every node, branch end, step mark and “and more →”', () => {
    const { data } = longWorld();
    const o = ov(data);
    expect(o.more).toBe(true);
    for (const width of [350, 390, 600]) expectClear(overviewLayout(o, width, { roomy: true }), width, `All at ${width}`);
  });

  it('with larger native text (130 %), the labels’ two lines get their room', () => {
    const { data } = longWorld();
    const l = overviewLayout(ov(data), 350, { roomy: true, fontScale: 1.3 });
    expect(l.summaryOnly).toBe(false);
    for (const n of l.nodes.filter((x) => !x.circle!.inside)) expect(n.circle!.labelH).toBeGreaterThanOrEqual(2 * LABEL_LINE * 1.3);
    // (The two-line cap is in px at 1×; here it's 1.3× that.)
    for (const n of l.nodes) {
      const c = n.circle!;
      if (!c.inside) expect(c.labelY - (c.cy + c.r + RING_OUT)).toBeGreaterThanOrEqual(4);
      for (const m of l.nodes) if (!c.inside) expect(touchesDisc(labelBox(n), m.circle!.cx, m.circle!.cy, m.circle!.r + RING_OUT)).toBe(false);
    }
  });

  it('narrowed to a node, the same holds', () => {
    const { data, id } = longWorld();
    const o: Overview = ov(data);
    for (const width of [350, 390, 600]) {
      const all = overviewLayout(o, width, { roomy: true });
      const l = scopeLayout(o, all, id['make apparel for the spring market'], width);
      expect(l).not.toBe(all);
      expectClear(l, width, `narrowed at ${width}`);
    }
  });
});

describe('P-60: loose logs (no doing, no to) under the graph', () => {
  it('the last few unattached logs, newest first, with their words and heat; attached ones never', () => {
    let { data, id } = make('feel productive');
    data = declare(data, id['feel productive']);
    data = feed(data, undefined, [], 5, 'old  loose\none');
    data = feed(data, undefined, [], 3, 'walked the dog');
    data = feed(data, undefined, [id['feel productive']], 1, 'attached to the why');
    data = feed(data, id['feel productive'], [], 1, 'doing the why');
    data = feed(data, undefined, [], 2, 'read a book');
    data = feed(data, undefined, [], 0, 'clean my car');
    const loose = looseLogs(data, { now: NOW });
    expect(LOOSE_MAX).toBeGreaterThanOrEqual(3);
    expect(LOOSE_MAX).toBeLessThanOrEqual(4);
    expect(loose.map((l) => l.text)).toEqual(['clean my car', 'read a book', 'walked the dog', 'old loose one'].slice(0, LOOSE_MAX));
    // Fading with age: newer is warmer.
    for (let i = 1; i < loose.length; i++) expect(loose[i].heat).toBeLessThan(loose[i - 1].heat);
    expect(loose[0].heat).toBe(1);
  });

  it('only recent ones (older than three weeks have gone to Earlier), none with the shading off is warm, none at all is empty', () => {
    let { data } = make('feel productive');
    expect(looseLogs(data, { now: NOW })).toEqual([]);
    data = feed(data, undefined, [], LOOSE_DAYS + 1, 'long ago');
    expect(looseLogs(data, { now: NOW })).toEqual([]);
    data = feed(data, undefined, [], 1, 'yesterday');
    expect(looseLogs(data, { now: NOW }).map((l) => l.text)).toEqual(['yesterday']);
    expect(looseLogs(data, { now: NOW, shading: false })[0].heat).toBe(0);
  });

  it('a log attached later leaves the strip', () => {
    let { data, id } = make('feel productive');
    data = feed(data, undefined, [], 0, 'clean my car');
    const [only] = looseLogs(data, { now: NOW });
    data = { ...data, activities: { ...data.activities, [only.id]: { ...data.activities[only.id], toIds: [id['feel productive']] } } };
    expect(looseLogs(data, { now: NOW })).toEqual([]);
  });
});
