# Discovery: the stack of intentions as a picture — forms and theory

_Scout report, 2026-11-22. Scope: visualization forms and the theory behind them, for the owner's
"literal stack … almost like a pyramid" note (2026-11-22). Mobile gestures and adjacent apps belong to
other scouts. Read first: DESIGN.md, STRATEGY.md, B-02 (D-5), the B-06 draft and mockups._

_Source note: in this session only github.com could be fetched directly. brendangregg.com,
observablehq.com, queue.acm.org, hacks.mozilla.org, grafana.com, wikipedia.org and jsdelivr were
blocked, so claims about those come from search-result excerpts of those pages. They're marked
"(via search)". A later pass with those hosts allowed should confirm the exact wording._

---

## What the owner is describing, named

The closest established names, best match first:

1. **A flame graph (an icicle chart with the root at the bottom) of intentions.** The flame graph is
   literally a picture of a *stack*. Each column is a call stack, the base frame is the root (Gregg's
   graphs have a frame labelled `all` at the bottom), each frame sits on the one that called it, and
   the **top edge is what's running right now**. Gregg: the top function is the one that "led to the
   profiling event"; everything beneath it is its **ancestry**. Swap "called by" for "toward" and you
   have the owner's picture. The base is the parent pursuit, each block stands on its why, and the
   top is the thing to do next. The data structure is the same too: push a step on top (B-02 "+ a
   step toward this"), pop it by logging (D-5).
2. **A zoomable icicle, or "hoisting".** Choosing any node as the anchor and redrawing its whole
   subtree from it as the base is the d3 *zoomable icicle* (click a node and it becomes the
   full-width root). Outliners call the same move *hoisting* (MORE, 1986) or *zooming into a
   bullet* (Workflowy).
3. **Small multiples of stacks.** "Swipe between them and see the current engagement for each
   subtree" means one tower per child of the anchor, side by side or paged. Read along the
   **skyline** (the tops of all the towers), it's the flame graph's top edge: what each branch is
   doing now.
4. **The theory under it is a goal hierarchy, or means–end chain.** Carver and Scheier's abstraction
   hierarchy, and Vallacher and Wegner's levels of action identification: going *down* answers
   **why**, going *up* answers **how**. Abstraction / why–how laddering is the same ladder used as a
   method. Popular productivity frameworks draw exactly this pyramid, with values at the base and
   tasks at the top: Hyrum Smith's *Productivity Pyramid* and GTD's *Horizons of Focus*, from the
   "runway" up to 50,000 ft. Both are planning systems, though (see the verdicts below).
5. **"Anything can be linked" makes it a DAG, not a tree.** Goal-systems theory names the two cases:
   **multifinality** (one means serves several ends, so one wander feeds several whys) and
   **equifinality** (several means serve one end, so sibling towers on one base). Profilers solve
   the multi-parent display with the **sandwich view**: pick one function, and its callers show on
   one side and its callees on the other.

**In one phrase:** an *anchored, zoomable flame graph of intentions*, root at the bottom, with the
top edge as "now", drawn **equal-width** (structure only, no amounts), with a sandwich view for
nodes that have several parents.

---

## What others do

### Root-at-the-bottom stacked hierarchies

**Flame graphs** (Brendan Gregg, released Dec 2011; *The Flame Graph*, ACM Queue / CACM, 2016).
- *Encodes:* the y-axis is stack depth. **Width is the number of samples** (an amount). The x-axis
  is sorted **alphabetically** to merge identical paths, so left-to-right means nothing; a
  **flame chart** puts time on x instead. Colour is arbitrary, by palette or a hash of the
  function name. (via search: [brendangregg.com/flamegraphs.html](https://www.brendangregg.com/flamegraphs.html),
  [CPU Flame Graphs](https://brendangregg.com/FlameGraphs/cpuflamegraphs.html),
  [FreeBSD 2014 slides](https://www.slideshare.net/slideshow/freebsd-2014-flame-graphs/41079747),
  [ACM Queue 2016](https://queue.acm.org/detail.cfm?id=2927301))
- *Interaction (primary, fetched):* the FlameGraph README says "Click a box to zoom the Flame Graph
  to this stack frame only", and offers regex search. `--inverted` gives an "icicle graph",
  `--reverse` gives a "stack-reversed flame graph" (merging from the leaf end), and `--flamechart`
  "sort[s] by time, do[es] not merge stacks". `--hash` keys colours to the name.
  ([github.com/brendangregg/FlameGraph](https://github.com/brendangregg/FlameGraph), fetched 2026-11-22)
- *Multiple parents:* a function reached by several paths appears **once per path**, which
  duplicates it. Recursion shows as repeated frames.
- *On a 390 px portrait screen:* the base is fine, but width halves at every branching. With 4
  children and then 3 grandchildren, a block is about 32 px wide, too narrow for a word. Profilers
  cope with hover tooltips and zoom, and phones have no hover.
- *Fit:* width = count breaks "no counts". The **equal-width variant** (each node splits its width
  evenly among its children) encodes only structure. Depth still shows as height, and a tall tower
  is a visible count of stacked steps (see "compressed tower" below).

**Icicle plots** (Kruskal & Landwehr, *The American Statistician* 37(2), May 1983,
[record](https://scilit.com/publications/582e6231d90675020cb972b8f4b51ee7)).
- The same adjacency layout with the root at the top, invented for showing cluster membership.
- On a phone, root-at-top matches reading and scroll direction (deeper means further down the page).
- The owner's picture is explicitly root-at-bottom; both are the same layout flipped.

**Zoomable icicle, d3** (Observable example, maintained by the d3 team; an older Bostock gist
[mbostock/1005873](https://gist.github.com/mbostock/1005873), date not confirmed).
- "Shows only three layers of the hierarchy at a time. Click a node to zoom in, or the left column
  to zoom out." (via search: [observablehq.com/@d3/zoomable-icicle](https://observablehq.com/@d3/zoomable-icicle))
- **Showing three layers at once** is the key idea for a phone: anchor + children + one more,
  re-anchored by a tap.
- The example's width is `sum(value)`, an amount, but any per-node value works, including equal
  shares. Built on `d3.partition()` ([d3js.org/d3-hierarchy/partition](https://d3js.org/d3-hierarchy/partition)).

**speedscope** (Jamie Wong; [github.com/jlfwong/speedscope](https://github.com/jlfwong/speedscope),
fetched 2026-11-22; [Mozilla Hacks, Nov 2018](https://hacks.mozilla.org/2018/11/cross-language-performance-profile-exploration-with-speedscope/)).
Three views:
- **Time Order:** stacks appear in the order they happened.
- **Left Heavy:** "identical stacks are grouped together", and the heaviest is placed left under
  each parent (via search, forks and npm listing). The idea worth borrowing is **a meaningful
  left-to-right order**: speedscope uses weight, and Wanderment would use recency.
- **Sandwich:** a table of functions. Selecting one shows "flamegraphs for all the callers and
  callees of the selected row" (README, fetched). The callers are drawn inverted above and the
  callees below, which gives the name.

Grafana Pyroscope adopted the sandwich view, crediting speedscope, in 2022
([Grafana blog, 2022-12-13](https://grafana.com/blog/2022/12/13/flame-graph-sandwich-view-mode-what-it-is-and-how-to-use-it), via search).
**This is the established answer to "one node, many parents" in a stack picture.**

**Inverted call trees** (Firefox Profiler and others).
- The profiler shows the same data as an indented **call tree** next to the flame graph, and
  "invert call stack" puts the leaves first
  ([call-tree doc](https://github.com/firefox-devtools/profiler/blob/0eae882b7df04d9d5049207ae59665a18b2d1814/docs-developer/call-tree.md)).
- A text tree as the twin of the picture is the profiler-world precedent for an accessible twin.

### Other space-filling and stacked forms

**Sunburst** (Stasko & Zhang, InfoVis 2000, [paper](https://faculty.cc.gatech.edu/~john.stasko/papers/infovis00.pdf)).
- The root is at the centre, and depth runs outward in rings. Angle usually encodes size, but
  equal angles are possible.
- The paper's own problem statement: deep items become "small, peripheral slices that are difficult
  to distinguish"; the fixes are focus+context and smooth transitions.
- A comparison study (Stasko et al., IJHCS 2000) found people preferred Sunburst to Treemap "due to
  its more explicit portrayal of the hierarchy structure" (via search).
- On 390 px: labels curve along arcs or don't fit, which is poor for text like "sketch a hand".
  There is no "top", so the "pop the top" reading is lost.

**Treemap** (Shneiderman, *ACM TOG* 11(1), 1992, [PDF](https://www.cs.umd.edu/users/ben/papers/Shneiderman1992Tree.pdf)).
- Built "to represent trees that have weights or sizes on the leaf nodes", so **area is the point**.
- Nesting depth is hard to read, and there's no up/down to carry why/how. An equal-area treemap is
  just a grid.

**DAGs in space-filling form** (Tsiaras, Triantafilou & Tollis, *DAGmaps*, JGAA 13(3), 2009,
[paper](https://jgaa.info/index.php/jgaa/article/view/paper190)).
- Turning a DAG into a tree for a treemap "scatter[s] the rectangles associated with the duplicates
  of a node around the display". Avoiding duplication isn't always possible, and deciding whether it
  is possible is NP-complete.
- **Takeaway:** any stack/pyramid picture of Wanderment's links will either duplicate shared wanders
  or need a rule for where each one lives.

**Pyramid / layer-cake diagrams.**
- The fixed-level pyramids (Maslow; the Franklin *Productivity Pyramid*: values at the base, then
  long-range goals, intermediate goals, daily tasks; [secondary](https://lifestack.ai/blog/pyramid-of-productivity))
  have **fixed, named levels** and a taper that's only decorative.
- GTD's **Horizons of Focus** runs from Runway (actions) up to 50,000 ft (purpose)
  ([gettingthingsdone.com, 2011](https://gettingthingsdone.com/2011/01/the-6-horizons-of-focus/)).
- Both are planning hierarchies with goals and reviews.
- In an equal-split partition the pyramid shape **emerges on its own** (the base is the widest), so
  no fixed levels are needed.

### Goal and intention hierarchy models

**Means–end chains and laddering.**
- Gutman (1982) and Reynolds & Gutman, *Laddering Theory, Method, Analysis, and Interpretation*,
  *J. Advertising Research*, 1988 ([PDF](https://is.muni.cz/el/1456/jaro2013/MPH_MVPS/39278324/LadderingTheoy_original.pdf)).
- Repeated "why is that important to you?" climbs from attributes through consequences to values.
- The aggregate picture, the **hierarchical value map**, is a layered DAG built from a "summary table
  of connections", with **line weight and cut-off levels set by counts**.
- Lesson: the ladder grows from the concrete end by asking "why", the same move as B-05's "what was
  it toward?".

**Why–how (abstraction) laddering.**
- Hayakawa (1939), used in design facilitation (LUMA Institute; [untools](https://www.untools.co/abstraction-laddering)).
- "Why?" moves up to broader framings, and "How?" moves down to more concrete ones.
- Sources note there's no controlled study of it; it's a facilitation method.
- **In the owner's pyramid, why is down and how is up.**

**Carver & Scheier's goal hierarchy** (*On the Self-Regulation of Behavior*, 1998; after Powers 1973).
- Subordinate goals are the means to superordinate ones; the lowest levels "define precisely what to
  do" (summary in Höchli, Brügger & Messner, *Front. Psychol.* 9:1879, Oct 2018,
  [open access](https://www.frontiersin.org/articles/10.3389/fpsyg.2018.01879/full)).
- Höchli et al. argue long-term pursuits go better when **the superordinate and the subordinate
  goal are in focus at the same time**. That's the pyramid's whole case: base and top in one view.

**Action identification theory** (Vallacher & Wegner, *Psychological Review* 94, 1987,
[Wegner's page](https://dtg.sites.fas.harvard.edu/DANWEGNER/wjh/actid.htm)).
- Any action can be named at levels from *how* (low) to *why* (high).
- People drift to higher-level identities when things go smoothly, and **drop to lower levels when
  they hit difficulty** (via search).
- So "+ a step toward this" (B-02) is the natural move when stuck. And after a smaller step is done,
  the view should show the higher identity again, which popping the stack does.

**Goal-systems theory** (Kruglanski, Shah, Fishbach et al., *Adv. Exp. Soc. Psych.* 34, 2002,
[record](https://scholars.duke.edu/individual/pub797832)).
- Goals and means form a network. **Multifinality:** one means serves several goals.
  **Equifinality:** several means serve one goal.
- Related findings:
  - **Dilution:** a means tied to more goals is seen as less instrumental for each
    (Zhang, Fishbach & Kruglanski, *JPSP*, 2007; citation via search).
  - People nonetheless *seek* multifinal means (UMD dissertations,
    [drum.lib.umd.edu](https://drum.lib.umd.edu/items/c950be47-ad88-4d24-b6de-1a707d432319)).
- **Design implication:** show a wander's several whys as plain words, and never weight or rank
  them. The network is a DAG, so the picture needs the DAG handling below.

**Opportunity solution trees** (Teresa Torres, Product Talk, 2016-08-10; [guide](https://producttalk.org/opportunity-solution-tree)).
- The outcome is at the root, with opportunities, solutions and assumption tests below it. The
  outcome is a *measured* metric.

**Impact mapping** (Gojko Adzic, 2012; [book page](https://gojko.net/books/impact-mapping)).
- Why (goal) → who (actors) → how (impacts) → what (deliverables), drawn as a mind map.
- Both are why-rooted trees **for planning bets against a target**.

### Focus+context, re-anchoring and semantic zoom

**Generalized fisheye views** (Furnas, CHI '86, [PDF](https://cspages.ucalgary.ca/~saul/581/exer.eps/4furnas86.pdf)).
- Degree of interest = a-priori importance − distance from the focus. What's near the focus or
  important shows in detail; the rest is elided.

**DOI trees** (Card & Nation, AVI 2002) and **SpaceTree** (Plaisant, Grosjean & Bederson, InfoVis
2002, [project](https://www.cs.umd.edu/projects/hcil/spacetree/index.shtml)).
- Branches are rescaled to fit the space, and branches that don't fit become a **triangular preview
  summarising the hidden topology**.
- An InfoVis Test-of-Time award.
- The triangle's size encodes the branch size (a count).

**Semantic zoom** (Pad++, Bederson & Hollan, UIST '94; [CHI '95 demo](https://chi1995.chistatic.hosting.acm.org/proceedings/demos/pad_bdy.htm)).
- Objects "change the way they look depending on their size … a simple method for representing
  abstraction".

**Hoisting and mirrors.**
- MORE (Dave Winer, 1986) had **hoist** (focus on one headline as if it were the whole document) and
  **clone** ("a dynamic copy of a headline at one or more other places", edits shared)
  ([outlinersoftware.com](https://www.outlinersoftware.com/archives/viewt/259)).
- Workflowy today has **zoom** ("the item you click will become the top most item") and **mirrors**
  (one bullet in several places, marked by a **diamond bullet**, with "See them" listing every place)
  ([workflowy.com/help/mirrors](https://workflowy.com/help/mirrors)).
- That's the outliner precedent for a node with several parents: show it in each place, **marked**,
  with a way to see all its places.

### Accessibility as a non-visual twin
- Zong, Lee, Lundgard, Jang, Hajas & Satyanarayan, *Rich Screen Reader Experiences for Accessible
  Data Visualization*, EuroVis 2022 ([arXiv](https://arxiv.org/abs/2205.04917)).
  - Three dimensions: **structure** (how entities are organised for traversal), **navigation**
    (structural, spatial and targeted moves) and **description** (content and verbosity).
  - A hierarchy is the natural structure for this.
  - Tested with 13 blind and low-vision readers, and implemented in the Olli library.
- WAI-ARIA APG **tree view** ([pattern](https://w3.org/WAI/ARIA/apg/patterns/treeview)): `aria-level`,
  `aria-expanded`, arrow-key navigation.
- The profilers' call tree (above) is the domain precedent.
- For Wanderment, the stack picture already *is* text in boxes, so built from Views it can be its own
  twin: a heading per anchor and child, one button per top.

---

## How each form handles the three hard parts

| Form | Several parents (DAG) | "Current engagement" with no counts | 390 px portrait | Amount encoded? Count-free variant? |
|---|---|---|---|---|
| Flame graph, root at bottom | duplicates per path | **top edge = now**; colour by warmth | 2–3 layers readable; deeper too narrow | width = samples → **equal split** |
| Icicle, root at top | duplicates | bottom edge = now (reads as "deepest") | same; matches scroll | same |
| Zoomable icicle | duplicates; zoom re-anchors | as above | **3 layers at a time, tap to re-anchor** | value-agnostic |
| Sandwich (speedscope) | **parents on one side, children on the other** | the selected node's top | 2 short stacks around one row | width = time → equal split |
| Sunburst | duplicates | outer ring, but no "top" | arcs too thin for text | angle → equal angle |
| Treemap | duplicates, scattered (DAGmaps) | none natural | text cramped | **area is the point** |
| Fixed-level pyramid | none (fixed levels) | top level = tasks | fine | taper decorative; levels imposed |
| Node-link graph (Home today) | natural (lines) | newest-log marker | crowded | no |
| Indented outline (+ hoist, mirrors) | mirror marker | the first child, or a label | **best for text** | no |
| HVM (laddering) | natural, layered | none | crowded | line weight = counts |

---

## Tooling options (rendering only)

What's already in `package.json`: Expo `~58.0.26`, React Native `0.88.1`, `react-native-svg`
`15.16.0` (used by `src/components/graph/HomeGraph.tsx` and `GraphCanvas.tsx`), Reanimated `4.7.1`
and Gesture Handler `~3.3.0`. There's no d3.

- **Plain React Native Views (recommended).**
  - A stack/flame layout is rectangles of wrapping text: `flexDirection: 'column-reverse'` gives root
    at the bottom, and a flex row of equal `flex: 1` children gives the equal split.
  - Views give native text wrapping, Dynamic Type / large text, real buttons and headings, and web
    semantics for free.
  - Cost: nothing new to install, no native build, no bundle cost. It works on web, iOS and Android,
    and is offline by nature.
- **react-native-svg (already installed).**
  - Good for the connecting lines (base to towers) or a thumbnail.
  - SVG `<Text>` doesn't wrap, and its accessibility is weaker than Views. Use it only for the
    decoration.
  - No added cost.
- **Reanimated 4 (already installed).**
  - For a re-anchor transition (the zoomable-icicle "grow to full width"); it must respect Reduce
    Motion, as DESIGN.md requires.
  - No added cost.
- **d3-hierarchy `partition()`: not needed.**
  - The equal-split layout is a few lines in `src/domain`, testable with vitest.
  - The hard part is turning derived links into a tree from an anchor (cycles, multiple parents),
    which d3 doesn't solve.
- **@shopify/react-native-skia: doesn't fit.**
  - It's a native module, and Expo documents it for SDK 58
    ([docs.expo.dev v58 skia](https://docs.expo.dev/versions/v58.0.0/sdk/skia.md)).
  - The web build loads CanvasKit WASM, **2.9 MB gzipped**, and the bundle cost is about 6 MB on iOS
    and 4 MB on Android ([react-native-skia docs](https://shopify.github.io/react-native-skia/docs/getting-started/installation)).
  - Canvas text isn't accessible.
  - All of that is heavy for boxes of text.
- Swipe/pager tooling is left to the interaction scout.

---

## Borrowable ideas

Best first. "Big" uses `docs/product/briefs/README.md` (a new screen or navigation entry, near a
DESIGN.md rule, size L, …).

### 1. The anchored stack: an equal-width flame graph, three layers at a time
- **What:** from an anchor (default "All", which is literally the flame graph's `all` root frame; a
  why; or any wander), draw the anchor as a full-width base. Its children stand on it as equal-width
  towers (equifinality, side by side), and each tower is that child's B-02 step stack, with the
  staged step on top.
  - At most three layers at a time (d3 zoomable icicle).
  - Children are ordered **left = most recently touched** (speedscope's left-heavy order, with
    recency instead of weight).
  - The colour is DESIGN.md's warmth (and can be turned off).
- **From:** Gregg's flame graphs; the d3 zoomable icicle; speedscope Left Heavy.
- **Why it matters here:** it's the owner's picture exactly. The base, the why, the top edge as "what
  I'd do next", and you read the **skyline** to see every branch's current engagement at once. The
  persona panels' strongest line ("the reason next to the step") becomes spatial: look down for
  why, up for how.
- **Verdict: fits if changed.** Width must not encode activity counts: use an equal split, not link
  counts (DESIGN.md "no counts"). Tower height must not grow with chain depth (see #2). Order by
  recency, never by amount.
- **Size:** L. **Big: yes.** It's a new view on Home or Explore, it changes P-34's Home line, and
  it's near the "no counts" rule. It needs a brief, or to go in as option D of B-06.

### 2. The compressed tower: top, "toward", base, with the middle folded
- **What:** each tower shows only three parts: **the top** (the staged step, the only tappable block,
  per D-5), **the one beneath** (its "toward …"), and **the base** (the wander). If the stack is
  deeper, there's a fixed-height seam (⋮) that opens on request.
- **From:** semantic zoom (Pad++); fisheye elision (Furnas). It deliberately differs from
  SpaceTree's previews, which are sized by the branch.
- **Why it matters here:**
  - B-02's refinements already say "only the top and one 'toward …' are ever visible", and the
    panel warned that "long stacks read as counts". A literal stack whose height is its depth is a
    bar chart of how much is left.
  - Höchli et al. (2018) and action identification both say the useful pair is the **highest and the
    lowest** level in view together, not the middle.
- **Verdict: fits** (it applies D-5 and the B-02 refinements to the picture). Every tower has the same
  height, whatever its depth.
- **Size:** S on top of #1. **Big: no** on its own.

### 3. The sandwich view for a wander with several whys
- **What:** when the anchor is a wander that feeds more than one why (multifinality), the base splits
  into a thin "for" strip, one tile per why it's for, in words ("for: make apparel · feel
  productive"). The towers of its own steps and feeders stand above it.
  - Tapping a "for" tile re-anchors there.
  - Nothing is weighted: tiles are equal width, ordered by recency.
- **From:** speedscope's Sandwich (callers on one side, callees on the other); Grafana Pyroscope.
- **Why it matters here:** "anything can be linked" means anchoring on a shared wander must show
  *all* its reasons without drawing it twice. The dilution research is a reason to show the several
  whys as plain words, never as shares.
- **Verdict: fits if changed.** The "for" links are derived from activities (DESIGN.md: never
  stored), so the strip shows only links that logging has earned. No weights or counts.
- **Size:** M. **Big: yes** (it's near the derived-links rule, and it's part of #1's brief).

### 4. Shared wanders in "All": one home, plus a mirror mark
- **What:** in a view rooted at All, a wander that feeds two whys gets its full tower in **one** place
  (under the why it most recently fed). In the other place it shows as a slim tile with a mirror
  mark and "also toward …", which re-anchors on tap.
- **From:** Workflowy mirrors (the diamond bullet, "See them"); MORE clones; the DAGmaps finding that
  duplicates scatter.
- **Why it matters here:** the B-06 panel rejected option B partly because "a wander feeding two whys
  showed up twice". This keeps one tower per wander and still says it serves both.
- **Verdict: fits.**
- **Size:** S. **Big: no** (a display rule, with no stored change).

### 5. Cycle-safe unrolling from an anchor (domain function)
- **What:** a pure `subtreeFrom(anchor)` that walks the derived links (doing → to, reversed) and stops
  when a node is already on the current path. It shows a "↺ also feeds <name>" stub instead of
  recursing.
- **From:** how flame graphs render recursion (repeated frames); DAG-to-tree unrolling.
- **Why it matters here:** DESIGN.md allows both "drawing → apparel" and "apparel → drawing", so the
  derived graph **has cycles**. Without this, any stack view loops or drops nodes.
- **Verdict: fits.** It's derived, never stored.
- **Size:** S. **Big: no.** (Light rigor: no data change. It needs vitest cases for cycles, diamonds
  and self-links.)

### 6. Re-anchor ("hoist") from any node, with the base as the way back
- **What:** tapping any block makes it the base (zoomable icicle). Tapping the base steps down to its
  parent (its *why*); in the icicle example it's the left column that zooms out.
  - The trail of anchors reads as a sentence ("feel productive ▸ make apparel"), not a breadcrumb of
    counts.
  - Re-anchoring is temporary and not remembered, like the B-06 panel's focus filter: "All" is
    always one tap away, and the change is announced.
- **From:** d3 zoomable icicle; MORE hoist; Workflowy zoom.
- **Why it matters here:** it's the owner's "scope that at any level". DESIGN.md's Explore
  (single-centre view) is already a re-anchored node-link view, so this is its stack-shaped twin.
- **Verdict: fits** (within the B-06 panel's rules for a focus: labelled, announced, not remembered,
  respects Reduce Motion).
- **Size:** M. **Big: yes** if it's a new navigation state on Home; part of #1.

### 7. "Down is why, up is how" as the only two growth gestures
- **What:**
  - On top of a tower: "+ a step toward this" (B-02, the how).
  - Under a base with no why: "what's it for?" (B-05, the why).
  - No other ways to add.
- **From:** why–how laddering; laddering interviews; action identification (when stuck, go down a
  level).
- **Why it matters here:** it gives both existing prompts a place in space and a reason. A smaller
  step is the expected move when something feels hard, which isn't failure, and that's a warm-return
  framing.
- **Verdict: fits.** Copy and placement only.
- **Size:** S. **Big: no.**

### 8. The top block: future and past look different
- **What:**
  - A tower whose wander has a staged step shows it solid and tappable ("↳ sketch a hand · Log
    this").
  - A tower with no staged step shows the latest activity as a quiet, non-tappable cap ("You left
    off: hemmed trousers"), styled as past.
  - No blank "+ next step" caps (the B-06 panel's refinement 1).
- **From:** the flame graph's top edge ("what's on-CPU now") versus the frames beneath ("ancestry").
- **Why it matters here:** it shows "current engagement" without counts. Each branch's top is either
  what you'd do next or where you left off, in your own words.
- **Verdict: fits.**
- **Size:** S. **Big: no** (inside #1).

### 9. The non-visual twin is the same Views, in tree order
- **What:**
  - The anchor is a heading, and each tower is a group whose name starts with its visible text:
    "draw, toward make apparel. Next: sketch a hand, toward draw better hands. Log this."
  - Only the top is a button. "2d" is read as "2 days ago".
  - Re-anchoring announces "Showing make apparel".
  - Move between towers with the screen reader's own rotor or headings, not a custom pager.
- **From:** Zong et al. 2022 (structure, navigation, description); the ARIA tree view pattern;
  profiler call trees.
- **Verdict: fits.** Build it with RN Views, not SVG text.
- **Size:** S–M. **Big: no.**

### 10. Degree of interest from warmth, not from counts
- **What:**
  - Order and fold the children of an anchor by Furnas' DOI, using **recency** (DESIGN.md's warmth)
    as the a-priori importance, and distance from the anchor.
  - Cold branches fold into one constant "Earlier" tile at the end of the skyline.
  - Never size or fold by activity count.
- **From:** Furnas 1986; DOI trees (Card & Nation 2002).
- **Why it matters here:** it caps width on 390 px without a number, and it matches the existing
  21-day Earlier rule. Caveat from B-06 refinement 4: after a month away, nothing is warm, so the
  last few touched must still show.
- **Verdict: fits if changed.** Importance is recency only. Earlier shows no count of what's inside.
- **Size:** S. **Big: no.**

### Doesn't fit (kept so they aren't re-proposed)
- **Width or area by activity count** (proportional flame graph, treemap, HVM line weights, SpaceTree
  previews sized by branch): DESIGN.md "No counts are shown"; the B-06 panel refused per-row counts.
- **Flame chart (time on the x-axis):** activities have no durations, and a timeline of steps reads
  as a schedule (STRATEGY "no plans for the how"; never timers).
- **Differential flame graphs** (colouring change between two periods): this is a trend, i.e.
  progress (never % complete).
- **Fixed-level pyramids** (Productivity Pyramid, GTD horizons) as structure: they impose levels,
  goals and reviews (never goals; "no plans for the how"). Only the metaphor is borrowed.
- **Opportunity solution trees and impact maps** as structure: the root is a measured outcome and
  the leaves are planned bets (never goals; no plans for the how). The why-rooted shape is already
  in #1.
- **Sunburst as the main view:** not a rule break but legibility. Text on thin arcs fails at 390 px,
  and there's no "top" to pop. It could only be a tiny decorative glyph.
- **Showing the whole chain as a literal tower by default:** B-02's refinements (only the top and
  one "toward" visible; the chain on request). Replaced by #2.

---

## Open questions for the owner

1. **Root at the bottom or the top?** At the bottom it's the flame graph and your words: the base is
   near the log box, and next steps sit high on the screen. At the top it's an icicle: it reads and
   scrolls like the list, and next steps are lowest, by the thumb. Same layout, flipped.
2. **How much of a chain shows in a tower?** All of it (a literal stack, whose height is a count) or
   top + "toward" + base with the middle folded (#2, as B-02 decided)?
3. **What's on top when nothing is staged:** "You left off: …" in a past style (#8), or nothing?
4. **A wander serving two whys:** under "All", one home and a mirror tile (#4), or a full tower in
   both? And when it's the anchor, the "for" strip under it (#3)?
5. **What counts as a child?** Links are derived and counted. Does one activity "doing X → to Y"
   make X a child of Y in the stack, or only recent links (inside the 21-day window)? This decides
   how noisy the skyline is.
6. **Is a pager position ("2 of 4") acceptable?** It's a structural count of siblings, not progress,
   but pressure-sensitive personas may read it as a count. Screen readers announce set position
   unless it's suppressed.
7. **Where does it live?** In B-06, as Home's stack (replacing option A's rows), as Explore's
   stack-shaped twin, or as a toggle between the picture and the stack.
