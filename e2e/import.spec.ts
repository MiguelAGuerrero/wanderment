/** P-04: a backup is checked strictly, then previewed; only Replace changes anything. */
import { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { bigBlob, legacyBlob, seedScript } from './graphFixture';

const SHOTS = process.env.E2E_SHOTS; // set to a folder to save screenshots for a visual check

const at = (day: number) => new Date(Date.UTC(2026, 0, day, 12)).toISOString();
const thread = (id: string, name: string, extra: Record<string, unknown> = {}) => ({ id, name, hidden: false, createdAt: at(1), ...extra });
const act = (id: string, text: string, day: number, extra: Record<string, unknown> = {}) => ({ id, text, occurredAt: at(day), createdAt: at(day), toIds: [], ...extra });
const backup = (threads: unknown[], activities: unknown[]) =>
  JSON.stringify({
    app: 'wanderment',
    exportedAt: at(60),
    data: {
      version: 1,
      threads: Object.fromEntries((threads as { id: string }[]).map((t) => [t.id, t])),
      activities: Object.fromEntries((activities as { id: string }[]).map((a) => [a.id, a])),
    },
  });

/** Here: 2 activities ("sketched", "jogged") and 2 wanders ("draw", "run"). */
async function openSettings(page: Page) {
  await page.addInitScript(
    seedScript,
    legacyBlob(['draw', 'run'], [
      { from: 'draw', text: 'sketched', daysAgo: 1 },
      { from: 'run', text: 'jogged', daysAgo: 2 },
    ]),
  );
  await page.goto('./settings');
  await expect(here(page, 2, 2)).toBeVisible();
}

const here = (page: Page, activities: number, wanders: number) => page.getByText(`${activities} activities · ${wanders} wanders`, { exact: true });
const preview = (page: Page) => page.getByTestId('import-preview');
const replaceBtn = (page: Page) => page.getByRole('button', { name: 'Replace', exact: true });
const REPLACE_TITLE = 'Replace what’s here with this backup?';
const importBtn = (page: Page) => page.getByRole('button', { name: 'Import from a backup' });
const NO_UNDO = 'Replacing can’t be undone yet. Export first if unsure.';

/** What was here is all still here, record by record (audit F9), not just the counts. */
async function intact(page: Page) {
  for (const [wander, log] of [
    ['draw', 'sketched'],
    ['run', 'jogged'],
  ]) {
    await page.goto(`./thread/${wander}`);
    await expect(page.getByRole('button', { name: 'Rename' })).toBeVisible();
    await expect(page.getByText(log, { exact: true }).filter({ visible: true }).first()).toBeVisible();
  }
}

/** P-29 (emulated, as in handoff.spec.ts): hidden, the page lets go of the data; shown, it takes it back. */
async function setVisibility(page: Page, state: 'hidden' | 'visible') {
  await page.evaluate((v) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => v === 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);
}
/** The page has let go: it no longer holds the tab lock (released last, after the gate closed). */
const letGo = (page: Page) => expect.poll(() => page.evaluate(async () => (await navigator.locks.query()).held?.length ?? 0)).toBe(0);

async function choose(page: Page, json: string, name = 'backup.json') {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import from a backup' }).click();
  await (await chooser).setFiles({ name, mimeType: 'application/json', buffer: Buffer.from(json) });
}

/** 3 activities over 1 new wander, none of them here. */
const OTHER = backup([thread('sew', 'sew')], [act('i1', 'hemmed', 3, { doingId: 'sew' }), act('i2', 'pinned', 9), act('i3', 'cut', 20)]);

test('choosing a file shows what it holds and what would change; Cancel changes nothing', async ({ page }) => {
  await openSettings(page);
  await choose(page, OTHER);
  // Focus moves to it, so it's announced.
  await expect(page.getByRole('group', { name: REPLACE_TITLE })).toBeFocused();
  await expect(preview(page)).toContainText(/This backup has 3 activities and 1 wander, from \S.*2026\./);
  await expect(preview(page)).toContainText('Replacing would add 3 and remove 2 activities, and add 1 and remove 2 wanders.');
  await expect(preview(page)).toContainText(NO_UNDO);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/import-preview.png`, fullPage: true });

  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(preview(page)).toHaveCount(0);
  // Focus goes back where importing started (audit F6).
  await expect(importBtn(page)).toBeFocused();
  await expect(here(page, 2, 2)).toBeVisible();
  await page.reload();
  await expect(here(page, 2, 2)).toBeVisible();
  await intact(page);
});

test('Replace (keyboard only) imports it, and it survives a reload', async ({ page }) => {
  await openSettings(page);
  await choose(page, OTHER);
  await expect(page.getByRole('group', { name: REPLACE_TITLE })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(replaceBtn(page)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Imported 3 activities.')).toBeVisible();
  await expect(preview(page)).toHaveCount(0);
  await expect(importBtn(page)).toBeFocused();
  await expect(here(page, 3, 1)).toBeVisible();
  await page.reload();
  await expect(here(page, 3, 1)).toBeVisible();
});

test('a damaged file says what’s wrong and nothing changes', async ({ page }) => {
  await openSettings(page);
  await choose(page, '{"app": "wanderment", "data": ');
  await expect(page.getByText('That file isn’t valid JSON.')).toBeVisible();
  await expect(preview(page)).toHaveCount(0);
  await choose(page, JSON.stringify({ app: 'wanderment', exportedAt: at(1), data: { version: 3, threads: {}, activities: {} } }));
  await expect(page.getByText(/newer version/)).toBeVisible();
  await expect(preview(page)).toHaveCount(0);
  await page.reload();
  await expect(here(page, 2, 2)).toBeVisible();
  await intact(page);
});

test('a file with two wanders of the same name (one hidden) is refused, naming both', async ({ page }) => {
  await openSettings(page);
  await choose(page, backup([thread('a', 'draw'), thread('b', 'Draw', { hidden: true })], []));
  await expect(
    page.getByText('Two wanders have the same name: “draw” and “Draw” (hidden). Rename one in the file, or in the app the backup came from and export it again.'),
  ).toBeVisible();
  await expect(preview(page)).toHaveCount(0);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/import-refused.png`, fullPage: true });
  await page.reload();
  await expect(here(page, 2, 2)).toBeVisible();
  await intact(page);
});

