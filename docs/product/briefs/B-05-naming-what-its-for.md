# B-05 — Naming what it's for, and the first step toward it

**Status:** building · **Decision:** D-8 — go with the panel's combination, 2026-11-22 (→ P-38, P-40–P-43) · **Theme:** Know the why / Seeing flow · **Date:** 2026-11-22

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
    "nothing feeds it yet" and a toast. **The "Worked on wanderment" dot is gone**: once any wander
    exists, only logs that name a shown wander are dots (`overview.ts`), so unattached logs drop out
    of the picture and of the spoken "Lately" line (→ P-38, being fixed as polish). **No next step is
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
_Simulated perspectives from `docs/product/PERSONAS.md`, run 2026-11-22 before asking. This is a
thinking tool, not user research. Full reports: `.polish/product/panel-B-05-{1,2,3}.md`._

| Persona | Picks | Reaction to their pick | A why holds | What it hinges on |
|---|---|---|---|---|
| A — Impulsive Dabbler | 3 (+ 1's dot linking) | fine | name only | "Just itself" stays valid; the seed never sits there as homework; asked once per log |
| B — Intentional Builder | 1 | delighted | name + "because…" | Linking past logs draws the lines; no false "nothing feeds it yet"; an end-shaped example |
| C — Pressure-Sensitive Returner | 3 | fine → yes | name only | A why born fed; the step never worded as a promise or repeated in the summary |
| D — Reflective Meaning-Seeker | 3 + 2's "because…" | delighted | name + "because…" | A place for the reason; "What's fed it"; a way back after "Not now" |
| E — Skeptical Minimalist | 3 | fine | name only | Reuses the bridge's shape; never two prompts for one log; "Not now" for good |
| F — Assistive-Tech User | 2, then 3; 1 last | fine → delighted | either; no kind | Everything in the picture also as words; the step heard on Home; the 1-2-3's focus rules |

**Trade-offs.**
- **Direction 1 (seed in the picture)** favours picture-first, end-first people (B, and the owner's
  "intents first"). It costs:
  - A, who reads an empty seed as standing homework;
  - C, who reads it as an absence placed on purpose;
  - F most of all: the picture is one image to a screen reader, and at the largest text it doesn't
    exist.
- **Direction 2 (one sentence)** favours linear, verbal users (F). It costs:
  - C, because "so next I'll read a book" is an unkept promise in their own words a month later;
  - D, whose reasons don't fit the grammar;
  - B, because it never links past logs, so they get clarity with no feedback.
- **Direction 3 (start from what you did)** favours deduce-first, low-pressure and low-novelty
  people (A, C, D, E), and it works for F. It costs the owner's "intents first" only on Home with
  logs; the empty app can stay intents-first.

**Strong, lean on it** (named by several personas):
- **Keep the dots.** All six call the vanishing dot a defect → P-38.
- **Link what you already did.** Direction 1's "Did any of these lead here?" and Direction 3's "Is
  anything else toward this?" are the same act. It's B's and D's favourite moment, and its list form
  is what F needs.
- **"Just itself"** stays a valid answer (A, C, D).
- **Naming leads straight to an offered step** that can wait (A, B, D; C and E as long as it's
  optional).
- **Example chips beat a bare field** (A, B, D).
- **A why born fed** (C): one attached at the moment you name it is never "untouched".

**Refinements.**

*Folded in (fit DESIGN.md):*
1. Unattached logs stay as dots, and stay in "Lately" (P-38).
2. Drop "nothing feeds it yet". It's false right after you've done something toward the why, and it
   reads as a scold on day 40 (B, C, E).
3. The chips span a feeling, a value and an end, keeping "feel productive". The placeholder becomes
   "A feeling, a reason or an end, in your own words" (B, D).
4. The step prompt reads as an offer, not a promise: "↳ a next step, if one comes to mind · it can
   wait". It is never repeated in Home's summary (C). It is heard on the why's button in the list
   ("feel productive, what it's for, next: read a book"), so F hears it without pointing.
5. Every way to name a why ends in one short-lived moment:
   - "Anything here toward it?" puts your visible unattached logs on screen as buttons, in the
     picture and in the list.
   - A tap draws the line (attaches the log "to" it), with Undo.
   - Ignoring it writes nothing.
   - It ends when you log, type or leave Home (A, B, D, E, F).
6. With no whys, Home's offer and the post-log bridge are one prompt, never two for the same log
   (A, E, F).
7. On a why's page:
   - "What it's for" shows under the title (F);
   - "Steps" becomes "What's fed it", and is hidden when it's empty (C, D);
   - "Anything else toward this?" lists recent unattached logs to link;
   - there's one verb, Rename (E).
8. The 1-2-3's focus rules apply everywhere: nothing autofocuses by itself, and focus moves to each
   new step. Under Reduce Motion, "fills in" and "line draws" stay still (F).

*Offered as options (the owner decides):*
- **Where the offer sits on Home with logs.** Direction 3's "*Worked on wanderment* — what was it
  toward?" (A, C, D, E, F), or Direction 1's seed at the head of the picture (B; the owner's
  graph-first image). The seed needs a word twin and a card fallback at large text (F).
