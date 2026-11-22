/** P-34: the graph is Home (no threshold, staged steps, the summary and a list you can act from); P-37: "wanders". */
import { AxeBuilder } from '@axe-core/playwright';
import { Page } from '@playwright/test';

import { expect, logBox, logLine, openHome, test } from './fixtures';
import { legacyBlob, seedScript } from './graphFixture';

const SHOTS = process.env.E2E_SHOTS; // set to a folder to save screenshots for a visual check

const offer = (page: Page) => page.getByRole('button', { name: '+ What’s it all for?', exact: true });
const notNow = (page: Page) => page.getByRole('button', { name: 'Not now', exact: true });
const dots = (page: Page) => page.locator('[data-testid^="graph-dot-"]').filter({ visible: true });
const nodes = (page: Page) => page.locator('[data-testid^="graph-node-"]').filter({ visible: true });
const line = (page: Page) => page.getByTestId('home-graph-line').filter({ visible: true });
const picture = (page: Page) => page.getByRole('img').filter({ visible: true });
const pictureList = (page: Page) => page.getByRole('list', { name: 'What’s in the picture' });

async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = serious.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => `${n.target.join(' ')} ${n.html.slice(0, 200)}`).slice(0, 5).join('\n  ')}`);
  expect(report, report.join('\n')).toEqual([]);
}

const DAY = 864e5;
/** The owner's data today: logs, no wanders. */
const ownerLike = () =>
  legacyBlob(
    [],
    ['read a chapter', 'sketched a hand', 'ran 5k', 'tidied the desk', 'cooked dinner'].map((text, i) => ({ text, daysAgo: 0.1 + i })),
  );
/** Wanders with one declared why, a staged step on draw, and none on the others. */
function withWhy() {
  const json = JSON.parse(
    legacyBlob(['draw', 'make apparel', 'sew', 'get stronger', 'lift'], [
      { from: 'draw', to: ['make apparel'], text: 'sketch', daysAgo: 1 },
      { from: 'sew', to: ['make apparel'], text: 'hemmed', daysAgo: 2 },
      { from: 'lift', to: ['get stronger'], text: 'squats', daysAgo: 1 },
    ]),
  );
  json.state.data.threads['make apparel'].declaredAt = new Date(Date.now() - 5 * DAY).toISOString();
  json.state.data.threads.draw.next = 'sketch a hand';
  return JSON.stringify(json);
}

test('a fresh app: the welcome and “+ What’s it all for?”, never “fills in once you’ve logged”', async ({ page }) => {
  await openHome(page);
  // P-36: the first run comes first on a fresh app; skipped, the offer is there as before.
  await page.getByRole('button', { name: /^Not sure yet\? Skip/ }).click();
  await expect(page.getByText('Log what you just did.')).toBeVisible();
  await expect(offer(page)).toBeVisible();
  await expect(page.getByText(/fills in/i)).toHaveCount(0);
  expect((await offer(page).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expectNoSeriousViolations(page);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p34-fresh.png` });
});

