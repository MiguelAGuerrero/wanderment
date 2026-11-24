# B-11 — User journeys and their renders

Companion to [`B-11-context-stacks.md`](B-11-context-stacks.md). Every journey says what the person is
trying to do and to what end; every state in it has a render. If something the app does is not in a
journey here, the design is incomplete. Renders are named `<journey>-<state>` (e.g. `J04-b`).

**Example person and data used throughout:** Maya. Foundations: *Job hunt* (routine "Apply to ▢
employer" with runs for Initech, Acme, Globex), *Practise drawing* (Warm-up lines · ↻ Hand studies of ▢
subject · Gesture drawing), *Feel at home in Spanish* (empty), and a small reusable routine *Proofread
out loud*.

| # | Journey | To what end | States to render |
|---|---|---|---|
| J01 | **First open** | Start with nothing and be doing something within seconds | a) empty home: only the prompt · b) typed words, "New foundation" offered · c) running an empty foundation: asked for a first small step |
| J02 | **Come back and pick up** | See where everything stands and resume one thing | a) home ("Nothing running"): every foundation, paused runs under theirs, an empty foundation, the prompt · b) reopening straight into a running step |
| J03 | **Say what you're going to do** | Let the app find it instead of browsing | a) typing: closest runs / routines / foundations, then "New foundation" · b) the same with nothing matching |
| J04 | **Run a routine** | Do one small step at a time until you feel done | a) a plain step inside a loop · b) after Next: the next step with Undo · c) arriving at a routine item: Step in or Next past it · d) Done with an inner routine: back in the parent · e) Done at the top: the run ended, home with Undo |
| J05 | **Break it down** | Make a heavy step easy to start, without losing the block | a) the step being split into smaller steps · b) running the first of them, the change marked as this run's own with "Keep in <routine>" |
| J06 | **Shape a routine** | Write down how you go about something, and check it reads right | a) Blocks: steps, the divider with its grip, the loop bracket, a routine inside folded · b) a step's ⋯ menu · c) the divider's other positions (top: all repeats; none: runs once) · d) Read it, collapsed · e) Read it, one routine expanded in place |
| J07 | **Group steps into a routine** | Keep something useful for later | a) choosing steps · b) naming it · c) grouped, with Undo |
| J08 | **Reuse and vary** | Use a routine in a second place; change it knowingly | a) adding an existing routine to another · b) editing a shared routine: Save names where it changes, "Save as a new routine" beside it · c) Copy as a new routine |
| J09 | **Run it for something in particular** | The same routine for different inputs, each its own run | a) Your routines: Start, Start with…, values used before · b) filling the blank · c) inside a parent run: starting another run of the routine with a different value (child runs listed) |
| J10 | **Pause and switch** | Put one thing down and pick up another, on purpose | a) Paused: Resume, siblings to switch to, Up, Stop (list) · b) the same as a map · c) after Up: foundations |
| J11 | **Stop** | Leave the app with nothing running | a) home after Stop (as J02-a, with the run just left marked) |
| J12 | **Find something unnamed** | Get back a one-off or a breakdown by its words | a) "You've done this before": Do it again / Name it, keep it |
| J13 | **Change course in a run** | Leave the routine's way without changing the routine | a) See it all for a run: a loop removed and other steps put in, marked as this run's own · b) Copy as its own run |
| J14 | **Look back, take it with you** | Read what you ended; export everything | a) History by day (read-only) with Export |
| J15 | **When something goes wrong** | Never lose words; always know what to do next | a) couldn't save: the words kept, Try again · b) a name is missing or already used · c) a routine can't go inside itself · d) removing a routine that is used elsewhere or has open runs · e) open in another tab: this one is read-only until taken back · f) Undo no longer available (the next action replaced it) |
| J16 | **Large text and screen readers** | The whole app without the pictures | a) home as a plain nested list at 200 % text · b) running at 200 % text (buttons stacked) |

**Not in the first build, so not rendered:** the opt-in "How did this feel?" and pace note; a step that
waits while the rest of its sequence carries on.

**Coverage check (verbs → journeys):** Start J01–J03, J09 · Next J04 · Step in J04 · Done J04 · Pause
J10 · Stop J11 · Break it down J05 · Group J07 · Copy J08, J13. Blanks J09 · child runs J09, J10 · Map
J02, J10 · Read it J06 · found-by-words J12 · run-only revisions J05, J13 · errors J15 · access J16.
