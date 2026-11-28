/**
 * P-115: data written by the build BEFORE Edit, then Save or Cancel (`fixtures/golden/p115-*`, see the README there) —
 * routines carrying a draft in the shape P-115 writes, as only an import could make there: "Morning pages" (a draft that
 * moves "Read them back" up and adds "Underline one line"; a run paused on "Write three pages"), "Sunday reset" (a draft
 * that rewords "Clear the inbox", then edited directly by that build — changed elsewhere), "Pack for a trip" (a draft in
 * a later shape) and "Evening pages" (that build's Copy of Morning pages, carrying its draft). The real persistence
 * module, against real SQLite, must load it exactly from every place it can be and write nothing by loading it; every
 * runner, home and Plan read the SAVED routine, as that build showed; and P-115 reads each draft by its rule.
 * `p115-old-build.json` is what that build SHOWED.
 *
 * Expected values are the frozen files, the roadmap's Done when and the owner's notes, never this code's output.
 */
import { copyFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Settings } from '@/domain/migrate';
import type { Data } from '@/domain/types';

const env = vi.hoisted(() => {
  const ls = new Map<string, string>();
  const state = { dbPath: '', openError: undefined as Error | undefined, hangWrites: false };
  const localStorage = {
    get length() {
      return ls.size;
    },
    key: (i: number) => [...ls.keys()][i] ?? null,
    getItem: (k: string) => (ls.has(k) ? ls.get(k)! : null),
    setItem: (k: string, v: string) => void ls.set(k, String(v)),
    removeItem: (k: string) => void ls.delete(k),
  };
  (globalThis as { localStorage?: unknown }).localStorage = localStorage;
  return { ls, state, localStorage };
});

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => env.localStorage.getItem(k),
    setItem: async (k: string, v: string) => env.localStorage.setItem(k, v),
    removeItem: async (k: string) => env.localStorage.removeItem(k),
  },
}));
vi.mock('./expoDb', async () => {
  const { nodeDb } = await import('./nodeDb');
  return {
    openExpoDb: async () => {
      if (env.state.openError) throw env.state.openError;
      const db = nodeDb(env.state.dbPath);
      // "The tab dies mid-write": transactions opened while hangWrites is on never commit.
      return { ...db, transaction: (task: () => Promise<void>) => (env.state.hangWrites ? new Promise<void>(() => {}) : db.transaction(task)) };
    },
  };
});
vi.mock('./nativeBackup', () => ({ scheduleBackup: () => {} }));

const GOLDEN = join(__dirname, 'fixtures/golden');
const fixture = (name: string) => readFileSync(join(GOLDEN, name), 'utf8');
type Snapshot = { data: Data; settings: { [K in keyof Required<Settings>]: unknown } };
/** What the build before P-115 held. */

const BEFORE = JSON.parse(fixture('p115-expected.json')) as Snapshot;

const settle = () => new Promise((r) => setTimeout(r, 30));
const json = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/** A fresh page load: new modules, new store, same storage. */
async function load() {
  vi.resetModules();
  const { startPersistence } = await import('./persistence');
  const { useStore } = await import('@/store/useStore');
  await startPersistence();
  return useStore;
}
type Store = Awaited<ReturnType<typeof load>>;

const shown = (store: Store): Snapshot => {
  const s = store.getState();
  return json({ data: s.data, settings: { showShading: s.showShading, recentSearches: s.recentSearches, leftAsIs: s.leftAsIs, whyOfferOff: s.whyOfferOff, firstRunDone: s.firstRunDone } });
};

/** What's saved, read straight from the database file (as another page would). */
async function onDisk(): Promise<Data> {
  const { nodeDb } = await import('./nodeDb');
  const { loadData } = await import('./repository');
  const db = nodeDb(env.state.dbPath);
  try {
    return json(await loadData(db));
  } finally {
    db.close();
  }
}
const useDatabase = () => copyFileSync(join(GOLDEN, 'p115-schema4.sqlite'), env.state.dbPath);

