/**
 * P-35: act from a node — a tap attaches a wander to the next log (the "to" chip). P-50: the tap also
 * focuses it (the ring and the What's next card); the "Toward X" row above the log box is gone: the
 * card carries the step (✓, "＋ add one") and the name that opens the page, the chip carries the attach.
 */
import { AxeBuilder } from '@axe-core/playwright';
import { Page } from '@playwright/test';

import { expect, logBox, logLine, openHome, showLogFace, test } from './fixtures';
import { legacyBlob, seedScript } from './graphFixture';

const SHOTS = process.env.E2E_SHOTS; // set to a folder to save screenshots for a visual check

const node = (page: Page, id: string) => page.getByTestId(`graph-node-${id}`).filter({ visible: true });
const card = (page: Page) => page.getByRole('region', { name: /^What’s next/ });
const ring = (page: Page) => page.locator('[data-testid^="graph-selected-"]').filter({ visible: true });
const list = (page: Page) => page.getByRole('list', { name: 'What’s in the picture' });
const toast = (page: Page, text: string) => page.getByText(text, { exact: true }).filter({ visible: true });
const toChip = (page: Page, name: string) => page.getByRole('button', { name: `To: ${name}. Remove`, exact: true });

async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = serious.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => `${n.target.join(' ')} ${n.html.slice(0, 200)}`).slice(0, 5).join('\n  ')}`);
  expect(report, report.join('\n')).toEqual([]);
}

const DAY = 864e5;
/** One declared why (make apparel); draw has a staged step, sew has none. */
function world() {
  const json = JSON.parse(
    legacyBlob(['draw', 'make apparel', 'sew'], [
      { from: 'draw', to: ['make apparel'], text: 'sketch', daysAgo: 1 },
      { from: 'sew', to: ['make apparel'], text: 'hemmed', daysAgo: 2 },
    ]),
  );
  json.state.data.threads['make apparel'].declaredAt = new Date(Date.now() - 5 * DAY).toISOString();
  json.state.data.threads.draw.next = 'sketch a hand';
  return JSON.stringify(json);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(seedScript, world());
  await openHome(page);
});

// P-50: was "…: “Toward X” above the log box, its step one tap away, …" — the row is gone; the card shows it.
test('a tap focuses a node and attaches it: the card shows it, its step one tap away, the “to” chip inside the box, no keyboard', async ({ page }) => {
  await expect(page.getByRole('group', { name: /^Toward / })).toHaveCount(0);
  await node(page, 'draw').click();
  await expect(node(page, 'draw')).toHaveAttribute('data-focused', 'true');
  await expect(card(page)).toHaveAccessibleName('What’s next, draw, for make apparel: sketch a hand');
  const did = card(page).getByRole('button', { name: 'Did it: sketch a hand', exact: true });
  await expect(did).toBeVisible();
  await expect(card(page).getByRole('link', { name: 'Open draw', exact: true })).toBeVisible();
  // The "to" chip is inside the box (on the Log face).
  await expect(page.getByTestId('home-slot').getByRole('button', { name: 'To: draw. Remove', exact: true, includeHidden: true })).toHaveCount(1);
  // A tap never raises the keyboard: the log box isn't focused.
  await expect(logBox(page)).not.toBeFocused();
  for (const b of await card(page).getByRole('button').all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expectNoSeriousViolations(page);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p35-selected.png` });

  // One tap logs the step (owner: "quickly log … the next step"), in draw, and clears the step; Undo is in the toast.
  await did.click();
  await expect(toast(page, 'Logged in draw')).toBeVisible();
  await expect(logBox(page)).toHaveValue('');
  await expect(page.getByTestId('graph-step-draw')).toHaveCount(0);
  // The attach lasted one log; focus stays (P-50).
  await expect(toChip(page, 'draw')).toHaveCount(0);
  await expect(node(page, 'draw')).toHaveAttribute('data-focused', 'true');
});

test('typing logs toward the attached node, as typed; the toast names it; the next line goes nowhere', async ({ page }) => {
  await node(page, 'sew').click();
  await logLine(page, 'pinned a hem');
  await expect(toast(page, 'Logged → to sew')).toBeVisible();
  await expect(toChip(page, 'sew')).toHaveCount(0);
  // P-50: focus stays after the log (was: the row went).
  await expect(ring(page)).toHaveAttribute('data-testid', 'graph-selected-sew');
  await logLine(page, 'cooked dinner');
  await expect(toast(page, 'Logged')).toBeVisible();
});

test('removing the “to” chip clears the attach and the line goes nowhere', async ({ page }) => {
  await node(page, 'sew').click();
  await logBox(page).fill('pinned a hem');
  await toChip(page, 'sew').click();
  await expect(toChip(page, 'sew')).toHaveCount(0);
  await logBox(page).press('Enter');
  await expect(toast(page, 'Logged')).toBeVisible();
});

// P-50: the row's × is gone (the chip's × is the test above); focus stays when the attach goes.
test('Esc and a tap on empty canvas clear the attach, keeping what’s typed', async ({ page }) => {
  await node(page, 'sew').click();
  await logBox(page).fill('half a seam');
  await logBox(page).press('Escape');
  await expect(toChip(page, 'sew')).toHaveCount(0);
  await expect(logBox(page)).toHaveValue('half a seam');

  await node(page, 'draw').click();
  await expect(toChip(page, 'draw')).toBeVisible();
  const pic = (await page.getByTestId('home-graph-picture').boundingBox())!;
  // The picture's centre is never a node (P-15): empty canvas.
  const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('[data-testid]')?.getAttribute('data-testid'), [pic.x + pic.width / 2, pic.y + pic.height / 2]);
  expect(hit).toBe('home-graph-picture');
  await page.mouse.click(pic.x + pic.width / 2, pic.y + pic.height / 2);
  await expect(toChip(page, 'draw')).toHaveCount(0);
  await expect(logBox(page)).toHaveValue('half a seam');
  await expect(ring(page)).toHaveAttribute('data-testid', 'graph-selected-draw');
});

