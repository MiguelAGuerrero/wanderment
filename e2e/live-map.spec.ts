/**
 * P-79 + P-80 (B-09 slices 1–2, D-16): the home at rest is a live map above a composer at the bottom.
 * P-79: the question is a small heading in the composer; "I'm not sure" is a chip right above the field
 * (a toggle: pressed state, a non-colour mark, named "I'm not sure — light up the map"); the field and
 * its send ↑; P-61's suggestions open above (the composer grows, the map yields); keyboard-up-like short
 * windows collapse the heading. P-80: a random few of the last three weeks' lines (drawn once a day, places
 * from ids, never redrawn while on screen), each a small light with its words and when in words; a tap
 * opens the line (the rise, reopened); beyond three weeks a calm sky; field first, then "Recent".
 */
import { AxeBuilder } from '@axe-core/playwright';
import { Locator, Page } from '@playwright/test';

import { AT_OLD, expect, OLD, test } from './fixtures';
import { seedScript } from './graphFixture';

const SHOTS = process.env.E2E_SHOTS; // set to a folder to save screenshots for a visual check
const DAY = 864e5;
const PROMPT = 'Where are we wandering today?';
const UNSURE = 'I’m not sure — light up the map';
/** The live map's few (FEED_MAX in src/domain/feed.ts). */
const FEED_MAX = 5;

const field = (page: Page) => page.getByRole('textbox', { name: PROMPT, exact: true });
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const unsure = (page: Page) => button(page, UNSURE);
const send = (page: Page) => button(page, 'Log');
const recent = (page: Page) => page.getByRole('group', { name: 'Recent', exact: true });
const lines = (page: Page) => recent(page).getByRole('button');
const suggestions = (page: Page) => page.getByRole('listbox', { name: 'Suggestions' });
const AT_REST = AT_OLD;

