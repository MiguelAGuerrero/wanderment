# Roadmap

A living, **polish-first** roadmap. The features from the original plan (M1–M4) are built; from here
the work is mostly making what exists trustworthy, smooth and kind at the edges, and only then adding
more. Two skills work from this file:
- `/product` (`.claude/skills/product/`) decides what's next: it turns your notes and research into
  items and briefs (`docs/product/`), ships small features, and asks you about big ones.
- `/polish` (`.claude/skills/polish/`) builds items well, in small audited batches — on its own, or
  called by `/product` for features and the rough spots around them.

You steer both by editing this file and by telling `/product` how you use the app.

## How this file works

- **Inbox** — drop anything here, in any form: an annoyance, a bug, an idea, a screenshot path.
  Each `/polish` run triages the Inbox first: it turns entries into items below, or asks you.
- **Now** — the next batch candidates, in priority order. Reorder freely; `/polish` takes from the top.
- **Next / Later** — queued, roughly ordered.
- **Decisions needed 🙋** — things only you can decide. Items that depend on one wait for it.
- Each item has an id (`P-##`), a *status* (`todo` · `in-progress` · `blocked` · `done`), a one-line
  *why*, *done when* criteria (required for Now), a size (S/M/L) and tags:
  `[data]` storage/backup/undo (always audited, needs migration tests) · `[capture]` the log box ·
  `[ux]` · `[a11y]` · `[perf]` · `[platform]` · `[native]` (needs a device build to verify) ·
  `[feature]` (new capability, usually a slice of a brief in `docs/product/briefs/`).
- `node scripts/polish/roadmap-lint.mjs` checks this format (it also runs in `scripts/polish/verify.sh`
  and in CI). Finished items leave Now/Next for the Done log, as one line:
  `- YYYY-MM-DD · P-01, P-02 — what changed · evidence: <tests/specs/screenshots> · audit: N reported · N reproduced · N fixed · N deferred · <commit>`
- Rules every item must respect: [`DESIGN.md`](DESIGN.md) — especially *capture is sacred* and the
  *never* list (goals, streaks, % complete, timers, notifications, badge counts, anything that
  creates a thread or attaches an activity without a tap).

## Inbox

_Empty. Write here — one line is enough._

## Now

