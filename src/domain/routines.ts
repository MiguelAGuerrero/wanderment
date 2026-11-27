/**
 * P-97 (owner, 2026-11-26: "tags and alphabetical sorting might be good start in a 'my routines' page"; "a way
 * of cleanly organizing" home): what My routines and home read. Pure selectors over the engine, as runView.ts:
 * nothing here writes or throws.
 *
 * - **My routines** lists every named routine that is not removed, A–Z by letter alone (case and accents never
 *   move a name), under letter headings; Find matches part of a name or a tag; chosen tags narrow it (all of
 *   them must be on a routine).
 * - **Home** shows only the runs going — running, paused, waiting — told apart by structure: **Ongoing** when
 *   the routine has no end (an "until I'm done" repeat at its top level), else **Finishing**. A routine with
 *   nothing going is on My routines, not home (its stored `home` flag is kept as it is and no longer read here).
 */
import { isRef, isRunning, isStep, isWait, openRuns, outOf, readRoutine, readRun, Seq, view } from './run';
import { homeShown, homeTiles, routineHue, Tile } from './runView';
import { fold, tagKey, tagsOf, tagsWritable } from './tags';
import { tileLine } from './goText';
import { Data, emptyData, Id, Routine } from './types';
import { nameKey, namesIn } from './values';

export { addTags, fold, tagKey, tagsOf, tagsWritable, tidyTag } from './tags';

/** One row of My routines. */
export interface RoutineRow {
  routineId: Id;
  name: string;
  /** Its colour (as its tile and note). */
  hue: number;
  /** Its tags, as typed (no "#"). */
  tags: string[];
  /** The names its steps give (its steps broken down included), each once, in order. */
  gives: string[];
  /** The names its steps read that nothing in it gives: it asks for them when run. */
  asks: string[];
  /** No steps yet: there is nothing to start. */
  empty?: true;
  /** Its run going, if any; `running`: that run is the one running. */
  runId?: Id;
  running?: boolean;
  /** P-97 audit F5: its run going, in words — "running, at <step>", "paused at <step>", "waiting for <words> · since <day>". */
  going?: string;
  /** P-97 audit F4: its stored tags are in a shape this version cannot keep: Tags… is not offered. */
  tagsLocked?: true;
}

/** Compared by letter alone: without case or accents, digits by value ("2" before "10"). */
const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

/** A–Z: by letter alone (folded: Æ with A, ß with S), then as written, then by id (so the order never depends on how they were read). */
export const byName = (a: { name: string; routineId: Id }, b: { name: string; routineId: Id }): number =>
  collator.compare(fold(a.name.trim()), fold(b.name.trim())) || (a.name < b.name ? -1 : a.name > b.name ? 1 : a.routineId < b.routineId ? -1 : a.routineId > b.routineId ? 1 : 0);

/** A name's heading: its first letter, without its accent, in capitals; a name that starts with anything else, "#". */
export function letterOf(name: string): string {
  const first = Array.from(fold(name.trim()))[0] ?? '';
  return /\p{L}/u.test(first) ? first.toLocaleUpperCase('en') : '#';
}

/** What a routine gives and asks: its own steps and its steps broken down (a routine used as a step has its own). */
function givesAndAsks(data: Data, s: Seq): { gives: string[]; asks: string[] } {
  const gives: string[] = [];
  const read: { name: string; key: string }[] = [];
  const seen = new Set<Id>();
  const walk = (id: Id) => {
    const seq = seen.has(id) ? undefined : readRoutine(data, id);
    seen.add(id);
    for (const i of seq?.items ?? []) {
      if (isRef(i)) {
        if (readRoutine(data, i.ref)?.named === false) walk(i.ref);
        continue;
      }
      const out = outOf(i);
      if (out && !gives.some((g) => nameKey(g) === nameKey(out))) gives.push(out);
      read.push(...namesIn(isWait(i) ? i.wait : isStep(i) ? i.text : ''));
    }
  };
  walk(s.id);
  const given = new Set(gives.map(nameKey));
  const asks: string[] = [];
  for (const r of read) if (!given.has(r.key) && !asks.some((a) => nameKey(a) === r.key)) asks.push(r.name);
  return { gives, asks };
}

