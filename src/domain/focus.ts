/**
 * Home's focus and scope (P-50, B-06 revision 12 "One mark per job"). Nothing here is stored.
 *
 * - **Scope** is what part of the picture is drawn: All, or a node and everything feeding it
 *   (narrowed to by tapping a focused node that has something feeding it). A scope is a path of
 *   nodes, outermost first; going up drops the last.
 * - **Focus** is the node the What's next card is on (one ink ring). A swipe moves it between the
 *   scope's **chains**: the nodes nothing feeds inside the scope, in the picture's order.
 * - Heat never changes with either.
 */
import { Id } from './types';

/** The picture as drawn: each node's circle centre (in the scope's layout while narrowed) and the doing → to links between them. */
export interface FocusMap {
  nodes: { id: Id; name: string; x: number; y: number; why: boolean }[];
  links: { from: Id; to: Id }[];
}

/** The picture's order: left to right, then top to bottom. */
const order = (map: FocusMap) => {
  const at = new Map(map.nodes.map((n) => [n.id, n]));
  return (a: Id, b: Id) => at.get(a)!.x - at.get(b)!.x || at.get(a)!.y - at.get(b)!.y;
};

/** A node and everything feeding it, however deep (each once, loops included). */
export function subtree(map: FocusMap, root: Id): Set<Id> {
  const out = new Set<Id>([root]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const l of map.links)
      if (out.has(l.to) && !out.has(l.from)) {
        out.add(l.from);
        grew = true;
      }
  }
  return out;
}

const has = (map: FocusMap, id: Id) => map.nodes.some((n) => n.id === id);

/** What a scope draws: every node at All, else its last node's subtree. */
export function scopeIds(map: FocusMap, scope: Id[]): Set<Id> {
  return scope.length ? subtree(map, scope[scope.length - 1]) : new Set(map.nodes.map((n) => n.id));
}

/** Whether tapping `id` (already focused) narrows to it: it's in the scope, isn't its node, and something inside the scope feeds it. */
export function canNarrow(map: FocusMap, scope: Id[], id: Id): boolean {
  if (!has(map, id) || scope[scope.length - 1] === id) return false;
  const inside = scopeIds(map, scope);
  return inside.has(id) && map.links.some((l) => l.to === id && l.from !== id && inside.has(l.from));
}

/** The longest start of `scope` that still holds (each node still there, inside the one before, with something feeding it). */
export function validScope(map: FocusMap, scope: Id[]): Id[] {
  const out: Id[] = [];
  for (const id of scope) {
    if (!canNarrow(map, out, id)) break;
    out.push(id);
  }
  return out;
}

/** The scope's chains, in the picture's order: the nodes nothing inside it feeds (all of them, for a loop). */
export function chains(map: FocusMap, scope: Id[]): Id[] {
  const inside = scopeIds(map, scope);
  const fed = new Set(map.links.filter((l) => l.from !== l.to && inside.has(l.from) && inside.has(l.to)).map((l) => l.to));
  const ids = [...inside].filter((id) => has(map, id));
  const leaves = ids.filter((id) => !fed.has(id));
  return (leaves.length ? leaves : ids).sort(order(map));
}

/**
 * Where a swipe moves focus (`dir` 1 = next, -1 = previous), or undefined at an end (or with
 * nowhere to go). From a chain, the one beside it; from a parent, the first (or last) chain under
 * it; from outside the scope, the first (or last) chain.
 */
export function stepFocus(map: FocusMap, scope: Id[], focus: Id | undefined, dir: 1 | -1): Id | undefined {
  const all = chains(map, scope);
  if (!all.length) return undefined;
  const pick = (list: Id[]) => (dir === 1 ? list[0] : list[list.length - 1]);
  if (!focus || !scopeIds(map, scope).has(focus) || !has(map, focus)) return pick(all);
  const i = all.indexOf(focus);
  if (i >= 0) return all[i + dir];
  const under = subtree(map, focus);
  const mine = all.filter((id) => under.has(id));
  return pick(mine.length ? mine : all);
}

/** The node and each node it feeds, up to the top (the first parent in the picture's order at each step). */
function pathUp(map: FocusMap, id: Id): Id[] {
  const path = [id];
  const sort = order(map);
  for (;;) {
    const last = path[path.length - 1];
    const up = map.links
      .filter((l) => l.from === last && !path.includes(l.to) && has(map, l.to))
      .map((l) => l.to)
      .sort(sort)[0];
    if (!up) return path;
    path.push(up);
  }
}

