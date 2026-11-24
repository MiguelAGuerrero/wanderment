# Roadmap

A living roadmap with two lanes (owner, 2026-11-22), each owned by a skill that runs only when
you start it:
- **Grow** — items tagged `[feature]`, from your ideas and approved briefs. `/product`
  (`.claude/skills/product/`) builds them, a visible slice per cycle, and asks you about big ones.
- **Refine** — every other item: making existing features feel right (similar apps' UI/UX
  conventions, quality of life, edge cases, accessibility). `/polish` (`.claude/skills/polish/`)
  benchmarks a feature area, turns the gaps into items here, and builds them in small audited
  batches. Reliability and data issues (the **Fix** lane) go first, at full rigor, in either.

You steer both by editing this file and by telling `/product` how you use the app.

## How this file works

- **Inbox** — drop anything here, in any form: an annoyance, a bug, an idea, a screenshot path.
  Each `/polish` run triages the Inbox first: it turns entries into items below, or asks you.
- **Now** — the next candidates, in priority order. Reorder freely; `/product` takes the top
  `[feature]` items, `/polish` the top others.
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

### P-73 The rise: lines become stars `[feature]` `[data]` `[capture]` `[a11y]` M
*Status:* todo
*Why:* B-08 slice 1 (D-14 go with changes). `docs/product/briefs/B-08-constellations.md`.
*One home (D-15):* built as the first camera tilt of the one home (B-08 "One home"), not a separate
landing screen.
*Done when:* Return still saves the line at once as typed; the camera tilts up and the line rises as
a star with your words (a heading, focus on it): by default a **lit** pursuit with quiet **Done it**
(✦), **↳ First step** and a corner **Toward…**; with the sticky **done** chip on, it lights and
settles at once (several in a row; the chip stays on until turned off or you leave); Done it
settles it (twinkle, dim, "Settled" announced, Undo that waits under assistive tech); ↳ First step
opens a step field and only Return creates the wander (named with your words) and sets its step,
Undo; Toward… attaches to any wander, Undo; a lit star's glow fades like warmth; lit stars in night
ink, never the accent colour; the rise never blocks typing; no hint lines; additive optional
`settledAt` (older activities read as settled); export/import round-trip; "Kept, loose · Move it?"
retired; migration + persistence tests (mutation-checked); e2e + axe at the end.

### P-46 Home's per-log cost with a large history `[perf]` M
*Status:* todo
*Note (2026-11-23):* after P-48–P-61 the ratio reads 1.13–1.23×, once 1.33× on a 4-worker run; cleanup of the unused bridge store code (`bridgeFor`, `attachToNew`, `BRIDGE_QUESTION`) belongs with this.
*Why:* `e2e/home-graph-perf.spec.ts` swings 1.19–1.43× against its 1.25× budget with a 4,000-log
history (CI red on 2026-11-22 before P-38; P-38 pulled for it). The graph's deferred work after each
log is the cost; P-38 waits on this.
*Done when:* profile the deferred picture render and its layout/paint after a log; bring the spec
reliably under budget (10 runs in a row locally); then P-38 can land from `p38-keep-dots`.

### P-05 Prove it in Safari and Firefox `[platform]` M
*Status:* todo
*Why:* storage relies on expo-sqlite's async API working without COOP/COEP and on OPFS; that's only
verified in Chromium. Installed-on-iPhone use means Safari is the main browser.
*Done when:* CI runs the e2e suite on WebKit and Firefox too (or a documented subset where a browser
genuinely lacks a feature); any browser that can't run SQLite lands in the fallback path, tested.

## Next

### P-74 One home: the sky at rest, sessions over it `[feature]` `[a11y]` L
*Status:* todo
*Why:* B-08 slice 2, reshaped by D-15 (one home).
*Also when:* the trailhead and the sky are one home — at rest your recent lines as faint unlabelled
stars, guiding stars brighter, Map a labelled signpost by the lantern; "I'm not sure" and tapping a
star tilt up into a session layer that folds in today's star and trail screens; a session ends by
itself after a choice and the camera comes down to the lantern; `/sky`, `/star`, `/trail` open the
home already tilted; never any "away N days" or withering.
*Done when:* "I'm not sure" shows recent lines as stars (the last ~60 days or ~12 lines, whichever is
more) — lit ones glowing by warmth, settled ones dim, a just-settled one twinkling — and whys as
brighter fixed guiding stars (accent colour only for them); tapping a lit star brings back Done it /
First step / Toward…; screen-reader list with headings (guiding stars, lines newest first with state
in each name, then constellations once P-76 lands); hit areas ≥ 44 pt; Reduce Motion; e2e + axe.

### P-75 Kinds `[feature]` `[data]` `[capture]` `[a11y]` S
*Status:* todo
*Why:* B-08 slice 3.
*Done when:* once you've typed, a fixed row — make, read, write, research, watch, plan, move,
people, rest — in one container after the suggestions, "I'm not sure" and the done chip; tap tags
(again untags), "selected" spoken, never takes focus or catches Return, no layout jump; optional
`kind` stored, exported, round-trips; never counted.

