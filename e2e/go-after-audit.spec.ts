/**
 * P-86 (B-11 slice 1): what the audit found (.polish/current/audit.md), each as the test that would
 * have caught it. B1 typing at the edge · B3 the buttons never move · D1 Keep all is one Undo · D2
 * Break it down goes to the step it was opened on · B6 a Jump offers what it leaves · A1 the note
 * never vanishes · A2 focus never falls to nothing · U1 typed text survives a reload · U3 a long step
 * is shown whole where steps are written.
 */
import { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { arrived, focused, home, paused, place, RoutineSpec, runner, setVisibility, settled, startGo, tile } from './goFixture';

const smaller = (page: Page) => page.getByRole('textbox', { name: 'A smaller step', exact: true });
/** Focus is somewhere: never on nothing. */
const somewhere = async (page: Page) => expect.poll(() => page.evaluate(() => document.activeElement !== null && document.activeElement !== document.body)).toBe(true);

test.describe('B1: at the edge of a goal the next-small-step field has the focus, however you got there, and typing only types', () => {
  const SENTENCE = 'pick a recipe, Do the shopping, make a plan now';

  async function typesThere(page: Page) {
    const r = runner(page);
    await expect(r.field).toBeFocused();
    // Every letter that used to be a shortcut is in there: p paused, D ended the run, n and m moved it.
    await page.keyboard.type(SENTENCE);
    await expect(r.field).toHaveValue(SENTENCE);
    await expect(r.screen).toBeVisible();
    await expect(r.panel).toHaveCount(0);
    await expect(page).toHaveURL(/\/go\/run\/[^/]+$/);
  }

  test('by "New: …" (J01)', async ({ page }) => {
    await startGo(page, [], 'home', []);
    await home(page).prompt.fill('Plan dinner');
    await home(page).prompt.press('Enter');
    await typesThere(page);
    await page.keyboard.press('Enter');
    await expect(runner(page).words).toHaveText(SENTENCE);
    // Still running, nothing ended, nothing paused.
    await page.goBack();
    await expect(tile(page, 'Plan dinner')).toHaveAttribute('data-state', 'running');
  });

  test('by a cold open of /go, and by a reload', async ({ page }) => {
    await startGo(page, [{ id: 'r4', routine: 'spanish-es', at: null, status: 'running' }], 'runner');
    await typesThere(page);
    await page.reload();
    const r = runner(page);
    // The words come back, and so does the focus.
    await expect(r.field).toHaveValue(SENTENCE);
    await expect(r.field).toBeFocused();
    await page.keyboard.type(' D');
    await expect(r.field).toHaveValue(`${SENTENCE} D`);
  });

  test('by Resume (from Paused and from a tile), and by Next', async ({ page }) => {
    await startGo(page, [{ id: 'r4', routine: 'spanish-es', at: null, status: 'paused' }], 'paused');
    await paused(page).resume.click();
    await typesThere(page);
    await runner(page).field.fill('');
    await page.goBack();
    await home(page).screen.getByRole('button', { name: 'Resume Feel at home in Spanish', exact: true }).click();
    await typesThere(page);
    await page.keyboard.press('Enter');
    await expect(runner(page).words).toHaveText(SENTENCE);
    await runner(page).next.click();
    await typesThere(page);
  });
});

test('B3: Pause, the middle button, Next, the handle and Done do not move by a pixel between a plain step, a routine, a wait, the edge (empty and typed) and with a notice; nor does the note', async ({ page }) => {
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
  // The edge, nothing typed: Next is unavailable — and exactly where it was.
  await r.next.click();
  await expect(r.field).toBeVisible();
  await expect(r.next).toBeDisabled();
  expect(await boxes(), 'the edge, empty').toEqual(plain);
  expect(await place(r.note), 'the note, the edge').toEqual(note);
  // The edge, typed: Next is available.
  await r.field.fill('Send it');
  await expect(r.next).toBeEnabled();
  expect(await boxes(), 'the edge, typed').toEqual(plain);
  // The panel open.
  await r.field.press('Enter');
  await r.handle.click();
  await expect(r.panel).toBeVisible();
  expect(await boxes(), 'the panel open').toEqual(plain);
});

test('D1: Keep all on the leaving sheet is ONE action — its Undo leaves nothing kept (with another change elsewhere in the run)', async ({ page }) => {
  await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'running' }], 'runner');
  const r = runner(page);
  // A change at the top level, which the leaving sheet will NOT show…
  await r.handle.click();
  await r.panel.getByRole('button', { name: 'Change the words', exact: true }).click();
  await r.field.fill('Tailor the CV to the ad');
  await r.field.press('Enter');
  await expect(r.words).toHaveText('Tailor the CV to the ad');
  // …then a breakdown, and both of its steps reworded.
  await r.middle.click();
  await arrived(page, 'go-break');
  for (const s of ['one', 'two']) {
    await smaller(page).fill(s);
    await smaller(page).press('Enter');
  }
  await page.getByTestId('go-break-in').click();
  for (const words of ['ONE', 'TWO']) {
    await r.handle.click();
    await r.panel.getByRole('button', { name: 'Change the words', exact: true }).click();
    await r.field.fill(words);
    await r.field.press('Enter');
    await expect(r.words).toHaveText(words);
    if (words === 'ONE') await r.next.click();
  }
  await r.done.click();
  const keep = await arrived(page, 'go-keep');
  // What that level leaves: the breakdown that made it and the two rewordings in it — three changes, one Keep.
  await expect(keep.getByTestId('go-keep-row')).toHaveCount(3);
  await keep.getByRole('button', { name: 'Keep all', exact: true }).click();
  await expect(page.getByTestId('go-keep')).toHaveCount(0);
  await r.notice.getByRole('button', { name: 'Undo Keep', exact: true }).click();
  // Nothing is kept: every one of them is this run's own again.
  await r.context.click();
  const all = settled(page, 'all');
  await expect(all.locator('[data-testid="go-all-row"][data-mine="true"]')).toHaveCount(3);
  // (Before the fix, only "TWO" came back: the breakdown and "ONE" stayed written into the routine.)
  await expect(all.locator('[data-testid="go-all-row"][data-mine="true"]').filter({ hasText: 'Tailor the CV to the ad' })).toHaveCount(1);
  await expect(all.locator('[data-testid="go-all-row"][data-mine="true"]').filter({ hasText: 'ONE' })).toHaveCount(1);
  await expect(all.locator('[data-testid="go-all-row"][data-mine="true"]').filter({ hasText: 'TWO' })).toHaveCount(1);
});

