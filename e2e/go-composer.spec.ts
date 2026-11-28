/**
 * P-114 (B-19 slice 1, the owner: "a proper on boarding process … a composer of sorts guide you through a set up of a
 * routine"): New's sheet offers five starts — the library's templates — and the composer asks Make it's and Work it
 * out's questions one at a time, the routine growing beneath; it ends in Plan in Edit (P-115), the answers an unsaved
 * draft, with "Made “<name>”" and one Undo. Each *Done when* line of slice 1 is a test here (marked "Done when N"), at
 * 390 × 844 and at 195 × 422 (a 390 px phone at 200 %). Expected values come from B-19 (journeys 1, 2, 2a, 4, 5, its
 * "Answered by the owner"), the UI audit (.polish/current/P-114/ui-audit.md) and DESIGN.md — never from running the code.
 */
import { AxeBuilder } from '@axe-core/playwright';
import { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { arrived, exported, home, openGo, openRoutines, plan, routines, RoutineSpec, runner, savePlan, settled, startGo, startThing } from './goFixture';

const PAPER = 'rgb(244, 241, 232)';
const MORNING: RoutineSpec = { id: 'morning', name: 'Morning pages', steps: ['Brew coffee', 'Write three pages'] };
const STARTS = [
  ['Work it out', 'figure it out as you go'],
  ['Make it', 'something to build or finish'],
  ['Learn it', 'something to get better at'],
  ['Find out', 'a question to answer'],
  ['Decide', 'a choice to make'],
];

async function noSerious(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  expect(serious, serious.join('\n')).toEqual([]);
}

/** DESIGN.md's sizes on what is in front: every control ≥ 48 × 48 and inside the window, every text ≥ 16 px, words never cut sideways, one filled button. */
async function expectSizes(page: Page, scope: Locator, filled: number) {
  const found = await scope.evaluate(
    (root, paper) => {
      const shown = (e: Element) => {
        const b = e.getBoundingClientRect();
        return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[inert]');
      };
      const controls = [...root.querySelectorAll('button, [role="button"], input, textarea, a[href]')].filter(shown);
      const name = (e: Element) => e.getAttribute('aria-label') || (e as HTMLElement).innerText || '';
      const small = controls.filter((e) => { const b = e.getBoundingClientRect(); return b.width < 47.5 || b.height < 47.5; }).map((e) => `${name(e)} ${Math.round(e.getBoundingClientRect().width)}×${Math.round(e.getBoundingClientRect().height)}`);
      const outside = controls.filter((e) => { const b = e.getBoundingClientRect(); return b.left < -0.5 || b.right > innerWidth + 0.5; }).map(name);
      const texts = [...root.querySelectorAll('*')].filter((e) => shown(e) && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()));
      const tiny = texts.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => e.textContent!.slice(0, 30));
      // Words cut sideways: a text or a field whose words are wider than its box.
      const cut = [...texts.filter((e) => (e as HTMLElement).clientWidth > 1), ...controls.filter((e) => e.tagName === 'TEXTAREA' || e.tagName === 'INPUT')].filter((e) => (e as HTMLElement).scrollWidth > (e as HTMLElement).clientWidth + 1).map((e) => (e.textContent || (e as HTMLInputElement).value || '').slice(0, 30));
      const filledOnes = controls.filter((e) => getComputedStyle(e).backgroundColor === paper && e.getAttribute('aria-disabled') !== 'true').map(name);
      return { small, outside, tiny, cut, filled: filledOnes };
    },
    PAPER,
  );
  expect(found.small, 'targets under 48 px').toEqual([]);
  expect(found.outside, 'controls outside the window').toEqual([]);
  expect(found.tiny, 'text under 16 px').toEqual([]);
  expect(found.cut, 'words cut off').toEqual([]);
  expect(found.filled, 'filled buttons').toHaveLength(filled);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

