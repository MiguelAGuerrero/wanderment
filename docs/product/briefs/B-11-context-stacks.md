# B-11 — Context stacks: pixel-art pursuits, zoom in and out

**Status:** proposed · **Decision:** D-18 · **Theme:** Seeing flow / Warm return / Capture anywhere · **Date:** 2026-11-24
**Supersedes:** B-10 (D-17, never decided) and the night-sky visuals of B-07/B-08/B-09.

Mockups (local): `.polish/product/b11-shots/` — `p1-home`, `p2-zoom`, `p3-sub`, `p4-switch`.

## The problem, in the owner's terms
owner-notes 2026-11-24, "Drop the metaphor": the diegetic sky "is being a little bit of a bottleneck,
and it's distracting from the core user experience of maintaining several ambitions through stacks."
Wanted: "very programmatic … very pixel art … a stack could just look like Tetris"; "you define a
stack, a pursuit … values and goals and feelings you want to chase, not necessarily big, explicit
plans, and you just add to the stack of how you're going to go about that. Every layer can have its
own substack, and you can zoom in and zoom out as needed. And context switching is effectively
switching where your energy for the day goes." The wonder comes from the stacks themselves.

## The model (refined)
- **Stack** = a pursuit: a feeling, value or goal in your words ("feel creative", "a calm home"). It
  is a well, drawn as a Tetris column with its own colour.
- **Layer** = one way you go about it: a block in the well ("sketch hands from refs"). Added with a
  tap or a typed line. The **top block is "now"** — the next thing for that pursuit.
- **Substack** = any layer can open into its own well ("draw every week" holds three blocks). Same
  rules all the way down; a breadcrumb shows where you are.
- **Zoom**: home shows every well side by side (zoomed out); tap a well → it fills the screen (p2);
  tap a block with ▸ → its substack (p3); the breadcrumb or Back zooms out. Pinch is a shortcut, never
  the only way.
- **Done** clears the block like a Tetris line (a short pixel flash), and it goes to the pursuit's
  **trail** — dated words, never a count. The block below becomes "now".
- **Today's energy** (the context switch, p4): one pursuit is today's. Home's header names it; the
  composer adds to it; switching is one tap and keeps every stack exactly as it is (nothing lost,
  carried from the earlier "context switching shouldn't lose any information").
- **Loose lines**: something done that belongs to no stack is still loggable in one Return; it waits
  in a small "loose" tray and can be dropped onto a stack later (capture stays sacred).

## Mapping to what exists
| Today | Becomes |
|---|---|
| whys / wanders (threads) | stacks (a why with wanders under it = a stack with substacks) |
| a wander's `next` · P-67 step stacks | the top layer · the layers |
| activities (log lines) | cleared blocks on a trail, or loose lines |
| `lit` lines (B-08) | layers not yet done |
| heat (recency) | a well's brightness, or nothing (open question) |
| night sky, hills, lantern, constellations, lit map, rise screen, search stars | retired (routes redirect home) |
Stored data: layers need an ordered list per stack and parent links (P-67's step stacks, Full tier).
Migration keeps every line; nothing is deleted.

## Fit with the product
- **Keeps:** no streaks, counts, timers, notifications, deadlines; nothing created without a tap;
  Return saves as typed; Reduce Motion (the clear flash is instant); export.
- **Tension to decide:** a stack is "a goal" only as a direction in your words — no progress, no
  percent, no "3/5". "· 3 inside" in p2 is a count and should go (audit/panel to confirm).
- **DESIGN.md / STRATEGY.md** need rewriting with go: the sky metaphor, Home rules and the vocabulary
  (wander → stack, step → layer).

## Open questions (for the owner)
See the D-18 questions in the session; the full list:
1. **Pixel fidelity** — full retro (pixel font everywhere, chunky blocks) or pixel accents on a clean
   UI (pixel blocks, readable body font)?
2. **Home layout** — wells side by side (p1, 3–4 fit) or today's well big with others as thin
   columns/tabs?
3. **Where new layers land** — on top (Tetris drop = the new "now") or at the bottom (a queue)?
4. **What done does** — clears to the trail; and routines (a layer that comes back after clearing)?
5. **Parent and children** — does clearing all of a substack clear its parent block, or does the
   parent stay until you clear it?
6. **One energy per day or several** — and does today's choice persist until changed, or reset daily?
7. **Loose lines** — keep a tray, or must every line land in a stack?
8. **The journal / history** — a trail per stack only, or also a by-day view across stacks?
9. **Heat** — a well brightens with recent clears, or no recency signal at all?
10. **Breadth vs depth** — cap stacks (e.g. 5) and depth (e.g. 3 levels), or unlimited?
11. **What carries over** — B-08 kinds/constellations, the "I'm not sure" door, suggestions: drop or
    re-express as stacks?
12. **Name** — keep "Wanderment" as the product with "stacks" inside it?

## UI audit
To run on the frames before any build (owner's rule). Known already: the cleared block's words in p3
fail contrast; "· 3 inside" is a count.

## Persona panel
To run (two groups: A/C/E, B/D/F).

## Slices (draft, after go)
1. **Stacks home + zoom** (M–L, Full: new stored shape + migration from whys/wanders).
2. **Layers and substacks** (M, Full): add, reorder, open, breadcrumb.
3. **Done → clear → trail** (S–M).
4. **Today's energy switch + composer** (S).
5. **Pixel look pass + retire the sky** (M, Light).

## Decision requested
**D-18:** Go on B-11 as refined, with the owner's answers to the open questions? **Go** / **Go, but
change …** / **Not now**.
