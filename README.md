# Wanderment

A personal log for people with many interests who don't want goal-setting apps.

Log what you just did in one line. Optionally say what it was **to** — `practiced scales @play guitar`.
Over time, threads of activity form, each with a small "next step" so picking an interest back up
feels warm instead of cold. No goals, streaks, timers or notifications: direction is read from
what you've done, not declared up front.

## Run it

```bash
npm install
npm run web        # browser prototype (primary target for now)
npm start          # Expo dev server for iOS / Android
```

## Live

Every push to `main` builds the web app and publishes it to the `gh-pages` branch:
https://miguelaguerrero.github.io/wanderment/

Your data lives in a SQLite database in that browser (on iOS/Android, on the device, with a dated backup in
Documents/backups for the last 7 days). Use Settings → Export to keep a copy.

It's an installable web app: on iPhone, Safari → Share → **Add to Home Screen**; on Android/desktop Chrome, **Install app**.
After the first visit it works offline. When a new version is deployed, a small "A new version is ready · Reload"
banner appears; nothing reloads on its own.

## Checks

```bash
npm test           # domain unit tests (vitest)
npm run typecheck  # tsc --noEmit
npx eslint .       # lint
npm run e2e        # Playwright end-to-end tests against the built web app
```

## Layout

| Path | What lives there |
|---|---|
| `src/domain/` | Pure TypeScript model, selectors, @-autocomplete, backup. No React. Fully unit-tested. |
| `src/store/` | Zustand store: data, draft, toast, single-step undo. |
| `src/storage/` | SQLite schema + migrations, repository (tested against real SQLite via `node:sqlite`), persistence with a write-ahead journal on web, native file backups. |
| `src/components/` | Composer (log box), ThreadCard (card + next-step crumb), Toast, UpdateBanner, Screen shell. |
| `src/pwa/` | Service-worker registration and update detection (web only). |
| `public/` | Web HTML template, PWA manifest and icons. `workbox-config.js` generates `sw.js` at build time. |
| `e2e/` | Playwright specs and a static server that mimics GitHub Pages. |
| `src/app/` | Expo Router screens: Home, Activities, Graph (placeholder), thread page, activity details, settings. |
| `docs/` | Design decisions and roadmap. |

See [`docs/DESIGN.md`](docs/DESIGN.md) for the product rules, [`docs/ROADMAP.md`](docs/ROADMAP.md) for what's next, and [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) for the step-by-step plan a coding agent can follow.
