/** P-15: a live graph at the top of Home (whys and what feeds them, or your most active threads). */
import { AxeBuilder } from '@axe-core/playwright';
import { Page } from '@playwright/test';

import { expect, logBox, logLine, openHome, test } from './fixtures';
import { bigBlob, legacyBlob, seedScript } from './graphFixture';

const SHOTS = process.env.E2E_SHOTS; // set to a folder to save screenshots for a visual check

const graph = (page: Page) => page.getByTestId('home-graph').filter({ visible: true });
const picture = (page: Page) => page.getByRole('img').filter({ visible: true });
/** Nodes are pointer shortcuts (hidden from assistive tech), so they're found by test id. */
const node = (page: Page, id: string) => page.getByTestId(`graph-node-${id}`).filter({ visible: true });
const link = (page: Page, from: string, to: string) => page.getByTestId(`graph-link-${from}-${to}`);
const openGraph = (page: Page) => page.getByRole('link', { name: 'Open graph', exact: true });

async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = serious.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => `${n.target.join(' ')} ${n.html.slice(0, 200)}`).slice(0, 5).join('\n  ')}`);
  expect(report, report.join('\n')).toEqual([]);
}

/** Picks the "+ New thread “name”" suggestion for the @name at the end of `text`, then logs. */
async function logCreating(page: Page, text: string, name: string, doing?: string) {
  await logBox(page).fill(text);
  await page.getByRole('option', { name: `+ New thread “${name}”` }).click();
  if (doing) await page.getByRole('button', { name: `Suggested: doing ${doing}. Tap to accept.` }).click();
  await logBox(page).press('Enter');
}

/** The id of the node whose label is `name` (ids are made up on the device). */
const idOf = async (page: Page, name: string) => {
  const el = page.locator('[data-testid^="graph-node-"]').filter({ visible: true }).filter({ hasText: new RegExp(`^${name}$`) }).first();
  return ((await el.getAttribute('data-testid')) ?? '').replace('graph-node-', '');
};

const DAY = 864e5;
/** Threads (id = name), the given ones declared in order, and a few links between them. */
function world(declared: string[]) {
  const now = Date.now();
  const json = JSON.parse(
    legacyBlob(['draw', 'make apparel', 'sew', 'get stronger', 'lift', 'run', 'read'], [
      // Too little inflow for anything to be earned: only declared whys head the graph.
      { from: 'draw', to: ['make apparel'], text: 'sketch', daysAgo: 1 },
      { from: 'sew', to: ['make apparel'], text: 'hemmed', daysAgo: 2 },
      { from: 'lift', to: ['get stronger'], text: 'squats', daysAgo: 1 },
      { from: 'run', text: 'ran', daysAgo: 1 },
      { to: ['read'], text: 'a chapter', daysAgo: 1 },
    ]),
  );
  declared.forEach((id, i) => (json.state.data.threads[id].declaredAt = new Date(now - (10 - i) * DAY).toISOString()));
  return JSON.stringify(json);
}

test('a fresh app shows no graph; the first threads and a link appear as you log, and a plain “to” fills', async ({ page }) => {
  await openHome(page);
  await expect(page.getByText('Log what you just did.')).toBeVisible();
  await expect(page.getByTestId('home-graph')).toHaveCount(0);
  await expect(page.getByRole('img')).toHaveCount(0);

  // A plain "to draw" log: draw appears, filled softly (no doing thread, so no link).
  await logCreating(page, 'sketch @draw', 'draw');
  await expect(graph(page)).toBeVisible();
  const draw = await idOf(page, 'draw');
  expect(draw).not.toBe('');
  await expect(node(page, draw)).toHaveAttribute('data-fill', '1');

  // Doing draw → to be a better drawer: the new node and the link, right after the log.
  await logCreating(page, 'drawing hands @be a better drawer', 'be a better drawer', 'draw');
  const better = await idOf(page, 'be a better drawer');
  await expect(node(page, better)).toBeVisible();
  await expect(node(page, draw)).toBeVisible();
  await expect(link(page, draw, better)).toHaveCount(1);
  await expect(node(page, better)).toHaveAttribute('data-fill', '0');
  await expect(picture(page)).toHaveAccessibleName('Lately: draw → be a better drawer.');

  // Undo takes the link away again.
  await page.getByRole('button', { name: 'Undo' }).filter({ visible: true }).click();
  await expect(link(page, draw, better)).toHaveCount(0);
});

test('marking a thread “What it’s for” makes it a why column right away; nodes open their thread', async ({ page }) => {
  await page.addInitScript(seedScript, world([]));
  await openHome(page);
  // No whys yet: the most active threads.
  await expect(node(page, 'draw')).toHaveAttribute('data-kind', 'thread');
  await expect(link(page, 'draw', 'make apparel')).toHaveCount(1);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/home-graph-no-whys-links.png` });

  await node(page, 'make apparel').click();
  await expect(page).toHaveURL(/\/thread\/make%20apparel$|\/thread\/make apparel$/);
  await page.getByRole('button', { name: 'What it’s for', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Not what it’s for right now', exact: true })).toBeVisible();
  await page.goBack();

  await expect(node(page, 'make apparel')).toHaveAttribute('data-kind', 'why');
  await expect(page.locator('[data-testid="graph-node-draw"][data-under="make apparel"]')).toBeVisible();
  await expect(link(page, 'draw', 'make apparel')).toHaveCount(1);
  await expect(picture(page)).toHaveAccessibleName('What it’s for: make apparel, fed by draw and sew.');

  // A feeder opens its own thread.
  await page.locator('[data-testid="graph-node-sew"][data-under="make apparel"]').click();
  await expect(page).toHaveURL(/\/thread\/sew$/);
});

