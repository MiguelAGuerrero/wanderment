import { Page } from '@playwright/test';

import { expect, logBox, logLine, openHome, test } from './fixtures';

async function makeThreads(page: Page, names: string[]) {
  for (const name of names) {
    await logBox(page).fill(`started @${name}`);
    await page.getByRole('option', { name: `+ New thread “${name}”` }).click();
    await logBox(page).press('Enter');
    await expect(page.getByText('Logged → to', { exact: false })).toBeVisible();
  }
}

test('keyboard: ↑/↓ move through suggestions, Tab picks, Esc closes, Enter always logs', async ({ page }) => {
  await openHome(page);
  await makeThreads(page, ['make apparel', 'make music']);

  await logBox(page).fill('sketched a logo @make');
  const first = page.getByRole('option', { name: /^make music/ });
  const second = page.getByRole('option', { name: /^make apparel/ });
  await expect(first).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('mention-highlight')).toHaveText('@make');
  await expect(page.getByText('2 threads match, make music selected')).toBeAttached();

  await logBox(page).press('ArrowDown');
  await expect(second).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('2 threads match, make apparel selected')).toBeAttached();
  await logBox(page).press('Tab');
  await expect(logBox(page)).toHaveValue('sketched a logo ');
  await expect(page.getByRole('button', { name: 'To: make apparel. Remove' })).toBeVisible();
  await expect(logBox(page)).toBeFocused();

  // Esc closes suggestions; Enter logs the text as typed, never picking.
  await logBox(page).pressSequentially('for @make');
  await expect(first).toBeVisible();
  await logBox(page).press('Escape');
  await expect(first).toHaveCount(0);
  await logBox(page).press('Enter');
  await expect(page.getByText('Logged → to make apparel')).toBeVisible();
  await page.getByRole('tab', { name: 'Activities' }).click();
  await expect(page.getByText('sketched a logo for @make', { exact: true }).filter({ visible: true })).toBeVisible();
});

test('edit an activity’s text and threads, then delete it and undo', async ({ page }) => {
  await openHome(page);
  await makeThreads(page, ['run more']);
  await logLine(page, 'went for a run');
  await page.getByText('Tap for details').click();

  const title = page.getByRole('textbox', { name: 'What you did' });
  await title.fill('went for a long run');
  await page.getByRole('button', { name: '+ Doing…' }).click();
  await page.getByRole('button', { name: 'Doing run more' }).click();
  await expect(page.getByRole('button', { name: 'Doing: run more. Remove' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Note' }).fill('felt good');
  await page.getByRole('button', { name: 'Done' }).click();

  await page.getByRole('tab', { name: 'Activities' }).click();
  await expect(page.getByText('went for a long run', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText('run more', { exact: true }).filter({ visible: true })).toHaveCount(1);

  await page.getByText('went for a long run', { exact: true }).filter({ visible: true }).click();
  await page.getByRole('button', { name: 'Delete activity (you can undo)' }).click();
  await expect(page.getByText('Deleted “went for a long run”').filter({ visible: true })).toBeVisible();
  await expect(page.getByText('went for a long run', { exact: true }).filter({ visible: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).filter({ visible: true }).click();
  await expect(page.getByText('went for a long run', { exact: true }).filter({ visible: true })).toBeVisible();

  // Edits are saved, not just shown.
  await page.reload();
  await page.getByText('went for a long run', { exact: true }).filter({ visible: true }).click();
  await expect(page.getByRole('textbox', { name: 'Note' })).toHaveValue('felt good');
});
