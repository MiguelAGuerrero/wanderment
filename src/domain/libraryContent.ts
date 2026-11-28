/**
 * P-104 (B-17 slice 1), P-106 (slice 3): the library's content — the methods and templates that ship with the app,
 * written from the discovery file's "The library, in three layers" (`docs/product/discovery/2026-11-27-standard-library.md`)
 * in its closed vocabulary and house style (`docs/product/library.md`). Read-only: it is never written into the person's
 * data until they Copy (`library.ts`), and an app update replaces it whole without reaching into a copy.
 *
 * Written here in a small notation and built into **the export format** (`LIBRARY_BACKUP`, a backup file's shape:
 * `{ app, exportedAt, data }`), which `library.ts` reads through the import check (`fromBackup`) as an import would.
 * `library.test.ts` fails the build if any routine here fails that check or the house style.
 *
 * Notation: a step is its words, `>name` at the end for the name it gives (as Plan's "Gives…"); a call names the
 * routine by its id here, its inputs `{ input: '{name}' }` (a name given above, `with {name} as input`) or
 * `{ input: 'words' }` (typed at the call); `each` is a for each over a list given above, or (`kept`) its own list kept in
 * the routine; `any` is In any order, each part a step broken down; `slot` is a routine row whose routine is a value.
 */
import type { Backup } from './backup';
import { eachWords } from './run';
import { DATA_VERSION, Id, Routine } from './types';

export type Line =
  | string
  | { call: Id; with?: Record<string, string> }
  | { each: string; list: string; kept?: true; steps: Line[] }
  | { any: { part: string; steps: Line[] }[] }
  | { slot: string };

export interface LibraryDef {
  id: Id;
  /** Verb-first; a template's blank is "▢" ("Learn ▢"). */
  name: string;
  /** The heading it sits under in the library view. */
  heading: string;
  /** B-17 (2026-11-28): the one short line on what it is for. */
  for: string;
  /** What it hands back to a caller (its signature's gives): at most two of the names it gives. */
  gives: string[];
  /** A template: copied per aim, named by the person (`Copy…`); `stem` is what the Name field starts with. */
  template?: { stem: string };
  steps: Line[];
}

/** The headings, in the order they are shown. */
export const LIBRARY_HEADINGS = ['To learn', 'To check your work', 'To decide', 'To start', 'For a big aim'] as const;

