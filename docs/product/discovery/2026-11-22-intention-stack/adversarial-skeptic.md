# Adversarial review: B-06 "the intention stack", revision 5

_Skeptic's brief, 2026-11-22. Argues against v5 as hard as the evidence allows, then says what
survives. The owner's decisions outrank this: where I push against one, I list the cost and don't
claim it should be overruled. Sources: v5 mockup + frames 1–5, `B-06-rev4-note.md`, B-06, B-02,
DESIGN.md, STRATEGY.md, PERSONAS.md, `src/domain/{types,overview,selectors}.ts`._

## 0. Facts that the mockup hides

The mockup data is hand-placed: 7 nodes, a staged step on 3 of 4 chains, every path 2–3 deep, one
parent each. The real system differs in five ways that drive most of what follows.

1. **The graph is capped.** `overview.ts`: `MAX_COLUMNS = 3` whys, `MAX_THREADS = 6` nodes,
   `MAX_DOTS = 8`, `GRAPH_H = 176`. v5's rule "only All shows every node" can't hold past 6 wanders.
   The mockup's graph is about 2.5× taller than today's.
2. **Parentage is derived, not stored** (DESIGN: links come from doing → to, counted). A chain's
   context path, and so a carousel page's identity, can change on the next log. A wander under two
   whys has its "home" under the one it fed most recently (owner answer).
3. **Chains don't exist yet.** `Thread.next` is one string. P-19 (the stack of notes) isn't built.
   Every ✓ "the next layer rises" frame assumes data most wanders won't have.
4. **Logging in your own words never completes a step.** Detecting it automatically is refused
   ("nothing applied silently"). v5 removed Load, which was the bridge between the two.
5. **Unattached logs are the majority case for the Dabbler and for day 1.** They have no chain, so
   they can't move the default card.

## 1. Scale and time

