/**
 * P-104 (B-17 slices 1 and 4), P-105 (slice 2), P-106 (slice 3): the library. One test (or more) per clause of the
 * roadmap's *Done when*; expected values come from the roadmap, B-17 and the discovery file's catalogue — never from
 * running the code. The house style is a test here: it fails the build when any library routine breaks it, or the
 * import check.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { fromBackup, toBackup } from './backup';
import { applyUndo, undoEntry } from './diff';
import { buildLibrary, LIBRARY_BACKUP, LIBRARY_DEFS, LIBRARY_HEADINGS, LibraryDef } from './libraryContent';
import { copiedWords, copyAndAdd, copyFromLibrary, findLibrary, library, Library, libraryMatches, libraryPreview, libraryRows, libraryToAdd, readLibrary, spokenName } from './library';
import { bindingsOf, callIO, editRoutine, Env, isRef, isWait, Item, place, readRoutine, readRun, routineNamed, runVerb, Verb } from './run';
import { runnerView } from './runView';
import { Data, emptyData, Id, Routine } from './types';
import { itemNameFor, nameKey } from './values';

const T0 = Date.UTC(2026, 10, 28, 12, 0, 0);
let n = 0;
let t = 0;
beforeEach(() => {
  n = 0;
  t = 0;
});
const env = (): Env => ({ now: new Date(T0 + 1000 * t++).toISOString(), id: () => `x${++n}` });
const ok = (d: Data, verb: Verb): Data => {
  const r = runVerb(d, verb, env());
  expect(r.ok, `${JSON.stringify(verb)} refused: ${r.reason}`).toBe(true);
  return r.data;
};
const json = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const undone = (before: Data, after: Data) => json(applyUndo(after, undoEntry(before, after)));
const named = (d: Data, words: string) => routineNamed(d, words)!;
const mine = (...ss: Routine[]): Data => ({ ...emptyData(), routines: Object.fromEntries(ss.map((s) => [s.id, s])) });
const routine = (id: string, words: string, items: Item[] = []): Routine => ({ id, words, named: true, createdAt: '2026-11-01T00:00:00.000Z', items, open: true, home: true });
const copy = (d: Data, id: Id, words?: string, lib?: Library) => {
  const c = copyFromLibrary(d, id, env(), words === undefined ? {} : { words }, lib);
  expect(c.ok, `copy of ${id} refused: ${c.reason}`).toBe(true);
  return c;
};
const start = (d: Data, routineId: Id) => {
  const r = runVerb(d, { kind: 'start', routineId }, env());
  expect(r.ok, `start refused: ${r.reason}`).toBe(true);
  return { d: r.data, id: r.runId! };
};
const words = (d: Data, runId: Id) => runnerView(d, runId)!.step.parts.map((p) => (p.kind === 'blank' ? `{${p.name}}` : p.kind === 'value' ? p.text : p.text)).join('');
const here = (d: Data, runId: Id) => place(d, readRun(d, runId)!)!;
/** Every sequence a routine holds (itself, its steps broken down, its blocks), each once. */
function body(data: Data, id: Id): Routine[] {
  const out: Routine[] = [];
  const walk = (x: Id) => {
    const r = data.routines[x];
    if (!r || out.includes(r)) return;
    out.push(r);
    for (const i of (r.items as Item[]) ?? []) if (isRef(i) && data.routines[i.ref]?.named === false) walk(i.ref);
  };
  walk(id);
  return out;
}
const allWords = (r: Routine): string[] => [r.words, ...((r.items as Item[]) ?? []).flatMap((i) => [(i as { text?: string }).text ?? '', (i as { wait?: string }).wait ?? '', ...bindingsOf(i).map((b) => ('typed' in b ? b.typed : ''))])].filter(Boolean);

// ───────── the house style, as a check (B-17 slice 4) ─────────

/** The verbs a library routine's name may start with: names read after "Plan" and "Start". */
const VERBS = ['Recall', 'Practise', 'Review', 'Say', 'Check', 'Keep', 'Try', 'Weigh', 'Gather', 'Choose', 'Find', 'Argue', 'Take', 'Set', 'Learn', 'Make', 'Work'];
/** Counts and minutes: any digit, a unit of time, or a tally word. */
const COUNTS = /\d|\b(seconds?|minutes?|mins?|hours?|hrs?|days?|weeks?|months?|years?|daily|weekly|times|twice|streaks?|count|score|percent)\b|%/i;

