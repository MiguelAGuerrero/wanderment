/**
 * P-98: calls — a routine as a step, with what it asks and gives. The owner's case throughout: "Improve my
 * workout routine" — "List out my doubts" gives {concerns}, then "Research" (reads {concerns}, gives {findings})
 * as a step, then "Decide using {findings}". Added from Add's "a routine" and from "@" (only when summoned); its
 * row says what it asks and gives and opens what fills an input; stepped into, the path is caller › callee and the
 * input reads "from" the caller's step; what it gives comes back; Next or Step out past it asks for what it still
 * owes (never on the step itself); a routine can't be a step of itself; Copy; removing a called routine names
 * where it is called, and the call then says so. At 390×844 and at 200 % text (195×422).
 */
import { AxeBuilder } from '@axe-core/playwright';
import { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { exported, openGo, openRoutines, plan, planMove, RoutineSpec, runner, seedGo, settled, startGo, typeValue } from './goFixture';

const SHOTS = '.polish/current/P-98/shots';
const PAPER = 'rgb(244, 241, 232)';

const RESEARCH: RoutineSpec = { id: 'research', name: 'Research', home: false, steps: ['Look into {concerns}', { text: 'Note what I found', gives: 'findings' }] };
const IMPROVE: RoutineSpec = { id: 'improve', name: 'Improve my workout routine', steps: [{ text: 'List out my doubts', gives: 'concerns' }, 'Decide using {findings}'] };
/** Improve with Research already a step, after "List out my doubts". */
const CALLED: RoutineSpec = { ...IMPROVE, steps: [{ text: 'List out my doubts', gives: 'concerns' }, { routine: 'research' }, 'Decide using {findings}'] };

async function sheet(page: Page, testId: string): Promise<Locator> {
  const s = page.getByTestId(testId);
  await expect(s).toHaveAttribute('data-moving', 'false');
  return s;
}
const planOf = async (page: Page, id: string) => {
  await page.goto(`./go/routine/${id}`);
  await expect(settled(page, 'plan')).toBeVisible();
  return plan(page);
};
const callRow = (page: Page, name: string) => plan(page).rows.filter({ has: page.getByRole('button', { name: `More for ${name}`, exact: true }) });

async function noSerious(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}
/** Targets ≥ 48 px inside the window, text ≥ 16 px, every control named, at most one filled button. */
async function rules(page: Page, scope: Locator) {
  const found = await scope.evaluate((root, paper) => {
    const shown = (e: Element) => {
      const b = e.getBoundingClientRect();
      return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[inert]');
    };
    const controls = [...root.querySelectorAll('button, [role="button"], [role="menuitem"], input, textarea')].filter((e) => shown(e) && !e.hasAttribute('data-sr-close'));
    const name = (e: Element) => e.getAttribute('aria-label') || (e as HTMLElement).innerText || (e as HTMLInputElement).placeholder || '';
    return {
      small: controls.filter((e) => { const b = e.getBoundingClientRect(); return b.width < 47.5 || b.height < 47.5; }).map(name),
      outside: controls.filter((e) => { const b = e.getBoundingClientRect(); return b.left < -0.5 || b.right > innerWidth + 0.5; }).map(name),
      unnamed: controls.filter((e) => !name(e).trim()).length,
      tiny: [...root.querySelectorAll('*')].filter((e) => shown(e) && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()) && parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => e.textContent!.slice(0, 30)),
      filled: controls.filter((e) => getComputedStyle(e).backgroundColor === paper && e.getAttribute('aria-disabled') !== 'true').map(name),
      // Accessible names include the visible words.
      label: controls.filter((e) => { const l = e.getAttribute('aria-label'); const v = ((e as HTMLElement).innerText ?? '').trim().replace(/\s+/g, ' '); return !!l && !!v && !['INPUT', 'TEXTAREA'].includes(e.tagName) && !l.toLowerCase().includes(v.toLowerCase()); }).map(name),
    };
  }, PAPER);
  expect(found.small, 'targets under 48 px').toEqual([]);
  expect(found.outside, 'controls outside the window').toEqual([]);
  expect(found.unnamed, 'unnamed controls').toBe(0);
  expect(found.tiny, 'text under 16 px').toEqual([]);
  expect(found.filled.length, `filled: ${found.filled.join(', ')}`).toBeLessThanOrEqual(1);
  expect(found.label, 'names that leave out the visible words').toEqual([]);
}

