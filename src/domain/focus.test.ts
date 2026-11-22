/** P-50: tap to focus, swipe to move, tap to narrow (B-06 revision 12, "One mark per job"). */
import { describe, expect, it } from 'vitest';

import { canNarrow, chains, FocusMap, pathName, scopeIds, STEP_ADD_R, STEP_DOT_R, stepFocus, stepMark, subtree, validScope } from './focus';
import { contrast } from './heat';
import { declareThread, ensureThread, logActivity, updateThread } from './model';
import { headerWhys, overview, overviewLayout, ROOMY_H, scopeLayout, TOP_R } from './overview';
import { Data, emptyData, Id } from './types';

/**
 * The mockup's picture (frame 1): make apparel ← draw ← draw better hands, make apparel ← sew,
 * feel productive ← read, and guitar on its own. Positions as drawn (circle centres).
 */
const MAP: FocusMap = {
  nodes: [
    { id: 'ma', name: 'make apparel', x: 60, y: 50, why: true },
    { id: 'fp', name: 'feel productive', x: 150, y: 50, why: true },
    { id: 'gt', name: 'guitar', x: 238, y: 50, why: false },
    { id: 'dr', name: 'draw', x: 34, y: 138, why: false },
    { id: 'se', name: 'sew', x: 94, y: 136, why: false },
    { id: 'rd', name: 'read', x: 150, y: 138, why: false },
    { id: 'dh', name: 'draw better hands', x: 56, y: 202, why: false },
  ],
  links: [
    { from: 'dr', to: 'ma' },
    { from: 'se', to: 'ma' },
    { from: 'rd', to: 'fp' },
    { from: 'dh', to: 'dr' },
  ],
};

describe('scope: a node and everything feeding it', () => {
  it('the subtree of a node is itself and everything that feeds it, however deep', () => {
    expect([...subtree(MAP, 'ma')].sort()).toEqual(['dh', 'dr', 'ma', 'se']);
    expect([...subtree(MAP, 'dr')].sort()).toEqual(['dh', 'dr']);
    expect([...subtree(MAP, 'gt')]).toEqual(['gt']);
  });

  it('All is every node; a scope is its last node’s subtree', () => {
    expect(scopeIds(MAP, []).size).toBe(7);
    expect([...scopeIds(MAP, ['ma', 'dr'])].sort()).toEqual(['dh', 'dr']);
  });

  it('only a node with something feeding it inside the scope can be narrowed to (and not the scope itself)', () => {
    expect(canNarrow(MAP, [], 'ma')).toBe(true);
    expect(canNarrow(MAP, [], 'dr')).toBe(true);
    expect(canNarrow(MAP, [], 'se')).toBe(false);
    expect(canNarrow(MAP, [], 'gt')).toBe(false);
    expect(canNarrow(MAP, ['ma'], 'ma')).toBe(false);
    expect(canNarrow(MAP, ['ma'], 'dr')).toBe(true);
    // Outside the scope.
    expect(canNarrow(MAP, ['ma'], 'fp')).toBe(false);
  });

  it('a scope that no longer holds (a node gone, or nothing feeding it any more) is cut back to what does', () => {
    expect(validScope(MAP, ['ma', 'dr'])).toEqual(['ma', 'dr']);
    expect(validScope(MAP, ['ma', 'fp'])).toEqual(['ma']);
    expect(validScope(MAP, ['gone', 'dr'])).toEqual([]);
    expect(validScope({ ...MAP, links: MAP.links.filter((l) => l.to !== 'dr') }, ['ma', 'dr'])).toEqual(['ma']);
  });
});

