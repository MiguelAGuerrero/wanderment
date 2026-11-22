/** P-49: Home's bottom is one slot with two faces, "What’s next · <node>" and "Log", and a toggle under it. */
import { AxeBuilder } from '@axe-core/playwright';
import { Page } from '@playwright/test';

import { expect, test, toHome } from './fixtures';
import { legacyBlob, seedScript } from './graphFixture';

const SHOTS = process.env.E2E_SHOTS; // set to a folder to save screenshots for a visual check

const BOX = 'What did you just do?';
// Home's own box, shown or not (the fixtures' `logBox` switches faces by itself; these tests don't want that).
const box = (page: Page) => page.getByTestId('home-slot').locator(`input[aria-label="${BOX}"]`);
const tab = (page: Page, name: 'What’s next' | 'Log') => page.getByTestId('home-slot').getByRole('tab', { name, exact: true });
const card = (page: Page) => page.getByRole('region', { name: /^What’s next/ });
const check = (page: Page, step: string) => page.getByRole('button', { name: `Did it: ${step}`, exact: true });
const addOne = (page: Page) => card(page).getByRole('button', { name: /^add one/ });
const toast = (page: Page, text: string) => page.getByText(text, { exact: true }).filter({ visible: true });
const node = (page: Page, id: string) => page.getByTestId(`graph-node-${id}`).filter({ visible: true });
const said = (page: Page) => page.getByTestId('home-slot-said');
const bridge = (page: Page) => page.getByRole('group', { name: 'Attach what you just logged' });

/** P-29: hiding is emulated (headless pages stay visible), as in handoff.spec.ts. */
async function setVisibility(page: Page, state: 'hidden' | 'visible') {
  await page.evaluate((v) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => v === 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);
}

