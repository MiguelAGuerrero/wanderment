import { expect, test } from './fixtures';
import { exported, home, plan, settled } from './goFixture';
import { bigBlob, seedScript } from './graphFixture';

/**
 * P-89: an existing person with a large history from the old app (220 wanders, 4,000 lines) and
 * nothing new. The app opens on the home, a start stays quick, and the export holds all of it.
 * (Was: "logging stays quick on Home and Activities"; the screens that drew the history are gone,
 * so nothing here does work per line any more.)
 */
test('with a 4,000-line history from the old app: the home opens, a start stays quick, and the export holds every line', async ({ page }) => {
  // A timing benchmark: it runs at the machine's real speed (verify's full run and CI). Under the
  // CI-speed pass's CPU throttle (E2E_SLOW) it would measure the throttle.
  test.skip(!!process.env.E2E_SLOW, 'timing benchmark: not meaningful under CPU throttling');
  test.slow();
  await page.addInitScript(seedScript, bigBlob(220, 4000));
  const t0 = Date.now();
  await page.goto('./go');
  // The first load also moves the whole history from the first release's format into the database.
  await expect(settled(page, 'home')).toBeVisible({ timeout: 20_000 });
  const firstLoad = Date.now() - t0;

  // From the database (every later open).
  const t1 = Date.now();
  await page.reload();
  await expect(settled(page, 'home')).toBeVisible({ timeout: 20_000 });
  const load = Date.now() - t1;

  // Return on "New: …" to Plan on the new routine, asking for its first step.
  await home(page).prompt.fill('Water the plants');
  await expect(home(page).screen.getByTestId('go-row-new')).toBeVisible();
  const t2 = Date.now();
  await home(page).prompt.press('Enter');
  await expect(plan(page).add).toBeVisible();
  const start = Date.now() - t2;

  const t3 = Date.now();
  const data = await exported(page);
  const exportMs = Date.now() - t3;
  console.log(`4,000 lines: first load ${firstLoad} ms, load ${load} ms, start → Plan ${start} ms, settings + export ${exportMs} ms`);
  expect(Object.keys(data.activities)).toHaveLength(4000);
  expect(Object.keys(data.threads)).toHaveLength(220);
  expect(Object.values(data.routines).map((r) => r.words)).toEqual(['Water the plants']);
  expect(load).toBeLessThan(5000);
  expect(start).toBeLessThan(1500);
  expect(exportMs).toBeLessThan(8000);
});
