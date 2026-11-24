# B-11 — Your ways of doing things, run one step at a time

**Status:** proposed · **Decision:** D-18 · **Theme:** Seeing flow / Warm return · **Date:** 2026-11-24
**Supersedes:** B-10 (D-17, never decided) and the night-sky visuals of B-07/B-08/B-09.

This is the consolidated design. Every decision is the owner's, from `docs/product/owner-notes.md`
(entries dated 2026-11-24, "Drop the metaphor" onward). How it got here is in the git history of this
file; reviews and audits are in `.polish/product/` (local).

## 1. What it is
**Not what you have to do. How you do it.** Wanderment keeps your *ways* of doing things — routines in
your own words — and runs them with you, one small step at a time.

- You open it to **declare**: "I'm going to … now." It orients you with almost no effort to start. It
  is not a reflection tool and not a log.
- A routine is **your intuition, not a plan**: how you go about a pursuit, a task or a feeling,
  written down as you discover it and sharpened each time you run it. The wonder is in finding out how
  you operate.
- It is built on **recursive thinking**: any step can be broken into smaller steps until it is easy to
  start, and you work at whatever level of detail suits you.

**Against to-do apps:** their unit is a task that disappears when done, in a flat list, measured by
what's left and by deadlines. Here the unit is a piece of your own know-how that stays to be run again,
in a structure that opens to any depth, with no measure of what's left.

## 2. The model
**Four things exist.**
- **Step** — a line of your words.
- **Routine** — a named, ordered sequence kept in *reference* ("Your routines"). Each item is a step or
  another routine. It has one mark, the divider **↻ Repeat from here**: items above it run once (setup),
  items below repeat — **until you say done** (the default) or **a number of times** you set. A new
  routine has the divider at the top (it loops, the default); with no divider it runs once through. A routine can't contain itself.
- **Blank** — an optional input in a routine's name or steps ("Apply to ▢ employer"). It never asks:
  unfilled, it reads as its own word. Filling it is a choice, and values used before are offered.
- **Run** (the owner's "thread") — a routine being carried out: the routine, what filled its blanks, a
  stack of frames (each frame is a routine plus the place in it), and a definite end. A run keeps its
  blank's value throughout; it is never asked again inside the same run.

**Runs inside a run.** A run can hold any number of **child runs**: executions of a routine with
different values, each parked at its own step, carried out at your leisure — ten applications inside
one job hunt, each at a different point. Child runs can have their own. This is the app's concurrency:
there is no "waiting" state; a run is simply left at the step it was on.

**Nine verbs.**
| Verb | What it does |
|---|---|
| **Start** | Begin a run — a foundation, a routine, or something typed ("I'm going to…") — or Resume a paused one. Only when nothing is running. |
| **Next** | Move to the following item; at the end, back to the divider, or the frame finishes if there is none. |
| **Step in** | The current item is a routine: open its frame. (Or Next past it, working at that level.) |
| **Done** | End the frame you're in, at any point; the frame beneath moves on. Done at the top ends the run. |
| **Pause** | Hold the running run at its step and open its paused screen: Resume, Switch to another, or Stop. |
| **Stop** | Exit to home with nothing running. The run stays where it was. |
| **Break it down** | Turn a step into a sequence in place. Unnamed: it stays while it runs, then leaves. |
| **Group** | The reverse: choose neighbouring steps, name them, and they become one routine in reference. |
| **Copy** | A routine as a new routine, or a run as its own independent run. |

**A run is a working copy** (owner). The run holds context; the named routine stays as it is in
reference. Inside a run you can pop a loop off and put other steps in its place — a revision, or a way
out of how you'd planned to go about it — and only this run changes ("Keep in <routine>" makes a change
permanent). Every pass of a loop is "until you feel done": then you pop it, or you leave it there.
Popping an inner loop ends it **for this pass**; when the outer loop comes round again, its inner
routines are there again, fresh.

**One version per name; variation is explicit** (owner). A name always means one routine: on the
outer loop's next pass an inner routine is the routine as named, so nobody meets two versions of the
same thing. To vary, you **copy**: *Copy as a new routine* (keep the shape, tweak it, give it its own
name) or *Copy as its own run* (an independent run from the same place, with this run's revisions, tied
to nothing).

