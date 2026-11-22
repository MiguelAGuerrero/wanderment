import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, logBox, logLine, openHome, test } from './fixtures';

const legacy = readFileSync(join(__dirname, '../src/storage/fixtures/legacy-v1.json'), 'utf8');

test('data saved by the first release (localStorage) moves into SQLite once', async ({ page }) => {
  // Seed the old format before the app's first load only.
  await page.addInitScript((json) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('wanderment', json);
      sessionStorage.setItem('seeded', '1');
    }
  }, legacy);
  await openHome(page);
  await expect(page.getByRole('button', { name: /^play guitar\s*\S/ })).toBeVisible();
  await expect(page.getByText('learn the F chord')).toBeVisible();
  await page.goto('./settings');
  await expect(page.getByText('3 activities · 2 wanders')).toBeVisible();
  await expect(page.getByText('Saved in a database in this browser.')).toBeVisible();
  // Recency shading was off in the old data and stays off.
  await expect(page.getByRole('switch', { name: 'Recency shading' })).not.toBeChecked();

  // The old key is removed once SQLite has committed (no second copy, which could hit the quota).
  expect(await page.evaluate(() => localStorage.getItem('wanderment'))).toBeNull();

  // From now on it loads from SQLite.
  await page.reload();
  await expect(page.getByText('3 activities · 2 wanders')).toBeVisible();
});

test('falls back to localStorage where SQLite can’t run, and still keeps data', async ({ page }) => {
  await page.addInitScript(() => {
    // Simulate a browser without workers/OPFS for the database.
    // As in a browser without workers: there is no Worker at all.
    Object.defineProperty(window, 'Worker', { value: undefined });
  });
  await openHome(page);
  await logLine(page, 'offline-ish note');
  await expect(page.getByText('Logged', { exact: true })).toBeVisible();
  await page.reload();
  await page.goto('./settings');
  await expect(page.getByText('1 activities · 0 wanders')).toBeVisible();
  await expect(page.getByText(/local storage/)).toBeVisible();
});

test('a second tab waits instead of showing stale data', async ({ page, context }) => {
  await openHome(page);
  await logLine(page, 'first tab');
  await expect(page.getByText('Logged', { exact: true })).toBeVisible();

  const second = await context.newPage();
  const secondErrors: Error[] = [];
  second.on('pageerror', (e) => secondErrors.push(e));
  await second.goto('./');
  await expect(second.getByText(/open in another tab/)).toBeVisible({ timeout: 20_000 });
  await expect(second.getByRole('textbox')).toHaveCount(0);

  // P-29: it opens by itself once the other tab is gone — no Reload.
  await page.close();
  await expect(logBox(second)).toBeVisible();
  await second.getByRole('tab', { name: 'Activities' }).click();
  await expect(second.getByText('first tab')).toBeVisible();
  expect(secondErrors).toEqual([]);
});

test('in the localStorage fallback a second tab is blocked too (no last-writer-wins)', async ({ page, context }) => {
  await context.addInitScript(() => {
    // As in a browser without workers: there is no Worker at all.
    Object.defineProperty(window, 'Worker', { value: undefined });
  });
  await openHome(page);
  await logLine(page, 'first tab');
  const second = await context.newPage();
  await second.goto('./');
  await expect(second.getByText(/open in another tab/)).toBeVisible();
  await expect(second.getByRole('textbox')).toHaveCount(0);
});

test('a page whose files another copy holds without the tab lock (a suspended WebKit page) waits, then opens by itself (P-29)', async ({ page, context }) => {
  // The holder has no Web Locks, as a suspended or cached WebKit page that dropped its lock but kept the files.
  await page.addInitScript(() => Object.defineProperty(navigator, 'locks', { value: undefined }));
  await openHome(page);
  await logLine(page, 'from the holder');
  await expect(page.getByText('Logged', { exact: true })).toBeVisible();

  const second = await context.newPage();
  await second.goto('./');
  const elsewhere = second.getByText(/^Wanderment is still open somewhere else in this browser/);
  await expect(elsewhere).toBeVisible({ timeout: 20_000 });
  await expect(second.getByText(/^Details: open · .*Access Handle/)).toBeVisible();
  await expect(second.getByRole('textbox')).toHaveCount(0);
  // Never suggests clearing website data (that would delete it).
  await expect(second.getByText(/clear/i)).toHaveCount(0);

  // A reload while waiting just waits again.
  await second.reload();
  await expect(elsewhere).toBeVisible({ timeout: 20_000 });

  await page.close();
  await expect(logBox(second)).toBeVisible({ timeout: 15_000 });
  await second.getByRole('tab', { name: 'Activities' }).click();
  await expect(second.getByText('from the holder')).toBeVisible();
});

test('the “couldn’t open” screen says which step failed, for bug reports (P-29)', async ({ page }) => {
  await openHome(page);
  // This browser has used SQLite; now opening it fails for some other reason (no Worker).
  await page.addInitScript(() => Object.defineProperty(window, 'Worker', { value: undefined }));
  await page.reload();
  await expect(page.getByText(/^Wanderment couldn’t open its data \(.+\)\. Reload to try again\.$/)).toBeVisible();
  await expect(page.getByText(/^Details: open · TypeError: /)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reload', exact: true })).toBeVisible();
});
