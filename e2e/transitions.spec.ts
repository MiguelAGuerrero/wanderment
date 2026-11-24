/**
 * P-72: transitions that move through the picture. Trailhead → sky looks up (the hills sink, the stars
 * fade in); a star → its landmarks rise and the wanderer walks to camp; a trail → the wanderer walks up
 * the path; back reverses it; Map dims in like dusk. Each is short, never blocks input, never moves
 * the layout, and under Reduce Motion nothing moves. The screen arrived at says which it played
 * (`data-passage`, `data-reverse`) and whether it's still moving (`data-moving`).
 */
import { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { legacyBlob, seedScript } from './graphFixture';

const DAY = 864e5;
const PROMPT = 'Where are we wandering today?';
const ILLUSTRATE = 'become an illustrator';
const field = (page: Page) => page.getByRole('textbox', { name: PROMPT, exact: true });
const stars = (page: Page) => page.getByRole('list', { name: 'What it’s for', exact: true }).getByRole('button');
const shown = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true });
const transforms = (l: Locator) => l.evaluateAll((els) => els.map((el) => getComputedStyle(el).transform));
const opacities = (l: Locator) => l.evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));

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
  await page.goto('./');
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
  test('under Reduce Motion nothing moves between screens, there and back', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);

    await page.getByRole('link', { name: 'I’m not sure', exact: true }).click();
    await expect(shown(page, 'look-up')).toHaveAttribute('data-passage', 'none');
    await expect(shown(page, 'look-up')).toHaveAttribute('data-moving', 'false');
    const hills = shown(page, 'look-up').getByTestId('sky-ground');
    const glyphs = shown(page, 'look-up').getByTestId('passage-stars');
    const at = { hills: await transforms(hills), glyphs: await opacities(glyphs) };
    expect(at.hills.every((t) => t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)')).toBe(true);
    expect(at.glyphs.every((o) => o === '1')).toBe(true);
    await page.waitForTimeout(700);
    expect({ hills: await transforms(hills), glyphs: await opacities(glyphs) }).toEqual(at);

    await stars(page).first().click();
    await expect(shown(page, 'under-star')).toHaveAttribute('data-passage', 'none');
    await expect(page.getByTestId('passage-wanderer')).toHaveCount(0);

    await page.goBack();
    await expect(shown(page, 'look-up')).toHaveAttribute('data-passage', 'none');
    await page.goBack();
    await expect(shown(page, 'trailhead')).toHaveAttribute('data-passage', 'none');

    await page.getByRole('link', { name: 'Map', exact: true }).click();
    await expect(page).toHaveURL(/\/map$/);
    await expect(shown(page, 'map')).toHaveAttribute('data-passage', 'none');
    await expect(page.getByTestId('passage-veil')).toHaveCount(0);
  });

  test('looking up sinks the hills and fades the stars in; the sky is usable at once and settles within ~600 ms', async ({ page }) => {
    await open(page);
    await page.getByRole('link', { name: 'I’m not sure', exact: true }).click();
    await expectPassage(page, 'look-up', 'look-up', false);
    // Focus lands on the screen's heading.
    await expect(shown(page, 'look-up').getByRole('heading', { name: PROMPT })).toBeFocused();
    // No layout jump: the heading and the stars are where they'll stay from the first frame.
    const heading = shown(page, 'look-up').getByRole('heading', { name: PROMPT });
    const first = { heading: await heading.boundingBox(), star: await stars(page).first().boundingBox() };
    await expect(shown(page, 'look-up')).toHaveAttribute('data-moving', 'false', SETTLED);
    expect({ heading: await heading.boundingBox(), star: await stars(page).first().boundingBox() }).toEqual(first);
    expect((await opacities(shown(page, 'look-up').getByTestId('passage-stars'))).every((o) => o === '1')).toBe(true);
  });

  test('never blocks input: a star opens mid-transition, its landmarks rise and the wanderer walks to camp; a trail, up the path', async ({ page }) => {
    await open(page);
    await page.getByRole('link', { name: 'I’m not sure', exact: true }).click();
    // At once, while the sky is still moving.
    await stars(page).first().click({ noWaitAfter: true, timeout: 300 });
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

  test('going back reverses it: trail → star → sky → trailhead', async ({ page }) => {
    await open(page);
    await page.getByRole('link', { name: 'I’m not sure', exact: true }).click();
    await stars(page).first().click();
    await page.getByRole('list', { name: 'Wanders', exact: true }).getByRole('button').first().click();
    await expect(page).toHaveURL(/\/trail\//);

    await page.goBack();
    await expect(page).toHaveURL(/\/star\//);
    await expectPassage(page, 'under-star', 'walk-up', true);
    await page.goBack();
    await expect(page).toHaveURL(/\/sky$/);
    await expectPassage(page, 'look-up', 'landmarks', true);
    await page.goBack();
    await expect(field(page)).toBeVisible();
    await expectPassage(page, 'trailhead', 'look-up', true);
    await expect(shown(page, 'trailhead')).toHaveAttribute('data-moving', 'false', SETTLED);
    // The field is the trailhead's first stop, as before.
    await expect(field(page)).toBeFocused();
  });

  test('Map dims in like dusk; leaving it reverses it; the veil never takes a tap', async ({ page }) => {
    await open(page);
    await page.getByRole('link', { name: 'Map', exact: true }).click();
    await expect(page).toHaveURL(/\/map$/);
    await expectPassage(page, 'map', 'dusk', false);
    // Usable at once, under the veil.
    await page.getByRole('button', { name: 'Back to the prompt', exact: true }).click({ timeout: 300 });
    await expect(field(page)).toBeVisible();
    await expectPassage(page, 'trailhead', 'dusk', true);
    await expect(shown(page, 'trailhead')).toHaveAttribute('data-moving', 'false', SETTLED);
    await expect(page.getByTestId('passage-veil').filter({ visible: true })).toHaveCount(0);
  });
});
