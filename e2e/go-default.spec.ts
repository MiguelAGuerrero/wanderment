/**
 * P-88: the app's address (`/`, the installed icon's start_url) lands on the home (`/go`), which opens
 * where you left off. P-89: the old app is retired — every address it had, and any unknown one, lands
 * on the home too; `/settings` lands on `/go/settings`. Expected values: the roadmap items and their contracts.
 */
import { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { exported, home, MAYA, runner, seedGo, settled, tileBody } from './goFixture';
import { legacyBlob, seedScript } from './graphFixture';

const AT_GO = /\/wanderment\/go$/;
/** The old home's field, and its sheet's handle: nothing of either may be anywhere. */
const oldField = (page: Page) => page.getByRole('textbox', { name: 'Where are we wandering today?', exact: true });

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
    // (P-96: no "Nothing running" title and no prompt; + New is there.)
    await expect(h.newBtn).toBeVisible();
    await expect(h.tiles).toHaveCount(0);
    // Nothing of the old home is here.
    await expect(oldField(page)).toHaveCount(0);
    await expect(page.getByTestId('home-sheet-handle')).toHaveCount(0);
  });

  test('with routines and nothing going (P-97; was: their tiles) it says so, with My routines and + New (P-96: was: the prompt); a reload stays on the new home', async ({ page }) => {
    await seedGo(page, MAYA);
    await page.goto('./');
    const h = home(page);
    await expect(h.screen).toBeVisible();
    await expect(page).toHaveURL(AT_GO);
    // P-97 (was: a tile for each routine on home): only runs going are tiles; the routines are on My routines.
    await expect(h.tiles).toHaveCount(0);
    await expect(h.idle).toBeVisible();
    await expect(h.routinesBtn).toBeVisible();
    await expect(h.newBtn).toBeVisible();
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

  test('with a paused run it opens home, the run first with its Resume (P-96; was: its paused screen)', async ({ page }) => {
    await seedGo(page, MAYA, [{ id: 'r1', routine: 'apply', at: 1, status: 'paused' }]);
    await page.goto('./');
    await expect(home(page).screen).toBeVisible();
    await expect(page).toHaveURL(AT_GO);
    // (P-101: its tile's body resumes it; was: the filled Resume bar.)
    await expect(tileBody(page, 'Apply to Initech')).toHaveAccessibleName(/^Resume Apply to Initech/);
  });

  test('the address replaces itself: one history entry, so Back never loops through it', async ({ page }) => {
    await page.goto('./go/settings');
    await expect(settled(page, 'settings')).toBeVisible();
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
    await expect(home(page).newBtn).toBeVisible();
    // An old address opens offline too (the navigation fallback, then the redirect): the home.
    await page.goto('./old');
    await expect(home(page).screen).toBeVisible();
    await expect(page).toHaveURL(AT_GO);
  });
});

/** Every address the old app had (the scout's table), with an id where it took one. */
const OLD_ADDRESSES = ['./', './old', './sky', './activities', './wanders', './line/a0', './star/draw', './trail/draw', './search', './explore', './map', './thread/draw', './activity/a0', './pull-in/draw'];

test.describe('the old app is retired: its addresses land on the home (P-89)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(seedScript, world());
  });

  for (const path of [...OLD_ADDRESSES, './no/such/place', './go/nope', './go/run']) {
    test(`${path} lands on the home, replacing the entry`, async ({ page }) => {
      await page.goto('./go/settings');
      await expect(settled(page, 'settings')).toBeVisible();
      const before = await page.evaluate(() => history.length);
      await page.goto(path);
      const h = home(page);
      await expect(h.screen).toBeVisible();
      await expect(page).toHaveURL(AT_GO);
      await expect(h.newBtn).toBeVisible();
      // Nothing of the old app is drawn on the way or after.
      await expect(oldField(page)).toHaveCount(0);
      await expect(page.getByTestId('home-sheet-handle')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Back to Wanderment' })).toHaveCount(0);
      // One entry for the address; the redirect replaced it, so Back never loops through it.
      expect(await page.evaluate(() => history.length)).toBe(before + 1);
      await page.goBack();
      await expect(settled(page, 'settings')).toBeVisible();
    });
  }

  test('there are 14 old addresses here, as the contract counts', () => {
    expect(OLD_ADDRESSES).toHaveLength(14);
  });

  test('a deep link to an old line or wander, with a run in progress: the home, never a redirect into the run, and the run is as it was', async ({ page }) => {
    await seedGo(page, MAYA, [{ id: 'r1', routine: 'apply', at: 1, status: 'running' }]);
    // Once per load `/go` opens where you left off: an old address is the same as the app's own.
    // (P-96: a paused run opens home; a running one, its runner — as here.)
    await page.goto('./trail/draw');
    await expect(runner(page).words).toHaveText('Tailor the CV');
    await expect(page).toHaveURL(/\/wanderment\/go\/run\/r1$/);
    await page.goBack();
    await expect(settled(page, 'home')).toBeVisible();
    await expect(page).toHaveURL(AT_GO);
  });

  test('/settings lands on /go/settings (dark, in the new look), replacing the entry', async ({ page }) => {
    await page.goto('./go');
    await expect(home(page).screen).toBeVisible();
    const before = await page.evaluate(() => history.length);
    await page.goto('./settings');
    await expect(settled(page, 'settings')).toBeVisible();
    await expect(page).toHaveURL(/\/wanderment\/go\/settings$/);
    expect(await page.evaluate(() => history.length)).toBe(before + 1);
    await expect(settled(page, 'settings').getByRole('heading', { level: 1 })).toHaveText('Settings');
  });

  test('landing on the home from an old address deletes and converts nothing: the old wanders and lines are all in the export', async ({ page }) => {
    await page.goto('./thread/draw');
    await expect(home(page).screen).toBeVisible();
    await page.goto('./activity/a0');
    await expect(home(page).screen).toBeVisible();
    const data = await exported(page);
    expect(Object.values(data.threads).map((t) => t.name).sort()).toEqual(['draw', 'make apparel']);
    expect(Object.values(data.activities).map((a) => a.text).sort()).toEqual(['cooked dinner', 'sketched']);
    expect(data.activities.a0).toMatchObject({ text: 'sketched', doingId: 'draw', toIds: ['make apparel'] });
    expect(data.routines).toEqual({});
    expect(data.runs).toEqual({});
  });
});
