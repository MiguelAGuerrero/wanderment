/**
 * P-112 (B-16, "A chunk is chosen while running, not written into the routine"): the steps in view on the runner, and
 * Next over them. Done when: the step in view can be extended with the next, again and again; a step with insides opens
 * in place as an outline; a giving step in the chunk has its field there; Next takes the chunk as done (one move, Undo)
 * and goes past it; nothing stored. The brief's rulings: a turn's end extends into the next turn; a closed step with
 * insides shows fields for what its insides give (a for each whose list is given: one per item); what a passed chunk
 * gave stays (the place is then below it); Back keeps values. Expected values are those words, not the engine's output.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { chunkAt, chunkView, Drafts } from './chunk';
import { Env, Item, place, readRun, Result, runVerb, Verb } from './run';
import { runnerView } from './runView';
import { Data, emptyData, Id, Routine } from './types';

const T0 = Date.UTC(2026, 10, 28, 9, 0, 0);
let n = 0;
let t = 0;
beforeEach(() => {
  n = 0;
  t = 0;
});
const env = (): Env => ({ now: new Date(T0 + 1000 * t++).toISOString(), id: () => `x${++n}` });
const go = (d: Data, verb: Verb): Result => runVerb(d, verb, env());
const ok = (d: Data, verb: Verb): Data => {
  const r = go(d, verb);
  expect(r.ok, `${JSON.stringify(verb)} refused: ${r.reason}`).toBe(true);
  return r.data;
};
const step = (id: string, text = id): Item => {
  const m = /^(.*?)\s*>(\S.*)$/.exec(text);
  return m ? ({ id, text: m[1], out: m[2] } as Item) : { id, text };
};
const ref = (id: string, to: string): Item => ({ id, ref: to }) as Item;
const seq = (id: string, words: string, items: Item[], extra: Record<string, unknown> = {}): Routine => ({ id, words, named: true, createdAt: '2026-11-01T00:00:00.000Z', items, ...extra });
const block = (id: string, item: string, list: string, items: Item[]): Routine => seq(id, `For each ${item} in {${list}}`, items, { named: false, each: { item, list } });
const world = (...ss: Routine[]): Data => ({ ...emptyData(), routines: Object.fromEntries(ss.map((s) => [s.id, s])) });
const run = (d: Data, id: Id) => readRun(d, id)!;
const start = (d: Data, routineId: Id) => {
  const r = go(d, { kind: 'start', routineId });
  expect(r.ok, `start refused: ${r.reason}`).toBe(true);
  return { d: r.data, id: r.runId! };
};
const here = (d: Data, id: Id) => place(d, run(d, id))!.item!.id;
const words = (d: Data, id: Id) => runnerView(d, id)!.step.parts.map((p) => (p.kind === 'blank' ? `{${p.name}}` : p.text)).join('');
const stored = (d: Data, id: Id) => run(d, id).values.map((v) => `${v.name}: ${v.items.join(', ')}`);
const shown = (d: Data, id: Id) => runnerView(d, id)!.values.map((v) => `${v.name}: ${v.text}`);
const NONE: ReadonlySet<string> = new Set();
const view = (d: Data, id: Id, want: number, open: ReadonlySet<string> = NONE, drafts: Drafts = {}) => chunkView(d, id, want, open, drafts)!;
const rowWords = (v: ReturnType<typeof view>) => v.rows.map((r) => `${'  '.repeat(r.depth)}${r.parts.map((p) => (p.kind === 'blank' ? `{${p.name}}` : p.text)).join('')}`);
/** Next over the chunk in view, as the runner sends it. */
const nextOver = (d: Data, id: Id, v: ReturnType<typeof view>) => go(d, { kind: 'next', runId: id, chunk: v.moves });

/** "Write the post", five steps: the second gives {subject}; it ends there ("ends here"). */
const post = () =>
  world(seq('P', 'Write the post', [step('warm', 'Warm up'), step('choose', 'Choose a subject >subject'), step('draft', 'Draft {subject}'), step('edit', 'Edit {subject}'), step('send', 'Send it')], { open: false }));

