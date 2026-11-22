import { AxeBuilder } from '@axe-core/playwright';
import { Page } from '@playwright/test';

import { expect, logBox, logLine, openHome, openWanders, test } from './fixtures';
import { legacyBlob, seedScript } from './graphFixture';

/** Fails on serious or critical axe violations, printing what and where. */
async function expectNoSeriousViolations(page: Page) {
  // Only check what's on screen; tab screens that are mounted but hidden are not.
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = serious.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => `${n.target.join(' ')} ${n.html.slice(0, 200)}`).slice(0, 5).join('\n  ')}`);
  expect(report, report.join('\n')).toEqual([]);
}

async function seed(page: Page) {
  // P-34: the cards (and their next-step prompt) are on the Wanders tab.
  await openWanders(page);
  await logBox(page).fill('practiced scales @play guitar');
  await page.getByRole('option', { name: /New wander “play guitar”/ }).click();
  await logBox(page).press('Enter');
  const next = page.getByRole('textbox', { name: 'Optional next step for play guitar' });
  await next.fill('learn the F chord');
  await next.press('Enter');
  await logLine(page, 'read a novel');
}

test('first run has no serious accessibility violations', async ({ page }) => {
  await openHome(page);
  await expectNoSeriousViolations(page);
});

test('Home, Activities, thread page and details have no serious accessibility violations', async ({ page }) => {
  await seed(page);
  await expectNoSeriousViolations(page);

  await page.getByRole('tab', { name: 'Activities' }).click();
  await expect(page.getByRole('tab', { name: 'No wander' })).toBeVisible();
  await expectNoSeriousViolations(page);

  await page.getByRole('tab', { name: 'Wanders' }).click();
  await page.getByRole('button', { name: /^play guitar\s*\S/ }).click();
  await expect(page.getByText('You left off')).toBeVisible();
  await expectNoSeriousViolations(page);

  await page.goto('./');
  await page.getByRole('tab', { name: 'Activities' }).click();
  await page.getByText('read a novel').filter({ visible: true }).click();
  await expect(page.getByRole('textbox', { name: 'What you did' })).toBeVisible();
  await expectNoSeriousViolations(page);
});

test('a refused rename on the thread page has no serious accessibility violations', async ({ page }) => {
  await seed(page);
  await logBox(page).fill('sewed a hem @make apparel');
  await page.getByRole('option', { name: /New wander “make apparel”/ }).click();
  await logBox(page).press('Enter');
  await page.getByRole('button', { name: /^make apparel\s*\S/ }).click();
  await page.getByRole('button', { name: 'Rename' }).click();
  const field = page.getByRole('textbox', { name: 'Wander name' });
  await field.fill('Play Guitar');
  await field.press('Enter');
  await expect(page.getByText('Another wander is already called “play guitar”.')).toBeVisible();
  await expectNoSeriousViolations(page);
});

test('suggestions are an accessible listbox', async ({ page }) => {
  await seed(page);
  await logBox(page).fill('more @pla');
  await expect(page.getByRole('listbox', { name: 'Wander suggestions' })).toBeVisible();
  await expectNoSeriousViolations(page);
});

test('pull-in and search screens have no serious accessibility violations', async ({ page }) => {
  await openWanders(page);
  await logLine(page, 'drawing at lunch');
  await page.getByRole('button', { name: '+ New wander' }).click();
  const name = page.getByRole('textbox', { name: 'New wander name' });
  await name.fill('practice drawing');
  await name.press('Enter');
  await expect(page.getByRole('checkbox')).toHaveCount(1);
  await expectNoSeriousViolations(page);

  await page.goto('./search');
  await page.getByRole('textbox', { name: 'Search' }).fill('drawing');
  await expect(page.getByText('1 result')).toBeVisible();
  await expectNoSeriousViolations(page);
});

test('the graph, its list view and attach mode have no serious accessibility violations', async ({ page }) => {
  const blob = legacyBlob(['draw', 'make apparel', 'sew'], [
    ...[1, 2, 3].map((d) => ({ from: 'draw', to: ['make apparel'], text: `sketch ${d}`, daysAgo: d })),
    { from: 'sew', to: ['make apparel'], text: 'hemmed', daysAgo: 2 },
    { text: 'read a novel', daysAgo: 1 },
  ]);
  await page.addInitScript(seedScript, blob);
  await page.goto('./explore');
  await expect(page.getByRole('button', { name: /^make apparel, \d+ steps/ })).toBeVisible();
  await expectNoSeriousViolations(page);
  await page.getByRole('button', { name: 'Attach loose activities' }).click();
  await expectNoSeriousViolations(page);
  await page.getByRole('tab', { name: 'List view' }).click();
  await expectNoSeriousViolations(page);
});

test('Settings, with the “may clear your data” line and its button, has no serious accessibility violations', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.storage.persisted = async () => false;
    navigator.storage.persist = async () => false;
  });
  await openHome(page);
  await page.goto('./settings');
  const ask = page.getByRole('button', { name: 'Ask the browser to keep it' });
  await expect(ask).toBeVisible();
  const box = await ask.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  await expectNoSeriousViolations(page);
});

test('the bridge after a log, and its name field, have no serious accessibility violations at 390 px', async ({ page }) => {
  const long = 'practise the long slow patient art of baking sourdough every single weekend morning';
  await openWanders(page);
  // Longer than the @ menu takes, so it's named with "+ New thread" (shown once something is logged).
  await logLine(page, 'fed the starter');
  await page.getByRole('button', { name: '+ New wander' }).click();
  const name = page.getByRole('textbox', { name: 'New wander name' });
  await name.fill(long);
  await name.press('Enter');
  await expect(page.getByRole('button', { name: new RegExp(`^${long}`) })).toBeVisible();
  await logLine(page, 'read a novel');

  const bridge = page.getByRole('group', { name: 'Attach what you just logged' });
  await expect(bridge).toBeVisible();
  await expectNoSeriousViolations(page);

  // The long name wraps inside its chip instead of running off the 390 px screen.
  const chip = bridge.getByRole('button', { name: `Attach to ${long}` });
  const chipBox = (await chip.boundingBox())!;
  expect(chipBox.x + chipBox.width).toBeLessThanOrEqual(390);
  const oneLine = (await bridge.getByRole('button', { name: '+ name it' }).boundingBox())!;
  expect(chipBox.height).toBeGreaterThan(oneLine.height);
  expect(await chip.evaluate((el) => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  for (const button of await bridge.getByRole('button').all()) {
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }

  await bridge.getByRole('button', { name: '+ name it' }).click();
  const field = page.getByRole('textbox', { name: 'Name the wander it was toward' });
  await expect(field).toBeFocused();
  expect((await field.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expectNoSeriousViolations(page);
});

test('Home with a typed line attached to a next step (the step chip) has no serious accessibility violations', async ({ page }) => {
  await seed(page);
  await logBox(page).fill('half a page of sketches');
  await page.getByRole('button', { name: 'learn the F chord Log this' }).click();
  const chip = page.getByRole('button', { name: 'learn the F chord, next step in play guitar. This line counts as it. Remove' });
  await expect(chip).toBeVisible();
  await expectNoSeriousViolations(page);
  // Its name starts with its visible text; it's a 44 px target and stays on the 390 px screen.
  await expect(chip).toContainText('learn the F chord');
  const box = (await chip.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
});

test('the thread page with the "what it’s for" swap row open has no serious accessibility violations', async ({ page }) => {
  const at = new Date(Date.now() - 5 * 864e5).toISOString();
  const threads = Object.fromEntries(
    ['practice drawing', 'make apparel', 'sell prints', 'learn to sew'].map((name, i) => [`t${i}`, { id: `t${i}`, name, hidden: false, createdAt: at, ...(i < 3 && { declaredAt: at }) }]),
  );
  await page.addInitScript(seedScript, JSON.stringify({ state: { data: { version: 1, threads, activities: {} }, showShading: true }, version: 1 }));
  await page.goto('./thread/t3');
  // The control's name is its visible text.
  await page.getByRole('button', { name: 'What it’s for', exact: true }).click();
  await expect(page.getByText('You have three things it’s all for. Swap one?')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Swap with/ })).toHaveCount(3);
  await expectNoSeriousViolations(page);
});

test('the waiting screen (another tab has the data) has no serious accessibility violations, and says what failed (P-29)', async ({ page, context }) => {
  await openHome(page);
  const second = await context.newPage();
  await second.goto('./');
  // Read out once, as an alert.
  await expect(second.getByRole('alert')).toHaveText(
    'Wanderment is open in another tab or window. It’ll open here as soon as that one is closed or in the background.',
    { timeout: 20_000 },
  );
  // The details line is always visible, and selectable so it can be copied into a report.
  const details = second.getByText('Details: tab lock · another page holds it', { exact: true });
  await expect(details).toBeVisible();
  expect(await details.evaluate((el) => getComputedStyle(el).userSelect)).toBe('text');
  await expectNoSeriousViolations(second);

  // Reload stays as a second way: named by its text, a 44 px target, reachable by keyboard.
  const reload = second.getByRole('button', { name: 'Reload', exact: true });
  expect((await reload.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await second.keyboard.press('Tab');
  await expect(reload).toBeFocused();
});

test('Home while the page doesn’t hold the data (“Reconnecting…” on Log) has no serious accessibility violations (P-29)', async ({ page }) => {
  await openHome(page);
  await logLine(page, 'read a novel');
  await logBox(page).fill('typed while away');
  // Hidden (emulated: headless pages stay visible), the page lets go of the data.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  // Named by its visible text ("Log"), plus why it waits (rework after the audit, F12); the data and the typed line stay.
  await expect(page.getByRole('button', { name: 'Log, reconnecting', exact: true })).toBeVisible();
  await expect(page.getByText('Reconnecting…', { exact: true })).toBeVisible();
  await expect(logBox(page)).toHaveValue('typed while away');
  await expectNoSeriousViolations(page);
});
