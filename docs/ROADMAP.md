# Roadmap

## M1 — Capture (this branch) ✅
- Expo SDK 58 + Expo Router, web-first
- Domain model + tests, persisted store, JSON export/import
- Home (first run, first-thread moment, thread cards + crumbs, Earlier), Activities (filter, attach), thread page (next, rename, hide, Again), activity details (when, note, next), settings

## M1.5 — Installable web app ✅
- Playwright e2e in CI before every deploy; installable, offline PWA with a reload-to-update banner

## M2 — Hardening the core ✅
- `expo-sqlite` storage with schema migrations (export `Data` shape unchanged); first-release data moves in once
- Automatic dated backups in Documents on iOS/Android (last 7), export via the share sheet
- Composer: inline `@` highlight, ↑/↓/Tab/Esc on web, screen-reader match announcements
- Accessibility pass (axe in e2e, 44 px targets, 200 % zoom reflow, decorative glyphs hidden)
- Edit and delete an activity (with Undo)

## M3 — Emergence ✅
- Name a new thread and pull in past activities that mention it (bulk, one undo) — from Home's "+ New thread", the @ menu (a quiet offer line) and the thread page
- Value headers on Home: net inflow ≥ 3 and ≥ 60 % incoming over 90 days; stays until below 40 % (hysteresis by replaying history, nothing stored); "why here?" explainer
- Search across activities, notes and next steps, grouped by thread, with recent searches

## M4 — Graph ✅
- Centred node (size = steps, ring = active in the last 14 days), what it flows to above, what flows in below, siblings at the sides (+N), tap to re-centre, breadcrumb, two-steps-out toggle; opens on the top value
- List view of the same neighbourhood (default for native screen-reader users)
- Attach mode: one unattached activity at a time; tap a highlighted node or a suggestion; Leave as is (remembered) or Skip
- Built ahead of the plan's "wait for real usage" note, on request; tune the layout once there are weeks of real data

## Later / maybe
- Share-in from other apps, home-screen widget, opt-in "On this day", photo evidence + gallery

## Cut from v1 (on purpose)
- Merge, split, hidden "then" pieces, pin
