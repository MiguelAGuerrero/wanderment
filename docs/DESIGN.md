# Design rules

These are the product rules for the app this repository now holds. They are distilled from the
design, [`product/briefs/B-11-context-stacks.md`](product/briefs/B-11-context-stacks.md) (with its
[journeys](product/briefs/B-11-journeys.md) and [capabilities](product/briefs/B-11-capabilities.md)).
Change them deliberately.

**Where two sources disagree, this order wins:** the owner's notes
([`product/owner-notes.md`](product/owner-notes.md), newest first), then B-11 §9b and §9c, then this
file, then the rest of B-11. B-11 marks some items *(proposed)*: those are a designer's answer to a
gap, not the owner's decision, and are not rules until the owner takes them.

**The app has no name yet** (owner, 2026-11-24: "let's not worry about the name for now"). The
repository, the database and the storage keys are still called `wanderment`; that is a leftover, not
a name. Write "the app".

Each thing below is marked **built** (in the app today) or **designed, not built yet** (in B-11, not
in the code). Never describe the second kind as existing, in the app or in a report.

## What it is
**Not what you have to do. How you do it.** The app keeps a person's *ways* of doing things —
routines in their own words — and runs them with the person, one small step at a time.
- You open it to **declare**: "I'm going to … now." It is not a log and not a reflection tool.
- A routine is the person's own know-how, written down as they discover it and sharpened each time
  they run it. It stays to be run again; it is not a task that disappears when done.
- Any step can be broken into smaller steps until it is easy to start.
- A routine grows and changes as it is used (§9c) — but **planning and running are two different
  activities and must never look alike** (owner, first real use, 2026-11-25): "plan, execute, plan,
  execute is the type of context switching I had in mind, but the app blurs the two". Adding a step and
  breaking one down are planning; they are welcome mid-run, in a view that is unmistakably not the
  runner, and coming back to the app must show at a glance which of the two you were doing. *(Built,
  P-90: planning has its own surface, **Plan**; the runner hosts none of it.)*

## Model
- **Step** *(built)*: a line of the person's words.
- **Wait step** *(built, plain)*: a deliberate step, "Wait for: <words>". Reaching it means
  everything before it is done, to the person's knowledge. A run resting on one reads as *waiting*,
  with since when, in words only.
- **Routine** *(built)*: a named, ordered sequence. Each item is a step, a wait step or another
  routine. It has one divider, **Repeat from here**: items above run once, items below repeat —
  **until I'm done** (the default) or **a number of times** the person sets. With no divider it runs
  once through. A routine can't contain itself. Its end is either open (the edge, below) or "ends
  here".
- **Run** *(built)*: a routine being carried out — where the person is at every level (including the
  round), which of the two it was left doing (running, or planning), a pause reason, and a definite
  end. **A change made in Plan changes the routine** (owner, B-12): nothing is "for this run only",
  and there is no Keep. (Runs stored before P-90 may still carry this-run changes. They are read as
  before; the first time Plan is opened on such a run they are kept in its routine, in one write,
  with a notice saying so and an Undo. Never at load.)
- **A breakdown** *(built)*: Break it down, on a step's menu in Plan, turns that step into a sequence
  of its own, unnamed, in the routine. Unnamed things are not listed, but typing their words finds
  them.
- **One version per name.** A name always means one routine. To vary, copy *(copying: designed, not
  built yet)*.
- **Designed, not built yet:** **blanks** (an optional input in a routine's name or steps, "Apply to
  ▢ employer"; it never asks); **child runs** (the same routine for different values, each at its own
  place); **reactions** (a named outcome on a wait step that holds one or more steps or routines —
  never empty, never a bare yes/no); **things set going** ("Wait for this later…" on a step makes a
  wait tied to it; until it is waited for, that thing is listed as "waiting on: <the wait's words>");
  adding an existing routine into another in the editor, and Group. Running a routine that is
  already an item (Step in) is built.
- The first layer — a routine shown on home — is nothing special and has no name in the app.
- **Never shown as words:** frame, thread, stack, pointer, parameter, foundation, async, promise.

## The verbs
**Start, Resume, Pause, Done, Next** (owner, §9b) — and **Plan** (owner, B-12). They must read as one
set; no word is chosen for how it sounds alone. A paused run is "paused"; a run in Plan is
"planning", never "paused".
- **Start** begins a run (it is not offered for a routine with no steps yet). **Next** goes to the
  next step; on a wait step it reads **"It's happened"**.
- **Plan** *(built)* goes to the Plan surface: the word going in is Plan, the word coming out is
  **Resume at <step>** (Start for something never run). On the runner it is the middle button, and
  reads **Step in** when the step is a routine (same slot). Entering Plan pauses the run in the same
  moment: nothing runs while you plan.
- **Done** leaves the level you are in, for whatever reason, and carries on with what comes next
  above it; at the top it ends the run. It names what it ends. It exists on the runner and — in Plan
  — only at the edge.
- **Pause** says "I'm done with this for now" and may carry a reason. The paused screen shows the run
  with **Resume**, and beneath it whatever else can be resumed — siblings first, then up a level —
  each with its own Resume. There is no "Switch".
