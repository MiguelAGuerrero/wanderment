# B-10 — Fewer parts: a calm journal in a playful world

**Status:** proposed · **Decision:** D-17 · **Theme:** Capture anywhere / Seeing flow / Warm return · **Date:** 2026-11-24

Mockups (local): `.polish/product/b10-shots/` — today: `1-rest-390x844.png`, `after-lit-phone.png`,
`after-sheet-phone.png`, `p73-rise-lit.png`; first drafts `r1`–`r6`; **revised after the UI audit:
`v1-rest`, `v2-typing`, `v3-landed`, `v4-notsure`, `v5-focus`, `v6-journal`**.

## The problem, in the owner's terms
"I need you to reimagine the UI and UX because this is getting close but nothing feels right."
Answers (2026-11-24): what's off — **too many parts, the look, the flow**; the core job — **capture,
seeing where you're heading and picking up where you left off, balanced**; how far — **keep the bones,
refine**; the feel — **calm journals** (Day One, Apple Journal, Stoic) **and playful worlds** (Finch,
Alto's Odyssey, Sky).

Today, logging one line touches about 20 controls and concepts: the composer (heading, I'm not sure,
done chip, suggestions, send, grabber), the rise screen (Done it, First step, Toward…, Undo, New line),
the toast, the feed, the lit map's nodes and routed links, search stars, guiding stars, the lantern,
the hills, the sheet (two tabs, Close, Explore/Settings/Export, search).

## The refinement — three surfaces
1. **The sky** (`v1-rest`): your recent lines as stars, words in a calm journal serif (regular, not
   italic; ≥ 4.5:1), when in words; age shown by the star's glow, never by fading text; faint
   constellation lines (≥ 3:1) between lines that go together, drawn so they never cross words. The
   hills, and **the wanderer** — a small figure with a lantern — on them. **Pick up** by the lantern:
   one quiet 44 pt line naming the pursuit you last touched ("▸ Pick up · Sketch hands from photo
   refs"), never shown as overdue.
2. **The composer** (one bar): **✦ Not sure** and **Journal ⌃** as labelled 44 pt buttons, the field
   with the question as its placeholder, send. Typing (`v2-typing`) shows one scrolling row of 44 pt
   chips: **↗ Pursue** (outlined, set apart) first, then wanders to attach it to.
3. **Focus** (`v5-focus`): a pursuit — the step centred, its wander above, "then, …" below; **Done it**
   and **Nearer step**; **‹ Back to the sky** in thumb reach; the wanderer on the hills.

- **Return logs the line as done** (owner, 2026-11-24): it lands in the sky as a lit star, the wanderer
  walks toward it, and a persistent note (no timer; `v3-landed`) says "Logged → <wander>" with
  **↗ Pursue** and **Undo** as 44 pt buttons far apart. Pursue turns the line into a pursuit and opens
  its focus with a first step. The done chip and the rise screen retire.
- **✦ Not sure** (`v4-notsure`) names the constellations in place ("Lately you've wandered toward…
  draw better hands · a calm space"); tapping a name opens that wander's focus.
- **Journal** (`v6-journal`, a sheet with a scrim, opened by its button or a swipe): "Your journal",
  search, **Pursuits** first, then your lines by day; Explore / Settings / Export at the foot, 44 pt.

## Fit with the product
- **Reverses D-14's default** (owner's answer): a line is done by default; a pursuit is explicit.
  Lit stars, Undo, and the focus view (P-67) carry over.
- **Retires:** the question heading, the done chip, the rise screen, the lit map's routed nodes and
  links, search stars (search stays in the journal). DESIGN.md's Home rules rewritten with go.
- **Still refused:** counts, streaks, timers, nudges; nothing created without a tap.

## UI audit
`.polish/product/ui-audit-B-10.md` (local): the refinement cuts load (after Return 5 controls → 2) but
the first drafts hid things and had collisions. **Fixed in the v-frames:** no label collisions or
clipping; arcs never cross words; serif regular at 16 px, ≥ 4.5:1; age by glow, not faded text; arcs ≥
3:1; ✦ and Journal labelled, 44 pt; chips 44 pt in one row, Pursue styled apart; the landed note
persistent with Pursue and Undo far apart; focus's way back in thumb reach; the journal with a scrim,
Pursuits first and Settings/Export apart; dates consistent. **Still to specify at build:** Reduce Motion
(the landing and the walk are instant), focus order, Dynamic Type at 200 %.

## Persona panel
(Filled in after the panel runs: `.polish/product/panel-B-10-{1,2}.md`.)

## Slices (proposed)
1. **The composer and the landing** (M): one bar; Return logs as done; the persistent note with Pursue
   / Undo; the done chip and rise screen retire.
2. **The sky as a journal** (M): serif lines, glow for age, constellation arcs that never cross words;
   ✦ names constellations; the lit map's nodes/links retire.
3. **The wanderer and Pick up** (S–M): the character, its walk, the pick-up line.
4. **The journal sheet** (M): Your journal, Pursuits first, by day, search; Explore/Settings/Export.
5. **Focus** = P-67 (Full tier, step stacks) on the new look.

## Data and risk
Slices 1–4 change no stored data (the `lit` flag stays; a line is simply not lit by default). Slice 5
is P-67 (Full). Risk: another layout change soon after B-09 — mitigated by the audit-first process and
by keeping every route (`/sky`, `/star`, `/trail`, `/map`) as a link.

## Decision requested
**D-17:** Go on B-10 — slices 1–4, then P-67 on the new look? **Go** / **Go, but change …** / **Not now**.
