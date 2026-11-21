import type { PersistenceStatus } from './persistent';

/** iOS/Android: app data isn't evicted like a browser's, so there's nothing to ask (web: persistent.ts). */
export async function persistenceStatus(): Promise<PersistenceStatus> {
  return 'unknown';
}

export async function requestPersistence(): Promise<void> {}

export async function askToKeepData(): Promise<PersistenceStatus> {
  return 'unknown';
}

export function onPersistenceAnswered(_listener: () => void): () => void {
  return () => {};
}
