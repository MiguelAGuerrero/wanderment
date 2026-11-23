/**
 * P-58 (owner, D-10): Wanders and Activities pull out from Home. No tab bar: a handle at Home's bottom
 * pulls up one sheet with two sections, Wanders | Activities; drag down, the scrim, Esc or Back put it
 * away.
 */
import { AxeBuilder } from '@axe-core/playwright';
import { Page } from '@playwright/test';

import { expect, logBox, logLine, logPlus, test } from './fixtures';
import { legacyBlob, seedScript } from './graphFixture';

const SHOTS = process.env.E2E_SHOTS; // set to a folder to save screenshots for a visual check

const NAME = 'Wanders and activities';
const handle = (page: Page) => page.getByRole('button', { name: NAME, exact: true });
/** The handle whether or not it's hidden from assistive tech (it is, under the open sheet). */
const handleEl = (page: Page) => page.getByTestId('home-sheet-handle');
const dialog = (page: Page) => page.getByRole('dialog', { name: NAME, exact: true });
const section = (page: Page, name: 'Wanders' | 'Activities') => dialog(page).getByRole('tab', { name, exact: true });
const sheetEl = (page: Page) => page.getByTestId('home-sheet');
const DAY = 864e5;

async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = serious.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => `${n.target.join(' ')} ${n.html.slice(0, 200)}`).slice(0, 5).join('\n  ')}`);
  expect(report, report.join('\n')).toEqual([]);
}

/** draw (with a step) and sew feed make apparel; one log with no wander. */
function world() {
  const json = JSON.parse(
    legacyBlob(['draw', 'make apparel', 'sew'], [
      { from: 'sew', to: ['make apparel'], text: 'hemmed', daysAgo: 2 },
      { from: 'draw', to: ['make apparel'], text: 'sketched', daysAgo: 1 },
      { text: 'cooked dinner', daysAgo: 0.5 },
    ]),
  );
  json.state.data.threads['make apparel'].declaredAt = new Date(Date.now() - 5 * DAY).toISOString();
  json.state.data.threads.draw.next = 'sketch a hand';
  return JSON.stringify(json);
}

async function open(page: Page) {
  await page.addInitScript(seedScript, world());
  await page.goto('./');
  await expect(logPlus(page)).toBeVisible(); // P-61: was the What’s next tab
}

/** The sheet is out and has come to rest (Home's bottom is out of sight under it). */
async function expectOpen(page: Page, on: 'Wanders' | 'Activities') {
  await expect(dialog(page)).toBeVisible();
  await expect(section(page, on)).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('home-slot')).toBeHidden();
}

/** The sheet is away: Home is back, its handle reachable again. */
async function expectClosed(page: Page) {
  await expect(dialog(page)).toHaveCount(0);
  await expect(sheetEl(page)).toBeHidden();
  await expect(handle(page)).toBeVisible();
  await expect(handle(page)).toHaveAttribute('aria-expanded', 'false');
}

type Box = { x: number; y: number; width: number; height: number };
/** Drags with the mouse from the middle of `from` by dy, in steps (a finger's drag on web). */
async function drag(page: Page, from: Box, dy: number) {
  const x = from.x + from.width / 2;
  const y = from.y + from.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + dy, { steps: 12 });
  await page.mouse.up();
}
/** A short, slow drag (no flick): 20 px over half a second. */
async function twitch(page: Page, from: Box, dir: 1 | -1) {
  const x = from.x + from.width / 2;
  const y = from.y + from.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 5; i++) {
    await page.mouse.move(x, y + dir * 4 * i);
    await page.waitForTimeout(100);
  }
  await page.mouse.up();
}

test.describe('at 390 px', () => {
  test.beforeEach(async ({ page }) => open(page));

  // P-61: the slot is the What’s next card and ＋ (was: "…under the What’s next / Log slot", whose toggle was Home's only tablist).
  test('no tab bar: Home is the only screen, with the handle under the What’s next card and ＋', async ({ page }) => {
    for (const name of ['Home', 'Wanders', 'Activities']) await expect(page.getByRole('tab', { name, exact: true })).toHaveCount(0);
    await expect(page.getByRole('tablist')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Wanders', exact: true })).toHaveCount(0);

    await expect(handle(page)).toBeVisible();
    await expect(handle(page)).toHaveAttribute('aria-expanded', 'false');
    const h = (await handle(page).boundingBox())!;
    expect(h.height).toBeGreaterThanOrEqual(44);
    expect(h.width).toBeGreaterThanOrEqual(44);
    // Under the slot (the card and ＋), at the very bottom of the screen.
    for (const above of [page.getByRole('region', { name: /^What’s next/ }), logPlus(page)]) {
      const b = (await above.boundingBox())!;
      expect(h.y).toBeGreaterThanOrEqual(b.y + b.height);
    }
    expect(h.y + h.height).toBeLessThanOrEqual(844);
    expect(h.y + h.height).toBeGreaterThan(844 - 24);
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p58-home-handle.png` });
  });

  test('a tap opens it on Wanders, a modal dialog with focus inside, over most of the screen; Esc puts it away and focus goes back to the handle', async ({ page }) => {
    await handle(page).click();
    await expectOpen(page, 'Wanders');
    await expect(dialog(page)).toHaveAttribute('aria-modal', 'true');
    await expect(dialog(page).getByRole('tablist', { name: 'Wanders or Activities' })).toBeVisible();
    // Wanders is today's Wanders list, unchanged.
    await expect(dialog(page).getByRole('heading', { name: 'Wanders', exact: true })).toBeVisible();
    await expect(dialog(page).getByRole('heading', { name: 'TO MAKE APPAREL' }).or(dialog(page).getByRole('heading', { name: 'YOUR WANDERS' })).first()).toBeVisible();
    await expect(dialog(page).getByRole('button', { name: 'sketch a hand Log this' })).toBeVisible();
    // Focus moved into it; Home behind it is out of reach.
    expect(await dialog(page).evaluate((el) => el.contains(document.activeElement))).toBe(true);
    await expect(page.getByRole('heading', { name: 'Wanderment' })).toHaveCount(0);
    await expect(handleEl(page)).toHaveAttribute('aria-expanded', 'true');
    // Most of the screen; Home's header stays in view above it.
    const d = (await sheetEl(page).boundingBox())!;
    expect(d.height).toBeGreaterThan(0.8 * 844);
    expect(d.y + d.height).toBeLessThanOrEqual(844 + 1);
    const title = (await page.getByRole('heading', { name: 'Wanderment', includeHidden: true }).boundingBox())!;
    expect(title.y + title.height).toBeLessThanOrEqual(d.y);
    for (const name of ['Wanders', 'Activities'] as const) {
      const t = (await section(page, name).boundingBox())!;
      expect(Math.min(t.width, t.height)).toBeGreaterThanOrEqual(44);
    }
    const close = (await dialog(page).getByRole('button', { name: 'Close', exact: true }).boundingBox())!;
    expect(Math.min(close.width, close.height)).toBeGreaterThanOrEqual(44);
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p58-sheet-wanders.png` });

    await page.keyboard.press('Escape');
    await expectClosed(page);
    await expect(handle(page)).toBeFocused();
    // Home is back as it was: its heading and its slot (P-61: the log field away, ＋ there; was: on What's next).
    await expect(page.getByRole('heading', { name: 'Wanderment' })).toBeVisible();
    await expect(logPlus(page)).toBeVisible();
  });

  test('the sections switch with the tabs at its top, and it reopens on the last one; the scrim and Close put it away', async ({ page }) => {
    await handle(page).click();
    await expectOpen(page, 'Wanders');
    await section(page, 'Activities').click();
    await expectOpen(page, 'Activities');
    await expect(section(page, 'Wanders')).toHaveAttribute('aria-selected', 'false');
    // Today's Activities list, unchanged: its own All | No wander filter and its rows.
    await expect(dialog(page).getByRole('tab', { name: 'No wander' })).toBeVisible();
    await expect(dialog(page).getByText('cooked dinner', { exact: true })).toBeVisible();
    await expect(dialog(page).getByRole('heading', { name: 'Wanders', exact: true })).toBeHidden();
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p58-sheet-activities.png` });

    // A tap on the scrim (over Home's header) puts it away.
    await page.mouse.click(195, 20);
    await expectClosed(page);
    await expect(handle(page)).toBeFocused();
    await handle(page).click();
    await expectOpen(page, 'Activities');
    await dialog(page).getByRole('button', { name: 'Close', exact: true }).click();
    await expectClosed(page);
    await expect(handle(page)).toBeFocused();
  });

  // P-61: from ＋ (was: from the toggle, two Tabs).
  test('on web it’s reachable by keyboard: Tab from ＋ to the handle, Enter opens, Esc closes', async ({ page }) => {
    await logPlus(page).focus();
    await page.keyboard.press('Tab');
    await expect(handle(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await expectOpen(page, 'Wanders');
    await expect(section(page, 'Wanders')).toBeFocused();
    await page.keyboard.press('Escape');
    await expectClosed(page);
    await expect(handle(page)).toBeFocused();
  });

  test('a drag up on the handle pulls it out; a drag down on its top puts it away; a twitch does neither', async ({ page }) => {
    // A short drag springs back.
    await twitch(page, (await handle(page).boundingBox())!, -1);
    await page.waitForTimeout(400);
    await expectClosed(page);

    await drag(page, (await handle(page).boundingBox())!, -400);
    await expectOpen(page, 'Wanders');

    const grab = (await dialog(page).getByRole('button', { name: 'Close', exact: true }).boundingBox())!;
    await twitch(page, grab, 1);
    await page.waitForTimeout(400);
    await expectOpen(page, 'Wanders');
    await drag(page, grab, 400);
    await expectClosed(page);
  });

  test('each section logs from its own box, as the tabs did; Home’s slot stays out of it', async ({ page }) => {
    await handle(page).click();
    await expectOpen(page, 'Wanders');
    // The Wanders section's box: a plain log (P-61: asks nothing there either; was: the bridge asked there).
    await logLine(page, 'stretched');
    await expect(page.getByText('Logged', { exact: true }).filter({ visible: true })).toHaveCount(1);
    await expect(dialog(page).getByRole('group', { name: 'Attach what you just logged' })).toHaveCount(0);
    await expectOpen(page, 'Wanders');

    await section(page, 'Activities').click();
    await expectOpen(page, 'Activities');
    await expect(page.getByRole('group', { name: 'Attach what you just logged' })).toHaveCount(0);
    await logBox(page).fill('watered the plants @sew');
    await page.getByRole('option', { name: 'sew' }).click();
    await logBox(page).press('Enter');
    await expect(dialog(page).getByText('watered the plants', { exact: true })).toBeVisible();
    await expect(dialog(page).getByText('stretched', { exact: true })).toBeVisible();
    // Only one log box in reach: the section's.
    await expect(page.getByRole('textbox', { name: 'What did you just do?' })).toHaveCount(1);
    await expect(logBox(page)).toHaveValue('');
  });

  test('an item opens its page; Back lands on Home with the sheet still out on the same section', async ({ page }) => {
    await handle(page).click();
    await dialog(page).getByRole('button', { name: /^sew\s*\S/ }).click();
    await expect(page.getByRole('button', { name: '‹ Back' })).toBeVisible();
    await expect(dialog(page)).toHaveCount(0);
    await page.getByRole('button', { name: '‹ Back' }).click();
    await expectOpen(page, 'Wanders');
    // Put away and out again: it still steps back over its own history entry.
    await page.keyboard.press('Escape');
    await expectClosed(page);
    await handle(page).click();

    await section(page, 'Activities').click();
    await dialog(page).getByText('cooked dinner', { exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'What you did' })).toHaveValue('cooked dinner');
    await page.goBack();
    await expectOpen(page, 'Activities');
    // Back again puts the sheet away before leaving Home.
    await page.goBack();
    await expectClosed(page);
    await expect(page).toHaveURL(/\/wanderment\/$/);
  });

  test('the browser’s Back closes the sheet before leaving Home', async ({ page }) => {
    await handle(page).click();
    await expectOpen(page, 'Wanders');
    await page.goBack();
    await expectClosed(page);
    await expect(page).toHaveURL(/\/wanderment\/$/);
    await expect(page.getByRole('heading', { name: 'Wanderment' })).toBeVisible();
    // Opened and closed again by Esc, it doesn't leave a Back step behind it.
    await handle(page).click();
    await expectOpen(page, 'Wanders');
    await page.keyboard.press('Escape');
    await expectClosed(page);
    await handle(page).click();
    await expectOpen(page, 'Wanders');
    await page.goBack();
    await expectClosed(page);
    await expect(page).toHaveURL(/\/wanderment\/$/);
  });

  test('it slides, but under Reduce Motion it just appears and goes', async ({ page }) => {
    const watch = () =>
      sheetEl(page).evaluate((el) => {
        const w = window as unknown as { __ys: number[] };
        w.__ys = [];
        new MutationObserver(() => {
          const m = /translateY\((-?[\d.]+)px\)/.exec((el as HTMLElement).style.transform);
          if (m) w.__ys.push(Number(m[1]));
        }).observe(el, { attributes: true, attributeFilter: ['style'] });
      });
    const ys = () => page.evaluate(() => (window as unknown as { __ys: number[] }).__ys);
    const between = (v: number[]) => v.filter((y) => y > 1 && y < 700);

    await watch();
    await handle(page).click();
    await expectOpen(page, 'Wanders');
    expect(between(await ys()).length).toBeGreaterThan(0);

    await page.keyboard.press('Escape');
    await expectClosed(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await watch();
    await handle(page).click();
    await expectOpen(page, 'Wanders');
    await page.keyboard.press('Escape');
    await expectClosed(page);
    await page.waitForTimeout(400);
    expect(between(await ys())).toEqual([]);
  });
});

