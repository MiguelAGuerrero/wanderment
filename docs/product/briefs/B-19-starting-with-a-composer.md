# B-19 — Starting something new through a composer

**Status:** proposed (drafted with the owner's answers; UI audit not yet run) · **Decision:** D-26 (to be
added on main) · **Roadmap:** P-114 (brief first) · **Theme:** Written by running; Reuse ·
**Date:** 2026-11-28 · **Builds on:** B-17 (the library, built: P-104 to P-106) and the investigation
[`../discovery/2026-11-27-guided-composer.md`](../discovery/2026-11-27-guided-composer.md)

## The problem, in the owner's terms
"There should be a proper on boarding process, and I believe that was the success where you have a
composer of sorts guide you through a set up of a routine to simplify the process of translating your
thoughts into the app without relying on the apps constructs so much. And that's where we leverage the
library functions as a scaffold to interpret a users intent." (2026-11-28.)

Earlier: "a composer view that seems to be guiding you into making these complex decisions one step at a
time … That way, the plan view is secondary to … intuition and figuring it out" (2026-11-27). And on
first use (2026-11-25): "I expected some form of like, hey, do you want to create a stack to define the
work you want to do? … a little bit of scaffolding." And why it matters: "I want the process of refining
a routine to be a demonstration of your knowledge and understanding of what you want, not necessarily
working with the [app] to understand the app's language so much."

On the finding that plain questions do not map cleanly to constructs: "even a bigger reason to develop
that, because we're supposed to make these complex structures from simple asks, like what does done
look like might be a routine that's reasonably complicated to produce, but is afforded to the user as
something simple."

**Where the evidence is thin.** Nobody has used a composer in this app. The first build asked for "the
next small step" on the runner and was removed; the owner's account of why ("Having all these different
options available to me while I was running an execution made it unclear as to what I was doing") is
the main design constraint here. That questions help more than a blank Plan or a template is a
prediction, not an observation.

## Evidence
- Owner notes: 2026-11-25 (first use), 2026-11-27 (the composer, the framing as task / goal / ambition /
  question, the response to the mapping finding), 2026-11-28 (onboarding; short helpful text is
  welcome).
- Discovery: `2026-11-27-guided-composer.md`. No outside source could be opened. Its main findings:
  plain questions map cleanly only to naming and order; "how will you know it's done?" is the most
  valuable ask; a full interview needs six to eight answers before anything runs, against two today;
  others commit at once when a partial thing is valid, as it is here; help that makes the person
  produce the next part, then fades, builds skill, while help that hands over structure does not.
- The app today: New is a Name field with **Plan**. The library is built, with five templates (Learn ▢,
  Find out ▢, Make ▢, Make a decision, Work it out as you go) taken through **Copy…**, which asks only
  for a name. Their lists start empty and their steps are in the library's words.

## Decided by the owner (2026-11-28, in the session that drafted this)
- **Who it is for:** "Me, starting anything new." It is how a new routine begins, every time, and can
  be skipped.
- **How it begins:** "We should provide reason[able] defaults or templates based on the most common
  user goals or tasks to get done, generalizable enough, where the inputs into those routines can[…]
  provide enough context to really contextualize it, so think like [to] start a project where a
  project might be an input, and the input reads just enough for it to sound like as if the user wrote
  it themselves without going through the library or the composer. This requires a little bit of
  inference, but I'm OK with that."
- **Where it ends:** "In Plan, to look it over."
- **Questions that cannot decide a construct by themselves:** "Ask a plain follow-up."

## Proposed experience
The composer is a guided way through **Copy…** on a template: it asks for the template's blanks and its
first lists in plain words, and writes the answers into the routine as the person's own words. It is a
planning surface, in Plan's look, and never appears while running.

`[Button]` is a button, `[[Button]]` the one filled button. Grey text in a field is its placeholder.

### Journey 1 — Starting (the New sheet)
```
New routine
  [ What are you starting?                         ]
  ───────────────────────────────
  Make it          something to build or finish
  Learn it         something to get better at
  Find out         a question to answer
  Decide           a choice to make
  Work it out      the first step, then the next
  ───────────────────────────────
  [[Plan]]                                 (as today: a name, then Plan)
  Close
```
- The person types what is on their mind, in their own words: `a zine about my street`.
- The five starts are the library's five templates, each with one short line. (Short text that says
  what something is for is welcome: owner, 2026-11-28.)
