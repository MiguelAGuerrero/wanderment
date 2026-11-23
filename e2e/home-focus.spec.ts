/** P-50: tap to focus, swipe to move, tap to narrow (B-06 revision 12, "One mark per job"). */
import { AxeBuilder } from '@axe-core/playwright';
import { Locator, Page } from '@playwright/test';

import { expect, logBox, logLine, logPlus, showLogFace, test } from './fixtures';
import { legacyBlob, seedScript } from './graphFixture';

const SHOTS = process.env.E2E_SHOTS; // set to a folder to save screenshots for a visual check

const node = (page: Page, id: string) => page.getByTestId(`graph-node-${id}`).filter({ visible: true });
const nodes = (page: Page) => page.locator('[data-testid^="graph-node-"]').filter({ visible: true });
const rings = (page: Page) => page.locator('[data-testid^="graph-selected-"]').filter({ visible: true });
/** Step labels drawn in the picture (not their dots). */
const steps = (page: Page) => page.locator('[data-testid^="graph-step-"]:not([data-testid^="graph-step-dot-"])').filter({ visible: true });
const card = (page: Page) => page.getByRole('region', { name: /^What’s next/ });
const chip = (page: Page) => page.getByTestId('scope-chip').filter({ visible: true });
const said = (page: Page) => page.getByTestId('home-focus-said');
const toChips = (page: Page) => page.getByTestId('home-slot').getByRole('button', { name: /^To: /, includeHidden: true });
const list = (page: Page) => page.getByRole('list', { name: 'What’s in the picture' });
const toast = (page: Page, text: string) => page.getByText(text, { exact: true }).filter({ visible: true });

