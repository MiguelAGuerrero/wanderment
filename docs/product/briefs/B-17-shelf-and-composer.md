# B-17 — A shelf of ready-made routines, and adding one where you write

**Status:** proposed · **Decision:** D-24 (to be added on main) · **Theme:** Reuse; Written by running ·
**Date:** 2026-11-27 · **Needs:** P-97 (My routines) for slice 1; P-98 (routines as steps, for each) for
slices 2–3; P-99 (In any order) for the templates in slice 3

## The problem, in the owner's terms
"It's kind of hard to apply every method and have that in your head while you're doing something … what
if I always have reference to how to actually engage with an activity in order to draw the most learning
and reflection from?" (2026-11-26). Then, asking for this brief's research (2026-11-27): methods "that
can be packaged into well-formed routines with proper inputs and outputs that can generate work that we
can leverage in a quick composer or a template library of sorts, where we could rely on a standard
library to reference in a user's created routines. … Think like the Lodash of the app, where either
these are small functions that can be slotted wherever, or we have templates that are purposed to model
big goals like learn a skill, do research, make a project." And why it matters: "I want the process of
refining a routine to be a demonstration of your knowledge and understanding of what you want, not
necessarily working with the [app] to understand the app's language so much."

Decided already by the owner (2026-11-27): "The library is a copy you own"; "a called routine can hand
its results back to the caller."

**Where the evidence is thin.** The owner has asked for this and has not used anything like it in the
app. The one piece of real use that bears on it: in Plan the owner typed "For each concern,
@{concerns}researc…" into Add a step (owner-notes, 2026-11-27), writing structure as prose and
reaching for "@" to insert a reference. That says the composer should meet the person in the row where
they are already typing.

## Evidence
- Owner notes: 2026-11-26 (the origin in productivity science), 2026-11-27 (the request; copies are
  owned; calls return; the "@" screenshot; a value can be a routine).
- Discovery: [`../discovery/2026-11-27-standard-library.md`](../discovery/2026-11-27-standard-library.md)
  (14 small methods, 4 templates, how other tools package a library) and
  [`../discovery/2026-11-27-standard-library-survey.md`](../discovery/2026-11-27-standard-library-survey.md)
  (70 more). **No source in either was opened**; both say so. What other tools do: most copy with no
  sync (Todoist, Notion, Things); Shortcuts and Lodash reference; Workflowy keeps the two apart by name;
  Tana mixes them invisibly and has an FAQ about the confusion; Shortcuts previews the actions before
  you take one; Workflowy inserts a template from where you are typing.
- The app today: New makes an empty routine from a name. Plan's Add row takes typed words only. An
  existing routine cannot be added as a step in Plan (P-98). There is no My routines page yet (P-97).

## Proposed experience
Two kinds of thing are on the shelf, and the model already tells them apart (discovery, finding 2):
- **A method** is small and keeps no list. It is taken once and **called** from anywhere.
- **A template** is big and mostly kept lists, which belong to the routine. It is **copied per aim**
  ("Learn guitar", "Learn Spanish"), following "to vary, copy".

`[Button]` is a button, `[[Button]]` the one filled button.

### Journey 1 — Finding the shelf (My routines)
```
My routines
  [ Find… ]
  Yours   ·   Shelf                         ← two views of one page
  ─────────────────────────────
  To learn
    Recall before you look        asks {material} · gives {misses}
    Work through the errors       asks {attempt} · gives {patterns}
    Practise at the edge          asks {subject} · gives {target}
  To decide
    Weigh the options             asks {decision} · gives {choice}
    Find how it fails             asks {plan} · gives {revised plan}
  To make something
    Learn ▢                       a routine of your own
    Make ▢                        a routine of your own
```
- No new place in the navigation: the shelf is the second view of My routines (P-97).
- Each row is a name and its **signature**, in the chips Plan already uses. No description.
- Headings group by what you are trying to do. Find searches names and step words in both views.
- A shelf routine the person has already taken is not listed twice: its row opens their own.

