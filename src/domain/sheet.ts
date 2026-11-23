/**
 * The sheet pulled up from Home's handle (P-58, owner D-10): one sheet, two sections. Session only.
 */
export type SheetSection = 'wanders' | 'activities';

export const SHEET_SECTIONS: readonly { key: SheetSection; label: string }[] = [
  { key: 'wanders', label: 'Wanders' },
  { key: 'activities', label: 'Activities' },
];

/** A flick this fast (px/ms) decides by its direction, however short. */
const FLICK = 0.5;
/** Without a flick, the sheet has to travel this share of its height (and at least MIN px) to change state. */
const SHARE = 0.2;
const MIN = 60;

/**
 * Where a drag on the sheet (or its handle) comes to rest: open (true) or closed. `from` is where it
 * started, `dy` how far it was dragged (down is positive), `vy` how fast it was going when let go
 * (px/ms, down positive), `height` the sheet's height.
 */
export function dragEndsOpen(from: 'open' | 'closed', dy: number, vy: number, height: number): boolean {
  const toward = from === 'open' ? dy : -dy;
  const speed = from === 'open' ? vy : -vy;
  if (speed > FLICK && toward > 0) return from === 'closed';
  if (speed < -FLICK) return from === 'open';
  const changes = toward >= Math.max(MIN, height * SHARE);
  return from === 'open' ? !changes : changes;
}
