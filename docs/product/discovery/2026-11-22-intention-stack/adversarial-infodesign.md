# Adversarial information-design review: Home's intention stack, revision 5

_2026-11-22. Lens: Tufte (data-ink, chartjunk), Bertin (visual variables), Munzner (expressiveness,
effectiveness), Cleveland & McGill (ranking of channels). Sources: `stack-shots/v5-frame-1..5.png`,
`intention-stack-v5.html` (scratchpad mockup), shipped `b05-shots/7-home-with-why.png`,
`src/components/graph/HomeGraph.tsx`, `src/domain/overview.ts`, `src/domain/selectors.ts` (warmth),
`docs/DESIGN.md`, `B-06-rev4-note.md`, `docs/product/briefs/B-06-intention-stack.md`._

## Verdict in one paragraph

The claim "the graph is mostly decoration" is **half proven**. Nodes, edges and vertical position
carry real structure: what exists, what feeds what, and how deep it sits. That part earns its ink.
But the graph is sold as "the picture of your energy", and almost nothing in it encodes energy.
The only marks that try are the dots. In the v5 mockup they encode no recoverable data:

- Their **position** is hand-placed, or in shipped code a "nearest free slot".
- Their **lines are gone**, so you can't tell what each dot names.
- Their **colour and size** repeat the selection the card already made.

So the owner's instinct is right. Today the most-emphasised "energy" in the picture is whatever chain
the app lit, and the dots make that look like data. **Cut the persistent dots. Carry energy as
recency (warmth) on the nodes and edges themselves. Keep a short-lived landing pulse as the only
per-log mark.**

---

## 1. Inventory: every mark and channel

Measured contrast is against the page background `#F5F3EE`. WCAG 1.4.11 needs at least 3:1 for
graphics, and the shipped code comments say the same.

