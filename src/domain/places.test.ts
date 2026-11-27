/**
 * P-109 (B-18 slice 1): a routine's places and the one safety rule for opening anything. Expected values come
 * from the roadmap item's Done when, B-18 (its journeys and "Edges") and the batch's rulings — ONLY http: and
 * https: open; everything else, including what an import brings, is words; old data reads as none; a field in
 * another shape is never overwritten — never from this code's output.
 */
import { describe, expect, it } from 'vitest';

import { planImport } from './importPlan';
import { importHolds } from './importText';
import { addressesIn, hostOf, openable, placesOf, placesShown, placeSpoken, placesWritable } from './places';
import { editRoutine, Env, Item, runVerb, Verb } from './run';
import { panelView, whatChanged } from './runView';
import { Data, emptyData, Id, Routine } from './types';

let n = 0;
const env = (): Env => ({ now: new Date(Date.UTC(2026, 10, 27, 10, 0, n)).toISOString(), id: () => `x${++n}` });
const ok = (d: Data, verb: Verb) => {
  const r = runVerb(d, verb, env());
  expect(r.ok, `${JSON.stringify(verb)} refused: ${r.reason}`).toBe(true);
  return r;
};
const step = (id: string, text = id, out?: string): Item => ({ id, text, ...(out && { out }) });
const ref = (id: string, to: string): Item => ({ id, ref: to });
const seq = (id: string, words: string, items: Item[], extra: Record<string, unknown> = {}): Routine => ({ id, words, named: true, createdAt: '2026-11-01T00:00:00.000Z', items, home: true, ...extra });
const world = (...ss: Routine[]): Data => ({ ...emptyData(), routines: Object.fromEntries(ss.map((s) => [s.id, s])) });
const start = (d: Data, routineId: Id) => {
  const r = ok(d, { kind: 'start', routineId });
  return { d: r.data, id: r.runId! };
};
const place = (id: string, name: string, where: string) => ({ id, name, where });

