/**
 * P-86 (B-11 slice 1), P-90, P-96: the new home, `/go` — tiles (B-11 §5, §9b; B-12 v8). Journeys J01
 * (first open), J02 (come back and pick up). Seeded through a format-2 backup import (goFixture).
 * Every wait is on a state attribute. (The mode a run was left in — "planning · …" with Plan — and
 * New: e2e/go-plan.spec.ts. P-96's one navigation scheme on home: e2e/go-nav.spec.ts.)
 *
 * P-96 (contract ruling 8): no "Nothing running" / "Running" title and no "I'm going to…" prompt. The
 * J03 tests (typing filters the tiles, Return takes the first row, nothing matches) are removed with
 * the prompt; making a routine is + New's own sheet (kept below).
 *
 * P-101 (ruling 5): the filled "Resume <name>" bar is gone — a run's tile BODY resumes it ("Resume
 * <name>"); the order never changes for a pause (runs by when each was started); the run touched last is
 * marked "last"; Pause opens its own sheet first (e2e/go-moves.spec.ts). Each rewrite says what it was.
 */
import { expect, test } from './fixtures';
import { addStep, arrived, expectInside, home, MAYA, openGo, pauseRun, plan, RoutineSpec, runner, settled, startGo, startThing, tile, tileBody, sinceDate } from './goFixture';

const THREE = [
  { id: 'r1', routine: 'apply', at: 1, reason: 'need the job ad open', touchedMinutesAgo: 30 },
  { id: 'r2', routine: 'apply-acme', at: 1, waitingDaysAgo: 9, touchedMinutesAgo: 90 },
  { id: 'r3', routine: 'drawing', at: 0, touchedMinutesAgo: 10 },
];

/** A wait seeded nine days ago reads its date (within the last week it would be a day's name). */
const SINCE = sinceDate(9);

test('J01-a (P-96; was: the New tile and the prompt): first open, nothing yet — only + New, no prompt, no title in words, and nothing is focused for you to type in', async ({ page }) => {
  await startGo(page, [], 'home', []);
  const h = home(page);
  await expect(h.screen.getByText('Nothing running', { exact: true })).toHaveCount(0);
  await expect(h.tiles).toHaveCount(0);
  await expect(h.newBtn).toBeVisible();
  await expect(h.newBtn).toHaveAccessibleName('New');
  await expect(h.screen.getByRole('textbox')).toHaveCount(0);
  await expect(page.getByTestId('go-resume')).toHaveCount(0);
  await expect(h.notice).toHaveCount(0);
});

test('J01-b, J01-c, J01-d (P-96; was: through the prompt and the New tile): + New makes the routine and Plan opens on it, asking for its first step; Start runs it', async ({ page }) => {
  await startGo(page, [], 'home', []);
  await startThing(page, 'Practise drawing');
  const p = plan(page);
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

  // Back: the new home, with its tile, the run left running — P-101 (ruling 5; was: its Resume the filled button): its body resumes it.
  await page.goBack();
  await expect(tile(page, 'Practise drawing')).toHaveAttribute('data-state', 'running');
  await expect(tileBody(page, 'Practise drawing')).toHaveAccessibleName(/^Resume Practise drawing/);
});

test('J01-b, P-95 (3): a start leaves no Undo and no notice (it is not something to take back); Undo after New takes the routine away', async ({ page }) => {
  await startGo(page, [], 'home', []);
  await startThing(page, 'Bake bread');
  await addStep(page, 'Weigh the flour');
  await plan(page).forward.click();
  const r = runner(page);
  await expect(r.words).toHaveText('Weigh the flour');
  await expect(r.notice).toHaveCount(0);
  await expect(r.screen.getByRole('button', { name: /^Undo/ })).toHaveCount(0);
  await page.goBack();
  await expect(tile(page, 'Bake bread')).toHaveAttribute('data-state', 'running');
  await expect(home(page).notice).toHaveCount(0);
  await tileBody(page, 'Bake bread').click();
  await pauseRun(page);

  await startThing(page, 'Learn the ukulele');
  await plan(page).screen.getByRole('button', { name: 'Undo New', exact: true }).click();
  await expect(home(page).tiles).toHaveCount(1);
  await expect(tile(page, 'Learn the ukulele')).toHaveCount(0);
});

