/**
 * P-115 (the owner, 2026-11-28: "all changes to a routine are final, and there's no confirmation or save step to ensure
 * that you don't accidentally change something, like drag a step out of place"; answered "Edit, then Save/Cancel" and
 * "Kept as a draft"). Plan opens read-only (a run can still open it); Edit starts a draft; every Plan change goes into it,
 * with Undo inside it; Save writes it as one change (one Undo after); Cancel discards it; a run and home keep reading the
 * saved routine until Save; the draft is stored (reload and export keep it) and Plan reopens in Edit with it; a draft of a
 * routine changed elsewhere says so rather than overwriting. At 390 × 844 and at 195 × 422 (a 390 px phone at 200 %).
 * Expected values come from the roadmap's Done when, the owner's words and DESIGN.md.
 */
import { AxeBuilder } from '@axe-core/playwright';
import { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { arrived, drag, editPlan, expectSteps, exported, home, pauseRun, plan, planFromRoutines, RoutineSpec, routines, runner, saved, savePlan, startGo, startThing, undoEdit } from './goFixture';

const MORNING: RoutineSpec = { id: 'morning', name: 'Morning pages', steps: ['Brew coffee', 'Write three pages', 'Read them back'] };
const STEPS = ['Brew coffee', 'Write three pages', 'Read them back'];
const MOVED = ['Brew coffee', 'Read them back', 'Write three pages'];
const grip = (page: Page, words: string) => plan(page).screen.getByRole('button', { name: `Reorder ${words}`, exact: true });
const storedSteps = async (page: Page) => {
  const r = (await exported(page)).routines.morning;
  return { steps: (r.items ?? []).map((i) => i.text), draft: 'draft' in r };
};

async function noSerious(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  expect(serious, serious.join('\n')).toEqual([]);
}
/** A full target, inside the window. */
async function fullTarget(page: Page, l: ReturnType<Page['locator']>) {
  const b = (await l.boundingBox())!;
  const size = page.viewportSize()!;
  expect(b.width).toBeGreaterThanOrEqual(48);
  expect(b.height).toBeGreaterThanOrEqual(48);
  expect(b.x).toBeGreaterThanOrEqual(0);
  expect(b.x + b.width).toBeLessThanOrEqual(size.width + 0.5);
}

for (const size of [
  { width: 390, height: 844, name: '390 × 844' },
  { width: 195, height: 422, name: '195 × 422 (200 %)' },
]) {
  test.describe(`at ${size.name}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });
    const narrow = size.width < 340;

    test('Plan opens read-only: no grips, no Add row, no step ···; a routine used as a step still opens and closes; Edit is the left side door', async ({ page }) => {
      await startGo(page, [], 'home', [MORNING, { id: 'notes', name: 'Notes', steps: ['Open the notebook', { routine: 'morning' }] }]);
      await planFromRoutines(page, 'Notes');
      const p = plan(page);
      await expect(p.edit).toBeVisible();
      await expect(p.edit).toHaveAccessibleName('Edit Notes');
      await fullTarget(page, p.edit);
      const doors = p.doors.boundingBox();
      const edit = (await p.edit.boundingBox())!;
      expect(edit.x).toBeLessThan((await doors)!.x + 40);
      await expect(p.screen.getByTestId('go-plan-grip')).toHaveCount(0);
      await expect(p.add).toHaveCount(0);
      await expect(p.screen.getByRole('button', { name: /^More for Open the notebook$/ })).toHaveCount(0);
      await expect(p.save).toHaveCount(0);
      await expect(p.cancel).toHaveCount(0);
      // Disclosure still works: the routine used as a step opens in place, and closes.
      const chevron = p.screen.getByRole('button', { name: /Morning pages/ }).first();
      await chevron.click();
      await expectSteps(page, ['Open the notebook', 'Morning pages', ...STEPS]);
      await chevron.click();
      await expectSteps(page, ['Open the notebook', 'Morning pages']);
      await noSerious(page);
    });

    test('the owner’s case — an accidental drag (or move), then Cancel: nothing changed, nothing stored; the focus goes into Edit and back out', async ({ page }) => {
      await startGo(page, [], 'home', [MORNING]);
      await planFromRoutines(page, 'Morning pages');
      const p = plan(page);
      await p.edit.click();
      // Entering Edit: the focus is on the heading, and it is said.
      await expect(p.title).toBeFocused();
      await expect(p.screen.getByTestId('go-plan-said-editing')).toHaveText('Editing Morning pages');
      // Edit is the left side door; in Edit, Cancel is in its place.
      await expect(p.edit).toHaveCount(0);
      await expect(p.save).toHaveText('Save');
      await expect(p.cancel).toHaveText('Cancel');
      await fullTarget(page, p.save);
      await fullTarget(page, p.cancel);
      await noSerious(page);
      if (narrow) {
        // Too narrow for a grip: the step's menu has the moves — one moved down by mistake.
        await p.more('Write three pages').click();
        await (await arrived(page, 'go-plan-menu')).getByRole('menuitem', { name: 'Move down', exact: true }).click();
      } else {
        // A drag on the grip, by mistake: "Read them back" lands above "Write three pages".
        const row = (await p.row('Write three pages').boundingBox())!;
        await drag(page, grip(page, 'Read them back'), row.y - (await grip(page, 'Read them back').boundingBox())!.y - row.height * 0.25);
      }
      await expectSteps(page, MOVED);
      // Cancel holds a change: red, as a discard is — and done at once, with an Undo (no confirm).
      await expect(p.cancel.getByText('Cancel', { exact: true })).toHaveCSS('color', 'rgb(255, 138, 122)');
      await p.cancel.click();
      await expectSteps(page, STEPS);
      await expect(p.notice).toContainText('Discarded changes to “Morning pages”');
      await expect(p.edit).toBeFocused();
      await expect(p.screen.getByTestId('go-plan-grip')).toHaveCount(0);
      await saved(page);
      expect(await storedSteps(page)).toEqual({ steps: STEPS, draft: false });
    });

    test('Cancel’s Undo brings the draft back (in Edit); Cancel with nothing changed says nothing', async ({ page }) => {
      await startGo(page, [], 'home', [MORNING]);
      await planFromRoutines(page, 'Morning pages');
      const p = plan(page);
      await editPlan(page);
      await expect(p.cancel.getByText('Cancel', { exact: true })).not.toHaveCSS('color', 'rgb(255, 138, 122)');
      await p.cancel.click();
      await expect(p.edit).toBeVisible();
      await expect(page.getByTestId('go-notice')).toHaveCount(0);
      await editPlan(page);
      await p.add.fill('Underline one line');
      await p.add.press('Enter');
      await expectSteps(page, [...STEPS, 'Underline one line']);
      await p.cancel.click();
      await expectSteps(page, STEPS);
      await p.undo.click();
      await expect(p.save).toBeVisible();
      await expectSteps(page, [...STEPS, 'Underline one line']);
    });

    test('Save writes the draft as one change — "Saved “Morning pages”" with one Undo; Undo inside the draft goes back step by step', async ({ page }) => {
      await startGo(page, [], 'home', [MORNING]);
      await planFromRoutines(page, 'Morning pages');
      const p = plan(page);
      await editPlan(page);
      await p.add.fill('Underline one line');
      await p.add.press('Enter');
      await p.add.fill('Close the notebook');
      await p.add.press('Enter');
      // Undo inside the draft, step by step (the routine's menu, as every Plan edit's).
      await undoEdit(page);
      await expectSteps(page, [...STEPS, 'Underline one line']);
      await p.screen.getByTestId('go-plan-more').click();
      await expect((await arrived(page, 'go-plan-routine')).getByTestId('go-plan-undo')).toContainText('Undo added “Underline one line”');
      await page.keyboard.press('Escape');
      await p.add.fill('Close the notebook');
      await p.add.press('Enter');
      await savePlan(page);
      await expect(p.notice).toContainText('Saved “Morning pages”');
      await expect(p.edit).toBeFocused();
      await expectSteps(page, [...STEPS, 'Underline one line', 'Close the notebook']);
      // One Undo takes the whole Save back: the saved steps as they were, and the draft (Plan in Edit again).
      await p.undo.click();
      await expect(p.save).toBeVisible();
      await expectSteps(page, [...STEPS, 'Underline one line', 'Close the notebook']);
      await saved(page);
      expect(await storedSteps(page)).toEqual({ steps: STEPS, draft: true });
    });

    test('a run and home keep reading the saved routine until Save; leaving keeps the draft, and Plan reopens in Edit with it (a reload too)', async ({ page }) => {
      await startGo(page, [{ id: 'r1', routine: 'morning', at: 1, status: 'running' }], 'runner', [MORNING]);
      const r = runner(page);
      await expect(r.words).toHaveText('Write three pages');
      await r.plan.click();
      const p = plan(page);
      // A run can still open it — read-only, Resume the filled button.
      await expect(p.edit).toBeVisible();
      await expect(p.forward).toHaveText('Resume at Write three pages');
      await editPlan(page);
      await p.more('Write three pages').click();
      await (await arrived(page, 'go-plan-menu')).getByRole('menuitem', { name: 'Remove', exact: true }).click();
      await expectSteps(page, ['Brew coffee', 'Read them back']);
      // Back to the run: it is where it was, on the saved step.
      await p.back.click();
      await expect(r.words).toHaveText('Write three pages');
      await pauseRun(page);
      await expect(home(page).screen).toContainText('Write three pages');
      // Reloaded and opened again: Edit, with the draft.
      await page.reload();
      await expect(home(page).screen).toBeVisible();
      await page.goto('./go/run/r1/plan');
      await expect(p.save).toBeVisible();
      await expectSteps(page, ['Brew coffee', 'Read them back']);
      await savePlan(page);
      await expect(p.forward).toHaveText('Resume at Read them back');
      await p.forward.click();
      await expect(r.words).toHaveText('Read them back');
    });

    test('+ New opens straight into Edit; Start comes after Save', async ({ page }) => {
      await startGo(page, [], 'home', [MORNING]);
      await startThing(page, 'Evening pages');
      const p = plan(page);
      await expect(p.save).toBeVisible();
      await expect(p.forward).toHaveCount(0);
      await p.add.fill('Write one page');
      await p.add.press('Enter');
      await savePlan(page);
      await expect(p.forward).toHaveText('Start');
    });

    test('a draft of a routine changed elsewhere since (Tags… on My routines): Save says so and writes nothing; Save anyway keeps both', async ({ page }) => {
      await startGo(page, [], 'home', [MORNING]);
      await planFromRoutines(page, 'Morning pages');
      const p = plan(page);
      await editPlan(page);
      await p.add.fill('Underline one line');
      await p.add.press('Enter');
      // Elsewhere: My routines' row ··· → Tags… (straight to the saved routine).
      await p.toRoutines.click();
      const list = routines(page);
      await expect(list.screen).toBeVisible();
      await list.more('Morning pages').click();
      await (await arrived(page, 'go-routine-menu')).getByTestId('go-routine-tags').click();
      const sheet = await arrived(page, 'go-tags-sheet');
      await sheet.getByTestId('go-tags-field').fill('daily');
      await sheet.getByTestId('go-tags-keep').click();
      await list.row('Morning pages').getByTestId('go-routine-body').click();
      await expect(p.save).toBeVisible();
      await p.save.click();
      const ask = page.getByTestId('go-plan-conflict');
      await expect(ask).toContainText('“Morning pages” was changed elsewhere');
      // The one confirm: Cancel filled and first, with the focus; nothing written.
      await expect(ask.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
      await ask.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(ask).toHaveCount(0);
      await expect(p.save).toBeVisible();
      await saved(page);
      await p.save.click();
      await page.getByTestId('go-plan-save-anyway').click();
      await expect(p.edit).toBeVisible();
      await expectSteps(page, [...STEPS, 'Underline one line']);
      await expect(p.tags).toHaveText('#daily');
      await saved(page);
      expect(await storedSteps(page)).toEqual({ steps: [...STEPS, 'Underline one line'], draft: false });
    });
  });
}
