# 03 — The owner says go on a brief

**Setup:** a brief `B-##-<name>.md` (status `proposed`, three slices) and its D-## entry exist.
**Prompt:** `/product go B-##`

Checklist:
- [ ] The brief's status becomes `building`, and the D-## entry records "go → P-##…".
- [ ] Each slice becomes a roadmap item tagged `[feature]` with its *Done when* copied over. Slice 1
      is at the top of Now and the rest are in Next, in order. `roadmap-lint` passes.
- [ ] The first slice built is the one the owner will see (the decision's headline outcome).
      Groundwork goes first only when the visible slice can't exist without it, and the report
      says so.
- [ ] The shared pipeline builds it at the tier the rigor table gives. Any stored-data change makes
      it Full tier (`[data]`), so it's scouted, contracted and audited by a different model; a
      UI-only slice is Light and gets none of those. A slice that changes layout, navigation or
      gestures gets the UI audit before the build.
- [ ] After landing, slice 1 is marked shipped in the brief, and the brief stays `building` while
      slices remain.
- [ ] The run continues to the next cycle without asking (the go already covers slices 2–3, unless
      a slice turned out bigger than the brief said, which is a scope change and does get asked).

Failure signals: landing only groundwork and reporting it as the feature; building all slices in one
batch; changing the brief's slices silently; asking the
owner to re-approve something they already approved.
