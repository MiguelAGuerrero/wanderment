/** P-61: what Home's log field suggests as you type — staged steps, then past entries, then nodes. */
import { describe, expect, it } from 'vitest';

import { logActivity, updateThread } from './model';
import { pickSuggestion, suggestLogs } from './logSuggest';
import { Data, emptyData, Thread } from './types';

const DAY = 864e5;
const T0 = Date.parse('2026-11-01T12:00:00Z');

function thread(data: Data, name: string, extra: Partial<Thread> = {}): Data {
  const t: Thread = { id: name, name, hidden: false, createdAt: new Date(T0).toISOString(), ...extra };
  return { ...data, threads: { ...data.threads, [name]: t } };
}

function log(data: Data, text: string, daysAgo: number, links: { doingId?: string; toIds?: string[] } = {}): Data {
  return logActivity(data, { text, ...links, occurredAt: new Date(T0 - daysAgo * DAY) }, new Date(T0 - daysAgo * DAY)).data;
}

/** feel productive (a why) with the staged step "Clean my car"; draw; a few past logs. */
function world() {
  let d = emptyData();
  d = thread(d, 'feel productive', { next: 'Clean my car' });
  d = thread(d, 'draw', { next: 'sketch a hand' });
  d = thread(d, 'clean the house');
  d = log(d, 'cleaned the gutters', 3, { toIds: ['feel productive'] });
  d = log(d, 'cleaned the gutters', 1, { toIds: ['clean the house'] });
  d = log(d, 'Clean my car', 9);
  d = log(d, 'cooked dinner', 2);
  return d;
}

const RECENT = ['clean the house', 'feel productive', 'draw'];

describe('suggestLogs', () => {
  it('needs at least two characters', () => {
    expect(suggestLogs(world(), '', RECENT)).toEqual([]);
    expect(suggestLogs(world(), ' c ', RECENT)).toEqual([]);
    expect(suggestLogs(world(), 'cl', RECENT).length).toBeGreaterThan(0);
  });

  it('orders staged steps, then past entries, then nodes, at most four', () => {
    const got = suggestLogs(world(), 'cle', RECENT);
    expect(got).toEqual([
      { kind: 'step', threadId: 'feel productive', text: 'Clean my car', name: 'feel productive' },
      // The most recent "cleaned the gutters" went to clean the house: that's its last target.
      { kind: 'past', text: 'cleaned the gutters', targetId: 'clean the house', targetName: 'clean the house' },
      { kind: 'node', threadId: 'clean the house', name: 'clean the house' },
    ]);
    expect(suggestLogs(world(), 'c', RECENT)).toEqual([]);
    // Four at most, nodes last.
    let d = world();
    for (const w of ['cleared the desk', 'cleaned shoes', 'clever trick']) d = log(d, w, 4);
    const four = suggestLogs(d, 'cle', RECENT);
    expect(four).toHaveLength(4);
    expect(four.map((s) => s.kind)).toEqual(['step', 'past', 'past', 'past']);
  });

  it('matches the start of the line or of any word, ignoring case and spacing', () => {
    expect(suggestLogs(world(), 'MY  CAR', RECENT)).toEqual([{ kind: 'step', threadId: 'feel productive', text: 'Clean my car', name: 'feel productive' }]);
    expect(suggestLogs(world(), 'dinner', RECENT)).toEqual([{ kind: 'past', text: 'cooked dinner' }]);
    // Inside a word doesn't count.
    expect(suggestLogs(world(), 'ooked', RECENT)).toEqual([]);
    expect(suggestLogs(world(), 'productive', RECENT)).toEqual([{ kind: 'node', threadId: 'feel productive', name: 'feel productive' }]);
  });

  it('past entries: most recent first, one per wording, with their last target if any', () => {
    let d = world();
    d = log(d, 'Cooked Dinner ', 0.5, { doingId: 'draw' });
    d = log(d, 'cooked lunch', 0.2);
    const got = suggestLogs(d, 'cooked', RECENT);
    expect(got).toEqual([
      { kind: 'past', text: 'cooked lunch' },
      { kind: 'past', text: 'Cooked Dinner', targetId: 'draw', targetName: 'draw' },
    ]);
  });

  it('a past entry worded like an offered step is the step (no twin)', () => {
    const got = suggestLogs(world(), 'clean my', RECENT);
    expect(got).toEqual([{ kind: 'step', threadId: 'feel productive', text: 'Clean my car', name: 'feel productive' }]);
  });

  it('hidden wanders: no step, no node, and not as a past entry’s target', () => {
    let d = world();
    d = updateThread(d, 'feel productive', { hidden: true });
    d = updateThread(d, 'clean the house', { hidden: true });
    // With its step gone, the old "Clean my car" log is just a past entry.
    expect(suggestLogs(d, 'cle', RECENT)).toEqual([
      { kind: 'past', text: 'cleaned the gutters' },
      { kind: 'past', text: 'Clean my car' },
    ]);
  });

  it('steps and nodes go most recently used first', () => {
    let d = world();
    d = updateThread(d, 'draw', { next: 'clean brushes' });
    expect(suggestLogs(d, 'clean', ['draw', 'feel productive']).slice(0, 2)).toEqual([
      { kind: 'step', threadId: 'draw', text: 'clean brushes', name: 'draw' },
      { kind: 'step', threadId: 'feel productive', text: 'Clean my car', name: 'feel productive' },
    ]);
    d = thread(d, 'drawer');
    expect(suggestLogs(d, 'dra', ['drawer', 'draw']).map((s) => s.kind === 'node' && s.name)).toEqual(['drawer', 'draw']);
  });
});

