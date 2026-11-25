/**
 * P-88: the new app opens by default. The app's address (`/`, the installed icon's start_url) lands on
 * the new home (`/go`), which still opens where you left off; the old home lives at `/old`, and its own
 * close / Back / home links stay inside the old app. Expected values: the roadmap item and its contract.
 */
import { Page } from '@playwright/test';

import { AT_OLD, expect, OLD, openSheet, PROMPT, test, toHome } from './fixtures';
import { home, MAYA, paused, runner, seedGo, settled } from './goFixture';
import { legacyBlob, seedScript } from './graphFixture';

const AT_GO = /\/wanderment\/go$/;
const oldField = (page: Page) => page.getByRole('textbox', { name: PROMPT, exact: true });
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Wanders and activities', exact: true });

/** The old app's data: one why with a wander feeding it, and a line. */
const world = () =>
  legacyBlob(['draw', 'make apparel'], [
    { from: 'draw', to: ['make apparel'], text: 'sketched', daysAgo: 1 },
    { text: 'cooked dinner', daysAgo: 0.5 },
  ]);

async function waitForServiceWorkerControl(page: Page) {
  await page.waitForFunction(async () => {
    const reg = await navigator.serviceWorker.ready;
    return !!reg.active && !!navigator.serviceWorker.controller;
  });
}

test.describe('the app’s address opens the new home', () => {
  test('a first-ever open with no data lands on the new home’s empty state, not the old first run', async ({ page }) => {
    await page.goto('./');
    const h = home(page);
    await expect(h.screen).toBeVisible();
    await expect(page).toHaveURL(AT_GO);
    await expect(h.title).toHaveText('Nothing running');
    await expect(h.prompt).toBeVisible();
    await expect(h.tiles).toHaveCount(0);
    // Nothing of the old home is here.
    await expect(oldField(page)).toHaveCount(0);
    await expect(page.getByTestId('home-sheet-handle')).toHaveCount(0);
  });

  test('with routines it shows their tiles and the prompt; a reload stays on the new home', async ({ page }) => {
    await seedGo(page, MAYA);
    await page.goto('./');
    const h = home(page);
    await expect(h.screen).toBeVisible();
    await expect(page).toHaveURL(AT_GO);
    await expect(h.title).toHaveText('Nothing running');
    await expect(h.tiles).toHaveCount(MAYA.filter((r) => r.home !== false).length);
    await expect(h.prompt).toBeVisible();
    await page.reload();
    await expect(home(page).screen).toBeVisible();
    await expect(page).toHaveURL(AT_GO);
  });

  test('with a run in progress it opens where you left off: the runner', async ({ page }) => {
    await seedGo(page, MAYA, [{ id: 'r1', routine: 'apply', at: 1, status: 'running' }]);
    await page.goto('./');
    await expect(runner(page).words).toHaveText('Tailor the CV');
    await expect(page).toHaveURL(/\/wanderment\/go\/run\/r1$/);
    // Back from where you left off is the new home, never the old one (and never a loop through `/`).
    await page.goBack();
    await expect(settled(page, 'home')).toBeVisible();
    await expect(page).toHaveURL(AT_GO);
  });

  test('with a paused run it opens its paused screen', async ({ page }) => {
    await seedGo(page, MAYA, [{ id: 'r1', routine: 'apply', at: 1, status: 'paused' }]);
    await page.goto('./');
    await expect(paused(page).screen).toBeVisible();
    await expect(page).toHaveURL(/\/wanderment\/go\/run\/r1\/paused$/);
  });

  test('the address replaces itself: one history entry, so Back never loops through it', async ({ page }) => {
    await page.goto('./settings');
    await expect(page.getByRole('button', { name: 'Done', exact: true })).toBeVisible();
    const before = await page.evaluate(() => history.length);
    await page.goto('./');
    await expect(home(page).screen).toBeVisible();
    await expect(page).toHaveURL(AT_GO);
    // The load added one entry (the address); the redirect to `/go` replaced it.
    expect(await page.evaluate(() => history.length)).toBe(before + 1);
  });

  test('the installed app’s start (start_url) opens the new home offline', async ({ page, context, request }) => {
    const manifest = await (await request.get('/wanderment/manifest.json')).json();
    expect(manifest.start_url).toBe('/wanderment/');
    await page.goto('./');
    await expect(home(page).screen).toBeVisible();
    await waitForServiceWorkerControl(page);
    await context.setOffline(true);
    await page.goto(manifest.start_url);
    await expect(home(page).screen).toBeVisible();
    await expect(page).toHaveURL(AT_GO);
    await expect(home(page).title).toHaveText('Nothing running');
    // The old home opens offline at its own address too (navigation fallback).
    await page.goto(OLD);
    await expect(oldField(page)).toBeVisible();
    await expect(page).toHaveURL(AT_OLD);
  });
});

