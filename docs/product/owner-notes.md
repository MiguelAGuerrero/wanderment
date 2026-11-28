# Owner notes

How the owner actually uses the app, and what they've said in conversations about it. **This is the
product's only usage signal** (there's no analytics), so `/product` reads it first, every run.

`/product` adds an entry whenever the owner talks about their use, wishes, annoyances or reactions
to something that shipped. It records the owner's words as closely as possible and keeps its own
interpretation apart. The owner can also write here directly.

Format, newest first:

```
## YYYY-MM-DD — <topic>
> what the owner said (quoted or closely paraphrased)
Interpretation: <what /product took from it — clearly marked as its reading>
Led to: <P-## / brief B-## / nothing yet>
```

---

## 2026-11-28 — Rulings from the final review; onboarding through a composer
Answered in chat on the final review's questions:
- How a new user reaches the library: "There should be a proper on boarding process, and I believe that was
  the success where you have a composer of sorts guide you through a set up of a routine to simplify the
  process of translating your thoughts into the app without relying on the apps constructs so much. And
  that's where we leverage the library functions as a scaffold to interpret a users intent."
- "Find out ▢" calling itself: "Unpark self-calls" — a routine calling itself is to work, passing its inputs.
- Home's queue at a call not stepped into: "Step into the first step" — the row shows the call's first
  step and Resume lands there.
- Back across a "Repeat from here" round: "Keeps across rounds" — Back never clears; only a new round,
  going forward, clears.
Interpretation (ours): the onboarding composer is B-17's composer (discovery 2026-11-27-guided-composer.md),
now asked for as the first-run path, using library methods as scaffolds; it needs its own brief before
building. Self-calls leave B-16's parked list.
Led to: the final-review fix batches (F-1 engine/storage, F-2 surfaces); P-113 (self-calls); P-114
(onboarding composer, brief first).

## 2026-11-28 — Short helpful text is welcome; long explanations are not
Relayed from the second session: "I think I've been misinterpreted on the instructional aspect of things. I
didn't want there to be a lot of descriptive text on how the app works, but quick and insightful or
necessary text to explain what's accepted and what are perfectly okay."
Interpretation (ours, and the second session's): DESIGN.md's Minimalism rule has been applied too strictly.
Proposed wording (to confirm): "Short text that says what a field accepts or what a control is for is
welcome where it is needed: a placeholder, a label, one line. Text that explains how the app works is not."
Led to: DESIGN.md rewording (pending confirmation); the final review re-checks short text removed under the
old reading.

Answered in chat 2026-11-28, on the proposed wording: "It's OK if it explains how the app works. It's just
not huge paragraphs unless it's off in an additional settings where that useful information is has a space
to occupy but as part of the main user loop I don't want large text is what I'm trying to say."
Led to: DESIGN.md's Minimalism rule reworded (no large text in the main loop; short text welcome, including
how a thing works; longer explanations in Settings).

## 2026-11-27 — Back keeps a value; a Plan edit never clears a run's values
Answered in chat on two P-110 behaviours the investigator flagged:
- Back onto the giving step: "Back keeps it" — Back shows the value in the step's field to keep or change;
  only Jump, Repeat, Start over and a new round clear it.
- Dragging a giving step below the place in Plan: "Keep the value" — a Plan edit never clears a run's
  values; the value stays hidden while its step is below the place and shows again in that step's field
  when the run reaches it.
Led to: corrections folded into P-111.

## 2026-11-27 — Defer full end-to-end testing to the end
"It seems like P1-10 is taking a long time, and I suspect this is because of testing. So please batch all
implementation work once and then defer testing at the end so that there's no redundancy here. At most,
run any unit or integration test, but full end-to-end tests can be deferred. Only run the tests that are
touched or implicated in a feature, implementation, or fix to at least ensure that we're not rolling up
bugs between iterations, or minimize the rolling of bugs between iterations."
Interpretation (ours): until the last batch, each batch runs unit/integration tests, typecheck, lint and
only the e2e specs it touches or implicates, and lands with plain `verify.sh` (changed specs + smoke), not
`--full`; no E2E_SLOW repeat proofs. The whole suite (`verify.sh --full`) runs once at the end, before the
final review. CI still runs the full suite on each push and goes red if something breaks.
Led to: process change for P-110 onward.

## 2026-11-27 — P-112: a condensed outline
Relayed from the second session, the owner's second reaction to the mock-up: "let's make it condensed, as in
like an actual outline or list view, so that the screen space can be optimized for more steps if needed.
Think of it like a very simplified form without the needs for all the paddings or margins or even the big
text. Maybe at most 16 pixels. And this could be a responsive thing. As you include more and more steps,
the view shrinks in a way where it's compact but doesn't lose visual information."
Interpretation (second session's, mock-up v3): with See ahead on, one condensed list: rows at 16 px text, a
field on one line beside its name, thin rules, insides indented; spacing tightens in three steps as rows
are added; text stays 16 px; longer lists scroll. Open: at the tightest step targets are 32 px, under
DESIGN.md's 48 px — an exception or stop tightening sooner (asked of the owner).
Led to: P-112 (amended), B-16.
- In chat, 2026-11-27, answering the 32 px question: "Let's have it though the list stops tightening and
  just allow a scroll at that point." → targets stay at least 48 px; the list tightens only as far as that
  allows, then scrolls. No exception to DESIGN.md.

## 2026-11-27 — P-112 chunks are a toggled view
Relayed from the second session, on the P-112 mock-up: "I want that to be a toggled view. It looks like
there's going to be a persistent then, and I don't want that. I just want that to be like a button you
click, and then it offers the controls to add steps into view."
Interpretation (second session's, mock-up v2): the runner is one step by default; one button ("See ahead",
pressed/unpressed) turns the view on, and only then the "then: <next step>" row, "Fewer" and Open/Close
appear. Designer's rulings not yet reacted to: the button's words and place; the view stays on after Next.
Led to: P-112 (amended), B-16.

## 2026-11-27 — Home as one queue, values follow the place, a breakdown's own view, "@" names, chunks
Read from Notion (MyStack › Home › plan › 2026-11-27, and Home › Observations), the owner's answers in chat,
and two notes relayed from the second session:

Read from the Notion page (MyStack › Home › plan › dated 2026-11-27 page, with a screenshot of Plan opened
from a run: "Back to the run", HERE on "Envision how'd expect {feature} to work", the Resume button reading
"Resume at Envision how'd expect {feature} to work", and a row reading "@Document Iteration"):

- "Feature isn't interpolated when a value is a supplied during a run"
- "The home view should really be a queue. Any ongoing runs would be the queue itself. And the new would be
  enqueue"
- "The breakdown step doesn't have its own contact so you have to keep clicking the previous substeps
  context menu to add a next step after it while it's more intuitive to have the breakdown step be its own
  view so that you can modify or develop the substeps with more screen space."
- "So I noticed if you're able to apply a value within the plan, you can't supply a valley before it's its
  prompted for or given while running in the execution of a step so that's a little bit non-intuitive. I
  ran into that case when I was planning out or finding my routine for iterating on the app, in order to
  proceed, I had to supply the value, but when I resumed, it was given before the step that gives it was
  reached. There has to be some smart way of ensuring or asserting the invariance: the place where you are
  in the app, in the routine (even post-planning), establishes this as the intended or expected state at
  that point in terms of values declared. This will improve the app by preventing unintended state and
  preventing cases where those values are supplied. The user leaves, they see where they are, they are in
  the routine, and don't understand how those values got there."
- Home › Observations: "I observed that the last known routine ran is indicated with just the word last. I
  think this can be improved by making it more explicit stating last ran or even most recent run because
  last is relative and the thing it's relative to is not clearly expressed in the UI and it makes it
  ambiguous as to what it's referring to. This will improve the possibility to communicate what was last
  rim so that the user can resume from their most recent work."

Answers in chat, 2026-11-27:
- Home: "One queue" — Home is one ordered list; each ongoing run is a row with its current step and where
  it sits; + New adds a run at the bottom; the top row gets the filled Resume; rows reorder by drag; no
  sections. (Replaces P-100's Up next / Ongoing / Finishing.)
- Values: only the steps above the place hold values (moving the place back — Jump, Resume at, Repeat —
  clears values given at or below it, with Undo; a value is asked only at its giving step, never ahead),
  "but ensure that we're not displaying placeholders if those valleys aren't supplied, so that gives extra
  context to say hey, you never reached part of the routine for which let's say concern was a resupplied.
  It should only show the active state of declaration at that point."
- Breakdown: "Opens its own view" — tapping a breakdown in Plan opens it full-screen with its own steps,
  its own Add a step and a path back, like Step in.
- Order: "Right after P-108" — quick fixes and the values rule, then the breakdown view, then P-100 as the
  queue-Home; P-99 and the library after.
- In chat, 2026-11-27: "Also I tried to reference a routine but it didn't work" (the screenshot's row reads
  "@Document Iteration" as words). Cause found: "@" closes its list at the first space typed
  (Plan.tsx readPick: `[\p{L}\p{N}_-]*`), so a routine named with two words can only be chosen before the
  space; typing the whole name and adding it keeps it as words. Also "@" only works in Add a step / Add
  after, not while changing a step's words. → P-110.
- Relayed from the second session (B-16, "A step owes what its insides give"), the owner, verbatim: "when I
  sufficiently understand my own routine, especially when it comes to loops, it would be more overhead to
  just keep looping through a block, and it might be more expedient to at least capture the results of
  that loop at the top level … instead of working it one by one, you can see chunks of steps all at once.
  And so when you are ready to proceed to the next loop and capture all the outputs of that loop or given
  values, you can note that and move on." And: "This improves the app by allowing the user to hold more
  than one step as context in their head at once without incurring the cost of tapping and navigating the
  app … it's like an abstraction, because it's no different from forming one step out of a whole bunch of
  sub-steps … effectively it's just syntactic sugar for looping over a function." → P-112 (a turn as one
  note), after P-100 unless the owner places it elsewhere.
- Relayed from the second session, the owner's answer on P-112, verbatim: "in a step view, well, in whatever
  step you can view, you can choose to keep pushing on the next steps as you see fit. And that way you can
  chunk up as arbitrarily as you want. And one way to address deeply nested structures is that they're
  expandable, and effectively it just turns into an outline view. And operates as a skip. So when you skip
  over a chunk, you go to the next step after the chunk. This doesn't have to be like a first class thing.
  It just has to be a quality of life UI affordance." → P-112 is a view affordance on the runner (extend the
  step in view with the next, expand insides in place as an outline, Next skips past the chunk; nothing
  stored). P-111's disclosure control and wording to match.

