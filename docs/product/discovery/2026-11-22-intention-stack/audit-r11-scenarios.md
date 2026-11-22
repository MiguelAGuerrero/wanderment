# Audit of revision 11: scenario walk-throughs (logging and planning)

_Fresh adversarial audit, 2026-11-22. Inputs: B-06 "Current design (revision 11)", `current-design.html`
and frames v11-1…5, the cold-start prototype (`onboarding.html`), DESIGN.md, PERSONAS.md. Phone: 390 pt
wide, the mockup's proportions (graph ≈ 390 × 400 pt, card ≈ 75 pt, toggle ≈ 40 pt, tab bar ≈ 40 pt)._

Verdict scale: **smooth** (no hesitation, ≤ 3 taps plus typing), **friction** (works, but the user
hesitates, hunts or mis-taps), **broken** (no defined path, or the obvious path does the wrong thing).

---

## 0. What revision 11 actually defines (and where the frames disagree with it)

Defined: heat graph; nodes never done; steps written, ✓ completes and archives; one bottom slot with a
What's next / Log toggle; swipe the card to select another leaf chain "in the graph's order"; a dashed
"→ chain" suggestion in the Log face; "with words typed, ✓ logs them as the step"; flips back to What's
next after a log; select narrows to the why's subtree and zooms; "‹ All" / Back; on open the card shows
the chain last logged toward; tap the step to rewrite; "a smaller one stacks on top"; clearing it sets it
down (Undo); cold start names a first node then a step.

Not defined at all: tapping a circle; creating a node (after cold start); giving a node a parent or a
second why; declaring/swapping a why; adding a step *after* the current one; steps on a why or a mid node;
logging toward a node that isn't the suggestion (no `@`, no picker); logging toward two; a node's history;
editing or moving a log; restoring a completed step after the toast; what ⌕ does; what the swipe order is
and whether it wraps; whether a swiped selection survives closing the app.

Contradictions visible in the frames (each one is a moment a real user would be confused):

| Frame | Ring (graph) | Chip | Card | Problem |
|---|---|---|---|---|
| 1 | draw better hands | "All" | sketch a hand | Chip says nothing is selected; ring says something is. |
| 2 | sew | "‹ All · make apparel" | ＋ add one | Spec says the graph narrows and zooms; it doesn't. "sketch a hand" dot still drawn for another chain while the card talks about sew. |
| 3 | draw better hands | "All" | ＋ add one | Toast says "sketch**ed** a hand": the step was logged with altered text (breaks "as typed"). |
| 4 | read | "All" | sketch a hand | Ring on read, card on draw better hands: the two halves of the screen point at different chains. |
| 5 | draw better hands | "All" | Log face | Two controls labelled "Log" 30 pt apart (segment and send button). No ✓ on this face, though the spec says "with words typed, ✓ logs them as the step". |