/** What breaks the house style or the import check, in words (empty: nothing). */
function styleBreaks(backup: unknown, defs: readonly LibraryDef[]): string[] {
  const out: string[] = [];
  let data: Data;
  try {
    data = fromBackup(JSON.stringify(backup));
  } catch (e) {
    return [`import check: ${(e as Error).message}`];
  }
  if (JSON.stringify(data) !== JSON.stringify((backup as { data: Data }).data)) out.push('import check: the file is not read back as written');
  const names = new Set<string>();
  for (const d of defs) {
    const r = data.routines[d.id];
    if (!r || r.named !== true || r.words !== d.name) {
      out.push(`${d.name}: not in the file`);
      continue;
    }
    if (names.has(nameKey(d.name))) out.push(`${d.name}: a name used twice`);
    names.add(nameKey(d.name));
    if (!VERBS.includes(d.name.split(' ')[0])) out.push(`${d.name}: not verb-first`);
    if (!(LIBRARY_HEADINGS as readonly string[]).includes(d.heading)) out.push(`${d.name}: no such heading`);
    if (!d.for.trim() || d.for.length > 60 || /[.!]$/.test(d.for)) out.push(`${d.name}: its line is not one short line`);
    if (!!d.template !== d.heading.startsWith('For a big aim')) out.push(`${d.name}: a template only under "For a big aim"`);
    if (d.name.includes('▢') !== !!d.template?.stem) out.push(`${d.name}: a blank only in a template's name, with its stem`);
    // One job: it hands back at most two names, each one it gives.
    const io = callIO(data, d.id);
    if (d.gives.length > 2) out.push(`${d.name}: hands back more than two names`);
    for (const g of d.gives) if (!io.gives.some((x) => nameKey(x) === nameKey(g))) out.push(`${d.name}: says it gives {${g}} but does not`);
    for (const s of body(data, d.id)) {
      for (const w of allWords(s)) if (COUNTS.test(w)) out.push(`${d.name}: a count or minutes in “${w}”`);
      const each = s.each as { item: string; list: string; kept?: unknown; own?: unknown } | undefined;
      if (each && nameKey(each.item) !== nameKey(itemNameFor(each.list))) out.push(`${d.name}: {${each.item}} is not the item of {${each.list}}`);
      if (each && !d.template && (each.kept !== undefined || each.own !== undefined)) out.push(`${d.name}: a kept list in a method`);
      for (const i of (s.items as Item[]) ?? []) {
        if (isWait(i)) out.push(`${d.name}: a wait step`);
        if (!isRef(i)) continue;
        const target = data.routines[i.ref];
        if (!target) out.push(`${d.name}: calls a routine not in the library`);
        else if (target.named) {
          const asks = callIO(data, target.id).asks.map(nameKey);
          for (const b of bindingsOf(i)) if (!asks.includes(nameKey(b.input))) out.push(`${d.name}: gives ${target.words} {${b.input}}, which it does not ask`);
        }
      }
    }
  }
  return out;
}

describe('the library ships in the export format and passes the import check and the house style (P-104, B-17 slice 4)', () => {
  it('every library routine passes the import check and the house style', () => {
    expect(styleBreaks(LIBRARY_BACKUP, LIBRARY_DEFS)).toEqual([]);
  });

  it('the check fails the build for a routine that breaks it: a wait, minutes, a kept list in a method, a name not verb-first, a list and item that do not match, a broken file', () => {
    const bad: LibraryDef[] = [
      { id: 'b1', name: 'Nice method', heading: 'To learn', for: 'Nothing', gives: [], steps: ['Practise for 10 minutes'] },
      { id: 'b2', name: 'Keep notes', heading: 'To learn', for: 'Notes', gives: [], steps: [{ each: 'note', list: 'notes', kept: true, steps: ['Read {note}'] }] },
      { id: 'b3', name: 'Check items', heading: 'To learn', for: 'Items', gives: ['nothing'], steps: [{ each: 'thing', list: 'items', steps: ['Look at {thing}'] }] },
    ];
    const file = buildLibrary(bad);
    (file.data.routines.b1.items as unknown[]).push({ id: 'w', wait: 'a reply' });
    const breaks = styleBreaks(file, bad);
    expect(breaks).toEqual(
      expect.arrayContaining([
        'Nice method: not verb-first',
        'Nice method: a count or minutes in “Practise for 10 minutes”',
        'Nice method: a wait step',
        'Keep notes: a kept list in a method',
        'Check items: {thing} is not the item of {items}',
        'Check items: says it gives {nothing} but does not',
      ]),
    );
    expect(styleBreaks({ app: 'wanderment', data: { version: 9 } }, bad)[0]).toMatch(/^import check: /);
  });

  it('it is small: about a dozen methods and the five templates of B-17 slice 3, under the headings', () => {
    const methods = LIBRARY_DEFS.filter((d) => !d.template);
    expect(methods.length).toBeGreaterThanOrEqual(8);
    expect(methods.length).toBeLessThanOrEqual(15);
    expect(LIBRARY_DEFS.filter((d) => d.template).map((d) => d.name)).toEqual(['Learn ▢', 'Find out ▢', 'Make ▢', 'Make a decision', 'Work it out as you go']);
  });

  it('every library routine can be started by itself, from the library alone (nothing it calls is missing)', () => {
    const lib = library();
    for (const d of LIBRARY_DEFS) {
      const r = runVerb(lib.data, { kind: 'start', routineId: d.id }, env());
      expect(r.ok, `${d.name}: ${r.reason}`).toBe(true);
    }
  });

  it('read through the import check: the library is what the file holds, and never in the person’s data', () => {
    const lib = library();
    expect(lib.data).toEqual(fromBackup(JSON.stringify(LIBRARY_BACKUP)));
    expect(Object.keys(emptyData().routines)).toEqual([]);
  });
});