test('the same file again says it matches, with no Replace', async ({ page }) => {
  await openSettings(page);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export everything (.json)' }).click();
  const { readFileSync } = await import('node:fs');
  const json = readFileSync((await (await download).path())!, 'utf8');
  await choose(page, json);
  await expect(page.getByRole('group', { name: 'This backup matches what’s here.' })).toBeFocused();
  await expect(preview(page)).toContainText('Nothing would change.');
  await expect(replaceBtn(page)).toHaveCount(0);
  await expect(preview(page)).not.toContainText(NO_UNDO);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/import-identical.png`, fullPage: true });
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(preview(page)).toHaveCount(0);
  await expect(importBtn(page)).toBeFocused();
  await expect(here(page, 2, 2)).toBeVisible();
});

test('a preview whose comparison changes under it (an Unhide here) says so (audit F6)', async ({ page }) => {
  await page.addInitScript(seedScript, legacyBlob(['draw'], [{ from: 'draw', text: 'sketched', daysAgo: 1 }]));
  await page.goto('./thread/draw');
  await page.getByRole('button', { name: 'Hide' }).click();
  await page.goto('./settings');
  await expect(here(page, 1, 1)).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export everything (.json)' }).click();
  const { readFileSync } = await import('node:fs');
  await choose(page, readFileSync((await (await download).path())!, 'utf8'));
  await expect(preview(page)).toContainText('Nothing would change.');
  await page.getByRole('button', { name: 'Unhide' }).click();
  await expect(page.getByText('What’s here just changed — check the comparison again.')).toBeVisible();
  await expect(page.getByRole('group', { name: REPLACE_TITLE })).toBeVisible();
  await expect(preview(page)).toContainText('Replacing would change 1 wander.');
});

test('an empty backup over data warns plainly, and can still be confirmed', async ({ page }) => {
  await openSettings(page);
  await choose(page, backup([], []));
  await expect(preview(page)).toContainText('This backup has no activities and no wanders.');
  await expect(preview(page)).toContainText('Replacing would remove all 2 activities and 2 wanders here.');
  await expect(preview(page)).toContainText(NO_UNDO);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/import-empty.png`, fullPage: true });
  // It would remove everything: Cancel is the first step, and Replace isn't the dark primary button (audit F3).
  await expect(page.getByRole('group', { name: REPLACE_TITLE })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  const dark = await replaceBtn(page).evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(dark).not.toBe('rgb(24, 24, 27)');
  await replaceBtn(page).click();
  await expect(page.getByText('Imported 0 activities.')).toBeVisible();
  await expect(here(page, 0, 0)).toBeVisible();
  await page.reload();
  await expect(here(page, 0, 0)).toBeVisible();
});

