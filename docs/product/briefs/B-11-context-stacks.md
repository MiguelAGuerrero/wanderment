# B-11 — Your ways of doing things, run one step at a time

**Status:** proposed · **Decision:** D-18 · **Theme:** Seeing flow / Warm return · **Date:** 2026-11-24
**Supersedes:** B-10 (D-17, never decided) and the night-sky visuals of B-07/B-08/B-09.

This is the consolidated design, rewritten after the last round of decisions. Every decision is the
owner's, from `docs/product/owner-notes.md` (entries dated 2026-11-24). Companions:
[`B-11-journeys.md`](B-11-journeys.md) (every journey and state to draw) and
[`B-11-capabilities.md`](B-11-capabilities.md) (the essentials checklist). How it got here is in this
file's git history; reviews and audits are in `.polish/product/` (local). Items marked *(proposed)* are
the designer's answer to a gap and await the owner; everything else is decided.

## 1. What it is
**Not what you have to do. How you do it.** Wanderment keeps your *ways* of doing things — routines in
your own words — and runs them with you, one small step at a time.

- You open it to **declare**: "I'm going to … now." It orients you with almost no effort to start. It is
  not a reflection tool and not a log.
- A routine is **your intuition, not a plan**: how you go about a pursuit, a task or a feeling, written
  down as you discover it and sharpened each time you run it.
- It is built on **recursive thinking**: any step can be broken into smaller steps until it is easy to
  start, and you work at whatever level of detail suits you.
- **Against to-do apps:** their unit is a task that disappears when done, in a flat list, measured by
  what's left and by deadlines. Here the unit is a piece of your own know-how that stays to be run
  again, in a structure that opens to any depth, with no measure of what's left.

## 2. The things that exist
- **Step** — a line of your words. Short and concrete; a long one is a reason to break it down.
- **Wait step** — a deliberate step, "Wait for: <words>". Reaching it means everything before it is
  done, to your knowledge. It may hold **reactions**.
- **Reaction** — a named outcome on a wait step that holds **one or more steps or routines** (never
  empty, never a bare yes/no). Its least job is to record what you meant to do when the answer comes.
- **Routine** — a named, ordered sequence kept in *reference* ("Your routines"). Each item is a step, a
  wait step or another routine. It has one divider, **Repeat from here**: items above run once (setup),
  items below repeat — **until I'm done** (the default) or **a number of times** you set. A new routine
  has the divider at the top; with no divider it runs once through. A routine can't contain itself.
- **Blank** — an optional input in a routine's name or steps ("Apply to ▢ employer"). It never asks:
  unfilled, it reads as its own word. Filling it is a choice; values used before are offered.
- **Run** — a routine being carried out: the routine, what filled its blanks, where you are in it (at
  every level, including the round), what is out, any changes made for this run only, and a definite
  end. A run keeps its blank's value throughout. A run can hold **child runs**: the same routine for
  different values, each at its own place.
- **Setting something going** — a step may be marked as setting something going (dough proving, a
  request sent). Until it is waited for, that thing is **out**. An out item is named by the words of
  the step that set it going (optionally a shorter name you give it) — never by words the app invents.
- **The first layer** — a routine that a stack starts from, shown on home. It is nothing special and
  **has no name in the app**: it is renamed, reordered, copied and removed like any routine.

