/**
 * P-49: Home's bottom slot, "What’s next · <node>". P-61 (D-11) replaced its [What’s next | Log] toggle
 * with a round ＋ that raises the log field above the card (always shown); these tests follow (each
 * changed one says what it was).
 */
import { AxeBuilder } from '@axe-core/playwright';
import { Page } from '@playwright/test';

import { expect, openSheet, test, toHome } from './fixtures';
import { legacyBlob, seedScript } from './graphFixture';

const SHOTS = process.env.E2E_SHOTS; // set to a folder to save screenshots for a visual check

const BOX = 'What did you just do?';
// Home's own box, shown or not (the fixtures' `logBox` opens it by itself; these tests don't want that).
const box = (page: Page) => page.getByTestId('home-slot').locator(`input[aria-label="${BOX}"]`);
// P-61: the ＋ (was: the toggle's tabs).
const plus = (page: Page) => page.getByRole('button', { name: 'Log something', exact: true });
const card = (page: Page) => page.getByRole('region', { name: /^What’s next/ });
const check = (page: Page, step: string) => page.getByRole('button', { name: `Did it: ${step}`, exact: true });
const addOne = (page: Page) => card(page).getByRole('button', { name: /^add one/ });
const toast = (page: Page, text: string) => page.getByText(text, { exact: true }).filter({ visible: true });
const node = (page: Page, id: string) => page.getByTestId(`graph-node-${id}`).filter({ visible: true });
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
  await expect(plus(page)).toBeVisible();
}

