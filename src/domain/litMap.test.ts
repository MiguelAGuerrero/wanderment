/**
 * P-81 (B-09 slice 3): "I'm not sure" lights the map in place — whys and wanders as named nodes, all
 * one size (warmth by glow only, none with the shading off), links from the shown lines to the nodes
 * they went toward, complete for the shown whys, never moving the feed's lines (fold-in 7).
 * P-82 (slice 4): a line lands in its node in ≤ 600 ms and says where it went in words.
 */
import { describe, expect, it } from 'vitest';

import { feedLines, pickFeed } from './feed';
import { GUIDE_BAND_END } from './home';
import { BAND_TOP, bandHeight, EDGE, FEED_SIDE, LAND_MS, landedWords, LINK_GUTTER, linkRoute, litGeometry, litLineName, litLinks, litNodes, NODE_CLEAR, NODE_H, nodeName, nodePlaces, nodeWidth, segmentHitsBox } from './litMap';
import { mapTop } from './trailhead';
import { Data, emptyData, Thread } from './types';

const DAY = 864e5;
const NOW = new Date(2026, 10, 24, 15, 0);
const ago = (days: number) => new Date(NOW.getTime() - days * DAY).toISOString();

function world(): Data {
  const d = emptyData();
  const t = (id: string, name: string, made: number, extra: Partial<Thread> = {}): Thread => ({ id, name, hidden: false, createdAt: ago(made), ...extra });
  d.threads = {
    fp: t('fp', 'feel productive', 200, { declaredAt: ago(30) }),
    ill: t('ill', 'Become an illustrator', 150, { declaredAt: ago(20) }),
    tidy: t('tidy', 'tidy', 100),
    draw: t('draw', 'draw', 120),
    cook: t('cook', 'cook', 90),
    gone: t('gone', 'hidden one', 80, { hidden: true }),
    lone: t('lone', 'learn Spanish', 70),
  };
  const a = (id: string, text: string, days: number, doingId?: string, toIds: string[] = []) => ({ id, text, occurredAt: ago(days), createdAt: ago(days), toIds, ...(doingId && { doingId }) });
  d.activities = {
    k: a('k', 'cleaned the kitchen', 2, 'tidy', ['fp']),
    s: a('s', 'sketched hands', 0.1, 'draw', ['ill']),
    c: a('c', 'made soup', 3, 'cook'),
    r: a('r', 'read on the bus', 1),
    h: a('h', 'hid this', 1, 'gone'),
    m: a('m', 'tidied the desk', 30, 'tidy', ['fp']),
  };
  return d;
}

describe('litNodes: the whys and wanders the map lights, in a fixed order', () => {
  it('whys first (declared, oldest mark first), then every wander feeding them, then where the shown lines went', () => {
    const nodes = litNodes(world(), ['r', 'c'], { now: NOW });
    expect(nodes.map((n) => n.id)).toEqual(['fp', 'ill', 'tidy', 'draw', 'cook']);
    expect(nodes.filter((n) => n.why).map((n) => n.id)).toEqual(['fp', 'ill']);
  });

  it('complete for the shown whys: a feeder is lit even when no shown line went to it', () => {
    // No shown lines at all: the whys' feeders (tidy feeds fp, draw feeds ill) still light.
    expect(litNodes(world(), [], { now: NOW }).map((n) => n.id)).toEqual(['fp', 'ill', 'tidy', 'draw']);
  });

  it('hidden wanders never light; a wander nothing points at stays dark unless a line just landed in it', () => {
    const ids = litNodes(world(), ['h'], { now: NOW }).map((n) => n.id);
    expect(ids).not.toContain('gone');
    expect(ids).not.toContain('lone');
    expect(litNodes(world(), [], { now: NOW, extra: ['lone'] }).map((n) => n.id)).toContain('lone');
  });

  it('the order never follows heat: walking a wander warms it and moves nothing', () => {
    const d = world();
    const before = litNodes(d, ['c'], { now: NOW }).map((n) => n.id);
    d.activities.z = { id: 'z', text: 'tidied up', occurredAt: ago(0), createdAt: ago(0), toIds: [], doingId: 'cook' };
    const after = litNodes(d, ['c'], { now: NOW });
    expect(after.map((n) => n.id)).toEqual(before);
    expect(after.find((n) => n.id === 'cook')!.heat).toBeGreaterThan(litNodes(world(), ['c'], { now: NOW }).find((n) => n.id === 'cook')!.heat);
  });

  it('warmth is glow only, 0…1; with the shading off every node is cold', () => {
    for (const n of litNodes(world(), ['c'], { now: NOW })) expect(n.heat).toBeGreaterThanOrEqual(0);
    for (const n of litNodes(world(), ['c'], { now: NOW, shading: false })) expect(n.heat).toBe(0);
  });

  it('with no wanders, nothing lights', () => {
    const d = emptyData();
    d.activities.x = { id: 'x', text: 'loose', occurredAt: ago(1), createdAt: ago(1), toIds: [] };
    expect(litNodes(d, ['x'], { now: NOW })).toEqual([]);
  });
});