- **Home** on the paused screen replaces "Stop". It asks first ("Stop <name>?"; the run stays where
  it is; Cancel is the filled button).
- **One wording per meaning:** a paused run reads "at <step>"; a waiting one "waiting for <words> ·
  since <day>"; a run with no blank reads "· since <day>"; a run in Plan reads "planning · at <step>"
  ("planning · nothing next yet" at the edge), on its tile, in Plan and on the paused screen.

## Interaction
- **One thing runs at a time.** At most one run is running. To take up another you pause first. The
  app opens where you left off, in the mode you were in: the runner, Plan, the paused screen, or home.
- **Home asks first, and home is tiles** *(built)*: everything you have open is a tile, coloured
  like its note — the name, where it is and in which mode, and its buttons in words: "at <step>" with
  Resume, or — for a run left in Plan, drawn dark like the Plan surface — "planning · …" with Plan;
  Start for a routine with nothing going. Every tile not in Plan also has **Plan** (a routine with no
  steps yet has Plan only). After the tiles comes a **New** tile. Tiles stay in a fixed order *(as built — a builder's ruling, not an owner decision)* (when each
  was first made); nothing is ranked. The prompt **"I'm going to…"** searches the tiles as you type,
  then routines and unnamed things, with **"New: <your words>"** last. **New makes the routine only**
  — no run until Start — and opens its Plan with the name filled and the open row focused; the New
  tile does the same with the words in the prompt (with none, it takes you to the prompt). Home is
  titled "Running" when a run is running and "Nothing running" otherwise.
- **Nothing is created or started without a tap.** Typing starts nothing until a row is chosen
  (Return takes the first row, which is always visible and marked). The app never jumps by itself.
- **The runner is the step and nothing else** *(built)*: a context line (the level and its parent,
  in words — not a control) with Done; the step as a fixed, roughly square sticky note; three buttons
  in fixed places — Pause, Plan / Step in, Next (the one filled button, lowest). Nothing is planned
  or typed here. Nothing about repeating is on the surface except one small mark on **the last step
  of a round**. A repeating part comes round again silently; a counted loop ends by itself. There is
  no "one more round".
- **The note always fits**, keyboard up included: the type steps down first, then the note shrinks
  to the space. Words too long for it scroll inside it and Plan carries a quiet mark (breaking a
  step down is planning).
- **The person's words are never clipped, counted or warned about.**
- **The pull-up panel** *(built)*: swiping up on the runner or tapping the note. It holds where you
  are in this run (the round, "Last step of the round", "then: <next step>") and the two actions
  that move you without planning: Back to <step> and Jump to….
- **Jump to…** *(built)* sets the run to where the person really is: the start of any level they are
  in (round one), or a particular step (the round is kept). The app never suggests you are behind.
- **Plan is the sequence, and looks nothing like the runner** *(built; B-12 frames v1, v2, v4, v5,
  v8; P-90)*: a light band pinned at the top with the word PLAN and **Home** in one fixed place on
  every Plan screen; the routine's name as the heading; "planning · at <step>"; the steps as outlined
  rows, the one you were on marked **HERE** (the white outline means HERE and nothing else); "Repeat
  from here" as a row of its own with visible Move up / Move down and its menu (until I'm done or a
  number; remove it); an "Add a step" row. A step's menu is in words — Change the words, Add a step
  after, Break it down, Make it a wait (Make it a step), Move up, Move down, Remove this step, Close —
  and words are typed in place. One press moves one row: next to "Repeat from here" a step passes it
  and nothing else moves. The routine's own menu holds its name, "Ends here", adding "Repeat from
  here", and — with no run going — Remove. A routine used as a step is a row that opens; what is
  changed inside it changes that routine. **Every change changes the routine**, is followed by a
  notice naming it with an Undo that stays until the next action (one Undo, the last change's), and
  repairs any run it touches: removing the HERE step puts HERE on the next step, else the one
  before, else at the edge — a run is never ended by an edit. The ONE filled button is **Resume at
  <step>**, which goes back exactly where you were (Start for a routine with no run, once it has a
  step). Nothing in Plan says Next. Home from Plan changes nothing: the run stays in Plan and its
  tile says so. A screen reader hears "Plan: <routine>" on arriving (focus on the heading) and
  "Running: <step>" on returning (focus on the note).
- **The edge is Plan's** *(built; §9c, B-12 v5)*: reaching the end of what has been worked out does
  not finish the run and never shows a blank note. The run is in Plan — "planning · nothing next
  yet", the open row focused, no filled button — and **Done** has its own slot in the band, beside
  Home, never in Home's place. A step added there is the routine's and is where the run stands. Done
  ends the run, with Undo. A routine set to "ends here" finishes on its last Next.
- **See it all and the plain routine editor are gone** *(P-90)*: both are Plan now (their old
  addresses land there). The break-down sheet, the runner's blank "next small step" note and the
  Keep sheet are gone with them.
- **Not built in Plan yet** (B-12, each needs its own item): declaring a routine where you stand
  ("Make a routine from here…"), "Also in" for a routine used elsewhere, inputs ("With"), reordering
  by drag, more than one Undo, adding "Repeat from here" to a routine nested as a step from its
  parent's Plan.
- **Designed, not built yet:** Your routines, Looking back ("a set, not a log": one line per ended
  run), the Map of a tile's contents, the leaving ask for things still waited on ("Still waiting" /
  "Let it go"), "Stop waiting for this". **Erase everything is not built and not decided** as an
  item; build none of these without their roadmap item.

