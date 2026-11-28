/**
 * P-112: chunks on the runner — see several steps at once (B-16, "A chunk is chosen while running"). Done when: a toggled
 * view (owner: "I want that to be a toggled view … like a button you click") — off, the runner is one step as now; on
 * (one button), the runner is a condensed list (16 px text, a field on one line beside its name, thin rules) that
 * tightens as rows are added but never below 48 px targets, then scrolls (owner: "the list stops tightening and just
 * allow a scroll"); the step in view can be extended with the next, again and again; a step with insides opens in place
 * as an outline; a giving step in the chunk has its field there; Next takes the chunk as done (one move, Undo) and goes
 * past it; nothing stored. At 390×844 and at 200 % text (195×422): axe, 48 px, focus, and how many steps are in view said.
 */
import { AxeBuilder } from '@axe-core/playwright';
import { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { goBackup, importBackup, RoutineSpec, runner, settled } from './goFixture';

const SHOTS = '.polish/current/P-112/shots';
const PAPER = 'rgb(244, 241, 232)';

const POST: RoutineSpec = { id: 'post', name: 'Write the post', steps: ['Warm up', { text: 'Choose a subject', gives: 'subject' }, 'Draft {subject}', 'Edit {subject}', 'Send it'] };
const SHIP: RoutineSpec = { id: 'ship', name: 'Ship it', steps: ['Prepare', { routine: 'review' }, 'Act on {verdict}', 'Tell the team'] };
const REVIEW: RoutineSpec = { id: 'review', name: 'Get reviewed', home: false, steps: ['Ask for a review', { text: 'Hear back', gives: 'verdict' }] };
const LONG: RoutineSpec = { id: 'long', name: 'Tidy the flat', steps: ['Open the windows', 'Clear the table', 'Wash the cups', 'Wipe the counter', 'Sweep the kitchen', 'Make the bed', 'Fold the clothes', 'Water the plants', 'Empty the bins', 'Mop the hall', 'Hang the towels', 'Dust the shelves', 'Shake the rugs', 'Wipe the mirror', 'Sort the post', 'Close the windows'] };

const backup = (run: 'post' | 'ship' | 'long', at = 0) => goBackup([POST, SHIP, REVIEW, LONG], [{ id: 'r1', routine: run, at, status: 'running' }]);

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

const chunk = (page: Page) => {
  const screen = settled(page, 'runner');
  return {
    toggle: screen.getByTestId('go-see-ahead'),
    sheet: screen.getByTestId('go-chunk'),
    rows: screen.getByTestId('go-chunk-row'),
    words: screen.getByTestId('go-chunk-words'),
    then: screen.getByTestId('go-chunk-then'),
    fewer: screen.getByTestId('go-chunk-fewer'),
    input: (name: string) => screen.getByRole('textbox', { name, exact: true }),
    said: page.getByTestId('go-chunk-said'),
  };
};
const focusedId = (page: Page) => page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? document.activeElement?.tagName ?? 'none');

