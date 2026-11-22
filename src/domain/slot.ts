import { FocusMap, pathName } from './focus';
import { Data, Id } from './types';

/** Home's bottom slot (P-49): one face at a time, "What's next" or "Log". */
export type HomeFace = 'next' | 'log';

const visible = (data: Data, id: Id | undefined): id is Id => !!id && !!data.threads[id] && !data.threads[id].hidden;

/** The face Home rests on: What's next, or Log while there's no wander to stage a step for. */
export const restingFace = (data: Data): HomeFace => (Object.values(data.threads).some((t) => !t.hidden) ? 'next' : 'log');

/**
 * The wander the "What's next" card shows (P-49): the selection (P-35) if one is set; otherwise the
 * wander most recently logged toward (an activity's doing wander, else its first "to", as with the
 * next step's owner), skipping hidden ones; otherwise the newest visible wander. It's only shown:
 * nothing is attached to a log by it.
 */
export function whatsNextNode(data: Data, selectedId?: Id): Id | undefined {
  if (visible(data, selectedId)) return selectedId;
  let best: { id: Id; at: string; created: string } | undefined;
  for (const a of Object.values(data.activities)) {
    if (best && (a.occurredAt < best.at || (a.occurredAt === best.at && a.createdAt <= best.created))) continue;
    const id = [a.doingId, ...a.toIds].find((x) => visible(data, x));
    if (id) best = { id, at: a.occurredAt, created: a.createdAt };
  }
  if (best) return best.id;
  let newest: { id: Id; at: string } | undefined;
  for (const t of Object.values(data.threads)) if (!t.hidden && (!newest || t.createdAt > newest.at)) newest = { id: t.id, at: t.createdAt };
  return newest?.id;
}

/**
 * The What's next card's name (P-50): "What’s next, <its node and the path up from it>: <its step>",
 * e.g. "What’s next, draw better hands, toward draw, for make apparel: sketch a hand". Also what's
 * said when focus moves to it.
 */
export function cardLabel(data: Data, map: FocusMap | undefined, id: Id): string {
  const t = data.threads[id];
  if (!t) return 'What’s next';
  return `What’s next, ${pathName(map, id, t.name)}${t.next ? `: ${t.next}` : ''}`;
}
