/**
 * Dark Map (owner, "Dark Map in this batch"): Map, its sheet and its bottom are on the night palette,
 * so moving between the night-sky screens and Map is no jump to cream. Heat stays legible on dark
 * (a hot circle and a cold one look different) and the shading off still removes it.
 */
import { AxeBuilder } from '@axe-core/playwright';
import { Page } from '@playwright/test';

import { expect, openHome, openSheet, test } from './fixtures';
import { legacyBlob, seedScript } from './graphFixture';

const NIGHT_BG = 'rgb(14, 16, 32)'; // theme N.bg / M.bg
const NIGHT_SURFACE = 'rgb(26, 24, 48)'; // theme N.surface / M.surface
const CREAM = 'rgb(245, 243, 238)'; // theme C.bg
const DAY = 864e5;
/** A cold circle's fill on the night page (domain/heat `nightHeatFill(0)`). */
const COLD_FILL = 'rgb(40, 40, 66)';

/** A hot chain (draw → make apparel, logged just now) and a resting why (get stronger). */
function world(shading = true) {
  const json = JSON.parse(
    legacyBlob(['make apparel', 'get stronger', 'draw'], [
      { from: 'draw', to: ['make apparel'], text: 'sketched', daysAgo: 0.01 },
      { text: 'cooked dinner', daysAgo: 0.5 },
    ]),
  );
  ['make apparel', 'get stronger'].forEach((n, i) => (json.state.data.threads[n].declaredAt = new Date(Date.now() - (10 - i) * DAY).toISOString()));
  json.state.showShading = shading;
  return JSON.stringify(json);
}

/** The first ancestor (or itself) with a painted background. */
const paintedBg = (page: Page, testID: string) =>
  page.getByTestId(testID).filter({ visible: true }).first().evaluate((el) => {
    for (let e: Element | null = el; e; e = e.parentElement) {
      const bg = getComputedStyle(e).backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
    }
    return '';
  });

const circle = (page: Page, id: string) =>
  page.getByTestId(`graph-circle-${id}`).filter({ visible: true }).evaluate((el) => {
    const css = getComputedStyle(el);
    return { fill: css.backgroundColor, outline: css.borderTopColor };
  });

async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = serious.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => `${n.target.join(' ')} ${n.html.slice(0, 200)}`).slice(0, 5).join('\n  ')}`);
  expect(report, report.join('\n')).toEqual([]);
}

test('Map, its What’s next card and its sheet are on night surfaces, never cream', async ({ page }) => {
  await page.addInitScript(seedScript, world());
  await openHome(page);
  expect(await paintedBg(page, 'home-graph')).toBe(NIGHT_BG);
  expect(await paintedBg(page, 'home-slot')).toBe(NIGHT_BG);
  expect(await paintedBg(page, 'whats-next')).toBe(NIGHT_SURFACE);
  await expectNoSeriousViolations(page);

  await openSheet(page, 'Wanders');
  const sheet = await page.getByTestId('home-sheet').evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(sheet).toBe(NIGHT_BG);
  expect(sheet).not.toBe(CREAM);
  await expectNoSeriousViolations(page);
  await openSheet(page, 'Activities');
  await expectNoSeriousViolations(page);
});

test('a hot circle and a cold one are told apart on the night page', async ({ page }) => {
  await page.addInitScript(seedScript, world());
  await openHome(page);
  const hot = await circle(page, 'make apparel');
  const cold = await circle(page, 'get stronger');
  expect(hot.fill).not.toBe(cold.fill);
  expect(hot.outline).not.toBe(cold.outline);
  // Warm amber when hot (red over green over blue), dim and cool when cold (blue at least red).
  const [hr, hg, hb] = hot.fill.match(/\d+/g)!.map(Number);
  expect(hr).toBeGreaterThan(hg);
  expect(hg).toBeGreaterThan(hb);
  const [cr, , cb] = cold.fill.match(/\d+/g)!.map(Number);
  expect(cb).toBeGreaterThanOrEqual(cr);
  expect(cold.fill).toBe(COLD_FILL);
});

test('with the shading off, the hot circle and the cold one look the same (the cold look)', async ({ page }) => {
  await page.addInitScript(seedScript, world(false));
  await openHome(page);
  const hot = await circle(page, 'make apparel');
  const cold = await circle(page, 'get stronger');
  expect(hot).toEqual(cold);
  expect(hot.fill).toBe(COLD_FILL);
});
