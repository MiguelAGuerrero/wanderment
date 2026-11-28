# Golden fixtures (P-89, frozen 2026-11-25, before the old app was retired)

Written by the app itself, through its own store actions, real persistence module and real SQLite —
never by hand, and never by the code that came after. `src/storage/golden.test.ts` loads, migrates,
replays, hands over, exports and imports them and compares with the `expected-*.json` snapshots taken
from the store of the build that wrote them. **Never regenerate or edit these files**: they are what a
real person's browser holds.

| File | Written by | Holds |
|---|---|---|
| `schema3.sqlite` | the build before P-85 (`f477e07`), ordinary saves | schema 3: 3 wanders (one declared with a next step, one hidden, one plain with a next step), 5 activities (one lit; one settled by Done it, with a note and a doing wander; one settled at once; one backdated with doing, a "to" link and a note; one loose), all five settings |
| `journal-four-key.json` | the same build, writes never committing | the `wanderment:journal` text holding all of the above as pending changes (four keys) and the five settings |
| `fallback-old-build.json` | the same build, where SQLite can't run | the `wanderment` blob (data format 1) with all of the above |
| `backup-format1.json` | the same build's `toBackup` | a format-1 backup of the above (a backup never holds settings) |
| `expected-old.json` | that build's store | what all four must read as |
| `schema4.sqlite` | the build before the retirement (`b50ffec`): it opened `schema3.sqlite`, then the new app was used | schema 4: all of the above, plus 3 routines (two named with an open edge, one unnamed made by Break it down) and 2 runs (one paused two levels deep with a reason and this-run changes, one ended) |
| `journal-eight-key.json` | the same build, writes never committing | the journal holding all of that as pending changes (eight keys) and the five settings |
| `fallback.json` | the same build, where SQLite can't run | the `wanderment` blob (data format 2) with all of that |
| `backup-format2.json` | the same build's `toBackup` | a format-2 backup of all of that |
| `expected-new.json` | that build's store | what those four must read as |

`freeze-old-build.ts.txt` and `freeze-current-build.ts.txt` are the scripts that wrote them (vitest
files, run once in a copy of each commit; they drive store actions that no longer exist).

## P-90 (frozen 2026-11-25, before the Plan surface)

Written the same way by the build before P-90 (`ba739fa`), whose runs carried "this run only" changes
and whose Break it down made unnamed sequences owned by the run. P-90 stops writing both; these files
are what a person's browser still holds, and must stay readable for good.

| File | Written by | Holds |
|---|---|---|
| `p90-schema4.sqlite` | that build, ordinary saves, and its own Import (Replace) | 5 routines (three named with an open edge — one empty, one with a counted loop `[tracker \| find, tailor, wait, log] × 3` — and two unnamed breakdowns, one inside the other, each owned by a run) and 4 runs: one ended with a this-run reword never kept; one left at the edge of the empty routine (`at: null`); one left three levels deep in round 2 of the counted loop with seven this-run changes (a step added, a step reworded, a step removed, the number, a breakdown, a nested breakdown, a reword inside it) and a reason; and a second, paused run of the same routine, waiting, round 2 (only an import can make one) |
| `p90-journal.json` | the same build, writes never committing | the journal holding all of that as pending changes |
| `p90-fallback.json` | the same build, where SQLite can't run | the `wanderment` blob with all of that |
| `p90-backup.json` | the same build's `toBackup` | a format-2 backup of all of that |
| `p90-expected.json` | that build's store | what those four must read as |

`freeze-p90.ts.txt` is the script that wrote them.

## P-94 (frozen 2026-11-25, before the queue)

Written the same way by the build before P-94 (`0e98cf3`), whose home was tiles in a fixed order and
which let one thing run at a time. It started from `schema4.sqlite` (so the retired app's wanders and
activities, and a run with this-run changes from before P-90, are in it) and was then used through its
own store actions. P-94 reads its open runs as the queue (the one the app is on first, then the others
last touched first) without writing anything; these files must stay readable for good.

| File | Written by | Holds |
|---|---|---|
| `p94-schema4.sqlite` | that build, ordinary saves, over `schema4.sqlite` | the 3 wanders and 5 activities and the 3 routines and 2 runs of `schema4.sqlite`, plus 9 routines and 6 runs: a routine never started; a run left on a step three days before the rest; a run resting on a wait step; a run left in Plan, whose routine has a step broken down (an unnamed sequence owned by no run); a run at the edge of an open goal (in Plan); an ended run; a removed routine; and the run the app is on, paused with a reason |
| `p94-journal.json` | the same build, writes never committing | the journal holding all of that as pending changes |
| `p94-fallback.json` | the same build, where SQLite can't run | the `wanderment` blob with all of that |
| `p94-backup.json` | the same build's `toBackup` | a format-2 backup of all of that |
| `p94-expected.json` | that build's store | what those four must read as |

