# Adversarial practitioners: the intention stack, revision 5 (2026-11-22)

Reviewed: `stack-shots/v5-frame-1…5.png` and the v5 mockup source; `B-06-rev4-note.md` (rev 4 and
rev 5 decisions); `docs/DESIGN.md`, `docs/product/STRATEGY.md`, the top of `owner-notes.md`; the
earlier research audit (`docs/product/discovery/2026-11-22-intention-stack.md` and its
`research-*.md` reports). This review builds on that audit and argues with it in places. It doesn't
repeat it.

**What v5 is, in one paragraph.** The graph fills most of Home. Under it sits one two-line card. Line 1
is the context path ("make apparel › draw › draw better hands", 10px, muted, the why in accent). Line 2
is the step ("↳ sketch a hand", 13.5px bold) with a ✓ circle. The card opens on the chain you last
logged toward. Swiping the card selects another leaf chain and narrows the graph; the log box then gets
a removable "→ chain" chip. ✓ logs the step as an activity, detaches it, and the parent rises as the new
step (frame 4: "draw better hands" becomes the step, glowing). Tapping the step makes it a field: rewrite
it, write a smaller one, or "clear" to set it down (with Undo). There are three verbs: log, complete,
select.

**Evidence note.** Citations are to the practitioners' standard texts and well-known papers, given from
the reviewer's knowledge. They weren't re-fetched in this session. Practitioner lore (body doubling,
"Wall of Awful", "park downhill") is marked as lore. None of it tested an app like this.

---

## 1. The ADHD coach

