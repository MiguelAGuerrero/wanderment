/**
 * P-86 (B-11 slice 1): moving within a run, and the plain editor. Journeys J29 (See it all: Jump
 * here, Back to, dropping a this-run change), J37 (a counted repeat's number for this run), J39
 * (Jump to…: the start of a level you are in, or a step), and the routine editor (steps, the Repeat
 * divider, "Ends here", the name, Remove).
 */
import { expect, test } from './fixtures';
import { arrived, home, paused, RoutineSpec, runner, settled, startGo, tile } from './goFixture';

const IN_LOOP = [{ id: 'r3', routine: 'drawing', at: 1, inner: [{ routine: 'hands', at: 2, round: 2 }], status: 'running' as const }];

test('§3.6, J29-a: See it all is the run, not the routine — "This run of <name>", every step as this run reads it, where you are; Jump here on a step', async ({ page }) => {
  await startGo(page, IN_LOOP, 'runner');
  const r = runner(page);
  await r.context.click();
  const all = settled(page, 'all');
  await expect(page).toHaveURL(/\/go\/run\/r3\/all$/);
  const title = all.getByRole('heading', { level: 1 });
  await expect(title).toHaveText('This run of Practise drawing');
  await expect(title).toBeFocused();
  // Visibly not the routine editor: an inverted header, and no fields to retype the routine.
  expect(await title.evaluate((e) => getComputedStyle(e.parentElement!).backgroundColor)).toBe('rgb(244, 241, 232)');
  await expect(all.getByRole('textbox')).toHaveCount(0);
  await expect(all.getByTestId('go-all-row')).toHaveText([/^Warm-up lines/, /^Hand studies of my left hand/, /^Find a reference photo/, /^Block in the big shapes/, /^Check your proportions/, /^Add the shadows/, /^Gesture drawing/]);
  await expect(all.locator('[data-testid="go-all-row"][data-here="true"]')).toHaveText(/^Check your proportions/);
  await expect(all.getByRole('img', { name: 'You are here', exact: true })).toHaveCount(1);
  await expect(all.getByRole('img', { name: 'You are in this', exact: true })).toHaveCount(1);
  await expect(all.getByTestId('go-all-divider')).toHaveText('Repeat from here · 3 times');

  await all.getByRole('button', { name: 'More for Gesture drawing', exact: true }).click();
  const menu = await arrived(page, 'go-all-menu');
  await expect(menu.getByRole('heading', { level: 2 })).toHaveText('Gesture drawing');
  const jump = menu.getByRole('button', { name: 'Jump here', exact: true });
  await expect(jump).toBeFocused();
  await jump.click();
  // The runner at the new place, saying where it came from, with one Undo.
  await expect(r.words).toHaveText('Gesture drawing');
  await expect(page).toHaveURL(/\/go\/run\/r3$/);
  await expect(r.context).toHaveAccessibleName('Practise drawing See it all');
  await expect(r.notice).toContainText('Jumped from Check your proportions');
  await expect(r.note).toBeFocused();
  await r.notice.getByRole('button', { name: 'Undo Jump', exact: true }).click();
  await expect(r.words).toHaveText('Check your proportions');
  await expect(r.context).toHaveAccessibleName('Practise drawing Hand studies of my left hand See it all');
  await r.handle.click();
  await expect(r.panel.getByTestId('go-where')).toContainText('Round 2 of 3');
});

