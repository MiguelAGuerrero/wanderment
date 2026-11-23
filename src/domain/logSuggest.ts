import { normalizeName } from './model';
import { Data, Id, Thread } from './types';

/**
 * What Home's log field offers as you type (P-61, D-11). Nothing is applied without a tap: a step
 * fills the line, attaches its wander and completes the step; a past entry fills the line and
 * attaches where it last went; a node attaches.
 */
export type LogSuggestion =
  | { kind: 'step'; threadId: Id; text: string; name: string }
  | { kind: 'past'; text: string; targetId?: Id; targetName?: string }
  | { kind: 'node'; threadId: Id; name: string };

/** Suggestions start at this many characters. */
export const MIN_QUERY = 2;
export const MAX_SUGGESTIONS = 4;

/** The line starts with the query, or one of its words does (case and spacing don't matter). */
const matches = (text: string, q: string) => {
  const n = normalizeName(text);
  return n.startsWith(q) || n.includes(` ${q}`);
};

const visible = (data: Data, id: Id | undefined): id is Id => !!id && !!data.threads[id] && !data.threads[id].hidden;

/**
 * Up to four suggestions for the line typed so far, in this order: staged steps whose words match
 * (most recently used wander first), then past entries that match (most recent first, one per wording,
 * with the wander the latest one went to — its doing, else its first "to" — if it's visible), then
 * wanders whose name matches (start of the name first, then most recently used).
 */
export function suggestLogs(data: Data, query: string, recentOrder: Id[], limit = MAX_SUGGESTIONS): LogSuggestion[] {
  const q = normalizeName(query);
  if (q.length < MIN_QUERY) return [];
  const recency = (id: Id) => {
    const i = recentOrder.indexOf(id);
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  };
  const byUse = (a: Thread, b: Thread) => recency(a.id) - recency(b.id) || a.name.localeCompare(b.name);
  const threads = Object.values(data.threads).filter((t) => !t.hidden);

  const steps: LogSuggestion[] = threads
    .filter((t) => t.next && matches(t.next, q))
    .sort(byUse)
    .map((t) => ({ kind: 'step', threadId: t.id, text: t.next!, name: t.name }));

  const seen = new Set(steps.map((s) => normalizeName(s.kind === 'step' ? s.text : '')));
  const past: LogSuggestion[] = [];
  const newestFirst = Object.values(data.activities).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.createdAt.localeCompare(a.createdAt));
  for (const a of newestFirst) {
    if (steps.length + past.length >= limit) break;
    const key = normalizeName(a.text);
    if (seen.has(key) || !matches(a.text, q)) continue;
    seen.add(key);
    const target = [a.doingId, ...a.toIds].find((id) => visible(data, id));
    past.push(target ? { kind: 'past', text: a.text, targetId: target, targetName: data.threads[target].name } : { kind: 'past', text: a.text });
  }

  const rank = (t: Thread) => (normalizeName(t.name).startsWith(q) ? 0 : 1);
  const nodes: LogSuggestion[] = threads
    .filter((t) => matches(t.name, q))
    .sort((a, b) => rank(a) - rank(b) || byUse(a, b))
    .map((t) => ({ kind: 'node', threadId: t.id, name: t.name }));

  return [...steps, ...past, ...nodes].slice(0, limit);
}

/** The parts of the log box's line a pick touches (the store's Draft has these). */
export interface PickLine {
  text: string;
  doingId?: Id | null;
  toIds: Id[];
  fromNextOf?: Id;
  fromNextText?: string;
}

/**
 * The line after a tap on a suggestion (P-61), and what to say about it. A step fills the line with its
 * words, makes its wander the doing one and marks the line as completing it (as ✓ does: the step is
 * cleared only if it still says this); a past entry fills its words and attaches where it last went; a
 * wander attaches (the words stay as typed). A step picked before goes (with the doing it brought),
 * unless this pick is that step again. Nothing else on the line changes.
 */
export function pickSuggestion<L extends PickLine>(line: L, sg: LogSuggestion): { line: L; said: string } {
  const earlier = line.fromNextOf;
  const base: L = earlier ? { ...line, fromNextOf: undefined, fromNextText: undefined, doingId: line.doingId === earlier ? undefined : line.doingId } : line;
  const attach = (id: Id | undefined) => (!id || base.doingId === id || base.toIds.includes(id) ? base.toIds : [...base.toIds, id]);
  if (sg.kind === 'step') {
    return {
      line: { ...base, text: sg.text, doingId: sg.threadId, toIds: base.toIds.filter((x) => x !== sg.threadId), fromNextOf: sg.threadId, fromNextText: sg.text },
      said: `Attached to ${sg.name}. Logging it completes ${sg.text}`,
    };
  }
  if (sg.kind === 'past') return { line: { ...base, text: sg.text, toIds: attach(sg.targetId) }, said: sg.targetName ? `Attached to ${sg.targetName}` : `Filled in ${sg.text}` };
  return { line: { ...base, toIds: attach(sg.threadId) }, said: `Attached to ${sg.name}` };
}