test('D2: Break it down goes to the step it was opened on — a Next kept while reconnecting comes in under the open sheet, and the sub-steps still land on that step', async ({ page }) => {
  await startGo(page, [{ id: 'r1', routine: 'apply', at: 0, status: 'running' }], 'runner');
  const r = runner(page);
  await setVisibility(page, 'hidden');
  await r.next.click(); // kept
  await r.middle.click();
  const sheet = await arrived(page, 'go-break');
  await expect(sheet.getByRole('heading', { level: 2 })).toHaveText('Read the job ad twice');
  await smaller(page).fill('Read it once');
  await smaller(page).press('Enter');
  await smaller(page).fill('Read it again');
  await smaller(page).press('Enter');
  await setVisibility(page, 'visible');
  // The kept Next is applied: the run is on the next step. The sheet is still the first step's.
  await expect(r.words).toHaveText('Tailor the CV');
  await expect(sheet.getByRole('heading', { level: 2 })).toHaveText('Read the job ad twice');
  await expect(sheet.getByTestId('go-break-step')).toHaveText(['Read it once', 'Read it again']);
  await expect(async () => {
    await sheet.getByRole('button', { name: 'Step in', exact: true }).click({ timeout: 1000 });
    await expect(page.getByTestId('go-break')).toHaveCount(0, { timeout: 1000 });
  }).toPass();
  // The run stays where it is; "Tailor the CV" is untouched; the first step holds the sub-steps.
  await expect(r.words).toHaveText('Tailor the CV');
  await expect(r.context).toHaveAccessibleName('Apply to Initech See it all');
  await expect(r.notice).toContainText('Broke down “Read the job ad twice”');
  await r.context.click();
  const all = settled(page, 'all');
  await expect(all.getByTestId('go-all-row')).toHaveText([/^Read the job ad twice/, /^Read it once/, /^Read it again/, /^Tailor the CV$/, /^Write the cover letter/, /^Proofread out loud/, /^Read it aloud once/, /^Fix what you stumble on/, /^Send the application/]);
  await expect(all.locator('[data-testid="go-all-row"][data-here="true"]')).toHaveText(/^Tailor the CV$/);
});

