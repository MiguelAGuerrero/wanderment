/** P-36: the first run, 1-2-3 — what it's all for, one next step toward it, the graph with both. */
import { AxeBuilder } from '@axe-core/playwright';
import { Page } from '@playwright/test';

import { expect, logBox, logLine, openHome, test } from './fixtures';
import { legacyBlob, seedScript } from './graphFixture';

const SHOTS = process.env.E2E_SHOTS; // set to a folder to save screenshots for a visual check

const step = (page: Page) => page.getByTestId('first-run');
const one = (page: Page) => page.getByRole('dialog', { name: 'What’s it all for?' });
const two = (page: Page) => page.getByRole('dialog', { name: 'One next step toward it?' });
const three = (page: Page) => page.getByRole('dialog', { name: /^There it is\./ });
const whyField = (page: Page) => page.getByRole('textbox', { name: 'What it’s all for' });
const skipOne = (page: Page) => one(page).getByRole('button', { name: 'Not sure yet? Skip — it can surface from what you do.', exact: true });
const offer = (page: Page) => page.getByRole('button', { name: '+ What’s it all for?', exact: true });
const nodes = (page: Page) => page.locator('[data-testid^="graph-node-"]').filter({ visible: true });

async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = serious.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => `${n.target.join(' ')} ${n.html.slice(0, 200)}`).slice(0, 5).join('\n  ')}`);
  expect(report, report.join('\n')).toEqual([]);
}

/** No field has focus: the keyboard never comes up by itself. */
const noFieldFocused = (page: Page) => page.evaluate(() => !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName ?? ''));

/** Every button in the step is at least 44 px tall. */
async function targetsAre44(page: Page) {
  for (const b of await step(page).getByRole('button').all()) expect((await b.boundingBox())!.height, await b.innerText()).toBeGreaterThanOrEqual(44);
}

test('the full path: what it’s all for → one next step → the graph with both, the log box ready', async ({ page }) => {
  await openHome(page);
  // ① On the empty graph, with feelings and reasons as examples; the log box stays as it is.
  await expect(one(page)).toBeVisible();
  for (const e of ['feel productive', 'feel calmer', 'be a better drawer']) await expect(one(page).getByRole('button', { name: e, exact: true })).toBeVisible();
  await expect(step(page)).not.toContainText(/goal|target|\d/i);
  await expect(offer(page)).toHaveCount(0);
  expect(await noFieldFocused(page)).toBe(true);
  await expect(logBox(page)).toBeEditable();
  await targetsAre44(page);
  await expectNoSeriousViolations(page);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p36-1-why.png` });

  // An example fills the field (without focusing it); Next declares it.
  await one(page).getByRole('button', { name: 'feel productive', exact: true }).click();
  await expect(whyField(page)).toHaveValue('feel productive');
  expect(await noFieldFocused(page)).toBe(true);
  await one(page).getByRole('button', { name: 'Next', exact: true }).click();

  // ② Focus moves to it (not to its field); it can wait, and mundane is welcome.
  await expect(two(page)).toBeFocused();
  await expect(two(page)).toContainText('It can wait');
  await expect(two(page)).toContainText('read a book');
  await expect(step(page)).not.toContainText(/goal|target|\d/i);
  await expect(nodes(page).filter({ hasText: /^feel productive$/ })).toHaveAttribute('data-kind', 'why');
  await targetsAre44(page);
  await expectNoSeriousViolations(page);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p36-2-next.png` });
  const stepField = page.getByRole('textbox', { name: 'One next step toward feel productive' });
  await stepField.fill('read a book');
  await stepField.press('Enter');

  // ③ The graph with both; focus on the step, which says what the picture shows; the log box ready.
  await expect(three(page)).toBeFocused();
  const summary = await page.getByTestId('home-graph-line').filter({ visible: true }).innerText();
  expect(summary).toContain('feel productive');
  await expect(three(page)).toHaveAccessibleName(`There it is. ${summary}`);
  await expect(three(page)).toContainText('It’s here whenever you get to it');
  await expect(page.getByTestId('graph-step-' + (await nodes(page).first().getAttribute('data-testid'))!.replace('graph-node-', ''))).toHaveText('↳ read a book');
  await expect(logBox(page)).toBeEditable();
  expect(await noFieldFocused(page)).toBe(true);
  await targetsAre44(page);
  await expectNoSeriousViolations(page);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p36-3-see.png` });

  // Done: the step goes, focus moves to the top of Home; never again.
  await three(page).getByRole('button', { name: 'Got it', exact: true }).click();
  await expect(step(page)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Wanderment' })).toBeFocused();
  await page.reload();
  await expect(logBox(page)).toBeVisible();
  await expect(nodes(page)).toHaveCount(1);
  await expect(step(page)).toHaveCount(0);
});

