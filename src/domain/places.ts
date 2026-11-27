/**
 * P-109 (B-18 slice 1; owner, 2026-11-27: "Let's build the references"): a routine's **places** — where its work
 * lives, named by the person — and the one safety rule for opening anything.
 *
 * Kept in the routine's body as `places: { id, name, where }[]`, in the person's order. Read tolerantly: a routine
 * without them (every one stored before P-109) has none; an entry that is not a place is passed over, never an
 * error. A field in any other shape (a later version's) is never overwritten (`placesWritable`). Nothing is
 * converted. No dependencies: the engine and the screens both use it.
 *
 * **Safety (B-18 "Edges"; the batch's ruling 2).** A Where opens only when it is an `http:` or `https:` address
 * (`openable`). Everything else — `javascript:`, `data:`, `file:`, `vbscript:`, another app's own scheme, a
 * relative path, plain words — is words and opens nothing, whatever brought it (typing, paste or an import). The
 * check is the text's own: it starts with `http://` or `https://` (any case, after the spaces around it), holds no
 * space or control character, and names a host. Where the platform's URL parser is there it must agree.
 */
import type { Id } from './types';

/** One place, as kept on a routine. */
export interface RoutinePlace {
  id: Id;
  /** What the person calls it ("Product design"). */
  name: string;
  /** A pasted address or plain words ("left shelf, the grey one"). */
  where: string;
}

/** A place as shown: `href` (the address to open) and `host` ("notion.so") only when it may be opened. */
export interface PlaceShown extends RoutinePlace {
  href?: string;
  host?: string;
}

/** Words as kept: the spaces around them gone, runs of white space inside one space. */
export const tidyPlaceText = (s: string): string => s.replace(/\s+/g, ' ').trim();

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
/** An entry this version reads as a place: an id, a name and a where, each text. */
const isPlace = (v: unknown): v is RoutinePlace & Record<string, unknown> => isRecord(v) && typeof v.id === 'string' && !!v.id && typeof v.name === 'string' && typeof v.where === 'string';

/** A routine's places, read from its body (`Routine.places`): missing or not a list = none; what is not a place is passed over; an id twice, once. */
export function placesOf(raw: unknown): RoutinePlace[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: RoutinePlace[] = [];
  for (const p of raw) {
    if (!isPlace(p) || seen.has(p.id)) continue;
    seen.add(p.id);
    out.push({ id: p.id, name: p.name, where: p.where });
  }
  return out;
}

/**
 * Places this version can change without losing anything: none, or a list of places (ids once). A field in any
 * other shape is a later version's: it is never overwritten — changes are refused and Places… offers no edits.
 */
export function placesWritable(raw: unknown): boolean {
  if (raw === undefined) return true;
  if (!Array.isArray(raw) || !raw.every(isPlace)) return false;
  return new Set(raw.map((p) => p.id)).size === raw.length;
}

