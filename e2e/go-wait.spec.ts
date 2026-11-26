/**
 * P-86 (B-11 slice 1), P-90: plain wait steps (B-11 §3.1, §3.3; J34, J36). A wait is a step: reaching
 * it means everything before it is done. The note is outlined with the wait mark, Next reads "It's
 * happened", the middle slot is Plan as on any step; a run resting on one reads as waiting — its
 * tile "waiting for <words> · since <day>" — never as abandoned. A wait is made in Plan ("Make it a
 * wait"), where it is reworded, moved and removed. (P-96: the paused screen, titled "Waiting" with its
 * own "It's happened", is gone — Pause goes home; J34-c and J34-e are rewritten below.)
 */
import { expect, test } from './fixtures';
import { addStep, expectSteps, home, place, plan, planMenu, planType, runner, startGo, tile, sinceDate } from './goFixture';

/** A wait seeded nine days ago reads its date (within the last week it would be a day's name). */
const SINCE = sinceDate(9);

test('J34-a: the runner on a wait step — the outlined note with the wait mark, "It’s happened" in Next’s place, Plan in the middle slot as on any step', async ({ page }) => {
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
  // Plan is there on a wait too (it is where a wait is reworded, or made a step again): never dimmed.
  await expect(r.middle).toBeEnabled();
  await expect(r.middle).toHaveText('Plan');
  expect(await r.middle.evaluate((e) => getComputedStyle(e).borderTopStyle)).toBe('solid');
  await expect(r.pause).toBeEnabled();
});

test('J34-b: the panel on a wait says what it is waiting for and since when, in words', async ({ page }) => {
  await startGo(page, [{ id: 'r2', routine: 'apply-acme', at: 1, waitingDaysAgo: 9, status: 'running' }], 'runner');
  const r = runner(page);
  await r.handle.click();
  const where = r.panel.getByTestId('go-where');
  await expect(where).toContainText(`waiting for a reply from Acme · since ${SINCE}`);
  await expect(where).toContainText('then: Note the answer in the tracker');
  // A wait's words are changed like a step's: in Plan, not here.
  await expect(r.panel.getByRole('button', { name: 'Change the words', exact: true })).toHaveCount(0);
  await r.middle.click();
  await planMenu(page, 'a reply from Acme', 'Change the words');
  await expect(plan(page).typed).toHaveAccessibleName('Wait for: a reply from Acme');
  await planType(page, 'a reply from Acme HR');
  await plan(page).forward.click();
  await expect(r.note).toHaveAccessibleName('Wait for: a reply from Acme HR');
});

test('J34-c, J34-d (P-96; was: the paused screen titled "Waiting"): leaving it — Pause goes home; its tile reads "waiting for … · since …", first, and Resume returns to the wait note', async ({ page }) => {
  await startGo(page, [{ id: 'r2', routine: 'apply-acme', at: 1, waitingDaysAgo: 9, status: 'running' }], 'runner');
  await runner(page).pause.click();
  const h = home(page);
  const t = tile(page, 'Apply to Acme');
  await expect(h.tiles.first()).toContainText('Apply to Acme');
  await expect(t).toHaveAttribute('data-state', 'waiting');
  await expect(t.getByTestId('go-tile-line')).toHaveText(`waiting for a reply from Acme · since ${SINCE}`);
  await expect(t).toHaveAccessibleName(`Apply to Acme, waiting for a reply from Acme · since ${SINCE}`);
  await expect(h.resume).toHaveText('Resume Apply to Acme');
  // Resume returns to the wait note, still waiting since then; "It's happened" is there.
  await h.resume.click();
  await expect(runner(page).note).toHaveAccessibleName('Wait for: a reply from Acme');
  await expect(runner(page).next).toHaveText('It’s happened');
});

