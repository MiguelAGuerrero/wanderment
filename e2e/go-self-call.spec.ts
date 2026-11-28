/**
 * P-113: a routine can call itself (the owner, 2026-11-28: "Unpark self-calls"). Done when (the roadmap item): a routine
 * can call itself, each call its own level with its own inputs passed in (the lead, not the question again); deep
 * levels are named by the value they were called with, "…" in long paths; depth stays bounded and is said; Find out ▢
 * works end to end. In Plan it is added as any call and nothing is said against it; its row is closed, "this routine"
 * (B-16). At 390×844 and at 200 % text (195×422).
 *
 * (The engine's side — direct and through another, own copies, the bound, the names — is in `src/domain/selfCall.test.ts`;
 * a run several levels deep through every storage path in `src/storage/persistence.test.ts` and `goldenP113.test.ts`.)
 */
import { AxeBuilder } from '@axe-core/playwright';
import { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { editPlan, exported, openRoutines, plan, RoutineSpec, routines, runner, savePlan, seedGo, settled, startGo, typeValue, arrived } from './goFixture';

const SHOTS = '.polish/current/P-113/shots';
const PAPER = 'rgb(244, 241, 232)';

const COUNT: RoutineSpec = { id: 'count', name: 'Count down', steps: ['Say {n}', { text: 'Name the next', gives: 'm' }, 'Close {n}'] };
/** A routine calling itself with typed words, and a run seeded 64 levels deep in it (the depth bound). */
const AGAIN: RoutineSpec = { id: 'again', name: 'Say it again', steps: [{ routine: 'again', with: [{ input: 'w', typed: 'hello' }] }, 'Say {w}'] };
const STUDY: RoutineSpec = { id: 'study', name: 'Study for the exam', steps: ['Read chapter one'] };

async function sheet(page: Page, testId: string): Promise<Locator> {
  const s = page.getByTestId(testId);
  await expect(s).toHaveAttribute('data-moving', 'false');
  return s;
}
async function noSerious(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}
/** Targets ≥ 48 px inside the window, text ≥ 16 px, every control named with its visible words, at most one filled button, nothing sideways. */
async function rules(scope: Locator) {
  const found = await scope.evaluate((root, paper) => {
    const shown = (e: Element) => {
      const b = e.getBoundingClientRect();
      return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[inert]');
    };
    const controls = [...root.querySelectorAll('button, [role="button"], [role="menuitem"], input, textarea')].filter((e) => shown(e) && !e.hasAttribute('data-sr-close'));
    const name = (e: Element) => e.getAttribute('aria-label') || (e as HTMLElement).innerText || (e as HTMLInputElement).placeholder || '';
    return {
      small: controls.filter((e) => e.getBoundingClientRect().width < 47.5 || e.getBoundingClientRect().height < 47.5).map(name),
      outside: controls.filter((e) => e.getBoundingClientRect().left < -0.5 || e.getBoundingClientRect().right > innerWidth + 0.5).map(name),
      unnamed: controls.filter((e) => !name(e).trim()).length,
      tiny: [...root.querySelectorAll('*')].filter((e) => shown(e) && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()) && parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => e.textContent!.slice(0, 30)),
      filled: controls.filter((e) => getComputedStyle(e).backgroundColor === paper && e.getAttribute('aria-disabled') !== 'true').map(name),
      label: controls.filter((e) => { const l = e.getAttribute('aria-label'); const v = ((e as HTMLElement).innerText ?? '').trim().replace(/\s+/g, ' '); return !!l && !!v && !['INPUT', 'TEXTAREA'].includes(e.tagName) && !l.toLowerCase().includes(v.toLowerCase()); }).map(name),
      sideways: document.documentElement.scrollWidth > innerWidth,
    };
  }, PAPER);
  expect(found.small, 'targets under 48 px').toEqual([]);
  expect(found.outside, 'controls outside the window').toEqual([]);
  expect(found.unnamed, 'unnamed controls').toBe(0);
  expect(found.tiny, 'text under 16 px').toEqual([]);
  expect(found.filled.length, `filled: ${found.filled.join(', ')}`).toBeLessThanOrEqual(1);
  expect(found.label, 'names that leave out the visible words').toEqual([]);
  expect(found.sideways, 'nothing scrolls sideways').toBe(false);
}
const planOf = async (page: Page, id: string) => {
  await page.goto(`./go/routine/${id}`);
  await expect(settled(page, 'plan')).toBeVisible();
  await editPlan(page);
  return plan(page);
};
/** The runner's place, as it reads: its path and its step (what changes on every move). */
const where = async (page: Page) => `${await runner(page).context.innerText()}|${await runner(page).words.innerText()}`;
async function press(page: Page, button: Locator) {
  const was = await where(page);
  await button.click();
  await expect.poll(() => where(page).catch(() => was)).not.toBe(was);
}
/**
 * The leads, in the list sheet of the step that gives them. (At 195×422 inside a call the runner's column has almost no
 * height — the runner's own layout, before P-113, as go-foreach notes — so there the field is opened from the keyboard.)
 */
