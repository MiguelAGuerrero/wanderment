/**
 * P-90 (B-12): Plan — its own surface, where the sequence is shaped. These specs drive the built app:
 * plan ↔ run and back to the same step; every Plan edit with its Undo; "Repeat from here" moved and
 * counted; breaking a step down and resuming on the first small step; the edge of a goal; creating
 * (+ New); the mode on home and after a reload; a run from the build before with this-run changes;
 * removing the HERE step; two tabs; old addresses. P-96: the band holds only PLAN — Home and (at the
 * edge) Done are the bottom side doors; no "Ends here"; Next with nothing next ends the run (it never
 * opens Plan); the paused screen is gone; home has no title in words and no prompt.
 * P-101 (rulings 2, 4–6): Plan is a view — a run in it is paused, plainly ("at <step>", never "planning";
 * no mode written; `/go` reopens home); Home is in the band; the runner's Plan is on its top line (Step in
 * is a move beside Next); a Plan edit gives no notice — its Undo is the routine's menu (`expectEdit`,
 * `undoEdit`). Each rewrite says what it was.
 * Expected values come from B-12 (frames v1, v2, v4, v5, v8), the contract's rulings and DESIGN.md.
 */
import { expect, test } from './fixtures';
import {
  addStep,
  anotherTab,
  arrived,
  expectSteps,
  exported,
  focused,
  home,
  importBackup,
  MAYA,
  openGo,
  place,
  plan,
  planMenu,
  planType,
  PREVIOUS_BUILD_BACKUP,
  RoutineSpec,
  runner,
  saved,
  seedGo,
  setVisibility,
  startGo,
  startThing,
  tile,
  turn,
  expectEdit, expectRemoved,
  expectNoEdit,
  undoEdit,
  tileBody,
  closeMenu,
  expectFinal,
  menuItems,
  planMove,
  openRoutines,
  planFromRoutines,
  routines,
} from './goFixture';

/** The mockup's routine (B-12 v2): one step, then two that repeat. */
const TEST: RoutineSpec = { id: 'test', name: 'Test out the app', steps: ['Select a feature to test', 'Vibe check', 'Write down concerns'], repeatFrom: 1 };
const ROUTINES = [TEST, ...MAYA];
/** Running, on "Vibe check" (the first repeating step), in round 2. */
const ON_VIBE = [{ id: 'r1', routine: 'test', at: 1, round: 2, status: 'running' as const }];
/** Left in Plan on "Vibe check": the run the app is on. */
const PLANNING = [{ id: 'r1', routine: 'test', at: 1, round: 2, status: 'paused' as const, mode: 'plan' as const }];

