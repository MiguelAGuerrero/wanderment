import { Platform, Share } from 'react-native';

import { toBackup } from '@/domain/backup';
import { Data } from '@/domain/types';
import { shareBackup } from '@/storage/nativeBackup';

/**
 * Exports everything as a `.json` backup (Settings): on web a
 * download, on iOS/Android the share sheet with the file (or its text, where a file can't be shared).
 */
export async function exportBackup(data: Data): Promise<void> {
  const json = toBackup(data);
  const filename = `routines-backup-${new Date().toISOString().slice(0, 10)}.json`;
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  } else if (!(await shareBackup(data))) {
    await Share.share({ message: json, title: filename });
  }
}
