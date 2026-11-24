# B-11 — Context stacks: one small step at a time

**Status:** proposed · **Decision:** D-18 · **Theme:** Seeing flow / Warm return · **Date:** 2026-11-24
**Supersedes:** B-10 (D-17, never decided) and the night-sky visuals of B-07/B-08/B-09.

Mockups (local): `.polish/product/b11-shots/` — **with the re-audit's fixes: `w1-running`, `w2-after-done`
(Undo), `w3-breakdown`, `w4-last-piece`, `w5-stack` (⋯ menu open), `w6-all`, `w7-routines`, `w8-history`,
`w9-switch`** (overview `w-sheet.png`); before them `r1-running`, `r2-breakdown`, `r3-stack`,
`r4-all`, `r5-routines`, `r6-history`**; first drafts `p1`–`p4` (Tetris wells, superseded).

## Direction (owner, 2026-11-24, latest) — wins wherever the sections below differ
**Not what you have to do. How you do it.** Wanderment keeps your *ways* of doing things and runs them
with you, one small piece at a time.
1. **Opening is a declaration.** "I'm going to … now." You pick what you're drawn to (or type it) and
   you're in it. An orienting tool with low activation energy, not a reflection tool.
2. **A stack is your way, not a plan.** It records how *you* go about a pursuit, a task or a feeling —
   your intuition, written down as you discover it, and refined each time you run it. The wonder is in
   finding out how you operate.
3. **Every block can open.** Breaking a block down never removes it: it becomes a routine with pieces
   inside. Work at the level you like — finish the block as one thing, or drill in and walk its pieces.
   Granularity is chosen each time (in the spirit of Mindstream).
4. **Do, wait, switch.** A piece can be *set going* and awaited (dough rising, a reply from someone).
   The app holds the wait and offers what else you're drawn to; coming back is one tap. Waiting is a
   normal state, not a blocked one, and the app encourages pieces shaped do → wait → do.
5. **The app notices only if you ask.** Opt-in: "How did this feel?" (fine / a lot / too much), and an
   opt-in timer that learns your own baseline and says, in the app, "this ran long for you — break it
   down?" Waits are never counted. Off by default; no opinion until you turn it on.
6. **Pieces are reusable templates** (edit once, changes everywhere), offered as you break things down.

7. **Two kinds of block, chosen in the composer** (owner, decided). A **task** is typed and one-off:
   popped, it doesn't return. A **routine** is a named construct kept in reference, pushed by name, and
   it **loops** until you say done; popping it only takes it off the stack ("done with that for now"),
   never out of reference. One-off setup sits before a loop as tasks. What you've defined (reference)
   is separate from what you're in (the stack); reopening the app offers **Resume** or **Restart** (a
   save state).

