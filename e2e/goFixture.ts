/**
 * P-86 (B-11 slice 1): seeds routines and runs for the `/go` specs. They go in the way a person's own
 * would: a format-2 backup (P-85) imported through Settings (checked strictly, previewed, Replace), so
 * the specs run on data that has been through the same migration, import check and storage as real
 * data. Ids are readable: a routine's steps are `<routine>-0`, `<routine>-1`, …
 */
import { expect, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** A step; a wait; another routine; P-96: a step that gives a name (`{ text, gives }`). */
export type StepSpec = string | { wait: string } | { routine: string; with?: unknown[] } | { text: string; gives: string };

export interface RoutineSpec {
  id: string;
  name: string;
  steps: StepSpec[];
  /** The Repeat divider stands before steps[repeatFrom]. */
  repeatFrom?: number;
  /** A number of rounds; absent with a divider: until I'm done. */
  repeat?: number;
  /** The edge is open (default); false = "ends here". */
  open?: boolean;
  /** It has a tile on home (default true). */
  home?: boolean;
  /** Days ago it was first made: the tiles' fixed order (default: in the order given). */
  madeDaysAgo?: number;
  /** P-97: its tags, as stored (no "#"). */
  tags?: string[];
  /** P-109: its places, as stored (raw: `{ id, name, where }`, or anything an import could bring). */
  places?: unknown;
}

export interface RunSpec {
  id: string;
  routine: string;
  /** The step it is on (index in the routine); null = at the edge, asking. Default 0. */
  at?: number | null;
  round?: number;
  /** Levels above the first, bottom first: the routine stepped into, the step it is on there. */
  inner?: { routine: string; at: number; round?: number }[];
  /** Only the one run the app is on has a status. */
  status?: 'running' | 'paused';
  /** P-90: left in Plan (with `status: 'paused'` for the run the app is on; with none, a run planned from its tile). */
  mode?: 'plan';
  /** This-run changes as the build before P-90 stored them (raw): Plan folds them into the routine when first opened. */
  changes?: unknown[];
  reason?: string;
  /** For a run resting on a wait: since when. */
  waitingDaysAgo?: number;
  startedDaysAgo?: number;
  /** Minutes ago it was last touched (the order of "what else can be resumed"). */
  touchedMinutesAgo?: number;
  /** P-96: values, as stored (raw `ValueEntry` records). */
  values?: unknown[];
}

const DAY = 864e5;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/**
 * How "since" reads for something `daysAgo` days old (7 or more: within the last week it is a day's
 * name): the date, "17 November" — with its year when that is another year.
 */
export function sinceDate(daysAgo: number, now = Date.now()): string {
  const then = new Date(now - daysAgo * DAY);
  return `${then.getDate()} ${MONTHS[then.getMonth()]}${then.getFullYear() === new Date(now).getFullYear() ? '' : ` ${then.getFullYear()}`}`;
}
export const stepId = (routine: string, index: number) => `${routine}-${index}`;

/** The backup file holding these routines and runs (format 2), as Export would write it. */
export function goBackup(routines: RoutineSpec[], runs: RunSpec[] = [], now = Date.now()): string {
  const iso = (ms: number) => new Date(ms).toISOString();
  const byId = new Map(routines.map((r) => [r.id, r]));
  const outRoutines: Record<string, unknown> = {};
  routines.forEach((r, i) => {
    outRoutines[r.id] = {
      id: r.id,
      words: r.name,
      named: true,
      createdAt: iso(now - (r.madeDaysAgo ?? 100 - i) * DAY),
      items: r.steps.map((s, k) =>
        typeof s === 'string' ? { id: stepId(r.id, k), text: s } : 'wait' in s ? { id: stepId(r.id, k), wait: s.wait } : 'gives' in s ? { id: stepId(r.id, k), text: s.text, out: s.gives } : { id: stepId(r.id, k), ref: s.routine, ...(s.with && { with: s.with }) },
      ),
      ...(r.repeatFrom !== undefined && { repeatFrom: r.repeatFrom }),
      ...(r.repeat !== undefined && { repeat: r.repeat }),
      open: r.open ?? true,
      home: r.home ?? true,
      ...(r.tags && { tags: r.tags }),
      ...(r.places !== undefined && { places: r.places }),
    };
  });
  const outRuns: Record<string, unknown> = {};
  for (const run of runs) {
    const first = byId.get(run.routine);
    if (!first) throw new Error(`goBackup: run ${run.id} is of a routine that isn't seeded: ${run.routine}`);
    const at = run.at === undefined ? 0 : run.at;
    const frames: { seq: string; at: string | null; round: number; from?: string }[] = [{ seq: run.routine, at: at === null ? null : stepId(run.routine, at), round: run.round ?? 1 }];
    for (const level of run.inner ?? []) frames.push({ seq: level.routine, at: stepId(level.routine, level.at), round: level.round ?? 1, from: frames[frames.length - 1].at ?? undefined });
    outRuns[run.id] = {
      id: run.id,
      routineId: run.routine,
      startedAt: iso(now - (run.startedDaysAgo ?? 1) * DAY),
      ...(run.waitingDaysAgo !== undefined && { waitingSince: iso(now - run.waitingDaysAgo * DAY) }),
      frames,
      changes: run.changes ?? [],
      ...(run.status && { status: run.status }),
      ...(run.mode && { mode: run.mode }),
      ...(run.reason && { reason: run.reason }),
      ...(run.values && { values: run.values }),
      touchedAt: iso(now - (run.touchedMinutesAgo ?? 5) * 60_000),
    };
  }
  return JSON.stringify({ app: 'wanderment', exportedAt: iso(now), data: { version: 2, threads: {}, activities: {}, routines: outRoutines, runs: outRuns } });
}

/**
 * Maya's routines, as in the mockups (B-11 journeys): what most specs start from. (A tile's colour is
 * its routine's place in the order they were made, round the palette: these four differ.)
 */
export const MAYA: RoutineSpec[] = [
  {
    id: 'apply',
    name: 'Apply to Initech',
    open: false,
    steps: ['Read the job ad twice', 'Tailor the CV', 'Write the cover letter', { routine: 'proof' }, 'Send the application'],
  },
  { id: 'proof', name: 'Proofread out loud', home: false, open: false, steps: ['Read it aloud once', 'Fix what you stumble on'] },
  { id: 'apply-acme', name: 'Apply to Acme', open: false, steps: ['Send the application', { wait: 'a reply from Acme' }, 'Note the answer in the tracker'] },
  { id: 'drawing', name: 'Practise drawing', steps: ['Warm-up lines', { routine: 'hands' }, 'Gesture drawing'] },
  {
    id: 'hands',
    name: 'Hand studies of my left hand',
    home: false,
    open: false,
    repeatFrom: 1,
    repeat: 3,
    steps: ['Find a reference photo', 'Block in the big shapes', 'Check your proportions', 'Add the shadows'],
  },
  { id: 'spanish-es', name: 'Feel at home in Spanish', steps: [] },
];

/**
 * A backup written by the build before P-90 (frozen by Part 1; never regenerated): "Apply for jobs"
 * with a run three levels deep in round 2 that carries seven this-run changes (a step added, two
 * reworded, one removed, the number set to 5, a breakdown and a breakdown inside it), a second, paused
 * run of the same routine, a run at the edge of an empty routine, and an ended run with an unkept change.
 */
export const PREVIOUS_BUILD_BACKUP = readFileSync(join(process.cwd(), 'src/storage/fixtures/golden/p90-backup.json'), 'utf8');

/** What Settings says once a backup has replaced what was here (`components/go/Settings.tsx`). */
export const IMPORTED = 'Imported.';

/** Opens Settings by its own address and waits for it. */
export async function openSettings(page: Page) {
  await page.goto('./go/settings');
  await expect(settled(page, 'settings')).toBeVisible();
}

/** On Settings: chooses a backup file, and waits for its preview (or, for a refused file, nothing). */
export async function chooseBackup(page: Page, json: string) {
  const importBtn = page.getByRole('button', { name: 'Import from a backup', exact: true });
  await expect(importBtn).toBeVisible();
  const chooser = page.waitForEvent('filechooser');
  await importBtn.click();
  await (await chooser).setFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(json) });
}

