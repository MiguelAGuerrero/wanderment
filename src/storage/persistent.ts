/**
 * Web: whether this browser has promised not to evict Wanderment's data (navigator.storage), and
 * asking it to. Browsers may otherwise clear a site's storage — Safari does for sites not visited
 * for a while unless they're on the Home Screen. Never throws; iOS/Android use persistent.native.ts.
 */
export type PersistenceStatus = 'granted' | 'installed' | 'not-granted' | 'unknown';

interface WebNavigator {
  storage?: { persisted?: () => Promise<boolean>; persist?: () => Promise<boolean> };
  standalone?: boolean;
  userAgent?: string;
}

const nav = (): WebNavigator | undefined => (globalThis as { navigator?: WebNavigator }).navigator;

/** The storage manager, only when it can both say and ask. */
function api() {
  try {
    const storage = nav()?.storage;
    return typeof storage?.persisted === 'function' && typeof storage.persist === 'function' ? storage : undefined;
  } catch {
    return undefined;
  }
}

/** Running as an installed app (Home Screen / installed PWA). */
function isInstalled(): boolean {
  try {
    return globalThis.matchMedia?.('(display-mode: standalone)').matches === true || nav()?.standalone === true;
  } catch {
    return false;
  }
}

/** Firefox may show a permission prompt for persist(), so it's only asked from Settings. */
function mayPrompt(): boolean {
  try {
    return /firefox\//i.test(nav()?.userAgent ?? '');
  } catch {
    return false;
  }
}

/** true / false as the browser says; undefined when it can't say. Never prompts. */
async function persisted(): Promise<boolean | undefined> {
  const storage = api();
  if (!storage) return undefined;
  try {
    return (await storage.persisted!()) === true;
  } catch {
    return undefined;
  }
}

export async function persistenceStatus(): Promise<PersistenceStatus> {
  const kept = await persisted();
  if (kept) return 'granted';
  if (isInstalled()) return 'installed';
  return kept === false ? 'not-granted' : 'unknown';
}

let requested = false;
const listeners = new Set<() => void>();

/** Called when the automatic request has been answered, so an open Settings can re-read the status. */
export function onPersistenceAnswered(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Called after a change is saved: asks the browser to keep the data, at most once per page
 * session, only if it hasn't already promised, and never where asking could show a prompt
 * (that would interrupt capture). Chromium and Safari decide silently.
 */
export async function requestPersistence(): Promise<void> {
  if (requested) return;
  requested = true;
  try {
    if (mayPrompt() || (await persisted()) !== false) return;
    await api()?.persist!();
  } catch {
    // Refused or unavailable: Settings says so and offers Install / Export.
  }
  for (const listener of listeners) listener();
}

/** The Settings button: the person asked, so ask now (Firefox may show its prompt). */
export async function askToKeepData(): Promise<PersistenceStatus> {
  try {
    await api()?.persist!();
  } catch {
    // Same as a refusal.
  }
  return persistenceStatus();
}
