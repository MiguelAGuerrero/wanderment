/**
 * P-96 (contract rulings 7–8 and the amendment, ONE navigation scheme): on every screen the TOP is
 * context only; the BOTTOM, lowest, is the one filled button — the forward choice (Resume <name> on
 * home, Resume at <step> / Start on Plan, Next / Done on the runner); one row above it are the side
 * doors (left: leave for another place — ❚❚ Pause on the runner, ⌂ Home on Plan; right: the other mode
 * or a second action — Plan / Step in, + New, Done at Plan's edge). Next reads Done only when that
 * press ends the whole run; finishing goes home with "Done with <name>" (P-102: × only, no Undo) (never into Plan); Pause
 * goes home (the paused screen is gone). Notices have their own row and never cover a row or a tile —
 * at 390×844 and at 200 % text, with the keyboard up and down.
 *
 * P-101 (rulings 1–6) changed the scheme, and the tests below say what each was: the runner's TOP line is
 * the path with ❚❚ and Plan at its right; its BOTTOM row is the moves (Step in · Step out) and the filled
 * Next, lowest; Finish now left the panel (Step out). Home has no filled bar (a tile's body resumes).
 * Plan's Home is in the band. A Plan edit gives no notice.
 */
import { Locator } from '@playwright/test';

import { expect, test } from './fixtures';
import { exported, expectApart, expectFinal, home, MAYA, openGo, pauseRun, phoneKeyboard, plan, RoutineSpec, runner, saved, seedGo, startGo, tile, tileBody, typeValue } from './goFixture';

const DRAWING: RoutineSpec = {
  id: 'draw',
  name: 'Drawing practice',
  steps: [{ text: 'Select the subject matter', gives: 'subject' }, 'Find three reference photos of {subject}', { routine: 'sketch' }, 'Rank your drawings'],
};
const SKETCH: RoutineSpec = { id: 'sketch', name: 'Sketch', home: false, steps: ['Set a timer', 'Draw it'] };
const OTHER: RoutineSpec = { id: 'other', name: 'Test out the app', steps: ['Pick a feature', 'Vibe check'] };
const ROUTINES = [DRAWING, SKETCH, OTHER];
const at = (n: number, extra: object = {}) => [{ id: 'n1', routine: 'draw', at: n, status: 'running' as const, ...extra }];

const top = async (l: Locator) => (await l.boundingBox())!.y;
const bottom = async (l: Locator) => {
  const b = (await l.boundingBox())!;
  return b.y + b.height;
};
const filled = (l: Locator) => l.evaluate((e) => getComputedStyle(e).backgroundColor);
const PAPER = 'rgb(244, 241, 232)';

