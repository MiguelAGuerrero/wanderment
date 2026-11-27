# A standard library of routines: methods worth packaging (2026-11-27)

_Discovery for the owner's request of 2026-11-27. Curated by /product from three research reports
(learning and reflection; deciding, solving, researching and getting started; big templates and how
libraries are packaged). The raw reports are local files: `.polish/product/discovery-stdlib-learning.md`,
`-deciding.md`, `-templates.md`. Nothing here is built, and nothing here is a decision._

> **Verification caveat. No source page could be opened, on two attempts.** The first pass was refused
> by this environment's network. For the second, PubMed's two sites were allowed, and PubMed itself
> then refused automated access. So every citation below still comes from a search-result summary
> ("search") or from recall ("memory"), as marked. A second, independent search pass cross-checked 24
> of about 50 citations: 13 agreed, and the discrepancies it found are corrected below (still at
> "search" grade). Effect sizes and study counts must be checked against the papers by a person before
> anything is shown or quoted as fact. Not cross-checked at all: S9, S11, S12, S13, B4. S14's grade
> ("moderate to strong") rests on two studies and may be nearer "moderate". Detail:
> `.polish/product/discovery-stdlib-verification.md` (local).

## What was asked
The owner: "productivity routines, whether that be reflection, research, decision making, problem
solving … psychology, or learning theory … that can be packaged into well-formed routines with proper
inputs and outputs that can generate work that we can leverage in a quick composer or a template
library of sorts, where we could rely on a standard library to reference in a user's created routines …
Think like the Lodash of the app, where either these are small functions that can be slotted wherever,
or we have templates that are purposed to model big goals like learn a skill, do research, make a
project, etc. … generalizable enough to be used towards any specific purpose."

**Read "The library, in three layers" first:** it is the current proposal. Sections after it are the
research it was built from.

Chosen by the owner for this round: a catalogue only (no brief, nothing built); research-backed first,
with practitioner conventions labelled; a tight core; web research with sources.

Every routine is written in the notation of [`../briefs/B-16-thread-queues.md`](../briefs/B-16-thread-queues.md):
**asks** (a name it reads), **gives** (a name it produces), **adds to** (work it puts on a list),
For each, In any order. All need P-98 and P-99 except where marked.

## What the research found
1. **The best-supported methods share one shape, and it is the app's.** Produce something, compare
   it, list what is off, work each item, again: retrieval practice, error analysis, the after-action
   review and deliberate practice are all B-16's "attempt, ask, resolve, again". Not one method needed
   a conditional; an empty list did that job every time.
2. **A template is copied; a method is called.** A big template is mostly kept lists, and a kept list
   belongs to the routine, so "Learn a skill" for guitar and for Spanish cannot share one routine: the
   person takes a copy per aim (DESIGN.md: "to vary, copy"). A small method keeps no list, so one
   routine can be called from everywhere.
3. **A called method hands back what its call row says it gives.** All three reports read
   DESIGN.md's "a name a routine gives anywhere inside itself is its own" as meaning nothing returns.
   That was already settled with the owner on 2026-11-26 (the design canvas's "No collisions" note;
   P-98: "a call row shows … what it gives"): names stay local **except** what the call row says the
   routine gives, which is returned to the caller at the call, like a function's return value. So the
   "gives" lines below work as written once P-98 lands, and DESIGN.md's sentence gains that clause.
4. **What the refusals cost.** Spacing by schedule (strong evidence) survives only as a kept list with
   no dates. Recording progress (research-backed) is declined on purpose. Timed blocks, goals with a
   number and a date, and commitment devices are out.
5. **Popular methods that did not pass the bar:** literal 5 whys, weighted decision matrices with
   totals, pros-and-cons lists, the Eisenhower matrix, SMART goals, learning styles, the 10,000-hour
   rule. The pre-mortem stays, with thinner support than its reputation.
6. **A kept list between two parts is a wait with no clock.** A wait step inside a for each holds up
   every later item; one part adding to a list another part runs over does not. That gives "ask
   several people" and "let it rest" without timers.
7. **A correction to B-16's own example.** "Summarise it in two lines" with the source open is
   summarising, rated low-utility for learning (Dunlosky et al. 2013, search); "close it and write two
   lines from memory" is retrieval, rated high. B-16's Study example is changed to match.

## The library, in three layers (rewritten 2026-11-27)
The owner asked for a fresh review of the first proposal and then for this rewrite ("Yes rewrite the
library catalogue"). The review (`.polish/product/review-stdlib-core.md`, local; it checked no research
claim) found that the first proposal was a catalogue of techniques, not a library: one checking loop
appeared about ten times under different names, signatures did not plug into each other, several
closing steps asked the person to act on results they could no longer see, and parts of it had gone
stale against the owner's later rulings. This section replaces "the first shelf". The research notes
further down are kept for their sources and evidence; **the routines in them are superseded by the
ones here.**

1. **Core functions (7).** General and callable by themselves. No kept list, no wait.
2. **Named methods (13).** Thin wrappers that set the condition a research finding depends on and then
   call the core, plus five methods that are their own thing.
3. **Templates (5).** Copied per aim; they hold the kept lists and call methods and core.

**The rule for the core: abstract the object, never the action.** "Compare {attempt} with {reference}"
fails on a phone because the verb is abstract. "Set {work} beside {standard} and go through it point by
point" says what the hands do, and only the nouns vary. A method's research finding travels in one of
three ways: a wrapper step before the call ("Put {material} out of sight"); an input that names the
constraint (`{rule}`, `{angle}`); or the standard or tests passed in. Where none of the three carries
it, the method stays its own routine.

Notation: B-16's. `Name · with {x}` passes a value of the same name; `with {x} as y` passes it under
another name; words in quotes are typed where the call is written. A step that gives a name which
already has a value shows that value to adjust.

### Layer 1 — Core functions

**Say what done is** · asks `{work}` · gives `{standard}`
```
Say what done is                                          asks {work}
  List what must be true of {work} for it to be done      gives {standard}
  Strike what would be nice and is not needed             gives {standard}
  Reword each so you could check it by looking            gives {standard}
```
Drawing: `{work}` "a fist from three-quarter view" → "the outline matches a tracing of the photo · the
knuckles sit on a curve". Debugging: "the fix for the double charge" → "the failing test passes · the
log shows one charge per order".

**Check and mend** · asks `{work}`, `{standard}`, `{rule}` · gives `{faults}`
```
Check and mend                                            asks {work}, {standard}, {rule}
  Set {work} beside {standard} and go through it point by point
  List each place it falls short, as a thing in the work  gives {faults}
  For each {fault}
    Redo only the part of {work} where this is: {fault}. Keep to: {rule}
    Check that part against {standard} again
    Add what is still off, and what the fix exposed       gives {faults}
```
`{rule}` is the condition every redo keeps to, and is where a method's finding travels when it sits
inside the loop. "As a thing in the work" stays in the core's own words because it holds for every
caller (feedback aimed at the person can lower performance). Drawing: rule "change only that one
thing". An essay: standard "the editor's notes", rule "cut before you add". Memory: standard the
source, rule "from memory, with it out of sight again".

**Keep the lesson** · asks `{cases}` · gives `{lessons}`
```
Keep the lesson                                           asks {cases}
  List what explains {cases}: what more than one shares, or what led to each    gives {lessons}
  For each {lesson}
    Name the routine and the point in it where this would have helped: {lesson}
    Reword it as a step you could follow there            gives {lessons}
  Open Plan and put each of {lessons} where it belongs
```
The app's own bet ("sharpened each time they run it") as a function. One visit to Plan, at the end.

