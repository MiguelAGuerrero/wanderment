/**
 * P-86 (B-11 slice 1): the `/go` screens against B-11 §6 — no serious axe violations on any screen or
 * layer; targets ≥ 48 px; text ≥ 16 px; a level-1 heading on every screen and level 2 on every layer;
 * one filled button per screen or layer; spoken names for icon-only and repeated buttons; Reduce
 * Motion (nothing animates); and reflow with the keyboard up and at 200 % text.
 *
 * "Keyboard up" and "200 %" are layout stand-ins: a 390×510 window (what a phone keyboard leaves) and
 * a 195×422 window (what 200 % zoom gives a 390×844 phone). They prove the layout, not a real
 * on-screen keyboard or a real text-size setting.
 */
import { AxeBuilder } from '@axe-core/playwright';
import { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { arrived, home, paused, runner, settled, startGo } from './goFixture';

const PAPER = 'rgb(244, 241, 232)';
const RUNS = [
  { id: 'r3', routine: 'drawing', at: 1, inner: [{ routine: 'hands', at: 3, round: 2 }], status: 'running' as const },
  { id: 'r1', routine: 'apply', at: 1, reason: 'need the job ad open', touchedMinutesAgo: 30 },
  { id: 'r2', routine: 'apply-acme', at: 1, waitingDaysAgo: 9, touchedMinutesAgo: 90 },
];

async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = serious.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => `${n.target.join(' ')} ${n.html.slice(0, 200)}`).slice(0, 5).join('\n  ')}`);
  expect(report, report.join('\n')).toEqual([]);
}

/**
 * B-11 §6 on what is in front: every control ≥ 48×48 and inside the window, every text ≥ 16 px, every
 * control named, at most one filled button, and a heading of the right level.
 */
async function expectRules(page: Page, scope: Locator, heading: 1 | 2, filled: number | 'at most one' = 'at most one') {
  const found = await scope.evaluate(
    (root, paper) => {
      const shown = (e: Element) => {
        const b = e.getBoundingClientRect();
        return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[inert]');
      };
      const controls = [...root.querySelectorAll('button, [role="button"], [role="radio"], input, textarea, a[href]')].filter(shown);
      const name = (e: Element) => e.getAttribute('aria-label') || (e as HTMLElement).innerText || (e as HTMLInputElement).placeholder || '';
      const small = controls.filter((e) => { const b = e.getBoundingClientRect(); return b.width < 47.5 || b.height < 47.5; }).map((e) => `${name(e)} ${Math.round(e.getBoundingClientRect().width)}×${Math.round(e.getBoundingClientRect().height)}`);
      const outside = controls.filter((e) => { const b = e.getBoundingClientRect(); return b.left < -0.5 || b.right > innerWidth + 0.5; }).map(name);
      const unnamed = controls.filter((e) => !name(e).trim()).map((e) => e.outerHTML.slice(0, 80));
      const texts = [...root.querySelectorAll('*')].filter((e) => shown(e) && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()));
      const tiny = texts.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => e.textContent!.slice(0, 30));
      const fields = controls.filter((e) => (e.tagName === 'INPUT' || e.tagName === 'TEXTAREA') && parseFloat(getComputedStyle(e).fontSize) < 16).map(name);
      const filled = controls.filter((e) => getComputedStyle(e).backgroundColor === paper && e.getAttribute('aria-disabled') !== 'true').map(name);
      const headings = [...root.querySelectorAll('[role="heading"], h1, h2')].filter((e) => !e.closest('[inert]')).map((e) => e.getAttribute('aria-level') ?? e.tagName.slice(1));
      return { small, outside, unnamed, tiny: [...tiny, ...fields], filled, headings };
    },
    PAPER,
  );
  expect(found.small, 'targets under 48 px').toEqual([]);
  expect(found.outside, 'controls outside the window').toEqual([]);
  expect(found.unnamed, 'controls with no name').toEqual([]);
  expect(found.tiny, 'text under 16 px').toEqual([]);
  if (filled === 'at most one') expect(found.filled.length, `filled buttons: ${found.filled.join(', ')}`).toBeLessThanOrEqual(1);
  else expect(found.filled, 'filled buttons').toHaveLength(filled);
  expect(found.headings, `a level-${heading} heading`).toContain(String(heading));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('home: axe, targets, text, heading, names — empty, with tiles, and while typing', async ({ page }) => {
  await startGo(page, [], 'home', []);
  await expectNoSeriousViolations(page);
  await expectRules(page, home(page).screen, 1, 0);

  await startGo(page, RUNS.slice(1));
  const h = home(page);
  await expectNoSeriousViolations(page);
  await expectRules(page, h.screen, 1, 0);
  await h.prompt.fill('pro');
  await expectNoSeriousViolations(page);
  await expectRules(page, h.screen, 1, 0);
  // Reading order: the title, the tiles in their order, then the prompt.
  const order = await h.screen.evaluate((root) => [...root.querySelectorAll('[role="heading"], [data-testid="go-tile"], [data-testid="go-rows"], [data-testid="go-prompt"]')].map((e) => (e as HTMLElement).dataset.testid ?? 'heading'));
  expect(order[0]).toBe('heading');
  expect(order[order.length - 1]).toBe('go-prompt');
});

test('the runner, its panel, Break it down, the Keep ask: axe and the rules on each; reading order context → note → notice → handle → buttons', async ({ page }) => {
  await startGo(page, RUNS, 'runner');
  const r = runner(page);
  await expect(r.words).toHaveText('Add the shadows');
  await expectNoSeriousViolations(page);
  await expectRules(page, r.screen, 1, 1);
  // Spoken names: icon-only and changing buttons, and the mark.
  await expect(r.pause).toHaveAccessibleName('Pause');
  await expect(r.pause).toHaveText('');
  await expect(r.handle).toHaveAccessibleName('More about this step');
  await expect(r.done).toHaveAccessibleName('Done with Hand studies of my left hand');
  await expect(r.screen.getByRole('img', { name: 'Last step of this round', exact: true })).toBeVisible();
  const order = await r.screen.evaluate((root) =>
    [...root.querySelectorAll('[role="heading"], [data-testid="go-context"], [data-testid="go-done"], [data-testid="go-note"], [data-testid="go-notice-slot"], [data-testid="go-handle"], [data-testid="go-pause"], [data-testid="go-middle"], [data-testid="go-next"]')].map(
      (e) => (e as HTMLElement).dataset.testid ?? 'heading',
    ),
  );
  expect(order).toEqual(['heading', 'go-context', 'go-done', 'go-note', 'go-notice-slot', 'go-handle', 'go-pause', 'go-middle', 'go-next']);
  // The notice is a polite live region, in the flow (it can cover nothing).
  const slot = r.screen.getByTestId('go-notice-slot');
  await expect(slot).toHaveAttribute('aria-live', 'polite');
  await r.next.click();
  await expect(r.notice).toBeVisible();
  const n = (await r.notice.boundingBox())!;
  const noteBox = (await r.note.boundingBox())!;
  const handle = (await r.handle.boundingBox())!;
  expect(n.y).toBeGreaterThanOrEqual(noteBox.y + noteBox.height);
  expect(n.y + n.height).toBeLessThanOrEqual(handle.y + 1);
  await expectNoSeriousViolations(page);

  await r.handle.click();
  await expect(r.panel).toBeVisible();
  await expectNoSeriousViolations(page);
  await expectRules(page, r.screen, 1, 1);
  await page.keyboard.press('Escape');

  await r.middle.click();
  const sheet = await arrived(page, 'go-break');
  await expect(sheet).toHaveRole('dialog');
  await expectNoSeriousViolations(page);
  await page.getByRole('textbox', { name: 'A smaller step', exact: true }).fill('Squint at it');
  await expectRules(page, sheet, 2, 1);
  await sheet.getByRole('button', { name: 'Step in', exact: true }).click();
  await r.done.click();
  const keep = await arrived(page, 'go-keep');
  await expectNoSeriousViolations(page);
  await expectRules(page, keep, 2, 1);
});

test('the edge, a wait, Paused, Waiting, the confirm, See it all and its menus, Jump to…, the editor: axe and the rules on each', async ({ page }) => {
  await startGo(page, [{ id: 'r4', routine: 'spanish-es', at: null, status: 'running' }], 'runner');
  await expect(runner(page).field).toBeFocused();
  await expectNoSeriousViolations(page);
  await expectRules(page, runner(page).screen, 1, 0);

  await startGo(page, [{ id: 'r2', routine: 'apply-acme', at: 1, waitingDaysAgo: 9, status: 'running' }, RUNS[1]], 'runner');
  const r = runner(page);
  await expectNoSeriousViolations(page);
  await expectRules(page, r.screen, 1, 1);
  await r.pause.click();
  const p = paused(page);
  await expect(p.title).toHaveText('Waiting');
  await expectNoSeriousViolations(page);
  await expectRules(page, p.screen, 1, 1);
  await p.reason.fill('they said two weeks');
  await expectRules(page, p.screen, 1, 1);
  await p.home.click();
  const ask = await arrived(page, 'go-stop');
  await expectNoSeriousViolations(page);
  await expectRules(page, ask, 2, 1);
  await page.keyboard.press('Escape');

  await p.screen.getByRole('button', { name: 'See it all', exact: true }).click();
  const all = settled(page, 'all');
  await expectNoSeriousViolations(page);
  await expectRules(page, all, 1, 0);
  await all.getByRole('button', { name: 'More for Send the application', exact: true }).click();
  const menu = await arrived(page, 'go-all-menu');
  await expectNoSeriousViolations(page);
  await expectRules(page, menu, 2, 1);
  await menu.getByRole('button', { name: 'Change the words', exact: true }).click();
  await expectNoSeriousViolations(page);
  await expectRules(page, menu, 2, 1);
  await page.keyboard.press('Escape');
  await page.goBack();

  await paused(page).screen.getByRole('button', { name: 'Jump to…', exact: true }).click();
  const j = settled(page, 'jump');
  await expectNoSeriousViolations(page);
  await expectRules(page, j, 1, 0);
  await j.getByRole('radio', { name: 'Note the answer in the tracker', exact: true }).click();
  await expectNoSeriousViolations(page);
  await expectRules(page, j, 1, 1);
  await page.goBack();
  await page.goBack();

  await home(page).screen.getByRole('button', { name: 'More for Practise drawing', exact: true }).click();
  const e = settled(page, 'editor');
  await e.getByRole('button', { name: 'Add Repeat from here', exact: true }).click();
  await e.getByRole('radio', { name: 'A number', exact: true }).click();
  await expectNoSeriousViolations(page);
  await expectRules(page, e, 1, 0);
});

test('focus has its own ring; sheets take focus and give it back; focus is never lost to nothing', async ({ page }) => {
  await startGo(page, RUNS, 'runner');
  const r = runner(page);
  await r.next.focus();
  const ring = await r.next.evaluate((e) => ({ style: getComputedStyle(e).outlineStyle, colour: getComputedStyle(e).outlineColor, offset: getComputedStyle(e).outlineOffset }));
  expect(ring).toEqual({ style: 'solid', colour: 'rgb(185, 167, 255)', offset: '3px' });
  // Tab order on the runner: the context line, Done, the note, the handle, Pause, the middle, Next.
  await r.context.focus();
  const seen: string[] = [];
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    seen.push(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.testid ?? ''));
  }
  expect(seen).toEqual(['go-done', 'go-note', 'go-handle', 'go-pause', 'go-middle', 'go-next']);
  // A sheet: focus in, and back to what opened it.
  await r.middle.click();
  await arrived(page, 'go-break');
  await expect(page.getByRole('textbox', { name: 'A smaller step', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(r.middle).toBeFocused();
});

test('Reduce Motion: sheets, the confirm and the panel are just there — nothing animates', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await startGo(page, RUNS, 'runner');
  const r = runner(page);
  await r.middle.click();
  // No waiting for it to arrive: it never moves.
  await expect(page.getByTestId('go-break')).toHaveAttribute('data-moving', 'false');
  expect(await page.getByTestId('go-break').evaluate((e) => ({ opacity: getComputedStyle(e).opacity, transform: getComputedStyle(e).transform }))).toEqual({ opacity: '1', transform: 'matrix(1, 0, 0, 1, 0, 0)' });
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await page.keyboard.press('Escape');
  await r.handle.click();
  await expect(r.panel).toHaveAttribute('data-moving', 'false');
  await r.next.click();
  await expect(r.note).toHaveAttribute('data-moving', 'false');
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await r.pause.click();
  await paused(page).home.click();
  await expect(page.getByTestId('go-stop')).toHaveAttribute('data-moving', 'false');
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
});

test('without Reduce Motion nothing takes long and nothing moves a control: a sheet has arrived within its 160 ms slide', async ({ page }) => {
  await startGo(page, RUNS, 'runner');
  const r = runner(page);
  const next = await r.next.boundingBox();
  await r.middle.click();
  await arrived(page, 'go-break');
  expect(await r.next.boundingBox()).toEqual(next);
});

for (const [label, size] of [
  ['keyboard up (390×510)', { width: 390, height: 510 }],
  ['200 % text (195×422)', { width: 195, height: 422 }],
] as const) {
  test(`${label}: the runner — the note always fits its room, the three buttons and Done stay reachable, nothing is clipped or scrolls sideways`, async ({ page }) => {
    await startGo(page, RUNS, 'runner');
    await page.setViewportSize(size);
    const r = runner(page);
    await expect(r.next).toBeInViewport();
    // The note is sized from the room it measures, so after a change (a notice appearing, a new step)
    // the layout takes a frame or two to come to rest: the checks are retried until it has.
    const fits = () => expect(fitsNow).toPass({ timeout: 5000 });
    const fitsNow = async () => {
      expect((await r.note.boundingBox())!.width).toBeLessThan(Math.min(size.width - 25, 250));
      const area = (await r.screen.getByTestId('go-note-area').boundingBox())!;
      const n = (await r.note.boundingBox())!;
      expect(n.y).toBeGreaterThanOrEqual(area.y);
      expect(n.y + n.height).toBeLessThanOrEqual(area.y + area.height + 0.5);
      expect(n.x).toBeGreaterThanOrEqual(0);
      expect(n.x + n.width).toBeLessThanOrEqual(size.width);
      for (const l of [r.pause, r.middle, r.next, r.done, r.handle]) {
        const b = (await l.boundingBox())!;
        expect(b.y, 'top').toBeGreaterThanOrEqual(0);
        expect(b.y + b.height, 'bottom').toBeLessThanOrEqual(size.height + 0.5);
        expect(b.x + b.width, 'right').toBeLessThanOrEqual(size.width + 0.5);
        expect(Math.min(b.width, b.height), 'target').toBeGreaterThanOrEqual(47.5);
      }
      // The words are inside the note (or the note is full and scrolls them).
      if ((await r.note.getAttribute('data-full')) === 'false' && (await r.words.count())) {
        const w = (await r.words.boundingBox())!;
        expect(w.y + w.height).toBeLessThanOrEqual(n.y + n.height + 0.5);
        expect(w.x + w.width).toBeLessThanOrEqual(n.x + n.width + 0.5);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    };
    await fits();
    // With a notice showing, too.
    await r.next.click();
    await expect(r.notice).toBeVisible();
    await fits();
    // The panel scrolls inside its room; the buttons have not moved off.
    await r.handle.click();
    await expect(r.panel).toBeVisible();
    await expect(r.next).toBeInViewport();
    await page.keyboard.press('Escape');
    // The edge: the field is in the note, in view.
    await r.done.click();
    await page.keyboard.press('Escape');
    await r.next.click();
    await expect(r.field).toBeVisible();
    await fits();
    await expect(r.field).toBeInViewport();
    await expectNoSeriousViolations(page);
  });

  test(`${label}: home, Paused, Break it down and the confirm reflow — every control in reach`, async ({ page }) => {
    await startGo(page, RUNS, 'runner');
    await page.setViewportSize(size);
    const r = runner(page);
    await r.middle.click();
    const sheet = await arrived(page, 'go-break');
    const field = page.getByRole('textbox', { name: 'A smaller step', exact: true });
    await field.fill('Squint at it');
    await field.press('Enter');
    await expect(field).toBeInViewport();
    await expect(sheet.getByRole('button', { name: 'Step in', exact: true })).toBeInViewport();
    await expectRules(page, sheet, 2, 1);
    await page.keyboard.press('Escape');

    await r.pause.click();
    const p = paused(page);
    await expect(p.resume).toBeInViewport();
    await expect(p.home).toBeInViewport();
    await expectRules(page, p.screen, 1, 1);
    await p.home.click();
    const ask = await arrived(page, 'go-stop');
    await expect(ask.getByRole('button', { name: 'Cancel', exact: true })).toBeInViewport();
    await expect(ask.getByRole('button', { name: 'Home', exact: true })).toBeInViewport();
    await expectRules(page, ask, 2, 1);
    await ask.getByRole('button', { name: 'Home', exact: true }).click();

    const h = home(page);
    await expect(h.prompt).toBeInViewport();
    await expectRules(page, h.screen, 1, 0);
    await expectNoSeriousViolations(page);
  });
}
