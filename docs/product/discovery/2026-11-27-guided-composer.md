# A guided composer: an investigation (2026-11-27)

_Discovery only. The owner asked for an investigation and said plainly that nothing is to be drafted or
built yet: "This isn't going to be drafted because I want to test the app a little bit first and see if
that holds compared to a basic implementation of the app as it stands right now." Curated by /product
from one research report. It recommends nothing to build; it ends with what the owner's own test could
observe._

> **Verification caveat. No source page could be opened.** Every outside claim is marked "search" or
> "memory" and is unverified.

**The request (owner, 2026-11-27):** "a composer view that seems to be guiding you into making these
complex decisions one step at a time … That way, the plan view is secondary to … intuition and figuring
it out … a product investigation as well, to see where something like that is adjacent in other apps,
where you just kind of guide the user as a facade over a complex system like this."

**The owner's answers to four questions before the research:** it guides "When first writing a routine";
what went wrong with the first build was that "the UI didn't make that very clear on the context
switching … Having all these different options available to me while I was running an execution made it
unclear as to what I was doing", while "at a point of finality … the context switch is very apparent";
it should be "natural language and conversational", with the input framed as "a task, a goal, or an
ambition, or a question to answer"; committed at once or held until kept: "Investigate both."

**The owner's response to the main finding (2026-11-27):** "the fact that a lot of the processes that goes
into natural language don't map cleanly into the constructs, I think, is even a bigger reason to develop
that, because we're supposed to make these complex structures from simple asks, like what does done look
like might be a routine that's reasonably complicated to produce, but is afforded to the user as
something simple."

_Reading (ours):_ the unclean mapping is not a reason against a composer; it is the reason one would be
needed, since where the mapping is clean Plan already suffices. What the finding constrains is how: a
composer cannot be a thin relabelling of Plan's choices. Each construct needs its own authored sequence
of plain questions that settles which meaning is intended ("do you know all of them now, or will you
find them as you go?"), and that sequence is itself a routine: complicated to write once, simple to be
asked. The library already has one example, "Say what done is". This points at the report's fifth
shape (the interview as a routine) and at one capability nothing yet has: a routine whose answers
produce a routine. Still an investigation; nothing is drafted.

**A rule clarified by the owner (2026-11-28), which changes one verdict below:** "I think I've been misinterpreted on the instructional aspect of things. I didn't want there to be
a lot of descriptive text on how the app works, but quick and insightful or necessary text to explain
what's accepted and what are perfectly okay."
The report treated "may a question be a field's placeholder?" as an open ruling that limited a composer
to about three questions and made the "Plan leads" shape conditional. Under the clarification a short
question as a placeholder ("What comes first?", "Then?") is allowed, so that shape fits without a
ruling. Long explanation is still out.

## 1. The pain point, restated

Writing a routine today starts with a name field and then a blank Plan. To get from "get better at
drawing hands" to something runnable, the person has to already know the app's constructs (gives, asks,
Repeat from here, and soon for each and calls) and translate their aim into them, so attention goes to
"how do I say this in the app" and not to the work. The owner wants the first writing of a routine to
be led by plain questions, one small decision at a time, in the words people use for an approach, so
that the structure falls out of the answers and "thinking is afforded more room rather than
remembering". The earlier attempt failed because the question arrived in the middle of doing a step.

**What the owner's notes support.**
- The expectation of a led start is from real use, and it is specific. 2026-11-25: "I expected some
  form of like, hey, do you want to create a stack to define the work you want to do?" and "a little bit
  of scaffolding to tell me, hey, what … feeling or goal you're trying to achieve, and walk me
  through", in the order "the goal or outcome … the output, and consider what my inputs are, and then
  define a series of steps to transform my inputs".
- The cost of translating is from real use. 2026-11-25: "my mind was split … between two modes of
  thought, like OK what do I do next versus how do I represent this in the app … that's no longer doing
  the work, that's working with the app".
- Constructs were not found without prior knowledge. 2026-11-25: the loop and the input were reached by
  "prior knowledge". 2026-11-26: interpolation has "no way to discover that feature"; the for-each
  sheet "makes no sense to me". 2026-11-27: a for each typed as prose into Add a step.
- Being made to think about how you do the thing was liked, twice (2026-11-25).

**What is still a guess.**
- That the blank start is still a problem now that Plan exists. The 2026-11-25 expectation was stated
  when the only way in was a search prompt on home and the runner. Plan, + New and the Add row came
  after. No note says a routine was hard to begin in today's Plan.
- That questions would produce better routines than a blank Plan or a template. Nothing has been tried.
- That the trouble is "where do I start" and not "typing structure on a phone is slow". The two need
  different answers, and the notes contain evidence of the second (the clipped Add field, the squeezed
  buttons).
- That a led start would be used more than a few times. There is one user, who designed the model. Four
  real routines are named in the notes.
- Which boundary "a point of finality" means. On 2026-11-26 the owner said of the run ending in Plan:
  "being done is finality, and planning isn't finality", and that behaviour was removed. See section 5
  and the open questions.

One thing already designed and never built bears on this: B-12's first draft, point 5, had New open
Plan with three labelled fields, **For** (the outcome or feeling, which becomes the name), **With** (the
inputs) and **Steps**, "labels only; no instructions". The owner accepted the designer's defaults for it
on 2026-11-25. What shipped was the name field alone.

---

## 2. What others do

For each: what it asks first, how many questions before something usable exists, whose language it
speaks, how it shows what it has built, how it is corrected, whether it commits at once, and what is
known about liking or leaving it.

### 2.1 Interviews over a rule system

