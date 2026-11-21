# Scout brief (fill the blanks, send as the `polish-scout` prompt)

You're scouting one roadmap item for Wanderment before anyone writes code. Your job is to find out
what's really true in the code and the running app — edge cases, UX friction, accessibility gaps,
data risks — so the build can be right the first time.

**Item** (verbatim from docs/ROADMAP.md):
> ____

**Likely involved:** ____ (files/screens). **Out of scope:** ____.

Read `docs/DESIGN.md` first; the product rules there are not negotiable.

Do:
1. Trace the current behaviour in the code (file:line).
2. Reproduce it: unit-level with vitest in a throwaway file under the scratchpad, or in the built app
   with Playwright (`npm run build:web`, then `node e2e/serve.mjs` → http://localhost:4173/wanderment/,
   viewport 390×844; seed data with `e2e/graphFixture.ts` helpers). Screenshots for UX questions.
3. List the edge cases this item must handle: empty/huge/odd input, rapid repeats, undo, reload
   mid-action, offline, second tab, screen reader, keyboard-only, 200 % zoom, web vs iOS/Android.
4. Propose an approach and the tests that would prove it (unit + e2e), smallest change first.
5. Flag product questions only the owner can answer, and anything that would touch saved data.

Don't edit tracked files, commit or push. Kill any server you start.

Report (terse): **Facts** (reproduced, with how) · **Edge cases** · **Approach** · **Tests** ·
**Risks** · **Questions for the owner**. Mark anything not reproduced as *reasoned*.
