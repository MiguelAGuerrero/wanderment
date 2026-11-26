import { AxeBuilder } from '@axe-core/playwright';
import { Page } from '@playwright/test';
import { execSync } from 'node:child_process';

import { expect, test } from './fixtures';
import { home, openAndStart, openGo, openSettings, plan, settled } from './goFixture';

/**
 * P-30: a refresh shows the new version. A new version applies by itself right after a load or a
 * return to the foreground (before anything is typed, once per version); otherwise the banner asks.
 * `request.post('/__e2e/bump-sw')` stands in for a deploy (e2e/serve.mjs), for this test only.
 */

const banner = (page: Page) => page.getByText('A new version is ready');
const updateNow = (page: Page) => page.getByRole('button', { name: /^Update now/ });

async function waitForServiceWorkerControl(page: Page) {
  await page.waitForFunction(async () => {
    const reg = await navigator.serviceWorker.ready;
    return !!reg.active && !!navigator.serviceWorker.controller;
  });
}

/** Counts every load of the page in this tab (a reload keeps sessionStorage). */
async function countLoads(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem('e2e:loads', String(Number(sessionStorage.getItem('e2e:loads') ?? 0) + 1)));
}
const loads = (page: Page) => page.evaluate(() => Number(sessionStorage.getItem('e2e:loads'))).catch(() => -1);

/** The version running now is the newest one served: nothing waiting, and a fresh check finds nothing new. */
const onNewestVersion = (page: Page) =>
  page.evaluate(async () => {
    const reg = (await navigator.serviceWorker.getRegistration())!;
    await reg.update();
    return !reg.waiting && !reg.installing && navigator.serviceWorker.controller === reg.active;
  });

/** Headless pages are always visible, so hiding is emulated (as in e2e/handoff.spec.ts). */
async function setVisibility(page: Page, state: 'hidden' | 'visible') {
  await page.evaluate((v) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => v === 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);
}

