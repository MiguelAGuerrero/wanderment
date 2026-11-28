/**
 * P-106 (B-17 slice 3): templates. Done when (the roadmap item): Learn ▢, Find out ▢, Make ▢, Make a decision and
 * "Work it out as you go" are in the library; Copy… names the copy and brings what it calls, by name; "Learn ▢"
 * copied twice gives two routines with separate kept lists that call the same methods; a name in use is refused in
 * the sheet and nothing is overwritten. At 390×844 and at 200 % text (195×422).
 *
 * (The engine's side — every template copied and started, Find out ▢ calling its copy, the kept lists apart — is in
 * src/domain/library.test.ts; the storage paths in src/storage/persistence.test.ts.)
 */
import { AxeBuilder } from '@axe-core/playwright';
import { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { exported, openRoutines, plan, routines, RoutineSpec, settled, startGo } from './goFixture';

const SHOTS = '.polish/current/P-104/shots';
const PAPER = 'rgb(244, 241, 232)';
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
/** Targets ≥ 48 px inside the window, text ≥ 16 px, the filled buttons, nothing sideways. */
async function rules(scope: Locator) {
  return scope.evaluate((root, paper) => {
    const shown = (e: Element) => {
      const b = e.getBoundingClientRect();
      return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[inert]');
    };
    const controls = [...root.querySelectorAll('button, [role="button"], [role="tab"], input, textarea')].filter((e) => shown(e) && !e.hasAttribute('data-sr-close'));
    const name = (e: Element) => e.getAttribute('aria-label') || (e as HTMLElement).innerText || '';
    const texts = [...root.querySelectorAll('*')].filter((e) => shown(e) && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()));
    return {
      small: controls.filter((e) => e.getBoundingClientRect().width < 47.5 || e.getBoundingClientRect().height < 47.5).map(name),
      outside: controls.filter((e) => e.getBoundingClientRect().left < -0.5 || e.getBoundingClientRect().right > innerWidth + 0.5).map(name),
      tiny: texts.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => e.textContent!.slice(0, 30)),
      filled: controls.filter((e) => getComputedStyle(e).backgroundColor === paper && e.getAttribute('aria-disabled') !== 'true').map(name),
      sideways: document.documentElement.scrollWidth > innerWidth,
    };
  }, PAPER);
}
async function expectRules(scope: Locator, filled: string[]) {
  const r = await rules(scope);
  expect(r.small, 'targets under 48 px').toEqual([]);
  expect(r.outside, 'controls outside the window').toEqual([]);
  expect(r.tiny, 'text under 16 px').toEqual([]);
  expect(r.filled, 'filled buttons').toEqual(filled);
  expect(r.sideways, 'nothing scrolls sideways').toBe(false);
}
const libRow = (page: Page, name: string) => settled(page, 'routines').getByTestId('go-lib-row').filter({ has: page.getByTestId('go-lib-name').getByText(name, { exact: true }) });

/** On the Library view: a template's preview → Copy… → its Name sheet. */
async function copyTemplate(page: Page, template: string) {
  await libRow(page, template).click();
  const s = await sheet(page, 'go-lib-sheet');
  await expect(s.getByTestId('go-lib-copy')).toHaveText('Copy…');
  await s.getByTestId('go-lib-copy').click();
  return sheet(page, 'go-lib-name-sheet');
}

