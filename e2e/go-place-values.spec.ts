/**
 * P-110: values follow the place; Plan shows given values; "Last ran"; "@" across spaces. The owner's own routine
 * ("Iterate on the app": "Envision how I’d expect {feature} to work" before "Pick a feature", which gives it; a row
 * "@Document Iteration" typed as words) and their words: "the place where you are … establishes this as the intended
 * or expected state at that point in terms of values declared"; "not displaying placeholders if those values aren't
 * supplied"; "the word last" → "Last ran"; "I tried to reference a routine but it didn't work".
 * At 390×844 and at 200 % text (195×422).
 */
import { AxeBuilder } from '@axe-core/playwright';
import { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { arrived, goBackup, home, importBackup, menuItems, plan, RoutineSpec, runner, settled, tile, typeValue, editPlan } from './goFixture';

const SHOTS = '.polish/current/P-110/shots';
const PAPER = 'rgb(244, 241, 232)';

const DOC: RoutineSpec = { id: 'doc', name: 'Document Iteration', home: false, steps: ['Write down what changed', 'Note what is next'] };
const ITERATE: RoutineSpec = { id: 'iterate', name: 'Iterate on the app', steps: ['Envision how I’d expect {feature} to work', { text: 'Pick a feature', gives: 'feature' }, 'Build {feature}', '@Document Iteration', 'Ship it'] };

async function noSerious(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}
/** Targets ≥ 48 px inside the window, text ≥ 16 px and never cut, every control named (with its visible words), at most one filled button. */
async function rules(page: Page, scope: Locator) {
  const found = await scope.evaluate((root, paper) => {
    const shown = (e: Element) => {
      const b = e.getBoundingClientRect();
      return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[inert]');
    };
    const controls = [...root.querySelectorAll('button, [role="button"], [role="menuitem"], input, textarea')].filter((e) => shown(e) && !e.hasAttribute('data-sr-close'));
    const name = (e: Element) => e.getAttribute('aria-label') || (e as HTMLElement).innerText || (e as HTMLInputElement).placeholder || '';
    const texts = [...root.querySelectorAll('*')].filter((e) => shown(e) && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()));
    const seen = texts.filter((e) => e.getBoundingClientRect().width > 2);
    return {
      small: controls.filter((e) => { const b = e.getBoundingClientRect(); return b.width < 47.5 || b.height < 47.5; }).map(name),
      outside: controls.filter((e) => { const b = e.getBoundingClientRect(); return b.left < -0.5 || b.right > innerWidth + 0.5; }).map(name),
      unnamed: controls.filter((e) => !name(e).trim()).length,
      tiny: texts.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => e.textContent!.slice(0, 30)),
      cut: seen.filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible').map((e) => e.textContent!.slice(0, 30)),
      past: seen.filter((e) => e.getBoundingClientRect().right > innerWidth + 0.5).map((e) => e.textContent!.slice(0, 30)),
      filled: controls.filter((e) => getComputedStyle(e).backgroundColor === paper && e.getAttribute('aria-disabled') !== 'true').map(name),
      label: controls.filter((e) => { const l = e.getAttribute('aria-label'); const v = ((e as HTMLElement).innerText ?? '').trim().replace(/\s+/g, ' '); return !!l && !!v && !['INPUT', 'TEXTAREA'].includes(e.tagName) && !l.toLowerCase().includes(v.toLowerCase()); }).map(name),
    };
  }, PAPER);
  expect(found.small, 'targets under 48 px').toEqual([]);
  expect(found.outside, 'controls outside the window').toEqual([]);
  expect(found.unnamed, 'unnamed controls').toBe(0);
  expect(found.tiny, 'text under 16 px').toEqual([]);
  expect(found.cut, 'words cut').toEqual([]);
  expect(found.past, 'words past the window').toEqual([]);
  expect(found.filled.length, `filled: ${found.filled.join(', ')}`).toBeLessThanOrEqual(1);
  expect(found.label, 'names that leave out the visible words').toEqual([]);
}
const planOf = async (page: Page, id: string) => {
  await page.goto(`./go/routine/${id}`);
  await expect(settled(page, 'plan')).toBeVisible();
  // (P-115, rewritten: Plan opens read-only — these specs edit it, so its opener enters Edit.)
  await editPlan(page);
  return plan(page);
};
/** The runner's panel: Jump to… a step by its row's name. */
async function jumpTo(page: Page, step: string) {
  const r = runner(page);
  await r.handle.click();
  await r.panel.getByRole('button', { name: 'Jump to…', exact: true }).click();
  const j = settled(page, 'jump');
  await j.getByRole('radio', { name: step, exact: true }).click();
  await j.getByTestId('go-jump-here').click();
  await expect(settled(page, 'runner')).toBeVisible();
}

