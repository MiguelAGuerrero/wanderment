import { describe, expect, it } from 'vitest';

import { AUTO_UPDATE_WINDOW_MS, mayUpdateBySelf, versionLabel } from './update';

const at = (over: Partial<Parameters<typeof mayUpdateBySelf>[0]> = {}) =>
  mayUpdateBySelf({ now: 5_000, since: 1_000, typed: false, inUse: true, build: 'abc1234', updatedFrom: null, ...over });

describe('mayUpdateBySelf (P-30)', () => {
  it('updates by itself right after a load or a return, before anything is typed', () => {
    expect(at()).toBe(true);
  });

  it('never once the person has typed', () => {
    expect(at({ typed: true })).toBe(false);
  });

  it('only within 10 s of the load or return', () => {
    expect(AUTO_UPDATE_WINDOW_MS).toBe(10_000);
    expect(at({ since: 0, now: 10_000 })).toBe(true);
    expect(at({ since: 0, now: 10_001 })).toBe(false);
    expect(at({ since: 0, now: 60_000 })).toBe(false);
  });

  it('never while the page is hidden', () => {
    expect(at({ since: undefined })).toBe(false);
  });

  it('only from the page that has the data open, not one opening it, waiting for another copy or reconnecting', () => {
    expect(at({ inUse: false })).toBe(false);
  });

  it('at most once per version: the same build coming back after updating itself asks instead', () => {
    expect(at({ updatedFrom: 'abc1234' })).toBe(false);
    // A different build came up, so that update took; the next new version may apply by itself.
    expect(at({ updatedFrom: '0ld0ld0' })).toBe(true);
  });
});

describe('versionLabel', () => {
  it('shows the build id and date', () => {
    expect(versionLabel('df95cad', '2026-11-22')).toBe('Version df95cad · 22 Nov 2026');
    expect(versionLabel('df95cad', '2026-01-05T10:00:00Z')).toBe('Version df95cad · 5 Jan 2026');
  });

  it('without a date or id, says what it knows', () => {
    expect(versionLabel('df95cad', undefined)).toBe('Version df95cad');
    expect(versionLabel('df95cad', 'soon')).toBe('Version df95cad');
    expect(versionLabel(undefined, undefined)).toBe('Version dev');
    expect(versionLabel('  ', '')).toBe('Version dev');
  });
});
