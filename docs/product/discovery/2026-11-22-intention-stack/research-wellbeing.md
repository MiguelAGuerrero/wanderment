# Research audit: the intention stack, through wellbeing, autonomy, self-compassion and behaviour-design ethics

_For B-06 (D-9), 2026-11-22. Lens: does the stack, and a "next step" prompt, help people act on what
matters to them without pressure, shame or attention capture, especially people who drift away and
come back (C), dabble (A), or look for meaning (D)? Goal and motivation science (construal level,
implementation intentions) and visual perception or HCI are other auditors' lenses, so they're left
out here except where they bear on pressure._

**What I looked at:** `stack-shots/intention-stack.html` and frames 1–4; `B-06-draft.md` (with the
panel and the owner's answers); `discovery-stack-apps.md`; `panel-B-02-2.md` (C on chains);
DESIGN.md, STRATEGY.md, PERSONAS.md and owner-notes.md.

**Method note:** direct page fetches were blocked in this session (arxiv.org failed DNS, so that host
would need allowing). Citations were confirmed by web search, and claims taken only from search
excerpts are marked **(via search)**. Where I state a finding from my own knowledge of a paper that I
couldn't re-check this session, I say so. **Evidence strength** labels:
- **Strong:** meta-analyses or many replications;
- **Moderate:** several experiments, or a well-cited multi-study paper;
- **Weak:** theory, design frameworks, qualitative or single small studies;
- **Inference:** my own application of a finding to this UI, not something the source tested.

Most of this evidence comes from labs, classrooms and clinics, not from apps like this one. It tells
us which way to lean. It doesn't predict outcomes for Wanderment.

---

## Strengths the research supports (lean on them)

### S1. The why is the floor under every step, which gives each step its rationale
- **Finding:**
  - In self-determination theory (SDT), a behaviour becomes *integrated*, owned as one's own rather
    than done out of guilt, when the context provides **a meaningful rationale, acknowledges the
    person's feelings and conveys choice**. Deci, Eghrari, Patrick & Leone (1994), *Journal of
    Personality* 62(1). Without those conditions, people *introject*: they do it, but as an internal
    "should" (via search).
  - Vallerand et al. (2003, *JPSP* 85(4)) show the same split in passions:
    - autonomous internalisation gives **harmonious** passion: you choose to engage, and you adapt;
    - controlled internalisation gives **obsessive** passion: internal pressure, negative feeling and
      rigid persistence (via search).
- **Strength of evidence:**
  - the internalisation conditions: moderate (a classic experiment, widely replicated in education
    and health);
  - harmonious vs obsessive passion: moderate to strong (a large literature).
- **For the stack:** the base, "make apparel · what it's for", *is* the rationale, on screen under
  the step and in the person's own words. That's the textbook condition for a step to feel chosen
  rather than imposed. It also suits people with many interests: the aim is harmonious passion
  (engaging because it matters, and able to set it down), not obsessive passion.
- **Fit:** "Know the why; leave the how open." Keep the base on every page and under every
  spotlight (see below).

### S2. Nothing is measured: equal widths, no counts, names instead of dots
- **Finding:**
  - Etkin (2016), *Journal of Consumer Research* 42(6), six experiments: measuring an enjoyable
    activity (steps walked, pages read) **raised output in the moment but lowered enjoyment, and
    lowered later engagement**. It made the activity feel like work (via search).
  - Deci, Koestner & Ryan (1999), *Psychological Bulletin* 125(6), a meta-analysis of 128 studies:
    rewards that depend on engaging in, completing or performing a task undermined free-choice
    intrinsic motivation (d ≈ −0.28 to −0.40) (via search).
- **Strength of evidence:** strong (Deci et al.); moderate (Etkin, one paper with six studies).
- **For the stack:** the mockup's refusals are right on the evidence, not just on taste:
  - equal tower widths, where a real flame graph sizes boxes by time spent;
  - chip names instead of pager dots;
  - no counts on folds;
  - no progress.

  Etkin is especially relevant to persona D and to the owner's "a feeling, not a goal". Counting turns
  play into output.
- **Fit:** DESIGN.md's never list.

### S3. Only the top is live, and the next step sits by the log box
- **Finding:**
  - Barkley's model of ADHD treats it as a problem of *performance, not knowledge*. Its management
    principles are to **externalise information** and to **intervene at the point of performance**
    (Barkley 1997, *Psychological Bulletin* 121(1); course outlines via search).
  - Masicampo & Baumeister (2011), *JPSP* 101(4): an unfulfilled goal causes intrusive thoughts and
    mental interference, and **making a specific plan for it removed those effects**. "The drive …
    is suspended" until later (via search).
  - Ghibellini & Meier's (2025) meta-analysis, *Humanities and Social Sciences Communications*, found
    **no general memory advantage for unfinished tasks** (the Zeigarnik effect), but **a reliable
    tendency to resume interrupted ones** (the Ovsiankina effect) (via search).
- **Strength of evidence:**
  - Barkley's principles: moderate as clinical theory, weak as direct app evidence;
  - Masicampo: moderate (one paper with several studies);
  - the meta-analysis: moderate.
- **For the stack:**
  - one staged top, written down, is an external note that lets the pursuit rest without being held
    in mind;
  - the mirror row sits exactly at the point of performance, the log box;
  - a visible "where I was" invites people to resume, which helps returners.

  The meta-analysis also rules out a tempting argument: an "open loop nags you, so show it" isn't
  supported. The step is there to *help resume*, not to keep tension alive.
- **Fit:** D-5 (only the top is staged); capture stays first.

### S4. "Set it down" with no trace, and Undo
- **Finding:** Wrosch, Scheier, Miller, Schulz & Carver (2003), *PSPB* 29, three studies: being able
  to **disengage from goals you can't reach, and re-engage elsewhere, goes with higher subjective
  well-being**. Later reviews tie disengagement to less distress and re-engagement to purpose (via
  search).
- **Strength of evidence:** moderate (correlational, replicated across samples).
- **For the stack:** letting go is a skill to support, not a failure to hide.
  - "Set it down" is good wording: neutral, physical, and without "delete", "skip", "abandon" or
    "give up".
  - "No trace" means there's no archive of what you put down.
- **Fit:** "Returning is warm"; nothing counted.

### S5. Popping means "moved toward", not "done"
- **Finding:**
  - In ACT, values are **directions, not destinations**. They can't be achieved, only moved toward or
    away from (Harris, *ACT Made Simple*, 2009/2019; via search).
  - The ACT Matrix counts a "toward move" **"even when these actions don't work out"** (Polk; already
    in the apps discovery, not repeated).
- **Strength of evidence:**
  - ACT as a therapy: strong overall (many RCTs and meta-analyses);
  - the specific wording "toward, not done": weak, being a clinical convention with no wording
    experiment behind it.
- **For the stack:** a pop is a step *toward* the base, and the base never fills up or completes.
  This is the deepest reason the stack can't become a to-do list. The base is a direction, so there's
  nothing to finish.

### S6. Swiping never logs, nothing auto-advances, nothing is chosen for you
- **Finding:** Lukoff et al. (2021, CHI), 120 YouTube users plus 13 co-design sessions: **autoplay
  and recommendations reduced the sense of agency, while search and playlists, which the user
  directs, supported it** (via search). The follow-up, SwitchTube (CHI 2023), found that letting
  people switch interfaces raised agency and goal alignment (via search).
- **Strength of evidence:** moderate (survey plus qualitative work, then a field deployment).
- **For the stack:** the mockup refuses auto-advance, swipe-to-log and Stories-style progression.
  That's the agency-supporting side of Lukoff's split. So is the rule that **the person picks** (the
  three-why swap: "nothing is chosen for you"). It's the strongest test for the spotlight below.

### S7. "You left off …" in the person's own words
- **Finding:**
  - Epstein et al.'s lived informatics model (2015, UbiComp; 105, 99 and 83 survey respondents plus
    22 interviews) treats **lapsing and resuming as normal stages** of self-tracking, not as failures
    (via search).
  - Epstein et al. (2016, CHI) argue that tools should support **good** abandonment and return (via
    search).
  - Ayobi et al. (2018, CHI), on bullet journals: rigid digital trackers fail people's **"everyday
    practical and emotional needs"**, while flexible, mindful tracking meets them (via search).
