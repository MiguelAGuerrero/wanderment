/**
 * P-103 (the conventions audit, 2026-11-27, `.polish/product/ui-audit-conventions-2026-11-27.md`): predictable
 * moves, one way out, safe ends, honest states. One test (or more) per line of the item's Done when, (1)–(12).
 * Expected values come from the roadmap item and the audit's conventions, not from the code.
 */
import { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { arrived, exported, home, openGo, openRoutines, openSettings, chooseBackup, pauseRun, plan, planFromRoutines, planMenu, routines, RoutineSpec, runner, saved, settled, startFromRoutines, startGo, tile, tileBody, editPlan, savePlan } from './goFixture';

const TEA: RoutineSpec = { id: 'tea', name: 'Make tea', steps: ['Boil the water', 'Pour it over the leaves'] };
const OUTER: RoutineSpec = { id: 'apply', name: 'Apply to Initech', steps: ['Read the job ad twice', { routine: 'proof' }, 'Send the application'] };
const PROOF: RoutineSpec = { id: 'proof', name: 'Proofread out loud', home: false, steps: ['Read it aloud once', 'Fix what you stumble on'] };
const HANDS: RoutineSpec = { id: 'hands', name: 'Hand studies', repeatFrom: 1, repeat: 3, steps: ['Find a reference photo', 'Block in the big shapes', 'Add the shadows'] };
const DOUBTS: RoutineSpec = { id: 'doubts', name: 'Improve my workout routine', steps: [{ text: 'List out my doubts', gives: 'concerns' }, 'Warm up {concerns}'] };

const box = async (l: Locator) => (await l.boundingBox())!;
/** The routine's colour of an error (G.err), and the filled paper button's background (G.paper). */
const ERR = 'rgb(255, 138, 122)';
const PAPER = 'rgb(244, 241, 232)';
/** ❚❚ — the pause mark, drawn as its two bars. */
const PAUSE_MARK = 'svg:has(rect[width="4"][height="14"])';

test.describe('(1) a quick second tap can never end a run', () => {
  test('a second tap on Next 250 ms after the first lands on a guarded Done (its own label and mark): the run goes on; a deliberate press later ends it', async ({ page }) => {
    await startGo(page, [{ id: 'r', routine: 'tea', at: 0, status: 'running' }], 'runner', [TEA]);
    const r = runner(page);
    await expect(r.next).toHaveText('Next');
    const nextMark = await r.next.locator('svg path').getAttribute('d');
    const b = await box(r.next);
    const x = b.x + b.width / 2;
    const y = b.y + b.height / 2;
    await page.mouse.click(x, y);
    await page.waitForTimeout(250);
    await page.mouse.click(x, y);
    // Still running, on the last step: Done is shown, and the second tap did nothing.
    await expect(r.words).toHaveText('Pour it over the leaves');
    await expect(r.next).toHaveText('Done');
    await expect(settled(page, 'runner')).toBeVisible();
    // Done looks different from Next: its own word and its own mark (not Next's arrow).
    const doneMark = await r.next.locator('svg path').getAttribute('d');
    expect(doneMark).toBeTruthy();
    expect(doneMark).not.toBe(nextMark);
    // A press once it has been there a moment ends the run (final: × only).
    await page.waitForTimeout(700);
    await r.next.click();
    await expect(settled(page, 'home')).toBeVisible();
    await expect(home(page).notice).toContainText('Done with Make tea');
  });
});

test.describe('(1, audit F1) a quick second tap after Resume never ends the run', () => {
  const LAST = [{ id: 'r', routine: 'tea', at: 1, status: 'paused' as const }];
  const doubleTap = async (page: Page, l: Locator, ms: number) => {
    const b = await box(l);
    const x = b.x + b.width / 2;
    const y = b.y + b.height / 2;
    await page.mouse.click(x, y);
    await page.waitForTimeout(ms);
    await page.mouse.click(x, y);
  };
  const stillRunning = async (page: Page) => {
    await expect(runner(page).words).toHaveText('Pour it over the leaves');
    await expect(runner(page).next).toHaveText('Done');
    await page.waitForTimeout(300);
    await expect(settled(page, 'runner')).toBeVisible();
    await saved(page);
    expect((await exported(page)).runs.r.endedAt).toBeUndefined();
  };
  for (const ms of [150, 250, 400]) {
    test(`Plan's "Resume at <last step>" (opened from home) tapped twice ${ms} ms apart`, async ({ page }) => {
      await startGo(page, LAST, 'home', [TEA]);
      await tile(page, 'Make tea').getByRole('button', { name: 'Plan Make tea', exact: true }).click();
      await expect(plan(page).forward).toHaveText('Resume at Pour it over the leaves');
      await doubleTap(page, plan(page).forward, ms);
      await stillRunning(page);
    });

    test(`Plan's Resume (opened over the runner) tapped twice ${ms} ms apart`, async ({ page }) => {
      await startGo(page, [{ ...LAST[0], status: 'running' }], 'runner', [TEA]);
      await runner(page).plan.click();
      await expect(plan(page).forward).toHaveText('Resume at Pour it over the leaves');
      await doubleTap(page, plan(page).forward, ms);
      await stillRunning(page);
    });

    test(`a paused tile's Resume tapped twice ${ms} ms apart`, async ({ page }) => {
      await startGo(page, LAST, 'home', [TEA]);
      await doubleTap(page, tile(page, 'Make tea').getByTestId('go-tile-resume'), ms);
      await stillRunning(page);
    });
  }

  test('Return on the note still works at once (a deliberate key press is never held)', async ({ page }) => {
    await startGo(page, [{ ...LAST[0], status: 'running' }], 'runner', [TEA]);
    await expect(runner(page).note).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(settled(page, 'home')).toBeVisible();
    await expect(home(page).notice).toContainText('Done with Make tea');
  });
});

test.describe('(11, audit F3/F4) the names picker opens only at a word start and Return is the person’s choice', () => {
  test('"me@co" and "json {" add literally; the caret moved away closes it; a name put in after a word gets a space before it', async ({ page }) => {
    await startGo(page, [], 'home', [DOUBTS]);
    // P-97 (was: its idle tile's Plan): a routine with nothing going is on My routines — its row opens its Plan.
    await planFromRoutines(page, 'Improve my workout routine');
    const p = plan(page);
    await editPlan(page); // (P-115, rewritten: Plan opens read-only — Edit first.)
    await p.add.click();
    await p.add.pressSequentially('Write to me@co');
    await expect(p.namesBar).toHaveAttribute('data-picking', 'false');
    await p.add.press('Enter');
    await expect(p.row('Write to me@co')).toHaveCount(1);
    await p.add.pressSequentially('json {');
    await expect(p.namesBar).toHaveAttribute('data-picking', 'true');
    await p.add.press('Enter');
    await expect(p.row('json {')).toHaveCount(1);
    await expect(p.add).toHaveValue('');
    await p.add.pressSequentially('Rank @con');
    await expect(p.namesBar).toHaveAttribute('data-picking', 'true');
    await p.add.press('Home');
    await expect(p.namesBar).toHaveAttribute('data-picking', 'false');
    await p.add.press('Enter');
    await expect(p.row('Rank @con')).toHaveCount(1);
    // A non-name character closes it.
    await p.add.pressSequentially('Try @co.');
    await expect(p.namesBar).toHaveAttribute('data-picking', 'false');
    await p.add.fill('');
    // F4: after a word, a space before the name too.
    await p.add.pressSequentially('Warm up');
    await p.names.first().click();
    await expect(p.add).toHaveValue('Warm up {concerns} ');
  });
});

test.describe('(2) one way out, always top-left', () => {
  test('the runner’s ❚❚ Pause (word and mark), Plan’s ⌂ Home and Settings’ ← are each the first control at the top-left; a sheet keeps Close lowest', async ({ page }) => {
    await startGo(page, [{ id: 'r', routine: 'tea', at: 0, status: 'running' }], 'runner', [TEA]);
    const r = runner(page);
    await expect(r.pause).toHaveText('Pause');
    await expect(r.pause.locator(PAUSE_MARK)).toHaveCount(1);
    await expect(r.pause).toHaveAccessibleName(/^Pause/);
    const pb = await box(r.pause);
    const cb = await box(r.context);
    expect(pb.x).toBeLessThanOrEqual(40);
    expect(pb.y).toBeLessThanOrEqual(64);
    expect(pb.x + pb.width).toBeLessThanOrEqual(cb.x + 1);
    // Sheets: Close is the lowest control.
    await r.pause.click();
    const sheet = await arrived(page, 'go-pause-sheet');
    const buttons = sheet.getByRole('button');
    const n = await buttons.count();
    const last = buttons.nth(n - 1);
    await expect(last).toHaveText('Close');
    for (let i = 0; i < n - 1; i++) expect((await box(buttons.nth(i))).y).toBeLessThan((await box(last)).y);
    await sheet.getByTestId('go-pause-confirm').click();
    // Plan (from home): ⌂ Home at the top-left.
    await tile(page, 'Make tea').getByRole('button', { name: 'Plan Make tea', exact: true }).click();
    const p = plan(page);
    await expect(p.home).toHaveText('Home');
    const hb = await box(p.home);
    const wb = await box(p.word);
    expect(hb.x).toBeLessThanOrEqual(24);
    expect(hb.y).toBeLessThanOrEqual(16);
    expect(hb.x + hb.width).toBeLessThanOrEqual(wb.x + 1);
    await p.home.click();
    // Settings: ← at the top-left.
    await home(page).screen.getByTestId('go-settings-btn').click();
    const back = settled(page, 'settings').getByRole('button', { name: 'Back', exact: true });
    const bb = await box(back);
    expect(bb.x).toBeLessThanOrEqual(24);
    expect(bb.y).toBeLessThanOrEqual(16);
  });
});

test.describe('(3) Plan opened from the runner', () => {
  test('says so, and its Back returns to the runner where you were — so does the browser’s Back', async ({ page }) => {
    await startGo(page, [{ id: 'r', routine: 'apply', at: 2, status: 'running' }], 'runner', [OUTER, PROOF]);
    const r = runner(page);
    await expect(r.words).toHaveText('Send the application');
    await r.plan.click();
    const p = plan(page);
    const back = p.screen.getByTestId('go-plan-back');
    await expect(back).toHaveText('Back to the run');
    await expect(p.home).toHaveCount(0);
    expect((await box(back)).x).toBeLessThanOrEqual(24);
    await back.click();
    await expect(runner(page).words).toHaveText('Send the application');
    await expect(page).toHaveURL(/\/go\/run\/r$/);
    // The browser's Back, the same.
    await runner(page).plan.click();
    await expect(plan(page).screen.getByTestId('go-plan-back')).toBeVisible();
    await page.goBack();
    await expect(runner(page).words).toHaveText('Send the application');
    // And Back from the runner is not Plan again (the runner is where Plan was opened from).
    await saved(page);
    expect((await exported(page)).runs.r.status).toBe('running');
  });
});

test.describe('(4) a paused tile shows a visible Resume', () => {
  test('"Resume" in words where Start sat on an idle tile (P-97: idle tiles are gone — the first control of the foot, at its left, before Plan); it and the body both resume', async ({ page }) => {
    await startGo(page, [{ id: 'r', routine: 'tea', at: 1, status: 'paused' }], 'home', [TEA, HANDS]);
    const resume = tile(page, 'Make tea').getByTestId('go-tile-resume');
    await expect(resume).toHaveText('Resume');
    await expect(resume).toHaveAccessibleName('Resume Make tea');
    const rb = await box(resume);
    expect(rb.height).toBeGreaterThanOrEqual(48);
    // P-97 (was: in the place Start had on an idle tile beside it): the first control of the tile's foot, at its left, Plan after it.
    const tb = await box(tile(page, 'Make tea'));
    const pb = await box(tile(page, 'Make tea').getByRole('button', { name: 'Plan Make tea', exact: true }));
    expect(rb.x - tb.x).toBeLessThanOrEqual(16);
    expect(rb.x).toBeLessThan(pb.x);
    await resume.click();
    await expect(runner(page).words).toHaveText('Pour it over the leaves');
    await pauseRun(page);
    await tileBody(page, 'Make tea').click();
    await expect(runner(page).words).toHaveText('Pour it over the leaves');
  });
});

test.describe('(5) removing says so', () => {
  test('removing a step shows a notice with a labelled Undo, which brings it back', async ({ page }) => {
    await startGo(page, [], 'home', [TEA]);
    // P-97 (was: its idle tile's Plan): a routine with nothing going is on My routines — its row opens its Plan.
    await planFromRoutines(page, 'Make tea');
    const p = plan(page);
    await planMenu(page, 'Boil the water', 'Remove');
    await expect(p.row('Boil the water')).toHaveCount(0);
    await expect(p.notice).toContainText('Removed “Boil the water”');
    const undo = p.notice.getByRole('button', { name: /^Undo/ });
    await expect(undo).toHaveText('Undo');
    await undo.click();
    await expect(p.row('Boil the water')).toHaveCount(1);
  });

  test('removing a routine asks first; Cancel keeps it; Remove takes it off My routines (P-97; was: off home) with Undo', async ({ page }) => {
    await startGo(page, [], 'home', [TEA, HANDS]);
    // P-97 (was: its idle tile's Plan): a routine with nothing going is on My routines — its row opens its Plan.
    await planFromRoutines(page, 'Make tea');
    const ask = async () => {
      await editPlan(page); // (P-115, rewritten: the routine's ··· edits are Edit's — Edit first.)
      await plan(page).screen.getByTestId('go-plan-more').click();
      const menu = await arrived(page, 'go-plan-routine');
      await menu.getByRole('menuitem', { name: 'Remove Make tea', exact: true }).click();
      const dialog = page.getByRole('alertdialog');
      await expect(dialog.getByRole('heading')).toHaveText('Remove “Make tea”?');
      return dialog;
    };
    let dialog = await ask();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(plan(page).title).toHaveText('Make tea');
    dialog = await ask();
    // P-97 (was: "It goes from home, with its steps."): it is on My routines now.
    await expect(dialog.getByTestId('go-confirm-body')).toHaveText('It goes from My routines, with its steps.');
    await dialog.getByRole('button', { name: 'Remove', exact: true }).click();
    // P-97 (was: home): its Plan was opened from My routines — the screen goes back there, with the notice.
    await expect(settled(page, 'routines')).toBeVisible();
    await expect(routines(page).row('Make tea')).toHaveCount(0);
    await expect(routines(page).notice).toContainText('Removed “Make tea”');
    await routines(page).notice.getByRole('button', { name: /^Undo/ }).click();
    await expect(routines(page).row('Make tea')).toHaveCount(1);
  });
});

test.describe('(6) a paused run can be ended from its tile', () => {
  test('··· → "End this run" asks first; End ends it (final), the routine stays to Start (P-97: on My routines; was: its tile, idle), across a reload', async ({ page }) => {
    await startGo(page, [{ id: 'r', routine: 'tea', at: 1, status: 'paused' }], 'home', [TEA]);
    await tile(page, 'Make tea').getByTestId('go-tile-more').click();
    const menu = await arrived(page, 'go-tile-menu');
    await menu.getByRole('menuitem', { name: /^End this run/ }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog.getByRole('heading')).toHaveText('End this run of Make tea?');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(tile(page, 'Make tea')).toHaveAttribute('data-state', 'paused');
    await tile(page, 'Make tea').getByTestId('go-tile-more').click();
    await (await arrived(page, 'go-tile-menu')).getByRole('menuitem', { name: /^End this run/ }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'End this run', exact: true }).click();
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    // P-97 (was: its tile, idle): ended, it leaves home.
    await expect(tile(page, 'Make tea')).toHaveCount(0);
    await expect(home(page).notice).toContainText('Done with Make tea');
    await expect(home(page).notice.getByRole('button', { name: /Undo/ })).toHaveCount(0);
    await saved(page);
    await page.reload();
    await expect(tile(page, 'Make tea')).toHaveCount(0);
    // It stays to Start — from My routines.
    const list = await openRoutines(page);
    await list.more('Make tea').click();
    await expect((await arrived(page, 'go-routine-menu')).getByRole('menuitem', { name: 'Start Make tea', exact: true })).toBeEnabled();
    await page.keyboard.press('Escape');
    const stored = (await exported(page)).runs.r;
    expect(stored.endedAt).toBeTruthy();
    expect(stored.frames).toEqual([{ seq: 'tea', at: 'tea-1', round: 1 }]);
  });
});