### P-01 Ask the browser to keep the data `[data]` S
*Status:* in-progress
*Why:* nothing calls `navigator.storage.persist()`, so a browser may evict the database (Safari
clears storage of sites not used for a while unless they're installed to the Home Screen).
*Done when:* persistence is requested at a sensible moment (first log, or after install); Settings
says plainly whether this browser promised to keep the data and suggests Install / Export if not;
e2e covers the granted and refused paths (stubbed).

### P-02 Renaming to a name another thread already has `[ux]` S
*Status:* in-progress
*Why:* `updateThread` accepts any name, so two threads can end up with the same name and `@`
suggestions become ambiguous. Merging is cut on purpose, so the rename has to be refused kindly.
*Done when:* renaming to an existing name (case/spacing-insensitive) is refused with a clear inline
message and the field keeps the typed text; domain test + e2e.

### P-03 `@` works where the cursor is, not only at the end `[capture]` M
*Status:* in-progress
*Why:* `activeMention` reads the text up to its end, so typing `@` mid-sentence offers a thread name
that includes the rest of the sentence, and picking deletes the text after the cursor.
*Done when:* the active mention is found at the caret on web and native; picking replaces only the
`@query`; the inline highlight follows; "Return logs as typed" is unchanged; unit tests for
caret positions, e2e for a mid-sentence pick.

### P-04 Import you can trust `[data]` M
*Status:* todo
*Why:* importing replaces everything at once. "Export first if unsure" puts the burden on the person.
*Done when:* import shows a preview (counts, date range, how it differs from what's here) before
replacing; the current data is kept as an automatic snapshot that one Undo restores; a damaged file
never touches existing data; tests for preview, undo and a malformed file.

### P-05 Prove it in Safari and Firefox `[platform]` M
*Status:* todo
*Why:* storage relies on expo-sqlite's async API working without COOP/COEP and on OPFS; that's only
verified in Chromium. Installed-on-iPhone use means Safari is the main browser.
*Done when:* CI runs the e2e suite on WebKit and Firefox too (or a documented subset where a browser
genuinely lacks a feature); any browser that can't run SQLite lands in the fallback path, tested.

## Next

### P-06 Dark mode `[ux]` `[a11y]` M — needs 🙋 D-2
*Status:* blocked
*Why:* `app.json` says `userInterfaceStyle: automatic`, but every colour is fixed light.
*Done when:* colours come from theme tokens for both schemes; contrast ≥ 4.5:1 for text (checked);
warmth shading, graph and toasts work in both; status bar and splash follow; screenshots of every
screen in both schemes.

### P-07 A face for the app: icon, splash, favicon `[platform]` S — needs 🙋 D-1
*Status:* blocked
*Why:* the icon is still Expo's placeholder, and the splash and Android icon use Expo blue (#208AEF),
which clashes with the app's warm palette.

### P-08 Focus and titles on navigation (web) `[a11y]` S
*Status:* todo
*Why:* after moving between screens, keyboard and screen-reader focus stays where it was, and the
browser tab title never changes.
*Done when:* each screen sets a document title and moves focus to its heading on navigation; e2e
checks focus after opening a thread, details and search.

### P-09 Say when, beyond "2 days ago" `[ux]` S
*Status:* todo
*Why:* activity details offer Today / Yesterday / 2 days ago only; anything older can't be backdated.
*Done when:* a date (and optional time) can be picked without leaving the screen, on web and native,
never in the future; Activities and Home order update.

### P-10 Long, odd and many `[ux]` M
*Status:* todo
*Why:* untested at the extremes: 80-character thread names, 500-character activities, emoji, RTL
text, 50 threads on Home, a thread with 1,000 steps.
*Done when:* every screen and the graph wrap/truncate sensibly (screenshots at 390 px and 200 % zoom);
the thread page paginates long histories; nothing overflows sideways.

### P-11 Native crash safety `[data]` `[native]` M
*Status:* todo
*Why:* on iOS/Android there is no write-ahead journal like on web, so a crash mid-save can lose the
last change.
*Done when:* native writes are journalled synchronously (e.g. expo-sqlite's sync key-value store) and
replayed on start; covered by the persistence tests with a native-flavoured mock.

### P-12 Search that shows why it matched `[ux]` S
*Status:* todo
*Why:* results don't highlight the matched words, and very large histories search on every keystroke.
*Done when:* matches are highlighted; input is debounced for large histories; empty-state hints.

## Later

- **Graph tuning with real data** — revisit node sizing, siblings and the two-steps-out ring once
  there are weeks of entries. `[ux]`
- **Home at scale** — virtualise thread lists past ~100 threads; cold-start time and the 1.1 MB entry
  bundle (route-level splitting). `[perf]`
- **Real-device accessibility pass** — VoiceOver, TalkBack, largest Dynamic Type, Reduce Motion, on
  a development build. `[a11y]` `[native]` — needs 🙋 D-3
- **Old-version tabs** — once the first release can't still be open anywhere, retire the legacy
  listener and its notice. `[data]`
- From the original list: share-in from other apps, home-screen widget, opt-in "On this day",
  photo evidence + per-thread gallery. Each needs a product decision before it's queued.

## Decisions needed 🙋

- **D-1 Brand** — an icon/artwork you like, or a direction ("warm, hand-drawn thread", "minimal
  monogram"…) for P-07.
- **D-2 Dark palette** — approve a proposed dark palette (the skill will bring options) for P-06.
- **D-3 Native builds** — start EAS development builds (needs an Expo account) so `[native]` items can
  be verified on devices?

## Known edge cases (accepted for now)

- An old-version tab: entries created there are added here; its edits and deletions are not (the app
  says so).
- Web builds can't detect screen readers, so the toast auto-dismisses after 6 s there (it pauses on
  hover/focus and is announced politely).
- The web crumb's accessible name is its visible text ("learn the F chord Log this"); native gets the
  fuller DESIGN.md sentence.

## Done log

Newest first. One line per batch: date · items · commit.

- 2026-11-21 · Adversarial audits ×2: data-safety, undo, perf (log on Activities 28 s → 0.1 s),
  attach mode, a11y fixes · `5f16188`, `f3dde4b`
- 2026-11-21 · M4 Graph + attach mode · `e746e89`
- 2026-11-21 · M3 Emergence: pull-in, value headers, search · `14e6678`
- 2026-11-21 · M2 Hardening: SQLite, native backups, edit/delete, composer keys, accessibility · `91a6570`
- 2026-11-20 · M1.5 Installable offline PWA, e2e in CI · `7dbabba`, `a3ccbf3`
- 2026-11-20 · M1 Capture: threads, crumbs, activities, settings · `cfdb1e4`

## Cut on purpose

Merge threads, split next steps into hidden "then" pieces, pinning. Don't build them.
