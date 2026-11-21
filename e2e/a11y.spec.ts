import { AxeBuilder } from '@axe-core/playwright';
import { Page } from '@playwright/test';

import { expect, logBox, logLine, openHome, test } from './fixtures';

/** Fails on serious or critical axe violations, printing what and where. */
async function expectNoSeriousViolations(page: Page) {
  // Only check what's on screen; tab screens that are mounted but hidden are not.
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = serious.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => `${n.target.join(' ')} ${n.html.slice(0, 200)}`).slice(0, 5).join('\n  ')}`);
  expect(report, report.join('\n')).toEqual([]);
}

async function seed(page: Page) {
  await openHome(page);
  await logBox(page).fill('practiced scales @play guitar');
  await page.getByRole('option', { name: /New thread “play guitar”/ }).click();
  await logBox(page).press('Enter');
  const next = page.getByRole('textbox', { name: 'Optional next step for play guitar' });
  await next.fill('learn the F chord');
  await next.press('Enter');
  await logLine(page, 'read a novel');
}

test('first run has no serious accessibility violations', async ({ page }) => {
  await openHome(page);
  await expectNoSeriousViolations(page);
});

test('Home, Activities, thread page and details have no serious accessibility violations', async ({ page }) => {
  await seed(page);
  await expectNoSeriousViolations(page);

  await page.getByRole('tab', { name: 'Activities' }).click();
  await expect(page.getByRole('tab', { name: 'No thread' })).toBeVisible();
  await expectNoSeriousViolations(page);

  await page.getByRole('tab', { name: 'Home' }).click();
  await page.getByRole('button', { name: /^play guitar\s*\S/ }).click();
  await expect(page.getByText('You left off')).toBeVisible();
  await expectNoSeriousViolations(page);

  await page.goto('./');
  await page.getByRole('tab', { name: 'Activities' }).click();
  await page.getByText('read a novel').filter({ visible: true }).click();
  await expect(page.getByRole('textbox', { name: 'What you did' })).toBeVisible();
  await expectNoSeriousViolations(page);
});

test('suggestions are an accessible listbox', async ({ page }) => {
  await seed(page);
  await logBox(page).fill('more @pla');
  await expect(page.getByRole('listbox', { name: 'Thread suggestions' })).toBeVisible();
  await expectNoSeriousViolations(page);
});
