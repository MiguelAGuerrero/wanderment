/**
 * P-109 (B-18 slice 1; owner, 2026-11-27: "Let's build the references"). Done when (the roadmap item): Places… in
 * Plan's routine menu (a sheet: rows of name + where; add, change, reorder, remove, each with Undo); the names
 * under Plan's heading; the list in the runner's pull-up panel (never on the runner's face); one door on a home
 * tile only when the routine has places; an address typed in a step, a value or the pause note gets an "Open
 * <host>" row in the panel and the value sheet; a Where that is plain words opens nothing; ONLY http: and https:
 * addresses may be opened — anything else, including from an import, shows as words; `places` survive every
 * storage path (here: a reload, Export and Import — the rest are in src/storage/persistence.test.ts); a routine
 * with none shows nothing new. Every line at 390×844 and at 200 % text (195×422): nothing cut, targets ≥ 48 px.
 *
 * Opening is watched, not done: `window.open` is replaced before the app loads and records each call — the
 * address, the target and the features (`noopener`).
 */
import { AxeBuilder } from '@axe-core/playwright';
import { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { arrived, chooseBackup, exported, goBackup, home, IMPORTED, menuItems, openSettings, pauseRun, plan, planFromRoutines, RoutineSpec, runner, RunSpec, startGo, tile } from './goFixture';

const PAPER = 'rgb(244, 241, 232)';
const NOTION = 'https://www.notion.so/team/Product-design-1a2b3c';
const GDOC = 'https://docs.google.com/document/d/1AbC-dEf/edit';
const FIGMA = 'https://www.figma.com/file/XyZ/Sketches';

/** The person's routine, with three places: a Notion page, a Google Doc and words. */
const DESIGN: RoutineSpec = {
  id: 'design',
  name: 'Product design',
  steps: [`Read the brief at ${GDOC} and note where I left off`, { text: 'Pick the page to work in', gives: 'page' }, 'Work in {page}'],
  places: [
    { id: 'pl-doc', name: 'Design doc', where: NOTION },
    { id: 'pl-brief', name: 'The brief', where: GDOC },
    { id: 'pl-book', name: 'Sketchbook', where: 'left shelf, the grey one' },
  ],
};
/** A routine with no places at all: nothing new anywhere. */
const PLAIN: RoutineSpec = { id: 'plain', name: 'Tidy the desk', steps: ['Clear the desk', 'Wipe it down'] };
/** What a crafted backup could hold: every Where that must stay words. */
const UNSAFE = ['javascript:alert(document.domain)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>alert(1)</script>', 'file:///etc/passwd', 'vbscript:msgbox(1)', 'notion://www.notion.so/x', '/relative/path'];
const TRAPS: RoutineSpec = { id: 'traps', name: 'Crafted', steps: ['Look around'], places: UNSAFE.map((where, i) => ({ id: `u${i}`, name: `Trap ${i}`, where })) };

/** `window.open`, recorded instead of done (every call: address, target, features). */
async function watchOpen(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __opened: unknown[][] };
    w.__opened = [];
    window.open = ((...args: unknown[]) => {
      w.__opened.push(args.map((a) => (a === undefined ? null : String(a))));
      return null;
    }) as typeof window.open;
  });
}
const opened = (page: Page) => page.evaluate(() => (window as unknown as { __opened: string[][] }).__opened);
const expectOpened = async (page: Page, calls: string[][]) => expect.poll(() => opened(page)).toEqual(calls);

