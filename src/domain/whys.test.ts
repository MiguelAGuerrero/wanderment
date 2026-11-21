/** P-14: a thread marked as what it's for (a declared "why", D-4). */
import { describe, expect, it } from 'vitest';

import { fromBackup, toBackup } from './backup';
import { applyUndo, undoEntry } from './diff';
import { migrateData, parseLegacyState, toLegacyState, defaultSettings } from './migrate';
import { declaredWhys, declareThread, ensureThread, MAX_WHYS, renameThread, swapWhy, undeclareThread, updateThread } from './model';
import { Data, emptyData, Id } from './types';

const at = (n: number) => new Date(Date.UTC(2026, 10, 1, 10, n));

/** Threads named `names`, none declared. */
function world(...names: string[]) {
  let data: Data = emptyData();
  const ids: Record<string, Id> = {};
  for (const name of names) {
    const r = ensureThread(data, name, at(0));
    data = r.data;
    ids[name] = r.thread.id;
  }
  return { data, ids };
}

/** Declares each name in order, a minute apart. */
function declareAll(data: Data, ids: Record<string, Id>, names: string[]) {
  names.forEach((name, i) => {
    const r = declareThread(data, ids[name], at(i + 1));
    if (!r.ok) throw new Error(`couldn't declare ${name}`);
    data = r.data;
  });
  return data;
}

describe('declaring what it’s for', () => {
  it('marks the thread with an ISO time; a second declare keeps the first time and the same data', () => {
    const { data, ids } = world('practice drawing');
    const r = declareThread(data, ids['practice drawing'], at(5));
    expect(r.ok).toBe(true);
    const once = (r as { data: Data }).data;
    expect(once.threads[ids['practice drawing']].declaredAt).toBe('2026-11-01T10:05:00.000Z');
    const again = declareThread(once, ids['practice drawing'], at(9));
    expect(again).toEqual({ ok: true, data: once });
    expect((again as { data: Data }).data).toBe(once);
  });

  it('a thread with no activities can be declared (a why can come first)', () => {
    const { data, ids } = world('make apparel');
    expect(Object.keys(data.activities)).toHaveLength(0);
    expect(declareThread(data, ids['make apparel']).ok).toBe(true);
  });

  it('refuses a hidden thread, data untouched', () => {
    const { data, ids } = world('sell prints');
    const hidden = updateThread(data, ids['sell prints'], { hidden: true });
    expect(declareThread(hidden, ids['sell prints'])).toEqual({ ok: false, reason: 'hidden' });
    expect(hidden.threads[ids['sell prints']].declaredAt).toBeUndefined();
  });

  it(`at most ${MAX_WHYS}: a 4th is refused with the 3 listed (oldest first) and the data untouched`, () => {
    expect(MAX_WHYS).toBe(3);
    const { data, ids } = world('a', 'b', 'c', 'd');
    const three = declareAll(data, ids, ['b', 'c', 'a']);
    const r = declareThread(three, ids.d, at(30));
    expect(r.ok).toBe(false);
    if (r.ok || r.reason !== 'full') throw new Error('expected full');
    expect(r.declared.map((t) => t.name)).toEqual(['b', 'c', 'a']);
    expect(three.threads[ids.d].declaredAt).toBeUndefined();
    // An already-declared thread is still a no-op when full, not a refusal.
    expect(declareThread(three, ids.a)).toEqual({ ok: true, data: three });
  });

  it('a rename keeps the mark', () => {
    const { data, ids } = world('draw');
    const declared = declareAll(data, ids, ['draw']);
    const renamed = renameThread(declared, ids.draw, 'practice drawing');
    if (!renamed.ok) throw new Error('rename refused');
    expect(renamed.data.threads[ids.draw]).toMatchObject({ name: 'practice drawing', declaredAt: '2026-11-01T10:01:00.000Z' });
    expect(updateThread(declared, ids.draw, { next: 'gesture study' }).threads[ids.draw].declaredAt).toBe('2026-11-01T10:01:00.000Z');
  });
});

describe('undeclaring', () => {
  it('leaves nothing behind but the thread, and is idempotent', () => {
    const { data, ids } = world('draw');
    const declared = declareAll(data, ids, ['draw']);
    const off = undeclareThread(declared, ids.draw);
    expect(off.threads[ids.draw]).toEqual(data.threads[ids.draw]);
    expect('declaredAt' in off.threads[ids.draw]).toBe(false);
    expect(undeclareThread(off, ids.draw)).toBe(off);
  });

  it('hiding a declared thread unmarks it in the same change', () => {
    const { data, ids } = world('draw', 'run');
    const declared = declareAll(data, ids, ['draw']);
    const hidden = updateThread(declared, ids.draw, { hidden: true });
    expect(hidden.threads[ids.draw]).toMatchObject({ hidden: true });
    expect(hidden.threads[ids.draw].declaredAt).toBeUndefined();
    // Unhiding doesn't bring the mark back by itself; Undo of the hide does (below).
    expect(updateThread(hidden, ids.draw, { hidden: false }).threads[ids.draw].declaredAt).toBeUndefined();
  });
});

