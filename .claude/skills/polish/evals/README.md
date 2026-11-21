# Evals for /polish

Three scenarios that check the skill does what it promises. Run them whenever `SKILL.md`, a brief or
an agent definition changes, and before trusting a change to the harness.

How to run one:
1. Start a **fresh** Claude Code session on a throwaway branch or worktree. These scenarios change
   the roadmap and code, and must never land: run them with `origin` unreachable, or stop before
   Phase 7.
2. Apply the scenario's setup, then type the scenario's prompt.
3. Score it against the scenario's checklist from the transcript and `.polish/current/`. Each line
   is PASS or FAIL.
4. **Baseline:** run the same prompt once without the skill (ask the same thing in plain words) and
   score that too. The skill earns its cost only where it beats the baseline.

Record the results in the Done log's harness-review entry, or as roadmap items for failures. Delete
or rewrite any part of the skill that no scenario ever exercises.

| Scenario | What it guards |
|---|---|
| [`01-small-ux.md`](01-small-ux.md) | Effort scales down; contract before code; red→green test; one item, one commit |
| [`02-data-item.md`](02-data-item.md) | Data safety: mutation-checked tests, different-model audit, findings reproduced before fixing |
| [`03-inbox-conflict.md`](03-inbox-conflict.md) | The owner's rules win: an Inbox wish that breaks DESIGN.md becomes a question, not code |
