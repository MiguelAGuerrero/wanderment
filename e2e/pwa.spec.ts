import { Page } from '@playwright/test';

import { expect, logLine, openHome, test } from './fixtures';

async function waitForServiceWorkerControl(page: Page) {
  await page.waitForFunction(async () => {
    const reg = await navigator.serviceWorker.ready;
    return !!reg.active && !!navigator.serviceWorker.controller;
  });
}

test('the manifest is linked, valid, and its icons load', async ({ page, request }) => {
  await openHome(page);
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBe('/wanderment/manifest.json');
  const res = await request.get(href!);
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest).toMatchObject({
    name: 'Wanderment',
    short_name: 'Wanderment',
    start_url: '/wanderment/',
    scope: '/wanderment/',
    display: 'standalone',
  });
  const sizes = manifest.icons.map((i: { sizes: string; purpose?: string }) => `${i.sizes}:${i.purpose ?? 'any'}`);
  expect(sizes).toEqual(expect.arrayContaining(['192x192:any', '512x512:any', '512x512:maskable']));
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBe(true);
  const touchIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  expect((await request.get(touchIcon!)).ok()).toBe(true);

  // Chrome's own verdict on whether the page can be installed.
  const cdp = await page.context().newCDPSession(page);
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
  expect(installabilityErrors).toEqual([]);
});

test('works offline after the first visit, with data intact', async ({ page, context }) => {
  await openHome(page);
  await waitForServiceWorkerControl(page);
  await logLine(page, 'read on the train');
  await expect(page.getByText('Logged', { exact: true })).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Wanderment', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Activities' }).click();
  await expect(page.getByText('read on the train')).toBeVisible();

  // A deep link that was never visited also opens offline (navigation fallback).
  await page.goto('./settings');
  await expect(page.getByText('1 activities · 0 threads')).toBeVisible();
});

test('a new version shows a reload banner and never reloads by itself', async ({ page, request }) => {
  await openHome(page);
  await waitForServiceWorkerControl(page);

  // Pretend a new build was deployed: the next sw.js differs by a comment (see e2e/serve.mjs).
  await request.post('/__e2e/bump-sw');
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());

  const banner = page.getByText('A new version is ready');
  await expect(banner).toBeVisible();
  await page.getByRole('button', { name: 'Reload to update' }).click();
  await page.waitForEvent('load');
  await expect(page.getByText('Wanderment', { exact: true })).toBeVisible();
  await expect(banner).toHaveCount(0);
});
