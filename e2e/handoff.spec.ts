import { AxeBuilder } from '@axe-core/playwright';
import { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { addStep, anotherTab, arrived, exported, home, plan, RoutineSpec, runner, saved, setVisibility, settled, startGo, turn, typeValue } from './goFixture';

/**
 * P-29 part B: a page holds the data only while it's visible. Headless Chromium keeps every page
 * visible, so hiding is emulated (`setVisibility`): the page's document reports the state, and the
 * event fires. With one page in play `setVisibility` waits until it has let go; with two, `turn`
 * (the other page takes the lock at once), and the wait is on what a page then shows.
 * P-89, P-90: driven through the app there is now — a run at the edge of its goal (it is in Plan: the
 * next step is typed in Plan's open row), a pause's reason (a field that saves as you type) and a
 * routine's name (changed in place in its Plan).
 */

/** A run at the edge of its goal (it opens in Plan, on the open row): words can be typed there. */
const AT_EDGE = [{ id: 'r4', routine: 'spanish-es', at: null, status: 'running' as const }];
/** P-96: the field that saves as you type is now a value's, on the runner's giving step (the paused screen and its reason are gone). */
const GIVING: RoutineSpec[] = [{ id: 'give', name: 'Wrap a present', steps: [{ text: 'Choose the gift', gives: 'gift' }, 'Wrap {gift}'] }];
const ON_GIVING = [{ id: 'g1', routine: 'give', at: 0, status: 'running' as const }];
const NOTE = 'Just a moment — reconnecting.';

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

/** The steps of the seeded "Feel at home in Spanish" as stored now. */
const spanishSteps = async (page: Page) => ((await exported(page)).routines['spanish-es'].items ?? []).map((i) => i.text);

/** Opens a routine's Plan from its tile on the home, and "Change the name": gives the field its name is typed in, in place. */
async function nameOf(page: Page, name: string) {
  await home(page).screen.getByRole('button', { name: `Plan ${name}`, exact: true }).click();
  await plan(page).more(name).click();
  await (await arrived(page, 'go-plan-routine')).getByRole('menuitem', { name: 'Change the name', exact: true }).click();
  const field = plan(page).typed;
  await expect(field).toHaveValue(name);
  return field;
}

test('a hidden page lets a waiting one open by itself; shown again, it takes the data back with the other page’s changes and the words typed before (P-29)', async ({ page, context }) => {
  await startGo(page, AT_EDGE, 'plan');

  const b = await context.newPage();
  await b.goto('./go');
  await expect(anotherTab(b)).toBeVisible({ timeout: 20_000 });
  await expect(b.getByText(/^Details: tab lock · /)).toBeVisible();
  // A reload would wipe this mark.
  await b.evaluate(() => ((window as unknown as { stillHere: boolean }).stillHere = true));

  // Words typed in A, not entered, come through the hand-off.
  await plan(page).add.fill('half-typed in A');
  await turn(page, 'hidden');
  // B opens by itself, where A left off: the run, in Plan.
  await expect(plan(b).add).toBeVisible({ timeout: 15_000 });
  expect(await b.evaluate(() => (window as unknown as { stillHere?: boolean }).stillHere)).toBe(true);
  // A doesn't hold the data now: what it shows stays, and a press is refused, saying why.
  await plan(page).add.press('Enter');
  await expect(plan(page).notice).toHaveText(NOTE);
  await expect(plan(page).add).toHaveValue('half-typed in A');

  // B changes something else: another routine's name.
  await b.goBack();
  const name = await nameOf(b, 'Practise drawing');
  await name.fill('Practise drawing daily');
  await name.press('Enter');
  await saved(b);

  // Hand-back: B goes to the background, A comes forward.
  await setVisibility(b, 'hidden');
  await turn(page, 'visible');
  await expect(plan(page).add).toHaveValue('half-typed in A');
  // Once the data is back (a moment after the page is shown), Return enters it.
  await expect(async () => {
    await plan(page).add.press('Enter', { timeout: 1000 });
    await expect(plan(page).row('half-typed in A')).toHaveCount(1, { timeout: 1000 });
  }).toPass({ timeout: 15_000 });
  await saved(page);

  // Desktop rule: with A visible and holding, B shown again waits with the "another tab" copy —
  // A never lets go because B wants it.
  await turn(b, 'visible');
  await expect(anotherTab(b)).toBeVisible({ timeout: 10_000 });
  await addStep(page, 'and one more');
  await saved(page);
  // And A shows what B changed.
  await page.goBack();
  await expect(home(page).tiles.filter({ hasText: 'Practise drawing daily' })).toHaveCount(1);
  // (B to the background first: opening Settings by its address loads the page, and a visible, waiting B would take the data.)
  await turn(b, 'hidden');
  expect(await spanishSteps(page)).toEqual(['half-typed in A', 'and one more']);
});

test('canary: hiding the page really frees the database files (the expo-sqlite worker shutdown), and showing it takes them back (P-29)', async ({ page, context }) => {
  const warnings: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'warning') warnings.push(m.text());
  });
  await startGo(page, AT_EDGE, 'plan');
  await addStep(page, 'kept');
  await saved(page);

  // A same-origin page that isn't the app, to try the files from.
  const probe = await context.newPage();
  await probe.goto('./favicon.ico');
  expect(await takeFiles(probe)).toEqual({ ok: false, name: 'NoModificationAllowedError' });

  await setVisibility(page, 'hidden');
  await expect.poll(() => takeFiles(probe), { timeout: 10_000 }).toEqual({ ok: true, files: expect.any(Number) });
  expect((await takeFiles(probe)).files).toBeGreaterThan(0);

  await setVisibility(page, 'visible');
  await expect.poll(() => takeFiles(probe), { timeout: 15_000 }).toEqual({ ok: false, name: 'NoModificationAllowedError' });
  await expect(plan(page).row('kept')).toHaveCount(1);
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
  await startGo(page, AT_EDGE, 'plan');
  await page.waitForFunction(async () => !!(await navigator.serviceWorker.ready).active && !!navigator.serviceWorker.controller);

  // A second copy, sent to the background (an old tab).
  const second = await context.newPage();
  await second.goto('./go');
  await expect(anotherTab(second)).toBeVisible({ timeout: 20_000 });
  await turn(second, 'hidden');
  // It hears each time the page lets go of the data ("released" pings).
  await second.evaluate(() =>
    window.addEventListener('storage', (e) => {
      const w = window as unknown as { releases?: number };
      if (e.key === 'wanderment:released' && e.newValue) w.releases = (w.releases ?? 0) + 1;
    }),
  );

  for (let i = 1; i <= 3; i++) {
    await addStep(page, `before update ${i}`);
    await saved(page);
    await request.post('/__e2e/bump-sw');
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());
    await expect(page.getByText('A new version is ready')).toBeVisible();
    await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: /^Update now/ }).click()]);
    await expect(plan(page).add).toBeVisible({ timeout: 15_000 });
  }
  expect(await page.evaluate(() => sessionStorage.getItem('sawWaiting'))).toBeNull();
  // Each update reload let go of the data first (and waited for it), rather than racing its own files.
  expect(await second.evaluate(() => (window as unknown as { releases?: number }).releases)).toBe(3);
  expect(await spanishSteps(page)).toEqual(['before update 1', 'before update 2', 'before update 3']);
});

