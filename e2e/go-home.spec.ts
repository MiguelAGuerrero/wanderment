/**
 * P-86 (B-11 slice 1): the new home, `/go` — tiles and "I'm going to…" (B-11 §5, §9b).
 * Journeys J01 (first open), J02 (come back and pick up), J03 (say what you're going to do).
 * Seeded through a format-2 backup import (goFixture). Every wait is on a state attribute.
 */
import { AT_OLD, expect, OLD, test } from './fixtures';
import { expectInside, home, MAYA, openGo, RoutineSpec, runner, settled, startGo, tile, sinceDate } from './goFixture';

const THREE = [
  { id: 'r1', routine: 'apply', at: 1, reason: 'need the job ad open', touchedMinutesAgo: 30 },
  { id: 'r2', routine: 'apply-acme', at: 1, waitingDaysAgo: 9, touchedMinutesAgo: 90 },
  { id: 'r3', routine: 'drawing', at: 0, touchedMinutesAgo: 10 },
];

/** A wait seeded nine days ago reads its date (within the last week it would be a day's name). */
const SINCE = sinceDate(9);

test('J01-a: first open, nothing yet — only the prompt, and nothing is focused for you', async ({ page }) => {
  await startGo(page, [], 'home', []);
  const h = home(page);
  await expect(h.title).toHaveText('Nothing running');
  await expect(h.tiles).toHaveCount(0);
  await expect(h.prompt).toBeVisible();
  await expect(h.prompt).toHaveAccessibleName('I’m going to…');
  // No keyboard raised on a phone just by opening.
  await expect(h.prompt).not.toBeFocused();
  await expect(h.screen.getByTestId('go-rows')).toHaveCount(0);
  await expect(h.notice).toHaveCount(0);
});

test('J01-b, J01-c, J01-d: typed words offer "New: …"; nothing starts until it is chosen; Return takes it and the runner asks for a first small step', async ({ page }) => {
  await startGo(page, [], 'home', []);
  const h = home(page);
  await h.prompt.fill('Practise drawing');
  await expect(h.rows).toHaveCount(1);
  const row = h.screen.getByTestId('go-row-new');
  await expect(row).toHaveText('New: Practise drawing');
  await expect(row).toHaveAttribute('data-first', 'true');
  // Typing started nothing.
  await expect(h.tiles).toHaveCount(0);
  await expect(page).toHaveURL(/\/go$/);

  await h.prompt.press('Enter');
  const r = runner(page);
  await expect(r.field).toBeFocused();
  await expect(r.field).toHaveAttribute('placeholder', 'A first small step');
  await expect(r.context).toContainText('Practise drawing');
  // Next is unavailable (dashed AND disabled) until a step is typed.
  await expect(r.next).toBeDisabled();
  await r.field.fill('Warm-up lines');
  await expect(r.next).toBeEnabled();
  await r.field.press('Enter');
  await expect(r.words).toHaveText('Warm-up lines');
  await expect(r.next).toBeEnabled();

  // Back: the new home, with its tile, the run left running.
  await page.goBack();
  await expect(tile(page, 'Practise drawing')).toHaveAttribute('data-state', 'running');
  await expect(home(page).title).toHaveText('Running');
});

test('J01-b: Undo after a start takes the run (and a new routine) away again', async ({ page }) => {
  await startGo(page, [], 'home', []);
  await home(page).prompt.fill('Bake bread');
  await home(page).prompt.press('Enter');
  const r = runner(page);
  await r.screen.getByRole('button', { name: 'Undo Start', exact: true }).click();
  await expect(home(page).tiles).toHaveCount(0);
  await expect(home(page).title).toHaveText('Nothing running');
});

