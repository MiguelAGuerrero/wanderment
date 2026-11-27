/**
 * P-110: values follow the place; Plan shows given values; "@" across spaces; and three P-108 investigator repros.
 * One test (or more) per clause of the roadmap's *Done when*. Expected values come from the roadmap, the owner's
 * words (owner-notes, 2026-11-27: "the place where you are … establishes this as the intended or expected state at
 * that point in terms of values declared"; "not displaying placeholders if those values aren't supplied … It should
 * only show the active state of declaration at that point"; "I tried to reference a routine but it didn't work")
 * and the coordinator's repros — never from running the engine.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { atPick, routineInWords } from './atPick';
import { applyUndo, undoEntry } from './diff';
import { editRoutine, Env, Item, place, readRun, Result, RoutineEdit, runVerb, Verb } from './run';
import { planView, runnerView } from './runView';
import { Data, emptyData, Id, Routine } from './types';

const T0 = Date.UTC(2026, 10, 28, 1, 0, 0);
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
const edit = (d: Data, routineId: Id, e: RoutineEdit): Result => editRoutine(d, routineId, e, env());
const okEdit = (d: Data, routineId: Id, e: RoutineEdit): Data => {
  const r = edit(d, routineId, e);
  expect(r.ok, `${JSON.stringify(e)} refused: ${r.reason}`).toBe(true);
  return r.data;
};
const step = (id: string, text = id): Item => {
  const m = /^(.*?)\s*>(\S.*)$/.exec(text);
  return m ? ({ id, text: m[1], out: m[2] } as Item) : { id, text };
};
const ref = (id: string, to: string): Item => ({ id, ref: to }) as Item;
const slot = (id: string, name: string): Item => ({ id, text: `{${name}}`, slot: true }) as Item;
const seq = (id: string, words: string, items: Item[], extra: Record<string, unknown> = {}): Routine => ({ id, words, named: true, createdAt: '2026-11-01T00:00:00.000Z', items, ...extra });
const block = (id: string, item: string, list: string, items: Item[], each: Record<string, unknown> = {}): Routine => seq(id, `For each ${item} in {${list}}`, items, { named: false, each: { item, list, ...each } });
const world = (...ss: Routine[]): Data => ({ ...emptyData(), routines: Object.fromEntries(ss.map((s) => [s.id, s])) });
const run = (d: Data, id: Id) => readRun(d, id)!;
const start = (d: Data, routineId: Id) => {
  const r = go(d, { kind: 'start', routineId });
  expect(r.ok, `start refused: ${r.reason}`).toBe(true);
  return { d: r.data, id: r.runId! };
};
const next = (d: Data, runId: Id, times = 1) => {
  for (let i = 0; i < times; i++) d = ok(d, { kind: 'next', runId });
  return d;
};
const here = (d: Data, id: Id) => place(d, run(d, id))!.item!.id;
const words = (d: Data, id: Id) => runnerView(d, id)!.step.parts.map((p) => (p.kind === 'blank' ? `{${p.name}}` : p.text)).join('');
const give = (d: Data, runId: Id, name: string, text: string) => ok(d, { kind: 'value', runId, name, text, item: here(d, runId) });
const shown = (d: Data, id: Id) => runnerView(d, id)!.values.map((v) => `${v.name}: ${v.text}`);
const stored = (d: Data, id: Id) => run(d, id).values.map((v) => `${v.name}: ${v.items.join(', ')}`);
const json = (v: unknown) => JSON.parse(JSON.stringify(v));
const undone = (before: Data, after: Data) => json(applyUndo(after, undoEntry(before, after)));

/** The owner's routine for iterating on the app: a step reading {feature} before the step that gives it. */
const iterate = () =>
  world(
    seq('I', 'Iterate on the app', [step('env', 'Envision how I’d expect {feature} to work'), step('pick', 'Pick a feature >feature'), step('build', 'Build {feature}'), step('ship', 'Ship it')]),
    seq('DOC', 'Document Iteration', [step('w', 'Write down what changed')]),
  );
