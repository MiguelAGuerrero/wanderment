# B-16 — Amendment to P-98 and P-99: order is dependency, and a for each whose list can grow

**Status:** go (owner, 2026-11-27: "Go on the amendment, P-98 follows P-97 directly") · **Decision:**
D-23, restated: P-98 and P-99 are built in the queued order with the additions below, and P-98 follows
P-97 without a week's wait · **Theme:** Reuse; Written by running · **Amends:** P-98 (routines as
steps, for each), P-99 (In any order) · **Order:** P-97 → P-98 → P-99 → P-100

_The first version of this brief (2026-11-26) proposed "open items" kept beside a routine's steps,
picked through a sheet, with Cleared and Drop. The owner found that model off, and the conversation
that followed arrived somewhere simpler: the batches already designed are the right ones, with one
addition. This file now says only that. The earlier text is in git (`5d870b4`)._

## What the owner said (2026-11-27, in the session that drafted this)
- "I think the model is a bit off. A routine should contain threads that contextualize their own work.
  Open items would represent a task on its own queue that we dequeue when we are ready. Or another
  model is that the routine defines steps, generates steps in its place to represent future work."
- On work from outside: "if a routine was able to generate arms, legs, and eyes, but later down the
  line I would want to say, 'Oh well, I want to learn how to draw cartoons too,' where does that get
  inserted?"
- On a second kind of work: "What about a completely different thread that requires its own
  processing? … study color theory … You're not going to put it within that list to be processed the
  same way as drawing."
- On dependency: "there should be a way to devise a system that composes itself such that being
  blocked by something is not explicit, but just a consequence of the arrangement of the work itself …
  unless we use conditionals, we have to rely on the sequence of work in order to achieve cases where
  things become dependent on each other. We need serialization between concurrent threads … Either a
  step needs to be able to generate that work to be sequenced before the line art, or to be joined
  before the line art proceeds, or we have to input that explicitly."
- On the aim: "provided the routines are well structured, [it] can compose itself up to arbitrarily
  complex procedures, where the user doesn't have to think. They just have to trust the process."
- On surprises: "Is there a way to produce a routine such that those surprises are accounted for, and
  they generate the next steps … I'm wondering if this is a discipline that has to be acknowledged or a
  capability that has to be coded for." Then, of a loop that ends when nothing more is given: "I
  believe that concept is a 'for each.'"

## The discipline: three rules
The known domain is structured concurrency: dependency is never declared, it is only a consequence of
sequence and nesting. None of these words is shown in the app.

1. **Order is dependency.** A step waits on whatever stands before it and has not finished, and on
   nothing else. There is no "blocked by" and no link between one piece of work and another.
2. **An empty list is "no".** A step asks; a for each does the work for each thing answered; with
   nothing answered it does nothing and the routine carries on. This is a condition without a
   conditional.
3. **Parts taken in any order join before what follows.** The step after an In any order block is
   reached only when every part has returned (P-99, as designed).

A routine written to these rules composes without the person tracking what waits on what.

## The additions: a list that can change, and a value that is a routine
P-98's for each runs over a list a step gave earlier in the run. Two things are added. Both are still
"gives".

### A list is changed by giving it again
The owner (2026-11-27): "Right now, I don't think there are any mutations or writes that steps perform,
so the only way we keep state is if a routine steps forward. And somehow, we can overwrite the value
presented, so there might be a step that asks to adjust the list. Like a review step." Taken as the
rule, in place of this brief's earlier "adds to" and of items leaving by themselves:

- **A step that gives a name which already has a value is shown that value to adjust**: add, remove,
  reword. That one mechanism is how a list grows, is thinned and is reviewed. Steps write nothing else.
- **Running over a list does not use it up.** A for each keeps its place; items stay unless the person
  removes them.
- **A for each ends when it passes the last item.** Items added while it runs stand after its place, so
  it carries on to them; a round in which nothing is added is the last.
- **A list can be kept in the routine**, across runs: its items are rows under the for each in Plan,
  with **+ Add** there and on the routine's tile. Because items stay, a kept list suits standing sets
  ("the subjects I practise") as well as work.
