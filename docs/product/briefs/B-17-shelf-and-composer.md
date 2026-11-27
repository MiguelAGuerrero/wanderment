# B-17 — A library of ready-made routines, and adding one where you write

**Status:** proposed, revised after its UI audit and persona panel · **Decision:** D-24 (to be added on
main) · **Theme:** Reuse; Written by running · **Date:** 2026-11-27 · **Needs:** P-97 (My routines) and
P-98 (routines as steps, for each); P-99 (In any order) for the templates

_The first draft said "shelf" and "Take". The owner's word is "library" ("The library is a copy you
own"), and DESIGN.md already has the verb for making your own version ("to vary, copy"), so this
revision says **Library** and **Copy**. Both are a designer's ruling until the owner confirms them._

## The problem, in the owner's terms
"It's kind of hard to apply every method and have that in your head while you're doing something … what
if I always have reference to how to actually engage with an activity in order to draw the most learning
and reflection from?" (2026-11-26). Then (2026-11-27): methods "that can be packaged into well-formed
routines with proper inputs and outputs that can generate work that we can leverage in a quick composer
or a template library of sorts, where we could rely on a standard library to reference in a user's
created routines. … Think like the Lodash of the app, where either these are small functions that can
be slotted wherever, or we have templates that are purposed to model big goals like learn a skill, do
research, make a project." And why: "I want the process of refining a routine to be a demonstration of
your knowledge and understanding of what you want, not necessarily working with the [app] to understand
the app's language so much."

Decided already by the owner (2026-11-27): "The library is a copy you own"; "a called routine can hand
its results back to the caller."

**Where the evidence is thin.** The owner has asked for this and has not used anything like it. The one
piece of real use that bears on it: in Plan the owner typed "For each concern, @{concerns}researc…" into
Add a step (owner-notes, 2026-11-27), writing structure as prose and reaching for "@" to insert a
reference. The composer should be summoned from the row where the person is already typing.

## Evidence
- Owner notes: 2026-11-26 (the origin in productivity science), 2026-11-27 (the request; copies are
  owned; calls return; the "@" screenshot; a value can be a routine).
- Discovery: [`../discovery/2026-11-27-standard-library.md`](../discovery/2026-11-27-standard-library.md)
  (14 small methods, 4 templates, how other tools package a library) and
  [`../discovery/2026-11-27-standard-library-survey.md`](../discovery/2026-11-27-standard-library-survey.md)
  (70 more). **No source in either was opened**; both say so. Other tools: most copy with no sync
  (Todoist, Notion, Things); Shortcuts and Lodash reference; Workflowy keeps the two apart by name; Tana
  mixes them invisibly and has an FAQ about the confusion; Shortcuts previews before you take one;
  Workflowy inserts a template from where you are typing.
- The app today: New makes an empty routine from a name. Plan's Add row takes typed words only. An
  existing routine cannot be added as a step in Plan (P-98). There is no My routines page yet (P-97).

## Proposed experience
Two kinds of thing are in the library, and the model already tells them apart:
- **A method** is small and keeps no list. It is copied once and **called** from anywhere.
- **A template** is big and mostly kept lists, which belong to the routine. It is **copied per aim**
  ("Learn guitar", "Learn Spanish").

`[Button]` is a button, `[[Button]]` the one filled button.

### Journey 1 — Finding the library (My routines)
```
My routines
  [ Find… ]
  [ Yours ]  [ Library ]                    ← a two-part control; the chosen one is underlined
  ─────────────────────────────
  To learn
    Recall before you look
      asks {material}  gives {misses}
    Work through the errors
      asks {attempt}  gives {patterns}
  To decide
    Weigh the options
      asks {decision}  gives {choice}
  To make something
    Learn ▢
    Make ▢
```
- No new place in the navigation: the library is the second view of My routines (P-97).
- **My routines opens on Yours**, every time. With nothing in Yours yet, it opens on Library, which is
  the answer to the cold start.
- Each row is two lines and one target: the name, then its **signature** in the chips Plan already
  uses, whole chips wrapping. No description.
- Find, while it has text, shows both views under "Yours" and "Library" headings. It matches names.
- A routine the person already has stays in place in the library, with nothing added for the eye. Its
  spoken name says "yours".

