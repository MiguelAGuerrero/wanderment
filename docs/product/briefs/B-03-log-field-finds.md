# B-03 — The log box also finds

**Status:** building · **Decision:** D-6 — go with the panel's refinements; one-offs via "All results →"; a kept line counts as the step, 2026-11-21 (→ P-24, P-25, P-26) · **Theme:** Seeing flow / Warm return · **Date:** 2026-11-21

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
_Panel refinements are folded in (marked ▸); see Persona panel below._

1. **You type as always.** Matching starts after 2+ characters, and only when there's no `@` at the
   caret. ▸ It matches the **whole line, with every word required** (like Search). Short queries
   find things, and once the sentence outgrows every name the row goes quiet. ▸ It updates after a
   short pause in typing, not on every keystroke, in a stable order, with no animation. Then a
   single quiet row of up to **3 match chips** appears *above* the box, ▸ in words, not symbols:
   - `to be a better drawer` (a why, in the "TO …" voice of Home)
   - `draw` (a thread)
   - `↳ 10 quick head sketches · draw` (a staged step, shown *instead of* its thread)
   - `“sketched hands” · draw` (a past activity in a thread, ▸ shown with where it went and no
     date)

   The chips don't move the box, take focus or change what Return does. ▸ There is never an empty
   "no matches" message.
2. **Ignore them.** Keep typing and they update. Press Return and the line logs exactly as typed;
   the chips clear with it. Nothing typed is ever replaced.
