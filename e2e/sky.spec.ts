/**
 * P-66 (B-07 slice 2): under a star; on the trail. Nothing stored changes. P-81 (B-09): "I'm not sure"
 * lights the map in place instead of looking up — the look-up's own tests (its list of stars, motes,
 * "Back to typing", stray footprints) retired with it (see e2e/lit-map.spec.ts); a why's node on the lit
 * map opens its star as the look-up's star did, so these start from there.
 */
import { AxeBuilder } from '@axe-core/playwright';
import { Locator, Page } from '@playwright/test';

import { AT_OLD, expect, OLD, test } from './fixtures';
import { legacyBlob, seedScript } from './graphFixture';

const SHOTS = process.env.E2E_SHOTS; // set to a folder to save screenshots for a visual check
const DAY = 864e5;
const PROMPT = 'Where are we wandering today?';
const ILLUSTRATE = 'become an illustrator';
const STEP = 'Sketch hands from photo refs';
const NOTE = 'did ten from the ref sheet';

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
/** P-81: the lit map's why nodes (was the look-up's list of stars). */
const stars = (page: Page) => page.locator('[data-testid="lit-node"][data-kind="why"]');
const star = (page: Page, name: RegExp | string) => stars(page).filter({ hasText: name });
const cards = (page: Page) => page.getByRole('list', { name: 'Wanders', exact: true }).getByRole('button');
const card = (page: Page, wander: string) => cards(page).filter({ has: page.getByText(wander, { exact: true }) });
type Box = { x: number; y: number; width: number; height: number };
const overlaps = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = serious.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => `${n.target.join(' ')} ${n.html.slice(0, 200)}`).slice(0, 5).join('\n  ')}`);
  expect(report, report.join('\n')).toEqual([]);
}

/**
 * Three declared whys: "become an illustrator" (four wanders feed it, one walked today, with a step
 * and a note), "feel productive" (one wander, walked a few weeks ago) and "a calm space" (none, never
 * walked).
 */
function world({ shading = true } = {}) {
  const json = JSON.parse(
    legacyBlob(
      [ILLUSTRATE, 'draw better hands', 'color sense', 'a portfolio', 'gesture practice', 'feel productive', 'clean the flat', 'a calm space'],
      [
        { from: 'draw better hands', to: [ILLUSTRATE], text: 'sketched a hand', daysAgo: 0 },
        { from: 'draw better hands', to: [ILLUSTRATE], text: 'hands from a mirror', daysAgo: 8 },
        { from: 'color sense', to: [ILLUSTRATE], text: 'mixed greys', daysAgo: 3 },
        { from: 'a portfolio', to: [ILLUSTRATE], text: 'picked pieces', daysAgo: 12 },
        { from: 'gesture practice', to: [ILLUSTRATE], text: 'quick poses', daysAgo: 30 },
        { from: 'clean the flat', to: ['feel productive'], text: 'cleared the desk', daysAgo: 20 },
      ],
    ),
  );
  const t = json.state.data.threads;
  t[ILLUSTRATE].declaredAt = new Date(Date.now() - 30 * DAY).toISOString();
  t['feel productive'].declaredAt = new Date(Date.now() - 20 * DAY).toISOString();
  t['a calm space'].declaredAt = new Date(Date.now() - 10 * DAY).toISOString();
  t['draw better hands'].next = STEP;
  t['color sense'].next = 'Mix a value scale';
  json.state.data.activities.a0.note = NOTE;
  json.state.showShading = shading;
  return JSON.stringify(json);
}

/** Opens the trailhead and lights the map (P-81: was "looks up"). */
async function lookUp(page: Page, seed = world()) {
  await page.addInitScript(seedScript, seed);
  await page.goto(OLD);
  await page.getByRole('button', { name: 'I’m not sure — light up the map', exact: true }).click();
  await expect(page).toHaveURL(/\/wanderment\/sky$/);
  await expect(stars(page).first()).toBeVisible();
}

const box = async (l: Locator) => (await l.boundingBox())!;
/** Digits on screen: the sky never shows a count, a heat or a number. */
const digits = async (page: Page, testId: string) => (await page.getByTestId(testId).innerText()).match(/\d/g) ?? [];

test.describe('look up, and under a star', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('under a star: its wanders as landmarks and trails, each with its next step and note; labels clear of the trails; More wanders…', async ({ page }) => {
    await lookUp(page);
    await star(page, ILLUSTRATE).click();
    await expect(page).toHaveURL(/\/wanderment\/star\/become%20an%20illustrator$/);
    await expect(page.getByRole('heading', { name: ILLUSTRATE, exact: true })).toBeVisible();
    // P-66 fix 7: a fixed order (when each wander was made, then name; all four were made together
    // here), never by recency — was "the three walked most lately, latest first". The one walked most
    // lately (draw better hands) is still the warm one; the fourth is under More wanders….
    const labels = page.getByTestId('landmark-label').filter({ visible: true });
    await expect(labels).toHaveText(['a portfolio', 'color sense', 'draw better hands']);
    await expect(cards(page)).toHaveCount(3);
    await expect(cards(page).nth(2)).toHaveAccessibleName(`draw better hands: ${STEP}, “${NOTE}”, last walked today`);
    await expect(cards(page).nth(2)).toContainText(STEP);
    await expect(cards(page).nth(2)).toContainText(NOTE);
    await expect(cards(page).nth(1)).toHaveAccessibleName(/^color sense: Mix a value scale, last walked on \w+day$/);
    await expect(cards(page).nth(0)).toHaveAccessibleName('a portfolio: Add a next step, last walked last week');
    for (const c of await cards(page).all()) expect((await box(c)).height).toBeGreaterThanOrEqual(44);
    const trails = page.locator('[data-testid="star-scene"] path[stroke-dasharray]');
    await expect(trails).toHaveCount(3);
    expect(await trails.evaluateAll((ps) => ps.map((p) => p.getAttribute('stroke')))).toEqual(['#6E6890', '#6E6890', '#F2B48C']);
    // Every label sits above every trail.
    const trailTop = Math.min(...(await Promise.all((await trails.all()).map(box))).map((b) => b.y));
    for (const l of await labels.all()) {
      const b = await box(l);
      expect(b.y + b.height).toBeLessThanOrEqual(trailTop);
    }
    expect(await digits(page, 'under-star')).toEqual([]);
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p66-star.png` });

    await button(page, 'More wanders…').click();
    await expect(button(page, 'More wanders…')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('list', { name: 'More wanders', exact: true }).getByRole('button')).toHaveText(['gesture practice']);
    await expectNoSeriousViolations(page);

    // ‹ goes back to the sky.
    await button(page, 'Back to the sky').click();
    await expect(page).toHaveURL(/\/wanderment\/sky$/);
  });

  test('on the trail: the top step in large type, Did it logs it (Undo), footprints in dated words', async ({ page }) => {
    await lookUp(page);
    await star(page, ILLUSTRATE).click();
    await card(page, 'draw better hands').click(); // P-66 fix 7: the order is fixed now (was the first card, walked most lately)
    await expect(page).toHaveURL(/\/wanderment\/trail\/draw%20better%20hands\?star=become(%20|\+)an(%20|\+)illustrator$/);
    await expect(page.getByRole('heading', { name: 'draw better hands', exact: true })).toBeVisible();
    await expect(page.getByTestId('trail').getByText('Here’s where we left off', { exact: true })).toBeVisible();
    await expect(page.getByTestId('trail-step')).toHaveText(STEP);
    await expect(page.getByTestId('trail').getByText(NOTE, { exact: true })).toBeVisible();
    const prints = page.getByRole('list', { name: 'Footprints', exact: true }).getByRole('listitem');
    await expect(prints).toHaveText(['sketched a hand · today', 'hands from a mirror · last week']);
    // P-66 fix 14: the "·" is spoken as a comma.
    await expect(prints.nth(0)).toHaveAccessibleName('sketched a hand, today');
    await expect(prints.nth(1)).toHaveAccessibleName('hands from a mirror, last week');
    // P-66 fix 13: the step is a heading.
    await expect(page.getByRole('heading', { name: STEP, exact: true })).toBeVisible();
    expect(await digits(page, 'trail')).toEqual([]);
    expect((await box(button(page, 'Did it'))).height).toBeGreaterThanOrEqual(44);
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p66-trail.png` });

    // Did it: the step becomes today's footprint, the step is gone, focus moves on; Undo puts it back.
    await button(page, 'Did it').click();
    await expect(page.getByRole('button', { name: /^Logged → draw better hands/ })).toBeVisible();
    await expect(page.getByTestId('trail-step')).toHaveCount(0);
    await expect(prints.first()).toHaveText(`${STEP} · today`);
    await expect(button(page, 'Add a next step')).toBeFocused();
    await button(page, 'Undo').click();
    await expect(page.getByTestId('trail-step')).toHaveText(STEP);
    await expect(prints.first()).toHaveText('sketched a hand · today');

    // Back to the wanders under the star.
    await button(page, 'Back to the wanders').click();
    await expect(page).toHaveURL(/\/wanderment\/star\/become%20an%20illustrator$/);
  });

  test('a trail with no step offers “＋ Add a next step”', async ({ page }) => {
    await lookUp(page);
    await star(page, ILLUSTRATE).click();
    await card(page, 'a portfolio').click(); // P-66 fix 7: the order is fixed now (was the third card)
    await expect(page.getByTestId('trail-step')).toHaveCount(0);
    await button(page, 'Add a next step').click();
    const input = page.getByRole('textbox', { name: 'A next step', exact: true });
    await input.fill('Pick five pieces');
    await input.press('Enter');
    await expect(page.getByTestId('trail-step')).toHaveText('Pick five pieces');
    await expect(button(page, 'Did it')).toBeFocused();
  });

  test('a why with one wander opens its trail; with none, its own', async ({ page }) => {
    await lookUp(page);
    await star(page, 'feel productive').click();
    await expect(page).toHaveURL(/\/wanderment\/trail\/clean%20the%20flat\?star=feel(%20|\+)productive$/);
    await expect(page.getByRole('heading', { name: 'clean the flat', exact: true })).toBeVisible();
    await expect(page.getByTestId('trail').getByText('feel productive', { exact: true })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Footprints' }).getByRole('listitem')).toHaveText(['cleared the desk · a few weeks ago']);
    await button(page, 'Back to the sky').click();
    await expect(page).toHaveURL(/\/wanderment\/sky$/);

    await star(page, 'a calm space').click();
    await expect(page).toHaveURL(/\/wanderment\/trail\/a%20calm%20space$/);
    await expect(page.getByRole('heading', { name: 'a calm space', exact: true })).toBeVisible();
    await expect(button(page, 'Add a next step')).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test('fixes 8, 9: each card names its wander above its step; “＋ Add a next step” is a small line inside its card', async ({ page }) => {
    await lookUp(page);
    await star(page, ILLUSTRATE).click();
    for (const name of ['a portfolio', 'color sense', 'draw better hands']) {
      const c = card(page, name);
      await expect(c).toHaveCount(1);
      // The name comes first (a line above the step).
      const [n, rest] = [(await box(c.getByText(name, { exact: true }))).y, (await box(c.locator('div[dir="auto"]').nth(1))).y];
      expect(n).toBeLessThan(rest);
    }
    const add = card(page, 'a portfolio').getByText('Add a next step');
    const step = card(page, 'draw better hands').getByText(STEP, { exact: true });
    const size = (l: Locator) => l.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(await size(add)).toBeLessThan(await size(step));
    // No card is just an empty "＋" slot: every card is about as tall as its name and one line.
    expect((await box(card(page, 'a portfolio'))).height).toBeLessThanOrEqual((await box(card(page, 'draw better hands'))).height);
    await expectNoSeriousViolations(page);
  });

  test('fix 10: “More wanders…” appears only with more than three wanders', async ({ page }) => {
    const json = JSON.parse(world());
    json.state.data.threads['gesture practice'].hidden = true;
    await lookUp(page, JSON.stringify(json));
    await star(page, ILLUSTRATE).click();
    await expect(cards(page)).toHaveCount(3);
    await expect(button(page, 'More wanders…')).toHaveCount(0);
  });

  test('fix 11: landmark labels clear of flags and trails; background star dots are dimmer than text and haloed away from labels', async ({ page }) => {
    for (const [width, height] of [
      [390, 844],
      [195, 422],
    ]) {
      await page.setViewportSize({ width, height });
      if (width === 390) await lookUp(page);
      else await page.reload();
      if (width === 390) await star(page, ILLUSTRATE).click();
      // Wait for the screen (`all()` doesn't wait), and for its landmarks to finish rising (P-72): the
      // flags and trails move while they rise, so boxes measured mid-passage can overlap the labels.
      await expect(page.getByTestId('landmark-label').filter({ visible: true })).toHaveCount(3);
      await expect(page.locator('[data-moving="true"]')).toHaveCount(0);
      const labels = await Promise.all((await page.getByTestId('landmark-label').filter({ visible: true }).all()).map(box));
      const marks = await Promise.all((await page.locator('[data-testid="landmark-flag"], [data-testid="star-trail"]').all()).map(box));
      expect(labels.length).toBe(3);
      expect(marks.length).toBe(6);
      for (const l of labels) for (const m of marks) expect(overlaps(l, m), `${width}: a label on a flag or trail`).toBe(false);
      for (const l of await page.getByTestId('landmark-label').filter({ visible: true }).all())
        expect(await l.evaluate((el) => getComputedStyle(el).textShadow)).not.toBe('none');
    }
    const dots = await page.locator('[data-testid="sky-dot"], [data-testid="sky-twinkle"]').evaluateAll((els) => els.map((el) => parseFloat(getComputedStyle(el).opacity)));
    expect(dots.length).toBeGreaterThan(0);
    for (const o of dots) expect(o).toBeLessThanOrEqual(0.6);
  });

  test('fix 12: Esc goes back on the sky, under a star and on the trail, as on Map', async ({ page }) => {
    await lookUp(page);
    await star(page, ILLUSTRATE).click();
    await card(page, 'draw better hands').click();
    await expect(page).toHaveURL(/\/trail\//);
    await expect(page.getByRole('heading', { name: 'draw better hands', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/wanderment\/star\/become%20an%20illustrator$/);
    await expect(cards(page)).toHaveCount(3);
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/wanderment\/sky$/);
    await expect(stars(page).first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(AT_OLD);
    await expect(page.getByRole('textbox', { name: PROMPT, exact: true })).toBeVisible();
    // Opened on its own, Esc still finds a way: P-74, down to the home at rest (was: the trail to the sky).
    await page.goto('./trail/a%20calm%20space');
    await expect(page.getByRole('heading', { name: 'a calm space', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(AT_OLD);
    await expect(page.getByRole('textbox', { name: PROMPT, exact: true })).toBeVisible();
    // Esc in a field is the field's (it doesn't leave the trail).
    await page.getByRole('button', { name: 'I’m not sure — light up the map', exact: true }).click();
    await star(page, 'a calm space').click();
    await button(page, 'Add a next step').click();
    await page.getByRole('textbox', { name: 'A next step', exact: true }).press('Escape');
    await expect(page).toHaveURL(/\/trail\/a%20calm%20space$/);
  });

});
