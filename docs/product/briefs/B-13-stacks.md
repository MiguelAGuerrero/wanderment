# B-13 — Stacks: the things that hold your place

**Status:** draft for the owner · **Date:** 2026-11-25 · **Replaces:** P-94's flat queue (halted)

## The owner's words (owner-notes, 2026-11-25)
> "A routine is an execution, but it holds no state. Well, a stack inherently holds state. So if I wanted
> to hold a stack for how to navigate my desire to be a better drawer, that will ultimately change in how
> it's formed … one day I'll want to practice hands, another day full body, learn color theory … a routine
> can't necessarily capture that, because that's constant … practicing hands might be its own routine,
> but I can queue that work into the [drawing] stack whenever I want to. And then I can use that whole
> stack as one component of a greater thread to represent one meaningful chunk of my day … every time I
> resume control of the practice drawing stack … I know where I'm at and what it means in the greater
> scheme of things, because the stack itself represents the state of that. It offloads holding that in
> my head."

> "Everything in the queue can operate its own main thread … queue up stuff into it, run routines, reset
> at that level … And you can keep doing this at any level."

## 1. The entities

The app has been one entity, the routine, with a run hidden behind it. The owner's distinction gives two.
**A routine is a recipe. A stack is a place.**

| | **Step** | **Routine** | **Stack** |
|---|---|---|---|
| What it is | one small doable thing, in your words | a way of doing something, kept and run again | a body of ongoing work and where you are in it |
| Holds state? | no | **no** — the same every time | **yes** — what's in it, what's next, where each thing was left |
| Changes how? | reworded | deliberately, in **Plan** (changes it everywhere) | by working it: push, finish, switch, offload |
| Contains | — | steps, other routines, a Repeat divider | steps, routines, other stacks, a Repeat divider |
| Done means | go to the next | its last step done → it leaves the stack it is in | never "done" by working; it can be empty and still matter |
| Example | "Draw ten hands" | "Hands warm-up" (3 steps, repeat 3×) | "Get better at drawing" |

