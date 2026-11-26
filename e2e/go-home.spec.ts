/**
 * P-86 (B-11 slice 1), P-90: the new home, `/go` — tiles and "I'm going to…" (B-11 §5, §9b; B-12 v8).
 * Journeys J01 (first open), J02 (come back and pick up), J03 (say what you're going to do).
 * Seeded through a format-2 backup import (goFixture). Every wait is on a state attribute.
 * (The mode a run was left in — "planning · …" with Plan — and the New tile: e2e/go-plan.spec.ts.)
 */
import { expect, test } from './fixtures';
import { addStep, arrived, expectInside, home, MAYA, openGo, paused, plan, RoutineSpec, runner, settled, startGo, tile, sinceDate } from './goFixture';

const THREE = [
  { id: 'r1', routine: 'apply', at: 1, reason: 'need the job ad open', touchedMinutesAgo: 30 },
  { id: 'r2', routine: 'apply-acme', at: 1, waitingDaysAgo: 9, touchedMinutesAgo: 90 },
  { id: 'r3', routine: 'drawing', at: 0, touchedMinutesAgo: 10 },
];

/** A wait seeded nine days ago reads its date (within the last week it would be a day's name). */
const SINCE = sinceDate(9);

test('J01-a: first open, nothing yet — only the New tile and the prompt, and nothing is focused for you', async ({ page }) => {
  await startGo(page, [], 'home', []);
  const h = home(page);
  await expect(h.title).toHaveText('Nothing running');
  await expect(h.tiles).toHaveCount(0);
  await expect(h.screen.getByRole('button', { name: 'New', exact: true })).toBeVisible();
  await expect(h.prompt).toBeVisible();
  await expect(h.prompt).toHaveAccessibleName('I’m going to…');
  // No keyboard raised on a phone just by opening.
  await expect(h.prompt).not.toBeFocused();
  await expect(h.screen.getByTestId('go-rows')).toHaveCount(0);
  await expect(h.notice).toHaveCount(0);
});

test('J01-b, J01-c, J01-d, P-95 (2): typed words that match nothing offer nothing — no "New: …" row, and Return makes nothing; the New tile makes the routine (with the words typed) and Plan opens on it, asking for its first step; Start runs it', async ({ page }) => {
  await startGo(page, [], 'home', []);
  const h = home(page);
  await h.prompt.fill('Practise drawing');
  // The prompt only finds what exists: nothing matches, so there are no rows at all — no create offer.
  await expect(h.screen.getByTestId('go-rows')).toHaveCount(0);
  // (The one "New: …" on screen is the New tile itself, saying it will use the words — audit F5.)
  await expect(h.screen.getByText(/^New:/)).toHaveCount(1);
  await expect(h.screen.getByTestId('go-new').getByText(/^New:/)).toHaveCount(1);
  await h.prompt.press('Enter');
  // Typing (and Return) made nothing.
  await expect(h.tiles).toHaveCount(0);
  await expect(page).toHaveURL(/\/go$/);
  await expect(h.prompt).toHaveValue('Practise drawing');

  // Making something is the New tile's: it carries the words into the name, and says so (audit F5).
  const make = h.screen.getByTestId('go-new');
  await expect(make).toHaveText('New: Practise drawing');
  await expect(make).toHaveAccessibleName('New: Practise drawing');
  await make.click();
  const p = plan(page);
  await expect(p.title).toHaveText('Practise drawing');
  await expect(p.add).toBeFocused();
  await expect(p.add).toHaveAttribute('placeholder', 'Add a step');
  // Nothing to start until a step is typed: no button at all (never a dimmed one).
  await expect(p.forward).toHaveCount(0);
  await addStep(page, 'Warm-up lines');
  await expect(p.forward).toHaveText('Start');
  await p.forward.click();
  const r = runner(page);
  await expect(r.words).toHaveText('Warm-up lines');
  await expect(r.context).toHaveText('Practise drawing');
  await expect(r.next).toBeEnabled();

  // Back: the new home, with its tile, the run left running.
  await page.goBack();
  await expect(tile(page, 'Practise drawing')).toHaveAttribute('data-state', 'running');
  await expect(home(page).title).toHaveText('Running');
});

