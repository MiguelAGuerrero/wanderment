import { Page } from '@playwright/test';

import { expect, logBox, openHome, test } from './fixtures';

const STEP_CHIP = 'learn the F chord, next step in play guitar. This line counts as it. Remove';

/** A "play guitar" thread whose next step is "learn the F chord". */
async function seed(page: Page) {
  await openHome(page);
  await logBox(page).fill('practiced scales @play guitar');
  await page.getByRole('option', { name: /New thread “play guitar”/ }).click();
  await logBox(page).press('Enter');
  const next = page.getByRole('textbox', { name: 'Optional next step for play guitar' });
  await next.fill('learn the F chord');
  await next.press('Enter');
}

const homeCrumb = (page: Page) => page.getByRole('button', { name: 'learn the F chord Log this' });
const caretOf = (page: Page) => logBox(page).evaluate((el: HTMLInputElement) => [el.selectionStart, el.selectionEnd]);

test('with text in the box, Home’s “Log this” keeps it and the line counts as the step; Undo brings the step back', async ({ page }) => {
  await seed(page);
  await logBox(page).fill('half a page of sketches');
  // Leave the caret after "half".
  await logBox(page).press('Home');
  for (let i = 0; i < 4; i++) await logBox(page).press('ArrowRight');

  await homeCrumb(page).click();
  await expect(logBox(page)).toHaveValue('half a page of sketches');
  await expect(logBox(page)).toBeFocused();
  expect(await caretOf(page)).toEqual([4, 4]);
  await expect(page.getByRole('button', { name: 'Doing: play guitar. Remove' })).toBeVisible();
  const chip = page.getByRole('button', { name: STEP_CHIP });
  await expect(chip).toBeVisible();
  await expect(chip).toContainText('learn the F chord ×');
  // The crumb says the step is attached, not that its text is in the box.
  await expect(page.getByText('attached to your line')).toBeVisible();


  await logBox(page).press('Enter');
  await expect(page.getByText('Logged in play guitar', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^play guitar\s*half a page of sketches/ })).toBeVisible();
  await expect(homeCrumb(page)).toHaveCount(0);
  await expect(chip).toHaveCount(0);
  await expect(logBox(page)).toHaveValue('');

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(homeCrumb(page)).toBeVisible();
  await expect(page.getByRole('button', { name: /^play guitar\s*practiced scales/ })).toBeVisible();
});

test('removing the step chip logs the line as typed in the thread and leaves the step', async ({ page }) => {
  await seed(page);
  await logBox(page).fill('half a page of sketches');
  await homeCrumb(page).click();
  await page.getByRole('button', { name: STEP_CHIP }).click();
  await expect(page.getByRole('button', { name: STEP_CHIP })).toHaveCount(0);
  // The doing chip stays.
  await expect(page.getByRole('button', { name: 'Doing: play guitar. Remove' })).toBeVisible();
  await expect(homeCrumb(page)).toBeVisible();

  await logBox(page).press('Enter');
  await expect(page.getByText('Logged in play guitar', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^play guitar\s*half a page of sketches/ })).toBeVisible();
  await expect(homeCrumb(page)).toBeVisible();
});

test('the step chip is reachable from the keyboard and Space or Enter removes it', async ({ page }) => {
  await seed(page);
  for (const key of ['Enter', 'Space']) {
    await logBox(page).fill('half a page of sketches');
    await homeCrumb(page).click();
    await expect(logBox(page)).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    const chip = page.getByRole('button', { name: STEP_CHIP });
    await expect(chip).toBeFocused();
    await page.keyboard.press(key);
    await expect(chip).toHaveCount(0);
    await expect(logBox(page)).toHaveValue('half a page of sketches');
    await logBox(page).fill('');
  }
});

test('an open @mention is left as it is when “Log this” is tapped', async ({ page }) => {
  await seed(page);
  await logBox(page).fill('tuned up @pla');
  await expect(page.getByRole('option', { name: /^play guitar/ })).toBeVisible();
  await homeCrumb(page).click();
  await expect(logBox(page)).toHaveValue('tuned up @pla');
  await expect(logBox(page)).toBeFocused();
  await expect(page.getByRole('button', { name: STEP_CHIP })).toBeVisible();
});

test('the thread page’s “Log this” keeps the text the same way', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: /^play guitar/ }).first().click();
  const box = page.getByRole('textbox', { name: 'Log in play guitar…' });
  await box.fill('half a page of sketches');
  await page.getByRole('button', { name: 'learn the F chord. Next step for play guitar. Double-tap to count the line in the log box as this step.' }).click();
  await expect(box).toHaveValue('half a page of sketches');
  await expect(box).toBeFocused();
  await expect(page.getByRole('button', { name: STEP_CHIP })).toBeVisible();

  await box.press('Enter');
  await expect(page.getByText('Logged in play guitar', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^half a page of sketches/ })).toBeVisible();
  await expect(page.getByRole('button', { name: '+ What’s next? Set a next step' })).toBeVisible();
});

test('a step edited after “Log this” drops the chip and is not cleared by logging', async ({ page }) => {
  await seed(page);
  await logBox(page).fill('half a page of sketches');
  await homeCrumb(page).click();
  await page.getByRole('button', { name: /^play guitar/ }).first().click();
  await page.getByRole('button', { name: 'Edit next step' }).click();
  const field = page.getByRole('textbox', { name: 'Next step for play guitar' });
  await field.fill('learn the B chord');
  await field.press('Enter');

  const box = page.getByRole('textbox', { name: 'Log in play guitar…' });
  await expect(box).toHaveValue('half a page of sketches');
  await expect(page.getByRole('button', { name: /next step in play guitar/ })).toHaveCount(0);
  await box.press('Enter');
  await expect(page.getByRole('button', { name: /^half a page of sketches/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'learn the B chord. Next step for play guitar. Double-tap to load into the log box.' })).toBeVisible();
});

test('a second crumb replaces the first crumb’s untouched step, and only its own step is used (audit F1)', async ({ page }) => {
  await seed(page);
  await logBox(page).fill('sketched @draw');
  await page.getByRole('option', { name: /New thread “draw”/ }).click();
  await logBox(page).press('Enter');
  const next = page.getByRole('textbox', { name: 'Optional next step for draw' });
  await next.fill('sketch a hand');
  await next.press('Enter');
  await homeCrumb(page).click();
  await expect(logBox(page)).toHaveValue('learn the F chord');
  await page.getByRole('button', { name: 'sketch a hand Log this' }).click();
  await expect(logBox(page)).toHaveValue('sketch a hand');
  await logBox(page).press('Enter');
  await expect(page.getByText('Logged in draw')).toBeVisible();
  await expect(homeCrumb(page)).toBeVisible();
  await expect(page.getByRole('button', { name: 'sketch a hand Log this' })).toHaveCount(0);
});

test('clearing the box after staging offers “Log this” again (audit F5)', async ({ page }) => {
  await seed(page);
  await logBox(page).fill('half a page of sketches');
  await homeCrumb(page).click();
  await expect(page.getByText('attached to your line')).toBeVisible();
  await logBox(page).fill('');
  await expect(homeCrumb(page)).toBeVisible();
  await homeCrumb(page).click();
  await expect(logBox(page)).toHaveValue('learn the F chord');
});
