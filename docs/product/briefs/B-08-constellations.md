# B-08 — Constellations: every line becomes a star

**Status:** building · **Decision:** D-14 → go with changes, 2026-11-24 (→ P-73 to P-77; slices 1–2 with one home shipped 2026-11-24) · **Theme:** Capture anywhere / Seeing flow / Know the why · **Date:** 2026-11-24

Mockups: "Front door journey" canvas, https://claude.ai/artifact/GWjaYybmi4QxeBqTpGeHHp (private),
row "Constellations: every line becomes a star" (G–J). Today's landing for comparison:
`docs/product/evidence/2026-11-24-landing-after-return.png`.

## Owner's changes on go (D-14, 2026-11-24)
> "the double tap could be addressed if we have a separate chip to declare things we already done
> today … Basically the logging feature is done before and the loop is that you just get to log the
> actions and see the stars lit up rather than create a new context stack. I'm using 'wander'
> loosely — [something] you're pursuing in the moment — and you're using the app to [offload] that
> context for you."
- **Two kinds of line.** By default a line is something you're **pursuing** right now: it rises as a
  lit star (the app holds that context). With the **done** chip on, a line is something you **did**:
  it rises, lights and settles at once — no second tap.
- **The done chip** sits by the field (before the kinds), is sticky — on until you turn it off or
  leave the trailhead — so you can catch up on a day: type, Return, type, Return, each one settling.
- **A lit star's glow fades like warmth** (~14-day half-life); a month-old untapped pursuit looks
  settled; its choices stay one tap away.
- **Kinds are fixed:** make, read, write, research, watch, plan, move, people, rest.
- **A quiet "Toward…"** in a corner of the landing attaches the line to any wander (Undo).

## One home (D-15, owner, 2026-11-24)
Discovery: `docs/product/discovery/2026-11-24-one-home.md`. The trailhead and the sky become **one
home**: the night sky at rest — your recent lines as **faint, unlabelled stars** (faint constellation
lines), guiding stars a little brighter, the hills, the lantern, the field at the foot, and **Map as a
labelled signpost** by the lantern. Return, "I'm not sure" or tapping a star **tilts the camera up**
into a **session**: one focused layer over the same sky (your star's words; Done it, ↳ First step,
Toward…; for a pursuit with a trail, its current step with Did it) — the star and trail screens fold
into it. The session **ends by itself after a choice** (or Esc, Back, a swipe down, tapping the
ground; it waits under a screen reader) and the camera comes back down to the lantern, the new star
in its fixed place. `/sky`, `/star/…` and `/trail/…` stay as links that open the home already
tilted. One route, one camera value (P-72's `passage.tsx`), no new dependency.

## The problem, in the owner's terms
After trying the shipped trailhead (owner-notes 2026-11-24, "The landing after Return"):
> The home page was fine, but this new page doesn't … follow my intuition. I expected that to show
> up in the constellations or … in the night sky as a focus prompt, like that's where I'm heading
> towards. And then I can define my substacks sequentially from there. Or I can log that as
> complete.

And the day before ("Constellations"): "logging still should happen independent of a why … stars in
the sky should just be your recent activity … constellations can be derived from that when you see
a picture form. That's a working metaphor, not an explicit concept to be named in the app … there's
still room to have logging for the sake of logging. And then seeing emergence from that."

So today's landing — "✓ Kept, loose · Undo", "Move it? / Somewhere else…" — reads as filing, not as
the night sky; and the sky only shows whys, so lines without a why have nowhere to live.

## Evidence
- Owner notes: 2026-11-24 (landing, transitions), 2026-11-24 (constellations), 2026-11-23 (the
  one picture; stars you never reach; motes by heat).
- Discovery: `2026-11-23-mindstream-comparison.md` (resumable stacks), B-07's panel.
- The app today: P-65/P-66 shipped (trailhead, look up at whys, under a star, trail), Map dark.
  Every log is an *activity* (something done). A wander has one staged `next`. No kinds.

## The picture (extends B-07)
| In the picture | In the app |
|---|---|
| **A lit star** — a line you just sent up, your focus | a new activity, not yet settled (`settledAt` empty) |
| **A settled star** — twinkles once, dims, stays | an activity marked **Done it** (`settledAt` set); all older activities read as settled |
| **A trail toward a star** | **↳ First step** turns the line into a wander (named with your words) whose first step you type; steps follow one at a time (B-07 P-67) |
| **Constellations** — faint lines among stars that go together | derived on the fly from shared words and kinds, never stored, never named unless you tap **Name this?** |
| **Guiding stars** (Polaris) | whys, declared or named from a constellation: brighter, fixed, never reached |
| **Kinds** | an optional tag per line from a small standard set — make, read, research, watch, plan, move, people, rest — offered as quiet chips while typing; freeform is the default |

## Proposed experience
1. **Type** at the trailhead as today. Once you've typed, a quiet row of kinds appears under the
   field; tapping one tags the line (tap again to untag). Suggestions and "Open <wander>" stay.
2. **Return looks up** (P-72 transition): the hills sink, your line rises from the lantern and
   lights as a star with your words beneath it — your focus. Two quiet choices: **Done it** and
   **↳ First step**. "New line" and "Map" stay in the corners. Leaving, or typing a new line, keeps
   it as a lit star; nothing is lost and nothing nags.
3. **Done it**: the star twinkles once and settles dimmer into the sky (Undo for 6 s). It's an
   activity like any other — it counts toward heat and Map as today.
4. **↳ First step**: a trail draws from your lantern toward the star; you type the first step, Return
   sets it as the wander's step (today's `next`; deeper steps arrive with P-67). The line becomes a
   wander named with your words; the star is its star. Undo puts it back as a lit star.