**Make it startable** · asks `{whole}` · gives `{parts}`
```
Make it startable                                         asks {whole}
  List the parts of {whole}, the dull ones included       gives {parts}
  Reword each part so it begins with something to do with your hands    gives {parts}
  Put {parts} in the order they must happen               gives {parts}
```
(The review called this "Break down"; it keeps the first proposal's name so it is not confused with
Plan's own "Break it down".) A caller runs `For each {part}` over the result.

**Gather options** · asks `{problem}` · gives `{options}`
```
Gather options                                            asks {problem}
  List every answer to {problem} that comes, judging none gives {options}
  State {problem} with its particulars taken out          gives {bare problem}
  Add what is done about this elsewhere: {bare problem}   gives {options}
  Add leaving things as they are, and one you would not pick first    gives {options}
```

**Choose** · asks `{options}`, `{tests}` · gives `{choice}`
```
Choose                                                    asks {options}, {tests}
  For each {test}
    Mark each of the options with how it does on this alone, from evidence: {test}    gives {options}
  Strike the options that fail a test that must hold      gives {options}
  Name the one you take, and what you give up by it       gives {choice}
```
The loop runs over tests, never over options, which is the guard against the halo effect. The marks
are written onto the options themselves, so the last two steps show every option with everything said
about it. No grid, no weights, no total.

**Try to break it** · asks `{claim}`, `{angle}` · gives `{doubts}`, `{revised}`
```
Try to break it                                           asks {claim}, {angle}
  State {claim} and how sure you are, in words            gives {before}
  Take this as fact: {angle}. List the reasons that come easily    gives {doubts}
  For each {doubt}
    Name what you would see if this were so, and look for it: {doubt}
    Reword it with what you found                         gives {doubts}
  Strike the doubts that did not hold up                  gives {doubts}
  State {claim} again beside {before}, changed by the doubts left    gives {revised}
```
The angle is the method: "it was carried out and failed badly" is the pre-mortem; "the opposite is
true" is considering the opposite; "the person who disagrees is right" is stating their side.

*Not in the core:* the review also proposed "Put it down" and "Pick it up". The owner had already
judged that pair unnecessary indirection, since pausing presents the note and returning shows it.

### Layer 2 — Named methods

**Wrappers over the core.** Each keeps the one step its evidence depends on in plain sight.
```
Recall before you look                                    asks {material} · gives {faults}
  Put {material} out of sight
  Write down everything you can recall of it
  Check and mend · with "what I recalled" as work, {material} as standard,
                   "from memory, with it out of sight again" as rule

Practise at the edge                                      asks {subject} · gives {faults}
  Name one thing in {subject} just beyond what you can do gives {work}
  Say what done is · with {work}
  Attempt it, with full attention: {work}
  Check and mend · with {work}, {standard}, "change only that one thing" as rule

Teach it plainly                                          asks {topic} · gives {faults}
  Put your sources on {topic} away
  Write an explanation of {topic} for someone new to it
  Check and mend · with "my explanation" as work,
                   "every term explained and no step skipped, for someone new to it" as standard,
                   "look it up, then rewrite with the sources away again" as rule

Work through the errors                                   asks {work}, {standard} · gives {lessons}
  Check and mend · with {work}, {standard}, "mend the cause, not only the place" as rule
  Keep the lesson · with {faults} as cases

Review after doing                                        asks {work} · gives {lessons}
  State what you set out to do in {work}, and what happened
  List what went well and what fell short, each with why  gives {cases}
  Keep the lesson · with {cases}

Find how it fails                                         asks {plan} · gives {doubts}, {revised}
  Try to break it · with {plan} as claim, "it was carried out and failed badly" as angle

Argue the other side                                      asks {belief} · gives {doubts}, {revised}
  Try to break it · with {belief} as claim, "the opposite is true" as angle

Weigh the options                                         asks {decision} · gives {choice}
  Gather options · with {decision} as problem
  List what matters in {decision}, each thing separate    gives {tests}
  Choose · with {options}, {tests}
```

**Methods that are their own thing.** No core function carries their finding.
```
Set a cue to start                                        asks {aim} · gives {cue}
  Name the first small action for {aim}                   gives {action}
  Name the moment it follows, something you already do or a place you will be    gives {cue}
  Put this where it happens: When {cue}, I will {action}

Take the outside view                                     asks {project} · gives {forecast}
  State your own guess for {project}                      gives {guess}
  Name the kind of thing {project} is                     gives {kind}
  List past cases of this kind, with how each really went: {kind}    gives {cases}
  State what usually happens across {cases}               gives {usual}
  Set the forecast beside {guess}: start from {usual}, move only for what is truly different    gives {forecast}

Check a source                                            asks {source} · gives {trust}
  Leave {source} before reading it closely
  Search for who is behind {source} and what others say of them      gives {standing}
  Find where its main claim first came from               gives {origin}
  State how far to trust it, given {standing} and {origin}: {source} gives {trust}

Explain each step                                         asks {example} · gives {gaps}
  List the steps or claims in {example}                   gives {claims}
  For each {claim}
    Write why this holds, or why it comes next: {claim}
    Mark it if you could not explain it                   gives {claims}
  Strike the claims you could explain                     gives {gaps}

Compare two cases                                         asks {cases} · gives {principle}
  Set the two side by side: {cases}
  List what they share, before any difference             gives {shared}
  State the one idea that explains {shared}               gives {principle}
```
**From the owner's own use** (a drawing session, 2026-11-27: trying a technique with and without
guidelines, "you're in an experimental phase, you're trying to just answer this question, and this all
gets joined to the result that decides how I want to use a specific function"):
```
Try it more than one way                                  asks {question}, {ways} · gives {choice}
  Say what done is · with {question} as work
  For each {way}
    Do it this way: {way}
    Mark the way with what it showed, against {standard}  gives {ways}
  Choose · with {ways} as options, {standard} as tests
```
`{ways}` holds routines (variants made with Copy), so "Do it this way" steps into each; each is marked
with what it showed, in words beside its name; `{choice}` comes back as the routine chosen, and the
caller's later steps apply it ("Do {choice}"). It is the first library method that came from use and
not from the literature.

"Set a cue to start" was "An if-then plan"; the cue is a situation, never a clock time, and the app
does nothing at it. "Come back to it" (spaced recall) is no longer a method: a method keeps no list.
It is a For each over a kept list in the person's own routine that calls "Recall before you look"
(see Learn ▢ below).

### Layer 3 — Templates
Copied per aim. No template contains a wait step (owner: "waits out"); a person who is waiting on
someone pauses.
```
Learn ▢
  State what you want to be able to do                    gives {aim}
  parts:  (kept, at this level)                           + Add
  In any order
    Practise
      For each {part}
        Practise at the edge · with {part} as subject
        Adjust the parts: add what you still can't do, from {faults}     gives parts
    Study
      For each {topic}:  (its own, kept)                  + Add
        Find one good source on {topic}
        Recall before you look · with "that source" as material
        Adjust the parts: add what to practise from {faults}             gives parts
    Use it
      For each {piece}:  (its own, kept)                  + Add
        Make it for real, start to finish: {piece}
        Review after doing · with {piece} as work
```
```
Find out ▢                                                (copies "Research a question")
Research a question                                       asks {question} · gives {answer}
  State what you think the answer is, and what would change your mind
  Find what bears on {question}, and list the sources worth keeping    gives {sources}
  For each {source}
    Check a source · with {source}
    Mark it with how far to trust it: {trust}             gives {sources}
  List the questions this raises                          gives {raised}
  For each {raised question}
    Research a question · with {raised question} as question            ← itself
  State the answer to {question}, from {sources} and what the raised questions gave    gives {answer}
```
```
Make ▢
  State who it is for and what it should do for them      gives {brief}
  Say what done is · with {brief} as work
  Gather options · with {brief} as problem
  For each {option}
    Make the cheapest version of this that can be tried: {option}
    Try it on someone, or on yourself, and mark the option with what it showed    gives {options}
  Choose · with {options}, {standard} as tests
  Find how it fails · with {choice} as plan
  Build the first whole version of: {revised}
  Check and mend · with "the first version" as work, {standard},
                   "show it to someone after each change" as rule
  Review after doing · with "the whole project" as work
```
```
Make a decision                                           asks {decision} · gives {choice}
  State {decision} as a choice between things you can do
  Weigh the options · with {decision}
  In any order
    Find how it fails · with {choice} as plan
    Argue the other side · with {choice} as belief
    Take the outside view · with {choice} as project
  State the choice again, and what you would have to see to reopen it,
    from what the three gave                              gives {choice}
```
```
Work it out as you go                                     asks {aim}
  List the first steps toward {aim}                       gives {steps}
  For each {step}
    Do {step}
    Adjust the list: what does that make possible         gives {steps}
```
"Make a decision" keeps no list, so it can be called as well as copied.

### How the first proposal maps onto this
| First proposal | Now |
|---|---|
| S1 Recall before you look, S4 Practise at the edge, S6 Teach it plainly | Wrappers over Check and mend |
| S2 Work through the errors | Check and mend, then Keep the lesson |
| S3 Review after doing | A wrapper over Keep the lesson |
| S9 Make it startable | A core function |
| S10 Find how it fails, S11 Argue the other side | Try to break it, with two angles |
| S13 Weigh the options | Gather options, then Choose |
| S8, S12, S14, S5 | Their own; S8 renamed "Set a cue to start" |
| S7 Come back to it | Not a method; a kept list in the person's routine |
| B1–B4 | Rewritten on the methods; B2 calls itself; B3 has no waits |
| From the survey | Say what done is (now core), Compare two cases, Work it out as you go |
Across all 88 candidates the review judged about 39 a core call, wrapper or composition, about 12
plain For each idioms better left as house style, and about 37 not reducible (mostly the
self-management survey), which stay candidates in the survey file.

### A closed vocabulary
A name is reused only when it holds the same kind of thing, so a caller's value arrives by name with
nothing typed.

| Name | Holds | Given by | Asked by |
|---|---|---|---|
| `{work}` | the thing being made or done, named so you could point at it | the caller | Say what done is, Check and mend |
| `{standard}` | what the work is judged against: a source, a model, or what must be true | Say what done is, or the caller | Check and mend |
| `{rule}` | the condition every redo keeps to | typed at the call | Check and mend |
| `{faults}` | places the work fell short, each as a thing in the work | Check and mend | |
| `{cases}` | things that happened, to learn from | the caller | Keep the lesson |
| `{lessons}` | each worded as a step | Keep the lesson | |
| `{whole}` / `{parts}` | something too big to start / its startable pieces, in order | the caller / Make it startable | |
| `{problem}` / `{options}` | what an answer is wanted for / candidate answers with what was said of each | the caller / Gather options | Choose |
| `{tests}` | what an answer must do, one thing each | the caller | Choose |
| `{choice}` | the option taken and what was given up | Choose | |
| `{claim}` / `{angle}` | a plan, belief or forecast as a sentence / the stance doubts come from | the caller / typed at the call | Try to break it |
| `{doubts}` / `{revised}` | reasons that held up, with what was found / the claim restated | Try to break it | |

Plugs with nothing typed: Say what done is → Check and mend (`{standard}`); Gather options → Choose
(`{options}`). Rebound at the call, on purpose and visibly: `{faults}` as cases, `{choice}` as plan or
claim, `{standard}` as tests. A fault becoming a case is a change of role, and the call row says so.

### House style for library routines
1. A list is a regular plural and its item the singular (faults / {fault}).
2. The verb says where the product goes: *List* gives a list and *Name* or *State* give one short
   thing, typed in the app; *Write*, *Draw*, *Make*, *Redo* and *Read* happen in the person's own
   material and give nothing.
3. An output name says the product, not the moment (`{revised}`, not `{after}`).
4. Every given name is read in braces by a later step, or is in the call row.
5. Results are collected inside a loop by giving the outer list again; no step asks the person to
   act on results from memory.
6. A function gives at most two names to its caller.
7. A long value goes last in a step, after a colon, so the sentence survives any wording of it.
8. Inputs are named for a role, never a domain (`{work}`, not `{draft}`).
9. No kept list, no wait and no "Open Plan" inside a loop, in a core function or a method.
10. A template never uses a core name for something else, since values pass by name.
11. Names are verb-first and read after "Plan" and "Start".
12. No more than three levels: a template calls a method, which calls the core.

### What this rewrite assumes of P-98 (to settle in its contract)
- **Typed words at a call** (`with "what I recalled" as work`). P-98 has `with {y} as x`; a literal is
  the same thing with the value typed in Plan.
- **An input is the callee's own copy.** Choose marks and strikes `{options}`, which it was handed. That
  must change only its copy; the caller's list is untouched and the result comes back as `{choice}`.
- **Two calls in one routine that give the same name** are collected into one list under that name
  (settled by the owner, 2026-11-27; B-16). Make a decision's closing step reads `{doubts}` from both
  checks; Research a question's closing step is shown the collected `{answer}` to adjust into one.
- **An input that never asks.** `{rule}` is required only because optional inputs (DESIGN.md's designed
  "blank") are not built; with them, a bare call to Check and mend would not ask for a rule.

### What it costs
- **A wrapper looks thinner in the library's preview than it runs:** the preview of "Recall before you
  look" shows three rows, one of them a call. Someone deciding whether to copy it sees less.
- **Outside feedback is gone from every checking method**, because no library routine holds a wait
  step. The outside eye is what the deliberate-practice research leans on most.
- **The evidence was gathered per technique.** A core function has no study of its own; the grade
  belongs to the method that wraps it, and the research notes below still say which.

## Research notes: the small methods as first drafted
_Kept for the sources, the evidence grade and the worked example of each. The routines themselves are
superseded by "The library, in three layers" above; some use the older "adds to" wording._

### S1. Recall before you look
For fixing material in memory and finding what has not stuck.
- **Sources:** Dunlosky et al. 2013 (high utility); Rowland 2014 (g = 0.50);
  Adesope et al. 2017. All [search], none opened.
- **Evidence: strong.** Hundreds of experiments, several meta-analyses, across ages and materials.
  Weaker evidence for complex skills than for facts and concepts.

```
Recall before you look                                   asks {material}
  Put {material} out of sight
  Write down everything you can recall of {material}
  Check what you wrote against {material}
  List what you missed or got wrong                      gives {misses}
  For each {miss}
    Read the part of {material} that covers {miss}
    Put it away and write {miss} out from memory
    List what is still missing                           adds to {misses}
```
- **Gives:** `{misses}` (empty when everything was recalled, so the For each passes straight through).
- **Size:** small. **Verdict: fits.**
- **Example (programming):** `{material}` = "the Rust ownership chapter". Recalled: move semantics,
  borrowing. Missed: "when a mutable borrow ends". Read that section, close it, write it out; nothing
  further added; the routine ends.

### S2. Work through the errors
For turning feedback or a comparison into specific changes.
- **Sources:** Wisniewski, Zierer and Hattie 2020 (d = 0.48; information-rich feedback larger)
  [search]; Kluger and DeNisi 1996 (d = .41 on average, yet over a third of
  interventions lowered performance; the authors' account is that feedback hurts as it moves
  attention from the task to the self) [search, secondary]; Keith and Frese 2008 (d = 0.44; 0.80 on transfer to new tasks) [search].
- **Evidence: strong that it helps on average; moderate for this exact form.** The wording "in the
  work, not in you" is there because of Kluger and DeNisi.

```
Work through the errors                                  asks {attempt}
  Compare {attempt} with a model, a reference or the notes you were given
  List each error or weak spot, as a thing in the work   gives {errors}
  For each {error}
    Write what led to {error}
    Write what to do at that point instead
    Redo that part of {attempt}
  List the causes that came up more than once            gives {patterns}
```
- **Gives:** `{patterns}`. In a caller with a kept list of things to practise, the last step is
  better written `adds to subjects`.
- **Variant with outside feedback:** put `Wait for: feedback on {attempt}` first. A wait step has no
  clock, which suits feedback that arrives when it arrives.
- **Size:** small. **Verdict: fits.**
- **Example (writing):** `{attempt}` = "the essay draft with the editor's comments". Errors: "the
  claim arrives in paragraph four", "three sentences open with 'However'". Pattern: "I warm up on
  the page before I say the thing".

### S3. Review after doing
For learning from a piece of work that has just ended (the after-action review).
- **Sources:** Tannenbaum and Cerasoli 2013 (46 samples; about 20–25 % better performance); Ellis
  and Davidi 2005 (review successes as well as failures); Di Stefano, Gino, Pisano and Staats (working paper 2014, revised 2023; journal version
  listed as in press, Management Science; reflection beat extra practice). [search]
- **Evidence: strong** for structured debriefs, with individuals as well as teams. The four-question
  wording itself is the US Army's convention; the meta-analysis supports the structure (an intent, a
  comparison, causes, a forward change), not those exact words.

