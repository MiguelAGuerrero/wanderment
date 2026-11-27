/**
 * P-107: For each over a list given above. The owner's case throughout (2026-11-27, real use: "For each concern,
 * @{concerns}research" typed as words): "Improve my workout routine" — "List out my doubts" gives {concerns}; for
 * each concern, "Research" (a routine: reads {concern}, gives {findings}); then "Decide using {findings}".
 * Add's "For each…" makes the block from a sentence ("concern in {concerns}"); its first step is typed (or "@"
 * picked) inside it at once; Undo takes it back. Running: the giving step's field is a list (one row per item, + Add
 * another, Return opens the next row, several pasted lines offer to split); inside, the values row reads "concern 2
 * of 3: time" and the item reads in the steps and goes to the call; what each item gave is collected after the block;
 * Step out leaves the loop with Undo; an empty list passes straight through. At 390×844 and at 200 % text (195×422).
 */
import { AxeBuilder } from '@axe-core/playwright';
import { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { exported, goBackup, importBackup, openGo, plan, planMove, RoutineSpec, RunSpec, runner, settled, typeValue } from './goFixture';

const SHOTS = '.polish/current/P-107/shots';
const PAPER = 'rgb(244, 241, 232)';

const RESEARCH: RoutineSpec = { id: 'research', name: 'Research', home: false, steps: ['Look into {concern}', { text: 'Note what I found', gives: 'findings' }] };
const IMPROVE: RoutineSpec = { id: 'improve', name: 'Improve my workout routine', steps: [{ text: 'List out my doubts', gives: 'concerns' }, 'Decide using {findings}'] };
/** Improve with the block already made: for each concern, Research. */
const LOOPED: RoutineSpec = { ...IMPROVE, steps: [{ text: 'List out my doubts', gives: 'concerns' }, { routine: 'each' }, 'Decide using {findings}'] };
const BLOCK: RoutineSpec = { id: 'each', name: 'For each concern in {concerns}', home: false, steps: [{ routine: 'research' }] };

/** The backup with the block stored as P-107 stores it: an unnamed sequence carrying `each`. */
function withBlock(routines: RoutineSpec[], runs: RunSpec[] = []): string {
  const file = JSON.parse(goBackup(routines, runs));
  const b = file.data.routines.each;
  if (b) {
    b.named = false;
    b.each = { item: 'concern', list: 'concerns' };
    delete b.home;
    delete b.open;
  }
  return JSON.stringify(file);
}
async function seed(page: Page, runs: RunSpec[] = [], routines: RoutineSpec[] = [LOOPED, BLOCK, RESEARCH]) {
  await importBackup(page, withBlock(routines, runs));
}
async function sheet(page: Page, testId: string): Promise<Locator> {
  const s = page.getByTestId(testId);
  await expect(s).toHaveAttribute('data-moving', 'false');
  return s;
}
const planOf = async (page: Page, id: string) => {
  await page.goto(`./go/routine/${id}`);
  await expect(settled(page, 'plan')).toBeVisible();
  return plan(page);
};

async function noSerious(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}
/** Targets ≥ 48 px inside the window, text ≥ 16 px and never cut, every control named (with its visible words), at most one filled button. */
async function rules(page: Page, scope: Locator) {
  const found = await scope.evaluate((root, paper) => {
    const shown = (e: Element) => {
      const b = e.getBoundingClientRect();
      return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[inert]');
    };
    const controls = [...root.querySelectorAll('button, [role="button"], [role="menuitem"], input, textarea')].filter((e) => shown(e) && !e.hasAttribute('data-sr-close'));
    const name = (e: Element) => e.getAttribute('aria-label') || (e as HTMLElement).innerText || (e as HTMLInputElement).placeholder || '';
    const texts = [...root.querySelectorAll('*')].filter((e) => shown(e) && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()));
    // (Screen-reader-only words — a 1-px clipped box — are not shown, so they can't be cut.)
    const seen = texts.filter((e) => e.getBoundingClientRect().width > 2);
    return {
      small: controls.filter((e) => { const b = e.getBoundingClientRect(); return b.width < 47.5 || b.height < 47.5; }).map(name),
      outside: controls.filter((e) => { const b = e.getBoundingClientRect(); return b.left < -0.5 || b.right > innerWidth + 0.5; }).map(name),
      unnamed: controls.filter((e) => !name(e).trim()).length,
      tiny: texts.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => e.textContent!.slice(0, 30)),
      cut: seen.filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible').map((e) => e.textContent!.slice(0, 30)),
      past: seen.filter((e) => e.getBoundingClientRect().right > innerWidth + 0.5).map((e) => e.textContent!.slice(0, 30)),
      filled: controls.filter((e) => getComputedStyle(e).backgroundColor === paper && e.getAttribute('aria-disabled') !== 'true').map(name),
      label: controls.filter((e) => { const l = e.getAttribute('aria-label'); const v = ((e as HTMLElement).innerText ?? '').trim().replace(/\s+/g, ' '); return !!l && !!v && !['INPUT', 'TEXTAREA'].includes(e.tagName) && !l.toLowerCase().includes(v.toLowerCase()); }).map(name),
    };
  }, PAPER);
  expect(found.small, 'targets under 48 px').toEqual([]);
  expect(found.outside, 'controls outside the window').toEqual([]);
  expect(found.unnamed, 'unnamed controls').toBe(0);
  expect(found.tiny, 'text under 16 px').toEqual([]);
  expect(found.cut, 'words cut').toEqual([]);
  expect(found.past, 'words past the window').toEqual([]);
  expect(found.filled.length, `filled: ${found.filled.join(', ')}`).toBeLessThanOrEqual(1);
  expect(found.label, 'names that leave out the visible words').toEqual([]);
}

