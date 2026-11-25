# The app (no name yet)

**Not what you have to do. How you do it.** A personal runbook: you keep your own ways of doing
things — routines, in your words — and run them one small step at a time.

Say what you're going to do, and run it: one step on screen, with Pause, Break it down and Next. A
heavy step can be broken into smaller ones as you go; a routine can repeat until you're done, or a set
number of times; a run can wait on something outside your hands and be picked up later, where you left
it. Nothing counts what you did or shows how much is left; there are no deadlines, streaks or
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
| `src/domain/` | Pure TypeScript: the execution engine (`run.ts`: a run plus a verb gives the next run), the views the screens read (`runView.ts`), the prompt's search (`starts.ts`), backup and migration. No React. Unit-tested. |
| `src/store/` | Zustand store: data, actions, notices, single-step undo. |
| `src/storage/` | SQLite schema and migrations, the repository, persistence with a write-ahead journal on web, the localStorage fallback, tab hand-over. |
| `src/app/go/`, `src/components/go/` | The screens: home (tiles and the prompt), the runner, the paused screen, See it all, Jump to…, the routine editor, Settings. |
| `src/pwa/` | Service-worker registration and update detection (web only). |
| `public/` | Web HTML template, PWA manifest and icons. |
| `e2e/` | Playwright specs and a static server that mimics GitHub Pages. |
| `docs/` | Product rules, the design, the roadmap. |

See [`docs/DESIGN.md`](docs/DESIGN.md) for the product rules, the design in
[`docs/product/briefs/B-11-context-stacks.md`](docs/product/briefs/B-11-context-stacks.md), and
[`docs/ROADMAP.md`](docs/ROADMAP.md) for what's next — drop ideas or annoyances in its **Inbox**. In
Claude Code, `/product` grows the app and `/polish` refines it, one audited batch at a time.