describe('the Library view (P-104, B-17 journey 1)', () => {
  it('rows under their headings, in order; each with its name, its one line and its signature (what it asks, what it hands back)', () => {
    const rows = libraryRows(emptyData());
    expect([...new Set(rows.map((r) => r.heading))]).toEqual([...LIBRARY_HEADINGS]);
    const recall = rows.find((r) => r.name === 'Recall before you look')!;
    expect(recall).toMatchObject({ heading: 'To learn', for: 'Fixing material in memory', asks: ['material'], gives: ['faults'], template: false });
    expect(rows.find((r) => r.name === 'Check and mend')).toMatchObject({ asks: ['work', 'standard', 'rule'], gives: ['faults'] });
    expect(rows.find((r) => r.name === 'Weigh the options')).toMatchObject({ asks: ['decision'], gives: ['choice'] });
    // A template's kept lists are its own, never asked.
    expect(rows.find((r) => r.name === 'Learn ▢')).toMatchObject({ asks: [], gives: [], template: true });
    expect(rows.find((r) => r.name === 'Find out ▢')).toMatchObject({ asks: ['question'], gives: ['answer'] });
  });

  it('a name already in Yours is yours (Open yours, nothing to copy); a template with a blank never is', () => {
    const d = mine(routine('r1', 'recall before you LOOK'), routine('r2', 'Learn ▢'));
    const rows = libraryRows(d);
    expect(rows.find((r) => r.name === 'Recall before you look')!.yours).toBe('r1');
    expect(rows.find((r) => r.name === 'Learn ▢')!.yours).toBeUndefined();
    // A removed routine is not theirs any more.
    const gone = mine({ ...routine('r1', 'Recall before you look'), removedAt: '2026-11-02T00:00:00.000Z' });
    expect(libraryRows(gone).find((r) => r.name === 'Recall before you look')!.yours).toBeUndefined();
  });

  it('Find matches names only, without case or accents', () => {
    const rows = libraryRows(emptyData());
    expect(findLibrary(rows, 'RECALL').map((r) => r.name)).toEqual(['Recall before you look']);
    expect(findLibrary(rows, 'memory')).toEqual([]);
    expect(findLibrary(rows, '').length).toBe(rows.length);
  });

  it('"Learn ▢" is spoken "Learn blank"', () => {
    expect(spokenName('Learn ▢')).toBe('Learn blank');
    expect(spokenName('Find out ▢')).toBe('Find out blank');
    expect(libraryRows(emptyData()).find((r) => r.name === 'Learn ▢')).toMatchObject({ spoken: 'Learn blank', stem: 'Learn ' });
  });

  it('the preview shows the routine itself: its steps, what each gives, a call with what fills it, a for each and its steps under it', () => {
    expect(libraryPreview('lib-recall')).toEqual([
      { depth: 0, kind: 'step', words: 'Put {material} out of sight' },
      { depth: 0, kind: 'step', words: 'Write down everything you can recall of it' },
      { depth: 0, kind: 'call', words: 'Check and mend', with: ['with what I recalled as work', 'with {material} as standard', 'with from memory, with it out of sight again as rule'] },
    ]);
    const check = libraryPreview('lib-check-mend');
    expect(check[1]).toEqual({ depth: 0, kind: 'step', words: 'List each place it falls short, as a thing in the work', gives: 'faults' });
    expect(check[2]).toEqual({ depth: 0, kind: 'each', words: 'For each fault in {faults}' });
    expect(check.slice(3).every((r) => r.depth === 1)).toBe(true);
    const learn = libraryPreview('lib-learn');
    expect(learn.map((r) => [r.depth, r.kind, r.words]).slice(0, 5)).toEqual([
      [0, 'step', 'State what you want to be able to do'],
      [0, 'any', 'In any order'],
      [1, 'part', 'Practise'],
      [2, 'each', 'For each part in {parts}'],
      [3, 'call', 'Practise at the edge'],
    ]);
  });
});

