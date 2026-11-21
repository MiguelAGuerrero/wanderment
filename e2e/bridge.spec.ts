import { Page } from '@playwright/test';

import { expect, logBox, logLine, openHome, test } from './fixtures';
import { legacyBlob, seedScript } from './graphFixture';

const COPY = 'Logged. Toward something — or just itself?';
const QUESTION = 'Toward something — or just itself?';

const bridge = (page: Page) => page.getByRole('group', { name: 'Attach what you just logged' });

async function makeThread(page: Page, text: string, name: string) {
  await logBox(page).fill(`${text} @${name}`);
  await page.getByRole('option', { name: `+ New thread “${name}”` }).click();
  await logBox(page).press('Enter');
  await expect(page.getByText(`Logged → to ${name}`)).toBeVisible();
}

async function counts(page: Page, text: string) {
  await page.goto('./settings');
  await expect(page.getByText(text)).toBeVisible();
}

async function underNoThread(page: Page, text: string) {
  await page.getByRole('tab', { name: 'Activities' }).click();
  await page.getByRole('tab', { name: 'No thread' }).click();
  await expect(page.getByText(text, { exact: true }).filter({ visible: true })).toBeVisible();
}

test('first ever log: the bridge asks, "+ name it" attaches, and Undo leaves no thread', async ({ page }) => {
  await openHome(page);
  await logLine(page, 'read a novel');

  await expect(bridge(page)).toBeVisible();
  await expect(bridge(page).getByText(COPY, { exact: true })).toBeVisible();
  expect(await bridge(page).innerText()).not.toMatch(/\d/);
  // No threads yet: only "+ name it" and "Just itself".
  await expect(bridge(page).getByRole('button')).toHaveText(['+ name it', 'Just itself']);
  // It appeared without taking focus.
  expect(await bridge(page).evaluate((el) => el.contains(document.activeElement))).toBe(false);

  await bridge(page).getByRole('button', { name: '+ name it' }).click();
  const field = page.getByRole('textbox', { name: 'Name the thread it was toward' });
  await expect(field).toBeFocused();
  await field.fill('reading');
  await field.press('Enter');

  await expect(page.getByText('Attached → to reading', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible();
  await expect(bridge(page)).toHaveCount(0);
  await expect(logBox(page)).toBeFocused();
  await expect(page.getByRole('button', { name: /^reading\s*read a novel/ })).toBeVisible();

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('button', { name: /^reading\s*read a novel/ })).toHaveCount(0);
  // Undo doesn't bring the bridge back: it was one moment.
  await expect(bridge(page)).toHaveCount(0);
  await underNoThread(page, 'read a novel');
  await counts(page, '1 activities · 0 threads');
});

test('with a thread, a plain log offers it as a chip; tapping attaches, Undo reverts', async ({ page }) => {
  await openHome(page);
  await makeThread(page, 'scales', 'play guitar');
  await logLine(page, 'read a novel');

  const chip = bridge(page).getByRole('button', { name: 'Attach to play guitar' });
  await expect(chip).toBeVisible();
  await chip.click();
  await expect(page.getByText('Attached → to play guitar', { exact: true })).toBeVisible();
  await expect(bridge(page)).toHaveCount(0);
  await expect(logBox(page)).toBeFocused();

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('Attached → to play guitar', { exact: true })).toHaveCount(0);
  await underNoThread(page, 'read a novel');
});

