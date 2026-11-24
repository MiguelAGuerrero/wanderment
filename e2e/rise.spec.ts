/**
 * P-73 (B-08 slice 1, D-14/D-15): the rise — Return on the home's field saves the line at once, as
 * typed, and the camera tilts up: the words are the session's heading. A lit line has quiet Done it
 * (✦), ↳ First step and a corner Toward…; the sticky done chip settles each line at once. Each choice
 * has an inline Undo (no timer), then the session ends by itself. A lit star's glow fades like warmth.
 */
import { AxeBuilder } from '@axe-core/playwright';
import { Page } from '@playwright/test';

import { expect, logLine, openSheet, test } from './fixtures';
import { legacyBlob, seedScript } from './graphFixture';

const SHOTS = process.env.E2E_SHOTS; // set to a folder to save screenshots for a visual check
const DAY = 864e5;
const PROMPT = 'Where are we wandering today?';
const LINE = 'learn watercolour';

const field = (page: Page) => page.getByRole('textbox', { name: PROMPT, exact: true });
const words = (page: Page) => page.getByTestId('trail-words');
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const said = (page: Page, text: string) => page.getByRole('status').filter({ hasText: text });
const chip = (page: Page) => page.getByRole('switch', { name: 'done', exact: true });
const star = (page: Page) => page.getByTestId('rise-star');
const stepField = (page: Page) => page.getByRole('textbox', { name: 'First step', exact: true });
const toward = (page: Page) => page.getByRole('group', { name: 'Toward…', exact: true });
const lit = (page: Page) => page.locator('[data-testid="rest-line"][data-state="lit"]');
const AT_REST = /\/wanderment\/$/;
const RISEN = /\/wanderment\/line\/[^/]+$/;

