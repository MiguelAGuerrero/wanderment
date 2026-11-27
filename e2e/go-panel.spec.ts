/**
 * P-86 (B-11 slice 1), P-90: the pull-up panel (B-11 §3.2; J04-h, J38, J37-d). Opened by swiping up, by
 * tapping the note, by the handle and by a key; where you are in this run, then Back to <step> and
 * Jump to… (they move you; nothing here plans — P-90). Esc and Back close it and never pause or
 * leave; the three buttons stay where they are and keep working.
 */
import { expect, test } from './fixtures';
import { drag, home, place, plan, runner, settled, startGo } from './goFixture';

const IN_LOOP = [{ id: 'r3', routine: 'drawing', at: 1, inner: [{ routine: 'hands', at: 2, round: 2 }], status: 'running' as const }];

test('J04-h, J38-a: over a step in a loop — the round, then, and the actions, in order; the buttons beneath do not move', async ({ page }) => {
  await startGo(page, IN_LOOP, 'runner');
  const r = runner(page);
  const fixed = { pause: await place(r.pause), plan: await place(r.plan), next: await place(r.next), handle: await place(r.handle) };
  await expect(r.handle).toHaveAccessibleName('More about this step');
  await expect(r.handle).toHaveAttribute('aria-expanded', 'false');
  await r.handle.click();
  await expect(r.panel).toBeVisible();
  await expect(r.handle).toHaveAttribute('aria-expanded', 'true');
  const where = r.panel.getByTestId('go-where');
  await expect(where).toContainText('Round 2 of 3');
  await expect(where).toContainText('then: Add the shadows');
  await expect(where.getByText('Last step of the round')).toHaveCount(0);
  // (P-101, ruling 1; was P-96: and Finish <level> now, last — finishing early is Step out, beside Next.)
  // (P-101 amendment, ruling 9: then Start <level> over and Start <routine> over.)
  await expect(r.panel.getByRole('button')).toHaveText(['Back to Block in the big shapes', 'Jump to…', 'Start Hand studies of my left hand over', 'Start Practise drawing over']);
  // Read first on opening: where you are.
  await expect(where).toBeFocused();
  expect({ pause: await place(r.pause), plan: await place(r.plan), next: await place(r.next), handle: await place(r.handle) }).toEqual(fixed);
  // The panel is over the note only: it ends above the handle.
  const p = (await r.panel.boundingBox())!;
  expect(p.y + p.height).toBeLessThanOrEqual(fixed.handle.y + 1);

  // Next still works with the panel open, and the panel follows the run.
  await r.next.click();
  await expect(r.words).toHaveText('Add the shadows');
  await expect(where).toContainText('Last step of the round');
  await expect(where).toContainText('then: Block in the big shapes');
  // P-95: Next leaves no Undo — not as a row here either.
  await expect(r.panel.getByRole('button', { name: /^Undo/ })).toHaveCount(0);
});

test('J37-d: the last step of the last round — "Round 3 of 3", "Last step of the round", then the parent’s next step', async ({ page }) => {
  await startGo(page, [{ id: 'r3', routine: 'drawing', at: 1, inner: [{ routine: 'hands', at: 3, round: 3 }], status: 'running' }], 'runner');
  const r = runner(page);
  await r.handle.click();
  const where = r.panel.getByTestId('go-where');
  await expect(where).toContainText('Round 3 of 3');
  await expect(where).toContainText('Last step of the round');
  await expect(where).toContainText('then: Gesture drawing');
});

test('J38: a part that runs once shows no round; the round is nowhere but the panel', async ({ page }) => {
  await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'running' }], 'runner');
  const r = runner(page);
  await r.handle.click();
  await expect(r.panel.getByTestId('go-where')).toContainText('then: Write the cover letter');
  await expect(r.panel.getByText(/Round/)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(r.screen.getByText(/Round/)).toHaveCount(0);
  await page.goBack();
  await expect(home(page).screen.getByText(/Round/)).toHaveCount(0);
});