describe('pickSuggestion', () => {
  const empty = { text: 'cle', toIds: [] as string[] };

  it('a step fills its words, makes its wander the doing one and marks the line as completing it (as ✓ does)', () => {
    const { line, said } = pickSuggestion({ ...empty, toIds: ['draw', 'feel productive'] }, { kind: 'step', threadId: 'feel productive', text: 'Clean my car', name: 'feel productive' });
    expect(line).toEqual({ text: 'Clean my car', doingId: 'feel productive', toIds: ['draw'], fromNextOf: 'feel productive', fromNextText: 'Clean my car' });
    expect(said).toBe('Attached to feel productive. Logging it completes Clean my car');
  });

  it('a past entry fills its words and attaches where it last went (once); without a target it only fills', () => {
    expect(pickSuggestion(empty, { kind: 'past', text: 'cooked dinner', targetId: 'draw', targetName: 'draw' })).toEqual({
      line: { text: 'cooked dinner', toIds: ['draw'] },
      said: 'Attached to draw',
    });
    expect(pickSuggestion({ ...empty, toIds: ['draw'] }, { kind: 'past', text: 'cooked dinner', targetId: 'draw', targetName: 'draw' }).line.toIds).toEqual(['draw']);
    expect(pickSuggestion({ ...empty, doingId: 'draw' }, { kind: 'past', text: 'cooked dinner', targetId: 'draw', targetName: 'draw' }).line.toIds).toEqual([]);
    expect(pickSuggestion(empty, { kind: 'past', text: 'cooked dinner' })).toEqual({ line: { text: 'cooked dinner', toIds: [] }, said: 'Filled in cooked dinner' });
  });

  it('a wander attaches and the words stay as typed', () => {
    expect(pickSuggestion({ text: 'feel', toIds: ['draw'] }, { kind: 'node', threadId: 'feel productive', name: 'feel productive' })).toEqual({
      line: { text: 'feel', toIds: ['draw', 'feel productive'] },
      said: 'Attached to feel productive',
    });
  });

  it('a later pick replaces a step picked before (and the doing it brought), keeping the rest of the line', () => {
    const first = pickSuggestion({ ...empty, toIds: ['sew'] }, { kind: 'step', threadId: 'feel productive', text: 'Clean my car', name: 'feel productive' }).line;
    const { line } = pickSuggestion(first, { kind: 'past', text: 'cooked dinner', targetId: 'draw', targetName: 'draw' });
    expect(line).toEqual({ text: 'cooked dinner', doingId: undefined, toIds: ['sew', 'draw'], fromNextOf: undefined, fromNextText: undefined });
    // A doing the person chose themselves stays.
    const own = pickSuggestion({ ...empty, doingId: 'sew', fromNextOf: 'draw', fromNextText: 'sketch' }, { kind: 'node', threadId: 'draw', name: 'draw' }).line;
    expect(own).toMatchObject({ doingId: 'sew', fromNextOf: undefined, toIds: ['draw'] });
  });
});
