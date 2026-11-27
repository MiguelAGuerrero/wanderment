# B-16 — A thread with its own queue: open work that a process keeps moving

**Status:** go (D-23, 2026-11-26) — after P-97 and a week of real use · **Theme:** Reuse; Written by running ·
**Date:** 2026-11-26 · **Builds on:** B-14 slice 2 (threads that hold threads) · **Would reorder:**
P-98, P-99, P-100

_Drafted in a second session while P-101 was being built in the first. It adds no roadmap item and no
decision entry; those are added by whoever lands it, once the owner has read it. The persona panel has
not been run: it waits for P-101, which changes the runner and home the panel would look at._

## The problem, in the owner's terms
The owner asked for an assessment and then described what is missing (2026-11-26, this session):

- "A discipline app where I can … hold all context of what I want to do … without having to have the
  entire … vision in my head. I can define blockers for myself, … easily define steps to achieve those
  blockers, understand how those blockers fit into the goals I want to pursue."
- The origin: "it's kind of hard to apply every method and have that in your head while you're doing
  something … what if I always have reference to how to actually engage with an activity in order to
  draw the most learning and reflection from? … that can be generalized to any activity."
- "There's a construct that's missing in order to make those pursuits legible and making the next steps
  a first-class citizen … routines can produce work and tasks that can be queued up in the context that
  it will spawn. So there's always something else to do on the basis of the work I've done … a construct
  such as blocked by gives me a reason to understand why I'm drawing in the first place."
- "Define abstract goals, which are made concrete through routine work and ultimately emerges in
  progress over time without having to always think about the big picture … encode the idea of trust
  the process."

Asked what is lost when hopping between the things they work on, the owner chose "the next concrete action" and "what
I'd decided or made". Asked what "discipline" means as an outcome: "staying oriented".

Earlier notes say the same thing from other sides: "nothing really in the app represents a pursuit or
goal right now" (2026-11-25); "a function generating a task on the queue with its own context"
(MyStack, 2026-11-26).

