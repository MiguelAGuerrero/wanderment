import { create } from 'zustand';

import { attachMany } from '@/domain/emergence';
import {
  ActivityPatch,
  attachActivity,
  deleteActivity,
  editActivity,
  ensureThread,
  LogInput,
  logActivity,
  nextOwner,
  updateThread,
} from '@/domain/model';
import { rememberSearch } from '@/domain/search';
import { Data, emptyData, Id } from '@/domain/types';

/** What's currently in the log box. Shared so a crumb on Home can load into it. */
export interface Draft {
  text: string;
  doingId?: Id;
  toIds: Id[];
  /** Set when the draft was loaded from a thread's next step. */
  fromNextOf?: Id;
}

export interface Toast {
  message: string;
  activityId?: Id;
}

/** Where data lives: SQLite (normal), the first release's localStorage format (web fallback). */
export type StorageKind = 'sqlite' | 'local';

export type StorageStatus =
  | { state: 'loading' }
  | { state: 'ready'; kind: StorageKind }
  /** Couldn't open the saved data; nothing is shown so nothing can be overwritten. */
  | { state: 'blocked'; message: string };

interface State {
  data: Data;
  draft: Draft;
  /** Thread that shows the quiet "+ What's next? (optional)" line after a log. */
  promptNextFor?: Id;
  toast?: Toast;
  /** Snapshot for a single-step undo of the last change. */
  undoSnapshot?: Data;
  showShading: boolean;
  recentSearches: string[];
  leftAsIs: Id[];
  /** A thread just created from the @ menu whose name appears in earlier activities. */
  pullInOffer?: Id;
  storage: StorageStatus;
  /** Set when a save failed; cleared by the next successful save. */
  saveError?: string;

  setDraft: (patch: Partial<Draft>) => void;
  clearDraft: () => void;
  loadNext: (threadId: Id) => void;
  log: (extra?: Partial<LogInput>) => Id | undefined;
  createThread: (name: string) => Id;
  /** Attaches the chosen past activities to a thread; one Undo reverts all of them. */
  pullIn: (threadId: Id, activityIds: Id[]) => void;
  setPullInOffer: (threadId: Id | undefined) => void;
  rememberSearch: (query: string) => void;
  clearSearches: () => void;
  leaveAsIs: (activityId: Id) => void;
  setNext: (threadId: Id, next: string) => void;
  renameThread: (threadId: Id, name: string) => void;
  setHidden: (threadId: Id, hidden: boolean) => void;
  attach: (activityId: Id, threadId: Id) => void;
  updateActivity: (activityId: Id, patch: ActivityPatch) => void;
  removeActivity: (activityId: Id) => void;
  undo: () => void;
  dismissToast: () => void;
  dismissPrompt: () => void;
  replaceData: (data: Data) => void;
  setShowShading: (on: boolean) => void;
}

const emptyDraft = (): Draft => ({ text: '', toIds: [] });

/**
 * App state. Saving to disk is handled by src/storage/persistence.ts, which loads the data,
 * then writes every change to SQLite in the background.
 */
export const useStore = create<State>()((set, get) => ({
  data: emptyData(),
  draft: emptyDraft(),
  showShading: true,
  recentSearches: [],
  leftAsIs: [],
  storage: { state: 'loading' },

  setDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  clearDraft: () => set({ draft: emptyDraft() }),

  loadNext: (threadId) => {
    const t = get().data.threads[threadId];
    if (!t?.next) return;
    set({ draft: { text: t.next, doingId: threadId, toIds: [], fromNextOf: threadId } });
  },

  log: (extra) => {
    const { data, draft } = get();
    const text = (extra?.text ?? draft.text).trim();
    if (!text) return undefined;
    const res = logActivity(data, {
      text,
      doingId: extra?.doingId ?? draft.doingId,
      toIds: extra?.toIds ?? draft.toIds,
      fromNextOf: extra?.fromNextOf ?? draft.fromNextOf,
      occurredAt: extra?.occurredAt,
      note: extra?.note,
    });
    const owner = nextOwner(res.activity);
    const ownerName = owner ? res.data.threads[owner]?.name : undefined;
    const firstTo = res.activity.toIds[0] ? res.data.threads[res.activity.toIds[0]]?.name : undefined;
    set({
      data: res.data,
      undoSnapshot: data,
      draft: emptyDraft(),
      promptNextFor: owner && !res.data.threads[owner]?.next ? owner : undefined,
      toast: {
        message: firstTo ? `Logged → to ${firstTo}` : ownerName ? `Logged in ${ownerName}` : 'Logged',
        activityId: res.activity.id,
      },
    });
    return res.activity.id;
  },

  createThread: (name) => {
    const res = ensureThread(get().data, name);
    set({ data: res.data });
    return res.thread.id;
  },

  pullIn: (threadId, activityIds) =>
    set((s) => {
      const name = s.data.threads[threadId]?.name;
      if (!name || !activityIds.length) return {};
      const n = activityIds.length;
      return {
        undoSnapshot: s.data,
        data: attachMany(s.data, activityIds, threadId),
        pullInOffer: undefined,
        toast: { message: `Pulled ${n} ${n === 1 ? 'activity' : 'activities'} into ${name}` },
      };
    }),

  setPullInOffer: (threadId) => set({ pullInOffer: threadId }),
  rememberSearch: (query) => set((s) => ({ recentSearches: rememberSearch(s.recentSearches, query) })),
  clearSearches: () => set({ recentSearches: [] }),
  leaveAsIs: (activityId) => set((s) => (s.leftAsIs.includes(activityId) ? {} : { leftAsIs: [...s.leftAsIs, activityId] })),

  setNext: (threadId, next) =>
    set((s) => ({
      data: updateThread(s.data, threadId, { next }),
      promptNextFor: s.promptNextFor === threadId ? undefined : s.promptNextFor,
    })),

  renameThread: (threadId, name) => set((s) => ({ data: updateThread(s.data, threadId, { name }) })),

  setHidden: (threadId, hidden) => set((s) => ({ undoSnapshot: s.data, data: updateThread(s.data, threadId, { hidden }) })),

  attach: (activityId, threadId) =>
    set((s) => {
      const a = s.data.activities[activityId];
      const t = s.data.threads[threadId];
      if (!a || !t) return {};
      return { undoSnapshot: s.data, data: attachActivity(s.data, activityId, threadId), toast: { message: `Attached → to ${t.name}`, activityId } };
    }),

  updateActivity: (activityId, patch) => set((s) => ({ data: editActivity(s.data, activityId, patch) })),

  removeActivity: (activityId) =>
    set((s) => {
      const a = s.data.activities[activityId];
      if (!a) return {};
      return { undoSnapshot: s.data, data: deleteActivity(s.data, activityId), toast: { message: `Deleted “${a.text}”` } };
    }),

  undo: () => {
    const snap = get().undoSnapshot;
    if (snap) set({ data: snap, undoSnapshot: undefined, toast: undefined, promptNextFor: undefined });
  },

  dismissToast: () => set({ toast: undefined }),
  dismissPrompt: () => set({ promptNextFor: undefined }),
  replaceData: (data) => set({ data, undoSnapshot: undefined, draft: emptyDraft() }),
  setShowShading: (on) => set({ showShading: on }),
}));

/** Threads ordered by most recent use, for autocomplete ranking. */
export function recentThreadOrder(data: Data): Id[] {
  const seen: Id[] = [];
  const acts = Object.values(data.activities).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  for (const a of acts) for (const id of [a.doingId, ...a.toIds]) if (id && !seen.includes(id)) seen.push(id);
  return seen;
}
