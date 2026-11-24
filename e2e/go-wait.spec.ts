/**
 * P-86 (B-11 slice 1): plain wait steps (B-11 §3.1, §3.3; J34, J36). A wait is a step: reaching it
 * means everything before it is done. The note is outlined with the wait mark, Next reads "It's
 * happened", the middle slot is dimmed; a run resting on one reads as waiting — its paused screen is
 * titled "Waiting", its tile "waiting for <words> · since <day>" — never as abandoned.
 */
import { expect, test } from './fixtures';
import { home, paused, place, runner, settled, startGo, tile, sinceDate } from './goFixture';

/** A wait seeded nine days ago reads its date (within the last week it would be a day's name). */
const SINCE = sinceDate(9);

test('J34-a: the runner on a wait step — the outlined note with the wait mark, "It’s happened" in Next’s place, the middle slot dimmed', async ({ page }) => {
  await startGo(page, [{ id: 'r2', routine: 'apply-acme', at: 0, status: 'running' }], 'runner');
  const r = runner(page);
  const fixed = { pause: await place(r.pause), middle: await place(r.middle), next: await place(r.next), note: await place(r.note) };
  const plain = await r.note.evaluate((e) => getComputedStyle(e).backgroundColor);
  await r.next.click();
  await expect(r.note).toHaveAttribute('data-kind', 'wait');
  await expect(r.words).toHaveText('a reply from Acme');
  // Without "Wait for" its words would not read as a wait; the spoken name says it too.
  await expect(r.note.getByText('Wait for', { exact: true })).toBeVisible();
  await expect(r.note).toHaveAccessibleName('Wait for: a reply from Acme');
  // Outlined, not filled with the routine's colour.
  const waiting = await r.note.evaluate((e) => ({ bg: getComputedStyle(e).backgroundColor, border: getComputedStyle(e).borderTopWidth, colour: getComputedStyle(e).borderTopColor }));
  expect(waiting.bg).not.toBe(plain);
  expect(waiting.border).toBe('2px');
  expect(waiting.colour).toBe(plain);
  // The buttons keep their places.
  expect({ pause: await place(r.pause), middle: await place(r.middle), next: await place(r.next), note: await place(r.note) }).toEqual(fixed);
  await expect(r.next).toHaveText('It’s happened');
  await expect(r.next).toHaveAccessibleName('It’s happened: a reply from Acme');
  expect(await r.next.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgb(244, 241, 232)');
  // Dimmed is dashed AND disabled, never colour alone.
  await expect(r.middle).toBeDisabled();
  await expect(r.middle).toHaveText('Break it down');
  expect(await r.middle.evaluate((e) => getComputedStyle(e).borderTopStyle)).toBe('dashed');
  await expect(r.pause).toBeEnabled();
});

test('J34-b: the panel on a wait says what it is waiting for and since when, in words', async ({ page }) => {
  await startGo(page, [{ id: 'r2', routine: 'apply-acme', at: 1, waitingDaysAgo: 9, status: 'running' }], 'runner');
  const r = runner(page);
  await r.handle.click();
  const where = r.panel.getByTestId('go-where');
  await expect(where).toContainText(`waiting for a reply from Acme · since ${SINCE}`);
  await expect(where).toContainText('then: Note the answer in the tracker');
  // A wait's words can be changed like a step's.
  await expect(r.panel.getByRole('button', { name: 'Change the words', exact: true })).toBeVisible();
});

test('J34-c, J34-d: leaving it — the paused screen is titled "Waiting" and carries "It’s happened"; its tile reads "waiting for … · since …"', async ({ page }) => {
  await startGo(page, [{ id: 'r2', routine: 'apply-acme', at: 1, waitingDaysAgo: 9, status: 'running' }], 'runner');
  await runner(page).pause.click();
  const p = paused(page);
  await expect(p.title).toHaveText('Waiting');
  await expect(p.line).toHaveText(`waiting for a reply from Acme · since ${SINCE}`);
  const happened = p.screen.getByRole('button', { name: 'It’s happened: a reply from Acme', exact: true });
  await expect(happened).toHaveText('It’s happened');
  // The one filled button on a waiting screen is "It's happened" (the forward choice); Resume is outlined here.
  expect(await happened.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgb(244, 241, 232)');
  expect(await p.resume.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  await expect(p.resume).toHaveText('Resume');
  // Resume returns to the wait note, still waiting since then.
  await p.resume.click();
  await expect(runner(page).note).toHaveAccessibleName('Wait for: a reply from Acme');
  await page.goBack();
  const t = tile(page, 'Apply to Acme');
  await expect(t).toHaveAttribute('data-state', 'waiting');
  await expect(t.getByTestId('go-tile-line')).toHaveText(`waiting for a reply from Acme · since ${SINCE}`);
  await expect(t).toHaveAccessibleName(`Apply to Acme, waiting for a reply from Acme · since ${SINCE}`);
  await expect(home(page).screen.getByRole('button', { name: 'Resume Apply to Acme', exact: true })).toBeVisible();
});

test('J34-e: back again — saying it has happened goes on to the next step, with Undo (from the runner, and from Waiting)', async ({ page }) => {
  await startGo(page, [{ id: 'r2', routine: 'apply-acme', at: 1, waitingDaysAgo: 9, status: 'paused' }], 'paused');
  const p = paused(page);
  await expect(p.title).toHaveText('Waiting');
  await p.screen.getByRole('button', { name: 'It’s happened: a reply from Acme', exact: true }).click();
  const r = runner(page);
  await expect(r.words).toHaveText('Note the answer in the tracker');
  await expect(r.note).toHaveAttribute('data-kind', 'step');
  await expect(r.next).toHaveText('Next');
  await expect(r.middle).toBeEnabled();
  const undo = r.notice.getByRole('button', { name: 'Undo It’s happened', exact: true });
  await undo.click();
  await expect(r.note).toHaveAccessibleName('Wait for: a reply from Acme');
  // Since when is as it was: undone exactly.
  await r.handle.click();
  await expect(r.panel.getByTestId('go-where')).toContainText(`since ${SINCE}`);
  await page.keyboard.press('Escape');
  await r.next.click();
  await expect(r.words).toHaveText('Note the answer in the tracker');
});

test('J34-f: a wait that is the last step of a round carries the mark and the wait together', async ({ page }) => {
  await startGo(page, [{ id: 'r', routine: 'dough', at: 1, round: 2, status: 'running' }], 'runner', [
    { id: 'dough', name: 'Bake bread', repeatFrom: 0, steps: ['Fold the dough', { wait: 'the dough to rise' }] },
  ]);
  const r = runner(page);
  await expect(r.note).toHaveAttribute('data-kind', 'wait');
  await expect(r.screen.getByRole('img', { name: 'Last step of this round', exact: true })).toBeVisible();
  await expect(r.next).toHaveText('It’s happened');
  // Until I'm done: it comes round again, and the panel counts the round without a total.
  await r.next.click();
  await expect(r.words).toHaveText('Fold the dough');
  await r.handle.click();
  await expect(r.panel.getByTestId('go-where')).toContainText('Round 3');
  await expect(r.panel.getByTestId('go-where')).not.toContainText('Round 3 of');
});

test('J34-h: the same wait at 200 % (a 195×422 window stands in for it) — the note and the three buttons all fit', async ({ page }) => {
  await startGo(page, [{ id: 'r2', routine: 'apply-acme', at: 1, waitingDaysAgo: 9, status: 'running' }], 'runner');
  await page.setViewportSize({ width: 195, height: 422 });
  const r = runner(page);
  await expect(r.next).toBeInViewport();
  // The note has taken its new room (it is sized from it).
  await expect.poll(async () => (await r.note.boundingBox())!.width).toBeLessThan(170);
  for (const l of [r.note, r.pause, r.middle, r.next, r.done]) {
    const b = (await l.boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(195.5);
    expect(b.y + b.height).toBeLessThanOrEqual(422.5);
  }
  const words = (await r.words.boundingBox())!;
  const note = (await r.note.boundingBox())!;
  expect(words.x + words.width).toBeLessThanOrEqual(note.x + note.width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(195);
});

test('J36-a, J36-b, J36-c: a wait is written into a routine in the plain editor, among the steps; it can be reworded, moved and removed, each with Undo', async ({ page }) => {
  await startGo(page, []);
  await home(page).screen.getByRole('button', { name: 'More for Apply to Acme', exact: true }).click();
  const e = settled(page, 'editor');
  const items = () => e.getByTestId('go-edit-item').evaluateAll((els) => els.map((el) => `${(el as HTMLElement).dataset.kind}: ${el.querySelector('input,textarea') ? (el.querySelector('input,textarea') as HTMLInputElement).value : el.textContent}`));
  // (Polled: the rows are drawn a moment after the screen is.)
  await expect.poll(items).toEqual(['step: Send the application', 'wait: a reply from Acme', 'step: Note the answer in the tracker']);
  // Add a step, then a wait (the wait toggle is a pressed state, in words for a screen reader).
  const add = e.getByTestId('go-edit-add');
  await add.fill('Celebrate');
  await add.press('Enter');
  await expect(add).toHaveValue('');
  // The field keeps the focus: the next one can be typed at once.
  await expect(add).toBeFocused();
  await expect(e.getByTestId('go-notice')).toContainText('Added “Celebrate”');
  const asWait = e.getByRole('button', { name: 'Add it as a wait', exact: true });
  // In words, not an icon alone.
  await expect(asWait).toHaveText('A wait');
  await expect(asWait).toHaveAttribute('aria-pressed', 'false');
  await asWait.click();
  await expect(asWait).toHaveAttribute('aria-pressed', 'true');
  await expect(add).toHaveAccessibleName('Add a wait');
  await add.fill('the contract');
  await add.press('Enter');
  await expect.poll(items).toEqual(['step: Send the application', 'wait: a reply from Acme', 'step: Note the answer in the tracker', 'step: Celebrate', 'wait: the contract']);
  await expect(e.getByTestId('go-notice').getByRole('button', { name: 'Undo Change', exact: true })).toBeVisible();
  // Move, reword, remove.
  await e.getByRole('button', { name: 'Move the contract up', exact: true }).click();
  await expect.poll(items).toEqual(['step: Send the application', 'wait: a reply from Acme', 'step: Note the answer in the tracker', 'wait: the contract', 'step: Celebrate']);
  const words = e.getByRole('textbox', { name: 'Wait for: the contract', exact: true });
  await words.fill('the signed contract');
  await words.press('Enter');
  await expect(e.getByRole('textbox', { name: 'Wait for: the signed contract', exact: true })).toBeVisible();
  await e.getByRole('button', { name: 'Remove Celebrate', exact: true }).click();
  // The notice names what went, beside its Undo.
  await expect(e.getByTestId('go-notice')).toContainText('Removed “Celebrate”');
  await expect.poll(items).toEqual(['step: Send the application', 'wait: a reply from Acme', 'step: Note the answer in the tracker', 'wait: the signed contract']);
  await e.getByTestId('go-notice').getByRole('button', { name: 'Undo Change', exact: true }).click();
  await expect.poll(items).toEqual(['step: Send the application', 'wait: a reply from Acme', 'step: Note the answer in the tracker', 'wait: the signed contract', 'step: Celebrate']);
});

test('J36-f: See it all in a run — a wait added for this run only, with "Keep in <routine>"; running reaches it', async ({ page }) => {
  await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'running' }], 'runner');
  const r = runner(page);
  await r.context.click();
  const all = settled(page, 'all');
  await all.getByRole('button', { name: 'More for Tailor the CV', exact: true }).click();
  await page.getByTestId('go-all-menu').getByRole('button', { name: 'Add a wait after', exact: true }).click();
  const field = page.getByRole('textbox', { name: 'Add a wait after', exact: true });
  await expect(field).toBeFocused();
  await field.fill('feedback from Sam');
  await field.press('Enter');
  await expect(page.getByTestId('go-all-menu')).toHaveCount(0);
  const added = all.locator('[data-testid="go-all-row"][data-kind="wait"]');
  await expect(added).toContainText('feedback from Sam');
  await expect(added).toContainText('this run only');
  await expect(added).toHaveAttribute('data-mine', 'true');
  await all.getByRole('button', { name: 'More for feedback from Sam', exact: true }).click();
  await expect(page.getByTestId('go-all-menu').getByRole('button', { name: 'Keep in Apply to Initech', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await all.getByRole('button', { name: 'Back', exact: true }).click();
  await r.next.click();
  await expect(r.note).toHaveAccessibleName('Wait for: feedback from Sam');
  await expect(r.next).toHaveText('It’s happened');
});
