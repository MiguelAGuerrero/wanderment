/**
 * Dark Map (owner, "Dark Map in this batch"): Map, its sheet and its bottom were on the night palette.
 * P-83: Map (and its circles, whose heat tests lived here) is retired; the sheet is now the home's, and
 * stays night — what's left to check here. Heat on the lit map's nodes: e2e/lit-map.spec.ts.
 */
import { AxeBuilder } from '@axe-core/playwright';
import { Page } from '@playwright/test';

import { expect, openHome, openSheet, test } from './fixtures';
import { legacyBlob, seedScript } from './graphFixture';

const NIGHT_BG = 'rgb(14, 16, 32)'; // theme N.bg / M.bg
const NIGHT_SURFACE = 'rgb(26, 24, 48)'; // theme N.surface / M.surface
const CREAM = 'rgb(245, 243, 238)'; // theme C.bg
const DAY = 864e5;

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

async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = serious.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => `${n.target.join(' ')} ${n.html.slice(0, 200)}`).slice(0, 5).join('\n  ')}`);
  expect(report, report.join('\n')).toEqual([]);
}

test('the home’s sheet and its log box are on night surfaces, never cream (P-83: was Map, its What’s next card and its sheet)', async ({ page }) => {
  await page.addInitScript(seedScript, world());
  await openHome(page);
  // The section's log box sits on a night surface.
  const box = await page
    .getByRole('textbox', { name: 'What did you just do?' })
    .filter({ visible: true })
    .evaluate((el) => {
      for (let e: Element | null = el; e; e = e.parentElement) {
        const bg = getComputedStyle(e).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
      }
      return '';
    });
  expect([NIGHT_BG, NIGHT_SURFACE]).toContain(box);
  await expectNoSeriousViolations(page);

  await openSheet(page, 'Wanders');
  const sheet = await page.getByTestId('home-sheet').evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(sheet).toBe(NIGHT_BG);
  expect(sheet).not.toBe(CREAM);
  await expectNoSeriousViolations(page);
  await openSheet(page, 'Activities');
  await expectNoSeriousViolations(page);
});
