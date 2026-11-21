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

### P-13 A bridge after the first log `[ux]` S
*Status:* todo
*Why:* after a first log with no `@`, Home loses the welcome and shows no threads — nothing explains
threads or what to do next (owner, 2026-11-21; brief B-01 slice 1, which ships regardless of D-4).
*Done when:* for the latest activity with no thread only, Home shows "Logged. Toward something — or
just itself?" with one-tap chips for existing threads and "+ name it" (no count); tapping attaches
the activity as "to" (Undo in the toast); "just itself" or ignoring it leaves no trace; it goes away
on the next log or when leaving Home; announced once, politely, via the toast; e2e (attach via chip,
via new name, ignore, next log clears it) + axe. (B-01 panel refinement 8.)

### P-14 Mark a thread as what it's for (data) `[data]` `[feature]` M
*Status:* todo
*Why:* B-01 slice 2 (D-4 go): a "why" is a thread marked as what it's for — the foundation for the
live graph, headers and first step.
*Done when:* an optional `declaredAt` on threads with an additive schema migration (old data reads
unchanged); export includes it and import accepts backups with and without it (Data version stays
1); declare / undeclare from the thread page with Undo; migration + round-trip + mutation-checked
persistence tests; at most 3 declared whys — naming a 4th offers a swap; undeclaring keeps nothing
behind but the thread ("Not what it's for right now", Undo). (B-01 panel refinement 6.)

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

### P-15 A live graph at the top of Home `[feature]` M
*Status:* todo
*Why:* B-01 slice 3b, moved earlier by the owner: see what it's for and what feeds it the moment
you declare or log.
*Done when:* domain `overview(data, index)` (whys + most active feeders, cap with "+N", placeholder
when empty) with tests; compact graph above the cards; tapping a node opens the thread; one
screen-reader summary line; e2e: a node appears right after declaring, a link right after logging;
axe; 390 px and 200 % zoom; Home stays fast with `bigBlob`. Ships with the DESIGN.md Interaction
wording accepted in D-4. Includes B-01 panel refinements 1–4: names-not-numbers summary, a plain
"to Y" log visibly feeds Y, never shrinks with time (all-time links; warmth only dims; no placeholder;
fixed compact height; summary + "Open graph" at largest text), one accessible element.

### P-16 Whys as headers on Home `[feature]` M
*Status:* todo
*Why:* B-01 slice 3: declared whys head Home immediately, merged with earned values.
*Done when:* declared whys render as "TO …" headers with "+ a way toward it", merged with earned
ones; fade to Earlier after 90 days with no inflow; "why here?" covers declared and earned; `@`
ranks declared whys first; domain tests for grouping/fading/merging; e2e with 0/1/3 whys. Includes
B-01 panel refinements 1, 5, 6, 7, 10: "why here?" in names; a why with no recent inflow steps back
to a quiet line and returns on new inflow; remove from the header; real sentence-case headings;
"+ a thread toward it" only once it presets a visible "to".

### P-17 Gentle live animation `[feature]` `[a11y]` S
*Status:* todo
*Why:* B-01 slice 3c: new nodes and links ease in and glow briefly, then settle.
*Done when:* animation on declare/log; none under Reduce Motion (native setting or
`prefers-reduced-motion`), e2e with reduced motion emulated; no layout shift for the cards below;
only what's new animates, once (thickening is instant); the toast carries the same moment in words.

### P-18 An optional first step: what's it all for? `[feature]` M
*Status:* todo
*Why:* B-01 slice 4: on first open, name up to three whys — or skip in one tap; the log box is
live throughout.
*Done when:* first-open card with one field + "+ another" (up to 3), "You can change these any
time", "Let it surface" as an equal path (no trace), one value-shaped example; logging dismisses it
for good; e2e for declare, let-it-surface and log-during-card; axe. (B-01 panel refinement 9.)

### P-19 A step toward this `[data]` `[feature]` M
*Status:* todo
*Why:* B-02 slice 1 (D-5 go, model A): a next step can hold a smaller step on top — one staged at
a time — forming chains of intention ("toward …").
*Done when:* stacked steps per thread (additive migration; export carries the whole stack and
round-trips, `next` stays the top for older versions); "+ a step toward this" (one step per tap),
remove, "let these go" (Undo) and "done it already" (Undo) behind ✎ on the thread page; logging the
top surfaces the one beneath, calmly; the logged activity keeps "toward …" as plain text; toast
"Logged in X, toward Y" spoken once; Home crumb shows top + "toward …", wraps, accessible name starts
with the visible text; only the top is loggable; no "chain" wording, no counts; domain + migration +
mutation-checked persistence tests; e2e; axe. (B-02 panel refinements 1–6, 9, 10.)

### P-20 Make a step a thread `[feature]` S
*Status:* todo
*Why:* B-02 slice 2: a step that becomes a pursuit can be promoted — on request only.
*Done when:* promote from ✎; its first log presets a visible "to" chip toward the step's why (never
applied silently); toast "Now a thread, toward X. Undo"; the original crumb shows what remains;
focus lands on the result; the live graph shows the link once logged; e2e. (Refinement 7.)

### P-21 The "toward" view on the thread page `[ux]` S
*Status:* todo
*Why:* B-02 slice 3: see the staged steps as one sentence ("A → toward B → toward C").
*Done when:* collapsed disclosure with expanded state and list semantics; staged steps only, no
dates/ticks/numbers; *Earlier* rows show the top only; e2e + axe. (Refinement 8.)

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
- **D-4 Start from what it's for** — build [B-01](product/briefs/B-01-start-from-what-its-for.md)
  slices 2–4 (declared "what it's for" threads that seed Home, a compact live graph at the top of
  Home that grows as you declare and log — gentle animation, off under Reduce Motion — and an optional
  first step), and change the Home/"declared up front" wording in DESIGN.md / STRATEGY.md / README?
  Recommended: **go**.
  **Answered 2026-11-21: go, with the live graph earlier; philosophy wording accepted as written.**
  → P-13, P-14 (Now), P-15–P-18 (Next). B-01 is `building`.
- **D-5 Chains of intention** — build [B-02](product/briefs/B-02-chains-of-intention.md): one staged
  next step that can take a smaller step "on top" (the old one becomes its why), forming chains of
  intention; steps can be promoted to threads. Reverses the roadmap's cut of hidden "then" pieces, so
  the rules would be refined. Recommended: decided after the persona panel.
  **Answered 2026-11-21: go with model A; only the top step is loggable.** → P-19, P-20, P-21 (Next,
  after B-01's slices). B-02 is `building`. Also decided: no "Show graph on Home" setting for now
  (B-01 panel option).
- **D-6 The log box also finds** — build [B-03](product/briefs/B-03-log-field-finds.md): as you
  type on Home, up to 3 quiet chips show matching whys, threads, staged steps and past activities
  (whole line, in words, no dates); a tap focuses it in the live graph, with a "Showing … · Show all"
  caption; Return still logs exactly as typed. Slices after P-15. Also "Log this keeps what you
  typed" (a fix to today's crumb) now. Options: one-off activities via "All results →"
  (recommended); whether a kept line counts as the step. Recommended: **go, with the panel's
  refinements**.
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

Merge threads, pinning. Don't build them.
(Splitting next steps into hidden "then" pieces was cut here too; **D-5 reversed it** in a narrower
form: one staged step that can hold a smaller step "toward" it — see B-02.)
