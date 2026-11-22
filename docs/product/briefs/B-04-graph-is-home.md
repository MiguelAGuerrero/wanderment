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
- **The tone of the first run** (owner, 2026-11-22: "something as simple as I just wanna feel
  productive … the next step … might be something mundane like reading a book … not the most
  structured goal-setting traditional app … with as much specificity as I allow myself"):
  - the why is a feeling or reason in your own words, and the examples model that: "feel
    productive", "feel calmer", "be a better drawer";
  - the next step can be mundane, e.g. "read a book";
  - no targets, dates, numbers or "goal" wording;
  - specificity is opt-in: a vague why stays vague until you choose to add a smaller step toward it
    (D-5).
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
_Simulated perspectives from `docs/product/PERSONAS.md`, run 2026-11-22 after the owner's answers.
This is a thinking tool, not user research. Full reports: `.polish/product/panel-B-04-{1,2}.md`._

| Persona | Reaction | Keeps using it | What it hinges on |
|---|---|---|---|
| A — Impulsive Dabbler | fine → delighted | yes | Dots on their own show one-offs on the first screen; one-tap "Log next step" |
| B — Intentional Builder | delighted, fine a week in | yes, if steps are visible | Staged steps visible and one tap from Home |
| C — Pressure-Sensitive Returner | uneasy → delighted | maybe → yes | No dates and a picture that never shrinks; the first run makes offers, not promises |
| D — Reflective Meaning-Seeker | fine → delighted | yes | Whys first in their own words; the graph says something in words; a note one tap from its dot |
| E — Skeptical Minimalist | uneasy | maybe | No tour for existing data; nothing attaches by a stray tap; one change of words at a time |
| F — Assistive-Tech User | uneasy | maybe → yes | The node actions reachable without pointing; selection announced; a large-text layout that can act |

**Trade-offs.**
- It favours A (dots on their own), B (an end, then the next move) and D (why first). It's kind to C
  on return: no dates, and it never shrinks.
- It costs F most unless the actions also exist outside the picture. It costs E at the moment of the
  update, not in steady use.
- The core tension is that the same tap is "look" for A, "where was I" for C, and absent for F.

**Strong, lean on it.**
- Dots with no wanders.
- One-tap "Log next step".
- A picture with no dates that never shrinks.
- "Logging ends the first run for good".
- "Wanders" (D and A; B is jarred, so whys keep their own name).

**Refinements folded into the slices:**
1. **The selection lasts one log** (P-35). Leaving Home or reopening clears it. A tap to *look*
   never sends a later line anywhere. The "to" chip sits inside the log box, and the toast names
   where the log went.
2. **The node actions exist without pointing** (P-34/35): a short list of whys and wanders right
   after the summary. Activating one selects it, and focus moves to the context row. It doubles as
   the large-text layout.
3. **Staged steps show as one quiet line under their node** (P-34): only where one exists, with no
   age or count. They can be replaced in place.
4. **The summary is visible as one line under the graph** (P-34). It names unattached logs when
   there are no wanders.
5. **"+ What's it all for?"** shows only while there are no whys, with "Not now" to hide it for good
   (P-34).
6. **First run** (P-36):
   - only on an empty app;
   - one Skip on ① ends it: "Not sure yet? Skip — it can surface from what you do.";
   - ② is marked "It can wait";
   - ③ "It's here whenever you get to it";
   - the log box stays live, and the keyboard never comes up by itself;
   - each step is a labelled dialog with focus moving.
7. **Whys keep their role in words** (P-37): "make apparel, what it's for"; "draw, a wander". P-37
   ships together with P-34, so both words never show at once.
8. **Dots still open their log**; nodes select (P-35). With the keyboard up, the context row replaces
   the other rows above the log box rather than stacking on them.

**Refused, with the rule:**
- progress, counts and dates (B): the never-list;
- a "welcome back" message (C): no nudges.

**Against the owner's notes (P0).** Every answer stands. The refinements tighten what a tap commits
to, add a non-pointer path, and make the first run feel like naming a feeling ("feel productive")
and a mundane step ("read a book"), with specificity opt-in.

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
