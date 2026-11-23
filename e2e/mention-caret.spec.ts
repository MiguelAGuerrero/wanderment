import { Page } from '@playwright/test';

import { expect, logBox, openHome, openSheet, openWanders, test } from './fixtures';

async function makeThreads(page: Page, names: string[]) {
  for (const name of names) {
    await logBox(page).fill(`started @${name}`);
    await page.getByRole('option', { name: `+ New wander “${name}”` }).click();
    await logBox(page).press('Enter');
    await expect(page.getByText('Logged →', { exact: false })).toBeVisible(); // P-61: was “Logged → to”
  }
}

/** Types "sketched and then more", then " @make" with the caret after "sketched". */
async function mentionMidSentence(page: Page) {
  const box = logBox(page);
  await box.fill('sketched and then more');
  await box.press('Home');
  for (let i = 0; i < 'sketched'.length; i++) await box.press('ArrowRight');
  await box.pressSequentially(' @make');
  await expect(box).toHaveValue('sketched @make and then more');
}

const caretOf = (page: Page) => logBox(page).evaluate((el: HTMLInputElement) => [el.selectionStart, el.selectionEnd]);

test('@ in the middle of a sentence: suggestions for the word at the caret, picking replaces only it', async ({ page }) => {
  await openHome(page);
  await makeThreads(page, ['make apparel', 'make music']);
  await mentionMidSentence(page);

  // The query is "make", not "make and then more".
  const music = page.getByRole('option', { name: /^make music/ });
  const apparel = page.getByRole('option', { name: /^make apparel/ });
  await expect(music).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('option', { name: '+ New wander “make”' })).toBeVisible();
  await expect(page.getByRole('option', { name: /and then more/ })).toHaveCount(0);
  await expect(page.getByTestId('mention-highlight')).toHaveText('@make');
  await expect(page.getByText('2 wanders match, make music selected')).toBeAttached();

  await logBox(page).press('ArrowDown');
  await expect(apparel).toHaveAttribute('aria-selected', 'true');
  await logBox(page).press('Tab');
  await expect(logBox(page)).toHaveValue('sketched and then more');
  await expect(page.getByRole('button', { name: 'To: make apparel. Remove' })).toBeVisible();
  await expect(logBox(page)).toBeFocused();
  // The caret sits where the @word was, so typing carries on there.
  await expect.poll(() => caretOf(page)).toEqual([9, 9]);
  await expect(apparel).toHaveCount(0);

  await logBox(page).press('Enter');
  await expect(page.getByText('Logged → make apparel')).toBeVisible(); // P-61: was “Logged → to make apparel”
  await openSheet(page, 'Activities'); // P-58: a section of Home's sheet (was a tab)
  await expect(page.getByText('sketched and then more', { exact: true }).filter({ visible: true })).toBeVisible();
});

test('tapping a suggestion mid-sentence also keeps the tail and puts the caret at the join', async ({ page }) => {
  await openHome(page);
  await makeThreads(page, ['make apparel', 'make music']);
  await mentionMidSentence(page);

  await page.getByRole('option', { name: /^make apparel/ }).click();
  await expect(logBox(page)).toHaveValue('sketched and then more');
  await expect(page.getByRole('button', { name: 'To: make apparel. Remove' })).toBeVisible();
  await expect(logBox(page)).toBeFocused();
  await expect.poll(() => caretOf(page)).toEqual([9, 9]);

  // Typing carries on at the join, not at the end.
  await logBox(page).pressSequentially('quickly ');
  await expect(logBox(page)).toHaveValue('sketched quickly and then more');
});

