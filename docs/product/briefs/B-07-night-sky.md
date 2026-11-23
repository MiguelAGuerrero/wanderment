# B-07 — Under the night sky: a prompt at the trailhead, wanders you can pick back up

**Status:** proposed · **Decision:** D-13 · **Theme:** Warm return / Capture anywhere / Know the why · **Date:** 2026-11-23

Mockups: "Front door journey" canvas, https://claude.ai/artifact/GWjaYybmi4QxeBqTpGeHHp (private),
bottom row "Under the night sky" (A–F). Rows above it are earlier, more literal drafts kept for
comparison; where they differ, the night-sky row and this brief win.

## The problem, in the owner's terms
Wanderment's Home has become a graph you have to read before you can act, and it overlaps
Mindstream's focus tool without a clear identity of its own. The owner wants Wanderment to be the
place for "life stones and milestones … large [stretches] of work", with "just energy and mood" and
no imposed structure (owner-notes 2026-11-23, "Mindstream overlap; stacks and a companion prompt"):

- "a call stack … stacking stones … long-term stacks … resuming … switch between stacks"; "context
  switching shouldn't lose any information on how far you progress".
- A companion prompt as the front door, "like a big billboard … just you and the prompt", with
  suggestions "more so an afterthought because I don't want the suggestions to influence … where
  your energy is"; it must "respect the fact that I may not be up to anything".
- Concurrency: "several things … relatively independent of each other", seen from a top-level node.
- Routines that are "a template from which work can be defined and pushed", inferred from what you
  type or declared when a stack is done.
- And above all, one picture: "distill my metaphors into a coherent idea … to fit the imagery of
  wandering"; whys are like Polaris — "you can't ever reach Polaris, but you can reach a landmark";
  "more whimsical and less … sterile".

Evidence is the owner's own reactions across one long session; no other usage signal exists.

## Evidence
- Owner notes: 2026-11-23 entries (Mindstream overlap through the prompt wording), D-12.
- Discovery: `docs/product/discovery/2026-11-23-mindstream-comparison.md` (Mindstream's Focus
  model — frames, contexts, park with "waiting on", resume — is the reference for the stack, minus
  timers and completion).
- The app today: graph-first Home (P-34, B-06 revision 12), one `next` per wander (no stack yet;
  P-19 planned it), unattached logs as loose dots, ＋ to log with suggestions (P-61). P-62 (quick
  actions on nodes) is parked as a patch.

## The picture (one idea)
**You wander under a night sky.** The words on screen stay plain; the picture carries the metaphor.

| In the picture | In the app (code names unchanged) |
|---|---|
| **Stars** you steer by and never reach | whys (declared or earned wanders) |
| **Twinkling motes** around a star, more when it's warm | the star's heat (latest activity on it or anything feeding it; never a sum, never a number) |
| **Landmarks** on the ground you can reach | a wander feeding a why — its name is where the trail is heading |
| **A trail** toward a landmark ("a wander" on screen) | that wander's **step stack**: only the top is live |
| **The next waypoint** | the top step |
| **Footprints** behind you; **stray steps** off-trail | activities; unattached (loose) activities |
| **Camp** | where you left off: a short note and an optional "waiting on…" per wander |
| **Desire paths** / **marked routes** | routines: inferred from past entries / declared (a pebble = one repeatable step, a route = a whole saved stack) |
| **The trailhead** | the front door (the prompt) |
| **Looking up** | "I'm not sure" |
| **The map** | today's graph, a tap away |

## Proposed experience
1. **Trailhead (front door).** Opening the app shows a night sky over dark hills, you as a lantern
   glow at the start of a path, and one large line: **"Where are we wandering today?"** A faint
   "nothing yet is fine" sits at the cursor; an outlined **I'm not sure** (with a small star) below.
   "Map" (the graph) sits in a corner. Nothing else: no stacks, stars or suggestions to steer you.
2. **Typing.** As you type, matches surface quietly: staged steps, past entries and routines
   (desire paths: "↺ Gesture drawing practice · toward Draw better hands · last Tuesday", with
   **Did it** / **On top of a wander**). Nothing attaches without a tap.
3. **Return logs at once**, exactly as typed, loose ("Kept, loose · Undo"). Your words become the
   billboard; below, quietly, "Move it?": on top of the guessed wander, log toward it, or somewhere
   else. Each is one tap with Undo. Leaving without a tap keeps the line as it is.
4. **I'm not sure → look up.** Your whys as stars in fixed places, one size; recency is only
   warmth (amber to silver) and the number of twinkling motes. You stand below with your lantern,
   your last footprints leaning toward where you've walked lately. "Something new" / "Back to typing".
5. **Under a star.** The star at the top with its motes; on the hills, its landmarks with little
   flags (labels clear of the trails); a dotted trail from your camp to each. Each trail shows its
   next waypoint and your note or "waiting on …"; the one walked lately is warm. The star's routines
   sit at the bottom as chips (↺ a pebble, a marked route), plus "＋ Another wander". A why with one
   wander opens straight to step 6.
