/**
 * B-11 slice 1 (P-86, the screens): two pure helpers the components draw from — the sticky note's
 * type size for its words, and how a tile's run reads. No React, no measuring: both are decided from
 * the words, so the same words always look the same and a spec can assert them.
 */
import { partsText, sinceWords, StepPart, Tile } from './runView';

/** The note's type sizes, largest first (B-11 §3.1; the mockups' tokens). */
export const NOTE_SIZES = [32, 26, 22, 18] as const;
export type NoteSize = (typeof NOTE_SIZES)[number];

export interface NoteType {
  size: NoteSize;
  /** Too long even at the smallest type: the note is edge to edge and scrolls inside. */
  full: boolean;
}

/** The space kept clear inside the note's edge. */
export const NOTE_PAD = 20;
/** An average glyph of a proportional sans is about half an em; a little more, so a guess never overflows. */
const GLYPH = 0.56;
const LEADING = 1.25;

/** The lines `words` take wrapped at `perLine` characters (a word longer than a line breaks). */
function linesAt(words: string, perLine: number): number {
  let lines = 1;
  let used = 0;
  for (const word of words.split(/\s+/).filter(Boolean)) {
    let left = word.length;
    if (used && used + 1 + left <= perLine) {
      used += 1 + left;
      continue;
    }
    if (used) lines++;
    while (left > perLine) {
      lines++;
      left -= perLine;
    }
    used = left;
  }
  return lines;
}

/**
 * The type for a note `side` px square holding `words`, at text scale `scale` (2 = 200 %): the
 * largest size the words fit at; if they fit at none, the smallest and `full`.
 */
export function noteType(words: string, side: number, scale = 1): NoteType {
  const inner = side - NOTE_PAD * 2;
  const text = words.trim();
  for (const size of NOTE_SIZES) {
    const px = size * scale;
    const perLine = Math.floor(inner / (px * GLYPH));
    const rows = Math.floor(inner / (px * LEADING));
    if (perLine >= 1 && rows >= 1 && linesAt(text, perLine) <= rows) return { size, full: false };
  }
  return { size: 18, full: true };
}

export interface TileLine {
  /** The one mark before its line: ‖ paused, ⧖ a wait. */
  mark?: 'paused' | 'wait';
  /** "at <step>", "waiting for <words> · since <day>", or in Plan "planning · at <step>" ("planning · nothing next yet" at the edge); '' when there is nothing to say. */
  line: string;
  /** Why it was paused. */
  reason?: string;
  button: 'Resume' | 'Start' | 'Plan';
  /** The button's spoken name: "Resume Apply to Acme". */
  spoken: string;
  /** The tile as a screen reader says it. */
  says: string;
  /** P-96 (ruling 8): `line` in parts — its values in place, marked as values. Absent when the line holds no value (or blank): then it is `line`. */
  parts?: StepPart[];
}

/** How a tile reads (B-11 §9b, B-12 v8): the name, where it is — and in which mode — and Resume, Start or Plan. Never a count. */
export function tileLine(tile: Tile, now = new Date()): TileLine {
  const button = tile.action === 'resume' ? 'Resume' : tile.action === 'plan' ? 'Plan' : 'Start';
  const spoken = `${button} ${tile.name}`;
  if (tile.state === 'idle') return { line: '', button, spoken, says: tile.name };
  // P-96: the step's words with the run's values in place (with none, exactly its words).
  const atParts: StepPart[] = tile.atParts ?? (tile.at ? [{ kind: 'text', text: tile.at }] : []);
  const at = tile.at === undefined ? undefined : partsText(atParts);
  const valued = atParts.some((p) => p.kind !== 'text');
  const parts = (before: string, after = ''): { parts?: StepPart[] } => (valued ? { parts: [{ kind: 'text', text: before }, ...atParts, ...(after ? [{ kind: 'text' as const, text: after }] : [])] } : {});
  // Left in Plan: it says planning, never paused or waiting, and has no mark of theirs.
  // At the edge it reads as Plan and the paused screen do (one wording per meaning): "planning · nothing next yet".
  if (tile.state === 'planning') return { line: `planning · ${at ? `at ${at}` : 'nothing next yet'}`, button, spoken, says: [tile.name, 'planning', at ? `at ${at}` : 'nothing next yet'].join(', '), ...(at && parts('planning · at ')) };
  if (tile.state === 'waiting') {
    // A date that is not one is left out (never "since undefined").
    const since = tile.since ? sinceWords(tile.since, now) : '';
    const tail = since ? ` · since ${since}` : '';
    const line = `waiting for ${at ?? tile.waitingFor ?? ''}${tail}`;
    return { mark: 'wait', line, ...(tile.reason && { reason: tile.reason }), button, spoken, says: [tile.name, line, tile.reason].filter(Boolean).join(', '), ...parts('waiting for ', tail) };
  }
  const line = at ? `at ${at}` : '';
  const paused = tile.state === 'paused';
  return {
    ...(paused && { mark: 'paused' as const }),
    line,
    ...(tile.reason && { reason: tile.reason }),
    button,
    spoken,
    // The one that is running says so (the others say paused, or waiting).
    says: [tile.name, paused ? `paused${line ? ` ${line}` : ''}` : ['running', line].filter(Boolean).join(', '), tile.reason].filter(Boolean).join(', '),
    ...(line && parts('at ')),
  };
}