describe('SAFETY: a Where opens only when it is an http: or https: address', () => {
  it('http and https addresses open, as written (the spaces around them gone)', () => {
    expect(openable('https://www.notion.so/team/Product-design-1a2b3c')).toBe('https://www.notion.so/team/Product-design-1a2b3c');
    expect(openable('http://example.com')).toBe('http://example.com');
    expect(openable('https://docs.google.com/document/d/1AbC/edit#heading=h.x')).toBe('https://docs.google.com/document/d/1AbC/edit#heading=h.x');
    expect(openable(' https://x.com ')).toBe('https://x.com');
    expect(openable('\nhttps://x.com/a?b=c\t')).toBe('https://x.com/a?b=c');
    // The scheme in any case opens, as the lower-case scheme.
    expect(openable('HTTPS://Example.com/Path')).toBe('https://Example.com/Path');
    expect(openable('https://localhost:8080/x')).toBe('https://localhost:8080/x');
    expect(openable('https://[::1]/x')).toBe('https://[::1]/x');
  });

  it('script and data schemes never open, in any case or disguise', () => {
    for (const w of [
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      ' javascript:alert(1)',
      '\u0001javascript:alert(1)',
      'java\tscript:alert(1)',
      'java\nscript:alert(1)',
      'javascript://example.com/%0Aalert(1)',
      'vbscript:msgbox(1)',
      'VBScript:msgbox(1)',
      'data:text/html,<script>alert(1)</script>',
      'DATA:text/html;base64,PHNjcmlwdD4=',
      'file:///etc/passwd',
      'FILE://C:/Windows',
      'blob:https://example.com/uuid',
      'about:blank',
    ])
      expect(openable(w), w).toBeUndefined();
  });

  it('other apps’ own schemes, relative paths and plain words are words (B-18: the first slice opens http(s) only)', () => {
    for (const w of [
      'notion://www.notion.so/page',
      'obsidian://open?vault=x',
      'shortcuts://run-shortcut?name=x',
      'mailto:me@example.com',
      'tel:+15551234',
      'ftp://example.com/file',
      '//example.com/x',
      '/relative/path',
      './file.txt',
      'www.notion.so/page',
      'notion.so',
      'left shelf, the grey one',
      'iCloud › Game › design.psd',
      '',
      '   ',
    ])
      expect(openable(w), w).toBeUndefined();
  });

  it('addresses that only look like http(s) do not open: no host, a space or a control character inside, an odd authority', () => {
    for (const w of [
      'https:',
      'https:x.com',
      'https:/x.com',
      'https://',
      'https:///path',
      'https://x.com/a b',
      'https://x .com',
      'https://x.com/\u0000',
      'https://x.com/\u200Bhidden',
      'https://x.com\u2028/x',
      'https://..',
      'https://x..com',
      'https://x.com:port/',
      'https://user@',
      'xhttps://x.com',
      'http//x.com',
    ])
      expect(openable(w), JSON.stringify(w)).toBeUndefined();
    // Not text at all (an import can bring anything): nothing.
    for (const w of [undefined, null, 3, { href: 'https://x.com' }, ['https://x.com']]) expect(openable(w)).toBeUndefined();
  });

  it('the host shown is where the address really goes: "www." dropped, never the whole address; credentials are not the host', () => {
    expect(hostOf('https://www.notion.so/team/Product-design-1a2b3c')).toBe('notion.so');
    expect(hostOf('https://docs.google.com/document/d/1AbC/edit')).toBe('docs.google.com');
    expect(hostOf('HTTPS://WWW.Example.COM/Path')).toBe('example.com');
    expect(hostOf('https://localhost:8080/x')).toBe('localhost');
    // "evil.com@" is a user name: the page is good.com's — and the other way round, evil's.
    expect(hostOf('https://evil.com@good.com/x')).toBe('good.com');
    expect(hostOf('https://good.com@evil.com/x')).toBe('evil.com');
    expect(hostOf('https://good.com:pass@evil.com:443/x')).toBe('evil.com');
    // A host in other scripts is shown as it is sent (ASCII), so a look-alike cannot pass for another.
    expect(hostOf('https://bücher.de/x')).toBe('xn--bcher-kva.de');
    expect(hostOf('https://аpple.com/')).toBe('xn--pple-43d.com');
    expect(hostOf('javascript:alert(1)')).toBe('');
    expect(hostOf('left shelf')).toBe('');
  });

  it('spoken: "Open <name>, <host>" for an address; "<name>, <words>" for words', () => {
    const [a, w, js] = placesShown([place('a', 'Product design', 'https://www.notion.so/x'), place('w', 'Sketchbook', 'left shelf, the grey one'), place('j', 'Trap', 'javascript:alert(1)')]);
    expect(placeSpoken(a)).toBe('Open Product design, notion.so');
    expect(placeSpoken(w)).toBe('Sketchbook, left shelf, the grey one');
    expect(a).toMatchObject({ href: 'https://www.notion.so/x', host: 'notion.so' });
    expect(w.href).toBeUndefined();
    // Shown as words, whole: it opens nothing.
    expect(js).toEqual({ id: 'j', name: 'Trap', where: 'javascript:alert(1)' });
    expect(placeSpoken(js)).toBe('Trap, javascript:alert(1)');
  });
});

describe('typed addresses: an http(s) address inside a step’s words, a value or the pause note (B-18 journey 4)', () => {
  it('finds each address once, in order, leaving the punctuation after it; other schemes are passed over', () => {
    expect(addressesIn('Read the brief at https://docs.google.com/document/d/1AbC-dEf/edit and note where I left off')).toEqual([{ href: 'https://docs.google.com/document/d/1AbC-dEf/edit', host: 'docs.google.com' }]);
    expect(addressesIn('See (https://x.com/a). Then https://y.org/b, and https://x.com/a again!')).toEqual([
      { href: 'https://x.com/a', host: 'x.com' },
      { href: 'https://y.org/b', host: 'y.org' },
    ]);
    // A bracket the address itself opened stays.
    expect(addressesIn('https://en.wikipedia.org/wiki/Foo_(bar)')).toEqual([{ href: 'https://en.wikipedia.org/wiki/Foo_(bar)', host: 'en.wikipedia.org' }]);
    expect(addressesIn('Never open javascript:alert(1) or file:///etc/passwd or notion://x')).toEqual([]);
    expect(addressesIn('xhttps://x.com is not one; plain words neither')).toEqual([]);
    expect(addressesIn('JaVaScRiPt:https://x.com')).toEqual([{ href: 'https://x.com', host: 'x.com' }]);
    expect(addressesIn(undefined, '', 'left off at https://www.figma.com/file/XyZ/Sketches section 3', 'https://www.figma.com/file/XyZ/Sketches')).toEqual([{ href: 'https://www.figma.com/file/XyZ/Sketches', host: 'figma.com' }]);
  });
});