6. **On the trail.** "Here's where we left off", the next waypoint in large type, your note on a
   small handwritten tag, further waypoints faint toward the landmark, footprints behind you in dated
   words (never counts). **Did it** logs the step and the next waypoint comes up; **Nearer step**
   puts a smaller step on top; **Camp** opens step 7. Setting a step down lives on the step (Undo).
7. **Make camp.** A small campfire; "Saved as it stands"; "Note for next time"; "Waiting on…"; the
   other wanders under the same star; "Look up" / "Back to the prompt". Closing the app also counts
   as making camp — nothing needs saving by hand.
8. **A landmark reached.** When a wander's last step is done: you on the summit, the star still far
   above, "Reached", the footprints in words, and an unticked **Mark this route** (save the whole
   stack to walk again from its star).

- **Empty (first run):** the trailhead and the prompt only. The first Return logs loose; the first
  "On top of…" or "＋ Another wander" names a wander. A star appears when a why is declared or earned
  (D-4 unchanged).
- **A lot of data:** the sky shows declared whys plus earned ones up to a calm limit; under a star,
  landmarks beyond what fits go into a list ("More wanders…"); footprints show the latest few.
- **Offline:** everything is local; nothing changes.
- **Screen reader / large text / Reduce Motion:** the sky is a list of buttons in a fixed order
  ("Become an illustrator, last walked today"); motes, lantern and wanderer are hidden from screen
  readers; under Reduce Motion nothing moves (motes hold a soft glow) and shading-off removes
  warmth and motes; the billboard type steps down at large text and with long lines so the field stays
  above the keyboard; every icon button has a word; focus moves to the new top step after Did it
  and the change is announced.

## Fit with the product
- **DESIGN.md — changes needed (owner approval with this brief):**
  - "The graph is Home" → the **trailhead is Home**; the graph becomes **Map**.
  - The Home "What's next card + ＋" rule (D-11) is replaced by the prompt; capture keeps "one line,
    Return logs as typed, nothing attaches without a tap".
  - Model: a wander's single **next** becomes a **step stack** (only the top is live), plus a camp
    note, a waiting-on, and routines (pebbles and routes). Links stay derived; ids unchanged.
  - Night-sky visuals: heat shown as warmth and motes (relative, never a number), fixed star
    positions, labels clear of trails.
