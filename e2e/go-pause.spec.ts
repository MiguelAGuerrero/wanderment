/**
 * P-86 (B-11 slice 1), P-95, P-96: Pause (B-11 §3.3, §9b). Journeys J10 (pause and pick up another:
 * Resume, never Switch or Stop) and J35 (a reason). The verbs are Start, Resume, Pause, Done, Next.
 *
 * P-96 (contract ruling 7, the amendment): Pause goes HOME — the separate paused screen is gone. The
 * paused run is the first tile, marked; the one filled button, lowest, is "Resume <name>"; every other
 * run keeps its own (outlined) Resume on its tile. A reason stored by an earlier build still reads on
 * its tile and in the panel (there is no screen to type one any more: see the P-96 report).
 *
 * P-101 (rulings 3, 5): ❚❚ opens a small sheet, "Pausing <name>", with an optional note (kept as the
 * run's reason, read on the tile and back in the runner) and the filled Pause; home's order never moves
 * for a pause; the filled Resume bar is gone — each run's tile body resumes it. The pausing itself is
 * e2e/go-moves.spec.ts (2); the tests below say what each was.
 */
import { expect, test } from './fixtures';
import { arrived, home, openGo, pauseRun, runner, setVisibility, settled, startGo, tile, tileBody, sinceDate } from './goFixture';

const RUNS = [
  { id: 'r1', routine: 'apply', at: 1, status: 'running' as const },
  { id: 'r2', routine: 'apply-acme', at: 1, waitingDaysAgo: 9, touchedMinutesAgo: 90 },
  { id: 'r3', routine: 'drawing', at: 0, touchedMinutesAgo: 10 },
];

/** A wait seeded nine days ago reads its date (within the last week it would be a day's name). */
const SINCE = sinceDate(9);
const PAPER = 'rgb(244, 241, 232)';

test('J10-a (P-96; was: Pause opens the paused screen): Pause goes home — P-101 (rulings 3, 5; was: the run first, "Resume <name>" the filled button): through its sheet; the run marked "last", every run resumed by its own tile, none filled', async ({ page }) => {
  await startGo(page, RUNS, 'runner');
  await pauseRun(page);
  const h = home(page);
  await expect(h.screen).toBeVisible();
  await expect(page).toHaveURL(/\/go$/);
  await expect(h.tiles.first()).toHaveAccessibleName('Apply to Initech, paused at Tailor the CV');
  await expect(tile(page, 'Apply to Initech').getByTestId('go-tile-last')).toHaveText('Last ran'); // (P-110, rewritten: was 'last' — the owner: "last is relative"; it reads "Last ran".)
  await expect(page.getByTestId('go-resume')).toHaveCount(0);
  await expect(tile(page, 'Apply to Acme').getByTestId('go-tile-line')).toHaveText(`waiting for a reply from Acme · since ${SINCE}`);
  for (const name of ['Apply to Initech', 'Practise drawing', 'Apply to Acme']) {
    const b = tileBody(page, name);
    await expect(b).toHaveAccessibleName(new RegExp(`^Resume ${name}`));
    expect(await b.evaluate((e) => getComputedStyle(e).backgroundColor)).not.toBe(PAPER);
  }
  // The retired verbs are nowhere, and Pause has no notice.
  await expect(h.screen.getByText(/\b(Stop|Switch)\b/)).toHaveCount(0);
  await expect(h.notice).toHaveCount(0);
});

test('J10: Resume goes back to the step; Resume on another run opens that one, and Back from it is home', async ({ page }) => {
  await startGo(page, RUNS, 'runner');
  await pauseRun(page);
  await tileBody(page, 'Apply to Initech').click();
  await expect(runner(page).words).toHaveText('Tailor the CV');
  await expect(page).toHaveURL(/\/go\/run\/r1$/);
  await expect(runner(page).note).toBeFocused();

  await pauseRun(page);
  await tileBody(page, 'Practise drawing').click();
  await expect(runner(page).words).toHaveText('Warm-up lines');
  await expect(page).toHaveURL(/\/go\/run\/r3$/);
  await page.goBack();
  await expect(settled(page, 'home')).toBeVisible();
  // One thing running; the one put down reads "at <step>".
  await expect(tile(page, 'Practise drawing')).toHaveAttribute('data-state', 'running');
  await expect(tile(page, 'Apply to Initech')).toHaveAttribute('data-state', 'paused');
  await expect(tile(page, 'Apply to Initech').getByTestId('go-tile-line')).toHaveText('at Tailor the CV');
});

