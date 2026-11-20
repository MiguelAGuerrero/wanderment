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

Your data lives in that browser's storage. Use Settings → Export to keep a copy.

## Checks

```bash
npm test           # domain unit tests (vitest)
npm run typecheck  # tsc --noEmit
npx eslint .       # lint
```

## Layout

| Path | What lives there |
|---|---|
| `src/domain/` | Pure TypeScript model, selectors, @-autocomplete, backup. No React. Fully unit-tested. |
| `src/store/` | Zustand store persisted to AsyncStorage (localStorage on web). Draft, toast, single-step undo. |
| `src/components/` | Composer (log box), ThreadCard (card + next-step crumb), Toast, Screen shell. |
| `src/app/` | Expo Router screens: Home, Activities, Graph (placeholder), thread page, activity details, settings. |
| `docs/` | Design decisions and roadmap. |

See [`docs/DESIGN.md`](docs/DESIGN.md) for the product rules and [`docs/ROADMAP.md`](docs/ROADMAP.md) for what's next.
