# Roadmap

## M1 — Capture (this branch) ✅
- Expo SDK 58 + Expo Router, web-first
- Domain model + tests, persisted store, JSON export/import
- Home (first run, first-thread moment, thread cards + crumbs, Earlier), Activities (filter, attach), thread page (next, rename, hide, Again), activity details (when, note, next), settings

## M2 — Hardening the core
- Swap AsyncStorage JSON for `expo-sqlite` once data grows (keep `Data` shape for export)
- Automatic backup (Documents folder / iCloud Drive)
- Composer: highlight matched `@` inline, keyboard navigation of suggestions on web
- Accessibility pass (VoiceOver/TalkBack labels, Dynamic Type at large sizes, Reduce Motion)

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