test('choosing another file while a preview is open replaces the preview; a big file previews promptly', async ({ page }) => {
  await openSettings(page);
  await choose(page, OTHER);
  await expect(preview(page)).toContainText('This backup has 3 activities');
  const big = JSON.parse(bigBlob()).state.data;
  const t0 = Date.now();
  await choose(page, JSON.stringify({ app: 'wanderment', exportedAt: at(1), data: big }), 'big.json');
  await expect(preview(page)).toContainText('This backup has 4000 activities and 220 wanders');
  expect(Date.now() - t0).toBeLessThan(5000);
  await expect(preview(page)).toHaveCount(1);
  await expect(page.getByRole('group', { name: REPLACE_TITLE })).toBeFocused();
  await replaceBtn(page).click();
  await expect(here(page, 4000, 220)).toBeVisible();
});

test('at 200 % zoom (195 px wide) the preview’s words wrap and its buttons stay on screen', async ({ page }) => {
  await page.setViewportSize({ width: 195, height: 422 });
  await openSettings(page);
  await choose(page, OTHER);
  await expect(page.getByRole('group', { name: REPLACE_TITLE })).toBeFocused();
  const width = await page.evaluate(() => document.documentElement.clientWidth);
  for (const el of [preview(page), replaceBtn(page), page.getByRole('button', { name: 'Cancel', exact: true })]) {
    const box = (await el.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
  }
  const overflowing = await preview(page).evaluate((card) => [...card.querySelectorAll('div[dir="auto"]')].filter((t) => t.scrollWidth > t.clientWidth + 1).length);
  expect(overflowing).toBe(0);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/import-preview-200.png`, fullPage: true });
});

test('while reconnecting, Replace is refused with the quiet note and the preview stays; the note goes once the data is back (audit F7)', async ({ page }) => {
  await openSettings(page);
  await choose(page, OTHER);
  await expect(preview(page)).toBeVisible();
  await setVisibility(page, 'hidden');
  await letGo(page);
  await replaceBtn(page).click();
  const notice = page.getByText('Just a moment — reconnecting.', { exact: true }).filter({ visible: true });
  await expect(notice).toBeVisible();
  await expect(preview(page)).toBeVisible();
  await expect(here(page, 2, 2)).toBeVisible();
  await setVisibility(page, 'visible');
  await expect(notice).toHaveCount(0);
  await expect(preview(page)).toBeVisible();
  await replaceBtn(page).click();
  await expect(page.getByText('Imported 3 activities.')).toBeVisible();
  await page.reload();
  await expect(here(page, 3, 1)).toBeVisible();
});