test.describe('the old home lives at /old', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(seedScript, world());
  });

  test('/old shows the old home with its composer and its sheet; a reload stays there', async ({ page }) => {
    await page.goto(OLD);
    await expect(oldField(page)).toBeVisible();
    await expect(page).toHaveURL(AT_OLD);
    await expect(page.getByRole('heading', { name: PROMPT, exact: true })).toBeVisible();
    await page.reload();
    await expect(oldField(page)).toBeVisible();
    await expect(page).toHaveURL(AT_OLD);
    await openSheet(page, 'Wanders');
    await expect(dialog(page).getByText('make apparel').first()).toBeVisible();
    await page.reload();
    // A reload keeps you where you were: the old home, its sheet out.
    await expect(page).toHaveURL(AT_OLD);
    await expect(dialog(page).getByRole('tab', { name: 'Wanders', exact: true })).toHaveAttribute('aria-selected', 'true');
    await toHome(page);
    await expect(page).toHaveURL(AT_OLD);
  });

  test('with a run in progress /old is still the old home: it never redirects into the run', async ({ page }) => {
    await seedGo(page, MAYA, [{ id: 'r1', routine: 'apply', at: 1, status: 'running' }]);
    await page.goto(OLD);
    await expect(oldField(page)).toBeVisible();
    await expect(page).toHaveURL(AT_OLD);
  });

  test('the sheet’s "Run a routine" row reaches the new home, and Back comes back to /old', async ({ page }) => {
    await page.goto(OLD);
    await openSheet(page, 'Wanders');
    await dialog(page).getByRole('link', { name: 'Run a routine', exact: true }).click();
    await expect(home(page).screen).toBeVisible();
    await expect(page).toHaveURL(AT_GO);
    await page.goBack();
    await expect(page).toHaveURL(AT_OLD);
    await expect(dialog(page)).toBeVisible();
  });

  test('the sheet’s Close, the browser’s Back and Esc put it away and stay at /old', async ({ page }) => {
    await page.goto(OLD);
    await expect(oldField(page)).toBeVisible();
    for (const leave of ['Close', 'Back', 'Esc'] as const) {
      await openSheet(page, 'Wanders');
      await expect(page).toHaveURL(AT_OLD);
      if (leave === 'Close') await dialog(page).getByRole('button', { name: 'Close', exact: true }).click();
      if (leave === 'Back') await page.goBack();
      if (leave === 'Esc') await page.keyboard.press('Escape');
      await expect(dialog(page), leave).toBeHidden();
      await expect(page, leave).toHaveURL(AT_OLD);
      await expect(oldField(page), leave).toBeVisible();
    }
  });

  test('lighting the map and dimming it stays in the old app: /sky, then /old', async ({ page }) => {
    await page.goto(OLD);
    await page.getByTestId('unsure').click();
    await expect(page).toHaveURL(/\/wanderment\/sky$/);
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(AT_OLD);
    await expect(oldField(page)).toBeVisible();
  });

  for (const [path, name] of [
    ['./sky', 'the lit map'],
    ['./map', 'the retired Map (lands on the lit map)'],
  ] as const) {
    test(`a deep link to ${name}: dimming it goes to /old, not the new home`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/wanderment\/sky$/);
      await expect(oldField(page)).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page).toHaveURL(AT_OLD);
      await expect(oldField(page)).toBeVisible();
      await expect(settled(page, 'home')).toHaveCount(0);
    });
  }

  for (const [path, section] of [
    ['./wanders', 'Wanders'],
    ['./activities', 'Activities'],
  ] as const) {
    test(`a deep link to ${path} opens the old home at /old with its sheet out on ${section}`, async ({ page }) => {
      await page.goto(path);
      await expect(dialog(page).getByRole('tab', { name: section, exact: true })).toHaveAttribute('aria-selected', 'true');
      await expect(page).toHaveURL(AT_OLD);
      await toHome(page);
      await expect(page).toHaveURL(AT_OLD);
    });
  }

  test('a deep link to a trail: its Back goes to the old home', async ({ page }) => {
    await page.goto('./trail/draw');
    await expect(page.getByRole('heading', { name: 'draw', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(AT_OLD);
    await expect(oldField(page)).toBeVisible();
  });

  for (const [path, leave] of [
    ['./settings', 'Done'],
    ['./search', 'Done'],
    ['./explore', '‹ Back'],
    ['./thread/draw', '‹ Back'],
  ] as const) {
    test(`a deep link to ${path}: its own way out (${leave}) goes to the old home`, async ({ page }) => {
      await page.goto(path);
      await page.getByRole('button', { name: leave, exact: true }).click();
      await expect(page).toHaveURL(AT_OLD);
      await expect(oldField(page)).toBeVisible();
      await expect(settled(page, 'home')).toHaveCount(0);
    });
  }
});