### P-76 Constellations and "Name this?" `[feature]` `[a11y]` M
*Status:* todo
*Why:* B-08 slice 4.
*Done when:* derived on the fly (never stored): lines draw faint links when they share word stems,
or a kind within a few days (a kind alone only pulls stars near); ≥ 3 within a few weeks; tapping
shows the lines with dates in words and the shared word or kind highlighted, and **Name this?** (a
wander or a why) attaches them in one tap with Undo; screen readers hear "Lines that go together:
…", no count; a named theme keeps its lines reachable from its star.

### P-77 B-08 in DESIGN.md `[feature]` S
*Status:* todo
*Why:* B-08 slice 5.
*Done when:* DESIGN.md describes lines as stars (pursuit and done), the done chip, kinds,
constellations and guiding stars; B-07's P-67 (step stacks) continues from ↳ First step.

### P-67 Step stacks `[data]` `[feature]` M
*Status:* todo
*Why:* B-07 slice 3 (absorbs P-19).
*Done when:* an ordered stack of steps per wander (additive migration; `next` kept as the top for
older versions and older exports); "Nearer step" pushes; Did it pops into an activity; set down with
Undo; a cleared stack shows "Reached"; export/import round-trip; migration + persistence tests,
mutation-checked; verify --full.

### P-68 Camp: a note and "waiting on…" per wander `[data]` `[feature]` S
*Status:* todo
*Why:* B-07 slice 4.
*Done when:* a per-wander note and optional waiting-on, edited on the trail and the camp sheet,
shown under each trail; switching or closing keeps everything; stored, exported, round-trips; e2e.

### P-69 Routines: desire paths and marked routes `[data]` `[feature]` M
*Status:* todo
*Why:* B-07 slice 5.
*Done when:* typing brings up similar past entries as desire paths (no storage); "Mark this route"
on a cleared stack saves a route and a step can be kept as a pebble; both show as chips under their
star and in typing; pushing a route re-creates its steps; nothing pushed without a tap; stored,
exported, round-trips; e2e.

### P-70 B-07 cleanup `[feature]` S
*Status:* todo
*Why:* B-07 slice 6.
*Done when:* DESIGN.md fully describes the night sky (model, stacks, camp, routines, visuals); the
perf spec measures Map and the trailhead separately; leftovers of the graph-first Home removed.

### P-44 Screens without explanations `[ux]` `[a11y]` M
*Status:* todo
*Why:* owner, 2026-11-22: "the UI should be intuitive enough … you should have an information
dialogue, but never it being part of the UI itself" (now a DESIGN.md rule). Today's screens carry
helper sentences: the empty-Home welcome, the first run's helper lines, the bridge question's
framing, Settings notes.
*Done when:* each screen shows actions and data only; the explanations move into an ⓘ sheet per
screen that never opens by itself; safety warnings stay inline; accessible names keep the full
meaning; e2e and a11y specs updated (copy assertions move to the sheet); screenshots at 390 px.

### P-45 Import odds and ends `[data]` S
*Status:* todo
*Why:* P-04 audit, deferred: F14 a backup with five declared whys imports as five (DESIGN.md: at most
three); F12 the preview's date range trusts any parseable date (1999–2031) and calls version 1.5
"newer"; F15 "Lately: weave; weave" when a doing-log and a to-only log name the same wander.
*Done when:* importing more than three declared whys keeps the three most recently declared and says
so in the preview; implausible dates are left out of the range; non-integer versions are refused as
not a backup; "Lately" names a wander once; unit tests.

### P-39 Import keeps a snapshot one Undo restores `[data]` M
*Status:* todo
*Why:* P-04's third part (owner, 2026-11-22: next batch). Undo is memory-only and field-wise, and the
native dated backup is overwritten the same day, so nothing protects you from a wrong import.
*Done when:* the data from before an import is committed as one snapshot (SQLite settings row, by the
page that holds the data) before the swap; the toast's Undo and a Settings "Restore what you had
before the import" line (surviving reload, until the next import or dismissed) restore it exactly,
through the gated and journaled path; a crash between snapshot and swap leaves data intact;
persistence tests for reload, crash, second page and the local-storage fallback.

### P-40 Naming copy `[feature]` `[ux]` S
*Status:* todo
*Why:* B-05 slice 2 (D-8): "nothing feeds it yet" reads false right after you did something and
scolds a month later; the examples read as moods only.
*Done when:* "nothing feeds it yet" is gone from the summary; the examples span a feeling, a value
and an end (keeping "feel productive"); placeholder "A feeling, a reason or an end, in your own
words"; the step prompt reads "a next step, if one comes to mind · it can wait"; a why's list button
names its staged step for screen readers, and the summary never repeats it; tests updated.

