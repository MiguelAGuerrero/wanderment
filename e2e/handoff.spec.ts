import { AxeBuilder } from '@axe-core/playwright';
import { Page } from '@playwright/test';

import { expect, logBox, logLine, openHome, openSheet, test } from './fixtures';

/**
 * P-29 part B: a page holds the data only while it's visible. Headless Chromium keeps every page
 * visible, so hiding is emulated: the page's document reports the state, and the event fires.
 */
async function setVisibility(page: Page, state: 'hidden' | 'visible') {
  await page.evaluate((v) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => v === 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);
}

const anotherTab = (page: Page) => page.getByText(/^Wanderment is open in another tab or window\./);
const logButton = (page: Page) => page.getByRole('button', { name: 'Log', exact: true });
// Rework after the audit (F12): Log keeps its label and width; its name says it's reconnecting.
const reconnecting = (page: Page) => page.getByRole('button', { name: 'Log, reconnecting', exact: true });

async function seeActivity(page: Page, text: string) {
  await openSheet(page, 'Activities'); // P-58: a section of Home's sheet (was a tab)
  await expect(page.getByText(text, { exact: true })).toBeVisible();
  // P-83: stays on the sheet's Activities, whose log box the next steps use (was: back to Map's).
}

/**
 * Tries to open every file of expo-sqlite's OPFS pool from a throwaway worker in `page`, as
 * another copy of the app would. ok: nobody holds them.
 */
const takeFiles = (page: Page) =>
  page.evaluate(async () => {
    const src = `onmessage = async () => {
      try {
        const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('expo-sqlite');
        const handles = [];
        for await (const [, h] of dir) if (h.kind === 'file') handles.push(await h.createSyncAccessHandle());
        handles.forEach((h) => h.close());
        postMessage({ ok: true, files: handles.length });
      } catch (e) {
        postMessage({ ok: false, name: e.name });
      }
    }`;
    const worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    return await new Promise<{ ok: boolean; files?: number; name?: string }>((resolve) => {
      worker.onmessage = (e) => {
        worker.terminate();
        resolve(e.data);
      };
      worker.postMessage(null);
    });
  });

test('a hidden page lets a waiting one open by itself; shown again, it takes the data back with the other page’s changes and its draft (P-29)', async ({ page, context }) => {
  await openHome(page);
  await logLine(page, 'from A');
  await expect(page.getByText('Logged', { exact: true })).toBeVisible();

  const b = await context.newPage();
  await b.goto('./activities'); // P-83: Map is retired — the home's sheet on Activities (a log box)
  await expect(anotherTab(b)).toBeVisible({ timeout: 20_000 });
  await expect(b.getByText(/^Details: tab lock · /)).toBeVisible();
  // A reload would wipe this mark.
  await b.evaluate(() => ((window as unknown as { stillHere: boolean }).stillHere = true));

  // A typed line in A, not logged, comes through the hand-off.
  await logBox(page).fill('half-typed in A');
  await setVisibility(page, 'hidden');
  await expect(logBox(b)).toBeVisible({ timeout: 15_000 });
  expect(await b.evaluate(() => (window as unknown as { stillHere?: boolean }).stillHere)).toBe(true);
  await seeActivity(b, 'from A');
  // A doesn't hold the data now: its data stays, logging waits.
  await expect(reconnecting(page)).toBeVisible();
  await expect(page.getByText('Reconnecting…', { exact: true })).toBeVisible();
  await seeActivity(page, 'from A');

  await logLine(b, 'from B');
  await expect(b.getByText('Logged', { exact: true }).first()).toBeVisible();

  // Hand-back: B goes to the background, A comes forward.
  await setVisibility(b, 'hidden');
  await setVisibility(page, 'visible');
  await expect(logButton(page)).toBeEnabled({ timeout: 15_000 });
  await expect(logBox(page)).toHaveValue('half-typed in A');
  await seeActivity(page, 'from B');

  // Desktop rule: with A visible and holding, B shown again keeps its data with "Reconnecting…",
  // then waits with the "another tab" copy — A never lets go because B wants it.
  await setVisibility(b, 'visible');
  await expect(reconnecting(b)).toBeVisible();
  await expect(anotherTab(b)).toBeVisible({ timeout: 10_000 });
  await expect(logButton(page)).toBeEnabled();
  await logLine(page, 'A still writes');
  await expect(page.getByText('Logged', { exact: true }).first()).toBeVisible();
});

