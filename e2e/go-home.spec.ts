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
 *
 * P-97 (owner, 2026-11-26): home shows only the runs going (Ongoing / Finishing); a routine with nothing going is
 * on My routines (e2e/go-routines.spec.ts), where its Start and Plan now are. The tests that counted every routine
 * as a tile, or reached an idle routine's Start or Plan from its tile, are rewritten to that; each says so.
 */
import { expect, test } from './fixtures';
import { addStep, arrived, expectInside, home, MAYA, openGo, openRoutines, pauseRun, plan, planFromRoutines, routines, RoutineSpec, runner, RunSpec, settled, startGo, startThing, tile, tileBody, sinceDate, editPlan, savePlan } from './goFixture';

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
  await savePlan(page); // (P-115, rewritten: saved first — a run, home and the backup read the saved routine.)
  await expect(p.forward).toHaveCount(0);
  await addStep(page, 'Warm-up lines');
  await savePlan(page); // (P-115, rewritten: saved first — a run, home and the backup read the saved routine.)
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
  await savePlan(page); // (P-115, rewritten: saved first — a run, home and the backup read the saved routine.)
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

test('J02-a, J34-d: tiles in a fixed order, each in its own colour, with its name, where it is and Resume — and Plan, in words (P-97; was: and every routine with nothing going, with Start)', async ({ page }) => {
  await startGo(page, THREE);
  const h = home(page);
  // P-97 (was: 4, "Feel at home in Spanish" with nothing going among them): the three runs going.
  await expect(h.tiles).toHaveCount(3);
  // The order they were first made in: nothing is ranked, the run touched last is marked, not moved.
  // P-101 (ruling 5; was: Resume / Plan buttons): a run's body resumes it; every tile has Plan.
  await expect(h.tiles.getByTestId('go-tile-body')).toHaveCount(3);
  await expect(h.tiles.getByRole('button', { name: /^Plan / })).toHaveCount(3);
  const names = await h.tiles.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  expect(names).toEqual([
    'Apply to Initech, paused at Tailor the CV, need the job ad open',
    `Apply to Acme, waiting for a reply from Acme · since ${SINCE}`,
    'Practise drawing, paused at Warm-up lines',
  ]);
  await expect(tile(page, 'Apply to Initech').getByTestId('go-tile-line')).toHaveText('at Tailor the CV');
  await expect(tile(page, 'Apply to Initech').getByTestId('go-tile-reason')).toHaveText('need the job ad open');
  await expect(tile(page, 'Apply to Acme').getByTestId('go-tile-line')).toHaveText(`waiting for a reply from Acme · since ${SINCE}`);
  // P-97: nothing going there — not on home (it is on My routines).
  await expect(tile(page, 'Feel at home in Spanish')).toHaveCount(0);
  await expect(tile(page, 'Practise drawing')).toHaveAttribute('data-current', 'true');
  await expect(h.screen.locator('[data-testid="go-tile"][data-current="true"]')).toHaveCount(1);
  // Spoken names for the repeated buttons.
  await expect(h.screen.getByRole('button', { name: /^Resume Apply to Initech, at Tailor the CV/ })).toBeVisible();
  await expect(h.screen.getByRole('button', { name: 'Plan Apply to Initech', exact: true })).toBeVisible();
  // (P-97: a routine with no steps has no Start on My routines either — e2e/go-routines.spec.ts.)
  // Each in its own colour.
  const colours = await h.tiles.evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor));
  expect(new Set(colours).size).toBe(3);
  // Nothing is counted: the only figures on a tile are a date.
  for (const text of await h.tiles.allInnerTexts()) expect(text.replace(`since ${SINCE}`, '')).not.toMatch(/\d/);
  // Resume and Plan are outlined: home has no filled button.
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
  await expect(page.getByTestId('go-resume')).toHaveText('Resume Tailor the CV'); // (P-100, rewritten: was toHaveCount(0) — the top row's step is the one filled Resume.)
});

