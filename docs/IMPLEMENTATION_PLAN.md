# Wanderment — implementation plan for a coding agent

> **Status: complete (Phases 0–4, November 2026).** Ongoing work lives in [`ROADMAP.md`](ROADMAP.md) and is
> driven by the `/polish` skill.

Read this whole file before starting. Work through the phases **in order**; each phase is one branch and one PR.
Product rules live in [`DESIGN.md`](DESIGN.md) and are not up for reinterpretation — if a task seems to
conflict with them, stop and ask instead of guessing.

---

## 0. Ground rules (apply to every phase)

**Stack.** Expo SDK 58, Expo Router (routes in `src/app/`), React 19, React Native 0.88, react-native-web,
Zustand + AsyncStorage, Vitest. Web-first: the live app is a single-page app on GitHub Pages at
`https://miguelaguerrero.github.io/wanderment/` (`experiments.baseUrl` = `/wanderment`).

**Expo has changed since most training data.** Follow `AGENTS.md`: check the `expo` major version in
`package.json`, read the versioned docs (`https://docs.expo.dev/versions/v58.0.0/`, append `.md` to any docs URL
for a machine-readable copy), and install native packages with `npx expo install <pkg>`. If `expo install` can't
reach the network, pin the version listed in `node_modules/expo/bundledNativeModules.json`.

**Architecture.**
- `src/domain/` is pure TypeScript with no React or Expo imports. All logic goes here first, with Vitest tests.
- `src/store/useStore.ts` wraps domain functions; components never mutate data directly.
- Everything references thread/activity **ids**. Never store names inside other records.
- Links between threads are **derived from activities**, never stored.

**Never add:** goals, streaks, % complete, timers, notifications, badges with counts, or anything that auto-creates
a thread or auto-attaches an activity without a tap.

**Definition of done for every task** (run all, all must pass):
```bash
npm test                # vitest — add tests for every new domain function
npm run typecheck       # tsc --noEmit
npx eslint .            # lint (`npx expo lint` needs network; use eslint directly)
npm run e2e             # Playwright against the built web app (added in Phase 0)
```
Also run the web build (`npx expo export --platform web`) and look at the affected screens at 390×844.

**Git.** Branch per phase (`phase-1-pwa`, …), small commits, PR into `main`. Merging to `main` deploys
automatically (`.github/workflows/deploy-web.yml`) — never push broken code to `main`.

---

## Phase 0 — Agent setup and end-to-end tests

Goal: make every later phase verifiable by the agent itself.

1. **Add `CLAUDE.md`** at the repo root: three lines pointing to `AGENTS.md`, `docs/DESIGN.md` and this file,
   plus the definition-of-done commands above.
2. **Add Playwright e2e tests** (`@playwright/test` as a dev dependency, `e2e/` folder, `playwright.config.ts`):
   - `webServer`: build with `npx expo export -p web`, copy `dist/index.html` → `dist/404.html`, then serve
     the build so it is reachable at `http://localhost:<port>/wanderment/` (e.g. copy `dist` into
     `.e2e-site/wanderment/` and serve `.e2e-site` with `npx serve`).
   - Viewport 390×844. Fail the test on any `pageerror`.
   - Port these existing manual checks into specs:
     1. First open shows "Log what you just did." and example chips; tapping a chip fills the log box.
     2. `practiced scales @play guitar` → tap "+ New thread" → Return → thread card + "Your first thread." banner.
     3. `leg day @gymm` + Return → activity saved **as typed**; no thread named "gymm" exists.
     4. "+ What's next?" → set "learn the F chord" → crumb shows it → tap "Log this" → log box contains it with
        the thread as doing → edit → Return → crumb cleared, activity listed.
     5. Undo in the toast removes the last activity.
     6. Activities tab: "No thread" filter shows only unattached activities; "Attach…" attaches one.
     7. Data survives a page reload.
     8. Deep link `/wanderment/activities` loads the Activities screen.
3. Add `"e2e": "playwright test"` to `package.json` and run e2e in `.github/workflows/deploy-web.yml`
   **before** publishing (install browsers with `npx playwright install --with-deps chromium`).

**Done when:** `npm run e2e` passes locally and in CI.

---

## Phase 1 — Installable, offline PWA

Goal: "Add to Home Screen" opens full-screen and works offline after the first visit.

