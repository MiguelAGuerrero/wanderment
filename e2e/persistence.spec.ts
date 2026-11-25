import { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { addStep, goBackup, importBackup, openGo, openSettings, saved, startThing, storedNames } from './goFixture';

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

/**
 * A change, saved (P-89: was a logged line): the first one says what you're going to do (a routine and
 * its run); a later one is the next small step, typed where the runner asks for it.
 */
async function changeAndSave(page: Page, words: string, first = true) {
  if (first) await startThing(page, words);
  else await addStep(page, words);
  await saved(page);
}

const GRANTED = 'This browser has promised to keep your data.';
const NOT_GRANTED =
  'This browser may clear your data if you don’t visit for a while. Install the app (Share → Add to Home Screen) or export regularly to be safe.';
const INSTALLED = 'Installed on this device — your data is kept with the app.';
const ASK = 'Ask the browser to keep it';

test('granted: asks once after the first saved change, and Settings says the data is kept', async ({ page }) => {
  await stubStorage(page, 'grant');
  await openGo(page);
  expect(await persistCalls(page)).toBe(0);
  await changeAndSave(page, 'first');
  await expect.poll(() => persistCalls(page)).toBe(1);
  await changeAndSave(page, 'second', false);
  expect(await storedNames(page)).toEqual({ lines: [], wanders: [], routines: ['first'] });
  await expect(page.getByText(GRANTED)).toBeVisible();
  await expect(page.getByText('Saved in a database in this browser.')).toBeVisible();
  await expect(page.getByRole('button', { name: ASK })).toHaveCount(0);
  expect(await persistCalls(page)).toBe(1);
});

test('refused: Settings suggests Install / Export, and the button asks again', async ({ page }) => {
  await stubStorage(page, 'refuse');
  await openGo(page);
  await changeAndSave(page, 'first');
  await expect.poll(() => persistCalls(page)).toBe(1);
  await openSettings(page);
  await expect(page.getByText(NOT_GRANTED)).toBeVisible();
  await expect(page.getByText(GRANTED)).toHaveCount(0);
  await page.getByRole('button', { name: ASK }).click();
  await expect.poll(() => persistCalls(page)).toBe(2);
  await expect(page.getByText('The browser didn’t promise this time.')).toBeVisible();
  await expect(page.getByText(NOT_GRANTED)).toBeVisible();
});

test('nothing is asked on load: a load and a reload without a change make no request', async ({ page }) => {
  await stubStorage(page, 'grant');
  await openGo(page);
  await page.reload();
  await openGo(page);
  await openSettings(page);
  await expect(page.getByText(NOT_GRANTED)).toBeVisible();
  expect(await persistCalls(page)).toBe(0);
});

test('a persist() rejection is swallowed', async ({ page }) => {
  await stubStorage(page, 'reject');
  await openGo(page);
  await changeAndSave(page, 'first');
  await expect.poll(() => persistCalls(page)).toBe(1);
  await openSettings(page);
  await page.getByRole('button', { name: ASK }).click();
  await expect.poll(() => persistCalls(page)).toBe(2);
  await expect(page.getByText(NOT_GRANTED)).toBeVisible();
});

test('without the storage API the app works and Settings shows no persistence line', async ({ page }) => {
  await stubStorage(page, 'missing');
  await openGo(page);
  await changeAndSave(page, 'first');
  expect((await storedNames(page)).routines).toEqual(['first']);
  await expect(page.getByText('Saved in a database in this browser.')).toBeVisible();
  for (const line of [GRANTED, NOT_GRANTED, INSTALLED]) await expect(page.getByText(line)).toHaveCount(0);
  await expect(page.getByRole('button', { name: ASK })).toHaveCount(0);
});

test('installed (standalone): Settings says the data is kept with the app', async ({ page }) => {
  await stubStorage(page, 'refuse', { standalone: true });
  await openSettings(page);
  await expect(page.getByText(INSTALLED)).toBeVisible();
  await expect(page.getByText(NOT_GRANTED)).toHaveCount(0);
});

test('in the localStorage fallback with persistence refused, data is still kept', async ({ page }) => {
  await stubStorage(page, 'refuse');
  await page.addInitScript(() => {
    // As in a browser without workers: there is no Worker at all.
    Object.defineProperty(window, 'Worker', { value: undefined });
  });
  await openGo(page);
  await startThing(page, 'offline-ish note');
  await expect.poll(() => persistCalls(page)).toBe(1);
  await page.reload();
  expect((await storedNames(page)).routines).toEqual(['offline-ish note']);
  await expect(page.getByText(/local storage/)).toBeVisible();
  await expect(page.getByText(NOT_GRANTED)).toBeVisible();
});

test.describe('Firefox (may prompt)', () => {
  test.use({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0' });

  test('no automatic request after a change, but the Settings button asks', async ({ page }) => {
    await stubStorage(page, 'grant');
    await openGo(page);
    await changeAndSave(page, 'first');
    await changeAndSave(page, 'second', false);
    expect(await persistCalls(page)).toBe(0);
    await openSettings(page);
    await page.getByRole('button', { name: ASK }).click();
    await expect(page.getByText(GRANTED)).toBeVisible();
    expect(await persistCalls(page)).toBe(1);
  });
});

test('Settings opened before the automatic request updates when it is granted (audit B, finding 2)', async ({ page }) => {
  await stubStorage(page, 'grant');
  await openGo(page);
  await openSettings(page);
  await expect(page.getByText(NOT_GRANTED)).toBeVisible();
  expect(await persistCalls(page)).toBe(0);
  // A change made from Settings (an import) saves and triggers the once-per-session request.
  await importBackup(page, goBackup([{ id: 'm', name: 'Morning', steps: ['Stretch'] }]));
  await expect.poll(() => persistCalls(page)).toBe(1);
  await expect(page.getByText(GRANTED)).toBeVisible();
  await expect(page.getByText(NOT_GRANTED)).toHaveCount(0);
  await expect(page.getByRole('button', { name: ASK })).toHaveCount(0);
});

test('refuse twice, then grant: each answer replaces the last, and focus stays on the result (audit B, findings 3–4)', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.storage.persisted = async () => sessionStorage.getItem('persistGranted') === '1';
    navigator.storage.persist = async () => {
      // Counted in sessionStorage so it survives the reload into Settings.
      const calls = Number(sessionStorage.getItem('persistCalls') ?? 0) + 1;
      sessionStorage.setItem('persistCalls', String(calls));
      if (calls >= 4) sessionStorage.setItem('persistGranted', '1');
      return calls >= 4;
    };
  });
  await openGo(page);
  await changeAndSave(page, 'first');
  await expect.poll(() => persistCalls(page)).toBe(1);
  await openSettings(page);
  const ask = page.getByRole('button', { name: ASK });
  await ask.focus();
  await page.keyboard.press('Enter');
  const refused = page.getByText('The browser didn’t promise this time.');
  await expect(refused).toBeVisible();
  await expect(page.locator('[aria-live="polite"]').filter({ has: refused })).toHaveCount(1);
  await page.keyboard.press('Enter');
  const still = page.getByText('Still no promise from the browser. Exporting a backup keeps your data safe.');
  await expect(still).toBeVisible();
  await expect(refused).toHaveCount(0);
  await page.keyboard.press('Enter');
  const granted = page.getByText(GRANTED);
  await expect(granted).toBeVisible();
  await expect(still).toHaveCount(0);
  await expect(page.getByText(NOT_GRANTED)).toHaveCount(0);
  // The button is gone; focus is on the live line that says so, not lost to the page.
  await expect(page.locator('[aria-live="polite"]').filter({ has: granted })).toBeFocused();
});
