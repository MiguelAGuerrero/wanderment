/**
 * P-97 (owner, 2026-11-26: "maybe tags and alphabetical sorting might be good start in a 'my routines' page";
 * "a whole bunch of disparate types of routines" on home). Done when (the roadmap item, verbatim): a My routines
 * page lists every named routine A–Z with Find and tags (typed on a routine, tap to filter); home shows only runs
 * in motion, split by structure into Ongoing (no end) and Finishing (has an end), with My routines and + New at
 * the bottom; tags survive every storage path. And the batch's rulings: ⌂ Home top-left on My routines; letter
 * headings; a row's hue mark, name and second line (tags, gives / asks); its ··· — Start, Plan, Tags…, Remove
 * (the one confirm); tapping a row opens Plan; + New routine the one filled button; empty states for no routines
 * and no matches; tags typed in a sheet where a comma or Return makes a chip and × removes it, compared without
 * case, trimmed, shown with "#" and stored without it. Every line at 390×844 and at 200 % text (195×422).
 *
 * (Storage paths below the page — the journal, the fallback, hand-over — are in src/storage/persistence.test.ts;
 * here: a reload, Export and Import, the person's own way.)
 */
import { AxeBuilder } from '@axe-core/playwright';
import { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { arrived, chooseBackup, exported, goBackup, home, IMPORTED, menuItems, openGo, openRoutines, openSettings, pauseRun, plan, routines, RoutineSpec, runner, RunSpec, saved, startGo, tile, editPlan, savePlan } from './goFixture';

const PAPER = 'rgb(244, 241, 232)';
const box = async (l: Locator) => (await l.boundingBox())!;

/** Names with an accent and in lower case, a number, tags (one in two spellings), a giving step and one that asks. */
const SHELF: RoutineSpec[] = [
  { id: 'zine', name: 'zine issue', steps: ['Write a page'], tags: ['writing'] },
  { id: 'ecrire', name: 'Écrire un poème', steps: ['Choisir un mot'], tags: ['writing', 'French'] },
  { id: 'apple', name: 'apple pie', steps: ['Peel the apples'], tags: ['baking'] },
  { id: 'draw', name: 'Drawing practice', steps: [{ text: 'Select the subject', gives: 'subject' }, 'Draw {subject} from {reference}'], repeatFrom: 1, tags: ['drawing', 'Daily'] },
  { id: 'gesture', name: 'Gesture drawing', steps: ['Thirty-second poses'], tags: ['Drawing'] },
  { id: 'eclair', name: 'Éclair practice', steps: [] },
  { id: 'acme', name: 'Apply to Acme', steps: ['Send the application', { wait: 'a reply from Acme' }, 'Note the answer'] },
  { id: 'three', name: '3 good things', steps: ['Write them down'], tags: ['daily'] },
];
const A_TO_Z = ['3 good things', 'apple pie', 'Apply to Acme', 'Drawing practice', 'Éclair practice', 'Écrire un poème', 'Gesture drawing', 'zine issue'];

async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = serious.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => `${n.target.join(' ')} ${n.html.slice(0, 200)}`).slice(0, 5).join('\n  ')}`);
  expect(report, report.join('\n')).toEqual([]);
}

/** Every control in `scope` at least 48×48 and inside the window; every text at least 16 px; the filled buttons. */
async function rules(scope: Locator) {
  return scope.evaluate((root, paper) => {
    const shown = (e: Element) => {
      const b = e.getBoundingClientRect();
      return b.width > 0 && b.height > 0 && !e.closest('[inert]');
    };
    const controls = [...root.querySelectorAll('button, [role="button"], [role="menuitem"], input, textarea')].filter((e) => shown(e) && !e.hasAttribute('data-sr-close'));
    const name = (e: Element) => e.getAttribute('aria-label') || (e as HTMLElement).innerText || '';
    const small = controls.filter((e) => e.getBoundingClientRect().width < 47.5 || e.getBoundingClientRect().height < 47.5).map(name);
    const outside = controls.filter((e) => e.getBoundingClientRect().left < -0.5 || e.getBoundingClientRect().right > innerWidth + 0.5).map(name);
    const texts = [...root.querySelectorAll('*')].filter((e) => shown(e) && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()));
    const tiny = texts.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => e.textContent!.slice(0, 30));
    const filled = controls.filter((e) => getComputedStyle(e).backgroundColor === paper).map(name);
    return { small, outside, tiny, filled, sideways: document.documentElement.scrollWidth > innerWidth };
  }, PAPER);
}
async function expectRules(scope: Locator, filled: string[]) {
  const r = await rules(scope);
  expect(r.small, 'targets under 48 px').toEqual([]);
  expect(r.outside, 'controls outside the window').toEqual([]);
  expect(r.tiny, 'text under 16 px').toEqual([]);
  expect(r.filled, 'filled buttons').toEqual(filled);
  expect(r.sideways, 'nothing scrolls sideways').toBe(false);
}

/** Opens a row's ··· and chooses one of its items. */
async function rowMenu(page: Page, name: string, item: string) {
  await routines(page).more(name).click();
  await (await arrived(page, 'go-routine-menu')).getByRole('menuitem', { name: item, exact: true }).click();
}

/** In the Tags sheet: types into its field. */
const tagsField = (page: Page) => page.getByTestId('go-tags-sheet').getByTestId('go-tags-field');
const chips = (page: Page) => page.getByTestId('go-tags-sheet').getByTestId('go-tags-chip');

for (const size of [
  { name: '390×844', width: 390, height: 844 },
  { name: '200 % text (195×422)', width: 195, height: 422 },
]) {
  test.describe(`at ${size.name}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
    });

    test('My routines lists every named routine A–Z (case and accents never move a name) under letter headings; ⌂ Home top-left, + New routine the one filled button, lowest', async ({ page }) => {
      await startGo(page, [], 'home', SHELF);
      const r = await openRoutines(page);
      await expect(page).toHaveURL(/\/go\/routines$/);
      await expect(r.title).toHaveText('My routines');
      await expect(r.title).toBeFocused();
      await expect(r.names).toHaveText(A_TO_Z);
      await expect(r.letters).toHaveText(['#', 'A', 'D', 'E', 'G', 'Z']);
      // The way out, first at the top-left; the filled button lowest, and the only one.
      const out = await box(r.home);
      expect(out.x).toBeLessThanOrEqual(24);
      expect(out.y).toBeLessThanOrEqual(64);
      await expect(r.home).toHaveAccessibleName('Home');
      const made = await box(r.newBtn);
      await expect(r.newBtn).toBeInViewport({ ratio: 1 });
      expect(made.y + made.height).toBeGreaterThanOrEqual(size.height - 32);
      await expectRules(r.screen, ['New routine']);
      await expectNoSeriousViolations(page);
      // A row: its colour (decorative), its name, a second line — tags with "#", what it gives and asks — and its ···.
      const row = r.row('Drawing practice');
      await expect(row.getByTestId('go-routine-line')).toHaveText('#drawing #Daily · gives {subject} · asks {reference}');
      await expect(row.getByTestId('go-routine-body')).toHaveAccessibleName('Plan Drawing practice, #drawing #Daily · gives {subject} · asks {reference}');
      await expect(r.row('Éclair practice').getByTestId('go-routine-line')).toHaveCount(0);
      await expect(r.more('Drawing practice')).toBeVisible();
      // Home goes home.
      await r.home.click();
      await expect(home(page).screen).toBeVisible();
      await expect(page).toHaveURL(/\/go$/);
    });

    test('Find (part of a name or a tag, without case or accents) and the tags (tap to filter: one, then two — both must be there); nothing matching says so and Clear brings all back', async ({ page }) => {
      await startGo(page, [], 'home', SHELF);
      const r = await openRoutines(page);
      // The tags: every one once (without case: the spelling met first, A–Z), A–Z, each with "#".
      await expect(r.tags).toHaveText(['#baking', '#daily', '#drawing', '#French', '#writing']);
      await r.tag('drawing').click();
      await expect(r.tag('drawing')).toHaveAttribute('aria-pressed', 'true');
      await expect(r.names).toHaveText(['Drawing practice', 'Gesture drawing']);
      await r.tag('daily').click();
      await expect(r.names).toHaveText(['Drawing practice']);
      // A chosen tag is never the filled button (+ New routine is).
      expect((await rules(r.screen)).filled).toEqual(['New routine']);
      await r.tag('drawing').click();
      await expect(r.tag('drawing')).toHaveAttribute('aria-pressed', 'false');
      await expect(r.names).toHaveText(['3 good things', 'Drawing practice']);
      await r.tag('daily').click();
      await expect(r.names).toHaveText(A_TO_Z);
      // Find.
      await expect(r.find).toHaveAccessibleName('Find a routine');
      await r.find.fill('ECRI');
      await expect(r.names).toHaveText(['Écrire un poème']);
      await r.find.fill('#french');
      await expect(r.names).toHaveText(['Écrire un poème']);
      await r.find.fill('drawing');
      await expect(r.names).toHaveText(['Drawing practice', 'Gesture drawing']);
      await r.tag('writing').click();
      await expect(r.names).toHaveCount(0);
      await expect(r.none).toHaveText('No routines match.');
      await r.screen.getByRole('button', { name: 'Clear Find and tags', exact: true }).click();
      await expect(r.names).toHaveText(A_TO_Z);
      await expect(r.find).toHaveValue('');
      await expectNoSeriousViolations(page);
    });

    test('tapping a row opens its Plan (its way out goes back to My routines); its ··· is a menu — Start, Plan, Tags…, a line, Remove — and Start runs it', async ({ page }) => {
      await startGo(page, [], 'home', SHELF);
      const r = await openRoutines(page);
      await r.row('apple pie').getByTestId('go-routine-body').click();
      const p = plan(page);
      await expect(p.title).toHaveText('apple pie');
      await expect(p.toRoutines).toHaveText('My routines');
      await expect(p.toRoutines).toHaveAccessibleName('Back to My routines');
      expect((await box(p.toRoutines)).x).toBeLessThanOrEqual(24);
      await p.toRoutines.click();
      await expect(routines(page).screen).toBeVisible();
      await r.more('apple pie').click();
      const menu = await arrived(page, 'go-routine-menu');
      await expect(menu).toHaveRole('menu');
      // (P-98, rewritten: and Copy…, before the line.)
      await expect(menuItems(menu)).toHaveText(['Start', 'Plan', 'Tags…', 'Copy…', 'Remove']);
      await expect(menu.getByRole('separator')).toHaveCount(1);
      await expect(menuItems(menu).last()).toHaveAttribute('data-danger', 'true');
      await expectNoSeriousViolations(page);
      await menu.getByRole('menuitem', { name: 'Start apple pie', exact: true }).click();
      await expect(runner(page).words).toHaveText('Peel the apples');
      // With its run going, the menu says Resume and has no Remove (end the run first).
      await page.goBack();
      await expect(routines(page).screen).toBeVisible();
      await r.more('apple pie').click();
      // (P-98, rewritten: and Copy….)
      await expect(menuItems(await arrived(page, 'go-routine-menu'))).toHaveText(['Resume', 'Plan', 'Tags…', 'Copy…']);
      await page.keyboard.press('Escape');
      // Another routine: its Start is unavailable while that one runs (one thing at a time).
      await r.more('zine issue').click();
      await expect((await arrived(page, 'go-routine-menu')).getByRole('menuitem', { name: 'Start zine issue', exact: true })).toBeDisabled();
      await page.keyboard.press('Escape');
      // A routine with no steps: nothing to start.
      await r.more('Éclair practice').click();
      // (P-98, rewritten: and Copy…, before the line.)
      await expect(menuItems(await arrived(page, 'go-routine-menu'))).toHaveText(['Plan', 'Tags…', 'Copy…', 'Remove']);
    });

    test('Remove asks first with the one confirm; Cancel keeps it; Remove takes it off My routines, with Undo', async ({ page }) => {
      await startGo(page, [], 'home', SHELF);
      const r = await openRoutines(page);
      await rowMenu(page, 'zine issue', 'Remove zine issue');
      const dialog = page.getByRole('alertdialog');
      await expect(dialog.getByRole('heading')).toHaveText('Remove “zine issue”?');
      await expect(dialog.getByTestId('go-confirm-body')).toHaveText('It goes from My routines, with its steps.');
      await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
      await expectNoSeriousViolations(page);
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(r.row('zine issue')).toHaveCount(1);
      await rowMenu(page, 'zine issue', 'Remove zine issue');
      await page.getByRole('alertdialog').getByRole('button', { name: 'Remove', exact: true }).click();
      await expect(r.row('zine issue')).toHaveCount(0);
      await expect(r.notice).toContainText('Removed “zine issue”');
      await r.notice.getByRole('button', { name: /^Undo/ }).click();
      await expect(r.row('zine issue')).toHaveCount(1);
    });

    test('tags are typed on a routine — Plan’s ··· → Tags…: a comma or Return makes a chip, × removes one, Keep keeps them (trimmed, no "#", once without case); Close leaves them as they were', async ({ page }) => {
      await startGo(page, [], 'home', SHELF);
      await page.goto('./go/routine/apple');
      const p = plan(page);
      await expect(p.tags).toHaveText('#baking');
      await editPlan(page); // (P-115, rewritten: the routine's ··· edits are Edit's — Edit first.)
      await p.screen.getByTestId('go-plan-more').click();
      await (await arrived(page, 'go-plan-routine')).getByRole('menuitem', { name: 'Tags for apple pie', exact: true }).click();
      const sheet = await arrived(page, 'go-tags-sheet');
      await expect(sheet.getByRole('heading', { level: 2 })).toHaveText('Tags for apple pie');
      await expect(tagsField(page)).toBeFocused();
      await expect(tagsField(page)).toHaveAccessibleName('Add a tag');
      await expect(chips(page)).toHaveText(['#baking']);
      await tagsField(page).pressSequentially('  #Dessert ,');
      await expect(chips(page)).toHaveText(['#baking', '#Dessert']);
      await expect(tagsField(page)).toHaveValue('');
      await tagsField(page).pressSequentially('weekend');
      await tagsField(page).press('Enter');
      await expect(chips(page)).toHaveText(['#baking', '#Dessert', '#weekend']);
      await expect(tagsField(page)).toBeFocused();
      // Once, without case.
      await tagsField(page).pressSequentially('BAKING,');
      await expect(chips(page)).toHaveText(['#baking', '#Dessert', '#weekend']);
      // × removes one (its spoken name says which).
      await sheet.getByRole('button', { name: 'Remove #weekend', exact: true }).click();
      await expect(chips(page)).toHaveText(['#baking', '#Dessert']);
      await expectRules(sheet, ['Keep the tags for apple pie']);
      await expectNoSeriousViolations(page);
      // What is still typed is kept too.
      await tagsField(page).fill('autumn');
      await sheet.getByTestId('go-tags-keep').click();
      await expect(page.getByTestId('go-tags-sheet')).toHaveCount(0);
      await expect(p.tags).toHaveText('#baking #Dessert #autumn');
      await savePlan(page); // (P-115, rewritten: the tags, kept in the draft, are saved — what is stored is read.)
      await saved(page);
      expect((await exported(page)).routines.apple.tags).toEqual(['baking', 'Dessert', 'autumn']);
      // Close changes nothing; and the routine's menu holds the Undo.
      await page.goto('./go/routine/apple');
      await editPlan(page); // (P-115, rewritten: the routine's ··· edits are Edit's — Edit first.)
      await plan(page).screen.getByTestId('go-plan-more').click();
      await (await arrived(page, 'go-plan-routine')).getByRole('menuitem', { name: 'Tags for apple pie', exact: true }).click();
      await page.getByTestId('go-tags-sheet').getByRole('button', { name: 'Remove #baking', exact: true }).click();
      await page.getByTestId('go-tags-close').click();
      await expect(plan(page).tags).toHaveText('#baking #Dessert #autumn');
    });

    test('tags from a My routines row: its ··· → Tags…, then the new tag is there to tap; the routine’s menu takes the edit back', async ({ page }) => {
      await startGo(page, [], 'home', SHELF);
      const r = await openRoutines(page);
      await rowMenu(page, 'Apply to Acme', 'Tags for Apply to Acme');
      await arrived(page, 'go-tags-sheet');
      await tagsField(page).fill('jobs');
      await page.getByTestId('go-tags-keep').click();
      await expect(r.row('Apply to Acme').getByTestId('go-routine-line')).toHaveText('#jobs');
      await r.tag('jobs').click();
      await expect(r.names).toHaveText(['Apply to Acme']);
      // Ctrl+Z takes the last edit back here too.
      await r.tag('jobs').click();
      await page.keyboard.press('Control+z');
      await expect(r.row('Apply to Acme').getByTestId('go-routine-line')).toHaveCount(0);
      await expect(r.screen.getByRole('button', { name: '#jobs', exact: true })).toHaveCount(0);
    });
  });
}