async function giveList(page: Page, name: string, items: string[]) {
  const field = runner(page).field(name);
  if ((page.viewportSize()?.width ?? 390) < 300) {
    await field.focus();
    await page.keyboard.press('Enter');
  } else await field.click();
  const list = await sheet(page, 'go-list-sheet');
  const fields = list.getByTestId('go-list-field');
  for (const [i, item] of items.entries()) {
    if (i > 0) await fields.nth(i - 1).press('Enter');
    await fields.nth(i).fill(item);
  }
  await list.getByTestId('go-list-keep').click();
  await expect(page.getByTestId('go-list-sheet')).toHaveCount(0);
}

/** A value typed in its entry sheet (at 195×422 the field is opened from the keyboard, as above). */
async function typeIn(page: Page, name: string, text: string) {
  if ((page.viewportSize()?.width ?? 390) >= 300) return typeValue(page, name, text);
  await runner(page).field(name).focus();
  await page.keyboard.press('Enter');
  const s = await arrived(page, 'go-entry-sheet');
  await s.getByTestId('go-entry-field').fill(text);
  await s.getByTestId('go-entry-keep').click();
  await expect(page.getByTestId('go-entry-sheet')).toHaveCount(0);
}

for (const size of [
  { name: '390×844', width: 390, height: 844, shot: '' },
  { name: '200 % text (195×422)', width: 195, height: 422, shot: '-200' },
]) {
  test.describe(`at ${size.name}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
    });

    test('Plan: a routine added as its own step — nothing said against it; its row is closed, “this routine”; its input bound; saved, and it survives a reload and the export', async ({ page }) => {
      await seedGo(page, [COUNT]);
      const p = await planOf(page, 'count');
      await p.screen.getByTestId('go-plan-add-routine').click();
      const pick = await sheet(page, 'go-routines-sheet');
      await pick.getByRole('button', { name: /^Add as a step: Count down/ }).click();
      await expect(page.getByTestId('go-routines-sheet')).toHaveCount(0);
      await expect(page.getByTestId('go-routines-sheet-error')).toHaveCount(0);
      await expect(page.getByText(/can’t be a step/)).toHaveCount(0);
      await expect(p.words).toHaveText(['Say asks {n}', 'Name the next', 'Close asks {n}', 'Count down']);
      const row = p.row('Count down');
      await expect(row.getByTestId('go-plan-closed')).toHaveText('this routine');
      // Closed: no chevron to open it in place.
      await expect(row.getByRole('button', { name: 'Open Count down', exact: true })).toHaveCount(0);
      await expect(row.getByTestId('go-plan-input')).toHaveText(['asks {n}']);
      await row.getByTestId('go-plan-input').click();
      const bind = await sheet(page, 'go-bind-sheet');
      await expect(bind.getByRole('heading', { level: 2 })).toHaveText('Count down with {n}');
      await bind.getByTestId('go-bind-name').filter({ hasText: '{m}' }).click();
      await expect(row.getByTestId('go-plan-input')).toHaveText(['with {m} as n']);
      await rules(p.screen);
      await noSerious(page);
      await page.screenshot({ path: `${SHOTS}/plan-self-row${size.shot}.png` });
      await savePlan(page);
      await page.reload();
      await expect(plan(page).row('Count down').getByTestId('go-plan-closed')).toHaveText('this routine');
      const data = await exported(page);
      expect(data.routines.count.items!.at(-1)).toMatchObject({ ref: 'count', words: 'Count down', with: [{ input: 'n', name: 'm' }] });
    });

    test('Find out ▢ end to end: copied from the library, each lead is passed in as the question of its own call; deep levels are named by their lead, first › … › the last two; the panel names the level; the answers come back; the run finishes', async ({ page }) => {
      test.setTimeout(120_000);
      await startGo(page, [], 'home', [STUDY]);
      await openRoutines(page);
      await settled(page, 'routines').getByRole('tab', { name: /Library/ }).click();
      await settled(page, 'routines').getByTestId('go-lib-row').filter({ has: page.getByTestId('go-lib-name').getByText('Find out ▢', { exact: true }) }).click();
      const s = await sheet(page, 'go-lib-sheet');
      await s.getByTestId('go-lib-copy').click();
      const name = await sheet(page, 'go-lib-name-sheet');
      await name.getByTestId('go-lib-name-field').fill('Find out about bees');
      await name.getByTestId('go-lib-name-copy').click();
      await expect(page.getByTestId('go-lib-name-sheet')).toHaveCount(0);
      await settled(page, 'routines').getByRole('tab', { name: /Yours/ }).click();
      await routines(page).more('Find out about bees').click();
      await (await arrived(page, 'go-routine-menu')).getByRole('menuitem', { name: 'Start Find out about bees', exact: true }).click();
      const r = runner(page);
      await expect(r.words).toHaveText('State what you think the answer to {question} is, and what would change your mind');
      await typeValue(page, 'question', 'Is honey worth it?');
      await press(page, r.next);
      await expect(r.words).toHaveText('Find what bears on Is honey worth it?');

      /** Next until the step reads `w` (nothing given on the way). */
      const to = async (w: RegExp) => {
        for (let k = 0; k < 8 && !w.test(await r.words.innerText()); k++) await press(page, r.next);
        await expect(r.words).toHaveText(w);
      };
      const leads = async (items: string[]) => {
        await to(/^List the questions this raises$/);
        await giveList(page, 'leads', items);
        await press(page, r.next);
        // On the call to itself, inside the for each.
        await expect(r.words).toHaveText('Find out about bees');
        await press(page, r.stepIn);
      };
      await leads(['pricing', 'costs']);
      // Inside: the lead is the question — read in place, never asked again.
      await expect(r.words).toHaveText('State what you think the answer to pricing is, and what would change your mind');
      await expect(r.field('question')).toHaveCount(0);
      await expect(r.context).toHaveText(/^Find out about bees ›\s*lead: pricing$/);
      await leads(['who sets prices']);
      await expect(r.context).toHaveText(/^Find out about bees › lead: pricing ›\s*lead: who sets prices$/);
      await leads(['the co-op board']);
      await expect(r.words).toHaveText('State what you think the answer to the co-op board is, and what would change your mind');
      await expect(r.field('question')).toHaveCount(0);
      // Three levels of it: the first, "…" (plain text, not a control), then the last two.
      await expect(r.context).toHaveText(/^Find out about bees › … › lead: who sets prices ›\s*lead: the co-op board$/);
      await expect(r.context.getByRole('button')).toHaveCount(0);
      await expect(r.stepOut).toHaveAccessibleName('Step out of lead: the co-op board');
      await rules(r.screen);
      await noSerious(page);
      await page.screenshot({ path: `${SHOTS}/runner-deep${size.shot}.png` });
      // The panel names the level the same way.
      await r.handle.click();
      await expect(r.panel).toBeVisible();
      await expect(r.panel.getByRole('button', { name: 'Start lead: the co-op board over', exact: true })).toBeVisible();
      await rules(r.panel);
      await page.screenshot({ path: `${SHOTS}/panel-deep${size.shot}.png` });
      await r.handle.click();
      await expect(page.getByTestId('go-panel')).toHaveCount(0);

      // Its answer, at the deepest level; then on, through every level, to the end.
      await to(/^State the answer to the co-op board, from/);
      await typeIn(page, 'answer', 'the co-op board sets them yearly');
      for (let k = 0; k < 40; k++) {
        const w = await r.words.innerText();
        if (/^State the answer to Is honey worth it\?/.test(w)) break;
        if (w === 'Find out about bees') await press(page, r.stepIn);
        else await press(page, r.next);
        // Below the first level the question is never asked.
        if (!/^Find out about bees$/.test(await r.context.innerText())) await expect(r.field('question')).toHaveCount(0);
      }
      await expect(r.words).toHaveText(/^State the answer to Is honey worth it\?, from/);
      await expect(r.context).toHaveText('Find out about bees');
      // What the leads gave stands here, to adjust into one answer.
      await expect(r.field('answer')).toContainText('the co-op board sets them yearly');
      await typeIn(page, 'answer', 'Yes, from the co-op');
      await expect(r.next).toHaveText('Done');
      await r.next.click();
      await expect(settled(page, 'home')).toBeVisible();
      const data = await exported(page);
      const run = Object.values(data.runs).find((x) => (x as { routineId: string }).routineId !== 'study') as { endedAt?: string };
      expect(run.endedAt).toBeTruthy();
    });

    test('the depth is bounded and said: 64 levels in, Step in says “Can’t step in any deeper” and stays; Next passes the call, Step out leaves the level — never a lockout', async ({ page }) => {
      // (Each level holds its own copy of {w}, as Step in stores it: the call's typed words.)
      const copies = Array.from({ length: 63 }, (_, i) => ({ name: 'w', items: ['hello'], level: i + 1, seq: 'again', item: 'again-0', words: 'Say it again', at: new Date().toISOString() }));
      await seedGo(page, [AGAIN], [{ id: 'deep', routine: 'again', at: 0, status: 'running', inner: Array.from({ length: 63 }, () => ({ routine: 'again', at: 0 })), values: copies }]);
      await page.goto('./go/run/deep');
      const r = runner(page);
      await expect(r.words).toHaveText('Say it again');
      // Each level named by what it was called with; the long path folded: first › … › the last two.
      await expect(r.context).toHaveText(/^Say it again › … › w: hello ›\s*w: hello$/);
      await r.stepIn.click();
      await expect(r.notice).toContainText('Can’t step in any deeper');
      await expect(r.words).toHaveText('Say it again');
      await rules(r.screen);
      await noSerious(page);
      await page.screenshot({ path: `${SHOTS}/too-deep${size.shot}.png` });
      await press(page, r.next);
      await expect(r.words).toHaveText('Say hello');
      // (Out one level: the level below reads the same — its own "Say hello" — so the notice and the store say it.)
      await r.stepOut.click();
      await expect(r.notice).toContainText('Left w: hello');
      await expect(r.words).toHaveText('Say hello');
      await expect.poll(async () => ((await exported(page)).runs.deep as { frames: unknown[] }).frames.length).toBe(63);
    });
  });
}