test.describe('the runner', () => {
  test('P-101 (ruling 2; was: "top: the path only; bottom: ❚❚ · Plan in one row"): top — the path (not a control) with ❚❚ and Plan at its right; bottom — the moves and Next, filled and lowest', async ({ page }) => {
    await startGo(page, at(1), 'runner', ROUTINES);
    const r = runner(page);
    await expect(r.context).toHaveText('Drawing practice');
    await expect(r.context.getByRole('button')).toHaveCount(0);
    await expect(r.screen.getByRole('button', { name: 'Done', exact: true })).toHaveCount(0);
    await expect(r.screen.getByRole('button', { name: /^Home/ })).toHaveCount(0);
    await expect(r.pause).toHaveAccessibleName('Pause and go home');
    await expect(r.plan).toHaveText('Plan');
    // One line: the path, then ❚❚, then Plan — above the note.
    const c = (await r.context.boundingBox())!;
    const p = (await r.pause.boundingBox())!;
    const m = (await r.plan.boundingBox())!;
    expect(Math.abs(p.y - m.y)).toBeLessThan(2);
    expect(c.x).toBeLessThan(p.x);
    expect(p.x).toBeLessThan(m.x);
    expect(await bottom(r.plan)).toBeLessThanOrEqual(await top(r.note));
    expect(await filled(r.next)).toBe(PAPER);
    await expect(r.next).toHaveText('Next');
    // And on a routine step: Step in, beside Next, in the bottom row.
    await r.next.click();
    await expect(r.stepIn).toHaveText('Step in');
    expect(Math.abs((await top(r.stepIn)) - (await top(r.next)))).toBeLessThan(8);
    expect((await r.stepIn.boundingBox())!.x).toBeLessThan((await r.next.boundingBox())!.x);
  });

  test('Next reads Done only when that press ends the whole run: not on the last step of a routine inside; not before the last step', async ({ page }) => {
    await startGo(page, at(2), 'runner', ROUTINES);
    const r = runner(page);
    await r.stepIn.click();
    await expect(r.words).toHaveText('Set a timer');
    await r.next.click();
    await expect(r.words).toHaveText('Draw it');
    // The last step of Sketch: Next goes on, above it.
    await expect(r.next).toHaveText('Next');
    await r.next.click();
    await expect(r.words).toHaveText('Rank your drawings');
    await expect(r.next).toHaveText('Done');
    await expect(r.next).toHaveAccessibleName('Done with Drawing practice');
  });

  // P-102 (owner, 2026-11-27: "You should not undo a 'Done'"; was: "Done with <name> · Undo", Undo bringing the run back).
  test('finishing: Done ends the run and goes home, "Done with <name>" in its own row — final: × only, no Undo — never Plan', async ({ page }) => {
    await startGo(page, at(3), 'runner', ROUTINES);
    const r = runner(page);
    await expect(r.next).toHaveText('Done');
    await r.next.click();
    const h = home(page);
    await expect(h.screen).toBeVisible();
    await expect(page).not.toHaveURL(/plan/);
    await expect(h.notice).toContainText('Done with Drawing practice');
    await expect(() => expectApart(page, { notice: h.notice, tiles: h.screen.getByTestId('go-tiles'), doors: h.doors })).toPass({ timeout: 5000 });
    expect(await top(h.doors)).toBeGreaterThanOrEqual(await bottom(h.notice));
    await expectFinal(page, 'Drawing practice');
    // Ctrl/⌘+Z brings nothing back either.
    await page.keyboard.press('ControlOrMeta+z');
    await expect(home(page).screen).toBeVisible();
    await saved(page);
    expect(Object.values((await exported(page)).runs)[0].endedAt).toBeTruthy();
  });

  test('the pull-up panel: Back to, Jump to… — P-101 (ruling 1; was: and Finish <level> now): finishing a level early is Step out, beside Next; on the first layer there is none', async ({ page }) => {
    await startGo(page, at(2), 'runner', ROUTINES);
    const r = runner(page);
    await r.stepIn.click();
    await r.next.click();
    await r.handle.click();
    await expect(r.panel.getByRole('button', { name: 'Back to Set a timer', exact: true })).toBeVisible();
    await expect(r.panel.getByRole('button', { name: 'Jump to…', exact: true })).toBeVisible();
    await expect(r.panel.getByRole('button', { name: /^Finish/ })).toHaveCount(0);
    await r.handle.click();
    await expect(r.stepOut).toHaveAccessibleName('Step out of Sketch');
    await r.stepOut.click();
    await expect(r.words).toHaveText('Rank your drawings');
    await expect(r.stepOut).toHaveCount(0);
  });

  test('Pause goes home: the run marked "last", its tile body resumes it (P-101, ruling 5; was: "Resume <name>" the filled bar, the tile without Resume) — and back where it was', async ({ page }) => {
    await startGo(page, at(1, { values: [{ name: 'subject', items: ['hands'], level: 0, seq: 'draw', item: 'draw-0', words: 'Select the subject matter', at: new Date().toISOString() }] }), 'runner', ROUTINES);
    await pauseRun(page);
    const h = home(page);
    await expect(h.screen).toBeVisible();
    await expect(page).toHaveURL(/\/go$/);
    await expect(h.tiles.first()).toContainText('Drawing practice');
    const t = tile(page, 'Drawing practice');
    await expect(t.getByTestId('go-tile-last')).toHaveText('last');
    await expect(t.getByTestId('go-tile-line')).toHaveText('at Find three reference photos of hands');
    await expect(tileBody(page, 'Drawing practice')).toHaveAccessibleName(/^Resume Drawing practice/);
    await expect(t.getByRole('button', { name: 'Plan Drawing practice', exact: true })).toBeVisible();
    await expect(page.getByTestId('go-resume')).toHaveCount(0);
    // No notice for Pause.
    await expect(h.notice).toHaveCount(0);
    await saved(page);
    expect(Object.values((await exported(page)).runs)[0].status).toBe('paused');
    await openGo(page);
    await tileBody(page, 'Drawing practice').click();
    await expect(runner(page).words).toHaveText('Find three reference photos of hands');
  });

  test('the paused screen is gone: its old address lands home, the paused run first (P-101: its body resumes it)', async ({ page }) => {
    await startGo(page, [{ id: 'n1', routine: 'draw', at: 1, status: 'paused' }], 'home', ROUTINES);
    await page.goto('./go/run/n1/paused');
    await expect(home(page).screen).toBeVisible();
    await expect(tileBody(page, 'Drawing practice')).toHaveAccessibleName(/^Resume Drawing practice/);
  });
});

