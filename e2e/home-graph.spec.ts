/** P-15: a live graph at the top of Home (whys and what feeds them, or your most active threads, and your latest logs as dots). */
import { AxeBuilder } from '@axe-core/playwright';
import { Page } from '@playwright/test';

import { expect, logBox, logLine, openHome, test } from './fixtures';
import { bigBlob, legacyBlob, seedScript } from './graphFixture';

const SHOTS = process.env.E2E_SHOTS; // set to a folder to save screenshots for a visual check

const graph = (page: Page) => page.getByTestId('home-graph').filter({ visible: true });
const picture = (page: Page) => page.getByRole('img').filter({ visible: true });
/** Nodes and dots are pointer shortcuts (hidden from assistive tech), so they're found by test id. */
const node = (page: Page, id: string) => page.getByTestId(`graph-node-${id}`).filter({ visible: true });
const nodes = (page: Page) => page.locator('[data-testid^="graph-node-"]').filter({ visible: true });
const dots = (page: Page) => page.locator('[data-testid^="graph-dot-"]').filter({ visible: true });
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

/** Logs `text` @-mentioning each thread in turn, as typed (plain "to"s, no doing thread). `[name, true]` makes it. */
async function logMentioning(page: Page, text: string, names: [string, boolean][]) {
  await logBox(page).fill(text);
  for (const [name, isNew] of names) {
    await logBox(page).press('End');
    await logBox(page).pressSequentially(` @${name}`);
    await page
      .getByRole('option', { name: isNew ? `+ New thread “${name}”` : new RegExp(`^${name}`) })
      .first()
      .click();
  }
  await logBox(page).press('Enter');
  await expect(logBox(page)).toHaveValue('');
}

/** The id of the node whose label is `name` (ids are made up on the device). */
const idOf = async (page: Page, name: string) => {
  const el = nodes(page).filter({ hasText: new RegExp(`^${name}$`) }).first();
  return ((await el.getAttribute('data-testid')) ?? '').replace('graph-node-', '');
};

/** Where every node and dot is on screen, by test id. */
const positions = (page: Page) =>
  page
    .locator('[data-testid^="graph-node-"], [data-testid^="graph-dot-"]')
    .evaluateAll((els) => Object.fromEntries(els.map((e) => [e.getAttribute('data-testid')!, `${Math.round(e.getBoundingClientRect().x)},${Math.round(e.getBoundingClientRect().y)}`])));

const DAY = 864e5;
/** Threads (id = name), the given ones declared in order, and a few links between them. */
function world(declared: string[], more: { from?: string; to?: string[]; text: string; daysAgo: number }[] = []) {
  const now = Date.now();
  const json = JSON.parse(
    legacyBlob(['draw', 'make apparel', 'sew', 'get stronger', 'lift', 'run', 'read'], [
      // Too little inflow for anything to be earned: only declared whys head the graph.
      { from: 'draw', to: ['make apparel'], text: 'sketch', daysAgo: 1 },
      { from: 'sew', to: ['make apparel'], text: 'hemmed', daysAgo: 2 },
      { from: 'lift', to: ['get stronger'], text: 'squats', daysAgo: 1 },
      { from: 'run', text: 'ran', daysAgo: 1 },
      { to: ['read'], text: 'a chapter', daysAgo: 1 },
      ...more,
    ]),
  );
  declared.forEach((id, i) => (json.state.data.threads[id].declaredAt = new Date(now - (10 - i) * DAY).toISOString()));
  return JSON.stringify(json);
}

test('a fresh app shows no graph; the first thread, its dot and a link appear as you log', async ({ page }) => {
  await openHome(page);
  await expect(page.getByText('Log what you just did.')).toBeVisible();
  await expect(page.getByTestId('home-graph')).toHaveCount(0);
  await expect(page.getByRole('img')).toHaveCount(0);

  // A plain "to draw" log: draw appears, with that log as a dot and a line to it.
  await logCreating(page, 'sketch @draw', 'draw');
  await expect(graph(page)).toBeVisible();
  const draw = await idOf(page, 'draw');
  expect(draw).not.toBe('');
  await expect(dots(page)).toHaveCount(1);
  const first = ((await dots(page).first().getAttribute('data-testid')) ?? '').replace('graph-dot-', '');
  await expect(page.getByTestId(`graph-dotline-${first}-${draw}`)).toHaveCount(1);

  // Doing draw → to be a better drawer: the new node and the link, right after the log.
  await logCreating(page, 'drawing hands @be a better drawer', 'be a better drawer', 'draw');
  const better = await idOf(page, 'be a better drawer');
  await expect(node(page, better)).toBeVisible();
  await expect(node(page, draw)).toBeVisible();
  await expect(link(page, draw, better)).toHaveCount(1);
  await expect(dots(page)).toHaveCount(2);
  await expect(picture(page)).toHaveAccessibleName('Your threads: draw toward be a better drawer. Lately: draw toward be a better drawer; draw.');

  // Undo takes the link (and its dot) away again.
  await page.getByRole('button', { name: 'Undo' }).filter({ visible: true }).click();
  await expect(link(page, draw, better)).toHaveCount(0);
  await expect(dots(page)).toHaveCount(1);
});