test('canary: hiding the page really frees the database files (the expo-sqlite worker shutdown), and showing it takes them back (P-29)', async ({ page, context }) => {
  const warnings: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'warning') warnings.push(m.text());
  });
  await openHome(page);
  await logLine(page, 'kept');
  await expect(page.getByText('Logged', { exact: true })).toBeVisible();

  // A same-origin page that isn't the app, to try the files from.
  const probe = await context.newPage();
  await probe.goto('./favicon.ico');
  expect(await takeFiles(probe)).toEqual({ ok: false, name: 'NoModificationAllowedError' });

  await setVisibility(page, 'hidden');
  await expect.poll(() => takeFiles(probe), { timeout: 10_000 }).toEqual({ ok: true, files: expect.any(Number) });
  expect((await takeFiles(probe)).files).toBeGreaterThan(0);

  await setVisibility(page, 'visible');
  await expect(logButton(page)).toBeVisible({ timeout: 15_000 });
  expect(await takeFiles(probe)).toEqual({ ok: false, name: 'NoModificationAllowedError' });
  await seeActivity(page, 'kept');
  // If Expo changes how it sets up its worker, the app says so (and the poll above times out).
  expect(warnings.filter((w) => /database worker/.test(w))).toEqual([]);
});

test('update reloads with another page in the background never lock the page out (P-29)', async ({ page, context, request }) => {
  // Notes (across reloads) if the waiting screen ever showed.
  await page.addInitScript(() => {
    new MutationObserver(() => {
      if (/open in another tab|still open somewhere else/.test(document.body?.innerText ?? '')) sessionStorage.setItem('sawWaiting', '1');
    }).observe(document, { subtree: true, childList: true, characterData: true });
  });
  await openHome(page);
  await page.waitForFunction(async () => !!(await navigator.serviceWorker.ready).active && !!navigator.serviceWorker.controller);

  // A second copy, sent to the background (an old tab).
  const second = await context.newPage();
  await second.goto('./activities'); // P-83: Map is retired — the home's sheet on Activities (a log box)
  await expect(anotherTab(second)).toBeVisible({ timeout: 20_000 });
  await setVisibility(second, 'hidden');
  // It hears each time the page lets go of the data ("released" pings).
  await second.evaluate(() =>
    window.addEventListener('storage', (e) => {
      const w = window as unknown as { releases?: number };
      if (e.key === 'wanderment:released' && e.newValue) w.releases = (w.releases ?? 0) + 1;
    }),
  );

  for (let i = 1; i <= 3; i++) {
    await logLine(page, `before update ${i}`);
    await expect(page.getByText('Logged', { exact: true })).toBeVisible();
    await request.post('/__e2e/bump-sw');
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());
    await expect(page.getByText('A new version is ready')).toBeVisible();
    await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: 'Reload to update' }).click()]);
    await expect(logBox(page)).toBeVisible({ timeout: 15_000 });
  }
  expect(await page.evaluate(() => sessionStorage.getItem('sawWaiting'))).toBeNull();
  // Each update reload let go of the data first (and waited for it), rather than racing its own files.
  expect(await second.evaluate(() => (window as unknown as { releases?: number }).releases)).toBe(3);
  await openSheet(page, 'Activities'); // P-58: a section of Home's sheet (was a tab)
  for (let i = 1; i <= 3; i++) await expect(page.getByText(`before update ${i}`, { exact: true })).toBeVisible();
});

// ───────── Rework after the audit: a page that doesn't hold the data can't change it ─────────