- **A little inference:** from the first words typed, one start is marked as the likely one ("learn…",
  "get better at…" → Learn it; "why…", "how…", "find out…", a question mark → Find out; "decide…",
  "whether…", "… or …" → Decide; "make…", "build…", "write…", "finish…" → Make it). It is only a mark.
  Nothing is chosen without a tap, and with nothing recognised nothing is marked.
- **Skipping it is the default path:** Plan, the filled button, does what New does today.

### Journey 2 — Being asked (the composer)
Choosing a start opens the composer: one question at a time at the top, and under it the routine as it
stands, growing as answers land. The routine is always in view, so this cannot be mistaken for the
runner's single note.
```
PLAN                                                          ⌂ Home
Make a zine about my street

  Who is it for, and what should it do for them?
  [ neighbours; make them notice the street           ]
                                                   [[Then]]   Skip

  ─ so far ─────────────────────────────
  State who it is for and what it should do for them
  Say what done is
  Gather options
  …
```
Each start asks at most four things. A question is a field's label, in plain words; a placeholder shows
the kind of answer.

| Start | Asks, in order | What each answer becomes |
|---|---|---|
| Make it | Who is it for, and what should it do for them? · What must be true for it to be done? · What are a few ways you could do it? | The first step's words · the list "done" (what Say what done is would give) · the list of options |
| Learn it | What do you want to be able to do? · What parts could you practise by themselves? · Is there anything to study as well? | The aim · the kept list of parts · the kept list of topics |
| Find out | What is the question? · What do you think the answer is? · Where would you look first? | The question · a step in the person's words · the first sources |
| Decide | What is the choice between? · What matters in it? | The options · the tests |
| Work it out | What is the first small step? · And after that, if you know? | The first steps |

### Journey 3 — The plain follow-up
Where an answer cannot settle the structure, one more plain question does. Each is asked only when the
answer makes it relevant.
- After a list of parts or sources: **"Do you know them all now, or will you find more as you go?"**
  All now: the list is as typed. More as I go: the loop's last step is the one that shows the list to
  adjust.
- After "Is there anything to study as well?" with nothing typed: no follow-up. An empty answer means
  no, and that part is left out of the routine (rule 2 of B-16, applied to writing).
- After a list in Make it: **"Try each of these, or pick one now?"** Try each: the for each over the
  options stays. Pick one: it goes straight to Choose.
No follow-up names a construct. What it made is visible at once in the routine below.

### Journey 4 — Reading as the person wrote it
The owner: "the input reads just enough for it to sound like as if the user wrote it themselves."
- The routine's **name** is the start joined to what was typed: "Make a zine about my street",
  "Learn drawing hands", "Find out why my mixes sound thin".
- **Answers go in verbatim**: a done-list, parts, options, sources and tests are the person's own lines.
- A template step that would have asked for one of those answers at run time is **replaced by the
  answer**. "State who it is for and what it should do for them" becomes "For neighbours; make them
  notice the street."
- Template steps that were not asked about stay in the library's words, and say "it", never "▢" or a
  name in braces for something that is fixed for this routine.
- **The inference here is small and visible:** lower-casing the first letter of what was typed where it
  joins a sentence, and dropping a leading "to" or the start's own verb ("make a zine" typed under Make
  it becomes "Make a zine", not "Make make a zine").

### Journey 5 — Ending in Plan
After the last question, or on **Skip** at any point, the composer closes into the routine's Plan: the
steps, the lists with the person's lines, and **Start** as the one filled button. Everything can be
changed there as in any routine. The notice names it with one Undo: "Made Make a zine about my street ·
Undo".
- Nothing is held as a draft. Each answer changes the routine at once, as Plan edits do; there is no
  Keep (owner, B-12).
- **Skip** leaves the rest as the template has it. **⌂ Home** leaves the routine as built so far.

### Edges
- **Never on the runner.** The composer is reached from New only.
- **Empty app:** New already opens the sheet; nothing else is needed for a first run.
- **A name in use:** refused on the sheet before the composer opens, in the app's existing form.
- **Long answers** wrap; nothing is clipped. A list answer takes one line per item, with the placeholder
  saying so.
- **Screen reader:** each question is the field's label; the routine below is a list with a heading;
  moving on announces what was added ("Added 3 parts").
- **Large text:** the question and field first, the routine beneath, scrolling.

## Fit with the product
- **"Planning and running must never look alike":** kept. The composer is in Plan's look, shows the
  growing sequence, and never opens from the runner. This is the difference from the first build.
