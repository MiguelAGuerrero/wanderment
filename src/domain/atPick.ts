/**
 * P-110 ("I tried to reference a routine but it didn't work"): what "@" and "{" typed in Plan's fields open — the
 * names, and after "@" the person's routines — read from the words and the caret. Pure: Plan.tsx calls it.
 *
 * P-103 (audit F3): only at a word's start (after a space, or first), and only while what follows is a name's letters
 * ("me@co", "x@y.z" and a lone "{" at a word's end never open it). P-110: after "@" the list also stays open ACROSS
 * spaces while what is typed still matches a routine's name ("@Document It" for "Document Iteration").
 */

/** Words compared as a routine's name is: case and spacing aside. */
const loose = (s: string): string => s.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();

/** Where "@"/"{" opened what is typed after it (`start`: the "@" or "{"), or null: nothing is open. */
export function atPick(text: string, caret: number, routineNames: string[]): { start: number; query: string } | null {
  const before = text.slice(0, Math.max(0, Math.min(caret, text.length)));
  const m = /(?:^|\s)([@{])([\p{L}\p{N}_-]*)$/u.exec(before);
  if (m) return { start: before.length - m[2].length - 1, query: m[2] };
  // "@" at a word's start, with spaces after it: open while some routine's name holds what is typed.
  for (let i = before.lastIndexOf('@'); i >= 0; i = i > 0 ? before.lastIndexOf('@', i - 1) : -1) {
    if (i > 0 && !/\s/.test(before.charAt(i - 1))) continue;
    const query = before.slice(i + 1);
    if (!/\s/.test(query) || /^\s/.test(query) || /[@{}]/.test(query)) return null;
    const q = loose(query);
    const spaced = /\s$/.test(query) ? `${q} ` : q;
    return routineNames.some((n) => `${loose(n)} `.includes(spaced)) ? { start: i, query } : null;
  }
  return null;
}

/**
 * The routine words name when they are exactly "@<routine name>" (case and spacing aside; a space after the "@" too),
 * else undefined. `routines` in the order to prefer (one name names one routine: the first).
 */
export function routineInWords(words: string, routines: { routineId: string; name: string }[]): string | undefined {
  const m = /^\s*@\s*(\S.*)$/su.exec(typeof words === 'string' ? words : '');
  if (!m) return undefined;
  const want = loose(m[1]);
  return routines.find((r) => loose(r.name) === want)?.routineId;
}
