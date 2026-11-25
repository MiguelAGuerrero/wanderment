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

## Second draft (after the audit and the owner's answers) — frames `v1`–`v8`, `sheet-2.png`
**Decided by the owner:** a change made in Plan mid-run changes the routine. The other open questions
take the defaults: the edge moves you into Plan; creating reads "I'm going to / With / Steps"; Plan is
told apart by shape and words, not colour; the word is Plan going in and **Resume** coming out (Start for
something never run). **New from the owner:** routines must be declarable in context — "you effectively
push work on top … in plan mode and then execute sequentially. But there's no routine definition yet.
There's no way right now to declare that until you're done with a current run."
- `v1-run` — the runner: Pause · **Plan** · Next. No pencil.
- `v2-plan` — Plan: a light band with the word, **Home** at its right; the routine's name as the heading
  and "planning · at <step>" (never "paused"); rows with HERE (16 px); "Repeat from here" with visible
  up / down (48 px); "Add a step"; an Undo notice after an edit; the one filled button **Resume at
  <step>**.
- `v3-declare` — **declaring a routine where you stand**: a group of steps becomes "A routine" with its
  name typed in place and its own "Repeat: until I'm done"; it is in reference from that moment, and the
  run carries on inside it. Reached from a step's menu, "Make a routine from here…".
- `v4-menu` — a step's menu, in words: Break it down · Make a routine from here… · Make it a wait · Move
  up · Move down · Only this time… · Remove this step.
- `v5-edge` — the edge: Plan with the open row focused; **Done** at the top right beside Home; no
  disabled button.
- `v6-new` — creating: "I'm going to" (the name), "With" (inputs, as chips that can be put into steps),
  "Steps"; the filled button is **Start**.
- `v7-shared` — a routine used elsewhere: "Also in" names where, with "Change a copy instead".
- `v8-home` — tiles: "❚❚ at <step>" with Resume; "planning · …" on the plan surface with **Plan**; a
  **New** tile.
Still to draw before building: reordering by drag, thirty steps with HERE off-screen, the keyboard up,
leaving with unsent typing, Plan against Pause on the paused screen, a wait step in Plan.

**Re-audit of the second draft** (`.polish/product/ui-audit-B-12-2.md`): *ready with named fixes for
the Plan surface* (`v1`, `v2`, `v4`, `v5`, `v8`); *one more draft* for declaring a routine (`v3`), a
shared routine (`v7`) and "With" (`v6`). Plan against Run passes without colour, provided the band stays
pinned; no contrast, text-size or target failures bar one chip. Fixes for the Plan surface: Home keeps
one fixed place in the band on every Plan screen and Done never takes it (it gets its own slot and an
Undo); the Undo notice lasts until the next action and the "HERE step was removed" state is defined;
the step menu gains Change the words, Add a step after and Close, and "Only this time…" is renamed for
what it does; the white outline means one thing (HERE), not also focus and group; **one way to say
"repeats" — the divider — not a second control inside a group**. For the next draft of declaring: an
Undo and a menu on the group, what an empty or already-used name does, and what happens to the parent's
own divider; for a shared routine: the "Also in" line stays in view, covers open runs, and Remove names
its reach. Still undrawn and likely to change the design: a routine as a step in Plan, the keyboard up,
HERE removed or off-screen.

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
`.polish/product/ui-audit-B-12.md` (17 findings, 13 undrawn states; reasoned from the CSS, nothing
rendered). Verdict: **needs another draft — same concept.** The central claim holds, carried by shape
(one note vs outlined rows under a band) and the word; the blue itself carries nothing (the two pages
differ by 1.04 in contrast). To fix in the next draft:
- **Words.** "Run" would be a third word for Start and Resume: leaving Plan is **Resume** (or Start for
  something never run); drop ▶. Plan is not Pause: it reads "planning · at <step>" everywhere, never
  "paused".
- **One switch each way**: Plan in, Resume out; the way to home is the word Home, not an ambiguous ←.
- **The edge**: no disabled filled button; the open row is the forward action and Done stays top right,
  where it always is.
- **Marks already taken in the built app** (✎ change the words, ≡ see it all, − the stepper, dashed =
  unavailable) must not be reused with new meanings.
- HERE and the resume label must name the same step; the label must not clip; what happens when the
  HERE step is removed.
- Sizes: every control ≥ 48 px, the HERE tag ≥ 16 px; the Repeat yellow must differ from a yellow
  routine; "For" must sit with "I'm going to …".
- **Owner's call (finding F-05):** Plan edits changing the routine by default reverses what is built and
  can reach other routines and open runs — it needs Undo, the routine's name as the heading, and a named
  reach when it is used elsewhere.
- **Still to draw:** Undo after an edit, reordering, Plan with no run (from home), thirty steps with
  HERE off-screen, the keyboard up, leaving with unsent typing, and Plan against Pause.

## Slices (draft, after go)
1. Plan as a surface: the sequence with HERE, add / reword / reorder / remove, the movable divider; the
   runner's Plan button; Run from <step>; the edge in Plan; mode shown on home and on return (M–L, Full —
   the run stores which mode it is in).
2. Creating in Plan with For and Steps; the New tile (M).
3. With: inputs as blanks (M, Full) — B-11's blanks slice.

## Decision requested
**D-19:** Go on B-12 as drafted, with the owner's answers to the open questions? **Go** / **Go, but
change …** / **Not now**.