1. **HTML template.** `npx expo customize public/index.html` (single-page-app path in the Expo PWA guide).
   In `<head>` add: `<link rel="manifest">`, `<meta name="theme-color" content="#F5F3EE">`,
   `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title`
   ("Wanderment"), and `<link rel="apple-touch-icon">`.
   **Base path:** every URL must work under `/wanderment/` — verify the built `dist/index.html` references
   `/wanderment/manifest.json` etc. (use whatever the template substitutes for the base URL, or hard-code the
   prefix if it doesn't substitute in `public/`).
2. **Manifest** `public/manifest.json`: `name` "Wanderment", `short_name` "Wanderment", `start_url` and `scope`
   `/wanderment/`, `display` "standalone", `background_color`/`theme_color` `#F5F3EE`, icons 192 and 512 px
   (plus a 512 `maskable`) generated from `assets/images/icon.png` into `public/icons/`.
3. **Service worker with Workbox.** Dev dependency `workbox-cli`; `workbox-config.js` with
   `globDirectory: 'dist/'`, precache `**/*.{html,js,css,png,ico,json,ttf,woff,woff2}`,
   `swDest: 'dist/sw.js'`, `navigateFallback: '/wanderment/index.html'`, `skipWaiting: false`,
   `clientsClaim: true`. Add `"build:web": "expo export -p web && workbox generateSW workbox-config.js"` and
   use it in the deploy workflow (keep the `404.html` and `.nojekyll` steps).
4. **Registration** in `public/index.html`: register `/wanderment/sw.js` with `scope: '/wanderment/'`, only in
   production builds.
5. **Updates without surprises.** When a new service worker is waiting, show a small, non-blocking banner
   "A new version is ready · Reload" (no modal, no auto-reload while typing). Expo's guide warns that an
   aggressive service worker can strand users on old versions — this banner is the escape hatch.
6. **e2e:** a spec that loads the app, waits for the service worker to activate, sets the browser context
   offline, reloads, and still sees Home with existing data. Also assert the manifest is fetched and valid.

**Done when:** Lighthouse "installable" passes on the deployed site; offline reload works in e2e; on an
iPhone, Safari → Share → Add to Home Screen opens full-screen with the right icon and name.

---

## Phase 2 — Harden the core (M2)

1. **Storage versioning + migrations.** Add `version` handling and a `migrate` function to the persisted store
   (`persist` options), with Vitest tests for a v1 → v2 migration fixture. Keep the exported `Data` shape stable.
2. **Safer local data on web.** Write the store to IndexedDB as well as localStorage (or move to IndexedDB via
   a small `StateStorage` adapter), so a cleared localStorage isn't total loss. Keep JSON export/import.
   *Decision for the agent to surface, not make:* whether to adopt `expo-sqlite` now. It needs special headers
   on web (COOP/COEP) that GitHub Pages can't set, so the recommendation is: **stay on the JSON store for web,
   revisit SQLite when native builds start.**
   **Decided by the owner: adopt `expo-sqlite` now.** Only expo-sqlite's *synchronous* API needs those headers;
   the async API works without them, so the app uses async calls only (`src/storage/`). Verified in Chromium
   (e2e); not yet checked in Safari or Firefox — if SQLite can't open there, the app falls back to the
   localStorage format. Web writes are journalled to
   localStorage first so a reload mid-write loses nothing; browsers that can't run it fall back to the old
   localStorage format; a second tab waits rather than showing stale data.
3. **Native backup.** On iOS/Android, write a dated JSON backup to the app's Documents directory after each
   change (debounced) using `expo-file-system`, keeping the last 7. Export via `expo-sharing`.
4. **Composer polish.**
   - Inline highlight of the active `@query` (overlay or styled text, whichever works on web + native).
   - Web keyboard: ↑/↓ move through suggestions, Tab picks, Enter always logs, Esc closes suggestions.
   - Screen reader announcement "N threads match, X selected" when suggestions change.
5. **Accessibility pass.** Labels per `DESIGN.md` (crumb: "Next step for X: Y. Double-tap to load into the log
   box."), hide decorative glyphs, 44 px targets, test at the largest Dynamic Type / browser zoom 200%,
   respect Reduce Motion. Add `@axe-core/playwright` checks to e2e for Home, Activities, thread page.
6. **Edit and delete an activity** from its details screen (text, doing/to chips, delete with Undo).

**Done when:** migrations tested; axe reports no serious violations; keyboard-only logging works on web.

---

## Phase 3 — Emergence (M3)

1. **Name a new thread and pull in the past.** From Home ("+ New thread") and from the @ menu: after naming,
   show past activities whose text matches the name's meaningful words (reuse `suggestDoing` logic; add a
   domain function `candidatesForThread(data, name)` with tests). Checkboxes, one bulk "Attach N", single Undo
   for the whole batch.
2. **Value headers on Home.** Domain function `valueThreads(data)` with tests: a thread is a value when
   (inflow − outflow) ≥ 3 and inflow ≥ 60 % of its total links over the last 90 days; once a value, it stays
   one until it falls below 40 % (hysteresis, so one log can't flip headers). Until any value exists, keep the
   plain "YOUR THREADS" list. Group other threads under the value they most often flow to.
   Header text is "TO " + name in caps. Add a small "why here?" explainer on long-press/tap of a header.
3. **Search** (`src/app/search.tsx`): across activity text, notes and next steps, grouped by thread; recent
   searches as chips. Domain function with tests.

**Done when:** e2e covers bulk pull-in + undo; value-header tests cover hysteresis and cycles (A→B and B→A).

---

## Phase 4 — Graph (M4)

Only start once the app has real usage data (weeks of entries).

1. Domain: `neighbourhood(data, threadId, depth)` returning flows-to (above), flows-from (below) and siblings,
   weighted by activity counts and recency; tests including cycles.
2. Screen `src/app/(tabs)/graph.tsx`: centred node (size = steps, ring = last 14 days), what it flows to above,
   what flows in below, siblings at the sides capped at 5 with a "+N" chip, tap to re-centre, breadcrumb path,
   depth 1/2 toggle. Render edges with `react-native-svg`, nodes as `Pressable`s. Opens on the top value.
3. **List view** of the same neighbourhood for screen readers (toggle at the top).
4. **Attach mode:** holds the graph still, one unattached activity at a time in a bottom card, tap a highlighted
   node or suggestion chip to attach (drag-and-drop is optional and never the only way), "Leave as is", "Skip".

**Done when:** works with 200+ threads in a generated fixture without jank; e2e covers re-centre and attach mode.

---

## Later (only on request)

Share-in from other apps (needs a native dev build), home-screen widget, opt-in in-app "On this day",
photo evidence + per-thread gallery, native app store builds via EAS.

**Cut on purpose — do not build:** merge threads, split next steps into hidden "then" pieces, pinning.