*Grounding: Barkley (1997, Psych. Bull. 121(1); "Taking Charge of Adult ADHD", 2010/2021):
ADHD is a disorder of doing what you know, not of knowing. Externalise information, time and motivation
at the point of performance. Ramsay & Rostain ("CBT for Adult ADHD", 2008/2015; Ramsay, "Rethinking
Adult ADHD", 2020): procrastination as escape from discomfort, "malfunctioning optimism", lowering the
entry threshold. Safren et al. ("Mastering Your Adult ADHD", 2005; RCT JAMA 2010): break tasks down
until the first piece is doable. Solanto ("CBT for Adult ADHD: Targeting Executive Dysfunction", 2011):
"getting started is the hardest part"; "if it's not in the planner it doesn't exist". Lore: body
doubling, Mahan's "Wall of Awful", "park on a downhill slope".*

### Sharpest critiques
1. **(a) Define: ✓ hands my client a project disguised as a step.** Frame 4 is the worst frame in the
   set. "sketch a hand" is done, then "draw better hands" rises *into the step slot*, glowing, with a ✓
   beside it. That's an outcome, not an action. For an ADHD brain a vague, unbounded item is the Wall
   of Awful: you can't start it, can't finish it, and the empty circle sits there every time you open
   the app. The design makes the step *worse* at the exact moment the person had momentum. Barkley's
   "point of performance" cuts both ways: whatever sits there gets the person's attention, and here it
   is something they can't act on.
2. **(a) Define: nothing helps size the step.** "＋ next step" is a blank field. Clients write
   "finish chapter 4", "sew the jacket", "get fit". Safren's core skill is *breaking down until the
   first piece is obviously doable*. v5's only lever for that is "rewrite it". Worse, if "write a smaller
   one" *replaces* the text (frame 5 doesn't say), breaking down **erases** the bigger intention. That
   punishes the one skill we're trying to teach.
3. **(b) Know: the card moves when they didn't move it.** "Last logged toward" is a good default.
   I'll contest the earlier audit's R4 ("the spotlight only follows a choice") here: for ADHD a
   pre-decided default is a gift, because deciding in the moment is the bottleneck. But an `@draw` aside
   logged in passing re-targets the card. The externalised memory has to be *stable*, or the person
   learns not to trust it. The page order on swipe isn't specified either. If it's by recency, the
   carousel reshuffles every day, and "where was that one?" turns into a dopamine-seeking browse:
   swiping chains *is* the procrastination.
4. **(b) Know: v5 dropped "where was I?".** The audit's strongest research finding, the "you left off"
   resumption cue (Ovsiankina), is gone from the card. The newest dot is marked but has no label.
   Working memory is the impaired function, so "what did I last do here?" must be readable without a
   tap. The step says what's next, but not where I stopped.
5. **(c) Feel: the why is too far away and too small.** Temporal discounting is steep in ADHD. A
   distant why ("make apparel") motivates less than the *near* reason ("…so my hands stop looking like
   mittens"). The 10px muted path puts the near reason in the middle. With longer names, end-ellipsis
   cuts off **the immediate parent first**, the one link that matters most at the moment of acting.

### On a bad day
They open the app in a low-dopamine slump. The graph is pretty and they look at it. The card says
"draw better hands" (the risen parent from yesterday's ✓). They can't start that, so they swipe looking
for something easier, find "sew" with "＋ next step", feel the effort of defining a step, and close the
app. Or they type "doomscrolled" in the log box, which is fine and is the design working. The unticked
circle is what they remember.

### Changes
- **Card:** the step is the biggest, darkest thing on Home (it's the point of performance). The context
  line truncates from the **middle** and always keeps the why and the immediate parent. When there's a
  last log on this chain, show it in the person's words where it costs no extra line, e.g. as the
  newest dot's label in the lit chain.
- **"＋ next step":** the placeholder models the smallest physical start, e.g. "open the sketchbook to a
  blank page". It's copy only and nothing is validated. "Smaller" **stacks**: the old step drops into
  the context line as its toward. It is never overwritten.
- **✓:** "park downhill". After ✓ the card stays on this chain. The toast says what you did and where it
  went. The step line becomes an open "＋ next step", offered while the momentum is warm, with no
  keyboard raised and nothing to dismiss. The risen parent goes into the *context* line, never the
  step slot.
- **Wording:** a verb, an object you can touch, and permission to do it badly. "sketch one hand from a
  photo, badly"; "read the first page of ch. 4" instead of "finish chapter 4".

### Would want, refused
- Wants reminders and a lock-screen nudge; **refused by DESIGN.md** (notifications).
- Wants a "just 10 minutes" start timer and a body-doubling focus mode; **refused by DESIGN.md**
  (timers). The pull-only version that fits is the home-screen widget already on the roadmap (Capture
  anywhere), showing the card: externalised, with no push.
- Wants a "today's one thing" the app picks; **refused by STRATEGY.md** (app-chosen content).
- Wants a dopamine hit on ✓ (confetti, streak); **refused by DESIGN.md** (streaks; nothing
  celebratory). A visible new dot landing on the lit chain is the allowed reward, and frame 4 has it.

**The dots, in one line:** keep them, because they're externalised proof against "I never do anything".
Let the newest one on the lit chain say what it was, so it doubles as "where I left off".

---

## 2. The GTD trainer

*Grounding: Allen, "Getting Things Done" (2001; rev. 2015): the next action is "the very next
physical, visible activity"; a project is any outcome needing more than one action; every project
needs a next action, and the weekly review finds the ones that don't. Choosing in the moment uses the
four-criteria model (context, time, energy, priority). "Making It All Work" (2008): horizons of focus.
Heylighen & Vidal (2008, Long Range Planning 41(6)) on the cognitive basis. Masicampo & Baumeister (2011,
JPSP 101(4)): a concrete plan for an unfinished goal quiets the intrusive thoughts about it.*

### Sharpest critiques
1. **(a) Define: projects and next actions are the same object.** In v5 every node is
   both a project and an action, and ✓ treats them alike. That's the classic GTD failure: projects on
   the next-action list. "draw better hands" can't be ticked honestly. Either the person lies (ticks it)
   or it rots. The rule I'd make non-negotiable: **only text the person wrote as a step gets a ✓.** A
   node that rises because its child was done shows "＋ next step" under it.
2. **(b) Know: recency is not a selection criterion.** Allen chooses by context, time and energy, then
   priority. "Last logged toward" answers "what was I last into?", not "what can I do *here, now, with
   this energy*?". At the fabric shop with 10 minutes free, the card says "sketch a hand". One card at
   Home is defensible (it's a runway view), but then the carousel *is* the next-action list. It needs a
   stable order (the graph's order, by why) and enough of a peek to scan by name. A 50%-opacity blank
   edge isn't a list.
3. **(a) Define: stuck projects are invisible.** "sew" has no next action, and you only find out by
   swiping onto it (frame 3). GTD's weekly review exists to find exactly these. v5 defers the
   "swipe-up drawer listing every chain" to Later. I'd argue it's the weekly review and belongs sooner,
   as pull only, showing each chain's step or "＋" and no counts.
4. **(a) Define: no place for the second idea.** D-5 allows one staged step. Real minds produce
   "sketch a hand" *and* "buy a reference book" at once. With nowhere to put the second, it stays an
   open loop in the head, which is what Masicampo & Baumeister show costs attention. v5's edit-in-place
   may overwrite the first one too.
5. **(c) Feel: the missing layer is "what done looks like", not the why.** Allen starts the Natural
   Planning Model with purpose, so the why is good. But at the runway the action needs a clear *done*.
   "sketch a hand" has one. "finish chapter 4" has one. "draw better hands" never will. Since the rules
   refuse outcomes and targets, the step text must carry its own finish line.

### On a bad day
They open the app with low energy. The card shows the last chain's step, which needs a desk and focus.
They swipe and find nothing sorted by energy. They close the app and fall back to an inbox in their
head. If they ticked "draw better hands" last week just to clear it, they've learned the ✓ means
nothing.

### Changes
- **Card:** context line = project, step line = next action. Put a fixed, predictable page order on the
  carousel (never recency). The adjacent chains' *names* show in the peeks, if the owner allows that
  much.
- **"＋ next step":** placeholder "the very next thing you'd physically do". The step can hold its own
  context as plain text ("at the shop: buy fabric"); the earlier audit already allows that, and nothing
  parses it. Also apply the two-minute rule as guidance in the ⓘ sheet: if it takes two minutes, do it
  and log it, and don't stage it.
- **✓:** done is done, and the next action is decided now. After ✓, "＋ next step" opens on the same
  chain (offered, not forced; see the joint section). The ✓ stays crisp: no "toward" softening on the
  tick itself.
- **Wording:** "sew" → "thread the machine with the navy spool"; "finish chapter 4" is acceptable;
  "draw better hands" → it's a project, so its next action might be "pick three hand reference photos".

### Would want, refused
- Wants @contexts and energy tags as filters. Not on the never list, but against "leave the how open"
  and minimal text, so it's an owner call. The fallback is context as plain text in the step.
- Wants a full next-action list per project and Someday/Maybe; **refused by STRATEGY.md** (D-5: one
  staged step, nothing planned ahead).
- Wants due dates and the calendar's "hard landscape"; **refused by STRATEGY.md** (no schedules).
- Wants a weekly-review reminder; **refused by DESIGN.md** (notifications).
- Wants a desired-outcome field per project; **refused by DESIGN.md / D-4** (no goals with targets).

**The dots, in one line:** done actions aren't GTD's business; they're reference. Fine as "get current"
material for a review, as long as they never compete with the next action for the eye.

---

## 3. The ACT therapist

*Grounding: Hayes, Strosahl & Wilson, "Acceptance and Commitment Therapy" (2nd ed., 2012): values
as freely chosen, ongoing directions that are never "completed"; committed action; willingness. Harris,
"ACT Made Simple" (2nd ed., 2019): the values compass, "dead person's goals", the Choice Point (Harris
2017; Ciarrochi, Bailey & Harris 2014), defusion ("I'm having the thought that…"). Polk & Schoendorff,
"The ACT Matrix" (2014): toward and away moves. Wilson et al. (2010), the Valued Living
Questionnaire.*

### Sharpest critiques
1. **(c) Feel: "›" says *inside*, not *for the sake of*.** "make apparel › draw › draw better hands"
   reads as a folder path, a taxonomy of tasks. Values have to be *contacted*, not filed. The relation
   that matters is "this step is a toward move, for this". The glyph encodes containment and the
   reading order runs from the why down to the task. At the moment of choice, the person should read
   the step first, then *what it's toward*.
2. **(a) Define: the "why" slot accepts control agendas.** The owner's own example why is "feel
   productive", a feeling goal. ACT's first move with a feeling goal is to show it's the control agenda.
   You can't reliably make yourself feel productive, so every flat day becomes a failure of the why
   itself. "make apparel" is an outcome, not a direction. I'm not asking the app to correct anyone's
   words (that would break "capture is sacred"). But the examples offered when naming a why (B-05 P-40)
   should model qualities and directions ("making things with my hands", "being curious"). They should
   also say plainly in the ⓘ sheet that a why is a compass, not a feeling to achieve.
3. **(b) Know: the empty ✓ circle is a "should".** The earlier audit called a primary "Done ✓"
   pressure, and the owner chose it anyway. I partly contest the audit: a committed action is a promise
   the person made to themselves, so a tick is legitimate. What turns it into a "should" is *fusion*:
   for a client hooked by "I'm lazy", an unticked circle at open is evidence. The fix isn't to remove
   the ✓. It's that what follows the ✓ must be informational (where it went), and that leaving the step
   untouched costs nothing visible. v5 gets the second part right, with no ageing.
4. **(a)/(c) The ✓ detaches the act from its meaning.** "Archived and detached, logged as plain data"
   is the opposite of committed action, where the act matters *because* it serves the value. The toast
   in frame 4 ("sketch a hand → draw better hands") links only to the immediate parent. The value never
   appears at the moment of doing it.
5. **(b) Default card, open log box: toward moves go unmarked.** On the default card the log box is
   plain (by design: nothing attached without a tap). The most likely thing a person does right after
   seeing "sketch a hand" is something *near* it ("sketched a sleeve"), typed in their own words. That
   lands unattached, and the step stays undone. So the toward move is invisible, and the person must
   also ✓ something they didn't exactly do. The Choice Point lives or dies on noticing "that was a
   toward move".

### On a bad day
They're fused with "I never follow through". They open the app and the first thing they meet is a step
they set in a better mood, framed as an empty circle. That's a hook, so they avoid it (experiential
avoidance; the ostrich effect the earlier audit cited), and the app becomes something to avoid. If they
do log something, it's "lay on the couch", which floats as a grey dot near nothing. The picture says
"wasted day" even though rest might itself serve a value.

### Changes
- **Card:** read step-first. Step on top, then "toward draw better hands · make apparel", with the
  why in accent. Keep the glyph count minimal, but use "toward" (or a single ↑) rather than "›" for the
  step-to-parent link. The full meaning goes in the accessible name.
- **"＋ next step":** placeholder that implies willingness and smallness, e.g. "a small step you're
  willing to take". It accepts quality words ("sketch a hand, curiously") as just text.
- **✓:** the toast names the trail down to the why ("sketch a hand · toward draw better hands · make
  apparel", Undo). The card keeps a resting beat (the wellbeing audit's R1) before it offers anything
  new. No praise, because praise is controlling feedback (Henderlong & Lepper 2002).
- **Log box on the default card:** a *dashed, suggested* "→ draw" chip, which DESIGN.md already allows
  ("suggested… never applied silently"). One tap marks a toward move. Ignoring it attaches nothing.
- **Wording:** a step is a behaviour, not a feeling or a result. "feel more creative" → "doodle for one
  page". Adverbs of quality are welcome.

### Would want, refused
- Wants a 0–10 willingness or mood rating with each log; **refused by DESIGN.md** (a number on a person
  is a score, and counts aren't shown).
- Wants a daily Choice Point check-in ("what's hooking you today?"); **refused by DESIGN.md**
  (notifications; nothing opens by itself).
- Wants on-screen defusion prompts ("notice the thought 'I'm behind'"); **refused by DESIGN.md**
  (screens without explanations). That belongs in the ⓘ sheet, at most.
- Wants Harris's committed-action SMART goals, whose T is "time-framed"; **refused by STRATEGY.md**
  (no schedules or targets).
- Wants away moves on the Matrix; refused *by the therapist herself* here. Labelling a log "away"
  invites shame, and unattached logs must stay neutral.

**The dots, in one line:** the most ACT-consistent thing on the screen, toward moves made visible with
no score. But a cluster is a count by another name, and grey floaters must never read as "wasted".

---

## Joint section

### Where they disagree
| Question | ADHD coach | GTD trainer | ACT therapist |
|---|---|---|---|
| Default card on open | **Yes.** Pre-decided beats deciding in the moment (contests the audit's R4) | Recency is the wrong criterion; context and energy are right | Fine if it's the person's own chain; risky for fused clients |
| After ✓ | Park downhill: offer the next step while warm | *Decide* the next action now (Allen) | Resting beat first; a follow-on directive is controlling |
| Step size | As small as "open the sketchbook" | Two-minute things shouldn't be staged at all; just do them | Whatever size you're willing to take |
| One card vs a list | One card (overwhelm), but out of sight means out of mind | The list *is* the system: bring the drawer forward | One card = present-moment contact; whole graph = perspective |
| What the base is | The *near* reason motivates more than the root | The outcome (refused); the why is fine | A quality or direction, not a feeling or result |
| ✓ meaning | Done = a reward signal (but no celebration allowed) | Done is done, and crisp | "Toward", never "finished" for a why |

**The ✓ synthesis that leaves each one only partly unhappy.** After ✓, the card stays on the chain.
The toast carries the trail and Undo. The step line becomes an empty "＋ next step", visible but with no
keyboard and nothing to dismiss: GTD's decision point, offered rather than asked, so it reads as ADHD's
"park downhill" and ACT's resting beat. GTD wants it modal; ACT wants a delay; neither gets that.

### The five changes all three back, ranked
1. **Never put a "toward" in the step slot; ✓ only on what the person wrote as a step.** After ✓, the
   parent rises into the *context* line and the step line shows "＋ next step". Frame 4 changes: the
   toast reads "sketch a hand · toward draw better hands", the card shows "↳ ＋ next step" under
   "toward draw better hands", and nothing glows on an abstract node. (GTD: project ≠ action. ADHD:
   Wall of Awful. ACT: a direction can't be ticked. This also restores the wellbeing audit's R2, which
   v5 regressed.)
2. **Make the card read step-first, with the reason next to it.** The step is the most salient text on
   Home. Line 1 becomes "toward <immediate parent> · <why>" (the why in accent), truncated from the
   **middle** so the why and the immediate parent always survive. Use "toward" or ↑ instead of "›" for
   step → parent, and keep the full path in the accessible name and on tap. This stays two lines and
   adds no explanation.
3. **"Smaller" stacks, never overwrites; the empty field models a startable action.** Writing a
   smaller step pushes the old text down as its toward (D-5's chain), so breaking down never erases the
   bigger intention; clear = set down, with Undo, stays as it is. Add one placeholder in the step field
   (e.g. "the very next thing you'd physically do"): copy only, nothing validated, gone on first
   keystroke. (Safren / Allen / Harris all ask for the same thing in different words.)
4. **A dashed "→ <card's chain>" suggestion in the log box on the default card.** DESIGN.md already
   permits a suggested, never-applied chip. One tap links the log (a toward move, a done action, a
   point-of-performance shortcut); ignoring it attaches nothing, so "nothing attached without a tap"
   holds. It also removes the double entry of logging a near-variant and then ticking. Owner check:
   this softens rev 5's "the log box goes → chain only after a swipe or tap" without breaking it,
   because the chip is a suggestion, not a default.
5. **A stable card and a stable carousel.** The page order follows the graph's order (whys first, as
   Home already does), never recency. The default card follows the last log *toward the chain the card
   was on* or a deliberate selection, and isn't moved by a passing `@other` aside. (Alternative if the
   owner prefers the rule as written: keep "last logged toward" but never reorder the pages.) The two
   things this rests on are ADHD trust in an externalised memory and the GTD trainer's need to find
   things.

Backed by two of three, not ranked: bring the swipe-up "every chain" drawer forward as a pull-only
review, showing each chain's step or "＋" with no counts (GTD strongly, ADHD yes, ACT neutral); and
label the newest dot on the lit chain with the last log in the person's words, restoring "left off"
(ADHD strongly, ACT yes, GTD indifferent).

### Contested against the earlier audit
- **R4 "the spotlight only follows a choice":** the ADHD coach sides with the owner's default. The
  danger isn't the default itself but a default that moves (change 5) or shows something un-startable
  (change 1).
- **"A primary Done ✓ is pressure":** the GTD and ACT practitioners both accept a ✓ on a self-written
  step. The pressure comes from ticking abstractions and from a follow-on directive, not from the tick.
- **R1/R2 of the wellbeing audit** (resting place; don't offer a toward as loggable): all three
  endorse them, and v5's frame 4 breaks both. That's the strongest single finding here.
