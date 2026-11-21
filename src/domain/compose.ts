import { normalizeName } from './model';
import { Data, Id, Thread } from './types';

const MAX_QUERY = 40;
/** A character that continues a word: letters, digits, marks, "_", "-" and "'". */
const WORD = /[\p{L}\p{N}\p{M}_'’-]/u;

/**
 * Finds the "@query" the caret (default: the end of the text) is inside, if any: the nearest @
 * before the caret, at the start of the text or after whitespace (so not an email address), with
 * no newline and at most 40 characters between it and the caret. Spaces are allowed so multi-word
 * thread names can be matched. The query is the text between the @ and the caret; `end` also takes
 * in the rest of the word the caret is in ("@ma|ke" → "@make"), so picking leaves no stray letters,
 * but never a word the @ was typed in front of, and never punctuation.
 */
export function mentionAt(text: string, caret = text.length): { start: number; end: number; query: string } | undefined {
  const c = Math.max(0, Math.min(caret, text.length));
  let at = c - 1;
  while (at >= 0 && text[at] !== '@') {
    if (text[at] === '\n' || c - at > MAX_QUERY) return undefined;
    at--;
  }
  if (at < 0) return undefined;
  if (at > 0 && !/\s/.test(text[at - 1])) return undefined; // e.g. an email address
  let end = c;
  // Only when the caret is inside the @word ("@ma|ke"): a bare "@" typed before a word, or a caret
  // after a space, leaves the next word to the sentence. Punctuation after it stays too ("@make,").
  if (c - at > 1 && !/\s/.test(text[c - 1])) while (end < text.length && WORD.test(text[end])) end++;
  return { start: at, end, query: text.slice(at + 1, c) };
}

/** The "@query" the caret (default: the end of the text) is inside, if any. See `mentionAt`. */
export function activeMention(text: string, caret = text.length): { start: number; query: string } | undefined {
  const m = mentionAt(text, caret);
  return m && { start: m.start, query: m.query };
}

/**
 * Takes the "@query" at the caret out of the text (the picked thread, named `picked`, becomes a chip;
 * see `mentionEnd` for how much of the word goes with it). The two sides
 * are joined with exactly one space, never a leading one; the caret goes to the join.
 */
export function replaceActiveMention(text: string, caret: number, picked?: string): { text: string; caret: number } {
  const m = mentionAt(text, caret);
  if (!m) return { text, caret: Math.max(0, Math.min(caret, text.length)) };
  const tail = text.slice(mentionEnd(text, caret, picked) ?? m.end).trimStart();
  // Punctuation that followed the @word closes up to the word before it ("did @make, then" → "did, then").
  const closeUp = /^[,.;:!?)]/.test(tail);
  const head = text.slice(0, m.start).replace(/\s+$/, closeUp ? '' : ' ').trimStart();
  const join = head && tail && !closeUp && !/\s$/.test(head) ? ' ' : '';
  return { text: head + join + tail, caret: head.length + join.length };
}

/**
 * Where the @word at the caret ends once `picked` is chosen: the rest of the word after the caret
 * is taken in only while it continues that name ("@ma|ke" → "make music"); otherwise it's a word
 * the @ was typed in front of ("@make|and" keeps "and"). Without a name, the whole word.
 */
export function mentionEnd(text: string, caret: number, picked?: string): number | undefined {
  const m = mentionAt(text, caret);
  if (!m) return undefined;
  if (picked === undefined || m.end === m.start + 1 + m.query.length) return m.end;
  const c = m.start + 1 + m.query.length;
  return normalizeName(picked).startsWith(normalizeName(text.slice(m.start + 1, m.end))) ? m.end : c;
}

/** Replaces the "@query" at the end of the text with nothing (the picked thread becomes a chip). */
export function removeActiveMention(text: string): string {
  return replaceActiveMention(text, text.length).text;
}

/**
 * Where the caret most likely is after an edit turned `before` into `after`: just after the part
 * that changed. Used until the platform reports the real selection (native may send it late).
 */
export function caretAfterEdit(before: string, after: string): number {
  let prefix = 0;
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix++;
  let suffix = 0;
  const room = Math.min(before.length, after.length) - prefix;
  while (suffix < room && before[before.length - 1 - suffix] === after[after.length - 1 - suffix]) suffix++;
  return after.length - suffix;
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

const STOP = new Set(['the', 'a', 'an', 'to', 'of', 'for', 'and', 'in', 'on', 'my', 'with', 'at', 'some', 'more', 'from', 'into', 'about']);

/** Crude stem so "practiced"/"practice" and "drawing"/"draws" meet. */
const stem = (w: string) => {
  const s = w.replace(/(ings|ing|ed|es|s|e)$/, '');
  return s.length >= 3 ? s : w;
};

/** Stems of the words that carry meaning (longer than 3 letters, not filler), ignoring @mentions. */
export function meaningfulStems(text: string): Set<string> {
  return new Set(
    normalizeName(text.replace(/@\S*/g, ''))
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3 && !STOP.has(w))
      .map(stem),
  );
}

/**
 * Suggests a "doing" thread from words in the sentence (never applied automatically).
 * A thread matches when one of its meaningful words appears in the text, e.g.
 * "sketched 12 gestures for drawing" → "practice drawing".
 */
export function suggestDoing(data: Data, text: string, exclude: Id[] = []): Thread | undefined {
  const words = meaningfulStems(text);
  if (!words.size) return undefined;
  return Object.values(data.threads).find((t) => {
    if (exclude.includes(t.id)) return false;
    for (const w of meaningfulStems(t.name)) if (words.has(w)) return true;
    return false;
  });
}
