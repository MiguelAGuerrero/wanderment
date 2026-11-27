# Design rules

These are the product rules for the app this repository now holds. They are distilled from the
design, [`product/briefs/B-11-context-stacks.md`](product/briefs/B-11-context-stacks.md) (with its
[journeys](product/briefs/B-11-journeys.md) and [capabilities](product/briefs/B-11-capabilities.md)).
Change them deliberately.

**Where two sources disagree, this order wins:** the owner's notes
([`product/owner-notes.md`](product/owner-notes.md), newest first), then B-11 §9b and §9c, then this
file, then the rest of B-11. B-11 marks some items *(proposed)*: those are a designer's answer to a
gap, not the owner's decision, and are not rules until the owner takes them.

**The app has no name yet** (owner, 2026-11-24: "let's not worry about the name for now"). The
repository, the database and the storage keys are still called `wanderment`; that is a leftover, not
a name. Write "the app".

Each thing below is marked **built** (in the app today) or **designed, not built yet** (in B-11, not
in the code). Never describe the second kind as existing, in the app or in a report.

## What it is
**Not what you have to do. How you do it.** The app keeps a person's *ways* of doing things —
routines in their own words — and runs them with the person, one small step at a time.
- You open it to take up one of your ways and do it now: Resume what you put down, Start a routine,
  or make one with + New. *(P-96: the "I'm going to …" prompt that declared it is gone.)* It is not a
  log and not a reflection tool.
- A routine is the person's own know-how, written down as they discover it and sharpened each time
  they run it. It stays to be run again; it is not a task that disappears when done.
- Any step can be broken into smaller steps until it is easy to start.
- A routine grows and changes as it is used (§9c) — but **planning and running are two different
  activities and must never look alike** (owner, first real use, 2026-11-25): "plan, execute, plan,
  execute is the type of context switching I had in mind, but the app blurs the two". Adding a step and
  breaking one down are planning; they are welcome mid-run, in a view that is unmistakably not the
  runner, and coming back to the app must show at a glance which of the two you were doing. *(Built,
  P-90: planning has its own surface, **Plan**; the runner hosts none of it.)*

## Model
- **Step** *(built)*: a line of the person's words.
- **Values** *(built, P-96; B-15 journeys 1–4, 8)*: in Plan a step **gives** a name (its menu:
  **Gives…**, a sheet with the name suggested from the step's words: "Select the subject matter" gives
  `{subject}`); a later step's words use it as `{name}`. Names are 1–40 characters, compared without
  case; `{{` and `}}` are literal braces. Renaming a name (Gives… on the step that gives it) renames it
  in that routine's steps and in its open runs, in one change; "Gives nothing" or removing the giving
  step leaves the readers' words as they are, and they **ask** when run. A step that gives a name is
  not broken down. Values belong to the **run**, never the routine, and every value is stored as a
  list of text items (one item is the usual case; a plain step shows them joined in words). **Scope:**
  a routine run inside another reads names given above it; a name a routine gives anywhere inside
  itself is its own — never filled from outside, never overwriting the outer value. A step reading a
  name nothing gave asks for it in place. A new round after "Repeat from here" clears the values given
  after the divider (those steps ask again) — and a value whose giving step was removed in Plan; starting
  a routine again starts empty. A value is at most
  2,000 characters. *(P-98, built: values passed to a routine used as a step — see **Calls**.)* (Designed, not
  built yet: for each, values that arrive later.)