### Journey 2 — Looking before copying (a sheet)
Tapping a library row opens a tall bottom sheet over the list. It is not Plan and does not carry the
word PLAN: nothing can be planned here.
```
Recall before you look                       asks {material}
  Put {material} out of sight
  Write down everything you can recall of {material}
  Check what you wrote against {material}
  List what you missed or got wrong          gives {misses}
  For each {miss}
    Read the part of {material} that covers {miss}
    …
  [[Copy]]
  Close
```
- The steps are shown as rows without grips, menus or an Add row: read-only means those controls are
  absent, not disabled.
- **Copy** is the one filled button, pinned lowest but one; **Close** is lowest and returns to the list
  where it was, with Find's text kept.
- For a routine the person already has, the filled button reads **Open yours** and nothing is copied.
  Every library row therefore behaves the same way.
- No explanatory text and no citation on screen.

### Journey 3 — Copying
- **A method:** Copy closes the sheet and stays on the library, so several can be copied in a row. The
  notice in its own row reads "Copied Recall before you look · Undo". From then on it is an ordinary
  routine in Yours: the person's words, editable, no badge, no lock. A later app version changes the
  library and never reaches into it.
- **A template:** the button reads **Copy…** because it asks first. A sheet titled with the template's
  name ("Learn ▢") has a Name field started with "Learn " and **Copy** filled, enabled once a name is
  typed. A name already in use is refused in the sheet, in the app's existing "! … already uses that
  name" form; nothing is opened and nothing is overwritten. A template brings the methods it calls;
  where the person already has a routine of that name, theirs is used. The notice names the reach:
  "Copied Learn guitar and what it calls · Undo", one Undo for all.

