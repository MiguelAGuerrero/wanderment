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
- Rules every item must respect: [`DESIGN.md`](DESIGN.md) — especially the *never* list (streaks,
  deadlines, notifications, tallies of what you did, anything that shows how much is left, anything
  created without a tap) and "no instructional or explanatory text".
- **The app changed on 2026-11-25** (P-89): the old app is retired and the repository now holds the
  runbook app designed in `docs/product/briefs/B-11-context-stacks.md`. Items that only concerned the
  old app were closed as superseded then, not done: the old home's cost with a large history, kinds
  and constellations, step stacks, camp, desire paths, the B-07 cleanup, screens without explanations,
  naming copy, the thread page at 200 %, the exact `@` match, live animation, the first-step question,
  find in the graph, the log box's finds, backdating, and search that shows why it matched.

## Inbox

_Empty. Write here — one line is enough._

## Now

### P-94 Home is one standing queue: line up work and run it `[feature]` `[data]` `[ux]` `[a11y]` L
*Status:* in-progress
*Why:* owner (owner-notes 2026-11-25): home "just start[s] a whole bunch of things … It's just a search
box … I'm going to queue up work and run it." D-20 go.
*Design:* Home is one standing queue (owner, 2026-11-25: "I'm going to queue up work and run it"; proposal
accepted with "Implement"). One queue, always there, no session start or end, nothing expires. The top
row is what is running or next, with the one filled button (Resume / Start <name>); below, up next in
order; a wait keeps its place and reads "waiting for …". "+ Add to the queue" at the bottom searches
routines or makes a new one and adds it at the bottom. Done on the top item brings up the next; nothing
starts by itself. Pause keeps the item where it is; tapping another row brings it to the top and the one
you left sits directly under it. Taking an item off asks first and has Undo; the routine stays. No name
on the queue. The tile grid becomes "Your routines", reached from the add row. Plan is unchanged; a
queued routine not yet started has Plan on its menu. Move up / Move down on a row's menu (no drag).
Existing paused runs enter the queue, most recent first; the retired app's data is untouched. **One-off
tasks** (owner, same day): words that match no routine offer first "Add: <words>" — one unnamed step,
queued at the bottom, Return's default — then "New routine: <words>"; a one-off leaves the queue when
done and never shows in Your routines; Plan on it can add steps; naming it keeps it as a routine.
*Done when:* the queue's order is stored (Full tier: survives reload, journal replay, the fallback,
hand-over, export and import; data from the previous build loads, its paused runs queued most recent
first, nothing lost or converted); home shows the queue as above with one filled button; add, take off
(with Undo), move up / down, switch (the left one directly under), Done → next shown not started; Your
routines lists every routine with Start / Plan / Add to the queue; the e2e go-* specs cover each; DESIGN.md
§6 met; DESIGN.md and README describe what is built.

### P-91 Erase everything `[data]` `[feature]` S
*Status:* todo
*Why:* B-11 lists Erase in Settings, but it has never existed; split out of P-89 as a new destructive
feature.
*Done when:* Settings offers Erase everything behind a confirm that offers Export first, with Cancel as
the filled button; it clears every collection through the journal and survives a reload; whether the
five frozen settings flags reset is decided; tests through the real persistence module.

### P-92 The app's own states in the new look `[ux]` `[a11y]` S
*Status:* todo
*Why:* after the old app's retirement (P-89 audit) the opening, blocked-storage and waiting screens are
still light, with 44 px targets and 13–15 px text, against DESIGN.md's ≥ 48 px and ≥ 16 px.
*Done when:* those screens and the update banner use the new look and meet the size rules; their specs
assert 48; nothing about their behaviour changes.