`freeze-p94.ts.txt` is the script that wrote them.

## P-96 (frozen 2026-11-26, before values)

Written the same way by the build before P-96 (`fad64c6`), which had no `out` on any step, no `values` on
any run and no brace in any words. It started from `p94-schema4.sqlite` (so everything above is in it) and
was then used through its own store actions. P-96 reads `{name}` from words and values from a run's body;
this data has neither, so it must load and behave exactly as before, for good.

| File | Written by | Holds |
|---|---|---|
| `p96-schema4.sqlite` | that build, ordinary saves, over `p94-schema4.sqlite` | everything in `p94-schema4.sqlite`, plus 9 named routines (and 4 unnamed breakdowns) and 9 runs: a counted loop `[Pick a feature \| Try it (broken down), Note what broke] × 3` left in round 2 one level deep; an until-done loop left in round 3; a run two levels deep (a breakdown inside a breakdown); a run left in Plan; a run resting on a wait, paused with a reason; a run at the edge of an open goal (in Plan); a run finished by Next off the end of round 2; a run ended by Done one level down then at the top; and the run the app is on, running on its second step |
| `p96-journal.json` | the same build, writes never committing | the journal holding all of that as pending changes |
| `p96-fallback.json` | the same build, where SQLite can't run | the `wanderment` blob with all of that |
| `p96-backup.json` | the same build's `toBackup` | a format-2 backup of all of that |
| `p96-expected.json` | that build's store | what those four must read as |

`freeze-p96.ts.txt` is the script that wrote them.

## P-97 (frozen 2026-11-27, before tags and My routines)

Written the same way by the build before P-97 (`3ac50af`), which had no `tags` on any routine and whose home
was a tile for every routine. It started from `p96-schema4.sqlite` (so everything above is in it) and was then
used through its own store actions. P-97 reads `tags` from a routine's body (missing = none) and shows on home
only the runs going; this data has no tags, so it must load exactly as before and write nothing, for good.

| File | Written by | Holds |
|---|---|---|
| `p97-schema4.sqlite` | that build, ordinary saves, over `p96-schema4.sqlite` | everything in `p96-schema4.sqlite`, plus 9 routines (one unnamed breakdown) and 4 runs: an until-done loop from the top with a value given, paused with a note; an until-done loop only inside a step broken down, the run left inside it; a counted loop at the top, started over, then opened in Plan; a run ended with End this run; routines never started named "Écrire un poème", "apple pie" and "Éclair practice" (no steps); a removed routine; and P-96's "Read a chapter" running again |
| `p97-journal.json` | the same build, writes never committing | the journal holding all of that as pending changes |
| `p97-fallback.json` | the same build, where SQLite can't run | the `wanderment` blob with all of that |
| `p97-backup.json` | the same build's `toBackup` | a format-2 backup of all of that |
| `p97-expected.json` | that build's store | what those four must read as |

`freeze-p97.ts.txt` is the script that wrote them.

## P-98 (frozen 2026-11-27, before calls)

Written the same way by the build before P-98 (`671e654`), where a routine used as a step was a plain `{id,
ref}` item that only an import could make, run with Step in and its values dropped on leaving. It started from
`p97-schema4.sqlite` (so everything above is in it) and was then used through its own store actions — and its
Import, for what only an import could make there. P-98 reads a call's bindings (`with`), its name snapshot
(`words`), returns what a call gives and refuses to step into a removed routine; this data must load exactly as
before and write nothing by loading, and every field that build did not know must survive.

| File | Written by | Holds |
|---|---|---|
| `p98-schema4.sqlite` | that build, ordinary saves (and two Imports), over `p97-schema4.sqlite` | everything in `p97-schema4.sqlite`, plus "Research" (reads `{concerns}`, gives `{findings}`) used as a step of "Improve my workout routine" after "List out my doubts" (gives `{concerns}`) — the row carrying `with`, `words` and `later`, which that build did not know; "Old helper", removed, used as the last step of "Weekend plan", beside a step with an unknown field; a run of Improve paused inside Research with `{concerns}` given above and `{findings}` inside (its level and a value carrying fields that build did not know); a run of Weekend plan resting on the removed routine's row; and P-96's "Read a chapter" running again |
| `p98-journal.json` | the same build, writes never committing | the journal holding all of that as pending changes |
| `p98-fallback.json` | the same build, where SQLite can't run | the `wanderment` blob with all of that |
| `p98-backup.json` | the same build's `toBackup` | a format-2 backup of all of that |
| `p98-expected.json` | that build's store | what those four must read as |

