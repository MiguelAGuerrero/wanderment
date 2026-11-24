# B-11 — Context stacks: one small step at a time

**Status:** proposed · **Decision:** D-18 · **Theme:** Seeing flow / Warm return · **Date:** 2026-11-24
**Supersedes:** B-10 (D-17, never decided) and the night-sky visuals of B-07/B-08/B-09.

Mockups (local): `.polish/product/b11-shots/` — revised **`r1-running`, `r2-breakdown`, `r3-stack`,
`r4-all`, `r5-routines`, `r6-history`**; first drafts `p1`–`p4` (Tetris wells, superseded).

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
First frames: `.polish/product/ui-audit-B-11.md` (12 findings). Fixed in the r-frames: no counts ("3
inside", "Loose: 2" gone); *now* labelled in words, distinct from "opens ›"; targets ≥ 48 px; your words
in full, wrapping; readable body font; one primary per screen; Return no longer files anything silently
(it only adds a step, where the label says). Re-audit of the r-frames: `ui-audit-B-11-r.md`.

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

## Slices (draft, after go)
1. **Stacks and steps, stored** (L, Full): the new shape + migration; Stack and All-stacks screens.
2. **Running screen + energy switch** (M).
3. **Break it down** (M, Full: parent links).
4. **Routines** (M, Full).
5. **History + retire the sky and logging** (M): DESIGN.md/STRATEGY.md rewritten.

## Decision requested
**D-18:** Go on B-11 — slices 1–5 in order? **Go** / **Go, but change …** / **Not now**.