Cold-start prototype vs revision 11: its Home has a separate always-visible log box ("What did you just
do?" + Log) under the card, not the toggle, plus a fading hint line ("Your next step lives here. Log
anything below.") on Home. The two drafts don't describe the same Home.

The card never names its node. "What's next — sketch a hand" and "What's next — ＋ add one" are
meaningful only by finding the outlined circle, which at 8 chains is a 24–32 pt ring somewhere in a
400 pt graph. That single omission drives most of the friction below.

---

## 1. Scenarios

Fixture for 1–9: the mockup graph (whys *make apparel*, *feel productive*; *guitar* unparented; draw ←
draw better hands, sew under make apparel; read under feel productive). Last log was toward *draw better
hands*, whose step is "sketch a hand".

### S1. Quick one-handed log on the go, belongs to a chain (Owner, on a bus, right thumb)

Intent: "sketched hands on the bus", toward draw better hands, and it *is* the staged step.

1. Open app. Screen: chip "All", ring on draw better hands, card "What's next · sketch a hand ✓",
   toggle on What's next. Fine.
2. Thumb to the **Log** segment (bottom right, easy reach). Slot becomes the log box, keyboard up, tab bar
   hidden. The toggle now sits *between* the box and the keyboard.
3. Type. A dashed "→ draw better hands" appears bottom-left of the box (≈ 20 pt tall, 10 pt type). On a
   moving bus with the right thumb this is the hardest target on the screen.
4. Tap it. What the attached state looks like is undefined (solid? ×?). The user isn't sure it took.
5. Tap **Log** (the black button) — or, by habit, the **Log** segment just below, which does nothing
   (already on). Mis-tap risk.
6. Toast "sketched hands on the bus → draw better hands · Undo". Slot flips to What's next:
   **"sketch a hand ✓" is still there.** The user did the step, but the log didn't complete it.
7. Hesitation: tap ✓ too? Doing so writes a second activity "sketch a hand". Double log.

Taps: 4 + typing, plus an ambiguous 5th. **Verdict: friction, bordering broken** (the "this was the
step" case has no surface on the Log face; the obvious extra ✓ duplicates the log).

### S2. A one-off, unrelated to anything (Dabbler: "called mum")

1. Open → Log segment → keyboard.
2. Type "called mum". The dashed "→ draw better hands" still shows, because it follows the selected chain
   rather than the words. Persona E: "why is it asking about drawing?"
3. Tap Log (or Return). Toast "called mum · Undo". Flip back to What's next.
4. Graph unchanged (no trail beads, no dots): the only trace on Home is the 6 s toast. Fine by the
   refusals; Activities tab has it.

Taps: 2 + typing. **Verdict: smooth**, with noise (an irrelevant suggestion every time; DESIGN's
"Toward something — or just itself?" is neither kept nor dropped explicitly).

### S3. A routine toward an existing node ("read 20 pages" → read)

Card is on draw better hands, not read.

- Path A (log first): Log → type "read 20 pages" → suggestion says "→ draw better hands". No way to change
  it: `@` isn't in revision 11 or its mockup, there's no "other…" affordance, and tapping the read circle
  is undefined. If the user taps the suggestion anyway, the log goes to the wrong chain (→ S9).
- Path B (select first): swipe the card. Order "in the graph's order" is unknown to the user: draw better
  hands → sew → read → guitar? Each swipe changes the ring and chip, but the card shows "＋ add one" for
  both sew and read, so the user must look up at the graph to know where they are. Overshoot to guitar,
  swipe back. Then Log → type → "→ read" → Log.
- Path C: tap the read circle. Natural (it's the biggest, most obvious thing on screen) — undefined.

Frame 4 then shows ring on read but card still on "sketch a hand": after a successful routine log the
screen contradicts itself. Repeating it tomorrow costs the same again: there's no "log again" on Home
(Activities has one today).

Taps: Path B 5–7 + typing. **Verdict: broken** (Path A, C) / **friction** (Path B).

### S4. Completing the staged step in your own words ("sketched three hands at lunch")

- Path A: What's next → ✓. Logs the step text (frame 3 shows it rewritten to past tense). The user's own
  words are lost.
- Path B: Log face → type → there is **no ✓ on the Log face**, only "→ draw better hands" and Log.
  Log attaches but doesn't complete. Then flip to What's next and ✓ → two activities.
- Path C: tap the step text on the card, expecting (as in today's app, where tapping the crumb loads it
  into the log box) to log it. Revision 11 makes that tap **rewrite the step**. The user types "sketched
  three hands at lunch" and has now renamed the step to a past-tense sentence, nothing logged.

The spec sentence "with words typed, ✓ logs them as the step" has no screen to live on.
**Verdict: broken.**

### S5. Morning planning: next steps for two chains (Builder: sew → "cut the pattern", read → "finish chapter 3")

1. Open: card on draw better hands.
2. Swipe → (sew? draw? the order is opaque). Card "＋ add one"; which node it's for is only the ring.
3. Tap "＋ add one". What appears is undefined (inline field in the card? keyboard? does the toggle
   switch?). Assume an inline field: type "cut the pattern", Return. Card "cut the pattern ✓".
4. Wants a second step on sew ("pin it"). Only "a smaller one stacks on top" exists, i.e. *before*.
   Planning in order means entering steps backwards. No "add after"; no visible control for "smaller"
   either (gesture undefined).
5. Swipe on to read (one or two swipes, overshoot possible). "＋ add one" → type → Return.
6. Wants a step on the why itself ("visit the fabric market" → make apparel). Swipe only visits leaf
   chains. No path.
7. Closing the app: tomorrow it opens on the chain *last logged toward*, not the one just planned.

Also: while editing steps, the ✓ sits on the same swipeable card; a sloppy swipe can land on ✓ and
complete a step (→ S9b).

Taps: ~8 + typing for two chains. **Verdict: friction** (hunting, unnamed card, undefined add UI) and
**broken** for a second step / a step on a why.

### S6. A new interest appears mid-day ("learn embroidery", under make apparel)

1. Home: no ＋ anywhere. Cold start created the only node ever made from Home.
2. Try Log → "watched an embroidery video @embroidery": `@` undefined in revision 11; DESIGN says Return
   never creates. Nothing created.
3. Try the Wanders tab (today it has a "New wander name" field). Creates a top-level wander. Back on Home
   it presumably shows like *guitar*: unparented, in the top row, the same size as the whys.
4. Put it under make apparel: no path. Revision 11's graph has stored parent lines (draw → make apparel),
   while DESIGN says links are only derived from activities. Neither revision 11 nor the frames say how
   a line is made.
5. A new *why* (fourth): the swap rule exists in DESIGN, no access in revision 11.

**Verdict: broken** (no Home path to create, none to place under a why).

### S7. Returning after a month away (Pressure-sensitive Returner)

1. Open. Heat after 30 days ≈ 0.23 everywhere: every circle pale amber/stone. Neutral, no counts. Good.
2. Ring and card on draw better hands: **"sketch a hand ✓"**, a month-old ask, is the only sentence on the
   screen. Persona C reads it as "you didn't do this".
3. To set it down: tap the step → select all → delete → leave the field → Undo toast. Hidden (no visible
   "set down"), four fiddly actions, and on a phone "select all" in a small field is its own mis-tap.
4. To just log "back from a trip": Log → type → the stale "→ draw better hands" suggestion again → Log.
   Works.
5. Nothing on screen says "pick up anywhere"; the app re-opens exactly where it was left.

**Verdict: friction** (neutral graph, but the headline is a stale step, and putting it down is hidden).

### S8. Ambivalence: unsure which why, or it serves two ("pottery class" → make apparel *and* feel productive)

- Unsure: Log → type → ignore the suggestion → Log. It's a one-off. Attaching later: Activities → the
  row → its page (today's "Add a wander it was to"). Off-Home, but it exists.
- Serves two: the Log face offers one dashed chain; no second chip, no `@`. DESIGN allows several "to"s,
  revision 11 exposes one. A *node* that leans toward two whys can't be drawn: the graph is a tree with
  one `up` per node, and there's no gesture for a second line.
- A node the user isn't sure about yet (like *guitar*) floats unparented in the top row at why size.
  That's actually a good "not sure yet" state, but nothing lets the user later say "it's under feel
  productive" or "both".

**Verdict: friction** (unsure) / **broken** (serves two).

### S9. Correcting a mistake

a) **Logged to the wrong chain** ("read 20 pages → draw better hands", by tapping the suggestion).
   - Within 6 s: Undo. Whether the text returns to the box is undefined; if not, retype.
   - After the toast: Activities tab → find the row → its page → remove "To: draw better hands" → "Add a
     wander it was to" → read → back → Home tab. ~7 taps, three screens. The toast body (DESIGN: "body
     opens details") is the shortcut, but only for 6 s.

b) **Completed the wrong step** (a swipe that ended on ✓, or ✓ on the wrong chain because the card didn't
   say which).
   - Within 6 s: Undo. Fine.
   - After: the step is archived and "done steps show only as warmth". There is no list of done steps, no
     un-complete. Deleting the activity in Activities may or may not restore the step (data records it;
     UI undefined). The user re-types the step by hand.

**Verdict: friction** (a, after toast) / **broken** (b, after toast).

### S10. 15 nodes and 8 chains: finding one chain (Owner: "guitar → learn the F chord")

1. Open on the last-logged chain. The graph has 3 whys + 12 nodes in ≈ 390 × 400 pt. Third-level circles
   are ~32 pt with ~11 pt labels set *below* the circle; siblings' labels collide. Heat colour is the
   only differentiator between cold neighbours.
2. Swipe the card through up to 7 chains. The card doesn't name the chain, so each swipe means looking up
   at the graph for a moved ring, then back down. No position marker, no idea whether it wraps.
3. Tap the guitar circle: undefined. ⌕ in the header (≈ 12 pt glyph, three icons in ~60 pt): undefined
   whether a result selects a chain on Home.
4. The "swipe-up drawer of every chain" is listed as *Later*. It is the answer to this scenario.
5. Once found, the narrowed-and-zoomed graph (spec) helps; frame 2 doesn't show it.

**Verdict: broken at scale** (linear, unlabelled swiping is the only defined way to find a chain).

### Summary

| # | Scenario | Verdict | Root cause |
|---|---|---|---|
| S1 | One-handed log toward a chain | friction → broken | Tiny suggestion; no "this was the step" on Log face |
| S2 | One-off | smooth (noisy) | Suggestion follows selection, not words |
| S3 | Routine toward another node | broken / friction | No target picker; circles not tappable |
| S4 | Complete step in own words | broken | ✓ and the words live on different faces; tap-step = rewrite |
| S5 | Morning planning ×2 | friction / broken | Unnamed card, opaque swipe order, no "add after", no steps on whys |
| S6 | New interest under a why | broken | No create path on Home; no parent path anywhere |
| S7 | Return after a month | friction | Stale step is the headline; set-down hidden |
| S8 | Unsure / serves two | friction / broken | One "to" exposed; tree can't show two whys |
| S9 | Corrections | friction / broken | Fixes leave Home; done steps unrecoverable |
| S10 | 15 nodes / 8 chains | broken | Linear swipe is the only finder |

---

## 2. The 12 changes, ranked

Each respects the refusals: no goals, streaks, %, timers, notifications or counts; nothing created or
attached without a tap; marks and data on screen, explanations only in ⓘ.

### 1. One selection, shown three ways that always agree, and the card names its node
- **Screen:** the card's label line becomes data: `draw better hands · make apparel` (node, then its why,
  truncated from the middle), replacing the bare "What's next". The ring, the chip and the card always
  point at the same chain. At All the card still names the chain it shows; the chip reads "All" only
  when the graph is unnarrowed, and becomes "‹ All · make apparel" whenever the ring's chain is scoped.
- **State rule:** a log toward X selects X (fixes frame 4); ✓ keeps the selection; opening the app
  restores the last *selected* chain (planning counts as intent, not only logging).
- **Fixes:** S1, S3, S4, S5, S9b, S10; frames 1–4 contradictions.

### 2. Tap a circle to select its chain; swipe stays as the shortcut
- **Gesture:** tap any circle → it becomes the selection, the graph narrows/zooms, the card shows its step
  (or "＋ add one"). Tap a why → card shows the why's own step (see 6) and the chip scopes to it.
  Hit area ≥ 44 pt per circle, regardless of drawn size. Swipe left/right on the card still steps
  through leaf chains; a 3-dot position hint is a count, so instead the neighbour's name peeks at the
  card edge during the drag.
- **A11y:** the card is an adjustable element (VoiceOver swipe up/down = next/previous chain), announced as
  "draw better hands, toward make apparel, next: sketch a hand".
- **Fixes:** S3, S5, S10, S6 (step 4 once placing exists).

### 3. "This was the step" on the Log face
- **Screen:** when the selected chain has a step, the Log face shows two dashed chips under the text:
  `→ draw better hands` and `✓ sketch a hand`. Tapping ✓-chip attaches to the node *and* marks the line as
  completing the step (the existing D-6 "↳ step" semantics, now a visible chip with ×). The log keeps the
  user's words exactly as typed; the step text is recorded on the activity, not substituted for it.
- **On the What's next face**, ✓ alone logs the step text verbatim (no tense rewriting).
- **Fixes:** S1, S4 (the spec's "with words typed, ✓ logs them as the step" gets a home).

### 4. A target picker in the Log face (`→` is a chip you can change, not only accept)
- **Screen:** the dashed suggestion is chosen by the words first ("read 20 pages" → read), then by the
  selection. Tapping the chip's ▾ (or typing `@`) opens up to 3 matches + "＋ new '…'" + "Just itself".
  A picked target becomes a solid chip with ×; a second pick adds a second chip (serves two).
  Return still never picks or creates.
- **Size:** chips ≥ 32 pt tall, 13 pt type, placed on the right half, next to the send button.
- **Fixes:** S2 (no irrelevant suggestion), S3, S6, S8, S9a (prevention).

### 5. A ＋ for nodes, scoped by where you are
- **Placement:** a ＋ circle button at the right end of the chip row (top left area stays the scope chip).
  At All: "＋" → a one-field sheet "Name" with a "why" toggle (double ring preview; a fourth why offers the
  swap). Scoped/selected on X: the same sheet titled `under make apparel`, with the parent shown as a
  removable chip (tap × to make it top-level, tap to change).
- **Also reached** from the picker's "＋ new 'embroidery'", which pre-fills the parent from the selection
  as a removable chip. Nothing is created until the sheet's button is tapped.
- **Fixes:** S6, S8 (create under the right why), S10 (grow without the Wanders tab).

### 6. A node sheet: long-press a circle (or tap the selected one again)
- **Contents (data, not explanation):** name (rename); its steps as a short ordered list (drag to
  reorder, ＋ add after, swipe a row to set down); its recent logs with dates; "toward" chips (parents:
  add a second why, remove, move); why toggle; Hide.
- Steps on a why or mid node live here and become the card when that node is selected.
- **Fixes:** S5 (add after, steps on whys), S6/S8 (place, second why), S9 (history), S7 (set down), S10.

### 7. Explicit step actions on the card, so tap-to-rewrite stops being a trap
- **Gesture:** tap the step text → inline edit (as now), but the edit row shows three small buttons under
  the field: `smaller first`, `add after`, `set down`. Set down = one tap + Undo toast ("set down · sketch a
  hand · Undo"), not "clear the text". Long-press the card → the same three actions without the keyboard.
- **Separation:** ✓ gets its own 44 pt zone that a horizontal drag can't fire (✓ only on a clean tap with
  < 8 pt movement).
- **Fixes:** S4 (path C), S5, S7, S9b.

### 8. Bring the chain drawer forward from "Later"
- **Gesture:** swipe up on the card, or tap the scope chip → a half-sheet listing every chain grouped
  under its why: each row `node · next step` (or `node · ＋`), its heat as a small coloured dot, in graph
  order. Tap a row = select (graph zooms, sheet closes). A search field at the top filters it; header ⌕
  opens the same sheet focused. No counts, no dates of absence.
- **Fixes:** S10, S5 (plan several chains from one list: tap a row's ＋ inline), S3.

### 9. Log face continuity and clear labels
- **Behaviour:** after a log, stay on the Log face (field cleared, keyboard up) until the keyboard is
  dismissed; then flip back. Consecutive logs don't re-tap the toggle.
- **Labels:** the send button becomes an arrow-in-circle (↑) inside the field; the segment reads "Log"
  only. One thing named "Log" on screen.
- **Reach:** on the Log face, put the toggle *above* the box (or hide it while the keyboard is up; the
  keyboard's dismiss returns to What's next).
- **Fixes:** S1, S2, S3 (repeat routines).

### 10. Corrections from where the mistake is visible
- **Toast:** body tap (already in DESIGN) opens the activity sheet in place on Home: text, target chips
  (× / ▾ to move), "completed: sketch a hand" with "↺ put the step back".
- **After the toast:** the node sheet's recent logs (6) open the same activity sheet. Deleting an activity
  that completed a step offers to put the step back (one tap).
- **Fixes:** S9a, S9b.

### 11. A warm, quiet return
- **Rule:** if the last activity is ≥ 21 days old (DESIGN's "Earlier" threshold), open at All with no
  chain selected, the slot on the Log face (field not focused, so no keyboard), and the card one tap away.
  No greeting text, no "it's been N days". Stale steps are never auto-set-down; they're one swipe or one
  tap on a circle away, and long-press → set down is available (7).
- **Fixes:** S7.

### 12. Let a node lean toward two whys, and keep "not sure yet" a first-class place
- **Graph:** a second parent is a thinner secondary branch to the other why (same taper rule, lighter
  ink). An unparented node stays in the top row but one size smaller than declared whys and without the
  double ring, so "not placed yet" reads differently from "a why".
- **Access:** node sheet "toward" chips (6); dragging a circle onto a why in the graph as a shortcut
  (with Undo).
- **Fixes:** S8, S6.

Not ranked but cheap: header icons get 44 pt targets; the cold-start Home must use the same slot/toggle
as revision 11 and drop its on-Home hint sentence (move it to ⓘ).

---

## 3. Feature access map

| Action | Revision 11 now | Should be |
|---|---|---|
| **Log (one-off)** | Log segment → type → Log button / Return. Suggestion shows regardless of words. | Same, but the suggestion only appears when the words or a fresh selection justify it (4); send is an ↑ inside the field (9). |
| **Log toward (suggested chain)** | Log face → tap dashed "→ chain" (≈ 20 pt, bottom-left) → Log. Attached state undefined. | Chip chosen by words then selection, ≥ 32 pt, right side; solid with × once attached (4). |
| **Log toward another node** | Undefined (no `@`, no picker); workaround: swipe the card to it first. | ▾ on the chip or `@` → 3 matches + "＋ new" + "Just itself" (4); or tap the circle first (2). |
| **Log toward two** | Not possible on Home; Activities page afterwards. | Second pick adds a second chip (4). |
| **Log again (routine)** | Not on Home; Activities "Log again". | Stay on Log face between logs (9); words-first suggestion re-finds the node (4). Node sheet: recent logs, tap = log again (6). |
| **Complete step (as written)** | What's next → ✓ (frame 3 alters the text). | Same; logs text verbatim; ✓ immune to swipes (7). |
| **Complete step in own words** | Spec sentence only; no ✓ on the Log face; tap-step rewrites instead. | `✓ step` chip on the Log face (3). |
| **Add step (none)** | Card "＋ add one" → UI undefined. | Tap → inline field in the card, Return saves; card label names the node (1). |
| **Add a later step** | No path. | Edit row "add after" (7); node sheet ＋ add after (6). |
| **Smaller step** | "Stacks on top": gesture undefined. | Edit row "smaller first" (7); long-press card (7). |
| **Rewrite step** | Tap the step text. | Same (7), with the action row visible so it can't be mistaken for logging. |
| **Set down** | Clear the step's text → Undo. | "set down" in the edit row / long-press, one tap + Undo (7); swipe a row in the node sheet (6). |
| **Step on a why / mid node** | No path (swipe visits leaf chains only). | Select the node by tap (2) or drawer (8); card shows its step; node sheet (6). |
| **New node** | Cold start only; Wanders tab field (top-level). | ＋ at the chip row → name + why toggle (5); "＋ new '…'" in the picker (4). |
| **New node under X** | No path. | With X selected, ＋ → "under X" (5); picker's ＋ new pre-fills X (4). |
| **Place / move a node, second why** | No path (parent lines' origin undefined). | Node sheet "toward" chips (6); drag circle onto a why (12). |
| **Declare / swap a why** | No path after cold start. | Why toggle in the ＋ sheet and node sheet; fourth offers the swap (5, 6). |
| **Select chain** | Swipe the card (order opaque, card unnamed). | Tap a circle (2), drawer row (8), swipe (2) with a name peek; card names the node (1). |
| **Go to All** | "‹ All" in the chip / Back. | Same; plus tap empty graph space. The chip reads "All" only at All (1). |
| **Find one chain of many** | Linear swipe; ⌕ undefined. | Drawer with filter; ⌕ opens it focused (8). |
| **See a node's history** | Not on Home; Wanders tab → node page (today's "Open"). | Long-press the circle / tap the selected one → node sheet, recent logs (6). |
| **Undo (within 6 s)** | Toast Undo. | Same; Undo restores the typed text to the box. |
| **Fix a log after the toast** | Activities tab → row → page → edit "to" → back to Home. | Toast body or node-sheet log → activity sheet on Home with movable chips (10). |
| **Un-complete a step** | Toast Undo only; afterwards no path. | Activity sheet "↺ put the step back"; deleting a completing activity offers it (10). |
| **Return after a long gap** | Opens on the last chain's (possibly month-old) step. | ≥ 21 days: open at All on the Log face, nothing selected, no text about the gap (11). |
