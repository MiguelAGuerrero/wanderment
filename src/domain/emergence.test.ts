import { describe, expect, it } from 'vitest';

import { attachMany, candidatesForThread, groupByValue, valueHeader, valueThreads } from './emergence';
import { ensureThread, logActivity } from './model';
import { rememberSearch, search } from './search';
import { Data, emptyData, Id } from './types';

const NOW = new Date(Date.UTC(2026, 10, 20, 12));
const day = (n: number) => new Date(NOW.getTime() - n * 864e5);

function threads(...names: string[]) {
  let data: Data = emptyData();
  const ids: Record<string, Id> = {};
  for (const n of names) {
    const r = ensureThread(data, n, day(200));
    data = r.data;
    ids[n] = r.thread.id;
  }
  return { data, ids };
}

function link(data: Data, doingId: Id | undefined, toId: Id, daysAgo: number, text = 'x') {
  return logActivity(data, { text, doingId, toIds: [toId], occurredAt: day(daysAgo) }, day(daysAgo)).data;
}

describe('pulling past activities into a new thread', () => {
  it('finds activities sharing a meaningful word, most recent first, skipping ones already in it', () => {
    let { data, ids } = threads('practice drawing');
    data = logActivity(data, { text: 'sketched gestures for drawing', occurredAt: day(5) }, day(5)).data;
    data = logActivity(data, { text: 'drew hands, practiced shading', occurredAt: day(2) }, day(2)).data;
    data = logActivity(data, { text: 'went to the gym', occurredAt: day(1) }, day(1)).data;
    data = logActivity(data, { text: 'drawing in the park', doingId: ids['practice drawing'], occurredAt: day(1) }, day(1)).data;
    const found = candidatesForThread(data, 'practice drawing', ids['practice drawing']);
    expect(found.map((a) => a.text)).toEqual(['drew hands, practiced shading', 'sketched gestures for drawing']);
    expect(candidatesForThread(data, 'go to it')).toEqual([]);
  });

  it('attaches many at once: as doing when free, else as a "to"', () => {
    let { data, ids } = threads('practice drawing', 'make apparel');
    const free = logActivity(data, { text: 'drawing a' });
    const busy = logActivity(free.data, { text: 'drawing b', doingId: ids['make apparel'] });
    data = attachMany(busy.data, [free.activity.id, busy.activity.id, 'missing'], ids['practice drawing']);
    expect(data.activities[free.activity.id]).toMatchObject({ doingId: ids['practice drawing'], toIds: [] });
    expect(data.activities[busy.activity.id]).toMatchObject({ doingId: ids['make apparel'], toIds: [ids['practice drawing']] });
    expect(attachMany(data, [free.activity.id], 'nope')).toBe(data);
  });
});