describe('litLinks: each shown line to the nodes it went toward', () => {
  it('doing and to, once each, only to lit nodes; a loose line has none', () => {
    const d = world();
    const nodes = litNodes(d, ['k', 's', 'r'], { now: NOW }).map((n) => n.id);
    expect(litLinks(d, ['k', 's', 'r'], nodes)).toEqual([
      { from: 'k', to: 'tidy' },
      { from: 'k', to: 'fp' },
      { from: 's', to: 'draw' },
      { from: 's', to: 'ill' },
    ]);
    expect(litLinks(d, ['h'], nodes)).toEqual([]);
  });
});

describe('nodePlaces: fixed slots across the band’s full width (P-81 rework)', () => {
  it('each node in its own slot, from its id; the order given never matters; one row is one target tall', () => {
    const nodes = ['feel productive', 'Become an illustrator', 'tidy', 'draw', 'cook'].map((name, i) => ({ id: `n${i}`, name }));
    const { places, rows } = nodePlaces(nodes, 350);
    const slots = Object.values(places).map((p) => `${p.row}:${p.col}`);
    expect(new Set(slots).size).toBe(nodes.length);
    expect(nodePlaces([...nodes].reverse(), 350)).toEqual({ places, rows });
    for (const p of Object.values(places)) expect(p.x + p.w).toBeLessThanOrEqual(350 + 0.001);
    // Across the full width: both columns used.
    expect(new Set(Object.values(places).map((p) => p.col)).size).toBe(2);
    expect(bandHeight(rows)).toBe(BAND_TOP + rows * NODE_H);
    expect(NODE_H).toBeGreaterThanOrEqual(44);
  });

  it('a narrow window has one column, each slot the band’s width', () => {
    const { places } = nodePlaces([{ id: 'a', name: 'x'.repeat(200) }, { id: 'b', name: 'b' }], 150);
    for (const p of Object.values(places)) expect(p).toMatchObject({ col: 0, x: 0, w: 150 });
    expect(nodeWidth('x'.repeat(200), 150)).toBe(150);
  });

  it('nothing to light: no band', () => {
    expect(nodePlaces([], 350).rows).toBe(0);
    expect(bandHeight(0)).toBe(0);
  });
});

