/**
 * P-96 (B-15 journeys 1–4): values. A step GIVES a name (`out` on the step, typed in Plan's "Gives…");
 * later steps READ it by writing `{name}` in their words. Nothing about a reference is stored: it is read
 * from the words every time (`parseWords`), so rewording, moving, breaking down and importing all keep
 * working with nothing to keep in step. The value itself belongs to the run (`values` on its body, see
 * `ValueEntry`) — never to the routine.
 *
 * This module is the text only: no run, no routine. Scope (which value a step sees) is in run.ts.
 *
 * Text rules (contract ruling 5): a name is 1–40 characters, trimmed, inner spaces collapsed, compared
 * case-insensitively (`{Feature}` is `{feature}`), with no brace in it; `{{` is a literal `{` and `}}` a
 * literal `}`; a value is capped at 2000 characters.
 */
import { normalizeName } from './model';
import { Id } from './types';

export const MAX_NAME = 40;
export const MAX_VALUE = 2000;
/** At most this many values on one run (a value given past it is refused). */
export const MAX_VALUES = 100;
/** At most this many items in one value (P-96 writes one; P-98's for each writes more). */
export const MAX_ITEMS = 100;

/** A name as shown: trimmed, inner spaces collapsed (case kept as typed). */
export const tidyName = (s: string): string => (typeof s === 'string' ? s.normalize('NFC').trim().replace(/\s+/g, ' ') : '');
/** A name as compared: `{ Feature }`, `{feature}` and `{FEATURE}` are one name. */
export const nameKey = (s: string): string => normalizeName(tidyName(s));
const length = (s: string) => Array.from(s).length;
/** A name that can be given and read: 1–40 characters once tidied, no brace. */
export const isName = (s: unknown): s is string => typeof s === 'string' && !!tidyName(s) && length(tidyName(s)) <= MAX_NAME && !/[{}]/.test(s);
/** A value's text as stored: as typed, at most MAX_VALUE characters (never split inside a character). */
export const capValue = (s: string): string => (length(s) <= MAX_VALUE ? s : Array.from(s).slice(0, MAX_VALUE).join(''));

/** One piece of a step's words: plain text (braces already unescaped), or a reference to a name. */
export type WordPart =
  | { kind: 'text'; text: string }
  /** `{name}`: `name` tidied, `key` for comparing, `raw` exactly as written (with its braces); `start`/`end` its span in the words. */
  | { kind: 'name'; name: string; key: string; raw: string; start: number; end: number };

const parsed = new Map<string, WordPart[]>();
/** The words read as text and references. Never throws; text with no brace is one text part. */
export function parseWords(words: string): WordPart[] {
  if (typeof words !== 'string') return [];
  const had = parsed.get(words);
  if (had) return had;
  const parts: WordPart[] = [];
  let text = '';
  const flush = () => {
    if (text) parts.push({ kind: 'text', text });
    text = '';
  };
  let i = 0;
  while (i < words.length) {
    const c = words[i];
    if ((c === '{' || c === '}') && words[i + 1] === c) {
      text += c;
      i += 2;
      continue;
    }
    if (c === '{') {
      const close = words.indexOf('}', i + 1);
      const inner = close < 0 ? '' : words.slice(i + 1, close);
      if (close > 0 && !inner.includes('{') && isName(inner)) {
        flush();
        const name = tidyName(inner);
        parts.push({ kind: 'name', name, key: nameKey(name), raw: words.slice(i, close + 1), start: i, end: close + 1 });
        i = close + 1;
        continue;
      }
    }
    text += c;
    i++;
  }
  flush();
  if (parsed.size > 2000) parsed.clear();
  parsed.set(words, parts);
  return parts;
}

/** The names the words read, each once (first spelling), in the order they are read. */
export function namesIn(words: string): { name: string; key: string }[] {
  const seen = new Set<string>();
  const out: { name: string; key: string }[] = [];
  for (const p of parseWords(words)) if (p.kind === 'name' && !seen.has(p.key) && !!seen.add(p.key)) out.push({ name: p.name, key: p.key });
  return out;
}

/** The words with every `{from}` (any spelling) written `{to}`; everything else exactly as it was. */
export function renameIn(words: string, fromKey: string, to: string): string {
  let out = '';
  let last = 0;
  for (const p of parseWords(words)) {
    if (p.kind !== 'name' || p.key !== fromKey) continue;
    out += `${words.slice(last, p.start)}{${tidyName(to)}}`;
    last = p.end;
  }
  return last === 0 ? words : out + words.slice(last);
}

