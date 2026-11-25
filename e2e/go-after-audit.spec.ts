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
import { arrived, expectSteps, focused, home, paused, place, plan, planMenu, planType, RoutineSpec, runner, startGo, tile } from './goFixture';

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

  test('by "New: …" (J01)', async ({ page }) => {
    await startGo(page, [], 'home', []);
    await home(page).prompt.fill('Plan dinner');
    await home(page).prompt.press('Enter');
    await typesThere(page);
    await page.keyboard.press('Enter');
    await expectSteps(page, [SENTENCE]);
    // Nothing started, nothing ended: a routine with one step, and Start.
    await expect(plan(page).forward).toHaveText('Start');
    await plan(page).home.click();
    await expect(tile(page, 'Plan dinner')).toHaveAttribute('data-state', 'idle');
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

  test('by Plan (from the paused screen and from a tile), and by Next', async ({ page }) => {
    await startGo(page, [{ id: 'r4', routine: 'spanish-es', at: null, status: 'paused' }], 'plan');
    await page.goto('./go/run/r4/paused');
    await expect(paused(page).title).toHaveText('Planning');
    await paused(page).screen.getByRole('button', { name: 'Plan Feel at home in Spanish', exact: true }).click();
    await typesThere(page);
    await plan(page).add.fill('');
    await plan(page).home.click();
    await home(page).screen.getByRole('button', { name: 'Plan Feel at home in Spanish', exact: true }).click();
    await typesThere(page);
    await page.keyboard.press('Enter');
    await expectSteps(page, [SENTENCE]);
    await plan(page).forward.click();
    await expect(runner(page).words).toHaveText(SENTENCE);
    await runner(page).next.click();
    await typesThere(page);
  });
});

test('B3: Pause, the middle button, Next, the handle and Done do not move by a pixel between a plain step, a routine, a level down, a wait, with a notice and with the panel open; nor does the note', async ({ page }) => {
  const routines: RoutineSpec[] = [
    { id: 'all', name: 'Every kind of step', steps: ['Stretch', 'Read the job ad twice', { routine: 'inner' }, { wait: 'a reply' }] },
    { id: 'inner', name: 'Proofread out loud', home: false, open: false, steps: ['Read it aloud once'] },
  ];
  await startGo(page, [{ id: 'r', routine: 'all', at: 0, status: 'running' }], 'runner', routines);
  const r = runner(page);
  const boxes = async () => ({ pause: await place(r.pause), middle: await place(r.middle), next: await place(r.next), handle: await place(r.handle), done: await place(r.done) });
  const plain = await boxes();
  const note = await place(r.note);
  await expect(r.notice).toHaveCount(0);

  // A plain step, now with a notice.
  await r.next.click();
  await expect(r.notice).toBeVisible();
  expect(await boxes(), 'with a notice').toEqual(plain);
  expect(await place(r.note), 'the note, with a notice').toEqual(note);
  // A routine as the step.
  await r.next.click();
  await expect(r.middle).toHaveText('Step in');
  expect(await boxes(), 'a routine').toEqual(plain);
  expect(await place(r.note), 'the note, a routine').toEqual(note);
  // Inside it: the context line gains a parent, and nothing shifts.
  await r.middle.click();
  await expect(r.words).toHaveText('Read it aloud once');
  expect(await boxes(), 'a level down').toEqual(plain);
  expect(await place(r.note), 'the note, a level down').toEqual(note);
  await r.next.click();
  // A wait.
  await expect(r.next).toHaveText('It’s happened');
  expect(await boxes(), 'a wait').toEqual(plain);
  expect(await place(r.note), 'the note, a wait').toEqual(note);
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
    for (const l of [r.note, r.done, r.pause, r.middle, r.next]) {
      await l.scrollIntoViewIfNeeded();
      await expect(l).toBeInViewport();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await r.next.click();
    await expect(r.words).toHaveText('Write the cover letter');
  });

  test(`A1: at ${size.width}×${size.height} Plan at the edge: the band is still at the top with Home, the open row is focused, in view and can be typed in`, async ({ page }) => {
    await startGo(page, [{ id: 'r4', routine: 'spanish-es', at: null, status: 'running' }], 'plan');
    await page.setViewportSize(size);
    const p = plan(page);
    await expect(p.add).toBeFocused();
    await page.keyboard.type('Order a coffee');
    await expect(p.add).toHaveValue('Order a coffee');
    await p.add.scrollIntoViewIfNeeded();
    await expect(p.add).toBeInViewport();
    expect((await p.band.boundingBox())!.y).toBe(0);
    await expect(p.home).toBeInViewport({ ratio: 1 });
    await expect(p.done).toBeInViewport({ ratio: 1 });
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
  test('first arrival on /go: the title; after Home is confirmed: the new home’s title', async ({ page }) => {
    await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'paused' }], 'paused');
    await expect(paused(page).title).toBeFocused();
    await paused(page).home.click();
    const ask = await arrived(page, 'go-stop');
    await ask.getByRole('button', { name: 'Home', exact: true }).click();
    await expect(home(page).title).toBeFocused();
    // A cold open of home (nothing is the run the app is on now).
    await page.goto('./go');
    await expect(home(page).title).toBeFocused();
    // And the runner: the note.
    await home(page).screen.getByRole('button', { name: 'Resume Apply to Initech', exact: true }).click();
    await expect(runner(page).note).toBeFocused();
  });

  test('Return in the reason field moves on to Resume (on Waiting: to "It’s happened")', async ({ page }) => {
    await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'paused' }], 'paused');
    await paused(page).reason.fill('lunch');
    await paused(page).reason.press('Enter');
    await expect(paused(page).resume).toBeFocused();
    await expect(paused(page).reason).toHaveValue('lunch');

    await startGo(page, [{ id: 'r2', routine: 'apply-acme', at: 1, waitingDaysAgo: 9, status: 'paused' }], 'paused');
    await paused(page).reason.fill('they said two weeks');
    await paused(page).reason.press('Enter');
    await expect(paused(page).screen.getByRole('button', { name: 'It’s happened: a reply from Acme', exact: true })).toBeFocused();
  });

  test('Plan: after Return the field still has the focus — smaller steps under a step, and the open row', async ({ page }) => {
    await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'running' }], 'runner');
    await runner(page).middle.click();
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
    for (const action of ['Add a step after', 'Change the words', 'Break it down']) {
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
    await planMenu(page, 'Sleep on it', 'Remove this step');
    await somewhere(page);
    await planMenu(page, 'Write the cover letter', 'Move up');
    await expect(more).toBeFocused();
    await p.undo.click();
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
  await home(page).screen.getByRole('button', { name: 'Plan A long one', exact: true }).click();
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
  await planMenu(page, LONG, 'Change the words');
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
