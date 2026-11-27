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
- **Running it: a routine row whose name is a slot** (owner, 2026-11-27: "Only the routine row";
  discovery `2026-11-27-work-from-work.md`). In Plan, Add's "a routine" (or "@") offers the names given
  above before the person's routines; choosing a name makes an ordinary routine row with the value's
  chip where the name would be: `▤ {choice}`. It is closed, and reads "asks" when nothing gives the
  name. On the runner the row shows the routine it holds ("▤ Draw with guidelines") with Step in, the
  path and the value sheet, exactly as a fixed routine row does. When the value is words, the row
  reads as those words and has no Step in.
- **Words stay words.** A step typed as words that reads a routine value shows the routine's name in
  place and never offers Step in, so "Tell Sam about {choice}" runs nothing. Plan therefore always
  shows where work comes from.
- **A routine value has a face.** Wherever a value is shown (the values row, the note, the value
  sheet, a tile) one that is a routine is drawn with the routine mark and its name.
- **The giving step adapts.** A name read by a `▤` row opens its giving field on routines (the routine
  items of any list in play, then the person's routines) and not on the keyboard.
- **Keeping a choice beyond the run is a Plan edit** (owner, 2026-11-27: "Edit Plan by hand"): the
  slot is replaced by the routine, once. Nothing a run chooses is stored on the routine.
- **What a caller can rely on.** Plan can only show what a call gives when it knows which routine it
  is. So where the kind of work is known, write the call in the routine
  (`For each {question}: Research a question · with {question}`, plain P-98) and later steps can read
  its results by name. A routine given as a value is for when the kind of work is not known until the
  moment; what it gives is seen in the trace, and a later step that needs it asks.
- **By reference.** The owner (2026-11-27): "A way, in this sense, is actually a routine, not text. So
  the ability to reference other routines by reference and have its value be slotted where it's
  required … if a routine [returns] another routine, we should be able to execute on that routine as
  part of the sequence of instructions that a thread has … It's like returning functions from
  functions." A value that is a routine holds the routine itself, not a copy of its steps: if the
  routine is changed in Plan, every value that names it follows.
- **A routine can give a routine.** What a call row gives may be a routine. The caller's later step
  that reads the name, a `▤ {choice}` row, steps into it in the caller's own sequence, like any call.
- **A list can hold routines.** A for each over such a list calls each in turn.
- **An item can carry words beside it.** A list item is words, or a routine with words after its
  name ("Draw with guidelines: proportions held, slower"). Marking an item in a step that adjusts the
  list adds to those words and leaves the routine as it is. *(Designer's ruling.)*
- **One-off work is a value.** A chore that arises inside a larger aim is words given at a step and
  done at the next; it needs no queue of its own.

### A called routine returns; it never writes
The owner (2026-11-27): "I'm more in style of a functional style approach … where you just kind of
regenerate the list … so we don't have to necessarily support write operations."
- **A called routine only returns what its call row gives.** What it is handed is its own copy: it may
  mark or strike a list it asked for, and that changes nothing for the caller.
  Only the routine that holds a list gives it again. (This narrows "Reach" above: reach is for steps
  and parts written inside the routine that holds the list, not for a routine called from it.)
- **A for each collects.** A value given inside the loop is, after the block, a list of what each item
  gave (already in P-98: "a value given inside is collected after it"). A closing step that needs the
  results reads that name. No step may ask the person to act on results from memory.
- **One name, given more than once, is one list.** When two calls in a routine give the same name,
  or the parts of an In any order block do, or a routine that calls itself does, what they give is
  collected under that name, in the order it was given, as a for each already collects (owner,
  2026-11-27: "Proceed with that"). No output is renamed at a call. A later step that gives the name
  again is shown the collected list to adjust, which is how "State the answer" ends with one answer.
- **For each is the consumer.** Taking an item, doing the work and carrying on with the rest needs no
  routine that calls itself with a shorter list; the block does it.

### A routine can call itself
The owner (2026-11-27): "there has to be a way for something like research question. If question
produce question, research this question. And all of those are … observable … frames that don't
necessarily have to be defined in steps. It generates itself, like recursive calls. That way the user
doesn't ahead of time … have to state they're going to encounter these things, but they're accounted
for in the procedure."
```
Research a question                          asks {question} · gives {answer}
  Find what bears on {question}
  List the questions this raises             gives {raised}
  For each {raised question}
    Research a question · with {raised question}          ← itself
  Write the answer to {question}             gives {answer}
```
- **Listing nothing is where it stops** (rule 2). The person never says in advance how deep it goes.
- **Each level is a frame the person can see**: the path names it, and the tree view lists them all.
- **It is dependency for free** (rule 1): the answer stands after the for each, so it waits on the
  answers to everything the question raised, and reads them as the collected `{answer}`.
- **What it changes:** DESIGN.md says "A routine can't contain itself." That sentence would go, for a
  routine calling itself directly or through another. A proposal for the owner's rules, not an edit
  made here.
- **In Plan** a call to the routine being planned, or to one already open above it, is a closed row; it
  is never opened in place.
- **Depth.** The engine keeps at most 64 levels in a run and refuses to go deeper. At that point the
  call cannot be stepped into and says so in words; nothing is lost and the run stays where it is.
  *(Designer's ruling.)*
- **A level is named by what it was given** (owner, 2026-11-27: "Yes, with '…'"). Where a level's
  routine has the same name as the level above it, the path, Step out's notice, Start over and Jump
  to… show the value it was called with and not the repeated name: "Research a question · Is creatine
  safe long-term? › … › What doses were studied? › Who funded the dose studies?". The first level and
  the nearest ones show; the middle is collapsed to "…", as plain text and never a control. No number
  of levels is shown.
- **In Plan the closed row says so**, with the words "this routine" where a row that opens has its
  chevron, so it does not read as broken. *(The words are a designer's ruling.)*
- **Which shape, in the person's terms:** is there something to write after the smaller ones come
  back? If yes, the routine calls itself; if no, it is a list given again. The owner does both
  ("Both, depending"), so the list given again is built first and the self-call when a routine of
  theirs needs an answer to wait on its sub-answers.
- **When to use which:** a routine that calls itself when each item may raise more of the same and
  the parent needs the results; a for each whose list is given again when the work is flat and taken
  as it comes ("Work it out as you go").

### A step owes what its insides give
The owner (2026-11-27): "there is a concern of routines having children that produce values and they
aren't represented in the parental context itself … if I laid down break it down and there's a sub
that produces the value, if I choose not to step into a function, those [values] need to be supplied
somewhere, and it would have to be supplied at the top level call, like hoisting up the return types of
its children, because … any routine [may depend] on the value that a sub [step] produces."

Built today (P-101): a step broken down says "gives {a}, {b}" on its row in Plan and on the runner's
path. That is display only. Going past it with Next gives nothing, and a later step that reads the
name asks for it in place, far from where it was made.

- **A step that has insides is a function, and what it gives is what it owes.** For a step broken
  down: the names its smaller steps give that something outside them reads. For a call: what its call
  row gives.
- **Leaving it settles what it owes.** Next on such a step without stepping in, or Step out before
  its giving steps were reached, shows a field for each name still owed, labelled with the name, in
  the same place and form a giving step's field has. The value's trace says it came from that step.
- **A field may be left empty**, as a giving step's may. A later step that reads the name then asks in
  place, as today; that stays as the fallback, not the main way.
- **Names used only inside stay inside.** Nothing is asked for a name that no step outside reads (owner,
  2026-11-25: "there has to be a purpose for that outcome").
- **Inside a for each**, what is owed is owed per item, and is collected after the block like any
  other value given inside it.
*(The form of the fields and "names still owed" on Step out are a designer's ruling.)*
- **A chunk is chosen while running, not written into the routine.** The owner (2026-11-27), first:
  "when I sufficiently understand my own routine, especially when it comes to loops, it would be more
  overhead to just keep looping through a block … instead of working it one by one, you can see chunks
  of steps all at once"; then: "it's like an abstraction, because it's no different from forming one
  step out of a whole bunch of sub-steps"; then, settling the shape: "in whatever step you can view,
  you can choose to keep pushing on the next steps as you see fit. And that way you can chunk up as
  arbitrarily as you want. And one way to address deeply nested structures is that they're expandable,
  and effectively it just turns into an outline view. And operates as a skip. So when you skip over a
  chunk, you go to the next step after the chunk. This doesn't have to be like a first class thing. It
  just has to be a quality of life UI affordance."
  So, on the runner:
  - The step in view can be extended with the step that follows it, and again, as far as the person
    likes. What is shown together is the chunk.
  - A shown step that has insides (a step broken down, a called routine, a turn of a loop) can be
    opened in place to show its smaller steps. Several levels opened read as an outline.
  - **Next takes the whole chunk as done** and goes to the step after the last one shown. It is a skip
    over everything in view.
  - A step in the chunk that gives a name shows its field there, so results are noted before moving
    on (the rule above: leaving settles what is owed).
  - Nothing is stored. The chunk is how the runner is being looked at, not part of the routine or the
    run; the routine is unchanged and Step in still takes one step at a time.
  This replaces the earlier wording here (a loop's turn as one note): the chunk follows what the person
  can hold at the moment, not the routine's structure, so it needs no rule of its own for loops.
  **What it touches:** DESIGN.md's "The runner is the step and nothing else" becomes "the runner is the
  step, and as many of the next ones as the person pulls into view". "Planning and running must never
  look alike" still holds: an outline on the runner is read and passed over, never edited, and must
  keep the runner's look. The pull-up panel's "then: <next step>" and Jump to… already show and move
  to later steps; this brings the same two things onto the step itself.
  *(Designer's rulings: the chunk resets after Next; a turn's end extends into the next turn; under
  P-110's "only steps above the place hold values", what a passed chunk gave stays because the place
  is then below it.)*
  Research on guidance and skill points the same way: step-by-step help turns from aid to hindrance
  as skill grows (the expertise-reversal finding; unverified, from the 2026-11-27 assessment).

### A for each can declare its own list
The owner (2026-11-27): "maybe there's better UX to have a for each loop declare its own values, like
locally … I think it's design." A for each gets its list from one of two places:
- **A name given above it**, when making the list is work in itself ("List what stopped you").
- **Its own header**, when nothing else reads the list: arriving at the block asks for the items, in
  the list editor, and they belong to the block. This removes a step whose only job was to feed the
  loop.
A kept list is the second kind, kept between runs.

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
    ▤ {step}
    Adjust the list: what does that make possible    gives {steps}
```
A step typed as words is a one-off. A step given as a routine is stepped into, with its inputs filled
where it was given. The for each ends on the round in which nothing is added. In today's app the same
shape is "Repeat from here" above "Name the next small step · gives {next}" and "Do {next}" as words.

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

- A called routine returns what its call row gives and cannot adjust a list it was handed.
- A routine can call itself, directly or through another: Plan shows such a call as a closed row; the
  run refuses, in words, to step in past the engine's depth limit and stays where it is; the path shows
  the first routine and the nearest two levels with no count.
- A for each can declare its own list in its header: arriving at it asks for the items; they are local
  to the block; kept, they persist between runs.

- Next on a call or on a step broken down, without stepping in, and Step out before its giving steps
  were reached, show a field for each name it gives that is still empty (for a breakdown: only names
  read outside it); the value's trace names that step; left empty, a later reader asks as today.

- What calls give under one name in the same routine is collected into one list under that name, in
  the order given; nothing is renamed at a call.

- A value that is a routine holds it by reference; a call row may give a routine; a list may hold
  routines, each optionally with words beside it; a step that reads such a value steps into it.
- **Copy** (DESIGN.md: "to vary, copy"; from the owner's real use, 2026-11-27: "there wasn't any idea
  of keeping multiple implementations of one function"): a routine's menu makes a copy under a new
  name, with Undo; the copy is an ordinary routine.

- A routine row can take a value's name in place of a routine's (`▤ {name}`): Add's "a routine" and
  "@" list the names given above; on the runner it shows the routine held, with Step in; held words
  read as words with no Step in; a step typed as words never steps in. A routine value is drawn with
  the routine mark and its name wherever values show. A name read by such a row opens its giving field
  on routines.
- (With the self-call, when unparked:) a level whose routine has the same name as the one above is
  named by the value it was called with, in the path, Step out's notice, Start over and Jump to…; a
  long path collapses its middle to a plain-text "…"; the closed self-call row in Plan carries words.

- (P-112, a runner affordance; nothing stored:) the step in view can be extended with the steps that
  follow, one at a time; a shown step with insides opens in place, to any depth; Next takes everything
  shown as done and goes to the step after it; giving steps in view show their fields; the chunk resets
  after Next. DESIGN.md's "the runner is the step and nothing else" is reworded to allow it.

**P-99**
- A part whose for each has finished takes up again when its list gains an item (owner, 2026-11-27:
  "Yes, a finished part takes up again when its list changes"): it reads as ready again, at that
  item, and a block it belongs to is no longer finished until it returns.
- What the parts of a block give under one name is collected into one list after the block.
- A consequence, stated as a test: a step that stands after an In any order block, and that the run had
  already been able to reach, waits again if a part of that block takes up again before the step is
  done. The run's place is not moved back by this; the step simply reads as waiting on that part, in
  the tree view and on the tile, until the part returns. Work already done is never undone.
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
