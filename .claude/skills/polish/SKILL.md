---
name: polish
description: Refines Wanderment's existing features — benchmarks a feature area against what similar apps' users expect (UI/UX conventions, quality of life), turns gaps and the owner's annoyances into Refine-lane items, and builds them in small audited batches; also fixes reliability and data issues at full rigor. Growing the app with new features is /product's job. Run it with /polish, /polish <feature area> (benchmark then refine it), /polish P-## (named items), or /polish inbox.
argument-hint: "[<feature area: capture, home, threads, activities, search, graph, settings, onboarding> | item ids like P-03 | inbox]"
disable-model-invocation: true
---

# Polish — refine what exists, one batch end to end

**Your job is the Refine lane:** make the features Wanderment already has feel right — what people
who use similar apps expect from the UI and the interaction, quality of life, edge cases,
accessibility — plus the **Fix lane** (data loss, lockouts, red CI) at full rigor. You don't add new
capabilities; that's `/product` (the Grow lane). A gap that would need a new capability becomes an
Inbox note for `/product`, not a polish item.

You are the **orchestrator**: you hold the plan, talk to the owner, run the gates and judge
results. Fresh subagents scout, build and audit. Their detailed output goes to files in the batch
folder, and you pass files between them, not your paraphrase. One run = one batch, landed on `main`.
Runs only when the owner starts it.

`/product` reuses Phases 3–7 below (the build pipeline) for its features. When it does, it passes
the item ids, owns the conversation with the owner, and writes the report — so skip Phase 8 and
hand back after Phase 7.

