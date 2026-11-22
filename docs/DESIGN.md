# Design rules

These came out of the design sessions and several rounds of persona reviews. Change them deliberately.

## Model
- **Activity**: a one-off thing you did. Free text, when it happened, optional note, optional **doing** wander, zero or more **to** wanders.
- **Wander** (`Thread` in code and stored data): an ongoing pursuit named as an action ("practice drawing", "make apparel"). At most one visible **next** step.
- **Links between wanders are never stored.** They are derived from activities (doing → to), counted. Both directions are distinct intentions ("drawing to make apparel" ≠ "making apparel to practise drawing").
- Everything references ids, so renaming a wander never rewrites history.
- A wander can be created with just a name. If nothing flows into it, it simply fades.
- A wander can be marked as **what it's for** (a "why"): a direction, not a goal — no target, progress
  or deadline. A why can be declared (named up front) or earned (most activity flows into it); both
  look the same on Home and both fade to Earlier when nothing flows in. _(Owner decision D-4.)_
  At most **three** are declared at once, all visible: declaring a fourth offers a swap (you pick
  which one steps back, nothing is chosen for you), and hiding a declared wander unmarks it (Undo
  restores both). No counts are shown.
- The **next** belongs to the activity's doing wander, else its first "to".

## Interaction
- **Capture is sacred.** One line, Return logs, as typed. Nothing is required.
  On Home the bottom is one slot with two faces (owner, D-9, 2026-11-22): **What's next ·
  <node>** (its step and ✓, or "＋ add one") and **Log** (the box). It opens on What's next and flips
  back after a log, so logging on Home is one tap on the toggle away; on web, typing switches to Log.
  The card's node is only shown, never attached to a log.
- `@` opens up to 3 wander suggestions (prefix match, then recency). **Tap** (or **Tab** on web) picks. Return never picks or creates a wander; an unmatched `@word` stays plain text.
- A "doing" can be *suggested* from words in the sentence (dashed chip) but is never applied silently.
- The next-step **crumb** hangs under each wander card. Tapping it **loads** the text into the log box with the wander as doing — it doesn't complete anything. If you've already started a line, your words stay and a removable "↳ step" chip says the line counts as that step (D-6). Logging turns it into an activity and clears the next (only if the step hasn't changed since it was loaded).
- After a log with **no wander**, Home asks once, quietly: "Toward something — or just itself?", with up to three recent wanders, "+ name it" and "Just itself". A tap attaches; ignoring it writes nothing, and it's gone on the next log or when you leave Home.
- After logging, the owning wander shows one quiet "+ What's next? (optional)" line. Ignoring it leaves no trace.
- Toast: says what was logged where, one action (Undo), body opens details, ≥ 6 s, pauses while held, doesn't auto-dismiss under a screen reader.
- Recency is neutral: "last touched 2d", an "Earlier" section after 21 days, warmth halves every 14 days, and the shading can be turned off.
- **The graph is Home** (P-34): declared whys head it (then earned ones, then the wanders beside
  them) as circles, each level below one size smaller, declared whys with a second ring. A circle's
  colour is its **heat**: the warmth of the most recent activity on it or anything feeding it, never a
  sum (owner, D-9, 2026-11-22). Doing → to links are tapered branches, and no width comes from a
  count. Once wanders exist there are no dots.
  A staged next step is one quiet line under its node. There's no
  threshold: with no wanders your recent logs show as dots on their own, and while there are no whys
  a gentle "+ What's it all for?" offers to name one ("Not now" hides it for good). Under the picture,
  its summary in one line, then the whys and wanders as buttons (the way through without pointing,
  and the whole layout at large text). The cards are the **Wanders** tab (a plain **YOUR WANDERS**
  list until value headers are earned); the single-centre view is **Explore**.
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