async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = serious.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => `${n.target.join(' ')} ${n.html.slice(0, 200)}`).join('\n  ')}`);
  expect(report, report.join('\n')).toEqual([]);
}

test('a plain refresh with a new version deployed reloads into it by itself within 10 s', async ({ page, request }) => {
  await countLoads(page);
  await openGo(page);
  await waitForServiceWorkerControl(page);

  await request.post('/__e2e/bump-sw');
  await page.reload();
  // The refresh (2), then the update's own reload (3), without anything tapped.
  await expect.poll(() => loads(page), { timeout: 10_000 }).toBe(3);
  await expect(home(page).screen).toBeVisible();
  expect(await onNewestVersion(page)).toBe(true);
  await expect(banner(page)).toHaveCount(0);
});

test('coming back to the app with a new version deployed updates by itself, keeping words typed before (a first step not yet entered)', async ({ page, request }) => {
  await countLoads(page);
  await openAndStart(page, 'Write the report');
  await waitForServiceWorkerControl(page);
  await plan(page).add.fill('half a thought');

  await setVisibility(page, 'hidden');
  await request.post('/__e2e/bump-sw');
  await setVisibility(page, 'visible');
  await expect.poll(() => loads(page), { timeout: 10_000 }).toBe(2);
  await expect(plan(page).add).toHaveValue('half a thought', { timeout: 15_000 });
  expect(await onNewestVersion(page)).toBe(true);
  await expect(banner(page)).toHaveCount(0);
});

test('once something is typed, a new version waits for “Update now”, which keeps the words', async ({ page, request }) => {
  await countLoads(page);
  await openAndStart(page, 'Write the report');
  await waitForServiceWorkerControl(page);
  await plan(page).add.fill('mid-sentence');

  await request.post('/__e2e/bump-sw');
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());
  await expect(banner(page)).toBeVisible();
  await page.waitForTimeout(3000);
  expect(await loads(page)).toBe(1);
  await expect(plan(page).add).toHaveValue('mid-sentence');

  await updateNow(page).click();
  await expect.poll(() => loads(page), { timeout: 10_000 }).toBe(2);
  await expect(plan(page).add).toHaveValue('mid-sentence', { timeout: 15_000 });
  expect(await onNewestVersion(page)).toBe(true);
});

test('a new version found more than 10 s after the page opened waits for the banner', async ({ page, request }) => {
  test.slow();
  await countLoads(page);
  await openGo(page);
  await waitForServiceWorkerControl(page);
  await page.waitForTimeout(10_500);

  await request.post('/__e2e/bump-sw');
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());
  await expect(banner(page)).toBeVisible();
  await page.waitForTimeout(3000);
  expect(await loads(page)).toBe(1);
});

test('no reload loop: after updating itself once, the same version coming back only shows the banner', async ({ page, request }) => {
  await countLoads(page);
  await openGo(page);
  await waitForServiceWorkerControl(page);
  await request.post('/__e2e/bump-sw');
  await page.reload();
  await expect.poll(() => loads(page), { timeout: 10_000 }).toBe(3);
  await expect(home(page).screen).toBeVisible();

  // Another new service worker, but this tab's build is the one it already updated away from.
  await request.post('/__e2e/bump-sw');
  await page.reload();
  await expect(banner(page)).toBeVisible();
  await page.waitForTimeout(4000);
  expect(await loads(page)).toBe(4);
  await expect(banner(page)).toBeVisible();
});

/** Offline, the browser can't fetch sw.js, so a check fails (Playwright's offline mode doesn't reach that fetch). */
const failChecks = () => {
  ServiceWorkerRegistration.prototype.update = () => Promise.reject(new TypeError('Failed to update a ServiceWorker: network error'));
};

test('an offline load updates nothing and shows no error', async ({ page, context }) => {
  await openGo(page);
  await waitForServiceWorkerControl(page);
  await context.setOffline(true);
  await page.addInitScript(failChecks);
  await page.reload();
  await expect(home(page).screen).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(banner(page)).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('Settings shows the build’s version, and “Check for updates” finds a new one (banner, applies on tap)', async ({ page, request }) => {
  const buildId = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  await countLoads(page);
  await openGo(page);
  await waitForServiceWorkerControl(page);
  await openSettings(page);
  await expect(page.getByText(new RegExp(`^Version ${buildId} · \\d{1,2} [A-Z][a-z]{2} \\d{4}$`))).toBeVisible();

  const check = page.getByRole('button', { name: 'Check for updates' });
  expect((await check.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await check.click();
  await expect(page.getByText('You’re up to date.')).toBeVisible();
  await expectNoSeriousViolations(page);

  const update = await page.evaluateHandle(() => ServiceWorkerRegistration.prototype.update);
  await page.evaluate(failChecks);
  await check.click();
  await expect(page.getByText(/^Couldn’t check right now/)).toBeVisible();
  await page.evaluate((u) => (ServiceWorkerRegistration.prototype.update = u), update);

  await request.post('/__e2e/bump-sw');
  await check.click();
  await expect(banner(page)).toBeVisible();
  // Asked for from Settings, it waits for a tap rather than reloading under the person.
  await page.waitForTimeout(2000);
  expect(await loads(page)).toBe(2);
  await updateNow(page).click();
  await expect.poll(() => loads(page), { timeout: 10_000 }).toBe(3);
  await expect(settled(page, 'settings')).toBeVisible();
  await expect(check).toBeVisible();
  expect(await onNewestVersion(page)).toBe(true);
  await check.click();
  await expect(page.getByText('You’re up to date.')).toBeVisible();
});

test('the update banner, at 390 px, has a 44 px “Update now” and no serious accessibility violations', async ({ page, request }) => {
  await openGo(page);
  await waitForServiceWorkerControl(page);
  // (P-96: home has no prompt — the New sheet's name field is where one types on home.)
  await home(page).newBtn.click();
  await page.getByTestId('go-new-name').fill('typed');
  await request.post('/__e2e/bump-sw');
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());
  await expect(banner(page)).toBeVisible();
  const box = (await updateNow(page).boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  const notNow = (await page.getByRole('button', { name: 'Not now' }).boundingBox())!;
  expect(notNow.height).toBeGreaterThanOrEqual(44);
  expect(notNow.x + notNow.width).toBeLessThanOrEqual(390);
  await expectNoSeriousViolations(page);
});

test.describe('without service workers (private mode)', () => {
  test.use({ serviceWorkers: 'block' });

  test('the app works and Settings shows the version; checking says it can’t here', async ({ page }) => {
    await openGo(page);
    await openSettings(page);
    await expect(page.getByText(/^Version \S+/)).toBeVisible();
    await page.getByRole('button', { name: 'Check for updates' }).click();
    await expect(page.getByText(/^This browser can’t check for updates/)).toBeVisible();
  });
});