### Journey 2 — Looking before taking
Tapping a row opens the routine's own Plan, read-only: the steps, what each gives, the For each rows.
```
PLAN                                                         ⌂ Home
Recall before you look                       asks {material}
  Put {material} out of sight
  Write down everything you can recall of {material}
  Check what you wrote against {material}
  List what you missed or got wrong          gives {misses}
  For each {miss}
    Read the part of {material} that covers {miss}
    …
                                             [[Take]]
```
The preview is the thing itself. There is no explanatory text and no citation on screen.

### Journey 3 — Taking
- **A method:** Take adds it to Yours under its name and lands on its Plan. Notice: "Took Recall before
  you look · Undo". From then on it is an ordinary routine: the person's words, editable, no badge, no
  lock. A later app version changes the shelf and never reaches into it.
- **A template:** Take opens the New sheet with the name started ("Learn ", cursor after it) and
  **Plan** filled. The copy is named for the aim. A template takes the methods it calls with it; where
  the person already has a routine of that name, theirs is used. One Undo for all of it.

### Journey 4 — Adding one where you write (the quick composer)
In Plan, the Add row (P-98: "Add offers a step, a routine (search), For each…") searches Yours and the
shelf together as the person types:
```
  + recall|
    Recall before you look        asks {material}          Shelf
    Come back to it                                         Shelf
    ↵ Add "recall" as a step
```
- Return still adds the typed words as a step, always first by keyboard. Nothing is taken without a
  tap.
- Choosing a shelf method takes it and adds it as a call in one move, with one Undo. The call row
  shows what it asks, filled by name from above where a name matches (P-98).
- "@" in the row opens the same list, with the names given above first. (The "@" picker itself is in
  the conventions fix batch; this brief only adds the shelf to what it lists.)
- The same list appears in a giving field where a routine can be given as a value (B-16).

### Edges
- **Before P-98:** only methods with no For each and no call are on the shelf, and they can be taken
  and started by themselves (slice 1).
- **Offline:** the shelf ships inside the app; nothing is fetched.
- **Many:** the first shelf is about eighteen; headings and Find are enough. No ranking, no "popular".
- **Screen reader:** a row reads "Recall before you look, asks material, gives misses, on the shelf";
  the two views are a tab list; the preview announces "Plan, read only".
- **Large text:** the signature wraps under the name; nothing is cut.

## Fit with the product
- **Minimalism, "no instructional or explanatory text":** kept. The shelf shows names, signatures and
  the routine itself. The research behind each method lives in the repository's discovery files.
- **"Routines in their own words":** a shelf routine is not the person's until taken; once taken it
  is theirs to rewrite, and nothing marks it as different.
- **"One version per name":** taking uses the shelf's name; if that name is already theirs, there is
  nothing to take. A second, different copy waits for Copy (designed, not built).
- **"Nothing is created or started without a tap":** kept; Return adds words, a tap takes.
- **"One navigation scheme":** kept; no new door on home.
- **Refusals:** no shelf routine uses a timer, schedule, count or streak (each was rewritten or
  rejected in discovery). No accounts, no gallery from a server, no sharing.
