/**
 * P-99: In any order — parts as threads, joined. The mock-up's routine throughout (PlanAnyOrder, RunChoose): "Get
 * better at hands" — Warm up; In any order: Gesture practice (broken down: Draw 10 hands, Draw 10 feet), Study: hand
 * anatomy, chapter 3, Master copy (gives {copies}), Sketch from life (broken down: Find a model); then "Compare {copies}
 * with this week’s gestures". Plan: Add's "In any order" makes the block, its first part typed inside it, and it opens as
 * a view of its own whose Add adds a part. Running: the block's row offers the parts; a part taken up runs as its own
 * thread (its place kept when another is taken up, across a reload); the pull-up panel lists where every part stands
 * ("at <step>", a part's first step, "finished", "stopped") and a tap moves there, with Undo; the step after the block
 * waits until every part has returned or been stopped; what they gave is joined. Home: the tile reads the part last
 * touched and opens the same view. No count, no percentage, no "left". At 390×844 and at 200 % text (195×422).
 */
import { AxeBuilder } from '@axe-core/playwright';
import { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { goBackup, importBackup, openGo, plan, RoutineSpec, RunSpec, runner, settled, editPlan } from './goFixture';

const SHOTS = '.polish/current/P-99/shots';
const PAPER = 'rgb(244, 241, 232)';

const HANDS: RoutineSpec = { id: 'hands', name: 'Get better at hands', steps: ['Warm up', { routine: 'any' }, 'Compare {copies} with this week’s gestures'] };
const ANY: RoutineSpec = { id: 'any', name: 'In any order', home: false, steps: [{ routine: 'gesture' }, 'Study: hand anatomy, chapter 3', { text: 'Master copy', gives: 'copies' }, { routine: 'sketch' }] };
const GESTURE: RoutineSpec = { id: 'gesture', name: 'Gesture practice', home: false, steps: ['Draw 10 hands, 30 s each', 'Draw 10 feet, 30 s each'] };
const SKETCH: RoutineSpec = { id: 'sketch', name: 'Sketch from life', home: false, steps: ['Find a model'] };

/** The backup with the block stored as P-99 stores it: an unnamed sequence "In any order" carrying `any`; its parts broken down. */
function withBlock(runs: RunSpec[] = []): string {
  const file = JSON.parse(goBackup([HANDS, ANY, GESTURE, SKETCH], runs));
  for (const id of ['any', 'gesture', 'sketch']) {
    const r = file.data.routines[id];
    r.named = false;
    delete r.home;
    delete r.open;
  }
  file.data.routines.any.any = true;
  return JSON.stringify(file);
}
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


const parts = (scope: Locator) => scope.getByTestId('go-part');
const NOTHING_COUNTED = /\d+ of \d+|%|\bleft\b/i;

for (const [label, size] of [
  ['390×844', { width: 390, height: 844 }],
  ['200 % text (195×422)', { width: 195, height: 422 }],
] as const) {
  test.describe(`at ${label}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(size);
    });

    test('Plan: Add’s “In any order” makes the block, its first parts typed inside it; it opens as a view of its own whose Add adds a part (no routine, no for each, no block inside); Undo takes a part back', async ({ page }) => {
      await importBackup(page, goBackup([{ id: 'hands', name: 'Get better at hands', steps: ['Warm up'] }]));
      await page.goto('./go/routine/hands');
      const p = plan(page);
      await expect(settled(page, 'plan')).toBeVisible();
      await editPlan(page); // (P-115, rewritten: Plan opens read-only — Edit first.)
      await p.screen.getByTestId('go-plan-add-any').click();
      await expect(p.words).toHaveText(['Warm up', 'In any order']);
      await expect(p.typed).toBeFocused();
      await expect(p.typed).toHaveAccessibleName('Add a part to In any order');
      await p.typed.fill('Study: hand anatomy, chapter 3');
      await p.typed.press('Enter');
      await p.typed.fill('Master copy');
      await p.typed.press('Enter');
      await page.keyboard.press('Escape');
      // Its own view: its parts, and its own Add — "Add a part".
      await p.screen.getByRole('button', { name: 'Open In any order', exact: true }).click();
      await expect(p.title).toHaveText('In any order');
      await expect(p.words).toHaveText(['Study: hand anatomy, chapter 3', 'Master copy']);
      await expect(p.add).toHaveAccessibleName('Add a part');
      await expect(p.screen.getByTestId('go-plan-add-routine')).toHaveCount(0);
      await expect(p.screen.getByTestId('go-plan-add-each')).toHaveCount(0);
      await expect(p.screen.getByTestId('go-plan-add-any')).toHaveCount(0);
      await p.add.fill('Gesture practice');
      await p.add.press('Enter');
      await expect(p.words).toHaveText(['Study: hand anatomy, chapter 3', 'Master copy', 'Gesture practice']);
      await noSerious(page);
      await rules(page, p.screen);
      await page.screenshot({ path: `${SHOTS}/plan-any-order${size.width > 300 ? '' : '-200'}.png` });
      // Undo (the view's ···): the part just added goes.
      await p.screen.getByTestId('go-plan-more').click();
      await page.getByTestId('go-plan-undo').click();
      await expect(p.words).toHaveText(['Study: hand anatomy, chapter 3', 'Master copy']);
    });

    test('running: the row offers the parts; a part runs as its own thread and keeps its place across a reload; the panel lists where every part stands and a tap moves there (Undo); finished and stopped read apart; the step after waits, then reads what was joined', async ({ page }) => {
      await importBackup(page, withBlock([{ id: 'r1', routine: 'hands', at: 1, status: 'running' }]));
      await openGo(page, 'runner');
      const r = runner(page);
      // On the block's row: its parts to choose; the filled button takes up the first.
      await expect(r.words).toHaveText('In any order');
      const choose = r.screen.getByTestId('go-choose');
      await expect(parts(choose)).toHaveCount(4);
      await expect(parts(choose).nth(0)).toHaveAccessibleName('Gesture practice first: Draw 10 hands, 30 s each, in Get better at hands');
      await expect(r.next).toHaveText(/Start Gesture practice/);
      await expect(r.stepOut).toHaveAccessibleName('Step out of In any order');
      await expect(r.screen).not.toContainText(NOTHING_COUNTED);
      await noSerious(page);
      await rules(page, r.screen);
      await page.screenshot({ path: `${SHOTS}/runner-choose${size.width > 300 ? '' : '-200'}.png` });
      // Master copy: given, it returns (Next), and the row reads it finished.
      await parts(choose).filter({ hasText: 'Master copy' }).click();
      await expect(r.words).toHaveText('Master copy');
      await r.field('copies').click();
      const entry = await sheet(page, 'go-entry-sheet');
      await entry.getByTestId('go-entry-field').fill('two Dürer hands');
      await entry.getByTestId('go-entry-keep').click();
      await r.next.click();
      await expect(r.words).toHaveText('In any order');
      await expect(parts(choose).filter({ hasText: 'Master copy' })).toContainText('finished');
      // Sketch from life: stepped out of — stopped (told apart from finished, in words).
      await parts(choose).filter({ hasText: 'Sketch from life' }).click();
      await expect(r.words).toHaveText('Find a model');
      await r.stepOut.click();
      await expect(parts(choose).filter({ hasText: 'Sketch from life' })).toContainText('stopped');
      // Gesture practice: in at its first step; Next; then a reload keeps its place.
      await r.next.click();
      await expect(r.words).toHaveText('Draw 10 hands, 30 s each');
      await r.next.click();
      await expect(r.words).toHaveText('Draw 10 feet, 30 s each');
      await page.reload();
      await expect(settled(page, 'runner')).toBeVisible();
      await expect(r.words).toHaveText('Draw 10 feet, 30 s each');
      // The pull-up panel: every part, where it stands; a tap on Study moves there.
      await r.handle.click();
      const panel = await sheet(page, 'go-panel');
      const tree = panel.getByTestId('go-tree');
      await expect(parts(tree)).toHaveText([/Gesture practice.*at Draw 10 feet, 30 s each.*you are here/s, /Study: hand anatomy, chapter 3/, /Master copy.*finished/s, /Sketch from life.*stopped/s]);
      await expect(parts(tree).nth(2)).toHaveAccessibleName('Master copy finished, in Get better at hands');
      await expect(panel).not.toContainText(NOTHING_COUNTED);
      await noSerious(page);
      await rules(page, panel);
      await page.screenshot({ path: `${SHOTS}/panel-tree${size.width > 300 ? '' : '-200'}.png` });
      await parts(tree).filter({ hasText: 'Study' }).click();
      await expect(r.words).toHaveText('Study: hand anatomy, chapter 3');
      await expect(r.notice).toContainText('Took up “Study: hand anatomy, chapter 3”');
      // Its Undo: back where it was, in Gesture practice.
      await r.notice.getByRole('button', { name: /Undo/ }).click();
      await expect(r.words).toHaveText('Draw 10 feet, 30 s each');
      // Gesture returns: back on the row; the step after still waits (Study has not returned) — no Next there.
      await r.next.click();
      await expect(r.words).toHaveText('In any order');
      await expect(r.next).toHaveText(/Start Study: hand anatomy, chapter 3/);
      await r.next.click();
      await expect(r.words).toHaveText('Study: hand anatomy, chapter 3');
      await r.next.click();
      // Every part has returned or been stopped: the step after, reading what was joined.
      await expect(r.words).toHaveText('Compare two Dürer hands with this week’s gestures');
    });

    test('home: paused inside a part, the tile reads that part; its ··· opens where every part stands, and a tap takes one up in the runner', async ({ page }) => {
      const file = JSON.parse(withBlock([{ id: 'r1', routine: 'hands', at: 1, inner: [{ routine: 'any', at: 0 }, { routine: 'gesture', at: 1 }], status: 'paused', reason: 'hands are tired' }]));
      await importBackup(page, JSON.stringify(file));
      await openGo(page, 'home');
      const home = settled(page, 'home');
      await expect(home).toContainText('Gesture practice · at Draw 10 feet, 30 s each');
      await home.getByTestId('go-tile-more').first().click();
      await page.getByTestId('go-tile-parts').click();
      const s = await sheet(page, 'go-parts-sheet');
      const tree = s.getByTestId('go-tile-tree');
      await expect(parts(tree)).toHaveText([/Gesture practice.*at Draw 10 feet, 30 s each/s, /Study/, /Master copy/, /Sketch from life.*first: Find a model/s]);
      await expect(s).not.toContainText(NOTHING_COUNTED);
      await noSerious(page);
      await rules(page, s);
      await page.screenshot({ path: `${SHOTS}/home-tree${size.width > 300 ? '' : '-200'}.png` });
      await parts(tree).filter({ hasText: 'Sketch from life' }).click();
      const r = runner(page);
      await expect(settled(page, 'runner')).toBeVisible();
      await expect(r.words).toHaveText('Find a model');
    });
  });
}