/** Imports a backup file through Settings — checked, previewed, Replace — and leaves the page there. */
export async function importBackup(page: Page, json: string) {
  await openSettings(page);
  await chooseBackup(page, json);
  await page.getByRole('button', { name: 'Replace', exact: true }).click();
  await expect(page.getByText(IMPORTED, { exact: true })).toBeVisible();
}

/** Imports the backup through Settings (the person's own way in), then leaves the page where it is. */
export async function seedGo(page: Page, routines: RoutineSpec[], runs: RunSpec[] = [], now = Date.now()) {
  // Nothing to seed: a fresh page already holds nothing (and a backup matching what is here has no Replace).
  if (!routines.length && !runs.length) return;
  await importBackup(page, goBackup(routines, runs, now));
}

export interface Stored {
  threads: Record<string, { id: string; name: string; hidden: boolean; next?: string; declaredAt?: string }>;
  activities: Record<string, { id: string; text: string; note?: string; doingId?: string; toIds: string[]; lit?: true; settledAt?: string }>;
  routines: Record<string, { id: string; words: string; named?: boolean; home?: boolean; tags?: string[]; [field: string]: unknown; items?: { id: string; text?: string; wait?: string; ref?: string }[]; repeatFrom?: number; repeat?: number; open?: boolean }>;
  runs: Record<string, { id: string; routineId: string; status?: string; mode?: string; endedAt?: string; frames?: { seq: string; at: string | null; round: number }[]; changes?: unknown[]; values?: { name: string; items: string[]; level: number; seq: string; item: string; words?: string; at: string; changedAt?: string }[] }>;
}

