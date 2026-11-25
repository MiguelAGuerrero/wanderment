/**
 * P-04: a backup is checked strictly, then previewed; only Replace changes anything.
 * P-89: on Settings in the new app (dark); what is here is read back from an export, record by record.
 */
import { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

import { expect, test } from './fixtures';
import { anotherTab, home, IMPORTED, openSettings as toSettings, saved, setVisibility, startRun, turn } from './goFixture';
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
  await toSettings(page);
  await expect(earlier(page)).toBeVisible();
}

/** The line said only to someone who has wanders or lines from before. */
const earlier = (page: Page) => page.getByText('Your earlier wanders and lines are kept, and are in every export.', { exact: true });

/** The backup Settings exports now (the file's text). */
async function exportNow(page: Page) {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export everything (.json)', exact: true }).click();
  return readFileSync((await (await download).path())!, 'utf8');
}

/** What is here: each line with its wander, and the wanders' names — read from an export. */
async function holds(page: Page) {
  const { data } = JSON.parse(await exportNow(page)) as { data: { threads: Record<string, { name: string }>; activities: Record<string, { text: string; doingId?: string }>; routines: object; runs: object } };
  return {
    lines: Object.values(data.activities).map((a) => `${a.text}${a.doingId ? ` → ${data.threads[a.doingId]?.name}` : ''}`).sort(),
    wanders: Object.values(data.threads).map((t) => t.name).sort(),
    routines: Object.keys(data.routines).length,
    runs: Object.keys(data.runs).length,
  };
}
const AS_SEEDED = { lines: ['jogged → run', 'sketched → draw'], wanders: ['draw', 'run'], routines: 0, runs: 0 };
/** What was here is all still here, record by record (audit F9), not just the counts. */
const intact = async (page: Page) => expect(await holds(page)).toEqual(AS_SEEDED);
const AS_OTHER = { lines: ['cut', 'hemmed → sew', 'pinned'], wanders: ['sew'], routines: 0, runs: 0 };

const preview = (page: Page) => page.getByTestId('import-preview');
const replaceBtn = (page: Page) => page.getByRole('button', { name: 'Replace', exact: true });
const REPLACE_TITLE = 'Replace what’s here with this backup?';
const importBtn = (page: Page) => page.getByRole('button', { name: 'Import from a backup' });
const NO_UNDO = 'Replacing can’t be undone yet. Export first if unsure.';

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
  await intact(page);
  await page.reload();
  await intact(page);
});

test('Replace (keyboard only) imports it, and it survives a reload', async ({ page }) => {
  await openSettings(page);
  await choose(page, OTHER);
  await expect(page.getByRole('group', { name: REPLACE_TITLE })).toBeFocused();
  // A confirm with no Undo: Cancel is the first stop, Replace the second.
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(replaceBtn(page)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText(IMPORTED, { exact: true })).toBeVisible();
  await expect(preview(page)).toHaveCount(0);
  await expect(importBtn(page)).toBeFocused();
  expect(await holds(page)).toEqual(AS_OTHER);
  await page.reload();
  expect(await holds(page)).toEqual(AS_OTHER);
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
  await intact(page);
});

