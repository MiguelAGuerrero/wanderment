# The app (no name yet)

**Not what you have to do. How you do it.** A personal runbook: you keep your own ways of doing
things — routines, in your words — and run them one small step at a time.

Pick a routine on **My routines** — every one, A–Z, with Find and tags you type on a routine and tap to
filter — or make one with + New, and run it: one step on screen. The bottom row is the moves,
as in a debugger — Step in (the step has steps), Step out (leave this level), and Next (Done on the step
that finishes the run); the top line is where you are, with ❚❚ Pause and Plan beside it. A step can
**give** a value — "Select the subject matter" gives `{subject}` — that later steps use in their words;
it is typed in a sheet of its own, the runner shows it in place, a row under the top line shows what is
in play (and what a passed step gives that is not given yet), and the value's sheet traces where it came
from. Planning has its own view, Plan, which looks nothing like running: the whole sequence, where steps
are added, reworded, moved (drag a row by its grip, or use its menu), removed, broken into smaller ones
and made to repeat — changes there change the routine, each with an Undo in the routine's menu — and
"Resume at <step>" takes you back exactly where you were. A routine can be a step of another (Add's "A
routine", or "@" as you type): its row says what it asks — `with {concerns}`, typed words, or `asks` — and what
it gives; stepped into, it gets its own copy of what it asks and hands back what it gives. Copy… makes a routine
over under a new name. **Places…** keeps where a routine's work lives — a named link ("Design doc", notion.so) or
plain words ("Sketchbook", left shelf) — seen under Plan's heading, behind one door on its home tile and in the
runner's pull-up panel; an address typed in a step, a value or the pause note gets an "Open <host>" row there.
Only `http:` and `https:` addresses ever open (in a new tab, `noopener`); anything else stays words. Pause asks for an optional note, puts the run
down and goes home, which shows only what is in motion — **Ongoing** (a routine that repeats until you're
done) and **Finishing** (one with an end) — where every run keeps its place, the one touched last says
"last", and tapping a run's tile picks it up again (its note with it). A run can be started over, whole or from the level
you are in. A routine can repeat until you're done, or a set number of times; a run can wait on
something outside your hands and be picked up later, where you left it. Nothing counts what you did or shows how much is left; there are no deadlines, streaks or
notifications.

The repository, the database and the web address are still called `wanderment` — a leftover from the
app this replaced (a personal log, retired on 2026-11-25). What was logged there is kept in storage and
in exports; it is not shown in the app yet.

## Run it

```bash
npm install
npm run web        # the web app (the primary target for now)
npm start          # Expo dev server for iOS / Android (not verified on devices yet)
```

## Live

Every push to `main` is tested, built and deployed to GitHub Pages by the "Deploy web" workflow:
https://miguelaguerrero.github.io/wanderment/

Your data lives in a SQLite database in that browser. Use Settings → Export to keep a copy.

It's an installable web app: on iPhone, Safari → Share → **Add to Home Screen**; on Android or desktop
Chrome, **Install app**. After the first visit it works offline. When a new version is deployed, a
"new version is ready" banner appears.

## Checks

```bash
npm test           # unit tests (vitest)
npm run typecheck  # tsc --noEmit
npx eslint .       # lint
npm run e2e        # Playwright end-to-end tests against the built web app
```

`scripts/polish/verify.sh` runs all of them and is the definition of done (see `CLAUDE.md`).

## Layout

| Path | What lives there |
|---|---|
| `src/domain/` | Pure TypeScript: the execution engine (`run.ts`: a run plus a verb gives the next run), the views the screens read (`runView.ts`; calls — what a routine asks and gives, its bindings, what it hands back — are in `run.ts`; My routines and home's groups, `routines.ts`; tags, `tags.ts`; places and the one rule for opening an address, `places.ts`), values in words (`values.ts`), the search the retired prompt used (`starts.ts`), backup and migration. No React. Unit-tested. |
| `src/store/` | Zustand store: data, actions, notices, single-step undo. |
| `src/storage/` | SQLite schema and migrations, the repository, persistence with a write-ahead journal on web, the localStorage fallback, tab hand-over. |
| `src/app/go/`, `src/components/go/` | The screens: home (the runs going, Ongoing and Finishing; My routines, + New), My routines (A–Z, Find, tags; the Tags sheet), the runner (moves, Pause's sheet, values, the entry and value sheets), Plan (with Gives…, the names bar and Insert; calls, their inputs and Copy…, `Calls.tsx`; Places…, the line under its heading and the tile's door, `Places.tsx`), Jump to…, Settings. |
| `src/pwa/` | Service-worker registration and update detection (web only). |
| `public/` | Web HTML template, PWA manifest and icons. |
| `e2e/` | Playwright specs and a static server that mimics GitHub Pages. |
| `docs/` | Product rules, the design, the roadmap. |

See [`docs/DESIGN.md`](docs/DESIGN.md) for the product rules, the design in
[`docs/product/briefs/B-11-context-stacks.md`](docs/product/briefs/B-11-context-stacks.md), and
[`docs/ROADMAP.md`](docs/ROADMAP.md) for what's next — drop ideas or annoyances in its **Inbox**. In
Claude Code, `/product` grows the app and `/polish` refines it, one audited batch at a time.