for (const [label, size] of [
  ['390×844', { width: 390, height: 844 }],
  ['200 % text (195×422)', { width: 195, height: 422 }],
] as const) {
  test.describe(`at ${label}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(size);
    });

    test('values follow the place: never asked ahead, no placeholders; Plan from the run and "Resume at …" show the value; a Jump back clears it, said, with Undo; home reads "Last ran"', async ({ page }) => {
      await importBackup(page, goBackup([ITERATE, DOC], [{ id: 'run1', routine: 'iterate', at: 0, status: 'running' }]));
      await page.goto('./go/run/run1');
      const r = runner(page);
      // The reader before its giving step: no field asks for {feature}; its words as written; nothing in the values row.
      await expect(r.words).toHaveText('Envision how I’d expect {feature} to work');
      await expect(r.fields).toHaveCount(0);
      await expect(r.values).toHaveCount(0);
      await expect(r.screen.getByTestId('go-value-missing')).toHaveCount(0);
      // At its giving step it is asked.
      await r.next.click();
      await expect(r.words).toHaveText('Pick a feature');
      await typeValue(page, 'feature', 'checkout');
      await r.next.click();
      await expect(r.words).toHaveText('Build checkout');
      await expect(r.values).toHaveText(['feature: checkout']);

      // Plan from the run: the value in place of {feature} in the steps' words, and in "Resume at …".
      await r.plan.click();
      const p = plan(page);
      await expect(p.back).toBeVisible();
      await expect(p.row('Build {feature}').getByTestId('go-plan-words')).toHaveText('Build checkout');
      await expect(p.row('Build {feature}').getByTestId('go-plan-value')).toHaveText('checkout');
      await expect(p.row('Envision how I’d expect {feature} to work').getByTestId('go-plan-words')).toHaveText('Envision how I’d expect checkout to work');
      await expect(p.here).toHaveAccessibleName('Here, Build checkout');
      await expect(p.forward).toHaveText('Resume at Build checkout');
      await noSerious(page);
      await rules(page, p.screen);
      await page.screenshot({ path: `${SHOTS}/plan-from-run${size.width > 300 ? '' : '-200'}.png` });
      await p.back.click();

      // Jump back before the giving step: the value goes — said, with one Undo that brings place and value back.
      await jumpTo(page, 'Envision how I’d expect {feature} to work');
      await expect(r.words).toHaveText('Envision how I’d expect {feature} to work');
      await expect(r.values).toHaveCount(0);
      await expect(r.fields).toHaveCount(0);
      await expect(r.notice).toContainText('Cleared {feature}');
      await noSerious(page);
      await rules(page, r.screen);
      await page.screenshot({ path: `${SHOTS}/runner-cleared${size.width > 300 ? '' : '-200'}.png` });
      await r.notice.getByRole('button', { name: 'Undo Jump', exact: true }).click();
      await expect(r.words).toHaveText('Build checkout');
      await expect(r.values).toHaveText(['feature: checkout']);

      // Kept across a reload; (P-111, rewritten: owner ruling Back keeps it — was: Back onto the giving step clears it
      // there too, "Cleared {feature}") Back onto the giving step keeps it, in that step's field to keep or change.
      await page.reload();
      await expect(runner(page).words).toHaveText('Build checkout');
      await runner(page).handle.click();
      await runner(page).panel.getByRole('button', { name: /^Back to/ }).click();
      await expect(runner(page).words).toHaveText('Pick a feature');
      await expect(runner(page).field('feature')).toHaveAccessibleName('feature: checkout');
      await expect(runner(page).notice).toHaveCount(0);

      // Home: the run touched last reads "Last ran" (in words, and in its body's name).
      await runner(page).pause.click();
      await (await arrived(page, 'go-pause-sheet')).getByTestId('go-pause-confirm').click();
      await expect(settled(page, 'home')).toBeVisible();
      const t = tile(page, 'Iterate on the app');
      await expect(t.getByTestId('go-tile-last')).toHaveText('Last ran');
      await expect(t.getByTestId('go-tile-body')).toHaveAccessibleName(/Last ran/);
      await noSerious(page);
      await rules(page, home(page).screen);
      await page.screenshot({ path: `${SHOTS}/home-last-ran${size.width > 300 ? '' : '-200'}.png` });
    });

    test('"@" across spaces: the list stays open while the words match "Document Iteration"; added as "@Document Iteration" it is a call; "@" while changing a step’s words; the row typed as words is offered "Make it a call", never made one by itself', async ({ page }) => {
      await importBackup(page, goBackup([ITERATE, DOC]));
      const p = await planOf(page, 'iterate');
      // The owner's row, as words: offered as a call in its ···, never made one by itself.
      await expect(p.row('@Document Iteration')).toHaveCount(1);
      await editPlan(page); // (P-115, rewritten: Plan opens read-only — Edit first.)
      await p.more('@Document Iteration').click();
      const menu = await arrived(page, 'go-plan-menu');
      await expect(menuItems(menu).first()).toHaveText('Edit');
      const make = menu.getByRole('menuitem', { name: 'Make it a call to Document Iteration', exact: true });
      await expect(make).toBeVisible();
      await noSerious(page);
      await rules(page, menu);
      await page.screenshot({ path: `${SHOTS}/make-it-a-call${size.width > 300 ? '' : '-200'}.png` });
      await make.click();
      await expect(p.row('Document Iteration')).toHaveAttribute('data-kind', 'routine');
      await expect(p.row('@Document Iteration')).toHaveCount(0);
      // Its Undo (Ctrl/⌘+Z) puts the words back.
      await p.title.click();
      await page.keyboard.press('ControlOrMeta+z');
      await expect(p.row('@Document Iteration')).toHaveCount(1);

      // Add a step: "@Document It" keeps the list open across the space; Return adds the call.
      await p.add.click();
      await p.add.pressSequentially('@Document It');
      const chip = p.screen.getByTestId('go-names-routine');
      await expect(chip).toHaveCount(1);
      await expect(chip).toHaveAccessibleName('Add Document Iteration as a step');
      await noSerious(page);
      await page.screenshot({ path: `${SHOTS}/at-across-spaces${size.width > 300 ? '' : '-200'}.png` });
      await p.add.press('Enter');
      await expect(p.add).toHaveValue('');
      await expect(p.rows.last()).toHaveAttribute('data-kind', 'routine');
      await expect(p.rows.last().getByTestId('go-plan-words')).toHaveText('Document Iteration');
      // Words no routine has: the list closes and the words stay words.
      await p.add.pressSequentially('@Document Itx');
      await expect(chip).toHaveCount(0);
      await p.add.fill('');
      // The whole name typed, the list put away (Esc), then Return: still a call (case and spacing aside).
      await p.add.pressSequentially('@document  iteration');
      await page.keyboard.press('Escape');
      await expect(chip).toHaveCount(0);
      await p.add.press('Enter');
      await expect(p.add).toHaveValue('');
      await expect(p.screen.locator('[data-testid="go-plan-row"][data-kind="routine"]')).toHaveCount(2);

      // "@" while changing a step's words: Edit "Ship it", type "@Doc", choose the routine — the step becomes the call.
      // (The Add field left first: its names bar goes as it is left, and the rows move up under the pointer.)
      await p.add.blur();
      await expect(p.namesBar).toHaveCount(0);
      await p.more('Ship it').click();
      await (await arrived(page, 'go-plan-menu')).getByRole('menuitem', { name: 'Edit', exact: true }).click();
      await expect(p.typed).toBeFocused();
      await p.typed.fill('');
      await p.typed.pressSequentially('@Doc');
      await expect(chip).toHaveAccessibleName('Make it a call to Document Iteration');
      await chip.click();
      await expect(p.row('Ship it')).toHaveCount(0);
      await expect(p.screen.locator('[data-testid="go-plan-row"][data-kind="routine"]')).toHaveCount(3);
      await noSerious(page);
      await rules(page, p.screen);

      // Kept across a reload.
      await page.reload();
      await expect(plan(page).screen.locator('[data-testid="go-plan-row"][data-kind="routine"]')).toHaveCount(3);
      await expect(plan(page).row('@Document Iteration')).toHaveCount(1);
    });
  });
}