/**
 * What is stored, read the person's own way: Settings → "Export everything", and the file it
 * downloads. (P-89: the old screens that listed wanders and activities are gone; the export is where
 * they can be seen, so this is how the storage specs read them back.) Leaves the page on Settings.
 */
export async function exported(page: Page): Promise<Stored> {
  await openSettings(page);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export everything (.json)', exact: true }).click();
  const stream = await (await download).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const backup = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { app: string; data: Stored & { version: number } };
  expect(backup.app).toBe('wanderment');
  return backup.data;
}

/** The names of everything stored, sorted: the lines' words, the wanders' names, the routines' names. */
export async function storedNames(page: Page) {
  const data = await exported(page);
  const sorted = (list: string[]) => [...list].sort();
  return { lines: sorted(Object.values(data.activities).map((a) => a.text)), wanders: sorted(Object.values(data.threads).map((t) => t.name)), routines: sorted(Object.values(data.routines).map((r) => r.words)) };
}

/**
 * Makes a routine: + New on home, its name in New's own sheet, Plan (P-96: home has no prompt). Plan
 * opens on the new routine — its name as the heading, no steps, the open row focused. It makes a
 * routine and no run (P-90): something stored, to read back.
 */
export async function startThing(page: Page, words: string) {
  const h = home(page);
  await h.newBtn.click();
  const sheet = await arrived(page, 'go-new-sheet');
  await sheet.getByTestId('go-new-name').fill(words);
  await sheet.getByTestId('go-new-plan').click();
  const p = plan(page);
  await expect(p.title).toHaveText(words);
  await expect(page.getByRole('button', { name: 'Undo New', exact: true })).toBeVisible();
  await expect(p.add).toBeFocused();
}

/** Opens the app (`/go`) on a page with nothing running, and says what you're going to do: see `startThing`. */
export async function openAndStart(page: Page, words: string) {
  await openGo(page);
  await startThing(page, words);
}

/**
 * Says what you're going to do, gives it a first step in Plan and presses Start: the runner opens on
 * that step. It makes a routine and a run that is running.
 */
export async function startRun(page: Page, words: string, step = 'A first small step') {
  await startThing(page, words);
  await addStep(page, step);
  // (P-115, rewritten: + New opens in Edit — the step is saved before Start, which Edit's Save replaces.)
  await savePlan(page);
  await plan(page).forward.click();
  await expect(runner(page).words).toHaveText(step);
}

/** Opens the app (`/go`) on a page with nothing running, and starts a run: see `startRun`. */
export async function openAndRun(page: Page, words: string, step?: string) {
  await openGo(page);
  await startRun(page, words, step);
}

/** A `/go` screen by its test id, once it has nothing left to load or move. */
export const settled = (page: Page, screen: 'home' | 'runner' | 'plan' | 'jump' | 'settings' | 'routines'): Locator => page.locator(`[data-testid="go-${screen}"][data-settled="true"]`).filter({ visible: true });

/** Opens `/go` (it goes where you left off) and waits for the screen it lands on. */
export async function openGo(page: Page, lands: 'home' | 'runner' | 'plan' = 'home', path = './go') {
  await page.goto(path);
  await expect(settled(page, lands)).toBeVisible();
}

/**
 * Seeds, then opens `/go`. P-101 (ruling 4): Plan is a view, not a state — a run an earlier build left in
 * Plan (`mode: 'plan'`, on a step) reads paused and `/go` opens home; to land on its Plan, it is opened by
 * its Plan's address (the run the app is on, else the first). A run at the edge still opens in Plan from `/go`.
 */
export async function startGo(page: Page, runs: RunSpec[] = [], lands: 'home' | 'runner' | 'plan' = 'home', routines: RoutineSpec[] = MAYA) {
  await seedGo(page, routines, runs);
  const left = lands === 'plan' && runs.some((r) => r.mode === 'plan' && r.at !== null) ? (runs.find((r) => r.status) ?? runs[0]) : undefined;
  await openGo(page, lands, left ? `./go/run/${left.id}/plan` : './go');
}

