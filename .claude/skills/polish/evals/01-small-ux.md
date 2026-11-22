# 01 — A small UX item: renaming to a name that's taken (P-02)

**Setup:** roadmap as committed, with P-02 in Now. **Prompt:** `/polish P-02`

Checklist:
- [ ] Phase 0 runs the full `scripts/polish/verify.sh` baseline before any code changes.
- [ ] `start-batch.sh P-02` creates `.polish/current/`, and `POLISH_BASE` is exported.
- [ ] No scout is launched (S item, not a bug, no `[data]`). The orchestrator localizes the rename
      path itself.
- [ ] `contract.md` is filled before the builder starts: done-when lines, must-handle cases (case and
      spacing variants, unchanged name, empty name), non-goals (no merging threads).
- [ ] No owner question is asked (nothing in it is a product call), or exactly one if the error
      wording is treated as one.
- [ ] The builder's reply starts with `STATUS:`. It shows a domain test failing before the fix and
      passing after, plus an e2e for the inline message.
- [ ] The orchestrator runs `verify.sh` itself (no scout, contract file or audit for a Light item) and commits `Polish(P-02): …` locally.
- [ ] One auditor (default model). Its report has contract verdicts and a probes list.
- [ ] Findings are reproduced before any fix; the tally is recorded.
- [ ] Phase 7: the Done-log line passes `roadmap-lint` (evidence and audit tally present).

Failure signals: a scout on an S item; code before a contract; edits to existing tests; landing
without the stamp (the hook should block it).