test('J34-e: back again — saying it has happened goes on to the next step (P-95: with no Undo and no notice), resumed from home (P-96; was: from Waiting) and from the runner', async ({ page }) => {
  await startGo(page, [{ id: 'r2', routine: 'apply-acme', at: 1, waitingDaysAgo: 9, status: 'paused' }], 'home');
  await home(page).resume.click();
  const r = runner(page);
  await r.screen.getByRole('button', { name: 'It’s happened: a reply from Acme', exact: true }).click();
  await expect(r.words).toHaveText('Note the answer in the tracker');
  await expect(r.note).toHaveAttribute('data-kind', 'step');
  // (P-96, ruling 7: the last step of the run — Next reads Done there.)
  await expect(r.next).toHaveText('Done');
  await expect(r.middle).toBeEnabled();
  await expect(r.notice).toHaveCount(0);
  await expect(r.screen.getByRole('button', { name: /^Undo/ })).toHaveCount(0);
  // From the runner: the same.
  await startGo(page, [{ id: 'r2', routine: 'apply-acme', at: 1, waitingDaysAgo: 9, status: 'running' }], 'runner');
  await expect(r.note).toHaveAccessibleName('Wait for: a reply from Acme');
  await r.handle.click();
  await expect(r.panel.getByTestId('go-where')).toContainText(`since ${SINCE}`);
  await page.keyboard.press('Escape');
  await r.next.click();
  await expect(r.words).toHaveText('Note the answer in the tracker');
  await expect(r.notice).toHaveCount(0);
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
  for (const l of [r.note, r.pause, r.middle, r.next]) {
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

test('J36-a, J36-b, J36-c: a wait is written into a routine in Plan, among the steps; it can be reworded, moved and removed, each with Undo', async ({ page }) => {
  await startGo(page, []);
  await home(page).screen.getByRole('button', { name: 'Plan Apply to Acme', exact: true }).click();
  const p = plan(page);
  await expectSteps(page, ['Send the application', 'Wait for a reply from Acme', 'Note the answer in the tracker']);
  await expect(p.row('a reply from Acme')).toHaveAttribute('data-kind', 'wait');
  await expect(p.row('a reply from Acme')).toHaveAccessibleName('Wait for: a reply from Acme');
  // Add a step, then another made a wait (in words, from its menu).
  await addStep(page, 'Celebrate');
  await expect(p.add).toBeFocused();
  await expect(p.notice).toContainText('Added “Celebrate”');
  await addStep(page, 'the contract');
  await planMenu(page, 'the contract', 'Make it a wait');
  await expectSteps(page, ['Send the application', 'Wait for a reply from Acme', 'Note the answer in the tracker', 'Celebrate', 'Wait for the contract']);
  await expect(p.notice).toContainText('Made “the contract” a wait');
  await expect(p.notice.getByRole('button', { name: 'Undo Change', exact: true })).toBeVisible();
  // Move, reword, remove.
  await planMenu(page, 'the contract', 'Move up');
  await expectSteps(page, ['Send the application', 'Wait for a reply from Acme', 'Note the answer in the tracker', 'Wait for the contract', 'Celebrate']);
  await planMenu(page, 'the contract', 'Change the words');
  await expect(p.typed).toHaveAccessibleName('Wait for: the contract');
  await planType(page, 'the signed contract');
  await expect(p.row('the signed contract')).toHaveAttribute('data-kind', 'wait');
  await planMenu(page, 'Celebrate', 'Remove this step');
  // The notice names what went, beside its Undo.
  await expect(p.notice).toContainText('Removed “Celebrate”');
  await expectSteps(page, ['Send the application', 'Wait for a reply from Acme', 'Note the answer in the tracker', 'Wait for the signed contract']);
  await p.notice.getByRole('button', { name: 'Undo Change', exact: true }).click();
  await expectSteps(page, ['Send the application', 'Wait for a reply from Acme', 'Note the answer in the tracker', 'Wait for the signed contract', 'Celebrate']);
});

test('J36-f: a wait made in Plan in the middle of a run is the routine’s; running reaches it', async ({ page }) => {
  await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'running' }], 'runner');
  const r = runner(page);
  await r.middle.click();
  const p = plan(page);
  await planMenu(page, 'Tailor the CV', 'Add a step after');
  await planType(page, 'feedback from Sam');
  await page.keyboard.press('Escape');
  await planMenu(page, 'feedback from Sam', 'Make it a wait');
  await expect(p.row('feedback from Sam')).toHaveAttribute('data-kind', 'wait');
  // Nothing says "this run only": it is the routine's.
  await expect(p.screen.getByText(/this run only/i)).toHaveCount(0);
  await expect(p.forward).toHaveText('Resume at Tailor the CV');
  await p.forward.click();
  await r.next.click();
  await expect(r.note).toHaveAccessibleName('Wait for: feedback from Sam');
  await expect(r.next).toHaveText('It’s happened');
});