- **"Because…"** (an optional reason line, on the why's page only, never prompted, never on Home).
  B and D want it; A, C and E prefer a name only; F doesn't mind. It's a stored-data change.
- **"Not now"** hides the offer for good (E). The way back is then pull-only: tap a log's dot or its
  list button → "Toward something?" (A, C, D).

*Refused, with the rule:*
- a kind (feeling / value / end) as a field: all six declined it, and a kind that changes behaviour
  starts building goal semantics;
- B's progress, a second staged step, dates and a "done" state: the never list and D-5 (one staged
  step);
- a suggested why from your logs, unprompted (A): "nothing created without a tap", and it reads as a
  nudge;
- a why's earlier wordings (D): a stored-data want, noted for later.

**Against the owner's notes (P0).**
- "A feeling, not a goal … as much specificity as I allow myself": this matches the folded-in
  refinements (feelings and ends both welcome, a step that can wait, "because…" opt-in).
- "Intents first" (2026-11-21) and "graph first" (2026-11-22) pull toward Direction 1's seed. The
  panel's combination keeps intents first on the empty app (the 1-2-3, refined) and anywhere you
  choose to name one. On Home with logs it starts from what you did, unless the owner picks the seed.
- The owner's "stops at the name" and "looks like a stray button" are both answered: naming now
  flows into a step and linking, and the offer is anchored to a real log (or to the picture).

## Slices
Recommended order; each S or M.
1. **P-38 Logs never drop out of Home's picture** `[ux]` S — shipping now as polish (any answer
   needs it).
2. **Naming copy** `[ux]` S:
   - "nothing feeds it yet" is gone;
   - the chips span a feeling, a value and an end;
   - the new placeholder;
   - the step wording "if one comes to mind · it can wait";
   - the step is heard on the why's list button.
3. **Name → step → link** `[feature]` `[data]` M: after naming a why from any route, an optional
   step field and "Anything here toward it?":
   - your visible unattached logs as buttons (picture and list);
   - a tap attaches the log to the why, with Undo;
   - it ends on log, type or leave;
   - Full tier (it writes `toIds`).
4. **Home's offer starts from what you did** `[feature]` M:
   - with logs and no whys, the pill becomes "*<latest log>* — what was it toward?" with "+ name it",
     your wanders and "Just itself", merged with the post-log bridge;
   - naming there makes a why that's born fed;
   - "Not now" for good, and a tapped dot is the way back.

   (Or Direction 1's seed, if the owner picks it.)
5. **A why's page** `[feature]` M: "What it's for" under the title, "What's fed it", "Anything else
   toward this?", Rename. Optionally a "because…" line (`[data]`, Full tier).

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
**D-8 — How should naming what it's for work?**

**Recommended: Go with the panel's combination:**
- slices 2–5, with Direction 3 for Home's offer once you have logs;
- the refined 1-2-3 for an empty app;
- no "because…" for now. It can be added later without changing anything else.

Or:
- **Go, but with the seed in the picture** for Home's offer (Direction 1, with a word twin and a
  large-text fallback);
- **Go, and add "because…"** (slice 5 becomes Full tier);
- **Copy only** (slices 1–2);
- **Not now**.
