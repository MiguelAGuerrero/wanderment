/** P-14: marking a thread as what it's for (a declared "why") from the thread page. */
import { Page } from '@playwright/test';

import { expect, openHome, test } from './fixtures';
import { seedScript } from './graphFixture';

const SHOTS = process.env.E2E_SHOTS; // set to a folder to save screenshots for a visual check

const DAY = 864e5;
const LONG = 'learn to read sheet music well enough to sight-read a whole hymn at church without stopping';

/** Threads t1…t4 (none with activities); the first `declared` of them are marked, oldest first. */
function blob(declared: number, names = ['practice drawing', 'make apparel', 'sell prints', 'learn to sew']) {
  const now = Date.now();
  const threads: Record<string, unknown> = {};
  names.forEach((name, i) => {
    const id = `t${i + 1}`;
    threads[id] = { id, name, hidden: false, createdAt: new Date(now - 30 * DAY).toISOString(), ...(i < declared && { declaredAt: new Date(now - (10 - i) * DAY).toISOString() }) };
  });
  return JSON.stringify({ state: { data: { version: 1, threads, activities: {} }, showShading: true }, version: 1 });
}

async function openThread(page: Page, json: string, id: string) {
  await page.addInitScript(seedScript, json);
  await page.goto(`./thread/${id}`);
  await expect(page.getByRole('button', { name: 'Rename' })).toBeVisible();
}

const toast = (page: Page, message: string) => page.getByText(message, { exact: true }).filter({ visible: true });
const undo = (page: Page) => page.getByRole('button', { name: 'Undo' }).filter({ visible: true });
const declareBtn = (page: Page) => page.getByRole('button', { name: 'What it’s for', exact: true });
const undeclareBtn = (page: Page) => page.getByRole('button', { name: 'Not what it’s for right now', exact: true });
const OFFER = 'You have three things it’s all for. Swap one?';