test.describe('with wanders', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test.beforeEach(async ({ page }) => open(page));

  // P-61: no toggle (was: "Home opens on What’s next … the box is out of sight"); the card and ＋.
  test('Home shows What’s next: the wander last logged toward (not hidden), its step and ✓; the field is away and unfocused, and away again whenever Home is shown', async ({ page }) => {
    await expect(page.getByRole('tablist')).toHaveCount(0);
    // P-50: the card's name says its path (draw better hands feeds make apparel).
    await expect(card(page)).toHaveAccessibleName('What’s next, draw better hands, for make apparel: sketch a hand');
    await expect(card(page)).toContainText('What’s next · draw better hands');
    await expect(card(page)).toContainText('sketch a hand');
    await expect(check(page, 'sketch a hand')).toBeVisible();
    await expect(box(page)).toBeHidden();
    await expect(page.getByRole('textbox', { name: BOX }).filter({ visible: true })).toHaveCount(0);
    // 44 px targets (＋ is 56).
    for (const b of [check(page, 'sketch a hand'), plus(page)]) {
      const r = (await b.boundingBox())!;
      expect(Math.min(r.width, r.height)).toBeGreaterThanOrEqual(44);
    }
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p49-whats-next.png` });

    await plus(page).click();
    await expect(box(page)).toBeVisible();
    await box(page).fill('half');
    await openSheet(page, 'Wanders'); // P-58: a section of Home's sheet (was a tab)
    await toHome(page);
    await expect(box(page)).toBeHidden();
    await expect(card(page)).toBeVisible();
  });

  // P-61: the card stays while the field is open, so ✓ is pressed with the line in the field (was: a line on the Log face, then back to What’s next).
  test('✓ logs the step as typed, in its wander, and clears it (Undo puts it back); a line in the box stays', async ({ page }) => {
    await plus(page).click();
    await box(page).fill('half a thought');
    await check(page, 'sketch a hand').click();
    await expect(toast(page, 'Logged → draw better hands')).toBeVisible(); // P-61: was “Logged in draw better hands”
    await expect(page.getByTestId('graph-step-draw better hands')).toHaveCount(0);
    await expect(card(page)).toHaveAccessibleName('What’s next, draw better hands, for make apparel'); // P-50: with its path.
    await expect(addOne(page)).toBeVisible();
    await expect(box(page)).toHaveValue('half a thought');

    await page.getByRole('button', { name: 'Undo' }).filter({ visible: true }).click();
    await expect(check(page, 'sketch a hand')).toBeVisible();
    await check(page, 'sketch a hand').click();
    // The activity is the step's words, with draw better hands as doing.
    await openSheet(page, 'Activities'); // P-58: a section of Home's sheet (was a tab)
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

  // P-61: ＋ raises the field (was: the Log tab); after a log it goes away and focus is back on ＋; no bridge (was: the bridge above the slot).
  test('the card’s node is only shown: a line from the field goes nowhere unless chosen, then the field goes away', async ({ page }) => {
    await expect(card(page)).toHaveAccessibleName('What’s next, draw better hands, for make apparel: sketch a hand'); // P-50: with its path.
    await plus(page).click();
    // A tap on ＋ focuses the field; no chip came with the card.
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
    await expect(box(page)).toBeHidden();
    await expect(plus(page)).toBeFocused();
    await expect(bridge(page)).toHaveCount(0);
    // It went nowhere: it's under "No wander".
    await openSheet(page, 'Activities'); // P-58: a section of Home's sheet (was a tab)
    await page.getByRole('tab', { name: 'No wander' }).click();
    await expect(page.getByText('cooked dinner', { exact: true }).filter({ visible: true })).toBeVisible();
  });

  // P-61: typing opens the field (was: switches to Log); Esc on an empty line puts it away, focus on ＋.
  test('on web, typing with nothing editable focused opens the field and starts the line; Esc on an empty line puts it away', async ({ page }) => {
    await expect(page.locator('body')).toBeFocused();
    await page.keyboard.type('tuned');
    await expect(box(page)).toBeVisible();
    await expect(box(page)).toBeFocused();
    await expect(box(page)).toHaveValue('tuned');
    // Esc with words in the line leaves it open.
    await box(page).press('Escape');
    await expect(box(page)).toBeVisible();
    await box(page).fill('');
    await box(page).press('Escape');
    await expect(box(page)).toBeHidden();
    await expect(plus(page)).toBeFocused();
    // Shortcuts don't type.
    await page.keyboard.press('Control+a');
    await expect(box(page)).toBeHidden();
    // Typing into another field (the step field) stays there.
    await node(page, 'sew').click();
    await addOne(page).click();
    await page.keyboard.type('pin');
    await expect(page.getByRole('textbox', { name: 'What’s next for sew' })).toHaveValue('pin');
    await expect(box(page)).toBeHidden();
  });

  // P-50: the "Toward sew" row is gone; P-61: a tap attaches only while the field is open (was: tap, then the Log tab).
  test('Esc on the empty field keeps the focus and the attach; reopened, the field keeps the P-35 “to” chip', async ({ page }) => {
    await plus(page).click();
    await node(page, 'sew').click();
    await expect(page.getByRole('button', { name: 'To: sew. Remove', exact: true })).toBeVisible();
    await box(page).press('Escape');
    await expect(box(page)).toBeHidden();
    await expect(card(page)).toHaveAccessibleName('What’s next, sew, for make apparel');
    await expect(page.getByTestId('graph-selected-sew')).toBeVisible();
    await expect(page.getByTestId('home-slot').getByRole('button', { name: 'To: sew. Remove', exact: true, includeHidden: true })).toHaveCount(1);
    await plus(page).click();
    await expect(page.getByRole('button', { name: 'To: sew. Remove', exact: true })).toBeVisible();
  });

  test('while the page doesn’t hold the data (P-29), What’s next says so: ✓ is refused out loud, the step stays, and it clears once back', async ({ page }) => {
    await setVisibility(page, 'hidden');
    // The same line the field shows over its box, over the card.
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
    await expect(toast(page, 'Logged → draw better hands')).toBeVisible(); // P-61: was “Logged in draw better hands”
  });

  // P-61: the card with ＋, then the open field (was: both faces and the toggle).
  test('at 200 % zoom (195 px) the card and the open field have no serious accessibility violations and ＋ stays on screen', async ({ page }) => {
    await page.setViewportSize({ width: 195, height: 422 });
    await expect(card(page)).toBeVisible();
    await expect(plus(page)).toBeInViewport();
    await expect(check(page, 'sketch a hand')).toBeInViewport();
    await expectNoSeriousViolations(page);
    await plus(page).click();
    await expect(box(page)).toBeInViewport();
    await expectNoSeriousViolations(page);
  });
});

test.describe('with no wanders', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  // P-61: the field rests open above the card (was: the slot opens on Log with the toggle; What’s next behind a tab).
  test('the field rests open (unfocused) above the card, which has nothing staged, and a log keeps it open', async ({ page }) => {
    await page.goto('./');
    await expect(box(page)).toBeVisible();
    // Opening never focuses the field.
    await expect(box(page)).not.toBeFocused();
    await expect(card(page)).toHaveAccessibleName('What’s next: nothing staged');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p49-no-wanders.png` });
    await expectNoSeriousViolations(page);
    await box(page).fill('read a novel');
    await box(page).press('Enter');
    await expect(toast(page, 'Logged')).toBeVisible();
    await expect(box(page)).toBeVisible();
    await expect(box(page)).toHaveValue('');
    await expect(card(page)).toHaveAccessibleName('What’s next: nothing staged');
    await expectNoSeriousViolations(page);
  });

  // P-61: the field goes away (was: the slot flips to What’s next).
  test('once a log names a wander, the field goes away and the card is for it', async ({ page }) => {
    await page.goto('./');
    await box(page).fill('scales @play guitar');
    await page.getByRole('option', { name: /New wander “play guitar”/ }).click();
    await box(page).press('Enter');
    await expect(toast(page, 'Logged → play guitar')).toBeVisible(); // P-61: was “Logged → to play guitar”
    await expect(box(page)).toBeHidden();
    await expect(plus(page)).toBeVisible();
    await expect(card(page)).toHaveAccessibleName('What’s next, play guitar');
  });
});
