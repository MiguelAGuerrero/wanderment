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

## 2026-11-22 — Screens without explanations
> Please eliminate most of the descriptions because the UI should be intuitive enough to realize
> what's going on at best. You should have an information dialogue, but never it being part of the UI
> itself. (Answer: app-wide; safety warnings stay inline.)

Interpretation (by Claude): a DESIGN.md rule. Meaning comes from structure, position and a few marks
(↳ next, ↺ left off, · · · more, ⋯ choices, accent = a why); an ⓘ sheet explains, never opening by
itself; screen-reader names keep the full meaning.
Led to: DESIGN.md Interaction rule, P-44 (copy pass), the B-06 mockups.

## 2026-11-22 — A stack, not a list: the intention stack
> My initial intuition was that there was going to be … a stack of … pursuits or higher level nodes
> with their steps appended to them. So I can quickly see, oh, I should do this next … click on that
> step, onboard the next step, and just kind of see those chains come into view. And the graph was
> just supposed to be a way to … provide a more impactful illustration.
> … a literal stack … almost like a pyramid … keep stacking on steps towards a base, and that base is
> ultimately whatever the parent goal or pursuit is … pop off a step … scope that at any level … swipe
> between [children] and see what the current engagement is for each of those subtrees.
> … maybe there's like a carousel viewer to swipe between any sort of chain of intention at a given
> level … leverage selection and focus to really highlight intentionality and what I wanna do next.
> … perform a … audit … leveraging established productivity science or psychological research …
> maybe the highlight there should be like a highlighted section that prompts the next step that is a
> separate view on top of the already displayed stack.

Interpretation (by Claude): a flame graph of intentions (root at the bottom), re-anchored by
"hoisting", with a pager between sibling chains, under the graph on Home; the next step docked above
the log box as a spotlight. Answers recorded in B-06 (panel, discovery, research audit).
Led to: brief B-06, D-9; P-40–P-43 held until Home settles; discovery `2026-11-22-intention-stack`.

## 2026-11-22 — "What's it all for?" isn't intuitive or insightful
> [Screenshot: Home with one log, "Lately: Worked on wanderment.", a lone dot, and the dashed
> "+ What's it all for?" pill beside "Not now".] This "what's it all for?" view doesn't look very
> intuitive. I want you to deliberate with the personas in order to create a more engaging way to
> express linking or refining — declaring your intents, values, motivations, goals, whatever,
> intentions — and then defining your first step. But this doesn't seem very insightful.
> (Answers: scope is all three moments — the Home offer once you have logs, the empty-app 1-2-3, and
> revisiting a why later; what's off: it **stops at the name** and it **looks like a stray
> button**; how much a why holds: let the panel weigh it; output: a brief with options, then the
> owner decides.)

Interpretation (by Claude): the owner had logs before P-36 shipped, so they meet the bare pill, never
the guided 1-2-3. Naming from the pill ends there: no next step is offered, and (found while
capturing screens) the unattached log dot drops out of the picture once a why exists, so the one
thing you'd connect it to vanishes. "Goals" here is loose wording; targets/progress stay refused.
Led to: brief B-05, persona panel, D-8.
Decision (D-8, same day, after the panel): **go with the panel's combination**, no "because…" for
now. → P-38 (polish), P-40–P-43.

## 2026-11-22 — Onboarding: a feeling, not a goal
> For example, maybe the onboarding thing is I get to declare something as simple as "I just wanna
> feel productive", and then the next step [toward] feeling productive might be something mundane like
> reading a book. It's not necessarily the most structured goal-setting traditional app, but it makes
> it very apparent why I want the things I do and what I think I should be doing, with a way to track
> that over time with as much specificity as I allow myself to hold myself to.

Interpretation (by /product): P-36's 1-2-3 names a *why* in the person's own loose words (a feeling
or reason, e.g. "feel productive"), and a mundane next step ("read a book"); no targets, dates,
numbers or goal framing. Over time the graph shows why next to what. Specificity is opt-in: a vague
why can stay vague; more structure comes only by adding a smaller step toward it later (D-5 chains).
Led to: B-04 / P-36 wording and examples.

## 2026-11-22 — The graph should be first, from the start, and a place to act
> [Screenshot: the Graph tab after a log: "This fills in once you've logged for a while…"] I'm not
> quite satisfied with the idea of having to log a while in order to access the graph view. The graph
> view should be first and foremost to see at face value your intentions, values, and what you're
> doing at a high level, with a way to quickly initiate or quickly log any pre-planned or the next
> step from any given wander (whatever you want to call a node) in its subtree, or log it fresh, a
> new activity.

Interpretation (by /product): three asks. (1) No threshold: the graph exists from the first moment,
including with no threads or no whys (an intention can be named right there). (2) The graph is the
primary view of intentions/values and what you're doing, at a high level. (3) Nodes are actionable:
from any node, quickly log its staged next step, log something fresh toward it, or set a next step,
for it or anything in its subtree. Big (changes the primary screen and capture), touches B-01 (P-16,
P-18), B-02 (steps, P-19) and B-03 (focus, P-26). Clarifying questions in this run.
Screenshot: `docs/product/evidence/2026-11-22-graph-tab-empty.png`.
Answers (D-7): the graph IS Home (list → its own tab, Graph tab goes); first run is a quick 1-2-3 —
"declare an intentional value or something upfront and then plan the next step towards that, very
simple 1-2-3, and you get to see the output"; node tap → quick actions at the log box; call nodes
"wanders". Led to: brief B-04, P-34–P-37 (P-18 superseded by P-36).