// ───────── Rework after the audit: a page that doesn't hold the data can't change it ─────────

/** Two pages: A (`page`) holds the data, B waits; A goes to the background, so B takes it and opens where A left off. */
async function handTo(page: Page, b: Page, lands: 'home' | 'runner' | 'plan') {
  await b.goto('./go');
  await expect(anotherTab(b)).toBeVisible({ timeout: 20_000 });
  await turn(page, 'hidden');
  await expect(settled(b, lands)).toBeVisible({ timeout: 15_000 });
}

test('the audit’s F1 with two real pages: the page that doesn’t hold the data refuses changes, so nothing is lost when the other writes and it reloads (P-29)', async ({ page, context }) => {
  await startGo(page, AT_EDGE, 'plan');
  const b = await context.newPage();
  await handTo(page, b, 'plan');

  // A doesn't hold the data now (as while it is "reconnecting" after coming back, which only lasts a
  // few seconds before the waiting screen covers it): its change is refused, with one quiet note.
  await plan(page).add.fill('refused in A');
  await plan(page).add.press('Enter');
  await expect(plan(page).notice).toHaveText(NOTE);
  await expect(plan(page).add).toHaveValue('refused in A');
  // Nothing was written for B to overwrite.
  expect(await page.evaluate(() => localStorage.getItem('wanderment:journal'))).toBeNull();

  await addStep(b, 'beta');
  await saved(b);
  // A comes back while B is visible and holds the data: it says why it waits; the person taps Reload.
  await turn(page, 'visible');
  await expect(anotherTab(page)).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Reload', exact: true }).click();
  await expect(anotherTab(page)).toBeVisible({ timeout: 20_000 });
  await turn(b, 'hidden');
  await expect(plan(page).row('beta')).toHaveCount(1, { timeout: 15_000 });
  expect(await spanishSteps(page)).toEqual(['beta']);
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
  await startGo(page, AT_EDGE, 'plan');
  const p = plan(page);
  await addStep(page, 'alpha');
  await saved(page);
  await page.evaluate(() => ((window as unknown as { failWrites: boolean }).failWrites = true));
  await addStep(page, 'unsaved');
  const banner = page.getByText('Your last change couldn’t be saved. Export a backup from Settings to be safe.');
  await expect(banner).toBeVisible();

  await setVisibility(page, 'hidden');
  await setVisibility(page, 'visible');
  // Still on screen, and still saying it isn't saved.
  await expect(page.getByText(/couldn’t be (saved|restored)/)).toBeVisible();
  await expect(p.row('unsaved')).toHaveCount(1);

  // Saving works again: the next change carries it, and it survives a reload.
  await page.evaluate(() => ((window as unknown as { failWrites: boolean }).failWrites = false));
  await expect(async () => {
    await p.add.fill('saved again');
    await p.add.press('Enter', { timeout: 1000 });
    await expect(p.row('saved again')).toHaveCount(1, { timeout: 1000 });
  }).toPass({ timeout: 15_000 });
  await expect(page.getByText(/couldn’t be (saved|restored)/)).toHaveCount(0);
  await page.reload();
  await expect(plan(page).add).toBeVisible({ timeout: 15_000 });
  expect(await spanishSteps(page)).toEqual(['alpha', 'unsaved', 'saved again']);
});

