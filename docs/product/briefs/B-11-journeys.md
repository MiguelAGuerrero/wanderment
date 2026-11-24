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
| J04 | **Run a routine** | Do one small step at a time until you feel done | a) a plain step on the runner: context line with Done, the note, Pause · Break it down · Next · b) after Next: the next step with Undo · c) a routine as the step: the middle button reads Step in · d) Done on the context line: out of this level, the parent's next step with Undo · e) Done at the top: the run ended, home with Undo · f) the last step of a round, with its corner mark · g) a counted loop finishing by itself: the parent's next step with "Finished <name> · Undo" · h) the pull-up panel over a step in a loop (round, then, actions) · i) a long step: the note full, Break it down marked |
| J05 | **Break it down** | Make a heavy step easy to start, without losing the block | a) the step being split into smaller steps · b) running the first of them, the change marked as this run's own with "Keep in <routine>" |
| J06 | **Shape a routine** | Write down how you go about something, and check it reads right | a) Blocks: steps, the divider with its grip, the loop bracket, a routine inside folded · b) a step's ⋯ menu · c) the divider's other positions (top: all repeats; none: runs once) · d) Read it, collapsed · e) Read it, one routine expanded in place · f) Blocks with a counted repeat ("3 times") · g) Read it: "repeat 3 times" |
| J07 | **Group steps into a routine** | Keep something useful for later | a) choosing steps · b) naming it · c) grouped, with Undo |
| J08 | **Reuse and vary** | Use a routine in a second place; change it knowingly | a) adding an existing routine to another · b) editing a shared routine: Save names where it changes, "Save as a new routine" beside it · c) Copy as a new routine |
| J09 | **Run it for something in particular** | The same routine for different inputs, each its own run | a) Your routines: Start, Start with…, values used before · b) filling the blank · c) inside a parent run: starting another run of the routine with a different value (child runs listed) |
| J10 | **Pause and switch** | Put one thing down and pick up another, on purpose | a) Paused: Resume, a reason field, siblings to switch to, Up, Stop (list) · b) the same as a map · c) after Up: everything you have going |
| J11 | **Stop** | Leave the app with nothing running | a) home after Stop (as J02-a, with the run just left marked) |
| J12 | **Find something unnamed** | Get back a one-off or a breakdown by its words | a) "You've done this before": Do it again / Name it, keep it |
| J13 | **Change course in a run** | Leave the routine's way without changing the routine | a) See it all for a run: a loop removed and other steps put in, marked as this run's own · b) Copy as its own run |
| J14 | **Look back, take it with you** | Read what you ended; export everything | a) History by day (read-only) with Export |
| J15 | **When something goes wrong** | Never lose words; always know what to do next | a) couldn't save: the words kept, Try again · b) a name is missing or already used · c) a routine can't go inside itself · d) removing a routine that is used elsewhere or has open runs · e) open in another tab: this one is read-only until taken back · f) Undo no longer available (the next action replaced it) |
| J16 | **Large text and screen readers** | The whole app without the pictures | a) home as a plain nested list at 200 % text · b) running at 200 % text (buttons stacked) |

## Essentials added by the capabilities audit
From `.polish/product/audit-B-11-capabilities.md`: the basics a person expects by default. **First
build** unless marked *(design now, build later)*.

