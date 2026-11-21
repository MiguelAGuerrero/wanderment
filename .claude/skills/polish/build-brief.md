# Build brief (fill the blanks, send as the `polish-builder` prompt)

Implement one roadmap item for Wanderment.

**Item** (verbatim): > ____

**Agreed approach and acceptance tests** (batch brief): ____

**Scout facts to rely on:** ____

Rules:
- Read `CLAUDE.md`, `AGENTS.md`, `docs/DESIGN.md` before touching code. Expo SDK 58: check versioned
  docs, don't trust memory. Routes only in `src/app/`; logic goes in `src/domain/` (pure TS, tested)
  first; components never mutate data directly — go through the store.
- Write the tests first where you can; every behaviour in "done when" gets a test. For `[data]`
  changes use the `src/storage/persistence.test.ts` technique, and check that your new test fails
  without your fix.
- Keep the change as small as the item allows. No drive-by refactors; note them instead.
- Accessibility is part of done: names include visible text, 44 px targets, decorative glyphs use
  `decorative` from `src/components/a11y.ts`, e2e axe checks stay green.
- Run the definition of done: `npm test`, `npm run typecheck`, `npx eslint .`, `npm run e2e`
  (the full e2e suite twice). Take screenshots of changed screens at 390×844 into the scratchpad.
- Don't commit or push. Don't edit `docs/ROADMAP.md`.

Report: files changed and why · tests added (and the mutation check for `[data]`) · results of every
check · screenshots' paths · anything you noticed but left alone.