// P-101 (ruling 7): a value is no longer a field that saves as you type — it is typed in its own sheet and
// kept with Keep. (Was: two tests of a field saving keystroke by keystroke, audit 2 F2 and audit 3 D2: no
// such field is left on the runner.) What stays to prove: a value kept in one page is what the other shows,
// and what its sheet opens with, once it takes the data back — and a value ending in a space too.
test('a value kept in one page (P-101: from its sheet; was: a field that saves as you type) is what the other shows once it takes the data back, and its sheet opens with it (audit 2 F2, P-29)', async ({ page, context }) => {
  await startGo(page, ON_GIVING, 'runner', GIVING);
  await typeValue(page, 'gift', 'from A');
  await saved(page);
  const b = await context.newPage();
  await handTo(page, b, 'runner');

  // B changes the same value.
  await expect(runner(b).field('gift')).toHaveAccessibleName('gift: from A');
  await typeValue(b, 'gift', 'from B');
  await saved(b);

  // A comes back: its field reads B's words; its sheet opens with them, and adding to them keeps both.
  await setVisibility(b, 'hidden');
  await turn(page, 'visible');
  await expect(runner(page).field('gift')).toHaveAccessibleName('gift: from B', { timeout: 15_000 });
  await runner(page).field('gift').click();
  const sheet = await arrived(page, 'go-entry-sheet');
  const field = sheet.getByTestId('go-entry-field');
  await expect(field).toHaveValue('from B');
  await field.press('End');
  await field.pressSequentially(' and A');
  await sheet.getByTestId('go-entry-keep').click();
  await saved(page);

  // Saved that way: B, shown again, reads it.
  await setVisibility(page, 'hidden');
  await turn(b, 'visible');
  await expect(runner(b).field('gift')).toHaveAccessibleName('gift: from B and A', { timeout: 15_000 });
});