async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = serious.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => `${n.target.join(' ')} ${n.html.slice(0, 200)}`).slice(0, 5).join('\n  ')}`);
  expect(report, report.join('\n')).toEqual([]);
}

/** draw (no step), cook (staged "make soup"), secret (hidden); one old log toward draw. */
function world(extra: (json: { state: { data: { threads: Record<string, Record<string, unknown>>; activities: Record<string, unknown> }; showShading: boolean } }) => void = () => {}) {
  const json = JSON.parse(legacyBlob(['draw', 'cook', 'secret'], [{ from: 'draw', text: 'sketched a hand', daysAgo: 3 }]));
  json.state.data.threads.cook.next = 'make soup';
  json.state.data.threads.secret.hidden = true;
  extra(json);
  return JSON.stringify(json);
}

async function open(page: Page, seed = world()) {
  await page.addInitScript(seedScript, seed);
  await page.goto('./');
  await expect(field(page)).toBeVisible();
}

/** Types a line in the home's field and presses Return: it rises. */
async function send(page: Page, text: string) {
  await field(page).fill(text);
  await field(page).press('Enter');
  await expect(words(page)).toHaveText(text);
}

/** The sky's loose lines (the reachable stars), by accessible name. */
async function looseNames(page: Page) {
  await page.getByRole('link', { name: 'I’m not sure', exact: true }).click();
  const names = await page.getByRole('group', { name: 'Loose', exact: true }).getByRole('button').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  await page.keyboard.press('Escape');
  await expect(field(page)).toBeVisible();
  return names;
}

test.describe('the rise', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('Return saves the line at once, lit; the camera tilts up; the words are the heading, focused; quiet Done it, First step and Toward…; no hint lines, no “Kept, loose”', async ({ page }) => {
    await open(page);
    await send(page, LINE);
    await expect(page).toHaveURL(RISEN);
    await expect(page.getByTestId('home')).toHaveAttribute('data-camera', 'up');
    await expect(page.getByRole('heading', { name: LINE, exact: true })).toBeFocused();
    await expect(star(page)).toHaveAttribute('data-state', 'lit');
    for (const name of ['Done it', 'First step', 'Toward…', 'New line']) {
      const b = button(page, name);
      await expect(b).toBeVisible();
      const box = (await b.boundingBox())!;
      expect(box.height, name).toBeGreaterThanOrEqual(44);
      expect(box.width, name).toBeGreaterThanOrEqual(44);
    }
    // ✦ and ↳ are decorative.
    await expect(button(page, 'Done it')).toHaveText('✦ Done it');
    await expect(button(page, 'First step')).toHaveText('↳ First step');
    for (const gone of ['Kept, loose', 'Move it?', 'Somewhere else…', /^Return /]) await expect(page.getByText(gone)).toHaveCount(0);
    // The status says nothing until a choice; nothing to undo.
    await expect(page.getByRole('status')).toHaveText('');
    await expect(button(page, 'Undo')).toHaveCount(0);
    // Lit stars are night ink, never the accent colour.
    const fills = await star(page).locator('path, circle').evaluateAll((els) => els.map((e) => e.getAttribute('fill')));
    expect(fills.length).toBeGreaterThan(0);
    for (const f of fills) expect(f?.toUpperCase()).toBe('#F5F3EE');
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p73-rise-lit.png` });
    // Saved at once: reload mid-session keeps it lit; the session doesn't reopen by itself.
    await page.reload();
    await expect(page).toHaveURL(AT_REST);
    await expect(field(page)).toBeVisible();
    expect(await looseNames(page)).toContain(`${LINE}, today, lit`);
  });

  test('an empty Return logs nothing and nothing rises', async ({ page }) => {
    await open(page);
    await field(page).fill('   ');
    await field(page).press('Enter');
    await expect(page).toHaveURL(AT_REST);
    await expect(words(page)).toHaveCount(0);
  });

  test('Done it settles: a twinkle, it dims, “Settled” is announced, focus on Undo (no timer); Undo lights it again; Undo twice', async ({ page }) => {
    await open(page);
    await send(page, LINE);
    await button(page, 'Done it').focus();
    await page.keyboard.press('Enter'); // from the keyboard: the session waits for you to leave
    await expect(said(page, 'Settled')).toBeVisible();
    await expect(star(page)).toHaveAttribute('data-state', 'settled');
    await expect(button(page, 'Undo')).toBeFocused();
    await expect(button(page, 'Done it')).toHaveCount(0);
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p73-rise-settled.png` });
    await page.waitForTimeout(3000);
    await expect(button(page, 'Undo')).toBeVisible();
    await expect(page).toHaveURL(RISEN);
    // Undo: lit again, the choices back.
    await page.keyboard.press('Enter');
    await expect(star(page)).toHaveAttribute('data-state', 'lit');
    await expect(button(page, 'Undo')).toHaveCount(0);
    await expect(button(page, 'Done it')).toBeVisible();
    // Again, then once more: lit.
    await button(page, 'Done it').focus();
    await page.keyboard.press('Enter');
    await button(page, 'Undo').focus();
    await page.keyboard.press('Enter');
    await expect(star(page)).toHaveAttribute('data-state', 'lit');
    await button(page, 'New line').click();
    expect(await looseNames(page)).toContain(`${LINE}, today, lit`);
  });

  test('Done it with a pointer: Undo shows, then the session ends by itself and the field has focus; the line stays settled', async ({ page }) => {
    await open(page);
    await send(page, LINE);
    await button(page, 'Done it').click();
    await expect(said(page, 'Settled')).toBeVisible();
    await expect(page).toHaveURL(AT_REST, { timeout: 5000 });
    await expect(field(page)).toBeFocused();
    await expect(page.getByTestId('home')).toHaveAttribute('data-camera', 'rest');
    await expect(lit(page)).toHaveCount(0);
    await page.reload();
    expect(await looseNames(page)).toContain(`${LINE}, today`);
  });

  test('the done chip: three Returns in a row are three settled lines, each rising; it stays on across them and is off after leaving the home', async ({ page }) => {
    await open(page);
    // Only once you've typed (the home at rest stays bare).
    await expect(chip(page)).toHaveCount(0);
    await field(page).fill('read a chapter');
    await chip(page).click();
    await expect(chip(page)).toHaveAttribute('aria-checked', 'true');
    expect((await chip(page).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p73-done-chip.png` });
    await field(page).press('Enter');
    for (const [i, line] of ['read a chapter', 'went for a walk', 'called mum'].entries()) {
      if (i > 0) {
        // Typing in the rise starts the next line (the rise never blocks typing).
        await page.keyboard.press(line[0]);
        await expect(field(page)).toBeFocused();
        await page.keyboard.type(line.slice(1));
        await expect(field(page)).toHaveValue(line);
        await expect(chip(page)).toHaveAttribute('aria-checked', 'true');
        await field(page).press('Enter');
      }
      await expect(words(page)).toHaveText(line);
      await expect(page).toHaveURL(RISEN);
      await expect(said(page, 'Settled')).toBeVisible();
      await expect(star(page)).toHaveAttribute('data-state', 'settled');
      await expect(button(page, 'Undo')).toBeVisible();
      await expect(button(page, 'Done it')).toHaveCount(0);
      await words(page).focus();
    }
    await page.keyboard.press('Escape');
    await expect(field(page)).toBeFocused();
    await expect(chip(page)).toHaveAttribute('aria-checked', 'true');
    await expect(lit(page)).toHaveCount(0);
    // Leaving the home (Map) turns it off.
    await page.getByRole('link', { name: 'Map', exact: true }).click();
    await expect(page).toHaveURL(/\/map$/);
    await page.goBack();
    await field(page).fill('x');
    await expect(chip(page)).toHaveAttribute('aria-checked', 'false');
  });

  test('a done-chip line’s Undo takes the line back out, its words back in the field', async ({ page }) => {
    await open(page);
    await field(page).fill('half a seam');
    await chip(page).click();
    await field(page).press('Enter');
    await expect(said(page, 'Settled')).toBeVisible();
    await button(page, 'Undo').click();
    await expect(page).toHaveURL(AT_REST);
    await expect(field(page)).toHaveValue('half a seam');
  });

  test('↳ First step: Return makes the wander named with the line, with its step; the line settles toward it; Undo removes exactly that', async ({ page }) => {
    await open(page);
    await send(page, LINE);
    await button(page, 'First step').click();
    await expect(stepField(page)).toBeFocused();
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p73-first-step.png` });
    // Escape makes nothing: the line stays lit.
    await page.keyboard.press('Escape');
    await expect(stepField(page)).toHaveCount(0);
    await expect(page).toHaveURL(RISEN);
    await expect(star(page)).toHaveAttribute('data-state', 'lit');
    await expect(button(page, 'First step')).toBeFocused();
    // Cancel makes nothing either.
    await button(page, 'First step').click();
    await button(page, 'Cancel').click();
    await expect(stepField(page)).toHaveCount(0);

    await button(page, 'First step').click();
    await stepField(page).fill('buy a brush');
    await stepField(page).press('Enter');
    await expect(said(page, `First step on ${LINE}`)).toBeVisible();
    await expect(star(page)).toHaveAttribute('data-state', 'settled');
    await expect(button(page, 'Undo')).toBeFocused();
    // Undo: no wander, the line lit again.
    await page.keyboard.press('Enter');
    await expect(star(page)).toHaveAttribute('data-state', 'lit');
    await button(page, 'New line').click();
    await page.getByRole('link', { name: 'Map', exact: true }).click();
    await openSheet(page, 'Wanders');
    await expect(page.getByRole('dialog').getByText(LINE, { exact: true }).filter({ visible: true })).toHaveCount(0);
    await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
    await page.goBack();

    // Made for real: the wander and its step, on its trail.
    await send(page, 'learn watercolour again');
    await button(page, 'First step').click();
    await stepField(page).fill('buy a brush');
    await stepField(page).press('Enter');
    await expect(said(page, 'First step on learn watercolour again')).toBeVisible();
    await button(page, 'New line').click();
    await field(page).pressSequentially('learn watercolour ag');
    await page.getByRole('option', { name: 'Open learn watercolour again', exact: true }).click();
    await expect(page.getByTestId('trail-step')).toHaveText('buy a brush');
  });

  test('↳ First step on a line named like a wander uses it, and never overwrites its staged step', async ({ page }) => {
    await open(page);
    await send(page, 'Cook');
    await button(page, 'First step').click();
    await stepField(page).fill('chop onions');
    await stepField(page).press('Enter');
    await expect(said(page, 'First step on cook')).toBeVisible();
    await button(page, 'New line').click();
    await field(page).pressSequentially('coo');
    await page.getByRole('option', { name: 'Open cook', exact: true }).click();
    await expect(page.getByTestId('trail-step')).toHaveText('make soup');
  });

  test('Toward… lists visible wanders only; one tap attaches; Undo detaches', async ({ page }) => {
    await open(page);
    await send(page, 'sketch hands');
    await button(page, 'Toward…').click();
    await expect(toward(page).getByRole('button')).toHaveText(['draw', 'cook', 'Cancel']);
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p73-toward.png` });
    await toward(page).getByRole('button', { name: 'draw', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(said(page, 'Toward draw')).toBeVisible();
    await expect(button(page, 'Undo')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('status')).toHaveText('');
    await expect(button(page, 'Toward…')).toBeVisible();
    // Detached: still a loose line on the sky.
    await button(page, 'New line').click();
    expect(await looseNames(page)).toContain('sketch hands, today, lit');
  });

  test('a lit line older than about a month draws as settled; a fresh one glows', async ({ page }) => {
    const at = (d: number) => new Date(Date.now() - d * DAY).toISOString();
    const seed = (shading: boolean) =>
      world((json) => {
        json.state.showShading = shading;
        Object.assign(json.state.data.activities, {
          l1: { id: 'l1', text: 'fresh pursuit', occurredAt: at(1), createdAt: at(1), toIds: [], lit: true },
          l2: { id: 'l2', text: 'old pursuit', occurredAt: at(31), createdAt: at(31), toIds: [], lit: true },
          l3: { id: 'l3', text: 'settled long ago', occurredAt: at(2), createdAt: at(2), toIds: [], settledAt: at(2) },
        });
      });
    await open(page, seed(true));
    await expect(lit(page)).toHaveCount(1);
    await expect(page.getByTestId('rest-glow')).toHaveCount(1);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p73-rest-lit.png` });
    // Reachable as a star on the sky: the old one says so no more.
    const names = await looseNames(page);
    expect(names).toContain('fresh pursuit, yesterday, lit');
    expect(names.some((n) => n?.startsWith('settled long ago') && !n.endsWith(', lit'))).toBe(true);
  });

  test('with the shading off a lit line still draws lit (by shape) but has no glow', async ({ page }) => {
    const json = JSON.parse(world());
    json.state.showShading = false;
    await open(page, JSON.stringify(json));
    await send(page, LINE);
    await expect(star(page)).toHaveAttribute('data-state', 'lit');
    await expect(page.getByTestId('rise-glow')).toHaveCount(0);
    await button(page, 'New line').click();
    await expect(lit(page)).toHaveCount(1);
    await expect(page.getByTestId('rest-glow')).toHaveCount(0);
  });

  test('lines logged anywhere else (Map’s ＋, a trail’s Did it) are never lit', async ({ page }) => {
    await open(page);
    await page.getByRole('link', { name: 'Map', exact: true }).click();
    await expect(page).toHaveURL(/\/map$/);
    await logLine(page, 'from the map');
    await expect(page.getByText('Logged', { exact: true }).filter({ visible: true })).toBeVisible();
    await page.goto('./trail/cook');
    await button(page, 'Did it').click();
    await page.goto('./');
    await expect(field(page)).toBeVisible();
    await expect(page.getByTestId('rest-line')).toHaveCount(3);
    await expect(lit(page)).toHaveCount(0);
  });

  test('Reduce Motion: no rise, no twinkle; focus still moves to the words, then to Undo', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    await send(page, LINE);
    await expect(page.getByTestId('rise')).toHaveAttribute('data-passage', 'none');
    await expect(words(page)).toBeFocused();
    await button(page, 'Done it').focus();
    await page.keyboard.press('Enter');
    await expect(button(page, 'Undo')).toBeFocused();
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    const scale = await star(page).evaluate((el) => getComputedStyle(el).transform);
    expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(scale);
  });

  test('keyboard only: Tab goes from the words to Done it, then First step (New line and Toward… sit above); Esc leaves, and the field has focus', async ({ page }) => {
    await open(page);
    await send(page, LINE);
    await expect(words(page)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(button(page, 'Done it')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(button(page, 'First step')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(AT_REST);
    await expect(field(page)).toBeFocused();
  });

  test('a very long line at 200 % zoom: nothing wider than the screen, New line and Toward… don’t collide, axe clean', async ({ page }) => {
    await page.setViewportSize({ width: 195, height: 422 });
    await open(page);
    const long = 'read the whole of the long book about the history of cartography and the people who walked it '.repeat(2).trim();
    await send(page, long);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(195);
    const a = (await button(page, 'New line').boundingBox())!;
    const b = (await button(page, 'Toward…').boundingBox())!;
    expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true);
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p73-rise-200.png`, fullPage: true });
  });
});
