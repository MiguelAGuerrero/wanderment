/**
 * P-101 amendment (owner, 2026-11-26; contract rulings 9–11): "there should be a way to reset an ongoing
 * thread or routine, especially if you edited it … there's no way to supply that value where I was".
 * (9) Start over — the whole run, or the level it is in and below — from the runner's pull-up panel, a
 * paused tile's ··· and Plan's routine ···, asked first, with Undo. (10) A name a passed step gives, with no
 * value, is "not given yet" in the values row and can be given now. (11) Removing a giving step that has
 * readers asks first, naming them; afterwards they show a dashed "asks {x}" in Plan and ask when run;
 * Gives… on another step turns them back; one Undo restores the step and its gives.
 */
import { expect, test } from './fixtures';
import { arrived, expectEdit, home, phoneKeyboard, plan, planMenu, RoutineSpec, runner, saved, exported, setVisibility, startGo, tile, undoEdit } from './goFixture';

const DRAWING: RoutineSpec = { id: 'draw', name: 'Drawing practice', steps: ['Select the subject matter', 'Warm up', 'Find photos of {subject}', { routine: 'sketch' }, 'Rank your drawings'] };
const SKETCH: RoutineSpec = { id: 'sketch', name: 'Sketch', home: false, steps: [{ text: 'Pick a pencil', gives: 'pencil' }, 'Draw with the {pencil}'] };
const ROUTINES = [DRAWING, SKETCH];
const box = async (l: import('@playwright/test').Locator) => (await l.boundingBox())!;
const seen = (page: import('@playwright/test').Page) => page.evaluate(() => Math.round(window.visualViewport?.height ?? innerHeight));