```
Review after doing                                       asks {work}
  Write what you set out to do in {work}
  Write what happened
  List what went well, each with why                     gives {keeps}
  List what fell short, each with why                    gives {shortfalls}
  For each {shortfall}
    Write the one thing to do differently
    Open Plan for the routine you ran and put it where it belongs
```
- **Gives:** `{keeps}` and `{shortfalls}`; its lasting output is the changed routine.
- **Size:** small. **Verdict: fits**, and it is the app's own bet ("a routine … sharpened each time
  they run it") made into a step. Note it sends the person from the runner to Plan, which pauses the
  run; that is the designed "plan, execute, plan, execute".
- **Example (drawing):** `{work}` = "the commissioned portrait". Went well: "thumbnails first, so the
  composition never changed". Fell short: "hands redrawn four times". Change: add "List what you
  can't draw yet" before Line art in *Make a piece*.

### S4. Practise at the edge
One sitting of deliberate practice on one thing.
- **Sources:** Ericsson, Krampe and Tesch-Römer 1993 (definition) [search, as quoted by later
  papers]; Macnamara, Hambrick and Oswald 2014 (26 % of variance in games, 21 % in music, 18 % in sports, 4 % in
  education, under 1 % in professions; about 12 % overall per the press release) [search].
- **Evidence: moderate, and contested.** The link between accumulated practice and level is
  correlational and its size is argued over. The ingredients (a target just beyond reach, a way to
  judge, immediate feedback, another attempt) have experimental support of their own (S1
  and S2). Not a claim that practice alone makes an expert.

