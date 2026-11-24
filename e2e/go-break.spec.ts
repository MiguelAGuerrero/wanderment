/**
 * P-86 (B-11 slice 1): Break it down (J05) and what a run leaves behind (B-11 §9c): a run-only
 * sequence made in a sheet over an untouched runner, marked "This run only" with "Keep in <routine>",
 * and — on leaving the level — this run's changes shown once, each with Keep, and Keep all, never
 * blocking.
 */
import { expect, test } from './fixtures';
import { arrived, home, place, runner, settled, startGo } from './goFixture';

const AT_CV = [{ id: 'r1', routine: 'apply', at: 1, status: 'running' as const }];
const smaller = (page: import('@playwright/test').Page) => page.getByRole('textbox', { name: 'A smaller step', exact: true });

async function breakDown(page: import('@playwright/test').Page, steps: string[]) {
  await runner(page).middle.click();
  const sheet = await arrived(page, 'go-break');
  for (const s of steps) {
    await smaller(page).fill(s);
    await smaller(page).press('Enter');
  }
  await expect(sheet.getByTestId('go-break-step')).toHaveCount(steps.length);
  return sheet;
}

test('J05-a: the step is split in a sheet over an untouched runner; Return adds a step; nothing changes until Step in', async ({ page }) => {
  await startGo(page, AT_CV, 'runner');
  const r = runner(page);
  const before = { note: await place(r.note), next: await place(r.next), middle: await place(r.middle) };
  await r.middle.click();
  const sheet = await arrived(page, 'go-break');
  // Titled with the step's own words; the field has the focus; one filled button, unavailable until there is a step.
  await expect(sheet.getByRole('heading', { level: 2 })).toHaveText('Tailor the CV');
  await expect(smaller(page)).toBeFocused();
  const stepIn = sheet.getByRole('button', { name: 'Step in', exact: true });
  await expect(stepIn).toBeDisabled();
  await smaller(page).fill('Open the job ad beside the CV');
  await smaller(page).press('Enter');
  await smaller(page).fill('Mark what they ask for');
  await smaller(page).press('Enter');
  await expect(sheet.getByTestId('go-break-step')).toHaveText(['Open the job ad beside the CV', 'Mark what they ask for']);
  await expect(smaller(page)).toHaveValue('');
  await expect(smaller(page)).toBeFocused();
  await expect(stepIn).toBeEnabled();
  // The runner beneath has not moved or changed, and can't be reached.
  expect({ note: await place(r.note), next: await place(r.next), middle: await place(r.middle) }).toEqual(before);
  await expect(r.words).toHaveText('Tailor the CV');
  expect(await r.screen.evaluate((el) => !!el.querySelector('[inert]'))).toBe(true);
  // One typed by mistake comes out again.
  await sheet.getByRole('button', { name: 'Remove Mark what they ask for', exact: true }).click();
  await expect(sheet.getByTestId('go-break-step')).toHaveText(['Open the job ad beside the CV']);
});

test('J05-a: Esc, Back and Close put the sheet away with the steps typed so far kept; a reload keeps them too', async ({ page }) => {
  await startGo(page, AT_CV, 'runner');
  const r = runner(page);
  let sheet = await breakDown(page, ['Open the job ad beside the CV']);
  await smaller(page).fill('Mark what');
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await expect(r.words).toHaveText('Tailor the CV');
  // Focus is back on what opened it.
  await expect(r.middle).toBeFocused();
  await r.middle.click();
  sheet = await arrived(page, 'go-break');
  await expect(sheet.getByTestId('go-break-step')).toHaveText(['Open the job ad beside the CV']);
  await expect(smaller(page)).toHaveValue('Mark what');
  // Back closes the sheet first and leaves the runner where it is.
  await page.goBack();
  await expect(sheet).toHaveCount(0);
  await expect(page).toHaveURL(/\/go\/run\/r1$/);
  await expect(r.words).toHaveText('Tailor the CV');
  await r.middle.click();
  sheet = await arrived(page, 'go-break');
  await sheet.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(sheet).toHaveCount(0);
  await page.reload();
  await runner(page).middle.click();
  sheet = await arrived(page, 'go-break');
  await expect(sheet.getByTestId('go-break-step')).toHaveText(['Open the job ad beside the CV']);
  await expect(smaller(page)).toHaveValue('Mark what');
});

