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