describe('chains: what a swipe walks, in the picture’s order', () => {
  it('at All, the nodes nothing feeds, left to right (then top to bottom)', () => {
    expect(chains(MAP, [])).toEqual(['dh', 'se', 'rd', 'gt']);
  });

  it('in a scope, only its own chains', () => {
    expect(chains(MAP, ['ma'])).toEqual(['dh', 'se']);
    expect(chains(MAP, ['ma', 'dr'])).toEqual(['dh']);
  });

  it('a loop with nothing outside it feeding in: every node in the scope is a chain', () => {
    const loop: FocusMap = { nodes: MAP.nodes.slice(0, 2), links: [{ from: 'ma', to: 'fp' }, { from: 'fp', to: 'ma' }] };
    expect(chains(loop, [])).toEqual(['ma', 'fp']);
  });

  it('next and previous step through the chains and stop at the ends', () => {
    expect(stepFocus(MAP, [], 'dh', 1)).toBe('se');
    expect(stepFocus(MAP, [], 'se', 1)).toBe('rd');
    expect(stepFocus(MAP, [], 'se', -1)).toBe('dh');
    expect(stepFocus(MAP, [], 'gt', 1)).toBeUndefined();
    expect(stepFocus(MAP, [], 'dh', -1)).toBeUndefined();
    // Within the scope only.
    expect(stepFocus(MAP, ['ma'], 'se', 1)).toBeUndefined();
  });

  it('from a parent, next goes to the first chain under it and previous to the last', () => {
    expect(stepFocus(MAP, [], 'ma', 1)).toBe('dh');
    expect(stepFocus(MAP, [], 'ma', -1)).toBe('se');
    expect(stepFocus(MAP, [], 'fp', 1)).toBe('rd');
    expect(stepFocus(MAP, ['ma'], 'dr', -1)).toBe('dh');
  });

  it('from outside the scope (or the picture), next is the first chain and previous the last', () => {
    expect(stepFocus(MAP, [], 'elsewhere', 1)).toBe('dh');
    expect(stepFocus(MAP, [], undefined, -1)).toBe('gt');
    expect(stepFocus(MAP, ['ma'], 'rd', 1)).toBe('dh');
    expect(stepFocus({ nodes: [], links: [] }, [], 'x', 1)).toBeUndefined();
  });
});

describe('the card’s path name', () => {
  it('names the node, then each node it feeds up to the top: “toward” on the way, “for” a why', () => {
    expect(pathName(MAP, 'dh', 'draw better hands')).toBe('draw better hands, toward draw, for make apparel');
    expect(pathName(MAP, 'se', 'sew')).toBe('sew, for make apparel');
    expect(pathName(MAP, 'ma', 'make apparel')).toBe('make apparel');
    expect(pathName(MAP, 'gt', 'guitar')).toBe('guitar');
  });

  it('a top that isn’t a why is “toward”; a loop is never followed twice', () => {
    const plain: FocusMap = { nodes: MAP.nodes.map((n) => ({ ...n, why: false })), links: [...MAP.links, { from: 'ma', to: 'dh' }] };
    expect(pathName(plain, 'dh', 'draw better hands')).toBe('draw better hands, toward draw, toward make apparel');
  });

  it('a node outside the picture is just its name', () => {
    expect(pathName(MAP, 'hands', 'hands')).toBe('hands');
    expect(pathName(undefined, 'hands', 'hands')).toBe('hands');
  });
});

describe('the step mark: one filled dot on a short branch, beside and below the focused circle', () => {
  it('hangs toward the middle of the picture, below the circle, with its label further out', () => {
    const left = stepMark({ cx: 60, cy: 200, r: 24 }, 350, ROOMY_H);
    expect(left.side).toBe(1);
    expect(left.x).toBeGreaterThan(60 + 24);
    expect(left.y).toBeGreaterThan(200);
    expect(left.label.x).toBeGreaterThan(left.x);
    expect(left.label.align).toBe('left');
    expect(left.label.x + left.label.w).toBeLessThanOrEqual(350);
    const right = stepMark({ cx: 290, cy: 42, r: 34 }, 350, ROOMY_H);
    expect(right.side).toBe(-1);
    expect(right.x).toBeLessThan(290 - 34);
    expect(right.label.x + right.label.w).toBeLessThan(right.x);
    expect(right.label.align).toBe('right');
    expect(right.label.x).toBeGreaterThanOrEqual(0);
  });

  it('stays inside the picture', () => {
    const m = stepMark({ cx: 175, cy: ROOMY_H - 30, r: 24 }, 350, ROOMY_H);
    expect(m.y + STEP_ADD_R).toBeLessThanOrEqual(ROOMY_H);
    expect(m.x - STEP_ADD_R).toBeGreaterThanOrEqual(0);
  });

  it('the branch is a tapered polygon from the circle’s edge to the dot; the dashed one is a path', () => {
    const m = stepMark({ cx: 60, cy: 200, r: 24 }, 350, ROOMY_H);
    expect(m.branch.trim().split(/\s+/).length).toBeGreaterThan(20);
    expect(m.path).toMatch(/^M[\d.]+ [\d.]+Q/);
    expect(STEP_DOT_R).toBeLessThan(STEP_ADD_R);
  });

  it('its marks keep 3:1 against the page', () => {
    // The dashed ＋ circle's outline (C.faint) and the dot and branch (ink, body).
    for (const c of ['#8A867E', '#18181B', '#3F3D39']) expect(contrast(c, '#F5F3EE'), c).toBeGreaterThanOrEqual(3);
  });
});