- **Strength of evidence:** moderate (qualitative HCI with large samples).
- **For the stack:** "you left off" says where you were, not how long you've been gone, which is
  exactly what a lapse-and-resume model asks for. It also names something you *did*, which supports
  competence (SDT) without praise.

### S8. One wander under two whys: a mirror tile, in words, with no weights
- **Finding:** goal-systems research calls one means serving several ends *multifinality*. The SDT
  angle is that it's a story about **coherence**: one act expressing several things you value. That
  is meaning-making, not optimisation (Inference).
- **For the stack:** the "◇ also toward feel productive" tile shows coherence without weighing the
  whys against each other. For persona D it's one of the most meaningful lines on the screen. Keep it
  weightless: no "mostly toward".

---

## Refinements

Each one has the change, the finding behind it, its fit with DESIGN.md, and a size. None is **big**
on its own under `briefs/README.md`: they're copy, state rules or visual weight inside B-06's slices.

### R1. After a pop, leave a resting place: the mirror row echoes what you did before it offers anything new (S)
- **Change:** frame 3 has the toast say "Logged" while the mirror row already says
  "↳ Log: draw better hands". Instead:
  - after a pop, the mirror row reads "**↳ Moved toward draw · sketched a hand**" (quiet, with no
    chevron accent);
  - it goes back to showing the new top only after the person's next interaction with the stack (a
    tap, a swipe or a new visit). That's an interaction, not a timer, so it doesn't break the no-timers
    rule.
  - The risen block keeps "now on top", with no accent or focus, as in the mockup.
- **Finding:**
  - B-02's C walkthrough ("done one, here's the next … feels like a treadmill") is the persona-level
    signal.
  - The research reason: an immediate follow-on directive turns informational feedback into
    controlling feedback. Henderlong & Lepper (2002), *Psychological Bulletin* 128(5): praise or
    feedback that's perceived as **controlling** (feedback with a directive attached) undermines
    intrinsic motivation, while **informational** feedback supports it (via search; Inference for this
    UI).
