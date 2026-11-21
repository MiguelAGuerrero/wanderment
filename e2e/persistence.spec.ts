import { Page } from '@playwright/test';

import { expect, logLine, openHome, test } from './fixtures';

/**
 * Stubs navigator.storage before the app loads. persist() calls are counted in sessionStorage,
 * so the count survives reloads (page.goto). 'grant' makes persisted() true from then on.
 */
async function stubStorage(page: Page, mode: 'grant' | 'refuse' | 'reject' | 'missing', extra: { standalone?: boolean } = {}) {
  await page.addInitScript(
    ([mode, standalone]) => {
      if (standalone) Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
      if (mode === 'missing') {
        Object.defineProperty(navigator, 'storage', { value: undefined, configurable: true });
        return;
      }
      const count = () => Number(sessionStorage.getItem('persistCalls') ?? 0);
      navigator.storage.persisted = async () => sessionStorage.getItem('persistGranted') === '1';
      navigator.storage.persist = async () => {
        sessionStorage.setItem('persistCalls', String(count() + 1));
        if (mode === 'reject') throw new Error('stubbed persist() rejection');
        if (mode === 'grant') sessionStorage.setItem('persistGranted', '1');
        return mode === 'grant';
      };
    },
    [mode, !!extra.standalone] as const,
  );
}

const persistCalls = (page: Page) => page.evaluate(() => Number(sessionStorage.getItem('persistCalls') ?? 0));

/** Logs a line and waits until SQLite has committed it (the journal is cleared after each write). */
async function logAndSave(page: Page, text: string) {
  await logLine(page, text);
  await expect(page.getByText('Logged', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('wanderment:journal'))).toBeNull();
}

const GRANTED = 'This browser has promised to keep your data.';
const NOT_GRANTED =
  'This browser may clear your data if you don’t visit for a while. Install the app (Share → Add to Home Screen) or export regularly to be safe.';
const INSTALLED = 'Installed on this device — your data is kept with the app.';
const ASK = 'Ask the browser to keep it';

test('granted: asks once after the first log, and Settings says the data is kept', async ({ page }) => {
  await stubStorage(page, 'grant');
  await openHome(page);
  expect(await persistCalls(page)).toBe(0);
  await logAndSave(page, 'first');
  await expect.poll(() => persistCalls(page)).toBe(1);
  await logAndSave(page, 'second');
  await page.goto('./settings');
  await expect(page.getByText('2 activities · 0 threads')).toBeVisible();
  await expect(page.getByText(GRANTED)).toBeVisible();
  await expect(page.getByText('Saved in a database in this browser.')).toBeVisible();
  await expect(page.getByRole('button', { name: ASK })).toHaveCount(0);
  expect(await persistCalls(page)).toBe(1);
});

test('refused: Settings suggests Install / Export, and the button asks again', async ({ page }) => {
  await stubStorage(page, 'refuse');
  await openHome(page);
  await logAndSave(page, 'first');
  await expect.poll(() => persistCalls(page)).toBe(1);
  await page.goto('./settings');
  await expect(page.getByText(NOT_GRANTED)).toBeVisible();
  await expect(page.getByText(GRANTED)).toHaveCount(0);
  await page.getByRole('button', { name: ASK }).click();
  await expect.poll(() => persistCalls(page)).toBe(2);
  await expect(page.getByText('The browser didn’t promise this time.')).toBeVisible();
  await expect(page.getByText(NOT_GRANTED)).toBeVisible();
});

test('nothing is asked on load: a load and a reload without logging make no request', async ({ page }) => {
  await stubStorage(page, 'grant');
  await openHome(page);
  await page.reload();
  await openHome(page);
  await page.goto('./settings');
  await expect(page.getByText(NOT_GRANTED)).toBeVisible();
  expect(await persistCalls(page)).toBe(0);
});

test('a persist() rejection is swallowed', async ({ page }) => {
  await stubStorage(page, 'reject');
  await openHome(page);
  await logAndSave(page, 'first');
  await expect.poll(() => persistCalls(page)).toBe(1);
  await page.goto('./settings');
  await page.getByRole('button', { name: ASK }).click();
  await expect.poll(() => persistCalls(page)).toBe(2);
  await expect(page.getByText(NOT_GRANTED)).toBeVisible();
});

test('without the storage API the app works and Settings shows no persistence line', async ({ page }) => {
  await stubStorage(page, 'missing');
  await openHome(page);
  await logAndSave(page, 'first');
  await page.goto('./settings');
  await expect(page.getByText('1 activities · 0 threads')).toBeVisible();
  await expect(page.getByText('Saved in a database in this browser.')).toBeVisible();
  for (const line of [GRANTED, NOT_GRANTED, INSTALLED]) await expect(page.getByText(line)).toHaveCount(0);
  await expect(page.getByRole('button', { name: ASK })).toHaveCount(0);
});

test('installed (standalone): Settings says the data is kept with the app', async ({ page }) => {
  await stubStorage(page, 'refuse', { standalone: true });
  await page.goto('./settings');
  await expect(page.getByText(INSTALLED)).toBeVisible();
  await expect(page.getByText(NOT_GRANTED)).toHaveCount(0);
});

test('in the localStorage fallback with persistence refused, data is still kept', async ({ page }) => {
  await stubStorage(page, 'refuse');
  await page.addInitScript(() => {
    // As in a browser without workers: there is no Worker at all.
    Object.defineProperty(window, 'Worker', { value: undefined });
  });
  await openHome(page);
  await logLine(page, 'offline-ish note');
  await expect(page.getByText('Logged', { exact: true })).toBeVisible();
  await expect.poll(() => persistCalls(page)).toBe(1);
  await page.reload();
  await page.goto('./settings');
  await expect(page.getByText('1 activities · 0 threads')).toBeVisible();
  await expect(page.getByText(/local storage/)).toBeVisible();
  await expect(page.getByText(NOT_GRANTED)).toBeVisible();
});

test.describe('Firefox (may prompt)', () => {
  test.use({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0' });

  test('no automatic request after a log, but the Settings button asks', async ({ page }) => {
    await stubStorage(page, 'grant');
    await openHome(page);
    await logAndSave(page, 'first');
    await logAndSave(page, 'second');
    expect(await persistCalls(page)).toBe(0);
    await page.goto('./settings');
    await page.getByRole('button', { name: ASK }).click();
    await expect(page.getByText(GRANTED)).toBeVisible();
    expect(await persistCalls(page)).toBe(1);
  });
});
