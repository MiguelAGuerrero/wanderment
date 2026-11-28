/**
 * P-104 (B-17 slices 1 and 4): the library, and P-105 (slice 2): adding a library method from where you write.
 * Done when (the roadmap items): My routines gains a Library view (Yours | Library); a method can be found,
 * previewed, copied (Undo), started by itself and called from another routine; a copy survives reload, export and
 * import; a name already in Yours offers "Open yours"; at 390 px and 200 % text nothing is cut, every target is at
 * least 48 px, the control is a tab list and each row has its full spoken name. "@" and Add's "a routine" list
 * Yours and Library under headings; a library row opens the sheet with Copy and add; one Undo removes both; typing
 * "@" and part of a method's name offers it; nothing is copied by Return; a giving field on the runner lists Yours
 * only; no list appears while the person types their own words. At 390×844 and at 200 % text (195×422).
 *
 * (The house style and the import check of the library itself, and the storage paths below the page, are in
 * src/domain/library.test.ts and src/storage/persistence.test.ts.)
 */
import { AxeBuilder } from '@axe-core/playwright';
import { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { arrived, exported, importBackup, openRoutines, plan, routines, RoutineSpec, runner, seedGo, settled, startGo } from './goFixture';

const SHOTS = '.polish/current/P-104/shots';
const PAPER = 'rgb(244, 241, 232)';

const STUDY: RoutineSpec = { id: 'study', name: 'Study for the exam', steps: ['Read chapter one', 'Sleep'] };
const GUIDE: RoutineSpec = { id: 'guide', name: 'Draw with guidelines', home: false, steps: ['Block in the subject with guidelines'] };
const TRY: RoutineSpec = { id: 'try', name: 'Try a way', steps: [{ text: 'Choose a way to draw', gives: 'way' }, 'Draw it'] };
/** A routine of the person's under a library method's name. */
const THEIRS: RoutineSpec = { id: 'theirs', name: 'Set a cue to start', steps: ['Pick a moment'] };

async function sheet(page: Page, testId: string): Promise<Locator> {
  const s = page.getByTestId(testId);
  await expect(s).toHaveAttribute('data-moving', 'false');
  return s;
}
async function noSerious(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}
/** Targets ≥ 48 px inside the window, text ≥ 16 px, every control named with its visible words, the filled buttons, nothing sideways, nothing cut. */
async function rules(scope: Locator) {
  return scope.evaluate((root, paper) => {
    const shown = (e: Element) => {
      const b = e.getBoundingClientRect();
      return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[inert]');
    };
    const controls = [...root.querySelectorAll('button, [role="button"], [role="tab"], [role="menuitem"], input, textarea')].filter((e) => shown(e) && !e.hasAttribute('data-sr-close'));
    const name = (e: Element) => e.getAttribute('aria-label') || (e as HTMLElement).innerText || (e as HTMLInputElement).placeholder || '';
    const texts = [...root.querySelectorAll('*')].filter((e) => shown(e) && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()));
    return {
      small: controls.filter((e) => e.getBoundingClientRect().width < 47.5 || e.getBoundingClientRect().height < 47.5).map(name),
      outside: controls.filter((e) => e.getBoundingClientRect().left < -0.5 || e.getBoundingClientRect().right > innerWidth + 0.5).map(name),
      unnamed: controls.filter((e) => !name(e).trim()).length,
      tiny: texts.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => e.textContent!.slice(0, 30)),
      // Nothing cut: no text box narrower than its words (no ellipsis, no clipping).
      cut: texts.filter((e) => (e as HTMLElement).scrollWidth > (e as HTMLElement).clientWidth + 1 && getComputedStyle(e).overflow !== 'visible').map((e) => e.textContent!.slice(0, 30)),
      filled: controls.filter((e) => getComputedStyle(e).backgroundColor === paper && e.getAttribute('aria-disabled') !== 'true').map(name),
      // Accessible names hold the visible words (a blank, ▢, is not read: it is spoken "blank").
      label: controls
        .filter((e) => {
          const l = (e.getAttribute('aria-label') ?? '').replace(/[,:]/g, '').toLowerCase();
          const v = ((e as HTMLElement).innerText ?? '').replace(/▢/g, 'blank').trim().replace(/\s+/g, ' ').replace(/[,:]/g, '').toLowerCase();
          return !!l && !!v && !['INPUT', 'TEXTAREA'].includes(e.tagName) && !l.replace(/\s+/g, ' ').includes(v);
        })
        .map(name),
      sideways: document.documentElement.scrollWidth > innerWidth,
    };
  }, PAPER);
}
async function expectRules(scope: Locator, filled: string[]) {
  const r = await rules(scope);
  expect(r.small, 'targets under 48 px').toEqual([]);
  expect(r.outside, 'controls outside the window').toEqual([]);
  expect(r.unnamed, 'unnamed controls').toBe(0);
  expect(r.tiny, 'text under 16 px').toEqual([]);
  expect(r.cut, 'text cut').toEqual([]);
  expect(r.label, 'names that leave out the visible words').toEqual([]);
  expect(r.filled, 'filled buttons').toEqual(filled);
  expect(r.sideways, 'nothing scrolls sideways').toBe(false);
}

