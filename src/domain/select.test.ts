import { describe, expect, it } from 'vitest';

import { selectToward, unselect } from './select';

describe('selecting a wander on Home (P-35)', () => {
  it('adds a "to" chip for it, keeping the text and other chips', () => {
    const r = selectToward({ text: 'half a page', toIds: ['z'] }, undefined, 'draw');
    expect(r.draft).toEqual({ text: 'half a page', toIds: ['z', 'draw'] });
    expect(r.selection).toEqual({ id: 'draw', added: true });
  });

  it('a line that already names it (as to or doing) gets no second chip, and clearing leaves it', () => {
    const asTo = selectToward({ text: 'x', toIds: ['draw'] }, undefined, 'draw');
    expect(asTo.draft.toIds).toEqual(['draw']);
    expect(asTo.selection.added).toBe(false);
    expect(unselect(asTo.draft, asTo.selection).toIds).toEqual(['draw']);
    const asDoing = selectToward({ text: 'x', doingId: 'draw', toIds: [] }, undefined, 'draw');
    expect(asDoing.draft).toEqual({ text: 'x', doingId: 'draw', toIds: [] });
  });

  it('selecting another moves the chip; selecting the same again changes nothing', () => {
    const a = selectToward({ text: '', toIds: [] }, undefined, 'draw');
    const b = selectToward(a.draft, a.selection, 'sew');
    expect(b.draft.toIds).toEqual(['sew']);
    expect(selectToward(b.draft, b.selection, 'sew')).toEqual(b);
  });

  it('clearing takes away only the chip it added', () => {
    const a = selectToward({ text: 'sketched', toIds: ['z'] }, undefined, 'draw');
    expect(unselect(a.draft, a.selection)).toEqual({ text: 'sketched', toIds: ['z'] });
    expect(unselect(a.draft, undefined)).toBe(a.draft);
  });
});
