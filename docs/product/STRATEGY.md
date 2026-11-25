# Product strategy

_Rewritten by Claude on 2026-11-25, when the owner retired Wanderment, from the owner's notes
(2026-11-24 and 2026-11-25) and brief B-11. **The owner edits this; the `/product` skill only proposes
changes** (as a 🙋 decision in the roadmap). Quoted lines are the owner's words from
[`owner-notes.md`](owner-notes.md); everything else is a reading of them and stays a hypothesis until
the owner confirms it. The app has no name yet._

## What it is

A personal runbook. "Not what you have to do. How you do it." It keeps a person's routines in their
own words and runs them one small step at a time. The design is
[`briefs/B-11-context-stacks.md`](briefs/B-11-context-stacks.md); the rules are
[`../DESIGN.md`](../DESIGN.md).

## Who it's for

The owner, first: "right now it's for me". Beyond that, deliberately few: "these apps are very niche,
and that's okay. One aspiration I have is to develop a portfolio of niche apps that cater to a very
specific type of person, not necessarily a general audience."

That person thinks procedurally: "algorithmic thinking might be suitable for a few who would like
that sort of offload to their mind, so they can iterate and refine processes as they see fit. And
ultimately work on bigger and lofty things without being bogged down by what they have to do next,
when you can just clearly define the next step and always be aware of the broader context of it."

So the number of concepts (levels, rounds, waits) is a feature for this audience, not a cost to
sand down for a general one.

## The aim

Flow. "Eventually, I really want to get into a position where this app can help you reach flow
state, where in interacting with it, you can develop a discipline that allows you to do, iterate,
and proceed forward." The owner will judge that "once I get my reps in with this app to see its
strengths, at least for a person of my profile."

## Against its neighbours

No research was commissioned for this section; it restates B-11 §1 and §9c.

| Neighbour | What the app shares with it | What is its own |
|---|---|---|
| **Routine runners** (one step on screen, then the next) | One step at a time, a single forward button | The routine grows while it runs. B-11: "a routine app runs a list that never grows" |
| **Checklists and procedure tools** | A procedure written once and run many times | No ticks and nothing showing how much is left; the procedure is refined from inside a run, with Keep |
| **Outliners** | Steps open to any depth | B-11: "an outliner grows a tree at a desk". Here the tree deepens during the work — in a planning view that alternates with running (owner, 2026-11-25: "plan, execute, plan, execute") |
| **Task managers** | You say what you are about to do | B-11: their unit is "a task that disappears when done, in a flat list, measured by what's left and by deadlines". Here the unit is a piece of know-how that stays to be run again |

What is its own, in one list:
- **The person is the processor.** The routine is a program in their words and they execute it:
  go deeper into a step (Break it down / Step in), go past it (Next), leave a level (Done), or set
  themselves to where they really are (Jump to…). The app holds the place; it decides nothing.
- **The procedure is refined while it runs.** A change is for this run only until the person
  keeps it; leaving a level shows what changed, with Keep.
- **Loops end when the person says.** A repeating part goes round until Done, or for a number the
  person set.
- **Waiting has no clock.** A wait step says what is being waited for and since when, in words. It
  never counts and never reminds.
- **The edge keeps extending.** Where the worked-out steps stop, the run asks for the next small
  step and keeps it.

Built today: the first three and the last, with plain wait steps. Reactions, things set going,
blanks and child runs are designed and not built (DESIGN.md says which).

## Refusals

Each follows from the aim or from a DESIGN.md rule. An idea borrowed from another app is changed to
fit these, or it isn't used.

| Refused | Why |
|---|---|
| **Timers** | The pace is the person's. B-11 §7 keeps "no timers"; an opt-in pace note is a later idea, off by default, not built |
| **Schedules, deadlines, reminders, notifications** | The person opens the app to declare what they are doing now. Nothing calls them back and nothing is late |
| **Streaks and tallies** | "Nothing is counted against you" (B-11 §6) |
| **Percent complete, steps left** | Nothing shows how much is left. A repeat number and the round are context, in the panel only |
| **Team features: sharing, assigning, accounts** | Not in any brief or owner note. The data stays on one device and the audience is one person's own ways of working. A reading, not an owner decision |

Also set aside by the owner (2026-11-24): Wanderment's idea of linking related activities by overlap
"has no place in this iteration of the app".

## Themes (current bets)

Each theme is a direction for discovery and roadmap items. The names and their order are this
draft's; re-ordering them is a product decision.

| Theme | The bet | Where it stands |
|---|---|---|
| **Trust** | People only keep their ways of working where the data is safe and leaves with them | Storage, export and import carried over from before; the old data is kept. Erase everything: not built, not decided |
| **The run** | One step, fixed buttons and no clutter is what makes starting easy | B-11 slice 1, built (home tiles, the runner, Pause, Jump to…) |
| **Written by running** | A routine gets better because it is changed where the work happens | Built: Break it down, Keep, the edge. Later: Looking back showing how a routine read earlier against now |
| **Reuse** | Know-how is worth keeping when it can be used in a second place | B-11 slices 2–3, not built: routines inside routines, Group, Your routines, blanks, child runs |
| **Waiting** | Work that depends on the outside world needs a place to rest without pressure | Plain wait steps built; reactions and things set going (slices 4–5) not built |
| **Reach** | The whole app works by keyboard, screen reader and large text, and looks like what people already know | DESIGN.md's accessibility rules; native and real-device passes not done |

Briefs written before B-11 name the retired themes (Capture anywhere, Warm return, Seeing flow,
Evidence). They are history.

## How we know it's working, and what would prove it wrong

There's no analytics, by design. The signal is **the owner's own use**, as they describe it in
conversations (logged in [`owner-notes.md`](owner-notes.md)), plus the quality bar: no data loss,
the whole definition of done passing, and accessibility checks staying green.

The bet is wrong if, after real use, the owner:
- stops opening it to declare what they are doing, or does the work without it;
- runs routines but never changes them (then it is a checklist, and "written by running" is not
  doing anything);
- finds that writing steps while working breaks the flow it is meant to build — **the first real use
  (2026-11-25) found exactly this**: planning inside the runner felt like drafting, not doing. The
  answer being designed is two visibly different modes that alternate (roadmap P-90), not dropping
  planning mid-run;
- or finds the concepts too many for the person it is for.

None of these has been observed yet: the first slice shipped on 2026-11-24 and the owner has not
reported on using it.