test('one Skip on ① ends the whole run, for good; “+ What’s it all for?” is there as before', async ({ page }) => {
  await openHome(page);
  await skipOne(page).click();
  await expect(step(page)).toHaveCount(0);
  await expect(offer(page)).toBeVisible();
  await expect(page.getByText('Log what you just did.')).toBeVisible();
  await page.reload();
  await expect(logBox(page)).toBeVisible();
  await expect(offer(page)).toBeVisible();
  await expect(step(page)).toHaveCount(0);
});

test('skipping ② still shows the graph (③), and Return on an empty field goes nowhere', async ({ page }) => {
  await openHome(page);
  await whyField(page).fill('feel calmer');
  await whyField(page).press('Enter');
  await expect(two(page)).toBeFocused();
  const stepField = page.getByRole('textbox', { name: 'One next step toward feel calmer' });
  await stepField.press('Enter');
  await expect(two(page)).toBeVisible();
  // Nothing typed: there's no Next, only Skip.
  await expect(two(page).getByRole('button', { name: 'Next' })).toHaveCount(0);
  await two(page).getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(three(page)).toBeFocused();
  await expect(page.locator('[data-testid^="graph-step-"]').filter({ visible: true })).toHaveCount(0);
  await expect(three(page)).toContainText('Whatever you log shows up here');
  await three(page).getByRole('button', { name: 'Got it', exact: true }).click();
  await expect(step(page)).toHaveCount(0);
});

test('logging during ① ends the run for good — even after Undo empties the app again', async ({ page }) => {
  await openHome(page);
  await expect(one(page)).toBeVisible();
  // Half-typed in ①: the log box still logs, as typed.
  await whyField(page).fill('feel');
  await logLine(page, 'went for a walk');
  await expect(step(page)).toHaveCount(0);
  await expect(logBox(page)).toHaveValue('');
  await page.getByRole('button', { name: 'Undo' }).filter({ visible: true }).click();
  await expect(page.getByText('Log what you just did.')).toBeVisible();
  await expect(step(page)).toHaveCount(0);
  await expect(offer(page)).toBeVisible();
  await page.reload();
  await expect(logBox(page)).toBeVisible();
  await expect(step(page)).toHaveCount(0);
});

test('logging during ② ends the run', async ({ page }) => {
  await openHome(page);
  await whyField(page).fill('be a better drawer');
  await whyField(page).press('Enter');
  await expect(two(page)).toBeVisible();
  await logLine(page, 'sketched a hand');
  await expect(step(page)).toHaveCount(0);
  // Undo takes the log back; the run stays over.
  await page.getByRole('button', { name: 'Undo' }).filter({ visible: true }).click();
  await expect(page.getByText('Logged', { exact: false }).filter({ visible: true })).toHaveCount(0);
  await expect(step(page)).toHaveCount(0);
});

test('logging at ③ ends the run', async ({ page }) => {
  await openHome(page);
  await whyField(page).fill('feel calmer');
  await whyField(page).press('Enter');
  const stepField = page.getByRole('textbox', { name: 'One next step toward feel calmer' });
  await stepField.fill('read a book');
  await stepField.press('Enter');
  await expect(three(page)).toBeVisible();
  await logLine(page, 'read a book');
  await expect(step(page)).toHaveCount(0);
  await page.reload();
  await expect(logBox(page)).toBeVisible();
  await expect(step(page)).toHaveCount(0);
});

test('② stays put as the picture catches up: words typed the moment it appears are kept', async ({ page }) => {
  await openHome(page);
  // Types into ②'s field as soon as it's on the page: before the picture (drawn a moment after the
  // data, `useDeferredValue`) shows the new why. ② used to be mounted again then, emptying its field.
  await page.evaluate(() => {
    new MutationObserver((_, observer) => {
      const field = document.querySelector<HTMLInputElement>('input[aria-label="One next step toward feel calmer"]');
      if (!field) return;
      observer.disconnect();
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, 'read a book');
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }).observe(document.body, { childList: true, subtree: true });
  });
  await whyField(page).fill('feel calmer');
  await whyField(page).press('Enter');
  // The picture has caught up: it shows the why.
  await expect(page.getByRole('img', { name: /feel calmer/ })).toBeVisible();
  const stepField = page.getByRole('textbox', { name: 'One next step toward feel calmer' });
  await expect(stepField).toHaveValue('read a book');
  await stepField.press('Enter');
  await expect(three(page)).toBeVisible();
});

test('only on an empty app: logs or wanders already there, no first run', async ({ page }) => {
  await page.addInitScript(seedScript, legacyBlob([], [{ text: 'read a chapter', daysAgo: 1 }]));
  await openHome(page);
  await expect(page.locator('[data-testid^="graph-dot-"]').filter({ visible: true })).toHaveCount(1);
  await expect(step(page)).toHaveCount(0);
  await expect(offer(page)).toBeVisible();
});