Interpretation (ours): order after P-108 is P-110 (values follow the place; Plan shows given values during a
run; "Last ran"; "@" across spaces), P-111 (a breakdown's own view in Plan), P-100 rewritten as the
queue-Home, then P-112 (chunks on the runner), P-99, the library.
Led to: P-110, P-111, P-100 (rewritten), P-112; B-16 (chunks).

## 2026-11-27 — Defer auditing to one review at the end; an investigator per phase
"While this is being built, just defer all auditing at the end in one batch review so implementation is
quick. That being said, prepare to have a read-only investigator per phase to queue up points of
concerns so that the auditor has steering."
Interpretation (ours): for P-98, P-109, P-107, P-108, P-100, P-99 and the library: build → `verify.sh
--full` → land, with no per-batch audit; after each lands, a read-only investigator reads that batch's
diff and appends concerns to one queue (`.polish/product/final-review-queue.md`); one adversarial audit
at the end works from that queue. `verify.sh --full` still gates every landing (CLAUDE.md's definition
of done).
Led to: process change for the remaining batches.

## 2026-11-27 — Build Places (references), after P-98
Relayed: "Let's build the references, because I think that's a simple feature that would make sense."
Answers there: "Places (Recommended)"; "Tile door, Plan and panel (Recommended)"; typed addresses "Build
it with the first slice". Confirmed here, to scheduling it after P-98: "Proceed".
Led to: D-25; P-109.

## 2026-11-27 — References to where the work lives: investigate only (relayed)
"research and investigation on integrations with external [apps] because there's a lot of friction on
trying to sync up what I'm doing with apps that I rely on to capture my thoughts and or [store] my
results … it would be nice and easy to … click and pull up where I left off without having to try to
remember exactly the specifics of where I put the Notion document or that text file … I noticed in the
past that when I start projects, I may have a Notion page for it and I don't remember that I did … I
don't want the app to instrument tooling to do your work. It's supposed to be a context management
[app]." "This is not within the test right now." Answers: a reference belongs to "The routine itself";
kinds: "Web links", "Files on my devices", "A place inside another app", "Physical places"; depth: "A
named link that opens (Recommended)".
On the composer finding: "the fact that a lot of the processes that goes into natural language don't map
cleanly into the constructs … is even a bigger reason to develop that, because we're supposed to make
these complex structures from simple asks, like what does done look like might be a routine that's
reasonably complicated to produce, but is afforded to the user as something simple."
Led to: nothing yet (investigations; owner's trial first).

## 2026-11-27 — A guided composer: investigate only, test the app first (relayed)
"it might be prudent to do some research and investigation into a composer view that seems to be guiding
you into making these complex decisions one step at a time … That way, the plan view is secondary to …
intuition and figuring it out, which is the basis of this app … This isn't going to be drafted because I
want to test the app a little bit first … It's supposed to develop that muscle to always be breaking
down complex tasks … So thinking is afforded more room rather than remembering."
Answers there: guides "When first writing a routine"; the first build's runner prompt failed because "the
UI didn't make that very clear on the context switching … When I'm executing and I get to a point of
finality, then the context switch is very apparent: what do I do next based on what I've done before?
Having all these different options available to me while I was running an execution made it unclear as
to what I was doing"; language "natural language and conversational … Not a routine, but … a strategy or
an approach … as a task, a goal, or an ambition, or a question to answer"; commit at once or held: "Investigate
both."
Interpretation: nothing to build; discovery `docs/product/discovery/2026-11-27-guided-composer.md`. Keep
the runner free of choices mid-step; keep Plan's Add-row placeholder easy to change.
Led to: nothing yet (owner's trial first).

## 2026-11-27 — First real use (drawing), relayed; the order after it; work from work
From the second session (verbatim in parts): "I do at least want the work queue. Because it at least
holds a stateful intention of how I'm going to execute tasks without me having to remind myself what
that I wanted to do next, and not rely on my mood or energy to have that be shifted throughout the day
unless I explicitly want that to be the case." "… the actual implementation of using guidelines changed
mid-session, and I wanted to capture that before I lost it. However, at the time, I didn't have function
calls to reference a function that could change underneath … there wasn't any idea of keeping multiple
implementations of one function … drawing from reference with guidelines, without guidelines,
understanding the results of that was a little bit non-intuitive … there's several threads happening,
and then you're in an experimental phase, you're trying to just answer this question, and this all gets
joined to the result that decides how I want to use a specific function … for the rest of the session."
"A way, in this sense, is actually a routine, not text … It's like returning functions from functions."
"Yes" to the order: P-98 (calls, for each, values as routines, owed values, Copy) → P-100 the work
queue → P-99 In any order → the library; parked: a routine calling itself, joins that reopen, shared
kept lists. Work from work: "Only the routine row (Recommended)"; "Yes, with '…' (Recommended)"; "Both,
depending"; "Edit Plan by hand (Recommended)".
Interpretation (ours): P-98 split into P-98 (calls), P-107 (for each), P-108 (kept lists, own lists,
values as routines); P-100 moved before P-99.
Led to: roadmap reordered.

## 2026-11-27 — One name, given more than once, is one list (relayed)
On whether two calls giving the same name are renamed or collected, the owner answered the recommendation
to collect: "Proceed with that".
Led to: P-98 and P-99 Done when amended.

## 2026-11-27 — A step owes what its insides give (relayed)
"there is a concern of routines having children that produce values and they aren't represented in the
parental context itself … if I laid down break it down and there's a sub that produces the value, if I
choose not to step into a function, those [values] need to be supplied somewhere, and it would have to be
supplied at the top level call, like hoisting up the return types of its children, because … any routine
[may depend] on the value that a sub [step] produces"
Led to: P-98 Done when amended (B-16 "A step owes what its insides give").

## 2026-11-27 — Functional style; recursion; a for each declares its own list (relayed)
"I'm more in style of a functional style approach … where you just kind of regenerate the list … so we
don't have to necessarily support write operations." "there has to be a way for something like research
question. If question produce question, research this question … It generates itself, like recursive
calls. That way the user doesn't ahead of time … have to state they're going to encounter these things,
but they're accounted for in the procedure." "maybe there's better UX to have a for each loop declare its
own values, like locally … I think it's design." "Make the amendments".
Led to: P-98 Done when amended (B-16).

## 2026-11-27 — "You were supposed to implement it all"
"I refreshed and I see no semblance of a work queue at all" — then: "You were supposed to implement it all"
Interpretation (ours): the owner expected every designed batch to be built, not one at a time with
stops. From here P-97 → P-98 → P-99 → P-100 are built back to back without stopping between them
(each still scouted, tested, audited and verified), reporting as each lands.
Led to: P-97 started.

## 2026-11-27 — A neutral name for now; Settings still says the old name
"A neutral placeholder, or you can offer a suggestion. Also, notice that the settings of the app still
reference Wonders, and that has to be updated."
Interpretation (ours): the visible name becomes the placeholder "Routines" until the owner names the app;
Settings' wording is cleared of the retired app's words; stored-data identifiers stay.
Led to: P-103 (13).

## 2026-11-27 — The library and the composer: go after P-98 (relayed)
"write a brief for the library and quick composer"; answers: "Go, after P-98 (Recommended)"; "Library and
Copy (Recommended)"; "Only when summoned (Recommended)"; "Conventions in, waits out (Recommended)".
Interpretation: see D-24 and B-17.
Led to: D-24; P-104, P-105, P-106.

## 2026-11-27 — Confirmed: a for each that applies a routine to each item
"Yes I was trying to write a for each and apply a function over them"
Interpretation (ours): real use needs P-98 (for each over a list, calling a routine per item) — the
first need for it from actual use rather than design.
Led to: proposal to build P-98 before P-97.

## 2026-11-27 — Screenshot: writing a for each as words in Add a step
(Screenshot, no words: Plan for "Improve my workout routine" — "List out my doubts · gives {concerns}";
the Add row being typed: "For each concern, @{concerns}researc…" with "{ } Insert" and "Add" beside it;
the third line of the field is cut off.)
Interpretation (ours): (1) for each is not built yet (P-98), so it was typed as words; (2) "@" was typed
— the convention in Notion, Slack and others is that @ opens a picker to insert a reference; (3) Insert
put "{concerns}" with no space before the next word; (4) the field clips its third line and the two
buttons squeeze it.
Led to: the conventions audit's fix batch (after P-102); P-98 for for each.

## 2026-11-27 — Lists change by being given again; a value can be a routine; finished parts take up again (relayed)
"Right now, I don't think there are any mutations or writes that steps perform, so the only way we keep
state is if a routine steps forward. And somehow, we can overwrite the value presented, so there might be
a step that asks to adjust the list. Like a review step." "The ability to supply a routine as an output
would make sense, so long as we have the capability to support that output as a function call and not
necessarily a string to be interpolated. We just have to be considerate about whether that routine is
given all the values it needs in the context of where it's called." "Yes, a finished part takes up again
when its list changes." (A step writing to the Pause note: withdrawn by the owner.)
Interpretation (the second session's, adopted): see B-16 "What P-98 and P-99 gain".
Led to: P-98 and P-99 Done when rewritten from B-16.

## 2026-11-27 — One exhaustive adversarial UI audit against established practice, after this batch
"At the end of the [batch], I want to perform one adversarial UI audit that tests the UI against
established practices on where typical navigation, buttons, controls, use of menus, dialogues, drawers,
context switching, … and other standard practices of how user journeys should be offered against the
final product. I want to ensure that we align the UI against best practices or traditional usage, maybe in
terms of iconography, menu items, etc., so that the UI is at least intuitive to the extent that a user can
reasonably infer what a button does, what to expect after clicking that button, dialogues, confirmations,
error states, all of that. This is an exhaustive list. Please leverage your own understanding of UI UX
best practices in this audit."
Interpretation (ours): after P-102 lands, a fresh auditor walks the built app screen by screen and state by
state against established conventions (navigation, controls, menus vs sheets vs dialogs, confirmations,
destructive actions, undo, empty / loading / error states, iconography, labels, feedback, focus,
accessibility), and reports ranked gaps; fixes then become a batch.
Led to: the audit, after P-102.

## 2026-11-27 — A called routine hands its results back; library copies are owned (relayed)
"Yes, a called routine can hand its results back to the caller. That's the idea. The library is a copy you
own. the next, and do a verification pass, and then do another broad survey for maybe additional other
methods we can employ beyond the tight core."
Interpretation (the second session's, adopted): a call returns what its call row gives; a routine taken
from a library is the person's own copy; an item put back on a kept list comes round in the next sitting.
Open: whether a finished part takes up again when another part adds to its list (P-99).
Led to: P-98 Done when amended.

## 2026-11-27 — Scope the tree view alongside P-99 (relayed)
"Scope the tree view alongside P-99 and tell the other session"
Interpretation (the second session's, adopted): no new screen — the runner's pull-up panel and a paused
routine's tile open a nested list of every part and where it stands; tapping a part switches to it; the
one stored addition is how a part ended (finished or stopped).
Led to: P-99 Done when amended.

## 2026-11-27 — The model, settled in the second session: B-16 as an amendment to P-98 and P-99
Relayed from the second session (verbatim there; the full quotes are in B-16's first section):
"I think the model is a bit off …"; "where does that get inserted?"; "What about a completely different
thread that requires its own processing?"; "being blocked by something is not explicit, but just a
consequence of the arrangement of the work itself … We need serialization between concurrent threads";
"[it] can compose itself up to arbitrarily complex procedures, where the user doesn't have to think.
They just have to trust the process"; "Is there a way to produce a routine such that those surprises are
accounted for, and they generate the next steps … I believe that concept is a 'for each.'"; "Yes, write it
up as the amendment"; "Go on the amendment, P-98 follows P-97 directly"; "threads can produce values
that can be little tasks that can be pushed in other threads, like inter-thread communication".
Interpretation (ours): order P-97 → P-98 → P-99 → P-100; B-16's additions live in P-98 and P-99; parts
never reach into each other — a kept list one level above both carries work from one to the other.
Led to: D-23 restated; P-98 and P-99 Done when amended.

## 2026-11-27 — "I think the model is a bit off" (relayed from the second session)
"I think the model is a bit off. A routine should contain threads that contextualize their own work. Open
items would represent a task on its own queue that we dequeue when we are ready. Or another model is that
the routine defines steps, generates steps in its place to represent future work. A routine can modify
itself if we're going to not maintain a stateful stack."
Interpretation (ours): B-16's open items held at the routine level are under revision; two alternatives
are being discussed in the second session (threads inside a routine with their own queues, or a routine
that generates future steps in place). B-16 is not ready to slice; P-97 waits for the outcome.
Led to: nothing yet.

## 2026-11-27 — Don't undo a Done; dismiss with ×
(Screenshot: home with the notice "Done with Quick Sketch · ↶ Undo" above + New.)
"You should not undo a 'Done' this is causing me to always return back because hitting the dismiss button
is somehow close enough to hit the undo. Also the button should be an x to dismiss not a return"
Interpretation (ours): finishing a run is final — its notice says "Done with <name>" with only a × to
dismiss; every notice gets a × at its right edge to dismiss; where a notice also offers Undo, Undo is a
separate labelled button placed apart from the ×.
Led to: P-102 (scope added).

## 2026-11-27 — The step menu: too many options, and ··· should open a menu, not a drawer
(Screenshot: the step sheet for "Draw to fit each region" — Change the words · Add a step after · Break it
down · Gives… · Make it a wait · Move up · Move down · Remove this step.)
"There are too many options here. 'Make it wait' is retired now. Move up and move down can be removed.
'Change the words' sounds awkward. And a slide drawer might not seem that intuitive. A (...) usually
brings up a menu not a drawer"
Interpretation (ours): every ··· opens a small anchored menu; the step's: Edit · Add a step after · Break it
down · Gives… · (divider) Remove; existing wait steps offer "Make it a step"; Move up / down stay only as
screen-reader and keyboard actions.
Led to: P-102.

## 2026-11-26 — From the second session ("product assessment and UX"), relayed; and the order confirmed here
Recorded from the other session's hand-over (the owner's words there):
- "create a friendly user experience in the composition of workflows represented as discrete algorithmic
  steps and a threading model … a discipline app where I can engage with and in good faith hold all
  context of what I want to do … without having to have the entire … vision in my head. I can define
  blockers for myself, … easily define steps to achieve those blockers, understand how those blockers fit
  into the goals I want to pursue … Ultimately, this is a context management app for productivity's sake,
  and the mental model of using threads and concurrency is just a way to distill lofty pursuits into
  small actionable steps that feel intuitive to follow."
- Since P-96: "Only testing the app". Lost when hopping: "The next concrete action" and "What I'd decided or
  made". Discipline as an outcome: "Staying oriented".
- "I drew this from my BA of productivity science … what if I always have reference to how to actually
  engage with an activity in order to draw the most learning and reflection from? … that can be
  generalized to any activity … routines that I run through and apply them where that seems fitting
  allows me to leverage my learnings and refine them over time."
- "a construct that's missing in order to make those [threads] legible and making the next steps a
  first-class citizen … routines can produce work and tasks that can be queued up in the context that it
  will spawn … a construct such as blocked by gives me a reason to understand why I'm drawing … goals
  represented by dependencies"; "Effectively, I'm trying to encode the idea of trust the process."
- Answers there: order "Use it a week, then B-16"; In any order "Both, items first"; giving work "By
  itself"; concrete outcomes "join it as part of the [thread]"; "don't use the literal term pursuit it
  was a working term, use an appropriate domain analogy".
Confirmed in this session: "I do want the work queue and let's not use pursuit as a domain term.
Otherwise proceed".
Interpretation (ours): order is P-101 → P-97 → a week of real use → B-16 slices 1–4 → P-98, P-99, P-100
(the cross-thread work queue kept). The word "pursuit" is not used outside quotes.
Led to: D-23 go; brief B-16 brought to main.

## 2026-11-26 — Deleting a step that gives a value
"Also, there is an edge case where if you delete a step that provides a value, any step that depends on it
would have to be revised, or there should be a fallback. Not sure the best way to go about that."
Interpretation (ours): both — Plan warns and names the readers before removing; afterwards the readers
fall back to asking when run and show as dashed "asks {x}" in Plan so they are visibly in need of revising.
Led to: P-101 (scope added).

## 2026-11-26 — Reset a run, and give a value you've already passed
"There should be a way to reset an ongoing thread or routine, especially if you edited it. So for
example, I was editing my drawing routine and it was paused while I edited it, and I can't really reset,
and I added values to it. So there's no way to supply that value where I was in the execution of that
routine, and there's no way to reset it."
Interpretation (ours): Start over (the whole run, or only the level you are in) with a confirm and Undo;
names given by steps already passed show as "not given yet" in the values row and can be given there.
Led to: P-101 (scope added).

## 2026-11-26 — Debugger-style moves; Pause reason optional
"A debugger style fits because of the model that we're following in terms of a call stack. And yes, a
pause reason should be optional. It's just there in order to capture any last thoughts, either the reason
for the exit or something else."
Interpretation (ours): the proposal in conversation is accepted: bottom row = Step in · Step out · Next
(Done only on the last press of the run); Pause and Plan leave/switch from the top line; Pause opens a
small sheet with an optional note; plus the home, notice, keyboard and value-readability fixes proposed.
Led to: P-101.

## 2026-11-26 — MyStack, the later entries (read in full from the published page)
The owner's page had many more entries than the published render showed (it loads lazily; read through
Notion's public page API). Verbatim where short, closely paraphrased where long:
- Adding a step: "I'm brought immediately to add another one, and it brings up the keyboard while
  simultaneously getting a notification that I added a step … very cluttered … I should only ever see the
  notification to show that, hey, you're done." "The notification banner doesn't go away when I interact
  with other controls." "Undo is persisting across screens noisily" (screenshot: "Removed … · Undo" on Plan).
- "The add box doesn't show the complete step when it's not fully added."
- The add loop "hidden underneath the more" menu; expected the Add row to add constructs where you add
  them, not insert-then-drag.
- Done "can exit out of the routine, or … out of a loop … confusing … a step out should be a debug move to
  abort early, and that should be co-located with Next … each button is a move throughout the routine, the
  tree, the loops."
- Enumerating observations: "for each of those things you listed, do this"; without the routine's roots in
  view it is hard to track "what value I am assessing, how I am assessing it, and where I'm at".
- Screenshot of the value field with the keyboard up: "The screen is getting very cluttered … a pop-up
  drawer or dialogue … especially for a one line entry like this."
- Tempting to support long-form text, but rather allow meta information about how I was working (e.g. a
  reference to a Notion document) "to ease the burden of remembering where and how I was working".
- Interpolation is intuitive once known, but "there's really no way to discover that feature".
- A routine could generate follow-up work from its outcome: "if I determine … I'm unsatisfied, I would want
  that work queued onto the context for follow-up … effectively a function generating a task on the queue
  with its own context."
- Breaking a step down drifted into writing questions; "a statement is an execution of work so it should
  really read as answer the question" … "unless the results determine how to proceed … I don't think the
  app should be supporting capture."
- The value sheet's "from <step>" loses context; "a quick button to see the call stack instead, and all the
  values in between … Same thing by read-by."
- Hoisting: a substep that gives a value the user never steps into leaves readers blocked; "any step with
  the substep is a function, and if that function is providing values, then so too must the parental
  context … hoisted up to the parent" — the outputs then describe how to implement the step.
- "The home button doesn't feel right at the bottom of the plan screen. I'd expected it in like a header."
- A minimised runner overlay for debugging routines while in the app.
- "I do think a pause with a reason would be helpful … a confirmation step … to park any thoughts …
  relevant to the time at which you are leaving a thread of work."
- "The fact that you can't resume from the home screen is bugging me when you're paused."
- "planning" status is confusing; two plan cards look different but lead to the same place; the home
  screen reordering after a pause is non-intuitive ("more akin to picking up where you left off when you
  close and open the app again"); the big Resume call to action is "jarring" — prefer a simple "last run"
  indicator.
- "Start" may be retired with the work queue: enqueue a task from each ongoing thread instead.
- Redundant nesting (a routine that only calls another) — an optimise / clean-up button.
Interpretation (ours): see the discussion in conversation; nothing decided yet.
Led to: discussion; next friction batch to be agreed.

## 2026-11-26 — Persona panel for blind spots, and the navigation buttons
"I want you to run through the user panels and see if there's any blind spots in terms of quality of life
adjustments and interpretation of the UI or UX of these user journeys that turn this batch. And let's
ensure that we also address the concern of the buttons being not quite co-located correctly when
navigating routines."
Interpretation (ours): one navigation scheme for every screen (top = context; bottom = the one filled
button; one row above = side doors, left leaves, right switches mode; the rest in the pull-up panel);
the panel's contradictions in the canvas fixed.
Led to: panel report .polish/product/panel-values-nav.md; P-96 contract amended; canvas updated.

## 2026-11-26 — Tags and A–Z on a My routines page
"Not sure if grouping is the right concept but maybe tags and alphabetical sorting might be good start
in a 'my routines' page"
Interpretation (ours): definitions leave home for a My routines page, sorted A–Z, with tags to filter;
home shows only what is in motion (Up next · Ongoing · Finishing, told apart by structure).
Led to: canvas row 8; roadmap P-97 to P-100.

## 2026-11-26 — Home mixes things of very different size
"There's still an open issue of the home screen being populated with a whole bunch of disparate types of
routines, each with various levels of complexity. Something as grandiose as becoming a better drawer
might be mixed with something like research a question. So a way of cleanly organizing that, or …
having some organization would be preferred."
Interpretation (ours): separate what is going from what is defined, and tell long-lived pursuits from
finite work by structure (does it have an end?) rather than by labels; let small work live inside a
pursuit when it belongs to one.
Led to: proposal in conversation (home in three parts; ongoing vs finishing inferred; Move into).

## 2026-11-26 — The queue holds leaves only, found depth-first
"So ensure that this is depth-first. For deeply nested concurrent routines, we only queue up only the
leafs."
Interpretation (ours): ↑ queue on anything — a routine, a call, a block, an In any order part — resolves
depth-first to the one step that would actually be done next, and only that leaf goes on the queue.
Led to: canvas updated; batch order unchanged.

## 2026-11-26 — The work queue and In any order
"So then how does the concept of a w[ork] queue collaborate with in any order blocks? Well, you'll be able
to [en]queue work from any outstanding threads that are running in a given routine."
Interpretation (ours): In any order starts threads; the work queue schedules them. Any running thread at
any depth can put its next step on the queue, shown with its path; running it resumes that thread in
place; finishing returns there, and the block joins when all its parts have returned.
Led to: answer in conversation; four batches proposed (values → calls and for each → In any order → the
work queue).

## 2026-11-26 — Are threads routines?
"So at that point, you could argue that those are concurrent tasks, each with their own context that has
to be resolved. And at that point, it's a different thread, and a thread has managed its own state. So
effectively, that would imply if they are threads, they should have their own stack for which there are
instructions, call functions, etc. And you can truly ever be done once that single thread returns,
right? And all of them return with whatever value they suppose they have. And so would it be wise then
to still consider them routines, or are threads just routines with how it's implemented in this app?"
Interpretation (ours): a routine is the definition (a function); a run is a thread (its own stack, place
and values) executing one. "In any order" starts one child run per part and joins when every one has
returned (or been stopped); each returns what it gives.
Led to: answer in conversation.

## 2026-11-26 — For each like a for loop; a new round re-asks; "asks"; concurrency inside a routine?
"For each starts from the step [that feeds it?] … it should just be treated like a regular for loop. And
a new round should reinitialize and reset any variables being declared within the routine, just as it
would a normal function. So if a particular step has an output, that output will change values … if I
have a simple routine that selects an activity or selects an option, every iteration of that loop will
prompt for a new activity … I have a basic routine for iteration over a product feature … I would select
a user journey, run through the loop, and when I circle back again, I'll select another one … I said
asks. Just because needs … sounds a little bit hard. And asks is in parallel with gives in terms of
terminology. Also, I noticed that the idea of concurrency isn't necessarily being modeled right now … in
becoming a better drawer … I could define a routine that sequentially walks me through study and
practice, but I think that's not … always the way I intuitively think about improving in a skill. I
choose which activity suits my mood and energy, and always running through a sequence of study,
practice … while it has its place as a discipline building activity. The idea of having different
contexts to switch between and choosing might be more intuitive for certain types of problems that are
asking for independent activities, but ultimately joined together to form a conclusion or decision …
Should multi-threading be serialized as a discipline, or should there be room for concurrency in a
routine?"
Interpretation (ours): decided — for each is a loop block (header + body), made from Add; each round
clears the values given inside it, so their steps ask again; the word is "asks". Open — concurrency
inside a routine; proposed: an "In any order" block whose parts keep their own places, are chosen by
mood, and join when finished, so a later step can read what they gave.
Led to: answer in conversation; canvas to be updated after the owner decides.

## 2026-11-26 — Design canvas is the baseline; no collisions between a routine's own values and its parent's
"These look more in line with what I expect, and they serve as a good baseline. There's an edge case …
there needs to be a way to ensure that there's no collision between inputs and outputs, because if a
routine depends on an input that it expects to generate itself, and if a parent context happens to
provide that input as well, I don't want the parental context to override or shadow the input of the
routine. Also, I noticed certain things in the Notion document weren't addressed. For example, the
issues with co-locating navigation buttons and the use of the add button steps to define constructs
rather than just steps alone."
(The two images on MyStack, now readable: a Plan where "For each reference photo, spend 3 minutes drawing
it out." was typed into Add a step, with the Undo notice over the rows; and home with the notice over the
New tile.)
Interpretation (ours): a name a routine gives is local to it — never injected, never overwrites the
parent's; needs are only names read and not given. Navigation sits together at the bottom of the runner
(the top line is context only; finishing early moves to the pull-up panel). Add offers constructs
(a routine, For each…, Repeat, Wait for…) beside typing a step. Notices never cover rows or tiles.
Led to: the design canvas updated (https://claude.ai/artifact/7nXp9jT4HYn5g7rFx4GSjP).

## 2026-11-26 — The for-each sheet made no sense; steps must call routines; journeys in a document, not PNGs
(Screenshot of mock-up frame 19, the "For each…" sheet: "in [photos | subject] · each [photo] · For each
photo in photos · Close".) "This above screen makes no sense to me. I wasn't sure what I was looking at.
Also, blocks and steps should be able to reference other routines as well. Otherwise, it's going to get
very verbose. So, for example, if I have a sketch routine I want to … use, I should be able to reference
it here. Just as any thread would allow, statements or function calls. Also, these PNG mockups are low
resolution. I really can't see anything. It might be best to just output the specific journeys in a
design document rather than these PNGs and specific to the feature under development."
Interpretation (ours): the for-each sheet becomes a list of ready-made sentences; adding a routine as a
step in Plan (a call, with its needs filled from names above) joins P-97; mock-ups are now written
journeys with text screens.
Led to: B-15 (values, routines inside routines and for each: the journeys).

## 2026-11-26 — For each: one notation, the type inferred, correctness enforced by structure
(After sharing a routine "Drawing practice": Select the subject matter · Find three reference photos ·
For each reference photo, spend 3 minutes drawing it out · Repeat from here · Rank your drawings ·
Justify your rankings and pick one point of improvement · For each of the three drawings, perform the
same sketch, but focus on that one point of improvement.)
"So what are your opinions on the enumeration feature? I think that's really necessary because it holds
context that would be hard to keep track of otherwise." Then: "We can use one notation for variables and
just have the type be inferred. So any value that's entered in commas might be interpreted as a list where
it's needed. Otherwise, it's going to be a literal string with commas … if a for each is being used, it
expects the input value to be of a comma separated list or something, but we should ensure that there's
really no way to make that wrong … we have to structurally enforce correctness, or else we're going to get
into an issue of routines being actual programming constructs and failing type safety."
Interpretation (ours): every value is a list of text items (one item is the common case); a for-each
reader makes its giving field a list editor (one row per item), so no parsing can go wrong; a plain reader
shows the items joined; Plan only offers names that exist. No type can fail.
Led to: P-96 mock-ups, final redraw (with for-each).

## 2026-11-26 — Values pass into routines by name (provide / inject); more friction from MyStack
On the scope question: "One sounds like passing in values to functions, which makes sense … if I'm
practicing drawing, and I have a thread ongoing that's making me work with different types of subject
matter, and then later on in that same thread, I want to queue up practicing my studies … whatever I
declared within that thread, the subject matter … can be passed into the routine without having that be
specified, assuming that they accept input … routines that have input parameters … accept them from their
parental context, or it's inferred and linked automatically, like provides, injects sort of pattern. So
any routine that requires a feature, I can slot it in at any point in any ongoing thread. Redraw those 5
frames, but only after you pull in the recent changes to the Notion page … They have other concerns to be
batched."
New items on the MyStack page (two images on the page could not be loaded here):
6. "The quote 'nothing running' doesn't seem to be indicating anything because there's no corresponding
   component that looks like it is running something … so that could be removed."
7. "The 'I'm going to' search bar feels out of place. Because I haven't really need[ed] to use it once so
   far the activities themselves are few enough … or just use a new button so there's a bit of a cold
   start issue with that."
8. "The Home and Done buttons are almost synonymous. Home is just a quick pause, while Pause is a pause
   with access to context, and that's confusing because the Home view is just another view on resumable
   routines or contexts … It seems like we can strip it out for clarity."
9. "When done with a sequence or routine, it goes to the plan step, and I'm not sure if that's intuitive
   because being done is finality, and planning isn't finality."
Interpretation (ours): a routine's unset names are its parameters, injected by name from whatever runs it
(provide / inject), shown at the call. Home loses "Nothing running" and the prompt; the runner keeps one
way out (Pause → home); finishing the last step ends the run instead of opening Plan.
Led to: P-96 mock-ups, second round (five frames redrawn plus the new concerns).

## 2026-11-26 — Go on values: a step's output, not an input
"I think I need the values because I'm running into a workflow where the first step is to select
something, and it really doesn't make sense to have the input define the selection, because it's an
output of the step, not an input into the step."
Interpretation (ours): go on B-14 slice 1, led by step outputs: "Select a feature → {feature}" asked on
the note when the step is done, read by later steps; shown on the way back in.
Led to: D-22 go on slice 1 → P-96

## 2026-11-25 — Friction list (the owner's MyStack page, published in Notion)
1. "When I opened the app, I was resumed from where I left off. I was confused because I don't remember
   the context …" (recorded above; with a screenshot of Plan for "test out wonderment").
2. "Creating a new stack is ambiguous because it shares the same entry as 'I am going to'."
3. "The undo is very noisy. Why would I want to undo an execution of a stack"
4. "Reorder should not be hidden in the (…)"
5. "No way to unpause when you click 'home'"
Interpretation (ours): 2–5 are interface fixes (Light tier) that the freeze allows because they block a
fair trial; 1 is B-14 slice 1 (values, Full tier).
Led to: a friction batch proposed (P-95).

## 2026-11-25 — Waiting should be inferred from a value that hasn't come yet
"In embracing the concurrency model, what implications are there in terms of quality of life adjustments
we can make in this batch? For example, we have the [waiting] construct, which I haven't been using so
far. And it seems like pause and reason seems to be doing the same thing. However, it's because [waiting]
itself is unintuitive to use. So I'm wondering if we can instead … repackage it or if two steps, if one
step depends on another and that step is waiting for a value, then that could be inferred rather than
made explicit, right?"
Interpretation (ours): the explicit Wait step goes; a step's value can be "not yet" (a future), and a
thread is waiting only when it reaches a step that reads a value that hasn't come — async/await. Steps
that don't need it go on. Pause stops being a second way to say "waiting".
Led to: B-14 slice 1 amended (values that come later; waiting inferred).

## 2026-11-25 — An output needs a purpose
"I'm not sure what came of it has to be explicitly mentioned, because the routine's function names should
relatively encode what that is. Like practicing gesture drawings, there's nothing to come out of it
besides an intuitive feeling of progression. And to the extent that we don't really depend on that output
to make other decisions, such as if there is a step that accepts that output of feeling and has a
decision tree of like, how do you feel, good or bad, and you click bad, maybe it'll work you through a
reflection workflow. I see the value in having the output … but there has to be a reason. There has to be
a purpose for that outcome."
Interpretation (ours): no "What came of it?" prompt; the name carries the intent; a value exists only when
something later uses it — a step's words, or (later) a choice that leads into another routine.
Led to: B-14 amended.

## 2026-11-25 — Context first, not routine first; the UI may be a tree
"Yes, so I think the idea of context is the important thing here. And so we're not routine first, we're
context first, hence context management. So the ability to manage state has to feel seamless, intuitive,
and instrumented enough for me to always be able to resume where I picked off and quickly start myself
back up with minimal effort or friction in trying to remember where I was. So effectively, the UI might
have to look like a tree, or it might have to resemble a tree. Because if we have one main thread, and
there's a lot of sub-threads, or goals, effectively, and each of the goals have their own sub-threads, and
those sub-threads might have their own sub-threads, it needs to make intuitive sense, the ability to
[en]queue tasks from these threads, and finding the depth-first item to push up, without losing the
context of that item either."
Interpretation (ours): the structured-concurrency model is confirmed. The product is context first;
routines are a tool. The screen is a tree of threads; enqueuing a thread pushes its depth-first next
item, and that item always carries its path and values.
Led to: brief B-14 (context first), replacing B-13.

## 2026-11-25 — Not named concepts: a main thread scheduling concurrent tasks that call functions
"These aren't supposed to be actual name[d] concepts, but just a description of what I'm trying to aim
for. In theory, you can model all of this as just one function that I run always and continuously, but
the way in which I access different parts of the function as async concepts is what I'm struggling with
… Humongous applications have a main thread … a main function … the context for everything else. In
much the same way, the main function here is a way of managing all these different sub-functions or
sub-threads in a way that feels intuitive. Hence the word queue … they don't necessarily have to be named
concepts and have a specific entity … but there's a way of leveraging functional thinking … that makes
the model easy to reason about. So I'm trying to go off the model of concurrency, where you can context
switch between independent tasks. Each of those tasks have their own context, their own state, and they
often reference functions, which are repeatable instructions that can be reused anywhere."
Interpretation (ours): the known domain is structured concurrency — a main thread with a run queue,
tasks that each keep their own stack and values and may own child tasks, and functions (routines) any
task can call. "Pursuit", "stack", "queue" are descriptions, not nouns for the screen.
Led to: the model restated in those terms in conversation.

## 2026-11-25 — A routine is a function; a pursuit holds the goal; the work queue runs across pursuits
"I have a stack of work towards the pursuit of becoming a better drawer, right? And in that stack, I
might have a practice drawing loop in one thread. In another thread, I might do a study color theory
loop. In the work queue, I can choose to push any work from those independent threads onto the work
queue, and it counts as popping them off the stack when they're done. So this way, the work queue … allows
me to work asynchronously across different pursuits without having to manage them directly through the
stack interface or the routine interface … Right now, everything's routine, and there's no sense of
completion or progress because routines are never done … Because nothing really in the app represents a
pursuit or goal right now … there's no externalization of where my goal is or what I'm pursuing. Because
that depends on me always planning out and revising the routine itself. But the routine, it should be
relatively static in terms of the goal of the outcome it tries to achieve, right? It's a function. Input,
output are what we care about, and the implementation doesn't really matter. But if the output is always
changing underneath, then the routine is serving two different functions towards that user journey."
Interpretation (ours): three things — the routine (a static function: inputs → outcome), the pursuit (the
goal and its open work, which changes; items pop off when done — that is progress), and the work queue
(the order you run things in, across pursuits; finishing a queued item pops it from its pursuit).
Led to: model confirmed in conversation; build order proposed (blanks → pursuits → work queue).

## 2026-11-25 — Friction 2: no way to line up work across routines (a work queue)
"If I want to queue up work and target specific … frames from different stacks, like plan my day sort of
thing, there's no intuitive way to do that. I have to just run the routine, progress, close it, pick
something else … Whereas if I had something like a queue, a work queue, I can just load up … each stack
in order, run through them until I feel done, and then move on to the next in the order that I kind of
planned to. The offloading here is remembering the ways in which I wanted to go about doing something
rather than trying to … vibe it out. I believe this harkens back to the idea like a session thread, where
home is like the main thread. But if I had a work queue, I can choose how much I want to progress in any
of them, predefined, and just execute when I'm ready. And also, this allows me the ability to [en]queue
different things I want to do, … one-off tasks that don't really have a place as a routine. In a way, it
would be able to pop routines off the stack in any order that I wish and offload the execution order of
that for later so it's a way of … organizing myself."
Interpretation (ours): the flat queue of P-94 (halted for the recursive redesign), wanted as a
quality-of-life fix, not a new model: line up routines and one-offs, run each until you feel done, move
to the next; an entry may point at a specific part of a routine. Our earlier remark that "a queue is
wrong for you" was mistaken.
Led to: friction batch (with friction 1, blanks); P-94 to be reopened as the flat queue.

## 2026-11-25 — Freeze on major features; friction 1: resuming gave back a place with no context
(Screenshot: Plan for "test out wonderment" — Select a feature to test · Vibe check [Feel UI · Answer if
the user goal felt intuitive] · Write down concerns.)
"I will freeze on major features, but there is friction I've encounter[ed] that make[s] it hard to give a
faithful assessment on the product capability. Here's 1: When I opened the app, I was resumed from where
I left off. I was confused because I don't remember the context. The context is the specific feature I
was looking at. There was no[thing to] tell what it was, and I didn't note it, so resuming back to where
I was didn't succeed in offloading context because it was never loaded to begin with. This was in line
with parameters defining inputs so that it makes sense what's going on."
Interpretation (ours): a step like "Select a feature to test" produces an answer that the later steps
depend on; the app keeps the place but not the answer, so the place means nothing on return. The owner
accepts the pause on major features; friction fixes that block a fair trial are wanted. More to come
("Here's 1").
Led to: friction list being collected; a fix proposed (an answer kept on a step, shown on return).

## 2026-11-25 — The pain point: structure over creative impulses, without losing my place
"Ultimately, I'm trying to pursue structure over my creative impulses in a way that makes sense. I always
struggled with trying to give myself a plan while also giving myself space for creative diverge[nce]. And
a lot of the time, I'm always hopping back and forth between my pursuits, and I kind of lose my place and
sense of where I am. And I just thought maybe functional style thinking could help bridge the gap between
structure and creativity. For example, I have interest in learning theory, and a lot of the concepts I
always wanted to encode is as a process that I could always run through and apply in other places. Hence
why the idea of routines. Like if I wanted to apply a learning theory concept to my ability to practice a
gesture drawing, I could always reference it in the app, apply it in the context in which I'm practicing a
drawing, say like a reflection routine that I could pull in … I have creative pursuits in music
production. I want to create a game. I want to make apparel. And while it's true that typically good
results come from focusing on one thing at a time, I just never feel like I could do that without over
compromising on my energy and mood. And the ability to externalize my thoughts and how I do things in a
way that I can follow that matches my intuition. Makes my intuition concrete is a feeling I'm chasing. And
making sure that I'm always keeping myself accountable for where I am in all of these different avenues …
not necessarily for a greater goal, but out of interest for the thing and maybe some greater aspiration.
Hence why the step-by-step process allows me to always keep myself in check of where I am, but always have
the greater context of why I'm working in picture and allow that picture to always change underneath me
as I see fit without having to necessarily feel like I overcommitted … I don't know if it's a frustration
with the UI or UX or my lack of clarity on the pain point I'm trying to absolve. Because I just feel like
I [want to] feel like I'm progressing and … make it easier to keep track of myself."
Interpretation (ours): the person hops between several creative pursuits by mood and loses their place;
they want (1) their place and the why held for every pursuit, with hopping treated as normal, (2) plans
that can change without feeling like broken commitments, and (3) portable methods — thinking processes
(e.g. a reflection method from learning theory) written once and pulled into any pursuit. Routines are
methods, not chore recipes. The real pursuits named: drawing, music production, a game, apparel,
learning theory.
Led to: nothing built; a pause on new briefs proposed (the adversarial assessment,
`.polish/product/assessment-adversarial-2026-11-25.md`), pending the owner.

## 2026-11-25 — Long-term goals, reps versus recipes, and leaning into the unknown
"I'm not getting a strong impression how long-term goals are cleanly represented … routines would define
a way in which a particular task can be done and represented as prompts, but that doesn't cleanly
translate into a routine in the sense that something you just do over and over again to build reps. And
how is that represented in a stack versus the active session? … work that has to be done over and over
again, not necessarily work that has to be done in a specific way and that's templated — that's the
distinction that I'm not really grabbing … how do we afford the user the ability to say, hey, I don't
want this to be a part of my stack anymore in … whatever context I'm in … and I pop it off and I can no
longer reference it … the idea is that I can pick up the app, resume from where I left off, and continue
my work as it's synced to what I'm currently doing … not everything needs to be synced to this app. So
scoping or making the app more favorable for certain types of work … might be the move … there might
just be several product designs going on at the same time … the context management was informed by an
intuition for deliberate practice, but applied in a lifestyle sense … you usually don't do that for very
menial tasks like doing laundry or cooking, since it would be very inconvenient to use an app. But for
more creative and intellectual work or pursuits that are beyond just scope of your usual routines, I see
the strength in that. Because you don't know how to go about it, and the whole point of [planning] the
next step is to make it easy and attainable for you. So leaning into the unknown versus actual routines
that you already know how to do is something I want to lean into."
Interpretation (ours): three products were tangled — a runbook for known procedures, a context manager,
and deliberate practice. The owner leans to pursuits whose path is unknown; "again and again" (reps) and
"in a specific way" (a recipe) are two separate properties; known chores are out of scope.
Led to: a reframing proposed in conversation; B-13 to be redrafted after the owner answers.

## 2026-11-25 — Everything in a stack is a task; we strive to push things off
"Each stack holds its own state, that state is mutable and reflects your current goals at the time. Each
stack can reference routines or just have their own one-off tasks. All routines are tasks. They're just
named and templated. They're just instances of a template, which we call the routine, but everything in a
stack is a task. They're just a meaningful amount of work that can be done and represented in text. Or
you can push a reference to another stack to hold state within state. So if there are sub goals,
effectively, you can always work on them as needed, as desired, by switching between your current focus.
And the idea is that we're always trying to strive to push things off the stack and only push work where
we think we need to … Otherwise, there's no sense of progress. The idea is that I don't have to remember
or hold where I am in my journeys and efforts because I hold enough context within the app to tell me,
oh, that's what I'm working on and to what end. And I can define and reshape the necessary work towards
whatever level feels comfortable, that level representing a stack. Again, these are just the terms and
concepts I'm using. You can take what I'm saying and transform them into something polished or map them
into a known domain because I'm not beholden to this metaphor."
Interpretation (ours): one entity, the task; a task that holds tasks is what the owner calls a stack; a
routine is a template that stamps out a task. Progress is things leaving. The known domain is the
outliner you can zoom into, with a cursor for where you are, plus templates.
Led to: B-13 rewritten (second draft)

## 2026-11-25 — A routine holds no state; a stack does
"So I think I'm trying to make concrete how to manage context and stacks … A routine is an execution, but
it holds no state. Well, a stack inherently holds state. So if I wanted to hold a stack for how to
navigate my desire to be a better drawer, that will ultimately change in how it's formed … one day I'll
want to practice hands, another day I'll want to practice full body, learn color theory … a routine can't
necessarily capture that, because that's constant. A routine doesn't change. It's something to be
executed over and over again. But … practicing hands might be its own routine, but I can [queue] that
work into the [drawing] stack whenever I want to. And then I can use that whole stack as one component of
a greater thread to represent one meaningful chunk of my day. So I can context switch back and forth
while not having to worry about keeping track of everything … every time I resume control of the practice
drawing stack … I know where I'm at located and what it means in the greater scheme of things, because
the stack itself represents the state of that. It offloads holding that in my head. So what entities and
constructs we need is … really what I'm trying to get at … reference other stacks as I need to, slot them
in where I want to define a routine that might reference them, or just be a part of the main thread as
just staples that I execute in sequence … run through a traditional user journey in a to-do app or any
other goal-making app and write the analog in this app and see where the strengths and weaknesses are. In
the UI and UX."
Interpretation (ours): two entities — a routine (a stateless recipe) and a stack (a stateful place that
evolves); stacks nest and hold routines, one-offs and other stacks; home is the main stack.
Led to: brief B-13 (draft, D-21)

## 2026-11-25 — The queue is recursive: every item is its own main thread
"So there has to be some recursiveness to it, right? Everything in the queue can operate its own main
thread in a sense, where you can queue up stuff into it, run routines, reset at that level. So the work
type of workflow is that and I can always context switch between the things I want to do and hold and
offload what comes next, and that way I can iterate and define my next steps as I work at the level that
seems appropriate for me, while still managing the context for other outgoing tasks at hand. And you can
keep doing this at any level."
Interpretation (ours): home's queue is not a special list; it is the top level of the same thing every
item is. Any item can be opened into its own queue: push work into it, run it, switch between its items,
reset it — at any depth. P-94's flat queue was halted before landing to fit this.
Led to: P-94 (halted, redesign)

## 2026-11-25 — One-off tasks in the queue
"Also allow for one-off tasks. So I can just push things that aren't named ro[u]tines"
Interpretation (ours): "+ Add to the queue" with words that match no routine offers first "Add: <words>"
(a one-off: one unnamed step, queued at the bottom; Return's default) and then "New routine: <words>".
A one-off runs as a one-step item, leaves the queue when done, never shows in Your routines; Plan on it
can add steps; naming it there keeps it as a routine.
Led to: P-94 (scope added)

## 2026-11-25 — "Implement" the standing queue
Asked "What do you propose?", then answered the proposal with: "Implement".
The proposal accepted: Home is one standing queue (owner, 2026-11-25: "I'm going to queue up work and run it"; proposal
accepted with "Implement"). One queue, always there, no session start or end, nothing expires. The top
row is what is running or next, with the one filled button (Resume / Start <name>); below, up next in
order; a wait keeps its place and reads "waiting for …". "+ Add to the queue" at the bottom searches
routines or makes a new one and adds it at the bottom. Done on the top item brings up the next; nothing
starts by itself. Pause keeps the item where it is; tapping another row brings it to the top and the one
you left sits directly under it. Taking an item off asks first and has Undo; the routine stays. No name
on the queue. The tile grid becomes "Your routines", reached from the add row. Plan is unchanged; a
queued routine not yet started has Plan on its menu. Move up / Move down on a row's menu (no drag).
Existing paused runs enter the queue, most recent first; the retired app's data is untouched.
Led to: D-20 go → P-94

## 2026-11-25 — Home doesn't say what's going on; it should be "queue up work and run it"
(Voice-typed; transcribed as said.) "The user loop needs to be refined because it's not really obvious
what's going on [on the] home screen[;] it just start[s] a whole bunch of things[.] that's because the
expectation of running through a series of threads concurrent[ly is not] really [clear / is] imperative.
It's just a search box so there has to be some I guess composer[,] some guidance thing[:] I'm going to
queue up work and run it."
Interpretation (ours): the same concern as the "working session" note, now from use. Home reads as a grid
of separate things to start plus a search box; nothing composes them into one line of work. The owner
wants a composer: line up what you are going to do (a queue / a session), then run it in order, with
other threads loaded to switch to. Open: whether the queue is the session itself, what home shows when
it is empty, and what is left when it ends.
Led to: nothing yet — questions asked first; then a brief (B-13).

## 2026-11-25 — Plan on a phone: steps overflow, and the add icon
(Screenshot from an iPhone: Plan for "clean the car", keyboard up; the Undo notice "Added “Car wash”"
and Start sit over the list, so the step just added and the row being typed in are hidden.)
"When writing steps there is eventual overflow, and when adding a new step, the icon isn't really
intuitive. I expected a + or 'add new step' placeholder, or something equivalent"
Interpretation: with the keyboard up, the notice and the filled button keep their place above the
keyboard and squeeze the list, so after a few steps the step you just added and the field you are typing
in fall out of view. The add row's ↵ (return) mark reads as "enter", not "add"; list apps mark the add
row with + and a placeholder (Reminders "New Reminder", Todoist "Add task", Things "New To-Do").
Led to: P-93

## 2026-11-25 — Build the Plan surface; and a concern: is it a session you push work onto?
"Build the [Plan] surface now. We're going to iterate one at a time while we refine the other concerns
that I have. … And another concern that I had, and maybe this is just a drift in how I understand what I
want in this product, is that the app is ultimately a context manager, and that manager ultimately needs
work queued into it. So the user loop may just be, well, you define ahead of time what … stacks you want
to tackle in one concurrent context, and you execute upon that. So there's not really a start [a] stack.
It's more so that you're starting a working session of your own stack, and you push work to your own
stack, representative of what you want to work on at the moment. And over time, those routines can be
defined and iterated upon. But ultimately, the runner itself isn't really the execution of a particular
routine. It's the execution of one main thread … onto which we queue up the other routines, or push …
other routines. Again … I think that's a drift, but the idea of starting a routine and searching doesn't
offer that architecture where you can have multiple concurrent threads that you can [context] switch
back and forth to, assuming they're loaded."
*Interpretation:* decided — D-19: go on the Plan surface (B-12's `v1`, `v2`, `v4`, `v5`, `v8` with the
re-audit's fixes), one step at a time. A concern, not a decision: the unit you open may be a **working
session** — one main thread you push routines onto and run — rather than "start a routine found by
search"; several such threads loaded at once, switched between. To be explored separately; the Plan
surface should not make it harder.

## 2026-11-25 — Plan edits change the routine; routines must be declarable in context
On B-12's open questions: "proceed with [your defaults] for your open questions. And yes, a change made
in a plan mid-run alters the routine. That being said, it's not intuitive how routines are declared in
the context, because the model is that you have one main thread, the most foundational layer, and that
you effectively push work on top of that in plan mode and then execute sequentially. But there's no
routine definition yet. There's no way right now to declare that until you're done with a current run."
*Interpretation:* decided — a change made in Plan mid-run changes the routine. The other open questions
take the designer's defaults (the edge moves you into Plan; "I'm going to / With / Steps"; Plan told
apart by shape and words; "Plan" in, "Resume" out). New concern — while planning mid-run you must be able
to declare a routine right there: name a group of steps as a routine, and say it repeats, without ending
the run first. Led to: B-12 second draft (frames v1–v8).

## 2026-11-25 — Start the draft, with your own insight from other apps
"Start the draft and propose your own insight into the problem based on how other apps tackle this sort
of blurred workflow."
Led to: `docs/product/briefs/B-12-plan-and-run.md` (D-19, proposed) and first-draft frames in
`.polish/product/b12-shots/`; a UI audit of the frames.

## 2026-11-25 — Plan, execute, plan, execute — and the two must look different
"there is definitely room to add steps mid-session, but there has to be a clear delineation between
composing and running to make that seamless. Right now, when you create a next step, it looks exactly
like the UI from running, and so the only thing you can tell that it's the next step is the blank
prompt, not necessarily something about the UI telling you like, hey, … take a break, consider the next
moves, plan, and then execute … Plan, execute, plan, execute, plan, execute is the type of context
switching I had in mind, but the app blurs the two because they look very similar … So definitely
mid-run planning is a thing, but the app has to make that apparent … Because if I left the app with the
next step, I couldn't tell if I was [done] drafting or if that was actually part of the workflow, because
they looked exactly the same. But if I had the composer view, it was like, oh, I remember now. I was
trying to refine this procedure … the app clearly conveys the information about what you were doing."
*Interpretation (usage signal):* planning mid-run stays. What is wrong is that planning and running
share one look. They are two modes that alternate — plan, execute, plan, execute — and each must be
unmistakable at a glance, including when you come back to the app: a composer view when you were
planning, the runner when you were doing. This refines, not reverses, B-11 §9c.

## 2026-11-25 — First real use, continued: composing is not running; "done" means two things
Answering where the split happened and what felt right: "the split happened when I started breaking
down the steps, because the breakdown sequence didn't feel like I was adding a next step to anything …
there was a composer that defined the [sequence] of steps for that routine. But it didn't feel like I
was adding a next step. I feel like I was drafting. It felt like planning rather than actually doing …
And also … there wasn't a real definition of done, because my mind was like, okay, drafting up the
proposal and then running through it. So done didn't feel like I was done with the work … It felt like
I was either done drafting or I was done working on the thing, which is confusing because done feels
like two different things depending on what I was doing with the app at the time. … when I opened the
app, I guess I expected some form of like, hey, do you want to create a stack to define the work you
want to do? … but that wasn't offered, and I had to use my prior knowledge of how the app works to use
the search bar to elicit the create stack. So that was not intuitive … And when I clicked on, okay,
create a new stack, then I would … work through the goal or outcome I was trying to achieve, the output,
and consider what my inputs are, and then define a series of steps to transform my inputs to get to the
desired output, as like a structured way of guiding myself to thinking about the problem at hand. But I
had to work with just the prompt … and not … a little bit of scaffolding to tell me, hey, what … feeling
or goal you're trying to achieve, and walk me through a nice way of leveraging the app to promote that.
And when I was creating the stack, it felt like I was creating it, not running it … I never made a loop
in the editor because there was no way to actually drag it. And for the input, that was me using prior
knowledge … I expected it to be there … But because my head was stuck between editing and running,
there wasn't a clear way of … entering the use of that feature, because there was no proposal or
staging or a drafting stage to actually make that intuitive, because I jumped straight into the runner
and not the composer. And the composer is where you would actually define the parameters, not
necessarily while you're mid-run. Because the parameters define the execution[; the execution] doesn't
define the parameters."
*Interpretation (usage signal):* composing and running are two different activities and the app blurs
them. Breaking a step down and adding "the next step" are composing, and felt like planning inside the
runner. "Done" was ambiguous between done drafting and done working. Opening the app did not offer to
create something — the prompt had to be known. Expected: a composing stage with a little scaffolding
(the outcome or feeling wanted → the inputs → the steps that turn one into the other), where inputs and
loops are defined, and then running. The loop divider could not be moved (expected to drag). This cuts
against B-11 §9c's "the structure is written by running it" as built; the owner still liked being made
to think about how they do the thing. Concerns, still being batched; no redesign decided.

## 2026-11-25 — First real use: running and editing pull against each other
The owner used the first slice on a phone (a routine "test out wonderment": Select a feature to test ·
Vibe check · Write down concerns; screenshot of the plain editor). Said as concerns to batch, not a
proposal: "I tried the approach of doing it as I go, and I noticed that [it] force[d] me to think a lot
about how I actually do it, which I kind of liked because I didn't really have a process for iterating
on a tool … what I notice is that the editing and running don't feel intuitive in the sense that the
next step didn't seem like the next step … it feels like me drafting it rather than [executing it] … my
mind was split … between two modes of thought, like OK what do I do next versus how do I represent this
in the app in a way that [captures] my thoughts, and … that's no longer … doing the work, that's …
working with the app, and that's a lot of [context switching] back-and-forth. So there has to be like a
stage where I am editing and then running, [or] make those [contexts] very apparent … so my mind is just
worried about what's the next step rather than editing. And … the edit features for like defining loops
… [can't] happen mid run … I can't swap back and … revise my procedure because I have to click done and
then edit the settings, which is not intuitive. There's no mode … no strong context switching for that,
'cause in my head it's like, well, this is definitely gonna be a loop: select the feature, vibe check it,
write my concerns, keep doing that over and over … until I feel like it's good enough. And also … it
wasn't obvious … how to actually parameterize … the routine so I can select the feature [and] apply [it]
to different features too. And this is not a proposal, this is just me voicing my concerns in a way where
I can address each concern individually … right now the friction is the context switching that stood out
for me in this first one, but I do like the fact that [it] forces [me] to really think about how I go
about doing things."
*Interpretation (usage signal, the first):* (1) adding the next step while running feels like drafting,
not doing — two modes of thought compete; (2) there is no clear line between editing and running, and
there should be either separate stages or an unmistakable context; (3) structure such as a loop cannot
be set mid-run — you must leave the run to reach the editor; (4) how to give a routine an input was not
discoverable (blanks are not built yet); (5) liked: being made to think about how you actually do the
thing. Not a proposal; concerns to be taken one at a time before any redesign.

## 2026-11-25 — Remove the old app entirely
Told the new home keeps a "Back to Wanderment" button to the old home at `/old`: "No, just please get
rid of the old app entirely. Retired."
*Interpretation:* decided — the old app's screens, routes and its way back are removed, not kept at an
address. Read as removing the app, NOT the person's data: everything logged stays in storage and in
export, to surface in Looking back later (deleting data is not undoable and was not asked for). Export
and import must stay reachable. Led to: P-89.

## 2026-11-24 — "It is still showing the old app": open the new one by default
After the first slice shipped: "It is still showing the old app and refreshing doesn't do anything."
Told it lives at `/go` beside the old home, and asked whether to make it what opens by default: "Yes,
please make it so the app just opens [by default on] the phone."
*Interpretation:* decided — the app opens on the new home; the old home moves to its own address. This
brings forward part of the last slice (the old app stops being the front door) without deleting
anything. Led to: P-88.

## 2026-11-24 — Keep going; the name can wait; flow state is the aim
"Let's not worry about the name for now. Let's just continue on making the slices and your proposals and
ensuring that this app really hones in on its ability to be a context management app for your work.
Eventually, I really want to get into a position where this app can help you reach flow state, where in
interacting with it, you can develop a discipline that allows you to do, iterate, and proceed forward.
And I'll do that once I get my reps in with this app to see its strengths, at least for a person of my
profile."
*Interpretation:* the name is deferred. Go on with the slices and with the designer's proposals: the
edge of a goal keeps extending (the runner asks for the next small step), and leaving a run shows what
it changed, with Keep. The long aim is flow — do, iterate, proceed — to be judged by the owner's own use.
"Next" stays as the word (the Step in / Step over vocabulary was not taken up).

## 2026-11-24 — This is a different app; Wanderment is retired; a new name
On whether this is its own app: "Oh no, this is completely different from [Wanderment]. There are some
ideas from [Wanderment] that I still value, like the ability to draw links between related activities so
you can better decide how you spend your time based on shared interest … based on overlap. So, but I
would think something like that has no place in this iteration of the app, so I'll set it aside. I think
[Wanderment] needs to be distilled into something more strong in one of its dimensions, because the
visual metaphor started becoming a bit cumbersome to design around. It still makes sense for the feature
set. That said, there might be some aspects of [Wanderment] that still have place in this iteration of
the app, but other than that, no, it's retired. I would have to rename this repo to something a bit more
fitting. I have some candidate names. Like 'rithm' or StackEZ."
*Interpretation:* decided — the app being built replaces Wanderment in this repository; Wanderment as it
was is retired, its idea of linking related activities by overlap set aside for a possible later,
separate distillation. The repository and app will be renamed; candidates "rithm" and "StackEZ". Not
yet decided: the name.

## 2026-11-24 — Who it is for: a niche, and that's fine
Asked "who is it for besides you?": "So right now it's for me, but I do recognize that these apps are
very niche, and that's okay. One aspiration I have is to develop a portfolio of niche apps that cater
to a very specific type of person, not necessarily a general audience. And I would argue that
procedurally … algorithmic thinking might be suitable for a few who would like that sort of offload to
their mind, so they can iterate and refine processes as they see fit. And ultimately work on bigger and
lofty things without being bogged down by what they have to do next, when you can just clearly define
the next step and always be aware of the broader context of it."
*Interpretation:* the audience is people who think procedurally and want "what's next" offloaded while
keeping the wider context in view. The concept count and the async half are features for them, not
costs. Raised back: whether this should be its own app in that portfolio, leaving today's Wanderment
(the mood-and-energy log) as it is — to decide before the first visible slice.

## 2026-11-24 — After the convergence: fewer verbs, tiles on home, and go
"So I accept that proposal, and when clicking home, just ensure there is a confirmation prompt. Are you
sure you want to stop? And I guess if we're removing switch to be resume, that means pausing naturally
brings up a switch context, if available. We can address the open items with reasonable defaults. Just
[make sure] that the note fits on the screen. Nice and tidy. And the step menu can be 9 rows long. Just
allow for easy scrolling up and down. One little provision I want to make is that the keep it out
phrasing doesn't seem very intuitive in hindsight. Maybe like still waiting or like keep open might be
better. That doesn't have to be in a revision of the mock-up. That just has to be addressed in the final
draft. And also, the home page doesn't have, like, at least a list of stacks or a graph to resume from.
So, like, a quick, almost, like, tiles of stacks you have open might just be a good home page. With the
what you want to do now, there's just a search over your tiles effectively. With that being said, let's
draft the first implementation of this."
*Interpretation:* decided — Stop becomes a Home control that asks first; Switch becomes Resume, and
pausing shows what else can be resumed; home is tiles of what you have open, and the prompt searches
them; "Keep it out" is reworded (taken as "Still waiting", with "waiting on:" for the list); the note
must fit with the keyboard up; the step menu may be nine rows and scrolls. The other open items take
reasonable defaults (B-11 §9b). **D-18: go** — build the first implementation.

## 2026-11-24 — "Paused", not "put down"
On one designer calling a paused run "put down": "I'll keep it at pause for now. I just think put down
is good in isolation, but in context with the other terminology we're using, it seems out of place or
not as coherent as pause. You would have to devise a vocabulary that seems more unified to allow put
down to naturally read the way the other actions do."
*Interpretation:* decided — paused. The verbs must read as one vocabulary; no word is chosen for how it
sounds alone.

## 2026-11-24 — Rewrite, and one final double-blind redraw
"Rewrite and one final redraw. Again, ensure that this is double-blinded in the sense that you write
your redraw in another fresh agent with just the design specifications, user journeys mapped out, we'll
draw it and we converge. The practice we have to ensure is UI, UX, industry standards with layouts,
spacing, icon placement, settings placement … the components leveraged in traditional adjacent apps,
their layouts, we should borrow as much as we can to align ourselves with expectations of productivity
and ensure minimalism where we can. So minimalism is preferring icons over text, disclosing or hiding
additional text that … are instructional unnecessarily. Any disclaimers or any thing that has to
explain what the app does is a sign of a failure of the app to communicate its design and functionality
without it. So I'm not saying to be overzealous with this principle, but it's a nice way of trying to
ensure that the app is well designed to communicate its features without over explanation … Outside of
basic labels for forms, explaining interaction buttons, or button labels, etc." Then: "each agent
performs an adversarial audit of UI independent of each other. So there's refinement in both
submissions."
*Interpretation:* B-11 rewritten clean; two fresh designers each draw every journey from the design and
the journeys alone, blind to each other and to earlier mockups; each set gets its own independent
adversarial audit and is refined; then the two are converged. The minimalism principle is in B-11 §6.

## 2026-11-24 — A reaction may end things; don't over-specify
"So remember, so yes, a reaction may abort, but if there's no associated step with it, you just rely on
the user to exercise their own judgment, and the app holds enough context for them to do their work. It
doesn't have to be overly specified."
*Interpretation:* confirms the reading below. An outcome that just means "stop" needs no reaction at
all: the person presses Done. Reactions exist only where there is something worth writing down; the
rest is the person's judgment, with the app holding the context.

## 2026-11-24 — No forced join after a reaction
"A reaction shouldn't always join because there might be sequential work that depends on the output of
that awaited value, and that should be executed on its own terms. So forcing a join after every wait
isn't true to async programming. You just resume sequential execution of that routine."
*Interpretation:* there is no "rejoin" or "leave" setting on a reaction. Work that depends on an outcome
lives inside that reaction and runs on its own terms; when it ends, the routine simply carries on with
whatever comes next in its sequence, if anything. Whether outcomes share later steps is decided by
where the steps are written, not by a switch. (Reading to confirm with the owner.)

## 2026-11-24 — Since when: yes; reactions must hold something; no "one more round"
"A wait [may say] since when, because that's useful contextual information. And a reaction, as in a
decision point, should be appended to one or more other actions or routines. Otherwise, there's really
no point. And at least bare minimum [it] serves as a document of your intentions based on what you
might do. And you don't have to remember what that is at the time you recover it, especially for maybe
long-standing tasks. You don't want to try to recall what you intend to do if you could just jot that
right then and there … I don't want to support a one more round after a counted loop because that goes
against the design of the routine itself. And that's already defined with a jump to as an escape hatch.
So I don't want to necessarily program a UI that allows for a loop to just be disregarded that way,
because then at that point, why not just set it to 999 and just iterate as much as you can and abort?
… So I wouldn't want to support that."
*Interpretation:* decided — a wait says since when, in words. Decided — a reaction always holds one or
more steps or routines; its least job is to record what you meant to do. Decided — no "one more round":
a counted loop means its number; Jump to… is the way to go back in.

## 2026-11-24 — Audit the additions against what people expect
"Given these additions, run through again a fresh agent to assess the user journeys with these and
ensure that we have a comprehensive assessment on what's typically afforded for features like these,
either as general baseline expectations a user might have when entering an app like this, whether that
be established in adjacent products or just by very nature of the feature itself, reasonable
expectations, and ensure we account for that."
Led to: `.polish/product/audit-B-11-expectations.md` (a fresh agent; adjacent products, expectations by
the nature of each feature, the journeys and capabilities to add).

## 2026-11-24 — "Jump to"
"Maybe jump to could be a better way of phrasing that. 'Cause set my place feels in the right
direction, but my place feels ambiguous."
*Interpretation:* decided — the action is named **Jump to…**.

## 2026-11-24 — Not "catch up": set yourself to a point that makes sense
"Well, catch up might not necessarily reflect the use case of a person exiting mid gesture drawing
practice, where if they leave, it's more so [an] indication that they're done practicing and they don't
necessarily have to complete the loop. They just have to restart it back to a place that makes sense.
So catching up doesn't quite capture that feeling. I would want to argue something along the lines of
sync yourself to a point in the execution thread that makes sense."
*Interpretation:* the name must not imply being behind. It is about choosing your place — forward, back
or the start of a level. Proposed: "Set my place" (name to confirm).

## 2026-11-24 — Leaving with something out asks; and a way to catch the app up with life
"A way to ensure that there is some level of guidance and structure around [async] work is that if you
try to abort from a routine that has a [wait], just prompt the user to resolve what that [wait is:
discard] it or accept it as incoming and let that just be a free outgoing item that can be accessed
from like the additional information as like a warning or an indication like … hey you have your
laundry running. Now the thing we have to be careful [of] is that life works such [that] this may
naturally be resolved without having to go through the app itself, so there needs to be a way to reset
the execution of a context back to a point where that makes sense, just as an escape — do you want to
restart — and you can define the outermost layer that you want to checkpoint back to … because
obviously if a person forgets to work through the app … it's gonna be out of sync with what they're
doing, and so being able to calibrate the execution context to the state you're currently working in is
[absolutely] necessary, especially for async work."
*Interpretation:* decided — leaving a routine with something still out asks: let it go, or keep it out
as a free item shown in the pull-up panel and on home. Decided — there must be a way to set the run to
where you really are: restart from a chosen level, or pick the step you're at, and mark things out as
having happened, without walking through the steps.

## 2026-11-24 — A parent can always wait on its children; a child knows nothing of its parent
"resolve this tension. You can always wait for something at the outermost context that allows for it.
So a parent is always aware of its child, but a child isn't aware of its parent. That just keeps things
modular and scoped. And I think it tracks cleanly because that's, for example, returning a promise
value from any async function. A function that has an async value is by definition async, and that
itself becomes a wait value. And by that point, everything's async. So it only makes sense that the
outermost context can wait on its children. I think that's the most faithful to async programming or
concurrent programming."
*Interpretation:* decided. Something set going and not waited for inside a routine makes that routine
itself something that can be waited for, by whatever uses it — and so on outward, to the first layer.
Nothing ever reaches inward or upward.

## 2026-11-24 — A wait closes several; waits and the level they belong to
"A wait should be able to resolve several joins at a single step. That being said, the implication is
that if you're awaiting something within a … routine, you can't leave that routine by definition until
that wait step is done. So if you have a wait step in an outer routine, you can't necessarily progress
to it if you read that like … standard code as an analogy. So what that means, you have to put the wait
step and reference different [waits], assuming you have access to the context, assuming it's an outer
context for which there are inner routines that are async, is what I'm saying."
*Interpretation:* decided — one wait may close several. Raised — scope: a wait inside a routine holds
that routine until it is met; when an inner routine sets something going without waiting for it, the
outer routine must be able to wait for it. Proposed back: rails stay within one level, and a routine
block as a whole can be the open end (B-11).

## 2026-11-24 — Several things out at once
"Okay, so show an example of waiting for multiple outgoing items or requests, effectively."
*Answered with two worked examples (B-11):* one wait that closes several rails ("both references are
in"), and two waits that close at different points (stock, then dough), each rail in its own lane.

## 2026-11-24 — How a wait is laid out in the composer
On an "any order" group: "No, that's fine. That resolves what my intuition was telling me. But then how
would that be laid out intuitively on a UI? Like a wait for routine to wait for a step to resolve? As
in, like, it's an open item that has to be closed? An explicit wait and a wait step that has to be
resolved? Because in a flow diagram, you see that as like a joining of two lines. And so intuitively,
how would we represent that in the composer?"
*Interpretation:* no "any order" group. Proposed back: a wait block with its own shape, and — when it
names the step that set it going — a rail down the side from that step to the wait, the "open item that
gets closed"; Read it says "While you wait: … / Then wait for: …". On the final-redraw list.

## 2026-11-24 — Separate threads are independent; waiting inside one is dependent
"Yes, the order does do the work for me. Now … you can have multiple concurrent threads going on, and
you can context switch between them at a shared common layer. So how is that different than adding a
sequence of actions and awaiting the response of another? … I'm trying to distill the fundamental
difference between having multiple concurrent threads that you can context switch between versus …
in-thread concurrency. My intuition is telling me that concurrent threads are independent work that
don't relate to each other. While … if you're being concurrent within the same thread, … the work is
dependent on each other, they just don't have to be done in a specified order or get done in the same
order each and every time, as opposed to a standard sequential function."
*Interpretation:* "the order does the work" is confirmed. The distinction is recorded as a principle
(B-11): separate runs never have to come back together; inside one run there is a point where the
results are needed together — the wait step.

## 2026-11-24 — Pause is incompleteness, a wait step is completeness; reactions only when they hold something
"A pause is just saying I'm done executing on this task for now, and there should be allowed a reason
to do that. They can make a deliberate step, a wait step, if that's more concrete. But … a pause is a
mid-interruption … Whereas an explicit wait step means, okay, I've done the work, and everything I've
done before that was complete to my knowledge. Whereas a pause naturally confers incompleteness. So
there's two experiences with that. And the reactions should be surfaced only when it's relevant at a
decision point, assuming we codify that. And only if there are routines or steps afforded to those
reactions, because otherwise a yes or a no with no reaction might as well not have existed … It's only
useful if there was already some decision made beforehand on how to proceed once you get the answer, so
you don't have to remember or think about it. And … we should be able to wait on one thing and carry on
with the rest of the task. In the sense that you can context switch freely. And if you are allowed to
work within the same thread and allowed for asynchronous operations to occur, there needs to be an
indication like, hey, there's some outgoing requests you have … And there has to be a natural await
point for which you can't proceed without those requests … being resolved … If you await a statement,
that whole block has to resolve before you can move on. But if you use something like a promise chain,
where the promise is free to do its own work while you proceed with the rest of the routine … I can't
think of a case where that sort of functionality would be useful. But … there might be … an example for
which that sort of concurrency is valuable, if you can think of any."
*Interpretation:* decided — Pause may carry a reason and reads as unfinished; a **wait step** is a
deliberate step in a routine and reads as "everything before this is done"; reactions exist only on a
decision point and only when each holds steps or a routine. Open — waiting on one thing while carrying
on inside the same run; examples asked for.

## 2026-11-24 — Conditions without an if: pause with a reason, queue the response
Asked for an agent to work the stress-test scenarios through "by just queuing up or pushing work in
response on a pause … the tension I'm trying to resolve specifically is … what's the difference from
having a conditional and working those conditionals out in real time? The most gut feeling I have … is
that if those reactions are routine work, then they deserve to be codified. But if those reactions are
just [of the moment] … I would have something like submit work, and then maybe I'll pause it there,
maybe for a reason, and I think the natural way of having a waiting step [is] you pause with a reason,
or you put in the context await, waiting for a response, much like how you await an asynchronous
request … And then once you're ready to return to that, you then define what your next step would be
anyway, without the condition, because you're going to write the response next anyway, rather than
having that response be pre-recorded. However, I do like the idea of pre-planning it out … You already
know what you're going to do next when you're ready to return to it, and that's furthering offloading
context in your head … It's already spelled out for you. Those are the two tensions I have, and I just
want to see what an agent who's running through this without an if statement would propose in terms of
user friendliness or in user intuition."
*Interpretation:* two candidate ways with no branching — decide on return, or set the response aside
ahead of time — to be walked through the scenarios by a fresh agent
(`.polish/product/review-B-11-no-if.md`). Not decided.

## 2026-11-24 — Stress-test conditionals across uses
"Can you stress test the idea across different applications of this tool? Creative, intellectual, or
basic productivity, to see where conditionals make sense and where it serves to complicate things where
proper routine design could solve."
*Result (reasoned, not tested with anyone):* see B-11 "Under discussion: conditionals".

## 2026-11-24 — Conditionals: for what's outside your control
"the next idea is conditional logic. What's the benefit of having that? I know in programming there's
ways to represent conditionals without using conditionals, and you can … have built-in checks into your
routine, but that just offers complexity and computational thinking, and that is not intuitive as much
as an if-then statement. So what's the payoff from encoding conditionals? My pain point with
conditionals that I want to address is that sometimes you have to work with things that are outside of
your control. Maybe that's feedback, maybe that's the unavailability of a service or a product or
something that you do not have that you want to keep track of. So accounting for the external factors
in a routine and reacting based on that is where I think conditionals have its strength."
*Interpretation:* a question, not yet a decision. The need is narrow: a point in a routine where the
outside world answers, and what you do for each answer. Proposed back: a "question step" with a few
named answers, one of which can be "not yet" (wait). Under discussion; not on the redraw list yet.

## 2026-11-24 — Batch the tweaks; mark the last step of a round
"To keep refinement, I want there to be one final redrawal just to save tokens, because these are just
small little tweaks here and there, so let's [batch] them until the end, until we finalize our ideas.
So no need to keep redrawing it every single time I propose something. So another thing to consider is
if we're going to always have a way to break out of a loop, there should be some level of indication to
show that whatever step you're on, it's the final step in a loop. So that way the user knows, like, oh,
okay, I completed one round, without having to necessarily keep that in their head … Maybe like a small
little indicator to present that information in the corner of the runner itself."
*Interpretation:* tweaks are written down and drawn once, at the end. On the runner, the last step of
a repeating part carries a small corner mark — the one loop hint on the surface.

## 2026-11-24 — The round count is context, kept behind a swipe up
On whether the runner shows which pass you're on: "I think the iteration count is just a quality of
life feature to give context for how much work the user has done, to give them a sense of whether they
want to stop or proceed. So it's not … a way [of] tracking their work overall, but to keep context
within the execution that they're working in. And this could be something not displayed, but maybe
additional information. Maybe when you swipe up from the runner, it shows like analytics or advanced
information, much like how there's always a simplified view, and then swiping up in a mobile app tends
to … open up settings or some other additional information that might be useful to you, but isn't
always needed to be shown at all times."
*Interpretation:* the runner's surface stays as it is. A panel that pulls up from it (also opened by
tapping the note) shows where you are in this run — the round, what comes next — and the less-used
actions. The round is context for the run in hand, never a total and never kept.

## 2026-11-24 — No round screen; an escape hatch; loops can have a number of times
"maybe the roundup screen can just go. You don't necessarily need that because [it] is already inferred
by the presence of a done button or maybe some other indication. And maybe for quality of life, there
should be like an escape hatch to … escape your execution context. So if you're in a loop, you can just
choose like, I'm done with this loop for whatever reason … much like a break statement … Maybe you don't
feel like the current workflow is working and you don't feel the need to refine it then and there. So
you might break and just continue on in sequence. And also there is some idea that maybe loops should
have iterations, an iteration count, or a way to stop itself without always prompting the user. So
let's say you want to specify a loop of 3, you can do that by the definition of the routine itself.
Like how many times? 3 times. How many times until I'm done, for example."
*Interpretation:* a loop comes round silently; a way out of the level you're in is always on the runner
(carry on with what's next above); a routine's repeat can be "until I'm done" or a number of times, and
a counted loop ends by itself.

## 2026-11-24 — The step is a sticky note; long steps should lead to a breakdown
On the three-button runner: "The block seems a little bit too stretched. It should be the size of a
sticky note and centered — that way the blank space between the top and bottom portions of the viewer
gives it focus — and I want [there] to be a subtle indication that steps shouldn't be very long; they
should be very concrete and to the point. Any elaborate [step] is a cause for a breakdown and that's
where the design should be leading to."
*Interpretation:* the step sits as a fixed, sticky-note-sized block in the middle of the runner with
space around it. A short step fits with air; a long one visibly fills the note (never clipped, never
counted), and Break it down is quietly marked — in the runner and where steps are written.

## 2026-11-24 — The runner: focus on the prompt; loop only shown at the end of a pass
On the simplified runner (is the third button Done; should Break it down stay visible): "It could be
the third button — [in] my case if you [want] to break it down in execution, you can do that. I just
wanted something a little bit more focus on the prompt itself, and since there was a lot of action
buttons that didn't really [relate to] the prompt … it felt a little bit overwhelming, like it being a
loop etc. But … all that information can be seen in the viewer / composer side of things, but not in
the runner, because it's already assumed that you know [you'll] be working in a loop and that the
buttons afforded … [interact] with the session itself. So for example, you wouldn't say you're done
until you're at the final step, or … when you're done with the final step [and about] to start the
loop again, then you could be made aware that you're in the loop."
*Interpretation:* the runner shows the context, the step and three buttons — Pause, Break it down,
Next. Nothing about loops there. Done is offered at the end of a pass ("Again" or "Done with …"), which
is also where you learn you are in a loop; leaving mid-pass stays possible behind a tap.

## 2026-11-24 — The runner is cluttered: one prompt, about three buttons, the context
On the converged set: "The runner looks very complicated. I almost expected just one prompt and just
like three buttons pause move forward. The user doesn't necessarily need to see all that extra stuff
and that most they need to see the context, but that's it looks very cluttered."
*Interpretation:* the running screen shows where you are, the one step, and three buttons (pause, go
forward, and a third — taken as Done, to confirm). Step in, Break it down, See it all, "then:" and the
tags move behind a tap. This overrides the audit's "do not touch Running". Led to: runner proposal
frames (`runner-a`–`runner-d`).

## 2026-11-24 — "Foundation" is just the first layer; history and search are a set
On the capabilities audit's questions: "Keep your proposal. A foundation is just the first layer in a
stack and doesn't really necessarily have any special treatment besides it just serving as the first
line of entry into a goal, feeling, or intuition that you have. They don't have to be explicitly
defined as goals. In fact, they can be very concrete and executable in its own sake … there's nothing
special about it … I'm only using the term foundation as a way of identifying what I mean. It's not
like a named concept. I guess the analogy would be like the main thread. Maybe." And: "search can bring
back what's been logged in history, popped off. But ensure that it's a set, not a collection … if you
iterate over a loop so many times, you're obviously going to have the same step referenced over and
over … that's going to clutter up the history. So maybe every step has a reference, and that reference
is what resolves for searching, rather than history being populated by the same step over and over …
if that reference is a routine that has its own sub-steps, that's also okay. That can be resolved in a
search too." (Before the audit: asked for a list of journeys and capabilities to be audited for the
basics — "like deletes or renaming" — so the mockups cover the essentials.)
*Interpretation:* the first layer gets no special treatment and no name in the UI. Everything typed at
home starts a new first layer. Each step and routine has one identity; history shows ended runs, never
each pass of a loop; search returns each distinct step or routine once, routines openable.

## 2026-11-24 — One consolidated redraw, a second designer, and journeys as the completeness check
"Perform one consolidated redraw. Now, I want you to present your design to another agent so they can
also perform their redraw and see where you two converge and polish the strengths and reduce the
weaknesses. This is supposed to be user-friendly and embed UI best practices in terms of button
placement, white spacing, textual hierarchy, palette, and preferences over visuals to text where
appropriate in card design, selection, user interactions, error states especially. … one way to go
about drafting this is to present a list of user journeys that completely map out what the app is
supposed to do and to what end, and ensure each journey has an appropriate render for it, as a way of
ensuring that the write-up is complete."
Led to: `docs/product/briefs/B-11-journeys.md` (16 journeys, 44 states); two independent sets of
renders (`.polish/product/b11-mine/`, `.polish/product/b11-alt/`); a converged set to follow.

## 2026-11-24 — Switching starts at your own level
"Another quality of life feature … the default level for which you are presented threads to switch to
when you pause should be at the same level … of that stack. So if we're going to have deeply nested
concurrent calls at any layer, you should be able to swap siblings and then proceed [to] go up to
parent and zip up or switch entire foundations. And we could present that either as a list view or a
graph."
*Interpretation:* the paused screen offers the run's siblings first; "Up" shows the parent's level, and
so on up to foundations; shown as a list or as the map. Led to: B-11 frames n5, n6.

## 2026-11-24 — Stop is exiting to home; Pause is where you switch
"Stop is just the state when nothing is running, and so when you stop you just [get brought] back to
the home screen — think of it like exiting your video game. You're going back to effectively the screen
to determine what you wanna do next. When you pause you should … offer [a] way to currently switch your
context, but you have to do it explicitly when you're paused, because [it] is a declaration of either
you can't proceed or that you can't at the moment … [stopping] means you're done with engaging with the
app as a context management app."
*Interpretation:* like a game. **Pause** opens a paused screen for the run you're in — Resume, switch to
another (explicitly, only from here), or Stop. **Stop** exits to the home screen ("Nothing running"):
you're done with the app for now; the run stays where it was. Led to: B-11 frame n4.

## 2026-11-24 — The prompt stays and resolves from the map
"[That] said, we can still keep the basic prompt of what you wanna do and it resolves from the map the
thread that closely matches your [words], and if not, it allows you to create a new foundation to work
off of."
*Interpretation:* the "I'm going to…" field stays on the overview. Typing finds the closest runs,
routines and foundations on the map to resume or start; when nothing fits, it offers a new foundation
with those words. Led to: B-11 frame n3.

## 2026-11-24 — An empty foundation is a north star; start, pause, stop; one thing at a time
"A foundation with nothing on it is still valuable because it is in a way a kind of north star, because
you just see it and you can choose to execute on that foundation and start deriving or forming up what
you want to do towards that value or goal. So I would think the opening screen should be where you
left off. If you didn't explicitly mark yourself done for a given task, or you haven't started a
thread, then you just see the overview of that. So there should be clear actions to start and pause
and stop. A stop means you're not running any of the threads. A pause means that particular thread is
parked for execution, and then allow for context switching. In order to context switch, you have to
pause your current thread. That's just it, put structure into the app to reinforce the philosophy of
doing one thing at a time."
*Interpretation:* the Map shows every foundation, including one with nothing under it (a value or goal
you can start from). At most one run is running; the app opens on it; with nothing running it opens on
the overview. Switching is: pause, then start or resume another. What "stop" does beyond pausing was
asked back.

## 2026-11-24 — Wanders retire; a map of your runs as a tree
"So we're moving away from the wanderers concept and any notion of [it] can be retired. We might want
to see some idea of a map to show where all your current energy or mind is … a map of all your
executions based on shared … foundations, and the foundation [meaning] the bottom-most layer of a
call … get to see all the different threads out of that. So it's repurposing the graph … to fit the
stacking context as a tree and you get to see at a quick view what's ongoing, what's being parked, and
you can still salvage out the mapping that the app has."
*Interpretation:* wanders (and whys) are retired as a concept — not copied across; what was logged
stays in history and export. A **Map** shows every open run as a tree rooted at its foundation (the
bottom-most routine), with where each is and which one you're in; it reuses the existing graph work.
Led to: B-11 Map (frame m1).

## 2026-11-24 — One version per name; fork a thread, copy a routine
On "next pass: the routine as named?": "Yes, references to routines changes to the invoker's context.
So that way the user isn't taken aback by different versions of the same routine. That said, there
should be a way for users to fork a thread that's completely independent of its originating context.
And maybe by fork, not necessarily mean just copying a thread over and pasting it and having that be a
concurrent thread, but also allow user to copy and paste routines so they can tweak it a little bit and
still have the overall shape that they want to work for in that thread too."
*Interpretation:* a name always means one routine — no silent versions; a revision lives only in the
run that made it. Variation is explicit: copy a run into an independent one, or copy a routine into a
new routine to tweak.

## 2026-11-24 — A loop is opt-out; popping is revising; the outer loop restores the inner ones
"A loop, again, is opt-out. So if a user wants to pop the loop off of the current running thread, they
can, and redefine what those next steps can be. So this is like a form of revision or a way to hatch
out of a current execution model. So if they want to change how they want to perform gesture drawings,
they can do that without feeling like they're stuck in their same routine. Remember, routines are
named that can be referenced however they want, and a running thread is just a way of holding context
and to feel like they're done. So every iteration of a loop is by definition a do it until you feel
done, and then you can pop it off the stack or leave it there … they can choose to pop off inner
loops, and then the most outer loop, they can choose to iterate again. So that way, they can restore
all of those inner loops again and start fresh."
*Interpretation:* a run is a working copy: you can pop a loop out of it and put other steps in its
place without touching the named routine. Popping an inner loop ends it for this pass only; when the
outer loop comes round, its inner routines are there again, fresh. There is no "done for today":
you pop it, or you leave it there.

## 2026-11-24 — No re-asking inside a thread; many concurrent runs on one base thread
"pass on this design document to another agent to see where we can polish and maybe refine, or …
expose a blind spot with respect to how we would want to implement something like this. And no, you
don't have to keep asking for a prompt if it's part of the same thread … If a user wants to specify a
thread for which they want to practice specific executions of a routine, they can do that. That would
be its own stack. Or, and this is where the concurrency that I deferred until I made it simple, you
can define specific instances or substacks that you can execute at your own leisure … imagine 10
concurrent threads on one base thread effectively, and those 10 concurrent threads are just executions
of the same routine but on different parameters. And that can be deeply nested as they see fit."
*Interpretation:* a run keeps its blank's value; a run can hold child runs (the same routine with
different values, each parked at its own step), nested as deep as wanted. Led to: B-11 consolidated
into one design document; an implementation review (`.polish/product/review-B-11-impl.md`).

## 2026-11-24 — Blanks are optional; switch at any level; a thread has a definite end
"A blank is optional by default. Think about optional parameters where the function just naturally has
default values to use. And that way, it's not friction, and it's just adding flexibility and power …
practicing hand drawings can just be by itself, or you can parameterize it and allow a specific
instance of that to occupy its own thread." On waiting: real concurrency ("a task can spawn its own
task. It awaits its own values, while the rest can work … you can declare at what point does it
matter") is a possible improvement, "but I don't want to provide that level of advanced featuring
without a way of making that accessible. So the simplification of that is just to allow context
switching at any level of the execution of a thread. A thread is a sequence of steps that has a
defined input and a definite end, and you can switch between any thread until you are … done. And
parking a thread is just stopping it at the step it was last executed on."
*Interpretation:* starting a routine never asks; filling a blank is a choice and makes that run its own
thread. There is no separate Wait: you Switch, and the thread stays at its step. Step-level waiting
(the rest of a sequence carrying on) is a later, advanced idea. Led to: B-11 points 4 and 8 revised,
frames d1–d3.

## 2026-11-24 — Routines take inputs; an unnamed breakdown is found by its words
On the neutral review's questions: "some tension … can be resolved by [parameterising] the execution
of a particular routine loop … say you wanted to … specifically practice gesture drawings of women …
instead of [re]declaring the routine … you can make an instance based on inputs … you're not
necessarily doing a to-do, you're doing an execution of a particular task over a set of parameters
you find and keep track of … specified as variables in a way where they can slot in neatly into the
read out of a particular stack workflow routine subframe … the employer, in this case, could be … a
particular set of inputs to the routine." And: "[an unnamed] breakdown is gone in a sense that you
can't reference it anymore. That being said there should be some way to … search it up, so if you
remember what the prompt is … pop it back onto the context stack … retrieve it not by name, but by
value."
*Interpretation:* a routine can have blanks, filled when it starts; a run is the routine plus what
filled it, and values used before are offered again. Unnamed sequences leave "Your routines" but are
found by their words and can be run again or named. Led to: B-11 Direction points 8–9, frames c1–c4.
Not yet answered: whether a wait belongs to a step or a thread; "done for today" vs "done for good".

## 2026-11-24 — Blocks fold too; group steps into a routine; a neutral review
"We should offer the same expanded view in the block view too so that way I can work at the highest
abstraction for ease of understanding. And conversely, there should be a way to group a sequence of
steps into its own routine so that if the user feels like oh wait, this might be useful later they
can." Then: implement these in the proposal and have a neutral, fresh-context agent review it and run
through a use case — "not [adversarial] … they're supposed to [note] their observations and their
implications", strengths and tensions.
*Interpretation:* blocks expand, collapse and focus like Read it; "Group into a routine" is the reverse
of Break it down. Led to: B-11 frames a1–a4; `.polish/product/review-B-11-neutral.md`.

## 2026-11-24 — Read it folds: top level first, expand or focus one section
Asked for the frames redrawn with the fixes, and on the reading view's ambiguity: it shows the top
level, "and then the user can expand out and scope in on particular sections of the routine so instead
of seeing all the steps all at once they see practice drawing … practicing hand [studies] … gesture
drawings … a quick look cause like ok I'll do this and then that … they can expand out or focus one at
a time so that it makes sense in its context, like scope views, almost like expanding and collapsing,
brackets, or function names."
*Interpretation:* Read it opens collapsed to the routine's own items; a routine inside it expands in
place or is focused on alone, with its place in the parent shown. Led to: B-11 frames z1–z8.

## 2026-11-24 — The model matches; a draggable divider and a readable form
On the three-things, five-verbs model with the repeat mark: "Yes, this matches my intuition. And in
terms of visualization, dragging the marker or divider can shift the layout of the stack and routine
to show a clear delineation between what will loop and what's going to be ran off. And maybe a nice
quality of life feature is a playbook or an execute where they can walk through it themselves in a
stepwise fashion to see how it'll work and revise accordingly. Or maybe more … intuitively, they get
… a checklist … that the app generates, so they can read. It's like, okay, this makes sense to me,
without having … the visual metaphor get in the way of their understanding, because it's a lot easier
to read a checklist or a pseudocode, rather … Effectively, they're encoding what they want to do as
pseudocode in a way, without the need to understand programming concepts."
*Interpretation:* the execution model is agreed. A routine has two views: blocks (with the divider you
drag) and a plain-language reading of the same thing; a walk-through to try it before running. Led to:
B-11 frames y1–y5.

## 2026-11-24 — A routine is a sequence in a frame; simplify the thread model
"a routine can have subloops, and each of those loops can have their own subloops until you define
done. So the practice gesture drawing can always have a setup task that … can precede a loop of
gesture drawings, and then you keep iterating in that loop until you feel like you're done and you
move on. Now, the thing with the stack is that a routine or a function can be in sequence, and that's
not a stack … There has to be some notion of a frame that contains a sequence of steps. So … this
thread execution type of model … see where we can simplify that thread model to the basic core of
breaking down steps, executing until you feel like you're done, recalling previous routines, pushing
them onto the stack, and popping them off when you're done, allowing for complex frames that might
have one-off tasks in context of its own routine, and then that routine might have other subroutines
until you feel like you're done." Asked: "what do you propose?"
*Interpretation:* the stack holds frames; a frame is a running routine (a sequence with a place in
it). Proposal written into B-11 ("The execution model, simplified").

## 2026-11-24 — Tasks are one-off; routines are named and loop
"if we're going to keep in line with this programming metaphor … a stack can have blocks that loop
until you're done, and anything prior to that are just one-off tasks by default. And you can define
that clearly as part of a composer … When you're creating the stack and you start pushing things onto
it, you can push a routine, and that routine is by default a loop. Otherwise, you're gonna push
one-off tasks that when popped, don't return. And routines are named constructs in the app that you
can reference always."
*Interpretation:* two kinds of block. A **task** is typed, one-off, gone when popped. A **routine** is
named, kept in reference, pushed from the composer, and loops until you say done. Setup goes before a
loop as tasks. Led to: B-11 Direction point 7.

## 2026-11-24 — The second philosophy: pop when done, push again from reference; save state
"The other philosophy is that you pop it off the stack as soon as you're done. And you redefine it
when you're ready to execute that function, so to speak. … When you pop a block that's saying, I'm
done with that type of work for now. You can always pop it back on based on what's stored in reference
in the app. So if you declare a series of blocks to be a function or a routine, you can declare that
again and pop it on the stack. … as a default case, when you close and open up the app again, just
offer to resume from where you left off, or offer to restart. It's sort of like a save state." Asked
for an honest walk-through with a person practising drawing: strengths and tensions.
*Interpretation:* what you've defined (reference) is separate from what you're in now (the stack).
Popping never deletes; pushing again is one declaration. Reopening offers resume or restart.

## 2026-11-24 — A stack loops until you pop it
On "is a stack re-run by default?": "I have two philosophies. A stack can be rerun by default until
you pop it off your context. So effectively, you're going to always loop until you define a state of
done. So that way, you don't necessarily have to keep redefining the work that has to be done. So you
can run through your routine effectively at the bottommost level until you feel like you're done. Then
you pop it off the stack at any level you like and continue." (The rest of the questions to follow.)
*Interpretation:* pieces inside a block loop; "done" is something you declare, not the end of a list;
declaring it pops that level off your context and you carry on with the level above. The second
philosophy was not stated yet — asked.

## 2026-11-24 — A declaration of intent; the stack is your intuition, not a plan
"when you open the app, you're making a declaration of intent, saying, I'm going to do this now. So
you're not opening up this app as a reflection tool, but as a way of orienting yourself towards what
you want to do in this moment in a way that feels accessible and [has] low activation energy … the app
becomes part of your work loop or cognitive loop where you offload all the minutia and just follow
your intuition, which is not necessarily a plan, but … a development of how you perceive yourself to
operate towards any particular goal. Hence the wonderment aspect. The stack isn't supposed to be a
plan. It's supposed to be … your intuition for how you perform a task or pursue a goal, or a feeling."
On effort: "there could be a timer and there could be a threshold, but … it's opt-in. You say, how did
this feel? A lot? Too much? … choose to either break it down or let the app surface, hey, this has
taken too long relative to your other steps … you find that baseline. If a user constantly defines
steps that vary wildly, then there might have to be some way of notifying that."
On waiting: "Some tasks just have a time component … like baking … or you're waiting for a response
from somebody … there has to be some structure to make that known, like what are you doing right now
that you can perform, and then await, and then do something else. This is concurrency … maybe be
opinionated so that the user feels more empowered to create steps that allow for concurrency. And then
you can do the context switching."
On breaking down: "if you break down a task, it doesn't get rid of the block … it becomes a routine …
maybe the user likes working at that level, and they don't need to know the finer details … But if
they want to drill down … in spirit of Mindstream, they can. So they can choose that level of
granularity in working through a stack." And: "distill my ideas into something that's polished,
because I do truly want to differentiate myself from those to-do apps that don't rely on this idea of
recursive thinking."
*Interpretation:* see B-11 "Direction". An opt-in timer reverses DESIGN.md's "no timers" for those who
turn it on. Led to: B-11 revised (Direction section).

## 2026-11-24 — Peruse by inclination; gauge effort; edits change a piece everywhere
On the three questions: "I wouldn't push it towards an energy estimation. I would guess more so a way
of perusing the options and selections based on what your feelings and inclinations are heading
towards. So it kind of brings up all the things you are currently ongoing and makes it appeal to your
current mood." · "There should be some way of gauging effort, because if a piece takes too long, then
it should have been divided … hey, do you want to break this down next time so you don't feel like
this piece is too much?" · "when a reused piece is edited, it should change everywhere it's used as
part of a template."
*Interpretation:* no "how much energy?" question — the opening shows what's ongoing in every pursuit
and you pick what you're drawn to. A piece that proved heavy is offered for breaking down next time.
Reused pieces are templates: one edit, everywhere. How effort is gauged is open (no timers on screen).

## 2026-11-24 — "A rehash to-do app"; faith in recursive, reusable small steps
After the B-11 redraw (D-18 not answered): "given the crowded territory, how do we lean in on this
app's distinctive features then? Because my initial intention was to resolve energy and mood and gain
direction from what you want to do based on what you've done before. So I do concede that this just
turned into a rehash to-do app, but I do have faith in this idea of recursive thinking, where you can
define smaller and smaller things to do that are actionable and really easy and applicable across
different contexts in a way that makes performing a function of what you want to do kind of
effortless … And you just piece together that in a way that's accessible for you."
*Interpretation:* B-11 as drawn is not distinctive enough. What the owner believes in: breaking things
down until they are effortless, and small pieces reused across pursuits; the original intent (energy
and mood, direction from what you've done before) should come back through that. D-18 stays open.

## 2026-11-24 — Context management, not logging; Tetris is only the look
Answers on B-11: Return — "I think we should get away from logging and instead this being an active
way of capturing your progress. The logging itself shouldn't be introduced just because it has this
idea of state and tracking to something that should be context management so I wanted to divorce two
for now, really just holding onto the context management aspect of the app. The logging in history can
be its own separate review, but I wouldn't be the main interaction." Pixel accents; columns that scroll
sideways; first version: blocks that come back, by-day history.
Then: "Tetris was just a way of defining the look and feel, not necessarily the example or model for
how the app should function. And leaning into this more robotic, programmatic aesthetic, I hope to
really lean into the idea of doing small things at a time with specialized functional tasks. The
spirit of that, anyway."
*Interpretation:* the app manages context (how you'll go about a pursuit over time), not a log of what
you did. Logging leaves the main flow; history is a separate review. The look is robotic and
programmatic; the spirit is one small, single-purpose step at a time. No Tetris mechanics (no line
clears as a game). Led to: B-11 revised.

## 2026-11-24 — Drop the metaphor: pixel-art context stacks
> I think the visual metaphor is being a little bit of a bottleneck, and it's distracting from the
> core user experience of maintaining several ambitions through stacks. So let's reimagine the whole
> metaphor, and let's be very, I guess, programmatic about it, be very pixel art, and just let's focus
> on context stacks. The [Wanderment] aspect can be fulfilled through that instead of having these
> elaborate diegetic UIs for now. So let's be very simple. Like a stack could just look like Tetris or
> something. And the core user experience is you define a stack, a pursuit. So you have your values and
> goals and feelings you want to chase, not necessarily big, explicit plans, and you just add to the
> stack of how you're going to go about that. Every layer can have its own substack, and you can zoom
> in and zoom out as needed. And context switching is effectively switching where your energy for the
> day goes towards a type of feeling, outcome, etc. Now, I want you to refine this idea and ask any open
> questions … across UI, UX, feature set, minimalism versus breadth and depth, and have this be, again,
> [run past the personas].

Interpretation (by /product): a new direction that supersedes the night-sky picture (B-07/B-08/B-09/
B-10's visuals). The core is **context stacks**: a pursuit (a feeling, value or goal) is a stack;
layers are the ways you go about it; any layer can hold its own substack; zoom in and out; choosing
today's stack is the context switch. Pixel art, Tetris-like, programmatic, simple. B-10 (D-17) is
superseded before a decision. Led to: B-11 (concept, mockups, panel, open questions).

## 2026-11-24 — "Nothing feels right": reimagine the UI and UX
> I need you to reimagine the UI and UX because this is getting close but nothing feels right.

Answers: what's off — too many parts, the look, the flow; the core job — capture, seeing where you're
heading, and picking up where you left off, balanced; how far — keep the bones, refine; the feel —
calm journals and playful worlds. After the first drafts and a UI audit: a line is **done by default**,
**↗ Pursue** to head toward it (reverses D-14's default); **Pick up** as a quiet line by the lantern;
**the wanderer walks**; a brief with revised mockups and a panel before building. Led to: B-10, D-17.

## 2026-11-24 — Wandering is a focus view
> When wandering, it should be a focus view, simple and a simple action to decompose. Not sure what
> the right word is to suit the metaphor but the look and feel should be like a [Pomodoro] with the
> wander prompt being the focus until you complete it or all the stacks.

Answers: the centre is the step itself, stylized (no ring, no timer — the refusal stays); the
decompose action is **"Nearer step"** ("Survey" was a suggestion, not an answer — the owner then chose "Nearer step"). Led to: P-67 reshaped
as the focus view (UI audit of the mockups before building).

## 2026-11-24 — Search shows your energy in the sky
> The search should reflect the state of the stars above so you get to see the movement of your energy

Clarified: the sheet's search. Led to: P-84 — matches light up as stars above the sheet (words and
when), their nodes lit, the rest dimmed; no counts.

## 2026-11-24 — The home's layout drifted; attaching does nothing; roll Map into the home
Evidence: `evidence/2026-11-24-home-ui-drift.png` (iPhone: the big question, the field, a gap, "I'm
not sure" far below, "Map" with a flag floating above the hills).
> This UI isn't very good. The I'm not sure button is delocated or misplaced away from the dialogue.
> And the map button is just situated awkwardly and in an unintuitive space, location. Something like
> that may have been better as a swipe action, to swipe up or down to see what's available. I think
> prior to UI changes, that has to go through an audit to ensure alignment with UI best practices,
> because this is a drift. Also, the attaching or resolving an action to any of other nodes doesn't
> really do anything. In fact, every time I try to attach something to, let's say, feeling
> productive, it never updates the map at all. And the map seems like a side feature and is being
> neglected. We should roll that into the homepage as a preview of recency. It will supersede the
> graph view we had before, but instead of it being intentionally showing everything, it just shows a
> select few at random. Almost like a live feed. It's not highlighting anything particular. It's just
> showing what's been done. And let's move the prompt to be lower to where the bottom of the screen
> is, almost like a messaging sort of thing, so that the map has a resting area. And when you're not
> sure, it lights up the map to be more descriptive.

Interpretation (by /product):
1. **Attaching seems to do nothing** (e.g. Toward… "feel productive" → Map unchanged). Reproduce
   first: a bug, or a line attached only "toward" a why drawing nothing new on Map by design. Either
   way it reads as broken — fix it.
2. **Process:** UI changes go through a **UI best-practice audit before they're built** (drift).
3. **The home, redesigned (big):** the prompt moves to the bottom like a messaging composer, with
   "I'm not sure" next to it; the top becomes the map's resting area — a **live feed of recency**,
   a few recent things at random, nothing highlighted, superseding the graph Map; swipe up/down to
   see what's available instead of a Map button; "I'm not sure" lights the map up to be descriptive.

After a UI best-practice audit (`.polish/product/ui-audit-B-09.md`, local) and the panel: **go** on
B-09 (D-16): the feed is a random few drawn once a day; the last three weeks, a calm sky beyond; Map's
depth into the lit map and the sheet. Led to: P-79 to P-83; the UI-audit rule in the skills.

## 2026-11-24 — "Deploys are failing"
> Deploys are failing. Ensure we have proper CI pre-gates so this don't keep happening

Found: the site still deployed (deploy only needed the build job); the run went red because two e2e
tests were flaky on CI's slower CPU (failOnFlakyTests). Led to: P-78 — the deploy waits for the whole
e2e suite; verify.sh runs the changed specs again at CI speed before any push; both flakes fixed.

## 2026-11-24 — The landing after Return; transitions
Evidence: `evidence/2026-11-24-landing-after-return.png` (typed "Testing out wanderment", pressed
Return: "New line", the words, "✓ Kept, loose · Undo", "Move it? / Somewhere else…").
> In testing out Wanderment, this was my initial prompt. The home page was fine, but this new page
> doesn't, I guess, follow my intuition. I guess I expected that to show up in the constellations or
> … in the night sky as a focus prompt, like that's where I'm heading towards. And then I can define
> my substacks sequentially from there. Or I can log that as complete. But right now, as it stands,
> this direction is close, but this landing is not what I expected. Also, the app would benefit
> greatly from transitions, especially ones that interact with the metaphors, whether that be stars
> shining in and out, or the landscape changing, the wanderer moving across screens, etc.

Interpretation (by /product):
1. **The landing is wrong.** What you type should go *up into the sky* as a star — a focus you're
   heading toward — and from there you either break it into steps, one after another, or log it as
   done. "Kept, loose" + "Move it?" reads as filing paperwork, not as the night sky. This is a capture
   change and ties into B-08 (constellations: each log is a star). Big → decision first.
Answers: the line **rises into the sky** as a focus star, with "Done it" and "↳ First step"; leaving
keeps it as a star; a done star **twinkles and dims** and stays; fold all of it into B-08 and write it
now.
D-14 (after the B-08 panel): go, with changes — "the double tap could be addressed if we have a
separate chip to declare things we already done today … the loop is that you just get to log the
actions and see the stars lit up rather than create a new context stack. I'm using 'wander' loosely
— [something] you're pursuing in the moment — and you're using the app to [offload] that context for
you." Answers: several done lines at once; the done chip stays on until turned off; lit glow fades
like warmth (~2 weeks); kinds fixed plus write; a quiet "Toward…".
One home (same day): "product investigation to see how these two views can be unified by looking
how adjacent apps would do something similar … there could just be one home view with a log button,
and then the home view just launches you into the session … like a video game home screen." After
the discovery (`discovery/2026-11-24-one-home.md`): one home, yes; stars at rest faint and
unlabelled; a session ends by itself after a choice; Map as a signpost by the lantern (D-15).
2. **Transitions** tied to the picture: stars fading in and out, the landscape shifting between
   screens, the wanderer moving across. No data change; honours Reduce Motion. Small enough to build
   on today's screens while the landing is decided.

## 2026-11-23 — Mindstream overlap; stacks and a companion prompt
> I need you to attach yourself to the [Mindstream] repo … overlap in philosophy … survey … how
> [Wanderment] differs enough to sustain it as its own thing or be rolled into [Mindstream] as a
> separate view or tool … stacking context rather than a graph … a call stack … a lofty goal …
> stacking stones … long-term stacks … resuming … switch between stacks … [Mindstream] just provides
> additional tooling for documentation and notetaking … wandering is just more so an inverted goal
> planning app … a companion interface … prompt you … "what are you feeling about right now" …
> resolve … to anything currently mapped … without the overhead of a visual representation … overlap
> in the focus session tool in [Mindstream].

Answers: a deeper comparison first; the companion prompt is Wanderment's front door. After the
comparison (`discovery/2026-11-23-mindstream-comparison.md`): **Wanderment takes the stack**
(port Mindstream's Focus model as chains, no timers, nodes never done; Mindstream keeps ThinkPad or
retires); park P-62 until the direction is built out.
B-07 shape (answers): guess did-vs-about-to, one tap confirms; prompt first, graph a swipe away;
unmatched words → "a wizard of sorts that distills the feeling into something actionable … a
structure … less chaotic and freeform, but not as prescriptive as templates"; on-device only.
Then: "[Wanderment] is more life stones and milestones, like large [stretches] of work. I don't
need a descriptive structure on it, just energy and mood. [Mindstream] is the deliberate
alternative when you actually go ahead and start implementing on those actions in a way that's
[repeatable] and understandable for reflection [and] refinement." (voice transcription; bracketed
words inferred.) Answers: keep D-12 as decided; capture words only, as today; keep a light wizard.
Journey (same day, mockups): "a little bit more stylized and more emphasis on the prompt … like a
big billboard … the suggestions are more so an afterthought because I don't want the suggestions to
influence … where your energy is"; "what are you up to assumes that I have something in mind
already … a more neutral prompt … respect the fact that I may not be up to anything"; "maybe [an]
I'm not sure button could be the escape and that's a door to entering suggestions"; the compass is
"just a preview of all your top level [nodes] as a guide to orient yourself … using the wanderer as a
visual metaphor, attracting yourself to certain [nodes] … based on [recency]"; concurrency: "a stack
by definition only works on one branch at a time, which is analogous to a wander … seeing all of the
different [wanders] from a top level [node] isn't represented clearly"; all dark style.
After the persona panel: Return logs now, re-file after; warmth only, fixed places; soften
"working" → "What are we up to today?"; routines: "special support for routine actions that's
different from the stack. The stack is a queue of work. A routine is a template from which work can
be defined and pushed onto the [stack] … quick actions … stored and resolved as a task when you
start [typing] in the text field."
Routines, refined: "two design philosophies … it's inferred … via auto complete … resolve some very
similar work you've done in the past and brings that up again for you to select or [push] onto the
stack … another is … when you're done with a stack, you can declare it as a routine like a checkbox
… quick actions … resurfaced for you so … you can quickly just tap … and not have to worry about the
exact wording … I'm a fan of minimalism … [but] there is some value in just declaring something as I
want this to be repeat work." Sizes: "Draw for 15 minutes … would be a stone on the stack like a
pebble, but I do like the idea of saving entire work stacks as a repeatable workflow … reference the
entire stack rather than [queuing] a whole bunch of different pebbles." Declared routines surface on
their why.
One picture: "you're taking my terms literally and I don't mean for you to do that. I want you to
distill my metaphors into a coherent idea … one app idea … resolving it to fit the imagery of
wandering." On landmarks: "landmarks have definite position, but … a more subtle aspect may have
been Polaris … you can't ever reach Polaris, but you can reach a landmark." Words: visuals, few
words. Reaction to stars/landmarks/trails/camp: "more thrilled having this move into a more
[diegetic] way that feels more whimsical and less … sterile."
Motes: "for each of the stars, if there is a lot of work or activity around it, there should be a
little bit of a visual indicator … twinkling dots that slowly fade in and out, and the number … is
directly correlated with its activity level. It doesn't have to be an exact amount, it's just
relative based on the heat that we were using before."
Naming: "instead of saying stacks they're gonna be a different metaphor — trails, journey, a wander
for example." Answer: wander (drawn as a trail).
Prompt, in the metaphor: "where do you feel like heading today? … which path are you on today? Or
where are you wandering off to now?" Chosen: "Where are we wandering today?"
`/product P-64`: brief B-07 written; owner answered D-13 **go**, and **reword** STRATEGY.md's
refusal to "no schedules, deadlines or progress toward a goal".
Building B-07 (2026-11-23/24): "defer all testing into the very end for velocity and iteration, but
ensure test first. At the end, an adversarial audit of the UI and user experience, and a persona
panel to see the improvements." After the audit and panel: a floor of one mote; dark Map in this
batch; drop the big "Not sure."; typing opens a trail; loose lines on the sky; keyboard stays down.
Constellations (2026-11-24): "logging still should happen independent of a why. And stars in the
sky should just be your recent activity. And then constellations can be derived from that when you
see a picture form. That's a working metaphor, not an explicit concept to be named in the app … as
you interface with the prompt and you start noticing that you're resolving to the same sorts of
activities, maybe there's something to be said there … clustering … creativity, reading, research,
watching a video, planning … but there's still room to have logging for the sake of logging. And
then seeing emergence from that." Answers: each log is a star; draw clusters and offer "Name this?"
quietly; whys become guiding stars; kinds as "a set of quick action buttons … standard across all
types of productivity apps … or just have it be freeform".
Testing order (2026-11-24): "my intuition was telling me it was test first driven development, but
any end-to-end or regression testing should have just waited until all the batches were done till
the very end." → written into the polish and product skills ("Testing order"): tests first with unit
runs while building every batch; audits and panels from the built app; one e2e/regression run at the
end; builders export their own web build for screenshots.
Led to: D-12; P-62 parked; B-07; D-13 → P-65 to P-70; B-08 (D-14), one home (D-15) → P-73, P-74 shipped (`parked/P-62-quick-actions.patch`); P-64 (brief B-07).

## 2026-11-23 — screenshot: Home with one why (feel productive), first-run step card, "→ to" chip, toggle
> This UI is very confusing, and the nodes are cropping with the text. There's too many prompts trying
> to get my attention. There should be something … more intuitive where a node can have a quick
> action button to just add it to something else. Also, the prompt "what feeds it, nothing yet" is
> really distracting, since the focus is just seeing my declarations. … I just want a simple plus
> button to add a log instead of the two tabs; the what's next could be displayed. And the log can
> take the place of the search … if you're gonna type something you already did it can auto complete
> with previous entries, or you can tap it on the graph … I'll clean my car and tap "clean my car" as
> a way of pulsing that entire graph … reducing the clutter … the text is out of place and the icons
> themselves are way too small.
Answers (D-11):
- **A round ＋ at the bottom right** raises the log field (autocompleting past entries; tapping a
  node attaches). The What's next card is always shown; the toggle goes (replaces P-49's toggle).
- **Node quick actions:** each node has a small ＋ sticking out of it (feel productive keeps its
  own). Selecting a node pops up its quick actions (no permanent buttons). Replaces P-50's "a tap
  attaches".
- **Removed from Home:** the summary line, the button list under the graph, the "All" label (the
  first-run card is kept until P-55).
- **The pulse:** a glow travels up the path when you log; under Reduce Motion the circles just warm.
- **Fixes:** labels overlapping circles; misplaced text; tiny icons.
Planned items (after P-58 lands):
- P-60: declutter + labels + icons;
- P-61: ＋ to log, with autocomplete and tap-to-attach;
- P-62: node ＋ and quick actions;
- P-63: the pulse.
Evidence: docs/product/evidence/2026-11-23-home-clutter.png.
## 2026-11-23 7:27 — screenshot: logged "clean my car" (typed in Log), graph didn't change; toast + bridge both ask "Toward something — or just itself?"
> I logged something and the graph didn't update, and in fact the pill itself is very un user-friendly.
> (Which pill: "Logged towards something".)
Diagnosis: the typed words didn't match/complete the staged step "Clean my car" (typed words never
complete a step); the log was unattached, and unattached logs aren't drawn once wanders exist; the
question appeared twice (toast + bridge).
Decision (D-11, owner): **remove the "Toward something — or just itself?" bridge and the toast's
question.** The target is chosen before logging (P-61's autocomplete offers matching staged steps and
nodes, e.g. "Clean my car · feel productive": one tap attaches and completes; or tap a node). The
toast is plain "Logged · Undo". DESIGN.md's bridge rule is removed when P-61 ships.
Evidence: docs/product/evidence/2026-11-23-logged-toward-prompt.png.
- Correction (owner): "No, I put in an entirely different activity." → the log was new and unattached;
  with wanders present, unattached logs aren't drawn anywhere, so Home showed no sign of it.
  Decision: **loose dots with words.** The last few unattached logs sit as small labelled dots in a
  quiet strip below the graph (like P-57's rows), fading with age; tapping one attaches it to a node
  (or opens it); a new one glows briefly as it lands. → P-64 (after P-60–P-63, or folded into P-60).


## 2026-11-22 — Logs with no context; pull-out views
> [Screenshot: their Home with two logs and no wanders: two bare dots and "Lately: Watched an video
> on AI acceptance; Worke…"] This view is very confusing with the truncated "lately" and the dots
> hovering with no context. They should at least show their text … Let's make activities and wanders
> just pull out views from the home page.
> (Answers: one sheet from the bottom; remove the tab bar; dots with their text.)

Interpretation: the owner's real data is logs-only, so Home showed nothing readable. Wanders and
Activities become one pull-up sheet; Home is the only screen.
Led to: D-10, P-57, P-58.

## 2026-11-22 — "implement" (B-06)
> /product implement

Interpretation: go on B-06 at revision 12 (D-9), after the owner earlier said "not yet, keep
refining" and revisions 11–12 followed. Build what the owner sees first: the graph's new look
(P-48), then the two-face slot (P-49) and selection (P-50).
Led to: P-48 to P-55.

## 2026-11-22 — Screens without explanations
> Please eliminate most of the descriptions because the UI should be intuitive enough to realize
> what's going on at best. You should have an information dialogue, but never it being part of the UI
> itself. (Answer: app-wide; safety warnings stay inline.)

Interpretation (by Claude): a DESIGN.md rule. Meaning comes from structure, position and a few marks
(↳ next, ↺ left off, · · · more, ⋯ choices, accent = a why); an ⓘ sheet explains, never opening by
itself; screen-reader names keep the full meaning.
Led to: DESIGN.md Interaction rule, P-44 (copy pass), the B-06 mockups.

## 2026-11-22 — A stack, not a list: the intention stack
> My initial intuition was that there was going to be … a stack of … pursuits or higher level nodes
> with their steps appended to them. So I can quickly see, oh, I should do this next … click on that
> step, onboard the next step, and just kind of see those chains come into view. And the graph was
> just supposed to be a way to … provide a more impactful illustration.
> … a literal stack … almost like a pyramid … keep stacking on steps towards a base, and that base is
> ultimately whatever the parent goal or pursuit is … pop off a step … scope that at any level … swipe
> between [children] and see what the current engagement is for each of those subtrees.
> … maybe there's like a carousel viewer to swipe between any sort of chain of intention at a given
> level … leverage selection and focus to really highlight intentionality and what I wanna do next.
> … perform a … audit … leveraging established productivity science or psychological research …
> maybe the highlight there should be like a highlighted section that prompts the next step that is a
> separate view on top of the already displayed stack.

Interpretation (by Claude): a flame graph of intentions (root at the bottom), re-anchored by
"hoisting", with a pager between sibling chains, under the graph on Home; the next step docked above
the log box as a spotlight. Answers recorded in B-06 (panel, discovery, research audit).
Led to: brief B-06, D-9; P-40–P-43 held until Home settles; discovery `2026-11-22-intention-stack`.

## 2026-11-22 — "What's it all for?" isn't intuitive or insightful
> [Screenshot: Home with one log, "Lately: Worked on wanderment.", a lone dot, and the dashed
> "+ What's it all for?" pill beside "Not now".] This "what's it all for?" view doesn't look very
> intuitive. I want you to deliberate with the personas in order to create a more engaging way to
> express linking or refining — declaring your intents, values, motivations, goals, whatever,
> intentions — and then defining your first step. But this doesn't seem very insightful.
> (Answers: scope is all three moments — the Home offer once you have logs, the empty-app 1-2-3, and
> revisiting a why later; what's off: it **stops at the name** and it **looks like a stray
> button**; how much a why holds: let the panel weigh it; output: a brief with options, then the
> owner decides.)

Interpretation (by Claude): the owner had logs before P-36 shipped, so they meet the bare pill, never
the guided 1-2-3. Naming from the pill ends there: no next step is offered, and (found while
capturing screens) the unattached log dot drops out of the picture once a why exists, so the one
thing you'd connect it to vanishes. "Goals" here is loose wording; targets/progress stay refused.
Led to: brief B-05, persona panel, D-8.
Decision (D-8, same day, after the panel): **go with the panel's combination**, no "because…" for
now. → P-38 (polish), P-40–P-43.

## 2026-11-22 — Onboarding: a feeling, not a goal
> For example, maybe the onboarding thing is I get to declare something as simple as "I just wanna
> feel productive", and then the next step [toward] feeling productive might be something mundane like
> reading a book. It's not necessarily the most structured goal-setting traditional app, but it makes
> it very apparent why I want the things I do and what I think I should be doing, with a way to track
> that over time with as much specificity as I allow myself to hold myself to.

Interpretation (by /product): P-36's 1-2-3 names a *why* in the person's own loose words (a feeling
or reason, e.g. "feel productive"), and a mundane next step ("read a book"); no targets, dates,
numbers or goal framing. Over time the graph shows why next to what. Specificity is opt-in: a vague
why can stay vague; more structure comes only by adding a smaller step toward it later (D-5 chains).
Led to: B-04 / P-36 wording and examples.

## 2026-11-22 — The graph should be first, from the start, and a place to act
> [Screenshot: the Graph tab after a log: "This fills in once you've logged for a while…"] I'm not
> quite satisfied with the idea of having to log a while in order to access the graph view. The graph
> view should be first and foremost to see at face value your intentions, values, and what you're
> doing at a high level, with a way to quickly initiate or quickly log any pre-planned or the next
> step from any given wander (whatever you want to call a node) in its subtree, or log it fresh, a
> new activity.

Interpretation (by /product): three asks. (1) No threshold: the graph exists from the first moment,
including with no threads or no whys (an intention can be named right there). (2) The graph is the
primary view of intentions/values and what you're doing, at a high level. (3) Nodes are actionable:
from any node, quickly log its staged next step, log something fresh toward it, or set a next step,
for it or anything in its subtree. Big (changes the primary screen and capture), touches B-01 (P-16,
P-18), B-02 (steps, P-19) and B-03 (focus, P-26). Clarifying questions in this run.
Screenshot: `docs/product/evidence/2026-11-22-graph-tab-empty.png`.
Answers (D-7): the graph IS Home (list → its own tab, Graph tab goes); first run is a quick 1-2-3 —
"declare an intentional value or something upfront and then plan the next step towards that, very
simple 1-2-3, and you get to see the output"; node tap → quick actions at the log box; call nodes
"wanders". Led to: brief B-04, P-34–P-37 (P-18 superseded by P-36).

## 2026-11-22 — "It still looks like the same one"
> So I refresh the app. It still looks like the same one. I expected the graph first … at least what
> was shipped and deployed.

Interpretation (by /product): the owner expected the graph-first Home (D-4, "graph earlier") to be
live; it was queued (P-15) but never built — the run shipped groundwork and polish around it, and
the end-of-run report didn't say so plainly. Also: a plain refresh of the installed PWA keeps the
old version until the update banner is tapped or all tabs close. Lesson for /product: an owner
decision's headline outcome should be built first (or the report must say it isn't shipped yet).
Led to: P-15 started now; the update-on-refresh confusion noted for P-30 below.

## 2026-11-22 — Locked out on iPhone: "couldn't open its data (The object is in an invalid state.)"
> [Screenshot: Edge on iPhone, the blocked screen "Wanderment couldn't open its data (The object is
> in an invalid state.). Reload to try again."] Ensure something like this doesn't happen again.
> (Answers: Reload doesn't fix it — it keeps failing; before it: tapped the update banner, came back
> to an old tab, also open elsewhere, opened it fresh; browser: Microsoft Edge on iPhone.)

Interpretation (by /product): a reliability failure, the most serious kind — the person can't reach
their data. Edge on iOS is WebKit. expo-sqlite's web storage takes exclusive OPFS access handles;
WebKit refuses a second holder with `InvalidStateError` ("The object is in an invalid state"),
which our lock-error check (Chromium wording) didn't recognise. Likeliest holder: another Wanderment
page in the same browser — e.g. a suspended background tab among many — that never releases them,
so Reload can't help. Not a product decision: fix as polish (P-29), and bring WebKit into CI (P-05).
Screenshot: `docs/product/evidence/2026-11-22-edge-ios-invalid-state.png`.
Led to: P-29 (top of Now), P-05 moved up.

## 2026-11-21 — Keyboard after a tap: only for "Log this"
> (Answer to /product's question after the P-13/P-24 audit, finding F12.) Only for "Log this".

Interpretation (by /product): "Log this" focuses the log box (you're about to log); attaching from
the bridge ("Toward something?") must not raise the keyboard on a phone — focus returns to the log
box only where there's no on-screen keyboard (desktop web), for keyboard users.
Led to: a small fix in the P-14 batch.

## 2026-11-21 — "It's effectively a search over the graph"
> It's effectively a search over the graph.

Interpretation (by /product): confirms B-03's framing rather than changing it (asked: "Confirming the
framing"). The row searches what's in the graph (whys, threads, steps, and activities that feed
them); one-offs, which aren't in the graph, stay in "All results →". The brief's wording is sharpened
to say so.
Led to: B-03 wording only; D-6 stands.

## 2026-11-21 — The log field as a mini search over the graph
> And for quality of life, since the graph is gonna be first, let the log field be a mini search
> engine that can query the graph to show what action exists currently, or even an intentional
> value, as a way of searching through and possibly finding where you want [to be], what step you
> wanna be [on] quickly, or what intentional value you want [to] survey.

Interpretation (by /product): with the graph first on Home, the log box should also *find*. As you
type, it would surface existing threads, staged steps and whys, so you can jump to a step to do it,
or bring a why or thread into focus in the graph to look around it. The tension is with *capture is
sacred*: Return logs exactly as typed, and typing must never be hijacked. It's big (it changes how
capture works), so: clarifying questions, then brief B-03, the persona panel and D-6.

Answers: quiet matches as you type; a tap focuses it in the graph; scope is threads and whys, staged
steps, past activities.
Led to: brief B-03, persona panel, D-6.
Decision (D-6, same day, after the persona panel): **go, with the panel's refinements**; one-off
activities via "All results →"; when "Log this" keeps typed text, the line counts as the step
(visible chip). → P-24 (Now), P-25, P-26 (Next).

## 2026-11-21 — Chains of intention: one staged step, stacked on top
> The application of this is that you could define the next step towards a value or goal ahead of
> time, but only one at a time — there can only ever be one staged at all. And if that [one] needs
> to be edited or extended, such that maybe you wanted to [add] another note on top of it, you can,
> and that implicitly creates a chain of intentions that the user can select and do by a quick tap
> of the note, granted each [note] itself can be treated as an intention. So X to Y, even if Y is an
> action like "practice head proportions" to "be a better drawer", and "be a better drawer" to
> something else — it's perfectly valid chains. That's the implication I see outright.

Interpretation (by /product):
- A next step is itself an intention, so it can be a *why* for a smaller step.
- **Only one step is ever staged.** "Adding a note on top" makes the new note the staged one, and the
  previous step becomes its why. Chains of intention grow this way ("practice head proportions" → "be
  a better drawer" → …). Tapping the staged note loads it into the log box, as crumbs do today.
- This rubs against three written rules:
  - DESIGN.md's *Cut from v1: split next steps into hidden "then" pieces*;
  - STRATEGY.md's just-accepted *no plans for the how*;
  - DESIGN.md's *links between threads are never stored* (if the chain links are stored).

  It's a product decision: brief B-02 plus the persona panel, then ask.

Led to: brief B-02 (chains of intention), persona panel, D-5.
Decision (D-5, same day, after the persona panel): **go with model A; only the top step is loggable**;
no "Show graph on Home" setting for now. → P-19, P-20, P-21.

## 2026-11-21 — Refining the philosophy: know the why, leave the how open
> I do recognize the contradiction, so there might have to be a refining [of the] app philosophy,
> because intents and values are ultimately the things [we're] moving towards, and how we exactly
> get there is unknown — but always keeping in mind what those are, as in your current motivation,
> and your pulses or impulsivity or inclining towards has a structural reason to exist within this
> app. Trying to find a theme that you can either induce or deduce, without clarity on how to
> actually go about doing that, is I believe in [the] spirit of what the app is trying to achieve.

Interpretation (by /product): the tension between "declare up front" and "direction emerges" goes
away if the app separates the **why** from the **how**:
- **The why** (intents, values, what you're moving toward) can be **induced**, named up front, or
  **deduced**, surfacing from what you do. Both are first-class, and the app keeps them in view.
- **The how stays open.** Impulses, inclinations and detours aren't noise or failure: they're how
  paths get found, and they need a structural place in the app. That's what threads and one-off
  activities already are.
- What stays refused: plans for the how (steps-to-goal, milestones, schedules), plus the existing
  never list.

This changes STRATEGY.md and DESIGN.md wording, which the owner owns. Proposed wording is in B-01.

Led to: B-01 "Philosophy" section with proposed wording; D-4 now includes accepting it.
Decision (D-4, same day): wording **accepted as written** and applied; B-01 **go, with the live graph
earlier** → P-13, P-14 (Now), P-15 live graph, P-16 headers, P-17 animation, P-18 first step (Next).

## 2026-11-21 — A graph-first view that updates live
> I want to consider maybe a graph first view so that way when you declare intents or activities you
> get to see a graph update live.

Interpretation (by /product): the owner wants the graph to be where they *start*, not a tab they
visit later, and to see it respond the moment they declare a Y (B-01) or log an activity: the new
node or link appears. That's big (it changes what the first screen is, and touches DESIGN.md's Home
rule and Reduce Motion), and it's closely tied to B-01. Clarifying what "graph first" means in this
run.

Answers: live graph on top of Home (cards, crumbs and log box below); gentle animation, off under
Reduce Motion; folded into B-01.
Led to: B-01 slices 3b (live graph on Home) and 3c (gentle animation); D-4 updated.

## 2026-11-21 — First log feels disconnected; declare intents up front
> The initial logging of activities [is] a little bit unintuitive because [after] my first log the
> onboarding text disappears and I see no threads, and so the disconnect between the activity I
> logged and the idea of a thread has no clear bridge, and it's confusing as to what my next move
> should be. One user flow I considered was that you can declare your intents upfront … the "X to
> why the Y" is declared, and then you can interact with that Y based on how you want to proceed in
> any direction from [it]. That way you see your intents and values first, rather than trying to
> work through what you did and reference something, and then introduce the reason why and for
> what, or to what end.

Interpretation (by /product):
1. **The first-run bridge is missing.** After the first unattached log, Home loses the welcome and
   shows no threads. Nothing explains "threads" or offers the next step. This is a UX gap, whatever
   the answer to (2).
2. **Intents first.** The owner wants to be able to start from the *Y* (what it's all for: ends,
   values) and log activities toward it, instead of only discovering the Y later. This is in tension
   with STRATEGY's "direction emerges… without you having to declare anything up front", with the
   README ("not declared up front"), and with DESIGN.md's earned value headers. It's a product
   decision, not a polish item. Note the owner says this was discussed before; there's no record of
   it in the repo.

Led to: clarifying questions in this run; then a brief (B-01) and a first-run bridge item.