- **STRATEGY.md — tension to decide (the owner edits it):** "No plans for the how: no
  steps-to-goal, milestones or schedules … nothing is planned ahead." This brief adds
  **landmarks** (reachable milestones), a **stack** you can see more than the top of, and **saved
  routes** pushed whole. Proposed reading: a landmark is a wander's name, not a target (no date, no
  progress); the stack is built only by "Nearer step" from the top down (D-5's rule, unchanged); a
  saved route is a remembered way you walked, re-walked only by your tap. If the owner agrees, the
  refusal is reworded to "no schedules, deadlines or progress toward a goal". See D-13 question 2.
- **Still refused:** timers, streaks, counts, % complete, notifications, target dates (B's request),
  progress rings, automatic recaps (D's request).
- **Not doing now:** a separate note-taking or long-form space (that's Mindstream's), a mood or
  energy check-in (owner: capture stays words only), AI matching (owner: on-device only).

## Persona panel
_Simulated perspectives from `docs/product/PERSONAS.md`, run by /product before asking. A thinking
tool, not user research._ Full reports: `.polish/product/panel-B-07-{1,2,3}.md` (local). The panel
ran on the same flow drawn plainly, just before the night-sky picture; the picture changes the
visuals and words, not the steps.

| Persona | Reaction | What it hinges on |
|---|---|---|
| A · Impulsive Dabbler | uneasy → keep: maybe | Return still logging at once (now adopted) |
| B · Intentional Builder | fine, near delighted on the trail screens | a trail of what's been done (footprints, adopted); a clear answer on recurring steps (routines, adopted) |
| C · Pressure-Sensitive Returner | uneasy, leaning fine | soft prompt (adopted), cold whys not shrinking (adopted) |
| D · Reflective Meaning-Seeker | uneasy, leaning fine | whys not ranked by recency (fixed places, one size: adopted) |
| E · Skeptical Minimalist | uneasy, leaning no | a typed line never lost (adopted); fewer new nouns (plain words, picture carries it) |
| F · Assistive-Tech User | fine → delighted if fixed | a non-visual sky (folded into slice 2) |

- **Trade-offs:** gains for people who drift and return, think in words and work why-first (B, C,
  D, F); costs for low-friction minimalists (A, E) — reduced by Return-logs-now and few words.
  Motes give warm stars more presence; C and D warned that cold whys can feel judged (an option: a
  floor of a couple of motes per star).
- **Strong, lean on it:** "Here's where we left off" (all six); the empty front door that never shows
  time away (A, C, E); camp and "waiting on…" as relief (A, B, C).
- **Refinements folded in:** Return logs at once; Loose equal weight; no strikethrough or "Next";
  footprints in words; fixed star places and one size; plain words with labelled icons; a why with
  one wander opens its trail; non-visual sky; type steps down; focus and announcements; export
  carries stacks, notes, waiting-on and routines; closing the app = making camp.
- **Offered as options:** a minimum number of motes per star (C, D); "Map" or "Wanders" opening the
  last trail directly (B).
- **Refused:** target dates, progress rings, step counts (B) — "never goals, % complete"; an
  automatic monthly recap (D) — "never notifications"; Return skipping the guess entirely (E) — it
  already logs at once; a setting to hide "Move it?" stays possible later.
- **Against the owner's notes (P0):** every adopted refinement came from the owner's own answers
  after the panel; nothing here changes what the owner asked for.

## Slices
Visible first. Tiers per `/polish` rigor table.
1. **The trailhead** (M, Light — no stored data). The night-sky front door replaces Home: prompt,
   "nothing yet is fine", "I'm not sure", "Map" (today's graph, unchanged, one tap away). Return logs
   at once, loose, with Undo; your words become the billboard and "Move it?" offers on top of /
   toward the guessed wander (using today's `next` as the top) / somewhere else. Suggestions only
   once you type (P-61's `suggestLogs`). *Done when:* opening shows only the prompt; Return logs as
   typed with Undo; each move is one tap with Undo; leaving keeps the line; Map shows today's graph;
   Reduce Motion stills the sky; large text keeps the field above the keyboard; e2e + axe.
2. **Look up and under a star** (M, Light). "I'm not sure" shows whys as stars (fixed places, one
   size, warmth + motes by heat, non-visual list order); a star shows its wanders as landmarks and
   trails with each one's next step (today's single `next`) and opens a wander's trail screen (top
   step, Did it, footprints from its activities). *Done when:* the sky and star screens render from
   real data; screen reader reads a fixed-order list with "last walked …"; shading-off and Reduce
   Motion honoured; no counts anywhere; e2e + axe.
3. **Step stacks** (M, **Full** — schema). P-19's model: an ordered stack of steps per wander
   (additive migration; `next` stays the top for older versions), "Nearer step" pushes, Did it pops
   into an activity (footprint), set down with Undo, a cleared stack shows "Reached". Export/import
   round-trip. *Done when:* migration + persistence tests (mutation-checked), import/export
   round-trip, e2e of push/pop/undo, verify --full.
4. **Camp** (S, **Full** — schema). A per-wander note and optional "waiting on…", edited on the
   trail and the camp sheet; shown under each trail and on the trail screen; switching or closing
   keeps everything. *Done when:* stored, exported, round-trips; e2e.
5. **Routines** (M, **Full** for declared). Inferred: typing brings up similar past entries as
   desire paths (no storage). Declared: "Mark this route" on a cleared stack saves a route; a step can
   be marked a pebble; both appear as chips under their star and in typing; pushing a route
   re-creates its steps. *Done when:* stored, exported, round-trips; nothing pushed without a tap; e2e.
6. **DESIGN.md and cleanup** (S). Rules updated as above; superseded items closed (below).

**Superseded on go:** B-06's remaining slices (P-51–P-55, P-59, P-63), P-62 (parked patch; its
"quick actions on a node" becomes the star's chips), P-16, P-19 (folded into slice 3), P-20, P-21,
P-43. They move to Cut with a pointer here.

## Data and risk
- Slices 1–2 read existing data only; nothing stored changes. Reverting is a code revert.
- Slice 3: an additive `steps` table (wander id, position, text, created/updated); the existing
  `next` is migrated as each wander's single step and kept in sync as the top, so an older app (or
  an older export) still sees the top step. Import from older backups maps `next` to a one-step stack.
- Slices 4–5: additive columns/tables (camp note, waiting-on, routines). Export version bumps;
  import accepts older versions. Each is Full tier with `verify.sh --full`.
- Risk for current users: Home changes shape. Mitigation: Map is one tap away and unchanged; nothing
  is deleted or moved; the change is announced once in the update banner's ⓘ, not in the UI.
- P-46 (per-log cost with a large history): the sky and star screens are lighter than the graph;
  the perf spec moves to measure Map and the trailhead separately.

## Alternatives considered
- **Do nothing / keep B-06.** The graph-first Home stays; the owner has said it's confusing and
  sterile, and it overlaps Mindstream without an identity.
- **Prompt only, no stacks (slices 1–2).** Ships the front door and the sky; the trail screens show
  today's single next. A good first stop — that's why they're first.
- **Merge into Mindstream** (D-12 option 3): rejected by the owner.

## Decision requested
**D-13:** Go on B-07 — build slice 1 (the trailhead) now, then 2–6 in order, with DESIGN.md updated
as above? **Go** / **Go, but change …** / **Not now** / **No**.
**And:** reword STRATEGY.md's refusal from "no steps-to-goal, milestones or schedules" to "no
schedules, deadlines or progress toward a goal" so landmarks and saved routes fit?