describe('Copy (P-104, B-17 journey 3)', () => {
  it('a method becomes an ordinary routine of the person’s: its name, new ids, the time of copying, what it calls brought with it — and nothing pointing at the library', () => {
    const before = emptyData();
    const c = copy(before, 'lib-recall');
    const recall = named(c.data, 'Recall before you look');
    const check = named(c.data, 'Check and mend');
    expect(c.routineId).toBe(recall.id);
    expect(c.made).toEqual(['Recall before you look', 'Check and mend']);
    expect(copiedWords(c)).toBe('Copied “Recall before you look” and what it calls');
    expect(Object.keys(c.data.routines)).toHaveLength(3); // the two, and Check and mend's for each block
    expect(JSON.stringify(c.data)).not.toMatch(/lib-/);
    expect(recall).toMatchObject({ named: true, open: true, createdAt: new Date(T0).toISOString() });
    const call = recall.items[2] as Item & { words: string };
    expect(call).toMatchObject({ ref: check.id, words: 'Check and mend', with: [{ input: 'work', typed: 'what I recalled' }, { input: 'standard', name: 'material' }, { input: 'rule', typed: 'from memory, with it out of sight again' }] });
    expect(callIO(c.data, recall.id)).toEqual(callIO(library().data, 'lib-recall'));
  });

  it('what it calls is the person’s own routine of that name when they have one (nothing is copied over it)', () => {
    const d = mine(routine('own', 'Check and mend', [{ id: 's', text: 'Look at {work}' }]));
    const c = copy(d, 'lib-recall');
    expect(c.made).toEqual(['Recall before you look']);
    expect(copiedWords(c)).toBe('Copied “Recall before you look”');
    expect((named(c.data, 'Recall before you look').items[2] as { ref: string }).ref).toBe('own');
    expect(c.data.routines.own).toBe(d.routines.own);
  });

  it('a name already in Yours: nothing is copied (the row offers Open yours)', () => {
    const d = mine(routine('r1', 'Recall before you look'));
    const c = copyFromLibrary(d, 'lib-recall', env());
    expect(c).toMatchObject({ ok: false, reason: 'same-name' });
    expect(c.data).toBe(d);
  });

  it('one write, one Undo: Undo takes every routine the copy made away', () => {
    const before = mine(routine('r1', 'Bake'));
    const c = copy(before, 'lib-weigh');
    expect(c.made).toEqual(['Weigh the options', 'Gather options', 'Choose']);
    expect(undone(before, c.data)).toEqual(json(before));
  });

  it('a copy can be started by itself, and asks what it asks', () => {
    const c = copy(emptyData(), 'lib-recall');
    const s = start(c.data, c.routineId!);
    expect(words(s.d, s.id)).toBe('Put {material} out of sight');
    expect(runnerView(s.d, s.id)!.fields.map((f) => f.name)).toEqual(['material']);
  });

  it('a copy can be called from another routine: added as a step, stepped into, and it hands back what it gives', () => {
    const c = copy(mine(routine('r1', 'Study for the exam', [{ id: 's1', text: 'Read chapter one' }])), 'lib-recall');
    const added = editRoutine(c.data, 'r1', { kind: 'addCall', routine: c.routineId! }, env());
    expect(added.ok).toBe(true);
    expect(callIO(added.data, 'r1').gives).toEqual(['faults']);
    let s = start(added.data, 'r1');
    let d = ok(s.d, { kind: 'next', runId: s.id });
    d = ok(d, { kind: 'stepIn', runId: s.id });
    expect(here(d, s.id).frame.seq).toBe(c.routineId);
    expect(words(d, s.id)).toBe('Put {material} out of sight');
    s = { d, id: s.id };
    expect(s.d.runs[s.id]).toBeDefined();
  });

  it('an app update changes the library and never a copy: the copy keeps its steps; its name is still yours', () => {
    const c = copy(emptyData(), 'lib-recall');
    const was = json(c.data);
    const updated = LIBRARY_DEFS.map((d) => (d.id === 'lib-recall' ? { ...d, name: d.name, steps: ['Hide {material}', 'Recall it'] } : d));
    const lib2 = readLibrary(JSON.stringify(buildLibrary(updated)), updated);
    expect(libraryPreview('lib-recall', lib2).map((r) => r.words)).toEqual(['Hide {material}', 'Recall it']);
    // Nothing in the data reads the library: the person's routines are as they were.
    expect(json(c.data)).toEqual(was);
    expect(named(c.data, 'Recall before you look').items.map((i) => (i as { text?: string }).text ?? 'call')).toEqual(['Put {material} out of sight', 'Write down everything you can recall of it', 'call']);
    expect(libraryRows(c.data, lib2).find((r) => r.id === 'lib-recall')!.yours).toBe(c.routineId);
  });

  it('a copy survives export and import as it is (the backup is the person’s data only)', () => {
    const c = copy(emptyData(), 'lib-recall');
    const back = fromBackup(toBackup(c.data));
    expect(back).toEqual(json(c.data));
  });
});