/** Space, or any control or format character (none may be inside an address that opens). */
const UNSAFE_CHAR = /[\s\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;
/** The text's own form: the scheme, "//", then an authority that names something. */
const SHAPE = /^(https?):\/\/([^/?#\\]*)(.*)$/i;

/**
 * The address to open for `where`, when it may be opened; otherwise undefined (it is words). Only `http:` and
 * `https:`, by the text itself (never by what a parser makes of it): " https://x " opens "https://x";
 * "JaVaScRiPt:…", "data:…", "file:…", "notion://…", "//x", "www.x.com" and "https:x" do not.
 */
export function openable(where: unknown): string | undefined {
  if (typeof where !== 'string') return undefined;
  const s = where.trim();
  if (!s || UNSAFE_CHAR.test(s)) return undefined;
  const m = SHAPE.exec(s);
  if (!m) return undefined;
  const scheme = m[1].toLowerCase();
  const host = hostPart(m[2]);
  if (!host) return undefined;
  const href = `${scheme}://${m[2]}${m[3]}`;
  // Where the platform parses addresses, it must read the same scheme and a host (belt and braces).
  const U = (globalThis as { URL?: new (s: string) => { protocol: string; hostname: string } }).URL;
  if (typeof U === 'function') {
    try {
      const u = new U(href);
      if (u.protocol !== `${scheme}:` || !u.hostname) return undefined;
    } catch {
      return undefined;
    }
  }
  return href;
}

/** The host of an authority ("user@host:port" → "host"), lower case; '' when it names none. */
function hostPart(authority: string): string {
  const at = authority.lastIndexOf('@');
  let host = at >= 0 ? authority.slice(at + 1) : authority;
  if (host.startsWith('[')) {
    const end = host.indexOf(']');
    return end > 1 ? host.slice(0, end + 1).toLowerCase() : '';
  }
  const colon = host.indexOf(':');
  if (colon >= 0) {
    const port = host.slice(colon + 1);
    if (port && !/^\d{1,5}$/.test(port)) return '';
    host = host.slice(0, colon);
  }
  host = host.replace(/\.$/, '');
  if (!host || host.split('.').some((label) => !label)) return '';
  return host.toLowerCase();
}

/**
 * What a place's address is shown as: its host, never the whole address — "www." dropped ("notion.so"). A host
 * written in other scripts is shown as the browser would send it (its ASCII form, "xn--…"), so a look-alike
 * cannot pass for another; where the platform cannot say, as typed. '' for what is not openable.
 */
export function hostOf(where: unknown): string {
  const href = openable(where);
  if (!href) return '';
  let host = hostPart(SHAPE.exec(href)![2]);
  const U = (globalThis as { URL?: new (s: string) => { hostname: string } }).URL;
  if (typeof U === 'function') {
    try {
      host = new U(href).hostname.toLowerCase() || host;
    } catch {
      // (openable has already read it)
    }
  }
  return host.replace(/^www\./, '');
}

/** A place with what it opens, if anything. */
export const shownPlace = (p: RoutinePlace): PlaceShown => {
  const href = openable(p.where);
  return href ? { ...p, href, host: hostOf(p.where) } : { ...p };
};

/** A routine's places as shown, from its body. */
export const placesShown = (raw: unknown): PlaceShown[] => placesOf(raw).map(shownPlace);

/** What a screen reader says for a place: "Open Product design, notion.so"; for words, "Sketchbook, left shelf". */
export const placeSpoken = (p: PlaceShown): string => (p.href ? `Open ${p.name}, ${p.host}` : `${p.name}, ${p.where}`);

/** What stops an address at its end when it is written inside words: the punctuation after it. */
const TRAILING = /[.,;:!?'"’”)\]}>]+$/;

/**
 * B-18 journey 4: the http(s) addresses typed inside some words (a step's, a value, the pause note), each once, in
 * order — the words themselves are left as they are. An address starts a word ("see https://x" — not "xhttps://"),
 * runs to the next space, and leaves the punctuation after it ("(https://x.com/a)." → "https://x.com/a").
 */
export function addressesIn(...texts: readonly (string | undefined)[]): { href: string; host: string }[] {
  const out: { href: string; host: string }[] = [];
  const seen = new Set<string>();
  for (const text of texts) {
    if (!text) continue;
    for (const m of text.matchAll(/(^|[^\p{L}\p{N}_])(https?:\/\/[^\s<>"`]+)/giu)) {
      let candidate = m[2];
      // A closing bracket the address itself opened stays ("…/Foo_(bar)").
      while (TRAILING.test(candidate)) {
        const last = candidate[candidate.length - 1];
        const opens = { ')': '(', ']': '[', '}': '{' }[last];
        if (opens && candidate.split(opens).length > candidate.split(last).length - 1) break;
        candidate = candidate.slice(0, -1);
      }
      const href = openable(candidate);
      if (!href || seen.has(href)) continue;
      seen.add(href);
      out.push({ href, host: hostOf(href) });
    }
  }
  return out;
}