**Named and unnamed.** Only named routines live in reference. A breakdown made while running is
unnamed: it stays while it runs, then leaves the lists, but typing what it said finds it ("You've done
this before") to **Do it again** or **Name it, keep it**.
**One version per name.** A name always means one routine. To vary, **copy**: as a new routine, or a run
as its own run.
**A run is a working copy.** Inside a run you can add, remove, reword or reorder for *this run only*;
"Keep in <routine>" makes a change permanent. On a loop's next round an inner routine is the routine as
named.
**Never shown as words:** frame, thread, stack, pointer, parameter, foundation, async, promise.

## 3. Running
### 3.1 The runner
The running screen is about the step and nothing else.
- **A context line** at the top: the level you are in and its parent, in words (tapping it opens See it
  all), with a compact **Done** at its right end. Done leaves the level you are in, for whatever
  reason, and carries on with what comes next above it; at the top it ends the run. It leaves an Undo.
- **The step as a sticky note**: a fixed, roughly square note, centred, with empty space above and
  below. It never stretches. A few words fit with air; longer words step the type down; a step that is
  too long looks *full* (edge to edge, scrolling inside, never clipped, counted or warned about), and
  then **Break it down carries a quiet mark**. The same lead appears where steps are written.
- **Three buttons in fixed places**: **Pause**, **Break it down** (reads **Step in** when the step is a
  routine — same slot, same meaning: go deeper) and **Next** (the one filled button, lowest, nearest the
  thumb).
- **Nothing else on the surface.** No "then", no tags, nothing about repeating — except one small mark
  in the note's corner on **the last step of a round** (spoken: "Last step of this round").
- **A repeating part comes round again silently** on Next. A counted loop ends by itself after its last
  round, like a part that runs once: the parent's next step, with "Finished <name> · Undo". There is no
  "one more round" (a counted loop means its number; to go back in, Jump to…).
- **On a wait step** the note is outlined with the wait mark. The buttons keep their places: Next reads
  **"It's happened"**; the middle slot is dimmed. If the wait has reactions they are offered then, each
  as a button, always ending with a plain **"Something else"** that just carries on. After a reaction's
  steps the routine simply carries on with whatever comes next in its sequence — there is no "rejoin"
  or "leave" switch; an outcome that only means "stop" needs no reaction: you press Done.

### 3.2 The pull-up panel
Swiping up on the runner, or tapping the note, opens one panel (a grabber shows it pulls). In order:
1. **Where you are in this run** — the round ("Round 2 of 3"; "Round 4" for until-I'm-done; nothing for
   a part that runs once), "Last step of the round", "then: <next step>", "This run only".
2. **What is out** — each item by name, with **It's happened** and **Let it go**.
3. **Actions** — Change the words, Back to <step>, **Jump to…**, See it all, Keep in <routine> (when
   there is a this-run-only change), and on a wait step "Stop waiting for this" *(proposed)*.
The round is context for the run in hand — never a total, never kept, never in Looking back.

### 3.3 One thing at a time
At most one run is running.
- **Pause** says "I'm done with this for now" and may carry a **reason** (edited in place; readable
  until the first Next after Resume, then dropped *(proposed)*). It opens the **paused screen**: Resume;
  Switch to another — offered at your own level first (siblings), then **Up** to the parent's level and
  on to everything you have going, as a List or a Map; or **Stop**.
- **Stop** exits to home with nothing running. The run stays where it was.
- **A paused run reads as unfinished**: "at <step>" and its reason. **A run resting on a wait step reads
  as waiting**: its paused screen is titled "Waiting", home reads "waiting for <words> · since Tuesday"
  (since when, in words only), and it carries "It's happened" there too.
- The app opens **where you left off**: the runner, the paused screen, or home.

### 3.4 Waiting while carrying on
A wait step stops you only where it stands, so **the order does the work**: put it right after what you
set going to stop there; put it later to carry on with the steps between and meet it where the result
is needed. There is no "any order" group.
- **Separate runs** are independent work that never has to come back together. **Waiting inside one
  run** is dependent work with a point where results are needed together — the wait step. The test: is
  there a step that can't happen until both are done?
- **A wait may close several** things that are out.
- **A parent can always wait on its children; a child knows nothing of its parent.** If a routine sets
  something going and waits for it inside itself, it is self-contained. If it does not, the routine
  itself becomes something that can be waited for: wherever it is used its block shows an open end,
  which that routine may close with a wait or carry outward in turn, as far as the first layer. Nothing
  reaches into an inner routine's steps.
- **Leaving with something out asks** — one sheet naming each thing: **Keep it out** (it stays as a free
  item, named in the panel and on home, until you say it has happened or let it go) or **Let it go**.
  A kept item whose run has ended sits on home under its first layer *(proposed)*.

### 3.5 Jump to…
Things get done, and waits resolve, without the app. **Jump to…** (from the panel, See it all and the
paused screen) sets the run to where you really are: **the start of any level you are in**, or **a
particular step** ("Jump here"), with what is out listed to mark as happened or let go. Jumping to the
start of a level is round one and fresh; picking a step keeps the round and this-run changes
*(proposed)*. One Undo covers it. The app never jumps by itself and never suggests you are behind.

### 3.6 Three gaps the final redraw exposed *(proposed)*
- **Next on the very last step of a run** (top level, a part that runs once) finishes the run: home, with
  "Finished <name> · Undo".
- **What is on home.** A routine is on home when you started it there ("New: …"), put it there ("Put on
  home" in the routine menu), or it has a run going or a kept item. "Take off home" removes it from home
  only (refused while it has a run going — end or keep that first); it stays in Your routines.
- **Open child runs never block their parent.** Ending the parent — by Done or by itself — asks once
  what to do with them and with anything out, in the same sheet.
- **See it all is the run, not the routine**: it is titled as the run ("This run of <name>"), looks
  different from the routine editor, and says "this run only" on what you change there.

## 4. Writing routines
- **Blocks.** Steps are solid, coloured, chunky blocks in the routine's colour. A routine inside a
  routine is an outlined block with the routine mark, folded to its name; it expands in place or is
  focused on alone. A wait step is an outlined block with the wait mark. Every block has a visible "more"
  control (move up / down, repeat from here, break it down, group, make this a wait, sets something
  going, wait for this later…, duplicate, send to…, remove). Words are edited in place: tap, type, Undo.
- **The divider** "Repeat from here" has a real grip and a sheet: *where* it repeats from (three picture
  choices: all of it, from a step, runs once) and *how many times* (Until I'm done / A number, with its
  own stepper marks). It reads "Repeat from here · 3 times".
- **Rails.** "Wait for this later…" on a step (or a routine block) makes a wait tied to it; a rail runs
  down the side from the open end to the wait, and the steps beside it are what you do meanwhile. Each
  rail has its own lane so rails never cross; three lanes at most, beyond which Group is offered. A rail
  lives within one level and never crosses the divider; a wait is tied only to items above it. A move,
  Group or divider change that would split a rail is allowed, unties it inside the same Undo, and says
  so *(proposed)*.
- **Reactions** sit folded under their wait block as labelled blocks holding steps or routines. One
  being written may be empty, drawn as unfinished, and is never offered on the runner.
- **Read it.** The same routine as plain sentences, generated: collapsed to its own items, expandable in
  place, or focused on one routine. "Then repeat 3 times:" / "Then repeat until you're done:" / "While
  you wait: … Then wait for: …". It is also the large-text and screen-reader form and what Copy as text
  produces. **Walk through** tries a routine without running it.
- **Break it down** turns a step into a sequence in place. **Group** is the reverse: choose neighbouring
  steps, name them, and they become one routine. **Blanks** are added with their own control.
- **Editing is live, with Undo — no Save.** The editor of a routine used in several places always shows
  where it is used, with "Edit a copy instead"; adding or removing a wait there is named, since it
  changes that routine's open end everywhere.

## 5. The other screens
- **Home** ("Nothing running"): everything you have going, as a tree (Map) or a List — each first layer,
  with its own run on its head row ("at <step>" and Resume, or Start), child runs beneath, kept items,
  and the prompt **"I'm going to…"** beneath. Typing offers the closest runs, routines and unnamed
  things, then "New: <your words>"; nothing starts until a row is chosen (Return takes the first row,
  always visible and marked). A way to Your routines, Looking back and Settings is always visible.
- **Your routines**: every routine, each with Start, Start with… (fill a blank), values used before, and
  the routine menu (Open, Rename, Copy as a new routine, Copy as text, Remove everywhere). New routine.
- **Looking back**: one screen, by day, **a set, not a log** — one line per ended run, never one per
  round or per step; search at the top returns each distinct step or routine once, wherever it lives;
  "Forget this" per entry, "Clear all" in the screen's menu; "Pick it up again" on an ended run. It also
  holds what was logged before this design.
- **Settings**: where the data lives, Export, Import (with a preview, replace only), Erase everything
  (export first), version. No notification settings: there are none.
- **The app's own states** (kept from today's app): opening, can't open the data, another tab took
  over, reconnecting, a new version is ready, saved by a newer version.

## 6. Rules
**Minimalism (owner).** The app should communicate itself. Prefer a familiar icon over a word where the
icon is conventional and unambiguous; keep words for form labels, button labels that need them, and the
person's own text. **No instructional or explanatory text, no preamble, no disclaimers** — needing one is
a sign the design has failed to say it. Not to be applied overzealously: a label that prevents a mistake
stays. **Borrow established conventions** from adjacent productivity apps for layout, spacing, icon and
settings placement and component choice, so the app meets expectations before it asks anyone to learn.
**Safeguards, one rule.** Everything reversible gets an Undo and no confirm. A confirm appears only when
an action reaches beyond what is on screen (other routines, open runs, things out, all data), and still
leaves an Undo where one is possible. The filled button always means the safe or forward choice; red
and "!" only for errors and the irreversible; every Remove names its reach.
**One vocabulary** (owner): the verbs must read as a set — Start, Resume, Pause, Stop, Switch, Done,
waiting. A paused run is "paused", not "put down"; no word is chosen for how it sounds alone.
**One wording and one mark per meaning.** A paused run reads "at <step>"; ending is "Done with <name>";
"Switch" only between paused runs; "Start" for beginning; the toggle is "Map | List". A mark never means
two things (now, repeats, routine, wait, forward, fold, more, pause, stop each have their own).
**Nothing is counted against you.** No streaks, deadlines, notifications or tallies of what you did;
nothing shows how much is left. A number you set (a repeat) and your place in the current run (the
round) are context, shown only in the panel. Counts appear otherwise only in the import preview.
**Acting.** Fixed places for the runner's buttons; one filled button per screen; Done names what it
ends, and the level is in words, never colour alone. Nothing by gesture alone: every drag, swipe and
long-press has a visible control.
**Reading and size.** Body text ≥ 16 px; targets ≥ 48 px; layouts reflow at 200 % text and with the
keyboard up; screen titles are headings; icon-only and repeated buttons have full spoken names ("Resume
Apply to Acme"); focus has its own ring; an error never dims the words it is about and its button
always fixes it. Under Reduce Motion every change is instant.
**Look.** Dark; robotic, programmatic pixel accents — pixel font for screen titles only, chunky blocks,
hard shadows — with the person's words in a clean readable font. Tetris is only the feel of the blocks.
**The person's words are in a sans face** (IBM Plex Sans): two designers working blind both chose it
over monospace — the fixed square note holds more words in a proportional face. *(The owner may overrule.)*

## 7. What changes in the product's rules (with go)
Logging leaves the main flow; the night sky and everything in it retire, their routes redirecting to
home; wanders and whys retire as concepts (kept in storage, export and Looking back). DESIGN.md and
STRATEGY.md are rewritten around this document, including "no counts" (reworded as above) and "no
timers" (an opt-in pace note remains a later idea, off by default).

## 8. Stored data (Full tier)
New: routines (ordered items: step, wait step, routine reference; divider position and repeat number;
blanks; which steps set something going and which waits close them; reactions), runs (routine, blank
values, place at every level including the round, what is out, this-run-only changes, reason, parent
run, ended-at, waiting-since), unnamed sequences kept for search, values used per blank. Everything
existing is kept (activities and `lit` lines → Looking back; wanders retired, not converted). The
backup format carries every new kind. Storage is first changed to handle any kind of record, since
today's journal, hand-over, undo, fallback, export and import name two collections by hand.

## 9. Slices (reversible order)
0. **Groundwork** (no visible change): storage for any kind of record; backup format 2; new tables,
   added only.
1. **Home, the runner and Break it down**, with a plain editor, alongside today's home: steps, routines,
   the divider (until I'm done / a number), Pause with a reason, Stop, the panel, Jump to…, plain wait
   steps, Done, Undo.
2. **Reuse and the map**: routines inside routines, Group, blocks folding, Read it, found-by-its-words,
   editing shared routines, Your routines, Looking back, Settings.
3. **Blanks**, then **child runs**.
4. **Reactions**.
5. **Setting things going**: rails, lanes, open ends, things out, the leaving ask.
6. **Retire the sky and logging**, only after the owner has lived with the rest; DESIGN.md and
   STRATEGY.md rewritten.

## 9a. The mockups
**Current: `.polish/product/b11-r2-final/` — 251 states, `sheet-01` … `sheet-32`, `overview.png`,
`CONVERGENCE.md`, `NOTES.md`.** Made double-blind: two designers each drew every journey from this
document and the journeys alone (`b11-r2-a`, `b11-r2-b`); each set had its own independent adversarial
audit (`AUDIT.md` in each) and was refined; a third designer converged them.
**Reached independently by both, so taken as settled:** no tab bar — Routines, Looking back and Settings
at the top right, the same on home and Paused; home as "Nothing running" with Map | List and the prompt
at the bottom; the runner as a context line with Done, one large coloured note and three fixed buttons
with a white Next lowest; matches listed above the prompt with "New: …" last; bottom sheets for every
menu and picker, a notice with Undo for anything reversible, a centred dialog only when an action
reaches beyond the screen; solid blocks for steps, outlined for routines and waits; rails in their own
lanes on the right; sans for the person's words.
**Both audits found the same failures in both first drafts** — icons pushed past what a newcomer can
decode, marks with several meanings, Undo missing after reversible actions, and one confirm drawn two
opposite ways — so the rule "icons where conventional and unambiguous, otherwise the word" is binding.
**Proposals from the convergence, for the owner (not applied):**
1. Distinguish an **ask** (every choice goes forward; the filled one carries on) from a **confirm**
   (Cancel is filled). Both designers drew the leaving moment two opposite ways because "safe or forward"
   allows either.
2. Fewer verbs: replace **Stop** with a Home control and **Switch** with Resume, leaving Start, Resume,
   Pause, Done, Next.
3. Make "Wait for this later…" the only control and drop the separate "Sets something going" switch;
   consider one lane first.
4. Name a thing that is out by its wait's words ("Priya's reference"), not the instruction that set it
   going ("Ask Priya for a reference").
5. A run without a blank reads "· since <day>", so two runs of the same routine can be told apart.
6. Reconsider the last-step mark on the note.
**Left open by the convergence:** the note has no margin with the keyboard up; whether Resume belongs on
a waiting run; the step menu is nine rows and the fullest panel scrolls; two open ends on one block are
told apart only by their spoken names; long words break mid-word at 200 %; no real screen-reader pass.

## 10. Still with the owner
The font. Whether "Stop waiting for this", the life of a pause reason, where a kept item sits on home,
what a jump keeps, and the rail-splitting rule stand as proposed. Keyboard: a key each for Next, Pause,
the panel and Done; Esc closes the panel before it pauses.

## Decision requested
**D-18:** Go on B-11 — slices 0–5 alongside today's home, then slice 6 after living with it?
**Go** / **Go, but change …** / **Not now**.
