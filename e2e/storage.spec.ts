/**
 * Where the data lives and who holds it: the move from the first release's format, the localStorage
 * fallback, a second tab, a page whose files another copy holds, and the "couldn't open" screen.
 * P-89: driven through the app there is now (`/go`); what is stored is read back from an export.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from './fixtures';
import { exported, home, openAndRun, openAndStart, openGo, runner, saved, settled, storedNames } from './goFixture';

const legacy = readFileSync(join(__dirname, '../src/storage/fixtures/legacy-v1.json'), 'utf8');

test('data saved by the first release (localStorage) moves into SQLite once — and is all still there, in the export', async ({ page }) => {
  // Seed the old format before the app's first load only.
  await page.addInitScript((json) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('wanderment', json);
      sessionStorage.setItem('seeded', '1');
    }
  }, legacy);
  await openGo(page);
  // An existing person with only old data: the home, empty, with its prompt.
  await expect(home(page).title).toHaveText('Nothing running');
  await expect(home(page).tiles).toHaveCount(0);
  const before = await exported(page);
  await expect(page.getByText('Saved in a database in this browser.')).toBeVisible();
  await expect(page.getByTestId('go-settings-earlier')).toHaveText('Your earlier wanders and lines are kept, and are in every export.');
  // Every record, as the first release wrote it (repaired on the way in: names trimmed, a blank note dropped, "to" de-duplicated).
  expect(before.threads).toEqual({
    't-guitar': { id: 't-guitar', name: 'play guitar', next: 'learn the F chord', hidden: false, createdAt: '2026-11-01T10:00:00.000Z' },
    't-gym': { id: 't-gym', name: 'get stronger', hidden: true, createdAt: '2026-11-02T10:00:00.000Z' },
  });
  expect(before.activities).toEqual({
    a1: { id: 'a1', text: 'practiced scales', occurredAt: '2026-11-01T10:05:00.000Z', createdAt: '2026-11-01T10:05:00.000Z', toIds: ['t-guitar'] },
    a2: { id: 'a2', text: 'leg day @gymm', occurredAt: '2026-11-02T18:00:00.000Z', createdAt: '2026-11-02T18:01:00.000Z', doingId: 't-gym', toIds: ['t-guitar'] },
    a3: { id: 'a3', text: 'read a novel', occurredAt: '2026-11-03T21:00:00.000Z', createdAt: '2026-11-03T21:00:00.000Z', toIds: [], note: 'chapter 3' },
  });

  // The old key is removed once SQLite has committed (no second copy, which could hit the quota).
  expect(await page.evaluate(() => localStorage.getItem('wanderment'))).toBeNull();

  // From now on it loads from SQLite: the same, record for record.
  await page.reload();
  await expect(settled(page, 'settings')).toBeVisible();
  expect(await exported(page)).toEqual(before);
});

test('falls back to localStorage where SQLite can’t run, and still keeps data', async ({ page }) => {
  await page.addInitScript(() => {
    // As in a browser without workers: there is no Worker at all.
    Object.defineProperty(window, 'Worker', { value: undefined });
  });
  await openAndRun(page, 'offline-ish note');
  await page.reload();
  // It opens where it was left: the run just started.
  await expect(runner(page).screen).toBeVisible();
  expect((await storedNames(page)).routines).toEqual(['offline-ish note']);
  await expect(page.getByText(/local storage/)).toBeVisible();
});

test('a second tab waits instead of showing stale data', async ({ page, context }) => {
  await openAndRun(page, 'first tab');
  await saved(page);

  const second = await context.newPage();
  const secondErrors: Error[] = [];
  second.on('pageerror', (e) => secondErrors.push(e));
  await second.goto('./go');
  await expect(second.getByText(/open in another tab/)).toBeVisible({ timeout: 20_000 });
  await expect(second.getByRole('textbox')).toHaveCount(0);

  // P-29: it opens by itself once the other tab is gone — no Reload — where the first tab left off.
  await page.close();
  await expect(runner(second).screen).toBeVisible();
  expect((await storedNames(second)).routines).toEqual(['first tab']);
  expect(secondErrors).toEqual([]);
});

test('in the localStorage fallback a second tab is blocked too (no last-writer-wins)', async ({ page, context }) => {
  await context.addInitScript(() => {
    // As in a browser without workers: there is no Worker at all.
    Object.defineProperty(window, 'Worker', { value: undefined });
  });
  await openAndStart(page, 'first tab');
  const second = await context.newPage();
  await second.goto('./go');
  await expect(second.getByText(/open in another tab/)).toBeVisible();
  await expect(second.getByRole('textbox')).toHaveCount(0);
});

test('a page whose files another copy holds without the tab lock (a suspended WebKit page) waits, then opens by itself (P-29)', async ({ page, context }) => {
  // The holder has no Web Locks, as a suspended or cached WebKit page that dropped its lock but kept the files.
  await page.addInitScript(() => Object.defineProperty(navigator, 'locks', { value: undefined }));
  await openAndRun(page, 'from the holder');
  await saved(page);

  const second = await context.newPage();
  await second.goto('./go');
  const elsewhere = second.getByText(/^The app is still open somewhere else in this browser/);
  await expect(elsewhere).toBeVisible({ timeout: 20_000 });
  await expect(second.getByText(/^Details: open · .*Access Handle/)).toBeVisible();
  await expect(second.getByRole('textbox')).toHaveCount(0);
  // Never suggests clearing website data (that would delete it).
  await expect(second.getByText(/clear/i)).toHaveCount(0);

  // A reload while waiting just waits again.
  await second.reload();
  await expect(elsewhere).toBeVisible({ timeout: 20_000 });

  await page.close();
  await expect(runner(second).screen).toBeVisible({ timeout: 15_000 });
  expect((await storedNames(second)).routines).toEqual(['from the holder']);
});

test('the “couldn’t open” screen says which step failed, for bug reports, and offers the local copy to download (P-29)', async ({ page }) => {
  await openGo(page);
  // This browser has used SQLite; now opening it fails for some other reason (no Worker).
  await page.addInitScript(() => Object.defineProperty(window, 'Worker', { value: undefined }));
  await page.reload();
  await expect(page.getByText(/^The app couldn’t open its data \(.+\)\. Reload to try again\.$/)).toBeVisible();
  await expect(page.getByText(/^Details: open · TypeError: /)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reload', exact: true })).toBeVisible();
  // Blocked storage keeps its way out: everything this browser holds in local storage, as a file.
  await page.evaluate(() => localStorage.setItem('wanderment:journal', '{"changes":{}}'));
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download this browser’s local copy', exact: true }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^wanderment-raw-\d{4}-\d\d-\d\d\.json$/);
  const raw = JSON.parse(readFileSync((await file.path())!, 'utf8')) as Record<string, string>;
  expect(raw['wanderment:journal']).toBe('{"changes":{}}');
  // Nothing of the app is shown over data it can't read.
  await expect(page.getByTestId('go-home')).toHaveCount(0);
  await page.goto('./go/settings');
  await expect(page.getByText(/^The app couldn’t open its data/)).toBeVisible();
  await expect(page.getByTestId('go-settings')).toHaveCount(0);
});
