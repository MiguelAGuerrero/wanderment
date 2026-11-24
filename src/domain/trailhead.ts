import { FEED_ROW_MIN, FEED_ROWS } from './feed';
import { suggestLogs } from './logSuggest';
import { BIG_TEXT } from './overview';
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

// ─── The composer at the bottom (P-79) and the live map above it (P-80), B-09 ───────────────────────

/** A window shorter than this (as with the keyboard up) collapses the composer's heading. */
export const SHORT_H = 560;

/**
 * Whether the composer's heading (the question) collapses (B-09 fold-in 2): with the keyboard up, in a
 * short window, or at large text. The field keeps the question as its name, so nothing is lost.
 */
export const headingCollapses = ({ height, fontScale, keyboardUp }: { height: number; fontScale: number; keyboardUp: boolean }): boolean =>
  keyboardUp || height < SHORT_H || fontScale >= BIG_TEXT;

/**
 * The live map's room above the composer (`room`, less `top` kept clear for the guiding stars): the
 * ground (hills, path, lantern) is drawn just above the composer only when the picture's rows still fit
 * above it; then the picture (FEED_ROWS rows of at least 44 pt, never over the ground); with less room,
 * or at the largest text, a plain list. The composer may grow; the map yields (B-09 fold-in 1).
 */
export function restLayout({ room, top, fontScale }: { room: number; top: number; fontScale: number }): { ground: boolean; list: boolean; rowH: number } {
  if (fontScale >= BIG_TEXT) return { ground: false, list: true, rowH: 0 };
  const need = FEED_ROWS * FEED_ROW_MIN;
  const avail = room - top;
  const ground = avail - GROUND_H >= need;
  const left = avail - (ground ? GROUND_H : 0);
  return left >= need ? { ground, list: false, rowH: left / FEED_ROWS } : { ground: false, list: true, rowH: 0 };
}

/** "I'm not sure"'s accessible name (fold-in 6): its words, then what it does. */
export const UNSURE_NAME = 'I’m not sure — light up the map';

/**
 * "I'm not sure" is a toggle (fold-in 6): pressed while the map is lit (P-81), with a mark that isn't
 * colour alone — an outlined star off, a filled one (on a filled chip) on.
 */
export const unsureChip = (lit: boolean): { pressed: boolean; mark: 'outline' | 'filled' } => ({ pressed: lit, mark: lit ? 'filled' : 'outline' });

/**
 * Whether a row of the live map is drawn now: only while all of it is above the composer. The rows are
 * laid out once from the room at rest; as the composer grows (suggestions) they stay put, and one it
 * would reach is left out until it shrinks again (the map yields; nothing moves).
 */
export const feedRowShown = (row: number, { top, rowH, room }: { top: number; rowH: number; room: number }): boolean => top + (row + 1) * rowH <= room + 0.5;