describe('storage: `places` in the routine’s body, read tolerantly, never overwritten in a shape this version does not know', () => {
  it('old data has none: missing, not a list, or junk reads as none or what is good in it', () => {
    expect(placesOf(undefined)).toEqual([]);
    expect(placesOf('https://x.com')).toEqual([]);
    expect(placesOf({ 0: place('a', 'A', 'x') })).toEqual([]);
    expect(placesOf([place('a', 'A', 'x'), null, 3, { id: 'b', name: 'B' }, { id: '', name: 'C', where: 'w' }, { id: 'd', name: 4, where: 'w' }, place('a', 'Again', 'y'), { ...place('e', 'E', 'w'), later: 1 }])).toEqual([place('a', 'A', 'x'), place('e', 'E', 'w')]);
  });

  it('writable: none, or a list of places with ids once; anything else is a later version’s and is kept', () => {
    expect(placesWritable(undefined)).toBe(true);
    expect(placesWritable([])).toBe(true);
    expect(placesWritable([place('a', 'A', 'x'), { ...place('b', 'B', 'y'), later: true }])).toBe(true);
    expect(placesWritable({ list: [] })).toBe(false);
    expect(placesWritable([place('a', 'A', 'x'), { id: 'b', name: 'B', where: { kind: 'file' } }])).toBe(false);
    expect(placesWritable([place('a', 'A', 'x'), place('a', 'B', 'y')])).toBe(false);
    expect(placesWritable(null)).toBe(false);
  });
});