test('J38: it opens by tapping the note, by a swipe up on the note, by a swipe on the handle, and by the handle from the keyboard', async ({ page }) => {
  await startGo(page, IN_LOOP, 'runner');
  const r = runner(page);
  // From the keyboard: the handle is a button (nothing is by gesture alone).
  await r.handle.focus();
  await page.keyboard.press('Enter');
  await expect(r.panel).toBeVisible();
  await expect(r.panel.getByTestId('go-where')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(r.panel).toHaveCount(0);
  // A tap on the note.
  await r.note.click();
  await expect(r.panel).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(r.panel).toHaveCount(0);
  // A swipe up that starts on the note.
  await drag(page, r.note, -90);
  await expect(r.panel).toBeVisible();
  // A swipe down on the handle closes it; up opens it.
  await drag(page, r.handle, 90);
  await expect(r.panel).toHaveCount(0);
  await drag(page, r.handle, -90);
  await expect(r.panel).toBeVisible();
});

test('J38-b: on a full note a swipe inside scrolls the words and does not open the panel; the handle opens it', async ({ page }) => {
  const LONG = 'Write to the landlord about the boiler, the window latch and the stair light, attach the three photographs from Sunday, say which days someone is in, and ask for a date in writing before the end of the month, then copy the letting agent and put a note in the calendar to chase it';
  await startGo(page, [{ id: 'r9', routine: 'flat', at: 0, status: 'running' }], 'runner', [{ id: 'flat', name: 'Sort out the flat', open: false, steps: [LONG, 'Stretch'] }]);
  const r = runner(page);
  await expect(r.note).toHaveAttribute('data-full', 'true');
  await drag(page, r.note, -90);
  await expect(r.panel).toHaveCount(0);
  const scroll = r.screen.getByTestId('go-note-scroll');
  await scroll.hover();
  await page.mouse.wheel(0, 120);
  await expect.poll(() => scroll.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
  await expect(r.panel).toHaveCount(0);
  await r.handle.click();
  await expect(r.panel).toBeVisible();
});

test('J38-c: Esc closes it (focus to the handle) and never pauses; Back closes it and stays on the runner; then Back is home', async ({ page }) => {
  await startGo(page, IN_LOOP, 'runner');
  const r = runner(page);
  await r.handle.click();
  await expect(r.panel).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(r.panel).toHaveCount(0);
  await expect(r.handle).toBeFocused();
  // Esc again does nothing at all: still running, still here.
  await page.keyboard.press('Escape');
  await expect(r.words).toHaveText('Check your proportions');
  await expect(page).toHaveURL(/\/go\/run\/r3$/);

  await r.handle.click();
  await expect(r.panel).toBeVisible();
  await page.goBack();
  await expect(r.panel).toHaveCount(0);
  await expect(page).toHaveURL(/\/go\/run\/r3$/);
  await expect(r.words).toHaveText('Check your proportions');
  // A reload with the panel open asks nothing and comes back to the runner.
  await r.handle.click();
  await expect(r.panel).toBeVisible();
  await page.reload();
  await expect(runner(page).words).toHaveText('Check your proportions');
  // Back from the runner: the new home; the run is as it was.
  await page.goBack();
  await expect(settled(page, 'home')).toBeVisible();
  await expect(home(page).screen.locator('[data-testid="go-tile"][data-state="running"]')).toHaveCount(1);
});

test('J29-b: Back to <step> from the panel (P-95: with no Undo); the words are not changed here — the note is never a field (P-90)', async ({ page }) => {
  await startGo(page, IN_LOOP, 'runner');
  const r = runner(page);
  await r.handle.click();
  await r.panel.getByRole('button', { name: 'Back to Block in the big shapes', exact: true }).click();
  await expect(r.panel).toHaveCount(0);
  await expect(r.words).toHaveText('Block in the big shapes');
  await expect(r.note).toBeFocused();
  await expect(r.notice).toHaveCount(0);
  await r.handle.click();
  await expect(r.panel.getByRole('button', { name: /Change the words|Keep|See it all/ })).toHaveCount(0);
  await expect(r.panel.getByText('This run only')).toHaveCount(0);
  await expect(r.screen.getByRole('textbox')).toHaveCount(0);
});

test('J38: Jump to… is reached from the panel and comes back to the runner; the sequence is reached by Plan (P-101: on the top line — inside a call, that routine’s; was: the middle slot)', async ({ page }) => {
  await startGo(page, IN_LOOP, 'runner');
  const r = runner(page);
  await r.handle.click();
  await r.panel.getByRole('button', { name: 'Jump to…', exact: true }).click();
  await expect(settled(page, 'jump').getByRole('heading', { level: 1 })).toHaveText('Jump to…');
  await settled(page, 'jump').getByRole('button', { name: 'Back', exact: true }).click();
  await expect(r.words).toHaveText('Check your proportions');
  await expect(r.panel).toHaveCount(0);
  // Plan with the panel open: the panel goes, Plan comes; Resume is back on the step.
  await r.handle.click();
  await r.plan.click();
  await expect(plan(page).title).toHaveText('Hand studies of my left hand');
  await plan(page).forward.click();
  await expect(r.words).toHaveText('Check your proportions');
  await expect(r.panel).toHaveCount(0);
});

test('keys: Return on the note is Next, Ctrl/⌘+Z is Undo (P-95: of what has one), Esc only closes — and no letter is ever a shortcut (WCAG 2.1.4)', async ({ page }) => {
  await startGo(page, [{ id: 'r1', routine: 'apply', at: 0, status: 'running' }], 'runner');
  const r = runner(page);
  await expect(r.note).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(r.words).toHaveText('Tailor the CV');
  // Letters do nothing at all, wherever the focus is: on the note, on a button, on nothing.
  await expect(r.note).toBeFocused();
  await page.keyboard.type('npmD nNpPmMdD');
  await r.next.focus();
  await page.keyboard.type('npmD');
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.type('npmD');
  // Return on nothing is nothing, too (only the note takes it).
  await page.keyboard.press('Enter');
  await expect(r.words).toHaveText('Tailor the CV');
  await expect(r.panel).toHaveCount(0);
  await expect(page).toHaveURL(/\/go\/run\/r1$/);
  await expect(r.screen).toBeVisible();
  // P-95: Next leaves no Undo, so Ctrl/⌘+Z here takes nothing back (Undo from the keyboard: in Plan, below).
  await page.keyboard.press('Control+z');
  await expect(r.words).toHaveText('Tailor the CV');
  // While typing (in Plan: the runner has no field), the letters are letters; Esc leaves the field and nothing else.
  await r.plan.click();
  const p = plan(page);
  await p.more('Read the job ad twice').click();
  await page.getByTestId('go-plan-menu').getByRole('menuitem', { name: 'Edit', exact: true }).click();
  await p.typed.fill('');
  await page.keyboard.type('npm D pnm');
  await expect(p.typed).toHaveValue('npm D pnm');
  await page.keyboard.press('Escape');
  await expect(p.typed).toHaveCount(0);
  await expect(p.words.first()).toHaveText('Read the job ad twice');
  // P-103 (3): opened from the runner, Plan's address says so (`?from=run`).
  await expect(page).toHaveURL(/\/go\/run\/r1\/plan\?from=run$/);
  // Undo from the keyboard there too.
  await p.add.fill('One more');
  await p.add.press('Enter');
  await expect(p.rows).toHaveCount(6);
  await p.title.focus();
  await page.keyboard.press('Control+z');
  await expect(p.rows).toHaveCount(5);
});