async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = serious.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => `${n.target.join(' ')} ${n.html.slice(0, 200)}`).slice(0, 5).join('\n  ')}`);
  expect(report, report.join('\n')).toEqual([]);
}

/** WCAG contrast of two `rgb(…)` colours. */
function contrast(a: string, b: string) {
  const lum = (c: string) => {
    const [r, g, bl] = c.match(/\d+(\.\d+)?/g)!.slice(0, 3).map((v) => Number(v) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
/** The night's lightest sky colour (N.skyLow), the worst case behind the map's words. */
const SKY_LOW = 'rgb(43, 34, 56)';

type Line = { text: string; daysAgo: number; lit?: boolean; note?: string; doing?: string; to?: string[] };
/** draw and feel productive (declared, so there's a guiding star); `lines` as given. */
function world(lines: Line[], { shading = true } = {}) {
  const now = Date.now();
  const threads: Record<string, unknown> = {};
  for (const name of ['draw', 'feel productive']) threads[name] = { id: name, name, hidden: false, createdAt: new Date(now - 200 * DAY).toISOString() };
  (threads['feel productive'] as Record<string, unknown>).declaredAt = new Date(now - 30 * DAY).toISOString();
  const activities: Record<string, unknown> = {};
  lines.forEach((l, i) => {
    const at = new Date(now - l.daysAgo * DAY).toISOString();
    activities[`a${i}`] = { id: `a${i}`, text: l.text, occurredAt: at, createdAt: at, toIds: l.to ?? [], ...(l.doing && { doingId: l.doing }), ...(l.lit && { lit: true }), ...(l.note && { note: l.note }) };
  });
  return JSON.stringify({ state: { data: { version: 1, threads, activities }, showShading: shading }, version: 1 });
}
const FEW: Line[] = [
  { text: 'sketched hands', daysAgo: 0.05, lit: true, note: 'quick ones, two minutes each' },
  { text: 'read on the bus', daysAgo: 1.2 },
  { text: 'cleaned the kitchen', daysAgo: 2, to: ['feel productive'] },
  { text: 'called mum', daysAgo: 9 },
  { text: 'a line from long ago', daysAgo: 40 },
];
/** Many lines in the last three weeks (more than the few), and some older. */
const MANY: Line[] = [...Array.from({ length: 14 }, (_, i) => ({ text: `recent line ${i}`, daysAgo: i * 1.4 + 0.1 })), ...Array.from({ length: 4 }, (_, i) => ({ text: `old line ${i}`, daysAgo: 25 + i * 10 }))];

async function open(page: Page, seed: string) {
  await page.addInitScript(seedScript, seed);
  await page.goto(OLD);
  await expect(field(page)).toBeVisible();
}

/** Each line's words and box. */
const placed = (page: Page) =>
  lines(page).evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { name: el.getAttribute('aria-label'), x: Math.round(r.x), y: Math.round(r.y) };
    }),
  );
const box = async (l: Locator) => (await l.boundingBox())!;

test.describe('the composer at the bottom (P-79)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the question is a small heading in a composer at the foot: I’m not sure right above the field, the field and its send ↑, all in thumb reach', async ({ page }) => {
    await open(page, world(FEW));
    const heading = page.getByRole('heading', { name: PROMPT, exact: true });
    await expect(heading).toBeVisible();
    // Small: one line of about 22 pt, not the old billboard.
    expect(parseFloat(await heading.evaluate((el) => getComputedStyle(el).fontSize))).toBeLessThanOrEqual(24);
    const [h, chip, f, s] = [await box(heading), await box(unsure(page)), await box(field(page)), await box(send(page))];
    // In thumb reach: the field in the bottom ~quarter, the composer's parts in order heading → chip → field.
    expect(f.y + f.height).toBeGreaterThan(844 - 120);
    expect(h.y + h.height).toBeLessThanOrEqual(chip.y);
    expect(chip.y + chip.height).toBeLessThanOrEqual(f.y);
    expect(f.y - (chip.y + chip.height)).toBeLessThanOrEqual(24); // right above it (was ~250 px away)
    // The send ↑ is beside the field, there while empty (disabled), working once there are words.
    expect(Math.abs(s.y + s.height / 2 - (f.y + f.height / 2))).toBeLessThanOrEqual(8);
    await expect(send(page)).toBeDisabled();
    for (const b of [chip, s]) expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(44);
    await field(page).fill('went for a walk');
    await expect(send(page)).toBeEnabled();
    await send(page).click();
    await expect(page.getByTestId('trail-words')).toHaveText('went for a walk');
    await expectNoSeriousViolations(page);
  });

  test('“I’m not sure” is a toggle: pressed state, named for what it does, a mark that isn’t colour; it lights the map (`/sky`, P-81)', async ({ page }) => {
    await open(page, world(FEW));
    await expect(unsure(page)).toHaveAttribute('aria-pressed', 'false');
    await expect(unsure(page)).toContainText('I’m not sure');
    // The mark: an outlined star while off (P-81 fills it, on a filled chip, while the map is lit).
    const mark = unsure(page).locator('path');
    await expect(mark).toHaveAttribute('fill', 'none');
    await unsure(page).click();
    await expect(page).toHaveURL(/\/wanderment\/sky$/);
    // P-81: pressed while lit, its star filled.
    await expect(unsure(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(mark).not.toHaveAttribute('fill', 'none');
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(AT_REST);
    // P-81: lighting is in place (nothing remounts), so focus stays on the chip (was: back in the field after the look-up session).
    await expect(unsure(page)).toBeFocused();
  });

  test('typing: suggestions and the done chip live in the composer — it grows upward; the chip, the field and the map’s lines stay put', async ({ page }) => {
    await open(page, world(FEW));
    const before = { chip: await box(unsure(page)), field: await box(field(page)), lines: await placed(page) };
    await field(page).pressSequentially('cl');
    await expect(suggestions(page)).toBeVisible();
    await expect(page.getByRole('switch', { name: 'done', exact: true })).toBeVisible();
    const list = await box(suggestions(page));
    expect(list.y + list.height).toBeLessThanOrEqual(before.chip.y);
    expect(await box(unsure(page))).toEqual(before.chip);
    expect(await box(field(page))).toEqual(before.field);
    // The map yields: no line moves; one the composer would reach is left out until it shrinks.
    for (const l of await placed(page)) expect(before.lines).toContainEqual(l);
    for (const l of await placed(page)) expect(l.y + 44).toBeLessThanOrEqual(list.y);
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p79-typing.png` });
  });

  test('a short window (as with the keyboard up) collapses the heading; the field and its chip stay in view', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 480 });
    await open(page, world(FEW));
    await expect(field(page)).toBeInViewport({ ratio: 1 });
    await expect(unsure(page)).toBeInViewport({ ratio: 1 });
    // Collapsed: out of sight, still the page's heading (and the field's name) for a screen reader.
    await expect(page.getByRole('heading', { name: PROMPT, exact: true })).toHaveCount(1);
    expect((await box(page.getByRole('heading', { name: PROMPT, exact: true }))).height).toBeLessThanOrEqual(1);
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p79-short.png` });
  });
});

test.describe('the live map at rest (P-80)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('a few of the last three weeks’ lines, each a light with its words and when in words; readable (4.5:1); no chat bubbles, no counts', async ({ page }) => {
    await open(page, world(FEW));
    // Newest first in reading order, words then when (in words; the shown “·” is a comma); the 40-day-old line isn't there.
    await expect(lines(page)).toHaveCount(4);
    const names = await lines(page).evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')));
    const expected = [/^sketched hands, (today|yesterday)$/, /^read on the bus, (yesterday|on \w+day)$/, /^cleaned the kitchen, (yesterday|on \w+day)$/, /^called mum, (last week|on \w+day)$/];
    expected.forEach((re, i) => expect(names[i]).toMatch(re));
    for (const [i, l] of (await lines(page).all()).entries()) await expect(l).toHaveText(names[i]!.replace(', ', ' · '));
    await expect(page.getByText('a line from long ago')).toHaveCount(0);
    // Lit and settled look alike (both a light with a glow; the state is only known).
    await expect(page.locator('[data-testid="rest-line"][data-state="lit"]')).toHaveCount(1);
    await expect(page.getByTestId('rest-glow')).toHaveCount(4);
    for (const l of await lines(page).all()) {
      const b = await box(l);
      expect(b.height).toBeGreaterThanOrEqual(44);
      // Words and when: never faded below 4.5:1, at least 13 pt; no box around them (no chat bubble).
      const looks = await l.evaluate((el) => {
        const texts = [...el.querySelectorAll('div[dir="auto"], span')].map((t) => getComputedStyle(t));
        const cs = getComputedStyle(el);
        return { colours: texts.map((t) => t.color), opacities: texts.map((t) => t.opacity), size: Math.min(...texts.map((t) => parseFloat(t.fontSize))), bg: cs.backgroundColor, border: cs.borderTopWidth };
      });
      for (const c of looks.colours) expect(contrast(c, SKY_LOW)).toBeGreaterThanOrEqual(4.5);
      for (const o of looks.opacities) expect(Number(o)).toBe(1);
      expect(looks.size).toBeGreaterThanOrEqual(13);
      expect(looks.bg).toBe('rgba(0, 0, 0, 0)');
      expect(looks.border).toBe('0px');
    }
    // The night, hills and lantern stay; the lines sit above the ground.
    const lantern = await box(page.getByTestId('sky-lantern'));
    for (const l of await placed(page)) expect(l.y + 44).toBeLessThanOrEqual(lantern.y + lantern.height / 2);
    await expect(page.getByText(/\d+ (lines?|days?)|away|missed/i)).toHaveCount(0);
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p80-rest.png` });
  });

  test('many lines: a random few (at most five), never older than three weeks; the same set in the same places all day, never redrawn while on screen', async ({ page }) => {
    await page.clock.setFixedTime(new Date());
    await open(page, world(MANY));
    await expect(lines(page)).toHaveCount(FEED_MAX);
    const first = await placed(page);
    for (const l of first) expect(l.name).toMatch(/^recent line \d+, /);
    // On screen it stays exactly as drawn.
    await page.waitForTimeout(2500);
    expect(await placed(page)).toEqual(first);
    // Coming back the same day (a reload): the same few, in the same places.
    await page.reload();
    await expect(lines(page)).toHaveCount(FEED_MAX);
    expect(await placed(page)).toEqual(first);
  });

  test('field first, then the “Recent” group (newest first) in reading and Tab order', async ({ page }) => {
    await open(page, world(FEW));
    const order = await page.evaluate(() => {
      const f = document.querySelector('input[aria-label="Where are we wandering today?"]')!;
      const g = document.querySelector('[aria-label="Recent"]')!;
      return f.compareDocumentPosition(g) & Node.DOCUMENT_POSITION_FOLLOWING;
    });
    expect(order).toBeTruthy();
    await expect(field(page)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(unsure(page)).toBeFocused();
    await page.keyboard.press('Tab');
    // P-83: the grabber (was: Map's link).
    await expect(button(page, 'Wanders and activities')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(lines(page).first()).toBeFocused();
    await expect(lines(page).first()).toHaveAttribute('aria-label', /^sketched hands, /);
  });

  test('tapping a line opens it: its words, its note, and its choices while lit; a settled one has none; Esc comes back down', async ({ page }) => {
    await open(page, world(FEW));
    await lines(page).filter({ hasText: 'sketched hands' }).click();
    await expect(page).toHaveURL(/\/wanderment\/line\/a0$/);
    await expect(page.getByRole('heading', { name: 'sketched hands', exact: true })).toBeVisible();
    await expect(page.getByTestId('rise-note')).toHaveText('quick ones, two minutes each');
    await expect(button(page, 'Done it')).toBeVisible();
    // Opened again: there's no Return to take back.
    await expect(button(page, 'Undo')).toHaveCount(0);
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p80-opened.png` });
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(AT_REST);
    await lines(page).filter({ hasText: 'called mum' }).click();
    await expect(page.getByRole('heading', { name: 'called mum', exact: true })).toBeVisible();
    await expect(button(page, 'Done it')).toHaveCount(0);
    await expect(button(page, 'First step')).toHaveCount(0);
    // An attached line says where it went.
    await page.keyboard.press('Escape');
    await lines(page).filter({ hasText: 'cleaned the kitchen' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Logged → feel productive' })).toBeVisible();
  });

  test('beyond three weeks: a calm sky — no lines, no copy about it', async ({ page }) => {
    await open(page, world([{ text: 'an old one', daysAgo: 30 }, { text: 'older still', daysAgo: 90 }]));
    await expect(recent(page)).toHaveCount(0);
    await expect(page.getByTestId('rest-line')).toHaveCount(0);
    await expect(page.getByText(/old one|older still|nothing|away|weeks/i)).toHaveCount(0);
    await expect(page.getByTestId('sky-lantern')).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test('Reduce Motion: nothing on the map moves (it never animates)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, world(FEW));
    const first = await placed(page);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    await page.waitForTimeout(1500);
    expect(await placed(page)).toEqual(first);
  });

  test('with the shading off the lights have no glow, and the words are unchanged', async ({ page }) => {
    await open(page, world(FEW, { shading: false }));
    await expect(lines(page)).toHaveCount(4);
    await expect(page.getByTestId('rest-glow')).toHaveCount(0);
  });

  test('200 % zoom: the map is a plain list (as at the largest text), nothing wider than the screen, the field in view', async ({ page }) => {
    await page.setViewportSize({ width: 195, height: 422 });
    await open(page, world(FEW));
    await expect(page.getByTestId('live-map')).toHaveAttribute('data-mode', 'list');
    await expect(field(page)).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(195);
    await expect(lines(page)).toHaveCount(4);
    await expectNoSeriousViolations(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/p80-zoom-200.png` });
  });
});
