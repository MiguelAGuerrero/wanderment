/** P-60: a calmer Home — no summary line, no list under the picture, no "All"; labels clear of rings; 24 pt icons; loose logs. */
import { AxeBuilder } from '@axe-core/playwright';
import { Locator, Page } from '@playwright/test';

import { expect, logLine, openHome, test } from './fixtures';
import { legacyBlob, seedScript } from './graphFixture';

const SHOTS = process.env.E2E_SHOTS; // set to a folder to save screenshots for a visual check
const DAY = 864e5;

async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = serious.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => `${n.target.join(' ')} ${n.html.slice(0, 200)}`).slice(0, 5).join('\n  ')}`);
  expect(report, report.join('\n')).toEqual([]);
}

/** The owner's Home (2026-11-23): one declared why, “feel productive”, with a staged step; `loose` adds logs naming nothing. */
function owner(loose: { text: string; daysAgo: number }[] = []) {
  const json = JSON.parse(legacyBlob(['feel productive'], loose));
  json.state.data.threads['feel productive'].declaredAt = new Date(Date.now() - DAY).toISOString();
  json.state.data.threads['feel productive'].next = 'Clean my car';
  return JSON.stringify(json);
}

/** Three declared whys with long names, long-named wanders feeding them, a step on one. */
function longNames() {
  const json = JSON.parse(
    legacyBlob(['feel productive', 'make apparel for the spring market', 'Supercalifragilisticexpialidocious', 'draw better hands every evening', 'sew', 'read philosophy slowly'], [
      { from: 'draw better hands every evening', to: ['make apparel for the spring market'], text: 'sketch', daysAgo: 1 },
      { from: 'sew', to: ['make apparel for the spring market'], text: 'hemmed', daysAgo: 2 },
      { from: 'read philosophy slowly', to: ['feel productive'], text: 'a chapter', daysAgo: 3 },
    ]),
  );
  for (const w of ['feel productive', 'make apparel for the spring market', 'Supercalifragilisticexpialidocious']) json.state.data.threads[w].declaredAt = new Date(Date.now() - 2 * DAY).toISOString();
  json.state.data.threads['feel productive'].next = 'Clean my car';
  return JSON.stringify(json);
}

const picture = (page: Page) => page.getByTestId('home-graph-picture').filter({ visible: true });
const strip = (page: Page) => page.getByRole('list', { name: 'Logs without a wander', exact: true });
const why = (page: Page) => page.getByTestId('graph-node-feel productive');

type Box = { x: number; y: number; width: number; height: number };
const box = async (l: Locator) => (await l.boundingBox()) as Box;
const apart = (a: Box, b: Box) => a.x + a.width <= b.x + 0.5 || b.x + b.width <= a.x + 0.5 || a.y + a.height <= b.y + 0.5 || b.y + b.height <= a.y + 0.5;

test('the owner’s Home at 390 px: no summary line, no list of buttons, no “All”; the circle is a button in the picture', async ({ page }) => {
  await page.addInitScript(seedScript, owner());
  await openHome(page);
  await expect(why(page)).toBeVisible();
  // Gone from sight: the one-line summary, the list under the picture, the "All" label.
  await expect(page.getByText(/What it’s for: feel productive/)).toHaveCount(0);
  await expect(page.getByTestId('home-graph-line')).toHaveCount(0);
  await expect(page.getByTestId('scope-chip')).toHaveCount(0);
  await expect(page.getByText('All', { exact: true }).filter({ visible: true })).toHaveCount(0);
  // The summary still names the picture; its circle is a button inside it, named as the list did.
  const group = page.getByRole('group', { name: 'What it’s for: feel productive, nothing feeds it yet.', exact: true });
  await expect(group).toBeVisible();
  const btn = group.getByRole('button', { name: 'feel productive, what it’s for', exact: true });
  await expect(btn).toBeVisible();
  // Every button that names a node is inside the picture (none in a list under it).
  await expect(page.getByRole('button', { name: /, (what it’s for|a wander)$/ }).filter({ visible: true })).toHaveCount(1);
  const g = await box(picture(page));
  const b = await box(btn);
  expect(b.y + b.height).toBeLessThanOrEqual(g.y + g.height + 0.5);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p60-owner-home.png` });
  // Reachable with the keyboard.
  await btn.focus();
  await expect(btn).toBeFocused();
  await expectNoSeriousViolations(page);
});