test('J29-c: a change made for this run only is marked, and can be dropped; reword, add and remove are this run’s, each with Undo', async ({ page }) => {
  await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'running' }], 'runner');
  const r = runner(page);
  await r.context.click();
  const all = settled(page, 'all');
  const rows = () => all.getByTestId('go-all-row');
  await all.getByRole('button', { name: 'More for Tailor the CV', exact: true }).click();
  let menu = await arrived(page, 'go-all-menu');
  await menu.getByRole('button', { name: 'Change the words', exact: true }).click();
  const field = page.getByRole('textbox', { name: 'Change the words', exact: true });
  await expect(field).toHaveValue('Tailor the CV');
  await field.fill('Tailor the CV to the ad');
  await field.press('Enter');
  await expect(page.getByTestId('go-all-menu')).toHaveCount(0);
  const mine = all.locator('[data-testid="go-all-row"][data-mine="true"]');
  await expect(mine).toHaveText(/^Tailor the CV to the ad\s*this run only/);
  await expect(all.getByTestId('go-notice').getByRole('button', { name: 'Undo Change', exact: true })).toBeVisible();

  await all.getByRole('button', { name: 'More for Tailor the CV to the ad', exact: true }).click();
  menu = await arrived(page, 'go-all-menu');
  await expect(menu.getByRole('button', { name: 'Keep in Apply to Initech', exact: true })).toBeVisible();
  await menu.getByRole('button', { name: 'Drop this change', exact: true }).click();
  await expect(mine).toHaveCount(0);
  await expect(rows().nth(1)).toHaveText(/^Tailor the CV$/);
  await expect(all.getByTestId('go-notice').getByRole('button', { name: 'Undo Drop', exact: true })).toBeVisible();

  // Add a step after, for this run only.
  await all.getByRole('button', { name: 'More for Write the cover letter', exact: true }).click();
  menu = await arrived(page, 'go-all-menu');
  await menu.getByRole('button', { name: 'Add a step after', exact: true }).click();
  await page.getByRole('textbox', { name: 'Add a step after', exact: true }).fill('Sleep on it');
  await menu.getByRole('button', { name: 'Add a step after', exact: true }).click();
  await expect(mine).toHaveText(/^Sleep on it\s*this run only/);
  // Remove one, for this run only: the run reads without it; the routine still has it.
  const before = await rows().count();
  await all.getByRole('button', { name: 'More for Send the application', exact: true }).click();
  menu = await arrived(page, 'go-all-menu');
  await menu.getByRole('button', { name: 'Remove Send the application from this run', exact: true }).click();
  await expect(rows()).toHaveCount(before - 1);
  await all.getByTestId('go-notice').getByRole('button', { name: 'Undo Change', exact: true }).click();
  await expect(rows()).toHaveCount(before);
});

test('J29: removing the step you are on moves the run to the next step that is left — never ends it', async ({ page }) => {
  await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'running' }], 'runner');
  const r = runner(page);
  await r.context.click();
  const all = settled(page, 'all');
  await all.getByRole('button', { name: 'More for Tailor the CV', exact: true }).click();
  const menu = await arrived(page, 'go-all-menu');
  await menu.getByRole('button', { name: 'Remove Tailor the CV from this run', exact: true }).click();
  await expect(all.locator('[data-testid="go-all-row"][data-here="true"]')).toHaveText(/^Write the cover letter/);
  await all.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(r.words).toHaveText('Write the cover letter');
});