/** Two pages: A (`page`) holds the data, B waits; A goes to the background, so B takes it. */
async function handTo(page: Page, b: Page) {
  await b.goto('./activities'); // P-83: Map is retired — the home's sheet on Activities (a log box)
  await expect(anotherTab(b)).toBeVisible({ timeout: 20_000 });
  await setVisibility(page, 'hidden');
  await expect(logBox(b)).toBeVisible({ timeout: 15_000 });
}

test('the audit’s F1 with two real pages: the page that doesn’t hold the data refuses edits, so nothing is lost when the other writes and it reloads (P-29)', async ({ page, context }) => {
  await openHome(page);
  await logLine(page, 'alpha');
  await expect(page.getByText('Logged', { exact: true })).toBeVisible();
  await page.getByText('Tap for details').click();
  const b = await context.newPage();
  await handTo(page, b);

  // A doesn't hold the data now (as while it says "Reconnecting…" after coming back, which only
  // lasts a few seconds before the waiting screen covers it): its edits are refused.
  const note = page.getByRole('textbox', { name: 'Note' });
  await expect(note).toBeVisible();
  await expect(note).not.toBeEditable();
  await expect(page.getByText('Reconnecting…', { exact: true }).filter({ visible: true })).toBeVisible();
  // Delete is refused: the sheet stays; back on Home, one quiet note says why.
  await page.getByRole('button', { name: 'Delete activity (you can undo)' }).click();
  await expect(note).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByText('Just a moment — reconnecting.', { exact: true }).filter({ visible: true })).toBeVisible();
  // Nothing was written for B to overwrite.
  expect(await page.evaluate(() => localStorage.getItem('wanderment:journal'))).toBeNull();

  await logLine(b, 'beta');
  await expect(b.getByText('Logged', { exact: true }).first()).toBeVisible();
  // A comes back while B is visible and holds the data: it says why it waits; the person taps Reload.
  await setVisibility(page, 'visible');
  await expect(anotherTab(page)).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Reload', exact: true }).click();
  await expect(anotherTab(page)).toBeVisible({ timeout: 20_000 });
  await setVisibility(b, 'hidden');
  await expect(logBox(page)).toBeVisible({ timeout: 15_000 });
  await openSheet(page, 'Activities'); // P-58: a section of Home's sheet (was a tab)
  for (const text of ['alpha', 'beta']) await expect(page.getByText(text, { exact: true }).filter({ visible: true })).toHaveCount(1);
});

test('a save that keeps failing, then a tab switch and back: nothing vanishes, and it lands once saving works (audit 3 D1, P-29)', async ({ page }) => {
  // While window.failWrites is set, every write the database worker is asked for fails (like a full disk).
  await page.addInitScript(() => {
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (this: Worker, message: unknown, ...rest: unknown[]) {
      const m = message as { type?: string; data?: { source?: string } } | null;
      if ((window as unknown as { failWrites?: boolean }).failWrites && m?.type === 'prepare' && /^\s*(INSERT|DELETE|UPDATE)/i.test(m.data?.source ?? '')) {
        message = { ...m, data: { ...m.data, source: `FAIL ${m.data?.source}` } };
      }
      return (post as (...a: unknown[]) => void).call(this, message, ...rest);
    } as Worker['postMessage'];
  });
  await openHome(page);
  await logLine(page, 'alpha');
  await expect(page.getByText('Logged', { exact: true })).toBeVisible();
  await page.evaluate(() => ((window as unknown as { failWrites: boolean }).failWrites = true));
  await logLine(page, 'unsaved');
  const banner = page.getByText('Your last change couldn’t be saved. Export a backup from Settings to be safe.');
  await expect(banner).toBeVisible();

  await setVisibility(page, 'hidden');
  await expect(reconnecting(page)).toBeVisible();
  await setVisibility(page, 'visible');
  await expect(logButton(page)).toBeVisible({ timeout: 15_000 });
  // Still on screen, and still saying it isn't saved.
  await expect(page.getByText(/couldn’t be (saved|restored)/)).toBeVisible();
  await openSheet(page, 'Activities'); // P-58: a section of Home's sheet (was a tab)
  for (const text of ['alpha', 'unsaved']) await expect(page.getByText(text, { exact: true }).filter({ visible: true })).toHaveCount(1);

  // Saving works again: the next change carries it, and it survives a reload.
  await page.evaluate(() => ((window as unknown as { failWrites: boolean }).failWrites = false));
  const box = logBox(page).filter({ visible: true });
  await box.fill('later');
  await box.press('Enter');
  await expect(page.getByText(/couldn’t be (saved|restored)/)).toHaveCount(0);
  await page.reload();
  await openSheet(page, 'Activities'); // P-58: a section of Home's sheet (was a tab)
  for (const text of ['alpha', 'unsaved', 'later']) await expect(page.getByText(text, { exact: true }).filter({ visible: true })).toHaveCount(1, { timeout: 15_000 });
});