for (const size of [
  { name: '390×844', width: 390, height: 844, shot: '' },
  { name: '200 % text (195×422)', width: 195, height: 422, shot: '-200' },
]) {
  test.describe(`at ${size.name}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
    });

    test('the five templates are in the library under "For a big aim"; a template’s preview shows its In any order and its kept lists; its button is Copy…', async ({ page }) => {
      await startGo(page, [], 'home', [STUDY]);
      await openRoutines(page);
      await settled(page, 'routines').getByRole('tab', { name: 'Library', exact: true }).click();
      const section = settled(page, 'routines').getByTestId('go-lib-section').filter({ has: page.getByTestId('go-lib-heading').getByText('For a big aim', { exact: true }) });
      await expect(section.getByTestId('go-lib-name')).toHaveText(['Learn ▢', 'Find out ▢', 'Make ▢', 'Make a decision', 'Work it out as you go']);
      await libRow(page, 'Learn ▢').click();
      const s = await sheet(page, 'go-lib-sheet');
      await expect(s.getByRole('heading', { level: 2 })).toHaveText('Learn ▢');
      await expect(s.getByTestId('go-lib-step').first()).toHaveText('State what you want to be able to do');
      await expect(s.getByTestId('go-lib-step').filter({ hasText: /^In any order$/ })).toHaveCount(1);
      await expect(s.getByTestId('go-lib-step').filter({ hasText: /^For each part in \{parts\}$/ })).toHaveCount(1);
      await expect(s.getByTestId('go-lib-copy')).toHaveAccessibleName('Copy… Learn blank');
      await expectRules(s, ['Copy… Learn blank']);
      await noSerious(page);
      await page.screenshot({ path: `${SHOTS}/template-preview${size.shot}.png` });
    });

    test('Copy… names the copy (the Name field starts "Learn ", Copy filled once a name is typed) and brings what it calls, by name — one notice, one Undo for all', async ({ page }) => {
      await startGo(page, [], 'home', [STUDY]);
      const r = await openRoutines(page);
      await settled(page, 'routines').getByRole('tab', { name: 'Library', exact: true }).click();
      const s = await copyTemplate(page, 'Learn ▢');
      await expect(s.getByRole('heading', { level: 2 })).toHaveText('Learn ▢');
      const field = s.getByTestId('go-lib-name-field');
      await expect(field).toHaveValue('Learn ');
      await expect(field).toBeFocused();
      await expect(s.getByTestId('go-lib-name-copy')).toHaveAttribute('aria-disabled', 'true');
      await expectRules(s, []);
      await field.fill('');
      await expect(field).toHaveAttribute('placeholder', 'A name for your copy');
      await field.fill('Learn guitar');
      await expect(s.getByTestId('go-lib-name-copy')).toHaveAccessibleName('Copy as Learn guitar');
      await expectRules(s, ['Copy as Learn guitar']);
      await noSerious(page);
      await page.screenshot({ path: `${SHOTS}/template-name${size.shot}.png` });
      await s.getByTestId('go-lib-name-copy').click();
      await expect(page.getByTestId('go-lib-name-sheet')).toHaveCount(0);
      await expect(r.notice).toContainText('Copied “Learn guitar” and what it calls');
      // What it calls is the person's now too — and the library still offers Learn ▢ (copied per aim).
      await expect(libRow(page, 'Practise at the edge')).toHaveAccessibleName(/, yours$/);
      await expect(libRow(page, 'Learn ▢')).toHaveAccessibleName(/, in the library$/);
      // One Undo for all.
      await r.notice.getByRole('button', { name: /^Undo/ }).click();
      await expect(libRow(page, 'Practise at the edge')).toHaveAccessibleName(/, in the library$/);
      const data = await exported(page);
      expect(Object.values(data.routines).filter((x) => x.named).map((x) => x.words)).toEqual(['Study for the exam']);
    });

    test('"Learn ▢" copied twice gives two routines with separate kept lists that call the same methods; a name in use is refused in the sheet and nothing is overwritten', async ({ page }) => {
      await startGo(page, [], 'home', [STUDY]);
      const r = await openRoutines(page);
      await settled(page, 'routines').getByRole('tab', { name: 'Library', exact: true }).click();
      let s = await copyTemplate(page, 'Learn ▢');
      await s.getByTestId('go-lib-name-field').fill('Learn guitar');
      await s.getByTestId('go-lib-name-copy').click();
      s = await copyTemplate(page, 'Learn ▢');
      await s.getByTestId('go-lib-name-field').fill('Learn Spanish');
      await s.getByTestId('go-lib-name-copy').click();
      await expect(r.notice).toContainText('Copied “Learn Spanish”');
      // A name in use: refused in the sheet, which stays; nothing is opened or overwritten.
      const before = await exported(page);
      await page.goto('./go/routines');
      await settled(page, 'routines').getByRole('tab', { name: 'Library', exact: true }).click();
      s = await copyTemplate(page, 'Learn ▢');
      await s.getByTestId('go-lib-name-field').fill('learn GUITAR');
      await s.getByTestId('go-lib-name-copy').click();
      await expect(s.getByTestId('go-lib-name-error')).toHaveText('! A routine already uses that name');
      await expect(page.getByTestId('go-lib-name-sheet')).toBeVisible();
      await expectRules(s, ['Copy as learn GUITAR']);
      await noSerious(page);
      await s.getByTestId('go-lib-name-close').click();
      const after = await exported(page);
      expect(after.routines).toEqual(before.routines);
      // Two routines; their kept lists apart; the methods they call the same, each once.
      const named = Object.values(after.routines).filter((x) => x.named);
      expect(named.map((x) => x.words).sort()).toEqual(['Check and mend', 'Keep the lesson', 'Learn Spanish', 'Learn guitar', 'Practise at the edge', 'Recall before you look', 'Review after doing', 'Say what done is', 'Study for the exam']);
      const body = (id: string): string[] => {
        const out: string[] = [id];
        for (let i = 0; i < out.length; i++) for (const it of after.routines[out[i]].items ?? []) if (it.ref && after.routines[it.ref] && !after.routines[it.ref].named && !out.includes(it.ref)) out.push(it.ref);
        return out;
      };
      const guitar = named.find((x) => x.words === 'Learn guitar')!.id;
      const spanish = named.find((x) => x.words === 'Learn Spanish')!.id;
      const kept = (id: string) => body(id).filter((b) => (after.routines[b] as { each?: { kept?: unknown } }).each?.kept !== undefined);
      expect(kept(guitar)).toHaveLength(3);
      expect(kept(guitar).filter((b) => kept(spanish).includes(b))).toEqual([]);
      const calls = (id: string) => body(id).flatMap((b) => (after.routines[b].items ?? []).filter((it) => it.ref && after.routines[it.ref]?.named).map((it) => it.ref));
      expect(calls(spanish)).toEqual(calls(guitar));
      // Each opens as an ordinary routine of the person's.
      await page.goto(`./go/routine/${guitar}`);
      await expect(plan(page).title).toHaveText('Learn guitar');
      await page.goto('./go/routines');
      await expect(routines(page).names).toContainText(['Learn guitar', 'Learn Spanish']);
    });
  });
}
