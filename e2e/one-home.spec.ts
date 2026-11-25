/**
 * P-74 (B-08 "One home", D-15): the trailhead and the sky are one home. At rest: the question, the
 * field, Map as a signpost by the lantern, your recent lines as faint unlabelled stars and your whys as
 * guiding stars. (P-79/P-80: the composer is at the bottom and the faint stars gave way to the live
 * map's labelled lines — see e2e/live-map.spec.ts; the assertions changed here say so.) "I'm not sure", a why and a wander tilt the camera up into one session layer over the
 * same sky (never another picture); Esc, Back or tapping the ground bring it down to the lantern, focus
 * in the field. `/sky`, `/star/…`, `/trail/…` open the home already tilted. After Did it, Undo shows,
 * then the session ends by itself.
 * P-81/P-83 (B-09): "I'm not sure" no longer tilts up — it lights the map in place (`/sky` is the lit
 * state, the camera stays at rest; a why's node opens its star as the sky's star did); Map is retired
 * and the grabber takes its place in the composer. The assertions changed here say so.
 */
import { AxeBuilder } from '@axe-core/playwright';
import { Page } from '@playwright/test';

import { AT_OLD, expect, OLD, test } from './fixtures';
import { bigBlob, legacyBlob, seedScript } from './graphFixture';

const SHOTS = process.env.E2E_SHOTS; // set to a folder to save screenshots for a visual check
const DAY = 864e5;
const PROMPT = 'Where are we wandering today?';
const ILLUSTRATE = 'become an illustrator';
const STEP = 'Sketch hands from photo refs';

const field = (page: Page) => page.getByRole('textbox', { name: PROMPT, exact: true });
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
/** P-83: the grabber (the sheet) takes Map's place in the composer. */
const grabber = (page: Page) => button(page, 'Wanders and activities');
/** P-79: “I’m not sure” is a toggle button now (was a link), named for what it does. */
const unsure = (page: Page) => button(page, 'I’m not sure — light up the map');
/** P-81: the whys are the lit map's star nodes (was the look-up's list of stars). */
const whys = (page: Page) => page.locator('[data-testid="lit-node"][data-kind="why"]');
const cards = (page: Page) => page.getByRole('list', { name: 'Wanders', exact: true }).getByRole('button');
const home = (page: Page) => page.getByTestId('home');
const sessions = (page: Page) => page.locator('[data-testid="under-star"], [data-testid="trail"]').filter({ visible: true });
const SETTLED = { timeout: 1500 };

