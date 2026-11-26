/**
 * P-86 (B-11 slice 1), P-90: the `/go` screens — Plan among them — against B-11 §6 and DESIGN.md §6: no
 * serious axe violations on any screen or layer; targets ≥ 48 px; text ≥ 16 px; a level-1 heading on
 * every screen and level 2 on every layer; one filled button per screen or layer; spoken names for
 * icon-only and repeated buttons; Reduce Motion (nothing animates); and reflow with the keyboard up
 * and at 200 % text. Plan against Run without colour: what each says on arriving, where focus lands,
 * the band pinned.
 *
 * "Keyboard up" and "200 %" are layout stand-ins: a 390×510 window (what a phone keyboard leaves) and
 * a 195×422 window (what 200 % zoom gives a 390×844 phone). They prove the layout, not a real
 * on-screen keyboard or a real text-size setting.
 */
import { AxeBuilder } from '@axe-core/playwright';
import { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { addStep, arrived, home, paused, plan, planMenu, RoutineSpec, runner, setVisibility, settled, startGo } from './goFixture';

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

test('the runner and its panel: axe and the rules on each; reading order context → note → notice → handle → buttons; it says "Running" and the step on arriving', async ({ page }) => {
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
  // (P-95: Next leaves no notice; Done does.)
  await r.done.click();
  await expect(r.notice).toContainText('Done with Hand studies of my left hand');
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

  // Unmistakably the runner, without colour: said once on arriving, and the note has the focus.
  await page.reload();
  await expect(r.said).toHaveText('Running: Gesture drawing');
  await expect(r.said).toHaveAttribute('aria-live', 'polite');
  await expect(r.note).toBeFocused();
  await expect(r.middle).toHaveAccessibleName('Plan');
});

const TEST: RoutineSpec = { id: 'test', name: 'Test out the app', steps: ['Select a feature to test', 'Vibe check', { wait: 'the build to finish' }, 'Write down concerns', { routine: 'proof' }], repeatFrom: 1, repeat: 3 };

test('Plan: axe and the rules mid-run, with a notice, on its menus and sheets, while typing in place, at the edge, and for a routine with no run', async ({ page }) => {
  await startGo(page, [{ id: 'r1', routine: 'test', at: 1, round: 2, status: 'running' }], 'runner', [TEST, { id: 'proof', name: 'Proofread out loud', home: false, open: false, steps: ['Read it aloud once'] }]);
  await runner(page).middle.click();
  const p = plan(page);
  await expect(p.forward).toHaveText('Resume at Vibe check');
  await expectNoSeriousViolations(page);
  // One filled button: Resume at <step>.
  await expectRules(page, p.screen, 1, 1);
  // Spoken names: the heading says Plan and the routine; HERE is in words; every row's menu names its step.
  await expect(p.title).toHaveAccessibleName('Plan: Test out the app');
  await expect(p.here).toHaveAccessibleName('Here, Vibe check');
  await expect(p.more('Vibe check')).toHaveText('');
  await expect(p.dividerUp).toHaveText('');
  await expect(p.divider).toHaveAccessibleName('Repeat from here');
  await expect(p.screen.getByRole('button', { name: 'Open Proofread out loud', exact: true })).toHaveAttribute('aria-expanded', 'false');
  // HERE is 16 px or more, and its white outline is HERE's alone.
  expect(await p.here.getByTestId('go-plan-here').evaluate((e) => parseFloat(getComputedStyle(e.firstElementChild!).fontSize))).toBeGreaterThanOrEqual(16);
  const outlines = await p.rows.evaluateAll((els) => els.map((e) => getComputedStyle(e).borderTopColor));
  expect(outlines.filter((c) => c === 'rgb(244, 241, 232)')).toHaveLength(1);
  // Reading order: the band (the word, Home), the heading, where you are, the rows, the open row, the notice, the filled button.
  const order = await p.screen.evaluate((root) =>
    [...root.querySelectorAll('[data-testid="go-plan-word"], [data-testid="go-plan-home"], [role="heading"], [data-testid="go-plan-line"], [data-testid="go-plan-row"], [data-testid="go-plan-add"], [data-testid="go-notice-slot"], [data-testid="go-plan-forward"]')].map(
      (e) => (e as HTMLElement).dataset.testid ?? 'heading',
    ),
  );
  expect(order).toEqual(['go-plan-word', 'go-plan-home', 'heading', 'go-plan-line', 'go-plan-row', 'go-plan-row', 'go-plan-row', 'go-plan-row', 'go-plan-row', 'go-plan-add', 'go-notice-slot', 'go-plan-forward']);

  // A step's menu: a dialog with its step as the heading; no filled button (nothing in it is "the" forward choice).
  await p.more('Vibe check').click();
  const menu = await arrived(page, 'go-plan-menu');
  await expect(menu).toHaveRole('dialog');
  await expectNoSeriousViolations(page);
  await expectRules(page, menu, 2, 0);
  await menu.getByRole('button', { name: 'Change the words', exact: true }).click();
  // Typing in place, with a name that says what is being changed.
  await expect(p.typed).toHaveAccessibleName('Step: Vibe check');
  await expectNoSeriousViolations(page);
  await expectRules(page, p.screen, 1, 1);
  await p.typed.fill('Check the vibe');
  await p.typed.press('Enter');
  // With the notice and its Undo.
  await expect(p.notice).toContainText('Changed “Vibe check”');
  await expect(p.undo).toHaveAccessibleName('Undo Change');
  await expectNoSeriousViolations(page);
  await expectRules(page, p.screen, 1, 1);
  // The notice is in the flow, above the filled button: it covers nothing.
  const n = (await p.notice.boundingBox())!;
  const f = (await p.forward.boundingBox())!;
  const l = (await p.list.boundingBox())!;
  expect(n.y).toBeGreaterThanOrEqual(l.y + l.height - 1);
  expect(n.y + n.height).toBeLessThanOrEqual(f.y + 1);

  // Repeat from here: its sheet.
  await p.dividerMore.click();
  const repeat = await arrived(page, 'go-plan-repeat');
  await expectNoSeriousViolations(page);
  await expectRules(page, repeat, 2, 0);
  await page.keyboard.press('Escape');
  // The routine's own menu.
  await p.more('Test out the app').click();
  const own = await arrived(page, 'go-plan-routine');
  await expectNoSeriousViolations(page);
  await expectRules(page, own, 2, 0);
  await page.keyboard.press('Escape');
  // A wait, and a routine opened in place.
  await p.screen.getByRole('button', { name: 'Open Proofread out loud', exact: true }).click();
  await expect(p.rows).toHaveCount(6);
  await expectNoSeriousViolations(page);
  await expectRules(page, p.screen, 1, 1);

  // The edge: no filled button at all; Done has its slot.
  await startGo(page, [{ id: 'r4', routine: 'spanish-es', at: null, status: 'running' }], 'plan');
  await expect(p.add).toBeFocused();
  await expect(p.done).toHaveAccessibleName('Done with Feel at home in Spanish');
  await expectNoSeriousViolations(page);
  await expectRules(page, p.screen, 1, 0);
  // No run, with steps: Start is the one filled button.
  await page.goto('./go/routine/drawing');
  await expect(p.forward).toHaveText('Start');
  await expectNoSeriousViolations(page);
  await expectRules(page, p.screen, 1, 1);
});

test('Plan against Run without colour: arriving in Plan says "Plan" and the routine with focus on the heading; coming back says "Running" and the step with focus on the note', async ({ page }) => {
  await startGo(page, [{ id: 'r1', routine: 'test', at: 1, round: 2, status: 'running' }], 'runner', [TEST, { id: 'proof', name: 'Proofread out loud', home: false, open: false, steps: ['Read it aloud once'] }]);
  const r = runner(page);
  const p = plan(page);
  await r.middle.click();
  await expect(p.title).toBeFocused();
  await expect(p.title).toHaveAccessibleName('Plan: Test out the app');
  // The word is text, in the band, and the band is light whatever the routine's colour.
  await expect(p.word).toHaveText('PLAN');
  expect(await p.band.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe(PAPER);
  // The shapes differ: Plan has no note, the runner has no rows.
  await expect(p.screen.getByTestId('go-note')).toHaveCount(0);
  await p.forward.click();
  await expect(r.note).toBeFocused();
  await expect(r.said).toHaveText('Running: Vibe check');
  await expect(r.screen.getByTestId('go-plan-row')).toHaveCount(0);
  await expect(r.screen.getByText('PLAN', { exact: true })).toHaveCount(0);
  // At the edge focus is on the open row, so "Plan" and the routine are said (politely) instead.
  await r.next.click();
  await r.next.click();
  await expect(r.words).toHaveText('Write down concerns');
  await startGo(page, [{ id: 'r3', routine: 'drawing', at: 2, status: 'running' }], 'runner');
  await runner(page).next.click();
  await expect(p.add).toBeFocused();
  await expect(p.said).toHaveText('Plan: Practise drawing');
  await expect(p.said).toHaveAttribute('aria-live', 'polite');
});

test('a wait, Paused, Waiting, home with a paused run first (P-95), Planning on the paused screen and Jump to…: axe and the rules on each', async ({ page }) => {
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
  // P-95: Home asks nothing; home has the run first, its Resume the one filled button.
  await p.home.click();
  await expect(home(page).tiles.first()).toHaveAttribute('data-state', 'waiting');
  await expectNoSeriousViolations(page);
  await expectRules(page, home(page).screen, 1, 1);
  await home(page).tiles.first().getByRole('button', { name: 'Resume Apply to Acme', exact: true }).click();
  await runner(page).pause.click();

  await paused(page).screen.getByRole('button', { name: 'Jump to…', exact: true }).click();
  const j = settled(page, 'jump');
  await expectNoSeriousViolations(page);
  await expectRules(page, j, 1, 0);
  await j.getByRole('radio', { name: 'Note the answer in the tracker', exact: true }).click();
  await expectNoSeriousViolations(page);
  await expectRules(page, j, 1, 1);
  await page.goBack();

  // A run left in Plan, on the paused screen: "Planning", one filled button (Plan).
  await startGo(page, [{ id: 'r1', routine: 'apply', at: 1, status: 'paused', mode: 'plan' }, RUNS[2]], 'plan');
  await page.goto('./go/run/r1/paused');
  await expect(paused(page).title).toHaveText('Planning');
  await expectNoSeriousViolations(page);
  await expectRules(page, paused(page).screen, 1, 1);
});

test('focus has its own ring; sheets take focus and give it back; focus is never lost to nothing', async ({ page }) => {
  await startGo(page, RUNS, 'runner');
  const r = runner(page);
  await r.next.focus();
  const ring = await r.next.evaluate((e) => ({ style: getComputedStyle(e).outlineStyle, colour: getComputedStyle(e).outlineColor, offset: getComputedStyle(e).outlineOffset }));
  expect(ring).toEqual({ style: 'solid', colour: 'rgb(185, 167, 255)', offset: '3px' });
  // Tab order on the runner: Done, the note, the handle, Pause, the middle, Next (the context line is words, not a control).
  await r.done.focus();
  const seen: string[] = [];
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');
    seen.push(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.testid ?? ''));
  }
  expect(seen).toEqual(['go-note', 'go-handle', 'go-pause', 'go-middle', 'go-next']);
  // Plan: the ring is focus's own (HERE's outline is white, and is not it).
  await r.middle.click();
  const p = plan(page);
  // Arriving in Plan moves focus to the heading; wait for that before moving focus ourselves.
  await expect(p.title).toBeFocused();
  await p.forward.focus();
  expect(await p.forward.evaluate((e) => ({ style: getComputedStyle(e).outlineStyle, colour: getComputedStyle(e).outlineColor, offset: getComputedStyle(e).outlineOffset }))).toEqual(ring);
  expect(await p.here.evaluate((e) => getComputedStyle(e).outlineStyle)).toBe('none');
  // Tab order in Plan starts in the band: Home, then the heading's menu, then the rows.
  await p.home.focus();
  await page.keyboard.press('Tab');
  await expect(p.more('Practise drawing')).toBeFocused();
  // A sheet: focus in (its heading), and back to what opened it.
  const more = p.more('Add the shadows');
  await more.click();
  const menu = await arrived(page, 'go-plan-menu');
  await expect(menu.getByRole('heading', { level: 2 })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(more).toBeFocused();
});

// After the audit (F4): WCAG 1.4.11 — a focus indicator needs 3:1 against what it is drawn on. The
// band is light (paper), so the app's lavender ring (1.85:1 there) is not enough for Home and Done.
test('the focus ring on the Plan band’s Home and Done is at least 3:1 against the band', async ({ page }) => {
  await startGo(page, [{ id: 'r3', routine: 'drawing', at: 2, status: 'running' }], 'runner');
  await runner(page).next.click();
  const p = plan(page);
  await expect(p.done).toBeVisible();
  const band = await p.band.evaluate((e) => getComputedStyle(e).backgroundColor);
  expect(band).toBe(PAPER);
  const luminance = (rgb: string) => {
    const [r, g, b] = rgb.match(/[\d.]+/g)!.slice(0, 3).map((v) => {
      const c = Number(v) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a: string, b: string) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
  for (const control of [p.home, p.done]) {
    await control.focus();
    const ring = await control.evaluate((e) => ({ style: getComputedStyle(e).outlineStyle, width: getComputedStyle(e).outlineWidth, colour: getComputedStyle(e).outlineColor }));
    expect(ring.style).toBe('solid');
    expect(parseFloat(ring.width)).toBeGreaterThanOrEqual(2);
    expect(contrast(ring.colour, band), `${ring.colour} on ${band}`).toBeGreaterThanOrEqual(3);
  }
});

test('Reduce Motion: sheets, the confirm, the panel and the change between Plan and the runner are just there — nothing animates', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await startGo(page, RUNS, 'runner');
  const r = runner(page);
  await r.middle.click();
  const p = plan(page);
  await expect(p.here).toBeInViewport();
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await p.more('Add the shadows').click();
  // No waiting for it to arrive: it never moves.
  await expect(page.getByTestId('go-plan-menu')).toHaveAttribute('data-moving', 'false');
  expect(await page.getByTestId('go-plan-menu').evaluate((e) => ({ opacity: getComputedStyle(e).opacity, transform: getComputedStyle(e).transform }))).toEqual({ opacity: '1', transform: 'matrix(1, 0, 0, 1, 0, 0)' });
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await page.keyboard.press('Escape');
  await p.forward.click();
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await r.handle.click();
  await expect(r.panel).toHaveAttribute('data-moving', 'false');
  await r.next.click();
  await expect(r.note).toHaveAttribute('data-moving', 'false');
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await r.pause.click();
  await paused(page).home.click();
  await expect(home(page).tiles.first()).toHaveAttribute('data-state', 'paused');
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  // P-95: New's own sheet never moves either.
  await home(page).screen.getByTestId('go-new').click();
  await expect(page.getByTestId('go-new-sheet')).toHaveAttribute('data-moving', 'false');
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
});

test('without Reduce Motion nothing takes long and nothing moves a control: a sheet has arrived within its 160 ms slide', async ({ page }) => {
  await startGo(page, RUNS, 'runner');
  await runner(page).middle.click();
  const p = plan(page);
  const forward = await p.forward.boundingBox();
  const home = await p.home.boundingBox();
  await p.more('Add the shadows').click();
  await arrived(page, 'go-plan-menu');
  expect(await p.forward.boundingBox()).toEqual(forward);
  expect(await p.home.boundingBox()).toEqual(home);
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
    // With a notice showing, too. (P-95: Next has none now; the slot's short one is the quiet
    // "reconnecting" note of a press made while the page does not hold the data. A long notice such as
    // Done's "Done with Hand studies of my left hand" does not fit at 195×422 on the build before P-95
    // either — reported, not covered here.)
    await setVisibility(page, 'hidden');
    await r.next.click();
    await expect(r.notice).toHaveText('Just a moment — reconnecting.');
    await fits();
    await setVisibility(page, 'visible');
    await expect(r.notice).toHaveCount(0);
    await fits();
    // The panel scrolls inside its room; the buttons have not moved off.
    await r.handle.click();
    await expect(r.panel).toBeVisible();
    await expect(r.next).toBeInViewport();
    await page.keyboard.press('Escape');
    await fits();
    await expectNoSeriousViolations(page);
  });

  test(`${label}: Plan — the band stays pinned with Home in it, HERE is in view on arriving, the filled button and the open row are in reach, nothing scrolls sideways`, async ({ page }) => {
    await startGo(page, RUNS, 'runner');
    await page.setViewportSize(size);
    await runner(page).middle.click();
    const p = plan(page);
    const pinned = async () => {
      const band = (await p.band.boundingBox())!;
      expect(band.y).toBe(0);
      expect(band.x).toBe(0);
      expect(band.width).toBe(size.width);
      await expect(p.word).toBeInViewport({ ratio: 1 });
      await expect(p.home).toBeInViewport({ ratio: 1 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    };
    await pinned();
    await expect(p.here).toHaveAccessibleName('Here, Add the shadows');
    await expect(p.here).toBeInViewport();
    await expect(p.forward).toBeInViewport({ ratio: 1 });
    // The words wrap; none is cut.
    for (const w of await p.words.all()) expect(await w.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
    await expectRules(page, p.screen, 1, 1);
    await expectNoSeriousViolations(page);
    // The list scrolls under the band; the band and the filled button do not move.
    const forward = await p.forward.boundingBox();
    await p.list.evaluate((e) => e.scrollTo(0, 99999));
    await pinned();
    expect(await p.forward.boundingBox()).toEqual(forward);
    await p.add.scrollIntoViewIfNeeded();
    await expect(p.add).toBeInViewport();
    // Typing in the open row (the keyboard is up): still pinned; the step added is in the list.
    await p.add.click();
    await pinned();
    await addStep(page, 'Sign it');
    await expect(p.notice).toContainText('Added “Sign it”');
    await pinned();
    await expect(p.forward).toBeInViewport({ ratio: 1 });
    // A step's menu and Repeat from here's sheet: every control can be reached.
    await p.more('Add the shadows').scrollIntoViewIfNeeded();
    await p.more('Add the shadows').click();
    const menu = await arrived(page, 'go-plan-menu');
    for (const name of ['Change the words', 'Remove this step']) {
      const b = menu.getByRole('button', { name, exact: true });
      await b.scrollIntoViewIfNeeded();
      await expect(b).toBeInViewport();
    }
    await expectRules(page, menu, 2, 0);
    await page.keyboard.press('Escape');
    await p.dividerMore.scrollIntoViewIfNeeded();
    await p.dividerMore.click();
    const sheet = await arrived(page, 'go-plan-repeat');
    await sheet.getByRole('button', { name: 'More times', exact: true }).scrollIntoViewIfNeeded();
    await expect(sheet.getByRole('button', { name: 'More times', exact: true })).toBeInViewport();
    await expectRules(page, sheet, 2, 0);
    await page.keyboard.press('Escape');
    // The edge at this size: Done beside Home, both whole, in the band.
    await planMenu(page, 'Sign it', 'Remove this step');
    await startGo(page, [{ id: 'r4', routine: 'spanish-es', at: null, status: 'running' }], 'plan');
    await pinned();
    await expect(p.done).toBeInViewport({ ratio: 1 });
    await expect(p.add).toBeFocused();
    await expect(p.add).toBeInViewport();
    await expectRules(page, p.screen, 1, 0);
  });

  test(`${label}: home, Paused and New's sheet reflow — every control in reach`, async ({ page }) => {
    await startGo(page, RUNS, 'runner');
    await page.setViewportSize(size);
    const r = runner(page);

    await r.pause.click();
    const p = paused(page);
    await expect(p.resume).toBeInViewport();
    await expect(p.home).toBeInViewport();
    await expectRules(page, p.screen, 1, 1);
    await p.home.click();

    const h = home(page);
    await expect(h.prompt).toBeInViewport();
    // P-95: the paused run is first, its Resume the one filled button.
    await expect(h.tiles.first().getByRole('button', { name: 'Resume Practise drawing', exact: true })).toBeInViewport();
    await expectRules(page, h.screen, 1, 1);
    await expectNoSeriousViolations(page);
    // New's own sheet: the name field and Plan in reach.
    await h.screen.getByTestId('go-new').click();
    const sheet = await arrived(page, 'go-new-sheet');
    await sheet.getByTestId('go-new-name').fill('Learn the ukulele');
    await expect(sheet.getByTestId('go-new-name')).toBeInViewport();
    await expect(sheet.getByTestId('go-new-plan')).toBeInViewport();
    await expectRules(page, sheet, 2, 1);
    await expectNoSeriousViolations(page);
  });
}
