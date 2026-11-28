/**
 * P-100 (owner, 2026-11-27: "The home view should really be a queue. Any ongoing runs would be the queue itself. And
 * the new would be enqueue"; answered "One queue"): home is one ordered list with no sections. Each run going is a row
 * — its routine, its step (the deepest level it is in), where it sits; a paused run its note, a waiting run what it
 * waits for. The top row is what the one filled Resume resumes. + New's run goes to the bottom; a run that finishes
 * leaves the list; rows reorder by drag and by keyboard (···: Move up, Move down, To the top), each with Undo; the order
 * survives a reload and Export → Import. Every line at 390×844 and at 200 % text (195×422).
 *
 * (Storage paths below the page — the journal, the fallback, hand-over — are in src/storage/persistence.test.ts and
 * src/storage/goldenP100.test.ts.)
 */
import { AxeBuilder } from '@axe-core/playwright';
import { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { addStep, arrived, drag, exported, home, importBackup, MAYA, pauseRun, plan, RoutineSpec, runner, RunSpec, saved, startGo, tile, savePlan } from './goFixture';

const PAPER = 'rgb(244, 241, 232)';

const ROUTINES: RoutineSpec[] = [...MAYA, { id: 'tea', name: 'Make tea', steps: ['Pour'] }];
/** Oldest started first: Make tea, Apply to Initech (paused with a note), Apply to Acme (waiting), Practise drawing (two levels deep). */
const RUNS: RunSpec[] = [
  { id: 't', routine: 'tea', at: 0, startedDaysAgo: 5 },
  { id: 'r1', routine: 'apply', at: 1, startedDaysAgo: 4, reason: 'need the job ad open' },
  { id: 'r2', routine: 'apply-acme', at: 1, startedDaysAgo: 3, waitingDaysAgo: 2 },
  { id: 'r3', routine: 'drawing', at: 1, inner: [{ routine: 'hands', at: 0 }], startedDaysAgo: 2, status: 'paused' },
];

async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = serious.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => `${n.target.join(' ')} ${n.html.slice(0, 200)}`).slice(0, 5).join('\n  ')}`);
  expect(report, report.join('\n')).toEqual([]);
}

/** Every control at least 48×48 and inside the window; every text at least 16 px; the filled buttons; nothing sideways. */
async function rules(scope: Locator) {
  return scope.evaluate((root, paper) => {
    const shown = (e: Element) => {
      const b = e.getBoundingClientRect();
      return b.width > 0 && b.height > 0 && !e.closest('[inert]');
    };
    const controls = [...root.querySelectorAll('button, [role="button"], [role="menuitem"], input, textarea')].filter((e) => shown(e) && !e.hasAttribute('data-sr-close'));
    const name = (e: Element) => e.getAttribute('aria-label') || (e as HTMLElement).innerText || '';
    const small = controls.filter((e) => e.getBoundingClientRect().width < 47.5 || e.getBoundingClientRect().height < 47.5).map(name);
    const outside = controls.filter((e) => e.getBoundingClientRect().left < -0.5 || e.getBoundingClientRect().right > innerWidth + 0.5).map(name);
    const texts = [...root.querySelectorAll('*')].filter((e) => shown(e) && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()));
    const tiny = texts.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => e.textContent!.slice(0, 30));
    const filled = controls.filter((e) => getComputedStyle(e).backgroundColor === paper).map(name);
    return { small, outside, tiny, filled, sideways: document.documentElement.scrollWidth > innerWidth };
  }, PAPER);
}

/** The rows' routines, top first. */
const order = (page: Page) => home(page).tiles.evaluateAll((els) => els.map((e) => e.getAttribute('data-routine')));
/** The rows, once home shows them so (a move re-renders; a reload settles). */
const expectOrder = (page: Page, want: string[]) => expect.poll(() => order(page)).toEqual(want);
const resume = (page: Page) => home(page).screen.getByTestId('go-resume');

/** A row's ··· opened and one of its items chosen — by keyboard (focus, Enter; the item, Enter). */
async function rowMenu(page: Page, name: string, item: string) {
  await tile(page, name).getByTestId('go-tile-more').focus();
  await page.keyboard.press('Enter');
  const menu = await arrived(page, 'go-tile-menu');
  await menu.getByRole('menuitem', { name: `${item}: ${name}`, exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('go-tile-menu')).toHaveCount(0);
}

for (const size of [
  { name: '390×844', width: 390, height: 844 },
  { name: '200 % text (195×422)', width: 195, height: 422 },
]) {
  test.describe(`at ${size.name}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
    });

    test('one list, no sections: each run a row with its routine, its step and where it sits; a paused run its note, a waiting run what it waits for; the top row is the filled Resume', async ({ page }) => {
      await startGo(page, RUNS, 'home', ROUTINES);
      const h = home(page);
      await expectOrder(page, ['tea', 'apply', 'apply-acme', 'drawing']);
      // No headings but the screen's own (for a screen reader), and no group.
      await expect(h.screen.getByRole('heading')).toHaveCount(1);
      await expect(h.screen.getByRole('list')).toHaveCount(1);
      await expect(h.screen.getByRole('listitem')).toHaveCount(4);
      await expect(h.screen.getByTestId('go-home-group')).toHaveCount(0);
      // Its routine, its step; where it sits once it is deeper than its first level.
      const draw = tile(page, 'Practise drawing');
      await expect(draw.getByTestId('go-tile-line')).toHaveText('at Find a reference photo');
      await expect(draw.getByTestId('go-tile-path')).toHaveText('Practise drawing › Hand studies of my left hand');
      await expect(draw).toHaveAccessibleName(/Practise drawing › Hand studies of my left hand/);
      await expect(tile(page, 'Make tea').getByTestId('go-tile-path')).toHaveCount(0);
      await expect(tile(page, 'Apply to Initech').getByTestId('go-tile-reason')).toHaveText('need the job ad open');
      await expect(tile(page, 'Apply to Acme').getByTestId('go-tile-line')).toHaveText(/^waiting for a reply from Acme/);
      await expect(tile(page, 'Apply to Acme')).toHaveAttribute('data-state', 'waiting');
      // The top row: the one filled button says its step; it opens the runner there.
      await expect(h.tiles.first()).toHaveAttribute('data-first', 'true');
      await expect(resume(page)).toHaveText('Resume Pour');
      await expect(resume(page)).toHaveAccessibleName('Resume Pour');
      const r = await rules(h.screen);
      expect(r.small, 'targets under 48 px').toEqual([]);
      expect(r.outside, 'controls outside the window').toEqual([]);
      expect(r.tiny, 'text under 16 px').toEqual([]);
      expect(r.filled, 'filled buttons').toEqual(['Resume Pour']);
      expect(r.sideways, 'nothing scrolls sideways').toBe(false);
      await expectNoSeriousViolations(page);
      await resume(page).scrollIntoViewIfNeeded();
      await resume(page).click();
      await expect(runner(page).words).toHaveText('Pour');
    });

    test('by keyboard: ··· Move up, Move down, To the top — each said, with Undo; the filled Resume follows the top row; the order is there after a reload', async ({ page }) => {
      await startGo(page, RUNS, 'home', ROUTINES);
      const h = home(page);
      // The top row cannot go up; the last cannot go down; To the top from the third row on.
      await tile(page, 'Make tea').getByTestId('go-tile-more').click();
      let menu = await arrived(page, 'go-tile-menu');
      await expect(menu.getByTestId('go-tile-up')).toHaveCount(0);
      await expect(menu.getByTestId('go-tile-top')).toHaveCount(0);
      await expect(menu.getByTestId('go-tile-down')).toHaveCount(1);
      await page.keyboard.press('Escape');
      await tile(page, 'Practise drawing').getByTestId('go-tile-more').click();
      menu = await arrived(page, 'go-tile-menu');
      await expect(menu.getByTestId('go-tile-down')).toHaveCount(0);
      await expect(menu.getByTestId('go-tile-top')).toHaveCount(1);
      await page.keyboard.press('Escape');

      await rowMenu(page, 'Apply to Acme', 'Move up');
      await expectOrder(page, ['tea', 'apply-acme', 'apply', 'drawing']);
      await expect(h.notice).toContainText('Moved “Apply to Acme” up');
      await h.notice.getByTestId('go-notice-undo').click();
      await expectOrder(page, ['tea', 'apply', 'apply-acme', 'drawing']);

      await rowMenu(page, 'Practise drawing', 'To the top');
      await expectOrder(page, ['drawing', 'tea', 'apply', 'apply-acme']);
      await expect(h.notice).toContainText('Moved “Practise drawing” to the top');
      await expect(resume(page)).toHaveText('Resume Find a reference photo');

      await rowMenu(page, 'Make tea', 'Move down');
      await expectOrder(page, ['drawing', 'apply', 'tea', 'apply-acme']);
      await expect(h.notice).toContainText('Moved “Make tea” down');
      // Ctrl+Z takes it back too.
      await page.keyboard.press('Control+z');
      await expectOrder(page, ['drawing', 'tea', 'apply', 'apply-acme']);

      await saved(page);
      await page.reload();
      await expectOrder(page, ['drawing', 'tea', 'apply', 'apply-acme']);
      await expect(resume(page)).toHaveText('Resume Find a reference photo');
    });

    test('+ New adds its run at the bottom — after a reorder too; a run that finishes leaves the list and the next row is the filled Resume', async ({ page }) => {
      await startGo(page, RUNS, 'home', ROUTINES);
      const h = home(page);
      await rowMenu(page, 'Practise drawing', 'To the top');
      // + New: the routine, its first step, Start — then Pause: home, its row at the bottom.
      await h.newBtn.click();
      const sheet = await arrived(page, 'go-new-sheet');
      await sheet.getByTestId('go-new-name').fill('Water the plants');
      await sheet.getByTestId('go-new-plan').click();
      await expect(plan(page).title).toHaveText('Water the plants');
      await addStep(page, 'Fill the can');
      await savePlan(page); // (P-115, rewritten: saved first — a run, home and the backup read the saved routine.)
      await plan(page).forward.click();
      await expect(runner(page).words).toHaveText('Fill the can');
      await pauseRun(page);
      await expect(h.tiles).toHaveCount(5);
      await expect(h.tiles.last()).toContainText('Water the plants');
      await expect.poll(async () => (await order(page)).slice(0, 4)).toEqual(['drawing', 'tea', 'apply', 'apply-acme']);
      // Finishing: Make tea to the top, resumed by the filled button, Done — its row is gone.
      await rowMenu(page, 'Make tea', 'Move up');
      await expect(resume(page)).toHaveText('Resume Pour');
      await resume(page).scrollIntoViewIfNeeded();
      await resume(page).click();
      await expect(runner(page).next).toHaveText('Done');
      await runner(page).next.click();
      await expect(h.notice).toContainText('Done with Make tea');
      await expect(tile(page, 'Make tea')).toHaveCount(0);
      await expect.poll(async () => (await order(page)).slice(0, 3)).toEqual(['drawing', 'apply', 'apply-acme']);
      await expect(resume(page)).toHaveText('Resume Find a reference photo');
    });

    test('Export → Import: the order goes out with the backup and comes back as it was', async ({ page }) => {
      await startGo(page, RUNS, 'home', ROUTINES);
      await rowMenu(page, 'Apply to Acme', 'To the top');
      // A waiting row on top: the filled Resume names its routine (a wait's words are not a step to do).
      await expect(resume(page)).toHaveText('Resume Apply to Acme');
      await rowMenu(page, 'Make tea', 'Move down');
      const want = ['apply-acme', 'apply', 'tea', 'drawing'];
      await expectOrder(page, want);
      await saved(page);
      const data = await exported(page);
      expect(Object.values(data.runs).filter((r) => typeof (r as { queue?: unknown }).queue === 'number')).toHaveLength(4);
      await startGo(page, RUNS, 'home', ROUTINES);
      await expectOrder(page, ['tea', 'apply', 'apply-acme', 'drawing']);
      await importBackup(page, JSON.stringify({ app: 'wanderment', exportedAt: new Date().toISOString(), data }));
      await page.goto('./go');
      await expectOrder(page, want);
    });

    if (size.width >= 340) {
      test('by drag: the grip carries a row past others (a line shows where it goes); one Undo puts it back', async ({ page }) => {
        await startGo(page, RUNS, 'home', ROUTINES);
        const h = home(page);
        const grip = tile(page, 'Apply to Acme').getByTestId('go-tile-grip');
        await expect(grip.getByRole('button')).toHaveAccessibleName('Reorder Apply to Acme');
        // Up onto the top half of the first row: past two rows, to the top.
        const from = (await grip.boundingBox())!;
        const first = (await h.tiles.first().boundingBox())!;
        await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
        await page.mouse.down();
        await page.mouse.move(from.x + from.width / 2, first.y + first.height * 0.25, { steps: 12 });
        // While dragging: the row is marked (it stays in place), a line shows where it goes, nothing has moved yet.
        await expect(tile(page, 'Apply to Acme')).toHaveAttribute('data-dragging', 'true');
        await expect(h.screen.getByTestId('go-queue-drop')).toBeVisible();
        await expectOrder(page, ['tea', 'apply', 'apply-acme', 'drawing']);
        await page.mouse.up();
        await expectOrder(page, ['apply-acme', 'tea', 'apply', 'drawing']);
        await expect(h.screen.getByTestId('go-queue-drop')).toHaveCount(0);
        await expect(h.notice).toContainText('Moved “Apply to Acme” up');
        await expect(resume(page)).toHaveText(/^Resume /);
        await h.notice.getByTestId('go-notice-undo').click();
        await expectOrder(page, ['tea', 'apply', 'apply-acme', 'drawing']);
        // A twitch is no move.
        await drag(page, tile(page, 'Make tea').getByTestId('go-tile-grip'), 4);
        await expectOrder(page, ['tea', 'apply', 'apply-acme', 'drawing']);
      });
    } else {
      test('too narrow for a grip: the moves are on the row’s ···', async ({ page }) => {
        await startGo(page, RUNS, 'home', ROUTINES);
        await expect(home(page).screen.getByTestId('go-tile-grip')).toHaveCount(0);
        await rowMenu(page, 'Practise drawing', 'Move up');
        await expectOrder(page, ['tea', 'apply', 'drawing', 'apply-acme']);
      });
    }
  });
}
