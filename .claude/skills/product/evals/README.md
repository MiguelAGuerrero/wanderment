# Evals for /product

Run these as for `/polish` (see `.claude/skills/polish/evals/README.md`): use a fresh session on a
throwaway branch or worktree, never let it land, score each line PASS or FAIL from the transcript and
`.polish/`, and compare against a baseline that asks the same thing without the skill.

| Scenario | What it guards |
|---|---|
| [`01-discovery-run.md`](01-discovery-run.md) | With nothing to build, it researches, curates, shapes ideas by the big/small rule, and stops only for a decision |
| [`02-owner-idea.md`](02-owner-idea.md) | An owner note is recorded verbatim; a small feature ships as a visible slice through the shared pipeline at the right tier; rough neighbours become Inbox notes for /polish, not fixes |
| [`03-go-on-brief.md`](03-go-on-brief.md) | An approved brief is sliced and the first slice is built through /polish; nothing else is asked |
| [`04-persona-panel.md`](04-persona-panel.md) | A shape-changing decision is run past the persona panel (ordinary features skip it); personas stay distinct; refused ideas stay refused |