test('J39-a, J39-b, J39-g: Jump to… from the panel — the levels you are in, each from its start, with where you are marked; the start of a level is round one', async ({ page }) => {
  await startGo(page, IN_LOOP, 'runner');
  const r = runner(page);
  await r.handle.click();
  await r.panel.getByRole('button', { name: 'Jump to…', exact: true }).click();
  const j = settled(page, 'jump');
  await expect(page).toHaveURL(/\/go\/run\/r3\/jump$/);
  await expect(j.getByRole('heading', { level: 1 })).toHaveText('Jump to…');
  await expect(j.getByRole('radio', { name: 'Start of Practise drawing', exact: true })).toBeVisible();
  await expect(j.getByRole('radio', { name: 'Start of Hand studies of my left hand', exact: true })).toBeVisible();
  await expect(j.getByRole('radio', { name: 'Check your proportions, you are here', exact: true })).toBeVisible();
  await expect(j.locator('[data-testid="go-jump-row"][data-here="true"]')).toHaveCount(1);
  // Nothing happens until a row is picked AND Jump here is pressed.
  const here = j.getByTestId('go-jump-here');
  await expect(here).toBeDisabled();
  const level = j.getByRole('radio', { name: 'Start of Hand studies of my left hand', exact: true });
  await level.click();
  await expect(level).toBeChecked();
  await expect(here).toBeEnabled();
  expect(await here.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgb(244, 241, 232)');
  // Picking again un-picks.
  await level.click();
  await expect(here).toBeDisabled();
  await level.click();
  await here.click();
  await expect(r.words).toHaveText('Find a reference photo');
  await expect(r.notice).toContainText('Jumped from Check your proportions');
  await expect(r.note).toBeFocused();
  // Round one, fresh: three Nexts on, the panel reads round 1 of 3.
  await r.next.click();
  await r.handle.click();
  await expect(r.panel.getByTestId('go-where')).toContainText('Round 1 of 3');
});

test('J39-c, J39-d, J39-g: picking a particular step keeps the round; a step inside a routine you are not in can be picked; Back changes nothing', async ({ page }) => {
  await startGo(page, IN_LOOP, 'runner');
  const r = runner(page);
  await r.handle.click();
  await r.panel.getByRole('button', { name: 'Jump to…', exact: true }).click();
  let j = settled(page, 'jump');
  // Back: nothing changed.
  await j.getByRole('radio', { name: 'Add the shadows', exact: true }).click();
  await page.goBack();
  await expect(r.words).toHaveText('Check your proportions');
  await expect(r.notice).toHaveCount(0);
  // A step in the level you are in: the round is kept.
  await r.handle.click();
  await r.panel.getByRole('button', { name: 'Jump to…', exact: true }).click();
  j = settled(page, 'jump');
  await j.getByRole('radio', { name: 'Add the shadows', exact: true }).click();
  await j.getByTestId('go-jump-here').click();
  await expect(r.words).toHaveText('Add the shadows');
  await r.handle.click();
  await expect(r.panel.getByTestId('go-where')).toContainText('Round 2 of 3');
  await page.keyboard.press('Escape');
  // From a level above, into a routine you are not in.
  await r.done.click();
  await expect(r.words).toHaveText('Gesture drawing');
  await r.handle.click();
  await r.panel.getByRole('button', { name: 'Jump to…', exact: true }).click();
  j = settled(page, 'jump');
  await j.getByRole('radio', { name: 'Block in the big shapes', exact: true }).click();
  await j.getByTestId('go-jump-here').click();
  await expect(r.words).toHaveText('Block in the big shapes');
  await expect(r.context).toHaveAccessibleName('Practise drawing Hand studies of my left hand See it all');
});

test('J39-a: Jump to… from Paused — the run is running at the new place afterwards', async ({ page }) => {
  await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'paused' }], 'paused');
  await paused(page).screen.getByRole('button', { name: 'Jump to…', exact: true }).click();
  const j = settled(page, 'jump');
  await j.getByRole('radio', { name: 'Send the application', exact: true }).click();
  await j.getByTestId('go-jump-here').click();
  const r = runner(page);
  await expect(r.words).toHaveText('Send the application');
  await expect(page).toHaveURL(/\/go\/run\/r1$/);
  await expect(r.notice).toContainText('Jumped from Tailor the CV');
});

test('J39-h: a thirty-step routine in the picker scrolls, and Jump here stays in reach', async ({ page }) => {
  const long: RoutineSpec[] = [{ id: 'long', name: 'The long one', open: false, steps: Array.from({ length: 30 }, (_, i) => `Step number ${i + 1}`) }];
  await startGo(page, [{ id: 'r', routine: 'long', at: 3, status: 'running' }], 'runner', long);
  const r = runner(page);
  await r.handle.click();
  await r.panel.getByRole('button', { name: 'Jump to…', exact: true }).click();
  const j = settled(page, 'jump');
  await expect(j.getByTestId('go-jump-row')).toHaveCount(31);
  const last = j.getByRole('radio', { name: 'Step number 30', exact: true });
  await last.scrollIntoViewIfNeeded();
  await last.click();
  await expect(j.getByTestId('go-jump-here')).toBeInViewport();
  await j.getByTestId('go-jump-here').click();
  await expect(r.words).toHaveText('Step number 30');
});