test('J01-b, P-95 (3): a start leaves no Undo and no notice (it is not something to take back); Undo after New takes the routine away', async ({ page }) => {
  await startGo(page, [], 'home', []);
  await home(page).prompt.fill('Bake bread');
  await home(page).screen.getByTestId('go-new').click();
  await addStep(page, 'Weigh the flour');
  await plan(page).forward.click();
  const r = runner(page);
  await expect(r.words).toHaveText('Weigh the flour');
  await expect(r.notice).toHaveCount(0);
  await expect(r.screen.getByRole('button', { name: /^Undo/ })).toHaveCount(0);
  await page.goBack();
  await expect(tile(page, 'Bake bread')).toHaveAttribute('data-state', 'running');
  await expect(home(page).notice).toHaveCount(0);
  await home(page).screen.getByRole('button', { name: 'Resume Bake bread', exact: true }).click();
  await runner(page).home.click();

  await home(page).prompt.fill('Learn the ukulele');
  await home(page).screen.getByTestId('go-new').click();
  await plan(page).screen.getByRole('button', { name: 'Undo New', exact: true }).click();
  await expect(home(page).tiles).toHaveCount(1);
  await expect(tile(page, 'Learn the ukulele')).toHaveCount(0);
});

test('J02-a, J34-d: tiles in a fixed order, each in its own colour, with its name, where it is and Resume or Start — and Plan, in words (a routine with no steps: Plan only)', async ({ page }) => {
  await startGo(page, THREE);
  const h = home(page);
  await expect(h.tiles).toHaveCount(4);
  // The order they were first made in: nothing is ranked, the run touched last is marked, not moved.
  await expect(h.tiles.getByRole('button')).toHaveText(['Resume', 'Plan', 'Resume', 'Plan', 'Resume', 'Plan', 'Plan']);
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
  await expect(h.screen.getByRole('button', { name: 'Plan Apply to Initech', exact: true })).toBeVisible();
  // Nothing to start yet (no steps): no Start, dimmed or otherwise.
  await expect(h.screen.getByRole('button', { name: 'Start Feel at home in Spanish', exact: true })).toHaveCount(0);
  await expect(h.screen.getByRole('button', { name: 'Plan Feel at home in Spanish', exact: true })).toBeVisible();
  // Each in its own colour.
  const colours = await h.tiles.evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor));
  expect(new Set(colours).size).toBe(4);
  // Nothing is counted: the only figures on a tile are a date.
  for (const text of await h.tiles.allInnerTexts()) expect(text.replace(`since ${SINCE}`, '')).not.toMatch(/\d/);
  // Resume, Start and Plan are outlined: home has no filled button.
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