for (const size of [
  { name: '390×844', width: 390, height: 844 },
  { name: '200 % text (195×422)', width: 195, height: 422 },
]) {
  test.describe(`at ${size.name}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
    });

    test('(10) the owner’s case: paused past a step, Gives… added to it in Plan, back in — "subject: not given yet", given now from its sheet (keyboard up), read where it is read, "given at" where it was given', async ({ page }) => {
      await startGo(page, [{ id: 'r', routine: 'draw', at: 1, status: 'paused' }], 'home', ROUTINES);
      await tile(page, 'Drawing practice').getByRole('button', { name: 'Plan Drawing practice', exact: true }).click();
      await planMenu(page, 'Select the subject matter', 'Gives…');
      const gives = await arrived(page, 'go-gives-sheet');
      await gives.getByTestId('go-gives-name').fill('subject');
      await gives.getByTestId('go-gives-apply').click();
      await plan(page).forward.click();
      const r = runner(page);
      await expect(r.words).toHaveText('Warm up');
      const missing = r.screen.getByTestId('go-value-missing');
      await expect(missing).toHaveAccessibleName('subject: not given yet');
      await expect(missing).toContainText('not given yet');
      expect((await box(missing)).height).toBeGreaterThanOrEqual(48);
      await phoneKeyboard(page);
      await missing.click();
      const sheet = await arrived(page, 'go-entry-sheet');
      await expect(sheet.getByTestId('go-entry-field')).toBeFocused();
      await sheet.getByTestId('go-entry-field').fill('hands');
      const keep = sheet.getByTestId('go-entry-keep');
      await keep.scrollIntoViewIfNeeded();
      const k = await box(keep);
      expect(k.y + k.height).toBeLessThanOrEqual((await seen(page)) + 0.5);
      await keep.click();
      await expect(missing).toHaveCount(0);
      await expect(r.values.first()).toHaveAccessibleName('subject: hands');
      await r.values.first().click();
      const vs = await arrived(page, 'go-value-sheet');
      await expect(vs.getByTestId('go-value-from')).toHaveText(/^given at Warm up · today \d{1,2}:\d\d$/);
      await vs.getByTestId('go-value-close').click();
      await r.next.click();
      await expect(r.words).toHaveText('Find photos of hands');
      await saved(page);
      expect((await exported(page)).runs.r.values).toMatchObject([{ name: 'subject', items: ['hands'], level: 0, item: 'draw-0', words: 'Warm up' }]);
    });

    test('(9) Start over from the runner’s panel — the level it is in, then the whole run — asked first, with Undo', async ({ page }) => {
      await startGo(page, [{ id: 'r', routine: 'draw', at: 3, inner: [{ routine: 'sketch', at: 1 }], status: 'running', values: [{ name: 'pencil', items: ['2B'], level: 1, seq: 'sketch', item: 'sketch-0', words: 'Pick a pencil', at: new Date().toISOString() }] }], 'runner', ROUTINES);
      const r = runner(page);
      await expect(r.words).toHaveText('Draw with the 2B');
      await r.handle.click();
      await expect(r.panel.getByTestId('go-restart-level')).toHaveText('Start Sketch over');
      await expect(r.panel.getByTestId('go-restart-run')).toHaveText('Start Drawing practice over');
      await r.panel.getByTestId('go-restart-level').click();
      const ask = page.getByTestId('go-restart-confirm');
      await expect(ask).toHaveRole('alertdialog');
      await expect(ask).toContainText('Start Sketch over? Your place and values in it go.');
      // Cancel changes nothing.
      await ask.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(r.words).toHaveText('Draw with the 2B');
      await r.handle.click();
      await r.panel.getByTestId('go-restart-level').click();
      await page.getByTestId('go-restart-confirm').getByRole('button', { name: 'Start over', exact: true }).click();
      await expect(r.words).toHaveText('Pick a pencil');
      await expect(r.context).toContainText('Sketch');
      await expect(r.field('pencil')).toHaveAccessibleName('pencil');
      await expect(r.notice).toContainText('Started Sketch over');
      await r.notice.getByRole('button', { name: /^Undo/ }).click();
      await expect(r.words).toHaveText('Draw with the 2B');
      // The whole run.
      await r.handle.click();
      await r.panel.getByTestId('go-restart-run').click();
      await page.getByTestId('go-restart-confirm').getByRole('button', { name: 'Start over', exact: true }).click();
      await expect(r.words).toHaveText('Select the subject matter');
      await expect(r.context).toHaveText('Drawing practice');
      await saved(page);
      const stored = (await exported(page)).runs.r;
      expect(stored.frames).toEqual([{ seq: 'draw', at: 'draw-0', round: 1 }]);
      expect(stored.values).toBeUndefined();
    });

    test('(9) Start over from a paused tile’s ··· and from Plan’s routine ···', async ({ page }) => {
      await startGo(page, [{ id: 'r', routine: 'draw', at: 2, status: 'paused' }], 'home', ROUTINES);
      const more = tile(page, 'Drawing practice').getByTestId('go-tile-more');
      await expect(more).toHaveAccessibleName('More for Drawing practice');
      expect(Math.min((await box(more)).width, (await box(more)).height)).toBeGreaterThanOrEqual(48);
      await more.click();
      await page.getByTestId('go-tile-restart').click();
      await page.getByTestId('go-restart-confirm').getByRole('button', { name: 'Start over', exact: true }).click();
      await expect(tile(page, 'Drawing practice').getByTestId('go-tile-line')).toHaveText('at Select the subject matter');
      await expect(home(page).notice).toContainText('Started Drawing practice over');
      await home(page).notice.getByRole('button', { name: /^Undo/ }).click();
      await expect(tile(page, 'Drawing practice').getByTestId('go-tile-line')).toHaveText('at Find photos of {subject}');
      // Plan's routine ···.
      await tile(page, 'Drawing practice').getByRole('button', { name: 'Plan Drawing practice', exact: true }).click();
      const p = plan(page);
      await p.screen.getByTestId('go-plan-more').click();
      await (await arrived(page, 'go-plan-routine')).getByTestId('go-plan-restart').click();
      await page.getByTestId('go-restart-confirm').getByRole('button', { name: 'Start over', exact: true }).click();
      await expect(p.here).toHaveAccessibleName('Here, Select the subject matter');
      await expect(p.forward).toHaveText('Resume at Select the subject matter');
      await p.forward.click();
      await expect(runner(page).words).toHaveText('Select the subject matter');
    });

    test('(11) removing a giving step with readers: asked first, naming them; then their names are a dashed "asks {x}" and the runner asks; Gives… on another step, or Undo, turns them back', async ({ page }) => {
      const GIVING: RoutineSpec = { ...DRAWING, steps: [{ text: 'Select the subject matter', gives: 'subject' }, 'Warm up', 'Find photos of {subject}', 'Rank {subject} drawings'] };
      await startGo(page, [], 'home', [GIVING, SKETCH]);
      await tile(page, 'Drawing practice').getByRole('button', { name: 'Plan Drawing practice', exact: true }).click();
      const p = plan(page);
      await expect(p.screen.locator('[data-testid="go-name-chip"][data-asks="true"]')).toHaveCount(0);
      await planMenu(page, 'Select the subject matter', 'Remove this step');
      const ask = page.getByTestId('go-plan-removing');
      await expect(ask.getByRole('heading')).toHaveText('Remove “Select the subject matter”?');
      await expect(ask).toContainText('It gives {subject}, which 2 steps read. They’ll ask for it when run.');
      await expect(ask.getByTestId('go-plan-readers')).toContainText('Find photos of');
      await expect(ask.getByTestId('go-plan-readers')).toContainText('Rank');
      // Close: nothing goes.
      await ask.getByRole('button', { name: 'Close', exact: true }).last().click();
      await expect(p.row('Select the subject matter')).toHaveCount(1);
      await planMenu(page, 'Select the subject matter', 'Remove this step');
      await page.getByTestId('go-plan-remove').click();
      await expect(p.row('Select the subject matter')).toHaveCount(0);
      const dashed = p.screen.locator('[data-testid="go-name-chip"][data-asks="true"]');
      await expect(dashed).toHaveCount(2);
      await expect(dashed.first()).toHaveText('asks {subject}');
      expect(await dashed.first().evaluate((e) => getComputedStyle(e).borderTopStyle)).toBe('dashed');
      // One Undo: the step and its gives.
      await expectEdit(page, 'Removed “Select the subject matter”');
      await undoEdit(page);
      await expect(p.row('Select the subject matter').getByTestId('go-plan-gives')).toHaveText('gives {subject}');
      await expect(dashed).toHaveCount(0);
      // Removed again; Gives… on another step turns the readers back.
      await planMenu(page, 'Select the subject matter', 'Remove this step');
      await page.getByTestId('go-plan-remove').click();
      await expect(dashed).toHaveCount(2);
      // The fallback on the runner: the reader asks.
      await p.forward.click();
      const r = runner(page);
      await r.next.click();
      await expect(r.words).toHaveText('Find photos of {subject}');
      await expect(r.field('subject')).toHaveAccessibleName('asks subject');
      await r.plan.click();
      await planMenu(page, 'Warm up', 'Gives…');
      const gives = await arrived(page, 'go-gives-sheet');
      await gives.getByTestId('go-gives-name').fill('subject');
      await gives.getByTestId('go-gives-apply').click();
      await expect(dashed).toHaveCount(0);
    });
  });
}

test.describe('after the audit', () => {
  test('F1 (probes E1, E2): after Step out a tap puts the notice away, never its Undo — the panel’s row and Ctrl+Z still take it back; after Start over, a tap, then Undo restores place and values', async ({ page }) => {
    await startGo(page, [{ id: 'r', routine: 'draw', at: 3, inner: [{ routine: 'sketch', at: 1 }], status: 'running', values: [{ name: 'pencil', items: ['2B'], level: 1, seq: 'sketch', item: 'sketch-0', words: 'Pick a pencil', at: new Date().toISOString() }] }], 'runner', ROUTINES);
    const r = runner(page);
    await r.stepOut.click();
    await expect(r.notice).toContainText('Done with Sketch');
    await r.context.click();
    await expect(page.getByTestId('go-notice')).toHaveCount(0);
    await r.handle.click();
    const row = r.panel.getByRole('button', { name: 'Undo Done', exact: true });
    await expect(row).toBeVisible();
    await row.click();
    await expect(r.words).toHaveText('Draw with the 2B');
    // Again, by Ctrl+Z after a tap.
    await r.stepOut.click();
    await r.context.click();
    await r.note.focus();
    await page.keyboard.press('Control+z');
    await expect(r.words).toHaveText('Draw with the 2B');
    // Start over the whole run, a stray tap, then Undo: place and values back.
    await r.handle.click();
    await r.panel.getByTestId('go-restart-run').click();
    await page.getByTestId('go-restart-confirm').getByRole('button', { name: 'Start over', exact: true }).click();
    await expect(r.words).toHaveText('Select the subject matter');
    await r.context.click();
    await r.handle.click();
    await r.panel.getByRole('button', { name: /^Undo/ }).click();
    await expect(r.words).toHaveText('Draw with the 2B');
  });

  test('F8: a Plan edit’s "Undo <edit>" stays in the routine’s menu across screen changes while it is the last change', async ({ page }) => {
    await startGo(page, [{ id: 'r', routine: 'draw', at: 1, status: 'paused' }], 'home', ROUTINES);
    await tile(page, 'Drawing practice').getByRole('button', { name: 'Plan Drawing practice', exact: true }).click();
    const p = plan(page);
    await p.add.fill('Sign it');
    await p.add.press('Enter');
    await p.home.click();
    await tile(page, 'Drawing practice').getByRole('button', { name: 'Plan Drawing practice', exact: true }).click();
    await expectEdit(page, 'Added “Sign it”');
    await undoEdit(page);
    await expect(p.rows.filter({ hasText: 'Sign it' })).toHaveCount(0);
  });

  test('F6: at 195×422 inside a call, with "not given yet" and a notice, the note keeps a usable size and the moves and Next are whole on screen — the values area scrolls instead', async ({ page }) => {
    await page.setViewportSize({ width: 195, height: 422 });
    const GIVING: RoutineSpec = { ...DRAWING, steps: [{ text: 'Select the subject matter', gives: 'subject' }, 'Warm up', 'Find photos of {subject}', { routine: 'sketch' }, 'Rank your drawings'] };
    await startGo(page, [{ id: 'r', routine: 'draw', at: 3, inner: [{ routine: 'sketch', at: 0 }], status: 'running' }], 'runner', [GIVING, SKETCH, { id: 'x', name: 'Other', steps: ['x'] }]);
    const r = runner(page);
    await expect(r.screen.getByTestId('go-value-missing')).toHaveCount(1);
    await setVisibility(page, 'hidden');
    await r.next.click();
    await expect(r.notice).toHaveText('Just a moment — reconnecting.');
    for (const l of [r.stepOut, r.next, r.handle]) {
      const b = await box(l);
      expect(b.y, 'top').toBeGreaterThanOrEqual(0);
      expect(b.y + b.height, 'bottom').toBeLessThanOrEqual(422.5);
    }
    const area = await box(r.screen.getByTestId('go-values-area'));
    expect(area.height).toBeLessThanOrEqual(64.5);
    const n = await box(r.note);
    expect(Math.min(n.width, n.height)).toBeGreaterThanOrEqual(80);
    await setVisibility(page, 'visible');
  });
});
