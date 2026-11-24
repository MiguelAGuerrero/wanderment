# Design rules

These came out of the design sessions and several rounds of persona reviews. Change them deliberately.

## Model
- **Activity**: a one-off thing you did. Free text, when it happened, optional note, optional **doing** wander, zero or more **to** wanders.
- **Wander** (`Thread` in code and stored data): an ongoing pursuit named as an action ("practice drawing", "make apparel"). At most one visible **next** step.
- **Links between wanders are never stored.** They are derived from activities (doing → to), counted. Both directions are distinct intentions ("drawing to make apparel" ≠ "making apparel to practise drawing").
- Everything references ids, so renaming a wander never rewrites history.
- A line sent up from the trailhead is **lit** (something you're pursuing now) until **Done it**
  settles it (`settledAt`); with the **done** chip it settles at once. Every other log, and everything
  older, is settled. Lit is never counted or nagged about: its glow fades like warmth, and about a
  month on it looks settled. Heat and Map treat lit and settled alike. _(Owner, D-14; P-73.)_
- A wander can be created with just a name. If nothing flows into it, it simply fades.
- A wander can be marked as **what it's for** (a "why"): a direction, not a goal — no target, progress
  or deadline. A why can be declared (named up front) or earned (most activity flows into it); both
  look the same on Map and both fade to Earlier when nothing flows in. _(Owner decision D-4.)_
  At most **three** are declared at once, all visible: declaring a fourth offers a swap (you pick
  which one steps back, nothing is chosen for you), and hiding a declared wander unmarks it (Undo
  restores both). No counts are shown.
- The **next** belongs to the activity's doing wander, else its first "to".

## Interaction
- **Capture is sacred.** One line, Return logs, as typed. Nothing is required, and nothing attaches
  without a tap.
- **The trailhead is Home** (owner, D-13, 2026-11-23; P-65): a night sky over dark hills, a lantern
  where the path starts, and one large line, **"Where are we wandering today?"**, with the field
  ("nothing yet is fine") under it and an outlined **I'm not sure** below; **Map** sits in a corner.
  Nothing else: no wanders, stars or suggestions before you type. As you type, P-61's suggestions
  (staged steps, then past entries, then wanders) appear under the field; a tap attaches. When the
  words match a wander, a quiet last item **Open <wander>** opens its trail (a why: its star) and
  never attaches or logs. **Return
  logs at once, exactly as typed** (no toast) and the line **rises** (P-73): the camera looks up and
  your words are the heading, lit, with quiet **✦ Done it**, **↳ First step** (a step field; only its
  Return makes the wander, named with your words, and sets its step — never over a staged one) and a
  corner **Toward…** (a visible wander); each has Undo on the line (no timer), then the session ends by
  itself. With the **done** chip on (shown once you type; sticky until turned off or you leave the
  home) each line rises settled. "New line" (or typing) starts the next line; leaving keeps the line as
  it is. No hint lines. "Kept, loose · Move it?" is retired. Reduce Motion
  stills the sky; at large text and in short windows the big line steps down so the field stays above
  the keyboard, and the ground (hills, path, lantern) is drawn only where it fits below the content,
  which scrolls above it — never under a control. **I'm not sure** looks up (P-66).
- **One home** (owner, D-15; P-74): the trailhead, the sky, a star and a trail are one place — the night drawn once, your recent lines as faint unlabelled stars and your whys as guiding stars at rest, Map a signpost by the lantern; a session is one layer over it (`/sky`, `/star/…`, `/trail/…` open it already tilted), left by its Back, Esc or tapping the ground, and it ends by itself after a choice (it waits under assistive tech).
- **Look up** (P-66, `/sky`): only the small question over the night sky, and your whys as **stars** — declared
  (oldest mark first), then earned, at most six — each in a **fixed place** taken from its id (never
  from heat or order), all **one size**. How lately a star was walked shows only as warmth (silver to
  amber) and one to eight **twinkling motes** (at least one; more with heat, never a number); with the shading off
  there's no warmth and no motes; under Reduce Motion the motes hold a soft glow. For a screen reader
  the stars are a list of buttons in that fixed order, "<why>, last walked <when>"; at the largest text
  they're a plain list. Near the ground, your recent **loose lines** (Map's rule: the last three
  weeks, at most three) are stray footprints with their words; one rises again with its choices as it
  is now (lit: Done it, First step, Toward…; settled: Toward… only; Undo takes back a choice only). For a screen reader they're a "Loose" group after the
  stars, "<words>, <when>" (", lit" while it looks lit). With no whys: "No stars yet." and a **Map** link. "Back to typing" (or Esc)
  returns to the prompt.
