/** P-48: Home's graph as heat circles and branch lines (B-06 revision 12, "The graph"). */
import { AxeBuilder } from '@axe-core/playwright';
import { Page } from '@playwright/test';

import { expect, openHome, test } from './fixtures';
import { legacyBlob, seedScript } from './graphFixture';

const SHOTS = process.env.E2E_SHOTS; // set to a folder to save screenshots for a visual check

const node = (page: Page, id: string) => page.getByTestId(`graph-node-${id}`).filter({ visible: true });
const nodes = (page: Page) => page.locator('[data-testid^="graph-node-"]').filter({ visible: true });
// P-60: the picture is a group named by its summary (was an image).
const picture = (page: Page) => page.getByRole('group').and(page.getByTestId('home-graph-picture')).filter({ visible: true });

async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = serious.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => `${n.target.join(' ')} ${n.html.slice(0, 200)}`).slice(0, 5).join('\n  ')}`);
  expect(report, report.join('\n')).toEqual([]);
}

const DAY = 864e5;
/**
 * Three declared whys and their feeders: a hot chain (hands → draw → make apparel, logged just now;
 * hands itself isn't in the picture), a cooling one (sew, a month ago) and a resting why (get stronger).
 */
function world(shading = true) {
  const json = JSON.parse(
    legacyBlob(['make apparel', 'feel productive', 'get stronger', 'draw', 'sew', 'read', 'hands'], [
      { from: 'draw', to: ['make apparel'], text: 'sketch', daysAgo: 60 },
      { from: 'sew', to: ['make apparel'], text: 'hemmed', daysAgo: 30 },
      { from: 'read', to: ['feel productive'], text: 'a chapter', daysAgo: 12 },
      { from: 'hands', to: ['draw'], text: 'drew hands', daysAgo: 0.01 },
    ]),
  );
  ['make apparel', 'feel productive', 'get stronger'].forEach((n, i) => (json.state.data.threads[n].declaredAt = new Date(Date.now() - (10 - i) * DAY).toISOString()));
  json.state.data.threads.draw.next = 'sketch a hand';
  json.state.showShading = shading;
  return JSON.stringify(json);
}

/** Each node's circle (its first child): size, fill, outline, and its label's colour and where it sits. */
const looks = (page: Page) =>
  page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll('[data-testid="home-graph-picture"] [data-testid^="graph-node-"]')].map((el) => {
        const circle = el.firstElementChild as HTMLElement;
        const css = getComputedStyle(circle);
        const inside = circle.querySelector('div[dir], div') as HTMLElement | null;
        const label = (inside ?? (el.children[1] as HTMLElement))!;
        const box = circle.getBoundingClientRect();
        return [
          el.getAttribute('data-testid')!.replace('graph-node-', ''),
          {
            w: box.width,
            h: box.height,
            radius: parseFloat(css.borderTopLeftRadius),
            fill: css.backgroundColor,
            outline: css.borderTopColor,
            heat: Number(el.getAttribute('data-heat')),
            where: el.getAttribute('data-label'),
            label: getComputedStyle(label).color,
            text: label.textContent,
          },
        ];
      }),
    ),
  );

/** WCAG contrast of two "rgb(r, g, b)" colours. */
function contrast(a: string, b: string) {
  const lum = (c: string) => {
    const [r, g, bl] = (c.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map((v) => Number(v) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
const PAGE = 'rgb(14, 16, 32)'; // theme M.bg // dark Map

test('circles by level, coloured by heat that flows upward; no dots; tapered branches; readable everywhere', async ({ page }) => {
  await page.addInitScript(seedScript, world());
  await openHome(page);
  await expect(nodes(page)).toHaveCount(6);
  const l = await looks(page);

  // Circles: whys (the top row) biggest, the feeders beneath one size smaller.
  for (const n of Object.values(l)) {
    expect(n.w).toBeCloseTo(n.h, 0);
    expect(n.radius).toBeCloseTo(n.w / 2, 0);
  }
  for (const w of ['make apparel', 'feel productive', 'get stronger']) for (const f of ['draw', 'sew', 'read']) expect(l[w].w, `${w} > ${f}`).toBeGreaterThan(l[f].w);

  // Heat: the most recent activity on it or beneath it, never a sum. hands → draw → make apparel just now.
  expect(l.draw.heat).toBeCloseTo(1, 1);
  expect(l['make apparel'].heat).toBeCloseTo(1, 1);
  expect(l.sew.heat).toBeCloseTo(0.5 ** (30 / 14), 1);
  expect(l['get stronger'].heat).toBe(0);
  // Hot is ember, cold is stone: different fills.
  expect(l['make apparel'].fill).not.toBe(l['get stronger'].fill);
  expect(l.draw.fill).toBe(l['make apparel'].fill);

  // Labels: 4.5:1 against their circle (inside) or the page (under); outlines 3:1 against the page.
  for (const [id, n] of Object.entries(l)) {
    expect(contrast(n.label, n.where === 'inside' ? n.fill : PAGE), `${id} label`).toBeGreaterThanOrEqual(4.5);
    expect(contrast(n.outline, PAGE), `${id} outline`).toBeGreaterThanOrEqual(3);
    expect(n.text).toBe(id);
  }
  expect(l['make apparel'].where).toBe('inside');
  expect(l['make apparel'].label).toBe('rgb(14, 16, 32)'); // dark Map: dark words on a hot (amber) circle
  expect(l['get stronger'].label).toBe('rgb(245, 243, 238)'); // dark Map: light words on a cold circle

  // No label is clipped (nothing cut off, nothing past the 390 px screen).
  const clipped = await page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="home-graph-picture"] [data-testid^="graph-node-"] div')]
      .filter((e) => e.childElementCount === 0 && e.textContent)
      .filter((e) => e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1 || e.getBoundingClientRect().right > 390 || e.getBoundingClientRect().left < 0)
      .map((e) => e.textContent),
  );
  expect(clipped).toEqual([]);

  // Declared whys have a second ring; nothing else does.
  await expect(page.locator('[data-testid^="graph-why-ring-"]').filter({ visible: true })).toHaveCount(3);

  // No dots or dot lines once wanders exist.
  await expect(page.locator('[data-testid^="graph-dot-"]')).toHaveCount(0);
  await expect(page.locator('[data-testid^="graph-dotline-"]')).toHaveCount(0);

  // Branches: tapered filled shapes, coloured from the child's heat to the parent's by a gradient; no arrowheads.
  const branches = await page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="home-graph-picture"] polygon')].map((p) => {
      const id = (p.getAttribute('fill') ?? '').match(/url\(#(.+)\)/)?.[1];
      const stops = id ? [...document.getElementById(id)!.querySelectorAll('stop')].map((s) => getComputedStyle(s).stopColor) : [];
      return { testId: p.getAttribute('data-testid'), stops, points: (p.getAttribute('points') ?? '').trim().split(/\s+/).length };
    }),
  );
  expect(branches.map((b) => b.testId).sort()).toEqual(['graph-link-draw-make apparel', 'graph-link-read-feel productive', 'graph-link-sew-make apparel']);
  for (const b of branches) {
    expect(b.stops).toHaveLength(2);
    for (const c of b.stops) expect(contrast(c, PAGE)).toBeGreaterThanOrEqual(3);
    expect(b.points).toBeGreaterThan(20);
  }
  // sew (cooling) into make apparel (hot): the colour changes along the branch.
  const sew = branches.find((b) => b.testId === 'graph-link-sew-make apparel')!;
  expect(sew.stops[0]).not.toBe(sew.stops[1]);

  // P-50 (was: the staged step is one line under its node): only the focused node's step is drawn.
  // hands was logged toward last but isn't in the picture, so nothing is; focused, draw's shows below it.
  await expect(page.locator('[data-testid^="graph-step-"]').filter({ visible: true })).toHaveCount(0);
  await node(page, 'draw').click();
  const step = (await page.getByTestId('graph-step-dot-draw').boundingBox())!;
  const draw = (await node(page, 'draw').locator('> div').first().boundingBox())!;
  expect(step.y).toBeGreaterThan(draw.y + draw.height / 2);
  await expect(page.getByTestId('graph-step-draw')).toHaveText('sketch a hand');

  // Targets stay 44 px or more.
  for (const n of await nodes(page).all()) {
    const b = (await n.boundingBox())!;
    expect(b.width).toBeGreaterThanOrEqual(44);
    expect(b.height).toBeGreaterThanOrEqual(44);
  }
  // The picture's name is as before; P-60: its circles are the list's buttons (named as the list under it was; their text is just the name).
  await expect(picture(page)).toHaveCount(1);
  await expect(picture(page)).toHaveAccessibleName(/^What it’s for: make apparel, fed by draw and sew; feel productive, fed by read; get stronger, nothing feeds it yet\. Lately: /);
  expect(await picture(page).getByRole('list', { name: 'What’s in the picture' }).getByRole('button').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))).toEqual([
    'make apparel, what it’s for',
    'feel productive, what it’s for',
    'get stronger, what it’s for',
    // P-60: in reading order, left to right (the list's was the overview's: draw, sew, read).
    'draw, a wander',
    'read, a wander',
    'sew, a wander',
  ]);
  await expectNoSeriousViolations(page);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p48-heat.png` });
});

