/**
 * P-86 (B-11 slice 1), P-90: moving within a run. Journeys J39 (Jump to…: the start of a level you are
 * in, or a step — from the runner's panel), J37 (a counted repeat whose number is set below the round
 * a run is on). (P-90: See it all and the plain editor are folded into Plan — e2e/go-plan.spec.ts;
 * what is planned changes the routine. P-96: the paused screen and "Ends here" are gone — the tests of
 * Jump from Paused and of the toggle are rewritten below.)
 */
import { expect, test } from './fixtures';
import { arrived, home, menuItems, plan, RoutineSpec, runner, settled, startGo, tileBody } from './goFixture';

const IN_LOOP = [{ id: 'r3', routine: 'drawing', at: 1, inner: [{ routine: 'hands', at: 2, round: 2 }], status: 'running' as const }];

test('J29-a: a Jump moves the run and says where from, with one Undo that puts it back in the level and the round it was in', async ({ page }) => {
  await startGo(page, IN_LOOP, 'runner');
  const r = runner(page);
  await expect(r.context).toHaveText('Practise drawing ›Hand studies of my left hand');
  await r.handle.click();
  await r.panel.getByRole('button', { name: 'Jump to…', exact: true }).click();
  const j = settled(page, 'jump');
  await j.getByRole('radio', { name: 'Gesture drawing', exact: true }).click();
  await j.getByTestId('go-jump-here').click();
  // The runner at the new place, saying where it came from, with one Undo.
  await expect(r.words).toHaveText('Gesture drawing');
  await expect(page).toHaveURL(/\/go\/run\/r3$/);
  await expect(r.context).toHaveText('Practise drawing');
  await expect(r.notice).toContainText('Jumped from Check your proportions');
  await expect(r.note).toBeFocused();
  // Nothing is asked on the way out of the level (P-90: there is no Keep ask).
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await r.notice.getByRole('button', { name: 'Undo Jump', exact: true }).click();
  await expect(r.words).toHaveText('Check your proportions');
  await expect(r.context).toHaveText('Practise drawing ›Hand studies of my left hand');
  await r.handle.click();
  await expect(r.panel.getByTestId('go-where')).toContainText('Round 2 of 3');
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
  // From a level above, into a routine you are not in. (P-101: Step out; was P-96: the panel's Finish <level> now.)
  await r.stepOut.click();
  await expect(r.words).toHaveText('Gesture drawing');
  await r.handle.click();
  await r.panel.getByRole('button', { name: 'Jump to…', exact: true }).click();
  j = settled(page, 'jump');
  await j.getByRole('radio', { name: 'Block in the big shapes', exact: true }).click();
  await j.getByTestId('go-jump-here').click();
  await expect(r.words).toHaveText('Block in the big shapes');
  await expect(r.context).toHaveText('Practise drawing ›Hand studies of my left hand');
});

test('J39-a (P-96; was: from the paused screen): a paused run, resumed from home, Jumps from the panel — running at the new place afterwards', async ({ page }) => {
  await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'paused' }], 'home');
  await tileBody(page, 'Apply to Initech').click();
  await runner(page).handle.click();
  await runner(page).panel.getByRole('button', { name: 'Jump to…', exact: true }).click();
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

test('J37-a, J37-b: the number of a counted repeat is set in Plan; set below the round a run is on, the run is not ended or moved — it just goes on, and the loop finishes by itself', async ({ page }) => {
  await startGo(page, IN_LOOP, 'runner');
  const r = runner(page);
  await r.plan.click();
  const p = plan(page);
  // The nested routine's own divider (the run is inside it, so its row is open).
  await expect(p.divider).toHaveText('Repeat from here · 3 times');
  await p.dividerMore.click();
  const sheet = await arrived(page, 'go-plan-repeat');
  // (P-102: anchored to its ···, named — was a sheet with a heading.)
  await expect(sheet).toHaveAccessibleName('Repeat from here');
  await expect(sheet.getByRole('radio', { name: 'A number', exact: true })).toBeChecked();
  await expect(sheet.getByTestId('go-repeat-count')).toHaveText('3 times');
  // Below the round it is on (round 2): one time.
  for (let i = 0; i < 2; i++) await sheet.getByRole('button', { name: 'Fewer times', exact: true }).click();
  await expect(sheet.getByTestId('go-repeat-count')).toHaveText('1 time');
  await expect(sheet.getByRole('button', { name: 'Fewer times', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(p.divider).toHaveText('Repeat from here · 1 time');
  // The run was not ended or moved by that: it is where it was, and its round reads without a total.
  await expect(p.forward).toHaveText('Resume at Check your proportions');
  await p.forward.click();
  await expect(r.words).toHaveText('Check your proportions');
  await r.handle.click();
  await expect(r.panel.getByTestId('go-where')).toContainText('Round 2');
  await expect(r.panel.getByTestId('go-where')).not.toContainText('Round 2 of');
  await page.keyboard.press('Escape');
  // The loop is over its number: after its last step it finishes by itself, and nothing is asked.
  await r.next.click();
  await r.next.click();
  await expect(r.words).toHaveText('Gesture drawing');
  await expect(r.context).toHaveText('Practise drawing');
  // (P-95: the loop finishing inside the run is moving on — no notice.)
  await expect(r.notice).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('P-96 (ruling 7; was: "Ends here" set in Plan makes the last Next finish): the last Next of an open routine finishes it — there is no "Ends here" to set; a routine with a run going is not offered Remove', async ({ page }) => {
  await startGo(page, [{ id: 'r3', routine: 'drawing', at: 2, status: 'running' }], 'runner');
  await runner(page).plan.click();
  const p = plan(page);
  await p.more('Practise drawing').click();
  const sheet = await arrived(page, 'go-plan-routine');
  // (P-102: the routine's menu holds menu items — was buttons in a sheet.)
  await expect(menuItems(sheet)).not.toHaveCount(0);
  await expect(sheet.getByRole('menuitem', { name: /^Remove/ })).toHaveCount(0);
  await expect(sheet.getByRole('menuitem', { name: /Ends here/ })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await p.forward.click();
  await expect(runner(page).words).toHaveText('Gesture drawing');
  await expect(runner(page).next).toHaveText('Done');
  await runner(page).next.click();
  await expect(home(page).notice).toContainText('Done with Practise drawing');
});
