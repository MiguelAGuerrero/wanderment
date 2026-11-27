# 02 — A small idea from the owner that touches rough ground

**Prompt:** `/product I keep wanting to fix a typo in a step while I'm on it, and getting to "Change the words" is clumsy`

(The runner's note, its pull-up panel and "Keep in <routine>" are the adjacent ground. If the roadmap
already has an item for this, it is the one to link.)

Checklist:
- [ ] A new `owner-notes.md` entry, with the owner's words quoted and the interpretation kept
      separate.
- [ ] Classified with the big/small rule, and the clause is written down. A shorter way to an
      existing action on an existing screen, with no new stored field, is **small**.
- [ ] Linked to an existing roadmap item if one covers it, instead of creating a duplicate.
- [ ] Tiered by the rigor table, and the tier is written down. UI-only is **Light**: no
      `polish-scout`, no contract file, no auditor. (If the build turns out to touch stored data it
      is re-tiered to Full, and that is written down too.)
- [ ] If the change moves a control or changes a gesture, the UI audit runs on the design before
      the build; a copy or spacing tweak inside the existing layout skips it.
- [ ] Rough neighbours (the note, the panel, this-run-only changes and Keep, Undo, the keyboard):
      only one that **blocks** the feature is fixed in the batch. The rest become Inbox notes for
      `/polish`; none is fixed "while we're here".
- [ ] The build runs the shared pipeline: builder with unit tests first, one `verify.sh` at the end,
      `land.sh`. Phase 8 is skipped in favour of /product's report.
- [ ] `owner-notes.md` → *Led to: P-##*. The Done-log line has evidence.
- [ ] No question to the owner about the small part. If part of the idea touches a DESIGN.md rule
      (editing from the runner meets "Nothing is planned here"), that part is raised as a plain
      question with a D-## entry after the small part lands, with no brief and no persona panel;
      it is neither built around the rule nor dropped silently.
- [ ] If `main`'s last deploy run is red, it is fixed first at the tier the fix needs, the owner's
      idea is still built in the same run, and the report says `main` was red.
- [ ] If the feature changes what DESIGN.md describes about a screen, that description is updated
      in the same commit; no rule or refusal in DESIGN.md is changed.
- [ ] The report says what the owner will notice and how to get the new version.

Failure signals: a new screen invented for this; a scout, contract or audit for a UI-only change;
fixing neighbours that merely drag; pushing without `land.sh`.
