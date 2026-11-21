# B-02 — Chains of intention

**Status:** proposed · **Decision:** D-5 · **Theme:** Warm return / Seeing flow · **Date:** 2026-11-21

## The problem, in the owner's terms
> "You could define the next step towards a value or goal ahead of time, but only one at a time —
> there can only ever be one staged … if [it] needs to be edited or extended … another note on top of
> it … implicitly creates a chain of intentions that the user can select and do by a quick tap of the
> note … each [note] itself can be treated as an intention … X to Y, even if Y is an action like
> 'practice head proportions' to 'be a better drawer', and 'be a better drawer' to something else."
> — owner, 2026-11-21 ([owner-notes](../owner-notes.md))

Today a thread has at most one next step, a plain note. Once you're doing it you can't say "before
that, this", and the step can't carry a why of its own. A step that's really an intention
("practice head proportions") has no way to become one.

## Evidence
- Owner notes: the entry above, building on B-01 ("know the why; leave the how open").
- The app today:
  - `Thread.next` is a single string.
  - The crumb's "Log this" loads it into the log box with the thread as doing.
  - Logging it clears it.
  - DESIGN.md: *at most one visible next*; *links between threads are never stored*; and *cut:
    hidden "then" pieces*.
- Discovery: none. This is a model question, not one of borrowing.

## Proposed experience
1. **One staged step, as today.** Under a thread (or a why from B-01), the crumb shows one step:
   "↳ practice head proportions · Log this".
2. **Add on top.** The crumb gets a quiet "+ before that" action.
   - Typing "10 quick head sketches" stages that note.
   - The crumb now reads "↳ 10 quick head sketches · toward *practice head proportions*". Only the top
     is staged.
   - The chain shows as a single "toward …" line, never as a list of steps.
3. **Tap to do it.** "Log this" loads the top note. Logging clears it, and the step beneath becomes
   the staged one again: "↳ practice head proportions · toward *be a better drawer*". Ignoring it
   costs nothing.
4. **Each step is an intention.** A step that keeps recurring can be **made a thread**: "+ make this a
   thread". From then on, logs can go to it, it appears in the live graph (B-01) and it can have its
   own next step. So "practice head proportions" → "be a better drawer" → "draw my own comic" become
   real links in the graph, earned by logging toward them.
5. **Editing.**
   - Edit the staged note in place.
   - Remove it: the one beneath returns.
   - "Clear the chain" lets it all go, with Undo.

**States.**
- **Empty:** today's "+ What's next?".
- **Long chains:**
  - only the top and one "toward …" are ever visible;
  - the thread page shows "the chain" collapsed, on request only;
  - no counts.
- **After a month away:** the staged step greets you as today. Nothing counts what's left.
- **Screen readers:** "Next step for draw: 10 quick head sketches, toward practice head proportions.
  Double-tap to load into the log box."

## Fit with the product
- **DESIGN.md, *at most one visible next*.** Kept: only one step is ever staged.
- **DESIGN.md, *cut: hidden "then" pieces*.** That cut was about splitting a next step into a hidden
  sequence planned in advance. Here a chain grows only from the top, one step at a time, at the
  moment you know it, and each step is the *why* of the one above, not a later item in a plan.
  **Still a reversal of a written cut. The owner decides.**
- **STRATEGY.md, *no plans for the how*.** A chain is built backward from intent, never forward as a
  schedule. There are no due dates, counts or % through the chain. Proposed wording: "A step can
  hold a smaller step on top of it, one at a time; nothing is planned ahead, nothing is counted."
- **DESIGN.md, *links between threads are never stored*.** Notes in a chain aren't threads, so no
  link is stored. "Make this a thread" creates a thread whose link to its why is *earned by logging*
  ("doing X → to Y"), not stored. Option B below would change this.

## Model options (part of the decision)
- **A — A stack of notes per thread** (recommended to start).
  - `Thread.next` becomes a short stack with the top staged. It's stored as an additive field; the
    export keeps `next` as the top for older versions.
  - Promote to a thread with a tap.
  - Smallest change; no stored links.
- **B — Every step is a thread with a stored "toward" link.**
  - Every step lands in the graph immediately.
  - It reverses "links are never stored", and creates many threads.
- **C — Not now.** Keep one note; revisit after B-01 ships and the live graph is in use.

## Persona panel
_To be filled by /product before the owner is asked (Step D2)._

## Slices (option A)
1. **Stack on top** (M, `[data]` `[feature]`).
   - "+ before that" on the crumb and the thread page; the top is staged and shows "toward …".
   - Logging or removing the top surfaces the one beneath.
   - Clear the chain, with Undo.
   - Migration: `next` becomes a stack, with the old `next` as the single item.
   - *Done when:* domain tests (push, pop on log, remove, clear, undo); migration and export
     round-trip; e2e for the chain flow; axe.
2. **Make this a thread** (S/M, `[feature]`).
   - Promote a chain step to a thread.
   - Its next items move with it, and the activity that logs it records the link by logging
     (doing → to).
   - *Done when:* e2e for promote and log, and the graph (P-15) shows the link once logged.
3. **The chain on the thread page** (S): "the chain", collapsed, read-only, no counts.

## Data and risk
Option A adds a stored list in place of a single `next`. The migration is additive, and the export
keeps a `next` string for older versions. The risk is drift toward planning. The guardrails are top
only, no counts, a chain that only grows by "before that", and fading as today.

## Alternatives considered
- Plain notes with "→ toward" text typed by hand: no structure, nothing to tap or promote.
- Option B: richer graph, but stored links and thread sprawl.
- Do nothing.

## Decision requested
**Build chains of intention (option A), and refine the written rules accordingly?** Choices: Go (A) ·
Go with option B · Go, but change … · Not now. The persona panel summary goes here before asking.
