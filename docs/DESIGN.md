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
  runner, and coming back to the app must show at a glance which of the two you were doing. As built
  today the runner hosts both; that is a known fault (roadmap P-90), not a rule to copy.

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
  round), the changes made for this run only, a pause reason, and a definite end. **A run is a
  working copy**: inside it you can add, remove or reword for this run only; "Keep in <routine>"
  makes a change permanent.
- **A breakdown** *(built)*: Break it down turns the current step into a sequence, for this run,
  unnamed. Unnamed things are not listed, but typing their words finds them.
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
**Start, Resume, Pause, Done, Next** (owner, §9b). They must read as one set; no word is chosen for
how it sounds alone. A paused run is "paused".
- **Start** begins a run. **Next** goes to the next step; on a wait step it reads **"It's
  happened"**. **Break it down** goes deeper and reads **Step in** when the step is a routine (same
  slot, same meaning).
- **Done** leaves the level you are in, for whatever reason, and carries on with what comes next
  above it; at the top it ends the run. It names what it ends.
- **Pause** says "I'm done with this for now" and may carry a reason. The paused screen shows the run
  with **Resume**, and beneath it whatever else can be resumed — siblings first, then up a level —
  each with its own Resume. There is no "Switch".
- **Home** on the paused screen replaces "Stop". It asks first ("Stop <name>?"; the run stays where
  it is; Cancel is the filled button).
- **One wording per meaning:** a paused run reads "at <step>"; a waiting one "waiting for <words> ·
  since <day>"; a run with no blank reads "· since <day>".

## Interaction
- **One thing runs at a time.** At most one run is running. To take up another you pause first. The
  app opens where you left off: the runner, the paused screen, or home.
- **Home asks first, and home is tiles** *(built)*: everything you have open is a tile, coloured
  like its note — the name, where it is, and Resume or Start. Tiles stay in a fixed order *(as built — a builder's ruling, not an owner decision)* (when each
  was first made); nothing is ranked. The prompt **"I'm going to…"** searches the tiles as you type,
  then routines and unnamed things, with **"New: <your words>"** last. Home is titled "Running" when
  a run is running and "Nothing running" otherwise.
- **Nothing is created or started without a tap.** Typing starts nothing until a row is chosen
  (Return takes the first row, which is always visible and marked). The app never jumps by itself.
- **The runner is the step and nothing else** *(built)*: a context line (the level and its parent,
  in words; tapping it opens See it all) with Done; the step as a fixed, roughly square sticky note;
  three buttons in fixed places — Pause, Break it down / Step in, Next (the one filled button,
  lowest). Nothing about repeating is on the surface except one small mark on **the last step of a
  round**. A repeating part comes round again silently; a counted loop ends by itself. There is no
  "one more round".
- **The note always fits**, keyboard up included: the type steps down first, then the note shrinks
  to the space. Words too long for it scroll inside it and Break it down carries a quiet mark.
- **The person's words are never clipped, counted or warned about.**
- **The pull-up panel** *(built)*: swiping up on the runner or tapping the note. It holds where you
  are in this run (the round, "Last step of the round", "then: <next step>", "This run only") and
  the actions: Change the words, Back to <step>, Jump to…, See it all, Keep in <routine>.
- **Jump to…** *(built)* sets the run to where the person really is: the start of any level they are
  in (round one), or a particular step (the round is kept). The app never suggests you are behind.
- **The edge keeps extending** *(built; §9c)*: reaching the end of what has been worked out does not
  finish the run. The runner asks for the next small step, and the step added is kept in the
  routine. Done still ends the run. A routine set to "ends here" finishes on its last Next.
- **A run leaves the routine better** *(built; §9c)*: leaving a level in which something was changed
  for this run shows those changes once, each with Keep (and Keep all). It appears only when there
  is something to keep and never blocks leaving.
- **See it all is the run, not the routine** *(built — from a proposal, not an owner decision)*: titled "This run of <name>", it looks
  different from the routine editor, and what you change there is for this run only.
- **The routine editor** *(built, plain)*: a list of steps and wait steps, move up / down, the
  Repeat divider, "ends here", rename, remove. Editing is live, with Undo — no Save. Blocks, Read
  it, Walk through, rails and drag are designed, not built yet.
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
  notice. One pressed verb (Next, Done, Pause, Resume, Step in) is kept and applied once the data is
  back, only if the run is unchanged. Typed text stays in its field and is never dropped.
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
