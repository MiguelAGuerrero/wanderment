# B-13 — Tasks that hold tasks: the app keeps your place at every level

**Status:** second draft for the owner · **Date:** 2026-11-25 · **Decision:** D-21 · **Replaces:** P-94's flat queue (halted)

The owner's words are in `owner-notes.md` (2026-11-25: "A routine holds no state; a stack does" and
"Everything in a stack is a task; we strive to push things off"). The first draft had two entities, the
routine and the stack. The owner's refinement makes it simpler.

## 1. The model: one thing, the task
- **A task** is a meaningful amount of work, written in your words. That is the only thing the app holds.
- **A task can hold tasks.** Then it is what the owner calls a *stack*: it has an order, and a place —
  which of its tasks you are on. Any task can become one the moment you put something in it; there is no
  separate kind to create. "Get better at drawing" holds "Practise hands", which holds "Draw ten hands".
- **A routine is a template.** It is not in your work; it is on a shelf. Using it stamps out a task —
  named after it, holding its steps as tasks. The stamped task is yours to do, reshape or abandon; the
  routine does not change (only **Plan** changes a routine). Today's "run" is exactly this stamped task.
- **Done takes a task off.** That is the progress: the list gets shorter. You push only what you need;
  everything else is striving to clear. A task stamped from a routine goes by itself when its last step is
  done. A task you made by hand goes when you say Done — so a goal can sit empty and still stand.
- **Home is the root task.** Nothing else is special about it.
- **Where you are** is a path: Home › Get better at drawing › Practise hands › *Draw ten hands*. The app
  keeps that path for every task that holds tasks, so stepping away from one and back lands you where you
  were, with the levels above it saying to what end.

