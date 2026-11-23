/** P-61 (D-11): ＋ to log — no toggle, the What's next card always shown, autocomplete and attach before logging, no bridge. */
import { AxeBuilder } from '@axe-core/playwright';
import { Page } from '@playwright/test';

import { expect, openSheet, test } from './fixtures';
import { legacyBlob, seedScript } from './graphFixture';

const SHOTS = process.env.E2E_SHOTS; // set to a folder to save screenshots for a visual check
const DAY = 864e5;
const BOX = 'What did you just do?';
const QUESTION = /Toward something|just itself/;

const plus = (page: Page) => page.getByRole('button', { name: 'Log something', exact: true });
// Home's own box, shown or not (these tests open it themselves; the fixtures' `logBox` would do it for them).
const box = (page: Page) => page.getByTestId('home-slot').locator(`input[aria-label="${BOX}"]`);
const card = (page: Page) => page.getByRole('region', { name: /^What’s next/ });
const list = (page: Page) => page.getByRole('listbox', { name: 'Suggestions' });
const option = (page: Page, name: string | RegExp) => list(page).getByRole('option', { name });
const toast = (page: Page, text: string) => page.getByText(text, { exact: true }).filter({ visible: true });
const node = (page: Page, id: string) => page.getByTestId(`graph-node-${id}`).filter({ visible: true });
const heat = async (page: Page, id: string) => Number(await node(page, id).getAttribute('data-heat'));