test('B6: jumping out of a level offers that level’s changes, once, like leaving it by Done — and blocks nothing', async ({ page }) => {
  await startGo(page, [{ id: 'r3', routine: 'drawing', at: 1, inner: [{ routine: 'hands', at: 2, round: 2 }], status: 'running' }], 'runner');
  const r = runner(page);
  await r.handle.click();
  await r.panel.getByRole('button', { name: 'Change the words', exact: true }).click();
  await r.field.fill('Measure against the photo');
  await r.field.press('Enter');
  await r.handle.click();
  await r.panel.getByRole('button', { name: 'Jump to…', exact: true }).click();
  const j = settled(page, 'jump');
  await j.getByRole('radio', { name: 'Gesture drawing', exact: true }).click();
  await j.getByTestId('go-jump-here').click();
  // The jump has happened; the ask is over it.
  const keep = await arrived(page, 'go-keep');
  await expect(r.words).toHaveText('Gesture drawing');
  await expect(keep.getByRole('heading', { level: 2 })).toHaveText('Keep in Hand studies of my left hand');
  await expect(keep.getByTestId('go-keep-row')).toContainText('Measure against the photo');
  await page.keyboard.press('Escape');
  await expect(r.notice).toContainText('Jumped from Measure against the photo');
  await r.notice.getByRole('button', { name: 'Undo Jump', exact: true }).click();
  await expect(r.words).toHaveText('Measure against the photo');
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

  test(`A1: at ${size.width}×${size.height} the edge's field is there, focused, and can be typed in`, async ({ page }) => {
    await startGo(page, [{ id: 'r4', routine: 'spanish-es', at: null, status: 'running' }], 'runner');
    await page.setViewportSize(size);
    const r = runner(page);
    await expect(r.field).toBeFocused();
    await page.keyboard.type('Order a coffee');
    await expect(r.field).toHaveValue('Order a coffee');
    await r.field.scrollIntoViewIfNeeded();
    await expect(r.field).toBeInViewport();
    expect((await r.note.boundingBox())!.width).toBeGreaterThanOrEqual(96);
    await page.keyboard.press('Enter');
    await expect(r.words).toHaveText('Order a coffee');
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

  test('Break it down: after Return the field still has the focus; the editor’s add field too', async ({ page }) => {
    await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'running' }], 'runner');
    await runner(page).middle.click();
    await arrived(page, 'go-break');
    for (const s of ['one', 'two', 'three']) {
      await page.keyboard.type(s);
      await page.keyboard.press('Enter');
      await expect(smaller(page)).toBeFocused();
    }
    await expect(page.getByTestId('go-break-step')).toHaveText(['one', 'two', 'three']);
    await page.keyboard.press('Escape');
    await page.goBack();
    await home(page).screen.getByRole('button', { name: 'More for Practise drawing', exact: true }).click();
    const e = settled(page, 'editor');
    const add = e.getByTestId('go-edit-add');
    await add.click();
    for (const s of ['Sharpen the pencils', 'Tape the paper down']) {
      await page.keyboard.type(s);
      await page.keyboard.press('Enter');
      await expect(add).toBeFocused();
      await expect(add).toHaveValue('');
    }
    await expect(e.getByRole('textbox', { name: 'Step: Tape the paper down', exact: true })).toBeVisible();
  });

  test('See it all: a menu’s field takes the focus as it appears; closing the menu gives it back to the row it came from', async ({ page }) => {
    await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'running' }], 'runner');
    await runner(page).context.click();
    const all = settled(page, 'all');
    const more = all.getByRole('button', { name: 'More for Write the cover letter', exact: true });
    for (const [action, field] of [
      ['Add a step after', 'Add a step after'],
      ['Add a wait after', 'Add a wait after'],
      ['Change the words', 'Change the words'],
    ]) {
      await more.click();
      const menu = await arrived(page, 'go-all-menu');
      await menu.getByRole('button', { name: action, exact: true }).click();
      await expect(page.getByRole('textbox', { name: field, exact: true })).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('go-all-menu')).toHaveCount(0);
      await expect(more).toBeFocused();
    }
    // After a change made there, too: focus is on a control, not on nothing.
    await more.click();
    const menu = await arrived(page, 'go-all-menu');
    await menu.getByRole('button', { name: 'Add a step after', exact: true }).click();
    await page.keyboard.type('Sleep on it');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('go-all-menu')).toHaveCount(0);
    await somewhere(page);
    expect(await focused(page)).not.toBe('BODY');
  });
});

