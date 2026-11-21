import { expect, logBox, logLine, openHome, test } from './fixtures';

test('"No thread" filter and Attach…', async ({ page }) => {
  await openHome(page);
  await logBox(page).fill('practiced scales @play guitar');
  await page.getByRole('option', { name: /New thread “play guitar”/ }).click();
  await logBox(page).press('Enter');
  await logLine(page, 'read a novel');

  await page.getByRole('tab', { name: 'Activities' }).click();
  await page.getByRole('tab', { name: 'No thread' }).click();
  await expect(page.getByText('read a novel')).toBeVisible();
  await expect(page.getByText('practiced scales', { exact: true }).filter({ visible: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Attach…' }).click();
  await page.getByRole('button', { name: 'play guitar: attach' }).click();
  await expect(page.getByText('Everything has a thread.')).toBeVisible();
  await page.getByRole('tab', { name: 'All' }).click();
  await expect(page.getByText('→ to play guitar', { exact: true }).filter({ visible: true })).toHaveCount(2);
});

test('data survives a reload', async ({ page }) => {
  await openHome(page);
  await logLine(page, 'watered the plants');
  await expect(page.getByText('Logged', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('tab', { name: 'Activities' }).click();
  await expect(page.getByText('watered the plants')).toBeVisible();
});

test('deep link to /wanderment/activities', async ({ page }) => {
  await page.goto('./activities');
  await expect(page.getByText('Activities', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('tab', { name: 'No thread' })).toBeVisible();
});
