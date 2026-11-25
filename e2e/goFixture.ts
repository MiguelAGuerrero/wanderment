/**
 * P-86 (B-11 slice 1): seeds routines and runs for the `/go` specs. They go in the way a person's own
 * would: a format-2 backup (P-85) imported through Settings (checked strictly, previewed, Replace), so
 * the specs run on data that has been through the same migration, import check and storage as real
 * data. Ids are readable: a routine's steps are `<routine>-0`, `<routine>-1`, …
 */
import { expect, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type StepSpec = string | { wait: string } | { routine: string };

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
      items: r.steps.map((s, k) => (typeof s === 'string' ? { id: stepId(r.id, k), text: s } : 'wait' in s ? { id: stepId(r.id, k), wait: s.wait } : { id: stepId(r.id, k), ref: s.routine })),
      ...(r.repeatFrom !== undefined && { repeatFrom: r.repeatFrom }),
      ...(r.repeat !== undefined && { repeat: r.repeat }),
      open: r.open ?? true,
      home: r.home ?? true,
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
  routines: Record<string, { id: string; words: string; named?: boolean; items?: { id: string; text?: string; wait?: string; ref?: string }[]; repeatFrom?: number; repeat?: number; open?: boolean }>;
  runs: Record<string, { id: string; routineId: string; status?: string; mode?: string; endedAt?: string; frames?: { seq: string; at: string | null; round: number }[]; changes?: unknown[] }>;
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
 * Says what you're going to do: the words in the prompt, Return ("New: <words>"). Plan opens on the new
 * routine — its name as the heading, no steps, the open row focused. It makes a routine and no run
 * (P-90): something stored, to read back.
 */
export async function startThing(page: Page, words: string) {
  const h = home(page);
  await h.prompt.fill(words);
  await expect(h.screen.getByTestId('go-row-new')).toHaveText(`New: ${words}`);
  await h.prompt.press('Enter');
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
  await plan(page).forward.click();
  await expect(runner(page).words).toHaveText(step);
}

/** Opens the app (`/go`) on a page with nothing running, and starts a run: see `startRun`. */
export async function openAndRun(page: Page, words: string, step?: string) {
  await openGo(page);
  await startRun(page, words, step);
}

/** A `/go` screen by its test id, once it has nothing left to load or move. */
export const settled = (page: Page, screen: 'home' | 'runner' | 'paused' | 'plan' | 'jump' | 'settings'): Locator => page.locator(`[data-testid="go-${screen}"][data-settled="true"]`).filter({ visible: true });

/** Opens `/go` (it goes where you left off) and waits for the screen it lands on. */
export async function openGo(page: Page, lands: 'home' | 'runner' | 'paused' | 'plan' = 'home', path = './go') {
  await page.goto(path);
  await expect(settled(page, lands)).toBeVisible();
}

/** Seeds, then opens `/go`. */
export async function startGo(page: Page, runs: RunSpec[] = [], lands: 'home' | 'runner' | 'paused' | 'plan' = 'home', routines: RoutineSpec[] = MAYA) {
  await seedGo(page, routines, runs);
  await openGo(page, lands);
}

/** The runner's parts. */
export const runner = (page: Page) => {
  const screen = settled(page, 'runner');
  return {
    screen,
    note: screen.getByTestId('go-note'),
    words: screen.getByTestId('go-note-words'),
    next: screen.getByTestId('go-next'),
    middle: screen.getByTestId('go-middle'),
    pause: screen.getByRole('button', { name: 'Pause', exact: true }),
    done: screen.getByTestId('go-done'),
    context: screen.getByTestId('go-context'),
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
    done: screen.getByTestId('go-plan-done'),
    title: screen.getByRole('heading', { level: 1 }),
    line: screen.getByTestId('go-plan-line'),
    list: screen.getByTestId('go-plan-list'),
    rows,
    row: (words: string) => rows.filter({ has: page.getByRole('button', { name: `More for ${words}`, exact: true }) }),
    here: screen.locator('[data-testid="go-plan-row"][data-here="true"]'),
    words: screen.getByTestId('go-plan-words'),
    divider: screen.getByTestId('go-plan-divider'),
    dividerUp: screen.getByRole('button', { name: 'Move Repeat from here up', exact: true }),
    dividerDown: screen.getByRole('button', { name: 'Move Repeat from here down', exact: true }),
    dividerMore: screen.getByRole('button', { name: 'More for Repeat from here', exact: true }),
    add: screen.getByTestId('go-plan-add'),
    typed: screen.getByTestId('go-plan-typed'),
    forward: screen.getByTestId('go-plan-forward'),
    notice: screen.getByTestId('go-notice'),
    undo: screen.getByTestId('go-notice').getByRole('button', { name: /^Undo/ }),
    more,
    said: screen.getByTestId('go-said'),
  };
};

/** In Plan: the steps as they read, top to bottom ("Wait for <words>" for a wait) — waited for, so it can follow an edit or a load. */
export const expectSteps = (page: Page, steps: string[]) => expect(plan(page).words).toHaveText(steps);

/** In Plan: opens a step's menu and takes one of its actions (in words). */
export async function planMenu(page: Page, words: string, action: string) {
  await plan(page).more(words).click();
  const sheet = await arrived(page, 'go-plan-menu');
  await sheet.getByRole('button', { name: action, exact: true }).click();
}

/** In Plan: types into the field that is open in place (a step's words, a step added after a row, a smaller step) and Return. */
export async function planType(page: Page, text: string) {
  const field = plan(page).typed;
  await expect(field).toBeFocused();
  await field.fill(text);
  await field.press('Enter');
}

/** A tile on home, by its routine's name. */
export const tile = (page: Page, name: string) => settled(page, 'home').getByTestId('go-tile').filter({ has: page.getByText(name, { exact: true }) });

/** Home's parts. */
export const home = (page: Page) => {
  const screen = settled(page, 'home');
  return {
    screen,
    title: screen.getByRole('heading', { level: 1 }),
    tiles: screen.getByTestId('go-tile'),
    prompt: screen.getByTestId('go-prompt'),
    rows: screen.getByTestId('go-rows').getByRole('button'),
    notice: screen.getByTestId('go-notice'),
  };
};

/** The paused (or waiting) screen's parts. */
export const paused = (page: Page) => {
  const screen = settled(page, 'paused');
  return {
    screen,
    title: screen.getByRole('heading', { level: 1 }),
    run: screen.getByTestId('go-paused-run'),
    line: screen.getByTestId('go-paused-line'),
    reason: screen.getByTestId('go-reason'),
    resume: screen.getByTestId('go-resume'),
    home: screen.getByTestId('go-home-btn'),
    others: screen.getByTestId('go-other'),
  };
};

/** A sheet or confirm, once it has arrived (it slides in unless Reduce Motion is on). */
export async function arrived(page: Page, testId: 'go-stop' | 'go-plan-menu' | 'go-plan-repeat' | 'go-plan-routine'): Promise<Locator> {
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