- **Under a star** (`/star/<id>`): the star and its name; on the hills its **landmarks** (the wanders
  feeding it), each a flag with a dotted trail from camp, names in a row above every flag (never on a
  trail); landmarks are in a **fixed order** (when the wander was made, then name), never by recency.
  Under them one card per landmark: its name, its next step (or a small "＋ Add a next step" line) and
  the note on its latest activity. The one walked most lately is only warm (and its card's name says
  "last walked <when>", as every card's does); beyond three, "More wanders…". A why with one wander
  opens that **trail** directly (with none, its own). Esc goes back here and on the trail.
- **On the trail** (`/trail/<id>`): its star and name, "Here's where we left off", the next step in
  large type (a heading; it steps down at large text like the prompt), the note on a paper tag, **Did it** (logs the step, as Map's ✓, with Undo; focus moves
  on) or "＋ Add a next step", and **footprints**: its latest five activities in dated words (today,
  on Tuesday, last week, in March), never counts.
- **Map** (was Home, unchanged): on the Map (owner, D-11) the **What's next · <node>** card is
  always shown (its step and ✓, or "＋ add one"), with a round **＋** beside it that opens the log
  field (on web, typing opens it). As you type it suggests matching staged steps, then past entries,
  then nodes; a tap attaches (and a step suggestion completes that step); while it's open, tapping a
  node attaches it. Return logs exactly what's typed. The card's node is only shown. Its ‹ (or Esc
  with nothing else to do, or Back) returns to the trailhead.
- **Moving between screens moves through the picture** (owner, 2026-11-24; P-72): looking up sinks
  the hills and fades the stars in; under a star its landmarks rise and the wanderer walks to camp; on
  a trail the wanderer walks up the path; going back reverses it; Map dims in like dusk. Only the
  picture moves (never the controls: each screen is usable at once and nothing shifts), at most ~600 ms,
  and focus goes to the screen's heading (the trailhead: its field). Under Reduce Motion nothing moves.
- **Map is night** (owner, 2026-11-24, "Dark Map"): Map, its sheet and its bottom use the trailhead's night palette (theme `M`); heat reads dim and cool when cold, warm amber when hot, and the shading off still removes it. Other screens are still light.
- `@` opens up to 3 wander suggestions (prefix match, then recency). **Tap** (or **Tab** on web) picks. Return never picks or creates a wander; an unmatched `@word` stays plain text.
- A "doing" can be *suggested* from words in the sentence (dashed chip) but is never applied silently.
- The next-step **crumb** hangs under each wander card. Tapping it **loads** the text into the log box with the wander as doing — it doesn't complete anything. If you've already started a line, your words stay and a removable "↳ step" chip says the line counts as that step (D-6). Logging turns it into an activity and clears the next (only if the step hasn't changed since it was loaded).
- After logging on Map, the owning wander shows one quiet "+ What's next? (optional)" line. Ignoring it leaves no trace.
- Toast (Map and other screens; the trailhead says it on its billboard): "Logged" or "Logged → <node>" (no question; D-11), one action (Undo), body opens details, ≥ 6 s, pauses while held, doesn't auto-dismiss under a screen reader.
- Recency is neutral: "last touched 2d", an "Earlier" section after 21 days, warmth halves every 14 days, and the shading can be turned off.
- **The graph is Map** (P-34; Home until P-65): declared whys head it (then earned ones, then the wanders beside
  them) as circles, each level below one size smaller, declared whys with a second ring. A circle's
  colour is its **heat**: the warmth of the most recent activity on it or anything feeding it, never a
  sum (owner, D-9, 2026-11-22). Doing → to links are tapered branches, and no width comes from a
  count. Once wanders exist there are no dots.
  **Focus and scope** (owner, D-9): tapping a circle focuses it (one ink ring; only its staged step
  is drawn, as a dot beside it, or a dashed ＋) and attaches it to the next log (a visible, removable
  chip, one log). Swiping the What's next card moves focus between chains without attaching; tapping a
  focused parent narrows the picture to it ("‹ All · <node>", Esc or Back go up). Focus persists after
  a log; heat never changes with focus or scope. On open the card shows the wander last logged
  toward, never attached. There's no
  threshold: with no wanders your recent logs show on their own as rows, a dot and its words, newest first (P-57), and while there are no whys
  a gentle "+ What's it all for?" offers to name one ("Not now" hides it for good). The picture's circles are
  buttons (the way through without pointing); its summary is their group's name, not a visible line,
  and only at the largest text does a list replace the picture (D-11). With wanders present, your last
  few unattached logs sit as labelled dots below the graph (tap to attach); there's no "All" label. There is no tab bar (owner, D-10): a handle at the bottom of Map pulls up one sheet with two
  sections, **Wanders** (the cards; a plain **YOUR WANDERS** list until value headers are earned) and
  **Activities**; drag down, Esc or Back puts it away. The single-centre view is **Explore**.
- **Screens show actions and data, not explanations** (owner, 2026-11-22). What something means is
  carried by structure, position and a few marks; explanations live in an ⓘ sheet that never opens by
  itself. Safety warnings stay inline. Accessible names keep the full meaning.
- Never: goals, streaks, % complete, timers, notifications.

## One copy at a time (web, P-29)
- A page holds the data only while it's visible. A page that doesn't hold it (coming back to a tab,
  "Reconnecting…", or waiting for another copy) **can't change it**: changes are refused with one
  quiet "Just a moment — reconnecting.", while the log box keeps working and a Return pressed meanwhile
  logs once the data is back (if the line is unchanged). Typed text is never dropped.
- Known edge cases (accepted):
  - Desktop, two visible windows: reloading (or updating) the window in use while the other is waiting
    hands the data to that window; the reloaded one waits, saying so, until the other is in the
    background or closed.
  - A first launch whose open keeps failing with WebKit's bare "The object is in an invalid state."
    waits, telling the person another copy may be open, and never falls back to local storage: falling
    back over files another copy holds could fork the data. If WebKit uses that text for another reason,
    the advice is wrong until the WebKit lane (P-05) shows it.

## Design canvas
The full set of explorations and the final screens (with the reference behind each decision) live in the
"Orbit — Mobile UI draft" design canvas (working name before Wanderment).