test('J02-a, J34-d: tiles in a fixed order, each in its own colour, with its name, where it is and Resume or Start', async ({ page }) => {
  await startGo(page, THREE);
  const h = home(page);
  await expect(h.tiles).toHaveCount(4);
  // The order they were first made in: nothing is ranked, the run touched last is marked, not moved.
  await expect(h.tiles.locator('[role="button"]').filter({ hasText: /^(Resume|Start)$/ })).toHaveText(['Resume', 'Resume', 'Resume', 'Start']);
  const names = await h.tiles.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  expect(names).toEqual([
    'Apply to Initech, paused at Tailor the CV, need the job ad open',
    `Apply to Acme, waiting for a reply from Acme · since ${SINCE}`,
    'Practise drawing, paused at Warm-up lines',
    'Feel at home in Spanish',
  ]);
  await expect(tile(page, 'Apply to Initech').getByTestId('go-tile-line')).toHaveText('at Tailor the CV');
  await expect(tile(page, 'Apply to Initech').getByTestId('go-tile-reason')).toHaveText('need the job ad open');
  await expect(tile(page, 'Apply to Acme').getByTestId('go-tile-line')).toHaveText(`waiting for a reply from Acme · since ${SINCE}`);
  await expect(tile(page, 'Feel at home in Spanish').getByTestId('go-tile-line')).toHaveCount(0);
  await expect(tile(page, 'Practise drawing')).toHaveAttribute('data-current', 'true');
  await expect(h.screen.locator('[data-testid="go-tile"][data-current="true"]')).toHaveCount(1);
  // Spoken names for the repeated buttons.
  await expect(h.screen.getByRole('button', { name: 'Resume Apply to Initech', exact: true })).toBeVisible();
  await expect(h.screen.getByRole('button', { name: 'Start Feel at home in Spanish', exact: true })).toBeVisible();
  // Each in its own colour.
  const colours = await h.tiles.evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor));
  expect(new Set(colours).size).toBe(4);
  // Nothing is counted: the only figures on a tile are a date.
  for (const text of await h.tiles.allInnerTexts()) expect(text.replace(`since ${SINCE}`, '')).not.toMatch(/\d/);
  // Resume and Start are outlined: home has no filled button.
  for (const b of await h.tiles.getByRole('button').all()) expect(await b.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
});

test('J02-a: Resume on a tile opens its run where it was', async ({ page }) => {
  await startGo(page, THREE);
  await home(page).screen.getByRole('button', { name: 'Resume Apply to Initech', exact: true }).click();
  await expect(runner(page).words).toHaveText('Tailor the CV');
  await expect(page).toHaveURL(/\/go\/run\/r1$/);
});

test('J02-b: /go opens where you left off — straight into the running step; Back is home and never bounces back in', async ({ page }) => {
  await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'running' }], 'runner');
  await expect(runner(page).words).toHaveText('Tailor the CV');
  await expect(page).toHaveURL(/\/go\/run\/r1$/);
  await page.goBack();
  await expect(settled(page, 'home')).toBeVisible();
  await expect(page).toHaveURL(/\/go$/);
  // The run is as it was: still running, marked on its tile; home does not send you back into it.
  await expect(tile(page, 'Apply to Initech')).toHaveAttribute('data-state', 'running');
  await expect(tile(page, 'Apply to Initech').getByTestId('go-tile-line')).toHaveText('at Tailor the CV');
  await expect(home(page).title).toHaveText('Running');
  await expect(home(page).title).toBeFocused();
  // Reload on the runner, then Back: still home (the redirect is decided once per load, and not from a run).
  await page.goForward();
  await expect(runner(page).words).toHaveText('Tailor the CV');
  await page.reload();
  await expect(runner(page).words).toHaveText('Tailor the CV');
  await page.goBack();
  await expect(settled(page, 'home')).toBeVisible();
  await expect(page).toHaveURL(/\/go$/);
});

test('J02-b: with a paused run /go opens its paused screen; with nothing going, home', async ({ page }) => {
  await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'paused' }], 'paused');
  await expect(page).toHaveURL(/\/go\/run\/r1\/paused$/);
});