describe('the engine: add, change, reorder and remove a place — each one edit of the routine (its Undo)', () => {
  const base = () => world(seq('r', 'Product design', [step('a', 'Sketch')], { future: { kept: true } }));

  it('add: tidied name and where, at the end, with an id of its own; every other field stays', () => {
    const d = base();
    const one = editRoutine(d, 'r', { kind: 'addPlace', name: '  Product   design ', where: ' https://www.notion.so/x ' }, { now: 'now', id: () => 'p1' });
    expect(one.ok).toBe(true);
    expect(one.data.routines.r).toEqual({ ...d.routines.r, places: [place('p1', 'Product design', 'https://www.notion.so/x')] });
    const two = editRoutine(one.data, 'r', { kind: 'addPlace', name: 'Sketchbook', where: 'left shelf, the grey one' }, { now: 'now', id: () => 'p2' });
    expect(placesOf(two.data.routines.r.places).map((p) => p.name)).toEqual(['Product design', 'Sketchbook']);
    // Unsafe words are kept as words (they open nothing; they are the person's).
    const three = editRoutine(two.data, 'r', { kind: 'addPlace', name: 'Trap', where: 'javascript:alert(1)' }, { now: 'now', id: () => 'p3' });
    expect(placesOf(three.data.routines.r.places)[2]).toEqual(place('p3', 'Trap', 'javascript:alert(1)'));
  });

  it('add is refused without a name or a where; on an unnamed sequence; on a routine that is not there', () => {
    const d = base();
    expect(editRoutine(d, 'r', { kind: 'addPlace', name: ' ', where: 'x' }, env())).toMatchObject({ ok: false, reason: 'empty' });
    expect(editRoutine(d, 'r', { kind: 'addPlace', name: 'A', where: '  ' }, env())).toMatchObject({ ok: false, reason: 'empty' });
    const unnamed = world(seq('u', 'Sketch', [step('a')], { named: false }));
    expect(editRoutine(unnamed, 'u', { kind: 'addPlace', name: 'A', where: 'x' }, env())).toMatchObject({ ok: false, reason: 'cannot' });
    expect(editRoutine(d, 'gone', { kind: 'addPlace', name: 'A', where: 'x' }, env()).ok).toBe(false);
  });

  it('change: name and where, the same id, and a field this version does not know on the place kept', () => {
    const d = world(seq('r', 'R', [step('a')], { places: [{ ...place('p1', 'Doc', 'https://a.com'), later: { pinned: true } }, place('p2', 'Shelf', 'left')] }));
    const r = editRoutine(d, 'r', { kind: 'changePlace', place: 'p1', name: 'Design doc', where: 'https://b.com' }, env());
    expect(r.ok).toBe(true);
    expect(r.data.routines.r.places).toEqual([{ id: 'p1', name: 'Design doc', where: 'https://b.com', later: { pinned: true } }, place('p2', 'Shelf', 'left')]);
    // The same again writes nothing.
    expect(editRoutine(r.data, 'r', { kind: 'changePlace', place: 'p1', name: 'Design doc', where: 'https://b.com' }, env()).data).toBe(r.data);
    expect(editRoutine(d, 'r', { kind: 'changePlace', place: 'nope', name: 'A', where: 'b' }, env())).toMatchObject({ ok: false, reason: 'gone' });
    expect(editRoutine(d, 'r', { kind: 'changePlace', place: 'p1', name: '', where: 'b' }, env())).toMatchObject({ ok: false, reason: 'empty' });
  });

  it('reorder: one press moves one place one row; none past the ends', () => {
    const d = world(seq('r', 'R', [step('a')], { places: [place('p1', 'A', 'a'), place('p2', 'B', 'b'), place('p3', 'C', 'c')] }));
    const down = editRoutine(d, 'r', { kind: 'movePlace', place: 'p1', by: 1 }, env());
    expect(placesOf(down.data.routines.r.places).map((p) => p.id)).toEqual(['p2', 'p1', 'p3']);
    const up = editRoutine(down.data, 'r', { kind: 'movePlace', place: 'p3', by: -1 }, env());
    expect(placesOf(up.data.routines.r.places).map((p) => p.id)).toEqual(['p2', 'p3', 'p1']);
    expect(editRoutine(d, 'r', { kind: 'movePlace', place: 'p1', by: -1 }, env())).toMatchObject({ ok: false, reason: 'cannot' });
    expect(editRoutine(d, 'r', { kind: 'movePlace', place: 'p3', by: 1 }, env())).toMatchObject({ ok: false, reason: 'cannot' });
  });

  it('remove: the place goes; the last one takes the field away (a routine with none is as before)', () => {
    const d = base();
    const one = editRoutine(d, 'r', { kind: 'addPlace', name: 'A', where: 'a' }, { now: 'now', id: () => 'p1' });
    const none = editRoutine(one.data, 'r', { kind: 'removePlace', place: 'p1' }, env());
    expect(none.ok).toBe(true);
    expect(none.data.routines.r).toEqual(d.routines.r);
    expect('places' in none.data.routines.r).toBe(false);
    expect(editRoutine(d, 'r', { kind: 'removePlace', place: 'p1' }, env())).toMatchObject({ ok: false, reason: 'gone' });
  });

  it('a field in a shape this version does not know is never overwritten: every place edit is refused and it stays as it was', () => {
    const later = { kind: 'v2', list: [{ name: 'Doc', url: 'https://a.com' }] };
    const d = world(seq('r', 'R', [step('a')], { places: later }));
    for (const edit of [
      { kind: 'addPlace', name: 'A', where: 'a' },
      { kind: 'changePlace', place: 'p1', name: 'A', where: 'a' },
      { kind: 'movePlace', place: 'p1', by: 1 },
      { kind: 'removePlace', place: 'p1' },
    ] as const) {
      const r = editRoutine(d, 'r', edit, env());
      expect(r).toMatchObject({ ok: false, reason: 'cannot' });
      expect(r.data.routines.r.places).toBe(later);
    }
    // And it reads as none (nothing in it is shown, nothing opens).
    expect(placesOf(later)).toEqual([]);
  });

  it('every other edit leaves places as they were; Copy copies them (B-18 "Data and risk")', () => {
    const d = world(seq('r', 'R', [step('a')], { places: [place('p1', 'Doc', 'https://a.com')] }));
    const renamed = editRoutine(d, 'r', { kind: 'rename', words: 'Renamed' }, env());
    expect(renamed.data.routines.r.places).toEqual([place('p1', 'Doc', 'https://a.com')]);
    const copied = editRoutine(d, 'r', { kind: 'copy', words: 'R (copy)' }, env());
    expect(copied.data.routines[copied.routineId!].places).toEqual([place('p1', 'Doc', 'https://a.com')]);
  });

  it('what each edit is called (the routine’s menu says "Undo <it>")', () => {
    const d = world(seq('r', 'R', [step('a')], { places: [place('p1', 'Product design', 'https://a.com')] }));
    const e = (edit: Parameters<typeof editRoutine>[2]) => whatChanged(d, { kind: 'editRoutine', routineId: 'r', edit });
    expect(e({ kind: 'addPlace', name: ' Sketchbook ', where: 'shelf' })).toBe('Added “Sketchbook”');
    expect(e({ kind: 'changePlace', place: 'p1', name: 'Design', where: 'x' })).toBe('Changed “Product design”');
    expect(e({ kind: 'movePlace', place: 'p1', by: 1 })).toBe('Moved “Product design”');
    expect(e({ kind: 'removePlace', place: 'p1' })).toBe('Removed “Product design”');
  });
});

