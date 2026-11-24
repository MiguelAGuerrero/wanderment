import { suggestLogs } from './logSuggest';
import { skyStars } from './sky';
import { Data, Id, Thread } from './types';

const visible = (data: Data, id: Id | undefined): Thread | undefined => (id && data.threads[id] && !data.threads[id].hidden ? data.threads[id] : undefined);

/**
 * The trailhead's big line, in points (P-65): 56 on a phone (`max`; the trail's step uses 40), smaller
 * on short or narrow windows and for long lines, and stepped down as the text size grows (drawn size ≈
 * size × fontScale, capped near 1.15× the base), so the field stays above the keyboard at large text.
 */
export function promptSize({ width, height, fontScale, chars = 0, max = 56 }: { width: number; height: number; fontScale: number; chars?: number; max?: number }): number {
  const base = Math.min(max, width * 0.144, height * 0.066, chars > 40 ? max * Math.sqrt(40 / chars) : max);
  const scale = Math.max(fontScale, 1);
  return Math.max(20, Math.round(Math.min(base, (base * 1.15) / scale)));
}

/** The trailhead's ground (hills, dashed path and lantern) is this tall, at the foot of the screen. */
export const GROUND_H = 220;
/** The question (or the billboard) needs at least this much room above the ground. */
export const ROOM_ABOVE = 420;

/**
 * Whether the trailhead draws its ground (P-65 fix): only when the window (less its safe-area `insets`)
 * leaves ROOM_ABOVE above it; then the content scrolls above the ground and never under it. A short
 * window (the keyboard up) or 200 % zoom has the sky alone.
 */
export const groundFits = ({ height, insets = 0 }: { height: number; insets?: number }): boolean => height - insets - GROUND_H >= ROOM_ABOVE;

/**
 * Typing can open a trail (fix 17): the first wander P-61's matching offers for the line (a "node"
 * suggestion), as a quiet "Open <wander>" — its trail, or its star when it's a why. It never attaches
 * or logs anything; Return still logs exactly as typed.
 */
export function openOffer(data: Data, text: string, recentOrder: Id[], now = new Date()): { threadId: Id; name: string; href: string } | undefined {
  if (!text.trim()) return undefined;
  const node = suggestLogs(data, text, recentOrder).find((sg) => sg.kind === 'node' && visible(data, sg.threadId));
  if (!node || node.kind !== 'node') return undefined;
  const t = data.threads[node.threadId];
  const why = skyStars(data, { now }).some((s) => s.thread.id === t.id);
  return { threadId: t.id, name: t.name, href: `/${why ? 'star' : 'trail'}/${encodeURIComponent(t.id)}` };
}