test('the same file again says it matches, with no Replace', async ({ page }) => {
  await openSettings(page);
  await choose(page, await exportNow(page));
  await expect(page.getByRole('group', { name: 'This backup matches what’s here.' })).toBeFocused();
  await expect(preview(page)).toContainText('Nothing would change.');
  await expect(replaceBtn(page)).toHaveCount(0);
  await expect(preview(page)).not.toContainText(NO_UNDO);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/import-identical.png`, fullPage: true });
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(preview(page)).toHaveCount(0);
  await expect(importBtn(page)).toBeFocused();
  await intact(page);
});

test('a preview whose comparison changes under it (another tab changed what’s here) says so (audit F6)', async ({ page, context }) => {
  await openSettings(page);
  await choose(page, await exportNow(page));
  await expect(preview(page)).toContainText('Nothing would change.');
  // Another tab takes the data while this one is in the background, and starts something.
  const b = await context.newPage();
  await b.goto('./go');
  await expect(anotherTab(b)).toBeVisible({ timeout: 20_000 });
  await turn(page, 'hidden');
  await expect(home(b).screen).toBeVisible({ timeout: 15_000 });
  await startRun(b, 'made in the other tab');
  await saved(b);
  await setVisibility(b, 'hidden');
  await turn(page, 'visible');
  await expect(page.getByText('What’s here just changed — check the comparison again.')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('group', { name: REPLACE_TITLE })).toBeVisible();
  await expect(preview(page)).toContainText('Replacing would remove 1 routine, and remove 1 run.');
});

/** A backup made by the new app alone: routines and a run, no lines, no wanders. */
const ROUTINES_ONLY = JSON.stringify({
  app: 'wanderment',
  exportedAt: at(60),
  data: {
    version: 2,
    threads: {},
    activities: {},
    routines: { m: { id: 'm', words: 'Morning', named: true, createdAt: at(2), items: [{ id: 'm-0', text: 'Stretch' }], open: true, home: true } },
    runs: { n: { id: 'n', routineId: 'm', startedAt: at(3), frames: [{ seq: 'm', at: 'm-0', round: 1 }], changes: [], status: 'paused', touchedAt: at(3) } },
  },
});

test('a backup holding only routines, over earlier lines and wanders: it says what replacing removes; Cancel is the filled button and the first stop, Replace is the red one; Return and the default action replace nothing', async ({ page }) => {
  await openSettings(page);
  await choose(page, ROUTINES_ONLY);
  const group = page.getByRole('group', { name: REPLACE_TITLE });
  await expect(group).toBeFocused();
  // No "0 activities, 0 wanders": only what the backup has.
  await expect(preview(page)).toContainText('This backup has 1 routine and 1 run.');
  await expect(preview(page)).toContainText('Replacing would remove 2 activities, and remove 2 wanders, and add 1 routine, and add 1 run.');
  await expect(preview(page)).toContainText(NO_UNDO);
  const cancelBtn = page.getByRole('button', { name: 'Cancel', exact: true });
  const style = (el: Element) => ({ fill: getComputedStyle(el).backgroundColor, border: getComputedStyle(el).borderTopColor });
  // Filled = the safe choice (paper); Replace is outlined in the colour kept for what can't be undone.
  expect((await cancelBtn.evaluate(style)).fill).toBe('rgb(244, 241, 232)');
  expect(await replaceBtn(page).evaluate(style)).toEqual({ fill: 'rgba(0, 0, 0, 0)', border: 'rgb(255, 138, 122)' });
  // In the order they are read and reached: Cancel, then Replace.
  expect(await preview(page).getByRole('button').allTextContents()).toEqual(['Cancel', 'Replace']);
  // Return with the preview focused does nothing at all.
  await page.keyboard.press('Enter');
  await expect(preview(page)).toBeVisible();
  // The first stop is Cancel: Return there puts the preview away and replaces nothing.
  await page.keyboard.press('Tab');
  await expect(cancelBtn).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(preview(page)).toHaveCount(0);
  await expect(page.getByText(IMPORTED, { exact: true })).toHaveCount(0);
  await intact(page);
  await expect(earlier(page)).toBeVisible();
  await page.reload();
  await intact(page);
  // Chosen on purpose it still works, and then nothing says earlier data is kept (there is none).
  await choose(page, ROUTINES_ONLY);
  await replaceBtn(page).click();
  await expect(page.getByText(IMPORTED, { exact: true })).toBeVisible();
  expect(await holds(page)).toEqual({ lines: [], wanders: [], routines: 1, runs: 1 });
  await expect(earlier(page)).toHaveCount(0);
});

test('a brand-new person importing a new-app backup is told nothing about activities or wanders', async ({ page }) => {
  await toSettings(page);
  await choose(page, ROUTINES_ONLY);
  await expect(preview(page)).toContainText('This backup has 1 routine and 1 run.');
  await expect(preview(page)).toContainText('Replacing would add 1 routine, and add 1 run.');
  await expect(preview(page)).not.toContainText(/activit|wander/);
});

test('an empty backup over data warns plainly, and can still be confirmed', async ({ page }) => {
  await openSettings(page);
  await choose(page, backup([], []));
  await expect(preview(page)).toContainText('This backup is empty.');
  await expect(preview(page)).toContainText('Replacing would remove all 2 activities and 2 wanders here.');
  await expect(preview(page)).toContainText(NO_UNDO);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/import-empty.png`, fullPage: true });
  // It would remove everything: Cancel is the first step and the filled (safe) button (audit F3; B-11 §6).
  await expect(page.getByRole('group', { name: REPLACE_TITLE })).toBeFocused();
  await page.keyboard.press('Tab');
  const cancelBtn = page.getByRole('button', { name: 'Cancel', exact: true });
  await expect(cancelBtn).toBeFocused();
  const fill = (el: Element) => getComputedStyle(el).backgroundColor;
  expect(await cancelBtn.evaluate(fill)).toBe('rgb(244, 241, 232)');
  expect(await replaceBtn(page).evaluate(fill)).not.toBe('rgb(244, 241, 232)');
  await replaceBtn(page).click();
  await expect(page.getByText(IMPORTED, { exact: true })).toBeVisible();
  const EMPTY = { lines: [], wanders: [], routines: 0, runs: 0 };
  expect(await holds(page)).toEqual(EMPTY);
  // Nothing from before is here any more, so nothing says it is.
  await expect(earlier(page)).toHaveCount(0);
  await page.reload();
  expect(await holds(page)).toEqual(EMPTY);
  await expect(earlier(page)).toHaveCount(0);
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
  await expect(page.getByText(IMPORTED, { exact: true })).toBeVisible();
  const big2 = await holds(page);
  expect([big2.lines.length, big2.wanders.length]).toEqual([4000, 220]);
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
  await setVisibility(page, 'visible');
  await expect(notice).toHaveCount(0);
  await expect(preview(page)).toBeVisible();
  // Nothing was replaced meanwhile: the comparison is the same one.
  await expect(preview(page)).toContainText('Replacing would add 3 and remove 2 activities, and add 1 and remove 2 wanders.');
  await replaceBtn(page).click();
  await expect(page.getByText(IMPORTED, { exact: true })).toBeVisible();
  await page.reload();
  expect(await holds(page)).toEqual(AS_OTHER);
});
