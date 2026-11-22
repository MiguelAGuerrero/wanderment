import { Page } from '@playwright/test';

import { expect, logBox, logLine, openHome, test } from './fixtures';

async function makeThreads(page: Page, names: string[]) {
  for (const name of names) {
    await logBox(page).fill(`started @${name}`);
    await page.getByRole('option', { name: `+ New wander “${name}”` }).click();
    await logBox(page).press('Enter');
    await expect(page.getByText('Logged → to', { exact: false })).toBeVisible();
  }
}

test('keyboard: ↑/↓ move through suggestions, Tab picks, Esc closes, Enter always logs', async ({ page }) => {
  await openHome(page);
  await makeThreads(page, ['make apparel', 'make music']);

  // Enter with suggestions open logs as typed — it never picks.
  const first = page.getByRole('option', { name: /^make music/ });
  await logBox(page).fill('demo @make');
  await expect(first).toBeVisible();
  await logBox(page).press('Enter');
  await expect(page.getByText('Logged', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(logBox(page)).toHaveValue('');

  await logBox(page).fill('sketched a logo @make');
  const second = page.getByRole('option', { name: /^make apparel/ });
  await expect(first).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('mention-highlight')).toHaveText('@make');
  await expect(page.getByText('2 wanders match, make music selected')).toBeAttached();

  await logBox(page).press('ArrowDown');
  await expect(second).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('2 wanders match, make apparel selected')).toBeAttached();
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
  await expect(page.getByText('demo @make', { exact: true }).filter({ visible: true })).toBeVisible();
  await page.getByRole('tab', { name: 'No wander' }).click();
  await expect(page.getByText('demo @make', { exact: true }).filter({ visible: true })).toBeVisible();
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

test('renaming to another thread’s name is refused inline and keeps the typed text', async ({ page }) => {
  await openHome(page);
  await makeThreads(page, ['play guitar', 'make apparel']);
  await page.getByRole('button', { name: /^make apparel\s*\S/ }).click();
  await page.getByRole('button', { name: 'Rename' }).click();

  const field = page.getByRole('textbox', { name: 'Wander name' });
  await field.fill('  Play   Guitar ');
  await field.press('Enter');
  const refusal = page.getByText('Another wander is already called “play guitar”.');
  await expect(refusal).toBeVisible();
  await expect(page.locator('[aria-live="polite"]').filter({ has: refusal })).toHaveCount(1);
  await expect(field).toHaveValue('  Play   Guitar ');

  // Typing again clears the message.
  await field.pressSequentially('x');
  await expect(refusal).toHaveCount(0);

  // Nothing was renamed.
  await page.reload();
  await expect(page.getByText('make apparel', { exact: true }).filter({ visible: true })).toBeVisible();
  await page.goto('./');
  await expect(page.getByRole('button', { name: /^play guitar\s*\S/ })).toHaveCount(1);
  await expect(page.getByRole('button', { name: /^make apparel\s*\S/ })).toHaveCount(1);

  // A unique name renames.
  await page.getByRole('button', { name: /^make apparel\s*\S/ }).click();
  await page.getByRole('button', { name: 'Rename' }).click();
  await field.fill('sew clothes');
  await field.press('Enter');
  await expect(field).toHaveCount(0);
  await expect(page.getByText('sew clothes', { exact: true }).filter({ visible: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('sew clothes', { exact: true }).filter({ visible: true })).toBeVisible();

  // A hidden thread's name is taken too, and the message says where to find it.
  await page.goto('./');
  await page.getByRole('button', { name: /^play guitar\s*\S/ }).click();
  await page.getByRole('button', { name: 'Hide' }).click();
  await page.getByRole('button', { name: /^sew clothes\s*\S/ }).click();
  await page.getByRole('button', { name: 'Rename' }).click();
  await field.fill('PLAY GUITAR');
  await field.press('Enter');
  await expect(
    page.getByText('Another wander is already called “play guitar”. It’s hidden — you can unhide it in Settings.'),
  ).toBeVisible();
  await expect(field).toHaveValue('PLAY GUITAR');
});

test('a refused rename can be left with Cancel or Esc, keeping the old name (audit B, finding 6)', async ({ page }) => {
  await openHome(page);
  await makeThreads(page, ['play guitar', 'make apparel']);
  await page.getByRole('button', { name: /^make apparel\s*\S/ }).click();
  await page.getByRole('button', { name: 'Rename' }).click();

  const field = page.getByRole('textbox', { name: 'Wander name' });
  await field.fill('play guitar');
  await field.press('Enter');
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await expect(field).toHaveAttribute('aria-describedby', 'rename-taken');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(field).toHaveCount(0);
  await expect(page.getByText('make apparel', { exact: true }).filter({ visible: true }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Rename' }).click();
  await page.getByRole('textbox', { name: 'Wander name' }).fill('play guitar');
  await page.getByRole('textbox', { name: 'Wander name' }).press('Escape');
  await expect(page.getByRole('textbox', { name: 'Wander name' })).toHaveCount(0);
  await expect(page.getByText('Another wander is already called', { exact: false })).toHaveCount(0);
});