### P-32 Take-back conflicts and leftovers `[data]` `[platform]` S
*Status:* todo
*Why:* P-29 audit 4 (shipped with these open; each needs another page's unusual failure plus a
conflicting edit, and none loses typed text): F1 a set-aside journal's own edits win over another
page's later delete/edit of the same record; F2 an old identical `journal-failed-*` entry triggers
a rebase, and those entries are never pruned; F4 the "couldn't be saved" banner stays after a journal
replay heals; F5 three surviving mutants (journal read-back, settings rebase, `syncField` own-save);
F6 stale step in the D4 details line; F8 a remembered Return across Reload could log twice.
*Done when:* own upserts apply only to records unchanged on disk since the base (tested with a
delete and an edit from the other page); set-aside entries are matched by id, not text, and pruned
after replay; the banner clears when the journal lands; each mutant is killed; tests for F6/F8.

### P-31 A cold start that can't open keeps trying `[data]` `[platform]` S
*Status:* todo
*Why:* P-29 audit 3 (U1): when the browser has used SQLite before and an open fails for a reason
other than "held elsewhere", the cold-start screen is a dead end ("Reload to try again") and Reload
lands on it again. Deferred from P-29 because it reverses three Part A tests on main.
*Done when:* on web, that case shows the waiting screen and retries with backoff (native unchanged);
the three Part A assertions are updated with the reason; the remembered Return and draft survive;
persistence + e2e tests. Patch ready: session scratchpad `U1-cold-start-retry.patch`.

### P-28 The thread page at 200 % zoom and long names `[ux]` `[a11y]` S
*Status:* todo
*Why:* audit of P-14 (F5, F6, F9, F12): at 200 % zoom the swap row opens below the fold and a swap
toast with long names grows past the screen top; Esc doesn't close the swap row from the log box; a
long thread name makes its page wider than the screen (the composer's "Doing:" chip doesn't wrap —
existing, not from P-14).
*Done when:* the swap row is scrolled into view when it opens; toasts cap their height (names wrap,
Undo stays visible); the doing chip wraps at 390 px with a 90-character name; Esc closes the swap row
from anywhere on that page only; e2e at 390 px and 200 %.

### P-27 The toast speaks on iOS `[a11y]` `[native]` S
*Status:* todo
*Why:* audit of P-13/P-24 (F9): the toast relies on `accessibilityLiveRegion`, which is Android-only;
on iOS VoiceOver neither "Logged" nor the bridge question is announced (the "Logged" gap predates it).
*Done when:* the toast announces message + detail once via `AccessibilityInfo.announceForAccessibility`
off-web (no double announce on Android); unit test of the platform branch; checked on a device when
D-3 allows.

### P-22 Honest "kept" wording per platform `[ux]` S
*Status:* todo
*Why:* audit B (finding 10): Settings says an installed app's data is kept even when the browser
hasn't promised it, hides the ask button there, and shows the iOS-only "Share → Add to Home Screen"
on desktop and Android. The warning also shows when there's nothing saved yet.
*Done when:* the install hint names the platform's own way (or none); "installed" never claims what
`persisted()` denies; no warning on an empty install; e2e per stubbed platform.

### P-23 An exact `@` match always shows `[capture]` S
*Status:* todo
*Why:* audit B (finding 13): with 220 threads, `@thread 21` offers 215, 216 and 211, so the exact
match can be neither picked nor created.
*Done when:* an exact (normalized) name match is always the first suggestion; unit test with
`bigBlob`-sized data.


### P-17 Gentle live animation `[feature]` `[a11y]` S
*Status:* todo
*Why:* B-01 slice 3c: new nodes and links ease in and glow briefly, then settle.
*Done when:* animation on declare/log; none under Reduce Motion (native setting or
`prefers-reduced-motion`), e2e with reduced motion emulated; no layout shift for the cards below;
only what's new animates, once (thickening is instant); the toast carries the same moment in words.

### P-18 An optional first step: what's it all for? `[feature]` M — superseded by P-36
*Status:* blocked
*Why:* B-01 slice 4: on first open, name up to three whys — or skip in one tap; the log box is
live throughout.
*Done when:* first-open card with one field + "+ another" (up to 3), "You can change these any
time", "Let it surface" as an equal path (no trace), one value-shaped example; logging dismisses it
for good; e2e for declare, let-it-surface and log-during-card; axe. (B-01 panel refinement 9.)

### P-25 Find in the graph: matches in memory `[feature]` S
*Status:* todo
*Why:* B-03 slice 1 (D-6): the log box needs to know what the typed line matches.
*Done when:* domain `findInGraph(data, text)` ranks whys and threads (exact, prefix, word-start),
then staged steps (meaningful-word match only), then past activities *in a thread* by recency; the
whole line with every word required; one chip per thread (its step wins); the "doing X?" thread left
out; capped; unit tests incl. `bigBlob` timing under one frame.

