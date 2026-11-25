/**
 * The store's gate and Undo, on what the app does now (P-89: the old app's actions — and their
 * toasts, the bridge and the whys — are gone; these are the same guarantees driven by a run).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { emptyData } from '@/domain/types';
import { person } from '@/test/records';

import { useStore } from './useStore';

const st = () => useStore.getState();
const NOTICE = 'Just a moment — reconnecting.';
const settings = () => ({ showShading: st().showShading, recentSearches: st().recentSearches, leftAsIs: st().leftAsIs, ...(st().whyOfferOff && { whyOfferOff: true as const }), ...(st().firstRunDone && { firstRunDone: true as const }) });
/** A run on its first step with a second to go to; the last action (adding that step) left an Undo. */
function going() {
  const made = st().startNew('Morning');
  if (!made.ok || !made.runId) throw new Error('New: was refused');
  st().addEdgeStep(made.runId, 'Stretch');
  st().editRoutine(st().data.runs[made.runId].routineId, { kind: 'addStep', text: 'Shower' });
  return made.runId;
}

beforeEach(() => {
  useStore.setState({ data: emptyData(), undo: undefined, toast: undefined, runNotice: undefined, runOffer: undefined, toVerb: undefined, toLog: undefined, draft: { text: '', toIds: [] }, storage: { state: 'ready', kind: 'sqlite' } });
});
afterEach(() => useStore.setState({ storage: { state: 'loading' } }));

describe('replacing the data (import)', () => {
  it('takes Undo, the notice, the Keep offer and a kept press away: nothing is left pointing at what’s gone (P-04 audit F13)', () => {
    const runId = going();
    expect(st().undo).toBeDefined();
    expect(st().runNotice).toBeDefined();
    useStore.setState({ toast: { message: NOTICE, notice: true }, runOffer: { runId, changeIds: [] }, toVerb: { runId, verb: 'next', base: st().data.runs[runId] } });
    expect(st().replaceData(emptyData())).toBe(true);
    expect(st().data).toEqual(emptyData());
    expect(st()).toMatchObject({ undo: undefined, toast: undefined, runNotice: undefined, runOffer: undefined, toVerb: undefined });
  });

  it('leaves the five saved settings as they are (a backup holds no settings)', () => {
    useStore.setState({ showShading: false, recentSearches: ['river'], leftAsIs: ['a1'], whyOfferOff: true, firstRunDone: true });
    const before = settings();
    st().replaceData(emptyData());
    expect(settings()).toEqual(before);
    useStore.setState({ showShading: true, recentSearches: [], leftAsIs: [], whyOfferOff: false, firstRunDone: false });
  });
});

describe('taking the data back (refreshData)', () => {
  it('shows the saved data and ALL five saved settings; with nothing changed underneath, Undo and its notice stay', () => {
    going();
    const { undo, runNotice, data } = st();
    const saved = { showShading: false, recentSearches: ['river', 'drawing'], leftAsIs: ['a1'], whyOfferOff: true as const, firstRunDone: true as const };
    expect(st().refreshData(data, saved, true)).toBe(true);
    expect(settings()).toEqual(saved);
    expect(st().undo).toBe(undo);
    expect(st().runNotice).toBe(runNotice);
    useStore.setState({ showShading: true, recentSearches: [], leftAsIs: [], whyOfferOff: false, firstRunDone: false });
  });

  it('when the data changed underneath, Undo, its notice, the Keep offer and a quiet note go', () => {
    const runId = going();
    useStore.setState({ toast: { message: NOTICE, notice: true }, runOffer: { runId, changeIds: [] } });
    st().refreshData(emptyData(), settings(), false);
    expect(st()).toMatchObject({ undo: undefined, toast: undefined, runNotice: undefined, runOffer: undefined });
  });
});

describe('Undo', () => {
  it('takes back a change to old records too (a line removed comes back), and clears the slot', () => {
    const id = person(useStore).log('watered the plants');
    person(useStore).removeActivity(id);
    expect(st().data.activities[id]).toBeUndefined();
    expect(st().undoLast()).toBe(true);
    expect(st().data.activities[id]).toMatchObject({ text: 'watered the plants' });
    expect(st().undo).toBeUndefined();
  });
});

