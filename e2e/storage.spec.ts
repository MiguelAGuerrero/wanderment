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
  await expect(page.getByText('3 activities · 2 threads')).toBeVisible();
  await expect(page.getByText('Saved in a database in this browser.')).toBeVisible();
  // Recency shading was off in the old data and stays off.
  await expect(page.getByRole('switch', { name: 'Recency shading' })).not.toBeChecked();

  const keys = await page.evaluate(() => ({
    legacy: localStorage.getItem('wanderment'),
    moved: !!localStorage.getItem('wanderment:moved-to-sqlite'),
  }));
  expect(keys).toEqual({ legacy: null, moved: true });

  // From now on it loads from SQLite.
  await page.reload();
  await expect(page.getByText('3 activities · 2 threads')).toBeVisible();
});

test('falls back to localStorage where SQLite can’t run, and still keeps data', async ({ page }) => {
  await page.addInitScript(() => {
    // Simulate a browser without workers/OPFS for the database.
    Object.defineProperty(window, 'Worker', {
      value: function NoWorker() {
        throw new Error('Workers unavailable');
      },
    });
  });
  await openHome(page);
  await logLine(page, 'offline-ish note');
  await expect(page.getByText('Logged', { exact: true })).toBeVisible();
  await page.reload();
  await page.goto('./settings');
  await expect(page.getByText('1 activities · 0 threads')).toBeVisible();
  await expect(page.getByText(/local storage/)).toBeVisible();
});

test('a second tab waits instead of showing stale data', async ({ page, context }) => {
  await openHome(page);
  await logLine(page, 'first tab');
  await expect(page.getByText('Logged', { exact: true })).toBeVisible();

  const second = await context.newPage();
  await second.goto('./');
  await expect(second.getByText(/open in another tab/)).toBeVisible({ timeout: 20_000 });
  await expect(second.getByRole('textbox')).toHaveCount(0);

  await page.close();
  await second.getByRole('button', { name: 'Reload' }).click();
  await expect(logBox(second)).toBeVisible();
  await second.getByRole('tab', { name: 'Activities' }).click();
  await expect(second.getByText('first tab')).toBeVisible();
});
