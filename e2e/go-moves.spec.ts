/**
 * P-101 (docs/ROADMAP.md; contract rulings 1–8): moves like a debugger; a calmer home and calmer notices;
 * readable values. Each of the item's (1)–(6) at 390×844 and at 200 % text (the 195×422 window the other
 * specs use), with the keyboard down and — where something is typed — up (`phoneKeyboard`).
 * (1) the runner's bottom row is the moves: Step in · Step out · the filled Next; the top line holds the
 * path and the doors (❚❚, Plan). (2) Pause opens "Pausing <name>" with an optional note, shown on the way
 * back in. (3) Home keeps its order, marks the run touched last "last", resumes from a tile's body, has no
 * Resume bar and no "planning". (4) Plan's Home is in the band. (5) No notice for a step added in Plan;
 * a notice goes at the next tap or screen change; the add box wraps. (6) A value is typed in a sheet over
 * the keyboard; the value sheet's trace; hoisted gives; "{ } Insert" beside a field in Plan.
 */
import { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { arrived, expectApart, expectFinal, expectInside, exported, home, openGo, pauseRun, phoneKeyboard, plan, RoutineSpec, runner, startGo, tile, tileBody } from './goFixture';

/** The owner's MyStack: a call (Vibe check) that gives {mood}, a step that reads it. */
const STACK: RoutineSpec = { id: 'stack', name: 'MyStack', steps: [{ routine: 'vibe' }, 'Pick a task for {mood}', 'Do it'] };
const VIBE: RoutineSpec = { id: 'vibe', name: 'Vibe check', home: false, steps: [{ text: 'Feel it out', gives: 'mood' }, 'Name the energy: {mood}'] };
/** Two calls in a row: two Step outs. */
const TWICE: RoutineSpec = { id: 'twice', name: 'Two checks', steps: [{ routine: 'vibe' }, { routine: 'vibe' }, 'Do it'] };
const OTHER: RoutineSpec = { id: 'other', name: 'Practise drawing', steps: ['Warm-up lines', 'Gesture drawing'] };
const ROUTINES = [STACK, VIBE, OTHER, TWICE];

const SIZES = [
  { name: '390×844', width: 390, height: 844 },
  { name: '200 % text (195×422)', width: 195, height: 422 },
];
const PAPER = 'rgb(244, 241, 232)';
const filled = (l: Locator) => l.evaluate((e) => getComputedStyle(e).backgroundColor);
const box = async (l: Locator) => (await l.boundingBox())!;
/** What is really visible (the keyboard up shrinks it). */
const seen = (page: Page) => page.evaluate(() => Math.round(window.visualViewport?.height ?? innerHeight));
const atTop = async (page: Page, l: Locator) => {
  await l.scrollIntoViewIfNeeded();
  const b = await box(l);
  expect(b.y + b.height, 'above the keyboard').toBeLessThanOrEqual((await seen(page)) + 0.5);
};

for (const size of SIZES) {
  test.describe(`at ${size.name}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
    });

    test('(1) the moves: Step in · Step out · the filled Next, lowest; the top line is the path with ❚❚ and Plan at its right', async ({ page }) => {
      await startGo(page, [{ id: 'r', routine: 'stack', status: 'running' }], 'runner', ROUTINES);
      const r = runner(page);
      // The top line: the path, then the doors; Plan and ❚❚ are not at the bottom.
      await expect(r.context).toContainText('MyStack');
      await expect(r.pause).toHaveAccessibleName('Pause and go home');
      await expect(r.plan).toHaveText('Plan');
      for (const d of [r.pause, r.plan]) {
        const b = await box(d);
        expect(b.height).toBeGreaterThanOrEqual(48);
        expect(b.width).toBeGreaterThanOrEqual(48);
        expect(b.y + b.height).toBeLessThanOrEqual((await box(r.note)).y);
      }
      // The first layer: Step in (the step has steps), no Step out; Next is filled and lowest.
      await expect(r.stepIn).toHaveAccessibleName('Step in: Vibe check');
      await expect(r.stepOut).toHaveCount(0);
      expect(await filled(r.next)).toBe(PAPER);
      expect((await box(r.next)).y).toBeGreaterThanOrEqual((await box(r.stepIn)).y);
      await expect(r.screen.getByRole('button', { name: /^Finish/ })).toHaveCount(0);
      await expectInside(page, [r.pause, r.plan, r.stepIn, r.next]);
      await expect(() => expectApart(page, { context: r.context, note: r.note, moves: r.stepIn, next: r.next })).toPass();

      // Inside the call: Step out, named; Plan names the innermost routine.
      await r.stepIn.click();
      await expect(r.words).toHaveText('Feel it out');
      await expect(r.stepOut).toHaveAccessibleName('Step out of Vibe check');
      await expect(r.plan).toHaveAccessibleName(/^Plan Vibe check/);
      // (Under 340 px — 200 % text — it says "Plan"; the routine is the path's, beside it, and in its spoken name.)
      await expect(r.plan).toHaveText(size.width >= 340 ? 'Plan Vibe check' : 'Plan');
      await expect(r.stepIn).toHaveCount(0);
      // (At 200 % text inside a call the path and Plan's words take two rows: the column scrolls — each is reached, whole.)
      for (const l of [r.plan, r.stepOut, r.next]) {
        await l.scrollIntoViewIfNeeded();
        await expectInside(page, [l]);
      }
      // Step out: up one, on the step after the call — with an Undo (it can skip steps).
      await r.stepOut.click();
      await expect(r.words).toHaveText('Pick a task for {mood}');
      await expect(r.notice).toContainText('Left Vibe check');
      await r.notice.getByRole('button', { name: /^Undo/ }).click();
      await expect(r.words).toHaveText('Feel it out');
      // From the keyboard: Tab reaches the moves and Next; Space presses them.
      await r.stepOut.focus();
      await page.keyboard.press('Tab');
      await expect(r.next).toBeFocused();
      // Next to the end: Done only on the press that ends the run.
      await r.stepOut.click();
      await r.next.click();
      await expect(r.next).toHaveText('Done');
      await expect(r.next).toHaveAccessibleName('Done with MyStack');
      await expect(r.stepOut).toHaveCount(0);
    });

    test('(2) ❚❚ opens "Pausing <name>": an optional note, the filled Pause, Close stays; the note reads on the tile and back in the runner — keyboard up and down', async ({ page }) => {
      await startGo(page, [{ id: 'r', routine: 'stack', status: 'running' }], 'runner', ROUTINES);
      const r = runner(page);
      // Close: nothing happens, the run goes on.
      await r.pause.click();
      let sheet = await arrived(page, 'go-pause-sheet');
      await expect(sheet.getByRole('heading')).toHaveText('Pausing MyStack');
      await expect(sheet.getByTestId('go-pause-note')).toHaveAccessibleName('Note');
      await expect(sheet.getByTestId('go-pause-note')).toBeFocused();
      expect(await filled(sheet.getByTestId('go-pause-confirm'))).toBe(PAPER);
      await sheet.getByRole('button', { name: 'Close', exact: true }).last().click();
      await expect(page.getByTestId('go-pause-sheet')).toHaveCount(0);
      await expect(r.words).toHaveText('Vibe check');
      // With the keyboard up: the note of two lines, and Pause above the keyboard.
      await phoneKeyboard(page);
      await r.pause.click();
      sheet = await arrived(page, 'go-pause-sheet');
      const note = sheet.getByTestId('go-pause-note');
      await note.click();
      await note.fill('Left off in the Notion page\nbudget tab');
      await atTop(page, sheet.getByTestId('go-pause-confirm'));
      await sheet.getByTestId('go-pause-confirm').click();
      // Home: the note under the "at …" line.
      const t = tile(page, 'MyStack');
      await expect(t.getByTestId('go-tile-line')).toHaveText('at Vibe check');
      await expect(t.getByTestId('go-tile-reason')).toHaveText('Left off in the Notion page\nbudget tab');
      expect((await box(t.getByTestId('go-tile-reason'))).y).toBeGreaterThan((await box(t.getByTestId('go-tile-line'))).y);
      // Back in: the runner shows it with the values area; Pause again: it is prefilled.
      await tileBody(page, 'MyStack').click();
      await expect(r.reason).toHaveText('Left off in the Notion page\nbudget tab');
      await r.pause.click();
      sheet = await arrived(page, 'go-pause-sheet');
      await expect(sheet.getByTestId('go-pause-note')).toHaveValue('Left off in the Notion page\nbudget tab');
      // Emptied and paused: the reason goes.
      await sheet.getByTestId('go-pause-note').fill('');
      await sheet.getByTestId('go-pause-confirm').click();
      await expect(tile(page, 'MyStack').getByTestId('go-tile-reason')).toHaveCount(0);
    });

    test('(3) home: the order never changes for a pause; "last" marks the run touched last; a tile’s body resumes; no Resume bar; nothing reads "planning"', async ({ page }) => {
      // Practise drawing's run was started first; MyStack's later. MyStack was made first.
      await startGo(
        page,
        [
          { id: 'd', routine: 'other', status: 'paused', startedDaysAgo: 3, touchedMinutesAgo: 1 },
          { id: 's', routine: 'stack', startedDaysAgo: 1, touchedMinutesAgo: 60 },
        ],
        'home',
        ROUTINES,
      );
      const h = home(page);
      const names = () => h.tiles.evaluateAll((els) => els.map((e) => e.getAttribute('data-routine')));
      // The runs, by when each was started; then what has nothing going.
      const order = await names();
      expect(order).toEqual(['other', 'stack', 'twice']);
      await expect(page.getByTestId('go-resume')).toHaveCount(0);
      await expect(tile(page, 'Practise drawing').getByTestId('go-tile-last')).toHaveText('last');
      await expect(tile(page, 'MyStack').getByTestId('go-tile-last')).toHaveCount(0);
      // The body is a button: "Resume <name>", with what it shows. Its Plan stays.
      await expect(tileBody(page, 'MyStack')).toHaveAccessibleName(/^Resume MyStack, at Vibe check/);
      await expect(tile(page, 'MyStack').getByRole('button', { name: 'Plan MyStack', exact: true })).toBeVisible();
      const b = await box(tileBody(page, 'MyStack'));
      expect(b.height).toBeGreaterThanOrEqual(48);
      // From the keyboard: the body takes the focus and Return resumes.
      await tileBody(page, 'MyStack').focus();
      await page.keyboard.press('Enter');
      const r = runner(page);
      await expect(r.words).toHaveText('Vibe check');
      // Plan from the runner, then home: paused, never "planning"; same order; it is "last" now.
      // (P-103 (3; was: Plan's Home): Plan opened from the runner goes back to it — then Pause goes home.)
      await r.plan.click();
      await expect(plan(page).line).toHaveText('at Vibe check');
      await plan(page).back.click();
      await pauseRun(page);
      await expect(home(page).screen).not.toContainText('planning');
      expect(await names()).toEqual(order);
      await expect(tile(page, 'MyStack').getByTestId('go-tile-last')).toHaveText('last');
      await expect(tile(page, 'Practise drawing').getByTestId('go-tile-last')).toHaveCount(0);
      await expect(tile(page, 'MyStack').getByTestId('go-tile-line')).toHaveText('at Vibe check');
      expect((await exported(page)).runs.s.mode).toBeUndefined();
    });

    test('(3) a run an earlier build stored in Plan (`mode: plan`) loads and reads paused — "at <step>", Resume — and its stored mode is kept', async ({ page }) => {
      await startGo(page, [{ id: 's', routine: 'stack', at: 1, status: 'paused', mode: 'plan', reason: 'before lunch' }], 'home', ROUTINES);
      const t = tile(page, 'MyStack');
      await expect(t.getByTestId('go-tile-line')).toHaveText('at Pick a task for {mood}');
      await expect(t.getByTestId('go-tile-reason')).toHaveText('before lunch');
      await expect(home(page).screen).not.toContainText('planning');
      await expect(tileBody(page, 'MyStack')).toHaveAccessibleName(/^Resume MyStack/);
      expect((await exported(page)).runs.s).toMatchObject({ mode: 'plan', status: 'paused' });
      await openGo(page);
      await tileBody(page, 'MyStack').click();
      await expect(runner(page).words).toHaveText('Pick a task for {mood}');
      await expect(runner(page).reason).toHaveText('before lunch');
    });

    test('(4)(5) Plan: Home in the band, Resume at <step> the filled bottom; adding a step gives no notice, its Undo is the routine’s menu; the add box wraps — keyboard up and down', async ({ page }) => {
      await startGo(page, [{ id: 'r', routine: 'other', status: 'paused' }], 'home', ROUTINES);
      await tile(page, 'Practise drawing').getByRole('button', { name: 'Plan Practise drawing', exact: true }).click();
      const p = plan(page);
      // Home in the band (top), never at the bottom.
      const band = await box(p.band);
      const hm = await box(p.home);
      expect(hm.y).toBeGreaterThanOrEqual(band.y);
      expect(hm.y + hm.height).toBeLessThanOrEqual(band.y + band.height + 0.5);
      expect(hm.height).toBeGreaterThanOrEqual(48);
      await expect(p.band.getByRole('button', { name: 'Home', exact: true })).toBeVisible();
      await expect(p.forward).toHaveText('Resume at Warm-up lines');
      expect(await filled(p.forward)).toBe(PAPER);
      expect((await box(p.forward)).y).toBeGreaterThan(hm.y);
      // The keyboard up: a long step typed wraps — all of it shows — and nothing is said when it is added.
      await phoneKeyboard(page);
      const long = 'Look through the sketchbook from last month and pick the three pages I like least';
      await p.add.click();
      await p.add.fill(long);
      const grown = await p.add.evaluate((e) => ({ h: e.getBoundingClientRect().height, scroll: e.scrollHeight, client: e.clientHeight }));
      expect(grown.h).toBeGreaterThan(48);
      expect(grown.scroll).toBeLessThanOrEqual(grown.client + 1);
      await atTop(page, p.add);
      await p.add.press('Enter');
      await expect(p.rows.filter({ hasText: long })).toHaveCount(1);
      await expect(p.add).toBeFocused();
      await expect(p.add).toHaveValue('');
      await expect(page.getByTestId('go-notice')).toHaveCount(0);
      // Its Undo: the routine's menu, "Undo <edit>".
      await p.more('Practise drawing').click();
      const menu = await arrived(page, 'go-plan-routine');
      await menu.getByTestId('go-plan-undo').click();
      await expect(p.rows.filter({ hasText: long })).toHaveCount(0);
      // Home changes nothing.
      await p.home.click();
      await expect(tile(page, 'Practise drawing').getByTestId('go-tile-line')).toHaveText('at Warm-up lines');
    });

    test('(5) a notice goes at the next tap anywhere, and at a screen change — never shown on another screen', async ({ page }) => {
      await startGo(page, [{ id: 'r', routine: 'twice', status: 'running', inner: [{ routine: 'vibe', at: 1 }] }], 'runner', ROUTINES);
      const r = runner(page);
      await r.stepOut.click();
      await expect(r.notice).toContainText('Left Vibe check');
      // A tap elsewhere (the path): it goes.
      await r.context.click();
      await expect(page.getByTestId('go-notice')).toHaveCount(0);
      // Made again (the second call), then Plan from the keyboard (no tap): not on Plan, not back on the runner.
      await r.stepIn.click();
      await r.stepOut.click();
      await expect(r.notice).toContainText('Left Vibe check');
      await r.plan.focus();
      await page.keyboard.press('Enter');
      await expect(plan(page).screen).toBeVisible();
      await expect(page.getByTestId('go-notice')).toHaveCount(0);
      await plan(page).forward.click();
      await expect(r.words).toHaveText('Do it');
      await expect(page.getByTestId('go-notice')).toHaveCount(0);
      // The run's end carries its notice home (where it lands) — P-102: final, × only (was: with Undo).
      await r.next.click();
      await expectFinal(page, 'Two checks');
    });

    test('(6) a value is typed in a sheet that sits above the keyboard; the field reads label and value; the value sheet’s trace; hoisted gives — keyboard up and down', async ({ page }) => {
      await startGo(page, [{ id: 'r', routine: 'stack', status: 'running', inner: [{ routine: 'vibe', at: 0 }] }], 'runner', ROUTINES);
      const r = runner(page);
      await expect(r.field('mood')).toHaveAccessibleName('mood');
      expect((await box(r.field('mood'))).height).toBeGreaterThanOrEqual(48);
      await phoneKeyboard(page);
      await r.field('mood').click();
      const sheet = await arrived(page, 'go-entry-sheet');
      await expect(sheet.getByRole('heading')).toHaveText('mood');
      const field = sheet.getByTestId('go-entry-field');
      await expect(field).toBeFocused();
      await expect(field).toHaveAccessibleName('mood');
      await field.fill('calm but a little restless after a long morning of meetings');
      // Above the keyboard: the field and Keep; the runner beneath cannot be reached.
      await atTop(page, sheet.getByTestId('go-entry-keep'));
      expect(await filled(sheet.getByTestId('go-entry-keep'))).toBe(PAPER);
      await sheet.getByTestId('go-entry-keep').click();
      await expect(page.getByTestId('go-entry-sheet')).toHaveCount(0);
      // The field reads the label and the value; no notice for a first value.
      await expect(r.field('mood')).toHaveAccessibleName('mood: calm but a little restless after a long morning of meetings');
      await expect(r.field('mood')).toContainText('calm but a little restless');
      await expect(page.getByTestId('go-notice')).toHaveCount(0);
      // Close leaves it as it was.
      await r.field('mood').click();
      const again = await arrived(page, 'go-entry-sheet');
      await again.getByTestId('go-entry-field').fill('gone');
      await again.getByRole('button', { name: 'Close', exact: true }).last().click();
      await expect(r.field('mood')).toContainText('calm but a little restless');
      // On to its reader: the value in place; the value sheet's trace — MyStack › Vibe check, then Vibe check › Feel it out with mood under it.
      await r.next.click();
      await expect(r.words).toHaveText('Name the energy: calm but a little restless after a long morning of meetings');
      await r.values.first().click();
      const vs = await arrived(page, 'go-value-sheet');
      const levels = vs.getByTestId('go-trace-level');
      await expect(levels).toHaveCount(2);
      await expect(levels.nth(0)).toContainText('MyStack › Vibe check');
      await expect(levels.nth(1)).toContainText('Vibe check › Feel it out');
      await expect(levels.nth(1)).toContainText('mood: calm but a little restless');
      await expect(vs.getByTestId('go-value-read-by')).toContainText('read by');
      await atTop(page, vs.getByTestId('go-value-keep'));
    });

    test('(6) Plan: a step broken down says what its smaller steps give, hoisted; "{ } Insert" beside a field opens the names — from the keyboard too', async ({ page }) => {
      await startGo(page, [], 'home', ROUTINES);
      await tile(page, 'Practise drawing').getByRole('button', { name: 'Plan Practise drawing', exact: true }).click();
      const p = plan(page);
      // Break "Warm-up lines" down into a step that gives {lines}.
      await p.more('Warm-up lines').click();
      let menu = await arrived(page, 'go-plan-menu');
      await menu.getByRole('menuitem', { name: 'Break it down', exact: true }).click();
      await p.typed.fill('Draw ten lines');
      await p.typed.press('Enter');
      await page.keyboard.press('Escape');
      await p.more('Draw ten lines').click();
      menu = await arrived(page, 'go-plan-menu');
      await menu.getByRole('menuitem', { name: 'Gives…', exact: true }).click();
      const gives = await arrived(page, 'go-gives-sheet');
      await gives.getByTestId('go-gives-name').fill('lines');
      await gives.getByTestId('go-gives-apply').click();
      await expect(p.row('Warm-up lines').getByTestId('go-plan-hoisted')).toHaveText('gives {lines}');
      // Insert beside the field: the names, then Return puts {lines} in.
      await phoneKeyboard(page);
      await p.more('Gesture drawing').click();
      menu = await arrived(page, 'go-plan-menu');
      await menu.getByRole('menuitem', { name: 'Edit', exact: true }).click();
      const insert = p.screen.getByTestId('go-insert');
      await expect(insert).toHaveAccessibleName('Insert a name');
      expect((await box(insert)).height).toBeGreaterThanOrEqual(48);
      await atTop(page, insert);
      await insert.click();
      await expect(p.names.first()).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(p.typed).toBeFocused();
      await expect(p.typed).toHaveValue(/\{lines\}/);
      // From the keyboard: Tab to Insert keeps the field open; Space opens the names.
      await page.keyboard.press('Tab');
      await expect(insert).toBeFocused();
      await expect(p.typed).toBeVisible();
      await page.keyboard.press('Space');
      await expect(p.names.first()).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(p.typed).toBeFocused();
      await p.typed.press('Enter');
      // P-103 (audit F4; was 'Gesture drawing{lines}'): a name put in after a word gets a space before it.
      await expect(p.row('Gesture drawing {lines}')).toHaveCount(1);
      // And on the runner, the context line says it too.
      await p.forward.click();
      await expect(runner(page).screen.getByTestId('go-context-gives')).toHaveText('gives {lines}');
    });
  });
}