| Situation | What v5 does | Problem |
|---|---|---|
| **Day 1, no wanders** | Not designed. The card has no chain to sit on. | The most important frame is missing. The card's absence or emptiness is the first impression (owner's own complaint, 2026-11-21: "disconnected first experience"). |
| **2 chains** | Two pages; swiping reads as a toggle. | Works well. This is the case the mockup proves. |
| **25 chains** | 25 pages, one per leaf in the forest. Most are single-node "chains" (an unattached wander is its own leaf: context "guitar", step "+ next step"). | Swipe access is linear: page 17 takes 16 swipes, or 16 presses of "next chain" for a screen-reader user. There are no pager dots (they'd be a count). The order is unstated, and if it's recency the order changes after every log, so swipe position is never learned. The graph draws 6 nodes, so selecting page 14 lights a node that isn't in the picture. |
| **Week 6** | More derived edges, more two-parent nodes. | The context line flips ("make apparel › draw" becomes "feel productive › draw") after one log toward the other why. Pages appear, merge and split under your thumb. Node positions move with recency, so learned locations are lost. |
| **A month away** | The card sits on the chain you last logged toward, with its staged step (no age, by decision). | Warm when a step exists: B-02's best moment. If no step exists, the first thing you see after a month is "＋ next step": blank homework, which the B-06 panel refused for exactly this persona (refinement 1). |
| **Many steps never defined** | Most pages show "＋ next step". | The card's second line, the "next step at all times" promise, is mostly an empty prompt. The design's main value depends on pre-planning (see §2). |
| **A stale step** | Bold, no age, a big ✓ next to it. The only dismissal is tap → edit → "clear". | The cheapest way to make it go away is ✓. That logs an activity that never happened and adds a false dot. For an app whose value is a true picture of your energy, ✓-as-dismiss is a data-integrity leak, not a UX nit. |
| **A wander under two whys** | One home (most recent), with an "also toward" mirror (rev 3) that v5 doesn't show. | The second why is invisible from the card. The page can change parent between visits. |
| **Deep chains** | The context line is one 10 px line with an ellipsis at the end. | It cuts off the nearest "toward", the most useful part. At 4+ levels you see "make apparel › draw › draw bett…". It needs middle truncation (why … parent), and the 3-layer cap the research already set. |

**"The chain you last logged toward" for someone who mostly logs unattached one-offs.** The default
card freezes on whatever they last attached, possibly weeks ago. Meanwhile their real recent life
shows up only as loose grey dots. The card then reads as a standing reminder of an old intention
("↳ sketch a hand"). That's the "should" the Dabbler fears and the "left untouched" the Returner
fears. It's the opposite of "what am I doing?". The default rule picks the stalest chain for exactly
the users who attach least.

## 2. The core loop

The verbs are log, ✓ and select. The loop people will actually run is **log, and ignore the card.**

- Logging is the habit (STRATEGY north star #1). People type what they did in their own words:
  "sketched three hands at lunch". With Load gone, that log doesn't complete "sketch a hand". So the
  step stays staged, and next time the card says "↳ sketch a hand" about something already done.
  Two outcomes follow, both bad: the person taps ✓ as well (a duplicate, slightly false activity), or
  they learn to ignore the card. Either way the step never pops except by ✓, so **steps go stale
  quickly for anyone who logs in prose.** That's the owner's own declared main path ("Logging, first
  and foremost, is how we're gonna enter into the graph").
- ✓ is a one-tap log with the step's text as the activity. It suits a Builder who plans steps. For
  everyone else, the step's text is a plan, not a record: the record loses the "how it went".
- Select (swipe) is browsing, but in v5 it also arms "→ read" on the log box. Browsing and filing
  are the same gesture. Swipe to look at "read", then type "called mum": the log is filed under
  read, and that **creates a derived edge** in the graph. The chip is visible and removable, but on
  a phone the log box is often filled from the keyboard without looking up. The default card state
  (not armed) and the swiped state (armed) look the same apart from a small chip.
- **Pre-planning the design relies on:** (a) a staged step on most chains (otherwise the card is
  "＋"); (b) chains several layers deep (otherwise ✓ "rises" to nothing, or to the wander itself, see
  below); (c) whys declared and fed (otherwise context paths are one word). Today, `next` exists and
  is optional. Nothing suggests people keep it filled.

**A model hole in frame 4.** After ✓ on "sketch a hand", the step that rises is "draw better hands",
which is a **wander node** with its own dots. If ✓ applies to it, the app "archives and detaches" a
wander with history (the owner's ✓ meaning). That breaks B-02 refinement 6 ("the base of a stack is
its thread or why, never a loggable step") and DESIGN's "a wander fades, it isn't finished". Either
"draw better hands" is a note (then why does the graph draw it as a node with dots?), or ✓ can
complete wanders (then it's a to-do list that eats your graph). This needs to be decided before
building.

**A regression against an owner decision.** The owner agreed after the research audit: "After a pop,
the dock rests on 'Moved toward …' until you next touch the stack." Frame 4 shows the next step
immediately, glowing. This is the "done one, here's another" beat that panels B-02 and B-06 both
flagged for the Returner.

**A second regression.** D-6: tapping a crumb loads it. v5: tapping the step edits it. The Wanders
tab crumbs still load. The same "↳ step" does different things on two tabs.

## 3. The graph: is it pulling its weight on a phone?

**Against it.**
- In every scoped frame (2, 3, 4, 5) the picture holds 2–3 nodes in about 60% of the screen,
  mostly empty canvas. It says exactly what the context line says ("make apparel › sew"), drawn
  bigger. A scoped graph that only shows the path is a duplicate of the text, not an illustration.
- v5 narrows to the **path**, not the **subtree**. Frame 4's scope is `[make apparel, draw, draw
  better hands]`, so "sew", a sibling under make apparel, disappears. The owner said "a selected page
  narrows the graph to that subtree". The subtree, with its siblings and their recent energy, is the
  one thing the picture could show that the line can't.
- At "All" with real data, the caps mean the picture isn't "everything". Without caps, 25 nodes on
  a 390 px canvas is illegible.
- With the keyboard up (the moment of logging), the graph is mostly hidden anyway.

**For it (honestly).**
- It's the owner's stated reason for the product ("the illustration and representation of your
  energy"). It's how the card's context gets a place: lighting a path on swipe is a strong cue,
  and research supports stable, animated re-anchoring.
- It's the feedback channel. The new dot after ✓ or a log (frame 4) is the one moment the
  picture clearly earns its space.
- At rest, without the keyboard, the space is free. Nothing else competes for it while the card
  stays one thumb-reach above the log box.

**Steelman 1: graph on demand.** Today's 176 px graph as a band, tapping it to expand. The card gets
a third line ("↺ left off: sketched a jacket"). It wins on a11y, large text and first-row-above-the-
fold (persona E), and it keeps the picture. It loses the owner's "graph keeps most of the screen"
(rev 4 explicit). Verdict: keep the owner's large graph, but **make the scoped view earn it**:
re-lay it out to fill the canvas, show the why's subtree with siblings dimmed, and their recent
marks.

**Steelman 2: a list of next steps.** Under the log box: up to 5 lines "↳ step · toward why ✓", by
recency, no carousel.

| Owner goal | Carousel (v5) | List | Graph on demand |
|---|---|---|---|
| Context + next step at all times | Yes, one at a time | Yes, several | Yes |
| One thing at a time | **Best** | Fails (the rev 4 rejection) | Same as v5 |
| Graph as the illustration of energy | Best | Weak | Medium |
| 25 chains | Poor (linear swipe) | Good (scan) | Same as v5 |
| Screen reader / large text | Medium (prev/next) | **Best** | Good |
| Stale or empty steps | Visible one at a time | A column of blanks | Same as v5 |

The list is a better *tool* and a worse match for the owner's *spirit*. The owner rejected it
explicitly in rev 4. Keep the carousel, but borrow the list's strength: **bound and order the
pages** so swiping is a short, learnable scan (change 3).

## 4. The dots

Against them:
- In the mockup they float with no line to their wander (DESIGN says "with a line to each wander
  they name"). They read as noise you need ⓘ to understand.
- They are a ledger with the number removed: the B-06 panel dropped option B's dots for exactly
  this.
- "8 most recent" is arbitrary. One busy evening on draw makes every other pursuit look dead.
- At 3 px they're under any touch target and invisible to screen readers.

For them:
- **Unattached logs have no other presence in the graph.** For the Dabbler and on day 1, loose dots
  are the whole picture. The owner wants logging to be "how we enter the graph".
- The **newest dot** is the ✓ and log feedback (frame 4).

**Verdict:** cut dots for attached logs. A wander's recency is already shown by its warmth/shading
(DESIGN), which is "energy" without a tally. Keep loose dots only for unattached logs (they are the
"what was it toward?" handles from P-42), plus a single "just logged" mark that fades on the next
touch. This also answers the owner's doubt without losing the day-1 picture.

## 5. Getting people to define next steps (within the rules)

Moments, ranked by intent:
1. **Right after ✓, when the risen layer is abstract** ("draw better hands"). Intent is at its
   highest. The step line reads "＋ something small toward draw better hands" (research
   refinement 3). It doesn't take focus or open the keyboard.
2. **Right after a log toward a chain with no step.** DESIGN already has the rule: "one quiet
   '+ What's next? (optional)'". Put it in the card line (where the eye already is), not a new
   field. Ignoring it leaves no trace.
3. **On return, when no step exists.** Show "↺ left off: sketched a jacket" as the second line, with
   a small "＋" beside it. The past self's words become the easiest seed for the next step: "do
   that again", or "the next bit of that".

Mechanics that lower the cost:
- **Use the log box as the step input.** Tapping "＋" puts a "↳ next for sew" chip in the one field
  people already type into. Return stages the step. That's one familiar input, not a 10 px inline
  edit inside a card.
- **Placeholder from your own words.** A grey placeholder shows the last log's verb + object ("e.g.
  sketch a jacket"). It's a placeholder, so nothing is created without typing or a tap.
- **Wording:** "＋ next" instead of "＋ next step". Shorter, less homework. Never "Add a step",
  "Plan", "Up next".

Don't:
- prompt on open;
- mark steps-less chains;
- order pages by "needs a step";
- auto-focus.

## 6. Verdict

**Keep.** The graph on top; one card right above the log box; the context path as words; three
verbs; ✓ as an explicit, one-tap "did it"; tap-to-edit with "clear = set down + Undo"; the × chip;
reset to "All" on return; the a11y region and prev/next buttons. This is the clearest Home the
brief has had. The two-line card is the strongest idea, and it answers the owner's "what's my next
step, what am I doing?" well.

**Cut.**
- The dots for attached logs.
- The glow-and-show-next-immediately on ✓ (restore the decided rest).
- Path-only scoping (scope to the subtree).
- "Only All shows every node" as written (it can't be true under the caps).

**Change before building: the 5 highest-leverage changes, ranked.**
1. **Join logging and completing without a fourth verb.** If the log box has text when ✓ is tapped,
   your words are logged *as* that step (D-6's "↳ step" chip, reborn), then the step pops. Log alone
   never touches the step. This stops steps going stale for prose loggers, and stops ✓ becoming a
   false-log dismiss button. Pair it with "set down" visible in the edit state (not only "clear").
2. **The card's second line is never blank.** With no staged step, it shows "↺ left off: <last log
   on this chain>" and a small "＋". If your latest log was unattached, the default card shows *that
   log* with the existing quiet "toward something?" offer (merging DESIGN's post-log ask and
   P-42), instead of a weeks-old chain. Day 1 gets a designed state for free.
3. **Bound and order the carousel by the picture.** Pages are the chains whose nodes are drawn
   (≤ 6, not in Earlier), ordered by the graph's left-to-right layout. Swiping right moves right in
   the picture, and the order is stable between logs. Everything else is reached through ⌕ or the
   Wanders tab, and selecting it there brings it into the picture. This resolves 25 chains, the
   caps, a11y prev/next length and "all shows every node" in one rule.
4. **Settle ✓ against wanders.** ✓ only ever applies to a note step, never to a wander or why. When a
   wander's notes run out, the line becomes "＋ something small toward <wander>" (B-02 ref. 6). Write
   this down before P-19 is built, because it decides the data model.
5. **Make the scoped graph earn its space.** Show the why's subtree with siblings dimmed, re-laid
   out to fill the canvas. Middle-truncate the context line (why … parent). Show the "also toward"
   mirror for two-parent wanders. Separately, consider arming the "→ chain" chip on a **tap** of the
   card, not on a swipe, so looking never files a log by itself. (This one pushes on a Claude-kept
   rule rather than an owner one, so it's cheap to change.)

**The riskiest assumption.** That chains will usually *have* a staged step, i.e. that the owner and
users will do the small pre-planning that makes "next step at all times" true. If they don't, the
card is mostly "＋ next step" or a stale step, and the design's central promise turns into homework
or a fossil.

**The cheapest test, with the owner's own use (no analytics, no build).**
- **Today's data already answers half of it.** The export holds `Thread.next` and each activity's
  `doingId`/`toIds`. Ask the owner to check their own export (locally, nothing sent anywhere):
  - of the wanders touched in the last 21 days, how many have a `next`?
  - of the last 30 logs, how many have no wander?

  If fewer than half have a next, or most logs are unattached, changes 1–2 are not optional.
- **One-week diary, no code.** Each time the owner opens the app, they note two things:
  - which chain they'd have wanted the card on (compared with "last logged toward");
  - whether they logged in their own words something that was already a staged step.

  Three or more mismatches in a week settles changes 1 and 2. This is the "owner's own use" signal
  STRATEGY names, in a form that takes minutes.
- **Optional, Light tier:** a throwaway web page of v5 fed by the owner's export, used alongside the
  app for a few days, before any stored-data work (P-19) starts.