test('nodes are buttons in reading order (whys first, left to right), and the focused one is current', async ({ page }) => {
  await page.addInitScript(seedScript, longNames());
  await openHome(page);
  await expect(why(page)).toBeVisible();
  const names = await picture(page).getByRole('button').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  expect(names.slice(0, 3)).toEqual(['feel productive, what it’s for', 'make apparel for the spring market, what it’s for', 'Supercalifragilisticexpialidocious, what it’s for']);
  expect(names.slice(3).every((n) => n?.endsWith(', a wander'))).toBe(true);
  expect(names).toHaveLength(6);
  await expect(page.locator('[data-testid^="graph-node-"][aria-current="true"]')).toHaveCount(1);
});

for (const [what, seed, width] of [
  ['the owner’s why', owner, 390],
  ['long names', longNames, 390],
  ['long names', longNames, 350],
  ['long names', longNames, 640],
] as const) {
  test(`labels never overlap a circle or its rings (${what}, ${width} px): wholly below the outermost ring, clear of other nodes and the step mark`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(seedScript, seed());
    await openHome(page);
    await expect(why(page)).toBeVisible();
    const labels = page.locator('[data-testid^="graph-label-"]').filter({ visible: true });
    await expect(labels.first()).toBeVisible();
    // Each circle with its rings (the why ring and the focus ring, as their boxes).
    const rings: Box[] = [];
    for (const n of await page.locator('[data-testid^="graph-node-"]').filter({ visible: true }).all()) {
      const id = (await n.getAttribute('data-testid'))!.slice('graph-node-'.length);
      for (const t of [`graph-why-ring-${id}`, `graph-selected-${id}`, `graph-circle-${id}`]) {
        const r = page.getByTestId(t);
        if (await r.count()) rings.push(await box(r));
      }
    }
    expect(rings.length).toBeGreaterThan(0);
    const marks: Box[] = [];
    for (const t of ['graph-step-dot-', 'graph-step-', 'graph-add-step-']) for (const m of await page.locator(`[data-testid^="${t}"]`).filter({ visible: true }).all()) marks.push(await box(m));
    expect(marks.length, 'the step mark is drawn').toBeGreaterThan(0);
    const g = await box(picture(page));
    const all = await labels.all();
    for (const [i, l] of all.entries()) {
      const lb = await box(l);
      const name = await l.textContent();
      for (const r of rings) expect(apart(lb, r), `label ${name} / ring ${JSON.stringify(r)}`).toBe(true);
      for (const m of marks) expect(apart(lb, m), `label ${name} / step mark`).toBe(true);
      for (const o of all.slice(i + 1)) expect(apart(lb, await box(o)), `label ${name} / another label`).toBe(true);
      // Inside the picture, at most two 14 px lines.
      expect(lb.x).toBeGreaterThanOrEqual(g.x - 0.5);
      expect(lb.x + lb.width).toBeLessThanOrEqual(g.x + g.width + 0.5);
      expect(lb.height).toBeLessThanOrEqual(2 * 14 + 1);
    }
    // The owner's label in particular: below the focus ring (a declared why's, the outermost) with a gap.
    if (seed === owner) {
      const fp = await box(page.getByTestId('graph-label-feel productive'));
      const ring = await box(page.getByTestId('graph-selected-feel productive'));
      expect(fp.y).toBeGreaterThanOrEqual(ring.y + ring.height + 3);
    }
    if (SHOTS && width === 390) await page.screenshot({ path: `${SHOTS}/p60-labels-${seed === owner ? 'owner' : 'long'}-390.png` });
  });
}

test('header icons: 24 pt glyphs in 44 pt targets, names unchanged', async ({ page }) => {
  await page.addInitScript(seedScript, owner());
  await openHome(page);
  for (const [name, icon] of [
    ['Explore', 'icon-explore'],
    ['Search', 'icon-search'],
    ['Settings and backup', 'icon-settings'],
  ] as const) {
    // (Each is a link: Expo Router's Link renders its Pressable as one.)
    const target = page.getByRole('link', { name, exact: true }).filter({ visible: true });
    const t = await box(target);
    expect(t.width, name).toBeGreaterThanOrEqual(44);
    expect(t.height, name).toBeGreaterThanOrEqual(44);
    const g = await box(target.getByTestId(icon));
    expect(g.width, name).toBeGreaterThanOrEqual(24);
    expect(g.height, name).toBeGreaterThanOrEqual(24);
  }
});