Two more words, both already built in some form:
- **Entry** — one line in a stack. It is a step (a one-off), a routine, or a stack. An entry that is a
  routine carries its **place** (today's *run*): which step, which round. The run stops being a thing of
  its own and becomes the state of a routine entry.
- **Main stack** — the stack at the root. Home *is* it. Nothing else is special about it.

The rules that fall out:
1. **Stacks nest; routines are referenced.** "Get better at drawing" can be an entry of the main stack;
   "Hands warm-up" can be an entry of "Get better at drawing" today and of nothing tomorrow.
2. **A stack is one place, wherever it is slotted.** Slotting "Drawing" into the main stack is a
   reference, not a copy: resume it from anywhere and you are where you left it.
3. **Pushing work never changes a routine.** Work you add while inside a routine goes into the stack
   around it (next, or later). Only Plan changes a routine. *(This answers question 1 of the last round.)*
4. **Reset belongs to routines.** Starting a routine entry over clears its place and the places below it;
   a stack is not reset — you take entries off it. *(Question 2.)*
5. **Plan is for routines; a stack is worked, not planned.** Plan keeps its blueprint band because
   changing a recipe is a different act from working a stack. A stack's screen is the list with HERE and
   held places. *(Question 3: not one screen — the difference is the point.)*
6. **Staples are a Repeat divider in a stack.** Entries under "Repeat from here" in a stack come back
   when the stack reaches its end — the daily sketch on the main stack. Same control as in Plan.
7. **A routine may point at a stack.** A step "Work on drawing" that is the stack "Drawing" means: go in
   and do what is next there. A recipe pointing at a place — the recipe stays stateless.

## 2. A traditional journey, and its analog here

The reference journey is the common one in list-based to-do and goal apps (Todoist, Things, TickTick,
Apple Reminders for capture and projects; Strides, Habitica for goals and habits). *(From the designer's
knowledge of those products, not researched this session.)*

| # | In a to-do / goal app | Here | Strength | Weakness / missing |
|---|---|---|---|---|
| 1 | **Capture**: quick-add "practise hands" to the Inbox | "+ Add" in the stack you are in (Home = main stack) | lands *in context*; no Inbox to triage later | capturing for *another* stack from where you are needs "Add to…"; **not built** |
| 2 | **Organise**: a project "Drawing" with tasks | a stack "Get better at drawing" with entries | the stack remembers where you are, a project doesn't | **stacks not built**; today only routines exist |
| 3 | **Goal**: "Draw better" with milestones and % | the same stack; no milestones, no % | no scoreboard, no guilt (product rule) | someone who wants progress gets none — deliberate |
| 4 | **Break down** a task into subtasks | a step → Break it down: in a routine, in Plan (changes the recipe); in a stack, it becomes a small stack in place | breaking down is where you are, at the size you need | two meanings by where you stand — must look different (Plan band vs stack) |
| 5 | **Recurring task** "sketch daily" with a due date | a staple: an entry under the stack's Repeat divider | comes back without dates or overdue red | "comes back" is by order, not time; no "every Monday" — deliberate for now |
| 6 | **Template** project | a routine; Start it or slot it into a stack | one recipe, many uses, edited once | none |
| 7 | **Plan today**: drag tasks into Today | push stacks and routines onto the main stack, in order | Today keeps your place inside each thing | the main stack does not empty at midnight; old entries linger until taken off |
| 8 | **Do**: open a task, check it off | the runner: one note, Next / Done | one thing at a time; the order does the remembering | Done's level (step, routine, stack) must be named on screen — needs the **trail** |
| 9 | **Interrupted**: open another task | Pause, switch to another entry (tap it), come back later | **the core strength**: every level holds its place | switching inside a nested stack must show where you landed (trail) |
| 10 | **Something comes up mid-task** ("buy ink") | offload it into the current stack, next or later, without leaving the note | offload is the point of the app | **not built**: the runner has no capture |
| 11 | **Waiting on someone** (job reply) | a Wait step; the entry reads "waiting for … · since" | honest, no fake due date | no nudge when it resolves — by design |
| 12 | **Weekly review**: projects, what's stuck | "Your stacks": each stack, what's next in it, what's waiting | review is reading places, not counts | **not built**; nothing looks back (designed, not built) |
| 13 | **Finish a project** / archive | a routine entry leaves when done; a stack stays (empty is fine) until you take it off or delete it | a goal that is never "complete" is allowed | removing vs deleting a stack must be clear (one takes it off a parent, one erases it everywhere) |
| 14 | **Rename / delete** | routine: in Plan; stack: its menu; delete asks and names where it is slotted | one name, everywhere | delete of a stack slotted in several places must say so |

### What this says about the app today
- **Strong already:** the runner (one note, three buttons), Plan as the recipe surface, Wait steps,
  routines that repeat, everything holding its place inside one routine.
- **The gap is the stack.** Today a "place" exists only inside one routine; nothing holds an evolving body
  of work, so home is a grid of separate recipes and a search box — the owner's "it just starts a whole
  bunch of things".
- **Two things every to-do app has that this lacks:** capture from anywhere (row 1, 10) and a review of
  where everything stands (row 12).

## 3. What it looks like
- **A stack's screen** (Home is the main stack's): the trail at the top (`Main › Drawing`), the entries in
  order, the top one with the one filled button (Resume / Start), held places shown on their rows
  ("❚❚ at Shade the sphere"), waits in place, "Repeat from here" where staples begin, "+ Add" at the bottom
  (one-off, routine or stack). Tapping an entry: a step or routine → switch to it and run; a stack → go
  into it.
- **The runner**: as now, with the trail as its context line (`Drawing › Hands warm-up · round 2`) and a
  way to offload ("Later: …") without leaving the note.
- **Plan**: unchanged — for routines only.
- **Your stacks / Your routines**: the shelves you pull from, reached from "+ Add".

## 4. Proposed slices
1. **Stacks** (Full — new stored entity): a stack holds ordered entries (one-off, routine with its place,
   stack reference); Home is the main stack; add, switch, move, take off, go in and out; the trail; existing
   paused runs become entries of the main stack. Uses the golden fixture frozen at `0e98cf3`.
2. **Offload from the runner** ("Later: …" into the current stack).
3. **Staples**: the Repeat divider in a stack.
4. **A routine step that is a stack.**
5. **Your stacks** — a review of where everything stands.

## 5. Questions for the owner
1. **Is "stack" the word on screen**, and does the main one need a name ("Main", "Today", nothing)?
2. **Can one stack be slotted in two places at once** (same place, shared), or only one parent at a time?
3. **When a staple comes back**, is it when the stack reaches its end (proposed), or each time you open
   the stack fresh, or never automatically?
4. **A one-off typed at home** — always a step in the main stack (proposed), or offer "new stack" too?

## Decision requested
**D-21:** Go on stacks as the second entity, with slice 1 first? **Go** / **Go, but change …** / **Not now**.