**One thing at a time, like a game** (owner; frames `n1`, `n2`, `n4`). At most one run is **running**.
- **Pause** (on the running screen) is a declaration that you can't go on, or can't right now. It opens
  the **paused screen** for that run: **Resume**; **Switch to** another paused run or something else —
  switching is only ever done here, explicitly; or **Stop**.
- **Switching starts at your own level** (frames `n5`, `n6`): the paused screen first offers the run's
  **siblings** (the other runs under the same parent); **↑ Up** shows the parent's level, and so on up
  to the foundations; **↓ Into it** goes back down. Shown as a **List** or as the **Map**, the same
  thing two ways.
- **Stop** is exiting to the **home screen**: nothing is running, you're done with the app for now. The
  run is not ended; it stays at its step under its foundation.
- **Home** ("Nothing running") is the Map with "I'm going to…" beneath it: every **foundation**,
  including one with nothing under it yet — a value or goal that works as a north star, with Start on
  it — and the paused runs under theirs, each with Resume.
- The app opens **where you left off**: the running screen, the paused screen, or home.
- **Done** is different from all three: it ends a frame or, at the top, the run itself.

**The prompt resolves from the map** (owner; frame `n3`). "I'm going to…" stays on the overview. As
you type, the closest things on your map are offered — paused runs to Resume, routines and foundations
to Start, and unnamed things you've done before — and beneath them "＋ New foundation: <your words>".
Nothing is started or created until you choose a row; Return takes the first row, which is always
visible and marked.