### P-87 The new app's first slice, after its panel `[ux]` `[a11y]` M
*Status:* todo
*Why:* the persona panel on the built slice (`.polish/product/panel-P-86-{1,2}.md`, from screenshots) and
the audit's deferred notes. All six personas read the edge of a goal as a stall: an empty note, two
dimmed buttons, and Done — the only way out — the smallest control on screen. Dimmed Resume / Start on
home while something runs read as dead buttons. The Keep sheet shows no way to decline. At 200 % text the
context line truncates to "Appl…", losing the wider context. Nothing has been checked on a real phone
or with a screen reader.
*Done when:* at the edge, the forward slot reads Done while the note is empty and Next once it has words
(the three places never move); on home while a run is running the other tiles carry no dead buttons
(tapping one offers to pause the running run first, or their buttons are absent); the Keep sheet has a
visible "Not now"; the "Stop <name>?" confirm uses one verb; the context line wraps at large text and
never truncates the level you are in; a wrapping notice never moves the note; since-when is consistent
("since Tuesday" within a week, otherwise a date); one real pass on a phone (keyboard up, large text)
and with a screen reader, its findings fixed or filed; e2e for each.

### P-05 Prove it in Safari and Firefox `[platform]` M
*Status:* todo
*Why:* storage relies on expo-sqlite's async API working without COOP/COEP and on OPFS; that's only
verified in Chromium. Installed-on-iPhone use means Safari is the main browser.
*Done when:* CI runs the e2e suite on WebKit and Firefox too (or a documented subset where a browser
genuinely lacks a feature); any browser that can't run SQLite lands in the fallback path, tested.

## Next

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

## Later

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
- **D-16 B-09: the home — a live map above, the prompt below** — **answered 2026-11-24 by the owner:
  go** (feed: a random few drawn once a day; last three weeks, a calm sky beyond; Map's depth into the
  lit map and the sheet) → P-79 to P-83. Brief:
  `docs/product/briefs/B-09-home-live-map.md` (UI audit and panel folded in).
- **D-17 B-10: fewer parts — a calm journal in a playful world** — superseded 2026-11-24 by B-11
  before a decision. Brief: `docs/product/briefs/B-10-refined-home.md`.
- **D-20 Home is one standing queue** — **answered 2026-11-25 by the owner: go** ("Implement", on the
  proposal recorded in owner-notes) → P-94. No separate brief; the item carries the design.
- **D-19 B-12: plan and run look different** — **answered 2026-11-25 by the owner: go on the Plan
  surface now** (a change made in Plan changes the routine; the other open questions take the brief's
  defaults); declaring a routine in context, shared routines and inputs get another draft first → P-90.
  Brief: `docs/product/briefs/B-12-plan-and-run.md`.
