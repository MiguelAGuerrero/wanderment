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

## M3 — Emergence
- Name a new thread and pull in past activities that mention it (bulk, one undo)
- Value headers on Home once a thread has a clear, stable majority of inflow (with a buffer so headers don't flip)
- Search

## M4 — Graph
- Centred node, what it flows to above, what flows in below; list alternative for screen readers
- Attach mode for unattached activities

## Later / maybe
- Share-in from other apps, home-screen widget, opt-in "On this day", photo evidence + gallery

## Cut from v1 (on purpose)
- Merge, split, hidden "then" pieces, pin