test('logs with no wanders: dots on their own, the newest marked, and the summary names them', async ({ page }) => {
  await page.addInitScript(seedScript, ownerLike());
  await openHome(page);
  await expect(dots(page)).toHaveCount(5);
  await expect(nodes(page)).toHaveCount(0);
  await expect(page.locator('[data-testid^="graph-dot-"][data-newest]')).toHaveAttribute('data-testid', 'graph-dot-a0');
  const summary = 'Lately: read a chapter; sketched a hand; ran 5k; tidied the desk; cooked dinner.';
  await expect(line(page)).toHaveText(summary);
  await expect(picture(page)).toHaveAccessibleName(summary);
  await expect(offer(page)).toBeVisible();
  await expect(notNow(page)).toBeVisible();
  await expectNoSeriousViolations(page);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p34-logs-no-wanders.png` });

  // A new log is a new dot, marked as the newest, named first.
  await logLine(page, 'watered the plants');
  await expect(dots(page)).toHaveCount(6);
  await expect(line(page)).toHaveText(/^Lately: watered the plants; read a chapter;/);
  // A dot still opens its log.
  await page.getByTestId('graph-dot-a1').click();
  await expect(page).toHaveURL(/\/activity\/a1$/);
});

test('“+ What’s it all for?” names a wander and marks it what it’s for; Undo takes it back', async ({ page }) => {
  await page.addInitScript(seedScript, ownerLike());
  await openHome(page);
  await offer(page).click();
  const field = page.getByRole('textbox', { name: 'What it’s all for' });
  await expect(field).toBeFocused();
  await field.fill('feel productive');
  await field.press('Enter');
  await expect(page.getByText('“feel productive” is what it’s for', { exact: true }).filter({ visible: true })).toBeVisible();
  // There's a why now: the offer goes, and the why heads the picture.
  await expect(offer(page)).toHaveCount(0);
  await expect(nodes(page).filter({ hasText: /^feel productive$/ })).toHaveAttribute('data-kind', 'why');
  await expect(pictureList(page).getByRole('button', { name: 'feel productive, what it’s for', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).filter({ visible: true }).click();
  await expect(offer(page)).toBeVisible();
});

test('“Not now” hides the offer for good, across a reload', async ({ page }) => {
  await page.addInitScript(seedScript, ownerLike());
  await openHome(page);
  await notNow(page).click();
  await expect(offer(page)).toHaveCount(0);
  await page.reload();
  await expect(logBox(page)).toBeVisible();
  await expect(dots(page)).toHaveCount(5);
  await expect(offer(page)).toHaveCount(0);
});

test('with wanders: the graph, the staged step under its node, the summary line and a list to act from', async ({ page }) => {
  await page.addInitScript(seedScript, withWhy());
  await openHome(page);
  await expect(nodes(page)).toHaveCount(5);
  // Only draw has a staged step: one quiet line under its node, no age, no count.
  await expect(page.getByTestId('graph-step-draw')).toHaveText('↳ sketch a hand');
  await expect(page.locator('[data-testid^="graph-step-"]').filter({ visible: true })).toHaveCount(1);
  const step = (await page.getByTestId('graph-step-draw').boundingBox())!;
  const draw = (await page.getByTestId('graph-node-draw').boundingBox())!;
  expect(step.y).toBeGreaterThanOrEqual(draw.y + draw.height - 1);
  expect(Math.abs(step.x + step.width / 2 - (draw.x + draw.width / 2))).toBeLessThan(2);
  // Node targets have room to breathe: taller than 44 px.
  expect(draw.height).toBeGreaterThan(44);
  // The summary is visible, in one line.
  await expect(line(page)).toHaveText(/^What it’s for: make apparel, fed by draw and sew\./);
  expect((await line(page).boundingBox())!.height).toBeLessThanOrEqual(23);
  // The list after the summary: the whys and wanders in the picture, with their roles, in reading order.
  const items = pictureList(page).getByRole('button');
  await expect(items).toHaveText(['make apparel, what it’s for', 'draw, a wander', 'sew, a wander', 'get stronger, a wander', 'lift, a wander']);
  for (const b of await items.all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expectNoSeriousViolations(page);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p34-with-wanders.png` });
  // Activating one opens the wander (for now).
  await items.nth(1).click();
  await expect(page).toHaveURL(/\/thread\/draw$/);
});