async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = serious.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => `${n.target.join(' ')} ${n.html.slice(0, 200)}`).slice(0, 5).join('\n  ')}`);
  expect(report, report.join('\n')).toEqual([]);
}

const DAY = 864e5;
/**
 * The mockup's world: make apparel (declared) ← draw ← draw better hands (logged toward last, with a
 * step), make apparel ← sew (no step), feel productive (declared) ← read (with a step).
 */
function world() {
  const json = JSON.parse(
    legacyBlob(['make apparel', 'feel productive', 'draw', 'sew', 'read', 'draw better hands'], [
      { from: 'sew', to: ['make apparel'], text: 'hemmed', daysAgo: 26 },
      { from: 'read', to: ['feel productive'], text: 'a chapter', daysAgo: 6 },
      { from: 'draw', to: ['make apparel'], text: 'sketched', daysAgo: 3 },
      { from: 'draw better hands', to: ['draw'], text: 'drew hands', daysAgo: 0.5 },
    ]),
  );
  json.state.data.threads['make apparel'].declaredAt = new Date(Date.now() - 9 * DAY).toISOString();
  json.state.data.threads['feel productive'].declaredAt = new Date(Date.now() - 8 * DAY).toISOString();
  json.state.data.threads['draw better hands'].next = 'sketch a hand';
  json.state.data.threads.read.next = 'finish chapter 4';
  return JSON.stringify(json);
}
/** What the card is called on each node (its path up: "toward" on the way, "for" a why). */
const NAME: Record<string, string> = {
  'draw better hands': 'What’s next, draw better hands, toward draw, for make apparel: sketch a hand',
  sew: 'What’s next, sew, for make apparel',
  read: 'What’s next, read, for feel productive: finish chapter 4',
  'make apparel': 'What’s next, make apparel',
  draw: 'What’s next, draw, for make apparel',
};
/** The chains (nodes nothing feeds), in the picture's order: left to right, then top to bottom. */
const CHAINS = ['draw better hands', 'sew', 'read'];

async function open(page: Page) {
  await page.addInitScript(seedScript, world());
  await page.goto('./');
  await expect(logPlus(page)).toBeVisible(); // P-61: was the What’s next tab
  await expect(nodes(page)).toHaveCount(6);
}

/** The circles' centres on screen, by node id. */
const centres = (page: Page) =>
  page.locator('[data-testid="home-graph-picture"] [data-testid^="graph-node-"]').evaluateAll((els) =>
    Object.fromEntries(
      els.map((e) => {
        const r = (e.firstElementChild as HTMLElement).getBoundingClientRect();
        return [e.getAttribute('data-testid')!.replace('graph-node-', ''), { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), r: Math.round(r.width / 2) }];
      }),
    ),
  );

/** A horizontal drag across the card, starting on `from` (its centre). */
async function swipe(page: Page, from: Locator, dx: number) {
  const b = (await from.boundingBox())!;
  const [x, y] = [b.x + b.width / 2, b.y + b.height / 2];
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + 2, { steps: 10 });
  await page.mouse.up();
}

/** The ring is on `id` (and only there); so is the card (P-61: always shown; was: when on What's next). */
const focusedOn = async (page: Page, id: string) => {
  await expect(rings(page)).toHaveCount(1);
  await expect(rings(page)).toHaveAttribute('data-testid', `graph-selected-${id}`);
  await expect(node(page, id)).toHaveAttribute('data-focused', 'true');
  await expect(card(page)).toHaveAccessibleName(NAME[id]);
};

/** The zoom after a scope change has come to rest. */
const settled = (page: Page) =>
  expect.poll(() => page.locator('[data-zoom]').evaluate((e) => getComputedStyle(e).transform)).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);

test.describe('at 390 px', () => {
  test.beforeEach(async ({ page }) => open(page));

  test('on open, focus is the chain last logged toward: one ring, its step the one filled dot, the card names its path; nothing is attached', async ({ page }) => {
    await focusedOn(page, 'draw better hands');
    await expect(card(page)).toContainText('What’s next · draw better hands');
    // Only the focused node's step is drawn: read has one too, and it isn't.
    await expect(steps(page)).toHaveCount(1);
    await expect(page.getByTestId('graph-step-draw better hands')).toHaveText('sketch a hand');
    await expect(page.getByTestId('graph-step-read')).toHaveCount(0);
    // A filled ink dot, below the circle and beside it, with its words further out.
    const dot = page.getByTestId('graph-step-dot-draw better hands');
    expect(await dot.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgb(24, 24, 27)');
    const d = (await dot.boundingBox())!;
    const c = (await centres(page))['draw better hands'];
    expect(d.y + d.height / 2).toBeGreaterThan(c.y + c.r / 2);
    expect(Math.abs(d.x + d.width / 2 - c.x)).toBeGreaterThan(c.r);
    // The step line under every node is gone.
    await expect(page.getByText(/^↳ /).filter({ visible: true })).toHaveCount(0);
    // P-60: at All there's no chip (was a quiet "All" heading), and no button.
    await expect(chip(page)).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'All', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^All/ })).toHaveCount(0);
    // Shown, never attached.
    await expect(toChips(page)).toHaveCount(0);
    await showLogFace(page);
    await expect(toChips(page)).toHaveCount(0);
    // The name opens the wander's page (44 px).
    const name = card(page).getByRole('link', { name: 'Open draw better hands', exact: true });
    expect((await name.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p50-1-open.png` });
    await name.click();
    await expect(page).toHaveURL(/\/thread\/draw%20better%20hands$|\/thread\/draw better hands$/);
  });

  // P-61: a tap attaches only while the log field is open (was: every tap attached).
  test('a tap focuses a circle (and, with the log field open, attaches it for one log): the ring, the card and the “to” chip follow; after the log only the chip is gone', async ({ page }) => {
    await node(page, 'sew').click();
    await focusedOn(page, 'sew');
    // No step: a dashed ＋ where the dot would be; no step words anywhere in the picture.
    await expect(page.getByTestId('graph-add-step-sew')).toBeVisible();
    await expect(steps(page)).toHaveCount(0);
    await expect(card(page).getByRole('button', { name: 'add one: a next step for sew' })).toBeVisible();
    await expect(said(page)).toHaveText(NAME.sew);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p50-4-no-step.png` });
    // With the field away, the tap attached nothing; with it open, a tap attaches: its solid, removable chip.
    await expect(toChips(page)).toHaveCount(0);
    await showLogFace(page);
    await expect(toChips(page)).toHaveCount(0);
    await node(page, 'sew').click();
    await expect(said(page)).toHaveText('Attached to sew');
    await expect(page.getByRole('button', { name: 'To: sew. Remove', exact: true })).toBeVisible();
    await logLine(page, 'pinned a hem');
    await expect(toast(page, 'Logged → sew')).toBeVisible(); // P-61: was “Logged → to sew”
    // Focus stays (the ring persists); the attach is used up.
    await focusedOn(page, 'sew');
    await expect(toChips(page)).toHaveCount(0);
    await logLine(page, 'cooked dinner');
    await expect(toast(page, 'Logged')).toBeVisible();
    await focusedOn(page, 'sew');
  });

  test('the dashed ＋ is the card’s “＋ add one”', async ({ page }) => {
    await node(page, 'sew').click();
    await page.getByTestId('graph-add-step-sew').click();
    const field = page.getByRole('textbox', { name: 'What’s next for sew' });
    await expect(field).toBeFocused();
    await field.fill('cut the pattern');
    await field.press('Enter');
    await expect(page.getByTestId('graph-step-sew')).toHaveText('cut the pattern');
    await expect(page.getByTestId('graph-step-dot-sew')).toBeVisible();
    await expect(page.getByTestId('graph-add-step-sew')).toHaveCount(0);
    await expect(card(page)).toHaveAccessibleName('What’s next, sew, for make apparel: cut the pattern');
    // From the open log field too: it goes away (P-61; was: back to What’s next from the Log face).
    await node(page, 'draw').click();
    await showLogFace(page);
    await page.getByTestId('graph-add-step-draw').click();
    await expect(logPlus(page)).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'What’s next for draw' })).toBeFocused();
  });

  test('a swipe on the card moves focus between the chains in the picture’s order, never zooming, never attaching; ✓ isn’t pressed by a swipe', async ({ page }) => {
    const before = await centres(page);
    // The picture's order is left to right, then top to bottom.
    const order = [...CHAINS].sort((a, b) => before[a].x - before[b].x || before[a].y - before[b].y);
    expect(order).toEqual(CHAINS);
    const check = page.getByRole('button', { name: 'Did it: sketch a hand', exact: true });
    await expect(page.getByTestId('whats-next-peek-prev')).toHaveCount(0);
    await expect(page.getByTestId('whats-next-peek-next')).toBeVisible();
    // Starting on ✓: the swipe moves focus and logs nothing.
    await swipe(page, check, -140);
    await focusedOn(page, 'sew');
    await expect(page.getByText(/^Logged/).filter({ visible: true })).toHaveCount(0);
    await expect(page.getByTestId('whats-next-peek-prev')).toBeVisible();
    if (SHOTS) await page.waitForTimeout(500).then(() => page.screenshot({ path: `${SHOTS}/p50-2-swiped.png` }));
    await swipe(page, card(page), -140);
    await focusedOn(page, 'read');
    await expect(page.getByTestId('graph-step-read')).toHaveText('finish chapter 4');
    await expect(steps(page)).toHaveCount(1);
    // The end: a soft stop.
    await expect(page.getByTestId('whats-next-peek-next')).toHaveCount(0);
    await swipe(page, card(page), -140);
    await focusedOn(page, 'read');
    await swipe(page, card(page), 140);
    await focusedOn(page, 'sew');
    await swipe(page, card(page), 140);
    await focusedOn(page, 'draw better hands');
    // ✓ still works with a clean tap, and only then.
    await check.click();
    await expect(toast(page, 'Logged → draw better hands')).toBeVisible(); // P-61: was “Logged in draw better hands”
    // Nothing moved or zoomed; nothing was attached.
    expect(await centres(page)).toEqual(before);
    await expect(chip(page)).toHaveCount(0); // P-60: at All, no chip (was "All")
    await expect(toChips(page)).toHaveCount(0);
  });

  test('‹ › and the arrow keys in the card move focus the same way, and say where it went', async ({ page }) => {
    const prev = card(page).getByRole('button', { name: 'Previous chain', exact: true });
    const next = card(page).getByRole('button', { name: 'Next chain', exact: true });
    await expect(prev).toBeDisabled();
    for (const b of [prev, next]) {
      const r = (await b.boundingBox())!;
      expect(Math.min(r.width, r.height)).toBeGreaterThanOrEqual(44);
    }
    await next.click();
    await focusedOn(page, 'sew');
    await expect(said(page)).toHaveText(NAME.sew);
    // Focus stays on the button.
    await expect(next).toBeFocused();
    await next.click();
    await focusedOn(page, 'read');
    await expect(next).toBeDisabled();
    await prev.click();
    await focusedOn(page, 'sew');
    // Arrow keys while focus is in the card.
    await card(page).getByRole('link', { name: 'Open sew' }).focus();
    await page.keyboard.press('ArrowLeft');
    await focusedOn(page, 'draw better hands');
    await expect(said(page)).toHaveText(NAME['draw better hands']);
    expect(await card(page).evaluate((el) => el.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('ArrowRight');
    await focusedOn(page, 'sew');
    await expect(toChips(page)).toHaveCount(0);
  });

  test('tapping a focused parent narrows to it and zooms; the chip, Esc and the browser’s Back go up; heat never changes', async ({ page }) => {
    const heat = async () => Object.fromEntries(await nodes(page).evaluateAll((els) => els.map((e) => [e.getAttribute('data-testid'), e.getAttribute('data-heat')])));
    const heatAll = await heat();
    await node(page, 'make apparel').click();
    await focusedOn(page, 'make apparel');
    await expect(nodes(page)).toHaveCount(6);
    await node(page, 'make apparel').click();
    // Only its subtree, the node on top, biggest; focus stays on it.
    await expect(nodes(page)).toHaveCount(4);
    await expect(node(page, 'feel productive')).toHaveCount(0);
    await expect(node(page, 'read')).toHaveCount(0);
    await focusedOn(page, 'make apparel');
    await expect(said(page)).toHaveText('Showing make apparel');
    await settled(page);
    const c = await centres(page);
    for (const id of ['draw', 'sew', 'draw better hands']) {
      expect(c[id].r, id).toBeLessThan(c['make apparel'].r);
      expect(c[id].y, id).toBeGreaterThan(c['make apparel'].y);
    }
    const pic = (await page.getByTestId('home-graph-picture').boundingBox())!;
    expect(Math.abs(c['make apparel'].x - (pic.x + pic.width / 2))).toBeLessThan(2);
    for (const [k, v] of Object.entries(await heat())) expect(v, k!).toBe(heatAll[k!]);
    // The chip says where up goes and where you are.
    const up = page.getByRole('button', { name: 'All · make apparel, back to All', exact: true });
    await expect(up).toHaveText('‹ All · make apparel');
    expect((await up.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    // The list is the scope's too (P-60: the picture's circles, named as the list's buttons were; their text is just the name).
    expect(await list(page).getByRole('button').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))).toEqual(['make apparel, what it’s for', 'draw, a wander', 'sew, a wander', 'draw better hands, a wander']);
    // A swipe walks this scope's chains only.
    await swipe(page, card(page), -140);
    await focusedOn(page, 'draw better hands');
    await swipe(page, card(page), -140);
    await focusedOn(page, 'sew');
    await swipe(page, card(page), -140);
    await focusedOn(page, 'sew');
    await node(page, 'make apparel').click();
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p50-3-narrowed.png` });

    // The chip goes up.
    await up.click();
    await expect(nodes(page)).toHaveCount(6);
    await expect(chip(page)).toHaveCount(0); // P-60: at All, no chip (was "All")
    await expect(said(page)).toHaveText('Showing all');
    await focusedOn(page, 'make apparel');
    // Esc goes up.
    await node(page, 'make apparel').click();
    await expect(nodes(page)).toHaveCount(4);
    await page.keyboard.press('Escape');
    await expect(nodes(page)).toHaveCount(6);
    // So does the browser's Back, staying on Home.
    await node(page, 'make apparel').click();
    await expect(nodes(page)).toHaveCount(4);
    await page.goBack();
    await expect(nodes(page)).toHaveCount(6);
    await expect(page).toHaveURL(/\/wanderment\/$/);
    await expect(logPlus(page)).toBeVisible(); // P-61: was the What’s next tab

    // Two levels: the chip names both, and each way up goes one level.
    await node(page, 'make apparel').click();
    await node(page, 'draw').click();
    await node(page, 'draw').click();
    await expect(nodes(page)).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'make apparel · draw, back to make apparel', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(nodes(page)).toHaveCount(4);
    await expect(up).toBeVisible();
    await page.goBack();
    await expect(nodes(page)).toHaveCount(6);
    await expect(page).toHaveURL(/\/wanderment\/$/);
  });

  test('narrowing zooms from where the node was, but not under Reduce Motion', async ({ page }) => {
    const watch = () =>
      page.locator('[data-zoom]').evaluate((el) => {
        const w = window as unknown as { __scales: number[] };
        w.__scales = [];
        new MutationObserver(() => {
          const m = /scale\(([\d.]+)\)/.exec((el as HTMLElement).style.transform);
          if (m) w.__scales.push(Number(m[1]));
        }).observe(el, { attributes: true, attributeFilter: ['style'] });
      });
    const scales = () => page.evaluate(() => (window as unknown as { __scales: number[] }).__scales);
    await watch();
    await node(page, 'make apparel').click();
    await node(page, 'make apparel').click();
    await expect(nodes(page)).toHaveCount(4);
    await expect.poll(async () => (await scales()).at(-1)).toBe(1);
    // It started smaller (make apparel was a smaller circle) and grew.
    expect(Math.min(...(await scales()))).toBeLessThan(0.95);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.keyboard.press('Escape');
    await expect(nodes(page)).toHaveCount(6);
    await watch();
    await node(page, 'make apparel').click();
    await expect(nodes(page)).toHaveCount(4);
    await page.waitForTimeout(400);
    expect((await scales()).filter((s) => s !== 1)).toEqual([]);
  });

  // P-61: the tap that attaches is made with the log field open (was: a tap, then the line); the card stays in view (was: back to What’s next).
  test('Esc at All clears an attach and keeps the line; a tap on empty canvas too; focus stays either way', async ({ page }) => {
    await logBox(page).fill('half a seam');
    await node(page, 'sew').click();
    await expect(page.getByRole('button', { name: 'To: sew. Remove', exact: true })).toBeVisible();
    await logBox(page).press('Escape');
    await expect(toChips(page)).toHaveCount(0);
    await expect(logBox(page)).toHaveValue('half a seam');
    await focusedOn(page, 'sew');

    await node(page, 'read').click();
    await expect(toChips(page)).toHaveCount(1);
    const pic = (await page.getByTestId('home-graph-picture').boundingBox())!;
    await page.mouse.click(pic.x + pic.width / 2, pic.y + pic.height / 2);
    await expect(toChips(page)).toHaveCount(0);
    await expect(logBox(page)).toHaveValue('half a seam');
    await focusedOn(page, 'read');
  });

  // P-61: with the log field away a tap no longer attaches (was: "focus, attach, narrow"; one “to” chip).
  test('without pointing, the list does what a tap does: focus, narrow; screen readers hear each change', async ({ page }) => {
    const sew = list(page).getByRole('button', { name: 'sew, a wander', exact: true });
    await sew.focus();
    await page.keyboard.press('Enter');
    await focusedOn(page, 'sew');
    await expect(sew).toHaveAttribute('aria-current', 'true');
    await expect(sew).toBeFocused();
    await expect(said(page)).toHaveText(NAME.sew);
    await expect(toChips(page)).toHaveCount(0);
    const ma = list(page).getByRole('button', { name: 'make apparel, what it’s for', exact: true });
    await ma.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await expect(said(page)).toHaveText('Showing make apparel');
    await expect(list(page).getByRole('button')).toHaveCount(4);
    await expect(ma).toBeFocused();
    await expectNoSeriousViolations(page);
  });
});