/** "Write the post": the giver first. */
const post = () => world(seq('P', 'Write the post', [step('choose', 'Choose a subject >subject'), step('draft', 'Draft {subject}'), step('edit', 'Edit {subject}')]));

// ───────── 1. a value is held only while the step that gives it is above the place ─────────

describe('moving the place back clears the values given at or below it, with Undo', () => {
  it('Back onto the giving step clears its value (it asks again there); the move says what it cleared; one Undo restores it', () => {
    const s = start(post(), 'P');
    const d = next(give(s.d, s.id, 'subject', 'tides'), s.id);
    expect(shown(d, s.id)).toEqual(['subject: tides']);
    const r = go(d, { kind: 'back', runId: s.id });
    expect(r.ok).toBe(true);
    expect(here(r.data, s.id)).toBe('choose');
    expect(shown(r.data, s.id)).toEqual([]);
    expect(runnerView(r.data, s.id)!.fields).toEqual([{ name: 'subject', text: '', gives: true }]);
    expect(stored(r.data, s.id)).toEqual([]);
    expect(r.cleared).toEqual(['subject']);
    // One Undo: the place and the value, together.
    const back = undone(d, r.data);
    expect(here(back, s.id)).toBe('draft');
    expect(shown(back, s.id)).toEqual(['subject: tides']);
  });

  it('Jump to a step before the giver clears it; Jump to a step after the giver keeps it', () => {
    const s = start(post(), 'P');
    const d = next(give(s.d, s.id, 'subject', 'tides'), s.id, 2);
    expect(here(d, s.id)).toBe('edit');
    const after = go(d, { kind: 'jump', runId: s.id, to: { path: ['draft'] } });
    expect(shown(after.data, s.id)).toEqual(['subject: tides']);
    expect(after.cleared ?? []).toEqual([]);
    const onto = go(d, { kind: 'jump', runId: s.id, to: { path: ['choose'] } });
    expect(shown(onto.data, s.id)).toEqual([]);
    expect(stored(onto.data, s.id)).toEqual([]);
    expect(onto.cleared).toEqual(['subject']);
    expect(json(undone(d, onto.data))).toEqual(json(d));
  });

  it('Jump to the start of the level and Start over clear what was given at or after the first step', () => {
    const s = start(post(), 'P');
    const d = next(give(s.d, s.id, 'subject', 'tides'), s.id, 2);
    expect(shown(ok(d, { kind: 'jump', runId: s.id, to: { level: 0 } }), s.id)).toEqual([]);
    expect(shown(ok(d, { kind: 'restart', runId: s.id, level: 0 }), s.id)).toEqual([]);
  });

  it('Repeat from here: a new round clears what the repeating part gave; what was given above the divider stays', () => {
    const d0 = world(seq('R', 'Rounds', [step('who', 'Who is it for >person'), step('what', 'Pick a dish >dish'), step('cook', 'Cook {dish} for {person}')], { repeatFrom: 1 }));
    const s = start(d0, 'R');
    let d = next(give(s.d, s.id, 'person', 'Sam'), s.id);
    d = next(give(d, s.id, 'dish', 'soup'), s.id, 2);
    expect(here(d, s.id)).toBe('what');
    expect(shown(d, s.id)).toEqual(['person: Sam']);
  });

  it('a value given by a row the run is inside stays while it is inside (an own list, an input copy after Back inside the call)', () => {
    const d0 = world(seq('M', 'Main', [step('g', 'Give a colour >colour'), ref('call', 'C'), step('z', 'After')]), seq('C', 'Callee', [step('c1', 'Mix {colour}'), step('c2', 'Paint {colour}')]));
    const s = start(d0, 'M');
    let d = next(give(s.d, s.id, 'colour', 'blue'), s.id);
    d = ok(d, { kind: 'stepIn', runId: s.id });
    d = next(d, s.id);
    expect(words(d, s.id)).toBe('Paint blue');
    d = ok(d, { kind: 'back', runId: s.id });
    expect(words(d, s.id)).toBe('Mix blue');
  });

  it('for each: what the block collected is held after it; Jump back before the block clears it', () => {
    const d0 = world(seq('D', 'Drawing', [step('list', 'List photos >photos'), ref('row', 'E'), step('show', 'Show {drawing}')]), block('E', 'photo', 'photos', [step('sk', 'Sketch {photo} >drawing')]));
    const s = start(d0, 'D');
    let d = ok(s.d, { kind: 'value', runId: s.id, name: 'photos', text: 'a\nb', items: ['a', 'b'], item: 'list' });
    d = next(d, s.id);
    d = next(give(d, s.id, 'drawing', 'A'), s.id);
    d = next(give(d, s.id, 'drawing', 'B'), s.id);
    expect(here(d, s.id)).toBe('show');
    expect(words(d, s.id)).toBe('Show A and B');
    const r = go(d, { kind: 'jump', runId: s.id, to: { path: ['list'] } });
    expect(shown(r.data, s.id)).toEqual([]);
    expect(r.cleared).toEqual(expect.arrayContaining(['photos', 'drawing']));
  });

  it('what a call row was given on Next (owed) is held past it; Jump back onto the row clears it', () => {
    const d0 = world(seq('M', 'Main', [ref('call', 'C'), step('use', 'Use {result}')]), seq('C', 'Callee', [step('c1', 'Work it out >result')]));
    const s = start(d0, 'M');
    const d = ok(s.d, { kind: 'next', runId: s.id, owed: [{ name: 'result', text: '42' }] });
    expect(words(d, s.id)).toBe('Use 42');
    const r = go(d, { kind: 'jump', runId: s.id, to: { path: ['call'] } });
    expect(stored(r.data, s.id)).toEqual([]);
  });
});

