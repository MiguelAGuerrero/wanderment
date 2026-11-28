/**
 * P-111: a breakdown opens its own view in Plan. The owner (2026-11-27): "The breakdown step doesn't have its own contact
 * so you have to keep clicking the previous substeps context menu to add a next step after it while it's more intuitive
 * to have the breakdown step be its own view so that you can modify or develop the substeps with more screen space";
 * answered "Opens its own view". Done when: tapping a breakdown (or a for each) opens it with its own steps, its own Add
 * a step at the bottom and a path back to the parent (as Step in's path does); the disclosure control and its words are
 * P-112's; Undo and keyboard reach unchanged. Calls stay calls (a routine with its own Plan).
 * Also the P-110 investigator's two "@" bugs (Return on an exact name; a step reading "@<routine>" left unchanged).
 * At 390×844 and at 200 % text (195×422).
 */
import { AxeBuilder } from '@axe-core/playwright';
import { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { arrived, closeMenu, exported, goBackup, importBackup, menuItems, plan, planMenu, planType, RoutineSpec, runner, settled, typeValue, undoEdit, editPlan, savePlan } from './goFixture';

const SHOTS = '.polish/current/P-111/shots';
const PAPER = 'rgb(244, 241, 232)';

const TEST: RoutineSpec = { id: 'test', name: 'Test the app', steps: [{ text: 'Pick a feature', gives: 'feature' }, { routine: 'vibe' }, { text: 'List concerns', gives: 'concerns' }, { routine: 'loop' }, { routine: 'notes' }] };
const VIBE: RoutineSpec = { id: 'vibe', name: 'Vibe check', home: false, steps: ['Open {feature}', 'Poke at it'] };
const LOOP: RoutineSpec = { id: 'loop', name: 'For each concern in {concerns}', home: false, steps: ['Write down {concern}'] };
const NOTES: RoutineSpec = { id: 'notes', name: 'Take notes', home: false, steps: ['Open the doc'] };
const ARCHIVE: RoutineSpec = { id: 'archive', name: 'Archive doc', home: false, steps: ['Move it'] };
const DOC: RoutineSpec = { id: 'doc', name: 'Doc', home: false, steps: ['Write it'] };
const AT: RoutineSpec = { id: 'at', name: 'With a call in words', steps: ['@Doc', 'Then this'] };

/** The backup, with "Vibe check" a step broken down and the loop a for each (unnamed, as Plan makes them). */
function backup(runs: Parameters<typeof goBackup>[1] = []) {
  const b = JSON.parse(goBackup([TEST, VIBE, LOOP, NOTES, ARCHIVE, DOC, AT], runs));
  Object.assign(b.data.routines.vibe, { named: false });
  Object.assign(b.data.routines.loop, { named: false, each: { item: 'concern', list: 'concerns' } });
  return JSON.stringify(b);
}

async function noSerious(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}
/** Targets ≥ 48 px inside the window, text ≥ 16 px and never cut, every control named (with its visible words), at most one filled button. */
async function rules(scope: Locator) {
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
const steps = (page: Page) => plan(page).words;
const into = (page: Page, words: string) => plan(page).screen.getByRole('button', { name: `Open ${words}`, exact: true });
const up = (page: Page) => plan(page).screen.getByTestId('go-plan-up');

for (const [label, size] of [
  ['390×844', { width: 390, height: 844 }],
  ['200 % text (195×422)', { width: 195, height: 422 }],
] as const) {
  const tag = size.width > 300 ? '' : '-200';
  test.describe(`at ${label}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(size);
    });

    test('a step broken down opens as its own view: its steps, its own Add a step after its last, Undo, its ···, the path back (focus on the row again), the browser’s Back; a for each too; a call stays a call', async ({ page }) => {
      await importBackup(page, backup());
      await page.goto('./go/routine/test');
      const p = plan(page);
      // The routine's own view: a step broken down and a for each are one row each, shut (›); nothing of theirs shows.
      await expect(steps(page)).toHaveText(['Pick a feature', 'Vibe check', 'List concerns', 'For each concern in {concerns}', 'Take notes']);
      await expect(into(page, 'Vibe check')).not.toHaveAttribute('aria-expanded', /.*/);
      await expect(p.screen.getByTestId('go-plan-path')).toHaveCount(0);

      // Tapped: its own view — its heading (with the focus), the path back, its steps.
      await into(page, 'Vibe check').click();
      await expect(page).toHaveURL(/\/go\/routine\/test\?at=test-1$/);
      await expect(p.title).toHaveText('Vibe check');
      await expect(p.title).toBeFocused();
      await expect(up(page)).toHaveText('Test the app');
      await expect(up(page)).toHaveAccessibleName('Back to Test the app');
      await expect(steps(page)).toHaveText(['Open {feature}', 'Poke at it']);
      await expect(p.rows.first()).toHaveAttribute('data-depth', '0');
      // Its own Add a step: after its last step, no ··· needed.
      await editPlan(page); // (P-115, rewritten: Plan opens read-only — Edit first.)
      await p.add.fill('Write it up');
      await p.add.press('Enter');
      await expect(steps(page)).toHaveText(['Open {feature}', 'Poke at it', 'Write it up']);
      // Undo, from its own ···, as Plan's edits are.
      await undoEdit(page);
      await expect(steps(page)).toHaveText(['Open {feature}', 'Poke at it']);
      await expect(p.title).toBeFocused();
      // …and Ctrl+Z.
      await p.add.fill('Write it up');
      await p.add.press('Enter');
      await p.title.focus();
      await page.keyboard.press('Control+z');
      await expect(steps(page)).toHaveText(['Open {feature}', 'Poke at it']);
      // A step's ··· is the anchored menu, as anywhere in Plan.
      await p.more('Poke at it').click();
      // (Under 340 px, with no grip, Move up / Move down are on it too — P-102 audit F1.)
      await expect(menuItems(await arrived(page, 'go-plan-menu'))).toHaveText(size.width > 300 ? ['Edit', 'Add a step after', 'Break it down', 'Gives…', 'Remove'] : ['Edit', 'Add a step after', 'Break it down', 'Gives…', 'Move up', 'Move down', 'Remove']);
      await closeMenu(page, 'go-plan-menu');
      // Its own ··· (the heading's): Edit its words, Remove.
      await editPlan(page); // (P-115, rewritten: the routine's ··· edits are Edit's — Edit first.)
      await p.screen.getByTestId('go-plan-more').click();
      await expect(menuItems(await arrived(page, 'go-plan-routine'))).toHaveText(['Edit', 'Remove']);
      await closeMenu(page, 'go-plan-routine');
      await noSerious(page);
      await rules(p.screen);
      await page.screenshot({ path: `${SHOTS}/breakdown-view${tag}.png` });

      // The path back: the routine's view, the focus on the row it came from.
      await up(page).click();
      await expect(p.title).toHaveText('Test the app');
      await expect(page).toHaveURL(/\/go\/routine\/test$/);
      await expect(into(page, 'Vibe check')).toBeFocused();
      // The browser's Back does the same.
      await into(page, 'Vibe check').click();
      await expect(p.title).toHaveText('Vibe check');
      await page.goBack();
      await expect(p.title).toHaveText('Test the app');
      await expect(into(page, 'Vibe check')).toBeFocused();

      // A for each: a tap on its words goes in too; its own Add a step reads its item ("{" picks it).
      await p.screen.getByTestId('go-plan-into').filter({ hasText: 'For each concern in' }).click();
      await expect(p.title).toHaveText('For each concern in {concerns}');
      await expect(steps(page)).toHaveText(['Write down {concern}']);
      await editPlan(page); // (P-115, rewritten: Plan opens read-only — Edit first.)
      await p.add.click();
      await p.add.pressSequentially('Rate {concern');
      await expect(p.namesBar).toHaveAttribute('data-picking', 'true');
      await p.add.press('Enter');
      await expect(p.add).toHaveValue('Rate {concern} ');
      await p.add.press('Enter');
      await expect(steps(page)).toHaveText(['Write down {concern}', 'Rate {concern}']);
      await editPlan(page); // (P-115, rewritten: the routine's ··· edits are Edit's — Edit first.)
      await p.screen.getByTestId('go-plan-more').click();
      // (No Edit: its words are the sentence. The step just added is the last action: its Undo is here.)
      await expect(menuItems(await arrived(page, 'go-plan-routine'))).toHaveText([/^Undo added/, 'Remove']);
      await closeMenu(page, 'go-plan-routine');
      await noSerious(page);
      await rules(p.screen);
      await page.screenshot({ path: `${SHOTS}/foreach-view${tag}.png` });
      await up(page).click();
      await expect(p.title).toHaveText('Test the app');

      // A call stays a call: its chevron opens it in place (this view, this address); its Open is its own Plan.
      const call = p.screen.getByRole('button', { name: 'Open Take notes', exact: true });
      await expect(call).toHaveAttribute('aria-expanded', 'false');
      await call.click();
      await expect(steps(page)).toHaveText(['Pick a feature', 'Vibe check', 'List concerns', 'For each concern in {concerns}', 'Take notes', 'Open the doc']);
      await expect(page).toHaveURL(/\/go\/routine\/test$/);
      await expect(p.screen.getByRole('button', { name: 'Close Take notes', exact: true })).toHaveAttribute('aria-expanded', 'true');

      await savePlan(page); // (P-115, rewritten: saved first — a run, home and the backup read the saved routine.)
      const stored = await exported(page);
      expect(stored.routines.vibe.items!.map((i) => i.text)).toEqual(['Open {feature}', 'Poke at it']);
      expect(stored.routines.loop.items!.map((i) => i.text)).toEqual(['Write down {concern}', 'Rate {concern}']);
    });

    test('a run inside a step broken down: Plan opens in it (HERE, the value in place, Resume at …); reloaded it stays; the path back goes up; Edit and Remove from its own ···', async ({ page }) => {
      await importBackup(page, backup([{ id: 'r1', routine: 'test', at: 0, status: 'running' }]));
      await page.goto('./go/run/r1');
      const r = runner(page);
      await typeValue(page, 'feature', 'login');
      await r.next.click();
      await r.stepIn.click();
      await expect(r.words).toHaveText('Open login');
      await r.next.click();
      await expect(r.words).toHaveText('Poke at it');
      await r.plan.click();
      const p = plan(page);
      // Where the run is: the step broken down it is in, HERE in it; P-110's values in place.
      await expect(p.title).toHaveText('Vibe check');
      await expect(p.title).toBeFocused();
      await expect(p.here).toHaveAccessibleName('Here, Poke at it');
      await expect(p.row('Open {feature}').getByTestId('go-plan-words')).toHaveText('Open login');
      await expect(p.forward).toHaveText('Resume at Poke at it');
      await expect(p.back).toBeVisible();
      await noSerious(page);
      await rules(p.screen);
      await page.screenshot({ path: `${SHOTS}/breakdown-from-run${tag}.png` });
      // Reloaded: the same view.
      await page.reload();
      await expect(plan(page).title).toHaveText('Vibe check');
      // Its own words changed from its own ···.
      await editPlan(page); // (P-115, rewritten: the routine's ··· edits are Edit's — Edit first.)
      await p.screen.getByTestId('go-plan-more').click();
      await (await arrived(page, 'go-plan-routine')).getByRole('menuitem', { name: 'Edit Vibe check', exact: true }).click();
      await planType(page, 'Vibe check it');
      await expect(p.title).toHaveText('Vibe check it');
      // The path back: the routine's view (HERE is inside the row, which says so).
      await up(page).click();
      await expect(p.title).toHaveText('Test the app');
      await expect(p.row('Vibe check it')).toHaveAccessibleName('You are in this, Vibe check it');
      await expect(into(page, 'Vibe check it')).toBeFocused();
      // (P-115, rewritten: Resume is read-only Plan's — saved first; the run is where it was.)
      await savePlan(page);
      await expect(p.forward).toHaveText('Resume at Poke at it');
      // Back to the run, where it was.
      await p.back.click();
      await expect(settled(page, 'runner')).toBeVisible();
      await expect(runner(page).words).toHaveText('Poke at it');
    });

    test('Remove from a breakdown’s own ··· goes back up; Undo brings it back', async ({ page }) => {
      await importBackup(page, backup());
      await page.goto('./go/routine/test');
      const p = plan(page);
      await into(page, 'Vibe check').click();
      await expect(p.title).toHaveText('Vibe check');
      await editPlan(page); // (P-115, rewritten: the routine's ··· edits are Edit's — Edit first.)
      await p.screen.getByTestId('go-plan-more').click();
      await (await arrived(page, 'go-plan-routine')).getByRole('menuitem', { name: 'Remove Vibe check', exact: true }).click();
      await expect(p.title).toHaveText('Test the app');
      await expect(steps(page)).toHaveText(['Pick a feature', 'List concerns', 'For each concern in {concerns}', 'Take notes']);
      await p.notice.getByRole('button', { name: /^Undo/ }).click();
      await expect(steps(page)).toHaveText(['Pick a feature', 'Vibe check', 'List concerns', 'For each concern in {concerns}', 'Take notes']);
    });

    test('"@": Return takes the routine named exactly ("Doc", not "Archive doc"); a step reading "@Doc" opened and left unchanged stays words (Make it a call still offered)', async ({ page }) => {
      await importBackup(page, backup());
      await page.goto('./go/routine/test');
      const p = plan(page);
      await into(page, 'Vibe check').click();
      await expect(p.title).toHaveText('Vibe check');
      await editPlan(page); // (P-115, rewritten: Plan opens read-only — Edit first.)
      await p.add.click();
      await p.add.pressSequentially('@Doc');
      await expect(p.namesBar).toHaveAttribute('data-picking', 'true');
      await p.add.press('Enter');
      await expect(steps(page)).toHaveText(['Open {feature}', 'Poke at it', 'Doc']);
      await expect(p.row('Doc')).toHaveAttribute('data-kind', 'routine');

      await savePlan(page); // (P-115, rewritten: saved first — a run, home and the backup read the saved routine.)
      await page.goto('./go/routine/at');
      await expect(p.title).toHaveText('With a call in words');
      await planMenu(page, '@Doc', 'Edit');
      await expect(p.typed).toBeFocused();
      await p.typed.press('Enter');
      await expect(p.row('@Doc')).toHaveAttribute('data-kind', 'step');
      await planMenu(page, '@Doc', 'Edit');
      await p.typed.blur();
      await expect(p.row('@Doc')).toHaveAttribute('data-kind', 'step');
      await p.more('@Doc').click();
      await expect(menuItems(await arrived(page, 'go-plan-menu'))).toContainText(['Make it a call']);
      await closeMenu(page, 'go-plan-menu');
      await savePlan(page); // (P-115, rewritten: saved first — a run, home and the backup read the saved routine.)
      const stored = await exported(page);
      expect(stored.routines.at.items![0]).toMatchObject({ text: '@Doc' });
      expect(stored.routines.vibe.items![2]).toMatchObject({ ref: 'doc' });
    });
  });
}
