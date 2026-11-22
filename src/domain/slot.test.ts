import { describe, expect, it } from 'vitest';

import { ensureThread, logActivity, updateThread } from './model';
import { restingFace, whatsNextNode } from './slot';
import { Data, emptyData, Id } from './types';

const day = (n: number) => new Date(Date.UTC(2026, 10, 20) - n * 864e5);

function threads(...names: string[]) {
  let data: Data = emptyData();
  const ids: Record<string, Id> = {};
  names.forEach((name, i) => {
    const r = ensureThread(data, name, day(30 - i));
    data = r.data;
    ids[name] = r.thread.id;
  });
  return { data, ids };
}

const log = (data: Data, daysAgo: number, input: { doingId?: Id; toIds?: Id[] }) =>
  logActivity(data, { text: 'x', toIds: [], ...input, occurredAt: day(daysAgo) }, day(daysAgo)).data;

describe('which node the “What’s next” card shows (P-49)', () => {
  it('the selection (P-35) when one is set', () => {
    let { data, ids } = threads('draw', 'sew');
    data = log(data, 1, { doingId: ids.sew });
    expect(whatsNextNode(data, ids.draw)).toBe(ids.draw);
  });

  it('otherwise the wander most recently logged toward, whether as doing or as to', () => {
    let { data, ids } = threads('draw', 'sew', 'make apparel');
    data = log(data, 3, { doingId: ids.draw });
    data = log(data, 1, { toIds: [ids.sew] });
    expect(whatsNextNode(data)).toBe(ids.sew);
    data = log(data, 0, { doingId: ids.draw, toIds: [ids['make apparel']] });
    // The activity's doing wander first (the next belongs to it), else its first "to".
    expect(whatsNextNode(data)).toBe(ids.draw);
  });

  it('by when it happened, not when it was typed (a backdated log isn’t the latest)', () => {
    let { data, ids } = threads('draw', 'sew');
    data = log(data, 1, { doingId: ids.draw });
    data = logActivity(data, { text: 'yesterday, really', doingId: ids.sew, toIds: [], occurredAt: day(5) }, day(0)).data;
    expect(whatsNextNode(data)).toBe(ids.draw);
  });

  it('skips hidden wanders: a hidden doing gives way to the visible “to”, then to earlier logs', () => {
    let { data, ids } = threads('draw', 'sew', 'secret');
    data = log(data, 3, { doingId: ids.draw });
    data = log(data, 1, { doingId: ids.secret, toIds: [ids.sew] });
    data = updateThread(data, ids.secret, { hidden: true });
    expect(whatsNextNode(data)).toBe(ids.sew);
    data = log(data, 0, { doingId: ids.secret });
    data = updateThread(data, ids.secret, { hidden: true });
    expect(whatsNextNode(data)).toBe(ids.sew);
  });

  it('a hidden or unknown selection is passed over', () => {
    let { data, ids } = threads('draw', 'sew');
    data = log(data, 1, { doingId: ids.draw });
    data = updateThread(data, ids.sew, { hidden: true });
    expect(whatsNextNode(data, ids.sew)).toBe(ids.draw);
    expect(whatsNextNode(data, 'gone')).toBe(ids.draw);
  });

  it('with wanders never logged toward, the newest visible one', () => {
    let { data, ids } = threads('draw', 'sew', 'secret');
    data = updateThread(data, ids.secret, { hidden: true });
    expect(whatsNextNode(data)).toBe(ids.sew);
  });

  it('no visible wanders (none, or all hidden): no node', () => {
    expect(whatsNextNode(emptyData())).toBeUndefined();
    let { data, ids } = threads('secret');
    data = log(data, 0, { doingId: ids.secret });
    data = updateThread(data, ids.secret, { hidden: true });
    expect(whatsNextNode(data)).toBeUndefined();
  });
});

describe('the face Home’s slot rests on (P-49)', () => {
  it('What’s next once a visible wander exists; Log while there are none', () => {
    expect(restingFace(emptyData())).toBe('log');
    let { data, ids } = threads('draw');
    expect(restingFace(data)).toBe('next');
    data = updateThread(data, ids.draw, { hidden: true });
    expect(restingFace(data)).toBe('log');
  });
});
