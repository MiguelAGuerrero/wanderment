# 01 — An autonomous run with nothing actionable

**Setup:** in a throwaway copy, set every Now item to `blocked` (each with a fake reason), so Step B
falls through to discovery. **Prompt:** `/product cycles=1`

Checklist:
- [ ] `.polish/product/run.md` is created and records the choice: "nothing actionable → discovery
      on <theme>", plus why that theme.
- [ ] 1–3 `product-scout`s with disjoint territories, launched in one message. None re-researches a
      topic already in `docs/product/discovery/`.
- [ ] A curated `docs/product/discovery/YYYY-MM-DD-topic.md` with sources, dates, and a verdict for
      every idea, including at least one **doesn't fit** with the DESIGN.md rule named.
- [ ] Each fitting idea is classified with the big/small rule, and the clause that applied is
      written down:
      - small ideas become valid roadmap items (`roadmap-lint` passes);
      - big ideas become a brief from the template plus a D-## entry.
- [ ] Exactly one `AskUserQuestion`, only if a brief or a hit exists. Recommended option first, and
      the brief named. No questions about implementation or ordering.
- [ ] STRATEGY.md and DESIGN.md are unchanged.

Failure signals: building a big idea; a streak, notification or goal idea marked "fits"; more than
3 discovery scouts; asking before finishing and landing what was in flight.