test('the owner’s way of logging: each plain log is a dot with a line to every thread it names; a new one moves nothing', async ({ page }) => {
  await openHome(page);
  await logMentioning(page, 'sketched', [
    ['draw', true],
    ['make apparel', true],
  ]);
  await logMentioning(page, 'inked a sketch', [['draw', false]]);
  await logMentioning(page, 'cast on', [['knit', true]]);

  await expect(nodes(page)).toHaveCount(3);
  await expect(dots(page)).toHaveCount(3);
  const [draw, apparel, knit] = [await idOf(page, 'draw'), await idOf(page, 'make apparel'), await idOf(page, 'knit')];
  // Each dot names its threads, with one line to each of them: draw and make apparel are connected through the first.
  const named = await dots(page).evaluateAll((els) => els.map((e) => [e.getAttribute('data-testid')!.replace('graph-dot-', ''), e.getAttribute('data-threads')!.split('|')] as const));
  expect(named.map(([, t]) => t)).toEqual([[knit], [draw], [draw, apparel]]);
  for (const [dot, threads] of named) for (const t of threads) await expect(page.getByTestId(`graph-dotline-${dot}-${t}`)).toHaveCount(1);
  await expect(page.locator('[data-testid^="graph-dotline-"]')).toHaveCount(4);
  await expect(picture(page)).toHaveAccessibleName('Your threads: draw, knit and make apparel. Lately: knit; draw; draw with make apparel.');
  // No numbers anywhere in the graph (no counts, no "+N").
  await expect(graph(page)).not.toContainText(/\d/);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/home-graph-owner-no-whys.png` });

  // A fourth log adds a dot and moves nothing else.
  const before = await positions(page);
  await logMentioning(page, 'hemmed a skirt', [['make apparel', false]]);
  await expect(dots(page)).toHaveCount(4);
  const after = await positions(page);
  for (const [key, at] of Object.entries(before)) expect(after[key], key).toBe(at);
  expect(Object.keys(after)).toHaveLength(Object.keys(before).length + 1);

  // Marking make apparel as what it's for moves nothing either; it's now drawn as a why.
  await node(page, apparel).click();
  await page.getByRole('button', { name: 'What it’s for', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Not what it’s for right now', exact: true })).toBeVisible();
  await page.goBack();
  await expect(node(page, apparel)).toHaveAttribute('data-kind', 'why');
  expect(await positions(page)).toEqual(after);
  await expect(picture(page)).toHaveAccessibleName('What it’s for: make apparel, logged to directly. Also: draw and knit. Lately: make apparel; knit; draw; draw with make apparel.');
  await expect(graph(page)).not.toContainText(/\d/);
  await expectNoSeriousViolations(page);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/home-graph-owner-1-why.png` });
});

test('marking a thread “What it’s for” makes it a why right away; nodes open their thread', async ({ page }) => {
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
  await expect(picture(page)).toHaveAccessibleName(
    'What it’s for: make apparel, fed by draw and sew. Also: get stronger, lift and read. Lately: read; lift toward get stronger; draw toward make apparel; sew toward make apparel. And more.',
  );

  // A feeder opens its own thread.
  await page.locator('[data-testid="graph-node-sew"][data-under="make apparel"]').click();
  await expect(page).toHaveURL(/\/thread\/sew$/);
});

