# Scout brief (fill the blanks; send as the `polish-scout` prompt)

<objective>
Find out what's really true about one roadmap item before anyone builds it: where it lives in the
code, which edge cases and UX problems it has, and which risks to people's data it carries. The
build should then be right the first time. Report what the repo can't tell a builder (intent,
traps, edge cases). Don't redescribe the layout; builders can read that themselves.
</objective>

<item>
____ (verbatim from docs/ROADMAP.md)
</item>

<territory>
Likely involved: ____. Out of scope: ____.
Your territory: ____. Another scout covers ____, so leave that to them.
</territory>

<method>
Read `docs/DESIGN.md` first; its product rules are not negotiable.

1. **Localize, narrowing step by step.** Files, then functions or components, then the exact
   lines or branches. For everything the item would change, list **every** caller and every reader
   (including storage, migrations, export/import and tests). Shallow dependency tracing is the most
   common way investigations mislead builders.
2. **Read before you claim.** Open the code before saying anything about it.
3. **Reproduce.** At unit level, use a throwaway vitest file in your scratchpad (the technique is in
   `src/storage/persistence.test.ts`). In the app:
   1. run `npm run build:web`, then `node e2e/serve.mjs`;
   2. open http://localhost:4173/wanderment/ with Playwright at 390×844;
   3. seed data with the `e2e/graphFixture.ts` helpers.

   Take screenshots for UX questions. If you conclude "not a bug" or "already fine", show the
   evidence.
4. **List the edge cases the item must handle:**
   - empty, huge or odd input;
   - rapid repeats;
   - undo;
   - reload mid-action;
   - offline;
   - a second tab;
   - screen reader;
   - keyboard only;
   - 200 % zoom;
   - web vs iOS/Android.
5. **Propose** the smallest approach, plus the tests that would prove each done-when line. Expected
   values come from the item or DESIGN.md, not from what the code currently does.
6. **Size it.** Estimate how long a careful human would take. If it's hours rather than minutes,
   propose a split into parts that ship separately.
7. **Flag** product questions only the owner can answer, and anything that would touch saved data.
</method>

<boundaries>
Don't edit tracked files, commit or push; the orchestrator checks the tree hash afterwards. Write
throwaway files only in your scratchpad. Stop any server you start.
</boundaries>

<output>
Write the full report to ____ (`.polish/current/P-##/scout.md`) with these sections:

**Facts** (reproduced, with how) · **Call sites & readers** · **Edge cases** · **Approach** ·
**Tests** · **Size & split** · **Risks** · **Questions for the owner**

Mark anything you didn't reproduce as *reasoned*. Reply with only the file path and a summary of
2,000 tokens or less.
</output>
