/** P-34: the graph is Home (no threshold, staged steps, the summary and a list you can act from); P-37: "wanders". */
import { AxeBuilder } from '@axe-core/playwright';
import { Page } from '@playwright/test';

import { expect, logBox, logLine, openHome, openSheet, test } from './fixtures';
import { legacyBlob, seedScript } from './graphFixture';

const SHOTS = process.env.E2E_SHOTS; // set to a folder to save screenshots for a visual check

const offer = (page: Page) => page.getByRole('button', { name: '+ What’s it all for?', exact: true });
const notNow = (page: Page) => page.getByRole('button', { name: 'Not now', exact: true });
const dots = (page: Page) => page.locator('[data-testid^="graph-dot-"]').filter({ visible: true });
const nodes = (page: Page) => page.locator('[data-testid^="graph-node-"]').filter({ visible: true });
const line = (page: Page) => page.getByTestId('home-graph-line').filter({ visible: true });
const pictureList = (page: Page) => page.getByRole('list', { name: 'What’s in the picture' });
/** P-57: with no wanders, your recent logs as rows (a list named by the summary). */
const logRows = (page: Page) => page.getByRole('list', { name: /^Lately: / }).filter({ visible: true });

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
  await expect(line(page)).toHaveCount(0); // P-57: no "Lately" line; the rows say it (was: the line shows the summary).
  await expect(logRows(page)).toHaveAccessibleName(summary); // P-57: the rows' list carries the summary (was: the picture, an image).
  await expect(offer(page)).toBeVisible();
  await expect(notNow(page)).toBeVisible();
  await expectNoSeriousViolations(page);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p34-logs-no-wanders.png` });

  // A new log is a new dot, marked as the newest, named first.
  await logLine(page, 'watered the plants');
  await expect(dots(page)).toHaveCount(6);
  await expect(dots(page).first()).toHaveText('watered the plants'); // P-57: the newest row, on top (was: named first in the "Lately" line).
  // A dot still opens its log.
  await page.getByTestId('graph-dot-a1').click();
  await expect(page).toHaveURL(/\/activity\/a1$/);
});

/** P-57: the owner's Home (2026-11-22): two logs, no wanders. */
const ownersTwo = () =>
  legacyBlob([], [
    { text: 'Watched an video on AI acceptance', daysAgo: 0.01 },
    { text: 'Worked on wanderment', daysAgo: 0.2 },
  ]);
const LONG = 'Watched a long talk on how people come to accept AI tools at work, then wrote notes about what it means for wanderment';
/** Whether an element's text is cut off with "…" (it overflows its one line). */
const ellipsised = (l: ReturnType<Page['locator']>) =>
  l.locator('div[dir="auto"]').evaluate((e) => getComputedStyle(e).textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth);

test('P-57: logs with no wanders show their words: a dot and its text per row, newest first, no “Lately” line', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(seedScript, ownersTwo());
  await openHome(page);
  await expect(dots(page)).toHaveCount(2);
  await expect(dots(page)).toHaveText(['Watched an video on AI acceptance', 'Worked on wanderment']);
  // Each row is a link named by its words, a 44 px target across the width, the newest on top and marked.
  for (const [i, text] of ['Watched an video on AI acceptance', 'Worked on wanderment'].entries()) {
    const row = page.getByRole('link', { name: text, exact: true });
    await expect(row).toBeInViewport({ ratio: 1 });
    expect(await ellipsised(row)).toBe(false);
    const b = (await row.boundingBox())!;
    expect(b.height).toBeGreaterThanOrEqual(44);
    expect(b.width).toBeGreaterThan(300);
    await expect(row).toHaveAttribute('data-testid', `graph-dot-a${i}`);
  }
  const [first, second] = [(await dots(page).nth(0).boundingBox())!, (await dots(page).nth(1).boundingBox())!];
  expect(first.y + first.height).toBeLessThanOrEqual(second.y + 0.5);
  await expect(page.locator('[data-testid^="graph-dot-"][data-newest]')).toHaveAttribute('data-testid', 'graph-dot-a0');
  // Recency on the dot (P-48's heat), no time labels or counts.
  await expect(dots(page).nth(1)).toHaveAttribute('data-heat', '0.99');
  await expect(logRows(page)).not.toContainText(/\d/);
  // No "Lately" sentence on screen; the list still names the logs for a screen reader.
  await expect(line(page)).toHaveCount(0);
  await expect(page.getByText(/^Lately/).filter({ visible: true })).toHaveCount(0);
  await expect(logRows(page)).toHaveAccessibleName('Lately: Watched an video on AI acceptance; Worked on wanderment.');
  // Unchanged: the offer.
  await expect(offer(page)).toBeVisible();
  await expectNoSeriousViolations(page);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p57-logs-words-390.png` });

  // A tap on a row opens that log.
  await page.getByRole('link', { name: 'Worked on wanderment', exact: true }).click();
  await expect(page).toHaveURL(/\/activity\/a1$/);
});