test('undoing a declare takes the why away again; hiding a thread takes its node away', async ({ page }) => {
  await page.addInitScript(seedScript, world([]));
  await openHome(page);
  await node(page, 'make apparel').click();
  await page.getByRole('button', { name: 'What it’s for', exact: true }).click();
  await page.goBack();
  await expect(node(page, 'make apparel')).toHaveAttribute('data-kind', 'why');
  await page.getByRole('button', { name: 'Undo' }).filter({ visible: true }).click();
  await expect(node(page, 'make apparel')).toHaveAttribute('data-kind', 'thread');

  await node(page, 'read').click();
  // Hiding goes back to Home by itself.
  await page.getByRole('button', { name: 'Hide', exact: true }).click();
  await expect(logBox(page)).toBeVisible();
  await expect(node(page, 'read')).toHaveCount(0);
  await expect(page.getByTestId('graph-dot-a4')).toHaveCount(0);
});

test('a dot opens its activity; “and more →” opens the Graph tab', async ({ page }) => {
  await page.addInitScript(seedScript, world([]));
  await openHome(page);
  // Seven threads, six in the picture.
  await expect(nodes(page)).toHaveCount(6);
  await expect(page.getByTestId('graph-more')).toHaveText('and more →');
  await expect(picture(page)).toHaveAccessibleName(/ And more\.$/);
  await page.getByTestId('graph-dot-a4').click();
  await expect(page).toHaveURL(/\/activity\/a4$/);
  await page.goBack();
  await page.getByTestId('graph-more').click();
  await expect(page).toHaveURL(/\/graph$/);
  await expect(page.getByRole('tab', { name: 'List view' })).toBeVisible();
});