| # | Journey | To what end | States to render |
|---|---|---|---|
| J17 | **Get around** | Reach every screen from home and get back | a) home with a visible way to Your routines, History and Settings · b) the same reach from Paused · c) opening a foundation's routine to edit it from home |
| J18 | **Fix the words** | Correct or reword anything you wrote | a) editing a step's words in Blocks · b) renaming a routine or foundation, saying where the name changes · c) rewording the current step while running (this run only, with "Keep in …") · d) correcting a run's blank value |
| J19 | **Tend your foundations** | Keep home to what matters now | a) a foundation's ⋯: rename, move up / down, remove · b) removing one with paused runs under it · c) home after removal, with Undo |
| J20 | **A routine as a whole** | Manage a routine, not just its steps | a) the routine's own menu: Rename, Copy as a new routine, Copy as text, Remove · b) New routine from scratch · c) Your routines, empty · d) the editor of a routine used in several places: where it is used, "Edit a copy instead" |
| J21 | **End or discard a run** | Finish with something, from anywhere it shows | a) the "This run" menu reached from See it all, Paused and home · b) ending a run that has open child runs · c) home after it, with Undo · d) starting a routine that already has a paused run: Resume / Start another |
| J22 | **Settings and your data** | Know where your data is; take it out, bring it back, wipe it | a) Settings: where the data lives, Export, Import, Erase, version · b) import preview: what the backup holds, Replace / Cancel · c) Erase everything: confirm, export first · d) exported · e) imported |
| J23 | **The app's own states** | Understand what the app is doing when it isn't ready | a) Opening… · b) can't open the data: Reload, download the local copy · c) another tab took over / reconnecting, with a pressed Next kept · d) a new version is ready · e) saved by a newer version |
| J24 | **Coming from the old app** | Lose nothing, know where it went | a) first open after the update with existing data · b) History showing earlier logged lines with their notes |
| J25 | **A lot of it** | It still works when full | a) home with 20 foundations and 10 runs under one · b) a three-line step and a long "Done with …" on Running · c) a 30-step routine in Blocks with the keyboard up · d) a too-long step being typed: it outgrows the note, Break it down offered |
| J15+ | **More that can go wrong** | — | g) a step removed, with Undo · h) an empty step or name · i) starting something while a run is running · j) the way into (i) |
| J26 | **Forget things** *(design now)* | Privacy and tidiness | a) remove one History entry / clear History · b) forget a value used in a blank · c) forget an unnamed sequence · d) reopen an ended run from History · e) Clear all, confirmed |
| J28 | **Paste a list** *(design now)* | Bring steps in from elsewhere | a) pasted lines becoming several steps, with Undo |
| J29 | **Move within a run** *(see J39 Jump to…)* | Go where you actually are | a) See it all: "Jump here" on a step · b) Back to <step> from the panel · c) dropping a this-run-only change |
| J30 | **More with steps and blanks** *(design now)* | — | a) duplicate a step · c) send a step to another routine · b) placing, rewording and removing a blank; two blanks in one routine |
| J31 | **Where only a button is drawn** *(design now)* | — | a) Walk through · b) Focus on one routine · c) Copy as text and its confirmation · d) after "Name it, keep it" |
| J32 | **Opt-ins** *(design now)* | — | a) Settings: "How did this feel?" and the pace note switched on |
| J33 | **Find old things** *(design now)* | — | a) searching History (lines and notes) |
| J16+ | **Large text, focus** *(design now)* | — | c) a ⋯ menu and a dialog at 200 % · d) visible focus, and where it lands after Undo, a dialog, a removal |

**J27 Keyboard and Back** is a table, not a render — it includes the panel, Done and Jump to…: Return, Esc, Tab order and a
key for Next on every screen; browser Back; each screen's address; what each retired route does.

## Journeys for the additions since the converged set
From `.polish/product/audit-B-11-expectations.md`. "First build" / "design now" follows the design's
slices. Where a state below mentions a "then leave" setting or "one more round", the design has since
decided against it (see the design, 3.1): draw what the design says.