test.describe('(6, audit F5/F6) End this run is for a paused run only, and keeps the pause note', () => {
  test('a run resting on a wait has no "End this run"; a paused one ended keeps its note in the record', async ({ page }) => {
    const ACME: RoutineSpec = { id: 'acme', name: 'Apply to Acme', steps: ['Send the application', { wait: 'a reply from Acme' }, 'Note the answer'] };
    await startGo(page, [{ id: 'w', routine: 'acme', at: 1, waitingDaysAgo: 2 }, { id: 'r', routine: 'tea', at: 1, status: 'paused', reason: 'lunch' }], 'home', [ACME, TEA]);
    await tile(page, 'Apply to Acme').getByTestId('go-tile-more').click();
    const menu = await arrived(page, 'go-tile-menu');
    await expect(menu.getByRole('menuitem', { name: /^End this run/ })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await tile(page, 'Make tea').getByTestId('go-tile-more').click();
    await (await arrived(page, 'go-tile-menu')).getByRole('menuitem', { name: /^End this run/ }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'End this run', exact: true }).click();
    await expect(tile(page, 'Make tea')).toHaveCount(0); // P-97 (was: its tile, idle): ended, it leaves home
    await saved(page);
    const stored = (await exported(page)).runs.r as { endedAt?: string; reason?: string };
    expect(stored.endedAt).toBeTruthy();
    expect(stored.reason).toBe('lunch');
  });
});