async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = serious.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => `${n.target.join(' ')} ${n.html.slice(0, 200)}`).slice(0, 5).join('\n  ')}`);
  expect(report, report.join('\n')).toEqual([]);
}

/**
 * The owner's Home (2026-11-23): feel productive (declared, last logged toward 3 days ago, so the card's
 * node) with the staged step "Clean my car"; draw feeds it; "cooked dinner" was last logged toward
 * draw, and before that toward nothing (a loose log).
 */
function owner() {
  const json = JSON.parse(
    legacyBlob(['feel productive', 'draw'], [
      { from: 'draw', to: ['feel productive'], text: 'sketched', daysAgo: 20 },
      { text: 'cooked dinner', daysAgo: 6 },
      { from: 'draw', text: 'cooked dinner', daysAgo: 4 },
      { to: ['feel productive'], text: 'made the bed', daysAgo: 3 },
    ]),
  );
  json.state.data.threads['feel productive'].declaredAt = new Date(Date.now() - 30 * DAY).toISOString();
  json.state.data.threads['feel productive'].next = 'Clean my car';
  return JSON.stringify(json);
}

async function open(page: Page) {
  await page.addInitScript(seedScript, owner());
  await page.goto('./');
  await expect(plus(page)).toBeVisible();
}

/** Opens the field with ＋ (focus goes in). */
async function raise(page: Page) {
  await plus(page).click();
  await expect(box(page)).toBeFocused();
}

test.describe('＋ to log', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test.beforeEach(async ({ page }) => open(page));

  test('no toggle: the card is always shown, with a round ＋ at its bottom-right that doesn’t cover ✓; ＋ raises the field with focus, Esc puts it away', async ({ page }) => {
    await expect(page.getByRole('tablist')).toHaveCount(0);
    await expect(page.getByRole('tab', { name: /What’s next|^Log$/ })).toHaveCount(0);
    await expect(card(page)).toContainText('What’s next · feel productive');
    await expect(card(page)).toContainText('Clean my car');
    await expect(box(page)).toBeHidden();
    const p = (await plus(page).boundingBox())!;
    const c = (await card(page).boundingBox())!;
    const check = (await page.getByRole('button', { name: 'Did it: Clean my car', exact: true }).boundingBox())!;
    expect(p.width).toBeGreaterThanOrEqual(56);
    expect(p.height).toBeGreaterThanOrEqual(56);
    // Bottom-right, beside the card's corner, clear of ✓.
    expect(p.x).toBeGreaterThan(c.x + c.width / 2);
    expect(p.y + p.height).toBeGreaterThan(c.y + c.height - 12);
    expect(p.x >= check.x + check.width || p.y >= check.y + check.height || p.x + p.width <= check.x).toBe(true);
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p61-rest.png` });

    await raise(page);
    await expect(box(page)).toBeVisible();
    // The field rises above the card, which stays.
    expect((await box(page).boundingBox())!.y).toBeLessThan((await card(page).boundingBox())!.y);
    await expect(card(page)).toBeVisible();
    await box(page).press('Escape');
    await expect(box(page)).toBeHidden();
    await expect(plus(page)).toBeFocused();
  });

  test('a tap outside with an empty line puts the field away; with words it stays', async ({ page }) => {
    await raise(page);
    await page.getByRole('heading', { name: 'Wanderment' }).click();
    await expect(box(page)).toBeHidden();
    await raise(page);
    await box(page).fill('half a thought');
    await page.getByRole('heading', { name: 'Wanderment' }).click();
    await expect(box(page)).toBeVisible();
    await expect(box(page)).toHaveValue('half a thought');
  });

  test('the owner’s scenario: "cle" offers the staged step; one tap fills, attaches and completes it; Log clears the step and warms feel productive', async ({ page }) => {
    const before = await heat(page, 'feel productive');
    await raise(page);
    await box(page).pressSequentially('cle');
    const step = option(page, /^Clean my car · feel productive/);
    await expect(step).toBeVisible();
    await expect(step).toContainText('✓');
    await expect(list(page).getByRole('option').first()).toHaveAccessibleName(/^Clean my car · feel productive/);
    for (const o of await list(page).getByRole('option').all()) expect((await o.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p61-suggestions.png` });

    await step.click();
    await expect(box(page)).toHaveValue('Clean my car');
    await expect(box(page)).toBeFocused();
    await expect(list(page)).toHaveCount(0);
    // Visible, removable chips: the step it completes and where it goes; and it's said.
    const done = page.getByRole('button', { name: 'Clean my car, next step in feel productive. This line counts as it. Remove', exact: true });
    await expect(done).toBeVisible();
    await expect(done).toContainText('✓ Clean my car');
    await expect(page.getByRole('button', { name: 'Doing: feel productive. Remove', exact: true })).toBeVisible();
    await expect(page.locator('[aria-live="polite"]').filter({ hasText: 'Logging it completes Clean my car' })).toHaveCount(1);

    await box(page).press('Enter');
    await expect(toast(page, 'Logged → feel productive')).toBeVisible();
    await expect(page.getByText(QUESTION)).toHaveCount(0);
    await expect(page.getByRole('group', { name: 'Attach what you just logged' })).toHaveCount(0);
    // The step is cleared (as ✓ does) and the field went away.
    await expect(card(page)).toHaveAccessibleName('What’s next, feel productive');
    await expect(card(page).getByRole('button', { name: /^add one/ })).toBeVisible();
    await expect(box(page)).toBeHidden();
    await expect(plus(page)).toBeFocused();
    await expect.poll(() => heat(page, 'feel productive')).toBeGreaterThan(before);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p61-logged.png` });

    // It's one activity, the step's words, doing feel productive; Undo brings the step back.
    await page.getByRole('button', { name: 'Undo' }).filter({ visible: true }).click();
    await expect(card(page)).toContainText('Clean my car');
  });

  test('removing the ✓ chip logs the words without completing the step', async ({ page }) => {
    await raise(page);
    await box(page).pressSequentially('clean');
    await option(page, /^Clean my car · feel productive/).click();
    await page.getByRole('button', { name: /^Clean my car, next step in feel productive.*Remove$/ }).click();
    await box(page).press('Enter');
    await expect(toast(page, 'Logged → feel productive')).toBeVisible();
    await expect(card(page)).toContainText('Clean my car');
  });

  test('a past entry fills its words and re-attaches where it last went; a node suggestion attaches', async ({ page }) => {
    await raise(page);
    await box(page).pressSequentially('coo');
    const past = option(page, /^cooked dinner · draw/);
    await expect(past).toBeVisible();
    // One per wording.
    await expect(list(page).getByRole('option', { name: /^cooked dinner/ })).toHaveCount(1);
    await past.click();
    await expect(box(page)).toHaveValue('cooked dinner');
    await expect(page.getByRole('button', { name: 'To: draw. Remove', exact: true })).toBeVisible();
    await box(page).press('Enter');
    await expect(toast(page, 'Logged → draw')).toBeVisible();

    await raise(page);
    await box(page).pressSequentially('feel');
    const n = option(page, /^feel productive, attach/);
    await expect(n).toContainText('→ feel productive');
    await n.click();
    // The words stay as typed; the node is a chip.
    await expect(box(page)).toHaveValue('feel');
    await expect(page.getByRole('button', { name: 'To: feel productive. Remove', exact: true })).toBeVisible();
    await box(page).fill('tidied the desk');
    await box(page).press('Enter');
    await expect(toast(page, 'Logged → feel productive')).toBeVisible();
  });

  test('Return logs exactly the typed line and never picks a suggestion; unattached, it shows in the loose strip, with no bridge or question', async ({ page }) => {
    await raise(page);
    await box(page).pressSequentially('cle');
    await expect(option(page, /^Clean my car/)).toBeVisible();
    await box(page).press('Enter');
    await expect(toast(page, 'Logged')).toBeVisible();
    await expect(card(page)).toContainText('Clean my car');

    await raise(page);
    await box(page).fill('watered the plants');
    await box(page).press('Enter');
    await expect(toast(page, 'Logged')).toBeVisible();
    await expect(page.getByText(QUESTION)).toHaveCount(0);
    await expect(page.getByRole('group', { name: 'Attach what you just logged' })).toHaveCount(0);
    const strip = page.getByRole('list', { name: 'Logs without a wander' });
    await expect(strip.getByRole('button', { name: 'watered the plants', exact: true })).toBeVisible();
    await expect(strip.getByRole('button', { name: 'cle', exact: true })).toBeVisible();
  });

  test('while the field is open a tap on a node attaches it (and says so); with it away a tap only focuses', async ({ page }) => {
    await node(page, 'draw').click();
    await expect(card(page)).toContainText('What’s next · draw');
    await raise(page);
    await expect(page.getByRole('button', { name: /^To: draw/ })).toHaveCount(0);
    await node(page, 'feel productive').click();
    await expect(page.getByRole('button', { name: 'To: feel productive. Remove', exact: true })).toBeVisible();
    await expect(box(page)).toBeFocused();
    await expect(page.getByTestId('home-focus-said')).toHaveText('Attached to feel productive');
    await box(page).fill('went for a run');
    await box(page).press('Enter');
    await expect(toast(page, 'Logged → feel productive')).toBeVisible();
    await openSheet(page, 'Activities');
    await expect(page.getByText('went for a run', { exact: true }).filter({ visible: true })).toBeVisible();
  });

  test('on web, typing with nothing editable focused opens the field with that character', async ({ page }) => {
    await expect(page.locator('body')).toBeFocused();
    await page.keyboard.type('tuned');
    await expect(box(page)).toBeVisible();
    await expect(box(page)).toBeFocused();
    await expect(box(page)).toHaveValue('tuned');
    // Shortcuts don't type.
    await box(page).fill('');
    await box(page).press('Escape');
    await page.keyboard.press('Control+a');
    await expect(box(page)).toBeHidden();
  });

  test('at 200 % zoom (195 px): ＋ and ✓ on screen, the field and its suggestions have no serious violations', async ({ page }) => {
    await page.setViewportSize({ width: 195, height: 422 });
    await expect(plus(page)).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Did it: Clean my car', exact: true })).toBeInViewport();
    await expectNoSeriousViolations(page);
    await raise(page);
    await box(page).pressSequentially('cle');
    await expect(option(page, /^Clean my car/)).toBeInViewport();
    await expectNoSeriousViolations(page);
  });
});

test('with no wanders the field rests open (unfocused) above the card; a log keeps it open', async ({ page }) => {
  await page.goto('./');
  await expect(box(page)).toBeVisible();
  await expect(box(page)).not.toBeFocused();
  await expect(card(page)).toHaveAccessibleName('What’s next: nothing staged');
  await box(page).fill('read a novel');
  await box(page).press('Enter');
  await expect(toast(page, 'Logged')).toBeVisible();
  await expect(box(page)).toBeVisible();
  await expect(page.getByText(QUESTION)).toHaveCount(0);
});
