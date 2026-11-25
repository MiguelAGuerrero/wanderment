/**
 * P-93: Plan on a phone with the keyboard up. The owner, on an iPhone: the step just added and the
 * field being typed in fell out of view behind the notice and the filled button, and the add row's ↵
 * did not read as "add".
 *
 * The keyboard is emulated as a phone's browser does it (iOS Safari, the installed web app): the
 * layout viewport keeps its height and `visualViewport` shrinks — here to 55 % of it — while a field
 * has the focus, and grows back once none has after a tap ends (as on a phone). It proves the layout against that shrink, not a real
 * on-screen keyboard (or iOS scrolling the page itself). "200 % text" is the 195×422 window the other
 * specs use (what 200 % zoom gives a 390×844 phone).
 */
import { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { arrived, MAYA, plan, RoutineSpec, startGo } from './goFixture';

const TEST: RoutineSpec = { id: 'test', name: 'Test out the app', steps: ['Select a feature to test', 'Vibe check', 'Write down concerns'], repeatFrom: 1 };
/** Left in Plan on "Vibe check": Plan has its notice slot and its filled button (Resume at Vibe check). */
const PLANNING = [{ id: 'r1', routine: 'test', at: 1, round: 2, status: 'paused' as const, mode: 'plan' as const }];
const KEYBOARD = 0.45;

/** From now on (this page load), a phone keyboard takes `share` of the height while a field has the focus. */
async function phoneKeyboard(page: Page, share = KEYBOARD) {
  await page.evaluate((share) => {
    const target = new EventTarget();
    let up = false;
    const vv = {
      get width() {
        return innerWidth;
      },
      get height() {
        return Math.round(innerHeight * (up ? 1 - share : 1));
      },
      offsetTop: 0,
      offsetLeft: 0,
      pageTop: 0,
      pageLeft: 0,
      scale: 1,
      addEventListener: target.addEventListener.bind(target),
      removeEventListener: target.removeEventListener.bind(target),
    };
    Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => vv });
    const typing = () => {
      const el = document.activeElement;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
    };
    const set = (now: boolean) => {
      if (now === up) return;
      up = now;
      target.dispatchEvent(new Event('resize'));
      // (Listeners already on the real one hear the window's.)
      window.dispatchEvent(new Event('resize'));
    };
    // A phone takes the focus from a field when a tap ENDS (its mouse events follow the touch), so its
    // keyboard goes down after the press; a desktop mouse moves the focus on the press. As a phone.
    let pressing = false;
    const later = () => setTimeout(() => !pressing && set(typing()), 50);
    document.addEventListener('pointerdown', () => (pressing = true), true);
    document.addEventListener('pointerup', () => ((pressing = false), later()), true);
    document.addEventListener('focusin', () => typing() && set(true));
    // Moving from one field to the next keeps the keyboard up.
    document.addEventListener('focusout', later);
    set(typing());
  }, share);
}

/**
 * `l` is whole inside what can be seen of Plan's list (inside the list, inside the visual viewport),
 * and neither the notice nor the filled button covers it.
 */
async function seen(page: Page, l: Locator, what: string) {
  await expect(async () => {
    const box = (await l.boundingBox())!;
    expect(box, what).not.toBeNull();
    const room = await page.evaluate(() => {
      const vv = window.visualViewport!;
      const list = document.querySelector('[data-testid="go-plan-list"]')!.getBoundingClientRect();
      return { top: Math.max(vv.offsetTop, list.top), bottom: Math.min(vv.offsetTop + vv.height, list.bottom), vv: vv.height };
    });
    expect(box.y, `${what}: top`).toBeGreaterThanOrEqual(room.top - 0.5);
    expect(box.y + box.height, `${what}: bottom (visible to ${room.bottom}, keyboard leaves ${room.vv})`).toBeLessThanOrEqual(room.bottom + 0.5);
    const p = plan(page);
    for (const [name, cover] of [
      ['the notice', p.notice],
      ['the filled button', p.forward],
    ] as const) {
      if (!(await cover.isVisible())) continue;
      const c = (await cover.boundingBox())!;
      const apart = c.y >= box.y + box.height - 0.5 || c.y + c.height <= box.y + 0.5;
      // Covering: both on screen at once, overlapping.
      const onScreen = c.y < room.bottom && c.y + c.height > room.top;
      expect(apart || !onScreen, `${what} is covered by ${name}`).toBe(true);
    }
  }).toPass({ timeout: 5000 });
}