export const LIBRARY_DEFS: LibraryDef[] = [
  // ───────── To learn ─────────
  {
    id: 'lib-recall',
    name: 'Recall before you look',
    heading: 'To learn',
    for: 'Fixing material in memory',
    gives: ['faults'],
    steps: [
      'Put {material} out of sight',
      'Write down everything you can recall of it',
      { call: 'lib-check-mend', with: { work: 'what I recalled', standard: '{material}', rule: 'from memory, with it out of sight again' } },
    ],
  },
  {
    id: 'lib-edge',
    name: 'Practise at the edge',
    heading: 'To learn',
    for: 'Getting better at a skill',
    gives: ['faults'],
    steps: [
      'Name one thing in {subject} just beyond what you can do >work',
      { call: 'lib-done-is', with: { work: '{work}' } },
      'Attempt it, with full attention: {work}',
      { call: 'lib-check-mend', with: { work: '{work}', standard: '{standard}', rule: 'change only that one thing' } },
    ],
  },
  {
    id: 'lib-review',
    name: 'Review after doing',
    heading: 'To learn',
    for: 'Learning from something you finished',
    gives: ['lessons'],
    steps: [
      'State what you set out to do in {work}, and what happened',
      'List what went well and what fell short, each with why >cases',
      { call: 'lib-lesson', with: { cases: '{cases}' } },
    ],
  },
  // ───────── To check your work (the core) ─────────
  {
    id: 'lib-done-is',
    name: 'Say what done is',
    heading: 'To check your work',
    for: 'Deciding what finished looks like',
    gives: ['standard'],
    steps: ['List what must be true of {work} for it to be done >standard', 'Strike what would be nice and is not needed >standard', 'Reword each so you could check it by looking >standard'],
  },
  {
    id: 'lib-check-mend',
    name: 'Check and mend',
    heading: 'To check your work',
    for: 'Finding and fixing where work falls short',
    gives: ['faults'],
    steps: [
      'Set {work} beside {standard} and go through it point by point',
      'List each place it falls short, as a thing in the work >faults',
      {
        each: 'fault',
        list: 'faults',
        steps: ['Redo only the part of {work} where this is: {fault}. Keep to: {rule}', 'Check that part against {standard} again', 'Add what is still off, and what the fix exposed >faults'],
      },
    ],
  },
  {
    id: 'lib-lesson',
    name: 'Keep the lesson',
    heading: 'To check your work',
    for: 'Turning what happened into better steps',
    gives: ['lessons'],
    steps: [
      'List what explains {cases}: what more than one shares, or what led to each >lessons',
      { each: 'lesson', list: 'lessons', steps: ['Name the routine and the point in it where this would have helped: {lesson}', 'Reword it as a step you could follow there >lessons'] },
      'Open Plan and put each of {lessons} where it belongs',
    ],
  },
  {
    id: 'lib-break',
    name: 'Try to break it',
    heading: 'To check your work',
    for: 'Testing a plan or a belief against doubt',
    gives: ['doubts', 'revised'],
    steps: [
      'State {claim} and how sure you are, in words >before',
      'Take this as fact: {angle}. List the reasons that come easily >doubts',
      { each: 'doubt', list: 'doubts', steps: ['Name what you would see if this were so, and look for it: {doubt}', 'Reword it with what you found >doubts'] },
      'Strike the doubts that did not hold up >doubts',
      'State {claim} again beside {before}, changed by the doubts left >revised',
    ],
  },
  // ───────── To decide ─────────
  {
    id: 'lib-weigh',
    name: 'Weigh the options',
    heading: 'To decide',
    for: 'Choosing between options fairly',
    gives: ['choice'],
    steps: [{ call: 'lib-gather', with: { problem: '{decision}' } }, 'List what matters in {decision}, each thing separate >tests', { call: 'lib-choose', with: { options: '{options}', tests: '{tests}' } }],
  },
  {
    id: 'lib-gather',
    name: 'Gather options',
    heading: 'To decide',
    for: 'Widening the choices before you pick',
    gives: ['options'],
    steps: [
      'List every answer to {problem} that comes, judging none >options',
      'State {problem} with its particulars taken out >bare problem',
      'Add what is done about this elsewhere: {bare problem} >options',
      'Add leaving things as they are, and one you would not pick first >options',
    ],
  },
  {
    id: 'lib-choose',
    name: 'Choose',
    heading: 'To decide',
    for: 'Picking on evidence, a test at a time',
    gives: ['choice'],
    steps: [
      { each: 'test', list: 'tests', steps: ['Write beside each of {options} how it does on this alone, from evidence: {test}'] },
      'Strike the options that fail a test that must hold',
      'Name the one you take, and what you give up by it >choice',
    ],
  },
  {
    id: 'lib-fails',
    name: 'Find how it fails',
    heading: 'To decide',
    for: 'Seeing a plan’s weak points before you start',
    gives: ['doubts', 'revised'],
    steps: [{ call: 'lib-break', with: { claim: '{plan}', angle: 'it was carried out and failed badly' } }],
  },
  {
    id: 'lib-argue',
    name: 'Argue the other side',
    heading: 'To decide',
    for: 'Checking a belief against its opposite',
    gives: ['doubts', 'revised'],
    steps: [{ call: 'lib-break', with: { claim: '{belief}', angle: 'the opposite is true' } }],
  },
  {
    id: 'lib-outside',
    name: 'Take the outside view',
    heading: 'To decide',
    for: 'Forecasting from how things like it went',
    gives: ['forecast'],
    steps: [
      'State your own guess for {project} >guess',
      'Name the kind of thing {project} is >kind',
      'List past cases of this kind, with how each really went: {kind} >cases',
      'State what usually happens across {cases} >usual',
      // (F-2, audit F16: one job a step — the forecast, then set beside the guess.)
      'Start from {usual}, and move only for what is truly different >forecast',
      'Set {forecast} beside {guess}',
    ],
  },
  {
    id: 'lib-source',
    name: 'Check a source',
    heading: 'To decide',
    for: 'Judging how far to trust what you read',
    gives: ['trust'],
    steps: [
      'Leave {source} before reading it closely',
      'Search for who is behind {source} and what others say of them >standing',
      'Find where its main claim first came from >origin',
      'State how far to trust it, given {standing} and {origin}: {source} >trust',
    ],
  },
  // ───────── To start ─────────
  {
    id: 'lib-cue',
    name: 'Set a cue to start',
    heading: 'To start',
    for: 'Making a start more likely',
    gives: ['cue'],
    steps: ['Name the first small action for {aim} >action', 'Name the moment it follows, something you already do or a place you will be >cue', 'Put this where it happens: When {cue}, I will {action}'],
  },
  // ───────── For a big aim (templates, P-106) ─────────
  {
    id: 'lib-learn',
    name: 'Learn ▢',
    heading: 'For a big aim',
    for: 'Learning a skill by practice, study and use',
    gives: [],
    template: { stem: 'Learn ' },
    steps: [
      'State what you want to be able to do',
      {
        any: [
          { part: 'Practise', steps: [{ each: 'part', list: 'parts', kept: true, steps: [{ call: 'lib-edge', with: { subject: '{part}' } }, 'Add what you still can’t do, from {faults} >parts'] }] },
          { part: 'Study', steps: [{ each: 'topic', list: 'topics', kept: true, steps: ['Find one good source on {topic}', { call: 'lib-recall', with: { material: 'that source' } }, 'Note what to practise next, from {faults}'] }] },
          { part: 'Use it', steps: [{ each: 'piece', list: 'pieces', kept: true, steps: ['Make it for real, start to finish: {piece}', { call: 'lib-review', with: { work: '{piece}' } }] }] },
        ],
      },
    ],
  },
  {
    id: 'lib-find-out',
    name: 'Find out ▢',
    heading: 'For a big aim',
    for: 'Researching a question, and what it raises',
    gives: ['answer'],
    template: { stem: 'Find out ' },
    steps: [
      'State what you think the answer to {question} is, and what would change your mind',
      // (F-2, audit F16: one job a step.)
      'Find what bears on {question}',
      'List the sources worth keeping >sources',
      { each: 'source', list: 'sources', steps: [{ call: 'lib-source', with: { source: '{source}' } }, 'Mark it with how far to trust it: {trust} >sources'] },
      'List the questions this raises >leads',
      // It calls itself, once per question raised (its copy calls the copy).
      { each: 'lead', list: 'leads', steps: [{ call: 'lib-find-out', with: { question: '{lead}' } }] },
      'State the answer to {question}, from {sources} and what the leads gave >answer',
    ],
  },
  {
    id: 'lib-make',
    name: 'Make ▢',
    heading: 'For a big aim',
    for: 'Making something for someone, tried early',
    gives: [],
    template: { stem: 'Make ' },
    steps: [
      'State who it is for and what it should do for them >brief',
      { call: 'lib-done-is', with: { work: '{brief}' } },
      { call: 'lib-gather', with: { problem: '{brief}' } },
      { each: 'option', list: 'options', steps: ['Make the cheapest version of this that can be tried: {option}', 'Try it on someone, or on yourself', 'Mark the option with what it showed >options'] },
      { call: 'lib-choose', with: { options: '{options}', tests: '{standard}' } },
      { call: 'lib-fails', with: { plan: '{choice}' } },
      'Build the first whole version of: {revised}',
      { call: 'lib-check-mend', with: { work: 'the first version', standard: '{standard}', rule: 'show it to someone after each change' } },
      { call: 'lib-review', with: { work: 'the whole project' } },
    ],
  },
  {
    id: 'lib-decide',
    name: 'Make a decision',
    heading: 'For a big aim',
    for: 'A decision that matters, checked from all sides',
    gives: ['choice'],
    template: { stem: '' },
    steps: [
      'State {decision} as a choice between things you can do',
      { call: 'lib-weigh', with: { decision: '{decision}' } },
      {
        any: [
          { part: 'Look for how it fails', steps: [{ call: 'lib-fails', with: { plan: '{choice}' } }] },
          { part: 'Argue against it', steps: [{ call: 'lib-argue', with: { belief: '{choice}' } }] },
          { part: 'Compare it with past cases', steps: [{ call: 'lib-outside', with: { project: '{choice}' } }] },
        ],
      },
      // (F-2, audit F16: one job a step.)
      'State the choice again, from what each check gave >choice',
      'Name what you would have to see to reopen it',
    ],
  },
  {
    id: 'lib-work-out',
    name: 'Work it out as you go',
    heading: 'For a big aim',
    for: 'An aim with no clear path yet',
    gives: [],
    template: { stem: '' },
    steps: ['List the first steps toward {aim} >steps', { each: 'step', list: 'steps', steps: [{ slot: 'step' }, 'Adjust the list: what does that make possible >steps'] }],
  },
];