test('the old home at /old is untouched: opening it never redirects into a run', async ({ page }) => {
  await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'running' }], 'runner');
  await page.goto(OLD);
  await expect(page.getByRole('textbox', { name: 'Where are we wandering today?', exact: true })).toBeVisible();
  await expect(page).toHaveURL(AT_OLD);
});

test('J03-a: typing filters the tiles, then routines, with "New: …" last; the first row is marked and Return takes it', async ({ page }) => {
  await startGo(page, THREE);
  const h = home(page);
  await h.prompt.fill('apply');
  await expect(h.tiles).toHaveCount(2);
  await expect(tile(page, 'Apply to Initech')).toHaveAttribute('data-first', 'true');
  await expect(tile(page, 'Apply to Acme')).toHaveAttribute('data-first', 'false');
  await expect(h.rows).toHaveText(['New: apply']);
  await expect(h.screen.getByTestId('go-row-new')).toHaveAttribute('data-first', 'false');
  // A tile is found by the step it is at, too.
  await h.prompt.fill('tailor');
  await expect(h.tiles).toHaveCount(1);
  await expect(tile(page, 'Apply to Initech')).toHaveAttribute('data-first', 'true');
  // A routine that is not on home comes after the tiles, before New.
  await h.prompt.fill('pro');
  await expect(h.tiles).toHaveCount(0);
  await expect(h.rows).toHaveText(['Start Proofread out loud', 'New: pro']);
  await expect(h.screen.getByTestId('go-row-routine')).toHaveAttribute('data-first', 'true');
  // Nothing has started.
  await expect(page).toHaveURL(/\/go$/);
  await h.prompt.press('Enter');
  await expect(runner(page).words).toHaveText('Read it aloud once');
  await expect(runner(page).context).toContainText('Proofread out loud');
});

test('J03-a: Return on a matching tile resumes that run', async ({ page }) => {
  await startGo(page, THREE);
  await home(page).prompt.fill('acme');
  await home(page).prompt.press('Enter');
  await expect(runner(page).note).toHaveAccessibleName('Wait for: a reply from Acme');
});

test('J03-b: nothing matches — only "New: <words>", marked', async ({ page }) => {
  await startGo(page, THREE);
  const h = home(page);
  await h.prompt.fill('  learn   the ukulele ');
  await expect(h.tiles).toHaveCount(0);
  await expect(h.rows).toHaveText(['New: learn the ukulele']);
  await expect(h.screen.getByTestId('go-row-new')).toHaveAttribute('data-first', 'true');
  // Esc clears the prompt; the tiles are back.
  await h.prompt.press('Escape');
  await expect(h.prompt).toHaveValue('');
  await expect(h.tiles).toHaveCount(4);
  // Return with nothing typed starts nothing.
  await h.prompt.press('Enter');
  await expect(page).toHaveURL(/\/go$/);
  await expect(settled(page, 'home')).toBeVisible();
});

