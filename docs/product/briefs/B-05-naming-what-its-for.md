# B-05 — Naming what it's for, and the first step toward it

**Status:** proposed · **Decision:** D-8 · **Theme:** Know the why / Seeing flow · **Date:** 2026-11-22

## The problem, in the owner's terms
> "This 'what's it all for?' view doesn't look very intuitive. I want … a more engaging way to
> express linking or refining — declaring your intents, values, motivations … intentions — and then
> defining your first step. But this doesn't seem very insightful." — owner, 2026-11-22
> ([owner-notes](../owner-notes.md))

The owner's answers: it **stops at the name**, and it **looks like a stray button**. All three
moments are in scope:
1. **The Home offer once you have logs:** the dashed "+ What's it all for?" pill and "Not now".
2. **The empty-app 1-2-3** (P-36): name a why → one next step → "There it is."
3. **Revisiting a why later:** rewording, refining, linking what feeds it, choosing its next step.

How much a why holds is open (name only, a "because…" line, or a kind). The panel weighs it.

## Evidence
- **Owner notes:**
  - 2026-11-22: this note.
  - 2026-11-22 "a feeling, not a goal": "I just wanna feel productive", then a mundane step like
    reading a book, "with as much specificity as I allow myself".
  - 2026-11-21: "see your intents and values first".
  - 2026-11-21: "the why … can be induced or deduced".
- **The app today** (screens in `.polish/product/b05-shots/`, 390×844):
  - `1-home-offer-with-logs.png`: one log ("Worked on wanderment") shows as a lone dot near the
    top. Far below, after "Lately: …", is a dashed pill. Nothing visually ties the pill to the
    picture or to the log.
  - `2-home-offer-naming.png`: tapping the pill swaps it for a bare one-line field ("A feeling or a
    reason, e.g. feel calmer"). There are no examples and no explanation.
  - `3-home-after-naming.png`: after Return, a small "feel productive" node sits top-left, with
    "nothing feeds it yet" and a toast. **The "Worked on wanderment" dot is gone**: a why switches
    the picture to "whys and what feeds them", and unattached logs drop out. **No next step is
    offered.** Most of the screen is empty.
  - `4-firstrun-1.png` to `6-firstrun-3.png`: the 1-2-3 is a dashed card above the welcome, with
    example chips and Skip. ② asks for one next step. ③ "There it is." shows a single pill with a
    "↳ read a book" crumb and a "Got it" button. It only runs on a totally empty app.
  - `7-home-with-why.png`: a mature picture, with a why on top, wanders below, lines and dots.
  - `8-why-page.png`: a why's page is any wander's page. "Not what it's for right now" is its only
    why-specific control. There's nowhere to say *why* it matters, and no view of what feeds it.
- **Not built yet:** P-16 (whys as headers on the Wanders tab), P-19 (a smaller step toward a step,
  "chains", D-5), P-21 (the "toward" view on a wander's page).

## Proposed experience — three candidate directions (to be weighed, not yet chosen)
All three keep: nothing is required, everything is skippable, nothing attaches without a tap, no
targets, counts, dates or progress. The log box stays where it is, and Return logs as typed. At most
three declared whys.

### Direction 1 — "Seed in the picture"
The why is a *place in the graph*, not a button beside it.
- **Home with logs, no why:** an empty, dashed node at the head of the picture, labelled "What's it
  all for?", sits where a why would go. Your recent dots sit beneath it, unconnected.
- **Tap it:** it opens in place into a field, with three example chips ("feel productive", "feel
  calmer", "be a better drawer").
- **Return:** the node fills in with your words. Right under it, in the crumb's slot, an inline
  field asks "↳ one next step?". It can wait, and mundane is welcome.
- **Then:** "Did any of these lead here?" Your recent dots and wanders under it become tappable.
  A tap draws the line to the why (it attaches the log "to" it; Undo). Ignoring it writes nothing.
- **Empty app:** the 1-2-3 becomes this same in-picture sequence (seed → step → see), not a card
  above the welcome.
- **Later:** tapping a why's node (P-35's selection) adds "Reword" and "Add a smaller step" (P-19,
  when built) beside the existing actions.

### Direction 2 — "One sentence"
Declaring is completing one sentence in your own words, mirroring the app's "X to Y".
- **The card reads:** "I want to **[feel productive]**, so next I'll **[read a book]**." Both blanks
  are inline fields with example chips. The second blank is optional ("…or leave it open").
- **Done:** the sentence folds into the graph as the why plus its staged step. The same sentence
  appears as the summary line: "What it's for: feel productive. Next: read a book."
- **Empty app:** the 1-2-3 collapses into this one sentence card. **Home with logs:** the pill
  becomes the sentence card, and the logs stay visible above it.
- **Later:** the why's page leads with the sentence, editable in place. An optional third clause
  can be added: "…because **[I feel scattered]**."

### Direction 3 — "Start from what you did"
The why is reached *through* your logs (deduce first, declare second).
- **Home with logs, no why:** the offer points at your latest log: "Worked on wanderment — what was
  it toward?" Below it are "+ name it" and "just itself".
- **Name it:** the log is attached to the new why, its line appears, and the dot stays. Then: "↳ one
  next step toward it?"
- **Empty app:** today's 1-2-3, or "Log one thing you did" first, and then the question above.
- **Later:** the why's page shows "What's fed it lately" (the logs and wanders that point to it) and
  "Is anything else toward this?", which lists recent unattached logs to tap and link.

### Questions that cut across all three
- **How much a why holds:**
  - (a) only a name;
  - (b) a name plus one optional "because…" line, in your words;
  - (c) a name plus a kind (a feeling / a value / an end).

  (b) and (c) are a stored-data change.
- **The dot that vanishes:** keep unattached recent logs in the picture after a why exists? (This
  looks like a defect whichever direction is chosen.)
- **"Not now"** hides the offer for good. Is that right once the offer is part of the picture?

## Fit with the product
- **DESIGN.md:**
  - "a gentle '+ What's it all for?' offers to name one" (wording to update);
  - "nothing created or attached without a tap" (Direction 1's linking and Direction 3's attach are
    both taps, with Undo);
  - "The next belongs to the activity's doing wander";
  - at most three declared whys.
- **STRATEGY.md:** "Know the why; leave the how open". The why can be induced (Directions 1 and 2) or
  deduced (Direction 3). A next step is one optional crumb, never a plan.
- **Not doing:** goals, targets, progress, deadlines, checklists, a multi-screen onboarding tour.

## Persona panel
_Pending._

## Slices
_Pending the decision._

## Data and risk
- A name only: no stored-format change.
- "Because…" or a kind: a new optional field on a thread, which means a migration plus export and
  import coverage (Full tier).
- Linking existing logs to a why rewrites those activities' `toIds`. That's stored data, and needs
  Undo (Full tier).

## Alternatives considered
- Do nothing.
- Polish only: keep the pill, add example chips and a next-step prompt after naming, and keep the
  dots.

## Decision requested
_Pending the panel._
