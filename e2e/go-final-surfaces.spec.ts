/**
 * F-2: the final review's surfaces (`.polish/product/final-audit-surfaces.md`), on the page. Done when (the roadmap
 * item): a template copied under a callee's name refused; Copy says when it uses your routine of that name; "@" list
 * not cut at 200 %; spoken titles without "▢"; Resume naming its routine and saying why it is off; "@…" kept after
 * Close; short hints where they help (owner 2026-11-28: "short text is welcome where it helps … no large text in the
 * main loop") — Where, the pause note, list rows, the step and value fields, Add's "@" and "{", Gives, the read-only
 * Places sheet; and the nits: Yours | Library by ←/→, home's Alt+↑/↓. At 390×844 and at 200 % text (195×422).
 *
 * (Kept lists not read as asks, and the copy's name and notice words, are in src/domain/f2.test.ts and
 * src/store/f2.test.ts.)
 */
import { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { arrived, exported, goBackup, home, importBackup, openRoutines, plan, planMenu, RoutineSpec, runner, seedGo, settled, startGo, tile, editPlan } from './goFixture';

const STUDY: RoutineSpec = { id: 'study', name: 'Study for the exam', steps: ['Read chapter one', 'Sleep'] };
const MEND: RoutineSpec = { id: 'mend', name: 'Check and mend', steps: ['Wash the car'] };
const LONG: RoutineSpec = { id: 'long', name: 'Document the iteration of the whole application', steps: ['Write it down'] };
const TEA: RoutineSpec = { id: 'tea', name: 'Make tea', steps: ['Pour', 'Drink'] };
const APPLY: RoutineSpec = { id: 'apply', name: 'Apply to Initech', steps: ['Read the ad', 'Tailor the CV'] };
const GIVING: RoutineSpec = { id: 'give', name: 'Wrap a present', steps: [{ text: 'Choose the gift', gives: 'gift' }, 'Wrap {gift}'] };

async function sheet(page: Page, testId: string): Promise<Locator> {
  const s = page.getByTestId(testId);
  await expect(s).toHaveAttribute('data-moving', 'false');
  return s;
}
const planOf = async (page: Page, id: string) => {
  await page.goto(`./go/routine/${id}`);
  await expect(settled(page, 'plan')).toBeVisible();
  // (P-115, rewritten: Plan opens read-only — these specs edit it, so its opener enters Edit.)
  await editPlan(page);
  return plan(page);
};
/** Nothing cut and nothing past the window, in `scope`: controls inside the window, no text box narrower than its words. */
async function notCut(scope: Locator) {
  const r = await scope.evaluate((root) => {
    const shown = (e: Element) => {
      const b = e.getBoundingClientRect();
      return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden';
    };
    const controls = [...root.querySelectorAll('button, [role="button"]')].filter(shown);
    const texts = [...root.querySelectorAll('*')].filter((e) => shown(e) && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()));
    return {
      outside: controls.filter((e) => e.getBoundingClientRect().left < -0.5 || e.getBoundingClientRect().right > innerWidth + 0.5).map((e) => e.getAttribute('aria-label')),
      cut: texts.filter((e) => (e as HTMLElement).scrollWidth > (e as HTMLElement).clientWidth + 1 && getComputedStyle(e).overflow !== 'visible').map((e) => e.textContent!.slice(0, 30)),
      past: texts.filter((e) => e.getBoundingClientRect().right > innerWidth + 0.5).map((e) => e.textContent!.slice(0, 30)),
      sideways: document.documentElement.scrollWidth > innerWidth,
    };
  });
  expect(r.outside, 'controls outside the window').toEqual([]);
  expect(r.cut, 'text cut').toEqual([]);
  expect(r.past, 'text past the window').toEqual([]);
  expect(r.sideways, 'nothing scrolls sideways').toBe(false);
}