test('Return with the menu open mid-sentence logs the text as typed and picks or creates nothing', async ({ page }) => {
  await openHome(page);
  await makeThreads(page, ['make apparel', 'make music']);
  await mentionMidSentence(page);
  await expect(page.getByRole('option', { name: /^make music/ })).toBeVisible();

  await logBox(page).press('Enter');
  await expect(page.getByText('Logged', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(logBox(page)).toHaveValue('');
  await openSheet(page, 'Activities'); // P-58: a section of Home's sheet (was a tab)
  await page.getByRole('tab', { name: 'No wander' }).click();
  await expect(page.getByText('sketched @make and then more', { exact: true }).filter({ visible: true })).toBeVisible();
  await page.goto('./settings');
  await expect(page.getByText('3 activities · 2 wanders')).toBeVisible();
});

test('the menu follows the caret: a selection or a caret outside the @word closes it, Esc keeps it closed', async ({ page }) => {
  await openHome(page);
  await makeThreads(page, ['make apparel']);
  await mentionMidSentence(page);
  const apparel = page.getByRole('option', { name: /^make apparel/ });
  const box = logBox(page);
  await expect(apparel).toBeVisible();

  // A selected range is not a caret: no menu, no highlight.
  await box.press('Shift+ArrowLeft');
  await expect(apparel).toHaveCount(0);
  await expect(page.getByTestId('mention-highlight')).toHaveCount(0);
  await box.press('ArrowRight');
  await expect(apparel).toBeVisible();

  // Mid-word, the highlight still covers the whole @word.
  await box.press('ArrowLeft');
  await box.press('ArrowLeft');
  await expect(page.getByTestId('mention-highlight')).toHaveText('@make');
  await expect(apparel).toBeVisible();

  // Before the @, there is no mention.
  for (let i = 0; i < 4; i++) await box.press('ArrowLeft');
  await expect(apparel).toHaveCount(0);
  await expect(page.getByTestId('mention-highlight')).toHaveCount(0);

  // Esc closes it, and typing on in the same @word keeps it closed.
  for (let i = 0; i < 6; i++) await box.press('ArrowRight');
  await expect(apparel).toBeVisible();
  await box.press('Escape');
  await expect(apparel).toHaveCount(0);
  await box.pressSequentially(' a');
  await expect(box).toHaveValue('sketched @make a and then more');
  await expect(apparel).toHaveCount(0);
});

test('text loaded from outside puts the caret at the end, not where it was', async ({ page }) => {
  await openWanders(page);
  await logBox(page).fill('practiced scales @play guitar');
  await page.getByRole('option', { name: /New wander “play guitar”/ }).click();
  await logBox(page).press('Enter');
  const nextInput = page.getByRole('textbox', { name: 'Optional next step for play guitar' });
  await nextInput.fill('tune up for @pla');
  await nextInput.press('Enter');

  // Leave the caret early in a whitespace-only box (which "Log this" still replaces; a line with
  // text is kept since D-6), then load the next step.
  await logBox(page).fill('   ');
  await logBox(page).press('Home');
  await logBox(page).press('ArrowRight');
  await page.getByRole('button', { name: 'tune up for @pla Log this' }).click();
  await expect(logBox(page)).toHaveValue('tune up for @pla');
  await expect(page.getByRole('option', { name: /^play guitar/ })).toBeVisible();
  await expect(page.getByTestId('mention-highlight')).toHaveText('@pla');
});

test('the @ highlight never hides what you type, and taps on it reach the input', async ({ page }) => {
  await openHome(page);
  await logBox(page).fill('sketched @make');
  const mark = page.getByTestId('mention-highlight');
  await expect(mark).toHaveText('@make');
  const box = await mark.boundingBox();
  expect(box).not.toBeNull();
  // The topmost element over the highlighted word is the input itself, so the word is visible and clickable.
  const topIsInput = await page.evaluate(
    ([x, y]) => document.elementFromPoint(x, y)?.tagName === 'INPUT',
    [box!.x + box!.width / 2, box!.y + box!.height / 2],
  );
  expect(topIsInput).toBe(true);
});

test('the contract’s keystrokes: "@make" typed right in front of "and" keeps "and" (audit B, finding 1)', async ({ page }) => {
  await openHome(page);
  await makeThreads(page, ['make apparel', 'make music']);
  const box = logBox(page);
  await box.fill('sketched and then more');
  await box.press('Home');
  for (let i = 0; i < 'sketched '.length; i++) await box.press('ArrowRight');
  await box.pressSequentially('@make');
  await expect(box).toHaveValue('sketched @makeand then more');
  await expect(page.getByTestId('mention-highlight')).toHaveText('@make');
  await box.press('ArrowDown');
  await box.press('Tab');
  await expect(box).toHaveValue('sketched and then more');
  await expect(page.getByRole('button', { name: 'To: make apparel. Remove' })).toBeVisible();
});

test('an @ typed in front of a word, then picked, keeps the word (audit B, finding 1)', async ({ page }) => {
  await openHome(page);
  await makeThreads(page, ['sew']);
  const box = logBox(page);
  await box.fill('finished the hem');
  await box.press('End');
  for (let i = 0; i < 'hem'.length; i++) await box.press('ArrowLeft');
  await box.pressSequentially('@');
  await page.getByRole('option', { name: /^sew/ }).click();
  await expect(box).toHaveValue('finished the hem');
  await expect(page.getByRole('button', { name: 'To: sew. Remove' })).toBeVisible();
});

test('an unmatched "@word and more" mid-sentence offers no new thread (audit B, finding 7)', async ({ page }) => {
  await openHome(page);
  const box = logBox(page);
  await box.fill('went @zzq and then home');
  await box.press('End');
  for (let i = 0; i < ' home'.length; i++) await box.press('ArrowLeft');
  await expect(page.getByRole('option', { name: /New thread/ })).toHaveCount(0);
  // At the end of the text, a multi-word new thread is still offered.
  await box.fill('went @zzq and');
  await expect(page.getByRole('option', { name: '+ New wander “zzq and”' })).toBeVisible();
});
