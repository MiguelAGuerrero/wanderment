import { expect, logBox, logLine, openHome, openWanders, test } from './fixtures';

test('first open shows the welcome and example chips that fill the log box', async ({ page }) => {
  await openHome(page);
  await expect(page.getByText('Log what you just did.')).toBeVisible();
  await page.getByRole('button', { name: 'practiced guitar' }).click();
  await expect(logBox(page)).toHaveValue('practiced guitar');
});

test('@ + "New thread" creates the first thread', async ({ page }) => {
  await openWanders(page);
  await logBox(page).fill('practiced scales @play guitar');
  await page.getByRole('option', { name: /New wander “play guitar”/ }).click();
  await expect(logBox(page)).toHaveValue('practiced scales ');
  await logBox(page).press('Enter');
  await expect(page.getByRole('button', { name: /^play guitar\s*practiced scales/ })).toBeVisible();
  await expect(page.getByText('Your first wander.')).toBeVisible();
});

test('an unpicked @word is saved as typed and never creates a thread', async ({ page }) => {
  await openHome(page);
  await logLine(page, 'leg day @gymm');
  await expect(page.getByText('Logged', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Activities' }).click();
  await expect(page.getByText('leg day @gymm')).toBeVisible();
  await page.goto('./settings');
  await expect(page.getByText('1 activities · 0 wanders')).toBeVisible();
});

test('a next step loads into the log box and clears once logged', async ({ page }) => {
  await openWanders(page);
  await logBox(page).fill('practiced scales @play guitar');
  await page.getByRole('option', { name: /New wander “play guitar”/ }).click();
  await logBox(page).press('Enter');

  // The quiet prompt appears under the thread after logging.
  const nextInput = page.getByRole('textbox', { name: 'Optional next step for play guitar' });
  await nextInput.fill('learn the F chord');
  await nextInput.press('Enter');
  const crumb = page.getByRole('button', { name: 'learn the F chord Log this' });
  await expect(crumb).toBeVisible();

  await crumb.click();
  await expect(logBox(page)).toHaveValue('learn the F chord');
  await expect(page.getByLabel('Doing: play guitar. Remove')).toBeVisible();
  await expect(page.getByText('in the log box')).toBeVisible();

  await logBox(page).fill('learned the F chord, mostly');
  await logBox(page).press('Enter');
  await expect(crumb).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^play guitar\s*learned the F chord, mostly/ })).toBeVisible();
  await page.getByRole('tab', { name: 'Activities' }).click();
  await expect(page.getByText('learned the F chord, mostly', { exact: true }).filter({ visible: true })).toBeVisible();
});

test('Undo in the toast removes the last activity', async ({ page }) => {
  await openHome(page);
  await logLine(page, 'went for a run');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('Log what you just did.')).toBeVisible();
  await page.getByRole('tab', { name: 'Activities' }).click();
  await expect(page.getByText('Nothing logged yet.')).toBeVisible();
});

test('the toast leaves on its own after about 6 s, but not while hovered', async ({ page }) => {
  await openHome(page);
  await logLine(page, 'stretched');
  const toast = page.getByText('Tap for details').filter({ visible: true });
  await expect(toast).toBeVisible();
  await toast.hover();
  await page.waitForTimeout(7000);
  await expect(toast).toBeVisible();
  await page.mouse.move(5, 5);
  await expect(toast).toHaveCount(0, { timeout: 8000 });
});

test('on a thread page, removing the preset doing chip really logs without it', async ({ page }) => {
  await openWanders(page);
  await logBox(page).fill('scales @play guitar');
  await page.getByRole('option', { name: /New wander “play guitar”/ }).click();
  await logBox(page).press('Enter');
  await page.getByRole('button', { name: /^play guitar\s*scales/ }).click();
  const box = page.getByRole('textbox', { name: 'Log in play guitar…' });
  await box.fill('unrelated thing');
  await page.getByRole('button', { name: 'Doing: play guitar. Remove' }).click();
  await expect(page.getByRole('button', { name: 'Doing: play guitar. Remove' })).toHaveCount(0);
  await box.press('Enter');
  await expect(page.getByText('Logged', { exact: true }).filter({ visible: true })).toBeVisible();
});

test('holding the toast on a stacked screen keeps it up; hiding a thread can be undone', async ({ page }) => {
  await openWanders(page);
  await logBox(page).fill('scales @play guitar');
  await page.getByRole('option', { name: /New wander “play guitar”/ }).click();
  await logBox(page).press('Enter');
  await page.getByRole('button', { name: /^play guitar\s*scales/ }).click();
  await page.getByRole('textbox', { name: 'Log in play guitar…' }).fill('arpeggios');
  await page.getByRole('textbox', { name: 'Log in play guitar…' }).press('Enter');
  const toast = page.getByText('Tap for details').filter({ visible: true });
  await toast.hover();
  await page.waitForTimeout(7000);
  await expect(toast).toBeVisible();
  await page.mouse.move(5, 5);
  await expect(toast).toHaveCount(0, { timeout: 8000 });

  await page.getByRole('button', { name: 'Hide' }).click();
  await expect(page.getByText('Hid “play guitar”').filter({ visible: true })).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).filter({ visible: true }).click();
  await expect(page.getByRole('button', { name: /^play guitar\s*arpeggios/ })).toBeVisible();
});
