# Personas

> **Read this first (2026-11-25).** These personas were written for Wanderment, the retired app: a
> one-line log for people who dabble and drift. The app this repository now holds is a different
> product (see [`STRATEGY.md`](STRATEGY.md)). Its audience, in the owner's words (2026-11-24): "right
> now it's for me", and beyond that "a very specific type of person, not necessarily a general
> audience" — people for whom "algorithmic thinking" is "that sort of offload to their mind", who want
> to "clearly define the next step and always be aware of the broader context of it".
>
> No persona has been rewritten or added: that is the owner's to do. Until then the roster is used as
> **stress tests, not as the audience**. Two panels on the built first slice
> (`.polish/product/panel-P-86-1.md` and `-2.md`, local files) found that some personas are simply not
> this app's audience; each persona below carries a **With the new app** line taken from those
> reports. An objection that amounts to "this is not the old app" is not a refinement. In each
> persona, "interests", "log" and "graph" are the old app's words.

The panel that every product decision is run past (see `/product`, Step D). Each persona is a
**personality structure**: how someone relates to interests, structure, pressure and reflection.
They aren't demographics. They're chosen to disagree with each other, so a decision's trade-offs show.

_Draft by Claude from the earlier STRATEGY.md and DESIGN.md (the retired app's) and the owner's
notes. **The owner edits this file**: add, remove or sharpen personas. They're thinking tools, **not users**. The owner's own notes
outweigh anything a simulated persona "says"._

Each persona lists:
- **structure**: rough trait levels (openness, conscientiousness, sensitivity to pressure, need for
  meaning);
- **with interests**: how they use interests;
- **needs** and **fears**;
- **tell**: a sentence they'd say about the app (the retired one);
- **with the new app**: how the P-86 panels placed them against the app as it is now.

## P0 — The owner
- **Structure:** reflective; many interests; wants the *why* in view while the *how* stays open.
- **With interests:** impulses and inclinations are real signals, and wants them to have a place.
- **Needs:** to see intents and values first; a clear next move after a log; a living picture
  (graph) of what feeds what.
- **Fears:** a disconnected first experience; the app forcing a reason before it's known.
- **Tell:** "Show me what it's all for, and let me find the way there."
- Read `owner-notes.md`. This persona is defined by the owner's own words and outranks the rest.
- **With the new app:** unchanged in rank. The owner's notes of 2026-11-24 and 2026-11-25 define the
  audience and the aim (flow: do, iterate, proceed); the Needs and Fears above describe the retired app.

## A — The Impulsive Dabbler
- **Structure:** very high openness, low conscientiousness, quick to start, quick to drop. ADHD-like
  bursts.
- **With interests:** five new ones a month; returns to old ones months later.
- **Needs:** zero-friction capture, no judgment for dropping things, a warm welcome back.
- **Fears:** anything that looks like a plan or a list of shoulds. Setup steps before logging.
- **Tell:** "I just want to dump what I did and go."
- **With the new app (panel P-86-1):** mostly not this app's audience; it has stopped being a place to
  dump what you did. Reaction: uneasy. Still useful as a test of low effort to start. Would mostly not
  keep using it, "and that is acceptable".

## B — The Intentional Builder
- **Structure:** high conscientiousness, outcome-oriented; likes clarity and direction.
- **With interests:** a few deep projects with an end in mind ("make apparel", "run a marathon").
- **Needs:** to see what feeds the end; a sense of momentum; structure.
- **Fears:** vagueness, and that the app is "just a diary"; no feedback at all.
- **Tell:** "I want to know if what I do is actually getting me there."
- **Tests:** the refusals. This persona pulls hardest toward goals and progress.
- **With the new app (panel P-86-2):** fits the audience closely. Reaction: delighted, uneasy at the
  open edge. Reads Keep as the process getting better, with no count needed. Would keep using it; it
  hinges on finishing feeling like finishing, and on reuse arriving.

## C — The Pressure-Sensitive Returner
- **Structure:** high sensitivity to pressure and shame, burnout-prone, perfectionist under the
  surface.
- **With interests:** drifts away for weeks when life gets heavy, then hesitates to come back.
- **Needs:** neutral recency, nothing that counts absences, gentle re-entry.
- **Fears:** visible "failure": empty states that scold, declared things left untouched, anything
  resembling a streak.
- **Tell:** "If it makes me feel behind, I'll delete it."
- **With the new app (panel P-86-1):** a partial fit. Tests whether "nothing is counted against you"
  survives a home of unfinished things. Reaction: fine, flinching at a tile's ageing date and the
  "Stop?" confirm. Maybe, leaning yes.

## D — The Reflective Meaning-Seeker
- **Structure:** high openness, introspective, values-driven, writes long notes.
- **With interests:** cares about *why* they do things, and about the story over time.
- **Needs:** room for reflection, to see themes emerge, language that respects nuance.
- **Fears:** being reduced to counts and charts; shallow gamification.
- **Tell:** "I want to understand myself through what I do."
- **With the new app (panel P-86-2):** mostly not this app's audience; a boundary marker, not a user
  to win. Reaction: uneasy — "respects it; doesn't recognise themself in it". Probably would not keep
  using it.

## E — The Skeptical Minimalist
- **Structure:** low tolerance for friction and novelty, privacy-first, quick to uninstall.
- **With interests:** a few, steadily; uses an app only if it earns its place.
- **Needs:** speed, clarity, data ownership, no surprises.
- **Fears:** onboarding flows, animations for their own sake, features that need explaining, data
  lock-in.
- **Tell:** "Don't make me think, don't make me wait."
- **With the new app (panel P-86-1):** the closest of A, C and E to the owner's profile in
  temperament; tests the owner's own minimalism rule. Reaction: fine on the runner, uneasy at the
  edge and the Home confirm. Maybe.

## F — The Assistive-Tech User
- **Structure:** any personality. Uses a screen reader, switch control or large text, and often
  reduced motion.
- **With interests:** same as anyone.
- **Needs:** everything reachable and announced; no information only in a picture or motion;
  predictable focus.
- **Fears:** graph-only meaning, motion that can't be turned off, tiny targets.
- **Tell:** "If I can't hear it, it isn't there."
- **With the new app (panel P-86-2):** a set of needs any audience has, so these findings count in
  full. Reaction: fine on the runner, uneasy elsewhere. Maybe; it hinges on the spoken names being
  real and on nothing staying hidden under a fixed bar.

## How the panel is used
For each decision:
1. Every persona walks through the proposed experience step by step.
2. Each gives its reaction, what it would actually do, and what delights, hurts and is risky.
3. Each says whether it would keep using the app, and what would make the move work for it.

The synthesis lists the trade-offs, which personality structures the decision favours or costs,
**what's strong and should be leaned on**, and refinements, folded into the brief or offered as
options in the decision question.
