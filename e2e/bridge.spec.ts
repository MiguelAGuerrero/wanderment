/**
 * The bridge after a plain log ("Logged. Toward something — or just itself?", P-13/P-24) was removed by
 * P-61 (owner, D-11, 2026-11-23): the target is chosen before logging (the log field's suggestions, a
 * tap on a node), and a loose log is attached from Home's strip of loose logs (P-60) or its page. The
 * bridge component was shared by Home and the Wanders section, so it went from both. These tests say
 * it stays gone; the ones about its chips, "+ name it" and "Just itself" (with audit F2, F3, F4, F7,
 * F8, F12) went with it.
 */
import { Page } from '@playwright/test';

import { expect, logBox, logLine, openHome, openSheet, openWanders, test, toHome } from './fixtures';

const QUESTION = 'Toward something — or just itself?';

const bridge = (page: Page) => page.getByRole('group', { name: 'Attach what you just logged' });

async function makeThread(page: Page, text: string, name: string) {
  await logBox(page).fill(`${text} @${name}`);
  await page.getByRole('option', { name: `+ New wander “${name}”` }).click();
  await logBox(page).press('Enter');
  await expect(page.getByText(`Logged → ${name}`)).toBeVisible(); // P-61: was “Logged → to …”
}

async function counts(page: Page, text: string) {
  await page.goto('./settings');
  await expect(page.getByText(text)).toBeVisible();
}

async function underNoThread(page: Page, text: string) {
  await openSheet(page, 'Activities'); // P-58: a section of Home's sheet (was a tab)
  await page.getByRole('tab', { name: 'No wander' }).click();
  await expect(page.getByText(text, { exact: true }).filter({ visible: true })).toBeVisible();
}

/** The toast after a plain log: "Logged", Undo, nothing asked. */
async function plainLogged(page: Page) {
  await expect(page.getByText('Logged', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Undo' }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText(QUESTION)).toHaveCount(0);
  await expect(bridge(page)).toHaveCount(0);
}

// P-61: was "first ever log: the bridge asks, "+ name it" attaches, and Undo leaves no thread".
test('first ever log, from the Wanders section: “Logged”, nothing asked; it stays under No wander', async ({ page }) => {
  await openWanders(page);
  await logLine(page, 'read a novel');
  await plainLogged(page);
  await underNoThread(page, 'read a novel');
  await counts(page, '1 activities · 0 wanders');
});

// P-61: was "with a thread, a plain log offers it as a chip; …" and "ignoring the bridge writes nothing; …".
test('on Home with a wander, a plain log asks nothing and writes nothing more; a reload keeps it unattached', async ({ page }) => {
  await openHome(page);
  await makeThread(page, 'scales', 'play guitar');
  await logLine(page, 'read a novel');
  await plainLogged(page);
  await page.reload();
  await expect(logBox(page)).toBeVisible();
  await expect(page.getByText(QUESTION)).toHaveCount(0);
  await counts(page, '2 activities · 1 wanders');
  await page.goto('./map'); // P-65: graph moved to Map
  await underNoThread(page, 'read a novel');
});

// P-61: was "leaving Home clears the bridge; a log from Activities neither shows nor announces it".
test('a log from Home, Wanders or Activities never shows or announces the question', async ({ page }) => {
  await openHome(page);
  await logLine(page, 'read a novel');
  await plainLogged(page);
  await openSheet(page, 'Wanders');
  await logLine(page, 'stretched');
  await plainLogged(page);
  await openSheet(page, 'Activities');
  await logLine(page, 'watered the plants');
  await expect(page.getByText('watered the plants', { exact: true }).filter({ visible: true })).toBeVisible();
  await plainLogged(page);
  await toHome(page);
  await expect(page.getByText(QUESTION)).toHaveCount(0);
  await expect(page.locator('[aria-live]').filter({ hasText: QUESTION })).toHaveCount(0);
});

// P-61: was "the question is announced once, politely, by the toast; the bridge is not a live region".
test('the toast announces “Logged”, politely, with no question line', async ({ page }) => {
  await openHome(page);
  await logLine(page, 'read a novel');
  const regions = page.locator('[aria-live="polite"]').filter({ hasText: 'Logged' }).filter({ visible: true });
  await expect(regions).toHaveCount(1);
  expect(await regions.innerText()).not.toContain(QUESTION);
});
