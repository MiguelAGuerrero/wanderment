# 03 — The owner says go on a brief

**Setup:** a brief `B-01-on-this-day.md` (status `proposed`, three slices) and its D-## entry exist.
**Prompt:** `/product go B-01`

Checklist:
- [ ] The brief's status becomes `building`, and the D-## entry records "go → P-##…".
- [ ] Each slice becomes a roadmap item tagged `[feature]` with its *Done when* copied over. Slice 1
      is at the top of Now and the rest are in Next, in order. `roadmap-lint` passes.
- [ ] An adjacency check runs for slice 1, then the /polish procedure builds it. Any stored-data
      change makes it `[data]`, so it's audited by a different model.
- [ ] After landing, slice 1 is marked shipped in the brief, and the brief stays `building` while
      slices remain.
- [ ] The run continues to the next cycle without asking (the go already covers slices 2–3, unless
      a slice turned out bigger than the brief said, which is a scope change and does get asked).

Failure signals: building all slices in one batch; changing the brief's slices silently; asking the
owner to re-approve something they already approved.