test.describe('(7) removing a nested routine’s row never strands that routine', () => {
  // P-97 (was: "gets its tile on home"): every named routine is on My routines, so nothing can be stranded; the
  // stored mark P-103 gives it ("home") is still written, in the same write.
  test('the routine it used stays on My routines (and gets P-103’s stored mark), across a reload', async ({ page }) => {
    await startGo(page, [], 'home', [OUTER, PROOF]);
    await expect((await openRoutines(page)).row('Proofread out loud')).toHaveCount(1);
    await routines(page).row('Apply to Initech').getByTestId('go-routine-body').click();
    await planMenu(page, 'Proofread out loud', 'Remove');
    await expect(plan(page).row('Proofread out loud')).toHaveCount(0);
    await savePlan(page); // (P-115, rewritten: saved first — a run, home and the backup read the saved routine.)
    await plan(page).toRoutines.click();
    await expect(routines(page).row('Proofread out loud')).toHaveCount(1);
    await saved(page);
    expect((await exported(page)).routines.proof).toMatchObject({ home: true });
    await openGo(page);
    await expect((await openRoutines(page)).row('Proofread out loud')).toHaveCount(1);
  });
});

test.describe('(7, after build) removing a whole routine never strands a routine only it used', () => {
  test('the routine it used stays on My routines (P-97; was: gets its tile on home); Undo takes the removal back; it stays across a reload', async ({ page }) => {
    await startGo(page, [], 'home', [OUTER, PROOF, TEA]);
    await planFromRoutines(page, 'Apply to Initech');
    await editPlan(page); // (P-115, rewritten: the routine's ··· edits are Edit's — Edit first.)
    await plan(page).screen.getByTestId('go-plan-more').click();
    await (await arrived(page, 'go-plan-routine')).getByRole('menuitem', { name: 'Remove Apply to Initech', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Remove', exact: true }).click();
    // (Its Plan was opened from My routines: the screen goes back there, with the notice.)
    await expect(settled(page, 'routines')).toBeVisible();
    await routines(page).notice.getByRole('button', { name: /^Undo/ }).click();
    await expect(routines(page).row('Apply to Initech')).toHaveCount(1);
    await expect(routines(page).row('Proofread out loud')).toHaveCount(1);
    await saved(page);
    expect((await exported(page)).routines.proof).toMatchObject({ home: false });
    // Removed again: across a reload, still reachable.
    await openGo(page);
    await planFromRoutines(page, 'Apply to Initech');
    await editPlan(page); // (P-115, rewritten: the routine's ··· edits are Edit's — Edit first.)
    await plan(page).screen.getByTestId('go-plan-more').click();
    await (await arrived(page, 'go-plan-routine')).getByRole('menuitem', { name: 'Remove Apply to Initech', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(settled(page, 'routines')).toBeVisible();
    await saved(page);
    expect((await exported(page)).routines.proof).toMatchObject({ home: true });
    await openGo(page);
    const list = await openRoutines(page);
    await expect(list.row('Proofread out loud')).toHaveCount(1);
    await expect(list.row('Apply to Initech')).toHaveCount(0);
  });
});

/** The unified confirm: a question as its title, the consequence in one line, Cancel filled, the destructive verb in red, focus trapped, Esc cancels. */
async function expectConfirm(page: Page, verb: string) {
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading')).toHaveText(/\?$/);
  await expect(dialog.getByTestId('go-confirm-body')).toHaveCount(1);
  const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true });
  const act = dialog.getByRole('button', { name: verb, exact: true });
  await expect(cancel).toBeFocused();
  expect(await cancel.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe(PAPER);
  expect(await act.evaluate((e) => getComputedStyle(e).backgroundColor)).not.toBe(PAPER);
  expect(await act.locator('div[dir="auto"]').first().evaluate((e) => getComputedStyle(e).color)).toBe(ERR);
  // Focus stays inside: Tab and Shift+Tab never leave the dialog.
  for (const key of ['Tab', 'Tab', 'Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab']) {
    await page.keyboard.press(key);
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role="alertdialog"]'))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
}


test.describe('(8) every destructive confirm is one dialog', () => {
  test('Start over (tile), End this run, Start over (runner panel), removing a giving step with readers, removing a routine', async ({ page }) => {
    await startGo(page, [{ id: 'r', routine: 'tea', at: 1, status: 'paused' }], 'home', [TEA, DOUBTS]);
    const more = tile(page, 'Make tea').getByTestId('go-tile-more');
    await more.click();
    await (await arrived(page, 'go-tile-menu')).getByRole('menuitem', { name: /^Start over/ }).click();
    await expectConfirm(page, 'Start over');
    await more.click();
    await (await arrived(page, 'go-tile-menu')).getByRole('menuitem', { name: /^End this run/ }).click();
    await expectConfirm(page, 'End this run');
    // Nothing changed: Esc cancelled each.
    await expect(tile(page, 'Make tea')).toHaveAttribute('data-state', 'paused');
    await tile(page, 'Make tea').getByTestId('go-tile-resume').click();
    await runner(page).handle.click();
    await runner(page).panel.getByTestId('go-restart-run').click();
    await expectConfirm(page, 'Start over');
    await pauseRun(page);
    // P-97 (was: its idle tile's Plan): a routine with nothing going is on My routines — its row opens its Plan.
    await planFromRoutines(page, 'Improve my workout routine');
    await planMenu(page, 'List out my doubts', 'Remove');
    await expectConfirm(page, 'Remove');
    await expect(plan(page).row('List out my doubts')).toHaveCount(1);
    await editPlan(page); // (P-115, rewritten: the routine's ··· edits are Edit's — Edit first.)
    await plan(page).screen.getByTestId('go-plan-more').click();
    await (await arrived(page, 'go-plan-routine')).getByRole('menuitem', { name: 'Remove Improve my workout routine', exact: true }).click();
    await expectConfirm(page, 'Remove');
    await expect(plan(page).title).toHaveText('Improve my workout routine');
  });
});

test.describe('(9) home with no routines', () => {
  test('an empty state in one line, with + New as its one action', async ({ page }) => {
    await openGo(page);
    const h = home(page);
    const empty = h.screen.getByTestId('go-home-empty');
    await expect(empty).toBeVisible();
    await expect(empty).toHaveText(/\S/);
    await expect(h.tiles).toHaveCount(0);
    // Its one action is + New (⚙ is the screen's own, at the top).
    const buttons = h.screen.getByRole('button');
    await expect(buttons).toHaveCount(2);
    await expect(h.newBtn).toBeVisible();
    await expect(h.screen.getByTestId('go-settings-btn')).toBeVisible();
    // The empty state is not left behind once there is a routine.
    await h.newBtn.click();
    const sheet = await arrived(page, 'go-new-sheet');
    await sheet.getByTestId('go-new-name').fill('Make tea');
    await sheet.getByTestId('go-new-plan').click();
    await plan(page).home.click();
    await expect(home(page).screen.getByTestId('go-home-empty')).toHaveCount(0);
  });
});

test.describe('(10) conventional glyphs, one meaning each', () => {
  test('↻ for repeat (Plan’s divider, the panel’s round), › for open on a routine row, ❚❚ only on Pause', async ({ page }) => {
    await startGo(page, [{ id: 'r', routine: 'hands', at: 1, status: 'paused', reason: 'out of paper' }], 'home', [HANDS, OUTER, PROOF]);
    // ❚❚ is not the paused state on a tile.
    await expect(tile(page, 'Hand studies').locator(PAUSE_MARK)).toHaveCount(0);
    // ↻: a circular arrow (an arc), not ⇄.
    await tile(page, 'Hand studies').getByRole('button', { name: 'Plan Hand studies', exact: true }).click();
    const d = await plan(page).divider.locator('svg path').first().getAttribute('d');
    expect(d).toMatch(/a/i);
    await plan(page).home.click();
    // › for open: the routine row's open control is a chevron, not the routine mark (▤).
    // (P-97, was: its idle tile's Plan: from My routines, and back.)
    await planFromRoutines(page, 'Apply to Initech');
    const open = plan(page).screen.getByRole('button', { name: 'Open Proofread out loud', exact: true });
    await expect(open.locator('rect')).toHaveCount(0);
    const chevron = await open.locator('svg path').getAttribute('d');
    expect(chevron).toMatch(/^M\s*\d+\s+\d+l/);
    await plan(page).toRoutines.click();
    await routines(page).home.click();
    // On the runner: ❚❚ only on Pause — the pause note has its own mark.
    await tileBody(page, 'Hand studies').click();
    const r = runner(page);
    await expect(r.reason).toBeVisible();
    await expect(r.reason.locator(PAUSE_MARK)).toHaveCount(0);
    await expect(r.screen.locator(PAUSE_MARK)).toHaveCount(1);
    await expect(r.pause.locator(PAUSE_MARK)).toHaveCount(1);
    await r.handle.click();
    const round = r.panel.getByText('Round 1 of 3', { exact: true });
    await expect(round).toBeVisible();
    expect(await round.locator('xpath=..').locator('svg path').first().getAttribute('d')).toMatch(/a/i);
  });
});

for (const size of [
  { name: '390×844', width: 390, height: 844 },
  { name: '200 % text (195×422)', width: 195, height: 422 },
]) {
  test.describe(`(11) the step field in Plan, at ${size.name}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
    });

    test('it grows with its words (never clips), Insert and Add sit below it, "@" or "{" opens the names, and an inserted name gets a space after it', async ({ page }) => {
      await startGo(page, [], 'home', [DOUBTS]);
      // P-97 (was: its idle tile's Plan): a routine with nothing going is on My routines — its row opens its Plan.
    await planFromRoutines(page, 'Improve my workout routine');
      const p = plan(page);
      await editPlan(page); // (P-115, rewritten: Plan opens read-only — Edit first.)
      await p.add.click();
      await p.add.pressSequentially('For each concern, @');
      await expect(p.namesBar).toHaveAttribute('data-picking', 'true');
      await expect(p.names).toHaveText(['{concerns}']);
      // (Audit F3: Return inserts only a name the person has chosen — ↓ here, or typing part of it.)
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await expect(p.add).toHaveValue('For each concern, {concerns} ');
      await expect(p.add).toBeFocused();
      await p.add.pressSequentially('research what each one costs me and write down what I find out about it in the notes');
      await expect(p.add).toHaveValue('For each concern, {concerns} research what each one costs me and write down what I find out about it in the notes');
      // Never clipped: the whole of it is drawn.
      const clip = await p.add.evaluate((e) => (e as HTMLTextAreaElement).scrollHeight - (e as HTMLTextAreaElement).clientHeight);
      expect(clip).toBeLessThanOrEqual(1);
      // Insert and Add are below the field, not beside it.
      const fb = await box(p.add);
      for (const id of ['go-insert', 'go-plan-add-btn']) expect((await box(p.screen.getByTestId(id))).y).toBeGreaterThanOrEqual(fb.y + fb.height - 1);
      expect(fb.width).toBeGreaterThan(size.width * 0.6);
      // "{" opens them too; a chip picked replaces what was typed after it.
      await p.add.fill('');
      await p.add.pressSequentially('Rank {con');
      await expect(p.namesBar).toHaveAttribute('data-picking', 'true');
      await p.names.first().click();
      await expect(p.add).toHaveValue('Rank {concerns} ');
      await expect(p.add).toBeFocused();
      await p.add.press('Enter');
      await expect(p.row('Rank {concerns}')).toHaveCount(1);
    });
  });
}

test.describe('(12) the update banner, Jump, Settings errors', () => {
  test('the update banner never covers a control (Plan’s Home, the runner’s Pause)', async ({ page, request }) => {
    await startGo(page, [], 'home', [TEA]);
    // P-97 (was: its idle tile's Plan): its Plan by its address — there its way out is ⌂ Home.
    await page.goto('./go/routine/tea');
    await expect(plan(page).home).toBeVisible();
    await page.waitForFunction(async () => !!(await navigator.serviceWorker.ready).active && !!navigator.serviceWorker.controller);
    await editPlan(page); // (P-115, rewritten: Plan opens read-only — Edit first.)
    await plan(page).add.fill('mid-sentence');
    await request.post('/__e2e/bump-sw');
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());
    const banner = page.getByText('A new version is ready');
    await expect(banner).toBeVisible();
    const apart = async (a: Locator, b: Locator) => {
      const x = await box(a);
      const y = await box(b);
      return x.y + x.height <= y.y + 0.5 || y.y + y.height <= x.y + 0.5 || x.x + x.width <= y.x + 0.5 || y.x + y.width <= x.x + 0.5;
    };
    const bannerBox = page.getByTestId('update-banner');
    await expect.poll(() => apart(bannerBox, plan(page).home)).toBe(true);
    expect(await apart(bannerBox, plan(page).word)).toBe(true);
    // Every control on the screen is clear of it.
    for (const b of await plan(page).screen.getByRole('button').all()) if (await b.isVisible()) expect(await apart(bannerBox, b)).toBe(true);
  });

  test('the Jump list moves with the arrow keys (each arrow moves and chooses)', async ({ page }) => {
    await startGo(page, [{ id: 'r', routine: 'tea', at: 0, status: 'running' }], 'runner', [TEA]);
    await runner(page).handle.click();
    await runner(page).panel.getByRole('button', { name: 'Jump to…', exact: true }).click();
    const jump = settled(page, 'jump');
    const rows = jump.getByTestId('go-jump-row');
    await rows.first().focus();
    await page.keyboard.press('ArrowDown');
    await expect(rows.nth(1)).toBeFocused();
    await expect(rows.nth(1)).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('ArrowDown');
    await expect(rows.nth(2)).toBeFocused();
    await expect(rows.nth(2)).toHaveAttribute('aria-checked', 'true');
    await expect(rows.nth(1)).toHaveAttribute('aria-checked', 'false');
    await page.keyboard.press('ArrowUp');
    await expect(rows.nth(1)).toBeFocused();
    await expect(jump.getByTestId('go-jump-here')).toBeEnabled();
  });

  test('a Settings error uses the app’s error style (its colour and "!"), as an alert, near Import', async ({ page }) => {
    await openSettings(page);
    await chooseBackup(page, '{"app": "wanderment", "data": ');
    const error = settled(page, 'settings').getByTestId('go-settings-error');
    await expect(error).toContainText('That file isn’t valid JSON.');
    await expect(error).toContainText('!');
    await expect(error).toHaveAttribute('role', 'alert');
    expect(await error.evaluate((e) => getComputedStyle(e).color)).toBe(ERR);
    const ib = await box(settled(page, 'settings').getByTestId('go-settings-import'));
    const eb = await box(error);
    expect(eb.y).toBeGreaterThanOrEqual(ib.y + ib.height - 1);
    expect(eb.y - (ib.y + ib.height)).toBeLessThanOrEqual(48);
  });
});

test.describe('P-103 scope addition (owner: "A neutral placeholder … the settings of the app still reference Wonders")', () => {
  /** Everything a person can read on the page: its text, its title, and its spoken names. */
  const shown = (page: Page) =>
    page.evaluate(() => [document.title, document.body.innerText, ...[...document.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label') ?? '')].join('\n'));

  test('no visible text, title, install name or manifest name says Wanderment or wander; an old export (its old file name, its old type) still imports', async ({ page, request }) => {
    // An export written before this change: the type field "wanderment", a wander and a line from the previous app, a routine.
    const old = JSON.stringify({
      app: 'wanderment',
      exportedAt: new Date().toISOString(),
      data: {
        version: 2,
        threads: { t1: { id: 't1', name: 'Drawing', hidden: false, createdAt: '2026-10-01T00:00:00.000Z' } },
        activities: { a1: { id: 'a1', text: 'sketched hands', toIds: ['t1'], createdAt: '2026-10-02T00:00:00.000Z' } },
        routines: { tea: { id: 'tea', words: 'Make tea', named: true, createdAt: '2026-11-01T00:00:00.000Z', items: [{ id: 'tea-0', text: 'Boil the water' }], open: true, home: true } },
        runs: {},
      },
    });
    await openSettings(page);
    const importBtn = page.getByRole('button', { name: 'Import from a backup', exact: true });
    const chooser = page.waitForEvent('filechooser');
    await importBtn.click();
    await (await chooser).setFiles({ name: 'wanderment-2026-11-20.json', mimeType: 'application/json', buffer: Buffer.from(old) });
    // The preview describes the earlier data plainly (P-103, the coordinator: no retired-app words in Settings).
    await expect(page.getByTestId('import-preview')).toContainText('items from the previous app');
    expect(await page.getByTestId('import-preview').innerText()).not.toMatch(/wander/i);
    expect(await shown(page)).not.toMatch(/wander/i);
    await page.getByRole('button', { name: 'Replace', exact: true }).click();
    await expect(page.getByText('Imported.', { exact: true })).toBeVisible();
    // Settings says the earlier data is kept, without the old names.
    await expect(page.getByTestId('go-settings-earlier')).toHaveText('Earlier data from the previous app is kept in your backup files.');
    const check = async () => expect(await shown(page)).not.toMatch(/wander/i);
    await check();
    await page.goto('./go');
    // P-97 (was: its tile on home, and its Start): nothing going — it is on My routines, and starts there.
    await expect((await openRoutines(page)).row('Make tea')).toBeVisible();
    await check();
    await routines(page).home.click();
    await startFromRoutines(page, 'Make tea');
    await expect(runner(page).words).toHaveText('Boil the water');
    await check();
    await runner(page).plan.click();
    await expect(plan(page).title).toHaveText('Make tea');
    await check();
    // The title, the install name and the manifest: the placeholder name.
    expect(await page.title()).toBe('Routines');
    await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content', 'Routines');
    const manifest = await (await request.get((await page.locator('link[rel="manifest"]').getAttribute('href'))!)).json();
    expect(manifest.name).toBe('Routines');
    expect(manifest.short_name).toBe('Routines');
    // The export's file name; its contents keep their type, and the previous app's data is in it.
    await openSettings(page);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: /^Export/ }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^routines-backup-\d{4}-\d\d-\d\d\.json$/);
    const data = await exported(page);
    expect(Object.keys(data.threads)).toEqual(['t1']);
    expect(Object.keys(data.activities)).toEqual(['a1']);
  });
});
