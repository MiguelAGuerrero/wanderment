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
