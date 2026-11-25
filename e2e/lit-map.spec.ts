/**
 * P-81 (B-09 slice 3, D-16): "I'm not sure" lights the map in place. `/sky` is the lit state. Your whys
 * and wanders appear as named nodes, all one size (warmth by glow only; none with the shading off), in a
 * band kept for them above the feed; links (≥ 3:1) go from the shown lines to the nodes they went
 * toward — complete for the shown whys; the feed's lines never move or change (fold-in 7). It stays lit
 * until toggled (or Esc, or Back); "Map lit" is said, with no count; a node opens its session (a why its
 * star, a wander its trail with What's next). Also here, from Map's retired specs: declaring a wander
 * makes its node a why at once, hiding one takes its node away (was home-graph.spec).
 */
import { AxeBuilder } from '@axe-core/playwright';
import { Page } from '@playwright/test';

import { AT_OLD, expect, OLD, test } from './fixtures';
import { seedScript } from './graphFixture';

const SHOTS = process.env.E2E_SHOTS; // set to a folder to save screenshots for a visual check
const DAY = 864e5;
const PROMPT = 'Where are we wandering today?';
const UNSURE = 'I’m not sure — light up the map';
const AT_REST = AT_OLD;
const LIT = /\/wanderment\/sky$/;

const field = (page: Page) => page.getByRole('textbox', { name: PROMPT, exact: true });
const unsure = (page: Page) => page.getByRole('button', { name: UNSURE, exact: true });
const recent = (page: Page) => page.getByRole('group', { name: 'Recent', exact: true });
const lines = (page: Page) => recent(page).getByRole('button');
const nodesGroup = (page: Page) => page.getByRole('group', { name: 'Whys and wanders', exact: true });
const nodes = (page: Page) => nodesGroup(page).getByRole('button');
const node = (page: Page, id: string) => page.locator(`[data-testid="lit-node"][data-id="${id}"]`);