test.describe('Plan: a routine as a step', () => {
  test('the owner’s case: Add’s “a routine” adds Research after the doubts; its row says with {concerns} and gives {findings}; the input is chosen in its sheet', async ({ page }) => {
    await seedGo(page, [IMPROVE, RESEARCH]);
    const p = await planOf(page, 'improve');
    await p.screen.getByTestId('go-plan-add-routine').click();
    const pick = await sheet(page, 'go-routines-sheet');
    await expect(pick.getByTestId('go-routines-sheet-row')).toHaveText(['Improve my workout routine · gives {concerns} · asks {findings}', 'Research · gives {findings} · asks {concerns}']);
    await pick.getByRole('button', { name: /^Add as a step: Research/ }).click();
    await expect(page.getByTestId('go-routines-sheet')).toHaveCount(0);
    // Added at the end: Decide still asks for {findings}; moved up after the doubts, what Research gives is given above it.
    await expect(p.words).toHaveText(['List out my doubts', 'Decide using asks {findings}', 'Research']);
    await planMove(page, 'Research', 'up');
    await expect(p.words).toHaveText(['List out my doubts', 'Research', 'Decide using {findings}']);
    const row = callRow(page, 'Research');
    await expect(row.getByTestId('go-plan-input')).toHaveText(['with {concerns}']);
    await expect(row.getByTestId('go-plan-call-gives')).toHaveText('gives {findings}');
    await page.screenshot({ path: `${SHOTS}/plan-call-row.png` });

    await row.getByTestId('go-plan-input').click();
    const bind = await sheet(page, 'go-bind-sheet');
    await expect(bind.getByRole('heading', { level: 2 })).toHaveText('Research with {concerns}');
    await expect(bind.getByTestId('go-bind-name')).toHaveText(['{concerns}']);
    await page.screenshot({ path: `${SHOTS}/binding-sheet.png` });
    await bind.getByTestId('go-bind-ask').click();
    await expect(row.getByTestId('go-plan-input')).toHaveText(['asks {concerns}']);
    await row.getByTestId('go-plan-input').click();
    const again = await sheet(page, 'go-bind-sheet');
    await again.getByTestId('go-bind-words').fill('my knees');
    await again.getByTestId('go-bind-keep').click();
    await expect(row.getByTestId('go-plan-input')).toHaveText(['with my knees as concerns']);
    // Kept: after a reload, and in the export.
    await page.reload();
    await expect(callRow(page, 'Research').getByTestId('go-plan-input')).toHaveText(['with my knees as concerns']);
    const data = await exported(page);
    expect(data.routines.improve.items![1]).toMatchObject({ ref: 'research', words: 'Research', with: [{ input: 'concerns', typed: 'my knees' }] });
  });

  test('“@” at a word’s start lists routines (and names); typed words alone list none; Return adds the call where the words were going', async ({ page }) => {
    await seedGo(page, [IMPROVE, RESEARCH]);
    const p = await planOf(page, 'improve');
    await p.add.click();
    await p.add.fill('Research my knees');
    await expect(p.screen.getByTestId('go-names-routine')).toHaveCount(0);
    await p.add.fill('');
    await p.add.pressSequentially('@Res');
    await expect(p.screen.getByTestId('go-names-routine')).toHaveText(['Research']);
    await expect(p.screen.getByTestId('go-names-routine')).toHaveAccessibleName('Add Research as a step');
    await p.add.press('Enter');
    await expect(p.words).toHaveText(['List out my doubts', 'Decide using asks {findings}', 'Research']);
    await expect(p.add).toHaveValue('');
  });

  test('a routine as a step of itself is refused, in words — directly, and through another', async ({ page }) => {
    await seedGo(page, [CALLED, RESEARCH]);
    const p = await planOf(page, 'research');
    await p.screen.getByTestId('go-plan-add-routine').click();
    const pick = await sheet(page, 'go-routines-sheet');
    await pick.getByRole('button', { name: /^Add as a step: Improve my workout routine/ }).click();
    await expect(pick.getByTestId('go-routines-sheet-error')).toHaveText('! “Improve my workout routine” uses “Research”, so it can’t be a step of it');
    await pick.getByRole('button', { name: /^Add as a step: Research/ }).click();
    await expect(pick.getByTestId('go-routines-sheet-error')).toHaveText('! “Research” can’t be a step of itself');
    await expect(p.words).toHaveText(['Look into asks {concerns}', 'Note what I found']);
  });

  test('a call row’s ···: Open (its Plan), Edit inputs, Remove', async ({ page }) => {
    await seedGo(page, [CALLED, RESEARCH]);
    const p = await planOf(page, 'improve');
    await p.more('Research').click();
    const menu = await sheet(page, 'go-plan-menu');
    await expect(menu.locator('[role="menuitem"]:not([data-sr-close])')).toHaveText(['Open', 'Edit inputs', 'Add a step after', 'Remove']);
    await menu.getByRole('menuitem', { name: 'Edit inputs of Research' }).click();
    await expect(await sheet(page, 'go-bind-sheet')).toBeVisible();
    await page.keyboard.press('Escape');
    await p.more('Research').click();
    await (await sheet(page, 'go-plan-menu')).getByRole('menuitem', { name: 'Open Research' }).click();
    await expect(plan(page).title).toHaveText('Research');
  });
});