describe('Copy and add, from where you write (P-105, B-17 journey 4)', () => {
  const plan = () => mine(routine('r1', 'Study for the exam', [{ id: 's1', text: 'Read chapter one' }, { id: 's2', text: 'Sleep' }]));

  it('"@" and part of a method’s name offers it — methods only, none the person has, the one it begins first, at most three', () => {
    expect(libraryMatches(emptyData(), 'recall').map((r) => r.name)).toEqual(['Recall before you look']);
    expect(libraryMatches(emptyData(), 'CHOOSE').map((r) => r.name)).toEqual(['Choose']);
    expect(libraryMatches(emptyData(), 'learn')).toEqual([]);
    expect(libraryMatches(emptyData(), 'e').length).toBe(3);
    expect(libraryMatches(mine(routine('r', 'Recall before you look')), 'recall')).toEqual([]);
    // Begins before holds: "Check" begins "Check and mend" and "Check a source".
    expect(libraryMatches(emptyData(), 'check').map((r) => r.name)).toEqual(['Check and mend', 'Check a source']);
  });

  it('Add’s "a routine" lists the library’s methods the person does not have yet (no template)', () => {
    const names = libraryToAdd(mine(routine('r', 'Choose'))).map((r) => r.name);
    expect(names).toContain('Recall before you look');
    expect(names).not.toContain('Choose');
    expect(names).not.toContain('Learn ▢');
  });

  it('Copy and add: the copy and the call in one write — at the end, or after a step — and one Undo removes both', () => {
    const before = plan();
    const c = copyAndAdd(before, 'lib-recall', 'r1', 's1', env());
    expect(c.ok).toBe(true);
    const items = c.data.routines.r1.items as Item[];
    expect(items.map((i) => i.id)).toEqual(['s1', items[1].id, 's2']);
    expect(items[1]).toMatchObject({ ref: c.routineId, words: 'Recall before you look' });
    expect(named(c.data, 'Check and mend')).toBeDefined();
    expect(undone(before, c.data)).toEqual(json(before));
    const end = copyAndAdd(before, 'lib-cue', 'r1', undefined, env());
    expect((end.data.routines.r1.items as Item[]).slice(-1)[0]).toMatchObject({ ref: end.routineId });
  });

  it('refused as either would be — nothing is written', () => {
    const before = plan();
    expect(copyAndAdd(before, 'lib-recall', 'nope', undefined, env())).toMatchObject({ ok: false, data: before });
    expect(copyAndAdd(before, 'lib-recall', 'r1', 'no-step', env())).toMatchObject({ ok: false, data: before });
    const had = mine(routine('r1', 'Study'), routine('r2', 'Recall before you look'));
    expect(copyAndAdd(had, 'lib-recall', 'r1', undefined, env())).toMatchObject({ ok: false, reason: 'same-name', data: had });
  });
});