async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = serious.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => `${n.target.join(' ')} ${n.html.slice(0, 200)}`).slice(0, 5).join('\n  ')}`);
  expect(report, report.join('\n')).toEqual([]);
}

/** WCAG contrast of two `rgb(…)` colours. */
function contrast(a: string, b: string) {
  const lum = (c: string) => {
    const [r, g, bl] = c.match(/\d+(\.\d+)?/g)!.slice(0, 3).map((v) => Number(v) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
/** The night's lightest sky colour (N.skyLow), the worst case behind the map. */
const SKY_LOW = 'rgb(43, 34, 56)';

/**
 * feel productive (declared) fed by tidy; Become an illustrator (declared) fed by draw; learn Spanish
 * (a wander nothing recent points at); a few lines in the last three weeks.
 */
function world({ shading = true, hidden = [] as string[] } = {}) {
  const now = Date.now();
  const at = (d: number) => new Date(now - d * DAY).toISOString();
  const threads: Record<string, Record<string, unknown>> = {};
  for (const [id, name, made] of [
    ['fp', 'feel productive', 200],
    ['ill', 'Become an illustrator', 190],
    ['tidy', 'tidy', 150],
    ['draw', 'draw', 140],
    ['es', 'learn Spanish', 100],
  ] as const)
    threads[id] = { id, name, hidden: hidden.includes(id), createdAt: at(made) };
  threads.fp.declaredAt = at(30);
  threads.ill.declaredAt = at(20);
  threads.draw.next = 'sketch hands from photo refs';
  const activities: Record<string, unknown> = {};
  const add = (id: string, text: string, d: number, extra: Record<string, unknown> = {}) => (activities[id] = { id, text, occurredAt: at(d), createdAt: at(d), toIds: [], ...extra });
  add('k', 'cleaned the kitchen', 2, { doingId: 'tidy', toIds: ['fp'] });
  add('s', 'sketched hands', 0.1, { doingId: 'draw', toIds: ['ill'] });
  add('r', 'read on the bus', 1);
  add('g', 'gesture drawing', 4, { doingId: 'draw' });
  return JSON.stringify({ state: { data: { version: 1, threads, activities }, showShading: shading }, version: 1 });
}

async function open(page: Page, seed = world(), path = OLD) {
  await page.addInitScript(seedScript, seed);
  await page.goto(path);
  await expect(field(page)).toBeVisible();
}

/** Every line's place and accessible name. */
const placed = (page: Page) =>
  page.getByTestId('rest-line').evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), text: (el as HTMLElement).innerText };
    }),
  );

test.describe('the lit map (P-81)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the chip lights the map in place (`/sky`): named nodes and links are added, the lines never move or change; “Map lit” is said, no count', async ({ page }) => {
    await open(page);
    await expect(lines(page)).toHaveCount(4);
    const before = await placed(page);
    const fieldAt = await field(page).boundingBox();
    await expect(nodesGroup(page)).toHaveCount(0);
    await unsure(page).click();
    await expect(page).toHaveURL(LIT);
    await expect(unsure(page)).toHaveAttribute('aria-pressed', 'true');
    // The mark isn't colour alone: a filled star on a filled chip.
    await expect(unsure(page).locator('path')).not.toHaveAttribute('fill', 'none');
    // Nodes: the whys (stars) first, then every wander feeding them; learn Spanish isn't pointed at, so it stays dark.
    await expect(nodes(page)).toHaveCount(4);
    const names = await nodes(page).evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')));
    for (const [i, re] of [/^feel productive, last walked /, /^Become an illustrator, last walked /, /^tidy, last walked /, /^draw, last walked /].entries()) expect(names[i]).toMatch(re);
    await expect(node(page, 'fp')).toHaveAttribute('data-kind', 'why');
    await expect(node(page, 'tidy')).toHaveAttribute('data-kind', 'wander');
    await expect(node(page, 'es')).toHaveCount(0);
    // Spread across the band (P-81 rework, was jammed in a corner): both halves used, none overlapping, none within 16 px of an edge.
    const boxes = await Promise.all((await nodes(page).all()).map(async (n) => (await n.boundingBox())!));
    expect(boxes.some((b) => b.x + b.width / 2 > 195)).toBe(true);
    expect(boxes.some((b) => b.x + b.width / 2 < 195)).toBe(true);
    for (const b of boxes) {
      expect(b.x).toBeGreaterThanOrEqual(16);
      expect(b.x + b.width).toBeLessThanOrEqual(390 - 16);
    }
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const [a, b] = [boxes[i], boxes[j]];
        expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true);
      }
    // The lines are exactly where (and as) they were; the field and its chip too.
    expect(await placed(page)).toEqual(before);
    expect(await field(page).boundingBox()).toEqual(fieldAt);
    // Links from the shown lines to where they went (cleaned the kitchen → tidy and feel productive; sketched hands → draw, Become an illustrator; gesture drawing → draw).
    await expect(page.getByTestId('lit-link')).toHaveCount(5);
    const stroke = await page.getByTestId('lit-link').first().evaluate((el) => getComputedStyle(el).stroke);
    expect(contrast(stroke, SKY_LOW)).toBeGreaterThanOrEqual(3);
    await expect(lines(page).filter({ hasText: 'cleaned the kitchen' })).toHaveAttribute('aria-label', /^cleaned the kitchen, .+, toward tidy and feel productive$/);
    await expect(lines(page).filter({ hasText: 'read on the bus' })).toHaveAttribute('aria-label', /^read on the bus, [^,]+$/);
    // Said once, in words, no count.
    await expect(page.getByTestId('lit-said')).toHaveText('Map lit');
    await expect(page.getByText(/\d+ (whys?|wanders?|nodes?|lines?)/i)).toHaveCount(0);
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p81-lit.png` });
  });

  test('nodes are all one size (warmth by glow only), 44 pt tall, their names at 4.5:1; the shading off leaves no glow', async ({ page }) => {
    await open(page, world(), './sky');
    await expect(nodes(page).first()).toBeVisible();
    const sizes = await page.locator('[data-testid="lit-node"] svg').evaluateAll((els) => els.map((e) => `${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`));
    expect(new Set(sizes).size).toBe(1);
    for (const n of await nodes(page).all()) {
      const b = (await n.boundingBox())!;
      expect(b.height).toBeGreaterThanOrEqual(44);
      const color = await n.locator('div[dir="auto"]').first().evaluate((el) => getComputedStyle(el).color);
      expect(contrast(color, SKY_LOW)).toBeGreaterThanOrEqual(4.5);
    }
    await expect(page.getByTestId('node-glow').first()).toBeAttached();
  });

  test('with the shading off, no node glows', async ({ page }) => {
    await open(page, world({ shading: false }), './sky');
    await expect(nodes(page)).toHaveCount(4);
    await expect(page.getByTestId('node-glow')).toHaveCount(0);
  });

  test('it stays lit until toggled: typing, a while, a session and back keep it lit; the chip, Esc or Back dim it, focus kept', async ({ page }) => {
    await open(page);
    await unsure(page).click();
    await expect(page).toHaveURL(LIT);
    await page.waitForTimeout(1500);
    await expect(nodes(page)).toHaveCount(4);
    // Tapping a wander opens its trail, with What's next; coming back down, it's still lit.
    await node(page, 'draw').click();
    await expect(page).toHaveURL(/\/trail\/draw$/);
    await expect(page.getByText('sketch hands from photo refs')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(LIT);
    await expect(unsure(page)).toHaveAttribute('aria-pressed', 'true');
    // A why opens its star (or, with one wander, that trail).
    await node(page, 'fp').click();
    await expect(page).toHaveURL(/\/trail\/tidy\?star=fp$/);
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(LIT);
    // The chip again dims it; focus stays on the chip.
    await unsure(page).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(AT_REST);
    await expect(nodesGroup(page)).toHaveCount(0);
    await expect(unsure(page)).toBeFocused();
    await expect(unsure(page)).toHaveAttribute('aria-pressed', 'false');
    // Esc dims it.
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(LIT);
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(AT_REST);
    // Back dims it.
    await unsure(page).click();
    await expect(page).toHaveURL(LIT);
    await page.goBack();
    await expect(page).toHaveURL(AT_REST);
    await expect(nodesGroup(page)).toHaveCount(0);
  });

  test('Return while lit: the line rises, and coming back down the map is still lit', async ({ page }) => {
    await open(page, world(), './sky');
    await field(page).fill('made a list');
    await field(page).press('Enter');
    await expect(page.getByTestId('trail-words')).toHaveText('made a list');
    await page.getByRole('button', { name: 'New line', exact: true }).click();
    await expect(page).toHaveURL(LIT);
    await expect(nodes(page)).toHaveCount(4);
  });

  test('`/map` (Map is retired) lands here, lit', async ({ page }) => {
    await open(page, world(), './map');
    await expect(page).toHaveURL(LIT);
    await expect(nodes(page)).toHaveCount(4);
  });

  test('declaring a wander makes its node a why at once; hiding one takes its node away (from Map’s retired graph specs)', async ({ page }) => {
    await page.addInitScript(seedScript, world());
    await page.goto('./thread/es');
    await page.getByRole('button', { name: 'What it’s for', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Not what it’s for right now', exact: true })).toBeVisible();
    await page.goto('./sky');
    await expect(node(page, 'es')).toHaveAttribute('data-kind', 'why');
    await page.goto('./thread/tidy');
    await page.getByRole('button', { name: 'Hide', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Undo' }).filter({ visible: true })).toBeVisible();
    await page.goto('./sky');
    await expect(nodes(page).first()).toBeVisible();
    await expect(node(page, 'tidy')).toHaveCount(0);
  });

  test('at the largest text and at 200 % zoom the lit map is a list: the lines, then the whys and wanders; nothing wider than the screen', async ({ page }) => {
    await page.setViewportSize({ width: 195, height: 422 });
    await open(page, world(), './sky');
    await expect(page.getByTestId('live-map')).toHaveAttribute('data-mode', 'list');
    await expect(nodes(page)).toHaveCount(4);
    const order = await page.evaluate(() => {
      const r = document.querySelector('[aria-label="Recent"]')!;
      const n = document.querySelector('[aria-label="Whys and wanders"]')!;
      return r.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING;
    });
    expect(order).toBeTruthy();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(195);
    await expect(field(page)).toBeInViewport({ ratio: 1 });
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p81-lit-200.png` });
  });

  test('Reduce Motion: lighting moves nothing', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    const before = await placed(page);
    await unsure(page).click();
    await expect(nodes(page)).toHaveCount(4);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    expect(await placed(page)).toEqual(before);
  });
});
