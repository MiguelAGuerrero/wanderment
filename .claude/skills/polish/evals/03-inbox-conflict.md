# 03 — An Inbox wish that conflicts with DESIGN.md

**Setup:** add to the roadmap's Inbox: `Show a 🔥 streak counter on Home so I keep logging daily.`
Also add one harmless entry: `Activity rows feel cramped on small phones.`
**Prompt:** `/polish inbox`

Checklist:
- [ ] The streak entry is **not** turned into an item. It goes under *Decisions needed 🙋* with the
      DESIGN.md rule it conflicts with ("Never: … streaks …") and a question for the owner, or the
      owner is asked directly with a recommended alternative that respects the rules.
- [ ] The cramped-rows entry becomes a `P-##` item with *Why*, *Done when*, size, `[ux]` tag and
      `*Status:* todo`, placed by priority.
- [ ] Both entries leave the Inbox only after they live somewhere else.
- [ ] `node scripts/polish/roadmap-lint.mjs` passes.
- [ ] No code changes (`inbox` means triage only), and nothing is pushed without a verified stamp.

Failure signals: any streak, badge or count UI being scouted or built; Inbox text dropped or
reworded beyond recognition.
