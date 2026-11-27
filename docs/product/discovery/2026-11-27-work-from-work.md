# Showing work that comes from work (2026-11-27)

_Discovery for the owner's request of 2026-11-27: "we have to support the execution of routines, and
that has to be accounted for. So, what syntax or UI, more aptly said, would make that apparent and clear
that, hey, you will produce work from work? Like the obvious case is like a recursive call, questions
that produce questions … But that's not quite the same as returning a function from a function. So I
want there to be some research on how we could best express that." Curated by /product from two research
reports, one per case. Nothing here is built or decided._

> **Verification caveat. No source page could be opened.** Every source is marked "search" (a
> search-result summary) or "memory" (recall). Treat behaviours attributed to other tools as unverified.

## The two recommendations
1. **A step that runs a routine held in a value: a routine row whose name is a slot.** In Plan the
   person adds "a routine" (or types "@") and the list offers the names given above before their own
   routines; choosing one makes an ordinary routine row with the value's chip where the name would be
   (`▤ {choice}`). On the runner it shows the routine it holds, with Step in, like any routine row. It
   uses the routine mark and the value chip the app already has, and Plan itself now says that work
   comes from here. Every tool surveyed marks "runnable" at the place of use; none leaves it to be
   inferred from the value.
2. **Work that makes more of itself: name a level by what it was given.** Where a level's routine has
   the same name as the level above, the path, Step out's notice and Jump to… show the value it was
   called with ("… › What doses were studied? › Who funded the dose studies?") and not the repeated
   name. The starting question stays on screen, which is what the research on getting lost down a tree
   says a suspended goal needs.

## What changes in B-16 if both are taken
- A step typed as words that reads a routine value would no longer offer Step in; only a routine row
  runs it. (B-16 said any step reading such a value steps into it; "Tell Sam about {choice}" shows why
  that is too loose.)
- A self-call is a closed row in Plan with words where the chevron would be, so a row that will not
  open does not read as broken.
- The middle of a long path is collapsed; whether to an ellipsis or to nothing is open.

## Flat list or a routine that calls itself
The test a person can apply in their own terms: **is there something to write after the smaller ones
come back?** If yes, the routine calls itself. If no, it is a list given again. Research on how people
learn recursion finds most hold a "loop" picture unprompted, which is the flat list; the self-call is
the case they misread, and showing each level labelled by its own value is the known remedy. The flat
list finishes a round before going deeper, so it resists rabbit holes by construction; the self-call
goes depth first.

# Report 1 — a slot that holds a routine, and running it

### What others do

The five things each notation has to show: (1) this slot holds something runnable, not text; (2) what
is in it now, or that it is not known yet; (3) what running it asks for and gives back; (4) the moment
it is entered and left; (5) where the value came from.

