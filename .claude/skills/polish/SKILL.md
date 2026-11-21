---
name: polish
description: Orchestrates one batch of refinement work on Wanderment from docs/ROADMAP.md — triage the Inbox, pick the next items, send fresh subagents to scout edge cases and UX, build, run one independent adversarial audit, verify, land on main and update the roadmap. Use when the user says /polish, "next batch", "push the app forward", "polish/refine X", or names roadmap items (e.g. "/polish P-03") or a theme ("/polish data", "/polish a11y").
argument-hint: "[item ids like P-03 P-05 | a theme: data, capture, ux, a11y, perf, platform | inbox]"
---

# Polish — one batch, end to end

You are the **orchestrator**. You keep the plan, talk to the user, and judge results. Fresh subagents
do the scouting, building and auditing, so their work and file dumps stay out of your context and
their reviews aren't anchored on your reasoning. One run = one batch, landed on `main`.

The roadmap (`docs/ROADMAP.md`) is the shared surface with the user: they steer by editing it, you
report by updating it. Respect their ordering; never silently drop or reword their Inbox entries.

## Ground rules (all phases)

- Read `CLAUDE.md`, `AGENTS.md`, `docs/DESIGN.md` and `docs/ROADMAP.md` first, every run.
- `DESIGN.md` wins. Never add goals, streaks, % complete, timers, notifications, badge counts, or
  anything that creates a thread or attaches an activity without a tap. *Capture is sacred*: the log
  box must never get slower, stricter or more interruptive.
- Expo: follow `AGENTS.md` (versioned docs for SDK 58). If `npx expo install` can't reach the network,
  pin the version in `node_modules/expo/bundledNativeModules.json`.
- `[data]` items (storage, migrations, backup, import, undo, journal): every change gets tests in
  `src/storage/persistence.test.ts` style (real module, `node:sqlite`, stubbed localStorage), and a
  test must *fail* with the fix removed (mutation-check it once).
- Never skip, loosen or delete a test to get green. Never push red.
- Definition of done (from `CLAUDE.md`): `npm test`, `npm run typecheck`, `npx eslint .`, `npm run e2e`
  — all pass, and the full e2e suite passes **twice in a row** (flake check).
- Batch budget: at most **3 items** or one **L** item. Prefer finishing over starting.

## Phase 0 — Orient (you)

1. `git status` must be clean and `main` up to date with `origin/main`; if not, stop and tell the user.
2. Note the argument: item ids → take exactly those; a theme → top items with that tag; `inbox` →
   triage only; nothing → the top of **Now**.
3. Baseline: run unit tests, typecheck and lint. If the baseline is red, the batch becomes "make it
   green" and nothing else.

## Phase 1 — Triage the Inbox (you)

For each Inbox entry: turn it into a roadmap item (id = next free `P-##`, why, done-when, size, tags)
placed where its priority belongs, or merge it into an existing item, or — if it conflicts with
DESIGN.md or is a product call — put it under **Decisions needed 🙋**. Clear the entry from the
Inbox only once it lives somewhere else. Bugs that lose or corrupt data go to the top of **Now**.

## Phase 2 — Choose the batch (you)

Take items in order, skipping any that wait on a 🙋 decision. Stay within the budget. Items that
touch the same files go in the same batch only if one builder does them sequentially.

## Phase 3 — Scout (parallel `polish-scout` subagents)

Launch one `polish-scout` per item, **in a single message so they run in parallel**, plus one extra
"walkthrough" scout for the batch's screens when the batch is `[ux]`/`[a11y]`. Brief each with: the
item text verbatim, the files you expect are involved, and what *not* to look at. Use the brief in
`scout-brief.md`. Scouts don't edit tracked files.

When they return, read their reports critically: drop speculation, keep reproduced facts.

## Phase 4 — Collaborate (you, with the user — at most once per batch)

Write a short **batch brief** for each item: approach, acceptance tests, edge cases to cover, risks.
Then decide if anything needs the user:

- Ask (one `AskUserQuestion`, ≤ 4 questions, recommended option first) **only** for product calls:
  visible UX choices with real trade-offs, anything touching DESIGN.md rules, anything irreversible
  for users' data, new dependencies with native code, or a scope change.
- Everything else (implementation choices, test design, naming) — decide and proceed.
- If the user's answer changes the plan, update the brief; if they decline an item, move it back with
  a note.

## Phase 5 — Build (`polish-builder` subagents)

One `polish-builder` per item, **sequentially** on the main checkout (they share files and the build).
Use parallel builders only for items with no overlapping files, each with `isolation: "worktree"`.
Give each the batch brief from Phase 4, `build-brief.md`, and the scouts' reproduced facts. Builders
don't commit.

After each builder: look at the diff yourself (`git diff --stat`, then the risky parts), run the
definition of done, and look at the affected screens (screenshots at 390×844, plus 200 % zoom for
`[a11y]`). Send the builder back (SendMessage) with concrete corrections rather than patching
around it, unless the fix is one line.

## Phase 6 — Audit (one fresh `polish-auditor`)

Exactly one fresh `polish-auditor` per batch, after everything is built. Give it **the code, not your
conclusions**: the uncommitted diff, the items' text, DESIGN.md — use `audit-brief.md` verbatim with
the blanks filled. Do not tell it what you think is fine.

Then verify every finding yourself: reproduce it (or show why it can't happen) before changing code.
Fix real ones (builder or yourself), add a test per fixed finding, re-run the definition of done
(e2e twice). Findings you won't fix go to the roadmap as items or under *Known edge cases* with the
reason — never silently dropped.

## Phase 7 — Land (you)

1. Commit on `main` — subject "Polish: <short theme>", body listing items (by id), what changed,
   audit findings fixed, and tests added. End with the attribution lines the session requires.
2. Update `docs/ROADMAP.md` in the same commit: remove finished items from Now/Next, add a Done-log
   line (`date · ids + one-line summary · commit`), add newly discovered items where they belong.
3. Push to `origin main` (it deploys). Check the "Deploy web" run with the GitHub MCP tools; if it
   fails, fix forward immediately — main must stay green.

## Phase 8 — Report (you)

Tell the user, briefly: what landed (by id) and what they'll notice in the app; what the audit found
and what was fixed; what's left open and why; decisions waiting on them (🙋); what the next batch
will be. Point them at the Inbox for anything they want next.

## Stop and ask instead of pushing on when

- the definition of done fails after two honest fix attempts;
- an item turns out to conflict with DESIGN.md, or is much bigger than its size;
- a change would alter or migrate users' existing data in a way that can't be undone;
- the audit finds a data-loss path you can't close within the batch.
