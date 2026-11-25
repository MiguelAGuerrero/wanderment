# B-12 — Plan and run look different

**Status:** proposed · **Decision:** D-19 · **Roadmap:** P-90 · **Date:** 2026-11-25

Mockups (local, first draft): `.polish/product/b12-shots/` — `sheet.png`: `1-run`, `2-plan`,
`3-plan-break`, `4-edge`, `5-new`, `6-home`.

## The problem, in the owner's terms
From the first real use (owner-notes, 2026-11-25):
- "the next step didn't seem like the next step … it feels like me drafting it rather than [executing
  it] … my mind was split … between two modes of thought, like OK what do I do next versus how do I
  represent this in the app."
- "there is definitely room to add steps mid-session, but there has to be a clear delineation between
  composing and running … Plan, execute, plan, execute, plan, execute is the type of context switching I
  had in mind, but the app blurs the two because they look very similar."
- "if I left the app with the next step, I couldn't tell if I was [done] drafting or if that was actually
  part of the workflow … But if I had the composer view, it was like, oh, I remember now."
- "done feels like two different things depending on what I was doing with the app at the time."
- Loops and inputs could not be reached mid-run; "I never made a loop in the editor because there was no
  way to actually drag it"; "the composer is where you would actually define the parameters … the
  parameters define the execution".
- Opening the app did not offer to create anything; expected a little scaffolding — the outcome or
  feeling wanted, the inputs, the steps that turn one into the other.
- Liked: "it forces [me] to really think about how I go about doing things."

## How other tools handle a make-it / use-it split
*(From the designer's knowledge of these products, not researched this session — to be checked before it
is relied on.)*
- **Level editors with an instant play toggle** (e.g. Mario Maker's Make / Play): one control in a fixed
  place swaps modes; the content is the same and you stay where you were; Make shows a grid and tools,
  Play shows none.
- **Build mode in simulation games** (e.g. The Sims' Build vs Live): entering build mode *stops the
  clock* and changes the whole surface, so you never wonder whether time is running.
- **Slides** (Keynote, PowerPoint, Figma's prototype play): Edit and Present share nothing visually;
  leaving Present returns you to the slide you were on.
- **Notebooks** (Jupyter): the same cell is either being edited or being run, and its frame changes to
  say which.
- **Workout and cooking apps** (routine vs active session; recipe vs cook mode): the session is a
  different screen with large type and one thing at a time; changes made during a session are offered
  back to the routine at the end.
What the good ones share: **(1) a different silhouette for each mode, not a label; (2) one switch, in
one place, that keeps your position; (3) making pauses doing; (4) changes are reconciled, not silently
applied.**

## The insight
The blur comes from both modes using the same unit of attention. **Running's unit is one step. Planning's
unit is the sequence.** The first slice drew planning as a blank single note on the runner, so planning
borrowed running's shape. Give each mode its own shape and the rest follows.

## Proposed experience
1. **Run is one note** (`1-run`), as now: the context line with Done, the note, and three buttons —
   Pause, **Plan**, Next. *Plan replaces "Break it down"*: breaking a step down is planning, so it is
   the same door.
2. **Plan is the sequence** (`2-plan`): a different surface (a blueprint — a dotted grid, a "PLAN" band,
   outlined rows instead of one coloured note), showing the steps around where you are, with the step you
   were on marked **HERE**. Everything structural lives here and only here: add, reword, reorder and
   remove steps, the Repeat divider with visible up / down controls and a grip, wait steps, inputs. The
   run is held while you plan — there is no Next and no Done on this surface. The one filled button is
   **Run from <step>**, which takes you back to exactly where you were.
3. **Breaking a step down** (`3-plan-break`) is Plan opened on that step: its smaller steps sit indented
   under it, and Run starts on the first of them.
4. **The edge of a goal** (`4-edge`): when nothing is defined next, the app is in Plan, not on a blank
   note — the steps so far, an open row "What comes next?", Run unavailable until there is something to
   run, and "Done with <name>" as the way to finish. Plan, execute, plan, execute.
5. **Creating** (`5-new`) starts in Plan with three labelled fields: **For** (the outcome or feeling —
   it becomes the name), **With** (the inputs, which become blanks you can drop into steps), **Steps**.
   Labels only; no instructions.
6. **Home** (`6-home`): a tile says which mode you left it in — "at <step>" with Resume, or "planning"
   with **Back to plan**, drawn in the plan surface. A visible **New** tile offers creating; the prompt
   still searches and still offers "New: …". Reopening the app returns you to the mode you were in.
7. **Done means one thing**: done with the work, and it exists only in Run (and at the edge). Leaving
   Plan is either Run or the back arrow.

## What this changes in B-11
- The runner's middle button is **Plan** (was Break it down / Step in — Step in remains when the step is
  a routine). The break-down sheet and the "next small step" blank note on the runner go away.
- §9c stays in spirit — the routine still grows as you use it — but growth happens in Plan.
- The plain routine editor and "See it all" merge into Plan (one place to see and shape the sequence).
- Inputs (blanks) get their home: the **With** row. Building them is still its own slice.

## Open questions (for the owner)
1. **What does a change made in Plan mid-run change — the routine, or only this run?** Proposed: the
   routine (you said you were "trying to refine this procedure"), with "only this time" as the exception
   on a step's menu. B-11 had it the other way round (this run only, then Keep).
2. **The edge switching you into Plan by itself** — acceptable, since nothing can run there? Or should
   the runner stop and offer Plan?
3. **Scaffolding**: are **For / With / Steps** the right three, in those words?
4. **How different should Plan look?** Drafted as a blue blueprint; it could be subtler (same dark, a
   list instead of a note) or stronger.
5. Does **Plan** as the word for the mode and the button read right beside Start, Resume, Pause, Done,
   Next?

## UI audit
To run on the frames before any build (owner's rule).

## Slices (draft, after go)
1. Plan as a surface: the sequence with HERE, add / reword / reorder / remove, the movable divider; the
   runner's Plan button; Run from <step>; the edge in Plan; mode shown on home and on return (M–L, Full —
   the run stores which mode it is in).
2. Creating in Plan with For and Steps; the New tile (M).
3. With: inputs as blanks (M, Full) — B-11's blanks slice.

## Decision requested
**D-19:** Go on B-12 as drafted, with the owner's answers to the open questions? **Go** / **Go, but
change …** / **Not now**.
