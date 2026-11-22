# Audit: selection and scope in B-06 revision 11

Scope of this audit: how **selection** changes the **scope** of interaction on Home: what is
highlighted, shown or hidden, what the bottom slot shows, what a log attaches to, and what each looks
like. Sources: B-06 "Current design (revision 11)", frames v11-1…5 and `current-design.html`, the
revisions 4–11 notes in the brief, the shipped `useStore.select` / `domain/select.ts` /
`HomeGraph.tsx` / `Composer.tsx`, and DESIGN.md's Interaction rules.

Words used below:
- **Scope** is how much of the graph is drawn: *All*, or one subtree (narrowed and zoomed).
- **Focus** is the one chain the What's next card is on. A *chain* is a leaf node plus the path up to
  its top, so a loose node like *guitar* is a chain of one.
- **Attach** is what the next typed log will be filed under.

Revision 11 uses one word, "select", for all three. Most of the problems below come from that.

---

## 1. State model of revision 11 as written and drawn

⚠ = not specified, or the frames contradict the text.

| # | State | (a) Graph | (b) Scope chip | (c) Bottom slot | (d) A typed log attaches to | (e) Enter / leave |
|---|---|---|---|---|---|---|
| S0 | **Empty app** | none | none | none (cold start runs instead) | n/a | Enter: first launch with no data. Leave: cold start writes 1 node and optionally 1 step, then lands on S1. ⚠ What Home looks like if the person skips everything. |
| S1 | **Open at All, default chain** (f1) | Whole graph, heat colours. Ink ring on *draw better hands* (the default chain's leaf). Step dot "sketch a hand" (white fill, ink stroke) joined to it. | `All`, quiet grey, looks like a label | What's next: "sketch a hand" + ✓; toggle on What's next | Nothing. Log face offers dashed "→ draw better hands". | Enter: app open (card = chain last logged toward). Leave: swipe, toggle, tap a node ⚠, type (web). |
| S2 | **Swiped to another chain** (f2) | Whole graph still drawn (⚠ the brief says selecting narrows and zooms). Ring moves to *sew*. **Step dot for draw better hands stays** (⚠ it isn't sew's step). | `‹ All · make apparel`, bold ink (⚠ the graph isn't narrowed, and the chip names the why, not sew) | What's next: "＋ add one" (no ✓) | ⚠ Dashed "→ sew"? Solid? Not specified. | Enter: swipe the card (graph order). Leave: swipe again, chip/Back ⚠ (back to All, or to the previous chain?). |
| S3 | **Narrowed to a why** (text only, not drawn) | The why's whole subtree, zoomed to fill. Everything else hidden. ⚠ What is outlined? | `‹ All · <why>` | ⚠ Which leaf the card lands on when the why has several | ⚠ | Enter: "Select" (tap a why? swipe? both?) ⚠. Leave: `‹ All` or Back (rev 6: Back goes up a level). |
| S4 | **Log face, empty** | Unchanged; the keyboard covers the tab bar | unchanged | Log box with caret; dashed "→ chain"; **Log** button | Nothing until the chip is tapped | Enter: tap Log; on web, any typing. Leave: tap What's next ⚠ (draft kept?), log, Back ⚠. |
| S5 | **Log face, typing** (f5) | Unchanged; ring on the focused leaf | unchanged | Text, dashed "→ draw better hands", **Log** (⚠ the text says "✓ logs them as the step", the frame says "Log") | Nothing, or the chain after one tap on the dashed chip | Leave: Log, then the slot flips to What's next. |
| S6 | **Just logged, routine** (f4) | Heat rises on *read* → *feel productive*. **Ring jumps to read** (⚠ but the card is still on sketch a hand). | `All` | Toast "read 20 pages → read · Undo" over What's next "sketch a hand" | n/a | Enter: Log. Leave: toast timeout ≥ 6 s, Undo. ⚠ Does focus move to read? The ring says yes, the card says no. |
| S7 | **Just completed (✓)** (f3) | Heat rises on draw better hands → draw → make apparel. The step dot becomes a **dashed empty circle** (⚠ the caption says "not drawn as a dot"). Ring stays on draw better hands. | `All` | Toast "sketched a hand → draw better hands · Undo"; card "＋ add one" | n/a | Enter: ✓. Leave: toast; Undo restores the step. |
| S8 | **Editing the step** | ⚠ Does the dot label update live? | ⚠ | Card becomes an editor. A smaller step stacks on top; clearing sets it down (Undo). | n/a | Enter: tap the step text. Leave: ⚠ Done/Return/blur. Swipe and toggle during an edit ⚠. |
| S9 | **Chain with no step** | ⚠ Dashed circle (f3) or nothing (f2: sew has no placeholder, and another chain's dot shows) | as S1/S2 | "＋ add one" | as S4/S5 | Enter: ✓ the last step, or swipe to a stepless chain. |
| S10 | **Large text or narrow screen** | Shipped: the picture is hidden (summary + list of buttons). Rev 11: ⚠ not addressed, and the ring has nowhere to show. | ⚠ | ⚠ The card has no context line any more (rev 9) | ⚠ | — |
| S11 | **Leaving and returning to Home** | ⚠ | ⚠ | ⚠ | ⚠ Shipped: leaving Home clears the selection. | — |

Transitions in revision 11, as far as they are defined:
- open → S1 (last-logged chain)
- swipe → S2
- Select → S3
- `‹ All` / Back → S1 ⚠ (S1 means "All with the default chain", but which chain is the default after a swipe?)
- toggle Log → S4 → type → S5 → Log → S6 (the slot flips back)
- ✓ → S7
- tap the step → S8
- web typing in S1/S2 → S5

## 2. Inconsistencies and ambiguities

1. **"Select" means three different things.** In f2, a swipe *focuses* sew and the chip claims a
   *scope* (make apparel), but the graph isn't narrowed. The brief says "Select: the graph narrows to
   the why's whole subtree and zooms". Rev 5 (owner) says "the carousel is just a means to select a
   subview", while rev 4 says "tapping the base scopes to that why". Whether a swipe narrows is
   undecided. The frames say no, the chip says yes.
2. **The ink ring has four meanings across five frames.**
   - default chain (f1)
   - swiped choice (f2)
   - the chain just completed (f3)
   - **the node just logged toward** (f4)

   In f4 the ring sits on *read* while the card says *sketch a hand*, so the graph and the card
   disagree about what's in focus. The "latest log" mark lost its home when the beads were removed
   (rev "revert the wanderer": "the latest log is the trail's fresh bead"), and the outline silently
   took over.
3. **Two "selected" looks.** The step dot is a white disc with a 1.5 px ink stroke, which is the same
   ink-on-light ring language as the selection outline. In f1 there are two ink rings stacked on one
   chain (the leaf's ring and the dot's stroke). In f2 the ring is on sew and the dot is on a
   different chain, so two chains look "selected".
4. **Which steps are drawn?** The brief says "the current step is a small labelled dot" (singular).
   f2 keeps draw better hands' dot while sew is focused. Read is never shown with a step. It isn't
   clear whether every chain's step is drawn (clutter at All) or only the focused one's (then f2 is
   wrong).
5. **The empty-step mark contradicts itself.** f3 draws a dashed empty circle where the step was,
   while its caption says "not drawn as a dot". f2 (also stepless, on sew) draws no placeholder.
6. **Selection at All vs in a scope.** At All, the card's chain is a default nobody chose. In a scope,
   it's presumably chosen. Neither the swipe range in a scope (only that subtree, or everything?) nor
   the landing leaf when a why has several leaves (make apparel → draw better hands or sew?) is
   specified.
7. **The attach target is undefined after a deliberate pick.** The default is a dashed suggestion
   ("not attached"). After a swipe or a tap on a node, it isn't said whether the Log face shows dashed
   "→ sew" or an attached chip. Shipped P-35 gives a **solid, removable chip on tap** (one fewer
   step). Revision 11, read literally, regresses that to tap the node, then Log, then the dashed chip.
8. **Two commit verbs on the Log face.** The text says "with words typed, ✓ logs them as the step",
   but f5 shows a **Log** button and no ✓. The ✓ lives on the other face, so "typed words count as
   the step" (D-6) has no visible path.
9. **Focus doesn't follow a log, or does it?** After f4's log toward read, the ring follows but the
   card stays. After a log the slot "flips back", but to which chain? On next open, the card goes to
   "last logged toward", which is now read, so the card silently moves between sessions.
10. **Selection lifetime is unstated.** Shipped rules: the selection lasts one log; leaving Home
    clears it; a tap on empty canvas clears it; removing the chip clears it. Revision 11's card always
    has a chain, so none of those rules can apply as written, and nothing replaces them. This covers
    tab switches, ✓, Undo, and Back at All (does it leave the app?).
11. **The chip's grammar breaks below one level.** `‹ All · make apparel` works at depth 1. Rev 6
    says "Back goes up a level", but at depth 2 the chip can't say both where Back goes and where you
    are. At All, `All` looks like a button and does nothing.
12. **Ring on a declared why.** Whys already have a double ring, so outlining one adds a third
    concentric ring. Rings then mean both "declared" and "selected".
13. **Context with the picture hidden.** Rev 9 moved context to the graph and the chip, but at the
    largest text the shipped app hides the picture. The card then says "sketch a hand" with no
    "toward", which breaks the owner's "at all times … I know my context and the next step".
14. **Unattached logs.** Revision 11 drops the dots and doesn't mention the shipped bridge question
    ("Toward something — or just itself?") or "+ What's next?" after a log. The bottom slot has no
    third face for them.

## 3. Recommended selection model

**Principle: three states, three marks, and each mark has one meaning.**

| State | Its only mark | Changed by |
|---|---|---|
| **Scope** (what's drawn) | narrowing + zoom, and the **chip** | tap a node that has children (narrow); chip or Back (up one level) |
| **Focus** (the card's chain) | **one ink ring** on the chain's leaf + **the one step dot** | swipe the card, tap a leaf, tap a node in the list |
| **Attach** (where a log goes) | a **chip on the Log face**: dashed = offered, solid with × = attached | a tap on the dashed chip, or a tap on a node while on the Log face |

**Heat** is data (recency). It never changes with focus or scope, and it isn't re-normalised when
narrowed. Nothing is dimmed. There is no "latest log" mark: the toast says where the log went and
the heat shows it.

### Visual spec
- **Focus ring:** 2 px ink (#18181B; light ink in dark mode), with a 3 px gap outside the circle (and
  outside a why's double ring). Only ever on a **leaf** node: a parent can't be focused, it can only be
  scoped. A why that is itself a leaf therefore shows its double ring plus the focus ring; the gap
  and weight keep them apart.
- **Step dot:** only the focused chain's step is drawn, as a **filled ink dot** (6 px) with its label,
  joined to the leaf by a thin tapered line. Fill, not ring, so it never reads as "selected". If the
  focused chain has no step, a **dashed ring with ＋** sits in the same place. It's tappable ("add a
  step", the same as the card's ＋).
- **Scope chip:**
  - At All, a non-interactive label `All` in muted text with no border, so it doesn't look tappable.
    Screen readers hear it as a heading.
  - In a scope, a bordered ink button `‹ <where Back goes> · <here>`, for example
    `‹ All · make apparel`, then `‹ make apparel · draw`.
  - Tapping it, system Back, or an edge swipe goes up one level. Back at All leaves the app as today.
- **Narrowing:** draw only the scope node and its subtree. The scope node becomes the anchor size.
  Zoom to fill over 250 ms (a cross-fade under Reduce Motion). Focus moves to the most recently
  logged leaf inside the scope, or the first leaf in graph order if none has been logged.
- **Swipe** moves focus to the next or previous chain **within the current scope**, in graph order,
  with a soft stop at the ends. It **never** changes the scope or the chip. The graph reacts by moving
  the ring and the step dot (a 150 ms slide, instant under Reduce Motion) and by panning if the leaf
  is off-screen. This is how "see the graph react" is met without zoom jumps between unrelated whys.
- **Where context lives:** the ringed leaf *is* "what the step is toward". The branch up from it,
  together with the chip, gives the rest. On the Log face, the attach chip names the leaf in text.
  When the picture is hidden (narrow or largest text), the card gains one muted line,
  "toward draw better hands". That is the only time the card carries context.
- **Log face:** a single **Log** button. ✓ lives only on What's next and always completes the step
  with the step's own text.
  - The dashed "→ <focused leaf>" chip is always offered. One tap makes it solid with ×.
  - A **tap on a node while on the Log face attaches it** (solid) and moves focus there. This keeps
    shipped P-35's one-tap attach.
  - The draft (text and chips) survives face flips and tab switches.
  - Attachment lasts one log; focus does not end with it.

### Lifetimes
- **Focus** persists through logs, ✓, Undo and tab switches. It **does not follow a log** (nothing
  moves without a tap). On a cold open, it goes to the chain last logged toward, at All. It is never
  stored.
- **Scope** persists through logs, ✓ and tab switches. A cold open resets it to All.
- **Attach** lasts one log, or until × is tapped. A tap on empty canvas does nothing. This differs
  from shipped, where it cleared the selection, but it removes an accidental loss of focus.

### Recommended state table

| State | Graph | Chip | Slot | Attaches to | Enter → leave |
|---|---|---|---|---|---|
| Empty app | — | — | cold start | — | first launch → Home with node focused |
| All · focus | whole graph; ring on focused leaf; its step dot (or dashed ＋) | `All` (label) | What's next: step + ✓, or "＋ add one" | nothing | open / `‹` at depth 1 → swipe (focus), tap parent (scope), Log |
| All · focus moved | same, ring and dot moved | `All` | that chain's step | nothing | swipe / tap leaf |
| Scoped | subtree only, zoomed; ring on a leaf inside | `‹ All · why` | that leaf's step | nothing | tap parent node → chip / Back |
| Log face | unchanged; the tab bar is under the keyboard | unchanged | log box, dashed "→ leaf", **Log** | nothing → chip tap / node tap → solid | Log toggle / web typing → Log / What's next toggle / Back |
| Just logged | heat transition on the path | unchanged | toast "words → leaf · Undo" (with the bridge question as its detail if unattached); slot back on What's next, **same focus** | — | Log → 6 s / Undo |
| Just ✓ | heat transition; next written step's dot, or dashed ＋ | unchanged | toast "step → leaf · Undo"; next step or "＋ add one" | — | ✓ → 6 s / Undo |
| Editing | step dot label updates live; swipe and toggle disabled | unchanged | inline editor with Done | — | tap step → Done / Return / Back |
| Picture hidden | list of nodes; the focused one carries the ink ring (border) and the `selected` trait | as above | card + "toward <leaf>" line | as above | font scale / width |

### Sketches

```
A. Open at All (default focus)        B. Swiped to sew (still All)
┌───────────────────────────┐        ┌───────────────────────────┐
│ Wanderment        ⓘ ⌕ ⚙  │        │ Wanderment        ⓘ ⌕ ⚙  │
│ All                       │        │ All                       │
│  ◎make     ◎feel    (gtr) │        │  ◎make     ◎feel    (gtr) │
│   apparel   product       │        │   apparel   product       │
│   /    \       |          │        │   /    \       |          │
│ (draw) (sew) (read)       │        │ (draw) ((sew)) (read)     │
│   |                ┐      │        │   |       ┊               │
│ ((dbh))            │      │        │ (dbh)    ◌＋              │
│    ●sketch a hand  │      │        │                           │
│┌─────────────────────────┐│        │┌─────────────────────────┐│
││What's next              ││        ││What's next              ││
││sketch a hand        (✓) ││        ││＋ add one               ││
│└─────────────────────────┘│        │└─────────────────────────┘│
│[ What's next ][   Log   ] │        │[ What's next ][   Log   ] │
└───────────────────────────┘        └───────────────────────────┘
((x)) = focus ring   ● = step dot   ◌＋ = no step yet   ◎ = declared why

C. Scoped to make apparel              D. Log face, attach offered
┌───────────────────────────┐        ┌───────────────────────────┐
│ ‹ All · make apparel      │        │ All                       │
│        ◎ make apparel     │        │  ◎make   ◎feel     (gtr)  │
│        /           \      │        │ (draw) (sew) (read)       │
│    (draw)          (sew)  │        │ ((dbh)) ●sketch a hand    │
│      |                    │        │┌─────────────────────────┐│
│   ((dbh))                 │        ││sketched three hands▍    ││
│      ●sketch a hand       │        ││┆→ draw better hands┆ [Log]│
│┌─────────────────────────┐│        │└─────────────────────────┘│
││What's next              ││        │[ What's next ][▓▓ Log ▓▓] │
││sketch a hand        (✓) ││        │ ░░░░░░ keyboard ░░░░░░░░ │
│└─────────────────────────┘│        └───────────────────────────┘
│[ What's next ][   Log   ] │        tap ┆chip┆ → [→ draw better hands ×]
└───────────────────────────┘        tap a circle → attaches it (solid)
```

### Screen readers and large text
- **The card is the control for focus:**
  - Name: "What's next: sketch a hand, toward draw better hands, draw, make apparel".
  - Custom actions: "Next chain" and "Previous chain" (VoiceOver adjustable / TalkBack actions).
  - Changing focus announces the new card name (polite).
  - No positions like "2 of 5".
- **✓ button:** "Complete sketch a hand". **＋:** "Add a next step toward sew".
- **Chip:** at All, the heading "All". In a scope, a button "Back to All, showing make apparel".
  Entering a scope announces "Showing make apparel".
- **Graph:** stays one image whose label is the summary. The list of nodes below it (as shipped)
  is the path through without pointing:
  - Leaves take focus (`selected` trait).
  - Parents scope ("make apparel, what it's for, shows its part").
  - On the Log face, a list item attaches.
- **Log face chip:** "Attach to draw better hands, suggested" / "Attached to draw better hands,
  remove".
- **At 200% text, or where `summaryOnly`:** the picture hides. The card gets its "toward …" line, the
  chip wraps to two lines rather than truncating the scope name, and the slot keeps the card and the
  toggle above the fold.

## 4. Ranked changes

1. **The outline means focus, and nothing else.**
   - On screen: the ring sits only on the leaf of the card's chain, and never marks the latest log.
     Redraw f4 with the ring on draw better hands.
   - Access path: visual only.
   - Why: f4's card and graph disagree today, and this one mark carries the whole selection model.
   - Risk: low. The latest log loses its own mark, so the toast and heat must carry it.
2. **A swipe moves focus; only an explicit tap narrows.**
   - On screen: a swipe never changes the chip or zooms. A tap on a parent narrows to it. Redraw f2
     with chip `All`, ring on sew, the graph whole.
   - Access path: swipe or the card's a11y actions; tap a node or a list item.
   - Why: it removes the chip/graph contradiction and avoids zoom jumps on every swipe.
   - Risk: medium. It reinterprets the owner's rev-5 "carousel selects a subview", so it **needs the
     owner's yes**. The alternative is: swipe narrows to the chain's top why, All is reached only by
     the chip, and every swipe across whys re-zooms.
3. **Draw only the focused chain's step, as a filled dot.**
   - On screen: one step dot (filled ink plus label), or a dashed ＋ when the chain has no step.
     Other chains' steps aren't drawn.
   - Access path: tapping the dot edits the step; tapping ＋ adds one.
   - Why: it fixes the two "selected" looks and f2's stray dot, and keeps one thing at a time.
   - Risk: low. Other chains' steps are reachable only by swiping (intended).
4. **Define the attach chip by its style.**
   - On screen: dashed = offered, one tap makes it solid with ×. A tap on a node while the Log face
     is up attaches it (solid) and moves focus there. Attachment lasts one log.
   - Access path: the chip, a node, a list item.
   - Why: nothing is attached without a tap, and it keeps shipped P-35's one-tap attach.
   - Risk: medium. It migrates `selected: Selection` into `focus` (session) plus `draft.toIds`
     (attach), and `act-from-node.spec.ts` needs rewriting.
5. **One commit verb per face.**
   - On screen: the Log face has **Log** only. ✓ (on What's next) completes the step with its own
     text. The draft survives flips.
   - Access path: the toggle.
   - Why: the brief and f5 contradict each other, and two commit verbs on one face is a decision too
     many.
   - Risk: low. D-6 ("typed words count as the step") loses its path, so the owner decides whether
     it's dropped or comes back later.
6. **State the lifetimes.**
   - Focus and scope persist through logs, ✓, Undo and tab switches. A cold open goes to All, focused
     on the chain last logged toward. Focus never follows a log. A tap on empty canvas does nothing.
   - Access path: n/a.
   - Why: revision 11 has no rules, and the shipped "one log / leaving Home clears" rules no longer
     fit.
   - Risk: low. Update DESIGN.md's P-35 line when this ships.
7. **Chip grammar.**
   - On screen: at All, `All` as a muted label. In a scope, the button `‹ <Back target> · <here>`.
     Chip and Back go up one level.
   - Access path: the chip, system Back, an edge swipe.
   - Why: depth 2 works, and the inert "All" stops looking like a button.
   - Risk: low.
8. **Scope entry and landing.**
   - On screen: narrowing draws the subtree only (not dimmed), zooms to fill, keeps absolute heat,
     and focuses the most recently logged leaf inside, else the first one in graph order. A swipe
     stays inside the scope.
   - Access path: tap a parent.
   - Why: it answers "which leaf" and "what does a swipe walk in a scope".
   - Risk: low to medium. Layout and zoom work in `overviewLayout`.
9. **Context when the picture is hidden.**
   - On screen: the card adds the muted line "toward <leaf>" only in `summaryOnly`. The list carries
     focus with an ink border and the `selected` trait. The card has full-path a11y names and
     next/previous chain actions.
   - Access path: font scale, screen readers.
   - Why: the owner's "always know my context" at every text size.
   - Risk: low.
10. **ⓘ sheet lines (not on screen):**
    - "Colour shows how recently you've been at something."
    - "A ring shows what's next is for."
    - "A dashed chip is a suggestion; tap to attach."

    Also put the bridge question in the log toast's detail when nothing was attached.
    - Access path: ⓘ.
    - Why: explanations stay off the screen per DESIGN.md.
    - Risk: low.