test.describe('home shows only what is in motion', () => {
  const RUNS: RunSpec[] = [
    { id: 'd', routine: 'draw', at: 1, startedDaysAgo: 3, reason: 'after dinner' },
    { id: 'a', routine: 'acme', at: 1, waitingDaysAgo: 2, startedDaysAgo: 2 },
    { id: 'g', routine: 'gesture', at: 0, status: 'running', startedDaysAgo: 1 },
  ];
  for (const size of [
    { name: '390×844', width: 390, height: 844 },
    { name: '200 % text (195×422)', width: 195, height: 422 },
  ]) {
    // (P-100, rewritten: was "under Ongoing (repeats until done) and Finishing (has an end)" — home is one queue, no sections.)
    test(`at ${size.name}: runs going (running, paused, waiting) in one list, no headings; routines with nothing going are not there; My routines (left) and + New (right) at the bottom`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await startGo(page, RUNS, 'runner', SHELF);
      await page.goBack();
      const h = home(page);
      // (P-100, rewritten: was the headings Ongoing and Finishing, draw under the first and acme, gesture under the second — one list, by when each was started.)
      await expect(h.headings).toHaveCount(0);
      expect(await h.tiles.evaluateAll((els) => els.map((e) => `${e.getAttribute('data-routine')} ${e.getAttribute('data-state')}`))).toEqual(['draw paused', 'acme waiting', 'gesture running']);
      await expect(h.tiles).toHaveCount(3);
      for (const idle of ['apple pie', 'zine issue', 'Éclair practice']) await expect(tile(page, idle)).toHaveCount(0);
      // Each keeps its tile: where it is, its note, Resume, Plan and (not running) its ···.
      const d = tile(page, 'Drawing practice');
      await expect(d.getByTestId('go-tile-line')).toContainText('at Draw');
      await expect(d.getByTestId('go-tile-reason')).toHaveText('after dinner');
      await expect(d.getByTestId('go-tile-resume')).toBeDisabled();
      await expect(d.getByRole('button', { name: 'Plan Drawing practice', exact: true })).toBeVisible();
      await expect(d.getByTestId('go-tile-more')).toBeVisible();
      await expect(tile(page, 'Gesture drawing').getByTestId('go-tile-last')).toHaveText('Last ran'); // (P-110, rewritten: was 'last' — the owner: "last is relative"; it reads "Last ran".)
      // The side doors: My routines at the left, + New at the right — (P-100, rewritten: was "lowest") the top row's Resume beneath them.
      const left = await box(h.routinesBtn);
      const right = await box(h.newBtn);
      expect(left.x).toBeLessThan(right.x);
      expect(Math.abs(left.y - right.y)).toBeLessThanOrEqual(2);
      expect(left.x).toBeLessThanOrEqual(24);
      expect(right.x + right.width).toBeGreaterThanOrEqual(size.width - 24);
      // P-100: the top row's Resume, beneath the side doors — unavailable (not filled) while Gesture drawing runs.
      await expect(h.screen.getByTestId('go-resume')).toBeDisabled();
      expect((await box(h.screen.getByTestId('go-resume'))).y).toBeGreaterThan(left.y);
      await expectRules(h.screen, []);
      await expectNoSeriousViolations(page);
      await h.routinesBtn.click();
      await expect(routines(page).names).toHaveText(A_TO_Z);
    });
  }

  // (P-100, rewritten: was "… is Finishing" with the heading Finishing checked — one list, no headings.)
  test('ended or never started, a routine is not on home; the runs going stay in one list, in order', async ({ page }) => {
    const NESTED: RoutineSpec[] = [
      { id: 'outer', name: 'Piano', steps: [{ routine: 'drill' }, 'Play a piece'] },
      { id: 'drill', name: 'Drill', home: false, repeatFrom: 0, steps: ['Scales', 'Arpeggios'] },
      { id: 'count', name: 'Four pages', repeatFrom: 0, repeat: 4, steps: ['Write a page'] },
      { id: 'tea', name: 'Make tea', steps: ['Boil the water', 'Pour'] },
    ];
    await startGo(page, [{ id: 'p', routine: 'outer', at: 0, inner: [{ routine: 'drill', at: 1 }], startedDaysAgo: 3 }, { id: 'c', routine: 'count', at: 0, round: 2, startedDaysAgo: 2 }, { id: 't', routine: 'tea', at: 1, status: 'running' }], 'runner', NESTED);
    await expect(runner(page).next).toHaveText('Done');
    await runner(page).next.click();
    const h = home(page);
    await expect(h.notice).toContainText('Done with Make tea');
    await expect(tile(page, 'Make tea')).toHaveCount(0);
    await expect(h.headings).toHaveCount(0); // (P-100, rewritten: was toHaveText(['Finishing']).)
    expect(await h.tiles.evaluateAll((els) => els.map((e) => e.getAttribute('data-routine')))).toEqual(['outer', 'count']); // (P-100, rewritten: was the Finishing group's tiles.)
    await saved(page);
    await page.reload();
    await expect(home(page).headings).toHaveCount(0); // (P-100, rewritten: was toHaveText(['Finishing']).)
    await expect(home(page).tiles).toHaveCount(2);
  });

  test('empty home: with no routines, one line and + New its one action; with routines and nothing going, one line, My routines and + New', async ({ page }) => {
    await openGo(page);
    const h = home(page);
    await expect(h.screen.getByTestId('go-home-empty')).toHaveText('Your routines will be here.');
    await expect(h.routinesBtn).toHaveCount(0);
    await expect(h.headings).toHaveCount(0);
    await startGo(page, [], 'home', SHELF);
    await expect(h.idle).toHaveText('Nothing going.');
    await expect(h.screen.getByTestId('go-home-empty')).toHaveCount(0);
    await expect(h.headings).toHaveCount(0);
    // Its actions: My routines, + New (and ⚙, the screen's own).
    await expect(h.screen.getByRole('button')).toHaveText(['', 'My routines', 'New']);
    await expectRules(h.screen, []);
    await expectNoSeriousViolations(page);
  });

  // (P-104, rewritten: with no routines My routines opens on its Library view — B-17 journey 1, the cold start — and
  // Find is there to find a library method; the Yours view still says "No routines yet." Was: the empty line at once, no Find.)
  test('My routines with no routines opens on Library, and Yours says so; + New routine makes one there and opens its Plan, whose way out comes back', async ({ page }) => {
    await page.goto('./go/routines');
    const r = routines(page);
    await expect(r.screen.getByRole('tab', { name: 'Library', exact: true })).toHaveAttribute('aria-selected', 'true');
    await r.screen.getByRole('tab', { name: 'Yours', exact: true }).click();
    await expect(r.empty).toHaveText('No routines yet.');
    await expectNoSeriousViolations(page);
    await r.newBtn.click();
    const sheet = await arrived(page, 'go-new-sheet');
    await sheet.getByTestId('go-new-name').fill('Bake bread');
    await sheet.getByTestId('go-new-plan').click();
    await expect(plan(page).title).toHaveText('Bake bread');
    await plan(page).toRoutines.click();
    await expect(routines(page).names).toHaveText(['Bake bread']);
  });
});

