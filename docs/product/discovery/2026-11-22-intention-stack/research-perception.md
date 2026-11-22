# Research audit: the intention stack, through perception, infovis and HCI

_2026-11-22 · lens: how the eye reads the stack on a 390 pt phone and gets to "what next", one-handed, in a
few seconds. Inputs: `.polish/product/stack-shots/` (mockup page and frames 1–4), Home today
(`b05-shots/7-home-with-why.png`), `B-06-draft.md`, `discovery-stack-{viz-forms,mobile}.md`,
`docs/DESIGN.md`, `docs/product/PERSONAS.md`, `src/theme.ts`. Motivation science and wellbeing/ethics are
covered by the other two auditors and are out of scope here._

**Source note.** Page fetches were blocked in this session (homes.cs.washington.edu, ar5iv.labs.arxiv.org and
typeset.io don't resolve), so findings come from search excerpts, marked **(via search)**, or from the
standard literature, marked **(lit.)**, meaning well-known results not re-read here. The discovery docs
already cover Furnas's degree of interest, Zong et al. as a structure, Hoober 2013's grip split, NN/g's
carousel basics and the tooling. They're cited here only where this lens adds something new.

**Measurement note.** The mockup phone is 290 px wide for a 390 pt screen, so the scale is ×1.345. Text in
the frames works out to: block text 9.5 px ≈ 12.8 pt, "next" labels and the page title 8.5–9 px ≈ 11.4–12 pt,
graph labels 8 px ≈ 10.8 pt. Vertical positions are given as a share of the screen's height, from the top.
Contrast ratios are computed from `theme.ts` with the WCAG formula.

---

## How the eye reads it today

Bottom-up salience is driven mainly by luminance contrast, filled area/size, and a feature no neighbour
shares (Treisman & Gelade 1980 (lit.); Healey & Enns 2012; Wolfe & Horowitz 2017). It is pulled away from a
target when the distractors share its feature (Duncan & Humphreys 1989). Top-down, people on a phone scan
from the top (NN/g 2018: 57% of viewing time is above the fold). They also learn where things live
(Wolfe & Horowitz's "search history" factor; contextual cueing, Chun & Jiang 1998 (lit.)).

### Frame 1: anchored at "All", one page per why
1. **First:** the darkest, most solid shapes are the black **"make apparel" chip** (≈ 27% down) and the black
   **Log** button. The bold "Wanderment" title is close behind. A navigation state is the strongest signal
   on the screen.
2. **Second:** the **base** ("make apparel", ≈ 74% down) is the largest filled coloured area: accent tint, an
   accent border and bold accent text, the full width of the card. It also gains from the *lower-region*
   figure cue, since regions low in a display are seen as "figure" (Vecera, Vogel & Woodman 2002).
3. **Third:** the filled beige **wander-name blocks** ("draw", "sew"). They're filled, so they outweigh the
   steps above them.
4. **Fourth:** the **steps** ("sketch a hand", "buy fabric"). They're white on a white card, set apart only by
   a 1.5 px accent outline and semibold text. That outline colour is shared with the base, the graph's why
   nodes, the lit graph nodes, the trail links, the mirror row's chevron and the Home tab. Seven kinds of
   element share it, so it can't pop out (Duncan & Humphreys: high similarity between target and
   distractors).
5. The top 35–40% of the card is **empty**. On a top-down scan, the eye enters the card, meets a faint title
   (#8A867E, 3.6:1) and then a blank space, and falls to the base.
6. **Where the decision happens:** in the **mirror row** ("↳ Log: sketch a hand", ≈ 84% down). It's the only
   place that names **one** step in action language. The stack offers two "next" steps (three, counting the
   peek's "finish ch. 4"), and nothing says why the mirror picked "sketch a hand". So the eye goes base →
   steps → mirror row, and the decision is "accept the mirror's pick", not "choose from the stack".

### Frame 2: re-anchored on "draw"
- First: the black "draw" chip, then the "draw" base (tint and accent), then the step ("sketch a hand").
  There's now one step in the card, at the **top of a single tower**, so in top-down reading order it is
  the first block inside the card.
- The graph thumbnail dims the rest, which works (Cockburn, Karlson & Bederson 2008's "cue-based" class,
  via search).
- The decision is clean: one step, and the mirror row repeats it. "draw" is written four times (graph,
  trail, chip, base).

### Frame 3: after a pop
- First: the **dark toast**, the highest-contrast element. Then the base, then the mirror row.
- The new top ("draw better hands") is drawn **plain**, with no "next" styling. The mirror row offers it as
  the next step anyway, so the stack and the mirror disagree about what the top is.
- The empty space grows to about half the card.
- The graph thumbnail and the tab bar are missing here. If that's deliberate, everything shifts about
  62 pt between states (see "Layout stability" below).
- **Change-detection risk:** the pop happens while attention is on the log box, the keyboard is closing and
  a toast is arriving. A change made during a disruption tends to go unseen unless attention is on it
  (Rensink, O'Regan & Clark 1997, via search).

### Frame 4: one wander, two whys
- First: the black "be a better writer" chip, then the base. Then the **dashed ◇ "read" tile**. At four
  lines it's taller than the actual step ("outline essay") beside it, so the pointer elsewhere outweighs the
  thing to do here.
- The graph thumbnail is missing at "All" here but present in frame 1 (inconsistent).

### Overall
In every frame the **why** wins attention (good for meaning) and the **next step loses to the navigation
chrome**: the black chip, the toast and the filled name blocks. The decision really happens in the mirror
row. That's an accident of layout, not a design. **The owner's instinct is right:** the decision needs one
deliberate place.

---

## Strengths the research supports

1. **Equal widths, no area encoding.** Length and area are read as magnitude (Cleveland & McGill 1984,
   lit.). Equal towers keep the picture from implying "more effort here", which suits *no counts*. Strong
   evidence, a strong fit.
2. **Layered rectangles are a legible hierarchy form.** Icicle plots matched or beat the alternatives in a
   12-person controlled study: treemaps were slowest and least accurate for hierarchy tasks, and icicles
   were slightly preferred over sundown charts (Woodburn, Yang & Marriott, VIS 2019, via search). This is
   moderate evidence for the form, though not for its orientation (see Cautions).
3. **A short tower is seen almost at a glance, so orientation matters little for reading.** A capped tower
   (top + one "toward" + base, ≈ 150 pt ≈ 25 mm) spans about 5° at 30 cm, one or two fixations.
   Root-at-bottom therefore doesn't fight top-down reading at this size. The step is also the first block
   inside the card on a top-down pass (frame 2), and the base is the ground. This is reasoning from visual
   angle, not a study, but it's the argument for **keeping the cap** (≤ 3 layers).
4. **Anchoring the base gives a stable position.** When a pop removes the top, the base and the steps below
   don't move. Spatial consistency lets people remember where things are and cuts search time, and
   stability with scaling "dramatically outperformed reflowing" (Scarr, Cockburn, Gutwin & Malacria,
   CHI 2013, via search).
5. **The mirror row sits in the best spot for the hand.**
   - Touches are faster and more accurate toward the screen's centre, at 7 mm there vs 12 mm at the corners
     (Hoober 2017, via search).
   - The thumb's reachable area is limited and depends on grip (Bergstrom-Lehtovirta & Oulasvirta, CHI 2014,
     via search).
   - At ≈ 84% down and full width, the mirror row is a large, close target with a low Fitts index of
     difficulty (Fitts 1954, lit.). Log sits about 50 pt below it, so Load then Log is almost no travel.
6. **Recognition over recall.** The step is the person's own words, shown, not something they have to
   remember. "Left off" is a recognition cue for picking up again (Nielsen's heuristics, lit.).
7. **Animated re-anchoring helps people build a mental map.** Animating a viewpoint change improved people's
   ability to rebuild the space, at no cost in time (Bederson & Boltman, InfoVis 1999, via search).
   Animated transitions can significantly improve graphical perception (Heer & Robertson, InfoVis 2007, via
   search). This supports the zoomable-icicle "tap the base to go in".
8. **A peeking next page is the strongest cue that more exists.** NN/g calls partial content at the edge "a
   strong cue", and low-contrast dots a weak one (NN/g, mobile carousels, via search). Baymard found people
   miss hidden items without such a cue (via search). Named chips go further and turn "how many" into
   "which".
9. **A hierarchy suits non-visual reading.** Zong et al. (EuroVis 2022, 13 blind and low-vision readers)
   found that hierarchical structure, with navigation and description, helps people "conceptualize data
   spatially" and "selectively attend … at different levels of granularity" (via search, abstract-level).
   The stack built from Views is already that twin.

---

## Refinements

Each refinement gives the change, the finding behind it, its fit with DESIGN.md and a size. "Big" follows
`docs/product/briefs/README.md`.

### R1. One place for the decision: the next-step spotlight (see the next section). **M · big** (Home's layout, near P-34/D-6).

### R2. Give the colours one meaning each, and stop chrome outshining the step
- **Change:**
  - Keep accent for **whys** (the base, why nodes in the graph): it's the app's existing meaning.
  - Take the accent outline **off the steps in the stack** and draw them as white, semibold ink with a 1 pt
    `line` border.
  - Make the selected chip **ink text with a 1.5 pt ink outline**, not a black fill. Black fill is then
    left for the one primary action (Log).
  - Make the name blocks ("draw", "sew") **unfilled**: ink text, no fill, sitting on the base as labels.
- **Finding:**
  - Luminance contrast and filled area dominate bottom-up salience (Healey & Enns 2012).
  - A target is found efficiently only when it differs from its distractors and the distractors are alike
    (Duncan & Humphreys 1989).
  - Too many categories on display at once makes outliers harder to find (Haroz & Whitney 2012, via
    search).
- **Fit:** fits. It's visual only. Persona E: less noise. Persona D: the why keeps its colour.
- **Size:** S.

### R3. Size the pager to its contents: no empty space above the towers
- **Change:** the page height is the tallest *possible* page at that anchor (the cap makes it known: top +
  one "toward" + fold + base, or at "All": top + name + base). Make that the fixed height, so it never
  jumps and never leaves an empty space. Alternatively, top-align the tower group and keep the base under
  it.
- **Finding:** a top-down scan meets the space first, and the lower-region cue then pulls the eye to the
  base (Vecera et al. 2002). The empty space also pushes the steps away from the screen's centre, where
  touch is most accurate (Hoober 2017).
- **Fit:** fits. It keeps the "fixed height" rule from discovery-stack-mobile #4.
- **Size:** S.

### R4. Make "standing on" literal: contact, not gaps
- **Change:**
  - Blocks in a tower **touch** (0–1 pt seam, shared border), and the tower **touches** the base.
  - Leave clear air **between** towers (≥ 8 pt).
  - Today it's 3 pt inside a tower, 5 pt between towers and 5 pt from tower to base, so proximity can't
    tell "on top of" from "next to".
- **Finding:** connected regions group more strongly than nearby ones (uniform and element connectedness,
  Palmer & Rock 1994, via search). Han, Humphreys & Chen 1999 found proximity can be as fast, so the
  evidence is moderate. Common region (Palmer 1992) is already given by the card.
- **Fit:** fits.
- **Size:** S.

### R5. Show "toward" without the word, but keep the word
- **Change:** a small down-chevron notch in the seam between blocks, pointing from a step to its why. Keep
  the small word "toward" for screen readers and first use.
  - **Don't taper** the tower into a pyramid. Width would then read as quantity (Cleveland & McGill), which
    breaks "equal widths".
- **Finding:**
  - Stacking alone says "built on", not a direction. In profilers the direction is a learned convention
    (Gregg), not something seen.
  - The foundation metaphor (theories are buildings, *Metaphors We Live By*, Lakoff & Johnson 1980, lit.)
    supports "base = why", but not "toward". That needs an arrow or a word.
- **Fit:** fits.
- **Size:** S.

### R6. Don't use ⋮ as the fold mark
- **Change:** show folded layers as **two thin "edge" slivers** under the top block (Wallet-style, as
  discovery-stack-mobile #5 suggests) or a horizontal "· · ·". No number.
- **Finding:** ⋮ ("more_vert") is the platform's overflow-menu icon on Android and the web (Material, lit.).
  People will read it as "options". Conventions are part of what guides search: scene structure and meaning
  (Wolfe & Horowitz 2017).
- **Fit:** fits (no count).
- **Size:** S.

### R7. One meaning for a dashed outline
- **Change:** DESIGN.md already uses a dashed outline for a *suggested* doing. Keep dashed for "**not here /
  not yet**" (suggestion, the ◇ mirror tile). Show "left off" as a **caption with no box**: muted italic
  text sitting on the tower's top, so a past activity doesn't look like a block on the stack. Shorten the
  ◇ tile to one line, "◇ read · also toward feel productive", so it isn't taller than a real step.
  - Today the "left off" dashed border is `line` #E3DFD6 on white, **1.3:1**. That's invisible to low
    vision, and below WCAG 1.4.11's 3:1 if the box carries meaning.
- **Finding:** one visual variable should carry one meaning (Bertin 1967, lit.).
- **Fit:** fits.
- **Size:** S.

### R8. Small text contrast: "next", the page title, the graph labels
- **Change:** use `muted` (#5E5B55, **6.8:1**) for any text that carries meaning. `faint` (#8A867E) is
  **3.6:1** on white, which fails WCAG 1.4.3's 4.5:1 for 11–12 pt text. Drop the page title entirely (R10).
  Graph labels at ≈ 10.8 pt are too small to read: treat the thumbnail as a decorative overview
  (`aria-hidden`, which it already is) and never put meaning there alone.
- **Finding:** WCAG 2.2, lit.
- **Fit:** fits (Persona F).
- **Size:** S.

### R9. Layout stability across states
- **Change:**
  - The graph thumbnail, chips, pager, spotlight and log box keep the **same positions in every state**.
    Frames 3–4 drop the thumbnail and frame 3 drops the tab bar, so if that's deliberate, don't.
  - The toast **overlays** the bottom of the pager rather than pushing the spotlight and log box up.
  - The anchor only changes when the person taps.
- **Finding:**
  - Spatial stability beats reflow for finding things (Scarr et al. 2013, via search; Cockburn, Gutwin &
    Greenberg 2007: practised users move from visual search to faster decisions as layouts stay put, via
    search).
  - Layout shifting under a finger causes mis-taps.
- **Fit:** fits. "Capture is sacred": the log box never moves.
- **Size:** S.

### R10. Cut what's said twice
- **Change:**
  - Drop the page title ("toward make apparel" repeats the base).
  - Hide the trail at "All", where it reads just "All": show it only once you're anchored below.
  - Keep the chips as the way between siblings (they're the accessible tabs).
  - At "All" the why's name appears **four times** (graph, chip, title, base); this takes it to two.
- **Finding:**
  - Showing the same information again at the same time adds load (the redundancy effect, Sweller and
    colleagues, lit.). That evidence comes from teaching material, so it transfers only moderately.
  - Three ways to navigate the same tree at once (graph, trail, chips) split attention.
- **Fit:** fits (Persona E).
- **Size:** S.

### R11. Make "All" readable without swiping, or accept that page 2 is seen less
- **Change:** two options for the owner.
  - **(a)** At "All", keep the pager but put the **spotlight's "toward" line** to work (R1): swiping is
    then for looking, not finding.
  - **(b)** At "All", show the whys as a **vertical** run of short cards (each its base and its top steps,
    ≤ 3 whys by DESIGN.md's cap), and use the horizontal pager only inside a why to move between its
    wanders.

  (b) is more robust to the evidence. (a) keeps the owner's carousel everywhere.
- **Finding:**
  - The first item of a carousel sets expectations, and people may skip the rest, so critical content
    shouldn't depend on it (NN/g, via search).
  - Vendor data says engagement "falls off a cliff after four" panels (Contentsquare, via search; vendor,
    weak).
  - This is moderate evidence for home-page promos and weaker for your own content browsed on purpose
    (Weather-style). But a why on page 2 having its step seen less is a real risk to the "what's next"
    glance.
- **Fit:** fits either way. (b) touches P-34's line.
- **Size:** (a) S · (b) M · (b) is **big**.

### R12. Large text: switch layout instead of squeezing
- **Change:** at accessibility text sizes (iOS AX sizes; Android font scale ≥ ≈ 1.5), towers stop being
  side by side. Each page becomes a top-down list: the base as a heading **at the top**, then each tower as
  a row ("**sketch a hand** ↳ toward draw"). Nothing is hidden: the cap's ⋯ opens the full chain.
  - At 200%, three columns of about 100 pt each wrap "sketch a hand" one word per line, and a fixed-height
    card clips.
- **Finding:**
  - Apple's guidance is to switch a horizontal stack to vertical as text grows, keeping the default layout
    at normal sizes (WWDC24 "Get started with Dynamic Type", via search).
  - WCAG 1.4.4 (resize to 200%) and 1.4.10 (reflow), lit.
- **Fit:** fits. This is B-06 A's list, which the panel liked for Persona F.
- **Size:** M.

### R13. Screen-reader order: root first, using `column-reverse`
- **Change:** build each tower and page with `flexDirection: 'column-reverse'`. Then the base is **first in
  the accessibility and DOM order** (heading: "make apparel, what it's for") and drawn at the bottom; the
  steps follow, each as a button that names its "toward". react-native-web maps this to CSS
  `column-reverse`, and screen readers follow DOM order.
- **Finding:** Zong et al.'s structure is overview first, then drilling down (via search, design rationale).
  WCAG 1.3.2 asks for an order that keeps the meaning, not the visual order.
- **Fit:** fits (F).
- **Size:** S. **Caution:** keyboard Tab will move bottom-to-top on web. That's consistent with the
  structure, but test it with a sighted keyboard user.

### R14. Motion budget
- **Re-anchor:** the tapped block grows into the base in one simple 200–250 ms ease-out step, with **no
  staggering** of blocks. A crossfade under Reduce Motion.
- **Pop:** the top block fades and lifts out in about 150 ms. Nothing else moves, because the base is
  anchored.
- **Never:** a looping or attention-seeking animation.
- **Finding:**
  - Use simple transitions, and staging only for complex ones (Heer & Robertson 2007; their guidance as
    summarised in course slides, via search).
  - Staggering showed no benefit for tracking objects (Chevalier, Dragicevic & Franconeri, InfoVis 2014,
    via search).
  - Motion grabs attention in the periphery better than colour or shape, but distracts and irritates
    (Bartram, Ware & Calvert 2003, via search).
  - Apple's Reduce Motion guidance: dissolves and highlight fades are fine.
- **Fit:** fits. DESIGN.md respects Reduce Motion, and Persona E fears animation for its own sake.
- **Size:** S.

### R15. Target sizes in the real build
- **Change:** at the mockup's scale the chips come out ≈ 31 pt tall, and the mirror row and log box
  ≈ 39 pt. Build them at the theme's 44 pt minimum. The spotlight should be ≥ 56 pt (below). The chips and
  trail sit 22–27% down, the hardest zone to reach. That's acceptable only because swiping the pager
  (mid-screen) and tapping the base (≈ 74% down: "go in", and its trail parent: "go back") cover the
  frequent moves.
  - Add: **tapping the peeking page edge goes to that page**. It sits at the right edge mid-screen, within
    reach of a right thumb.
- **Finding:**
  - Parhi, Karlson & Bederson (MobileHCI 2006, via search): 9.2 mm (one target) / 9.6 mm (a series) for
    one-handed thumb use. That's ≈ 55–58 pt on current iPhones, larger than 44 pt.
  - Hoober 2017: accuracy worsens toward the corners.
- **Fit:** fits.
- **Size:** S.

---

## The next-step spotlight

> Owner: "maybe the highlight there should be like a highlighted section that prompts the next step that is
> a separate view on top of the already displayed stack."

**Verdict: fits if changed. It's the single strongest change available.** Today the decision happens in the
mirror row by accident (see "How the eye reads it today"). Making that row the deliberate, one-at-a-time
**decision surface**, with the stack as its context, matches focus+context: the context stays visible, and
one item is drawn at higher detail. It also matches Wolfe's learned-location guidance: a target that always
lives in one place is found by position, not searched for.

"On top of" should mean **a layer above the stack, docked at the bottom**. It shouldn't mean a card
floating over the middle of the stack:
- an overlay over the stack **hides the context** it exists to give;
- it reads as modal;
- it sits away from the thumb;
- a highly styled box set apart from the content risks being **skipped as promotion**: NN/g's banner
  blindness research found people ignore even legitimate content with ad-like placement or treatment (via
  search).

### The form, concretely
- **Where:** docked directly above the log box, full width with 16 pt margins. It **replaces** the mirror row
  rather than adding to it (≈ 80–86% down).
  - It's a layer: elevation 1 (a soft 0 2 8 rgba(0,0,0,.08) shadow) on `bg`.
  - At rest the pager **ends above it** (R3), so it covers nothing. If Home scrolls, the stack slides under
    it, like a mini player.
- **Size:** ≥ 56 pt tall (Parhi's 9.2 mm). Two lines:
  - **Line 1:** "↳ **sketch a hand**", 17 pt semibold ink, wrapping to 2 lines and never truncated. ↳ is
    already the app's next-step sign (crumb, the D-6 chip).
  - **Line 2:** "toward draw · make apparel", 13 pt `muted`: the stack in one line, so the why and the how
    are read in **one fixation** (Wickens & Carswell's proximity compatibility principle, Human Factors 1995,
    via search: information used together belongs together).
  - **Right:** "Load", as text, not an icon.
- **How it differs from the stack:**
  - It's the **only elevated, white-on-cream card with a 1.5 pt ink border** (ink #18181B is about 17:1 on
    white) and the largest text in the lower half.
  - The stack's steps are flat with a 1 pt `line` border (R2).
  - **Accent stays with the why**, which keeps the app's one meaning for it. That makes position + size +
    elevation the "next" signal, not hue. Position is the most accurate and most learnable channel
    (Cleveland & McGill; contextual cueing).
  - **The tether:** the matching step in the visible page gets the same 1.5 pt ink border, so similarity links
    the two across the gap, and the eye can check "which one" in a single glance (this addresses frame 1's
    ambiguity).
- **What it shows:**
  - The visible page's next step.
  - If the page has several steps, **the one in the tower you most recently logged into**: neutral recency,
    deterministic, and the same rule "You left off" uses. Tapping another step in the stack loads that one
    (today's crumb rule), and the spotlight follows it.
  - If the page has **no staged step**, the slot stays (so the layout is stable) and shows "You left off:
    hemmed trousers" in muted text: no accent, no button look, no "+ next step" homework.
  - This choice between several steps is also a values question. **Flag it to the autonomy/ethics auditor**:
    perceptually there must be exactly one, but *which* one is theirs to weigh.
- **How it behaves:**
  - **Tap = load** into the log box (D-6; nothing completes).
  - **Swiping pages:** the text **crossfades** in about 150 ms (instant under Reduce Motion). It never slides
    with the pager: a still frame keeps the learned position.
  - **After a log pops the top:** the text changes to the new top with a **one-time** tint fade of about
    600 ms. This is the local cue that defeats change blindness. Under Reduce Motion, the colour change
    alone, plus an announcement ("Next for draw: draw better hands"). No pulse, no loop, no badge (Bartram
    et al.).
  - **While the log box has focus:** it collapses, and the loaded step lives in the log box's existing "↳ step"
    chip. One copy, and the keyboard's space goes to capture.
  - **At large text** (R12): if docked it would take > 25% of the viewport, **undock** it into the page flow
    above the log box. WCAG 1.4.10 cautions against sticky regions eating a zoomed viewport.
  - **Screen readers:** one button, "Next for draw: sketch a hand, toward make apparel. Load into log box",
    after the page region and before the log box.

### Alternatives weighed
| Form | Reading order | Reach | Context | Verdict |
|---|---|---|---|---|
| **Docked spotlight above the log box** (above) | last on a top-down pass, but at a learned position | best (centre-low, wide) | stack fully visible; "toward" line inline | **Recommended** |
| Spotlight inside the card, filling the empty space above the tower ("Next: …" banner over its tower) | first inside the card | mid-upper; fine for most grips, worse one-handed | next to its tower (best proximity) | Runner-up; pick it if the mirror row is dropped and reach tests well |
| The step itself grows in place (semantic zoom: bigger, two lines with "toward") | top-down first | mid-screen | best | Good as the *tether*, not as the only signal: it moves with every page and tower height |
| A floating overlay card over the stack | first | mid | hides the stack | Doesn't fit: hides the context, modal feel, risk of being skipped as promotion |
| Flip to an icicle (next nearest the thumb) | natural | best | loses the owner's pyramid | Not needed: the spotlight solves reach |

**Size:** M (UI only; restyles the mirror row, adds the tether and the empty state). **Big: yes.** It
changes Home's layout and sits next to D-6 and the "after logging" rule, so fold it into B-06 as a
revision.

---

## Cautions

- **No study settles which way up a tree should be read.** Burch et al. (TVCG 2011; PacificVis 2013)
  varied root orientation across four directions and found radial layouts worse. Their orientation results
  weren't retrievable here (via search). EasyView's (2023) "top-down views most helpful" refers to call-tree
  direction (caller → callee), not to visual orientation. Treat the pyramid as a **metaphor choice** that is
  safe at a ≤ 3-layer cap, not as research-backed.
- **Hick-Hyman applies weakly here.** The log₂(n+1) law fits practised choices among equally likely options.
  Choosing *what to do* is a value judgement, and novices are dominated by visual search (Cockburn et al.
  2007). The direction holds (fewer visible tops, one default: faster), but not the numbers.
- **The spotlight is a default, and defaults steer.** That's the other auditors' ground. From this lens:
  if there's one, it must be one, at a stable spot, picked by a rule the person can see.
- **Banner blindness cuts both ways.** If the spotlight is dressed up (icons, coloured fill, CTA copy) it
  may be skipped. Keep it plain, in the person's own words.
- **Redundancy and split-attention findings come from teaching material** (Sweller and colleagues). They
  transfer to UI directionally, not quantitatively.
- **Carousel evidence is mostly about home-page promos** (NN/g, Notre Dame/Contentsquare vendor numbers).
  Your own content, browsed on purpose, likely fares better. Test R11 with real use before committing to (b).
- **`column-reverse` (R13)** reverses keyboard Tab order on web. Test it with VoiceOver, TalkBack and a
  sighted keyboard user before relying on it.
- **Mock vs build:** several issues here (tiny text, 31 pt chips, missing tab bar) may be mockup shortcuts.
  They are listed so the build doesn't inherit them.

---

## Sources

Classic results cited from the literature and not re-read here are marked (lit.). Everything else was
confirmed via search excerpts.

- Treisman, A. & Gelade, G. (1980). A feature-integration theory of attention. *Cognitive Psychology* 12. (lit.)
- Healey, C. & Enns, J. (2012). Attention and visual memory in visualization and computer graphics. *IEEE TVCG* 18(7). [PDF](https://www.csc2.ncsu.edu/faculty/healey/download/tvcg.12a.pdf)
- Wolfe, J. & Horowitz, T. (2017). Five factors that guide attention in visual search. *Nature Human Behaviour* 1, 0058. [nature.com](https://www.nature.com/articles/s41562-017-0058) · [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC9879335)
- Duncan, J. & Humphreys, G. (1989). Visual search and stimulus similarity. *Psychological Review* 96. (via [PMC citing summary](https://pmc.ncbi.nlm.nih.gov/articles/PMC3345177))
- Haroz, S. & Whitney, D. (2012). How capacity limits of attention influence information visualization effectiveness. *IEEE TVCG* 18(12). [PDF](https://whitneylab.berkeley.edu/PDFs/Haroz_Whitney_2012_InfoVis.pdf)
- Chun, M. & Jiang, Y. (1998). Contextual cueing. *Cognitive Psychology* 36. (lit.)
- Cleveland, W. & McGill, R. (1984). Graphical perception. *JASA* 79. (lit.) · Bertin, J. (1967). *Sémiologie graphique*. (lit.)
- Vecera, S., Vogel, E. & Woodman, G. (2002). Lower region: a new cue for figure–ground assignment. *JEP: General* 131(2). [PubMed](https://pubmed.ncbi.nlm.nih.gov/12049239)
- Palmer, S. (1992). Common region. *Cognitive Psychology* 24. · Palmer, S. & Rock, I. (1994). Rethinking perceptual organization. *Psychonomic Bulletin & Review* 1. · Han, Humphreys & Chen (1999), *Perception & Psychophysics*. [Palmer PDF](https://palmerlab.berkeley.edu/pdf/Palmer.pdf)
- Lakoff, G. & Johnson, M. (1980). *Metaphors We Live By*. (lit.)
- Woodburn, L., Yang, Y. & Marriott, K. (2019). Interactive visualisation of hierarchical quantitative data: an evaluation. IEEE VIS. [arXiv](https://arxiv.org/abs/1908.01277)
- Burch, M. et al. (2011). Evaluation of traditional, orthogonal, and radial tree diagrams by an eye tracking study. *IEEE TVCG* 17(12). [record](https://puma.ub.uni-stuttgart.de/bibtex/60c20995cbbeeec6ff91994e87676421) · Burch et al. (2013). Visual task solution strategies in tree diagrams. PacificVis. [dblp](https://dblp.org/rec/conf/apvis/BurchAAHRW13.html)
- EasyView (2023). Bringing performance profiles into IDEs. [arXiv](https://arxiv.org/pdf/2312.16598)
- NN/g, Fessenden, T. (2018). Scrolling and attention. [nngroup.com](https://www.nngroup.com/articles/scrolling-and-attention/)
- NN/g. Carousels on mobile devices. [nngroup.com](https://www.nngroup.com/articles/mobile-carousels/) · Designing effective carousels. [nngroup.com](https://www.nngroup.com/articles/designing-effective-carousels/)
- NN/g. Banner blindness revisited. [nngroup.com](https://www.nngroup.com/articles/banner-blindness-old-and-new-findings/)
- Baymard. Truncating product gallery thumbnails. [baymard.com](https://baymard.com/research-articles/truncating-product-gallery-thumbnails) · Contentsquare (vendor). [blog](https://contentsquare.com/blog/web-carousels-design/)
- Hoober, S. (2017). Design for fingers, touch and people, part 3. UXmatters. [uxmatters.com](https://www.uxmatters.com/mt/archives/2017/07/design-for-fingers-touch-and-people-part-3.php) · Hoober (2013), in discovery-stack-mobile.
- Bergstrom-Lehtovirta, J. & Oulasvirta, A. (2014). Modeling the functional area of the thumb on mobile touchscreen surfaces. CHI. [record](https://researchr.org/publication/Bergstrom-LehtovirtaO14)
- Parhi, P., Karlson, A. & Bederson, B. (2006). Target size study for one-handed thumb use on small touchscreen devices. MobileHCI. [MSR](https://www.microsoft.com/en-us/research/?p=155150)
- Fitts, P. (1954). *JEP* 47. · Hick (1952); Hyman (1953). (lit.)
- Cockburn, A., Gutwin, C. & Greenberg, S. (2007). A predictive model of menu performance. CHI. [record](https://researchr.org/publication/CockburnGG07)
- Scarr, J., Cockburn, A., Gutwin, C. & Malacria, S. (2013). Testing the robustness and performance of spatially consistent interfaces. CHI. [PRISM](https://prism.ucalgary.ca/items/002efab2-3e14-4ee7-b7e3-6a3f79fae67f/full)
- Cockburn, A., Karlson, A. & Bederson, B. (2008). A review of overview+detail, zooming, and focus+context interfaces. *ACM CSUR* 41(1). [PDF](https://www.microsoft.com/en-us/research/wp-content/uploads/2008/01/cockburn-ComputingSurveys09.pdf)
- Furnas, G. (1986). Generalized fisheye views. CHI. (in discovery-stack-viz-forms)
- Heer, J. & Robertson, G. (2007). Animated transitions in statistical data graphics. InfoVis. [UW IDL](https://idl.uw.edu/papers/animated-transitions) · [UW course slides](https://courses.cs.washington.edu/courses/cse442/18au/lectures/CSE442-Animation.pdf)
- Bederson, B. & Boltman, A. (1999). Does animation help users build mental maps of spatial information? InfoVis. [DRUM](https://drum.lib.umd.edu/handle/1903/984)
- Chevalier, F., Dragicevic, P. & Franconeri, S. (2014). The not-so-staggering effect of staggered animated transitions on visual tracking. *IEEE TVCG* 20(12). [HAL](https://hal.archives-ouvertes.fr/hal-01054408v1)
- Rensink, R., O'Regan, J. K. & Clark, J. (1997). To see or not to see. *Psychological Science* 8. [abstract](https://www.cs.ubc.ca/~rensink/flicker/abs.97.3a.html)
- Bartram, L., Ware, C. & Calvert, T. (2003). Moticons: detection, distraction and task. *IJHCS* 58. [PDF](https://www.interruptions.net/literature/Bartram-IJHCS03.pdf)
- Wickens, C. & Carswell, C. M. (1995). The proximity compatibility principle. *Human Factors* 37(3). [record](https://researchr.org/publication/WickensC95)
- Sweller, J. (1988). Cognitive load during problem solving. *Cognitive Science* 12; Chandler & Sweller (1991). (lit.)
- Zong, J. et al. (2022). Rich screen reader experiences for accessible data visualization. EuroVis / *CGF*. [arXiv](https://arxiv.org/abs/2205.04917) · [MIT News](https://news.mit.edu/2022/data-visualization-accessible-blind-0602)
- Apple, WWDC24 "Get started with Dynamic Type". [video](https://developer.apple.com/videos/play/wwdc2024/10074/) · HIG Layout. [page](https://developer.apple.com/design/human-interface-guidelines/layout.md) · Larger Text criteria. [help](https://www.developer.apple.com/help/app-store-connect/manage-app-accessibility/larger-text-evaluation-criteria)
- WCAG 2.2: 1.3.2, 1.4.3, 1.4.4, 1.4.10, 1.4.11, 2.5.8. (lit.)
