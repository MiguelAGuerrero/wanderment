/**
 * P-89: Settings in the new app (B-11 §5) — where the data lives, Export, Import with its preview, the
 * version — reached by one control on the home; and the line that tells someone with data from before
 * this design that it is kept. Expected values: the roadmap item, its contract (rulings 2, 4, 5, 6)
 * and B-11 §6.
 */
import { readFileSync } from 'node:fs';

import { expect, test } from './fixtures';
import { chooseBackup, expectInside, goBackup, home, IMPORTED, MAYA, openGo, openSettings, seedGo, settled, startRun, startThing } from './goFixture';
import { legacyBlob, seedScript } from './graphFixture';

const EARLIER = 'Your earlier wanders and lines are kept, and are in every export.';
const settings = (page: import('@playwright/test').Page) => settled(page, 'settings');
/** An existing person: two wanders (one hidden by the old app's blob is not needed here) and two lines. */
const world = () =>
  legacyBlob(['draw', 'make apparel'], [
    { from: 'draw', to: ['make apparel'], text: 'sketched', daysAgo: 400 },
    { text: 'cooked dinner', daysAgo: 0.5 },
  ]);
const rgb = (hex: string) => `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;
/** The new look's colours (components/go/tokens.ts, from B-11's mockups). */
const BG = rgb('#0F1014');
const TEXT = rgb('#F4F1E8');

test('from the home: the Settings control opens it, the title has the focus, and Back returns to the home as it was', async ({ page }) => {
  await seedGo(page, MAYA);
  await openGo(page);
  await home(page).prompt.fill('app');
  await home(page).screen.getByRole('button', { name: 'Settings', exact: true }).click();
  const s = settings(page);
  await expect(s.getByRole('heading', { level: 1 })).toHaveText('Settings');
  await expect(s.getByRole('heading', { level: 1 })).toBeFocused();
  await expect(page).toHaveURL(/\/wanderment\/go\/settings$/);
  await s.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(home(page).screen).toBeVisible();
  await expect(page).toHaveURL(/\/wanderment\/go$/);
  await expect(home(page).tiles).not.toHaveCount(0);
  // By the keyboard too: the control is a button, reached by Tab, pressed with Enter; browser Back returns.
  await expect(home(page).title).toBeFocused();
  await home(page).screen.getByRole('button', { name: 'Settings', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(settings(page)).toBeVisible();
  await page.goBack();
  await expect(home(page).screen).toBeVisible();
});

test('opened by its address with nothing beneath it, Back goes to the home', async ({ page }) => {
  await openSettings(page);
  await settings(page).getByRole('button', { name: 'Back', exact: true }).click();
  await expect(home(page).screen).toBeVisible();
  await expect(page).toHaveURL(/\/wanderment\/go$/);
});

test('with a run going, Settings is still one step from the home, and leaves the run as it was', async ({ page }) => {
  await openGo(page);
  await startRun(page, 'Bake bread');
  await page.goBack();
  await expect(home(page).title).toHaveText('Running');
  await home(page).screen.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(settings(page)).toBeVisible();
  await settings(page).getByRole('button', { name: 'Back', exact: true }).click();
  await expect(home(page).title).toHaveText('Running');
  await expect(home(page).tiles).toHaveCount(1);
});

test('it is dark, in the new look: the screen, its words and the import preview', async ({ page }) => {
  await page.addInitScript(seedScript, world());
  await openSettings(page);
  const s = settings(page);
  expect(await s.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(BG);
  expect(await page.getByTestId('go-settings-where').evaluate((el) => getComputedStyle(el).color)).toBe(TEXT);
  expect(await s.getByRole('heading', { level: 1 }).evaluate((el) => getComputedStyle(el).fontFamily)).toContain('Pixelify Sans');
  expect(await page.getByTestId('go-settings-where').evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  // Nothing light is left on the page behind it.
  expect(await page.evaluate(() => [...document.querySelectorAll('div')].filter((d) => getComputedStyle(d).backgroundColor === 'rgb(245, 243, 238)').length)).toBe(0);
  await chooseBackup(page, goBackup(MAYA));
  const card = page.getByTestId('import-preview');
  await expect(card).toBeVisible();
  expect(await card.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(rgb('#1A1C23'));
  // One filled button, and in a confirm with no Undo it is the safe one (DESIGN.md: Cancel is filled).
  const filled = await card.getByRole('button').evaluateAll((els) => els.filter((el) => getComputedStyle(el).backgroundColor === 'rgb(244, 241, 232)').map((el) => el.textContent));
  expect(filled).toEqual(['Cancel']);
  await expectInside(page, [card.getByRole('button', { name: 'Replace', exact: true }), card.getByRole('button', { name: 'Cancel', exact: true })]);
});

test('it says where the data lives and the version, and offers Export and Import; there are no counts and nothing about the old app’s screens', async ({ page }) => {
  await seedGo(page, MAYA);
  const s = settings(page);
  await expect(page.getByTestId('go-settings-where')).toHaveText('Saved in a database in this browser.');
  await expect(page.getByTestId('go-settings-version')).toHaveText(/^Version \S+ · \d{1,2} [A-Z][a-z]{2} \d{4}$/);
  await expect(s.getByRole('button', { name: 'Export everything (.json)', exact: true })).toBeVisible();
  await expect(s.getByRole('button', { name: 'Import from a backup', exact: true })).toBeVisible();
  // The retired controls are gone, and so is the tally (B-11 §6: counts only in the import preview).
  for (const gone of [/Recency shading/, /Hidden wanders/, /Unhide/, /\d+ activities · \d+ wanders/, /no notifications/i, /Erase/]) await expect(s.getByText(gone)).toHaveCount(0);
  await expect(s.getByRole('switch')).toHaveCount(0);
  await expect(s.getByRole('button', { name: 'Done', exact: true })).toHaveCount(0);
});

test('Export downloads everything as a dated .json backup, and says so', async ({ page }) => {
  await page.addInitScript(seedScript, world());
  await seedGoKeeping(page);
  const download = page.waitForEvent('download');
  await settings(page).getByRole('button', { name: 'Export everything (.json)', exact: true }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^wanderment-\d{4}-\d\d-\d\d\.json$/);
  await expect(page.getByTestId('go-settings-said')).toHaveText('Exported.');
  const backup = JSON.parse(readFileSync((await file.path())!, 'utf8'));
  expect(backup.app).toBe('wanderment');
  expect(backup.data.version).toBe(2);
  // The old data and the new, together.
  expect(Object.values(backup.data.threads as Record<string, { name: string }>).map((t) => t.name).sort()).toEqual(['draw', 'make apparel']);
  expect(Object.values(backup.data.activities as Record<string, { text: string }>).map((a) => a.text).sort()).toEqual(['cooked dinner', 'sketched']);
  expect(Object.values(backup.data.routines as Record<string, { words: string }>).map((r) => r.words)).toEqual(['Bake bread']);
  expect(Object.keys(backup.data.runs)).toHaveLength(1);
});

/** With the old data seeded: starts one thing in the new app, then opens Settings. */
async function seedGoKeeping(page: import('@playwright/test').Page) {
  await openGo(page);
  await startRun(page, 'Bake bread');
  await openSettings(page);
}

test.describe('the “earlier data is kept” line shows only when such data exists', () => {
  test('a brand-new person: no line', async ({ page }) => {
    await openSettings(page);
    await expect(page.getByTestId('go-settings-where')).toBeVisible();
    await expect(page.getByText(EARLIER)).toHaveCount(0);
    await expect(page.getByTestId('go-settings-earlier')).toHaveCount(0);
  });

  test('someone who has only used the new app (routines and runs): no line', async ({ page }) => {
    await seedGo(page, MAYA, [{ id: 'r1', routine: 'apply', at: 1, status: 'paused' }]);
    await page.reload();
    await expect(page.getByTestId('go-settings-where')).toBeVisible();
    await expect(page.getByTestId('go-settings-earlier')).toHaveCount(0);
  });

  test('an existing person with years of old data and nothing new: one line, in words, with no counts; it stays after they use the new app', async ({ page }) => {
    await page.addInitScript(seedScript, world());
    await openSettings(page);
    const line = page.getByTestId('go-settings-earlier');
    await expect(line).toHaveText(EARLIER);
    expect(EARLIER).not.toMatch(/\d/);
    await expect(page.getByText(EARLIER)).toHaveCount(1);
    await openGo(page);
    await startThing(page, 'Bake bread');
    await openSettings(page);
    await expect(line).toHaveText(EARLIER);
  });

  test('someone with only a hidden wander from before (it can no longer be unhidden): the line shows — it is still kept and exported', async ({ page }) => {
    const blob = JSON.parse(legacyBlob(['secret'], []));
    blob.state.data.threads.secret.hidden = true;
    await page.addInitScript(seedScript, JSON.stringify(blob));
    await openSettings(page);
    await expect(page.getByTestId('go-settings-earlier')).toHaveText(EARLIER);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export everything (.json)', exact: true }).click();
    const backup = JSON.parse(readFileSync((await (await download).path())!, 'utf8'));
    expect(backup.data.threads.secret).toMatchObject({ name: 'secret', hidden: true });
  });

  test('importing a backup that holds old data makes the line appear; importing one without makes it go', async ({ page }) => {
    await openSettings(page);
    await expect(page.getByTestId('go-settings-earlier')).toHaveCount(0);
    const old = JSON.parse(world()).state.data;
    await chooseBackup(page, JSON.stringify({ app: 'wanderment', exportedAt: '2026-01-04T00:00:00.000Z', data: old }));
    await expect(page.getByTestId('import-preview')).toContainText('This backup has 2 activities and 2 wanders');
    await page.getByRole('button', { name: 'Replace', exact: true }).click();
    await expect(page.getByText(IMPORTED, { exact: true })).toBeVisible();
    await expect(page.getByTestId('go-settings-earlier')).toHaveText(EARLIER);
    await chooseBackup(page, goBackup(MAYA));
    await page.getByRole('button', { name: 'Replace', exact: true }).click();
    await expect(page.getByTestId('go-settings-earlier')).toHaveCount(0);
  });
});

test('at 200 % zoom (195 px wide) and at 320 px nothing leaves the screen, the words wrap, and the page scrolls to its last control', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.storage.persisted = async () => false;
    navigator.storage.persist = async () => false;
  });
  await page.addInitScript(seedScript, world());
  for (const size of [{ width: 195, height: 422 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(size);
    await openSettings(page);
    const s = settings(page);
    const width = await page.evaluate(() => document.documentElement.clientWidth);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    for (const name of ['Back', 'Ask the browser to keep it', 'Export everything (.json)', 'Import from a backup', 'Check for updates']) {
      const button = s.getByRole('button', { name, exact: true });
      await button.scrollIntoViewIfNeeded();
      const box = (await button.boundingBox())!;
      expect(box.x, name).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, name).toBeLessThanOrEqual(width);
      await expect(button, name).toBeInViewport();
    }
    const cut = await s.evaluate((el) => [...el.querySelectorAll('div[dir="auto"]')].filter((t) => t.scrollWidth > t.clientWidth + 1).length);
    expect(cut).toBe(0);
  }
});