## 2026-11-22 — "It still looks like the same one"
> So I refresh the app. It still looks like the same one. I expected the graph first … at least what
> was shipped and deployed.

Interpretation (by /product): the owner expected the graph-first Home (D-4, "graph earlier") to be
live; it was queued (P-15) but never built — the run shipped groundwork and polish around it, and
the end-of-run report didn't say so plainly. Also: a plain refresh of the installed PWA keeps the
old version until the update banner is tapped or all tabs close. Lesson for /product: an owner
decision's headline outcome should be built first (or the report must say it isn't shipped yet).
Led to: P-15 started now; the update-on-refresh confusion noted for P-30 below.

## 2026-11-22 — Locked out on iPhone: "couldn't open its data (The object is in an invalid state.)"
> [Screenshot: Edge on iPhone, the blocked screen "Wanderment couldn't open its data (The object is
> in an invalid state.). Reload to try again."] Ensure something like this doesn't happen again.
> (Answers: Reload doesn't fix it — it keeps failing; before it: tapped the update banner, came back
> to an old tab, also open elsewhere, opened it fresh; browser: Microsoft Edge on iPhone.)

Interpretation (by /product): a reliability failure, the most serious kind — the person can't reach
their data. Edge on iOS is WebKit. expo-sqlite's web storage takes exclusive OPFS access handles;
WebKit refuses a second holder with `InvalidStateError` ("The object is in an invalid state"),
which our lock-error check (Chromium wording) didn't recognise. Likeliest holder: another Wanderment
page in the same browser — e.g. a suspended background tab among many — that never releases them,
so Reload can't help. Not a product decision: fix as polish (P-29), and bring WebKit into CI (P-05).
Screenshot: `docs/product/evidence/2026-11-22-edge-ios-invalid-state.png`.
Led to: P-29 (top of Now), P-05 moved up.

## 2026-11-21 — Keyboard after a tap: only for "Log this"
> (Answer to /product's question after the P-13/P-24 audit, finding F12.) Only for "Log this".

Interpretation (by /product): "Log this" focuses the log box (you're about to log); attaching from
the bridge ("Toward something?") must not raise the keyboard on a phone — focus returns to the log
box only where there's no on-screen keyboard (desktop web), for keyboard users.
Led to: a small fix in the P-14 batch.

## 2026-11-21 — "It's effectively a search over the graph"
> It's effectively a search over the graph.

Interpretation (by /product): confirms B-03's framing rather than changing it (asked: "Confirming the
framing"). The row searches what's in the graph (whys, threads, steps, and activities that feed
them); one-offs, which aren't in the graph, stay in "All results →". The brief's wording is sharpened
to say so.
Led to: B-03 wording only; D-6 stands.

## 2026-11-21 — The log field as a mini search over the graph
> And for quality of life, since the graph is gonna be first, let the log field be a mini search
> engine that can query the graph to show what action exists currently, or even an intentional
> value, as a way of searching through and possibly finding where you want [to be], what step you
> wanna be [on] quickly, or what intentional value you want [to] survey.

Interpretation (by /product): with the graph first on Home, the log box should also *find*. As you
type, it would surface existing threads, staged steps and whys, so you can jump to a step to do it,
or bring a why or thread into focus in the graph to look around it. The tension is with *capture is
sacred*: Return logs exactly as typed, and typing must never be hijacked. It's big (it changes how
capture works), so: clarifying questions, then brief B-03, the persona panel and D-6.

Answers: quiet matches as you type; a tap focuses it in the graph; scope is threads and whys, staged
steps, past activities.
Led to: brief B-03, persona panel, D-6.
Decision (D-6, same day, after the persona panel): **go, with the panel's refinements**; one-off
activities via "All results →"; when "Log this" keeps typed text, the line counts as the step
(visible chip). → P-24 (Now), P-25, P-26 (Next).

## 2026-11-21 — Chains of intention: one staged step, stacked on top
> The application of this is that you could define the next step towards a value or goal ahead of
> time, but only one at a time — there can only ever be one staged at all. And if that [one] needs
> to be edited or extended, such that maybe you wanted to [add] another note on top of it, you can,
> and that implicitly creates a chain of intentions that the user can select and do by a quick tap
> of the note, granted each [note] itself can be treated as an intention. So X to Y, even if Y is an
> action like "practice head proportions" to "be a better drawer", and "be a better drawer" to
> something else — it's perfectly valid chains. That's the implication I see outright.

Interpretation (by /product):
- A next step is itself an intention, so it can be a *why* for a smaller step.
- **Only one step is ever staged.** "Adding a note on top" makes the new note the staged one, and the
  previous step becomes its why. Chains of intention grow this way ("practice head proportions" → "be
  a better drawer" → …). Tapping the staged note loads it into the log box, as crumbs do today.
- This rubs against three written rules:
  - DESIGN.md's *Cut from v1: split next steps into hidden "then" pieces*;
  - STRATEGY.md's just-accepted *no plans for the how*;
  - DESIGN.md's *links between threads are never stored* (if the chain links are stored).

  It's a product decision: brief B-02 plus the persona panel, then ask.

Led to: brief B-02 (chains of intention), persona panel, D-5.
Decision (D-5, same day, after the persona panel): **go with model A; only the top step is loggable**;
no "Show graph on Home" setting for now. → P-19, P-20, P-21.

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