**Where the evidence stands** (corrected after the owner's objection, 2026-11-26: "I have been using
the app … deliberately against itself as a means to help hone my ability to develop a product. So there
is real use"): the owner has run a product-iteration routine on the app itself, and it produced the
MyStack page. Each pass of that routine ends in concerns the owner carries by hand into Notion because
the app has nowhere to keep them. That is direct evidence for slices 1 and 2. Not yet tested: several
threads at once, and coming back after days to work whose subject is not the app.

## Evidence
- Owner notes: 2026-11-25 ("A routine is a function; a pursuit holds the goal"; "The pain point";
  "Long-term goals, reps versus recipes"), 2026-11-26 (MyStack later entries; this session).
- Discovery: none commissioned.
- The app today (build 5302075, seeded with drawing, an EP, a game, research and apparel):
  - "Become a better drawer" is a routine tile of the same kind as "Research a question".
  - A value exists only if "Gives…" was set on a step beforehand; it belongs to one run, starts empty
    when the routine starts again, and is cleared by each new round after the divider.
  - A reflection routine's result ("one point of improvement") is therefore gone by the next rep, which
    is when it is needed.
  - An existing routine can be stepped into when it is already an item, but cannot be added as a step
    in Plan (designed, not built).

## The model
One addition to what exists. The words in the left column are descriptions for this brief and are
never shown in the app (DESIGN.md: thread, stack and the rest are never words on screen).

| Programming idea | In the app | What it holds for the person |
|---|---|---|
| Function | A routine: a method, reusable anywhere (built) | How to engage |
| Thread | A routine on home that keeps open items | What there is to do, across runs |
| The thread's queue | Its open items, each one line of the person's words | The next steps, as first-class things |
| Dependency | An item is **for** the item above it (the owner's "blocked by", read upward) | Why this is being done |
| The thread's loop | The thread's own steps with Repeat from here: its process | The same way in, every time |
| Spawn | A step that **gives work** into the open items | What follows from what was just done |
| Call | A method run on the chosen item | Methods applied where they fit |
| Scheduler | The person, on home | Nothing; home shows each thread's next step |

- **The next step** of a thread is its deepest open item, found depth-first (owner, 2026-11-26:
  "depth-first … only the leafs").
- **An item is cleared** when the person says so, and an item with smaller items under it is offered as
  cleared when they are all gone. Smaller items have no order: the person picks. This is the owner's
  "In any order", without a separate construct.
- **A thread is open-ended** and never finishes ("Become a better drawer"). A concrete outcome ("Finish
  the character sheet") is an open item inside it, done when nothing under it is open.
- **Trust the process:** the open items are shown at one step of the loop ("Pick what to work on") and
  in the pull-up panel. Everywhere else the runner is one note, as now.

## Proposed experience
`[Button]` is a button, `[[Button]]` the one filled button, `{focus}` a name chip.

### Journey 1 — The process of a thread (Plan)
```
PLAN
Become a better drawer
  Pick what to work on                 gives {focus} · from its open items
  ── Repeat from here ──
  Deliberate practice                  with {focus}
  Reflect on a rep                     with {focus} · gives work
+ Add a step
```
"Pick what to work on" is an ordinary step whose Gives… sheet has one more choice: **from its open
items**. "Reflect on a rep" is an existing routine added as a step.

### Journey 2 — Picking (the runner)
```
Become a better drawer
┌──────────────────────────┐
│ Pick what to work on     │
└──────────────────────────┘
  Hands in perspective           for Character sheet
  Forearm proportions            for Hands in perspective
  Gesture, 30 seconds
  + something else
                                  [Step in] [Step out] [[Next]]
```
The open items are listed under the note with what each is for. Tapping one fills `{focus}`; "+
something else" takes typed words and adds them as an open item. This is the only running screen that
shows more than the step.

### Journey 3 — Doing (the runner)
```
Become a better drawer › Deliberate practice
{ } focus: Forearm proportions · for Hands in perspective
┌──────────────────────────┐
│ Draw 10, 30 seconds each │
└──────────────────────────┘
```
The path and the values row are the ones built today. The "for" is the why, one line, in words.

### Journey 4 — A step gives work
The last step of "Reflect on a rep" is "Pick one point of improvement", set in Plan to **give work**.
Under the note is its field, as a giving step has today. What is typed there becomes an open item of
the thread, for the item that was the focus. Left empty, nothing is added. No notice (giving a value
for the first time leaves none today).

### Journey 5 — Coming back (home)
```
Become a better drawer
next: Forearm proportions · for Hands in perspective
```
The tile's line is the thread's next step and what it is for. A routine with no open items reads as
today ("at <step>").

### Journey 6 — Clearing and dropping
In the pull-up panel on a thread: its open items, each with **Cleared** and **Drop**. Both remove the
item with one Undo. Dropping is as cheap as clearing, and nothing counts either.

### Edges
- **Empty:** a routine with no open items is exactly today's routine. Nothing new appears.
- **Many:** open items scroll under the note; none is ranked, aged or marked overdue.
- **Screen reader:** each item is read with what it is for ("Forearm proportions, for Hands in
  perspective"); the picking list is a list with a heading.

## Fit with the product
- **DESIGN.md, "The runner is the step and nothing else":** Journey 2 puts a list under the note on one
  kind of step. That is a tension, kept narrow: it appears only on a step that gives from open items.
- **"Nothing is counted against you":** open items carry no count, date or age. Looking back, if
  built, is a list in words.
- **"Never shown as words":** thread, queue, spawn, blocked and dependency stay out of the app. The
  word on screen is "for".
- **"Stored data is never deleted or converted":** open items are a new kind of record on a routine.
- **STRATEGY.md:** advances Reuse (methods applied to any item) and Written by running (the open work
  is written by reflection, not by planning ahead).
- **Not doing:** a global queue across threads; due dates, priorities or ordering of items; an item
  shared by two threads; items that start by themselves; conditional steps.

## Where this differs from what the owner has already said
Raised by the implementation session, from owner-notes. Each is the owner's to settle.
- **In any order.** The owner framed its parts as threads with their own stack, "done once that single
  thread returns", each returning a value, then joined (2026-11-26, "Are threads routines?"). This
  brief replaces that with unordered items under an item. That is simpler and loses returned values
  and a part having its own steps and place. If parts need those, P-99 stays as designed and sits
  beside this.
- **The work queue.** The owner asked for a queue across threads ("plan my day", "load up each stack
  in order"), leaves only, and said Start may be retired in favour of enqueuing from each thread. Open
  items per thread do not replace that. They are what such a queue would hold: P-100 comes after this
  brief, not instead of it.
- **Capture.** The owner: "unless the results determine how to proceed … I don't think the app should
  be supporting capture." Open items stay inside that line only if they are work that drives what is
  next. They take no notes field and no long text.
- **Rounds clear values.** Unchanged. An open item belongs to the thread, not to the run, so a new
  round does not clear it; `{focus}` is still asked again each round.
- **Agreed already:** "a routine … generating a task on the queue with its own context" (MyStack) is
  Journey 4; gives / asks, hoisted gives and the call-stack trace (P-101) are used as they are.

## Persona panel
Not run yet. It waits for P-101 to land so the panel sees the runner and home as they will be.

## Slices
1. **A thread keeps open items** `[data]` M (Full tier). A routine can hold open items: added from the
   pull-up panel, Cleared or Dropped with Undo, kept across runs, in export and import. Home shows
   "next: <item>". *Done when:* an item added in one run is there in the next run and after a reload,
   an export and an import.
2. **A step gives work** `[data]` S. Gives… offers "work"; what is typed joins the open items.
   *Done when:* a reflection step's answer is an open item on the next run.
3. **Pick from open items** `[ux]` M. Gives… offers "from its open items"; the runner lists them under
   the note. *Done when:* the picked item fills the name and later steps read it.
4. **Add an existing routine as a step** `[data]` M (the call part of P-98). *Done when:* Plan's Add
   offers a routine by search and its row shows what it reads from above.
5. **Items for items** `[data]` M. An item can be added under another; the next step is the deepest
   open one; the path and tile say what it is for. *Done when:* clearing the last smaller item offers
   its parent as cleared.
6. **Looking back for a thread** `[ux]` S. A list, in words, of what was cleared and given.

## Data and risk
- A new stored collection or field (open items per routine) that every storage path must carry:
  the journal, export, import and its preview, and the golden fixtures.
- An item given by a run that is then undone (Undo on Done, Back to) must leave with it.
- The backlog risk: if every run gives work, a thread grows a list the person feels behind on. Giving
  work is one deliberate step, Drop is one tap, and nothing is counted. Real use will show whether
  that is enough.

## Alternatives considered
- **Do nothing, and use the app for a week first** (recommended before slice 1). Today's app can run
  the loop shape: Repeat from here with a first step that gives `{focus}`. What will be missed is the
  open items, because each round clears what the last one gave. If it is not missed, slice 1 is not
  needed.
- **The roadmap as it stands** (P-98 for each, P-99 In any order, P-100 the queue). It adds more
  language before anything real has been run, and none of it keeps a method's result across runs.
- **Values that outlive a run.** Smaller, but a kept value is not something to do and has no "for".
- **A global queue first (P-100).** It schedules next steps; this brief is where next steps come from.

## Answered by the owner (2026-11-26, in the session that drafted this)
- **Order:** "Use it a week, then B-16." Nothing new after P-97 until one real piece of work has been run for
  a week; then slices 1–4, with P-98 to P-100 after.
- **In any order:** "Both, items first." This brief's unordered items first; P-99's child threads that join
  afterwards, for parts that need their own steps.
- **Giving work:** "By itself." What is typed on the step becomes an open item at once.
- **Concrete outcomes and open-ended aims:** "join it as part of the pursuit." Read as: a concrete
  outcome ("Finish the character sheet") is an open item inside an open-ended thread ("Become a better
  drawer"), not a second kind of thing on home. The thread never finishes; its outcomes do.
- **The word:** "pursuit" was a working term. This brief says thread and queue, the owner's own model
  (a thread with its own state, work queued onto it); neither word is shown in the app.

## Questions asked (all answered above)
2. When a step gives work, does the item appear by itself, or only when accepted at the end of the run?
   Proposed: by itself, since typing it was the choice.
3. Do slices 1–4 go ahead of for each (the rest of P-98), In any order (P-99) and the queue (P-100)?
   Proposed: yes, after a week of real use.

## Decision requested
Not asked yet. When it is: *Go on B-16, slice 1 first, ahead of P-98 to P-100?* **Go after a week of
use** / **Go now** / **Go, but change …** / **Not now**.
