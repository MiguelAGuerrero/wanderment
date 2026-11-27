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

## The one addition: a for each whose list can grow
P-98's for each runs over a list a step gave earlier in the run. This amendment lets that list grow,
and lets it be kept. It is still one construct.

| | Where the list lives | How things get into it |
|---|---|---|
| **Given** (P-98 as designed) | The run; a new round asks again | The giving step's list editor |
| **Grows** (new) | The same | A step inside the for each **adds to** the list it runs over |
| **Kept** (new) | The routine, across runs | Rows under the block in Plan; **+ Add** there and on the routine's tile; a step inside that adds to it |

- **A for each ends when no item is left.** One that never gets an addition ends as P-98 says. One
  that keeps getting additions keeps going. Step out leaves it early.
- **Adding to a list is offered by structure.** In Plan, a step's Gives… offers "adds to <list>" for
  the lists it can see: those given or kept at its own level or a level above it, the same reach names
  already have. It cannot point at a list that is not there (owner, 2026-11-26: "structurally enforce
  correctness").
- **A kept item leaves the list when its turn is done,** and is kept as a record (stored data is never
  deleted). Removing one without doing it is a Plan edit, with Undo.
- **Running adds work; planning adds structure.** A running step can add an item. A new part, a new
  list or a new method is added in Plan.

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
    List what else stopped you               adds to {gaps}
```
Each gap is worked, the attempt is made again, and anything new joins the same list. The for each
ends on the attempt after which nothing is added. No Jump to, no stepping back, no edit mid-run.

**Work nothing is waiting on** — a kept list, added to from inside and outside:
```
Become a better drawer
  In any order
    Practise
      For each subject:  arms · legs · eyes        + Add
        Deliberate practice · with {subject}
        Reflect on other areas to improve          adds to subjects
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
        Note what to practise from it              adds to subjects
```
Parts never reach into each other. The list is held one level up, where both can see it: Study adds to
it, Practise runs over it. Which model to use follows from rule 1: if the practice must be finished
before the study carries on, it is a step in Study's own sequence (Practise called there); if not, it
is an item added to the list of the part that does that work.

**When a surprise has no step yet:** the method gains the asking step in Plan, once. Every later run
asks by itself. This is how a method is sharpened by running it.

## What P-98 and P-99 gain (to add to their *Done when*)
**P-98**
- A step inside a for each can add to the list that for each runs over; the for each ends when no item
  is left; an empty list passes straight through.
- A for each can run over a list kept in the routine: its items are rows under the block in Plan, with
  + Add there and on the routine's tile; items survive runs, reload, export and import; a finished item
  leaves the list and is kept as a record.
- Gives… offers "adds to <list>" for lists at the step's own level or above; a kept list can be held
  at the routine's level, outside the for each that runs over it, so another part can add to it.

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
  each, In any order, gives, adds to, asks.
- **"The runner is the step and nothing else"** is untouched: nothing here adds to the runner.

## What is withdrawn from the first version
Open items beside the steps; picking in a sheet; Cleared and Drop; an item "for" another item;
"Blocked by…" as a move; "next:" on the tile; six slices of its own.

## The persona panel, and what carries over
The panel (2026-11-27; `.polish/product/panel-B-16-1.md`, `-2.md`, local) read the first version.
Simulated perspectives, not user research. Most of what it found were symptoms of the model that is
now withdrawn. Three findings still apply:
- **A list that only grows is the backlog risk.** Here an item leaves by being done on the main path,
  which the panel asked for. A kept list can still outgrow the person; removing an item must stay one
  Plan edit with Undo, and nothing may count the list.
- **Long text.** An item is one line; a paragraph typed into "adds to" must wrap and never be clipped.
  One seeded case in P-98.
- **Screen readers.** A list that changes while it is being run needs the addition spoken, and focus
  that does not move.
A new panel is not asked for: this amendment stays inside the shape D-22 and the canvas already set.

## Data and risk
- A kept list is a new stored field on a routine, carried by the journal, export, import and its
  preview, and the golden fixtures (Full tier, inside P-98).
- A for each that grows without end: the person can always Step out; nothing runs by itself.
- A kept list shared by two open runs of one routine: an item taken in one run is not offered in the
  other. To be settled in P-98's contract.

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