5. **The sky** ("I'm not sure", and after any landing): recent lines as stars — lit ones bright,
   settled ones dim, a just-settled one twinkling — with guiding stars (your whys) brightest. Stars
   that share a kind or words sit near each other and, once there are three or more within a few
   weeks, draw faint lines: a constellation. Tapping one shows its lines' words and a quiet **Name
   this?** — naming makes a wander (or a why, your choice) and attaches those lines, one tap, Undo.
   Tapping a lit star brings back its Done it / ↳ First step.
6. **Older stars** fade out of the sky after about two months (they stay in Map and Activities);
   nothing is ever "overdue": a lit star that's never settled just dims with time like heat.

- **Empty:** the first line rises alone into an empty sky.
- **A lot of data:** the sky shows the last ~60 days, densest kinds grouped; beyond ~80 stars, the
  oldest settled ones thin out first.
- **Screen reader:** the sky is a list — guiding stars, then lit stars, then constellations ("Reading:
  read a novel, research gesture drawing, … Name this"), then settled stars newest first; Done it and
  First step are buttons; announcements after each choice. Reduce Motion: no rise, no twinkle (the
  star simply appears, settled stars simply dim).

## Fit with the product
- **DESIGN.md changes (with go):** "Capture is sacred: Return logs, as typed" stays — Return still
  saves the line at once; what changes is what you see. A new activity can be **lit** (not yet
  settled) — heat and Map treat it as an activity as today (so nothing about history changes);
  "Done it" only settles it. Kinds: optional, never required, never inferred silently (a kind is only
  set by your tap). Constellations: derived, never stored, never named without a tap. "Kept, loose ·
  Move it?" is retired (its moves live on as "Name this?" and attaching from Map).
- **STRATEGY.md:** advances "direction emerges … without you having to declare anything up front"
  and "Know the why; leave the how open". No tension: no goals, counts or schedules; a lit star is
  never overdue.
- **Still refused:** counts of stars, streaks, "you haven't settled this", reminders, AI clustering
  (on-device word and kind matching only).
- **Not now:** user-defined kinds (the owner's open question — offered as an option), editing a
  constellation by hand.

## Persona panel
_Simulated perspectives from `docs/product/PERSONAS.md`, run by /product before asking. A thinking
tool, not user research._ Full reports: `.polish/product/panel-B-08-{1,2,3}.md` (local).

| Persona | Reaction | What it hinges on |
|---|---|---|
| A · Impulsive Dabbler | delighted day one, uneasy by week two · keep: maybe, leaning yes | lit stars must stop looking lit on their own — A never taps a second time |
| B · Intentional Builder | fine, edging uneasy · keep: maybe | a way to attach to an existing wander from the landing; stars gathering under the why they feed |
| C · Pressure-Sensitive Returner | uneasy · keep: maybe | lit stars not becoming a visible backlog (fade, no accent colour); the sky not emptying after time away |
| D · Reflective Meaning-Seeker | delighted, one ache · keep: yes, more than before | "Name this?" from their own words; constellations that don't join "read tax forms" with "read Rilke" |
| E · Skeptical Minimalist | fine, trending uneasy · keep: maybe, leaning yes | the rise never blocks typing; ignoring "Done it" costs nothing |
| F · Assistive-Tech User | fine, uneasy until pinned down · keep: yes if built as below | chips as one switch-scan stop; defined focus; Undo that waits for assistive tech |

- **Trade-offs:** favours people who find their why in what they do and log intentions as well as
  deeds (the owner, D, B at capture); costs people who log mostly finished things and never tap
  twice (A, C, E) — all through one place: how long a lit star *looks* lit.
- **Strong, lean on it:** the rise beats today's landing for all six; "Name this?" over your own
  words (D-4's "deduce the why" made visible); nothing named, counted or inferred without a tap;
  the empty trailhead; the sky as a fixed-order list (F).
- **Refinements folded in (fit DESIGN.md):**
  - Lit stars are drawn in the night ink, never the accent colour (accent stays for guiding stars).
  - No wander is created until Return on the First-step screen; leaving it keeps the lit star.
  - The rise never blocks typing: the field stays live; typing starts a new line.
  - Chips appear only after you've typed, keep their space (no layout jump), never take focus or
    catch Return, sit in one container after the suggestions and "I'm not sure" (one switch stop),
    say "selected" when tagged; the row is announced once.
  - No hint lines ("Return lifts it…", "Return sets it…") — DESIGN.md's no-explanations rule.
  - Constellation lines need shared words (stems), or a shared kind within a few days; a kind alone
    only pulls stars near each other. The tapped constellation shows its lines with dates in words
    and highlights the shared word or kind. Screen readers hear "Lines that go together: …", no count.
  - After Return, focus lands on the star's words (a heading); after Done it, "Settled" is announced
    and focus moves to Undo; Undo follows the toast rule (never auto-dismissed under assistive tech).
  - The screen-reader list has headings for its groups; lit and settled stars share one group, newest
    first, with the state in each name. Hit areas ≥ 44 pt. "↳" is hidden from speech.
  - "Done it" keeps its words; its ✓ becomes ✦ (a moment, not a ticked task).
  - The sky keeps a floor: the last ~60 days or the last ~12 lines, whichever is more; a named
    theme keeps its lines reachable from its star after they leave the sky.
  - Con3's example step is not a quota.
- **Offered as options (owner's call, D-14):** how long a lit star *looks* lit; a quiet corner
  "Toward…" on the landing (attach to any wander, Undo); kinds fixed vs add-to; add "write" (and
  "reflect") to the standard set.
- **Refused:** counts of lit/done stars, "you haven't settled this", a progress sense (B) — "never
  goals, % complete"; a "this keeps coming up" nudge (D) — nothing surfaces by itself; a setting to
  hide chips (E) — no new setting unless the owner asks.
- **Against the owner's notes (P0):** the owner asked for a lit focus star that you settle or break
  into steps; every refinement keeps that. The one real question is how long "lit" looks lit when
  you never tap — the owner's "if you leave, it stays a star" holds either way.

## Slices
1. **The rise** (M, **Full** — one additive optional field `settledAt` on activities; older ones read
   as settled). Return → your line rises and lights as a star with Done it / ↳ First step; Done it
   settles it (twinkle, dim, Undo); ↳ First step makes a wander named with your words and sets its
   first step (today's `next`), Undo; leaving keeps it lit. Replaces "Kept, loose · Move it?".
   Export/import round-trip. *Done when:* the above, e2e + axe, migration + persistence tests.
2. **The sky of lines** (M, Light). "I'm not sure" shows recent lines as stars (lit, settled,
   just-settled) with guiding stars; tapping a lit star brings back its choices; screen-reader list;
   Reduce Motion. Replaces the whys-only sky (a why's "under a star" and trail stay).
3. **Kinds** (S, **Full** — optional `kind` on activities). Quiet chips once you type; tap to tag;
   shown nowhere as counts; exported.
4. **Constellations** (M, Light, derived). Grouping by kind and shared words; faint lines once ≥ 3
   within a few weeks; tap → the words and **Name this?** (wander or why), one tap with Undo.
5. **DESIGN.md** updated; B-07 P-67 (step stacks) continues from ↳ First step.

## Data and risk
- `settledAt` (slice 1) and `kind` (slice 3): additive, optional; old data reads as settled and
  kind-less; export version bumps; older exports import unchanged. Full tier, `verify.sh --full`.
- ↳ First step creates a wander (a tap) and turns the activity's line into its name: the activity is
  kept, attached as "doing" that wander, so history isn't lost; Undo removes the new wander.
- Risk: the sky gets busy with many lines — mitigated by the 60-day window, dimming and thinning.
- Risk: a lit star could feel like an open task — it never says so, never counts, and dims with time.

## Alternatives considered
- **Keep "Kept, loose · Move it?"** — the owner tried it and it misses their intuition.
- **Ask first (heading or done?)** — rejected by the owner (an extra tap every time).
- **Guess from the words** — rejected by the owner.

## Decision requested
**D-14:** Go on B-08 — build slice 1 (the rise) next, then 2–5, with DESIGN.md updated as above?
**Go** / **Go, but change …** / **Not now** / **No**. And: kinds as a **fixed** standard set, or a
standard set **you can add to**?