describe('the steps in view: the step, and the next ones pulled in', () => {
  it('one step by default; each one added is where Next would go; "then:" names the step after the last', () => {
    const s = start(post(), 'P');
    const one = view(s.d, s.id, 1);
    expect(rowWords(one)).toEqual(['Warm up']);
    expect(one.n).toBe(1);
    expect(one.then).toBe('Choose a subject');
    const three = view(s.d, s.id, 3);
    expect(rowWords(three)).toEqual(['Warm up', 'Choose a subject', 'Draft {subject}']);
    expect(three.then).toBe('Edit {subject}');
    expect(three.ends).toBe(false);
  });

  it('it stops at the end of the run: no "then:", and Next over it reads Done', () => {
    const s = start(post(), 'P');
    const all = view(s.d, s.id, 99);
    expect(all.n).toBe(5);
    expect(all.then).toBeUndefined();
    expect(all.ends).toBe(true);
  });

  it('a value typed in a giving step in view is in place in the steps below it, before Next', () => {
    const s = start(post(), 'P');
    const key = view(s.d, s.id, 3).rows[1].fields[0].key;
    const v = view(s.d, s.id, 3, NONE, { [key]: { text: 'tides' } });
    expect(v.rows[1].fields.map((f) => `${f.name}: ${f.text}`)).toEqual(['subject: tides']);
    expect(rowWords(v)).toEqual(['Warm up', 'Choose a subject', 'Draft tides']);
    expect(v.then).toBe('Edit tides');
  });

  it('a step reading a name that a step above it in view gives has no field for it: it is typed where it is given', () => {
    const s = start(post(), 'P');
    const v = view(s.d, s.id, 4);
    expect(v.rows.map((r) => r.fields.map((f) => `${f.gives ? '' : 'asks '}${f.name}`))).toEqual([[], ['subject'], [], []]);
    // Shown alone at its own place, as ever, it asks.
    const at = ok(ok(ok(s.d, { kind: 'next', runId: s.id }), { kind: 'next', runId: s.id }), { kind: 'next', runId: s.id });
    expect(view(at, s.id, 1).rows[0].fields.map((f) => `${f.gives ? '' : 'asks '}${f.name}`)).toEqual(['asks subject']);
  });

  it('nothing is stored: looking ahead changes nothing', () => {
    const s = start(post(), 'P');
    const before = JSON.stringify(s.d);
    const key = view(s.d, s.id, 4).rows[1].fields[0].key;
    view(s.d, s.id, 4, NONE, { [key]: { text: 'tides' } });
    expect(JSON.stringify(s.d)).toBe(before);
    expect(here(s.d, s.id)).toBe('warm');
  });

  it('a turn’s end extends into the next turn: a for each’s next item comes round in view', () => {
    const d0 = world(seq('L', 'Look at photos', [step('list', 'List photos >photos'), ref('fe', 'B'), step('after', 'Put them away')]), block('B', 'photo', 'photos', [step('look', 'Look at {photo}'), step('note', 'Note {photo}')]));
    const s = start(d0, 'L');
    const d = ok(ok(s.d, { kind: 'value', runId: s.id, name: 'photos', text: 'a\nb', items: ['a', 'b'], item: 'list' }), { kind: 'next', runId: s.id });
    expect(words(d, s.id)).toBe('Look at a');
    const v = view(d, s.id, 5);
    expect(rowWords(v).map((w) => w.trim())).toEqual(['Look at a', 'Note a', 'Look at b', 'Note b', 'Put them away']);
  });
});

describe('Next over the chunk: one move, everything in view taken as done', () => {
  it('goes to the step after the last one shown, with the values typed — kept, because the place is below them', () => {
    const s = start(post(), 'P');
    const key = view(s.d, s.id, 3).rows[1].fields[0].key;
    const v = view(s.d, s.id, 3, NONE, { [key]: { text: 'tides' } });
    const r = nextOver(s.d, s.id, v);
    expect(r.ok).toBe(true);
    expect(here(r.data, s.id)).toBe('edit');
    expect(words(r.data, s.id)).toBe('Edit tides');
    expect(stored(r.data, s.id)).toEqual(['subject: tides']);
    expect(shown(r.data, s.id)).toEqual(['subject: tides']);
    // It lands exactly where the dashed row said.
    expect(v.then).toBe(words(r.data, s.id));
  });

  it('Back after it keeps the values', () => {
    const s = start(post(), 'P');
    const key = view(s.d, s.id, 3).rows[1].fields[0].key;
    const d = nextOver(s.d, s.id, view(s.d, s.id, 3, NONE, { [key]: { text: 'tides' } })).data;
    const back = ok(d, { kind: 'back', runId: s.id });
    expect(here(back, s.id)).toBe('draft');
    expect(stored(back, s.id)).toEqual(['subject: tides']);
  });

  it('over the last steps, it ends the run', () => {
    const s = start(post(), 'P');
    const r = nextOver(s.d, s.id, view(s.d, s.id, 99));
    expect(r.ok).toBe(true);
    expect(r.said?.kind).toBe('ended');
    expect(run(r.data, s.id).endedAt).toBeDefined();
  });

  it('refused as a whole — nothing changes — when it would end the run before its last step', () => {
    const s = start(post(), 'P');
    const r = go(s.d, { kind: 'next', runId: s.id, chunk: [{}, {}, {}, {}, {}, {}] });
    expect(r.ok).toBe(false);
    expect(r.data).toBe(s.d);
  });

  it('a value left empty is not given: the step that reads it asks, as ever', () => {
    const s = start(post(), 'P');
    const d = nextOver(s.d, s.id, view(s.d, s.id, 3)).data;
    expect(stored(d, s.id)).toEqual([]);
    expect(runnerView(d, s.id)!.fields.map((f) => `${f.gives ? '' : 'asks '}${f.name}`)).toEqual(['asks subject']);
  });

  it('the step in view keeps its value as it is unless it is typed over', () => {
    const s = start(post(), 'P');
    const at = ok(ok(s.d, { kind: 'next', runId: s.id }), { kind: 'value', runId: s.id, name: 'subject', text: 'tides', item: 'choose' });
    const v = view(at, s.id, 2);
    expect(v.rows[0].fields.map((f) => `${f.name}: ${f.text}`)).toEqual(['subject: tides']);
    const d = nextOver(at, s.id, v).data;
    expect(words(d, s.id)).toBe('Edit tides');
  });
});