/** P-95: five steps, the last two repeating; a run left in Plan on the first. */
const FIVE = ['One', 'Two', 'Three', 'Four', 'Five'];
const DRAG: RoutineSpec = { id: 'drag', name: 'Five steps', steps: FIVE, repeatFrom: 3 };
const DRAGGING = [{ id: 'r1', routine: 'drag', at: 0, status: 'paused' as const, mode: 'plan' as const }];
/** A Plan row's grip, by its words. */
const gripOf = (page: Parameters<typeof plan>[0], words: string) => plan(page).screen.getByRole('button', { name: `Reorder ${words}`, exact: true });
/** WCAG contrast of two CSS rgb() colours. */
const contrast = (a: string, b: string) => {
  const lum = (rgb: string) => {
    const [r, g, bl] = rgb.match(/[\d.]+/g)!.slice(0, 3).map((v) => {
      const c = Number(v) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  return (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
};
const centre = async (l: ReturnType<typeof gripOf>) => {
  const b = (await l.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

const run = async (page: Parameters<typeof exported>[0], id = 'r1') => (await exported(page)).runs[id];
const stepsOf = async (page: Parameters<typeof exported>[0], id = 'test') => {
  const r = (await exported(page)).routines[id];
  return { steps: (r.items ?? []).map((i) => i.text ?? (i.wait !== undefined ? `wait:${i.wait}` : `ref:${i.ref}`)), from: r.repeatFrom, repeat: r.repeat };
};

test.describe('plan ↔ run', () => {
  test('the runner’s Plan (P-101: on its top line; was: the middle button); Plan is its own surface (the band with PLAN and Home, the name as the heading, "at <step>" — P-101: never "planning" —, rows with HERE); Resume at <step> goes back exactly where you were', async ({ page }) => {
    await startGo(page, ON_VIBE, 'runner', ROUTINES);
    const r = runner(page);
    await expect(r.words).toHaveText('Vibe check');
    await expect(r.plan).toHaveText('Plan');
    await expect(r.plan).toBeEnabled();
    // What the runner says on arriving: running, and the step.
    await expect(r.said).toHaveText('Running: Vibe check');
    await r.plan.click();

    const p = plan(page);
    await expect(p.screen).toBeVisible();
    // P-103 (3; was: the plain address, and ⌂ Home): opened from the runner it says so — its address, and its way out.
    await expect(page).toHaveURL(/\/go\/run\/r1\/plan\?from=run$/);
    await expect(p.word).toHaveText('PLAN');
    await expect(p.back).toHaveText('Back to the run');
    await expect(p.title).toHaveText('Test out the app');
    // A screen reader hears "Plan" and the routine, on the heading, which has the focus.
    await expect(p.title).toHaveAccessibleName('Plan: Test out the app');
    await expect(p.title).toBeFocused();
    await expect(p.line).toHaveText('at Vibe check');
    await expectSteps(page, ['Select a feature to test', 'Vibe check', 'Write down concerns']);
    await expect(p.here).toHaveCount(1);
    await expect(p.here).toHaveAccessibleName('Here, Vibe check');
    await expect(p.here.getByTestId('go-plan-here')).toHaveText('HERE');
    await expect(p.divider).toHaveCount(1);
    // The one filled button names the step HERE names; nothing on this surface says Next, Done or paused.
    await expect(p.forward).toHaveText('Resume at Vibe check');
    await expect(p.screen.getByRole('button', { name: /^(Next|Done|Pause)/ })).toHaveCount(0);
    await expect(p.screen.getByText(/paused/i)).toHaveCount(0);
    // Entering Plan paused the run in the same write, and nothing else about it changed.
    await saved(page);

    await p.forward.click();
    await expect(r.screen).toBeVisible();
    await expect(page).toHaveURL(/\/go\/run\/r1$/);
    await expect(r.words).toHaveText('Vibe check');
    await expect(r.note).toBeFocused();
    await expect(r.said).toHaveText('Running: Vibe check');
    // Back from the runner is home (Plan was replaced, never stacked).
    await page.goBack();
    await expect(home(page).screen).toBeVisible();
    expect(await run(page)).toMatchObject({ status: 'running', frames: [{ seq: 'test', at: 'test-1', round: 2 }] });
    expect((await run(page)).mode).toBeUndefined();
  });

  test('P-101 (ruling 4; was: "Plan stores the mode with the pause"): Plan pauses the run, plainly — no mode is written — at the same step and round', async ({ page }) => {
    await startGo(page, ON_VIBE, 'runner', ROUTINES);
    await runner(page).plan.click();
    await expect(plan(page).screen).toBeVisible();
    await saved(page);
    expect(await run(page)).toMatchObject({ status: 'paused', frames: [{ seq: 'test', at: 'test-1', round: 2 }] });
    expect((await run(page)).mode).toBeUndefined();
  });

  test('Step in is there when the step is a routine (P-101: a move beside Next; was: the middle slot); Plan is there on every step, a wait included', async ({ page }) => {
    await startGo(page, [{ id: 'r3', routine: 'drawing', at: 1, status: 'running' }], 'runner');
    const r = runner(page);
    await expect(r.stepIn).toHaveText('Step in');
    await expect(r.plan).toHaveText('Plan');
    await r.next.click();
    await expect(r.words).toHaveText('Gesture drawing');
    await expect(r.stepIn).toHaveCount(0);
    await expect(r.plan).toHaveText('Plan');

    await startGo(page, [{ id: 'r2', routine: 'apply-acme', at: 1, waitingDaysAgo: 2, status: 'running' }], 'runner');
    await expect(runner(page).plan).toHaveText('Plan');
    await runner(page).plan.click();
    await expect(plan(page).line).toHaveText('at a reply from Acme');
    await expect(plan(page).forward).toHaveText('Resume at a reply from Acme');
  });

  test('Home from Plan writes nothing: P-101 (ruling 4; was: "the tile says planning with Plan … reopening the app returns to Plan"): the tile reads paused, its body resumes it; reopening the app is home', async ({ page }) => {
    await startGo(page, PLANNING, 'plan', ROUTINES);
    const p = plan(page);
    await expect(p.line).toHaveText('at Vibe check');
    const before = await page.evaluate(() => localStorage.getItem('wanderment:journal'));
    await p.home.click();
    const h = home(page);
    await expect(h.screen).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('wanderment:journal'))).toBe(before);
    const t = tile(page, 'Test out the app');
    await expect(t).toHaveAttribute('data-state', 'paused');
    await expect(t.getByTestId('go-tile-line')).toHaveText('at Vibe check');
    await expect(t).toHaveAccessibleName('Test out the app, paused at Vibe check');
    await expect(tileBody(page, 'Test out the app')).toHaveAccessibleName(/^Resume Test out the app/);
    await expect(t.getByRole('button', { name: 'Plan Test out the app', exact: true })).toBeVisible();
    await t.getByRole('button', { name: 'Plan Test out the app', exact: true }).click();
    await expect(p.line).toHaveText('at Vibe check');
    await expect(page).toHaveURL(/\/go\/run\/r1\/plan$/);

    // Reopening the app: home (a paused run is home's), never "planning".
    await page.goto('./go');
    await expect(home(page).screen).toBeVisible();
    await expect(home(page).screen).not.toContainText('planning');
  });

  test('a reload in Plan stays in Plan; a reload on the runner stays on the runner', async ({ page }) => {
    await startGo(page, ON_VIBE, 'runner', ROUTINES);
    await page.reload();
    await expect(runner(page).words).toHaveText('Vibe check');
    await runner(page).plan.click();
    await expect(plan(page).screen).toBeVisible();
    await saved(page);
    await page.reload();
    await expect(plan(page).here).toHaveAccessibleName('Here, Vibe check');
    await expect(plan(page).title).toBeFocused();
  });

  test('home tiles: a paused run reads "at <step>" with Resume and Plan; Plan on it opens its Plan; a routine with nothing going opens its own Plan with Start', async ({ page }) => {
    await startGo(page, [{ id: 'r1', routine: 'test', at: 1, round: 2 }], 'home', ROUTINES);
    const t = tile(page, 'Test out the app');
    await expect(t).toHaveAttribute('data-state', 'paused');
    await expect(t.getByTestId('go-tile-line')).toHaveText('at Vibe check');
    // P-101 (ruling 5; was: Resume and Plan buttons): its body resumes it; Plan beside it.
    await expect(tileBody(page, 'Test out the app')).toHaveAccessibleName(/^Resume Test out the app/);
    await expect(t.getByRole('button', { name: 'Plan Test out the app', exact: true })).toBeVisible();
    await t.getByRole('button', { name: 'Plan Test out the app', exact: true }).click();
    const p = plan(page);
    await expect(p.forward).toHaveText('Resume at Vibe check');
    await expect(page).toHaveURL(/\/go\/run\/r1\/plan$/);
    await p.home.click();
    // P-101 (ruling 4; was: 'planning'): Plan wrote nothing — still paused.
    await expect(tile(page, 'Test out the app')).toHaveAttribute('data-state', 'paused');

    // P-97 (was: its idle tile, Start and Plan): a routine with nothing going is on My routines; its row opens its Plan.
    await expect(tile(page, 'Apply to Initech')).toHaveCount(0);
    await planFromRoutines(page, 'Apply to Initech');
    await expect(page).toHaveURL(/\/go\/routine\/apply\?from=routines$/);
    await expect(p.title).toHaveText('Apply to Initech');
    // No run: no "planning" line, no HERE; the one filled button is Start.
    await expect(p.line).toHaveCount(0);
    await expect(p.here).toHaveCount(0);
    await expect(p.forward).toHaveText('Start');
    await p.forward.click();
    await expect(runner(page).words).toHaveText('Read the job ad twice');
    // P-97 (was: Back is home): Back is My routines, where its Plan was opened from.
    await page.goBack();
    await expect(routines(page).screen).toBeVisible();
  });

  test('P-96 (was: the paused screen showed a run left in Plan as "Planning"): its old address lands on /go — P-101 (ruling 4; was: "its Plan … each open run in its own mode"): home, where runs an earlier build left in Plan read paused like every other, each resumed by its tile', async ({ page }) => {
    await startGo(page, [...PLANNING, { id: 'r2', routine: 'apply', at: 1, mode: 'plan', touchedMinutesAgo: 20 }, { id: 'r3', routine: 'drawing', at: 0, touchedMinutesAgo: 40 }], 'plan', ROUTINES);
    await page.goto('./go/run/r1/paused');
    const h = home(page);
    await expect(h.screen).toBeVisible();
    await expect(h.screen).not.toContainText('planning');
    const t = tile(page, 'Test out the app');
    await expect(t.getByTestId('go-tile-line')).toHaveText('at Vibe check');
    await expect(tileBody(page, 'Test out the app')).toHaveAccessibleName(/^Resume Test out the app/);
    await expect(tile(page, 'Apply to Initech').getByTestId('go-tile-line')).toHaveText('at Tailor the CV');
    await expect(tileBody(page, 'Apply to Initech')).toHaveAccessibleName(/^Resume Apply to Initech/);
    await expect(tileBody(page, 'Practise drawing')).toHaveAccessibleName(/^Resume Practise drawing/);
    await expect(page.getByTestId('go-resume')).toHaveCount(0);
    await t.getByRole('button', { name: 'Plan Test out the app', exact: true }).click();
    await expect(plan(page).forward).toHaveText('Resume at Vibe check');
  });

  test('old addresses land on Plan: See it all’s (a run in Plan), and the editor’s (the routine’s Plan — its run’s, when it has one)', async ({ page }) => {
    await startGo(page, PLANNING, 'plan', ROUTINES);
    await page.goto('./go/run/r1/all');
    await expect(plan(page).line).toHaveText('at Vibe check');
    await expect(page).toHaveURL(/\/go\/run\/r1\/plan$/);
    await page.goto('./go/routine/test');
    await expect(plan(page).line).toHaveText('at Vibe check');
    await expect(page).toHaveURL(/\/go\/run\/r1\/plan$/);
    await page.goto('./go/routine/apply');
    await expect(plan(page).title).toHaveText('Apply to Initech');
    await expect(plan(page).forward).toHaveText('Start');
    // A run that is running is not in Plan: the address goes where the data says, and writes nothing.
    await startGo(page, ON_VIBE, 'runner', ROUTINES);
    await page.goto('./go/run/r1/all');
    await expect(runner(page).words).toHaveText('Vibe check');
    await expect(page).toHaveURL(/\/go\/run\/r1$/);
    expect((await run(page)).status).toBe('running');
  });

  test('Plan pressed while the page doesn’t hold the data is kept, said quietly, and applied once the data is back', async ({ page }) => {
    await startGo(page, ON_VIBE, 'runner', ROUTINES);
    const r = runner(page);
    await setVisibility(page, 'hidden');
    await r.plan.click();
    await expect(r.notice).toHaveText('Just a moment — reconnecting.');
    await expect(r.words).toHaveText('Vibe check');
    await setVisibility(page, 'visible');
    await expect(plan(page).line).toHaveText('at Vibe check', { timeout: 15_000 });
  });
});

test.describe('Plan edits change the routine, each with an Undo that stays until the next action', () => {
  test('Add a step (the open row): added at the end, the field keeps the focus; Undo takes it back', async ({ page }) => {
    await startGo(page, PLANNING, 'plan', ROUTINES);
    const p = plan(page);
    await p.add.fill('Write it up');
    await p.add.press('Enter');
    await expectSteps(page, ['Select a feature to test', 'Vibe check', 'Write down concerns', 'Write it up']);
    await expect(p.add).toBeFocused();
    await expect(p.add).toHaveValue('');
    await expectEdit(page, 'Added “Write it up”');
    // HERE and Resume have not moved.
    await expect(p.forward).toHaveText('Resume at Vibe check');
    await saved(page);
    expect((await stepsOf(page)).steps).toEqual(['Select a feature to test', 'Vibe check', 'Write down concerns', 'Write it up']);
    await openGo(page, 'plan', './go/run/r1/plan');
    // (A reload: the Undo is the session's. Add again, and take it back.)
    await addStep(page, 'And again');
    await undoEdit(page);
    await expectSteps(page, ['Select a feature to test', 'Vibe check', 'Write down concerns', 'Write it up']);
    await expect(p.title).toBeFocused();
    await saved(page);
    expect((await stepsOf(page)).steps).toEqual(['Select a feature to test', 'Vibe check', 'Write down concerns', 'Write it up']);
  });

  // P-102 (owner, 2026-11-27; was: a sheet — Change the words · Add a step after · Break it down · Gives… ·
  // Make it a wait · Move up · Move down · Remove this step · Close): a small menu anchored to its ···.
  test('P-102: the step menu is a small menu at its ···: Edit · Add a step after · Break it down · Gives… · a line · Remove (red, last); focus in and back; Esc, a tap outside and Back close it', async ({ page }) => {
    // (Plan from the runner: so Back has somewhere to go, and must not.)
    await startGo(page, ON_VIBE, 'runner', ROUTINES);
    await runner(page).plan.click();
    const p = plan(page);
    await expect(p.title).toBeFocused();
    const more = p.more('Vibe check');
    await more.click();
    const menu = await arrived(page, 'go-plan-menu');
    await expect(menu).toHaveRole('menu');
    await expect(menu).toHaveAccessibleName('Vibe check');
    await expect(menuItems(menu)).toHaveText(['Edit', 'Add a step after', 'Break it down', 'Gives…', 'Remove']);
    // Nothing retired is offered (P-102): no wait is made, no move is on the menu.
    await expect(menu.getByText(/Make it a wait|Move up|Move down|Change the words/)).toHaveCount(0);
    // (Audit F2: its only Close is for screen readers — last, not drawn.)
    await expect(menu.locator('[data-sr-close]')).toHaveText('Close');
    // A line between Gives… and Remove; Remove last, red with at least 4.5:1 on the menu.
    expect(await menu.evaluate((m) => [...m.querySelectorAll('[role="menuitem"]:not([data-sr-close]), [role="separator"]')].map((e) => e.getAttribute('role') === 'separator' ? '—' : (e as HTMLElement).innerText))).toEqual(['Edit', 'Add a step after', 'Break it down', 'Gives…', '—', 'Remove']);
    const colours = await menu.evaluate((m) => {
      const remove = [...m.querySelectorAll('[role="menuitem"]:not([data-sr-close])')].at(-1)!;
      const words = [...remove.querySelectorAll('*')].find((e) => e.textContent === 'Remove' && e.children.length === 0)!;
      return { fg: getComputedStyle(words).color, bg: getComputedStyle(m).backgroundColor, other: getComputedStyle([...m.querySelectorAll('[role="menuitem"] *')].find((e) => e.textContent === 'Edit')!).color };
    });
    expect(colours.fg).not.toBe(colours.other);
    expect(contrast(colours.fg, colours.bg)).toBeGreaterThanOrEqual(4.5);
    // Anchored: beside its ··· (under it, its right edge at the button's), inside the window; rows ≥ 48 px, words ≥ 16 px.
    const b = (await more.boundingBox())!;
    const m = (await menu.boundingBox())!;
    expect(m.y).toBeGreaterThanOrEqual(b.y + b.height - 1);
    expect(m.y - (b.y + b.height)).toBeLessThanOrEqual(12);
    expect(Math.abs(m.x + m.width - (b.x + b.width))).toBeLessThanOrEqual(12);
    expect(m.x).toBeGreaterThanOrEqual(0);
    expect(m.x + m.width).toBeLessThanOrEqual(390);
    expect(m.width).toBeLessThan(390 - 32);
    for (const item of await menuItems(menu).all()) {
      expect((await item.boundingBox())!.height).toBeGreaterThanOrEqual(48);
      expect(await item.evaluate((e) => parseFloat(getComputedStyle(e.querySelector('*') ?? e).fontSize))).toBeGreaterThanOrEqual(16);
    }
    // Focus: on its first item; ↓ / ↑ move between items; Esc closes it and gives focus back to the ···.
    await expect(menuItems(menu).first()).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(menuItems(menu).nth(1)).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await expect(menuItems(menu).last()).toBeFocused();
    await closeMenu(page, 'go-plan-menu');
    await expect(more).toBeFocused();
    // A tap outside closes it too (and does nothing else).
    await more.click();
    await arrived(page, 'go-plan-menu');
    await page.mouse.click(20, 820);
    await expect(page.getByTestId('go-plan-menu')).toHaveCount(0);
    await expect(more).toBeFocused();
    // Back (the browser's) closes it, and stays on Plan.
    await more.click();
    await arrived(page, 'go-plan-menu');
    await page.goBack();
    await expect(page.getByTestId('go-plan-menu')).toHaveCount(0);
    await expect(p.screen).toBeVisible();
    // Nothing changed.
    await expectSteps(page, ['Select a feature to test', 'Vibe check', 'Write down concerns']);
    await expectNoEdit(page);
  });

  test('P-102: near the bottom of the window the menu opens above its ···, still whole on screen; in a narrow window it spans the width at its row', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 520 });
    await startGo(page, PLANNING, 'plan', ROUTINES);
    const p = plan(page);
    const more = p.more('Write down concerns');
    // The row low in the window: the list scrolled so it sits at the list's bottom edge.
    await more.evaluate((e) => e.scrollIntoView({ block: 'end' }));
    const b = (await more.boundingBox())!;
    await more.click();
    const menu = await arrived(page, 'go-plan-menu');
    const m = (await menu.boundingBox())!;
    expect(m.y).toBeGreaterThanOrEqual(0);
    expect(m.y + m.height).toBeLessThanOrEqual(520 + 0.5);
    // Under it if it fits there, else over it — touching its button either way.
    const under = m.y >= b.y + b.height - 1;
    if (under) expect(m.y - (b.y + b.height)).toBeLessThanOrEqual(12);
    else expect(b.y - (m.y + m.height)).toBeLessThanOrEqual(12);
    // (Here there is no room beneath for it: it opens above.)
    expect(520 - (b.y + b.height)).toBeLessThan(m.height);
    expect(under).toBe(false);
    await closeMenu(page, 'go-plan-menu');
    // 200 % text (195 px wide): the whole width, less its margins — still at its row.
    await page.setViewportSize({ width: 195, height: 422 });
    const more2 = p.more('Vibe check');
    await more2.scrollIntoViewIfNeeded();
    const b2 = (await more2.boundingBox())!;
    await more2.click();
    const narrow = await arrived(page, 'go-plan-menu');
    const n = (await narrow.boundingBox())!;
    expect(n.x).toBeGreaterThanOrEqual(0);
    expect(n.x + n.width).toBeLessThanOrEqual(195 + 0.5);
    expect(n.width).toBeGreaterThanOrEqual(195 - 24);
    expect(Math.min(Math.abs(n.y - (b2.y + b2.height)), Math.abs(b2.y - (n.y + n.height)))).toBeLessThanOrEqual(12);
  });

  test('Edit (P-102; was: Change the words): edited in place; Return keeps them; HERE, "planning · at" and Resume all name the new words; Undo puts the old back', async ({ page }) => {
    await startGo(page, PLANNING, 'plan', ROUTINES);
    const p = plan(page);
    await planMenu(page, 'Vibe check', 'Edit');
    await expect(p.typed).toHaveValue('Vibe check');
    await expect(p.typed).toHaveAccessibleName('Step: Vibe check');
    // In place: where the row was, between its neighbours.
    const above = (await p.row('Select a feature to test').boundingBox())!;
    const below = (await p.row('Write down concerns').boundingBox())!;
    const field = (await p.typed.boundingBox())!;
    expect(field.y).toBeGreaterThan(above.y);
    expect(field.y).toBeLessThan(below.y);
    await planType(page, 'Check the vibe');
    await expectSteps(page, ['Select a feature to test', 'Check the vibe', 'Write down concerns']);
    await expect(p.here).toHaveAccessibleName('Here, Check the vibe');
    await expect(p.line).toHaveText('at Check the vibe');
    await expect(p.forward).toHaveText('Resume at Check the vibe');
    await expect(p.more('Check the vibe')).toBeFocused();
    await expectEdit(page, 'Changed “Vibe check”');
    await saved(page);
    await undoEdit(page);
    await expectSteps(page, ['Select a feature to test', 'Vibe check', 'Write down concerns']);
    await expect(p.forward).toHaveText('Resume at Vibe check');
    await saved(page);
    expect((await stepsOf(page)).steps).toEqual(['Select a feature to test', 'Vibe check', 'Write down concerns']);
  });

  test('Edit (P-102; was: Change the words): Escape leaves them as they were; emptied and left, they are as they were; leaving the field keeps what was typed', async ({ page }) => {
    await startGo(page, PLANNING, 'plan', ROUTINES);
    const p = plan(page);
    await planMenu(page, 'Vibe check', 'Edit');
    await p.typed.fill('Something else');
    await page.keyboard.press('Escape');
    await expect(p.typed).toHaveCount(0);
    await expectSteps(page, ['Select a feature to test', 'Vibe check', 'Write down concerns']);
    await expect(p.more('Vibe check')).toBeFocused();

    await planMenu(page, 'Vibe check', 'Edit');
    await p.typed.fill('');
    await p.typed.press('Enter');
    await expectSteps(page, ['Select a feature to test', 'Vibe check', 'Write down concerns']);
    await expect(p.notice).toHaveCount(0);

    // Leaving the field (here: pressing Resume) keeps the words first, then resumes on them.
    await planMenu(page, 'Vibe check', 'Edit');
    await p.typed.fill('Vibe check, properly');
    await p.forward.click();
    await expect(runner(page).words).toHaveText('Vibe check, properly');
  });

  test('Add a step after: a field opens in place under the row; each Return adds the next one after the last; Undo takes the last back', async ({ page }) => {
    await startGo(page, PLANNING, 'plan', ROUTINES);
    const p = plan(page);
    await planMenu(page, 'Select a feature to test', 'Add a step after');
    await expect(p.typed).toHaveAccessibleName('Add a step after Select a feature to test');
    await planType(page, 'Open it');
    await planType(page, 'Log in');
    await expectSteps(page, ['Select a feature to test', 'Open it', 'Log in', 'Vibe check', 'Write down concerns']);
    // Added above the divider: they run once; the divider still stands before "Vibe check".
    await expect(p.row('Log in')).toHaveAttribute('data-repeats', 'false');
    await expect(p.row('Vibe check')).toHaveAttribute('data-repeats', 'true');
    await expectEdit(page, 'Added “Log in”');
    await page.keyboard.press('Escape');
    await undoEdit(page);
    await expectSteps(page, ['Select a feature to test', 'Open it', 'Vibe check', 'Write down concerns']);
    await saved(page);
    expect(await stepsOf(page)).toMatchObject({ steps: ['Select a feature to test', 'Open it', 'Vibe check', 'Write down concerns'], from: 2 });
  });

  // P-102 (owner, 2026-11-27: "'Make it wait' is retired now"; was: Make it a wait, and back to a step): nothing
  // makes a wait; a wait stored by an earlier build offers "Make it a step".
  test('P-102: no step offers "Make it a wait"; a wait from an earlier build offers "Make it a step" (no Break it down): the same row, the same place; Undo', async ({ page }) => {
    const WAITED: RoutineSpec = { ...TEST, steps: ['Select a feature to test', { wait: 'Vibe check' }, 'Write down concerns'] };
    await startGo(page, PLANNING, 'plan', [WAITED, ...MAYA]);
    const p = plan(page);
    // A step's menu: nothing makes a wait.
    for (const words of ['Select a feature to test', 'Write down concerns']) {
      await p.more(words).click();
      const menu = await arrived(page, 'go-plan-menu');
      await expect(menuItems(menu)).toHaveText(['Edit', 'Add a step after', 'Break it down', 'Gives…', 'Remove']);
      await expect(menu.getByText(/wait/i)).toHaveCount(0);
      await closeMenu(page, 'go-plan-menu');
    }
    // The wait's: Edit · Add a step after · Make it a step · a line · Remove.
    await expect(p.row('Vibe check')).toHaveAttribute('data-kind', 'wait');
    await p.more('Vibe check').click();
    const menu = await arrived(page, 'go-plan-menu');
    await expect(menuItems(menu)).toHaveText(['Edit', 'Add a step after', 'Make it a step', 'Remove']);
    await menu.getByRole('menuitem', { name: 'Make it a step', exact: true }).click();
    await expect(p.row('Vibe check')).toHaveAttribute('data-kind', 'step');
    await expect(p.here).toHaveAccessibleName('Here, Vibe check');
    await expectSteps(page, ['Select a feature to test', 'Vibe check', 'Write down concerns']);
    await expectEdit(page, 'Made “Vibe check” a step');
    // Now a step: it can't be made a wait again.
    await p.more('Vibe check').click();
    await expect(menuItems(await arrived(page, 'go-plan-menu'))).toHaveText(['Edit', 'Add a step after', 'Break it down', 'Gives…', 'Remove']);
    await closeMenu(page, 'go-plan-menu');
    await undoEdit(page);
    await expect(p.row('Vibe check')).toHaveAttribute('data-kind', 'wait');
    await saved(page);
    expect((await stepsOf(page)).steps).toEqual(['Select a feature to test', 'wait:Vibe check', 'Write down concerns']);
    await openGo(page, 'plan', './go/run/r1/plan');
    // Resume on a wait: the runner's wait note.
    await p.forward.click();
    await expect(runner(page).note).toHaveAttribute('data-kind', 'wait');
    await expect(runner(page).next).toHaveText('It’s happened');
  });

  // P-102 (was: Move up / Move down on the step's menu): the moves left the menu; Alt+↑ / Alt+↓ on a focused row.
  test('P-102: Alt+↑ / Alt+↓ on a focused row move it one place; across "Repeat from here" the step passes the divider and nothing else moves; nothing at either end; one Undo per move; the focus stays on the row', async ({ page }) => {
    await startGo(page, PLANNING, 'plan', ROUTINES);
    const p = plan(page);
    // Spoken: the row's ··· and grip name the keys (aria-keyshortcuts).
    await expect(p.more('Vibe check')).toHaveAttribute('aria-keyshortcuts', 'Alt+ArrowUp Alt+ArrowDown');
    await expect(gripOf(page, 'Vibe check')).toHaveAttribute('aria-keyshortcuts', 'Alt+ArrowUp Alt+ArrowDown');
    // Vibe check is the first repeating step: up, it passes the divider (it now runs once), in the same place.
    await planMove(page, 'Vibe check', 'up');
    await expect(p.row('Vibe check')).toHaveAttribute('data-repeats', 'false');
    await expectSteps(page, ['Select a feature to test', 'Vibe check', 'Write down concerns']);
    await expect(p.row('Write down concerns')).toHaveAttribute('data-repeats', 'true');
    await expect(p.more('Vibe check')).toBeFocused();
    await expectEdit(page, 'Moved “Vibe check”');
    await expect(p.forward).toHaveText('Resume at Vibe check');
    await saved(page);
    expect(await stepsOf(page)).toMatchObject({ steps: ['Select a feature to test', 'Vibe check', 'Write down concerns'], from: 2 });
    await openGo(page, 'plan', './go/run/r1/plan');
    // Up again (from the grip this time): now it swaps with the step above; the focus stays on it.
    await gripOf(page, 'Vibe check').focus();
    await page.keyboard.press('Alt+ArrowUp');
    await expectSteps(page, ['Vibe check', 'Select a feature to test', 'Write down concerns']);
    await expect(gripOf(page, 'Vibe check')).toBeFocused();
    await expect(p.here).toHaveAccessibleName('Here, Vibe check');
    await expectEdit(page, 'Moved “Vibe check”');
    // At the top, up does nothing (and the last step's down): the last edit is still the move above.
    await planMove(page, 'Vibe check', 'up');
    await planMove(page, 'Write down concerns', 'down');
    await expectSteps(page, ['Vibe check', 'Select a feature to test', 'Write down concerns']);
    // Undo: the last move only.
    await undoEdit(page);
    await expectSteps(page, ['Select a feature to test', 'Vibe check', 'Write down concerns']);
    await expectNoEdit(page);
    // Down across the divider: back into the repeating part, nothing else moved.
    await planMove(page, 'Vibe check', 'down');
    await expect(p.row('Vibe check')).toHaveAttribute('data-repeats', 'true');
    await expectSteps(page, ['Select a feature to test', 'Vibe check', 'Write down concerns']);
    await saved(page);
    expect(await stepsOf(page)).toMatchObject({ steps: ['Select a feature to test', 'Vibe check', 'Write down concerns'], from: 1 });
    await openGo(page, 'plan', './go/run/r1/plan');
    // Never while typing: Alt+↑ in a field moves nothing.
    await planMenu(page, 'Write down concerns', 'Edit');
    await expect(p.typed).toBeFocused();
    await page.keyboard.press('Alt+ArrowUp');
    await page.keyboard.press('Escape');
    await expectSteps(page, ['Select a feature to test', 'Vibe check', 'Write down concerns']);
  });

  // P-102 audit F1 (was, before P-102: pressed it opened the row's menu, with Move up / Move down; in P-102's first build: the trimmed row menu).
  test('P-95 (4): every step row has a visible grip at its left edge, "Reorder <words>", at least 48 px; pressed (or Return on it) it opens its own menu, Move up · Move down — the way without a drag; Alt+↑ / Alt+↓ move it too', async ({ page }) => {
    await startGo(page, DRAGGING, 'plan', [DRAG]);
    const p = plan(page);
    await expect(p.screen.getByTestId('go-plan-grip')).toHaveCount(5);
    for (const words of FIVE) {
      const grip = gripOf(page, words);
      await expect(grip).toBeVisible();
      const g = (await grip.boundingBox())!;
      const row = (await p.row(words).boundingBox())!;
      expect(g.width).toBeGreaterThanOrEqual(48);
      expect(g.height).toBeGreaterThanOrEqual(48);
      // At the row's left edge, before its words.
      expect(g.x - row.x).toBeLessThanOrEqual(4);
    }
    await gripOf(page, 'Three').click();
    const menu = await arrived(page, 'go-plan-reorder');
    await expect(menu).toHaveAccessibleName('Reorder Three');
    await expect(menuItems(menu)).toHaveText(['Move up', 'Move down']);
    await page.keyboard.press('Escape');
    await expect(gripOf(page, 'Three')).toBeFocused();
    await page.keyboard.press('Enter');
    await arrived(page, 'go-plan-reorder');
    await closeMenu(page, 'go-plan-reorder');
    await expect(gripOf(page, 'Three')).toBeFocused();
    await page.keyboard.press('Alt+ArrowDown');
    // (Next to the divider, a move down passes it alone.)
    await expectSteps(page, FIVE);
    await expect(p.row('Three')).toHaveAttribute('data-repeats', 'true');
    // Too narrow for a grip (200 % text): none — the words keep their room; the step's menu has the moves (audit F1; e2e/go-menu.spec.ts), and its keys still work.
    await page.setViewportSize({ width: 195, height: 422 });
    await expect(p.screen.getByTestId('go-plan-grip')).toHaveCount(0);
    await planMove(page, 'Two', 'up');
    await expectSteps(page, ['Two', 'One', 'Three', 'Four', 'Five']);
  });

  test('P-95 (4): dragging a row’s grip with the mouse moves it — across "Repeat from here" too — in ONE change, with one Undo for the whole drag; the line shows where it will go', async ({ page }) => {
    await startGo(page, DRAGGING, 'plan', [DRAG]);
    const p = plan(page);
    // Five (below the divider) up onto the top half of Two: past Four, the divider, Three and Two.
    const from = await centre(gripOf(page, 'Five'));
    const two = (await p.row('Two').boundingBox())!;
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x, two.y + two.height * 0.25, { steps: 12 });
    // While dragging: the row is marked (it stays in place), a line shows where it will go, and nothing has changed yet.
    await expect(p.row('Five')).toHaveAttribute('data-dragging', 'true');
    await expect(p.screen.getByTestId('go-plan-drop')).toBeVisible();
    await expectSteps(page, FIVE);
    await page.mouse.up();
    await expectSteps(page, ['One', 'Five', 'Two', 'Three', 'Four']);
    await expect(p.screen.getByTestId('go-plan-drop')).toHaveCount(0);
    // It crossed the divider alone: Five runs once now, Four still repeats, the divider before Four.
    await expect(p.row('Five')).toHaveAttribute('data-repeats', 'false');
    await expect(p.row('Four')).toHaveAttribute('data-repeats', 'true');
    // One notice, one Undo, for the whole drag: it puts back all four rows and the divider.
    await expectEdit(page, 'Moved “Five”');
    await undoEdit(page);
    await expectSteps(page, FIVE);
    await expect(p.row('Five')).toHaveAttribute('data-repeats', 'true');
    await expectNoEdit(page);
    // Dragged again, it is stored so (reading the backup goes through Settings: last).
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x, two.y + two.height * 0.25, { steps: 12 });
    await page.mouse.up();
    await expectSteps(page, ['One', 'Five', 'Two', 'Three', 'Four']);
    await saved(page);
    expect(await stepsOf(page, 'drag')).toMatchObject({ steps: ['One', 'Five', 'Two', 'Three', 'Four'], from: 4 });
  });

  test('P-95 (4): dragging by touch moves the row too; crossing only "Repeat from here" passes it alone (nothing else moves); a drag let go where it began changes nothing', async ({ page }) => {
    await startGo(page, DRAGGING, 'plan', [DRAG]);
    const p = plan(page);
    const cdp = await page.context().newCDPSession(page);
    const touch = async (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    const touchDrag = async (words: string, toY: number) => {
      const at = await centre(gripOf(page, words));
      await touch('touchStart', at.x, at.y);
      for (let i = 1; i <= 10; i++) await touch('touchMove', at.x, at.y + ((toY - at.y) * i) / 10);
      await touch('touchEnd', at.x, toY);
    };
    // Three down, just past the divider (above Four's middle): it changes side, and no step moves.
    const div = (await p.divider.boundingBox())!;
    const four = (await p.row('Four').boundingBox())!;
    await touchDrag('Three', (div.y + div.height + four.y + four.height / 2) / 2);
    await expectSteps(page, FIVE);
    await expect(p.row('Three')).toHaveAttribute('data-repeats', 'true');
    await expect(p.row('Two')).toHaveAttribute('data-repeats', 'false');
    // One down past Two (onto the lower half of Two): one row.
    const two = (await p.row('Two').boundingBox())!;
    await touchDrag('One', two.y + two.height * 0.75);
    await expectSteps(page, ['Two', 'One', 'Three', 'Four', 'Five']);
    // Let go where it began: nothing changes (the Undo is still the last move's).
    const one = await centre(gripOf(page, 'One'));
    await touch('touchStart', one.x, one.y);
    for (const dy of [6, 14, 6, 0]) await touch('touchMove', one.x, one.y + dy);
    await touch('touchEnd', one.x, one.y);
    await expectSteps(page, ['Two', 'One', 'Three', 'Four', 'Five']);
    await expectEdit(page, 'Moved “One”');
    await saved(page);
    expect(await stepsOf(page, 'drag')).toMatchObject({ steps: ['Two', 'One', 'Three', 'Four', 'Five'], from: 2 });
  });

  test('P-95 audit F7: a touch drag on the grip of a list long enough to scroll moves the row and does not scroll the list (the same touch on the words does)', async ({ page }) => {
    const LONG: RoutineSpec = { id: 'long', name: 'Thirty steps', steps: Array.from({ length: 30 }, (_, i) => `Step number ${i + 1}`) };
    await startGo(page, [{ id: 'r9', routine: 'long', at: 0, status: 'paused', mode: 'plan' }], 'plan', [LONG]);
    const p = plan(page);
    const scrollable = await p.list.evaluate((e) => {
      const el = e.querySelector('div') as HTMLElement;
      const box = (e as HTMLElement).scrollHeight > (e as HTMLElement).clientHeight ? (e as HTMLElement) : el;
      return box.scrollHeight - box.clientHeight;
    });
    expect(scrollable).toBeGreaterThan(200);
    const top = () => p.list.evaluate((e) => (e as HTMLElement).scrollTop);
    const cdp = await page.context().newCDPSession(page);
    const touch = async (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    const swipe = async (x: number, y: number, dy: number) => {
      await touch('touchStart', x, y);
      for (let i = 1; i <= 10; i++) await touch('touchMove', x, y + (dy * i) / 10);
      await touch('touchEnd', x, y + dy);
    };
    // On the grip of Step number 3, up past two rows: it moves; the list stays where it was.
    const g = await centre(gripOf(page, 'Step number 3'));
    const one = (await p.row('Step number 1').boundingBox())!;
    const was = await top();
    await swipe(g.x, g.y, one.y + one.height * 0.25 - g.y);
    await expect(p.words.nth(0)).toHaveText('Step number 3');
    expect(await top()).toBe(was);
    // The same kind of swipe on a row's words scrolls the list: the check above could fail.
    const w = (await p.row('Step number 6').getByTestId('go-plan-words').boundingBox())!;
    await swipe(w.x + w.width / 2, w.y + w.height / 2, -150);
    await expect.poll(top).toBeGreaterThan(was + 20);
  });

  test('P-95 audit F2: with an open routine among the rows, the drop line and the landing place agree — over its steps the row stays put; past its last step it lands after the routine — and the dragged row covers nothing (HERE stays in view)', async ({ page }) => {
    const NEST: RoutineSpec[] = [
      { id: 'outer', name: 'Outer', steps: ['Alpha', { routine: 'inner' }, 'Gamma', 'Delta'] },
      { id: 'inner', name: 'Inner part', home: false, steps: ['Inner one', 'Inner two', 'Inner three'] },
    ];
    await startGo(page, [{ id: 'r1', routine: 'outer', at: 1, inner: [{ routine: 'inner', at: 0 }], status: 'paused', mode: 'plan' }], 'plan', NEST);
    const p = plan(page);
    await expectSteps(page, ['Alpha', 'Inner part', 'Inner one', 'Inner two', 'Inner three', 'Gamma', 'Delta']);
    await expect(p.here).toHaveAccessibleName('Here, Inner one');
    const from = await centre(gripOf(page, 'Alpha'));
    const alphaBox = (await p.row('Alpha').boundingBox())!;
    const hereBox = (await p.here.boundingBox())!;
    // Onto Inner one (the top of the open routine): not past the routine — no line, and letting go changes nothing.
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x, hereBox.y + hereBox.height / 2, { steps: 10 });
    await expect(p.row('Alpha')).toHaveAttribute('data-dragging', 'true');
    await expect(p.screen.getByTestId('go-plan-drop')).toHaveCount(0);
    // The dragged row stays in its place (marked), so it covers nothing — HERE included.
    expect(await p.row('Alpha').boundingBox()).toEqual(alphaBox);
    await page.mouse.up();
    await expectSteps(page, ['Alpha', 'Inner part', 'Inner one', 'Inner two', 'Inner three', 'Gamma', 'Delta']);
    // Past the routine's last step (onto the top of Gamma): the line is under Inner three, and that is where it lands.
    const three = (await p.row('Inner three').boundingBox())!;
    const gamma = (await p.row('Gamma').boundingBox())!;
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x, gamma.y + gamma.height * 0.2, { steps: 10 });
    const line = (await p.screen.getByTestId('go-plan-drop').boundingBox())!;
    expect(line.y).toBeGreaterThanOrEqual(three.y + three.height - 1);
    expect(line.y + line.height).toBeLessThanOrEqual(gamma.y + 1);
    await page.mouse.up();
    await expectSteps(page, ['Inner part', 'Inner one', 'Inner two', 'Inner three', 'Alpha', 'Gamma', 'Delta']);
    await expectEdit(page, 'Moved “Alpha”');
    await expect(p.here).toHaveAccessibleName('Here, Inner one');
  });

  test('P-95 (4): under Reduce Motion a drag reflows nothing with animation — the drop is instant and nothing animates', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await startGo(page, DRAGGING, 'plan', [DRAG]);
    const p = plan(page);
    const from = await centre(gripOf(page, 'One'));
    const three = (await p.row('Three').boundingBox())!;
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x, three.y + three.height * 0.75, { steps: 8 });
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    // Nothing but the row being dragged has moved.
    for (const words of ['Two', 'Three', 'Four']) expect(await p.row(words).evaluate((e) => getComputedStyle(e.parentElement!).transform)).toBe('none');
    await page.mouse.up();
    await expectSteps(page, ['Two', 'Three', 'One', 'Four', 'Five']);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    expect(await p.row('One').evaluate((e) => getComputedStyle(e.parentElement!).transform)).toBe('none');
  });

  test('Remove (P-102; was: Remove this step) (not HERE): it goes from the routine; HERE and Resume stay; the notice names it and stays until the next action; Undo', async ({ page }) => {
    await startGo(page, PLANNING, 'plan', ROUTINES);
    const p = plan(page);
    await planMenu(page, 'Select a feature to test', 'Remove');
    await expectSteps(page, ['Vibe check', 'Write down concerns']);
    // P-103 (5; was expectEdit — no notice): removing a step says so, with Undo (and its Undo stays in the menu).
    await expectRemoved(page, 'Removed “Select a feature to test”');
    await expect(p.forward).toHaveText('Resume at Vibe check');
    // Focus is never lost to nothing.
    expect(await focused(page)).not.toBe('BODY');
    // The Undo stays until the next action: nothing times it out.
    await page.waitForTimeout(6000);
    await expectEdit(page, 'Removed “Select a feature to test”');
    await undoEdit(page);
    await expectSteps(page, ['Select a feature to test', 'Vibe check', 'Write down concerns']);
    // The next action replaces it: one Undo, the last edit's.
    await planMenu(page, 'Select a feature to test', 'Remove');
    await addStep(page, 'Sleep on it');
    await expectEdit(page, 'Added “Sleep on it”');
    await undoEdit(page);
    await expectSteps(page, ['Vibe check', 'Write down concerns']);
    await expectNoEdit(page);
  });

  test('removing the HERE step: HERE and Resume go to the next step; with none after, the one before; with none at all, the edge — the run is never ended', async ({ page }) => {
    await startGo(page, PLANNING, 'plan', ROUTINES);
    const p = plan(page);
    await planMenu(page, 'Vibe check', 'Remove');
    await expect(p.here).toHaveAccessibleName('Here, Write down concerns');
    await expect(p.line).toHaveText('at Write down concerns');
    await expect(p.forward).toHaveText('Resume at Write down concerns');
    // Undo: HERE is back where it was.
    await undoEdit(page);
    await expect(p.here).toHaveAccessibleName('Here, Vibe check');
    await planMenu(page, 'Vibe check', 'Remove');
    // The last step: the one before.
    await planMenu(page, 'Write down concerns', 'Remove');
    // P-103 (5; was expectEdit — no notice): removing a step says so, with Undo (and its Undo stays in the menu).
    await expectRemoved(page, 'Removed “Write down concerns” — Repeat from here went with it');
    await expect(p.divider).toHaveCount(0);
    await expect(p.here).toHaveAccessibleName('Here, Select a feature to test');
    await expect(p.forward).toHaveText('Resume at Select a feature to test');
    // Every step: nothing next. No filled button; Done has its slot; the open row has the focus.
    await planMenu(page, 'Select a feature to test', 'Remove');
    await expect(p.rows).toHaveCount(0);
    await expect(p.line).toHaveText('nothing next yet');
    await expect(p.forward).toHaveCount(0);
    await expect(p.done).toBeVisible();
    await expect(p.add).toBeFocused();
    await saved(page);
    const stored = await run(page);
    expect(stored.endedAt).toBeUndefined();
    expect(stored).toMatchObject({ frames: [{ seq: 'test', at: null, round: 2 }] });
  });

  test('the routine’s own menu: Change the name (in place; a taken name is refused, in words) and — with no run — Remove (P-96: no "Ends here")', async ({ page }) => {
    await startGo(page, PLANNING, 'plan', ROUTINES);
    const p = plan(page);
    const own = p.more('Test out the app');
    await own.click();
    let sheet = await arrived(page, 'go-plan-routine');
    // P-102 (was: a sheet, with Close): a menu anchored to the heading's ···, focus on its first item.
    await expect(sheet).toHaveRole('menu');
    const b = (await own.boundingBox())!;
    const m = (await sheet.boundingBox())!;
    expect(m.y - (b.y + b.height)).toBeGreaterThanOrEqual(-1);
    expect(m.y - (b.y + b.height)).toBeLessThanOrEqual(12);
    await expect(menuItems(sheet).first()).toBeFocused();
    // A routine with a run going can't be removed: it is not offered. (P-101 amendment, ruling 9: its run can be started over.)
    // (P-97: and Tags…, after the name.)
    // (P-98, rewritten: and Copy…, after Tags….)
    // (P-109, rewritten: and Places…, after Tags….)
    await expect(menuItems(sheet)).toHaveText(['Change the name', 'Tags…', 'Places…', 'Copy…', 'Start over']);
    await sheet.getByRole('menuitem', { name: 'Change the name', exact: true }).click();
    await expect(p.typed).toHaveValue('Test out the app');
    await p.typed.fill('Apply to Acme');
    await p.typed.press('Enter');
    await expect(p.screen.getByTestId('go-plan-name-error')).toHaveText('! Another routine has this name');
    await expect(p.typed).toHaveValue('Apply to Acme');
    await planType(page, 'Test the app out');
    await expect(p.title).toHaveText('Test the app out');
    await expectEdit(page, 'Renamed “Test out the app”');
    await undoEdit(page);
    await expect(p.title).toHaveText('Test out the app');

    await page.goto('./go/routine/apply');
    await p.more('Apply to Initech').click();
    sheet = await arrived(page, 'go-plan-routine');
    // P-102: Remove last, after a line, in red.
    // (P-98, rewritten: and Copy…, after Tags….)
    // (P-109, rewritten: and Places…, after Tags….)
    await expect(menuItems(sheet)).toHaveText(['Change the name', 'Tags…', 'Places…', 'Copy…', 'Add Repeat from here', 'Remove Apply to Initech']);
    await expect(sheet.getByRole('separator')).toHaveCount(1);
    await expect(menuItems(sheet).last()).toHaveAttribute('data-danger', 'true');
    await sheet.getByRole('menuitem', { name: 'Remove Apply to Initech', exact: true }).click();
    // P-103 (5; was: removed at once): it asks first — the one confirm — then Remove.
    await expect(page.getByRole('alertdialog').getByRole('heading')).toHaveText('Remove “Apply to Initech”?');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Remove', exact: true }).click();
    // The screen goes with the routine; its Undo is on home.
    const h = home(page);
    await expect(h.screen).toBeVisible();
    await expect(tile(page, 'Apply to Initech')).toHaveCount(0);
    await expect(h.notice).toContainText('Removed “Apply to Initech”');
    await h.notice.getByRole('button', { name: /^Undo/ }).click();
    // P-97 (was: its tile back on home): with nothing going it is back on My routines.
    await expect(tile(page, 'Apply to Initech')).toHaveCount(0);
    await expect((await openRoutines(page)).row('Apply to Initech')).toHaveCount(1);
  });
});

