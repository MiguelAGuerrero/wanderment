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

export const logBox = (page: Page) => page.getByRole('textbox', { name: 'What did you just do?' });

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
