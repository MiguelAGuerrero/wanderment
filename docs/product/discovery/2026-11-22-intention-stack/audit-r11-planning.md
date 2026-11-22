# Planning audit: revision 11 (B-06)

_Fresh product-design audit, 2026-11-22. Scope: how a person defines, edits, stacks, completes and
sets down next steps, and how they create or reorganise the nodes (wanders, whys) those steps belong
to, as revision 11 implies it. Sources: B-06 "Current design (revision 11)", the five v11 frames and
their source, the cold-start draft, B-02 (D-5), DESIGN.md, STRATEGY.md, and the shipped wander page
and `ThreadCard`._

**The short version.** Revision 11 does a great job of *doing* a step: one card, one ✓, heat rising
up the branches. It barely defines *planning*. Of the nine moments in the lifecycle, only three are
fully defined: complete, the next layer rising, and a routine. Two are named but given no gesture or
surface: "a smaller one stacks on top" and "clearing it sets it down". Four have no path from Home at
all: creating a node after the cold start, placing a node under a why, staging a step on a node that
isn't a leaf, and drifting to Earlier. Renaming, declaring a why and opening a node's page are also
unreachable from Home, and the list of node buttons that served screen readers and keyboards
(DESIGN P-34) has quietly dropped out. Most of this can be fixed without adding anything Home shows
at rest. It takes three entries: **tap a circle**, **tap the step**, and **one ＋ by the scope
chip**. A node sheet sits behind the second tap on a selected circle.

---

## 1. The planning lifecycle as revision 11 implies it

Legend: **Defined** = the brief or the frames say where and how. **Partly** = the outcome is
named, but not the gesture, surface or result. **Undefined** = no path.

| # | Moment | Where / gesture in rev 11 | Before → after | Status |
|---|---|---|---|---|
| 1 | **Create a node** | Cold start only: "names a first node … then its next step". After that, nothing on Home. Today's paths survive elsewhere: "@new" in the log box (creates it as a "to"), "+ New wander" on the Wanders tab, and "+ What's it all for?" on the graph while there are no whys. Rev 11 doesn't mention any of them. | n/a → a circle appears… where? At All, top-level nodes are all one size, so a new name lands as a loose circle like *guitar*. | **Undefined** after the cold start |
| 2 | **Stage a step** | The What's next face, on a chain whose leaf has no step: "＋ add one" (frame 2, sew). | "＋ add one" → ? There's no frame of the field, its placeholder, how it closes, or the graph's new dot. Frame 3 leaves a dashed ghost dot where the last step was, but the text says done steps aren't drawn. | **Partly**: entry known, interaction not |
| 3 | **Make it smaller** | "Edit: tap the step to rewrite it; a smaller one stacks on top." | One gesture (tap the step) has to mean both *rewrite* and *stack smaller*, and nothing says how you pick. Rev 6 said "a smaller step stacks on top and never overwrites". Rev 11 has no control for it, and no frame. | **Partly**: named, no gesture |
| 4 | **Complete it** (✓: the step becomes a logged activity, leaves the slot, and its node warms) | ✓ on the What's next card (frames 1→3). Toast "sketched a hand → draw better hands · Undo". | Step text + ✓ → toast. The dot disappears, the heat rises through draw better hands → draw → make apparel, and the card rests on "＋ add one". | **Defined** |
| 4b | Complete it **in your own words** | "With words typed, ✓ logs them as the step" (Log face). | Frame 5 shows only a **Log** button and an attach chip. There's no ✓ in the Log face, so you can't tell whether "Log" with "→ draw better hands" attached completes *sketch a hand* or just logs toward the node. | **Partly**, and ambiguous with routines |
| 5 | **The next layer rises** | "✓ … the next written step rises" | The step beneath slides into the card and gets the dot. No frame shows it, and nothing anywhere tells you a layer is waiting, or what it is, before it rises. | **Defined** (the outcome) / layers never visible |
| 6 | **Add one** (after the stack is empty) | "＋ add one" on the card (frame 3). | Same gap as #2: no input state. | **Partly** |
| 7 | **Set one down** | "clearing it sets it down (Undo)": tap the step, delete all its text, confirm. | The step is gone with no trace, Undo is in a toast, and the layer beneath rises (presumably). | **Partly**: the only gesture is a hidden, destructive one |
| 8 | **A node reused as a routine** | Log face: type, attach "→ read" (or @read), Log (frame 4). | Toast "read 20 pages → read". Read and feel productive warm up and no step is used. But frame 4 outlines *read* while the card still shows *sketch a hand*, another chain's step. | **Defined** (the outcome). The card/selection state is inconsistent |
| 9 | **A node drifts to Earlier** | Nothing in rev 11. Heat halves every 14 days, so the circle cools to stone (sew, guitar). DESIGN's "Earlier after 21 days" is a list rule, and the graph has no equivalent. | It stays on Home forever, cold? Does the carousel still visit it? Does a staged step on it still show (steps "never fade")? | **Undefined** |