const sheetOf = (page: Page) => {
  const sheet = page.getByTestId('go-new-sheet');
  return {
    sheet,
    field: sheet.getByTestId('go-new-name'),
    starts: sheet.getByTestId('go-new-start'),
    start: (key: string) => sheet.locator(`[data-testid="go-new-start"][data-start="${key}"]`),
    marked: sheet.locator('[data-testid="go-new-start"][data-marked="true"]'),
    scratch: sheet.getByTestId('go-new-plan'),
    taken: sheet.getByTestId('go-new-taken'),
  };
};
async function openNew(page: Page) {
  await home(page).newBtn.click();
  await arrived(page, 'go-new-sheet');
  return sheetOf(page);
}
const composer = (page: Page) => {
  const screen = settled(page, 'compose' as never);
  return {
    screen,
    title: screen.getByRole('heading', { level: 1 }),
    question: screen.getByTestId('go-compose-question'),
    field: screen.getByTestId('go-compose-field'),
    go: screen.getByTestId('go-compose-continue'),
    skip: screen.getByTestId('go-compose-skip'),
    out: screen.getByTestId('go-compose-out'),
    soFar: screen.getByRole('heading', { level: 2, name: 'So far' }),
    words: screen.getByTestId('go-compose-words'),
    said: screen.getByTestId('go-compose-said'),
  };
};
/** Typed, then a start chosen: the composer on its first question. */
async function compose(page: Page, typed: string, start: 'make' | 'work') {
  const s = await openNew(page);
  await s.field.fill(typed);
  await s.start(start).click();
  await expect(composer(page).question).toBeVisible();
  return composer(page);
}
/** The routine stored under `name` (from the export), with its for each blocks' kept lists. */
async function storedRoutine(page: Page, name: string) {
  const data = await exported(page);
  const r = Object.values(data.routines).find((x) => x.words === name)!;
  const blocks = (r?.items ?? []).flatMap((i) => (i.ref && data.routines[i.ref]?.named === false ? [data.routines[i.ref]] : []));
  return { r, data, kept: blocks.map((b) => (b.each as { kept?: string[] } | undefined)?.kept).filter(Boolean) };
}

