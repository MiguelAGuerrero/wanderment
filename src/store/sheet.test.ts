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
