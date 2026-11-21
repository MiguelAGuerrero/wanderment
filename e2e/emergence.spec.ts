import { Page } from '@playwright/test';

import { expect, logBox, logLine, openHome, test } from './fixtures';

const visibleText = (page: Page, text: string) => page.getByText(text, { exact: true }).filter({ visible: true });

test('name a new thread and pull in past activities in bulk; one Undo reverts all', async ({ page }) => {
  await openHome(page);
  await logLine(page, 'sketched gestures for drawing');
  await logLine(page, 'drew hands, practiced shading');
  await logLine(page, 'went to the gym');

  await page.getByRole('button', { name: '+ New thread' }).click();
  const name = page.getByRole('textbox', { name: 'New thread name' });
  await name.fill('practice drawing');
  await name.press('Enter');

  await expect(page.getByText('Pull into practice drawing?')).toBeVisible();
  const rows = page.getByRole('checkbox');
  await expect(rows).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Attach' })).toBeDisabled();
  await page.getByRole('button', { name: 'Select all' }).click();
  await expect(rows.first()).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'Attach 2' }).click();

  await expect(visibleText(page, 'Pulled 2 activities into practice drawing')).toBeVisible();
  await page.getByRole('tab', { name: 'Activities' }).click();
  await page.getByRole('tab', { name: 'No thread' }).click();
  await expect(visibleText(page, 'went to the gym')).toBeVisible();
  await expect(visibleText(page, 'sketched gestures for drawing')).toHaveCount(0);

  await page.getByRole('button', { name: 'Undo' }).filter({ visible: true }).click();
  await expect(visibleText(page, 'sketched gestures for drawing')).toBeVisible();
  await expect(visibleText(page, 'drew hands, practiced shading')).toBeVisible();
});

test('a thread made from the @ menu quietly offers to pull in earlier mentions', async ({ page }) => {
  await openHome(page);
  await logLine(page, 'drawing at lunch');
  await logBox(page).fill('more gestures @practice drawing');
  await page.getByRole('option', { name: /New thread “practice drawing”/ }).click();
  await logBox(page).press('Enter');

  await page.getByRole('button', { name: /1 earlier activity mentions “practice drawing”/ }).click();
  await page.getByRole('checkbox', { name: /drawing at lunch/ }).click();
  await page.getByRole('button', { name: 'Attach 1' }).click();
  await expect(visibleText(page, 'Pulled 1 activity into practice drawing')).toBeVisible();
  await expect(page.getByRole('button', { name: /earlier activity mentions/ })).toHaveCount(0);
});

test('a thread most activity flows into gets a "TO …" header, with an explainer', async ({ page }) => {
  const t = (id: string, name: string) => ({ id, name, hidden: false, createdAt: '2026-11-01T00:00:00.000Z' });
  const now = Date.now();
  const acts: Record<string, unknown> = {};
  for (let i = 0; i < 4; i++) {
    const at = new Date(now - (i + 1) * 864e5).toISOString();
    acts[`a${i}`] = { id: `a${i}`, text: `sketch ${i}`, occurredAt: at, createdAt: at, doingId: 'draw', toIds: ['apparel'] };
  }
  const at = new Date(now - 2 * 3600e3).toISOString();
  acts.r = { id: 'r', text: 'ran 5k', occurredAt: at, createdAt: at, doingId: 'run', toIds: [] };
  const legacy = JSON.stringify({
    state: { data: { version: 1, threads: { draw: t('draw', 'draw'), apparel: t('apparel', 'make apparel'), run: t('run', 'run') }, activities: acts }, showShading: true },
    version: 1,
  });
  await page.addInitScript((json) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('wanderment', json);
      sessionStorage.setItem('seeded', '1');
    }
  }, legacy);
  await openHome(page);
  await expect(page.getByRole('heading', { name: 'TO MAKE APPAREL' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'OTHER THREADS' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'YOUR THREADS' })).toHaveCount(0);
  await page.getByRole('button', { name: /TO MAKE APPAREL/ }).click();
  await expect(page.getByText(/4 things you logged went → to make apparel/)).toBeVisible();
});

test('search finds activities, notes and next steps, and remembers the search', async ({ page }) => {
  await openHome(page);
  await logBox(page).fill('practiced scales @play guitar');
  await page.getByRole('option', { name: /New thread “play guitar”/ }).click();
  await logBox(page).press('Enter');
  const next = page.getByRole('textbox', { name: 'Optional next step for play guitar' });
  await next.fill('faster scales');
  await next.press('Enter');
  await logLine(page, 'jam night');

  await page.getByRole('link', { name: 'Search' }).click();
  await page.getByRole('textbox', { name: 'Search' }).fill('scales');
  await expect(page.getByText('2 results')).toBeVisible();
  await expect(page.getByRole('button', { name: /^faster scales/ })).toBeVisible();
  await page.getByRole('button', { name: /^practiced scales/ }).click();
  await expect(page.getByRole('textbox', { name: 'What you did' })).toHaveValue('practiced scales');

  await page.goto('./search');
  await page.getByRole('button', { name: 'scales' }).click();
  await expect(page.getByRole('textbox', { name: 'Search' })).toHaveValue('scales');
});
