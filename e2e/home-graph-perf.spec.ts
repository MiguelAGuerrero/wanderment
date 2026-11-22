/**
 * P-15 (P-33 F4): with a large history, logging on Home is not measurably slower with the live graph
 * than without it. On its own and serial, so no sibling in this file competes with it for the CPU.
 */
import { Browser, Page } from '@playwright/test';

import { expect, logBox, logLine, test } from './fixtures';
import { bigBlob, seedScript } from './graphFixture';

test.describe.configure({ mode: 'serial' });

/**
 * "Without the graph" is the same build with Home's `LiveGraph` export swapped for a component that
 * draws nothing, in this page's copy of the bundle only, so no test switch ships. Returns how many
 * exports were swapped (1, or the bundle's shape changed and the comparison would mean nothing).
 */
async function dropGraph(page: Page) {
  let swapped = 0;
  await page.route(/\/_expo\/static\/js\/.*\.js$/, async (route) => {
    const res = await route.fetch();
    const body = (await res.text()).replace(/("LiveGraph",\{enumerable:!0,get:function\(\)\{return )\w+(\}\})/g, (_, head, tail) => {
      swapped += 1;
      return `${head}function(){return null}${tail}`;
    });
    await route.fulfill({ response: res, body });
  });
  return () => swapped;
}

/** Home on a fresh copy of the large history, measuring the main thread's work after every Return. */
async function home(browser: Browser, graph: boolean) {
  // No service worker: every script comes through `dropGraph`'s route, in both pages alike.
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', baseURL: test.info().project.use.baseURL });
  const page = await context.newPage();
  const errors: Error[] = [];
  page.on('pageerror', (e) => errors.push(e));
  const swapped = graph ? () => 0 : await dropGraph(page);
  await page.addInitScript(seedScript, bigBlob(220, 4000));
  await page.goto('./');
  // P-34: the list is on the Wanders tab; Home's heading shows once the data has loaded.
  await expect(page.getByRole('heading', { name: 'Wanderment' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('home-graph-picture')).toHaveCount(graph ? 1 : 0);
  expect(swapped()).toBe(graph ? 0 : 1);
  // The main thread's work from Return (before the app sees it) until the page is idle again: the
  // log, Home's render, the toast, the deferred render of the picture and the frames that draw them.
  // A chain of messages measures it: a message that arrives more than 3 ms late was held up by that
  // long of other work. 30 ms with none = idle. (Waiting on the database worker isn't work, and
  // requestIdleCallback in headless Chromium now and then waits for its timeout instead.)
  await page.evaluate(() => {
    const w = window as unknown as { __busyMs: number[] };
    w.__busyMs = [];
    window.addEventListener(
      'keydown',
      (e) => {
        if (e.key !== 'Enter') return;
        const t0 = performance.now();
        const ch = new MessageChannel();
        let last = t0;
        let busyUntil = t0;
        let busy = 0;
        ch.port1.onmessage = () => {
          const now = performance.now();
          if (now - last > 3) {
            busy += now - last;
            busyUntil = now;
          }
          last = now;
          if (now - busyUntil < 30 && now - t0 < 5000) return ch.port2.postMessage(0);
          ch.port1.close();
          w.__busyMs.push(busy);
        };
        ch.port2.postMessage(0);
      },
      true,
    );
  });
  return { page, context, errors };
}

/**
 * Three pairs of fresh pages (which one opens first alternates), each with alternating blocks of
 * logs: 120 counted per side. One pair, or fewer logs, swings too much from run to run.
 */
const PAIRS = 3;
const BLOCKS = 8;
const PER_BLOCK = 11;

test('with a large history, logging on Home is not measurably slower with the graph than without it', async ({ browser }) => {
  test.setTimeout(420_000);
  const busy = { with: [] as number[], without: [] as number[] };
  const measured = (page: Page) => page.evaluate(() => (window as unknown as { __busyMs: number[] }).__busyMs.at(-1)!);
  let n = 0;
  for (let pair = 0; pair < PAIRS; pair++) {
    const first = await home(browser, pair % 2 === 0);
    const second = await home(browser, pair % 2 !== 0);
    const arms = pair % 2 === 0 ? { with: first, without: second } : { with: second, without: first };
    // Alternating blocks, so anything else slowing the machine down hits both alike. The first log
    // of each block isn't counted (the page has been idle a while).
    for (let block = 0; block < BLOCKS; block++) {
      const arm = block % 2 ? 'with' : 'without';
      const { page } = arms[arm];
      // The page in use is the one in front (a page behind gets no frames).
      await page.bringToFront();
      for (let k = 0; k < PER_BLOCK; k++) {
        await logLine(page, `timed log ${n++}`);
        // This page's own blocks so far.
        const count = (block >> 1) * PER_BLOCK + k + 1;
        await page.waitForFunction((c) => (window as unknown as { __busyMs: number[] }).__busyMs.length >= c, count, { polling: 10 });
        if (k > 0) busy[arm].push(await measured(page));
      }
      // The logs went in (the box is clear, the toast is up) and, with the graph, the newest dot is marked.
      await expect(logBox(page)).toHaveValue('');
      await expect(page.getByText('Logged', { exact: true }).filter({ visible: true })).toBeVisible();
      if (arm === 'with') await expect(page.locator(`[data-testid^="graph-dot-"][data-newest]`)).toHaveCount(1);
    }
    for (const { context, errors } of [first, second]) {
      await context.close();
      expect(errors, errors.map((e) => e.stack ?? e.message).join('\n\n')).toEqual([]);
    }
  }
  const median = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    return (s[(s.length - 1) >> 1] + s[s.length >> 1]) / 2;
  };
  const [on, off] = [median(busy.with), median(busy.without)];
  console.log(`bigBlob log on Home, main-thread work per log: median ${on.toFixed(1)} ms with the graph, ${off.toFixed(1)} ms without (${(on / off).toFixed(2)}×, n = ${busy.with.length} each)`);
  expect(busy.with).toHaveLength((PAIRS * BLOCKS * (PER_BLOCK - 1)) / 2);
  expect(busy.without).toHaveLength((PAIRS * BLOCKS * (PER_BLOCK - 1)) / 2);
  expect(on).toBeLessThanOrEqual(off * 1.25);
});
