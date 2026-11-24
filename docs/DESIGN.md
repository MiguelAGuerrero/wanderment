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
  month on it looks settled. Heat and the map treat lit and settled alike. _(Owner, D-14; P-73.)_
- A wander can be created with just a name. If nothing flows into it, it simply fades.
- A wander can be marked as **what it's for** (a "why"): a direction, not a goal — no target, progress
  or deadline. A why can be declared (named up front) or earned (most activity flows into it); both
  look the same on the lit map and both fade to Earlier when nothing flows in. _(Owner decision D-4.)_
  At most **three** are declared at once, all visible: declaring a fourth offers a swap (you pick
  which one steps back, nothing is chosen for you), and hiding a declared wander unmarks it (Undo
  restores both). No counts are shown.
- The **next** belongs to the activity's doing wander, else its first "to".

## Interaction
- **Capture is sacred.** One line, Return logs, as typed. Nothing is required, and nothing attaches
  without a tap.
- **The home** (owner, D-13, D-15, D-16; B-07/B-08/B-09; P-65, P-74, P-79–P-84): one place, a night
  sky over dark hills with a lantern where the path starts. Above is the **live map**; at the bottom,
  in thumb reach like messaging (never chat-bubble styled), the **composer**: a **grabber**, the question
  **"Where are we wandering today?"** as a small heading (it collapses with the keyboard up, in a short
  window or at large text; the field keeps it as its name), **I'm not sure** as a chip right above the
  field, the done chip once you've typed, and the field ("nothing yet is fine", one border, lantern
  while focused) with its send ↑ (disabled while empty; an empty Return logs nothing). As you type,
  P-61's suggestions (staged steps, then past entries, then wanders) open **above** the field — the
  composer grows, the map yields, the field and its chips never move; a tap attaches. When the words
  match a wander, a quiet last item **Open <wander>** opens its trail (a why: its star) and never
  attaches or logs. "Reconnecting…" is a line of the field's own box, never over a control. The ground
  (hills, path, lantern) stands on the composer only where it fits below the map, and glides (never
  jumps) to the foot when a session starts. Reduce Motion stills the sky.
- **Capture on the home:** **Return logs at once, exactly as typed** (no toast) and the line **rises**
  (P-73): the camera looks up and your words are the heading, lit, with quiet **✦ Done it**, **↳ First
  step** (a step field; only its Return makes the wander, named with your words, and sets its step —
  never over a staged one) and a corner **Toward…** (a visible wander; never offered for a line that
  already went somewhere — it says where instead); each has Undo on the line (no timer), then the
  session ends by itself. With the **done** chip on (shown once you type; sticky until turned off or
  you leave the home) each line rises settled. "New line" (or typing) starts the next line; leaving
  keeps the line as it is. No hint lines.
- **The live map at rest** (P-80, D-16): what's been done, nothing highlighted, no counts — a **random
  few** (at most five) of the last three weeks' lines, **drawn once a day**, each a small light with its
  words and when in words, in a **fixed place from its id**; never redrawn while on screen. Age is in
  words and the light's glow (warmth), never in faded text. Lit and settled lines look alike. Beyond
  three weeks, a calm sky with no copy. Your whys are guiding stars high up (decorative). A tap on a
  line opens it again (its words, its note, its choices as it is now). For a screen reader the lines are
  a "Recent" group after the composer; at the largest text, or with too little room, a plain list.