```
Practise at the edge                                     asks {subject}
  Name one thing in {subject} just beyond what you can do      gives {target}
  Name how you will tell a good attempt from a poor one        gives {check}
  Attempt {target}, with full attention
  List what was off, against {check}                           gives {faults}
  For each {fault}
    Attempt {target} again, changing only {fault}
    List what is still off                                     adds to {faults}
```
- **Gives:** `{target}`. It ends on the attempt after which nothing is added; Step out leaves early.
- **Size:** small. This is the routine B-16 calls "Deliberate practice · with {subject}".
- **Verdict: fits if changed.** Changed: Ericsson's version has a teacher designing the task and
  sessions of limited length; here the person sets the target and no session length is kept (no
  timers). Lost: the outside eye, which is why `{check}` is asked for before the first attempt.
- **Today's app (before P-98):** the same with "Repeat from here" above "Attempt" and "Name the one
  thing to change", leaving with Step out.
- **Example (drawing):** `{subject}` = "hands". Target: "a fist from three-quarter view". Check:
  "overlay on the photo reference". Faults: "knuckle line flat", "thumb too long". Each is redrawn
  alone; the second redraw adds "wrist too narrow"; that is worked, nothing more is added.

### S5. Explain each step
For understanding why something works, where reading it only feels like understanding.
- **Sources:** Bisra et al. 2018 (g = 0.55); Dunlosky et al. 2013 (self-explanation and elaborative
  interrogation, both moderate). [search]
- **Evidence: moderate.** A medium effect across 64 reports; fewer long-delay and real-classroom
  studies. Elaborative interrogation depends on having some prior knowledge to draw on.

```
Explain each step                                        asks {example}
  List the steps or claims in {example}                  gives {claims}
  For each {claim}
    Write why {claim} holds, or why it comes next
    Write how {claim} connects to something you already know
  List the claims you could not explain                  gives {gaps}
```
- **Gives:** `{gaps}`, for the caller to study.
- **Size:** small. **Verdict: fits.**
- **Example (music production):** `{example}` = "a reference mix's drum bus chain". Claims: "high-pass
  at 30 Hz", "slow-attack compressor", "parallel saturation". Could not explain why the attack is
  slow: `{gaps}` = "compressor attack and transients".

### S6. Teach it plainly
For finding the holes in what you think you understand. Known as the Feynman technique.
- **Sources:** Kobayashi 2024 (Educational Psychology Review; 39 studies; g = 0.27 overall for teaching
  after studying, 0.48 when the studying was done expecting to teach); Koh, Lee and Lim
  2018 (the benefit comes from retrieving, so the notes must be closed) [search]. The named
  four-step technique: study-skills pages and a 2026 review of mixed small studies [search].
- **Evidence: practitioner convention**, built from parts with moderate support (retrieval, S1
  and S5). Step one is not optional: explaining with the source open showed no benefit in Koh et al., a single study.

```
Teach it plainly                                         asks {topic}
  Put your sources on {topic} away
  Write an explanation of {topic} for someone new to it
  List every term you used without explaining and every step you skipped    gives {holes}
  For each {hole}
    Look {hole} up
    Rewrite that part in plain words, sources away again
    List anything the rewrite exposed                    adds to {holes}
```
- **Gives:** `{holes}` (what was not understood at the start).
- **Size:** small. **Verdict: fits.**
- **Example (writing):** `{topic}` = "free indirect style". The explanation leans on "focalisation"
  without explaining it and skips how tense is handled. Both are looked up and rewritten; the second
  rewrite exposes "the difference from interior monologue", which joins the list.

### S7. Come back to it
Distributed practice and successive relearning: recall again after a gap, until it comes easily.
- **Sources:** Dunlosky et al. 2013 (high utility); Cepeda et al. 2006 (*Psychological Bulletin*
  132, 354–380; 317 experiments); Rawson and Dunlosky, "Successive Relearning" (2022, *Current
  Directions in Psychological Science*); Latimier, Peyre and Ramus 2021
  (*Educational Psychology Review* 33, 959–987; 29 studies; spaced against massed retrieval g = 0.74;
  expanding against uniform gaps g = 0.03, not significant). [search]
  https://journals.sagepub.com/doi/full/10.1177/09637214221100484
- **Evidence: strong**, and the method the refusals cost most.

```
Come back to it
  For each thing to recall:  (kept)                      + Add
    Write {thing} out from memory
    Check it against the source
    List it again if it came slowly or wrong             adds to things to recall
```
- **Gives:** nothing; it works a kept list. Other routines feed it: S1's last step can read
  `adds to things to recall`.
- **Size:** small routine over a kept list. **Verdict: fits if changed.**
  - *Changed:* no schedule. The gap is whenever the person next runs it. Something recalled easily
    leaves the list (B-16: "a kept item leaves the list when its turn is done"); something missed is
    added back by the last step, which is rule 2 doing a Leitner box's job with one box.
  - *Lost:* due dates and the reminder (expanding intervals showed no advantage over even ones
    in Latimier et al.), which are what spaced-repetition
    software exists for. Also lost: an item recalled once never returns unless the person adds it
    again. For facts in bulk, a dedicated tool is the honest recommendation.
  - *Risk:* a missed item added back inside the same sitting comes round again at once, which is
    massed, not spaced. See the open questions.
- **Example (music production):** kept list: "circle of fifths, clockwise · compressor ratio vs
  threshold · the Nashville numbers for a 12-bar". Run on Tuesday: two come easily and leave; "ratio
  vs threshold" is listed again and is there next time.

### S8. An if-then plan
For: getting an intended action to start without deciding again in the moment.
Source: Gollwitzer 1999 (memory); Gollwitzer & Sheeran 2006 (search).
Evidence: **strong**. Meta-analysis of 94 tests, d = .65, against controls who already had the goal.

```
Plan the start                                             asks {aim}
  Name the first small action for {aim}                    gives {action}
  Name the moment it follows: something you already do,
    or a place you will be                                 gives {cue}
  Write it in one line: When {cue}, I will {action}        gives {plan}
  Put {plan} where {cue} happens
```
Size: small.
Verdict: **fits if changed.** Changed: the cue must be a situation ("after I pour the coffee"), never
a clock time, and the app does nothing at the cue. Lost: almost nothing; the theory's cue is
situational, and the effect comes from the person meeting the cue, not from a reminder.
Example: {aim} "the grant report" → "open the outline and write one heading" → "when I sit down after
lunch" → the line goes on a card by the keyboard.

### S9. Make it startable
For: a task too large or vague to begin; also the first step of any forecast.
Source: Kruger & Evans 2004 (search, via citing papers); Amabile & Kramer 2011 (search).
Evidence: **moderate, mixed**. Unpacking replicates unevenly; small-wins evidence is observational.

```
Make it startable                                          asks {task}
  List the parts of {task}, the dull ones included:
    setting up, finding things, checking                   gives {parts}
  For each {part}
    Name the first thing to do with your hands             gives {first move}
  Put the parts in the order they must happen              gives {order}
```
Size: small.
Verdict: **fits.** It is Break it down, written as a method that can be called on any value. The
difference from the built feature: this produces a list a caller can run a for each over.
Example: "move the blog to a new host" → parts "export posts", "point the domain", "check old links" →
first moves "log in to the old host", "find the registrar password", "open the sitemap".

### S10. Find how it fails (the pre-mortem)
For: testing a plan before committing to it.
Source: Klein 2007 (memory); Mitchell, Russo & Pennington 1989 (search); Veinott, Klein & Wiggins 2010
(search, findings second-hand).
Evidence: **moderate for surfacing reasons and lowering overconfidence** (one controlled study, mixed
follow-ups); **none for better outcomes**.

