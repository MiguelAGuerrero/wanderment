# Adversarial usability review: Home "intention stack", revision 5

Reviewed 2026-11-22 against `v5-frame-1.png` … `v5-frame-5.png`, the mockup source
(`intention-stack-v5.html`), `B-06-rev4-note.md`, `docs/DESIGN.md` and `docs/product/PERSONAS.md`.
Stance: assume it's wrong and find where people fail. Severity: **S1** blocks the task or loses or
misfiles data · **S2** causes a wrong action or a wrong belief, recoverable · **S3** friction.
Frequency: how many people hit it.

---

## 0. What the frames actually render (as opposed to what the captions say)

Several of the signifiers the captions depend on aren't really on screen. Usability testing works
from what's rendered, so these come first.

- **The carousel peeks are invisible.** `.peekL/.peekR` are translated ±95% behind the card. What
  could show is the 9 px gutter at 50% opacity with a `#E3DFD6` 1 px border. In every frame you see
  one lone card and nothing to its left or right.
- **The only swipe hint, `⟷`, sits behind the card's top border** in frame 1 (it shows as a faint
  `‹ ›` at about y=405). It has `pointer-events: none`, and it's a mockup annotation, not product UI.
- **"All" is underlined in 1 px `#E3DFD6` on 10 px muted text.** At phone scale it reads as a
  breadcrumb word, not a control. In frame 1, the state where you're *at* All, the word isn't there
  at all.
- **Dots have no lines to their wander.** DESIGN.md says "a line to each wander they name". The
  mockup has free-floating specks.
- **The graph doesn't reframe when narrowed.** Frames 2 and 3 leave the surviving nodes where they
  were in the All layout. Frame 2 is about 75% empty canvas with two nodes in the top-right corner.
- **No staged-step line under a node.** "sketch a hand" appears nowhere in the graph, but in frame 4
  "draw better hands" (a node in the graph) is also the step. Step and node are sometimes the same
  thing and sometimes not.
- **Frame 4's log chip says `→ draw`**, but frames 1→4 show no swipe or tap that selected draw.
  Either ✓ silently selected a chain, or the frame skips a step. Both are problems (see F5).

---

## 1. Three cold walkthroughs (5-second test)

### Persona: Newcomer (first open, mix of E "skeptical minimalist" and A "dabbler")
| Second | Sees | Thinks | Does |
|---|---|---|---|
| 0–2 | Big pale canvas, pills, orange line, scattered dots | "A mind map? A dependency chart?" Orange dots on the orange line read as **progress beads along a path** toward "make apparel". | Nothing yet |
| 2–4 | Card: small grey line, bold "↳ sketch a hand", circle ✓ | "That's a to-do. The app gave me a task?" ("I never wrote that" if seeded or demo data.) `↳` reads as reply or indent. | Notices ✓ is a checkbox |
| 4–5 | Log box "What did you just do?" | "This is where I write stuff." | Types "sketched a hand", taps **Log** |
| after | Toast (no target), dot appears somewhere (unattached), **step still says "sketch a hand"** | "Didn't it count? Do I also tick it?" | Taps ✓, so **the same act is logged twice** (two dots) |

Never discovered: swipe, "All", tap-to-edit, that graph nodes are tappable (faded ones look disabled).

### Persona: Returner after a month (C, "pressure-sensitive")
- The card opens on "the chain last logged toward", which is a month old: **"↳ sketch a hand"** in
  bold, with an empty ✓ circle next to it. That reads as an unchecked box from a month ago, the exact
  "declared thing left untouched" C fears.
- The recent-log dots have aged out, so the graph is pills and lines with **no marks**: visible
  absence. Under DESIGN's warmth decay, everything is also faded.
- They want to put the step down. Nothing says how. They have to (a) know that the bold text is
  tappable, (b) find "clear" in edit mode, and (c) trust that "clear" means "set down" and not
  "delete my data". Most won't. They'll leave the stale task sitting there or uninstall.
- They swipe by accident (or remember swiping), and the **graph collapses to two nodes**. "Where did
  my stuff go?" They don't see "All" in 10 px grey. They press Android Back. Unspecified behaviour,
  and if it exits the app, they assume data loss.

### Persona: In a hurry, one-handed (A, phone in left hand, walking)
- The thumb reaches the log box, the ✓ and the card. The graph, ⓘ, "All" and the nodes are **out of
  thumb reach** (top half).
- They want to "log 20 min guitar toward guitar". At All, the card shows *draw*. To target guitar
  they must swipe repeatedly through an unordered, uncounted carousel (linear search, recall not
  recognition) or reach up to tap the tiny faded "guitar" pill.