/** "Ship it": a call to "Get reviewed", which gives {verdict}; a step after reads it. */
const ship = () =>
  world(
    seq('S', 'Ship it', [step('prep', 'Prepare'), ref('call', 'R'), step('read', 'Act on {verdict}')]),
    seq('R', 'Get reviewed', [step('ask', 'Ask for a review'), step('hear', 'Hear back >verdict')], { home: false }),
  );

describe('a step with insides', () => {
  it('closed, it shows a field for what its insides give; Next over it gives that, by the row', () => {
    const s = start(ship(), 'S');
    const v = view(s.d, s.id, 2);
    expect(v.rows[1].insides).toBe(true);
    expect(v.rows[1].fields.map((f) => f.name)).toEqual(['verdict']);
    const d = nextOver(s.d, s.id, view(s.d, s.id, 2, NONE, { [v.rows[1].fields[0].key]: { text: 'ship it' } })).data;
    expect(words(d, s.id)).toBe('Act on ship it');
    expect(run(d, s.id).values.map((e) => `${e.name}: ${e.items.join(', ')} from ${e.item}`)).toEqual(['verdict: ship it from call']);
  });

  it('opened in place, its smaller steps are an outline under it, the field on the step that gives it — the words typed kept either way', () => {
    const s = start(ship(), 'S');
    const closed = view(s.d, s.id, 2);
    const drafts = { [closed.rows[1].fields[0].key]: { text: 'needs work' } };
    const open = view(s.d, s.id, 2, new Set([closed.rows[1].key]), drafts);
    expect(rowWords(open)).toEqual(['Prepare', 'Get reviewed', '  Ask for a review', '  Hear back']);
    expect(open.rows[1].open).toBe(true);
    expect(open.rows[1].fields).toEqual([]);
    expect(open.rows[3].inner).toBe(true);
    expect(open.rows[3].fields.map((f) => `${f.name}: ${f.text}`)).toEqual(['verdict: needs work']);
    // Next still stands only on the steps in view: two.
    expect(open.n).toBe(2);
    const d = nextOver(s.d, s.id, open).data;
    expect(words(d, s.id)).toBe('Act on needs work');
  });

  it('a for each inside whose list is given: one field per item; Next gives them as one list, in the order of the items', () => {
    const d0 = world(
      seq('W', 'Weekly review', [step('list', 'List the projects >projects'), ref('bd', 'BD'), step('file', 'File {statuses}')]),
      seq('BD', 'Check each project', [ref('fe', 'FE')], { named: false }),
      block('FE', 'project', 'projects', [step('st', 'Say where {project} is >statuses')]),
    );
    const s = start(d0, 'W');
    const d = ok(ok(s.d, { kind: 'value', runId: s.id, name: 'projects', text: 'garden\nshed', items: ['garden', 'shed'], item: 'list' }), { kind: 'next', runId: s.id });
    const closed = view(d, s.id, 1);
    expect(closed.rows[0].words).toBe('Check each project');
    const opened = view(d, s.id, 1, new Set([closed.rows[0].key]));
    const fe = opened.rows[1];
    expect(fe.words).toBe('For each project');
    expect(fe.fields.map((f) => `${f.name} · ${f.item}`)).toEqual(['statuses · garden', 'statuses · shed']);
    const typed = { [fe.fields[0].key]: { text: 'growing' }, [fe.fields[1].key]: { text: 'leaning' } };
    const after = nextOver(d, s.id, view(d, s.id, 1, new Set([closed.rows[0].key]), typed)).data;
    expect(here(after, s.id)).toBe('file');
    expect(run(after, s.id).values.filter((e) => e.name === 'statuses').map((e) => e.items)).toEqual([['growing', 'leaning']]);
  });

  it('Step in still steps into the first step in view', () => {
    const s = start(ship(), 'S');
    const d = ok(ok(s.d, { kind: 'next', runId: s.id }), { kind: 'stepIn', runId: s.id });
    expect(here(d, s.id)).toBe('ask');
    expect(chunkAt(d, s.id)).not.toBe(chunkAt(ok(s.d, { kind: 'next', runId: s.id }), s.id));
  });
});
