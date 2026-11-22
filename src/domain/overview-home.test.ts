/** P-34: the graph is Home — no threshold (logs on their own), staged-step lines, the roomy layout. */
import { describe, expect, it } from 'vitest';

import { declareThread, ensureThread, logActivity, updateThread } from './model';
import { headerWhys, looseOverview, LOGS_H, MAX_DOTS, MAX_THREADS, overview, overviewLayout, pictureItems, ROOMY_H, ROOMY_NODE, STEP_CHARS, STEP_H, stagedStep } from './overview';
import { Data, emptyData, Id, Thread } from './types';

const NOW = new Date(Date.UTC(2026, 10, 22, 12));
const at = (minutes: number) => new Date(NOW.getTime() - minutes * 6e4);
const W = 350;

function make(...names: string[]) {
  let data: Data = emptyData();
  const id: Record<string, Id> = {};
  names.forEach((n, i) => {
    const r = ensureThread(data, n, at(10_000 - i));
    data = r.data;
    id[n] = r.thread.id;
  });
  return { data, id };
}
const loose = (data: Data, text: string, minutes: number) => logActivity(data, { text, occurredAt: at(minutes) }, at(minutes));
const to = (data: Data, text: string, toIds: Id[], minutes: number) => logActivity(data, { text, toIds, occurredAt: at(minutes) }, at(minutes)).data;
const thread = (over: Partial<Thread>): Thread => ({ id: 't', name: 'draw', hidden: false, createdAt: NOW.toISOString(), ...over });

describe('no wanders: your recent logs on their own (no threshold)', () => {
  it('nothing logged: nothing to draw (the welcome shows instead)', () => {
    expect(looseOverview(emptyData())).toBeUndefined();
  });

  it('one log is already a dot, the newest marked, with a summary naming it', () => {
    const { data, activity } = loose(emptyData(), 'sketched a hand', 1);
    const o = looseOverview(data)!;
    expect(o.mode).toBe('logs');
    expect(o.dots.map((d) => d.id)).toEqual([activity.id]);
    expect(o.summary).toBe('Lately: sketched a hand.');
    const l = overviewLayout(o, W, { roomy: true });
    expect(l.summaryOnly).toBe(false);
    expect(l.nodes).toEqual([]);
    expect(l.dotLines).toEqual([]);
    expect(l.dots.map((d) => [d.id, d.newest])).toEqual([[activity.id, true]]);
  });

  it('the summary names the recent logs in words, newest first, each once; dots cap at eight', () => {
    let data = emptyData();
    const texts = ['read a book', 'ran', 'read a book', 'sketched', 'stretched', 'cooked', 'tidied', 'called mum', 'wrote', 'swam'];
    texts.forEach((t, i) => (data = loose(data, t, texts.length - i).data));
    const o = looseOverview(data)!;
    expect(o.dots).toHaveLength(MAX_DOTS);
    expect(o.summary).toBe('Lately: swam; wrote; called mum; tidied; cooked; stretched; sketched; read a book.');
    expect(o.summary).not.toMatch(/\d/);
  });

  it('dots fill in reading order and stay put as more logs arrive; the mark moves to the newest', () => {
    let data = emptyData();
    for (let i = 0; i < 3; i++) data = loose(data, `log ${'abc'[i]}`, 10 - i).data;
    const first = overviewLayout(looseOverview(data)!, W, { roomy: true });
    expect(first.height).toBe(LOGS_H);
    // Newest first, each in the next free spot: all three in the top row, left to right.
    const ys = new Set(first.dots.map((d) => d.y));
    expect(ys).toEqual(new Set([0]));
    const xs = first.dots.map((d) => d.x);
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
    const next = loose(data, 'log d', 1);
    const second = overviewLayout(looseOverview(next.data)!, W, { roomy: true, prev: first.slots });
    for (const d of first.dots) expect(second.dots.find((e) => e.id === d.id)).toMatchObject({ x: d.x, y: d.y, newest: false });
    expect(second.dots.find((d) => d.id === next.activity.id)?.newest).toBe(true);
  });

  it('hidden wanders don’t count: their logs show on their own', () => {
    let { data, id } = make('draw');
    data = to(data, 'sketch', [id.draw], 1);
    data = updateThread(data, id.draw, { hidden: true });
    expect(overview(data)).toBeUndefined();
    expect(looseOverview(data)?.summary).toBe('Lately: sketch.');
  });
});

describe('staged steps: one quiet line under their node', () => {
  it('only where a step exists: nothing for none or blank', () => {
    expect(stagedStep(thread({}))).toBeUndefined();
    expect(stagedStep(thread({ next: '   ' }))).toBeUndefined();
    expect(stagedStep(thread({ next: '  sketch   a hand ' }))).toBe('sketch a hand');
  });

  it('long ones are truncated (no age, no count added)', () => {
    const long = 'finish the whole sleeve pattern and then cut the fabric for the second one';
    const line = stagedStep(thread({ next: long }))!;
    expect(line.length).toBeLessThanOrEqual(STEP_CHARS);
    expect(line.endsWith('…')).toBe(true);
    expect(long.startsWith(line.slice(0, -1))).toBe(true);
    expect(stagedStep(thread({ next: 'x'.repeat(STEP_CHARS) }))).toBe('x'.repeat(STEP_CHARS));
  });

  it('the roomy layout puts the step under its node only; the compact one has none', () => {
    let { data, id } = make('draw', 'knit');
    data = to(data, 'sketch', [id.draw], 2);
    data = to(data, 'cast on', [id.knit], 1);
    data = updateThread(data, id.draw, { next: 'sketch a hand' });
    const o = overview(data, headerWhys(data, NOW))!;
    const l = overviewLayout(o, W, { roomy: true });
    expect(l.nodes.find((n) => n.id === id.draw)?.step).toBe('sketch a hand');
    expect(l.nodes.find((n) => n.id === id.knit)?.step).toBeUndefined();
    expect(l.stepH).toBe(STEP_H);
    expect(overviewLayout(o, W).nodes.every((n) => n.step === undefined)).toBe(true);
  });
});

