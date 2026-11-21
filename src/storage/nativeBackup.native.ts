import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { toBackup } from '@/domain/backup';
import { Data } from '@/domain/types';

/**
 * iOS/Android: after changes settle, write a dated JSON backup into the app's Documents folder
 * (visible in the Files app on iOS when file sharing is on, and included in device backups).
 * One file per day, keeping the last 7 days.
 */
const KEEP = 7;
const DEBOUNCE_MS = 5000;
const NAME = /^wanderment-\d{4}-\d{2}-\d{2}\.json$/;

let timer: ReturnType<typeof setTimeout> | undefined;

const dir = () => new Directory(Paths.document, 'backups');
const fileFor = (now: Date) => new File(dir(), `wanderment-${now.toISOString().slice(0, 10)}.json`);

function writeBackup(data: Data, now = new Date()): File {
  const d = dir();
  d.create({ idempotent: true, intermediates: true });
  const file = fileFor(now);
  if (!file.exists) file.create();
  file.writeSync(toBackup(data, now));
  const old = d
    .list()
    .filter((f): f is File => f instanceof File && NAME.test(f.name))
    .sort((a, b) => b.name.localeCompare(a.name))
    .slice(KEEP);
  for (const f of old) f.delete();
  return file;
}

export function scheduleBackup(data: Data): void {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try {
      writeBackup(data);
    } catch (e) {
      console.warn('Automatic backup failed', e);
    }
  }, DEBOUNCE_MS);
}

/** Writes today's backup now and opens the share sheet for it. */
export async function shareBackup(data: Data): Promise<boolean> {
  const file = writeBackup(data);
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Export Wanderment data' });
  return true;
}

export const backupsLocation = 'Documents/backups (last 7 days)';
