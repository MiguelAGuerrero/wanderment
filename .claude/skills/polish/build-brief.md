# Build brief (fill the blanks; send as the `polish-builder` prompt)

<objective>
Implement exactly one roadmap item, as agreed in its contract, and prove it with evidence.
</objective>

<inputs>
- Contract (what "done" means; the auditor grades against it): ____ `.polish/current/P-##/contract.md`
- Scout report (facts, call sites, edge cases): ____ `.polish/current/P-##/scout.md`, if scouted
- Earlier decisions in this batch: `.polish/current/decisions.md`. Follow them, or say explicitly why
  you're revisiting one.

Read all of them, plus `CLAUDE.md`, `AGENTS.md` and `docs/DESIGN.md`, before writing code.
</inputs>

<scope>
- Must handle: everything under "Must handle" in the contract.
- Non-goals: everything under "Non-goals". Don't do drive-by refactors; note them in your report
  instead.
- Keep the change as small as the contract allows. Follow the patterns already in the code.
</scope>

<how>
- **Read before claiming.** Open any code before you rely on what it does.
- **Tests come first where possible.**
  - Every done-when line gets a test, or a recorded manual check if it can't be automated.
  - Expected values come from the contract or DESIGN.md, never from running the code and copying its output.
  - For a bug: show the new test **failing before** your change and **passing after**.
  - For `[data]` changes: use the `src/storage/persistence.test.ts` technique, and confirm your new
    test fails with the fix removed.
- **Solve it generally.** No hard-coding, and no special-casing a test's inputs. Don't edit or delete
  existing tests to make them pass. If an existing test looks wrong, or conflicts with the contract,
  stop and report BLOCKED with your reasoning; don't change it.
- **Accessibility is part of done:**
  - accessible names include the visible text;
  - 44 px targets;
  - decorative glyphs spread `decorative` from `src/components/a11y.ts`;
  - the axe checks in `e2e/a11y.spec.ts` stay green.
- **Verify** with `scripts/polish/verify.sh --repeat-changed=5`. If it fails, read the log it points
  to. Save screenshots of changed screens at 390×844 in your scratchpad.
- **Record decisions.** Append any decision a later builder needs to know (naming, a helper you
  added, a behaviour you chose) to `.polish/current/decisions.md`, one line each.
- **Clean up** throwaway files. Don't commit, push, or edit `docs/ROADMAP.md`.
</how>

<output>
Start your reply with one status line: `STATUS: DONE`, `STATUS: BLOCKED — <why>` or
`STATUS: FAIL — <what's still broken>`. Then:
- Files changed, and why.
- Tests added, each mapped to the done-when line it proves, with the red-before / green-after
  evidence (and the mutation check for `[data]`).
- The final `verify.sh` summary, pasted as printed.
- Screenshot paths.
- Things you noticed but left alone.
</output>