test('J05-b: Step in runs the first of them; the change is this run’s own, with "Keep in <routine>"; the routine is untouched', async ({ page }) => {
  await startGo(page, AT_CV, 'runner');
  const r = runner(page);
  const sheet = await breakDown(page, ['Open the job ad beside the CV', 'Mark what they ask for']);
  await sheet.getByRole('button', { name: 'Step in', exact: true }).click();
  await expect(sheet).toHaveCount(0);
  await expect(r.words).toHaveText('Open the job ad beside the CV');
  await expect(r.context).toHaveAccessibleName('Apply to Initech Tailor the CV See it all');
  await expect(r.done).toHaveAccessibleName('Done with Tailor the CV');
  await expect(r.note).toBeFocused();
  await expect(r.notice.getByRole('button', { name: 'Undo Break it down', exact: true })).toBeVisible();

  await r.handle.click();
  await expect(r.panel.getByText('This run only', { exact: true })).toBeVisible();
  await expect(r.panel.getByRole('button', { name: 'Keep in Apply to Initech', exact: true })).toBeVisible();
  // "Keep in" is outlined: Next stays the one filled button.
  expect(await r.panel.getByRole('button', { name: 'Keep in Apply to Initech', exact: true }).evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  await page.keyboard.press('Escape');

  // The routine itself still has the one step.
  await page.goBack();
  await home(page).screen.getByRole('button', { name: 'More for Apply to Initech', exact: true }).click();
  const editor = settled(page, 'editor');
  await expect(editor.getByRole('textbox', { name: 'Step: Tailor the CV', exact: true })).toBeVisible();
  await expect(editor.getByText('Open the job ad beside the CV')).toHaveCount(0);
});

test('J05: Undo after Break it down puts the step back as it was', async ({ page }) => {
  await startGo(page, AT_CV, 'runner');
  const r = runner(page);
  const sheet = await breakDown(page, ['Open the job ad beside the CV']);
  await sheet.getByRole('button', { name: 'Step in', exact: true }).click();
  await r.notice.getByRole('button', { name: 'Undo Break it down', exact: true }).click();
  await expect(r.words).toHaveText('Tailor the CV');
  await expect(r.context).toHaveAccessibleName('Apply to Initech See it all');
  await r.handle.click();
  await expect(r.panel.getByText('This run only', { exact: true })).toHaveCount(0);
});

test('§9c: leaving a level with this run’s changes shows them once, each with Keep, and Keep all — it has already gone on, and closing keeps nothing', async ({ page }) => {
  await startGo(page, AT_CV, 'runner');
  const r = runner(page);
  const sheet = await breakDown(page, ['Open the job ad beside the CV', 'Mark what they ask for']);
  await sheet.getByRole('button', { name: 'Step in', exact: true }).click();
  await r.next.click();
  await expect(r.words).toHaveText('Mark what they ask for');
  // The last of them: the level is left, and the run has already gone on to the parent's next step.
  await r.next.click();
  const keep = await arrived(page, 'go-keep');
  await expect(r.words).toHaveText('Write the cover letter');
  await expect(keep.getByRole('heading', { level: 2 })).toHaveText('Keep in Apply to Initech');
  await expect(keep.getByTestId('go-keep-row')).toHaveCount(1);
  await expect(keep.getByTestId('go-keep-row')).toContainText('Tailor the CV');
  await expect(keep.getByTestId('go-keep-row')).toContainText('Open the job ad beside the CV · Mark what they ask for');
  await expect(keep.getByRole('button', { name: 'Keep Tailor the CV in Apply to Initech', exact: true })).toBeVisible();
  // Keep all is the sheet's one filled button, and has the focus.
  const all = keep.getByRole('button', { name: 'Keep all', exact: true });
  await expect(all).toBeFocused();
  expect(await all.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgb(244, 241, 232)');
  // No explanation text: a heading, the change, and the buttons.
  await expect(keep.getByText(/\?|would you|do you want/i)).toHaveCount(0);

  // Closing keeps nothing and blocks nothing.
  await page.keyboard.press('Escape');
  await expect(keep).toHaveCount(0);
  await expect(r.words).toHaveText('Write the cover letter');
  // Shown once: going on does not ask again.
  await r.next.click();
  await expect(r.words).toHaveText('Proofread out loud');
  await expect(page.getByTestId('go-keep')).toHaveCount(0);
  // It can still be kept from the panel.
  await r.handle.click();
  await expect(r.panel.getByRole('button', { name: 'Keep in Apply to Initech', exact: true })).toBeVisible();
});

test('§9c: Keep makes the change the routine’s, with Undo; Done on a level asks the same way', async ({ page }) => {
  await startGo(page, AT_CV, 'runner');
  const r = runner(page);
  const sheet = await breakDown(page, ['Open the job ad beside the CV', 'Mark what they ask for']);
  await sheet.getByRole('button', { name: 'Step in', exact: true }).click();
  // Done leaves the level, for whatever reason: the same ask.
  await r.done.click();
  const keep = await arrived(page, 'go-keep');
  await expect(r.words).toHaveText('Write the cover letter');
  await keep.getByRole('button', { name: 'Keep all', exact: true }).click();
  await expect(keep).toHaveCount(0);
  await expect(r.notice.getByRole('button', { name: 'Undo Keep', exact: true })).toBeVisible();
  // Nothing of this run's own is left.
  await r.handle.click();
  await expect(r.panel.getByText('This run only', { exact: true })).toHaveCount(0);
  await expect(r.panel.getByRole('button', { name: /^Keep in/ })).toHaveCount(0);
  await page.keyboard.press('Escape');
  // The routine now holds the breakdown: Tailor the CV is a routine in it.
  await r.context.click();
  const allScreen = settled(page, 'all');
  await expect(allScreen.locator('[data-testid="go-all-row"][data-kind="routine"]').filter({ hasText: 'Tailor the CV' })).toHaveCount(1);
  await expect(allScreen.locator('[data-testid="go-all-row"][data-mine="true"]')).toHaveCount(0);
  await page.goBack();
  // Undo takes it back out of the routine: the change is this run's own again.
  await r.notice.getByRole('button', { name: 'Undo Keep', exact: true }).click();
  await r.handle.click();
  await expect(r.panel.getByRole('button', { name: 'Keep in Apply to Initech', exact: true })).toBeVisible();
});

test('§9c: a run that ends with something unkept shows it on home, once; with nothing to keep there is no ask', async ({ page }) => {
  await startGo(page, AT_CV, 'runner');
  const r = runner(page);
  // Nothing changed: Done just leaves.
  await r.next.click();
  await r.done.click();
  await expect(home(page).notice).toContainText('Done with Apply to Initech');
  await expect(page.getByTestId('go-keep')).toHaveCount(0);
  await home(page).notice.getByRole('button', { name: 'Undo Done', exact: true }).click();
  // Reword this step for this run, then end the run.
  await runner(page).handle.click();
  await runner(page).panel.getByRole('button', { name: 'Change the words', exact: true }).click();
  await runner(page).field.fill('Write the covering letter');
  await runner(page).field.press('Enter');
  await expect(runner(page).words).toHaveText('Write the covering letter');
  await runner(page).done.click();
  const keep = await arrived(page, 'go-keep');
  await expect(settled(page, 'home')).toBeVisible();
  await expect(keep.getByTestId('go-keep-row')).toContainText('Write the covering letter');
  await expect(keep.getByTestId('go-keep-row')).toContainText('was: Write the cover letter');
  await keep.getByRole('button', { name: 'Keep Write the covering letter in Apply to Initech', exact: true }).click();
  await expect(page.getByTestId('go-keep')).toHaveCount(0);
  await home(page).screen.getByRole('button', { name: 'More for Apply to Initech', exact: true }).click();
  await expect(settled(page, 'editor').getByRole('textbox', { name: 'Step: Write the covering letter', exact: true })).toBeVisible();
});