### Journey 4 — Adding one where you write (the quick composer)
In Plan's Add row, typed words are a step, as today: Return or Add adds them, and no list appears while
the person writes their own words. The library is **summoned**: "@" (the owner's reach) or Add's
"a routine" choice (P-98) opens one list.
```
  + @recall|
    Yours
      (none match)
    Library
      Recall before you look        asks {material}
```
- Names only are matched; at most three rows from each heading.
- A row from Yours adds a call. A row from Library opens Journey 2's sheet, whose filled button reads
  **Copy and add**: both effects are named before they happen, so no notice is needed afterwards (Plan
  adds give none). Undo, from the step's menu, removes the call and the copied routine together.
- From the keyboard: Alt+↓ moves into the list, ←/→ and ↑/↓ move within it, Return chooses the
  highlighted row, Esc goes back to the field. Return in the field never copies anything.
- On the runner, a giving field that can hold a routine (B-16) lists **Yours only**. Copying from the
  library is planning, and nothing is planned on the runner.

### Edges
- **Offline:** the library ships inside the app; nothing is fetched.
- **Many:** the first library is about eighteen; headings and Find are enough. No ranking.
- **Screen reader:** a row reads "Recall before you look, asks material, gives misses, in the library"
  (or "yours"); "Learn ▢" reads "Learn, blank"; the two-part control is a tab list; focus returns to the
  row after Close and after Copy.
- **Large text:** at 200 % and at 390 px every row and the sheet wrap with nothing cut; targets are at
  least 48 px.

## Fit with the product
- **Minimalism, "no instructional or explanatory text":** kept. Names, signatures and the routine
  itself. The research behind each method lives in the repository's discovery files.
- **"Routines in their own words":** a library routine is not the person's until copied; once copied
  it is theirs to rewrite, and nothing marks it as different.
- **"One version per name":** copying uses the library's name; if that name is already theirs, there is
  nothing to copy. Identity is by name: a routine the person wrote under the same name stands in for
  the library's, and a copy they rename is offered again. Accepted as the cost of no stored field.
- **"Nothing is created or started without a tap"** and **"Return takes the first row":** kept. Typed
  words stay the default; a copy is always a tap on a filled button that says Copy.
- **"Planning and running must never look alike":** kept. The preview is a sheet, not Plan; nothing is
  copied from the runner.
- **"One navigation scheme":** kept; no new door on home, and home never mentions the library.
- **The verbs:** Copy is DESIGN.md's own word ("to vary, copy"), used here for the same act.
- **Refusals:** no library routine uses a timer, schedule, count or streak. No accounts, no gallery
  from a server, no sharing.
- **STRATEGY.md:** Reuse and Written by running; and the cold start the owner met on first use.
- **Not doing:** updates that reach into a copied routine or say it is behind; a badge or lock;
  descriptions, ratings or examples in prose; a mark on what has been copied; a community gallery;
  conditional logic in templates; library rows appearing while the person types their own words.

## UI audit of the design
One fresh auditor, 2026-11-27, on the first draft's written screens against platform conventions and
DESIGN.md (`.polish/product/ui-audit-B-17.md`, local). Three findings blocked and ten should be fixed;
all that fit DESIGN.md are folded in above.
- **Blocked, now changed:** a tap in the Add list that silently made a routine on another page (now a
  sheet whose button says "Copy and add"); a template named with a name in use, which the built New
  path would have silently opened (now refused in the sheet); copying from a giving field on the
  runner (now Yours only).
- **Changed:** the preview is a sheet, not a read-only Plan under the word PLAN; Copy is pinned low
  with Close lowest; rows are two lines (a name with its chips measured 385–407 px in a 358 px column);
  the two views are a real control with an underline for the chosen one; the opening view is stated;
  Find shows both views; a keyboard way to choose a row; "Copy…" where a form follows.
- **Kept, as the audit advised:** the library as a second view with no new door; preview before
  copying, with no Copy on list rows; the asks/gives chips; Return never copying; one Undo.

## Persona panel
_Simulated perspectives from `docs/product/PERSONAS.md`, 2026-11-27, on the first draft
(`.polish/product/panel-B-17-1.md`, `-2.md`, local). A thinking tool, not user research; the roster was
written for the retired app and is used as stress tests._

| Persona | Reaction | What it hinges on |
|---|---|---|
| A Impulsive Dabbler | Fine, briefly delighted; mostly not the audience | Headings over imperatives read as a syllabus; never edits what is copied |
| B Intentional Builder | Delighted by the thing, uneasy at slice 1's reach | Methods that cannot be called yet: "a library with no import statement" |
| C Pressure-Sensitive Returner | Fine, tipping to uneasy | Nothing marking what was not taken; no method appearing as a correction while typing |
| D Reflective Meaning-Seeker | Uneasy; not the audience | Reflection that must end in work; no "why" on screen |
| E Skeptical Minimalist | Fine on the library; uneasy at the preview and the Add row | A PLAN band where nothing can be planned; accidental copying |
| F Assistive-Tech User | Maybe, until the build answers its questions | Dead controls in a read-only screen; a way back; spoken names |

- **Trade-offs:** it favours people who want a procedure handed over and then make it theirs, and
  shame-prone people more than expected because of what it refuses. It costs people who reflect in
  order to keep what they wrote, which the owner has ruled out on purpose.
- **Strong, lean on it:** every fear is answered by an absence: nothing pre-copied, home silent about
  the library, no badge, no update reaching in, no blurbs. The preview is the routine itself.
- **Refinements folded in:** opens on Yours; copied rows stay in place, unmarked, spoken as yours; a
  sheet for the preview with a way back; the library only when summoned in the Add row; "After a
  setback" under To learn and no "To reflect" heading; "a routine of your own" removed (▢ carries it);
  "Work it out as you go" held until its For each form exists, since copying the earlier form would
  keep the name; "Test a guess" held because it contains a wait step and DESIGN.md says nothing makes a
  new one; the first method renamed verb-first ("Set a cue to start", was "An if-then plan").
- **House-style rules added from the panel:** a `gives` name says the product ({trust}, not {plan});
  no step's point depends on knowing the research.
- **Refused:** evidence grades or descriptions on screen (B, D): minimalism. A tally of methods used
  (B): "Nothing is counted against you". Keeping the reflective writing (D): the owner's line against
  capture.
- **Against the owner's notes (P0):** the panel's strongest advice on order (B) is the owner's own
  signal from use: the first need met in real use was a for each calling a routine. See Slices.

## Slices
The first draft shipped the library after P-97 with the nine methods that need no for each. The panel
and audit agree that this is the library's weaker half: the best-supported methods all need for each,
and a method that cannot be called is not yet a library. So the library now waits for P-98.

1. **The library** `[feature]` `[ux]` M. After P-97 and P-98. My routines gains the Library view; the
   two-line rows; the preview sheet; Copy with Undo; "Open yours". The library ships in the app in the
   export format and is read through the import check. Content: the fourteen small methods of the
   discovery's first shelf, less "Test a guess". *Done when:* a method can be found, previewed, copied,
   undone, started by itself and called from another routine; a copied routine survives reload, export
   and import and is unchanged by an app update; a name already in Yours offers "Open yours"; at 390 px
   and 200 % text nothing is cut, every target is at least 48 px, the control is a tab list and each row
   has its full spoken name; a test fails the build if any library routine does not pass the import
   check or breaks the house style.
2. **Adding from where you write** `[feature]` `[ux]` M. After slice 1. "@" and Add's "a routine" list
   Yours and Library under headings; a library row opens the sheet with **Copy and add**; one Undo
   removes both. *Done when:* typing "@" and part of a library method's name offers it; nothing is
   copied by Return; a giving field on the runner lists Yours only.
3. **Templates** `[feature]` `[data]` M (Full tier). After P-99. Learn ▢, Find out ▢, Make ▢, Make a
   decision, and "Work it out as you go". **Copy…** names the copy and brings what it calls, by name.
   *Done when:* "Learn ▢" copied twice gives two routines with separate kept lists that call the same
   methods; a name in use is refused in the sheet and nothing is overwritten.
4. **House style, as a test and a page** `[docs]` S, with slice 1. Verb-first names that read after
   "Plan" and "Start"; one job each; a plural list and its singular item; a `gives` name that says the
   product; no minutes or counts in step words; no kept list and no wait step in a method; steps are
   statements of work whose point does not depend on knowing the research. The citations for each
   library routine sit beside it in the repository.

Before any of it: the owner can type three methods in by hand today (Set a cue to start, Take the
outside view, Check a source), which tests whether the methods are worth having at no cost.

## Data and risk
- **Stored data:** copying creates routines of kinds that already exist, through the existing path.
  No new stored field in slices 1–2. Slice 3 uses P-98's kept lists and calls.
- **The library file** is an asset of the app, not the person's data: never in export, never touched
  by import, replaced whole by an update.
- **Unverified research.** Discovery could not open a single source. Nothing on screen makes a claim,
  so the risk sits in the repository's notes; a person should read the citations before any is repeated.
- **Practitioner conventions** (Teach it plainly, Make ▢, the arrangement of Make a decision) cannot be
  labelled on screen; they are labelled in the repository.
- **A library that reads as homework.** Mitigation: nothing is pre-copied, home never mentions it, My
  routines opens on Yours, and nothing marks what has not been copied.
- **Copied and never changed.** A person who copies and never edits is using a checklist, which
  STRATEGY.md names as a sign the bet is wrong. Worth watching in the owner's own use.

## Alternatives considered
- **Do nothing; write the methods by hand from the discovery files.** Recommended as a first step
  regardless.
- **The first draft's order** (a small library straight after P-97). Faster to see, and its weaker half.
- **A file to import.** Import replaces everything on the device, so it cannot add a library.
- **Reference, not copy:** the owner decided copies are owned.
- **A separate Library screen with its own door.** Refused by "one navigation scheme".
- **Library rows while typing a step.** Reads as a correction of the person's own words and risks an
  accidental copy; the owner's own reach was "@".
- **Descriptions and evidence on screen.** Refused by minimalism.

## Questions for the owner
1. **The words:** "Library" and "Copy" (proposed), or other words?
2. **Order:** the library after P-98, whole (proposed), or a small one straight after P-97?
3. **Practitioner conventions** in the library, labelled only in the repository? Proposed: yes.
4. **Wait steps in library routines** ("Test a guess" has one; DESIGN.md says nothing makes a new
   one). Proposed: none, so it stays out.

## Decision requested
**D-24:** Build B-17, slice 1 after P-98? **Go** / **Go, but change …** / **Not now** / **No**.