describe('a value is asked only at its giving step, never ahead', () => {
  it('a step reading a name a later step gives does not ask for it: no field, its words as written', () => {
    const s = start(iterate(), 'I');
    const v = runnerView(s.d, s.id)!;
    expect(v.fields).toEqual([]);
    expect(words(s.d, s.id)).toBe('Envision how I’d expect {feature} to work');
    // The engine refuses it too.
    expect(go(s.d, { kind: 'value', runId: s.id, name: 'feature', text: 'checkout', item: 'env' }).reason).toBe('cannot');
    // At its giving step it is asked.
    const d = next(s.d, s.id);
    expect(runnerView(d, s.id)!.fields).toEqual([{ name: 'feature', text: '', gives: true }]);
  });

  it('a name nothing gives is still asked where it is read', () => {
    const s = start(world(seq('A', 'Ask', [step('a', 'Call {person}')])), 'A');
    expect(runnerView(s.d, s.id)!.fields).toEqual([{ name: 'person', text: '', gives: false }]);
  });

  it('a giving step passed with it left empty: a later reader asks (the giver is above the place) and the value is held', () => {
    const s = start(post(), 'P');
    let d = next(s.d, s.id);
    expect(runnerView(d, s.id)!.fields).toEqual([{ name: 'subject', text: '', gives: false }]);
    d = give(d, s.id, 'subject', 'tides');
    d = next(d, s.id);
    expect(words(d, s.id)).toBe('Edit tides');
  });
});

describe('nothing stands in for a value not given: the values row lists only what is held', () => {
  it('no "not given yet" for a name a passed step gives with no value', () => {
    const s = start(post(), 'P');
    const d = next(s.d, s.id, 2);
    const v = runnerView(d, s.id)!;
    expect(v.values).toEqual([]);
    expect((v as unknown as { missing?: unknown }).missing).toBeUndefined();
  });
});

