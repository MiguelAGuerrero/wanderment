# Owner notes

How the owner actually uses the app, and what they've said in conversations about it. **This is the
product's only usage signal** (there's no analytics), so `/product` reads it first, every run.

`/product` adds an entry whenever the owner talks about their use, wishes, annoyances or reactions
to something that shipped. It records the owner's words as closely as possible and keeps its own
interpretation apart. The owner can also write here directly.

Format, newest first:

```
## YYYY-MM-DD — <topic>
> what the owner said (quoted or closely paraphrased)
Interpretation: <what /product took from it — clearly marked as its reading>
Led to: <P-## / brief B-## / nothing yet>
```

---

## 2026-11-21 — Refining the philosophy: know the why, leave the how open
> I do recognize the contradiction, so there might have to be a refining [of the] app philosophy,
> because intents and values are ultimately the things [we're] moving towards, and how we exactly
> get there is unknown — but always keeping in mind what those are, as in your current motivation,
> and your pulses or impulsivity or inclining towards has a structural reason to exist within this
> app. Trying to find a theme that you can either induce or deduce, without clarity on how to
> actually go about doing that, is I believe in [the] spirit of what the app is trying to achieve.

Interpretation (by /product): the tension between "declare up front" and "direction emerges" goes
away if the app separates the **why** from the **how**:
- **The why** (intents, values, what you're moving toward) can be **induced**, named up front, or
  **deduced**, surfacing from what you do. Both are first-class, and the app keeps them in view.
- **The how stays open.** Impulses, inclinations and detours aren't noise or failure: they're how
  paths get found, and they need a structural place in the app. That's what threads and one-off
  activities already are.
- What stays refused: plans for the how (steps-to-goal, milestones, schedules), plus the existing
  never list.

This changes STRATEGY.md and DESIGN.md wording, which the owner owns. Proposed wording is in B-01.

Led to: B-01 "Philosophy" section with proposed wording; D-4 now includes accepting it.
Decision (D-4, same day): wording **accepted as written** and applied; B-01 **go, with the live graph
earlier** → P-13, P-14 (Now), P-15 live graph, P-16 headers, P-17 animation, P-18 first step (Next).

## 2026-11-21 — A graph-first view that updates live
> I want to consider maybe a graph first view so that way when you declare intents or activities you
> get to see a graph update live.

Interpretation (by /product): the owner wants the graph to be where they *start*, not a tab they
visit later, and to see it respond the moment they declare a Y (B-01) or log an activity: the new
node or link appears. That's big (it changes what the first screen is, and touches DESIGN.md's Home
rule and Reduce Motion), and it's closely tied to B-01. Clarifying what "graph first" means in this
run.

Answers: live graph on top of Home (cards, crumbs and log box below); gentle animation, off under
Reduce Motion; folded into B-01.
Led to: B-01 slices 3b (live graph on Home) and 3c (gentle animation); D-4 updated.

## 2026-11-21 — First log feels disconnected; declare intents up front
> The initial logging of activities [is] a little bit unintuitive because [after] my first log the
> onboarding text disappears and I see no threads, and so the disconnect between the activity I
> logged and the idea of a thread has no clear bridge, and it's confusing as to what my next move
> should be. One user flow I considered was that you can declare your intents upfront … the "X to
> why the Y" is declared, and then you can interact with that Y based on how you want to proceed in
> any direction from [it]. That way you see your intents and values first, rather than trying to
> work through what you did and reference something, and then introduce the reason why and for
> what, or to what end.

Interpretation (by /product):
1. **The first-run bridge is missing.** After the first unattached log, Home loses the welcome and
   shows no threads. Nothing explains "threads" or offers the next step. This is a UX gap, whatever
   the answer to (2).
2. **Intents first.** The owner wants to be able to start from the *Y* (what it's all for: ends,
   values) and log activities toward it, instead of only discovering the Y later. This is in tension
   with STRATEGY's "direction emerges… without you having to declare anything up front", with the
   README ("not declared up front"), and with DESIGN.md's earned value headers. It's a product
   decision, not a polish item. Note the owner says this was discussed before; there's no record of
   it in the repo.

Led to: clarifying questions in this run; then a brief (B-01) and a first-run bridge item.