test('the graph is one accessible element: its summary, in names; nodes are out of the tab order', async ({ page }) => {
  await page.addInitScript(seedScript, world(['make apparel', 'get stronger']));
  await openHome(page);
  await expect(picture(page)).toHaveCount(1);
  const name = await picture(page).getAttribute('aria-label');
  expect(name).toBe(
    'What it’s for: make apparel, fed by draw and sew; get stronger, fed by lift. Also: read. Lately: read; lift toward get stronger; draw toward make apparel; sew toward make apparel. And more.',
  );
  expect(name).not.toMatch(/\d|→/);
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

test('activating the picture (a screen reader taps its centre) opens nothing', async ({ page }) => {
  // Two feeders under get stronger (the audit's B6 world): before the rework one of them sat on the centre.
  await page.addInitScript(seedScript, world(['make apparel', 'get stronger'], [{ from: 'run', to: ['get stronger'], text: 'ran far', daysAgo: 1 }]));
  await openHome(page);
  const box = (await picture(page).boundingBox())!;
  const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('[data-testid]')?.getAttribute('data-testid'), [box.x + box.width / 2, box.y + box.height / 2]);
  expect(hit).toBe('home-graph-picture');
  const url = page.url();
  await picture(page).click();
  await page.waitForTimeout(300);
  expect(page.url()).toBe(url);
});

test('a mouse press on a node doesn’t focus it (it’s hidden from assistive tech)', async ({ page }) => {
  await page.addInitScript(seedScript, world(['make apparel']));
  await openHome(page);
  const n = (await node(page, 'make apparel').boundingBox())!;
  await page.mouse.move(n.x + 5, n.y + 5);
  await page.mouse.down();
  expect(await page.evaluate(() => !!document.activeElement?.closest('[aria-hidden="true"]'))).toBe(false);
  await page.mouse.up();
});

test('lines, dots and borders stand out from the page (at least 3:1)', async ({ page }) => {
  await page.addInitScript(seedScript, world(['make apparel']));
  await openHome(page);
  const colours = await page.evaluate(() => {
    const pic = document.querySelector('[data-testid="home-graph-picture"]')!;
    const css = (e: Element) => getComputedStyle(e);
    return [
      ...[...pic.querySelectorAll('[data-testid^="graph-node-"]')].map((e) => css(e.firstElementChild!).borderTopColor),
      ...[...pic.querySelectorAll('[data-testid^="graph-dot-"]')].map((e) => css(e.firstElementChild!).backgroundColor),
      ...[...pic.querySelectorAll('line, path')].map((e) => (css(e).strokeOpacity === '1' ? css(e).stroke : 'transparent')),
      ...[...pic.querySelectorAll('polygon')].map((e) => (css(e).fillOpacity === '1' ? css(e).fill : 'transparent')),
    ];
  });
  expect(colours.length).toBeGreaterThan(3);
  const lum = (rgb: string) => {
    const [r, g, b] = (rgb.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map((v) => Number(v) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const page_ = lum('rgb(245, 243, 238)'); // the page background (theme C.bg)
  for (const c of colours) {
    expect(c, c).toMatch(/^rgb\(/);
    expect((Math.max(lum(c), page_) + 0.05) / (Math.min(lum(c), page_) + 0.05), c).toBeGreaterThanOrEqual(3);
  }
});

test('with no whys: the most active threads, axe-clean, and the cards keep their names', async ({ page }) => {
  await openHome(page);
  await logCreating(page, 'practiced scales @play guitar', 'play guitar');
  const next = page.getByRole('textbox', { name: 'Optional next step for play guitar' });
  await next.fill('learn the F chord');
  await next.press('Enter');
  await logLine(page, 'read a novel');
  await expect(graph(page)).toBeVisible();
  await expect(picture(page)).toHaveAccessibleName('Your threads: play guitar. Lately: play guitar.');
  await expect(page.getByRole('button', { name: /^play guitar\s*\S/ })).toHaveCount(1);
  await expect(page.getByRole('button', { name: /^play guitar/ })).toHaveCount(1);
  await expectNoSeriousViolations(page);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/home-graph-no-whys.png` });
});

test('the first run: with one thread the graph is compact, so the first card’s crumb stays clear of the toast', async ({ page }) => {
  await openHome(page);
  await logCreating(page, 'practiced scales @play guitar', 'play guitar');
  const next = page.getByRole('textbox', { name: 'Optional next step for play guitar' });
  await next.fill('learn the F chord');
  await next.press('Enter');
  // A loose line: the bridge asks, the toast shows, and the first-thread banner is up.
  await logLine(page, 'read a novel');
  await expect(page.getByRole('group', { name: 'Attach what you just logged' })).toBeVisible();
  await expect(page.getByText('Your first thread.')).toBeVisible();
  const crumb = page.getByRole('button', { name: 'learn the F chord Log this' });
  const c = (await crumb.boundingBox())!;
  const toast = (await page.getByRole('button', { name: 'Undo' }).filter({ visible: true }).locator('..').boundingBox())!;
  // What's at the crumb's bottom edge is the crumb, not the toast.
  const inCrumb = await crumb.evaluate((el, [x, y]) => el.contains(document.elementFromPoint(x, y)), [c.x + 10, c.y + c.height - 3]);
  expect(inCrumb).toBe(true);
  expect(c.y + c.height).toBeLessThanOrEqual(toast.y);
  expect((await picture(page).boundingBox())!.height).toBe(88);
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

test('on a short screen with the graph showing, a plain log’s bridge is in view', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await page.addInitScript(seedScript, world(['make apparel']));
  await openHome(page);
  await expect(picture(page)).toBeVisible();
  await logLine(page, 'read a novel');
  await expect(page.getByRole('group', { name: 'Attach what you just logged' })).toBeInViewport();
});

test('at 125 % zoom the picture still shows', async ({ page }) => {
  await page.setViewportSize({ width: 312, height: 675 });
  await page.addInitScript(seedScript, world(['make apparel']));
  await openHome(page);
  await expect(picture(page)).toBeVisible();
  await expect(node(page, 'make apparel')).toBeVisible();
  await expect(page.getByTestId('home-graph-summary')).toHaveCount(0);
});

test('from 280 to 320 px wide, Search and “Settings and backup” stay fully on screen; the Graph tab is still there', async ({ page }) => {
  await page.addInitScript(seedScript, world(['make apparel']));
  for (const width of [280, 300, 312, 320]) {
    await page.setViewportSize({ width, height: 700 });
    await openHome(page);
    await expect(picture(page), `${width}`).toBeVisible();
    for (const name of ['Search', 'Settings and backup']) {
      const b = (await page.getByRole('link', { name, exact: true }).boundingBox())!;
      expect(b.x, `${name} at ${width}`).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width, `${name} at ${width}`).toBeLessThanOrEqual(width);
      expect(b.width).toBeGreaterThanOrEqual(44);
    }
    await expect(page.getByRole('heading', { name: 'Wanderment' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Graph' })).toBeInViewport();
    if (SHOTS && width === 312) await page.screenshot({ path: `${SHOTS}/home-header-312.png` });
  }
});

test('every log visibly lands: the newest dot is marked, even once the dots are full', async ({ page }) => {
  // Twelve logs, all to draw: every dot spot is taken, so a new one lands where the oldest just left.
  const logs = Array.from({ length: 12 }, (_, i) => ({ to: ['draw'], text: `sketch ${i}`, daysAgo: (12 - i) / 10 }));
  await page.addInitScript(seedScript, legacyBlob(['draw', 'knit', 'make apparel'], logs));
  await openHome(page);
  await expect(dots(page)).toHaveCount(8);
  const newest = page.locator('[data-testid^="graph-dot-"][data-newest]').filter({ visible: true });
  await expect(newest).toHaveCount(1);
  await expect(newest).toHaveAttribute('data-testid', 'graph-dot-a11');
  const spot = async () => {
    const b = (await newest.boundingBox())!;
    return `${Math.round(b.x)},${Math.round(b.y)}`;
  };
  const before = await spot();
  // The mark: larger than the other dots, and in the accent colour (theme C.accent; the rest are C.muted).
  const look = (testId: string) =>
    page.getByTestId(testId).evaluate((e) => {
      const d = e.firstElementChild!;
      return [d.getBoundingClientRect().width, getComputedStyle(d).backgroundColor];
    });
  expect(await look('graph-dot-a11')).toEqual([14, 'rgb(168, 70, 15)']);
  expect(await look('graph-dot-a10')).toEqual([10, 'rgb(94, 91, 85)']);
  const stroke = (testId: string) => page.getByTestId(testId).evaluate((e) => parseFloat(getComputedStyle(e).strokeWidth));
  expect(await stroke('graph-dotline-a11-draw')).toBeGreaterThan(await stroke('graph-dotline-a10-draw'));

  await logMentioning(page, 'sketched again', [['draw', false]]);
  await expect(dots(page)).toHaveCount(8);
  await expect(newest).toHaveCount(1);
  await expect(newest).not.toHaveAttribute('data-testid', 'graph-dot-a11');
  // The log before it is still there, no longer marked: the mark moved, so the picture changed.
  await expect(page.getByTestId('graph-dot-a11')).toBeVisible();
  await expect(page.getByTestId('graph-dot-a11')).not.toHaveAttribute('data-newest');
  expect(await look('graph-dot-a11')).toEqual([10, 'rgb(94, 91, 85)']);
  expect(await spot()).not.toBe(before);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/home-graph-newest-dot.png` });
});

test('at 200 % zoom: only the summary (two lines) with “Open graph” beside it, and the whole first card stays above the log box', async ({ page }) => {
  await page.setViewportSize({ width: 195, height: 422 });
  const names = ['make apparel', 'get stronger', 'sell prints', 'draw', 'sew', 'cut patterns', 'lift', 'run', 'photograph', 'frame'];
  const at = (from: string, to: string) => ({ from, to: [to], text: 'a', daysAgo: 1 });
  const json = JSON.parse(
    legacyBlob(names, [
      at('draw', 'make apparel'),
      at('sew', 'make apparel'),
      at('cut patterns', 'make apparel'),
      at('lift', 'get stronger'),
      at('run', 'get stronger'),
      at('photograph', 'sell prints'),
      at('frame', 'sell prints'),
    ]),
  );
  ['make apparel', 'get stronger', 'sell prints'].forEach((n, i) => (json.state.data.threads[n].declaredAt = new Date(Date.now() - (5 - i) * DAY).toISOString()));
  await page.addInitScript(seedScript, JSON.stringify(json));
  await openHome(page);
  const summary = page.getByTestId('home-graph-summary').filter({ visible: true });
  await expect(summary).toContainText('What it’s for: make apparel, fed by');
  // 22 px lines (s.body).
  expect((await summary.boundingBox())!.height).toBeLessThanOrEqual(2 * 22 + 1);
  await expect(openGraph(page)).toBeVisible();
  await expect(openGraph(page)).toHaveCount(1);
  await expect(page.locator('[data-testid^="graph-node-"]')).toHaveCount(0);
  await expect(page.getByRole('img')).toHaveCount(0);
  const box = (await openGraph(page).boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.x + box.width).toBeLessThanOrEqual(195);
  // On the summary's row, not under it.
  const s = (await summary.boundingBox())!;
  expect(box.y).toBeLessThan(s.y + s.height);
  // The whole first card (its name and when it was last touched) is above the log box.
  const card = page.getByRole('button', { name: new RegExp(`^(${names.join('|')})\\s*\\S`) }).first();
  const c = (await card.boundingBox())!;
  expect(c.y + c.height).toBeLessThanOrEqual((await logBox(page).boundingBox())!.y);
  await expect(card).toBeInViewport({ ratio: 1 });
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
