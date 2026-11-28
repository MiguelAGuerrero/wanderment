/**
 * P-102, fixes after the audit (expected values: the coordinator's audit brief and DESIGN.md — "Nothing by
 * gesture alone: every drag … has a visible control"; WCAG 2.5.7):
 * 1. Reordering without a drag. ≥ 340 px: the grip, pressed, opens its own small menu — Move up · Move down
 *    (unavailable at the ends) — and the step's ··· menu stays trimmed (the owner's). Under 340 px (no grip):
 *    the step's ··· menu has Move up · Move down. Each move is one place and one Undo.
 * 2. Every menu has a "Close" for screen readers, last, not drawn (VoiceOver can leave without choosing).
 * 3. Browser Back with a menu or a sheet open closes only it — never leaves Plan.
 * 4. At 200 % text a top row's menu still reaches Remove.
 * 5. Home's tile ··· is the same anchored menu.
 */
import { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { arrived, closeMenu, expectEdit, expectSteps, menuItems, plan, planFromRoutines, routines, RoutineSpec, startGo, tile, undoEdit, editPlan } from './goFixture';

const FIVE = ['One', 'Two', 'Three', 'Four', 'Five'];
const DRAG: RoutineSpec = { id: 'drag', name: 'Five steps', steps: FIVE, repeatFrom: 3 };
const gripOf = (page: Page, words: string) => plan(page).screen.getByRole('button', { name: `Reorder ${words}`, exact: true });
/**
 * Plan reached from the app (so Back has somewhere to go, and must not go there while a layer is open). P-97
 * (was: from its idle tile on home): from its row on My routines.
 */
async function planFromHome(page: Page) {
  await startGo(page, [], 'home', [DRAG]);
  await planFromRoutines(page, 'Five steps');
  // (P-115, rewritten: Plan opens read-only — these specs edit it, so its opener enters Edit.)
  await editPlan(page);
}

test('(1) ≥ 340 px: the grip pressed opens Move up · Move down (unavailable at the ends) — one place, one Undo each; the step’s ··· menu stays trimmed', async ({ page }) => {
  await planFromHome(page);
  const p = plan(page);
  // The ··· menu: no moves (the owner's trimmed menu).
  await editPlan(page); // (P-115, rewritten: Plan opens read-only — Edit first.)
  await p.more('Three').click();
  const trimmed = await arrived(page, 'go-plan-menu');
  await expect(menuItems(trimmed)).toHaveText(['Edit', 'Add a step after', 'Break it down', 'Gives…', 'Remove']);
  await closeMenu(page, 'go-plan-menu');
  // The grip: its own menu, at the grip, named for it.
  await gripOf(page, 'Three').click();
  const reorder = await arrived(page, 'go-plan-reorder');
  await expect(reorder).toHaveRole('menu');
  await expect(reorder).toHaveAccessibleName('Reorder Three');
  await expect(menuItems(reorder)).toHaveText(['Move up', 'Move down']);
  const g = (await gripOf(page, 'Three').boundingBox())!;
  const m = (await reorder.boundingBox())!;
  expect(Math.min(Math.abs(m.y - (g.y + g.height)), Math.abs(g.y - (m.y + m.height)))).toBeLessThanOrEqual(12);
  // Up: one place; the focus back on the grip; one Undo.
  await reorder.getByRole('menuitem', { name: 'Move up', exact: true }).click();
  await expectSteps(page, ['One', 'Three', 'Two', 'Four', 'Five']);
  await expect(gripOf(page, 'Three')).toBeFocused();
  await expectEdit(page, 'Moved “Three”');
  await undoEdit(page);
  await expectSteps(page, FIVE);
  // At the ends: unavailable, and pressing does nothing.
  await gripOf(page, 'One').click();
  let menu = await arrived(page, 'go-plan-reorder');
  await expect(menu.getByRole('menuitem', { name: 'Move up', exact: true })).toHaveAttribute('aria-disabled', 'true');
  await expect(menu.getByRole('menuitem', { name: 'Move down', exact: true })).not.toHaveAttribute('aria-disabled', 'true');
  // (Focus is on the first item that can be chosen.)
  await expect(menu.getByRole('menuitem', { name: 'Move down', exact: true })).toBeFocused();
  await menu.getByRole('menuitem', { name: 'Move up', exact: true }).click({ force: true });
  await expectSteps(page, FIVE);
  await closeMenu(page, 'go-plan-reorder');
  await gripOf(page, 'Five').click();
  menu = await arrived(page, 'go-plan-reorder');
  await expect(menu.getByRole('menuitem', { name: 'Move down', exact: true })).toHaveAttribute('aria-disabled', 'true');
  await closeMenu(page, 'go-plan-reorder');
});

test('(1) under 340 px (no grip): the step’s ··· menu has Move up · Move down, unavailable at the ends — one place, one Undo each', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await planFromHome(page);
  const p = plan(page);
  await editPlan(page); // (P-115, rewritten: Plan opens read-only — Edit first.)
  await expect(p.screen.getByTestId('go-plan-grip')).toHaveCount(0);
  await p.more('Two').click();
  let menu = await arrived(page, 'go-plan-menu');
  await expect(menuItems(menu)).toHaveText(['Edit', 'Add a step after', 'Break it down', 'Gives…', 'Move up', 'Move down', 'Remove']);
  await menu.getByRole('menuitem', { name: 'Move up', exact: true }).click();
  await expectSteps(page, ['Two', 'One', 'Three', 'Four', 'Five']);
  await expect(p.more('Two')).toBeFocused();
  await expectEdit(page, 'Moved “Two”');
  // Now first: Move up unavailable.
  await p.more('Two').click();
  menu = await arrived(page, 'go-plan-menu');
  await expect(menu.getByRole('menuitem', { name: 'Move up', exact: true })).toHaveAttribute('aria-disabled', 'true');
  await closeMenu(page, 'go-plan-menu');
  await undoEdit(page);
  await expectSteps(page, FIVE);
  await p.more('Five').click();
  menu = await arrived(page, 'go-plan-menu');
  await expect(menu.getByRole('menuitem', { name: 'Move down', exact: true })).toHaveAttribute('aria-disabled', 'true');
});