beforeEach(() => {
  env.ls.clear();
  env.state.openError = undefined;
  env.state.hangWrites = false;
  env.state.dbPath = join(mkdtempSync(join(tmpdir(), 'wanderment-p115-')), 'db.sqlite');
});
afterEach(async () => (await import('./persistence')).stopPersistence());



describe('data written by the build before P-115 loads exactly, wherever it is', () => {
  it('the database: opens and every record reads the same; nothing is rewritten by opening it', async () => {
    useDatabase();
    const before = readFileSync(env.state.dbPath);
    const store = await load();
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'sqlite' });
    expect(shown(store)).toEqual(BEFORE);
    await settle();
    expect(await onDisk()).toEqual(BEFORE.data);
    expect(readFileSync(env.state.dbPath).equals(before)).toBe(true);
  });

  it('the pending journal, over an empty database: replayed, cleared, and everything reads the same', async () => {
    env.ls.set('wanderment:journal', fixture('p115-journal.json'));
    let store = await load();
    expect(shown(store).data).toEqual(BEFORE.data);
    expect(env.ls.has('wanderment:journal')).toBe(false);
    expect(await onDisk()).toEqual(BEFORE.data);
    store = await load();
    expect(shown(store).data).toEqual(BEFORE.data);
  });

  it('the fallback blob: where SQLite can’t run it loads the same; once it can, it is moved in whole', async () => {
    env.state.openError = new Error('no OPFS');
    env.ls.set('wanderment', fixture('p115-fallback.json'));
    let store = await load();
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'local' });
    expect(shown(store).data).toEqual(BEFORE.data);
    (await import('./persistence')).stopPersistence();
    env.state.openError = undefined;
    store = await load();
    expect(store.getState().storage).toEqual({ state: 'ready', kind: 'sqlite' });
    expect(shown(store).data).toEqual(BEFORE.data);
    expect(await onDisk()).toEqual(BEFORE.data);
  });

  it('the backup: previewed, replaced, saved, the same after a reload; and exporting gives the same data back', async () => {
    let store = await load();
    const { previewImport, confirmImport } = await import('@/store/importBackup');
    const preview = previewImport(fixture('p115-backup.json'));
    expect(preview.incoming).toEqual(BEFORE.data);
    expect(confirmImport(preview).ok).toBe(true);
    await settle();
    expect(await onDisk()).toEqual(BEFORE.data);
    store = await load();
    expect(shown(store).data).toEqual(BEFORE.data);
    const { toBackup } = await import('@/domain/backup');
    expect(JSON.parse(toBackup(store.getState().data)).data).toEqual(BEFORE.data);
  });
});

type OldView = { rows: { depth: number; kind: string; words: string; here: boolean }[]; runner?: { step: string; words: string }; tile?: { line: string; path: string[] } };
const OLD = JSON.parse(fixture('p115-old-build.json')) as Record<string, OldView>;
const MORNING = 'p115-001';
const SUNDAY = 'p115-005';
const PACK = 'p115-009';
const EVENING = 'p115-014';
const RUN = 'p115-012';
const words = (r: object) => ((r as { items: { text: string }[] }).items).map((i) => i.text);