// ─── The narrowed layout (overview.ts) ─────────────────────────────────────

const NOW = new Date(Date.UTC(2026, 10, 22, 12));
const day = (n: number) => new Date(NOW.getTime() - n * 864e5);
function world() {
  let data: Data = emptyData();
  const id: Record<string, Id> = {};
  ['make apparel', 'feel productive', 'guitar', 'draw', 'sew', 'read', 'draw better hands'].forEach((n, i) => {
    const r = ensureThread(data, n, new Date(day(300).getTime() + i * 6e4));
    data = r.data;
    id[n] = r.thread.id;
  });
  const feed = (from: string, to: string, d: number) => (data = logActivity(data, { text: 'x', doingId: id[from], toIds: [id[to]], occurredAt: day(d) }, day(d)).data);
  feed('draw', 'make apparel', 3);
  feed('sew', 'make apparel', 26);
  feed('read', 'feel productive', 6);
  feed('draw better hands', 'draw', 0.5);
  data = logActivity(data, { text: 'x', doingId: id.guitar, toIds: [], occurredAt: day(40) }, day(40)).data;
  for (const w of ['make apparel', 'feel productive']) {
    const r = declareThread(data, id[w], day(1));
    if (r.ok) data = r.data;
  }
  data = updateThread(data, id['draw better hands'], { next: 'sketch a hand' });
  return { data, id };
}

describe('the narrowed layout: the scope’s node on top, biggest, the rest in rows by depth', () => {
  const { data, id } = world();
  const ov = overview(data, headerWhys(data, NOW), { now: NOW })!;
  const all = overviewLayout(ov, 350, { roomy: true });
  const l = scopeLayout(ov, all, id['make apparel'], 350);
  const at = (name: string) => l.nodes.find((n) => n.id === id[name])!;

  it('draws only the subtree', () => {
    expect(l.nodes.map((n) => n.name).sort()).toEqual(['draw', 'draw better hands', 'make apparel', 'sew']);
    expect(l.links.map((k) => k.key).sort()).toEqual([`${id.draw}>${id['make apparel']}`, `${id['draw better hands']}>${id.draw}`, `${id.sew}>${id['make apparel']}`].sort());
    expect(l.links.every((k) => k.branch)).toBe(true);
    expect(l.more).toBeUndefined();
  });

  it('the scope’s node is the biggest circle, top and centre; each row down is smaller', () => {
    const root = at('make apparel').circle!;
    expect(root.r).toBeGreaterThan(TOP_R);
    expect(root.cx).toBeCloseTo(175, 0);
    for (const n of l.nodes.filter((x) => x.id !== id['make apparel'])) expect(n.circle!.r).toBeLessThan(root.r);
    expect(at('draw').circle!.cy).toBeGreaterThan(root.cy);
    expect(at('draw').circle!.cy).toBe(at('sew').circle!.cy);
    expect(at('draw better hands').circle!.cy).toBeGreaterThan(at('draw').circle!.cy);
    expect(at('draw better hands').circle!.r).toBeLessThan(at('draw').circle!.r);
    // Left to right as at All.
    expect(at('draw').circle!.cx).toBeLessThan(at('sew').circle!.cx);
  });

  it('heat and roles never change with the scope; targets stay 44 px; nothing overlaps', () => {
    for (const n of l.nodes) {
      const a = all.nodes.find((x) => x.id === n.id)!;
      expect(n.circle!.heat).toBe(a.circle!.heat);
      expect(n.circle!.declared).toBe(a.circle!.declared);
      expect(n.kind).toBe(a.kind);
      expect(n.step).toBe(a.step);
      expect(n.w).toBeGreaterThanOrEqual(44);
      expect(n.h).toBeGreaterThanOrEqual(44);
    }
    for (const a of l.nodes)
      for (const b of l.nodes) if (a !== b) expect(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, `${a.name} / ${b.name}`).toBe(true);
  });

  it('there’s room for the step mark under the lowest row, and it never gets shorter than All', () => {
    expect(l.height).toBeGreaterThanOrEqual(ROOMY_H);
    for (const n of l.nodes) {
      const m = stepMark(n.circle!, 350, l.height);
      expect(m.y - (n.circle!.cy + n.circle!.r)).toBeGreaterThan(0);
    }
  });

  it('a node that isn’t in the picture leaves All as it is; All’s slots are kept for coming back', () => {
    expect(scopeLayout(ov, all, 'nope', 350)).toBe(all);
    expect(l.slots).toBe(all.slots);
  });
});
