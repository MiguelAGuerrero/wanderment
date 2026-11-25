/**
 * P-86 (B-11 slice 1): Pause, the paused screen and Home (B-11 §3.3, §9b). Journeys J10 (pause and
 * pick up another: Resume, never Switch or Stop) and J35 (pause with a reason). The verbs are Start,
 * Resume, Pause, Done, Next.
 */
import { expect, test } from './fixtures';
import { arrived, home, paused, runner, setVisibility, settled, startGo, tile, sinceDate } from './goFixture';

const RUNS = [
  { id: 'r1', routine: 'apply', at: 1, status: 'running' as const },
  { id: 'r2', routine: 'apply-acme', at: 1, waitingDaysAgo: 9, touchedMinutesAgo: 90 },
  { id: 'r3', routine: 'drawing', at: 0, touchedMinutesAgo: 10 },
];

/** A wait seeded nine days ago reads its date (within the last week it would be a day's name). */
const SINCE = sinceDate(9);

test('J10-a, J35-a: Pause opens the paused screen — the run, an empty reason, Resume filled, and what else can be resumed, each with its own Resume', async ({ page }) => {
  await startGo(page, RUNS, 'runner');
  await runner(page).pause.click();
  const p = paused(page);
  await expect(page).toHaveURL(/\/go\/run\/r1\/paused$/);
  await expect(p.title).toHaveText('Paused');
  await expect(p.title).toBeFocused();
  await expect(p.run).toContainText('Apply to Initech');
  await expect(p.line).toHaveText('at Tailor the CV');
  await expect(p.reason).toHaveValue('');
  await expect(p.reason).toHaveAccessibleName('Reason');
  // Resume is the one filled button; its spoken name says what it resumes.
  await expect(p.resume).toHaveText('Resume');
  await expect(p.resume).toHaveAccessibleName('Resume Apply to Initech');
  expect(await p.resume.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgb(244, 241, 232)');
  // What else can be resumed, last touched first, each with its own Resume (outlined).
  await expect(p.others).toHaveCount(2);
  await expect(p.others.nth(0)).toContainText('Practise drawing');
  await expect(p.others.nth(0)).toContainText('at Warm-up lines');
  await expect(p.others.nth(1)).toContainText('Apply to Acme');
  await expect(p.others.nth(1)).toContainText(`waiting for a reply from Acme · since ${SINCE}`);
  for (const name of ['Resume Practise drawing', 'Resume Apply to Acme']) {
    const b = p.screen.getByRole('button', { name, exact: true });
    await expect(b).toHaveText('Resume');
    expect(await b.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  }
  // The retired verbs are nowhere.
  await expect(p.screen.getByText(/\b(Stop|Switch)\b/)).toHaveCount(0);
  await expect(p.home).toHaveText('Home');
});

test('J10: Resume goes back to the step; Resume on another run opens that one, and Back from it is home', async ({ page }) => {
  await startGo(page, RUNS, 'runner');
  await runner(page).pause.click();
  await paused(page).resume.click();
  await expect(runner(page).words).toHaveText('Tailor the CV');
  await expect(page).toHaveURL(/\/go\/run\/r1$/);
  await expect(runner(page).note).toBeFocused();

  await runner(page).pause.click();
  await paused(page).screen.getByRole('button', { name: 'Resume Practise drawing', exact: true }).click();
  await expect(runner(page).words).toHaveText('Warm-up lines');
  await expect(page).toHaveURL(/\/go\/run\/r3$/);
  await page.goBack();
  await expect(settled(page, 'home')).toBeVisible();
  // One thing running; the one put down reads "at <step>".
  await expect(tile(page, 'Practise drawing')).toHaveAttribute('data-state', 'running');
  await expect(tile(page, 'Apply to Initech')).toHaveAttribute('data-state', 'paused');
  await expect(tile(page, 'Apply to Initech').getByTestId('go-tile-line')).toHaveText('at Tailor the CV');
});

test('J10, §9b: Home asks first — "Stop <name>?", Cancel filled and focused; Esc and Back cancel; Home leaves the run where it is', async ({ page }) => {
  await startGo(page, RUNS, 'runner');
  await runner(page).pause.click();
  const p = paused(page);
  await p.home.click();
  let ask = await arrived(page, 'go-stop');
  await expect(ask).toHaveRole('alertdialog');
  await expect(ask.getByRole('heading', { level: 2 })).toHaveText('Stop Apply to Initech?');
  const cancel = ask.getByRole('button', { name: 'Cancel', exact: true });
  await expect(cancel).toBeFocused();
  expect(await cancel.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgb(244, 241, 232)');
  expect(await ask.getByRole('button', { name: 'Home', exact: true }).evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  // Nothing red: it can be undone by Resume.
  expect(await ask.getByRole('button', { name: 'Home', exact: true }).evaluate((e) => getComputedStyle(e).borderTopColor)).not.toBe('rgb(255, 138, 122)');
  // Esc cancels; focus goes back to what opened it.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('go-stop')).toHaveCount(0);
  await expect(p.home).toBeFocused();
  await expect(p.title).toHaveText('Paused');
  // Back cancels too, and stays on the paused screen.
  await p.home.click();
  ask = await arrived(page, 'go-stop');
  await page.goBack();
  await expect(page.getByTestId('go-stop')).toHaveCount(0);
  await expect(page).toHaveURL(/\/go\/run\/r1\/paused$/);
  // Cancel.
  await p.home.click();
  ask = await arrived(page, 'go-stop');
  await ask.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(p.title).toHaveText('Paused');

  // Home: nothing is running; the run stays exactly where it was.
  await p.home.click();
  ask = await arrived(page, 'go-stop');
  await ask.getByRole('button', { name: 'Home', exact: true }).click();
  const h = home(page);
  await expect(h.title).toHaveText('Nothing running');
  await expect(tile(page, 'Apply to Initech')).toHaveAttribute('data-state', 'paused');
  await expect(tile(page, 'Apply to Initech').getByTestId('go-tile-line')).toHaveText('at Tailor the CV');
  // Opening /go again is home now (nothing is the run the app is on).
  await page.goto('./go');
  await expect(settled(page, 'home')).toBeVisible();
  await home(page).screen.getByRole('button', { name: 'Resume Apply to Initech', exact: true }).click();
  await expect(runner(page).words).toHaveText('Tailor the CV');
});

test('J35-b, J35-c, J35-d: a reason typed in place is kept as typed (through a reload), shows on its tile, and can be edited and cleared', async ({ page }) => {
  await startGo(page, RUNS, 'runner');
  await runner(page).pause.click();
  const p = paused(page);
  await p.reason.fill('need the job ad open');
  await page.reload();
  await expect(paused(page).reason).toHaveValue('need the job ad open');
  // /go opens where you left off: the paused screen.
  await page.goto('./go');
  await expect(paused(page).reason).toHaveValue('need the job ad open');
  // Back from Paused is home: nothing changes, the run was already paused. Its tile reads the reason.
  await page.goBack();
  await expect(tile(page, 'Apply to Initech').getByTestId('go-tile-line')).toHaveText('at Tailor the CV');
  await expect(tile(page, 'Apply to Initech').getByTestId('go-tile-reason')).toHaveText('need the job ad open');
  await expect(tile(page, 'Apply to Initech')).toHaveAccessibleName('Apply to Initech, paused at Tailor the CV, need the job ad open');
  await page.goForward();
  // Edited, then cleared.
  await paused(page).reason.fill('need the job ad and the old CV');
  await expect(paused(page).reason).toHaveValue('need the job ad and the old CV');
  await paused(page).screen.getByRole('button', { name: 'Clear the reason', exact: true }).click();
  await expect(paused(page).reason).toHaveValue('');
  await expect(paused(page).screen.getByRole('button', { name: 'Clear the reason', exact: true })).toHaveCount(0);
  await page.goBack();
  await expect(tile(page, 'Apply to Initech').getByTestId('go-tile-reason')).toHaveCount(0);
});

test('J35-e: after Resume the reason is readable in the panel until the first Next, then it is dropped', async ({ page }) => {
  await startGo(page, RUNS, 'runner');
  const r = runner(page);
  await r.pause.click();
  await paused(page).reason.fill('lunch');
  await paused(page).resume.click();
  await expect(r.words).toHaveText('Tailor the CV');
  // Nothing about it on the runner's surface.
  await expect(r.screen.getByText('lunch')).toHaveCount(0);
  await r.handle.click();
  await expect(r.panel.getByTestId('go-panel-reason')).toHaveText('lunch');
  await page.keyboard.press('Escape');
  await r.next.click();
  await expect(r.words).toHaveText('Write the cover letter');
  await r.handle.click();
  await expect(r.panel.getByTestId('go-panel-reason')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await r.pause.click();
  await expect(paused(page).reason).toHaveValue('');
});

test('J35-f: a three-line reason fits on the paused screen (keyboard up) and on its tile, wrapped, never clipped', async ({ page }) => {
  const LONG = 'waiting until the kids are asleep and the house is quiet enough to think about what the ad really asks for';
  await startGo(page, RUNS, 'runner');
  await runner(page).pause.click();
  const p = paused(page);
  await p.reason.fill(LONG);
  // The field grows with the words instead of hiding them.
  await expect.poll(() => p.reason.evaluate((e) => e.scrollHeight - e.clientHeight)).toBeLessThanOrEqual(1);
  await page.setViewportSize({ width: 390, height: 510 });
  await expect(p.resume).toBeInViewport();
  await expect(p.home).toBeInViewport();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goBack();
  const reason = tile(page, 'Apply to Initech').getByTestId('go-tile-reason');
  await expect(reason).toHaveText(LONG);
  const t = (await tile(page, 'Apply to Initech').boundingBox())!;
  const b = (await reason.boundingBox())!;
  expect(b.x).toBeGreaterThanOrEqual(t.x);
  expect(b.x + b.width).toBeLessThanOrEqual(t.x + t.width);
  expect(b.y + b.height).toBeLessThanOrEqual(t.y + t.height);
  expect(await reason.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
});

test('must-handle (two tabs): a reason typed while reconnecting stays in its field; Resume pressed then is kept and applied once', async ({ page }) => {
  await startGo(page, RUNS, 'runner');
  await runner(page).pause.click();
  const p = paused(page);
  await setVisibility(page, 'hidden');
  await p.reason.fill('typed while away');
  await expect(p.reason).toHaveValue('typed while away');
  await p.resume.click();
  await expect(p.screen.getByTestId('go-notice')).toHaveText('Just a moment — reconnecting.');
  await expect(p.title).toHaveText('Paused');
  await setVisibility(page, 'visible');
  await expect(runner(page).words).toHaveText('Tailor the CV');
});

// After the P-90 audit (F5): the field is as tall as its words — one line while they fit on one line
// (it grew 16 px with every keystroke: 64 px to 336 px after 17 characters), taller only when they wrap.
test('the reason field does not grow as you type on one line; it grows when the words wrap, and never cuts them off', async ({ page }) => {
  await startGo(page, RUNS, 'runner');
  await runner(page).pause.click();
  const p = paused(page);
  const height = async () => Math.round((await p.reason.boundingBox())!.height);
  const empty = await height();
  expect(empty).toBeGreaterThanOrEqual(48);
  await p.reason.click();
  const seen: number[] = [];
  for (const key of 'waiting on a call') {
    await page.keyboard.type(key);
    seen.push(await height());
  }
  await expect(p.reason).toHaveValue('waiting on a call');
  // One line of 16-px words: the same height after every key, and no taller than empty.
  expect(new Set(seen).size, seen.join(' ')).toBe(1);
  expect(seen[0]).toBe(empty);
  // Words that wrap: it grows to hold them, whole.
  await p.reason.fill('waiting on a call from the agency about the second interview, and for the reference from my old manager to arrive');
  await expect.poll(height).toBeGreaterThan(empty);
  const tall = await height();
  expect(await p.reason.evaluate((e) => e.scrollHeight <= e.clientHeight + 1)).toBe(true);
  // …and settles: the same a moment later, and back to one line when cleared.
  await page.waitForTimeout(300);
  expect(await height()).toBe(tall);
  await p.reason.fill('');
  await expect.poll(height).toBe(empty);
});