test('P-57: a long log is cut short on screen with its full words in the accessible name', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(seedScript, legacyBlob([], [{ text: LONG, daysAgo: 0.01 }, { text: 'Worked on wanderment', daysAgo: 0.2 }]));
  await openHome(page);
  const row = page.getByRole('link', { name: LONG, exact: true });
  await expect(row).toBeVisible();
  expect(await ellipsised(row)).toBe(true);
  expect((await row.boundingBox())!.height).toBeLessThan(60); // one line
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expectNoSeriousViolations(page);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p57-logs-long-390.png` });
  await row.click();
  await expect(page).toHaveURL(/\/activity\/a0$/);
});

test('P-57: at 200 % zoom the rows stay readable, above the log box, nothing wider than the screen', async ({ page }) => {
  await page.setViewportSize({ width: 195, height: 422 });
  await page.addInitScript(seedScript, ownersTwo());
  await openHome(page);
  await expect(dots(page)).toHaveCount(2);
  await expect(line(page)).toHaveCount(0);
  await expect(page.getByTestId('home-graph-summary').filter({ visible: true })).toHaveCount(0);
  const box = (await logBox(page).boundingBox())!;
  for (const text of ['Watched an video on AI acceptance', 'Worked on wanderment']) {
    const row = page.getByRole('link', { name: text, exact: true });
    await expect(row).toBeInViewport({ ratio: 1 });
    const b = (await row.boundingBox())!;
    expect(b.height).toBeGreaterThanOrEqual(44);
    expect(b.x + b.width).toBeLessThanOrEqual(195);
    expect(b.y + b.height).toBeLessThanOrEqual(box.y);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(195);
  await expectNoSeriousViolations(page);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p57-logs-200.png` });
});