test('deep links to /wanders and /activities open Home with the sheet on that section; Back puts it away first', async ({ page }) => {
  await page.addInitScript(seedScript, world());
  await page.goto('./activities');
  await expectOpen(page, 'Activities');
  await expect(page).toHaveURL(/\/wanderment\/$/);
  await expect(dialog(page).getByText('cooked dinner', { exact: true })).toBeVisible();
  await page.goBack();
  await expectClosed(page);
  await expect(page.getByRole('heading', { name: 'Wanderment' })).toBeVisible();

  await page.goto('./wanders');
  await expectOpen(page, 'Wanders');
  await expect(dialog(page).getByRole('heading', { name: 'Wanders', exact: true })).toBeVisible();
});

test('at 200 % zoom (195 px) the handle and both sections have no serious accessibility violations', async ({ page }) => {
  await page.setViewportSize({ width: 195, height: 422 });
  await open(page);
  const h = (await handle(page).boundingBox())!;
  expect(h.height).toBeGreaterThanOrEqual(44);
  expect(h.x + h.width).toBeLessThanOrEqual(195);
  await expectNoSeriousViolations(page);
  await handle(page).click();
  await expectOpen(page, 'Wanders');
  for (const name of ['Wanders', 'Activities'] as const) {
    const t = (await section(page, name).boundingBox())!;
    expect(Math.min(t.width, t.height)).toBeGreaterThanOrEqual(44);
    expect(t.x + t.width).toBeLessThanOrEqual(195);
  }
  await expectNoSeriousViolations(page);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p58-200-wanders.png` });
  await section(page, 'Activities').click();
  await expectOpen(page, 'Activities');
  await expectNoSeriousViolations(page);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p58-200-activities.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(195);
});