/** My routines: every named routine that is not removed, A–Z. */
export function myRoutines(data: Data): RoutineRow[] {
  const going = new Map<Id, Id>();
  for (const r of openRuns(data)) if (!going.has(r.routineId) || isRunning(data, r)) going.set(r.routineId, r.id);
  const tiles = new Map(homeTiles(data).map((t) => [t.runId, t]));
  const said = (runId: Id): string | undefined => {
    const t = tiles.get(runId);
    if (!t) return undefined;
    const l = tileLine(t).line;
    return t.state === 'running' ? ['running', l].filter(Boolean).join(', ') : t.state === 'paused' ? ['paused', l].filter(Boolean).join(' ') : l || undefined;
  };
  return Object.keys(data.routines)
    .map((id) => readRoutine(data, id))
    .filter((s): s is Seq => !!s && s.named && !s.removedAt)
    .map((s): RoutineRow => {
      const runId = going.get(s.id);
      const run = runId === undefined ? undefined : readRun(data, runId);
      return {
        routineId: s.id,
        name: s.words,
        hue: routineHue(data, s.id),
        tags: tagsOf(data.routines[s.id].tags),
        ...givesAndAsks(data, s),
        ...(!s.items.length && { empty: true as const }),
        ...(run && { runId: run.id, running: isRunning(data, run) }),
        ...(run && said(run.id) && { going: said(run.id) }),
        ...(!tagsWritable(data.routines[s.id].tags) && { tagsLocked: true as const }),
      };
    })
    .sort(byName);
}

/** The rows under their letter headings, in order. */
export function routineSections(rows: readonly RoutineRow[]): { letter: string; rows: RoutineRow[] }[] {
  // Each heading once (P-97 audit F1): a letter met again joins its section.
  const out: { letter: string; rows: RoutineRow[] }[] = [];
  const at = new Map<string, { letter: string; rows: RoutineRow[] }>();
  for (const r of rows) {
    const letter = letterOf(r.name);
    const had = at.get(letter);
    if (had) had.rows.push(r);
    else {
      const s = { letter, rows: [r] };
      at.set(letter, s);
      out.push(s);
    }
  }
  return out;
}

/** Every tag on these rows, once (without case: the first spelling met), A–Z. */
export function allTags(rows: readonly RoutineRow[]): string[] {
  const seen = new Map<string, string>();
  for (const r of rows) for (const t of r.tags) if (!seen.has(tagKey(t))) seen.set(tagKey(t), t);
  return [...seen.values()].sort((a, b) => collator.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0));
}

/** Find and the tags chosen: part of a name or of a tag (without case or accents; a leading "#" is a tag's), and every chosen tag. */
export function findRows(rows: readonly RoutineRow[], find: string, chosen: readonly string[]): RoutineRow[] {
  const q = fold(find.trim()).replace(/^#+/, '').trim();
  const must = chosen.map(tagKey);
  return rows.filter((r) => {
    const keys = r.tags.map(tagKey);
    if (!must.every((k) => keys.includes(k))) return false;
    return !q || fold(r.name).includes(q) || keys.some((k) => k.includes(q));
  });
}

/** No end: an "until I'm done" repeat at the routine's top level (a divider with no number). */
export function hasNoEnd(routine: Seq | Routine): boolean {
  const s = readRoutine({ ...emptyData(), routines: { [routine.id]: routine as Routine } }, routine.id);
  return !!s && s.repeatFrom !== undefined && s.repeat === undefined;
}

/** Home: the runs going, in home's order (when each was started), Ongoing (no end) and Finishing (an end). */
export function homeGroups(data: Data): { ongoing: Tile[]; finishing: Tile[] } {
  const ongoing: Tile[] = [];
  const finishing: Tile[] = [];
  for (const t of homeShown(data)) {
    const run = t.runId === undefined ? undefined : readRun(data, t.runId);
    if (!run) continue;
    const s = view(data, run, t.routineId);
    (s && hasNoEnd(s) ? ongoing : finishing).push(t);
  }
  return { ongoing, finishing };
}