| # | Journey | To what end | States to render |
|---|---|---|---|
| J34 | **Wait for something** — first build | Put a run down knowing everything before is done, and find it reading as waiting, not abandoned | a) the runner on a wait step: the outlined note with the wait mark, and what the three buttons read · b) the panel there: what it is waiting for, a way to stop waiting · c) leaving it: the paused screen for a run resting on a wait, as it is titled · d) home with three runs side by side: one "at <step>", one with a reason, one "waiting for <words>" · e) back again: saying it has happened, the next step with Undo · f) a wait that is the last step of a round (the mark and the wait together) · g) a wait with a blank in its words, filled, on home · h) the same wait at 200 % text |
| J35 | **Pause with a reason** — first build | Say why you stopped, so the row means something later | a) Paused with the reason field empty · b) with a reason typed (keyboard up) · c) home showing it under the run · d) editing and clearing it · e) just after Resume: where the reason is now · f) a three-line reason on Paused and on home |
| J36 | **Write a wait into a routine** — first build | Mark the point where the outside world answers | a) the add row with "Add a wait" · b) a wait block in Blocks among steps · c) its ⋯: change the words, move, make it a plain step, remove · d) a plain step's ⋯: "Make this a wait" · e) Read it: "Then wait for: …" · f) See it all in a run: a wait added for this run only, with "Keep in <routine>" |
| J37 | **More with counted repeats** — first build | Stop, go on or change the number as the run goes | a) See it all: the number changed for this run only, with Keep · b) the number set below the round you are on · c) just after "Finished <name>": doing one more round · d) the panel on the last step of the last round ("Round 3 of 3", "Last step of the round", "then: <the parent's next step>") · e) a one-step loop: the mark on every step |
| J38 | **The panel, whole** — first build | Everything about this moment, one pull away, and nothing more | a) the fullest it gets: round, last step, then, this run only, things out, child runs, every action · b) on a full note that scrolls: where a swipe scrolls and where it opens · c) opened by keyboard, with focus and what is read first · d) the same at 200 % text |
| J39 | **Jump to…** — first build (levels and steps); *(design now)* for the list of what is out | Set the run to where you really are | a) the way in from See it all and from Paused · b) the levels you are in, each with "start again", the place you are marked "here" · c) picking a particular step · d) a step inside a routine you are not in · e) what is out, each with "It's happened" / "Let it go" · f) after: the runner at the new place, "Jumped from <step> · Undo" · g) jumping inside a counted loop: the round line before and after · h) a thirty-step routine in the picker; the picker at 200 % |
| J40 | **React to what came back** *(design now)* | Have the next move already written when the answer arrives | a) Blocks: a wait block with its reactions folded, and unfolded · b) adding a reaction: its words, then steps or a routine; how it looks while it holds nothing · c) a reaction's ⋯: rename, move, remove · d) the runner, having said it has happened: the reactions offered, and "Something else" · e) inside a reaction: the context line, and Done · f) after the reaction's last step: where you are, with Undo · g) Read it with reactions · h) a reaction emptied because its routine was removed · i) Walk through at a wait |
| J41 | **Set something going and carry on** *(design now)* | Write down that a thing is under way while you do the next steps | a) a step's ⋯: "Wait for this later…" · b) the rail from that step to its wait, the steps beside it · c) one wait closing two rails · d) two rails in two lanes closing at different points · e) Read it: "While you wait… Then wait for…" · f) untying; tying a second step to a wait · g) a move that would break a rail (above its start; across the divider) and what is said · h) removing either end, with Undo · i) asking for a fourth · j) Group taking one end · k) a step that sets something going with no wait in this routine |
| J42 | **Run with things out** *(design now)* | Carry on, and know what is still coming | a) Next on the step that sets it going: what, if anything, the runner says · b) the panel naming what is out, each with "It's happened" / "Let it go" · c) reaching a wait that closes two, one already in · d) reaching a wait whose things have all happened · e) home: the run's row with "out: …" · f) Paused with things out · g) going back a step past the one that set it going |
| J43 | **A routine that leaves something out** *(design now)* | Use a routine that starts something, and wait for it where the result is needed | a) the routine's block in a parent, with its open end · b) the parent's wait closing it · c) the parent leaving it open: its own block, one level up · d) running: back in the parent after the inner routine finishes, the panel listing what it left · e) the inner routine's editor: "Used in …" saying where its open end shows · f) an inner routine with two open ends |
| J44 | **Leave with something out** *(design now)* | Decide, once, what happens to what you started | a) Done on the context line with something out: Let it go / Keep it out, the thing named · b) with several out · c) kept: the panel one level up · d) the run ended with something kept: home, and where the item sits · e) on home, saying it has happened, or letting it go · f) Done at the top with child runs open and things out: one sheet · g) a counted loop ending by itself with something out |
| J45 | **The new parts, without the pictures** *(design now)* | Rails, lanes and reactions at large text and by ear | a) Blocks with two rails at 200 % text · b) the same routine as a screen reader reads it (each end naming the other) · c) the reactions sheet at 200 % · d) focus after tying, untying, a pick of a reaction, a Jump |
| J46 | **The new parts and your data** *(design now; the stored fields are first build)* | Nothing new is lost on the way out or back | a) the import preview naming waits, reactions, things out and reasons in a backup · b) an older backup imported: nothing missing, nothing invented · c) searching by a wait's words, a reason, something out · d) Copy as text of a routine with a rail and reactions |

**Additions to existing journeys** (states, not new journeys): J04 — a) with the last-step mark · J15 — k) a move untied a rail · l) removing a routine empties a reaction · J16 — e) home as a plain list with waiting, reason and out · J19 — d) removing a first layer that has kept items · J25 — e) five things out on one home row · f) three lanes beside thirty steps, keyboard up · J27 — rows for the panel, Done, Jump to, and Esc with the panel open.

**Not in the first build, so not rendered:** the opt-in "How did this feel?" and pace note; a step that
waits while the rest of its sequence carries on.

**Coverage check (verbs → journeys):** Start J01–J03, J09 · Next J04 · Step in J04 · Done J04 · Pause
J10 · Stop J11 · Break it down J05 · Group J07 · Copy J08, J13. Blanks J09 · child runs J09, J10 · Map
J02, J10 · Read it J06 · found-by-words J12 · run-only revisions J05, J13 · errors J15 · access J16.

**Renders:** none current. The earlier converged set (`.polish/product/b11-final/`, 107 states) predates
wait steps, reasons, reactions, rails, things out, Jump to… and the final runner; it is superseded by the
final redraw, which draws every state in this file — J01–J46 — from the design and this list alone.
