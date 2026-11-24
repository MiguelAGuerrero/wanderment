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
_Simulated perspectives from `docs/product/PERSONAS.md`, run by /product before asking. A thinking
tool, not user research._ Reports (local): `.polish/product/panel-B-10-{1,2}.md`.

| Persona | Reaction | What it hinges on |
|---|---|---|
| A · Dabbler | delighted (capture) · yes | pursuits fading, not a list of shoulds |
| B · Builder | uneasy → fine · likely yes | pursuits as named rows; footprints in focus |
| C · Returner | uneasy · maybe | the return moment: "Pick up" as the only words on a calm sky |
| D · Meaning-Seeker | delighted by the look · yes | notes visible; no app-written names |
| E · Minimalist | fine → delighted · yes | the walk never costs input; one noun per thing |
| F · Assistive-Tech | uneasy until specified · yes | reading order, large text, Reduce Motion written down |

- **Strong, lean on it:** Return as done with one quiet note; three surfaces instead of ~20 parts; the
  serif sky with age by glow; "Lately you've wandered toward…" as a description, not a score; Export
  and Settings in plain view; focus as B's home.
- **Refinements folded in (fit DESIGN.md):**
  - **Return never attaches on its own**: the note says "Logged" (or "Logged → X" only when a wander
    chip was tapped); the frames' v3 copy was wrong.
  - The note stays until the next log or Undo (never on a keystroke, never on a timer); Pursue and
    Undo equal weight, far apart.
  - **Pursuits** rows: the pursuit's name, then its step and "last walked <when>"; only warm pursuits
    listed, older under "Earlier", no counts; a short section so the day's writing starts above the fold.
  - The staged step stays a suggestion chip while typing; logging it completes it (no stale Pick up).
  - Focus keeps the footprints (dated words, no count) and the note.
  - Constellation names are only names you gave; otherwise a quiet "Name this?" (owner, B-08).
  - The by-day journal shows a note's first line.
  - One noun per thing: **line** (what you log), **pursuit** (a wander you're heading toward, with
    steps), **journal**; "wander" stays the code name.
  - ✦ Not sure has a filled pressed state; reading order fixed: field, Send, Not sure, Journal, the
    note, Pick up, recent lines, then lit names; dates spoken in full; spoken names for arcs and the
    landing; at large text the sky is the plain list, focus's buttons stack, the step heading steps down,
    the wanderer hides; Reduce Motion stills everything that moves on its own; the walk ≤ 600 ms and
    never holds input.
- **Offered as options (D-17):** Pick up following warmth; whether Pursue converts the line; the
  wanderer's motion.
- **Refused:** progress and reminders (B) — DESIGN.md; app-written theme names — the owner's
  "Name this?".
- **Against the owner (P0):** all fold-ins keep "done by default, Pursue", "Pick up by the lantern",
  "the wanderer walks", "keep the bones".

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