test('J37-a, J37-b: the number of a counted repeat changed for this run only, with Keep; set below the round you are on, the run just goes on', async ({ page }) => {
  await startGo(page, IN_LOOP, 'runner');
  const r = runner(page);
  await r.context.click();
  const all = settled(page, 'all');
  await all.getByTestId('go-all-divider').click();
  const sheet = await arrived(page, 'go-all-repeat');
  await expect(sheet.getByRole('heading', { level: 2 })).toHaveText('Repeat from here');
  await expect(sheet.getByRole('radio', { name: 'A number', exact: true })).toBeChecked();
  await expect(sheet.getByTestId('go-repeat-count')).toHaveText('3 times');
  await sheet.getByRole('button', { name: 'More times', exact: true }).click();
  await expect(sheet.getByTestId('go-repeat-count')).toHaveText('4 times');
  await expect(sheet.getByText('This run only', { exact: true })).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Keep in Hand studies of my left hand', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(all.getByTestId('go-all-divider')).toHaveText('Repeat from here · 4 times · this run only');
  await expect(all.getByTestId('go-all-divider')).toHaveAccessibleName('Repeat from here · 4 times, this run only');
  // Below the round it is on (round 2): one time.
  await all.getByTestId('go-all-divider').click();
  const again = await arrived(page, 'go-all-repeat');
  for (let i = 0; i < 3; i++) await again.getByRole('button', { name: 'Fewer times', exact: true }).click();
  await expect(again.getByTestId('go-repeat-count')).toHaveText('1 time');
  await expect(again.getByRole('button', { name: 'Fewer times', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await all.getByRole('button', { name: 'Back', exact: true }).click();
  // The run was not ended or moved by that: it is where it was, and its round reads without a total.
  await expect(r.words).toHaveText('Check your proportions');
  await r.handle.click();
  await expect(r.panel.getByTestId('go-where')).toContainText('Round 2');
  await expect(r.panel.getByTestId('go-where')).not.toContainText('Round 2 of');
  await page.keyboard.press('Escape');
  // The loop is over its number: after its last step it finishes by itself.
  await r.next.click();
  await r.next.click();
  await expect(r.words).toHaveText('Gesture drawing');
  await expect(r.notice).toContainText('Finished Hand studies of my left hand');
  // Leaving that level: this run's number is shown once, with Keep.
  const keep = await arrived(page, 'go-keep');
  await expect(keep.getByRole('heading', { level: 2 })).toHaveText('Keep in Hand studies of my left hand');
  await expect(keep.getByTestId('go-keep-row')).toHaveText(/^Repeat 1 time\s*Keep$/);
});

test('the plain editor: the Repeat divider (where, until I’m done / a number), "Ends here", the name, and Remove — live, each with Undo', async ({ page }) => {
  await startGo(page, []);
  await home(page).screen.getByRole('button', { name: 'More for Practise drawing', exact: true }).click();
  const e = settled(page, 'editor');
  await expect(page).toHaveURL(/\/go\/routine\/drawing$/);
  const title = e.getByRole('heading', { level: 1 });
  await expect(title).toHaveText('Practise drawing');
  await expect(title).toBeFocused();
  // No Save: every change is live, with Undo.
  await expect(e.getByRole('button', { name: /save/i })).toHaveCount(0);
  // No divider yet: it runs once through. Add one: all of it repeats, until I'm done.
  await expect(e.getByTestId('go-edit-divider')).toHaveCount(0);
  await e.getByRole('button', { name: 'Add Repeat from here', exact: true }).click();
  const divider = e.getByTestId('go-edit-divider');
  await expect(divider).toContainText('Repeat from here');
  await expect(divider.getByRole('radio', { name: 'Until I’m done', exact: true })).toBeChecked();
  await expect(divider.getByRole('button', { name: 'Move Repeat from here up', exact: true })).toBeDisabled();
  // It stands before the first step; moved down, before the second.
  const order = () => e.locator('[data-testid="go-edit-divider"], [data-testid="go-edit-item"]').evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.testid));
  expect(await order()).toEqual(['go-edit-divider', 'go-edit-item', 'go-edit-item', 'go-edit-item']);
  await divider.getByRole('button', { name: 'Move Repeat from here down', exact: true }).click();
  await expect.poll(order).toEqual(['go-edit-item', 'go-edit-divider', 'go-edit-item', 'go-edit-item']);
  // A number.
  await divider.getByRole('radio', { name: 'A number', exact: true }).click();
  await expect(divider.getByTestId('go-repeat-count')).toHaveText('3 times');
  await divider.getByRole('button', { name: 'More times', exact: true }).click();
  await expect(divider.getByTestId('go-repeat-count')).toHaveText('4 times');
  await e.getByTestId('go-notice').getByRole('button', { name: 'Undo Change', exact: true }).click();
  await expect(divider.getByTestId('go-repeat-count')).toHaveText('3 times');
  // Runs once again.
  await divider.getByRole('button', { name: 'Runs once: take Repeat from here out', exact: true }).click();
  await expect(e.getByTestId('go-edit-divider')).toHaveCount(0);

  // Ends here / the edge left open.
  const ends = e.getByTestId('go-edit-ends');
  await expect(ends).toHaveText('Ends here: Off');
  await expect(ends).toHaveAttribute('aria-pressed', 'false');
  await ends.click();
  await expect(ends).toHaveText('Ends here: On');
  await expect(ends).toHaveAttribute('aria-pressed', 'true');

  // The name: one routine per name.
  const name = e.getByTestId('go-edit-name');
  await name.fill('Apply to Acme');
  await name.press('Enter');
  await expect(e.getByTestId('go-edit-name-error')).toHaveText('! Another routine has this name');
  await expect(title).toHaveText('Practise drawing');
  await name.fill('Draw every day');
  await name.press('Enter');
  await expect(e.getByTestId('go-edit-name-error')).toHaveCount(0);
  await expect(title).toHaveText('Draw every day');

  // Remove names what it removes, takes you home, and can be undone there.
  await e.getByRole('button', { name: 'Remove Draw every day', exact: true }).click();
  await expect(home(page).tiles).toHaveCount(3);
  await home(page).notice.getByRole('button', { name: 'Undo Change', exact: true }).click();
  await expect(home(page).tiles).toHaveCount(4);
  await expect(tile(page, 'Draw every day')).toBeVisible();
});

test('the plain editor: "Ends here" is what makes the last Next finish; a routine with a run going can’t be removed', async ({ page }) => {
  await startGo(page, [{ id: 'r3', routine: 'drawing', at: 2, status: 'running' }], 'runner');
  await page.goBack();
  await home(page).screen.getByRole('button', { name: 'More for Practise drawing', exact: true }).click();
  const e = settled(page, 'editor');
  await expect(e.getByTestId('go-edit-remove')).toBeDisabled();
  await e.getByTestId('go-edit-ends').click();
  await expect(e.getByTestId('go-edit-ends')).toHaveText('Ends here: On');
  await page.goBack();
  await home(page).screen.getByRole('button', { name: 'Resume Practise drawing', exact: true }).click();
  await expect(runner(page).words).toHaveText('Gesture drawing');
  await runner(page).next.click();
  await expect(home(page).notice).toContainText('Finished Practise drawing');
});