describe('litGeometry: the lit map’s layout rules (P-81 rework)', () => {
  const gap = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
    Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), b.y - (a.y + a.h), a.y - (b.y + b.h));

  function check(data: Data, width: number, height: number) {
    const ids = pickFeed(data, NOW);
    const lines = feedLines(data, ids, NOW);
    const nodes = litNodes(data, ids, { now: NOW });
    const { places, rows } = nodePlaces(nodes, width - 2 * FEED_SIDE);
    const top = mapTop({ guideTop: Math.ceil(GUIDE_BAND_END * height) + 12, band: bandHeight(rows) });
    const rowH = Math.max(44, (height - 220 - top) / 6);
    const links = litLinks(data, ids, nodes.map((n) => n.id));
    const g = litGeometry({ lines, places, links, width, top, rowH });
    const names = Object.values(g.nameBoxes);
    const nodeBoxes = Object.values(g.nodeBoxes);
    // Nodes: one size of target, never two in one place, names ≥ 24 px apart, nothing within 16 px of the edge.
    for (const b of nodeBoxes) {
      expect(b.h).toBeGreaterThanOrEqual(44);
      expect(b.x).toBeGreaterThanOrEqual(EDGE);
      expect(b.x + b.w).toBeLessThanOrEqual(width - EDGE + 0.001);
    }
    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) expect(gap(names[i], names[j])).toBeGreaterThanOrEqual(NODE_CLEAR - 0.001);
    // …and from every other node's mark.
    const named = Object.keys(g.nameBoxes);
    for (const a of named)
      for (const b of named) {
        if (a === b) continue;
        const nb = g.nodeBoxes[b];
        const mark = { x: nb.x, y: nb.y + (nb.h - 16) / 2, w: 16, h: 16 };
        expect(gap(g.nameBoxes[a], mark), `${a}'s name too near ${b}'s mark`).toBeGreaterThanOrEqual(NODE_CLEAR - 0.001);
      }
    for (let i = 0; i < nodeBoxes.length; i++) for (let j = i + 1; j < nodeBoxes.length; j++) expect(gap(nodeBoxes[i], nodeBoxes[j])).toBeGreaterThanOrEqual(0);
    // The band sits above the feed: no line's words in it.
    for (const b of Object.values(g.lineBoxes)) for (const n of nodeBoxes) expect(gap(b, n)).toBeGreaterThan(0);
    // Links: every one routed, none across any words (a line's or a node's).
    expect(g.routes).toHaveLength(links.length);
    for (const r of g.routes)
      for (let i = 1; i < r.points.length; i++)
        for (const box of [...Object.values(g.lineBoxes), ...names]) expect(segmentHitsBox(r.points[i - 1], r.points[i], box), `${r.from}→${r.to} across words`).toBe(false);
    return { g, links };
  }

  it('the e2e world (two whys, their wanders, four lines) at 390 × 844 and 390 × 480', () => {
    const d = world();
    const { links } = check(d, 390, 844);
    expect(links.length).toBeGreaterThan(0);
    check(d, 390, 480);
  });

  it('twelve wanders and a full feed, at 390 and at 320 wide', () => {
    const d = world();
    for (let i = 0; i < 12; i++) {
      const id = `w${i}`;
      d.threads[id] = { id, name: ['practise scales', 'write letters', 'garden', 'learn to swim well', 'cook more', 'read poetry', 'fix the bike', 'sketch daily', 'run', 'call friends', 'bake bread', 'meditate'][i], hidden: false, createdAt: ago(60 - i) };
      d.activities[`x${i}`] = { id: `x${i}`, text: `walked ${i} toward it, a long while and then some`, occurredAt: ago(i * 1.5), createdAt: ago(i * 1.5), toIds: i % 2 ? ['fp'] : ['ill'], doingId: id };
    }
    check(d, 390, 844);
    check(d, 320, 700);
  });

  it('a link that would cross the words of a line above goes round them (the straight line would have)', () => {
    const light = { x: 40, y: 300 };
    const mark = { x: 220, y: 30, rowBottom: 52 };
    const words = { x: 66, y: 190, w: 250, h: 20 };
    expect(segmentHitsBox(light, mark, words)).toBe(true);
    const r = linkRoute(light, mark, LINK_GUTTER);
    for (let i = 1; i < r.length; i++) expect(segmentHitsBox(r[i - 1], r[i], words)).toBe(false);
  });
});

describe('words', () => {
  it('a node is named with when it was last walked, in words, never a count', () => {
    expect(nodeName({ name: 'tidy', walked: ago(0.1) }, NOW)).toBe('tidy, last walked today');
    expect(nodeName({ name: 'learn Spanish' }, NOW)).toBe('learn Spanish, not walked yet');
  });

  it('a lit line keeps its words and when, then says where it went', () => {
    expect(litLineName({ text: 'cleaned the kitchen', when: 'on Sunday' }, ['tidy', 'feel productive'])).toBe('cleaned the kitchen, on Sunday, toward tidy and feel productive');
    expect(litLineName({ text: 'read on the bus', when: 'yesterday' }, [])).toBe('read on the bus, yesterday');
  });

  it('a landed line says where it went; it lands within 600 ms', () => {
    expect(landedWords('  washed   the car ', 'tidy')).toBe('washed the car → tidy');
    expect(LAND_MS).toBeLessThanOrEqual(600);
    expect(LAND_MS).toBeGreaterThan(0);
  });
});