| Mark / channel | Data encoded | Decodable without explanation? | Earns its ink? |
|---|---|---|---|
| **Node chip (rect + name)** | A wander exists and is in view | Yes: it's a label | **Yes.** It's the vocabulary of the picture. |
| **Accent border + accent-ink text on a node** | "This is a why" (nominal) | Partly. Accent reads as "important", not as "what it's for". After one ⓘ read it's learnable | **Yes**, but only if accent means *only* this (see overload below). |
| **Tint fill on a why** (mockup: only when lit) | Why ∧ in the lit chain | No. It's a third state you can't tell apart from "selected" (shipped uses the same tint for selection) | **No.** It's redundant with the edge highlight and collides with the selection style. |
| **Ink border 1.6 + bold on a non-why** (mockup) | In the lit chain | Yes, together with the edges | Weakly. It's the third copy of "lit". |
| **Opacity 0.4 on everything else** (mockup, "All") | Not in the lit chain | Yes, but it reads as "inactive / unimportant", which is false | **No, and harmful.** Text drops to 2.27:1 and why text to 1.88:1. The one view that "shows every node" makes most of them unreadable. |
| **Vertical position (rows)** | Depth: why → wander → sub-wander (ordinal) | Yes. Trees are read top-down, and the card's path reads why → leaf in the same order | **Yes.** It's the strongest channel (position, Cleveland & McGill rank 1), spent on the right attribute. **But** in the mockup "guitar" (a loose wander with no parent) sits on the sub-wander row (y 250), and sew/draw jitter (160 vs 150). Position then implies a depth it doesn't have. |
| **Horizontal position** | Nothing (a stable slot, by creation order) | It shouldn't be read, and it isn't | **Yes, as stability** (keeps the mental map), as long as it never pretends to mean something. |
| **Edge (line between nodes)** | A doing → to relation exists | Yes | **Yes.** It's the reason this is a graph, not a list. |
| **Edge direction** | Shipped: an arrowhead toward the why. Mockup: none, so it's implied by "up" | Shipped: yes. Mockup: only if up always means toward | OK, as long as rows are strictly by depth. |
| **Edge width** (shipped `linkWidth`: 1.5 / 2.5 / 3.5 from **all-time counts**) | How many logs ever went this way | Read as "more here". That's exactly the "amount" reading | **No.** It breaks the research recommendation (equal widths, B-06 refinement 5) and recency neutrality: it's all-time, never decays. It's a count drawn as a stroke. |
| **Edge colour/width in the mockup** (accent 2.2 if lit, `#D8D2C7` 1 px otherwise) | In the lit chain (selection), nothing else | The lit edge is decodable. Unlit edges are **1.36:1**, so effectively invisible | Lit: redundant with the card. Unlit: fails contrast, so the structure of "All" disappears. |
| **Dot** (shipped: 10 px grey, 14 px accent for newest; mockup: r 3 grey / r 3.6 accent) | One of the ≤ 8 most recent logs that name a shown wander | Shipped: through its lines. Mockup: **no** | See §2. Shipped: marginal. Mockup: **chartjunk.** |
| **Dot → node lines** (shipped only) | Which wanders that log named | Yes | They carry everything the dot means. But a log with doing + to draws a second, grey copy of an edge that's already drawn (in shot 7, draw–make apparel appears as an accent link **and** two grey segments through the big dot). |
| **Dot colour** (mockup: accent if its wander is lit, `#B9B3A8` otherwise = **1.88:1**) | The selection again | Yes, and that's the problem | **No.** It adds zero bits, and makes unlit activity vanish (see §2). |
| **Dot size** (mockup 3 → 3.6) | The selection again | No. A 20 % radius change on a 6 px dot is below what people reliably notice | **No.** |
| **Newest marker** (shipped: big accent dot until the next log; mockup frame 4: a dot with a ring) | "Your last log landed here" | Yes, at the moment you log | **Yes, briefly.** It's useful feedback. As a lasting state it's a "last log" badge that the toast already covers. |
| **Narrowing (sub-view)** | Scope = this subtree | Yes. The card says "All › …" | **Yes** as a way to focus, but the narrowed picture has very little in it. Frame 2 is 2 nodes and 3 dots in about 60 % of the screen. |
| **Accent hue overall** | In the mockup: why, lit edges, lit dots, newest ring, tint, step numbers | No. One hue, five meanings | Breaks the audited rule "one meaning per colour, accent only for whys" (B-06 refinement 4). |

**Tally.** Structure (nodes, edges, y, why-accent) carries information. Selection is encoded
**four times**: the card text, accent edges, accent and larger dots, and dimming everything else.
Energy is encoded **zero times** in the mockup. In shipped code it's encoded only as a count (edge
width) and a tally (dots).

## 2. The dots

### What they encode

- **Shipped** (`overview.ts`):
  - the ≤ 8 most recent logs that name a wander in the picture, newest first;
  - each dot goes in the free 44 px spot "nearest the threads it names", in two bands between the
    node rows;
  - a line goes to every wander the log names, the newest is larger and accent, and tapping a dot
    opens that activity.
- **Mockup:** the same dots without the lines. Their coordinates are hand-placed. Colour and size
  show whether the dot's wander is in the lit chain.

### Failure modes

1. **Position is spent on nothing.** "Nearest free spot" is a layout leftover, not data. With no
   lines (mockup), the only way to attribute a dot is proximity (Gestalt), and the mockup's own
   coordinates break it:
   - the "read" dot at (150,110) is nearer sew (59 px) than read (64 px);
   - the "draw better hands" dot at (66,184) is nearer draw (42 px) than draw better hands (53 px);
   - the direct "feel productive" log at (200,92) sits *on* the read → feel productive edge, so it
     reads as a read log;
   - the draw log at (60,100) sits on the draw → make apparel edge, so it reads as a flow along the
     link, not a log to draw.

   Every attribution a viewer makes from these dots is a guess.
