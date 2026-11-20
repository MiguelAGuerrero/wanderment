import { expect, Page, test as base } from '@playwright/test';

/** Every test fails if the page throws an uncaught error. */
export const test = base.extend<{ errors: Error[] }>({
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

/** Opens the app on Home and waits until it has rendered. */
export async function openHome(page: Page) {
  await page.goto('./');
  await expect(page.getByText('Wanderment', { exact: true })).toBeVisible();
}
