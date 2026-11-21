import { describe, expect, it } from 'vitest';

import { classifyOpenError, detailsLine, OPEN_STEPS, retryDelay, StepError } from './opening';

/** What expo-sqlite's worker hands the page: only the message survives, as a plain Error. */
const forwarded = (message: string) => new Error(message);
const named = (name: string, message: string) => Object.assign(new Error(message), { name });

describe('recognising “held by another copy” (P-29)', () => {
  it('WebKit’s bare InvalidStateError text from the open step is held elsewhere', () => {
    expect(classifyOpenError(forwarded('The object is in an invalid state.'), 'open')).toBe('held');
    expect(classifyOpenError(named('InvalidStateError', 'The object is in an invalid state.'), 'open')).toBe('held');
  });

  it('NoModificationAllowedError (the spec’s name, and WebKit’s text for it) is held elsewhere', () => {
    expect(classifyOpenError(named('NoModificationAllowedError', 'whatever the browser says'), 'open')).toBe('held');
    expect(classifyOpenError(forwarded('The object can not be modified.'), 'open')).toBe('held');
  });

  it('Chromium’s access-handle text is held elsewhere', () => {
    const chromium =
      "Failed to execute 'createSyncAccessHandle' on 'FileSystemFileHandle': Access Handles cannot be created if there is another open Access Handle or Writable stream associated with the same file.";
    expect(classifyOpenError(forwarded(chromium), 'open')).toBe('held');
  });

  it('the patterns recognised before are still recognised', () => {
    expect(classifyOpenError(forwarded('database is locked'), 'migrate')).toBe('held');
    expect(classifyOpenError(forwarded('there is another open handle'), 'open')).toBe('held');
    expect(classifyOpenError(forwarded('NoModificationAllowedError: busy'), 'open')).toBe('held');
  });

  it('UnknownError (private browsing, no OPFS) is not held, whatever its message says', () => {
    expect(classifyOpenError(forwarded('The operation failed for an unknown transient reason (e.g. out of memory).'), 'open')).toBe('other');
    expect(classifyOpenError(named('UnknownError', 'The operation failed for an unknown transient reason.'), 'open')).toBe('other');
    expect(classifyOpenError(named('UnknownError', 'Invalid platform file handle'), 'open')).toBe('other');
  });

  it('anything else is not held', () => {
    expect(classifyOpenError(forwarded('disk I/O error'), 'open')).toBe('other');
    expect(classifyOpenError(forwarded('Opening the database timed out'), 'open')).toBe('other');
    expect(classifyOpenError(forwarded('Handle is closed'), 'open')).toBe('other');
    expect(classifyOpenError(undefined, 'open')).toBe('other');
    expect(classifyOpenError('a string', 'load')).toBe('other');
  });

  it('the bare invalid-state text only means “held” when the files are being opened', () => {
    expect(classifyOpenError(forwarded('The object is in an invalid state.'), 'load')).toBe('other');
    expect(classifyOpenError(named('InvalidStateError', 'The object is in an invalid state.'), 'migrate')).toBe('other');
  });
});

describe('trying again while waiting', () => {
  it('backs off about 0.25, 0.5, 1, 2 and 4 s', () => {
    expect([0, 1, 2, 3, 4].map((n) => retryDelay(n, () => 0.5))).toEqual([250, 500, 1000, 2000, 4000]);
  });

  it('then tries every 5 s, with jitter so two waiting pages don’t move in step', () => {
    expect(retryDelay(5, () => 0.5)).toBe(5000);
    expect(retryDelay(40, () => 0.5)).toBe(5000);
    const low = retryDelay(5, () => 0);
    const high = retryDelay(5, () => 0.999999);
    expect(low).toBeGreaterThanOrEqual(4000);
    expect(high).toBeLessThanOrEqual(6000);
    expect(high - low).toBeGreaterThan(1500);
  });
});

describe('saying what failed', () => {
  it('names each step of opening the data', () => {
    expect(OPEN_STEPS).toEqual(['tab lock', 'open', 'migrate', 'journal', 'absorb', 'load']);
    for (const step of OPEN_STEPS) {
      expect(detailsLine(new StepError(step, forwarded('disk I/O error')))).toBe(`Details: ${step} · disk I/O error`);
    }
  });

  it('keeps a real error name, but not the plain “Error” every worker error has', () => {
    expect(detailsLine(new StepError('open', named('QuotaExceededError', 'Requested space above quota')))).toBe(
      'Details: open · QuotaExceededError: Requested space above quota',
    );
    expect(detailsLine(new StepError('open', forwarded('The object is in an invalid state.')))).toBe('Details: open · The object is in an invalid state.');
  });

  it('an error from outside the named steps still gets a line', () => {
    expect(detailsLine(forwarded('boom'))).toBe('Details: start · boom');
    expect(detailsLine('plain text')).toBe('Details: start · plain text');
  });
});