- **Short text only:** each question is one line and each start has one line; nothing explains how the
  app works.
- **"Routines in their own words":** this is the point. Today a copied template is in the library's
  words until rewritten; here the person's answers are in it from the start.
- **"Nothing is created or started without a tap":** kept. The marked start is only a mark.
- **"There is no Keep":** kept; answers commit at once, with one Undo for the whole routine.
- **The muscle.** The owner wants the app to build the habit of breaking things down. The composer asks
  the person to produce each part and then shows the structure their answer made, which the research
  favours over handing a structure across. Ending in Plan is where they see and change it.
- **STRATEGY.md:** "Written by running" (the first version is cheap, so it gets written) and "Reuse"
  (library methods as the scaffold).
- **Not doing:** anything generated by a model; questions about the app's constructs by name; a
  composer on the runner; a held draft; a composer for editing an existing routine (a possible later
  slice); inference that chooses for the person.

## Persona panel
Not run. The owner said this is for themselves, starting anything new, and the roster's personas were
mostly found not to be this app's audience. The owner may ask for one.

## UI audit of the design
To be run on these written screens before the build. Points to check: the New sheet now holding a
field, five rows and a filled button; whether Plan as the filled button beside five starts reads as the
skip it is; the composer's question sitting above a Plan-like list; Then and Skip as a pair; what
⌂ Home does mid-way.

## Slices
1. **The New sheet offers the starts, and the composer for two of them** `[feature]` `[ux]` M. The
   field's placeholder, the five rows with their lines, the mark from the first words, and the composer
   for **Make it** and **Work it out** (no follow-ups needed for the second). Answers written into the
   routine as in Journey 4; ends in Plan with one Undo. *Done when:* typing a sentence and choosing a
   start produces a routine named from the sentence whose lists hold the answers verbatim; Skip at any
   question leaves a valid routine; Plan (the filled button) still makes an empty routine exactly as
   today; nothing is marked for words it does not recognise; the composer cannot be reached from the
   runner; at 390 px and 200 % text nothing is cut and every target is at least 48 px.
2. **The other three starts, with the plain follow-ups** `[feature]` `[ux]` M. Learn it, Find out,
   Decide; the follow-ups of Journey 3; an empty answer leaving a part out. *Done when:* "Learn it" with
   no topics typed makes a routine with no Study part; "more as I go" adds the step that adjusts the
   list and "all now" does not.
3. **Later, if used:** the composer's questions offered from Plan's Add for a new part of an existing
   routine.

No stored field is added: the composer makes routines of kinds that exist, through Copy's path. The
words of the questions and the wording rules of Journey 4 ship with the library content.

## Data and risk
- **Stored data:** none new. Light tier for the screens; the routine is made through the existing,
  tested path.
- **Wizard fatigue.** The one user designed the model and will outgrow being led. Mitigation: Plan
  stays the default button; Skip at every question; four questions at most.
- **Words that are not theirs.** Unasked template steps stay in the library's words. Ending in Plan is
  where they are rewritten; if the owner finds they rewrite most of them, the templates are wrong.
- **Wrong marks.** The inference is a short word list in English; it will miss and occasionally
  mislead. It never chooses.
- **Meta-work.** This is another surface to tune. It should be judged on one thing: whether new
  routines get started sooner and run more often than with New and a blank Plan.
- **A standing tension:** the owner earlier asked that this wait for a test of the app as it stands
  ("This isn't going to be drafted because I want to test the app a little bit first"). The owner has
  since asked for it as onboarding. Slice 1 is small enough to be that test.

## Alternatives considered
- **Templates with Copy… only** (built today). The baseline to beat: fewer taps, but the result is in
  the library's words with empty lists.
- **A full interview before anything exists.** Six to eight answers before a first run; refused by the
  investigation's own count.
- **Plan leads:** the Add row's placeholder asks "What comes first?", then "Then?". Smaller, and
  compatible: it could be how "Work it out" is composed. It does not use the library as a scaffold,
  which the owner asked for.
- **The composer as one of the owner's own routines.** No build; still a good probe, and it cannot
  write its answers into a routine.

## Questions for the owner
1. The five lines under the starts, and the questions in the table: are these your words?
2. Is "Plan" as the filled button on the New sheet right, with the starts as rows above it, or should
   choosing a start be the main path?
3. Should "Work it out" be the marked start when nothing is recognised, or should nothing be marked?

## Decision requested
**D-26:** Build B-19, slice 1? **Go** / **Go, but change …** / **Not now** / **No**.
