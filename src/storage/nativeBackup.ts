import { Data } from '@/domain/types';

/**
 * Web: no automatic file backups (browsers can't write to Documents). Export lives in Settings.
 * iOS/Android use nativeBackup.native.ts.
 */
export function scheduleBackup(_data: Data): void {}

export async function shareBackup(_data: Data): Promise<boolean> {
  return false;
}

export const backupsLocation: string | undefined = undefined;