async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = serious.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => `${n.target.join(' ')} ${n.html.slice(0, 200)}`).slice(0, 5).join('\n  ')}`);
  expect(report, report.join('\n')).toEqual([]);
}

const DAY = 864e5;
/**
 * draw better hands → make apparel (declared), logged yesterday, with a staged step; sew, two days ago,
 * none; read was logged toward most recently but is hidden.
 */
function world() {
  const json = JSON.parse(
    legacyBlob(['draw better hands', 'make apparel', 'sew', 'read'], [
      { from: 'sew', to: ['make apparel'], text: 'hemmed', daysAgo: 2 },
      { from: 'draw better hands', to: ['make apparel'], text: 'sketched', daysAgo: 1 },
      { from: 'read', text: 'read a chapter', daysAgo: 0.5 },
    ]),
  );
  json.state.data.threads['make apparel'].declaredAt = new Date(Date.now() - 5 * DAY).toISOString();
  json.state.data.threads['draw better hands'].next = 'sketch a hand';
  json.state.data.threads.read.hidden = true;
  return JSON.stringify(json);
}

async function open(page: Page) {
  await page.addInitScript(seedScript, world());
  await page.goto('./');
  await expect(tab(page, 'What’s next')).toBeVisible();
}

test.describe('with wanders', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test.beforeEach(async ({ page }) => open(page));

  test('Home opens on What’s next: the wander last logged toward (not hidden), its step and ✓; the box is out of sight and unfocused', async ({ page }) => {
    await expect(tab(page, 'What’s next')).toHaveAttribute('aria-selected', 'true');
    await expect(tab(page, 'Log')).toHaveAttribute('aria-selected', 'false');
    await expect(page.getByTestId('home-slot').getByRole('tablist', { name: 'What’s next or Log' })).toBeVisible();
    // P-50: the card's name says its path (draw better hands feeds make apparel).
    await expect(card(page)).toHaveAccessibleName('What’s next, draw better hands, for make apparel: sketch a hand');
    await expect(card(page)).toContainText('What’s next · draw better hands');
    await expect(card(page)).toContainText('sketch a hand');
    await expect(check(page, 'sketch a hand')).toBeVisible();
    // Only one face at a time: the log box isn't shown (nor focused).
    await expect(box(page)).toBeHidden();
    await expect(page.getByRole('textbox', { name: BOX }).filter({ visible: true })).toHaveCount(0);
    // 44 px targets.
    for (const b of [check(page, 'sketch a hand'), tab(page, 'What’s next'), tab(page, 'Log')]) {
      const r = (await b.boundingBox())!;
      expect(Math.min(r.width, r.height)).toBeGreaterThanOrEqual(44);
    }
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p49-whats-next.png` });

    // Whenever Home is shown, it opens on What’s next again.
    await tab(page, 'Log').click();
    await expect(box(page)).toBeVisible();
    await page.getByRole('tab', { name: 'Wanders' }).click();
    await toHome(page);
    await expect(tab(page, 'What’s next')).toHaveAttribute('aria-selected', 'true');
    await expect(box(page)).toBeHidden();
  });

  test('✓ logs the step as typed, in its wander, and clears it (Undo puts it back); a line in the box stays', async ({ page }) => {
    // A line started on the Log face, then back to What’s next.
    await tab(page, 'Log').click();
    await box(page).fill('half a thought');
    await tab(page, 'What’s next').click();
    await check(page, 'sketch a hand').click();
    await expect(toast(page, 'Logged in draw better hands')).toBeVisible();
    await expect(page.getByTestId('graph-step-draw better hands')).toHaveCount(0);
    await expect(card(page)).toHaveAccessibleName('What’s next, draw better hands, for make apparel'); // P-50: with its path.
    await expect(addOne(page)).toBeVisible();
    await expect(tab(page, 'What’s next')).toHaveAttribute('aria-selected', 'true');
    await tab(page, 'Log').click();
    await expect(box(page)).toHaveValue('half a thought');
    await tab(page, 'What’s next').click();

    await page.getByRole('button', { name: 'Undo' }).filter({ visible: true }).click();
    await expect(check(page, 'sketch a hand')).toBeVisible();
    await check(page, 'sketch a hand').click();
    // The activity is the step's words, with draw better hands as doing.
    await page.getByRole('tab', { name: 'Activities' }).click();
    await page.getByText('sketch a hand', { exact: true }).filter({ visible: true }).click();
    await expect(page.getByRole('textbox', { name: 'What you did' })).toHaveValue('sketch a hand');
    await expect(page.getByText('draw better hands').filter({ visible: true }).first()).toBeVisible();
  });

  test('“＋ add one” saves a step for the card’s wander; Esc or leaving it empty cancels', async ({ page }) => {
    // A tap on a node focuses it: the card's node (P-50, with its path).
    await node(page, 'sew').click();
    await expect(card(page)).toHaveAccessibleName('What’s next, sew, for make apparel');
    await expect(card(page)).toContainText('What’s next · sew');
    await expect((await addOne(page).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p49-add-one.png` });

    await addOne(page).click();
    const field = page.getByRole('textbox', { name: 'What’s next for sew' });
    await expect(field).toBeFocused();
    await field.press('Escape');
    await expect(field).toHaveCount(0);
    await expect(addOne(page)).toBeVisible();
    // Esc in the field closed only the field: sew is still focused.
    await expect(card(page)).toHaveAccessibleName('What’s next, sew, for make apparel');

    await addOne(page).click();
    await field.blur();
    await expect(field).toHaveCount(0);

    await addOne(page).click();
    await field.fill('cut the pattern');
    await field.press('Enter');
    await expect(card(page)).toHaveAccessibleName('What’s next, sew, for make apparel: cut the pattern');
    await expect(check(page, 'cut the pattern')).toBeVisible();
    // P-50: the focused node's step is the one drawn, beside its dot (no "↳" line under it).
    await expect(page.getByTestId('graph-step-sew')).toHaveText('cut the pattern');
    // Nothing was logged.
    await expect(page.getByText(/^Logged/).filter({ visible: true })).toHaveCount(0);
  });

  test('the card’s node is only shown: a line from the Log face goes nowhere unless chosen, then the slot flips back', async ({ page }) => {
    await expect(card(page)).toHaveAccessibleName('What’s next, draw better hands, for make apparel: sketch a hand'); // P-50: with its path.
    await tab(page, 'Log').click();
    // A tap on the toggle focuses the field; no chip came with the card.
    await expect(box(page)).toBeFocused();
    await expect(page.getByRole('button', { name: /^(To|Doing): / })).toHaveCount(0);
    await box(page).fill('cooked dinner');
    // One send, ↑ (named "Log", as it was).
    const send = page.getByTestId('home-slot').getByRole('button', { name: 'Log', exact: true });
    await expect(send).toHaveText('↑');
    expect((await send.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p49-log-face.png` });
    await box(page).press('Enter');
    await expect(toast(page, 'Logged')).toBeVisible();
    // Back on What's next, with the bridge above the slot; focus on the What’s next tab.
    await expect(tab(page, 'What’s next')).toHaveAttribute('aria-selected', 'true');
    await expect(box(page)).toBeHidden();
    await expect(tab(page, 'What’s next')).toBeFocused();
    await expect(bridge(page)).toBeVisible();
    const b = (await bridge(page).boundingBox())!;
    expect(b.y + b.height).toBeLessThanOrEqual((await card(page).boundingBox())!.y);
    // The switch was announced.
    await expect(said(page)).toHaveText('What’s next');
    // It went nowhere: it's under "No wander".
    await page.getByRole('tab', { name: 'Activities' }).click();
    await page.getByRole('tab', { name: 'No wander' }).click();
    await expect(page.getByText('cooked dinner', { exact: true }).filter({ visible: true })).toBeVisible();
  });

  test('on web, typing with nothing editable focused switches to Log and starts the line; Esc on an empty line goes back', async ({ page }) => {
    await expect(page.locator('body')).toBeFocused();
    await page.keyboard.type('tuned');
    await expect(tab(page, 'Log')).toHaveAttribute('aria-selected', 'true');
    await expect(box(page)).toBeFocused();
    await expect(box(page)).toHaveValue('tuned');
    await expect(said(page)).toHaveText('Log');
    // Esc with words in the line leaves the face alone.
    await box(page).press('Escape');
    await expect(tab(page, 'Log')).toHaveAttribute('aria-selected', 'true');
    await box(page).fill('');
    await box(page).press('Escape');
    await expect(tab(page, 'What’s next')).toHaveAttribute('aria-selected', 'true');
    await expect(tab(page, 'What’s next')).toBeFocused();
    await expect(box(page)).toBeHidden();
    // Space on a focused button still presses it (here: the What’s next tab, already selected).
    await page.keyboard.press(' ');
    await expect(tab(page, 'What’s next')).toHaveAttribute('aria-selected', 'true');
    // Shortcuts don't type.
    await page.keyboard.press('Control+a');
    await expect(tab(page, 'What’s next')).toHaveAttribute('aria-selected', 'true');
    // Typing into another field (the step field) stays there.
    await node(page, 'sew').click();
    await addOne(page).click();
    await page.keyboard.type('pin');
    await expect(page.getByRole('textbox', { name: 'What’s next for sew' })).toHaveValue('pin');
    await expect(tab(page, 'What’s next')).toHaveAttribute('aria-selected', 'true');
  });

  // P-50: the "Toward sew" row is gone (was: "…keeps a selection; …"); focus and the attach chip carry it.
  test('Esc on the empty Log face keeps the focus and the attach; the Log face keeps the P-35 “to” chip', async ({ page }) => {
    await node(page, 'sew').click();
    await tab(page, 'Log').click();
    await expect(page.getByRole('button', { name: 'To: sew. Remove', exact: true })).toBeVisible();
    await box(page).press('Escape');
    await expect(tab(page, 'What’s next')).toHaveAttribute('aria-selected', 'true');
    await expect(card(page)).toHaveAccessibleName('What’s next, sew, for make apparel');
    await expect(page.getByTestId('graph-selected-sew')).toBeVisible();
    await expect(page.getByTestId('home-slot').getByRole('button', { name: 'To: sew. Remove', exact: true, includeHidden: true })).toHaveCount(1);
  });

  test('while the page doesn’t hold the data (P-29), What’s next says so: ✓ is refused out loud, the step stays, and it clears once back', async ({ page }) => {
    await setVisibility(page, 'hidden');
    // The same line the Log face shows over its box, on the face that's showing.
    const line = page.getByTestId('home-slot').getByText('Reconnecting…', { exact: true }).filter({ visible: true });
    await expect(line).toBeVisible();
    await check(page, 'sketch a hand').click();
    await expect(toast(page, 'Just a moment — reconnecting.')).toBeVisible();
    await expect(card(page)).toHaveAccessibleName('What’s next, draw better hands, for make apparel: sketch a hand'); // P-50: with its path.
    await expect(page.getByTestId('graph-step-draw better hands')).toHaveText('sketch a hand'); // P-50: beside its dot, no "↳".
    await setVisibility(page, 'visible');
    await expect(line).toHaveCount(0);
    // Back: ✓ works, once.
    await check(page, 'sketch a hand').click();
    await expect(toast(page, 'Logged in draw better hands')).toBeVisible();
  });

  test('at 200 % zoom (195 px) both faces have no serious accessibility violations and the toggle stays on screen', async ({ page }) => {
    await page.setViewportSize({ width: 195, height: 422 });
    await expect(card(page)).toBeVisible();
    await expect(tab(page, 'Log')).toBeInViewport();
    await expect(check(page, 'sketch a hand')).toBeInViewport();
    await expectNoSeriousViolations(page);
    await tab(page, 'Log').click();
    await expect(box(page)).toBeInViewport();
    await expectNoSeriousViolations(page);
  });
});

