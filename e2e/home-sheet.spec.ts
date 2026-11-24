/**
 * P-58 (owner, D-10): Wanders and Activities pull out from the home. No tab bar: one sheet with two
 * sections, Wanders | Activities; drag down, the scrim, Close, Esc or Back put it away.
 * P-83 (B-09 slice 5; Map retired): the sheet comes up from the composer's grabber (a 44 pt button with
 * an expanded state) by a tap or by a swipe that starts on it — never one over the field; it's in the
 * night palette, with a visible Close and rows for Explore, Search, Settings and Export.
 * P-84 (owner): the sheet's search lights the stars above — the sheet sits low, every matching line is
 * a star in the sky over it, the other lines dim, the nodes they went toward light; no counts; Back
 * clears the search first.
 */
import { AxeBuilder } from '@axe-core/playwright';
import { Page } from '@playwright/test';

import { expect, logBox, logLine, PROMPT, test } from './fixtures';
import { legacyBlob, seedScript } from './graphFixture';

const SHOTS = process.env.E2E_SHOTS; // set to a folder to save screenshots for a visual check

const NAME = 'Wanders and activities';
const handle = (page: Page) => page.getByRole('button', { name: NAME, exact: true });
/** The handle whether or not it's hidden from assistive tech (it is, under the open sheet). */
const handleEl = (page: Page) => page.getByTestId('home-sheet-handle');
const dialog = (page: Page) => page.getByRole('dialog', { name: NAME, exact: true });
const section = (page: Page, name: 'Wanders' | 'Activities') => dialog(page).getByRole('tab', { name, exact: true });
const sheetEl = (page: Page) => page.getByTestId('home-sheet');
const DAY = 864e5;

