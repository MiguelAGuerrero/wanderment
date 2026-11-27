# B-18 — Places: where a routine's work lives

**Status:** go (owner, 2026-11-27: "Let's build the references, because I think that's a simple feature
that would make sense") · **Decision:** D-25 (to be added on main) · **Theme:** The run; Trust ·
**Date:** 2026-11-27 · **Tier:** Full (a stored field) · **Needs:** nothing unbuilt

## The problem, in the owner's terms
"There's a lot of friction on trying to sync up what I'm doing with apps that I rely on to capture my
thoughts and or [store] my results, so the fact that I can't really reference that puts a little bit of
strain to remember where I put that … it would be nice and easy to … click and pull up where I left
off without having to try to remember exactly the specifics of where I put the Notion document or that
text file … or at least a place to park that … as like some mediator: hey … the product design is
hosted here. And I think this is more so a point of remembering that I originally had a document, cause
I noticed in the past that when I start projects, I may have a Notion page for it and I don't remember
that I did … I don't want the app to instrument tooling to do your work. It's supposed to be a context
management [app]." (2026-11-27.) The same on 2026-11-26: a reference to a Notion document "to ease the
burden of remembering where and how I was working".

Two problems are in those words, and the owner ranks the first higher: **forgetting the thing exists**,
and **not getting to it quickly**. The first is solved by where a place is seen; the second by a tap.

**Where the evidence is thin.** How many places a routine has, and whether "where I left off" is a page
or a spot inside one, are guesses. Whether a link tapped in the installed iPhone web app lands in the
other app or in a browser sheet has not been tested.

## Evidence
- Owner notes: 2026-11-26 and 2026-11-27, above. The owner's two stated losses when hopping: "the next
  concrete action" and "what I'd decided or made"; what was made lives in other apps.
- Discovery: [`../discovery/2026-11-27-outside-references.md`](../discovery/2026-11-27-outside-references.md).
  Other tools keep references in one of two homes: a short section on the project (Linear, Workona) or
  addresses inside the person's own text made tappable (Things, OmniFocus). None found checks that a
  link still works. All of that is unverified; Expo's documentation was opened.
- The app today: nothing opens an outside link, detects an address or reads the clipboard. A routine
  stores its name, steps and repeat settings (`Seq` in `src/domain/run.ts`).

## Decided by the owner (2026-11-27)
- A place **belongs to the routine itself**: standing, kept between runs.
- **All four kinds** count: web links, files on a device, a place inside another app, physical places.
- **Depth: a named link that opens.** Pasted and named by the person. Nothing is read from or written
  to the other app. No accounts, no server, nothing fetched.
- **The word is "Places".**
- **Seen in three spots:** one door on the home tile, the names under Plan's heading, and the list in
  the runner's pull-up panel. Not on the runner's face.
- **Addresses the person has typed** in a step, a value or the pause note get an "Open" row, **in the
  first slice**.

## Proposed experience
`[Button]` is a button, `[[Button]]` the one filled button.

### Journey 1 — Parking a place (Plan)
The routine's ··· menu gains **Places…**. It opens a sheet:
```
Places
  Product design         notion.so                         ···
  Reference photos       Pinterest board "hands"           ···
  Sketchbook             left shelf, the grey one          ···
  + Add a place
  Close
```
Adding one is two fields in place: **Name** and **Where**. Where takes a pasted address or plain words.
A row's ··· has Change, Move up, Move down, Remove. Every change has an Undo, as Plan edits do.
- A place whose Where is an address shows the address's host ("notion.so"), never the whole address.
- A place whose Where is words shows the words. It opens nothing, and that is a full citizen: two of
  the four kinds are words on every platform.

### Journey 2 — Seeing them without looking (Plan and home)
Under Plan's heading, the names in a line: `Product design · Reference photos · Sketchbook`. Each is a
target: an address opens; words open the Places sheet at that row.
On the home tile, one door, beside the name, drawn with a mark and spoken "Places for <routine>". It
opens the same sheet, read-only except for opening. The tile never shows a row of links, and a routine
with no places has no door.

### Journey 3 — Getting there (the runner's panel)
The pull-up panel lists the routine's places under what it already holds. Tapping one with an address
opens it in the other app or the browser; the run stays exactly where it is.
```
  then: Rank your drawings
  Places
    Product design         notion.so
    Reference photos       Pinterest board "hands"
```
Inside a routine called as a step, the panel shows the places of the routine the run began in, then
those of the routine you are in, if it has any.

### Journey 4 — An address you typed
Where a step's words, a value or the pause note holds an address, the panel (and the value sheet, for
a value) gains a row **Open <host>**. The words themselves are not turned into a link: on the runner
they sit inside the note, which keeps its own tap.

