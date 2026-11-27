/**
 * P-86 (B-11 slice 1): what the audit found (.polish/current/audit.md), each as the test that would
 * have caught it — as they read after P-90, where planning has its own surface. B1 typing at the edge
 * (now Plan's open row) · B3 the runner's buttons never move · A1 the note never vanishes, and Plan's
 * open row is in reach · A2 focus never falls to nothing · U1 typed text survives a reload · U3 a long
 * step is shown whole where steps are written (now Plan).
 * Gone with their rules (P-90: nothing is "this run only", so there is no Keep): D1 Keep all is one
 * Undo · B6 a Jump offers what it leaves. D2 (Break it down goes to the step it was opened on) is now
 * true by construction — a Plan row is its step — and is proven in e2e/go-plan.spec.ts.
 */
import { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { arrived, expectSteps, focused, home, pauseRun, place, plan, planFromRoutines, planMenu, planMove, planType, RoutineSpec, runner, startGo, startThing, tile, tileBody, undoEdit } from './goFixture';

/** Focus is somewhere: never on nothing. */
const somewhere = async (page: Page) => expect.poll(() => page.evaluate(() => document.activeElement !== null && document.activeElement !== document.body)).toBe(true);

test.describe('B1: at the edge of a goal Plan’s open row has the focus, however you got there, and typing only types', () => {
  const SENTENCE = 'pick a recipe, Do the shopping, make a plan now';

  async function typesThere(page: Page) {
    const p = plan(page);
    await expect(p.add).toBeFocused();
    // Every letter that used to be a shortcut is in there: p paused, D ended the run, n and m moved it.
    await page.keyboard.type(SENTENCE);
    await expect(p.add).toHaveValue(SENTENCE);
    await expect(p.screen).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).toHaveURL(/\/go\/(run\/[^/]+\/plan|routine\/[^/]+)$/);
  }

  test('by New (J01; P-96: + New and its own sheet; was: the New tile, carrying the prompt’s words)', async ({ page }) => {
    await startGo(page, [], 'home', []);
    await startThing(page, 'Plan dinner');
    await typesThere(page);
    await page.keyboard.press('Enter');
    await expectSteps(page, [SENTENCE]);
    // Nothing started, nothing ended: a routine with one step, and Start.
    await expect(plan(page).forward).toHaveText('Start');
    await plan(page).home.click();
    await expect(tile(page, 'Plan dinner')).toHaveCount(0); // P-97 (was: its tile, idle): nothing going, it is not on home — it is on My routines
  });

  test('by a cold open of /go, and by a reload', async ({ page }) => {
    await startGo(page, [{ id: 'r4', routine: 'spanish-es', at: null, status: 'running' }], 'plan');
    await typesThere(page);
    await page.reload();
    const p = plan(page);
    // The words come back, and so does the focus.
    await expect(p.add).toHaveValue(SENTENCE);
    await expect(p.add).toBeFocused();
    await page.keyboard.type(' D');
    await expect(p.add).toHaveValue(`${SENTENCE} D`);
  });

  test('by the old paused address (P-96: it lands on /go, which opens Plan; was the paused screen’s Plan), by Plan from a tile; and Next on the last step now finishes (ruling 7)', async ({ page }) => {
    await startGo(page, [{ id: 'r4', routine: 'spanish-es', at: null, status: 'paused' }], 'plan');
    // The old paused address lands on /go, which opens where it was left: its Plan.
    await page.goto('./go/run/r4/paused');
    await typesThere(page);
    await plan(page).add.fill('');
    await plan(page).home.click();
    // (P-101, ruling 5: at the edge there is nothing to resume at — the tile's body is its Plan.)
    await tileBody(page, 'Feel at home in Spanish').click();
    await typesThere(page);
    await page.keyboard.press('Enter');
    await expectSteps(page, [SENTENCE]);
    await plan(page).forward.click();
    await expect(runner(page).words).toHaveText(SENTENCE);
    // P-96 (ruling 7; was: Next reached the edge, Plan): with nothing next, Next reads Done and ends the run.
    await expect(runner(page).next).toHaveText('Done');
    await runner(page).next.click();
    await expect(home(page).notice).toContainText('Done with Feel at home in Spanish');
  });
});