```
Find how it fails                                          asks {plan}
  Take it as fact: {plan} was carried out and failed badly
  List every reason it failed                              gives {reasons}
  For each {reason}
    Name one change that prevents or softens {reason}      gives {change}
  Rewrite {plan} with the changes worth making             gives {revised plan}
```
Size: small.
Verdict: **fits.** The studied version is a group exercise; the individual form was no worse in one
unpublished poster (search: [SJDM 2020](https://dlab.sauder.ubc.ca/sjdm/presentations/2020-Poster-Elizabeth-premortem-confidence-brainstorming.pdf)).
Example: {plan} "launch the newsletter with a paid tier from the first issue" → reasons "nobody knows
me yet", "payment setup ate the first month" → changes "three free issues first", "use the host's
built-in payments".

### S11. Argue the other side
For: a belief or estimate you are about to act on.
Source: Lord, Lepper & Preston 1984 (memory); Mussweiler, Strack & Pfeiffer 2000 (search).
Evidence: **moderate to strong in the lab**, replicated; effect on real decisions is less studied.

```
Argue the other side                                       asks {belief}
  State {belief} and how sure you are, in words            gives {before}
  List the reasons {belief} could be wrong
    that come easily                                       gives {doubts}
  For each {doubt}
    Name what you would see if {doubt} were right,
      and look for it                                      gives {finding}
  State {belief} again, changed or not                     gives {after}
```
Size: small.
Verdict: **fits.** "That come easily" carries the Sanna et al. caveat without a number.
Example: "this bug is in the cache layer" → doubts "it also happened with the cache off last week" →
finding "the log from the 19th shows it with cache disabled" → after "not the cache; look at the
retry".

### S12. Take the outside view
For: any forecast of how long, how much or how likely.
Source: Kahneman & Lovallo 1993 (search, citation only); Flyvbjerg 2006 (search); Buehler, Griffin &
Ross 1994 (memory).
Evidence: **moderate**. Strong field record for large projects; for one person's own tasks it works
only when past cases are tied to the present one, which step 4 does.

```
Take the outside view                                      asks {project}
  State your own guess for {project}                       gives {inside guess}
  Name the kind of thing {project} is                      gives {kind}
  List past cases of {kind}, yours or others',
    with how each really went                              gives {cases}
  State what usually happens across {cases}                gives {usual}
  Set the forecast: start from {usual}, move only for
    what is truly different here                           gives {forecast}
```
Size: small.
Verdict: **fits.** The forecast is the person's own words and the app does nothing with it: no
deadline is created. A routine that then *checks* the forecast against a date would be refused.
Example: "repaint the bedroom" → inside guess "a weekend" → kind "a room I paint myself" → cases
"hallway: three weekends", "kitchen: two" → forecast "two weekends; it is a smaller room".

### S13. Weigh the options on set criteria
For: a choice between options with criteria that can be checked.
Source: Dawes 1979 (search); Kahneman, Lovallo & Sibony 2019 (search); Nutt 1999 (search).
Evidence: **moderate, by inference**. Strong for prediction tasks; the protocol itself is untrialled;
poor fit for matters of taste (Wilson & Schooler 1991, memory).

```
Weigh the options                                          asks {decision}
  List the options, and one more not yet considered        gives {options}
  List what matters in {decision}, each thing separate     gives {criteria}
  For each {criterion}
    Rate each of {options} on {criterion} alone,
      from evidence                                        gives {rating}
  Read the ratings together; name the option they favour   gives {favoured}
  Choose, and say in one line where you leave {favoured}   gives {choice}
```
Size: small to medium.
Verdict: **fits if changed.** Changed: no weights and no totals; the person reads the ratings and
names what they favour. Lost: the arithmetic. Dawes's finding is that equal weights lose little, so
the loss is small, and the app keeps to "nothing is counted". The loop runs over criteria, not
options, on purpose: judging one criterion across all options is what limits the halo effect.
Example: "which of three flats" → adds "stay another year" → criteria "commute", "light", "cost",
"noise" → favoured "the second" → choice "the second, though it is the dearest".

### S14. Check a source
For: deciding how far to trust one page, paper or claim.
Source: Wineburg & McGrew 2019; Wineburg et al. 2022 (both search).
Evidence: **moderate to strong**. An expert-novice study plus a cluster-randomised field study.

```
Check a source                                             asks {source}
  Leave {source} before reading it closely
  Search for who is behind {source} and what
    others say of them                                     gives {standing}
  Find where its main claim first came from                gives {origin}
  Find other sources on the claim that do not
    copy each other                                        gives {others}
  State in one line how far to trust {source}              gives {trust}
```
Size: small.
Verdict: **fits.**
Example: a supplement review site → standing "owned by a retailer" → origin "one 2014 trial, 23
people" → others "a 2021 review finds no effect" → trust "low; cite the review instead".


## Research notes: the big templates as first drafted
_Kept for sources and evidence. The routines are superseded above._

### B1. Learn a skill

**Source and evidence.** Three research lines, joined here by me (the join is my own, not a published
model).
- *Deliberate practice* (Ericsson, Krampe and Tesch-Römer 1993, from memory). **Evidence: real but
  smaller than the popular claim.** Macnamara, Hambrick and Oswald's 2014 meta-analysis found practice
  explained about 26% of performance differences in games, 21% in music, 18% in sports, 4% in education
  and under 1% in professions ([PubMed](https://pubmed.ncbi.nlm.nih.gov/24986855/)).
- *Mastery learning* (Bloom; Guskey): do not move on until a check shows the part is held; if not,
  come at it a different way. **Evidence: moderate.** Kulik, Kulik and Bangert-Drowns 1990 pooled 108
  controlled evaluations and found positive effects on exam results (roughly half a standard deviation
  in secondary summaries; Slavin 1987 argued the true effect is smaller)
  ([abstract](https://www.academia.edu/81783373/Effectiveness_of_Mastery_Learning_Programs_A_Meta_Analysis)).
  Bloom's "2 sigma" is not a safe number.
- *The self-regulated learning cycle* (Zimmerman: forethought, performance, self-reflection, round
  again) ([review](https://revistas.um.es/analesps/article/view/analesps.30.2.167221)). **Evidence:
  moderate** for training it (Dignath and Büttner 2008, school pupils; Theobald 2021 (Contemporary Educational Psychology 66) reports a
  small-to-medium effect for university students (g about 0.37 to 0.38; exact figure unverified), both via secondary listings).

```
Learn a skill                                          (copied as "Learn {skill}")
  Say what you want to be able to do                   gives {aim}
  Find someone or something that shows {aim} done well
  parts:                                               + Add
  Break it into parts you could practise alone         adds to parts
  In any order
    Practise
      For each part
        Practise at the edge · with {part}
        Recall before you look · with {part}
        List what you still can't do                   adds to parts
    Study
      For each topic:                                  + Add
        Find one good source on {topic}
        Explain each step · with {topic}
        Note what to practise from it                  adds to parts
    Use it
      For each piece:                                  + Add
        Make {piece} for real, start to finish
        Review after doing · with {piece}
        List what stopped you                          adds to parts
```
- **Asks:** nothing from outside; `{aim}` in its first step. **Lists:** parts (kept above all three
  parts), topics, pieces. **Gives:** nothing to a caller; its product is the pieces made.
- **Worked example (bread baking).** Aim: "a loaf I'd give away". Parts: shaping · scoring · reading
  the proof. Practise takes "shaping"; Test yourself shows the seam still splits; "seams" is added to
  parts. Study takes "hydration"; the note "practise a wetter dough" lands in parts. Use it takes
  "Saturday's loaf"; what stopped you: "oven spring", added to parts.
- **Fit.** Rule 1: nothing waits on anything it should not. Rule 2 does the mastery check with no
  conditional: nothing typed at "List what you still can't do" means the part is held. Rule 3: the
  block has no step after it, deliberately; a skill has no last step, and the person leaves by Pause.
  **Strains:** (a) parts only grows unless the person is honest at the asking step, which is B-16's
  named backlog risk; (b) Study adds to parts after Practise may have run its list dry and returned.
  B-16 does not say whether a finished part takes up again when its list gains an item (Open
  questions, 3).

### B2. Research a question

**Source and evidence.**
- *The inquiry cycle*: Pedaste et al. 2015 reviewed 32 articles and synthesised five phases
  (orientation, conceptualisation, investigation, conclusion, discussion), with several investigation
  rounds possible ([Twente record](https://research.utwente.nl/en/publications/phases-of-inquiry-based-learning-definitions-and-the-inquiry-cycl/)).
  **Evidence: a descriptive synthesis, not a test that the cycle works.**
- *Guidance helps inquiry*: Lazonder and Harmsen 2016, 72 studies: guided inquiry beats unguided at all
  ages, and one effective form is "process constraints", breaking the inquiry into a manageable series
  of subtasks ([Twente record](https://research.utwente.nl/en/publications/supporting-inquiry-learning-a-meta-analysis/)).
  **Evidence: strong, and it is evidence for exactly what a routine is.** Studied in classrooms, not
  adult self-directed work.
- *Kuhlthau's Information Search Process*: six stages; the turn is "focus formulation", and the process
  is recursive, not linear ([Kuhlthau, Rutgers](https://wp.comminfo.rutgers.edu/ckuhlthau/?p=78)).
  **Evidence: observational**, longitudinal and field studies.
- *Write the question and what would count before you look* is the systematic-review protocol habit
  (PRISMA, Cochrane; from memory). **Convention by expert consensus.**

```
Research a question                                    (copied as "Find out: …")
  Write the question as you'd ask a friend             gives {question}
  Write what you think the answer is, and why
  Say what would change your mind
  sources:                                             + Add
  unknowns:                                            + Add
  List what you'd need to know to answer it            adds to unknowns
  In any order
    Read
      For each source
        Skim {source} for what bears on {question}
        Summarise it in two lines
        List what it sends you to                      adds to sources
        List what it leaves open                       adds to unknowns
    Find out
      For each unknown
        Say how you could find out {unknown}
        Do that
        Write what you found, and how sure you are
        List what this opens up                        adds to unknowns
  Write the answer to {question} in one paragraph
  Compare it with what you thought at the start
  List what you still can't explain                    gives {holes}
  For each {hole}
    Find out what you can about {hole}
    Rewrite the answer
    List what else you can't explain                   adds to {holes}
```
- **Asks:** `{question}`. **Lists:** sources and unknowns (kept, above both parts so each feeds the
  other); holes (this run's, growing). **Gives:** the answer paragraph, in the person's own files.
- **Worked example (family history).** "Where did my great-grandmother live before 1920?" Guess:
  "Leeds, because of the accent story." Unknowns: her maiden name · when she married. Sources: the 1921
  census · Aunt May's letters. A letter sends you to a parish register (added to sources) and leaves
  open "who was the lodger" (added to unknowns). The answer is written, compared with "Leeds"; one hole,
  "1911 to 1914", is chased and the answer rewritten.
- **Fit.** Rule 3 is the point here: "Write the answer" cannot be reached until both parts have
  returned, which is the model's "do not conclude while investigation is open". Rule 2: no holes, done.
  **Strains:** both lists feed each other, so the join may never come; the person ends a part with Step
  out, which B-16 allows ("stopped"). That is the honest shape of research, but it means the template
  relies on Step out more than B-16's examples do. No count may ever show on these two lists.

### B3. Make a project

**Source and evidence.**
- *The Double Diamond* (discover, define, develop, deliver), Design Council, shared from 2004; built by
  looking for patterns across organisations that used design well
  ([Design Council history](https://www.designcouncil.org.uk/our-resources/the-double-diamond/history-of-the-double-diamond/)).
  **Practitioner convention.** No outcome trials found.
- *Several prototypes at once before choosing*: Dow et al. 2010, an experiment: people who made
  alternatives in parallel produced better-performing, more varied designs and gained more confidence
  than those who refined one ([UCSD](https://protolab.ucsd.edu/?p=3561)); Murphy, Floresca, Fu and Linsey 2022 (Research in Engineering Design 33) found the
  same in a physical design contest. **Evidence: suggestive**, small student studies, one inconclusive physical-prototyping experiment.
- *Find how it fails* (S10) is called here.

```
Make a project                                         (copied as "Make: …")
  Say who it's for and what it should do for them      gives {brief}
  In any order
    Look around
      For each example:                                + Add
        Note what works and what doesn't in {example}
    Ask
      For each person:                                 + Add
        Ask {person} about {brief}
        Wait for: {person}'s answer
        Write the one thing that surprised you
  Rewrite {brief} in one sentence                      gives {aim}
  Sketch three different ways to do it                 gives {ways}
  For each {way}
    Make the cheapest version of {way} that can be tried
    Try it on someone, or on yourself
    Write what it showed
  Pick one, and say what you take from the others      gives {choice}
  Find how it fails · with {choice}
  List what must be true for it to work                gives {risks}
  For each {risk}
    Find the cheapest way to check {risk}, and check it
  Build the first whole version
  Show it to someone
  Wait for: what they say
  List what has to change                              gives {changes}
  For each {change}
    Make {change}
    Show it again
    List what else has to change                       adds to {changes}
  Call it finished
  Review after doing · with {choice}
```
- **Asks:** `{brief}`. **Lists:** examples, people (kept); ways, risks, changes (this run's).
  **Gives:** the made thing.
- **Worked example (a neighbourhood tool library).** Brief: "neighbours who need a drill twice a year".
  Ask: three neighbours, each a wait; meanwhile Look around takes "the seed swap's sign-out sheet". Aim:
  "borrow a tool in one visit, no app". Three ways: a shed with a logbook · a group chat · a shelf in
  the café. Pick the café shelf. What must be true: "the café says yes", "tools come back". Changes
  after showing it: "label the shelf", then, on the second showing, "add a returns box".
- **Fit.** The cleanest of the six. Each diamond is one B-16 pattern: discover is parts in any order
  that join (rule 3) before "Rewrite the brief"; develop is a for each over a given list; deliver is
  "attempt, ask, resolve, again". The wait inside Ask is what the tree view is for ("Ask · waiting for
  Sam's answer"). **Strains:** the wait inside "For each person" means you cannot ask the second person
  until the first has answered (rule 1). Asking everyone first needs either the list-between-two-parts
  shape (finding 3) or "things set going", which is designed and not built. "Sketch three" is a number
  in the template's words; the person can change it.

### B4. Make a decision (composed of S13, S11, S10 and S12)
For: a decision large enough to be worth an hour.
Source: the parts above; self-distancing from Grossmann & Kross 2014 (search). The arrangement follows
WRAP (Heath & Heath 2013, search) and the closing "tripwire" is theirs: both **practitioner
convention**.
Evidence: **parts moderate; the whole untested**.

```
Make a decision                                            asks {decision}
  State {decision} as a choice between things you can do
  Write the advice you would give a friend facing it       gives {advice}
  Weigh the options · with {decision}                      gives {choice}
  In any order
    Argue the other side · with {choice} as belief
    Find how it fails · with {choice} as plan
    Take the outside view · with {choice} as project
  State the choice, and what you would have to see
    to reopen it                                           gives {decision made}
```
Size: big (a template).
Verdict: **fits.** The three checks do not depend on each other, so In any order is honest; the last
step waits for all three (rule 3).
Example: "take the contract job or stay": advice "you have wanted out for a year" → choice "take it" →
outside view "of four friends who went contracting, three had a dry first quarter" → decision made
"take it; reopen if no second client by the time the first contract ends".


## Also researched, not in the library
Each is written out in the local reports.
- **Wish, outcome, obstacle, plan** (WOOP): moderate; overlaps S8, which has the stronger evidence.
- **Example, then less help** (worked examples, fading): strong for novices in structured domains only.
- **Try first, then be taught** (productive failure) and **Mix the kinds** (interleaving): moderate,
  and they help only some material, which the app has no place to say.
- **Plan, do, check** (metacognitive cycle): moderate; S3 and S4 cover it.
- **Solve a problem** (Pólya): the "attempt, ask, resolve, again" pattern as a template.
- **Search what is written** (following citations): moderate; a growing for each in its purest form.
  Called by B2 once methods can hand lists back.
- **Park what is on your mind**: moderate, one lab group.
- **Find the causes** (replaces 5 whys), **Test rival explanations**, **Sharpen a question**:
  practitioner convention or weak.
- **Improve something that already runs** (plan-do-study-act), **Decide something large**, **Make a
  creative work**: templates; convention, or built from research and not tested whole.

## Rejected

**From learning and reflection**

| Method | Why |
|---|---|
| **Summarising with the source open, highlighting, rereading** | Rated low utility by Dunlosky et al. 2013 [search]. Not refused by any rule; left out because they do not work well. B-16's sample step "Summarise it in two lines" should become "Close it and write two lines from memory". |
| **Keyword mnemonic, imagery for text** | Low utility in the same review; narrow (vocabulary). |
| **Spaced-repetition scheduling (SM-2, Leitner with dated boxes, "review in 3 days")** | Needs a schedule and due dates. Refused by *Nothing is counted against you* and STRATEGY's refusal of schedules and reminders. Method 12 is what is left. |
| **The 10,000-hour rule, logging practice hours** | A tally of what you did; refused. Also not what the research says (Macnamara et al. 2014; Ericsson himself rejected the rule) [memory for the second clause]. |
| **Progress monitoring by recording** | Harkin et al. 2016 (*Psychological Bulletin*) found monitoring progress raises goal attainment, more so when recorded or made public [memory]. It is a count kept against a goal; refused. A fair case of a research-backed method the app declines on purpose. |
| **Timed practice blocks, Pomodoro, "20 minutes a day"** | Timers; refused. Pomodoro is also a practitioner convention with little controlled evidence [memory]. |
| **Specific, difficult goals with a number and a date** (Locke and Latham 2002; d = .42–.80 against "do your best" goals in earlier meta-analyses [search; .52–.82 also appears in the paper, for a comparison not confirmed]) | The deadline and the number are refused. The part that fits is already inside method 5 (`{target}` and `{check}`) and method 10 (`{aim}`): a specific standard for this sitting, no date. Not written as its own routine. |
| **Kolb's cycle and Gibbs's cycle as routines** | Not refused by a rule; set aside because the evidence is weak (finding 9) and method 4 covers the supported core. Gibbs's "feelings" stage could be one optional step in method 4 if the owner wants it, labelled convention. |
| **Learning styles (matching method to "visual / auditory" learners)** | No credible evidence (Pashler et al. 2008) [memory]. |
| **Mental practice (rehearsing a movement in the mind)** | Supported for motor skills (Driskell et al. 1994, d about 0.5) [memory]; not searched in this session, so not written up. A candidate if the owner wants motor skills covered. |
| **External focus of attention** (Wulf, Shea and Lewthwaite 2010) [search] | Well supported for motor skills, and it is a way of wording an instruction, not a procedure. Useful as advice on how to phrase a practice step ("aim the stroke at the far edge", not "keep your wrist loose"). |
| **Self-grading with confidence ratings, quizzes scored out of N** | The score is a count; and the app has no place for it. The comparison step in methods 1, 5 and 10 keeps the calibration benefit in words. |

---

**From deciding, solving and researching**

| Method | Why |
|---|---|
| If-then plans cued by a clock time; time-blocking; "eat the frog" | A schedule. STRATEGY refusals. (Method 1 keeps the situational cue.) |
| Goal-gradient and progress displays (Hull 1932; Kivetz, Urminsky & Zheng 2006, memory) | Works by showing how much is left. "Nothing shows how much is left." Already refused in the 2026-11-22 discovery. |
| Pomodoro, timeboxing, the two-minute rule | Timers. Practitioner, little controlled evidence in any case. |
| Fresh-start effect (Dai, Milkman & Riis 2014, memory) | Depends on calendar dates. |
| Commitment devices, temptation bundling | Need enforcement, a stake or a schedule; the app decides nothing and counts nothing. |
| SMART goals | Practitioner acronym; "time-bound" is a deadline. Goal-setting theory itself (Locke & Latham) is strong but belongs to the project-template scout. |
| Eisenhower matrix | Practitioner; "urgent" is a deadline in disguise, and it sorts a task backlog, which the app does not keep. |
| Five whys, literally (one chain, five deep) | Practitioner, with a published case against it (Card 2017). Replaced by method 11. |
| Analysis of Competing Hypotheses as a matrix with scores | Did not help in a controlled test with analysts (Dhami, Belton and Mandel 2019, search); needs a grid and tallies. Its sound core is "Test rival explanations" on the second shelf. |
| Pros and cons list | In Veinott et al. 2010 (second-hand) it lowered overconfidence less than the pre-mortem; lists reasons for a favoured option without fixing criteria first. Method 8 does the job. |
| Weighted decision matrix with totals | Arithmetic and a score; Dawes shows the weights add little. Method 8 without them. |
| 10/10/10 (Welch), Six Thinking Hats (de Bono) | Practitioner; no supporting evidence found. Self-distancing has evidence and is one step of method 9. |
| Fermi decomposition, Bayesian updating | Numeric; the app has no arithmetic. Not refused by a rule; set aside. |
| Devil's advocate, dialectical inquiry, group pre-mortem | Need other people. No team features. |
| A decision journal reviewed "in three months" | A date. **Fits if changed**: a wait step "Wait for: the outcome is known" has no clock. Left to the reflection scout. |
| Any method with "if it worked, stop; else …" | A conditional. Rewritten as a list that may be empty (methods 2, 4, 10) or left out. |

---

## How other tools package a library

All from search results, not opened. Dates are the date of the source where one was shown.

**Copy or reference, and what happens on update**

| Tool | Taking one | Does editing the original change the uses? |
|---|---|---|
| **Process Street** | A workflow (template) is run; each run is its own | Not by itself. On publish the editor chooses: push to all active runs, none, or one by one; runs can show an "Update to latest" alert, which can be switched off. An "Update Runs to Latest" menu item was added Feb 2026. Removing a step affects runs once updated ([help](https://www.process.st/help/docs/editing-workflows/), [release note](https://www.process.st/help/update-runs-to-latest/)) |
| **Todoist** | Import a template into a new project | No. "When you make changes to one version, those changes won't appear in the other" ([help](https://www.todoist.com/help/articles/introduction-to-templates-in-todoist-uofJ8i40M)) |
| **Things** | No template feature; keep a project and Duplicate it | No ([Cultured Code](https://culturedcode.com/things/support/articles/2693493/)) |
| **Notion** | Database template stamps a page; gallery "Get template" copies into the workspace | No; a changed template does not reach pages already made (third-party guide, [Thomas Frank](https://thomasjfrank.com/?p=9610); Notion's own page only says you can change the page after) |
| **Obsidian** | "Insert template" pastes text at the cursor; three variables (title, date, time) | No; it is pasted text ([help](https://obsidian.md/help/plugins/templates)) |
| **Workflowy** | Two separate things: a **template** makes a fresh copy (`/template`, or a `#template` node becomes a button); a **mirror** is a live copy, edit one and both change | Template: no. Mirror: yes ([help](https://workflowy.com/help/reuse-content-with-mirrors-templates)) |
| **Tana** | A supertag stamps template content onto a node | **Until you touch it.** Untouched template nodes follow the template; an edited one detaches for good ([FAQ](https://tana.inc/faq/my-supertagged-nodes-are-not-updating-with-the-latest-changes-i-m-making-what-s-going-on)) |
| **Apple Shortcuts** | Gallery → Add Shortcut puts a copy in your collection to customise; one shortcut can call another with Run Shortcut | The Gallery copy is yours. A called shortcut is a reference: its "Stop and Output" becomes the result of the caller's Run Shortcut action ([Gallery](https://support.apple.com/guide/shortcuts/apdd018638ca/ios), [output](https://support.apple.com/guide/shortcuts/apda9578f70f/ios)) |
| **shadcn/ui** (code) | Copies the component's source into your project; you edit it directly | No; you pull an update yourself, one component at a time ([Vercel Academy](https://vercel.com/academy/shadcn-ui/why-shadcn-ui-is-different)) |
| **Lodash** (code) | Import a function; it is a reference to one shared version | Yes, on upgrading the package. Its one-function-per-package form is now discouraged and due for removal in v5 ([lodash.com](https://lodash.com/per-method-packages)) |

The pattern: tools that hold **the person's working material** copy (Todoist, Notion, Things,
Obsidian). Tools with a **function-like unit** reference (Shortcuts' Run Shortcut, Lodash, Workflowy
mirrors). The ones people complain about mix the two invisibly (Tana's detach-on-edit has its own FAQ
entry titled "My supertagged nodes are not updating… What's going on?").

**Showing inputs and outputs before you take one**
- Shortcuts: tapping a Gallery item shows a description and a preview of its actions, then Add Shortcut,
  or "Set Up Shortcut" when it needs answers first.
- Lodash docs: every entry has the same four parts in the same order: the signature, Arguments,
  Returns, one Example.
- Shortcuts: a shortcut is set to receive particular input and to ask if none arrives (Apple's
  command-line page). This is the app's "a step reading a name nothing gave asks for it", already.

**Finding one**
- Shortcuts Gallery: curated rows by situation ("Essentials", "Morning Routine"), "starter shortcuts"
  grouped in collections, and a search field that also finds items not shown in the rows.
- Lodash: categories by what the function works on (Array, Collection, Function, Lang, Object, String,
  Util; category list from memory), flat alphabetical within each, plus search.
- Workflowy: type `/template` where you are writing and pick from results; the library is suggested as
  an ordinary place in your own outline.
- Tiimo: a library of ready-made routines to "adapt… and then save"
  ([help](https://help.tiimoapp.com/android-features-how-tos/ready-made-content-explore-and-get-ideas-for-things-to-do)).
  Routinery lists presets on its store page (Pomodoro, exercise, meeting preparation); how they are
  edited after adding was not found.

**How many.** I found no source that tests a starter library's size. Shortcuts and Lodash both run to
hundreds and depend on search. Anything I say about a number is judgement (see Open questions, 5).

## Borrowable ideas for a library in this app
None of these is a roadmap item. A library at all is big (shipped content, a new place to find it,
probably a stored field), so it needs a brief; the owner asked for the catalogue first.

"Big" is under `docs/product/briefs/README.md`. A library at all is big (a new screen or entry, new
shipped content, probably a stored field), so it needs a brief; the sizes below are for each idea inside
that.

1. **Two kinds, two verbs: a template is copied, a method is called.** From Workflowy (template versus
   mirror) and the code world (shadcn versus Lodash). For this app's people it removes the question
   "if I change this, what else changes?": a method changes everywhere (DESIGN.md already says "what is
   changed inside it changes that routine"); a template is theirs from the moment they take it.
   **Fits**, and follows from finding 1. Needs Copy (designed, not built). M. Big: yes (with the
   library).
2. **Once added, a library routine is an ordinary routine.** From Shortcuts ("added to your collection…
   customize it") and Todoist. No "library" badge, no lock, no second kind of thing; the person rewords
   "Pre-mortem" and it is their Pre-mortem. **Fits** ("the person's own know-how", "the first layer is
   nothing special"). S.
3. **Updates never reach in.** From Todoist, Notion and shadcn. A new app version may bring a better
   "Pre-mortem" on the shelf; the person's stays as it is. **Fits** ("stored data is never converted to
   fit a design"). It raises "one version per name": taking the shelf's version again must make a new
   name or be refused (Open questions, 2). S, inside Full-tier work.
4. **Process Street's "update runs to latest", and Tana's follow-until-edited.** **Doesn't fit.** The
   first is a notice that says you are behind ("the app never suggests you are behind"); the second is
   hidden state that changes a person's words under them.
5. **The preview is the routine's own Plan, read-only.** From Shortcuts' action preview. Before taking
   one, the person sees the steps as rows with the chips they already know: dashed "asks {plan}",
   "gives {risks}", "adds to parts", the kept lists as empty rows. **Fits**: no description, no
   instructional text; the routine documents itself or it is badly written. M. Big: part of the
   library's screen.
6. **A signature on the shelf row.** From Lodash's docs. A row reads the name and what it asks, in the
   existing wording: "Deliberate practice · asks {subject}". **Fits.** S.
7. **Lodash's "one Example" per entry.** **Fits if changed.** As prose under a template it breaks
   Minimalism. Changed: the preview could show the steps with one sample value in place, inverted, the
   way a run shows values ("Deliberate practice · with **shaping**"). That is content to write and
   translate for every item; it may not be worth it if names are good. S each, M overall.
8. **Adding from where you are writing.** From Workflowy's `/template`. In Plan, typing in "Add a step"
   already has to find the person's routines (designed: "adding an existing routine into another in the
   editor"); the same list could offer shelf methods not yet taken, marked in words. Choosing one takes
   it and calls it in one move. This is the owner's "quick composer". **Fits** ("nothing is created
   without a tap": the row must be chosen). M, after P-98.
9. **Taking a template takes what it calls.** From Shortcuts' Add Shortcut and package managers.
   Copying "Make a project" brings "Pre-mortem" and "Reflect on a rep" if the person lacks them, and
   uses theirs if they have them, by name. **Fits if changed**: "by name" is right under "one version
   per name", but a person who reworded their Pre-mortem into something else gets a template calling
   that. Probably acceptable; say so in the brief. M. Full tier (it writes several routines in one
   change; one Undo must take them all back).
10. **Setup on taking.** From "Set Up Shortcut". Taking a template opens the existing New sheet with
    the name to finish ("Learn ▢"), Plan filled. **Fits**: it reuses New ("New makes the routine
    only"). S.
11. **A method that gives something back.** From Shortcuts' Stop and Output. "Pre-mortem · with
    {choice}   gives {risks}": what the method's last giving step gave becomes a name at the caller's
    level. **Fits if changed, and only by the owner**: it reverses a DESIGN.md scope sentence, so it is
    a rule change, not a feature. Without it every template needs the "caller asks again" step
    (finding 2). L. Big: yes.
12. **House style for shelf routines** (from Lodash's naming and Unix "do one thing"): a verb-first
    name; one job; asks one name where it can; a list is a plural noun and its item the singular
    (gaps, {gap}), as B-16 already does; no number of minutes, no "daily", no count in any step; a
    method holds no kept list (so it can be called); a template holds its lists at the level above the
    parts that share them. **Fits**; it is a writing rule, not UI. S.
13. **Categories by aim, plus typing.** From the Gallery's rows and Lodash's categories. A short shelf
    grouped by what the person is setting out to do (the owner's own words: learn, research, make,
    decide), and found by typing, which the app's search already does for unnamed things. **Fits if
    changed**: headings only, no blurbs; and the shelf is not home (home stays what the person has
    open). S, inside the library's screen.
14. **The shelf ships inside the app, in the export format.** A file of routines bundled with the
    build and read by the import code path. No server, works offline, and the golden fixtures can cover
    it. **Fits** ("the data stays on the device"). No new dependency, no native build; a few kilobytes.
    M. Full tier.
15. **A community gallery; conditional logic, due dates and assignees in templates** (Process Street,
    Notion's gallery). **Doesn't fit**: a server and accounts; conditionals; deadlines.

## Questions for the owner
1. ~~Can a called routine hand something back?~~ Settled 2026-11-26: yes, what its call row gives.
2. **Is a shelf routine a copy you own, or a shared original?** The research leans to: once taken it
   is an ordinary routine in your words, and an app update never reaches into it.
3. **Does a finished part take up again when another part adds to its list?** B1, B2 and B-16's own
   "From one part to another" depend on it.
4. **Does an item added back to a kept list come round in this sitting or the next?** In the same
   sitting, S7 is massed practice, not spaced.
5. **Are practitioner conventions allowed on the shelf** (S6, B3, B4's arrangement), given the app has
   nowhere to label them?
6. **Where do the citations live?** Minimalism refuses explanatory text on screen; probably this file.
7. **How big is the first shelf?** No source tests this; the proposal above is eighteen.

## Sources
Listed inline with each method, marked "search" or "memory". The templates report's source list:

- Macnamara, Hambrick, Oswald 2014: https://pubmed.ncbi.nlm.nih.gov/24986855/
- Kulik, Kulik, Bangert-Drowns 1990: https://www.academia.edu/81783373/Effectiveness_of_Mastery_Learning_Programs_A_Meta_Analysis
- Zimmerman's cyclical model, review: https://revistas.um.es/analesps/article/view/analesps.30.2.167221
- Pedaste et al. 2015: https://research.utwente.nl/en/publications/phases-of-inquiry-based-learning-definitions-and-the-inquiry-cycl/
- Lazonder and Harmsen 2016: https://research.utwente.nl/en/publications/supporting-inquiry-learning-a-meta-analysis/
- Kuhlthau, Information Search Process: https://wp.comminfo.rutgers.edu/ckuhlthau/?p=78
- Design Council, history of the Double Diamond: https://www.designcouncil.org.uk/our-resources/the-double-diamond/history-of-the-double-diamond/
- Dow et al. 2010: https://protolab.ucsd.edu/?p=3561
- Taylor et al. 2014: https://pmc.ncbi.nlm.nih.gov/articles/PMC3963536
- Kahneman, Lovallo, Sibony 2019: https://sloanreview.mit.edu/article/a-structured-approach-to-strategic-decisions/
- Sadler-Smith 2015: https://openresearch.surrey.ac.uk/esploro/outputs/journalArticle/Wallas-four-stage-model-of-the-creative/99515924502346
- Sio and Ormerod 2009 (abstract only, matched by its text): https://typeset.io/topics/incubation-3actino5/2009
- Process Street: https://www.process.st/help/docs/editing-workflows/ · https://www.process.st/help/update-runs-to-latest/
- Todoist templates: https://www.todoist.com/help/articles/introduction-to-templates-in-todoist-uofJ8i40M
- Things: https://culturedcode.com/things/support/articles/2693493/
- Notion database templates: https://www.notion.com/help/database-templates · https://thomasjfrank.com/?p=9610
- Obsidian Templates: https://obsidian.md/help/plugins/templates
- Workflowy: https://workflowy.com/help/reuse-content-with-mirrors-templates · https://workflowy.com/help/templates
- Tana: https://tana.inc/faq/my-supertagged-nodes-are-not-updating-with-the-latest-changes-i-m-making-what-s-going-on · https://tana.inc/docs/supertags
- Apple Shortcuts: https://support.apple.com/guide/shortcuts/apdd018638ca/ios · https://support.apple.com/guide/shortcuts/apda9578f70f/ios
- Lodash: https://lodash.com/per-method-packages · https://lodash.com/docs
- shadcn/ui: https://vercel.com/academy/shadcn-ui/why-shadcn-ui-is-different
- Tiimo: https://help.tiimoapp.com/android-features-how-tos/ready-made-content-explore-and-get-ideas-for-things-to-do
