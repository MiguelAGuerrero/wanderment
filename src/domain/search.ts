import { nextOwner } from './model';
import { sortedActivities } from './selectors';
import { Data, Id } from './types';

export interface SearchHit {
  kind: 'activity' | 'note' | 'next';
  /** The activity (for activity/note hits). */
  activityId?: Id;
  text: string;
  occurredAt?: string;
}

export interface SearchGroup {
  /** undefined = activities with no thread. */
  threadId?: Id;
  title: string;
  hits: SearchHit[];
}

const fold = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

/** Every word of the query must appear (in any order, ignoring case and accents). */
export function matches(text: string | undefined, query: string): boolean {
  if (!text) return false;
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return false;
  const t = fold(text);
  return words.every((w) => t.includes(w));
}

/**
 * Searches activity text, notes and next steps. Results are grouped by thread (an activity
 * belongs to its doing thread, else its first "to"); groups are ordered by their most recent hit.
 */
export function search(data: Data, query: string, limit = 100): SearchGroup[] {
  if (!query.trim()) return [];
  const groups = new Map<string, SearchGroup & { recent: string }>();
  const group = (threadId?: Id) => {
    const key = threadId ?? '';
    if (!groups.has(key)) {
      groups.set(key, { threadId, title: threadId ? data.threads[threadId]?.name ?? 'Wander' : 'No wander', hits: [], recent: '' });
    }
    return groups.get(key)!;
  };
  let count = 0;
  for (const t of Object.values(data.threads)) {
    if (matches(t.next, query)) {
      const g = group(t.id);
      g.hits.push({ kind: 'next', text: t.next! });
      g.recent = g.recent || new Date().toISOString();
      count++;
    }
  }
  for (const a of sortedActivities(data)) {
    if (count >= limit) break;
    const inText = matches(a.text, query);
    const inNote = matches(a.note, query);
    if (!inText && !inNote) continue;
    const owner = nextOwner(a);
    const g = group(owner && data.threads[owner] ? owner : undefined);
    g.hits.push({ kind: inText ? 'activity' : 'note', activityId: a.id, text: inText ? a.text : a.note!, occurredAt: a.occurredAt });
    if (a.occurredAt > g.recent) g.recent = a.occurredAt;
    count++;
  }
  return [...groups.values()].sort((x, y) => y.recent.localeCompare(x.recent)).map(({ recent: _r, ...g }) => g);
}

/** Keeps the last few distinct searches, newest first. */
export function rememberSearch(recent: string[], query: string, keep = 6): string[] {
  const q = query.trim();
  if (!q) return recent;
  return [q, ...recent.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, keep);
}