async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = serious.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => `${n.target.join(' ')} ${n.html.slice(0, 200)}`).slice(0, 5).join('\n  ')}`);
  expect(report, report.join('\n')).toEqual([]);
}

/** Every control in `scope` at least 48×48 and inside the window; every text at least 16 px and never cut; the filled buttons. */
async function rules(scope: Locator) {
  return scope.evaluate((root, paper) => {
    const shown = (e: Element) => {
      const b = e.getBoundingClientRect();
      // (Not what is only for a screen reader: a 1-px heading.)
      return b.width > 1 && b.height > 1 && !e.closest('[inert]');
    };
    const controls = [...root.querySelectorAll('button, [role="button"], [role="link"], [role="menuitem"], input, textarea')].filter((e) => shown(e) && !e.hasAttribute('data-sr-close'));
    const name = (e: Element) => e.getAttribute('aria-label') || (e as HTMLElement).innerText || '';
    const small = controls.filter((e) => e.getBoundingClientRect().width < 47.5 || e.getBoundingClientRect().height < 47.5).map(name);
    const outside = controls.filter((e) => e.getBoundingClientRect().left < -0.5 || e.getBoundingClientRect().right > innerWidth + 0.5).map(name);
    const texts = [...root.querySelectorAll('*')].filter((e) => shown(e) && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()));
    const tiny = texts.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => e.textContent!.slice(0, 30));
    // Never cut: no text wider than its box (it wraps), none past the window's right edge.
    const cut = texts.filter((e) => (e as HTMLElement).scrollWidth > (e as HTMLElement).clientWidth + 1 || e.getBoundingClientRect().right > innerWidth + 0.5).map((e) => e.textContent!.slice(0, 30));
    const filled = controls.filter((e) => getComputedStyle(e).backgroundColor === paper).map(name);
    return { small, outside, tiny, cut, filled, sideways: document.documentElement.scrollWidth > innerWidth };
  }, PAPER);
}
async function expectRules(scope: Locator, filled: string[]) {
  const r = await rules(scope);
  expect(r.small, 'targets under 48 px').toEqual([]);
  expect(r.outside, 'controls outside the window').toEqual([]);
  expect(r.tiny, 'text under 16 px').toEqual([]);
  expect(r.cut, 'text cut').toEqual([]);
  expect(r.filled, 'filled buttons').toEqual(filled);
  expect(r.sideways, 'nothing scrolls sideways').toBe(false);
}

/** Plan's routine ··· → Places…: the sheet, arrived. */
async function openPlaces(page: Page, name: string) {
  await plan(page).more(name).click();
  await (await arrived(page, 'go-plan-routine')).getByRole('menuitem', { name: `Places for ${name}`, exact: true }).click();
  return arrived(page, 'go-places-sheet');
}
const rows = (sheet: Locator) => sheet.getByTestId('go-place');
/** A row's ··· → one of its items. */
async function placeMenu(page: Page, sheet: Locator, name: string, item: string) {
  await sheet.getByRole('button', { name: `More for ${name}`, exact: true }).click();
  await (await arrived(page, 'go-place-menu')).getByRole('menuitem', { name: item, exact: true }).click();
  await expect(page.getByTestId('go-place-menu')).toHaveCount(0);
}
async function addPlace(sheet: Locator, name: string, where: string) {
  await sheet.getByTestId('go-places-add').click();
  await sheet.getByTestId('go-place-name').fill(name);
  await sheet.getByTestId('go-place-where').fill(where);
  await sheet.getByTestId('go-place-keep').click();
  await expect(sheet.getByTestId('go-place-form')).toHaveCount(0);
}
const paused = (routine: string, at: number, extra: Partial<RunSpec> = {}): RunSpec => ({ id: `run-${routine}`, routine, at, ...extra });

for (const size of [
  { name: '390×844', width: 390, height: 844 },
  { name: '200 % text (195×422)', width: 195, height: 422 },
]) {
  test.describe(`at ${size.name}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await watchOpen(page);
    });

    test('Places… in Plan’s routine menu: add (an address shows its host, words show in full), change, reorder and remove — each with Undo; the names under the heading wrap and are never cut', async ({ page }) => {
      await startGo(page, [], 'home', [{ ...PLAIN, id: 'design', name: 'Product design' }]);
      await planFromRoutines(page, 'Product design');
      const p = plan(page);
      // None yet: nothing new under the heading.
      await expect(page.getByTestId('go-plan-places')).toHaveCount(0);
      let sheet = await openPlaces(page, 'Product design');
      await expect(sheet.getByRole('heading', { level: 2 })).toHaveText('Places for Product design');
      await expect(rows(sheet)).toHaveCount(0);
      // Add a place: Name and Where, the filled Add (unavailable until both are typed).
      await sheet.getByTestId('go-places-add').click();
      await expect(sheet.getByTestId('go-place-name')).toBeFocused();
      await expect(sheet.getByTestId('go-place-keep')).toBeDisabled();
      await expectRules(sheet, []);
      await sheet.getByTestId('go-place-name').fill('Design doc');
      await sheet.getByTestId('go-place-where').fill(` ${NOTION} `);
      await expectRules(sheet, ['Add Design doc']);
      await sheet.getByTestId('go-place-keep').click();
      await expect(rows(sheet)).toHaveText(['Design doc notion.so']);
      // Said, with its Undo (and ×).
      const notice = sheet.getByTestId('go-notice');
      await expect(notice).toContainText('Added “Design doc”');
      await notice.getByRole('button', { name: /^Undo/ }).click();
      await expect(rows(sheet)).toHaveCount(0);
      await addPlace(sheet, 'Design doc', NOTION);
      await addPlace(sheet, 'Sketchbook', 'left shelf, the grey one');
      await addPlace(sheet, 'The brief', GDOC);
      await expect(rows(sheet)).toHaveText(['Design doc notion.so', 'Sketchbook left shelf, the grey one', 'The brief docs.google.com']);
      // An address is a link, spoken with its host; words are words.
      await expect(sheet.getByRole('link', { name: 'Open Design doc, notion.so', exact: true })).toBeVisible();
      await expect(sheet.getByRole('link')).toHaveCount(2);
      await expect(sheet.getByLabel('Sketchbook, left shelf, the grey one', { exact: true })).toBeVisible();
      await expectRules(sheet, []);
      await expectNoSeriousViolations(page);
      // A row's ··· — an anchored menu: Change · Move up · Move down · a line · Remove.
      await sheet.getByRole('button', { name: 'More for Design doc', exact: true }).click();
      const menu = await arrived(page, 'go-place-menu');
      await expect(menuItems(menu)).toHaveText(['Change', 'Move up', 'Move down', 'Remove']);
      await expect(menu.getByRole('menuitem', { name: 'Move Design doc up', exact: true })).toBeDisabled();
      await expect(menu.getByRole('menuitem', { name: 'Remove Design doc', exact: true })).toHaveAttribute('data-danger', 'true');
      await expect(menu.getByRole('menuitem').first()).toBeFocused();
      // Esc closes the menu only; the sheet stays.
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('go-place-menu')).toHaveCount(0);
      await expect(sheet).toBeVisible();
      // Change: the row's two fields, the filled Keep.
      await placeMenu(page, sheet, 'Sketchbook', 'Change Sketchbook');
      await expect(sheet.getByTestId('go-place-name')).toHaveValue('Sketchbook');
      await expect(sheet.getByTestId('go-place-where')).toHaveValue('left shelf, the grey one');
      await sheet.getByTestId('go-place-where').fill('second shelf');
      await sheet.getByTestId('go-place-keep').click();
      await expect(rows(sheet)).toHaveText(['Design doc notion.so', 'Sketchbook second shelf', 'The brief docs.google.com']);
      await expect(notice).toContainText('Changed “Sketchbook”');
      await notice.getByRole('button', { name: /^Undo/ }).click();
      await expect(rows(sheet).nth(1)).toHaveText('Sketchbook left shelf, the grey one');
      // Reorder: one press, one row; Undo.
      await placeMenu(page, sheet, 'The brief', 'Move The brief up');
      await expect(rows(sheet)).toHaveText(['Design doc notion.so', 'The brief docs.google.com', 'Sketchbook left shelf, the grey one']);
      await expect(notice).toContainText('Moved “The brief”');
      await notice.getByRole('button', { name: /^Undo/ }).click();
      await expect(rows(sheet)).toHaveText(['Design doc notion.so', 'Sketchbook left shelf, the grey one', 'The brief docs.google.com']);
      await placeMenu(page, sheet, 'Design doc', 'Move Design doc down');
      await expect(rows(sheet)).toHaveText(['Sketchbook left shelf, the grey one', 'Design doc notion.so', 'The brief docs.google.com']);
      // Remove: said, with Undo; × puts the notice away and changes nothing.
      await placeMenu(page, sheet, 'The brief', 'Remove The brief');
      await expect(rows(sheet)).toHaveCount(2);
      await expect(notice).toContainText('Removed “The brief”');
      await notice.getByRole('button', { name: /^Undo/ }).click();
      await expect(rows(sheet)).toHaveCount(3);
      await placeMenu(page, sheet, 'The brief', 'Remove The brief');
      await notice.getByRole('button', { name: 'Dismiss', exact: true }).click();
      await expect(sheet.getByTestId('go-notice')).toHaveCount(0);
      await expect(rows(sheet)).toHaveText(['Sketchbook left shelf, the grey one', 'Design doc notion.so']);
      await sheet.getByTestId('go-places-close').click();
      await expect(page.getByTestId('go-places-sheet')).toHaveCount(0);
      // The last change's Undo is in the routine's menu too, as every Plan edit's.
      await p.more('Product design').click();
      await expect((await arrived(page, 'go-plan-routine')).getByTestId('go-plan-undo')).toHaveText('Undo removed “The brief”');
      await page.keyboard.press('Escape');
      // Under the heading: the names in a line, each a full target; at 200 % text it wraps, nothing cut.
      const line = page.getByTestId('go-plan-places');
      await expect(line.getByTestId('go-plan-place')).toHaveText(['Sketchbook', 'Design doc']);
      await expect(line.getByRole('button', { name: 'Open Design doc, notion.so', exact: true })).toBeVisible();
      await expectRules(line, []);
      await expectNoSeriousViolations(page);
      // An address opens (a new browsing context, noopener); Plan stays as it was.
      await line.getByRole('button', { name: 'Open Design doc, notion.so', exact: true }).click();
      await expectOpened(page, [[NOTION, '_blank', 'noopener']]);
      await expect(p.title).toHaveText('Product design');
      // Words open the Places sheet at that row.
      await line.getByRole('button', { name: 'Sketchbook, left shelf, the grey one', exact: true }).click();
      sheet = await arrived(page, 'go-places-sheet');
      await expect(sheet.getByTestId('go-place-words').first()).toBeFocused();
      await expectOpened(page, [[NOTION, '_blank', 'noopener']]);
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('go-places-sheet')).toHaveCount(0);

      // They survive a reload, and go out in Export.
      await page.reload();
      await expect(plan(page).title).toHaveText('Product design');
      await expect(page.getByTestId('go-plan-place')).toHaveText(['Sketchbook', 'Design doc']);
      const data = await exported(page);
      expect((data.routines.design.places as { name: string; where: string }[]).map((x) => [x.name, x.where])).toEqual([
        ['Sketchbook', 'left shelf, the grey one'],
        ['Design doc', NOTION],
      ]);
    });

    test('the home tile has one door only when its routine has places: "Places for <routine>" opens the list to open, nothing to edit', async ({ page }) => {
      await startGo(page, [paused('design', 2), paused('plain', 1)], 'home', [DESIGN, PLAIN]);
      const t = tile(page, 'Product design');
      const door = t.getByRole('button', { name: 'Places for Product design', exact: true });
      await expect(door).toBeVisible();
      await expect(tile(page, 'Tidy the desk').getByTestId('go-tile-places')).toHaveCount(0);
      // In the tile's foot after Resume and Plan, before ··· (the UI audit: beside the name it squeezed the name).
      const d = (await door.boundingBox())!;
      const resume = (await t.getByTestId('go-tile-resume').boundingBox())!;
      expect(d.y).toBeGreaterThanOrEqual(resume.y - 1);
      expect(await t.locator('[data-testid^="go-tile-"][role="button"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')))).toEqual(['go-tile-body', 'go-tile-resume', 'go-tile-places', 'go-tile-more']);
      await expectRules(home(page).screen, ['Resume Work in {page}']); // (P-100, rewritten: was [] — the top row's Resume is the one filled button.)
      await expectNoSeriousViolations(page);
      await door.click();
      const sheet = await arrived(page, 'go-places-sheet');
      await expect(rows(sheet)).toHaveText(['Design doc notion.so', 'The brief docs.google.com', 'Sketchbook left shelf, the grey one']);
      await expect(sheet.getByTestId('go-places-add')).toHaveCount(0);
      await expect(sheet.getByTestId('go-place-more')).toHaveCount(0);
      await expectRules(sheet, []);
      await expectNoSeriousViolations(page);
      await sheet.getByRole('link', { name: 'Open The brief, docs.google.com', exact: true }).click();
      await expectOpened(page, [[GDOC, '_blank', 'noopener']]);
      await sheet.getByTestId('go-places-close').click();
      await expect(door).toBeFocused();
      // Nothing moved: both runs are where they were.
      await expect(tile(page, 'Product design').getByTestId('go-tile-line')).toHaveText('at Work in {page}');
    });

    test('the runner: places only in the pull-up panel (never on its face); opening one keeps the run exactly where it is; typed addresses get "Open <host>" in the panel and the value sheet', async ({ page }) => {
      const value = { name: 'page', items: [NOTION], level: 0, seq: 'design', item: 'design-1', words: 'Pick the page to work in', at: new Date().toISOString() };
      await startGo(page, [paused('design', 2, { status: 'running', values: [value], reason: `left off at ${FIGMA} section 3` })], 'runner', [DESIGN]);
      const r = runner(page);
      await expect(r.words).toHaveText(/Work in/);
      // Nothing of places on the runner's face.
      await expect(r.screen.getByTestId('go-place')).toHaveCount(0);
      await expect(r.screen.getByTestId('go-open-address')).toHaveCount(0);
      await expect(r.screen.getByText('Places', { exact: true })).toHaveCount(0);
      await r.handle.click();
      await expect(r.panel).toBeVisible();
      const places = r.panel.getByTestId('go-panel-places');
      await expect(places.getByRole('heading')).toHaveText('Places');
      await expect(places.getByTestId('go-place')).toHaveText(['Design doc notion.so', 'The brief docs.google.com', 'Sketchbook left shelf, the grey one']);
      // The value (Notion) and the note (Figma) — each once; the step's words hold none here.
      await expect(r.panel.getByTestId('go-open-address')).toHaveText(['Open notion.so', 'Open figma.com']);
      await expectRules(r.panel, []);
      await expectNoSeriousViolations(page);
      const url = page.url();
      await places.getByRole('link', { name: 'Open Design doc, notion.so', exact: true }).click();
      await r.panel.getByRole('button', { name: 'Open figma.com', exact: true }).click();
      await expectOpened(page, [
        [NOTION, '_blank', 'noopener'],
        [FIGMA, '_blank', 'noopener'],
      ]);
      // The run stays put: the same screen, the same step, still running.
      expect(page.url()).toBe(url);
      await expect(r.words).toHaveText(/Work in/);
      // The value sheet: "Open notion.so" for the value.
      await page.keyboard.press('Escape');
      await expect(r.panel).toHaveCount(0);
      await r.values.first().click();
      const vs = await arrived(page, 'go-value-sheet');
      await expect(vs.getByTestId('go-open-address')).toHaveText(['Open notion.so']);
      await vs.getByTestId('go-open-address').click();
      await expectOpened(page, [
        [NOTION, '_blank', 'noopener'],
        [FIGMA, '_blank', 'noopener'],
        [NOTION, '_blank', 'noopener'],
      ]);
      await vs.getByTestId('go-value-close').click();
      // Back a step: the address typed in the step's words gets its row.
      // (P-111, restored: owner ruling Back keeps it — P-110 had the value's address go with a Back that cleared {page}.)
      await r.handle.click();
      await r.panel.getByRole('button', { name: /^Back to/ }).click();
      await r.handle.click();
      await expect(r.panel.getByTestId('go-open-address')).toHaveText(['Open notion.so']);
      await r.panel.getByRole('button', { name: /^Back to/ }).click();
      await r.handle.click();
      // (P-111, rewritten: was ['Open docs.google.com', 'Open notion.so'] — Back past "Pick the page" keeps {page} stored but,
      // its giving step now below the place, not held there (P-110), so its address shows again only when it is reached.)
      await expect(r.panel.getByTestId('go-open-address')).toHaveText(['Open docs.google.com']);
    });

    test('SAFETY: from an import, javascript:, data:, file:, vbscript:, other schemes and relative paths show as words and open nothing — in Plan, on the tile, in the panel; the preview counts the places', async ({ page }) => {
      // The person's own way in: Settings → Import; the preview names the places.
      await openSettings(page);
      await chooseBackup(page, goBackup([TRAPS, PLAIN], [paused('traps', 0, { status: 'running', reason: 'javascript:alert(2) data:text/html,x' })]));
      await expect(page.getByTestId('import-preview')).toContainText(`This backup has 2 routines with ${UNSAFE.length} places and 1 run.`);
      await page.getByRole('button', { name: 'Replace', exact: true }).click();
      await expect(page.getByText(IMPORTED, { exact: true })).toBeVisible();
      await page.goto('./go');
      const r = runner(page);
      await expect(r.words).toHaveText('Look around');
      await r.handle.click();
      const places = r.panel.getByTestId('go-panel-places');
      await expect(places.getByTestId('go-place')).toHaveCount(UNSAFE.length);
      // Not one is a link or a button; no "Open" row for the note's schemes.
      await expect(places.getByRole('link')).toHaveCount(0);
      await expect(places.getByRole('button')).toHaveCount(0);
      await expect(r.panel.getByTestId('go-open-address')).toHaveCount(0);
      for (const [i, where] of UNSAFE.entries()) await expect(places.getByLabel(`Trap ${i}, ${where}`, { exact: true })).toBeVisible();
      // Tapping each does nothing.
      for (const w of await places.getByTestId('go-place-words').all()) await w.click();
      await expect(r.panel).toBeVisible();
      // Nothing anywhere carries an href or ran (no dialog, no navigation).
      const hrefs = await page.evaluate(() => [...document.querySelectorAll('[href]')].map((e) => e.getAttribute('href')).filter((h) => /^(javascript|data|file|vbscript):/i.test(h ?? '')));
      expect(hrefs).toEqual([]);
      await expectNoSeriousViolations(page);
      // Paused, the tile's door opens the same words; in Plan, the line's words open the sheet — never an address.
      await page.keyboard.press('Escape');
      await pauseRun(page);
      await tile(page, 'Crafted').getByRole('button', { name: 'Places for Crafted', exact: true }).click();
      const sheet = await arrived(page, 'go-places-sheet');
      await expect(sheet.getByRole('link')).toHaveCount(0);
      await sheet.getByTestId('go-places-close').click();
      await tile(page, 'Crafted').getByRole('button', { name: 'Plan Crafted', exact: true }).click();
      await expect(plan(page).title).toHaveText('Crafted');
      const line = page.getByTestId('go-plan-places');
      await line.getByRole('button', { name: `Trap 0, ${UNSAFE[0]}`, exact: true }).click();
      await expect(await arrived(page, 'go-places-sheet')).toBeVisible();
      await page.keyboard.press('Escape');
      await line.getByRole('button', { name: `Trap 5, ${UNSAFE[5]}`, exact: true }).click();
      await page.keyboard.press('Escape');
      expect(await opened(page)).toEqual([]);
      expect(page.url()).toMatch(/\/go\/run\/run-traps\/plan$/);
    });

    test('a routine with no places shows nothing new: no line in Plan, no door on its tile, nothing in the panel', async ({ page }) => {
      await startGo(page, [paused('plain', 0, { status: 'running' })], 'runner', [PLAIN]);
      const r = runner(page);
      await r.handle.click();
      await expect(r.panel.getByTestId('go-panel-places')).toHaveCount(0);
      await expect(r.panel.getByTestId('go-open-address')).toHaveCount(0);
      await page.keyboard.press('Escape');
      await pauseRun(page);
      await expect(tile(page, 'Tidy the desk').getByTestId('go-tile-places')).toHaveCount(0);
      await tile(page, 'Tidy the desk').getByRole('button', { name: 'Plan Tidy the desk', exact: true }).click();
      await expect(plan(page).title).toHaveText('Tidy the desk');
      await expect(page.getByTestId('go-plan-places')).toHaveCount(0);
    });
  });
}

test('places go out in Export and come back by Import (the preview says so); a backup from before this build imports unchanged', async ({ page }) => {
  await startGo(page, [], 'home', [DESIGN, PLAIN]);
  const out = await exported(page);
  expect(out.routines.design.places).toEqual(DESIGN.places);
  expect('places' in out.routines.plain).toBe(false);
  await openSettings(page);
  await chooseBackup(page, goBackup([DESIGN, PLAIN]));
  await expect(page.getByTestId('import-preview')).toContainText('This backup has 2 routines with 3 places.');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  // A backup written by the build before places: its preview reads as it always did, and it imports as it is.
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const before = readFileSync(join(process.cwd(), 'src/storage/fixtures/golden/p109-backup.json'), 'utf8');
  await chooseBackup(page, before);
  await expect(page.getByTestId('import-preview')).toContainText('This backup has 39 routines, 24 runs and 8 items from the previous app');
  await expect(page.getByTestId('import-preview')).not.toContainText(/with \d+ place/);
  await page.getByRole('button', { name: 'Replace', exact: true }).click();
  await expect(page.getByText(IMPORTED, { exact: true })).toBeVisible();
  const back = await exported(page);
  expect(back).toEqual(JSON.parse(before).data);
});
