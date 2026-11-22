# B-06 — The intention stack

**Status:** proposed (asked) · **Decision:** D-9 · **Theme:** Seeing flow / Know the why / Warm return · **Date:** 2026-11-22

_Built up over one conversation: the sections below are in the order they were decided. The current design is the mockup page (7 frames) published 2026-11-22 and the owner's answers at the end; research: [discovery/2026-11-22-intention-stack](../discovery/2026-11-22-intention-stack.md)._

## The problem, in the owner's terms
> "I should be able to see my pursuits … relative to the actions and activities that I put towards
> them, as well as stage next steps, and … quickly interact with those wanders from the screen. My
> initial intuition was that there was going to be a list, a stack of … pursuits or higher level
> nodes with their steps appended to them. So I can quickly see, oh, I should do this next. … I can
> click on that step, onboard the next step, and just kind of see those chains come into view. And
> the graph was just supposed to be a way to … provide a more impactful illustration of what's going
> on. … the interaction of seeing where my energy is going and what my next step is wasn't very
> clear." — owner, 2026-11-22

Owner's answers (2026-11-22):
1. **Graph first, stack below.** The picture stays on top of Home. The list under it (today just name
   buttons) becomes the real stack, with steps you can tap.
2. **Tapping a step loads it, you log it, then it asks for the next one.** The step goes into the log
   box (as crumbs do), and logging it shows an inline "↳ what's next?" on that row, so the chain
   continues.
3. **Energy, per pursuit:** last touched ("2d", with the warmth fading as now) and the latest
   activity line ("You left off: sketched a jacket"). No counts.
4. **B-05's approved items (P-40–P-43) wait** until Home settles. They fold into this brief's
   slices.

## The app today
- Home (P-34) is the graph, then the summary, then the whys and wanders as plain name buttons. A
  button selects (P-35): a context row at the log box offers "↳ Log next step". The step is visible
  only as a faint line under its node in the picture.
- The Wanders tab is the old Home: `ThreadCard` per wander, with its crumb (the staged step,
  tap → loads into the log box, D-6), "+ What's next?" and last touched. It's a flat "YOUR WANDERS"
  list, because P-16's headers aren't built.
- Chains (a smaller step on top of a step, D-5 / P-19–P-21) aren't built.

## Proposed experience
- **Home, top to bottom:**
  - the graph (unchanged: the illustration);
  - one summary line;
  - **the stack**;
  - the log box.
- **The stack:**
  - **groups:** each why heads a group (declared first, then earned, the order the graph uses),
    with the wanders feeding it nested under it, then "Other wanders";
  - **each row** shows:
    - the name, and the why's role in words;
    - last touched ("2d");
    - "You left off: <latest activity>" in one quiet line;
    - the staged step as a tappable **↳ crumb**;
  - **without a staged step,** a row shows a quiet "+ next step";
  - **limits:** the same caps as the picture, with "and more →" going to the Wanders tab. Wanders in
    Earlier stay out of the stack.
- **Tap a step:** it loads into the log box with the wander as doing (today's crumb rule: nothing is
  completed by the tap). When you log it, the step clears, and that row opens an inline "↳ what's
  next? (optional)" field. Ignoring it leaves no trace. When chains exist (P-19), the next step
  down rises into the crumb, and the chain comes into view under the row.
- **Tap a row's name:** selects it (P-35's context row) and highlights its node in the picture. A
  long-press or "Open" goes to its page.
- **The graph and the stack stay in step:** tapping a node scrolls to its row and highlights it. This
  doubles as the accessible path: the stack *is* the list twin the panels asked for.
- **Empty and early states:**
  - no wanders: the stack is empty, and your logs show as dots (P-38);
  - logs but no whys: B-05's "<latest log> — what was it toward?" sits at the top of the stack;
  - naming a why adds its group, opens the step field, and shows "Anything here toward it?" (B-05
    P-41) inside the new group.
- **The Wanders tab:** to settle (question below). Either it stays as the full list (every wander,
  Earlier included, with search), or it merges into Home.

## Folded in from B-05 (D-8 → go)
- P-40 copy:
  - drop "nothing feeds it yet";
  - the examples span a feeling, a value and an end;
  - the step wording "if one comes to mind · it can wait".
