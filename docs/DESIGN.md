# Design rules

These came out of the design sessions and several rounds of persona reviews. Change them deliberately.

## Model
- **Activity**: a one-off thing you did. Free text, when it happened, optional note, optional **doing** thread, zero or more **to** threads.
- **Thread**: an ongoing pursuit named as an action ("practice drawing", "make apparel"). At most one visible **next** step.
- **Links between threads are never stored.** They are derived from activities (doing → to), counted. Both directions are distinct intentions ("drawing to make apparel" ≠ "making apparel to practise drawing").
- Everything references ids, so renaming a thread never rewrites history.
- A thread can be created with just a name. If nothing flows into it, it simply fades.
- The **next** belongs to the activity's doing thread, else its first "to".

## Interaction
- **Capture is sacred.** One line, Return logs, as typed. Nothing is required.
- `@` opens up to 3 thread suggestions (prefix match, then recency). **Tap** (or **Tab** on web) picks. Return never picks or creates a thread; an unmatched `@word` stays plain text.
- A "doing" can be *suggested* from words in the sentence (dashed chip) but is never applied silently.
- The next-step **crumb** hangs under each thread card. Tapping it **loads** the text into the log box with the thread as doing — it doesn't complete anything. Logging turns it into an activity and clears the next.
- After logging, the owning thread shows one quiet "+ What's next? (optional)" line. Ignoring it leaves no trace.
- Toast: says what was logged where, one action (Undo), body opens details, ≥ 6 s, pauses while held, doesn't auto-dismiss under a screen reader.
- Recency is neutral: "last touched 2d", an "Earlier" section after 21 days, warmth halves every 14 days, and the shading can be turned off.
- Home shows a plain **YOUR THREADS** list until value headers are earned (see roadmap).
- Never: goals, streaks, % complete, timers, notifications.

## Design canvas
The full set of explorations and the final screens (with the reference behind each decision) live in the
"Orbit — Mobile UI draft" design canvas (working name before Wanderment).
