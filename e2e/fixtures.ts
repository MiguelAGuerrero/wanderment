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

// Visible only: the sheet's sections stay mounted (P-58), so right after a switch the other one's
// (hidden) log box can still match first.
const visibleLogBox = (page: Page) => page.getByRole('textbox', { name: LOG_BOX }).filter({ visible: true });

/** P-49: Home's own log box, shown (its field open, P-61) or not. */
const homeLogBox = (page: Page) => page.getByTestId('home-slot').locator(`input[aria-label="${LOG_BOX}"]`);

/** P-61: Home's round ＋ ("Log something"), there while its log field is away. */
export const logPlus = (page: Page) => page.getByRole('button', { name: 'Log something', exact: true }).filter({ visible: true });

/**
 * P-61 (was P-49's Log face): on Home the log box is the field the ＋ raises. Getting to it is
 * navigation (like `toHome`): once a log box or Home's ＋ is there, if it's the ＋, tap it (which
 * focuses the box) and let go of focus again — without the field going away, as a tap outside would —
 * so a test's own focus checks stay about what the app did.
 */
export async function showLogFace(page: Page, timeout?: number) {
  if (!(await onWhatsNext(page, timeout))) return;
  const box = visibleLogBox(page);
  await logPlus(page).click();
  await expect(box).toBeFocused();
  // A blur with an empty line puts the field away (P-61): this one is the test's, not the person's.
  await box.evaluate((el) => {
    const stop = (e: Event) => e.stopImmediatePropagation();
    el.addEventListener('blur', stop, { capture: true, once: true });
    el.addEventListener('focusout', stop, { capture: true, once: true });
    (el as HTMLElement).blur();
  });
}

/** Waits until a log box or Home's ＋ is there; true when it's Home with its log field away. */
async function onWhatsNext(page: Page, timeout?: number) {
  const box = visibleLogBox(page);
  await expect(box.or(logPlus(page)).first()).toBeVisible({ timeout });
  return (await box.count()) === 0;
}

/** Locator methods that use the box (so on Home they open its field first). */
const USES_BOX = new Set(['fill', 'press', 'pressSequentially', 'type', 'click', 'tap', 'dblclick', 'focus', 'clear', 'selectText', 'boundingBox', 'evaluate', 'inputValue', 'screenshot', 'scrollIntoViewIfNeeded']);
/** Assertions about the box being there (a `not.` one never opens it). */
const EXPECTS_BOX = new Set(['to.be.visible', 'to.be.editable', 'to.be.enabled', 'to.be.in.viewport']);
/** Assertions that hold for Home's box as it is, shown or not: its line, and whether it has focus (it can't while out of sight). */
const AS_IT_IS = new Set(['to.have.value', 'to.be.focused']);

/**
 * The visible log box. On Home (P-61) it's the field the ＋ raises: anything that uses it, or expects
 * it to be there, opens it first (`showLogFace`); its line and focus are checked as they are, without
 * opening it.
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
 * Opens the app on Home and waits until data has loaded (the blocked screen has no log box). P-61:
 * Home opens with its log field away (open while there are no wanders), so the box or ＋ shows it.
 */
export async function openHome(page: Page) {
  await page.goto('./map'); // P-65: graph moved to Map
  await expect(visibleLogBox(page).or(logPlus(page)).first()).toBeVisible();
}

/** P-58: the sheet pulled up from Home's handle (Wanders | Activities). */
const sheet = (page: Page) => page.getByRole('dialog', { name: 'Wanders and activities', exact: true });

/**
 * P-58: opens Home's sheet on a section (Wanders or Activities, which were tabs) — from the handle
 * when it's away, with its tab when it's out — and waits until it's out and at rest (Home's slot out
 * of sight under it).
 */
export async function openSheet(page: Page, section: 'Wanders' | 'Activities') {
  const tab = sheet(page).getByRole('tab', { name: section, exact: true });
  await expect(sheet(page).or(page.getByRole('button', { name: 'Wanders and activities', exact: true })).first()).toBeVisible();
  if (!(await sheet(page).isVisible())) await page.getByRole('button', { name: 'Wanders and activities', exact: true }).click();
  await expect(tab).toBeVisible();
  if ((await tab.getAttribute('aria-selected')) !== 'true') await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('home-slot')).toBeHidden();
}

/** P-34/P-58: opens the Wanders list (the cards that were Home before the graph) once data has loaded: /wanders opens Home's sheet on it. */
export async function openWanders(page: Page) {
  await page.goto('./wanders');
  await expect(sheet(page).getByRole('tab', { name: 'Wanders', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(logBox(page)).toBeVisible();
}

/** Back to Home (P-58: puts its sheet away, as the Home tab did) and waits until the sheet's screen (and its log box) is gone. */
export async function toHome(page: Page) {
  if (await sheet(page).isVisible()) await sheet(page).getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Wanderment', level: 1 }).filter({ visible: true })).toBeVisible();
  // P-61: Home's own box is in its slot (shown or not); every other box is gone.
  await expect(page.getByTestId('home-slot').filter({ visible: true })).toBeVisible();
  await expect(page.locator(`input[aria-label="${LOG_BOX}"]:not([data-testid="home-slot"] *)`).filter({ visible: true })).toHaveCount(0);
}
