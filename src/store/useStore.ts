import { create } from 'zustand';

import { applyUndo, UndoEntry, undoEntry } from '@/domain/diff';
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
  RenameResult,
  renameThread,
  updateThread,
} from '@/domain/model';
import { rememberSearch } from '@/domain/search';
import { lastActivities } from '@/domain/selectors';
import { Data, emptyData, Id } from '@/domain/types';

/** What's currently in the log box. Shared so a crumb on Home can load into it. */
export interface Draft {
  text: string;
  /** null = the person removed the doing chip (overrides a screen's preset doing thread). */
  doingId?: Id | null;
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
  /** True while any visible toast is pressed, hovered or focused (pauses its timer). */
  toastHeld: boolean;
  /** Reverts the last undoable change (only the records it touched). */
  undo?: UndoEntry;
  showShading: boolean;
  recentSearches: string[];
  leftAsIs: Id[];
  /** A thread just created from the @ menu whose name appears in earlier activities. */
  pullInOffer?: Id;
  /** Threads whose "earlier activities mention this" line was dismissed (this session only). */
  dismissedPullIn: Id[];
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
  dismissPullIn: (threadId: Id) => void;
  setNext: (threadId: Id, next: string) => void;
  /** Refused (nothing changes) when another thread already has the name. */
  renameThread: (threadId: Id, name: string) => RenameResult;
  setHidden: (threadId: Id, hidden: boolean) => void;
  attach: (activityId: Id, threadId: Id) => void;
  updateActivity: (activityId: Id, patch: ActivityPatch) => void;
  removeActivity: (activityId: Id) => void;
  undoLast: () => void;
  dismissToast: () => void;
  holdToast: (held: boolean) => void;
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
  toastHeld: false,
  recentSearches: [],
  leftAsIs: [],
  dismissedPullIn: [],
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
      doingId: extra?.doingId ?? draft.doingId ?? undefined,
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
      undo: undoEntry(data, res.data),
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
      const data = attachMany(s.data, activityIds, threadId);
      return {
        undo: undoEntry(s.data, data),
        data,
        pullInOffer: undefined,
        toast: { message: `Pulled ${n} ${n === 1 ? 'activity' : 'activities'} into ${name}` },
      };
    }),

  setPullInOffer: (threadId) => set({ pullInOffer: threadId }),
  rememberSearch: (query) => set((s) => ({ recentSearches: rememberSearch(s.recentSearches, query) })),
  clearSearches: () => set({ recentSearches: [] }),
  dismissPullIn: (threadId) => set((s) => ({ dismissedPullIn: [...s.dismissedPullIn, threadId] })),
  leaveAsIs: (activityId) => set((s) => (s.leftAsIs.includes(activityId) ? {} : { leftAsIs: [...s.leftAsIs, activityId] })),

  setNext: (threadId, next) =>
    set((s) => ({
      data: updateThread(s.data, threadId, { next }),
      promptNextFor: s.promptNextFor === threadId ? undefined : s.promptNextFor,
    })),

  renameThread: (threadId, name) => {
    const res = renameThread(get().data, threadId, name);
    if (res.ok) set({ data: res.data });
    return res;
  },

  setHidden: (threadId, hidden) =>
    set((s) => {
      const t = s.data.threads[threadId];
      if (!t) return {};
      const data = updateThread(s.data, threadId, { hidden });
      // Every undoable change shows its own toast, so Undo always means the change it names.
      return { undo: undoEntry(s.data, data), data, toast: { message: hidden ? `Hid “${t.name}”` : `“${t.name}” is back` } };
    }),

  attach: (activityId, threadId) =>
    set((s) => {
      const a = s.data.activities[activityId];
      const t = s.data.threads[threadId];
      if (!a || !t) return {};
      const data = attachActivity(s.data, activityId, threadId);
      return { undo: undoEntry(s.data, data), data, toast: { message: `Attached → to ${t.name}`, activityId } };
    }),

  updateActivity: (activityId, patch) => set((s) => ({ data: editActivity(s.data, activityId, patch) })),

  removeActivity: (activityId) =>
    set((s) => {
      const a = s.data.activities[activityId];
      if (!a) return {};
      const data = deleteActivity(s.data, activityId);
      return { undo: undoEntry(s.data, data), data, toast: { message: `Deleted “${a.text}”` } };
    }),

  undoLast: () => {
    const { undo, data } = get();
    if (undo) set({ data: applyUndo(data, undo), undo: undefined, toast: undefined, promptNextFor: undefined });
  },

  dismissToast: () => set({ toast: undefined, toastHeld: false }),
  holdToast: (held) => set({ toastHeld: held }),
  dismissPrompt: () => set({ promptNextFor: undefined }),
  replaceData: (data) => set({ data, undo: undefined, draft: emptyDraft() }),
  setShowShading: (on) => set({ showShading: on }),
}));

/** Threads ordered by most recent use, for autocomplete ranking. */
export function recentThreadOrder(data: Data): Id[] {
  const last = lastActivities(data);
  return [...last.keys()].sort((a, b) => last.get(b)!.occurredAt.localeCompare(last.get(a)!.occurredAt));
}
