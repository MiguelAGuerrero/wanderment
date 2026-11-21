# B-03 — The log box also finds

**Status:** proposed · **Decision:** D-6 · **Theme:** Seeing flow / Warm return · **Date:** 2026-11-21

## The problem, in the owner's terms
> "Since the graph is gonna be first, let the log field be a mini search engine that can query the
> graph to show what action exists currently, or even an intentional value, as a way of searching
> through and possibly finding where you want [to be], what step you wanna be [on] quickly, or what
> intentional value you want [to] survey." — owner, 2026-11-21 ([owner-notes](../owner-notes.md))

With the live graph moving to the top of Home (P-15), and whys and chains of steps arriving (P-16,
P-19), Home will hold more than one screen shows. Today you find something by scrolling the cards,
opening the Graph tab, or going to Search, which is a separate screen. The box you're already typing
in knows nothing about what exists, apart from `@`.

Owner's answers (clarifying questions, same day):
- **Trigger:** quiet matches as you type. There's no mode, and Return still logs exactly what you
  typed.
- **On tap:** focus it in the graph.
- **Scope:** threads and whys, staged steps, past activities.

## Evidence
- Owner notes: the entry above.
- The app today:
  - `@` opens up to 3 thread suggestions at the caret (`suggestThreads`, `Composer.tsx`).
  - A dashed "doing X?" chip already appears when the typed text matches a thread (`suggestDoing`).
  - Search (`src/app/search.tsx`) matches activities, notes and thread names, with results grouped.
  - The graph tab focuses a thread on tap.
- Discovery (from what's already known; no new research run): launcher-style "type to find"
  (Spotlight, Raycast, Things Quick Find) and Obsidian's quick switcher, which shows a quiet list and
  ignores it on Return. Day One's and Reflect's capture boxes do **not** search; they keep capture
  pure. That's the tension here.

## Proposed experience
1. **You type as always.** After 2+ characters, and only when there's no `@` at the caret, a single
   quiet row of up to **3 match chips** appears *above* the box:
   - `◇ be a better drawer` (a why)
   - `○ draw` (a thread)
   - `↳ 10 quick head sketches` (a staged step)
   - `· "sketched hands" · 3 days ago` (a past activity)

   The chips don't move the box, take focus or change what Return does.
2. **Ignore them.** Keep typing and they update. Press Return and the line logs exactly as typed;
   the chips clear with it. Nothing typed is ever replaced.
3. **Tap one: it's focused in the graph.** The live graph at the top of Home centres on the
   thread or why, highlights it and its neighbours (what feeds it, what it's toward), and the cards
   below scroll to it. Your typed text stays in the box, untouched.
   - A staged step focuses its thread, with the step's crumb highlighted ("Log this" is one tap
     away, as today).
   - A past activity focuses its thread(s). One-offs open Search with the text.
4. **Leave focus.** Tap empty graph space, press Esc, or clear the box to return to the overview.
5. **More than 3 matches:** a final "All results →" chip opens Search with the text.

**Ranking:** whys and threads by name first (exact, then prefix, then word-start), then staged
steps, then past activities by recency. One chip per thread at most.

**States:**
- **Empty app:** no chips ever. There's nothing to find.
- **Big data:** matching is in memory and capped, like `@` today (it must stay under one frame for
  `bigBlob`).
- **Offline:** everything is local, so it works the same.
- **Screen reader:** typing announces nothing. The row is a labelled group ("3 matches in your
  graph") that you reach after the box, and a tap announces "Showing draw in the graph."
- **`@` at the caret:** the `@` thread picker wins, and the match row is hidden.
- **The "doing X?" chip:** when a match is the same thread, the two merge into one row so the same
  name doesn't appear twice.

## Fit with the product
- **DESIGN.md, *capture is sacred*.** Kept: Return logs exactly as typed, matches never take focus or
  replace text, and they appear only after 2 characters. Risk: visual noise while typing. That's the
  panel's main question.
- **DESIGN.md, *no notifications/nudges*.** Matches are a reflection of what you typed, not a prompt.
- **STRATEGY.md, *know the why*.** Finding a why from the box keeps it in view without a screen.
- **Not doing:**
  - a command palette ("/" commands);
  - fuzzy natural-language queries;
  - search over notes inside the box (Search covers them);
  - letting a match auto-attach "to" or "doing" (D-6 option, not default).

## Persona panel
_Pending, run before asking._

## Slices
1. **Matches in memory** (S, `[feature]`): domain `findInGraph(data, text)` → ranked whys, threads,
   steps and activities, capped, with tests (ranking, dedupe, `@` excluded, `bigBlob` timing).
2. **The quiet row and focus** (M, `[feature]` `[a11y]`): chips above the box; tapping focuses the
   live graph (needs P-15's focus API) and scrolls the cards; Esc and empty-tap leave focus; "All
   results →". *Done when:* e2e for type → chip → focus → Return still logs as typed; `@` hides the
   row; the "doing X?" merge; axe; 390 px.

The slices come after P-15, since "focus in the graph" needs the live graph on Home.

## Data and risk
No stored data and no format change. The risk is UX: chips flickering while you type, the eye being
pulled off your sentence, and a third row of chips (match, `@`, doing) crowding a small screen.

## Alternatives considered
- A prefix such as "/" or "?" to search. It's explicit, but one more thing to learn. The owner chose
  quiet matches.
- A magnifier toggle.
- Leave finding to the Graph and Search tabs (do nothing).
- Smaller: threads and whys only, with no steps or activities.

## Decision requested
**Build "the log box also finds" after P-15?** Go · Go, but change … · Not now.
