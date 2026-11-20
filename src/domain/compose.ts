import { normalizeName } from './model';
import { Data, Id, Thread } from './types';

/**
 * Finds the "@query" the cursor is currently inside, if any.
 * Spaces are allowed after @ so multi-word thread names can be matched;
 * the query ends at the end of the text (the cursor is assumed to be at the end).
 */
export function activeMention(text: string): { start: number; query: string } | undefined {
  const at = text.lastIndexOf('@');
  if (at < 0) return undefined;
  if (at > 0 && !/\s/.test(text[at - 1])) return undefined; // e.g. an email address
  const query = text.slice(at + 1);
  if (query.length > 40 || /\n/.test(query)) return undefined;
  return { start: at, query };
}

/** Top matches for an @query: prefix matches first, then substring, most recent first. */
export function suggestThreads(data: Data, query: string, recentOrder: Id[], limit = 3): Thread[] {
  const q = normalizeName(query);
  const rank = (t: Thread) => {
    const n = normalizeName(t.name);
    if (!q) return 1;
    if (n.startsWith(q)) return 0;
    if (n.split(' ').some((w) => w.startsWith(q))) return 1;
    if (n.includes(q)) return 2;
    return -1;
  };
  const recency = (t: Thread) => {
    const i = recentOrder.indexOf(t.id);
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  };
  return Object.values(data.threads)
    .map((t) => ({ t, r: rank(t) }))
    .filter(({ r }) => r >= 0)
    .sort((a, b) => a.r - b.r || recency(a.t) - recency(b.t))
    .slice(0, limit)
    .map(({ t }) => t);
}

/** Replaces the active "@query" with nothing (the picked thread becomes a chip). */
export function removeActiveMention(text: string): string {
  const m = activeMention(text);
  if (!m) return text;
  return text.slice(0, m.start).replace(/\s+$/, ' ').trimStart();
}

const STOP = new Set(['the', 'a', 'an', 'to', 'of', 'for', 'and', 'in', 'on', 'my', 'with', 'at']);

/**
 * Suggests a "doing" thread from words in the sentence (never applied automatically).
 * A thread matches when one of its meaningful words appears in the text, e.g.
 * "sketched 12 gestures for drawing" → "practice drawing".
 */
export function suggestDoing(data: Data, text: string, exclude: Id[] = []): Thread | undefined {
  const words = new Set(
    normalizeName(text.replace(/@\S*/g, ''))
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3 && !STOP.has(w)),
  );
  if (!words.size) return undefined;
  return Object.values(data.threads).find(
    (t) =>
      !exclude.includes(t.id) &&
      normalizeName(t.name)
        .split(' ')
        .some((w) => w.length > 3 && !STOP.has(w) && words.has(w)),
  );
}