describe('the roomy layout (Home): room to breathe, the same caps', () => {
  const world = () => {
    let { data, id } = make('make apparel', 'draw', 'sew', 'knit', 'lift', 'run', 'read', 'cook');
    for (const [n, name] of ['draw', 'sew', 'knit', 'lift', 'run', 'read', 'cook'].entries()) data = logActivity(data, { text: 'x', doingId: id[name], toIds: [id['make apparel']], occurredAt: at(100 - n) }, at(100 - n)).data;
    for (let i = 0; i < 12; i++) data = to(data, `log ${i}`, [id.draw], 50 - i);
    const r = declareThread(data, id['make apparel'], at(5));
    if (!r.ok) throw new Error('declare');
    data = updateThread(r.data, id.sew, { next: 'hem the skirt' });
    return { data, id };
  };

  it('bigger node targets (44 px chips), full height even with one wander, never shrinking', () => {
    let { data, id } = make('draw');
    data = to(data, 'sketch', [id.draw], 1);
    const one = overviewLayout(overview(data, [])!, W, { roomy: true });
    expect(one.height).toBe(ROOMY_H);
    expect(one.nodes[0].h).toBe(ROOMY_NODE);
    expect(ROOMY_NODE).toBeGreaterThan(44);
  });

  it('no more nodes or dots than before (six, eight), and nothing overlaps, at 390 px and wide', () => {
    const { data } = world();
    const o = overview(data, headerWhys(data, NOW))!;
    for (const width of [W, 600]) {
      const l = overviewLayout(o, width, { roomy: true });
      expect(l.nodes.length).toBeLessThanOrEqual(MAX_THREADS);
      expect(l.dots.length).toBeLessThanOrEqual(MAX_DOTS);
      expect(l.more).toBeDefined();
      // A node with its step line under it, the dots and "and more" never overlap.
      const boxes = [...l.nodes.map((n) => ({ ...n, h: n.h + l.stepH })), ...l.dots, ...(l.more ? [l.more] : [])];
      for (const [i, a] of boxes.entries()) {
        expect(a.x).toBeGreaterThanOrEqual(0);
        expect(a.x + a.w).toBeLessThanOrEqual(width + 0.01);
        expect(a.y + a.h).toBeLessThanOrEqual(l.height);
        for (const b of boxes.slice(i + 1)) {
          const apart = a.x + a.w <= b.x + 0.01 || b.x + b.w <= a.x + 0.01 || a.y + a.h <= b.y || b.y + b.h <= a.y;
          expect(apart, `${JSON.stringify(a)} / ${JSON.stringify(b)}`).toBe(true);
        }
      }
    }
  });

  it('setting a step moves nothing', () => {
    const { data, id } = world();
    const before = overviewLayout(overview(data, headerWhys(data, NOW))!, W, { roomy: true });
    const stepped = updateThread(data, id.draw, { next: 'ink it' });
    const after = overviewLayout(overview(stepped, headerWhys(stepped, NOW))!, W, { roomy: true, prev: before.slots });
    expect(after.nodes.map((n) => [n.id, n.x, n.y])).toEqual(before.nodes.map((n) => [n.id, n.x, n.y]));
    expect(after.dots.map((d) => [d.id, d.x, d.y])).toEqual(before.dots.map((d) => [d.id, d.x, d.y]));
  });
});

describe('the list after the summary (the way through without pointing)', () => {
  it('whys first (marked as what they’re for), then the wanders beside them, at most six', () => {
    const { data, id } = (() => {
      let { data, id } = make('make apparel', 'draw', 'sew', 'knit', 'lift', 'run', 'read', 'cook');
      for (const name of ['draw', 'sew']) data = logActivity(data, { text: 'x', doingId: id[name], toIds: [id['make apparel']], occurredAt: at(5) }, at(5)).data;
      for (const name of ['knit', 'lift', 'run', 'read', 'cook']) data = to(data, 'x', [id[name]], 3);
      const r = declareThread(data, id['make apparel'], at(1));
      if (!r.ok) throw new Error('declare');
      return { data: r.data, id };
    })();
    const items = pictureItems(overview(data, headerWhys(data, NOW))!);
    expect(items).toHaveLength(MAX_THREADS);
    expect(items[0]).toEqual({ id: id['make apparel'], name: 'make apparel', why: true });
    expect(items.slice(1).every((i) => !i.why)).toBe(true);
    expect(items.slice(1, 3).map((i) => i.name)).toEqual(['draw', 'sew']);
  });

  it('no whys: the wanders in the picture; no wanders: nothing', () => {
    let { data, id } = make('draw', 'knit');
    data = to(data, 'x', [id.draw], 2);
    data = to(data, 'y', [id.knit], 1);
    expect(pictureItems(overview(data, [])!).map((i) => [i.name, i.why])).toEqual([
      ['draw', false],
      ['knit', false],
    ]);
    expect(pictureItems(looseOverview(loose(emptyData(), 'ran', 1).data)!)).toEqual([]);
  });
});