describe('value threads', () => {
  it('needs a net inflow of 3 and a 60% incoming share', () => {
    let { data, ids } = threads('draw', 'make apparel');
    data = link(data, ids.draw, ids['make apparel'], 10);
    data = link(data, ids.draw, ids['make apparel'], 9);
    expect(valueThreads(data, NOW).size).toBe(0);
    data = link(data, ids.draw, ids['make apparel'], 8);
    expect([...valueThreads(data, NOW)]).toEqual([ids['make apparel']]);
  });

  it('a cycle with equal flow both ways makes neither a value; a lopsided one makes one', () => {
    let { data, ids } = threads('a', 'b');
    // Interleaved, as a real back-and-forth would be.
    for (let i = 0; i < 4; i++) {
      data = link(data, ids.a, ids.b, 20 - 2 * i);
      data = link(data, ids.b, ids.a, 19 - 2 * i);
    }
    expect(valueThreads(data, NOW).size).toBe(0);
    for (let i = 0; i < 6; i++) data = link(data, ids.a, ids.b, 5 - i * 0.5);
    expect([...valueThreads(data, NOW)]).toEqual([ids.b]);
  });

  it('has hysteresis: one log the other way doesn’t flip it, but a sustained change does', () => {
    let { data, ids } = threads('draw', 'music', 'make apparel');
    for (let i = 0; i < 5; i++) data = link(data, ids.draw, ids['make apparel'], 30 - i);
    expect(valueThreads(data, NOW).has(ids['make apparel'])).toBe(true);
    // make apparel now sends some links out: share 5/8 = 62% — would still enter, stays.
    for (let i = 0; i < 3; i++) data = link(data, ids['make apparel'], ids.music, 20 - i);
    expect(valueThreads(data, NOW).has(ids['make apparel'])).toBe(true);
    // 5 in / 6 out = 45%: below the 60% needed to become a value, but above 40%, so it stays.
    for (let i = 0; i < 3; i++) data = link(data, ids['make apparel'], ids.music, 15 - i);
    expect(valueThreads(data, NOW).has(ids['make apparel'])).toBe(true);
    // 5 in / 8 out = 38%: below 40%, it stops being a value.
    for (let i = 0; i < 2; i++) data = link(data, ids['make apparel'], ids.music, 10 - i);
    expect(valueThreads(data, NOW).has(ids['make apparel'])).toBe(false);
  });

  it('plain "@thread" logs (no doing thread) link nothing and never make a value', () => {
    let { data, ids } = threads('play guitar');
    for (let i = 0; i < 6; i++) data = link(data, undefined, ids['play guitar'], 10 - i);
    expect(valueThreads(data, NOW).size).toBe(0);
  });

  it('only counts the last 90 days', () => {
    let { data, ids } = threads('draw', 'make apparel');
    for (let i = 0; i < 4; i++) data = link(data, ids.draw, ids['make apparel'], 120 - i);
    expect(valueThreads(data, day(110)).has(ids['make apparel'])).toBe(true);
    expect(valueThreads(data, NOW).size).toBe(0);
  });

  it('groups threads under the value they most often flow to, and labels headers', () => {
    let { data, ids } = threads('draw', 'sew', 'run', 'make apparel');
    for (let i = 0; i < 3; i++) data = link(data, ids.draw, ids['make apparel'], 10 - i);
    data = link(data, ids.sew, ids['make apparel'], 3);
    const order = [ids.run, ids['make apparel'], ids.sew, ids.draw];
    const { groups, rest } = groupByValue(data, order, NOW);
    expect(groups.map((g) => [valueHeader(g.value), g.members])).toEqual([['TO MAKE APPAREL', [ids.sew, ids.draw]]]);
    expect(rest).toEqual([ids.run]);
    // Without any value, everything stays in one plain list.
    expect(groupByValue(threads('x').data, ['a'], NOW)).toEqual({ groups: [], rest: ['a'] });
  });
});

describe('search', () => {
  it('finds activity text, notes and next steps, grouped by thread', () => {
    let { data, ids } = threads('play guitar');
    data = logActivity(data, { text: 'practiced scales', toIds: [ids['play guitar']], occurredAt: day(3) }, day(3)).data;
    data = logActivity(data, { text: 'jam night', note: 'Played SCALES badly', occurredAt: day(1) }, day(1)).data;
    data = { ...data, threads: { ...data.threads, [ids['play guitar']]: { ...data.threads[ids['play guitar']], next: 'faster scales' } } };
    const groups = search(data, 'scales');
    expect(groups.map((g) => [g.title, g.hits.map((h) => `${h.kind}:${h.text}`)])).toEqual([
      ['play guitar', ['next:faster scales', 'activity:practiced scales']],
      ['No wander', ['note:Played SCALES badly']],
    ]);
    expect(search(data, 'scales practiced')[0].hits.map((h) => h.text)).toEqual(['practiced scales']);
    expect(search(data, '   ')).toEqual([]);
  });

  it('remembers recent searches without duplicates', () => {
    expect(rememberSearch(['guitar', 'run'], 'Run')).toEqual(['Run', 'guitar']);
    expect(rememberSearch(['a', 'b', 'c', 'd', 'e', 'f'], 'g')).toEqual(['g', 'a', 'b', 'c', 'd', 'e']);
    expect(rememberSearch(['a'], '  ')).toEqual(['a']);
  });
});