describe('while the page doesn’t hold the data (audit 2 F3, F4)', () => {
  const reconnect = () => useStore.setState({ storage: { state: 'ready', kind: 'sqlite', reconnecting: true } });
  /** Taking the data back with nothing changed underneath (as persistence does). */
  const takeBack = () => {
    useStore.setState({ storage: { state: 'ready', kind: 'sqlite' } });
    expect(st().refreshData(st().data, settings(), true)).toBe(true);
  };

  it('a refusal changes nothing, says why once, and keeps the Undo there is; after taking the data back, that Undo still works (F4)', () => {
    const runId = going();
    const { data, undo, runNotice } = st();
    reconnect();
    expect(st().editRoutine(data.runs[runId].routineId, { kind: 'addStep', text: 'Coffee' })).toEqual({ ok: false, reason: 'reconnecting' });
    expect(st().data).toBe(data);
    expect(st().toast).toEqual({ message: NOTICE, notice: true });
    expect(st().undo).toBe(undo);
    expect(st().runNotice).toBe(runNotice);
    takeBack();
    expect(st().undoLast()).toBe(true);
    // The step added last is gone again.
    expect((st().data.routines[data.runs[runId].routineId].items as unknown[]).length).toBe(1);
  });

  it('pressing Undo itself while reconnecting: refused; the Undo stays, with the note (F4)', () => {
    going();
    const { data, undo } = st();
    reconnect();
    expect(st().undoLast()).toBe(false);
    expect(st().data).toBe(data);
    expect(st().undo).toBe(undo);
    expect(st().toast).toEqual({ message: NOTICE, notice: true });
  });

  it('refused again, the note is the same one (not set again: a screen reader hears it once)', () => {
    reconnect();
    expect(st().startNew('x')).toEqual({ ok: false, reason: 'reconnecting' });
    const note = st().toast;
    expect(note).toEqual({ message: NOTICE, notice: true });
    expect(st().startNew('y').ok).toBe(false);
    expect(st().toast).toBe(note);
  });

  it('blocked (another copy holds the data): refused the same way', () => {
    useStore.setState({ storage: { state: 'blocked', waiting: true, message: 'elsewhere' } });
    const before = st().data;
    expect(st().startNew('x')).toEqual({ ok: false, reason: 'reconnecting' });
    expect(st().replaceData(emptyData())).toBe(false);
    expect(st().data).toBe(before);
  });
});

describe('a Return the old app kept across its reload (logMarked)', () => {
  const draft = { text: ' read a novel ', toIds: [] };

  it('is logged once, as typed (trimmed), when the page holds the data — and not before', () => {
    useStore.setState({ draft, toLog: { draft }, storage: { state: 'ready', kind: 'sqlite', reconnecting: true } });
    st().logMarked();
    expect(st().data.activities).toEqual({});
    expect(st().toLog).toBeDefined();
    useStore.setState({ storage: { state: 'ready', kind: 'sqlite' } });
    st().logMarked();
    st().logMarked();
    expect(Object.values(st().data.activities).map((a) => a.text)).toEqual(['read a novel']);
    expect(st().toLog).toBeUndefined();
    expect(st().draft).toEqual({ text: '', toIds: [] });
  });

  it('keeps its wanders, and is lit or settled as the old Return would have made it', () => {
    const t = person(useStore).createThread('reading');
    const d = { text: 'a chapter', toIds: [t] };
    useStore.setState({ draft: d, toLog: { draft: d, opts: { trail: true } } });
    st().logMarked();
    useStore.setState({ draft: { text: 'tea', toIds: [] }, toLog: { draft: { text: 'tea', toIds: [] }, opts: { trail: true, done: true } } });
    st().logMarked();
    const [chapter, tea] = Object.values(st().data.activities).sort((a, b) => a.text.localeCompare(b.text));
    expect(chapter).toMatchObject({ text: 'a chapter', toIds: [t], lit: true });
    expect(tea.lit).toBeUndefined();
    expect(tea.settledAt).toEqual(expect.any(String));
  });

  it('a kept Return that is not in the old app’s shape (a damaged session key) is dropped: nothing thrown, nothing logged, and never tried again (audit B1)', () => {
    const bad: unknown[] = [{ toIds: 'nope' }, { occurredAt: 'not a date' }, { text: 5 }, { doingId: {} }];
    for (const extra of bad) {
      useStore.setState({ draft, toLog: { draft, extra: extra as never } });
      expect(() => st().logMarked(), JSON.stringify(extra)).not.toThrow();
      expect(st().toLog, JSON.stringify(extra)).toBeUndefined();
      expect(Object.values(st().data.activities).filter((a) => typeof a.text !== 'string' || !Array.isArray(a.toIds) || Number.isNaN(Date.parse(a.occurredAt))), JSON.stringify(extra)).toEqual([]);
    }
    // And a draft that is not one at all.
    useStore.setState({ draft: { text: 7 } as never, toLog: { draft: { text: 7 } as never } });
    expect(() => st().logMarked()).not.toThrow();
    expect(st().toLog).toBeUndefined();
    useStore.setState({ draft: { text: '', toIds: [] } });
  });

  it('a line changed since the Return is not logged', () => {
    useStore.setState({ draft: { text: 'first try, then more', toIds: [] }, toLog: { draft: { text: 'first try', toIds: [] } } });
    st().logMarked();
    expect(st().data.activities).toEqual({});
    expect(st().toLog).toBeUndefined();
  });
});
