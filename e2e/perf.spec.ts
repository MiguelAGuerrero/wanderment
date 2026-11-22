import { Page } from '@playwright/test';

import { expect, logBox, test } from './fixtures';
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
  test.slow();
  await page.addInitScript(seedScript, bigBlob(220, 4000));
  await page.goto('./');
  // P-34: the list is on the Wanders tab; Home's heading shows once the data has loaded.
  await expect(page.getByRole('heading', { name: 'Wanderment' })).toBeVisible({ timeout: 20_000 });
  const home = await timedLog(page, 'home log');
  await page.getByRole('tab', { name: 'Activities' }).click();
  await expect(page.getByRole('button', { name: /Show 100 more/ })).toBeVisible({ timeout: 10_000 });
  await page.getByText('Logged', { exact: true }).filter({ visible: true }).waitFor({ state: 'hidden', timeout: 10_000 });
  const activities = await timedLog(page, 'activities log');
  console.log(`log → toast: Home ${home} ms, Activities ${activities} ms`);
  expect(home).toBeLessThan(1500);
  expect(activities).toBeLessThan(1500);
});