test('(2) every menu ends with a "Close" for screen readers — not drawn, not reached by ↑/↓; choosing it closes the menu and gives focus back', async ({ page }) => {
  await planFromHome(page);
  const p = plan(page);
  for (const [open, id] of [
    [() => p.more('Three').click(), 'go-plan-menu'],
    [() => p.more('Five steps').click(), 'go-plan-routine'],
    [() => gripOf(page, 'Three').click(), 'go-plan-reorder'],
  ] as const) {
    await open();
    const menu = await arrived(page, id);
    const close = menu.getByRole('menuitem', { name: 'Close', exact: true });
    await expect(close).toHaveCount(1);
    // Last, and not drawn (clipped to nothing).
    expect(await menu.evaluate((m) => [...m.querySelectorAll('[role="menuitem"]')].at(-1)!.textContent)).toBe('Close');
    expect(await close.evaluate((e) => { const b = e.getBoundingClientRect(); return b.width * b.height; })).toBeLessThanOrEqual(1);
    // ↑ from the first item wraps to the last item that is drawn, not to Close.
    await page.keyboard.press('ArrowUp');
    await expect(close).not.toBeFocused();
    await close.dispatchEvent('click');
    await expect(page.getByTestId(id)).toHaveCount(0);
  }
  await expectSteps(page, FIVE);
  // The divider's small dialog has one too (a button there).
  await p.dividerMore.click();
  const dialog = await arrived(page, 'go-plan-repeat');
  await dialog.getByRole('button', { name: 'Close', exact: true }).dispatchEvent('click');
  await expect(page.getByTestId('go-plan-repeat')).toHaveCount(0);
  await expect(p.dividerMore).toBeFocused();
});

test('(3) browser Back with a menu or a sheet open closes only it — Plan stays, at the same address; Back again leaves', async ({ page }) => {
  await planFromHome(page);
  const p = plan(page);
  const url = page.url();
  for (const [open, id] of [
    [() => p.more('Three').click(), 'go-plan-menu'],
    [() => p.more('Five steps').click(), 'go-plan-routine'],
    [() => p.dividerMore.click(), 'go-plan-repeat'],
  ] as const) {
    await open();
    await arrived(page, id);
    await page.goBack();
    await expect(page.getByTestId(id)).toHaveCount(0);
    await expect(p.title).toHaveText('Five steps');
    await expect(page).toHaveURL(url);
  }
  // A sheet (Gives…) too.
  await editPlan(page); // (P-115, rewritten: Plan opens read-only — Edit first.)
  await p.more('Three').click();
  await (await arrived(page, 'go-plan-menu')).getByRole('menuitem', { name: 'Gives…', exact: true }).click();
  await arrived(page, 'go-gives-sheet');
  await page.goBack();
  await expect(page.getByTestId('go-gives-sheet')).toHaveCount(0);
  await expect(p.title).toHaveText('Five steps');
  await expect(page).toHaveURL(url);
  // Nothing open: Back goes back (P-97, was: home — to My routines, where it was opened from).
  await page.goBack();
  await expect(routines(page).screen).toBeVisible();
});

