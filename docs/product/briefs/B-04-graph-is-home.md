# B-04 — The graph is Home

**Status:** building · **Decision:** D-7 — answered by the owner in conversation, 2026-11-22
(→ P-34, P-35, P-36, P-37) · **Theme:** Seeing flow / Know the why · **Date:** 2026-11-22

## The problem, in the owner's terms
> "I'm not quite satisfied with the idea of having to log a while in order to access the graph view.
> The graph view should be first and foremost to see at face value your intentions, values, and what
> you're doing at a high level, with a way to quickly initiate or quickly log any pre-planned or the
> next step from any given wander … or log it fresh, a new activity." — owner, 2026-11-22
> ([owner-notes](../owner-notes.md); screenshot `docs/product/evidence/2026-11-22-graph-tab-empty.png`)

Today:
- The Graph tab waits until there's "enough" data ("This fills in once you've logged for a while").
- Home's compact graph (P-15) appears only once there are threads.
- Nodes only open pages.

The owner's own data (activities, no threads yet) shows **no graph anywhere**.

## Owner's answers (2026-11-22)
1. **The graph IS Home.** Opening the app shows a full-screen graph of whys, wanders and recent logs,
   with the log box at the bottom. The list becomes its own tab. The separate Graph tab goes; its
   deep exploration stays reachable from Home.
2. **First run is a quick 1-2-3** that guides you to understand the app:
   - ① declare an intention or value ("what's it all for?");
   - ② plan the next step toward it;
   - ③ see it in the graph.

   It's simple and skippable.
3. **Tapping a node gives quick actions at the log box:**
   - the node is selected and the log box takes its context;
   - "Log next step: …" in one tap, or type something fresh toward it;
   - "+ next step";
   - "Open".

   You never leave the graph.
4. **Threads are called "wanders"** across the app. Only the words change; the data model is
   unchanged.

## Proposed experience
- **Home = the graph.**
  - The declared whys sit on top, with the wanders feeding them and recent logs as dots (P-15's
    model, given the whole screen).
  - **There's no threshold:** with no wanders, your recent logs show as dots on their own, plus a
    gentle "+ What's it all for?" node.
  - The log box is at the bottom as always. Capture is never slower: Return logs as typed.
- **Tap a node** (a why, a wander, a dot's wander):
  - It's highlighted, and a quiet context row above the log box reads "Toward *draw*". If the wander
    has a staged step, it shows **↳ Log next step: sketch a hand** (one tap logs it, as "Log this"
    does today).
  - Typing now logs toward that wander (a visible, removable "to" chip, like `@`).
  - "+ next step" sets one inline, and "Open" goes to the wander's page.
  - Tapping empty canvas, Esc, or × clears the selection.
  - Steps in a wander's subtree (B-02 chains, when built) are reachable the same way.
- **First run (1-2-3):** three short screens over the empty graph.
  - ① "What's it all for?" takes one field, with examples, and "Skip".
  - ② "What's one next step toward it?" takes one field, and "Skip".
  - ③ The graph appears with your why and its staged step, and the log box is ready: "Log it when
    you do it."

  Every step is skippable; nothing is required.
- **Threads tab → "Wanders":** today's Home list (cards, crumbs, headers), unchanged except the
  words.
- **Deep exploration** (the old Graph tab's single-centre view) opens from "Explore" on Home.

## Fit with the product
- **DESIGN.md:**
  - Home changes from a list to the graph. The Interaction line was already moving graph-first
    (D-4); this completes it.
  - Capture is sacred: the log box stays put, and node selection only *adds* a visible, removable
    chip (nothing is attached without a tap).
  - No counts.
- **STRATEGY.md:** "know the why" in view first; "leave the how open" (one next step, never a plan).
- **Wording:** "thread" becomes "wander" in UI copy, accessible names and docs. Code and stored data
  keep `thread`.

## Persona panel
Simulated perspectives, run after the owner's answers (per D2's "answer first, panel right after"),
with refinements feeding slices 2–4. _Pending._

## Slices (in order)
1. **P-34 The graph is Home** `[feature]` M:
   - a full-screen graph on Home, including with no wanders (dots only, plus "+ What's it all for?");
   - the list moves to a "Wanders" tab; the Graph tab is removed, with its view reachable as
     "Explore";
   - existing e2e flows updated to the new navigation.
2. **P-35 Act from a node** `[feature]` `[capture]` M: selection → a context row at the log box; one
   tap logs the staged next step; typing logs toward it (a visible "to" chip); "+ next step"; Open;
   clearing.
3. **P-36 First run: 1-2-3** `[feature]` S/M: replaces P-18; declare a why → stage its next step →
   see it in the graph; every step skippable.
4. **P-37 Threads are "wanders"** `[ux]` S: the copy and accessible names across the app, docs and
   tests.

## Data and risk
No stored-format change: it uses `declaredAt` (P-14) and `next`. The risk is the large e2e churn
(navigation and wording), which is mechanical.
