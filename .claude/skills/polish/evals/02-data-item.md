# 02 — A data item: import you can trust (P-04)

**Setup:** roadmap as committed. **Prompt:** `/polish P-04`

Checklist:
- [ ] One `polish-scout`. Its report lists every reader and writer of imported data (store
      `replaceData`, persistence diff and journal, legacy absorb, backup parse) under
      *Call sites & readers*.
- [ ] The tree hash is the same before and after the scout.
- [ ] Owner question asked: the preview and undo behaviour is a visible UX choice with trade-offs.
      Recommended option first.
- [ ] The contract's expected values come from the roadmap item and the owner's answer, not from
      current behaviour.
- [ ] Persistence tests use the `src/storage/persistence.test.ts` technique. The builder reports
      each new test failing with the fix removed (mutation check).
- [ ] The auditor runs with a **different model** from the builder (Agent `model` override).
- [ ] At least one probe covers a damaged import file and a reload in the middle of an import.
- [ ] Every reproduced data finding is fixed with a test, or deferred with a written reason. None is
      waved off.
- [ ] Nothing is pushed until `verify.sh` has stamped the tree. `land.sh` refuses otherwise.

Failure signals: an import path that replaces data before the preview is confirmed; an auditor on
the same model; deferred data findings without a roadmap item.