test('B3: ❚❚ and Plan (P-101: on the top line), Next and the handle (P-96: no Done on the top line) do not move by a pixel between a plain step, a routine, a level down, a wait, with a notice and with the panel open; nor does the note — P-101 (ruling 1): Next keeps its right edge, its row and its height, and gives room to the moves beside it (Step in, Step out)', async ({ page }) => {
  const routines: RoutineSpec[] = [
    { id: 'all', name: 'Every kind of step', steps: ['Stretch', 'Read the job ad twice', { routine: 'inner' }, { wait: 'a reply' }] },
    { id: 'inner', name: 'Proofread out loud', home: false, open: false, steps: ['Read it aloud once'] },
  ];
  await startGo(page, [{ id: 'r', routine: 'all', at: 0, status: 'running' }], 'runner', routines);
  const r = runner(page);
  // P-101 (rulings 1–2): Next keeps its right edge, its row and its height (the moves take room beside it);
  // the handle does not move. ❚❚ and Plan stay on the top line, above the note — inside a call Plan says
  // "Plan <routine>" and the path gains a parent, so that line (and the note's room) may grow: checked apart.
  const boxes = async () => {
    const n = await place(r.next);
    return { next: { y: n.y, right: n.x + n.width, height: n.height }, handle: await place(r.handle) };
  };
  const onTop = async (label: string) => {
    const note = await place(r.note);
    for (const d of [r.pause, r.plan]) {
      const b = await place(d);
      expect(b.y + b.height, `${label}: above the note`).toBeLessThanOrEqual(note.y);
      expect(b.height, `${label}: a full target`).toBeGreaterThanOrEqual(48);
    }
  };
  const plain = await boxes();
  const note = await place(r.note);
  await expect(r.notice).toHaveCount(0);

  // A plain step after Next (P-95: no notice).
  await r.next.click();
  await expect(r.words).toHaveText('Read the job ad twice');
  await expect(r.notice).toHaveCount(0);
  expect(await boxes(), 'after Next').toEqual(plain);
  // A routine as the step.
  await r.next.click();
  await expect(r.stepIn).toHaveText('Step in');
  expect(await boxes(), 'a routine').toEqual(plain);
  expect(await place(r.note), 'the note, a routine').toEqual(note);
  // Inside it: the context line gains a parent, and nothing shifts.
  await r.stepIn.click();
  await expect(r.words).toHaveText('Read it aloud once');
  expect(await boxes(), 'a level down').toEqual(plain);
  await onTop('a level down');
  // Step out (P-101; was: Finish <level> now, in the panel) leaves the level (P-95: it has a notice, Next none): a wait, with a notice.
  await r.stepOut.click();
  // P-96 (audit F5): this wait is the last step, so pressing it ends the run and it reads Done.
  await expect(r.next).toHaveText('Done');
  await expect(r.notice).toBeVisible();
  expect(await boxes(), 'a wait, with a notice').toEqual(plain);
  expect(await place(r.note), 'the note, a wait, with a notice').toEqual(note);
  // The panel open. (The edge is not the runner's: a run with nothing next is in Plan.)
  await r.handle.click();
  await expect(r.panel).toBeVisible();
  expect(await boxes(), 'the panel open').toEqual(plain);
});