for (const size of [
  { name: '390×844', width: 390, height: 844 },
  { name: '200 % text (195×422)', width: 195, height: 422 },
]) {
  test.describe(`at ${size.name}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
    });

    test('audit F5: the "@" list — Yours’ and the Library’s long names wrap, never cut or past the window', async ({ page }) => {
      await seedGo(page, [STUDY, LONG]);
      const p = await planOf(page, 'study');
      await p.add.click();
      await p.add.pressSequentially('@Doc');
      const mine = p.namesBar.getByTestId('go-names-routine');
      await expect(mine).toHaveCount(1);
      await notCut(p.namesBar);
      await p.add.fill('');
      await p.add.pressSequentially('@rec');
      await expect(p.namesBar.getByTestId('go-names-library').first()).toBeVisible();
      await notCut(p.namesBar);
    });

    test('audit F9: "@…" typed, a library row’s preview opened, then Close: the field holds what was typed', async ({ page }) => {
      await seedGo(page, [STUDY]);
      const p = await planOf(page, 'study');
      await p.add.click();
      await p.add.pressSequentially('Read @rec');
      await p.namesBar.getByTestId('go-names-library').first().click();
      const s = await sheet(page, 'go-lib-sheet');
      await s.getByTestId('go-lib-close').click();
      await expect(page.getByTestId('go-lib-sheet')).toHaveCount(0);
      await expect(p.add).toHaveValue('Read @rec');
      // Nothing was copied.
      expect(Object.values((await exported(page)).routines).filter((r) => r.named).map((r) => r.words)).toEqual(['Study for the exam']);
    });

    test('audit F7: the preview and Copy… sheets of a template are spoken "Learn blank"; what scrolls is not named again', async ({ page }) => {
      await startGo(page, [], 'home', [STUDY]);
      await openRoutines(page);
      await settled(page, 'routines').getByRole('tab', { name: 'Library', exact: true }).click();
      await settled(page, 'routines').getByTestId('go-lib-row').filter({ has: page.getByTestId('go-lib-name').getByText('Learn ▢', { exact: true }) }).click();
      let s = await sheet(page, 'go-lib-sheet');
      await expect(page.getByRole('dialog', { name: 'Learn blank', exact: true })).toBeVisible();
      await expect(s.getByRole('heading', { level: 2 })).toHaveAccessibleName('Learn blank');
      await expect(s.getByRole('heading', { level: 2 })).toHaveText('Learn ▢');
      await expect(s.getByRole('region')).toHaveAccessibleName('Steps');
      await s.getByTestId('go-lib-copy').click();
      s = await sheet(page, 'go-lib-name-sheet');
      await expect(page.getByRole('dialog', { name: 'Learn blank', exact: true })).toBeVisible();
      await expect(s.getByRole('heading', { level: 2 })).toHaveAccessibleName('Learn blank');
      await expect(s.getByRole('region')).toHaveAccessibleName('Your copy');
      const names = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"], [role="heading"], [role="region"]')].map((e) => e.getAttribute('aria-label') ?? ''));
      expect(names.filter((n) => n.includes('▢'))).toEqual([]);
    });

    test('audit F2: a template copied under the name of a routine it calls is refused in words, and nothing is written', async ({ page }) => {
      await startGo(page, [], 'home', [STUDY]);
      const before = await exported(page);
      await page.goto('./go');
      await openRoutines(page);
      await settled(page, 'routines').getByRole('tab', { name: 'Library', exact: true }).click();
      await settled(page, 'routines').getByTestId('go-lib-row').filter({ has: page.getByTestId('go-lib-name').getByText('Learn ▢', { exact: true }) }).click();
      await (await sheet(page, 'go-lib-sheet')).getByTestId('go-lib-copy').click();
      const s = await sheet(page, 'go-lib-name-sheet');
      await s.getByTestId('go-lib-name-field').fill('Practise at the edge');
      await s.getByTestId('go-lib-name-copy').click();
      await expect(s.getByTestId('go-lib-name-error')).toHaveText('! A routine already uses that name');
      await expect(page.getByTestId('go-lib-name-sheet')).toBeVisible();
      expect((await exported(page)).routines).toEqual(before.routines);
    });

    test('audit F3: Copy and add of a method that calls your own routine of a name says so, with its Undo', async ({ page }) => {
      await seedGo(page, [STUDY, MEND]);
      const p = await planOf(page, 'study');
      await p.add.click();
      await p.add.pressSequentially('@recall');
      await p.namesBar.getByTestId('go-names-library').first().click();
      await (await sheet(page, 'go-lib-sheet')).getByTestId('go-lib-copy').click();
      await expect(p.notice).toContainText('Added “Recall before you look” from the library, which uses your “Check and mend”');
      await expect(p.undo).toBeVisible();
    });

    test('audit F7, F8: home’s filled Resume names its routine; off while another run is running, it says why', async ({ page }) => {
      await startGo(page, [{ id: 't', routine: 'tea', at: 0, startedDaysAgo: 5 }, { id: 'a', routine: 'apply', at: 1, startedDaysAgo: 2, status: 'running' }], 'runner', [TEA, APPLY]);
      await page.goBack();
      const h = home(page);
      const resume = h.screen.getByTestId('go-resume');
      await expect(resume).toHaveText('Resume Pour');
      // Its name stays its words (go-queue.spec.ts); the routine, and why it is off, are its description.
      await expect(resume).toHaveAccessibleName('Resume Pour');
      await expect(resume).toHaveAccessibleDescription('In Make tea “Apply to Initech” is running. Pause it first.');
      await expect(resume).toBeDisabled();
      await expect(h.screen.getByTestId('go-resume-why')).toHaveText('“Apply to Initech” is running. Pause it first.');
      // Paused: on, and nothing to explain.
      await tile(page, 'Apply to Initech').getByTestId('go-tile-body').click();
      await runner(page).pause.click();
      await (await arrived(page, 'go-pause-sheet')).getByTestId('go-pause-confirm').click();
      await expect(home(page).screen.getByTestId('go-resume')).toBeEnabled();
      await expect(home(page).screen.getByTestId('go-resume-why')).toHaveCount(0);
      await expect(home(page).screen.getByTestId('go-resume')).toHaveAccessibleDescription(/^In /);
    });
  });
}

test.describe('short hints (owner 2026-11-28: a placeholder, a label or one line saying what a field accepts or how a thing works)', () => {
  test('Plan: the empty Add row says how "@" and "{" work while it has the focus; Gives says what its name is for', async ({ page }) => {
    await seedGo(page, [STUDY]);
    const p = await planOf(page, 'study');
    await expect(p.screen.getByTestId('go-plan-add-hint')).toHaveCount(0);
    await p.add.click();
    await expect(p.screen.getByTestId('go-plan-add-hint')).toHaveText('Type @ for a routine, { for a value');
    await p.add.pressSequentially('Rest');
    await expect(p.screen.getByTestId('go-plan-add-hint')).toHaveCount(0);
    await p.add.fill('');
    await planMenu(page, 'Read chapter one', 'Gives…');
    const g = await arrived(page, 'go-gives-sheet');
    await g.getByTestId('go-gives-name').fill('notes');
    await expect(g.getByTestId('go-gives-hint')).toHaveText('Later steps read it as {notes}');
    await g.getByTestId('go-gives-name').fill('');
    await expect(g.getByTestId('go-gives-name')).toHaveAttribute('placeholder', 'e.g. photos');
    await expect(g.getByTestId('go-gives-hint')).toHaveText('A name, for later steps to read');
  });

  test('Places: Where says what it takes; a sheet of places this version cannot change says so in one line', async ({ page }) => {
    const OWN: RoutineSpec = { ...STUDY, places: [{ id: 'p1', name: 'Notes', where: 'https://example.com/notes' }] };
    const ODD: RoutineSpec = { id: 'odd', name: 'Crafted', steps: ['Look around'], places: [{ id: 'x', name: 'One', where: 'a' }, { id: 'x', name: 'Two', where: 'b' }] };
    await seedGo(page, [OWN, ODD]);
    let p = await planOf(page, 'study');
    await p.more('Study for the exam').click();
    await (await arrived(page, 'go-plan-routine')).getByRole('menuitem', { name: 'Places for Study for the exam', exact: true }).click();
    let s = await arrived(page, 'go-places-sheet');
    await expect(s.getByTestId('go-places-readonly')).toHaveCount(0);
    await s.getByTestId('go-places-add').click();
    await expect(s.getByTestId('go-place-where-hint')).toHaveText('A web address, or where it is in words');
    await page.keyboard.press('Escape');
    // (Its routine's menu offers no Places… for them; the names under Plan's heading open the sheet.)
    p = await planOf(page, 'odd');
    await p.screen.getByTestId('go-plan-place').first().click();
    s = await arrived(page, 'go-places-sheet');
    await expect(s.getByTestId('go-places-add')).toHaveCount(0);
    await expect(s.getByTestId('go-places-readonly')).toHaveText('Saved by a newer version of the app: read only here');
  });

  test('Places from a home tile’s door (open only) say where they change', async ({ page }) => {
    const OWN: RoutineSpec = { ...STUDY, places: [{ id: 'p1', name: 'Notes', where: 'https://example.com/notes' }] };
    await startGo(page, [{ id: 's', routine: 'study', at: 0, startedDaysAgo: 1 }], 'home', [OWN]);
    await tile(page, 'Study for the exam').getByRole('button', { name: 'Places for Study for the exam', exact: true }).click();
    const s = await arrived(page, 'go-places-sheet');
    await expect(s.getByTestId('go-places-readonly')).toHaveText('Change these in Plan');
  });

  test('the runner: the pause note, the step’s entry field and the value sheet’s field each say what they take', async ({ page }) => {
    await startGo(page, [{ id: 'g1', routine: 'give', at: 0, status: 'running' }], 'runner', [GIVING]);
    const r = runner(page);
    await r.field('gift').click();
    const entry = await arrived(page, 'go-entry-sheet');
    await expect(entry.getByTestId('go-entry-field')).toHaveAttribute('placeholder', 'Any words, or a routine’s name');
    await entry.getByTestId('go-entry-field').fill('a scarf');
    await entry.getByTestId('go-entry-keep').click();
    await r.next.click();
    await r.values.first().click();
    const vs = await arrived(page, 'go-value-sheet');
    await expect(vs.getByTestId('go-value-sheet-field')).toHaveAttribute('placeholder', 'Any words; empty clears it');
    await page.keyboard.press('Escape');
    await r.pause.click();
    const ps = await arrived(page, 'go-pause-sheet');
    await expect(ps.getByTestId('go-pause-note')).toHaveAttribute('placeholder', 'Where you left off, what’s next (optional)');
    await expect(ps.getByTestId('go-pause-note')).toHaveAccessibleName('Note');
  });

  test('a list’s rows say one item each', async ({ page }) => {
    // A routine with a for each over its own kept list (as a copied template has).
    const file = JSON.parse(goBackup([{ id: 'draw', name: 'Draw subjects', steps: ['Warm up'] }]));
    const routines = file.data.routines as Record<string, { items: unknown[] } & Record<string, unknown>>;
    routines.draw.items.push({ id: 'row', ref: 'each' });
    routines.each = { id: 'each', words: 'For each subject', named: false, createdAt: routines.draw.createdAt, items: [{ id: 'e1', text: 'Draw {subject}' }], each: { item: 'subject', list: 'subjects', kept: [] } };
    await importBackup(page, JSON.stringify(file));
    const p = await planOf(page, 'draw');
    await p.row('For each subject in {subjects}').getByTestId('go-plan-kept-add').click();
    const kept = await sheet(page, 'go-kept-sheet');
    await expect(kept.getByTestId('go-list-field').first()).toHaveAttribute('placeholder', 'One item per row');
  });
});

test.describe('nits', () => {
  test('audit F11: Yours | Library is one Tab stop; ←/→ choose and move to the other tab', async ({ page }) => {
    await startGo(page, [], 'home', [STUDY]);
    await openRoutines(page);
    const screen = settled(page, 'routines');
    const yours = screen.getByRole('tab', { name: 'Yours', exact: true });
    const library = screen.getByRole('tab', { name: 'Library', exact: true });
    await expect(yours).toHaveAttribute('aria-selected', 'true');
    await expect(library).toHaveAttribute('tabindex', '-1');
    await yours.focus();
    await page.keyboard.press('ArrowRight');
    await expect(library).toHaveAttribute('aria-selected', 'true');
    await expect(library).toBeFocused();
    await expect(yours).toHaveAttribute('tabindex', '-1');
    await page.keyboard.press('ArrowLeft');
    await expect(yours).toHaveAttribute('aria-selected', 'true');
    await expect(yours).toBeFocused();
  });

  test('audit F13: home’s rows move by Alt+↑ / Alt+↓ while the focus is in one; the grip says so; the focus stays', async ({ page }) => {
    await startGo(page, [{ id: 't', routine: 'tea', at: 0, startedDaysAgo: 5 }, { id: 'a', routine: 'apply', at: 1, startedDaysAgo: 2 }], 'home', [TEA, APPLY]);
    const h = home(page);
    const order = () => h.tiles.evaluateAll((els) => els.map((e) => e.getAttribute('data-routine')));
    expect(await order()).toEqual(['tea', 'apply']);
    await expect(h.screen.getByTestId('go-tile-grip').first().getByRole('button')).toHaveAttribute('aria-keyshortcuts', 'Alt+ArrowUp Alt+ArrowDown');
    const body = tile(page, 'Make tea').getByTestId('go-tile-body');
    await body.focus();
    await page.keyboard.press('Alt+ArrowUp');
    expect(await order()).toEqual(['tea', 'apply']);
    await page.keyboard.press('Alt+ArrowDown');
    await expect.poll(order).toEqual(['apply', 'tea']);
    await expect(tile(page, 'Make tea').getByTestId('go-tile-body')).toBeFocused();
    await expect(h.notice).toContainText('Moved “Make tea” down');
  });
});