describe('runs stored before P-110 that break the rule: corrected on read, cleared only by a move (said, with Undo)', () => {
  /** As the build before left it (p110-old-build.json, "jumpedBack"): asked at the reader, then Jumped back before both. */
  const legacy = () => {
    const d0 = iterate();
    const r: Data = {
      ...d0,
      runs: {
        R: {
          id: 'R',
          routineId: 'I',
          startedAt: '2026-11-28T01:00:00.000Z',
          frames: [{ seq: 'I', at: 'env', round: 1 }],
          changes: [],
          status: 'paused',
          values: [{ name: 'feature', items: ['checkout'], level: 0, seq: 'I', item: 'env', words: 'Envision how I’d expect {feature} to work', at: '2026-11-28T01:00:01.000Z' }],
        } as never,
      },
    };
    return r;
  };

  it('on read: not shown (values row, words, field), and still stored — nothing deleted by reading', () => {
    const d = legacy();
    expect(shown(d, 'R')).toEqual([]);
    expect(words(d, 'R')).toBe('Envision how I’d expect {feature} to work');
    expect(runnerView(d, 'R')!.fields).toEqual([]);
    expect(stored(d, 'R')).toEqual(['feature: checkout']);
  });

  it('reaching its giving step by Next shows it there, in the step’s own field (kept, not cleared)', () => {
    const d = ok(ok(legacy(), { kind: 'resume', runId: 'R' }), { kind: 'next', runId: 'R' });
    expect(here(d, 'R')).toBe('pick');
    expect(runnerView(d, 'R')!.fields).toEqual([{ name: 'feature', text: 'checkout', gives: true }]);
    expect(stored(d, 'R')).toEqual(['feature: checkout']);
  });

  it('a Jump past its giving step, never reaching it, clears it — said, with Undo', () => {
    const d0 = ok(legacy(), { kind: 'resume', runId: 'R' });
    const r = go(d0, { kind: 'jump', runId: 'R', to: { path: ['build'] } });
    expect(stored(r.data, 'R')).toEqual([]);
    expect(r.cleared).toEqual(['feature']);
    expect(stored(undone(d0, r.data), 'R')).toEqual(['feature: checkout']);
  });
});

// ───────── 2. Plan during a run shows the given values ─────────

describe('Plan opened from a run, and "Resume at …", show given values in place of {name}', () => {
  it('rows reading a held value show it; a name not given stays as written', () => {
    const s = start(iterate(), 'I');
    let d = next(s.d, s.id);
    d = next(give(d, s.id, 'feature', 'checkout'), s.id);
    d = ok(d, { kind: 'pause', runId: s.id });
    const v = planView(d, { runId: s.id })!;
    const row = (id: string) => v.rows.find((r) => r.itemId === id)!;
    expect(row('build').shown).toBe('Build checkout');
    expect(row('build').parts).toEqual([{ kind: 'text', text: 'Build ' }, { kind: 'value', name: 'feature', text: 'checkout' }]);
    expect(row('env').shown).toBe('Envision how I’d expect checkout to work');
    expect(v.forward).toMatchObject({ kind: 'resume', label: 'Resume at Build checkout' });
    expect(v.line).toBe('at Build checkout');
    // Moved back before the giver: nothing held, every name as written.
    const back = ok(ok(d, { kind: 'resume', runId: s.id }), { kind: 'jump', runId: s.id, to: { path: ['env'] } });
    const v2 = planView(ok(back, { kind: 'pause', runId: s.id }), { runId: s.id })!;
    expect(v2.forward).toMatchObject({ label: 'Resume at Envision how I’d expect {feature} to work' });
    expect(v2.rows.find((r) => r.itemId === 'build')!.shown).toBeUndefined();
  });

  it('a routine’s Plan with no run shows the words as written', () => {
    const v = planView(iterate(), { routineId: 'I' })!;
    expect(v.rows.every((r) => r.shown === undefined)).toBe(true);
  });
});

// ───────── 4. "@" across spaces ─────────