test.describe('at 200 % zoom (195 px: no picture)', () => {
  test.use({ viewport: { width: 195, height: 422 } });
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(seedScript, world());
    await page.goto('./');
    await expect(logPlus(page)).toBeVisible(); // P-61: was the What’s next tab
  });

  test('the list and the card still focus, move and narrow, with no serious accessibility violations', async ({ page }) => {
    await expect(page.getByTestId('home-graph-picture')).toHaveCount(0);
    await expect(card(page)).toHaveAccessibleName(NAME['draw better hands']);
    await expect(list(page).getByRole('button', { name: 'draw better hands, a wander' })).toHaveAttribute('aria-current', 'true');
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p50-5-large-text.png`, fullPage: true });
    // With no picture, the list's order is the picture's order: draw better hands is the last chain.
    await expect(card(page).getByRole('button', { name: 'Next chain', exact: true })).toBeDisabled();
    await card(page).getByRole('button', { name: 'Previous chain', exact: true }).click();
    await expect(card(page)).toHaveAccessibleName(NAME.read);
    await list(page).getByRole('button', { name: 'sew, a wander', exact: true }).click();
    await expect(card(page)).toHaveAccessibleName(NAME.sew);
    const ma = list(page).getByRole('button', { name: 'make apparel, what it’s for', exact: true });
    await ma.click();
    await ma.click();
    await expect(list(page).getByRole('button')).toHaveCount(4);
    const up = page.getByRole('button', { name: 'All · make apparel, back to All', exact: true });
    await expect(up).toBeVisible();
    await expectNoSeriousViolations(page);
    await up.click();
    await expect(list(page).getByRole('button')).toHaveCount(6);
    await expect(logPlus(page)).toBeInViewport(); // P-61: was the Log tab
  });
});
