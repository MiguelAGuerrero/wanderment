/**
 * B-11 slice 1 (P-86): what the `/go` screens remember for this page load only. Nothing here runs at
 * import: plain values, read and written by the screens.
 */
let decided = false;

/** `/go` opens where you left off ONCE per load: coming Back to it afterwards shows home (never a redirect loop). */
export const whereDecided = () => decided;
export const decideWhere = () => {
  decided = true;
};

const HOME_KEY = 'wandermentGoHome';

/**
 * P-95 audit F3: Home put this run down (paused) at `touchedAt` — so the app reopens on home, not on
 * its paused screen (`opensAt`). A hint for this device's screens only: not data, never exported;
 * anything that touches the run since makes it stale by itself.
 */
export function markWentHome(runId: string, touchedAt: string | undefined) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(HOME_KEY, JSON.stringify({ runId, touchedAt }));
  } catch {
    // Private mode, a full store: the app reopens where the run is (its paused screen).
  }
}

export function wentHome(): { runId: string; touchedAt?: string } | undefined {
  try {
    const had = typeof localStorage === 'undefined' ? null : (JSON.parse(localStorage.getItem(HOME_KEY) || 'null') as unknown);
    if (!had || typeof had !== 'object' || typeof (had as { runId?: unknown }).runId !== 'string') return undefined;
    const { runId, touchedAt } = had as { runId: string; touchedAt?: unknown };
    return { runId, ...(typeof touchedAt === 'string' && { touchedAt }) };
  } catch {
    return undefined;
  }
}

const drafts = new Map<string, string>();
const KEY = 'wandermentGoDraft:';

/** Words being typed that are not data yet (the next small step, a breakdown's steps): kept across a reload of this tab. */
export function readDraft(key: string): string {
  if (drafts.has(key)) return drafts.get(key)!;
  try {
    return (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(KEY + key)) || '';
  } catch {
    return '';
  }
}

export function writeDraft(key: string, text: string) {
  if (text) drafts.set(key, text);
  else drafts.delete(key);
  try {
    if (typeof sessionStorage === 'undefined') return;
    if (text) sessionStorage.setItem(KEY + key, text);
    else sessionStorage.removeItem(KEY + key);
  } catch {
    // Private mode, a full store: the words are still kept for this page.
  }
}