test('J10, P-95 (5): Pause never confirms — no "Stop <name>?" (P-101: its sheet is "Pausing <name>", the note optional, Pause filled); reopened, the app is home with the run first, resumed by its tile', async ({ page }) => {
  await startGo(page, RUNS, 'runner');
  await runner(page).pause.click();
  const sheet = await arrived(page, 'go-pause-sheet');
  await expect(sheet).toHaveRole('dialog');
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.getByText(/^Stop /)).toHaveCount(0);
  await sheet.getByTestId('go-pause-confirm').click();
  await expect(home(page).screen).toBeVisible();
  await page.goto('./go');
  await expect(settled(page, 'home')).toBeVisible();
  await expect(home(page).tiles.first()).toHaveAccessibleName('Apply to Initech, paused at Tailor the CV');
  await tileBody(page, 'Apply to Initech').click();
  await expect(runner(page).words).toHaveText('Tailor the CV');
});

test('J35 (P-96; was: a reason typed on the paused screen): a stored reason reads on its tile, wrapped and never clipped, and after Resume — P-101 (ruling 3; was: "nothing about it on the runner\'s surface") on the runner under the path, and in the panel — until the first Next', async ({ page }) => {
  const LONG = 'waiting until the kids are asleep and the house is quiet enough to think about what the ad really asks for';
  await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'paused', reason: LONG }]);
  const t = tile(page, 'Apply to Initech');
  const reason = t.getByTestId('go-tile-reason');
  await expect(reason).toHaveText(LONG);
  await expect(t).toHaveAccessibleName(`Apply to Initech, paused at Tailor the CV, ${LONG}`);
  const tb = (await t.boundingBox())!;
  const b = (await reason.boundingBox())!;
  expect(b.x).toBeGreaterThanOrEqual(tb.x);
  expect(b.x + b.width).toBeLessThanOrEqual(tb.x + tb.width);
  expect(b.y + b.height).toBeLessThanOrEqual(tb.y + tb.height);
  expect(await reason.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);

  await tileBody(page, 'Apply to Initech').click();
  const r = runner(page);
  await expect(r.words).toHaveText('Tailor the CV');
  await expect(r.reason).toHaveText(LONG);
  await r.handle.click();
  await expect(r.panel.getByTestId('go-panel-reason')).toHaveText(LONG);
  await page.keyboard.press('Escape');
  await r.next.click();
  await expect(r.words).toHaveText('Write the cover letter');
  await expect(r.reason).toHaveCount(0);
  await r.handle.click();
  await expect(r.panel.getByTestId('go-panel-reason')).toHaveCount(0);
});

test('must-handle (two tabs; P-96: was the paused screen’s Resume): Pause pressed while reconnecting is kept and applied once — then home; P-101 (ruling 3): with a note typed it is refused and the sheet keeps the words', async ({ page }) => {
  await startGo(page, RUNS, 'runner');
  const r = runner(page);
  await setVisibility(page, 'hidden');
  await r.pause.click();
  const sheet = await arrived(page, 'go-pause-sheet');
  await sheet.getByTestId('go-pause-note').fill('back after lunch');
  await sheet.getByTestId('go-pause-confirm').click();
  await expect(sheet.getByTestId('go-pause-note')).toHaveValue('back after lunch');
  await sheet.getByTestId('go-pause-note').fill('');
  await sheet.getByTestId('go-pause-confirm').click();
  await expect(page.getByTestId('go-pause-sheet')).toHaveCount(0);
  await expect(r.screen.getByTestId('go-notice')).toHaveText('Just a moment — reconnecting.');
  await expect(r.words).toHaveText('Tailor the CV');
  await setVisibility(page, 'visible');
  await expect(tileBody(page, 'Apply to Initech')).toHaveAccessibleName(/^Resume Apply to Initech/);
  await openGo(page);
  await expect(tile(page, 'Apply to Initech')).toHaveAttribute('data-state', 'paused');
});