/** The runner's parts. */
export const runner = (page: Page) => {
  const screen = settled(page, 'runner');
  return {
    screen,
    note: screen.getByTestId('go-note'),
    words: screen.getByTestId('go-note-words'),
    next: screen.getByTestId('go-next'),
    /** P-103 (2; was P-101 ruling 2: both at the top line's right): ❚❚ Pause first at its left (opens "Pausing <name>"); Plan at its right ("Plan <routine>" inside a call). */
    pause: screen.getByTestId('go-pause'),
    plan: screen.getByTestId('go-plan-door'),
    doors: screen.getByTestId('go-side-doors'),
    /** P-101 (ruling 1): the moves, beside Next — Step in (the step has steps), Step out (not on the first layer). */
    moves: screen.getByTestId('go-moves'),
    stepIn: screen.getByTestId('go-step-in'),
    stepOut: screen.getByTestId('go-step-out'),
    /** P-101 (ruling 3): the pause note, on the way back in. */
    reason: screen.getByTestId('go-runner-reason'),
    context: screen.getByTestId('go-context'),
    /** P-96: the values row (under the top line) and its values. */
    values: screen.getByTestId('go-value'),
    /** P-96: the step's value fields (the giving step's; a step that asks). P-101: each opens the entry sheet. */
    fields: screen.getByTestId('go-value-field'),
    field: (name: string) => screen.locator(`[data-testid="go-value-field"][data-name="${name}"]`),
    inPlace: screen.getByTestId('go-value-in-place'),
    handle: screen.getByTestId('go-handle'),
    panel: screen.getByTestId('go-panel'),
    notice: screen.getByTestId('go-notice'),
    /** What it says once on arriving ("Running: <step>"). */
    said: screen.getByTestId('go-said'),
  };
};

/** Plan's parts (P-90). A row is found by its step's words. */
export const plan = (page: Page) => {
  const screen = settled(page, 'plan');
  const rows = screen.getByTestId('go-plan-row');
  const more = (words: string) => screen.getByRole('button', { name: `More for ${words}`, exact: true });
  return {
    screen,
    band: screen.getByTestId('go-plan-band'),
    word: screen.getByTestId('go-plan-word'),
    home: screen.getByTestId('go-plan-home'),
    /** P-97: Plan opened from My routines — its way out, top-left in Home's place, back there. */
    toRoutines: screen.getByTestId('go-plan-to-routines'),
    /** P-97: its tags, under the heading. */
    tags: screen.getByTestId('go-plan-tags'),
    /** P-103 (3): Plan opened from the runner — its way out, top-left in Home's place, "Back to the run". */
    back: screen.getByTestId('go-plan-back'),
    done: screen.getByTestId('go-plan-done'),
    title: screen.getByRole('heading', { level: 1 }),
    line: screen.getByTestId('go-plan-line'),
    list: screen.getByTestId('go-plan-list'),
    rows,
    // (P-115, rewritten: read-only rows have no ···; a row is also found by its words, as stored — `data-words`.)
    row: (words: string) => rows.filter({ has: page.getByRole('button', { name: `More for ${words}`, exact: true }) }).or(screen.locator(`[data-testid="go-plan-row"][data-words="${words.replace(/["\\]/g, '\\$&')}"]`)),
    here: screen.locator('[data-testid="go-plan-row"][data-here="true"]'),
    words: screen.getByTestId('go-plan-words'),
    divider: screen.getByTestId('go-plan-divider'),
    dividerUp: screen.getByRole('button', { name: 'Move Repeat from here up', exact: true }),
    dividerDown: screen.getByRole('button', { name: 'Move Repeat from here down', exact: true }),
    dividerMore: screen.getByRole('button', { name: 'More for Repeat from here', exact: true }),
    add: screen.getByTestId('go-plan-add'),
    typed: screen.getByTestId('go-plan-typed'),
    forward: screen.getByTestId('go-plan-forward'),
    /** P-115: Edit (the band's right, read-only Plan); in Edit, Save (the filled button) and Cancel (the left side door). */
    edit: screen.getByTestId('go-plan-edit'),
    save: screen.getByTestId('go-plan-save'),
    cancel: screen.getByTestId('go-plan-cancel'),
    /** P-96: the side doors' row (⌂ Home · Done at the edge). */
    doors: screen.getByTestId('go-side-doors'),
    /** P-96: the bar above the keyboard, and its names. */
    namesBar: screen.getByTestId('go-names-bar'),
    names: screen.getByTestId('go-names-chip'),
    notice: screen.getByTestId('go-notice'),
    undo: screen.getByTestId('go-notice').getByRole('button', { name: /^Undo/ }),
    more,
    said: screen.getByTestId('go-said'),
  };
};

