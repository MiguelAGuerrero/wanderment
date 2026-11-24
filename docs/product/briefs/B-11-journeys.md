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
| J22 | **Settings and your data** | Know where your data is; take it out, bring it back, wipe it | a) Settings: where the data lives, Export, Import, Erase, version · b) import preview: what the backup holds, Replace / Cancel · c) Erase everything: confirm, export first · d) exported / imported confirmation |
| J23 | **The app's own states** | Understand what the app is doing when it isn't ready | a) Opening… · b) can't open the data: Reload, download the local copy · c) another tab took over / reconnecting, with a pressed Next kept · d) a new version is ready · e) saved by a newer version |
| J24 | **Coming from the old app** | Lose nothing, know where it went | a) first open after the update with existing data · b) History showing earlier logged lines with their notes |
| J25 | **A lot of it** | It still works when full | a) home with 20 foundations and 10 runs under one · b) a three-line step and a long "Done with …" on Running · c) a 30-step routine in Blocks with the keyboard up |
| J15+ | **More that can go wrong** | — | g) a step removed, with Undo · h) an empty step or name · i) starting something while a run is running |
| J26 | **Forget things** *(design now)* | Privacy and tidiness | a) remove one History entry / clear History · b) forget a value used in a blank · c) forget an unnamed sequence · d) reopen an ended run from History |
| J28 | **Paste a list** *(design now)* | Bring steps in from elsewhere | a) pasted lines becoming several steps, with Undo |
| J29 | **Move within a run** *(design now)* | Go where you actually are | a) See it all: make a step "now" · b) going back a step · c) dropping a this-run-only change |
| J30 | **More with steps and blanks** *(design now)* | — | a) duplicate a step; send a step to another routine · b) placing, rewording and removing a blank; two blanks in one routine |
| J31 | **Where only a button is drawn** *(design now)* | — | a) Walk through · b) Focus on one routine · c) Copy as text and its confirmation · d) after "Name it, keep it" |
| J32 | **Opt-ins** *(design now)* | — | a) Settings: "How did this feel?" and the pace note switched on |
| J33 | **Find old things** *(design now)* | — | a) searching History (lines and notes) |
| J16+ | **Large text, focus** *(design now)* | — | c) a ⋯ menu and a dialog at 200 % · d) visible focus, and where it lands after Undo, a dialog, a removal |

**J27 Keyboard and Back** is a table in the design document, not a render: Return, Esc, Tab order and a
key for Next on every screen; browser Back; each screen's address; what each retired route does.

**Not in the first build, so not rendered:** the opt-in "How did this feel?" and pace note; a step that
waits while the rest of its sequence carries on.

**Coverage check (verbs → journeys):** Start J01–J03, J09 · Next J04 · Step in J04 · Done J04 · Pause
J10 · Stop J11 · Break it down J05 · Group J07 · Copy J08, J13. Blanks J09 · child runs J09, J10 · Map
J02, J10 · Read it J06 · found-by-words J12 · run-only revisions J05, J13 · errors J15 · access J16.