### The known domain
This is an **outliner you can zoom into** (Workflowy, OmniOutliner, Logseq) with two additions outliners
do not have: **a cursor** (each level remembers which item you are on, and one item in the whole app is
"now"), and **templates that stamp out sub-outlines** (routines). Read the other way, it is a call stack:
a task is a frame, a routine is a function, stamping is a call, Done is return. The screen never needs
either metaphor. *(Products named from the designer's knowledge, not researched this session.)*

### Words on screen
No new nouns. The screen shows titles, the path, and the verbs already agreed: Start, Resume, Pause,
Done, Next, Plan — plus **Add**. "Stack", "task" and "entry" are never printed; "routine" appears only on
the shelf ("Your routines") and in Plan.

### Rules
1. **Adding** goes into the level you are looking at: typed words make a task; choosing a routine stamps
   one. "Add" is at the bottom of every level and reachable from the note you are on (offload: "Later").
2. **Switching** is tapping another task at any level. What you left keeps its place. One thing is "now"
   in the whole app.
3. **Breaking down** is adding tasks inside the task you are on. It changes that task only. To change
   the recipe for next time, open Plan on its routine ("Keep as a routine" on a hand-made task makes one).
4. **Repeating** belongs to the routine (its "Repeat from here"); the stamped task carries the rounds.
   A task that should come back after Done ("sketch daily") is marked **Comes back**: Done stamps it
   again at the bottom of its level. No dates.
5. **Reset** is "Start over" on a stamped task: it is re-stamped from its routine; its place and the
   places inside it are cleared. Nothing above or beside it changes.
6. **One task, one home — for now.** The owner asked for references (one stack slotted in several
   places). Designed as: "Also show in…" puts the same task, same place, in a second level. It is the
   last slice, because delete, Done and the path all need an answer for "which parent".
7. **Waits** stay as they are: a task that reads "waiting for … · since"; its level does not move on by
   itself, and you can switch away.

## 2. Traditional journeys, replicated
Reference: list-based to-do and goal apps (Todoist, Things, TickTick, Reminders; Strides, Habitica).

| # | There | Here | Verdict |
|---|---|---|---|
| 1 | Quick-add to the Inbox | Add at Home, or "Later" from the note you are on — it lands in the level you are in | **Better**: captured in context, no triage. To send it elsewhere: Move to… |
| 2 | Project with tasks | A task holding tasks | Same, plus it remembers where you are |
| 3 | Subtasks | The same thing, at any depth | **Better**: no depth limit, no second concept |
| 4 | Goal with milestones and % | A task at the top holding what you currently think it takes | No %, by rule. Progress is the list shrinking, and the path saying to what end |
| 5 | Template / checklist | A routine; stamping it gives a task | **Better**: edit the recipe once; every stamp is free to diverge |
| 6 | Recurring task with due date | "Comes back" | Calmer; no schedule ("every Monday") — a known lack |
| 7 | Plan today: drag into Today | Order the tasks at Home; the top one is next | Keeps your place inside each. Does not clear at midnight |
| 8 | Do: open a task, tick it | The note: one task, Next / Done | The strongest screen already built |
| 9 | Interrupted: jump to another task | Tap it; come back later to exactly where you were, at every level | **The reason to use this app** |
| 10 | "Buy ink" comes to mind mid-task | "Later" from the note | Not built yet |
| 11 | Waiting on someone | A wait task | Built; honest; no reminder |
| 12 | Weekly review | Home, read top-down: each task shows what is next inside it | Needs the "next inside" line on every row |
| 13 | Complete / archive a project | Done on it (asks if tasks remain inside) | Same |
| 14 | Search | The Add field searches tasks and routines; a result shows its path | To build |
| 15 | Move a task to another project | Move to… on its menu | To build |
| 16 | Undo, rename, delete | Undo after every change; rename in place; delete asks and names what is inside | Mostly built for routines; extend |

**Where it is weaker, honestly:** no dates, reminders or schedules; no counts or history; a long-lived
Home can silt up (nothing expires), so reviewing must be cheap; depth can hide things — the path and the
"next inside" line are what prevent that, and both must be on every screen.

## 3. Screens
- **A level** (Home is one): the path at the top; its tasks in order; the top one carries the one filled
  button (Resume / Start); each row shows what is next inside it ("at Draw ten hands", "waiting for the
  reply · since Tue"); "+ Add" at the bottom. Tap a row with nothing inside → it becomes now, on the note.
  Tap a row that holds tasks → go into its level.
- **The note** (the runner): unchanged, with the path as its context line, Done / Next, and "Later".
- **Plan**: unchanged, for routines only — the blueprint band still means "you are changing the recipe".
- **Your routines**: the shelf, reached from Add.

## 4. What changes underneath
Stored today: routines (templates and unnamed breakdowns) and runs (a routine's place). The model above
needs **tasks as stored things that own their children and their place**; a run becomes a stamped task.
This is a migration of stored data — Full tier, with the golden fixture frozen at `0e98cf3`; existing runs
become tasks at Home (most recent first), their routines stay as templates, nothing is deleted, the
retired app's data is untouched.

## 5. Slices
1. **Tasks at every level** (Full, L): the task tree, Home as the root, Add (words or a routine), switch,
   Done, go in / out, the path, "next inside" on rows, Move up / down; runs migrated. Home's tile grid goes
   to Your routines.
2. **Later** from the note; **Move to…**; search with paths.
3. **Comes back**; **Start over**; **Keep as a routine**.
4. **Also show in…** (references).

## 6. Questions for the owner
1. **A stamped task diverges freely from its routine** (add, drop, reorder steps this time only) — yes?
   This restores "this time only", which P-90 removed, but in a place where it is natural: the task is
   yours, the routine is the recipe.
2. **Done on a task that still holds tasks**: ask, then take all of it off (proposed) — or refuse until
   it is empty?
3. **References last** (rule 6) — acceptable, or is one stack in two places needed from the start?
4. **Home's order**: new tasks go to the bottom (a queue, proposed) or the top (a stack in the strict
   sense)? Inside a task you are doing, "Later" goes after the current one.

## Decision requested
**D-21:** Go on this model, slice 1 first? **Go** / **Go, but change …** / **Not now**.
