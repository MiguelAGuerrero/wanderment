/**
 * P-97: a routine's tags (owner, 2026-11-26: "tags and alphabetical sorting … in a 'my routines' page"). Typed
 * on a routine (its Tags sheet: a comma or Return makes a chip), kept in its body as `tags: string[]` — each
 * trimmed, its spaces joined, no "#" (it is shown with one), once without case, in the order typed. Read
 * tolerantly: a routine without them (every one stored before P-97) has none; anything that is not a tag is
 * passed over, never an error. No dependencies: the engine and the screens both use it.
 */

/** A tag as kept: trimmed, inner spaces joined, the leading "#"s dropped ('' = no tag). */
export const tidyTag = (typed: string): string =>
  typed
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^#+/, '')
    .trim();

/**
 * Text folded for comparing and finding: lower case, accents off, and the letters that do not split into a letter
 * and an accent written as their base letters (P-97 audit F1: Æ → ae, Ø → o, Ł → l, ß → ss, Đ → d, Þ → th, Œ → oe).
 */
const SPLIT: Record<string, string> = { æ: 'ae', ø: 'o', ł: 'l', ß: 'ss', đ: 'd', ð: 'd', þ: 'th', œ: 'oe', ı: 'i', ħ: 'h', ŧ: 't', ŀ: 'l' };
export const fold = (s: string): string =>
  s
    .toLocaleLowerCase('en')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[æøłßđðþœıħŧŀ]/g, (c) => SPLIT[c]);

/** What two tags are compared by: without case or accents. */
export const tagKey = (tag: string): string => fold(tidyTag(tag));

/** `tags` followed by `more`, each tidied — blanks dropped, none twice (the first spelling stays). */
function joined(tags: readonly string[], more: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of [...tags, ...more]) {
    const tag = tidyTag(t);
    const key = tagKey(tag);
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

/** `tags` with each comma-separated part of `typed` added at the end (the Tags sheet's comma and Return). */
export const addTags = (tags: readonly string[], typed: string): string[] => joined(tags, typed.split(','));

/** A routine's tags, read from its body (`Routine.tags`): missing or not a list = none; what is not text is passed over. */
export const tagsOf = (raw: unknown): string[] => (Array.isArray(raw) ? joined([], raw.filter((t): t is string => typeof t === 'string')) : []);

/**
 * P-97 audit F4: tags this version can keep without losing anything — none, or a list of text. A field in any other
 * shape (a later version's) is never overwritten: Keep is refused and Tags… is not offered.
 */
export const tagsWritable = (raw: unknown): boolean => raw === undefined || (Array.isArray(raw) && raw.every((t) => typeof t === 'string'));