test('a value ending in a space (as phone keyboards leave it) is kept as given and read by the other page (audit 3 D2, P-29; P-101: from its sheet)', async ({ page, context }) => {
  await startGo(page, ON_GIVING, 'runner', GIVING);
  await typeValue(page, 'gift', 'went well ');
  await saved(page);
  const b = await context.newPage();
  await handTo(page, b, 'runner');
  await expect(runner(b).field('gift')).toHaveAccessibleName(/^gift: went well ?$/);
  await runner(b).field('gift').click();
  await expect((await arrived(b, 'go-entry-sheet')).getByTestId('go-entry-field')).toHaveValue(/^went well ?$/);
});

test('a name emptied in one page doesn’t put back its old text over another page’s edit when it’s left (audit 3 D3, P-29)', async ({ page, context }) => {
  await startGo(page, []);
  const name = await nameOf(page, 'Practise drawing');
  await name.fill('');
  const b = await context.newPage();
  await handTo(page, b, 'home');
  const there = await nameOf(b, 'Practise drawing');
  await there.fill('Practise drawing, edited in B');
  await there.press('Enter');
  await expect(plan(b).title).toHaveText('Practise drawing, edited in B');
  await saved(b);

  await setVisibility(b, 'hidden');
  await turn(page, 'visible');
  // The emptied field is still empty, and still the one being typed in.
  await expect(name).toHaveValue('');
  // Leaving the emptied name changes nothing: the name is what's saved now — B's edit — once the data is back.
  await plan(page).add.click();
  await expect(name).toHaveCount(0);
  await expect(plan(page).title).toHaveText('Practise drawing, edited in B', { timeout: 15_000 });
  await saved(page);
  await setVisibility(page, 'hidden');
  await turn(b, 'visible');
  await expect(plan(b).title).toHaveText('Practise drawing, edited in B');
  expect(Object.values((await exported(b)).routines).map((r) => r.words)).toContain('Practise drawing, edited in B');
});

test('a name emptied key by key and left goes back to what it said before (P-29 D3 keeps this)', async ({ page }) => {
  await startGo(page, []);
  const name = await nameOf(page, 'Apply to Acme');
  await name.focus();
  await name.press('End');
  for (let i = 0; i < 'Apply to Acme'.length; i++) await name.press('Backspace');
  await expect(name).toHaveValue('');
  await plan(page).add.click();
  await expect(plan(page).title).toHaveText('Apply to Acme');
  await page.reload();
  await expect(plan(page).title).toHaveText('Apply to Acme', { timeout: 15_000 });
  expect(Object.values((await exported(page)).routines).map((r) => r.words)).toContain('Apply to Acme');
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

  test('taking the data back that keeps failing (the wasm stays out of reach) says so over the app, with Reload and the details, and still opens by itself once it can; a press made meanwhile is applied once (audit 2 F1, P-29)', async ({ page }) => {
    test.setTimeout(90_000);
    await startGo(page, [{ id: 'r1', routine: 'apply', at: 0, status: 'running' }], 'runner');
    const r = runner(page);
    await expect(r.words).toHaveText('Read the job ad twice');
    await setVisibility(page, 'hidden');
    const restore = await cutWasm(page);
    const failed = failedTry(page);
    await setVisibility(page, 'visible');
    await failed;
    // Next pressed meanwhile is kept, and stays kept under the waiting screen.
    await r.next.click();
    await expect(r.screen.getByTestId('go-notice')).toHaveText(NOTE);
    await expect(r.words).toHaveText('Read the job ad twice');

    // Not an endless wait: the waiting screen comes up over the app, saying what failed.
    const message = page.getByText(/^The app can’t open its data right now\./);
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

    // It keeps trying behind it, and opens by itself once the wasm is back; the kept press is applied once.
    restore();
    await expect(message).toHaveCount(0, { timeout: 15_000 });
    await expect(r.words).toHaveText('Tailor the CV');
    await saved(page);
    expect((await exported(page)).runs.r1).toMatchObject({ frames: [{ seq: 'apply', at: 'apply-1', round: 1 }] });
  });

  test('a transient failure taking the data back (the wasm out of reach for a try) recovers by itself, with the data shown and typed words kept (P-29)', async ({ page }) => {
    await startGo(page, AT_EDGE, 'plan');
    const p = plan(page);
    await p.add.fill('a draft');
    await setVisibility(page, 'hidden');
    // The worker shut down, so taking the data back loads the wasm again: make that fail for now.
    // (expo-sqlite retries the fetch itself, so a single failed request isn't enough.)
    const restore = await cutWasm(page);
    const failed = failedTry(page);
    await setVisibility(page, 'visible');
    await failed;
    // The data and the typed words stay on screen meanwhile.
    await expect(p.screen).toBeVisible();
    await expect(p.add).toHaveValue('a draft');
    restore();
    await expect(p.add).toHaveValue('a draft');
    // Once the data is back, Return enters it.
    await expect(async () => {
      await p.add.press('Enter', { timeout: 1000 });
      await expect(p.row('a draft')).toHaveCount(1, { timeout: 1000 });
    }).toPass({ timeout: 15_000 });
  });
});

