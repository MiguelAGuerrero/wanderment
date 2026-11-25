/**
 * The axe checks for what is shared by the whole app: Settings, the import preview, the waiting
 * screen and the reconnecting note. (The `/go` screens' own checks are in go-a11y.spec.ts.)
 * P-89: the old app's screens — and their checks — are retired; these run on the new look.
 */
import { AxeBuilder } from '@axe-core/playwright';
import { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { chooseBackup, openAndStart, openGo, openSettings, runner, setVisibility, settled } from './goFixture';
import { legacyBlob, seedScript } from './graphFixture';

/** Fails on serious or critical axe violations, printing what and where. */
async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = serious.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => `${n.target.join(' ')} ${n.html.slice(0, 200)}`).slice(0, 5).join('\n  ')}`);
  expect(report, report.join('\n')).toEqual([]);
}

const BACKUP = JSON.stringify({
  app: 'wanderment',
  exportedAt: '2026-01-04T00:00:00.000Z',
  data: { version: 1, threads: {}, activities: { i1: { id: 'i1', text: 'imported', occurredAt: '2026-01-03T12:00:00.000Z', createdAt: '2026-01-03T12:00:00.000Z', toIds: [] } } },
});

test('Settings, with the “may clear your data” line and its button, has no serious accessibility violations', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.storage.persisted = async () => false;
    navigator.storage.persist = async () => false;
  });
  await page.addInitScript(seedScript, legacyBlob(['draw'], [{ from: 'draw', text: 'sketched', daysAgo: 1 }]));
  await openSettings(page);
  const ask = page.getByRole('button', { name: 'Ask the browser to keep it' });
  await expect(ask).toBeVisible();
  await expect(page.getByTestId('go-settings-earlier')).toBeVisible();
  // Every control is a 48 px target (B-11 §6), named by its visible words.
  for (const name of ['Back', 'Ask the browser to keep it', 'Export everything (.json)', 'Import from a backup', 'Check for updates']) {
    const box = await page.getByRole('button', { name, exact: true }).boundingBox();
    expect(box!.height, name).toBeGreaterThanOrEqual(48);
    expect(box!.width, name).toBeGreaterThanOrEqual(48);
  }
  // One title, and a heading for each part.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings');
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Your data', 'This app']);
  await expectNoSeriousViolations(page);
});

test('the import preview (P-04) has no serious accessibility violations; its buttons are 48 px', async ({ page }) => {
  await page.addInitScript(seedScript, legacyBlob(['draw'], [{ from: 'draw', text: 'sketched', daysAgo: 1 }]));
  await openSettings(page);
  await chooseBackup(page, BACKUP);
  await expect(page.getByRole('group', { name: 'Replace what’s here with this backup?' })).toBeFocused();
  for (const name of ['Replace', 'Cancel']) {
    const box = await page.getByRole('button', { name, exact: true }).boundingBox();
    expect(box!.height, name).toBeGreaterThanOrEqual(48);
  }
  await expectNoSeriousViolations(page);
});

test('the waiting screen (another tab has the data) has no serious accessibility violations, and says what failed (P-29)', async ({ page, context }) => {
  await openGo(page);
  const second = await context.newPage();
  await second.goto('./go');
  // Read out once, as an alert.
  await expect(second.getByRole('alert')).toHaveText(
    'The app is open in another tab or window. It’ll open here as soon as that one is closed or in the background.',
    { timeout: 20_000 },
  );
  // The details line is always visible, and selectable so it can be copied into a report.
  const details = second.getByText('Details: tab lock · another page holds it', { exact: true });
  await expect(details).toBeVisible();
  expect(await details.evaluate((el) => getComputedStyle(el).userSelect)).toBe('text');
  await expectNoSeriousViolations(second);

  // Reload stays as a second way: named by its text, a 44 px target, reachable by keyboard.
  const reload = second.getByRole('button', { name: 'Reload', exact: true });
  expect((await reload.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await second.keyboard.press('Tab');
  await expect(reload).toBeFocused();
});

test('the runner while the page doesn’t hold the data (the quiet “reconnecting” note after a press) has no serious accessibility violations (P-29)', async ({ page }) => {
  await openAndStart(page, 'Read a novel');
  const r = runner(page);
  await r.field.fill('typed while away');
  // Hidden (emulated: headless pages stay visible), the page lets go of the data.
  await setVisibility(page, 'hidden');
  await r.field.press('Enter');
  // Refused, saying why, politely; the data and the typed words stay.
  const note = r.screen.getByTestId('go-notice');
  await expect(note).toHaveText('Just a moment — reconnecting.');
  await expect(r.screen.getByRole('status').filter({ has: page.getByTestId('go-notice') })).toHaveCount(1);
  await expect(r.field).toHaveValue('typed while away');
  await expectNoSeriousViolations(page);
});

test('Settings while the page doesn’t hold the data: a refused Replace says why in a live region, and has no serious accessibility violations', async ({ page }) => {
  await openSettings(page);
  await chooseBackup(page, BACKUP);
  await expect(page.getByTestId('import-preview')).toBeVisible();
  await setVisibility(page, 'hidden');
  await page.getByRole('button', { name: 'Replace', exact: true }).click();
  const said = settled(page, 'settings').getByTestId('go-settings-said');
  await expect(said).toHaveText('Just a moment — reconnecting.');
  await expect(page.locator('[aria-live="polite"]').filter({ has: page.getByTestId('go-settings-said') })).toHaveCount(1);
  await expectNoSeriousViolations(page);
});