test.describe('Repeat from here', () => {
  test('it is a row with visible Move up / Move down (spoken names): each press passes exactly one step, no step changes place; unavailable at the ends', async ({ page }) => {
    await startGo(page, PLANNING, 'plan', ROUTINES);
    const p = plan(page);
    await expect(p.divider).toHaveAccessibleName('Repeat from here');
    const order = () => p.screen.evaluate((root) => [...root.querySelectorAll('[data-testid="go-plan-divider"], [data-testid="go-plan-words"]')].map((e) => ((e as HTMLElement).dataset.testid === 'go-plan-divider' ? '|' : e.textContent)));
    expect(await order()).toEqual(['Select a feature to test', '|', 'Vibe check', 'Write down concerns']);
    await p.dividerDown.click();
    expect(await order()).toEqual(['Select a feature to test', 'Vibe check', '|', 'Write down concerns']);
    await expectEdit(page, 'Repeat from here moved above “Write down concerns”');
    // It stands before the last step: it can go no lower.
    await expect(p.dividerDown).toBeDisabled();
    // HERE did not move; it now runs once.
    await expect(p.here).toHaveAccessibleName('Here, Vibe check');
    await expect(p.here).toHaveAttribute('data-repeats', 'false');
    await undoEdit(page);
    expect(await order()).toEqual(['Select a feature to test', '|', 'Vibe check', 'Write down concerns']);
    await p.dividerUp.click();
    expect(await order()).toEqual(['|', 'Select a feature to test', 'Vibe check', 'Write down concerns']);
    await expect(p.dividerUp).toBeDisabled();
    await saved(page);
    expect(await stepsOf(page)).toMatchObject({ steps: ['Select a feature to test', 'Vibe check', 'Write down concerns'], from: 0 });
    expect(await run(page)).toMatchObject({ frames: [{ seq: 'test', at: 'test-1', round: 2 }] });
  });

  test('until I’m done or a number: set from its menu, shown on the row; taken out; added again from the routine’s menu', async ({ page }) => {
    await startGo(page, PLANNING, 'plan', ROUTINES);
    const p = plan(page);
    await expect(p.divider).toHaveText('Repeat from here');
    await p.dividerMore.click();
    const sheet = await arrived(page, 'go-plan-repeat');
    // P-102 (was: a sheet): anchored to its ··· the same way — a small dialog (it holds a choice and a stepper).
    await expect(sheet).toHaveRole('dialog');
    await expect(sheet).toHaveAccessibleName('Repeat from here');
    {
      const b = (await p.dividerMore.boundingBox())!;
      const m = (await sheet.boundingBox())!;
      expect(Math.min(Math.abs(m.y - (b.y + b.height)), Math.abs(b.y - (m.y + m.height)))).toBeLessThanOrEqual(12);
    }
    await expect(sheet.getByRole('radio', { name: 'Until I’m done', exact: true })).toBeFocused();
    await expect(sheet.getByRole('radio', { name: 'Until I’m done', exact: true })).toBeChecked();
    await sheet.getByRole('radio', { name: 'A number', exact: true }).click();
    await expect(sheet.getByTestId('go-repeat-count')).toHaveText('3 times');
    await sheet.getByRole('button', { name: 'More times', exact: true }).click();
    await expect(sheet.getByTestId('go-repeat-count')).toHaveText('4 times');
    // (P-102: a tap outside closes it — was its Close.)
    await page.mouse.click(20, 830);
    await expect(page.getByTestId('go-plan-repeat')).toHaveCount(0);
    await expect(p.dividerMore).toBeFocused();
    await expect(p.divider).toHaveText('Repeat from here · 4 times');
    await saved(page);
    expect(await stepsOf(page)).toMatchObject({ from: 1, repeat: 4 });
    await openGo(page, 'plan', './go/run/r1/plan');

    await p.dividerMore.click();
    await (await arrived(page, 'go-plan-repeat')).getByRole('radio', { name: 'Until I’m done', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(p.divider).toHaveText('Repeat from here');
    await p.dividerMore.click();
    await (await arrived(page, 'go-plan-repeat')).getByRole('button', { name: 'Remove Repeat from here', exact: true }).click();
    await expect(p.divider).toHaveCount(0);
    await expect(p.row('Vibe check')).toHaveAttribute('data-repeats', 'false');
    await undoEdit(page);
    await expect(p.divider).toHaveCount(1);
    await p.dividerMore.click();
    await (await arrived(page, 'go-plan-repeat')).getByRole('button', { name: 'Remove Repeat from here', exact: true }).click();
    await p.more('Test out the app').click();
    await (await arrived(page, 'go-plan-routine')).getByRole('menuitem', { name: 'Add Repeat from here', exact: true }).click();
    await expect(p.divider).toHaveCount(1);
    await expectEdit(page, 'Repeat from here added above “Select a feature to test”');
  });
});

test.describe('Break it down', () => {
  test('in Plan: the smaller steps are typed under the step, in place; HERE moves to the first of them, and Resume starts there — inside the step', async ({ page }) => {
    await startGo(page, ON_VIBE, 'runner', ROUTINES);
    await runner(page).plan.click();
    const p = plan(page);
    await planMenu(page, 'Vibe check', 'Break it down');
    await expect(p.typed).toHaveAccessibleName('A smaller step of Vibe check');
    await planType(page, 'Open the feature');
    // P-101 (ruling 6; was: the notice "Broke down …"): no notice; the typing goes on.
    await expect(p.notice).toHaveCount(0);
    await planType(page, 'Poke at it');
    await expectSteps(page, ['Select a feature to test', 'Vibe check', 'Open the feature', 'Poke at it', 'Write down concerns']);
    await expectEdit(page, 'Added “Poke at it”');
    // The smaller steps sit one level in, under their step.
    await expect(p.row('Vibe check')).toHaveAttribute('data-kind', 'routine');
    await expect(p.row('Vibe check')).toHaveAccessibleName('You are in this, Vibe check');
    // (P-111, rewritten: was 'Open the feature' at data-depth 1 in this view — the field left (Undo's menu), its smaller
    // steps are in its own view, opened from its row.)
    await p.screen.getByRole('button', { name: 'Open Vibe check', exact: true }).click();
    await expect(p.title).toHaveText('Vibe check');
    await expect(p.row('Open the feature')).toHaveAttribute('data-depth', '0');
    await expect(p.here).toHaveAccessibleName('Here, Open the feature');
    await expect(p.line).toHaveText('at Open the feature');
    await expect(p.forward).toHaveText('Resume at Open the feature');
    await page.keyboard.press('Escape');
    await p.forward.click();
    const r = runner(page);
    await expect(r.words).toHaveText('Open the feature');
    await expect(r.context).toHaveText('Test out the app ›Vibe check');
    await r.next.click();
    await expect(r.words).toHaveText('Poke at it');
    // The last small step done: on with the routine, in the round it was in.
    await r.next.click();
    await expect(r.words).toHaveText('Write down concerns');
    await page.goBack();
    const stored = await exported(page);
    const ref = stored.routines.test.items![1].ref!;
    expect(stored.routines[ref]).toMatchObject({ words: 'Vibe check', named: false });
    expect(stored.routines[ref].items!.map((i) => i.text)).toEqual(['Open the feature', 'Poke at it']);
    expect(stored.runs.r1).toMatchObject({ frames: [{ seq: 'test', at: 'test-2', round: 2 }] });
  });

  test('a step the run is not on: broken down where it stands, the run does not move; its words are still changed in place; Remove names its smaller steps; Undo', async ({ page }) => {
    await startGo(page, PLANNING, 'plan', ROUTINES);
    const p = plan(page);
    await planMenu(page, 'Write down concerns', 'Break it down');
    await planType(page, 'Open the doc');
    await page.keyboard.press('Escape');
    await expect(p.here).toHaveAccessibleName('Here, Vibe check');
    await expect(p.forward).toHaveText('Resume at Vibe check');
    // (P-111, rewritten: was "Its row opens and closes" — Close / Open by its chevron, in place. A step broken down opens
    // as a view of its own: its smaller steps there, the path back to the routine.)
    await expectSteps(page, ['Select a feature to test', 'Vibe check', 'Write down concerns']);
    await p.screen.getByRole('button', { name: 'Open Write down concerns', exact: true }).click();
    await expect(plan(page).title).toHaveText('Write down concerns');
    await expectSteps(page, ['Open the doc']);
    await plan(page).screen.getByTestId('go-plan-up').click();
    await expectSteps(page, ['Select a feature to test', 'Vibe check', 'Write down concerns']);
    await planMenu(page, 'Write down concerns', 'Edit');
    await planType(page, 'Write the concerns down');
    await expectEdit(page, 'Changed “Write down concerns”');
    await planMenu(page, 'Write the concerns down', 'Remove');
    // P-103 (5; was expectEdit — no notice): removing a step says so, with Undo (and its Undo stays in the menu).
    await expectRemoved(page, 'Removed “Write the concerns down” and its smaller steps');
    await expectSteps(page, ['Select a feature to test', 'Vibe check']);
    await undoEdit(page);
    // (P-111, rewritten: was with 'Open the doc' after it — its smaller steps are in its own view now.)
    await expectSteps(page, ['Select a feature to test', 'Vibe check', 'Write the concerns down']);
  });

  test('the runner hosts no planning: no break-down sheet, no Keep ask, and its panel holds the round, then, Back to <step> and Jump to… only', async ({ page }) => {
    await startGo(page, [{ id: 'r1', routine: 'test', at: 2, round: 2, status: 'running' }], 'runner', ROUTINES);
    const r = runner(page);
    await r.handle.click();
    await expect(r.panel).toBeVisible();
    await expect(r.panel).toContainText('Round 2');
    await expect(r.panel).toContainText('Last step of the round');
    await expect(r.panel).toContainText('then: Vibe check');
    // P-101 (ruling 1; was: and "Finish Test out the app now"): finishing a level early is Step out, beside Next (none on the first layer).
    // (P-101 amendment, ruling 9: and Start <routine> over — it moves you; it does not plan.)
    await expect(r.panel.getByRole('button')).toHaveText(['Back to Vibe check', 'Jump to…', 'Start Test out the app over']);
    await page.keyboard.press('Escape');
    await expect(r.screen.getByRole('button', { name: /Break it down|See it all|Change the words|Keep/ })).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});

test.describe('the edge of a goal', () => {
  const LAST = [{ id: 'r3', routine: 'drawing', at: 2, status: 'running' as const }];

  test('P-96 (ruling 7; was: Next on the last step of an open goal put you in Plan): Next reads Done there and ends the run — home, "Done with <name>" (P-102: final — × only; was: with Undo); never Plan', async ({ page }) => {
    await startGo(page, LAST, 'runner');
    const r = runner(page);
    await expect(r.words).toHaveText('Gesture drawing');
    await expect(r.next).toHaveText('Done');
    await r.next.click();
    const h = home(page);
    await expect(h.screen).toBeVisible();
    await expect(page).not.toHaveURL(/plan/);
    await expect(h.notice).toContainText('Done with Practise drawing');
    await expect(tile(page, 'Practise drawing')).toHaveCount(0); // P-97 (was: its tile, idle): ended, it leaves home — it is on My routines
    // P-102 (was: Undo brought the run back on its last step): finishing is final.
    await expectFinal(page, 'Practise drawing');
    await expect(tile(page, 'Practise drawing')).toHaveCount(0); // P-97 (was: its tile, idle): ended, it leaves home — it is on My routines
  });

  const EDGE = [{ id: 'r3', routine: 'drawing', at: null, status: 'paused' as const, mode: 'plan' as const }];

  test('a run at the edge (left there by the build before): Plan — "planning · nothing next yet", the open row focused, Done the right side door beside Home, no filled button; a step typed there is where the run stands', async ({ page }) => {
    await startGo(page, EDGE, 'plan');
    const p = plan(page);
    await expect(page).toHaveURL(/\/go\/run\/r3\/plan$/);
    await expect(p.title).toHaveText('Practise drawing');
    await expect(p.line).toHaveText('nothing next yet');
    await expect(p.add).toBeFocused();
    await expect(p.here).toHaveCount(0);
    await expect(p.forward).toHaveCount(0);
    await expect(p.screen.getByRole('button', { name: /^(Next|Resume|Start)/ })).toHaveCount(0);
    await expect(p.done).toHaveText('Done');
    await expect(p.done).toHaveAccessibleName('Done with Practise drawing');
    // Done never takes Home's place: P-101 (ruling 2; was: Home the left side door) Home is in the band, Done the right side door below.
    const homeAtEdge = await place(p.home);
    const doneAtEdge = await place(p.done);
    expect(homeAtEdge.y + homeAtEdge.height).toBeLessThanOrEqual(doneAtEdge.y);
    await expect(p.band.getByRole('button', { name: 'Home', exact: true })).toBeVisible();

    // Plan, execute: a step typed there is where the run stands; Resume runs it.
    await addStep(page, 'Shade the forms');
    await expect(p.here).toHaveAccessibleName('Here, Shade the forms');
    await expect(p.line).toHaveText('at Shade the forms');
    await expect(p.forward).toHaveText('Resume at Shade the forms');
    // Off the edge there is no Done; Home has not moved.
    await expect(p.done).toHaveCount(0);
    expect(await place(p.home)).toEqual(homeAtEdge);
    await p.forward.click();
    const r = runner(page);
    await expect(r.words).toHaveText('Shade the forms');
    // Its Next ends the run now (ruling 7).
    await expect(r.next).toHaveText('Done');
    await saved(page);
    expect((await exported(page)).routines.drawing.items!.map((i) => i.text ?? i.ref)).toEqual(['Warm-up lines', 'hands', 'Gesture drawing', 'Shade the forms']);
  });

  test('Done at the edge ends the run — P-102: finally, × only on home (was: with an Undo that brought it back to its Plan)', async ({ page }) => {
    await startGo(page, EDGE, 'plan');
    const p = plan(page);
    await p.done.click();
    const h = home(page);
    await expect(h.screen).toBeVisible();
    await expect(h.notice).toContainText('Done with Practise drawing');
    await expect(tile(page, 'Practise drawing')).toHaveCount(0); // P-97 (was: its tile, idle): ended, it leaves home — it is on My routines
    await expectFinal(page, 'Practise drawing');
    await expect(tile(page, 'Practise drawing')).toHaveCount(0); // P-97 (was: its tile, idle): ended, it leaves home — it is on My routines
  });

  test('a run stored at the edge (as the build before left it, "running") opens in Plan; home shows it as planning', async ({ page }) => {
    await startGo(page, [{ id: 'r4', routine: 'spanish-es', at: null, status: 'running' }], 'plan');
    const p = plan(page);
    await expect(p.title).toHaveText('Feel at home in Spanish');
    await expect(p.line).toHaveText('nothing next yet');
    await expect(p.add).toBeFocused();
    await p.home.click();
    await expect(home(page).screen).toBeVisible();
    const t = tile(page, 'Feel at home in Spanish');
    // One wording per meaning (DESIGN.md; frame v8): the tile reads as Plan does.
    await expect(t.getByTestId('go-tile-line')).toHaveText('nothing next yet');
    // P-101 (rulings 4–5; was: a Plan button, "planning"): it reads paused; nothing to resume at, so its body is its Plan.
    await expect(t).toHaveAttribute('data-state', 'paused');
    // (P-101 amendment, ruling 9: and its ···, for Start over.)
    await expect(t.getByRole('button')).toHaveCount(2);
    await expect(tileBody(page, 'Feel at home in Spanish')).toHaveAccessibleName(/^Plan Feel at home in Spanish/);
    await expect(t.getByTestId('go-tile-more')).toHaveAccessibleName('More for Feel at home in Spanish');
  });

  // After the audit (F1). The build before kept a run "running" on its blank note at the edge: it is
  // planning, so it is not what is running — nothing else may be locked out by it.
  const GYM: RoutineSpec = { id: 'gym', name: 'Gym', steps: ['Warm up', 'Lift'] };
  const HOUSE: RoutineSpec = { id: 'house', name: 'House', steps: ['Tidy the hall', 'Hoover'] };
  const AT_EDGE = { id: 'g1', routine: 'gym', at: null, status: 'running' as const };

  test('a run stored at the edge as "running" blocks nothing: Start on another routine starts it — and that run is then stored in Plan, not running', async ({ page }) => {
    await startGo(page, [AT_EDGE], 'plan', [GYM, HOUSE]);
    const p = plan(page);
    await expect(p.line).toHaveText('nothing next yet');
    await p.home.click();
    const h = home(page);
    await expect(h.screen).toBeVisible();
    await expect(tile(page, 'Gym').getByTestId('go-tile-line')).toHaveText('nothing next yet');
    // P-97 (was: the idle tile's Start): Start on its row in My routines.
    await (await openRoutines(page)).more('House').click();
    const start = (await arrived(page, 'go-routine-menu')).getByRole('menuitem', { name: 'Start House', exact: true });
    await expect(start).toBeEnabled();
    await start.click();
    await expect(runner(page).words).toHaveText('Tidy the hall');
    await expect(page.getByText('Gym is running')).toHaveCount(0);
    await saved(page);
    const stored = await exported(page);
    const running = Object.values(stored.runs).filter((r) => r.status === 'running');
    expect(running.map((r) => r.routineId)).toEqual(['house']);
    expect(stored.runs.g1.status).toBeUndefined();
    expect(stored.runs.g1.mode).toBeUndefined();
    expect(stored.runs.g1.frames).toEqual([{ seq: 'gym', at: null, round: 1 }]);
  });

  test('a run stored at the edge as "running" blocks nothing: Resume on another run’s tile resumes it, and Start in a new routine’s Plan starts it', async ({ page }) => {
    await startGo(page, [AT_EDGE, { id: 'h1', routine: 'house', at: 1, touchedMinutesAgo: 60 }], 'plan', [GYM, HOUSE]);
    await plan(page).home.click();
    await tileBody(page, 'House').click();
    const r = runner(page);
    await expect(r.words).toHaveText('Hoover');
    await expect(page.getByText('Gym is running')).toHaveCount(0);
    await saved(page);
    let stored = await exported(page);
    expect(Object.values(stored.runs).filter((x) => x.status === 'running').map((x) => x.id)).toEqual(['h1']);
    expect(stored.runs.g1.mode).toBeUndefined();
    expect(stored.runs.g1.status).toBeUndefined();

    // The same state again, and a brand-new routine: Start in its Plan.
    await seedGo(page, [GYM, HOUSE], [AT_EDGE]);
    await openGo(page, 'plan');
    await plan(page).home.click();
    await startThing(page, 'Call the bank');
    await addStep(page, 'Find the number');
    await plan(page).forward.click();
    await expect(runner(page).words).toHaveText('Find the number');
    await expect(page.getByText('Gym is running')).toHaveCount(0);
    await saved(page);
    stored = await exported(page);
    expect(Object.values(stored.runs).filter((x) => x.status === 'running')).toHaveLength(1);
    expect(stored.runs.g1.status).toBeUndefined();
    expect(stored.runs.g1.mode).toBeUndefined();
  });
});

test.describe('creating', () => {
  test('New (P-96: + New and its own sheet; was: the prompt’s words) makes the routine only and opens its Plan: the name filled, the open row focused, no Start until there is a step; Start runs the first', async ({ page }) => {
    await startGo(page, []);
    await startThing(page, 'Learn to bake bread');
    const p = plan(page);
    await expect(page).toHaveURL(/\/go\/routine\/[^/]+$/);
    await expect(p.word).toHaveText('PLAN');
    await expect(p.title).toHaveText('Learn to bake bread');
    await expect(p.add).toBeFocused();
    await expect(p.said).toHaveText('Plan: Learn to bake bread');
    await expect(p.line).toHaveCount(0);
    await expect(p.rows).toHaveCount(0);
    // Nothing to start yet: no button, dimmed or otherwise — and no Done (nothing is running).
    await expect(p.forward).toHaveCount(0);
    await expect(p.done).toHaveCount(0);
    await expect(p.notice).toContainText('Made “Learn to bake bread”');
    // No run was made.
    await saved(page);
    const stored = await exported(page);
    expect(Object.values(stored.runs).filter((r) => stored.routines[r.routineId]?.words === 'Learn to bake bread')).toEqual([]);
    await page.goBack();

    await addStep(page, 'Find a simple recipe');
    await addStep(page, 'Buy flour and yeast');
    await expect(p.add).toBeFocused();
    await expect(p.forward).toHaveText('Start');
    await p.forward.click();
    const r = runner(page);
    await expect(r.words).toHaveText('Find a simple recipe');
    await expect(r.said).toHaveText('Running: Find a simple recipe');
    await openGo(page, 'runner');
    await page.goBack();
    await expect(tileBody(page, 'Learn to bake bread')).toHaveAccessibleName(/^Resume Learn to bake bread/);
    await expect(tile(page, 'Learn to bake bread')).toHaveAttribute('data-state', 'running');
  });

  test('Undo New takes the routine back (the screen goes home); a routine with no steps (P-97: on My routines; was: a tile) has Plan and no Start', async ({ page }) => {
    await startGo(page, []);
    await startThing(page, 'Learn to bake bread');
    await plan(page).home.click();
    // P-97 (was: a tile with Plan and no Start): nothing going, so not on home; its row's menu has Plan and no Start.
    await expect(tile(page, 'Learn to bake bread')).toHaveCount(0);
    // P-101 (ruling 6; was: the New notice still on home after Plan → Home → Plan → Home): a notice is never shown on another screen.
    await expect(home(page).notice).toHaveCount(0);
    const list = await openRoutines(page);
    await list.more('Learn to bake bread').click();
    const menu = await arrived(page, 'go-routine-menu');
    // (P-98, rewritten: and Copy…, before the line.)
    await expect(menuItems(menu)).toHaveText(['Plan', 'Tags…', 'Copy…', 'Remove']);
    await menu.getByRole('menuitem', { name: 'Plan Learn to bake bread', exact: true }).click();
    await expect(plan(page).title).toHaveText('Learn to bake bread');
    await plan(page).toRoutines.click();
    await expect(routines(page).row('Learn to bake bread')).toHaveCount(1);
    await routines(page).home.click();

    // Undo New where it happened — its Plan: the routine goes, and the screen goes home.
    await startThing(page, 'Learn to make pasta');
    await plan(page).undo.click();
    await expect(home(page).screen).toBeVisible();
    await expect(tile(page, 'Learn to make pasta')).toHaveCount(0);
  });

  test('+ New (P-96: a side door, right; was: the New tile, carrying the prompt’s words): on home with tiles and with none it asks for the name in its own sheet; a name makes that routine and opens its Plan', async ({ page }) => {
    await startGo(page, [], 'home', []);
    const h = home(page);
    const make = h.newBtn;
    await expect(make).toHaveText('New');
    await expect(make).toHaveAccessibleName('New');
    await make.click();
    let sheet = await arrived(page, 'go-new-sheet');
    await expect(sheet.getByTestId('go-new-name')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('go-new-sheet')).toHaveCount(0);
    // Nothing was made.
    await expect(h.tiles).toHaveCount(0);
    await make.click();
    sheet = await arrived(page, 'go-new-sheet');
    await sheet.getByTestId('go-new-name').fill('Learn to bake bread');
    await sheet.getByTestId('go-new-plan').click();
    const p = plan(page);
    await expect(p.title).toHaveText('Learn to bake bread');
    await expect(p.add).toBeFocused();
    await p.home.click();
    // P-97 (was: its tile): New makes the routine only — home says nothing is going, with My routines (left) and + New (right).
    await expect(h.tiles).toHaveCount(0);
    await expect(h.idle).toBeVisible();
    // + New comes after them.
    const order = await h.screen.evaluate((root) => [...root.querySelectorAll('[data-testid="go-home-idle"], [data-testid="go-my-routines"], [data-testid="go-new"]')].map((e) => (e as HTMLElement).dataset.testid));
    expect(order).toEqual(['go-home-idle', 'go-my-routines', 'go-new']);
  });
});

test.describe('must handle', () => {
  test('thirty steps with HERE far down: on arriving HERE is in view and the band is still at the top; Resume names it', async ({ page }) => {
    const LONG: RoutineSpec = { id: 'long', name: 'Thirty steps', steps: Array.from({ length: 30 }, (_, i) => `Step number ${i + 1}`) };
    await startGo(page, [{ id: 'r9', routine: 'long', at: 26, status: 'paused', mode: 'plan' }], 'plan', [LONG]);
    const p = plan(page);
    await expect(p.rows).toHaveCount(30);
    await expect(p.here).toHaveAccessibleName('Here, Step number 27');
    await expect(p.here).toBeInViewport({ ratio: 1 });
    await expect(p.title).toBeFocused();
    expect((await p.band.boundingBox())!.y).toBe(0);
    await expect(p.home).toBeInViewport({ ratio: 1 });
    await expect(p.forward).toHaveText('Resume at Step number 27');
    await expect(p.forward).toBeInViewport({ ratio: 1 });
    // The band does not scroll away.
    await p.list.evaluate((e) => e.scrollTo(0, 99999));
    expect((await p.band.boundingBox())!.y).toBe(0);
    await expect(p.add).toBeInViewport();
  });

  test('one step; a three-line step shown whole, in its row and in Resume; a routine nested as a step is a row that opens, and an edit inside it edits that routine', async ({ page }) => {
    const LINES = 'Read the whole of the job advertisement twice over, slowly, and underline every single thing they ask for that I can actually show them';
    const ONE: RoutineSpec = { id: 'one', name: 'One thing', steps: [LINES] };
    await startGo(page, [{ id: 'r9', routine: 'one', at: 0, status: 'paused', mode: 'plan' }], 'plan', [ONE, ...MAYA]);
    const p = plan(page);
    await expect(p.rows).toHaveCount(1);
    const words = p.words.first();
    await expect(words).toHaveText(LINES);
    expect((await words.boundingBox())!.height).toBeGreaterThan(60);
    expect(await words.evaluate((e) => e.scrollWidth <= e.clientWidth + 1 && e.scrollHeight <= e.clientHeight + 1)).toBe(true);
    await expect(p.forward).toHaveText(`Resume at ${LINES}`);
    await expect(p.forward).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    // A routine as a step: a row that opens.
    await page.goto('./go/routine/drawing');
    await expectSteps(page, ['Warm-up lines', 'Hand studies of my left hand', 'Gesture drawing']);
    await expect(p.row('Hand studies of my left hand')).toHaveAttribute('data-kind', 'routine');
    const open = p.screen.getByRole('button', { name: 'Open Hand studies of my left hand', exact: true });
    await expect(open).toHaveAttribute('aria-expanded', 'false');
    await open.click();
    await expectSteps(page, ['Warm-up lines', 'Hand studies of my left hand', 'Find a reference photo', 'Block in the big shapes', 'Check your proportions', 'Add the shadows', 'Gesture drawing']);
    // It has its own Repeat from here (3 times), and it is not this routine's.
    await expect(p.divider).toHaveText('Repeat from here · 3 times');
    // Its menu: a routine is not reworded or broken down from here.
    await p.more('Hand studies of my left hand').click();
    // (P-102: Add a step after · a line · Remove — was: … Move up · Move down · Remove this step · Close.)
    // (P-98, rewritten: a call's menu opens its routine's Plan — Open — first.)
    await expect(menuItems(await arrived(page, 'go-plan-menu'))).toHaveText(['Open', 'Add a step after', 'Remove']);
    await page.keyboard.press('Escape');
    await planMenu(page, 'Add the shadows', 'Edit');
    await planType(page, 'Add the darkest shadows');
    await saved(page);
    const stored = await exported(page);
    expect(stored.routines.hands.items!.map((i) => i.text)).toEqual(['Find a reference photo', 'Block in the big shapes', 'Check your proportions', 'Add the darkest shadows']);
    expect(stored.routines.drawing.items!.map((i) => i.text ?? i.ref)).toEqual(['Warm-up lines', 'hands', 'Gesture drawing']);
  });

  test('a run inside a routine nested as a step: P-101 (ruling 2) its runner’s "Plan <routine>" opens that routine’s Plan, HERE the inner step; the run’s own Plan has that row open, "You are in this", and HERE is the inner step', async ({ page }) => {
    await startGo(page, [{ id: 'r3', routine: 'drawing', at: 1, inner: [{ routine: 'hands', at: 2, round: 2 }], status: 'running' }], 'runner');
    await expect(runner(page).plan).toHaveText('Plan Hand studies of my left hand');
    await runner(page).plan.click();
    const p = plan(page);
    await expect(p.title).toHaveText('Hand studies of my left hand');
    await expect(p.here).toHaveAccessibleName('Here, Check your proportions');
    await expect(p.here).toHaveAttribute('data-depth', '0');
    await expect(p.forward).toHaveText('Resume at Check your proportions');
    // The run's own Plan (its address): every level it is in, open.
    await page.goto('./go/run/r3/plan');
    await expect(p.title).toHaveText('Practise drawing');
    await expect(p.row('Hand studies of my left hand')).toHaveAccessibleName('You are in this, Hand studies of my left hand');
    await expect(p.here).toHaveAccessibleName('Here, Check your proportions');
    await expect(p.here).toHaveAttribute('data-depth', '1');
    await expect(p.forward).toHaveText('Resume at Check your proportions');
    await p.forward.click();
    await expect(runner(page).words).toHaveText('Check your proportions');
    await expect(runner(page).context).toHaveText('Practise drawing ›Hand studies of my left hand');
  });

  test('an empty routine: its Plan has the open row focused and no Start; a step typed there is kept across a reload before it is added (and words being changed in place too)', async ({ page }) => {
    await startGo(page, [], 'home');
    await page.goto('./go/routine/spanish-es');
    const p = plan(page);
    await expect(p.title).toHaveText('Feel at home in Spanish');
    await expect(p.add).toBeFocused();
    await expect(p.forward).toHaveCount(0);
    await p.add.fill('Order a coffee in Span');
    await page.reload();
    await expect(p.add).toHaveValue('Order a coffee in Span');
    await p.add.press('End');
    await p.add.pressSequentially('ish');
    await p.add.press('Enter');
    await expectSteps(page, ['Order a coffee in Spanish']);
    await expect(p.forward).toHaveText('Start');

    await planMenu(page, 'Order a coffee in Spanish', 'Edit');
    await p.typed.fill('Order two coffees');
    await page.reload();
    await expect(p.typed).toHaveValue('Order two coffees');
    await expect(p.typed).toBeFocused();
    // Not kept yet: the routine still has the old words until Return.
    await p.typed.press('Enter');
    await expectSteps(page, ['Order two coffees']);
  });

  test('offline: Plan opens, edits are kept and Resume works (nothing needs the network)', async ({ page, context }) => {
    await startGo(page, ON_VIBE, 'runner', ROUTINES);
    await context.setOffline(true);
    await runner(page).plan.click();
    const p = plan(page);
    await addStep(page, 'Added offline');
    // (P-102: moved by its keys — was its menu's Move up.)
    await planMove(page, 'Added offline', 'up');
    await expectSteps(page, ['Select a feature to test', 'Vibe check', 'Added offline', 'Write down concerns']);
    await saved(page);
    await p.forward.click();
    await expect(runner(page).words).toHaveText('Vibe check');
    await context.setOffline(false);
    await page.goBack();
    expect((await stepsOf(page)).steps).toEqual(['Select a feature to test', 'Vibe check', 'Added offline', 'Write down concerns']);
  });

  test('an edit refused because the page doesn’t hold the data changes nothing and keeps the typed words', async ({ page }) => {
    await startGo(page, PLANNING, 'plan', ROUTINES);
    const p = plan(page);
    await p.add.fill('typed while away');
    await setVisibility(page, 'hidden');
    await p.add.press('Enter');
    await expect(p.notice).toHaveText('Just a moment — reconnecting.');
    await expect(p.add).toHaveValue('typed while away');
    await expect(p.rows).toHaveCount(3);
    await setVisibility(page, 'visible');
    await expect(async () => {
      await p.add.press('Enter', { timeout: 1000 });
      await expect(p.rows).toHaveCount(4, { timeout: 1000 });
    }).toPass({ timeout: 15_000 });
  });
});

test.describe('data written by the build before', () => {
  test('a run with this-run changes: nothing is folded at load; Plan first opened on it keeps its changes in the routine, in one write, saying so — with an Undo that puts the routine and the run back', async ({ page }) => {
    await importBackup(page, PREVIOUS_BUILD_BACKUP);
    // Imported and opened: the routine is as it was stored (the changes are still the run's own).
    const before = await exported(page);
    expect(before.routines['p90-007'].items!.map((i) => i.text ?? `wait:${i.wait}`)).toEqual(['Open the tracker', 'Find a posting', 'Tailor the CV', 'wait:a reply', 'Log it']);
    expect(before.routines['p90-007'].repeat).toBe(3);
    expect(before.runs['p90-008'].changes).toHaveLength(7);

    // (P-96: the paused run opens home — was its paused screen, then Back.)
    await openGo(page);
    const t = tile(page, 'Apply for jobs');
    await t.getByRole('button', { name: 'Plan Apply for jobs', exact: true }).click();
    const p = plan(page);
    // (P-111, rewritten: was the title 'Apply for jobs' and the whole sequence, every step broken down open in place —
    // Plan opens where the run is, the innermost step broken down it is in, as a view of its own; its path goes back up.)
    await expect(p.title).toHaveText('Open the job ad');
    await expect(page).toHaveURL(/\/go\/run\/p90-008\/plan$/);
    await expect(p.notice).toContainText('Kept this run’s changes in Apply for jobs');
    // The sequence as that run read it: a step removed, one added, one reworded, two broken down, 5 times.
    await expectSteps(page, ['Find the right tab', 'Copy the requirements']);
    await expect(p.here).toHaveAccessibleName('Here, Find the right tab');
    await expect(p.line).toHaveText('at Find the right tab');
    await expect(p.forward).toHaveText('Resume at Find the right tab');
    await plan(page).screen.getByTestId('go-plan-up').click();
    await expect(plan(page).title).toHaveText('Tailor the CV');
    await expectSteps(page, ['Open the job ad', 'Rewrite the summary']);
    await plan(page).screen.getByTestId('go-plan-up').click();
    await expect(plan(page).title).toHaveText('Apply for jobs');
    await expectSteps(page, ['Open the tracker', 'Tailor the CV', 'Ask Sam to proofread', 'Wait for a reply', 'Log it in the sheet']);
    await expect(plan(page).divider.first()).toHaveText('Repeat from here · 5 times');
    await saved(page);
    const after = await exported(page);
    expect(after.routines['p90-007'].items!.map((i) => i.text ?? (i.wait !== undefined ? `wait:${i.wait}` : `ref:${i.ref}`))).toEqual(['Open the tracker', 'ref:p90-019', 'Ask Sam to proofread', 'wait:a reply', 'Log it in the sheet']);
    expect(after.routines['p90-007'].repeat).toBe(5);
    expect(after.runs['p90-008'].changes).toEqual([]);
    // P-101 (ruling 4; was: 'plan'): no mode is written.
    expect(after.runs['p90-008'].mode).toBeUndefined();
    // The ended run's unkept change is history: never folded.
    expect(after.routines['p90-001'].items!.map((i) => i.text)).toEqual(['Clear the cups']);
  });

  test('the fold’s own Undo puts everything back and takes the run out of Plan: the screen follows the data', async ({ page }) => {
    await importBackup(page, PREVIOUS_BUILD_BACKUP);
    // (P-96: the paused run opens home — was its paused screen, then Back.)
    await openGo(page);
    await tile(page, 'Apply for jobs').getByRole('button', { name: 'Plan Apply for jobs', exact: true }).click();
    const p = plan(page);
    await expect(p.notice).toContainText('Kept this run’s changes in Apply for jobs');
    await p.undo.click();
    // Not in Plan any more (and not the run the app is on): home.
    await expect(home(page).screen).toBeVisible();
    await saved(page);
    const back = await exported(page);
    expect(back.routines['p90-007'].items!.map((i) => i.text ?? `wait:${i.wait}`)).toEqual(['Open the tracker', 'Find a posting', 'Tailor the CV', 'wait:a reply', 'Log it']);
    expect(back.routines['p90-007'].repeat).toBe(3);
    expect(back.runs['p90-008'].changes).toHaveLength(7);
    expect(back.runs['p90-008'].mode).toBeUndefined();
  });

  test('a run left at the edge with this-run changes, reopened with no tap: Plan folds them once on arriving, saying so, with Undo', async ({ page }) => {
    const LEGACY: RoutineSpec = { id: 'legacy', name: 'Write the report', steps: ['Outline it', 'Draft it'] };
    const changes = [
      { id: 'c1', kind: 'reword', seq: 'legacy', item: 'legacy-1', text: 'Draft it badly' },
      { id: 'c2', kind: 'add', seq: 'legacy', after: 'legacy-1', item: { id: 'x1', text: 'Sleep on it' } },
    ];
    // At the edge of a level is not reachable with steps after it; this one finished its steps and is asking.
    await startGo(page, [{ id: 'r7', routine: 'legacy', at: null, status: 'running', changes }], 'plan', [LEGACY]);
    const p = plan(page);
    await expect(p.notice).toContainText('Kept this run’s changes in Write the report');
    await expectSteps(page, ['Outline it', 'Draft it badly', 'Sleep on it']);
    await saved(page);
    const stored = await exported(page);
    expect(stored.routines.legacy.items!.map((i) => i.text)).toEqual(['Outline it', 'Draft it badly', 'Sleep on it']);
    expect(stored.runs.r7.changes).toEqual([]);
  });

  // After the audit (F2). The fold's Undo at the edge: the run carries its changes again, so this is
  // not a Plan that can be edited (its rows would be the run's reading, its edits the routine's). The
  // screen leaves for home; nothing is lost, and Plan opened again folds again, saying so.
  test('Undo of the fold at the edge leaves Plan for home with everything back; Plan opened again folds again, and then Remove and Change the words do what they say and stay done', async ({ page }) => {
    const GYM: RoutineSpec = { id: 'gym', name: 'Gym', steps: ['a', 'b'] };
    const changes = [
      { id: 'c1', kind: 'add', seq: 'gym', after: 'gym-1', item: { id: 'x1', text: 'only this run' } },
      { id: 'c2', kind: 'reword', seq: 'gym', item: 'gym-0', text: 'A for this run' },
    ];
    await startGo(page, [{ id: 'g1', routine: 'gym', at: null, status: 'running', changes }], 'plan', [GYM]);
    const p = plan(page);
    await expect(p.notice).toContainText('Kept this run’s changes in Gym');
    await expectSteps(page, ['A for this run', 'b', 'only this run']);
    await p.undo.click();
    // Never a Plan whose rows are not the routine's: home, the tile still planning.
    const h = home(page);
    await expect(h.screen).toBeVisible();
    await expect(page).toHaveURL(/\/go$/);
    await expect(tile(page, 'Gym').getByTestId('go-tile-line')).toHaveText('nothing next yet');
    await saved(page);
    const back = await exported(page);
    expect(back.routines.gym.items!.map((i) => i.text)).toEqual(['a', 'b']);
    expect(back.runs.g1.changes).toHaveLength(2);

    // Plan again (the app reopened: it is where this run was left): folded again, saying so. Now every edit acts on what is shown.
    await openGo(page, 'plan');
    await expect(p.notice).toContainText('Kept this run’s changes in Gym');
    await expectSteps(page, ['A for this run', 'b', 'only this run']);
    await planMenu(page, 'only this run', 'Remove');
    await expectSteps(page, ['A for this run', 'b']);
    // P-103 (5; was expectEdit — no notice): removing a step says so, with Undo (and its Undo stays in the menu).
    await expectRemoved(page, 'Removed “only this run”');
    await planMenu(page, 'A for this run', 'Edit');
    await planType(page, 'A planned');
    await expectSteps(page, ['A planned', 'b']);
    await expectEdit(page, 'Changed “A for this run”');
    // The next visit does not write the old words back over the edit.
    await p.home.click();
    await expect(h.screen).toBeVisible();
    await openGo(page, 'plan');
    await expectSteps(page, ['A planned', 'b']);
    await expect(plan(page).notice.getByRole('button', { name: /^Undo/ })).toHaveCount(0);
    await saved(page);
    const stored = await exported(page);
    expect(stored.routines.gym.items!.map((i) => i.text)).toEqual(['A planned', 'b']);
    expect(stored.runs.g1.changes).toEqual([]);
  });

});

test.describe('words still being typed when Plan is left by its filled button', () => {
  // After the audit (F8). Words typed in a row that is still open when Resume (or Start) is pressed are
  // kept by that press — as an edit like any other. P-101 (ruling 6; was: "its notice and its Undo go with
  // you to the runner"): a Plan edit gives no notice, and a notice is never shown on another screen — the
  // runner says nothing; the words are kept (and in Plan, its menu's Undo is the edit's while it is the last action).
  test('words still open in a row when Resume is pressed are kept; the runner shows no notice of it (P-101)', async ({ page }) => {
    await startGo(page, PLANNING, 'plan', ROUTINES);
    const p = plan(page);
    await planMenu(page, 'Write down concerns', 'Edit');
    await expect(p.typed).toBeFocused();
    await p.typed.fill('Write down worries');
    await p.forward.click();
    const r = runner(page);
    await expect(r.words).toHaveText('Vibe check');
    await expect(r.notice).toHaveCount(0);
    await saved(page);
    expect((await stepsOf(page)).steps).toEqual(['Select a feature to test', 'Vibe check', 'Write down worries']);
    expect((await run(page)).status).toBe('running');
  });

  test('words still open in a row when Start is pressed are kept; the runner shows no notice of it (P-101)', async ({ page }) => {
    await startGo(page, [], 'home', ROUTINES);
    // P-97 (was: its idle tile's Plan): from My routines.
    await planFromRoutines(page, 'Test out the app');
    const p = plan(page);
    await planMenu(page, 'Vibe check', 'Add a step after');
    await p.typed.fill('Breathe');
    await p.forward.click();
    const r = runner(page);
    await expect(r.words).toHaveText('Select a feature to test');
    await expect(r.notice).toHaveCount(0);
    await saved(page);
    expect((await stepsOf(page)).steps).toEqual(['Select a feature to test', 'Vibe check', 'Breathe', 'Write down concerns']);
    expect(Object.values((await exported(page)).runs).map((x) => x.status)).toEqual(['running']);
  });
});

test('two tabs: Plan pressed in one — P-101 (ruling 4; was: "the other … follows the data to Plan"): the other, on the runner, follows the data home (the run is paused, plainly); Resume there, and the first, in Plan, follows to the runner', async ({ page, context }) => {
  await startGo(page, ON_VIBE, 'runner', ROUTINES);
  const b = await context.newPage();
  await b.goto('./go');
  await expect(anotherTab(b)).toBeVisible({ timeout: 20_000 });
  // A to the background: B opens where A left off — the runner.
  await turn(page, 'hidden');
  await expect(runner(b).words).toHaveText('Vibe check', { timeout: 15_000 });
  await runner(b).plan.click();
  await expect(plan(b).line).toHaveText('at Vibe check');
  await addStep(b, 'Added in B');
  await saved(b);

  // B to the background, A forward: A's runner is not where the data is any more — the run is paused: home.
  await setVisibility(b, 'hidden');
  await turn(page, 'visible');
  await expect(home(page).screen).toBeVisible({ timeout: 15_000 });
  await expect(tile(page, 'Test out the app').getByTestId('go-tile-line')).toHaveText('at Vibe check');
  await expect(async () => {
    await tileBody(page, 'Test out the app').click({ timeout: 1000 });
    await expect(runner(page).words).toHaveText('Vibe check', { timeout: 1000 });
  }).toPass({ timeout: 15_000 });
  await saved(page);

  // And back: B's Plan follows the run to the runner.
  await setVisibility(page, 'hidden');
  await turn(b, 'visible');
  await expect(runner(b).words).toHaveText('Vibe check', { timeout: 15_000 });
  await expect(runner(b).plan).toHaveText('Plan');
});

test.describe('P-95 audit F1', () => {
  test('a run from the build before, with this-run changes: P-96 (ruling 7; was: the Next that reached the edge folded them into Plan) — the last Next ends the run and goes home, "Done with <name>", the changes not folded (an ended run keeps them as history); P-102: and final — × only (was: its Undo brought the run back to the runner, changes and all)', async ({ page }) => {
    test.setTimeout(60_000);
    await importBackup(page, PREVIOUS_BUILD_BACKUP);
    // (P-96: the paused run opens home — was its paused screen, then Back.)
    await openGo(page);
    await tileBody(page, 'Apply for jobs').click();
    await expect(page).toHaveURL(/\/go\/run\/p90-008$/);
    const r = runner(page);
    await expect(r.screen).toBeVisible();
    for (let i = 0; i < 40 && !/\/go$/.test(page.url()); i++) {
      await r.next.click();
      await page.waitForTimeout(50);
    }
    const h = home(page);
    await expect(page).toHaveURL(/\/go$/);
    await expect(page).not.toHaveURL(/plan/);
    await expect(h.notice).toContainText('Done with Apply for jobs');
    await expect(h.notice).not.toContainText('Kept this run’s changes');
    await expectFinal(page, 'Apply for jobs');
    await saved(page);
    const stored = (await exported(page)).runs['p90-008'];
    expect(stored.endedAt).toBeDefined();
    expect(stored.changes).toHaveLength(7);
  });
});