| Product | The pattern | Committed or held | What is known | Status |
|---|---|---|---|---|
| **TurboTax** (interview over the tax forms) | Asks about the person's year in their terms and fills forms they never see. Desktop editions have a second mode, Forms, with an icon to switch and one to switch back (called EasyStep or Step-by-Step in the posts). The online edition has the interview only. | Answers go into the working return as given; the irreversible act (filing) waits for a review. | Community posts: experts ask how to skip the interview; one thread is titled by a retired accountant who "made mistake of using the interview method"; a reply warns that typing straight into forms voids the accuracy guarantee and may block e-filing. So the expert path exists, is harder to reach than it was, and carries a penalty. | search, **user forum posts on Intuit's community, not Intuit documentation**. "Asks about life events first, then builds a topic list" is memory. |
| **Will builders** (Nolo WillMaker, FreeWill, Trust & Will) | One interview per document. WillMaker: when the interview ends, the program "combines your answers with the appropriate legal language and displays the completed document for you to review". Trust & Will: saved at each "Save & Continue"; a Back button revisits a question. | Held: the document exists only at the end. | FreeWill's own FAQ says many people go through the questionnaire once to see the sample output and then go back and change it. My reading: people could not judge their answers until they saw the built thing. | search (the vendors' help pages, via summaries) |
| **GOV.UK services** | "Start by asking one question per page", merge pages only when research shows it is safe. A "Check answers" page before submitting lists every answer with a Change link. | Answers are saved as you go; the submission is held until Check answers. | GDS's own design note (2015) concedes the cost: more page loads, and it can frustrate. The stated gains are focus, saving automatically, and branching. | search |
| **DWP "Add another thing"** (lists inside a question flow) | One item per question page, then a summary list with Change and Remove, and a button "Add another <noun>". The same noun in the question, the summary and the button. | Each item is kept when entered. | Their research notes (updated October 2025 per the pattern's history page): a button beat the yes/no question "Do you need to add another?", which confused people; adding one item at a time beat one large screen. | search |
| **Microsoft Inductive User Interface** (guidelines, 2001; built for Money 2000) | Each screen does one task and its **title states that task**, as an instruction ("Select the account you want to balance") or a question ("Which account do you want to balance?"). The designer's test: finish the sentence "This is the screen where you…". | n/a | A guideline, not a study. It matters here because it treats the question as the screen's label, not as help text. | search |

### 2.2 Wizards, one-at-a-time forms and chat

- **When a wizard suits** (Nielsen Norman Group's article on wizards, date not seen): for novices or for
  processes done rarely, such as setup; the cost is more interaction per answer. Secondary sources add
  that practised users find wizards rigid and that a wizard hides what the answers actually do.
  *search; the NN/g page itself was refused.*
- **One question at a time as a selling point** (Typeform): the completion figures are the vendor's
  own, they disagree with each other across its pages (47 % to 59 %), and they are confounded with form
  length. I found no independent comparison that holds the questions constant. *search.*
- **Chat against a form**: one within-subject study found the chatbot slower to complete and preferred
  by most participants (Soni et al., Frontiers in Digital Health, 2022); a pre-registered longitudinal
  study from KU Leuven found no advantage and often better data from the plain web survey; a CHI 2019
  study found less careless answering in the chatbot (Kim, Lee and Gweon). *search.* My reading: a
  conversational surface is liked and is slower, and the evidence that it produces better answers is
  mixed. All of it is about surveys answered once, not a tool used repeatedly.
- **What people do with what a setup built** (Spool, 2011): of several hundred Word settings files
  collected, fewer than 5 % had any setting changed, per secondary reports; programmers and designers
  were the exception and had changed many. *search.* Implies here: what a guided start produces tends
  to stay as produced, for most people. This owner is in the exception group.

### 2.3 Automation builders

| Product | The pattern | Committed or held | Status |
|---|---|---|---|
| **IFTTT** | The whole model is one sentence with two blanks, "If This Then That". The expert layer (filter code, queries) is behind a "+" between the two, only on the web composer, only on the top paid plan. | Held until the applet is finished. | search for the filter-code facts; the sentence builder is memory |
| **Zapier** | A trigger and then actions. Editing a live Zap makes a **draft** that autosaves while the published version keeps running; Publish replaces it; a Versions list allows going back, which makes a new draft and overwrites nothing. Its Copilot **uses an LLM to write the workflow from a description** (not usable here). The interaction pattern only: it produces an outline first and then walks each step, with a mode that asks before each change. | Held, because a live version is running. | search (Zapier help and blog) |
| **Apple Shortcuts** | Three guided devices over one editor. (1) **Import questions**: the author marks parameters, and the person adding the shortcut is asked each in order ("Set Up Shortcut"). (2) **Ask Each Time**: a parameter left to be asked at run time. (3) **Next action suggestions** in the editor, which since iOS 16.5 can be dragged in. | The editor commits each change (memory). | search for the three features; commit behaviour is memory |
| **Home Assistant** | The visual editor labels the three parts "When", "And if", "Then do"; the file underneath says trigger, condition, action. A menu switches between the visual editor and YAML, for the whole automation or one element. | Saved on Save. | search. A forum post complains that "your brain needs to map" one vocabulary onto the other when reading the YAML. Whether the labels were renamed, and when, I could not confirm. |
| **Excel** | Insert Function opens Function Arguments: one labelled box per argument, a line saying what the focused argument is for. It writes an ordinary formula into the same formula bar the expert types in. | Held until OK, for that one formula. | search (Microsoft support). That people move on to typing with autocomplete is memory. |
| **Process Street** | Its workflow generator takes only a name and returns a whole workflow. **LLM-written; not usable here.** The pattern: the name is the single input. | n/a | search |

### 2.4 Record what I do, then name it

Macro recorders replay exactly what they saw and are brittle; the hard part of programming by
demonstration is generalising, and systems either guess (and miss the intent) or make the person state
every generalisation. In a study of one end-user tool (Familiar), participants preferred their other
tools and used it only when nothing else would do. *search (the "Your Wish Is My Command" chapters and a
2022 survey of low-code models).* Implies here: "do it, then keep what you did" is the app's own
"written by running", which the owner tried on the runner and removed. The literature's warning is the
same as the owner's finding: a recording has no loops, inputs or names until someone adds them, and
adding them is a separate act of planning.

### 2.5 Research on leading people through a notation

- **How people state procedures unprompted** (Pane and Myers, CMU, 2001–2002): as reactions to events
  and as operations on whole sets, rarely as loops with counters; Boolean expressions were rare and
  often wrong. *search.* The owner's "For each concern, …" typed as prose is this.
- **Attention investment** (Blackwell 2002), **cognitive dimensions** (Green and Petre 1996), **six
  learning barriers** (Ko, Myers and Aung 2004): already summarised in the honest assessment, B.3; not
  repeated. The barrier that a led start addresses is knowing what exists and what to use it for. It
  does not address viscosity.
- **The gentle slope** (Myers and colleagues; MacLean et al. 1990 on tailorable systems): each step up
  in power should cost a small step in learning, with no wall between the easy layer and the full one.
  *memory; my search for it returned nothing relevant.*
- **Training wheels** (Carroll and Carrithers, 1984): a word processor with its error-prone functions
  blocked was faster to learn, and people who started on it later did better on the advanced tasks too.
  Carroll doubted it as a permanent arrangement. *search (NN/g's summary and a 2023 CHI paper).* Note
  what helped: taking things away, not leading by questions.
- **The paradox of the active user** (Carroll and Rosson, 1987): people start doing at once and will
  not read first, even when reading would pay. *search.*
- **Guidance can cost understanding** (van Nimwegen and colleagues, CHI 2006, "The paradox of the
  assisted user"): people using an interface that withheld help planned more, solved better and knew
  more afterwards than those using the helpful one; the authors advise against heavy assistance where
  planning and learning are the goal. *search.* Lab puzzles, short sessions.
- **Fading** (Atkinson, Renkl and Merrill, 2003): removing worked-out steps one by one improved
  near-transfer; combined with prompts to explain each step, near and far transfer both improved, with
  no extra time. Koedinger and Aleven call the general question the "assistance dilemma" and treat it
  as open. *search (abstracts).* Expertise reversal is in the assessment, B.1.

### 2.6 Where the guided path and the expert editor coexist

| Product | How both are kept | Moving between them | Evidence over time |
|---|---|---|---|
| TurboTax desktop | Two modes over one return | One icon each way | Forum posts only: experts seek Forms; the online edition dropped it |
| Excel | A dialog that writes into the expert surface | The result is ordinary text in the formula bar | None found; memory says people graduate |
| Home Assistant | Two views of one stored thing | A menu item, per automation or per element | A complaint about two vocabularies |
| Shortcuts | Setup questions run once on adding; the editor is always the editor | None needed; the questions fill editor fields | None found |
| IFTTT | Expert layer behind a "+", paywalled | Add it to the same applet | None found |
| Zapier | Copilot beside the editor | The same Zap | None found beyond vendor claims |

**I found no study of whether people stay in a guided path, graduate from it or abandon it.** The
nearest things are Spool's settings result, Carroll's training-wheels result and the forum complaints
above. What the shipping products share, as far as these summaries show:
1. The guided path writes into the same thing the editor edits. None keeps a second model.
2. Where the guided path uses its own words (Home Assistant) people pay for it when they move to the
   editor. Where it uses the editor's words (Excel's argument names) they do not.
3. A product that leads by questions shows the built result before the person is committed (Check
   answers; the will; the Zap's outline), and people use that view to go back and change answers.

---

## 3. Problem-framing practices, and the four framings

Each practice is a fixed run of plain questions. *All memory unless marked.*

| Practice | Its questions, in order | Does it tell kinds of aim apart? |
|---|---|---|
| **Pólya, *How to Solve It*** (1945) | What is the unknown? What are the data? What is the condition? · Do you know a related problem? · Carry out the plan, checking each step · Can you check the result? *(search confirmed these questions)* | Yes, two: problems "to find" and problems "to prove" get different first questions |
| **GTD's natural planning** (Allen) | Why (purpose and principles) · what does done look like · brainstorm · organise · what is the next action *(search confirmed the outline)* | Yes, by level: a next action, a project (an outcome needing more than one action), and the higher "horizons" that never finish |
| **Backward planning** (Wiggins and McTighe) | What result · what evidence would show it · only then, the activities *(search)* | No; it assumes an end |
| **GROW** (Whitmore, 1992) | Goal · Reality · Options · Will ("What is your next step?") *(search)*. Its handouts say to move around the four as needed | No |
| **WOOP** (Oettingen) | Wish · Outcome · Obstacle · Plan, as "if <obstacle>, then I will…" *(search)* | No. Its plan is an if-then, which this app has refused as a conditional; the library's "Set a cue to start" already carries the usable part |
| **Jobs to be done** | "When …, I want to …, so I can …" | No. It is one sentence with three blanks, which is a way to normalise an input |
| **How might we** | Restate a complaint as a question that invites more than one answer | It turns anything into a question |
| **Five Ws** | Who, what, when, where, why | No |
| **Socratic questioning** | Each question depends on the last answer | Cannot be done from a fixed script; with no model on the device it reduces to fixed branches |
| **Task-analysis interviews** (HTA; applied cognitive task analysis) | Name the goal · list its three to six main steps · for each, ask again, and stop where the step is easy to do right | No; they assume a procedure exists. *(My search confirmed the method family, not the "three to six" wording.)* |

**Pólya's first phase is the owner's own sentence.** "The output, … my inputs, … a series of steps to
transform my inputs" (2026-11-25) is unknown, data, plan. And each Pólya question has a construct:
unknown → gives; data → asks; condition → Say what done is; "a related problem" → a routine you already
have; "check the result" → Check and mend.

**No practice uses the owner's four framings as such.** Two questions separate them, though, and both
are plain:

| Framing | Example | Does it end? | What is there at the end? | The template it points to | How the follow-up questions differ |
|---|---|---|---|---|---|
| A task | "clean the car" | Yes | The thing is done | None: a plain list | "What comes first? Then?" and nothing else. The path is known |
| A goal | "make a zine" | Yes | A thing made, or a choice made | Make ▢ · Make a decision | Backward: "what will be true when it's done?" before any step |
| An ambition | "get better at drawing hands" | No | Nothing final; you stop for the day | Learn ▢ | "How will you know it's done?" has no answer, and that is the tell. Then: "what are the parts?", "what do you do each time?" |
| A question to answer | "is creatine safe long-term?" | Yes | Something known | Find out ▢ | "What do you think now?", "what would change your mind?", "what does it raise?" |
| (not known yet) | "start on the game" | Unknown | Unknown | Work it out as you go | Only "what is the first small thing?" |

My reading of this table: **the library's template names already are the framing question.** "Learn ▢",
"Find out ▢", "Make ▢", "Make a decision" are four sentence openers, and choosing which one your aim
completes is the classification. A person who writes "Find out whether creatine is safe" has answered
"what kind of thing is this" without being asked.

---

## 4. Mapping plain questions to this app's constructs

Built / not built is from DESIGN.md. "Clean" means a plain answer decides the construct with no
follow-up in the app's language.

| The plain question | The construct | Built? | Clean? | Where it breaks |
|---|---|---|---|---|
| What is this for? | The name | Built | **Clean** | None. Today's New asks exactly this, without the question |
| What will you have at the end? | What the routine gives | Step gives: built. A routine's own gives: P-98 | **Not clean** | An end that nothing later reads is not an output. Owner, 2026-11-25: "there has to be a purpose for that outcome"; gesture drawing gives "an intuitive feeling of progression". The question invites a value the model says should not exist |
| What do you start with? | asks (a `{name}` read and not given) | Built | Half | The answer may be something handed in (asks), something chosen as the first step (a step that gives; owner, 2026-11-26: "it's an output of the step, not an input"), or just words. The question cannot tell these apart. It does not need to: nothing can fail, and a name nothing gives asks when run |
| What comes first? Then what? | A step | Built | **Clean** | This is the Add row. For work whose path is unknown, the honest answer runs out after one or two |
| Is it the same for several things? | For each | P-98 | Half | Yes or no is clean. Which things (the list) and which steps are inside it (the range) are two more answers, and the range is the one the owner's for-each sheet failed at. People give all three in one sentence when left alone ("For each concern, research it"): the construct is better read from the step's words than asked for |
| Does it need something first? | Order; or asks; or a pause | Built | **Not clean** | Three meanings: an earlier step (order), something handed in (asks), something from outside (the retired wait; now Pause). B-16's rule is that dependency is never stated, only arranged, so asking the question contradicts the model |
| Do you already have a way of doing that? | A call to a routine | Step in: built. Adding one in Plan: P-98 | Half | Clean once answered, but it relies on recalling your own routines by name. A lookup does that better than a question, and the owner already chose "only when summoned" ("@") in B-17 |
| How will you know it's done? | Say what done is (library, gives `{standard}`); or Repeat from here "until I'm done"; or a number; or the end of a for each | Mixed | **Not clean, and the most useful** | One question, four constructs, chosen by the form of the answer: a standard, "it doesn't end", "five times", "when I've been through them all". The form of the answer is also what separates a goal from an ambition (section 3) |
| Does this come round again? | Repeat from here | Built | **Not clean** | Three meanings: run the routine another day (every routine does), repeat a part within a run (the divider), the same for each of several (for each). The owner's 2026-11-25 note on "reps" against "recipes" is this confusion. And where the divider goes is a second question |
| Is this step too big to start? | Break it down | Built | **Clean** | The answer is usually known only after trying the step, so it belongs after a run |
| Can these be done in any order? | In any order | P-99 | Half | Whether something after them needs all of them (the join) is the real decision, and it is in the model's terms |

**Summary of the mapping.** Three questions are clean and are already what Plan does: the name, the
next step, break it down. One question is not clean and is worth asking anyway because its answer
classifies the aim: "how will you know it's done?". The structural questions (same for several, comes
round again, needs something first) do not survive translation to plain words: each has two or three
meanings, and resolving the meaning takes a follow-up in the app's language. That is the main finding
of this investigation, and it is a prediction from the model's own documents, not an observation of
anyone using such questions.

---

## 5. Options

Five shapes. Sizes are guesses. "Big" is by `docs/product/briefs/README.md`.

### Option 1 — No composer: templates with blanks, plus Plan (the baseline to beat)
*Already decided: B-17 slice 3 (after P-99), M, Full tier. Today's version of it is typing a routine by
hand.*

"Get better at drawing hands", once the library exists: My routines › Library › **Learn ▢** › the
preview sheet shows its steps › **Copy…** › name it "Learn to draw hands" › Copy. Plan opens with "State
what you want to be able to do", a kept list of parts, and three parts in any order. The person rewords
what does not fit.

- **Costs:** nothing beyond what is approved.
- **Risks:** the structure arrives whole, in the library's words, before the person has thought about
  their own way. It is the most complete substitute for the "muscle" of all five options. B-17 names
  the sign to watch: "copied and never changed". And it asks for the heaviest commitment first (kept
  lists, any-order parts) for an aim the person may not understand yet.
- **Verdict: fits.** It is the approved plan.

### Option 2 — A first-writing interview, held as a draft
"Research a question": + New opens a run of sheets, one question each, the question as the sheet's
title and one field under it.
1. "What do you want to find out?" → *whether creatine is safe long-term* (the name).
2. "How will you know it's done?" → *I can state an answer and what would change my mind*.
3. "What do you start with?" → *the question* → `{question}`.
4. "What comes first?" → *Find what bears on {question}* · "Then?" → *List the questions this raises* ·
   "Then?" → *Write the answer* · (empty answer ends it).
5. "Is any of that the same for several things?" → pick *the questions this raises* → a for each.
6. A read-only list of what was built (B-17's preview sheet is the precedent), **Keep** filled, Close.
Keep makes the routine and opens Plan.

- **Costs:** L, **big** (a new sequence of screens; a DESIGN.md rule; and if an unfinished interview
  must survive closing the app, a new stored record, so Full tier).
- **Risks:**
  - Six to eight answers before anything can be run, against two today (a name and one step).
  - Questions 2, 3 and 5 are the ones section 4 found unclean. They would need helper text, and helper
    text is what the minimalism rule forbids.
  - Structure is fixed before the first run, which is the "premature commitment" the assessment warned
    of, and it runs against "a routine is … written down as they discover it".
  - A wizard suits novices and rare tasks (2.2). The one user here designed the model.
  - A third surface between Plan and the runner, with its own words to keep consistent.
- **What it has for it:** it is exactly what the owner expected on 2026-11-25, and question 2 is the
  one question worth asking.
- **Verdict: fits if changed.** Cut to the clean questions plus one (name, how you'll know it's done,
  the first step); each question is the field's label and nothing else; no draft is stored (see
  "Committed or held" below); it ends in Plan. Cut that far, it is nearly Option 3.

### Option 3 — Plan leads: the Add row asks, and what you answer is in the routine at once
No new surface. Plan stays the sequence; its open row carries the question as its placeholder, and what
follows a step is offered at that row.

"Get better at drawing hands": + New → the name → Plan. The open row's placeholder reads "What comes
first?" (today: "Add a step"). Type *Find three photos of hands*, Add. The placeholder now reads
"Then?". Type *For each photo, draw it in three minutes*; once P-98 exists, the row offers "For each…"
because the words began that way (Add's offers are already planned in P-98). Type *Say what was hardest*.
Start. Nothing else is asked. Structure is added later, in the same place, when a run shows it is
needed.

A cousin of this is B-12's unbuilt labelled start (**For · With · Steps**): the same idea as a form
shown all at once.

- **Costs:** S to M. Placeholder wording is Light-tier UI. Whether a question as a placeholder touches
  "no instructional text" is the owner's call; if it does, it is **big** by rule and needs a brief
  despite its size. A "With" field that declares inputs no step reads yet would be a stored field: big,
  Full tier.
- **Risks:** it may be too little to feel led: it does not ask about the end, inputs or loops. A
  placeholder vanishes when typing starts. It leans on P-98 for anything beyond steps.
- **What it has for it:** it uses only the clean questions; it keeps one vocabulary (2.6, point 2); the
  built-so-far view is the sequence itself; it matches how the owner already reached for structure, by
  typing a sentence; and it is the owner's own wording, "offered individual actions after a step".
- **Verdict: fits**, if the owner accepts a question as a field's placeholder.

### Option 4 — "What next?" asked only at a point of finality
Nothing changes at first writing. The question comes when something has just ended.

"Get better at drawing hands", three steps, first run. The last step's button reads Done. Variants:
- **(a) After the run.** Done ends the run and goes home, as now. The "Done with Drawing hands" row
  carries one more door, **Plan**. No question is asked; the boundary is the cue.
- **(b) After a level.** Step out, or the last step of a breakdown, is followed by a one-field sheet
  titled "What next?" whose answer is appended at that level.
- **(c) As a step the person owns.** The routine's last step is in their own words: "Say what to change
  next time". (The library's "Review after doing" is this.) Then Plan, by its usual door.

- **Costs:** (a) S, Light. (b) M, and **big**: it changes how running works and puts planning on the
  runner. (c) nothing; it can be done today.
- **Risks:** this boundary has been built twice and removed twice: the blank "next small step" note on
  the runner, then the run ending in Plan ("planning isn't finality", 2026-11-26). (b) is the third
  attempt at the first of those. (a) and (c) avoid it. None of the three helps with the first writing,
  which is where the owner said the guidance belongs.
- **Verdict:** (a) **fits**. (b) **doesn't fit**: "Nothing is planned here" (the runner), "Finishing
  never opens Plan", and "planning and running … must never look alike". (c) **fits** and needs no
  build.

### Option 5 — The interview is a routine
The runner is already a one-question-at-a-time surface with a field under the question. So the guided
start can be a routine the person runs, written in the app's own material, with no new screen.

"Research a question": Start **"Work out an approach"** (typed by hand today, or a library method
later). Its steps, each with a giving field: "Say what you want to end up with" gives `{end}` · "Say how
you'll know it's done" gives `{done}` · "List what you start with" gives `{have}` · "List the first
steps, small enough to start" gives `{steps}`. Then the person opens + New and writes the routine with
those answers in mind. With B-16's "Work it out as you go" (designed, not built) the list of steps is
itself run, one item at a time, and adjusted after each: that template is the model's own answer to
"figure it out as you go".

- **Costs:** none to try by hand. S as a library method (B-17 slice 1 content). Turning a run's list
  into a new routine ("Make a routine from here…", designed in B-12, not built) would be L, **big**,
  Full tier.
- **Risks:** today the answers do not flow anywhere; they sit in an ended run that nothing shows, and
  the person retypes them in Plan. It puts planning-shaped work on the runner; the owner's own
  2026-11-26 note says a step should "read as answer the question" and that "the app should [not] be
  supporting capture". And it is the purest meta-work: a routine about writing routines.
- **What it has for it:** it costs nothing to learn whether fixed questions help at all; the person can
  reword or delete the questions, which is what fading means in this app; and it is the only option in
  which the scaffold is the person's own property.
- **Verdict: fits if changed** as a product feature (it needs the unbuilt verb to be more than a
  warm-up). **Fits as it stands as a probe** during the owner's test.

### Committed at once, or held until kept
What other tools choose, and why (from section 2; my reading of the pattern):
- **Held** where the result is consequential or already live: a tax filing, a will, a government
  application, a published Zap. Zapier's draft exists to protect a version that is running.
- **Held** where a half-built thing is not valid: a formula with a missing argument (Excel holds until
  OK), an applet with no action.
- **Committed at once** where a half-built thing is still valid and changing it is cheap: the Shortcuts
  editor, templates in Notion and Todoist.

This app is in the third group on every count. A routine with one step is valid; one with none simply
has no Start. Every edit has an Undo. The owner has ruled on the principle already (B-12): "a change
made in Plan … alters the routine", "nothing is 'for this run only', and there is no Keep", and the Keep
sheet was built and then removed. The staging the owner asked for on 2026-11-25 ("no proposal or
staging or a drafting stage") now exists: a routine with no run is a draft in every sense that matters.
A separate held draft would also have to be either a new stored record (big, Full tier) or lost when the
app closes, and DESIGN.md says typed text is never dropped.

The one real argument for holding comes from the will builders: people could not judge their answers
until they saw the document. An interview that hides the growing sequence needs a held draft and a
review. An interview that shows the sequence as it grows (Option 3) does not.

---

## 6. Tensions to weigh

**With "no instructional or explanatory text".** A question is not automatically instruction. The
inductive-UI guidelines treat the question as the screen's title, and DESIGN.md allows "form labels".
The app already titles sheets with questions ("Start <name> over?") and B-12 drew an open row reading
"What comes next?". The line I would draw: a question that is the label of the field beneath it, and
needs no second sentence, is a label. A question that needs a clause to be understood is explanation,
and by DESIGN.md's own test that means the design has not said it. Section 4 predicts which questions
pass (the name, the next step, how you'll know it's done) and which fail (same for several, comes round
again, needs something first). So the rule does not forbid a composer; it limits one to about three
questions.

**With "planning and running must never look alike".** One question on screen with one filled button
beneath it is the runner's silhouette. B-12's insight was that running's unit is one step and planning's
unit is the sequence. An interview of single-question screens borrows running's shape for planning,
which is the original fault in a new place. Option 2 has this problem unless the growing sequence is on
screen throughout; Option 5 has it by construction; Option 3 does not. A composer also risks becoming a
third mode beside the two, when the owner's 2026-11-25 notes use "composer" and what is now Plan as the
same thing.

**With "it's supposed to develop that muscle".** The research splits on what kind of help it is.
- Help that hands over the answer or the structure reduces planning and what is learned (van Nimwegen).
- Help that removes distractions early speeds learning and does not hurt later (Carroll).
- Prompts that make the person produce the next part themselves, and are then withdrawn, help and
  transfer (Atkinson, Renkl and Merrill; the expertise-reversal work in the assessment).
"What comes first?" asks the person to produce; it exercises the breaking-down itself. Picking "Learn ▢"
hands over a structure. On this measure the baseline (templates) is the option most likely to stand in
for the skill, and a short set of open questions the least. None of it builds anything unless it fades,
and the only fading the app can offer without counting is the person deleting or ignoring the prompt.
All of this evidence is from students and short lab tasks.

**With the meta-work risk.** A composer is one more surface to tune, and writing its question set is
building a model of the model. The assessment's observation stands: the heavy constructs serve work
whose shape is known, and the answer for unknown work is the simplest thing the app has. An interview
before running is planning ahead for work the owner says is meant to be figured out as you go. For that
kind of work the honest interview is two questions long: what is it, and what is the first small thing.
That is close to today's New followed by one Add.

**With the earlier removal.** A first-writing interview is not what was removed: that was a prompt in
the middle of doing. The boundary the owner now names, the start of writing, is clean. The risk is at
the other boundary. "A point of finality" has been handled three ways in three days, and the current
rule is that Done is final and goes home. Option 4(b) would reopen it.

**A tension the owner did not list: led once, or every time.** Wizards suit rare tasks and beginners.
If routines are written rarely, a led start costs little and pays little. If they are written often, the
person becomes practised within days and the lead becomes friction. Either way the case for a long
interview is weak for this one user; the case for a short prompt at the open row survives both.

---

## 7. What the owner's test could observe before anything is built

A note per session is enough. No counts shown anywhere; this is the owner's own paper.

1. **Each new routine:** what the first sentence in your head was, verbatim. A thing to do, a thing to
   make, getting better at something, a question, or none of these. This tests the four framings and
   the sentence openers at no cost.
2. **Each new routine:** how many steps it had at its first Start, and whether you stalled at the open
   row. If you stalled, on which: not knowing the first step (a thinking problem a question might
   help), or knowing it and not knowing how to say it in the app (a discoverability problem), or
   knowing both and finding it slow to type (a viscosity problem a composer does not fix).
3. **Each structure written as prose** in a step ("for each…", "repeat until…", "using what I chose").
   Each one is a construct you reached for by sentence.
4. **Each visit to Plan mid-run,** and what for: adding the next step because it could not be known
   earlier; fixing words; adding structure; removing a step.
5. **Each routine abandoned before its first run.** A long interview would add to this number; a blank
   start may be causing it.
6. **Each routine written and never changed** after two or more runs, and each one changed, with the
   kind of change. Routines whose structure arrives only after runs argue against asking for it up
   front.
7. **At each Done:** did you want to change or add something? Did you then open Plan? This is the whole
   evidence for or against Option 4.
8. **The paper interview.** For two new routines, answer on paper first: what will I have at the end,
   how will I know it's done, what do I start with, what comes first. Then write the routine. For two
   others, write it cold. Note which paper answers ended up in the routine, and which of the four
   routines you still run a week later.
9. **The routine probe (Option 5).** Type "Work out an approach" by hand and run it before writing one
   routine. Note whether running an interview on the runner felt like doing or like drafting.
10. **Sessions that were all Plan** (the assessment's signal 7). If these are common before any
    composer exists, adding one will not reduce them.

A fair reading rule, set before starting: if 2 shows stalls of the first kind on several routines and 8
shows the paper answers shaping what was written, a led start has a case. If 2 shows the second or third
kind, the case is for Plan's discoverability and typing, not a composer. If 6 shows structure arriving
after runs, ask nothing about structure at first writing.

---

## 8. Open questions for the owner

1. **Which finality?** The end of the whole run (Done, home), the end of a level (Step out, the last
   step of a breakdown), or the end of a round? On 2026-11-26 you said planning is not finality; on
   2026-11-27 that finality makes the switch apparent. Both hold if the prompt comes after the run has
   ended and you are home, and not as part of ending it. Is that the meaning?
2. **Is a question allowed as a field's label or placeholder** ("What comes first?") under "no
   instructional text"? Everything in Options 2 and 3 depends on this one ruling.
3. **"Strategy" or "approach" as the word.** DESIGN.md says one vocabulary and one word per meaning,
   and the visible word is "routine". Would a composer's word replace it, or sit beside it? Home
   Assistant's two vocabularies are the cautionary case.
4. **Is the framing asked or inferred?** Section 3 suggests the first words of the name can carry it
   ("Find out …", "Learn …", "Make …"). Do you want to be asked what kind of thing it is?
5. **How long may it be before something can be run?** Today: a name and one step.
6. **Is it for you, or for a second person?** For you, the lead will be outgrown within days. For a
   newcomer it is the main thing they would have (the assessment's blind spot 10).
7. **Should what you answer about the end be kept anywhere?** "How will you know it's done" has no home
   in the model unless a later step reads it, by your own 2026-11-25 rule.
8. **Does a led start replace the library's templates, sit before them, or lead into them?** B-17 slice
   3 is approved; Option 3 with sentence openers would overlap it.

---

## 9. A view, not a recommendation to build

**Most promising: Option 3 (Plan leads), in its smallest form,** with Option 5 as a no-build probe
during the test and Option 4(a) or (c) for the far boundary. Reasons:
- It asks only the questions whose answers map cleanly to constructs.
- It keeps one vocabulary and one model, which is what the surviving guided-plus-expert products do.
- The sequence is visible as it grows, so nothing needs to be held, reviewed or kept, and Plan stays
  unmistakably Plan.
- It makes the person produce each step, which is the kind of help the fading research supports.
- It matches the only structure-writing behaviour seen in real use: a sentence typed into the Add row.
- It is small enough to throw away.

**Its weakness:** it may not feel like being led at all, and it says nothing about the end or the
inputs, which were the first two things the owner named on 2026-11-25.

**What evidence would change this view.**
- Toward **Option 2** (a real interview): repeated stalls before the first step on unknown-path
  routines; the paper interview (7.8) clearly producing routines that are run more and reworked less;
  and an owner ruling that a short question with one line of help is acceptable.
- Toward **Option 1 alone** (no composer): copied or hand-typed templates that get reworded and pruned
  in use, showing a handed-over structure does become the person's own.
- Toward **Option 4**: routines that are written without trouble and then never revised, with a wish to
  change something noted at Done (7.7).
- Toward **none of them**: stalls of the viscosity kind (7.2), or sessions that are all Plan (7.10).
  Then the next change should make Plan faster or the model smaller.
- Against everything here: any opened source contradicting a **search** or **memory** item above. None
  was verified.

---

## Sources

None was opened; the hosts were refused. **search** = from a search-result summary on 2026-11-27.
**memory** = recalled, unchecked.

*Interviews, wizards, forms*
- Intuit community threads on Forms mode and the interview (user posts, not documentation), e.g.
  https://ttlc.intuit.com/community/taxes/discussion/can-i-avoid-the-interview-and-just-input-directly-to-the-forms/00/448237
  and https://ttlc.intuit.com/community/retirement/discussion/i-m-a-retired-cpa-used-the-forms-method-for-many-years-made-mistake-of-using-the-interview-method/00/3567996 — search
- Nolo WillMaker, "Welcome to Nolo's Online Will": https://www.willmaker.com/legal-manual/wills/welcome-to-nolo-s-online-will.html — search
- FreeWill, Wills & Trusts FAQs: https://help.freewill.com/article/76-will-trusts-faq — search
- Trust & Will, the questionnaire: https://help.trustandwill.com/hc/en-us/articles/360053132192 — search
- GOV.UK Design System, Question pages: https://design-system.service.gov.uk/patterns/question-pages ; Check answers: https://design-system.service.gov.uk/patterns/check-answers — search
- GDS Design Notes, "One thing per page" (2015-07-03): https://designnotes.blog.gov.uk/2015/07/03/one-thing-per-page/ — search
- GOV.UK Service Manual, form structure: https://www.gov.uk/service-manual/design/form-structure — search
- DWP Design System, Add another thing: https://design-system.dwp.gov.uk/patterns/add-another-thing/how-it-works and https://design-system.dwp.gov.uk/patterns/add-another-thing/user-research — search
- Microsoft Inductive User Interface Guidelines (2001): https://msdn.microsoft.com/en-us/library/ms997506.aspx — search
- Nielsen Norman Group, Wizards: https://www.nngroup.com/articles/wizards/ — search (excerpt only)
- Typeform, average completion rate: https://help.typeform.com/hc/en-us/articles/360029615911 — search (vendor figures, inconsistent)
- Soni et al. (2022), chatbot versus online form, Frontiers in Digital Health: https://www.frontiersin.org/journals/digital-health/articles/10.3389/fdgth.2022.954069/full — search
- Kim, Lee and Gweon (CHI 2019), Comparing Data from Chatbot and Web Surveys: https://soominkim.github.io/project/CHI2019_KIM_Comparing.pdf — search
- KU Leuven longitudinal chatbot-survey study: https://lirias.kuleuven.be/retrieve/697279 — search
- Spool (2011), Do users change their settings?: https://archive.uie.com/brainsparks/2011/09/14/do-users-change-their-settings/ — search (the 5 % figure from secondary reports)

*Automation builders*
- IFTTT, filter code: https://help.ifttt.com/hc/en-us/articles/4406412223771-How-to-add-filter-code — search
- Zapier, version rollback: https://help.zapier.com/hc/en-us/articles/14094586364941-Restore-your-Zap-to-a-prior-version-with-version-rollback ; drafts: https://community.zapier.com/product-updates/zap-editor-drafts-beta-is-here-14441 ; Copilot (LLM): https://zapier.com/blog/zapier-copilot-guide — search
- Apple Shortcuts User Guide, import questions: https://support.apple.com/guide/shortcuts/apdf330fd3a0/ios ; the action list and next action suggestions: https://support.apple.com/guide/shortcuts/apdc33e4f4da/ios ; What's new in Shortcuts (iOS 16.5): https://support.apple.com/en-us/HT213544 — search
- Home Assistant, automation editors: https://home-assistant.io/docs/automation/editor/ ; forum, toggle between YAML and visual: https://community.home-assistant.io/t/ui-improvement-toggle-button-to-switch-automation-between-yaml-visual/810763 — search
- Microsoft, Insert Function and Function Arguments in Excel: https://support.microsoft.com/en-us/office/insert-function-74474114-7c7f-43f5-bec3-096c56e2fb13 — search
- Process Street, AI workflow generator (LLM): https://www.process.st/help/docs/ai-workflow-generator/ — search

*Research*
- Pane, Programming system for children (thesis, 2002): https://www.csd.cmu.edu/sites/default/files/phd-thesis/CMU-CS-02-127.pdf ; Natural Programming project: https://www.cs.cmu.edu/~NatProg/papers/projectoverview.html — search
- Lieberman (ed.), Your Wish Is My Command, chapters on Familiar and on generalisation: https://web.media.mit.edu/~lieber/Your-Wish/15-Paynter.pdf ; Low-Code Programming Models (2022): https://arxiv.org/pdf/2205.02282 — search
- Carroll and Rosson, Paradox of the active user; NN/g summaries: https://www.nngroup.com/articles/paradox-of-the-active-user/ , https://www.nngroup.com/articles/training-wheels-user-interface/ ; Sarkar (2023): https://advait.org/publications-web/sarkar-2023-simplicity — search
- van Nimwegen, Burgos, van Oostendorp and Schijf (CHI 2006), The paradox of the assisted user: https://dblp.org/rec/conf/chi/NimwegenBOS06.html ; van Nimwegen et al. (2004), Can more help be worse?: https://dspace.library.uu.nl/bitstream/handle/1874/10634/Nimwegen_04_Can-more-help-be-worse.pdf?sequence=2 — search
- Atkinson, Renkl and Merrill (2003), fading worked-out steps: https://asu.elsevierpure.com/en/publications/transitioning-from-studying-examples-to-solving-problems-effects-/ — search
- Koedinger, Pavlik, McLaren and Aleven (2008), the assistance dilemma: https://www.cs.cmu.edu/~aleven/Papers/2008/Koedinger_ea_CogSci2008.pdf — search
- Blackwell (2002); Green and Petre (1996); Ko, Myers and Aung (2004); Kalyuga on expertise reversal: as cited in `.polish/product/assessment-honest-2026-11-27.md` — not re-searched
- Myers and colleagues on gentle-slope systems; MacLean et al. (1990) on tailorable systems — memory

*Framing practices*
- Pólya, How to Solve It (1945), the list of questions: https://www.cs.hmc.edu/~keller/how_to_solve_it.html — search; "to find" against "to prove" is memory
- Allen, the natural planning model: https://gettingthingsdone.com/2024/11/the-natural-planning-model/ — search for the outline; horizons of focus is memory
- Wiggins and McTighe, backward design: https://ascd.org/el/articles/the-fundamentals-of-backward-planning — search
- GROW (Whitmore 1992), example questions: https://www.imperial.ac.uk/personal-tutors-guide/developing-students/coaching/the-grow-model/ — search
- WOOP (Oettingen), meta-analysis: https://pmc.ncbi.nlm.nih.gov/articles/PMC8149892 — search
- Critical decision method: https://digital.ahrq.gov/health-it-tools-and-resources/evaluation-resources/workflow-assessment-health-it-toolkit/all-workflow-tools/critical-decision-method — search; the applied task-analysis "three to six steps" probe is memory
- Jobs to be done, How might we, the Five Ws, Socratic questioning, hierarchical task analysis — memory

## What I could not do
- Open any source. Every finding above should be checked before it is repeated.
- Find any study of whether people stay in a guided path, graduate or leave. The claim in 2.6 that none
  was found is about my searches, not about the literature.
- Find anything on Airtable's base-building flow, Notion or Coda template prompts, or Tasker's beginner
  mode; the searches returned nothing usable and I have left them out.
- Run the app. Statements about today's New and Plan are from DESIGN.md and the task brief.