- **Calls** *(built, P-98; B-16, B-15 journey 5)*: a routine used as a step is a **call row** — stored as the
  routine's id with its name then (`words`) and, per input, what fills it (`with`). Its **inputs** are the names
  its steps read that nothing in it gives (its own calls' unbound inputs too); it **gives** every name it gives.
  The row reads the routine's name with ▤, then a line per input — `with {x}` (by name), `with {y} as x`, `with
  <words> as x`, or `asks {x}` (asked where it is read) — each a target opening its sheet ("<routine> with {x}": the
  names given above, Ask when it runs, Words with the filled Keep, Close), then "gives {a}, {b}". An input
  resolves typed words → the bound name where the call runs → asked; on Step in each is the called routine's
  **own copy** (changed inside, the caller's stays), and the values row says where it came from ("· from <step>").
  Leaving it (Next past its last step, or Step out) **hands back** only what its row gives; its other names stay
  its own. One name given more than once in a routine — two calls, or a call and a step — is **one list**, in the
  order given. **A step owes what its insides give**: Next on a call (or a step broken down: only names read
  outside it) not stepped into, or Step out before its giving steps, first shows a sheet with a field for each
  owed name still empty and the filled move (Next / Step out) — never anything extra on the step itself (the
  owner: no options while running a step); left empty, a later step asks. Renaming a name renames it in the
  calls' bindings (and a call that took it by name keeps getting it). A call to a **removed** routine reads
  "<name> (removed)", shows no inputs and can't be stepped into (Next passes it). Older builds read a call as a
  plain Step in. Optional inputs (blanks) are not built: an input with no value asks where it is read.
- **Wait step** *(built, plain)*: a deliberate step, "Wait for: <words>". Reaching it means
  everything before it is done, to the person's knowledge. A run resting on one reads as *waiting*,
  with since when, in words only. *(P-102, the owner: "'Make it wait' is retired now".)* Nothing makes a
  new one; a wait stored by an earlier build is kept, read and run, and its menu offers **Make it a step**.
- **Routine** *(built)*: a named, ordered sequence. Each item is a step, a wait step or another
  routine. It has one divider, **Repeat from here**: items above run once, items below repeat —
  **until I'm done** (the default) or **a number of times** the person sets. With no divider it runs
  once through. A routine can't contain itself: *(P-98)* Plan refuses to add a routine as a step of itself,
  directly or through another, in words ("“X” can’t be a step of itself" / "“Y” uses “X”, so it can’t be a step of
  it"); data an import brings that holds itself is run, and past the depth limit Step in says "Can’t step in any
  deeper". *(P-96: its last Next finishes it either way; an
  "ends here" stored by an earlier build is kept and read, and no longer offered.)*
- **Run** *(built)*: a routine being carried out — where the person is at every level (including the
  round), running or paused *(P-101: a `mode: 'plan'` stored by an earlier build is kept and read as paused; nothing writes it)*, a pause reason (the Pause note), and a definite
  end. **A change made in Plan changes the routine** (owner, B-12): nothing is "for this run only",
  and there is no Keep. (Runs stored before P-90 may still carry this-run changes. They are read as
  before; the first time Plan is opened on such a run they are kept in its routine, in one write,
  with a notice saying so and an Undo. Never at load.)
- **A breakdown** *(built)*: Break it down, on a step's menu in Plan, turns that step into a sequence
  of its own, unnamed, in the routine. Unnamed things are not listed, but typing their words finds
  them.
- **Tags** *(built, P-97; the owner: "maybe tags and alphabetical sorting")*: a routine's own words for sorting it
  ("drawing", "daily"), kept in its body as `tags` — each trimmed, no "#" stored (shown with one), once without
  case, in the order typed; a routine stored without them has none (nothing is converted). Typed in the **Tags
  sheet** (Plan's routine ··· → **Tags…**, or a My routines row's ···): a field where a comma or Return makes a
  chip, each chip "#tag ×" removes itself, **Keep** (filled) keeps them — with what is still typed — and Close
  leaves them as they were. Keep is one Plan edit (its Undo in the routine's menu, and Ctrl/⌘+Z). Plan shows
  them under the heading.
- **One version per name.** A name always means one routine. To vary, copy — *(built, P-98)* **Copy…** on Plan's
  routine ··· and a My routines row's ···: a sheet with the name (suggested "<name> (copy)"), the filled Copy (a
  name in use is refused: "! Another routine has this name"); the copy has the same steps (its steps broken down
  copied too, its calls the same routines) and is said, "Copied “X” as “Y”", with Undo.
- **Designed, not built yet:** **blanks** (an optional input in a routine's name or steps, "Apply to
  ▢ employer"; it never asks); **child runs** (the same routine for different values, each at its own
  place); **reactions** (a named outcome on a wait step that holds one or more steps or routines —
  never empty, never a bare yes/no); **things set going** ("Wait for this later…" on a step makes a
  wait tied to it; until it is waited for, that thing is listed as "waiting on: <the wait's words>");
  and Group. Running a routine that is already an item (Step in) is built; *(P-98)* so is adding one in
  Plan.
- The first layer — a routine shown on home — is nothing special and has no name in the app.
- **Never shown as words:** frame, thread, stack, pointer, parameter, foundation, async, promise.

## The verbs
**Start, Resume, Pause, Done, Next** (owner, §9b) — and **Plan** (owner, B-12), with the moves **Step
in** and **Step out** (owner, P-101: "a debugger style fits … the model … is a call stack"). They must
read as one set; no word is chosen for how it sounds alone. *(P-101, ruling 4)* A run is **running or
paused** — nothing else: Plan is a view, not a state, and "planning" is never shown.
- **Start** begins a run (it is not offered for a routine with no steps yet). **Next** goes to the
  next step; on a wait step it reads **"It's happened"**.
- **The moves** *(built, P-101)*: the runner's bottom row — **Step in** (when the step has steps),
  **Step out** (finish this level and go up one: the level is left and the run carries on above it, with
  "Left <level> · Undo" *(P-102 audit; was "Done with <level>": it is not finishing)* — it can skip steps; never offered on the first layer, where Next / Done
  covers it) and the filled **Next**. Next and Step in have no Undo.
- **Plan** *(built)* opens the Plan view: the word going in is Plan, the word coming out is **Resume at
  <step>** (Start for something never run). On the runner it is a door on the top line *(P-101)*;
  inside a call it reads **"Plan <routine>"** and opens that routine's Plan (under 340 px it says "Plan",
  its spoken name keeping the routine). Opening it from the runner pauses the run, plainly *(P-101:
  nothing marks the run "in Plan")*. *(P-103)* Plan opened from the runner opens **over** it and says so: its
  way out, top-left, reads **← Back to the run** (in Home's place) and — like the browser's Back — goes back to
  the runner where you were, the run taken up again.
- **Done** *(P-96)* finishes. *(P-103, the audit's blocker)* Done has its own mark, ✓ (Next has →), and for
  0.6 s after it takes Next's place — and after the runner appears or comes back (from Plan's Resume, a tile's
  Resume), whichever is later — a tap on it does nothing (it reads unavailable), so a quick second tap can never
  end a run. A key press on it, or Return on the note, is deliberate and is never held. On the runner the filled button reads **Done** (in place of Next) only
  when that press ends the whole run — on the last step, with nothing defined next; it ends the run
  and goes **home**, with the notice "Done with <name>" — *(P-102, the owner: "You should not undo a
  'Done'")* final: no Undo anywhere (notice, panel, Ctrl/⌘+Z), only the notice's ×. Finishing never opens Plan. Finishing a
  level early is **Step out** *(P-101; the panel's "Finish <level> now" is gone)*; on the first layer
  there is no early finish. In Plan, Done exists only at the edge (a run left there by an earlier
  build), as the right side door.
- **Pause** *(P-101, ruling 3)* says "I'm done with this for now": **❚❚ Pause** (the mark and the word;
  *P-103:* the first control at the top-left of the runner's top line, its one way out; spoken "Pause and go home") opens a small sheet, **"Pausing <name>"** — an optional note of one or more lines
  (prefilled with the note stored, if any), the filled **Pause**, Close (stay running). Pause puts the run
  down where it is — its place and values kept — and goes **home**. The note is the run's pause reason
  (the existing field): it reads under the "at …" line on its tile and, back in the runner, under the
  path, until the first move drops it; emptied and paused again, it goes. **The paused screen is gone**
  (its old address lands on home). There is no "Switch". (Before P-95 Home on the paused screen asked
  "Stop <name>?" and left the run as no one's; runs stored that way still read "at <step>", in their place.)
- **Start over** *(P-101 amendment, ruling 9)*: the run from its first step — the whole run ("Start
  <routine> over") or the level the run is in and the levels below ("Start <level> over", inside a call
  or a breakdown) — from the runner's pull-up panel, a paused tile's ··· and Plan's routine ··· (its
  Plan's routine). It asks first (the one confirm, *P-103*: "Start <name> over?" · "Your place and values in it
  go." · Cancel filled · Start over in red), then puts that level at its first step, round one, clears the values given inside it, and
  offers Undo (place and values). The same run, replaced in place (same id; a new verb, `restart`).
- **Home** is a place, not a verb on the runner *(P-96)*: Pause goes there. On Plan, ⌂ **Home** is in the
  band, at its **left** edge *(P-103; was the right, P-101 ruling 2)* — the one way out, top-left, on every full
  screen (the runner's ❚❚ Pause, Plan's ⌂ Home or ← Back to the run — *P-97:* or ← My routines, opened from there —
  My routines' ⌂ Home, Settings' and Jump's ←); it changes nothing.
- **End this run** *(P-103)*: a paused run's tile ··· offers it (not a run resting on a wait, nor the one running —
  the engine refuses both), after Start over, behind a line, in red. It asks
  first ("End this run of <name>?" · "It ends where it is, with its pause note kept; the routine stays to start again."), then ends the whole run
  where it stands with the existing end verb (Done, for the whole run; its place and pause note are kept in the
  record) — final,
  as every finish: "Done with <name>", × only. The routine stays, to Start — *(P-97)* on My routines (it leaves home with its run).
- **One wording per meaning:** a paused run reads "at <step>" (with its values in place); a waiting one
  "waiting for <words> · since <day>"; Plan reads "at <step>" under its heading; a run at the edge (left
  there by an earlier build) "nothing next yet", on its tile and in Plan. A run an earlier build stored
  "in Plan" (`mode: 'plan'`) is read as paused — its stored mode kept, never written again.

## Interaction
- **One navigation scheme on every screen** *(built, P-96; P-101; P-103)*: the TOP is context, with the one
  way out first at its left (Plan's band: ⌂ Home — or ← Back to the run — then the word PLAN; the runner's top
  line: ❚❚ Pause, the path, Plan at its right; Settings' and Jump's ←; ⚙ on home, at the right). The BOTTOM, lowest, is the forward choice: the filled "Resume at <step>" or Start on Plan; on
  the runner the moves and Next (see *The verbs*). Home has no filled button *(P-101, ruling 5)*. Side
  doors: on home **My routines** (left, once there is a routine) and + New (right) *(P-97)*; Done at Plan's edge only (right). Rows and tiles carry only actions about
  themselves. Sheets: a title, the choices, the filled button keeps or applies, Close (lowest) leaves
  things as they were.
- **Notices** *(P-102, the owner: "the button should be an x to dismiss")*: every notice has a **×** at its
  right edge ("Dismiss", a full target) that puts it away and changes nothing (an Undo it had stays in the
  panel and Ctrl/⌘+Z). Where it offers Undo, **Undo** is a labelled text button beside its words, on the
  left, at least 24 px from the × — never the ↶ glyph alone. **Finishing a run is final**: "Done with
  <name>", × only. *(P-101, ruling 6)* A notice has its own row, in the flow — never over a row, a tile or
  the note. It goes at the next tap anywhere but on it (on the click, so nothing pressed moves) and at a
  screen change, so it is never shown on a screen other than the one where it happened — except that an
  action that itself changes the screen (the run ended: home; New and Plan's fold of an earlier build's
  changes: Plan; Jump to…: the runner; a routine removed: home) carries its notice there, once. Plan's
  edits give **no notice**: their Undo is the routine's ··· menu, **"Undo <edit>"**, while it is the
  last action (and Ctrl/⌘+Z) — *(P-103, audit F-4)* except **removing a step**, which says "Removed “<step>”"
  with its labelled Undo, as every Remove does.
- **One thing runs at a time.** At most one run is running. To take up another you pause first. The
  app opens where you left off: the runner while one runs, else home (a run at the edge: its Plan).
- **Home is what is in motion** *(built; P-96, P-101; P-97, the owner: home "populated with a whole bunch of
  disparate types of routines")*: every run going — running, paused or waiting — is a tile, coloured like its
  note — the name and where it is ("at <step>", its values in place, inverted; the pause note under it) —
  under one of two headings, told apart by structure: **Ongoing** (the routine has no end: "Repeat from here"
  until I'm done at its top level) and **Finishing** (it has an end: no repeat, a number of rounds, or a repeat
  only inside a step). A routine with nothing going is **not** on home: it is on My routines (its stored
  `home` mark is kept and written as before, and no longer read). Order never changes because of a pause
  *(P-101, ruling 5)*: in each group the runs by when each was started; the run touched last carries a small
  **"last"** (in words). A run's tile **body** is its way back in — a button, "Resume <name>" (at the edge, "Plan
  <name>") — and *(P-103)* a visible **Resume** in words, where Start sits on an idle tile, with **Plan** beside
  it and, on a paused run, **···** (Start over · a line · End this run, red). A paused tile has no ❚❚ (that mark
  is the runner's Pause alone); a waiting one keeps ⧗. *(P-103)* With no routines at all, home says one line,
  "Your routines will be here.", and + New is its one action; *(P-97)* with routines and nothing going, "Nothing
  going.", with My routines and + New. Home has **no title in words** (a heading for
  screen readers says "Home") and **no "I'm going to…" prompt**. **+ New** is the right side door: **New
  makes the routine only** — no run until Start — in a sheet of its own ("New routine", a Name field,
  **Plan** filled), then opens its Plan with the name filled and the open row focused.
- **My routines** *(built, P-97; route `/go/routines`)*: every named routine that is not removed, **A–Z** by
  letter alone (case and accents never move a name: "apple pie" before "Apply…", "Éclair" with the E's), under
  **letter headings** (a name starting with anything else, "#"). The top is context: **⌂ Home**, the one way out,
  top-left, then the title. **Find** (part of a name or a tag, without case or accents) and the **tags** — every
  one once, A–Z, "#tag" — each a toggle (pressed, never filled) that narrows the list; with two or more chosen a
  routine must carry all of them. A **row**: its colour (a small block), its name and a second line — its tags,
  "gives {a}, {b}", "asks {c}" — and its **···**, an anchored menu: **Start** (Resume, for a routine with a run
  going; none with no steps; unavailable while another run is running) · **Plan** · **Tags…** · **Copy…**
  *(P-98)* · a line · **Remove** (with no run going; the one confirm, "Remove “<name>”?" · "It goes from My
  routines, with its steps." — *P-98:* and, for one used as a step, "“<caller>” uses it as a step; there it will
  read “(removed)”." — then "Removed “<name>”" with Undo, here). Tapping a row opens its Plan, whose way out, top-left in
  Home's place, reads **← My routines** and goes back there. **+ New routine** is the one filled button, lowest
  (New's own sheet; its Plan comes back here). With no routines: "No routines yet."; with nothing matching: "No
  routines match." and Clear. Room is kept for a second view later (B-17's "Yours | Library", P-104): the list is
  its only view now.
- **Nothing is created or started without a tap.** Typing starts nothing until a row is chosen
  (Return takes the first row, which is always visible and marked). The app never jumps by itself.
- **The runner is the step and nothing else** *(built; P-96, P-101)*: the top line is the path (the
  level after its parent, "Drawing practice › Sketch", in words, wrapping — not a control), with the
  doors at its right — ❚❚ and Plan ("Plan <routine>" inside a call), each at least 48 px; with too little
  room (200 % text) they go beneath it, at the right. When the step (or the level) is a step broken
  down whose smaller steps give names, the path says **"gives {a}, {b}"** (hoisted). Under it, when any
  are in play, the **values row** — one target per value, "{ } subject: figures in motion", at least
  48 px, wrapping — each opening the **value sheet**: the value in a field, "from <step> · <routine, if
  not this one> · <when>" ("given at <step>" for one given late), the **trace** *(P-101, ruling 7)* —
  routine › step from the run's root to the giving step, each routine's values under it — then "read
  by" the steps that read it, **Keep** filled (a change that replaces or clears the value has an Undo),
  **Close** lowest. *(P-101 amendment, ruling 10)* Then, dashed, **"{ } name: not given yet"** for each
  name a step already passed gives with no value (Gives… added later in Plan, or left empty): it opens
  the entry sheet and gives it now, from the step the run is on. The pause note, if any, under the row.
  *(P-103)* The pause note under the path has its own mark, a note (never ❚❚).
  The step as a fixed, roughly square sticky note, with the values it reads **in place, inverted**.
  Under the note, the step's value fields *(P-101, ruling 7)*: each reads its label and its value — the
  giving step's, **labelled with its name** (it may be left empty; Next moves on), and "asks { } name"
  for a name the step reads that nothing gave — and a tap opens the **entry sheet**, which rises with the
  keyboard: the label, a field that wraps, **Keep** filled (a first value says nothing; replacing or
  clearing one says "Changed / Cleared {name}" with Undo), Close. Then the notice's row, the handle, and
  the moves — Step in · Step out · Next, the filled one, last (**Done** when that press ends the whole
  run). Nothing is planned here. Nothing about repeating is on the surface except one small mark on
  **the last step of a round**. A repeating part comes round again silently; a counted loop ends by
  itself. There is no "one more round".
- **The note always fits**, keyboard up included: the type steps down first, then the note shrinks
  to the space. Words too long for it scroll inside it and Plan carries a quiet mark (breaking a
  step down is planning).
- **The person's words are never clipped, counted or warned about.**
- **The pull-up panel** *(built)*: swiping up on the runner or tapping the note. It holds where you
  are in this run (the round, "Last step of the round", "then: <next step>", values in place) and the
  actions that move you without planning: Back to <step>, Jump to…, and *(P-101 amendment)* **Start
  <level> over** (inside a call or a breakdown) and **Start <routine> over** — each asked first. *(P-101:
  Finish <level> now is gone — Step out.)*
- **Jump to…** *(built)* sets the run to where the person really is: the start of any level they are
  in (round one), or a particular step (the round is kept). The app never suggests you are behind.
- **Plan is the sequence, and looks nothing like the runner** *(built; B-12 frames v1, v2, v4, v5,
  v8; P-90; P-96; P-101)*: a light band pinned at the top with the word PLAN and **⌂ Home** at its right
  edge — one fixed place on every Plan screen *(P-101, ruling 2; P-103: the band's left edge, before PLAN)*; the routine's name as the heading
  (from inside a call, the innermost routine's Plan, HERE in it); "at <step>"; the steps as outlined
  rows, the one you were on marked **HERE** (the white outline means HERE and nothing else); "Repeat
  from here" as a row of its own with visible Move up / Move down and its menu (until I'm done or a
  number; remove it); an "Add a step" row, which **wraps and grows** so the whole step shows while it is
  typed *(P-101; P-103: the field has the row's whole width, and its Insert and Add sit below it, so it is never
  squeezed or clipped)*. A routine used as a step opens and closes by a chevron, › shut and ⌄ open *(P-103; was
  ▤, which stays the routine's mark)*; "Repeat from here" is marked ↻ *(P-103; was ⇄, which means swap)*. Every step row that can move has a **grip** at its left edge *(P-95)* ("Reorder
  <words>", a full target): dragged by touch or mouse the row stays in place, dashed, and a line shows
  where it will go (past an open routine: after its last step); nothing moves until it is let go, so
  nothing is covered and nothing reflows with animation (Reduce Motion or not). Let go, it is one move
  of as many rows as it crossed — "Repeat from here" counts as one and is passed alone — with one Undo.
  Pressed, the grip opens its own menu, Move up · Move down (P-102 audit). In a window under 340 px wide (a 320 px phone, or large text)
  there is no grip — the words keep the room. *(P-102)* **Every ··· in Plan opens a small menu anchored
  to its button** (owner: "A (...) usually brings up a menu not a drawer"): under it, or over it when
  there is no room beneath, never off-screen (under 360 px it spans the width, still at its row); the
  screen is only lightly dimmed; a tap outside, Esc, Tab and Back close it; focus goes to its first item
  (↑/↓ between items) and back to the button; rows ≥ 48 px. A step's menu reads **Edit · Add a step after ·
  Break it down** (not on a step that gives a name) **· Gives…** *(P-96)* **·** a line **· Remove** (red,
  last); a wait from an earlier build has **Make it a step** in Gives…' place; a routine used as a step
  *(P-98)*, **Open** (its Plan) · **Edit inputs** · Add a step after · Remove. *(P-98)* The "Add a step" row has
  **A routine** beneath its field (not while there is almost no room: the keyboard up, large text), a sheet of the
  person's routines, A–Z with what each asks and gives; and **"@"** at a word's start there lists the routines
  that match after the names — only when summoned; typed words alone list none. Its placeholder is one string. **Move up / Move down are not on the step menu** where there is a grip: the grip,
  pressed, opens its own small menu, **Move up · Move down** (each unavailable at its end) — the way to
  reorder without a drag *(P-102 audit: nothing by gesture alone)*; under 340 px, with no grip, they are on
  the step menu, before the line. They are also a row's screen-reader actions (on its ···) and, on the web,
  **Alt+↑ / Alt+↓** while the focus is in the row (`aria-keyshortcuts` says so) — one press, one place, one
  Undo — and words are typed in place. Every menu ends with a **Close** for screen readers (not drawn) and
  closes on VoiceOver's escape; the browser's Back closes only what is open, never the screen beneath. *(P-96)* A step that gives a name says "gives {name}"
  under its words; *(P-101, ruling 7)* a step broken down whose smaller steps give names says "gives {a},
  {b}" (hoisted). *(P-103)* Removing a routine (its ···, with no run going) asks first, with the one confirm
  ("Remove “<name>”?" · "It goes from My routines, with its steps." — *P-97; was "from home"*), then the screen
  Plan was opened from (home, or My routines) with "Removed “<name>”" and Undo.
  Removing the last row that uses a routine with no tile gives that routine its stored `home` mark, in the same
  write (one Undo takes both back) — *(P-97)* it is on My routines anyway, as every named routine is: nothing is
  left that cannot be reached. A `{name}` in any step's words is shown as a chip — *(P-101 amendment, ruling 11)* a
  dashed **"asks {name}"** when no step in this Plan gives it (it asks when run). While words are typed
  (a step's, a step added after or into a row, "Add a step"), a **bar above the keyboard** offers the
  names given above where they will stand, in that routine only, and *(P-101, ruling 8)* a **"{ }
  Insert"** button beside the field opens them (the first name has the focus); a tap puts `{name}` at the
  caret, *(P-103)* with a space after it, and the field keeps the focus. *(P-103, the owner typed "@{concerns}")*
  Typing **"@" or "{"** at a word's start opens the names, as @ does in Notion and Slack: the bar shows the names
  matching what is typed after it; ↑/↓ choose one (typing part of a name chooses the first match), and Return or
  a tap puts it in place of what was typed from the "@"/"{". With none chosen, Return does its usual job. Esc, the
  caret moving away, or any character that is not part of a name closes it and the words stay ("me@co", "json {"
  and braces typed by hand are just words). A name put in after a word gets a space before it too. From the keyboard, Alt+↓ in the field goes to the names (each a
  button, "Insert {name}"; ←/→ between them; Return inserts and goes back to the field; Esc goes back
  without inserting); typing the braces works anywhere. One press moves one row: next to "Repeat from
  here" a step passes it and nothing else moves. The routine's own menu holds **Undo <edit>** (the last
  Plan edit's, while it is the last action), its name, Tags…, **Copy…** *(P-98)*, **Start over** (with a run), adding "Repeat from
  here", and — with no run going — Remove *(P-96: no "Ends here")*. **Removing a step that gives a name
  other steps read** *(P-101 amendment, ruling 11)* asks first, naming them — "Remove “<step>”? It gives
  {name}, which N steps read. They'll ask for it when run." — *(P-103: the one confirm, Cancel filled and Remove
  in red; was a sheet with Remove filled)*; afterwards their chips
  are dashed "asks {name}" until Gives… on another step gives it again; one Undo restores the step and
  its gives; no reader's words change. A routine used as a step is a row that opens; what is changed
  inside it changes that routine. **Every change changes the routine** — with no notice *(P-101, ruling
  6)*, its Undo in the routine's menu until the next action — and repairs any run it touches: removing
  the HERE step puts HERE on the next step, else the one before, else at the edge — a run is never ended
  by an edit. The ONE filled button is **Resume at <step>**, which goes back exactly where you were
  (Start for a routine with no run, once it has a step); with nothing forward there is none. Nothing in
  Plan says Next. Home from Plan changes nothing: the run is paused, and its tile says so. A screen
  reader hears "Plan: <routine>" on arriving (focus on the heading) and "Running: <step>" on returning
  (focus on the note).
- **The edge** *(P-96, ruling 7; was: the edge is Plan's)*: Next on the last step, with nothing
  defined next, reads **Done** and ends the run (home; *P-102:* final, × only) — open goal or not, a wait step
  included (Done, not "It's happened", when the press ends the run); it never opens
  Plan and never shows a blank note. Plan is reached only by its own door (the runner's Plan). A run
  left at the edge by an earlier build opens in Plan — "nothing next yet", the open row
  focused, no filled button — with **Done** as the right side door, beside Home, never in Home's
  place. A step added there is the routine's and is where the run stands.
- **See it all and the plain routine editor are gone** *(P-90)*: both are Plan now (their old
  addresses land there). The break-down sheet, the runner's blank "next small step" note and the
  Keep sheet are gone with them.
- **Not built in Plan yet** (B-12, each needs its own item): declaring a routine where you stand
  ("Make a routine from here…"), "Also in" for a routine used elsewhere, more than
  one Undo, adding "Repeat from here" to a routine nested as a step from its
  parent's Plan.
- **Designed, not built yet:** *(Your routines is built as My routines, P-97.)* Looking back ("a set, not a log": one line per ended
  run), the Map of a tile's contents, the leaving ask for things still waited on ("Still waiting" /
  "Let it go"), "Stop waiting for this". **Erase everything is not built and not decided** as an
  item; build none of these without their roadmap item.

## Rules
- **Minimalism (owner).** The app should communicate itself. Use an icon only where it is
  conventional and unambiguous; otherwise the word. Words are for form labels, button labels that
  need them, and the person's own text. **No instructional or explanatory text, no preamble, no
  disclaimers** — needing one is a sign the design has failed to say it. Not to be applied
  overzealously: a label that prevents a mistake stays.
- **Borrow established conventions** from adjacent productivity apps for layout, spacing, icon and
  settings placement and component choice, so the app meets expectations before it asks anyone to
  learn.
- **Safeguards.** Everything that loses or reshapes something gets an **Undo and no confirm**: a Plan
  edit (Gives…, renaming a name and "Gives nothing" included), New, Jump to (it can leave levels
  and reset the round), Step out, Start over *(asked first — P-101 amendment, the owner's ruling)*, a value replaced or cleared
  — from the value sheet, or from a step's own field's entry sheet *(P-101)* — Back to when it clears a value given in the round it leaves
  ("Cleared {name}"), this-run changes folded (by whatever verb folds them). Giving a value for the
  first time leaves no notice. An Undo puts values back name by name: it never drops a value typed
  after the action it undoes.
  *(P-102, the owner: "You should not undo a 'Done'")* **Finishing a run** (Done, or the last Next) is the
  exception: it is final — its notice has no Undo, only ×.
  Moving through a run — Start, Next, Step in, Back to, Pause, Resume, Plan, "It's happened" — has no
  Undo and no notice (P-95; the owner: "Why would I want to undo an
  execution of a stack"). A confirm appears only when
  an action reaches beyond what is on screen (other routines, open runs, all data), and every Remove
  names its reach — *(P-101 amendment, the owner's rulings)* and for Start over (a confirm, Cancel
  filled) and for removing a giving step that other steps read (naming them). *(P-103)* Removing a routine and
  ending a paused run from its tile ask first too. **Every destructive confirm is one dialog** *(P-103, modelled
  on the import preview)*: a centred alert, a question as its title, the consequence in one line, Cancel (filled,
  first, with the focus) and the destructive verb in red — never the filled paper button; Tab stays inside it;
  Esc, Back and the scrim cancel.
- **An ask and a confirm are different** (§9b). In an **ask** every choice goes forward and the
  filled one carries on. In a **confirm**, Cancel is filled (stopping, removing everywhere).
- **The filled button is the safe or forward choice**, one per screen or sheet. **Red and "!" only
  for errors and the irreversible.**
- **One vocabulary, and one wording and one mark per meaning.** A mark never means two things (now,
  repeats, routine, wait, forward, fold, more, pause each have their own).
- **Nothing is counted against you.** No streaks, deadlines, notifications or tallies of what you
  did; nothing shows how much is left; no timers. A repeat number you set and the round you are on
  are context, **shown only in the panel**. Counts appear otherwise only in the import preview.
  "Since" is in words (a day's name or a date), never a running count.
- **Acting.** Fixed places for the runner's buttons. The level is in words, never colour alone.
  Nothing by gesture alone: every drag, swipe and long-press has a visible control.
- **Errors** *(P-103)*: in the error colour with "!", as an alert, next to what they are about (Settings: a
  file that can't be imported, under Import).
- **The update banner** *(P-103)*: a strip at the top in the app's dark look; every screen starts below it, so
  it never covers a control.
- **Jump to…** *(P-103)*: its rows are a radio group — ↑/↓ (and ←/→) move to the next row and choose it.
- **The working name** *(P-103, the owner: "A neutral placeholder")*: the page title, the install name and the
  manifest say **Routines**; an export is `routines-backup-<date>.json`, and the device's daily backups (iOS/Android) `routines-<date>.json`
  (older `wanderment-<date>.json` files still count among the last 7 days). The storage keys, the database, the
  base path `/wanderment/` and the backup's type field keep their old name (stored-data identifiers), and older
  backups and file names still import. Settings says "Earlier data from the previous app is kept in your backup files."
- **Accessibility.** Targets ≥ 48 px; body text ≥ 16 px; layouts reflow at 200 % text and with the
  keyboard up; screen titles are headings; icon-only and repeated buttons have full spoken names
  ("Resume Apply to Acme"); focus has its own ring and is moved sensibly after Next, Done, Undo and
  a sheet closing; an error never dims the words it is about. Under Reduce Motion every change is
  instant.
- **The data stays on the device.** There is no account and no server. **Export** writes everything
  to a file and **Import** reads one back, with a preview, replace only. Settings (built) holds
  them, with where the data lives and the version.
- **Stored data is never deleted or converted to fit a design.** New kinds of record are added;
  old ones are kept (see *Before*).

## The look
Dark. Pixel accents with a programmatic feel: a pixel font for screen titles only, chunky blocks,
hard shadows. The person's words are in a clean sans face (IBM Plex Sans; the owner may overrule the
font — B-11 §10). A routine's colour is the colour of its tile and its note. *(P-102)* A ··· (Plan's, and a
home tile's) opens a small menu anchored to it; pickers and forms
(Gives…, the value and entry sheets, Pause, New) are bottom sheets; a notice with Undo follows what loses or reshapes something (see Safeguards); a centred dialog appears only when an
action reaches beyond the screen.

## One copy at a time (web, P-29)
- A page holds the data only while it's visible. A page that doesn't hold it (coming back to a tab,
  reconnecting, or waiting for another copy) **can't change it**: changes are refused with one quiet
  notice. One pressed verb (Next, Done, Pause, Resume, Step in, Plan) is kept and applied once the
  data is back, only if the run is unchanged. Typed text stays in its field and is never dropped.
  A run's screens follow the data: Plan pressed in one tab puts the other tab's runner in Plan when
  it takes the data back, and Resume the other way round.
- The app's own states stay: opening, can't open the data (with a download of this browser's local
  copy), another tab took over, reconnecting, a new version is ready, saved by a newer version.
- Known edge cases (accepted):
  - Desktop, two visible windows: reloading (or updating) the window in use while the other is waiting
    hands the data to that window; the reloaded one waits, saying so, until the other is in the
    background or closed.
  - A first launch whose open keeps failing with WebKit's bare "The object is in an invalid state."
    waits, telling the person another copy may be open, and never falls back to local storage: falling
    back over files another copy holds could fork the data. If WebKit uses that text for another reason,
    the advice is wrong until the WebKit lane (P-05) shows it.

## Before
Until 2026-11-25 this repository held Wanderment: a night-sky themed log in which a person wrote one
line about something they did, attached it to "wanders" (ongoing pursuits) and "whys", and saw lines
and stars on a live map. The owner retired it ("get rid of the old app entirely. Retired.") and its
screens and routes are removed. **Its data is kept**: wanders and activities stay in storage, in
every export and through import, and are not shown anywhere yet (B-11 places them in Looking back,
which is not built). **Its rules no longer apply** — "capture is sacred", the composer, the sky, the
sheet, heat and the rest are history, readable in this file's git log and in briefs B-01 to B-10.