for (const [label, size] of [
  ['390×844', { width: 390, height: 844 }],
  ['200 % text (195×422)', { width: 195, height: 422 }],
] as const) {
  const tag = size.width > 300 ? '' : '-200';
  test.describe(`at ${label}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(size);
    });

    test('off, the runner is one step; See ahead turns on one condensed sheet, extended with "then:" and taken back with Fewer — said, focus kept; off again, one step', async ({ page }) => {
      await importBackup(page, backup('post'));
      await page.goto('./go');
      const r = runner(page);
      const c = chunk(page);
      // Off by default: the note, nothing added to it — no sheet, no "then:", no Fewer.
      await expect(r.words).toHaveText('Warm up');
      await expect(c.toggle).toHaveAccessibleName('See ahead');
      await expect(c.toggle).toHaveAttribute('aria-pressed', 'false');
      await expect(c.sheet).toHaveCount(0);
      await expect(c.then).toHaveCount(0);
      await expect(c.fewer).toHaveCount(0);
      // It sits in the bottom bar's top row, at the right of the handle.
      const [handle, toggle] = [await r.handle.boundingBox(), await c.toggle.boundingBox()];
      expect(Math.abs(handle!.y - toggle!.y)).toBeLessThan(2);
      expect(toggle!.x).toBeGreaterThan(handle!.x + handle!.width - 1);

      // On: one sheet, the step in view as its one row; no big note.
      await c.toggle.click();
      await expect(c.toggle).toHaveAttribute('aria-pressed', 'true');
      await expect(c.sheet).toBeVisible();
      await expect(r.note).toHaveCount(0);
      await expect(c.words).toHaveText(['Warm up']);
      await expect(c.said).toHaveText('1 step in view');
      await expect(c.then).toHaveText('then: Choose a subject');
      await expect(c.then).toHaveAccessibleName('Add to view, then: Choose a subject');
      await expect(c.fewer).toHaveCount(0);

      // "then:" adds the next step, again and again; the focus stays on it.
      await c.then.click();
      await expect(c.words).toHaveText(['Warm up', 'Choose a subject']);
      await expect(c.said).toHaveText('2 steps in view');
      expect(await focusedId(page)).toBe('go-chunk-then');
      await expect(c.then).toHaveText('then: Draft {subject}');
      await page.keyboard.press('Enter');
      await expect(c.words).toHaveText(['Warm up', 'Choose a subject', 'Draft {subject}']);
      await expect(c.said).toHaveText('3 steps in view');

      // The condensed list: 16 px words at weight 500, thin rules between rows; the giving step's field on one line, label then input.
      const look = await c.words.first().evaluate((e) => ({ size: getComputedStyle(e).fontSize, weight: getComputedStyle(e).fontWeight }));
      expect(look).toEqual({ size: '16px', weight: '500' });
      expect(await c.rows.nth(1).evaluate((e) => getComputedStyle(e).borderTopWidth)).toBe('1px');
      const field = c.rows.nth(1).getByTestId('go-chunk-field');
      await expect(field.getByText('subject', { exact: true })).toBeVisible();
      await expect(c.input('subject')).toHaveAttribute('placeholder', 'optional');
      if (size.width > 300) {
        const [l, i] = [await field.getByText('subject', { exact: true }).boundingBox(), await c.input('subject').boundingBox()];
        expect(l!.x + l!.width).toBeLessThanOrEqual(i!.x + 1);
        expect(l!.y).toBeLessThan(i!.y + i!.height);
        expect(i!.y).toBeLessThan(l!.y + l!.height);
      }
      await noSerious(page);
      await rules(settled(page, 'runner'));
      await page.screenshot({ path: `${SHOTS}/chunk${tag}.png` });

      // Fewer takes the last off; with one left it goes and the focus is on "then:".
      await c.fewer.click();
      await expect(c.words).toHaveText(['Warm up', 'Choose a subject']);
      await expect(c.said).toHaveText('2 steps in view');
      expect(await focusedId(page)).toBe('go-chunk-fewer');
      await c.fewer.click();
      await expect(c.words).toHaveText(['Warm up']);
      await expect(c.fewer).toHaveCount(0);
      await expect.poll(() => focusedId(page)).toBe('go-chunk-then');

      // Off again: one step, the note.
      await c.toggle.click();
      await expect(c.toggle).toHaveAttribute('aria-pressed', 'false');
      await expect(c.sheet).toHaveCount(0);
      await expect(r.words).toHaveText('Warm up');
    });

    test('Next takes everything in view as done — one move with the values typed, to the step after the last shown — and one Undo; the view stays on, back to one step', async ({ page }) => {
      await importBackup(page, backup('post'));
      await page.goto('./go');
      const r = runner(page);
      const c = chunk(page);
      await c.toggle.click();
      await c.then.click();
      await c.then.click();
      await c.input('subject').fill('tides');
      // Typed in view, the value is in place in the steps below it, and "then:" names where Next lands.
      await expect(c.words).toHaveText(['Warm up', 'Choose a subject', 'Draft tides']);
      await expect(c.then).toHaveText('then: Edit tides');

      await r.next.click();
      // Past the chunk: the step after the last one shown; the view stays on, at one step; the value kept.
      await expect(c.words).toHaveText(['Edit tides']);
      await expect(c.toggle).toHaveAttribute('aria-pressed', 'true');
      await expect(c.said).toHaveText('1 step in view');
      await expect(r.values).toHaveText([/subject.*tides/]);
      await expect(r.notice).toContainText('Took 3 steps as done');
      // One Undo: the place back, the value no longer given — and the steps in view as they were, with what was typed.
      await settled(page, 'runner').getByTestId('go-notice-undo').click();
      await expect(c.words).toHaveText(['Warm up', 'Choose a subject', 'Draft tides']);
      await expect(c.input('subject')).toHaveValue('tides');
      await expect(r.values).toHaveCount(0);
      // Next over the whole rest ends the run: it reads Done.
      for (let i = 0; i < 2; i++) await c.then.click();
      await expect(c.then).toHaveCount(0);
      await expect(r.next).toHaveText('Done');
    });

    test('a step with insides opens in place as an outline of its smaller steps, with the field on the step that gives it; closed, the field is on the step; Next gives it', async ({ page }) => {
      await importBackup(page, backup('ship', 1));
      await page.goto('./go');
      const r = runner(page);
      const c = chunk(page);
      await c.toggle.click();
      await expect(c.words).toHaveText(['Get reviewed']);
      const open = settled(page, 'runner').getByTestId('go-chunk-insides');
      await expect(open).toHaveAccessibleName('Open Get reviewed');
      await expect(open).toHaveAttribute('aria-expanded', 'false');
      // Closed: a field for what its insides give, on the step.
      await expect(c.input('verdict')).toBeVisible();
      await c.input('verdict').fill('ship it');
      await open.click();
      await expect(open).toHaveAccessibleName('Close Get reviewed');
      await expect(open).toHaveAttribute('aria-expanded', 'true');
      await expect(open).toBeFocused();
      await expect(c.words).toHaveText(['Get reviewed', 'Ask for a review', 'Hear back']);
      await expect(c.rows.nth(1)).toHaveAttribute('data-inner', 'true');
      await expect(c.rows.nth(1)).toHaveAttribute('data-depth', '1');
      // Open: the field is on the smaller step that gives it — the words typed kept.
      await expect(c.rows.nth(2).getByRole('textbox', { name: 'verdict' })).toHaveValue('ship it');
      await expect(c.rows.nth(0).getByRole('textbox')).toHaveCount(0);
      // Still one step in view: Next stands only on the steps shown, never on their insides.
      await expect(c.said).toHaveText('1 step in view');
      await expect(c.then).toHaveText('then: Act on ship it');
      await noSerious(page);
      await rules(settled(page, 'runner'));
      await page.screenshot({ path: `${SHOTS}/outline${tag}.png` });
      await r.next.click();
      await expect(c.words).toHaveText(['Act on ship it']);
    });

    test('Step in still steps into the first step in view; the chunk resets to it', async ({ page }) => {
      await importBackup(page, backup('ship', 1));
      await page.goto('./go');
      const r = runner(page);
      const c = chunk(page);
      await c.toggle.click();
      await c.then.click();
      await expect(c.words).toHaveText(['Get reviewed', 'Act on {verdict}']);
      await r.stepIn.click();
      await expect(c.words).toHaveText(['Ask for a review']);
      await expect(c.toggle).toHaveAttribute('aria-pressed', 'true');
      await expect(r.context).toContainText('Get reviewed');
    });

    test('as rows are added the spacing tightens in steps, never under 48 px targets, then the column scrolls', async ({ page }) => {
      await importBackup(page, backup('long'));
      await page.goto('./go');
      const c = chunk(page);
      await c.toggle.click();
      await expect(c.sheet).toHaveAttribute('data-tier', 'roomy');
      for (let i = 0; i < 4; i++) await c.then.click();
      await expect(c.rows).toHaveCount(5);
      await expect(c.sheet).toHaveAttribute('data-tier', 'roomy');
      await c.then.click();
      await expect(c.sheet).toHaveAttribute('data-tier', 'closer');
      for (let i = 0; i < 4; i++) await c.then.click();
      await expect(c.rows).toHaveCount(10);
      await expect(c.sheet).toHaveAttribute('data-tier', 'closest');
      await expect(c.said).toHaveText('10 steps in view');
      const heights = await c.rows.evaluateAll((rows) => rows.map((e) => Math.round(e.getBoundingClientRect().height)));
      expect(Math.min(...heights)).toBeGreaterThanOrEqual(48);
      const sizes = await c.words.evaluateAll((ws) => ws.map((e) => getComputedStyle(e).fontSize));
      expect(new Set(sizes)).toEqual(new Set(['16px']));
      // Longer than the room: the column scrolls, and the moves stay whole on screen.
      for (let i = 0; i < 5; i++) await c.then.click();
      await expect(c.rows).toHaveCount(15);
      await expect(c.sheet).toHaveAttribute('data-tier', 'closest');
      const column = settled(page, 'runner').getByTestId('go-column');
      expect(await column.evaluate((e) => e.scrollHeight > e.clientHeight)).toBe(true);
      await c.then.scrollIntoViewIfNeeded();
      await expect(c.then).toBeInViewport();
      await expect(runner(page).next).toBeInViewport();
      await noSerious(page);
      await rules(settled(page, 'runner'));
      await page.screenshot({ path: `${SHOTS}/tight${tag}.png` });
    });
  });
}