test('J02-a, J34-d: tiles in a fixed order, each in its own colour, with its name, where it is and Resume or Start — and Plan, in words (a routine with no steps: Plan only)', async ({ page }) => {
  await startGo(page, THREE);
  const h = home(page);
  await expect(h.tiles).toHaveCount(4);
  // The order they were first made in: nothing is ranked, the run touched last is marked, not moved.
  // P-101 (ruling 5; was: Resume / Plan buttons): a run's body resumes it; every tile has Plan.
  await expect(h.tiles.getByTestId('go-tile-body')).toHaveCount(3);
  await expect(h.tiles.getByRole('button', { name: /^Plan / })).toHaveCount(4);
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
  await expect(h.screen.getByRole('button', { name: /^Resume Apply to Initech, at Tailor the CV/ })).toBeVisible();
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
  await tileBody(page, 'Apply to Initech').click();
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
  // P-96: no title in words; the heading (for a screen reader) has the focus.
  await expect(home(page).title).toHaveText('Home');
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

test('J02-b (P-96; was: with a paused run /go opens its paused screen): with a paused run /go opens home, the run first — P-101 (was: Resume filled): its body resumes it', async ({ page }) => {
  await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'paused' }], 'home');
  await expect(page).toHaveURL(/\/go$/);
  await expect(home(page).tiles.first()).toHaveAccessibleName('Apply to Initech, paused at Tailor the CV');
  await expect(tileBody(page, 'Apply to Initech')).toHaveAccessibleName(/^Resume Apply to Initech/);
  await expect(page.getByTestId('go-resume')).toHaveCount(0);
});

test('one thing at a time: a start while something is running is unavailable; Plan and New stay; the running run is resumed by its tile (P-101; was: by the bottom bar)', async ({ page }) => {
  await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'running' }], 'runner');
  await page.goBack();
  const h = home(page);
  // The running run's tile says so; P-101 (ruling 5; was: the bottom bar): its body resumes it (outlined: home has no filled button).
  await expect(tile(page, 'Apply to Initech')).toHaveAccessibleName('Apply to Initech, running, at Tailor the CV');
  const own = tileBody(page, 'Apply to Initech');
  await expect(own).toHaveAccessibleName(/^Resume Apply to Initech/);
  await expect(own).toBeEnabled();
  expect(await own.evaluate((e) => getComputedStyle(e).backgroundColor)).not.toBe('rgb(244, 241, 232)');
  // Everything else is shown but unavailable (dashed AND disabled) until you pause: no way to switch from here.
  for (const name of ['Start Practise drawing', 'Start Apply to Acme']) {
    const b = h.screen.getByRole('button', { name, exact: true });
    await expect(b).toBeVisible();
    await expect(b).toBeDisabled();
    expect(await b.evaluate((e) => getComputedStyle(e).borderTopStyle)).toBe('dashed');
  }
  // Plan and New stay available: they run nothing (P-90: New makes the routine only).
  await expect(h.newBtn).toBeEnabled();
  await expect(h.screen.getByRole('button', { name: 'Plan Practise drawing', exact: true })).toBeEnabled();
  // New starts nothing, so it is not refused: Plan opens on the new routine — and the run goes on running.
  await startThing(page, 'bake bread');
  await expect(plan(page).forward).toHaveCount(0);
  await plan(page).home.click();
  await expect(h.tiles).toHaveCount(5);
  await expect(tile(page, 'Apply to Initech')).toHaveAttribute('data-state', 'running');
  await expect(tile(page, 'Practise drawing')).toHaveAttribute('data-state', 'idle');
  // Its Resume goes back in.
  await own.click();
  await expect(runner(page).words).toHaveText('Tailor the CV');
});