describe('the frozen data itself holds what P-115 must read', () => {
  it('a draft on Morning pages and on Sunday reset (that build then edited Sunday reset: the field stayed), a later shape on Pack for a trip, and the copy carrying Morning pages’ draft', () => {
    const { routines, runs } = BEFORE.data;
    expect(words(routines[MORNING])).toEqual(['Brew coffee', 'Write three pages', 'Read them back']);
    expect(routines[MORNING].draft).toMatchObject({ v: 1, of: MORNING, log: [{ edit: { kind: 'move', by: -1 } }, { edit: { kind: 'addStep', text: 'Underline one line' } }] });
    expect(words(routines[SUNDAY])).toEqual(['Clear the inbox', 'Look at the calendar', 'Pick three priorities', 'Plan the week']);
    expect(routines[SUNDAY].draft).toMatchObject({ v: 1, of: SUNDAY });
    expect(words((routines[SUNDAY].draft as { base: Record<string, { items: unknown }> }).base[SUNDAY])).toEqual(['Clear the inbox', 'Look at the calendar', 'Pick three priorities']);
    expect(routines[PACK].draft).toMatchObject({ v: 2 });
    expect(routines[EVENING]).toMatchObject({ words: 'Evening pages', draft: { v: 1, of: MORNING } });
    expect(runs[RUN]).toMatchObject({ routineId: MORNING, frames: [{ seq: MORNING, at: 'p115-003' }], reason: 'kettle on' });
  });

  it('what that build showed: the SAVED steps everywhere — Plan, the runner — never the draft’s; it kept the saved routine', () => {
    expect(OLD.planMorning.rows.map((r) => r.words)).toEqual(['Brew coffee', 'Write three pages', 'Read them back']);
    expect(OLD.planMorningRun.rows.map((r) => [r.words, r.here])).toEqual([['Brew coffee', false], ['Write three pages', true], ['Read them back', false]]);
    expect(OLD.runnerMorning.runner).toMatchObject({ words: 'Write three pages' });
    expect(OLD.planWeekly.rows.map((r) => r.words)).toEqual(['Clear the inbox', 'Look at the calendar', 'Pick three priorities']);
    expect(OLD.planWeeklyEdited.rows.map((r) => r.words)).toEqual(['Clear the inbox', 'Look at the calendar', 'Pick three priorities', 'Plan the week']);
    expect(OLD.planPack.rows.map((r) => r.words)).toEqual(['Check the weather', 'Lay out the clothes']);
    expect(OLD.planEvening.rows.map((r) => r.words)).toEqual(['Brew coffee', 'Write three pages', 'Read them back']);
  });
});