test('one thing at a time: a start while something is running is unavailable (P-97: on My routines; was: on idle tiles); Plan and New stay; the running run is resumed by its tile (P-101; was: by the bottom bar)', async ({ page }) => {
  await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'running' }], 'runner');
  await page.goBack();
  const h = home(page);
  // The running run's tile says so; P-101 (ruling 5; was: the bottom bar): its body resumes it (outlined: home has no filled button).
  await expect(tile(page, 'Apply to Initech')).toHaveAccessibleName('Apply to Initech, running, at Tailor the CV');
  const own = tileBody(page, 'Apply to Initech');
  await expect(own).toHaveAccessibleName(/^Resume Apply to Initech/);
  await expect(own).toBeEnabled();
  expect(await own.evaluate((e) => getComputedStyle(e).backgroundColor)).not.toBe('rgb(244, 241, 232)');
  // P-97 (was: the idle tiles' Start, dashed and disabled): on My routines every other Start is shown but
  // unavailable until you pause — no way to switch from there; Plan stays.
  const list = await openRoutines(page);
  for (const name of ['Practise drawing', 'Apply to Acme']) {
    await list.more(name).click();
    const menu = await arrived(page, 'go-routine-menu');
    await expect(menu.getByRole('menuitem', { name: `Start ${name}`, exact: true })).toBeDisabled();
    await expect(menu.getByRole('menuitem', { name: `Plan ${name}`, exact: true })).toBeEnabled();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('go-routine-menu')).toHaveCount(0);
  }
  await list.home.click();
  // New stays available: it runs nothing (P-90: New makes the routine only).
  await expect(h.newBtn).toBeEnabled();
  // New starts nothing, so it is not refused: Plan opens on the new routine — and the run goes on running.
  await startThing(page, 'bake bread');
  await savePlan(page); // (P-115, rewritten: saved first — a run, home and the backup read the saved routine.)
  await expect(plan(page).forward).toHaveCount(0);
  await plan(page).home.click();
  // P-97 (was: 5 tiles): only the run going.
  await expect(h.tiles).toHaveCount(1);
  await expect(tile(page, 'Apply to Initech')).toHaveAttribute('data-state', 'running');
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
  await expect(name).toHaveAccessibleName('What do you want to do?'); // (P-114, rewritten: was 'Name' — the question is the field's label.)
  await expect(name).toBeFocused();
  // Nothing named yet: Plan is unavailable. Close makes nothing.
  await expect(sheet.getByTestId('go-new-plan')).toBeDisabled(); // (P-114: the same button, now "Start from scratch".)
  // (The sheet's handle is a Close too: the one in words is the last.)
  await sheet.getByRole('button', { name: 'Close', exact: true }).last().click();
  await expect(page.getByTestId('go-new-sheet')).toHaveCount(0);
  // P-97 (was: 4, with the routine that had nothing going): the three runs going.
  await expect(h.tiles).toHaveCount(3);
  // Named, Plan (the filled one) makes it and opens its Plan; Return does the same.
  await h.screen.getByTestId('go-new').click();
  sheet = await arrived(page, 'go-new-sheet');
  await sheet.getByTestId('go-new-name').fill('Learn the ukulele');
  const go = sheet.getByTestId('go-new-plan');
  await expect(go).toHaveAccessibleName('Start from scratch: Learn the ukulele'); // (P-114, rewritten: was 'Plan Learn the ukulele'.)
  // (P-114, rewritten: was Plan, the filled button — the filled one is now the start the words mark, here Learn it.)
  expect(await sheet.locator('[data-testid="go-new-start"][data-start="learn"]').evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgb(244, 241, 232)');
  await go.click();
  await expect(plan(page).title).toHaveText('Learn the ukulele');
  await editPlan(page); // (P-115, rewritten: Plan opens read-only — Edit first.)
  await expect(plan(page).add).toBeFocused();
  await savePlan(page); // (P-115, rewritten: saved first — a run, home and the backup read the saved routine.)
  await plan(page).home.click();
  await h.screen.getByTestId('go-new').click();
  sheet = await arrived(page, 'go-new-sheet');
  await sheet.getByTestId('go-new-name').fill('Bake bread');
  // (P-114, rewritten: was Return = Plan, the empty routine — Return takes the filled start, here Work it out, whose
  // composer Skip the rest closes into the routine's Plan.)
  await sheet.getByTestId('go-new-name').press('Enter');
  await expect(page.getByTestId('go-compose-question')).toBeVisible();
  await page.getByTestId('go-compose-skip').click();
  await expect(plan(page).title).toHaveText('Bake bread');
  await plan(page).home.click();
  // P-97 (was: 6 tiles): New makes the routine only, so home is as it was; both are on My routines.
  await expect(h.tiles).toHaveCount(3);
  await expect((await openRoutines(page)).row('Learn the ukulele')).toHaveCount(1);
  await expect(routines(page).row('Bake bread')).toHaveCount(1);
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
  await expect(first.getByTestId('go-tile-last')).toHaveText('Last ran'); // (P-110, rewritten: was 'last' — the owner: "last is relative"; it reads "Last ran".)
  const resume = tileBody(page, 'Apply to Initech');
  await expect(resume).toHaveAccessibleName(/^Resume Apply to Initech/);
  const filled = await h.screen.getByRole('button').evaluateAll((els) => els.filter((e) => getComputedStyle(e).backgroundColor === 'rgb(244, 241, 232)').length);
  expect(filled).toBe(1); // (P-100, rewritten: was 0 — the top row's Resume is the one filled button.)
  // The other tiles keep their fixed order after it.
  const names = await h.tiles.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')?.split(',')[0]));
  // (P-97: the routine with nothing going is not among them.)
  expect(names).toEqual(['Apply to Initech', 'Apply to Acme', 'Practise drawing']);
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
  // Another routine's Plan — P-97 (was: from its idle tile, then Home): from My routines, then back there and Home.
  await planFromRoutines(page, 'Practise drawing');
  await plan(page).toRoutines.click();
  await routines(page).home.click();
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

test('one tile; and twenty tiles scroll while + New stays in reach (P-96; was: the prompt; P-101: no filled button — the paused run is first, by when it started; P-97: each a run going — was: routines with nothing going)', async ({ page }) => {
  const one: RoutineSpec[] = [{ id: 'apply', name: 'Apply to Initech', steps: ['Read the job ad twice'] }];
  await startGo(page, [{ id: 'r0', routine: 'apply', at: 0 }], 'home', one);
  await expect(home(page).tiles).toHaveCount(1);
  await expectInside(page, [home(page).tiles.first(), home(page).newBtn]);

  const twenty: RoutineSpec[] = Array.from({ length: 20 }, (_, i) => ({ id: `t${i}`, name: `Routine ${String.fromCharCode(65 + i)}`, steps: ['A step'] }));
  // (The paused one was started first: it is first.)
  const runs: RunSpec[] = twenty.map((r, i) => ({ id: `r${i}`, routine: r.id, at: 0, ...(i === 19 && { status: 'paused' as const, startedDaysAgo: 2 }) }));
  await startGo(page, runs, 'home', twenty);
  const h = home(page);
  await expect(h.tiles).toHaveCount(20);
  await expectInside(page, [h.newBtn, tileBody(page, 'Routine T')]);
  await h.tiles.last().scrollIntoViewIfNeeded();
  await expect(h.tiles.last()).toBeInViewport();
  await expectInside(page, [h.newBtn]);
});

test('a routine’s Plan (P-97: from My routines; was: an idle tile’s Plan) opens its Plan; Settings is one control at the top right; there is no way “back” to an old app (P-89)', async ({ page }) => {
  await startGo(page, []);
  await planFromRoutines(page, 'Practise drawing');
  await expect(page).toHaveURL(/\/go\/routine\/drawing\?from=routines$/);
  // P-97 (was: Back from Plan is home): Back from it is My routines (its way out says so, and the browser's Back), then home.
  await page.goBack();
  await expect(settled(page, 'routines')).toBeVisible();
  await routines(page).row('Practise drawing').getByTestId('go-routine-body').click();
  await plan(page).toRoutines.click();
  await routines(page).home.click();
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
  // P-97 (was: its 4 tiles): nothing going — home says so, with My routines.
  await expect(home(page).idle).toBeVisible();
  await expect(home(page).routinesBtn).toBeVisible();
  await expect(page).toHaveURL(/\/wanderment\/go$/);
});

test('must-handle: MAYA’s data is what the specs think it is (P-97; was: a tile for each routine on home — now no tile, and every one on My routines)', async ({ page }) => {
  await startGo(page, []);
  await expect(home(page).tiles).toHaveCount(0);
  await openGo(page);
  await expect(home(page).tiles).toHaveCount(0);
  await expect((await openRoutines(page)).rows).toHaveCount(MAYA.length);
});
