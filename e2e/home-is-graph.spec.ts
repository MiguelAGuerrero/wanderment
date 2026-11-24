/**
 * P-34's graph on Home (then Map) is retired with Map (P-83, B-09): what survives here is Explore
 * (now a row of the home's sheet), the Wanders list in the sheet, and P-37 ("wanders", never "thread").
 */
import { AxeBuilder } from '@axe-core/playwright';
import { Page } from '@playwright/test';

import { expect, logBox, openHome, openSheet, test } from './fixtures';
import { legacyBlob, seedScript } from './graphFixture';


async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = serious.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => `${n.target.join(' ')} ${n.html.slice(0, 200)}`).slice(0, 5).join('\n  ')}`);
  expect(report, report.join('\n')).toEqual([]);
}

const DAY = 864e5;
/** Wanders with one declared why, a staged step on draw, and none on the others. */
function withWhy() {
  const json = JSON.parse(
    legacyBlob(['draw', 'make apparel', 'sew', 'get stronger', 'lift'], [
      { from: 'draw', to: ['make apparel'], text: 'sketch', daysAgo: 1 },
      { from: 'sew', to: ['make apparel'], text: 'hemmed', daysAgo: 2 },
      { from: 'lift', to: ['get stronger'], text: 'squats', daysAgo: 1 },
    ]),
  );
  json.state.data.threads['make apparel'].declaredAt = new Date(Date.now() - 5 * DAY).toISOString();
  json.state.data.threads.draw.next = 'sketch a hand';
  return JSON.stringify(json);
}

test('Explore opens the old graph view (with its List view), from the home’s sheet and from a wander’s page', async ({ page }) => {
  await page.addInitScript(seedScript, withWhy());
  await openHome(page);
  await expect(page.getByRole('tab', { name: 'Graph' })).toHaveCount(0);
  // P-83: Explore is a row of the sheet (was an icon in Map's header).
  await page.getByRole('dialog', { name: 'Wanders and activities' }).getByRole('link', { name: 'Explore', exact: true }).click();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(page.getByRole('heading', { name: 'Explore' })).toBeVisible();
  // Its centre (with its steps) and the graph / list switch.
  await expect(page.getByRole('button', { name: /^\S.*, \d+ steps?/ }).first()).toBeVisible();
  await expectNoSeriousViolations(page);
  await page.getByRole('tab', { name: 'List view' }).click();
  await expect(page.getByRole('heading', { name: /^Flows into |flows to$/ }).first()).toBeVisible();
  await expectNoSeriousViolations(page);
  await page.getByRole('button', { name: '‹ Back' }).click();
  // P-83: back on the home, its sheet still out where Explore was opened from.
  await expect(page).toHaveURL(/\/wanderment\/$/);
  await expect(page.getByRole('dialog', { name: 'Wanders and activities' })).toBeVisible();

  // From a wander's page, centred on that wander.
  await page.goto('./thread/sew');
  await expect(page.getByRole('button', { name: 'Rename' })).toBeVisible();
  await page.getByRole('link', { name: 'Explore', exact: true }).click();
  await expect(page).toHaveURL(/\/explore\?center=sew$/);
  await expect(page.getByRole('button', { name: /^sew, \d+ steps?/ })).toBeVisible();
});

test('the Wanders tab shows the list that was Home: headers, cards and crumbs, “+ New wander”', async ({ page }) => {
  await page.addInitScript(seedScript, withWhy());
  await openHome(page);
  await openSheet(page, 'Wanders'); // P-58: a section of Home's sheet (was a tab)
  await expect(page.getByRole('heading', { name: 'Wanders', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'YOUR WANDERS' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^draw\s*sketch/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'sketch a hand Log this' })).toBeVisible();
  await expect(page.getByRole('button', { name: '+ New wander' })).toBeVisible();
  await expectNoSeriousViolations(page);
});

/** Everything a person sees or hears on the page: visible text, accessible names, placeholders. */
const words = (page: Page) =>
  page.evaluate(() => {
    const out = [document.body.innerText];
    for (const el of document.querySelectorAll('[aria-label], [placeholder], [title], [alt]')) {
      if (!(el as HTMLElement).checkVisibility()) continue;
      for (const a of ['aria-label', 'placeholder', 'title', 'alt']) if (el.getAttribute(a)) out.push(el.getAttribute(a)!);
    }
    return out.join('\n');
  });

test('P-37: no screen says “thread” — in what’s shown or in accessible names', async ({ page }) => {
  // Names and logs here never contain the word themselves.
  const json = JSON.parse(withWhy());
  json.state.data.activities.loose = { id: 'loose', text: 'read a novel', occurredAt: new Date().toISOString(), createdAt: new Date().toISOString(), toIds: [] };
  await page.addInitScript(seedScript, JSON.stringify(json));
  await openHome(page);
  const seen: [string, string][] = [];
  const check = async (where: string) => seen.push([where, await words(page)]);
  await check('Home');
  await logBox(page).fill('more @dr');
  await expect(page.getByRole('listbox')).toBeVisible();
  await check('Home, @ suggestions');
  await logBox(page).fill('');
  await openSheet(page, 'Wanders'); // P-58: a section of Home's sheet (was a tab)
  await expect(page.getByRole('heading', { name: 'YOUR WANDERS' })).toBeVisible();
  await check('Wanders');
  await openSheet(page, 'Activities'); // P-58: a section of Home's sheet (was a tab)
  await page.getByRole('tab', { name: 'No wander' }).click();
  await check('Activities');
  await page.goto('./explore');
  await check('Explore');
  await page.getByRole('tab', { name: 'List view' }).click();
  await check('Explore, list');
  await page.getByRole('button', { name: 'Attach loose activities' }).click();
  await check('Explore, attach');
  await page.goto('./thread/draw');
  await page.getByRole('button', { name: 'Rename' }).click();
  await check('Wander page, renaming');
  await page.goto('./activity/a0');
  await check('Activity');
  await page.goto('./settings');
  await check('Settings');
  await page.goto('./search');
  await page.getByRole('textbox', { name: 'Search' }).fill('s');
  await check('Search');
  for (const [where, text] of seen) expect(text.match(/\bthreads?\b/gi), `${where}:\n${text}`).toBeNull();
});