test('one thing at a time: a start while something is running is refused, says what is running, and keeps the words', async ({ page }) => {
  await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'running' }], 'runner');
  await page.goBack();
  const h = home(page);
  // The running run's tile says so, and its Resume is home's one filled, available action.
  await expect(tile(page, 'Apply to Initech')).toHaveAccessibleName('Apply to Initech, running, at Tailor the CV');
  const own = h.screen.getByRole('button', { name: 'Resume Apply to Initech', exact: true });
  await expect(own).toBeEnabled();
  expect(await own.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgb(244, 241, 232)');
  // Everything else is shown but unavailable (dashed AND disabled) until you pause: no way to switch from here.
  for (const name of ['Start Practise drawing', 'Start Apply to Acme', 'Start Feel at home in Spanish']) {
    const b = h.screen.getByRole('button', { name, exact: true });
    await expect(b).toBeVisible();
    await expect(b).toBeDisabled();
    expect(await b.evaluate((e) => getComputedStyle(e).borderTopStyle)).toBe('dashed');
  }
  // By the prompt neither: Return on another routine, or on "New:", is refused, says what is running, and keeps the words.
  await h.prompt.fill('practise');
  await expect(tile(page, 'Practise drawing')).toHaveAttribute('data-first', 'true');
  await h.prompt.press('Enter');
  await expect(h.notice).toHaveText('Apply to Initech is running');
  await expect(h.prompt).toHaveValue('practise');
  await h.prompt.fill('bake bread');
  await expect(h.screen.getByTestId('go-row-new')).toBeDisabled();
  await h.prompt.press('Enter');
  await expect(h.prompt).toHaveValue('bake bread');
  await expect(page).toHaveURL(/\/go$/);
  // (The prompt filters the tiles: cleared, they are all back.) Nothing changed: the same run is running, nothing else started.
  await h.prompt.fill('');
  await expect(h.tiles).toHaveCount(4);
  await expect(tile(page, 'Apply to Initech')).toHaveAttribute('data-state', 'running');
  await expect(tile(page, 'Practise drawing')).toHaveAttribute('data-state', 'idle');
  // Its own Resume goes back in.
  await own.click();
  await expect(runner(page).words).toHaveText('Tailor the CV');
});

test('one tile; and twenty tiles scroll while the prompt stays in reach', async ({ page }) => {
  const one: RoutineSpec[] = [{ id: 'apply', name: 'Apply to Initech', steps: ['Read the job ad twice'] }];
  await startGo(page, [], 'home', one);
  await expect(home(page).tiles).toHaveCount(1);
  await expectInside(page, [home(page).tiles.first(), home(page).prompt]);

  const twenty: RoutineSpec[] = Array.from({ length: 20 }, (_, i) => ({ id: `t${i}`, name: `Routine ${String.fromCharCode(65 + i)}`, steps: ['A step'] }));
  await startGo(page, [], 'home', twenty);
  const h = home(page);
  await expect(h.tiles).toHaveCount(20);
  await expectInside(page, [h.prompt]);
  await h.tiles.last().scrollIntoViewIfNeeded();
  await expect(h.tiles.last()).toBeInViewport();
  await expectInside(page, [h.prompt]);
  await h.prompt.fill('routine t');
  await expect(h.tiles).toHaveCount(1);
  await expect(tile(page, 'Routine T')).toHaveAttribute('data-first', 'true');
});

test('keyboard up (a 390×510 window stands in for it): the prompt and the marked row are in view', async ({ page }) => {
  await startGo(page, THREE);
  await page.setViewportSize({ width: 390, height: 510 });
  const h = home(page);
  await h.prompt.fill('apply');
  await expect(tile(page, 'Apply to Initech')).toHaveAttribute('data-first', 'true');
  await expectInside(page, [h.prompt, tile(page, 'Apply to Initech')]);
  await expect(tile(page, 'Apply to Initech')).toBeInViewport();
});

test('a way back to today’s home, and the tile’s ⋯ opens its routine', async ({ page }) => {
  await startGo(page, []);
  await home(page).screen.getByRole('button', { name: 'More for Practise drawing', exact: true }).click();
  await expect(settled(page, 'editor').getByRole('heading', { level: 1 })).toHaveText('Practise drawing');
  await page.goBack();
  // Opened by its address there is nothing beneath it: the way back is today's home itself.
  await home(page).screen.getByRole('button', { name: 'Back to Wanderment', exact: true }).click();
  await expect(page).toHaveURL(AT_OLD);
  await expect(page.getByRole('textbox', { name: 'Where are we wandering today?', exact: true })).toBeVisible();
});

test('must-handle: MAYA’s data is what the specs think it is', async ({ page }) => {
  await startGo(page, []);
  await expect(home(page).tiles).toHaveCount(MAYA.filter((r) => r.home !== false).length);
  await openGo(page);
  await expect(home(page).tiles).toHaveCount(4);
});