for (const size of [
  { width: 390, height: 844, label: '390 × 844' },
  { width: 195, height: 422, label: '195 × 422 (200 %)' },
]) {
  test.describe(`P-114 the composer, at ${size.label}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    test('New: the question as its label, five starts with their lines; nothing marked for words it does not know — Work it out is the filled start (Done when 4); Return takes it', async ({ page }) => {
      await startGo(page, [], 'home', [MORNING]);
      const s = await openNew(page);
      await expect(s.sheet.getByTestId('go-new-ask')).toHaveText('What do you want to do?');
      await expect(s.field).toHaveAccessibleName('What do you want to do?');
      await expect(s.field).toHaveAttribute('placeholder', 'learn to play piano');
      await expect(s.field).toBeFocused();
      await expect(s.starts).toHaveCount(5);
      for (const [i, [label, line]] of STARTS.entries()) await expect(s.starts.nth(i)).toHaveText(`${label} ${line}`);
      // Nothing typed: nothing can be made (every start and Start from scratch unavailable).
      for (let i = 0; i < 5; i++) await expect(s.starts.nth(i)).toBeDisabled();
      await expect(s.scratch).toBeDisabled();
      // Words it does not recognise: none of the four is marked; Work it out is the one filled button.
      await s.field.fill('a zine about my street');
      await expect(s.marked).toHaveCount(1);
      await expect(s.marked).toHaveAttribute('data-start', 'work');
      await expect(s.start('work')).toHaveAccessibleName('Work it out, figure it out as you go, suggested');
      await expect(s.start('make')).toHaveAccessibleName('Make it, something to build or finish');
      expect(await s.start('work').evaluate((e) => getComputedStyle(e).backgroundColor)).toBe(PAPER);
      for (const k of ['make', 'learn', 'find', 'decide']) expect(await s.start(k).evaluate((e) => getComputedStyle(e).backgroundColor)).not.toBe(PAPER);
      await expectSizes(page, s.sheet, 1);
      await noSerious(page);
      // Recognised words mark their start (it only fills the button: nothing is made).
      for (const [typed, key] of [
        ['learn to play piano', 'learn'],
        ['why my mixes sound thin', 'find'],
        ['whether to take the contract job', 'decide'],
        ['make a zine', 'make'],
      ]) {
        await s.field.fill(typed);
        await expect(s.marked).toHaveAttribute('data-start', key);
      }
      await expect(page).toHaveURL(/\/go\/?$/);
      // Return takes the filled start (UI audit 2).
      await s.field.fill('make a zine');
      await s.field.press('Enter');
      await expect(composer(page).title).toHaveText('Make a zine');
    });

    test('Make it: a sentence and a start make a routine named from it, its lists holding the answers verbatim (Done when 1); "my" reads "your" in the question while the routine keeps "my" (Done when 5); it ends in Plan, in Edit, with one Undo', async ({ page }) => {
      await startGo(page, [], 'home', [MORNING]);
      const c = await compose(page, 'a zine about my street', 'make');
      await expect(c.title).toHaveText('Make a zine about my street');
      await expect(c.question).toHaveText('What is the zine about your street for?');
      await expect(c.field).toHaveAccessibleName('What is the zine about your street for?');
      await expect(c.field).toBeFocused();
      await expect(c.soFar).toBeVisible();
      // The routine as it stands, in the library's words until answered.
      await expect(c.words.first()).toHaveText('State who it is for and what it should do for them');
      await expect(c.screen.getByRole('button', { name: /^(Next|Done|Start)/ })).toHaveCount(0);
      await expectSizes(page, c.screen, 1);
      await noSerious(page);
      await c.field.fill('so neighbours notice the street');
      await c.go.click();
      await expect(c.question).toHaveText('How will you know it’s done?');
      await expect(c.words.first()).toHaveText('so neighbours notice the street');
      await expect(c.said).toHaveText('Added “so neighbours notice the street”');
      await c.field.fill('12 pages\nprinted\nleft at five doors');
      await c.go.click();
      await expect(c.question).toHaveText('What are a few ways you could make it?');
      await expect(c.said).toHaveText('Added 3 things done means');
      await c.field.fill('photocopy\nrisograph\nhand-drawn');
      await expectSizes(page, c.screen, 1);
      await c.go.click();
      // Plan, in Edit, the answers an unsaved draft; "Made “…”" with its Undo.
      const p = plan(page);
      await expect(p.title).toHaveText('Make a zine about my street');
      await expect(p.save).toBeVisible();
      await expect(p.cancel).toBeVisible();
      await expect(p.notice).toContainText('Made “Make a zine about my street”');
      await expect(p.undo).toBeVisible();
      await expect(p.screen.getByText('photocopy', { exact: true })).toBeVisible();
      // Saved, the lists hold the answers exactly as typed.
      await savePlan(page);
      const { r, kept } = await storedRoutine(page, 'Make a zine about my street');
      expect(r.items![0].text).toBe('so neighbours notice the street');
      expect(kept).toEqual([['photocopy', 'risograph', 'hand-drawn']]);
      const withs = JSON.stringify(r.items);
      for (const line of ['12 pages', 'printed', 'left at five doors']) expect(withs).toContain(line);
    });

    test('a second question carries a short first answer and falls back to "it" for a long one or a list (Done when 5)', async ({ page }) => {
      await startGo(page, [], 'home', [MORNING]);
      let c = await compose(page, 'a zine about every single house on my long street', 'make');
      await expect(c.question).toHaveText('What is it for?');
      await c.out.click();
      c = await compose(page, 'a zine and a poster', 'make');
      await expect(c.question).toHaveText('What is it for?');
      await c.out.click();
      c = await compose(page, 'my portfolio', 'make');
      await expect(c.question).toHaveText('What is your portfolio for?');
      await expect(c.title).toHaveText('Make my portfolio');
    });

    test('Skip the rest at any question leaves a valid routine — Plan in Edit, Save, Start (Done when 2)', async ({ page }) => {
      await startGo(page, [], 'home', [MORNING]);
      // At the first question, nothing answered.
      let c = await compose(page, 'a quilt', 'make');
      await c.skip.click();
      let p = plan(page);
      await expect(p.title).toHaveText('Make a quilt');
      await expect(p.save).toBeVisible();
      await savePlan(page);
      await p.forward.click();
      await expect(runner(page).words).toHaveText('State who it is for and what it should do for them');
      await runner(page).pause.click();
      await page.getByTestId('go-pause-confirm').click();
      // At the second, with words typed there and not yet Continued: they are kept (UI audit 4).
      c = await compose(page, 'redo my CV', 'work');
      await expect(c.question).toHaveText('What’s the first small step?');
      await c.field.fill('list my last three jobs');
      await c.go.click();
      await expect(c.question).toHaveText('What comes after that, if you know?');
      await c.field.fill('pick a template');
      await c.skip.click();
      p = plan(page);
      await expect(p.title).toHaveText('Redo my CV');
      await expect(p.screen.getByText('list my last three jobs', { exact: true })).toBeVisible();
      await expect(p.screen.getByText('pick a template', { exact: true })).toBeVisible();
      await savePlan(page);
      const { kept } = await storedRoutine(page, 'Redo my CV');
      expect(kept).toEqual([['list my last three jobs', 'pick a template']]);
    });

    test('Start from scratch makes an empty routine exactly as New did (Done when 3); a name in use is refused for a start, in words', async ({ page }) => {
      await startGo(page, [], 'home', [MORNING]);
      // The fixture's own New: the name, then the button that was Plan — the empty routine, its Plan, "Undo New".
      await startThing(page, 'Water the plants');
      expect((await storedRoutine(page, 'Water the plants')).r.items ?? []).toEqual([]);
      await openGo(page);
      // A name in use: Start from scratch opens that routine's Plan, as New always did; a start refuses it.
      let s = await openNew(page);
      await expect(s.scratch).toHaveText('Start from scratch');
      await s.field.fill('Morning pages');
      await s.start('work').click();
      await expect(s.taken).toHaveText('! A routine already uses that name');
      await expect(page.getByTestId('go-new-sheet')).toBeVisible();
      await s.scratch.click();
      await expect(plan(page).title).toHaveText('Morning pages');
      expect(Object.values((await exported(page)).routines).filter((r) => r.named !== false).map((r) => r.words).sort()).toEqual(['Morning pages', 'Water the plants']);
      await openGo(page);
      s = await openNew(page);
      await expect(s.scratch).toHaveAccessibleName('Start from scratch');
    });

    test('⌂ Home mid-way leaves the routine as built so far (Plan reopens in Edit with it); its one Undo takes it away', async ({ page }) => {
      await startGo(page, [], 'home', [MORNING]);
      const c = await compose(page, 'a zine', 'make');
      await c.field.fill('for the street');
      await c.go.click();
      await c.field.fill('printed');
      await c.out.click();
      const h = home(page);
      await expect(h.notice).toContainText('Made “Make a zine”');
      const r = await openRoutines(page);
      await expect(r.row('Make a zine')).toHaveCount(1);
      await r.row('Make a zine').click();
      const p = plan(page);
      await expect(p.save).toBeVisible();
      await expect(p.screen.getByText('for the street', { exact: true })).toBeVisible();
      // Its Undo (the routine's menu): the routine goes whole.
      await openGo(page);
      const again = await compose(page, 'a kite', 'make');
      await again.skip.click();
      await expect(plan(page).notice).toContainText('Made “Make a kite”');
      await plan(page).undo.click();
      await expect(settled(page, 'home')).toBeVisible();
      expect(Object.values((await exported(page)).routines).some((x) => x.words === 'Make a kite')).toBe(false);
    });

    test('Cancel in Plan discards the answers and keeps the template’s steps', async ({ page }) => {
      await startGo(page, [], 'home', [MORNING]);
      const c = await compose(page, 'a zine', 'make');
      await c.field.fill('for the street');
      await c.go.click();
      await c.skip.click();
      const p = plan(page);
      await expect(p.cancel).toBeVisible();
      await p.cancel.click();
      await expect(p.edit).toBeVisible();
      expect((await storedRoutine(page, 'Make a zine')).r.items![0].text).toBe('State who it is for and what it should do for them');
    });

    test('the composer cannot be reached from the runner, and is not remembered: its address opens the routine’s Plan (Done when 6)', async ({ page }) => {
      await startGo(page, [{ id: 'r1', routine: 'morning', status: 'running' }], 'runner', [MORNING, { id: 'tea', name: 'Make tea', steps: ['Boil water'] }]);
      const r = runner(page);
      await expect(r.words).toHaveText('Brew coffee');
      await r.note.click();
      await expect(r.panel).toBeVisible();
      for (const words of ['Continue', 'Skip the rest', 'Start from scratch', 'Work it out', 'Make it']) await expect(page.getByRole('button', { name: words, exact: true })).toHaveCount(0);
      await expect(page.locator('a[href*="compose"]')).toHaveCount(0);
      // Opened by its address (a reload, a link): the routine's Plan — never the composer. (Paused first: with a run
      // running, the app opens on the runner whatever the address.)
      await page.keyboard.press('Escape');
      await r.pause.click();
      await page.getByTestId('go-pause-confirm').click();
      await expect(settled(page, 'home')).toBeVisible();
      await page.goto('./go/compose/tea');
      await expect(plan(page).title).toHaveText('Make tea');
      await expect(page.getByTestId('go-compose-question')).toHaveCount(0);
    });

    test('a reload mid-way: Plan in Edit with what was built so far (nothing asked twice)', async ({ page }) => {
      await startGo(page, [], 'home', [MORNING]);
      const c = await compose(page, 'redo my CV', 'work');
      await c.field.fill('list my last three jobs');
      await c.go.click();
      await expect(c.question).toHaveText('What comes after that, if you know?');
      await page.reload();
      const p = plan(page);
      await expect(p.title).toHaveText('Redo my CV');
      await expect(p.save).toBeVisible();
      await expect(p.screen.getByText('list my last three jobs', { exact: true })).toBeVisible();
    });

    test('from My routines: its way out goes back there, and Plan’s too', async ({ page }) => {
      await startGo(page, [], 'home', [MORNING]);
      const list = await openRoutines(page);
      await list.newBtn.click();
      const s = sheetOf(page);
      await s.field.fill('redo my CV');
      await s.start('work').click();
      const c = composer(page);
      await expect(c.out).toHaveAccessibleName('Back to My routines');
      await c.out.click();
      await expect(routines(page).row('Redo my CV')).toHaveCount(1);
      await expect(routines(page).notice).toContainText('Made “Redo my CV”');
    });
  });
}
