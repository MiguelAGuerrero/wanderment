import { expect, Locator, Page, test as base } from '@playwright/test';
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

const LOG_BOX = 'What did you just do?';

// Visible only: tabs stay mounted, so right after a tab switch the other tab's (hidden) log box can
// still match first.
const visibleLogBox = (page: Page) => page.getByRole('textbox', { name: LOG_BOX }).filter({ visible: true });

/** P-49: Home's own log box, shown (the Log face) or not. */
const homeLogBox = (page: Page) => page.getByTestId('home-slot').locator(`input[aria-label="${LOG_BOX}"]`);

/** P-49: a tab of the toggle under Home's slot ("What’s next" or "Log"). */
export const slotTab = (page: Page, name: 'What’s next' | 'Log') => page.getByRole('tab', { name, exact: true }).filter({ visible: true });

/**
 * P-49: on Home the log box is the slot's Log face. Getting to it is navigation (like `toHome`): once
 * a log box or Home's toggle is there, if it's the toggle, tap "Log" (which focuses the box) and let
 * go of focus again, so a test's own focus checks stay about what the app did.
 */
export async function showLogFace(page: Page, timeout?: number) {
  if (!(await onWhatsNext(page, timeout))) return;
  const box = visibleLogBox(page);
  await slotTab(page, 'Log').click();
  await expect(box).toBeFocused();
  await box.evaluate((el) => (el as HTMLElement).blur());
}

/** Waits until a log box or Home's toggle is there; true when it's Home on its What's next face. */
async function onWhatsNext(page: Page, timeout?: number) {
  const box = visibleLogBox(page);
  await expect(box.or(slotTab(page, 'Log')).first()).toBeVisible({ timeout });
  return (await box.count()) === 0;
}

/** Locator methods that use the box (so on Home they go to the Log face first). */
const USES_BOX = new Set(['fill', 'press', 'pressSequentially', 'type', 'click', 'tap', 'dblclick', 'focus', 'clear', 'selectText', 'boundingBox', 'evaluate', 'inputValue', 'screenshot', 'scrollIntoViewIfNeeded']);
/** Assertions about the box being there (a `not.` one never switches). */
const EXPECTS_BOX = new Set(['to.be.visible', 'to.be.editable', 'to.be.enabled', 'to.be.in.viewport']);
/** Assertions that hold for Home's box as it is, shown or not: its line, and whether it has focus (it can't while out of sight). */
const AS_IT_IS = new Set(['to.have.value', 'to.be.focused']);

/**
 * The visible log box. On Home (P-49) it's the Log face of the slot: anything that uses it, or expects
 * it to be there, switches to that face first (`showLogFace`); its line and focus are checked as they
 * are, without switching.
 */
export const logBox = (page: Page): Locator =>
  new Proxy(visibleLogBox(page), {
    get(target, prop) {
      const value = Reflect.get(target, prop, target);
      if (typeof value !== 'function') return value;
      if (typeof prop === 'string' && USES_BOX.has(prop)) {
        return async (...args: unknown[]) => {
          await showLogFace(page);
          return value.apply(target, args);
        };
      }
      if (prop === '_expect') {
        return async (expression: string, options?: { isNot?: boolean; timeout?: number }) => {
          if (AS_IT_IS.has(expression) && (await onWhatsNext(page, options?.timeout))) {
            return (homeLogBox(page) as unknown as { _expect: typeof value })._expect(expression, options);
          }
          if (!options?.isNot && EXPECTS_BOX.has(expression)) await showLogFace(page, options?.timeout);
          return value.call(target, expression, options);
        };
      }
      return value.bind(target);
    },
  });

/** Types into the log box and presses Return. */
export async function logLine(page: Page, text: string) {
  const box = logBox(page);
  await box.fill(text);
  await box.press('Enter');
}

/**
 * Opens the app on Home and waits until data has loaded (the blocked screen has no log box). P-49:
 * Home opens on its slot's What's next face (Log while there are no wanders), so either shows it.
 */
export async function openHome(page: Page) {
  await page.goto('./');
  await expect(visibleLogBox(page).or(slotTab(page, 'Log')).first()).toBeVisible();
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
  // P-49: Home's own box is in its slot (shown or not); every other tab's box is gone.
  await expect(slotTab(page, 'Log')).toBeVisible();
  await expect(page.locator(`input[aria-label="${LOG_BOX}"]:not([data-testid="home-slot"] *)`).filter({ visible: true })).toHaveCount(0);
}