2. **The window is a count, not a time.** "The last 8 logs" means 40 minutes for someone logging a
   busy afternoon and 6 weeks for a weekly logger. The same picture means different things for
   different people, and one burst erases a fortnight. This works against DESIGN.md's time-based
   recency (warmth halves every 14 days, Earlier after 21 days).
3. **Dots are a covert count.** Three dots by "draw better hands" and one by "read" is a tally:
   isotype counting by eye. DESIGN.md forbids counts and the research backs that (Etkin 2016). Dots
   bring the count back as unit marks.
4. **Clustering misattributes in proportion to activity.** A busy wander's dots run out of nearby
   spots and spill toward its neighbours. The more you do something, the more of it lands near
   something else.
5. **The 8-cap reshapes the graph.** The newest log can pull its wander into the picture, replacing
   the last one picked (`overview.ts` ~l.180). A log meant as data changes which nodes exist on Home.
6. **Colour by lit chain is circular.** At open, the card sits on "the chain last logged toward".
   That chain gets the accent dots, and the rest go to 1.88:1 grey. So the picture says "your energy
   is in make apparel" *because the app lit it*. A viewer can't tell a selection from a finding.
7. **The newest marker is persistent state for a moment's event.** It's right at the moment of the
   log, and noise until the next one. The toast already says "what was logged where".

### Verdict: **cut as persistent marks; re-encode the meaning elsewhere**

What dots try to say ("where my energy has gone lately") is worth showing. Free-floating unit marks
are the wrong carrier. Alternatives:

| Option | How | Pros | Cons |
|---|---|---|---|
| **A. Warmth on nodes and edges** (recommended) | Node border/text and edge stroke **value** (light → dark ink) from DESIGN.md's warmth (last touched, halves every 14 days). Edges use the last time a log went *that way*. Quantise to 3 steps: within 2 weeks / within 3 weeks / Earlier. Floor the faintest at ≥ 3:1. Equal widths. Follows the "shading off" setting | Bertin: value is ordered, a good fit for ordered recency. It's on the thing itself, so there's no attribution problem. It's time-based, not count-based, so it's not a tally. It reuses a sanctioned rule and the existing `warmth()`. Edges show *which pathways are alive*, which is the closest honest reading of "energy" | It loses the per-log tap target (Activities and the wander page cover it). Three steps leave little room inside the 3:1 floor. Must not use the accent hue (that's for whys) |
| **B. A trail on the edge** | Up to 3 small beads *on* the edge a log travelled, newest nearest the receiving node, fading with warmth. Direct logs get a tick on the node rim | Position becomes meaningful (on the path). It reads as movement toward the why, which is the owner's "energy" picture | Still countable (a tally of ≤ 3). Crowds short edges. Logs to two wanders double-draw. More layout work |
| **C. Node halo by recency** | A soft ring around nodes touched within 14 days | Compact. Nothing to place | A halo is area: it reads as "bigger / more" (the research recommendation against area). It competes with the selection outline. Almost binary. Says nothing about *pathways* |
| **D. Latest log as text in the card** | "last: sketched a hand · 2d" as a third line | Exact, decodable | Breaks the owner's two-line card. It repeats the toast. It turns the card into history, not "what now". Use it in the node's accessible name and on the wander page, **not** the card |

Keep one per-log mark: a **landing pulse** on the node (or edge) the log went to, for about 3 s.
Under Reduce Motion it's a static outline until the next interaction. It gives "every log visibly
lands" without leaving a badge behind.

## 3. Does the graph represent "energy"?

**The 5-second read of frame 1:** "make apparel → draw → draw better hands is the highlighted thing;
feel productive → read is another tree; sew, read and guitar are greyed out; some dots float
around."

The honest conclusion is "*the app is pointing at make apparel*". The likely wrong conclusion is
"*most of my energy goes to make apparel, and sew and read are inactive*". Nothing in the data says
that: dimming is selection, not activity. Frames 2–5 (narrowed) show 2–3 nodes and a few dots. They
show scope, not energy.

