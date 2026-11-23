import { suggestLogs } from './logSuggest';
import { attachActivity, deleteActivity, ensureThread, normalizeName, updateThread } from './model';
import { Data, Id, Thread } from './types';

/**
 * The trailhead (P-65, B-07 slice 1): after Return keeps a line loose, "Move it?" offers, each one tap
 * with Undo: Next on the guessed wander (only while it has no staged step: a step is never
 * overwritten), Log toward it, or Somewhere else (any wander, or a new one).
 */
export type Move = { kind: 'toward'; threadId: Id } | { kind: 'next'; threadId: Id } | { kind: 'new'; name: string };

/** Words this long or longer are tried on their own when the whole line matches nothing. */
const WORD = 4;
/** At most this many of the line's words are tried (longest first). */
const WORDS = 3;

const visible = (data: Data, id: Id | undefined): Thread | undefined => (id && data.threads[id] && !data.threads[id].hidden ? data.threads[id] : undefined);

/**
 * The wander the line just kept most likely belongs to, by P-61's matching (`suggestLogs`: staged
 * steps, past entries, wander names): first for the whole line, then for its longest words (up to
 * three, four letters or more). The kept line itself is left out, so an earlier entry with the same
 * words still says where it went. Hidden wanders are never guessed.
 */
export function guessWander(data: Data, activityId: Id, recentOrder: Id[]): Thread | undefined {
  const a = data.activities[activityId];
  if (!a) return undefined;
  const without = deleteActivity(data, activityId);
  const words = [...new Set(normalizeName(a.text).split(/[^\p{L}\p{N}']+/u))]
    .filter((w) => w.length >= WORD)
    .sort((x, y) => y.length - x.length)
    .slice(0, WORDS);
  for (const q of [a.text, ...words]) {
    for (const sg of suggestLogs(without, q, recentOrder)) {
      const t = visible(data, sg.kind === 'past' ? sg.targetId : sg.threadId);
      if (t) return t;
    }
  }
  return undefined;
}

/** What "Move it?" offers for the kept line: the guess (if any), and whether "Next on" it may be offered. */
export function moveOffer(data: Data, activityId: Id, recentOrder: Id[]): { guess?: Thread; canNext: boolean } {
  const guess = guessWander(data, activityId, recentOrder);
  return { guess, canNext: !!guess && !guess.next?.trim() };
}

/**
 * The data after a move of the kept line, and the wander it went to; undefined when it's refused (the
 * line or a visible wander isn't there, a blank new name, or "Next on" a wander that already has a step).
 * Toward: the wander becomes the line's doing one. Next: the words become the wander's step and the
 * loose line goes (it was something to do, not done). New: a wander with that name (found or made),
 * then toward it.
 */
export function applyMove(data: Data, activityId: Id, move: Move): { data: Data; threadId: Id } | undefined {
  const a = data.activities[activityId];
  if (!a) return undefined;
  if (move.kind === 'new') {
    if (!move.name.trim()) return undefined;
    const made = ensureThread(data, move.name);
    if (made.thread.hidden) return undefined;
    return { data: attachActivity(made.data, activityId, made.thread.id, 'doing'), threadId: made.thread.id };
  }
  const t = visible(data, move.threadId);
  if (!t) return undefined;
  if (move.kind === 'toward') return { data: attachActivity(data, activityId, t.id, 'doing'), threadId: t.id };
  if (t.next?.trim()) return undefined;
  return { data: updateThread(deleteActivity(data, activityId), t.id, { next: a.text }), threadId: t.id };
}

/**
 * The trailhead's big line, in points (P-65): 56 on a phone, smaller on short or narrow windows and
 * for long lines, and stepped down as the text size grows (drawn size ≈ size × fontScale, capped near
 * 1.15× the base), so the field stays above the keyboard at large text.
 */
export function promptSize({ width, height, fontScale, chars = 0 }: { width: number; height: number; fontScale: number; chars?: number }): number {
  const base = Math.min(56, width * 0.144, height * 0.066, chars > 40 ? 56 * Math.sqrt(40 / chars) : 56);
  const scale = Math.max(fontScale, 1);
  return Math.max(20, Math.round(Math.min(base, (base * 1.15) / scale)));
}
