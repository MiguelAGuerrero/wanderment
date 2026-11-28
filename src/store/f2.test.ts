/**
 * F-2 through the store (audit F3): a copy from the library that calls the person's own routine of a name says so — Copy,
 * and Copy and add from Plan (otherwise quiet: B-17 "no notice is needed afterwards").
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { Data, emptyData } from '@/domain/types';

import { useStore } from './useStore';

const st = () => useStore.getState();
const at = '2026-11-01T00:00:00.000Z';
const seeded = (own: boolean): Data => ({
  ...emptyData(),
  routines: Object.fromEntries([
    ['S', { id: 'S', words: 'Study', named: true, createdAt: at, home: true, items: [{ id: 's1', text: 'Read' }] }],
    ...(own ? [['O', { id: 'O', words: 'Check and mend', named: true, createdAt: at, home: true, items: [{ id: 'o1', text: 'Wash the car' }] }]] : []),
  ]),
});
const reset = (own: boolean) => useStore.setState({ data: seeded(own), undo: undefined, toast: undefined, runNotice: undefined, toVerb: undefined, storage: { state: 'ready', kind: 'sqlite' } });

beforeEach(() => reset(true));

describe('F3: Copy and Copy and add say when they use your routine of that name', () => {
  it('Copy: the notice names it', () => {
    expect(st().copyFromLibrary('lib-recall').ok).toBe(true);
    expect(st().runNotice?.text).toBe('Copied “Recall before you look”, which uses your “Check and mend”');
    expect(st().runNotice?.quiet).toBeUndefined();
  });

  it('Copy and add: a notice is shown (not quiet), naming it, with the one Undo', () => {
    expect(st().copyAndAdd('lib-recall', 'S').ok).toBe(true);
    expect(st().runNotice?.text).toBe('Added “Recall before you look” from the library, which uses your “Check and mend”');
    expect(st().runNotice?.quiet).toBeUndefined();
    expect(st().runNotice?.entry).toBe(st().undo);
  });

  it('Copy and add using nothing of yours stays quiet, as before', () => {
    reset(false);
    expect(st().copyAndAdd('lib-recall', 'S').ok).toBe(true);
    expect(st().runNotice?.text).toBe('Added “Recall before you look” from the library');
    expect(st().runNotice?.quiet).toBe(true);
  });
});
