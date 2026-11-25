# Audit brief (fill the blanks; send as the `polish-auditor` prompt — nothing else)

<objective>
Find what's wrong with a change you didn't write, in /home/user/wanderment (Expo SDK 58 / Expo
Router / React Native Web, deployed as a PWA under /wanderment/), before it ships to people who
trust it with their routines and with everything they stored before. Report **everything** you find, including things you're unsure
about. Someone else filters the findings, so don't hold any back. Skip style and naming; report
what affects correctness, data, the product rules, UX and accessibility, or test strength.
</objective>

<inputs>
- The change: `git diff ____` (the batch base commit) plus untracked files. Several commits may
  be involved.
- What it was supposed to deliver: the contracts in ____ (`.polish/current/P-*/contract.md`). Grade
  against these, not against comments, commit messages or test names.
- Product rules: `docs/DESIGN.md`. Expo rules: `AGENTS.md`. Definition of done: `CLAUDE.md`.
- Test-integrity report (lines that may weaken tests; each needs a real reason):
  ____ (paste `scripts/polish/check-tests.sh` output)
</inputs>

<method>
Assume the author was overconfident, and that the tests may test the wrong thing.

1. For **each done-when line** in each contract, decide PASS or FAIL, with the evidence you
   executed. A line you couldn't check is FAIL, not PASS.
2. Probe beyond the happy path. At minimum, try every "Must handle" state in the contracts, plus:
   - reload mid-action;
   - undo after the change;
   - empty and huge data (many tiles, a thirty-step routine, a frame ten deep: `seedGo` in
     `e2e/goFixture.ts`; a large history from the retired app: `bigBlob` in `e2e/graphFixture.ts`);
   - keyboard-only use;
   - 200 % zoom;
   - two tabs.

   Drive the built app: `npm run build:web`, then `node e2e/serve.mjs` with Playwright at 390×844.
3. Hunt, in this order:
   1. data loss or corruption;
   2. DESIGN.md violations;
   3. logic bugs and regressions nearby;
   4. UX and accessibility defects;
   5. web vs iOS/Android differences (check native-only calls against `node_modules` and the v58
      docs);
   6. tests that pass vacuously, assert values copied from the code, or were weakened.
4. Reason through each finding before you give a verdict on it, and include a reproduction recipe.
</method>

<boundaries>
Don't edit tracked files, commit or push; the orchestrator checks the tree hash. Put throwaway
repro files only in your scratchpad. Stop any server you start.
</boundaries>

<output>
Write the full report to ____ (`.polish/current/audit.md`), with three parts.

1. **Contract verdicts**: a table of item · done-when line · PASS/FAIL · evidence.
2. **Findings**, most severe first. Severity is one of `blocker` · `data` · `bug` · `ux` · `a11y` ·
   `test-gap`. For each finding give:
   - file:line;
   - what's wrong;
   - a failure scenario (steps → wrong result);
   - REPRODUCED (how) or *reasoned*;
   - a suggested fix.
3. **Probes executed**: every check you actually ran, including ones that passed.

Reply with only the file path and a summary of 2,000 tokens or less (verdict counts, then
findings by severity).
</output>
