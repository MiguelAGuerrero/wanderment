import { expect, logBox, logLine, openHome, test } from './fixtures';

test('first open shows the welcome and example chips that fill the log box', async ({ page }) => {
  await openHome(page);
  await expect(page.getByText('Log what you just did.')).toBeVisible();
  await page.getByRole('button', { name: 'practiced guitar' }).click();
  await expect(logBox(page)).toHaveValue('practiced guitar');
});

test('@ + "New thread" creates the first thread', async ({ page }) => {
  await openHome(page);
  await logBox(page).fill('practiced scales @play guitar');
  await page.getByRole('button', { name: /New thread “play guitar”/ }).click();
  await expect(logBox(page)).toHaveValue('practiced scales ');
  await logBox(page).press('Enter');
  await expect(page.getByRole('button', { name: /^play guitar\. practiced scales/ })).toBeVisible();
  await expect(page.getByText('Your first thread.')).toBeVisible();
});

test('an unpicked @word is saved as typed and never creates a thread', async ({ page }) => {
  await openHome(page);
  await logLine(page, 'leg day @gymm');
  await expect(page.getByText('Logged', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Activities' }).click();
  await expect(page.getByText('leg day @gymm')).toBeVisible();
  await page.goto('./settings');
  await expect(page.getByText('1 activities · 0 threads')).toBeVisible();
});

test('a next step loads into the log box and clears once logged', async ({ page }) => {
  await openHome(page);
  await logBox(page).fill('practiced scales @play guitar');
  await page.getByRole('button', { name: /New thread “play guitar”/ }).click();
  await logBox(page).press('Enter');

  // The quiet prompt appears under the thread after logging.
  const nextInput = page.getByRole('textbox', { name: 'Optional next step for play guitar' });
  await nextInput.fill('learn the F chord');
  await nextInput.press('Enter');
  const crumb = page.getByRole('button', { name: 'Next step for play guitar: learn the F chord. Double-tap to load into the log box.' });
  await expect(crumb).toBeVisible();

  await crumb.click();
  await expect(logBox(page)).toHaveValue('learn the F chord');
  await expect(page.getByLabel('Doing: play guitar. Remove')).toBeVisible();
  await expect(page.getByText('in the log box')).toBeVisible();

  await logBox(page).fill('learned the F chord, mostly');
  await logBox(page).press('Enter');
  await expect(crumb).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^play guitar\. learned the F chord, mostly/ })).toBeVisible();
  await page.getByRole('tab', { name: 'Activities' }).click();
  await expect(page.getByText('learned the F chord, mostly')).toBeVisible();
});

test('Undo in the toast removes the last activity', async ({ page }) => {
  await openHome(page);
  await logLine(page, 'went for a run');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('Log what you just did.')).toBeVisible();
  await page.getByRole('tab', { name: 'Activities' }).click();
  await expect(page.getByText('Nothing logged yet.')).toBeVisible();
});