/**
 * P-115 (the owner: "Edit, then Save/Cancel"): Plan opens read-only; its edits are made in Edit. Enters Edit (Edit, the left side door —
 * not the band) unless Plan is in it already, and waits for it (Save is the filled button). The edit helpers here call it first,
 * so a spec that edits Plan needs nothing more; one that then runs or reads what was saved calls `savePlan`.
 */
export async function editPlan(page: Page) {
  const p = plan(page);
  await expect(p.edit.or(p.save)).toBeVisible();
  // (Pressed while the page takes the data back, it is refused with the quiet note: pressed again once it holds it.)
  await expect(async () => {
    if (await p.edit.isVisible()) await p.edit.click();
    await expect(p.save).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15_000 });
}

/** P-115: Save in Plan (the filled button in Edit) — the draft is the routine's; Plan is read-only again. */
export async function savePlan(page: Page) {
  const p = plan(page);
  await expect(async () => {
    if (await p.save.isVisible()) await p.save.click();
    await expect(p.edit).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15_000 });
}

/** In Plan: the steps as they read, top to bottom ("Wait for <words>" for a wait) — waited for, so it can follow an edit or a load. */
export const expectSteps = (page: Page, steps: string[]) => expect(plan(page).words).toHaveText(steps);

/**
 * P-102 (owner, 2026-11-27: "You should not undo a 'Done'"): a run's end on home — "Done with <name>", no
 * Undo, only × ("Dismiss", a full target at the notice's right edge); × puts it away and changes nothing.
 */
export async function expectFinal(page: Page, name: string) {
  const notice = home(page).notice;
  await expect(notice).toContainText(`Done with ${name}`);
  await expect(notice.getByRole('button', { name: /Undo/ })).toHaveCount(0);
  const x = notice.getByRole('button', { name: 'Dismiss', exact: true });
  await expect(x).toBeVisible();
  const n = (await notice.boundingBox())!;
  const b = (await x.boundingBox())!;
  expect(b.width).toBeGreaterThanOrEqual(48);
  expect(b.height).toBeGreaterThanOrEqual(48);
  expect(n.x + n.width - (b.x + b.width)).toBeLessThanOrEqual(8);
  // × changes nothing: home reads the same before and after (the tiles, their state and lines).
  const read = () => home(page).tiles.evaluateAll((els) => els.map((e) => `${e.getAttribute('data-state')}|${e.textContent}`));
  const before = await read();
  await x.click();
  await expect(page.getByTestId('go-notice')).toHaveCount(0);
  expect(await read()).toEqual(before);
}

/** In Plan: opens a step's menu and takes one of its actions (in words). P-102: an anchored menu of menu items (was: a sheet of buttons). */
export async function planMenu(page: Page, words: string, action: string) {
  // (P-115, rewritten: a step's ··· is Edit's — Edit first.)
  await editPlan(page);
  await plan(page).more(words).click();
  const menu = await arrived(page, 'go-plan-menu');
  await menu.getByRole('menuitem', { name: action, exact: true }).click();
}

/** P-102: a menu's items, in order, as they read (not its screen-reader-only Close — audit F2). */
export const menuItems = (menu: Locator) => menu.locator('[role="menuitem"]:not([data-sr-close])');

/** P-102: a menu or the divider's small dialog put away without choosing (Esc), and gone. */
export async function closeMenu(page: Page, testId: 'go-plan-menu' | 'go-plan-repeat' | 'go-plan-routine' | 'go-plan-reorder' | 'go-tile-menu' | 'go-routine-menu') {
  await page.keyboard.press('Escape');
  await expect(page.getByTestId(testId)).toHaveCount(0);
}

/**
 * P-102: Move up / Move down left the menu — a row moves by Alt+↑ / Alt+↓ while the focus is in it (its ···
 * here); one press, one place.
 */
export async function planMove(page: Page, words: string, dir: 'up' | 'down') {
  // (P-115, rewritten: moving is Edit's — Edit first.)
  await editPlan(page);
  const more = plan(page).more(words);
  await more.focus();
  await expect(more).toBeFocused();
  await page.keyboard.press(dir === 'up' ? 'Alt+ArrowUp' : 'Alt+ArrowDown');
}

/** In Plan: types into the field that is open in place (a step's words, a step added after a row, a smaller step) and Return. */
export async function planType(page: Page, text: string) {
  const field = plan(page).typed;
  await expect(field).toBeFocused();
  await field.fill(text);
  await field.press('Enter');
}

/** P-101 (ruling 5): a run's tile body — its way back in ("Resume <name>"). */
export const tileBody = (page: Page, name: string) => tile(page, name).getByTestId('go-tile-body');

/**
 * P-101 (ruling 3): ❚❚ on the runner, its sheet ("Pausing <name>"), the note typed (optional), Pause:
 * home opens. Without a note: Pause as it is (the stored reason, if any, stays prefilled).
 */
