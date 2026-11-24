# B-09 — The home: a live map above, the prompt below

**Status:** building · **Decision:** D-16 → go, 2026-11-24 (→ P-79 to P-83) · **Theme:** Seeing flow / Capture anywhere / Warm return · **Date:** 2026-11-24

Mockups (local): `.polish/product/b09-shots/` — `0-today.png` (the owner's screenshot), `1-rest.png`,
`2-notsure.png`, `3-attached.png`, `4-swipe-up.png`.

## The problem, in the owner's terms
owner-notes 2026-11-24, "The home's layout drifted; attaching does nothing; roll Map into the home":
- "The I'm not sure button is … misplaced away from the dialogue. And the map button is just
  situated awkwardly … may have been better as a swipe action, to swipe up or down to see what's
  available."
- "the attaching or resolving an action to any of other nodes doesn't really do anything … it never
  updates the map at all." *Reproduced:* the data is right (a cold "feel productive" turns warm on
  Map after Toward…), but the home shows only a toast, the new star is an unlabelled dot, and Map is a
  separate screen — so nothing the owner sees changes.
- "the map seems like a side feature and is being neglected. We should roll that into the homepage
  as a preview of recency. It will supersede the graph view we had before, but … it just shows a
  select few at random. Almost like a live feed. It's not highlighting anything particular. It's just
  showing what's been done."
- "move the prompt … lower to where the bottom of the screen is, almost like a messaging sort of
  thing, so that the map has a resting area. And when you're not sure, it lights up the map to be
  more descriptive."
- And: UI changes go through a UI best-practice audit first, "because this is a drift".

