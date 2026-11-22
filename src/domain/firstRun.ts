import { Data, Id } from './types';

/**
 * The first run (P-36, B-04): ① "What's it all for?" → ② "One next step toward it?" → ③ the graph
 * with both. Offers, not promises: every step is skippable in one tap and nothing is required.
 */
export type FirstRun = { step: 1 } | { step: 2 | 3; why: Id };

/** The examples for ①: feelings and reasons in plain words (no targets, dates, numbers or "goal"). */
export const WHY_EXAMPLES = ['feel productive', 'feel calmer', 'be a better drawer'] as const;

/** The example for ②: a next step can be mundane. */
export const STEP_EXAMPLE = 'read a book';

/** Nothing logged and no wanders, hidden or not. */
export const isEmptyApp = (data: Data) => Object.keys(data.activities).length === 0 && Object.keys(data.threads).length === 0;

/**
 * Which step shows, if any. ① only on an empty app, until the run is over for good (`done`).
 * `going` is where this session's run is after ①: it lasts while its why is there and nothing has
 * been logged (a log at any point ends it).
 */
export function firstRunStep(data: Data, done: boolean, going?: Exclude<FirstRun, { step: 1 }>): FirstRun | undefined {
  if (going) return data.threads[going.why] && Object.keys(data.activities).length === 0 ? going : undefined;
  return !done && isEmptyApp(data) ? { step: 1 } : undefined;
}
