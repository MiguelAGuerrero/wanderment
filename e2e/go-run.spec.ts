/**
 * P-86 (B-11 slice 1), P-90: the runner (B-11 §3.1, §3.6; B-12 v1). Journey J04 (run a routine, a–j),
 * and what must not break: a press while reconnecting, a run whose stored place is gone, a run that
 * does not exist. (P-90: the edge of a goal is Plan's, and words are typed there —
 * e2e/go-plan.spec.ts.)
 */
import { expect, test } from './fixtures';
import { expectInside, focused, goBackup, home, importBackup, MAYA, openGo, place, plan, RoutineSpec, runner, seedGo, setVisibility, settled, startGo, tile } from './goFixture';

const LONG =
  'Write to the landlord about the boiler, the window latch and the stair light, attach the three photographs from Sunday, say which days someone is in, and ask for a date in writing before the end of the month, then copy the letting agent and put a note in the calendar to chase it';

test('J04-a, J04-b: a plain step — the context line with Done, the note, Pause · Plan · Next in fixed places; Next goes on and leaves an Undo', async ({ page }) => {
  await startGo(page, [{ id: 'r1', routine: 'apply', at: 0, status: 'running' }], 'runner');
  const r = runner(page);
  await expect(r.words).toHaveText('Read the job ad twice');
  await expect(r.context).toHaveText('Apply to Initech');
  // The context line is words, not a control (P-90: the sequence is Plan's, reached by the Plan button).
  await expect(r.screen.getByRole('button')).toHaveText(['Done', '', '', 'Plan', 'Next']);
  await expect(r.done).toHaveText('Done');
  await expect(r.done).toHaveAccessibleName('Done with Apply to Initech');
  await expect(r.pause).toBeVisible();
  await expect(r.middle).toHaveText('Plan');
  await expect(r.middle).toBeEnabled();
  await expect(r.next).toHaveText('Next');
  // The level's name is the screen's heading (there for a screen reader; the context line shows it).
  await expect(r.screen.getByRole('heading', { level: 1 })).toHaveText('Apply to Initech');
  // On arrival the note has the focus.
  await expect(r.note).toBeFocused();
  // Next is THE filled button; nothing else on the screen is.
  const paper = 'rgb(244, 241, 232)';
  expect(await r.next.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe(paper);
  for (const b of [r.pause, r.middle, r.done]) expect(await b.evaluate((e) => getComputedStyle(e).backgroundColor)).not.toBe(paper);
  // No notice yet, and nothing about what comes next or repeats on the surface.
  await expect(r.screen.getByTestId('go-last')).toHaveCount(0);

  const before = { pause: await place(r.pause), middle: await place(r.middle), next: await place(r.next), note: await place(r.note) };
  await r.next.click();
  await expect(r.words).toHaveText('Tailor the CV');
  await expect(r.notice.getByRole('button', { name: 'Undo Next', exact: true })).toBeVisible();
  // Nothing moved: the three buttons and the note are where they were.
  expect({ pause: await place(r.pause), middle: await place(r.middle), next: await place(r.next), note: await place(r.note) }).toEqual(before);
  // Focus stays on Next, which is in its fixed place.
  await expect(r.next).toBeFocused();

  await r.notice.getByRole('button', { name: 'Undo Next', exact: true }).click();
  await expect(r.words).toHaveText('Read the job ad twice');
  // After Undo: what came back.
  await expect(r.note).toBeFocused();
  await expect(r.notice).toHaveCount(0);
});

test('J04-c, J04-d: a routine as the step reads Step in, in the same slot; Done leaves the level for the parent’s next step, with Undo', async ({ page }) => {
  await startGo(page, [{ id: 'r1', routine: 'apply', at: 2, status: 'running' }], 'runner');
  const r = runner(page);
  const slot = await place(r.middle);
  await r.next.click();
  await expect(r.words).toHaveText('Proofread out loud');
  await expect(r.note).toHaveAttribute('data-kind', 'routine');
  await expect(r.middle).toHaveText('Step in');
  await expect(r.middle).toHaveAccessibleName('Step in: Proofread out loud');
  expect(await place(r.middle)).toEqual(slot);

  await r.middle.click();
  await expect(r.words).toHaveText('Read it aloud once');
  // The level and its parent, in words.
  await expect(r.context).toHaveText('Apply to InitechProofread out loud');
  await expect(r.done).toHaveAccessibleName('Done with Proofread out loud');
  await expect(r.middle).toHaveText('Plan');
  await expect(r.note).toBeFocused();

  await r.done.click();
  await expect(r.words).toHaveText('Send the application');
  await expect(r.context).toHaveText('Apply to Initech');
  await expect(r.notice).toContainText('Done with Proofread out loud');
  await expect(r.note).toBeFocused();
  await r.notice.getByRole('button', { name: 'Undo Done', exact: true }).click();
  await expect(r.words).toHaveText('Read it aloud once');
  await expect(r.done).toHaveAccessibleName('Done with Proofread out loud');
});

test('J04-e: Done at the top ends the run — home, with Undo, which brings the run back where it was', async ({ page }) => {
  await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'running' }], 'runner');
  await runner(page).done.click();
  const h = home(page);
  await expect(h.notice).toContainText('Done with Apply to Initech');
  await expect(tile(page, 'Apply to Initech')).toHaveAttribute('data-state', 'idle');
  await expect(h.title).toHaveText('Nothing running');
  await expect(h.title).toBeFocused();
  await h.notice.getByRole('button', { name: 'Undo Done', exact: true }).click();
  await expect(runner(page).words).toHaveText('Tailor the CV');
  await expect(runner(page).note).toBeFocused();
});