/** The list sheet's rows' fields. */
const listFields = (s: Locator) => s.getByTestId('go-list-field');

for (const [label, size] of [
  ['390×844', { width: 390, height: 844 }],
  ['200 % text (195×422)', { width: 195, height: 422 }],
] as const) {
  test.describe(`at ${label}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(size);
    });

    test('Plan: Add’s “For each…” lists “concern in {concerns}”; a tap makes the block, its first step typed inside — “@” picks Research; Undo takes the block back', async ({ page }) => {
      await importBackup(page, goBackup([IMPROVE, RESEARCH]));
      const p = await planOf(page, 'improve');
      await p.screen.getByTestId('go-plan-add-each').click();
      const pick = await sheet(page, 'go-each-sheet');
      await expect(pick.getByRole('heading', { level: 2 })).toHaveText('For each…');
      await expect(pick.getByTestId('go-each-sheet-row')).toHaveText(['concern in {concerns}']);
      await noSerious(page);
      await rules(page, pick);
      if (size.width > 300) await page.screenshot({ path: `${SHOTS}/for-each-sheet.png` });
      await pick.getByRole('button', { name: 'For each concern in {concerns}', exact: true }).click();
      await expect(page.getByTestId('go-each-sheet')).toHaveCount(0);
      // Made at the end; its first step is typed inside it at once (the field has the focus).
      await expect(p.words).toHaveText(['List out my doubts', 'Decide using asks {findings}', 'For each concern in {concerns}']);
      await expect(p.typed).toBeFocused();
      await expect(p.typed).toHaveAccessibleName('Add a step inside For each concern in {concerns}');
      // The names bar offers the item inside it.
      await expect(p.names.filter({ hasText: 'concern' }).first()).toBeVisible();
      await p.typed.pressSequentially('@Res');
      await expect(p.screen.getByTestId('go-names-routine')).toHaveText(['Research']);
      await p.typed.press('Enter');
      await expect(p.words).toHaveText(['List out my doubts', 'Decide using asks {findings}', 'For each concern in {concerns}', 'Research']);
      // The call inside takes the item by its name.
      await expect(p.row('Research').getByTestId('go-plan-input')).toHaveText(['with {concern}']);
      await page.keyboard.press('Escape');
      await expect(p.typed).toHaveCount(0);
      // Moved above Decide: what each concern gave is given above it (no "asks").
      await planMove(page, 'For each concern in {concerns}', 'up');
      await expect(p.words).toHaveText(['List out my doubts', 'For each concern in {concerns}', 'Research', 'Decide using {findings}']);
      await expect(p.row('For each concern in {concerns}').getByTestId('go-plan-hoisted')).toHaveText('gives {findings}');
      await noSerious(page);
      await rules(page, p.screen);
      if (size.width > 300) await page.screenshot({ path: `${SHOTS}/plan-block.png` });
      else await page.screenshot({ path: `${SHOTS}/plan-block-200.png` });

      // The block's ···: Add a step inside · Add a step after · Remove (no Edit: its words are the sentence).
      await p.more('For each concern in {concerns}').click();
      const menu = await sheet(page, 'go-plan-menu');
      await expect(menu.locator('[role="menuitem"]:not([data-sr-close])')).toHaveText(size.width < 340 ? ['Add a step inside', 'Add a step after', 'Move up', 'Move down', 'Remove'] : ['Add a step inside', 'Add a step after', 'Remove']);
      await menu.getByRole('menuitem', { name: /^Add a step inside/ }).click();
      await expect(p.typed).toBeFocused();
      await p.typed.fill('Note one thing to try');
      await p.typed.press('Enter');
      await expect(p.words).toHaveText(['List out my doubts', 'For each concern in {concerns}', 'Research', 'Note one thing to try', 'Decide using {findings}']);
      await page.keyboard.press('Escape');

      // Kept: after a reload, and in the export, in the shape an older build reads as a step broken down.
      await page.reload();
      await expect(plan(page).words).toHaveText(['List out my doubts', 'For each concern in {concerns}', 'Research', 'Note one thing to try', 'Decide using {findings}']);
      const data = await exported(page);
      const row = data.routines.improve.items![1] as { id: string; ref: string };
      expect(Object.keys(row).sort()).toEqual(['id', 'ref']);
      expect(data.routines[row.ref]).toMatchObject({ named: false, words: 'For each concern in {concerns}', each: { item: 'concern', list: 'concerns' } });

      // Undo: a block just made goes with the routine menu's Undo.
      const q = await planOf(page, 'improve');
      await q.screen.getByTestId('go-plan-add-each').click();
      await (await sheet(page, 'go-each-sheet')).getByRole('button', { name: 'For each concern in {concerns}', exact: true }).click();
      await expect(q.words).toHaveCount(6);
      await page.keyboard.press('Escape');
      await q.screen.getByTestId('go-plan-more').click();
      const routineMenu = await sheet(page, 'go-plan-routine');
      await expect(routineMenu.getByTestId('go-plan-undo')).toHaveText('Undo added “For each concern in {concerns}”');
      await routineMenu.getByTestId('go-plan-undo').click();
      await expect(q.words).toHaveText(['List out my doubts', 'For each concern in {concerns}', 'Research', 'Note one thing to try', 'Decide using {findings}']);
    });

    test('running: the doubts as a list (rows, Return, a paste split); inside, “concern 1 of 3: form” goes to Research; each concern’s findings are collected for Decide; Step out with Undo; kept across a reload', async ({ page }) => {
      await seed(page, [{ id: 'r1', routine: 'improve', at: 0, status: 'running' }]);
      await openGo(page, 'runner');
      const r = runner(page);
      await expect(r.words).toHaveText('List out my doubts');
      await r.field('concerns').click();
      const list = await sheet(page, 'go-list-sheet');
      await expect(list.getByRole('heading', { level: 2 })).toHaveText('concerns');
      const fields = listFields(list);
      await expect(fields).toHaveCount(1);
      await expect(fields.nth(0)).toBeFocused();
      await fields.nth(0).fill('form');
      // Return opens the next row, with the focus.
      await fields.nth(0).press('Enter');
      await expect(fields).toHaveCount(2);
      await expect(fields.nth(1)).toBeFocused();
      await fields.nth(1).fill('time');
      await list.getByTestId('go-list-add').click();
      await expect(fields).toHaveCount(3);
      await expect(fields.nth(2)).toBeFocused();
      // Several lines pasted into a row: offered to split — never split by itself, never at commas.
      await fields.nth(2).fill('rest days, mostly\nsleep\nwarm-up');
      await expect(list.getByTestId('go-list-split')).toHaveText('Split into 3 rows');
      await expect(list.getByTestId('go-list-one')).toHaveText('Keep as one');
      await noSerious(page);
      await rules(page, list);
      if (size.width > 300) await page.screenshot({ path: `${SHOTS}/list-paste.png` });
      else await page.screenshot({ path: `${SHOTS}/list-paste-200.png` });
      await list.getByTestId('go-list-split').click();
      await expect(fields).toHaveCount(5);
      await expect(fields).toHaveText(['form', 'time', 'rest days, mostly', 'sleep', 'warm-up']);
      await list.getByRole('button', { name: 'Remove sleep', exact: true }).click();
      await list.getByRole('button', { name: 'Remove warm-up', exact: true }).click();
      await expect(fields).toHaveText(['form', 'time', 'rest days, mostly']);
      await list.getByTestId('go-list-keep').click();
      await expect(page.getByTestId('go-list-sheet')).toHaveCount(0);
      await expect(r.field('concerns')).toContainText('form, time and rest days, mostly');

      // Next: into the block, on its first item.
      await r.next.click();
      await expect(r.words).toHaveText('Research');
      await expect(r.context).toContainText('For each concern');
      await expect(r.values).toHaveText(['concerns: form, time and rest days, mostly', 'concern 1 of 3: form']);
      await noSerious(page);
      await rules(page, r.screen);
      if (size.width > 300) await page.screenshot({ path: `${SHOTS}/runner-each.png` });
      else await page.screenshot({ path: `${SHOTS}/runner-each-200.png` });
      // The list's sheet: its items as rows (it changes only by being given again).
      // (At 195×422 with three moves the runner's column has almost no height — the runner's own layout, before
      // P-107 — so there it is opened from the keyboard: the focus on it, Return.)
      const listValue = r.values.filter({ hasText: /^concerns:/ });
      if (size.width < 300) {
        await listValue.focus();
        await page.keyboard.press('Enter');
      } else await listValue.click();
      const vs = await sheet(page, 'go-value-sheet');
      await expect(vs.getByTestId('go-value-sheet-list').getByRole('listitem')).toHaveText(['form', 'time', 'rest days, mostly']);
      await expect(vs.getByTestId('go-value-keep')).toHaveCount(0);
      await noSerious(page);
      await rules(page, vs);
      await vs.getByTestId('go-value-close').click();
      await expect(page.getByTestId('go-value-sheet')).toHaveCount(0);

      // The call receives the item.
      await r.stepIn.click();
      await expect(r.words).toHaveText('Look into form');
      await r.next.click();
      await typeValue(page, 'findings', 'shorter sets');
      await r.next.click();
      // Round 2: the next concern.
      await expect(r.words).toHaveText('Research');
      await expect(r.values).toHaveText(['concerns: form, time and rest days, mostly', 'concern 2 of 3: time']);

      // Step out of the loop: on to Decide, with what the first concern gave; Undo puts it back.
      await r.stepOut.click();
      await expect(r.words).toHaveText('Decide using shorter sets');
      await expect(r.notice).toContainText('Left For each concern');
      await r.notice.getByRole('button', { name: /^Undo/ }).click();
      await expect(r.words).toHaveText('Research');
      await expect(r.values).toHaveText(['concerns: form, time and rest days, mostly', 'concern 2 of 3: time']);

      // Kept across a reload: the same item.
      await page.reload();
      await expect(settled(page, 'runner')).toBeVisible();
      await expect(r.values).toHaveText(['concerns: form, time and rest days, mostly', 'concern 2 of 3: time']);
      await r.stepIn.click();
      await expect(r.words).toHaveText('Look into time');
      await r.next.click();
      await typeValue(page, 'findings', 'warm-up first');
      await r.next.click();
      await r.stepIn.click();
      await expect(r.words).toHaveText('Look into rest days, mostly');
      await r.next.click();
      await typeValue(page, 'findings', 'more sleep');
      await r.next.click();
      // Past the last concern: Decide reads what each gave, in order.
      await expect(r.words).toHaveText('Decide using shorter sets, warm-up first and more sleep');
      await expect(r.values.filter({ hasText: /^findings:/ })).toHaveText('findings: shorter sets, warm-up first and more sleep');
    });

    test('an empty list passes straight through the block', async ({ page }) => {
      await seed(page, [{ id: 'r1', routine: 'improve', at: 0, status: 'running' }]);
      await openGo(page, 'runner');
      const r = runner(page);
      await r.field('concerns').click();
      const list = await sheet(page, 'go-list-sheet');
      await list.getByTestId('go-list-keep').click();
      await expect(page.getByTestId('go-list-sheet')).toHaveCount(0);
      await r.next.click();
      await expect(r.words).toHaveText('Decide using {findings}');
      await expect(r.field('findings')).toBeVisible();
    });
  });
}