describe('swapping a why', () => {
  it('is one change: the old one off, the new one on; one Undo reverts both', () => {
    const { data, ids } = world('a', 'b', 'c', 'd');
    const three = declareAll(data, ids, ['a', 'b', 'c']);
    const swapped = swapWhy(three, ids.b, ids.d, at(40));
    expect(swapped.threads[ids.b].declaredAt).toBeUndefined();
    expect(swapped.threads[ids.d].declaredAt).toBe('2026-11-01T10:40:00.000Z');
    expect(declaredWhys(swapped).map((t) => t.name)).toEqual(['a', 'c', 'd']);
    const undone = applyUndo(swapped, undoEntry(three, swapped));
    expect(undone).toEqual(three);
    expect(undone.threads[ids.b].declaredAt).toBe('2026-11-01T10:02:00.000Z');
  });

  it('does nothing for a stale choice (the old one isn’t declared, or the new one is hidden or already declared)', () => {
    const { data, ids } = world('a', 'b', 'c', 'd');
    const three = declareAll(data, ids, ['a', 'b', 'c']);
    expect(swapWhy(three, ids.d, ids.a)).toBe(three);
    expect(swapWhy(three, ids.a, ids.b)).toBe(three);
    const hidden = updateThread(three, ids.d, { hidden: true });
    expect(swapWhy(hidden, ids.a, ids.d)).toBe(hidden);
  });

  it('works when an import left more than the cap, without growing the set', () => {
    const { data, ids } = world('a', 'b', 'c', 'd', 'e', 'f');
    const five = migrateData({
      ...data,
      threads: Object.fromEntries(Object.values(data.threads).map((t, i) => [t.id, i < 5 ? { ...t, declaredAt: at(i + 1).toISOString() } : t])),
    });
    expect(declaredWhys(five)).toHaveLength(5);
    expect(declareThread(five, ids.f)).toMatchObject({ ok: false, reason: 'full' });
    const swapped = swapWhy(five, ids.a, ids.f, at(50));
    expect(declaredWhys(swapped).map((t) => t.name)).toEqual(['b', 'c', 'd', 'e', 'f']);
  });
});

describe('undo', () => {
  it('of a declare leaves the mark absent', () => {
    const { data, ids } = world('draw');
    const declared = declareAll(data, ids, ['draw']);
    const undone = applyUndo(declared, undoEntry(data, declared));
    expect(undone.threads[ids.draw]).toEqual(data.threads[ids.draw]);
    expect(undone.threads[ids.draw].declaredAt).toBeUndefined();
  });

  it('of an undeclare restores the exact ISO string', () => {
    const { data, ids } = world('draw');
    const declared = declareAll(data, ids, ['draw']);
    const off = undeclareThread(declared, ids.draw);
    expect(applyUndo(off, undoEntry(declared, off)).threads[ids.draw].declaredAt).toBe('2026-11-01T10:01:00.000Z');
  });

  it('of hiding a declared thread restores both', () => {
    const { data, ids } = world('draw');
    const declared = declareAll(data, ids, ['draw']);
    const hidden = updateThread(declared, ids.draw, { hidden: true });
    expect(applyUndo(hidden, undoEntry(declared, hidden)).threads[ids.draw]).toEqual(declared.threads[ids.draw]);
  });

  it('of a declare keeps a rename made afterwards', () => {
    const { data, ids } = world('draw');
    const declared = declareAll(data, ids, ['draw']);
    const renamed = updateThread(declared, ids.draw, { name: 'practice drawing' });
    expect(applyUndo(renamed, undoEntry(data, declared)).threads[ids.draw]).toEqual({ ...data.threads[ids.draw], name: 'practice drawing' });
  });
});