- **STRATEGY.md:** Reuse (know-how used in a second place) and Written by running (a taken routine is
  sharpened like any other). It also answers the cold start the owner met on first use ("I expected
  some form of … do you want to create a stack").
- **Not doing:** updates that reach into a taken routine or say it is behind; a badge or lock on taken
  routines; descriptions, ratings or examples in prose; a community gallery; conditional logic in
  templates; choosing a shelf routine by anything the app measures.

## Persona panel
_To be filled: run before the decision is asked._

## UI audit of the design
_To be filled: run before the decision is asked._

## Slices
1. **The shelf, with methods that run today** `[feature]` `[ux]` M. After P-97. My routines gains the
   Shelf view; rows with signatures; the read-only preview; Take with Undo. The shelf ships in the app
   in the export format and is read through the import check. Content: the methods that need no For
   each and no call (from discovery: An if-then plan, Take the outside view, Check a source, Say what
   done is, Compare two cases, Test a guess, Copy then vary, After a setback, and Work it out as you
   go in its Repeat form). *Done when:* a shelf method can be found, previewed, taken, undone and
   started; a taken routine survives reload, export and import and is unchanged by an app update; a
   test fails the build if any shelf routine does not pass the import check or breaks the house style.
2. **Adding from where you write** `[feature]` `[ux]` M. After P-98. Plan's Add row and "@" list the
   shelf with Yours; choosing a shelf method takes it and adds the call, one Undo; Return still adds
   words. *Done when:* typing part of a shelf method's name in Add offers it, a tap adds a call row
   with its inputs shown, and Undo removes both the call and the taken routine.
3. **The rest of the first shelf, and templates** `[feature]` `[data]` M (Full tier). After P-98 and
   P-99. The For each methods (Recall before you look, Work through the errors, Review after doing,
   Practise at the edge, Explain each step, Find how it fails, Argue the other side, Weigh the options,
   Make it startable, Teach it plainly, Come back to it) and the templates (Learn ▢, Find out ▢, Make ▢,
   Make a decision). Taking a template names the copy through New and takes what it calls, by name.
   *Done when:* "Learn ▢" taken twice gives two routines with separate kept lists that call the same
   methods; where the person's own routine of a called name exists it is the one called.
4. **House style, as a test and a page** `[docs]` S, with slice 1. Verb-first names; one job each; a
   plural list and its singular item; no minutes or counts in step words; no kept list in a method;
   steps are statements of work. The citations for each shelf routine sit beside it in the repository.

## Data and risk
- **Stored data:** taking creates routines of the kinds that already exist, through the existing
  path. No new stored field in slices 1–2: a taken routine is recognised by its name. Slice 3 uses
  P-98's kept lists and calls.
- **The shelf file** is an asset of the app, not the person's data: never in export, never touched by
  import, replaced whole by an update.
- **Unverified research.** Discovery could not open a single source. Because nothing on screen makes
  a claim, the risk sits in the repository's notes, not in the app; the citations should be read by a
  person before any of them is repeated anywhere.
- **Practitioner conventions** (Teach it plainly, Make ▢, the arrangement of Make a decision) cannot be
  labelled on screen. They are labelled in the repository. The owner may prefer to leave them out.
- **A shelf that reads as homework.** Eighteen ready-made methods could make the app feel like a
  course. Mitigation: nothing is pre-taken; home never mentions the shelf.
- **Name collisions on a later update:** if a shelf routine is renamed, a person who took it under the
  old name is offered the new one as if new. Accepted; identity by name is the cost of no stored field.

## Alternatives considered
- **Do nothing; write the methods by hand from the discovery files.** Costs nothing and tests whether
  the methods are worth having. Recommended as a first step regardless: the owner can type three of
  them in today.
- **A file to import.** Import replaces everything on the device, so it cannot add a library.
- **Reference, not copy** (one shared original everyone calls): the owner decided copies are owned.
- **A separate Library screen with its own door.** Refused by "one navigation scheme"; My routines
  already is the place for routines.
- **Descriptions and evidence on screen.** Refused by minimalism.

## Questions for the owner
1. Are practitioner conventions allowed on the shelf, given the app cannot label them? Proposed: yes
   for the three named above, labelled in the repository.
2. Should the citations stay in the repository only? Proposed: yes.
3. Is eighteen the right size for the first shelf? Proposed: yes; the survey's additions wait for use.

## Decision requested
**D-24:** Build B-17, slice 1 after P-97? **Go** / **Go, but change …** / **Not now** / **No**.