- **The cost, accepted for now:** a one-off item does not leave when it is done; it stays until a step
  that adjusts the list, and comes round again on the next run if it was not removed. If that proves a
  chore in use, "done items leave" can become a choice on the for each without changing the model.
- **Reach.** A step can give a list held at its own level or a level above it, the reach names already
  have, so one part can adjust a list another part runs over.
- **When an adjusted item comes round:** in the next sitting, not the same one (owner, 2026-11-27: "the
  next"), for a kept list whose for each has already passed it.
- **Running adds work; planning adds structure.** A running step can change a list's items. A new
  part, a new list or a new method is added in Plan.

### A value can be a routine, and then it is a call
The owner (2026-11-27): "The ability to supply a routine as an output would make sense, so long as we
have the capability to support that output as a function call and not necessarily a string to be
interpolated. We just have to be considerate about whether that routine is given all the values it
needs in the context of where it's called … if I'm in a routine and I'm doing research … and all of a
sudden I need to research an additional question, I would want that step to allow me to specify a
research task. I provide the inputs into the routine for research, and it [queues] it onto the thread."

- **Giving a routine.** In a giving field, the person's routines are offered as they type. Plain words
  stay words. A routine that is chosen is a call, not text.
- **Its inputs are filled where it is given.** Choosing a routine shows what it asks, one field each
  ("question"). What is typed there travels with the call.
- **Where each input comes from, in this order:** what was typed when the call was given; then a name
  of the same spelling visible where it runs (the by-name passing already decided on 2026-11-26); then
  it asks when run. So a call can never be missing an input: the worst case is that it asks.
- **Running it.** A step that reads the value ("Do {task}") is a call when the value is a routine:
  Step in works, the path shows it, and it returns what its call row says it gives. When the value is
  words, the step reads as words, as today.
- **What a caller can rely on.** Plan can only show what a call gives when it knows which routine it
  is. So where the kind of work is known, write the call in the routine
  (`For each {question}: Research a question · with {question}`, plain P-98) and later steps can read
  its results by name. A routine given as a value is for when the kind of work is not known until the
  moment; what it gives is seen in the trace, and a later step that needs it asks.
- **One-off work is a value.** A chore that arises inside a larger aim is words given at a step and
  done at the next; it needs no queue of its own.

## The patterns (discipline, not features)
The owner's reading, taken here: the loop that comes round until nothing more is given **is** a for
each. No new kind of Repeat is needed.

**Ask, then resolve** — a dependency discovered at a known point:
```
Make a piece
  Thumbnail {piece}
  List what you can't draw yet               gives {gaps}
  For each {gap}
    In any order
      Practise · with {gap}
      Study · with {gap}
  Line art
  Colour
```
"hands" typed at the asking step runs Practise and Study on hands, in either order; Line art stands
after the block, so it waits for both (rules 1 and 3). Nothing typed: straight to Line art (rule 2).
Another piece, "legs" typed: the same Practise routine, nothing copied.

**Attempt, ask, resolve, again** — surprises accounted for by the shape:
```
Line art, until it works
  Attempt the line art for {piece}
  List what stopped you                      gives {gaps}
  For each {gap}
    In any order
      Practise · with {gap}
      Study · with {gap}
    Attempt the line art for {piece}
    Adjust the list: what else stopped you   gives {gaps}
```
Each gap is worked, the attempt is made again, and the list is shown again to adjust. The for each
ends on the attempt after which nothing is added. No Jump to, no stepping back, no edit mid-run.

**Work nothing is waiting on** — a kept list, added to from inside and outside:
```
Become a better drawer
  In any order
    Practise
      For each subject:  arms · legs · eyes        + Add
        Deliberate practice · with {subject}
        Adjust the subjects: what else to improve  gives subjects
    Study
      For each topic:  colour theory               + Add
        Find a guide or video on {topic}
        Close it and write two lines from memory
```
"I want to learn how to draw cartoons too" is + Add on subjects. A different kind of work with its own
processing is a second part with its own list and method (P-99), each keeping its own place.

**From one part to another** — the owner (2026-11-27): "threads can produce values that can be little
tasks that can be pushed in other threads, like inter-thread communication … a prompt in my studies …
makes me realize, 'Oh, I should really practice this,' but practice is its own thread."
```
Become a better drawer
  subjects:  arms · legs · eyes                    + Add      ← kept at the level above both parts
  In any order
    Practise
      For each subject
        Deliberate practice · with {subject}
    Study
      For each topic:  colour theory
        Find a guide or video on {topic}
        Adjust the subjects from what you read     gives subjects
```
Parts never reach into each other. The list is held one level up, where both can see it: Study
adjusts it, Practise runs over it. Which model to use follows from rule 1: if the practice must be finished
before the study carries on, it is a step in Study's own sequence (Practise called there); if not, it
is an item added to the list of the part that does that work.

**Work it out as you go** — the owner: "a step can produce another step … That would recursively keep
prompting for next steps until you eventually supply a routine that's sufficient enough to be
long-standing, or reference another routine that actually is the work to be done."
```
Work it out as you go                                asks {aim}
  List the first steps toward {aim}                  gives {steps}
  For each {step}
    Do {step}
    Adjust the list: what does that make possible    gives {steps}
```
A step typed as words is a one-off. A step given as a routine is stepped into, with its inputs filled
where it was given. The for each ends on the round in which nothing is added. In today's app the same
shape is "Repeat from here" above "Name the next small step · gives {next}" and "Do {next}".

**A further question, mid-research** (the owner's example):
```
  For each {question}
    Research a question · with {question}
    Adjust the list: what else needs answering       gives {questions}
```
The kind of work is known, so the call is written in the routine and its results can be read by name.

**When a surprise has no step yet:** the method gains the asking step in Plan, once. Every later run
asks by itself. This is how a method is sharpened by running it.

## What P-98 and P-99 gain (to add to their *Done when*)
**P-98**
- A step that gives a name which already has a value shows that value to adjust; this is the only way
  a list changes. No "adds to", and no item leaves by itself.
- A for each keeps its place, carries on to items added after it, ends when it passes the last item,
  and passes straight through an empty list.
- A for each can run over a list kept in the routine: rows under the block in Plan, + Add there and on
  the routine's tile; items stay across runs, reload, export and import.
- A step can give a list held at its own level or above, so one part can adjust a list another runs
  over.
- A giving field offers the person's routines; a routine chosen there is a call, with a field for each
  thing it asks; a step reading that value steps into it. Inputs resolve: typed where given, then by
  name where it runs, then asked.

**P-99**
- An In any order block inside a for each keeps each part's place per item.
- Stated as a test: the step after the block cannot be reached while any part has not returned or been
  stopped.

**P-100** is unchanged and comes after: the queue takes the next step from any part of any routine. Two
separate routines on home never wait on each other (rule 1 stops at a routine's edge); the queue is
where work across them is lined up.

## With P-99: where every part stands (the tree view)
Asked for by the owner, 2026-11-27: "Scope the tree view alongside P-99". Once a routine has parts
taken in any order it has several places at once, and the runner shows one. Without a view of all of
them, "staying oriented" breaks inside a routine the way it used to break across routines.

**Where it lives.** No new screen and no new navigation entry.
- On the runner: the pull-up panel, which already holds "where you are in this run".
- On home: the same view opened from a routine's tile (DESIGN.md's designed "Map of a tile's contents").

**What it shows.** The run as a nested list, from the routine down:
```
Become a better drawer
  Practise            at Deliberate practice · subject: hands        ← you are here
  Study               at Close it and write two lines from memory · topic: colour theory
  Artwork             waiting for feedback on the thumbnail · since Tuesday
```
- One line per part, in the app's existing wordings: "at <step>" with its values in place, "waiting for
  <words> · since <day>", and for a part with no place yet, its first step. A finished part and a
  stopped part read differently, in words.
- A part that holds parts opens to show them; parts you are not in stay one line each.
- A for each shows the item it is on. A kept or growing list shows no count and nothing about how much
  is left.
- The part the run is in is marked, by words and by the mark, never by colour alone.

**What it does.** It is also the chooser P-99 needs: tapping a part goes to it, which puts down the
part you were in at its place and takes up the other at its own. Nothing else is done from here; adding
or changing parts is Plan's.

**The tile.** A routine with parts reads the part last touched: "Practise · at Deliberate practice".

**Done when** (added to P-99):
- the pull-up panel of a run inside an In any order block lists every part of every level the run is
  in, each with where it stands, in the wordings above;
- tapping a part moves the run there and each part keeps its own place and values, across a reload;
- the same view opens from the routine's tile on home when the run is paused;
- a finished part and a stopped part are told apart in words, and that record survives export and
  import;
- at 390 px and at 200 % text every line wraps and none is cut; each row has a full spoken name ("Study,
  at Close it and write two lines from memory, in Become a better drawer") and is at least 48 px;
- no count, percentage or "left" appears anywhere in it.

**Data.** A derived view: it reads the places P-99 already stores for each part. The one stored
addition is how a part ended (finished or stopped), which belongs in P-99's own contract.

**Considered instead:** marking every part's place in Plan. Refused because Plan is planning, entering
it puts the run down, and "planning and running must never look alike".

**Not in this scope:** the same view across all routines (that is home, and later the queue, P-100);
reordering or editing from the view; history of past runs (Looking back).

## Fit with the product
- **"Values belong to the run, never the routine."** A kept list is the one exception: it belongs to
  the routine. DESIGN.md would need that sentence; a proposal, not an edit made here.
- **No conditionals** are added. Rule 2 does their job.
- **"Nothing is counted against you."** A kept list has no dates, ages or totals. P-98's "photo 2 of 3"
  inside a for each is context for a list the person just gave; for a kept or growing list the "of 3"
  would read as how much is left, so it is left out there.
- **"Never shown as words":** thread, queue, join and the rest stay out of the app. On screen: For
  each, In any order, gives, asks.
- **"The runner is the step and nothing else"** is untouched: nothing here adds to the runner.

## What is withdrawn from the first version
Open items beside the steps; picking in a sheet; Cleared and Drop; an item "for" another item;
"Blocked by…" as a move; "next:" on the tile; six slices of its own.

## The persona panel, and what carries over
The panel (2026-11-27; `.polish/product/panel-B-16-1.md`, `-2.md`, local) read the first version.
Simulated perspectives, not user research. Most of what it found were symptoms of the model that is
now withdrawn. Three findings still apply:
- **A list that only grows is the backlog risk.** Items now stay until removed, so this risk is
  larger than before: a step that adjusts the list must be part of every pattern that grows one, and
  nothing may count the list.
- **Long text.** An item is one line; a paragraph typed into a list must wrap and never be clipped.
  One seeded case in P-98.
- **Screen readers.** A list that changes while it is being run needs the addition spoken, and focus
  that does not move.
A new panel is not asked for: this amendment stays inside the shape D-22 and the canvas already set.

## Data and risk
- A kept list is a new stored field on a routine, carried by the journal, export, import and its
  preview, and the golden fixtures (Full tier, inside P-98).
- A for each that grows without end: the person can always Step out; nothing runs by itself.
- A kept list shared by two open runs of one routine: each run keeps its own place over the same
  items, and an adjustment made in one is seen by the other. To be settled in P-98's contract.
- A value that is a routine is a new kind of stored value (a reference and its typed inputs), carried
  by every storage path; a routine that is later removed leaves the value reading as its words.

## Alternatives considered
- **The first version** (open items, links, Blocked by…): a dependency graph kept by hand. Withdrawn.
- **"Repeat until a step gives nothing"** as a third kind of Repeat: the owner's reading, that it is a
  for each, removes the need.
- **A routine that rewrites its own steps:** the list changes and the steps do not, which keeps a
  method the same everywhere it is used (owner, 2026-11-25: "it's a function").
- **Do nothing:** P-98 and P-99 as designed already cover "ask, then resolve". They lack the growing
  and the kept list, so "again" and "cartoons too" would need Jump to or a Plan edit each time.

## Trying the discipline before anything is built
Today's app can run one gap per round:
```
  ── Repeat from here ──
  Attempt the line art
  Name the one thing that stopped you        gives {gap}
  Practise {gap}
  Study {gap}
```
Leave with Step out when the attempt works.

## Decision
Answered 2026-11-27 by the owner: **go**, and P-98 follows P-97 directly.