test('P-57: with the recency shading off, every dot but the newest mark is neutral', async ({ page }) => {
  const json = JSON.parse(ownersTwo());
  json.state.showShading = false;
  await page.addInitScript(seedScript, JSON.stringify(json));
  await openHome(page);
  await expect(dots(page)).toHaveCount(2);
  await expect(dots(page).nth(1)).toHaveAttribute('data-heat', '0.00');
  expect(await dots(page).nth(1).evaluate((e) => getComputedStyle(e.firstElementChild!).backgroundColor)).toBe('rgb(110, 104, 144)'); // dark Map: nightHeatInk(0) (was heatInk(0))
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

// P-60: no summary line and no list under the picture; the circles are the buttons, named as the list's were.
test('with wanders: the graph, the staged step under its node, and its circles to act from', async ({ page }) => {
  await page.addInitScript(seedScript, withWhy());
  await openHome(page);
  await expect(nodes(page)).toHaveCount(5);
  // P-50 (was: one quiet "↳" line under its node): draw was logged toward last, so it's focused (the
  // ring) and its step is the one drawn: a dot below and beside it, with its words; no age, no count.
  await expect(page.getByTestId('graph-selected-draw')).toBeVisible();
  await expect(page.getByTestId('graph-step-draw')).toHaveText('sketch a hand');
  await expect(page.locator('[data-testid^="graph-step-"]:not([data-testid^="graph-step-dot-"])').filter({ visible: true })).toHaveCount(1);
  const step = (await page.getByTestId('graph-step-dot-draw').boundingBox())!;
  const draw = (await page.getByTestId('graph-node-draw').boundingBox())!;
  expect(step.y).toBeGreaterThan(draw.y);
  expect(Math.abs(step.x + step.width / 2 - (draw.x + draw.width / 2))).toBeGreaterThan(24);
  // Node targets have room to breathe: taller than 44 px.
  expect(draw.height).toBeGreaterThan(44);
  // P-60: the summary isn't shown (was one line); it names the picture.
  await expect(line(page)).toHaveCount(0);
  await expect(page.getByTestId('home-graph-picture')).toHaveAccessibleName(/^What it’s for: make apparel, fed by draw and sew\./);
  // The whys and wanders in the picture, with their roles, in reading order (P-60: the circles; was a list under the summary).
  const items = pictureList(page).getByRole('button');
  expect(await items.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))).toEqual(['make apparel, what it’s for', 'sew, a wander', 'draw, a wander', 'get stronger, a wander', 'lift, a wander']); // P-60: reading order (the list had draw before sew)
  for (const b of await items.all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expectNoSeriousViolations(page);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p34-with-wanders.png` });
  // Activating one focuses the wander (P-50); its page opens from the card's name ("Open draw").
  await items.nth(2).click(); // P-60: draw is third in reading order (was second in the list)
  await page.getByRole('link', { name: 'Open draw', exact: true }).click();
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
  await expect(page).toHaveURL(/\/wanderment\/map$/); // P-65: graph moved to Map
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
  await openSheet(page, 'Wanders'); // P-58: a section of Home's sheet (was a tab)
  await expect(page.getByRole('heading', { name: 'Wanders', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'YOUR WANDERS' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^draw\s*sketch/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'sketch a hand Log this' })).toBeVisible();
  await expect(page.getByRole('button', { name: '+ New wander' })).toBeVisible();
  await expectNoSeriousViolations(page);
});

// P-61 (D-11): no bridge after a log from Home (was: "the bridge still works … right above the log box");
// the loose log is attached from the strip under the graph (P-60) instead.
test('a plain log from Home asks nothing; it’s attached from the loose strip under the graph', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await page.addInitScript(seedScript, withWhy());
  await openHome(page);
  await logLine(page, 'read a novel');
  await expect(page.getByRole('group', { name: 'Attach what you just logged' })).toHaveCount(0);
  await expect(page.getByText('Toward something — or just itself?')).toHaveCount(0);
  await expectNoSeriousViolations(page);
  await page.getByRole('list', { name: 'Logs without a wander' }).getByRole('button', { name: 'read a novel', exact: true }).click();
  await page.getByRole('button', { name: '→ to draw: attach', exact: true }).click();
  await expect(page.getByText('Attached → to draw', { exact: true }).filter({ visible: true })).toBeVisible();
});

// P-60: the summary isn't shown (was: "the summary, Explore and the list"); it names the list.
test('at 200 % zoom: no picture; Explore and the list named by the summary, its first item above the log box', async ({ page }) => {
  await page.setViewportSize({ width: 195, height: 422 });
  await page.addInitScript(seedScript, withWhy());
  await openHome(page);
  await expect(page.getByTestId('home-graph-picture')).toHaveCount(0); // P-60 (was: no img)
  await expect(page.getByTestId('home-graph-summary')).toHaveCount(0);
  await expect(page.getByRole('group', { name: /^What it’s for: make apparel/ })).toBeVisible();
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
  await openSheet(page, 'Wanders'); // P-58: a section of Home's sheet (was a tab)
  await expect(page.getByRole('heading', { name: 'YOUR WANDERS' })).toBeVisible();
  await check('Wanders');
  await openSheet(page, 'Activities'); // P-58: a section of Home's sheet (was a tab)
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