test.describe('running a call', () => {
  test('the owner’s case: Step in — Improve › Research, {concerns} from the doubts; what Research gives comes back to Decide', async ({ page }) => {
    await startGo(page, [{ id: 'v1', routine: 'improve', status: 'running' }], 'runner', [CALLED, RESEARCH]);
    const r = runner(page);
    await typeValue(page, 'concerns', 'form, time');
    await r.next.click();
    await expect(r.words).toHaveText('Research');
    // Nothing extra on the call itself: the moves only.
    await expect(r.fields).toHaveCount(0);
    await expect(r.stepIn).toBeVisible();
    await r.stepIn.click();
    await expect(r.context).toContainText('Improve my workout routine ›');
    await expect(r.context).toContainText('Research');
    await expect(r.values).toHaveText(['concerns: form, time · from List out my doubts']);
    await expect(r.words).toHaveText('Look into form, time');
    await page.screenshot({ path: `${SHOTS}/runner-inside-call.png` });
    await r.next.click();
    await typeValue(page, 'findings', 'shorter sets');
    await r.next.click();
    await expect(r.words).toHaveText('Decide using shorter sets');
    // After a reload, too.
    await page.reload();
    await expect(runner(page).words).toHaveText('Decide using shorter sets');
  });

  test('Next past a call not stepped into asks for what it gives; typed, it is given by the call; Step out asks too', async ({ page }) => {
    await startGo(page, [{ id: 'v1', routine: 'improve', at: 1, status: 'running' }], 'runner', [CALLED, RESEARCH]);
    const r = runner(page);
    await r.next.click();
    const owed = await sheet(page, 'go-owed-sheet');
    await expect(owed.getByRole('heading', { level: 2 })).toHaveText('Research');
    await expect(owed.getByTestId('go-owed-field')).toHaveAccessibleName('findings');
    await page.screenshot({ path: `${SHOTS}/owed-values.png` });
    await owed.getByTestId('go-owed-field').fill('rest more');
    await owed.getByTestId('go-owed-move').click();
    await expect(r.words).toHaveText('Decide using rest more');

    await startGo(page, [{ id: 'v2', routine: 'improve', at: 1, inner: [{ routine: 'research', at: 0 }], status: 'running' }], 'runner', [CALLED, RESEARCH]);
    const r2 = runner(page);
    await r2.stepOut.click();
    const out = await sheet(page, 'go-owed-sheet');
    await expect(out.getByTestId('go-owed-move')).toHaveText('Step out');
    // Left empty: it goes on, and the step that reads it asks.
    await out.getByTestId('go-owed-move').click();
    await expect(r2.words).toHaveText('Decide using {findings}');
    await expect(r2.field('findings')).toBeVisible();
  });
});