describe('declaredWhys', () => {
  it('lists declared, visible threads, oldest mark first, id breaking ties', () => {
    const { data, ids } = world('a', 'b', 'c', 'd');
    let d = declareAll(data, ids, ['c', 'a']);
    const r = declareThread(d, ids.b, at(1)); // same time as c
    if (!r.ok) throw new Error('declare refused');
    d = r.data;
    const tied = [ids.c, ids.b].sort().map((id) => d.threads[id].name);
    expect(declaredWhys(d).map((t) => t.name)).toEqual([...tied, 'a']);
    // Hidden threads aren't listed, even with a mark (e.g. from a hand-edited backup).
    const sneaky = { ...d, threads: { ...d.threads, [ids.a]: { ...d.threads[ids.a], hidden: true } } };
    expect(declaredWhys(sneaky).map((t) => t.name)).toEqual(tied);
    expect(declaredWhys(data)).toEqual([]);
  });
});

describe('backups and saved data', () => {
  it('round-trip with and without the mark; the format version stays 1', () => {
    const { data, ids } = world('draw', 'run');
    const declared = declareAll(data, ids, ['draw']);
    const json = toBackup(declared);
    expect(JSON.parse(json).data.version).toBe(1);
    expect(JSON.parse(json).data.threads[ids.draw].declaredAt).toBe('2026-11-01T10:01:00.000Z');
    const back = fromBackup(json);
    expect(back).toEqual(declared);
    expect(back.version).toBe(1);
    expect(back.threads[ids.draw].declaredAt).toBe('2026-11-01T10:01:00.000Z');
    expect(back.threads[ids.run].declaredAt).toBeUndefined();
    // A backup from before P-14 (no field anywhere) reads unchanged.
    const old = fromBackup(toBackup(data));
    expect(old).toEqual(data);
    expect(Object.values(old.threads).every((t) => t.declaredAt === undefined)).toBe(true);
  });

  it('a junk mark (number, bad date, null, empty) reads as not declared, without rejecting the file', () => {
    const t = (declaredAt: unknown) => ({ id: 't', name: 'draw', hidden: false, createdAt: at(0).toISOString(), declaredAt });
    for (const junk of [42, 'not a date', null, '', {}, true]) {
      const d = migrateData({ version: 1, threads: { t: t(junk) }, activities: {} });
      expect(d.threads.t.declaredAt).toBeUndefined();
    }
    // A valid one in another zone is stored as UTC, like every other date.
    expect(migrateData({ version: 1, threads: { t: t('2026-11-01T12:00:00+02:00') }, activities: {} }).threads.t.declaredAt).toBe(
      '2026-11-01T10:00:00.000Z',
    );
  });

  it('a backup with 5 declared keeps all 5 (never truncated)', () => {
    const threads = Object.fromEntries(
      ['a', 'b', 'c', 'd', 'e'].map((n, i) => [n, { id: n, name: n, hidden: false, createdAt: at(0).toISOString(), declaredAt: at(i + 1).toISOString() }]),
    );
    const back = fromBackup(JSON.stringify({ app: 'wanderment', exportedAt: at(9).toISOString(), data: { version: 1, threads, activities: {} } }));
    expect(declaredWhys(back).map((t) => t.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('the localStorage format (fallback and the first release’s blob) keeps the mark', () => {
    const { data, ids } = world('draw');
    const declared = declareAll(data, ids, ['draw']);
    expect(parseLegacyState(toLegacyState(declared, defaultSettings()))!.data).toEqual(declared);
    expect(parseLegacyState(toLegacyState(declared, defaultSettings()))!.data.threads[ids.draw].declaredAt).toBe('2026-11-01T10:01:00.000Z');
  });
});

describe('imports keep the rules (audit of P-14)', () => {
  const backupWith = (thread: Record<string, unknown>) =>
    JSON.stringify({ app: 'wanderment', version: 1, data: { version: 1, threads: { t1: { id: 't1', name: 'draw', createdAt: '2026-01-01T00:00:00.000Z', ...thread } }, activities: {} } });

  it('a hidden thread is never imported as a why (F1)', () => {
    const data = fromBackup(backupWith({ hidden: true, declaredAt: '2026-02-01T00:00:00.000Z' }));
    expect(data.threads.t1.hidden).toBe(true);
    expect(data.threads.t1.declaredAt).toBeUndefined();
    expect(declaredWhys(updateThread(data, 't1', { hidden: false }))).toEqual([]);
  });

  it('loose date strings are not marks, only real timestamps are (F8)', () => {
    for (const loose of ['1', '0', '12/25', 'March 7', '2026']) {
      expect(fromBackup(backupWith({ declaredAt: loose })).threads.t1.declaredAt, loose).toBeUndefined();
    }
    expect(fromBackup(backupWith({ declaredAt: '2026-02-01T09:30:00+02:00' })).threads.t1.declaredAt).toBe('2026-02-01T07:30:00.000Z');
  });
});
