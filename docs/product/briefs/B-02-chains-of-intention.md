# B-02 — Chains of intention

**Status:** building · **Decision:** D-5 — go with model A, only the top step loggable, 2026-11-21 (→ P-19, P-20, P-21; DESIGN.md "at most one visible next" line is updated when P-19 ships) · **Theme:** Warm return / Seeing flow · **Date:** 2026-11-21

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
- **The cut of hidden "then" pieces** (written in `docs/ROADMAP.md` *Cut on purpose* and
  `docs/IMPLEMENTATION_PLAN.md`, not in DESIGN.md). That cut was about splitting a next step into a hidden
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
_Simulated perspectives from `docs/product/PERSONAS.md`, run 2026-11-21 before asking. This is a
thinking tool, not user research. Full reports: `.polish/product/panel-B-02-{1,2,3}.md` (local)._

| Persona | Reaction | Model | What it hinges on |
|---|---|---|---|
| A — Impulsive Dabbler | uneasy; *yes, by mostly ignoring it* | A, strongly | Letting go is as easy as stacking; stacked impulses don't come back as "shoulds" |
| B — Intentional Builder | delighted, one frustration; *yes* | wants B, *needs* A | Promote and log visibly draws the link: the graph shows what was done, not what was planned |
| C — Pressure-Sensitive Returner | uneasy; *maybe* | A | Stepping down to something smaller, not a queue; no "chain" language |
| D — Reflective Meaning-Seeker | delighted; *yes* | A | "toward …" in words, kept in the record; whys never become tasks |
| E — Skeptical Minimalist | fine → uneasy; *yes, if out of the way* | A (B a dealbreaker) | The Home crumb unchanged for non-users; the full stack survives export |
| F — Assistive-Tech User | uneasy; *maybe → yes* | A, strongly | No extra stop per card; the chain is spoken once via the toast; the visible-text-first name |

**Trade-offs.**
- It favours why-first, reflective structures (P0, D), conscientious builders (B), and anyone who
  navigates by text (F: under A the whole chain is words).
- It costs low-conscientiousness dabblers (A): stacks pile up and resurface on log.
- It costs pressure-sensitive returners (C): "done one, here's another" in one beat, and long stacks
  that read as counts.
- It costs fast typers (E): only "Log this" uses up a step today.
- Both A and B would turn the stack into a hidden list, one by impulse and one by plan. The display
  guardrails protect the screen, not the stack. Hence the refinements below.

**Strong, lean on it.**
- The "toward …" line is the hinge for everyone: the reason sits next to the step, in the user's
  words, with no count.
- After a month away, the crumb greets you with your past self's reason, the warmest re-entry the
  app has.
- Shrinking a step without erasing the aim (C: the kindest gesture in the app).
- Only one staged step, so Home stays stable.
- Model A adds no new kind of thing.

**Refinements folded in** (inside the proposal):
1. **Wording.**
   - The action is **"+ a step toward this"**: relational, not "before that", which reads as a
     sequence or prerequisite.
   - The word "chain" is never shown on screen. The thread-page view is called "toward".
   - "Let these go" (with Undo) replaces "Clear the chain".
2. **The Home crumb stays as today**: two targets, plus the "toward …" line when a stack exists, and
   it wraps rather than truncates. Add, remove, "let these go", "done it already" and "make this a
   thread" all live behind the existing ✎ (thread page). "Log this" stays one tap.
3. **One step per "+" tap.** The input closes after one step, so there's no add-another loop.
4. **"Done it already"**, on the thread page: clears the top step without logging, with Undo.
   Nothing is detected or applied automatically.
5. **The logged activity keeps its "toward …" as plain text** (not a link). The toast says "Logged in
   draw, toward practice head proportions" and speaks it once, politely. Focus never moves.
6. **The base of a stack is its thread or why**, which is never a loggable step. Whys don't turn into
   tasks.
7. **Promotion keeps the relationship visible.** The new thread's first log presets a visible "to"
   chip, and the toast says "Now a thread, toward draw. Undo". It's only on request, never suggested
   by counting recurrence.
8. **The "toward" view on the thread page shows only staged steps**, as a sentence ("A → toward B →
   toward C"): no dates, ticks or numbers. *Earlier* rows show only the top step.
9. **Export carries the whole stack and round-trips**, and older versions see the top as `next`.
10. **Accessible name starts with the visible text**: "{step}, toward {why}, Log this. Next step for
    {thread}…". Focus lands on the result after remove, let go or promote.

**Offered to the owner as options.**
- Model A (all six personas) or B.
- Whether a deeper step can be chosen and logged directly ("select and do"). D wants it; to F it
  reads like a checklist.

**Refused, with the rule.**
- %, "3 of 5", checkmarks, milestones (B): never-list, "no plans for the how".
- A per-thread idea list (A): no plans for the how.
- Steps that expire or pop automatically when the typed text is similar (A, E): nothing applied
  silently.
- Nudges about untouched steps (F): no notifications.
- A pause timer after a log (C): no timers. The surfaced step simply stays calm instead.

**Against the owner's notes (P0).** It keeps the owner's mechanics: one staged step, stacking on top,
each step an intention, a quick tap to do it. It refines the words and where controls live. The one
gap A leaves against the owner's "X to Y chains" is that chains reach the graph only through
promotion plus logging. The preset "to" chip (refinement 7) is the cheapest bridge. Showing them in
the graph immediately is option B.

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
