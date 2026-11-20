import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { attachActivity, ensureThread, LogInput, logActivity, nextOwner, updateThread } from '@/domain/model';
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

interface State {
  data: Data;
  draft: Draft;
  /** Thread that shows the quiet "+ What's next? (optional)" line after a log. */
  promptNextFor?: Id;
  toast?: Toast;
  /** Snapshot for a single-step undo of the last change. */
  undoSnapshot?: Data;
  showShading: boolean;

  setDraft: (patch: Partial<Draft>) => void;
  clearDraft: () => void;
  loadNext: (threadId: Id) => void;
  log: (extra?: Partial<LogInput>) => Id | undefined;
  createThread: (name: string) => Id;
  setNext: (threadId: Id, next: string) => void;
  renameThread: (threadId: Id, name: string) => void;
  setHidden: (threadId: Id, hidden: boolean) => void;
  attach: (activityId: Id, threadId: Id) => void;
  updateActivity: (activityId: Id, patch: { note?: string; occurredAt?: string }) => void;
  undo: () => void;
  dismissToast: () => void;
  dismissPrompt: () => void;
  replaceData: (data: Data) => void;
  setShowShading: (on: boolean) => void;
}

const emptyDraft = (): Draft => ({ text: '', toIds: [] });

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      data: emptyData(),
      draft: emptyDraft(),
      showShading: true,

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

      setNext: (threadId, next) =>
        set((s) => ({
          data: updateThread(s.data, threadId, { next }),
          promptNextFor: s.promptNextFor === threadId ? undefined : s.promptNextFor,
        })),

      renameThread: (threadId, name) => set((s) => ({ data: updateThread(s.data, threadId, { name }) })),

      setHidden: (threadId, hidden) =>
        set((s) => ({ undoSnapshot: s.data, data: updateThread(s.data, threadId, { hidden }) })),

      attach: (activityId, threadId) =>
        set((s) => ({ undoSnapshot: s.data, data: attachActivity(s.data, activityId, threadId) })),

      updateActivity: (activityId, patch) =>
        set((s) => {
          const a = s.data.activities[activityId];
          if (!a) return {};
          return { data: { ...s.data, activities: { ...s.data.activities, [activityId]: { ...a, ...patch } } } };
        }),

      undo: () => {
        const snap = get().undoSnapshot;
        if (snap) set({ data: snap, undoSnapshot: undefined, toast: undefined, promptNextFor: undefined });
      },

      dismissToast: () => set({ toast: undefined }),
      dismissPrompt: () => set({ promptNextFor: undefined }),
      replaceData: (data) => set({ data, undoSnapshot: undefined, draft: emptyDraft() }),
      setShowShading: (on) => set({ showShading: on }),
    }),
    {
      name: 'wanderment',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      // Only durable things are saved; drafts, toasts and undo stay in memory.
      partialize: (s) => ({ data: s.data, showShading: s.showShading }),
    },
  ),
);

/** Threads ordered by most recent use, for autocomplete ranking. */
export function recentThreadOrder(data: Data): Id[] {
  const seen: Id[] = [];
  const acts = Object.values(data.activities).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  for (const a of acts) for (const id of [a.doingId, ...a.toIds]) if (id && !seen.includes(id)) seen.push(id);
  return seen;
}