/** My routines' library parts. */
const lib = (page: Page) => {
  const screen = settled(page, 'routines');
  return {
    tablist: screen.getByRole('tablist'),
    yoursTab: screen.getByRole('tab', { name: 'Yours', exact: true }),
    libraryTab: screen.getByRole('tab', { name: 'Library', exact: true }),
    headings: screen.getByTestId('go-lib-heading'),
    viewHeadings: screen.getByTestId('go-routines-view-heading'),
    rows: screen.getByTestId('go-lib-row'),
    names: screen.getByTestId('go-lib-name'),
    row: (name: string) => screen.getByTestId('go-lib-row').filter({ has: page.getByTestId('go-lib-name').getByText(name, { exact: true }) }),
  };
};
const planOf = async (page: Page, id: string) => {
  await page.goto(`./go/routine/${id}`);
  await expect(settled(page, 'plan')).toBeVisible();
  return plan(page);
};

for (const size of [
  { name: '390×844', width: 390, height: 844, shot: '' },
  { name: '200 % text (195×422)', width: 195, height: 422, shot: '-200' },
]) {
  test.describe(`at ${size.name}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
    });

    test('My routines opens on Yours; Library is the second view of a tab list — headings, two-line rows (name; its line beside its signature), full spoken names; nothing cut', async ({ page }) => {
      await startGo(page, [], 'home', [STUDY]);
      const r = await openRoutines(page);
      const l = lib(page);
      await expect(l.tablist).toBeVisible();
      await expect(l.tablist.getByRole('tab')).toHaveText(['Yours', 'Library']);
      await expect(l.yoursTab).toHaveAttribute('aria-selected', 'true');
      await expect(l.libraryTab).toHaveAttribute('aria-selected', 'false');
      await expect(r.names).toHaveText(['Study for the exam']);
      await expect(l.rows).toHaveCount(0);
      await l.libraryTab.click();
      await expect(l.libraryTab).toHaveAttribute('aria-selected', 'true');
      await expect(r.names).toHaveCount(0);
      await expect(l.headings).toHaveText(['To learn', 'To check your work', 'To decide', 'To start', 'For a big aim']);
      const recall = l.row('Recall before you look');
      await expect(recall.getByTestId('go-lib-for')).toHaveText('Fixing material in memory');
      await expect(recall.getByTestId('go-lib-sig')).toHaveText('asks {material} · gives {faults}');
      await expect(recall).toHaveAccessibleName('Recall before you look, Fixing material in memory, asks {material} · gives {faults}, in the library');
      await expect(l.row('Learn ▢')).toHaveAccessibleName('Learn blank, Learning a skill by practice, study and use, in the library');
      // Home never mentions it; no badge on what was not copied.
      await expectRules(r.screen, ['New routine']);
      await noSerious(page);
      await page.screenshot({ path: `${SHOTS}/library${size.shot}.png` });
      // Back to Yours.
      await l.yoursTab.click();
      await expect(r.names).toHaveText(['Study for the exam']);
    });

    test('with nothing in Yours it opens on Library (the cold start); Find shows both views under Yours and Library headings, by name only', async ({ page }) => {
      await page.goto('./go/routines');
      const r = routines(page);
      const l = lib(page);
      await expect(l.libraryTab).toHaveAttribute('aria-selected', 'true');
      await expect(l.rows.first()).toBeVisible();
      await startGo(page, [], 'home', [STUDY]);
      await openRoutines(page);
      await r.find.fill('st');
      await expect(l.viewHeadings).toHaveText(['Yours', 'Library']);
      await expect(r.names).toHaveText(['Study for the exam']);
      await expect(l.names).toHaveText(['Set a cue to start']);
      // Names only: a word of a row's line finds nothing.
      await r.find.fill('memory');
      await expect(l.rows).toHaveCount(0);
      await expect(r.none).toHaveText('No routines match.');
      await r.find.fill('recall');
      await expect(r.screen.getByTestId('go-routines-yours-none')).toHaveText('None of yours match.');
      await expect(l.names).toHaveText(['Recall before you look']);
      await expectRules(r.screen, ['New routine']);
      await noSerious(page);
    });

    test('a method: previewed in a sheet (read-only, Copy filled, Close lowest), copied with what it calls — the notice and its Undo — staying on the library; then it is yours', async ({ page }) => {
      await startGo(page, [], 'home', [STUDY]);
      const r = await openRoutines(page);
      const l = lib(page);
      await l.libraryTab.click();
      await l.row('Recall before you look').click();
      const s = await sheet(page, 'go-lib-sheet');
      await expect(s.getByRole('heading', { level: 2 })).toHaveText('Recall before you look');
      await expect(s.getByTestId('go-lib-sheet-sig')).toHaveText('asks {material} · gives {faults}');
      await expect(s.getByTestId('go-lib-step')).toHaveText(['Put {material} out of sight', 'Write down everything you can recall of it', /^Check and mend/]);
      await expect(s.getByTestId('go-lib-with')).toHaveText(['with what I recalled as work', 'with {material} as standard', 'with from memory, with it out of sight again as rule']);
      // Read-only: no grips, menus or Add row — the only controls are the handle, Copy and Close.
      await expect(s.getByRole('button')).toHaveText(['', 'Copy', 'Close']);
      await expect(s.getByTestId('go-lib-copy')).toHaveAccessibleName('Copy Recall before you look');
      const copyBox = (await s.getByTestId('go-lib-copy').boundingBox())!;
      const closeBox = (await s.getByTestId('go-lib-close').boundingBox())!;
      expect(closeBox.y).toBeGreaterThan(copyBox.y);
      await expect(s.getByTestId('go-lib-close')).toBeInViewport();
      await expect(s.getByText('PLAN', { exact: true })).toHaveCount(0);
      await expectRules(s, ['Copy Recall before you look']);
      await noSerious(page);
      await page.screenshot({ path: `${SHOTS}/preview${size.shot}.png` });
      // Close: back to the list where it was, the focus on the row.
      await s.getByTestId('go-lib-close').click();
      await expect(page.getByTestId('go-lib-sheet')).toHaveCount(0);
      await expect(l.row('Recall before you look')).toBeFocused();
      // Copy: the sheet closes, the library stays, the notice names the reach with Undo.
      await l.row('Recall before you look').click();
      await (await sheet(page, 'go-lib-sheet')).getByTestId('go-lib-copy').click();
      await expect(page.getByTestId('go-lib-sheet')).toHaveCount(0);
      await expect(l.libraryTab).toHaveAttribute('aria-selected', 'true');
      await expect(r.notice).toContainText('Copied “Recall before you look” and what it calls');
      await expect(l.row('Recall before you look')).toBeFocused();
      // In place in the library, nothing added for the eye; spoken "yours".
      await expect(l.row('Recall before you look')).toHaveAccessibleName(/, yours$/);
      await expect(l.row('Check and mend')).toHaveAccessibleName(/, yours$/);
      await page.screenshot({ path: `${SHOTS}/copied${size.shot}.png` });
      // Undo takes both away.
      await r.notice.getByRole('button', { name: /^Undo/ }).click();
      await expect(l.row('Recall before you look')).toHaveAccessibleName(/, in the library$/);
      await l.yoursTab.click();
      await expect(r.names).toHaveText(['Study for the exam']);
      // Copied again: in Yours, an ordinary routine (its ···, no badge).
      await l.libraryTab.click();
      await l.row('Recall before you look').click();
      await (await sheet(page, 'go-lib-sheet')).getByTestId('go-lib-copy').click();
      await l.yoursTab.click();
      await expect(r.names).toHaveText(['Check and mend', 'Recall before you look', 'Study for the exam']);
      await expect(r.more('Recall before you look')).toBeVisible();
    });

    test('a name already in Yours offers Open yours, and nothing is copied', async ({ page }) => {
      await startGo(page, [], 'home', [STUDY, THEIRS]);
      await openRoutines(page);
      const l = lib(page);
      await l.libraryTab.click();
      await expect(l.row('Set a cue to start')).toHaveAccessibleName(/, yours$/);
      await l.row('Set a cue to start').click();
      const s = await sheet(page, 'go-lib-sheet');
      await expect(s.getByTestId('go-lib-copy')).toHaveText('Open yours');
      await expectRules(s, ['Open yours: Set a cue to start']);
      await s.getByTestId('go-lib-copy').click();
      await expect(plan(page).title).toHaveText('Set a cue to start');
      await expect(plan(page).words).toHaveText(['Pick a moment']);
      const data = await exported(page);
      expect(Object.values(data.routines).map((x) => x.words).sort()).toEqual(['Set a cue to start', 'Study for the exam']);
    });

    test('a copy is started by itself and called from another routine; it survives a reload, Export and Import, as the person’s own data', async ({ page }) => {
      await startGo(page, [], 'home', [STUDY]);
      await openRoutines(page);
      const l = lib(page);
      await l.libraryTab.click();
      await l.row('Recall before you look').click();
      await (await sheet(page, 'go-lib-sheet')).getByTestId('go-lib-copy').click();
      await page.reload();
      const r = routines(page);
      await expect(r.names).toHaveText(['Check and mend', 'Recall before you look', 'Study for the exam']);
      // Started by itself.
      await r.more('Recall before you look').click();
      await (await arrived(page, 'go-routine-menu')).getByRole('menuitem', { name: 'Start Recall before you look', exact: true }).click();
      await expect(runner(page).words).toHaveText('Put {material} out of sight');
      // Called from another routine: Add's "a routine" lists it under Yours.
      const p = await planOf(page, 'study');
      await p.screen.getByTestId('go-plan-add-routine').click();
      const pick = await sheet(page, 'go-routines-sheet');
      await pick.getByRole('button', { name: /^Add as a step: Recall before you look/ }).click();
      await expect(p.words).toHaveText(['Read chapter one', 'Sleep', 'Recall before you look']);
      // Export: the copies are ordinary routines, nothing of the library in them; imported back, they are there.
      const data = await exported(page);
      const json = JSON.stringify({ app: 'wanderment', exportedAt: new Date().toISOString(), data });
      expect(json).not.toMatch(/lib-/);
      const recall = Object.values(data.routines).find((x) => x.words === 'Recall before you look')!;
      expect(recall).toMatchObject({ named: true });
      await importBackup(page, JSON.stringify({ app: 'wanderment', exportedAt: new Date().toISOString(), data: { ...data, routines: { study: data.routines.study } } }));
      await importBackup(page, json);
      await openRoutinesFrom(page);
      await expect(routines(page).names).toHaveText(['Check and mend', 'Recall before you look', 'Study for the exam']);
    });

    test('P-105: "@" and part of a method’s name offers it under Library, apart from Yours; Return copies nothing; the chip opens the sheet with Copy and add; the routine’s menu Undo removes both', async ({ page }) => {
      await seedGo(page, [STUDY]);
      const p = await planOf(page, 'study');
      await p.add.click();
      // The person's own words: no list.
      await p.add.fill('recall before you look');
      await expect(p.screen.getByTestId('go-names-library')).toHaveCount(0);
      await expect(page.getByTestId('go-names-bar')).toHaveCount(0);
      await p.add.fill('');
      await p.add.pressSequentially('@recall');
      const chip = p.screen.getByTestId('go-names-library');
      await expect(chip).toHaveText(['Recall before you look']);
      await expect(p.screen.getByTestId('go-names-heading')).toHaveText(['Yours: none match', 'Library']);
      await expect(chip).toHaveAccessibleName('Recall before you look, in the library: look before copying');
      await expect(chip).toHaveAttribute('data-lit', 'false');
      if (size.width > 300) await page.screenshot({ path: `${SHOTS}/at-library.png` });
      // Return copies nothing (the words are a step, as an "@" that names none of yours always was).
      await p.add.press('Enter');
      await expect(p.words).toHaveText(['Read chapter one', 'Sleep', '@recall']);
      let data = await exported(page);
      expect(Object.values(data.routines).map((x) => x.words)).toEqual(['Study for the exam']);
      // The chip: the preview, its filled button Copy and add.
      const p2 = await planOf(page, 'study');
      await p2.add.click();
      await p2.add.pressSequentially('@recall');
      await p2.screen.getByTestId('go-names-library').click();
      const s = await sheet(page, 'go-lib-sheet');
      await expect(s.getByTestId('go-lib-copy')).toHaveText('Copy and add');
      await expect(s.getByTestId('go-lib-copy')).toHaveAccessibleName('Copy and add Recall before you look');
      await expectRules(s, ['Copy and add Recall before you look']);
      await noSerious(page);
      await s.getByTestId('go-lib-copy').click();
      await expect(page.getByTestId('go-lib-sheet')).toHaveCount(0);
      await expect(p2.words).toHaveText(['Read chapter one', 'Sleep', '@recall', 'Recall before you look']);
      await expect(p2.add).toHaveValue('');
      // One Undo, from the routine's menu, removes the call and the copy together.
      await p2.screen.getByTestId('go-plan-more').click();
      const menu = await arrived(page, 'go-plan-routine');
      await menu.getByRole('menuitem', { name: /^Undo added “Recall before you look” from the library/ }).click();
      await expect(p2.words).toHaveText(['Read chapter one', 'Sleep', '@recall']);
      data = await exported(page);
      expect(Object.values(data.routines).map((x) => x.words)).toEqual(['Study for the exam']);
    });

    test('P-105: Add’s "a routine" lists Yours and Library under headings; a library row opens the sheet with Copy and add', async ({ page }) => {
      await seedGo(page, [STUDY, GUIDE]);
      const p = await planOf(page, 'study');
      await p.screen.getByTestId('go-plan-add-routine').click();
      const pick = await sheet(page, 'go-routines-sheet');
      await expect(pick.getByTestId('go-routines-sheet-heading')).toHaveText(['Yours', 'Library']);
      await expect(pick.getByTestId('go-routines-sheet-row')).toHaveText(['Draw with guidelines', 'Study for the exam']);
      const row = pick.getByTestId('go-routines-sheet-lib').filter({ hasText: /^Set a cue to start/ });
      await expect(row).toHaveText('Set a cue to start · asks {aim} · gives {cue}');
      await expect(row).toHaveAccessibleName('Set a cue to start · asks {aim} · gives {cue}, in the library: look before copying');
      await expectRules(pick, []);
      await noSerious(page);
      if (size.width > 300) await page.screenshot({ path: `${SHOTS}/add-a-routine.png` });
      await row.click();
      const s = await sheet(page, 'go-lib-sheet');
      await s.getByTestId('go-lib-copy').click();
      await expect(p.words).toHaveText(['Read chapter one', 'Sleep', 'Set a cue to start']);
      const data = await exported(page);
      expect(Object.values(data.routines).map((x) => x.words).sort()).toEqual(['Draw with guidelines', 'Set a cue to start', 'Study for the exam']);
    });

    test('P-105: a giving field on the runner lists Yours only — never the library', async ({ page }) => {
      await startGo(page, [{ id: 'n1', routine: 'try', at: 0, status: 'running' }], 'runner', [TRY, GUIDE]);
      const r = runner(page);
      await expect(r.words).toHaveText('Choose a way to draw');
      await r.field('way').click();
      const entry = await sheet(page, 'go-entry-sheet');
      await entry.getByTestId('go-entry-field').fill('recall');
      await expect(entry.getByTestId('go-routine-offer')).toHaveCount(0);
      await entry.getByTestId('go-entry-field').fill('guide');
      await expect(entry.getByTestId('go-routine-offer')).toHaveText(['Draw with guidelines']);
      await entry.getByTestId('go-entry-field').fill('e');
      await entry.getByTestId('go-entry-field').fill('ch');
      await expect(entry.getByText('Check and mend')).toHaveCount(0);
    });
  });
}

/** My routines from home (after an import, the page is on Settings). */
async function openRoutinesFrom(page: Page) {
  await page.goto('./go/routines');
  await expect(settled(page, 'routines')).toBeVisible();
}