test.describe('with no wanders', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the slot opens on Log, the toggle still shows, and a log stays on Log', async ({ page }) => {
    await page.goto('./');
    await expect(tab(page, 'Log')).toHaveAttribute('aria-selected', 'true');
    await expect(tab(page, 'What’s next')).toHaveAttribute('aria-selected', 'false');
    await expect(box(page)).toBeVisible();
    // Opening never focuses the field.
    await expect(box(page)).not.toBeFocused();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p49-no-wanders.png` });
    await expectNoSeriousViolations(page);
    await box(page).fill('read a novel');
    await box(page).press('Enter');
    await expect(toast(page, 'Logged')).toBeVisible();
    await expect(tab(page, 'Log')).toHaveAttribute('aria-selected', 'true');
    await expect(box(page)).toHaveValue('');
    // What’s next has nothing to show yet.
    await tab(page, 'What’s next').click();
    await expect(card(page)).toHaveAccessibleName('What’s next: nothing staged');
    await expectNoSeriousViolations(page);
  });

  test('once a log names a wander, the slot flips to What’s next for it', async ({ page }) => {
    await page.goto('./');
    await box(page).fill('scales @play guitar');
    await page.getByRole('option', { name: /New wander “play guitar”/ }).click();
    await box(page).press('Enter');
    await expect(toast(page, 'Logged → to play guitar')).toBeVisible();
    await expect(tab(page, 'What’s next')).toHaveAttribute('aria-selected', 'true');
    await expect(card(page)).toHaveAccessibleName('What’s next, play guitar');
  });
});
