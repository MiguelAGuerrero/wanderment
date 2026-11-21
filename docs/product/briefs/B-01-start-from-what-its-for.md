# B-01 — Start from what it's for

**Status:** proposed · **Decision:** D-4 · **Theme:** Warm return / Seeing flow · **Date:** 2026-11-21

## The problem, in the owner's terms
> "After my first log the onboarding text disappears and I see no threads, … the disconnect between
> the activity I logged and the idea of a thread has no clear bridge, and it's confusing as to what
> my next move should be." … "You can declare your intents upfront … you see your intents and values
> first, rather than trying to work through what you did … and then introduce the reason why."
> — owner, 2026-11-21 ([owner-notes](../owner-notes.md))

Two problems:
1. **No bridge after the first log.** Home's welcome disappears. If the log had no `@`, Home shows
   "Nothing attached to a thread yet — that's fine…". It never explains what a thread is, or what to
   do next.
2. **Direction only arrives backwards.** Today a "TO …" header appears only after weeks of logs earn
   it. Someone who already knows what they care about can't start there.

The owner's answers in this conversation shaped the brief: declared intents are a **seed that can
still emerge** (not a replacement for emergence), and declaring is an **optional, skippable first
step**.

## Evidence
- Owner notes: the 2026-11-21 entry above. It's one person's experience, and also the only usage
  signal there is.
- The app today:
  - `src/app/(tabs)/index.tsx`: the empty state (`isEmpty`), the "Your first thread." banner (only
    after an `@` pick), and the no-thread line at :109.
  - Values are computed by `valueThreads` (`src/domain/emergence.ts`) with hysteresis. They need ≥ 3
    net inflow, so they never appear in week one.
- Discovery: none run for this brief. The direction came from the owner, and research would mostly
  change wording. A later `/product discover onboarding` could compare how journaling apps start.

## Proposed experience
1. **First open.**
   - The welcome gains one optional card: "What's it all for? Name one to three things you're
     doing this toward — like *make apparel* or *get stronger*."
   - Each named thing is a thread, marked as declared. "Skip" is one tap.
   - The log box is live the whole time, so capture is never blocked.
2. **Home, before any logs.** Declared Ys appear straight away as headers, "TO MAKE APPAREL", each
   with a quiet "+ a way toward it" line, so the next move is obvious: log toward it (the `@`
   suggestions offer declared Ys first), or name a pursuit under it.
3. **After the first log**, whether declared or not, Home always shows a bridge. If the log
   attached to nothing:

   > "Logged. Is this toward something?"

   followed by the declared Ys (or recent threads) as one-tap chips, and "+ name it". Nothing is
   attached without a tap, and ignoring the bridge leaves no trace.
4. **Over time.**
   - Declared Ys stay headers while things flow into them.
   - Earned values (today's rule) appear beside them.
   - A declared Y with no inflow for 90 days moves to *Earlier*, like any thread: it fades, it isn't
     "failed".
   - A Y can be undeclared from its page.
   - "why here?" says "You said this is what it's for", plus the flow numbers once there are any.
5. **Empty, lots, offline, screen reader.**
   - Zero Ys keeps today's plain list.
   - With many Ys, at most 3 are declared, and earned ones group as today.
   - Everything is local and works offline.
   - Headers are announced as headings, and the card and bridge have labelled inputs.

## Fit with the product
- **DESIGN.md:** "Home shows a plain YOUR THREADS list until value headers are earned" becomes
  "… until value headers are earned **or declared**". The *never* list holds: a Y has no target, %,
  streak, deadline or reminder, and nothing is created or attached without a tap. Capture stays
  sacred: the first step is skippable and never blocks the log box.
- **STRATEGY.md:** north star 3 "Direction emerges… without you having to declare anything up front"
  becomes "Direction emerges — you can name it up front if you know it, and what you do keeps it
  honest". **The owner edits this.**
- **README:** "not declared up front" changes to match.
- **Deliberately not doing:** goals or targets on a Y, progress bars, reminders, or more than 3
  declared Ys.

## Slices
1. **First-log bridge** (S, no new data). Can ship without this brief, and is tracked as **P-13**
   now. After the first unattached log, Home shows "Logged. Is this toward something?" with
   one-tap thread chips and "+ name it".
   *Done when:* tapping a chip or naming a thread attaches the activity as "to" (with Undo);
   ignoring it changes nothing; e2e plus axe.
2. **Declared Ys in the data** (M, `[data]`).
   - An optional stored mark on a thread (`declaredAt`), with a schema migration. It's optional in
     export and import, so older backups still import, and newer backups import into this version.
   - Declare and undeclare from the thread page.
   - *Done when:* migration and round-trip tests, a mutation-checked persistence test, and undo.
3. **Home starts from the Ys** (M, `[feature]`).
   - Declared Ys render as headers immediately, merged with earned values.
   - The fade-to-Earlier rule applies.
   - "why here?" text covers both cases.
   - The `@` menu ranks declared Ys first.
   - *Done when:* domain tests for grouping, fading and merging; e2e for Home with zero, one or three
     declared Ys.
4. **Optional first step** (M, `[feature]`).
   - The first-open card: name up to 3 Ys, skip in one tap, and the log box is usable throughout.
   - *Done when:* e2e for declare, skip, and logging during the card; axe.
5. **A way toward it** (S/M).
   - From a Y header or page, "+ a way toward it" names a pursuit thread whose activities flow to
     the Y by default (a "to" chip preset, never applied silently).
   - Can wait for real use.

## Data and risk
- One optional field on threads, so the migration is additive and old data reads unchanged.
- Export adds an optional field, and the `Data` version stays 1, so older app versions ignore it.
- Undo covers declare and undeclare.
- The risk is mostly conceptual: declared Ys mustn't turn into goals. The guardrails are no numbers
  on them, and fading instead of failing.

## Alternatives considered
- **Bridge only** (slice 1 alone): fixes the confusion but not the wish to start from the Y. The
  owner chose against this.
- **Declared replaces emergence:** simpler, but loses "what you do keeps it honest". The owner chose
  against this.
- **A separate "values" entity:** more model and more UI. Making Ys threads keeps one concept, since
  values are already threads that receive flow.

## Decision requested
**Build B-01 slices 2–4 (slice 1 ships anyway as P-13), and approve the wording changes to DESIGN.md,
STRATEGY.md and the README described above?**

- **Go** (recommended): slices 2–4 become roadmap items and get built in order. You edit
  STRATEGY.md, or let /product propose exact wording for you to accept.
- **Go, but change …**
- **Not now**
- **No**
