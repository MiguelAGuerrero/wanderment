# B-09 — The home: a live map above, the prompt below

**Status:** proposed · **Decision:** D-16 · **Theme:** Seeing flow / Capture anywhere / Warm return · **Date:** 2026-11-24

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

## UI audit
(Filled in after the audit runs: `.polish/product/ui-audit-B-09.md`.)

## Persona panel
(Filled in after the panel runs: `.polish/product/panel-B-09-{1,2,3}.md`.)

## Slices (proposed)
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