### The execution model, simplified (owner: "this matches my intuition", 2026-11-24)
**Three things exist.**
- **Step** — a line of your words.
- **Routine** — a named, ordered sequence kept in reference. Each item is a step or another routine.
  It has one mark, **↻ repeat from here**: items above it run once (setup), items below repeat until
  you say done. A new routine has the mark at the top (it loops, the owner's default); with no mark
  it runs once through.
- **Thread** — something you declared and are in: a stack of **frames**. A frame is a running routine
  plus its place in the sequence. Each thread is its own save state; a wait parks a thread.
**Five verbs.** **Declare** (start a thread: a routine by name, or a typed one-off) · **Next** (move on;
at the end, back to the mark, or the frame finishes if there is none) · **Step in** (the item is a
routine: push its frame — or just Next past it, working at that level) · **Done** (pop this frame, at
any point; the frame beneath moves on) · **Break it down** (turn a step into a sequence in place:
unnamed, once through, gone when popped; name it and it's a routine in reference).
**Never shown as words:** frame, thread, stack, pointer. The path line *is* the stack; "now" is the
place in the frame. A routine can't contain itself.
**What this removes:** a task/routine kind picker (a name is the difference), a loop/once switch (the
mark's position), and nested blocks just to get "setup, then loop".

**Seeing a routine two ways** (owner; frames `y1`–`y5`, `y-sheet.png`): **Blocks** — the divider
"↻ Repeat from here" is dragged (or moved from its ⋯), and the layout shows what runs once and what
loops; **Read it** — the same routine as plain sentences ("Warm-up lines. Then, until you're done: …"),
generated, always in step, no programming words; it is also the large-text and screen-reader form and
what "Copy as text" exports. **Walk through** tries a routine step by step without running it.
Frames: `y1` declare (with Resume / Restart), `y2` blocks with the divider, `y3` read it, `y4` running
inside a loop (Next · Done with <routine> · Break it down), `y5` at a routine (Step in · Next as one
thing).

**Current frames (with fold-ins 17–25 and the owner's folding Read it): `z1`–`z8`, `z-sheet.png`.**
`z1` declare — Resume the one primary, a card per waiting thread; `z2` "has a saved place: Resume there
/ Start over / Cancel"; `z3` blocks — 48 px grip on the divider, the loop as a bracket, a routine inside
a routine as its own outlined block (▤), routines you have offered as "＋ ▤ name"; `z4` **Read it,
collapsed** to the routine's own items; `z5` one routine **expanded in place** (＋ / −), its loop named
("until you're done with Hand studies"); `z6` **Focus** on one routine alone, with its place in the
parent and its neighbours to step to; `z7`/`z8` running — Next, Step in, Break it down and Done in fixed
places (Step in dimmed on a plain step), the level in words ("In Hand studies, inside Practise
drawing"), Undo after Next, and See it all · Wait · Switch as three buttons.

**Blocks fold too, and steps group** (owner; frames `a1`–`a4`, `a-sheet.png`): in Blocks a routine
inside a routine is collapsed to its name by default, expands in place (＋ / −) with its own divider and
loop bracket, or is focused on alone — the same as Read it (`a1`). **Group into a routine** is the
reverse of Break it down: choose neighbouring steps (`a2`), name them (`a3`), and they become one
routine block in place, saved to reference, with an Undo (`a4`). So there are six verbs: Declare, Next,
Step in, Done, Break it down, Group.

**Against to-do apps:** their unit is a task that disappears when done, in a flat list, measured by
what's left and by deadlines. Here the unit is a piece of your own know-how that stays to be run again,
in a structure that opens to any depth, measured (only if you ask) against your own pace.

**Changes to the product's rules (with go):** an opt-in timer and pace note (today: "no timers");
logging leaves the main flow; DESIGN.md and STRATEGY.md rewritten around the six points.
**Open:** whether a stack is re-run by default (finishing a run leaves the way intact) with one-off
pieces as the exception; whether a timed wait may alert you when it's up; where the opt-in lives.

## The problem, in the owner's terms
owner-notes 2026-11-24, "Drop the metaphor" and "Context management, not logging":
- The sky "is being a little bit of a bottleneck … distracting from the core user experience of
  maintaining several ambitions through stacks."
- "you define a stack, a pursuit … values and goals and feelings you want to chase … and you just add
  to the stack of how you're going to go about that. Every layer can have its own substack, and you can
  zoom in and zoom out … context switching is effectively switching where your energy for the day goes."
- "get away from logging … divorce [the] two for now, really just holding onto the context management
  aspect of the app. The logging in history can be its own separate review."
- "Tetris was just a way of defining the look and feel … lean into this more robotic, programmatic
  aesthetic … doing small things at a time with specialized functional tasks."

## The idea, distilled
Wanderment becomes a **context manager**: each pursuit keeps its own stack of small steps, exactly where
you left it. The app runs **one small step at a time**, like a machine running one instruction; you
choose which stack gets today's energy, and switching loses nothing. Not a log, not a planner: no dates,
no progress, no counts.

## The model
- **Stack** = a pursuit in your words: a feeling, value or goal ("feel creative"). Its own colour.
- **Step** = one small, single-purpose thing to do ("Pick 3 reference photos"). The top step is **now**.
- **Break it down** turns a step into its own stack of smaller pieces (a substack). Same rules at every
  depth; a path line shows where you are ("feel creative / draw every week").
- **Routine** = a few steps saved once and reused in any stack (like a function). It **comes back**
  after you finish it. "Save a stack as a routine" covers the owner's earlier "saving entire work stacks
  as a repeatable workflow".
- **Today's energy** = the stack the app runs. One at a time; it stays until you switch.
- **Done** = the step leaves its stack, the next comes up, and a dated line goes to **history** (a
  separate, read-only review). When the last piece of a broken-down step is done, the app asks once
  whether the step is done too.

## What makes it distinct (owner, 2026-11-24)
The owner: as drawn it "turned into a rehash to-do app"; the faith is in "recursive thinking … smaller
and smaller things … applicable across different contexts", and the original intent was direction from
mood and from what you've done before. So the brief leans on three things (frames `x1`–`x5`,
`x-sheet.png`):
1. **Breaking down is the main act.** You split a step until it is easy to start. A piece that proved
   heavy is offered for breaking down the next time it comes up (`x4`: "Last time this was a lot" and
   Break it down becomes the primary button). No energy rating, no timer on screen.
2. **Pieces are yours and reusable.** Every piece you've defined is a building block; breaking
   something down offers your own earlier pieces as you type (`x2`, matched on the device, your words
   only). A reused piece is a template: editing it changes it everywhere it's used, and Save says where
   (`x5`). This widens "Routines" into **Pieces**.
3. **You start from what you're drawn to.** The opening screen (`x1`) shows what's ongoing in every
   pursuit — the feeling's name and its current piece — in a fixed order, nothing ranked; you pick by
   inclination. It replaces the energy switch sheet.
**Open:** how heaviness is gauged — `x3` draws a second button, "Done, but it was a lot" (one tap, no
extra step); the alternative is to infer it (sent to Later more than once, or sitting as *now* across
several visits).

## Screens (zoom levels)
1. **Running** (`r1`, the main screen): today's stack's *now* step, large and alone; "then · <next>"
   below; **Done — next step** (primary), **Break it down**, **Not now** (sends it down the stack). The
   path line, the energy switch (⇄ <stack>), **Stack** to zoom out, and the field "Add a step after
   this" in thumb reach.
2. **Break it down** (`r2`): the step's pieces, the first is now; add pieces from the field.
3. **Stack** (`r3`): the whole stack, *now* labelled in words; steps that open show "opens ›"; routines
   marked ↻. Move, make it now, send to another stack — each also as a menu, never gesture-only.
4. **All stacks** (`r4`): columns that scroll sideways, open at the top (no ceiling), each showing its
   top few steps; today's first, labelled "Energy"; New stack; Routines; History.
5. **Routines** (`r5`): saved routines, where each is used.
6. **History** (`r6`): by day, finished steps coloured by stack; everything logged before stacks is here,
   read-only. Export keeps everything.

## Fit with the product
- **Keeps:** no streaks, counts, timers, deadlines, notifications; nothing created without a tap; Reduce
  Motion; export; on-device only.
- **Retires:** logging as the main act (the log box, loose lines, Return-saves-a-line), the night sky,
  hills, lantern, constellations, lit map, rise screen, search stars, the "I'm not sure" door. Routes
  redirect to the running screen. **DESIGN.md and STRATEGY.md are rewritten with go** ("capture is
  sacred" becomes "adding a step is one Return"; "only the top is ever staged" becomes "only the top
  runs").
- **Look:** robotic, programmatic pixel *accents* (owner): pixel headings, labels, chunky blocks and hard
  shadows; your words in a readable monospace that scales with large text. Tetris only as the feel of
  the blocks — no line clears, scores or falling.

## Mapping to what exists (stored data — Full tier)
| Today | Becomes |
|---|---|
| whys (threads with wanders) | stacks; their wanders become steps that open (substacks) |
| a wander's `next` · P-67's step stacks | steps |
| activities (logged lines) | history, read-only (nothing deleted) |
| `lit` lines (B-08) | steps in the stack they went toward |
| heat (recency) | not shown (panel: no dimming) |
New: an ordered list of steps per stack, parent links for broken-down steps, routines (steps that come
back, usable in several stacks). A migration keeps every record.

## UI audit
First frames: `.polish/product/ui-audit-B-11.md` (12 findings). Re-audit of the r-frames:
`.polish/product/ui-audit-B-11-r.md` — fixed: nothing files silently, no counts, the unreadable cleared
block, top-down reading order. **Fold-ins — the build must meet all of these:**
1. Done and Not now: an Undo that stays until the next action, a spoken announcement ("Done: <step>.
   Now: <next>"), focus moves to the new step; under Reduce Motion the change is instant.
2. No explanation text on any screen (r2–r6); "When the last piece is done" becomes a real choice
   asked at that moment, 48 px buttons.
3. Move / make it now / send to another stack: a visible ⋯ button on every step, long-press only as a
   shortcut.
4. One filled primary per screen (Done on Running; ADD is outlined and disabled while the field is empty).
5. "Not now" says where the step goes ("Later — to the bottom"), with a down arrow.
6. All stacks: names wrap, the next column peeks so the sideways scroll is visible, a way back to Run,
   column borders ≥ 3:1.
7. One symbol per meaning: ▶ only for *now*; Run and Energy get their own words/marks.
8. Buttons, labels and dates in the readable font at ≥ 16 px (pixel font for screen titles only);
   layouts reflow at 200 % text; screen titles are headings.
9. A stack's colour is fixed; a routine takes the colour of the stack it sits in; history's mark
   matches its stack.
10. Running: the energy switch and Stack in thumb reach (above the field), not at the top.

**Audit of the x-frames** (`.polish/product/ui-audit-B-11-x.md`) — further fold-ins:
11. One Done. "That was a lot" is offered on the Undo line after Done, and only for pieces that can
    come back (reused pieces); never a second Done button (a rating at every completion, 14 px from Done).
12. Buttons never swap places: Done stays where it is; a heavy piece marks **Break it down** (a mark,
    not a sentence), "then:" stays, and the mark goes once the piece is broken down or done without it.
13. Editing a shared piece: Save names the stacks it changes, "Save as a new piece" is beside it, and
    an Undo follows; deleting a line and Cancel are drawn.
14. Suggestions: your own typed text first (nearest the field), then earlier pieces, each named as
    "piece" or "reusable piece" for screen readers; announced without a number; fits with the keyboard up.
15. Opening cards look tappable (a "›" and a pressed state); an empty pursuit shows "Add a first piece".
16. Fold-ins 5, 7 and 8 hold on the new frames too ("Later — to the bottom"; one symbol per meaning;
    pursuit names in the readable font).

**Audit of the y-frames** (`.polish/product/ui-audit-B-11-y.md`) — further fold-ins:
17. Opening: **Resume** is the one primary; Restart is apart from it, names what it restarts, and has an
    Undo. Declaring a routine that has a saved place asks "Resume or start over" rather than silently
    overwriting. Every parked or waiting thread has its own card.
18. Running: Next, Step in, Done and Break it down keep fixed places on every screen (fold-in 12). Done
    always names the level it pops, and that level is shown in words in the path, not by colour alone.
19. No bracketed explanations on buttons: "Step in" and "Next" only. One meaning per mark: "›" for
    going forward, a different mark for "opens".
20. The divider: a 48 px grip, "Repeat from here" in every step's ⋯, and its states drawn — at the top
    (all loops), absent (runs once), in between.
21. The loop is shown by the bracket shape alone, no sentence. ↻ means "repeats" only; a routine has its
    own mark.
22. A routine inside a routine is drawn as a distinct block (named, opens); reusable routines offered by
    the field are 48 px and read as things to add, not commands.
23. Read it: real headings and nested lists, consistent indent, and each "until you're done" names what
    repeats ("Then repeat Hand studies until you're done:").
24. "Wait" and "Switch" are two actions, each with its own button.
25. Fold-ins 1, 2, 7, 8 and 16 hold on these frames too (Undo on Next and Done; ▶ is only *now*, so Run
    gets a word).

## Persona panel
_Simulated perspectives from `docs/product/PERSONAS.md`. A thinking tool, not user research._ Reports:
`.polish/product/panel-B-11-{1,2}.md` (on the first frames).

| Persona | Reaction | What it hinges on |
|---|---|---|
| A · Dabbler | delighted → uneasy by week 3 | sweeping old stacks without judgment |
| B · Builder | delighted · yes | controlling the order of steps |
| C · Returner | uneasy · maybe | a stale "now" after weeks away reading as a reproach |
| D · Meaning-Seeker | uneasy · maybe | finished words kept, a by-day history |
| E · Minimalist | fine · leaning yes | few controls, readable type, export with structure |
| F · Assistive-Tech | uneasy · yes if built in | "Now:" in words, a plain list, named Done |

- **Folded in:** pixel accents; parent stays until you say so; by-day history; one energy that
  persists; no caps; no dimming; "+ Layer" dropped (the field does it); Done names its step.
- **For the revised model:** C's return — the running screen after weeks away shows the step plainly,
  no "today" claim; A's sweep — "Rest this stack" (reversible) on All stacks.

## Slices (reversible order)
1. **Stacks and steps, stored** (L, Full): the new shape + migration that keeps every record; Stack and
   All-stacks screens — **alongside today's home**, nothing retired.
2. **Running screen + energy switch** (M).
3. **Break it down** (M, Full: parent links).
4. **Routines** (M, Full).
5. **History + retire the sky and logging** (M), only after the owner has lived with 1–4; DESIGN.md and
   STRATEGY.md rewritten. If capture is missed, a small "did it" stays in history.

## Decision requested
**D-18:** Go on B-11 — slices 1–4 alongside today's home, then slice 5 after living with it? **Go** / **Go, but change …** / **Not now**.
