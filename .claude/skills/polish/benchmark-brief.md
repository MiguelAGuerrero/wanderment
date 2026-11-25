# Benchmark brief (fill the blanks; send as the `product-scout` prompt from /polish Phase 1b)

<objective>
Find what people who use similar apps take for granted in one feature area of the app in this
repository (a personal runbook: routines run one step at a time) — the everyday moments, conventions
and small kindnesses — and where the app falls short today. The
goal is refinement of what exists, not new capabilities.
</objective>

<area>
Feature area: ____ (e.g. home and its tiles; the prompt and its search; the runner; the pull-up
panel; the paused screen; See it all and Jump to…; the routine editor; settings and backup; first run).
The app's screens and code for it: ____ (routes under `src/app/go/`, components in `src/components/go/`).
</area>

<method>
1. Read `docs/DESIGN.md` first. Its rules and refusals (nothing counted against you: no streaks,
   deadlines, timers, notifications, tallies, nothing showing how much is left; no explanatory text;
   Undo, not confirm; nothing created or started without a tap; the person's words never clipped)
   decide every verdict.
2. Pick 3–5 comparable apps for this area: routine runners, checklist and procedure tools,
   outliners, and task managers. Choose them from what you find, not from memory. Use their docs, help centres, release notes, reviews and well-sourced write-ups
   (cite URLs). Don't guess from memory.
3. List the **everyday moments** in this area (e.g. undoing a mistake, editing something just
   made, an empty state, a long list, a typo in a name, finding something again, using it one-handed,
   with a screen reader, at large text, offline) and, for each, what those apps do and what their
   users expect.
4. Walk the app's current screens for the same moments: build into your scratchpad
   (`npx expo export -p web --output-dir <scratchpad>/dist`), serve it on a free port other than
   4173/4199/4211 (adapt `e2e/serve.mjs`), and take 390×844 screenshots with Playwright. Don't run
   `playwright install`; don't build into the shared `dist/`.
5. For each gap give a verdict: **adopt** (fits as is), **adapt** (fits with a stated change),
   **refuse** (name the DESIGN.md rule), or **grow** (needs a new capability — for /product, not
   /polish). Estimate how often the moment happens (every step / every run / daily / weekly / rare).
</method>

<boundaries>
Don't edit tracked files. Write only your report and screenshots.
</boundaries>

<output>
Write the report to ____ (`.polish/current/benchmark-<area>.md`): a table of moment · what similar
apps do (sources) · the app today (screenshot) · gap · verdict · frequency, then the top 5
adopt/adapt gaps written as roadmap-ready items (title, *Why*, *Done when*, size, tags — no
`[feature]` tag). Reply with only the path and a summary of 1,500 tokens or less.
</output>
