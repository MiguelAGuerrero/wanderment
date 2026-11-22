# Design rules

These came out of the design sessions and several rounds of persona reviews. Change them deliberately.

## Model
- **Activity**: a one-off thing you did. Free text, when it happened, optional note, optional **doing** thread, zero or more **to** threads.
- **Thread**: an ongoing pursuit named as an action ("practice drawing", "make apparel"). At most one visible **next** step.
- **Links between threads are never stored.** They are derived from activities (doing → to), counted. Both directions are distinct intentions ("drawing to make apparel" ≠ "making apparel to practise drawing").
- Everything references ids, so renaming a thread never rewrites history.
- A thread can be created with just a name. If nothing flows into it, it simply fades.
- A thread can be marked as **what it's for** (a "why"): a direction, not a goal — no target, progress
  or deadline. A why can be declared (named up front) or earned (most activity flows into it); both
  look the same on Home and both fade to Earlier when nothing flows in. _(Owner decision D-4.)_
  At most **three** are declared at once, all visible: declaring a fourth offers a swap (you pick
  which one steps back, nothing is chosen for you), and hiding a declared thread unmarks it (Undo
  restores both). No counts are shown.
- The **next** belongs to the activity's doing thread, else its first "to".

## Interaction
- **Capture is sacred.** One line, Return logs, as typed. Nothing is required.
- `@` opens up to 3 thread suggestions (prefix match, then recency). **Tap** (or **Tab** on web) picks. Return never picks or creates a thread; an unmatched `@word` stays plain text.
- A "doing" can be *suggested* from words in the sentence (dashed chip) but is never applied silently.
- The next-step **crumb** hangs under each thread card. Tapping it **loads** the text into the log box with the thread as doing — it doesn't complete anything. If you've already started a line, your words stay and a removable "↳ step" chip says the line counts as that step (D-6). Logging turns it into an activity and clears the next (only if the step hasn't changed since it was loaded).
- After a log with **no thread**, Home asks once, quietly: "Toward something — or just itself?", with up to three recent threads, "+ name it" and "Just itself". A tap attaches; ignoring it writes nothing, and it's gone on the next log or when you leave Home.
- After logging, the owning thread shows one quiet "+ What's next? (optional)" line. Ignoring it leaves no trace.
- Toast: says what was logged where, one action (Undo), body opens details, ≥ 6 s, pauses while held, doesn't auto-dismiss under a screen reader.
- Recency is neutral: "last touched 2d", an "Earlier" section after 21 days, warmth halves every 14 days, and the shading can be turned off.
- Home opens with a compact live graph of what it's for and what feeds it; below it, a plain
  **YOUR THREADS** list until value headers are earned or declared.
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