test('a double tap on a chip attaches once (one Undo reverts it)', async ({ page }) => {
  await openHome(page);
  await makeThread(page, 'scales', 'play guitar');
  await logLine(page, 'read a novel');
  const chip = bridge(page).getByRole('button', { name: 'Attach to play guitar' });
  await expect(chip).toBeVisible();
  // Two presses before React re-renders: the second must find the bridge already done.
  await chip.evaluate((el) => {
    (el as HTMLElement).click();
    (el as HTMLElement).click();
  });
  await expect(page.getByText('Attached → to play guitar', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await underNoThread(page, 'read a novel');
});

test('ignoring the bridge writes nothing; a reload drops it and keeps the activity', async ({ page }) => {
  await openHome(page);
  await makeThread(page, 'scales', 'play guitar');
  await logLine(page, 'read a novel');
  await expect(bridge(page)).toBeVisible();
  await page.reload();
  await expect(logBox(page)).toBeVisible();
  await expect(page.getByText(QUESTION)).toHaveCount(0);
  await counts(page, '2 activities · 1 threads');
  await page.goto('./');
  await underNoThread(page, 'read a novel');
});

test('"Just itself" hides the bridge and writes nothing', async ({ page }) => {
  await openHome(page);
  await makeThread(page, 'scales', 'play guitar');
  await logLine(page, 'read a novel');
  await bridge(page).getByRole('button', { name: 'Just itself' }).click();
  await expect(bridge(page)).toHaveCount(0);
  await page.reload();
  await expect(logBox(page)).toBeVisible();
  await counts(page, '2 activities · 1 threads');
  await page.goto('./');
  await underNoThread(page, 'read a novel');
});

test('the next log moves the bridge to the newest activity, or clears it when that one has a thread', async ({ page }) => {
  await openHome(page);
  await makeThread(page, 'scales', 'play guitar');
  await logLine(page, 'first');
  await expect(bridge(page)).toBeVisible();

  // An unpicked @word is plain text, so this one has no thread either.
  await logLine(page, 'second @gymm');
  await expect(bridge(page)).toBeVisible();
  await bridge(page).getByRole('button', { name: 'Attach to play guitar' }).click();
  await expect(page.getByText('Attached → to play guitar', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^play guitar\s*second @gymm/ })).toBeVisible();

  await logLine(page, 'third');
  await expect(bridge(page)).toBeVisible();
  await logBox(page).fill('more scales @play');
  await page.getByRole('option', { name: /^play guitar/ }).click();
  await logBox(page).press('Enter');
  await expect(page.getByText('Logged → to play guitar', { exact: true })).toBeVisible();
  await expect(bridge(page)).toHaveCount(0);

  await underNoThread(page, 'first');
  await expect(page.getByText('third', { exact: true }).filter({ visible: true })).toBeVisible();
});

test('leaving Home clears the bridge; a log from Activities neither shows nor announces it', async ({ page }) => {
  await openHome(page);
  await logLine(page, 'read a novel');
  await expect(bridge(page)).toBeVisible();

  await page.getByRole('tab', { name: 'Activities' }).click();
  await page.getByRole('tab', { name: 'Home' }).click();
  await expect(logBox(page)).toBeVisible();
  await expect(bridge(page)).toHaveCount(0);

  await page.getByRole('tab', { name: 'Activities' }).click();
  await expect(page.getByRole('tab', { name: 'No thread' })).toBeVisible();
  await logLine(page, 'watered the plants');
  await expect(page.getByText('watered the plants', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText('Logged', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText(QUESTION)).toHaveCount(0);
  await page.getByRole('tab', { name: 'Home' }).click();
  await expect(logBox(page)).toBeVisible();
  await expect(page.getByText(QUESTION)).toHaveCount(0);
});

test('the question is announced once, politely, by the toast; the bridge is not a live region', async ({ page }) => {
  await openHome(page);
  await logLine(page, 'read a novel');
  await expect(bridge(page)).toBeVisible();

  // The toast keeps its "Logged" line; the question is a second line under it.
  await expect(page.getByText('Logged', { exact: true }).filter({ visible: true })).toBeVisible();
  const regions = page.locator('[aria-live="polite"]').filter({ hasText: QUESTION }).filter({ visible: true });
  await expect(regions).toHaveCount(1);
  const announced = await regions.innerText();
  expect(announced.split(QUESTION).length - 1).toBe(1);
  expect(announced).toContain('Logged');

  await expect(bridge(page)).not.toHaveAttribute('aria-live', /.*/);
  await expect(bridge(page).locator('[aria-live]')).toHaveCount(0);
  await expect(page.locator('[aria-live]').filter({ has: bridge(page) })).toHaveCount(0);
});

test('"+ name it": spaces do nothing, Esc cancels, and naming a hidden thread brings it back', async ({ page }) => {
  await openHome(page);
  await makeThread(page, 'a chapter', 'reading');
  await page.getByRole('button', { name: /^reading\s*a chapter/ }).click();
  await page.getByRole('button', { name: 'Hide' }).click();
  await expect(logBox(page)).toBeVisible();
  await expect(page.getByRole('button', { name: /^reading\s*a chapter/ })).toHaveCount(0);

  await logLine(page, 'read a novel');
  // A hidden thread isn't offered as a chip.
  await expect(bridge(page).getByRole('button')).toHaveText(['+ name it', 'Just itself']);
  await bridge(page).getByRole('button', { name: '+ name it' }).click();
  const field = page.getByRole('textbox', { name: 'Name the thread it was toward' });
  await field.fill('   ');
  await field.press('Enter');
  // Let any blur-on-submit (react-native-web queues it with setTimeout 0) run before checking.
  await page.evaluate(() => new Promise((r) => setTimeout(r, 50)));
  await expect(field).toBeVisible();
  await expect(field).toBeFocused();
  await expect(page.getByText(/^Attached/)).toHaveCount(0);

  await field.press('Escape');
  await expect(field).toHaveCount(0);
  await expect(bridge(page).getByRole('button', { name: '+ name it' })).toBeFocused();

  await bridge(page).getByRole('button', { name: '+ name it' }).click();
  await field.fill('Reading');
  await field.press('Enter');
  await expect(page.getByText('Attached → to reading', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^reading\s*read a novel/ })).toBeVisible();
  await counts(page, '2 activities · 1 threads');
});

test('a scrolled Home brings the bridge into view after a log (audit F2)', async ({ page }) => {
  const names = Array.from({ length: 40 }, (_, i) => `thread ${i + 1}`);
  await page.addInitScript(seedScript, legacyBlob(names, names.map((n, i) => ({ from: n, to: [], text: `on ${n}`, daysAgo: i * 0.1 }))));
  await openHome(page);
  await page.getByRole('button', { name: /^thread 40\s*\S/ }).scrollIntoViewIfNeeded();
  await logLine(page, 'read a novel');
  await expect(bridge(page)).toBeInViewport();
});

test('"Just itself" returns focus to the log box and takes the question off the toast (audit F3, F4)', async ({ page }) => {
  await openHome(page);
  await logLine(page, 'read a novel');
  await expect(page.getByText(QUESTION, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Just itself', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(bridge(page)).toHaveCount(0);
  await expect(logBox(page)).toBeFocused();
  await expect(page.getByText(QUESTION, { exact: true })).toHaveCount(0);
  await expect(page.getByText('Logged', { exact: true })).toBeVisible();
});

test('"+ name it" with a leading @ attaches to the existing thread, no twin (audit F7)', async ({ page }) => {
  await openHome(page);
  await makeThread(page, 'strummed', 'play guitar');
  await logLine(page, 'tuned up');
  await page.getByRole('button', { name: '+ name it' }).click();
  const field = page.getByRole('textbox', { name: 'Name the thread it was toward' });
  await field.fill('@Play   Guitar');
  await field.press('Enter');
  await expect(page.getByText('Attached → to play guitar')).toBeVisible();
  await counts(page, '2 activities · 1 threads');
});

test.describe('on a touch screen', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test('attaching from the bridge or "Just itself" doesn’t focus the log box (no keyboard) (owner, F12)', async ({ page }) => {
    await openHome(page);
    await makeThread(page, 'strummed', 'play guitar');
    await logLine(page, 'tuned up');
    await page.getByRole('button', { name: 'Attach to play guitar' }).tap();
    await expect(page.getByText('Attached → to play guitar')).toBeVisible();
    await expect(logBox(page)).not.toBeFocused();
    await logLine(page, 'read a novel');
    await page.getByRole('button', { name: 'Just itself', exact: true }).tap();
    await expect(bridge(page)).toHaveCount(0);
    await expect(logBox(page)).not.toBeFocused();
  });
});