test('(3) Plan opened at its own address (the first screen: nothing beneath it in the app) — Back with a menu open closes only the menu', async ({ page }) => {
  await startGo(page, [{ id: 'r1', routine: 'drag', at: 0, status: 'paused' as const, mode: 'plan' as const }], 'plan', [DRAG]);
  const p = plan(page);
  const url = page.url();
  await editPlan(page); // (P-115, rewritten: Plan opens read-only — Edit first.)
  for (const [open, id] of [
    [() => p.more('Three').click(), 'go-plan-menu'],
    [() => p.dividerMore.click(), 'go-plan-repeat'],
  ] as const) {
    await open();
    await arrived(page, id);
    await page.goBack();
    await expect(page.getByTestId(id)).toHaveCount(0);
    await expect(p.title).toHaveText('Five steps');
    await expect(page).toHaveURL(url);
  }
});

test('(4) at 200 % text (195×422) a top row’s menu reaches Remove: it scrolls inside the menu, on screen, and Remove works', async ({ page }) => {
  await page.setViewportSize({ width: 195, height: 422 });
  await planFromHome(page);
  const p = plan(page);
  await editPlan(page); // (P-115, rewritten: Plan opens read-only — Edit first.)
  await p.more('One').scrollIntoViewIfNeeded();
  await p.more('One').click();
  const menu = await arrived(page, 'go-plan-menu');
  const remove = menu.getByRole('menuitem', { name: 'Remove', exact: true });
  await remove.scrollIntoViewIfNeeded();
  await expect(remove).toBeInViewport({ ratio: 1 });
  const m = (await menu.boundingBox())!;
  expect(m.y).toBeGreaterThanOrEqual(0);
  expect(m.y + m.height).toBeLessThanOrEqual(422 + 0.5);
  // From the keyboard too: End reaches it.
  await page.keyboard.press('End');
  await expect(remove).toBeFocused();
  await remove.click();
  await expectSteps(page, ['Two', 'Three', 'Four', 'Five']);
});

test('(5) home: a paused tile’s ··· opens the same anchored menu — Start over; focus in and back; Esc and a tap outside close it', async ({ page }) => {
  await startGo(page, [{ id: 'r', routine: 'drag', at: 2, status: 'paused' }], 'home', [DRAG]);
  const more = tile(page, 'Five steps').getByTestId('go-tile-more');
  await more.click();
  const menu = await arrived(page, 'go-tile-menu');
  await expect(menu).toHaveRole('menu');
  await expect(menu).toHaveAccessibleName('Five steps');
  // P-103 (6; was: Start over alone): End this run too, after a line, in red.
  await expect(menuItems(menu)).toHaveText(['Start over', 'End this run']);
  await expect(menuItems(menu).first()).toHaveAccessibleName('Start over: Five steps');
  await expect(menuItems(menu).first()).toBeFocused();
  const b = (await more.boundingBox())!;
  const m = (await menu.boundingBox())!;
  expect(Math.min(Math.abs(m.y - (b.y + b.height)), Math.abs(b.y - (m.y + m.height)))).toBeLessThanOrEqual(12);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('go-tile-menu')).toHaveCount(0);
  await expect(more).toBeFocused();
  await more.click();
  await arrived(page, 'go-tile-menu');
  await page.mouse.click(20, 400);
  await expect(page.getByTestId('go-tile-menu')).toHaveCount(0);
  // Start over: asked first, as before.
  await more.click();
  await (await arrived(page, 'go-tile-menu')).getByRole('menuitem', { name: 'Start over: Five steps', exact: true }).click();
  await expect(page.getByTestId('go-restart-confirm')).toBeVisible();
});