test('declare and undeclare from the thread page, each with Undo; the mark survives a reload and a rename', async ({ page }) => {
  await openThread(page, blob(0), 't1');
  // A thread with nothing logged can still be what it's for.
  await expect(page.getByText('Nothing logged here yet.')).toBeVisible();

  await declareBtn(page).click();
  await expect(toast(page, '“practice drawing” is what it’s for')).toBeVisible();
  await expect(undeclareBtn(page)).toBeVisible();
  await undo(page).click();
  await expect(declareBtn(page)).toBeVisible();
  await expect(undeclareBtn(page)).toHaveCount(0);

  // Two presses before React re-renders declare once: one Undo takes it all back.
  await declareBtn(page).evaluate((el) => {
    (el as HTMLElement).click();
    (el as HTMLElement).click();
  });
  await expect(undeclareBtn(page)).toBeVisible();
  await expect(toast(page, '“practice drawing” is what it’s for')).toBeVisible();
  await undo(page).click();
  await expect(declareBtn(page)).toBeVisible();
  await declareBtn(page).click();
  await expect(undeclareBtn(page)).toBeVisible();
  await page.reload();
  await expect(undeclareBtn(page)).toBeVisible();

  await page.getByRole('button', { name: 'Rename' }).click();
  const field = page.getByRole('textbox', { name: 'Thread name' });
  await field.fill('draw every day');
  await field.press('Enter');
  await expect(page.getByText('draw every day', { exact: true }).filter({ visible: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('draw every day', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(undeclareBtn(page)).toBeVisible();

  await undeclareBtn(page).click();
  await expect(toast(page, 'Not what it’s for right now')).toBeVisible();
  await expect(declareBtn(page)).toBeVisible();
  await undo(page).click();
  await expect(undeclareBtn(page)).toBeVisible();
  await page.reload();
  await expect(undeclareBtn(page)).toBeVisible();

  // Undeclare leaves nothing behind but the thread.
  await undeclareBtn(page).click();
  await page.reload();
  await expect(declareBtn(page)).toBeVisible();
  await expect(page.getByText('draw every day', { exact: true }).filter({ visible: true })).toBeVisible();
});

test('a 4th offers a swap with the three listed; a swap toasts and one Undo restores both', async ({ page }) => {
  await openThread(page, blob(3), 't4');
  await declareBtn(page).click();
  const offer = page.getByText(OFFER);
  await expect(offer).toBeVisible();
  // Announced politely, once: only the sentence is in the live region, not the buttons.
  const region = page.locator('[aria-live="polite"]').filter({ has: offer });
  await expect(region).toHaveCount(1);
  await expect(region).toHaveText(OFFER);
  // Nothing changed yet, and no toast or count.
  await expect(declareBtn(page)).toBeVisible();
  await expect(page.getByText(/\bof 3\b|\d\/3/)).toHaveCount(0);
  const swaps = page.getByRole('button', { name: /^Swap with/ });
  await expect(swaps).toHaveText(['Swap with “practice drawing”', 'Swap with “make apparel”', 'Swap with “sell prints”']);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/why-swap.png` });

  await page.getByRole('button', { name: 'Swap with “make apparel”', exact: true }).click();
  await expect(toast(page, '“learn to sew” is what it’s for · “make apparel” isn’t right now')).toBeVisible();
  await expect(offer).toHaveCount(0);
  await expect(undeclareBtn(page)).toBeVisible();
  await expect(undeclareBtn(page)).toBeFocused();

  // One Undo reverts both, and that's what's saved.
  await undo(page).click();
  await expect(declareBtn(page)).toBeVisible();
  await page.reload();
  await expect(declareBtn(page)).toBeVisible();
  await page.goto('./thread/t2');
  await expect(undeclareBtn(page)).toBeVisible();

  // A swap that stays is saved too.
  await page.goto('./thread/t4');
  await declareBtn(page).click();
  await page.getByRole('button', { name: 'Swap with “practice drawing”', exact: true }).click();
  await expect(undeclareBtn(page)).toBeVisible();
  await page.reload();
  await expect(undeclareBtn(page)).toBeVisible();
  await page.goto('./thread/t1');
  await expect(declareBtn(page)).toBeVisible();
});

test('Cancel and Esc close the swap row, changing nothing and keeping focus on the control', async ({ page }) => {
  await openThread(page, blob(3), 't4');
  await declareBtn(page).click();
  await expect(page.getByText(OFFER)).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByText(OFFER)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Swap with/ })).toHaveCount(0);
  await expect(declareBtn(page)).toBeFocused();

  await declareBtn(page).press('Enter');
  await expect(page.getByText(OFFER)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByText(OFFER)).toHaveCount(0);
  await expect(declareBtn(page)).toBeFocused();
  await expect(page.getByText('is what it’s for', { exact: false })).toHaveCount(0);
  await page.reload();
  await expect(declareBtn(page)).toBeVisible();
});

test('an import with more than three keeps them all, and a new declare still offers the swap', async ({ page }) => {
  await openThread(page, blob(4, ['practice drawing', 'make apparel', 'sell prints', 'learn to sew', 'run a 10k']), 't5');
  await declareBtn(page).click();
  await expect(page.getByText('You have more than three things it’s all for. Swap one?')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Swap with/ })).toHaveCount(4);
  await page.getByRole('button', { name: 'Swap with “sell prints”', exact: true }).click();
  await expect(undeclareBtn(page)).toBeVisible();
  // Each stays undeclarable.
  await page.goto('./thread/t4');
  await expect(undeclareBtn(page)).toBeVisible();
});

test('export → import round-trips the mark; a backup without it imports unmarked', async ({ page }) => {
  await openThread(page, blob(1), 't1');
  await expect(undeclareBtn(page)).toBeVisible();

  await page.goto('./settings');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export everything (.json)' }).click();
  const file = await (await download).path();
  const { readFileSync } = await import('node:fs');
  const json = readFileSync(file, 'utf8');
  const backup = JSON.parse(json);
  expect(backup.data.version).toBe(1);
  expect(backup.data.threads.t1.declaredAt).toMatch(/Z$/);
  expect(backup.data.threads.t2.declaredAt).toBeUndefined();

  // Undeclare here, then import the backup: the mark comes back and survives a reload.
  await page.goto('./thread/t1');
  await undeclareBtn(page).click();
  await page.goto('./settings');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import from a backup' }).click();
  await (await chooser).setFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(json) });
  await expect(page.getByText('Imported 0 activities.')).toBeVisible();
  await page.goto('./thread/t1');
  await expect(undeclareBtn(page)).toBeVisible();
  await page.reload();
  await expect(undeclareBtn(page)).toBeVisible();

  // An older backup (no declaredAt anywhere) imports fine, unmarked.
  delete backup.data.threads.t1.declaredAt;
  await page.goto('./settings');
  const chooser2 = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import from a backup' }).click();
  await (await chooser2).setFiles({ name: 'old.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.getByText('Imported 0 activities.')).toBeVisible();
  await page.goto('./thread/t1');
  await expect(declareBtn(page)).toBeVisible();
});

test('hiding a declared thread says so and unmarks it; Undo restores both', async ({ page }) => {
  await page.addInitScript(seedScript, blob(1));
  await openHome(page);
  await page.getByRole('link', { name: 'practice drawing', exact: true }).click();
  await expect(undeclareBtn(page)).toBeVisible();
  await page.getByRole('button', { name: 'Hide', exact: true }).click();
  await expect(toast(page, 'Hidden · not what it’s for right now')).toBeVisible();
  await expect(page.getByRole('link', { name: 'practice drawing', exact: true })).toHaveCount(0);
  await undo(page).click();
  await expect(page.getByRole('link', { name: 'practice drawing', exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('link', { name: 'practice drawing', exact: true }).click();
  await expect(undeclareBtn(page)).toBeVisible();

  // Hidden (without Undo): the thread page offers no mark until it's unhidden, and unhiding doesn't re-mark it.
  await page.getByRole('button', { name: 'Hide', exact: true }).click();
  // Hide goes back to Home: let that land before opening the page again.
  await expect(toast(page, 'Hidden · not what it’s for right now')).toBeVisible();
  await expect(page.getByRole('link', { name: 'make apparel', exact: true })).toBeVisible();
  await page.goto('./thread/t1');
  await expect(page.getByRole('button', { name: 'Unhide', exact: true })).toBeVisible();
  await expect(declareBtn(page)).toHaveCount(0);
  await expect(undeclareBtn(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Unhide', exact: true }).click();
  await expect(declareBtn(page)).toBeVisible();
});

test('the swap row at 390 px: names wrap, every target is 44 px, nothing runs off screen', async ({ page }) => {
  await openThread(page, blob(3, [LONG, 'make apparel', 'sell prints', 'learn to sew']), 't4');
  await declareBtn(page).click();
  const long = page.getByRole('button', { name: `Swap with “${LONG}”`, exact: true });
  await expect(long).toBeVisible();
  const width = page.viewportSize()!.width;
  for (const button of await page.getByRole('button', { name: /^(Swap with|Cancel$|What it’s for$|Rename$|Hide$)/ }).all()) {
    const box = (await button.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
  }
  // The long name wraps onto more than one line instead of being cut off.
  expect((await long.boundingBox())!.height).toBeGreaterThan(60);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/why-swap-long.png`, fullPage: true });
});

test('declaring never moves the control under your finger; a second tap in the same place undeclares (audit F2)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openThread(page, blob(0), 't1');
  const before = await declareBtn(page).boundingBox();
  await declareBtn(page).click();
  await expect(undeclareBtn(page)).toBeVisible();
  const after = await undeclareBtn(page).boundingBox();
  expect(after!.x).toBe(before!.x);
  expect(after!.y).toBe(before!.y);
  await page.mouse.click(before!.x + 10, before!.y + before!.height / 2);
  await expect(declareBtn(page)).toBeVisible();
});

test('at 200 % zoom the declared control’s words all fit (audit F3)', async ({ page }) => {
  await page.setViewportSize({ width: 195, height: 422 });
  await openThread(page, blob(1), 't1');
  const fits = await undeclareBtn(page).evaluate((el) => {
    const box = el.getBoundingClientRect();
    const text = el.querySelector('div[dir="auto"]') ?? el;
    return box.right <= document.documentElement.clientWidth && text.scrollWidth <= text.clientWidth + 1;
  });
  expect(fits).toBe(true);
});

test('while renaming, the control waits, so a typed name is never dropped (audit F4)', async ({ page }) => {
  await openThread(page, blob(0), 't1');
  await page.getByRole('button', { name: 'Rename' }).click();
  await page.getByRole('textbox', { name: 'Thread name' }).fill('drawing practice');
  await expect(declareBtn(page)).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Thread name' }).press('Enter');
  await expect(page.getByText('drawing practice', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(declareBtn(page)).toBeVisible();
});