**Lanes in `docs/ROADMAP.md`:** items tagged `[feature]` are Grow (`/product`'s); everything else is
Refine or Fix (yours). With no argument, take only non-`[feature]` items.

`docs/ROADMAP.md` is the shared surface with the owner: they steer by editing it (the Inbox,
ordering, decisions), you report by updating it. Respect their ordering and never silently drop or
reword their Inbox entries.

## What's enforced by code, not by this text

- `scripts/polish/verify.sh` is the definition of done. It runs test integrity, unit, typecheck,
  lint, roadmap lint, build and e2e, writes logs to `.polish/logs/` and prints a short summary. On a
  full pass it stamps the exact tree it verified.
- The git guard hook (`.claude/settings.json` → `scripts/polish/guard-git.mjs`) blocks pushes of
  anything but the stamped tree, force-pushes and `--no-verify`.
- `scripts/polish/land.sh` commits, re-checks the stamp, pushes and archives the batch folder.
- CI re-runs everything on `main` before deploying. Playwright fails CI on flaky tests.
- `scripts/polish/check-tests.sh` lists every weakened, edited or deleted test, and fails on `.only`.

Run these scripts as they are; don't re-implement their steps by hand. Read their summaries, and
open a log file only when a step fails.

## Rigor by risk (owner, 2026-11-22)

Every item gets one of two tiers. Write the tier in `batch.md` next to the item.

| | **Light** — UI, copy, layout, interaction | **Full** — `[data]`, storage, sync/lifecycle, migrations, anything that could lose or lock out data |
|---|---|---|
| Scout | Only if the cause is unclear; otherwise localize it yourself | One `polish-scout` (plus research when the platform behaviour is unknown) |
| Contract | Short: the roadmap's *Done when* plus decisions (5–15 lines) | Full contract |
| Build | Builders in parallel when files are disjoint (`isolation: "worktree"`, each with its own `E2E_PORT`) | One writer at a time |
| Verify per item | `verify.sh` once | `verify.sh --repeat-changed=5` + the mutation checks the contract lists |
| Audit | **One per batch**, default model | One per batch, a **different model**; re-audit after a rework |
| Budget | Up to 5 S/M items per batch | Up to 3 items or one L |

When in doubt, it's Full. A Light item that turns out to touch stored data is re-tiered, and that's
written down.

## Ground rules

- Read `CLAUDE.md`, `AGENTS.md`, `docs/DESIGN.md` and `docs/ROADMAP.md` first, every run.
- `DESIGN.md` outranks this skill and the roadmap. Ask the owner before adding goals, streaks,
  % complete, timers, notifications, badge counts, or anything that creates a thread or attaches an
  activity without a tap. Those are the product's refusals, and keeping them is the point. Capture
  must never get slower, stricter or more interruptive.
- Expo SDK 58: use the versioned docs (see `AGENTS.md`). If `npx expo install` can't reach the
  network, pin the version from `node_modules/expo/bundledNativeModules.json`.
- Budget: by tier (above), and at most 4 subagents running at once. Finishing beats starting.

## Phase 0 — Orient

1. `git status` is clean and `main` matches `origin/main`, or stop and tell the owner.
2. Resume or start the batch. `scripts/polish/start-batch.sh <ids>` exits 3 and prints
   `.polish/current/batch.md` if a batch is already in progress. Resume from its phase checklist
   instead of starting over.
3. `export POLISH_BASE=<base commit from batch.md>` for every later script call.
4. Baseline: `scripts/polish/verify.sh`, the full run. If it's red, the batch is "make it green"
   and nothing else. Don't inherit breakage.

Tick the phase checklist in `batch.md` as you go. Record every decision and every failed approach
there as well: it's how a fresh session (or a later builder) picks up without guessing.

## Phase 1 — Triage the Inbox

Turn each Inbox entry into one of:
- a roadmap item (next free `P-##`, `*Status:* todo`, *Why*, *Done when*, size, tags), placed by
  priority;
- part of an existing item;
- an entry under **Decisions needed 🙋**, if it conflicts with DESIGN.md or is a product call.

Clear an entry only once it lives elsewhere. Anything that loses or corrupts data goes to the top of
Now. Run `node scripts/polish/roadmap-lint.mjs`.

## Phase 1b — Benchmark a feature area (when given one, or when the Refine lane is empty)

1. Pick the area (the argument, else the one with the oldest benchmark in `docs/product/discovery/`,
   else the one the owner's notes complain about).
2. One `product-scout` with `benchmark-brief.md`: how 3–5 similar apps (journaling, lifelog,
   habit-free trackers, quick capture, notes) handle that area's everyday moments, and what their
   users take for granted. It also walks Wanderment's current screens for that area (screenshots).
3. Curate into `docs/product/discovery/refine-<area>-YYYY-MM-DD.md`: each convention with sources,
   Wanderment today, the gap, and a verdict — *adopt* (fits DESIGN.md), *adapt* (with the change),
   *refuse* (with the rule), or *grow* (needs a new capability → an Inbox note for `/product`).
4. Each *adopt/adapt* gap becomes a Refine-lane item (no `[feature]` tag), ordered by how often
   the moment happens. Then choose the batch from them.

## Phase 2 — Choose the batch

With no argument, take non-`[feature]` items from the top of Now, skipping `blocked` ones. Fix-lane
items (data loss, lockouts, red CI) always go first. Within the budget, set
each chosen item's status to `in-progress`. Check dependencies: items touching the same files or
state are built by one builder in a stated order, or split across batches.

## Phase 3 — Scout, scaled to the item

| Item | Scouting |
|---|---|
| Light tier, cause clear | None. Localize it yourself (a few greps), then write the short contract. |
| Light tier, cause unclear; any Full tier | One `polish-scout`. |
| Full tier on a platform whose behaviour can't be run here (e.g. WebKit) | One `polish-scout` plus one research scout, in parallel. |

Launch all scouts **in one message**, so they run in parallel. Each brief is `scout-brief.md` with
the blanks filled, including the output path `.polish/current/P-##/scout.md`. Scouts return only
that path and a ≤2k-token summary.

Read-only check: run `scripts/polish/tree-hash.sh` before launching scouts and after they return.
If the hash changed, a scout wrote files. Restore them (`git checkout -- . && git clean -fd`, after
looking at what changed) and note it in `batch.md`.

Read the scout files critically:
- keep reproduced facts;
- treat speculation as a hypothesis;
- treat a scout's "not a bug / already fine" verdict as a claim to check yourself, not a reason to
  drop the item.

If a scout says an item is hours of work rather than minutes, split it in the roadmap now and build
only the first part.

## Phase 4 — Contract, then the owner (at most once)

For each item, fill `.polish/current/P-##/contract.md`: approach, done-when (each line becomes a
test or a recorded check), must-handle states, non-goals, and where expected values come from. The
contract is what builders build and what the auditor grades. It never contains the builder's own
story.

Ask the owner (one `AskUserQuestion`, ≤ 4 questions, recommended option first) **only** for:
- visible UX choices with real trade-offs;
- anything near a DESIGN.md rule;
- anything irreversible for people's data;
- a new dependency with native code;
- a scope change.

Everything else you decide and proceed: implementation, test design, naming, ordering. Record the
answers in the contracts.

## Phase 5 — Build

Light tier with disjoint files: builders in parallel, each with `isolation: "worktree"`, a
`node_modules` symlink to the main checkout, and its own `E2E_PORT`; merge them one at a time with
a verify between. Otherwise one `polish-builder` per item, **sequentially** on the main checkout.
While anything verifies in the main checkout, don't edit it (verify refuses a tree that changed). Its prompt is `build-brief.md`
with the blanks filled: the contract path, the scout file path, and `.polish/current/decisions.md`
(earlier builders' decisions, which this builder must follow or explicitly revisit).

Parallel builders are allowed only for items with disjoint files. Each runs with
`isolation: "worktree"`, and you integrate their work one at a time with a full verify between them.

After each builder:
1. Check its status line: DONE, BLOCKED or FAIL.
2. Look at the diff yourself (`git diff --stat`, then the risky parts).
3. Run `scripts/polish/verify.sh` (Light) or `scripts/polish/verify.sh --repeat-changed=5` (Full).
4. Look at the screenshots the builder saved, at 390×844, plus 200 % zoom for `[a11y]`.
5. Commit the item locally: `git commit -m "Polish(P-##): …"`. This gives one revertable commit per
   item. Don't push yet.

Corrections go back to the same builder via SendMessage, at most **twice**. If it still fails, start
a fresh builder with a rewritten brief that names what went wrong. A third round in the same context
rarely recovers. If an item is BLOCKED or fails twice from scratch, set it to `blocked` with the
reason, and drop it from the batch.

## Phase 6 — One independent audit

Exactly one `polish-auditor`, after all items are built. Its prompt is `audit-brief.md` with the
blanks filled: the contract paths, the batch base commit, and the output path
`.polish/current/audit.md`. Run `scripts/polish/check-tests.sh` and include its output. Don't
include the builders' reports or your opinion.

Choose the auditor's model by risk:
- **Batches with a Full-tier item:** audit with a different model from the builders, and audit
  again after a rework that changes the design. Pass the Agent
  `model` override, e.g. `fable` when the session runs Opus, `opus` otherwise. A different reviewer
  is the only kind of second opinion the evidence supports.
- **Other batches:** leave the model at its default.

Take the tree hash before and after, as in Phase 3.

Triage the findings (the auditor reports everything; filtering is your job):
1. Reproduce each finding, or show why it can't happen, before touching code.
2. Fix every reproduced correctness, data, DESIGN.md or accessibility finding, with a test that fails
   without the fix (via a builder, or yourself for one-liners). Commit locally.
3. Defer anything else to the roadmap with a reason (an item, or *Known edge cases*). Never drop it
   silently, never call it "minor" without saying why, and don't "fix" style findings.
4. Record the tally in `batch.md`: reported, reproduced, fixed, deferred.

## Phase 7 — Land

1. Update `docs/ROADMAP.md`:
   - Remove the finished items from Now/Next.
   - Add the Done-log line in the format the roadmap describes, including evidence (test and spec
     names, screenshot paths) and the audit tally.
   - Add newly discovered items and set the statuses.
2. `scripts/polish/verify.sh --repeat-changed=5`, which must end with `RESULT: PASS`.
3. Write the commit message to `.polish/current/commit.txt`:
   - subject "Polish: <theme> (P-##, …)";
   - a body listing what changed per item, the audit findings fixed and deferred, and the tests added;
   - the attribution lines the session requires.
4. `scripts/polish/land.sh .polish/current/commit.txt`.
5. Check the "Deploy web" run with the GitHub MCP tools. If it fails, fix forward immediately:
   `main` must stay green.

## Phase 8 — Report

Tell the owner, briefly:
- what landed, by id, and what they'll notice in the app;
- what the audit found, and what was fixed and what was deferred;
- what's waiting on them (🙋);
- what the next batch will be.

Point them at the Inbox.

Every 5th batch, add a harness review to the report. Using the Done-log tallies and any bugs that
escaped to later batches, which steps keep paying off and which never do? Propose pruning the ones
that don't. Every step here is a guess about what the model can't do alone.

## Stop and ask instead of pushing on when

- verify fails after two honest fix attempts;
- an item conflicts with DESIGN.md, or is much bigger than its size;
- a change would alter or migrate people's existing data in a way that can't be undone;
- the audit finds a data-loss path you can't close within the batch;
- the guard hook blocks something and you think it shouldn't. Ask; don't work around it.