#### Apple Shortcuts
- **What it does.** An action is a sentence with coloured tokens in it: "Run [Shortcut]". Any token
  can be set to a fixed thing, to a variable, or to Ask Each Time. Apple's guide says placing a
  variable in a parameter "lets you dynamically switch between the settings of an action while a
  shortcut is running" (search: [Use variables](https://support.apple.com/guide/shortcuts/apdd02c2780c/ios)).
  A later table of contents lists "Use the Ask When Run variable" where "Ask Each Time" stood, so the
  name seems to have changed (search: [guide contents](https://support.apple.com/en-asia/guide/shortcuts/toc)).
  That the *Shortcut* token of Run Shortcut itself accepts a variable is memory only; an Apple
  Community thread asks for exactly this and has no confirmed answer in the summary (search:
  [thread, iOS 18.0.1](https://discussions.apple.com/thread/255792308)).
- (1) The slot is a token inside a sentence whose verb is "Run". The verb carries "runnable"; the
  token looks like every other token. (2) A fixed target shows the shortcut's name and icon in the
  token; a variable shows the variable's name; unset shows a greyed placeholder word. (3) One input
  and one output, both implicit; the callee's needs are not shown at the call (memory). (4) Nothing:
  the callee's prompts simply appear, and the person cannot tell which shortcut is asking (memory).
  (5) A magic-variable token carries the icon of the action that produced it, and the picker makes
  you choose it by pointing at that action's output in the list (memory). This is the best answer to
  (5) in the set.
- **Choose from Menu** draws each choice as a labelled section with its actions indented under it
  (memory). It is a conditional in all but name.

#### Snap! (and Scratch)
- **What it does.** Snap! is the one mainstream tool built for this. "The call and run blocks are at
  the heart of Snap's first class procedure feature; they allow scripts and blocks to be used as
  data"; "the gray rings make that possible": 2 + 3 in a ring is the block itself, not 5 (search:
  [Snap! manual, Procedures as Data](https://docs.snap.berkeley.edu/06-procedures-as-data)).
  Ringify "surrounds the block … with a grey ring, meaning that the block(s) inside the ring are
  themselves data" (search: [manual, The Scripting Area](https://cycomachead.gitbooks.io/snap-manual/content/contents/the_scripting_area.html)).
- (1) **Shape.** A slot that takes a procedure is drawn ring-shaped, and a procedure passed as data
  wears a ring. One mark, two places, same meaning. "run" is for a script, "call" for something that
  reports back. (2) An empty ring slot is visibly empty; a variable dropped into a ring slot has its
  ring removed automatically (search: manual, "Variables in Ring Slots"), i.e. "a name that holds a
  procedure" is drawn as the plain variable inside a run block. (3) Inputs: run/call "have arrowheads
  at the end that can be used to open slots for inputs". How they reach the callee is the weak point:
  with matching counts empty slots fill left to right, one input fills every empty slot, otherwise
  nothing fills and explicit names are needed (search: manual; forum thread
  ["Why are ring parameters weird?"](https://forum.snap.berkeley.edu/t/why-are-ring-parameters-weird/11553),
  a user's complaint, labelled as such). (4) Nothing marks entry or exit. (5) Nothing.
- **Scratch** has no procedures as values at all; its slots are typed by shape (round, hexagonal) and
  a block only fits a slot of its shape (memory). The lesson is the shape typing, not the feature.

#### Spreadsheets: LAMBDA and named functions
- Excel: "if you create a LAMBDA function in a cell without also calling it from within the cell,
  Excel returns a #CALC! error"; the intended use is to give it a name and call it by name (search:
  [Microsoft, LAMBDA function](https://support.microsoft.com/en-US/Excel/functions/lambda-function),
  [How to correct a #CALC! error](https://support.microsoft.com/en-us/excel/how-to-correct-a-calc-error)).
  A forum answer calls the error's tooltip misleading (search, community opinion).
- (1)(2) A cell cannot show a function as a value: an unapplied function is an error. That is the
  anti-pattern: **a held procedure with no face of its own**. The fix spreadsheets chose is a name.
  (3) Parameters are named in the definition. (4)(5) Nothing.

#### Workflow tools: n8n, Zapier, Make
- **n8n.** The Execute Sub-workflow node's source can be "Database", loading "the workflow from the
  database by ID", and the ID may be an expression; in "run once with all items" mode the ID is
  evaluated on the first item only. From the parent you follow the flow by "opening the Execute
  Sub-workflow node and selecting the View sub-execution link" (search:
  [n8n docs, Execute Sub-workflow](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflow)).
  Community posts report hard-coded IDs breaking on export and import (search, community).
- **Zapier.** The sub-Zap's trigger holds an "Input/Argument List"; "Return From a Sub-Zap" names its
  outputs; the parent's "Call a Sub-Zap" step then shows those input fields (search:
  [Zapier help](https://help.zapier.com/hc/en-us/articles/8496308527629)). The target is picked from a
  list, not computed (memory).
- **Make.** "Call a scenario" gets its fields "autogenerated" from the callee's declared inputs and
  outputs, and "updates to scenario inputs and outputs in subscenarios are not automatically reflected
  in parent scenarios" (search: [Make help](https://help.make.com/scenario-inputs-and-outputs)).
- (1) A node type of its own: "runnable" is the node's kind. (2) Fixed: the callee's name on the
  node. Dynamic (n8n): an expression in the ID field, which shows an ID and no name: the worst
  answer to (2) in the set. (3) Declared at the callee, mirrored as fields at the call; with a dynamic
  target the fields cannot be shown, so n8n falls back to passing everything. **This is the general
  result: when the target is not known, the call cannot show what it asks or gives.** (4) A link from
  the call to the inner run. (5) Whatever the expression says.

#### BPMN call activity
- A call activity is drawn as a task "with a thick border and the subprocess marker inside"; the
  thick border separates a reusable, called process from an embedded one, and the + marks "collapsed,
  has insides" (search: secondary sources quoting the BPMN 2 spec,
  [Jmix docs](https://docs.jmix.io/jmix/bpm/bpmn/bpmn-subprocesses.html),
  [jBPM issue](https://issues.redhat.com/browse/JBPM-9598)).
- (1) Border weight says "this is a call to something defined elsewhere"; + says "it has insides you
  can open". Two marks for two meanings, which is this app's rule. (2) The called element is an
  attribute, usually not on the drawing (memory). (3)(4)(5) Not in the notation.

#### Notion buttons and database templates
- A button step "Add page to…" lets you "choose the database … and if you'd like to use a template";
  a database can mark one template as the default (search:
  [Notion help, Buttons](https://www.notion.com/help/buttons),
  [Database templates](https://www.notion.com/en-us/help/database-templates)).
- (1)(2) The template is a named item in a picker, with "default" as a standing choice. A default is
  a slot filled once and used many times. (3)(4)(5) Not addressed. Templates are copied, not run.

#### Recipes (memory; a print convention, no source)
- A sub-recipe appears in the ingredient list as a thing ("1 recipe pie crust, page 32") and in the
  method as a noun ("roll out the crust"). A variable sub-recipe is "your favourite pie crust" or "a
  crust (see Basics)". (1) It is a **noun with a pointer**, never a verb phrase. (2) "Your favourite"
  is the unbound slot, in plain words. (3) Its yield is in the sub-recipe's own header. (4) "Make the
  crust; while it chills…": entry and exit are sentences. (5) Not addressed.

#### Game loadouts and equipped slots (memory; a genre convention, no source)
- A slot is a framed place on the HUD. Empty, it is an outline; filled, it shows the item's icon and
  often its name; the button that uses it shows the item, not the slot. (1) The frame is the slot,
  the icon inside is the thing. (2) Always visible, because the slot never leaves the screen. (5)
  Equipping happens in a separate screen. The lesson: **the slot is permanent and visible; its
  contents are drawn as the thing itself.**

#### Form builders (memory)
- Google Forms' "Go to section based on answer" puts a picker beside each choice. It is a conditional
  jump: one row per branch. Named here only to mark the edge of what was rejected.

#### Research
- **Non-programmers write in natural language and leave things out.** Pane, Ratanamahatana and Myers
  (2001, *Int. J. Human-Computer Studies* 54) had non-programmers solve programming tasks; in the
  related PacMan study none used programming or mathematical notation, and about 59 % used natural
  phrasing with an amount or variable left unsaid (search:
  [figshare record](https://figshare.com/articles/Studying_the_Language_and_Structure_in_Non-Programmers_Solutions_to_Programming_Problems/6625928),
  Pane's thesis CMU-CS-02-127). Supports "Do {choice}" as words, and inputs that arrive by name
  without being stated.
- **Procedures as values are the slow part, and "why didn't it run?" is the typical confusion.** A
  course report: "understanding how code can be stored in data structures, passed as parameters, or
  returned from functions, took substantially more time than expected", while map, filter and reduce
  "were generally well understood"; a named trouble was why passed code "did not execute" until
  something used it (search: [arXiv 2102.11147](https://arxiv.org/pdf/2102.11147), one course, not
  a controlled study). So: **using** a held procedure in a ready-made shape is easy; seeing it as a
  thing that can sit unrun is hard. The notation must show, at a glance, "held" versus "run here".
- Krishnamurthi and Fisler report that students at first struggle to tell higher-order functions
  apart by behaviour (search: [Brown](https://cs.brown.edu/~sk/Publications/Papers/Published/kf-devel-beh-concept-hofs/)).
  No Snap!- or Scratch-specific study of rings turned up in search.
- **Cognitive dimensions** (Green and Petre 1996): *hidden dependencies*, "is every dependency
  overtly indicated in both directions"; *role-expressiveness*, how obvious each part's purpose is
  (search: [Wikipedia](https://en.wikipedia.org/wiki/Cognitive_dimensions_of_notations),
  [Blackwell's tutorial](https://www.cl.cam.ac.uk/~afb21/CognitiveDimensions/CDtutorial.pdf)). A
  dynamic call is a hidden dependency by nature: the giver and the runner are far apart.

#### What the survey adds up to
| | Runnable, not text | What is in it | Asks / gives | Enter / leave | Where from |
|---|---|---|---|---|---|
| Shortcuts | the verb "Run" | token text | hidden | invisible | **token carries the source's icon** |
| Snap! | **ring shape** | visible in the ring | arrowheads; filling rules confuse | invisible | none |
| LAMBDA | none (an error) | none | in the definition | none | none |
| n8n | **node kind** | an ID expression | lost when dynamic | **link to the inner run** | the expression |
| BPMN | **border + marker** | off the drawing | none | none | none |
| Recipes | **a noun with a pointer** | "your favourite …" | the sub-recipe's header | sentences | none |
| Loadouts | **a framed slot** | **the thing itself, always shown** | none | none | another screen |

Three findings to carry:
1. Every legible notation marks runnable by **kind or shape at the place of use**, never by the
   reader inferring it from the value.
2. Nobody shows what a dynamic call asks and gives before the target is known. The honest choices
   are: say nothing (n8n), or let the **caller** say what it expects back.
3. Nobody but n8n marks entry, and nobody marks provenance but Shortcuts. This app already has both
   (the path line; the value sheet's "from <step>" and trace). It is ahead here and needs no borrowing.

### The problem, split into moments

The running example is the owner's drawing session: try two variants, pick one, apply it for the rest
of the session. `{ways}` holds two routines made with Copy; `{choice}` comes back holding one.

1. **Writing the step in Plan.** The person must say "run whatever `{choice}` holds" without learning
   a syntax, and the row must then read as work-from-work to the same person a week later. Plan
   cannot know the routine. It can know that the row is a call, if the person says so by how they add
   it. Today a `{choice}` chip looks the same whether it will be read as words or run.
2. **Giving the value while running.** The giving field has to produce a reference, not text. B-16
   has "the person's routines are offered as they type". Two gaps: (a) when the choice is among the
   items of a list in the run (`{ways}`), those items should be offered, first; (b) the field has no
   reason to offer routines at all unless something tells it this name is meant to be run. After it
   is given, the value has to look like a routine everywhere a value is shown (values row, tile,
   value sheet), or the Excel problem appears: a held procedure with no face.
3. **Reaching the step that runs it.** The note must say which routine this is now, that it has
   insides, and what it will ask. This is the moment "you will produce work from work" has to be
   plain. Also the three unhappy cases: the value is words (B-16: read as words, a one-off); nothing
   gave it (asks); the routine was removed since (B-16: reads as its words).
4. **Being inside it.** The path line already says where. Open: whether the path should also say this
   level was arrived at through a value. The values the routine reads by name must be seen to arrive.
5. **Coming back.** The run is on the caller's next step; whatever the routine gave is in the values
   row. If a later step reads something it was expected to give and did not, B-16's "leaving it
   settles what it owes" is the mechanism, but only if the caller said what it expects.

### Options for this app

Marks used below are the app's own: ▤ routine, `{ }` value, › shut, dashed = "asks / not given yet",
inverted = a value in place. No new mark is proposed in any option.

#### Option 1 — The mark travels with the value (B-16 as written, plus one rendering rule)
A step stays the person's words. A value that is a routine is drawn as **▤ and its name** wherever a
value is drawn. A step whose words read exactly one such value offers Step in. Borrowed from Snap!'s
ring (the thing wears the mark) and loadouts (contents drawn as the thing).

```
PLAN  Drawing session
  ⠿ Try it more than one way                    ···
    gives {choice}
  ↻ Repeat from here
  ⠿ Do {choice}                                 ···      <- a plain chip: Plan cannot tell
  ⠿ Mark what it showed                         ···
```
```
RUNNER
  ❚❚  Drawing session                          Plan
  { } choice: ▤ Draw with guidelines
  ┌────────────────────────┐
  │ Do                     │
  │ [▤ Draw with guidelines]│                            <- in place, inverted, with the mark
  └────────────────────────┘
  Step in                          Next →
```
- **Costs.** Plan is silent: the row that produces work looks like a sentence (role-expressiveness
  fails exactly where the owner asked for it). The giving field cannot know to offer routines.
  "Tell Sam about {choice}" also offers Step in. Two routine values in one step have no rule.
- **Verdict: fits**, and it is the least to build, but it does not answer the owner's question for
  Plan. **Size:** S on top of P-98's stored value. Not big by itself (P-98 already carries the new
  kind of value).

#### Option 2 — A routine row whose name is a slot
The person adds "a routine" (Add's "a routine", or "@") and the list offers, above their routines,
**the names given above**. Choosing one makes an ordinary routine row with the chip where the name
would be. Borrowed from n8n and BPMN (the call is a row kind) and Shortcuts (the target is a token).
The row is closed with no chevron, because there is nothing to open yet.

```
PLAN  Drawing session
  ⠿ Try it more than one way                    ···
    gives {choice}
  ↻ Repeat from here
  ⠿ ▤ {choice}                                  ···      <- routine mark + chip = "run what it holds"
  ⠿ Mark what it showed                         ···

  with nothing above giving it:
  ⠿ ▤ ┆asks {way}┆                              ···      <- the existing dashed chip
```
```
RUNNER, reaching the row                      RUNNER, value not given
  ❚❚  Drawing session            Plan           ❚❚  Drawing session            Plan
  { } choice: ▤ Draw with guidelines            ┌────────────────────────┐
  ┌────────────────────────┐                    │ ▤ ┆choice┆              │
  │ ▤ Draw with guidelines │                    └────────────────────────┘
  └────────────────────────┘                    asks { } choice             <- opens the entry sheet,
  { } choice                    <- opens the                                   which lists routines
      value sheet: from …, trace                                    Next →
  Step in                 Next →

RUNNER, inside                                 RUNNER, back
  ❚❚  Drawing session › Draw with               ❚❚  Drawing session            Plan
      guidelines     Plan Draw with guidelines  { } choice: ▤ Draw with guidelines
  { } choice: ▤ Draw with guidelines            ┌────────────────────────┐
  ┌────────────────────────┐                    │ Mark what it showed    │
  │ Block in the big shapes│                    └────────────────────────┘
  └────────────────────────┘                                        Next →
  Step out                Next →
```
- The note on arrival is the same note a fixed routine row shows, so a call through a value and a
  call by name read alike at run time, as they should.
- Because the row exists in Plan, **the giving step knows**: a name that a ▤ row reads opens its
  entry sheet on routines (and on the items of a list in play), not on the keyboard. The use declares
  the kind; nobody types a type.
- The row's menu can carry **Gives…** like any step. That is the caller saying what it expects back
  ("▤ {choice} · gives {result}"), which is the only honest answer found anywhere to "what does a
  dynamic call give". B-16's "leaving it settles what it owes" then applies unchanged.
- If the value turns out to be words, the note reads the words and there is no Step in (B-16's
  one-off). If the routine was removed, the same.
- **Costs.** One new thing in Add's list (names among routines). A row that never opens in Plan.
  "Do {choice}" typed as words would no longer be the way to run it, unless Option 1's rule is kept
  beside it (see Open questions). Nothing can be said in Plan about what it asks.
- **Verdict: fits.** No new word, no new mark, no explanatory text; "frame", "parameter" stay unsaid.
  **Size:** M on top of P-98. Big only through P-98, which is already "go"; the Gives… part touches
  B-16's owed fields and belongs in P-98's contract.

#### Option 3 — A kept slot on the routine (the loadout)
The chosen routine is not a run's value. It is a named place the routine keeps, like B-16's kept
list, shown at the top of Plan and filled from the run. Borrowed from loadouts and Notion's default
template.

```
PLAN  Drawing session
  way:  ▤ Draw with guidelines                  ···      <- kept, like "subjects: arms · legs  + Add"
  ⠿ Warm up                                     ···
  ↻ Repeat from here
  ⠿ ▤ way                                       ···
```
```
RUNNER
  ┌────────────────────────┐
  │ ▤ Draw with guidelines │
  └────────────────────────┘
  Step in                 Next →
```
- It matches the owner's sentence most literally ("this all gets joined to the result that decides
  how I want to use a specific function"): the choice outlasts the session, and Plan can show what
  is in the slot, what it asks and what it gives, because it is known.
- **Costs.** A run writes to the routine: against "values belong to the run", against "a called
  routine returns; it never writes", and against "a change made in Plan changes the routine" being
  the only way a routine changes. Two open runs share the slot. And it does not cover a value that
  really is per run ("Do {task}" in research).
- **Verdict: fits if changed** — as a *later* convenience: the experiment ends with "Open Plan and put
  {choice} where it belongs" (the library's "Keep the lesson" already ends this way), and the person
  swaps a fixed routine row by hand. No kept slot is needed for that. As a stored slot: **big** (new
  stored field, a DESIGN.md sentence). **Size:** L.

#### Option 4 — A pick step that lists its routines in Plan
The giving step declares its candidates as rows under it, so Plan shows every routine that could
come out. Borrowed from Shortcuts' Choose from Menu and Notion's template picker.

```
PLAN
  ⠿ Pick the way for today                      ···
    gives {choice}
      ▤ Draw with guidelines                     ›
      ▤ Draw without guidelines                  ›
      + Add
  ⠿ ▤ {choice}                                  ···
```
```
RUNNER, at the pick step: the field under the note opens a sheet
  choice
    ▤ Draw with guidelines
    ▤ Draw without guidelines
    Keep · Close
```
- (2) and (3) are answered in Plan: the candidates open, so what each asks and gives can be read.
- **Costs.** It draws branches under a step, which reads as a conditional (rejected), and it only
  covers a choice among routines known in advance. The owner's case builds its candidates at run time
  (`{ways}`), and "Do {task}" has no fixed candidates at all. B-16's kept list of routines plus a
  giving field that picks from a list already gives the same thing without a new step kind.
- **Verdict: fits if changed** — keep only the part that is missing today: **a giving field can pick
  one item of a list that is in play**. Drop the new step kind. **Size:** S for that part.

#### Option 5 — It runs by itself (what Shortcuts, n8n, Zapier and Make all do)
Reaching the step enters the held routine at once; there is no Step in, and its last step returns.
- **Verdict: doesn't fit.** "The app never jumps by itself"; Step in and Next are the person's moves
  and Next past a call is allowed (B-16 settles what it owes). Listed so it is not proposed again.

### A recommendation

**Option 2, with Option 1's rendering rule under it and Option 4's picker beside it.**

Why:
- It is the only option in which **Plan says "work comes from here"**, and it says it with the mark
  that already means routine and the chip that already means value. The survey's first finding is
  that legible notations mark runnable at the place of use; Option 2 is that, at no cost in marks.
- The person declares the kind **by what they do** (they add a routine, and point at a name), not by
  typing a type or a keyword. That is the standing wish: refining a routine shows what they want, in
  the app's existing gestures. It is also what the owner reached for when typing "@".
- It closes the loop backwards: the giving step can offer routines because a ▤ row reads its name.
- It gives the one honest handle on "what it gives": Gives… on the row, said by the caller.
- At run time it adds nothing to the runner. The note, Step in, the path and the value sheet are the
  ones a fixed routine row already uses. (4) and (5) need no new design.

**The smallest first slice** (inside P-98, after routine values are stored; Light for the screens,
Full only for what P-98 already carries):
1. A routine value is drawn as ▤ and its name wherever a value is drawn: values row, in place on the
   note, the value sheet, the home tile's "at" line. A removed routine reads as its words (B-16).
2. Add's "a routine" and "@" list the names given above, as chips, before the person's routines.
   Choosing one adds the row `▤ {name}`: closed, no chevron; dashed "asks" when nothing gives it.
3. On the runner that row shows the held routine's name with ▤ on the note, the name's field under
   it (opening the value sheet), and Step in. Words in the value: the note reads the words, no Step
   in. Nothing given: "asks { } name", and its entry sheet lists routines.
4. A name read by a ▤ row opens its giving field on a list: the routine items of any list in play
   first, then the person's routines; typing still gives words.

Left for the next slice: Gives… on the ▤ row with owed fields; `with` on the row; a ▤ chip in Plan
for a name whose giver is known to give a routine; a list of routines in a for each.

### Open questions for the owner

1. **Does "Do {choice}", typed as words, still step in?** B-16 says a step reading the value is a
   call. Recommended: keep it, limited to a step whose words hold exactly one routine value, so the
   person's own sentence works and `▤ {choice}` is simply what "@" produces. The alternative is that
   only the ▤ row runs it and words always read as words; that is stricter and easier to predict.
2. **Should the path say it came through a value?** "Drawing session › Draw with guidelines" (same
   as a fixed call; recommended, one wording) or "… › choice: Draw with guidelines".
3. **May the caller say what it expects back?** Gives… on a ▤ row, settled on leaving as B-16's owed
   fields. Without it, a dynamic call's results are only in the trace and a later reader asks.
4. **When Plan is opened over a run, may the ▤ row show what it holds now?** It would answer "which
   routine" in Plan, but puts a run's value on the planning surface, which so far shows only HERE
   and "at <step>".
5. **After the experiment, is the choice kept?** Recommended: by hand, in Plan (swap the row for the
   routine). A kept slot (Option 3) is a new stored field and a rule change; only worth a brief if
   choosing a way becomes a regular thing.
6. **A step with two routine values** ("Compare {a} with {b}"): no Step in (recommended), or a
   choice of which?

# Report 2 — work that makes more of itself, and staying oriented

### What others do

#### 1. How novices read recursion (the most useful evidence here)
- **Two mental models.** Kahney (1983) found that most novices hold a **loop model** (a recursive call
  is a jump back to the top of the same procedure) while experts hold a **copies model** (each call is
  a new instance with its own values). The loop model works for tail recursion and fails for
  **embedded recursion**, where there is work left to do after the call comes back. Götschi, Sanders
  and Galpin (SIGCSE 2003) found the same at Wits, plus non-viable models; George (PPIG 2000) found
  that students who traced correctly with diagrams of the copies often failed without the diagram.
  — search: [PPIG 2000, George](https://ppig.org/papers/2000-ppig-12th-george/),
  [Sanders & Galpin, Wits poster](https://homepages.inf.ed.ac.uk/vgalpin1/pubs/SG07.html),
  [Brown, tracing recursion](https://cs.brown.edu/people/sk/Publications/Papers/Published/tfk-eval-trace-rec-subst-nm/paper.pdf)
- **The base case is misread as the end.** A Snap! forum thread (user discussion, not research) makes
  the point teachers repeat: in embedded or branched recursion, reaching the base case does not finish
  the job; the waiting callers still have their remaining work. — search:
  [Snap! forum](https://forum.snap.berkeley.edu/t/how-to-understand-the-base-case-of-a-recursion/14469),
  [Snap! docs, Building a block](https://docs.snap.berkeley.edu/building-a-block)
- **What the visualisers do about it.** Python Tutor draws every active call as its own frame, each
  with "private copies" of its variables, and shows each frame handing its result to its caller as it
  goes away. The cure for the loop model is to show the copies, each labelled by **its own values**.
  — search: [pythontutor.com article](https://pythontutor.com/articles/python-visualizer.html) (undated)
- **In Snap!/Scratch** a block calls itself by being dragged into its own definition. Nothing marks
  it; the announcement is that the block's own name appears inside it. — search:
  [Snap! manual mirror](https://cycomachead.gitbooks.io/snap-manual/content/contents/recursion.html)

**What this means for the app:** the person's own app, as built, already makes them the processor.
Two things follow. (a) The flat growing list *is* the loop model, the one people hold unprompted. (b)
The self-calling routine is embedded recursion, the exact case people misread, so its display has to
do what Python Tutor does: each level named by its own value, and the return made visible.

#### 2. Research practice: snowballing
Wohlin's guidelines (2014) describe chasing references and citations from a start set in
**iterations**, and studies applying them report iterating "until no further studies were included".
That is a flat list given again, round by round, ending on the round that adds nothing; no depth is
tracked. — search: [Wohlin 2014, SWOV record](https://swov.nl/en/publicatie/guidelines-snowballing-systematic-literature-studies-and-replication-software),
[a 2024 mapping study applying it](https://arxiv.org/pdf/2409.07192).
Connected Papers avoids the tree altogether: one similarity graph per origin paper, with "Prior works"
and "Derivative works" as lists. — search: [Connected Papers announcement](https://medium.com/connectedpapers/announcing-connected-papers-a-visual-tool-for-researchers-to-find-and-explore-academic-papers-89146a54c7d4) (2020).
ResearchRabbit's chained columns: memory only, not verified.

#### 3. Question trees and argument maps
- **IBIS** (Kunz and Rittel, 1970; gIBIS and Compendium later): three node kinds, question, idea,
  argument. "Both Ideas and Arguments can easily give rise to new, deeper Questions"; an answer is
  joined to its question by "responds to". A question is a first-class node that may stay open.
  — search: [Wikipedia, IBIS](https://en.wikipedia.org/wiki/Issue-based_information_system),
  [UTS, Knowledge Cartography](https://cic.uts.edu.au/tools/knowledge-cartography/)
- **Kialo** offers two minimaps. The tree view "displays the path taken to reach the selected claim"
  and limits what is visible to claims near the selected one; Kialo recommends it to new users. The
  sunburst shows everything and "can be confusing for newer users". — search:
  [Kialo Edu help, minimap](https://support.kialo-edu.com/en/hc/argument-tree) (undated)

**Borrowable:** the path from the starting question to here, and little else, is the view that works
for newcomers. Each node is named by its own sentence, never by its type.

#### 4. Tree views whose size is unknown
- Apple's disclosure triangle "points inward from the leading edge when its content is hidden and down
  when visible". — search: [HIG, disclosure controls](https://developer.apple.com/design/human-interface-guidelines/disclosure-controls)
- File browsers with lazily loaded folders show the same triangle on anything that *may* have
  children; opening it is how you find out (memory). The app's Plan already uses › and ⌄ this way.
- A reference to something already shown is marked differently from a child: Finder's alias arrow,
  Workflowy's mirror diamond (memory; Workflowy mirrors are in the 2026-11-22 research). An alias is
  not opened in place; it takes you to the original.

#### 5. Breadcrumbs that are too long
Design systems agree: keep the first and the current, collapse the middle behind an ellipsis. EU
Component Library keeps the first and last two; Pluma and Equinor keep first and last; Spectrum
prefers moving crumbs into a menu over cutting labels; Vuetify exposes a hidden count (which this app
would not show). — search: [ECL](https://ec.europa.eu/component-library/eu/components/navigation/breadcrumb/code/),
[Spectrum](https://spectrum.adobe.com/page/breadcrumbs),
[Equinor EDS](https://eds.equinor.com/docs/components/navigation/breadcrumbs),
[Pluma](https://pluma.customer.io/components/breadcrumbs/design),
[Vuetify](https://0.vuetifyjs.com/systems/emerald/breadcrumbs.md).
B-16's ruling (first routine plus nearest two) matches ECL exactly, except that B-16 shows nothing
where the middle was.

#### 6. Issue trackers
Linear: a sub-issue makes the original the parent; the parent closes by itself when all sub-issues are
done. GitHub: "Sub-issue progress" shows how many are complete. — search:
[Linear docs](https://linear.app/docs/parent-and-sub-issues),
[GitHub docs](https://docs.github.com/en/enterprise-cloud@latest/issues/planning-and-tracking-with-projects/understanding-fields/about-parent-issue-and-sub-issue-progress-fields).
Both show "what is waiting on this" as a count on the parent. The count doesn't fit; the parent
finishing by itself when its children have is rule 1 (order is dependency), already the app's.

#### 7. Process notations
BPMN 2.0 puts small markers at the bottom of an activity: a loop arrow (standard loop), three lines
(one instance per item; vertical for parallel, horizontal for sequential), a tilde (ad hoc: the
contents are done in any order), a boxed plus (collapsed, has insides). — search:
[BPMN 2.0 poster](https://www.uio.no/studier/emner/matnat/ifi/IN5140/h24/projects-and-deliverables/bpmn2_0_poster_en.pdf),
[Visual Paradigm](https://visual-paradigm.com/guide/bpmn/bpmn-sub-process-types).
BPMN has **no marker for recursion**: a call activity that calls its own process is drawn like any
other call (memory). Hierarchical Task Analysis writes repetition as a line of words in the plan
("do 1, then 2 to 4 until …") rather than a mark (memory).

#### 8. Craft conventions
Knitting patterns bracket a repeat with asterisks ("repeat from *") and end it on a state of the
work, not a count: "until piece measures 6 inches". — search:
[Craft Yarn Council](https://craftyarncouncil.com/node/56) (titles only),
[AllFreeKnitting](https://www.allfreeknitting.com/Knitting-Tutorials/how-to-read-knitting-patterns).
The end condition is something the knitter observes in the piece. "Until nothing is added" is the
same kind of condition.

#### 9. Getting lost and not coming back up
- Conklin (1987) named hypertext's two problems: **disorientation** (losing your sense of location and
  direction) and **cognitive overhead** (the effort of keeping several trails in mind). Foss (1989)
  named the **embedded digression problem**: people follow digressions and fail to return, or forget
  the path they meant to take. — search:
  [McDonald & Stevenson 1996](https://www.interruptions.net/literature/McDonald-ApplErgon96.pdf),
  [Conklin 1987 copy](https://www.ics.uci.edu/~andre/informatics223s2017/conklin.pdf)
- Altmann and Trafton's **memory for goals** (2002): a suspended goal is retrieved "if and only if
  there are cues that prime" it; cues seen at the moment of suspension, and still there at resumption,
  speed recovery, and changed cues slow it. — search:
  [Altmann & Trafton 2002](https://www.interruptions.net/literature/Altmann-CogSci02.pdf),
  [Cardiff Met, contextual cues](https://pure.cardiffmet.ac.uk/en/publications/contextual-cues-aid-recovery-from-interruption-the-role-of-associ/)
- Tree Style Tab nests each tab under the tab it was opened from, so the tree is "a visual browsing
  history" and the root tab is the way back. — search:
  [addons.mozilla.org](https://addons.mozilla.org/en-US/firefox/addon/tree-style-tab/) (the quoted
  praise is user reviews)

**What tools do about rabbit holes without timers or counts:** (1) keep the starting point on screen
as a cue, in the same words it was written in; (2) make the raised thing something you *write down*
rather than something you *follow*, so it can wait; (3) make "up" one fixed control. The app has (3)
(Step out). (2) is what a list gives. (1) is the gap.

#### Not found
Quest logs with spawned subquests, mind-map tools, Roam/Logseq linked references and Research Rabbit
were not searched successfully. Workflowy zoom and breadcrumbs were covered on 2026-11-22
(`docs/product/discovery/2026-11-22-intention-stack/`) and are not repeated.

---

### The problem, split into moments

The example throughout: the routine **Research a question**, started with "Is creatine safe
long-term?", which raised "What doses were studied?", which raised "Who funded the dose studies?".

| Moment | What the person needs to see | What today's design gives | The gap |
|---|---|---|---|
| **Writing it in Plan** | That this row will do the whole routine again, for each thing raised; that listing nothing ends it | A closed row carrying the routine's own name, never opened | A row that will not open, with no reason shown, reads as broken. Nothing distinguishes it from a call to another routine except that its name matches the heading |
| **Arriving at the step that will spawn** | That what is typed here becomes work | The list field under the note; then each item as a step with **Step in** | Enough. Step in being offered is the announcement, as for any step with insides. No new mark needed |
| **Several levels down** | Which question this is; what is waiting on it; what started it all | Path: first routine and nearest two levels | Every level has the same name. "Research a question › Research a question › Research a question" says nothing. The same is true of every other place a level is named: **Step out**'s "Left <level>", "Start <level> over", "Plan <routine>", the rows of Jump to… |
| **Deciding it is enough** | A way to stop that needs no explanation | Three, all already designed: list nothing; **Next** past a raised question without stepping in (its answer field is asked there, and may be left empty); **Step out** | None in the controls. The risk is the loop-model misreading: thinking that listing nothing ends everything. The button already prevents it: it reads Next, not Done, unless the press ends the whole run |
| **Coming back up with what was found** | What each raised question gave, at the place the answer is written | The children's `{answer}` collected under the parent's name; the parent's giving step "is shown the collected list to adjust" | Good as designed: what came back is in the very field the answer is written in. It needs the parent's question to be on screen at that moment, which the naming fix supplies |

So one gap carries most of the weight: **a level has no name of its own**. The rest is already in
B-16.

---

### Options for this app

Marks used below are the app's own: › and ⌄ (opens), HERE, `{ }` chips, "gives", "asks", "with",
❚❚, →. `▓text▓` stands for a value shown in place, inverted.

#### Option A — A level is named by what it was given
From Python Tutor's frames (each copy labelled by its own values), Kialo's tree path and the
breadcrumb conventions. **One rule:** where a level's routine has the same name as the level above
it, the level is named by the value it was called with. That rule applies everywhere a level is named.
In Plan the self-call is a closed row with two words where the chevron would be.

Plan:
```
PLAN                                   ⌂ Home
Research a question                       ···
asks {question}

⠿ Find what bears on {question}           ···
⠿ List the questions this raises          ···
    gives {raised}
⠿ For each {raised question}              ···
    Research a question                this routine
      with {raised question}
⠿ Write the answer to {question}          ···
    gives {answer}
+ Add a step
```
Runner, three levels down:
```
❚❚  Research a question                  Plan
    Is creatine safe long-term? › …
    › What doses were studied?
    › Who funded the dose studies?
{ } question: Who funded the dose studies?

      ┌──────────────────────────┐
      │ Find what bears on       │
      │ ▓Who funded the dose     │
      │ studies?▓                │
      └──────────────────────────┘

            ▬▬
Step out                          Next →
```
Pull-up panel (the tree view B-16 already scopes, reading the same names):
```
Research a question
  Is creatine safe long-term?
      at For each raised question
    What doses were studied?
        at For each raised question
      Who funded the dose studies?          HERE
          at Find what bears on …
then: List the questions this raises
Back to …      Jump to…
Start Who funded the dose studies? over
```
Coming back up (the parent's last step, after its for each has passed its last item):
```
❚❚  Research a question                  Plan
    Is creatine safe long-term?
    › What doses were studied?
{ } question: What doses were studied?

      ┌──────────────────────────┐
      │ Write the answer to      │
      │ ▓What doses were         │
      │ studied?▓                │
      └──────────────────────────┘
answer
  The supplement makers, in four of six trials
  Yes, since 2019
Step out                          Next →
```
- **Announces** by the routine's own name appearing in its own Plan (the Snap! convention) plus "this
  routine". **Depth** is the path getting longer, in the person's own sentences, then holding at three
  with "…". **What is waiting** is the crumb before yours. **Stopping** is unchanged. **What came
  back** is in the field.
- **Costs.** The path gets taller: three questions can take five lines at 390 px and more at 200 %
  text, and the note shrinks to fit (the rule allows it). The current question appears three times
  (path, chip, note). "…" inside the path is close to the ··· that means "more"; it must be plain
  text in the path, never a button. "this routine" is two words of app language, kept because a row
  that silently refuses to open is a mistake waiting to happen ("a label that prevents a mistake
  stays").
- **Verdict: fits.** No new mark, no count, no explanatory text; the path stays words and not a
  control. It refines B-16's designer's ruling on the path line rather than replacing it.
- **Size: M** on top of the self-call (path selector, Step out's notice, Start over, Jump to…, Plan
  door, panel, spoken names). The display work is Light tier. The self-call it belongs to is already
  **big** (B-16: it removes "A routine can't contain itself").

#### Option B — One growing list; each item remembers where it came from
From snowballing and the loop model. No nesting: one for each over `{questions}`, with a step that
gives the list again. To keep "what raised this", an item added while the for each stood on another
item carries "from <that item>", in the wording the value sheet already uses.

Plan:
```
Research                                  ···
asks {questions}

⠿ For each {question}                     ···
    Find what bears on {question}
    Write what you found                  gives {finding}
    Adjust the list: what does this raise gives {questions}
⠿ Write the answer                        ···
    gives {answer}
```
Runner (the path never grows):
```
❚❚  Research                             Plan
{ } question: Who funded the dose studies?

      ┌──────────────────────────┐
      │ Find what bears on       │
      │ ▓Who funded the dose     │
      │ studies?▓                │
      └──────────────────────────┘
Next →
```
The list, when it is given again, and in the chip's value sheet:
```
questions
  Is creatine safe long-term?
  What doses were studied?
      from Is creatine safe long-term?
  Who funded the dose studies?
      from What doses were studied?
  ____________________________
Keep                              Close
```
- **Announces** by the step that shows the list again. **Depth** is not shown because there is none;
  ancestry is one "from" line per item. **What is waiting**: only the closing step, on everything.
  **Stopping**: add nothing. **What came back**: `{finding}`, collected, in the closing step's field.
- **Costs.** No question's answer waits on its own sub-questions: all findings arrive together at the
  end, as one flat list. The list, seen whole, shows what has not been reached; B-16 already accepts
  that ("nothing may count the list"). "from" is written by the app next to the person's words, so it
  must be a second line, never part of the item.
- **Verdict: fits.** It is P-98 as already approved plus one derived line.
- **Size: S** on top of P-98's list editor. Not big by itself if "from" is derived from the run's
  record; **big** if it is a new stored field (to settle in P-98's contract).

#### Option C — The whole question tree, growing in the panel
From outliners, mind maps, Kialo's minimap and Tree Style Tab. The panel shows every question raised
so far as an indented outline, each with its answer once it has one; tapping one goes there.
```
Is creatine safe long-term?
  What counts as long-term?
      Five years or more, in the trials
  What doses were studied?
    Who funded the dose studies?            HERE
    Were the doses weight-adjusted?
  Does it affect the kidneys?
```
- **Costs.** Unanswered rows are exactly "how much is left", and the answered ones a tally. Tapping to
  go anywhere breaks rule 1 inside a single sequence (it is right for P-99's parts, which are
  unordered, and wrong here, where order is the dependency). It needs its own scrolling surface at any
  real size.
- **Verdict: fits if changed**, and the change turns it into Option A's panel: show only the chain
  from the first question to HERE, no siblings, no go-to. The whole tree with answers belongs in
  Looking back, after the run, where nothing is left to be counted.
- **Size: L; big** (close to a new screen).

#### Option D — A mark that means "makes more of itself"
From BPMN's loop and multi-instance markers; also depth shown as dots, bars or indentation on the
runner.
- **Verdict: doesn't fit.** "An icon only where conventional and unambiguous": no such convention
  exists for recursion (BPMN itself has none), and the nearest glyph, ↻, already means Repeat from
  here ("a mark never means two things"). Dots or bars for depth are a count drawn as shapes.

---

### Flat growing list versus a routine that calls itself

| | Flat list given again | Routine that calls itself |
|---|---|---|
| Matches | The loop model, which most people hold unprompted (Kahney); how researchers actually snowball (Wohlin: rounds until nothing new) | The copies model, which has to be shown to be held (George: correct with the diagram, wrong without) |
| Order the work is met in | Raised items go to the end, so the current round finishes before anything deeper starts | Depth first: the first thing raised is followed to its bottom before its sibling is seen |
| Rabbit-hole risk | Low. A raised question is written down, not followed (Foss's digression is deferred by construction) | The shape of a digression. Needs the starting question kept on screen (Altmann and Trafton: cues) |
| What waits on what | Only the closing step waits, on everything | Each answer waits on its own raised questions, and reads theirs |
| Reads naturally when | "Keep going until nothing new turns up": reading lists, gaps in a skill, snags, chores a job throws up | "I can't answer this until I've answered those": a question whose answer is composed from sub-answers; a part made of parts; a decision that rests on smaller decisions |
| Where it goes wrong | When the person finds themselves carrying "which question was that for?" in their head. Option B's "from" line delays this; it does not remove it | When there is nothing to write after the children return. Then the nesting buys nothing and costs orientation |

The test a person can apply without the app's language: **is there something to write after the
smaller ones come back?** If yes, it calls itself. If no, it is a list. That is B-16's "when to use
which", and the education research explains why it is the right line: work after the return is
exactly what the loop model cannot hold.

---

### A recommendation

**Option A: name a level by what it was given**, with Option B's flat list staying the first shape a
person reaches for (it is already approved in P-98 and needs nothing from this report but the "from"
line).

Why A:
- It closes the one real gap (a level with no name of its own) with a rule, not a feature: no mark, no
  screen, no stored field.
- It is what the evidence says the hard case needs: copies shown as copies, each by its values; the
  starting question on screen the whole time as the cue that brings the person back up.
- It serves the owner's standing wish. Every word on the path is a sentence the person typed. They
  never see "level", a depth, or the routine's name three times over.
- The rule is useful before any routine calls itself: the same routine used twice in a chain, or a
  for each stepping into a call, already produces a path where the value says more than the name.

**Smallest first slice** (Light tier, no stored data, buildable with P-98's for each and before the
self-call is unparked): one selector in `src/domain/runView.ts` that names a level, used by the path,
Step out's notice, Start over, the Plan door's spoken name and Jump to…. It returns the value the
level was called with when the routine's name repeats the level above, and the routine's name
otherwise. Unit-tested on a hand-built three-level run; nothing else changes. The "this routine" row
and the "…" in the path come with the self-call itself.

**Before any of it:** the owner can try both shapes on paper or in today's app with a real question
(B-16's "Trying the discipline before anything is built" gives the flat form) and report whether the
answer ever needed to wait on its own sub-answers. That decides whether the self-call is unparked at
all.

---

### Open questions for the owner

1. **The two words on the closed row.** "this routine", "itself", "again", or nothing but the matching
   name? Which would you have written?
2. **The middle of a long path.** Plain "…" between the first question and the nearest two (the web's
   convention, but close to ···), or nothing, as B-16's ruling has it (shorter, but it reads as if the
   nearest question came straight from the first)?
3. **The current question three times** (path, chip, note). Should the path stop at the question that
   is waiting on this one, and leave the current one to the chip and the note? It saves room and
   breaks the convention that a path ends where you are.
4. **Does the path keep the routine's name at all** once the levels are named by their questions, or
   is the first question enough?
5. **Depth first.** In the nested shape the first thing raised is followed to the bottom before the
   second is looked at. Is that how you research, or do you want to see everything a question raised
   before going into any of it? If the second, the flat list is your shape and the self-call can stay
   parked.
6. **"from <item>" beside a list item** (Option B): wanted, or is it the app talking in your list?
7. **After the run:** is the whole tree of questions and answers something you want to read back
   (Looking back), or does only the final answer matter?