/** The words as plain text: references as `fill` says (default: the name in its braces), literal braces single. */
export function wordsWith(words: string, fill: (name: string, key: string) => string | undefined = () => undefined): string {
  return parseWords(words)
    .map((p) => (p.kind === 'text' ? p.text : (fill(p.name, p.key) ?? `{${p.name}}`)))
    .join('');
}

/** A value's items as one line of words: "a", "a and b", "a, b and c". */
export function joinItems(items: string[]): string {
  const xs = items.map((s) => s.trim()).filter(Boolean);
  return xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}

const SKIP = new Set(['a', 'an', 'the', 'some', 'one', 'two', 'three', 'four', 'five', 'my', 'your', 'our', 'their', 'this', 'that', 'these', 'those', 'of', 'for', 'to', 'in', 'on', 'at', 'with', 'from', 'about', 'and', 'or', 'new', 'next']);
/**
 * Plan's "Gives…" sheet: a name to suggest from the step's words — the first word after the verb that is
 * not a little word ("Select the subject matter" → "subject"; "Pick a feature" → "feature"). Editable;
 * '' when there is nothing to suggest.
 */
export function suggestName(words: string): string {
  const plain = wordsWith(words, () => '').toLowerCase();
  const all = plain.split(/[^\p{L}\p{N}'-]+/u).filter(Boolean);
  const rest = all.slice(1).filter((w) => !SKIP.has(w) && !/^\d+$/.test(w));
  const pick = rest[0] ?? (all.length === 1 ? all[0] : '');
  return Array.from(pick).slice(0, MAX_NAME).join('');
}

/**
 * P-107: the item's name in Add's "For each…" sentence — the list's singular ("photos" → "photo", "stories" →
 * "story", "boxes" → "box"); a name that is not a plural gets " item" ("subject" → "subject item"), so the item
 * is never the list itself. At most 40 characters.
 */
export function itemNameFor(list: string): string {
  const name = tidyName(list);
  const w = name.toLowerCase();
  const cut = (k: number) => name.slice(0, name.length - k);
  let one: string | undefined;
  if (/[^aeiou]ies$/.test(w)) one = `${cut(3)}${name.endsWith('IES') ? 'Y' : 'y'}`;
  else if (/(ss|x|z|ch|sh)es$/.test(w)) one = cut(2);
  else if (/[^su]s$/.test(w) && !/(ss|is|us)$/.test(w)) one = cut(1);
  const item = one && isName(one) && nameKey(one) !== nameKey(name) ? one : `${Array.from(name).slice(0, MAX_NAME - 5).join('')} item`;
  return Array.from(item).slice(0, MAX_NAME).join('');
}

/**
 * One value of a run, as stored in its body's `values` (P-96, contract ruling 1). A LIST of text items
 * (one item is the usual case). `level` is the frame it belongs to — the routine's own level, the bottom
 * one or a named routine entered as a step (a step broken down is part of the routine it is in) — and
 * `seq` that frame's routine (an entry whose frame is not that routine any more is not visible). `item`
 * is the step it was typed at (the giving step, or the step that asked for it) and `words` that step's
 * words then, so "from <step>" still reads after Plan rewords or removes it. `at`: when it was first
 * given; `changedAt`: when it was last changed from the value sheet.
 */
export interface ValueEntry {
  name: string;
  items: string[];
  level: number;
  seq: Id;
  item: Id;
  words?: string;
  at: string;
  changedAt?: string;
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
/** An entry this version can use. Anything else in `values` is kept where it is and never shown. */
export function isEntry(v: unknown): v is ValueEntry {
  return (
    isObject(v) &&
    typeof v.name === 'string' &&
    !!tidyName(v.name) &&
    Array.isArray(v.items) &&
    v.items.length > 0 &&
    v.items.every((x) => typeof x === 'string') &&
    typeof v.level === 'number' &&
    Number.isInteger(v.level) &&
    v.level >= 0 &&
    typeof v.seq === 'string' &&
    typeof v.item === 'string'
  );
}

/** A run body's values that can be used; for one name at one level, the last one stored. Never throws. */
export function readValues(raw: unknown): ValueEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: ValueEntry[] = [];
  for (const v of raw) {
    if (!isEntry(v)) continue;
    const at = out.findIndex((e) => e.level === v.level && nameKey(e.name) === nameKey(v.name));
    if (at >= 0) out.splice(at, 1);
    out.push(v);
  }
  return out;
}

/** A value's text in words: its items joined. */
export const valueText = (e: { items: string[] }): string => joinItems(e.items);