test.describe('tags survive every storage path (the page’s own: a reload, Export, Import)', () => {
  test('kept, reloaded, exported; a backup with other tags (and a field this version does not know) imports and shows them', async ({ page }) => {
    await startGo(page, [], 'home', SHELF);
    await page.goto('./go/routine/zine');
    await editPlan(page); // (P-115, rewritten: the routine's ··· edits are Edit's — Edit first.)
    await plan(page).screen.getByTestId('go-plan-more').click();
    await (await arrived(page, 'go-plan-routine')).getByRole('menuitem', { name: 'Tags for zine issue', exact: true }).click();
    await arrived(page, 'go-tags-sheet');
    await tagsField(page).fill('print, Monthly');
    await page.getByTestId('go-tags-keep').click();
    await savePlan(page); // (P-115, rewritten: the tags, kept in the draft, are saved — what is stored is read.)
    await saved(page);
    await page.reload();
    await expect(plan(page).tags).toHaveText('#writing #print #Monthly');
    const stored = await exported(page);
    expect(stored.routines.zine.tags).toEqual(['writing', 'print', 'Monthly']);
    // Another backup: different tags, and a field this version does not know on the same routine.
    const file = JSON.parse(goBackup(SHELF.map((s) => (s.id === 'zine' ? { ...s, tags: ['risograph'] } : s))));
    file.data.routines.zine.later = { kept: true };
    await openSettings(page);
    await chooseBackup(page, JSON.stringify(file));
    await page.getByRole('button', { name: 'Replace', exact: true }).click();
    await expect(page.getByText(IMPORTED, { exact: true })).toBeVisible();
    await openGo(page);
    const r = await openRoutines(page);
    await expect(r.row('zine issue').getByTestId('go-routine-line')).toHaveText('#risograph');
    await r.tag('risograph').click();
    await expect(r.names).toHaveText(['zine issue']);
    await saved(page);
    expect((await exported(page)).routines.zine).toMatchObject({ tags: ['risograph'], later: { kept: true } });
  });
});

