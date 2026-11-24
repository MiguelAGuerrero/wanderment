/** P-65 (B-07 slice 1, D-13): the trailhead — a night-sky prompt is Home; today's graph is Map. */
import { AxeBuilder } from '@axe-core/playwright';
import { Locator, Page } from '@playwright/test';

import { expect, openSheet, test } from './fixtures';
import { legacyBlob, seedScript } from './graphFixture';

const SHOTS = process.env.E2E_SHOTS; // set to a folder to save screenshots for a visual check
const DAY = 864e5;
const PROMPT = 'Where are we wandering today?';
const LINE = 'want to sketch hands tonight';

const field = (page: Page) => page.getByRole('textbox', { name: PROMPT, exact: true });
const words = (page: Page) => page.getByTestId('trail-words');
const moves = (page: Page) => page.getByRole('group', { name: 'Move it?', exact: true });
const elsewhere = (page: Page) => page.getByRole('group', { name: 'Somewhere else', exact: true });
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const said = (page: Page, text: string) => page.getByRole('status').filter({ hasText: text });
const suggestions = (page: Page) => page.getByRole('listbox', { name: 'Suggestions' });
const NEW_LINE = 'New line';

type Box = { x: number; y: number; width: number; height: number };
const overlaps = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
/** WCAG contrast of two `rgb(…)` colours. */
function contrast(a: string, b: string) {
  const lum = (c: string) => {
    const [r, g, bl] = c.match(/\d+(\.\d+)?/g)!.slice(0, 3).map((v) => Number(v) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
const NIGHT_BG = 'rgb(14, 16, 32)'; // N.bg

/**
 * P-65 fix 1: no part of the ground (hills, dashed path, lantern) lies under a control that's in view
 * (its box, clipped to the scroller it sits in).
 */
async function expectGroundClear(page: Page, what: string) {
  const ground = await Promise.all((await page.locator('[data-testid="sky-ground"], [data-testid="sky-lantern"], [data-testid="sky-core"]').filter({ visible: true }).all()).map((l) => l.boundingBox()));
  const scroller = (await page.getByTestId('trailhead-scroll').boundingBox())!;
  const controls = page.getByTestId('trailhead').locator('a, button, input, [role="button"], [role="option"], [role="link"]').filter({ visible: true });
  for (const c of await controls.all()) {
    const b = await c.boundingBox();
    if (!b) continue;
    const top = Math.max(b.y, scroller.y);
    const bottom = Math.min(b.y + b.height, scroller.y + scroller.height);
    if (bottom <= top) continue; // scrolled out of view
    const seen = { x: b.x, y: top, width: b.width, height: bottom - top };
    const name = (await c.getAttribute('aria-label')) ?? (await c.innerText());
    for (const g of ground) expect(overlaps(seen, g!), `${what}: “${name}” under the ground`).toBe(false);
  }
}

async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = serious.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => `${n.target.join(' ')} ${n.html.slice(0, 200)}`).slice(0, 5).join('\n  ')}`);
  expect(report, report.join('\n')).toEqual([]);
}

/**
 * draw better hands (no step; "sketched a hand" went to it) and feel productive (declared, the step
 * "Clean my car"; "cooked dinner" went to it).
 */
function world() {
  const json = JSON.parse(
    legacyBlob(['draw better hands', 'feel productive'], [
      { from: 'draw better hands', to: ['feel productive'], text: 'sketched a hand', daysAgo: 3 },
      { to: ['feel productive'], text: 'cooked dinner', daysAgo: 2 },
    ]),
  );
  json.state.data.threads['feel productive'].declaredAt = new Date(Date.now() - 30 * DAY).toISOString();
  json.state.data.threads['feel productive'].next = 'Clean my car';
  return JSON.stringify(json);
}

async function open(page: Page, seed: string | null = world()) {
  if (seed) await page.addInitScript(seedScript, seed);
  await page.goto('./');
  await expect(field(page)).toBeVisible();
}

/** Types a line in the trailhead's field and presses Return. */
async function keep(page: Page, text: string) {
  await field(page).fill(text);
  await field(page).press('Enter');
  await expect(words(page)).toHaveText(text);
}

/** Map's Activities, on "No wander": whether the line is there (loose). */
async function looseOnMap(page: Page, text: string) {
  await page.getByRole('link', { name: 'Map', exact: true }).click();
  await expect(page).toHaveURL(/\/map$/);
  await openSheet(page, 'Activities');
  await page.getByRole('tab', { name: 'No wander' }).click();
  return page.getByRole('dialog').getByText(text, { exact: true }).filter({ visible: true });
}

test.describe('the trailhead', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('opening shows only the night sky, the question, “nothing yet is fine”, I’m not sure and Map; focus is in the field', async ({ page }) => {
    await open(page);
    await expect(page.getByRole('heading', { name: PROMPT, exact: true })).toBeVisible();
    await expect(field(page)).toBeFocused();
    await expect(field(page)).toHaveAttribute('placeholder', 'nothing yet is fine');
    await expect(field(page)).toHaveValue('');
    // Nothing else to press, nothing to steer you: two links, no buttons (the send ↑ comes with words).
    await expect(page.getByRole('link').filter({ visible: true })).toHaveText(['Map', 'I’m not sure']);
    await expect(page.getByRole('button').filter({ visible: true })).toHaveCount(0);
    await expect(suggestions(page)).toHaveCount(0);
    // None of today's Home: no graph, no What's next, no ＋, no sheet handle.
    await expect(page.getByTestId('home-graph-picture')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Wanderment' })).toHaveCount(0);
    await expect(page.getByText('Clean my car')).toHaveCount(0);
    // The sky is there and hidden from screen readers.
    await expect(page.getByTestId('night-sky')).toHaveAttribute('aria-hidden', 'true');
    for (const name of ['Map', 'I’m not sure']) {
      const b = (await page.getByRole('link', { name, exact: true }).boundingBox())!;
      expect(b.height, name).toBeGreaterThanOrEqual(44);
      expect(b.width, name).toBeGreaterThanOrEqual(44);
    }
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p65-trailhead-empty.png` });
  });

  test('suggestions appear only once you type (P-61’s), under the field; a tap attaches, Return never picks', async ({ page }) => {
    await open(page);
    await expect(suggestions(page)).toHaveCount(0);
    await field(page).pressSequentially('cl');
    const step = suggestions(page).getByRole('option', { name: /^Clean my car, feel productive/ }); // P-66 fix 14: “·” is spoken as a comma
    await expect(step).toBeVisible();
    expect((await suggestions(page).boundingBox())!.y).toBeGreaterThan((await field(page).boundingBox())!.y);
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p65-trailhead-typing.png` });
    // Return logs what's typed, as typed, picking nothing.
    await field(page).press('Enter');
    await expect(words(page)).toHaveText('cl');
    await expect(said(page, 'Kept, loose')).toBeVisible();
    // A tap does attach (and the step's line completes it).
    await button(page, NEW_LINE).click(); // P-65 fix 4: was the prompt's words
    await field(page).pressSequentially('cl');
    await step.click();
    await expect(field(page)).toHaveValue('Clean my car');
    await field(page).press('Enter');
    await expect(said(page, 'Logged → feel productive')).toBeVisible();
    await expect(moves(page)).toHaveCount(0);
  });

  test('Return logs exactly as typed, loose, with no toast; the words become the billboard; Undo takes it back', async ({ page }) => {
    await open(page);
    await keep(page, LINE);
    await expect(said(page, 'Kept, loose')).toBeVisible();
    await expect(page.getByText(/^Logged/).filter({ visible: true })).toHaveCount(0);
    await expect(field(page)).toHaveCount(0);
    await expect(words(page)).toBeFocused();
    await expect(button(page, 'Undo')).toBeVisible();
    expect((await button(page, 'Undo').boundingBox())!.height).toBeGreaterThanOrEqual(44);
    // Undo: the line goes, its words back in the field.
    await button(page, 'Undo').click();
    await expect(words(page)).toHaveCount(0);
    await expect(field(page)).toHaveValue(LINE);
    await expect(field(page)).toBeFocused();
    await expect(await looseOnMap(page, LINE)).toHaveCount(0);
  });

  test('“Move it?” offers Next on / Log toward the guessed wander / Somewhere else, each one tap with Undo', async ({ page }) => {
    await open(page);
    await keep(page, LINE);
    await expect(moves(page).getByRole('button')).toHaveText(['Next on draw better hands', 'Log toward draw better hands', 'Somewhere else…']);
    for (const b of await moves(page).getByRole('button').all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p65-trailhead-move-it.png` });

    // Log toward: one tap; Undo makes it loose again.
    await button(page, 'Log toward draw better hands').click();
    await expect(said(page, 'Logged toward draw better hands')).toBeVisible();
    await expect(moves(page)).toHaveCount(0);
    await expect(button(page, 'Undo')).toBeFocused();
    await button(page, 'Undo').click();
    await expect(said(page, 'Kept, loose')).toBeVisible();
    await expect(moves(page)).toBeVisible();

    // Next on: the words become the step (the line isn't a log any more); Undo puts it back.
    await button(page, 'Next on draw better hands').click();
    await expect(said(page, 'Next on draw better hands')).toBeVisible();
    await expect(words(page)).toHaveText(LINE);
    await button(page, 'Undo').click();
    await expect(said(page, 'Kept, loose')).toBeVisible();

    // Somewhere else: any wander (most recently walked first), one tap.
    await button(page, 'Somewhere else…').click();
    await expect(elsewhere(page).getByRole('button')).toHaveText(['feel productive', 'draw better hands', 'Cancel']);
    await expectNoSeriousViolations(page);
    await elsewhere(page).getByRole('button', { name: 'feel productive', exact: true }).click();
    await expect(said(page, 'Logged toward feel productive')).toBeVisible();
    await button(page, 'Undo').click();
    await expect(said(page, 'Kept, loose')).toBeVisible();

    // Next on, kept: Map's Wanders shows it as draw better hands' step, and the line isn't loose.
    await button(page, 'Next on draw better hands').click();
    await expect(await looseOnMap(page, LINE)).toHaveCount(0);
    await openSheet(page, 'Wanders');
    await expect(page.getByRole('dialog').getByText(LINE).filter({ visible: true }).first()).toBeVisible();
  });

  test('Next on is never offered over a staged step; with no guess only Somewhere else, where a new wander can be named', async ({ page }) => {
    await open(page);
    await keep(page, 'cooked dinner');
    await expect(moves(page).getByRole('button')).toHaveText(['Log toward feel productive', 'Somewhere else…']);
    await button(page, 'Log toward feel productive').click();
    await expect(said(page, 'Logged toward feel productive')).toBeVisible();

    await button(page, NEW_LINE).click(); // P-65 fix 4: was the prompt's words
    await expect(field(page)).toBeFocused();
    await keep(page, 'went for a swim');
    await expect(moves(page).getByRole('button')).toHaveText(['Somewhere else…']);
    await button(page, 'Somewhere else…').click();
    const name = elsewhere(page).getByRole('textbox', { name: 'A new wander', exact: true });
    await name.fill('get fit');
    await name.press('Enter');
    await expect(said(page, 'Logged toward get fit')).toBeVisible();
    await button(page, 'Undo').click();
    await expect(said(page, 'Kept, loose')).toBeVisible();
    await button(page, 'Somewhere else…').click();
    await expect(elsewhere(page).getByRole('button', { name: 'get fit', exact: true })).toHaveCount(0);
  });

  test('leaving keeps the line: it stays loose, and coming back is the question again', async ({ page }) => {
    await open(page);
    await keep(page, LINE);
    await expect(await looseOnMap(page, LINE)).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Back to the prompt', exact: true }).click();
    await expect(page).toHaveURL(/\/wanderment\/$/);
    await expect(words(page)).toHaveCount(0);
    await expect(field(page)).toBeVisible();
    // And after a reload it's still there, still loose.
    await page.reload();
    await expect(await looseOnMap(page, LINE)).toBeVisible();
  });

  test('Map shows today’s graph, one tap away; I’m not sure looks up (P-66); Back, the ‹ or Esc return to the prompt', async ({ page }) => {
    await open(page);
    await page.getByRole('link', { name: 'Map', exact: true }).click();
    await expect(page).toHaveURL(/\/wanderment\/map$/);
    await expect(page.getByRole('heading', { name: 'Wanderment' })).toBeVisible();
    await expect(page.getByTestId('home-graph-picture')).toBeVisible();
    await expect(page.getByTestId('graph-node-feel productive').filter({ visible: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log something', exact: true })).toBeVisible();
    await expectNoSeriousViolations(page);
    await page.goBack();
    await expect(field(page)).toBeVisible();

    // P-66: "I’m not sure" looks up at the sky (it opened Map until then); Back returns to the prompt.
    await page.getByRole('link', { name: 'I’m not sure', exact: true }).click();
    await expect(page).toHaveURL(/\/wanderment\/sky$/);
    await expect(page.getByTestId('look-up')).toBeVisible(); // fix 16: "Not sure." is gone (was its heading)
    await page.goBack();
    await expect(field(page)).toBeVisible();

    await page.getByRole('link', { name: 'Map', exact: true }).click();
    await expect(page).toHaveURL(/\/wanderment\/map$/);
    const back = page.getByRole('button', { name: 'Back to the prompt', exact: true });
    expect((await back.boundingBox())!.width).toBeGreaterThanOrEqual(44);
    await back.click();
    await expect(page).toHaveURL(/\/wanderment\/$/);

    // Opened on its own (no way back in history), Esc with nothing to clear goes to the prompt.
    await page.goto('./map');
    await expect(page.getByTestId('home-graph-picture')).toBeVisible();
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/wanderment\/$/);
    await expect(field(page)).toBeVisible();
  });

  test('the sky moves only without Reduce Motion', async ({ page }) => {
    await open(page);
    const twinkle = page.getByTestId('sky-twinkle').first();
    const opacity = () => twinkle.evaluate((el) => getComputedStyle(el).opacity);
    const first = await opacity();
    await expect.poll(opacity, { timeout: 5000 }).not.toBe(first);
  });

  test('under Reduce Motion the sky is still: nothing animates', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    const look = () =>
      page.evaluate(() => [
        ...[...document.querySelectorAll('[data-testid="sky-twinkle"], [data-testid="sky-lantern"]')].map((el) => `${getComputedStyle(el).opacity} ${getComputedStyle(el).transform}`),
        String(document.getAnimations().length),
      ]);
    const before = await look();
    expect(before.length).toBeGreaterThan(2);
    // Watching for change needs time to pass (the slowest loop is 6 s; half of one would show).
    await page.waitForTimeout(3000);
    expect(await look()).toEqual(before);
    expect(before.at(-1)).toBe('0');
  });

  test('a short window (as with the keyboard up) or 200 % zoom keeps the field in view, nothing wider than the screen', async ({ page }) => {
    for (const [width, height] of [
      [390, 400],
      [195, 422],
    ]) {
      await page.setViewportSize({ width, height });
      await open(page);
      await expect(field(page)).toBeInViewport({ ratio: 1 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await expectNoSeriousViolations(page);
    }
  });

  for (const [width, height] of [
    [390, 844],
    [390, 480],
    [195, 422],
  ])
    test(`fix 1: at ${width}×${height} the ground (hills, path, lantern) never lies under a control, and the placeholder isn’t clipped`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await open(page);
      // A short window (keyboard up) or 200 % zoom draws no ground; a phone draws it below the content.
      if (height < 640) await expect(page.getByTestId('sky-lantern')).toHaveCount(0);
      else await expect(page.getByTestId('sky-lantern')).toBeVisible();
      await expectGroundClear(page, 'empty');
      const fits = await field(page).evaluate((el: HTMLInputElement) => {
        const cs = getComputedStyle(el);
        const ctx = document.createElement('canvas').getContext('2d')!;
        ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        return ctx.measureText(el.placeholder).width <= el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      });
      expect(fits, 'placeholder clipped').toBe(true);
      await field(page).pressSequentially('cl');
      await expect(suggestions(page)).toBeVisible();
      await expectGroundClear(page, 'typing');
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/p65-trailhead-typing-${width}x${height}.png` });
      await field(page).fill(LINE);
      await field(page).press('Enter');
      await expect(moves(page)).toBeVisible();
      await expectGroundClear(page, 'Move it?');
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/p65-trailhead-move-it-${width}x${height}.png` });
      await button(page, 'Somewhere else…').click();
      await expectGroundClear(page, 'Somewhere else');
    });

  test('fix 2: the field’s focus ring is the night palette’s (≥ 3:1), and the dashed “doing?” chip reads at 4.5:1', async ({ page }) => {
    await open(page);
    await expect(field(page)).toBeFocused();
    const ring = await field(page).evaluate((el) => {
      const cs = getComputedStyle(el);
      return { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth), color: cs.outlineColor };
    });
    expect(ring.style).toBe('solid');
    expect(ring.width).toBeGreaterThanOrEqual(2);
    expect(ring.color).not.toBe('rgb(255, 255, 255)');
    expect(contrast(ring.color, NIGHT_BG)).toBeGreaterThanOrEqual(3);
    // Typing a line that names a wander's words suggests it as the doing one (dashed).
    await field(page).pressSequentially('hands hurt');
    const chip = page.getByRole('button', { name: /^Suggested: doing / });
    await expect(chip).toBeVisible();
    const color = await chip.locator('div[dir="auto"]').last().evaluate((el) => getComputedStyle(el).color);
    expect(contrast(color, NIGHT_BG)).toBeGreaterThanOrEqual(4.5);
  });

  test('fix 3: the moves are as quiet as “Kept, loose” — one muted colour, never larger than it', async ({ page }) => {
    await open(page);
    await keep(page, LINE);
    const look = (l: Locator) =>
      l.locator('div[dir="auto"]').first().evaluate((el) => {
        const cs = getComputedStyle(el);
        return { color: cs.color, size: parseFloat(cs.fontSize) };
      });
    const kept = await look(said(page, 'Kept, loose'));
    const ms = await moves(page).getByRole('button').all();
    expect(ms.length).toBe(3);
    for (const m of ms) {
      const cs = await look(m);
      expect(cs.color, await m.innerText()).toBe(kept.color);
      expect(kept.size).toBeGreaterThanOrEqual(cs.size);
    }
  });

  test('fix 4: above your words is “New line” (a tap, or typing, starts one); your words are a heading', async ({ page }) => {
    await open(page);
    await keep(page, LINE);
    await expect(page.getByRole('heading', { name: LINE, exact: true })).toBeVisible();
    await expect(button(page, NEW_LINE)).toHaveText(NEW_LINE);
    expect((await button(page, NEW_LINE).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    // Typing (focus on the words, not a field) starts the next line with what was typed.
    await expect(words(page)).toBeFocused();
    await page.keyboard.press('r');
    await expect(field(page)).toBeFocused();
    await expect(field(page)).toHaveValue('r');
    await page.keyboard.type('an');
    await expect(field(page)).toHaveValue('ran');
    await expect(words(page)).toHaveCount(0);
    // A tap does the same.
    await field(page).press('Enter');
    await button(page, NEW_LINE).click();
    await expect(field(page)).toBeFocused();
    await expect(field(page)).toHaveValue('');
  });

  test('fix 5: “A new wander” has a visible Make it button besides Return', async ({ page }) => {
    await open(page);
    await keep(page, 'went for a swim');
    await button(page, 'Somewhere else…').click();
    const make = elsewhere(page).getByRole('button', { name: 'Make it', exact: true });
    await expect(make).toBeVisible();
    expect((await make.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await elsewhere(page).getByRole('textbox', { name: 'A new wander', exact: true }).fill('get fit');
    await make.click();
    await expect(said(page, 'Logged toward get fit')).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test('fix 6: Map is one Shift+Tab from the field, and no scroller is a Tab stop', async ({ page }) => {
    await open(page);
    await expect(field(page)).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('link', { name: 'Map', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(field(page)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'I’m not sure', exact: true })).toBeFocused();
    // Nothing that only scrolls takes a Tab stop (here, or on the sky).
    const scrollStops = () =>
      page.evaluate(() =>
        [...document.querySelectorAll('div')].filter((d) => {
          const o = getComputedStyle(d).overflowY;
          return (o === 'auto' || o === 'scroll') && d.tabIndex >= 0 && !d.getAttribute('role');
        }).length,
      );
    expect(await scrollStops()).toBe(0);
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.getAttribute('role') ?? document.activeElement?.tagName)).not.toBe('DIV');
    await page.getByRole('link', { name: 'I’m not sure', exact: true }).click();
    await expect(page).toHaveURL(/\/sky$/);
    expect(await scrollStops()).toBe(0);
  });

  test('first run: nothing yet, the same question; the first line is kept loose and can name the first wander', async ({ page }) => {
    await open(page, null);
    await expect(field(page)).toBeFocused();
    await keep(page, 'went for a walk');
    await expect(said(page, 'Kept, loose')).toBeVisible();
    await button(page, 'Somewhere else…').click();
    await expect(elsewhere(page).getByRole('button')).toHaveText(['Cancel']);
    const name = elsewhere(page).getByRole('textbox', { name: 'A new wander', exact: true });
    await name.fill('move more');
    await name.press('Enter');
    await expect(said(page, 'Logged toward move more')).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test('fix 17: typing that matches a wander offers a quiet “Open <wander>”; it opens the trail and logs nothing', async ({ page }) => {
    await open(page);
    await field(page).pressSequentially('dr');
    const openIt = suggestions(page).getByRole('option', { name: 'Open draw better hands', exact: true });
    await expect(openIt).toBeVisible();
    expect((await openIt.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expectNoSeriousViolations(page);
    await openIt.click();
    await expect(page).toHaveURL(/\/wanderment\/trail\/draw%20better%20hands$/);
    await expect(page.getByRole('heading', { name: 'draw better hands', exact: true })).toBeVisible();
    // Nothing was logged: its only footprint is the one from before.
    await expect(page.getByRole('list', { name: 'Footprints' }).getByRole('listitem')).toHaveCount(1);
    await page.goBack();
    await expect(field(page)).toBeVisible();
    await expect(words(page)).toHaveCount(0);
  });

  test('fix 17: a why the words match opens its star; Return still logs exactly as typed', async ({ page }) => {
    await open(page);
    await field(page).pressSequentially('feel');
    await expect(suggestions(page).getByRole('option', { name: 'Open feel productive', exact: true })).toBeVisible();
    await field(page).press('Enter');
    await expect(words(page)).toHaveText('feel');
    await expect(said(page, 'Kept, loose')).toBeVisible();
    await button(page, NEW_LINE).click();
    await field(page).pressSequentially('feel');
    await suggestions(page).getByRole('option', { name: 'Open feel productive', exact: true }).click();
    // feel productive has one wander feeding it, so its star opens that trail (P-66).
    await expect(page).toHaveURL(/\/wanderment\/(star\/feel%20productive|trail\/draw%20better%20hands\?star=feel(%20|\+)productive)$/);
  });
});
