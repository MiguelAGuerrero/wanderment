/** P-103 audit F2: the device's backup files carry the neutral name; older files still count and are pruned by date. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { BACKUP_FILE, backupFileName, newestFirst } from './backupNames';

describe('device backup files (iOS/Android)', () => {
  it('are written as routines-<date>.json; files an earlier build wrote still count', () => {
    expect(backupFileName('2026-11-27')).toBe('routines-2026-11-27.json');
    expect(BACKUP_FILE.test('routines-2026-11-27.json')).toBe(true);
    expect(BACKUP_FILE.test('wanderment-2026-11-20.json')).toBe(true);
    expect(BACKUP_FILE.test('notes.json')).toBe(false);
  });

  it('newest first by date across both names, so pruning to 7 keeps the latest days', () => {
    const names = ['wanderment-2026-11-20.json', 'routines-2026-11-27.json', 'wanderment-2026-11-26.json', 'routines-2026-11-26.json'];
    expect([...names].sort(newestFirst)).toEqual(['routines-2026-11-27.json', 'routines-2026-11-26.json', 'wanderment-2026-11-26.json', 'wanderment-2026-11-20.json']);
  });

  it('what iOS shows in Settings names the app as it is now called', () => {
    const src = readFileSync(join(__dirname, 'nativeBackup.native.ts'), 'utf8');
    expect(src).toContain('On My iPhone → Routines → backups');
    expect(src).not.toMatch(/Wanderment/);
  });
});