async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = serious.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => `${n.target.join(' ')} ${n.html.slice(0, 200)}`).slice(0, 5).join('\n  ')}`);
  expect(report, report.join('\n')).toEqual([]);
}

/**
 * Two declared whys: "become an illustrator" (two wanders feed it, one with a step) and "feel
 * productive" (none). Six lines, two of them sharing a word ("sketch…").
 */
function world({ shading = true } = {}) {
  const json = JSON.parse(
    legacyBlob(
      [ILLUSTRATE, 'draw better hands', 'color sense', 'feel productive'],
      [
        { from: 'draw better hands', to: [ILLUSTRATE], text: 'sketched a hand', daysAgo: 0 },
        { from: 'color sense', to: [ILLUSTRATE], text: 'mixed greys', daysAgo: 3 },
        { text: 'sketching hands at the cafe', daysAgo: 5 },
        { text: 'went for a swim', daysAgo: 8 },
        { text: 'read about colour', daysAgo: 12 },
        { text: 'swam again', daysAgo: 20 },
      ],
    ),
  );
  const t = json.state.data.threads;
  t[ILLUSTRATE].declaredAt = new Date(Date.now() - 30 * DAY).toISOString();
  t['feel productive'].declaredAt = new Date(Date.now() - 20 * DAY).toISOString();
  t['draw better hands'].next = STEP;
  json.state.showShading = shading;
  return JSON.stringify(json);
}
const LINES = 6;
/** P-80: the live map shows at most this many lines (FEED_MAX in src/domain/feed.ts). */
const FEED_MAX = 5;
const WHYS = 2;

async function open(page: Page, seed: string | null = world(), path = OLD) {
  if (seed) await page.addInitScript(seedScript, seed);
  await page.goto(path);
}
async function openHome(page: Page, seed: string | null = world()) {
  await open(page, seed);
  await expect(field(page)).toBeVisible();
  await expect(home(page)).toHaveAttribute('data-camera', 'rest');
}
/** Marks the night drawn now, so a later check can tell it's the same one (never a new picture). */
const markSky = (page: Page) => page.getByTestId('night-sky').evaluate((el) => ((el as unknown as { p74: number }).p74 = 74));
const sameSky = (page: Page) => page.getByTestId('night-sky').evaluate((el) => (el as unknown as { p74?: number }).p74 === 74);

/** At rest: the home, its camera down, the field focused (web). P-81: lit or not (it stays lit until toggled). */
async function expectAtRest(page: Page) {
  await expect(page).toHaveURL(/\/wanderment\/(old|sky)$/);
  await expect(home(page)).toHaveAttribute('data-camera', 'rest');
  await expect(field(page)).toBeFocused();
  await expect(sessions(page)).toHaveCount(0);
}

test.describe('one home', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('at rest: the question, the field, I’m not sure, the grabber; the live map’s lines and your whys as guiding stars', async ({ page }) => {
    // P-79/P-80: was “your lines as faint unlabelled stars (LINES of them, no buttons), Map below I’m not sure
    // and above the lantern”: the lines are the live map's few (at most FEED_MAX, labelled buttons in
    // “Recent”); Map sits in the composer's row beside I’m not sure, and the ground stands above the composer.
    await openHome(page);
    await expect(page.getByRole('heading', { name: PROMPT, exact: true })).toBeVisible();
    await expect(field(page)).toBeFocused();
    await expect(page.getByTestId('rest-line')).toHaveCount(Math.min(LINES, FEED_MAX));
    await expect(page.getByTestId('rest-guide')).toHaveCount(WHYS);
    // The guiding stars are decorative: nothing to read or follow, hidden from screen readers.
    await expect(page.getByTestId('rest-sky')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.getByRole('group', { name: 'Recent', exact: true }).getByRole('button')).toHaveCount(Math.min(LINES, FEED_MAX));
    await expect(page.getByRole('link').filter({ visible: true })).toHaveCount(0); // P-83: was Map's link
    await expect(page.getByTestId('rest-sky')).toHaveText('');
    // Guiding stars in the accent colour.
    for (const fill of await page.getByTestId('rest-guide').locator('path').evaluateAll((els) => els.map((el) => el.getAttribute('fill')))) expect(fill?.toUpperCase()).toBe('#F2B48C');
    // P-83: the grabber (was Map, in the composer's row): at the composer's top edge, above I’m not sure, below the ground; 44 pt.
    const grab = (await grabber(page).boundingBox())!;
    const lantern = (await page.getByTestId('sky-lantern').boundingBox())!;
    const chip = (await unsure(page).boundingBox())!;
    expect(grab.y + grab.height).toBeLessThanOrEqual(chip.y + 1);
    expect(grab.y).toBeGreaterThanOrEqual(lantern.y + lantern.height / 2);
    for (const b of [grab, chip]) expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(44);
    // Coming back never shows absence.
    await expect(page.getByText(/away|days? ago|missed/i)).toHaveCount(0);
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p74-home-at-rest.png` });
  });

  test('with no lines and no whys, an empty sky', async ({ page }) => {
    await openHome(page, legacyBlob([], []));
    await expect(page.getByTestId('rest-line')).toHaveCount(0);
    await expect(page.getByTestId('rest-guide')).toHaveCount(0);
    await expectNoSeriousViolations(page);
  });

  test('many lines: at most ~80 faint stars', async ({ page }) => {
    // P-80: was “more than 12, at most 80 faint stars”: the live map shows a few (FEED_MAX) of the last three weeks'.
    // A 4,000-line history takes ~4 s to open here and ~14 s on a CI-speed CPU (E2E_SLOW=4); that load
    // time is P-46's to bring down — this test is about the cap, so it waits for the load.
    test.setTimeout(60_000);
    await open(page, bigBlob(220, 4000));
    await expect(field(page)).toBeVisible({ timeout: 40_000 });
    await expect(home(page)).toHaveAttribute('data-camera', 'rest');
    await expect(page.getByTestId('rest-line')).toHaveCount(FEED_MAX);
  });

  test('with the shading off the faint stars are still drawn (no warmth, no motes)', async ({ page }) => {
    await openHome(page, world({ shading: false }));
    // P-80: the live map's few (was LINES faint stars), with no glow.
    await expect(page.getByTestId('rest-line')).toHaveCount(Math.min(LINES, FEED_MAX));
    await expect(page.getByTestId('rest-glow')).toHaveCount(0);
    await expect(page.getByTestId('sky-mote')).toHaveCount(0);
  });

  test('Tab order at rest: the field, I’m not sure, the grabber (P-83: was Map)', async ({ page }) => {
    await openHome(page);
    await expect(field(page)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(unsure(page)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(grabber(page)).toBeFocused();
  });

  // P-81: was "I'm not sure tilts up into the session over the same sky; Esc, Back and tapping the ground bring it down, focus in the field".
  test('I’m not sure lights the map in place over the same sky (the camera stays at rest); Esc and Back dim it', async ({ page }) => {
    await openHome(page);
    await markSky(page);
    for (const leave of ['Esc', 'Back'] as const) {
      await unsure(page).click();
      await expect(page).toHaveURL(/\/wanderment\/sky$/);
      await expect(home(page)).toHaveAttribute('data-camera', 'rest');
      await expect(whys(page)).toHaveCount(WHYS);
      await expect(field(page)).toBeVisible();
      expect(await sameSky(page), leave).toBe(true);
      await expect(page.getByTestId('night-sky')).toHaveCount(1);
      if (leave === 'Esc') await page.keyboard.press('Escape');
      if (leave === 'Back') await page.goBack();
      await expect(page).toHaveURL(AT_OLD);
      await expect(whys(page)).toHaveCount(0);
      expect(await sameSky(page), leave).toBe(true);
    }
  });

  // P-81: lighting is in place now (was: coming down from the look-up session).
  test('no layout jump coming down: the question and the field are where they stay from the first frame', async ({ page }) => {
    await openHome(page);
    const heading = page.getByRole('heading', { name: PROMPT, exact: true });
    const at = async () => ({ heading: await heading.boundingBox(), field: await field(page).boundingBox(), grab: await grabber(page).boundingBox() });
    const rest = await at();
    await unsure(page).click();
    await expect(whys(page).first()).toBeVisible();
    expect(await at()).toEqual(rest);
    await whys(page).first().click();
    await expect(sessions(page)).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(field(page)).toBeVisible();
    const first = await at();
    await expect(page.getByTestId('trailhead')).toHaveAttribute('data-moving', 'false', SETTLED);
    expect(await at()).toEqual(first);
  });

  // Fix d (after P-80): the ground glides down with the camera when a session starts (it never jumps).
  test('the ground never jumps when a session starts: it glides down within ~600 ms (a cut under Reduce Motion)', async ({ page }) => {
    // No wanders: nothing to keep a band for, so the ground stands on the composer at rest.
    await openHome(page, legacyBlob([], [{ text: 'walked to the hill', daysAgo: 1 }]));
    const hills = page.getByTestId('sky-ground');
    await expect(hills).toBeVisible();
    const restY = (await hills.boundingBox())!.y;
    await field(page).fill('looked at the hills');
    await field(page).press('Enter');
    await expect(page.getByTestId('trail-words')).toBeVisible();
    // Sampled over the passage: no single frame-to-frame step takes the whole way.
    const ys: number[] = await page.evaluate(
      () =>
        new Promise((done) => {
          const el = document.querySelector('[data-testid="sky-ground"]') as HTMLElement;
          const out: number[] = [];
          const t0 = performance.now();
          const tick = () => {
            out.push(el.getBoundingClientRect().y);
            if (performance.now() - t0 < 700) requestAnimationFrame(tick);
            else done(out);
          };
          tick();
        }),
    );
    const end = ys[ys.length - 1];
    const whole = Math.abs(end - restY);
    if (whole > 20) for (let i = 1; i < ys.length; i++) expect(Math.abs(ys[i] - ys[i - 1])).toBeLessThan(whole * 0.8);
  });

  test('a why shows its wanders, a wander its trail: one layer at a time, one sky; the ground brings it down', async ({ page }) => {
    await openHome(page);
    await markSky(page);
    await unsure(page).click();
    await whys(page).filter({ hasText: ILLUSTRATE }).click();
    await expect(page).toHaveURL(/\/star\/become%20an%20illustrator$/);
    await expect(page.getByRole('heading', { name: ILLUSTRATE, exact: true })).toBeFocused();
    await expect(cards(page)).toHaveCount(2);
    await expect(sessions(page)).toHaveCount(1);
    await expect(home(page)).toHaveAttribute('data-camera', 'up');
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p74-session-under-star.png` });
    // In the session: the heading, its content, then the way out.
    await page.keyboard.press('Tab');
    await expect(cards(page).first()).toBeFocused();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(button(page, 'Back to the sky')).toBeFocused();

    await cards(page).filter({ hasText: 'draw better hands' }).click();
    await expect(page).toHaveURL(/\/trail\/draw%20better%20hands/);
    await expect(page.getByTestId('trail-step')).toHaveText(STEP);
    await expect(sessions(page)).toHaveCount(1);
    expect(await sameSky(page)).toBe(true);
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p74-session-trail.png` });
    await page.getByTestId('home-ground').click();
    await expectAtRest(page);
    expect(await sameSky(page)).toBe(true);
  });

  test('a long why and wander name keep the session in the screen', async ({ page }) => {
    const long = 'become someone who draws every single day without worrying about it at all';
    const json = JSON.parse(world());
    json.state.data.threads[ILLUSTRATE].name = long;
    json.state.data.threads['draw better hands'].name = 'draw better hands and feet and faces from life and from photographs';
    await openHome(page, JSON.stringify(json));
    await unsure(page).click();
    await whys(page).filter({ hasText: long }).click();
    await expect(page.getByRole('heading', { name: long, exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await expectNoSeriousViolations(page);
  });

  // P-81: `/sky` is the lit state at rest (was: the look-up session, tilted, with "Back to typing").
  test('`/sky` opens the home lit, `/star/…` and `/trail/…` already tilted; Back from there lands at rest', async ({ page }) => {
    await open(page, world(), './sky');
    await expect(whys(page)).toHaveCount(WHYS);
    await expect(home(page)).toHaveAttribute('data-camera', 'rest');
    await expectNoSeriousViolations(page);
    await unsure(page).click();
    await expect(page).toHaveURL(AT_OLD);

    await page.goto('./star/become%20an%20illustrator');
    await expect(cards(page)).toHaveCount(2);
    await expect(home(page)).toHaveAttribute('data-camera', 'up');
    await button(page, 'Back to the sky').click();
    await expectAtRest(page);

    await page.goto('./trail/draw%20better%20hands?star=become%20an%20illustrator');
    await expect(page.getByTestId('trail-step')).toHaveText(STEP);
    await expect(home(page)).toHaveAttribute('data-camera', 'up');
    const back = button(page, 'Back to the sky');
    expect(Math.min((await back.boundingBox())!.width, (await back.boundingBox())!.height)).toBeGreaterThanOrEqual(44);
    await back.click();
    await expectAtRest(page);
  });

  test('browser Back and forward walk / ↔ /sky ↔ /star ↔ /trail', async ({ page }) => {
    await openHome(page);
    await unsure(page).click();
    await whys(page).filter({ hasText: ILLUSTRATE }).click();
    await cards(page).filter({ hasText: 'draw better hands' }).click();
    await expect(page).toHaveURL(/\/trail\//);
    await page.goBack();
    await expect(page).toHaveURL(/\/star\//);
    await expect(cards(page)).toHaveCount(2);
    await page.goBack();
    await expect(page).toHaveURL(/\/sky$/);
    await page.goBack();
    await expectAtRest(page);
    await page.goForward();
    await expect(page).toHaveURL(/\/sky$/);
    await expect(whys(page)).toHaveCount(WHYS); // P-81: lit, at rest (was: tilted up)
    await page.goForward();
    await expect(page).toHaveURL(/\/star\//);
    await page.goForward();
    await expect(page.getByTestId('trail-step')).toHaveText(STEP);
  });

  for (const reduce of [false, true])
    test(`after Did it, Undo shows, then the session ends by itself and the camera comes down${reduce ? ' (Reduce Motion: a cut)' : ''}`, async ({ page }) => {
      if (reduce) await page.emulateMedia({ reducedMotion: 'reduce' });
      await openHome(page);
      await unsure(page).click();
      await whys(page).filter({ hasText: ILLUSTRATE }).click();
      await cards(page).filter({ hasText: 'draw better hands' }).click();
      await button(page, 'Did it').click();
      await expect(button(page, 'Undo')).toBeVisible();
      await expect(page).toHaveURL(/\/trail\//);
      // A short beat, then down to the lantern with focus in the field; Undo is still there.
      await expectAtRest(page);
      // P-72's passage, reversed from the trail (the wanderer walks back down); a cut under Reduce Motion.
      await expect(page.getByTestId('trailhead')).toHaveAttribute('data-passage', reduce ? 'none' : 'walk-up');
      await expect(page.getByTestId('trailhead')).toHaveAttribute('data-reverse', String(!reduce));
      await expect(page.getByTestId('trailhead')).toHaveAttribute('data-moving', 'false', SETTLED);
      await expect(button(page, 'Undo')).toBeVisible();
      if (!reduce && SHOTS) await page.screenshot({ path: `${SHOTS}/p74-back-home.png` });
    });

  test('a choice made from the keyboard (as with a screen reader) waits: the session stays until you leave', async ({ page }) => {
    await openHome(page);
    await unsure(page).click();
    await whys(page).filter({ hasText: ILLUSTRATE }).click();
    await cards(page).filter({ hasText: 'draw better hands' }).click();
    await button(page, 'Did it').focus();
    await page.keyboard.press('Enter');
    await expect(button(page, 'Undo')).toBeVisible();
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/trail\//);
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/star\//);
  });

  test('typing at rest works as before: Return logs as typed and the line rises (P-73); a new star, lit', async ({ page }) => {
    await openHome(page);
    await field(page).fill('watched the sunset');
    await field(page).press('Enter');
    await expect(page.getByTestId('trail-words')).toHaveText('watched the sunset');
    // P-73: the rise (was "Kept, loose" and "Move it?" with the camera at rest).
    await expect(page.getByRole('button', { name: 'Done it', exact: true })).toBeVisible();
    await expect(home(page)).toHaveAttribute('data-camera', 'up');
    // P-80: was “LINES + 1 faint stars behind the session, one lit”: the live map is the rest's (not drawn
    // under a session); back at rest it shows the day's few again (whether the new line is among them is
    // the day's draw — e2e/live-map.spec.ts covers a lit line on it).
    await expect(page.getByTestId('rest-line')).toHaveCount(0);
    await page.getByRole('button', { name: 'New line', exact: true }).click();
    await expect(page.getByTestId('rest-line')).toHaveCount(FEED_MAX);
  });

  test('at 200 % zoom the field stays in view, nothing is wider than the screen, and axe is clean at rest and in a session', async ({ page }) => {
    await page.setViewportSize({ width: 195, height: 422 });
    await openHome(page);
    await expect(field(page)).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(195);
    await expectNoSeriousViolations(page);
    await unsure(page).click();
    await expect(whys(page).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(195);
    await expectNoSeriousViolations(page);
  });
});