describe('"@" across spaces', () => {
  const names = ['Document Iteration', 'Draw', 'Daily review'];
  it('after "@" the list stays open across spaces while what is typed still matches a routine’s name', () => {
    expect(atPick('@Document', 9, names)).toEqual({ start: 0, query: 'Document' });
    expect(atPick('@Document ', 10, names)).toEqual({ start: 0, query: 'Document ' });
    expect(atPick('@Document It', 12, names)).toEqual({ start: 0, query: 'Document It' });
    expect(atPick('Run @document  iteration', 24, names)).toEqual({ start: 4, query: 'document  iteration' });
    // No routine matches any more: closed, the words stay words.
    expect(atPick('@Document Itx', 13, names)).toBeNull();
    expect(atPick('@Draw a horse', 13, names)).toBeNull();
  });
  it('"{" and "@" without spaces keep P-103’s rule: only a name’s letters, at a word’s start', () => {
    expect(atPick('{con', 4, names)).toEqual({ start: 0, query: 'con' });
    expect(atPick('{con cerns', 10, names)).toBeNull();
    expect(atPick('me@co', 5, names)).toBeNull();
    expect(atPick('@', 1, names)).toEqual({ start: 0, query: '' });
  });
  it('words that are exactly "@<routine name>" (case and spacing aside) name that routine', () => {
    const rs = [
      { routineId: 'DOC', name: 'Document Iteration' },
      { routineId: 'D', name: 'Draw' },
    ];
    expect(routineInWords('@Document Iteration', rs)).toBe('DOC');
    expect(routineInWords('  @document   iteration ', rs)).toBe('DOC');
    expect(routineInWords('@ Draw', rs)).toBe('D');
    expect(routineInWords('@Document Iteration now', rs)).toBeUndefined();
    expect(routineInWords('Document Iteration', rs)).toBeUndefined();
  });

  it('a step whose words are "@<routine name>" is offered (never made) a call: its row says which; Make it a call is one edit, with Undo', () => {
    const d0 = world(seq('I', 'Iterate', [step('a', 'Build it'), step('doc', '@document  iteration')]), seq('DOC', 'Document Iteration', [step('w', 'Write down what changed')]));
    const v = planView(d0, { routineId: 'I' })!;
    expect(v.rows.find((r) => r.itemId === 'doc')!.asCall).toEqual({ routine: 'DOC', name: 'Document Iteration' });
    expect(v.rows.find((r) => r.itemId === 'a')!.asCall).toBeUndefined();
    // Reading it changes nothing.
    expect((d0.routines.I.items as Item[])[1]).toEqual({ id: 'doc', text: '@document  iteration' });
    const d = okEdit(d0, 'I', { kind: 'toCall', item: 'doc', routine: 'DOC' });
    expect((d.routines.I.items as Item[])[1]).toEqual({ id: 'doc', ref: 'DOC', words: 'Document Iteration' });
    expect(planView(d, { routineId: 'I' })!.rows[1]).toMatchObject({ kind: 'routine', words: 'Document Iteration', call: { gives: [] } });
    expect(json(undone(d0, d))).toEqual(json(d0));
  });

  it('Make it a call: not for itself (no offer, refused in words); not for a step that gives a name; a run on the step stays on it', () => {
    const self = world(seq('I', 'Iterate', [step('doc', '@Iterate')]));
    expect(planView(self, { routineId: 'I' })!.rows[0].asCall).toBeUndefined();
    expect(edit(self, 'I', { kind: 'toCall', item: 'doc', routine: 'I' }).reason).toBe('self');
    const gives = world(seq('I', 'Iterate', [step('doc', '@Document Iteration >x')]), seq('DOC', 'Document Iteration', [step('w')]));
    expect(edit(gives, 'I', { kind: 'toCall', item: 'doc', routine: 'DOC' }).reason).toBe('not-a-step');
    const s = start(world(seq('I', 'Iterate', [step('doc', '@Document Iteration')]), seq('DOC', 'Document Iteration', [step('w')])), 'I');
    const d = okEdit(s.d, 'I', { kind: 'toCall', item: 'doc', routine: 'DOC' });
    expect(here(d, s.id)).toBe('doc');
    expect(runnerView(d, s.id)!.moves.stepIn).toBe(true);
  });

  it('changing a step’s words to "@<routine>" with other words kept: the step keeps them and the call comes right after it (one edit)', () => {
    const d0 = world(seq('I', 'Iterate', [step('a', 'Build it'), step('b', 'Ship it')]), seq('DOC', 'Document Iteration', [step('w')]));
    const d = okEdit(d0, 'I', { kind: 'toCall', item: 'a', routine: 'DOC', words: 'Build it' });
    expect((d.routines.I.items as Item[]).map((i) => ('ref' in i ? `▤${i.ref}` : (i as { text: string }).text))).toEqual(['Build it', '▤DOC', 'Ship it']);
    expect(json(undone(d0, d))).toEqual(json(d0));
  });
});

