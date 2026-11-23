/** P-66 (B-07 slice 2): "I’m not sure" looks up at the sky; under a star; on the trail. Nothing stored changes. */
import { AxeBuilder } from '@axe-core/playwright';
import { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { legacyBlob, seedScript } from './graphFixture';

const SHOTS = process.env.E2E_SHOTS; // set to a folder to save screenshots for a visual check
const DAY = 864e5;
const PROMPT = 'Where are we wandering today?';
const ILLUSTRATE = 'become an illustrator';
const STEP = 'Sketch hands from photo refs';
const NOTE = 'did ten from the ref sheet';

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const stars = (page: Page) => page.getByRole('list', { name: 'What it’s for', exact: true }).getByRole('button');
const star = (page: Page, name: RegExp | string) => stars(page).filter({ hasText: name });
const cards = (page: Page) => page.getByRole('list', { name: 'Wanders', exact: true }).getByRole('button');

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

/** Opens the trailhead and looks up. */
async function lookUp(page: Page, seed = world()) {
  await page.addInitScript(seedScript, seed);
  await page.goto('./');
  await page.getByRole('link', { name: 'I’m not sure', exact: true }).click();
  await expect(page).toHaveURL(/\/wanderment\/sky$/);
  await expect(stars(page).first()).toBeVisible();
}

const box = async (l: Locator) => (await l.boundingBox())!;
const motesIn = (l: Locator) => l.getByTestId('sky-mote').count();
/** Digits on screen: the sky never shows a count, a heat or a number. */
const digits = async (page: Page, testId: string) => (await page.getByTestId(testId).innerText()).match(/\d/g) ?? [];

test.describe('look up, and under a star', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('I’m not sure shows the whys as stars, one size; a screen reader hears a fixed-order list of buttons with “last walked …”; no counts', async ({ page }) => {
    await lookUp(page);
    await expect(page.getByRole('heading', { name: 'Not sure.', exact: true })).toBeVisible();
    // Fixed order: declared, oldest mark first; each named with its words and when it was last walked.
    await expect(stars(page)).toHaveCount(3);
    const names = ['become an illustrator, last walked today', 'feel productive, last walked a few weeks ago', 'a calm space, not walked yet'];
    for (const [i, name] of names.entries()) await expect(stars(page).nth(i)).toHaveAccessibleName(name);
    await expect(stars(page)).toHaveText([ILLUSTRATE, 'feel productive', 'a calm space']);
    // One size; every star a 44 pt target or more.
    const glyphs = await page.getByTestId('star-glyph').filter({ visible: true }).all();
    expect(glyphs.length).toBe(3);
    for (const g of glyphs) expect(await box(g)).toMatchObject({ width: 40, height: 40 });
    for (const s of await stars(page).all()) {
      const b = await box(s);
      expect(b.height).toBeGreaterThanOrEqual(44);
      expect(b.width).toBeGreaterThanOrEqual(44);
    }
    // No two stars overlap.
    const boxes = await Promise.all((await stars(page).all()).map(box));
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const [a, b] = [boxes[i], boxes[j]];
        expect(a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height, `${i} and ${j}`).toBe(false);
      }
    // The picture is hidden from screen readers; nothing on screen is a number.
    for (const g of glyphs) await expect(g).toHaveAttribute('aria-hidden', 'true');
    await expect(page.getByTestId('night-sky').filter({ visible: true })).toHaveAttribute('aria-hidden', 'true');
    expect(await digits(page, 'look-up')).toEqual([]);
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p66-sky.png` });
  });

  test('warmth and motes follow heat (relative): today’s star has the most, a never-walked one none', async ({ page }) => {
    await lookUp(page);
    const [warm, mid, cold] = await Promise.all([motesIn(star(page, ILLUSTRATE)), motesIn(star(page, 'feel productive')), motesIn(star(page, 'a calm space'))]);
    expect(warm).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(cold);
    expect(cold).toBe(0);
    const fill = (name: string) => star(page, name).locator('path').last().getAttribute('fill');
    expect(await fill(ILLUSTRATE)).not.toBe(await fill('a calm space'));
  });

  test('stars keep their places: walking one warms it and moves nothing', async ({ page }) => {
    await lookUp(page);
    const before = await Promise.all((await stars(page).all()).map(box));
    expect(await motesIn(star(page, 'a calm space'))).toBe(0);
    // Back to typing, log a line toward the cold star, look up again.
    await button(page, 'Back to typing').click();
    const field = page.getByRole('textbox', { name: PROMPT, exact: true });
    await field.fill('sat by the window');
    await field.press('Enter');
    await button(page, 'Somewhere else…').click();
    await page.getByRole('group', { name: 'Somewhere else' }).getByRole('button', { name: 'a calm space', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Logged toward a calm space' })).toBeVisible();
    // The billboard gives way to the question, and "I’m not sure" is there again.
    await button(page, PROMPT).click();
    await page.getByRole('link', { name: 'I’m not sure', exact: true }).click();
    await expect(stars(page).nth(2)).toHaveAccessibleName('a calm space, last walked today');
    expect(await Promise.all((await stars(page).all()).map(box))).toEqual(before);
    expect(await motesIn(star(page, 'a calm space'))).toBeGreaterThan(0);
    await expect(stars(page)).toHaveText([ILLUSTRATE, 'feel productive', 'a calm space']);
  });

  test('with the shading off there is no warmth and no motes; the names still say when', async ({ page }) => {
    await lookUp(page, world({ shading: false }));
    await expect(page.getByTestId('sky-mote')).toHaveCount(0);
    const fills = await Promise.all((await stars(page).all()).map((s) => s.locator('path').last().getAttribute('fill')));
    expect(new Set(fills).size).toBe(1);
    await expect(stars(page).first()).toHaveAccessibleName('become an illustrator, last walked today');
    await star(page, ILLUSTRATE).click();
    await expect(page.getByTestId('sky-mote')).toHaveCount(0);
    // No trail is warm.
    expect(await page.locator('[data-testid="star-scene"] path[stroke-dasharray]').evaluateAll((ps) => ps.map((p) => p.getAttribute('stroke')))).not.toContain('#F2B48C');
  });

  test('motes twinkle without Reduce Motion', async ({ page }) => {
    await lookUp(page);
    const mote = star(page, ILLUSTRATE).getByTestId('sky-mote').first();
    const opacity = () => mote.evaluate((el) => getComputedStyle(el).opacity);
    const first = await opacity();
    await expect.poll(opacity, { timeout: 6000 }).not.toBe(first);
  });

  test('under Reduce Motion nothing moves: motes hold a soft glow', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await lookUp(page);
    const look = () =>
      page.evaluate(() => [
        ...[...document.querySelectorAll('[data-testid="sky-mote"], [data-testid="sky-twinkle"]')].map((el) => getComputedStyle(el).opacity),
        String(document.getAnimations().length),
      ]);
    const before = await look();
    expect(before.length).toBeGreaterThan(3);
    await page.waitForTimeout(3000);
    expect(await look()).toEqual(before);
    expect(before.at(-1)).toBe('0');
    await expect(star(page, ILLUSTRATE).getByTestId('sky-mote').first()).toHaveCSS('opacity', '0.6');
  });

  test('under a star: its wanders as landmarks and trails, each with its next step and note; labels clear of the trails; More wanders…', async ({ page }) => {
    await lookUp(page);
    await star(page, ILLUSTRATE).click();
    await expect(page).toHaveURL(/\/wanderment\/star\/become%20an%20illustrator$/);
    await expect(page.getByRole('heading', { name: ILLUSTRATE, exact: true })).toBeVisible();
    // The three walked most lately, the latest first (and warm); the fourth under More wanders….
    const labels = page.getByTestId('landmark-label').filter({ visible: true });
    await expect(labels).toHaveText(['draw better hands', 'color sense', 'a portfolio']);
    await expect(cards(page)).toHaveCount(3);
    await expect(cards(page).nth(0)).toHaveAccessibleName(`draw better hands: ${STEP}, “${NOTE}”`);
    await expect(cards(page).nth(0)).toContainText(STEP);
    await expect(cards(page).nth(0)).toContainText(NOTE);
    await expect(cards(page).nth(1)).toHaveAccessibleName('color sense: Mix a value scale');
    await expect(cards(page).nth(2)).toHaveAccessibleName('a portfolio: Add a next step');
    for (const c of await cards(page).all()) expect((await box(c)).height).toBeGreaterThanOrEqual(44);
    const trails = page.locator('[data-testid="star-scene"] path[stroke-dasharray]');
    await expect(trails).toHaveCount(3);
    expect(await trails.evaluateAll((ps) => ps.map((p) => p.getAttribute('stroke')))).toEqual(['#F2B48C', '#6E6890', '#6E6890']);
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
    await cards(page).first().click();
    await expect(page).toHaveURL(/\/wanderment\/trail\/draw%20better%20hands\?star=become(%20|\+)an(%20|\+)illustrator$/);
    await expect(page.getByRole('heading', { name: 'draw better hands', exact: true })).toBeVisible();
    await expect(page.getByTestId('trail').getByText('Here’s where we left off', { exact: true })).toBeVisible();
    await expect(page.getByTestId('trail-step')).toHaveText(STEP);
    await expect(page.getByTestId('trail').getByText(NOTE, { exact: true })).toBeVisible();
    const prints = page.getByRole('list', { name: 'Footprints', exact: true }).getByRole('listitem');
    await expect(prints).toHaveText(['sketched a hand · today', 'hands from a mirror · last week']);
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
    await cards(page).nth(2).click();
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

  test('Back to typing returns to the prompt', async ({ page }) => {
    await lookUp(page);
    await button(page, 'Back to typing').click();
    await expect(page).toHaveURL(/\/wanderment\/$/);
    await expect(page.getByRole('textbox', { name: PROMPT, exact: true })).toBeVisible();
  });

  test('at 200 % zoom (195 wide) nothing is wider than the screen and no stars overlap', async ({ page }) => {
    await page.setViewportSize({ width: 195, height: 422 });
    await lookUp(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(195);
    const boxes = await Promise.all((await stars(page).all()).map(box));
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const [a, b] = [boxes[i], boxes[j]];
        expect(a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height, `${i} and ${j}`).toBe(false);
      }
    await expectNoSeriousViolations(page);
    await star(page, ILLUSTRATE).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(195);
    await expectNoSeriousViolations(page);
  });
});