### P-26 The log box also finds: quiet row and graph focus `[feature]` `[a11y]` M
*Status:* todo
*Why:* B-03 slice 2 (D-6): find a why, thread or step from the box and see it in the live graph.
*Done when:* on Home only, after 2+ chars and a short settle, up to 3 chips above the box in words
(no symbols, no dates), stable order, no animation, never an empty message; `@` hides the row; a
tap focuses the live graph (P-15) — graph only moves, instant under Reduce Motion — with a "Showing
X · toward … · fed by …" caption in names and a 44 pt "Show all"; Return logs as typed and also
ends focus (after the new link lands); Esc on web only with `@` closed; "All results →" opens Search
and the draft survives; accessible names start with visible text then kind; one match at the
largest text; e2e; axe; 390 px and 200 % text.

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
  **Answered 2026-11-21: go, with the panel's refinements; one-offs via "All results →"; a kept
  line counts as the step (visible chip).** → P-24 (Now), P-25, P-26 (Next, after P-15). B-03 is
  `building`.
- **D-7 The graph is Home** — [B-04](product/briefs/B-04-graph-is-home.md). **Answered 2026-11-22 in
  conversation:** the graph is Home (list → "Wanders" tab, Graph tab removed); first run is a 1-2-3
  (declare an intention → plan its next step → see it); tapping a node gives quick actions at the log
  box; threads are called "wanders". → P-34, P-35, P-36, P-37 (Now).
- **D-8 Naming what it's for** — [B-05](product/briefs/B-05-naming-what-its-for.md): how to name a
  why, link what you already did, and offer a first step (Home with logs, the empty-app 1-2-3, and
  a why's page). Panel run 2026-11-22. **Answered 2026-11-22: go with the panel's combination**
  (start from what you did on Home, the refined 1-2-3, name → step → link everywhere, a why's page; no
  "because…" for now). → P-38 (polish, Now), P-40, P-41, P-42, P-43 (Next).
- **D-9 The intention stack** — [B-06](product/briefs/B-06-intention-stack.md): Home keeps the graph
  on top; under it a stack of "toward" (a flame graph of intentions: the why as the base, the next
  step on top), re-anchored at any level, a pager between sibling chains, and a next-step spotlight
  docked above the log box. Panels and a three-lens research audit run 2026-11-22. **Answered so far:**
  A + C's focus; a why holds its own step; layers are the chain of "toward"; it lives on Home; set it
  down; one home + mirror for two whys; the spotlight shows only what you pick; steps never age; rest
  after a pop; the anchor resets to All; screens without explanations. **Refined through revision 10** (circles, a
  trail of done steps, the wanderer, a quiet "What's next" card with log one tap behind, cold start).
  Owner first said "not yet — keep refining" (revisions 11–12 followed). **Answered 2026-11-22
  (`/product implement`): go, at revision 12.** → P-48 to P-55, with P-19 (chains) before ↓ Smaller.
  P-47 folded into P-48; P-38, P-41 and P-42 superseded (see Cut).
- **D-10 Wanders and Activities as pull-outs** — **answered 2026-11-22 by the owner:** one sheet
  from the bottom (Wanders | Activities), the tab bar removed; logs-only Home shows each log's words.
  → P-57, P-58.
- **D-11 A calmer Home: ＋ to log, quick actions, pulse** — **answered 2026-11-23 by the owner:** a
  round ＋ replaces the What's next / Log toggle (What's next always shown); the log field
  autocompletes past entries and staged steps, and tapping a node attaches; the "Toward something?"
  question is removed; each node has a ＋ and selecting it pops quick actions; a log pulses its
  path; the summary line, button list and "All" go; unattached logs show as loose labelled dots.
  → P-60 to P-63 (supersede P-49's toggle and P-50's "a tap attaches").
- **D-12 Wanderment and Mindstream** — **answered 2026-11-23 by the owner:** Wanderment takes the
  stack: port Mindstream's Focus model as chains (no timers, nodes never done); a companion prompt
  ("what are you up to?") is Wanderment's front door; Mindstream keeps ThinkPad or retires. B-06
  feature work pauses; P-62 parked. → P-64 (brief B-07). See
  `docs/product/discovery/2026-11-23-mindstream-comparison.md`.
- **D-13 B-07: under the night sky** — **answered 2026-11-23 by the owner: go, and reword
  STRATEGY.md's refusal** (→ P-65 to P-70). Brief:
  `docs/product/briefs/B-07-night-sky.md`. Go on slice 1 (the trailhead front door), then 2–6, with
  DESIGN.md's "graph is Home" and Home-capture rules updated? And reword STRATEGY.md's refusal of
  "milestones" to "no schedules, deadlines or progress toward a goal" so landmarks and saved routes
  fit? Recommended: go, and reword.