## Rules
- **Minimalism (owner).** The app should communicate itself. Use an icon only where it is
  conventional and unambiguous; otherwise the word. Words are for form labels, button labels that
  need them, and the person's own text. **No instructional or explanatory text, no preamble, no
  disclaimers** — needing one is a sign the design has failed to say it. Not to be applied
  overzealously: a label that prevents a mistake stays.
- **Borrow established conventions** from adjacent productivity apps for layout, spacing, icon and
  settings placement and component choice, so the app meets expectations before it asks anyone to
  learn.
- **Safeguards.** Everything reversible gets an **Undo and no confirm**. A confirm appears only when
  an action reaches beyond what is on screen (other routines, open runs, all data), and every Remove
  names its reach.
- **An ask and a confirm are different** (§9b). In an **ask** every choice goes forward and the
  filled one carries on. In a **confirm**, Cancel is filled (stopping, removing everywhere).
- **The filled button is the safe or forward choice**, one per screen or sheet. **Red and "!" only
  for errors and the irreversible.**
- **One vocabulary, and one wording and one mark per meaning.** A mark never means two things (now,
  repeats, routine, wait, forward, fold, more, pause each have their own).
- **Nothing is counted against you.** No streaks, deadlines, notifications or tallies of what you
  did; nothing shows how much is left; no timers. A repeat number you set and the round you are on
  are context, **shown only in the panel**. Counts appear otherwise only in the import preview.
  "Since" is in words (a day's name or a date), never a running count.
- **Acting.** Fixed places for the runner's buttons. The level is in words, never colour alone.
  Nothing by gesture alone: every drag, swipe and long-press has a visible control.
- **Accessibility.** Targets ≥ 48 px; body text ≥ 16 px; layouts reflow at 200 % text and with the
  keyboard up; screen titles are headings; icon-only and repeated buttons have full spoken names
  ("Resume Apply to Acme"); focus has its own ring and is moved sensibly after Next, Done, Undo and
  a sheet closing; an error never dims the words it is about. Under Reduce Motion every change is
  instant.
- **The data stays on the device.** There is no account and no server. **Export** writes everything
  to a file and **Import** reads one back, with a preview, replace only. Settings (built) holds
  them, with where the data lives and the version.
- **Stored data is never deleted or converted to fit a design.** New kinds of record are added;
  old ones are kept (see *Before*).

## The look
Dark. Pixel accents with a programmatic feel: a pixel font for screen titles only, chunky blocks,
hard shadows. The person's words are in a clean sans face (IBM Plex Sans; the owner may overrule the
font — B-11 §10). A routine's colour is the colour of its tile and its note. Menus and pickers are
bottom sheets; a notice with Undo follows anything reversible; a centred dialog appears only when an
action reaches beyond the screen.

## One copy at a time (web, P-29)
- A page holds the data only while it's visible. A page that doesn't hold it (coming back to a tab,
  reconnecting, or waiting for another copy) **can't change it**: changes are refused with one quiet
  notice. One pressed verb (Next, Done, Pause, Resume, Step in, Plan) is kept and applied once the
  data is back, only if the run is unchanged. Typed text stays in its field and is never dropped.
  A run's screens follow the data: Plan pressed in one tab puts the other tab's runner in Plan when
  it takes the data back, and Resume the other way round.
- The app's own states stay: opening, can't open the data (with a download of this browser's local
  copy), another tab took over, reconnecting, a new version is ready, saved by a newer version.
- Known edge cases (accepted):
  - Desktop, two visible windows: reloading (or updating) the window in use while the other is waiting
    hands the data to that window; the reloaded one waits, saying so, until the other is in the
    background or closed.
  - A first launch whose open keeps failing with WebKit's bare "The object is in an invalid state."
    waits, telling the person another copy may be open, and never falls back to local storage: falling
    back over files another copy holds could fork the data. If WebKit uses that text for another reason,
    the advice is wrong until the WebKit lane (P-05) shows it.

## Before
Until 2026-11-25 this repository held Wanderment: a night-sky themed log in which a person wrote one
line about something they did, attached it to "wanders" (ongoing pursuits) and "whys", and saw lines
and stars on a live map. The owner retired it ("get rid of the old app entirely. Retired.") and its
screens and routes are removed. **Its data is kept**: wanders and activities stay in storage, in
every export and through import, and are not shown anywhere yet (B-11 places them in Looking back,
which is not built). **Its rules no longer apply** — "capture is sacred", the composer, the sky, the
sheet, heat and the rest are history, readable in this file's git log and in briefs B-01 to B-10.
