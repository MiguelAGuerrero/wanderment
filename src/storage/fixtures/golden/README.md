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