- **I'm not sure lights the map** (P-81; `/sky` is the lit state): a toggle (pressed state, a filled
  star on a filled chip, named "I'm not sure — light up the map"). Lit, your whys (stars) and the
  wanders feeding them — complete, never a sample — and the wanders the shown lines went toward appear
  as **named nodes**, all one size, in a fixed order (whys first; never by heat), in a band **kept for
  them at rest**, so the feed's lines **never move or change**; warmth shows only as each node's glow
  (none with the shading off); links (3:1 or more) go from each shown line to the nodes it went toward,
  and its name says so. "Map lit" is said, with no count. A node opens its session (a why its star, or
  with one wander its trail; a wander its trail, with What's next). It stays lit until the chip again,
  Esc or Back; a session left comes back to it lit.
- **Attaching lands where you're looking** (P-82): after Toward…, First step or a suggestion picked
  before Return, the line travels into its node on the home (≤ 600 ms, picture only, never taking a tap;
  under Reduce Motion it just appears there) as "<words> → <wander>", the node warm, and stays until the
  next action (typing, a log, Undo, the sheet, opening a line); the toast says it in words, above the
  composer and the keyboard.
- **The sheet** (P-58, P-83; owner D-10): the grabber (a 44 pt button with an expanded state) pulls it
  up by a tap or by a swipe that **starts on it** (never one over the field); one sheet in the night
  palette with **Wanders** (the cards; a plain **YOUR WANDERS** list until value headers are earned)
  and **Activities**, each with its own log box (with the toast); a visible **Close**; rows for
  **Explore** (the single-centre view), **Search**, **Settings** and **Export**. Close, the scrim, a drag
  down on its top, Esc or Back put it away. The sheet and the lit state live in the history, so Back
  closes the sheet first, then dims the map; `/wanders` and `/activities` open the home with it out.
- **The sheet's search lights the stars above** (P-84, owner): while it has words the sheet sits low,
  leaving the sky in view; every matching line is a star there with its words and when (placed from its
  id; a star that stays as the query changes never moves; with no row free, a star without words); the
  other lines dim to their lights and the nodes the matches went toward light. The results list in the
  sheet is what a screen reader reads; what was found is said in words, never a number. Back or Esc in
  the field clears it before the sheet goes; clearing it or closing the sheet returns the sky to rest.
  Reduce Motion: nothing moves, the stars just appear.
- **Map is retired** (P-83, D-16): the live map is the home. `/map` lands on the home lit (replacing the
  entry). Map's graph, its What's next card and its focus/scope chains are gone; their depth went into
  the lit map (whys, wanders, What's next on a trail) and the sheet.
- **Sessions** (`/star/…`, `/trail/…`, and the rise `/line/…`) are one layer over the same night,
  opened already tilted by a link; left by their Back, Esc or tapping the ground (back to the home as it
  was, lit or not); a session ends by itself after a choice (it waits under assistive tech).
- **Under a star** (`/star/<id>`): the star and its name; on the hills its **landmarks** (the wanders
  feeding it), each a flag with a dotted trail from camp, names in a row above every flag (never on a
  trail); landmarks are in a **fixed order** (when the wander was made, then name), never by recency.
  Under them one card per landmark: its name, its next step (or a small "＋ Add a next step" line) and
  the note on its latest activity. The one walked most lately is only warm (and its card's name says
  "last walked <when>", as every card's does); beyond three, "More wanders…". A why with one wander
  opens that **trail** directly (with none, its own). Esc goes back here and on the trail.
- **On the trail** (`/trail/<id>`): its star and name, "Here's where we left off", the next step in
  large type (a heading; it steps down at large text like the prompt), the note on a paper tag, **Did it** (logs the step, with Undo; focus moves
  on) or "＋ Add a next step", and **footprints**: its latest five activities in dated words (today,
  on Tuesday, last week, in March), never counts.
- **Moving between screens moves through the picture** (owner, 2026-11-24; P-72): looking up sinks
  the hills and fades the stars in; under a star its landmarks rise and the wanderer walks to camp; on
  a trail the wanderer walks up the path; going back reverses it (lighting the map is in place:
  no passage). Only the
  picture moves (never the controls: each screen is usable at once and nothing shifts), at most ~600 ms,
  and focus goes to the screen's heading (the home: its field). Under Reduce Motion nothing moves.
- **The night palette** (owner, 2026-11-24, "Dark Map"): the home, its sheet and its sessions use the night palette (theme `N`/`M`). Other screens (a wander's page, Settings, Search, Explore) are still light.
- `@` opens up to 3 wander suggestions (prefix match, then recency). **Tap** (or **Tab** on web) picks. Return never picks or creates a wander; an unmatched `@word` stays plain text.
- A "doing" can be *suggested* from words in the sentence (dashed chip) but is never applied silently.
- The next-step **crumb** hangs under each wander card. Tapping it **loads** the text into the log box with the wander as doing — it doesn't complete anything. If you've already started a line, your words stay and a removable "↳ step" chip says the line counts as that step (D-6). Logging turns it into an activity and clears the next (only if the step hasn't changed since it was loaded).
- After logging in the sheet, the owning wander shows one quiet "+ What's next? (optional)" line. Ignoring it leaves no trace.
- Toast (the sheet and other screens; the home's Return rises instead, and a choice made there goes on in the home's toast): "Logged" or "Logged → <node>" (no question; D-11), one action (Undo), body opens details, ≥ 6 s, pauses while held, doesn't auto-dismiss under a screen reader.
- Recency is neutral: "last touched 2d", an "Earlier" section after 21 days, warmth halves every 14 days, and the shading can be turned off.
- **Heat** is the warmth of the most recent activity on a wander or anything feeding it, never a sum
  (owner, D-9, 2026-11-22); it shows as glow on the lit map's nodes and as warmth under a star, and
  never orders or sizes anything. Links are never widened by a count. (P-34's graph Map, its focus and
  scope, retired with Map, P-83; **Explore** keeps the single-centre graph.)
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