- **D-14 B-08: constellations** — **answered 2026-11-24 by the owner: go, with changes** (a sticky
  "done" chip for things already done — they light and settle at once, several in a row; pursuits
  rise lit and their glow fades like warmth; kinds fixed plus "write"; a quiet "Toward…"). → P-73 to
  P-77. Brief: `docs/product/briefs/B-08-constellations.md`.
- **D-15 One home** — **answered 2026-11-24 by the owner:** the trailhead and the sky become one
  home (a session is the camera looking up over the same sky); stars at rest faint and unlabelled;
  a session ends by itself after a choice; Map as a signpost by the lantern. Folded into B-08 (→ P-73,
  P-74). Discovery: `docs/product/discovery/2026-11-24-one-home.md`.
- **D-3 Native builds** — start EAS development builds (needs an Expo account) so `[native]` items can
  be verified on devices?

## Known edge cases (accepted for now)

- Import: a backup file with the same JSON key twice keeps the later record silently (JSON.parse
  can't see duplicates; P-04 audit F10).
- Web, desktop: reloading the window in use while a second visible window waits hands the data to
  that window; the reloaded one waits and says so (P-29, audit F7).
- Web: a first launch whose open keeps failing with WebKit's held-file error waits and never falls
  back to localStorage, since falling back over held files could fork the data (P-29, audit F17).
- The thread page's crumb shows no "loaded" state when its step is staged in the log box (the
  Composer's step chip does); its accessible name says what a tap will do.
- Picking an `@` suggestion joins the two sides with exactly one space, so extra spaces typed around
  the `@word` collapse ("a @make    b" → "a b").
- Native only: until the platform reports the selection, the caret after an edit is guessed; with a
  repeated letter ("aab" → "aaab") the guess can be one off, and the next selection event corrects it.
- An old-version tab: entries created there are added here; its edits and deletions are not (the app
  says so).
- Web builds can't detect screen readers, so the toast auto-dismisses after 6 s there (it pauses on
  hover/focus and is announced politely).
- The web crumb's accessible name is its visible text ("learn the F chord Log this"); native gets the
  fuller DESIGN.md sentence.

## Done log

Newest first. One line per batch: date · items · commit.