test('the owner’s scenario: a new unattached log shows its words under the graph, glows as it lands, and a tap attaches it to the why, which warms', async ({ page }) => {
  await page.addInitScript(seedScript, owner());
  await openHome(page);
  await expect(why(page)).toHaveAttribute('data-heat', '0.00');
  await expect(strip(page)).toHaveCount(0);
  await logLine(page, 'Washed the car and vacuumed the seats');
  const row = strip(page).getByRole('button', { name: 'Washed the car and vacuumed the seats', exact: true });
  await expect(row).toBeVisible();
  await expect(row).toHaveAttribute('data-glow', 'true');
  // A halo round its dot, animated (a CSS animation on the web).
  expect(await row.evaluate((e) => [...e.querySelectorAll('div')].some((d) => getComputedStyle(d).animationName !== 'none' && getComputedStyle(d).animationDuration === '1.4s'))).toBe(true);
  await expect(row).not.toHaveAttribute('data-glow', 'true', { timeout: 4000 });
  // Below the graph.
  expect((await box(row)).y).toBeGreaterThanOrEqual((await box(picture(page))).y + (await box(picture(page))).height - 0.5);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p60-loose-log.png` });
  // A tap opens the tiny chooser: attach to a node, or open the log.
  await row.click();
  await expect(row).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('link', { name: 'Open', exact: true })).toBeVisible();
  await expectNoSeriousViolations(page);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p60-loose-chooser.png` });
  await page.getByRole('button', { name: '→ to feel productive: attach', exact: true }).click();
  await expect(strip(page)).toHaveCount(0);
  await expect(why(page)).toHaveAttribute('data-heat', '1.00');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p60-attached.png` });
});

test('“Open” opens the log; old loose logs (three weeks and more) and attached ones never show; with none, no space is taken', async ({ page }) => {
  await page.addInitScript(seedScript, owner([{ text: 'long ago', daysAgo: 30 }]));
  await openHome(page);
  await expect(why(page)).toBeVisible();
  await expect(strip(page)).toHaveCount(0);
  await expect(page.getByTestId('loose-logs')).toHaveCount(0);
  await logLine(page, 'tidied the desk');
  await strip(page).getByRole('button', { name: 'tidied the desk', exact: true }).click();
  await page.getByRole('link', { name: 'Open', exact: true }).click();
  await expect(page).toHaveURL(/\/activity\//);
});

test('the last few only, newest first, long words cut short with their full text as the name', async ({ page }) => {
  const long = 'Watched a long video on AI acceptance and then wrote three pages of notes about it';
  await page.addInitScript(seedScript, owner(['first', 'second', 'third', long].map((text, i) => ({ text, daysAgo: 4 - i }))));
  await openHome(page);
  const rows = strip(page).getByRole('button');
  await expect(rows).toHaveCount(3);
  expect(await rows.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))).toEqual([long, 'third', 'second']);
  const text = rows.first().locator('div[dir="auto"]').last();
  expect(await text.evaluate((e) => e.scrollWidth > e.clientWidth)).toBe(true);
  // Fading with age: the newest is the warmest.
  const heats = await rows.evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-heat'))));
  expect(heats[0]).toBeGreaterThan(heats[2]);
});

test('under Reduce Motion a new loose log lands without a glow', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(seedScript, owner());
  await openHome(page);
  await logLine(page, 'clean my car');
  const row = strip(page).getByRole('button', { name: 'clean my car', exact: true });
  await expect(row).toBeVisible();
  // Give a glow time to start, were there one.
  await page.waitForTimeout(300);
  await expect(row).not.toHaveAttribute('data-glow', 'true');
  expect(await row.evaluate((e) => [...e.querySelectorAll('div')].some((d) => getComputedStyle(d).animationName !== 'none'))).toBe(false);
});

test('at 200 % zoom (195 px): no picture, the list of whys and wanders as buttons, the loose logs readable; no serious violations', async ({ page }) => {
  await page.setViewportSize({ width: 195, height: 422 });
  await page.addInitScript(seedScript, owner([{ text: 'Washed the car and vacuumed the seats', daysAgo: 0.1 }]));
  await openHome(page);
  await expect(picture(page)).toHaveCount(0);
  await expect(page.getByTestId('home-graph-summary')).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'What it’s for: feel productive, nothing feeds it yet.', exact: true })).toBeVisible();
  await expect(page.getByRole('list', { name: 'What’s in the picture' }).getByRole('button', { name: 'feel productive, what it’s for', exact: true })).toBeVisible();
  const row = strip(page).getByRole('button', { name: 'Washed the car and vacuumed the seats', exact: true });
  await expect(row).toBeVisible();
  const r = await box(row);
  expect(r.x + r.width).toBeLessThanOrEqual(195);
  expect(r.height).toBeGreaterThanOrEqual(44);
  await expectNoSeriousViolations(page);
  if (SHOTS) {
    await page.screenshot({ path: `${SHOTS}/p60-200pct.png` });
    await row.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOTS}/p60-200pct-loose.png` });
  }
});