test.describe('home', () => {
  test('no title in words and no prompt; ⚙ top right; + New a side door (right), opening its own sheet; nothing filled with nothing to resume', async ({ page }) => {
    await startGo(page, [], 'home', ROUTINES);
    const h = home(page);
    await expect(h.screen.getByText('Nothing running', { exact: true })).toHaveCount(0);
    await expect(h.screen.getByText('Running', { exact: true })).toHaveCount(0);
    await expect(h.screen.getByRole('textbox')).toHaveCount(0);
    await expect(h.title).toHaveText('Home');
    const gear = h.screen.getByTestId('go-settings-btn');
    expect((await gear.boundingBox())!.y).toBeLessThan(80);
    expect((await gear.boundingBox())!.x).toBeGreaterThan(300);
    await expect(page.getByTestId('go-resume')).toHaveCount(0);
    await expect(h.newBtn).toHaveText('New');
    const n = (await h.newBtn.boundingBox())!;
    expect(n.x + n.width / 2).toBeGreaterThan(195);
    await h.newBtn.click();
    await expect(page.getByTestId('go-new-sheet')).toBeVisible();
  });
});

test.describe('Plan', () => {
  test('P-101 (ruling 2; was: "the band says PLAN and nothing else; ⌂ Home the bottom-left side door"): the band says PLAN with ⌂ Home at its right edge; the filled button lowest; Done only at the edge', async ({ page }) => {
    await seedGo(page, ROUTINES, [{ id: 'n1', routine: 'other', at: 1, status: 'paused', mode: 'plan' }]);
    await openGo(page, 'plan', './go/run/n1/plan');
    const p = plan(page);
    await expect(p.word).toHaveText('PLAN');
    await expect(p.band.getByRole('button')).toHaveCount(1);
    await expect(p.home).toHaveText('Home');
    const band = (await p.band.boundingBox())!;
    const hm = (await p.home.boundingBox())!;
    expect(hm.y).toBeGreaterThanOrEqual(band.y);
    expect(hm.y + hm.height).toBeLessThanOrEqual(band.y + band.height + 0.5);
    expect(hm.x + hm.width).toBeGreaterThan(band.x + band.width - 40);
    await expect(p.done).toHaveCount(0);
    await expect(p.forward).toHaveText('Resume at Vibe check');
    expect(await top(p.forward)).toBeGreaterThanOrEqual(await bottom(p.list) - 1);
    await p.home.click();
    await expect(home(page).screen).toBeVisible();
  });

  test('at the edge (a run the build before left there): Done is the right side door; Home stays in the band', async ({ page }) => {
    await startGo(page, [{ id: 'n1', routine: 'other', at: null, status: 'paused', mode: 'plan' }], 'plan', ROUTINES);
    const p = plan(page);
    await expect(p.done).toHaveAccessibleName('Done with Test out the app');
    const d = (await p.done.boundingBox())!;
    const hm = (await p.home.boundingBox())!;
    expect(d.y).toBeGreaterThan(hm.y);
    expect(d.x + d.width).toBeGreaterThan(195);
    await p.done.click();
    await expect(home(page).notice).toContainText('Done with Test out the app');
  });
});

