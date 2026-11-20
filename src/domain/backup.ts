import { Data } from './types';

export interface Backup {
  app: 'wanderment';
  exportedAt: string;
  data: Data;
}

export const toBackup = (data: Data, now = new Date()): string =>
  JSON.stringify({ app: 'wanderment', exportedAt: now.toISOString(), data } satisfies Backup, null, 2);

/** Parses and validates a backup file. Throws with a readable message if it isn't one. */
export function fromBackup(json: string): Data {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('That file isn’t valid JSON.');
  }
  const b = parsed as Partial<Backup>;
  if (b?.app !== 'wanderment' || !b.data || b.data.version !== 1) {
    throw new Error('That file isn’t a Wanderment backup.');
  }
  const { threads, activities } = b.data;
  if (typeof threads !== 'object' || typeof activities !== 'object') {
    throw new Error('The backup is missing threads or activities.');
  }
  for (const a of Object.values(activities)) {
    if (typeof a.text !== 'string' || !Array.isArray(a.toIds)) throw new Error('An activity in the backup is malformed.');
  }
  return b.data;
}
