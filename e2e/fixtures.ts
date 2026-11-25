import { expect, Locator, Page, test as base } from '@playwright/test';
import { randomUUID } from 'node:crypto';

/** Every test fails if the page throws an uncaught error. */
export const test = base.extend<{ errors: Error[]; swScope: string; cpu: void }>({
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
  // E2E_SLOW=<rate> slows the page's CPU (Chrome DevTools throttling) to CI-runner speed or worse, so
  // timing races that pass on a fast machine show up before a push (scripts/polish/verify.sh's
  // "e2e-ci-like" step). Off by default.
  cpu: [
    async ({ page }, use) => {
      const rate = Number(process.env.E2E_SLOW || 0);
      if (rate > 1) {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate });
      }
      await use();
    },
    { auto: true },
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

const LOG_BOX = 'What did you just do?';

/**
 * The visible log box ("What did you just do?"). P-83: Map (with its What's next card and ＋) is
 * retired; the box is a section's of the home's sheet (Wanders or Activities), or a wander's page's.
 * Visible only: the sheet's sections stay mounted (P-58), so right after a switch the other one's
 * (hidden) log box can still match first.
 */
export const logBox = (page: Page): Locator => page.getByRole('textbox', { name: LOG_BOX }).filter({ visible: true });

/** Types into the log box and presses Return. */
export async function logLine(page: Page, text: string) {
  const box = logBox(page);
  await box.fill(text);
  await box.press('Enter');
}

/**
 * Opens the app where a log box is and waits until data has loaded (the blocked screen has none).
 * P-83: Map is retired, so this is the home with its sheet out on Activities (`/activities`), whose log
 * box logs with a toast as Map's did.
 */
export async function openHome(page: Page) {
  await page.goto('./activities');
  await expect(logBox(page)).toBeVisible();
}

/** P-58: the sheet pulled up from Home's handle (Wanders | Activities). */
const sheet = (page: Page) => page.getByRole('dialog', { name: 'Wanders and activities', exact: true });

/**
 * P-58/P-83: opens the home's sheet on a section (Wanders or Activities) — from the grabber when it's
 * away, with its tab when it's out — and waits until it's out on that section.
 */
export async function openSheet(page: Page, section: 'Wanders' | 'Activities') {
  const tab = sheet(page).getByRole('tab', { name: section, exact: true });
  await expect(sheet(page).or(page.getByRole('button', { name: 'Wanders and activities', exact: true })).first()).toBeVisible();
  if (!(await sheet(page).isVisible())) await page.getByRole('button', { name: 'Wanders and activities', exact: true }).click();
  await expect(tab).toBeVisible();
  if ((await tab.getAttribute('aria-selected')) !== 'true') await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  // The grabber is in the home, which is inert under the open sheet (so not a role in the tree then): by its test id.
  await expect(page.getByTestId('home-sheet-handle')).toHaveAttribute('aria-expanded', 'true');
  // At rest: the home's composer is out of sight under it (was: Map's slot hidden), so only the sheet's own words are there.
  await expect(page.getByTestId('field-box')).toHaveCount(0);
}

/** P-34/P-58: opens the Wanders list (the cards that were Home before the graph) once data has loaded: /wanders opens Home's sheet on it. */
export async function openWanders(page: Page) {
  await page.goto('./wanders');
  await expect(sheet(page).getByRole('tab', { name: 'Wanders', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(logBox(page)).toBeVisible();
}

/**
 * P-88: the old home's own address (`/` opens the new app, `/go`) — where the old app's specs start,
 * and what the location is when the old home is at rest.
 */
export const OLD = './old';
export const AT_OLD = /\/wanderment\/old$/;

/** The home's field (P-79): the composer's, named by the question. */
export const PROMPT = 'Where are we wandering today?';

/** Back to the home (P-58: puts its sheet away) and waits until the sheet's screen (and its log box) is gone and the home's field is there. */
export async function toHome(page: Page) {
  if (await sheet(page).isVisible()) await sheet(page).getByRole('button', { name: 'Close', exact: true }).click();
  await expect(sheet(page)).toBeHidden();
  await expect(page.getByRole('textbox', { name: PROMPT, exact: true })).toBeVisible();
  await expect(page.locator(`input[aria-label="${LOG_BOX}"]`).filter({ visible: true })).toHaveCount(0);
}