test('the graph is one accessible element: its summary, in names; nodes are out of the tab order', async ({ page }) => {
  await page.addInitScript(seedScript, world(['make apparel', 'get stronger']));
  await openHome(page);
  await expect(picture(page)).toHaveCount(1);
  const name = await picture(page).getAttribute('aria-label');
  expect(name).toBe('What it’s for: make apparel, fed by draw and sew; get stronger, fed by lift.');
  expect(name).not.toMatch(/\d/);
  // Nothing inside is exposed or focusable.
  await expect(picture(page).getByRole('button')).toHaveCount(0);
  const focusable = await picture(page).locator('[tabindex]:not([tabindex="-1"]), a[href], button').count();
  expect(focusable).toBe(0);
  // "Open graph" is in the header (one of them); Tab from the header skips the nodes to the list.
  await expect(openGraph(page)).toHaveCount(1);
  await page.getByRole('link', { name: 'Settings and backup' }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: '+ New thread' })).toBeFocused();
  // Cards are still found exactly once by their name.
  await expect(page.getByRole('button', { name: /^draw\s*\S/ })).toHaveCount(1);
  await expectNoSeriousViolations(page);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/home-graph-2-whys.png` });

  await openGraph(page).click();
  await expect(page).toHaveURL(/\/graph$/);
  // The Graph tab's own screen (its graph / list switch) is showing.
  await expect(page.getByRole('tab', { name: 'List view' })).toBeVisible();
});

test('with no whys: the most active threads, axe-clean, and the cards keep their names', async ({ page }) => {
  await openHome(page);
  await logCreating(page, 'practiced scales @play guitar', 'play guitar');
  const next = page.getByRole('textbox', { name: 'Optional next step for play guitar' });
  await next.fill('learn the F chord');
  await next.press('Enter');
  await logLine(page, 'read a novel');
  await expect(graph(page)).toBeVisible();
  await expect(picture(page)).toHaveAccessibleName('Lately: play guitar.');
  await expect(page.getByRole('button', { name: /^play guitar\s*\S/ })).toHaveCount(1);
  await expect(page.getByRole('button', { name: /^play guitar/ })).toHaveCount(1);
  await expectNoSeriousViolations(page);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/home-graph-no-whys.png` });
});

test('the first card and its crumb stay above the log box at 390 × 844', async ({ page }) => {
  await page.addInitScript(seedScript, world(['make apparel', 'get stronger']));
  await openHome(page);
  await expect(picture(page)).toBeVisible();
  const box = (await picture(page).boundingBox())!;
  expect(box.height).toBe(176);
  const card = page.getByRole('button', { name: /^(make apparel|draw|sew|get stronger|lift|run|read)\s*\S/ }).first();
  const cardBox = (await card.boundingBox())!;
  const logTop = (await logBox(page).boundingBox())!.y;
  expect(cardBox.y + cardBox.height).toBeLessThan(logTop);
});

test('at 200 % zoom: only the summary and “Open graph”', async ({ page }) => {
  await page.setViewportSize({ width: 195, height: 422 });
  await page.addInitScript(seedScript, world(['make apparel']));
  await openHome(page);
  await expect(page.getByTestId('home-graph-summary').filter({ visible: true })).toHaveText('What it’s for: make apparel, fed by draw and sew.');
  await expect(openGraph(page)).toBeVisible();
  await expect(openGraph(page)).toHaveCount(1);
  await expect(page.locator('[data-testid^="graph-node-"]')).toHaveCount(0);
  await expect(page.getByRole('img')).toHaveCount(0);
  const box = (await openGraph(page).boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.x + box.width).toBeLessThanOrEqual(195);
  await expectNoSeriousViolations(page);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/home-graph-200.png` });
});

test('with a large history the graph is there with the list, and logging stays quick', async ({ page }) => {
  test.slow();
  await page.addInitScript(seedScript, bigBlob(220, 4000));
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /THREADS|TO / }).first()).toBeVisible({ timeout: 20_000 });
  // Rendered in the same pass as the list (no second wait).
  await expect(picture(page)).toBeVisible({ timeout: 1000 });
  await expect(page.locator('[data-testid^="graph-node-"][data-kind="why"]').filter({ visible: true })).toHaveCount(3);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/home-graph-bigblob.png` });
  await logBox(page).fill('home log');
  const t0 = Date.now();
  await logBox(page).press('Enter');
  await expect(page.getByText('Logged', { exact: true }).filter({ visible: true })).toBeVisible();
  const ms = Date.now() - t0;
  console.log(`bigBlob with the graph: log → toast ${ms} ms`);
  expect(ms).toBeLessThan(1500);
});