test.describe('U1: typed text survives a reload', () => {
  test('Change the words on the runner', async ({ page }) => {
    await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'running' }], 'runner');
    const r = runner(page);
    await r.handle.click();
    await r.panel.getByRole('button', { name: 'Change the words', exact: true }).click();
    await r.field.fill('Tailor the CV to the');
    await page.reload();
    await expect(runner(page).field).toHaveValue('Tailor the CV to the');
    await expect(runner(page).field).toBeFocused();
    await runner(page).field.press('Enter');
    await expect(runner(page).words).toHaveText('Tailor the CV to the');
    // Kept: a second reload does not start rewording again.
    await page.reload();
    await expect(runner(page).words).toHaveText('Tailor the CV to the');
    await expect(runner(page).field).toHaveCount(0);
  });

  test('See it all: a step being added or reworded', async ({ page }) => {
    await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'running' }], 'runner');
    await runner(page).context.click();
    const all = settled(page, 'all');
    await all.getByRole('button', { name: 'More for Write the cover letter', exact: true }).click();
    const menu = await arrived(page, 'go-all-menu');
    await menu.getByRole('button', { name: 'Add a step after', exact: true }).click();
    await page.getByRole('textbox', { name: 'Add a step after', exact: true }).fill('Sleep on');
    await page.reload();
    const field = page.getByRole('textbox', { name: 'Add a step after', exact: true });
    await expect(field).toHaveValue('Sleep on');
    await expect((await arrived(page, 'go-all-menu')).getByRole('heading', { level: 2 })).toHaveText('Write the cover letter');
    await field.fill('Sleep on it');
    await field.press('Enter');
    await expect(settled(page, 'all').locator('[data-testid="go-all-row"][data-mine="true"]')).toHaveText(/^Sleep on it/);
    // Done with: a reload does not open the menu again.
    await page.reload();
    await expect(settled(page, 'all')).toBeVisible();
    await expect(page.getByTestId('go-all-menu')).toHaveCount(0);
  });

  test('the editor’s add field (a step, or a wait)', async ({ page }) => {
    await startGo(page, []);
    await home(page).screen.getByRole('button', { name: 'More for Practise drawing', exact: true }).click();
    let e = settled(page, 'editor');
    await e.getByRole('button', { name: 'Add it as a wait', exact: true }).click();
    await e.getByTestId('go-edit-add').fill('the fixative to');
    await page.reload();
    e = settled(page, 'editor');
    await expect(e.getByTestId('go-edit-add')).toHaveValue('the fixative to');
    await expect(e.getByRole('button', { name: 'Add it as a wait', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await e.getByTestId('go-edit-add').fill('the fixative to dry');
    await e.getByTestId('go-edit-add').press('Enter');
    await expect(e.getByRole('textbox', { name: 'Wait for: the fixative to dry', exact: true })).toBeVisible();
  });
});

test('U3: the editor shows a long step whole — it wraps and its row grows; the words are never cut', async ({ page }) => {
  const LONG = 'Open the job ad beside the CV and mark what they ask for in yellow, then note the answer in the tracker';
  await startGo(page, [], 'home', [{ id: 'long', name: 'A long one', steps: [LONG, 'Stretch'] }]);
  await home(page).screen.getByRole('button', { name: 'More for A long one', exact: true }).click();
  const e = settled(page, 'editor');
  const field = e.getByRole('textbox', { name: `Step: ${LONG}`, exact: true });
  await expect(field).toHaveValue(LONG);
  // All of it is on show: nothing to scroll inside the field, in either direction.
  await expect.poll(() => field.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
  expect(await field.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  const long = (await field.boundingBox())!;
  const short = (await e.getByRole('textbox', { name: 'Step: Stretch', exact: true }).boundingBox())!;
  expect(long.height).toBeGreaterThan(short.height * 1.5);
  // At 200 % too.
  await page.setViewportSize({ width: 195, height: 422 });
  await expect.poll(() => field.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