test('Explore opens the old graph view (with its List view), from Home and from a wander’s page', async ({ page }) => {
  await page.addInitScript(seedScript, withWhy());
  await openHome(page);
  await expect(page.getByRole('tab', { name: 'Graph' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Explore', exact: true }).click();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(page.getByRole('heading', { name: 'Explore' })).toBeVisible();
  // Its centre (with its steps) and the graph / list switch.
  await expect(page.getByRole('button', { name: /^\S.*, \d+ steps?/ }).first()).toBeVisible();
  await expectNoSeriousViolations(page);
  await page.getByRole('tab', { name: 'List view' }).click();
  await expect(page.getByRole('heading', { name: /^Flows into |flows to$/ }).first()).toBeVisible();
  await expectNoSeriousViolations(page);
  await page.getByRole('button', { name: '‹ Back' }).click();
  await expect(page).toHaveURL(/\/wanderment\/$/);
  await expect(page.getByRole('heading', { name: 'Wanderment' })).toBeVisible();

  // From a wander's page, centred on that wander.
  await page.goto('./thread/sew');
  await expect(page.getByRole('button', { name: 'Rename' })).toBeVisible();
  await page.getByRole('link', { name: 'Explore', exact: true }).click();
  await expect(page).toHaveURL(/\/explore\?center=sew$/);
  await expect(page.getByRole('button', { name: /^sew, \d+ steps?/ })).toBeVisible();
});

test('the Wanders tab shows the list that was Home: headers, cards and crumbs, “+ New wander”', async ({ page }) => {
  await page.addInitScript(seedScript, withWhy());
  await openHome(page);
  await page.getByRole('tab', { name: 'Wanders' }).click();
  await expect(page.getByRole('heading', { name: 'Wanders', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'YOUR WANDERS' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^draw\s*sketch/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'sketch a hand Log this' })).toBeVisible();
  await expect(page.getByRole('button', { name: '+ New wander' })).toBeVisible();
  await expectNoSeriousViolations(page);
});

test('the bridge still works after a log from Home, right above the log box', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await page.addInitScript(seedScript, withWhy());
  await openHome(page);
  await logLine(page, 'read a novel');
  const bridge = page.getByRole('group', { name: 'Attach what you just logged' });
  await expect(bridge).toBeInViewport();
  expect((await bridge.boundingBox())!.y + (await bridge.boundingBox())!.height).toBeLessThanOrEqual((await logBox(page).boundingBox())!.y);
  await expectNoSeriousViolations(page);
  await bridge.getByRole('button', { name: 'Attach to draw' }).click();
  await expect(page.getByText('Attached → to draw', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(bridge).toHaveCount(0);
});

test('at 200 % zoom: no picture; the summary, Explore and the list, its first item above the log box', async ({ page }) => {
  await page.setViewportSize({ width: 195, height: 422 });
  await page.addInitScript(seedScript, withWhy());
  await openHome(page);
  await expect(page.getByRole('img')).toHaveCount(0);
  await expect(page.getByTestId('home-graph-summary').filter({ visible: true })).toContainText('What it’s for: make apparel');
  await expect(page.getByRole('link', { name: 'Explore', exact: true })).toBeVisible();
  const first = pictureList(page).getByRole('button').first();
  await expect(first).toHaveText('make apparel, what it’s for');
  await expect(first).toBeInViewport({ ratio: 1 });
  const b = (await first.boundingBox())!;
  expect(b.y + b.height).toBeLessThanOrEqual((await logBox(page).boundingBox())!.y);
  expect(b.x + b.width).toBeLessThanOrEqual(195);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(195);
  await expectNoSeriousViolations(page);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p34-200.png` });
});

/** Everything a person sees or hears on the page: visible text, accessible names, placeholders. */
const words = (page: Page) =>
  page.evaluate(() => {
    const out = [document.body.innerText];
    for (const el of document.querySelectorAll('[aria-label], [placeholder], [title], [alt]')) {
      if (!(el as HTMLElement).checkVisibility()) continue;
      for (const a of ['aria-label', 'placeholder', 'title', 'alt']) if (el.getAttribute(a)) out.push(el.getAttribute(a)!);
    }
    return out.join('\n');
  });

test('P-37: no screen says “thread” — in what’s shown or in accessible names', async ({ page }) => {
  // Names and logs here never contain the word themselves.
  const json = JSON.parse(withWhy());
  json.state.data.activities.loose = { id: 'loose', text: 'read a novel', occurredAt: new Date().toISOString(), createdAt: new Date().toISOString(), toIds: [] };
  await page.addInitScript(seedScript, JSON.stringify(json));
  await openHome(page);
  const seen: [string, string][] = [];
  const check = async (where: string) => seen.push([where, await words(page)]);
  await check('Home');
  await logBox(page).fill('more @dr');
  await expect(page.getByRole('listbox')).toBeVisible();
  await check('Home, @ suggestions');
  await logBox(page).fill('');
  await page.getByRole('tab', { name: 'Wanders' }).click();
  await expect(page.getByRole('heading', { name: 'YOUR WANDERS' })).toBeVisible();
  await check('Wanders');
  await page.getByRole('tab', { name: 'Activities' }).click();
  await page.getByRole('tab', { name: 'No wander' }).click();
  await check('Activities');
  await page.goto('./explore');
  await check('Explore');
  await page.getByRole('tab', { name: 'List view' }).click();
  await check('Explore, list');
  await page.getByRole('button', { name: 'Attach loose activities' }).click();
  await check('Explore, attach');
  await page.goto('./thread/draw');
  await page.getByRole('button', { name: 'Rename' }).click();
  await check('Wander page, renaming');
  await page.goto('./activity/a0');
  await check('Activity');
  await page.goto('./settings');
  await check('Settings');
  await page.goto('./search');
  await page.getByRole('textbox', { name: 'Search' }).fill('s');
  await check('Search');
  for (const [where, text] of seen) expect(text.match(/\bthreads?\b/gi), `${where}:\n${text}`).toBeNull();
});