- **Fit:** it keeps DESIGN.md's existing "one quiet '+ What's next? (optional)'" resting place, which
  chains would otherwise remove.

### R2. When the risen layer is a "toward" (abstract), don't offer it as something to log (S)
- **Change:** in frame 3, "draw better hands" was a *why* layer and is now the mirror row's
  "Log: draw better hands". When the new top was a "toward" rather than a step the person staged as a
  step:
  - the row offers "**+ something small toward draw better hands** (optional)";
  - it doesn't load the abstract line into the log box.
- **Finding:** Steel's meta-analysis (2007, *Psychological Bulletin* 133(1), 691 correlations) lists
  **task aversiveness, low self-efficacy and impulsiveness** among the strongest predictors of
  procrastination (via search). A vague top is aversive in exactly that way: you can't tell what
  "logging" it would mean. Construal-level detail is the other auditor's; the pressure point here is
  that a "Log:" over something you can't log reads as a reproach.
- **Fit:** D-5 (only the top is loggable). This changes *how the top is offered*, not the model.

### R3. A staged step never ages (S, and it needs a DESIGN.md line)
- **Change:**
  - no "staged 3w" and no warmth fade on a **step** block or on the mirror row;
  - warmth and "last touched" stay on the *wander*, as today, and can be turned off.

  A step waiting for you looks the same after two days or two months.
- **Finding:**
  - **Abstinence-violation / "what-the-hell" effect.** Once a self-set standard reads as broken,
    people tend to abandon it altogether. This runs from Herman & Mack (1975) and Polivy & Herman's
    dieting work, to Marlatt's abstinence-violation effect in relapse, to Cochran & Tesser (1996) on
    goal framing.
    - Evidence: moderate, with mixed recent replications in dieting (via search).
    - An aged step is a visible broken standard.
  - **The ostrich problem.** Webb, Chang & Benn (2013), *Social and Personality Psychology Compass*
    7(11): people **avoid information about their goal progress** when they expect it to be bad.
    Chang, Webb & Benn (2017), *Frontiers in Psychology*, found the top reasons were that progress was
    poor and that thinking about the goal brought negative feelings (via search). Evidence: moderate.
    - For a returner, the *app itself* becomes the information they avoid. That's C's "If it makes me
      feel behind, I'll delete it", stated in research terms.
- **Fit:**
  - DESIGN.md ("Recency is neutral") covers wanders but says nothing about steps, so propose a line:
    *"A staged step shows no age and doesn't fade."*
  - The owner owns DESIGN.md, so this is offered, not applied.

### R4. Draw "left off" as a solid tile in the person's words, not dashed italic (S)
- **Change:** frame 1's "left off: hemmed trousers" is dashed, italic and muted. In this app, dashed
  means *a suggestion, or something not there yet* (the dashed doing chip, the dashed "+ What's it all
  for?").
  - Make it a quiet **solid** tile, upright text: "you left off: hemmed trousers".
  - It's a thing you did (a toward move), not a gap.
- **Finding:** SDT's competence need is met by informational signs of effectance (Peters, Calvo &
  Ryan 2018, *Frontiers in Psychology* 9:797, METUX; via search). A record of what you did is the
  purest form of that. Drawing it like a placeholder turns it into a visible absence. **Inference.**
- **Fit:** "Returning is warm"; the B-06 panel said "You left off" is "the warmest line on the screen".

### R5. One accent per screen: only the mirrored top is accented (S)
- **Change:** frame 1 shows two accented "next" tops plus an accented mirror chevron. That's three
  asks on one screen.
  - Accent only the top that the mirror row is showing (the page in view, the tower last tapped).
  - Other tops are neutral.
- **Finding:**
  - Several simultaneous calls to action read as a **list of shoulds** (persona A's fear).
  - Chernev, Böckenholt & Goodman's (2015) choice-overload meta-analysis (*Journal of Consumer
    Psychology* 25(2), 99 observations) found overload grows with **preference uncertainty, task
    difficulty and an effort-minimising goal** (via search). That describes a tired returner choosing
    among pursuits. Scheibehenne et al.'s (2010) earlier meta-analysis found a mean effect near zero,
    so the evidence is **contested**.
  - Calm technology: "require the smallest possible amount of attention" (Case, *Calm Technology*,
    2015, principle I; via search).
- **Fit:** DESIGN.md says little about accent use, so this is polish. The visual auditor may tune
  weights.

### R6. A visible way out of the top, with three kind exits (S–M)
- **Change:** the mockup puts "Set it down" behind a long-press, which is undiscoverable for E and F
  and invisible to C exactly when C needs it. Instead:
  - a small "⋯" on the top block opens:
    - **Something smaller** (+ a step on top);
    - **Did it already** (pops it without logging, with Undo; B-02 panel refinement 5);
    - **Set it down** (removes it, with Undo, no trace);
  - long-press stays as a shortcut.
