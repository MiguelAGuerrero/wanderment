/**
 * B-11 slice 1 (P-86): the prompt "I'm going to…". As you type it searches the tiles, then the other
 * routines, then unnamed things you've done — each distinct thing once. It only finds what exists
 * (P-95): making something new is the New tile's, never a row here. Nothing starts until a row is
 * chosen; Return takes the first. Pure.
 */
import { normalizeName } from './model';
import { openRuns, readRoutine, Seq } from './run';
import { homeTiles, Tile } from './runView';
import { fold } from './fold';
import { Data, Id } from './types';

export interface StartRow {
  /** tile: on home (or with a run going). routine: another named routine. unnamed: a thing done before. */
  kind: 'tile' | 'routine' | 'unnamed';
  /** Its name. */
  words: string;
  /**
   * resume: `resumeRun(runId)`. start: `startRoutine(routineId)` (refused `empty` for a routine with no
   * steps yet: its Plan is where the first is added). plan: a run in Plan (`planRun(runId)`, then its
   * Plan).
   */
  action: 'resume' | 'start' | 'plan';
  routineId?: Id;
  runId?: Id;
  /** For a tile row: the tile, as on home. */
  tile?: Tile;
  /** The marked row: Return takes it. */
  first: boolean;
}

/**
 * Every word typed must start a word of the text, in any order, whatever the case or accents
 * ("acm app" finds "Apply to Acme"; "art" does not find "start"): the prompt lists first and starts
 * on Return, so it is stricter than history search's anywhere-in-the-text.
 */
export function startsWithWords(text: string | undefined, query: string): boolean {
  const wanted = fold(query).split(/\s+/).filter(Boolean);
  if (!text || !wanted.length) return false;
  const have = fold(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return wanted.every((w) => have.some((h) => h.startsWith(w)));
}

const firstMade = (a: Seq, b: Seq) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * The prompt's rows for what is typed. Nothing typed: the tiles, as on home. Within each group the
 * rows keep a fixed order (when each was first made), so they don't move about as you type.
 */
export function searchStarts(data: Data, query: string): StartRow[] {
  const typed = query.trim().replace(/\s+/g, ' ');
  const tiles = homeTiles(data);
  const rows: Omit<StartRow, 'first'>[] = [];
  const tileRow = (tile: Tile): Omit<StartRow, 'first'> => ({ kind: 'tile', words: tile.name, action: tile.action, routineId: tile.routineId, ...(tile.runId && { runId: tile.runId }), tile });
  if (!typed) return tiles.map((tile, i) => ({ ...tileRow(tile), first: i === 0 }));

  // Each distinct thing once: a tile before a routine before an unnamed thing of the same name.
  const taken = new Set<string>();
  const onHome = new Set<Id>();
  for (const tile of tiles) {
    onHome.add(tile.routineId);
    taken.add(normalizeName(tile.name));
    if ([tile.name, tile.at, tile.reason, tile.waitingFor].some((t) => startsWithWords(t, typed))) rows.push(tileRow(tile));
  }
  const all = Object.keys(data.routines)
    .map((id) => readRoutine(data, id))
    .filter((s): s is Seq => !!s && !s.removedAt && !onHome.has(s.id))
    .sort(firstMade);
  for (const s of all.filter((x) => x.named)) {
    taken.add(normalizeName(s.words));
    if (startsWithWords(s.words, typed)) rows.push({ kind: 'routine', words: s.words, action: 'start', routineId: s.id });
  }
  // An unnamed thing is its own row only when it stands alone: not part of a routine (a kept
  // breakdown), not belonging to a run still going, and no routine has its name. Of several with the
  // same words, the newest.
  const referenced = new Set<Id>();
  for (const id of Object.keys(data.routines)) for (const item of readRoutine(data, id)?.items ?? []) if ('ref' in item) referenced.add(item.ref);
  const going = new Set(openRuns(data).map((r) => r.id));
  const newest = new Map<string, Seq>();
  for (const s of all.filter((x) => !x.named && !referenced.has(x.id) && !(x.ownerRunId && going.has(x.ownerRunId)))) {
    const name = normalizeName(s.words);
    if (name && !taken.has(name) && startsWithWords(s.words, typed)) newest.set(name, s);
  }
  for (const s of [...newest.values()].sort(firstMade)) rows.push({ kind: 'unnamed', words: s.words, action: 'start', routineId: s.id });

  return rows.map((r, i) => ({ ...r, first: i === 0 }));
}
