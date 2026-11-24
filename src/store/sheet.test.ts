import { beforeEach, describe, expect, it } from 'vitest';

import { useStore } from './useStore';

const st = () => useStore.getState();

beforeEach(() => useStore.setState({ sheet: { open: false, section: 'wanders' } }));

describe('the Home sheet (P-58)', () => {
  it('starts put away, on Wanders', () => {
    expect(useStore.getInitialState().sheet).toEqual({ open: false, section: 'wanders' });
  });

  it('opens on the last section it showed, during the session', () => {
    st().openSheet();
    st().showSheetSection('activities');
    st().closeSheet();
    expect(st().sheet).toEqual({ open: false, section: 'activities' });
    st().openSheet();
    expect(st().sheet).toEqual({ open: true, section: 'activities' });
  });

  it('a deep link opens it on its section', () => {
    st().openSheet('activities');
    expect(st().sheet).toEqual({ open: true, section: 'activities' });
    st().closeSheet();
    st().openSheet('wanders');
    expect(st().sheet).toEqual({ open: true, section: 'wanders' });
  });
});

describe('P-84: the sheet’s search (session only)', () => {
  it('starts empty; closing the sheet clears it (the sky returns to rest)', () => {
    expect(useStore.getInitialState().sheetSearch).toBe('');
    st().openSheet();
    st().setSheetSearch('sketch');
    expect(st().sheetSearch).toBe('sketch');
    st().closeSheet();
    expect(st().sheetSearch).toBe('');
  });
});
