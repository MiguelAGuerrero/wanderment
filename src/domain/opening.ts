/**
 * Opening the saved data on web, where only one copy of the app can hold the database (OPFS
 * access handles are exclusive). Pure: persistence.ts does the opening and the waiting.
 */

/** The steps of opening, in order; the blocked and waiting screens name the one that failed. */
export const OPEN_STEPS = ['tab lock', 'open', 'migrate', 'journal', 'absorb', 'load'] as const;
export type OpenStep = (typeof OPEN_STEPS)[number];

/** An error from one step of opening, so the screen can say where it happened. */
export class StepError extends Error {
  constructor(
    readonly step: OpenStep,
    readonly cause: unknown,
  ) {
    super(messageOf(cause));
  }
}

const nameOf = (e: unknown) => (e instanceof Error || (typeof e === 'object' && e !== null) ? String((e as Error).name ?? '') : '');
const messageOf = (e: unknown) => String((e as Error | undefined)?.message ?? e);

/**
 * Whether another copy of the app (a tab, a window, a page kept in a tab's history) holds the
 * database. expo-sqlite's worker forwards only the message, so this matches on the text too:
 * - WebKit: a lock it can't take is an InvalidStateError with no message of its own, so the
 *   default "The object is in an invalid state." (only meaningful while opening the files);
 * - the spec's NoModificationAllowedError (WebKit's text: "The object can not be modified.");
 * - Chromium's "Access Handles cannot be created if there is another open Access Handle…";
 * - and what was recognised before ("another open", "locked").
 * UnknownError (private browsing, no OPFS) never is: that browser falls back instead.
 */
export function classifyOpenError(e: unknown, step: OpenStep): 'held' | 'other' {
  const name = nameOf(e);
  const message = messageOf(e);
  if (name === 'UnknownError' || /unknown transient reason/i.test(message)) return 'other';
  if (name === 'NoModificationAllowedError' || /can ?not be modified/i.test(message)) return 'held';
  if (step === 'open' && (name === 'InvalidStateError' || /the object is in an invalid state/i.test(message))) return 'held';
  return /access handle|nomodificationallowed|another open|locked/i.test(message) ? 'held' : 'other';
}

/**
 * How long to wait before trying again after `failures` failed tries (0 = after the first):
 * about 0.25, 0.5, 1, 2 and 4 s, then every 5 s ± 20 % so two waiting pages don't move in step.
 */
export function retryDelay(failures: number, random: () => number = Math.random): number {
  if (failures < 5) return 250 * 2 ** failures;
  return Math.round(5000 * (0.8 + 0.4 * random()));
}

/** "Details: {step} · {message}", small print for bug reports. Worker errors are all plain "Error". */
export function detailsLine(e: unknown): string {
  const step = e instanceof StepError ? e.step : 'start';
  const cause = e instanceof StepError ? e.cause : e;
  const name = nameOf(cause);
  const message = messageOf(cause);
  return `Details: ${step} · ${name && name !== 'Error' && !message.startsWith(name) ? `${name}: ${message}` : message}`;
}