test('J04-f, J04-g, J37-e: the last step of a round has its mark and spoken name; a round comes again silently; a counted loop finishes by itself', async ({ page }) => {
  await startGo(page, [{ id: 'r3', routine: 'drawing', at: 1, inner: [{ routine: 'hands', at: 2, round: 2 }], status: 'running' }], 'runner');
  const r = runner(page);
  await expect(r.words).toHaveText('Check your proportions');
  await expect(r.screen.getByTestId('go-last')).toHaveCount(0);
  await r.next.click();
  await expect(r.words).toHaveText('Add the shadows');
  const mark = r.screen.getByRole('img', { name: 'Last step of this round', exact: true });
  await expect(mark).toBeVisible();
  // It is inside the note, after the step's words.
  expect(await r.note.evaluate((n) => !!n.querySelector('[data-testid="go-last"]'))).toBe(true);
  // Round 2 of 3: Next comes round again, saying nothing.
  await r.next.click();
  await expect(r.words).toHaveText('Block in the big shapes');
  await expect(r.notice).toHaveText('Undo Next');
  await expect(r.screen.getByText(/Round|Finished/)).toHaveCount(0);
  // Round 3: after its last step the loop is finished, and the parent goes on.
  await r.next.click();
  await r.next.click();
  await expect(r.words).toHaveText('Add the shadows');
  await r.next.click();
  await expect(r.words).toHaveText('Gesture drawing');
  await expect(r.notice).toContainText('Finished Hand studies of my left hand');
  await expect(r.context).toHaveText('Practise drawing');
  await r.notice.getByRole('button', { name: 'Undo Next', exact: true }).click();
  await expect(r.words).toHaveText('Add the shadows');
  await expect(r.done).toHaveAccessibleName('Done with Hand studies of my left hand');
});

test('J04-i, J25-b: a long step fills the note and scrolls inside it, with Plan marked (breaking it down is planning); a three-line step just steps the type down', async ({ page }) => {
  const flat: RoutineSpec[] = [{ id: 'flat', name: 'Sort out the flat', open: false, steps: ['Stretch', 'Open the job ad beside the CV and mark what they ask for in yellow', LONG] }];
  await startGo(page, [{ id: 'r9', routine: 'flat', at: 0, status: 'running' }], 'runner', flat);
  const r = runner(page);
  const area = r.screen.getByTestId('go-note-area');
  const inside = async () => {
    const a = (await area.boundingBox())!;
    const n = (await r.note.boundingBox())!;
    expect(n.x).toBeGreaterThanOrEqual(a.x);
    expect(n.y).toBeGreaterThanOrEqual(a.y);
    expect(n.x + n.width).toBeLessThanOrEqual(a.x + a.width);
    expect(n.y + n.height).toBeLessThanOrEqual(a.y + a.height);
    // Roughly square, and never stretched.
    expect(Math.abs(n.width - n.height)).toBeLessThanOrEqual(1);
    return n;
  };
  // A few words: the largest type, with air.
  await expect(r.note).toHaveAttribute('data-size', '32');
  await expect(r.note).toHaveAttribute('data-full', 'false');
  const few = await inside();
  await expect(r.middle).toHaveAttribute('data-marked', 'false');
  await expect(r.middle).toHaveAccessibleName('Plan');

  // Three lines: smaller type, the same note, the words inside it.
  await r.next.click();
  await expect(r.note).toHaveAttribute('data-full', 'false');
  expect(Number(await r.note.getAttribute('data-size'))).toBeLessThan(32);
  expect(await inside()).toEqual(few);
  const w = (await r.words.boundingBox())!;
  expect(w.y).toBeGreaterThanOrEqual(few.y);
  expect(w.y + w.height).toBeLessThanOrEqual(few.y + few.height);
  expect(w.x + w.width).toBeLessThanOrEqual(few.x + few.width);

  // Too long: full — the smallest type, scrolling inside, never clipped; the note is still the same square.
  await r.next.click();
  await expect(r.note).toHaveAttribute('data-full', 'true');
  await expect(r.note).toHaveAttribute('data-size', '18');
  expect(await inside()).toEqual(few);
  const scroll = r.screen.getByTestId('go-note-scroll');
  const sizes = await scroll.evaluate((e) => ({ scroll: e.scrollHeight, client: e.clientHeight, overflow: getComputedStyle(e).overflowY }));
  expect(sizes.scroll).toBeGreaterThan(sizes.client);
  expect(['auto', 'scroll']).toContain(sizes.overflow);
  await expect(r.words).toHaveText(LONG);
  // No count, no warning — only the mark on Plan, with its spoken name.
  await expect(r.middle).toHaveAttribute('data-marked', 'true');
  await expect(r.middle).toHaveAccessibleName('Plan. This step is long');
  await expect(r.middle).toHaveText('Plan');
  await expect(r.screen.getByText(/\d+ ?(\/|of|characters|left)/)).toHaveCount(0);
});

