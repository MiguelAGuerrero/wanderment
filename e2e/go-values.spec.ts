/**
 * P-96 (B-15 journeys 1–4; contract rulings 2–6): values. In Plan a step GIVES a name (Gives…); later
 * steps use it as `{name}` (the bar above the keyboard offers names given above). On the runner the
 * giving step has a labelled field; later steps show the value in place; the values row under the top
 * line opens the value sheet (where from, when, what reads it; filled Keep, Close leaves it). A step
 * reading a name nothing gave ASKS for it. A name a routine gives is its own (no collision). A new round
 * clears the values given after the divider. Values survive a reload and reach another tab.
 *
 * P-101 (rulings 6–7): a value is no longer typed in place — the step's field (it reads its label and its
 * value) opens a sheet of its own, over the keyboard (`typeValue`); a Plan edit gives no notice (its Undo
 * is the routine's menu); a notice goes at the next tap. Each rewrite says what it was.
 */
import { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { arrived, exported, home, openGo, pauseRun, plan, planMenu, RoutineSpec, runner, saved, seedGo, setVisibility, startGo, tile, tileBody, turn, typeValue, anotherTab, planFromRoutines } from './goFixture';

const DRAWING: RoutineSpec = {
  id: 'draw',
  name: 'Drawing practice',
  steps: [{ text: 'Select the subject matter', gives: 'subject' }, 'Find three reference photos of {subject}', 'Rank your drawings'],
};
/** Paint a wall: the inner routine reads {base} from outside, but gives its own {colour} (no collision). */
const PAINT: RoutineSpec[] = [
  { id: 'paint', name: 'Paint a wall', steps: [{ text: 'Choose a base', gives: 'base' }, { text: 'Choose a colour', gives: 'colour' }, { routine: 'mix' }, 'Paint the wall {colour}'] },
  { id: 'mix', name: 'Mix the paint', home: false, steps: ['Stir the {base}', { text: 'Choose the trim colour', gives: 'colour' }, 'Mix {colour}'] },
];
const LETTER: RoutineSpec = { id: 'letter', name: 'Write a letter', steps: ['Write to {person}', 'Post it to {person}'] };
/** Rounds: {device} is given above the divider (it stays), {feature} below it (asked again each round). */
const TESTING: RoutineSpec = {
  id: 'test',
  name: 'Test out the app',
  repeatFrom: 1,
  steps: [{ text: 'Pick a device', gives: 'device' }, { text: 'Pick a feature', gives: 'feature' }, 'Test {feature} on {device}'],
};

const run1 = (routine: string, at = 0) => [{ id: 'v1', routine, at, status: 'running' as const }];

/** Gives a value — P-101 (ruling 7; was: typed into the step's field in place): in its sheet, Keep — then Next. */
async function give(page: Page, name: string, value: string) {
  const r = runner(page);
  await typeValue(page, name, value);
  await r.next.click();
}

/** P-101: the Plan edit just made is undone from the routine's menu (Plan's edits give no notice). */
async function undoInPlan(page: Page) {
  await plan(page).screen.getByTestId('go-plan-more').click();
  const menu = await arrived(page, 'go-plan-routine');
  await menu.getByTestId('go-plan-undo').click();
}

test.describe('giving and reading (journey 3)', () => {
  test('the giving step has a field labelled with its name; the next step shows the value in place, and the values row says what is in play', async ({ page }) => {
    await startGo(page, run1('draw'), 'runner', [DRAWING]);
    const r = runner(page);
    await expect(r.words).toHaveText('Select the subject matter');
    // A labelled field (its name, visible) — not a placeholder alone.
    await expect(r.fields).toHaveCount(1);
    await expect(r.field('subject')).toHaveAccessibleName('subject');
    await expect(r.screen.getByText('subject', { exact: true })).toBeVisible();
    await expect(r.values).toHaveCount(0);
    // P-101 (ruling 7; was: typed in place): its sheet; a first value leaves no notice (ruling 4).
    await typeValue(page, 'subject', 'figures in motion');
    await expect(r.field('subject')).toHaveAccessibleName('subject: figures in motion');
    await expect(r.notice).toHaveCount(0);
    await r.next.click();
    await expect(r.words).toHaveText('Find three reference photos of figures in motion');
    await expect(r.note).toHaveAccessibleName('Find three reference photos of figures in motion');
    // In place, inverted: display only (the note keeps its own tap).
    await expect(r.inPlace).toHaveText('figures in motion');
    const colours = await r.inPlace.evaluate((e) => [getComputedStyle(e).backgroundColor, getComputedStyle(e).color]);
    const note = await r.note.evaluate((e) => getComputedStyle(e).backgroundColor);
    expect(colours[1]).toBe(note);
    await expect(r.fields).toHaveCount(0);
    await expect(r.values).toHaveCount(1);
    await expect(r.values.first()).toHaveAccessibleName('subject: figures in motion');
    await expect(r.values.first()).toHaveText(/subject: figures in motion/);
    // The values row is a full target.
    expect((await r.values.first().boundingBox())!.height).toBeGreaterThanOrEqual(48);
    // Tapping the note still opens the panel (the value in it is not a control).
    await r.inPlace.click();
    await expect(r.panel).toBeVisible();
  });

  test('Next moves on with the field empty: a later reader asks for it there', async ({ page }) => {
    await startGo(page, run1('draw'), 'runner', [DRAWING]);
    const r = runner(page);
    await r.next.click();
    await expect(r.words).toHaveText('Find three reference photos of {subject}');
    await expect(r.field('subject')).toHaveAccessibleName('asks subject');
    await expect(r.screen.getByText('asks', { exact: true })).toBeVisible();
  });

  test('a long value: the values row wraps (it never cuts down to the bare name) and stays a full target', async ({ page }) => {
    await startGo(page, run1('draw'), 'runner', [DRAWING]);
    const long = 'figures in motion at the bus station on a rainy Tuesday morning, mostly people waiting';
    await give(page, 'subject', long);
    const r = runner(page);
    await expect(r.values.first()).toHaveAccessibleName(`subject: ${long}`);
    await expect(r.values.first()).toContainText(long);
    const box = (await r.values.first().boundingBox())!;
    expect(box.height).toBeGreaterThan(48);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  });
});

test('asking (ruling 2): a step reading a name nothing gave asks for it there — the typed value is in place and read by the next step', async ({ page }) => {
  await startGo(page, run1('letter'), 'runner', [LETTER]);
  const r = runner(page);
  await expect(r.words).toHaveText('Write to {person}');
  await expect(r.screen.getByTestId('go-value-blank')).toHaveText('{person}');
  await expect(r.field('person')).toHaveAccessibleName('asks person');
  await typeValue(page, 'person', 'Ana');
  await expect(r.words).toHaveText('Write to Ana');
  // It keeps its field while the value is the one typed here (P-101: the field reads it).
  await expect(r.field('person')).toHaveAccessibleName('asks person: Ana');
  await r.next.click();
  await expect(r.words).toHaveText('Post it to Ana');
  await expect(r.fields).toHaveCount(0);
  // Provenance: the step that asked for it.
  await r.values.first().click();
  const sheet = await arrived(page, 'go-value-sheet');
  await expect(sheet.getByTestId('go-value-from')).toHaveText(/^from Write to Ana · today \d{1,2}:\d\d$/);
});

test('scope (ruling 2): a routine inside reads a name given above it, but a name it gives is its own — never filled from outside, never overwriting the outer value', async ({ page }) => {
  await startGo(page, run1('paint'), 'runner', PAINT);
  const r = runner(page);
  await give(page, 'base', 'white');
  await give(page, 'colour', 'blue');
  await expect(r.stepIn).toHaveText('Step in');
  await r.stepIn.click();
  await expect(r.words).toHaveText('Stir the white');
  await expect(r.context).toContainText('Mix the paint');
  await r.next.click();
  // Its own {colour}: an empty field, not blue.
  await expect(r.words).toHaveText('Choose the trim colour');
  await expect(r.field('colour')).toHaveAccessibleName('colour');
  await give(page, 'colour', 'gold');
  await expect(r.words).toHaveText('Mix gold');
  await r.next.click();
  // Back out: the outer {colour} is still blue.
  await expect(r.words).toHaveText('Paint the wall blue');
  await saved(page);
  const values = Object.values((await exported(page)).runs)[0].values!;
  expect(values.map((v) => [v.name, v.items])).toEqual([
    ['base', ['white']],
    ['colour', ['blue']],
  ]);
});

test.describe('provenance and changing (journey 4)', () => {
  async function onReader(page: Page) {
    await startGo(page, run1('draw'), 'runner', [DRAWING]);
    await give(page, 'subject', 'figures in motion');
    await expect(runner(page).words).toHaveText('Find three reference photos of figures in motion');
  }

  test('the sheet: the value, where it came from and when, what reads it; Keep is filled; Close is lowest', async ({ page }) => {
    await onReader(page);
    const r = runner(page);
    await r.values.first().click();
    const sheet = await arrived(page, 'go-value-sheet');
    await expect(sheet.getByRole('heading', { level: 2 })).toHaveText('subject');
    await expect(sheet.getByTestId('go-value-sheet-field')).toHaveValue('figures in motion');
    await expect(sheet.getByTestId('go-value-sheet-field')).toBeFocused();
    await expect(sheet.getByTestId('go-value-from')).toHaveText(/^from Select the subject matter · today \d{1,2}:\d\d$/);
    await expect(sheet.getByTestId('go-value-read-by')).toContainText('read by');
    await expect(sheet.getByTestId('go-value-read-by')).toContainText('Find three reference photos of figures in motion');
    const keep = sheet.getByTestId('go-value-keep');
    const close = sheet.getByTestId('go-value-close');
    await expect(keep).toHaveAccessibleName('Keep subject');
    expect(await keep.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgb(244, 241, 232)');
    expect((await close.boundingBox())!.y).toBeGreaterThan((await keep.boundingBox())!.y);
  });

  test('Close leaves it as it was (no notice); Keep changes it in place, with Undo', async ({ page }) => {
    await onReader(page);
    const r = runner(page);
    await r.values.first().click();
    let sheet = await arrived(page, 'go-value-sheet');
    await sheet.getByTestId('go-value-sheet-field').fill('hands');
    await sheet.getByTestId('go-value-close').click();
    await expect(page.getByTestId('go-value-sheet')).toHaveCount(0);
    await expect(r.words).toHaveText('Find three reference photos of figures in motion');
    await expect(r.notice).toHaveCount(0);

    await r.values.first().click();
    sheet = await arrived(page, 'go-value-sheet');
    await expect(sheet.getByTestId('go-value-sheet-field')).toHaveValue('figures in motion');
    await sheet.getByTestId('go-value-sheet-field').fill('hands');
    await sheet.getByTestId('go-value-keep').click();
    await expect(r.words).toHaveText('Find three reference photos of hands');
    await expect(r.values.first()).toHaveAccessibleName('subject: hands');
    await expect(r.notice).toContainText('Changed {subject}');
    await r.notice.getByRole('button', { name: /^Undo/ }).click();
    await expect(r.words).toHaveText('Find three reference photos of figures in motion');

    // Cleared from the sheet: Undo too; the reader then asks.
    await r.values.first().click();
    sheet = await arrived(page, 'go-value-sheet');
    await sheet.getByTestId('go-value-sheet-field').fill('');
    await sheet.getByTestId('go-value-keep').click();
    await expect(r.notice).toContainText('Cleared {subject}');
    await expect(r.field('subject')).toHaveAccessibleName('asks subject');
  });

  test('Esc and the scrim leave it as it was', async ({ page }) => {
    await onReader(page);
    const r = runner(page);
    await r.values.first().click();
    const sheet = await arrived(page, 'go-value-sheet');
    await sheet.getByTestId('go-value-sheet-field').fill('feet');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('go-value-sheet')).toHaveCount(0);
    await expect(r.words).toHaveText('Find three reference photos of figures in motion');
  });
});

test('rounds (ruling 3): a new round asks again for what was given after "Repeat from here"; what was given before it stays', async ({ page }) => {
  await startGo(page, run1('test'), 'runner', [TESTING]);
  const r = runner(page);
  await give(page, 'device', 'phone');
  await give(page, 'feature', 'search');
  await expect(r.words).toHaveText('Test search on phone');
  await r.next.click();
  // Round 2: Pick a feature again, its field empty; {device} still in play.
  await expect(r.words).toHaveText('Pick a feature');
  await expect(r.field('feature')).toHaveAccessibleName('feature');
  await expect(r.values).toHaveCount(1);
  await expect(r.values.first()).toHaveAccessibleName('device: phone');
  await r.next.click();
  await expect(r.words).toHaveText('Test {feature} on phone');
  await expect(r.field('feature')).toHaveAccessibleName('asks feature');
});

test('reload: the values and where they are survive; home shows the paused run with its values in its line', async ({ page }) => {
  await startGo(page, run1('draw'), 'runner', [DRAWING]);
  await give(page, 'subject', 'figures in motion');
  await saved(page);
  await page.reload();
  const r = runner(page);
  await expect(r.words).toHaveText('Find three reference photos of figures in motion');
  await expect(r.values.first()).toHaveAccessibleName('subject: figures in motion');
  await pauseRun(page);
  const h = home(page);
  await expect(h.screen).toBeVisible();
  const t = tile(page, 'Drawing practice');
  await expect(t.getByTestId('go-tile-line')).toHaveText('at Find three reference photos of figures in motion');
  // Marked as a value (inverted), not a count.
  await expect(t.getByTestId('go-value-in-place')).toHaveText('figures in motion');
  await saved(page);
  await page.reload();
  await expect(tile(page, 'Drawing practice').getByTestId('go-value-in-place')).toHaveText('figures in motion');
  await expect(tileBody(page, 'Drawing practice')).toHaveAccessibleName(/^Resume Drawing practice/);
});

test('two tabs: a value given in one is in the other once it takes the data back', async ({ page, context }) => {
  await startGo(page, run1('draw'), 'runner', [DRAWING]);
  const b = await context.newPage();
  await b.goto('./go');
  await expect(anotherTab(b)).toBeVisible({ timeout: 20_000 });
  await give(page, 'subject', 'figures in motion');
  await saved(page);
  await turn(page, 'hidden');
  await expect(runner(b).words).toHaveText('Find three reference photos of figures in motion', { timeout: 15_000 });
  // Changed in B…
  await runner(b).values.first().click();
  const sheet = await arrived(b, 'go-value-sheet');
  await sheet.getByTestId('go-value-sheet-field').fill('hands');
  await sheet.getByTestId('go-value-keep').click();
  await expect(runner(b).words).toHaveText('Find three reference photos of hands');
  await saved(b);
  // …and A has it when it takes the data back.
  await setVisibility(b, 'hidden');
  await turn(page, 'visible');
  await expect(runner(page).words).toHaveText('Find three reference photos of hands', { timeout: 15_000 });
});

test.describe('Plan (journeys 1–2, ruling 5)', () => {
  const PLAIN: RoutineSpec = { id: 'draw', name: 'Drawing practice', steps: ['Select the subject matter', 'Find three reference photos', 'Rank your drawings'] };

  test('Gives…: a sheet with the name suggested from the words; Gives <name> — the row says "gives {subject}", with Undo (P-101, ruling 6: no notice — the routine’s menu)', async ({ page }) => {
    await startGo(page, [], 'home', [PLAIN]);
    // P-97 (was: its idle tile's Plan): a routine with nothing going is on My routines — its row opens its Plan.
    await planFromRoutines(page, 'Drawing practice');
    const p = plan(page);
    await planMenu(page, 'Select the subject matter', 'Gives…');
    const sheet = await arrived(page, 'go-gives-sheet');
    await expect(sheet.getByRole('heading', { level: 2 })).toHaveText('Select the subject matter');
    await expect(sheet.getByTestId('go-gives-name')).toHaveValue('subject');
    await expect(sheet.getByTestId('go-gives-name')).toHaveAccessibleName('Gives');
    await expect(sheet.getByTestId('go-gives-apply')).toHaveText('Gives subject');
    await sheet.getByTestId('go-gives-apply').click();
    await expect(p.row('Select the subject matter').getByTestId('go-plan-gives')).toHaveText('gives {subject}');
    await expect(p.notice).toHaveCount(0);
    await undoInPlan(page);
    await expect(p.screen.getByTestId('go-plan-gives')).toHaveCount(0);
  });

  test('the bar above the keyboard offers names given above (never below); a tap puts {name} at the caret; the row then shows it as a chip; braces typed by hand work too', async ({ page }) => {
    const GIVING: RoutineSpec = { ...PLAIN, steps: [{ text: 'Select the subject matter', gives: 'subject' }, 'Find three reference photos', { text: 'Rank your drawings', gives: 'best' }] };
    await startGo(page, [], 'home', [GIVING]);
    // P-97 (was: its idle tile's Plan): a routine with nothing going is on My routines — its row opens its Plan.
    await planFromRoutines(page, 'Drawing practice');
    const p = plan(page);
    await expect(p.namesBar).toHaveCount(0);
    await planMenu(page, 'Find three reference photos', 'Edit');
    await expect(p.typed).toBeFocused();
    // Only {subject}: {best} is given below.
    await expect(p.names).toHaveText(['{subject}']);
    await p.typed.press('End');
    await p.typed.pressSequentially(' of ');
    await p.names.first().click();
    // The field kept the focus; the name went in at the caret.
    await expect(p.typed).toBeFocused();
    // P-103 (11; was: no space after it): an inserted name gets a space after it (the step's words are tidied when kept).
    await expect(p.typed).toHaveValue('Find three reference photos of {subject} ');
    await p.typed.press('Enter');
    await expect(p.row('Find three reference photos of {subject}').getByTestId('go-name-chip')).toHaveText('{subject}');
    // On "Add a step" at the end: every name the routine gives.
    await p.add.focus();
    await expect(p.names).toHaveText(['{subject}', '{best}']);
    await p.add.fill('Redraw {best}');
    await p.add.press('Enter');
    await expect(p.row('Redraw {best}').getByTestId('go-name-chip')).toHaveText('{best}');
  });

  test('renaming a name renames it in the steps that read it (and in an open run), in one change with one Undo', async ({ page }) => {
    const GIVING: RoutineSpec = { ...PLAIN, steps: [{ text: 'Select the subject matter', gives: 'subject' }, 'Find three reference photos of {subject}', 'Rank your drawings'] };
    // (P-101, ruling 4: a run an earlier build left in Plan reads paused — home on reopening; its Plan by its address.)
    await seedGo(page, [GIVING], [{ id: 'v1', routine: 'draw', at: 1, status: 'paused', mode: 'plan', values: [{ name: 'subject', items: ['hands'], level: 0, seq: 'draw', item: 'draw-0', words: 'Select the subject matter', at: new Date().toISOString() }] }]);
    await openGo(page, 'plan', './go/run/v1/plan');
    const p = plan(page);
    await planMenu(page, 'Select the subject matter', 'Gives…');
    const sheet = await arrived(page, 'go-gives-sheet');
    await expect(sheet.getByTestId('go-gives-name')).toHaveValue('subject');
    await sheet.getByTestId('go-gives-name').fill('topic');
    await sheet.getByTestId('go-gives-apply').click();
    await expect(p.row('Select the subject matter').getByTestId('go-plan-gives')).toHaveText('gives {topic}');
    await expect(p.row('Find three reference photos of {topic}')).toHaveCount(1);
    // P-101 (ruling 6; was: the notice "Renamed …"): no notice; its Undo is the routine's menu.
    await expect(p.notice).toHaveCount(0);
    await p.screen.getByTestId('go-plan-more').click();
    await expect((await arrived(page, 'go-plan-routine')).getByTestId('go-plan-undo')).toHaveText('Undo renamed {subject} to {topic}');
    await page.keyboard.press('Escape');
    await p.forward.click();
    const r = runner(page);
    await expect(r.words).toHaveText('Find three reference photos of hands');
    await expect(r.values.first()).toHaveAccessibleName('topic: hands');
  });

  test('removing the giving step leaves the readers’ words as they are — they ask when run; a giving step cannot be broken down', async ({ page }) => {
    const GIVING: RoutineSpec = { ...PLAIN, steps: [{ text: 'Select the subject matter', gives: 'subject' }, 'Find three reference photos of {subject}', 'Rank your drawings'] };
    await startGo(page, [], 'home', [GIVING]);
    // P-97 (was: its idle tile's Plan): a routine with nothing going is on My routines — its row opens its Plan.
    await planFromRoutines(page, 'Drawing practice');
    const p = plan(page);
    await p.more('Select the subject matter').click();
    const menu = await arrived(page, 'go-plan-menu');
    // (P-102: menu items — was a sheet's buttons.)
    await expect(menu.getByRole('menuitem', { name: 'Edit', exact: true })).toHaveCount(1);
    await expect(menu.getByRole('menuitem', { name: 'Break it down', exact: true })).toHaveCount(0);
    await menu.getByRole('menuitem', { name: 'Remove', exact: true }).click();
    // P-101 amendment (ruling 11): it has a reader — asked first, naming it; the reader's words stay.
    await expect(page.getByTestId('go-plan-removing')).toContainText('which 1 step reads');
    await page.getByTestId('go-plan-remove').click();
    await expect(p.row('Find three reference photos of {subject}')).toHaveCount(1);
    await expect(p.row('Find three reference photos of {subject}').getByTestId('go-name-chip')).toHaveText('asks {subject}');
    await p.forward.click();
    const r = runner(page);
    await expect(r.words).toHaveText('Find three reference photos of {subject}');
    await expect(r.field('subject')).toHaveAccessibleName('asks subject');
  });

  test('"Gives nothing" takes the name off (with Undo); the routine’s menu has no "Ends here"', async ({ page }) => {
    const GIVING: RoutineSpec = { ...PLAIN, steps: [{ text: 'Select the subject matter', gives: 'subject' }, 'Find three reference photos of {subject}'] };
    await startGo(page, [], 'home', [GIVING]);
    // P-97 (was: its idle tile's Plan): a routine with nothing going is on My routines — its row opens its Plan.
    await planFromRoutines(page, 'Drawing practice');
    const p = plan(page);
    await planMenu(page, 'Select the subject matter', 'Gives…');
    const sheet = await arrived(page, 'go-gives-sheet');
    await sheet.getByRole('button', { name: 'Gives nothing', exact: true }).click();
    await expect(p.screen.getByTestId('go-plan-gives')).toHaveCount(0);
    // P-101 (ruling 6; was: the notice "… gives nothing"): its Undo is the routine's menu.
    await expect(p.notice).toHaveCount(0);
    await p.screen.getByTestId('go-plan-more').click();
    const routine = await arrived(page, 'go-plan-routine');
    await expect(routine.getByTestId('go-plan-undo')).toHaveText('Undo “Select the subject matter” gives nothing');
    await expect(routine.getByRole('menuitem', { name: /Ends here/ })).toHaveCount(0);
  });
});

test.describe('fixes after the audit', () => {
  test('F3 (ruling 4): a filled value typed over in the step’s own field — "Changed {x}" with Undo, once — P-101 (rulings 6–7; was: typed in place, and "the Next that follows keeps the Undo"): kept from its sheet; the notice goes at the next tap', async ({ page }) => {
    await startGo(page, run1('draw'), 'runner', [DRAWING]);
    const r = runner(page);
    await give(page, 'subject', 'figures in motion');
    await r.handle.click();
    await r.panel.getByRole('button', { name: /^Back to/ }).click();
    await expect(r.field('subject')).toHaveAccessibleName('subject: figures in motion');
    await r.field('subject').click();
    const sheet = await arrived(page, 'go-entry-sheet');
    await expect(sheet.getByTestId('go-entry-field')).toHaveValue('figures in motion');
    await sheet.getByTestId('go-entry-field').fill('hands');
    // Per keystroke nothing is said.
    await expect(r.notice).toHaveCount(0);
    await sheet.getByTestId('go-entry-keep').click();
    await expect(r.notice).toContainText('Changed {subject}');
    await r.notice.getByRole('button', { name: /^Undo/ }).click();
    await expect(r.field('subject')).toHaveAccessibleName('subject: figures in motion');
    await r.next.click();
    await expect(r.words).toHaveText('Find three reference photos of figures in motion');
  });

  test('F2: Back to across a round boundary that clears a value says "Cleared {x}", with Undo that brings it back', async ({ page }) => {
    await startGo(page, run1('test'), 'runner', [TESTING]);
    const r = runner(page);
    await give(page, 'device', 'phone');
    await give(page, 'feature', 'search');
    await r.next.click();
    await expect(r.words).toHaveText('Pick a feature');
    await typeValue(page, 'feature', 'login');
    await r.handle.click();
    await r.panel.getByRole('button', { name: /^Back to/ }).click();
    await expect(r.notice).toContainText('Cleared {feature}');
    await r.notice.getByRole('button', { name: /^Undo/ }).click();
    await expect(r.words).toHaveText('Pick a feature');
    await expect(r.field('feature')).toHaveAccessibleName('feature: login');
  });

  test('F5: a last step that is a wait reads Done — it ends the run', async ({ page }) => {
    await startGo(page, [{ id: 'w1', routine: 'wl', at: 1, status: 'running' }], 'runner', [{ id: 'wl', name: 'Wait last', steps: ['Send it', { wait: 'a reply' }] }]);
    const r = runner(page);
    await expect(r.note).toHaveAccessibleName('Wait for: a reply');
    await expect(r.next).toHaveText('Done');
    await expect(r.next).toHaveAccessibleName('Done with Wait last');
    await r.next.click();
    await expect(home(page).notice).toContainText('Done with Wait last');
  });

  test('F6: the names bar from the keyboard — Alt+↓ reaches the names (spoken "Insert {name}"), Return inserts at the caret and the field has the focus again; Esc goes back without inserting', async ({ page }) => {
    const GIVING: RoutineSpec = { id: 'draw', name: 'Drawing practice', steps: [{ text: 'Select the subject matter', gives: 'subject' }, 'Find three reference photos'] };
    await startGo(page, [], 'home', [GIVING]);
    // P-97 (was: its idle tile's Plan): a routine with nothing going is on My routines — its row opens its Plan.
    await planFromRoutines(page, 'Drawing practice');
    const p = plan(page);
    await planMenu(page, 'Find three reference photos', 'Edit');
    await expect(p.typed).toBeFocused();
    await p.typed.press('End');
    await p.typed.pressSequentially(' of ');
    await p.typed.press('Alt+ArrowDown');
    await expect(p.names.first()).toBeFocused();
    await expect(p.names.first()).toHaveAccessibleName('Insert {subject}');
    // Esc: back to the field, nothing inserted, still typing.
    await page.keyboard.press('Escape');
    await expect(p.typed).toBeFocused();
    await expect(p.typed).toHaveValue('Find three reference photos of ');
    await p.typed.press('Alt+ArrowDown');
    await page.keyboard.press('Enter');
    await expect(p.typed).toBeFocused();
    // P-103 (11; was: no space after it): an inserted name gets a space after it.
    await expect(p.typed).toHaveValue('Find three reference photos of {subject} ');
    await p.typed.press('Enter');
    await expect(p.row('Find three reference photos of {subject}')).toHaveCount(1);
  });
});