### Edges
- **What can be opened:** only `http://` and `https://` addresses, in the first slice. Anything else,
  including `javascript:`, `data:`, `file:` and other apps' own schemes, is shown as words and opens
  nothing. This is a safety rule and holds for text that arrives by import.
- **Opening** hands the address to the system and asks nothing back. The app cannot know whether the
  other app is installed or whether the page still exists, and does not try.
- **Empty:** no places, nothing new anywhere.
- **Many:** the sheet scrolls; Plan's line wraps; nothing is counted.
- **Screen reader:** "Open Product design, notion.so" for an address; "Sketchbook, left shelf, the grey
  one" for words; the tile's door says the routine's name.
- **Large text:** rows wrap to two lines; targets at least 48 px.

## Fit with the product
- **"Values belong to the run, never the routine":** not touched. A place is not a value; it sits with
  the routine's name and (P-97) tags.
- **Minimalism:** one word (Places), one mark, no explanatory text, no previews, no fetched titles.
- **"The runner is the step and nothing else":** kept; places are in the panel.
- **"Rows and tiles carry only actions about themselves":** the tile's door is about that routine.
- **"The data stays on the device":** kept. Places travel in export and import like the rest.
- **The owner's line against capture and against doing the work:** kept. A place is a pointer; nothing
  of the other app's content is held.
- **STRATEGY.md:** "The run" (coming back with the context) and "Trust".
- **Not doing:** reading or writing the other app; fetched titles, icons or previews; checking that a
  link works; knowing whether an app is installed; a typed link syntax; receiving from the share sheet
  (not available to a web app on iOS); pointers to local files as files (a web app cannot hold one).

## Persona panel
Not run. The owner asked for this as a simple feature and it stays inside the app's shape (no new
model concept for running, no new screen). The owner may ask for one.

## UI audit of the design
To be run on these written screens before the build, as the pipeline requires. Points to check: a
third control on a tile that already has Start or Resume and Plan; the mark chosen for Places (it must
not be one that already means something); the line under Plan's heading at 200 % text.

## Slices
1. **Places on the routine, and Open for typed addresses** `[feature]` `[data]` `[ux]` M (Full tier).
   A routine stores an ordered list of places (name, where). Places… in Plan's routine menu; the line
   under Plan's heading; the list in the pull-up panel; the tile's door; "Open <host>" rows for
   addresses in a step's words, a value or the pause note. *Done when:* a place can be added, changed,
   reordered and removed, each with Undo; an `http(s)` place opens and the run stays put; any other
   Where shows as words and opens nothing, including when it arrives by import; places survive reload,
   export and import and appear in the import preview; a backup from before this build imports
   unchanged; a routine with none shows nothing new; at 390 px and 200 % text nothing is cut and every
   target is at least 48 px; **on the owner's installed iPhone app** a Notion link and a Google Docs
   link are each tapped once and what happens (the other app, or a browser sheet) is written down.
2. **Other apps' own addresses** `[feature]` S. Only if slice 1's phone check shows a need: a short,
   fixed list of schemes allowed to open (for example `obsidian://`), tested on the phone.
3. **With a native build** (D-3, not started): opening in the other app directly, and receiving a link
   from the share sheet.

## Data and risk
- **A new stored field** on a routine (`places`), carried by the journal, export, import and its check,
  the import preview and the golden fixtures. Old data has none and is read as none. Nothing is
  converted.
- **Safety:** an address is opened only if it parses as `http:` or `https:`. Import is foreign text;
  without this rule a crafted backup could run script inside the app on the web.
- **Backups hold addresses,** and some links grant access to whoever holds them. Export already writes
  everything; this adds a new kind of sensitive thing to it.
- **Rot:** a moved page or renamed file leaves a place that opens nothing useful. The person fixes it
  in Places…; the app never marks it.
- **A reusable method with places** makes little sense; nothing forbids it. Copy (P-98) copies places.
- **The tile gets busier.** One door, only when the routine has places.

## Alternatives considered
- **Nothing in the app: the first step says where the work is, in words.** Works today, and remains
  the answer for files and physical places wherever a tap is impossible.
- **Only the "Open" row for typed addresses.** No stored field, but it does not answer "I forget it
  exists".
- **A place as a kept list item (B-16).** Shows it in the step that needs it, but bends a construct
  meant for a for each and waits on P-98.
- **A place per run, as a value.** Not what the owner chose; the "Open" row covers it.

## Decision
**D-25:** answered 2026-11-27 by the owner: **go**. Word: Places. Seen on the tile (one door), in Plan
and in the panel. Typed addresses get an Open row in the first slice.