describe('the build with drafts reads that data', () => {
  it('a run, home and a Plan opened read-only read the saved routine, as that build showed — the draft changes none of them', async () => {
    const { planView, runnerView, homeShown } = await import('@/domain/runView');
    const data = json(BEFORE.data);
    expect(planView(data, { routineId: MORNING })!.rows.map((r) => r.words)).toEqual(OLD.planMorning.rows.map((r) => r.words));
    expect(planView(data, { runId: RUN })!.rows.map((r) => [r.words, r.here])).toEqual(OLD.planMorningRun.rows.map((r) => [r.words, r.here]));
    expect(runnerView(data, RUN)!.step.words).toBe(OLD.runnerMorning.runner!.words);
    expect(homeShown(data).find((t) => t.runId === RUN)).toBeDefined();
    expect(planView(data, { routineId: SUNDAY })!.rows.map((r) => r.words)).toEqual(OLD.planWeeklyEdited.rows.map((r) => r.words));
  });

  it('each draft by its rule: Morning pages’ and Sunday reset’s are drafts; Pack for a trip’s is locked (kept); the copy’s is another routine’s (none); old data has none', async () => {
    const { readDraft, draftData, changedElsewhere } = await import('@/domain/draft');
    const data = json(BEFORE.data);
    expect(readDraft(data, MORNING).kind).toBe('draft');
    expect(readDraft(data, SUNDAY).kind).toBe('draft');
    expect(readDraft(data, PACK).kind).toBe('locked');
    expect(readDraft(data, EVENING).kind).toBe('none');
    for (const id of Object.keys(data.routines)) if (![MORNING, SUNDAY, PACK, EVENING].includes(id)) expect(readDraft(data, id).kind).toBe('none');
    // Plan in Edit shows the draft as the person made it.
    expect(words(draftData(data, MORNING).routines[MORNING])).toEqual(['Brew coffee', 'Read them back', 'Write three pages', 'Underline one line']);
    expect(words(draftData(data, SUNDAY).routines[SUNDAY])).toEqual(['Clear the inbox to zero', 'Look at the calendar', 'Pick three priorities']);
    expect(changedElsewhere(data, MORNING)).toEqual([]);
    expect(changedElsewhere(data, SUNDAY)).toEqual(['Sunday reset']);
  });

  it('through the store, against the frozen database: Save makes Morning pages’ draft its steps in one write, the run still on “Write three pages”; one Undo brings back the saved routine and the draft', async () => {
    useDatabase();
    const store = await load();
    const s = () => store.getState();
    const { runnerView } = await import('@/domain/runView');
    const before = s().data;
    expect(s().saveDraft(MORNING)).toMatchObject({ ok: true });
    expect(words(s().data.routines[MORNING])).toEqual(['Brew coffee', 'Read them back', 'Write three pages', 'Underline one line']);
    expect('draft' in s().data.routines[MORNING]).toBe(false);
    expect(runnerView(s().data, RUN)!.step.words).toBe('Write three pages');
    expect(s().runNotice).toMatchObject({ text: 'Saved “Morning pages”' });
    await settle();
    expect(words((await onDisk()).routines[MORNING])).toEqual(['Brew coffee', 'Read them back', 'Write three pages', 'Underline one line']);
    expect(s().undoLast()).toBe(true);
    expect(s().data.routines[MORNING]).toEqual(before.routines[MORNING]);
    await settle();
    expect(await onDisk()).toEqual(BEFORE.data);
  });

  it('Sunday reset, changed elsewhere since its draft began: Save says so and writes nothing; saved anyway, the draft goes over what is saved — “Plan the week” (the other change) stays', async () => {
    useDatabase();
    const store = await load();
    const s = () => store.getState();
    expect(s().saveDraft(SUNDAY)).toEqual({ ok: false, reason: 'changed', names: ['Sunday reset'] });
    expect(s().data).toEqual(BEFORE.data);
    expect(s().saveDraft(SUNDAY, true)).toMatchObject({ ok: true });
    expect(words(s().data.routines[SUNDAY])).toEqual(['Clear the inbox to zero', 'Look at the calendar', 'Pick three priorities', 'Plan the week']);
    await settle();
    expect(words((await onDisk()).routines[SUNDAY])).toEqual(['Clear the inbox to zero', 'Look at the calendar', 'Pick three priorities', 'Plan the week']);
  });

  it('a draft in a later shape is never written over: Edit, Save and Cancel are refused, and an edit to the routine itself keeps it', async () => {
    useDatabase();
    const store = await load();
    const s = () => store.getState();
    expect(s().beginEdit(PACK)).toMatchObject({ ok: false, reason: 'locked' });
    expect(s().saveDraft(PACK)).toMatchObject({ ok: false, reason: 'locked' });
    expect(s().cancelDraft(PACK)).toMatchObject({ ok: false, reason: 'locked' });
    expect(s().editDraft(PACK, PACK, { kind: 'addStep', text: 'x' })).toMatchObject({ ok: false, reason: 'locked' });
    expect(s().data).toEqual(BEFORE.data);
    await settle();
    expect(await onDisk()).toEqual(BEFORE.data);
  });

  it('the copy carrying another routine’s draft: none here; Edit starts its own in its place, and Morning pages’ draft is untouched', async () => {
    useDatabase();
    const store = await load();
    const s = () => store.getState();
    const { readDraft } = await import('@/domain/draft');
    expect(s().beginEdit(EVENING)).toMatchObject({ ok: true });
    expect(s().data.routines[EVENING].draft).toMatchObject({ v: 1, of: EVENING, log: [] });
    expect(s().data.routines[MORNING]).toEqual(BEFORE.data.routines[MORNING]);
    expect(readDraft(s().data, EVENING).kind).toBe('draft');
  });
});
