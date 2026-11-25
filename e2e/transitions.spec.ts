/**
 * P-72: transitions that move through the picture. Trailhead → sky looks up (the hills sink, the stars
 * fade in); a star → its landmarks rise and the wanderer walks to camp; a trail → the wanderer walks up
 * the path; back reverses it. (P-81/P-83: "I'm not sure" lights the map in place, with no passage, and
 * Map's dusk is retired with Map; the rise still looks up.) Each is short, never blocks input, never moves
 * the layout, and under Reduce Motion nothing moves. The screen arrived at says which it played
 * (`data-passage`, `data-reverse`) and whether it's still moving (`data-moving`).
 */
import { Locator, Page } from '@playwright/test';

import { AT_OLD, expect, OLD, test } from './fixtures';
import { legacyBlob, seedScript } from './graphFixture';

const DAY = 864e5;
const PROMPT = 'Where are we wandering today?';
const ILLUSTRATE = 'become an illustrator';
const field = (page: Page) => page.getByRole('textbox', { name: PROMPT, exact: true });
/** P-81: the lit map's why nodes (was the look-up's stars). */
const stars = (page: Page) => page.locator('[data-testid="lit-node"][data-kind="why"]');
const shown = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true });
const transforms = (l: Locator) => l.evaluateAll((els) => els.map((el) => getComputedStyle(el).transform));

/** A why with two wanders (so a star opens what's under it), one with a step. */
function world() {
  const json = JSON.parse(
    legacyBlob(
      [ILLUSTRATE, 'draw better hands', 'color sense'],
      [
        { from: 'draw better hands', to: [ILLUSTRATE], text: 'sketched a hand', daysAgo: 0 },
        { from: 'color sense', to: [ILLUSTRATE], text: 'mixed greys', daysAgo: 3 },
      ],
    ),
  );
  json.state.data.threads[ILLUSTRATE].declaredAt = new Date(Date.now() - 30 * DAY).toISOString();
  json.state.data.threads['draw better hands'].next = 'Sketch hands from photo refs';
  return JSON.stringify(json);
}

async function open(page: Page) {
  await page.addInitScript(seedScript, world());
  await page.goto(OLD);
  await expect(field(page)).toBeVisible();
}

/** The screen `id` played `kind` (a screen kept in the stack is marked again each time it's back in front). */
async function expectPassage(page: Page, id: string, kind: string, reverse: boolean) {
  await expect(shown(page, id)).toHaveAttribute('data-passage', kind);
  await expect(shown(page, id)).toHaveAttribute('data-reverse', String(reverse));
}
/** Short: at rest within ~600 ms of arriving (the extra is the browser's, not the transition's). */
const SETTLED = { timeout: 1500 };

test.describe('transitions through the picture', () => {
  // P-81: "I'm not sure" lights the map in place (no passage); P-83: Map (and its dusk) is retired.
  test('under Reduce Motion nothing moves between screens, there and back', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);

    await page.getByRole('button', { name: 'I’m not sure — light up the map', exact: true }).click();
    await expect(page).toHaveURL(/\/sky$/);
    await expect(shown(page, 'trailhead')).toHaveAttribute('data-passage', 'none');
    await expect(shown(page, 'trailhead')).toHaveAttribute('data-moving', 'false');
    const hills = page.getByTestId('sky-ground').filter({ visible: true });
    const at = await transforms(hills);
    expect(at.every((t) => t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)')).toBe(true);
    await page.waitForTimeout(700);
    expect(await transforms(hills)).toEqual(at);

    await stars(page).first().click();
    await expect(shown(page, 'under-star')).toHaveAttribute('data-passage', 'none');
    await expect(page.getByTestId('passage-wanderer')).toHaveCount(0);

    await page.goBack();
    await expect(shown(page, 'trailhead')).toHaveAttribute('data-passage', 'none');

    // The rise (Return) too.
    await field(page).fill('stood still');
    await field(page).press('Enter');
    await expect(shown(page, 'rise')).toHaveAttribute('data-passage', 'none');
    await expect(page.getByTestId('passage-veil')).toHaveCount(0);
  });

  // P-81: was "looking up" from I'm not sure (the look-up session, retired); the rise still looks up.
  test('the rise looks up: the hills sink and the stars fade in; usable at once and settled within ~600 ms', async ({ page }) => {
    await open(page);
    await field(page).fill('looked up');
    await field(page).press('Enter');
    await expectPassage(page, 'rise', 'look-up', false);
    // Focus lands on the screen's heading (the words).
    const heading = page.getByTestId('trail-words');
    await expect(heading).toBeFocused();
    // No layout jump: the words are where they'll stay from the first frame.
    const first = await heading.boundingBox();
    await expect(shown(page, 'rise')).toHaveAttribute('data-moving', 'false', SETTLED);
    expect(await heading.boundingBox()).toEqual(first);
  });

  test('never blocks input: a lit node opens its star at once, its landmarks rise and the wanderer walks to camp; a trail, up the path', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'I’m not sure — light up the map', exact: true }).click();
    // Lighting is in place: its nodes take a tap at once.
    await stars(page).first().click({ noWaitAfter: true });
    await expect(page).toHaveURL(/\/star\//);
    await expectPassage(page, 'under-star', 'landmarks', false);
    await expect(shown(page, 'under-star').getByRole('heading', { name: ILLUSTRATE })).toBeFocused();
    await expect(shown(page, 'under-star')).toHaveAttribute('data-moving', 'false', SETTLED);
    await expect(page.getByTestId('passage-wanderer').filter({ visible: true })).toHaveCount(0);

    await page.getByRole('list', { name: 'Wanders', exact: true }).getByRole('button').first().click();
    await expect(page).toHaveURL(/\/trail\//);
    await expectPassage(page, 'trail', 'walk-up', false);
    await expect(shown(page, 'trail').getByRole('heading').first()).toBeFocused();
    await expect(shown(page, 'trail')).toHaveAttribute('data-moving', 'false', SETTLED);
  });

  test('going back reverses it: trail → star → the lit home → at rest', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'I’m not sure — light up the map', exact: true }).click();
    await stars(page).first().click();
    await page.getByRole('list', { name: 'Wanders', exact: true }).getByRole('button').first().click();
    await expect(page).toHaveURL(/\/trail\//);

    await page.goBack();
    await expect(page).toHaveURL(/\/star\//);
    await expectPassage(page, 'under-star', 'walk-up', true);
    await page.goBack();
    await expect(page).toHaveURL(/\/sky$/);
    await expectPassage(page, 'trailhead', 'landmarks', true);
    await expect(shown(page, 'trailhead')).toHaveAttribute('data-moving', 'false', SETTLED);
    // The field is the trailhead's first stop, as before.
    await expect(field(page)).toBeFocused();
    await page.goBack();
    await expect(page).toHaveURL(AT_OLD);
    await expect(field(page)).toBeVisible();
  });
});