- **Finding:**
  - Self-forgiveness after procrastinating predicted **less procrastination next time**, through
    lower negative affect. Wohl, Pychyl & Bennett (2010), *Personality and Individual Differences*
    48(7), 119 students; correlational, and only among heavy procrastinators (via search). Evidence:
    weak to moderate.
  - A self-compassion induction **reduced distress and over-eating after a "lapse"** among restrictive
    eaters. Adams & Leary (2007), *Journal of Social and Clinical Psychology* 26(10) (via search).
    Evidence: moderate.
  - Self-compassion after a mistake **increased the motivation to improve**. Breines & Chen (2012),
    *PSPB* 38(9), four experiments (via search). Evidence: moderate.
  - Procrastination is **short-term mood repair**: avoiding the task avoids the bad feeling it brings
    (Sirois & Pychyl 2013, *SPPC* 7(2); via search). Evidence: moderate.

  Together: a stale top grows aversive because looking at it hurts. The fix is a cheap,
  judgement-free way to make it smaller, mark it done or put it down, not more reminding.
- **Fit:** B-02 refinements ("smaller", "done it already"); Undo everywhere; nothing applied
  silently.

### R7. One "You left off" line per page, even when steps are staged (S)
- **Change:** the owner's B-06 answer was that each row shows "You left off". The tower mockup kept it
  only for towers *without* a step.
  - Add one quiet line under the page title: "you left off: sketched a jacket", the latest log toward
    this why, in the person's words, up to two lines.
  - It sits on the page, not on every tower.
- **Finding:** past before future. A returner sees **what they did** (competence; resuming, per S3
  and S7) before **what's next** (an ask). Epstein's model treats resuming as its own stage with its
  own needs. **Inference.**
- **Fit:** B-06's owner answer 3; "Returning is warm" ("you left off here *and* a small next step",
  in that order).

### R8. Reset the anchor to "All" when Home is left (S), which answers an open decision
- **Change:** among the mockup's "Does the anchor stay?" options, this lens favours **reset**. Back
  can still step down within a visit.
- **Finding:** a returner who reopens deep inside the chain they left three weeks ago meets the
  ostrich problem's bad news first (R3). "All" opens on whys, the directions, which don't age.
  **Inference** from Webb et al. (2013).
- **Fit:** the B-06 panel's "not remembered"; pinning is on the cut list.

### R9. Pages and blocks are only as tall as what they hold (S)
- **Change:** frames 2 and 3 show a tall empty card with a short stack at the bottom. Visually it's a
  pyramid with little on it: an unfilled container.
  - Size the page to its content, and let the space go back to the graph or the peek.
  - A why with nothing feeding it shows its base and, only when selected, "+ a step toward this, if one
    comes to mind". Never empty air.
- **Finding:** persona C's fear of "empty states that scold", plus S2 (an empty measure is still a
  measure). The visual-perception auditor may have more on it. **Inference.**
- **Fit:** B-05 dropped "nothing feeds it yet" for the same reason.

### R10. Make one of the why examples relational (S)
- **Change:** B-05 P-40's examples "span a feeling, a value and an end". Make one of them about a
  person or people ("be there for my sister", "cook for friends").
- **Finding:** SDT's third need is **relatedness** (Peters, Calvo & Ryan 2018). A solo, on-device app
  can't supply it socially, but a why can *be* relational, and the ACT Matrix's base question is "who
  *or what* is important to me". Evidence: moderate for the need; Inference for the copy.
- **Fit:** within P-40, and no social features.

### R11. Screen-reader and toast wording stays informational (S)
- **Change:**
  - the top is announced as "sketch a hand, staged step toward draw. Button: load into the log box";
  - never "next task" or "to do";
  - the toast says "Logged 'sketch a hand' · toward draw";
  - never "Done", "Nice!", "Great job", ticks, strike-throughs or confetti.
- **Finding:**
  - Controlling language ("must", "ought") **raised reactance and made messages less effective**,
    and adding a freedom-restoring postscript helped. Miller, Lane, Deatrick, Young & Potts (2007),
    *Human Communication Research* 33(2) (via search). Evidence: moderate.
  - Autonomy-supportive teachers use **informational, non-pressuring language** and acknowledge the
    learner's perspective. Reeve & Jang (2006), *Journal of Educational Psychology* 98 (via search).
    Evidence: moderate.
  - Informational feedback rather than controlling praise: Henderlong & Lepper (2002).
- **Fit:** the toast rule already exists. This adds the wording guardrail.

---

## The next-step spotlight

> Owner: "maybe the highlight there should be like a highlighted section that prompts the next step
> that is a separate view on top of the already displayed stack."

**Verdict: fits if changed.** A spotlight can be one of the most autonomy-supporting things on Home,
or the first nag in an app that has none. Research gives a fairly clear line between the two. The
deciding question is **whose choice it shows**.

### What makes it supportive

1. **It enlarges your own focus. It never picks for you.**
   - It shows the step of the page you're on, or the tower you tapped. It's never an algorithmic
     "here's what you should do" chosen across whys (most recent, most neglected, oldest step).
   - Lukoff et al. (2021): recommendations and autoplay lower the sense of agency, while things the
     user directs raise it.
   - DESIGN.md already has this ethic in the why swap ("you pick … nothing is chosen for you").
   - **This is the line that matters most.**