describe('Templates (P-106, B-17 slice 3)', () => {
  it('Copy… names the copy and brings what it calls, by name', () => {
    const c = copy(emptyData(), 'lib-learn', 'Learn guitar');
    expect(c.made).toEqual(['Learn guitar', 'Practise at the edge', 'Say what done is', 'Check and mend', 'Recall before you look', 'Review after doing', 'Keep the lesson']);
    expect(copiedWords(c)).toBe('Copied “Learn guitar” and what it calls');
    const lists = body(c.data, c.routineId!).filter((s) => s.each).map((s) => s.each);
    expect(lists).toEqual([
      { item: 'part', list: 'parts', kept: [] },
      { item: 'topic', list: 'topics', kept: [] },
      { item: 'piece', list: 'pieces', kept: [] },
    ]);
  });

  it('"Learn ▢" copied twice gives two routines with separate kept lists that call the same methods', () => {
    const one = copy(emptyData(), 'lib-learn', 'Learn guitar');
    const two = copy(one.data, 'lib-learn', 'Learn Spanish');
    expect(two.made).toEqual(['Learn Spanish']);
    const blocks = (id: Id) => body(two.data, id).filter((s) => s.each);
    const g = blocks(one.routineId!);
    const s = blocks(two.routineId!);
    expect(g.map((b) => b.id).filter((id) => s.some((x) => x.id === id))).toEqual([]);
    // The same methods: every call in both points at the one routine of its name.
    const calls = (id: Id) => body(two.data, id).flatMap((b) => (b.items as Item[]).filter(isRef).map((i) => i.ref)).filter((r) => two.data.routines[r].named);
    expect(calls(two.routineId!)).toEqual(calls(one.routineId!));
    expect(Object.values(two.data.routines).filter((r) => r.words === 'Practise at the edge')).toHaveLength(1);
    // A part added to guitar's kept list is guitar's only.
    const kept = editRoutine(two.data, g[0].id, { kind: 'keptList', items: ['barre chords'] }, env());
    expect(kept.ok).toBe(true);
    expect(kept.data.routines[g[0].id].each).toMatchObject({ kept: ['barre chords'] });
    expect(kept.data.routines[s[0].id].each).toMatchObject({ kept: [] });
  });

  it('a name in use is refused and nothing is overwritten', () => {
    const one = copy(emptyData(), 'lib-learn', 'Learn guitar');
    const again = copyFromLibrary(one.data, 'lib-learn', env(), { words: '  learn GUITAR ' });
    expect(again).toMatchObject({ ok: false, reason: 'same-name' });
    expect(again.data).toBe(one.data);
    expect(copyFromLibrary(one.data, 'lib-learn', env(), { words: '  ' })).toMatchObject({ ok: false, reason: 'empty' });
  });

  it('"Find out ▢" calls itself: its copy calls the copy, and a run steps into it', () => {
    const c = copy(emptyData(), 'lib-find-out', 'Find out about bees');
    expect(c.made).toEqual(['Find out about bees', 'Check a source']);
    const self = body(c.data, c.routineId!).flatMap((b) => (b.items as Item[]).filter(isRef)).find((i) => i.ref === c.routineId);
    expect(self).toMatchObject({ words: 'Find out about bees', with: [{ input: 'question', name: 'lead' }] });
    expect(callIO(c.data, c.routineId!).asks).toEqual(['question']);
    const s = start(c.data, c.routineId!);
    expect(words(s.d, s.id)).toBe('State what you think the answer to {question} is, and what would change your mind');
  });

  it('"Make a decision" runs: its In any order parts each call a method', () => {
    const c = copy(emptyData(), 'lib-decide', 'Make a decision');
    expect(c.made).toEqual(['Make a decision', 'Weigh the options', 'Gather options', 'Choose', 'Find how it fails', 'Try to break it', 'Argue the other side', 'Take the outside view']);
    const s = start(c.data, c.routineId!);
    expect(words(s.d, s.id)).toBe('State {decision} as a choice between things you can do');
  });

  it('every template, copied, can be started', () => {
    for (const [id, name] of [
      ['lib-learn', 'Learn guitar'],
      ['lib-find-out', 'Find out about bees'],
      ['lib-make', 'Make a birthday card'],
      ['lib-decide', 'Make a decision'],
      ['lib-work-out', 'Work it out as you go'],
    ]) {
      const c = copy(emptyData(), id, name);
      expect(readRoutine(c.data, c.routineId!)!.words).toBe(name);
      start(c.data, c.routineId!);
    }
  });
});