// P-48: no dots once wanders exist (was "…; dots still open their log; …"); logs on their own still do (home-is-graph.spec.ts).
// P-50: "Open" is the card's name (was: in the row).
test('tapping another node moves the focus and the attach; Open goes to the wander', async ({ page }) => {
  await node(page, 'sew').click();
  await node(page, 'draw').click();
  await expect(card(page)).toHaveAccessibleName('What’s next, draw, for make apparel: sketch a hand');
  // P-49: the chips are in the box, on the Log face of Home's slot (Home opens on What's next).
  await showLogFace(page);
  await expect(toChip(page, 'sew')).toHaveCount(0);
  await expect(toChip(page, 'draw')).toBeVisible();
  await page.getByRole('tab', { name: 'What’s next', exact: true }).click();
  await card(page).getByRole('link', { name: 'Open draw' }).click();
  await expect(page).toHaveURL(/\/thread\/draw$/);
  // Leaving Home cleared the attach; focus stays.
  await page.goBack();
  await expect(logBox(page)).toBeVisible();
  await expect(toChip(page, 'draw')).toHaveCount(0);
  await expect(ring(page)).toHaveAttribute('data-testid', 'graph-selected-draw');
  await expect(page.getByTestId('graph-dot-a1')).toHaveCount(0); // P-48: no dots once wanders exist (was: it opens /activity/a1).
});

// P-50: the row's "+ next step" is the card's "＋ add one" (was: "“+ next step” sets one inline, then it’s one tap to log").
test('“＋ add one” on a tapped node sets its step inline, then it’s one tap to log', async ({ page }) => {
  await node(page, 'sew').click();
  await card(page).getByRole('button', { name: 'add one: a next step for sew', exact: true }).click();
  const field = page.getByRole('textbox', { name: 'What’s next for sew' });
  await expect(field).toBeFocused();
  await field.fill('cut the pattern');
  await field.press('Enter');
  await expect(page.getByTestId('graph-step-sew')).toHaveText('cut the pattern');
  await expect(card(page).getByRole('button', { name: 'Did it: cut the pattern', exact: true })).toBeVisible();
  // Esc in the step field closes only the field.
  await node(page, 'make apparel').click();
  await card(page).getByRole('button', { name: 'add one: a next step for make apparel' }).click();
  await page.getByRole('textbox', { name: 'What’s next for make apparel' }).press('Escape');
  await expect(card(page)).toHaveAccessibleName('What’s next, make apparel');
  await expect(card(page).getByRole('button', { name: 'add one: a next step for make apparel' })).toBeVisible();
});

// P-50: was "…, focus moves to the row; Esc returns focus to the list" — no row: focus stays on the list's button, and the change is said.
test('without pointing: the list focuses and attaches, focus stays on it; Esc clears the attach', async ({ page }) => {
  const item = list(page).getByRole('button', { name: 'draw, a wander', exact: true });
  await item.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/wanderment\/$/);
  await expect(card(page)).toHaveAccessibleName('What’s next, draw, for make apparel: sketch a hand');
  await expect(page.getByTestId('home-focus-said')).toHaveText('What’s next, draw, for make apparel: sketch a hand');
  await expect(item).toBeFocused();
  // P-49: the chip is in the box, on the Log face of Home's slot, out of sight on What's next (and
  // switching faces would move focus): it's on the line all the same.
  await expect(page.getByTestId('home-slot').getByRole('button', { name: 'To: draw. Remove', exact: true, includeHidden: true })).toHaveCount(1);
  await expectNoSeriousViolations(page);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('home-slot').getByRole('button', { name: 'To: draw. Remove', exact: true, includeHidden: true })).toHaveCount(0);
  await expect(item).toBeFocused();
});

// P-50: was "the context row replaces the bridge …" — there's no row, so the bridge always shows.
test('the bridge stays above the slot when a node is tapped', async ({ page }) => {
  await logLine(page, 'read a novel');
  const bridge = page.getByRole('group', { name: 'Attach what you just logged' });
  await expect(bridge).toBeVisible();
  await node(page, 'draw').click();
  await expect(bridge).toBeVisible();
});

// P-50: the row's "Log next step" (which made a typed line count as the step) is gone; P-51 brings
// that back as the Log face's "✓ <step>" chip. Meanwhile ✓ logs the step and keeps the typed line.
test('a line already typed is kept: ✓ logs the step on its own, and the line stays in the box', async ({ page }) => {
  await node(page, 'draw').click();
  await logBox(page).fill('half a hand, then coffee');
  await page.getByRole('tab', { name: 'What’s next', exact: true }).click();
  await card(page).getByRole('button', { name: 'Did it: sketch a hand', exact: true }).click();
  await expect(toast(page, 'Logged in draw')).toBeVisible();
  await expect(page.getByTestId('graph-step-draw')).toHaveCount(0);
  await expect(logBox(page)).toHaveValue('half a hand, then coffee');
});