2. **It answers a gesture (pull, not push).**
   - It appears when the person taps a tower's top or the mirror row.
   - It never appears on app open, never as the first thing after a gap, and never straight after a
     log (R1's resting place).
   - Calm technology's split between centre and periphery (Weiser & Brown, "Designing Calm
     Technology", Xerox PARC 1995, *PowerGrid Journal* 1996; Case 2015): information waits in the
     periphery, the mirror row, and moves to the centre only when invited.
   - Gray et al. (2018, CHI) define **nagging** as a redirection of expected functionality that
     persists across one or more interactions (via search). A spotlight that greets you uninvited is
     nagging, even if it's polite.

3. **It carries the three internalisation conditions** (Deci et al. 1994):
   - **rationale:** "toward *draw* · toward *make apparel*", the why, visible;
   - **acknowledges the person:** "you left off: sketched a jacket", what they did, in their words.
     No "welcome back" (which mentions the absence) and no "you've got this" (an evaluation);
   - **choice:** equal-weight actions, with "Load it" first, then "Something smaller", "Set it down",
     and a plain close (×, or "Not now").

4. **Its wording is informational, not controlling** (Miller et al. 2007; Reeve & Jang 2006):
   - name the step and the why, and give each verb what it does ("Load it" loads, as crumbs do; it
     doesn't complete anything);
   - no "Time to…", "Ready to…?", "Don't forget", "You should" or "Up next";
   - no confirmshaming on the close. Mathur et al. (2019, CSCW) document dismiss options worded "to
     shame the user into avoiding it" (via search), so "Not now" is right and "No, I'll stay stuck"
     is the pattern to avoid.

5. **It's a layer over the stack, not a screen in front of it.**
   - It's non-modal, the stack stays visible and scrollable beneath, and the log box keeps working.
     Capture is sacred.
   - A modal is Gray et al.'s **interface interference**: it privileges one action and hides the
     alternatives.
   - Seeing the other pursuits beneath it is itself autonomy support: you can always choose another.

6. **It leaves easily and leaves nothing behind:**
   - it closes on a tap outside, a swipe, any log, or leaving Home;
   - it doesn't come back unprompted in the same visit;
   - dismissals aren't counted or remembered, and there's no "Don't show again?" follow-up;
   - no pulse, glow or entrance animation, and nothing at all under Reduce Motion.

7. **It replaces the mirror row instead of adding to it.**
   - The mirror row already is a minimal spotlight: one step, in the periphery, at the point of
     performance (S3).
   - The owner's idea works best as **the mirror row expanded on tap** into a short panel (step,
     toward-trail, "you left off", the three actions).
   - Showing the same step in three places (tower top, spotlight, mirror row) multiplies one ask into
     three (R5).

### What turns it into pressure (refuse these)
- It opens on launch or after a gap ("Pick up where you left off?" as a gate).
- It picks a step for you across whys ("Today's step").
- It re-surfaces after you close it, or after a set time (that's also a timer).
- It shows an age ("staged 12 days ago"), a count ("3 steps waiting") or a streak-like line.
- It has a primary "Done ✓" button. Logging is the only way to pop the top, and it's always
  "toward".
- It's accented more heavily than the log box, or it moves.

### By persona
- **C:** fine on pull, harmful on push. The difference between "I asked to see it" and "it was
  waiting for me" is the whole thing.
- **A:** it helps the dabbler *start* (one external step, Barkley), as long as it never reads as
  "Next up:" (A fears a plan).
- **D:** wants the toward-trail and their own words in it. This is where it earns its space.
- **B:** would want it always on. This lens says no: always-on is push.
- **E and F:** it's acceptable as a labelled, announced, dismissible panel, with focus moving into it
  only because the person opened it.

**Size:** S–M (a panel on Home inside B-06). **Big:** not on its own, since it folds into B-06, which
is already big.

---

## Cautions and risks

1. **A tower's height is a count you read with your eyes.** B-02's C said this about lists, and it
   holds for towers too.
   - Keep three layers at most, fold the middle behind "⋮" with **no number on the fold**, and when it
     opens, show only steps still staged: no popped items and no ticks.
   - Perfectionistic **concerns** (fear of mistakes, self-criticism) go with *more* procrastination
     (r ≈ .23), while perfectionistic **strivings** go with less (r ≈ −.22). Sirois, Molnar & Hirsch
     (2017) meta-analysis, *European Journal of Personality* 31(2) (via search).
   - "+ something smaller" invites the **prerequisite regress** of perfectionism ("before X I need
     Y…"). The fold, and "Let these go" with Undo, are the guardrails.
   - **Evidence:** strong for the correlation, Inference for the UI.
2. **Don't write self-compassion into the copy.** The research supports self-compassion as a
   *state*, but in-app lines like "Be kind to yourself!" or "It's OK to rest 💛" are evaluations of
   the person. They imply something needed forgiving, and to C they can read as patronising or as
   surveillance.
   - Lab inductions (Adams & Leary; Breines & Chen) were guided writing exercises, not microcopy.
   - Express self-compassion *structurally*: no ages, easy exits, warm "you left off".
   - **Inference.**
3. **The stack as a moral ledger.** Sociologists of self-tracking (Lupton, *The Quantified Self*,
   2016) describe how tracking can turn into self-surveillance and personal responsibility for
   "improvement". A stack of "toward" layers can drift that way if the language turns evaluative
   ("behind", "stalled", "overdue").
   - The apps discovery already set "resting", never "stalled". Keep it absolute.
3b. **ADHD research cautions against deficit framing.** Spiel, Hornecker, Williams & Good (2022, CHI)
   found ADHD technology research is mostly aimed at neuro-normative outcomes, and argue for
   designing *with* people's own aims (via search).
   - So the stack shouldn't "fix focus". It should give an external place for what the person already
     wants.
   - A 2026 CHI preprint on neurodivergent self-tracking (Rudberg Selin, Unéus & Knudsen, "Chasing
     Shadows") reports heavy **emotional and interpretive burden** in tracking, and recommends simple,
     adaptable methods (via search; preprint, n = 6).
   - **Evidence:** weak (qualitative), but it points the same way as the rules.
4. **Visual density for A and ADHD-like use.** Frame 1 holds the mini graph, a trail, chips, three
   towers, a peek, the mirror row, the log box and tabs. Each piece is calm, but together they're a lot
   to take in for someone who opens the app to dump a line.
   - Mitigations: the log box is always reachable without scrolling, the trail is hidden at "All" (it
     only says "All"), and R5's single accent.
   - The visual auditor owns the details.
5. **The peek and the carousel.** A peek of the next page is a common, informational affordance, but
   it's also a small lure.
   - It's bounded (it's your own whys, at most three declared, and it doesn't loop or auto-advance),
     so it isn't one of Monge Roffarello, Lukoff & De Russis's attention-capture patterns (CHI 2023;
     infinite scroll, autoplay; via search).
   - Keep it bounded: no infinite loop back to the first page, and no "you might also…" pages.
6. **"Did it already" drops the record.** Popping without logging means a real toward move goes
   unrecorded.
   - That's acceptable because it's chosen, but the menu could offer "Did it already" with a one-tap
     "log it too" in the Undo toast.
   - Don't make that the default, or it becomes an obligation to record.
7. **The base's accent tint on every page.** A declared why with an empty floor and nothing above it
   is C's "declared thing left untouched".
   - R7 ("you left off" on the page) and R9 (no empty air) are the mitigations.
   - If a declared why has nothing at all toward it, its page could show only its name and the gentle
     offer when selected: no tinted plinth under nothing.
8. **Evidence limits.**
   - Almost none of these studies tested an interface like this one.
   - SDT's internalisation and Etkin's measurement effects are the most transferable.
   - Zeigarnik-style "open loops" claims are weak (Ghibellini & Meier 2025).
   - The "what-the-hell" effect has mixed replications in dieting.
   - Treat this as reasoned direction, not prediction. The owner's own use (owner-notes) is still the
     only real signal.

---

## Doesn't fit (research-backed tactics the rules refuse)

Kept so they aren't re-proposed. Each *works* for engagement or goal attainment in some studies, and
that's exactly why it's listed.

| Tactic | Evidence it "works" | Rule it breaks |
|---|---|---|
| **Progress monitoring and feedback** ("3 toward make apparel this week", rings, % up the tower) | Strong: Harkin et al. (2016, *Psychological Bulletin* 142(2)) meta-analysis found progress monitoring improves goal attainment, more so when it's reported or recorded (from my knowledge of the paper, not re-checked this session) | Never list: counts, % complete. Etkin (2016) shows the cost for enjoyable activities |
| **Streaks / "don't break the chain"** | Weak to moderate for short-term adherence | Never list. Breaking a streak invites the what-the-hell effect; C's fear |
| **Goal-gradient pull** (a nearly full tower, "one more to go") | Moderate (Kivetz, Urminsky & Zheng 2006, *Journal of Marketing Research*; from knowledge) | Goals with targets; "no plans for the how" |
| **Re-engagement nudges** ("We miss you", "Your step is waiting") | Strong for opens, little for wellbeing | No notifications; counting absence |
| **Fresh-start prompts tied to dates** ("New week, new start") | Moderate (Dai, Milkman & Riis 2014, *Management Science*; from knowledge) | Schedules or calendars, and pushed. The *person's own* "Let these go" is the self-chosen fresh start |
| **Celebration, variable rewards, confetti, "Great job!"** | Moderate for short-term engagement (game and "Hooked" literature) | Never list's spirit (gamification); controlling praise (Henderlong & Lepper) |
| **Algorithmic "today's step"** across pursuits | Common in planners | Agency (Lukoff 2021); "nothing is chosen for you" |
| **Auto-expiring or auto-archiving steps** | Reduces backlog (Sunsama, Intend) | Nothing applied without a tap (already refused in B-02) |
| **"You seem stuck" detection** (a step unchanged for N days triggers a prompt) | n/a | Counting absence. R6's visible "⋯" is the non-detecting version |
| **Mood or guilt check-ins after a gap** ("How do you feel about being away?") | Self-reflection prompts can help in therapy contexts | Evaluates the absence, and adds a step before capture |
| **Social accountability** (share your stack, buddies) | Moderate for adherence; serves relatedness | "It's yours" (on-device). R10 covers relatedness in the why instead |
| **Time-specific plans** ("I will sketch at 7 pm") | Strong (implementation intentions; the other auditor's lens) | Timers, schedules, "no plans for the how" |

---

## Sources

Self-determination theory and autonomy-supportive design
- Peters, Calvo & Ryan (2018). Designing for motivation, engagement and wellbeing in digital experience. *Frontiers in Psychology* 9:797. https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2018.00797/text · PMC: https://pmc.ncbi.nlm.nih.gov/articles/PMC5985470
- Peters (2021). Wellbeing supportive design: research-based guidelines (preprint). https://selfdeterminationtheory.org/wp-content/uploads/2021/09/2021_Peters_WellBeingSupportiveDesign.pdf
- Deci, Eghrari, Patrick & Leone (1994). Facilitating internalization: the SDT perspective. *Journal of Personality* 62(1), 119–142. https://www.scilit.net/publications/e554130c207ba521e5fca210da772399
- Ryan, Rigby & Przybylski (2006). The motivational pull of video games: an SDT approach. *Motivation and Emotion* 30(4), 347–363. https://doi.org/10.1007/s11031-006-9051-8
- Deci, Koestner & Ryan (1999). A meta-analytic review of experiments examining the effects of extrinsic rewards on intrinsic motivation. *Psychological Bulletin* 125(6), 627–668. https://pubmed.ncbi.nlm.nih.gov/10589297/
- Henderlong & Lepper (2002). The effects of praise on children's intrinsic motivation. *Psychological Bulletin* 128(5), 774–795. https://pubmed.ncbi.nlm.nih.gov/12206194/
- Reeve & Jang (2006). What teachers say and do to support students' autonomy. *Journal of Educational Psychology* 98, 209–218. https://selfdeterminationtheory.org/wp-content/uploads/2014/04/2006_ReeveJang_JEP.pdf
- Miller, Lane, Deatrick, Young & Potts (2007). Psychological reactance and promotional health messages. *Human Communication Research* 33(2), 219–240. DOI 10.1111/j.1468-2958.2007.00297.x (via search)
- Vallerand et al. (2003). Les passions de l'âme: on obsessive and harmonious passion. *JPSP* 85(4), 756–767. https://www.intranet.fse.ulaval.ca/fichiers/public/prof/pub_1618__Vallerandetal_2003.pdf
- Lukoff et al. (2021). How the design of YouTube influences user sense of agency. CHI '21. https://par.nsf.gov/biblio/10311866 · arXiv 2101.11778

Self-compassion, lapses, procrastination and perfectionism
- Neff (2003). Self-compassion. *Self and Identity* 2. Overview: https://self-compassion.org/wp-content/uploads/publications/Mindfulness_and_SC_chapter_in_press.pdf
- Adams & Leary (2007). Promoting self-compassionate attitudes toward eating among restrictive and guilty eaters. *Journal of Social and Clinical Psychology* 26(10), 1120–1144. https://scholars.duke.edu/publication/782823
- Terry & Leary (2011). Self-compassion, self-regulation, and health. *Self and Identity* 10(3), 352–362. https://scholars.duke.edu/publication/782821
- Breines & Chen (2012). Self-compassion increases self-improvement motivation. *PSPB* 38(9), 1133–1143. https://pubmed.ncbi.nlm.nih.gov/22645164/
- Wohl, Pychyl & Bennett (2010). I forgive myself, now I can study. *Personality and Individual Differences* 48(7), 803–808. Digest: https://bps.org.uk/research-digest/cure-procrastination-forgive-yourself
- Sirois & Pychyl (2013). Procrastination and the priority of short-term mood regulation. *Social and Personality Psychology Compass* 7(2), 115–127. https://eprints.whiterose.ac.uk/id/eprint/91793/
- Steel (2007). The nature of procrastination: a meta-analytic and theoretical review. *Psychological Bulletin* 133(1), 65–94. https://prism.ucalgary.ca/handle/1880/47914
- Sirois, Molnar & Hirsch (2017). A meta-analytic and conceptual update on procrastination and multidimensional perfectionism. *European Journal of Personality* 31(2), 137–159. https://eprints.whiterose.ac.uk/112533/
- Cochran & Tesser (1996). The "what the hell" effect. In Martin & Tesser (eds.), *Striving and Feeling*; Polivy & Herman, and Herman & Mack (1975), as summarised (via search). https://en.wikipedia.com/wiki/Counterregulatory_eating
- Webb, Chang & Benn (2013). "The ostrich problem". *Social and Personality Psychology Compass* 7(11), 794–807. https://eprints.whiterose.ac.uk/id/eprint/76946/
- Chang, Webb & Benn (2017). Why do people act like the proverbial ostrich? *Frontiers in Psychology*. https://www.frontiersin.org/articles/10.3389/fpsyg.2017.00152/text
- Wrosch, Scheier, Miller, Schulz & Carver (2003). Adaptive self-regulation of unattainable goals. *PSPB* 29, 1494–1508. https://pubmed.ncbi.nlm.nih.gov/15018681/
- Masicampo & Baumeister (2011). Consider it done! *JPSP* 101(4), 667–683. https://pubmed.ncbi.nlm.nih.gov/21688924/
- Ghibellini & Meier (2025). Interruption, recall and resumption: a meta-analysis of the Zeigarnik and Ovsiankina effects. *Humanities and Social Sciences Communications*. https://ideas.repec.org/a/pal/palcom/v12y2025i1d10.1057_s41599-025-05000-w.html

ACT
- Harris, *ACT Made Simple* (2009; 2nd ed. 2019); worksheets: https://www.actmindfully.com.au/wp-content/uploads/2018/06/2018_COMPLETE_WORKSHEETS_FOR_RUSS_HARRIS_BOOKS.pdf · values as directions (secondary): https://www.psychologytools.com/resource/values-connecting-to-what-matters
- ACT Matrix (Polk): https://contextualscience.org/act_matrix (already in `discovery-stack-apps.md`)

Calm technology, attention ethics, dark patterns
- Weiser & Brown (1995/1996). Designing calm technology. https://www.johnseelybrown.com/calmtech
- Case (2015). *Calm Technology*. O'Reilly. Principles: https://oreilly.com/content/principles-calm-technology-we-are-not-bad-at-technology-technology-is-bad-at-us
- Gray, Kou, Battles, Hoggatt & Toombs (2018). The dark (patterns) side of UX design. CHI '18. https://par.nsf.gov/servlets/purl/10057203
- Mathur et al. (2019). Dark patterns at scale. CSCW. https://webtransparency.cs.princeton.edu/dark-patterns · arXiv 1907.07032
- Monge Roffarello, Lukoff & De Russis (2023). Defining and identifying attention capture deceptive designs. CHI '23. https://deceptive.design/articles/defining-and-identifying-attention-capture-deceptive-designs-in-digital-interfaces
- Center for Humane Technology, humane product design. https://www.humanetech.com/humane-product-design

Self-tracking and lived informatics
- Epstein, Ping, Fogarty & Munson (2015). A lived informatics model of personal informatics. UbiComp '15. https://my.eng.utah.edu/~cs5540/au16/readings/PersonalInformatics-Epstein2015.pdf
- Epstein et al. (2016). Beyond abandonment to next steps. CHI '16. https://pmc.ncbi.nlm.nih.gov/articles/PMC5428074
- Ayobi, Sonne, Marshall & Cox (2018). Flexible and mindful self-tracking: design implications from paper bullet journals. CHI '18. https://core.ac.uk/download/158371374.pdf
- Etkin (2016). The hidden cost of personal quantification. *Journal of Consumer Research* 42(6), 967–984. https://marketing.wharton.upenn.edu/wp-content/uploads/2016/10/Etkin-Jordan-11-12-15-Hidden-Cost.pdf
- Lupton (2016). *The Quantified Self*. Polity (cited from knowledge).
- Bellotti et al. (2004). What a to-do: studies of task management. CHI '04. https://hci.rwth-aachen.de/materials/conferences/CHI2004/1p735.pdf

ADHD and executive function
- Barkley (1997). Behavioral inhibition, sustained attention, and executive functions. *Psychological Bulletin* 121(1). https://sciences.ucf.edu/psychology/childrenslearningclinic/wp-content/uploads/sites/24/2013/08/Barkley-1997-Psych-Bulletin.pdf · point of performance (course outline): https://continuingedcourses.net/course/adhd-in-children-diagnosis-assessment-and-management/
- Spiel, Hornecker, Williams & Good (2022). ADHD and technology research – investigated by neurodivergent readers. CHI '22. https://dare.uva.nl/id/b5158a6b-ee52-48a7-b4be-772d430bad4a
- Rudberg Selin, Unéus & Knudsen (2026, preprint). "Chasing Shadows": personal data externalization and self-tracking for neurodivergent individuals. arXiv 2603.22609 (via search; host blocked)

Choice overload (contested)
- Chernev, Böckenholt & Goodman (2015). Choice overload: a conceptual review and meta-analysis. *Journal of Consumer Psychology* 25(2), 333–358. https://www.kellogg.northwestern.edu/faculty/research/detail/2015/when-product-assortment-leads-to-choice-overload-a-conceptual
- Scheibehenne, Greifeneder & Todd (2010). Can there ever be too many options? *Journal of Consumer Research*. https://abcwest.cogs.indiana.edu/pmwiki/pdf/scheibehenne.options.2010.pdf

Cited from knowledge, not re-checked this session: Harkin et al. (2016) *Psychological Bulletin*
142(2); Kivetz, Urminsky & Zheng (2006) *Journal of Marketing Research*; Dai, Milkman & Riis (2014)
*Management Science*; Lupton (2016).
