/** P-35: act from a node — a tap selects a wander and the log box takes its context. */
import { AxeBuilder } from '@axe-core/playwright';
import { Page } from '@playwright/test';

import { expect, logBox, logLine, openHome, test } from './fixtures';
import { legacyBlob, seedScript } from './graphFixture';

const SHOTS = process.env.E2E_SHOTS; // set to a folder to save screenshots for a visual check

const node = (page: Page, id: string) => page.getByTestId(`graph-node-${id}`).filter({ visible: true });
const row = (page: Page) => page.getByRole('group', { name: /^Toward / });
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

test('a tap selects a node: “Toward X” above the log box, its step one tap away, the “to” chip inside the box, no keyboard', async ({ page }) => {
  await expect(row(page)).toHaveCount(0);
  await node(page, 'draw').click();
  await expect(node(page, 'draw')).toHaveAttribute('data-selected', 'true');
  await expect(row(page)).toHaveAccessibleName('Toward draw');
  await expect(row(page)).toContainText('Toward draw');
  const next = row(page).getByRole('button', { name: 'Log next step: sketch a hand', exact: true });
  await expect(next).toBeVisible();
  await expect(row(page).getByRole('link', { name: 'Open draw', exact: true })).toBeVisible();
  await expect(row(page).getByRole('button', { name: 'Clear selection', exact: true })).toBeVisible();
  // The row sits right above the log box; the "to" chip is inside it.
  const r = (await row(page).boundingBox())!;
  expect(r.y + r.height).toBeLessThanOrEqual((await logBox(page).boundingBox())!.y);
  await expect(toChip(page, 'draw')).toBeVisible();
  // A tap never raises the keyboard: the log box isn't focused.
  await expect(logBox(page)).not.toBeFocused();
  for (const b of await row(page).getByRole('button').all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expectNoSeriousViolations(page);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p35-selected.png` });

  // With an empty box, one tap logs the step (owner: "quickly log … the next step"), in draw, and
  // clears the step; Undo is in the toast.
  await next.click();
  await expect(toast(page, 'Logged in draw')).toBeVisible();
  await expect(logBox(page)).toHaveValue('');
  await expect(page.getByTestId('graph-step-draw')).toHaveCount(0);
  // The selection lasted one log.
  await expect(row(page)).toHaveCount(0);
  await expect(node(page, 'draw')).not.toHaveAttribute('data-selected', 'true');
});

test('typing logs toward the selection, as typed; the toast names it; the next line goes nowhere', async ({ page }) => {
  await node(page, 'sew').click();
  await logLine(page, 'pinned a hem');
  await expect(toast(page, 'Logged → to sew')).toBeVisible();
  await expect(row(page)).toHaveCount(0);
  await expect(toChip(page, 'sew')).toHaveCount(0);
  await logLine(page, 'cooked dinner');
  await expect(toast(page, 'Logged')).toBeVisible();
});

test('removing the “to” chip clears the selection and the line goes nowhere', async ({ page }) => {
  await node(page, 'sew').click();
  await logBox(page).fill('pinned a hem');
  await toChip(page, 'sew').click();
  await expect(row(page)).toHaveCount(0);
  await logBox(page).press('Enter');
  await expect(toast(page, 'Logged')).toBeVisible();
});

test('×, Esc and a tap on empty canvas clear the selection, keeping what’s typed', async ({ page }) => {
  await node(page, 'sew').click();
  await logBox(page).fill('half a seam');
  await row(page).getByRole('button', { name: 'Clear selection' }).click();
  await expect(row(page)).toHaveCount(0);
  await expect(toChip(page, 'sew')).toHaveCount(0);
  await expect(logBox(page)).toHaveValue('half a seam');

  await node(page, 'sew').click();
  await logBox(page).press('Escape');
  await expect(row(page)).toHaveCount(0);
  await expect(logBox(page)).toHaveValue('half a seam');

  await node(page, 'sew').click();
  const pic = (await page.getByTestId('home-graph-picture').boundingBox())!;
  // The picture's centre is never a node (P-15): empty canvas.
  const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('[data-testid]')?.getAttribute('data-testid'), [pic.x + pic.width / 2, pic.y + pic.height / 2]);
  expect(hit).toBe('home-graph-picture');
  await page.mouse.click(pic.x + pic.width / 2, pic.y + pic.height / 2);
  await expect(row(page)).toHaveCount(0);
  await expect(logBox(page)).toHaveValue('half a seam');
});

test('selecting another node moves the context; dots still open their log; Open goes to the wander', async ({ page }) => {
  await node(page, 'sew').click();
  await node(page, 'draw').click();
  await expect(row(page)).toHaveAccessibleName('Toward draw');
  await expect(toChip(page, 'sew')).toHaveCount(0);
  await expect(toChip(page, 'draw')).toBeVisible();
  await row(page).getByRole('link', { name: 'Open draw' }).click();
  await expect(page).toHaveURL(/\/thread\/draw$/);
  // Leaving Home cleared it.
  await page.goBack();
  await expect(logBox(page)).toBeVisible();
  await expect(row(page)).toHaveCount(0);
  await expect(toChip(page, 'draw')).toHaveCount(0);
  await page.getByTestId('graph-dot-a1').click();
  await expect(page).toHaveURL(/\/activity\/a1$/);
});

test('“+ next step” sets one inline, then it’s one tap to log', async ({ page }) => {
  await node(page, 'sew').click();
  await row(page).getByRole('button', { name: '+ next step', exact: true }).click();
  const field = page.getByRole('textbox', { name: 'Next step for sew' });
  await expect(field).toBeFocused();
  await field.fill('cut the pattern');
  await field.press('Enter');
  await expect(page.getByTestId('graph-step-sew')).toHaveText('↳ cut the pattern');
  await expect(row(page).getByRole('button', { name: 'Log next step: cut the pattern', exact: true })).toBeVisible();
  // Esc in the step field closes only the field.
  await node(page, 'make apparel').click();
  await row(page).getByRole('button', { name: '+ next step' }).click();
  await page.getByRole('textbox', { name: 'Next step for make apparel' }).press('Escape');
  await expect(row(page)).toHaveAccessibleName('Toward make apparel');
  await expect(row(page).getByRole('button', { name: '+ next step' })).toBeVisible();
});

test('without pointing: the list selects, focus moves to the row; Esc returns focus to the list', async ({ page }) => {
  const item = list(page).getByRole('button', { name: 'draw, a wander', exact: true });
  await item.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/wanderment\/$/);
  await expect(row(page)).toHaveAccessibleName('Toward draw');
  await expect(row(page).getByRole('button', { name: 'Log next step: sketch a hand' })).toBeFocused();
  await expect(toChip(page, 'draw')).toBeVisible();
  await expectNoSeriousViolations(page);
  await page.keyboard.press('Escape');
  await expect(row(page)).toHaveCount(0);
  await expect(item).toBeFocused();
});

test('the context row replaces the bridge above the log box instead of stacking on it', async ({ page }) => {
  await logLine(page, 'read a novel');
  const bridge = page.getByRole('group', { name: 'Attach what you just logged' });
  await expect(bridge).toBeVisible();
  await node(page, 'draw').click();
  await expect(row(page)).toBeVisible();
  await expect(bridge).toHaveCount(0);
  await row(page).getByRole('button', { name: 'Clear selection' }).click();
  await expect(bridge).toBeVisible();
});

test('a line already typed is kept: “Log next step” makes it count as the step, and Return logs it', async ({ page }) => {
  await node(page, 'draw').click();
  await logBox(page).fill('half a hand, then coffee');
  await row(page).getByRole('button', { name: 'Log next step: sketch a hand', exact: true }).click();
  // Nothing logged yet, the words stay; the step chip says the line counts as it.
  await expect(logBox(page)).toHaveValue('half a hand, then coffee');
  await expect(page.getByRole('button', { name: /sketch a hand, next step in draw/ })).toBeVisible();
  await logBox(page).press('Enter');
  await expect(toast(page, 'Logged in draw')).toBeVisible();
  await expect(page.getByTestId('graph-step-draw')).toHaveCount(0);
});