describe('the runner’s pull-up panel: the places, and an "Open <host>" row per typed address — nothing on its face', () => {
  it('a routine with none, and no address typed: nothing new', () => {
    const { d, id } = start(world(seq('r', 'R', [step('a', 'Sketch'), step('b')])), 'r');
    const p = panelView(d, id)!;
    expect('places' in p || 'addresses' in p).toBe(false);
  });

  it('the routine’s places, in its order, each opening only when it is http(s)', () => {
    const r = seq('r', 'Drawing', [step('a', 'Sketch'), step('b')], { places: [place('p1', 'Product design', 'https://www.notion.so/x'), place('p2', 'Sketchbook', 'left shelf'), place('p3', 'Trap', 'JaVaScRiPt:alert(1)')] });
    const { d, id } = start(world(r), 'r');
    const p = panelView(d, id)!;
    expect(p.places).toEqual([
      {
        routine: 'Drawing',
        places: [
          { ...place('p1', 'Product design', 'https://www.notion.so/x'), href: 'https://www.notion.so/x', host: 'notion.so' },
          place('p2', 'Sketchbook', 'left shelf'),
          place('p3', 'Trap', 'JaVaScRiPt:alert(1)'),
        ],
      },
    ]);
  });

  it('inside a routine used as a step: the places of the routine the run began in, then those of the routine you are in', () => {
    const inner = seq('i', 'Research', [step('x', 'Look into it')], { places: [place('q1', 'Notes', 'https://docs.google.com/d/1')] });
    const outer = seq('o', 'Improve', [ref('c', 'i'), step('b')], { places: [place('p1', 'Board', 'https://trello.com/b/1')] });
    let { d, id } = start(world(inner, outer), 'o');
    d = ok(d, { kind: 'stepIn', runId: id }).data;
    expect(panelView(d, id)!.places!.map((g) => [g.routine, g.places.map((p) => p.name)])).toEqual([
      ['Improve', ['Board']],
      ['Research', ['Notes']],
    ]);
    // A called routine with none adds nothing; a step broken down (unnamed) is the routine it is in.
    const bare = seq('i', 'Research', [step('x', 'Look into it')]);
    ({ d, id } = start(world(bare, outer), 'o'));
    d = ok(d, { kind: 'stepIn', runId: id }).data;
    expect(panelView(d, id)!.places!.map((g) => g.routine)).toEqual(['Improve']);
  });

  it('"Open <host>" for an address in the step’s words, a value in play and the pause note — each once; other schemes none', () => {
    const r = seq('r', 'Design', [step('a', 'Pick the page', 'page'), step('b', 'Work in {page}, see https://x.com/brief.'), step('c', 'Never open javascript:alert(1)')]);
    let { d, id } = start(world(r), 'r');
    d = ok(d, { kind: 'value', runId: id, name: 'page', text: 'https://www.notion.so/team/P-1', item: 'a' }).data;
    d = ok(d, { kind: 'next', runId: id }).data;
    d = ok(d, { kind: 'pause', runId: id, reason: 'left off at https://www.figma.com/file/X and https://x.com/brief' }).data;
    d = ok(d, { kind: 'resume', runId: id }).data;
    expect(panelView(d, id)!.addresses).toEqual([
      { href: 'https://x.com/brief', host: 'x.com' },
      { href: 'https://www.notion.so/team/P-1', host: 'notion.so' },
      { href: 'https://www.figma.com/file/X', host: 'figma.com' },
    ]);
    d = ok(d, { kind: 'next', runId: id }).data;
    // The note went with the first move; the value is still in play; the step's words hold no http(s) address.
    expect(panelView(d, id)!.addresses).toEqual([{ href: 'https://www.notion.so/team/P-1', host: 'notion.so' }]);
  });
});

describe('the import preview counts places (counts appear only there)', () => {
  it('"N routines with M places"; a backup with none reads as before', () => {
    const withPlaces = world(seq('r', 'R', [], { places: [place('p1', 'A', 'a'), place('p2', 'B', 'https://b.com')] }), seq('s', 'S', [], { places: [place('p3', 'C', 'c')] }));
    expect(importHolds(planImport(emptyData(), withPlaces))).toBe('This backup has 2 routines with 3 places.');
    const one = world(seq('r', 'R', [], { places: [place('p1', 'A', 'a')] }));
    expect(importHolds(planImport(emptyData(), one))).toBe('This backup has 1 routine with 1 place.');
    expect(importHolds(planImport(emptyData(), world(seq('r', 'R', []))))).toBe('This backup has 1 routine.');
    expect(planImport(withPlaces, one).places).toEqual({ here: 3, incoming: 1 });
  });
});
