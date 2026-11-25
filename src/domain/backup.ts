import { migrateData } from './migrate';
import { Data, DATA_VERSION } from './types';

export interface Backup {
  app: 'wanderment';
  exportedAt: string;
  data: Data;
}

/** Always written in the current format (`DATA_VERSION`), whatever it holds. */
export const toBackup = (data: Data, now = new Date()): string =>
  JSON.stringify({ app: 'wanderment', exportedAt: now.toISOString(), data: { ...data, version: DATA_VERSION } } satisfies Backup, null, 2);

/** Parses and validates a backup file. Throws with a readable message if it isn't one. */
export function fromBackup(json: string): Data {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('That file isn’t valid JSON.');
  }
  const b = parsed as Partial<Backup>;
  if (b?.app !== 'wanderment' || !b.data) throw new Error('That file isn’t a backup from this app.');
  return migrateData(b.data);
}