- They want to "log toward the chain that's showing". **There's no way to select the shown chain
  without leaving it.** Swiping changes chains. Tapping the step opens *edit*. So they tap the step,
  type "practised 20 min", hit Return, and **overwrite their next step with a log line**.
- The ✓ sits at the right edge, exactly where a right thumb rests, so accidental completes happen.
  Undo lives in a toast that **covers the bottom of the graph** and is gone in 6 s while they walk.
- The `→ read ×` chip's × is a 9 px glyph inside a chip. The fat-finger target is the chip or the
  text field, never the ×.

---

## 2. Top 10 failures, ranked

| # | Failure | Frame | Sev | Freq | Heuristic |
|---|---|---|---|---|---|
| **F1** | **Mode error at "All": the card shows a chain and step, but logs don't go there.** Default Home looks identical to a selected chain, except a missing chip and a missing word. The most natural act (log what you did about the step shown) produces an untargeted log, the step stays, and people then ✓ it too, so it's **double-logged**. | 1 | S1 | Very high (every first log) | Nielsen 1 (visibility of status), 2 (match: the shown thing is assumed to be the active thing), 5 (error prevention); Norman: mapping |
| **F2** | **No way to select the shown chain. Tapping the card edits the step.** "Select after swipe/tap", but tap *what*? The obvious tap target (the card or step) enters edit. Hurried users type their log into the step field and overwrite the step. | 1→5 | S1 | High | Nielsen 4 (consistency), 5 (error prevention); Norman: affordance vs. signifier mismatch |
| **F3** | **Swipe is undiscoverable, and its convention points the wrong way.** No visible peek, chevron or motion. On iOS and Android, a horizontal swipe on a lone card means *delete/archive* (Mail, Gmail) or *dismiss* (Tinder, notifications). Those who do discover it fear it destroys the step. | 1–5 | S2 | Very high (most never find it) | Gesture discoverability (hidden gestures need a visible signifier); Nielsen 6 (recognition over recall) |
| **F4** | **Selecting collapses the graph in place and reads as data loss.** Nodes keep their All positions, 75% of the canvas goes empty and nothing animates "receding". The way back ("All") is invisible. Browsing (swiping just to look) is fused with narrowing and with attaching the log target: three state changes from one gesture. | 2, 3 | S2 | High | Nielsen 1, 3 (user control and freedom); C persona's fear |
| **F5** | **"The next layer rises" turns a pursuit into a to-do, and moves the selection.** After ✓, "draw better hands" (an ongoing wander and a graph node) becomes the "step" with a ✓. It's vague and not actionable, and it invites "completing" a pursuit. The chip jumps to `→ draw` (frame 4), so the *next* log silently goes to a different wander than the one the user was working in. | 4 | S1 (misfiles logs; may archive a wander) | Every ✓ | Nielsen 2 (a pursuit isn't a task), 5; "nothing attached without a tap" (the target changed without one) |
| **F6** | **"All" isn't findable or reachable.** It's missing at All (so there's no "you are here"), 10 px muted text when present, a breadcrumb convention imported from desktop web, and out of thumb reach. Back gesture and Back button mapping are unspecified. | 1, 2–5 | S2 | High | Nielsen 3 (emergency exit), 6; platform conventions (Android Back, iOS edge-swipe) |
| **F7** | **The dots are misread, and they are counts in disguise.** Read as progress beads (on the lit path), pagination dots (three in a row, frames 1, 2, 4) or "loading…", and as stray render specks when unlit (grey). Countable per wander ("3 under hands, 1 under sew"). Age-out leaves *visible absence* for returners. Not tappable, so they're dead affordances. | 1–4 | S2 | Very high | Norman: false signifiers; product rule "no counts"; C persona |
| **F8** | **The stale step is front and centre for the returner, and there's no visible way to set it down.** "Clear" lives only in edit mode, and the word means "erase the text field", not "set this down". | 1, 5 | S2 | Every returner | Nielsen 3, 9 (recover); C persona: "if it makes me feel behind, I'll delete it" |
| **F9** | **Edit mode is a second text field fighting the first.** Two inputs on screen, no Done or Cancel, the keyboard's Return is ambiguous, and the Log button stays live next to it. Typing in the wrong one rewrites the step or logs a draft. Long steps truncate on one line. | 5 | S2 | Medium | Nielsen 5, 4; Norman: mode error |
| **F10** | **The *why* is styled as a folder path, and the glyphs disagree.** `make apparel › draw › draw better hands` reads as hierarchy (folder or category), not "for". `›`, `↳`, `→` (toast and chip) and `⟷` mean four different things. End-ellipsis on long paths cuts the *leaf*, the nearest context. Graph lines have no direction, so "toward" is invisible. Whys are marked by colour alone. Faded (unlit) nodes look disabled, so people don't tap them. | 1–5 | S3–S2 | Universal | Nielsen 4 (consistency), 2; WCAG 1.4.1 (colour alone); F persona |

Spec gaps that will turn into failures (not ranked because they aren't drawn):
- No first-run or empty state (no wanders, no whys, no steps). What does the "always shown" card say?
- Where do the DESIGN prompts go ("Toward something — or just itself?" after an untargeted log;
  "+ What's next?" after a log)? Both compete for the card's slot. "＋ next step" duplicates the
  second.
- Is the carousel set global, or "leaf chains under where you are"? The rules sentence says
  "under where you are". Taken literally, after one swipe you're scoped to a single leaf and **swipe
  has nowhere to go**: trapped until you find "All". Frames 2→3 contradict this.
- Carousel order (recency? alphabetical?). Without it, a returner can't predict direction.
- Does the selection or chip survive app-switch, relaunch, a month away? If it does, a month-old
  chip silently files today's log.
- What does "All" return the card to: the chain you were on, or the last-logged chain?
- How do you put a step on a non-leaf ("draw") or start a new chain from Home? There's no path.

---

## 3. What, why, how: where each one breaks

**WHAT (the next step).** This is the strongest part. The bold step line is the first readable text
on screen. It breaks when:
1. the user can't tell whether it's *theirs* or a suggestion, since `↳` reads as reply or indent;
2. after ✓, a wander rises into the slot (F5), so the WHAT turns vague ("draw better hands");
3. it's stale (F8);
4. the step is long, because one line with an ellipsis hides the actual action.

**WHY (context).** It mostly fails. The path is 10 px muted text read left to right like a folder
path. The relationship "toward" or "for" is never expressed. The screen-reader string ("draw, for
make apparel") is clearer than the visual. The why is marked only by orange. On narrow screens,
end-truncation eats the leaf. There's no visual tie between the card's path and the lit graph
path (different shapes and type), so people don't connect "the orange line up there" with "this
grey line down here".

**HOW (defining a step).** It only works in the empty case (frame 3, "＋ next step", where the plus
is a good signifier). It breaks:
1. when a step already exists, because rewriting needs a tap on bold text with no edit signifier;
2. for non-leaf wanders, which have no path;
3. after ✓, where the design promotes a wander instead of asking for the next concrete step, the
   one moment the user is most ready to name one;
4. for a brand-new wander or chain, which Home gives no entry point to;
5. in edit mode, where you can't commit or cancel visibly (F9).

---

## 4. Making the gestures findable without explanatory text

| Hidden thing | What makes it findable (structure, position, marks; no sentences) |
|---|---|
| **Swipe** | Real peeks: the neighbour cards visible 14–20 pt at each edge, showing the first letters of their step, with the active card inset. This is the App Store, Apple Maps and Google Maps place-card convention, and it's the strongest signifier there is. Add **‹ › chevron buttons inside the card's left and right edges**: tappable (one-handed and switch access) and they *teach* the swipe. First open only, a single settle-nudge (card slides 12 pt and back; skipped under reduced motion). No pagination dots, which are a count and also clash with the log dots. |
| **✓** | Already a circle, so it reads as a checkbox. Fine. Make the *result* teach it: on ✓ the step text strikes and visibly drops into the graph as the new dot (the motion shows "it became a log"). Move ✓ off the right-edge thumb rest or give it a 200 ms press-confirm fill to cut accidental completes. |
| **Tap-to-edit** | A **pencil-free edit signifier**: render the step as a field (a faint baseline under the text, the same baseline the edit mode in frame 5 already uses). People know underlined text in a card is editable (Reminders, Things). Long-press is *not* a fix (it's even less discoverable). |
| **Select the shown chain** | Make the **context line** the selector: tapping it (not the step) selects the chain and attaches the chip. Better still, see Fix 1: a dashed "→ draw better hands?" suggestion chip in the log box. Then select doesn't need finding. |
| **"All"** | A **persistent scope chip pinned top-left of the graph** (`All` filled when at All; `‹ All` outlined when narrowed). That's the back-button position. Map Android Back and the iOS edge-swipe to "All" when narrowed. Drop "All" from the 10 px context path. |
| **Graph nodes tappable** | Don't fade unlit nodes to 40% opacity (that reads as disabled). Dim the *lines and dots*, keep the pills at full contrast with a lighter stroke. Give nodes ≥ 44 pt hit areas regardless of pill size. |
| **The ⓘ sheet** | Low engagement by nature. Make it worth one tap: an annotated snapshot of *their own* Home (callouts on the card, chevrons, dots, All), not prose. It's the only place explanation is allowed, so make it visual. |

---

## 5. The small dots

**What a newcomer thinks they are**, in rough order of likelihood:
1. progress points along the path to the why (the lit ones sit *on* the orange line);
2. carousel or pagination indicators, or an ellipsis "…" (three in a row next to a pill);
3. sub-steps or to-dos still to do;
4. rendering noise (grey unlit ones between nodes);
5. "data points" that can be tapped. They can't, so it's a dead end.

Almost no one guesses "each is a thing I logged, placed near what it was for", because nothing ties
a dot to a wander (no line, no shape cue) and you can't inspect one.

**Do they earn their place?** Not in this form. They carry three meanings at once (log, recency,
target) with no way to read any of them. They're countable per wander, so they're a soft scoreboard
and break the spirit of the "no counts" rule. They disappear for exactly the person who can't bear
visible absence. They compete with the card for the "what just happened" feedback role.

**Keep one dot, drop the rest.** Show only the **newest log** as the ringed mark, joined by a
hairline to the wander(s) it named. That's the "it landed here" confirmation, and it's worth having.
Let wander *warmth* (the existing recency shading on pills and lines) carry "where energy goes" over
time. Warmth isn't countable and degrades gracefully. If the owner wants a cloud of recent logs:
- always draw the hairline to the named wander;
- make each dot tappable to show the activity text (data, not explanation);
- jitter them into a soft halo around the node rather than along the edge;
- never lay three out in a row.

---

## 6. Concrete fixes, ranked by impact ÷ effort

All within the rules: no counts, streaks, timers or notifications; nothing attached without a tap;
marks and structure over text.

1. **Suggest, don't attach (fixes F1, F2).** At All, as soon as the user types in the log box, show a
   **dashed** suggestion chip "→ draw better hands" (the chain on the card). One tap attaches it;
   ignoring it logs untargeted. This is the DESIGN.md "suggested doing" pattern (dashed, never
   silent), so it's already a sanctioned mark. Also: if the typed text matches the step text (or the
   user picks the chip while a step is shown), offer the step-completion inside the same log, so the
   log and ✓ don't double up. *High impact, low effort.*
2. **Real peeks and ‹ › chevrons on the card (F3).** CSS-level change. It teaches swipe, gives
   one-handed and switch users buttons, and the screen-reader "previous/next chain" buttons become
   visible ones. *High, low.*
3. **Persistent `All` scope chip top-left of the graph, plus Back and edge-swipe returning to All
   (F4, F6).** *High, low.*
4. **Zoom-to-fit the selected subtree, with a short transition from the All layout** (rest recedes,
   not vanishes; instant under reduced motion) (F4). *High, medium.*
5. **After ✓, keep the chain and its target. Show "＋ next step" in the slot (focused, not opened)
   instead of promoting the wander (F5).** The wander stays in the context line, and the chip doesn't
   move. The user can ignore it and nothing is left behind. This conflicts with the owner's "the
   next layer rises", so put it to the owner as an option: "rises" could mean the *context* rises
   (the path shortens only when a wander is set down), never that a pursuit becomes a checkbox.
   *High, low.*
6. **Separate the card's tap zones: context line = select, step = edit, ✓ = complete.** The step is
   drawn as a field (baseline). In edit mode, hide or disable the log box, Return saves the step, and
   tapping outside cancels (F2, F9). *High, medium.*
7. **Dots: keep only the newest (ringed, with a hairline to its wander). Recency lives in warmth
   (F7).** *Medium-high, low.*
8. **Rename edit-mode "clear" to "set down"** (an action label, not an explanation). For returners,
   the stale step shows in regular weight (not bold) once the chain is past the 21-day "Earlier"
   threshold. It stays shown, as the owner requires, but stops shouting (F8). *Medium, low.*
9. **Make the context line carry "for", visually (F10).** Draw the why as the same tinted pill it is
   in the graph (mini-pill in the card). That shape-matches the graph and reads as "the thing it's
   for" without words. Bump it to ≥ 12 pt. Middle-truncate (keep the why and the leaf, elide the
   middle). Use one arrow glyph consistently: `→` for "toward" everywhere, and retire `›` and `↳`, or
   keep `↳` only for the step. Add a subtle direction to graph lines (taper or tiny arrowhead toward
   the why). Mark whys by shape or weight as well as colour. *Medium, low.*
10. **Specify the gaps before building:** first-run and empty card; where the "Toward something?" and
    "+ What's next?" prompts live relative to the card; carousel scope (global leaf chains, ordered by
    last log, stable within a session); selection resets to All on cold launch (not on brief app
    switches); what "All" returns the card to. *High (prevents rework), low.*

**Cheapest test to settle the biggest bet:** put frames 1 and 2 (with Fix 1 and Fix 2 applied, and
without) in front of 5 people with one task, "you just sketched a hand, record it". Count
untargeted logs and double logs. If people still type a log *into the step*, Fix 6 is mandatory,
not optional.
