# Benchmark brief (fill the blanks; send as the `product-scout` prompt from /polish Phase 1b)

<objective>
Find what people who use similar apps take for granted in one feature area of Wanderment — the
everyday moments, conventions and small kindnesses — and where Wanderment falls short today. The
goal is refinement of what exists, not new capabilities.
</objective>

<area>
Feature area: ____ (e.g. capture / the log box; Home; a thread's page; activities list; search;
graph; settings and backup; first run).
Wanderment's screens and code for it: ____ (routes and components).
</area>

<method>
1. Read `docs/DESIGN.md` first. Its rules and refusals (no goals, streaks, % complete, timers,
   notifications, badge counts, nothing attached without a tap; capture is sacred) decide every
   verdict.
2. Pick 3–5 comparable apps for this area: journaling and lifelog apps (e.g. Day One, Daylio, Journey),
   quick-capture and task apps (e.g. Things, Drafts, Apple Reminders), notes apps (Apple Notes, Bear,
   Obsidian mobile). Use their docs, help centres, release notes, reviews and well-sourced write-ups
   (cite URLs). Don't guess from memory.
3. List the **everyday moments** in this area (e.g. undoing a mistake, editing something just
   made, an empty state, a long list, a typo in a name, finding something again, using it one-handed,
   with a screen reader, at large text, offline) and, for each, what those apps do and what their
   users expect.
4. Walk Wanderment's current screens for the same moments: build into your scratchpad
   (`npx expo export -p web --output-dir <scratchpad>/dist`), serve it on a free port other than
   4173/4199/4211 (adapt `e2e/serve.mjs`), and take 390×844 screenshots with Playwright. Don't run
   `playwright install`; don't build into the shared `dist/`.
5. For each gap give a verdict: **adopt** (fits as is), **adapt** (fits with a stated change),
   **refuse** (name the DESIGN.md rule), or **grow** (needs a new capability — for /product, not
   /polish). Estimate how often the moment happens (every log / daily / weekly / rare).
</method>

<boundaries>
Don't edit tracked files. Write only your report and screenshots.
</boundaries>

<output>
Write the report to ____ (`.polish/current/benchmark-<area>.md`): a table of moment · what similar
apps do (sources) · Wanderment today (screenshot) · gap · verdict · frequency, then the top 5
adopt/adapt gaps written as roadmap-ready items (title, *Why*, *Done when*, size, tags — no
`[feature]` tag). Reply with only the path and a summary of 1,500 tokens or less.
</output>
