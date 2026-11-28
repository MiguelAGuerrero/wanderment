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
  const one = singularOf(name);
  const item = one && isName(one) && nameKey(one) !== nameKey(name) ? one : `${Array.from(name).slice(0, MAX_NAME - 5).join('')} item`;
  return Array.from(item).slice(0, MAX_NAME).join('');
}

/**
 * The singular of a word that reads as a plural, by For each's rule ("stories" → "story", "boxes" → "box", "photos" →
 * "photo"); undefined when it does not read as one ("glass", "status"). P-114: shared with the composer's phrasing.
 */
export function singularOf(word: string): string | undefined {
  const name = tidyName(word);
  const w = name.toLowerCase();
  const cut = (k: number) => name.slice(0, name.length - k);
  if (/[^aeiou]ies$/.test(w)) return `${cut(3)}${name.endsWith('IES') ? 'Y' : 'y'}`;
  if (/(ss|x|z|ch|sh)es$/.test(w)) return cut(2);
  if (/[^su]s$/.test(w) && !/(ss|is|us)$/.test(w)) return cut(1);
  return undefined;
}

// ───────── P-114 (B-19 slice 1a): the composer's phrasing ─────────
//
// Small fixed rules, no library (the comparison with `compromise` is in the P-114 build notes): the routine's name from
// a start and what was typed (B-19 journey 4), and a question that carries what was typed (journey 2a). A woven
// question is a nicety: whenever a join cannot be made cleanly, the plain question is used. The person's words in the
// routine are never rewritten by a question's joins. English only. `phrasing.test.ts` holds the corpus.

/** The five starts on New's sheet, by the library template each copies. */
export type StartKey = 'work' | 'make' | 'learn' | 'find' | 'decide';

const ARTICLES = new Set(['a', 'an', 'the', 'my', 'our', 'your', 'this', 'that', 'his', 'her', 'their', 'some']);
/** Words that make a clean "<verb> to …" with Learn: verbs a skill is learnt as ("play piano" → "to play piano"). */
const LEARN_VERBS = new Set('play draw speak juggle sing knit sew bake read ride write cook drive meditate crochet whistle improvise negotiate solder weld'.split(' '));
/**
 * Verbs that are nouns as often ("dance moves", "paint landscapes"): "to" only when the word is alone ("Learn to dance");
 * with more after it the name is what was typed (which reading was meant cannot be told by rule).
 */