test('the activity sheet shows what another page changed once it takes the data back, and typing adds to that (audit 2 F2, P-29)', async ({ page, context }) => {
  await openHome(page);
  await logLine(page, 'alpha');
  await expect(page.getByText('Logged', { exact: true })).toBeVisible();
  await page.getByText('Tap for details').click();
  const title = page.getByRole('textbox', { name: 'What you did' });
  const note = page.getByRole('textbox', { name: 'Note' });
  // A was writing the note when it went to the background (the field keeps focus).
  await note.fill('from A');
  const b = await context.newPage();
  await handTo(page, b);

  // B edits the same activity.
  await openSheet(b, 'Activities'); // P-58: a section of Home's sheet (was a tab)
  await b.getByText('alpha', { exact: true }).filter({ visible: true }).click();
  await expect(b.getByRole('textbox', { name: 'Note' })).toHaveValue('from A');
  await b.getByRole('textbox', { name: 'Note' }).fill('from B');
  await b.getByRole('textbox', { name: 'What you did' }).fill('alpha, edited in B');

  // A comes back: its open sheet shows B's text and note, not what it had.
  await setVisibility(b, 'hidden');
  await setVisibility(page, 'visible');
  await expect(page.getByText('Saved automatically', { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(note).toHaveValue('from B');
  await expect(title).toHaveValue('alpha, edited in B');
  // Typing adds to B's note instead of replacing it with what A showed before.
  await note.focus();
  await note.press('End');
  await note.pressSequentially(' and A');
  await expect(note).toHaveValue('from B and A');

  // Saved that way: B, shown again, reads it.
  await setVisibility(page, 'hidden');
  await setVisibility(b, 'visible');
  await expect(b.getByText('Saved automatically', { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(b.getByRole('textbox', { name: 'Note' })).toHaveValue('from B and A');
  await expect(b.getByRole('textbox', { name: 'What you did' })).toHaveValue('alpha, edited in B');
});

test('a note ending in a space (as phone keyboards leave it) still shows another page’s edit once the data is back, so typing adds to it (audit 3 D2, P-29)', async ({ page, context }) => {
  await openHome(page);
  await logLine(page, 'alpha');
  await expect(page.getByText('Logged', { exact: true })).toBeVisible();
  await page.getByText('Tap for details').click();
  const note = page.getByRole('textbox', { name: 'Note' });
  await note.fill('went well ');
  const b = await context.newPage();
  await handTo(page, b);
  await openSheet(b, 'Activities'); // P-58: a section of Home's sheet (was a tab)
  await b.getByText('alpha', { exact: true }).filter({ visible: true }).click();
  await expect(b.getByRole('textbox', { name: 'Note' })).toHaveValue('went well');
  await b.getByRole('textbox', { name: 'Note' }).fill('B wrote a long careful note');

  await setVisibility(b, 'hidden');
  await setVisibility(page, 'visible');
  await expect(page.getByText('Saved automatically', { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(note).toHaveValue('B wrote a long careful note');
  await note.focus();
  await note.press('End');
  await note.pressSequentially(', and A');
  await setVisibility(page, 'hidden');
  await setVisibility(b, 'visible');
  await expect(b.getByText('Saved automatically', { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(b.getByRole('textbox', { name: 'Note' })).toHaveValue('B wrote a long careful note, and A');
});

test('a title emptied in one page doesn’t put back its old text over another page’s edit when it’s left (audit 3 D3, P-29)', async ({ page, context }) => {
  await openHome(page);
  await logLine(page, 'alpha');
  await expect(page.getByText('Logged', { exact: true })).toBeVisible();
  await page.getByText('Tap for details').click();
  const title = page.getByRole('textbox', { name: 'What you did' });
  await title.fill('');
  const b = await context.newPage();
  await handTo(page, b);
  await openSheet(b, 'Activities'); // P-58: a section of Home's sheet (was a tab)
  await b.getByText('alpha', { exact: true }).filter({ visible: true }).click();
  await b.getByRole('textbox', { name: 'What you did' }).fill('alpha, edited in B');

  await setVisibility(b, 'hidden');
  await setVisibility(page, 'visible');
  await expect(page.getByText('Saved automatically', { exact: true })).toBeVisible({ timeout: 15_000 });
  // Leaving the emptied title puts back what's saved now: B's edit.
  await page.getByRole('textbox', { name: 'Note' }).click();
  await expect(title).toHaveValue('alpha, edited in B');
  await setVisibility(page, 'hidden');
  await setVisibility(b, 'visible');
  await expect(b.getByText('Saved automatically', { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(b.getByRole('textbox', { name: 'What you did' })).toHaveValue('alpha, edited in B');
});

test('a title emptied key by key and left goes back to what it said before (P-29 D3 keeps this)', async ({ page }) => {
  await openHome(page);
  await logLine(page, 'alpha');
  await expect(page.getByText('Logged', { exact: true })).toBeVisible();
  await page.getByText('Tap for details').click();
  const title = page.getByRole('textbox', { name: 'What you did' });
  await title.focus();
  await title.press('End');
  for (let i = 0; i < 5; i++) await title.press('Backspace');
  await expect(title).toHaveValue('');
  await page.getByRole('textbox', { name: 'Note' }).click();
  await expect(title).toHaveValue('alpha');
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'What you did' })).toHaveValue('alpha', { timeout: 15_000 });
});

test.describe('without the service worker (the wasm comes from the network)', () => {
  test.use({ serviceWorkers: 'block' });

  /** From now on, taking the data back fails (the wasm is out of reach) until the result is called. */
  async function cutWasm(page: Page) {
    let reachable = false;
    await page.context().route(/\.wasm(\?|$)/, (route) => (reachable ? route.continue() : route.abort()));
    return () => (reachable = true);
  }
  const failedTry = (page: Page) => page.waitForEvent('console', (m) => m.type() === 'error' && m.text().startsWith('Aborted(NetworkError'));

  test('Return while reconnecting logs the line exactly once when the data is back, and Log keeps its width (P-29)', async ({ page }) => {
    await openHome(page);
    await logLine(page, 'first');
    await expect(page.getByText('Logged', { exact: true })).toBeVisible();
    await logBox(page).fill('x');
    const before = (await logButton(page).boundingBox())!;
    await logBox(page).fill('');
    await setVisibility(page, 'hidden');
    await expect(reconnecting(page)).toBeVisible();
    // Taking the data back keeps failing for now, so "Reconnecting…" lasts as long as this test needs.
    const restore = await cutWasm(page);
    const failed = failedTry(page);
    await setVisibility(page, 'visible');
    await failed;

    await logBox(page).fill('pressed while away');
    const during = (await reconnecting(page).boundingBox())!;
    expect(during.width).toBe(before.width);
    await logBox(page).press('Enter');
    await reconnecting(page).click();
    await expect(page.getByText('Reconnecting… it’ll log as soon as it’s back', { exact: true })).toBeVisible();
    await expect(logBox(page)).toHaveValue('pressed while away');

    restore();
    await expect(logBox(page)).toHaveValue('', { timeout: 15_000 });
    await expect(logButton(page)).toBeVisible();
    await openSheet(page, 'Activities'); // P-58: a section of Home's sheet (was a tab)
    await expect(page.getByText('pressed while away', { exact: true }).filter({ visible: true })).toHaveCount(1);
    // Saved once, too.
    await page.reload();
    await expect(page.getByText('pressed while away', { exact: true }).filter({ visible: true })).toHaveCount(1, { timeout: 15_000 });
  });

  test('taking the data back that keeps failing (the wasm stays out of reach) says so over the app, with Reload and the details, and still opens by itself once it can (audit 2 F1, P-29)', async ({ page }) => {
    test.setTimeout(90_000);
    await openHome(page);
    await logLine(page, 'kept');
    await expect(page.getByText('Logged', { exact: true })).toBeVisible();
    await setVisibility(page, 'hidden');
    await expect(reconnecting(page)).toBeVisible();
    const restore = await cutWasm(page);
    const failed = failedTry(page);
    await setVisibility(page, 'visible');
    await failed;
    // Return pressed meanwhile is remembered, and stays remembered under the waiting screen.
    await logBox(page).fill('pressed while it fails');
    await logBox(page).press('Enter');
    await expect(page.getByText('Reconnecting… it’ll log as soon as it’s back', { exact: true })).toBeVisible();

    // Not an endless "Reconnecting…": the waiting screen comes up over the app, saying what failed.
    const message = page.getByText(/^Wanderment can’t open its data right now\./);
    await expect(message).toBeVisible({ timeout: 40_000 });
    await expect(message).toBeFocused();
    await expect(page.getByRole('button', { name: 'Reload', exact: true })).toBeVisible();
    const details = page.getByText(/^Details: \w[\w ]* · \S/);
    await expect(details).toBeVisible();
    // A browser's own words can run long: the line is cut to about 160 characters.
    expect([...((await details.textContent()) ?? '')].length).toBeLessThanOrEqual(160);
    // …and wraps inside the screen, even one long unbroken word (a URL) (audit 3 U3).
    const box = (await details.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);

    // It keeps trying behind it, and opens by itself once the wasm is back; the remembered line logs once.
    restore();
    await expect(message).toHaveCount(0, { timeout: 15_000 });
    await expect(logButton(page)).toBeVisible();
    await expect(logBox(page)).toHaveValue('');
    await openSheet(page, 'Activities'); // P-58: a section of Home's sheet (was a tab)
    await expect(page.getByText('pressed while it fails', { exact: true }).filter({ visible: true })).toHaveCount(1);
    await expect(page.getByText('kept', { exact: true }).filter({ visible: true })).toHaveCount(1);
  });

  test('tapping a search result while reconnecting just opens it: remembering the search isn’t a refused change (audit 2 F3, P-29)', async ({ page }) => {
    await openHome(page);
    await logLine(page, 'watered the plants');
    await expect(page.getByText('Logged', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Search' }).click();
    const search = page.getByRole('textbox', { name: 'Search' });
    await setVisibility(page, 'hidden');
    const restore = await cutWasm(page);
    const failed = failedTry(page);
    await setVisibility(page, 'visible');
    await failed;
    await search.fill('plants');
    await search.press('Enter');
    await page.getByText('watered the plants', { exact: true }).filter({ visible: true }).click();
    await expect(page.getByRole('textbox', { name: 'Note' })).toBeVisible();
    await expect(page.getByText('Just a moment — reconnecting.', { exact: true })).toHaveCount(0);
    restore();
  });

  test('a transient failure taking the data back (the wasm out of reach for a try) recovers by itself, with the data shown and the draft kept (P-29)', async ({ page }) => {
    await openHome(page);
    await logLine(page, 'kept');
    await expect(page.getByText('Logged', { exact: true })).toBeVisible();
    await logBox(page).fill('a draft');
    await setVisibility(page, 'hidden');
    await expect(reconnecting(page)).toBeVisible();
    // The worker shut down, so taking the data back loads the wasm again: make that fail for now.
    // (expo-sqlite retries the fetch itself, so a single failed request isn't enough.)
    const restore = await cutWasm(page);
    const failed = failedTry(page);
    await setVisibility(page, 'visible');
    await failed;
    // The data and the draft stay on screen meanwhile.
    await expect(reconnecting(page)).toBeVisible();
    await expect(logBox(page)).toHaveValue('a draft');
    restore();
    await expect(logButton(page)).toBeVisible({ timeout: 15_000 });
    await expect(logBox(page)).toHaveValue('a draft');
    await seeActivity(page, 'kept');
  });
});

test('the waiting screen is drawn over the app: the open sheet, the route and focus survive it (P-29)', async ({ page, context }) => {
  await openHome(page);
  await logLine(page, 'alpha');
  await expect(page.getByText('Logged', { exact: true })).toBeVisible();
  await page.getByText('Tap for details').click();
  const note = page.getByRole('textbox', { name: 'Note' });
  await note.focus();
  const url = page.url();
  const b = await context.newPage();
  await handTo(page, b);

  await setVisibility(page, 'visible');
  await expect(anotherTab(page)).toBeVisible({ timeout: 10_000 });
  await expect(anotherTab(page)).toBeFocused();
  expect(page.url()).toBe(url);
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);

  await setVisibility(b, 'hidden');
  await expect(anotherTab(page)).toHaveCount(0, { timeout: 15_000 });
  expect(page.url()).toBe(url);
  await expect(note).toBeVisible();
  await expect(note).toBeFocused();
});

test('an update reload while a second window is visible and waiting hands the data to that window; the reloaded one waits, saying so, and keeps its draft (documented edge case, P-29)', async ({ page, context, request }) => {
  await openHome(page);
  await page.waitForFunction(async () => !!(await navigator.serviceWorker.ready).active && !!navigator.serviceWorker.controller);
  await logLine(page, 'before update');
  await expect(page.getByText('Logged', { exact: true })).toBeVisible();
  const second = await context.newPage();
  await second.goto('./activities'); // P-83: Map is retired — the home's sheet on Activities (a log box)
  await expect(anotherTab(second)).toBeVisible({ timeout: 20_000 });

  await logBox(page).fill('typed before the update');
  await request.post('/__e2e/bump-sw');
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());
  await expect(page.getByText('A new version is ready')).toBeVisible();
  await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: 'Reload to update' }).click()]);
  // The waiting window was next in line, so it has the data now; the updated one says why it waits.
  await expect(logBox(second)).toBeVisible({ timeout: 15_000 });
  await expect(anotherTab(page)).toBeVisible({ timeout: 15_000 });
  await seeActivity(second, 'before update');
  // Never a dead end: once that window is in the background, this one opens by itself.
  await setVisibility(second, 'hidden');
  await expect(logBox(page)).toHaveValue('typed before the update', { timeout: 15_000 });
  await seeActivity(page, 'before update');
});

test('another worker that also gets a “configure” message isn’t taken for expo-sqlite’s: hiding still frees the files (audit F15, P-29)', async ({ page, context }) => {
  await openHome(page);
  await logLine(page, 'kept');
  await expect(page.getByText('Logged', { exact: true })).toBeVisible();
  await page.evaluate(() => new Worker(URL.createObjectURL(new Blob(['onmessage = () => {}'], { type: 'text/javascript' }))).postMessage({ type: 'configure' }));
  // Once more around, so the next open would pick up a wrongly captured worker.
  await setVisibility(page, 'hidden');
  await expect(reconnecting(page)).toBeVisible();
  await setVisibility(page, 'visible');
  await expect(logButton(page)).toBeVisible({ timeout: 15_000 });

  const probe = await context.newPage();
  await probe.goto('./favicon.ico');
  expect(await takeFiles(probe)).toEqual({ ok: false, name: 'NoModificationAllowedError' });
  await setVisibility(page, 'hidden');
  await expect.poll(() => takeFiles(probe), { timeout: 10_000 }).toEqual({ ok: true, files: expect.any(Number) });
});

test('a page that starts in the background says it’s opening (not a blank page), and opens once shown (P-29)', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  });
  await page.goto('./activities'); // P-83: Map is retired — the home's sheet on Activities (a log box)
  await expect(page.getByText('Opening…', { exact: true })).toBeVisible();
  await setVisibility(page, 'visible');
  await expect(logBox(page)).toBeVisible({ timeout: 15_000 });
});
