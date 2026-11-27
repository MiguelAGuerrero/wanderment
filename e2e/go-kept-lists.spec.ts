/**
 * P-108: kept lists, a for each's own list, and values that are routines — B-16's "Become a better drawer" and the
 * owner's "a way … is actually a routine, not text". Add's "For each…" names a list of its own: kept in the routine
 * (its items as rows under the block, + Add there and on the routine's tile; no count; kept across a reload and in
 * the export) or asked each run (arriving at the block asks for it, in the list field, on the block). A routine row
 * can take a name given above (`▤ {way}`), from Add's "A routine" (the names first) or "@"; on the runner it shows the
 * routine held, chosen in the giving field as it is typed, with Step in; the value is drawn with the routine mark.
 * At 390×844 and at 200 % text (195×422).
 */
import { AxeBuilder } from '@axe-core/playwright';
import { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { exported, goBackup, importBackup, plan, RoutineSpec, runner, settled } from './goFixture';

const SHOTS = '.polish/current/P-108/shots';
const PAPER = 'rgb(244, 241, 232)';

const GUIDE: RoutineSpec = { id: 'guide', name: 'Draw with guidelines', home: false, steps: ['Block in {subject} with guidelines'] };
const BETTER: RoutineSpec = { id: 'better', name: 'Become a better drawer', steps: ['Warm up'] };
const TRY: RoutineSpec = { id: 'try', name: 'Try a way', steps: [{ text: 'Pick a subject', gives: 'subject' }, { text: 'Choose a way to draw', gives: 'way' }] };

async function sheet(page: Page, testId: string): Promise<Locator> {
  const s = page.getByTestId(testId);
  await expect(s).toHaveAttribute('data-moving', 'false');
  return s;
}
const planOf = async (page: Page, id: string) => {
  await page.goto(`./go/routine/${id}`);
  await expect(settled(page, 'plan')).toBeVisible();
  return plan(page);
};

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
    // (Screen-reader-only words — a 1-px clipped box — are not shown, so they can't be cut.)
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


for (const [label, size] of [
  ['390×844', { width: 390, height: 844 }],
  ['200 % text (195×422)', { width: 195, height: 422 }],
] as const) {
  test.describe(`at ${label}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(size);
    });

    test('a kept list: made from For each…, its items as rows under the block with + Add, + Add on the tile with Undo, kept across a reload and in the export; running goes through them with no count', async ({ page }) => {
      await importBackup(page, goBackup([BETTER, GUIDE]));
      const p = await planOf(page, 'better');
      // For each… is there with no name given above: a list of its own.
      await p.screen.getByTestId('go-plan-add-each').click();
      const pick = await sheet(page, 'go-each-sheet');
      await expect(pick.getByTestId('go-each-sheet-row')).toHaveCount(0);
      await pick.getByTestId('go-each-own-name').fill('subjects');
      await expect(pick.getByTestId('go-each-own-kept')).toHaveAccessibleName('Keep it here: For each subject in {subjects}');
      await noSerious(page);
      await rules(page, pick);
      await pick.getByTestId('go-each-own-kept').click();
      await expect(page.getByTestId('go-each-sheet')).toHaveCount(0);
      await expect(p.typed).toBeFocused();
      await p.typed.fill('Deliberate practice on {subject}');
      await p.typed.press('Enter');
      await page.keyboard.press('Escape');
      await expect(p.words).toHaveText(['Warm up', 'For each subject in {subjects}', 'Deliberate practice on {subject}']);
      // + Add under the block: the list sheet, its new row focused.
      const add = p.row('For each subject in {subjects}').getByTestId('go-plan-kept-add');
      await expect(add).toHaveAccessibleName('Add to subjects');
      await add.click();
      const kept = await sheet(page, 'go-kept-sheet');
      const fields = kept.getByTestId('go-list-field');
      await expect(fields).toHaveCount(1);
      await expect(fields.nth(0)).toBeFocused();
      await fields.nth(0).fill('arms');
      await fields.nth(0).press('Enter');
      await fields.nth(1).fill('legs');
      await noSerious(page);
      await rules(page, kept);
      await kept.getByTestId('go-list-keep').click();
      await expect(page.getByTestId('go-kept-sheet')).toHaveCount(0);
      const items = p.row('For each subject in {subjects}').getByTestId('go-plan-kept-item');
      await expect(items).toHaveText(['arms', 'legs']);
      await expect(p.row('For each subject in {subjects}')).not.toContainText(/\b2\b/);
      await noSerious(page);
      await rules(page, p.screen);
      if (size.width > 300) await page.screenshot({ path: `${SHOTS}/plan-kept.png` });
      else await page.screenshot({ path: `${SHOTS}/plan-kept-200.png` });

      // Kept across a reload.
      await page.reload();
      await expect(plan(page).row('For each subject in {subjects}').getByTestId('go-plan-kept-item')).toHaveText(['arms', 'legs']);

      // Running: into the block at its first item — "subject: arms", no count.
      await plan(page).forward.click();
      const r = runner(page);
      await expect(r.words).toHaveText('Warm up');
      await r.next.click();
      await expect(r.words).toHaveText('Deliberate practice on arms');
      await expect(r.values).toHaveText(['subject: arms']);
      await noSerious(page);
      await rules(page, r.screen);
      if (size.width > 300) await page.screenshot({ path: `${SHOTS}/runner-kept.png` });
      // Put down; + Add on the routine's tile (with Undo).
      await r.pause.click();
      await (await sheet(page, 'go-pause-sheet')).getByTestId('go-pause-confirm').click();
      await expect(settled(page, 'home')).toBeVisible();
      const tileAdd = page.getByTestId('go-tile-kept-add');
      await expect(tileAdd).toHaveAccessibleName('Add to subjects in Become a better drawer');
      await noSerious(page);
      await rules(page, page.getByTestId('go-tile'));
      if (size.width > 300) await page.screenshot({ path: `${SHOTS}/tile-kept.png` });
      else await page.screenshot({ path: `${SHOTS}/tile-kept-200.png` });
      await tileAdd.click();
      const fromTile = await sheet(page, 'go-kept-sheet');
      await expect(fromTile.getByTestId('go-list-field')).toHaveCount(3);
      await expect(fromTile.getByTestId('go-list-field').nth(2)).toBeFocused();
      await fromTile.getByTestId('go-list-field').nth(2).fill('eyes');
      await fromTile.getByTestId('go-list-keep').click();
      const notice = page.getByTestId('go-notice');
      await expect(notice).toContainText('Added “eyes” to {subjects}');
      await notice.getByRole('button', { name: /^Undo/ }).click();
      let data = await exported(page);
      const block = data.routines.better.items![1] as { id: string; ref: string };
      expect(Object.keys(block).sort()).toEqual(['id', 'ref']);
      expect((data.routines[block.ref] as { each?: unknown }).each).toEqual({ item: 'subject', list: 'subjects', kept: ['arms', 'legs'] });
      await page.goto('./go');
      await expect(settled(page, 'home')).toBeVisible();
      await page.getByTestId('go-tile-kept-add').click();
      const again = await sheet(page, 'go-kept-sheet');
      await again.getByTestId('go-list-field').nth(2).fill('eyes');
      await again.getByTestId('go-list-keep').click();
      await expect(page.getByTestId('go-kept-sheet')).toHaveCount(0);
      data = await exported(page);
      expect(data.routines[block.ref]).toMatchObject({ named: false, words: 'For each subject in {subjects}', each: { item: 'subject', list: 'subjects', kept: ['arms', 'legs', 'eyes'] } });

      // Resumed: on through legs; "eyes", added in this sitting, comes round in the next one.
      await page.goto('./go');
      await expect(settled(page, 'home')).toBeVisible();
      await page.getByTestId('go-tile-resume').click();
      await expect(r.words).toHaveText('Deliberate practice on arms');
      await r.next.click();
      await expect(r.values).toHaveText(['subject: legs']);
      await r.next.click();
      await expect(settled(page, 'home')).toBeVisible();
      await expect(page.getByTestId('go-notice')).toContainText('Done with Become a better drawer');
      await (await planOf(page, 'better')).forward.click();
      await r.next.click();
      await expect(r.values).toHaveText(['subject: arms']);
      await r.next.click();
      await r.next.click();
      await expect(r.words).toHaveText('Deliberate practice on eyes');
      await expect(r.values).toHaveText(['subject: eyes']);
    });

    test('a list of its own asked on arrival, and ▤ {way}: added from A routine (the names first) and “@”; the way chosen as a routine as it is typed, drawn with the mark, stepped into', async ({ page }) => {
      await importBackup(page, goBackup([TRY, GUIDE]));
      const p = await planOf(page, 'try');
      // "@" lists the names given above first — as words, and as routine rows — then the routines.
      await p.add.click();
      await p.add.pressSequentially('@');
      await expect(p.namesBar).toHaveAttribute('data-picking', 'true');
      await expect(p.screen.getByTestId('go-names-slot')).toHaveText(['{subject}', '{way}']);
      await expect(p.screen.getByTestId('go-names-slot').nth(1)).toHaveAccessibleName('Add the routine in {way} as a step');
      await p.add.fill('');
      await p.title.click();
      // Add's "A routine": the names given above first.
      await p.screen.getByTestId('go-plan-add-routine').click();
      const routines = await sheet(page, 'go-routines-sheet');
      await expect(routines.getByTestId('go-routines-sheet-name')).toHaveText(['{subject}', '{way}']);
      await expect(routines.locator('[data-testid="go-routines-sheet-name"], [data-testid="go-routines-sheet-row"]').first()).toHaveAttribute('data-testid', 'go-routines-sheet-name');
      await noSerious(page);
      await rules(page, routines);
      await routines.getByRole('button', { name: 'Add as a step: the routine in {way}', exact: true }).click();
      await expect(page.getByTestId('go-routines-sheet')).toHaveCount(0);
      await expect(p.words).toHaveText(['Pick a subject', 'Choose a way to draw', '{way}']);
      // A for each with its own list, asked each run.
      await p.screen.getByTestId('go-plan-add-each').click();
      const pick = await sheet(page, 'go-each-sheet');
      await pick.getByTestId('go-each-own-name').fill('topics');
      await pick.getByTestId('go-each-own-asked').click();
      await expect(p.typed).toBeFocused();
      await p.typed.fill('Find a guide on {topic}');
      await p.typed.press('Enter');
      await page.keyboard.press('Escape');
      await expect(p.words).toHaveText(['Pick a subject', 'Choose a way to draw', '{way}', 'For each topic in {topics}', 'Find a guide on {topic}']);
      await noSerious(page);
      await rules(page, p.screen);
      if (size.width > 300) await page.screenshot({ path: `${SHOTS}/plan-slot.png` });
      else await page.screenshot({ path: `${SHOTS}/plan-slot-200.png` });
      const data = await exported(page);
      expect(data.routines.try.items![2]).toMatchObject({ text: '{way}', slot: true });

      // Running: the way given as a routine, offered as it is typed.
      await (await planOf(page, 'try')).forward.click();
      const r = runner(page);
      await expect(r.words).toHaveText('Pick a subject');
      await r.field('subject').click();
      let entry = await sheet(page, 'go-entry-sheet');
      await entry.getByTestId('go-entry-field').fill('hands');
      await entry.getByTestId('go-entry-keep').click();
      await r.next.click();
      await expect(r.words).toHaveText('Choose a way to draw');
      await r.field('way').click();
      entry = await sheet(page, 'go-entry-sheet');
      await entry.getByTestId('go-entry-field').fill('guide');
      const offer = entry.getByTestId('go-routine-offer');
      await expect(offer).toHaveText(['Draw with guidelines']);
      await expect(offer).toHaveAccessibleName('Use the routine Draw with guidelines');
      await offer.click();
      await expect(entry.getByTestId('go-entry-field')).toHaveValue('Draw with guidelines');
      await expect(entry.getByTestId('go-entry-routine')).toBeVisible();
      await noSerious(page);
      await rules(page, entry);
      if (size.width > 300) await page.screenshot({ path: `${SHOTS}/entry-routine.png` });
      await entry.getByTestId('go-entry-keep').click();
      await expect(page.getByTestId('go-entry-sheet')).toHaveCount(0);
      // Drawn with the routine mark in the values row.
      await expect(r.values.filter({ hasText: 'way:' }).getByTestId('go-value-routine')).toHaveCount(1);
      await r.next.click();
      // ▤ {way}: the routine held, with Step in.
      await expect(r.words).toHaveText('Draw with guidelines');
      await expect(r.stepIn).toBeVisible();
      await noSerious(page);
      await rules(page, r.screen);
      if (size.width > 300) await page.screenshot({ path: `${SHOTS}/runner-slot.png` });
      else await page.screenshot({ path: `${SHOTS}/runner-slot-200.png` });
      await r.stepIn.click();
      await expect(r.words).toHaveText('Block in hands with guidelines');
      await r.next.click();
      // Out of it: the for each asks for its own list, on its row.
      await expect(r.words).toHaveText('For each topic in {topics}');
      await r.field('topics').click();
      const list = await sheet(page, 'go-list-sheet');
      await list.getByTestId('go-list-field').nth(0).fill('colour theory');
      await list.getByTestId('go-list-keep').click();
      await r.next.click();
      await expect(r.words).toHaveText('Find a guide on colour theory');
      // Nothing the run chose is kept on the routine.
      await page.reload();
      await expect(settled(page, 'runner')).toBeVisible();
      await expect(runner(page).words).toHaveText('Find a guide on colour theory');
      const after = await exported(page);
      expect(after.routines.try).toEqual(data.routines.try);
    });
  });
}