const VERB_OR_NOUN = new Set('dance type code paint sketch row box fence run garden lift sail dive climb fly skate ski surf swim program'.split(' '));
/** Verbs a typed phrase may start with that are not the start's own: the name is then what was typed ("Build a shed"). */
const OTHER_VERBS = new Set(
  'build finish create design fix repair redo plan organise organize clean tidy sort start launch record film shoot edit draft compose get improve practise practice study prepare set put pack move buy sell find decide learn make choose pick work figure try do become be keep stay stop quit eat sleep wake walk exercise train lose gain save spend master understand use go'.split(' '),
);
/** Question words: Find out reads them as its object ("why my mixes sound thin" → "Find out why…"). */
const ASKING = new Set(['why', 'how', 'what', 'whether', 'if', 'when', 'where', 'who', 'which']);
/** After a question word, these turn it into a question of its own ("why do my mixes…"): the name is then as typed. */
const AUXILIARY = new Set(['do', 'does', 'did', 'is', 'are', 'was', 'were', 'can', 'could', 'should', 'would', 'will', 'have', 'has', 'am']);
/** Decide's objects: "whether…", "which…", "between…". */
const CHOICE = new Set(['whether', 'if', 'which', 'what', 'where', 'when', 'who', 'how', 'between', 'on', 'about']);
/** "I", "me", "we"… — the app never speaks them back. */
const FIRST_PERSON = /(^|[^\p{L}'’])(i|me|mine|myself|we|us|ours|ourselves|i['’](m|ve|ll|d))(?=$|[^\p{L}'’])/iu;
/** Words that end in s and are not plurals (the composer's "is" / "are"). */
const SINGULAR_S = new Set(['series', 'species', 'news', 'lens', 'canvas', 'atlas', 'chaos', 'physics', 'maths', 'mathematics', 'bus', 'gas', 'thesis', 'analysis', 'basis', 'crisis']);
/** Where a noun phrase's head ends: "a zine about my street" → "zine". */
const PREPOSITIONS = new Set(['about', 'of', 'in', 'on', 'at', 'with', 'from', 'to', 'by', 'over', 'under', 'into', 'around', 'near', 'like']);

const words = (s: string): string[] => s.split(' ').filter(Boolean);
const lower = (s: string) => s.toLowerCase();
/** What was typed as one line: trimmed, inner spaces collapsed. */
export const typedLine = (s: string): string => (typeof s === 'string' ? s.normalize('NFC').replace(/\s+/g, ' ').trim() : '');
/** Its first letter in capitals (a name starts with one). */
const capFirst = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
/** Names that keep their capital where they join a sentence ("Learn Spanish"). A phone capitalises the first word typed. */
const PROPER = new Set(
  'english spanish french german italian portuguese japanese chinese mandarin cantonese korean arabic russian hindi dutch greek latin welsh irish swedish norwegian danish finnish polish turkish hebrew python javascript typescript rust swift kotlin java excel photoshop blender figma monday tuesday wednesday thursday friday saturday sunday january february march april may june july august september october november december christmas easter'.split(' '),
);
/**
 * Its first letter in lower case where it joins a sentence (a phone capitalises the first word typed: "Hand studies" →
 * "Learn hand studies") — unless the word is a name ("Spanish"), not written as a sentence's first word ("CV", "iOS"),
 * or the next word is capitalised too (a title: "Document Iteration").
 */
function joinable(s: string): string {
  const [first = '', second = ''] = words(s);
  const sentenceCase = (first.length > 1 || first === 'A') && first === capFirst(lower(first));
  const title = !!second && second === capFirst(lower(second)) && second !== lower(second);
  return sentenceCase && !title && !PROPER.has(lower(first)) ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}
const isIng = (w: string) => w.length > 4 && w.endsWith('ing');
/** `s` with a leading verb (any of `verbs`, as itself or its -ing form), and a "to" before it, taken off; null when it does not start so. */
function after(s: string, verbs: string[]): string | null {
  const re = new RegExp(`^(?:to\\s+)?(?:${verbs.map((v) => v.replace(/ /g, '\\s+')).join('|')})(?=\\s|$)\\s*`, 'i');
  const m = re.exec(s);
  return m ? s.slice(m[0].length) : null;
}

/**
 * B-19 journey 4: the routine's name — the start joined to what was typed, reading as the person would write it. The
 * inference is small and visible: the first letter lowered where it joins (common words only); the start's own verb
 * never repeated ("make a zine" under Make it is "Make a zine"); under Learn it, "to" before a plain verb ("play piano"
 * → "Learn to play piano"; "to play piano" and "drawing hands" kept as typed). Where the start cannot be joined
 * cleanly, the name is what was typed, its first letter in capitals ("Build a shed" under Make it). '' for nothing typed.
 */
export function composedName(start: StartKey, typed: string): string {
  const t = typedLine(typed);
  if (!t) return '';
  const first = lower(words(t)[0]);
  const second = lower(words(t)[1] ?? '');
  if (start === 'work') return capFirst(t);
  if (start === 'make') {
    const rest = after(t, ['make', 'making']);
    if (rest !== null) return rest ? `Make ${rest}` : 'Make';
    // A thing to make ("a zine…"): "Make a zine…". Anything else is read as the person's own sentence.
    return ARTICLES.has(first) ? `Make ${joinable(t)}` : capFirst(t.replace(/^to\s+/i, ''));
  }
  if (start === 'learn') {
    const rest = after(t, ['learn', 'learning']);
    const r = rest ?? t;
    if (!r) return 'Learn';
    const w = lower(words(r)[0]);
    // "to play piano", "how to juggle", "drawing hands", "Spanish": as typed after "Learn"; "play piano": "to" first.
    if (w === 'to' || w === 'how' || isIng(w) || ARTICLES.has(w)) return `Learn ${joinable(r)}`;
    if (LEARN_VERBS.has(w) || (VERB_OR_NOUN.has(w) && words(r).length === 1)) return `Learn to ${joinable(r)}`;
    if (VERB_OR_NOUN.has(w)) return capFirst(r);
    // Another verb of its own ("get better at drawing", "improve my serve"): the person's sentence.
    if (rest === null && OTHER_VERBS.has(w)) return capFirst(t);
    return `Learn ${joinable(r)}`;
  }
  if (start === 'find') {
    const rest = after(t, ['find out', 'finding out']);
    const r = rest ?? t;
    if (!r) return 'Find out';
    const w = lower(words(r)[0]);
    const v = lower(words(r)[1] ?? '');
    // A question of its own ("Why do my mixes sound thin?") is kept as typed: "Find out why do…" would not read.
    if (/\?$/.test(r) || (ASKING.has(w) && AUXILIARY.has(v)) || AUXILIARY.has(w)) return capFirst(rest === null ? t : r);
    if (ASKING.has(w) || ARTICLES.has(w)) return `Find out ${joinable(r)}`;
    return rest === null ? capFirst(t) : `Find out ${r}`;
  }
  // Decide ("Make a decision"): "Decide whether…", "Decide which…"; anything else as typed.
  const rest = after(t, ['decide', 'deciding']);
  const r = rest ?? t;
  if (!r) return 'Decide';
  const w = rest === null ? first : lower(words(r)[0]);
  if (CHOICE.has(w) && !(rest === null && AUXILIARY.has(second))) return `Decide ${joinable(r)}`;
  return capFirst(rest === null ? t : `Decide ${r}`);
}

/**
 * The thing being made, as the app says it back — or undefined when it cannot be said cleanly (then the question says
 * "it"). Only a short phrase on one line (at most six words, 40 characters) with no punctuation of its own, starting
 * with an article: "a/an/the" → "the", "my/our" → "your" (and "my" inside it too); never with "I", "me", "we", a list
 * ("and", "or", a comma) or a "for" of its own (the question ends in "for").
 */
export function thingSaid(typed: string): { np: string; plural: boolean } | undefined {
  let t = typedLine(typed).replace(/\.$/, '');
  t = after(t, ['make', 'making']) ?? t.replace(/^to\s+/i, '');
  const ws = words(t);
  if (!ws.length || ws.length > 6 || Array.from(t).length > 40 || /[^\p{L}\p{N} '’-]/u.test(t)) return undefined;
  const ls = ws.map(lower);
  if (!['a', 'an', 'the', 'my', 'our', 'your', 'this', 'that'].includes(ls[0]) || ws.length < 2) return undefined;
  if (ls.some((w) => w === 'and' || w === 'or' || w === 'for') || FIRST_PERSON.test(t)) return undefined;
  const head = ls[(() => {
    const p = ls.findIndex((w, i) => i > 0 && PREPOSITIONS.has(w));
    return (p < 0 ? ls.length : p) - 1;
  })()];
  if (!head || ARTICLES.has(head)) return undefined;
  // "a"/"an"/"this" name one thing; "the"/"my"… a plural head ("the posters") reads "are".
  const plural = !['a', 'an', 'this'].includes(ls[0]) && !SINGULAR_S.has(head) && singularOf(head) !== undefined;
  if (ls[0] === 'that' && plural) return undefined;
  const lead = ls[0] === 'a' || ls[0] === 'an' ? 'the' : ls[0] === 'my' || ls[0] === 'our' ? 'your' : ls[0];
  const rest = ws.slice(1).map((w) => (lower(w) === 'my' || lower(w) === 'our' ? 'your' : w));
  return { np: [lead, ...rest].join(' '), plural };
}

/** Make it's first question (B-19 journey 2a): "What is the zine about your street for?" — else the plain "What is it for?". */
export function whatFor(typed: string): string {
  const thing = thingSaid(typed);
  return thing ? `What ${thing.plural ? 'are' : 'is'} ${thing.np} for?` : 'What is it for?';
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
  /**
   * P-108: the routines its items hold, one per item (null: words) — by reference, with the routine's name when it was
   * given (the item's words begin with it, so an older build reads the words). Read through `refsOf` (run.ts).
   */
  refs?: ({ ref: Id; name: string } | null)[];
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