/**
 * The focused node with its path, for the card's accessible name and announcements: "draw better
 * hands, toward draw, for make apparel" ("for" a why at the top, "toward" otherwise). A node
 * outside the picture is just its name.
 */
export function pathName(map: FocusMap | undefined, id: Id, name: string): string {
  if (!map || !has(map, id)) return name;
  const byId = new Map(map.nodes.map((n) => [n.id, n]));
  const up = pathUp(map, id).slice(1);
  return [name, ...up.map((p, i) => `${i === up.length - 1 && byId.get(p)!.why ? 'for' : 'toward'} ${byId.get(p)!.name}`)].join(', ');
}

// ─── The step mark ─────────────────────────────────────────────────────────

/** The focused node's step: a filled ink dot this big (radius)… */
export const STEP_DOT_R = 6;
/** …or, with no step, a dashed circle with ＋ this big. */
export const STEP_ADD_R = 10;
/** How far the mark hangs out from the circle's edge, and down from its centre (the mockup's, for a 350 px picture). */
const OUT = 34;
const DOWN = 50;
/** Room the mark needs under a circle's centre (a layout keeps it inside the picture). */
export const STEP_ROOM = DOWN + STEP_ADD_R + 1;

export interface StepMark {
  /** The dot's (or ＋'s) centre. */
  x: number;
  y: number;
  /** Which side of the circle it hangs on: toward the middle of the picture. */
  side: 1 | -1;
  /** A short tapered branch from the circle's edge to the dot (polygon points). */
  branch: string;
  /** The dashed line to the ＋ (SVG path data). */
  path: string;
  /** The step's words beside the dot, further out (one line, `w` wide at most). */
  label: { x: number; y: number; w: number; align: 'left' | 'right' };
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Where the focused node's step goes (P-50): below and beside its circle, toward the middle of the
 * picture, on a short tapered branch (thin at the dot), with its words further out. Inside the
 * picture, `width` × `height`.
 */
export function stepMark(c: { cx: number; cy: number; r: number }, width: number, height: number): StepMark {
  const side: 1 | -1 = c.cx >= width / 2 ? -1 : 1;
  const x = Math.min(width - STEP_ADD_R - 1, Math.max(STEP_ADD_R + 1, c.cx + side * (c.r + OUT)));
  const y = Math.min(height - STEP_ADD_R - 1, c.cy + DOWN);
  const o = [c.cx + side * (c.r - 1), c.cy + 3];
  // From the dot up to the circle's side: a cubic that leaves the dot upward and meets the circle level.
  const p0 = [x - 2 * side, y - 7];
  const c1 = [x - 4 * side, y - 30];
  const c2 = [o[0] + 16 * side, o[1] + 7];
  const [w0, w1] = [1.1, 2.1];
  const P = (t: number, i: number) => (1 - t) ** 3 * p0[i] + 3 * (1 - t) ** 2 * t * c1[i] + 3 * (1 - t) * t * t * c2[i] + t ** 3 * o[i];
  const D = (t: number, i: number) => 3 * (1 - t) ** 2 * (c1[i] - p0[i]) + 6 * (1 - t) * t * (c2[i] - c1[i]) + 3 * t * t * (o[i] - c2[i]);
  const left: string[] = [];
  const right: string[] = [];
  const N = 16;
  for (let s = 0; s <= N; s++) {
    const t = s / N;
    const [px, py] = [P(t, 0), P(t, 1)];
    const [tx, ty] = [D(t, 0), D(t, 1)];
    const m = Math.hypot(tx, ty) || 1;
    const half = (w0 + (w1 - w0) * t * t * (3 - 2 * t)) / 2;
    left.push(`${r1(px - (ty / m) * half)},${r1(py + (tx / m) * half)}`);
    right.push(`${r1(px + (ty / m) * half)},${r1(py - (tx / m) * half)}`);
  }
  const path = `M${r1(o[0])} ${r1(o[1])}Q${r1(o[0] + 18 * side)} ${r1(o[1] + 12)} ${r1(x - 5 * side)} ${r1(y - 7)}`;
  const gap = STEP_ADD_R + 4;
  const label = side === 1 ? { x: x + gap, y, w: Math.max(0, width - (x + gap)), align: 'left' as const } : { x: 0, y, w: Math.max(0, x - gap), align: 'right' as const };
  return { x: r1(x), y: r1(y), side, branch: [...left, ...right.reverse()].join(' '), path, label };
}
