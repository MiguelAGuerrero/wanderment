/**
 * When a new version of the web app may replace this one by itself (P-30): only right after the
 * page loads or comes back to the foreground, before the person types anything, and at most once
 * per version — otherwise the "A new version is ready" banner asks.
 */
export const AUTO_UPDATE_WINDOW_MS = 10_000;

export interface UpdateMoment {
  now: number;
  /** When the page loaded or last came back to the foreground; undefined while it's hidden. */
  since: number | undefined;
  /** Typed in the log box or any field since then. */
  typed: boolean;
  /**
   * This page has the data open and is the one in use — not opening it, waiting for another copy
   * or reconnecting (P-29). Updating swaps the version under every tab, so only that page decides.
   */
  inUse: boolean;
  /** This page's build. */
  build: string;
  /** The build this tab last updated itself away from (sessionStorage), if any. */
  updatedFrom: string | null;
}

export function mayUpdateBySelf({ now, since, typed, inUse, build, updatedFrom }: UpdateMoment): boolean {
  if (since === undefined || typed || !inUse) return false;
  if (now - since > AUTO_UPDATE_WINDOW_MS) return false;
  // The reload brought up the same build again: don't loop, let the banner ask.
  return updatedFrom !== build;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Version 1a2b3c4 · 22 Nov 2026" from the build id and its ISO date (either may be missing). */
export function versionLabel(buildId: string | undefined, buildDate: string | undefined): string {
  const id = buildId?.trim() || 'dev';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(buildDate ?? '');
  const month = m ? MONTHS[Number(m[2]) - 1] : undefined;
  return month ? `Version ${id} · ${Number(m![3])} ${month} ${m![1]}` : `Version ${id}`;
}