- 2026-11-24 · P-72 — transitions that move through the picture: looking up sinks the hills and fades the stars in; a star raises its landmarks and walks the wanderer to camp; a trail walks the wanderer up the path; back reverses; Map dims in like dusk; only the picture moves (text and controls never do), never blocks input, ≤ 600 ms; Reduce Motion: none · evidence: `src/domain/passage.test.ts` (18), `e2e/transitions.spec.ts` · audit: 0 reported · 0 reproduced · 0 fixed · 0 deferred (Light tier; tests first, e2e run once at the end) · this commit
- 2026-11-24 · P-71 — brief B-08 "Constellations" written with the owner's landing folded in; mockups G–J; persona panel (6 personas, 3 panelists) synthesized; owner answered D-14 go with changes · evidence: `docs/product/briefs/B-08-constellations.md`, `.polish/product/panel-B-08-{1,2,3}.md` · audit: 0 reported · 0 reproduced · 0 fixed · 0 deferred (docs only) · this commit
- 2026-11-24 · P-65, P-66 (B-07 slices 1–2) — the trailhead is Home: a night sky, "Where are we wandering today?", Return logs at once (loose) with Undo, a quiet "Move it?" (never overwrites a staged step), typing offers "Open <wander>", "I'm not sure" → look up: whys as stars in fixed places at one size, warmth and motes by heat (floor of one), recent loose lines as stray footprints with Move it?; under a star: landmarks in a fixed order, cards that name their wander, trails; a wander's trail: "Here's where we left off", Did it, footprints in words; Esc goes back; the graph moved unchanged to Map, now in the night palette · evidence: `e2e/trailhead.spec.ts`, `e2e/sky.spec.ts`, `e2e/dark-map.spec.ts`, `src/domain/{trailhead,sky,heat}.test.ts`, `src/store/trailhead.test.ts`; specs' entry route `/` → `/map` marked P-65 · audit: 8 reported · 8 reproduced · 8 fixed · 0 deferred (adversarial UI/UX audit, different model, some reasoned rather than reproduced; plus a persona panel on the built screens, all six up to yes / leaning yes; tests written first and run at the end, owner's rule) · this commit
- 2026-11-23 · P-64 — brief B-07 "Under the night sky" (`docs/product/briefs/B-07-night-sky.md`): prompt-first trailhead, whys as stars, wanders as trails with step stacks, camp, routines; persona panel (6 personas, 3 panelists) synthesized; owner answered D-13 go and reworded STRATEGY · evidence: mockups https://claude.ai/artifact/GWjaYybmi4QxeBqTpGeHHp, `.polish/product/panel-B-07-{1,2,3}.md` · audit: 0 reported · 0 reproduced · 0 fixed · 0 deferred (docs only) · this commit
- 2026-11-23 · P-61 — ＋ to log (D-11): the What's next / Log toggle is gone; the What's next card is always shown with a round ＋ that opens the log field; as you type it suggests staged steps ("✓ Clean my car · feel productive": a tap attaches and completes it), past entries (re-attaching their target), then nodes; tapping a node while open attaches; the "Toward something — or just itself?" bridge and the toast's question are removed (toast: "Logged → <node>"); DESIGN.md updated · evidence: `logSuggest.test.ts` (11, 8 mutants killed), `e2e/home-plus.spec.ts` (10), spec updates marked P-61; perf 1.13–1.23× (one 4-worker run 1.33×) · audit: 0 reported · 0 reproduced · 0 fixed · 0 deferred (Light tier, full suite) · this commit
- 2026-11-23 · P-60 — a calmer Home (D-11): no visible summary line, button list or "All" label (circles are the accessible buttons; a list only at the largest text); labels sit below every ring and never overlap; 24 pt header icons with 44 pt targets; with wanders, the last 3 unattached logs (21 days) sit as labelled dots below the graph, a new one glowing, tap to attach or open · evidence: `overview-calm.test.ts` (7), `e2e/home-calm.spec.ts` (12), spec updates marked P-60; perf 1.15–1.22× · audit: 0 reported · 0 reproduced · 0 fixed · 0 deferred (Light tier, full suite) · this commit
- 2026-11-23 · P-58 — Wanders and Activities pull out from Home (D-10): no tab bar; a "Wanders and activities" handle under the slot pulls up one sheet (Wanders | Activities, each with its own log box), drag down / scrim / Close / Esc / Back to put it away; returning from a page keeps it open; /wanders and /activities redirect to it; DESIGN.md updated · evidence: `e2e/home-sheet.spec.ts` (11), `sheet.test.ts` ×2, 38 tab clicks → `openSheet` (P-58 notes); perf 1.14× · audit: 0 reported · 0 reproduced · 0 fixed · 0 deferred (Light tier, full suite) · this commit
- 2026-11-22 · P-57 — logs show their words (owner's screenshot): with no wanders, Home's recent logs are rows, a heat-coloured dot and the log's words (cut short with "…", full text in the name), newest first, each opening its log; no cut-off "Lately" line in that state (the list is named by it for screen readers) · evidence: `overview-home.test.ts` (+4), e2e P-57 tests (4: the owner's two logs at 390 px, long text, 200 %, shading off) · audit: 0 reported · 0 reproduced · 0 fixed · 0 deferred (Light tier) · this commit
- 2026-11-22 · P-50 — tap to focus, swipe to move, tap to narrow (B-06 slice 3, D-9): one ink ring marks focus, only the focused node's step is drawn (dot or dashed ＋), a tap also attaches the next log (visible chip, one log); swiping the card (or ‹ ›, arrow keys, screen-reader actions) moves focus between chains without attaching or zooming; tapping a focused parent narrows to its subtree with "‹ All · <node>", Esc/Back to go up; focus persists after a log; the "Toward X" row removed; DESIGN.md updated (D-9) · evidence: `focus.test.ts`, store `focus.test.ts`, `e2e/home-focus.spec.ts` (10), act-from-node rewritten; perf 1.12–1.19× · audit: 0 reported · 0 reproduced · 0 fixed · 0 deferred (Light tier, full suite) · this commit
- 2026-11-22 · P-56 + CI fix — CI red since P-48: the build job's overview time test read the wall clock for heat (fixed in 9906c09, which also unblocked P-49's deploy); two e2e flakes were real app bugs: the first-run step mounted twice for a moment as the picture caught up, wiping anything typed (HomeGraph now renders the step/offer in one fixed place), and on web a stray blur after Return could send the next line nowhere (`blurOnSubmit={false}` on the log field) · evidence: new tests in `e2e/first-run.spec.ts` and `e2e/capture.spec.ts` (each failed 5/5 before), the two flaky specs 360/360 repeats under load, verify --full · audit: 0 reported · 0 reproduced · 0 fixed · 0 deferred (Fix lane, Light) · this commit
- 2026-11-22 · P-49 — Home's bottom is one slot with two faces (B-06 slice 2, D-9): a [What’s next | Log] toggle; What’s next · <node> shows its step and ✓ (logs it as typed, Undo) or “＋ add one” (inline); the node is the selection, else the wander last logged toward, and is never attached; Log is the box with one ↑ send; it opens on What’s next, flips back after a log, starts on Log with no wanders; on web typing switches to Log and Esc goes back; “Reconnecting…” shows on both faces; DESIGN.md capture rule updated (owner-approved, D-9) · evidence: `slot.test.ts` (8), store `slot.test.ts` (4), `e2e/home-slot.spec.ts` (10), fixtures switch Home to Log before logging; perf 1.08–1.20× · audit: 0 reported · 0 reproduced · 0 fixed · 0 deferred (Light tier, full suite) · this commit
- 2026-11-22 · P-48 — Home's graph as heat circles and branch lines (B-06 slice 1, D-9): circles sized by level, declared whys double-ringed, each circle coloured by heat (the warmth of the newest activity on it or anything feeding it, cycle-safe, never a sum; neutral with shading off), tapered gradient branches that never share an end point, no widths from counts (`linkWidth` gone, P-47 folded in), no dots once wanders exist, labels ≥ 4.5:1; DESIGN.md's graph rule updated (owner-approved, D-9) · evidence: `heat.test.ts` (13), `overview-circles.test.ts` (13), `e2e/home-heat.spec.ts` (4), six old-visual assertions updated with P-48 notes; perf 1.18–1.19× vs base 1.15–1.25× · audit: 0 reported · 0 reproduced · 0 fixed · 0 deferred (Light tier) · this commit
- 2026-11-22 · P-04 — import checks the file strictly (arrays, duplicate ids incl. "constructor", a newer version, wanders whose names `@` can't tell apart — refused, naming them), then shows a preview (what it holds, what changes, empty-backup warning with Cancel first, "matches what's here", "can't be undone yet"); Replace re-checks against what's here; reachable on native; focus and announcements; the keep-the-dots item was built but pulled for the perf budget (branch `p38-keep-dots`) · evidence: `import.test.ts` (21), `persistence.test.ts` P-04 (6, 5 mutants), `useStore.test.ts` (replace clears the toast), `e2e/import.spec.ts` (10), `e2e/a11y.spec.ts` (preview) · audit: 17 reported · 10 reproduced · 13 fixed · 5 deferred · `144e12e`, `df9351d`, `9b2d459`
- 2026-11-22 · P-35, P-36 — act from a node: tap a wander → "Toward X" above the log box, "↳ Log next step" logs it in one tap (a typed line is kept and counts as the step), typing logs toward it via a visible chip, Open/×; the selection lasts one log; the list under the graph selects too · first run 1-2-3 on an empty app: a feeling or reason ("feel productive"), one next step ("read a book", it can wait), then see it — one Skip ends it, logging ends it for good · a flaky tab-switch race fixed in e2e (`toHome`) · evidence: `select.test.ts` ×2, `firstRun.test.ts`, `persistence.test.ts` (P-36), `e2e/act-from-node.spec.ts` (9), `e2e/first-run.spec.ts` (7) · audit: 0 reported · 0 reproduced · 0 fixed · 0 deferred (Light tier) · `3da27dc`, `e4e0b88`
- 2026-11-22 · P-34, P-37 — the graph is Home (owner D-7): whys, wanders and recent logs fill the first screen, with no threshold (logs alone show as dots, "+ What's it all for?" with "Not now"), staged steps as a quiet line, the summary visible, a list of what's in the picture for keyboard/screen reader/large text; the list moved to a Wanders tab; Graph → Explore; threads are called wanders everywhere you read or hear them · evidence: `e2e/home-is-graph.spec.ts` (50/50 ×5), `overview-home.test.ts`, `persistence.test.ts` ("Not now", 4 mutants red), perf 1.10×, screenshots · audit: 0 reported · 0 reproduced · 0 fixed · 0 deferred (Light tier, no audit) · `be7ad65`
- 2026-11-22 · P-33 — graph follow-ups: the newest log's dot is marked so every log visibly lands; Search/Settings fit the header at 280–320 px; whys keep the picture full; an honest, serial perf check (limit 1.25×, a 15 ms-slower mutant reads 1.49×); test-only switch and unused flow-index fields removed; DESIGN.md says what ships · evidence: `overview.test.ts` (28/28 mutants killed), `e2e/home-graph.spec.ts`, `e2e/home-graph-perf.spec.ts`, full suite ×10 = 1410 passed · audit: 10 reported · 10 reproduced · 9 fixed · 1 deferred (200 % zoom: the first crumb ends 6 px under the log box — superseded by the graph-as-Home layout) · `c83282c`
- 2026-11-22 · P-30 — a refresh shows the new version: right after opening, refreshing or returning, a newer version loads by itself (data released first, draft kept); after typing or 10 s the banner asks; one automatic update per version; Settings shows the version and "Check for updates" · evidence: `update.test.ts`, `e2e/update.spec.ts` (9), `e2e/pwa.spec.ts`, `e2e/handoff.spec.ts` update tests ×5 · audit: 0 reported · 0 reproduced · 0 fixed · 0 deferred (light tier: the batch audit runs with P-33, fixed forward) · `fcf7014`
- 2026-11-22 · P-15 — Home opens with a live graph: your threads, recent logs as dots linked to every thread they name (owner: activities as dots), doing → to links as lines, declared whys first, nodes that stay put, "and more" instead of numbers, one accessible summary · evidence: `overview.test.ts` (38, 25/25 mutants killed), `e2e/home-graph.spec.ts` (incl. owner-style logging, perf ≤ 1.10× without the graph), `e2e/a11y.spec.ts`, screenshots · audit: 16 reported · 12 reproduced · 14 fixed · 2 deferred (long-name ellipsis, unused flow-index fields; re-audit of the rework still running — findings fixed forward) · `d2423fe`, `c55e96d`
- 2026-11-22 · P-29 — never locked out by another copy of the app (owner's iPhone report): WebKit's held-file error recognised; a waiting screen that opens by itself; a page holds the data only while visible and takes it back when shown (reloading what other tabs saved, keeping the draft); a page that doesn't hold the data can't change it; Return while reconnecting logs once; take-back never drops unsaved changes · evidence: `opening.test.ts`, `rebase.test.ts`, `field.test.ts`, `persistence.test.ts` (P-29 describes, mutation-checked), `e2e/handoff.spec.ts`, `e2e/storage.spec.ts`, `e2e/a11y.spec.ts` · audit: 49 reported · 34 reproduced · 37 fixed · 12 deferred (4 rounds; a follow-up data item, the cold-start item, accepted edge cases) · `a4a8f7b`, `427e262`…`911588a`
- 2026-11-21 · P-14 — a thread can be marked as what it's for (`declaredAt`, SQLite migration 2, additive; backups stay version 1 and carry it), at most three, a fourth offers a swap, hiding unmarks; plus the owner's no-keyboard-on-touch fix for the bridge · evidence: `whys.test.ts`, `storage.test.ts` (schema 2), `persistence.test.ts` (6 mutants red), `useStore.test.ts`, `e2e/why.spec.ts`, `e2e/bridge.spec.ts`, `e2e/a11y.spec.ts`, upgrade/downgrade probed in Chromium · audit: 14 reported · 9 reproduced · 7 fixed · 7 deferred (four to a new zoom item; Android double announce and coarse-pointer keyboard focus accepted; toast wording) · `04f6760`, `a5032c4` + audit fixes
- 2026-11-21 · P-13, P-24 — after a log with no thread, Home asks "Toward something — or just itself?" (chips, + name it, Just itself; ignoring writes nothing); "Log this" keeps a line you've started and marks it as the step with a removable chip, and never clears a step edited since it was loaded · evidence: `bridge.test.ts`, `useStore.test.ts`, `loadNext.test.ts`, `persistence.test.ts`, `e2e/bridge.spec.ts`, `e2e/log-this.spec.ts`, `e2e/a11y.spec.ts`, screenshots · audit: 14 reported · 9 reproduced · 11 fixed · 3 deferred (iOS toast to a new item; keyboard-on-focus to the owner; two small test gaps) · `ac866f0`, `2a4b039` + audit fixes
- 2026-11-21 · P-01, P-02, P-03 — the browser is asked to keep the data (Settings says whether it promised); renaming to a taken name is refused inline, with Cancel/Esc; `@` works at the cursor and a pick never deletes a typed word · evidence: `persistent.test.ts`, `compose.test.ts`, `domain.test.ts`, `e2e/persistence.spec.ts`, `e2e/mention-caret.spec.ts`, `e2e/editing.spec.ts` · audit: 13 reported · 8 reproduced · 10 fixed · 3 deferred (to new items and the import item) · `e2cdbb1`, `6a35eec`, `845724a` + audit fixes
- 2026-11-21 · Adversarial audits ×2: data-safety, undo, perf (log on Activities 28 s → 0.1 s),
  attach mode, a11y fixes · `5f16188`, `f3dde4b`
- 2026-11-21 · M4 Graph + attach mode · `e746e89`
- 2026-11-21 · M3 Emergence: pull-in, value headers, search · `14e6678`
- 2026-11-21 · M2 Hardening: SQLite, native backups, edit/delete, composer keys, accessibility · `91a6570`
- 2026-11-20 · M1.5 Installable offline PWA, e2e in CI · `7dbabba`, `a3ccbf3`
- 2026-11-20 · M1 Capture: threads, crumbs, activities, settings · `cfdb1e4`

## Cut on purpose

Merge threads, pinning. Don't build them.
- Superseded by B-07 (D-13, 2026-11-23): B-06's remaining slices P-51–P-55, P-59, P-63; P-62
  (quick actions on a node; patch kept at `docs/product/parked/P-62-quick-actions.patch`); P-16,
  P-19 (folded into P-67), P-20, P-21, P-43.
- P-38 (keep log dots) and P-41/P-42 (B-05's link and offer flows): superseded by B-06 revision 12
  (energy shown as heat, no dots; Log face attach; ＋ node; the cold start), 2026-11-22.
(Splitting next steps into hidden "then" pieces was cut here too; **D-5 reversed it** in a narrower
form: one staged step that can hold a smaller step "toward" it — see B-02.)