export async function pauseRun(page: Page, note?: string) {
  await runner(page).pause.click();
  const sheet = await arrived(page, 'go-pause-sheet');
  if (note !== undefined) await sheet.getByTestId('go-pause-note').fill(note);
  await sheet.getByTestId('go-pause-confirm').click();
  await expect(settled(page, 'home')).toBeVisible();
}

/** P-101 (ruling 7): a value typed in its entry sheet (the step's field opens it), then Keep. */
export async function typeValue(page: Page, name: string, text: string) {
  await runner(page).field(name).click();
  const sheet = await arrived(page, 'go-entry-sheet');
  await sheet.getByTestId('go-entry-field').fill(text);
  await sheet.getByTestId('go-entry-keep').click();
  await expect(page.getByTestId('go-entry-sheet')).toHaveCount(0);
}

/** A tile on home, by its routine's name. */
export const tile = (page: Page, name: string) => settled(page, 'home').getByTestId('go-tile').filter({ has: page.getByText(name, { exact: true }) });

/** Home's parts. */
export const home = (page: Page) => {
  const screen = settled(page, 'home');
  return {
    screen,
    /** P-96: a heading for a screen reader and for focus (no title in words). */
    title: screen.getByRole('heading', { level: 1 }),
    tiles: screen.getByTestId('go-tile'),
    notice: screen.getByTestId('go-notice'),
    /** P-96: + New, a side door (right). */
    newBtn: screen.getByTestId('go-new'),
    doors: screen.getByTestId('go-side-doors'),
    /** P-97: My routines, the left side door (once there is a routine). */
    routinesBtn: screen.getByTestId('go-my-routines'),
    /**
     * Every heading but the screen's own (its level-1 "Home", for a screen reader). (F-2, rewritten: was
     * getByTestId('go-home-heading') — and a `group` by 'go-home-group' — which nothing renders since P-100, so
     * `toHaveCount(0)` on it could never fail.)
     */
    headings: screen.locator('[role="heading"]:not([aria-level="1"]), h2, h3, h4, h5, h6'),
    /** P-97: routines, but nothing going. */
    idle: screen.getByTestId('go-home-idle'),
  };
};

/** P-97: My routines' parts. A row is found by its routine's name. */
export const routines = (page: Page) => {
  const screen = settled(page, 'routines');
  const rows = screen.getByTestId('go-routine-row');
  return {
    screen,
    title: screen.getByRole('heading', { level: 1 }),
    /** The one way out, top-left. */
    home: screen.getByTestId('go-routines-home'),
    find: screen.getByTestId('go-routines-find'),
    tags: screen.getByTestId('go-routines-tag'),
    tag: (t: string) => screen.getByRole('button', { name: `#${t}`, exact: true }),
    letters: screen.getByTestId('go-routines-letter'),
    rows,
    names: screen.getByTestId('go-routine-name'),
    row: (name: string) => rows.filter({ has: page.getByTestId('go-routine-name').getByText(name, { exact: true }) }),
    more: (name: string) => screen.getByRole('button', { name: `More for ${name}`, exact: true }),
    empty: screen.getByTestId('go-routines-empty'),
    none: screen.getByTestId('go-routines-none'),
    newBtn: screen.getByTestId('go-routines-new'),
    notice: screen.getByTestId('go-notice'),
  };
};

/** P-97: My routines, from home's left side door. */
export async function openRoutines(page: Page) {
  await home(page).routinesBtn.click();
  await expect(settled(page, 'routines')).toBeVisible();
  return routines(page);
}

/** P-97 (was: an idle tile's Plan): a routine's Plan, from its row on My routines (opened from home). */
export async function planFromRoutines(page: Page, name: string) {
  const r = await openRoutines(page);
  await r.row(name).getByTestId('go-routine-body').click();
  await expect(plan(page).title).toHaveText(name);
}

/** P-97 (was: an idle tile's Start): Start on a routine's row on My routines (opened from home) — its ··· → Start; the runner opens. */
export async function startFromRoutines(page: Page, name: string) {
  const r = await openRoutines(page);
  await r.more(name).click();
  await (await arrived(page, 'go-routine-menu')).getByRole('menuitem', { name: `Start ${name}`, exact: true }).click();
  await expect(settled(page, 'runner')).toBeVisible();
}

/** A sheet or confirm, once it has arrived (it slides in unless Reduce Motion is on). */
export async function arrived(page: Page, testId: 'go-plan-menu' | 'go-plan-repeat' | 'go-plan-routine' | 'go-plan-reorder' | 'go-tile-menu' | 'go-new-sheet' | 'go-gives-sheet' | 'go-value-sheet' | 'go-pause-sheet' | 'go-entry-sheet' | 'go-routine-menu' | 'go-tags-sheet' | 'go-places-sheet' | 'go-place-menu'): Promise<Locator> {
  const sheet = page.getByTestId(testId);
  await expect(sheet).toHaveAttribute('data-moving', 'false');
  return sheet;
}