**Named and unnamed.** Only named routines live in reference. Anything unnamed (a typed one-off, a
breakdown) is gone from the lists when its run ends, but typing what it said finds it ("You've done
this before") to **Do it again** or **Name it, keep it** — retrieved by its words, not by a name.
**Editing a routine** changes it everywhere it is used; Save names where, and offers "Save as a new
routine".

**Never shown as words:** frame, thread, stack, pointer, parameter, loop variable.

## 2a. Rules the capabilities audit made necessary
**Safeguards, one rule.** Everything reversible gets an Undo and no confirm (Next, Done, removing a
step, ending a run, Group, edits, "Keep in <routine>"). A confirm appears only when an action reaches
beyond what is on screen — other routines, open runs, all data — and it still leaves an Undo where one
is possible. Erase and import-replace confirm and offer an export first.
**The first layer is nothing special** (owner, decided). What this document calls a "foundation" is only
the first layer of a stack — the first line of entry into a goal, a feeling, an intuition or something
quite concrete. It is **not a named concept and the word never appears in the app**. It is a routine
like any other, shown on home because it is where a stack starts: it can be renamed, reordered, copied
and removed like any routine (removing one with paused runs confirms and names them). Its run is the
base run; runs started with a value from inside it are child runs.
**Everything typed at home starts a new first layer** (owner, decided): the row reads "New: <your
words>". There is no separate "typed one-off"; unnamed things come only from breaking a step down.
**History and search are a set, not a log** (owner, decided). Every step and routine has one identity.
History lists ended runs — one line per run — never one line per pass of a loop. Search (in History and
from the prompt) returns each distinct step or routine once, however often it was done, saying where it
lives; a routine in the results can be opened to its steps. Nothing says how many times.
**Runs.** "End this run" is Done at the top; it leaves a history entry; open child runs are asked about
(end them too, or keep them under the foundation). Starting a routine that has a paused run asks Resume
/ Start another. Starting anything while a run is running asks to pause that one first. A run's blank
value can be corrected by tapping it. In See it all any step can be made "now".
**Editing is live, with Undo** — no Save button. The editor of a routine used in several places always
shows where it is used, with "Edit a copy instead".
**Data.** History entries, remembered values and unnamed sequences can each be forgotten. Import
replaces, after a preview, as today; Erase everything exists, with export first; multi-tab hand-over
stays automatic as today; the one Undo lasts until the next action.
**Kept from today's app:** Settings, export, import preview, the opening / blocked / reconnecting
states, the update banner, typed text surviving a reload, Esc and Back behaviour.
Search also covers what was logged before this design (lines and their notes).

## 2b. The runner (owner, decided 2026-11-24 — overrides earlier running-screen rules)
The running screen is about the step and nothing else: **one context line** (where you are, in words;
tapping it opens See it all), **the step as one block**, and **three buttons in fixed places — Pause,
Break it down, Next** (Next the one filled button, lowest). When the step is a routine the middle
button reads **Step in**: the same slot, the same meaning — go deeper. Nothing on this screen says
anything about repeating, shows "then", or carries tags; that belongs to the routine's Blocks / Read it.
**The way out is always there** (owner, decided; replaces the end-of-round screen, which is gone). The
context line carries a compact **Done** at its right end: it leaves the level you are in, for whatever
reason, and carries on with what comes next above it; at the top it ends the run. It leaves an Undo.
A repeating part comes round again silently on Next — no interstitial. Changing the words, going back
a step and See it all are behind a tap on the note.
**A repeat can have a number of times** (owner, decided). The divider's setting is **until I'm done**
(the default) or **a number of times**, chosen in the routine ("Repeat from here · 3 times"; Read it:
"Then repeat 3 times:"). A counted loop ends by itself after its last pass, like a part that runs once,
with "Finished <name> · Undo". **More, when you want it** (owner, decided). The runner's surface never shows the round. **Swiping up
on the runner — or tapping the note — opens one panel**: first where you are in this run ("Round 2 of
3" for a counted repeat, "Round 4" for an until-I'm-done one, nothing for a part that runs once; "then:
<next step>"; "This run only"), then the less-used actions (Change the words, Back a step, See it all,
Keep in <routine>). The round is context for the run in hand so you can judge whether to stop or go on;
it is never a total, never kept, never in Looking back. *(DESIGN.md's "no counts" is reworded: no
tallies of what you've done; a number you set, and your place in the current run, are context.)*

**The step is a sticky note** (owner, decided). On the runner the step is a fixed, roughly square note,
centred, with empty space above and below — the space is what gives it focus. It never stretches. **A
step should be short and concrete, and the design leads there without saying so:** a few words fit with
air; longer words step the type down; a step too long looks *full* (edge to edge, scrolling inside
rather than clipped — the person's words are never hidden, counted or warned about), and then **Break
it down carries a quiet mark**. The same happens where steps are written: a long line visibly outgrows
the note and "Break it down" is offered beside Add. "This run only / Keep in <routine>" lives in the
sheet behind the note, so the runner keeps to three buttons.

**Pending for the one final redraw** (owner: tweaks are batched and drawn once, at the end).
1. **The last step of a round is marked** (owner): on the runner, when the step is the final one in a
   repeating part, a small repeat mark sits in a corner of the note — the only loop hint on the
   surface. No words there; the pull-up panel says "Last step of the round". Spoken name: "Last step of
   this round". Nothing for a part that runs once.
2. The "how many times" stepper uses up / down arrows (‹ › are back and forward).
3. The round line in the pull-up panel is one size larger.
4. A short audit of the running states after the redraw (the final audit predates the new runner).
5. The font, once the owner has chosen.

**Under discussion: conditionals** (owner's question, 2026-11-24; nothing decided, nothing to draw).
The owner's need: reacting to things outside your control (feedback, something unavailable, something
you don't have yet). A stress test over fifteen uses — creative, intellectual, everyday — reasoned, not
tested with anyone, found:
- **A fork earns its place only when all three hold:** the answer comes from outside you; you can't know
  it when you start; and you have a settled reaction worth keeping. (A reply to an application, a
  teacher's or editor's feedback, an experiment's result, a shop not having something, an office being
  closed, an invoice not yet paid, paint not yet dry.)
- **Everything else is better solved by routine design:** your own judgment in the moment is a loop
  until done, Break it down or Done; something known when you start is a blank or a copied variant
  ("gym day"); "if I'm stuck" is a routine you start when you need it; an obvious reaction is a plain
  step.
- **Most of the valid cases are one shape — "has it happened yet?"** So the proposal is in two stages:
  (1) a **waiting step**: a step marked as waiting on something outside; pausing there shows on home as
  "waiting on: <step>" rather than merely paused — almost free, and it covers the majority; (2) later, a
  **question step**: two or three answers in your words, each leading to a step or routine and then
  rejoining (or leaving) — never conditions, never and / or / not, never nested.

**Conditions without an if** (a fresh agent's walk-through of the same scenarios, each done twice —
decided on return, and pre-planned; `.polish/product/review-B-11-no-if.md`; reasoned, not tested).
- **Most "conditionals" were loops**: an editor's notes, drying, build-and-test, an engaged line, an
  unpaid invoice are all "go round again, or Done" — repeat-until-done already holds them. A shop not
  having something is a step in words. Only the job application had truly different multi-step
  reactions.
- **What is missing is the wait, not the fork**: home cannot tell "I walked away" from "it's in someone
  else's court".
- **The owner's gut feeling holds, with two corrections.** What deserves keeping is the *reaction* (a
  routine) and the *wait* (a step) — not the choice between reactions, which cost nothing on return. And
  of-the-moment thoughts ("ask Sam, he referred me") were the most valuable things to write down before
  leaving; they belong to the run, never the routine. Keeping and pre-planning are different things.
- **Proposed, in two stages.** (1) A **waiting line**: an optional "Waiting for…" on the paused screen;
  home shows it after the run's step; on return the context line reads "Back from waiting for: …" until
  the first action. Three buttons unchanged; a run never moves by itself. (2) Later, **set aside**: "For
  when I'm back" lines on the paused screen — steps or routines — picked by a tap on return. Things done
  repeatedly graduate with what exists: Break it down, "Name it, keep it", "Keep in <routine>".
- **What it can't do**: Read it won't show the alternatives; nothing prompts an expected outcome;
  silence ("nothing for weeks") stays unhandled — and an if would not fix that without a clock.
- **To settle**: "waiting for" is words only (the design says there is no waiting state); several
  waiting lines on home edge toward a to-do list; a long reason on the context line; and whether it may
  say since when.

**Pausing and waiting** (owner, decided 2026-11-24; replaces "there is no waiting state").
- **Pause** says "I'm done with this for now" and may carry a **reason**. It reads as *unfinished*: home
  shows "paused at <step>" and the reason.
- **A wait step** is a deliberate step in a routine ("Wait for: the editor's notes"). Reaching it means
  everything before it is done, to your knowledge. A run resting there reads as *waiting*, not
  interrupted: home shows "waiting for <words>". Next on it means it has happened.
- **Reactions** belong only to a wait step, and exist only when each one holds steps or a routine
  ("Accepted → ▤ Announce it", "Revise → ▤ Apply the notes"). They are offered at that moment, when you
  say it has happened, and nowhere else. A wait step with no reactions just moves on. There are no bare
  yes / no answers, no conditions, no nesting.
- **Waiting while carrying on** (proposed): a wait step stops you only where it stands, so the routine's
  order does the work — put it right after what you set going to stop there, or later to carry on with
  the steps between and meet it where the result is needed. Optional, later: the wait step names the
  step that set it going, and from then until you reach it the pull-up panel and home say what is
  "out".
- **Two kinds of "at the same time", one test** (owner's distinction, confirmed). *Separate runs* are
  independent work: each has its own end, they never have to come back together, and you move between
  them by pausing. *Waiting inside one run* is dependent work: the pieces belong to one outcome and
  there is a point where the results are needed together — the wait step is that point. The test:
  **is there a step that can't happen until both are done?** If yes, it is one run with a wait step; if
  no, they are separate runs. Child runs (the same routine for different values under one parent) are
  independent of each other; they meet only if the parent has a wait step for them. "The order does the
  work" is confirmed: no further machinery.
- **How a wait looks where routines are written** (proposed to the owner). *The wait block* has its own
  shape — outlined, not solid, with a wait mark: nothing to do here, something to receive — and reads
  "Wait for: <words>". It is added with "Add a wait" (beside Add a blank / Add a routine) and moved like
  any step. *The open item that gets closed:* on any step, "Wait for this later…" makes a wait block
  tied to that step; a **rail** then runs down the side of the blocks from the step that set it going
  (open end) to the wait block (closed end), and the steps beside the rail are what you do meanwhile —
  the composer's version of two lines joining. The rail never crosses the Repeat divider, and a wait
  can only be tied to a step above it. *Read it* carries the join in words: "Put the dough to prove.
  While you wait: make the filling; clean up. Then wait for: the dough has doubled. Then: shape the
  loaf." *Reactions* sit folded under the wait block as labelled routine blocks, like a routine's own
  contents. No "any order" group (owner).
- **Several things out at once** (proposed; two examples to draw). *One wait closing several:* "Ask Dana
  for a reference" and "Ask Sam for a reference" each open a rail; "Tailor the CV" and "Write the cover
  letter" sit beside both; one wait block, "Wait for: both references are in", closes both — a wait may
  be tied to more than one step. *Waits closing at different points:* "Put the dough to prove" and
  "Start the stock" open two rails; "Wait for: the stock has reduced" closes one, "Wait for: the dough
  has doubled" closes the other further down. Each rail has its own lane beside the blocks, so rails
  never cross; three lanes at most — a routine needing more is offered Group, the same lead as a step
  that is too long. While running, the pull-up panel and home name what is out ("out: dough · stock"),
  never how many. Read it: "… While you wait for both: tailor the CV; write the cover letter. Then wait
  for: both references are in."
- **A wait may close several rails** (owner, decided).
- **Waits and levels** (owner, decided): **a parent can always wait on its children; a child knows
  nothing of its parent.** A step is marked as setting something going ("Wait for this later…"). If its
  wait is inside the same routine, the routine is self-contained: you are not through it until the wait
  is met. If it is not, **the routine itself becomes something that can be waited for**: wherever it is
  used, its block shows an open end, and that routine may close it with a wait — or leave it open, in
  which case *it* carries the open end outward in turn, as far as the first layer. A rail lives within
  one level and its open end is a step or a whole routine block; nothing reaches into an inner routine's
  steps, and nothing inside refers to what is outside. While running, what is out is listed at the level
  that can wait for it; leaving a routine with Done while something it set going is still out **asks**
  (owner, decided): **Let it go**, or **Keep it out** — it then stays as a free item, named in the
  pull-up panel and on home ("out: the wash") until you say it has happened or let it go.
- **Jump to…** (owner, decided, name included — not "Catch up", which implies being behind, when the
  case may equally be stopping mid-loop and starting from somewhere sensible next time). Things get done, and waits resolve, without the
  app. So a run can always be set to where you really are, without walking through the steps: from See
  it all (and from the paused screen) **Jump to…** shows the levels you are in — **start any level
  again** from its top (the outermost one you pick is the checkpoint), or **pick the step you are
  actually at** — and lists what is out with "It's happened" / "Let it go" on each. One Undo covers it.
  The app never does this by itself and never suggests that you are behind.
**Added to the final redraw:** leaving with something out (Let it go / Keep it out); Jump to…; free "out" items in the pull-up panel and on home; a routine block with an open end; the rail and its lanes; the reason on the paused screen and on home; a wait step in Blocks,
Read it and on the runner; reactions offered on a wait step; "waiting for" on home.

**From the expectations audit** (`.polish/product/audit-B-11-expectations.md`; journeys J34–J46 added).
*Already strong:* the runner and counted repeats meet or beat adjacent products; pause vs wait is sharper
than "on hold / blocked" elsewhere; Jump to… fixes a failure reviewers of routine apps describe; declining
timers, notifications and check-again dates is consistent. **Proposed answers to what it found unsettled
— the owner confirms or changes; marked ★ where the choice is really the owner's:**
1. On a wait step the three buttons keep their places: Next reads **"It's happened"**, the middle slot
   is dimmed, and the panel adds "Stop waiting for this" (makes it a plain step for this run).
2. A run resting on a wait: the paused screen is titled **Waiting**; home reads "waiting for <words>";
   an interrupted run reads "at <step>" with its reason.
3. **Decided (owner):** a wait says **since when**, in words only ("since Tuesday"), on home and the
   paused screen — useful context.
4. A thing that is out is named by **the words of the step that set it going** (optionally a shorter
   name you give it) — never words the app invents.
5. A step can be marked **"Sets something going"** by itself; "Wait for this later…" is that mark plus a
   tied wait.
6. **Decided (owner):** a reaction always holds **one or more steps or routines** — otherwise it has no
   point. Its least job is to record what you meant to do, so you don't have to recall it when the answer
   comes, especially on long-standing things. *(Still proposed:* after a reaction you rejoin after the
   wait; a reaction may instead be set to "then leave <routine>".)
7. The reactions offered always end with a plain **"Something else"** that just carries on.
8. A kept item whose run has ended sits on home **under its first layer**, with "It's happened" and "Let
   it go"; removing that first layer names such items.
9. Leaving with things out is **one sheet** listing each; "Keep it out" is the filled choice; Done's Undo
   covers it.
10. **Jump to…** is the one name: a step's "make it now" becomes "Jump here"; "Back to <step>" stays as
    the one-step shortcut.
11. The panel's order: where you are (round, last step, then, this run only) · what is out, each with
    its two actions · the actions. The fullest case is drawn first.
12. A move, Group or divider change that would split a rail is allowed, **unties it inside the same
    Undo**, and the notice says so.
13. Adding or removing a wait in a routine used elsewhere is named in the "Used in …" strip (it changes
    that routine's open end everywhere).
14. Jump to the start of a level is round one and fresh; picking a step keeps the round and this-run
    changes; the sheet shows what will be out.
15. A pause reason is edited in place, stays readable until the first Next after Resume, then is dropped;
    never in Looking back.
16. A reaction with nothing in it may exist while being written, drawn as unfinished, and is never
    offered on the runner.
17. A wait whose things have all happened is passed with an Undo notice if it has no reactions, and shown
    if it has.
18. The paused screen of a waiting run carries **"It's happened"**, which resumes at the reactions or
    the next step.
19. Stored data and the backup format carry every new kind (wait, reaction, rail, out item, reason,
    repeat number); the round is part of a run's place.
20. Slices: the runner, counted repeats, reason, plain wait and Jump to… with the first running slices;
    reactions next; rails, open ends, things out and the leaving ask last, as their own slice.
21. **Decided (owner): no "one more round".** A counted loop means its number; offering more would
    undo the routine's own design (one could as well set 999 and leave). To go back in, use Jump to….
22. Keys: one for the panel and one for Done; Esc closes the panel before it pauses; the swipe starts on
    the note or the band above the buttons; a full note scrolls.
23. "Pick it up again" for an ended run moves to the first build, since Done is now one tap away.
24. **This document contradicts itself in eleven places after the additions** ("there is no waiting
    state", the verb table, stored data, slices…). It is rewritten clean in the same pass as the final
    redraw.

## 3. Screens
**The complete map of what the app does is [`B-11-journeys.md`](B-11-journeys.md) (33 journeys and
their renders) with [`B-11-capabilities.md`](B-11-capabilities.md) (the essentials checklist).**
**The current mockups are the converged set, `.polish/product/b11-final/`: 107 states (the final audit's fixes and the sticky-note, three-button runner applied; the note is 256 px square, type 28 / 22 / 18 px by length, "full" past about 100 characters; `sheet-runner` shows before and after), `sheet-01` …
`sheet-13`.** It merges two independent redraws (`b11-mine/`, `b11-alt/`): where both agreed — home as
the tree with the prompt beneath, one step alone with its level in words, Next as the only filled
button, Paused with siblings / Up / Stop, "this run only" with Keep, the divider's grip and three-way
choice, Read it as foldable sentences, Group as select → name → Undo, errors that keep the words — the
design is taken as settled. The base is the second designer's layout (Next lowest and nearest the
thumb, Done furthest; Pause and See it all in the top bar; drawn pixel marks; picture choices; keyboard-
up states) with solid coloured blocks. Font: monospace vs sans is the owner's choice (`sheet-font`).
The table below is the earlier, partial set, kept for reference.

Mockups (local) in `.polish/product/b11-shots/`. Current: `z1`–`z8`, `a1`–`a4`, `c1`, `c4`, `d1`–`d3`
(overviews `z-sheet`, `a-sheet`, `c-sheet`, `d-sheet`). Earlier sets (`p`, `r`, `w`, `x`, `y`, `c2`,
`c3`) are superseded.

| Screen | Frames | What's on it |
|---|---|---|
| **Declare** (opening) | `d3`, `z2`, `c4` | "I'm going to…"; **Where you left things** — each run, the step it's at, Resume; Your routines; a field to type. Picking a routine with an open run asks Resume / Start over / Cancel. Typing finds routines and unnamed things by their words. |
| **Your routines** | `d1` | Each routine; Start, Start with… (fill a blank), values used before. |
| **Running** | `z7`, `z8`, `d2` | The current step, large and alone; "then: …"; where you are in words ("In Hand studies, inside Practise drawing"); Next (primary), Step in, Break it down, Done with <name> in fixed places; See it all, Switch. A blank in the path is tappable. |
| **A routine — Blocks** | `z3`, `a1`, `c1` | Steps as blocks; the divider with a grip and the loop as a bracket; a routine inside is one outlined block that expands in place (＋/−) or is focused on alone; ＋ A blank, ＋ A routine, and the field. |
| **A routine — Read it** | `z4`–`z6` | The same routine as plain sentences, generated: collapsed to its own items, expandable in place, or focused on one routine with its place in the parent. Also the large-text and screen-reader form, and what Copy as text exports. Walk through tries it without running it. |
| **Group** | `a2`–`a4` | Choose steps → name → one routine block, with Undo. |
| **Map** | `m1` | Every open run as a tree, rooted at its **foundation** (the bottom-most routine of the run): its child runs and where each was left; the one you're in marked "here" in words. Trees fold (＋/−). Tapping a run resumes it. Reuses the existing graph work (`src/domain/graph.ts` and the map components) redrawn as a tree; it is also a plain nested list for large text and screen readers. Nothing is ranked or counted. |
| **History** | (earlier `w8`) | Read-only, by day: runs you ended, and everything logged before this design. Secondary. |

**Look:** robotic, programmatic pixel accents — pixel font for screen titles only, chunky blocks, hard
shadows — with your words in a readable monospace that scales. Tetris is only the feel of the blocks.

## 4. What changes in the product's rules (with go)
- **Logging leaves the main flow** (the log box, loose lines, "Return saves a line"); history is a
  separate, read-only review. The night sky, hills, lantern, constellations, lit map, rise screen,
  search stars and the "I'm not sure" door retire; their routes redirect to Declare.
- **Kept:** no streaks, counts, deadlines or notifications; nothing created without a tap; Reduce
  Motion; export; on-device only.
- **Opt-in, off by default** (owner): "How did this feel?" after a step, and a timer that learns your
  own pace and says in the app "this ran long for you — break it down?". This reverses "no timers" for
  those who turn it on. Not in the first slices.
- DESIGN.md and STRATEGY.md are rewritten around sections 1–2.

## 5. Stored data (Full tier)
| Today | Becomes |
|---|---|
| whys / wanders (threads), a wander's `next` | retired as a concept (owner); kept in storage and export, shown only in history |
| activities (logged lines), `lit` lines | history, read-only (nothing deleted) |
| heat | not shown |
New: routines (ordered items, divider position, blanks), runs (routine, blank values, frame stack with
places, parent run, ended-at), unnamed sequences kept for search, values used per blank. A migration
keeps every record.

## 6. Build requirements (from four UI audits; all binding)
**Acting on a step.** Next, Step in, Break it down and Done keep fixed places on every screen (Step in
dimmed on a plain step). One filled primary per screen. Done always names what it ends, and the level
is in words, never colour alone. Next, Done, Group and edits each leave an Undo that stays until the
next action, with a spoken announcement and focus moved to the new step. Restart is apart from Resume,
names its target and has an Undo; nothing overwrites a saved place silently.
**Nothing by gesture alone.** Every step has a visible ⋯ (make it now, move up/down, repeat from here,
send, remove); the divider has a 48 px grip and the same move in menus; drag and long-press are only
shortcuts. The divider's three states (top, absent, between) are all drawn.
**Words and marks.** No explanation text on screens and none in brackets on buttons. One mark per
meaning: ▶ only for *now*, ↻ only for "repeats", ▤ for a routine, › for going forward, ＋/− for
expand/collapse. No counts ("3 inside"); ordinals in Read it are positions, not progress.
**Reading and size.** Buttons, labels and dates in the readable font at ≥ 16 px; targets ≥ 48 px;
layouts reflow at 200 % text and with the keyboard up; screen titles are headings; Read it uses real
headings and nested lists and names what repeats ("until you're done with Hand studies").
**Suggestions and blanks.** Your typed text is nearest the field; routines offered are 48 px and read
as things to add; a reusable routine is named as such for screen readers. A routine keeps one colour.
**Motion.** Under Reduce Motion every change is instant.

**Final audit of the converged set** (`.polish/product/ui-audit-B-11-final.md`): *ready to build from,
with named fixes.* All 97 states present; no banned words; contrast computed. Rules it adds, binding:
- **Amber always means the safe or forward choice**; on a confirm it is the one that keeps or cancels.
- **Red and "!" only for errors and the irreversible.** A reversible removal is an ordinary button
  followed by Undo, and every Remove names its reach ("Take off home", "Remove this step", "Remove
  everywhere").
- **One wording per meaning:** a paused run reads "at <step>"; ending a run is "Done with <name>"
  everywhere; "Switch" only between paused runs; "Start" for beginning; the toggle is "Map | List".
- **A routine's own run sits on its head row** on home (its "at <step>" and Resume where Start
  otherwise is), never as one of its children.
- **Looking back is one screen:** by day, search at the top, "Forget this" per entry, "Clear all" in the
  screen's menu with a confirm.
- **Words are edited one way:** tap them, edit in place, Undo.
- **Your routines rows carry the routine menu** (Open, Rename, Copy as a new routine, Copy as text,
  Remove everywhere).
- **Focus has its own ring**, distinct from selection; an error never dims the words it is about; an
  error's button always fixes it.
- A blank's value shows filled for the whole run. Counts stay only in the import preview.
- To write down at build: the Reduce Motion list, accessible names for every repeated button ("Resume
  Apply to Acme"), and the keyboard-and-Back table (J27).
*Not to be touched:* the Running screen, the notice slot, the picture choices, the block vocabulary,
"Used in … / Edit a copy instead", Paused, Read it.

## 7. Reviews so far
- **UI audits** ×4 (`ui-audit-B-11*.md`) → section 6. The `a`, `c`, `d` frames are not yet audited.
- **Persona panel** on the first draft (`panel-B-11-{1,2}.md`): favoured pixel accents, a parent that
  stays until you say so, no caps, no dimming; the Returner's worry — a stale "now" after weeks away —
  is met by "Where you left things" making no claim about today.
- **Neutral review** (`review-B-11-neutral.md`, a job hunt to day ten). Strong: the one-step run screen
  with nothing showing how much is left; the divider checked against Read it; Break it down and Group
  as a pair; the Resume card after days away. Its tensions led to blanks, child runs, "found by its
  words", and Done vs Switch.
- **Implementation review** (`review-B-11-impl.md`, against the code). *Sound:* one pure engine (run +
  verb → next run) can serve Running, Walk through, Undo and most tests; a run's frame stack as one field
  of one record fits today's whole-record writes and single undo slot; drag as only a shortcut.
  *Blind spots:* (1) storage names its two collections by hand — journal, tab hand-over, undo, fallback,
  export and import would silently drop routines and runs unless each is extended; (2) "a why with
  wanders = a routine holding routines" is not in the data (links are derived from activity counts), and
  converting on migration would create things without a tap; (3) once the new schema lands, older builds
  are locked out, so "reversible" can't mean reverting a deploy; (4) data actions are refused while a
  returning page takes its data back — exactly when someone presses Next; (5) a looping run never ends,
  so history stays empty and Declare asks Resume / Start over daily; (6) frames `z1`, `z7`, `z8`, `c1`
  still show Wait / Waiting.

## 8. Open
1. Child runs: where they are started and listed (inside the parent's Running / See it all, and folded
   under the parent on Declare); what Done on a parent does while children are open.
2. Does an inner routine's blank take the outer run's value when they share a word?
3. First-ever open (nothing in reference); the Break-it-down screen and the edit-everywhere Save on the
   current frame set; how "Choose steps" is entered.
4. Later, only if it can be made simple: a step that waits while the rest of its sequence carries on.
5. Whether history records anything beyond ended runs.
6. (Settled: on the next pass it is the routine as named.)
7. (Settled: wanders retire; not copied.)
8. (Settled: every foundation is shown, empty ones too.)
9. (Settled: Stop exits to home; Pause is where you switch.)

## 9. Slices (as the implementation review recommends)
0. **Groundwork** (M, Full, no visible change): storage driven by one list of collections instead of two
   named by hand; export format 2; then the new tables, **added only** — nothing converted.
1. **Declare, Running and Break it down** (L, Full) with a plain editor (no drag, no routines inside
   routines yet), alongside today's home. Wanders are not carried across (owner: the concept
   retires); the old home keeps working beside the new screens until the last slice. The smallest slice that lets the
   owner feel the idea on their own data.
2. **Reuse and the Map** (M–L, Full): the Map as a tree of open runs; routines inside routines, Group, found-by-its-words, edit-everywhere; Blocks
   folding, the divider's grip, Read it.
3. **Blanks** (M, Full), then **child runs** (M–L, Full), separately.
4. **History; retire the sky and logging** (L), only after the owner has lived with 1–3; DESIGN.md and
   STRATEGY.md rewritten.
**Rules to pin at build:** frames hold item ids, and an edit repairs any frame it strands inside the same
Undo; removal is soft; a breakdown belongs to the run, with "Keep in <routine>" to make it permanent;
one small event is recorded per verb from slice 1; Next is queued while a page reconnects; a divider at
the bottom means none; Group and "Name it" add no loop; Step in opens a frame, Start with a value opens
a child run.

## Decision requested
**D-18:** Go on B-11 — slices 0–3 alongside today's home, then slice 4 after living with it?
**Go** / **Go, but change …** / **Not now**.