test('P-95 (2): New asks for the name in a sheet of its own; Plan there makes the routine and opens its Plan; Close makes nothing', async ({ page }) => {
  await startGo(page, THREE);
  const h = home(page);
  await h.screen.getByTestId('go-new').click();
  let sheet = await arrived(page, 'go-new-sheet');
  await expect(sheet.getByRole('heading', { level: 2 })).toHaveText('New routine');
  const name = sheet.getByTestId('go-new-name');
  await expect(name).toHaveAccessibleName('Name');
  await expect(name).toBeFocused();
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

test('P-95 (5), P-96 (was: Home on the runner): Pause pauses the run and home shows it in its place — P-101 (rulings 3, 5; was: "no ask", first, "Resume <name>" the one filled button): its sheet first, marked "last", its body resumes the same step', async ({ page }) => {
  await startGo(page, [...THREE.slice(1), { id: 'r1', routine: 'apply', at: 1, status: 'running' }], 'runner');
  const r = runner(page);
  await expect(r.pause).toHaveAccessibleName('Pause and go home');
  const box = (await r.pause.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(48);
  expect(box.width).toBeGreaterThanOrEqual(48);
  // P-101 (ruling 3; was: no ask): its own sheet, the note optional — never a confirm.
  await pauseRun(page);
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  const h = home(page);
  await expect(page).toHaveURL(/\/go$/);
  // It is paused and keeps its place (the runs by when each started — it was started with the others); marked "last"; its body resumes it. No filled button on home.
  const first = h.tiles.first();
  await expect(first).toHaveAccessibleName('Apply to Initech, paused at Tailor the CV');
  await expect(first).toHaveAttribute('data-state', 'paused');
  await expect(first.getByTestId('go-tile-last')).toHaveText('last');
  const resume = tileBody(page, 'Apply to Initech');
  await expect(resume).toHaveAccessibleName(/^Resume Apply to Initech/);
  const filled = await h.screen.getByRole('button').evaluateAll((els) => els.filter((e) => getComputedStyle(e).backgroundColor === 'rgb(244, 241, 232)').length);
  expect(filled).toBe(0);
  // The other tiles keep their fixed order after it.
  const names = await h.tiles.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')?.split(',')[0]));
  expect(names).toEqual(['Apply to Initech', 'Apply to Acme', 'Practise drawing', 'Feel at home in Spanish']);
  // Nothing was ended or moved: Resume is the same step. Reopened, the app is home — the run still paused and first.
  await page.reload();
  await expect(settled(page, 'home')).toBeVisible();
  await expect(page).toHaveURL(/\/go$/);
  await expect(home(page).tiles.first()).toHaveAttribute('data-state', 'paused');
  await page.goto('./go');
  await expect(settled(page, 'home')).toBeVisible();
  await resume.click();
  await expect(runner(page).words).toHaveText('Tailor the CV');
  await expect(page).toHaveURL(/\/go\/run\/r1$/);
});

test('P-95 (5): from every screen there is a visible way back to the paused run — Plan, Settings and a routine’s Plan each have Home, and home has its Resume (P-101: its tile’s body)', async ({ page }) => {
  await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'running' }], 'runner');
  await pauseRun(page);
  const back = async () => {
    const h = home(page);
    await expect(h.tiles.first()).toHaveAccessibleName('Apply to Initech, paused at Tailor the CV');
    await expect(tileBody(page, 'Apply to Initech')).toHaveAccessibleName(/^Resume Apply to Initech/);
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
  // A reload: still home, the run first.
  await page.reload();
  await back();
  // Its own Plan: Resume at <step> is there; Home changes nothing — P-101 (ruling 4; was: "planning, at …"): still paused, still first.
  await home(page).screen.getByRole('button', { name: 'Plan Apply to Initech', exact: true }).click();
  await expect(plan(page).forward).toHaveText('Resume at Tailor the CV');
  await plan(page).home.click();
  await expect(home(page).tiles.first()).toHaveAccessibleName('Apply to Initech, paused at Tailor the CV');
});

test('P-95 audit F3, P-96 (was: after Pause it reopens on the paused screen): after Pause the app reopens on home, the run first and resumed by its tile (P-101; was: "Resume <name>" filled) — every time', async ({ page }) => {
  await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'running' }], 'runner');
  await pauseRun(page);
  await expect(settled(page, 'home')).toBeVisible();
  for (const open of [() => page.reload(), () => page.goto('./go')]) {
    await open();
    const h = home(page);
    await expect(h.screen).toBeVisible();
    await expect(page).toHaveURL(/\/go$/);
    await expect(h.tiles.first()).toHaveAccessibleName('Apply to Initech, paused at Tailor the CV');
    await expect(tileBody(page, 'Apply to Initech')).toHaveAccessibleName(/^Resume Apply to Initech/);
  }
  await tileBody(page, 'Apply to Initech').click();
  await pauseRun(page);
  await page.goto('./go');
  await expect(home(page).tiles.first()).toHaveAttribute('data-state', 'paused');
  await expect(page).toHaveURL(/\/go$/);
});

test('one tile; and twenty tiles scroll while + New stays in reach (P-96; was: the prompt; P-101: no filled button — the paused run is first, by when it started)', async ({ page }) => {
  const one: RoutineSpec[] = [{ id: 'apply', name: 'Apply to Initech', steps: ['Read the job ad twice'] }];
  await startGo(page, [], 'home', one);
  await expect(home(page).tiles).toHaveCount(1);
  await expectInside(page, [home(page).tiles.first(), home(page).newBtn]);

  const twenty: RoutineSpec[] = Array.from({ length: 20 }, (_, i) => ({ id: `t${i}`, name: `Routine ${String.fromCharCode(65 + i)}`, steps: ['A step'] }));
  await startGo(page, [{ id: 'r1', routine: 't19', at: 0, status: 'paused' }], 'home', twenty);
  const h = home(page);
  await expect(h.tiles).toHaveCount(20);
  await expectInside(page, [h.newBtn, tileBody(page, 'Routine T')]);
  await h.tiles.last().scrollIntoViewIfNeeded();
  await expect(h.tiles.last()).toBeInViewport();
  await expectInside(page, [h.newBtn]);
});

test('a tile’s Plan opens its routine’s Plan; Settings is one control at the top right; there is no way “back” to an old app (P-89)', async ({ page }) => {
  await startGo(page, []);
  await home(page).screen.getByRole('button', { name: 'Plan Practise drawing', exact: true }).click();
  await expect(plan(page).title).toHaveText('Practise drawing');
  await expect(page).toHaveURL(/\/go\/routine\/drawing$/);
  // Back from Plan is home (Plan's Home, and the browser's Back).
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
  // A 48 px target (B-11 §6), top right (P-96: no title in words beside it).
  expect(box.width).toBeGreaterThanOrEqual(48);
  expect(box.height).toBeGreaterThanOrEqual(48);
  expect(box.x + box.width).toBeGreaterThan(390 - 24);
  expect(box.y).toBeLessThan(64);
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