// ───────── the P-108 investigator's repros (coordinator, 2026-11-27) ─────────

describe('P-108 repros', () => {
  const kept = (items: string[]) =>
    world(seq('B', 'Better', [step('warm', 'Warm up'), ref('row', 'K'), step('rest', 'Rest')]), block('K', 'x', 'xs', [step('do', 'Practise {x}')], { kept: items }));
  /** The items the loop goes through from where it is, by Next, until it leaves the block. */
  const rest = (d: Data, id: Id) => {
    const out: string[] = [];
    for (let i = 0; i < 10 && here(d, id) === 'do'; i++) {
      d = next(d, id);
      if (here(d, id) === 'do') out.push(words(d, id));
    }
    return out;
  };

  it('1. a kept list reordered mid-sitting drops no item not yet done', () => {
    const s = start(kept(['a', 'b', 'c', 'd']), 'B');
    let d = next(s.d, s.id, 3);
    expect(words(d, s.id)).toBe('Practise c');
    d = okEdit(d, 'K', { kind: 'keptList', items: ['d', 'c', 'a', 'b'] });
    expect(rest(d, s.id)).toEqual(['Practise d']);
    // From the first item, the list reversed: every other item still comes round, once.
    const s2 = start(kept(['a', 'b', 'c', 'd']), 'B');
    let d2 = next(s2.d, s2.id);
    expect(words(d2, s2.id)).toBe('Practise a');
    d2 = okEdit(d2, 'K', { kind: 'keptList', items: ['d', 'c', 'b', 'a'] });
    expect(rest(d2, s2.id).sort()).toEqual(['Practise b', 'Practise c', 'Practise d']);
  });

  it('1b. the coordinator’s case: on "c" of [a, b, c, d], given again as [d, c, a] — d still comes round, then the loop ends', () => {
    const s = start(kept(['a', 'b', 'c', 'd']), 'B');
    let d = next(s.d, s.id, 3);
    d = okEdit(d, 'K', { kind: 'keptList', items: ['d', 'c', 'a'] });
    expect(rest(d, s.id)).toEqual(['Practise d']);
  });

  it('2. duplicate kept items keep their own refs when the items are given without refs', () => {
    const d0 = world(seq('B', 'Better', [ref('row', 'K')]), seq('GYM', 'Gym', [step('g')]), block('K', 'x', 'xs', [step('do', 'Do {x}')], { kept: ['Gym', 'Gym'], refs: [{ ref: 'GYM', name: 'Gym' }, null] }));
    const d = okEdit(d0, 'K', { kind: 'keptList', items: ['Gym', 'Gym', 'Run'] });
    expect((d.routines.K.each as { refs?: unknown }).refs).toEqual([{ ref: 'GYM', name: 'Gym' }, null, null]);
  });

  it('3. a value holding the routine that is running offers no Step in (the engine refuses it)', () => {
    const d0 = world(seq('S', 'Self', [step('pick', 'Pick a way >way'), slot('sl', 'way')]));
    const s = start(d0, 'S');
    let d = ok(s.d, { kind: 'value', runId: s.id, name: 'way', text: 'Self', item: 'pick', refs: [{ ref: 'S', name: 'Self' }] });
    d = next(d, s.id);
    const v = runnerView(d, s.id)!;
    expect(go(d, { kind: 'stepIn', runId: s.id }).reason).toBe('self');
    expect(v.moves.stepIn).toBe(false);
    expect(v.middle).toBe('plan');
  });
});
