import { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { bigBlob, legacyBlob, seedScript } from './graphFixture';

const SHOTS = process.env.E2E_SHOTS; // set to a folder to save screenshots for a visual check

const world = legacyBlob(['draw', 'make apparel', 'sew', 'doodle', 'sell prints', 'photograph'], [
  ...[1, 2, 3, 4].map((d) => ({ from: 'draw', to: ['make apparel'], text: `sketch ${d}`, daysAgo: d })),
  { from: 'sew', to: ['make apparel'], text: 'hemmed', daysAgo: 2 },
  { from: 'doodle', to: ['draw'], text: 'doodled', daysAgo: 3 },
  { from: 'make apparel', to: ['sell prints'], text: 'listed', daysAgo: 1 },
  { from: 'photograph', to: ['make apparel'], text: 'shot', daysAgo: 5 },
  { text: 'read a novel', daysAgo: 1 },
  { text: 'drew a tee mockup', daysAgo: 2 },
]);

const centre = (page: Page, name: string) => page.getByRole('button', { name: new RegExp(`^${name}, \\d+ steps`) });

test('opens on the top value, re-centres on tap, and the breadcrumb goes back', async ({ page }) => {
  await page.addInitScript(seedScript, world);
  await page.goto('./graph');
  await expect(centre(page, 'make apparel')).toBeVisible();
  // Above: what it flows to. Below: what feeds it.
  await expect(page.getByRole('button', { name: 'sell prints, 1 link' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'draw, 4 links' })).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/graph.png` });

  await page.getByRole('button', { name: 'draw, 4 links' }).click();
  await expect(centre(page, 'draw')).toBeVisible();
  await expect(page.getByRole('button', { name: 'doodle, 1 link' })).toBeVisible();
  // Siblings: others that flow to the same place as draw.
  await expect(page.getByRole('button', { name: 'sew, 1 link' })).toBeVisible();

  await page.getByRole('toolbar', { name: 'Path' }).getByRole('button', { name: 'make apparel' }).click();
  await expect(centre(page, 'make apparel')).toBeVisible();

  await page.getByRole('switch', { name: 'Show two steps out' }).click();
  await expect(page.getByRole('button', { name: 'doodle, 1 link' })).toBeVisible();

  await page.getByRole('tab', { name: 'List view' }).click();
  await expect(page.getByRole('heading', { name: 'make apparel flows to' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Flows into make apparel' })).toBeVisible();
});

test('attach mode: one loose activity at a time; tap a node, Leave as is, Skip', async ({ page }) => {
  await page.addInitScript(seedScript, world);
  await page.goto('./graph');
  await page.getByRole('button', { name: 'Attach loose activities' }).click();
  await expect(page.getByRole('textbox', { name: 'What did you just do?' })).toHaveCount(0);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/attach.png` });

  // Oldest first. The graph holds still: tapping a node attaches instead of re-centring.
  await expect(page.getByText('drew a tee mockup', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'draw, 4 links. Attach here.' }).click();
  await expect(page.getByText('Attached → to draw').filter({ visible: true })).toBeVisible();
  await expect(centre(page, 'make apparel')).toBeVisible();

  await expect(page.getByText('read a novel', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Skip' }).click();
  await expect(page.getByText('Nothing left to attach.')).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();

  // Skipped comes back next time; Leave as is doesn't.
  await page.getByRole('button', { name: 'Attach loose activities' }).click();
  await page.getByRole('button', { name: 'Leave as is' }).click();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('button', { name: /Attach loose/ })).toHaveCount(0);
  await page.reload();
  await expect(centre(page, 'make apparel')).toBeVisible();
  await expect(page.getByRole('button', { name: /Attach loose/ })).toHaveCount(0);
});

test('stays responsive with 220 threads and 4000 activities', async ({ page }) => {
  test.slow();
  await page.addInitScript(seedScript, bigBlob(220, 4000));
  await page.goto('./graph');
  const nodes = page.getByRole('button', { name: /, \d+ links?$/ });
  await expect(nodes.first()).toBeVisible({ timeout: 20_000 });
  for (let i = 0; i < 5; i++) {
    const label = (await nodes.first().getAttribute('aria-label'))!;
    const name = label.split(',')[0];
    const t0 = Date.now();
    await nodes.first().click();
    await expect(centre(page, name)).toBeVisible();
    expect(Date.now() - t0, `re-centre on ${name}`).toBeLessThan(1500);
  }
  await page.getByRole('switch', { name: 'Show two steps out' }).click();
  await expect(nodes.first()).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/graph-big.png` });
});

test('attach mode holds the centre even when attaching changes which thread is most recent', async ({ page }) => {
  const blob = legacyBlob(['alpha', 'beta'], [
    { from: 'alpha', to: ['beta'], text: 'linked', daysAgo: 3 },
    { from: 'alpha', text: 'alpha lately', daysAgo: 0.5 },
    { text: 'loose one', daysAgo: 0.2 },
  ]);
  await page.addInitScript(seedScript, blob);
  await page.goto('./graph');
  await expect(centre(page, 'alpha')).toBeVisible();
  await page.getByRole('button', { name: 'Attach loose activities' }).click();
  await page.getByRole('button', { name: 'beta, 1 link. Attach here.' }).click();
  await expect(page.getByText('Attached → to beta').filter({ visible: true })).toBeVisible();
  await expect(centre(page, 'alpha')).toBeVisible();
});

test('the centre is an attach target too', async ({ page }) => {
  await page.addInitScript(seedScript, world);
  await page.goto('./graph');
  await page.getByRole('button', { name: 'Attach loose activities' }).click();
  await page.getByRole('button', { name: /^make apparel, \d+ steps.*Attach here\.$/ }).click();
  await expect(page.getByText('Attached → to make apparel').filter({ visible: true })).toBeVisible();
});