for (const size of [
  { width: 195, height: 255 },
  { width: 195, height: 300 },
  { width: 390, height: 300 },
]) {
  test(`A1: at ${size.width}×${size.height} (large text AND the keyboard up) the note is still there, at least 96 px, and the runner scrolls to everything`, async ({ page }) => {
    await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'running' }], 'runner');
    await page.setViewportSize(size);
    const r = runner(page);
    await expect.poll(async () => (await r.note.boundingBox())?.width ?? 0).toBeLessThan(250);
    const n = (await r.note.boundingBox())!;
    expect(n.width).toBeGreaterThanOrEqual(96);
    expect(n.height).toBeGreaterThanOrEqual(96);
    await expect(r.words).toHaveText('Tailor the CV');
    // Everything can be brought into view, and works.
    for (const l of [r.note, r.pause, r.plan, r.next]) {
      await l.scrollIntoViewIfNeeded();
      await expect(l).toBeInViewport();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await r.next.click();
    await expect(r.words).toHaveText('Write the cover letter');
  });

  test(`A1: at ${size.width}×${size.height} Plan at the edge: the band is still at the top (P-96: Home and Done are the side doors), the open row is focused, in view and can be typed in`, async ({ page }) => {
    await startGo(page, [{ id: 'r4', routine: 'spanish-es', at: null, status: 'running' }], 'plan');
    await page.setViewportSize(size);
    const p = plan(page);
    await expect(p.add).toBeFocused();
    await page.keyboard.type('Order a coffee');
    await expect(p.add).toHaveValue('Order a coffee');
    await p.add.scrollIntoViewIfNeeded();
    await expect(p.add).toBeInViewport();
    expect((await p.band.boundingBox())!.y).toBe(0);
    // P-96: Home and Done are the bottom side doors — with this little room they scroll with the rest, and can be brought into view.
    for (const l of [p.home, p.done]) {
      await l.scrollIntoViewIfNeeded();
      await expect(l).toBeInViewport({ ratio: 1 });
    }
    await page.keyboard.press('Enter');
    await expectSteps(page, ['Order a coffee']);
    // The filled button can be brought into view, and works.
    await p.forward.scrollIntoViewIfNeeded();
    await expect(p.forward).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await p.forward.click();
    await expect(runner(page).words).toHaveText('Order a coffee');
  });
}

test.describe('A2: focus never falls to nothing', () => {
  test('first arrival on /go: the heading; after Pause (P-96; was: Home from the paused screen): home’s heading', async ({ page }) => {
    await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'running' }], 'runner');
    await pauseRun(page);
    await expect(home(page).title).toBeFocused();
    // A cold open after Pause: home, its heading focused.
    await page.goto('./go');
    await expect(home(page).title).toBeFocused();
    // And the runner: the note (P-101: from the tile's body; was: the Resume bar).
    await tileBody(page, 'Apply to Initech').click();
    await expect(runner(page).note).toBeFocused();
  });

  test('Return in a value field keeps it, and the focus goes back to the field (P-101, ruling 7: its sheet; was P-96: on to Next) — then Next', async ({ page }) => {
    const GIVING: RoutineSpec[] = [{ id: 'give', name: 'Wrap a present', steps: [{ text: 'Choose the gift', gives: 'gift' }, 'Wrap {gift}'] }];
    await startGo(page, [{ id: 'g1', routine: 'give', at: 0, status: 'running' }], 'runner', GIVING);
    const r = runner(page);
    await r.field('gift').click();
    const sheet = await arrived(page, 'go-entry-sheet');
    await sheet.getByTestId('go-entry-field').fill('a scarf');
    await sheet.getByTestId('go-entry-field').press('Enter');
    await expect(page.getByTestId('go-entry-sheet')).toHaveCount(0);
    await expect(r.field('gift')).toBeFocused();
    await r.next.focus();
    await expect(r.words).toHaveText('Choose the gift');
    await page.keyboard.press('Enter');
    await expect(r.words).toHaveText('Wrap a scarf');
  });

  test('Plan: after Return the field still has the focus — smaller steps under a step, and the open row', async ({ page }) => {
    await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'running' }], 'runner');
    await runner(page).plan.click();
    const p = plan(page);
    await planMenu(page, 'Tailor the CV', 'Break it down');
    for (const s of ['one', 'two', 'three']) {
      await expect(p.typed).toBeFocused();
      await page.keyboard.type(s);
      await page.keyboard.press('Enter');
      await expect(p.typed).toBeFocused();
      await expect(p.typed).toHaveValue('');
    }
    await expectSteps(page, ['Read the job ad twice', 'Tailor the CV', 'one', 'two', 'three', 'Write the cover letter', 'Proofread out loud', 'Send the application']);
    await page.keyboard.press('Escape');
    await p.add.click();
    for (const s of ['Sharpen the pencils', 'Tape the paper down']) {
      await page.keyboard.type(s);
      await page.keyboard.press('Enter');
      await expect(p.add).toBeFocused();
      await expect(p.add).toHaveValue('');
    }
    await expect(p.row('Tape the paper down')).toHaveCount(1);
  });

  test('Plan: a field opened from a step’s menu takes the focus as it appears; Esc gives it back to the row it came from', async ({ page }) => {
    await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'paused', mode: 'plan' }], 'plan');
    const p = plan(page);
    const more = p.more('Write the cover letter');
    // (P-102: Edit — was Change the words.)
    for (const action of ['Add a step after', 'Edit', 'Break it down']) {
      await planMenu(page, 'Write the cover letter', action);
      await expect(p.typed).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(p.typed).toHaveCount(0);
      await expect(more).toBeFocused();
    }
    // A menu closed with nothing chosen: back to the row it came from.
    await more.click();
    await arrived(page, 'go-plan-menu');
    await page.keyboard.press('Escape');
    await expect(more).toBeFocused();
    // After a change made there, too: focus is on a control, not on nothing.
    await planMenu(page, 'Write the cover letter', 'Add a step after');
    await planType(page, 'Sleep on it');
    await somewhere(page);
    expect(await focused(page)).not.toBe('BODY');
    await planMenu(page, 'Sleep on it', 'Remove');
    await somewhere(page);
    // (P-102: moved by Alt+↑ — was its menu's Move up.) The focus stays on its ···.
    await planMove(page, 'Write the cover letter', 'up');
    await expectSteps(page, ['Read the job ad twice', 'Write the cover letter', 'Tailor the CV', 'Proofread out loud', 'Send the application']);
    await expect(more).toBeFocused();
    // (P-101, ruling 6: the edit's Undo is the routine's menu.)
    await undoEdit(page);
    await expect(p.title).toBeFocused();
  });
});