test.describe('fixes after the audit', () => {
  const FOLDS: RoutineSpec[] = ['Ad copy', 'Æble cake', 'Af plan', 'Oak walk', 'Øresund ride', 'Owl watch', 'Łódź trip', 'Lake', 'Straße', 'Sun', 'Þing', 'Tea', 'Œuvre', 'Oat'].map((name, i) => ({ id: `f${i}`, name, steps: ['A step'] }));
  const IN_ORDER = ['Ad copy', 'Æble cake', 'Af plan', 'Lake', 'Łódź trip', 'Oak walk', 'Oat', 'Œuvre', 'Øresund ride', 'Owl watch', 'Straße', 'Sun', 'Tea', 'Þing'];
  const focusedName = (page: Page) => page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.tagName ?? '');

  test('F1: Æ Ø Ł ß Þ Œ sort and head with their base letter, each heading once; typing and clearing Find again and again never repeats a row; a removed routine goes at once', async ({ page }) => {
    await startGo(page, [], 'home', FOLDS);
    const r = await openRoutines(page);
    await expect(r.letters).toHaveText(['A', 'L', 'O', 'S', 'T']);
    await expect(r.names).toHaveText(IN_ORDER);
    for (const typed of ['o', '', 'æ', '', 'ore', '', 'strasse', 'o', '']) {
      await r.find.fill(typed);
      if (typed === 'ore') await expect(r.names).toHaveText(['Øresund ride']);
      if (typed === 'strasse') await expect(r.names).toHaveText(['Straße']);
    }
    await expect(r.names).toHaveText(IN_ORDER);
    await expect(r.letters).toHaveText(['A', 'L', 'O', 'S', 'T']);
    await r.find.fill('o');
    await r.find.fill('');
    await r.more('Oak walk').click();
    await (await arrived(page, 'go-routine-menu')).getByRole('menuitem', { name: 'Remove Oak walk', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(r.names).toHaveText(IN_ORDER.filter((n) => n !== 'Oak walk'));
    // F3: the focus goes to the next row (never the page).
    await expect.poll(() => focusedName(page)).toBe('Plan Oat');
  });

  test('F3: removing the last row of the list puts the focus on the one before; removing the only row left by Find puts it on Find', async ({ page }) => {
    await startGo(page, [], 'home', FOLDS);
    const r = await openRoutines(page);
    await r.more('Þing').click();
    await (await arrived(page, 'go-routine-menu')).getByRole('menuitem', { name: 'Remove Þing', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(r.row('Þing')).toHaveCount(0);
    await expect.poll(() => focusedName(page)).toBe('Plan Tea');
    await r.find.fill('lake');
    await r.more('Lake').click();
    await (await arrived(page, 'go-routine-menu')).getByRole('menuitem', { name: 'Remove Lake', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(r.none).toBeVisible();
    await expect(r.find).toBeFocused();
  });

  test('F2: Pause after a start from My routines — its row’s Start, or Start in the Plan its row opened — goes home, never back to My routines', async ({ page }) => {
    await startGo(page, [], 'home', SHELF);
    let r = await openRoutines(page);
    await r.more('apple pie').click();
    await (await arrived(page, 'go-routine-menu')).getByRole('menuitem', { name: 'Start apple pie', exact: true }).click();
    await expect(runner(page).words).toHaveText('Peel the apples');
    await pauseRun(page);
    await expect(page).toHaveURL(/\/go$/);
    await expect(tile(page, 'apple pie')).toHaveAttribute('data-state', 'paused');
    // From its Plan.
    r = await openRoutines(page);
    await r.row('zine issue').getByTestId('go-routine-body').click();
    await plan(page).forward.click();
    await expect(runner(page).words).toHaveText('Write a page');
    await pauseRun(page);
    await expect(page).toHaveURL(/\/go$/);
    await expect(tile(page, 'zine issue')).toHaveAttribute('data-state', 'paused');
    // F5: the rows say their runs are going, in words.
    r = await openRoutines(page);
    await expect(r.row('apple pie').getByTestId('go-routine-line')).toHaveText('paused at Peel the apples · #baking');
    await expect(r.row('apple pie').getByTestId('go-routine-body')).toHaveAccessibleName('Plan apple pie, paused at Peel the apples · #baking');
    await expect(r.row('Gesture drawing').getByTestId('go-routine-line')).toHaveText('#Drawing');
  });

  test('F2: Done after a start from My routines goes home too', async ({ page }) => {
    await startGo(page, [], 'home', SHELF);
    const r = await openRoutines(page);
    await r.more('apple pie').click();
    await (await arrived(page, 'go-routine-menu')).getByRole('menuitem', { name: 'Start apple pie', exact: true }).click();
    await expect(runner(page).next).toHaveText('Done');
    await page.waitForTimeout(700);
    await runner(page).next.click();
    await expect(page).toHaveURL(/\/go$/);
    await expect(home(page).notice).toContainText('Done with apple pie');
  });
});