## Proposed experience
1. **At rest** (`1-rest`): the top of the home is the map's resting area — a **live feed**: a few
   recent lines (what's been done), each a small light with its words and when, placed loosely in
   the sky, a gentle random few that change from visit to visit; nothing highlighted, no counts.
   The night sky, hills and lantern stay behind it.
2. **The composer at the bottom** (like messaging): a grabber, the question as a small heading
   ("Where are we wandering today?"), **I'm not sure** as a chip right above the field, the field and
   a send button — all in thumb reach, keyboard-aware. Return still saves as typed (B-08's rise and
   done chip carry over into it).
3. **I'm not sure** (`2-notsure`): the map **lights up** in place — your whys and wanders appear as
   named nodes, the feed's lines connect to the nodes they went toward, warmth shows recency. Tapping a
   node opens its session (B-08's camera tilt / trail). Tapping the chip again (or Esc) dims it back.
4. **Attaching shows its result where you're looking** (`3-attached`): after Toward… (or First step,
   or attaching from a suggestion), the line travels into its node on the map, which warms; the toast
   keeps Undo.
5. **Swipe up on the composer** (`4-swipe-up`) for what's available: the sheet with Wanders and
   Activities (today's sheet, in the night palette). Swipe down closes it. The grabber is visible and
   the sheet also opens by tapping it (a gesture is never the only way).
6. **The graph Map is superseded**: the "Map" link and route go away (the live map is the home).
   Explore, search, settings and a wander's page stay reachable from the sheet.

## Fit with the product
- **DESIGN.md changes (with go):** "The graph is Home"/Map → the live map on the home (a recency
  preview, not everything); Home's composer at the bottom; the sheet opened from the composer; Map
  route retired. Heat stays "the warmth of the most recent activity, never a sum".
- **STRATEGY.md:** advances Seeing flow (the map is where you are, not a side screen) and Capture
  anywhere (thumb-reach composer). No tension.
- **Still refused:** counts, streaks, highlighting ("not highlighting anything particular").
- **What changes from B-07/B-08/D-15:** the question moves from a billboard to the composer's heading;
  "faint unlabelled stars at rest" becomes "a few labelled recent lines at rest"; the separate Map
  goes. The night sky, the rise, the done chip, sessions and trails stay.

## UI audit (before any build; owner's rule, 2026-11-24)
Full report (local): `.polish/product/ui-audit-B-09.md` — Apple HIG, Material 3, WCAG 2.2, cited
from knowledge (no outside fetch). **Today's drift, named:** "I'm not sure" ~250 px from its field (a
field's helper detached from it); "Map" an unanchored floating link with a small target; the field
mid-screen with no send control; stars and links drawn through the heading; the placeholder under
contrast. **Fold-ins — the build must meet all of these:**
1. Mock and build the composer's B-08 states too (suggestions above the field, the done chip, the
   rise with Done it / First step / Toward… / Undo); the composer may grow — the map yields, never
   the other way.
2. Keyboard up or large text: the heading collapses; at the largest text the map is a plain list.
3. Targets ≥ 44 pt: the chip, the grabber (a labelled button with an expanded state), nodes, lines.
4. Age is in words (and glow), never text faded below 4.5:1.
5. The feed: positions come from each line's id; drawn once per arrival, never redrawn while on
   screen (WCAG 2.2.2); Reduce Motion stills everything.
6. "I'm not sure" is a toggle: pressed state, a non-colour mark, an accessible name that says what it
   does ("I'm not sure — light up the map"); it stays lit until turned off.
7. Lighting the map never moves or replaces the feed's lines; it adds nodes and links; nodes are all
   one size (warmth by glow only); links meet 3:1.
8. `/sky` becomes the lit state; `/map` redirects to it; the sheet and the lit state live in the URL so
   Back closes them first.
9. Attaching: the line travels into its node (≤ 600 ms, picture only, never blocks input; under Reduce
   Motion it just appears there) and stays labelled there until the next action; the toast says it in
   words and sits above the composer and the keyboard.
10. The sheet: a visible close; rows for Explore, search, settings and export; the swipe only starts
    on the grabber (never a one-finger swipe over the field).

## Persona panel
_Simulated perspectives from `docs/product/PERSONAS.md`, run by /product before asking. A thinking
tool, not user research._ Reports (local): `.polish/product/panel-B-09-{1,2}.md`.

| Persona | Reaction | What it hinges on |
|---|---|---|
| A · Dabbler | delighted · yes | the grabber not catching sloppy thumbs |
| B · Builder | uneasy · maybe → yes | the lit map complete for the shown whys and staying lit; where What's next, focus and scope go |
| C · Returner | uneasy · maybe | what the home shows after a month away (a gap shown by dated, fading lines) |
| D · Meaning-Seeker | fine → delighted · yes | your words on the sky; tapping a line to see it again with its note |
| E · Minimalist | fine, leaning uneasy · maybe → yes | content that changes on its own; personal lines readable by anyone nearby |
| F · Assistive-Tech | uneasy · maybe | a random set that can't be learned; the toggle and the swipe (see fold-ins 3, 5, 6, 10) |

- **Strong, lean on it:** the bottom composer (thumb reach, familiar); a feed with no highlights or
  counts; one screen fewer; attaching that visibly lands (fixes the owner's report).
- **Trade-offs:** favours open, visual, reflective people (the owner, A, D); costs pressure-sensitive
  returners (C) and privacy- or predictability-first people (E, F) unless refined below.
- **Refinements folded in (fit DESIGN.md):** the audit's fold-ins; lit and settled lines look alike
  in the feed; tapping a feed line opens it (its words, note, and its choices if lit); no chat-bubble
  or "sent" styling; the heading keeps some size at rest.
- **Offered as options (D-16):** how the feed picks (random per day vs per visit vs newest); a
  three-week window with an empty sky beyond; where Map's depth goes (What's next card, focus and
  scope, Explore).
- **Refused:** nudges to pick old interests back up (A), momentum/progress views (B), a summary that
  counts or ranks (D) — DESIGN.md.
- **Against the owner (P0):** every fold-in keeps "a select few at random … not highlighting anything
  … just showing what's been done", "the prompt … at the bottom … like messaging", and "when you're not
  sure, it lights up the map".

## Owner's answers on go (D-16, 2026-11-24)
- The feed: a **random few, drawn once a day**, in fixed places, never changing while you look.
- After time away: **the last three weeks; beyond that a calm sky** (nothing dated shows the gap).
- Map's depth goes **into the lit map and the sheet**: lit nodes open their trail session (What's
  next as today); Explore, search, settings and export are rows in the sheet; focus/scope chains retire.

## Slices
1. **The composer at the bottom + I'm not sure beside it** (M, Light): layout only; the feed area
   shows today's faint stars until slice 2.
2. **The live map at rest** (M, Light): a random few recent lines with words and when; the map
   area replaces the faint unlabelled stars.
3. **I'm not sure lights the map** (M, Light): nodes, links, warmth in place; tap a node → session.
4. **Attaching shows its result** (S, Light): the line travels into its node; the node warms.
5. **Swipe up for the sheet; Map retired** (M, Light): grabber + tap + swipe; DESIGN.md updated;
   specs moved off `/map`.

## Data and risk
No stored data changes. Risk: retiring `/map` breaks old links — keep `/map` as a redirect to the
home with the map lit. The perf item (P-46): the live map draws a few lines, not the whole graph —
lighter than today.

## Decision requested
**D-16:** Go on B-09 — build slices 1–5 in order? **Go** / **Go, but change …** / **Not now**.