test('J03-a: typing filters the tiles, then routines (P-95: and nothing else — no "New: …"); the first row is marked and Return takes it', async ({ page }) => {
  await startGo(page, THREE);
  const h = home(page);
  await h.prompt.fill('apply');
  await expect(h.tiles).toHaveCount(2);
  await expect(tile(page, 'Apply to Initech')).toHaveAttribute('data-first', 'true');
  await expect(tile(page, 'Apply to Acme')).toHaveAttribute('data-first', 'false');
  await expect(h.screen.getByTestId('go-rows')).toHaveCount(0);
  // A tile is found by the step it is at, too.
  await h.prompt.fill('tailor');
  await expect(h.tiles).toHaveCount(1);
  await expect(tile(page, 'Apply to Initech')).toHaveAttribute('data-first', 'true');
  // A routine that is not on home comes after the tiles.
  await h.prompt.fill('pro');
  await expect(h.tiles).toHaveCount(0);
  await expect(h.rows).toHaveText(['Start Proofread out loud']);
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

test('J03-b, P-95 (2): nothing matches — no rows and no create offer; Return makes and starts nothing', async ({ page }) => {
  await startGo(page, THREE);
  const h = home(page);
  await h.prompt.fill('  learn   the ukulele ');
  await expect(h.tiles).toHaveCount(0);
  await expect(h.screen.getByTestId('go-rows')).toHaveCount(0);
  await h.prompt.press('Enter');
  await expect(page).toHaveURL(/\/go$/);
  await expect(h.prompt).toHaveValue('  learn   the ukulele ');
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
  for (const name of ['Start Practise drawing', 'Start Apply to Acme']) {
    const b = h.screen.getByRole('button', { name, exact: true });
    await expect(b).toBeVisible();
    await expect(b).toBeDisabled();
    expect(await b.evaluate((e) => getComputedStyle(e).borderTopStyle)).toBe('dashed');
  }
  // Plan and New stay available: they run nothing (P-90: New makes the routine only).
  await expect(h.screen.getByTestId('go-new')).toBeEnabled();
  await expect(h.screen.getByRole('button', { name: 'Plan Practise drawing', exact: true })).toBeEnabled();
  // By the prompt neither: Return on another routine is refused, says what is running, and keeps the words.
  await h.prompt.fill('practise');
  await expect(tile(page, 'Practise drawing')).toHaveAttribute('data-first', 'true');
  await h.prompt.press('Enter');
  await expect(h.notice).toHaveText('Apply to Initech is running');
  await expect(h.prompt).toHaveValue('practise');
  await expect(page).toHaveURL(/\/go$/);
  // New starts nothing, so it is not refused: Plan opens on the new routine — and the run goes on running.
  await h.prompt.fill('bake bread');
  await expect(h.screen.getByTestId('go-new')).toBeEnabled();
  await h.screen.getByTestId('go-new').click();
  await expect(plan(page).title).toHaveText('bake bread');
  await expect(plan(page).forward).toHaveCount(0);
  await plan(page).home.click();
  await expect(h.title).toHaveText('Running');
  // (The prompt filters the tiles: cleared, they are all back.) Nothing changed: the same run is running, nothing else started.
  await h.prompt.fill('');
  await expect(h.tiles).toHaveCount(5);
  await expect(tile(page, 'Apply to Initech')).toHaveAttribute('data-state', 'running');
  await expect(tile(page, 'Practise drawing')).toHaveAttribute('data-state', 'idle');
  // Its own Resume goes back in.
  await own.click();
  await expect(runner(page).words).toHaveText('Tailor the CV');
});

test('P-95 (2): New with nothing typed asks for the name in a sheet of its own (never the prompt); Plan there makes the routine and opens its Plan; Close makes nothing', async ({ page }) => {
  await startGo(page, THREE);
  const h = home(page);
  await h.screen.getByTestId('go-new').click();
  let sheet = await arrived(page, 'go-new-sheet');
  await expect(sheet.getByRole('heading', { level: 2 })).toHaveText('New routine');
  const name = sheet.getByTestId('go-new-name');
  await expect(name).toHaveAccessibleName('Name');
  await expect(name).toBeFocused();
  await expect(h.prompt).not.toBeFocused();
  // Nothing named yet: Plan is unavailable. Close makes nothing.
  await expect(sheet.getByTestId('go-new-plan')).toBeDisabled();
  // (The sheet's handle is a Close too: the one in words is the last.)
  await sheet.getByRole('button', { name: 'Close', exact: true }).last().click();
  await expect(page.getByTestId('go-new-sheet')).toHaveCount(0);
  await expect(h.tiles).toHaveCount(4);
  // Named, Plan (the filled one) makes it and opens its Plan; Return does the same.
  await h.screen.getByTestId('go-new').click();
  sheet = await arrived(page, 'go-new-sheet');
  await sheet.getByTestId('go-new-name').fill('Learn the ukulele');
  const go = sheet.getByTestId('go-new-plan');
  await expect(go).toHaveAccessibleName('Plan Learn the ukulele');
  expect(await go.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgb(244, 241, 232)');
  await go.click();
  await expect(plan(page).title).toHaveText('Learn the ukulele');
  await expect(plan(page).add).toBeFocused();
  await plan(page).home.click();
  await h.screen.getByTestId('go-new').click();
  sheet = await arrived(page, 'go-new-sheet');
  await sheet.getByTestId('go-new-name').fill('Bake bread');
  await sheet.getByTestId('go-new-name').press('Enter');
  await expect(plan(page).title).toHaveText('Bake bread');
  await plan(page).home.click();
  await expect(h.tiles).toHaveCount(6);
});

test('P-95 (5): Home on the runner pauses the run — no ask — and home shows it first with Resume, the one filled button; Resume goes back to the same step', async ({ page }) => {
  await startGo(page, [...THREE.slice(1), { id: 'r1', routine: 'apply', at: 1, status: 'running' }], 'runner');
  const r = runner(page);
  await expect(r.home).toHaveText('Home');
  await expect(r.home).toHaveAccessibleName('Home, pausing Apply to Initech');
  const box = (await r.home.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(48);
  expect(box.width).toBeGreaterThanOrEqual(48);
  await r.home.click();
  // No ask: straight home.
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  const h = home(page);
  await expect(page).toHaveURL(/\/go$/);
  await expect(h.title).toHaveText('Nothing running');
  // It is paused, keeps its place, and is the FIRST tile, with Resume filled — the only filled button on home.
  const first = h.tiles.first();
  await expect(first).toHaveAccessibleName('Apply to Initech, paused at Tailor the CV');
  await expect(first).toHaveAttribute('data-state', 'paused');
  const resume = first.getByRole('button', { name: 'Resume Apply to Initech', exact: true });
  expect(await resume.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgb(244, 241, 232)');
  const filled = await h.screen.getByRole('button').evaluateAll((els) => els.filter((e) => getComputedStyle(e).backgroundColor === 'rgb(244, 241, 232)').length);
  expect(filled).toBe(1);
  // The other tiles keep their fixed order after it.
  const names = await h.tiles.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')?.split(',')[0]));
  expect(names).toEqual(['Apply to Initech', 'Apply to Acme', 'Practise drawing', 'Feel at home in Spanish']);
  // Nothing was ended or moved: Resume is the same step. Reopened, the app is where the person chose to go (audit F3):
  // home — the run still paused and first, its Resume filled.
  await page.reload();
  await expect(settled(page, 'home')).toBeVisible();
  await expect(page).toHaveURL(/\/go$/);
  await expect(home(page).tiles.first()).toHaveAttribute('data-state', 'paused');
  expect(await resume.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgb(244, 241, 232)');
  await page.goto('./go');
  await expect(settled(page, 'home')).toBeVisible();
  await resume.click();
  await expect(runner(page).words).toHaveText('Tailor the CV');
  await expect(page).toHaveURL(/\/go\/run\/r1$/);
});

test('P-95 (5): from every screen there is a visible way back to the paused run — Plan, the Jump screen, Settings and a routine’s Plan each have Home, and home has its Resume first', async ({ page }) => {
  await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'running' }], 'runner');
  await runner(page).home.click();
  const back = async () => {
    const h = home(page);
    await expect(h.tiles.first()).toHaveAccessibleName('Apply to Initech, paused at Tailor the CV');
    await expect(h.tiles.first().getByRole('button', { name: 'Resume Apply to Initech', exact: true })).toBeVisible();
  };
  await back();
  // Settings: its back control.
  await home(page).screen.getByTestId('go-settings-btn').click();
  await expect(settled(page, 'settings')).toBeVisible();
  await settled(page, 'settings').getByRole('button', { name: 'Back', exact: true }).click();
  await back();
  // Another routine's Plan: Home.
  await home(page).screen.getByRole('button', { name: 'Plan Practise drawing', exact: true }).click();
  await plan(page).home.click();
  await back();
  // A reload: still home (audit F3), the run first.
  await page.reload();
  await back();
  // The paused screen (Pause on the runner): Resume itself, and Home.
  await home(page).screen.getByRole('button', { name: 'Resume Apply to Initech', exact: true }).click();
  await runner(page).pause.click();
  await expect(paused(page).resume).toBeVisible();
  await paused(page).home.click();
  await back();
  // Its own Plan: Resume at <step> is there; Home leaves it in Plan, and its tile is still first.
  await home(page).screen.getByRole('button', { name: 'Plan Apply to Initech', exact: true }).click();
  await expect(plan(page).forward).toHaveText('Resume at Tailor the CV');
  await plan(page).home.click();
  await expect(home(page).tiles.first()).toHaveAccessibleName('Apply to Initech, planning, at Tailor the CV');
});

test('P-95 audit F3: after Home the app reopens on home (where the person chose to go), the run first with Resume filled; after Pause it reopens on the paused screen as before; Resume then Home again: home', async ({ page }) => {
  await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'running' }], 'runner');
  await runner(page).home.click();
  await expect(settled(page, 'home')).toBeVisible();
  for (const open of [() => page.reload(), () => page.goto('./go')]) {
    await open();
    const h = home(page);
    await expect(h.screen).toBeVisible();
    await expect(page).toHaveURL(/\/go$/);
    await expect(h.tiles.first()).toHaveAccessibleName('Apply to Initech, paused at Tailor the CV');
    expect(await h.tiles.first().getByRole('button', { name: 'Resume Apply to Initech', exact: true }).evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgb(244, 241, 232)');
  }
  // Pause (not Home): the app reopens where it was left, the paused screen.
  await home(page).screen.getByRole('button', { name: 'Resume Apply to Initech', exact: true }).click();
  await runner(page).pause.click();
  await page.goto('./go');
  await expect(paused(page).line).toHaveText('at Tailor the CV');
  // Home from there: home again on reopening.
  await paused(page).home.click();
  await expect(settled(page, 'home')).toBeVisible();
  await expect(page).toHaveURL(/\/go$/);
  await page.reload();
  await expect(home(page).tiles.first()).toHaveAttribute('data-state', 'paused');
  await expect(page).toHaveURL(/\/go$/);
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

test('a tile’s Plan opens its routine’s Plan; Settings is one control at the top right; there is no way “back” to an old app (P-89)', async ({ page }) => {
  await startGo(page, []);
  await home(page).screen.getByRole('button', { name: 'Plan Practise drawing', exact: true }).click();
  await expect(plan(page).title).toHaveText('Practise drawing');
  await expect(page).toHaveURL(/\/go\/routine\/drawing$/);
  // Back from Plan is home (the band's Home, and the browser's Back).
  await page.goBack();
  await expect(settled(page, 'home')).toBeVisible();
  await home(page).screen.getByRole('button', { name: 'Plan Practise drawing', exact: true }).click();
  await plan(page).home.click();
  const h = home(page);
  await expect(h.screen.getByRole('button', { name: /Back/ })).toHaveCount(0);
  await expect(page.getByText('Wanderment')).toHaveCount(0);
  const control = h.screen.getByRole('button', { name: 'Settings', exact: true });
  await expect(control).toHaveCount(1);
  const box = (await control.boundingBox())!;
  const title = (await h.title.boundingBox())!;
  // A 48 px target (B-11 §6), right of the title, at the right edge, on the title's row.
  expect(box.width).toBeGreaterThanOrEqual(48);
  expect(box.height).toBeGreaterThanOrEqual(48);
  expect(box.x).toBeGreaterThanOrEqual(title.x + title.width - 1);
  expect(box.x + box.width).toBeGreaterThan(390 - 24);
  expect(box.y).toBeLessThan(title.y + title.height);
  await control.click();
  await expect(settled(page, 'settings').getByRole('heading', { level: 1 })).toHaveText('Settings');
  await expect(page).toHaveURL(/\/wanderment\/go\/settings$/);
  // Back (the screen's own, as on every sub-screen) returns to the home, its tiles as they were.
  await settled(page, 'settings').getByRole('button', { name: 'Back', exact: true }).click();
  await expect(home(page).tiles).toHaveCount(4);
  await expect(page).toHaveURL(/\/wanderment\/go$/);
});

test('must-handle: MAYA’s data is what the specs think it is', async ({ page }) => {
  await startGo(page, []);
  await expect(home(page).tiles).toHaveCount(MAYA.filter((r) => r.home !== false).length);
  await openGo(page);
  await expect(home(page).tiles).toHaveCount(4);
});