- P-41 name → step → link: it now happens in the stack's new group.
- P-42 Home's offer starts from what you did: it sits at the top of the stack.
- P-43 a why's page: unchanged in scope.

## Fit with the product
- **DESIGN.md:** this changes the P-34 Interaction line ("Under the picture … the whys and wanders as
  buttons") to the stack.
  - The crumb rules (load, don't complete; D-6 chip) carry over unchanged.
  - Recency stays neutral, and nothing counts.
  - "After logging, the owning wander shows one quiet '+ What's next? (optional)' line" is the
    existing rule, now shown on Home's row.
- **STRATEGY.md:** "Know the why; leave the how open" (whys head the stack, one step each). "Warm
  return" (you left off …).
- **Not doing:**
  - progress, counts or "done";
  - more than one staged step per wander;
  - a checklist look (no checkboxes).

## Slices (proposed)
1. **The stack under the graph** `[feature]` M:
   - groups and rows (name, last touched, "you left off", crumb or "+ next step") replace the name
     buttons;
   - row tap selects; the step crumb loads;
   - caps and "and more →".
2. **Log a step → what's next, on the row** `[feature]` S: the inline field after logging a step, on
   Home.
3. **Graph ↔ stack** `[feature]` `[a11y]` S: a node tap scrolls to and highlights its row; the
   picture's twin is the stack.
4. B-05's P-40, then P-41 and P-42 (placed in the stack), then P-43.
5. Chains in the stack, when P-19 is built.

## Data and risk
No stored-format change for slices 1–3. P-41 writes `toIds` (Full tier), as before. The main risk is
e2e churn on Home.

## Decision requested
**D-9:** build slice 1 now (then 2, 3, and the B-05 items in the stack)?
- **Go** (recommended);
- **Go, after a quick persona panel**;
- **Go, but change …**.

Open questions:
- the Wanders tab (keep it as the full list, or merge it into Home);
- how many rows Home's stack shows.

## Three ways to make the stack and the graph one thing (owner, 2026-11-22: "deliberate on how that looks in a mockup … leverage the graph view in a way the list view can [follow], because the graph makes the relationship between what I'm doing and for what very explicit")
Mockups: (mockup screenshots, session-local) `opt-a.png`, `opt-b.png`, `opt-c.png`, and the shared step flow
`step-flow.png` (390-wide phone frames, the app's palette, the same example data in each).
Settled by the owner: graph first, stack below; the stack shows what the graph shows; tapping a step
loads it and logging asks "what's next?" on the row; each row shows last touched and "You left off".

- **A — Graph above, stack below.** Today's picture, a little shorter. Under it, groups (each why as
  a header, its feeding wanders nested), and rows with name, last touched, "You left off", and the
  step crumb or "+ next step". Tapping a node scrolls to its row and highlights it; tapping a row's
  name lights up its node.
- **B — The list draws the graph.** The list itself carries the relationship:
  - each why is a node with a rail running down from it, and the wanders feeding it hang off the
    rail;
  - each row shows its last few logs as small dots (the newest in accent, no number);
  - the picture shrinks to a thumbnail overview on top, and a tap opens Explore.

  A wander that feeds two whys appears under both.
- **C — The graph is a lens.** The picture stays big, with the full stack under it ("All").
  - Tapping a why (in the picture or in its chip) focuses both: its lines brighten, the rest dims,
    and the list narrows to that why's subtree.
  - Inside the focus, a step's chain can open under it (D-5 / P-19, when built).
  - "All" or tapping the empty canvas clears the focus.
  - A why can hold its own step.

Open: the option (or a mix); the Wanders tab (keep it as the full list, or merge it into Home);
whether a why holds its own staged step.

## Persona panel (quick)
_Simulated perspectives from `docs/product/PERSONAS.md`, run 2026-11-22 on the three mockups. A
thinking tool, not user research. Reports were session-local._

| Persona | Picks | Reaction | What it hinges on |
|---|---|---|---|
| A — Dabbler | A | fine | no rows of blank "+ next step"; the what's-next field doesn't sit there as homework |
| B — Builder | C | delighted with C, uneasy with A | the focus as a project view; a why can hold its own step |
| C — Returner | C (chains closed) | uneasy → maybe | no ages on why headers; no stale blanks; not an empty stack after a month |
| D — Meaning-Seeker | C | delighted with C | "You left off" in their own words (2 lines); the why stays the subject |
| E — Minimalist | A | fine | no hidden modes; the first row above the fold |
| F — Assistive tech | A | fine with A, uneasy with C | headings, step buttons, no hidden state; any filter announced |

**Where all three panels landed:** A as the base, with C's focus as an **optional, labelled,
temporary** filter. "All" is always visible, the filter is announced, it's not remembered, and it
clears when you leave Home. **B is dropped** by all six:
- its dots read as a ledger (a count with the number taken off);
- its squares read as checkboxes;
- a wander feeding two whys showed up twice.

**Strong, lean on it:**
- "You left off" in your own words. It's the warmest line on the screen, and it says where you
  were, not how long you've been gone.
- Tap a step, it loads, tap Log: the fastest path in the app.
- Steps reachable on Home at last. Today a screen-reader user can't reach their step on Home at
  all, because it's pointer-only text inside the picture.

**Refinements (fit DESIGN.md, folded in):**
1. "+ next step" shows only on the selected or just-logged row, never as a column of blanks
   (A, C, D, E).
2. The "what's next?" field takes no keyboard and has no accent until tapped. For screen readers,
   the toast adds "What's next? is open on draw" (A, C, E, F; the owner's 2026-11-21 keyboard rule).
3. No age on why headers. Ages stay on wander rows (C).
4. **After a month away, the stack isn't empty.** When nothing is recent, the last few you touched
   still show with their "You left off", and no ages (found by two panels). Today, 21 days moves a
   wander to Earlier, so the stack would be blank exactly when you come back.
5. "You left off" shows the first sentence and wraps to two lines (D).
6. Accessibility:
   - why headers are headings, and each step is a labelled button;
   - "2d" is spoken as "2 days ago";
   - "and more →" is a real link;
   - the focus filter announces "Showing make apparel" and respects Reduce Motion (F).

**Refused, with the rule:** B's progress or "% done" (the never list); per-row activity counts (no
counts).

**For the owner:**
- **Can a why hold its own step?** B and D yes ("buy fabric" belongs to "make apparel" itself), F
  yes as a row under the heading, C and E no (an age-less why gaining a step starts to look like a
  task owner), A indifferent.
- **Wanders tab:** A, C, D and F keep it, E would merge it. The common ground: keep it as the full
  list, holding Earlier, hidden wanders and search, and have "and more →" lead there.
- **C's focus filter at all:** B, C and D want it; E and F accept it only labelled and announced. It
  can ship after the base.

## Owner's answers after the panel (2026-11-22)
- **Shape:** A + C's focus (A first, the focus right after).
- **A why can hold its own step,** shown as a row under its heading.
- **Not a list: a literal stack** (owner, dictated): "the top of the stack is effectively something
  that happens towards the bottom, almost like a pyramid … keep stacking on steps towards a base,
  and that base is ultimately whatever the parent goal or pursuit is. Remember every node is its own
  node and anything can be linked to each other … I can just pop off a step and at least see my
  visual hierarchy, give me the context on which I'm working … scope that at any level in a wander.
  So if 'feel productive' has three, four, five different children or subnodes, I can effectively
  swipe between them and see what the current engagement is for each of those subtrees … at any
  level of granularity … the stack is just a way of seeing … the entire subtree given from any
  parental anchor."
  - **The layers are the chain of "toward"** (B-02/D-5): each layer is the why of the one above.
    It's the context you're working in, not a to-do queue.
  - **It lives on Home, under the graph,** replacing the grouped list. It's anchored at the top level
    by default, and you re-anchor at any level.
  - **A node with two parents:** let the research suggest.
  - **Popping:** logging pops the top. "Set it down" removes the top without logging anything, with
    Undo and no trace.
- **Research asked for:** what kind of visualization this is, and how to make it work on a phone.
  Three discovery scouts are running: `discovery/2026-11-22-intention-stack/{forms,mobile,apps}.md`.
- **A carousel of chains at a level** (owner, 2026-11-22, "just a deliberation"): "maybe there's
  like a carousel viewer to swipe between any sort of chain of intention at a given level, so if
  I'm on the feel productive layer and there's like four different chains of intentions, maybe the
  carousel can swipe between each and every one of them to focus on any particular [one] and see
  its stack at that level … the idea is that I can leverage selection and focus to really highlight
  intentionality and what I wanna do next."

## Research audit of the intention stack (2026-11-22)
_Three independent lenses, reports in `discovery/2026-11-22-intention-stack/research-*.md`,
with sources. Web pages were mostly blocked, so many claims come from search excerpts and are marked
as such. Little of this research tested an app like this one: read it as which way to lean, not as
a prediction._

**What the research supports (lean on it):**
- **The why underneath and one concrete step on top is a division of labour.** Keeping the reason
  in view helps self-control (construal level: Fujita et al. 2006, not directly replicated). A
  concretely worded task gets started sooner (McCrea et al. 2008). Having both levels beat the why
  alone (Höchli et al., preliminary). It's also the self-determination theory condition for a step
  to feel chosen rather than imposed (Deci et al. 1994).
- **"You left off" is a cue to resume.** It relies on the robust effect: people tend to resume
  interrupted tasks (Ovsiankina; Ghibellini & Meier 2025 meta-analysis). The Zeigarnik memory effect
  didn't hold up. Suspended goals come back through cues (Altmann & Trafton 2002). When commitment
  is uncertain, looking at what you've done motivates more than looking at what's left (Koo &
  Fishbach 2008).
- **"+ a step toward this", then popping back up, matches action identification theory** (Vallacher
  & Wegner): people drop to smaller descriptions when stuck and rise again after success.
- **Popping means "toward", not "done".** Reading an action as progress licenses switching away;
  reading it as commitment sustains pursuit (Fishbach & Dhar 2005). ACT: values are directions.
- **No counts and equal widths are backed by evidence, not just taste.** Measuring an enjoyable
  activity lowered enjoyment (Etkin 2016). Rewards tied to finishing a task undermine intrinsic
  motivation (Deci, Koestner & Ryan 1999). Equal widths avoid implying "more here" (Cleveland &
  McGill).
- **Layered blocks are a legible form** (icicles beat treemaps, Woodburn et al. 2019). Three layers
  are one or two fixations, so the root at the bottom doesn't fight a top-down read *at the cap*.
- **A stable base and an animated re-anchor** help people keep their place (Scarr et al. 2013;
  Bederson & Boltman 1999; Heer & Robertson 2007).
- **"Set it down" with no trace** supports letting go, which goes with higher wellbeing (Wrosch et
  al. 2003).
- **Self-forgiveness** predicts less procrastination next time (Wohl, Pychyl & Bennett 2010).

**The next-step spotlight (the owner's idea): all three say it fits if changed, and it's the
strongest single change.**
- **Where:** a layer docked directly above the log box that *replaces* the mirror row, not a card
  floating over the stack:
  - an overlay hides the why at the moment you act (goals);
  - it would feel modal and get skipped like an ad (perception);
  - three copies of one step means three asks (wellbeing).
- **What it shows:**
  - line 1: "↳ sketch a hand" (large, semibold);
  - line 2: "toward draw · make apparel" (muted), so the how and the why are read together;
  - one action: load it into the log box, plus a "⋯" (Something smaller · Did it already · Set it
    down, each with Undo).
- **How it stands out:** by position, size and elevation, not hue. It's the only raised card, at
  least 56 pt tall. Accent stays reserved for whys. The matching step in the stack gets the same
  border, so you can see which one it is.
- **Wording informs, never instructs:** no "Up next", "Time to…" or "Ready?". No age, no count, no
  "Done ✓".
- **Behaviour:** it's never modal, and the log box keeps working. It collapses while you type. At
  large text it moves into the page flow. It never pulses or badges.
- **Split: which step does it show?** Perception says the tower you most recently logged into
  (neutral recency, a learned location). Goals and wellbeing say never the app's pick: it fills only
  when you tap a top, or when the page you're on has exactly one top (a single chain). Otherwise it
  stays as a quiet "You left off …" (Lukoff et al. 2021 on agency; defaults steer hard). → Owner.

**Refinements (all fit DESIGN.md):**
1. **A staged step never shows an age or fades.** Warmth stays on the wander. Seeing a self-set
   standard as broken invites giving up (what-the-hell effect; mixed replications), and people avoid
   information they expect to be bad (the ostrich problem). This needs a new DESIGN.md line.
2. **A resting moment after a pop.** The spotlight reads "Moved toward draw · sketched a hand" until
   you next touch the stack, instead of jumping to the next "Log: …". A one-time tint fade marks the
   step that rises; under Reduce Motion, a colour change and an announcement. Feedback with a
   directive attached turns controlling (Henderlong & Lepper 2002), and change blindness hides a
   silent pop (Rensink et al. 1997).
3. **If the block that rises is an abstract "toward", offer "+ something small toward …"** rather
   than "Log: draw better hands". Task aversiveness strongly predicts procrastination (Steel 2007).
4. **One meaning per colour.** Accent only for whys; steps in plain ink; the selected chip
   outlined, not filled black. Today seven kinds of element share the accent outline, so the step
   can't pop out.
5. **Make "standing on" literal.** Blocks touch each other and the base, with a small chevron
   between them for "toward". Don't taper them, because width reads as amount.
6. **"Left off" becomes a solid caption, not a dashed tile.** Dashed means "suggestion or missing"
   here. The ◇ mirror tile shrinks to one line. Replace the ⋮ fold mark, which is the platform's
   overflow icon.
7. **Fixed pager height, no empty space, no layout shifts.** The toast overlays instead of pushing.
   Cut the why's name from appearing four times.
8. **At most about three tops per page, and three layers per tower as a rule.** A tall tower is a
   to-go list. Choice overload is near zero on average but grows when you're unsure what you want.
9. **Accessibility:**
   - `faint` text fails contrast for small labels, so use `muted`;
   - build blocks with `column-reverse` so screen readers read the base first;
   - at large text, towers become a top-down list;
   - chips and rows at least 44 pt;
   - tapping the peeking edge goes to that page.
10. **Reset the anchor to "All" when you leave Home** (wellbeing; it answers decision 4). Otherwise a
    returner reopens deep inside a stale chain.
11. **Placeholder for "+ a step toward this"** nudges toward something you could start: a verb and
    an object, with no when or where.
12. **The toast says "toward draw".** The popped step stays as the tower's quiet "left off".

**Cautions:** no retrievable study settles which way up a tree is easiest to read. The pyramid is
a metaphor choice, safe at the three-layer cap. Intentions only modestly change behaviour (Webb &
Sheeran 2006), so the stack is a cue, not a cause. Don't write self-compassion into the copy;
express it through the structure.

**Refused (research-backed, but the rules refuse it):** if-then plans with times, WOOP as a flow,
goal-gradient pulls, fresh-start prompts on dates, app-ranked "do this next", "you seem stuck"
detection, re-engagement nudges, confetti and praise, auto-expiring steps, progress monitoring.

## Owner's answers after the research audit (2026-11-22)
- **The spotlight fills only with what you pick:** a tapped step, or a page with exactly one top.
  Otherwise it rests on "You left off".
- **A staged step never shows an age and never fades** (a new DESIGN.md line when it ships).
- **After a pop, the dock rests** on "Moved toward …" until you next touch the stack.
- **The anchor resets to "All"** when you come back to Home.
- **A node with two parents** (the owner left it to the research): one home under the why it fed
  most recently, plus a one-line ◇ "also toward …" mirror elsewhere.
- **Which way up:** the pyramid, base at the bottom (the owner's words; the research accepts it at
  the three-layer cap).

## Owner, 2026-11-22: minimal text in the UI
> "Please eliminate most of the descriptions because the UI should be intuitive enough to realize
> what's going on at best. You should have an information dialogue, but never it being part of the
> UI itself."

Applied to the stack design:
- The screens show names and marks only:
  - ↳ next;
  - ↺ where you left off;
  - · · · more beneath;
  - ⋯ choices;
  - → toward;
  - the accent colour means a why.
- Trails replace sentences ("draw · make apparel").
- ⋯ holds short verbs: Smaller step · Already did it · Set down.
- An ⓘ in the header opens a "How the stack reads" sheet. It never opens by itself.
- Screen-reader names keep the full meaning ("sketch a hand, next step, toward draw, for make
  apparel").