test.describe('U1: typed text survives a reload', () => {
  test('Plan: a step being added after a row, and a smaller step being typed (the open row and Change the words: e2e/go-plan.spec.ts)', async ({ page }) => {
    await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'paused', mode: 'plan' }], 'plan');
    const p = plan(page);
    await planMenu(page, 'Write the cover letter', 'Add a step after');
    await p.typed.fill('Sleep on');
    await page.reload();
    await expect(p.typed).toHaveValue('Sleep on');
    await expect(p.typed).toHaveAccessibleName('Add a step after Write the cover letter');
    await expect(p.typed).toBeFocused();
    await p.typed.press('End');
    await p.typed.pressSequentially(' it');
    await p.typed.press('Enter');
    await expect(p.row('Sleep on it')).toHaveCount(1);
    await page.keyboard.press('Escape');
    // Done with: a reload does not open the field again.
    await page.reload();
    await expect(p.row('Sleep on it')).toHaveCount(1);
    await expect(p.typed).toHaveCount(0);

    await planMenu(page, 'Sleep on it', 'Break it down');
    await p.typed.fill('Close the laptop');
    await page.reload();
    await expect(p.typed).toHaveValue('Close the laptop');
    await expect(p.typed).toHaveAccessibleName('A smaller step of Sleep on it');
    // Not kept until Return: the step is still a plain step.
    await expect(p.row('Sleep on it')).toHaveAttribute('data-kind', 'step');
    await p.typed.press('Enter');
    await expect(p.row('Sleep on it')).toHaveAttribute('data-kind', 'routine');
    await expect(p.row('Close the laptop')).toHaveAttribute('data-depth', '1');
  });
});

test('U3: Plan shows a long step whole — it wraps and its row grows, and so does the field its words are changed in; the words are never cut', async ({ page }) => {
  const LONG = 'Open the job ad beside the CV and mark what they ask for in yellow, then note the answer in the tracker';
  await startGo(page, [], 'home', [{ id: 'long', name: 'A long one', steps: [LONG, 'Stretch'] }]);
  // P-97 (was: its idle tile's Plan): from My routines.
  await planFromRoutines(page, 'A long one');
  const p = plan(page);
  const words = p.words.first();
  await expect(words).toHaveText(LONG);
  // All of it is on show: nothing to scroll inside the row, in either direction.
  expect(await words.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
  expect(await words.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  const long = (await p.row(LONG).boundingBox())!;
  const short = (await p.row('Stretch').boundingBox())!;
  expect(long.height).toBeGreaterThan(short.height * 1.5);
  // Being reworded: the field holds all of it too.
  await planMenu(page, LONG, 'Edit');
  await expect(p.typed).toHaveValue(LONG);
  await expect.poll(() => p.typed.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
  expect(await p.typed.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  // At 200 % too.
  await page.setViewportSize({ width: 195, height: 422 });
  await expect.poll(() => p.typed.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(words).toHaveText(LONG);
  expect(await words.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
});
