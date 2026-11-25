/**
 * P-85 (B-11 groundwork): storage for any kind of record. A routine and a run — holding fields no
 * screen draws (blanks, reactions, values) — are put in by importing a backup and read back, exactly,
 * from an export download. P-89: on Settings in the new app; what is here is read from the export.
 */
import { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

import { expect, test } from './fixtures';
import { IMPORTED, openSettings } from './goFixture';
import { legacyBlob, seedScript } from './graphFixture';

const at = (day: number) => new Date(Date.UTC(2026, 0, day, 12)).toISOString();
const act = (id: string, text: string, day: number) => ({ id, text, occurredAt: at(day), createdAt: at(day), toIds: [] });
const routine = {
  id: 'r1',
  words: 'Apply to ▢employer',
  named: true,
  createdAt: at(2),
  items: [
    { id: 'i1', text: 'Find the posting' },
    { id: 'i2', wait: 'a reply', reactions: [{ name: 'They said yes', items: [{ id: 'i3', text: 'Book a call' }] }] },
  ],
  repeatFrom: 1,
  blanks: ['employer'],
};
const run = { id: 'n1', routineId: 'r1', startedAt: at(3), waitingSince: at(4), values: { employer: 'Acme' }, frames: [{ seq: 'r1', at: 'i2', round: 1 }], reason: 'lunch' };
const file = (data: unknown) => JSON.stringify({ app: 'wanderment', exportedAt: at(60), data });
/** A backup from before P-85: format 1, which has no routines or runs. */
const V1 = file({ version: 1, threads: {}, activities: { o1: act('o1', 'hemmed', 3), o2: act('o2', 'pinned', 9) } });
/** A format-2 backup holding a routine and a run. */
const V2 = file({ version: 2, threads: {}, activities: { i1: act('i1', 'cut', 5) }, routines: { r1: routine }, runs: { n1: run } });

const EARLIER = 'Your earlier wanders and lines are kept, and are in every export.';
const preview = (page: Page) => page.getByTestId('import-preview');
const REPLACE_TITLE = 'Replace what’s here with this backup?';

async function choose(page: Page, json: string) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import from a backup' }).click();
  await (await chooser).setFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(json) });
}

async function exported(page: Page) {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export everything (.json)' }).click();
  return JSON.parse(readFileSync((await (await download).path())!, 'utf8')) as { data: { version: number; threads: Record<string, unknown>; activities: Record<string, unknown>; routines: Record<string, unknown>; runs: Record<string, unknown> } };
}

test('a format-1 backup and a format-2 backup holding a routine both import; after a reload the routine is still in an export', async ({ page }) => {
  await page.addInitScript(seedScript, legacyBlob(['draw'], [{ from: 'draw', text: 'sketched', daysAgo: 1 }]));
  await openSettings(page);
  await expect(page.getByText(EARLIER, { exact: true })).toBeVisible();
  const atFirst = await exported(page);
  expect([Object.keys(atFirst.data.activities), Object.keys(atFirst.data.threads)]).toEqual([['a0'], ['draw']]);

  // Format 1: imports as it always has, and what's exported from then on is format 2.
  await choose(page, V1);
  await expect(page.getByRole('group', { name: REPLACE_TITLE })).toBeFocused();
  await expect(preview(page)).toContainText(/This backup has 2 activities, from \S.*2026\./);
  await expect(preview(page)).toContainText('Replacing would add 2 and remove 1 activity, and remove 1 wander.');
  await page.getByRole('button', { name: 'Replace', exact: true }).click();
  await expect(page.getByText(IMPORTED, { exact: true })).toBeVisible();
  const afterV1 = await exported(page);
  expect(afterV1.data.version).toBe(2);
  expect(Object.keys(afterV1.data.activities).sort()).toEqual(['o1', 'o2']);
  expect(afterV1.data.threads).toEqual({});
  expect(afterV1.data.routines).toEqual({});
  expect(afterV1.data.runs).toEqual({});

  // Format 2 with a routine and a run: the preview names them, and Replace takes them.
  await choose(page, V2);
  await expect(page.getByRole('group', { name: REPLACE_TITLE })).toBeFocused();
  await expect(preview(page)).toContainText(/This backup has 1 activity, 1 routine and 1 run, on \S.*2026\./);
  await expect(preview(page)).toContainText('Replacing would add 1 and remove 2 activities, and add 1 routine, and add 1 run.');
  await page.getByRole('button', { name: 'Replace', exact: true }).click();
  await expect(page.getByText(IMPORTED, { exact: true })).toBeVisible();

  // Saved, not just on screen: after a reload the export still holds them, exactly.
  await page.reload();
  await expect(page.getByText(EARLIER, { exact: true })).toBeVisible();
  const afterV2 = await exported(page);
  expect(afterV2.data.version).toBe(2);
  expect(afterV2.data.routines).toEqual({ r1: routine });
  expect(afterV2.data.runs).toEqual({ n1: run });
  expect(Object.keys(afterV2.data.activities)).toEqual(['i1']);

  // The same file again matches what's here (the routine and the run are compared too)…
  await choose(page, V2);
  await expect(page.getByRole('group', { name: 'This backup matches what’s here.' })).toBeFocused();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  // …and a format-1 backup now says the routine and the run would go.
  await choose(page, V1);
  await expect(preview(page)).toContainText('Replacing would add 2 and remove 1 activity, and remove 1 routine, and remove 1 run.');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.reload();
  await expect(page.getByText(EARLIER, { exact: true })).toBeVisible();
  const atLast = await exported(page);
  expect(atLast.data.routines).toEqual({ r1: routine });
  expect(atLast.data.runs).toEqual({ n1: run });
  expect(Object.keys(atLast.data.activities)).toEqual(['i1']);
});