`freeze-p98.ts.txt` is the script that wrote them.

## P-109 (frozen 2026-11-27, before places)

Written the same way by the build before P-109 (`173867e`), where a routine had no `places` and nothing in the
app opened an address. It started from `p98-schema4.sqlite` (so everything above is in it) and was then used
through its own store actions. P-109 reads a routine's places (none here) and offers "Open <host>" for an
http(s) address typed in a step, a value or the pause note; this data must load exactly as before and write
nothing by loading.

| File | Written by | Holds |
|---|---|---|
| `p109-schema4.sqlite` | that build, ordinary saves, over `p98-schema4.sqlite` | everything in `p98-schema4.sqlite`, plus "Product design" (tagged "design"): a step whose words hold a Google Docs address, a step giving `{page}`, a step reading it, and a step whose words only look like other schemes ("javascript:alert(1)", "file:///etc/passwd"); a run of it paused on "Work in {page}" with `{page}` given as a Notion address and a pause note holding a Figma address; and P-96's "Read a chapter" running again |
| `p109-journal.json` | the same build, writes never committing | the journal holding all of that as pending changes |
| `p109-fallback.json` | the same build, where SQLite can't run | the `wanderment` blob with all of that |
| `p109-backup.json` | the same build's `toBackup` | a format-2 backup of all of that |
| `p109-expected.json` | that build's store | what those four must read as |

`freeze-p109.ts.txt` is the script that wrote them.

## P-107 (frozen 2026-11-27, before for each)

Written the same way by the build before P-107 (`6f4afea`), where a step broken down was an unnamed sequence and
nothing knew `each`. It started from `p109-schema4.sqlite` (so everything above is in it) and was then used through
its own store actions — and its Import, for what only an import could make there: a for each block **in the shape
P-107 writes** (a row `{ id, ref }` to an unnamed sequence whose words are "For each photo in {photos}", carrying
`each: { item: 'photo', list: 'photos' }`). That build read it as a step broken down: it rested on its row with
Step in, stepped in, and asked for `{photo}` inside; its Plan added a step inside the block and kept `each`. P-107
reads the block as a for each and the run left inside it as on its first item; this data must load exactly as
before and write nothing by loading, for good.