/** What has the focus: its test id, else its spoken name, else its tag. */
export const focused = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    return el ? (el.getAttribute('data-testid') ?? el.getAttribute('aria-label') ?? el.tagName) : 'none';
  });

/**
 * P-29, emulated as in handoff.spec.ts: hidden, the page lets go of the data (it is "reconnecting");
 * shown, it takes it back.
 */
export async function setVisibility(page: Page, state: 'hidden' | 'visible') {
  await page.evaluate((v) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => v === 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);
  if (state === 'hidden') await expect.poll(() => page.evaluate(async () => (await navigator.locks.query()).held?.length ?? 0)).toBe(0);
}

/**
 * Hides or shows a page and waits for nothing: for specs with two pages, where the tab lock another
 * page holds or takes at once makes `setVisibility`'s wait ("nobody holds it") the wrong one. Wait on
 * what the other page then shows instead.
 */
export async function turn(page: Page, state: 'hidden' | 'visible') {
  await page.evaluate((v) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => v === 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);
}

/** Everything written so far has been committed to the database (the journal is cleared after each write). */
export const saved = (page: Page) => expect.poll(() => page.evaluate(() => localStorage.getItem('wanderment:journal'))).toBeNull();

/** In Plan: types a step into "Add a step" and Return. It is added at the end (at the edge of a goal, the run then stands on it). */
export async function addStep(page: Page, text: string) {
  // (P-115, rewritten: the Add row is Edit's — Edit first.)
  await editPlan(page);
  const p = plan(page);
  await p.add.fill(text);
  await p.add.press('Enter');
  await expect(p.row(text)).toHaveCount(1);
  await expect(p.add).toHaveValue('');
}

/** The waiting screen's words while another tab or window holds the data. */
export const anotherTab = (page: Page) => page.getByText(/^The app is open in another tab or window\./);

/** Where a control is, to the pixel: "fixed places" means these never change. */
export const place = async (l: Locator) => {
  const b = (await l.boundingBox())!;
  return { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) };
};

/** A drag with the mouse from the middle of `from`, `dy` px down (negative: up), in steps (a swipe needs moves). */
export async function drag(page: Page, from: Locator, dy: number) {
  const box = (await from.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + dy, { steps: 8 });
  await page.mouse.up();
}

/** Nothing reaches outside the window, and nothing scrolls sideways. */
export async function expectInside(page: Page, locators: Locator[]) {
  const size = page.viewportSize()!;
  for (const l of locators) {
    const b = (await l.boundingBox())!;
    expect(b.x, 'left edge').toBeGreaterThanOrEqual(0);
    expect(b.y, 'top edge').toBeGreaterThanOrEqual(0);
    expect(b.x + b.width, 'right edge').toBeLessThanOrEqual(size.width + 0.5);
    expect(b.y + b.height, 'bottom edge').toBeLessThanOrEqual(size.height + 0.5);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(size.width);
}

/**
 * P-93, P-96: from now on (this page load), a phone keyboard takes `share` of the height while a field
 * has the focus — as a phone's browser does it: the layout viewport keeps its height and
 * `visualViewport` shrinks (copied from go-plan-keyboard.spec.ts, which keeps its own).
 */
export async function phoneKeyboard(page: Page, share = 0.45) {
  await page.evaluate((share) => {
    const target = new EventTarget();
    let up = false;
    const vv = {
      get width() {
        return innerWidth;
      },
      get height() {
        return Math.round(innerHeight * (up ? 1 - share : 1));
      },
      offsetTop: 0,
      offsetLeft: 0,
      pageTop: 0,
      pageLeft: 0,
      scale: 1,
      addEventListener: target.addEventListener.bind(target),
      removeEventListener: target.removeEventListener.bind(target),
    };
    Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => vv });
    const typing = () => {
      const el = document.activeElement;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
    };
    const set = (now: boolean) => {
      if (now === up) return;
      up = now;
      target.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('resize'));
    };
    let pressing = false;
    const later = () => setTimeout(() => !pressing && set(typing()), 50);
    document.addEventListener('pointerdown', () => (pressing = true), true);
    document.addEventListener('pointerup', () => ((pressing = false), later()), true);
    document.addEventListener('focusin', () => typing() && set(true));
    document.addEventListener('focusout', later);
    set(typing());
  }, share);
}