test('the waiting screen is drawn over the app: the screen beneath, the route and focus survive it (P-29)', async ({ page, context }) => {
  // (P-96: the field is a value's on the runner; was the paused screen's reason. P-101: in its sheet.)
  await startGo(page, ON_GIVING, 'runner', GIVING);
  await runner(page).field('gift').click();
  const reason = (await arrived(page, 'go-entry-sheet')).getByTestId('go-entry-field');
  await reason.fill('need the job ad');
  await reason.focus();
  const url = page.url();
  const b = await context.newPage();
  await handTo(page, b, 'runner');

  await turn(page, 'visible');
  await expect(anotherTab(page)).toBeVisible({ timeout: 10_000 });
  await expect(anotherTab(page)).toBeFocused();
  expect(page.url()).toBe(url);
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);

  await turn(b, 'hidden');
  await expect(anotherTab(page)).toHaveCount(0, { timeout: 15_000 });
  expect(page.url()).toBe(url);
  await expect(reason).toBeVisible();
  await expect(reason).toBeFocused();
  await expect(reason).toHaveValue('need the job ad');
});

test('an update reload while a second window is visible and waiting hands the data to that window; the reloaded one waits, saying so, and keeps the words typed (documented edge case, P-29)', async ({ page, context, request }) => {
  await startGo(page, AT_EDGE, 'plan');
  await page.waitForFunction(async () => !!(await navigator.serviceWorker.ready).active && !!navigator.serviceWorker.controller);
  const second = await context.newPage();
  await second.goto('./go');
  await expect(anotherTab(second)).toBeVisible({ timeout: 20_000 });

  await plan(page).add.fill('typed before the update');
  await request.post('/__e2e/bump-sw');
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());
  await expect(page.getByText('A new version is ready')).toBeVisible();
  await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: /^Update now/ }).click()]);
  // The waiting window was next in line, so it has the data now; the updated one says why it waits.
  await expect(plan(second).add).toBeVisible({ timeout: 15_000 });
  await expect(anotherTab(page)).toBeVisible({ timeout: 15_000 });
  // Never a dead end: once that window is in the background, this one opens by itself.
  await turn(second, 'hidden');
  await expect(plan(page).add).toHaveValue('typed before the update', { timeout: 15_000 });
});

test('another worker that also gets a “configure” message isn’t taken for expo-sqlite’s: hiding still frees the files (audit F15, P-29)', async ({ page, context }) => {
  await startGo(page, AT_EDGE, 'plan');
  await page.evaluate(() => new Worker(URL.createObjectURL(new Blob(['onmessage = () => {}'], { type: 'text/javascript' }))).postMessage({ type: 'configure' }));
  // Once more around, so the next open would pick up a wrongly captured worker.
  const probe = await context.newPage();
  await probe.goto('./favicon.ico');
  await setVisibility(page, 'hidden');
  await expect.poll(() => takeFiles(probe), { timeout: 10_000 }).toEqual({ ok: true, files: expect.any(Number) });
  await setVisibility(page, 'visible');
  await expect.poll(() => takeFiles(probe), { timeout: 15_000 }).toEqual({ ok: false, name: 'NoModificationAllowedError' });
  await setVisibility(page, 'hidden');
  await expect.poll(() => takeFiles(probe), { timeout: 10_000 }).toEqual({ ok: true, files: expect.any(Number) });
});

test('a page that starts in the background says it’s opening (not a blank page), and opens once shown (P-29)', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  });
  await page.goto('./go');
  await expect(page.getByText('Opening…', { exact: true })).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(home(page).screen).toBeVisible({ timeout: 15_000 });
});
