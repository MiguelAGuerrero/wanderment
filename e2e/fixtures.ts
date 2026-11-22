import { expect, Page, test as base } from '@playwright/test';
import { randomUUID } from 'node:crypto';

/** Every test fails if the page throws an uncaught error. */
export const test = base.extend<{ errors: Error[]; swScope: string }>({
  // A test's simulated deploys (`request.post('/__e2e/bump-sw')`, e2e/serve.mjs) reach only its own
  // pages: its context and its `request` share one cookie.
  swScope: [
    async ({ context }, use) => {
      const scope = randomUUID();
      await context.addCookies([{ name: 'e2e-scope', value: scope, domain: 'localhost', path: '/' }]);
      await use(scope);
    },
    { auto: true },
  ],
  request: [
    async ({ context }, use) => {
      await use(context.request);
    },
    { scope: 'test' },
  ],
  errors: [
    async ({ page }, use) => {
      const errors: Error[] = [];
      page.on('pageerror', (e) => errors.push(e));
      await use(errors);
      expect(errors, errors.map((e) => e.stack ?? e.message).join('\n\n')).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

// Visible only: tabs stay mounted, so right after a tab switch the other tab's (hidden) log box can
// still match first.
export const logBox = (page: Page) => page.getByRole('textbox', { name: 'What did you just do?' }).filter({ visible: true });

/** Types into the log box and presses Return. */
export async function logLine(page: Page, text: string) {
  const box = logBox(page);
  await box.fill(text);
  await box.press('Enter');
}

/** Opens the app on Home and waits until data has loaded (the blocked screen has no log box). */
export async function openHome(page: Page) {
  await page.goto('./');
  await expect(logBox(page)).toBeVisible();
}

/** P-34: opens the Wanders tab (the list of cards that was Home before the graph) once data has loaded. */
export async function openWanders(page: Page) {
  await page.goto('./wanders');
  await expect(logBox(page)).toBeVisible();
}

/** Switches to the Home tab and waits until the previous tab's screen (and its log box) is gone. */
export async function toHome(page: Page) {
  await page.getByRole('tab', { name: 'Home' }).click();
  await expect(page.getByRole('heading', { name: 'Wanderment', level: 1 }).filter({ visible: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'What did you just do?' }).filter({ visible: true })).toHaveCount(1);
}
