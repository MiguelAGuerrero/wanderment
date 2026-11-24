# B-11 — Capabilities: everything a person can reasonably expect to do

Companion to [`B-11-context-stacks.md`](B-11-context-stacks.md) (the design) and
[`B-11-journeys.md`](B-11-journeys.md) (the journeys and their renders). This list is the checklist for
essentials — create, read, change, move, copy, remove, get back — for every thing the app holds, plus
the app-level basics. **Each cell names the journey state that shows it, or says "not drawn".** A "not
drawn" is a gap in the mockups, not necessarily in the design.

## 1. Things the app holds
| | Create | See / find | Rename / edit | Reorder / move | Copy | Remove | Get back |
|---|---|---|---|---|---|---|---|
| **Foundation** (a top-level value, goal or routine) | J01-b, J03-a/b | J02-a, J10-c | not drawn | not drawn (order on home) | not drawn | not drawn | not drawn |
| **Routine** | J07 (group), J12-a (name it); *from scratch in Your routines: not drawn* | J06-a, J09-a, J03-a | name: not drawn; contents: J06, J08-b | within a parent: J06-b | J08-c | J15-d | not drawn (Undo after remove) |
| **Step** | J06-a (field), J05-a, J01-c | J06-a, J04 | words: not drawn | J06-b (up / down); to another routine: not drawn | not drawn | J06-b | Undo: stated, not drawn for a step |
| **Repeat divider** | J06-c | J06-a | J06-c (three positions) | J06-a (grip), J06-b | — | J06-c ("runs once") | — |
| **Blank** | J08-a (＋ A blank) | J09-a | its word: not drawn | — | — | not drawn | — |
| **Value used in a blank** | J09-b | J09-a/b | — | — | — | not drawn (forget a value) | — |
| **Run** (and child run) | J01-b, J03-a, J09-a/b/c | J02-a, J09-c, J13-a | its blank's value while running: not drawn in this set | — | J13-b | end: J04-e, J13-b; *discard a paused run from home: not drawn* | J04-e (Undo end); start over: J13-b |
| **This-run-only change** | J05, J13-a | J05-b, J13-a | J13-a | — | — | not drawn (drop a change) | — |
| **Unnamed sequence** | J05, J01 (typed one-off) | J12-a | via Name it: J12-a | — | — | not drawn (forget it) | J12-a (Do it again) |
| **History entry** | automatic | J14-a | — | — | — | not drawn | — |

## 2. The verbs (from the design) and where they are shown
Start J01–J03, J09 · Next J04-a/b · Step in J04-c · Done J04-d/e · Pause J10-a · Switch J10 · Stop
J10-a → J11-a · Break it down J05 · Group J07 · Copy J08-c, J13-b · Resume J02-a, J10-a · Undo J04-b/d/e,
J07-c · Keep in routine J05-b, J13-a · Walk through: **not drawn** · Focus on one routine (J06-e button
only; the focused view **not in this set**) · Copy as text: button only.

## 3. App-level basics
| Capability | Shown |
|---|---|
| Settings screen (how to reach it, what is in it) | **not drawn** |
| Export everything | J14-a (button only) |
| Import / restore a backup, with a preview | **not drawn** (exists in today's app) |
| Erase everything | **not drawn** |
| Storage status / "storage is blocked" screen | **not drawn** (exists in today's app) |
| Couldn't save | J15-a |
| Open in another tab | J15-e |
| A new version is available | **not drawn** (exists in today's app) |
| Offline use; install as an app | **not drawn** (no special state expected) |
| First run | J01 |
| Empty states: no routines, no history, a foundation with nothing | J01-a, J02-a (empty foundation); *Your routines empty, History empty: not drawn* |
| Loading / reconnecting | **not drawn** |
| Long words, many items (20 foundations, 10 child runs, 30 steps) | **not drawn** |
| Large text, screen reader | J16 |
| Reduce Motion | rule only (nothing to draw) |
| Keyboard (web): Return, Esc, Tab order, shortcuts | **not drawn / not specified** |
| Back and browser history; links to a routine or a run | **not specified** |
| Opt-in "How did this feel?" and pace note (later) | not in the first build |
| Getting from home to Your routines, History, Settings | **not drawn** (no visible way on J02-a) |

## 4. Known gaps (before the audit)
Renaming anything; editing a step's words; removing or reordering a foundation; discarding a paused run
from home; a routine created from scratch; forgetting a value or an unnamed sequence; a Settings screen
with import, erase and storage; the update banner; loading and blocked-storage states; navigation from
home to Your routines / History / Settings; long content; keyboard and Back behaviour.