- **D-18 B-11: your ways of doing things, run one step at a time** — **answered 2026-11-24 by the
  owner: go** (the first implementation: groundwork, then home, the runner and Break it down, alongside
  today's home) → P-85, P-86. Brief: `docs/product/briefs/B-11-context-stacks.md` with
  `B-11-journeys.md` and `B-11-capabilities.md`; mockups `.polish/product/b11-r2-final/`.
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

- 2026-11-25 · P-93 — Plan on a phone: while the keyboard is up, the notice and Resume / Start move below the rows instead of sitting over them, and after every add or edit the list scrolls so the field and the step just added are in view; the add row has a leading + and "Add a step", and its ↵ became the word Add (shown when there are words). evidence: `e2e/go-plan-keyboard.spec.ts` (keyboard at 45 % of the height, 390×844 and 200 % text, adding and rewording mid-list; 5 of 5 red before, green after), go-plan, go-a11y, go-home specs, `verify.sh`; not checked on a real iPhone. audit: 0 reported · 0 reproduced · 0 fixed · 0 deferred.
- 2026-11-25 · P-90 — the Plan surface: planning and running are two surfaces. The runner's middle button is Plan (Step in on a routine); Plan is a light pinned band with PLAN and Home, the routine's name, "planning · at <step>", rows with HERE, a movable "Repeat from here" (one press, one row), Add a step, a step menu in words, Undo after every edit, and one filled button Resume at <step> / Start; the edge of a goal is Plan with Done; a change made in Plan changes the routine and repairs every open run in the same write; home tiles show the mode and a New tile; creating makes a routine and no run; See it all, the plain editor, the break-down sheet, Keep and this-run-only edits are gone; runs from the previous build with this-run changes are folded into the routine on first opening Plan, with Undo; an engine bug that could leave a run inside a removed step fixed; no migration, backup format unchanged. evidence: golden fixture written by the previous build, 674 unit tests (mode table, repair table, fold, fuzz), 76 mutation checks, `e2e/go-plan.spec.ts` and the rewritten go-* specs, the auditor's byte-equal check of the retired app's data, `verify.sh --full`. audit: 10 reported · 5 reproduced · 7 fixed · 3 deferred.
- 2026-11-25 · P-89 — the old app is retired: 112 files deleted (14 routes, 27 components, 22 domain modules, 29 unit test files, 20 specs); every old address lands on the new home; Settings moved into the new app (dark) with Export, Import and its preview, where the data lives and the version, and a line saying earlier data is kept when there is any; the import confirm now has Cancel filled and first; no stored data deleted or converted — wanders, activities and the five settings stay in the database, the journal, the fallback, export and import; DESIGN.md, STRATEGY.md, the README, CLAUDE.md, the skills and agents rewritten for the app that is here now; 18 roadmap items that only concerned the old app closed as superseded. evidence: golden fixtures written by the two previous builds (`src/storage/golden.test.ts`, 21 tests, green through every step), a guarantee table mapping each removed storage test to the one that now proves it, 568 unit tests, the whole e2e suite (200 passed), the auditor's own base-build data loading deep-equal and a real old-build tab beside a new one, load with 4,000 lines unchanged, `verify.sh --full`. audit: 9 reported · 4 reproduced · 6 fixed · 3 deferred.
- 2026-11-25 · P-88 — the new app opens by default: `/` (and the installed icon) lands on the new home, opening where you left off when a run is in progress; the old home moved to `/old` with everything in it working as before, and its own home links (sheet close, Back fallbacks, the history mark) stay inside it; the new home keeps its "Back to Wanderment" button, now pointing at `/old`. evidence: new spec `e2e/go-default.spec.ts` (20 tests, failing before the change), 13 old spec files repointed (start address and old-home URL only, nothing removed), the whole e2e suite twice (364 passed), 1007 unit tests, `verify.sh --full`. Light tier (routing): no separate audit. audit: 0 reported · 0 reproduced · 0 fixed · 0 deferred.
- 2026-11-24 · P-86 (B-11 slice 1) — the first usable slice of the new app, on its own route `/go` beside today's home (one added row in today's sheet, "Run a routine"): home as tiles with "I'm going to…" searching them and "New: …"; a pure engine (run + verb → run) with a tolerant reader; routines with steps, wait steps and the Repeat divider (until I'm done / a number); the runner — context line with Done, the sticky note, Pause · Break it down / Step in · Next, the last-step mark, notices with Undo; the pull-up panel (round, then, Back to, Jump to…, Change the words, See it all, Keep in); Break it down for this run with Keep; the edge of a goal asking for the next small step; leaving a level offering this run's changes; Pause with a reason, the paused screen, Home asking first; "waiting for … · since"; See it all, Jump to…, a plain routine editor; one pressed verb queued while a tab reconnects. evidence: 1006 unit tests (228 new; every row of the execution table, a random-walk fuzz, persistence round trips), new e2e specs `e2e/go-*.spec.ts` for J01–J05, J10, J29, J34–J39 and an accessibility pass, the builder's screenshots in `.polish/archive`, `verify.sh --full`. Not verified: native, a real phone keyboard and real text scaling (web only, by window size); single-letter shortcuts were removed pending a settings switch. audit: 23 reported · 18 reproduced · 19 fixed · 4 deferred.
- 2026-11-24 · P-85 (B-11 groundwork) — storage for any kind of record, no visible change: one list of collections drives the journal, undo, the localStorage fallback, tab hand-over, load / save / replace, export and import; backup format 2 is always written and format 1 still imports (a newer one is refused); migration 4 adds `routines` and `runs` tables only, nothing converted; strict import refuses a format-2 file missing its routines or runs; ids that are method names can now be deleted; the import preview names routines and runs. evidence: 778 unit tests (64 new, written first and shown failing before the change), a differential fuzz against the previous code identical for wanders and activities, a real schema-3 → 4 upgrade with a pending old-format journal, load with 4,000 activities unchanged (~870 ms), `verify.sh --full`. Known and accepted: once migration 4 has run, an older build shows its blocked / reload screen, so the deploy cannot be reverted. audit: 13 reported · 3 reproduced · 7 fixed · 6 deferred.
- 2026-11-24 · P-79, P-80, P-81, P-82, P-83, P-84 (B-09) — the home: the composer at the bottom ("I'm not sure" beside the field, the question a small heading, suggestions and the done chip above the field); above it a live map — a random few of the last three weeks' lines, drawn once a day, words and when in words, a calm sky beyond; "I'm not sure" lights the map in place (whys and wanders as nodes, routed links, nothing moving); attaching lands visibly in its node; the grabber (tap or swipe) opens the sheet with a visible Close and Explore / Settings / Export, and its search lights the matching stars above; the graph Map retired (`/map` → the lit home) · evidence: `src/domain/{feed,litMap,searchSky}.test.ts`, `e2e/{live-map,lit-map,attach-lands,home-sheet}.spec.ts`, whole suite 242 passed; UI audit before building (`docs/product/briefs/B-09-home-live-map.md`) · audit: 72 reported · 72 reproduced · 72 fixed · 0 deferred (the end-of-run full e2e run; one app bug — Back closing the sheet after reopening an activity — the rest specs moved off retired Map behaviour) · this commit
- 2026-11-24 · P-78 — CI pre-gates (owner: "Deploys are failing. Ensure we have proper CI pre-gates"): the deploy now waits for the whole e2e suite (`needs: [build, e2e]`), so a red or flaky run never publishes; `scripts/polish/verify.sh` adds an "e2e-ci-like" pass — the changed specs again at CI CPU speed (`E2E_SLOW=4` via `e2e/fixtures.ts`, 2 workers, no retries) — so timing races fail before the push; the two CI flakes fixed at the cause (sky fix 11 measured while landmarks rose; one-home's 4,000-line load outlasted the default wait — noted on the per-log-cost perf item) · evidence: both specs 3/3 at E2E_SLOW=4, retries off; `.github/workflows/deploy-web.yml` · audit: 2 reported · 2 reproduced · 2 fixed · 0 deferred (CI run 45316632032) · this commit
- 2026-11-24 · P-74, P-73 (B-08 slices 1–2 with D-15) — one home: the sky is drawn once; at rest your recent lines are faint unlabelled stars (last ~60 days or ~12 lines; never dimmed by absence), whys brighter guiding stars, Map a signpost; "I'm not sure" or a star tilts the camera up into a session over the same sky (the sky, a why's wanders, a trail), which ends by itself after a choice, or by Esc, Back, a swipe down or tapping the ground; `/sky`, `/star`, `/trail` open it tilted. The rise: Return saves the line as typed and lifts it as the session's heading — a lit pursuit with ✦ Done it, ↳ First step, Toward… and Undo of the Return; the sticky done chip lights and settles lines at once; Undo carries into the toast when a session ends; "Kept, loose · Move it?" retired; a lit glow fades like warmth; additive `lit`/`settledAt` (migration 3; old lines read settled) · evidence: `src/domain/{home,rise}.test.ts`, `src/store/trailhead.test.ts`, migration/persistence/import tests (mutation-checked), `e2e/{one-home,rise,trailhead,sky,transitions}.spec.ts`; old-release migration checked by the auditor · audit: 9 reported · 7 reproduced · 8 fixed · 1 deferred (F8 accepted: an old-release tab rewriting a line resets lit to settled, no text lost) · this commit
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