const addRow = (page: Page) => plan(page).add.locator('xpath=..');
const STEPS = ['Get rid of clutter', 'Wipe seats', 'Car wash', 'Vacuum the mats', 'Clean the windows', 'Polish the dash', 'Empty the boot'];

for (const [label, size] of [
  ['390×844', { width: 390, height: 844 }],
  ['200 % text (195×422)', { width: 195, height: 422 }],
] as const) {
  test(`${label}, keyboard up: after every add, the step just added and the add field are in view, never under the notice or the filled button`, async ({ page }) => {
    await page.setViewportSize(size);
    await startGo(page, PLANNING, 'plan', [TEST, ...MAYA]);
    await phoneKeyboard(page);
    const p = plan(page);
    await p.add.click();
    await expect(p.add).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.visualViewport!.height)).toBe(Math.round(size.height * (1 - KEYBOARD)));
    await seen(page, p.add, 'the add field, on focus');
    for (const words of STEPS) {
      await p.add.fill(words);
      await p.add.press('Enter');
      await expect(p.row(words)).toHaveCount(1);
      await expect(p.add).toBeFocused();
      await expect(p.notice).toContainText(`Added “${words}”`);
      await seen(page, p.row(words), `“${words}”, just added`);
      await seen(page, p.add, `the add field, after “${words}”`);
    }
    // The Undo stays in reach (scrolled to), and works.
    await p.undo.scrollIntoViewIfNeeded();
    await expect(p.undo).toBeInViewport();
    await p.undo.click();
    await expect(p.row('Empty the boot')).toHaveCount(0);
  });

  test(`${label}, keyboard up: Add a step after a row mid-list — each Return, the new step and the field are in view; Change the words mid-list is in view`, async ({ page }) => {
    await page.setViewportSize(size);
    await startGo(page, PLANNING, 'plan', [{ ...TEST, steps: [...TEST.steps, ...STEPS] }, ...MAYA]);
    await phoneKeyboard(page);
    const p = plan(page);
    // Change the words, mid-list.
    await p.more('Car wash').click();
    await (await arrived(page, 'go-plan-menu')).getByRole('button', { name: 'Change the words', exact: true }).click();
    await expect(p.typed).toBeFocused();
    await seen(page, p.typed, 'the words being changed');
    await p.typed.fill('Car wash, outside');
    await p.typed.press('Enter');
    await expect(p.row('Car wash, outside')).toHaveCount(1);
    // Add a step after, mid-list: each Return adds one and opens the next.
    await p.more('Wipe seats').click();
    await (await arrived(page, 'go-plan-menu')).getByRole('button', { name: 'Add a step after', exact: true }).click();
    for (const words of ['Dry the seats', 'Check the belts', 'Shake the rugs']) {
      await expect(p.typed).toBeFocused();
      await seen(page, p.typed, `the field, before “${words}”`);
      await p.typed.fill(words);
      await p.typed.press('Enter');
      await expect(p.row(words)).toHaveCount(1);
      await seen(page, p.row(words), `“${words}”, just added`);
      await seen(page, p.typed, `the field, after “${words}”`);
    }
  });
}

test('the add row reads as "add": a leading +, the placeholder "Add a step"; its button is the word Add (spoken "Add this step"), not ↵, ≥ 48 px, there only with words', async ({ page }) => {
  await startGo(page, PLANNING, 'plan', [TEST, ...MAYA]);
  const p = plan(page);
  const row = addRow(page);
  await expect(p.add).toHaveAttribute('placeholder', 'Add a step');
  await expect(p.add).toHaveAccessibleName('Add a step');
  // A leading + (the add mark), decorative: the row is the target.
  const plus = row.locator('svg:has(path[d="M12 4v16M4 12h16"])');
  await expect(plus).toHaveCount(1);
  await expect(plus).toHaveAttribute('aria-hidden', 'true');
  const plusBox = (await plus.boundingBox())!;
  expect(plusBox.x).toBeLessThan((await p.add.boundingBox())!.x);
  // No ↵ anywhere in the row.
  await expect(row.locator('path[d="M20 5v8H6M10 9l-4 4 4 4"]')).toHaveCount(0);
  const add = row.getByRole('button', { name: 'Add this step', exact: true });
  await expect(add).toHaveCount(0);
  await p.add.fill('Write it up');
  await expect(add).toBeVisible();
  await expect(add).toHaveText('Add');
  const b = (await add.boundingBox())!;
  expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(48);
  // A pointer adds too, and the field keeps the focus.
  await add.click();
  await expect(p.row('Write it up')).toHaveCount(1);
  await expect(p.add).toHaveValue('');
  await expect(p.add).toBeFocused();
  await expect(add).toHaveCount(0);
});