test('J04-j, §3.6: a routine that ends here finishes on its last Next — home, "Finished <name>", with Undo', async ({ page }) => {
  await startGo(page, [{ id: 'r1', routine: 'apply', at: 4, status: 'running' }], 'runner');
  await expect(runner(page).words).toHaveText('Send the application');
  await runner(page).next.click();
  await expect(home(page).notice).toContainText('Finished Apply to Initech');
  await expect(tile(page, 'Apply to Initech')).toHaveAttribute('data-state', 'idle');
  await home(page).notice.getByRole('button', { name: 'Undo Next', exact: true }).click();
  await expect(runner(page).words).toHaveText('Send the application');
});

test('must-handle (two tabs, offline): Next pressed while reconnecting is kept, says so, and is applied once the data is back', async ({ page }) => {
  await startGo(page, [{ id: 'r1', routine: 'apply', at: 0, status: 'running' }], 'runner');
  const r = runner(page);
  await setVisibility(page, 'hidden');
  await r.next.click();
  await expect(r.screen.getByTestId('go-notice')).toHaveText('Just a moment — reconnecting.');
  await expect(r.words).toHaveText('Read the job ad twice');
  // Pressed again, it is still one press.
  await r.next.click();
  await setVisibility(page, 'visible');
  await expect(r.words).toHaveText('Tailor the CV');
});

test('must-handle: a run that is not there goes home without an error; a run whose stored place is gone opens at the start of its level', async ({ page }) => {
  await startGo(page, []);
  await page.goto('./go/run/no-such-run');
  await expect(settled(page, 'home')).toBeVisible();
  await expect(page).toHaveURL(/\/go$/);
  for (const screen of ['paused', 'plan', 'jump', 'all']) {
    await page.goto(`./go/run/no-such-run/${screen}`);
    await expect(settled(page, 'home')).toBeVisible();
    await expect(page).toHaveURL(/\/go$/);
  }
  await page.goto('./go/routine/no-such-routine');
  await expect(settled(page, 'home')).toBeVisible();

  // A run standing on a step that no longer exists (as an old backup might hold).
  const backup = JSON.parse(goBackup(MAYA, [{ id: 'r1', routine: 'apply', at: 1, status: 'running' }]));
  backup.data.runs.r1.frames = [{ seq: 'apply', at: 'a-step-that-is-gone', round: 1 }];
  await importBackup(page, JSON.stringify(backup));
  await openGo(page, 'runner');
  await expect(runner(page).words).toHaveText('Read the job ad twice');
  await runner(page).next.click();
  await expect(runner(page).words).toHaveText('Read the job ad twice');
});

test('must-handle: a frame ten deep and a thirty-step routine — the context line names the level and its parent; nothing overflows', async ({ page }) => {
  const deep: RoutineSpec[] = Array.from({ length: 10 }, (_, i) => ({
    id: `d${i}`,
    name: `Level ${i + 1} of the deep thing`,
    home: i === 0,
    steps: i < 9 ? ['Before', { routine: `d${i + 1}` }, 'After'] : Array.from({ length: 30 }, (_, k) => `Bottom step ${k + 1}`),
  }));
  const inner = Array.from({ length: 9 }, (_, i) => ({ routine: `d${i + 1}`, at: i < 8 ? 1 : 12 }));
  await seedGo(page, deep, [{ id: 'r', routine: 'd0', at: 1, inner, status: 'running' }]);
  await openGo(page, 'runner');
  const r = runner(page);
  await expect(r.words).toHaveText('Bottom step 13');
  await expect(r.context).toHaveText('Level 9 of the deep thingLevel 10 of the deep thing');
  await expect(r.done).toHaveAccessibleName('Done with Level 10 of the deep thing');
  await expectInside(page, [r.context, r.done, r.note, r.pause, r.middle, r.next]);
  // Its Plan: every level it is inside is open, down to HERE — in view, and nothing wider than the window.
  await r.middle.click();
  const p = plan(page);
  await expect(p.here).toHaveAccessibleName('Here, Bottom step 13');
  await expect(p.here).toBeInViewport({ ratio: 1 });
  await expect(p.rows).toHaveCount(3 * 9 + 30);
  await expect(p.forward).toHaveText('Resume at Bottom step 13');
  for (const row of [p.rows.first(), p.here]) {
    const b = (await row.boundingBox())!;
    expect(b.x + b.width).toBeLessThanOrEqual(390);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(await focused(page)).not.toBe('none');
});