**The single most important thing it should show:** *which of my pursuits, and which pathways toward
my whys, are alive lately, and which are resting*. Do it by encoding recency (warmth) on what's
already there:

- darker edges where logs have recently gone doing → to;
- darker nodes recently touched;
- resting ones lighter but still legible;
- nothing dimmed for selection.

Then the 5-second read becomes "lately I've been drawing toward make apparel and reading toward feel
productive; guitar has been resting." That's an energy picture with no count, no %, and no
judgement. Resting is a lighter value, not a warning, and it's neutral by DESIGN.md.

## 4. Dividing the work: graph and card

| | Graph (the terrain) | Card (the trail, two lines) |
|---|---|---|
| Owns | Structure (what feeds what, depth), **aliveness** (warmth), *where the card is* as a locator | **This one chain in words** (context path) + **the next step** + ✓ |
| Must not | Repeat the chain path in heavy emphasis. Dim everything else. Show the step text (good: v5 already removed shipped's "↳ step" under nodes). Make selection look like a finding | Carry energy or history ("last touched", latest log, counts). Repeat the why more than once |

Selection gets **one** quiet encoding in the graph: a 2 px ink outline on the chain's nodes and an
ink stroke on its edges. It's not accent (that's for whys), it's not a fill, and it never fades the
others. Warmth stays the only "energy" channel, so selection and energy never share a variable.

## 5. Ranked recommendations

All of these stay within the rules: no counts or progress, equal treatment of wanders, minimal text,
and an accessible twin in words.

1. **Cut the persistent dots and their lines on Home.** Replace them with a ≤ 3 s landing pulse on
   the node or edge the log went to (static outline under Reduce Motion). The toast keeps Undo and
   "what was logged where". This also stops the newest log from pulling nodes in and out (failure
   mode 5).
2. **Encode energy as warmth on nodes and edges:**
   - use value (ink darkness), never width or area;
   - 3 steps aligned to DESIGN.md: within 14 days / within 21 days / Earlier;
   - floor at ≥ 3:1;
   - edge warmth comes from the last log along that doing → to;
   - it obeys the existing shading toggle (off = all full ink).
3. **Make selection one quiet channel:** an ink outline on the lit chain. Remove the 0.4 dimming, the
   accent edges, the accent dots, and the lit-only tint. Accent means "why", nothing else (B-06
   refinement 4).
4. **Equal edge widths.** Delete the shipped `linkWidth` count steps (1.5 / 2.5 / 3.5 from all-time
   counts). That's a count drawn as width, and it never decays.
5. **Rows mean depth only.** Loose wanders (no parent, e.g. guitar) go in their own band, e.g. a
   bottom shelf, never on a depth row. Same-depth nodes share an exact baseline (no 150/160 jitter).
6. **Contrast floor of 3:1 for every mark, 4.5:1 for every label.** Today unlit edges are 1.36:1,
   grey dots 1.88:1, dimmed labels 2.27:1 and dimmed why labels 1.88:1.
7. **An accessible twin of the picture, in names, never truncated.** For example: "What it's for:
   make apparel, fed by draw and sew; feel productive, fed by read. Lately: draw, read. Resting:
   guitar. You're on draw better hands." Shipped clips this line with `numberOfLines={1}`, so "sew"
   is lost to an ellipsis in shot 7. Put the full sentence in the image's accessible name. Visible,
   it can stay one line, but "Lately / Resting" is the part to keep.
8. **The latest log goes in the node's accessible name and on the wander page**, e.g. "draw, last:
   sketched a hand, 2 days ago" (it uses the existing `ageLabel`). Not in the card.
9. **Logs-only mode (no wanders yet):** dots with nothing to name are pure tally. Show the "Lately:
   …" sentence, or the log texts as quiet chips, instead.

**Expected effect.** About half the marks are removed. Energy goes from zero encodings to one
honest one. Selection goes from four encodings to one. Every remaining mark answers one question:
**structure** (nodes, edges, rows), **aliveness** (value), **why** (accent), or **where I am**
(outline).