test('the selection is one ink ring around the circle', async ({ page }) => {
  await page.addInitScript(seedScript, world());
  await openHome(page);
  const rings = page.locator('[data-testid^="graph-selected-"]').filter({ visible: true });
  await expect(rings).toHaveCount(0);
  await node(page, 'sew').click();
  await expect(rings).toHaveCount(1);
  await expect(rings).toHaveAttribute('data-testid', 'graph-selected-sew');
  expect(await rings.evaluate((e) => getComputedStyle(e).borderTopColor)).toBe('rgb(245, 243, 238)'); // dark Map: M.ink
  // Heat never changes with selection.
  await expect(node(page, 'sew')).toHaveAttribute('data-heat', /^0\.2/);
  // Around the circle: centred on it, a little bigger.
  const circle = (await node(page, 'sew').locator('> div').first().boundingBox())!;
  const ring = (await rings.boundingBox())!;
  expect(Math.abs(ring.x + ring.width / 2 - (circle.x + circle.width / 2))).toBeLessThan(1);
  expect(Math.abs(ring.y + ring.height / 2 - (circle.y + circle.height / 2))).toBeLessThan(1);
  expect(ring.width).toBeGreaterThan(circle.width);
  // A declared why: still one ink ring, outside its second ring.
  await node(page, 'make apparel').click();
  await expect(rings).toHaveCount(1);
  await expect(rings).toHaveAttribute('data-testid', 'graph-selected-make apparel');
  await expectNoSeriousViolations(page);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p48-selected.png` });
});

test('with the recency shading off, every circle is neutral', async ({ page }) => {
  await page.addInitScript(seedScript, world(false));
  await openHome(page);
  await expect(nodes(page)).toHaveCount(6);
  for (const n of await nodes(page).all()) await expect(n).toHaveAttribute('data-heat', '0.00');
  const l = await looks(page);
  // Every circle the same cool stone, though draw and make apparel were logged toward just now.
  expect(new Set(Object.values(l).map((n) => n.fill))).toEqual(new Set(['rgb(40, 40, 66)'])); // dark Map: nightHeatFill(0)
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p48-shading-off.png` });
});

test('logs with no wanders: still dots, unchanged', async ({ page }) => {
  await page.addInitScript(seedScript, legacyBlob([], ['read a chapter', 'sketched a hand', 'ran 5k'].map((text, i) => ({ text, daysAgo: 0.1 + i }))));
  await openHome(page);
  await expect(page.locator('[data-testid^="graph-dot-"]').filter({ visible: true })).toHaveCount(3);
  await expect(nodes(page)).toHaveCount(0);
  await expect(page.locator('[data-testid="home-graph-picture"] polygon')).toHaveCount(0);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/p48-logs-only.png` });
});
