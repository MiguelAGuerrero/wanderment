import { Id } from './types';

/** The parts of the log box's line a selection touches. */
export interface LineChips {
  doingId?: Id | null;
  toIds: Id[];
}

/** The wander selected on Home (P-35), and whether selecting it put its "to" chip on the line. */
export interface Selection {
  id: Id;
  /** True when the chip was added by selecting (so it goes with the selection); false when the line already named it. */
  added: boolean;
}

/**
 * Selecting a wander on Home: the line goes toward it through a visible, removable "to" chip, unless
 * the line already names it (as doing or to). The previous selection's chip goes, if it added one.
 * Text is never touched.
 */
export function selectToward<D extends LineChips>(draft: D, prev: Selection | undefined, id: Id): { draft: D; selection: Selection } {
  if (prev?.id === id) return { draft, selection: prev };
  const base = unselect(draft, prev);
  const named = base.doingId === id || base.toIds.includes(id);
  return { draft: named ? base : { ...base, toIds: [...base.toIds, id] }, selection: { id, added: !named } };
}

/** Clearing a selection takes away only the chip it added; the line and its other chips stay. */
export function unselect<D extends LineChips>(draft: D, sel: Selection | undefined): D {
  if (!sel?.added || !draft.toIds.includes(sel.id)) return draft;
  return { ...draft, toIds: draft.toIds.filter((x) => x !== sel.id) };
}