| File | Written by | Holds |
|---|---|---|
| `p107-schema4.sqlite` | that build, ordinary saves (and two Imports), over `p109-schema4.sqlite` | everything in `p109-schema4.sqlite`, plus "Sketch" (reads `{photo}`, gives `{drawing}`) and "Drawing practice" ("Find reference photos" gives `{photos}`, then the block — Sketch called inside it, "Note what to fix in {photo}", and "Put {photo} away" added by that build's Plan — then "Rank the {drawing}"); a run of Drawing practice paused inside Sketch inside the block (no item on its level), its `{photos}` made three items by the second import; and P-96's "Read a chapter" running again |
| `p107-journal.json` | the same build, writes never committing | the journal holding all of that as pending changes |
| `p107-fallback.json` | the same build, where SQLite can't run | the `wanderment` blob with all of that |
| `p107-backup.json` | the same build's `toBackup` | a format-2 backup of all of that |
| `p107-expected.json` | that build's store | what those four must read as |
| `p107-old-build.json` | that build's `planView` and `runnerView` | what it SHOWED for the block: its Plan rows, and the runner on the block's row, inside the block and inside Sketch — a step broken down, Step in, `{photo}` asked |

`freeze-p107.ts.txt` is the script that wrote them.

## P-108 (frozen 2026-11-27, before kept lists)

Written the same way by the build before P-108 (`ee66a65`, P-107's for each), which knew none of P-108's fields. It
started from `p107-schema4.sqlite` (so everything above is in it) and was then used through its own store actions — and
its Import, for what only an import could make there: the shapes P-108 writes. A for each with a **kept list**
(`each: { item, list, kept, refs }`, a routine among its items), one with **its own list** (`each.own`), **routine
rows by a name** (`{ id, text: '{way}', slot: true }`), **values that are routines** (`refs` beside `items`) and a for
each level that **keeps the list it last saw** (`eachSeen`). That build read both blocks as for eaches over a name
nothing gave and passed them, read `▤ {way}` as the step "{way}" showing the routine's name as words (no Step in), and
its Plan added a step inside the kept block keeping the header it did not know. P-108 reads all of it; this data must
load exactly as before and write nothing by loading.

| File | Written by | Holds |
|---|---|---|
| `p108-schema4.sqlite` | that build, ordinary saves (and five Imports), over `p107-schema4.sqlite` | everything in `p107-schema4.sqlite`, plus "Draw with guidelines"; "Become a better drawer" (Warm up, the kept block — arms, legs, "Draw with guidelines: eyes, slower" — with a step added by that build's Plan, the own-list block over {topics}, "Choose a way to draw" gives `{way}`, `▤ {way}`, "Tell Sam about {way}"), a run of it paused on `▤ {way}` with `{way}` the routine; "Try ways" ("List the ways to try" gives `{ways}`, a for each over it holding `▤ {way}`), a run paused inside it with `{ways}` a routine with words and plain words, its level keeping `eachSeen`; and P-96's "Read a chapter" running again |
| `p108-journal.json` | the same build, writes never committing | the journal holding all of that as pending changes |
| `p108-fallback.json` | the same build, where SQLite can't run | the `wanderment` blob with all of that |
| `p108-backup.json` | the same build's `toBackup` | a format-2 backup of all of that |
| `p108-expected.json` | that build's store | what those four must read as |
| `p108-old-build.json` | that build's `planView` and `runnerView` | what it SHOWED: both blocks as steps broken down, passed straight through on the run; `▤ {way}` as the step "{way}" with the routine's name in place as words, no Step in; inside "Try ways"' for each, the item with its words |

`freeze-p108.ts.txt` is the script that wrote them.

## P-110 (frozen 2026-11-27, before values follow the place)

Written the same way by the build before P-110 (`1b005ac`, P-108), through its own store actions only (no Import: no
new stored shape). It started from `p108-schema4.sqlite` (so everything above is in it) and left runs that break
P-110's rule — "a value is held only while the step that gives it is above the place" — as that build let a person
make them. P-110 changes how they are **read** (a value whose giving step is not above the place is not shown, and a
step never asks ahead), never what is stored: this data must load exactly as before and write nothing by loading.

| File | Written by | Holds |
|---|---|---|
| `p110-schema4.sqlite` | that build, ordinary saves, over `p108-schema4.sqlite` | everything in `p108-schema4.sqlite`, plus "Document Iteration"; "Iterate on the app" ("Envision how I’d expect {feature} to work", "Pick a feature" gives `{feature}`, "Build {feature}", "@Document Iteration" as words), a run of it with `{feature}` asked AHEAD at the reader, moved past the giver, Jumped back to the first step, paused; "Write the post" ("Choose a subject" gives `{subject}`, "Draft {subject}", "Edit {subject}"), a run with `{subject}` given, moved on, Jumped back onto its giving step, paused; and P-96's "Read a chapter" running again |
| `p110-journal.json` | the same build, writes never committing | the journal holding all of that as pending changes |
| `p110-fallback.json` | the same build, where SQLite can't run | the `wanderment` blob with all of that |
| `p110-backup.json` | the same build's `toBackup` | a format-2 backup of all of that |
| `p110-expected.json` | that build's store | what those four must read as |
| `p110-old-build.json` | that build's `planView` and `runnerView` | what it SHOWED: `{feature}` asked at the reader ahead of its giver; the value kept (and shown, and in the reader's field) after the Jump back; "Resume at Build {feature}" and "at Envision how I’d expect {feature} to work" with the name as written; `{subject}` kept after the Jump back onto its step |

`freeze-p110.ts.txt` is the script that wrote them.

## P-100 (frozen 2026-11-27, before home is one queue)

Written the same way by the build before P-100 (`0b67fb1`, P-111), through its own store actions only (no Import). That
build stored no order for home: it showed the runs going by when each was started, the oldest first, under Ongoing (the
routine repeats until done) and Finishing. It started from `p110-schema4.sqlite` (so everything above is in it). P-100
stores the order on a run (`queue`) only when a row is moved; this data has none, so it must load exactly as before,
write nothing by loading and read as one queue in the order that build showed, for good.

| File | Written by | Holds |
|---|---|---|
| `p100-schema4.sqlite` | that build, ordinary saves, over `p110-schema4.sqlite` | everything in `p110-schema4.sqlite`, plus "Plan my day", a run paused on its second step with the note "after coffee"; "Apply to Acme", a run resting on its wait "a reply from Acme"; "Better drawer", a run paused inside its step broken down "Get better at hands" (on "Gesture practice", note "hands are tired"); and P-96's "Read a chapter" running again |
| `p100-journal.json` | the same build, writes never committing | the journal holding all of that as pending changes |
| `p100-fallback.json` | the same build, where SQLite can't run | the `wanderment` blob with all of that |
| `p100-backup.json` | the same build's `toBackup` | a format-2 backup of all of that |
| `p100-expected.json` | that build's store | what those four must read as |
| `p100-old-build.json` | that build's `homeShown`, `homeGroups` and `tileLine` | what it SHOWED on home: every run going in order (name, run, state, line, note), and which were under Ongoing and Finishing |

`freeze-p100.ts.txt` is the script that wrote them.