Supporting moments the lifecycle depends on:

| Moment | Rev 11 | Status |
|---|---|---|
| Select a node (any level) | "Swiping selects another leaf chain, in the graph's order." "Select: narrows to the why's subtree and zooms." There's no stated gesture for tapping a circle (rev 4/6 had "tapping a node jumps the card there"; rev 11 dropped it). | **Partly**: leaves only |
| Scope vs selection | Frame 2: swiping to *sew* shows the chip "‹ All · make apparel", but the graph isn't narrowed. So is the chip the selection's why or a scope? | **Inconsistent** |
| Stage a step on a non-leaf node (draw, or a why) | The carousel visits leaf chains only, so *draw*'s or *make apparel*'s own step can never reach the card (the owner said "a why can hold its own step"). | **Undefined** |
| Put a node under a why / move it | Links are derived from logs (doing → to), and with two parents a node goes "under the why it fed most recently". You can't place a node; you can only log your way there. | **Undefined** (by rule, unaddressed) |
| See a chain's layers | Only the top step is drawn. B-02's "toward" sentence on the wander page isn't in rev 11. | **Undefined** |
| Rename a node, declare or undeclare a why, hide, open its page | Only on the wander page, which Home no longer links to (tapping a node selects it; there's no "Open"). You can reach it through the Wanders tab → card → page. | **Undefined from Home** |
| Turn a step into a node (B-02 "make this a thread") | Absent. That's how a sub-node like *draw better hands* would naturally come about. | **Undefined** |
| Reorder | Siblings follow the graph's order; steps are top-only by D-5. No manual reorder, which fits the rules. | **N/A** (correctly absent) |
| Non-pointer path (screen reader, keyboard) | P-34's buttons under the picture aren't in the rev 11 frames. The ⌕ in the header isn't specified. | **Undefined** (an a11y regression) |

---

## 2. Gaps

### 2a. Planning actions with no access path in rev 11
1. **Create a node from Home** after the cold start, whether top-level or under a node.
2. **Create or declare a why** once one exists. "+ What's it all for?" only shows while there are none.
3. **Put a node under a why, or move it.** Placement is a side effect of logging, and there's no direct
   affordance.
4. **Stage a step on a node that isn't a leaf**: on *draw* while *draw better hands* exists, or on a why.
5. **Select a node by tapping it.** Implied but never stated. Only swiping is defined.
6. **See what's beneath the top step.** No surface at all.
7. **Rename, declare/undeclare, hide, open a node's page** from Home.
8. **Turn a step into a node.**
9. **Earlier on the graph**, and getting a drifted node back.
10. **Complete a step in your own words** while it's distinct from a routine log (#4b above).
11. **Reach the planning surfaces without pointing.** The list twin is gone.

### 2b. Hidden or undiscoverable gestures
- **Swipe the card to change chains.** There's no peek, dots or ‹ › in the frames (rev 9 kept "slim
  peeks"; rev 11 doesn't draw them). Swiping a card that also holds a text target and a ✓ invites
  mis-taps, and on web there's no swipe at all.
- **"Tap the step to rewrite it."** Nothing marks the text as editable. Today the step crumb *loads*
  on tap (D-6), so returning users will expect a load, not an editor.
- **"Clearing it sets it down."** Select-all, delete, confirm: a destructive gesture nobody finds by
  looking, and one that's easy to do by accident when rewriting.
- **"A smaller one stacks on top."** No gesture exists.
- **"Typing switches to Log" on web** has to exclude the moment the step field (or any field) has
  focus, or rewriting a step turns into logging.

### 2c. Contradictions to resolve before mocking further
- Frame 3 draws a **dashed ghost dot** after ✓, but the text says done steps aren't drawn. Keep it, and
  give it a meaning: the empty step slot, with a tap = ＋ add one (see §3).
- Frame 4 outlines *read* but the card shows *sketch a hand*. A log should move the card to the node
  it went to. Otherwise "＋ add one" for that node never appears where you'd use it.
- Frame 2's chip says "make apparel" while the graph is unscoped (see §3.1: selection ≠ scope).
- The cold-start Home shows the card **and** a log box together (the pre-rev-10 layout). It should land
  on the toggle.

---

## 3. Recommendations: the minimal set of planning entry points

Principle: **nothing new on Home at rest.** At rest, the screen stays as frame 1: the graph, the
card, the toggle, plus one small ＋ beside the All chip. Everything else appears on a tap, in the
place the tap happened, and closes the same way (Return, tap outside, Esc, or Back).

### 3.1 Select by tapping a circle; keep selection and scope apart
- **Tap any circle** (leaf, mid-level node, why or loose node) to **select** it. It gets the ink
  outline, and the card jumps to *that node's* step, or "＋ add one". The graph doesn't move. This
  covers the non-leaf and why steps that swiping can't reach.
- **Tap the selected circle again** (or long-press any circle) to open the **node sheet** (§3.5).
  It's the maps pattern: the first tap picks, the second shows details.
- **Scope** (narrow + zoom) happens on a why or any node that has children, through the chip: once
  something with children is selected, the chip reads "All · draw ⤢". Tap it to narrow, and it turns
  into "‹ All · draw". Selecting a leaf never scopes, which fixes frame 2.
- **The carousel** (swipe, plus ‹ › arrow keys on web) visits, within the current scope and in the
  graph's order, *every node with a staged step plus every leaf without one*. It skips Earlier nodes.
  Draw a **slim peek** of the neighbouring cards at both edges so the swipe can be found. There's no
  count, and no dots.
- **The non-pointer path:** ⌕ in the header lists every node, Earlier included. Choosing one selects it
  on Home, and the same results act as P-34's list twin. A circle's accessible name is "draw better
  hands, next: sketch a hand. Double-tap to select; actions: options".

```
 Wanderment          ⓘ ⌕ ⚙        tap "draw" once          tap "draw" again
 [All] ＋                          [All · draw ⤢] ＋        ┌───────────────────────┐
   (make apparel)  (feel prod.)     (make apparel)          │ draw            ✎     │
     │       \          │             ╭─┴─╮                 │ ◎ What it's for       │
   (draw)   (sew)    (read)          ((draw)) (sew)         │ ＋ Under it           │
     │                                 │                    │ → Toward…             │
   (draw better hands)               (dbh)                  │ Open ›     Hide       │
       ╲                                                    └───────────────────────┘
        ● sketch a hand            ┌ What's next ───────┐
 ┌ What's next ─────────── ┐       │ ＋ add one         │   (the sheet closes on a swipe
 │ sketch a hand      (✓)  │       └────────────────────┘    down, tap outside, or Back)
 └─────────────────────────┘
```

### 3.2 The What's next face: four states, one at a time

**A. Step staged (rest).** As frame 1: label, step text, ✓. The step text gets a faint dotted
underline only in the first week, or after ⓘ, or not at all. Its accessible name is "sketch a hand,
next step for draw better hands, toward draw, make apparel. Double-tap to edit." ✓'s name is "Done:
sketch a hand".

**B. Editing (tap the step text).** The card grows in place into a field holding the text, all of it
selected, with the keyboard up. The ✓ hides. Under the field is one quiet row of two verbs and,
on the right, the layer beneath when there is one (the *only* place layers show on Home):

```
┌ What's next ────────────────────────────┐
│ sketch a hand▍                          │
│ ↓ Smaller    Set down     → draw hands  │   ← "→ …" = the layer beneath, edit only
└─────────────────────────────────────────┘
  Return = save the rewrite · tap outside / Esc = cancel
```
- **Return** saves the rewrite. **Tap outside or Esc** cancels. Nothing is lost silently, because an
  unsaved rewrite stays in the field until you save or cancel.
- **↓ Smaller** keeps the current text as the layer beneath and empties the field, with the
  placeholder "Something smaller". The row now reads "→ sketch a hand". Return stacks it. An empty
  Return cancels and puts the old step back on top. One step per tap, so there's no loop of adding
  more (B-02 refinement 3).
- **Set down** removes the top without logging anything. The card closes, the layer beneath rises
  (or "＋ add one"), and a toast says "Set down · Undo". It leaves no trace. Clearing the text and
  pressing Return still works as an alias, so rev 11 keeps its gesture, but it's no longer the only
  door.
- Graph during edit: the step's dot gets the selection outline, and nothing else moves.

**C. Empty ("＋ add one").** Two targets:
```
┌ What's next ────────────────────────────┐
│ ＋ add one                          ✎   │   ✎ = log toward sew (flip to Log, "→ sew" attached)
└─────────────────────────────────────────┘
```
- Tapping **＋ add one** opens state B, empty, with the placeholder "One small thing" and no verbs
  row. Return stages it and an empty Return closes it. The graph shows a new labelled dot on its
  node's branch.
- Tapping **✎** flips to the Log face with the node already attached. This is the routine path, and
  it keeps the rev 5 promise that with no step "you can just log it right then and there". The card
  never nags you to add a step to a routine.
- **In the graph**, the selected node's empty step slot is the dashed ghost dot from frame 3. Tapping
  it does the same as ＋ add one. Draw it only for the *selected* node so the picture doesn't fill
  with ghosts.

**D. Just completed (after ✓).** The dot fills with ink and shrinks into its node, and heat rises
along the branches over about 600 ms (Reduce Motion: a crossfade). Then either the layer beneath
slides up into the card and takes the dot, or the card rests on ＋ add one with the ghost dot shown.
The toast reads "sketched a hand → draw better hands · Undo". Undo restores the step, its layer
position and the heat.

### 3.3 The Log face: attach, and complete only on purpose
Planning in the Log face is **attaching and completing, never staging**. In the Log face you can't
add, rewrite, make smaller or set down. Those belong to What's next.

```
┌───────────────────────────────────────────┐
│ sketched three hands at lunch▍            │
│ (→ draw better hands)          (✓)  [Log] │
└───────────────────────────────────────────┘
 ✓ appears only when the attached node has a staged step;
 its name: "Log as done: sketch a hand"
```
- The dashed **"→ node"** chip suggests a node (the selected node, or a match from the words). One tap
  attaches it as doing. **Log** logs toward the node; it is a routine log and **never uses up the
  step**, which makes frame 4's rule explicit.
- **✓** appears beside Log only when the attached node has a staged step. It logs your words *as* that
  step: the step archives and the next layer rises. This settles #4b without guessing what the
  person meant.
- **@name** still picks a node, and "@newname → ＋ create" still creates one (today's composer). The new
  node is attached as "to", and its circle appears hollow (§3.4).
- **After any log** the slot flips back to What's next *on the node the log went to* (fixing frame
  4). For a node with no step, that's the old "+ What's next? (optional)" moment: the card shows
  "＋ add one", and ignoring it leaves no trace.

### 3.4 Creating a node, and how its circle appears
**One ＋ beside the scope chip**, at rest. This is the only new mark on Home.
- At **All**: ＋ creates a top-level node. Scoped to "‹ All · make apparel": ＋ creates under make
  apparel.
- Tapping ＋ turns the chip row into a single field, with the placeholder "Name it as an action". It
  closes on Return (create), empty Return, Esc, or a tap outside.
- On create, the new circle drops in at its place in the graph's order, **hollow**: a stone outline
  with no fill, meaning "never logged". That keeps it different from a *cooled* node, which is filled
  stone. The new circle is selected, and the card shows "＋ add one" without taking focus, because the
  step is optional. The first log fills the circle with heat.
- **Under a node**: the hollow circle hangs from its parent by a **dashed** fine branch. That branch
  is a *pending* "toward". The first log doing → to that parent (✓ on its first step does it
  automatically, since ✓ logs doing = the node) turns it into an ordinary tapered branch. See the
  ranked change #6 for the rule question.
- Name clashes behave as today's rename and create: the existing node is selected instead, and the
  sheet says "Already here", which counts as a safety-style inline message.

```
 [All] ＋   →   [ Name it as an action▍ ]   →   [All] ＋
                                                  (make apparel)       ◌ learn to knit   ← hollow
                                                    │      ┊                              (selected)
                                                  (draw)   ◌ knit    ← dashed until a log earns it
```

### 3.5 The node sheet: reorganising without a page
It opens on a second tap of the selected circle, a long-press, or "Options" for a screen reader. It's
a bottom sheet with no explanations, short verbs only.
- **Name** (the title, with ✎): rename inline. Return saves.
- **◎ What it's for / ◎ Not what it's for right now**: declare or undeclare. A double ring appears or
  goes. With three declared, the inline swap row appears, as on today's wander page.
- **＋ Under it**: the same field as §3.4, under this node.
- **→ Toward…**: pick a parent from a short list (whys first, then by heat), or "nothing (top level)".
  How it's recorded depends on the rule question (#6).
- **Open ›**: the wander page, which holds history, the full "toward" sentence of staged layers
  (B-02 slice 3, read-only, no counts) and pull-in.
- **Hide**: as today, with Undo.
- It closes on a swipe down, a tap outside, or Back.

### 3.6 Earlier on the graph
- A node with no activity beneath it for 21 days **leaves the All view** and stays out of the
  carousel. Its staged steps wait unchanged (steps never fade). The graph's edge shows one quiet
  stone "Earlier" pebble with no number. Tapping it selects nothing; it opens ⌕ filtered to Earlier.
- Choosing an Earlier node from ⌕ selects it on Home. It returns in place, and its step is on the
  card: the "you left off" welcome. Logging toward it brings it back for good.

### 3.7 Turning a step into a node (lower priority)
In edit state (§3.2 B), a third verb appears only when the step has been on the card for a while,
or always if the owner prefers: **↥ Make it a node**. The step becomes a hollow child of its node,
hanging by a dashed branch, and the layers above it move with it. This is how *draw better hands*
would come about without typing the same thing twice. B-02 refinement 7 (preset "to") makes the
branch real on the first log.

### What's next vs Log: the split
| | What's next face | Log face |
|---|---|---|
| Purpose | Decide and shape the *one* next thing | Record what happened |
| Planning verbs | ＋ add one · rewrite · ↓ Smaller · Set down · ✓ complete (as written) · ↥ make a node | attach "→ node" · ✓ complete *with your words* · @create a node |
| Never | captures free text as a log | stages, rewrites or sets down a step |
| After | ✓ → toast, layer rises | log → flips to What's next on that node |

---

## 4. Ranked changes (≤ 10)

| # | On-screen change | Access path | Why | Risk |
|---|---|---|---|---|
| 1 | **Tap a circle selects it** (card jumps to that node's step or ＋ add one). The carousel covers every staged step plus stepless leaves, in scope, with **slim peeks**. **Selection ≠ scope** (the chip scopes only on request). | Tap a circle, swipe the card, ‹ › on web, ⌕ to select by name | Non-leaf and why steps can't be reached today. Swiping can't be found. Frames 2 and 4 contradict each other. | Low (UI). Tap targets on small circles: hit area ≥ 44 pt. |
| 2 | **Edit state on the card:** a field plus "↓ Smaller · Set down", and the layer beneath as "→ …" (edit only) | Tap the step text | "Smaller" has no gesture. "Set down" is a hidden, destructive delete. You can't see what will rise. | Low. Keep clear-to-set-down as an alias. Make sure web's type-to-Log ignores focused fields. |
| 3 | **Empty card: "＋ add one" + ✎ log toward**; the dashed ghost dot in the graph is the same ＋ | The card, or the ghost dot on the selected node | Defines staging end to end. Routines stay one tap from logging, with no pull to add a step. | Low. One more mark on the empty card. |
| 4 | **Log face: "→ node" chip attaches; a separate ✓ completes with your words** (only when that node has a step). After any log, the card lands on that node. | Log toggle, type | Today "Log" with a chain attached could either use up a step or not. Routines (frame 4) need it never to. | Medium. Two buttons close together; ✓ needs its full accessible name and a visibly different shape. |
| 5 | **Node sheet** (rename, ◎ what it's for with the swap, ＋ under it, → toward…, Open ›, Hide) | Second tap on the selected circle, long-press, or the SR "Options" action | Rename, declare and open have no Home path. Reorganising needs one place. | Low–medium. Second tap must be documented in ⓘ. Long-press is a backup only. |
| 6 | **Decide how "under" is recorded:** (a) *earned only*: "→ Toward…" and "＋ Under it" open the Log face with doing = node, to = parent preset, and the dashed branch is a draft until you log; or (b) a *stored pending home* drawn dashed until earned, which reverses "links are never stored" | Owner decision, before #5/#7 build | Rev 11's tree can't be shaped without it. DESIGN says links are derived. B-02 persona E called stored links a dealbreaker. Recommend (b), held to one pending home per node and dissolved on the first log; or (a) if the rule holds. | **High (data, Full tier):** a new stored field, export round-trip, migration, a DESIGN.md change. |
| 7 | **One ＋ beside the scope chip** creates a node in the current scope. **Hollow circle** = never logged; dashed branch until earned | Tap ＋, name it, Return | The only way to grow the graph from Home after the cold start, with one mark. Hollow tells new from cooled. | Medium (depends on #6). Nothing is created without Return. |
| 8 | **Earlier on the graph:** nodes 21+ days cold leave All and the carousel; one stone "Earlier" pebble opens ⌕; choosing one returns it with its step | Pebble, ⌕ | Undefined today. Steps never fade, so a cold node with a step would sit in the carousel forever. | Low–medium. Selection logic; no data change. |
| 9 | **⌕ doubles as the list twin** (every node, selects on Home), and **circles get full accessible names and actions** | Header ⌕; SR rotor / Tab order | P-34's buttons are gone in rev 11: an a11y regression. | Low. Needs an axe and SR pass. |
| 10 | **↥ Make it a node** in the edit state (B-02 promotion) | Tap step → ↥ | It's how sub-nodes like *draw better hands* naturally arise. Without it, the person retypes the step as a new node. | Medium (data: layers move with it; the Full tier with P-19). |

**What stays out on purpose:** reordering of siblings or steps (graph order and top-only are the
design); any count of layers; queues ("add another" while a step exists goes through ↓ Smaller only);
dates or ages on steps; an auto-opened step field after creating a node; explanatory text on Home
(meanings go to the ⓘ sheet, including "tap a circle twice for its options").

**Fix in the mockup before the next review:** frame 2's chip; frame 3's ghost dot (keep it, give it a
meaning); frame 4's card (land it on *read*: "＋ add one" / ✎); add frames for the edit state,
↓ Smaller, Set down + toast, ＋ create with a hollow circle, and the node sheet; land the cold start
on the toggle layout.
