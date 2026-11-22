import { Page } from '@playwright/test';

import { expect, logBox, logLine, openHome, test } from './fixtures';

/**
 * P-29 part B: a page holds the data only while it's visible. Headless Chromium keeps every page
 * visible, so hiding is emulated: the page's document reports the state, and the event fires.
 */
async function setVisibility(page: Page, state: 'hidden' | 'visible') {
  await page.evaluate((v) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => v === 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);
}

const anotherTab = (page: Page) => page.getByText(/^Wanderment is open in another tab or window\./);
const logButton = (page: Page) => page.getByRole('button', { name: 'Log', exact: true });
const reconnecting = (page: Page) => page.getByRole('button', { name: 'Reconnecting…', exact: true });

async function seeActivity(page: Page, text: string) {
  await page.getByRole('tab', { name: 'Activities' }).click();
  await expect(page.getByText(text, { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Home' }).click();
}

/**
 * Tries to open every file of expo-sqlite's OPFS pool from a throwaway worker in `page`, as
 * another copy of the app would. ok: nobody holds them.
 */
const takeFiles = (page: Page) =>
  page.evaluate(async () => {
    const src = `onmessage = async () => {
      try {
        const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('expo-sqlite');
        const handles = [];
        for await (const [, h] of dir) if (h.kind === 'file') handles.push(await h.createSyncAccessHandle());
        handles.forEach((h) => h.close());
        postMessage({ ok: true, files: handles.length });
      } catch (e) {
        postMessage({ ok: false, name: e.name });
      }
    }`;
    const worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    return await new Promise<{ ok: boolean; files?: number; name?: string }>((resolve) => {
      worker.onmessage = (e) => {
        worker.terminate();
        resolve(e.data);
      };
      worker.postMessage(null);
    });
  });

test('a hidden page lets a waiting one open by itself; shown again, it takes the data back with the other page’s changes and its draft (P-29)', async ({ page, context }) => {
  await openHome(page);
  await logLine(page, 'from A');
  await expect(page.getByText('Logged', { exact: true })).toBeVisible();

  const b = await context.newPage();
  await b.goto('./');
  await expect(anotherTab(b)).toBeVisible({ timeout: 20_000 });
  await expect(b.getByText(/^Details: tab lock · /)).toBeVisible();
  // A reload would wipe this mark.
  await b.evaluate(() => ((window as unknown as { stillHere: boolean }).stillHere = true));

  // A typed line in A, not logged, comes through the hand-off.
  await logBox(page).fill('half-typed in A');
  await setVisibility(page, 'hidden');
  await expect(logBox(b)).toBeVisible({ timeout: 15_000 });
  expect(await b.evaluate(() => (window as unknown as { stillHere?: boolean }).stillHere)).toBe(true);
  await seeActivity(b, 'from A');
  // A doesn't hold the data now: its data stays, logging waits.
  await expect(reconnecting(page)).toBeDisabled();
  await seeActivity(page, 'from A');

  await logLine(b, 'from B');
  await expect(b.getByText('Logged', { exact: true }).first()).toBeVisible();

  // Hand-back: B goes to the background, A comes forward.
  await setVisibility(b, 'hidden');
  await setVisibility(page, 'visible');
  await expect(logButton(page)).toBeEnabled({ timeout: 15_000 });
  await expect(logBox(page)).toHaveValue('half-typed in A');
  await seeActivity(page, 'from B');

  // Desktop rule: with A visible and holding, B shown again keeps its data with "Reconnecting…",
  // then waits with the "another tab" copy — A never lets go because B wants it.
  await setVisibility(b, 'visible');
  await expect(reconnecting(b)).toBeVisible();
  await expect(anotherTab(b)).toBeVisible({ timeout: 10_000 });
  await expect(logButton(page)).toBeEnabled();
  await logLine(page, 'A still writes');
  await expect(page.getByText('Logged', { exact: true }).first()).toBeVisible();
});

test('canary: hiding the page really frees the database files (the expo-sqlite worker shutdown), and showing it takes them back (P-29)', async ({ page, context }) => {
  const warnings: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'warning') warnings.push(m.text());
  });
  await openHome(page);
  await logLine(page, 'kept');
  await expect(page.getByText('Logged', { exact: true })).toBeVisible();

  // A same-origin page that isn't the app, to try the files from.
  const probe = await context.newPage();
  await probe.goto('./favicon.ico');
  expect(await takeFiles(probe)).toEqual({ ok: false, name: 'NoModificationAllowedError' });

  await setVisibility(page, 'hidden');
  await expect.poll(() => takeFiles(probe), { timeout: 10_000 }).toEqual({ ok: true, files: expect.any(Number) });
  expect((await takeFiles(probe)).files).toBeGreaterThan(0);

  await setVisibility(page, 'visible');
  await expect(logButton(page)).toBeVisible({ timeout: 15_000 });
  expect(await takeFiles(probe)).toEqual({ ok: false, name: 'NoModificationAllowedError' });
  await seeActivity(page, 'kept');
  // If Expo changes how it sets up its worker, the app says so (and the poll above times out).
  expect(warnings.filter((w) => /database worker/.test(w))).toEqual([]);
});

test('update reloads with another page in the background never lock the page out (P-29)', async ({ page, context, request }) => {
  // Notes (across reloads) if the waiting screen ever showed.
  await page.addInitScript(() => {
    new MutationObserver(() => {
      if (/open in another tab|still open somewhere else/.test(document.body?.innerText ?? '')) sessionStorage.setItem('sawWaiting', '1');
    }).observe(document, { subtree: true, childList: true, characterData: true });
  });
  await openHome(page);
  await page.waitForFunction(async () => !!(await navigator.serviceWorker.ready).active && !!navigator.serviceWorker.controller);

  // A second copy, sent to the background (an old tab).
  const second = await context.newPage();
  await second.goto('./');
  await expect(anotherTab(second)).toBeVisible({ timeout: 20_000 });
  await setVisibility(second, 'hidden');
  // It hears each time the page lets go of the data ("released" pings).
  await second.evaluate(() =>
    window.addEventListener('storage', (e) => {
      const w = window as unknown as { releases?: number };
      if (e.key === 'wanderment:released' && e.newValue) w.releases = (w.releases ?? 0) + 1;
    }),
  );

  for (let i = 1; i <= 3; i++) {
    await logLine(page, `before update ${i}`);
    await expect(page.getByText('Logged', { exact: true })).toBeVisible();
    await request.post('/__e2e/bump-sw');
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());
    await expect(page.getByText('A new version is ready')).toBeVisible();
    await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: 'Reload to update' }).click()]);
    await expect(logBox(page)).toBeVisible({ timeout: 15_000 });
  }
  expect(await page.evaluate(() => sessionStorage.getItem('sawWaiting'))).toBeNull();
  // Each update reload let go of the data first (and waited for it), rather than racing its own files.
  expect(await second.evaluate(() => (window as unknown as { releases?: number }).releases)).toBe(3);
  await page.getByRole('tab', { name: 'Activities' }).click();
  for (let i = 1; i <= 3; i++) await expect(page.getByText(`before update ${i}`, { exact: true })).toBeVisible();
});
