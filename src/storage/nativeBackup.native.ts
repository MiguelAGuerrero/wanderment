import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { toBackup } from '@/domain/backup';
import { Data } from '@/domain/types';
import { BACKUP_FILE, backupFileName, newestFirst } from './backupNames';

/**
 * iOS/Android: after changes settle, write a dated JSON backup into the app's Documents folder.
 * On iOS it shows in the Files app (UIFileSharingEnabled + LSSupportsOpeningDocumentsInPlace in
 * app.json). On Android it's app-private, so it survives crashes but not uninstalling — Export
 * is how to keep a copy elsewhere. One file per (local) day, keeping the last 7 days.
 */
const KEEP = 7;
const DEBOUNCE_MS = 5000;
const NAME = BACKUP_FILE;

let timer: ReturnType<typeof setTimeout> | undefined;

const dir = () => new Directory(Paths.document, 'backups');
const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fileFor = (now: Date) => new File(dir(), backupFileName(localDate(now)));

function writeBackup(data: Data, now = new Date()): File {
  const d = dir();
  d.create({ idempotent: true, intermediates: true });
  const file = fileFor(now);
  if (!file.exists) file.create();
  file.writeSync(toBackup(data, now));
  const old = d
    .list()
    .filter((f): f is File => f instanceof File && NAME.test(f.name))
    .sort((a, b) => newestFirst(a.name, b.name))
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
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Export your data' });
  return true;
}

export const backupsLocation =
  Platform.OS === 'ios'
    ? 'Files app → On My iPhone → Routines → backups (last 7 days)'
    : 'kept inside the app for 7 days; use Export to keep a copy elsewhere';
