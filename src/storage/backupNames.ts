/**
 * P-103 (the owner: a neutral name): the device's daily backup files (iOS/Android) are `routines-<date>.json`;
 * files an earlier build wrote (`wanderment-<date>.json`) still count, so the last 7 days are kept across the rename.
 */
export const BACKUP_FILE = /^(?:routines|wanderment)-(\d{4}-\d{2}-\d{2})\.json$/;
export const backupFileName = (localDate: string) => `routines-${localDate}.json`;
/** Newest first by the date in the name (an old and a new name for one day: the new one first). */
export const newestFirst = (a: string, b: string) => (BACKUP_FILE.exec(b)?.[1] ?? '').localeCompare(BACKUP_FILE.exec(a)?.[1] ?? '') || a.localeCompare(b);