/** P-96: no two of these overlap (each pair's boxes are apart), and each is inside the window. */
export async function expectApart(page: Page, parts: Record<string, Locator>) {
  const boxes: [string, { x: number; y: number; width: number; height: number }][] = [];
  for (const [name, l] of Object.entries(parts)) {
    if ((await l.count()) === 0) continue;
    // What can be seen of it: its box cut to every scrolling or clipping container it is in (P-101 audit F6:
    // with little room the runner's column scrolls under its pinned moves — what is scrolled away covers nothing).
    const b = await l.first().evaluate((el) => {
      const r = el.getBoundingClientRect();
      let [x0, y0, x1, y1] = [r.left, r.top, r.right, r.bottom];
      for (let p = el.parentElement; p; p = p.parentElement) {
        const o = getComputedStyle(p);
        if (o.overflowX === 'visible' && o.overflowY === 'visible') continue;
        const c = p.getBoundingClientRect();
        [x0, y0, x1, y1] = [Math.max(x0, c.left), Math.max(y0, c.top), Math.min(x1, c.right), Math.min(y1, c.bottom)];
      }
      return { x: x0, y: y0, width: Math.max(0, x1 - x0), height: Math.max(0, y1 - y0) };
    });
    if (b && b.width > 0 && b.height > 0) boxes.push([name, b]);
  }
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const [an, a] = boxes[i];
      const [bn, b] = boxes[j];
      const apart = a.x + a.width <= b.x + 0.5 || b.x + b.width <= a.x + 0.5 || a.y + a.height <= b.y + 0.5 || b.y + b.height <= a.y + 0.5;
      expect(apart, `${an} and ${bn} overlap: ${JSON.stringify(a)} ${JSON.stringify(b)}`).toBe(true);
    }
  return boxes.map(([name]) => name);
}

/** "Undo <edit>", as the routine's menu says it: the edit's words, the first letter small. */
const undoOf = (text: string) => `Undo ${text.charAt(0).toLowerCase()}${text.slice(1)}`;

/**
 * P-101 (ruling 6): a Plan edit gives no notice; its Undo is the routine's menu row, "Undo <edit>", while
 * it is the last action. Checks both — no notice shown, the menu's Undo names `text` — and closes the menu.
 */
export async function expectEdit(page: Page, text: string) {
  await expect(page.getByTestId('go-notice')).toHaveCount(0);
  await plan(page).screen.getByTestId('go-plan-more').click();
  const menu = await arrived(page, 'go-plan-routine');
  await expect(menu.getByTestId('go-plan-undo')).toContainText(undoOf(text));
  // P-102 (was: its sheet's Close): the menu is put away with Esc.
  await closeMenu(page, 'go-plan-routine');
}

/**
 * P-103 (5; audit F-4; was: no notice, as every Plan edit): removing a step says so — "Removed “<step>”" with a
 * labelled Undo — and its Undo is in the routine's menu too ("Undo <edit>"). Checks both; closes the menu (opening
 * it is a tap: the notice is put away, its Undo stays).
 */
export async function expectRemoved(page: Page, text: string) {
  const notice = plan(page).notice;
  await expect(notice).toContainText(text);
  await expect(notice.getByRole('button', { name: /^Undo/ })).toHaveText('Undo');
  await plan(page).screen.getByTestId('go-plan-more').click();
  const menu = await arrived(page, 'go-plan-routine');
  await expect(menu.getByTestId('go-plan-undo')).toContainText(undoOf(text));
  await closeMenu(page, 'go-plan-routine');
}

/** P-101 (ruling 6): the last Plan edit taken back — from the routine's menu ("Undo <edit>"). */
export async function undoEdit(page: Page) {
  await plan(page).screen.getByTestId('go-plan-more').click();
  const menu = await arrived(page, 'go-plan-routine');
  await menu.getByTestId('go-plan-undo').click();
  await expect(page.getByTestId('go-plan-routine')).toHaveCount(0);
}

/** P-101 (ruling 6): nothing to take back from Plan's menu (no edit is the last action). */
export async function expectNoEdit(page: Page) {
  await plan(page).screen.getByTestId('go-plan-more').click();
  const menu = await arrived(page, 'go-plan-routine');
  await expect(menu.getByTestId('go-plan-undo')).toHaveCount(0);
  await closeMenu(page, 'go-plan-routine');
}

/**
 * P-98: Step out (or Next) past a call that still owes a name: the press first shows a field for each (the owed
 * sheet); its move, with the fields left empty, carries on as the bare press did before P-98.
 */
export async function pastOwed(page: Page, press: Locator) {
  await press.click();
  const sheet = page.getByTestId('go-owed-sheet');
  await expect(sheet).toHaveAttribute('data-moving', 'false');
  await sheet.getByTestId('go-owed-move').click();
  await expect(sheet).toHaveCount(0);
}