3. **Tap one: it's focused in the graph.** The live graph at the top of Home centres on the thread
   or why and highlights its neighbours (what feeds it, what it's toward). ▸ That is the only thing
   that moves: the graph is brought into view, and the cards don't scroll. It's instant under Reduce
   Motion. Your typed text, caret and keyboard stay as they were.
   - ▸ A visible caption under the graph says it in names, never numbers: "Showing *draw* · toward be
     a better drawer · fed by sketching". It's spoken once the same way. Next to it is a 44 pt
     **Show all** button.
   - A staged step focuses its thread and gives its crumb ▸ a static tint (no glow).
4. **Leave focus.** ▸ Use **Show all**, press Return (logging), or press Esc on web (only when the `@`
   list is closed). Clearing the box is never the only way out. ▸ After a log, focus stays until the
   new link has landed, then eases back.
5. **More than 3 matches:** a final "All results →" chip opens Search with the text. ▸ The draft is
   still there when you come back.

**Ranking** (▸ refined):
- Whys and threads by name first: exact, then prefix, then word-start.
- Then staged steps, ▸ only when a meaningful word matches, never to fill a slot.
- Then past activities in a thread, by recency (▸ shown without a date).
- One chip per thread at most; ▸ a thread's staged step counts as that chip and wins over it.

**States:**
- **Empty app:** no chips ever. There's nothing to find.
- **Big data:** matching is in memory and capped, like `@` today, and must stay under one frame for
  `bigBlob`.
- **Offline:** everything is local, so it works the same.
- **▸ Home only.** The row doesn't appear in the thread page's or other screens' log box.
- **Screen reader:**
  - Typing announces nothing. The row is a labelled group ("Matches in your graph") reached after the
    box.
  - ▸ Each chip's accessible name starts with its visible text, then its kind ("draw, thread"; "10
    quick head sketches, next step in draw").
  - ▸ The box has a static hint that matches appear above it.
  - A tap speaks the caption, and focus stays on the chip.
- **▸ At the largest text sizes:** one match plus "All results →".
- **`@` at the caret:** the `@` thread picker wins, and the match row is hidden.
- **▸ The "doing X?" chip is not merged.** When it's showing, that thread is left out of the match
  row, so the dashed chip keeps its one meaning (attach as doing).

**▸ "Log this" never replaces what you typed.** This is a fix the panel found in today's crumb
(`loadNext` replaces the whole draft). When the box already has text, "Log this" keeps it and sets
the thread as a visible, removable **doing** chip. With an empty box it works as today.

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
_Simulated perspectives from `docs/product/PERSONAS.md`, run 2026-11-21 before asking. A thinking
tool, not user research. Full reports: `.polish/product/panel-B-03-{1,2,3}.md` (local)._

| Persona | Reaction | Keeps using it | What it hinges on |
|---|---|---|---|
| A — Impulsive Dabbler | fine (uneasy if it flickers) | yes, if calm | A calm, stable row; finding a scattered one-off again after months |
| B — Intentional Builder | delighted | yes, the heaviest user | Tap a why and see what feeds it; finding should lead to logging without losing words |
| C — Pressure-Sensitive Returner | fine, one sharp edge | yes, if no dates | One word to get back in; no "6 weeks ago" in the capture line |
| D — Reflective Meaning-Seeker | fine (delighted surveying) | yes, if quiet while writing | Whole-line matching; their own words never replaced |
| E — Skeptical Minimalist | uneasy | maybe, leaning yes | Return untouched; words not symbols; no merge with "doing X?" |
| F — Assistive-Tech User | uneasy, fixable | maybe | An exit that keeps the text; a focus you can hear |

**Trade-offs.**
- It favours graph-first, reflective surveyors (P0, D), builders who navigate by name (B), and
  returners at the moment they come back (C).
- It costs fast, few-thread typists (E) a small price on every log. It costs distractible attention
  while logging (A), which a calm row decides. As first written, it cost assistive-tech users (F)
  most: the only exit was deleting the sentence.
- "Return logs as typed" protects A, C and E completely. The cost lands on search-minded people
  (B), who will sometimes log "apparel" by accident: Undo plus a plain toast is the mitigation.

**Strong, lean on it.**
- No mode and nothing to learn: everyone named "Return untouched" as the hinge.
- Tapping a why to see what feeds it, in names, answers "is this getting me there?" without numbers
  (B, D).
- The box hands back your own past words, which is a warm return (A, C, D).
- Looking never attaches (C, D, E, F).

**Refinements folded in** (▸ in the proposal):
1. **Whole-line matching** with every word required, a short settle, a stable order and no
   animation (A, D, E, F).
2. **No dates on chips.** A past activity shows where it went instead (C; D's "neutral recency" is
   given up).
3. **Words, not symbols.** Accessible names start with the visible text, then the kind (B, E, F).
4. **The step shows over its thread** and counts as that thread's one chip, only on a meaningful
   word match (A, B, C).
5. **No merge with "doing X?"**: that thread is left out of the row (A, E, D, F).
6. **A visible caption plus "Show all"**, spoken in names; Return also ends focus; Esc only when `@`
   is closed (E, F, D).
7. **One screen move per tap** (the graph only), instant under Reduce Motion (C, D, F).
8. **"Log this" never replaces typed text.** It sets a visible doing chip (B, C, D, F). This is a bug
   in today's crumb, so it can ship on its own as polish.
9. **Home only**; one match at the largest text; no empty-results message; the draft survives "All
   results →" (C, E, F, A).
10. **Focus stays until the new link lands** after a log (B).

**Offered to the owner as options.**
- **Past activities: thread activities only in the row**, with one-offs reached through "All results
  →" (A, F; recommended). Otherwise a one-off chip leaves Home mid-sentence while the chips beside it
  stay, so the same kind of button goes to different places.
- **When "Log this" keeps your text, does your line count as that step** (`fromNextOf`, clearing the
  staged step)? C and D say yes, since it clears stale steps; E is fine only if a visible chip says
  so.
- **An off switch for the row** (E). DESIGN.md doesn't refuse it, but it cuts against "no mode" and
  D-5's "no setting for now". Not recommended.

**Refused, with the rule.**
- Counts, trends or progress in the focused view (B): never-list.
- Attaching a match automatically on Return (B): nothing is attached without a tap.
- A "welcome back" greeting (C): no nudges.
- A sound or haptic when matches appear (F): nudge-like.
- Searching notes in the row (D): out of scope; Search covers it.

**Against the owner's notes (P0).** Everything the owner chose stands: quiet matches as you type,
Return logs as typed, a tap focuses the graph, and the scope covers threads, whys, steps and past
activities. The panel tightens *how* (whole-line, calm, in words, a visible exit). It suggests only
one narrowing of the owner's scope, which is offered, not folded: one-off activities through "All
results →".

## Slices
1. **Matches in memory** (S, `[feature]`): domain `findInGraph(data, text)` returns ranked whys,
   threads, steps and activities. It's whole-line with every word required, one chip per thread
   (the step wins), and capped. Tests cover ranking, dedupe, the "doing X?" thread left out, and
   `bigBlob` timing.
0. **"Log this" keeps what you typed** (S, `[ux]`, can ship now as polish). With text in the box,
   the crumb's "Log this" sets a visible doing chip instead of replacing the draft. *Done when:* store
   test plus e2e, both with and without text.
2. **The quiet row and focus** (M, `[feature]` `[a11y]`), on Home only:
   - chips above the box (refinements 1–5, 9);
   - tapping focuses the live graph (needs P-15's focus API) with the caption and "Show all"
     (refinements 6, 7, 10);
   - "All results →" keeps the draft.

   *Done when:* e2e for type → chip → focus → caption → Show all, and for Return still logging as
   typed; `@` hides the row; the "doing X?" thread is left out; there's no empty message;
   accessible names; Reduce Motion; axe; 390 px and 200 % text.

Slices 1–2 come after P-15, since "focus in the graph" needs the live graph on Home.

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
**Build "the log box also finds" (with the panel's refinements) after P-15, and "Log this keeps
what you typed" now?** Go · Go, but change … · Not now. Plus the two options above: one-offs through
"All results →" (recommended), and whether the kept line counts as the step.