async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = serious.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => `${n.target.join(' ')} ${n.html.slice(0, 200)}`).slice(0, 5).join('\n  ')}`);
  expect(report, report.join('\n')).toEqual([]);
}

/** draw (with a step) and sew feed make apparel; one log with no wander. */
function world() {
  const json = JSON.parse(
    legacyBlob(['draw', 'make apparel', 'sew'], [
      { from: 'sew', to: ['make apparel'], text: 'hemmed', daysAgo: 2 },
      { from: 'draw', to: ['make apparel'], text: 'sketched', daysAgo: 1 },
      { text: 'cooked dinner', daysAgo: 0.5 },
    ]),
  );
  json.state.data.threads['make apparel'].declaredAt = new Date(Date.now() - 5 * DAY).toISOString();
  json.state.data.threads.draw.next = 'sketch a hand';
  return JSON.stringify(json);
}

const field = (page: Page) => page.getByRole('textbox', { name: PROMPT, exact: true });

/** P-83: the home (Map is retired), its field focused. */
async function open(page: Page) {
  await page.addInitScript(seedScript, world());
  await page.goto('./');
  await expect(field(page)).toBeVisible();
}

/** The sheet is out (the home behind it out of reach), on `on`. */
async function expectOpen(page: Page, on: 'Wanders' | 'Activities') {
  await expect(dialog(page)).toBeVisible();
  await expect(section(page, on)).toHaveAttribute('aria-selected', 'true');
  await expect(field(page)).toHaveCount(0);
  // At rest, not still sliding up: the home's composer is out of sight under it (its field box isn't drawn).
  await expect(page.getByTestId('field-box')).toHaveCount(0);
}

/** The sheet is away: Home is back, its handle reachable again. */
async function expectClosed(page: Page) {
  await expect(dialog(page)).toHaveCount(0);
  await expect(sheetEl(page)).toBeHidden();
  await expect(handle(page)).toBeVisible();
  await expect(handle(page)).toHaveAttribute('aria-expanded', 'false');
}

type Box = { x: number; y: number; width: number; height: number };
/** Drags with the mouse from the middle of `from` by dy, in steps (a finger's drag on web). */
async function drag(page: Page, from: Box, dy: number) {
  const x = from.x + from.width / 2;
  const y = from.y + from.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + dy, { steps: 12 });
  await page.mouse.up();
}
/** A short, slow drag (no flick): 20 px over half a second. */
async function twitch(page: Page, from: Box, dir: 1 | -1) {
  const x = from.x + from.width / 2;
  const y = from.y + from.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 5; i++) {
    await page.mouse.move(x, y + dir * 4 * i);
    await page.waitForTimeout(100);
  }
  await page.mouse.up();
}

test.describe('at 390 px', () => {
  test.beforeEach(async ({ page }) => open(page));

  // P-83: the grabber at the top of the composer (was: the handle under Map's What's next card and ＋).
  test('no tab bar: the home is the only screen, with the grabber at the top edge of the composer', async ({ page }) => {
    for (const name of ['Home', 'Wanders', 'Activities']) await expect(page.getByRole('tab', { name, exact: true })).toHaveCount(0);
    await expect(page.getByRole('tablist')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Wanders', exact: true })).toHaveCount(0);

    await expect(handle(page)).toBeVisible();
    await expect(handle(page)).toHaveAttribute('aria-expanded', 'false');
    const h = (await handle(page).boundingBox())!;
    expect(h.height).toBeGreaterThanOrEqual(44);
    expect(h.width).toBeGreaterThanOrEqual(44);
    // At the composer's top edge, centred, above the question and the field (in thumb reach).
    const composer = (await page.getByTestId('trailhead-scroll').boundingBox())!;
    const f = (await field(page).boundingBox())!;
    expect(h.y).toBeGreaterThanOrEqual(composer.y - 1);
    expect(h.y).toBeLessThan(f.y);
    expect(Math.abs(h.x + h.width / 2 - 195)).toBeLessThanOrEqual(4);
    // Map is retired: no Map link, no map signpost.
    await expect(page.getByRole('link', { name: 'Map', exact: true })).toHaveCount(0);
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p83-grabber.png` });
  });

  test('a tap opens it on Wanders, a modal dialog with focus inside, over most of the screen; Esc puts it away and focus goes back to the handle', async ({ page }) => {
    await handle(page).click();
    await expectOpen(page, 'Wanders');
    await expect(dialog(page)).toHaveAttribute('aria-modal', 'true');
    await expect(dialog(page).getByRole('tablist', { name: 'Wanders or Activities' })).toBeVisible();
    // Wanders is today's Wanders list, unchanged.
    await expect(dialog(page).getByRole('heading', { name: 'Wanders', exact: true })).toBeVisible();
    await expect(dialog(page).getByRole('heading', { name: 'TO MAKE APPAREL' }).or(dialog(page).getByRole('heading', { name: 'YOUR WANDERS' })).first()).toBeVisible();
    await expect(dialog(page).getByRole('button', { name: 'sketch a hand Log this' })).toBeVisible();
    // Focus moved into it; the home behind it is out of reach.
    expect(await dialog(page).evaluate((el) => el.contains(document.activeElement))).toBe(true);
    await expect(page.getByRole('heading', { name: PROMPT })).toHaveCount(0);
    await expect(handleEl(page)).toHaveAttribute('aria-expanded', 'true');
    // Most of the screen, a strip of sky above it.
    const d = (await sheetEl(page).boundingBox())!;
    expect(d.height).toBeGreaterThan(0.8 * 844);
    expect(d.y + d.height).toBeLessThanOrEqual(844 + 1);
    expect(d.y).toBeGreaterThan(0);
    for (const name of ['Wanders', 'Activities'] as const) {
      const t = (await section(page, name).boundingBox())!;
      expect(Math.min(t.width, t.height)).toBeGreaterThanOrEqual(44);
    }
    const close = (await dialog(page).getByRole('button', { name: 'Close', exact: true }).boundingBox())!;
    expect(Math.min(close.width, close.height)).toBeGreaterThanOrEqual(44);
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p58-sheet-wanders.png` });

    await page.keyboard.press('Escape');
    await expectClosed(page);
    await expect(handle(page)).toBeFocused();
    // The home is back as it was: its question and its field.
    await expect(page.getByRole('heading', { name: PROMPT })).toBeVisible();
    await expect(field(page)).toBeVisible();
  });

  test('the sections switch with the tabs at its top, and it reopens on the last one; the scrim and Close put it away', async ({ page }) => {
    await handle(page).click();
    await expectOpen(page, 'Wanders');
    await section(page, 'Activities').click();
    await expectOpen(page, 'Activities');
    await expect(section(page, 'Wanders')).toHaveAttribute('aria-selected', 'false');
    // Today's Activities list, unchanged: its own All | No wander filter and its rows.
    await expect(dialog(page).getByRole('tab', { name: 'No wander' })).toBeVisible();
    await expect(dialog(page).getByText('cooked dinner', { exact: true })).toBeVisible();
    await expect(dialog(page).getByRole('heading', { name: 'Wanders', exact: true })).toBeHidden();
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p58-sheet-activities.png` });

    // A tap on the scrim (over Home's header) puts it away.
    await page.mouse.click(195, 20);
    await expectClosed(page);
    await expect(handle(page)).toBeFocused();
    await handle(page).click();
    await expectOpen(page, 'Activities');
    await dialog(page).getByRole('button', { name: 'Close', exact: true }).click();
    await expectClosed(page);
    await expect(handle(page)).toBeFocused();
  });

  // P-83: from the composer's last chip (was: from Map's ＋).
  test('on web it’s reachable by keyboard: Tab from the field past I’m not sure to the grabber, Enter opens, Esc closes', async ({ page }) => {
    await expect(field(page)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'I’m not sure — light up the map', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(handle(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await expectOpen(page, 'Wanders');
    await expect(section(page, 'Wanders')).toBeFocused();
    await page.keyboard.press('Escape');
    await expectClosed(page);
    await expect(handle(page)).toBeFocused();
  });

  test('a drag up on the grabber pulls it out; a drag down on its top puts it away; a twitch does neither; a drag up over the field never opens it', async ({ page }) => {
    // Fold-in 10: the swipe only starts on the grabber.
    await drag(page, (await field(page).boundingBox())!, -400);
    await page.waitForTimeout(400);
    await expectClosed(page);

    // A short drag springs back.
    await twitch(page, (await handle(page).boundingBox())!, -1);
    await page.waitForTimeout(400);
    await expectClosed(page);

    await drag(page, (await handle(page).boundingBox())!, -400);
    await expectOpen(page, 'Wanders');

    const grab = (await dialog(page).getByRole('button', { name: 'Close', exact: true }).boundingBox())!;
    await twitch(page, grab, 1);
    await page.waitForTimeout(400);
    await expectOpen(page, 'Wanders');
    await drag(page, grab, 400);
    await expectClosed(page);
  });

  test('each section logs from its own box, as the tabs did; the home’s field stays out of it', async ({ page }) => {
    await handle(page).click();
    await expectOpen(page, 'Wanders');
    // The Wanders section's box: a plain log (P-61: asks nothing there either; was: the bridge asked there).
    await logLine(page, 'stretched');
    await expect(page.getByText('Logged', { exact: true }).filter({ visible: true })).toHaveCount(1);
    await expect(dialog(page).getByRole('group', { name: 'Attach what you just logged' })).toHaveCount(0);
    await expectOpen(page, 'Wanders');

    await section(page, 'Activities').click();
    await expectOpen(page, 'Activities');
    await expect(page.getByRole('group', { name: 'Attach what you just logged' })).toHaveCount(0);
    await logBox(page).fill('watered the plants @sew');
    await page.getByRole('option', { name: 'sew' }).click();
    await logBox(page).press('Enter');
    await expect(dialog(page).getByText('watered the plants', { exact: true })).toBeVisible();
    await expect(dialog(page).getByText('stretched', { exact: true })).toBeVisible();
    // Only one log box in reach: the section's.
    await expect(page.getByRole('textbox', { name: 'What did you just do?' })).toHaveCount(1);
    await expect(logBox(page)).toHaveValue('');
  });

  test('an item opens its page; Back lands on Home with the sheet still out on the same section', async ({ page }) => {
    await handle(page).click();
    await dialog(page).getByRole('button', { name: /^sew\s*\S/ }).click();
    await expect(page.getByRole('button', { name: '‹ Back' })).toBeVisible();
    await expect(dialog(page)).toHaveCount(0);
    await page.getByRole('button', { name: '‹ Back' }).click();
    await expectOpen(page, 'Wanders');
    // Put away and out again: it still steps back over its own history entry.
    await page.keyboard.press('Escape');
    await expectClosed(page);
    await handle(page).click();

    await section(page, 'Activities').click();
    await dialog(page).getByText('cooked dinner', { exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'What you did' })).toHaveValue('cooked dinner');
    await page.goBack();
    await expectOpen(page, 'Activities');
    // Back again puts the sheet away before leaving Home.
    await page.goBack();
    await expectClosed(page);
    await expect(page).toHaveURL(/\/wanderment\/$/);
  });

  test('the browser’s Back closes the sheet before leaving the home', async ({ page }) => {
    await handle(page).click();
    await expectOpen(page, 'Wanders');
    await page.goBack();
    await expectClosed(page);
    await expect(page).toHaveURL(/\/wanderment\/$/);
    await expect(field(page)).toBeVisible();
    // Opened and closed again by Esc, it doesn't leave a Back step behind it.
    await handle(page).click();
    await expectOpen(page, 'Wanders');
    await page.keyboard.press('Escape');
    await expectClosed(page);
    await handle(page).click();
    await expectOpen(page, 'Wanders');
    await page.goBack();
    await expectClosed(page);
    await expect(page).toHaveURL(/\/wanderment\/$/);
  });

  test('it slides, but under Reduce Motion it just appears and goes', async ({ page }) => {
    const watch = () =>
      sheetEl(page).evaluate((el) => {
        const w = window as unknown as { __ys: number[] };
        w.__ys = [];
        new MutationObserver(() => {
          const m = /translateY\((-?[\d.]+)px\)/.exec((el as HTMLElement).style.transform);
          if (m) w.__ys.push(Number(m[1]));
        }).observe(el, { attributes: true, attributeFilter: ['style'] });
      });
    const ys = () => page.evaluate(() => (window as unknown as { __ys: number[] }).__ys);
    const between = (v: number[]) => v.filter((y) => y > 1 && y < 700);

    await watch();
    await handle(page).click();
    await expectOpen(page, 'Wanders');
    expect(between(await ys()).length).toBeGreaterThan(0);

    await page.keyboard.press('Escape');
    await expectClosed(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await watch();
    await handle(page).click();
    await expectOpen(page, 'Wanders');
    await page.keyboard.press('Escape');
    await expectClosed(page);
    await page.waitForTimeout(400);
    expect(between(await ys())).toEqual([]);
  });
});

test('deep links to /wanders and /activities open the home with the sheet on that section; Back puts it away first', async ({ page }) => {
  await page.addInitScript(seedScript, world());
  await page.goto('./activities');
  await expectOpen(page, 'Activities');
  await expect(page).toHaveURL(/\/wanderment\/$/); // P-83: the home (was Map)
  await expect(dialog(page).getByText('cooked dinner', { exact: true })).toBeVisible();
  await page.goBack();
  await expectClosed(page);
  await expect(field(page)).toBeVisible();

  await page.goto('./wanders');
  await expectOpen(page, 'Wanders');
  await expect(dialog(page).getByRole('heading', { name: 'Wanders', exact: true })).toBeVisible();
});

test('at 200 % zoom (195 px) the handle and both sections have no serious accessibility violations', async ({ page }) => {
  await page.setViewportSize({ width: 195, height: 422 });
  await open(page);
  const h = (await handle(page).boundingBox())!;
  expect(h.height).toBeGreaterThanOrEqual(44);
  expect(h.x + h.width).toBeLessThanOrEqual(195);
  await expectNoSeriousViolations(page);
  await handle(page).click();
  await expectOpen(page, 'Wanders');
  for (const name of ['Wanders', 'Activities'] as const) {
    const t = (await section(page, name).boundingBox())!;
    expect(Math.min(t.width, t.height)).toBeGreaterThanOrEqual(44);
    expect(t.x + t.width).toBeLessThanOrEqual(195);
  }
  await expectNoSeriousViolations(page);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p58-200-wanders.png` });
  await section(page, 'Activities').click();
  await expectOpen(page, 'Activities');
  await expectNoSeriousViolations(page);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p58-200-activities.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(195);
});

test.describe('P-83: the sheet replaces Map', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test.beforeEach(async ({ page }) => open(page));

  test('night palette; a visible Close; rows for Explore, Search, Settings and Export, each 44 pt', async ({ page }) => {
    await handle(page).click();
    await expectOpen(page, 'Wanders');
    // The night palette (theme N.bg), never cream.
    expect(await sheetEl(page).evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(14, 16, 32)');
    const close = dialog(page).getByRole('button', { name: 'Close', exact: true });
    await expect(close).toHaveText('Close');
    const rows = [
      dialog(page).getByRole('link', { name: 'Explore', exact: true }),
      dialog(page).getByRole('textbox', { name: 'Search', exact: true }),
      dialog(page).getByRole('link', { name: 'Settings', exact: true }),
      dialog(page).getByRole('button', { name: 'Export', exact: true }),
    ];
    for (const r of [close, ...rows]) {
      await expect(r).toBeVisible();
      expect((await r.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    // Export downloads a backup (as Settings' does), and says so in words.
    const download = page.waitForEvent('download');
    await dialog(page).getByRole('button', { name: 'Export', exact: true }).click();
    expect((await download).suggestedFilename()).toMatch(/^wanderment-\d{4}-\d{2}-\d{2}\.json$/);
    await expect(dialog(page).getByRole('button', { name: 'Exported', exact: true })).toBeVisible();
    // Settings opens; its Done comes back to the home.
    await dialog(page).getByRole('link', { name: 'Settings', exact: true }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(page).toHaveURL(/\/wanderment\/$/);
    await expectNoSeriousViolations(page);
  });

  test('/map lands on the home with the map lit (replacing it, so Back never loops through it); Back closes the sheet, then dims the map', async ({ page }) => {
    await page.goto('./map');
    await expect(page).toHaveURL(/\/wanderment\/sky$/);
    await expect(page.getByRole('button', { name: 'I’m not sure — light up the map', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await handle(page).click();
    await expectOpen(page, 'Wanders');
    await page.goBack();
    await expectClosed(page);
    await expect(page).toHaveURL(/\/wanderment\/sky$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/wanderment\/$/);
    await expect(page.getByRole('button', { name: 'I’m not sure — light up the map', exact: true })).toHaveAttribute('aria-pressed', 'false');
    // The graph Map, its What's next card and its focus/scope chains are gone.
    await expect(page.getByTestId('home-graph')).toHaveCount(0);
    await expect(page.getByRole('region', { name: /^What’s next/ })).toHaveCount(0);
  });
});

test.describe('P-84: the sheet’s search lights the stars above', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  const search = (page: Page) => dialog(page).getByRole('textbox', { name: 'Search', exact: true });
  const stars = (page: Page) => page.getByTestId('search-star');
  const where = (page: Page) =>
    stars(page).evaluateAll((els) => Object.fromEntries(els.map((e) => [e.getAttribute('data-id'), `${Math.round(e.getBoundingClientRect().x)},${Math.round(e.getBoundingClientRect().y)}`])));
  /** Where each star sits once laid out (a star just added reads 0,0 until its first layout on a slow CPU). */
  const placed = async (page: Page) => {
    await expect.poll(async () => Object.values(await where(page)).some((at) => at === '0,0')).toBe(false);
    return where(page);
  };

  /** Lines a search can find: three about sketching (one long ago), others not. */
  function searchWorld() {
    const json = JSON.parse(world());
    const at = (d: number) => new Date(Date.now() - d * DAY).toISOString();
    const add = (id: string, text: string, d: number, extra: Record<string, unknown> = {}) =>
      (json.state.data.activities[id] = { id, text, occurredAt: at(d), createdAt: at(d), toIds: [], ...extra });
    add('s1', 'sketched a café', 0.2, { doingId: 'draw' });
    add('s2', 'sketched on the bus', 3);
    add('s3', 'sketched the old bridge', 60);
    add('o1', 'called mum', 1);
    return JSON.stringify(json);
  }

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(seedScript, searchWorld());
    await page.goto('./');
    await expect(field(page)).toBeVisible();
    await handle(page).click();
    await expectOpen(page, 'Wanders');
  });

  test('searching lowers the sheet so the sky shows; every matching line is a star with its words and when; the rest dim; its wander lights; no counts', async ({ page }) => {
    const full = (await sheetEl(page).boundingBox())!;
    await search(page).fill('sketched');
    await expect(sheetEl(page)).toHaveAttribute('data-detent', 'low');
    const low = (await sheetEl(page).boundingBox())!;
    expect(low.y).toBeGreaterThan(full.y + 200);
    // Every match, in the sky above the sheet: its words and when, in words (not only the day's few).
    for (const text of ['sketched a café', 'sketched on the bus', 'sketched the old bridge', 'sketched']) {
      const star = stars(page).filter({ hasText: new RegExp(`^${text}`) }).or(page.getByTestId('rest-line').filter({ hasText: new RegExp(`^${text}`) })).first();
      await expect(star).toBeVisible();
      const b = (await star.boundingBox())!;
      expect(b.y + b.height).toBeLessThanOrEqual(low.y + 1);
    }
    await expect(stars(page).filter({ hasText: 'sketched the old bridge' })).toContainText(/ · in \w+/);
    // A line that doesn't match dims to its light (its words go).
    await expect(page.getByTestId('live-map').getByText('called mum', { exact: true })).toHaveCount(0);
    await expect(page.getByTestId('dim-line').first()).toBeAttached();
    // draw (a café's wander) lights as on the lit map.
    await expect(page.locator('[data-testid="lit-node"][data-id="draw"]')).toBeAttached();
    // The sheet holds the results (the accessible source), said in words, never a number.
    await expect(dialog(page).getByTestId('sheet-search-hit').filter({ hasText: 'sketched a café' })).toBeVisible();
    await expect(dialog(page).getByRole('status').filter({ hasText: 'Found in your lines.' })).toBeAttached();
    expect(await dialog(page).innerText()).not.toMatch(/\b\d+\s+(results?|lines?|matches)\b/i);
    // The sky is a decorative mirror: the home under the sheet is hidden from assistive tech.
    await expect(page.getByTestId('search-sky')).toHaveAttribute('aria-hidden', 'true');
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p84-search.png` });
  });

  test('as the query changes the stars that stay never move; clearing it (or closing the sheet) returns the sky to rest', async ({ page }) => {
    await search(page).fill('sketched');
    await expect(stars(page).first()).toBeVisible();
    const before = await placed(page);
    await search(page).fill('sketched o');
    await expect(stars(page).filter({ hasText: 'sketched a café' })).toHaveCount(0);
    const after = await placed(page);
    for (const [id, at] of Object.entries(after)) if (id in before) expect(at).toBe(before[id]);
    await dialog(page).getByRole('button', { name: 'Clear search', exact: true }).click();
    await expect(search(page)).toHaveValue('');
    await expect(sheetEl(page)).toHaveAttribute('data-detent', 'full');
    await expect(stars(page)).toHaveCount(0);
    await search(page).fill('sketched');
    await expect(stars(page).first()).toBeVisible();
    await dialog(page).getByRole('button', { name: 'Close', exact: true }).click();
    await expectClosed(page);
    await expect(page.getByTestId('search-sky')).toHaveCount(0);
    await expect(page.getByTestId('dim-line')).toHaveCount(0);
  });

  test('Back clears the search first, then puts the sheet away; Esc in the field clears it too', async ({ page }) => {
    await search(page).fill('sketched');
    await expect(stars(page).first()).toBeVisible();
    await page.goBack();
    await expect(search(page)).toHaveValue('');
    await expect(dialog(page)).toBeVisible();
    await page.goBack();
    await expectClosed(page);
    await handle(page).click();
    await search(page).fill('nothing like this');
    await expect(dialog(page).getByRole('status').filter({ hasText: 'Nothing found.' })).toBeAttached();
    await search(page).press('Escape');
    await expect(search(page)).toHaveValue('');
    await expect(dialog(page)).toBeVisible();
  });

  test('Reduce Motion: the stars just appear and the lines just dim (nothing animates)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await search(page).fill('sketched');
    await expect(stars(page).first()).toBeVisible();
    const first = await placed(page);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    await page.waitForTimeout(800);
    expect(await placed(page)).toEqual(first);
  });
});
