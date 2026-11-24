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
  items below repeat until you say done. A new routine has the divider at the top (it loops, the
  default); with no divider it runs once through. A routine can't contain itself.
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

## 3. Screens
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