test.describe('Copy, and removing a routine that is called', () => {
  test('My routines’ ···: Copy… — the name suggested, a name in use refused in words, Copy with Undo', async ({ page }) => {
    await seedGo(page, [CALLED, RESEARCH]);
    await openGo(page);
    const list = await openRoutines(page);
    await list.more('Research').click();
    await (await sheet(page, 'go-routine-menu')).getByRole('menuitem', { name: 'Copy Research' }).click();
    const copy = await sheet(page, 'go-copy-sheet');
    await expect(copy.getByTestId('go-copy-name')).toHaveValue('Research (copy)');
    await page.screenshot({ path: `${SHOTS}/copy-sheet.png` });
    await copy.getByTestId('go-copy-name').fill('improve my workout routine');
    await copy.getByTestId('go-copy-confirm').click();
    await expect(copy.getByTestId('go-copy-error')).toHaveText('! Another routine has this name');
    await copy.getByTestId('go-copy-name').fill('Research (copy)');
    await copy.getByTestId('go-copy-confirm').click();
    await expect(list.names).toHaveText(['Improve my workout routine', 'Research', 'Research (copy)']);
    await expect(list.notice).toContainText('Copied “Research” as “Research (copy)”');
    await list.notice.getByRole('button', { name: /^Undo/ }).click();
    await expect(list.names).toHaveText(['Improve my workout routine', 'Research']);
  });

  test('Plan’s routine ···: Copy… makes the copy, with the same steps', async ({ page }) => {
    await seedGo(page, [CALLED, RESEARCH]);
    const p = await planOf(page, 'improve');
    await p.screen.getByTestId('go-plan-more').click();
    await (await sheet(page, 'go-plan-routine')).getByTestId('go-plan-copy-item').click();
    const copy = await sheet(page, 'go-copy-sheet');
    await copy.getByTestId('go-copy-confirm').click();
    await expect(page.getByTestId('go-copy-sheet')).toHaveCount(0);
    const data = await exported(page);
    const made = Object.values(data.routines).find((x) => x.words === 'Improve my workout routine (copy)')!;
    expect(made.items!.map((i) => i.text ?? i.ref)).toEqual(['List out my doubts', 'research', 'Decide using {findings}']);
  });

  test('removing a routine that is called: the confirm names where; the call then reads “(removed)” and can’t be stepped into', async ({ page }) => {
    await seedGo(page, [CALLED, RESEARCH]);
    await openGo(page);
    const list = await openRoutines(page);
    await list.more('Research').click();
    await (await sheet(page, 'go-routine-menu')).getByTestId('go-routine-remove').click();
    const confirm = page.getByTestId('go-remove-routine-confirm');
    await expect(confirm.getByTestId('go-confirm-body')).toHaveText('It goes from My routines, with its steps. “Improve my workout routine” uses it as a step; there it will read “(removed)”.');
    await confirm.getByRole('button', { name: 'Remove', exact: true }).click();
    const p = await planOf(page, 'improve');
    await expect(p.words).toHaveText(['List out my doubts', 'Research (removed)', 'Decide using asks {findings}']);
    await expect(callRow(page, 'Research (removed)').getByTestId('go-plan-input')).toHaveCount(0);
    await p.forward.click();
    const r = runner(page);
    await expect(r.words).toHaveText('List out my doubts');
    await r.next.click();
    await expect(r.words).toHaveText('Research (removed)');
    await expect(r.stepIn).toHaveCount(0);
    await r.next.click();
    await expect(r.words).toHaveText('Decide using {findings}');
  });
});

for (const [label, size] of [
  ['390×844', { width: 390, height: 844 }],
  ['200 % text (195×422)', { width: 195, height: 422 }],
] as const) {
  test(`accessibility at ${label}: Plan with a call row, the binding sheet, Add a routine, the runner inside a call, owed values, Copy`, async ({ page }) => {
    await page.setViewportSize(size);
    await seedGo(page, [CALLED, RESEARCH]);
    const p = await planOf(page, 'improve');
    await noSerious(page);
    await rules(page, p.screen);
    await callRow(page, 'Research').getByTestId('go-plan-input').click();
    const bind = await sheet(page, 'go-bind-sheet');
    await noSerious(page);
    await rules(page, bind);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('go-bind-sheet')).toHaveCount(0);
    await p.screen.getByTestId('go-plan-add-routine').click();
    const pick = await sheet(page, 'go-routines-sheet');
    await rules(page, pick);
    await page.keyboard.press('Escape');
    await p.screen.getByTestId('go-plan-more').click();
    await (await sheet(page, 'go-plan-routine')).getByTestId('go-plan-copy-item').click();
    const copy = await sheet(page, 'go-copy-sheet');
    await noSerious(page);
    await rules(page, copy);
    await page.keyboard.press('Escape');

    await startGo(page, [{ id: 'v1', routine: 'improve', at: 1, status: 'running', values: [{ name: 'concerns', items: ['form'], level: 0, seq: 'improve', item: 'improve-0', at: new Date().toISOString() }] }], 'runner', [CALLED, RESEARCH]);
    const r = runner(page);
    await r.next.click();
    const owed = await sheet(page, 'go-owed-sheet');
    await noSerious(page);
    await rules(page, owed);
    await owed.getByTestId('go-owed-close').click();
    await r.stepIn.click();
    await expect(r.values).toHaveText(['concerns: form · from List out my doubts']);
    await noSerious(page);
    await rules(page, r.screen);
    if (size.width < 300) await page.screenshot({ path: `${SHOTS}/runner-inside-call-200.png` });
  });
}
