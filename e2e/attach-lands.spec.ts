/**
 * P-82 (B-09 slice 4; the owner's "attaching never updates the map"): after Toward…, First step or
 * attaching from a suggestion, the line travels into its node on the home (≤ 600 ms, picture only,
 * never blocking input; under Reduce Motion it just appears there) and stays labelled there until the
 * next action, the node warmed; the toast says it in words and sits above the composer (fold-in 9).
 * Also the P-80 leftover (c): a line that already went toward a wander never offers Toward… again.
 */
import { AxeBuilder } from '@axe-core/playwright';
import { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { seedScript } from './graphFixture';

const SHOTS = process.env.E2E_SHOTS; // set to a folder to save screenshots for a visual check
const DAY = 864e5;
const PROMPT = 'Where are we wandering today?';
const AT_REST = /\/wanderment\/$/;

const field = (page: Page) => page.getByRole('textbox', { name: PROMPT, exact: true });
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const landed = (page: Page) => page.getByTestId('landed');

async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = serious.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => `${n.target.join(' ')} ${n.html.slice(0, 200)}`).slice(0, 5).join('\n  ')}`);
  expect(report, report.join('\n')).toEqual([]);
}

/** feel productive (a cold why, fed by tidy long ago) and draw; one recent loose line. */
function world({ shading = true } = {}) {
  const now = Date.now();
  const at = (d: number) => new Date(now - d * DAY).toISOString();
  const threads: Record<string, Record<string, unknown>> = {
    fp: { id: 'fp', name: 'feel productive', hidden: false, createdAt: at(200), declaredAt: at(60) },
    tidy: { id: 'tidy', name: 'tidy', hidden: false, createdAt: at(150) },
    draw: { id: 'draw', name: 'draw', hidden: false, createdAt: at(140) },
  };
  const activities = {
    old: { id: 'old', text: 'tidied the desk', occurredAt: at(70), createdAt: at(70), toIds: ['fp'], doingId: 'tidy' },
    r: { id: 'r', text: 'read on the bus', occurredAt: at(1), createdAt: at(1), toIds: [] },
    went: { id: 'went', text: 'for the soup', occurredAt: at(2), createdAt: at(2), toIds: ['tidy'] },
  };
  return JSON.stringify({ state: { data: { version: 1, threads, activities }, showShading: shading }, version: 1 });
}

async function open(page: Page, seed = world()) {
  await page.addInitScript(seedScript, seed);
  await page.goto('./');
  await expect(field(page)).toBeVisible();
}

/** Return on the trailhead, then Toward… <wander>, with a pointer: the session ends by itself. */
async function toward(page: Page, text: string, wander: string) {
  await field(page).fill(text);
  await field(page).press('Enter');
  await expect(page.getByTestId('trail-words')).toHaveText(text);
  await button(page, 'Toward…').click();
  await button(page, wander).click();
  await expect(page).toHaveURL(AT_REST);
}

test.describe('attaching lands where you’re looking (P-82)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('after Toward…, the line lands in its node, labelled in words, the node warm; the toast says it, above the composer', async ({ page }) => {
    await open(page);
    await toward(page, 'cleaned the kitchen', 'tidy');
    await expect(landed(page)).toHaveText('cleaned the kitchen → tidy');
    await expect(landed(page)).toHaveAttribute('data-node', 'tidy');
    // Warm: just walked (glow), and its words at 4.5:1 or more.
    await expect(landed(page).getByTestId('node-glow')).toBeAttached();
    // Within 600 ms of arriving it's in place (the travel is picture only).
    await page.waitForTimeout(650);
    const a = (await landed(page).boundingBox())!;
    await page.waitForTimeout(300);
    expect((await landed(page).boundingBox())!.y).toBe(a.y);
    // In the band above the lines, never over them; not a duplicate in the feed.
    for (const l of await page.getByTestId('rest-line').all()) expect((await l.boundingBox())!.y).toBeGreaterThanOrEqual(a.y + a.height - 1);
    await expect(page.getByTestId('rest-line').filter({ hasText: 'cleaned the kitchen' })).toHaveCount(0);
    // The toast says it in words, with Undo, above the composer.
    const toast = page.getByText('Toward tidy', { exact: true });
    await expect(toast).toBeVisible();
    const t = (await toast.boundingBox())!;
    const composer = (await page.getByTestId('trailhead-scroll').boundingBox())!;
    expect(t.y + t.height).toBeLessThanOrEqual(composer.y + 1);
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p82-landed.png` });
  });

  test('it stays until the next action: a while later it’s still there; typing takes it away', async ({ page }) => {
    await open(page);
    await toward(page, 'cleaned the kitchen', 'tidy');
    await expect(landed(page)).toBeVisible();
    await page.waitForTimeout(7000); // past the toast's 6 s
    await expect(landed(page)).toBeVisible();
    await field(page).pressSequentially('n');
    await expect(landed(page)).toHaveCount(0);
  });

  test('Undo in the toast takes it back: the label goes', async ({ page }) => {
    await open(page);
    await toward(page, 'cleaned the kitchen', 'tidy');
    await expect(landed(page)).toBeVisible();
    await button(page, 'Undo').click();
    await expect(landed(page)).toHaveCount(0);
  });

  test('after ↳ First step, the line lands in the wander it made', async ({ page }) => {
    await open(page);
    await field(page).fill('learn to juggle');
    await field(page).press('Enter');
    await button(page, 'First step').click();
    await page.getByRole('textbox', { name: 'First step' }).fill('three balls');
    await page.getByRole('textbox', { name: 'First step' }).press('Enter');
    await expect(page).toHaveURL(AT_REST);
    await expect(landed(page)).toHaveText('learn to juggle → learn to juggle');
    await expect(page.getByText('First step on learn to juggle', { exact: true })).toBeVisible();
  });

  test('attached from a suggestion before Return: leaving the rise lands it; the toast says “Logged → …”', async ({ page }) => {
    await open(page);
    await field(page).pressSequentially('dra');
    await page.getByRole('option', { name: 'draw, attach', exact: true }).click();
    await field(page).press('Enter');
    await expect(page.getByTestId('trail-words')).toBeVisible();
    await button(page, 'New line').click();
    await expect(page).toHaveURL(AT_REST);
    await expect(landed(page)).toHaveAttribute('data-node', 'draw');
    await expect(page.getByText(/^Logged → draw$/)).toBeVisible();
  });

  test('Reduce Motion: it simply appears there (nothing animates)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    await toward(page, 'cleaned the kitchen', 'tidy');
    await expect(landed(page)).toBeVisible();
    const a = (await landed(page).boundingBox())!;
    expect(await landed(page).evaluate((el) => (el as HTMLElement).style.transform)).toMatch(/translateY\(0px\)|^$/);
    await page.waitForTimeout(300);
    expect((await landed(page).boundingBox())!.y).toBe(a.y);
  });

  test('with the shading off the node doesn’t glow; the words still say where it went', async ({ page }) => {
    await open(page, world({ shading: false }));
    await toward(page, 'cleaned the kitchen', 'tidy');
    await expect(landed(page)).toHaveText('cleaned the kitchen → tidy');
    await expect(landed(page).getByTestId('node-glow')).toHaveCount(0);
  });

  test('fix (c): a reopened line that already went toward a wander shows where it went, never Toward… again', async ({ page }) => {
    await open(page);
    await page.getByRole('group', { name: 'Recent' }).getByRole('button', { name: /^for the soup, / }).click();
    await expect(page.getByRole('heading', { name: 'for the soup', exact: true })).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Logged → tidy' })).toBeVisible();
    await expect(button(page, 'Toward…')).toHaveCount(0);
  });
});