/** When the library was written (every record's `createdAt`; a copy takes the time it was copied). */
const WRITTEN = '2026-11-28T00:00:00.000Z';

/** The library in the export format: a backup file holding its routines and nothing else. */
export function buildLibrary(defs: readonly LibraryDef[] = LIBRARY_DEFS): Backup {
  const names = new Map(defs.map((d) => [d.id, d.name]));
  const routines: Record<Id, Routine> = {};
  for (const d of defs) {
    let n = 0;
    let sub = 0;
    const id = () => `${d.id}.${++n}`;
    const seqId = () => `${d.id}/${++sub}`;
    const put = (r: Routine) => (routines[r.id] = r);
    const items = (lines: readonly Line[]): unknown[] =>
      lines.map((l) => {
        if (typeof l === 'string') {
          const m = /^(.*?)\s*>([^>{}]+)$/.exec(l);
          return m ? { id: id(), text: m[1], out: m[2].trim() } : { id: id(), text: l };
        }
        if ('call' in l) {
          const bind = Object.entries(l.with ?? {}).map(([input, v]) => {
            const named = /^\{([^{}]+)\}$/.exec(v);
            return named ? { input, name: named[1] } : { input, typed: v };
          });
          return { id: id(), ref: l.call, words: names.get(l.call) ?? '', ...(bind.length && { with: bind }) };
        }
        if ('slot' in l) return { id: id(), text: `{${l.slot}}`, slot: true };
        if ('each' in l) {
          const each = { item: l.each, list: l.list, ...(l.kept && { kept: [] as string[] }) };
          const block: Routine = { id: seqId(), words: eachWords(each), named: false, createdAt: WRITTEN, items: [], each };
          put(block);
          block.items = items(l.steps);
          return { id: id(), ref: block.id };
        }
        const any: Routine = { id: seqId(), words: 'In any order', named: false, createdAt: WRITTEN, items: [], any: true };
        put(any);
        any.items = l.any.map((p) => {
          const part: Routine = { id: seqId(), words: p.part, named: false, createdAt: WRITTEN, items: [] };
          put(part);
          part.items = items(p.steps);
          return { id: id(), ref: part.id };
        });
        return { id: id(), ref: any.id };
      });
    const root: Routine = { id: d.id, words: d.name, named: true, createdAt: WRITTEN, items: [], open: true, home: true };
    put(root);
    root.items = items(d.steps);
  }
  return { app: 'wanderment', exportedAt: WRITTEN, data: { version: DATA_VERSION, threads: {}, activities: {}, routines, runs: {} } };
}

/** The library as it ships: a backup file (the export format). */
export const LIBRARY_BACKUP: Backup = buildLibrary();
