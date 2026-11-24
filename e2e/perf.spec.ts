import { Page } from '@playwright/test';

import { expect, logBox, openSheet, test } from './fixtures';
import { bigBlob, seedScript } from './graphFixture';

/** Time from Return to the toast, with a large history (220 threads, 4000 activities). */
async function timedLog(page: Page, text: string) {
  await logBox(page).fill(text);
  const t0 = Date.now();
  await logBox(page).press('Enter');
  await expect(page.getByText('Logged', { exact: true }).filter({ visible: true })).toBeVisible();
  return Date.now() - t0;
}

test('logging stays quick on Home and Activities with a large history', async ({ page }) => {
  // A timing benchmark: it runs at the machine's real speed (verify's full run and CI). Under the
  // CI-speed pass's CPU throttle (E2E_SLOW) it would measure the throttle, and the 4,000-line load
  // outlasts its waits — that load time is P-46's to bring down.
  test.skip(!!process.env.E2E_SLOW, 'timing benchmark: not meaningful under CPU throttling (P-46)');
  test.slow();
  await page.addInitScript(seedScript, bigBlob(220, 4000));
  await page.goto('./activities'); // P-83: Map is retired — the home's sheet on Activities (a log box)
  // P-83: Map (the "Home" timed here) is retired; the sheet's Wanders box stands in for it, once the data has loaded.
  await expect(logBox(page)).toBeVisible({ timeout: 20_000 });
  await openSheet(page, 'Wanders');
  const home = await timedLog(page, 'home log');
  await openSheet(page, 'Activities'); // P-58: a section of Home's sheet (was a tab)
  await expect(page.getByRole('button', { name: /Show 100 more/ })).toBeVisible({ timeout: 10_000 });
  await page.getByText('Logged', { exact: true }).filter({ visible: true }).waitFor({ state: 'hidden', timeout: 10_000 });
  const activities = await timedLog(page, 'activities log');
  console.log(`log → toast: Home ${home} ms, Activities ${activities} ms`);
  expect(home).toBeLessThan(1500);
  expect(activities).toBeLessThan(1500);
});