test.describe('notices have their own row: never over a row, a tile, the note or the buttons', () => {
  const sizes = [
    { name: '390×844', width: 390, height: 844 },
    { name: '200 % text (195×422)', width: 195, height: 422 },
  ];
  for (const size of sizes) {
    test(`home, Plan and the runner at ${size.name}, keyboard down and up`, async ({ page }) => {
      test.setTimeout(60_000);
      await page.setViewportSize({ width: size.width, height: size.height });
      // The runner: a notice (Changed {subject}) beside the note, a field, the values row, the doors.
      await startGo(page, at(1, { values: [{ name: 'subject', items: ['hands'], level: 0, seq: 'draw', item: 'draw-0', words: 'Select the subject matter', at: new Date().toISOString() }] }), 'runner', [...ROUTINES, ...MAYA]);
      const r = runner(page);
      await r.values.first().click();
      await page.getByTestId('go-value-sheet-field').fill('feet');
      await page.getByTestId('go-value-keep').click();
      await expect(r.notice).toContainText('Changed {subject}');
      const runnerParts = () => ({ notice: r.notice, note: r.note, values: r.screen.getByTestId('go-values'), pause: r.pause, plan: r.plan, next: r.next, handle: r.handle });
      await expect(() => expectApart(page, runnerParts())).toPass({ timeout: 5000 });
      // Back one step to the giving field — P-101 (ruling 7; was: typed in place): its sheet, over the keyboard; the notice goes at that tap.
      await phoneKeyboard(page);
      await r.handle.click();
      await r.panel.getByRole('button', { name: /^Back to/ }).click();
      await typeValue(page, 'subject', 'feet and hands');
      await expect(() => expectApart(page, { ...runnerParts(), field: r.field('subject') })).toPass({ timeout: 5000 });

      // Home: Done with … beside the tiles (P-101: the last Next; was: Finish now from the panel).
      await openGo(page, 'runner');
      for (const words of ['Select the subject matter', 'Find three reference photos of feet and hands', 'Sketch', 'Rank your drawings']) {
        await expect(r.words).toHaveText(words);
        await r.next.click();
      }
      const h = home(page);
      await expect(h.notice).toContainText('Done with Drawing practice');
      await expect(() => expectApart(page, { notice: h.notice, tiles: h.screen.getByTestId('go-tiles'), doors: h.doors })).toPass({ timeout: 5000 });

      // Plan — P-101 (ruling 6; was: an edit's notice beside the rows): an edit gives none; the fold of an earlier build's this-run changes does (a notice that is not an edit) — never over the rows or the filled button; then typing (keyboard up).
      await tile(page, 'Test out the app').getByRole('button', { name: 'Plan Test out the app', exact: true }).click();
      const p = plan(page);
      await p.add.fill('Write down concerns');
      await p.add.press('Enter');
      await expect(p.notice).toHaveCount(0);
      await expect(() => expectApart(page, { list: p.list, home: p.home, forward: p.forward })).toPass({ timeout: 5000 });
      await phoneKeyboard(page);
      await p.add.click();
      await p.add.fill('One more');
      await expect(() => expectApart(page, { add: p.add, home: p.home, forward: p.forward })).toPass({ timeout: 5000 });
    });
  }
});
